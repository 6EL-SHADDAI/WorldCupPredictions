export default function HeroStatTile({ value, label, color, dark }: {
  value: number
  label: string
  color: string
  dark?: boolean
}) {
  return (
    <div
      className="stat-tile"
      style={{
        minWidth: 90,
        background: dark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.4)",
        border: dark ? "1px solid rgba(255,255,255,0.15)" : undefined,
        backdropFilter: "blur(14px) saturate(150%)",
        WebkitBackdropFilter: "blur(14px) saturate(150%)",
      }}
    >
      <div className="display" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, textAlign: "center" }}>{value}</div>
      <div style={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.55)" : "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, textAlign: "center" }}>{label}</div>
    </div>
  )
}
