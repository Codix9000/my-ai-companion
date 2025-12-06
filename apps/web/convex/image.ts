"use node";
import Replicate from "replicate";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { STABILITY_AI_API_URL, getAPIKey, getBaseURL } from "./constants";
import { Buffer } from "buffer";
import { OpenAI } from "openai";
import { deleteImage, getUploadUrl } from "./r2";
import { v } from "convex/values";

export const generate = internalAction(
  async (
    ctx,
    {
      userId,
      characterId,
      name,
      description,
    }: {
      userId: Id<"users">;
      characterId: Id<"characters">;
      name: string;
      description: string;
    },
  ) => {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      "Content-Type": "application/json",
    };

    const body = {
      steps: 40,
      width: 768,
      height: 1344,
      seed: 0,
      cfg_scale: 5,
      samples: 1,
      text_prompts: [
        {
          text: `${name}, ${description}`,
          weight: 1,
        },
      ],
    };

    const { currentCrystals } = await ctx.runMutation(
      internal.serve.useCrystal,
      {
        userId,
        name: "stable-diffusion-xl-1024-v1-0",
      },
    );

    const response = await fetch(STABILITY_AI_API_URL, {
      headers,
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await ctx.runMutation(internal.serve.refundCrystal, {
        userId,
        currentCrystals,
        name: "stable-diffusion-xl-1024-v1-0",
      });
      throw new Error(`Non-200 response: ${await response.text()}`);
    }

    // Store the image to Convex storage.
    const responseJSON = await response.json();

    const base64Data = responseJSON.artifacts[0].base64;
    const binaryData = Buffer.from(base64Data, "base64");
    const image = new Blob([binaryData], { type: "image/png" });

    // Update storage.store to accept whatever kind of Blob is returned from node-fetch
    const cardImageStorageId = await ctx.storage.store(image as Blob);

    // Write storageId as the body of the message to the Convex database.
    await ctx.runMutation(internal.characterCard.uploadImage, {
      characterId,
      cardImageStorageId,
    });
  },
);

export const generateWithDalle3 = internalAction(
  async (
    ctx,
    {
      userId,
      characterId,
      name,
      description,
    }: {
      userId: Id<"users">;
      characterId: Id<"characters">;
      name: string;
      description: string;
    },
  ) => {
    const { currentCrystals } = await ctx.runMutation(
      internal.serve.useCrystal,
      {
        userId,
        name: "dall-e-3",
      },
    );
    const baseURL = getBaseURL("dall-e-3");
    const apiKey = getAPIKey("dall-e-3");
    const openai = new OpenAI({
      baseURL,
      apiKey,
    });
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `stunning image of ${name}. high quality, 8k, 4k, HD, ${description}, anime style`,
      n: 1,
      quality: "standard",
      size: "1024x1792",
      response_format: "b64_json",
    });
    const base64Data =
      response && response.data && response.data[0]
        ? (response.data[0].b64_json as string)
        : "";
    const binaryData = Buffer.from(base64Data, "base64");
    const image = new Blob([binaryData], { type: "image/png" });

    try {
      // Update storage.store to accept whatever kind of Blob is returned from node-fetch
      const cardImageStorageId = await ctx.storage.store(image as Blob);
      // Write storageId as the body of the message to the Convex database.
      await ctx.runMutation(internal.characterCard.uploadImage, {
        characterId,
        cardImageStorageId,
      });
    } catch (error) {
      await ctx.runMutation(internal.serve.refundCrystal, {
        userId,
        name: "dall-e-3",
        currentCrystals,
      });
    }
  },
);

