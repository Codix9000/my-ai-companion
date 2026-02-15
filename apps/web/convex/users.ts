import { mutation, query } from "./_generated/server";
import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { SIGN_UP_FREE_CRYSTALS } from "./constants";

/**
 * Insert or update the user in a Convex table then return the document's ID.
 *
 * The `UserIdentity.tokenIdentifier` string is a stable and unique value we use
 * to look up identities.
 *
 * Keep in mind that `UserIdentity` has a number of optional fields, the
 * presence of which depends on the identity provider chosen. It's up to the
 * application developer to determine which ones are available and to decide
 * which of those need to be persisted. For Clerk the fields are determined
 * by the JWT token's Claims config.
 */
export const store = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    const user = await ctx.db
      .query("users")
      .withIndex("byToken", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== args.username) {
        await ctx.db.patch(user._id, { name: args.username });
      }
      return user._id;
    }
    const userByEmail = await ctx.db
      .query("users")
      .withIndex("byEmail", (q) => q.eq("email", identity.email))
      .unique();
    if (userByEmail !== null) {
      return await ctx.db.insert("users", {
        name: args.username,
        tokenIdentifier: identity.tokenIdentifier,
        crystals: 0,
      });
    }
    // If it's a new identity, create a new `User`.
    const email = identity?.email ?? ""; // Handle potentially undefined email
    return await ctx.db.insert("users", {
      name: args.username,
      email: email,
      tokenIdentifier: identity.tokenIdentifier,
      crystals:
        email.includes("secretmail.net") ||
        email.includes("oncemail.co.kr") ||
        email.includes("duck.com") ||
        email.includes("slmail.me") ||
        email.includes("protonmail")
          ? 0
          : SIGN_UP_FREE_CRYSTALS,
    });
  },
});

export const getUserInternal = internalQuery({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    return user ? user : null;
  },
});

export const getUserByToken = internalQuery({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("byToken", (q: any) =>
        q.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
  },
});

export const getUser = async (ctx: any, doNotThrow?: boolean) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    if (doNotThrow) return null;
    throw new Error(
      "Called getUserFromTokenIdentifier without authentication present",
    );
  }
  const user = await ctx.db
    .query("users")
    .withIndex("byToken", (q: any) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (user === null && !doNotThrow) {
    throw new Error("User not found");
  }
  return user;
};

export const getUsername = query({
  args: {
    id: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const targetId = args.id ?? (await getUser(ctx, true))?._id;
    if (!targetId) return null;
    const user = await ctx.db.get(targetId);
    // Ensure we only read from the users table
    // @ts-ignore - runtime check guards against wrong table types
    return (user && (user as any).name) ? (user as any).name : null;
  },
});

export const me = query({
  args: {},
  handler: async (ctx, args) => {
    const user = await getUser(ctx, true);
    if (!user) return null;
    if (user?.isBanned) {
      throw new Error("User is banned");
    }
    return user;
  },
});

export const persona = query({
  args: {},
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user.primaryPersonaId) return user;
    const persona = await ctx.db.get(user?.primaryPersonaId);
    if (!persona) return user;
    return persona;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    const updates: Record<string, string> = {};
    if (args.name !== undefined && args.name.trim().length > 0) {
      updates.name = args.name.trim();
    }
    if (args.gender !== undefined) {
      updates.gender = args.gender;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(user._id, updates);
    }
    return { success: true };
  },
});

export const setLanguage = mutation({
  args: {
    languageTag: v.string(),
  },
  handler: async (ctx, { languageTag }) => {
    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { languageTag });
    return user;
  },
});

export const toggleAutoTranslate = mutation({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, {
      autoTranslate: user?.autoTranslate ? false : true,
    });
    return user;
  },
});

export const updateNSFWPreference = mutation({
  args: {
    nsfwPreference: v.optional(
      v.union(v.literal("block"), v.literal("auto"), v.literal("allow")),
    ),
  },
  handler: async (ctx, { nsfwPreference }) => {
    const user = await getUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.patch(user._id, { nsfwPreference });
    return user;
  },
});
