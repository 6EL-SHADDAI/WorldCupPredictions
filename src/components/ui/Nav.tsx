"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/upsets", label: "Upsets" },
]

export default function Nav() {
  const pathname = usePathname()
  const [anonId, setAnonId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const uid = localStorage.getItem("vibe_uid")
    if (!uid) return
    setAnonId(uid)
    fetch(`/api/profile/${uid}`)
      .then((r) => r.json())
      .then((d) => { if (d.username) setUsername(d.username) })
      .catch(() => {})
  }, [])

  return (
    <nav
      style={{
        background: "rgba(255,255,255,0.82)",
        borderBottom: "1px solid var(--line)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none", flexShrink: 0 }}>
          <span
            className="display"
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              color: "var(--chalk)",
            }}
          >
            ⚽ Vibe<span style={{ color: "var(--grass)" }}>Checker</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 2, flex: 1, justifyContent: "center" }}>
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "6px 12px",
                  borderRadius: 6,
                  color: active ? "var(--chalk)" : "var(--chalk-dim)",
                  background: active ? "rgba(45,122,45,0.1)" : "transparent",
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* User corner */}
        {anonId ? (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(45,122,45,0.08)",
                border: "1px solid var(--line-bright)",
                borderRadius: 8,
                padding: "6px 12px",
                cursor: "pointer",
                color: "var(--chalk)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ fontSize: 16 }}>👤</span>
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username ? `@${username}` : "My Profile"}
              </span>
              <span style={{ fontSize: 10, color: "var(--chalk-faint)" }}>▾</span>
            </button>

            {menuOpen && (
              <>
                {/* backdrop */}
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: "fixed", inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--line-bright)",
                    borderRadius: 10,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
                    minWidth: 180,
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {username && (
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--line)", fontSize: 12, color: "var(--chalk-faint)" }}>
                      Signed in as <strong style={{ color: "var(--chalk)" }}>@{username}</strong>
                    </div>
                  )}
                  <Link
                    href={`/profile/${anonId}`}
                    onClick={() => setMenuOpen(false)}
                    style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500 }}
                  >
                    📊 My Stats
                  </Link>
                  <Link
                    href={`/leaderboard?tab=friends`}
                    onClick={() => setMenuOpen(false)}
                    style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500 }}
                  >
                    👥 Friends Board
                  </Link>
                  <Link
                    href={`/api/profile/${anonId}/card`}
                    download
                    onClick={() => setMenuOpen(false)}
                    style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500, borderTop: "1px solid var(--line)" }}
                  >
                    📸 Download Card
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--chalk-faint)", flexShrink: 0 }}>
            Predict to join
          </div>
        )}
      </div>

      {/* Welcome back banner — only shows once per session */}
      {username && pathname === "/" && (
        <div
          style={{
            background: "rgba(45,122,45,0.07)",
            borderBottom: "1px solid var(--line)",
            padding: "6px 20px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--chalk-dim)",
          }}
        >
          Welcome back, <strong style={{ color: "var(--grass)" }}>@{username}</strong> ⚽ Make your predictions before kickoff!
        </div>
      )}
    </nav>
  )
}