export const generateSafeImage = internalAction(
  async (
    ctx,
    {
      userId,
      characterId,
      prompt,
    }: {
      userId: Id<"users">;
      characterId: Id<"characters">;
      prompt: string;
    },
  ) => {
    const { currentCrystals } = await ctx.runMutation(
      internal.serve.useCrystal,
      {
        userId,
        name: "dall-e-3",
      },
    );
    const baseURL = getBaseURL("dall-e-3");
    const apiKey = getAPIKey("dall-e-3");
    const openai = new OpenAI({
      baseURL,
      apiKey,
    });
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}`,
      n: 1,
      quality: "standard",
      size: "1024x1792",
      response_format: "b64_json",
    });
    const base64Data =
      response && response.data && response.data[0]
        ? (response.data[0].b64_json as string)
        : "";
    const binaryData = Buffer.from(base64Data, "base64");
    const image = new Blob([binaryData], { type: "image/png" });

    try {
      // Update storage.store to accept whatever kind of Blob is returned from node-fetch
      const cardImageStorageId = await ctx.storage.store(image as Blob);
      // Write storageId as the body of the message to the Convex database.
      await ctx.runMutation(internal.characterCard.uploadImage, {
        characterId,
        cardImageStorageId,
      });
    } catch (error) {
      await ctx.runMutation(internal.serve.refundCrystal, {
        userId,
        name: "dall-e-3",
        currentCrystals,
      });
    }
  },
);
export const generateByPrompt = internalAction(
  async (
    ctx,
    {
      userId,
      imageId,
      messageId,
      prompt,
      referenceImage,
      model,
      isPrivate,
      isNSFW,
      isPlus,
    }: {
      userId: Id<"users">;
      imageId: Id<"images">;
      messageId?: Id<"messages">;
      prompt: string;
      referenceImage?: string;
      model: string;
      isPrivate?: boolean;
      isNSFW?: boolean;
      isPlus?: boolean;
    },
  ) => {
    const { currentCrystals } = await ctx.runMutation(
      internal.serve.useCrystal,
      {
        userId,
        name: model,
      },
    );

    const generateDalle3 = async () => {
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({
        baseURL,
        apiKey,
      });
      const response = await openai.images.generate({
        model: model,
        prompt: prompt,
        n: 1,
        quality: "standard",
        size: "1024x1792",
        response_format: "b64_json",
      });
      console.log("!!!openai response:::", response);
      return response && response.data && response.data[0]
        ? (response.data[0].b64_json as string)
        : "";
    };

    const generateStableDiffusion = async () => {
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        "Content-Type": "application/json",
      };

      const body = {
        steps: 40,
        width: 768,
        height: 1344,
        seed: 0,
        cfg_scale: 5,
        samples: 1,
        text_prompts: [
          {
            text: prompt,
            weight: 1,
          },
        ],
      };

      const response = await fetch(STABILITY_AI_API_URL, {
        headers,
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Non-200 response: ${await response.text()}`);
      }

      // Store the image to Convex storage.
      const responseJSON = await response.json();

      return responseJSON.artifacts[0].base64;
    };

    async function generateReplicate() {
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });

      let modelHash;
      switch (model) {
        case "charlesmccarthy/animagine-xl":
          modelHash =
            "charlesmccarthy/animagine-xl:d6f9644c586556cf0e09d136f7198becf2da31d1955160b2308545e21234ffa9";
          break;
        case "daun-io/openroleplay.ai-animagine-v3":
          modelHash =
            "daun-io/openroleplay.ai-animagine-v3:559becf07bc8ce089dc37afcdaf8f83bf1038ffcee22730ec5d1b42507b5465c";
          break;
        case "asiryan/juggernaut-xl-v7":
          modelHash =
            "asiryan/juggernaut-xl-v7:6a52feace43ce1f6bbc2cdabfc68423cb2319d7444a1a1dae529c5e88b976382";
          break;
        case "pagebrain/dreamshaper-v8":
          modelHash =
            "pagebrain/dreamshaper-v8:6cb38fe374c4fd4d5bb6a18dcdd71b08512f25bbf1753f8db4bb22f1d5fea9be";
          break;
        case "asiryan/meina-mix-v11":
          modelHash =
            "asiryan/meina-mix-v11:f0eba373c70464e12e48defa5520bef59f727018779afb9c5b6bddb80523a8f7";
          break;
        case "asiryan/blue-pencil-xl-v2":
          modelHash =
            "asiryan/blue-pencil-xl-v2:06db33e3cd56700e2b0de541e65e2fc377604bebc97eb87b40e1d190fafa7ef4";
          break;
        case "lucataco/sdxl-lightning-4step":
          modelHash =
            "lucataco/sdxl-lightning-4step:727e49a643e999d602a896c774a0658ffefea21465756a6ce24b7ea4165eba6a";
          break;
        default:
          modelHash =
            "daun-io/openroleplay.ai-animagine-v3:559becf07bc8ce089dc37afcdaf8f83bf1038ffcee22730ec5d1b42507b5465c";
      }

      const dimensions = {
        "pagebrain/dreamshaper-v8": { width: 512, height: 768 },
        "lucataco/sdxl-lightning-4step": { width: 1024, height: 1280 },
        default: { width: 768, height: 1344 },
      };

      const { width, height } =
        dimensions[model as keyof typeof dimensions] || dimensions["default"];

      const output: any = await replicate.run(modelHash as any, {
        input: {
          prompt,
          width,
          height,
          image: referenceImage ?? undefined,
          disable_safety_checker: true,
          negative_prompt:
            "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, artist name, rating: sensitive, loli, shota, young, diaper, scat, gore, vore, guro, cub, baby",
          num_inference_steps:
            model === "lucataco/sdxl-lightning-4step" ? 4 : 40,
        },
      });
      console.log("replicate output:::", output);
      const response = await fetch(Array.isArray(output) ? output[0] : output);
      console.log("replicate response:::", response);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    }

    try {
      console.log("processing model:", model);
      let image;
      if (model === "dall-e-3") {
        const base64Data = await generateDalle3();
        const binaryData = Buffer.from(base64Data, "base64");
        image = new Blob([binaryData], { type: "image/png" });
      } else if (model === "stable-diffusion-xl-1024-v1-0") {
        const base64Data = await generateStableDiffusion();
        const binaryData = Buffer.from(base64Data, "base64");
        image = new Blob([binaryData], { type: "image/png" });
      } else {
        const base64Data = await generateReplicate();
        const binaryData = Buffer.from(base64Data, "base64");
        image = new Blob([binaryData], { type: "image/png" });
      }

      console.log("Getting upload URL for image.png");
      const uploadUrl = await getUploadUrl("image.png");
      console.log("Uploading image to obtained URL");
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: image,
        headers: {
          "Content-Type": "image/png",
        },
      });
      console.log("Image uploaded, extracting image URL");
      // Derive the object key from the presigned PUT URL (strip bucket and query)
      let key = "";
      try {
        const u = new URL(String((response as any)?.url ?? ""));
        const segments = u.pathname.split("/");
        key = String(segments.pop() ?? "");
      } catch (_e) {
        const raw = String((response as any)?.url ?? "");
        const last = String((raw.split("/").pop() ?? ""));
        key = String((last.split("?")[0] ?? ""));
      }
      const publicBaseUrl = String(
        (process.env.NODE_ENV === "development" &&
        process.env.R2_PUBLIC_BASE_URL_DEV
          ? process.env.R2_PUBLIC_BASE_URL_DEV
          : process.env.R2_PUBLIC_BASE_URL) ?? "",
      );
      const imageUrl = `${publicBaseUrl}/${String(key)}`;
      console.log(`Image URL extracted: ${imageUrl}`);
      await ctx.runMutation(internal.images.uploadR2Image, {
        imageId,
        imageUrl,
      });
      if (messageId) {
        await ctx.runMutation(internal.messages.addImage, {
          messageId,
          imageUrl,
        });
      }
    } catch (error) {
      console.log("error:::", error);
      await ctx.runMutation(internal.serve.refundCrystal, {
        userId,
        name: model,
        currentCrystals,
      });
    }
  },
);

