"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
]

function NavPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 36,
        padding: "0 18px",
        borderRadius: 999,
        fontFamily: "var(--font-display)",
        fontSize: 13,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        textDecoration: "none",
        color: active || hovered ? "#ffffff" : "var(--chalk-dim)",
        background: active
          ? "var(--grass)"
          : hovered
          ? "var(--grass)"
          : "transparent",
        transition: "background 0.28s cubic-bezier(0.22, 1, 0.36, 1), color 0.2s ease",
        overflow: "hidden",
      }}
    >
      {label}
    </Link>
  )
}

export default function Nav() {
  const pathname = usePathname()
  const [anonId, setAnonId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

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
        background: "rgba(10,15,10,0.85)",
        borderBottom: "1px solid rgba(58,170,58,0.15)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "10px 20px",
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
              fontSize: 21,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--chalk)",
            }}
          >
            UKNOW<span style={{ color: "var(--grass)" }}>BALL</span>
            <span style={{ color: "var(--chalk-faint)", fontWeight: 600 }}>?</span>
          </span>
        </Link>

        {/* Desktop glass pill nav */}
        <div className="glass-pill-track pill-track desktop-nav-track">
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {links.map((link) => (
              <NavPill key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
            ))}
            {anonId && (
              <NavPill href={`/profile/${anonId}`} label="My Stats" active={pathname === `/profile/${anonId}`} />
            )}
          </div>
        </div>

        {/* User corner — username text links straight to stats, no dropdown */}
        {anonId ? (
          <Link
            href={`/profile/${anonId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(45,122,45,0.1)",
              border: "1px solid rgba(45,122,45,0.2)",
              borderRadius: 999,
              padding: "6px 14px",
              cursor: "pointer",
              color: "var(--chalk)",
              fontSize: 13,
              fontWeight: 600,
              backdropFilter: "blur(8px)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15 }}></span>
            <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {username ? `@${username}` : "My Stats"}
            </span>
          </Link>
        ) : (
          <Link href="/recover" style={{ fontSize: 12, color: "var(--chalk-faint)", flexShrink: 0, textDecoration: "underline" }}>
            Already played? Recover
          </Link>
        )}

        {/* Mobile hamburger - always show, with "Menu" label */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          style={{
            display: "none",
            alignItems: "center", justifyContent: "center",
            gap: 6, cursor: "pointer",
            background: "rgba(45,122,45,0.1)", border: "1px solid rgba(45,122,45,0.2)",
            borderRadius: 999, padding: "6px 14px",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{mobileOpen ? "✕" : "☰"}</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--chalk)" }}>
            {mobileOpen ? "Close" : "Menu"}
          </span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="mobile-nav-panel"
          style={{
            display: "none",
            padding: "8px 16px 20px",
            background: "rgba(10,15,10,0.92)",
            backdropFilter: "blur(20px) saturate(180%)",
            borderTop: "1px solid rgba(45,122,45,0.1)",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", padding: "13px 16px", borderRadius: 12,
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: pathname === link.href ? "#fff" : "var(--chalk)",
                background: pathname === link.href ? "var(--grass)" : "transparent",
                textDecoration: "none", marginBottom: 4,
              }}
            >
              {link.label}
            </Link>
          ))}
          {anonId ? (
            <Link
              href={`/profile/${anonId}`}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", padding: "13px 16px", borderRadius: 12,
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: pathname === `/profile/${anonId}` ? "#fff" : "var(--chalk)",
                background: pathname === `/profile/${anonId}` ? "var(--grass)" : "transparent",
                textDecoration: "none", marginBottom: 4,
              }}
            >
              {username ? `@${username}` : "My Stats"}
            </Link>
          ) : (
            <Link
              href="/recover"
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", padding: "13px 16px", borderRadius: 12,
                fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14,
                color: "var(--chalk-dim)", textDecoration: "underline",
              }}
            >
              Already played? Recover account
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .desktop-nav-track { display: none !important; }
          .mobile-nav-toggle { display: flex !important; }
          .mobile-nav-panel { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
