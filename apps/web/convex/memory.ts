import { v } from "convex/values";
import OpenAI from "openai";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { DEFAULT_MODEL, getAPIKey, getBaseURL } from "./constants";

/**
 * Query: Get all facts for a specific user-character pair.
 * Memory is per character-user pair — characters don't share knowledge.
 */
export const getUserFacts = internalQuery({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, { userId, characterId }) => {
    const facts = await ctx.db
      .query("userFacts")
      .withIndex("byUserAndCharacter", (q) =>
        q.eq("userId", userId).eq("characterId", characterId)
      )
      .collect();
    return facts;
  },
});

/**
 * Mutation: Insert a single fact into the database.
 */
export const insertFact = internalMutation({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
    fact: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { userId, characterId, fact, category }) => {
    await ctx.db.insert("userFacts", {
      userId,
      characterId,
      fact,
      category,
    });
  },
});

/**
 * Action: Extract personal facts from recent messages using the same LLM model.
 * Runs as a background job after each AI response.
 * Uses the same DeepInfra/MythoMax model to keep things consistent (especially for sensitive content).
 */
export const extractFacts = internalAction({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
    chatId: v.id("chats"),
  },
  handler: async (ctx, { userId, characterId, chatId }) => {
    try {
      // Get the last 6 messages from this chat for context
      const recentMessages = await ctx.runQuery(internal.llm.getMessages, {
        chatId,
        take: 6,
      });

      if (!recentMessages || recentMessages.length < 2) return;

      // Only look at user messages (no characterId = user message)
      const userMessages = recentMessages
        .filter((m: any) => !m.characterId)
        .map((m: any) => m.text)
        .join("\n");

      if (!userMessages || userMessages.trim().length < 10) return;

      // Get existing facts to avoid duplicates
      const existingFacts = await ctx.runQuery(internal.memory.getUserFacts, {
        userId,
        characterId,
      });
      const existingFactStrings = existingFacts.map((f: any) => f.fact as string);

      // Use the same model for extraction (consistent with sensitive content)
      const model = DEFAULT_MODEL;
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({ baseURL, apiKey });

      const extractionPrompt = `You are a fact extraction assistant. Your job is to extract personal facts about the USER from their messages in a conversation.

${existingFactStrings.length > 0 ? `Facts already known (DO NOT repeat these):\n${existingFactStrings.map((f: string) => `- ${f}`).join("\n")}\n` : ""}
From the user's messages below, extract any NEW personal facts. Focus on:
- Personal details (name, age, location, job, hobbies)
- Preferences (likes, dislikes, favorites)
- Relationships (family, friends, pets)
- Emotional state or important life events
- Anything they explicitly share about themselves

User's recent messages:
${userMessages}

Respond ONLY with a JSON array of fact strings. If no new facts found, respond with [].
Example: ["User has a dog named Buster", "User works as a software engineer", "User dislikes mushrooms"]`;

      const response = await openai.chat.completions.create({
        model,
        stream: false,
        messages: [
          { role: "system", content: "You extract personal facts from conversations. Respond ONLY with valid JSON arrays." },
          { role: "user", content: extractionPrompt },
        ],
        max_tokens: 256,
      });

      const content = response?.choices?.[0]?.message?.content?.trim();
      if (!content) return;

      // Parse the JSON response
      let newFacts: string[] = [];
      try {
        // Handle cases where the model wraps in markdown code blocks
        const jsonString = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        newFacts = JSON.parse(jsonString);
      } catch {
        // If JSON parsing fails, skip this extraction round
        console.log("Failed to parse facts JSON, skipping:", content);
        return;
      }

      if (!Array.isArray(newFacts) || newFacts.length === 0) return;

      // Store each new fact (deduplicated against existing)
      for (const fact of newFacts) {
        if (
          typeof fact === "string" &&
          fact.trim().length > 3 &&
          !existingFactStrings.some(
            (existing: string) =>
              existing.toLowerCase() === fact.toLowerCase()
          )
        ) {
          await ctx.runMutation(internal.memory.insertFact, {
            userId,
            characterId,
            fact: fact.trim(),
          });
        }
      }

      console.log(`Extracted ${newFacts.length} new facts for user-character pair`);
    } catch (error) {
      // Memory extraction is non-critical — never let it crash the chat flow
      console.error("Fact extraction failed (non-critical):", error);
    }
  },
});
