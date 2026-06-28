import { db } from "@/db"
import { matches } from "@/db/schema"
import { asc } from "drizzle-orm"
import MatchExplorer from "@/components/MatchExplorer"
import MatchDayBanner from "@/components/MatchDayBanner"
import HeroStatTile from "@/components/HeroStatTile"

export const revalidate = 60

export default async function HomePage() {
  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffAt))

  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const live = allMatches.filter((m) => m.status === "live")
  const upcoming = allMatches.filter((m) => m.status === "scheduled")
  const finished = allMatches.filter((m) => m.status === "finished")

  const todaysMatches = allMatches.filter((m) => {
    const k = new Date(m.kickoffAt)
    return k >= todayStart && k <= todayEnd
  })

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* Hero — stadium photo background */}
      <div
        style={{
          position: "relative",
          marginBottom: 48,
          textAlign: "center",
          overflow: "hidden",
          borderRadius: 28,
          padding: "60px 24px 48px",
          backgroundImage: "url(/stadium.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.32) 45%, rgba(20,55,20,0.65) 100%)",
            borderRadius: 28,
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            className="display"
            style={{
              fontSize: "clamp(44px, 11vw, 76px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 0.98,
              color: "#ffffff",
              textShadow: "0 2px 24px rgba(0,0,0,0.5)",
            }}
          >
            UKNOW<span style={{ color: "#6ddd6d" }}>BALL</span>
            <span style={{ color: "rgba(255,255,255,0.35)" }}>?</span>
          </h1>

          <p
            style={{
              marginTop: 18,
              fontSize: 16,
              color: "rgba(255,255,255,0.8)",
              maxWidth: 460,
              margin: "18px auto 0",
              lineHeight: 1.5,
            }}
          >
            Prove it. Predict every match, build a streak, and see how your calls
            stack up against everyone else watching this World Cup.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "flex",
              gap: 14,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: allMatches.length, label: "Matches", color: "#ffffff" },
              { value: upcoming.length, label: "To Predict", color: "#6ddd6d" },
              { value: finished.length, label: "Played", color: "#f5c842" },
              { value: live.length || undefined, label: "Live Now", color: "#ff6b6b" },
            ]
              .filter((s) => s.value !== undefined && s.value !== 0)
              .map(({ value, label, color }) => (
                <HeroStatTile
                  key={label}
                  value={value as number}
                  label={label}
                  color={color}
                  dark
                />
              ))}
          </div>
        </div>
      </div>

      {/* Match Day Banner moved below Hero */}
      {todaysMatches.length > 0 && (
        <MatchDayBanner count={todaysMatches.length} live={live.length} />
      )}

      <MatchExplorer allMatches={allMatches} />
    </div>
  )
}