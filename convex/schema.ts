// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { State } from "ts-fsrs";

export default defineSchema({
  words: defineTable({
    rangeIndex: v.optional(v.float64()),
    freqIndex: v.optional(v.float64()),
    esperanto: v.string(),
    esperantoAudio: v.optional(v.string()),
    english: v.string(),
    englishTranslationSource: v.optional(v.string()),
    englishAudio: v.optional(v.string()),
    sampleUsage: v.optional(v.string()),
    sampleUsageAudio: v.optional(v.string()),
    relatedWords: v.optional(v.string()),
    relatedWordsAudio: v.optional(v.string()),
    esperantoAudioSource: v.optional(v.string()),
    rangeIndexOriginal: v.optional(v.float64()),
    tags: v.optional(v.string()),
  })
    .index("by_esperanto", ["esperanto"])
    .index("by_english", ["english"])
    .index("by_tags", ["tags"]),

  // This table now stores the state of an FSRS card.
  userWords: defineTable({
    userId: v.id("users"),
    wordId: v.id("words"),
    // FSRS card fields
    due: v.number(), // Stored as a timestamp
    stability: v.float64(),
    difficulty: v.float64(),
    elapsed_days: v.float64(),
    scheduled_days: v.float64(),
    reps: v.float64(),
    lapses: v.float64(),
    state: v.number(), // Corresponds to FSRS State enum (New, Learning, etc.)
    last_review: v.optional(v.number()), // Stored as a timestamp
    learning_steps: v.number(),
  })
    .index("by_user_word", ["userId", "wordId"])
    .index("by_user_due_date", ["userId", "due"]),
    
  users: defineTable({
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
});

// import { defineSchema, defineTable } from "convex/server";
// import { v } from "convex/values";

// export default defineSchema({
//   words: defineTable({
//     rangeIndex: v.optional(v.float64()),
//     freqIndex: v.optional(v.float64()),
//     esperanto: v.string(),
//     esperantoAudio: v.optional(v.string()),
//     english: v.string(),
//     englishTranslationSource: v.optional(v.string()),
//     englishAudio: v.optional(v.string()),
//     sampleUsage: v.optional(v.string()),
//     sampleUsageAudio: v.optional(v.string()),
//     relatedWords: v.optional(v.string()),
//     relatedWordsAudio: v.optional(v.string()),
//     esperantoAudioSource: v.optional(v.string()),
//     rangeIndexOriginal: v.optional(v.float64()),
//     tags: v.optional(v.string()),
//   })
//     .index("by_esperanto", ["esperanto"])
//     .index("by_english", ["english"])
//     .index("by_tags", ["tags"])
//     .index("by_rangeIndex", ["rangeIndex"]),
//   userWords: defineTable({
//     userId: v.id("users"),
//     wordId: v.id("words"),
//     easeFactor: v.float64(),
//     interval: v.float64(),
//     dueDate: v.number(),
//     repetitions: v.number(),
//     learningStep: v.optional(v.number()), 
//   })
//     .index("by_user_word", ["userId", "wordId"])
//     .index("by_user_due_date", ["userId", "dueDate"]),
//   users: defineTable({
//     tokenIdentifier: v.string(),
//   }).index("by_token", ["tokenIdentifier"]),
// });
