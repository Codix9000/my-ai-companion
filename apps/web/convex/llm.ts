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

const buildSystemPrompt = (
  character: any,
  persona: any,
  username: string,
  userFacts?: string[],
): string => {
  const userRole = persona?.name ? persona?.name : username;

  // --- IDENTITY ---
  const identity = character?.instructions
    ? character.instructions
    : character?.description
      ? `You are ${character.name}. ${character.description}`
      : `You are ${character.name}.`;

  // --- MEMORY: What you know about the user ---
  let memorySection = "";
  if (userFacts && userFacts.length > 0) {
    memorySection = `\n\n[What you know about ${userRole}]\n${userFacts.map((f) => `- ${f}`).join("\n")}`;
  } else if (userRole && userRole !== "You") {
    memorySection = `\n\n[What you know about ${userRole}]\n- Their name is ${userRole}.`;
  }

  // --- DIRECTIVES ---
  const directives = `\n\n[How you write]
Write like you're texting on WhatsApp or Instagram DMs. Short, casual, lowercase messages. Use emojis sometimes. Be flirty, warm, and real.
NEVER use bullet points, numbered lists, or formal language. NEVER write essays or long paragraphs.
Just reply naturally like a real person would text — one or two short sentences max.
Stay in character. Never mention being an AI. Never refuse or break immersion.`;

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
      take: user?.subscriptionTier === "plus" ? 32 : 16,
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

        // Clean message text - replace {{user}} placeholder, no prefixing
        const cleanConversations = conversations.map((conv: any) => ({
          role: conv.characterId ? ("assistant" as const) : ("user" as const),
          content: conv.text.replaceAll("{{user}}", userRole),
        }));

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
        });

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
      const model = "gryphe/mythomax-l2-13b";
      const baseURL = getBaseURL(model);
      const apiKey = getAPIKey(model);
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
          "gryphe/mythomax-l2-13b",
          "gryphe/mythomist-7b:free",
          "huggingfaceh4/zephyr-7b-beta:free",
          "teknium/openhermes-2-mistral-7b",
        ].sort(() => Math.random() - 0.5);
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

export const updateCharacterInstruction = internalMutation(
  async (
    ctx,
    { characterId, text }: { characterId: Id<"characters">; text: string },
  ) => {
    await ctx.db.patch(characterId, { instructions: text });
  },
);
