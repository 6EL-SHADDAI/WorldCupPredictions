import { db } from "@/db"
import { matches, predictions, questions, streaks, crowdTallies } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { deriveCorrectAnswers, scorePrediction, updateStreakValues } from "./scoring"
import { updateLeaderboard, getAllTallies } from "./redis"
import type { PredictionAnswers } from "@/db/schema"

export type ScoreMatchResult =
  | { ok: true; matchId: string; predictionsScored: number; skipped?: false }
  | { ok: true; matchId: string; skipped: true; reason: string }
  | { ok: false; matchId: string; error: string }

/**
 * Score a single match: derive correct answers from the match row (which must
 * already have its final score/winner populated, e.g. by the sync step),
 * write correct answers, score every unscored prediction, update streaks +
 * leaderboard, flush crowd tallies, and mark the match as scored.
 *
 * Safe to call repeatedly — if the match isn't finished yet or has already
 * been scored, it's a no-op.
 */
export async function scoreMatch(matchId: string): Promise<ScoreMatchResult> {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  })

  if (!match) {
    return { ok: false, matchId, error: "Match not found" }
  }

  if (match.scoredAt) {
    return { ok: true, matchId, skipped: true, reason: "Already scored" }
  }

  if (match.status !== "finished") {
    return { ok: true, matchId, skipped: true, reason: `Not finished (${match.status})` }
  }

  // ── Derive correct answers ────────────────────────────────────────────────
  let correctAnswers: Record<string, string>
  try {
    correctAnswers = deriveCorrectAnswers(match)
  } catch (err) {
    return { ok: false, matchId, error: `Could not derive answers: ${String(err)}` }
  }

  // ── Write correct answers to questions table ────────────────────────────
  const matchQuestions = await db
    .select()
    .from(questions)
    .where(eq(questions.matchId, matchId))

  await Promise.all(
    matchQuestions.map((q) => {
      const correct = correctAnswers[q.questionKey]
      if (!correct) return Promise.resolve()
      return db
        .update(questions)
        .set({ correctAnswer: correct })
        .where(eq(questions.id, q.id))
    })
  )

  // ── Load all unscored predictions for this match ─────────────────────────
  const unscoredPredictions = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.matchId, matchId), eq(predictions.scored, false)))

  if (unscoredPredictions.length === 0) {
    await db
      .update(matches)
      .set({ scoredAt: new Date() })
      .where(eq(matches.id, matchId))
    return { ok: true, matchId, predictionsScored: 0 }
  }

  // ── Score each prediction + update streaks ───────────────────────────────
  let scored = 0
  for (const prediction of unscoredPredictions) {
    const { score, maxPossibleScore, correctWinner } = scorePrediction(
      prediction.answers as PredictionAnswers,
      correctAnswers,
      match.stage
    )

    await db
      .update(predictions)
      .set({ score, maxPossibleScore, scored: true })
      .where(eq(predictions.id, prediction.id))

    const existingStreak = await db.query.streaks.findFirst({
      where: eq(streaks.anonUserId, prediction.anonUserId),
    })

    const { currentStreak, bestStreak } = updateStreakValues(
      existingStreak?.currentStreak ?? 0,
      existingStreak?.bestStreak ?? 0,
      correctWinner
    )

    const newTotalScore = (existingStreak?.totalScore ?? 0) + score
    const newTotalMax = (existingStreak?.totalMaxScore ?? 0) + maxPossibleScore

    if (existingStreak) {
      await db
        .update(streaks)
        .set({
          currentStreak,
          bestStreak,
          totalScore: newTotalScore,
          totalMaxScore: newTotalMax,
          totalCorrectWinner: existingStreak.totalCorrectWinner + (correctWinner ? 1 : 0),
          lastScoredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(streaks.anonUserId, prediction.anonUserId))
    } else {
      await db.insert(streaks).values({
        anonUserId: prediction.anonUserId,
        currentStreak,
        bestStreak,
        totalPredictions: 1,
        totalCorrectWinner: correctWinner ? 1 : 0,
        totalScore: score,
        totalMaxScore: maxPossibleScore,
        correctByKey: {},
        lastScoredAt: new Date(),
      })
    }

    await updateLeaderboard(prediction.anonUserId, newTotalScore).catch((e) =>
      console.error("[scoreMatch] leaderboard update failed", e)
    )

    scored++
  }

  // ── Flush Redis tallies to Postgres crowd_tallies ───────────────────────
  const questionKeys = matchQuestions.map((q) => q.questionKey)
  const redisTallies = await getAllTallies(matchId, questionKeys)

  await Promise.all(
    Object.entries(redisTallies).flatMap(([questionKey, counts]) =>
      Object.entries(counts).map(([optionValue, count]) =>
        db
          .insert(crowdTallies)
          .values({ matchId, questionKey, optionValue, count })
          .onConflictDoUpdate({
            target: [
              crowdTallies.matchId,
              crowdTallies.questionKey,
              crowdTallies.optionValue,
            ],
            set: { count, updatedAt: new Date() },
          })
      )
    )
  )

  // ── Mark match as fully scored ───────────────────────────────────────────
  await db
    .update(matches)
    .set({ scoredAt: new Date() })
    .where(eq(matches.id, matchId))

  return { ok: true, matchId, predictionsScored: scored }
}
