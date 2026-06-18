"use client"
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react"
import LiquidGlass from "./liquid-glass/LiquidGlass"

/**
 * Performance-aware glass wrapper for repeated list items (match cards,
 * leaderboard rows, etc). Only mounts the real SVG-displacement LiquidGlass
 * once the element scrolls near the viewport; off-screen items render with
 * the cheap CSS-only `.card` glass instead. Once mounted, it stays mounted
 * (no flicker on scroll back out) — this caps the number of simultaneously
 * active SVG filters to roughly what's visible on screen at once.
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
  const ref = useRef<HTMLDivElement>(null)
  const [shouldRenderGlass, setShouldRenderGlass] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Already decided — no need to observe again.
    if (shouldRenderGlass) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRenderGlass(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px 0px" } // start loading glass a bit before it's on screen
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [shouldRenderGlass])

  if (shouldRenderGlass) {
    return (
      <div ref={ref} className={className} style={style}>
        <LiquidGlass
          layout="inline"
          mode="standard"
          displacementScale={44}
          blurAmount={0.08}
          saturation={155}
          aberrationIntensity={1.3}
          elasticity={0.05}
          cornerRadius={cornerRadius}
          padding={padding}
          tint={tint}
          contentColor="var(--chalk)"
          style={{ width: "100%" }}
        >
          {children}
        </LiquidGlass>
      </div>
    )
  }

  // Not yet in view: cheap CSS-only glass, visually consistent fallback.
  return (
    <div ref={ref} className={`card ${className}`} style={{ padding, ...style }}>
      {children}
    </div>
  )
}
