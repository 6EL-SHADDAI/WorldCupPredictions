import type { CSSProperties, ReactNode } from "react"

/**
 * Seamless glass button. variant "primary" carries a green stained-glass
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
  const className = variant === "secondary" ? "btn-secondary" : "btn-primary"
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={{
        width: fullWidth ? "100%" : undefined,
        background: variant === "danger" ? "rgba(217,43,43,0.7)" : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
