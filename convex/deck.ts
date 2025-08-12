// convex/deck.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

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

function formatDueDate(due: number): string {
  const now = Date.now();
  const diffMs = due - now;
  if (diffMs <= 0) return "Due";
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return `${diffDays}d`;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours > 1) return `${diffHours}h`;
  const diffMins = Math.round(diffMs / (1000 * 60));
  return `${diffMins}m`;
}

function mapStateToString(state: number): string {
  switch (state) {
    case State.Learning:
      return "Learning";
    case State.Review:
      return "Learned";
    case State.Relearning:
      return "Relearning";
    default:
      return "New";
  }
}

export const getSeenSentences = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const userSents = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) => q.eq("userId", user._id))
      .collect();

    const sentences = await Promise.all(
      userSents.map(async (us) => {
        const sentenceDoc = await ctx.db.get(us.sentenceId);
        if (!sentenceDoc) return null;
        // Include the sentence data AND the reps count
        return {
          ...sentenceDoc,
          reps: us.reps,
        };
      })
    );

    return sentences
      .filter(Boolean)
      .sort((a, b) => (b.reps || 0) - (a.reps || 0)); // Sort by reps descending
  },
});

export const getDeckWords = query({
  // --- MODIFICATION: Add args for sorting ---
  args: {
    sortBy: v.string(),
    sortDirection: v.string(),
  },
  handler: async (ctx, { sortBy, sortDirection }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const allUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();

    // --- MODIFICATION: Combine data BEFORE sorting ---
    const combinedData = (
      await Promise.all(
        allUserWords.map(async (userWord) => {
          const word = await ctx.db.get(userWord.wordId);
          return word ? { userWord, word } : null;
        })
      )
    ).filter(Boolean);

    // --- MODIFICATION: Dynamic sorting logic ---
    combinedData.sort((a, b) => {
      let valA, valB;

      // Handle the default two-level sort
      if (sortBy === "default") {
        const dueDiff = a.userWord.due - b.userWord.due;
        if (dueDiff !== 0) return dueDiff;
        // Secondary sort by rangeIndex if due dates are the same
        return (
          (a.word.rangeIndex ?? Infinity) - (b.word.rangeIndex ?? Infinity)
        );
      }

      switch (sortBy) {
        case "due":
          valA = a.userWord.due;
          valB = b.userWord.due;
          break;
        case "rangeIndex":
          valA = a.word.rangeIndex ?? Infinity;
          valB = b.word.rangeIndex ?? Infinity;
          break;
        case "freqIndex":
          valA = a.word.freqIndex ?? Infinity;
          valB = b.word.freqIndex ?? Infinity;
          break;
        default:
          valA = a.word.esperanto;
          valB = b.word.esperanto;
      }

      if (valA < valB) return sortDirection === "ascending" ? -1 : 1;
      if (valA > valB) return sortDirection === "ascending" ? 1 : -1;
      return 0;
    });

    // Map to final format after sorting
    return combinedData.map(({ userWord, word }) => ({
      _id: userWord._id.toString(),
      esperanto: word.esperanto,
      english: word.english,
      due: formatDueDate(userWord.due),
      stability: userWord.stability.toFixed(1),
      difficulty: userWord.difficulty.toFixed(1),
      reps: userWord.reps,
      state: mapStateToString(userWord.state),
      rangeIndex: word.rangeIndex ?? "N/A",
      freqIndex: word.freqIndex ?? "N/A",
    }));
  },
});
