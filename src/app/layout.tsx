import type { Metadata, Viewport } from 'next'
import { serif, sans, kr, clean, readable } from './fonts'
import { AppProvider } from '@/lib/context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daewoo English',
  description: 'The record of the Daewoo Elementary English Program',
}

export const viewport: Viewport = {
  // Draw under the iPhone home bar and notch, so env(safe-area-inset-*) is
  // real: the phone tab bar pads itself above the home bar, and the body
  // keeps content clear of the notch in landscape (globals.css).
  viewportFit: 'cover',
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
