import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  fsrs,
  FSRS,
  generatorParameters,
  Card,
  State,
  Rating,
  createEmptyCard,
} from "ts-fsrs";

// Helper Functions
async function getUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique();
}

function getFsrsInstance(settings: any): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: settings.request_retention,
      maximum_interval: settings.maximum_interval,
      learning_steps: settings.learning_steps,
      relearning_steps: settings.relearning_steps,
      easyBonus: settings.easy_interval,
    })
  );
}

function mapRating(rating: string): Rating {
  switch (rating) {
    case "again": return Rating.Again;
    case "hard": return Rating.Hard;
    case "good": return Rating.Good;
    case "easy": return Rating.Easy;
    default: throw new Error(`Invalid rating: ${rating}`);
  }
}

// Mutations and Queries
export const gradeWord = mutation({
  args: {
    wordText: v.string(),
    rating: v.string(),
    settings: v.any(),
  },
  handler: async (ctx, { wordText, rating, settings }) => {
    const user = await getUser(ctx);
    if (!user) throw new Error("User not authenticated.");

    let word = await ctx.db
      .query("words")
      .withIndex("by_esperanto", (q) => q.eq("esperanto", wordText))
      .first();

    if (!word && wordText.endsWith("n") && wordText.length > 1) {
      const baseWordText = wordText.slice(0, -1);
      word = await ctx.db
        .query("words")
        .withIndex("by_esperanto", (q) => q.eq("esperanto", baseWordText))
        .first();
    }

    if (!word) {
      console.warn(`Word "${wordText}" not found. Skipping.`);
      return null;
    }

    const userWord = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) =>
        q.eq("userId", user._id).eq("wordId", word._id)
      )
      .first();
    
    // NOTE: We no longer block reviews for words that aren't due.
    // FSRS naturally handles early reviews.

    const now = new Date();
    const f = getFsrsInstance(settings);
    const fsrsRating = mapRating(rating);

    let card: Card;
    if (userWord) {
      card = {
        ...userWord,
        due: new Date(userWord.due),
        last_review: userWord.last_review ? new Date(userWord.last_review) : undefined,
        state: userWord.state as State,
      };
    } else {
      card = createEmptyCard(now);
      await ctx.db.patch(user._id, {
        newCardsSeenToday: (user.newCardsSeenToday ?? 0) + 1,
        lastResetDate: now.toISOString().split("T")[0],
      });
    }

    const scheduling_cards = f.repeat(card, now);
    const updatedCard = scheduling_cards[fsrsRating].card;

    const dataToStore = {
      userId: user._id,
      wordId: word._id,
      due: updatedCard.due.getTime(),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: updatedCard.elapsed_days,
      scheduled_days: updatedCard.scheduled_days,
      reps: updatedCard.reps,
      lapses: updatedCard.lapses,
      state: updatedCard.state,
      last_review: updatedCard.last_review!.getTime(),
    };

    if (userWord) {
      await ctx.db.patch(userWord._id, dataToStore);
      return { ...dataToStore, _id: userWord._id };
    } else {
      const newId = await ctx.db.insert("userWords", dataToStore);
      return { ...dataToStore, _id: newId };
    }
  },
});

export const getUserWordsByText = query({
  args: { words: v.array(v.string()) },
  handler: async (ctx, { words }) => {
    const user = await getUser(ctx);
    if (!user) return [];
    const userWordsData: { word: string; data: any }[] = [];
    for (const baseWord of new Set(words)) {
      const wordDoc = await ctx.db
        .query("words")
        .withIndex("by_esperanto", (q) => q.eq("esperanto", baseWord))
        .first();
      if (wordDoc) {
        const userWord = await ctx.db
          .query("userWords")
          .withIndex("by_user_word", (q) =>
            q.eq("userId", user._id).eq("wordId", wordDoc._id)
          )
          .first();
        if (userWord) userWordsData.push({ word: baseWord, data: userWord });
      }
    }
    return userWordsData;
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
      if (doc) translations.push({ esperanto: doc.esperanto, english: doc.english });
    }
    return translations;
  },
});