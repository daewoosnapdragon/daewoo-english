import type { PhonicsSkill } from '@/lib/phonics'
import { logActivity } from '@/lib/activity'

// ─── Phonics: the student sheets as a printable page ─────────────
// One sheet a page in large type for the student to read from: a word
// sheet as the packet's four columns, an alphabet sheet as its four rows of
// letters, most common first. Printed from a new window; "Save as PDF" in
// the print dialog keeps a copy.

export function phonicsSheetsHtml(sheets: PhonicsSkill[], title: string): string {
  const sections = sheets.map(s => s.sections
    ? `<section><p class="eyebrow">${s.label}</p><h2>${s.say || s.label}</h2>${s.sections.map((row, i) => `<div class="row"><span class="rowno">${i + 1}</span><div class="letters">${row.map(l => `<span>${l}</span>`).join('')}</div></div>`).join('')}</section>`
    : `<section><p class="eyebrow">${s.covers}</p><h2>${s.label}</h2><div class="words">${s.words.map(w => `<span>${w}</span>`).join('')}</div></section>`).join('')
  return `<html><head><title>${title}</title><style>
      body{font-family:Georgia,'Iowan Old Style',serif;color:#1b1812;margin:0;padding:24px}
      section{page-break-after:always;padding-top:12px}section:last-child{page-break-after:auto}
      .eyebrow{font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#857d6e;margin:0}
      h2{font-weight:500;font-size:28px;margin:4px 0 28px}
      .words{display:grid;grid-template-columns:repeat(4,1fr);gap:34px 24px;font-size:38px;line-height:1.1;text-align:center}
      .row{display:grid;grid-template-columns:28px 1fr;align-items:center;border-top:1px solid #d8d0c0;padding:26px 0}
      .row:last-child{border-bottom:1px solid #d8d0c0}
      .rowno{font-family:system-ui,sans-serif;font-size:12px;color:#857d6e}
      .letters{display:grid;grid-template-columns:repeat(7,1fr);font-size:60px;line-height:1;text-align:center}
      @media print{body{padding:12px}}
    </style></head><body>${sections}</body></html>`
}

// ─── Printing words for a student to read ────────────────────────
// One page in large type: a student's missed words, or a teaching group's.
// Sections keep each sheet's words together under a small label.

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
