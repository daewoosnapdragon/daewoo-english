import type { Metadata } from 'next'
import { AppProvider } from '@/lib/context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daewoo English Program',
  description: 'School management system for Daewoo Elementary English Program',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
