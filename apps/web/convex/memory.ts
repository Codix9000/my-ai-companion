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
 * Uses the default model (DEFAULT_MODEL) to keep things consistent (especially for sensitive content).
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

      // Simple, robust extraction prompt designed for creative/roleplay models
      // Instead of asking for JSON, we ask for a simple line-by-line list
      const extractionPrompt = `Read the user's messages below and list any personal facts about them.
Write each fact on its own line starting with "FACT:" 
Only include concrete facts (name, age, job, likes, dislikes, pets, hobbies, relationships, location, etc).
If there are no personal facts, write "NONE"

${existingFactStrings.length > 0 ? `Already known (skip these):\n${existingFactStrings.map((f: string) => `- ${f}`).join("\n")}\n\n` : ""}User's messages:
${userMessages}`;

      const response = await openai.chat.completions.create({
        model,
        stream: false,
        messages: [
          { role: "user", content: extractionPrompt },
        ],
        max_tokens: 200,
      });

      const content = response?.choices?.[0]?.message?.content?.trim();
      console.log("Fact extraction raw response:", content);
      if (!content || content.toUpperCase().includes("NONE")) return;

      // Parse line-by-line FACT: format (much more robust than JSON for creative models)
      let newFacts: string[] = [];
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        // Match lines starting with "FACT:" or "- " or numbered lists
        let fact = "";
        if (trimmed.toUpperCase().startsWith("FACT:")) {
          fact = trimmed.substring(5).trim();
        } else if (trimmed.startsWith("- ")) {
          fact = trimmed.substring(2).trim();
        } else if (/^\d+[\.\)]\s/.test(trimmed)) {
          fact = trimmed.replace(/^\d+[\.\)]\s*/, "").trim();
        }
        if (fact && fact.length > 5 && fact.length < 200) {
          newFacts.push(fact);
        }
      }

      if (newFacts.length === 0) return;

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
