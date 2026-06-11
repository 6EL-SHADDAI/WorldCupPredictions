import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db"
import { matches } from "@/db/schema"
import { eq, isNull, and } from "drizzle-orm"

function isCronAuthorised(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all finished matches that haven't been scored yet
  const unscoredMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.status, "finished"), isNull(matches.scoredAt)))

  const results: Array<{ matchId: string; result: string }> = []

  for (const match of unscoredMatches) {
    // Call the score endpoint for each match
    // Using internal URL — works on Vercel
    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    const res = await fetch(`${baseUrl}/api/matches/${match.id}/score`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })

    const data = await res.json()
    results.push({ matchId: match.id, result: data.success ? "scored" : data.message ?? "error" })
  }

  return NextResponse.json({ processed: results.length, results })
}
