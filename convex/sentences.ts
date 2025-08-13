// convex/sentences.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  fsrs,
  FSRS,
  generatorParameters,
  Card,
  State,
  Rating,
  createEmptyCard,
} from "ts-fsrs";
import { gradeWordLogic } from "./userWords"; 

// --- Helper Functions ---

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

// --- NEWLY ADDED HELPER FUNCTION ---
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

// --- Queries and Mutations ---

export const getSentenceFlashcard = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    const settings = user?.settings;
    if (!user || !settings) return null;

    const userSents = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("mode"), "flashcard"))
      .collect();

    let nextUserSent = userSents
      .sort((a, b) => a.due! - b.due!)
      .find((s) => s.due! <= Date.now());

    let card: Card;
    const now = new Date();
    const f = getFsrsInstance(settings);

    if (nextUserSent) {
      card = {
        ...createEmptyCard(),
        ...nextUserSent,
        due: new Date(nextUserSent.due!),
        last_review: nextUserSent.last_review
          ? new Date(nextUserSent.last_review)
          : undefined,
      };
    } else {
      const maxRangeIndex = user.maxSentRangeIndex ?? 0;
      const nextSentenceDoc = await ctx.db
        .query("sentences")
        .withIndex("by_rangeIndex")
        .filter((q) => q.gt(q.field("rangeIndex"), maxRangeIndex))
        .order("asc")
        .first();

      if (!nextSentenceDoc) return null;

      card = createEmptyCard(now);
      (card as any).sentenceId = nextSentenceDoc._id;
    }

    const intervals = f.repeat(card, now);
    const sentenceId = nextUserSent
      ? nextUserSent.sentenceId
      : (card as any).sentenceId;
    const sentenceDoc = await ctx.db.get(sentenceId);
    if (!sentenceDoc) return null;

    return {
      _id: sentenceId,
      front: sentenceDoc.sentence,
      back: sentenceDoc.englishTranslation,
      intervals: {  
        again: formatDueDate(intervals[Rating.Again].card.due),
        hard: formatDueDate(intervals[Rating.Hard].card.due),
        good: formatDueDate(intervals[Rating.Good].card.due),
        easy: formatDueDate(intervals[Rating.Easy].card.due),
      },
    };
  },
});

// --- MODIFIED: gradeSentence mutation ---
export const gradeSentence = mutation({
  args: { sentenceId: v.id("sentences"), rating: v.string() },
  handler: async (ctx, { sentenceId, rating }) => {
    const user = await getUser(ctx);
    const settings = user?.settings;
    if (!user || !settings) return;

    const sentence = await ctx.db.get(sentenceId);
    if (!sentence) return;

    // ... (logic to grade the sentence itself remains the same)
    const f = getFsrsInstance(settings);
    const fsrsRating = mapRating(rating);
    const now = new Date();
    let userSent = await ctx.db.query("userSents").withIndex("by_user_sent", (q) => q.eq("userId", user._id).eq("sentenceId", sentenceId)).first();
    let card: Card;
    if (userSent && userSent.mode === "flashcard") {
      card = { ...createEmptyCard(), ...userSent, due: new Date(userSent.due!), last_review: userSent.last_review ? new Date(userSent.last_review) : undefined, };
    } else {
      card = createEmptyCard(now);
    }
    const scheduled = f.repeat(card, now)[fsrsRating];
    const newCard = scheduled.card;
    const dataToStore = {
      userId: user._id,
      sentenceId: sentenceId,
      reps: (userSent?.reps ?? 0) + 1,
      mode: "flashcard",
      due: newCard.due.getTime(),
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsed_days: newCard.elapsed_days,
      scheduled_days: newCard.scheduled_days,
      lapses: newCard.lapses,
      state: newCard.state,
      last_review: newCard.last_review!.getTime(),
    };
    if (userSent) {
      await ctx.db.patch(userSent._id, dataToStore);
    } else {
      await ctx.db.insert("userSents", dataToStore);
    }
    if ((sentence.rangeIndex ?? 0) > (user.maxSentRangeIndex ?? 0)) {
      await ctx.db.patch(user._id, { maxSentRangeIndex: sentence.rangeIndex });
    }
    // --- End of sentence grading logic ---

    // MODIFICATION: Call the helper function directly instead of using the scheduler.
    const wordsInSentence = new Set(sentence.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []);
    for (const word of wordsInSentence) {
      // This direct call preserves the user's identity.
      await gradeWordLogic(ctx, { userId: user._id, user, wordText: word, rating, settings });
    }
  },
});

