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
      // Return a default state for logged-out users
      return {
        newToday: 0,
        learning: 0,
        learned: 0,
        dueToday: 0,
        totalKnown: 0,
        sentencesLearned: 0,
      };
    }

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
      // "Learning" includes cards in both the initial learning and relearning steps.
      if (word.state === State.Learning || word.state === State.Relearning) {
        learningCount++;
      }

      // "Learned" are cards in the long-term review state.
      if (word.state === State.Review) {
        learnedCount++;
      }

      // Count any card scheduled for review from now until the end of the day.
      if (word.due <= endOfToday.getTime()) {
        dueTodayCount++;
      }
    }

    return {
      newToday: user.newCardsSeenToday ?? 0,
      learning: learningCount,
      learned: learnedCount,
      dueToday: dueTodayCount,
      totalKnown: allUserWords.length,
      sentencesLearned: user.maxSentRangeIndex ?? 0,
    };
  },
});