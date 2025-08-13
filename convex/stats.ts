// convex/stats.ts
import { query } from "./_generated/server";

// FSRS State enum values for clarity
const State = {
  New: 0,
  Learning: 1,
  Review: 2, // This corresponds to "Learned"
  Relearning: 3,
};

// Helper function to get the current user
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

export const getStats = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) {
      return {
        newToday: 0,
        learning: 0,
        learned: 0,
        dueToday: 0,
        totalKnown: 0,
        sentencesLearnedRank: 0,
        sentencesLearnedFlashcard: 0,
        totalSentencesSeen: 0,
      };
    }

    // --- Word Stats Calculation ---
    const allUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();

    const now = new Date();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    let learningCount = 0;
    let learnedCount = 0;
    let dueTodayCount = 0;

    for (const word of allUserWords) {
      if (word.state === State.Learning || word.state === State.Relearning) {
        learningCount++;
      }
      if (word.state === State.Review) {
        learnedCount++;
      }
      if (word.due <= endOfToday.getTime()) {
        dueTodayCount++;
      }
    }

    // --- MODIFICATION: Sentence Stats Calculation ---
    // Fetch all sentence records for the user in one go.
    const allUserSents = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) => q.eq("userId", user._id))
      .collect();

    // Calculate the flashcard-specific count from the list.
    const sentencesLearnedFlashcard = allUserSents.filter(
      (s) => s.mode === "flashcard"
    ).length;

    return {
      newToday: user.newCardsSeenToday ?? 0,
      learning: learningCount,
      learned: learnedCount,
      dueToday: dueTodayCount,
      totalKnown: allUserWords.length,
      sentencesLearnedRank: user.maxSentRangeIndex ?? 0,
      sentencesLearnedFlashcard: sentencesLearnedFlashcard, // The count from flashcard mode
      totalSentencesSeen: allUserSents.length, // The total count from all modes
    };
  },
});
