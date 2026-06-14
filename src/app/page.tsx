import { db } from "@/db"
import { matches } from "@/db/schema"
import { asc } from "drizzle-orm"
import MatchExplorer from "@/components/MatchExplorer"

export const revalidate = 60

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

<MatchExplorer allMatches={allMatches} />
    </div>
  )
}
