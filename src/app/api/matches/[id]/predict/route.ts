import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches, predictions, streaks, questions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { incrementTalliesBatch, isMatchLocked } from "@/lib/redis"
import { getQuestionsForStage } from "@/lib/questions"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PredictSchema = z.object({
  anonUserId: z.string().uuid("Invalid user ID"),
  answers: z.record(z.string(), z.string()),
  confidence: z.number().int().min(1).max(5),
})

const LOCK_WINDOW_MS = -999 * 60 * 60 * 1000 // temporarily disabled // 5 minutes before kickoff

export async function POST(req: NextRequest, { params }: Params) {
  const { id: matchId } = await params

  // ── 1. Parse + validate body ───────────────────────────────────────────────
  let body: z.infer<typeof PredictSchema>
  try {
    body = PredictSchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
  const { anonUserId, answers, confidence } = body

  // ── 2. Load match ──────────────────────────────────────────────────────────
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  })

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  // ── 3. Enforce prediction lock ─────────────────────────────────────────────
  // Check Redis fast-path first, then fall back to timestamp check
  const [redisLocked] = await Promise.all([isMatchLocked(matchId)])

  const kickoffMs = new Date(match.kickoffAt).getTime()
  const nowMs = Date.now()
  const tooLate = nowMs >= kickoffMs - LOCK_WINDOW_MS

  if (redisLocked || tooLate || match.status !== "scheduled") {
    return NextResponse.json(
      { error: "Predictions are closed for this match" },
      { status: 409 }
    )
  }

  // ── 4. Validate answers cover required questions ───────────────────────────
  const requiredQuestions = getQuestionsForStage(match.stage)
  const requiredKeys = requiredQuestions.map((q) => q.key)
  const missingKeys = requiredKeys.filter((k) => !(k in answers))

  if (missingKeys.length > 0) {
    return NextResponse.json(
      { error: `Missing answers for: ${missingKeys.join(", ")}` },
      { status: 400 }
    )
  }

  // ── 5. Validate option values are legitimate ──
const dbQuestions = await db.select().from(questions).where(eq(questions.matchId, matchId))

for (const q of dbQuestions) {
  const userAnswer = answers[q.questionKey]
  if (!userAnswer) continue

  // exact_score is free-form "home-away" (e.g. "2-1"), not a fixed option list
  if (q.questionKey === "exact_score") {
    if (!/^\d+-\d+$/.test(userAnswer)) {
      return NextResponse.json(
        { error: `Invalid answer "${userAnswer}" for question "exact_score"` },
        { status: 400 }
      )
    }
    continue
  }

  const validValues = (q.options as Array<{ value: string }>).map((o) => o.value)
  if (!validValues.includes(userAnswer)) {
    return NextResponse.json(
      { error: `Invalid answer "${userAnswer}" for question "${q.questionKey}"` },
      { status: 400 }
    )
  }
}

  // ── 6. Write prediction then upsert streak ────────────────────────────────
  try {
    await db.insert(predictions).values({
      matchId,
      anonUserId,
      answers: { ...answers, confidence: String(confidence) },
      confidence,
      scored: false,
    })
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json(
        { error: "You have already predicted this match" },
        { status: 409 }
      )
    }
    throw err
  }

  // Upsert streak row
  const existingStreakRow = await db.query.streaks.findFirst({
    where: eq(streaks.anonUserId, anonUserId),
  })

  if (existingStreakRow) {
    await db
      .update(streaks)
      .set({
        totalPredictions: existingStreakRow.totalPredictions + 1,
        lastPredictedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(streaks.anonUserId, anonUserId))
  } else {
    await db.insert(streaks).values({
      anonUserId,
      currentStreak: 0,
      bestStreak: 0,
      totalPredictions: 1,
      totalCorrectWinner: 0,
      totalScore: 0,
      totalMaxScore: 0,
      correctByKey: {},
      lastPredictedAt: new Date(),
    })
  }

  // ── 7. Increment Redis crowd tallies (non-blocking, best-effort) ───────────
  // Do this outside the transaction — a Redis failure shouldn't roll back the prediction
  incrementTalliesBatch(matchId, { ...answers, confidence: String(confidence) }).catch(
    (err) => console.error("[predict] Redis tally increment failed", err)
  )

  return NextResponse.json({ success: true }, { status: 201 })
}
