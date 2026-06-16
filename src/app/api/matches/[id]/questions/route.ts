import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { questions, matches, predictions } from "@/db/schema"
import { eq, asc, and } from "drizzle-orm"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")

  try {
    const [match, matchQuestions] = await Promise.all([
      db.query.matches.findFirst({ where: eq(matches.id, id) }),
      db
        .select()
        .from(questions)
        .where(eq(questions.matchId, id))
        .orderBy(asc(questions.sortOrder)),
    ])

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Strip correctAnswer from response — only expose after match is finished
    const safeQuestions = matchQuestions.map(({ correctAnswer, ...q }) => ({
      ...q,
      correctAnswer: match.status === "finished" ? correctAnswer : undefined,
    }))

    // Look up the user's existing prediction for this match, if any
    let myPrediction = null
    if (anonUserId) {
      const existing = await db.query.predictions.findFirst({
        where: and(eq(predictions.matchId, id), eq(predictions.anonUserId, anonUserId)),
      })
      if (existing) {
        myPrediction = {
          id: existing.id,
          answers: existing.answers,
          confidence: existing.confidence,
          score: existing.score,
          maxPossibleScore: existing.maxPossibleScore,
          scored: existing.scored,
          createdAt: existing.createdAt,
        }
      }
    }

    return NextResponse.json({
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeTeamCode: match.homeTeamCode,
        awayTeamCode: match.awayTeamCode,
        stage: match.stage,
        status: match.status,
        kickoffAt: match.kickoffAt,
        homeScore: match.status === "finished" ? match.homeScore : null,
        awayScore: match.status === "finished" ? match.awayScore : null,
      },
      questions: safeQuestions,
      myPrediction,
    })
  } catch (err) {
    console.error(`[GET /api/matches/${id}/questions]`, err)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}
