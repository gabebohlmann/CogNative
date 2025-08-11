import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// This helper is now purely for reading the user document.
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    // Return null if the user is not authenticated.
    return null;
  }
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

/**
 * Public mutation to store a new user.
 * This should be called from the client after sign-up.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser but user is not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (user !== null) {
      return user._id; // User already exists.
    }

    // Create the new user record.
    const userId = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      newCardsSeenToday: 0,
      lastSession: 0,
    });
    return userId;
  },
});

export const getSettings = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    // If the user doesn't exist yet, return default settings.
    if (!user) {
      return {
        request_retention: 0.9,
        maximum_interval: 36500,
        learning_steps: ["3m", "15m"],
        relearning_steps: ["10m"],
        easy_interval: 4,
        new_cards_per_day: 20,
        reviews_per_day: 200,
      };
    }
    return (
      user.settings ?? {
        request_retention: 0.9,
        maximum_interval: 36500,
        learning_steps: ["3m", "15m"],
        relearning_steps: ["10m"],
        easy_interval: 4,
        new_cards_per_day: 20,
        reviews_per_day: 200,
      }
    );
  },
});

export const updateSettings = mutation({
  args: {
    request_retention: v.float64(),
    maximum_interval: v.float64(),
    learning_steps: v.array(v.string()),
    relearning_steps: v.array(v.string()),
    easy_interval: v.float64(),
    new_cards_per_day: v.float64(),
    reviews_per_day: v.float64(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    await ctx.db.patch(user._id, { settings: args });
  },
});

export const resetDailyCountersIfNeeded = mutation({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return;
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    if (!user.lastSession || user.lastSession < todayStart) {
      await ctx.db.patch(user._id, { newCardsSeenToday: 0 });
    }
  },
});
