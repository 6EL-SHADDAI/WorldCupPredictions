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
      <div style={{ position: "relative", marginBottom: 48, textAlign: "center", overflow: "hidden", borderRadius: 24, minHeight: 280 }}>
        <div style={{ position: "relative", zIndex: 1, padding: "48px 20px" }}>
          <h1
            className="display"
            style={{ fontSize: "clamp(48px, 10vw, 80px)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95, color: "var(--chalk)" }}
          >
            World Cup<br /><span style={{ color: "var(--grass)" }}>2026</span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 15, color: "var(--chalk-dim)", maxWidth: 420, margin: "16px auto 0" }}>
            Predict every match. Build your streak. See how the crowd called it.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { value: allMatches.length, label: "Matches", color: "var(--chalk)" },
              { value: upcoming.length, label: "To Predict", color: "var(--grass)" },
              { value: finished.length, label: "Played", color: "var(--gold)" },
              { value: live.length || undefined, label: "Live Now", color: "var(--red-card)" },
            ].filter((s) => s.value !== undefined && s.value !== 0).map(({ value, label, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div className="display" style={{ fontSize: 36, fontWeight: 900, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MatchExplorer allMatches={allMatches} />
    </div>
  )
}
