import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { questions, matches } from "@/db/schema"
import { eq, asc } from "drizzle-orm"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  try {
    // Fetch match + its questions in parallel
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
      // Reveal correct answer only if match is finished
      correctAnswer: match.status === "finished" ? correctAnswer : undefined,
    }))

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
    })
  } catch (err) {
    console.error(`[GET /api/matches/${id}/questions]`, err)
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
  }
}
