"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type StreakData = {
  currentStreak: number
  bestStreak: number
  totalPredictions: number
  totalScore: number
  totalMaxScore: number
  overallAccuracy: number | null
  lastPredictedAt: string | null
}
type PredictionRecord = {
  id: string
  matchId: string
  score: number | null
  maxPossibleScore: number | null
  scored: boolean
  confidence: number
  createdAt: string
  match: {
    homeTeam: string
    awayTeam: string
    homeTeamCode: string
    awayTeamCode: string
    status: string
    homeScore: number | null
    awayScore: number | null
    kickoffAt: string
  }
}
type ProfileData = {
  anonUserId: string
  username: string | null
  streak: StreakData | null
  leaderboardRank: number | null
  accuracyByKey: Record<string, { correct: number; total: number }>
  predictions: PredictionRecord[]
}

const KEY_LABELS: Record<string, string> = {
  winner: "Result",
  margin: "Margin",
  first_goal_nation: "First Goal",
  match_vibe: "Match Vibe",
  wildcard: "Wildcard",
  extra_time: "Extra Time",
  penalties: "Penalties",
}

export default function ProfilePage() {
  const { anonId } = useParams<{ anonId: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)
  const [usernameInput, setUsernameInput] = useState("")
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "saving" | "error">("idle")
  const [usernameError, setUsernameError] = useState("")

  useEffect(() => {
    const myId = localStorage.getItem("vibe_uid")
    if (myId === anonId) setIsOwn(true)
    fetch(`/api/profile/${anonId}`)
      .then((r) => r.json())
      .then((data) => { setProfile(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [anonId])

  async function saveUsername() {
    const trimmed = usernameInput.trim()
    setUsernameStatus("saving")
    setUsernameError("")
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonUserId: anonId, username: trimmed || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUsernameError(data.error ?? "Something went wrong.")
        setUsernameStatus("error")
        return
      }
      setProfile((prev) => (prev ? { ...prev, username: data.username } : prev))
      setEditingUsername(false)
      setUsernameStatus("idle")
    } catch {
      setUsernameError("Network error — try again.")
      setUsernameStatus("error")
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 18, color: "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Loading profile...</div>
      </div>
    )
  }

  if (!profile || (!profile.streak && profile.predictions.length === 0)) {
    return (
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--chalk-dim)" }}>No predictions found.</p>
        <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>Make your first prediction →</Link>
      </div>
    )
  }

  const { streak, leaderboardRank, accuracyByKey, predictions } = profile
  const scored = predictions.filter((p) => p.scored)

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chalk-faint)", fontSize: 13, textDecoration: "none", marginBottom: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        ← Matches
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 40, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {profile.username ?? (isOwn ? "Your" : "Their")}{!profile.username && " Record"}
        </h1>
        {leaderboardRank && (
          <div style={{ marginTop: 6 }}>
            <span className="badge badge-gold">#{leaderboardRank} on leaderboard</span>
          </div>
        )}

        {isOwn && (
          <div style={{ marginTop: 14 }}>
            {!editingUsername ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--chalk-faint)" }}>
                  {profile.username ? `Username: ${profile.username}` : "No username set"}
                </span>
                <button
                  onClick={() => { setUsernameInput(profile.username ?? ""); setEditingUsername(true); setUsernameError("") }}
                  className="btn-secondary"
                  style={{ padding: "4px 14px", fontSize: 12 }}
                >
                  {profile.username ? "Change" : "Set a username"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. vibe_master"
                    maxLength={20}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--line-bright)",
                      background: "rgba(255,255,255,0.6)",
                      color: "var(--chalk)",
                      fontSize: 14,
                    }}
                  />
                  <button onClick={saveUsername} disabled={usernameStatus === "saving"} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                    Save
                  </button>
                  <button onClick={() => { setEditingUsername(false); setUsernameError("") }} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
                <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>
                  3–20 characters: letters, numbers, underscores. Leave blank to remove your username.
                </span>
                {usernameError && (
                  <span style={{ fontSize: 12, color: "var(--red-card)" }}>{usernameError}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Download result card */}
        <div style={{ marginTop: 16 }}>
          <a
            href={`/api/profile/${anonId}/card`}
            download={`vibe-checker-${profile.username ?? anonId.slice(0, 6)}.png`}
            className="btn-primary"
            style={{ display: "inline-flex" }}
          >
            📸 Download Result Card
          </a>
        </div>
      </div>

      {/* Stats row */}
      {streak && (
        <div className="card" style={{ padding: "24px", marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--gold)", lineHeight: 1 }}>
              {streak.currentStreak > 0 && <span className="streak-fire">🔥</span>}
              {streak.currentStreak}
            </div>
            <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
              Current Streak
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--chalk)", lineHeight: 1 }}>{streak.bestStreak}</div>
            <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Best Streak</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--grass)", lineHeight: 1 }}>
              {streak.overallAccuracy ?? "–"}
              {streak.overallAccuracy !== null && <span style={{ fontSize: 22 }}>%</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Accuracy</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 44, fontWeight: 900, color: "var(--chalk)", lineHeight: 1 }}>{streak.totalPredictions}</div>
            <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>Predicted</div>
          </div>
        </div>
      )}

      {/* Accuracy by question type */}
      {Object.keys(accuracyByKey).length > 0 && (
        <div className="card" style={{ padding: "20px 24px", marginBottom: 20 }}>
          <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-dim)", marginBottom: 16 }}>
            Accuracy by Category
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(accuracyByKey).map(([key, { correct, total }]) => {
              const pct = Math.round((correct / total) * 100)
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: "var(--chalk-dim)" }}>{KEY_LABELS[key] ?? key}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: pct >= 60 ? "var(--grass-bright)" : pct >= 40 ? "var(--gold)" : "var(--red-card)" }}>
                      {pct}% <span style={{ color: "var(--chalk-faint)", fontWeight: 400 }}>({correct}/{total})</span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: pct >= 60 ? "var(--grass)" : pct >= 40 ? "var(--gold)" : "var(--red-card)"
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Prediction history */}
      <div>
        <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-dim)", marginBottom: 12 }}>
          Match History
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {predictions.map((p) => {
            const scoreColor = p.score !== null && p.maxPossibleScore
              ? (p.score / p.maxPossibleScore) >= 0.6 ? "var(--grass-bright)"
                : (p.score / p.maxPossibleScore) >= 0.3 ? "var(--gold)"
                : "var(--red-card)"
              : "var(--chalk-dim)"
            return (
              <Link key={p.id} href={`/match/${p.matchId}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="display" style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {p.match.homeTeamCode} <span style={{ color: "var(--chalk-faint)" }}>vs</span> {p.match.awayTeamCode}
                    </div>
                    {p.match.status === "finished" && p.match.homeScore !== null && (
                      <div style={{ fontSize: 12, color: "var(--chalk-faint)", marginTop: 2 }}>
                        {p.match.homeScore} – {p.match.awayScore} · Full Time
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {p.scored && p.score !== null ? (
                      <>
                        <div className="display" style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>
                          {p.score}<span style={{ fontSize: 13, color: "var(--chalk-faint)" }}>/{p.maxPossibleScore}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--chalk-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>pts</div>
                      </>
                    ) : (
                      <span className="badge badge-upcoming">Pending</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
