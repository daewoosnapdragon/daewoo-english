import type { Metadata, Viewport } from 'next'
import { Newsreader, Archivo, Noto_Sans_KR, Inter, Atkinson_Hyperlegible } from 'next/font/google'
import { AppProvider } from '@/lib/context'
import './globals.css'

// Serif for headings and big numbers, sans for everything you operate, and a
// Korean face at matching weights so 한국어 mode keeps the same rhythm.
const serif = Newsreader({ subsets: ['latin'], variable: '--font-classic-serif', display: 'swap' })
const sans = Archivo({ subsets: ['latin'], variable: '--font-classic-sans', display: 'swap' })
const kr = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-kr', display: 'swap', preload: false })
// Alternatives a teacher can pick in Settings → Display. Not preloaded: the
// browser only downloads one once a page actually uses it.
const clean = Inter({ subsets: ['latin'], variable: '--font-clean', display: 'swap', preload: false })
const readable = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-readable', display: 'swap', preload: false })

export const metadata: Metadata = {
  title: 'Daewoo English',
  description: 'The record of the Daewoo Elementary English Program',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF8F2' },
    { media: '(prefers-color-scheme: dark)', color: '#1F1C15' },
  ],
}

// Runs before anything is painted so a remembered dark mode never flashes
// light. Must stay in step with the 'daewoo_theme' key and the `dark` class
// that AppProvider's setTheme writes, and with the text size and font keys
// in lib/display.ts.
const themeInit = `try{var d=document.documentElement;if(localStorage.getItem('daewoo_theme')==='dark')d.classList.add('dark');var t=localStorage.getItem('daewoo_text');if(t==='larger'||t==='largest')d.dataset.text=t;var f=localStorage.getItem('daewoo_font');if(f==='clean'||f==='readable'||f==='system')d.dataset.font=f}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the script above may add `dark` to this
    // element before React hydrates it, which is expected, not a mismatch.
    <html lang="en" className={`${serif.variable} ${sans.variable} ${kr.variable} ${clean.variable} ${readable.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
