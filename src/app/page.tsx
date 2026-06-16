import { db } from "@/db"
import { matches } from "@/db/schema"
import { asc } from "drizzle-orm"
import MatchExplorer from "@/components/MatchExplorer"
import MatchDayBanner from "@/components/MatchDayBanner"

export const revalidate = 60

export default async function HomePage() {
  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffAt))

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(now); todayEnd.setHours(23,59,59,999)

  const live = allMatches.filter((m) => m.status === "live")
  const upcoming = allMatches.filter((m) => m.status === "scheduled")
  const finished = allMatches
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())

  const todaysMatches = allMatches.filter((m) => {
    const k = new Date(m.kickoffAt)
    return k >= todayStart && k <= todayEnd
  })

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* Match day banner */}
      {todaysMatches.length > 0 && (
        <MatchDayBanner count={todaysMatches.length} live={live.length} />
      )}

      {/* Hero */}
      <div
        style={{
          position: "relative",
          marginBottom: 48,
          textAlign: "center",
          overflow: "hidden",
          borderRadius: 28,
          padding: "56px 24px 44px",
          background: "linear-gradient(160deg, rgba(255,255,255,0.5) 0%, rgba(45,122,45,0.08) 100%)",
          border: "1px solid rgba(45,122,45,0.15)",
          backdropFilter: "blur(18px) saturate(160%)",
          boxShadow: "0 8px 40px rgba(45,122,45,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
      >
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(45,122,45,0.1)", border: "1px solid rgba(45,122,45,0.25)",
            borderRadius: 999, padding: "5px 14px", marginBottom: 20,
            fontSize: 12, fontWeight: 700, color: "var(--grass)",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}
        >
          ⚽ World Cup 2026
        </div>

        <h1
          className="display"
          style={{
            fontSize: "clamp(44px, 11vw, 76px)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 0.98,
            color: "var(--chalk)",
          }}
        >
          UKNOW<span style={{ color: "var(--grass)" }}>BALL</span>
          <span style={{ color: "var(--chalk-faint)" }}>?</span>
        </h1>

        <p style={{ marginTop: 18, fontSize: 16, color: "var(--chalk-dim)", maxWidth: 460, margin: "18px auto 0", lineHeight: 1.5 }}>
          Prove it. Predict every match, build a streak, and see how your calls
          stack up against everyone else watching this World Cup.
        </p>

        <div style={{ marginTop: 32, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { value: allMatches.length, label: "Matches", color: "var(--chalk)" },
            { value: upcoming.length, label: "To Predict", color: "var(--grass)" },
            { value: finished.length, label: "Played", color: "var(--gold)" },
            { value: live.length || undefined, label: "Live Now", color: "var(--red-card)" },
          ].filter((s) => s.value !== undefined && s.value !== 0).map(({ value, label, color }) => (
            <div
              key={label}
              style={{
                minWidth: 90,
                padding: "14px 18px",
                borderRadius: 16,
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(45,122,45,0.15)",
                backdropFilter: "blur(8px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <div className="display" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <MatchExplorer allMatches={allMatches} />
    </div>
  )
}
