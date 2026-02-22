"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { Buffer } from "buffer";

// ── Hardcoded style suffix appended to every prompt ──
const HARDCODED_STYLE =
  ", candid amateur smartphone photo, slight grain, realistic skin pores and imperfections,";

// ── Helper: sleep for polling ──
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// ── Extract LoRA name from imagePromptInstructions (first word, stripped of punctuation) ──
function extractLoraName(imagePromptInstructions: string): string {
  const firstWord = imagePromptInstructions.trim().split(/\s+/)[0] || "";
  // Strip trailing commas, periods, semicolons, and other punctuation
  const cleaned = firstWord.replace(/[,;:.!?]+$/, "");
  return cleaned || "default";
}

// ── Poll RunPod /status endpoint until job completes ──
async function pollForResult(
  endpointId: string,
  jobId: string,
  apiKey: string,
): Promise<any> {
  const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`;
  const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes max
  const POLL_INTERVAL_MS = 5000; // 2 seconds between polls
  const startTime = Date.now();

  let attempt = 0;
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    attempt++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[RunPod] Polling attempt ${attempt} (${elapsed}s elapsed)...`,
    );

    const statusResponse = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!statusResponse.ok) {
      const errText = await statusResponse.text();
      console.error(
        `[RunPod] Status poll error (${statusResponse.status}):`,
        errText,
      );
      throw new Error(
        `RunPod status poll failed (${statusResponse.status}): ${errText}`,
      );
    }

    const statusData = await statusResponse.json();
    console.log(
      `[RunPod] Status: ${statusData.status}`,
    );

    if (statusData.status === "COMPLETED") {
      console.log(
        "[RunPod] Job completed! Full output:",
        JSON.stringify(statusData, null, 2),
      );
      return statusData;
    }

    if (statusData.status === "FAILED") {
      console.error("[RunPod] Job failed:", JSON.stringify(statusData));
      throw new Error(
        `RunPod job failed: ${JSON.stringify(statusData.error || statusData)}`,
      );
    }

    if (statusData.status === "CANCELLED") {
      throw new Error("RunPod job was cancelled");
    }

    // Status is IN_QUEUE or IN_PROGRESS — wait and try again
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `RunPod job timed out after ${MAX_POLL_TIME_MS / 1000}s. Job ID: ${jobId}`,
  );
}

// ── Extract image from RunPod response output ──
// Expected format: { images: [{ filename, type: "base64", data: "iVBOR..." }] }
function extractImageFromOutput(output: any): {
  base64Image: string | null;
  imageUrl: string | null;
} {
  let base64Image: string | null = null;
  let imageUrl: string | null = null;

  if (!output) return { base64Image, imageUrl };

  console.log(
    "[RunPod] Output type:",
    typeof output,
    typeof output === "object" ? Object.keys(output) : "",
  );

  // Primary format: output.images[0].data (base64) — RunPod ComfyUI documented format
  if (output.images && Array.isArray(output.images) && output.images[0]) {
    const img = output.images[0];
    console.log(
      "[RunPod] images[0] keys:",
      typeof img === "object" ? Object.keys(img) : typeof img,
    );

    if (img.data && typeof img.data === "string") {
      base64Image = img.data;
      console.log(
        `[RunPod] Found base64 image in output.images[0].data (type: ${img.type}, filename: ${img.filename}, length: ${img.data.length})`,
      );
      return { base64Image, imageUrl };
    }

    // Fallback: output.images[0].image (older format)
    if (img.image && typeof img.image === "string") {
      base64Image = img.image;
      console.log("[RunPod] Found base64 image in output.images[0].image");
      return { base64Image, imageUrl };
    }

    // Fallback: images[0] is a direct string (URL or base64)
    if (typeof img === "string") {
      if (img.startsWith("http")) {
        imageUrl = img;
        console.log("[RunPod] Found image URL in output.images[0]");
      } else {
        base64Image = img;
        console.log("[RunPod] Found base64 string in output.images[0]");
      }
      return { base64Image, imageUrl };
    }
  }

  // Fallback: output.image (single value)
  if (output.image && typeof output.image === "string") {
    if (output.image.startsWith("http")) {
      imageUrl = output.image;
    } else {
      base64Image = output.image;
    }
    console.log("[RunPod] Found image in output.image");
    return { base64Image, imageUrl };
  }

  // Fallback: output is directly a string
  if (typeof output === "string") {
    if (output.startsWith("http")) {
      imageUrl = output;
    } else if (output.length > 100) {
      base64Image = output;
    }
    console.log("[RunPod] Output is a direct string");
  }

  // Log anything else for debugging
  if (!base64Image && !imageUrl && output.message) {
    console.log("[RunPod] output.message:", output.message);
  }

  return { base64Image, imageUrl };
}

