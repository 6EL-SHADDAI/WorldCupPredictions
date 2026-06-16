import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { friends, streaks } from "@/db/schema"
import { eq, and, inArray } from "drizzle-orm"

// GET /api/friends?anonUserId=xxx
// Returns: { friends: [...accepted, mutual...], incoming: [...pending requests to me...], outgoing: [...pending requests I sent...] }
export async function GET(req: NextRequest) {
  const anonUserId = req.nextUrl.searchParams.get("anonUserId")
  if (!anonUserId) return NextResponse.json({ error: "Missing anonUserId" }, { status: 400 })

  // Accepted friends: rows where I'm the sender AND status accepted
  const acceptedRows = await db
    .select()
    .from(friends)
    .where(and(eq(friends.fromUserId, anonUserId), eq(friends.status, "accepted")))

  // Incoming requests: someone sent ME a request, still pending
  const incomingRows = await db
    .select()
    .from(friends)
    .where(and(eq(friends.toUserId, anonUserId), eq(friends.status, "pending")))

  // Outgoing requests: I sent a request, still pending
  const outgoingRows = await db
    .select()
    .from(friends)
    .where(and(eq(friends.fromUserId, anonUserId), eq(friends.status, "pending")))

  const friendIds = acceptedRows.map((r) => r.toUserId)
  const incomingIds = incomingRows.map((r) => r.fromUserId)
  const outgoingIds = outgoingRows.map((r) => r.toUserId)

  const allIds = [...new Set([...friendIds, ...incomingIds, ...outgoingIds])]
  const allStreaks = allIds.length > 0
    ? await db.select().from(streaks).where(inArray(streaks.anonUserId, allIds))
    : []

  const streakMap = new Map(allStreaks.map((s) => [s.anonUserId, s]))

  function toUserRow(id: string) {
    const s = streakMap.get(id)
    return {
      anonUserId: id,
      username: s?.username ?? null,
      totalScore: s?.totalScore ?? 0,
      totalMaxScore: s?.totalMaxScore ?? 0,
      currentStreak: s?.currentStreak ?? 0,
      bestStreak: s?.bestStreak ?? 0,
      totalPredictions: s?.totalPredictions ?? 0,
      accuracy: s && s.totalMaxScore > 0 ? Math.round((s.totalScore / s.totalMaxScore) * 100) : 0,
    }
  }

  const friendData = friendIds.map(toUserRow).sort((a, b) => b.totalScore - a.totalScore)
  const incomingData = incomingIds.map(toUserRow)
  const outgoingData = outgoingIds.map(toUserRow)

  return NextResponse.json({ friends: friendData, incoming: incomingData, outgoing: outgoingData })
}

// POST { fromUserId, username } → send a friend request by username
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const fromUserId = body?.fromUserId as string | undefined
  const username = body?.username as string | undefined

  if (!fromUserId || !username) {
    return NextResponse.json({ error: "Missing fromUserId or username" }, { status: 400 })
  }

  const target = await db.query.streaks.findFirst({
    where: eq(streaks.usernameLower, username.toLowerCase()),
  })

  if (!target) {
    return NextResponse.json({ error: `No user found with username "${username}"` }, { status: 404 })
  }

  if (target.anonUserId === fromUserId) {
    return NextResponse.json({ error: "You can't add yourself" }, { status: 400 })
  }

  // Check if target already sent ME a pending request — if so, auto-accept both ways
  const reverseRequest = await db.query.friends.findFirst({
    where: and(eq(friends.fromUserId, target.anonUserId), eq(friends.toUserId, fromUserId)),
  })

  if (reverseRequest) {
    await db
      .update(friends)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(friends.id, reverseRequest.id))

    await db
      .insert(friends)
      .values({ fromUserId, toUserId: target.anonUserId, status: "accepted", respondedAt: new Date() })
      .onConflictDoUpdate({
        target: [friends.fromUserId, friends.toUserId],
        set: { status: "accepted", respondedAt: new Date() },
      })

    return NextResponse.json({
      success: true,
      autoAccepted: true,
      friend: { anonUserId: target.anonUserId, username: target.username },
    })
  }

  // Otherwise just send a pending request
  await db
    .insert(friends)
    .values({ fromUserId, toUserId: target.anonUserId, status: "pending" })
    .onConflictDoUpdate({
      target: [friends.fromUserId, friends.toUserId],
      set: { status: "pending" },
    })

  return NextResponse.json({
    success: true,
    pending: true,
    friend: { anonUserId: target.anonUserId, username: target.username },
  })
}

// PATCH { anonUserId, fromUserId, action } → accept or reject an incoming request
// anonUserId = me (the recipient), fromUserId = the person who sent it
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const anonUserId = body?.anonUserId as string | undefined
  const fromUserId = body?.fromUserId as string | undefined
  const action = body?.action as "accept" | "reject" | undefined

  if (!anonUserId || !fromUserId || !action) {
    return NextResponse.json({ error: "Missing anonUserId, fromUserId, or action" }, { status: 400 })
  }

  const request = await db.query.friends.findFirst({
    where: and(eq(friends.fromUserId, fromUserId), eq(friends.toUserId, anonUserId), eq(friends.status, "pending")),
  })

  if (!request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  if (action === "reject") {
    await db.delete(friends).where(eq(friends.id, request.id))
    return NextResponse.json({ success: true, rejected: true })
  }

  // Accept: mark this row accepted, and create the reverse row so it's mutual
  await db
    .update(friends)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(friends.id, request.id))

  await db
    .insert(friends)
    .values({ fromUserId: anonUserId, toUserId: fromUserId, status: "accepted", respondedAt: new Date() })
    .onConflictDoUpdate({
      target: [friends.fromUserId, friends.toUserId],
      set: { status: "accepted", respondedAt: new Date() },
    })

  return NextResponse.json({ success: true, accepted: true })
}

// DELETE { fromUserId, toUserId } → remove a friend (or cancel a pending request)
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const fromUserId = body?.fromUserId as string | undefined
  const toUserId = body?.toUserId as string | undefined

  if (!fromUserId || !toUserId) {
    return NextResponse.json({ error: "Missing fromUserId or toUserId" }, { status: 400 })
  }

  await db.delete(friends).where(and(eq(friends.fromUserId, fromUserId), eq(friends.toUserId, toUserId)))
  await db.delete(friends).where(and(eq(friends.fromUserId, toUserId), eq(friends.toUserId, fromUserId)))

  return NextResponse.json({ success: true })
}
