import { type ReactNode, type CSSProperties } from "react"

/**
 * Seamless glass wrapper for repeated list items (match cards, leaderboard
 * rows, etc). Uses clean CSS backdrop-filter glass — no SVG displacement
 * filter, since that produces a flat grey wash on plain low-contrast
 * backgrounds (it only looks good over real image content like flags).
 * Kept as its own component so call sites don't need to change.
 */
export default function LazyGlass({
  children,
  tint = "rgba(45,122,45,0.05)",
  cornerRadius = 14,
  padding = "0px",
  style,
  className = "",
}: {
  children: ReactNode
  tint?: string
  cornerRadius?: number
  padding?: string
  style?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={`glass-row ${className}`}
      style={{
        borderRadius: cornerRadius,
        padding,
        background: tint,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