export const markSentenceAsSeen = mutation({
  args: { sentenceId: v.id("sentences") },
  handler: async (ctx, { sentenceId }) => {
    const user = await getUser(ctx);
    if (!user) return;

    const existing = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) =>
        q.eq("userId", user._id).eq("sentenceId", sentenceId)
      )
      .first();

    if (existing) {
      if (existing.mode === "reading") {
        await ctx.db.patch(existing._id, { reps: existing.reps + 1 });
      }
    } else {
      await ctx.db.insert("userSents", {
        userId: user._id,
        sentenceId: sentenceId,
        reps: 1,
        mode: "reading",
      });
    }
  },
});

export const getSentenceForReview = query({
  args: { seenSentenceIds: v.array(v.id("sentences")) },
  handler: async (ctx, { seenSentenceIds }) => {
    const user = await getUser(ctx);
    if (!user) return null;

    const allUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();

    const wordDocs = await Promise.all(
      allUserWords.map((uw) => ctx.db.get(uw.wordId))
    );
    const userWordMap = new Map(
      allUserWords.map((uw, i) => [wordDocs[i]?.esperanto, uw])
    );

    const knownWords = new Set(userWordMap.keys());
    const dueWords = new Set();
    for (const [word, userWord] of userWordMap.entries()) {
      if (userWord.due <= Date.now()) {
        dueWords.add(word);
      }
    }

    const allSentences = await ctx.db.query("sentences").collect();
    const unseenSentences = allSentences.filter(
      (s) => !seenSentenceIds.includes(s._id)
    );

    let bestSentence = null;
    let bestScore = -1;

    if (dueWords.size > 0) {
      for (const sentence of unseenSentences) {
        const wordsInSentence = new Set(
          sentence.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
        );
        if (wordsInSentence.size === 0) continue;

        let dueWordCount = 0;
        for (const word of wordsInSentence) {
          if (dueWords.has(word)) {
            dueWordCount++;
          }
        }

        const score = dueWordCount / wordsInSentence.size;
        if (score > bestScore) {
          bestScore = score;
          bestSentence = sentence;
        }
      }
    }

    if (bestScore <= 0) {
      const allWordsSorted = await ctx.db
        .query("words")
        .withIndex("by_rangeIndex")
        .order("asc")
        .collect();
      let nextNewWord = null;
      for (const word of allWordsSorted) {
        if (!knownWords.has(word.esperanto)) {
          nextNewWord = word;
          break;
        }
      }

      if (nextNewWord) {
        const candidateSentences = unseenSentences.filter((s) => {
          const words = new Set(
            s.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
          );
          return words.has(nextNewWord.esperanto);
        });

        if (candidateSentences.length > 0) {
          candidateSentences.sort((a, b) => {
            const wordsA = new Set(
              a.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
            );
            const wordsB = new Set(
              b.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
            );

            let newWordsA = 0;
            wordsA.forEach((w) => {
              if (!knownWords.has(w)) newWordsA++;
            });
            let newWordsB = 0;
            wordsB.forEach((w) => {
              if (!knownWords.has(w)) newWordsB++;
            });

            const newWordDiff = newWordsA - newWordsB;
            if (newWordDiff !== 0) {
              return newWordDiff;
            }

            return (a.max_rank ?? Infinity) - (b.max_rank ?? Infinity);
          });

          bestSentence = candidateSentences[0];
        }
      }
    }

    return bestSentence;
  },
});
