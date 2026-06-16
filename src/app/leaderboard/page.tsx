import Link from "next/link"
import { db } from "@/db"
import { streaks } from "@/db/schema"
import { desc } from "drizzle-orm"
import LeaderboardClient from "./LeaderboardClient"

export const revalidate = 300

export default async function LeaderboardPage() {
  const top = await db.select().from(streaks).orderBy(desc(streaks.totalScore)).limit(100)

  const users = top.map((u) => ({
    anonUserId: u.anonUserId,
    username: u.username,
    totalScore: u.totalScore,
    totalMaxScore: u.totalMaxScore,
    currentStreak: u.currentStreak,
    bestStreak: u.bestStreak,
    totalPredictions: u.totalPredictions,
    accuracy: u.totalMaxScore > 0 ? Math.round((u.totalScore / u.totalMaxScore) * 100) : 0,
  }))

  return <LeaderboardClient users={users} />
}
