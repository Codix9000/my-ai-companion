import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { getUser } from "./users";
import { paginationOptsValidator } from "convex/server";
import { getCrystalPrice } from "./constants";
import { Id } from "./_generated/dataModel";

export const generate = mutation({
  args: {
    prompt: v.string(),
    model: v.union(
      v.literal("stable-diffusion-xl-1024-v1-0"),
      v.literal("dall-e-3"),
      v.literal("charlesmccarthy/animagine-xl"),
      v.literal("asiryan/juggernaut-xl-v7"),
      v.literal("daun-io/openroleplay.ai-animagine-v3"),
      v.literal("pagebrain/dreamshaper-v8"),
      v.literal("asiryan/meina-mix-v11"),
      v.literal("asiryan/blue-pencil-xl-v2"),
      v.literal("lucataco/sdxl-lightning-4step"),
    ),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, { prompt, model, isPrivate }) => {
    const user = await getUser(ctx);
    const crystalPrice = getCrystalPrice(model);
    if (user?.crystals < crystalPrice) {
      throw new ConvexError("Not enough crystals.");
    }
    const image = await ctx.db.insert("images", {
      prompt,
      model,
      imageUrl: "",
      creatorId: user._id,
      numLikes: 0,
      isNSFW: false,
      isBlacklisted: false,
      isArchived: false,
      isPrivate: true,
    });
    await ctx.scheduler.runAfter(0, internal.llm.generateImageTags, {
      userId: user._id,
      imageId: image,
      isPlus: user?.subscriptionTier === "plus",
    });

    return image;
  },
});

export const uploadImage = internalMutation({
  args: {
    imageId: v.id("images"),
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.imageId);
    if (!character) {
      throw new ConvexError({ message: "Character does not exist." });
    }
    const imageUrl = (await ctx.storage.getUrl(args.imageStorageId)) as string;
    await ctx.db.patch(args.imageId, {
      imageUrl,
    });
    return imageUrl;
  },
});

export const uploadR2Image = internalMutation({
  args: {
    imageId: v.id("images"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { imageId, imageUrl }) => {
    await ctx.db.patch(imageId, {
      imageUrl,
    });
    return imageUrl;
  },
});

export const listImages = query({
  args: {
    paginationOpts: paginationOptsValidator,
    isAuthenticated: v.optional(v.boolean()),
    nsfwPreference: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: any;
    let userId: any;
    if (args.isAuthenticated) {
      try {
        user = await getUser(ctx, true);
        userId = user?._id;
      } catch (error) {
        console.error("Error getting user:", error);
      }
    }
    let query = ctx.db
      .query("images")
      .withIndex("by_creation_time")
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("isPrivate"), true),
            q.eq(q.field("creatorId"), userId),
          ),
          q.neq(q.field("isPrivate"), true),
        ),
      )
      .filter((q) => q.neq(q.field("imageUrl"), ""));

    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }
    if (args.tag) {
      query = query.filter((q) => q.eq(q.field("tag"), args.tag));
    }

    const paginationResult = await query
      .order("desc")
      .paginate(args.paginationOpts);

    const likes = user
      ? await ctx.db
        .query("imageLikes")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect()
      : [];
    const likedImageIds = likes
      .filter((like) => like && like !== null)
      .map((like: any) => like.imageId);
    const pageWithIsLiked = paginationResult.page.map((image) => ({
      ...image,
      isLiked: likedImageIds.includes(image._id),
    }));

    return {
      ...paginationResult,
      page: pageWithIsLiked,
    };
  },
});

export const listMy = query({
  args: {
    paginationOpts: paginationOptsValidator,
    isAuthenticated: v.optional(v.boolean()),
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx, true);
    const userId = user?._id;
    let query = ctx.db
      .query("images")
      .withIndex("by_creation_time")
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.eq(q.field("creatorId"), userId))
      .filter((q) => q.neq(q.field("imageUrl"), ""));

    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }

    const paginationResult = await query
      .order("desc")
      .paginate(args.paginationOpts);

    const likes = user
      ? await ctx.db
        .query("imageLikes")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .order("desc")
        .collect()
      : [];
    const likedImageIds = likes
      .filter((like) => like && like !== null)
      .map((like: any) => like.imageId);
    const pageWithIsLiked = paginationResult.page.map((image) => ({
      ...image,
      isLiked: likedImageIds.includes(image._id),
    }));

    return {
      ...paginationResult,
      page: pageWithIsLiked,
    };
  },
});

export const get = query({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) {
      throw new ConvexError({ message: "Image does not exist." });
    }
    return image;
  },
});

