"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { Buffer } from "buffer";

// ── Hardcoded style suffix appended to every prompt ──
const HARDCODED_STYLE =
  ", candid amateur smartphone photo, slight grain, realistic skin pores and imperfections,";

// ── ComfyUI Workflow Template ──
function buildWorkflow({
  loraName,
  promptText,
  seed,
}: {
  loraName: string;
  promptText: string;
  seed: number;
}) {
  return {
    "9": {
      inputs: {
        filename_prefix: `gen_${Date.now()}`,
        images: ["65", 0],
      },
      class_type: "SaveImage",
    },
    "62": {
      inputs: {
        clip_name: "qwen_3_4b.safetensors",
        type: "lumina2",
        device: "default",
      },
      class_type: "CLIPLoader",
    },
    "63": {
      inputs: {
        vae_name: "ae.safetensors",
      },
      class_type: "VAELoader",
    },
    "64": {
      inputs: {
        conditioning: ["67", 0],
      },
      class_type: "ConditioningZeroOut",
    },
    "65": {
      inputs: {
        samples: ["69", 0],
        vae: ["63", 0],
      },
      class_type: "VAEDecode",
    },
    "66": {
      inputs: {
        unet_name: "z_image_turbo_bf16.safetensors",
        weight_dtype: "default",
      },
      class_type: "UNETLoader",
    },
    "67": {
      inputs: {
        text: promptText,
        clip: ["62", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "68": {
      inputs: {
        width: 1024,
        height: 1360,
        batch_size: 1,
      },
      class_type: "EmptySD3LatentImage",
    },
    "69": {
      inputs: {
        seed,
        steps: 7,
        cfg: 1,
        sampler_name: "res_multistep",
        scheduler: "simple",
        denoise: 1,
        model: ["70", 0],
        positive: ["67", 0],
        negative: ["64", 0],
        latent_image: ["68", 0],
      },
      class_type: "KSampler",
    },
    "70": {
      inputs: {
        shift: 3,
        model: ["71", 0],
      },
      class_type: "ModelSamplingAuraFlow",
    },
    "71": {
      inputs: {
        lora_name: `${loraName}.safetensors`,
        strength_model: 0.9,
        model: ["66", 0],
      },
      class_type: "LoraLoaderModelOnly",
    },
  };
}

// ── Extract LoRA name from imagePromptInstructions (first word) ──
function extractLoraName(imagePromptInstructions: string): string {
  const firstWord = imagePromptInstructions.trim().split(/\s+/)[0];
  return firstWord || "default";
}

// ── Main generate action (called from frontend) ──
export const generateImage = action({
  args: {
    characterId: v.id("characters"),
    userPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    // ── Auth: get current user ──
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to generate images");
    }

    const user = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) {
      throw new Error("User not found");
    }

    // 1. Fetch character data to get imagePromptInstructions
    const character = await ctx.runQuery(
      internal.characters.getCharacter,
      { id: args.characterId },
    );

    if (!character) {
      throw new Error("Character not found");
    }

    const imagePromptInstructions =
      (character as any).imagePromptInstructions || "";

    // 2. Extract LoRA name (first word of imagePromptInstructions)
    const loraName = extractLoraName(imagePromptInstructions);

    // 3. Build the full prompt: characterInstruction + userPrompt + hardcodedStyle
    const fullPrompt = `${imagePromptInstructions}, ${args.userPrompt}${HARDCODED_STYLE}`;

    // 4. Generate a random seed
    const seed = Math.floor(Math.random() * 2147483647);

    // 5. Build the ComfyUI workflow
    const workflow = buildWorkflow({
      loraName,
      promptText: fullPrompt,
      seed,
    });

    // 6. Get RunPod credentials
    const apiKey = process.env.RUNPOD_API_KEY;
    const endpointId = process.env.RUNPOD_ENDPOINT_ID;

    if (!apiKey || !endpointId) {
      throw new Error(
        "RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set in Convex environment variables",
      );
    }

    const runpodUrl = `https://api.runpod.ai/v2/${endpointId}/runsync`;

    // 7. Send POST request to RunPod
    console.log("[RunPod] Sending request to:", runpodUrl);
    console.log("[RunPod] LoRA:", `${loraName}.safetensors`);
    console.log("[RunPod] Prompt:", fullPrompt);
    console.log("[RunPod] Seed:", seed);

    const response = await fetch(runpodUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: {
          workflow,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RunPod] Error response:", response.status, errorText);
      throw new Error(
        `RunPod request failed (${response.status}): ${errorText}`,
      );
    }

    const responseData = await response.json();
    console.log(
      "[RunPod] Full response:",
      JSON.stringify(responseData, null, 2),
    );

    // 8. Extract image data from response
    // RunPod ComfyUI responses can vary. Log everything for debugging.
    let base64Image: string | null = null;
    let imageUrl: string | null = null;

    // Check for FAILED status first
    if (responseData.status === "FAILED") {
      console.error("[RunPod] Job failed:", responseData);
      throw new Error(
        `RunPod job failed: ${JSON.stringify(responseData.error || responseData)}`,
      );
    }

    if (responseData.output) {
      const output = responseData.output;
      console.log("[RunPod] Output keys:", Object.keys(output));

      // Format 1: output.images[0].image (base64) — common ComfyUI RunPod format
      if (output.images && Array.isArray(output.images) && output.images[0]) {
        if (output.images[0].image) {
          base64Image = output.images[0].image;
          console.log("[RunPod] Found base64 image in output.images[0].image");
        } else if (typeof output.images[0] === "string") {
          if (output.images[0].startsWith("http")) {
            imageUrl = output.images[0];
            console.log("[RunPod] Found image URL in output.images[0]");
          } else {
            base64Image = output.images[0];
            console.log("[RunPod] Found base64 string in output.images[0]");
          }
        }
      }

      // Format 2: output.image (single base64 or URL)
      if (!base64Image && !imageUrl && output.image) {
        if (typeof output.image === "string") {
          if (output.image.startsWith("http")) {
            imageUrl = output.image;
          } else {
            base64Image = output.image;
          }
          console.log("[RunPod] Found image in output.image");
        }
      }

      // Format 3: output.message (sometimes contains data)
      if (!base64Image && !imageUrl && output.message) {
        console.log("[RunPod] output.message:", output.message);
      }

      // Format 4: output is directly a string (URL or base64)
      if (!base64Image && !imageUrl && typeof output === "string") {
        if (output.startsWith("http")) {
          imageUrl = output;
        } else {
          base64Image = output;
        }
        console.log("[RunPod] Output is a direct string");
      }
    }

    // 9. Store the image in Convex storage
    let storageId: Id<"_storage"> | null = null;
    let finalImageUrl: string | null = null;

    if (base64Image) {
      const binaryData = Buffer.from(base64Image, "base64");
      const imageBlob = new Blob([binaryData], { type: "image/png" });
      storageId = await ctx.storage.store(imageBlob as Blob);
      finalImageUrl = await ctx.storage.getUrl(storageId);
      console.log("[RunPod] Image stored in Convex, storageId:", storageId);
    } else if (imageUrl) {
      const imgResponse = await fetch(imageUrl);
      if (imgResponse.ok) {
        const buffer = await imgResponse.arrayBuffer();
        const imageBlob = new Blob([buffer], { type: "image/png" });
        storageId = await ctx.storage.store(imageBlob as Blob);
        finalImageUrl = await ctx.storage.getUrl(storageId);
        console.log(
          "[RunPod] Image fetched from URL and stored, storageId:",
          storageId,
        );
      } else {
        throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
      }
    } else {
      console.error(
        "[RunPod] Could not extract image from response. Full response logged above.",
      );
      throw new Error(
        "Could not extract image from RunPod response. Check Convex logs for the full response structure.",
      );
    }

    // 10. Save to userMedia collection
    if (storageId && finalImageUrl) {
      await ctx.runMutation(internal.collection.saveGeneratedMediaInternal, {
        userId: user._id,
        characterId: args.characterId,
        mediaUrl: finalImageUrl,
        mediaStorageId: storageId,
        mediaType: "image",
        prompt: args.userPrompt,
      });
    }

    return {
      success: true,
      imageUrl: finalImageUrl,
      storageId,
      runpodJobId: responseData.id || null,
      status: responseData.status || "UNKNOWN",
    };
  },
});
