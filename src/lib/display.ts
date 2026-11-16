// Per-browser reading preferences: the typeface and the text size. Both live
// on <html> as data attributes (globals.css reads them) and in localStorage,
// and the script in app/layout.tsx applies them before the first paint.
// Keep the keys and values here in step with that script.

export const FONTS = ['classic', 'clean', 'readable', 'system'] as const
export type FontChoice = typeof FONTS[number]

export const TEXT_SIZES = ['standard', 'larger', 'largest'] as const
export type TextSize = typeof TEXT_SIZES[number]

const CHANGED = 'daewoo:display'

export function currentFont(): FontChoice {
  if (typeof document === 'undefined') return 'classic'
  const f = document.documentElement.dataset.font as FontChoice | undefined
  return f && FONTS.includes(f) ? f : 'classic'
}

export function setFont(font: FontChoice) {
  const d = document.documentElement
  if (font === 'classic') delete d.dataset.font; else d.dataset.font = font
  try { localStorage.setItem('daewoo_font', font) } catch {}
  window.dispatchEvent(new Event(CHANGED))
  window.dispatchEvent(new Event('resize'))
}

export function currentTextSize(): TextSize {
  if (typeof document === 'undefined') return 'standard'
  const t = document.documentElement.dataset.text
  return t === 'larger' || t === 'largest' ? t : 'standard'
}

export function setTextSize(size: TextSize) {
  const d = document.documentElement
  if (size === 'standard') delete d.dataset.text; else d.dataset.text = size
  try { localStorage.setItem('daewoo_text', size) } catch {}
  window.dispatchEvent(new Event(CHANGED))
  window.dispatchEvent(new Event('resize'))
}

/** Calls `fn` whenever the font or text size changes anywhere in the app. */
export function onDisplayChange(fn: () => void) {
  window.addEventListener(CHANGED, fn)
  return () => window.removeEventListener(CHANGED, fn)
}
