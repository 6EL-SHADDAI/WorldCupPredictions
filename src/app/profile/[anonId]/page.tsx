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
  match: { homeTeam: string; awayTeam: string; homeTeamCode: string; awayTeamCode: string; status: string; homeScore: number | null; awayScore: number | null; kickoffAt: string }
}
type BadgeData = { key: string; emoji: string; name: string; description: string; color: string; awardedAt: string }
type ProfileData = {
  anonUserId: string
  username: string | null
  streak: StreakData | null
  leaderboardRank: number | null
  accuracyByKey: Record<string, { correct: number; total: number }>
  predictions: PredictionRecord[]
}

const KEY_LABELS: Record<string, string> = {
  winner: "Result", margin: "Margin", first_goal_nation: "First Goal",
  match_vibe: "Match Vibe", wildcard: "Wildcard", extra_time: "Extra Time", penalties: "Penalties",
}

const MILESTONE_MESSAGES = [
  { threshold: 1, msg: "🎯 First prediction in the books!" },
  { threshold: 5, msg: "🔥 5 predictions — you're warming up!" },
  { threshold: 10, msg: "⚡ 10 predictions — now we're talking!" },
  { threshold: 25, msg: "🌟 25 predictions — legend in the making!" },
]

export default function ProfilePage() {
  const { anonId } = useParams<{ anonId: string }>()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)
  const [usernameInput, setUsernameInput] = useState("")
  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "saving" | "error">("idle")
  const [usernameError, setUsernameError] = useState("")
  const [newBadge, setNewBadge] = useState<BadgeData | null>(null)

  useEffect(() => {
    const myId = localStorage.getItem("vibe_uid")
    if (myId === anonId) setIsOwn(true)

    Promise.all([
      fetch(`/api/profile/${anonId}`).then((r) => r.json()),
      fetch(`/api/badges/${anonId}`).then((r) => r.json()),
    ]).then(([profileData, badgeData]) => {
      setProfile(profileData)
      setBadges(badgeData.badges ?? [])
      setLoading(false)

      // Show newest badge if just earned (awarded in last 60s)
      const recent = (badgeData.badges ?? []).find((b: BadgeData) => {
        return Date.now() - new Date(b.awardedAt).getTime() < 60000
      })
      if (recent) setNewBadge(recent)
    }).catch(() => setLoading(false))
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
      if (!res.ok) { setUsernameError(data.error ?? "Something went wrong."); setUsernameStatus("error"); return }
      setProfile((prev) => (prev ? { ...prev, username: data.username } : prev))
      setEditingUsername(false)
      setUsernameStatus("idle")
    } catch {
      setUsernameError("Network error — try again.")
      setUsernameStatus("error")
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}><div className="display" style={{ fontSize: 18, color: "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Loading profile...</div></div>
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
  const milestoneMsg = MILESTONE_MESSAGES.slice().reverse().find((m) => predictions.length >= m.threshold)

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chalk-faint)", fontSize: 13, textDecoration: "none", marginBottom: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        ← Matches
      </Link>

      {/* New badge celebration */}
      {newBadge && (
        <div className="card fade-in" style={{ padding: "20px 24px", marginBottom: 20, borderColor: newBadge.color, background: `${newBadge.color}10`, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 4 }}>{newBadge.emoji}</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", color: newBadge.color }}>Badge unlocked!</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--chalk)", marginTop: 4 }}>{newBadge.name}</div>
          <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginTop: 4 }}>{newBadge.description}</div>
          <button onClick={() => setNewBadge(null)} style={{ marginTop: 10, background: "transparent", border: "none", color: "var(--chalk-faint)", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 40, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>
          {profile.username ? `@${profile.username}` : isOwn ? "Your Record" : "Player Record"}
        </h1>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {leaderboardRank && <span className="badge badge-gold">#{leaderboardRank} globally</span>}
          {milestoneMsg && <span className="badge badge-upcoming" style={{ fontSize: 12 }}>{milestoneMsg.msg}</span>}
        </div>

        {isOwn && (
          <div style={{ marginTop: 14 }}>
            {!editingUsername ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "var(--chalk-faint)" }}>
                  {profile.username ? `Username: @${profile.username}` : "No username — friends can't find you"}
                </span>
                <button
                  onClick={() => { setUsernameInput(profile.username ?? ""); setEditingUsername(true); setUsernameError("") }}
                  className="btn-secondary" style={{ padding: "4px 14px", fontSize: 12 }}
                >
                  {profile.username ? "Change" : "Set username"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="e.g. vibe_master" maxLength={20}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.6)", color: "var(--chalk)", fontSize: 14 }}
                  />
                  <button onClick={saveUsername} disabled={usernameStatus === "saving"} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>Save</button>
                  <button onClick={() => { setEditingUsername(false); setUsernameError("") }} className="btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }}>Cancel</button>
                </div>
                <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>3–20 chars: letters, numbers, underscores.</span>
                {usernameError && <span style={{ fontSize: 12, color: "var(--red-card)" }}>{usernameError}</span>}
              </div>
            )}
          </div>
        )}

        {isOwn && (
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`/api/profile/${anonId}/card`} download={`vibe-checker-${profile.username ?? anonId.slice(0, 6)}.png`} className="btn-primary" style={{ display: "inline-flex" }}>
              📸 Download Card
            </a>
            <Link href="/leaderboard?tab=friends" className="btn-secondary" style={{ display: "inline-flex" }}>
              👥 Friends Board
            </Link>
          </div>
        )}
      </div>

      {/* Stats row */}
      {streak && (
        <div className="card" style={{ padding: "24px", marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 20 }}>
          {[
            { value: streak.currentStreak, label: "Streak", suffix: streak.currentStreak > 0 ? " 🔥" : "", color: "var(--gold)" },
            { value: streak.bestStreak, label: "Best", color: "var(--chalk)" },
            { value: streak.overallAccuracy ?? "–", label: "Accuracy", suffix: streak.overallAccuracy !== null ? "%" : "", color: "var(--grass)" },
            { value: streak.totalPredictions, label: "Predicted", color: "var(--chalk)" },
            { value: streak.totalScore, label: "Pts", color: "var(--gold)" },
          ].map(({ value, label, suffix, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div className="display" style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{value}{suffix ?? ""}</div>
              <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="card" style={{ padding: "20px 24px", marginBottom: 20 }}>
          <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-dim)", marginBottom: 14 }}>
            Badges Earned
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {badges.map((b) => (
              <div
                key={b.key}
                title={b.description}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: `${b.color}15`, border: `1px solid ${b.color}40`,
                  borderRadius: 10, padding: "8px 14px",
                }}
              >
                <span style={{ fontSize: 22 }}>{b.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: b.color }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--chalk-faint)" }}>{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges to unlock (teaser) */}
      {isOwn && badges.length < 11 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 20, background: "rgba(45,122,45,0.03)" }}>
          <div className="display" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 10 }}>
            Still to unlock
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { key: "oracle", emoji: "🔮", name: "Oracle", description: "Best streak of 5+" },
              { key: "upset_hunter", emoji: "😱", name: "Upset Hunter", description: "Predict 3 upsets" },
              { key: "sniper", emoji: "🎯", name: "Sniper", description: "3 perfect matches" },
              { key: "legendary", emoji: "🌟", name: "Legendary", description: "10-game win streak" },
              { key: "sharp", emoji: "🗡️", name: "Sharp", description: "70%+ accuracy over 5 matches" },
              { key: "high_roller", emoji: "💎", name: "High Roller", description: "5 high-confidence picks" },
              { key: "group_survivor", emoji: "🌍", name: "Group Survivor", description: "Predict 10+ matches" },
            ]
              .filter((b) => !badges.find((earned) => earned.key === b.key))
              .slice(0, 5)
              .map((b) => (
                <div key={b.key} title={b.description} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "6px 12px", opacity: 0.6 }}>
                  <span style={{ fontSize: 16, filter: "grayscale(1)" }}>{b.emoji}</span>
                  <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>{b.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Accuracy by type */}
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
                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 60 ? "var(--grass)" : pct >= 40 ? "var(--gold)" : "var(--red-card)" }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Match history */}
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
