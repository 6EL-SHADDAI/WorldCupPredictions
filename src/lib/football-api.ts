/**
 * football-data.org free tier wrapper
 * Free tier gives: competitions, matches, standings, teams
 * Rate limit: 10 requests/minute
 * World Cup 2026 competition ID: 2000 (FIFA World Cup)
 */

const BASE_URL = "https://api.football-data.org/v4"
const API_KEY = process.env.FOOTBALL_DATA_API_KEY!
const WC_COMPETITION_ID = 2000

type FDMatch = {
  id: number
  utcDate: string
  status: "SCHEDULED" | "LIVE" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED" | "TIMED"
  stage: string
  homeTeam: { name: string | null; tla: string | null }
  awayTeam: { name: string | null; tla: string | null }
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
    fullTime: { home: number | null; away: number | null }
    extraTime: { home: number | null; away: number | null }
    penalties: { home: number | null; away: number | null }
  }
}

type FDMatchesResponse = {
  matches: FDMatch[]
}

async function fetchFD<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": API_KEY },
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`football-data.org error: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

// ─── Stage mapping ────────────────────────────────────────────────────────────

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  ROUND_OF_32: "round_of_32",
  ROUND_OF_16: "round_of_16",
  QUARTER_FINALS: "quarter_final",
  SEMI_FINALS: "semi_final",
  THIRD_PLACE: "third_place",
  FINAL: "final",
}

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "scheduled",
  TIMED: "scheduled",
  LIVE: "live",
  IN_PLAY: "live",
  PAUSED: "live",
  FINISHED: "finished",
  POSTPONED: "postponed",
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export type NormalisedMatch = {
  externalId: number
  homeTeam: string
  awayTeam: string
  homeTeamCode: string
  awayTeamCode: string
  stage: string
  status: string
  kickoffAt: Date
  homeScore: number | null
  awayScore: number | null
  winner: string | null
  wentToExtraTime: boolean
  wentToPenalties: boolean
}

export function normaliseFDMatch(m: FDMatch): NormalisedMatch {
  const wentToExtraTime =
    m.score.extraTime?.home !== null && m.score.extraTime?.home !== undefined

  const wentToPenalties =
    m.score.penalties?.home !== null && m.score.penalties?.home !== undefined

  let winner: string | null = null
  if (m.score.winner === "HOME_TEAM") winner = "home"
  else if (m.score.winner === "AWAY_TEAM") winner = "away"
  else if (m.score.winner === "DRAW") winner = "draw"

  return {
    externalId: m.id,
    homeTeam: m.homeTeam.name ?? "TBD",
    awayTeam: m.awayTeam.name ?? "TBD",
    homeTeamCode: m.homeTeam.tla ?? "TBD",
    awayTeamCode: m.awayTeam.tla ?? "TBD",
    stage: STAGE_MAP[m.stage] ?? "group",
    status: STATUS_MAP[m.status] ?? "scheduled",
    kickoffAt: new Date(m.utcDate),
    homeScore: m.score.fullTime?.home ?? null,
    awayScore: m.score.fullTime?.away ?? null,
    winner,
    wentToExtraTime,
    wentToPenalties,
  }
}
export async function getWorldCupMatches(): Promise<NormalisedMatch[]> {
  const data = await fetchFD<FDMatchesResponse>(
    `/competitions/${WC_COMPETITION_ID}/matches`
  )
  return data.matches.filter(
    (m) => m.homeTeam.name && m.awayTeam.name
  ).map(normaliseFDMatch)
}

export async function getMatch(externalId: number): Promise<NormalisedMatch> {
  const data = await fetchFD<{ match: FDMatch }>(`/matches/${externalId}`)
  return normaliseFDMatch(data.match)
}