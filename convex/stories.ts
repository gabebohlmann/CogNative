// convex/stories.ts
import { query } from "./_generated/server";

/**
 * Fetches the first story from the database.
 * In a real application, you might expand this to fetch stories by ID
 * or provide a list of available stories.
 */
export const getFirstStory = query({
  handler: async (ctx) => {
    // For demonstration, we'll just grab the first story available.
    return await ctx.db.query("stories").first();
  },
});
