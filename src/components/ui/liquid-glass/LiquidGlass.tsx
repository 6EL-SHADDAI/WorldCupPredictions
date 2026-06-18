"use client"
import { type CSSProperties, forwardRef, useCallback, useEffect, useId, useRef, useState } from "react"
import { displacementMap, polarDisplacementMap, prominentDisplacementMap } from "./utils"

const getMap = (m: "standard" | "polar" | "prominent") =>
  m === "polar" ? polarDisplacementMap : m === "prominent" ? prominentDisplacementMap : displacementMap

/* ---------- SVG filter (edge-only displacement + chromatic aberration) ---------- */
const GlassFilter: React.FC<{
  id: string
  displacementScale: number
  aberrationIntensity: number
  width: number
  height: number
  mode: "standard" | "polar" | "prominent"
}> = ({ id, displacementScale, aberrationIntensity, width, height, mode }) => (
  <svg style={{ position: "absolute", width, height, pointerEvents: "none" }} aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-edge-mask`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="black" stopOpacity="0" />
        <stop offset={`${Math.max(30, 80 - aberrationIntensity * 2)}%`} stopColor="black" stopOpacity="0" />
        <stop offset="100%" stopColor="white" stopOpacity="1" />
      </radialGradient>
      <filter id={id} x="-35%" y="-35%" width="170%" height="170%" colorInterpolationFilters="sRGB">
        <feImage x="0" y="0" width="100%" height="100%" result="DISPLACEMENT_MAP" href={getMap(mode)} preserveAspectRatio="xMidYMid slice" />
        <feColorMatrix
          in="DISPLACEMENT_MAP"
          type="matrix"
          values="0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0.3 0.3 0.3 0 0 0 0 0 1 0"
          result="EDGE_INTENSITY"
        />
        <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
          <feFuncA type="discrete" tableValues={`0 ${aberrationIntensity * 0.05} 1`} />
        </feComponentTransfer>
        <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * -1} xChannelSelector="R" yChannelSelector="B" result="RED_DISPLACED" />
        <feColorMatrix in="RED_DISPLACED" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="RED_CHANNEL" />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * (-1 - aberrationIntensity * 0.05)} xChannelSelector="R" yChannelSelector="B" result="GREEN_DISPLACED" />
        <feColorMatrix in="GREEN_DISPLACED" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="GREEN_CHANNEL" />
        <feDisplacementMap in="SourceGraphic" in2="DISPLACEMENT_MAP" scale={displacementScale * (-1 - aberrationIntensity * 0.1)} xChannelSelector="R" yChannelSelector="B" result="BLUE_DISPLACED" />
        <feColorMatrix in="BLUE_DISPLACED" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="BLUE_CHANNEL" />
        <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
        <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
        <feGaussianBlur in="RGB_COMBINED" stdDeviation={Math.max(0.1, 0.5 - aberrationIntensity * 0.1)} result="ABERRATED_BLURRED" />
        <feComposite in="ABERRATED_BLURRED" in2="EDGE_MASK" operator="in" result="EDGE_ABERRATION" />
        <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
          <feFuncA type="table" tableValues="1 0" />
        </feComponentTransfer>
        <feComposite in="CENTER_ORIGINAL" in2="INVERTED_MASK" operator="in" result="CENTER_CLEAN" />
        <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
      </filter>
    </defs>
  </svg>
)

export interface LiquidGlassProps {
  children: React.ReactNode
  displacementScale?: number
  blurAmount?: number
  saturation?: number
  aberrationIntensity?: number
  elasticity?: number
  cornerRadius?: number
  className?: string
  padding?: string
  style?: CSSProperties
  overLight?: boolean
  mode?: "standard" | "polar" | "prominent"
  onClick?: () => void
  /** "floating": original behavior, absolutely centered (use for Dock-style floating elements).
   *  "inline": sits naturally in document flow — use for cards, list rows, nav pills, buttons. */
  layout?: "floating" | "inline"
  /** Tint applied as an overlay on top of the glass (e.g. "rgba(45,122,45,0.12)") — gives the "stained glass" colored look. */
  tint?: string
  /** Text/content color — the upstream lib defaults to white (for dark backgrounds); set this for light backgrounds. */
  contentColor?: string
}

export default function LiquidGlass({
  children,
  displacementScale = 70,
  blurAmount = 0.0625,
  saturation = 140,
  aberrationIntensity = 2,
  elasticity = 0.15,
  cornerRadius = 999,
  className = "",
  padding = "12px 24px",
  overLight = false,
  style = {},
  mode = "standard",
  onClick,
  layout = "inline",
  tint,
  contentColor,
}: LiquidGlassProps) {
  const glassRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [glassSize, setGlassSize] = useState({ width: 270, height: 69 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 })
  const [isFirefox, setIsFirefox] = useState(false)
  const filterId = useId()

  useEffect(() => {
    setIsFirefox(navigator.userAgent.toLowerCase().includes("firefox"))
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = glassRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setMouseOffset({ x: ((e.clientX - cx) / rect.width) * 100, y: ((e.clientY - cy) / rect.height) * 100 })
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  useEffect(() => {
    const el = glassRef.current
    if (!el) return
    el.addEventListener("mousemove", handleMouseMove)
    return () => el.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  useEffect(() => {
    const update = () => {
      if (glassRef.current) {
        const rect = glassRef.current.getBoundingClientRect()
        setGlassSize({ width: rect.width, height: rect.height })
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Subtle elastic squish toward cursor when hovered — capped, gentle.
  const elasticTransform = useCallback(() => {
    if (!isHovered || !glassRef.current) return ""
    const rect = glassRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (mousePos.x - cx) * elasticity * 0.06
    const dy = (mousePos.y - cy) * elasticity * 0.06
    return ` translate(${dx}px, ${dy}px)`
  }, [isHovered, mousePos, elasticity])

  const pressScale = isActive && onClick ? 0.97 : isHovered ? 1.01 : 1

  const backdropStyle: CSSProperties = {
    filter: isFirefox ? undefined : `url(#${filterId})`,
    backdropFilter: `blur(${(overLight ? 12 : 4) + blurAmount * 32}px) saturate(${saturation}%)`,
    WebkitBackdropFilter: `blur(${(overLight ? 12 : 4) + blurAmount * 32}px) saturate(${saturation}%)`,
  }

  const wrapperStyle: CSSProperties =
    layout === "floating"
      ? { position: "relative", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${pressScale})${elasticTransform()}`, ...style }
      : { position: "relative", display: "inline-block", transform: `scale(${pressScale})${elasticTransform()}`, transition: "transform 0.18s ease-out", ...style }

  return (
    <div
      ref={glassRef}
      className={className}
      style={{ ...wrapperStyle, cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false) }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
    >
      <GlassFilter id={filterId} displacementScale={displacementScale} aberrationIntensity={aberrationIntensity} width={glassSize.width} height={glassSize.height} mode={mode} />

      <div
        style={{
          borderRadius: cornerRadius,
          position: "relative",
          display: layout === "floating" ? "inline-flex" : "block",
          alignItems: "center",
          padding,
          overflow: "hidden",
          transition: "box-shadow 0.2s ease-in-out",
          boxShadow: overLight
            ? "0 16px 50px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.5)"
            : "0 4px 24px rgba(45,122,45,0.10), inset 0 1px 0 rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.4)",
        }}
      >
        {/* refractive backdrop layer */}
        <span style={{ ...backdropStyle, position: "absolute", inset: 0 }} />

        {/* color tint — gives the "stained glass" effect */}
        {tint && <span style={{ position: "absolute", inset: 0, background: tint, mixBlendMode: "normal" }} />}

        {/* sheen highlight */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(${135 + mouseOffset.x * 0.6}deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) ${Math.max(10, 35 + mouseOffset.y * 0.3)}%, rgba(255,255,255,0.05) 100%)`,
            pointerEvents: "none",
          }}
        />

        {/* content stays sharp */}
        <div style={{ position: "relative", zIndex: 1, color: contentColor ?? "#16201a" }}>
          {children}
        </div>
      </div>
    </div>
  )
}
