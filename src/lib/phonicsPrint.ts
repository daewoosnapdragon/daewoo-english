import type { PhonicsSkill } from '@/lib/phonics'

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
