"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type Option = { value: string; label: string }
type Question = { id: string; questionKey: string; questionText: string; options: Option[]; correctAnswer?: string; sortOrder: number }
type MatchData = { id: string; homeTeam: string; awayTeam: string; homeTeamCode: string; awayTeamCode: string; stage: string; status: string; kickoffAt: string; homeScore: number | null; awayScore: number | null }
type CrowdData = { percentages: Record<string, Record<string, number> & { total: number }>; counts: Record<string, Record<string, number>> }

function useCountdown(kickoffAt: string) {
  const [ms, setMs] = useState(() => new Date(kickoffAt).getTime() - Date.now())
  useEffect(() => {
    const t = setInterval(() => setMs(new Date(kickoffAt).getTime() - Date.now()), 5000)
    return () => clearInterval(t)
  }, [kickoffAt])
  return ms
}

function CrowdBar({ label, pct, count, isMyPick }: { label: string; pct: number; count: number; isMyPick?: boolean }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
        <span style={{ fontSize: 14, fontWeight: isMyPick ? 700 : 400, color: isMyPick ? "var(--grass-bright)" : "var(--chalk)", display: "flex", alignItems: "center", gap: 6 }}>
          {isMyPick && <span style={{ fontSize: 12, background: "rgba(45,122,45,0.15)", color: "var(--grass)", padding: "1px 6px", borderRadius: 4 }}>You</span>}
          {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--chalk-dim)", fontWeight: 600 }}>
          {pct}% <span style={{ color: "var(--chalk-faint)", fontWeight: 400 }}>({count})</span>
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: isMyPick ? "var(--grass)" : "var(--line-bright)" }} />
      </div>
    </div>
  )
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [match, setMatch] = useState<MatchData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [confidence, setConfidence] = useState(3)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [crowd, setCrowd] = useState<CrowdData | null>(null)
  const [error, setError] = useState("")
  const [anonUserId, setAnonUserId] = useState("")

  useEffect(() => {
    let uid = localStorage.getItem("vibe_uid")
    if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("vibe_uid", uid) }
    setAnonUserId(uid)
  }, [])

  useEffect(() => {
    fetch(`/api/matches/${id}/questions`)
      .then((r) => r.json())
      .then((data) => { setMatch(data.match); setQuestions(data.questions ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const mainQuestions = questions.filter((q) => q.questionKey !== "confidence")
  const allAnswered = mainQuestions.every((q) => answers[q.questionKey])
  const isFinished = match?.status === "finished"
  const isLive = match?.status === "live"
  const isLocked = match?.status !== "scheduled"

  async function handleSubmit() {
    if (!allAnswered || !anonUserId) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/matches/${id}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonUserId, answers: { ...answers, confidence: String(confidence) }, confidence }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
      } else {
        setSubmitted(true)
        // Fetch crowd data to show the split
        fetch(`/api/matches/${id}/crowd`)
          .then((r) => r.json())
          .then(setCrowd)
          .catch(() => {})
      }
    } catch {
      setError("Network error — try again")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}><div className="display" style={{ fontSize: 18, color: "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Loading match...</div></div>
  }
  if (!match) {
    return <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}><p style={{ color: "var(--chalk-dim)" }}>Match not found.</p><Link href="/" className="btn-secondary" style={{ marginTop: 20, display: "inline-flex" }}>← Back</Link></div>
  }

  // Countdown display
  const kickoffMs = new Date(match.kickoffAt).getTime() - Date.now()
  const totalMins = Math.floor(kickoffMs / 60000)
  const hoursLeft = Math.floor(totalMins / 60)
  const minsLeft = totalMins % 60
  const countdownText = kickoffMs > 0
    ? hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m until kickoff` : `${minsLeft}m until kickoff!`
    : null

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chalk-faint)", fontSize: 13, textDecoration: "none", marginBottom: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        ← All Matches
      </Link>

      {/* Match header */}
      <div className="card" style={{ padding: "28px 24px", marginBottom: 28, textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 16 }}>
          {match.stage.replace(/_/g, " ")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div className="display" style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>{match.homeTeam}</div>
            <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600 }}>{match.homeTeamCode}</div>
          </div>
          <div>
            {isFinished ? (
              <div className="display" style={{ fontSize: 40, fontWeight: 900, letterSpacing: "0.06em" }}>
                {match.homeScore} <span style={{ color: "var(--chalk-faint)" }}>–</span> {match.awayScore}
              </div>
            ) : (
              <div className="display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", color: isLive ? "var(--red-card)" : "var(--chalk-faint)" }}>
                {isLive ? "LIVE" : "VS"}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              {isLive && <span className="badge badge-live"><span className="pulse">●</span> Live</span>}
              {isFinished && <span className="badge badge-finished">Full Time</span>}
              {!isFinished && !isLive && countdownText && (
                <span className="badge badge-upcoming" style={{ fontSize: 11 }}>{countdownText}</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="display" style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>{match.awayTeam}</div>
            <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600 }}>{match.awayTeamCode}</div>
          </div>
        </div>
      </div>

      {/* ── POST-PREDICTION: crowd split reveal ── */}
      {submitted && (
        <div className="card fade-in" style={{ padding: "28px 24px", marginBottom: 24, borderColor: "var(--grass)" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 6 }}>✅</div>
            <div className="display" style={{ fontSize: 22, fontWeight: 800, textTransform: "uppercase", color: "var(--grass)" }}>Prediction locked in!</div>
          </div>

          {crowd && crowd.percentages.winner && (
            <>
              <div style={{ borderTop: "1px solid var(--line)", margin: "16px 0" }} />
              <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 14 }}>
                🧠 How the crowd voted on the winner
              </div>
              {(() => {
                const pcts = crowd.percentages.winner
                const counts = crowd.counts.winner ?? {}
                const myWinnerPick = answers.winner
                const agreeingPct = myWinnerPick ? (pcts[myWinnerPick] as number ?? 0) : 0
                const agreeingLabel = agreeingPct >= 60 ? "You're with the crowd 🤝"
                  : agreeingPct >= 30 ? "Interesting pick 🤔"
                  : "You're a contrarian! 😱"
                return (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      {[
                        { value: "home", label: match.homeTeam },
                        { value: "draw", label: "Draw" },
                        { value: "away", label: match.awayTeam },
                      ].map(({ value, label }) => (
                        <CrowdBar
                          key={value}
                          label={label}
                          pct={(pcts[value] as number) ?? 0}
                          count={counts[value] ?? 0}
                          isMyPick={myWinnerPick === value}
                        />
                      ))}
                    </div>
                    <div style={{ textAlign: "center", padding: "10px", background: "rgba(45,122,45,0.06)", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--chalk-dim)" }}>
                      {agreeingLabel} — {agreeingPct}% of {pcts.total} predictors agree with you.
                    </div>
                  </>
                )
              })()}
              <div style={{ borderTop: "1px solid var(--line)", margin: "16px 0" }} />
            </>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/match/${id}/results`} className="btn-secondary">Full Crowd Breakdown</Link>
            <Link href={`/profile/${anonUserId}`} className="btn-secondary">My Stats</Link>
          </div>
        </div>
      )}

      {isFinished && !submitted && (
        <Link href={`/match/${id}/results`} className="btn-primary" style={{ display: "flex", marginBottom: 24 }}>
          View Full Results & Crowd Breakdown →
        </Link>
      )}

      {isLocked && !isFinished && !submitted && (
        <div className="card" style={{ padding: 20, marginBottom: 24, borderColor: "var(--red-card)", textAlign: "center" }}>
          <p style={{ color: "var(--chalk-dim)", fontSize: 14 }}>Predictions are closed — this match has kicked off.</p>
        </div>
      )}

      {/* Questions */}
      {!submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mainQuestions.map((q, i) => (
            <div key={q.id} className="card fade-in" style={{ padding: "20px 24px", animationDelay: `${i * 0.05}s` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                <span className="display" style={{ fontSize: 13, fontWeight: 700, color: "var(--grass)", letterSpacing: "0.06em" }}>Q{i + 1}</span>
                <span style={{ fontSize: 15, fontWeight: 500, color: "var(--chalk)" }}>{q.questionText}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {q.options.map((opt) => {
                  const selected = answers[q.questionKey] === opt.value
                  const isCorrect = isFinished && q.correctAnswer === opt.value
                  const isWrong = isFinished && selected && q.correctAnswer !== opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => !isLocked && setAnswers((a) => ({ ...a, [q.questionKey]: opt.value }))}
                      disabled={isLocked}
                      style={{
                        padding: "8px 16px", borderRadius: 5, fontSize: 14, fontWeight: 500,
                        cursor: isLocked ? "default" : "pointer",
                        border: `1px solid ${isCorrect ? "var(--grass)" : isWrong ? "var(--red-card)" : selected ? "var(--grass)" : "var(--line-bright)"}`,
                        background: isCorrect ? "rgba(45,122,45,0.2)" : isWrong ? "rgba(224,53,53,0.15)" : selected ? "rgba(45,122,45,0.15)" : "transparent",
                        color: isCorrect ? "var(--grass-bright)" : isWrong ? "var(--red-card)" : selected ? "var(--chalk)" : "var(--chalk-dim)",
                        transition: "all 0.15s",
                      }}
                    >
                      {isCorrect ? "✓ " : isWrong ? "✗ " : ""}{opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {!isLocked && mainQuestions.length > 0 && (
            <div className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>How confident are you?</span>
                <span className="display" style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>
                  {["", "Just guessing", "Not sure", "Fairly confident", "Very confident", "Certain"][confidence]}
                </span>
              </div>
              <input type="range" min={1} max={5} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--gold)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--chalk-faint)" }}>Low</span>
                <span style={{ fontSize: 11, color: "var(--chalk-faint)" }}>High (×2 pts if right, ×0 if wrong)</span>
              </div>
            </div>
          )}

          {!isLocked && (
            <div style={{ marginTop: 8 }}>
              {error && <p style={{ color: "var(--red-card)", fontSize: 14, marginBottom: 12, textAlign: "center" }}>{error}</p>}
              <button
                className="btn-primary"
                style={{ width: "100%", fontSize: 18, padding: "14px" }}
                disabled={!allAnswered || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Locking in..." : !allAnswered ? `Answer all ${mainQuestions.length} questions` : "Lock In My Prediction ⚽"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
