import Link from "next/link"
import { db } from "@/db"
import { matches, crowdTallies } from "@/db/schema"
import { eq, and } from "drizzle-orm"

export const revalidate = 300

type MatchResult = {
  matchId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  crowdConfidence: number   // % who picked the crowd's top pick
  actualWinner: string
  crowdPickedWinner: string
  totalVotes: number
  crowdWasRight: boolean
}

async function getResults(): Promise<MatchResult[]> {
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"))

  const results: MatchResult[] = []

  for (const match of finishedMatches) {
    if (!match.winner || match.homeScore == null || match.awayScore == null) continue

    const tallies = await db
      .select()
      .from(crowdTallies)
      .where(and(eq(crowdTallies.matchId, match.id), eq(crowdTallies.questionKey, "winner")))

    if (tallies.length === 0) continue

    const total = tallies.reduce((s, t) => s + t.count, 0)
    if (total < 3) continue // skip matches with too few predictions

    const sorted = [...tallies].sort((a, b) => b.count - a.count)
    const crowdTopPick = sorted[0]
    const crowdPct = Math.round((crowdTopPick.count / total) * 100)

    const actualWinnerName =
      match.winner === "home" ? match.homeTeam
      : match.winner === "away" ? match.awayTeam
      : "Draw"

    const crowdPickName =
      crowdTopPick.optionValue === "home" ? match.homeTeam
      : crowdTopPick.optionValue === "away" ? match.awayTeam
      : "Draw"

    results.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      crowdConfidence: crowdPct,
      actualWinner: actualWinnerName,
      crowdPickedWinner: crowdPickName,
      totalVotes: total,
      crowdWasRight: crowdTopPick.optionValue === match.winner,
    })
  }

  return results
}

export default async function UpsetsPage() {
  const results = await getResults()

  const upsets = results
    .filter((r) => !r.crowdWasRight)
    .sort((a, b) => b.crowdConfidence - a.crowdConfidence)

  const correctCalls = results.filter((r) => r.crowdWasRight)
  const crowdAccuracy = results.length > 0
    ? Math.round((correctCalls.length / results.length) * 100)
    : null

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 className="display" style={{ fontSize: 56, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
          Upset<br /><span style={{ color: "var(--red-card)" }}>Hall of Fame</span>
        </h1>
        <p style={{ marginTop: 12, color: "var(--chalk-dim)", fontSize: 14 }}>
          How wrong (or right) the crowd has been so far.
        </p>
      </div>

      {results.length === 0 ? (
        <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚽</div>
          <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>
            No scored matches yet
          </p>
          <p style={{ color: "var(--chalk-faint)", marginTop: 8, fontSize: 14 }}>
            Once enough matches finish and predictions are scored, the crowd&apos;s track record will show up here.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
            Make predictions →
          </Link>
        </div>
      ) : (
        <>
          {/* Crowd accuracy overview */}
          <div className="card" style={{ padding: "24px", marginBottom: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 20, textAlign: "center" }}>
            <div>
              <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--grass)", lineHeight: 1 }}>
                {crowdAccuracy}<span style={{ fontSize: 22 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
                Crowd Accuracy
              </div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--chalk)", lineHeight: 1 }}>
                {correctCalls.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
                Correct Calls
              </div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--red-card)", lineHeight: 1 }}>
                {upsets.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
                Upsets
              </div>
            </div>
          </div>

          {/* Upsets list */}
          {upsets.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 12 }}>
                Biggest Upsets
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {upsets.map((r, i) => (
                  <Link key={r.matchId} href={`/match/${r.matchId}/results`} style={{ textDecoration: "none" }}>
                    <div className="card" style={{ padding: "20px 24px", borderColor: i === 0 ? "var(--red-card)" : undefined }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div className="display" style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                            {r.homeTeam} <span style={{ color: "var(--chalk-faint)" }}>{r.homeScore}–{r.awayScore}</span> {r.awayTeam}
                          </div>
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                            <div style={{ fontSize: 13, color: "var(--chalk-dim)" }}>
                              <span style={{ color: "var(--chalk-faint)" }}>Crowd picked: </span>
                              <span style={{ color: "var(--red-card)", fontWeight: 600 }}>{r.crowdPickedWinner}</span>
                              <span style={{ color: "var(--chalk-faint)" }}> ({r.crowdConfidence}% of {r.totalVotes} votes)</span>
                            </div>
                            <div style={{ fontSize: 13, color: "var(--chalk-dim)" }}>
                              <span style={{ color: "var(--chalk-faint)" }}>Actual result: </span>
                              <span style={{ color: "var(--grass-bright)", fontWeight: 600 }}>{r.actualWinner}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="display" style={{ fontSize: 40, fontWeight: 900, color: "var(--red-card)", lineHeight: 1 }}>
                            {r.crowdConfidence}%
                          </div>
                          <div style={{ fontSize: 11, color: "var(--chalk-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            wrong
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${r.crowdConfidence}%`, background: "var(--red-card)" }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Crowd was right list */}
          {correctCalls.length > 0 && (
            <section>
              <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 12 }}>
                Crowd Called It
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {correctCalls
                  .sort((a, b) => b.crowdConfidence - a.crowdConfidence)
                  .map((r) => (
                    <Link key={r.matchId} href={`/match/${r.matchId}/results`} style={{ textDecoration: "none" }}>
                      <div className="card" style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <div className="display" style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          {r.homeTeam} <span style={{ color: "var(--chalk-faint)" }}>{r.homeScore}–{r.awayScore}</span> {r.awayTeam}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--grass-bright)", fontWeight: 600 }}>
                          ✓ {r.crowdConfidence}% picked {r.actualWinner}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
