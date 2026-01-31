import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getUser } from "./users";
import { embedText } from "./ingest/embed";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const upsert = mutation({
  args: {
    id: v.optional(v.id("characters")),
    remixId: v.optional(v.id("characters")),
    voiceId: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    model: v.optional(v.string()),
    instructions: v.optional(v.string()),
    cardImageUrl: v.optional(v.string()),
    cardImageStorageId: v.optional(v.id("_storage")),
    bannerImageStorageId: v.optional(v.id("_storage")),
    greetings: v.optional(v.array(v.string())),
    knowledge: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    isNSFW: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const updatedAt = new Date().toISOString();
    if (args.id) {
      const characterDraft = await ctx.db.get(args.id);
      if (characterDraft && user._id !== characterDraft.creatorId) {
        throw new ConvexError({
          message: "User does not have permission to modify this character.",
        });
      }
      const { id, cardImageUrl, cardImageStorageId, bannerImageStorageId, ...rest } = args;
      const character = await ctx.db.patch(id, {
        ...rest,
        ...(cardImageStorageId
          ? {
            cardImageStorageId,
            cardImageUrl: (await ctx.storage.getUrl(
              cardImageStorageId,
            )) as string,
          }
          : { cardImageUrl }),
        ...(bannerImageStorageId
          ? {
            bannerImageStorageId,
            bannerImageUrl: (await ctx.storage.getUrl(
              bannerImageStorageId,
            )) as string,
          }
          : {}),
        updatedAt,
      });
      return character;
    } else {
      const {
        cardImageStorageId,
        cardImageUrl,
        bannerImageStorageId,
        description,
        instructions,
        ...rest
      } = args;
      const character = await ctx.db.insert("characters", {
        ...rest,
        description: description?.substring(0, 128),
        instructions: instructions?.substring(0, 1024),
        ...(cardImageStorageId
          ? {
            cardImageStorageId,
            cardImageUrl: (await ctx.storage.getUrl(
              cardImageStorageId,
            )) as string,
          }
          : { cardImageUrl }),
        ...(bannerImageStorageId
          ? {
            bannerImageStorageId,
            bannerImageUrl: (await ctx.storage.getUrl(
              bannerImageStorageId,
            )) as string,
          }
          : {}),
        creatorId: user._id,
        updatedAt,
        numChats: 0,
        isDraft: true,
        isArchived: false,
        isBlacklisted: false,
      });
      return character;
    }
  },
});
export const publish = mutation({
  args: {
    id: v.id("characters"),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const character = await ctx.db.get(args.id);

    if (!character)
      throw new ConvexError({ message: "Character does not exist." });
    if (user._id !== character.creatorId)
      throw new ConvexError({
        message: "User does not have permission to modify this character.",
      });
    if (!character.cardImageUrl && args.visibility === "public")
      throw new ConvexError({
        message: "Character must have a card image to be published.",
      });
    if (!character.name)
      throw new ConvexError({ message: "Character must have a name." });

    const greeting = character.greetings?.[0] || "Hi.";
    const updatedAt = new Date().toISOString();
    const description = character.description ? {} : { description: greeting };
    const greetings = character?.greetings?.[0]
      ? { greetings: character.greetings }
      : { greetings: ["Hi."] };
    const visibility = args.visibility ? { visibility: args.visibility } : {};

    await ctx.db.patch(args.id, {
      isDraft: false,
      ...visibility,
      ...description,
      ...greetings,
      updatedAt,
    });

    if (!character.languageTag) {
      await ctx.scheduler.runAfter(0, internal.llm.generateTags, {
        userId: user._id,
        characterId: character._id,
      });
    }

    return character._id;
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    genreTag: v.optional(v.string()),
    personalityTag: v.optional(v.string()),
    genderTag: v.optional(v.string()),
    languageTag: v.optional(v.string()),
    model: v.optional(v.string()),
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("characters")
      .withIndex("byScore")
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("isModel"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));
    if (args.genreTag) {
      query = query.filter((q) => q.eq(q.field("genreTag"), args.genreTag));
    }
    if (args.personalityTag) {
      query = query.filter((q) =>
        q.eq(q.field("personalityTag"), args.personalityTag),
      );
    }
    if (args.genderTag) {
      query = query.filter((q) => q.eq(q.field("genderTag"), args.genderTag));
    }
    if (args.languageTag) {
      query = query.filter((q) =>
        q.eq(q.field("languageTag"), args.languageTag),
      );
    }
    if (args.model) {
      query = query.filter((q) => q.eq(q.field("model"), args.model));
    }

    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }

    const paginationResult = await query.order("desc").paginate(args.paginationOpts);

    return {
      ...paginationResult,
      page: await Promise.all(
        paginationResult.page.map(async (character) => ({
          ...character,
          cardImageUrl: character.cardImageStorageId
            ? ((await ctx.storage.getUrl(
              character.cardImageStorageId,
            )) as string)
            : character.cardImageUrl,
        })),
      ),
    };
  },
});

