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
