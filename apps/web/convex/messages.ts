import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getUser } from "./users";
import { paginationOptsValidator } from "convex/server";
import { Id } from "./_generated/dataModel";

export const get = internalQuery({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    chatId: v.id("chats"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const chat = await ctx.db.get(args.chatId);
    if (!identity) {
      throw new Error("User is not authorized");
    }
    if (
      chat?.tokenIdentifier &&
      chat?.tokenIdentifier !== identity?.tokenIdentifier
    ) {
      throw new Error("User is not authorized");
    }
    return await ctx.db
      .query("messages")
      .withIndex("byChatId", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const mostRecentMessage = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const chat = await ctx.db.get(args.chatId);
    if (!identity) {
      throw new Error("User is not authorized");
    }
    if (
      chat?.tokenIdentifier &&
      chat?.tokenIdentifier !== identity?.tokenIdentifier
    ) {
      throw new Error("User is not authorized");
    }
    return await ctx.db
      .query("messages")
      .withIndex("byChatId", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .first();
  },
});

export const send = mutation({
  args: {
    message: v.string(),
    chatId: v.id("chats"),
    characterId: v.id("characters"),
    personaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { message, chatId, characterId, personaId }) => {
    const user = await getUser(ctx);
    const messageId = await ctx.db.insert("messages", {
      text: message,
      chatId,
      personaId,
    });
    const chat = await ctx.db.get(chatId);
    if (chat?.userId !== user._id) {
      throw new Error("User does not own the chat");
    }

    const userLanguage =
      user.languageTag === "en"
        ? "en-US"
        : user.languageTag === "pt"
          ? "pt-PT"
          : user.languageTag;

    // write an intercept internal translate action. this will intercept message before answer.
    await ctx.scheduler.runAfter(0, internal.translate.intercept, {
      userLanguage: userLanguage,
      targetLanguage: "en-US",
      userId: user._id,
      chatId,
      characterId,
      personaId,
      messageId,
      autoTranslate: user.autoTranslate,
    });

    const character = await ctx.db.get(characterId);
    const updatedAt = new Date().toISOString();
    const newNumChats = character?.numChats ? character?.numChats + 1 : 1;
    await ctx.db.patch(characterId, {
      numChats: newNumChats,
      updatedAt,
    });
    await ctx.db.insert("followUps", { chatId });
  },
});

export const sendImageRequest = mutation({
  args: {
    message: v.string(),
    chatId: v.id("chats"),
    characterId: v.id("characters"),
    personaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { message, chatId, characterId, personaId }) => {
    const user = await getUser(ctx);
    await ctx.db.insert("messages", {
      text: message,
      chatId,
      personaId,
    });
    const chat = await ctx.db.get(chatId);
    if (chat?.userId !== user._id) {
      throw new Error("User does not own the chat");
    }

    const character = await ctx.db.get(characterId);
    const updatedAt = new Date().toISOString();
    const newNumChats = character?.numChats ? character?.numChats + 1 : 1;
    await ctx.db.patch(characterId, {
      numChats: newNumChats,
      updatedAt,
    });
    await ctx.db.insert("followUps", { chatId });
  },
});

export const clear = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const chat = await ctx.db.get(args.chatId);
    if (!identity) {
      throw new Error("User is not authorized");
    }
    if (
      chat?.tokenIdentifier &&
      chat?.tokenIdentifier !== identity?.tokenIdentifier
    ) {
      throw new Error("User is not authorized");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("byChatId", (q) => q.eq("chatId", args.chatId))
      .collect();
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
  },
});

export const save = internalMutation({
  args: {
    messageId: v.id("messages"),
    query: v.string(),
    rejectedMessage: v.string(),
    regeneratedMessage: v.string(),
  },
  handler: async (
    ctx,
    { messageId, query, rejectedMessage, regeneratedMessage },
  ) => {
    return await ctx.db.insert("regeneratedMessages", {
      messageId,
      query,
      rejectedMessage,
      regeneratedMessage,
    });
  },
});

