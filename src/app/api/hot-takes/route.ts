import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { hotTakes, hotTakeVotes } from "@/db/schema"
import { eq, and, desc } from "drizzle-orm"

// GET /api/hot-takes?anonUserId=xxx
// Returns active hot takes with vote tallies + the user's own vote on each
export async function GET(req: NextRequest) {
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")

  const takes = await db
    .select()
    .from(hotTakes)
    .where(eq(hotTakes.isActive, true))
    .orderBy(desc(hotTakes.createdAt))

  const results = await Promise.all(
    takes.map(async (take) => {
      const votes = await db
        .select()
        .from(hotTakeVotes)
        .where(eq(hotTakeVotes.hotTakeId, take.id))

      const agree = votes.filter((v) => v.vote === "agree").length
      const disagree = votes.filter((v) => v.vote === "disagree").length
      const total = agree + disagree

      const myVote = anonUserId
        ? votes.find((v) => v.anonUserId === anonUserId)?.vote ?? null
        : null

      return {
        id: take.id,
        text: take.text,
        category: take.category,
        createdAt: take.createdAt,
        agree,
        disagree,
        total,
        agreePct: total > 0 ? Math.round((agree / total) * 100) : 50,
        myVote,
      }
    })
  )

  return NextResponse.json({ takes: results })
}

// POST { anonUserId, hotTakeId, vote } → cast or change a vote
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const anonUserId = body?.anonUserId as string | undefined
  const hotTakeId = body?.hotTakeId as string | undefined
  const vote = body?.vote as "agree" | "disagree" | undefined

  if (!anonUserId || !hotTakeId || !vote) {
    return NextResponse.json({ error: "Missing anonUserId, hotTakeId, or vote" }, { status: 400 })
  }

  await db
    .insert(hotTakeVotes)
    .values({ anonUserId, hotTakeId, vote })
    .onConflictDoUpdate({
      target: [hotTakeVotes.hotTakeId, hotTakeVotes.anonUserId],
      set: { vote },
    })

  return NextResponse.json({ success: true })
}
