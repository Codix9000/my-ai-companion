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
 * Mutation: Update the text of an existing fact.
 */
export const updateFact = internalMutation({
  args: {
    factId: v.id("userFacts"),
    fact: v.string(),
  },
  handler: async (ctx, { factId, fact }) => {
    const existing = await ctx.db.get(factId);
    if (!existing) return;
    await ctx.db.patch(factId, { fact });
  },
});

/**
 * Mutation: Delete a fact by ID.
 */
export const deleteFact = internalMutation({
  args: {
    factId: v.id("userFacts"),
  },
  handler: async (ctx, { factId }) => {
    const existing = await ctx.db.get(factId);
    if (!existing) return;
    await ctx.db.delete(factId);
  },
});

/**
 * Action: Smart CRUD memory manager.
 * Runs as a background job after each AI response.
 * Uses JSON mode to ADD, UPDATE, or DELETE facts — preventing bloat and contradictions.
 */
export const extractFacts = internalAction({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
    chatId: v.id("chats"),
  },
  handler: async (ctx, { userId, characterId, chatId }) => {
    try {
      const recentMessages = await ctx.runQuery(internal.llm.getMessages, {
        chatId,
        take: 12,
      });

      if (!recentMessages || recentMessages.length < 2) return;

      const chatHistory = recentMessages
        .filter((m: any) => m.text && m.text.trim().length > 0)
        .map((m: any) => (m.characterId ? `AI: ${m.text}` : `User: ${m.text}`))
        .join("\n");

      if (!chatHistory || chatHistory.trim().length < 10) return;

      const existingFacts = await ctx.runQuery(internal.memory.getUserFacts, {
        userId,
        characterId,
      });

      const model = DEFAULT_MODEL;
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({ baseURL, apiKey });

      const extractionPrompt = `You are an AI Memory Manager for a roleplay companion app. Your job is to maintain a highly accurate, concise, and up-to-date profile of the User.
You will be provided with the CURRENT known facts about the user (each with an ID) and a RECENT conversation transcript.

Your goal is to output a JSON object containing three arrays: "add", "update", and "delete".

CRITICAL RULES:
1. CONSOLIDATE & UPDATE: If the user provides new information that supersedes an old fact (e.g., they got a new job, or finished a trip), use the "update" array to rewrite the existing fact.
2. DELETE OUTDATED/TEMPORARY INFO: If an existing fact is temporary (e.g., "User is drinking coffee", "User is having a bad day") or no longer true, add its ID to the "delete" array.
3. ADD ONLY PERMANENT INFO: Only "add" new facts if they are permanent, long-term traits (name, age, family, career, core hobbies, major life events) and DO NOT overlap with existing facts.
4. IGNORE THE AI: NEVER extract facts about the AI's life or backstory. Only focus on the User.

CURRENT FACTS:
${existingFacts.length > 0 ? JSON.stringify(existingFacts.map((f: any) => ({ id: f._id, fact: f.fact }))) : "[]"}

RECENT TRANSCRIPT:
${chatHistory}

You must return EXACTLY this JSON structure:
{
  "add": ["New permanent fact 1", "New permanent fact 2"],
  "update": [
    { "id": "fact_id_here", "fact": "Updated fact text incorporating new info" }
  ],
  "delete": ["fact_id_to_delete_1", "fact_id_to_delete_2"]
}
If no changes are needed, return empty arrays: {"add":[],"update":[],"delete":[]}`;

      const response = await openai.chat.completions.create({
        model,
        stream: false,
        messages: [
          { role: "system", content: extractionPrompt },
          { role: "user", content: "Analyze the transcript and return the JSON." },
        ],
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: "json_object" },
      } as any);

      const content = response?.choices?.[0]?.message?.content?.trim();
      console.log("[Memory] Raw extraction response:", content);

      if (!content) return;

      let parsed: { add?: string[]; update?: { id: string; fact: string }[]; delete?: string[] };
      try {
        parsed = JSON.parse(content);
      } catch (parseErr) {
        console.error("[Memory] Failed to parse JSON response:", parseErr);
        return;
      }

      const validFactIds = new Set(existingFacts.map((f: any) => f._id as string));

      // Process deletes
      if (Array.isArray(parsed.delete)) {
        for (const factId of parsed.delete) {
          if (typeof factId === "string" && validFactIds.has(factId)) {
            try {
              await ctx.runMutation(internal.memory.deleteFact, {
                factId: factId as any,
              });
              console.log("[Memory] Deleted fact:", factId);
            } catch (err) {
              console.error("[Memory] Failed to delete fact:", factId, err);
            }
          }
        }
      }

      // Process updates
      if (Array.isArray(parsed.update)) {
        for (const entry of parsed.update) {
          if (
            entry &&
            typeof entry.id === "string" &&
            typeof entry.fact === "string" &&
            entry.fact.trim().length > 3 &&
            validFactIds.has(entry.id)
          ) {
            try {
              await ctx.runMutation(internal.memory.updateFact, {
                factId: entry.id as any,
                fact: entry.fact.trim(),
              });
              console.log("[Memory] Updated fact:", entry.id, "→", entry.fact);
            } catch (err) {
              console.error("[Memory] Failed to update fact:", entry.id, err);
            }
          }
        }
      }

      // Process adds
      if (Array.isArray(parsed.add)) {
        for (const fact of parsed.add) {
          if (
            typeof fact === "string" &&
            fact.trim().length > 3 &&
            fact.trim().length < 300
          ) {
            const isDuplicate = existingFacts.some(
              (existing: any) =>
                (existing.fact as string).toLowerCase() === fact.trim().toLowerCase()
            );
            if (!isDuplicate) {
              try {
                await ctx.runMutation(internal.memory.insertFact, {
                  userId,
                  characterId,
                  fact: fact.trim(),
                });
                console.log("[Memory] Added fact:", fact.trim());
              } catch (err) {
                console.error("[Memory] Failed to add fact:", fact, err);
              }
            }
          }
        }
      }

      const addCount = parsed.add?.length ?? 0;
      const updateCount = parsed.update?.length ?? 0;
      const deleteCount = parsed.delete?.length ?? 0;
      console.log(`[Memory] Done. Added: ${addCount}, Updated: ${updateCount}, Deleted: ${deleteCount}`);
    } catch (error) {
      // Memory extraction is non-critical — never let it crash the chat flow
      console.error("[Memory] Fact extraction failed (non-critical):", error);
    }
  },
});
