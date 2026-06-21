"use client"
import { useEffect, useState } from "react"

const SKIPPED_KEY = "vibe_onboarding_skipped"

export default function OnboardingGate() {
  const [show, setShow] = useState(false)
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle")
  const [error, setError] = useState("")
  const [anonId, setAnonId] = useState<string | null>(null)

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
    const trimmedUsername = username.trim()
    const trimmedPin = pin.trim()

    if (trimmedUsername.length < 3) {
      setError("Username needs to be at least 3 characters.")
      return
    }
    if (trimmedPin.length !== 4) {
      setError("PIN needs to be exactly 4 digits.")
      return
    }

    setStatus("saving")
    setError("")

    const newId = crypto.randomUUID()

    try {
      const res = await fetch("/api/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonUserId: newId, username: trimmedUsername, pin: trimmedPin }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        setStatus("error")
        return
      }

      localStorage.setItem("vibe_uid", newId)
      setShow(false)
      // Reload so every component picks up the new vibe_uid from localStorage
      // (Nav, MatchExplorer's predicted-set, etc. all read it on mount).
      window.location.reload()
    } catch {
      setError("Network error — try again.")
      setStatus("error")
    }
  }

  if (!show) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="glass-row"
        style={{
          maxWidth: 380,
          width: "100%",
          padding: "32px 28px",
          background: "rgba(255,255,255,0.6)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚽</div>
          <h1 className="display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--chalk)" }}>
            Welcome to UKNOW<span style={{ color: "var(--grass)" }}>BALL</span><span style={{ color: "var(--chalk-faint)" }}>?</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--chalk-dim)", marginTop: 8 }}>
            Pick a username and a 4-digit PIN — that&apos;s your account. No email, no password.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 6 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. vibe_master"
              maxLength={20}
              autoFocus
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.7)", color: "var(--chalk)", fontSize: 15 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 6 }}>4-Digit PIN</label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="••••"
              inputMode="numeric"
              maxLength={4}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.7)", color: "var(--chalk)", fontSize: 20, fontFamily: "var(--font-display)", letterSpacing: "0.3em", textAlign: "center" }}
            />
            <p style={{ fontSize: 11, color: "var(--chalk-faint)", marginTop: 6 }}>
              Remember this — it&apos;s how you get back in if you lose access on this device.
            </p>
          </div>

          {error && <p style={{ color: "var(--red-card)", fontSize: 13 }}>{error}</p>}

          <button
            onClick={handleCreate}
            disabled={status === "saving"}
            className="btn-primary"
            style={{ width: "100%", padding: "13px", fontSize: 15, marginTop: 4 }}
          >
            {status === "saving" ? "Creating..." : "Let's Go ⚽"}
          </button>

          <button
            onClick={handleSkip}
            style={{ background: "transparent", border: "none", color: "var(--chalk-faint)", fontSize: 12, cursor: "pointer", padding: "4px", textAlign: "center" }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
