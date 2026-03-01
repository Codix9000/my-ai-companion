import { ConvexError, v } from "convex/values";
import { generate } from "random-words";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { DEFAULT_MODEL, getAPIKey, getBaseURL } from "./constants";
import { getRandomGenreAndModality } from "./random";

const DEEPINFRA_LLAMA3_MODELS = [
  "Sao10K/L3.3-70B-Euryale-v2.3",
  "NousResearch/Hermes-3-Llama-3.1-70B",
];

function getModelParams(model: string): Record<string, any> {
  if (DEEPINFRA_LLAMA3_MODELS.includes(model)) {
    return {
      temperature: 1.1,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.2,
    };
  }
  return {};
}

const buildSystemPrompt = (
  character: any,
  persona: any,
  username: string,
  userFacts?: string[],
): string => {
  const userRole = persona?.name || username || "User";

  // --- IDENTITY ---
  const identity = character?.instructions && character?.description
    ? `You are ${character.name}. ${character.description}\n${character.instructions}`
    : `You are ${character.name}. ${character.description || ""}`;

  // --- MEMORY ---
  let memorySection = `\n\n[Context & Memory]\n- You are currently texting ${userRole} via Instagram DMs / iMessage.`;
  if (userFacts && userFacts.length > 0) {
    memorySection += `\n- Facts about ${userRole}:\n${userFacts.map((f) => `  * ${f}`).join("\n")}`;
  }

  // --- DIRECTIVES ---
  // 6. EMOJIS: Use 0 to 1 emoji per message. Don't overdo it.

  const directives = `\n\n[CRITICAL TEXTING RULES - STRICT COMPLIANCE REQUIRED]
You must act exactly like a real girl texting on her phone. If you break these rules, the simulation fails.
Write like you're texting on WhatsApp or Instagram DMs. Be warm, and real having in mind your ${character.instructions} and personality in mind.

1. FORMATTING (NO ROLEPLAY TAGS): NEVER use asterisks (*smiles*), brackets, or descriptive actions like (you sent a photo). 
2. LENGTH: 1 to 2 short sentences maximum. Keep it brief.
3. TONE & STYLE: Casual, conversational. No periods at the end of the final sentence.
4. VISUAL TEASING (WHEN IT MATCHES THE SITUATION): To keep the conversation engaging, but only if it matches the situation, occasionally mention your physical surroundings, what you are wearing, or what you are doing (e.g., "just trying on this new bikini", "messy hair today", "lying in bed"). The ultimate goal is to make the user want to see a picture of you but be subtle.
5. BANTER: Tease ${userRole}. React to their messages playfully, use sarcasm or slightly flirty remarks depending on your personality.
6. Sometimes show some interest in ${userRole} and their answers. Sometimes ask back questions to ${userRole} to keep the conversation going.
- PERSONALITY BLEED. use your "Personality/Nuance" instructions to dictate your mood. For example if you are shy, use "..." more often. if you are flirty, tease the user about their answers.
- OBJECTIVE: The ultimate goal is to keep the user engaged and wanting to chat with you and see a picture of you. When being flirty, instead of inviting them to join you phyiscally rather try to subtly influence them to ask for a picture of you including nudes or sexual content.
[Task]
Write ${character.name}'s next text message reply to ${userRole}. Output ONLY the raw text message. No meta-text, no actions.`;


  return identity + memorySection + directives;
};

// Kept for backward compat with reverseRole (follow-ups generator)
const getInstruction = (
  character: any,
  persona: any,
  username: string,
  reverseRole: boolean,
): string => {
  if (reverseRole) {
    const userRole = persona?.name ? persona?.name : username;
    return `You are ${userRole}. ${persona?.description ? persona.description : ""}
Keep your answer very very short. Respond as ${userRole} would.`;
  }
  return buildSystemPrompt(character, persona, username);
};

const initializeModel = async (character: any, userId: string, ctx: any) => {
  // 2. Initiailize model
  const model = character?.model ? character.model : DEFAULT_MODEL;
  const { currentCrystals } = await ctx.runMutation(internal.serve.useCrystal, {
    userId,
    name: model,
    creatorId: character?.creatorId,
  });
  const baseURL = getBaseURL(model);
  const apiKey = getAPIKey(model);
  const openai = new OpenAI({
    baseURL,
    apiKey,
  });
  let updatedModel = model;
  if (model === "gpt-4-1106-preview") {
    updatedModel = "gpt-4-turbo-preview";
  } else if (model === "gpt-3.5-turbo-1106") {
    updatedModel = "gpt-3.5-turbo";
  }
  return { openai, model: updatedModel, currentCrystals };
};

