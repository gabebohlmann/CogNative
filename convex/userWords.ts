          // convex/userWords.ts
          import { v } from "convex/values";
          import { query, mutation } from "./_generated/server";
          import { Id } from "./_generated/dataModel";

          export const gradeWord = mutation({
            args: { wordText: v.string(), rating: v.string() },
            handler: async (ctx, { wordText, rating }) => {
              const identity = await ctx.auth.getUserIdentity();
              if (!identity) {
                throw new Error("User not authenticated.");
              }
              const tokenIdentifier = identity.subject;

              // --- FIX START ---
              // 1. Find the user document using their tokenIdentifier.
              const user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
                .first();

              let userId: Id<"users">;

              if (!user) {
                // If the user document doesn't exist, create it on the fly.
                userId = await ctx.db.insert("users", {
                  tokenIdentifier: tokenIdentifier,
                  // You can initialize default settings here if needed
                  // settings: { ...defaultSettings }
                });
              } else {
                // If the user exists, use their existing database _id.
                userId = user._id;
              }
              // --- FIX END ---

              // 2. Find the word in the main 'words' table.
              const word = await ctx.db
                .query("words")
                .withIndex("by_esperanto", (q) => q.eq("esperanto", wordText))
                .first();

              if (!word) {
                // It's better to log this on the server than to throw, to avoid crashing the app.
                console.warn(
                  `Word "${wordText}" not found in the dictionary. Skipping grade.`
                );
                return;
              }

              // 3. Check if a 'userWords' entry already exists for this user and word.
              const userWord = await ctx.db
                .query("userWords")
                .withIndex("by_user_word", (q) =>
                  q.eq("userId", userId).eq("wordId", word._id)
                )
                .first();

              if (userWord) {
                // If it exists, update its FSRS state here.
                await ctx.db.patch(userWord._id, {
                  last_review: Date.now(),
                  // TODO: Add FSRS update logic based on 'rating'
                });
              } else {
                // If it doesn't exist, create a new entry with the correct userId.
                await ctx.db.insert("userWords", {
                  userId: userId, // Use the correct ID here
                  wordId: word._id,
                  due: Date.now(),
                  stability: 0,
                  difficulty: 0,
                  elapsed_days: 0,
                  scheduled_days: 0,
                  reps: 0,
                  lapses: 0,
                  state: 0, // State.New
                  last_review: Date.now(),
                  learning_steps: 0,
                });
              }
            },
          });

          // This query correctly fetches from the 'words' table.
          export const getByText = query({
            args: { wordText: v.string() },
            handler: async (ctx, args) => {
              if (!args.wordText) return null;

              const word = await ctx.db
                .query("words")
                .withIndex("by_esperanto", (q) => q.eq("esperanto", args.wordText))
                .first();

              return word;
            },
          });