export const listWithHides = query({
  args: {
    paginationOpts: paginationOptsValidator,
    genreTag: v.optional(v.string()),
    personalityTag: v.optional(v.string()),
    genderTag: v.optional(v.string()),
    languageTag: v.optional(v.string()),
    model: v.optional(v.string()),
    nsfwPreference: v.optional(v.string()),
    isAuthenticated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("characters")
      .withIndex("byScore", (q) => q.gt("score", 0))
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("isModel"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));
    if (args.genreTag) {
      query = query.filter((q) => q.eq(q.field("genreTag"), args.genreTag));
    }
    if (args.personalityTag) {
      query = query.filter((q) =>
        q.eq(q.field("personalityTag"), args.personalityTag),
      );
    }
    if (args.genderTag) {
      query = query.filter((q) => q.eq(q.field("genderTag"), args.genderTag));
    }
    if (args.languageTag) {
      query = query.filter((q) =>
        q.eq(q.field("languageTag"), args.languageTag),
      );
    }
    if (args.model) {
      query = query.filter((q) => q.eq(q.field("model"), args.model));
    }

    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }

    const paginationResult = await query
      .order("desc")
      .paginate(args.paginationOpts);

    let user: any;
    try {
      user = await getUser(ctx, true);
    } catch (error) {
      return paginationResult;
    }

    // Fetch all the hides for the current user
    const hides = user
      ? await ctx.db
        .query("hides")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("type"), "characters"))
        .order("desc")
        .take(256)
      : [];
    const hiddenCharacterIds = hides.map((hide: any) => hide.elementId);

    // Filter out the characters that are in the hides list
    const pageWithFilteredCharacters = paginationResult.page.filter(
      (character) => !hiddenCharacterIds.includes(character._id),
    );

    return {
      ...paginationResult,
      page: await Promise.all(
        pageWithFilteredCharacters.map(async (character) => ({
          ...character,
          cardImageUrl: character.cardImageStorageId
            ? ((await ctx.storage.getUrl(
              character.cardImageStorageId,
            )) as string)
            : character.cardImageUrl,
        })),
      ),
    };
  },
});

export const listBackend = query({
  args: {
    genreTag: v.optional(v.string()),
    personalityTag: v.optional(v.string()),
    genderTag: v.optional(v.string()),
    languageTag: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("characters")
      .withIndex("byScore")
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("isModel"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));
    if (args.genreTag) {
      query = query.filter((q) => q.eq(q.field("genreTag"), args.genreTag));
    }
    if (args.personalityTag) {
      query = query.filter((q) =>
        q.eq(q.field("personalityTag"), args.personalityTag),
      );
    }
    if (args.genderTag) {
      query = query.filter((q) => q.eq(q.field("genderTag"), args.genderTag));
    }
    if (args.languageTag) {
      query = query.filter((q) =>
        q.eq(q.field("languageTag"), args.languageTag),
      );
    }
    if (args.model) {
      query = query.filter((q) => q.eq(q.field("model"), args.model));
    }

    const characters = await query.order("desc").take(300);

    return await Promise.all(
      characters.map(async (character) => ({
        ...character,
        cardImageUrl: character.cardImageStorageId
          ? ((await ctx.storage.getUrl(character.cardImageStorageId)) as string)
          : character.cardImageUrl,
      })),
    );
  },
});

