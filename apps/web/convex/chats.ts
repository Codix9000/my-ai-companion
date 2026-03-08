import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getUser } from "./users";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    chatName: v.optional(v.string()),
    characterId: v.id("characters"),
    storyId: v.optional(v.id("stories")),
    isNew: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!args.isNew) {
      let chat = await ctx.db
        .query("chats")
        .withIndex("by_creation_time")
        .filter((q) => q.eq(q.field("characterId"), args.characterId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .filter((q) => q.eq(q.field("storyId"), args.storyId))
        .order("desc")
        .first();

      if (chat) {
        return chat._id;
      }
    }
    const character = await ctx.db.get(args.characterId);
    if (!character) {
      throw new ConvexError({ message: "CHARACTER_DELETED" });
    }

    const { isNew, ...rest } = args;
    const newChat = await ctx.db.insert("chats", {
      ...rest,
      userId: user._id,
      tokenIdentifier: user?.tokenIdentifier,
    });
    const greeting = character.greetings
      ? (character.greetings[0] as string)
      : ("" as string);
    const persona = user?.primaryPersonaId
      ? await ctx.db.get(user.primaryPersonaId)
      : undefined;
    const userRole =
      typeof persona === "object" && persona !== null && "name" in persona
        ? persona.name
        : user.name;
    const formattedText = greeting.replaceAll("{{user}}", userRole);
    let speech;
    const replacedText = formattedText?.replace(/\(.*?\)|\*.*?\*/g, "");
    if (replacedText && replacedText.length > 5) {
      speech = await ctx.db
        .query("speeches")
        .filter((q) => q.eq(q.field("voiceId"), character.voiceId))
        .filter((q) => q.eq(q.field("text"), replacedText))
        .first();
    }
    const messageId = await ctx.db.insert("messages", {
      text: formattedText,
      chatId: newChat,
      characterId: character._id,
      speechUrl: speech ? speech.speechUrl : undefined,
    });

    const userLanguage =
      user.languageTag === "en"
        ? "en-US"
        : user.languageTag === "pt"
          ? "pt-PT"
          : user.languageTag;

    if (
      user?.languageTag &&
      user?.languageTag !== "en" &&
      user.autoTranslate !== false
    ) {
      await ctx.scheduler.runAfter(0, internal.translate.translate, {
        targetLanguage: userLanguage,
        userId: user._id,
        messageId,
      });
    }
    const numUsers = character.numUsers ? character.numUsers : 0;
    ctx.db.patch(args.characterId, {
      numUsers: numUsers + 1,
    });
    return newChat;
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const results = await ctx.db
      .query("chats")
      .withIndex("byUserId", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return results;
  },
});

export const get = query({
  args: {
    id: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const chat = await ctx.db.get(args.id);
    if (!identity) {
      throw new Error("User is not authorized");
    }
    if (
      chat?.tokenIdentifier &&
      chat?.tokenIdentifier !== identity?.tokenIdentifier
    ) {
      throw new Error("User is not authorized");
    }
    return chat;
  },
});

export const remove = mutation({
  args: {
    id: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const chat = await ctx.db.get(args.id);
    if (chat?.userId !== user._id) {
      throw new Error("User is not authorized to remove this chat");
    }
    if (chat) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("byChatId", (q) => q.eq("chatId", args.id))
        .collect();
      await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
      return await ctx.db.delete(args.id);
    }
  },
});

export const cleanupDeletedCharacter = internalMutation({
  args: {
    characterId: v.id("characters"),
  },
  handler: async (ctx, { characterId }) => {
    const chats = await ctx.db
      .query("chats")
      .withIndex("byCharacterId", (q) => q.eq("characterId", characterId))
      .collect();

    for (const chat of chats) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("byChatId", (q) => q.eq("chatId", chat._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }

      const followUps = await ctx.db
        .query("followUps")
        .withIndex("byChatId", (q) => q.eq("chatId", chat._id))
        .collect();
      for (const fu of followUps) {
        await ctx.db.delete(fu._id);
      }

      await ctx.db.delete(chat._id);
    }

    const stories = await ctx.db
      .query("stories")
      .withIndex("byCharacterId", (q) => q.eq("characterId", characterId))
      .collect();
    for (const story of stories) {
      await ctx.db.delete(story._id);
    }

    const customizations = await ctx.db
      .query("characterCustomizations")
      .withIndex("byCharacterId", (q) => q.eq("characterId", characterId))
      .collect();
    for (const c of customizations) {
      await ctx.db.delete(c._id);
    }

    const userFacts = await ctx.db
      .query("userFacts")
      .filter((q) => q.eq(q.field("characterId"), characterId))
      .collect();
    for (const uf of userFacts) {
      await ctx.db.delete(uf._id);
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("byAuthorId", (q) => q.eq("authorId", characterId))
      .collect();
    for (const post of posts) {
      const likes = await ctx.db
        .query("postLikes")
        .withIndex("byPostId", (q) => q.eq("postId", post._id))
        .collect();
      for (const like of likes) {
        await ctx.db.delete(like._id);
      }
      await ctx.db.delete(post._id);
    }

    const userMedia = await ctx.db
      .query("userMedia")
      .filter((q) => q.eq(q.field("characterId"), characterId))
      .collect();
    for (const um of userMedia) {
      await ctx.db.delete(um._id);
    }

    const charMessages = await ctx.db
      .query("messages")
      .withIndex("byCharacterId", (q) => q.eq("characterId", characterId))
      .collect();
    for (const msg of charMessages) {
      await ctx.db.delete(msg._id);
    }

    return {
      chatsRemoved: chats.length,
      storiesRemoved: stories.length,
      postsRemoved: posts.length,
    };
  },
});
