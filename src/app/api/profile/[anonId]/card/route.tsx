import { ImageResponse } from "@vercel/og"
import { db } from "@/db"
import { streaks } from "@/db/schema"
import { eq } from "drizzle-orm"
import { NextRequest } from "next/server"

export const runtime = "edge"

const SITE_URL = "world-cup-predicts-nine.vercel.app"

export async function GET(req: NextRequest, { params }: { params: Promise<{ anonId: string }> }) {
  const { anonId } = await params

  const streak = await db.query.streaks.findFirst({ where: eq(streaks.anonUserId, anonId) })

  const displayName = streak?.username ?? `Anon-${anonId.slice(0, 6)}`
  const currentStreak = streak?.currentStreak ?? 0
  const bestStreak = streak?.bestStreak ?? 0
  const totalPredictions = streak?.totalPredictions ?? 0
  const accuracy =
    streak && streak.totalMaxScore > 0
      ? Math.round((streak.totalScore / streak.totalMaxScore) * 100)
      : 0

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #eafff0 0%, #d4f5d6 35%, #9fe6a8 70%, #5bc96a 100%)",
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {/* decorative blobs for ferrofluid-ish feel */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-100px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "rgba(45,122,45,0.25)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-140px",
            right: "-120px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "rgba(58,170,58,0.30)",
            filter: "blur(50px)",
          }}
        />

        {/* glass card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "1000px",
            height: "500px",
            borderRadius: "32px",
            background: "rgba(255,255,255,0.35)",
            border: "2px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 60px rgba(45,122,45,0.25)",
            padding: "48px 56px",
            position: "relative",
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "#2d7a2d",
                }}
              >
                Match Vibe Checker
              </div>
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: "#16201a",
                  marginTop: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                {displayName}
              </div>
            </div>
            <div
              style={{
                fontSize: 64,
                display: "flex",
              }}
            >
              
            </div>
          </div>

          {/* divider */}
          <div
            style={{
              height: "2px",
              background: "rgba(45,122,45,0.25)",
              margin: "32px 0",
              width: "100%",
            }}
          />

          {/* stats grid */}
          <div style={{ display: "flex", flex: 1, gap: "24px" }}>
            {[
              { label: "Current Streak", value: `${currentStreak}🔥`, color: "#b8860b" },
              { label: "Best Streak", value: `${bestStreak}`, color: "#16201a" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#2d7a2d" },
              { label: "Predictions", value: `${totalPredictions}`, color: "#16201a" },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  background: "rgba(255,255,255,0.45)",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.7)",
                  padding: "24px 12px",
                }}
              >
                <div style={{ fontSize: 56, fontWeight: 900, color: stat.color }}>
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#5a6b58",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 8,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "32px",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#16201a" }}>
              🏆 World Cup 2026 Predictions
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#2d7a2d",
                background: "rgba(255,255,255,0.5)",
                padding: "10px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(45,122,45,0.3)",
              }}
            >
              {SITE_URL}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
