// ─── Printing words for a student to read ────────────────────────
// One page in large type: a student's missed words, or a teaching group's.
// Sections keep each sheet's words together under a small label.

import { logActivity } from '@/lib/activity'

export interface PrintSection { label: string; words: string[]; columns?: number }

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Opens the print dialog; false when the browser blocked the window. */
export function printWordSheet(title: string, sections: PrintSection[], logWhat: string): boolean {
  const pw = window.open('', '_blank')
  if (!pw) return false
  const body = sections.filter(s => s.words.length).map(s =>
    `<section><p class="label">${esc(s.label)}</p><div class="words" style="grid-template-columns:repeat(${s.columns || 4},1fr)">${s.words.map(w => `<span>${esc(w)}</span>`).join('')}</div></section>`).join('')
  pw.document.write(`<html><head><title>${esc(title)}</title><style>
    body{font-family:Georgia,'Iowan Old Style',serif;color:#1b1812;margin:0;padding:24px}
    h1{font-weight:500;font-size:22px;margin:0 0 18px}
    section{break-inside:avoid;margin:0 0 22px}
    .label{font-family:system-ui,sans-serif;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#857d6e;margin:0 0 8px}
    .words{display:grid;gap:22px 18px;font-size:34px;line-height:1.1;text-align:center}
    @media print{body{padding:12px}}
  </style></head><body><h1>${esc(title)}</h1>${body}</body></html>`)
  pw.document.close(); pw.print()
  logActivity('printed', logWhat, { path: '/reading' })
  return true
}
