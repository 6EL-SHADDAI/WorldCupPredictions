"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import LazyGlass from "@/components/ui/LazyGlass"

type HotTake = {
  id: string
  text: string
  category: string | null
  agree: number
  disagree: number
  total: number
  agreePct: number
  myVote: "agree" | "disagree" | null
}

const CATEGORY_COLORS: Record<string, string> = {
  "bold prediction": "var(--grass)",
  "controversial": "var(--red-card)",
  "stats": "var(--gold)",
}

function TakeCard({ take, onVote }: { take: HotTake; onVote: (vote: "agree" | "disagree") => void }) {
  const [optimisticVote, setOptimisticVote] = useState<"agree" | "disagree" | null>(take.myVote)
  const hasVoted = optimisticVote !== null
  const catColor = take.category ? CATEGORY_COLORS[take.category] ?? "var(--chalk-faint)" : "var(--chalk-faint)"

  function handleVote(vote: "agree" | "disagree") {
    setOptimisticVote(vote)
    onVote(vote)
  }

  // Recompute displayed percentages optimistically
  let displayAgree = take.agree
  let displayDisagree = take.disagree
  if (optimisticVote && optimisticVote !== take.myVote) {
    if (take.myVote === "agree") displayAgree--
    if (take.myVote === "disagree") displayDisagree--
    if (optimisticVote === "agree") displayAgree++
    if (optimisticVote === "disagree") displayDisagree++
  }
  const displayTotal = displayAgree + displayDisagree
  const agreePct = displayTotal > 0 ? Math.round((displayAgree / displayTotal) * 100) : 50

  return (
    <LazyGlass tint="rgba(255,255,255,0.04)" cornerRadius={16} padding="24px 26px" className="fade-in">
      {take.category && (
        <span className="badge" style={{ background: `${catColor}15`, color: catColor, marginBottom: 12 }}>
          {take.category}
        </span>
      )}
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--chalk)", lineHeight: 1.4, marginBottom: 18 }}>
        {take.text}
      </div>

      {!hasVoted ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => handleVote("agree")}
            className="btn-primary"
            style={{ flex: 1, background: "var(--grass)" }}
          >
            👍 Agree
          </button>
          <button
            onClick={() => handleVote("disagree")}
            className="btn-primary"
            style={{ flex: 1, background: "var(--red-card)" }}
          >
            👎 Disagree
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", height: 36, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
            <div
              onClick={() => handleVote("agree")}
              style={{
                width: `${agreePct}%`, background: "rgba(45,122,45,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "var(--grass-bright)", cursor: "pointer",
                transition: "width 0.4s ease", minWidth: agreePct > 0 ? 40 : 0,
                borderRight: optimisticVote === "agree" ? "2px solid var(--grass)" : undefined,
              }}
            >
              {agreePct >= 15 && `${agreePct}%`}
            </div>
            <div
              onClick={() => handleVote("disagree")}
              style={{
                width: `${100 - agreePct}%`, background: "rgba(217,43,43,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "var(--red-card)", cursor: "pointer",
                transition: "width 0.4s ease", minWidth: 100 - agreePct > 0 ? 40 : 0,
              }}
            >
              {100 - agreePct >= 15 && `${100 - agreePct}%`}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>
              👍 Agree {optimisticVote === "agree" && "(you)"}
            </span>
            <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>{displayTotal} votes</span>
            <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>
              👎 Disagree {optimisticVote === "disagree" && "(you)"}
            </span>
          </div>
        </div>
      )}
    </LazyGlass>
  )
}

export default function HotTakesPage() {
  const [takes, setTakes] = useState<HotTake[]>([])
  const [loading, setLoading] = useState(true)
  const [anonUserId, setAnonUserId] = useState("")

  useEffect(() => {
    let uid = localStorage.getItem("vibe_uid")
    if (!uid) { uid = crypto.randomUUID(); localStorage.setItem("vibe_uid", uid) }
    setAnonUserId(uid)

    fetch(`/api/hot-takes?anonUserId=${uid}`)
      .then((r) => r.json())
      .then((d) => { setTakes(d.takes ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function castVote(hotTakeId: string, vote: "agree" | "disagree") {
    setTakes((prev) => prev.map((t) => (t.id === hotTakeId ? { ...t, myVote: vote } : t)))
    fetch("/api/hot-takes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonUserId, hotTakeId, vote }),
    }).catch(() => {})
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 className="display" style={{ fontSize: 52, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
          Hot<br /><span style={{ color: "var(--red-card)" }}>Takes</span>
        </h1>
        <p style={{ marginTop: 12, color: "var(--chalk-dim)", fontSize: 14 }}>
          Bold opinions about the World Cup. Agree, disagree, see what everyone else thinks.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--chalk-faint)" }}>Loading takes...</div>
      ) : takes.length === 0 ? (
        <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
          <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>
            No hot takes yet
          </p>
          <p style={{ color: "var(--chalk-faint)", marginTop: 8, fontSize: 14 }}>
            Check back soon — new takes drop throughout the tournament.
          </p>
          <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>
            Back to matches →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {takes.map((take) => (
            <TakeCard key={take.id} take={take} onVote={(vote) => castVote(take.id, vote)} />
          ))}
        </div>
      )}
    </div>
  )
}
