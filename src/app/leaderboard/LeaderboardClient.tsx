"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

type UserRow = {
  anonUserId: string
  username: string | null
  totalScore: number
  totalMaxScore: number
  currentStreak: number
  bestStreak: number
  totalPredictions: number
  accuracy: number
}

const medals = ["🥇", "🥈", "🥉"]

function UserCard({ user, rank, isMe, isFriend, onRemove }: {
  user: UserRow
  rank: number
  isMe?: boolean
  isFriend?: boolean
  onRemove?: () => void
}) {
  const isTop3 = rank <= 3
  return (
    <div
      className="card"
      style={{
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        borderColor: isMe ? "var(--grass)" : isTop3 ? "var(--line-bright)" : undefined,
        background: isMe ? "rgba(45,122,45,0.06)" : rank === 1 ? "rgba(232,193,74,0.05)" : undefined,
      }}
    >
      <div style={{ minWidth: 36, textAlign: "center" }}>
        {rank <= 3 ? (
          <span style={{ fontSize: 22 }}>{medals[rank - 1]}</span>
        ) : (
          <span className="display" style={{ fontSize: 18, fontWeight: 700, color: "var(--chalk-faint)" }}>{rank}</span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Link
            href={`/profile/${user.anonUserId}`}
            style={{ fontSize: 14, fontWeight: user.username ? 700 : 400, color: user.username ? "var(--chalk)" : "var(--chalk-dim)", textDecoration: "none" }}
          >
            {user.username ? `@${user.username}` : `${user.anonUserId.slice(0, 8)}...`}
          </Link>
          {isMe && <span style={{ fontSize: 11, background: "rgba(45,122,45,0.12)", color: "var(--grass)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>You</span>}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--chalk-faint)" }}>{user.totalPredictions} predicted</span>
          {user.currentStreak > 0 && <span style={{ fontSize: 12, color: "var(--gold)" }}>🔥 {user.currentStreak} streak</span>}
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div className="display" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: isTop3 ? "var(--gold)" : "var(--chalk)" }}>
          {user.totalScore}<span style={{ fontSize: 13, color: "var(--chalk-faint)", fontWeight: 400 }}> pts</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--chalk-faint)", marginTop: 2 }}>{user.accuracy}% accuracy</div>
      </div>

      {isFriend && onRemove && (
        <button
          onClick={onRemove}
          title="Remove friend"
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--chalk-faint)", fontSize: 16, padding: "4px", lineHeight: 1 }}
        >✕</button>
      )}
    </div>
  )
}

function RequestRow({ user, onAccept, onReject, onCancel }: {
  user: UserRow
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
}) {
  return (
    <div className="card" style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--chalk)" }}>
          {user.username ? `@${user.username}` : `${user.anonUserId.slice(0, 8)}...`}
        </div>
        <div style={{ fontSize: 12, color: "var(--chalk-faint)" }}>{user.totalPredictions} predictions · {user.accuracy}% accuracy</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {onAccept && (
          <button onClick={onAccept} className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Accept</button>
        )}
        {onReject && (
          <button onClick={onReject} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>Decline</button>
        )}
        {onCancel && (
          <button onClick={onCancel} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>Cancel</button>
        )}
      </div>
    </div>
  )
}

