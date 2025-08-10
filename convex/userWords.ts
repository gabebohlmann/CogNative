import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { fsrs, FSRS, generatorParameters, Card, State, Rating, Grade, createEmptyCard } from "ts-fsrs";

// --- FSRS Setup (must match the one in words.ts) ---
const LEARNING_STEPS: `${number}m`[] = ["3m", "15m"];
const GRADUATING_INTERVAL = 1;
const EASY_INTERVAL = 4;

const params = generatorParameters({
  learning_steps: LEARNING_STEPS,
  graduating_interval: GRADUATING_INTERVAL,
  easy_interval: EASY_INTERVAL,
});
const f: FSRS = fsrs(params);

// --- Helper Function ---
async function getUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("User not authenticated.");
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new Error("User not found.");
  return user;
}

// --- Main Mutation ---
export const updateUserWord = mutation({
  args: {
    wordId: v.id("words"),
    rating: v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy")),
  },
  handler: async (ctx, { wordId, rating }) => {
    const user = await getUser(ctx);
    const now = new Date();

    const ratingMap: { [key: string]: Grade } = {
      again: Rating.Again,
      hard: Rating.Hard,
      good: Rating.Good,
      easy: Rating.Easy,
    };
    const grade = ratingMap[rating];

    const userWordDoc = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id).eq("wordId", wordId))
      .unique();

    const card: Card = userWordDoc
      ? {
          ...userWordDoc,
          due: new Date(userWordDoc.due),
          last_review: userWordDoc.last_review ? new Date(userWordDoc.last_review) : undefined,
          state: userWordDoc.state as State,
        }
      : createEmptyCard(now); // Corrected function call

    const scheduling_cards = f.repeat(card, now);
    const newCardState = scheduling_cards[grade].card;

    const dataToStore = {
      ...newCardState,
      due: newCardState.due.getTime(),
      last_review: newCardState.last_review ? newCardState.last_review.getTime() : undefined,
      userId: user._id,
      wordId,
    };

    if (userWordDoc) {
      await ctx.db.patch(userWordDoc._id, dataToStore);
    } else {
      await ctx.db.insert("userWords", dataToStore);
    }

    return { success: true };
  },
});


// import { mutation } from "./_generated/server";
// import { v } from "convex/values";
// import { query } from "./_generated/server";

// // --- Spaced Repetition System (SRS) Logic ---

// const LEARNING_STEPS_MINUTES = [3, 15]; // Learning steps for new cards
// const ONE_DAY_MS = 24 * 60 * 60 * 1000;
// const ONE_MINUTE_MS = 60 * 1000;

// // Helper function to get the current user
// const getUser = async (ctx: any) => {
//     const identity = await ctx.auth.getUserIdentity();
//     if (!identity) {
//       throw new Error("User not authenticated.");
//     }
//     const user = await ctx.db
//       .query("users")
//       .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
//       .unique();
//     if (!user) {
//       throw new Error("User not found in database.");
//     }
//     return user;
// }


// export const updateUserWord = mutation({
//   args: {
//     wordId: v.id("words"),
//     rating: v.union(v.literal("again"), v.literal("hard"), v.literal("good"), v.literal("easy")),
//   },
//   handler: async (ctx, { wordId, rating }) => {
//     const user = await getUser(ctx);
    
//     const userWord = await ctx.db
//       .query("userWords")
//       .withIndex("by_user_word", (q) => q.eq("userId", user._id).eq("wordId", wordId))
//       .unique();

//     const isNew = userWord === null;
//     let {
//         easeFactor = 2.5,
//         interval = 0,
//         repetitions = 0,
//         learningStep = 0,
//     } = userWord || {};

//     let dueDate = Date.now();

//     // --- Learning Phase ---
//     if (isNew || userWord.learningStep !== undefined) {
//       if (rating === 'again') {
//         learningStep = 0; // Reset to the first step
//         dueDate = Date.now() + LEARNING_STEPS_MINUTES[0] * ONE_MINUTE_MS;
//       } else if (rating === 'good') {
//         if (learningStep < LEARNING_STEPS_MINUTES.length - 1) {
//           // Advance to the next learning step
//           learningStep += 1;
//           dueDate = Date.now() + LEARNING_STEPS_MINUTES[learningStep] * ONE_MINUTE_MS;
//         } else {
//           // Graduate the card
//           interval = 1; // First interval is 1 day
//           dueDate = Date.now() + interval * ONE_DAY_MS;
//           // Set learningStep to null to signify graduation
//           await ctx.db.patch(userWord._id, { learningStep: null });
//         }
//       } else if (rating === 'easy') {
//         // Graduate immediately
//         interval = 4; // Easy graduates to a 4-day interval
//         dueDate = Date.now() + interval * ONE_DAY_MS;
//         if (userWord) await ctx.db.patch(userWord._id, { learningStep: null });
//       }
//       // "Hard" repeats the current step after a delay
//       else if (rating === 'hard') {
//           const currentStepInterval = LEARNING_STEPS_MINUTES[learningStep] * ONE_MINUTE_MS;
//           dueDate = Date.now() + currentStepInterval / 2;
//       }
//     } 
//     // --- Review Phase (SM-2) ---
//     else {
//       if (rating === 'again') {
//         repetitions = 0;
//         easeFactor = Math.max(1.3, easeFactor - 0.2);
//         interval = 1; // Reset interval
//       } else {
//         repetitions += 1;
//         if (rating === 'good') {
//           // No change to easeFactor
//         } else if (rating === 'hard') {
//           easeFactor = Math.max(1.3, easeFactor - 0.15);
//         } else if (rating === 'easy') {
//           easeFactor += 0.15;
//         }
        
//         if (repetitions === 1) interval = 1;
//         else if (repetitions === 2) interval = 6;
//         else interval = Math.ceil(interval * easeFactor);
//       }
//       dueDate = Date.now() + interval * ONE_DAY_MS;
//     }

//     if (userWord) {
//       // If the record exists, update it
//       await ctx.db.patch(userWord._id, { easeFactor, interval, repetitions, dueDate, learningStep });
//     } else {
//       // Otherwise, create a new record
//       await ctx.db.insert("userWords", { userId: user._id, wordId, easeFactor, interval, repetitions, dueDate, learningStep });
//     }

//     return { success: true };
//   },
// });
