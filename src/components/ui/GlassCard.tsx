import type { CSSProperties, ReactNode } from "react"

/**
 * Drop-in replacement for className="card" — seamless CSS glass (blur +
 * saturate, no hard border, no SVG displacement filter).
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
    <div
      className={`glass-row ${className}`}
      onClick={onClick}
      style={{
        borderRadius: cornerRadius,
        padding,
        background: tint,
        cursor: onClick ? "pointer" : undefined,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