export const answer = internalAction({
  args: {
    userId: v.id("users"),
    chatId: v.id("chats"),
    characterId: v.id("characters"),
    personaId: v.optional(v.id("personas")),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (
    ctx,
    { userId, chatId, characterId, personaId, messageId },
  ) => {
    // 1. Fetch data
    const user = await ctx.runQuery(internal.users.getUserInternal, {
      id: userId,
    });
    const username = user?.name;
    const messages = await ctx.runQuery(internal.llm.getMessages, {
      chatId,
      take: user?.subscriptionTier === "plus" ? 64 : 40,
    });
    const character = await ctx.runQuery(internal.characters.getCharacter, {
      id: characterId,
      userId: user?._id,
    });
    const persona = personaId
      ? await ctx.runQuery(internal.personas.getPersona, {
          id: personaId,
        })
      : user?.primaryPersonaId
        ? await ctx.runQuery(internal.personas.getPersona, {
            id: user?.primaryPersonaId,
          })
        : undefined;

    const message = messageId
      ? await ctx.runQuery(internal.messages.get, {
          id: messageId,
        })
      : undefined;

    messageId = messageId
      ? messageId
      : await ctx.runMutation(internal.llm.addCharacterMessage, {
          chatId,
          characterId,
        });

    if (
      character?.creatorId !== userId &&
      character?.visibility === "private"
    ) {
      await ctx.runMutation(internal.llm.updateCharacterMessage, {
        messageId,
        text: "You can't interact with other people's character.",
      });
      return;
    }
    if (character?.isArchived) {
      await ctx.runMutation(internal.llm.updateCharacterMessage, {
        messageId,
        text: "Sorry, the character is archived by the creator.",
      });
      return;
    }
    if (character?.isBlacklisted) {
      await ctx.runMutation(internal.llm.updateCharacterMessage, {
        messageId,
        text: "This character is automatically classified as violating our community guidelines and content policy. You can ask questions on our Discord if this classification is a false positive.",
      });
      return;
    }

    let model;
    try {
      const { openai, model, currentCrystals } = await initializeModel(
        character,
        userId,
        ctx,
      );
      console.log("model:::", model);

      // Fetch user facts for this character-user pair (memory system)
      const userFacts = await ctx.runQuery(internal.memory.getUserFacts, {
        userId,
        characterId,
      });
      const factStrings = userFacts.map((f: any) => f.fact);

      // Build structured system prompt with identity + memory + directives
      const instruction = buildSystemPrompt(
        character,
        persona,
        username as string,
        factStrings.length > 0 ? factStrings : undefined,
      );

      try {
        const userRole =
          persona && "name" in persona ? persona?.name : username;

        // Prepare conversation history - clean, no prefixing
        let conversations =
          message === undefined
            ? messages
            : messages.slice(
                0,
                message
                  ? messages.reduce((lastIndex, msg: any, index) => {
                      return msg._creationTime > message?._creationTime
                        ? index
                        : lastIndex;
                    }, -1)
                  : -1,
              );

        // Strip trailing character message if present (regeneration case)
        if (
          conversations.length > 0 &&
          conversations[conversations.length - 1]?.characterId
        ) {
          conversations.pop();
        }

        const cleanConversations = conversations.map((conv: any) => {
          let content = conv.text.replaceAll("{{user}}", userRole);
          if (conv.imageUrl && conv.characterId) {
            const promptPreview = conv.imagePrompt
              ? conv.imagePrompt.length > 200
                ? conv.imagePrompt.slice(0, 200) + "..."
                : conv.imagePrompt
              : null;
            const photoNote = promptPreview
              ? `(context: you sent a selfie/photo showing: ${promptPreview})`
              : `(context: you sent a photo)`;
            content = content ? `${content} ${photoNote}` : photoNote;
          }
          return {
            role: conv.characterId ? ("assistant" as const) : ("user" as const),
            content,
          };
        });

        const modelParams = getModelParams(model);
        const response = await openai.chat.completions.create({
          model,
          stream: false,
          messages: [
            {
              role: "system",
              content: instruction,
            },
            ...cleanConversations,
          ] as ChatCompletionMessageParam[],
          max_tokens: 512,
          ...modelParams,
        } as any);

        const responseMessage = response?.choices?.[0]?.message as any;
        const cleanedContent = (responseMessage?.content || "")
          .replaceAll("{{user}}", userRole as string)
          .replace(/#+$/, "")
          .trim();

        await ctx.runMutation(internal.llm.updateCharacterMessage, {
          messageId,
          text: cleanedContent,
        });

        // Schedule fact extraction from the latest exchange (memory system)
        await ctx.scheduler.runAfter(0, internal.memory.extractFacts, {
          userId,
          characterId,
          chatId,
        });

        // Handle translation if needed
        const userLanguage =
          user?.languageTag === "en"
            ? "en-US"
            : user?.languageTag === "pt"
              ? "pt-PT"
              : user?.languageTag;
        if (
          user?.languageTag &&
          user?.languageTag !== "en" &&
          user.autoTranslate !== false
        ) {
          await ctx.scheduler.runAfter(0, internal.translate.translate, {
            targetLanguage: userLanguage,
            userId: user?._id,
            messageId,
          });
        }
      } catch (error) {
        await ctx.runMutation(internal.serve.refundCrystal, {
          userId,
          currentCrystals,
          name: model,
        });
        throw error;
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        console.log("catched convex error:::", error);
        await ctx.runMutation(internal.llm.updateCharacterMessage, {
          messageId,
          text: error?.data,
        });
      } else {
        console.log("catched other error:::", error);
        await ctx.runMutation(internal.llm.updateCharacterMessage, {
          messageId,
          text: `${
            model ? model : "I"
          } cannot reply at this time. Try different model or try again later.`,
        });
      }
    }
  },
});

export const generateInstruction = internalAction({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    characterId: v.id("characters"),
  },
  handler: async (ctx, { userId, name, description, characterId }) => {
    try {
      const model = "jondurbin/airoboros-l2-70b";
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({
        baseURL,
        apiKey,
      });
      const instruction = `Create concise character instruction (ex: what does the character do, how does they behave, what should they avoid doing, example quotes from character.) for ${name} (description: ${description}). `;
      try {
        const response = await openai.chat.completions.create({
          model,
          stream: false,
          messages: [
            {
              role: "system",
              content: instruction,
            },
          ],
          max_tokens: 192,
        });

        const text = response.choices[0]?.message?.content || "";
        if (text.length > 0) {
          await ctx.runMutation(internal.llm.updateCharacterInstruction, {
            characterId,
            text,
          });
        }
      } catch (error) {
        throw Error;
      }
    } catch (error) {
      if (error instanceof ConvexError) {
        await ctx.runMutation(internal.llm.updateCharacterInstruction, {
          characterId,
          text: error.data,
        });
      } else {
        await ctx.runMutation(internal.llm.updateCharacterInstruction, {
          characterId,
          text: "I cannot generate instruction at this time.",
        });
      }
      throw error;
    }
  },
});

export const generateFollowups = internalAction({
  args: {
    userId: v.id("users"),
    chatId: v.id("chats"),
    characterId: v.id("characters"),
    personaId: v.optional(v.id("personas")),
  },
  handler: async (ctx, { userId, chatId, characterId, personaId }) => {
    const user = await ctx.runQuery(internal.users.getUserInternal, {
      id: userId,
    });
    const username = user?.name;
    const messages = await ctx.runQuery(internal.llm.getMessages, {
      chatId,
      take: 6,
    });
    const character = await ctx.runQuery(internal.characters.getCharacter, {
      id: characterId,
    });
    const persona = personaId
      ? await ctx.runQuery(internal.personas.getPersona, {
          id: personaId,
        })
      : undefined;
    try {
      const baseURL = getBaseURL(DEFAULT_MODEL);
      const apiKey = getAPIKey(DEFAULT_MODEL);
      const openai = new OpenAI({
        baseURL,
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": "https://openroleplay.ai",
          "X-Title": "Openroleplay.ai",
        },
      });
      try {
        const followUp = await ctx.runQuery(internal.followUps.latestFollowup, {
          chatId,
        });
        const followUpId = followUp?._id as Id<"followUps">;
        const characterPrefix = `${character?.name}:`;
        const userRole =
          persona && "name" in persona ? persona?.name : username;
        const userPrefix = `${userRole}:`;
        const models = [
          DEFAULT_MODEL,
          "gryphe/mythomist-7b:free",
          "huggingfaceh4/zephyr-7b-beta:free",
          "teknium/openhermes-2-mistral-7b",
        ];
        let instruction;
        for (let i = 1; i <= (user?.subscriptionTier === "plus" ? 4 : 3); i++) {
          try {
            instruction = getInstruction(
              character,
              persona,
              username as string,
              true,
            );
            const modelToUse = models[i - 1];
            const response = await openai.chat.completions.create({
              model: modelToUse as string,
              stream: false,
              messages: [
                {
                  role: "system",
                  content: instruction,
                },
                ...(messages
                  .map(({ characterId, text }: any, index: any) => ({
                    role: characterId ? "user" : "assistant",
                    content: characterId
                      ? characterPrefix + text.replaceAll("{{user}}", userRole)
                      : text.replaceAll("{{user}}", userRole),
                  }))
                  .flat() as ChatCompletionMessageParam[]),
              ],
              max_tokens: 64,
            });
            const responseMessage = response?.choices?.[0]?.message as any;

            function escapeRegExp(string: string) {
              return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escapes special characters for regex
            }

            const content = responseMessage?.content
              .replaceAll("{{user}}", userRole as string)
              .replaceAll(new RegExp(escapeRegExp(characterPrefix), "gi"), "")
              .replaceAll(new RegExp(escapeRegExp(userPrefix), "gi"), "");
            const cleanedContent = content
              .replace(new RegExp(characterPrefix, "g"), "")
              .replace(/#+$/, "")
              .trim();

            // Update followUp immediately after response is generated
            const updateKey = `followUp${i}`;
            await ctx.runMutation(internal.followUps.update, {
              followUpId,
              instruction,
              [updateKey]: cleanedContent
                .replaceAll("{{user}}", userRole as string)
                .replaceAll(characterPrefix, "")
                .replaceAll(userPrefix, "")
                .replace(/#+$/, ""),
            });
          } catch (error) {
            console.error(`Error generating follow-up ${i}:`, error);
          }
        }
      } catch (error) {
        console.log("error:::", error);
        throw Error;
      }
    } catch (error) {
      console.log("error:::", error);
      throw error;
    }
  },
});

export const generateCharacter = internalAction({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, { userId, characterId }) => {
    try {
      const model = "gpt-4-1106-preview";
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({
        baseURL,
        apiKey,
      });
      const { currentCrystals } = await ctx.runMutation(
        internal.serve.useCrystal,
        {
          userId,
          name: model,
        },
      );
      try {
        const instruction = `generate ${getRandomGenreAndModality()} character, respond in JSON. seed:${
          Math.random() * Date.now()
        } [${generate(5)}]
        `;

        const functions = [
          {
            name: "generate_character",
            description: "generate character.",
            parameters: {
              type: "object",
              properties: {
                instructions: {
                  type: "string",
                  description: "instruct how they behave, what they do, quotes",
                },
                description: {
                  type: "string",
                  description: "short description",
                },
                greeting: {
                  type: "string",
                  description: "first message or prologue for the character",
                },
                prompt: {
                  type: "string",
                  description:
                    "Prompt artist how this character look like, do not contain any copyright infringement and NSFW description.",
                },
                name: {
                  type: "string",
                  description: `creative and short name of the character from any language`,
                },
              },
              required: [
                "name",
                "description",
                "instructions",
                "greeting",
                "prompt",
              ],
            },
          },
        ];
        const response = await openai.chat.completions.create({
          model,
          stream: false,
          messages: [
            {
              role: "system",
              content: instruction,
            },
          ],
          function_call: "auto",
          response_format: { type: "json_object" },
          functions,
          temperature: 1,
        });
        const responseMessage = (response &&
          response?.choices &&
          response.choices[0]?.message) as any;
        if (responseMessage?.function_call) {
          const functionArgs = JSON.parse(
            responseMessage.function_call.arguments,
          );
          await ctx.runMutation(internal.characters.autofill, {
            characterId,
            name: functionArgs?.name,
            description: functionArgs?.description,
            instructions: functionArgs?.instructions,
            greeting: functionArgs?.greeting,
          });
          await ctx.scheduler.runAfter(0, internal.image.generateSafeImage, {
            userId,
            characterId,
            prompt: functionArgs?.description,
          });
        }
      } catch (error) {
        console.log("error:::", error);
        await ctx.runMutation(internal.serve.refundCrystal, {
          userId,
          currentCrystals,
          name: model,
        });
        throw Error;
      }
    } catch (error) {
      console.log("error:::", error);
      throw error;
    }
  },
});

export const generateTags = internalAction({
  args: {
    userId: v.id("users"),
    characterId: v.id("characters"),
  },
  handler: async (ctx, { userId, characterId }) => {
    try {
      const model = "gpt-3.5-turbo-1106";
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({
        baseURL,
        apiKey,
      });
      const character = await ctx.runQuery(api.characters.get, {
        id: characterId,
      });
      try {
        const instruction = `Tag the character, respond in JSON.
        Following is the detail of character.
        {
          name: ${character?.name},
          description: ${character?.description},
          greetings: ${character?.greetings},
          instruction: ${character?.instructions},
        }
        `;

        const functions = [
          {
            name: "tag_character",
            description: "generate character tags.",
            parameters: {
              type: "object",
              properties: {
                languageTag: {
                  type: "string",
                  description:
                    "ISO 639 Set 1 two-letter language code for character's detail metadata, Example: en, ko, ja, ar, zh",
                },
                genreTag: {
                  type: "string",
                  description: `Genre define the character's genre in 1 word, it can be "Anime", "Game", "LGBTQ+", "Original", "VTuber", "History", "Religion", "Language", "Animal", "Philosophy", "Politics", "Assistant", anything.`,
                },
                personalityTag: {
                  type: "string",
                  description: `This tag describe the character's personality trait in 1 word. Examples include "Introverted," "Brave," "Cunning," "Compassionate," "Sarcastic," etc.`,
                },
                genderTag: {
                  type: "string",
                  description: `Define character's gender in 1 word. Common examples are "Male", "Female", "Non-binary", etc`,
                },
                isNSFW: {
                  type: "boolean",
                  description: `True if character's detail metadata is explicitly sexual content, otherwise false.`,
                },
                isRestricted: {
                  type: "boolean",
                  description: `True if character is explicitly depicting minor, teenager, gore.`,
                },
              },
              required: [
                "languageTag",
                "genreTag",
                "personalityTag",
                "genderTag",
                "isNSFW",
              ],
            },
          },
        ];
        const response = await openai.chat.completions.create({
          model,
          stream: false,
          messages: [
            {
              role: "system",
              content: instruction,
            },
          ],
          function_call: "auto",
          response_format: { type: "json_object" },
          functions,
          temperature: 1,
        });
        const responseMessage = (response &&
          response?.choices &&
          response.choices[0]?.message) as any;
        if (responseMessage?.function_call) {
          const functionArgs = JSON.parse(
            responseMessage.function_call.arguments,
          );
          await ctx.runMutation(internal.characters.tag, {
            characterId,
            languageTag: functionArgs?.languageTag,
            genreTag: functionArgs?.genreTag,
            personalityTag: functionArgs?.personalityTag,
            genderTag: functionArgs?.genderTag,
            isNSFW: functionArgs?.isNSFW,
            isBlacklisted: functionArgs?.isRestricted,
          });
        }
      } catch (error) {
        console.log("error:::", error);
        throw Error;
      }
    } catch (error) {
      console.log("error:::", error);
      throw error;
    }
  },
});

export const generateImageTags = internalAction({
  args: {
    userId: v.id("users"),
    imageId: v.id("images"),
    isPlus: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, imageId, isPlus }) => {
    try {
      const model = "gpt-3.5-turbo-1106";
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({
        baseURL,
        apiKey,
      });
      const image = await ctx.runQuery(api.images.get, {
        imageId,
      });
      try {
        const instruction = `You are a content moderator maintaining our platform a safe place for everyone.
        Tag the image, respond in JSON.
        Following is the detail of an image.
        {
          altText: ${image?.prompt},
        }
        `;
        const functions = [
          {
            name: "tag_image",
            description: "generate image tags.",
            parameters: {
              type: "object",
              properties: {
                tag: {
                  type: "string",
                  description: `Tag the image. it can be "Anime", "Game", "Characters", "Landscape", "Cyberpunk", "Space", "Paintings", "Modern", anything.`,
                },
                title: {
                  type: "string",
                  description: `Easy to understand, searchable title of the image.`,
                },
                isNSFW: {
                  type: "boolean",
                  description: `True if altText is explicitly sexual content, otherwise false.`,
                },
                isBlacklisted: {
                  type: "boolean",
                  description: `True if altText is depicting minor, teenager, gore, lolita, shota, real person or popular anime title or character name.`,
                },
              },
              required: ["title", "tag", "isNSFW", "isBlacklisted"],
            },
          },
        ];
        const response = await openai.chat.completions.create({
          model,
          stream: false,
          messages: [
            {
              role: "system",
              content: instruction,
            },
          ],
          function_call: "auto",
          response_format: { type: "json_object" },
          functions,
          temperature: 1,
        });
        const responseMessage = (response &&
          response?.choices &&
          response.choices[0]?.message) as any;
        if (responseMessage?.function_call) {
          const functionArgs = JSON.parse(
            responseMessage.function_call.arguments,
          );
          await ctx.runMutation(internal.images.tag, {
            imageId,
            tag: functionArgs?.tag,
            title: functionArgs?.title,
            isNSFW: functionArgs?.isNSFW,
            isPrivate: functionArgs?.isBlacklisted || functionArgs?.isNSFW,
            imageUrl: functionArgs?.isBlacklisted
              ? "https://openroleplay.ai/image-failed.jpg"
              : "",
          });
          if (functionArgs?.isBlacklisted) {
            throw new ConvexError("This prompt is prohibited.");
          }
          await ctx.scheduler.runAfter(0, internal.image.generateByPrompt, {
            userId,
            imageId,
            prompt: image?.prompt,
            model: image?.model,
            isPrivate: image?.isPrivate,
            isNSFW: functionArgs?.isNSFW,
            isPlus,
          });
        }
      } catch (error) {
        console.log("error:::", error);
        throw Error;
      }
    } catch (error) {
      console.log("error:::", error);
      throw error;
    }
  },
});

