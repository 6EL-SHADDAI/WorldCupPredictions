"use client"
import LiquidGlass from "./ui/liquid-glass/LiquidGlass"

export default function HeroStatTile({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <LiquidGlass
      layout="inline"
      mode="standard"
      displacementScale={40}
      blurAmount={0.08}
      saturation={160}
      aberrationIntensity={1.5}
      elasticity={0.1}
      cornerRadius={16}
      padding="14px 18px"
      tint="rgba(45,122,45,0.05)"
      contentColor="var(--chalk)"
      style={{ minWidth: 90 }}
    >
      <div className="display" style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, textAlign: "center" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--chalk-faint)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4, textAlign: "center" }}>{label}</div>
    </LiquidGlass>
  )
}
