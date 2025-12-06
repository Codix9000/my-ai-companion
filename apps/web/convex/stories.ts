import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUser } from "./users";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";
import { DIVIDEND_RATE } from "./constants";

export const create = mutation({
  args: {
    characterId: v.id("characters"),
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const character = await ctx.db.get(args.characterId);
    return await ctx.db.insert("stories", {
      ...args,
      userId: user._id,
      isPrivate: false,
      isNSFW: character?.isNSFW,
    });
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    characterId: v.id("characters"),
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: any;
    try {
      user = await getUser(ctx, true);
    } catch (error) {
      console.error("Error getting user:", error);
    }
    let query = ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("characterId"), args.characterId));
    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }
    const results = await query.order("desc").paginate(args.paginationOpts);
    return results;
  },
});

export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("stories")
      .withIndex("by_creation_time")
      .filter((q) => q.neq(q.field("messageIds"), []));
    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }
    const results = await query.order("desc").paginate(args.paginationOpts);
    return results;
  },
});

export const count = query({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("characterId"), args.characterId))
      .collect();
    return results ? results.length : 0;
  },
});

export const get = query({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .order("desc")
      .first();
  },
});

export const getMy = query({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    return await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .first();
  },
});

export const remove = mutation({
  args: {
    id: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();
    if (story) {
      return await ctx.db.delete(args.id);
    }
  },
});

export const messages = query({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .order("desc")
      .first();
    const messages = await Promise.all(
      (story?.messageIds ?? []).map((messageId) => ctx.db.get(messageId)),
    );
    return messages.map((message) => {
      if (!message) return null;
      const { chatId, personaId, ...rest } = message;
      return rest;
    });
  },
});

export const metadata = query({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .order("desc")
      .first();
    const messages = await Promise.all(
      (story?.messageIds.slice(0, 2) ?? []).map((messageId) =>
        ctx.db.get(messageId),
      ),
    );
    const character = await ctx.db.get(story?.characterId as Id<"characters">);
    return {
      title: `${messages[0]?.text} ${character?.name} AI`,
      description: messages[1]?.text,
      cardImageUrl: character?.cardImageStorageId
        ? ((await ctx.storage.getUrl(character.cardImageStorageId)) as string)
        : character?.cardImageUrl,
    };
  },
});

export const creatorName = query({
  args: {
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .first();
    const user = await ctx.db.get(story?.userId as Id<"users">);
    return user?.name;
  },
});

export const unlock = mutation({
  args: {
    storyId: v.id("stories"),
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { isUnlocked: true });
    const story = await ctx.db
      .query("stories")
      .filter((q) => q.eq(q.field("_id"), args.storyId))
      .order("desc")
      .first();
    await ctx.db.patch(args.storyId, { numChats: (story?.numChats || 0) + 1 });
    const messages = await Promise.all(
      (story?.messageIds ?? []).map((messageId) => ctx.db.get(messageId)),
    );
    const price = messages?.length;
    const user = await getUser(ctx);
    const userCrystals = user?.crystals || 0;
    const creator = await ctx.db.get(story?.userId as Id<"users">);
    const creatorCrystals = creator?.crystals || 0;
    const dividend = price * DIVIDEND_RATE;

    if (story?.userId !== user?._id) {
      await ctx.db.patch(story?.userId as Id<"users">, {
        crystals: creatorCrystals + dividend,
      });
      await ctx.db.patch(user?._id as Id<"users">, {
        crystals: userCrystals - price,
      });
    }
    await Promise.all(
      messages.map((message) =>
        ctx.db.insert("messages", {
          chatId: args.chatId,
          characterId: message?.characterId,
          text: message?.text as string,
          ...(message?.speechUrl ? { speechUrl: message.speechUrl } : {}),
          ...(message?.imageUrl ? { imageUrl: message.imageUrl } : {}),
        }),
      ),
    );
  },
});
