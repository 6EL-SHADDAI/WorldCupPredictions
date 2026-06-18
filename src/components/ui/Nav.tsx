"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import LiquidGlass from "./liquid-glass/LiquidGlass"

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/hot-takes", label: "Hot Takes" },
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
  const [menuOpen, setMenuOpen] = useState(false)
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
        background: "rgba(255,255,255,0.55)",
        borderBottom: "1px solid rgba(45,122,45,0.12)",
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

        {/* Desktop glass pill nav + My Stats together */}
        <LiquidGlass
          className="glass-pill-track"
          layout="inline"
          mode="standard"
          displacementScale={42}
          blurAmount={0.08}
          saturation={170}
          aberrationIntensity={1.8}
          elasticity={0}
          cornerRadius={999}
          padding="3px"
          tint="rgba(45,122,45,0.04)"
          contentColor="var(--chalk)"
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {links.map((link) => (
              <NavPill key={link.href} href={link.href} label={link.label} active={pathname === link.href} />
            ))}
          {anonId && (
            <NavPill href={`/profile/${anonId}`} label="My Stats" active={pathname === `/profile/${anonId}`} />
          )}
          </div>
        </LiquidGlass>

        {/* User corner */}
        {anonId ? (
          <div style={{ position: "relative", flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
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
              }}
            >
              <span style={{ fontSize: 15 }}>👤</span>
              <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {username ? `@${username}` : "Profile"}
              </span>
              <span style={{ fontSize: 9, color: "var(--chalk-faint)" }}>▾</span>
            </button>

            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    border: "1px solid rgba(45,122,45,0.15)",
                    borderRadius: 14,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                    minWidth: 190,
                    zIndex: 50,
                    overflow: "hidden",
                  }}
                >
                  {username && (
                    <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(45,122,45,0.1)", fontSize: 12, color: "var(--chalk-faint)" }}>
                      Signed in as <strong style={{ color: "var(--chalk)" }}>@{username}</strong>
                    </div>
                  )}
                  <Link href={`/profile/${anonId}`} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500 }}>
                    📊 My Stats
                  </Link>
                  <Link href={`/leaderboard?tab=friends`} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500 }}>
                    👥 Friends Board
                  </Link>
                  <Link href={`/api/profile/${anonId}/card`} download onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "10px 14px", fontSize: 14, color: "var(--chalk)", textDecoration: "none", fontWeight: 500, borderTop: "1px solid rgba(45,122,45,0.1)" }}>
                    📸 Download Card
                  </Link>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--chalk-faint)", flexShrink: 0 }}>Predict to join</div>
        )}

        {/* Mobile hamburger */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          style={{
            display: "none",
            width: 38, height: 38, borderRadius: 999,
            background: "rgba(45,122,45,0.1)", border: "1px solid rgba(45,122,45,0.2)",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 18 }}>{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="mobile-nav-panel"
          style={{
            display: "none",
            padding: "8px 16px 16px",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid rgba(45,122,45,0.1)",
          }}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block", padding: "12px 14px", borderRadius: 10,
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: pathname === link.href ? "#fff" : "var(--chalk)",
                background: pathname === link.href ? "var(--grass)" : "transparent",
                textDecoration: "none", marginBottom: 4,
              }}
            >
              {link.label}
            </Link>
          ))}
          {anonId && (
            <Link
              href={`/profile/${anonId}`}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block", padding: "12px 14px", borderRadius: 10,
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14,
                textTransform: "uppercase", letterSpacing: "0.05em",
                color: pathname === `/profile/${anonId}` ? "#fff" : "var(--chalk)",
                background: pathname === `/profile/${anonId}` ? "var(--grass)" : "transparent",
                textDecoration: "none",
              }}
            >
              My Stats
            </Link>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .glass-pill-track { display: none !important; }
          .mobile-nav-toggle { display: flex !important; }
          .mobile-nav-panel { display: block !important; }
        }
      `}</style>
    </nav>
  )
}