export const listModels = query({
  args: {
    paginationOpts: paginationOptsValidator,
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("characters")
      .withIndex("byScore")
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isModel"), true))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));
    if (args.model) {
      query = query.filter((q) => q.eq(q.field("model"), args.model));
    }

    const paginationResult = await query.order("desc").paginate(args.paginationOpts);

    return {
      ...paginationResult,
      page: await Promise.all(
        paginationResult.page.map(async (character) => ({
          ...character,
          cardImageUrl: character.cardImageStorageId
            ? ((await ctx.storage.getUrl(
              character.cardImageStorageId,
            )) as string)
            : character.cardImageUrl,
        })),
      ),
    };
  },
});

export const search = query({
  args: {
    paginationOpts: paginationOptsValidator,
    genreTag: v.optional(v.string()),
    personalityTag: v.optional(v.string()),
    genderTag: v.optional(v.string()),
    languageTag: v.optional(v.string()),
    model: v.optional(v.string()),
    query: v.optional(v.string()),
    nsfwPreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query;
    if (args.query) {
      query = ctx.db
        .query("characters")
        .withSearchIndex("searchName", (q) =>
          q.search("name", args.query as string),
        )
        .filter((q) => q.eq(q.field("isDraft"), false))
        .filter((q) => q.eq(q.field("isBlacklisted"), false))
        .filter((q) => q.neq(q.field("isArchived"), true))
        .filter((q) => q.neq(q.field("visibility"), "private"));
    } else {
      query = ctx.db
        .query("characters")
        .withIndex("byNumChats")
        .order("desc")
        .filter((q) => q.eq(q.field("isDraft"), false))
        .filter((q) => q.eq(q.field("isBlacklisted"), false))
        .filter((q) => q.neq(q.field("isArchived"), true))
        .filter((q) => q.neq(q.field("visibility"), "private"));
    }
    if (args.genreTag) {
      query = query.filter((q) => q.eq(q.field("genreTag"), args.genreTag));
    }
    if (args.personalityTag) {
      query = query.filter((q) =>
        q.eq(q.field("personalityTag"), args.personalityTag),
      );
    }
    if (args.genderTag) {
      query = query.filter((q) => q.eq(q.field("genderTag"), args.genderTag));
    }
    if (args.languageTag) {
      query = query.filter((q) =>
        q.eq(q.field("languageTag"), args.languageTag),
      );
    }
    if (args.model) {
      query = query.filter((q) => q.eq(q.field("model"), args.model));
    }
    if (args.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }

    const paginationResult = await query.paginate(args.paginationOpts);

    return {
      ...paginationResult,
      page: await Promise.all(
        paginationResult.page.map(async (character) => ({
          ...character,
          cardImageUrl: character.cardImageStorageId
            ? ((await ctx.storage.getUrl(
              character.cardImageStorageId,
            )) as string)
            : character.cardImageUrl,
        })),
      ),
    };
  },
});

export const listMy = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const paginationResult = await ctx.db
      .query("characters")
      .withIndex("byUserId", (q) => q.eq("creatorId", user._id))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...paginationResult,
      page: await Promise.all(
        paginationResult.page.map(async (character) => ({
          ...character,
          cardImageUrl: character.cardImageStorageId
            ? ((await ctx.storage.getUrl(
              character.cardImageStorageId,
            )) as string)
            : character.cardImageUrl,
        })),
      ),
    };
  },
});