export const tag = internalMutation(
  async (
    ctx,
    {
      imageId,
      tag,
      title,
      isNSFW,
      isPrivate,
      imageUrl,
    }: {
      imageId: Id<"images">;
      tag: string;
      title: string;
      isNSFW: boolean;
      isPrivate: boolean;
      imageUrl: string;
    },
  ) => {
    return await ctx.db.patch(imageId, {
      tag,
      title,
      ...(imageUrl ? { imageUrl } : {}),
      ...(isNSFW ? { isNSFW } : {}),
      ...(isPrivate ? { isPrivate } : {}),
    });
  },
);

export const like = mutation(
  async (
    ctx,
    {
      imageId,
    }: {
      imageId: Id<"images">;
    },
  ) => {
    const user = await getUser(ctx);
    const existingLike = await ctx.db
      .query("imageLikes")
      .withIndex("byImageId")
      .filter((q) => q.eq(q.field("imageId"), imageId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (existingLike) {
      console.log("existing like:::", existingLike);
      await ctx.db.delete(existingLike._id);
      const image = (await ctx.db.get(imageId)) as any;
      await ctx.db.patch(imageId, { numLikes: image.numLikes - 1 });
    } else {
      await ctx.db.insert("imageLikes", {
        imageId,
        userId: user._id,
      });
      const image = (await ctx.db.get(imageId)) as any;
      await ctx.db.patch(imageId, { numLikes: image.numLikes + 1 });
    }
  },
);

export const imagine = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    const user = await getUser(ctx);
    const message = await ctx.db.get(messageId);
    const character = await ctx.db.get(
      message?.characterId as Id<"characters">,
    );
    const crystalPrice = getCrystalPrice(
      "daun-io/openroleplay.ai-animagine-v3",
    );
    if (user?.crystals < crystalPrice) {
      throw new ConvexError("Not enough crystals.");
    }
    const referenceImage = character?.cardImageStorageId
      ? ((await ctx.storage.getUrl(character.cardImageStorageId)) as string)
      : character?.cardImageUrl;

    const image = await ctx.db.insert("images", {
      prompt: message?.text as string,
      model: "daun-io/openroleplay.ai-animagine-v3",
      imageUrl: "",
      referenceImage,
      creatorId: user._id,
      numLikes: 0,
      isNSFW: false,
      isBlacklisted: false,
      isArchived: false,
      isPrivate: true,
    });
    await ctx.scheduler.runAfter(0, internal.image.generateByPrompt, {
      userId: user._id,
      imageId: image,
      messageId,
      prompt: character?.genderTag
        ? `1 ${character?.genderTag}, masterpiece, ${message?.text}`
        : (message?.text as string),
      referenceImage,
      model: "daun-io/openroleplay.ai-animagine-v3",
      isPlus: user?.subscriptionTier === "plus",
    });

    return image;
  },
});

export const listPopularTags = query({
  handler: async (ctx) => {
    let user: any;
    try {
      user = await getUser(ctx, true);
    } catch (error) {
      console.error("Error getting user:", error);
    }
    let query = ctx.db.query("images").withIndex("byLikes");
    if (user && user.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }
    const popularImages = await query.order("desc").take(150);
    const tagCounts = popularImages.reduce<Record<string, number>>(
      (acc, image) => {
        const tag = image.tag as string;
        if (tag) {
          acc[tag] = (acc[tag] || 0) + 1;
        }
        return acc;
      },
      {},
    );
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tagName, count]) => ({ tagName, count }));
    return sortedTags;
  },
});

export const removeOldImages = internalMutation({
  handler: async (ctx) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const imagesToDelete = await ctx.db
      .query("images")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", weekAgo.getTime()),
      )
      .collect();

    await Promise.all(
      imagesToDelete.slice(0, 512).map(async (image) => {
        console.log("Querying for character with image...");
        const characterWithImage = await ctx.db
          .query("characters")
          .withIndex("byCardImageUrl", (q) =>
            q.eq("cardImageUrl", image.imageUrl),
          )
          .first();
        console.log("Character with image query result:", characterWithImage);
        if (!characterWithImage) {
          console.log(
            "No character found, scheduling image deletion for imageUrl:",
            image.imageUrl,
          );
          await ctx.scheduler.runAfter(0, internal.image.deleteImageAction, {
            imageUrl: image.imageUrl,
          });
        }
        console.log("Deleting image with ID:", image?._id);
        await ctx.db.delete(image?._id);
      }),
    );

    return { deletedCount: imagesToDelete.length };
  },
});
