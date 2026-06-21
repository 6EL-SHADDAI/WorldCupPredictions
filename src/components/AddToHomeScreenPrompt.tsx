"use client"
import { useEffect, useState } from "react"

const DISMISS_KEY = "vibe_a2hs_dismissed"
const DISMISS_DAYS = 14

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari-specific flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (Number.isNaN(dismissedAt)) return false
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
  return daysSince < DISMISS_DAYS
}

export default function AddToHomeScreenPrompt() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isInStandaloneMode() || wasDismissedRecently()) return

    if (isIos()) {
      setPlatform("ios")
      setShow(true)
      return
    }

    // Android/Chrome: wait for the real install prompt event before showing anything.
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPlatform("android")
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
  }

  if (!show || !platform) return null

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 420,
        margin: "0 auto",
        zIndex: 60,
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 28, flexShrink: 0 }}>⚽</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="display" style={{ fontSize: 14, fontWeight: 800, color: "var(--chalk)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
          Add UKNOWBALL? to your home screen
        </div>
        {platform === "ios" ? (
          <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginTop: 3 }}>
            Tap <strong>Share</strong> <span aria-hidden>⬆️</span> then <strong>&quot;Add to Home Screen&quot;</strong> — keeps your stats safe even if Safari clears your data.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--chalk-dim)", marginTop: 3 }}>
            One tap install — opens like an app, no browser bar.
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        {platform === "android" && (
          <button onClick={handleAndroidInstall} className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          style={{ background: "transparent", border: "none", color: "var(--chalk-faint)", fontSize: 11, cursor: "pointer", padding: "2px 4px" }}
        >
          {platform === "ios" ? "Got it" : "Not now"}
        </button>
      </div>
    </div>
  )
}
