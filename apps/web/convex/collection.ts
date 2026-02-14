import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./users";
import { Id } from "./_generated/dataModel";

// Get all media for the current user, grouped by character
export const getMyCollection = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("az"),
        v.literal("za"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const sortBy = args.sortBy ?? "newest";

    // Get all user media
    const allMedia = await ctx.db
      .query("userMedia")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .collect();

    // Resolve storage URLs
    const mediaWithUrls = await Promise.all(
      allMedia.map(async (item) => {
        let mediaUrl = item.mediaUrl;
        if (item.mediaStorageId) {
          const url = await ctx.storage.getUrl(item.mediaStorageId);
          if (url) mediaUrl = url;
        }
        return { ...item, mediaUrl };
      }),
    );

    // Group by character
    const characterMap = new Map<
      string,
      {
        characterId: Id<"characters">;
        characterName: string;
        characterAvatar: string | null;
        media: typeof mediaWithUrls;
      }
    >();

    for (const item of mediaWithUrls) {
      const charIdStr = item.characterId as string;
      if (!characterMap.has(charIdStr)) {
        const character = await ctx.db.get(item.characterId);
        let avatarUrl: string | null = null;
        if (character?.cardImageStorageId) {
          avatarUrl = await ctx.storage.getUrl(character.cardImageStorageId) ?? character.cardImageUrl ?? null;
        } else {
          avatarUrl = character?.cardImageUrl ?? null;
        }
        characterMap.set(charIdStr, {
          characterId: item.characterId,
          characterName: character?.name ?? "Unknown",
          characterAvatar: avatarUrl,
          media: [],
        });
      }
      characterMap.get(charIdStr)!.media.push(item);
    }

    // Convert map to array
    let groups = Array.from(characterMap.values());

    // Sort media within each group
    for (const group of groups) {
      if (sortBy === "newest") {
        group.media.sort((a, b) => b._creationTime - a._creationTime);
      } else if (sortBy === "oldest") {
        group.media.sort((a, b) => a._creationTime - b._creationTime);
      }
    }

    // Sort groups
    if (sortBy === "az") {
      groups.sort((a, b) => a.characterName.localeCompare(b.characterName));
    } else if (sortBy === "za") {
      groups.sort((a, b) => b.characterName.localeCompare(a.characterName));
    } else if (sortBy === "newest") {
      // Sort groups by most recent media item
      groups.sort((a, b) => {
        const aLatest = Math.max(...a.media.map((m) => m._creationTime));
        const bLatest = Math.max(...b.media.map((m) => m._creationTime));
        return bLatest - aLatest;
      });
    } else {
      // oldest: sort by oldest media item
      groups.sort((a, b) => {
        const aOldest = Math.min(...a.media.map((m) => m._creationTime));
        const bOldest = Math.min(...b.media.map((m) => m._creationTime));
        return aOldest - bOldest;
      });
    }

    return groups;
  },
});

// Save a generated media item to the user's collection
export const saveMedia = mutation({
  args: {
    characterId: v.id("characters"),
    mediaUrl: v.string(),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ctx.db.insert("userMedia", {
      userId: user._id,
      characterId: args.characterId,
      mediaUrl: args.mediaUrl,
      mediaStorageId: args.mediaStorageId,
      mediaType: args.mediaType,
      prompt: args.prompt,
    });
  },
});

// Delete a media item from the collection
export const deleteMedia = mutation({
  args: {
    mediaId: v.id("userMedia"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const media = await ctx.db.get(args.mediaId);
    if (!media || media.userId !== user._id) {
      throw new Error("Media not found or unauthorized");
    }
    await ctx.db.delete(args.mediaId);
  },
});
