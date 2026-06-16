import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { friends, streaks } from "@/db/schema"
import { eq, and, or, inArray } from "drizzle-orm"

// GET /api/friends?anonUserId=xxx  → list friend userIds + their streak data
export async function GET(req: NextRequest) {
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")
  if (!anonUserId) return NextResponse.json({ error: "Missing anonUserId" }, { status: 400 })

  const rows = await db
    .select()
    .from(friends)
    .where(eq(friends.fromUserId, anonUserId))

  const friendIds = rows.map((r) => r.toUserId)
  if (friendIds.length === 0) return NextResponse.json({ friends: [] })

  const friendStreaks = await db
    .select()
    .from(streaks)
    .where(inArray(streaks.anonUserId, friendIds))

  const data = friendStreaks.map((s) => ({
    anonUserId: s.anonUserId,
    username: s.username,
    totalScore: s.totalScore,
    totalMaxScore: s.totalMaxScore,
    currentStreak: s.currentStreak,
    bestStreak: s.bestStreak,
    totalPredictions: s.totalPredictions,
    accuracy: s.totalMaxScore > 0 ? Math.round((s.totalScore / s.totalMaxScore) * 100) : 0,
  }))

  data.sort((a, b) => b.totalScore - a.totalScore)

  return NextResponse.json({ friends: data })
}

// POST { fromUserId, username } → add friend by username
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const fromUserId = body?.fromUserId as string | undefined
  const username = body?.username as string | undefined

  if (!fromUserId || !username) {
    return NextResponse.json({ error: "Missing fromUserId or username" }, { status: 400 })
  }

  // Find the target user by username (case-insensitive)
  const target = await db.query.streaks.findFirst({
    where: eq(streaks.usernameLower, username.toLowerCase()),
  })

  if (!target) {
    return NextResponse.json({ error: `No user found with username "${username}"` }, { status: 404 })
  }

  if (target.anonUserId === fromUserId) {
    return NextResponse.json({ error: "You can't add yourself" }, { status: 400 })
  }

  await db
    .insert(friends)
    .values({ fromUserId, toUserId: target.anonUserId })
    .onConflictDoNothing()

  return NextResponse.json({
    success: true,
    friend: {
      anonUserId: target.anonUserId,
      username: target.username,
    },
  })
}

// DELETE { fromUserId, toUserId } → remove friend
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const fromUserId = body?.fromUserId as string | undefined
  const toUserId = body?.toUserId as string | undefined

  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "Missing fromUserId or toUserId" }, { status: 400 })
  }

  await db
    .delete(friends)
    .where(and(eq(friends.fromUserId, fromUserId), eq(friends.toUserId, toUserId)))

  return NextResponse.json({ success: true })
}
