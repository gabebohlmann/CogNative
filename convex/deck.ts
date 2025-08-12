// convex/deck.ts
import { query } from "./_generated/server";

// FSRS State enum values for clarity
const State = {
  New: 0,
  Learning: 1,
  Review: 2,
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

// Formats the due date timestamp into a human-readable string
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

// Maps the FSRS state number to a descriptive name
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

export const getDeckWords = query({
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const allUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();

    // Sort words by their due date, with the soonest due first
    allUserWords.sort((a, b) => a.due - b.due);

    // Combine userWord data with the original word data from the 'words' table
    const deckData = await Promise.all(
      allUserWords.map(async (userWord) => {
        const word = await ctx.db.get(userWord.wordId);
        if (!word) return null; // Skip if the base word is not found

        return {
          _id: userWord._id.toString(), // Use string ID for keys
          esperanto: word.esperanto,
          english: word.english,
          due: formatDueDate(userWord.due),
          stability: userWord.stability.toFixed(1),
          difficulty: userWord.difficulty.toFixed(1),
          reps: userWord.reps,
          state: mapStateToString(userWord.state),
        };
      })
    );

    // Filter out any entries that couldn't be joined
    return deckData.filter(Boolean);
  },
});