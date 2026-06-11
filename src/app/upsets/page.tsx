import Link from "next/link"
import { db } from "@/db"
import { matches, crowdTallies, questions } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const revalidate = 300

type UpsetMatch = {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  crowdConfidence: number   // % who picked the wrong winner
  actualWinner: string
  crowdPickedWinner: string
  totalVotes: number
}

async function getUpsets(): Promise<UpsetMatch[]> {
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"))

  const upsets: UpsetMatch[] = []

  for (const match of finishedMatches) {
    if (!match.winner || match.homeScore == null || match.awayScore == null) continue

    // Get winner question tallies from DB (flushed from Redis post-match)
    const tallies = await db
      .select()
      .from(crowdTallies)
      .where(and(eq(crowdTallies.matchId, match.id), eq(crowdTallies.questionKey, "winner")))

    if (tallies.length === 0) continue

    const total = tallies.reduce((s, t) => s + t.count, 0)
    if (total < 5) continue // skip matches with too few predictions

    // Find what the crowd most picked
    const sorted = [...tallies].sort((a, b) => b.count - a.count)
    const crowdTopPick = sorted[0]

    // Only include if the crowd was WRONG
    if (crowdTopPick.optionValue === match.winner) continue

    const crowdPct = Math.round((crowdTopPick.count / total) * 100)

    // Map winner code to team name
    const actualWinnerName =
      match.winner === "home" ? match.homeTeam
      : match.winner === "away" ? match.awayTeam
      : "Draw"

    const crowdPickName =
      crowdTopPick.optionValue === "home" ? match.homeTeam
      : crowdTopPick.optionValue === "away" ? match.awayTeam
      : "Draw"

    upsets.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      crowdConfidence: crowdPct,
      actualWinner: actualWinnerName,
      crowdPickedWinner: crowdPickName,
      totalVotes: total,
    })
  }

  // Sort by how wrong the crowd was (highest confidence wrong pick first)
  return upsets.sort((a, b) => b.crowdConfidence - a.crowdConfidence)
}

export default async function UpsetsPage() {
  const upsets = await getUpsets()

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 className="display" style={{ fontSize: 56, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
          Upset<br /><span style={{ color: "var(--red-card)" }}>Hall of Fame</span>
        </h1>
        <p style={{ marginTop: 12, color: "var(--chalk-dim)", fontSize: 14 }}>
          Matches where the crowd was most confidently wrong.
        </p>
      </div>

      {upsets.length === 0 ? (
        <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😅</div>
          <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>
            No upsets yet
          </p>
          <p style={{ color: "var(--chalk-faint)", marginTop: 8, fontSize: 14 }}>
            The crowd has been right so far. That won't last.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
            Make predictions →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {upsets.map((upset, i) => (
            <Link key={upset.matchId} href={`/match/${upset.matchId}/results`} style={{ textDecoration: "none" }}>
              <div className="card" style={{ padding: "20px 24px", borderColor: i === 0 ? "var(--red-card)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="display" style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {upset.homeTeam} <span style={{ color: "var(--chalk-faint)" }}>{upset.homeScore}–{upset.awayScore}</span> {upset.awayTeam}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 13, color: "var(--chalk-dim)" }}>
                        <span style={{ color: "var(--chalk-faint)" }}>Crowd picked: </span>
                        <span style={{ color: "var(--red-card)", fontWeight: 600 }}>{upset.crowdPickedWinner}</span>
                        <span style={{ color: "var(--chalk-faint)" }}> ({upset.crowdConfidence}% of {upset.totalVotes} votes)</span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--chalk-dim)" }}>
                        <span style={{ color: "var(--chalk-faint)" }}>Actual result: </span>
                        <span style={{ color: "var(--grass-bright)", fontWeight: 600 }}>{upset.actualWinner}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="display" style={{ fontSize: 40, fontWeight: 900, color: "var(--red-card)", lineHeight: 1 }}>
                      {upset.crowdConfidence}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--chalk-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      wrong
                    </div>
                  </div>
                </div>
                {/* Wrong confidence bar */}
                <div style={{ marginTop: 14 }}>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${upset.crowdConfidence}%`, background: "var(--red-card)" }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
