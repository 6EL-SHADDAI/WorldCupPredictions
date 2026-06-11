"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

type Option = { value: string; label: string }
type Question = {
  id: string
  questionKey: string
  questionText: string
  options: Option[]
  correctAnswer?: string
  sortOrder: number
}
type MatchData = {
  id: string
  homeTeam: string
  awayTeam: string
  homeTeamCode: string
  awayTeamCode: string
  stage: string
  status: string
  kickoffAt: string
  homeScore: number | null
  awayScore: number | null
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
  const [error, setError] = useState("")
  const [anonUserId, setAnonUserId] = useState("")

  useEffect(() => {
    let uid = localStorage.getItem("vibe_uid")
    if (!uid) {
      uid = crypto.randomUUID()
      localStorage.setItem("vibe_uid", uid)
    }
    setAnonUserId(uid)
  }, [])

  useEffect(() => {
    fetch(`/api/matches/${id}/questions`)
      .then((r) => r.json())
      .then((data) => {
        setMatch(data.match)
        setQuestions(data.questions ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const mainQuestions = questions.filter((q) => q.questionKey !== "confidence")
  const allAnswered = mainQuestions.every((q) => answers[q.questionKey])
  const isFinished = match?.status === "finished"
  const isLocked = match?.status !== "scheduled"

  async function handleSubmit() {
    if (!allAnswered || !anonUserId) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`/api/matches/${id}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonUserId,
          answers: { ...answers, confidence: String(confidence) },
          confidence,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
      } else {
        setSubmitted(true)
      }
    } catch {
      setError("Network error — try again")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 18, color: "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Loading match...
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--chalk-dim)" }}>Match not found.</p>
        <Link href="/" className="btn-secondary" style={{ marginTop: 20, display: "inline-flex" }}>← Back</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Back */}
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
              <div className="display" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", color: "var(--chalk-faint)" }}>VS</div>
            )}
            <div style={{ marginTop: 8 }}>
              {match.status === "live" && <span className="badge badge-live"><span className="pulse">●</span> Live</span>}
              {match.status === "finished" && <span className="badge badge-finished">Full Time</span>}
              {match.status === "scheduled" && <span className="badge badge-upcoming">Upcoming</span>}
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <div className="display" style={{ fontSize: 28, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>{match.awayTeam}</div>
            <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600 }}>{match.awayTeamCode}</div>
          </div>
        </div>
      </div>

      {/* Submitted confirmation */}
      {submitted && (
        <div className="card fade-in" style={{ padding: "24px", marginBottom: 24, borderColor: "var(--grass)", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div className="display" style={{ fontSize: 20, fontWeight: 800, textTransform: "uppercase", color: "var(--grass)" }}>Prediction locked in!</div>
          <p style={{ color: "var(--chalk-dim)", marginTop: 8, fontSize: 14 }}>Check back after the match to see your score and how the crowd called it.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <Link href={`/match/${id}/results`} className="btn-secondary">View Crowd Picks</Link>
            <Link href={`/profile/${anonUserId}`} className="btn-secondary">My Profile</Link>
          </div>
        </div>
      )}

      {/* Finished — view results CTA */}
      {isFinished && !submitted && (
        <Link href={`/match/${id}/results`} className="btn-primary" style={{ display: "flex", marginBottom: 24 }}>
          View Full Results & Crowd Breakdown →
        </Link>
      )}

      {/* Locked — not submitted */}
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
                <span className="display" style={{ fontSize: 13, fontWeight: 700, color: "var(--grass)", letterSpacing: "0.06em" }}>
                  Q{i + 1}
                </span>
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
                        padding: "8px 16px",
                        borderRadius: 5,
                        fontSize: 14,
                        fontWeight: 500,
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

          {/* Confidence slider */}
          {!isLocked && mainQuestions.length > 0 && (
            <div className="card" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>How confident are you?</span>
                <span className="display" style={{ fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>
                  {["", "Just guessing", "Not sure", "Fairly confident", "Very confident", "Certain"][confidence]}
                </span>
              </div>
              <input
                type="range" min={1} max={5} value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "var(--chalk-faint)" }}>Low</span>
                <span style={{ fontSize: 11, color: "var(--chalk-faint)" }}>High (×2 pts if right, ×0 if wrong)</span>
              </div>
            </div>
          )}

          {/* Submit */}
          {!isLocked && (
            <div style={{ marginTop: 8 }}>
              {error && (
                <p style={{ color: "var(--red-card)", fontSize: 14, marginBottom: 12, textAlign: "center" }}>{error}</p>
              )}
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
