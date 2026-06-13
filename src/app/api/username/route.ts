import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { streaks } from "@/db/schema"
import { eq, and, ne } from "drizzle-orm"

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

// GET /api/username?check=somename -> { available: boolean }
export async function GET(req: NextRequest) {
  const check = req.nextUrl.searchParams.get("check")
  if (!check) return NextResponse.json({ error: "Missing 'check' param" }, { status: 400 })

  if (!USERNAME_RE.test(check)) {
    return NextResponse.json({ available: false, reason: "invalid" })
  }

  const existing = await db.query.streaks.findFirst({
    where: eq(streaks.usernameLower, check.toLowerCase()),
  })

  return NextResponse.json({ available: !existing })
}

// POST { anonUserId, username } -> claim/update a username. username: null clears it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const anonUserId = body?.anonUserId as string | undefined
  const usernameRaw = body?.username as string | null | undefined

  if (!anonUserId) {
    return NextResponse.json({ error: "Missing anonUserId" }, { status: 400 })
  }

  // Clearing the username
  if (usernameRaw === null || usernameRaw === "") {
    const existing = await db.query.streaks.findFirst({ where: eq(streaks.anonUserId, anonUserId) })
    if (existing) {
      await db
        .update(streaks)
        .set({ username: null, usernameLower: null, updatedAt: new Date() })
        .where(eq(streaks.anonUserId, anonUserId))
    }
    return NextResponse.json({ success: true, username: null })
  }

  const username = (usernameRaw ?? "").trim()

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: letters, numbers, underscores only." },
      { status: 400 }
    )
  }

  const lower = username.toLowerCase()

  // Check if taken by someone else
  const taken = await db.query.streaks.findFirst({
    where: and(eq(streaks.usernameLower, lower), ne(streaks.anonUserId, anonUserId)),
  })

  if (taken) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 })
  }

  const existing = await db.query.streaks.findFirst({ where: eq(streaks.anonUserId, anonUserId) })

  if (existing) {
    await db
      .update(streaks)
      .set({ username, usernameLower: lower, updatedAt: new Date() })
      .where(eq(streaks.anonUserId, anonUserId))
  } else {
    await db.insert(streaks).values({
      anonUserId,
      username,
      usernameLower: lower,
      correctByKey: {},
    })
  }

  return NextResponse.json({ success: true, username })
}