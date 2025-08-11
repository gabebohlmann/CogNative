// convex/userWords.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const gradeWord = mutation({
  args: { wordText: v.string(), rating: v.string() },
  handler: async (ctx, { wordText, rating }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated.");
    }
    const tokenIdentifier = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .first();

    let userId: Id<"users">;

    if (!user) {
      userId = await ctx.db.insert("users", {
        tokenIdentifier: tokenIdentifier,
      });
    } else {
      userId = user._id;
    }

    // --- FIX: Find the word, with a fallback for the accusative case ---
    let word = await ctx.db
      .query("words")
      .withIndex("by_esperanto", (q) => q.eq("esperanto", wordText))
      .first();

    // If the original word (e.g., "nomon") isn't found and it ends with 'n',
    // try finding the base form (e.g., "nomo").
    if (!word && wordText.endsWith("n") && wordText.length > 1) {
      const baseWordText = wordText.slice(0, -1);
      word = await ctx.db
        .query("words")
        .withIndex("by_esperanto", (q) => q.eq("esperanto", baseWordText))
        .first();
    }
    // --- END FIX ---

    if (!word) {
      console.warn(
        `Word "${wordText}" (and its base form) not found in the dictionary. Skipping grade.`
      );
      return;
    }

    const userWord = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) =>
        q.eq("userId", userId).eq("wordId", word._id)
      )
      .first();

    if (userWord) {
      await ctx.db.patch(userWord._id, {
        last_review: Date.now(),
        // TODO: Add FSRS update logic based on 'rating'
      });
    } else {
      await ctx.db.insert("userWords", {
        userId: userId,
        wordId: word._id,
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: Date.now(),
        learning_steps: 0,
      });
    }
  },
});

export const getByText = query({
  args: { wordText: v.string() },
  handler: async (ctx, args) => {
    if (!args.wordText) return null;

    const word = await ctx.db
      .query("words")
      .withIndex("by_esperanto", (q) => q.eq("esperanto", args.wordText))
      .first();

    return word;
  },
});

export const getTranslationsForStory = query({
  args: { words: v.array(v.string()) },
  handler: async (ctx, { words }) => {
    const wordDocs = await Promise.all(
      words.map((wordText) =>
        ctx.db
          .query("words")
          .withIndex("by_esperanto", (q) => q.eq("esperanto", wordText))
          .first()
      )
    );

    const translations: { esperanto: string; english: string }[] = [];
    for (const doc of wordDocs) {
      if (doc) {
        translations.push({ esperanto: doc.esperanto, english: doc.english });
      }
    }
    return translations;
  },
});
  