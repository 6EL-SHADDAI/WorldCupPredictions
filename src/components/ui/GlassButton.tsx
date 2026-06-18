"use client"
import LiquidGlass from "./liquid-glass/LiquidGlass"
import type { CSSProperties, ReactNode } from "react"

/**
 * Drop-in liquid-glass button. variant "primary" carries a green stained-glass
 * tint; "secondary" stays clear/neutral.
 */
export default function GlassButton({
  children,
  onClick,
  variant = "primary",
  style,
  disabled = false,
  fullWidth = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "danger"
  style?: CSSProperties
  disabled?: boolean
  fullWidth?: boolean
}) {
  const tint =
    variant === "primary" ? "rgba(45,122,45,0.22)" :
    variant === "danger" ? "rgba(217,43,43,0.18)" :
    "rgba(255,255,255,0.12)"

  const textColor =
    variant === "primary" ? "#1f5c1f" :
    variant === "danger" ? "#a32020" :
    "var(--chalk-dim)"

  return (
    <LiquidGlass
      layout="inline"
      mode="standard"
      displacementScale={36}
      blurAmount={0.07}
      saturation={160}
      aberrationIntensity={1.6}
      elasticity={0.18}
      cornerRadius={999}
      padding="11px 26px"
      tint={disabled ? "rgba(0,0,0,0.04)" : tint}
      contentColor={disabled ? "var(--chalk-faint)" : textColor}
      onClick={disabled ? undefined : onClick}
      style={{
        width: fullWidth ? "100%" : undefined,
        opacity: disabled ? 0.6 : 1,
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        fontSize: 14,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        textAlign: "center",
        ...style,
      }}
    >
      {children}
    </LiquidGlass>
  )
}
