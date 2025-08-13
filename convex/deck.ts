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
  args: {
    filter: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    sortDirection: v.optional(v.string()),
  },
  handler: async (ctx, { filter, sortBy, sortDirection }) => {
    const user = await getUser(ctx);
    if (!user) return [];

    const userSents = await ctx.db
      .query("userSents")
      .withIndex("by_user_sent", (q) => q.eq("userId", user._id))
      .collect();

    let combinedData = (
      await Promise.all(
        userSents.map(async (us) => {
          const sentenceDoc = await ctx.db.get(us.sentenceId);
          return sentenceDoc ? { userSent: us, sentenceDoc } : null;
        })
      )
    ).filter(Boolean);

    if (filter) {
      combinedData = combinedData.filter((item) =>
        item.sentenceDoc.sentence.toLowerCase().includes(filter.toLowerCase())
      );
    }

    combinedData.sort((a, b) => {
      const dir = sortDirection === "ascending" ? 1 : -1;
      let valA, valB;
      switch (sortBy) {
        case "text":
          return (
            a.sentenceDoc.sentence
              .toLowerCase()
              .localeCompare(b.sentenceDoc.sentence.toLowerCase()) * dir
          );
        case "due":
          valA = a.userSent.due ?? Infinity;
          valB = b.userSent.due ?? Infinity;
          break;
        case "state":
          valA = mapStateToString(a.userSent.state ?? -1);
          valB = mapStateToString(b.userSent.state ?? -1);
          return valA.localeCompare(valB) * dir;
        case "reps":
          valA = a.userSent.reps;
          valB = b.userSent.reps;
          break;
        // --- ADDED: Sorting cases for range and freq ---
        case "rangeIndex":
          valA = a.sentenceDoc.rangeIndex ?? Infinity;
          valB = b.sentenceDoc.rangeIndex ?? Infinity;
          break;
        case "freqIndex":
          valA = a.sentenceDoc.freqIndex ?? Infinity;
          valB = b.sentenceDoc.freqIndex ?? Infinity;
          break;
        case "avg_rank":
          valA = a.sentenceDoc.avg_rank ?? Infinity;
          valB = b.sentenceDoc.avg_rank ?? Infinity;
          break;
        default: // Default sort by reps descending
          return (b.userSent.reps || 0) - (a.userSent.reps || 0);
      }
      return (valA - valB) * dir;
    });

    return combinedData.map(({ userSent, sentenceDoc }) => {
      const baseData = {
        _id: userSent._id.toString(),
        text: sentenceDoc.sentence,
        reps: userSent.reps,
        rangeIndex: sentenceDoc.rangeIndex ?? "N/A",
        freqIndex: sentenceDoc.freqIndex ?? "N/A",
        avg_rank: sentenceDoc.avg_rank?.toFixed(1) ?? "N/A",
      };
      if (
        userSent.mode === "flashcard" &&
        userSent.due &&
        userSent.state !== undefined
      ) {
        return {
          ...baseData,
          due: formatDueDate(userSent.due),
          state: mapStateToString(userSent.state),
        };
      } else {
        return { ...baseData, due: "N/A", state: "Read" };
      }
    });
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
      const dir = sortDirection === "ascending" ? 1 : -1;
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
        case "reps":
          valA = a.userWord.reps;
          valB = b.userWord.reps;
          break;
        case "state":
          valA = mapStateToString(a.userWord.state);
          valB = mapStateToString(b.userWord.state);
          return valA.localeCompare(valB) * dir;
        case "word":
          valA = a.word.esperanto.toLowerCase();
          valB = b.word.esperanto.toLowerCase();
          return valA.localeCompare(valB) * dir;
        default:
          return 0;
      }
      return (valA - valB) * dir;
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
