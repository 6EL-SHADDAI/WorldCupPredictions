import type { Metadata } from "next"
import "./globals.css"
import Nav from "@/components/ui/Nav"
import Ferrofluid from "@/components/ui/Ferrofluid"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "UKNOWBALL? — World Cup 2026 Predictions",
  description: "Predict every World Cup match, build your streak, and see how your calls compare to everyone else.",
  openGraph: {
    title: "UKNOWBALL? — World Cup 2026 Predictions",
    description: "Predict every World Cup match. Build your streak. Prove you know ball.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Full-viewport ferrofluid background, fixed behind everything */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            width: "100vw",
            height: "100vh",
          }}
        >
          <Ferrofluid
            colors={["#2d7a2d", "#3aaa3a", "#bfe6bf"]}
            speed={0.25}
            scale={2.2}
            turbulence={0.7}
            fluidity={0.15}
            rimWidth={0.2}
            sharpness={2.5}
            shimmer={1.5}
            glow={1.6}
            flowDirection="down"
            opacity={0.35}
            mouseInteraction={true}
            mouseStrength={1}
            mouseRadius={0.35}
          />
        </div>

        <Nav />
        <main className="min-h-screen">{children}</main>
        <Analytics />
      </body>
    </html>
  )
}
