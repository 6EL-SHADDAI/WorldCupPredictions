import type { Metadata } from "next"
import "./globals.css"
import Nav from "@/components/ui/Nav"

export const metadata: Metadata = {
  title: "Vibe Checker — 2026 World Cup",
  description: "Predict every World Cup match. Track your streak. See how the crowd called it.",
  openGraph: {
    title: "Vibe Checker — 2026 World Cup",
    description: "Predict every World Cup match. Track your streak.",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="pitch-bg min-h-screen">{children}</main>
      </body>
    </html>
  )
}