export const get = query({
  args: {
    id: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.id);
    if (character?.visibility !== "public") {
      const user = await getUser(ctx);
      if (character?.creatorId !== user._id) {
        throw new ConvexError({
          message: "You do not have permission to view this character.",
        });
      }
    }
    return {
      ...character,
      cardImageUrl: character?.cardImageStorageId
        ? ((await ctx.storage.getUrl(character.cardImageStorageId)) as string)
        : character?.cardImageUrl,
      bannerImageUrl: character?.bannerImageStorageId
        ? ((await ctx.storage.getUrl(character.bannerImageStorageId)) as string)
        : character?.bannerImageUrl,
    };
  },
});

export const getCharacter = internalQuery({
  args: {
    id: v.id("characters"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let character = await ctx.db.get(args.id);
    if (args.userId && character) {
      const customizations = await ctx.db
        .query("characterCustomizations")
        .withIndex("byUserId", (q) =>
          q.eq("userId", args.userId as Id<"users">),
        )
        .filter((q) => q.eq(q.field("characterId"), args.id))
        .unique();
      if (customizations) {
        character.model = customizations.model || character.model;
        character.voiceId = customizations.voiceId || character.voiceId;
        character.languageTag =
          customizations.languageTag || character.languageTag;
      }
    }
    return character;
  },
});

export const archive = mutation({
  args: {
    id: v.id("characters"),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const characterDraft = await ctx.db.get(args.id);
    if (characterDraft && user._id !== characterDraft.creatorId) {
      throw new ConvexError({
        message: "User does not have permission to modify this character.",
      });
    }
    return await ctx.db.patch(args.id, { isArchived: true });
  },
});

export const similarCharacters = action({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const embedding = await embedText(args.query);
    return await ctx.vectorSearch("characters", "byEmbedding", {
      vector: embedding[0] as number[],
      limit: 16,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx, args) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateInstruction = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    characterId: v.id("characters"),
  },
  handler: async (ctx, { name, description, characterId }) => {
    const user = await getUser(ctx);
    await ctx.scheduler.runAfter(0, internal.llm.generateInstruction, {
      userId: user._id,
      characterId,
      name,
      description,
    });
    const character = await ctx.db.get(characterId);
    return character?.instructions;
  },
});

export const autofill = internalMutation(
  async (
    ctx,
    {
      characterId,
      name,
      description,
      instructions,
      greeting,
    }: {
      characterId: Id<"characters">;
      name: string;
      description: string;
      instructions: string;
      greeting: string;
    },
  ) => {
    return await ctx.db.patch(characterId, {
      name,
      description,
      instructions,
      greetings: [greeting],
    });
  },
);

export const tag = internalMutation(
  async (
    ctx,
    {
      characterId,
      languageTag,
      genreTag,
      personalityTag,
      genderTag,
      isNSFW,
      isBlacklisted,
    }: {
      characterId: Id<"characters">;
      languageTag: string;
      genreTag: string;
      personalityTag: string;
      genderTag: string;
      isNSFW: boolean;
      isBlacklisted?: boolean;
    },
  ) => {
    return await ctx.db.patch(characterId, {
      languageTag,
      genreTag,
      personalityTag,
      genderTag,
      ...(isNSFW ? { isNSFW } : {}),
      ...(isBlacklisted ? { isBlacklisted } : {}),
    });
  },
);

export const generate = mutation({
  args: {},
  handler: async (ctx, { }) => {
    const user = await getUser(ctx);
    const updatedAt = new Date().toISOString();
    const character = await ctx.db.insert("characters", {
      creatorId: user._id,
      updatedAt,
      numChats: 0,
      isDraft: true,
      isArchived: false,
      isNSFW: false,
      isBlacklisted: false,
    });
    await ctx.scheduler.runAfter(0, internal.llm.generateCharacter, {
      userId: user._id,
      characterId: character,
    });
    return character;
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
    let query = ctx.db
      .query("characters")
      .withIndex("byScore", (q) => q.gt("score", 0))
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("isModel"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));

    if (user && user.nsfwPreference !== "allow") {
      query = query.filter((q) => q.neq(q.field("isNSFW"), true));
    }
    const popularCharacters = await query.order("desc").take(150);
    type TagCount = { [key: string]: number };
    type TagCounts = { [key: string]: TagCount };
    const tagCounts: TagCounts = popularCharacters.reduce(
      (acc: TagCounts, character) => {
        (
          [
            "genderTag",
            "genreTag",
            "languageTag",
            "personalityTag",
            "model",
          ] as const
        ).forEach((tag) => {
          const tagValue = character[tag];
          if (tagValue) {
            acc[tag] = acc[tag] || {};
            // @ts-ignore
            acc[tag][tagValue] = (acc[tag][tagValue] || 0) + 1;
          }
        });
        return acc;
      },
      {},
    );
    type MostFrequentTags = {
      [key: string]: { tagName: string; count: number }[];
    };
    const mostFrequentTags: MostFrequentTags = Object.keys(tagCounts).reduce(
      (acc: MostFrequentTags, tag) => {
        // @ts-ignore
        const sortedTags = Object.entries(tagCounts[tag])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([tagName, count]) => ({ tagName, count }));
        acc[tag] = sortedTags;
        return acc;
      },
      {},
    );

    return mostFrequentTags;
  },
});

