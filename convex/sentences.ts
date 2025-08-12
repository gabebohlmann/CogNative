// convex/sentences.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const State = { Review: 2 };

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
      // If it exists, increment the rep count
      await ctx.db.patch(existing._id, { reps: existing.reps + 1 });
    } else {
      // If it's the first time, insert it with a rep count of 1
      await ctx.db.insert("userSents", {
        userId: user._id,
        sentenceId: sentenceId,
        reps: 1,
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
