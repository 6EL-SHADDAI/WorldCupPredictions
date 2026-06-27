"use client"
import { useEffect, useState } from "react"

const SKIPPED_KEY = "vibe_onboarding_skipped"

type Tab = "new" | "signin"

export default function OnboardingGate() {
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState<Tab>("new")

  // ── New account state ──
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [createStatus, setCreateStatus] = useState<"idle" | "saving" | "error">("idle")
  const [createError, setCreateError] = useState("")

  // ── Sign in state ──
  const [siUsername, setSiUsername] = useState("")
  const [siPin, setSiPin] = useState("")
  const [siStatus, setSiStatus] = useState<"idle" | "loading" | "error" | "locked">("idle")
  const [siError, setSiError] = useState("")

  useEffect(() => {
    const existing = localStorage.getItem("vibe_uid")
    const skipped = localStorage.getItem(SKIPPED_KEY)
    if (existing || skipped) return
    setShow(true)
  }, [])

  function handleSkip() {
    localStorage.setItem(SKIPPED_KEY, "1")
    setShow(false)
  }

  async function handleCreate() {
    const u = username.trim()
    const p = pin.trim()
    if (u.length < 3) { setCreateError("Username needs at least 3 characters."); return }
    if (p.length !== 4) { setCreateError("PIN needs to be exactly 4 digits."); return }
    setCreateStatus("saving")
    setCreateError("")
    const newId = crypto.randomUUID()
    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonUserId: newId, username: u, pin: p }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error ?? "Something went wrong."); setCreateStatus("error"); return }
      localStorage.setItem("vibe_uid", newId)
      setShow(false)
      window.location.reload()
    } catch {
      setCreateError("Network error — try again.")
      setCreateStatus("error")
    }
  }

  async function handleSignIn() {
    const u = siUsername.trim()
    const p = siPin.trim()
    if (!u || p.length !== 4) { setSiError("Enter your username and 4-digit PIN."); return }
    setSiStatus("loading")
    setSiError("")
    try {
      const res = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, pin: p }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSiError(data.error ?? "Wrong username or PIN.")
        setSiStatus(res.status === 429 ? "locked" : "error")
        return
      }
      localStorage.setItem("vibe_uid", data.anonUserId)
      setShow(false)
      window.location.reload()
    } catch {
      setSiError("Network error — try again.")
      setSiStatus("error")
    }
  }

  if (!show) return null

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "9px 0",
    borderRadius: 8,
    border: "none",
    background: active ? "var(--grass)" : "transparent",
    color: active ? "#fff" : "var(--chalk-dim)",
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s",
  })

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(20px) saturate(160%)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div className="glass-row" style={{
        maxWidth: 380, width: "100%", padding: "28px 24px",
        background: "rgba(20,30,20,0.9)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⚽</div>
          <h1 className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--chalk)" }}>
            UKNOW<span style={{ color: "var(--grass)" }}>BALL</span><span style={{ color: "var(--chalk-faint)" }}>?</span>
          </h1>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 4, padding: 4, borderRadius: 10,
          background: "rgba(255,255,255,0.06)", marginBottom: 20,
        }}>
          <button style={tabStyle(tab === "new")} onClick={() => setTab("new")}>New Account</button>
          <button style={tabStyle(tab === "signin")} onClick={() => setTab("signin")}>Sign In</button>
        </div>

        {/* New Account */}
        {tab === "new" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--chalk-dim)", margin: 0 }}>
              Pick a username and 4-digit PIN. No email, no password.
            </p>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 5 }}>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. vibe_master"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.06)", color: "var(--chalk)", fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 5 }}>4-Digit PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.06)", color: "var(--chalk)", fontSize: 20, fontFamily: "var(--font-display)", letterSpacing: "0.3em", textAlign: "center" }}
              />
              <p style={{ fontSize: 11, color: "var(--chalk-faint)", marginTop: 5 }}>
                Remember this — it gets you back in if you lose access later.
              </p>
            </div>
            {createError && <p style={{ color: "var(--red-card)", fontSize: 13, margin: 0 }}>{createError}</p>}
            <button onClick={handleCreate} disabled={createStatus === "saving"} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15 }}>
              {createStatus === "saving" ? "Creating..." : "Let's Go ⚽"}
            </button>
            <button onClick={handleSkip} style={{ background: "transparent", border: "none", color: "var(--chalk-faint)", fontSize: 12, cursor: "pointer", padding: "2px", textAlign: "center" }}>
              Skip for now
            </button>
          </div>
        )}

        {/* Sign In */}
        {tab === "signin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 12, color: "var(--chalk-dim)", margin: 0 }}>
              Already have an account? Enter your username and PIN to get back in.
            </p>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 5 }}>Username</label>
              <input
                value={siUsername}
                onChange={(e) => setSiUsername(e.target.value)}
                placeholder="e.g. BnB"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.06)", color: "var(--chalk)", fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 5 }}>4-Digit PIN</label>
              <input
                value={siPin}
                onChange={(e) => setSiPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.06)", color: "var(--chalk)", fontSize: 20, fontFamily: "var(--font-display)", letterSpacing: "0.3em", textAlign: "center" }}
              />
            </div>
            {siError && (
              <p style={{ color: siStatus === "locked" ? "var(--gold)" : "var(--red-card)", fontSize: 13, margin: 0 }}>
                {siError}
              </p>
            )}
            <button onClick={handleSignIn} disabled={siStatus === "loading" || siStatus === "locked"} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15 }}>
              {siStatus === "loading" ? "Checking..." : "Sign In"}
            </button>
            <button onClick={handleSkip} style={{ background: "transparent", border: "none", color: "var(--chalk-faint)", fontSize: 12, cursor: "pointer", padding: "2px", textAlign: "center" }}>
              Continue without signing in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