// ── Chat image generation: LLM rewrite → RunPod → message with image ──
export const generateChatImage = action({
  args: {
    characterId: v.id("characters"),
    chatId: v.id("chats"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("You must be logged in to generate images");

    const user = await ctx.runQuery(internal.users.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    // 1. Create a placeholder character message (shows loading in chat)
    const messageId: Id<"messages"> = await ctx.runMutation(
      internal.llm.addCharacterMessage,
      { chatId: args.chatId, characterId: args.characterId, text: "" },
    );

    try {
      // 2. Call LLM to rewrite the user's message into a proper image gen prompt
      const rewrittenPrompt: string = await ctx.runAction(
        internal.llm.rewriteImagePrompt,
        {
          characterId: args.characterId,
          chatId: args.chatId,
          userMessage: args.userMessage,
        },
      );

      if (!rewrittenPrompt) {
        await ctx.runMutation(internal.llm.updateCharacterMessage, {
          messageId,
          text: "hmm i'm not sure what kind of pic you want... try asking differently? 😅",
        });
        return { success: false, error: "Could not parse image request" };
      }

      // 3. Fetch character for imagePromptInstructions + LoRA
      const character = await ctx.runQuery(
        internal.characters.getCharacter,
        { id: args.characterId },
      );
      if (!character) throw new Error("Character not found");

      const imagePromptInstructions =
        (character as any).imagePromptInstructions || "";
      const loraName = extractLoraName(imagePromptInstructions);
      const fullPrompt = `${imagePromptInstructions}, ${rewrittenPrompt}${HARDCODED_STYLE}`;
      const seed = Math.floor(Math.random() * 2147483647);

      const workflow = buildWorkflow({ loraName, promptText: fullPrompt, seed });

      // 4. Submit to RunPod
      const apiKey = process.env.RUNPOD_API_KEY;
      const endpointId = process.env.RUNPOD_ENDPOINT_ID;
      if (!apiKey || !endpointId)
        throw new Error("RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID must be set");

      // Update placeholder text while generating
      await ctx.runMutation(internal.llm.updateCharacterMessage, {
        messageId,
        text: "taking a pic for u rn... 📸",
      });

      const runUrl = `https://api.runpod.ai/v2/${endpointId}/run`;
      console.log("[ChatImageGen] Submitting job. LoRA:", loraName, "Seed:", seed);

      const submitResponse = await fetch(runUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input: { workflow } }),
      });

      if (!submitResponse.ok) {
        const errText = await submitResponse.text();
        throw new Error(`RunPod submit failed (${submitResponse.status}): ${errText}`);
      }

      const submitData = await submitResponse.json();
      const jobId = submitData.id;
      if (!jobId) throw new Error("RunPod did not return a job ID");

      console.log(`[ChatImageGen] Job submitted. ID: ${jobId}`);

      // 5. Poll for result
      const completedData = await pollForResult(endpointId, jobId, apiKey);
      const { base64Image, imageUrl } = extractImageFromOutput(completedData.output);

      // 6. Store image in Convex storage
      let storageId: Id<"_storage"> | null = null;
      let finalImageUrl: string | null = null;

      if (base64Image) {
        const binaryData = Buffer.from(base64Image, "base64");
        const imageBlob = new Blob([binaryData as unknown as BlobPart], { type: "image/png" });
        storageId = await ctx.storage.store(imageBlob as Blob);
        finalImageUrl = await ctx.storage.getUrl(storageId);
      } else if (imageUrl) {
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
        const buffer = await imgResponse.arrayBuffer();
        const imageBlob = new Blob([buffer], { type: "image/png" });
        storageId = await ctx.storage.store(imageBlob as Blob);
        finalImageUrl = await ctx.storage.getUrl(storageId);
      } else {
        throw new Error("Could not extract image from RunPod response");
      }

      // 7. Update the character message with the image
      await ctx.runMutation(internal.llm.updateCharacterMessageWithImage, {
        messageId,
        text: "",
        imageUrl: finalImageUrl!,
      });

      // 8. Save to userMedia collection
      if (storageId && finalImageUrl) {
        await ctx.runMutation(
          (internal as any).collection.saveGeneratedMediaInternal,
          {
            userId: user._id,
            characterId: args.characterId,
            mediaUrl: finalImageUrl,
            mediaStorageId: storageId,
            mediaType: "image" as const,
            prompt: rewrittenPrompt,
          },
        );
      }

      console.log("[ChatImageGen] Image delivered to chat. messageId:", messageId);
      return { success: true, imageUrl: finalImageUrl };
    } catch (error: any) {
      console.error("[ChatImageGen] Error:", error);
      await ctx.runMutation(internal.llm.updateCharacterMessage, {
        messageId,
        text: "sorry couldn't take a pic rn... try again? 😔",
      });
      return { success: false, error: error?.message || "Image generation failed" };
    }
  },
});

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

    // 2. Extract LoRA name (first word, stripped of commas/punctuation)
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

    // 7. Submit async job via /run (NOT /runsync)
    const runUrl = `https://api.runpod.ai/v2/${endpointId}/run`;

    console.log("[RunPod] Submitting async job to:", runUrl);
    console.log("[RunPod] LoRA:", `${loraName}.safetensors`);
    console.log("[RunPod] Prompt:", fullPrompt);
    console.log("[RunPod] Seed:", seed);

    const submitResponse = await fetch(runUrl, {
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

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error(
        "[RunPod] Submit error:",
        submitResponse.status,
        errorText,
      );
      throw new Error(
        `RunPod submit failed (${submitResponse.status}): ${errorText}`,
      );
    }

    const submitData = await submitResponse.json();
    const jobId = submitData.id;

    if (!jobId) {
      console.error(
        "[RunPod] No job ID in submit response:",
        JSON.stringify(submitData),
      );
      throw new Error("RunPod did not return a job ID");
    }

    console.log(`[RunPod] Job submitted. ID: ${jobId}, status: ${submitData.status}`);

    // 8. Poll /status/{jobId} until COMPLETED (or FAILED/timeout)
    const completedData = await pollForResult(endpointId, jobId, apiKey);

    // 9. Extract image from completed response
    const { base64Image, imageUrl } = extractImageFromOutput(
      completedData.output,
    );

    // 10. Store the image in Convex storage
    let storageId: Id<"_storage"> | null = null;
    let finalImageUrl: string | null = null;

    if (base64Image) {
      const binaryData = Buffer.from(base64Image, "base64");
      const imageBlob = new Blob([binaryData as unknown as BlobPart], { type: "image/png" });
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
        "[RunPod] Could not extract image from completed response. Full output logged above.",
      );
      throw new Error(
        "Could not extract image from RunPod response. Check Convex logs for the full response structure.",
      );
    }

    // 11. Save to userMedia collection
    if (storageId && finalImageUrl) {
      await ctx.runMutation(
        (internal as any).collection.saveGeneratedMediaInternal,
        {
          userId: user._id,
          characterId: args.characterId,
          mediaUrl: finalImageUrl,
          mediaStorageId: storageId,
          mediaType: "image" as const,
          prompt: args.userPrompt,
        },
      );
    }

    return {
      success: true,
      imageUrl: finalImageUrl,
      storageId,
      runpodJobId: jobId,
      status: "COMPLETED",
    };
  },
});