export const upload = action({
  args: { file: v.bytes(), filename: v.string(), fileType: v.string() },
  handler: async (_, { file, filename, fileType }) => {
    console.log("Getting upload URL for", filename);
    const uploadUrl = await getUploadUrl(filename);
    console.log("Uploading image to obtained URL");
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: Buffer.from(file),
      headers: {
        "Content-Type": fileType,
      },
    });
    console.log("Image uploaded, extracting image URL");
    // Derive the object key from the presigned PUT URL (strip bucket and query)
    let key = "";
    try {
      const u = new URL(String((response as any)?.url ?? ""));
      const segments = u.pathname.split("/");
      key = String(segments.pop() ?? "");
    } catch (_e) {
      const raw = String((response as any)?.url ?? "");
      const last = String((raw.split("/").pop() ?? ""));
      key = String((last.split("?")[0] ?? ""));
    }
    const publicBaseUrl = String(
      (process.env.NODE_ENV === "development" &&
      process.env.R2_PUBLIC_BASE_URL_DEV
        ? process.env.R2_PUBLIC_BASE_URL_DEV
        : process.env.R2_PUBLIC_BASE_URL) ?? "",
    );
    const imageUrl = `${publicBaseUrl}/${String(key)}`;
    console.log(`Image URL extracted: ${imageUrl}`);
    return imageUrl;
  },
});

export const deleteImageAction = internalAction(
  async (ctx, { imageUrl }: { imageUrl: string }) => {
    try {
      await deleteImage(imageUrl);
      console.log(`Image deleted successfully: ${imageUrl}`);
    } catch (error) {
      console.error(`Failed to delete image: ${imageUrl}`, error);
      throw new Error(`Failed to delete image: ${imageUrl}`);
    }
  },
);
