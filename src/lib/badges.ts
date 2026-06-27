import { db } from "@/db"
import { userBadges, streaks, predictions } from "@/db/schema"
import { eq, and, gte } from "drizzle-orm"

export type BadgeDef = {
  key: string
  emoji: string
  name: string
  description: string
  color: string
}

export const BADGES: BadgeDef[] = [
  {
    key: "first_prediction",
    emoji: "",
    name: "First Call",
    description: "Made your first prediction",
    color: "#3aaa3a",
  },
  {
    key: "oracle",
    emoji: "🔮",
    name: "Oracle",
    description: "Correctly predicted 5 winners in a row",
    color: "#7c3aed",
  },
  {
    key: "upset_hunter",
    emoji: "",
    name: "Upset Hunter",
    description: "Correctly predicted 3 upsets the crowd missed",
    color: "#d92b2b",
  },
  {
    key: "sniper",
    emoji: "",
    name: "Sniper",
    description: "Scored 100% on 3 different matches",
    color: "#2d7a2d",
  },
  {
    key: "on_fire",
    emoji: "",
    name: "On Fire",
    description: "3 correct winner predictions in a row",
    color: "#f97316",
  },
  {
    key: "electric",
    emoji: "",
    name: "Electric",
    description: "5 correct winner predictions in a row",
    color: "#eab308",
  },
  {
    key: "legendary",
    emoji: "",
    name: "Legendary",
    description: "10 correct winner predictions in a row",
    color: "#b8860b",
  },
  {
    key: "crowd_beater",
    emoji: "",
    name: "Crowd Beater",
    description: "Correctly predicted something 80%+ of crowd got wrong",
    color: "#0891b2",
  },
  {
    key: "high_roller",
    emoji: "",
    name: "High Roller",
    description: "Submitted 5 high-confidence predictions",
    color: "#a21caf",
  },
  {
    key: "group_survivor",
    emoji: "",
    name: "Group Survivor",
    description: "Predicted 10 or more matches",
    color: "#059669",
  },
  {
    key: "sharp",
    emoji: "",
    name: "Sharp",
    description: "Achieved 70%+ accuracy across 5+ scored matches",
    color: "#0f766e",
  },
]

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b]))

/** Award a badge if not already awarded. Returns true if newly awarded. */
export async function awardBadge(anonUserId: string, badgeKey: string): Promise<boolean> {
  try {
    await db.insert(userBadges).values({ anonUserId, badgeKey }).onConflictDoNothing()
    return true
  } catch {
    return false
  }
}

/** Check and award all applicable badges for a user after scoring. */
export async function checkAndAwardBadges(anonUserId: string): Promise<string[]> {
  const awarded: string[] = []

  const streak = await db.query.streaks.findFirst({
    where: eq(streaks.anonUserId, anonUserId),
  })
  if (!streak) return awarded

  const userPredictions = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.anonUserId, anonUserId), eq(predictions.scored, true)))

  const totalScored = userPredictions.length
  const perfectMatches = userPredictions.filter(
    (p) => p.score !== null && p.maxPossibleScore !== null && p.score === p.maxPossibleScore
  ).length
  const highConfidence = userPredictions.filter((p) => p.confidence >= 4).length

  // First prediction (any prediction, not just scored)
  const allPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.anonUserId, anonUserId))
  if (allPredictions.length >= 1) {
    const ok = await awardBadge(anonUserId, "first_prediction")
    if (ok) awarded.push("first_prediction")
  }

  // Streak badges
  if (streak.currentStreak >= 3) {
    const ok = await awardBadge(anonUserId, "on_fire")
    if (ok) awarded.push("on_fire")
  }
  if (streak.currentStreak >= 5) {
    const ok = await awardBadge(anonUserId, "electric")
    if (ok) awarded.push("electric")
  }
  if (streak.currentStreak >= 10) {
    const ok = await awardBadge(anonUserId, "legendary")
    if (ok) awarded.push("legendary")
  }
  if (streak.bestStreak >= 5) {
    const ok = await awardBadge(anonUserId, "oracle")
    if (ok) awarded.push("oracle")
  }

  // Sniper: 3 perfect matches
  if (perfectMatches >= 3) {
    const ok = await awardBadge(anonUserId, "sniper")
    if (ok) awarded.push("sniper")
  }

  // Group survivor: 10+ predictions
  if (allPredictions.length >= 10) {
    const ok = await awardBadge(anonUserId, "group_survivor")
    if (ok) awarded.push("group_survivor")
  }

  // High roller: 5 high confidence
  if (highConfidence >= 5) {
    const ok = await awardBadge(anonUserId, "high_roller")
    if (ok) awarded.push("high_roller")
  }

  // Sharp: 70%+ accuracy across 5+ scored
  if (totalScored >= 5 && streak.totalMaxScore > 0) {
    const acc = streak.totalScore / streak.totalMaxScore
    if (acc >= 0.7) {
      const ok = await awardBadge(anonUserId, "sharp")
      if (ok) awarded.push("sharp")
    }
  }

  return awarded
}

/** Get all badges for a user */
export async function getUserBadges(anonUserId: string) {
  const rows = await db
    .select()
    .from(userBadges)
    .where(eq(userBadges.anonUserId, anonUserId))
  return rows.map((r) => ({
    ...BADGE_MAP[r.badgeKey],
    awardedAt: r.awardedAt,
  })).filter(Boolean)
}
