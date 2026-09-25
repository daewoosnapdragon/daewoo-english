import type { Metadata } from 'next'
import { Newsreader, Archivo, Noto_Sans_KR } from 'next/font/google'
import { AppProvider } from '@/lib/context'
import './globals.css'

// Serif for headings and big numbers, sans for everything you operate, and a
// Korean face at matching weights so 한국어 mode keeps the same rhythm.
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
const sans = Archivo({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const kr = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-kr', display: 'swap', preload: false })

export const metadata: Metadata = {
  title: 'Daewoo English',
  description: 'The record of the Daewoo Elementary English Program',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${kr.variable}`}>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
