"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

type CrowdData = {
  matchId: string
  percentages: Record<string, Record<string, number> & { total: number }>
  counts: Record<string, Record<string, number>>
}
type MatchData = {
  id: string
  homeTeam: string
  awayTeam: string
  status: string
  homeScore: number | null
  awayScore: number | null
  stage: string
}
type Question = {
  id: string
  questionKey: string
  questionText: string
  options: Array<{ value: string; label: string }>
  correctAnswer?: string
}

const QUESTION_LABELS: Record<string, string> = {
  winner: "Who wins?",
  margin: "Winning margin",
  extra_time: "Extra time?",
  penalties: "Penalties?",
  first_goal_nation: "First goal",
  match_vibe: "Match vibe",
  wildcard: "Wildcard event",
}

function CrowdBar({ label, pct, count, isCorrect, isHighest }: {
  label: string; pct: number; count: number; isCorrect?: boolean; isHighest?: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "center" }}>
        <span style={{
          fontSize: 14, fontWeight: isHighest ? 600 : 400,
          color: isCorrect ? "var(--grass-bright)" : "var(--chalk)",
          display: "flex", alignItems: "center", gap: 6
        }}>
          {isCorrect && <span style={{ color: "var(--grass)" }}>✓</span>}
          {label}
        </span>
        <span style={{ fontSize: 13, color: "var(--chalk-dim)", fontWeight: 600 }}>
          {pct}% <span style={{ color: "var(--chalk-faint)", fontWeight: 400 }}>({count})</span>
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: isCorrect ? "var(--grass)" : isHighest ? "var(--chalk-dim)" : "var(--line-bright)"
          }}
        />
      </div>
    </div>
  )
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<MatchData | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [crowd, setCrowd] = useState<CrowdData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${id}/questions`).then((r) => r.json()),
      fetch(`/api/matches/${id}/crowd`).then((r) => r.json()),
    ]).then(([qData, cData]) => {
      setMatch(qData.match)
      setQuestions(qData.questions?.filter((q: Question) => q.questionKey !== "confidence") ?? [])
      setCrowd(cData)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <div className="display" style={{ fontSize: 18, color: "var(--chalk-dim)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Loading results...
        </div>
      </div>
    )
  }

  if (!match || !crowd) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--chalk-dim)" }}>Results not available yet.</p>
        <Link href={`/match/${id}`} className="btn-secondary" style={{ marginTop: 20, display: "inline-flex" }}>← Back to Match</Link>
      </div>
    )
  }

  const isFinished = match.status === "finished"

  // Find most controversial question (closest to 50/50)
  let mostControversial = ""
  let closestDiff = Infinity
  for (const q of questions) {
    const pcts = crowd.percentages[q.questionKey]
    if (!pcts) continue
    const vals = Object.entries(pcts).filter(([k]) => k !== "total").map(([, v]) => v as number)
    if (vals.length < 2) continue
    const sorted = [...vals].sort((a, b) => b - a)
    const diff = sorted[0] - sorted[1]
    if (diff < closestDiff) { closestDiff = diff; mostControversial = q.questionKey }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 20px 80px" }}>
      <Link href={`/match/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chalk-faint)", fontSize: 13, textDecoration: "none", marginBottom: 28, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        ← Back to Match
      </Link>

      {/* Header */}
      <div className="card" style={{ padding: "24px", marginBottom: 28, textAlign: "center" }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 12 }}>
          Crowd Breakdown
        </div>
        <div className="display" style={{ fontSize: 26, fontWeight: 800, textTransform: "uppercase" }}>
          {match.homeTeam} <span style={{ color: "var(--chalk-faint)" }}>vs</span> {match.awayTeam}
        </div>
        {isFinished && (
          <div className="display" style={{ fontSize: 44, fontWeight: 900, marginTop: 8, letterSpacing: "0.06em" }}>
            {match.homeScore} <span style={{ color: "var(--chalk-faint)" }}>–</span> {match.awayScore}
          </div>
        )}
        {!isFinished && (
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-upcoming">Predictions still open</span>
          </div>
        )}
      </div>

      {/* Total predictors */}
      {crowd.percentages.winner?.total > 0 && (
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span className="display" style={{ fontSize: 32, fontWeight: 900, color: "var(--gold)" }}>
            {crowd.percentages.winner.total}
          </span>
          <span style={{ fontSize: 14, color: "var(--chalk-faint)", marginLeft: 8 }}>people predicted this match</span>
        </div>
      )}

      {/* Per-question breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q) => {
          const pcts = crowd.percentages[q.questionKey] ?? {}
          const counts = crowd.counts[q.questionKey] ?? {}
          const total = pcts.total ?? 0
          const isControversial = q.questionKey === mostControversial
          const maxPct = Math.max(...q.options.map((o) => (pcts[o.value] as number) ?? 0))

          return (
            <div key={q.id} className="card fade-in" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span className="display" style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {QUESTION_LABELS[q.questionKey] ?? q.questionText}
                </span>
                {isControversial && (
                  <span className="badge" style={{ background: "rgba(232,193,74,0.15)", color: "var(--gold)" }}>
                    🔥 Split crowd
                  </span>
                )}
              </div>
              {total === 0 ? (
                <p style={{ color: "var(--chalk-faint)", fontSize: 14 }}>No predictions yet</p>
              ) : (
                q.options.map((opt) => {
                  const pct = (pcts[opt.value] as number) ?? 0
                  const count = counts[opt.value] ?? 0
                  return (
                    <CrowdBar
                      key={opt.value}
                      label={opt.label}
                      pct={pct}
                      count={count}
                      isCorrect={isFinished && q.correctAnswer === opt.value}
                      isHighest={pct === maxPct && pct > 0}
                    />
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/" className="btn-secondary">All Matches</Link>
        <Link href="/upsets" className="btn-secondary">Upset Hall of Fame</Link>
      </div>
    </div>
  )
}
