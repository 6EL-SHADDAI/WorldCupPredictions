"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import type { Match } from "@/db/schema"

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

function MatchCard({ match }: { match: Match }) {
  const isFinished = match.status === "finished"

  return (
    <Link href={`/match/${match.id}`} style={{ textDecoration: "none" }}>
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
            style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--chalk)" }}
          >
            {match.homeTeam}
          </div>
          <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600, letterSpacing: "0.08em" }}>
            {match.homeTeamCode}
          </div>
        </div>

        {/* Score / VS */}
        <div style={{ textAlign: "center", minWidth: 100 }}>
          {isFinished ? (
            <div className="display" style={{ fontSize: 32, fontWeight: 900, letterSpacing: "0.06em", color: "var(--chalk)", lineHeight: 1 }}>
              {match.homeScore} <span style={{ color: "var(--chalk-faint)" }}>–</span> {match.awayScore}
            </div>
          ) : (
            <div className="display" style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "var(--chalk-faint)" }}>
              VS
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <StatusBadge status={match.status} />
          </div>
          {!isFinished && (
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--chalk-faint)" }}>
              {formatKickoff(match.kickoffAt)}
            </div>
          )}
        </div>

        {/* Away team */}
        <div style={{ textAlign: "left" }}>
          <div
            className="display"
            style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--chalk)" }}
          >
            {match.awayTeam}
          </div>
          <div style={{ fontSize: 12, color: "var(--chalk-faint)", fontWeight: 600, letterSpacing: "0.08em" }}>
            {match.awayTeamCode}
          </div>
        </div>
      </div>
    </Link>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <span className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
    </div>
  )
}

export default function MatchExplorer({ allMatches }: { allMatches: Match[] }) {
  const [query, setQuery] = useState("")

  const q = query.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return allMatches
    return allMatches.filter(
      (m) =>
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q) ||
        m.homeTeamCode.toLowerCase().includes(q) ||
        m.awayTeamCode.toLowerCase().includes(q)
    )
  }, [allMatches, q])

  const live = filtered.filter((m) => m.status === "live")
  const upcoming = filtered.filter((m) => m.status === "scheduled")
  const finished = filtered
    .filter((m) => m.status === "finished")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime())
  const grouped = groupByDate(upcoming)

  const isSearching = q.length > 0
  const noResults = isSearching && filtered.length === 0

  return (
    <div>
      {/* Search bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ position: "relative" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Search by country — e.g. Brazil, ARG, Japan..."
            style={{
              width: "100%",
              padding: "14px 18px",
              borderRadius: 12,
              border: "1px solid var(--line-bright)",
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(10px)",
              color: "var(--chalk)",
              fontSize: 15,
              outline: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--chalk-faint)",
                fontSize: 18,
                cursor: "pointer",
                lineHeight: 1,
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {noResults && (
        <div className="card" style={{ padding: "40px 20px", textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔎</div>
          <p style={{ color: "var(--chalk-dim)" }}>
            No matches found for &ldquo;{query}&rdquo;.
          </p>
        </div>
      )}

      {/* When searching, show a flat combined list ordered by kickoff */}
      {isSearching && filtered.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <SectionHeader label={`${filtered.length} match${filtered.length === 1 ? "" : "es"} found`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...filtered]
              .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
              .map((m) => <MatchCard key={m.id} match={m} />)}
          </div>
        </section>
      )}

      {/* Default (non-search) view */}
      {!isSearching && (
        <>
          {finished.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <SectionHeader label="Results" />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {finished.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {live.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span className="badge badge-live">
                  <span className="pulse">●</span> Live Now
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {live.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          )}

          {Object.entries(grouped).map(([date, dateMatches]) => (
            <section key={date} style={{ marginBottom: 36 }}>
              <SectionHeader label={date} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dateMatches.map((m) => <MatchCard key={m.id} match={m} />)}
              </div>
            </section>
          ))}

          {allMatches.length === 0 && (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--chalk-faint)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚽</div>
              <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase" }}>
                No matches yet
              </p>
              <p style={{ marginTop: 8, fontSize: 14 }}>
                Matches will appear once the tournament schedule is loaded.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}