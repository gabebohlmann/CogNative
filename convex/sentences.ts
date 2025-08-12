import { query } from "./_generated/server";
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

export const getSentenceForReview = query({
  args: { seenSentenceIds: v.array(v.id("sentences")) },
  handler: async (ctx, { seenSentenceIds }) => {
    const user = await getUser(ctx);
    if (!user) return null;

    // 1. Fetch all user words and their corresponding base words
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

    // 2. Create sets for efficient lookups
    const knownWords = new Set(userWordMap.keys());
    const dueWords = new Set();
    for (const [word, userWord] of userWordMap.entries()) {
      if (userWord.due <= Date.now()) {
        dueWords.add(word);
      }
    }

    // 3. Fetch all sentences, excluding those already seen in this session
    const allSentences = await ctx.db.query("sentences").collect();
    const unseenSentences = allSentences.filter(
      (s) => !seenSentenceIds.includes(s._id)
    );

    let bestSentence = null;
    let bestScore = -1;

    // --- Phase 1: Prioritize Sentences with Due Review Words ---
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

        const score = dueWordCount / wordsInSentence.size; // % of words that are due
        if (score > bestScore) {
          bestScore = score;
          bestSentence = sentence;
        }
      }
    }

    // --- Phase 2: If no reviews are due, find sentences with one new word ---
    if (bestScore <= 0) {
      // Using <= 0 ensures this runs if no sentences with due words were found
      bestScore = -1; // Reset score for this phase
      for (const sentence of unseenSentences) {
        const wordsInSentence = new Set(
          sentence.sentence.toLowerCase().match(/[a-zĉĝĥĵŝŭ'’]+/g) || []
        );
        if (wordsInSentence.size === 0) continue;

        let newWordCount = 0;
        for (const word of wordsInSentence) {
          if (!knownWords.has(word)) {
            newWordCount++;
          }
        }

        // We only want sentences with exactly one new word
        if (newWordCount === 1) {
          // Score is the ratio of known words, preferring more context
          const score = (wordsInSentence.size - 1) / wordsInSentence.size;
          if (score > bestScore) {
            bestScore = score;
            bestSentence = sentence;
          }
        }
      }
    }

    // If no ideal sentence is found, you might want a fallback, e.g., a random sentence.
    // For now, it will return null if no match is found.
    return bestSentence;
  },
});
