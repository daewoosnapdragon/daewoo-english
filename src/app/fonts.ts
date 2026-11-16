import { Newsreader, Archivo, Noto_Sans_KR, Inter, Atkinson_Hyperlegible } from 'next/font/google'

// Serif for headings and big numbers, sans for everything you operate, and a
// Korean face at matching weights so 한국어 mode keeps the same rhythm.
// --font-serif and --font-sans are the names every stylesheet reads; a font
// choice in Settings (html[data-font], globals.css) points them elsewhere.
export const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })
export const sans = Archivo({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
export const kr = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-kr', display: 'swap', preload: false })
// Alternatives a teacher can pick in Settings → Display. Not preloaded: the
// browser only downloads one once a page actually uses it.
export const clean = Inter({ subsets: ['latin'], variable: '--font-clean', display: 'swap', preload: false })
export const readable = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-readable', display: 'swap', preload: false })