export const scoreAll = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("characters")
      .withIndex("byUpdatedAt")
      .filter((q) => q.eq(q.field("isDraft"), false))
      .filter((q) => q.eq(q.field("isBlacklisted"), false))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .filter((q) => q.neq(q.field("isModel"), true))
      .filter((q) => q.neq(q.field("visibility"), "private"));
    const characters = await query.order("desc").take(1024);
    characters.forEach(async (character) => {
      const createdAt = character?._creationTime as number;
      const numChats = character?.numChats || 1;
      const numUsers = character?.numUsers || 1;
      await ctx.db.patch(character._id, {
        score:
          (numChats + numUsers * 5) /
          Math.pow(
            (new Date().getTime() - createdAt + 2 * 60 * 60 * 1000) /
            (7 * 24 * 60 * 60 * 1000),
            1.1,
          ),
        updatedAt: new Date().toISOString(),
      });
    });
  },
});

export const translate = mutation({
  args: { id: v.id("characters") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    const character = await ctx.db.get(args.id);
    const userLanguage =
      user.languageTag === "en"
        ? "en-US"
        : user.languageTag === "pt"
          ? "pt-PT"
          : user.languageTag;
    const existingTranslation = await ctx.db
      .query("translations")
      .withIndex("byLanguage", (q) => q.eq("languageTag", userLanguage))
      .filter((q) => q.eq(q.field("text"), character?.name))
      .first();
    if (userLanguage && !existingTranslation && userLanguage !== "en-US") {
      await ctx.scheduler.runAfter(0, internal.translate.string, {
        text: character?.name as string,
        targetLanguage: userLanguage,
      });
      await ctx.scheduler.runAfter(0, internal.translate.string, {
        text: character?.description as string,
        targetLanguage: userLanguage,
      });
    }
  },
});

export const removeOldCharacters = internalMutation({
  args: {},
  handler: async (ctx) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldCharacters = await ctx.db
      .query("characters")
      .withIndex("by_creation_time", (q) =>
        q.lt("_creationTime", weekAgo.getTime()),
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("isArchived"), true),
          q.eq(q.field("isBlacklisted"), true),
        ),
      )
      .take(4000);
    await Promise.all(
      oldCharacters.map((character) => ctx.db.delete(character._id)),
    );
    return { removed: oldCharacters.length };
  },
});
