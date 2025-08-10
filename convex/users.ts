// convex/users.ts
import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

/**
 * Stores a new user in the database.
 * This mutation is called from the client after a successful sign-up.
 * It's designed to be idempotent, so it can be called multiple times without creating duplicate users.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the user's identity from the authentication token
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser but user is not authenticated");
    }

    // Check if the user already exists in the database
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    // If the user already exists, do nothing and return their document ID
    if (user !== null) {
      return user._id;
    }

    // If the user is new, create a new user record
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
    });

    return userId;
  },
});
