import { query } from "./_generated/server";
import { fsrs, FSRS, generatorParameters, Card, State, Rating, createEmptyCard } from "ts-fsrs";

// --- FSRS Setup ---
// Define your initial learning steps here. After these are completed, FSRS takes over.
const LEARNING_STEPS: `${number}m`[] = ["3m", "15m"];
const GRADUATING_INTERVAL = 1; // 1 day
const EASY_INTERVAL = 4; // 4 days

const params = generatorParameters({
  learning_steps: LEARNING_STEPS,
  graduating_interval: GRADUATING_INTERVAL,
  easy_interval: EASY_INTERVAL,
});
const f: FSRS = fsrs(params);

// --- Helper Functions ---
function formatDueDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "<1m";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

async function getUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

// --- Main Queries ---
export const getDueCards = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const now = new Date();
    const dueUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_due_date", (q) => q.eq("userId", user._id).lte("due", now.getTime()))
      .collect();

    const cardsWithIntervals = await Promise.all(
      dueUserWords.map(async (userWord) => {
        const word = await ctx.db.get(userWord.wordId);
        if (!word) return null;

        const card: Card = {
          ...userWord,
          due: new Date(userWord.due),
          last_review: userWord.last_review ? new Date(userWord.last_review) : undefined,
          state: userWord.state as State,
        };

        const scheduling_cards = f.repeat(card, now);
        const intervals = {
          again: formatDueDate(scheduling_cards[Rating.Again].card.due),
          hard: formatDueDate(scheduling_cards[Rating.Hard].card.due),
          good: formatDueDate(scheduling_cards[Rating.Good].card.due),
          easy: formatDueDate(scheduling_cards[Rating.Easy].card.due),
        };

        return { ...word, intervals };
      })
    );

    return cardsWithIntervals.filter(Boolean);
  },
});

export const getRandomWord = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const seenUserWords = await ctx.db.query("userWords").withIndex("by_user_word", q => q.eq("userId", user._id)).collect();
    const seenWordIds = new Set(seenUserWords.map(uw => uw.wordId));
    const allWords = await ctx.db.query("words").collect();
    const unseenWords = allWords.filter(word => !seenWordIds.has(word._id));

    if (unseenWords.length === 0) return [];
    
    const shuffled = unseenWords.sort(() => 0.5 - Math.random());
    const newCards = shuffled.slice(0, 10);

    return newCards.map(word => {
      const card = createEmptyCard(new Date()); // Corrected function call
      const scheduling_cards = f.repeat(card, new Date());
      const intervals = {
        again: formatDueDate(scheduling_cards[Rating.Again].card.due),
        hard: formatDueDate(scheduling_cards[Rating.Hard].card.due),
        good: formatDueDate(scheduling_cards[Rating.Good].card.due),
        easy: formatDueDate(scheduling_cards[Rating.Easy].card.due),
      };
      return { ...word, intervals };
    });
  },
});


// import { query } from "./_generated/server";
// import { v } from "convex/values";
// import { Id } from "./_generated/dataModel";

// // --- Spaced Repetition System (SRS) Logic ---

// // Learning steps for new cards (in minutes). After these, SM-2 takes over.
// const LEARNING_STEPS_MINUTES = [3, 15]; 
// const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// // Helper to format milliseconds into a human-readable string (e.g., "3m", "15m", "1d", "2.1mo").
// function formatInterval(ms: number): string {
//   if (ms < 60 * 1000) return `${Math.round(ms / 1000)}s`;
//   if (ms < 60 * 60 * 1000) return `${Math.round(ms / (60 * 1000))}m`;
//   if (ms < ONE_DAY_MS * 2) return `${(ms / ONE_DAY_MS).toFixed(1)}d`.replace(".0", "");
//   if (ms < ONE_DAY_MS * 30 * 2) return `${(ms / (ONE_DAY_MS * 30)).toFixed(1)}mo`.replace(".0", "");
//   return `${(ms / (ONE_DAY_MS * 365)).toFixed(1)}y`.replace(".0", "");
// }

