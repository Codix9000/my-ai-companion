import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./users";

// Get all suggestions for a category
export const getSuggestions = query({
  args: {
    category: v.union(
      v.literal("outfit"),
      v.literal("action"),
      v.literal("pose"),
      v.literal("accessories"),
      v.literal("scene"),
    ),
  },
  handler: async (ctx, args) => {
    const suggestions = await ctx.db
      .query("imageSuggestions")
      .withIndex("byCategory", (q) => q.eq("category", args.category))
      .collect();

    // Resolve storage URLs
    return await Promise.all(
      suggestions.map(async (s) => {
        let imageUrl = s.imageUrl;
        if (s.imageStorageId) {
          const url = await ctx.storage.getUrl(s.imageStorageId);
          if (url) imageUrl = url;
        }
        return { ...s, imageUrl };
      }),
    );
  },
});

// Get all suggestions across all categories
export const getAllSuggestions = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("imageSuggestions").collect();

    const withUrls = await Promise.all(
      all.map(async (s) => {
        let imageUrl = s.imageUrl;
        if (s.imageStorageId) {
          const url = await ctx.storage.getUrl(s.imageStorageId);
          if (url) imageUrl = url;
        }
        return { ...s, imageUrl };
      }),
    );

    // Group by category
    const grouped: Record<string, typeof withUrls> = {};
    for (const s of withUrls) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category]!.push(s);
    }
    return grouped;
  },
});

// Add a suggestion (admin/creator utility)
export const addSuggestion = mutation({
  args: {
    category: v.union(
      v.literal("outfit"),
      v.literal("action"),
      v.literal("pose"),
      v.literal("accessories"),
      v.literal("scene"),
    ),
    label: v.string(),
    promptText: v.string(),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("imageSuggestions", args);
  },
});

// Get generated images for a specific user + character
export const getGeneratedImages = query({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const media = await ctx.db
      .query("userMedia")
      .withIndex("byUserAndCharacter", (q) =>
        q.eq("userId", user._id).eq("characterId", args.characterId),
      )
      .order("desc")
      .collect();

    // Only images
    const images = media.filter((m) => m.mediaType === "image");

    return await Promise.all(
      images.map(async (item) => {
        let mediaUrl = item.mediaUrl;
        if (item.mediaStorageId) {
          const url = await ctx.storage.getUrl(item.mediaStorageId);
          if (url) mediaUrl = url;
        }
        return { ...item, mediaUrl };
      }),
    );
  },
});

// Generate upload URL for suggestion images
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
