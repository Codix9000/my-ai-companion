import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all active promo banners, sorted by sortOrder.
 */
export const getActiveBanners = query({
  handler: async (ctx) => {
    const banners = await ctx.db
      .query("promoBanners")
      .withIndex("byActive", (q) => q.eq("isActive", true))
      .collect();

    // Sort by sortOrder
    banners.sort((a, b) => a.sortOrder - b.sortOrder);

    // Resolve storage URLs
    return Promise.all(
      banners.map(async (banner) => {
        let resolvedImageUrl = banner.imageUrl;
        if (banner.imageStorageId) {
          const url = await ctx.storage.getUrl(banner.imageStorageId);
          if (url) resolvedImageUrl = url;
        }
        return {
          _id: banner._id,
          title: banner.title,
          subtitle: banner.subtitle,
          imageUrl: resolvedImageUrl,
          linkUrl: banner.linkUrl,
        };
      })
    );
  },
});

/**
 * Create a promo banner (admin use / Convex dashboard).
 */
export const createBanner = mutation({
  args: {
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    imageUrl: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("promoBanners", {
      title: args.title,
      subtitle: args.subtitle,
      imageUrl: args.imageUrl,
      imageStorageId: args.imageStorageId,
      linkUrl: args.linkUrl,
      isActive: true,
      sortOrder: args.sortOrder,
    });
  },
});

/**
 * Get characters that have posts (for story bar).
 * Returns character info + most recent post timestamp.
 */
export const getCharactersWithPosts = query({
  handler: async (ctx) => {
    // Get recent posts (up to 200 to find unique characters)
    const recentPosts = await ctx.db
      .query("posts")
      .order("desc")
      .take(200);

    // Group by character, keep track of which characters have posts
    const characterMap = new Map<string, { latestPostTime: number }>();
    for (const post of recentPosts) {
      const charId = post.authorId as string;
      if (!characterMap.has(charId)) {
        characterMap.set(charId, {
          latestPostTime: post._creationTime,
        });
      }
    }

    // Fetch character details
    const characters = await Promise.all(
      Array.from(characterMap.entries()).map(async ([charId, info]) => {
        const character = await ctx.db.get(charId as any);
        if (!character || !character.name) return null;

        let cardImageUrl = character.cardImageUrl;
        if (character.cardImageStorageId) {
          const url = await ctx.storage.getUrl(character.cardImageStorageId);
          if (url) cardImageUrl = url;
        }

        return {
          _id: character._id,
          name: character.name,
          cardImageUrl: cardImageUrl || "",
          latestPostTime: info.latestPostTime,
        };
      })
    );

    // Filter nulls and sort by latest post time
    return characters
      .filter(Boolean)
      .sort((a: any, b: any) => b.latestPostTime - a.latestPostTime)
      .slice(0, 20); // Max 20 characters in story bar
  },
});

/**
 * Get latest 2 posts from a specific character (for story view).
 */
export const getLatestPostsForStory = query({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("byAuthorId", (q) => q.eq("authorId", args.characterId))
      .order("desc")
      .take(2);

    const character = await ctx.db.get(args.characterId);
    let cardImageUrl = character?.cardImageUrl;
    if (character?.cardImageStorageId) {
      const url = await ctx.storage.getUrl(character.cardImageStorageId);
      if (url) cardImageUrl = url;
    }

    return posts.map((post) => ({
      _id: post._id,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      caption: post.caption,
      authorName: character?.name || "Unknown",
      authorImage: cardImageUrl || "",
      _creationTime: post._creationTime,
    }));
  },
});
