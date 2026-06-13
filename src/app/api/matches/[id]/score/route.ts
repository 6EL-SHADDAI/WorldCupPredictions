import { NextRequest, NextResponse } from "next/server"
import { scoreMatch } from "@/lib/scoreMatch"

type Params = { params: Promise<{ id: string }> }

function isCronAuthorised(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization")
  return authHeader === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest, { params }: Params) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: matchId } = await params
  const result = await scoreMatch(matchId)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.skipped) {
    return NextResponse.json({ message: result.reason, matchId }, { status: 200 })
  }

  return NextResponse.json({ success: true, matchId, predictionsScored: result.predictionsScored })
}
