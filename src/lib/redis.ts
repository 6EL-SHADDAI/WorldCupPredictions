import { Redis } from "@upstash/redis"

export const redis = Redis.fromEnv()

// ─── Key builders ─────────────────────────────────────────────────────────────

const tallyKey = (matchId: string, questionKey: string) =>
  `match:${matchId}:tally:${questionKey}`

const lockKey = (matchId: string) => `match:${matchId}:locked`

const leaderboardKey = () => `leaderboard:scores`

// ─── Crowd tally helpers ──────────────────────────────────────────────────────

/**
 * Atomically increment a crowd tally counter.
 * Called once per question answer when a prediction is submitted.
 */
export async function incrementTally(
  matchId: string,
  questionKey: string,
  optionValue: string
): Promise<void> {
  await redis.hincrby(tallyKey(matchId, questionKey), optionValue, 1)
}

/**
 * Increment multiple tallies in a pipeline (one round-trip for all 8 questions).
 */
export async function incrementTalliesBatch(
  matchId: string,
  answers: Record<string, string>
): Promise<void> {
  const pipeline = redis.pipeline()
  for (const [questionKey, optionValue] of Object.entries(answers)) {
    pipeline.hincrby(tallyKey(matchId, questionKey), optionValue, 1)
  }
  await pipeline.exec()
}

/**
 * Get crowd tally for all options on a specific question.
 * Returns raw counts as Record<optionValue, count>.
 */
export async function getTally(
  matchId: string,
  questionKey: string
): Promise<Record<string, number>> {
  const raw = await redis.hgetall<Record<string, string>>(
    tallyKey(matchId, questionKey)
  )
  if (!raw) return {}
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)])
  )
}

/**
 * Get tallies for ALL questions of a match in one pipeline.
 * Returns Record<questionKey, Record<optionValue, count>>.
 */
export async function getAllTallies(
  matchId: string,
  questionKeys: string[]
): Promise<Record<string, Record<string, number>>> {
  const pipeline = redis.pipeline()
  for (const key of questionKeys) {
    pipeline.hgetall(tallyKey(matchId, key))
  }
  const results = await pipeline.exec()
  const out: Record<string, Record<string, number>> = {}
  questionKeys.forEach((key, i) => {
    const raw = results[i] as Record<string, string> | null
    out[key] = raw
      ? Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, parseInt(v, 10)]))
      : {}
  })
  return out
}

/**
 * Convert raw counts into percentage breakdown.
 * { home: 45, draw: 20, away: 35 } → { home: 45, draw: 20, away: 35, total: 100 }
 */
export function tallyToPercentages(
  counts: Record<string, number>
): Record<string, number> & { total: number } {
  const total = Object.values(counts).reduce((s, n) => s + n, 0)
  if (total === 0) return { total: 0 }
  const percentages: Record<string, number> = {}
  for (const [key, count] of Object.entries(counts)) {
    percentages[key] = Math.round((count / total) * 100)
  }
  return { ...percentages, total }
}

// ─── Match lock ───────────────────────────────────────────────────────────────

/**
 * Lock a match 5 minutes before kickoff so no more predictions are accepted.
 * TTL is irrelevant since we check match status server-side too — this is
 * a fast cache check to avoid a DB hit on every prediction attempt.
 */
export async function lockMatch(matchId: string): Promise<void> {
  await redis.set(lockKey(matchId), "1", { ex: 60 * 60 * 24 * 7 }) // 7 days TTL
}

export async function isMatchLocked(matchId: string): Promise<boolean> {
  const val = await redis.get(lockKey(matchId))
  return val === "1"
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Update leaderboard sorted set with a user's total score.
 * Uses ZADD with XX (update only) first, then NX (add if new).
 */
export async function updateLeaderboard(
  anonUserId: string,
  totalScore: number
): Promise<void> {
  await redis.zadd(leaderboardKey(), { score: totalScore, member: anonUserId })
}

/**
 * Get top N users from leaderboard.
 */
export async function getTopLeaderboard(
  limit = 50
): Promise<Array<{ anonUserId: string; score: number }>> {
  const results = await redis.zrange(leaderboardKey(), 0, limit - 1, {
    rev: true,
    withScores: true,
  })
  const out: Array<{ anonUserId: string; score: number }> = []
  for (let i = 0; i < results.length; i += 2) {
    out.push({ anonUserId: results[i] as string, score: results[i + 1] as number })
  }
  return out
}

/**
 * Get a user's rank in the leaderboard (1-indexed).
 */
export async function getUserRank(anonUserId: string): Promise<number | null> {
  const rank = await redis.zrevrank(leaderboardKey(), anonUserId)
  return rank !== null ? rank + 1 : null
}
