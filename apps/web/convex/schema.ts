import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    chatId: v.id("chats"),
    characterId: v.optional(v.id("characters")),
    personaId: v.optional(v.id("personas")),
    text: v.string(),
    translation: v.optional(v.string()),
    reaction: v.optional(
      v.union(
        v.literal("like"),
        v.literal("dislike"),
        v.literal("lol"),
        v.literal("cry"),
        v.literal("smirk"),
      ),
    ),
    imageUrl: v.optional(v.string()),
    speechUrl: v.optional(v.string()),
  })
    .index("byCharacterId", ["characterId"])
    .index("byChatId", ["chatId"]),
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    gender: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("plus"))),
    primaryPersonaId: v.optional(v.id("personas")),
    crystals: v.optional(v.number()),
    tokenIdentifier: v.string(),
    languageTag: v.optional(v.string()),
    nsfwPreference: v.optional(
      v.union(v.literal("block"), v.literal("auto"), v.literal("allow")),
    ),
    isBanned: v.optional(v.boolean()),
    autoTranslate: v.optional(v.boolean()),
  })
    .index("byToken", ["tokenIdentifier"])
    .index("byEmail", ["email"]),
  characters: defineTable({
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    cardImageUrl: v.optional(v.string()),
    cardImageStorageId: v.optional(v.id("_storage")),
    bannerImageUrl: v.optional(v.string()),
    bannerImageStorageId: v.optional(v.id("_storage")),
    greetings: v.optional(v.array(v.string())),
    knowledge: v.optional(v.string()),
    capabilities: v.optional(v.array(v.string())),
    creatorId: v.id("users"),
    voiceId: v.optional(v.string()),
    remixId: v.optional(v.id("characters")),
    isDraft: v.boolean(),
    isBlacklisted: v.boolean(),
    isNSFW: v.optional(v.boolean()), // NSFW characters are filtered unless the adult user has explicitly opted in.
    isArchived: v.optional(v.boolean()),
    isModel: v.optional(v.boolean()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    numChats: v.optional(v.number()),
    numUsers: v.optional(v.number()),
    numSubscribers: v.optional(v.number()), // Number of subscribers to this character
    score: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    model: v.optional(v.string()),
    languageTag: v.optional(v.string()), // ISO 639 Set 1 two-letter language code
    genreTag: v.optional(v.string()), // Genre define the character's genre, it can be "Anime", "Game", "VTuber", "History", "Religion", "Language", "Animal", "Philosophy", "Assistant", anything.
    personalityTag: v.optional(v.string()), // These tags describe the character's personality traits. Examples include "Introverted," "Brave," "Cunning," "Compassionate," "Sarcastic," etc.
    roleTag: v.optional(v.string()),
    genderTag: v.optional(v.string()),
    age: v.optional(v.number()),
    updatedAt: v.string(),
  })
    .index("byUserId", ["creatorId"])
    .index("byNumChats", ["numChats"])
    .index("byScore", ["score"])
    .index("byUpdatedAt", ["updatedAt"])
    .index("byLanguage", ["languageTag"])
    .index("byGenre", ["genreTag"])
    .index("byPersonality", ["personalityTag"])
    .index("byGender", ["genderTag"])
    .index("byCardImageUrl", ["cardImageUrl"])
    .vectorIndex("byEmbedding", {
      vectorField: "embedding",
      dimensions: 512,
      filterFields: ["name", "description", "instructions"],
    })
    .searchIndex("searchName", {
      searchField: "name",
    }),
  personas: defineTable({
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    cardImageUrl: v.optional(v.string()),
    cardImageStorageId: v.optional(v.id("_storage")),
    isPrivate: v.boolean(),
    isBlacklisted: v.boolean(),
    creatorId: v.id("users"),
    updatedAt: v.string(),
  }).index("byUserId", ["creatorId"]),
  characterCustomizations: defineTable({
    characterId: v.id("characters"),
    model: v.optional(v.string()),
    voiceId: v.optional(v.string()),
    languageTag: v.optional(v.string()),
    userId: v.id("users"),
  })
    .index("byCharacterId", ["characterId"])
    .index("byUserId", ["userId"]),
  chats: defineTable({
    chatName: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    storyId: v.optional(v.id("stories")),
    tokenIdentifier: v.optional(v.string()),
    isUnlocked: v.optional(v.boolean()),
    characterId: v.optional(v.id("characters")),
    joinedAt: v.optional(v.string()),
  })
    .index("byUserId", ["userId"])
    .index("byCharacterId", ["characterId"])
    .index("byUpdatedAt", ["updatedAt"]),
  followUps: defineTable({
    chatId: v.optional(v.id("chats")),
    followUp1: v.optional(v.string()),
    followUp2: v.optional(v.string()),
    followUp3: v.optional(v.string()),
    followUp4: v.optional(v.string()),
    chosen: v.optional(v.string()),
    query: v.optional(v.string()),
    instruction: v.optional(v.string()),
    isStale: v.optional(v.boolean()),
  }).index("byChatId", ["chatId"]),
  userFacts: defineTable({
    userId: v.id("users"),
    characterId: v.id("characters"),
    fact: v.string(),
    category: v.optional(v.string()),
  })
    .index("byUserAndCharacter", ["userId", "characterId"]),
  usage: defineTable({
    userId: v.id("users"),
    name: v.string(),
  }).index("byUserId", ["userId"]),
  payments: defineTable({
    numCrystals: v.number(),
    stripeId: v.optional(v.string()),
    subscriptionId: v.optional(v.string()),
    productName: v.optional(v.string()),
    cancelsAt: v.optional(v.string()),
    userId: v.id("users"),
    isPurchased: v.optional(v.boolean()),
  })
    .index("bySubscriptionId", ["subscriptionId"])
    .index("byStripeId", ["stripeId"])
    .index("byUserId", ["userId"]),
  checkIn: defineTable({
    userId: v.id("users"),
    date: v.string(),
  })
    .index("byUserId", ["userId"])
    .index("byDate", ["date"]),
  stories: defineTable({
    userId: v.id("users"),
    characterId: v.id("characters"),
    messageIds: v.array(v.id("messages")),
    name: v.optional(v.string()),
    numChats: v.optional(v.number()),
    isPrivate: v.boolean(),
    isNSFW: v.optional(v.boolean()),
  })
    .index("byUserId", ["userId"])
    .index("byNumChats", ["numChats"])
    .index("byCharacterId", ["characterId"]),
  regeneratedMessages: defineTable({
    messageId: v.id("messages"),
    query: v.optional(v.string()),
    rejectedMessage: v.optional(v.string()),
    regeneratedMessage: v.optional(v.string()),
  }),
  messageReaction: defineTable({
    messageId: v.id("messages"),
    text: v.optional(v.string()),
    type: v.union(
      v.literal("like"),
      v.literal("dislike"),
      v.literal("lol"),
      v.literal("cry"),
      v.literal("smirk"),
    ),
  }).index("byMessageId", ["messageId"]),
  images: defineTable({
    title: v.optional(v.string()),
    prompt: v.string(),
    model: v.string(),
    imageUrl: v.string(),
    referenceImage: v.optional(v.string()),
    creatorId: v.id("users"),
    numLikes: v.number(),
    tag: v.optional(v.string()),
    isBlacklisted: v.boolean(),
    isNSFW: v.boolean(), // NSFW characters are filtered unless the adult user has explicitly opted in.
    isPrivate: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
  })
    .index("byUserId", ["creatorId"])
    .index("byLikes", ["numLikes"]),
  imageLikes: defineTable({
    imageId: v.id("images"),
    userId: v.id("users"),
  })
    .index("byImageId", ["imageId"])
    .index("byUserId", ["userId"]),
  speeches: defineTable({
    text: v.string(),
    voiceId: v.string(),
    speechUrl: v.optional(v.string()),
  }).index("byVoiceId", ["voiceId"]),
  models: defineTable({
    value: v.string(),
    description: v.string(),
    crystalPrice: v.number(),
    src: v.string(),
    alt: v.string(),
  }),
  translations: defineTable({
    text: v.string(),
    translation: v.string(),
    languageTag: v.string(),
  })
    .index("byLanguage", ["languageTag"])
    .index("byText", ["text", "languageTag"]),
  hides: defineTable({
    type: v.string(),
    userId: v.id("users"),
    elementId: v.string(),
  })
    .index("byUserId", ["userId"])
    .index("byType", ["type"]),
  posts: defineTable({
    authorId: v.id("characters"), // The AI character/creator who owns this post
    mediaUrl: v.string(), // URL to image or video
    mediaType: v.union(v.literal("image"), v.literal("video")),
    caption: v.string(),
    likesCount: v.number(),
    isLocked: v.boolean(), // Paywall status
    format: v.union(v.literal("feed"), v.literal("short")), // Normal post vs vertical video
    isNSFW: v.boolean(),
  })
    .index("byAuthorId", ["authorId"])
    .index("byFormat", ["format"]),
  promoBanners: defineTable({
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    imageUrl: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    linkUrl: v.optional(v.string()),
    isActive: v.boolean(),
    sortOrder: v.number(),
  })
    .index("byActive", ["isActive"])
    .index("bySortOrder", ["sortOrder"]),
  postLikes: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
  })
    .index("byPostId", ["postId"])
    .index("byUserId", ["userId"])
    .index("byPostAndUser", ["postId", "userId"]),
});
