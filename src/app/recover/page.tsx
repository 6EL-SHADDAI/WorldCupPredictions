"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function RecoverPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "locked">("idle")
  const [error, setError] = useState("")

  async function handleSignIn() {
    if (!username.trim() || pin.trim().length !== 4) { setError("Enter your username and 4-digit PIN."); return }
    setStatus("loading")
    setError("")
    try {
      const res = await fetch("/api/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), pin: pin.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Wrong username or PIN.")
        setStatus(res.status === 429 ? "locked" : "error")
        return
      }
      localStorage.setItem("vibe_uid", data.anonUserId)
      router.push(`/profile/${data.anonUserId}`)
    } catch {
      setError("Network error — try again.")
      setStatus("error")
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "60px 20px 80px" }}>
      <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--chalk-faint)", fontSize: 13, textDecoration: "none", marginBottom: 32, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        ← Back
      </Link>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>Sign In</h1>
        <p style={{ color: "var(--chalk-dim)", fontSize: 14, marginTop: 8 }}>
          Enter your username and the 4-digit PIN you set when you first created your account.
        </p>
      </div>

      <div className="glass-row" style={{ padding: "24px", background: "rgba(45,122,45,0.04)" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 6 }}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          placeholder="e.g. BnB"
          autoFocus
          style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.6)", color: "var(--chalk)", fontSize: 15, marginBottom: 16 }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--chalk-dim)", display: "block", marginBottom: 6 }}>4-Digit PIN</label>
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          placeholder="••••"
          inputMode="numeric"
          maxLength={4}
          style={{ width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.6)", color: "var(--chalk)", fontSize: 20, fontFamily: "var(--font-display)", letterSpacing: "0.3em", textAlign: "center" }}
        />

        {error && <p style={{ color: status === "locked" ? "var(--gold)" : "var(--red-card)", fontSize: 13, marginTop: 12 }}>{error}</p>}

        <button
          onClick={handleSignIn}
          disabled={status === "loading" || status === "locked"}
          className="btn-primary"
          style={{ width: "100%", marginTop: 18, padding: "13px", fontSize: 15 }}
        >
          {status === "loading" ? "Checking..." : "Sign In"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "var(--chalk-faint)", textAlign: "center", marginTop: 20 }}>
        Never set a PIN? You can&apos;t recover that account — sorry. Set a username and PIN next time so this works.
      </p>
    </div>
  )
}