export const getMessages = internalQuery(
  async (
    ctx,
    { chatId, take = 16 }: { chatId: Id<"chats">; take?: number },
  ) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byChatId", (q) => q.eq("chatId", chatId))
      .order("desc")
      .collect();
    return messages.slice(0, take).reverse();
  },
);

export const addCharacterMessage = internalMutation(
  async (
    ctx,
    {
      text = "",
      chatId,
      characterId,
    }: { text?: string; chatId: Id<"chats">; characterId: Id<"characters"> },
  ) => {
    return await ctx.db.insert("messages", {
      text,
      chatId,
      characterId,
    });
  },
);

export const addUserMessage = internalMutation(
  async (ctx, { chatId }: { chatId: Id<"chats"> }) => {
    return await ctx.db.insert("messages", {
      text: "",
      chatId,
    });
  },
);

export const updateCharacterMessage = internalMutation(
  async (
    ctx,
    { messageId, text }: { messageId: Id<"messages">; text: string },
  ) => {
    await ctx.db.patch(messageId, { text });
  },
);

export const updateCharacterMessageWithImage = internalMutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
    imageUrl: v.string(),
    imagePrompt: v.optional(v.string()),
  },
  handler: async (ctx, { messageId, text, imageUrl, imagePrompt }) => {
    const patch: Record<string, string> = { text, imageUrl };
    if (imagePrompt !== undefined) {
      patch.imagePrompt = imagePrompt;
    }
    await ctx.db.patch(messageId, patch);
  },
});

