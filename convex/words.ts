// convex/words.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  fsrs,
  FSRS,
  generatorParameters,
  Card,
  State,
  Rating,
  createEmptyCard,
} from "ts-fsrs";
// TODO: This Id might mean there is code here that should be in userWords.ts
import { Id } from "./_generated/dataModel";

// --- Helper Functions ---
function getFsrsInstance(settings: any): FSRS {
  return fsrs(
    generatorParameters({
      request_retention: settings.request_retention,
      maximum_interval: settings.maximum_interval,
      learning_steps: settings.learning_steps,
      relearning_steps: settings.relearning_steps,

      easyBonus: settings.easyBonus,
    })
  );
}

function formatDueDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs < 0) return "<1m";
  const diffMins = Math.round(diffMs / (1000 * 60));
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.round(diffMs / (1000 * 60 * 60 * 24))}d`;
}

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

const shuffleArray = (array) => {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
};

// --- Main Queries ---
export const getDueCards = query({
  args: { settings: v.any() },
  handler: async (ctx, { settings }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const f = getFsrsInstance(settings);
    const now = new Date();
    const dueUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_due_date", (q) =>
        q.eq("userId", user._id).lte("due", now.getTime())
      )
      .take(settings.reviews_per_day);

    return Promise.all(
      dueUserWords.map(async (userWord) => {
        const word = await ctx.db.get(userWord.wordId);
        if (!word) return null;
        const card: Card = {
          ...userWord,
          due: new Date(userWord.due),
          last_review: userWord.last_review
            ? new Date(userWord.last_review)
            : undefined,
          state: userWord.state as State,
        };
        const intervals = f.repeat(card, now);
        return {
          ...word,
          intervals: {
            again: formatDueDate(intervals[Rating.Again].card.due),
            hard: formatDueDate(intervals[Rating.Hard].card.due),
            good: formatDueDate(intervals[Rating.Good].card.due),
            easy: formatDueDate(intervals[Rating.Easy].card.due),
          },
        };
      })
    ).then((cards) => cards.filter(Boolean));
  },
});

export const getRandomWord = query({
  args: { settings: v.any() },
  handler: async (ctx, { settings }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const newCardsToday = user.newCardsSeenToday ?? 0;
    const limit = settings.new_cards_per_day - newCardsToday;
    if (limit <= 0) return [];

    const f = getFsrsInstance(settings);
    const seenUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();
    const seenWordIds = new Set(seenUserWords.map((uw) => uw.wordId));
    const allWords = await ctx.db
      .query("words")
      .withIndex("by_rangeIndex")
      .order("asc")
      .collect();
    const unseenWords = allWords.filter((word) => !seenWordIds.has(word._id));

    return unseenWords.slice(0, limit).map((word) => {
      const card = createEmptyCard(new Date());
      const intervals = f.repeat(card, new Date());
      return {
        ...word,
        intervals: {
          again: formatDueDate(intervals[Rating.Again].card.due),
          hard: formatDueDate(intervals[Rating.Hard].card.due),
          good: formatDueDate(intervals[Rating.Good].card.due),
          easy: formatDueDate(intervals[Rating.Easy].card.due),
        },
      };
    });
  },
});

export const getWordsForGame = query({
  args: { settings: v.any(), gameId: v.number() },
  handler: async (ctx, { settings }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("User not authenticated.");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) throw new Error("User not found.");

    const now = new Date();
    const maxWordsInGame = 5;
    const maxTotalLetters = 7;

    // 1. Get a pool of potential words, starting with the highest priority.

    // Priority 1: Due cards
    const dueUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_due_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.lte("due", now.getTime()))
      .take(100);

    const dueWordDocs = (
      await Promise.all(dueUserWords.map((uw) => ctx.db.get(uw.wordId)))
    ).filter((doc) => doc !== null);

    // Priority 2: New cards, sorted by rangeIndex
    const seenWordIds = new Set(
      (
        await ctx.db
          .query("userWords")
          .filter((q) => q.eq("userId", user._id))
          .collect()
      ).map((uw) => uw.wordId.toString())
    );
    const allWords = await ctx.db.query("words").collect();

    const unseenWords = allWords
      .filter((w) => !seenWordIds.has(w._id.toString()))
      // Sort new words by rangeIndex to prioritize the earliest ones
      .sort((a, b) => (a.rangeIndex || 99999) - (b.rangeIndex || 99999));

    const potentialWords = [...dueWordDocs, ...unseenWords].filter(
      (word) => word.esperanto.length > 1
    );

    // *** FIX: Introduce controlled randomness to generate a new game each time ***
    // Shuffle the top 50 priority words to ensure variety, while still respecting priority.
    const topPriority = potentialWords.slice(0, 50);
    const theRest = potentialWords.slice(50);
    const randomizedPotentialWords = [...shuffleArray(topPriority), ...theRest];

    // 2. Intelligently select a set of words that fits the 7-letter constraint
    let gameWords = [];

    // Use the randomized list to build the game
    for (const word of randomizedPotentialWords) {
      // Tentatively add the new word to see if it fits
      const tentativeGameWords = [
        ...gameWords,
        { esperanto: word.esperanto, english: word.english },
      ];

      // Recalculate what the letter scape would be with this new word included
      const maxFrequencies = {};
      tentativeGameWords.forEach((gw) => {
        const wordFrequencies = {};
        for (const letter of gw.esperanto) {
          wordFrequencies[letter] = (wordFrequencies[letter] || 0) + 1;
        }
        for (const letter in wordFrequencies) {
          if (
            !maxFrequencies[letter] ||
            wordFrequencies[letter] > maxFrequencies[letter]
          ) {
            maxFrequencies[letter] = wordFrequencies[letter];
          }
        }
      });

      let totalLetters = 0;
      for (const letter in maxFrequencies) {
        totalLetters += maxFrequencies[letter];
      }

      // If the total number of letters is within the limit, officially add the word
      if (totalLetters <= maxTotalLetters) {
        gameWords = tentativeGameWords;
      }

      // Stop when we have enough words for the game
      if (gameWords.length >= maxWordsInGame) break;
    }

    // 3. Fallback if the logic can't find enough suitable words
    if (gameWords.length < 2) {
      console.warn(
        "Could not find enough words with the letter constraint. Using fallback."
      );
      const randomWords = await ctx.db
        .query("words")
        .filter((q) => q.gt(q.field("esperanto").length, 1))
        .take(maxWordsInGame);
      return randomWords.map((w) => ({
        esperanto: w.esperanto,
        english: w.english,
      }));
    }

    return gameWords;
  },
});
export const resetCounters = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) throw new Error("User not found.");

    await ctx.db.patch(user._id, {
      newCardsSeenToday: 0,
      lastResetDate: new Date().toISOString(),
    });
  },
}); 