import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "AI Agent Dashboard",
  description: "SaaS Chatbot Automation Platform",
  generator: 'v0.dev',
  icons: {
    icon: '/chat-icon.svg',
    shortcut: '/chat-icon.svg',
    apple: '/chat-icon.svg',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/chat-icon.svg',
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