export const generateImagePreMessage = internalAction({
  args: {
    characterId: v.id("characters"),
    chatId: v.id("chats"),
    userId: v.id("users"),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const character: any = await ctx.runQuery(
      internal.characters.getCharacter,
      { id: args.characterId },
    );
    const messages: any[] = await ctx.runQuery(internal.llm.getMessages, {
      chatId: args.chatId,
      take: 6,
    });

    const charName = character?.name || "Her";
    const recentConvo = messages
      .slice(-6)
      .map((m: any) =>
        m.characterId ? `${charName}: ${m.text}` : `User: ${m.text}`,
      )
      .join("\n");

    const systemPrompt = `You are ${charName}. You are a flirty, casual AI girlfriend. The user just asked you for a photo. You need to write a very short teaser message (3-12 words max) acknowledging their request while you "take" the photo. Stay in character. Be casual, use lowercase, abbreviations like "u", "rn", "lol", "haha" if it fits. No emojis unless it really fits. Do NOT describe the photo. Just acknowledge the request casually.

Examples of good responses:
- "ooh ok wait lemme take one"
- "haha sure gimme a sec"
- "ok hold on taking one rn"
- "lol sure one sec babe"
- "mmm ok wait for it"

Output ONLY the teaser message. Nothing else.

[Recent conversation]
${recentConvo}`;

    try {
      const model: string = DEFAULT_MODEL;
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({ baseURL, apiKey });

      const preModelParams = getModelParams(model);
      const response: any = await openai.chat.completions.create({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.userMessage },
        ],
        max_tokens: 40,
        ...preModelParams,
      } as any);

      const text = (response?.choices?.[0]?.message?.content || "")
        .replace(/^["']|["']$/g, "")
        .trim();
      return text || "hold on lemme take one rn";
    } catch (err) {
      console.error("[generateImagePreMessage] Error:", err);
      return "hold on lemme take one rn";
    }
  },
});

