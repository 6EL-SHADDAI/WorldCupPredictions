import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { predictions, streaks, matches, questions } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { getUserRank } from "@/lib/redis"
import type { PredictionAnswers } from "@/db/schema"

type Params = { params: Promise<{ anonId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { anonId } = await params

  try {
    // Parallel fetch: streak row + all predictions with their match data
    const [streak, userPredictions, leaderboardRank] = await Promise.all([
      db.query.streaks.findFirst({ where: eq(streaks.anonUserId, anonId) }),
      db
        .select({
          prediction: predictions,
          match: {
            id: matches.id,
            homeTeam: matches.homeTeam,
            awayTeam: matches.awayTeam,
            homeTeamCode: matches.homeTeamCode,
            awayTeamCode: matches.awayTeamCode,
            stage: matches.stage,
            status: matches.status,
            kickoffAt: matches.kickoffAt,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            winner: matches.winner,
          },
        })
        .from(predictions)
        .innerJoin(matches, eq(predictions.matchId, matches.id))
        .where(eq(predictions.anonUserId, anonId))
        .orderBy(desc(matches.kickoffAt)),
      getUserRank(anonId),
    ])

    if (!streak && userPredictions.length === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // ── Accuracy by question key ───────────────────────────────────────────
    // Build from scored predictions — gives richer breakdown than streak.correctByKey
    const accuracyByKey: Record<string, { correct: number; total: number }> = {}

    for (const { prediction, match } of userPredictions) {
      if (!prediction.scored || !prediction.answers) continue

      // We need correct answers — fetch questions for matches we haven't cached
      const matchQuestions = await db
        .select({ questionKey: questions.questionKey, correctAnswer: questions.correctAnswer })
        .from(questions)
        .where(eq(questions.matchId, match.id))

      for (const q of matchQuestions) {
        if (!q.correctAnswer) continue
        const key = q.questionKey
        const userAnswer = (prediction.answers as PredictionAnswers)[key]
        if (!userAnswer) continue

        if (!accuracyByKey[key]) accuracyByKey[key] = { correct: 0, total: 0 }
        accuracyByKey[key].total++
        if (userAnswer === q.correctAnswer) accuracyByKey[key].correct++
      }
    }

    // ── Format predictions for response ───────────────────────────────────
    const formattedPredictions = userPredictions.map(({ prediction, match }) => ({
      id: prediction.id,
      matchId: prediction.matchId,
      answers: prediction.answers,
      confidence: prediction.confidence,
      score: prediction.score,
      maxPossibleScore: prediction.maxPossibleScore,
      scored: prediction.scored,
      createdAt: prediction.createdAt,
      match: {
        ...match,
        // Only expose score if finished
        homeScore: match.status === "finished" ? match.homeScore : null,
        awayScore: match.status === "finished" ? match.awayScore : null,
      },
    }))

    // ── Overall accuracy percentage ────────────────────────────────────────
    const overallAccuracy =
      streak && streak.totalMaxScore > 0
        ? Math.round((streak.totalScore / streak.totalMaxScore) * 100)
        : null

    return NextResponse.json({
      anonUserId: anonId,
      username: streak?.username ?? null,
      streak: streak
        ? {
            currentStreak: streak.currentStreak,
            bestStreak: streak.bestStreak,
            totalPredictions: streak.totalPredictions,
            totalScore: streak.totalScore,
            totalMaxScore: streak.totalMaxScore,
            overallAccuracy,
            lastPredictedAt: streak.lastPredictedAt,
          }
        : null,
      leaderboardRank,
      accuracyByKey,
      predictions: formattedPredictions,
    })
  } catch (err) {
    console.error(`[GET /api/profile/${anonId}]`, err)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
