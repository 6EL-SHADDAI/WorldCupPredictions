import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
  "postponed",
])

export const matchStageEnum = pgEnum("match_stage", [
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
])

// ─── Matches ──────────────────────────────────────────────────────────────────
// Source of truth. Seeded from football-data.org, updated via cron.

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: integer("external_id").notNull().unique(), // football-data.org match id
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  homeTeamCode: text("home_team_code").notNull(), // e.g. "BRA"
  awayTeamCode: text("away_team_code").notNull(),
  stage: matchStageEnum("stage").notNull(),
  status: matchStatusEnum("status").notNull().default("scheduled"),
  kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  winner: text("winner"), // "home" | "away" | "draw"
  wentToExtraTime: boolean("went_to_extra_time").notNull().default(false),
  wentToPenalties: boolean("went_to_penalties").notNull().default(false),
  scoredAt: timestamp("scored_at", { withTimezone: true }), // when predictions were scored
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Questions ────────────────────────────────────────────────────────────────
// 8 questions per match. Seeded when match is created, correct_answer filled after.

export type QuestionOption = {
  value: string
  label: string
}

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(), // "winner" | "margin" | "extra_time" etc.
    questionText: text("question_text").notNull(),
    options: jsonb("options").$type<QuestionOption[]>().notNull(),
    correctAnswer: text("correct_answer"), // null until match is finished + scored
    isKnockoutOnly: boolean("is_knockout_only").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => ({
    matchKeyUniq: uniqueIndex("questions_match_key_uniq").on(t.matchId, t.questionKey),
    matchIdx: index("questions_match_idx").on(t.matchId),
  })
)

// ─── Predictions ─────────────────────────────────────────────────────────────
// One row per user per match. answers is a map of questionKey -> chosen option value.

export type PredictionAnswers = Record<string, string> // { winner: "home", margin: "1", ... }

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    anonUserId: text("anon_user_id").notNull(), // UUID from localStorage
    answers: jsonb("answers").$type<PredictionAnswers>().notNull(),
    confidence: integer("confidence").notNull().default(3), // 1-5 from Q8
    score: integer("score"), // null until scored
    maxPossibleScore: integer("max_possible_score"), // for % accuracy calc
    scored: boolean("scored").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // One prediction per user per match
    userMatchUniq: uniqueIndex("predictions_user_match_uniq").on(t.anonUserId, t.matchId),
    matchIdx: index("predictions_match_idx").on(t.matchId),
    userIdx: index("predictions_user_idx").on(t.anonUserId),
    scoredIdx: index("predictions_scored_idx").on(t.scored),
  })
)

// ─── Crowd Tallies ────────────────────────────────────────────────────────────
// Persisted nightly from Redis. Redis is the live source; this is the backup + history.

export const crowdTallies = pgTable(
  "crowd_tallies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    optionValue: text("option_value").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    matchKeyOptionUniq: uniqueIndex("tallies_match_key_option_uniq").on(
      t.matchId,
      t.questionKey,
      t.optionValue
    ),
    matchIdx: index("tallies_match_idx").on(t.matchId),
  })
)

// ─── Streaks ──────────────────────────────────────────────────────────────────
// One row per anon user. Updated atomically after each match is scored.

export const streaks = pgTable(
  "streaks",
  {
    anonUserId: text("anon_user_id").primaryKey(),
    username: text("username"), // optional display name, user-chosen
    usernameLower: text("username_lower"), // lowercase, for case-insensitive uniqueness
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    totalPredictions: integer("total_predictions").notNull().default(0),
    totalCorrectWinner: integer("total_correct_winner").notNull().default(0), // Q1 accuracy
    totalScore: integer("total_score").notNull().default(0),
    totalMaxScore: integer("total_max_score").notNull().default(0),
    // Per question-type accuracy tracking
    correctByKey: jsonb("correct_by_key")
      .$type<Record<string, { correct: number; total: number }>>()
      .notNull()
      .default({}),
    lastPredictedAt: timestamp("last_predicted_at", { withTimezone: true }),
    lastScoredAt: timestamp("last_scored_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    usernameLowerUniq: uniqueIndex("streaks_username_lower_uniq").on(t.usernameLower),
  })
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const matchesRelations = relations(matches, ({ many }) => ({
  questions: many(questions),
  predictions: many(predictions),
  crowdTallies: many(crowdTallies),
}))

export const questionsRelations = relations(questions, ({ one }) => ({
  match: one(matches, { fields: [questions.matchId], references: [matches.id] }),
}))

export const predictionsRelations = relations(predictions, ({ one }) => ({
  match: one(matches, { fields: [predictions.matchId], references: [matches.id] }),
}))

export const crowdTalliesRelations = relations(crowdTallies, ({ one }) => ({
  match: one(matches, { fields: [crowdTallies.matchId], references: [matches.id] }),
}))

// ─── Exported types ───────────────────────────────────────────────────────────

export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert
export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type Prediction = typeof predictions.$inferSelect
export type NewPrediction = typeof predictions.$inferInsert
export type CrowdTally = typeof crowdTallies.$inferSelect
export type Streak = typeof streaks.$inferSelect
