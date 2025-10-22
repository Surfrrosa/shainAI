import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'shainAI - Personal Project Brain',
  description: 'RAG-based personal AI agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
