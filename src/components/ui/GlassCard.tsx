"use client"
import LiquidGlass from "./liquid-glass/LiquidGlass"
import type { CSSProperties, ReactNode } from "react"

/**
 * Drop-in replacement for className="card" — same visual footprint (rounded
 * rect, padding controlled by caller) but with true Apple-style liquid glass
 * refraction instead of flat backdrop-blur.
 */
export default function GlassCard({
  children,
  style,
  tint = "rgba(45,122,45,0.05)",
  cornerRadius = 14,
  padding = "0px",
  onClick,
  className = "",
}: {
  children: ReactNode
  style?: CSSProperties
  tint?: string
  cornerRadius?: number
  padding?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <LiquidGlass
      layout="inline"
      mode="standard"
      displacementScale={50}
      blurAmount={0.09}
      saturation={150}
      aberrationIntensity={1.4}
      elasticity={0.08}
      cornerRadius={cornerRadius}
      padding={padding}
      tint={tint}
      contentColor="var(--chalk)"
      onClick={onClick}
      className={className}
      style={{ width: "100%", ...style }}
    >
      {children}
    </LiquidGlass>
  )
}