export const regenerate = mutation({
  args: {
    messageId: v.id("messages"),
    chatId: v.id("chats"),
    characterId: v.id("characters"),
    personaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { messageId, chatId, characterId, personaId }) => {
    const user = await getUser(ctx);
    const chat = await ctx.db.get(chatId);
    if (chat?.userId !== user._id) {
      throw new Error("User does not own the chat");
    }
    await ctx.scheduler.runAfter(0, internal.llm.answer, {
      chatId,
      characterId,
      personaId: personaId ? personaId : user?.primaryPersonaId,
      userId: user._id,
      messageId,
    });
  },
});

export const react = mutation({
  args: {
    messageId: v.id("messages"),
    type: v.union(
      v.literal("like"),
      v.literal("dislike"),
      v.literal("lol"),
      v.literal("cry"),
      v.literal("smirk"),
    ),
  },
  handler: async (ctx, { messageId, type }) => {
    const existingReaction = await ctx.db
      .query("messageReaction")
      .withIndex("byMessageId", (q) => q.eq("messageId", messageId))
      .first();

    if (existingReaction) {
      if (existingReaction.type === type) {
        await ctx.db.delete(existingReaction._id);
        await ctx.db.patch(messageId, { reaction: undefined });
      } else {
        await ctx.db.patch(existingReaction._id, { type });
        await ctx.db.patch(messageId, { reaction: type });
      }
    } else {
      const message = await ctx.db.get(messageId);
      await ctx.db.insert("messageReaction", {
        messageId,
        text: message?.text,
        type,
      });
      await ctx.db.patch(messageId, { reaction: type });
    }
  },
});

export const translate = mutation({
  args: {
    messageId: v.id("messages"),
    targetLanguage: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, targetLanguage }) => {
    const user = await getUser(ctx);
    if (user?.crystals < 1) {
      throw new ConvexError("Not enough crystals.");
    }
    await ctx.scheduler.runAfter(0, internal.translate.translate, {
      userId: user._id,
      messageId,
      targetLanguage:
        targetLanguage === "en"
          ? "en-US"
          : targetLanguage === "pt"
            ? "pt-PT"
            : targetLanguage,
    });
  },
});

export const addTranslation = internalMutation(
  async (
    ctx,
    {
      messageId,
      translation,
    }: { messageId: Id<"messages">; translation: string },
  ) => {
    return await ctx.db.patch(messageId, {
      translation,
    });
  },
);

export const interceptTranslation = internalMutation(
  async (
    ctx,
    {
      messageId,
      translation,
      text,
    }: { messageId: Id<"messages">; translation: string; text: string },
  ) => {
    return await ctx.db.patch(messageId, {
      translation,
      text,
    });
  },
);

export const addImage = internalMutation(
  async (
    ctx,
    { messageId, imageUrl }: { messageId: Id<"messages">; imageUrl: string },
  ) => {
    return await ctx.db.patch(messageId, {
      imageUrl,
    });
  },
);

export const removeOldMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", weekAgo.getTime()),
      )
      .take(4000);
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
    return { removed: messages.length };
  },
});

export const removeOldFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const followUps = await ctx.db
      .query("followUps")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", weekAgo.getTime()),
      )
      // .filter((q) => q.neq(q.field("chosen"), undefined))
      .take(4000);
    await Promise.all(followUps.map((followUp) => ctx.db.delete(followUp._id)));
    return { removed: followUps.length };
  },
});

export const removeOldStories = internalMutation({
  args: {},
  handler: async (ctx) => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldStories = await ctx.db
      .query("stories")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", monthAgo.getTime()),
      )
      .take(4000);
    await Promise.all(oldStories.map((story) => ctx.db.delete(story._id)));
    return { removed: oldStories.length };
  },
});

export const removeOldChats = internalMutation({
  args: {},
  handler: async (ctx) => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldChats = await ctx.db
      .query("chats")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", monthAgo.getTime()),
      )
      .take(4000);
    await Promise.all(oldChats.map((chat) => ctx.db.delete(chat._id)));
    return { removed: oldChats.length };
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("messages"),
    editedText: v.string(),
  },
  handler: async (ctx, { messageId, editedText }) => {
    const user = await getUser(ctx);
    const message = await ctx.db.get(messageId);
    if (!message) {
      throw new Error("Message not found");
    }
    const chat = await ctx.db.get(message.chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }
    if (chat.userId !== user._id) {
      throw new Error("User does not own the chat");
    }
    await ctx.db.patch(messageId, { text: editedText });
    return { messageId, editedText };
  },
});
