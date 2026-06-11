import Link from "next/link"
import { db } from "@/db"
import { streaks } from "@/db/schema"
import { desc } from "drizzle-orm"

export const revalidate = 300

export default async function LeaderboardPage() {
  const top = await db
    .select()
    .from(streaks)
    .orderBy(desc(streaks.totalScore))
    .limit(50)

  const medals = ["🥇", "🥈", "🥉"]

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 36 }}>
        <h1 className="display" style={{ fontSize: 56, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
          Leader<span style={{ color: "var(--gold)" }}>board</span>
        </h1>
        <p style={{ marginTop: 12, color: "var(--chalk-dim)", fontSize: 14 }}>
          Ranked by total score across all predicted matches.
        </p>
      </div>

      {top.length === 0 ? (
        <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>
            No scores yet
          </p>
          <p style={{ color: "var(--chalk-faint)", marginTop: 8, fontSize: 14 }}>
            Be the first to predict a match and claim the top spot.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
            Start predicting →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {top.map((user, i) => {
            const accuracy = user.totalMaxScore > 0
              ? Math.round((user.totalScore / user.totalMaxScore) * 100)
              : 0
            const isTop3 = i < 3

            return (
              <Link key={user.anonUserId} href={`/profile/${user.anonUserId}`} style={{ textDecoration: "none" }}>
                <div
                  className="card"
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    borderColor: isTop3 ? "var(--line-bright)" : undefined,
                    background: i === 0 ? "rgba(232,193,74,0.05)" : undefined,
                  }}
                >
                  {/* Rank */}
                  <div style={{ minWidth: 36, textAlign: "center" }}>
                    {i < 3 ? (
                      <span style={{ fontSize: 22 }}>{medals[i]}</span>
                    ) : (
                      <span className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--chalk-faint)" }}>
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* User info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontFamily: "var(--font-body)", color: "var(--chalk-dim)" }}>
                      {user.anonUserId.slice(0, 8)}...
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>
                        {user.totalPredictions} predicted
                      </span>
                      {user.currentStreak > 0 && (
                        <span style={{ fontSize: 12, color: "var(--gold)" }}>
                          🔥 {user.currentStreak} streak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score + accuracy */}
                  <div style={{ textAlign: "right" }}>
                    <div className="display" style={{
                      fontSize: 26, fontWeight: 900, lineHeight: 1,
                      color: isTop3 ? "var(--gold)" : "var(--chalk)"
                    }}>
                      {user.totalScore}
                      <span style={{ fontSize: 13, color: "var(--chalk-faint)", fontWeight: 400 }}> pts</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--chalk-faint)", marginTop: 2 }}>
                      {accuracy}% accuracy
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