export default function LeaderboardClient({ users }: { users: UserRow[] }) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<"global" | "friends">(
    searchParams.get("tab") === "friends" ? "friends" : "global"
  )
  const [myId, setMyId] = useState<string | null>(null)
  const [friendRows, setFriendRows] = useState<UserRow[]>([])
  const [incoming, setIncoming] = useState<UserRow[]>([])
  const [outgoing, setOutgoing] = useState<UserRow[]>([])
  const [addInput, setAddInput] = useState("")
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [addMsg, setAddMsg] = useState("")
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const uid = localStorage.getItem("vibe_uid")
    if (!uid) return
    setMyId(uid)
    loadFriends(uid)
  }, [])

  async function loadFriends(uid: string) {
    const res = await fetch(`/api/friends?anonUserId=${uid}`)
    const data = await res.json()
    setFriendRows(data.friends ?? [])
    setIncoming(data.incoming ?? [])
    setOutgoing(data.outgoing ?? [])
    setFriendIds(new Set((data.friends ?? []).map((f: UserRow) => f.anonUserId)))
  }

  async function sendRequest() {
    if (!myId || !addInput.trim()) return
    setAddStatus("loading")
    setAddMsg("")
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: myId, username: addInput.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setAddStatus("success")
      setAddMsg(data.autoAccepted ? `You and @${data.friend.username} are now friends!` : `Friend request sent to @${data.friend.username}`)
      setAddInput("")
      loadFriends(myId)
    } else {
      setAddStatus("error")
      setAddMsg(data.error ?? "Something went wrong")
    }
    setTimeout(() => { setAddStatus("idle"); setAddMsg("") }, 4000)
  }

  async function respondToRequest(fromUserId: string, action: "accept" | "reject") {
    if (!myId) return
    await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonUserId: myId, fromUserId, action }),
    })
    loadFriends(myId)
  }

  async function cancelOrRemove(toUserId: string) {
    if (!myId) return
    await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: myId, toUserId }),
    })
    loadFriends(myId)
  }

  const myRankGlobal = myId ? users.findIndex((u) => u.anonUserId === myId) + 1 : null

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 20px 80px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 56, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 0.95 }}>
          Leader<span style={{ color: "var(--gold)" }}>board</span>
        </h1>
        {myRankGlobal && myRankGlobal > 0 && (
          <div style={{ marginTop: 8 }}>
            <span className="badge badge-gold">You&apos;re #{myRankGlobal} globally</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {(["global", "friends"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "1px solid",
              borderColor: tab === t ? "var(--grass)" : "var(--line-bright)",
              background: tab === t ? "rgba(45,122,45,0.1)" : "transparent",
              color: tab === t ? "var(--grass)" : "var(--chalk-dim)",
              fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer",
              position: "relative",
            }}
          >
            {t === "global" ? "🌍 Global" : "👥 Friends"}
            {t === "friends" && incoming.length > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "var(--red-card)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {incoming.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "global" && (
        users.length === 0 ? (
          <div className="card" style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <p className="display" style={{ fontSize: 20, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>No scores yet</p>
            <Link href="/" className="btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>Start predicting →</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {users.map((user, i) => (
              <UserCard key={user.anonUserId} user={user} rank={i + 1} isMe={user.anonUserId === myId} isFriend={friendIds.has(user.anonUserId)} />
            ))}
          </div>
        )
      )}

      {tab === "friends" && (
        <>
          <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
            <div className="display" style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--chalk-dim)", marginBottom: 12 }}>
              Add a friend by username
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={addInput}
                onChange={(e) => setAddInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendRequest()}
                placeholder="e.g. vibe_master"
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line-bright)", background: "rgba(255,255,255,0.6)", color: "var(--chalk)", fontSize: 14 }}
              />
              <button onClick={sendRequest} disabled={addStatus === "loading" || !addInput.trim()} className="btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>
                {addStatus === "loading" ? "..." : "Send Request"}
              </button>
            </div>
            {addMsg && (
              <div style={{ marginTop: 8, fontSize: 13, color: addStatus === "success" ? "var(--grass-bright)" : "var(--red-card)", fontWeight: 600 }}>{addMsg}</div>
            )}
            {!myId && (
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--chalk-faint)" }}>Make a prediction first to get your user ID, then you can add friends.</p>
            )}
          </div>

          {incoming.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 10 }}>
                Friend Requests ({incoming.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {incoming.map((u) => (
                  <RequestRow
                    key={u.anonUserId}
                    user={u}
                    onAccept={() => respondToRequest(u.anonUserId, "accept")}
                    onReject={() => respondToRequest(u.anonUserId, "reject")}
                  />
                ))}
              </div>
            </section>
          )}

          {outgoing.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 10 }}>
                Pending — Waiting for them to accept
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {outgoing.map((u) => (
                  <RequestRow key={u.anonUserId} user={u} onCancel={() => cancelOrRemove(u.anonUserId)} />
                ))}
              </div>
            </section>
          )}

          <div className="display" style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--chalk-faint)", marginBottom: 10 }}>
            Friends ({friendRows.length})
          </div>
          {friendRows.length === 0 ? (
            <div className="card" style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
              <p className="display" style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", color: "var(--chalk-dim)" }}>No friends yet</p>
              <p style={{ color: "var(--chalk-faint)", fontSize: 14, marginTop: 8 }}>Send a request by username above. They'll need to accept before you both show up on each other's friends board.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {friendRows.map((user, i) => (
                <UserCard key={user.anonUserId} user={user} rank={i + 1} isMe={user.anonUserId === myId} isFriend onRemove={() => cancelOrRemove(user.anonUserId)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
