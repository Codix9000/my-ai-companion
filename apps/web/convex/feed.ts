import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

/**
 * Get the feed of posts with author (character) information joined.
 * Returns posts sorted by creation time (newest first).
 */
export const getFeed = query({
  args: {
    paginationOpts: paginationOptsValidator,
    format: v.optional(v.union(v.literal("feed"), v.literal("short"))),
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Query posts ordered by creation time (default order is by _creationTime)
    let postsQuery = ctx.db
      .query("posts")
      .order("desc");

    // Filter by format if specified (feed vs short)
    if (args.format) {
      postsQuery = postsQuery.filter((q) =>
        q.eq(q.field("format"), args.format)
      );
    }

    // Filter NSFW content unless allowed
    if (args.nsfwPreference !== "allow") {
      postsQuery = postsQuery.filter((q) => q.neq(q.field("isNSFW"), true));
    }

    const paginatedPosts = await postsQuery.paginate(args.paginationOpts);

    // Join with characters table to get author info
    const postsWithAuthors = await Promise.all(
      paginatedPosts.page.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          ...post,
          author: author
            ? {
                id: author._id,
                name: author.name || "Unknown",
                handle: author.name
                  ? `@${author.name.toLowerCase().replace(/\s+/g, "_")}`
                  : "@unknown",
                avatarUrl: author.cardImageUrl || null,
              }
            : null,
        };
      })
    );

    return {
      ...paginatedPosts,
      page: postsWithAuthors,
    };
  },
});

/**
 * Get a single post by ID with author information.
 */
export const getPost = query({
  args: {
    id: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) return null;

    const author = await ctx.db.get(post.authorId);
    return {
      ...post,
      author: author
        ? {
            id: author._id,
            name: author.name || "Unknown",
            handle: author.name
              ? `@${author.name.toLowerCase().replace(/\s+/g, "_")}`
              : "@unknown",
            avatarUrl: author.cardImageUrl || null,
          }
        : null,
    };
  },
});

/**
 * Get URL from a Convex storage ID.
 * Use this to convert a storage ID to a URL for createPost.
 */
export const getStorageUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId);
    return url;
  },
});

/**
 * Generate a signed upload URL for post media.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new post (for testing/manual insertion).
 * You can provide either:
 * - mediaUrl: A direct URL string
 * - mediaStorageId: A Convex storage ID (will be converted to URL)
 */
export const createPost = mutation({
  args: {
    authorId: v.id("characters"),
    mediaUrl: v.optional(v.string()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaType: v.union(v.literal("image"), v.literal("video")),
    caption: v.string(),
    isLocked: v.optional(v.boolean()),
    format: v.optional(v.union(v.literal("feed"), v.literal("short"))),
    isNSFW: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Verify the character exists
    const character = await ctx.db.get(args.authorId);
    if (!character) {
      throw new Error("Character not found");
    }

    // Get the media URL - either from direct URL or from storage ID
    let mediaUrl = args.mediaUrl;
    if (args.mediaStorageId) {
      mediaUrl = await ctx.storage.getUrl(args.mediaStorageId);
      if (!mediaUrl) {
        throw new Error("Storage file not found");
      }
    }

    if (!mediaUrl) {
      throw new Error("Either mediaUrl or mediaStorageId must be provided");
    }

    const postId = await ctx.db.insert("posts", {
      authorId: args.authorId,
      mediaUrl: mediaUrl,
      mediaType: args.mediaType,
      caption: args.caption,
      likesCount: 0,
      isLocked: args.isLocked ?? false,
      format: args.format ?? "feed",
      isNSFW: args.isNSFW ?? false,
    });

    return postId;
  },
});

/**
 * Toggle like on a post (for future use).
 * Currently just toggles the UI state - full implementation later.
 */
export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query("postLikes")
      .withIndex("byPostAndUser", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId)
      )
      .unique();

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likesCount: Math.max(0, post.likesCount - 1),
      });
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("postLikes", {
        postId: args.postId,
        userId: args.userId,
      });
      await ctx.db.patch(args.postId, {
        likesCount: post.likesCount + 1,
      });
      return { liked: true };
    }
  },
});

/**
 * Check if user has liked a post.
 */
export const hasLiked = query({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query("postLikes")
      .withIndex("byPostAndUser", (q) =>
        q.eq("postId", args.postId).eq("userId", args.userId)
      )
      .unique();

    return !!existingLike;
  },
});

/**
 * Get posts by a specific character/creator.
 */
export const getPostsByAuthor = query({
  args: {
    authorId: v.id("characters"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .withIndex("byAuthorId", (q) => q.eq("authorId", args.authorId))
      .order("desc")
      .paginate(args.paginationOpts);

    const author = await ctx.db.get(args.authorId);
    const authorInfo = author
      ? {
          id: author._id,
          name: author.name || "Unknown",
          handle: author.name
            ? `@${author.name.toLowerCase().replace(/\s+/g, "_")}`
            : "@unknown",
          avatarUrl: author.cardImageUrl || null,
        }
      : null;

    return {
      ...posts,
      page: posts.page.map((post) => ({
        ...post,
        author: authorInfo,
      })),
    };
  },
});
