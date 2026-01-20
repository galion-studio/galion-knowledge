import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Galion Knowledge | The Library of Truth',
  description: 'Unbiased, factual knowledge. No propaganda. Just truth.',
  keywords: 'knowledge, encyclopedia, facts, truth, unbiased, science, history, philosophy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-knowledge-bg text-knowledge-text antialiased">
        {children}
      </body>
    </html>
  )
}
