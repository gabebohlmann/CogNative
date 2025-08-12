import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    .index("by_tags", ["tags"])
    .index("by_rangeIndex", ["rangeIndex"]),

  userWords: defineTable({
    userId: v.id("users"),
    wordId: v.id("words"),
    due: v.number(),
    stability: v.float64(),
    difficulty: v.float64(),
    elapsed_days: v.float64(),
    scheduled_days: v.float64(),
    reps: v.float64(),
    lapses: v.float64(),
    state: v.number(),
    last_review: v.optional(v.number()),
  })
    .index("by_user_word", ["userId", "wordId"])
    .index("by_user_due_date", ["userId", "due"]),

  users: defineTable({
    tokenIdentifier: v.string(),
    lastSession: v.optional(v.number()),
    newCardsSeenToday: v.optional(v.number()),
    lastResetDate: v.optional(v.string()),
    // --- ADDED FIELD ---
    maxSentRangeIndex: v.optional(v.number()), // Tracks sentence flashcard progress
    settings: v.optional(
      v.object({
        request_retention: v.float64(),
        maximum_interval: v.float64(),
        learning_steps: v.array(v.string()),
        relearning_steps: v.array(v.string()),
        easy_interval: v.float64(),
        new_cards_per_day: v.float64(),
        reviews_per_day: v.float64(),
      })
    ),
  }).index("by_token", ["tokenIdentifier"]),

  stories: defineTable({
    title: v.string(),
    content: v.string(),
  }),

  sentences: defineTable({
    sentence: v.string(),
    range: v.optional(v.float64()),
    rangeIndex: v.optional(v.float64()),
    freq: v.optional(v.float64()),
    freqIndex: v.optional(v.float64()),
    max_rank: v.optional(v.float64()),
    avg_rank: v.optional(v.float64()),
    path: v.optional(v.string()),
  }).index("by_rangeIndex", ["rangeIndex"]),

  // --- MODIFIED TABLE ---
  userSents: defineTable({
    userId: v.id("users"),
    sentenceId: v.id("sentences"),
    reps: v.number(),
    mode: v.string(), 
    due: v.optional(v.number()),
    stability: v.optional(v.float64()),
    difficulty: v.optional(v.float64()),
    elapsed_days: v.optional(v.float64()),
    scheduled_days: v.optional(v.float64()),
    lapses: v.optional(v.float64()),
    state: v.optional(v.number()),
    last_review: v.optional(v.number()),
  }).index("by_user_sent", ["userId", "sentenceId"]),
});
