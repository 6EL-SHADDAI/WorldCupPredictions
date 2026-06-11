import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches, predictions, questions, streaks, crowdTallies } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { getMatch } from "@/lib/football-api"
import { deriveCorrectAnswers, scorePrediction, updateStreakValues } from "@/lib/scoring"
import { updateLeaderboard, getAllTallies } from "@/lib/redis"
import type { PredictionAnswers } from "@/db/schema"

type Params = { params: Promise<{ id: string }> }

// This endpoint is called by Vercel Cron (vercel.json) and must be protected.
function isCronAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: matchId } = await params

  // ── 1. Load match from DB ──────────────────────────────────────────────────
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  })

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  if (match.scoredAt) {
    return NextResponse.json({ message: "Already scored", matchId }, { status: 200 })
  }

  // ── 2. Fetch latest match result from football-data.org ───────────────────
  let liveData
  try {
    liveData = await getMatch(match.externalId)
  } catch (err) {
    console.error(`[score] Failed to fetch live data for match ${matchId}`, err)
    return NextResponse.json({ error: "Failed to fetch match result" }, { status: 502 })
  }

  if (liveData.status !== "finished") {
    return NextResponse.json(
      { message: "Match not finished yet", status: liveData.status },
      { status: 200 }
    )
  }

  // ── 3. Update match row with final score ───────────────────────────────────
  await db
    .update(matches)
    .set({
      status: "finished",
      homeScore: liveData.homeScore,
      awayScore: liveData.awayScore,
      winner: liveData.winner,
      wentToExtraTime: liveData.wentToExtraTime,
      wentToPenalties: liveData.wentToPenalties,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, matchId))

  // ── 4. Derive correct answers ──────────────────────────────────────────────
  const updatedMatch = { ...match, ...liveData, id: match.id }
  let correctAnswers: Record<string, string>
  try {
    correctAnswers = deriveCorrectAnswers(updatedMatch as any)
  } catch (err) {
    console.error(`[score] Could not derive answers for ${matchId}`, err)
    return NextResponse.json({ error: "Could not derive answers" }, { status: 500 })
  }

  // ── 5. Write correct answers to questions table ────────────────────────────
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

  // ── 6. Load all unscored predictions for this match ───────────────────────
  const unscoredPredictions = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.matchId, matchId), eq(predictions.scored, false)))

  if (unscoredPredictions.length === 0) {
    // Mark match as scored even with no predictions
    await db
      .update(matches)
      .set({ scoredAt: new Date() })
      .where(eq(matches.id, matchId))
    return NextResponse.json({ message: "No predictions to score", matchId })
  }

  // ── 7. Score each prediction + update streaks ─────────────────────────────
  let scored = 0
  for (const prediction of unscoredPredictions) {
    const { score, maxPossibleScore, correctWinner } = scorePrediction(
      prediction.answers as PredictionAnswers,
      correctAnswers,
      match.stage
    )

    // Update prediction row
    await db
      .update(predictions)
      .set({ score, maxPossibleScore, scored: true })
      .where(eq(predictions.id, prediction.id))

    // Upsert streak
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

    await db
      .insert(streaks)
      .values({
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
      .onConflictDoUpdate({
        target: streaks.anonUserId,
        set: {
          currentStreak,
          bestStreak,
          totalScore: newTotalScore,
          totalMaxScore: newTotalMax,
          totalCorrectWinner: db.$count(predictions) // placeholder; see note below
            .sql`streaks.total_correct_winner + ${correctWinner ? 1 : 0}`,
          lastScoredAt: new Date(),
          updatedAt: new Date(),
        },
      })

    // Update Redis leaderboard
    await updateLeaderboard(prediction.anonUserId, newTotalScore).catch((e) =>
      console.error("[score] leaderboard update failed", e)
    )

    scored++
  }

  // ── 8. Flush Redis tallies to Postgres crowd_tallies ──────────────────────
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

  // ── 9. Mark match as fully scored ─────────────────────────────────────────
  await db
    .update(matches)
    .set({ scoredAt: new Date() })
    .where(eq(matches.id, matchId))

  return NextResponse.json({ success: true, matchId, predictionsScored: scored })
}
