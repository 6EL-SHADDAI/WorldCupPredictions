import { NextRequest, NextResponse } from "next/server"
import { getUserBadges } from "@/lib/badges"

export async function GET(req: NextRequest, { params }: { params: Promise<{ anonId: string }> }) {
  const { anonId } = await params
  const badges = await getUserBadges(anonId)
  return NextResponse.json({ badges })
}
