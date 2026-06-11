"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Matches" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/upsets", label: "Upsets" },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: "rgba(10,14,10,0.95)",
        borderBottom: "1px solid var(--line)",
        backdropFilter: "blur(12px)",
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
        }}
      >
        {/* Wordmark */}
        <Link href="/" style={{ textDecoration: "none" }}>
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

        {/* Links */}
        <div style={{ display: "flex", gap: 4 }}>
          {links.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "6px 14px",
                  borderRadius: 5,
                  color: active ? "var(--chalk)" : "var(--chalk-dim)",
                  background: active ? "var(--line)" : "transparent",
                  textDecoration: "none",
                  transition: "color 0.15s, background 0.15s",
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
