"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function MatchDayBanner({ count, live }: { count: number; live: number }) {
  const [predicted, setPredicted] = useState<number | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem("vibe_uid")
    if (!uid) return
    fetch(`/api/profile/${uid}`)
      .then((r) => r.json())
      .then((d) => setPredicted(d.predictions?.length ?? 0))
      .catch(() => {})
  }, [])

  const isMatchDay = count > 0

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
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 28 }}>{live > 0 ? "🔴" : "⚽"}</span>
        <div>
          <div className="display" style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--chalk)" }}>
            {live > 0 ? `${live} match${live > 1 ? "es" : ""} live right now!` : `${count} match${count > 1 ? "es" : ""} today`}
          </div>
          <div style={{ fontSize: 13, color: "var(--chalk-dim)", marginTop: 2 }}>
            {predicted !== null
              ? `You've made ${predicted} prediction${predicted !== 1 ? "s" : ""} total — don't miss today's games!`
              : "Predict before kickoff to score points and build your streak."}
          </div>
        </div>
      </div>
      <Link
        href="#matches"
        className="btn-primary"
        style={{ fontSize: 13, padding: "8px 18px", whiteSpace: "nowrap" }}
        onClick={(e) => {
          e.preventDefault()
          document.querySelector("[data-match-explorer]")?.scrollIntoView({ behavior: "smooth" })
          window.scrollBy(0, -20)
        }}
      >
        {live > 0 ? "Watch & Predict →" : "Predict Now →"}
      </Link>
    </div>
  )
}