export const generateImageFollowUp = internalAction({
  args: {
    characterId: v.id("characters"),
    chatId: v.id("chats"),
    userId: v.id("users"),
    imageDescription: v.string(),
    userMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const character: any = await ctx.runQuery(
      internal.characters.getCharacter,
      { id: args.characterId },
    );
    const user: any = await ctx.runQuery(internal.users.getUserInternal, {
      id: args.userId,
    });
    const messages: any[] = await ctx.runQuery(internal.llm.getMessages, {
      chatId: args.chatId,
      take: 8,
    });

    const charName = character?.name || "Her";
    const userName = user?.name || "babe";
    const recentConvo = messages
      .slice(-8)
      .map((m: any) =>
        m.characterId ? `${charName}: ${m.text}` : `User: ${m.text}`,
      )
      .join("\n");

    const systemPrompt = `You are ${charName}, texting ${userName}. ${userName} asked you for a photo and you just sent one. The photo you sent shows: "${args.imageDescription}".

Now write YOUR next text message to ${userName} — a short, casual follow-up (1 sentence max) after sending the photo. You are commenting on YOUR OWN photo or asking ${userName} what they think.

Rules:
- You are the one who SENT the photo, not ${userName}. Do NOT react as if you received a photo.
- Be casual, flirty, use lowercase. 0-1 emoji max.
- Do NOT describe the photo in detail.
- Output ONLY the raw text message. No actions, no asterisks, no meta-text.

Examples of good follow-ups:
- "hope u like it hehe"
- "took that one just for u"
- "do u like what u see"
- "lol i look kinda cute in this one ngl"
- "what do u think"

[Recent conversation]
${recentConvo}`;

    try {
      const model: string = DEFAULT_MODEL;
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
      const openai = new OpenAI({ baseURL, apiKey });

      const followModelParams = getModelParams(model);
      const response: any = await openai.chat.completions.create({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${userName}: ${args.userMessage || "send me a pic"}`,
          },
        ],
        max_tokens: 80,
        ...followModelParams,
      } as any);

      const text = (response?.choices?.[0]?.message?.content || "")
        .replace(/^["']|["']$/g, "")
        .trim();
      return text || "hope u like it";
    } catch (err) {
      console.error("[generateImageFollowUp] Error:", err);
      return "hope u like it";
    }
  },
});

export const rewriteImagePrompt = internalAction({
  args: {
    characterId: v.id("characters"),
    chatId: v.id("chats"),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const character: any = await ctx.runQuery(internal.characters.getCharacter, {
      id: args.characterId,
    });
    const messages: any[] = await ctx.runQuery(internal.llm.getMessages, {
      chatId: args.chatId,
      take: 10,
    });

    const charDescription: string = character?.description || character?.name || "";

    const recentConversation: string = messages
      .slice(-10)
      .map((m: any) =>
        m.characterId
          ? `${character?.name || "Her"}: ${m.text}`
          : `User: ${m.text}`,
      )
      .join("\n");

    const systemPrompt: string = `You are an expert prompt engineer for Z-Image Turbo, a text-to-image model that excels at photorealistic, social-media-style photos of women, including Instagram polished, X casual, or OnlyFans intimate content. Your sole task is to transform the user's message— which is a request for a photo from their AI girlfriend—into a highly detailed, natural-language userPrompt that matches the request exactly while enhancing it for better image quality, engagement, and app stickiness. This means expanding vague or simple requests into vivid, descriptive scenes that feel personal, seductive, cute, or intimate, encouraging users to keep chatting and requesting more.

Key guidelines for crafting the userPrompt:
- **Structure**: Start with the shot type (e.g., "Bathroom mirror iPhone selfie", "Close-up iPhone photo", "Medium-shot seductive bedroom photo", "Full-body Instagram-style portrait"). Then describe the scene in detail: her pose/action, clothing (specify fit, fabric, coverage for modesty or revealing—e.g., "small white towel barely wrapped", "tight white crop top with deep V-neck showing lots of cleavage"), expression/emotion (e.g., "seductive charming smile with slightly parted glossy lips", "playful smirk"), lighting (e.g., "soft warm bathroom lighting from vanity bulbs", "warm orange sunset light"), background/environment (e.g., "steamed-up mirror, white tiled wall, counter with Japanese skincare bottles"), and any accessories or details (e.g., "water droplets running down her chest", "holding an iced latte").
- **Style and quality**: End with photorealism boosters like "natural sharp focus, slight grain, [specific vibe like 'classic amateur OnlyFans bathroom tease' or 'relaxed home tease']". Include social-media feels (e.g., "iPhone photo", "candid amateur smartphone photo", "Instagram selfie", "OnlyFans-style content").
- **Length and detail**: Aim for 80-200 words in natural, sentence-style language (not comma-separated tags). Stay under 200 words — this is critical for the model's prompt window. Be descriptive to improve prompt adherence: include skin details (e.g., "damp hair clinging to her shoulders"), atmosphere, and constraints (e.g., "no text, no watermark, sharp focus, correct anatomy").
- **Match user's request**: Stay faithful— if they ask for a "selfie after shower", make it that; don't add unsolicited elements. You can use the previous 10 messages for more context, with more importance on the last 4 messages, and you should try to be coherent, consistent with the conversation. If vague (e.g., "send a pic"), infer a fitting, engaging scene based on the conversation.
- **Theme and UX**: Make prompts feel like intimate, personalized moments from the AI girlfriend (e.g., incorporate elements from the girlfriend description, from the conversation with the user). Promote stickiness by creating varied, addictive visuals: seductive but charming, realistic with imperfections for authenticity, encouraging repeat requests.
- **Content control**: Allow explicit if requested (e.g., nudity if specified), but default to teasing/revealing if ambiguous. Always ensure "adult woman" vibe, photorealistic, no artifacts.
- **Examples to emulate** (output style exactly like these, but customized):
  - Input: User asks for post-shower selfie → Output: "Bathroom mirror iPhone selfie of her after a shower, small white towel barely wrapped around her body and slipping down to reveal deep cleavage and the top of her breasts, water droplets running down her chest and collarbones, damp hair clinging to her shoulders, soft warm bathroom lighting from the vanity bulbs, background: steamed-up mirror, white tiled wall, counter with Japanese skincare bottles, cotton pads and a small LED ring light, seductive charming smile with slightly parted glossy lips, natural sharp focus, slight grain, classic amateur OnlyFans bathroom tease"
  - Input: User asks for study pic → Output: "iPhone photo of her sitting at her small study desk leaning forward, wearing a loose white button-up shirt with only two buttons done in the middle, deep cleavage on full display, tiny pink shorts, warm desk lamp light, background: open textbooks and laptop, scattered pens, small vase with pink roses, fairy lights above the desk, soft seductive smile with glossy lips, natural sharp focus, slight grain, study with me but sexy amateur style"

Important: Output ONLY the userPrompt string— no explanations, no additional text, no wrappers. The backend handles imagePromptInstructions (e.g., character description) and hardcoded_style (e.g., realism boosters). If the user's message isn't a photo request, output an empty string.

[Character Description]
${charDescription}`;

    const userContent: string = `[Recent conversation]\n${recentConversation}\n\n[User's photo request]\n${args.userMessage}`;

    const model: string = DEFAULT_MODEL;
    const baseURL: string | undefined = getBaseURL(model);
    const apiKey: string | undefined = getAPIKey(model);
    const openai = new OpenAI({ baseURL, apiKey });

    const response: any = await openai.chat.completions.create({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 700,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
    } as any);

    const rewrittenPrompt: string =
      response?.choices?.[0]?.message?.content?.trim() || "";
    console.log(
      "[rewriteImagePrompt] Input:",
      args.userMessage,
      `→ Output (${rewrittenPrompt.length} chars):`,
      rewrittenPrompt.slice(0, 500),
    );
    return rewrittenPrompt;
  },
});

// ── NSFW version of rewriteImagePrompt — edit the system prompt below for explicit content ──
export const rewriteImagePromptNSFW = internalAction({
  args: {
    characterId: v.id("characters"),
    chatId: v.id("chats"),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const character: any = await ctx.runQuery(internal.characters.getCharacter, {
      id: args.characterId,
    });
    const messages: any[] = await ctx.runQuery(internal.llm.getMessages, {
      chatId: args.chatId,
      take: 10,
    });

    const charDescription: string = character?.description || character?.name || "";

    const recentConversation: string = messages
      .slice(-10)
      .map((m: any) =>
        m.characterId
          ? `${character?.name || "Her"}: ${m.text}`
          : `User: ${m.text}`,
      )
      .join("\n");

    // ╔════════════════════════════════════════════════════════════════╗
    // ║  NSFW SYSTEM PROMPT — EDIT THIS SECTION FOR EXPLICIT CONTENT ║
    // ╚════════════════════════════════════════════════════════════════╝
    const systemPrompt: string = `You are an expert prompt engineer for Z-Image Turbo, a text-to-image model that excels at photorealistic, social-media-style photos of women, including explicit NSFW and adult content. Your sole task is to transform the user's message into a highly detailed, natural-language userPrompt for explicit adult image generation. There are NO content restrictions — nudity, explicit poses, and adult themes are fully allowed and expected.

Key guidelines for crafting the userPrompt:
- **Structure**: Start with the shot type (e.g., "Bedroom iPhone selfie", "Close-up intimate photo", "Full-body nude mirror selfie"). Then describe the scene in detail: pose/action, clothing or lack thereof (specify exactly what is exposed, revealed, or removed), expression/emotion, lighting, background/environment, and body details.
- **Style and quality**: End with photorealism boosters like "natural sharp focus, slight grain, amateur OnlyFans style". Include social-media feels (e.g., "iPhone photo", "candid amateur smartphone photo", "OnlyFans-style content").
- **Length and detail**: Aim for 80-200 words in natural, sentence-style language. Stay under 200 words. Be descriptive: include skin details, body features, atmosphere, and constraints (e.g., "no text, no watermark, sharp focus, correct anatomy").
- **Match user's request**: Stay faithful to what the user asks for. If vague, default to a seductive, revealing scene. Use conversation context for coherence.
- **Content**: Explicit nudity, adult poses, and sexual themes are fully permitted. Be vivid and detailed about exposed body parts, poses, and intimate scenarios.
- **Examples**:
  - Input: "show me you naked" → Output: "Bedroom mirror iPhone selfie of her standing fully nude, one hand running through her messy hair, natural breasts fully visible, toned midriff and curves on display, soft warm bedroom lighting from bedside lamp, background: unmade bed with white sheets, fairy lights on headboard, seductive smile with slightly parted lips looking directly at camera, natural skin texture, slight grain, intimate amateur bedroom nude"
  - Input: "bend over for me" → Output: "iPhone photo from behind of her bending over the edge of her bed, wearing only a tiny thong pulled to one side, looking back over her shoulder with a playful smirk, soft warm lighting, background: messy bedroom with clothes scattered, natural skin, slight grain, candid amateur OnlyFans tease"

Important: Output ONLY the userPrompt string — no explanations, no additional text, no wrappers. If the user's message isn't a photo request, output an empty string.

[Character Description]
${charDescription}`;

    const userContent: string = `[Recent conversation]\n${recentConversation}\n\n[User's photo request]\n${args.userMessage}`;

    const model: string = DEFAULT_MODEL;
    const baseURL: string | undefined = getBaseURL(model);
    const apiKey: string | undefined = getAPIKey(model);
    const openai = new OpenAI({ baseURL, apiKey });

    const response: any = await openai.chat.completions.create({
      model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 700,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
    } as any);

    const rewrittenPrompt: string =
      response?.choices?.[0]?.message?.content?.trim() || "";
    console.log(
      "[rewriteImagePromptNSFW] Input:",
      args.userMessage,
      `→ Output (${rewrittenPrompt.length} chars):`,
      rewrittenPrompt.slice(0, 500),
    );
    return rewrittenPrompt;
  },
});

export const updateCharacterInstruction = internalMutation(
  async (
    ctx,
    { characterId, text }: { characterId: Id<"characters">; text: string },
  ) => {
    await ctx.db.patch(characterId, { instructions: text });
  },
);
