import Link from "next/link"
import { db } from "@/db"
import { matches } from "@/db/schema"
import { asc } from "drizzle-orm"
import type { Match } from "@/db/schema"
import Ferrofluid from "@/components/ui/Ferrofluid"

export const revalidate = 60

function formatKickoff(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-ZA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function groupByDate(matches: Match[]): Record<string, Match[]> {
  return matches.reduce((acc, match) => {
    const date = new Date(match.kickoffAt).toLocaleDateString("en-ZA", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(match)
    return acc
  }, {} as Record<string, Match[]>)
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="badge badge-live">
        <span className="pulse">●</span> Live
      </span>
    )
  }
  if (status === "finished") {
    return <span className="badge badge-finished">Full Time</span>
  }
  return <span className="badge badge-upcoming">Upcoming</span>
}

function StagePill({ stage }: { stage: string }) {
  const labels: Record<string, string> = {
    group: "Group Stage",
    round_of_32: "Round of 32",
    round_of_16: "Round of 16",
    quarter_final: "Quarter Final",
    semi_final: "Semi Final",
    third_place: "3rd Place",
    final: "Final",
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "var(--chalk-faint)",
      }}
    >
      {labels[stage] ?? stage}
    </span>
  )
}

function MatchCard({ match }: { match: Match }) {
  const isFinished = match.status === "finished"

  return (
    <Link
      href={`/match/${match.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="card"
        style={{
          padding: "16px 20px",
          cursor: "pointer",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Home team */}
        <div style={{ textAlign: "right" }}>
          <div
            className="display"
            style={{
              fontSize: 20,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              color: "var(--chalk)",
            }}
          >
            {match.homeTeam}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--chalk-faint)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {match.homeTeamCode}
          </div>
        </div>

        {/* Score / VS */}
        <div style={{ textAlign: "center", minWidth: 100 }}>
          {isFinished ? (
            <div
              className="display"
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "0.06em",
                color: "var(--chalk)",
                lineHeight: 1,
              }}
            >
              {match.homeScore} <span style={{ color: "var(--chalk-faint)" }}>–</span> {match.awayScore}
            </div>
          ) : (
            <div
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--chalk-faint)",
              }}
            >
              VS
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={match.status} />
          </div>
          {!isFinished && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "var(--chalk-faint)",
              }}
            >
              {formatKickoff(match.kickoffAt)}
            </div>
          )}
        </div>

        {/* Away team */}
        <div style={{ textAlign: "left" }}>
          <div
            className="display"
            style={{
              fontSize: 20,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              color: "var(--chalk)",
            }}
          >
            {match.awayTeam}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--chalk-faint)",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {match.awayTeamCode}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.kickoffAt))

  const live = allMatches.filter((m) => m.status === "live")
  const upcoming = allMatches.filter((m) => m.status === "scheduled")
  //const finished = allMatches.filter((m) => m.status === "finished")      sort by most recent kickoffs first  
  const finished = allMatches
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
  const grouped = groupByDate(upcoming)

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 20px 80px" }}>

      {/* Hero */}
<div
  style={{
    position: "relative",
    marginBottom: 48,
    textAlign: "center",
    overflow: "hidden",
    borderRadius: 24,
    minHeight: 300,
  }}
>
  {/* Ferrofluid background */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
    }}
  >
    <Ferrofluid
      colors={["#2d7a2d", "#3aaa3a", "#0f1a0f"]}
      speed={0.3}
      scale={1.6}
      turbulence={0.8}
      fluidity={0.15}
      rimWidth={0.2}
      sharpness={2.5}
      shimmer={1.5}
      glow={2}
      flowDirection="down"
      opacity={0.6}
      mouseInteraction={true}
      mouseStrength={1}
      mouseRadius={0.35}
    />
  </div>

  {/* Hero content */}
  <div
    style={{
      position: "relative",
      zIndex: 1,
      padding: "48px 20px",
    }}
  >
    <h1
      className="display"
      style={{
        fontSize: "clamp(48px, 10vw, 80px)",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
        lineHeight: 0.95,
        color: "var(--chalk)",
      }}
    >
      World Cup
      <br />
      <span style={{ color: "var(--grass)" }}>2026</span>
    </h1>

    <p
      style={{
        marginTop: 16,
        fontSize: 15,
        color: "var(--chalk-dim)",
        maxWidth: 420,
        margin: "16px auto 0",
      }}
    >
      Predict every match. Build your streak. See how the crowd called it.
    </p>

    <div
      style={{
        marginTop: 24,
        display: "flex",
        gap: 16,
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          className="display"
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "var(--chalk)",
          }}
        >
          {allMatches.length}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--chalk-faint)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Matches
        </div>
      </div>

      <div
        style={{
          width: 1,
          background: "var(--line)",
          alignSelf: "stretch",
        }}
      />

      <div style={{ textAlign: "center" }}>
        <div
          className="display"
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "var(--grass)",
          }}
        >
          {upcoming.length}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--chalk-faint)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          To Predict
        </div>
      </div>

      <div
        style={{
          width: 1,
          background: "var(--line)",
          alignSelf: "stretch",
        }}
      />

      <div style={{ textAlign: "center" }}>
        <div
          className="display"
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "var(--gold)",
          }}
        >
          {finished.length}
        </div>

        <div
          style={{
            fontSize: 12,
            color: "var(--chalk-faint)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Played
        </div>
      </div>
    </div>
  </div>
</div>

{/* Finished */}
      {finished.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--chalk-faint)",
              }}
            >
              Results
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {finished.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}
      {/* Live matches */}
      {live.length > 0 && (
        <section style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <span className="badge badge-live">
              <span className="pulse">●</span> Live Now
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {live.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Upcoming by date */}
      {Object.entries(grouped).map(([date, dateMatches]) => (
        <section key={date} style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--chalk-dim)",
              }}
            >
              {date}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dateMatches.map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      ))}

      

      {/* Empty state */}
      {allMatches.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            color: "var(--chalk-faint)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
          <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase" }}>
            No matches yet
          </p>
          <p style={{ marginTop: 8, fontSize: 14 }}>
            Matches will appear once the tournament schedule is loaded.
          </p>
        </div>
      )}
    </div>
  )
}
