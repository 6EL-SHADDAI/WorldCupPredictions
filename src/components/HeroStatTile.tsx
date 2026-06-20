export default function HeroStatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="stat-tile" style={{ minWidth: 90 }}>
      <div className="display" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, textAlign: "center" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, textAlign: "center" }}>{label}</div>
    </div>
  )
}
