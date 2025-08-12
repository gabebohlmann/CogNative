// convex/sentences.ts
import { query } from "./_generated/server";

export const getSentences = query({
  handler: async (ctx) => {
    // Fetch all sentences and order them. You might want to add
    // pagination here in the future if the list becomes very long.
    return await ctx.db
      .query("sentences")
      .withIndex("by_rangeIndex")
      .order("asc")
      .collect();
  },
});