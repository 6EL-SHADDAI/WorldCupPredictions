import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches, questions } from "@/db/schema"
import { eq, asc } from "drizzle-orm"
import { getAllTallies, tallyToPercentages } from "@/lib/redis"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: matchId } = await params

  try {
    const [match, matchQuestions] = await Promise.all([
      db.query.matches.findFirst({ where: eq(matches.id, matchId) }),
      db
        .select({ questionKey: questions.questionKey })
        .from(questions)
        .where(eq(questions.matchId, matchId))
        .orderBy(asc(questions.sortOrder)),
    ])

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    const questionKeys = matchQuestions.map((q) => q.questionKey)

    // Pull all tallies from Redis in a single pipeline
    const rawTallies = await getAllTallies(matchId, questionKeys)

    // Convert to percentages
    const percentages: Record<
      string,
      ReturnType<typeof tallyToPercentages>
    > = {}
    for (const key of questionKeys) {
      percentages[key] = tallyToPercentages(rawTallies[key] ?? {})
    }

    return NextResponse.json({
      matchId,
      percentages,
      // Include raw counts so client can show "X people predicted this"
      counts: rawTallies,
    })
  } catch (err) {
    console.error(`[GET /api/matches/${matchId}/crowd]`, err)
    return NextResponse.json({ error: "Failed to fetch crowd data" }, { status: 500 })
  }
}
