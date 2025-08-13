// convex/userWords.ts
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
    case "again":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "good":
      return Rating.Good;
    case "easy":
      return Rating.Easy;
    default:
      throw new Error(`Invalid rating: ${rating}`);
  }
}

export async function gradeWordLogic(
  ctx: any,
  {
    userId,
    user,
    wordText,
    rating,
    settings,
  }: {
    userId: Id<"users">;
    user: any;
    wordText: string;
    rating: string;
    settings: any;
  }
) {
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
      q.eq("userId", userId).eq("wordId", word._id)
    )
    .first();

  const now = new Date();
  const f = getFsrsInstance(settings);
  const fsrsRating = mapRating(rating);

  let card: Card;
  if (userWord) {
    card = {
      ...userWord,
      due: new Date(userWord.due),
      last_review: userWord.last_review
        ? new Date(userWord.last_review)
        : undefined,
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
    userId: userId,
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
}

// --- MODIFIED: Public mutation now calls the helper ---
export const gradeWord = mutation({
  args: {
    wordText: v.string(),
    rating: v.string(),
    settings: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user) throw new Error("User not authenticated.");

    return await gradeWordLogic(ctx, { ...args, userId: user._id, user });
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
        if (userWord) {
          userWordsData.push({ word: baseWord, data: userWord });
        }
      }
    }
    return userWordsData;
  },
});

// --- MODIFIED FUNCTION ---
// This query is now highly efficient and will not hit the read limit.
export const getTranslationsForStory = query({
  args: { words: v.array(v.string()) },
  handler: async (ctx, { words }) => {
    const requiredWords = new Set(words);
    if (requiredWords.size === 0) {
      return [];
    }

    // 1. Fetch all words from the database in a single, efficient query.
    const allWordDocs = await ctx.db.query("words").collect();

    const translations: { esperanto: string; english: string }[] = [];

    // 2. Filter for the required words in memory, which is very fast.
    for (const doc of allWordDocs) {
      if (requiredWords.has(doc.esperanto)) {
        translations.push({ esperanto: doc.esperanto, english: doc.english });
      }
    }

    return translations;
  },
});
