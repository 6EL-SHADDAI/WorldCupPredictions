import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches, questions } from "@/db/schema"
import { eq, and, isNull } from "drizzle-orm"
import { getWorldCupMatches } from "@/lib/football-api"
import { getQuestionsForStage } from "@/lib/questions"
import { lockMatch } from "@/lib/redis"
import { scoreMatch } from "@/lib/scoreMatch"

function isCronAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  // Fallback: ?secret=... so external cron services (cron-job.org) or a
  // browser can trigger this without setting custom headers.
  const secretParam = req.nextUrl.searchParams.get("secret")
  return secretParam === process.env.CRON_SECRET
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // ── 1. Sync matches from football-data.org ────────────────────────────
    const liveMatches = await getWorldCupMatches()
    let created = 0
    let updated = 0
    let locked = 0

    for (const liveMatch of liveMatches) {
      const existing = await db.query.matches.findFirst({
        where: eq(matches.externalId, liveMatch.externalId),
      })

      if (!existing) {
        // ── Insert new match ─────────────────────────────────────────────
        const [inserted] = await db
          .insert(matches)
          .values({
            externalId: liveMatch.externalId,
            homeTeam: liveMatch.homeTeam,
            awayTeam: liveMatch.awayTeam,
            homeTeamCode: liveMatch.homeTeamCode,
            awayTeamCode: liveMatch.awayTeamCode,
            stage: liveMatch.stage as any,
            status: liveMatch.status as any,
            kickoffAt: liveMatch.kickoffAt,
            homeScore: liveMatch.homeScore,
            awayScore: liveMatch.awayScore,
            winner: liveMatch.winner,
            wentToExtraTime: liveMatch.wentToExtraTime,
            wentToPenalties: liveMatch.wentToPenalties,
          })
          .returning()

        // ── Seed questions for this match ────────────────────────────────
        const templates = getQuestionsForStage(liveMatch.stage)
        await db.insert(questions).values(
          templates.map((t) => ({
            matchId: inserted.id,
            questionKey: t.key,
            questionText: t.text(liveMatch.homeTeam, liveMatch.awayTeam),
            options: t.options(liveMatch.homeTeam, liveMatch.awayTeam),
            isKnockoutOnly: t.isKnockoutOnly,
            sortOrder: t.sortOrder,
          }))
        )

        created++
      } else {
        // ── Update status / score if changed ─────────────────────────────
        const changed =
          existing.status !== liveMatch.status ||
          existing.homeScore !== liveMatch.homeScore ||
          existing.awayScore !== liveMatch.awayScore

        if (changed) {
          await db
            .update(matches)
            .set({
              status: liveMatch.status as any,
              homeScore: liveMatch.homeScore,
              awayScore: liveMatch.awayScore,
              winner: liveMatch.winner,
              wentToExtraTime: liveMatch.wentToExtraTime,
              wentToPenalties: liveMatch.wentToPenalties,
              updatedAt: new Date(),
            })
            .where(eq(matches.id, existing.id))

          updated++
        }

        // ── Lock match in Redis 5min before kickoff ───────────────────────
        const kickoffMs = new Date(liveMatch.kickoffAt).getTime()
        const nowMs = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (
          existing.status === "scheduled" &&
          nowMs >= kickoffMs - fiveMinutes &&
          nowMs < kickoffMs
        ) {
          await lockMatch(existing.id)
          locked++
        }
      }
    }

    // ── 2. Find all finished-but-unscored matches and score them now ───────
    const unscored = await db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.status, "finished"), isNull(matches.scoredAt)))

    const scoreResults: Array<{ matchId: string; result: string }> = []

    for (const m of unscored) {
      const result = await scoreMatch(m.id)
      if (!result.ok) {
        scoreResults.push({ matchId: m.id, result: `error: ${result.error}` })
      } else if (result.skipped) {
        scoreResults.push({ matchId: m.id, result: result.reason })
      } else {
        scoreResults.push({ matchId: m.id, result: `scored ${result.predictionsScored}` })
      }
    }

    return NextResponse.json({
      success: true,
      sync: { created, updated, locked, totalFromApi: liveMatches.length },
      scoring: { processed: scoreResults.length, results: scoreResults },
    })
  } catch (err) {
    console.error("[cron/sync-and-score]", err)
    return NextResponse.json({ error: "Sync/score failed", detail: String(err) }, { status: 500 })
  }
}
