import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches, questions } from "@/db/schema"
import { eq, and, notInArray, inArray } from "drizzle-orm"
import { SCORING } from "@/lib/questions"

function isAuthorised(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret")
  return secret === process.env.CRON_SECRET
}

// GET /api/cron/backfill-exact-score?secret=YOUR_SECRET
// Adds the exact_score question to every match that doesn't already have it.
// Safe to run multiple times — uses onConflictDoNothing.
export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all matches that don't yet have an exact_score question
  const allMatches = await db.select({ id: matches.id, homeTeam: matches.homeTeam, awayTeam: matches.awayTeam, stage: matches.stage })
    .from(matches)

  // Get all matchIds that already have an exact_score question
  const existing = await db
    .select({ matchId: questions.matchId })
    .from(questions)
    .where(eq(questions.questionKey, "exact_score"))

  const existingIds = new Set(existing.map((r) => r.matchId))
  const missing = allMatches.filter((m) => !existingIds.has(m.id))

  if (missing.length === 0) {
    return NextResponse.json({ ok: true, message: "All matches already have exact_score question", added: 0 })
  }

  await db.insert(questions).values(
    missing.map((m) => ({
      matchId: m.id,
      questionKey: "exact_score",
      questionText: `Exact score? (${m.homeTeam} – ${m.awayTeam})`,
      options: [], // rendered as steppers on the frontend
      isKnockoutOnly: false,
      sortOrder: 8,
    }))
  ).onConflictDoNothing()

  return NextResponse.json({ ok: true, added: missing.length, matchIds: missing.map((m) => m.id) })
}
