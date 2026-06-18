"use client"
import { useState, useEffect } from "react"

function scrollToNextPrediction() {
  // Prefer the earliest upcoming, not-yet-predicted match card.
  const candidates = Array.from(
    document.querySelectorAll('[data-match-status="scheduled"][data-predicted="false"]')
  )
  const target = candidates[0] ?? document.querySelector('[data-match-status="live"]')

  if (target) {
    const rect = target.getBoundingClientRect()
    const y = rect.top + window.scrollY - 100 // leave room under sticky nav
    window.scrollTo({ top: y, behavior: "smooth" })
    target.animate(
      [
        { boxShadow: "0 0 0 0 rgba(45,122,45,0.5)" },
        { boxShadow: "0 0 0 8px rgba(45,122,45,0)" },
      ],
      { duration: 900, iterations: 2 }
    )
  } else {
    document.querySelector("[data-match-explorer]")?.scrollIntoView({ behavior: "smooth" })
  }
}

export default function MatchDayBanner({ count, live }: { count: number; live: number }) {
  const [predicted, setPredicted] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem("vibe_uid")
    if (!uid) return
    fetch(`/api/profile/${uid}`)
      .then((r) => r.json())
      .then((d) => setPredicted(d.predictions?.length ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Count how many unpredicted upcoming matches exist, for the CTA copy.
    const t = setTimeout(() => {
      const remainingCount = document.querySelectorAll(
        '[data-match-status="scheduled"][data-predicted="false"]'
      ).length
      setRemaining(remainingCount)
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      style={{
        background: live > 0 ? "rgba(217,43,43,0.08)" : "rgba(45,122,45,0.07)",
        border: `1px solid ${live > 0 ? "rgba(217,43,43,0.2)" : "rgba(45,122,45,0.2)"}`,
        borderRadius: 14,
        padding: "16px 24px",
        marginBottom: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        backdropFilter: "blur(10px) saturate(160%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>{live > 0 ? "🔴" : ""}</span>
        <div>
          <div className="display" style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em", color: "var(--chalk)" }}>
            {live > 0 ? `${live} match${live > 1 ? "es" : ""} live right now!` : `${count} match${count > 1 ? "es" : ""} today`}
          </div>
          <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginTop: 2 }}>
            {remaining !== null && remaining > 0
              ? `${remaining} match${remaining !== 1 ? "es" : ""} still need your prediction.`
              : predicted !== null
              ? `You've made ${predicted} prediction${predicted !== 1 ? "s" : ""} total — nice work!`
              : "Predict before kickoff to score points and build your streak."}
          </div>
        </div>
      </div>
      <button
        className="btn-primary"
        style={{ fontSize: 13, padding: "8px 18px", whiteSpace: "nowrap", border: "none" }}
        onClick={scrollToNextPrediction}
      >
        {live > 0 ? "Watch & Predict →" : "Jump to Next Match →"}
      </button>
    </div>
  )
}
