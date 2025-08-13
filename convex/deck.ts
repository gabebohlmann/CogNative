import { query } from "./_generated/server";
import { v } from "convex/values";

const State = { New: 0, Learning: 1, Review: 2, Relearning: 3 };

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
  args: { filter: v.optional(v.string()) },
  handler: async (ctx, { filter }) => {
    const user = await getUser(ctx);
    if (!user) return [];
    const userSents = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) => q.eq("userId", user._id))
      .collect();
    let sentencesData = await Promise.all(
      userSents.map(async (us) => {
        const sentenceDoc = await ctx.db.get(us.sentenceId);
        if (!sentenceDoc) return null;
        if (us.mode === "flashcard" && us.due && us.state !== undefined) {
          return {
            _id: us._id.toString(),
            text: sentenceDoc.sentence,
            due: formatDueDate(us.due),
            state: mapStateToString(us.state),
            reps: us.reps,
            rangeIndex: sentenceDoc.rangeIndex ?? "N/A",
            freqIndex: sentenceDoc.freqIndex ?? "N/A",
            avg_rank: sentenceDoc.avg_rank?.toFixed(1) ?? "N/A",
          };
        } else {
          return {
            _id: us._id.toString(),
            text: sentenceDoc.sentence,
            due: "N/A",
            state: "Read",
            reps: us.reps,
            rangeIndex: sentenceDoc.rangeIndex ?? "N/A",
            freqIndex: sentenceDoc.freqIndex ?? "N/A",
            avg_rank: sentenceDoc.avg_rank?.toFixed(1) ?? "N/A",
          };
        }
      })
    );
    let finalData = sentencesData.filter(Boolean);
    if (filter) {
      finalData = finalData.filter((item) =>
        item.text.toLowerCase().includes(filter.toLowerCase())
      );
    }
    return finalData.sort((a, b) => (b.reps || 0) - (a.reps || 0));
  },
});

export const getDeckWords = query({
  args: {
    sortBy: v.string(),
    sortDirection: v.string(),
    filter: v.optional(v.string()),
  },
  handler: async (ctx, { sortBy, sortDirection, filter }) => {
    const user = await getUser(ctx);
    if (!user) return [];
    const allUserWords = await ctx.db
      .query("userWords")
      .withIndex("by_user_word", (q) => q.eq("userId", user._id))
      .collect();
    let combinedData = (
      await Promise.all(
        allUserWords.map(async (userWord) => {
          const word = await ctx.db.get(userWord.wordId);
          return word ? { userWord, word } : null;
        })
      )
    ).filter(Boolean);
    if (filter) {
      combinedData = combinedData.filter((item) =>
        item.word.esperanto.toLowerCase().startsWith(filter.toLowerCase())
      );
    }
    combinedData.sort((a, b) => {
      let valA, valB;
      if (sortBy === "default") {
        const dueDiff = a.userWord.due - b.userWord.due;
        if (dueDiff !== 0) return dueDiff;
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
