import { NextResponse } from "next/server"
import { db } from "@/db"
import { matches } from "@/db/schema"
import { asc } from "drizzle-orm"

export const revalidate = 60 // ISR — regenerate every 60s

export async function GET() {
  try {
    const allMatches = await db
      .select()
      .from(matches)
      .orderBy(asc(matches.kickoffAt))

    return NextResponse.json({ matches: allMatches })
  } catch (err) {
    console.error("[GET /api/matches]", err)
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
  }
}