// /**
//  * Calculates the next review intervals for a given card based on its current state.
//  * This function is the core of the SRS logic.
//  * @param userWord The user's progress on a word, or null if it's a new card.
//  * @returns An object with human-readable interval strings for each rating.
//  */
// function calculateNextIntervals(userWord: any | null) {
//   const isNew = userWord === null;
//   const learningStep = userWord?.learningStep ?? 0;

//   // --- Learning Phase ---
//   // If the card is new or still in the learning phase.
//   if (isNew || userWord.learningStep !== undefined) {
//     const againInterval = LEARNING_STEPS_MINUTES[0] * 60 * 1000;
//     const goodInterval = (LEARNING_STEPS_MINUTES[learningStep] ?? 1) * 60 * 1000;
    
//     return {
//       again: formatInterval(againInterval),
//       hard: formatInterval(Math.max(againInterval, goodInterval / 2)),
//       good: formatInterval(goodInterval),
//       // "Easy" graduates the card immediately to a 4-day interval.
//       easy: formatInterval(4 * ONE_DAY_MS),
//     };
//   }

//   // --- Review Phase (SM-2 Algorithm) ---
//   const easeFactor = userWord.easeFactor;
//   const lastInterval = userWord.interval * ONE_DAY_MS;

//   return {
//     again: formatInterval(lastInterval * 0.5), // Show sooner if forgotten
//     hard: formatInterval(lastInterval * 1.2), // Slightly longer than last time
//     good: formatInterval(lastInterval * easeFactor),
//     easy: formatInterval(lastInterval * easeFactor * 1.3), // Bonus for easy cards
//   };
// }


// /**
//  * Gets all cards that are due for review for the current user.
//  * It now also calculates and attaches the next review intervals for each card.
//  */
// export const getDueCards = query({
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return [];

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
//       .unique();

//     if (!user) return [];

//     const now = Date.now();
//     const dueUserWords = await ctx.db
//       .query("userWords")
//       .withIndex("by_user_due_date", (q) =>
//         q.eq("userId", user._id).lte("dueDate", now)
//       )
//       .collect();

//     const cards = await Promise.all(
//       dueUserWords.map(async (userWord) => {
//         const word = await ctx.db.get(userWord.wordId);
//         if (!word) return null;
        
//         return {
//           ...word,
//           // Attach the calculated intervals for the frontend to display.
//           intervals: calculateNextIntervals(userWord),
//         };
//       })
//     );
    
//     return cards.filter(Boolean);
//   },
// });

// /**
//  * Fetches a batch of 10 new (unseen) words for the user.
//  * It calculates the initial learning intervals for these new cards.
//  */
// export const getRandomWord = query({
//   handler: async (ctx) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) return [];

//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
//       .unique();

//     if (!user) return [];

//     // Get all words the user has already seen.
//     const seenUserWords = await ctx.db.query("userWords").withIndex("by_user_word", q => q.eq("userId", user._id)).collect();
//     const seenWordIds = new Set(seenUserWords.map(uw => uw.wordId));

//     // Fetch all words from the database.
//     // Note: This is inefficient for very large datasets.
//     const allWords = await ctx.db.query("words").collect();
    
//     // Filter out words the user has already seen.
//     const unseenWords = allWords.filter(word => !seenWordIds.has(word._id));

//     if (unseenWords.length === 0) return [];
    
//     // Shuffle and take the first 10 unseen words.
//     const shuffled = unseenWords.sort(() => 0.5 - Math.random());
//     const newCards = shuffled.slice(0, 10);

//     // Attach the initial learning intervals to each new card.
//     return newCards.map(word => ({
//       ...word,
//       intervals: calculateNextIntervals(null),
//     }));
//   },
// });
