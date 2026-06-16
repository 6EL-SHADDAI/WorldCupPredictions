import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { hotTakes } from "@/db/schema"
import { eq } from "drizzle-orm"

function isAdminAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization")
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  const secretParam = req.nextUrl.searchParams.get("secret")
  return secretParam === process.env.CRON_SECRET
}

// POST { text, category? } → create a new hot take (admin only)
// Usage: POST /api/hot-takes/admin?secret=YOUR_CRON_SECRET  body: { "text": "...", "category": "bold prediction" }
export async function POST(req: NextRequest) {
  if (!isAdminAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const text = body?.text as string | undefined
  const category = body?.category as string | undefined

  if (!text || text.trim().length < 5) {
    return NextResponse.json({ error: "Text must be at least 5 characters" }, { status: 400 })
  }

  const [created] = await db
    .insert(hotTakes)
    .values({ text: text.trim(), category: category?.trim() || null })
    .returning()

  return NextResponse.json({ success: true, hotTake: created })
}

// DELETE { id } → deactivate a hot take (admin only)
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const id = body?.id as string | undefined
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  await db.update(hotTakes).set({ isActive: false }).where(eq(hotTakes.id, id))
  return NextResponse.json({ success: true })
}

// GET — list all takes including inactive (admin only, for management)
export async function GET(req: NextRequest) {
  if (!isAdminAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const all = await db.select().from(hotTakes)
  return NextResponse.json({ takes: all })
}
