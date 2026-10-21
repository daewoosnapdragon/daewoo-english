import { LEVEL_LABELS, LEVEL_LABELS_KO, type RubricCriterion } from '@/components/curriculum/rubric-library'

// ─── Rubric printing ─────────────────────────────────────────────
// Builds a self-contained HTML document that prints a rubric on A4 at one of
// three sizes. Full page is one rubric per sheet with every descriptor. Half
// page stacks two A5 landscape slips on a portrait sheet. Quarter page puts
// four A6 landscape slips on a landscape sheet; at that size the descriptors
// are dropped and each criterion becomes a row of boxes to circle.
//
// A slip can be blank (name and date lines), carry a student's name, or carry
// the student's marked levels, which are shaded, with the total. Each slip
// shrinks its type until it fits its box, so a long rubric never spills onto
// the next slip. Pure: no DOM here, so it can be unit tested.

export type PrintLayout = 'full' | 'half' | 'quarter'
export type PrintLang = 'en' | 'ko'

export interface PrintRubric { name: string; criteria: RubricCriterion[] }

/** One printed copy. With no student it is a blank slip. */
export interface PrintSlip {
  student?: string
  /** Marked levels by criterion key; absent on a blank slip. */
  levels?: Record<string, number>
  score?: number | null
  maxScore?: number
  note?: 'absent' | 'exempt'
}

export interface PrintOptions {
  layout: PrintLayout
  lang: PrintLang
  /** Assessment name, shown above the rubric name. */
  title?: string
  /** Class, grade, date: shown under the name. */
  subtitle?: string
  showStandards: boolean
  showZero: boolean
  commentLine: boolean
  /** Blank slips only: how many copies to print. */
  copies?: number
}

export const SLIPS_PER_SHEET: Record<PrintLayout, number> = { full: 1, half: 2, quarter: 4 }

/** What the print dialog needs for each student: marked levels and total, or absent/exempt. */
export type ScoredByStudent = Record<string, { levels?: Record<string, number>; score?: number | null; note?: 'absent' | 'exempt' }>

/**
 * The scored slips for one rubric item on an answer sheet. The levels live on
 * the student's response to that question and the total is the item's points,
 * not the paper's, so a slip reads "17 / 20" for the writing question alone.
 */
export function scoredForItem(
  num: number,
  students: { id: string }[],
  responses: Record<string, Record<number, { levels?: Record<string, number>; points?: number }>>,
  flags: Record<string, { absent?: boolean; exempt?: boolean } | undefined>,
): ScoredByStudent {
  const out: ScoredByStudent = {}
  for (const s of students) {
    const fl = flags[s.id]
    if (fl?.absent || fl?.exempt) { out[s.id] = { note: fl.absent ? 'absent' : 'exempt' }; continue }
    const r = responses[s.id]?.[num]
    if (r?.levels && Object.keys(r.levels).length > 0) out[s.id] = { levels: r.levels, score: r.points ?? null }
  }
  return out
}

const WORDS = {
  en: { name: 'Name', date: 'Date', score: 'Score', criterion: 'Criterion', comment: 'Comment', scale: 'Scale', absent: 'Absent', exempt: 'Exempt', total: 'Total' },
  ko: { name: '이름', date: '날짜', score: '점수', criterion: '기준', comment: '코멘트', scale: '척도', absent: '결석', exempt: '면제', total: '합계' },
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** The slips to print: the ones given, or `copies` blank ones. */
export function slipsFor(opts: PrintOptions, slips?: PrintSlip[]): PrintSlip[] {
  if (slips && slips.length > 0) return slips
  const n = Math.max(1, Math.min(200, Math.floor(opts.copies || 1)))
  return Array.from({ length: n }, () => ({}))
}

export function sheetCount(layout: PrintLayout, slipCount: number): number {
  return Math.max(1, Math.ceil(slipCount / SLIPS_PER_SHEET[layout]))
}

function slipHtml(rubric: PrintRubric, opts: PrintOptions, slip: PrintSlip): string {
  const w = WORDS[opts.lang]
  const labels = opts.lang === 'ko' ? LEVEL_LABELS_KO : LEVEL_LABELS
  const compact = opts.layout === 'quarter'
  const levels = [1, 2, 3, 4]
  const cols = (opts.showZero ? 1 : 0) + 4
  const scored = !!slip.levels || !!slip.note
  const maxScore = slip.maxScore ?? rubric.criteria.length * 4

  const scoreText = slip.note === 'absent' ? w.absent : slip.note === 'exempt' ? w.exempt
    : slip.levels ? `${slip.score ?? '—'} / ${maxScore}` : `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / ${maxScore}`

  const head = `
    <div class="head">
      <div class="titles">
        ${opts.title ? `<div class="title">${esc(opts.title)}</div>` : ''}
        <div class="rubric-name">${esc(rubric.name)}</div>
        ${opts.subtitle ? `<div class="sub">${esc(opts.subtitle)}</div>` : ''}
      </div>
      <div class="fields">
        <div class="field"><span class="lbl">${w.name}</span><span class="line">${slip.student ? esc(slip.student) : ''}</span></div>
        ${scored ? '' : `<div class="field"><span class="lbl">${w.date}</span><span class="line"></span></div>`}
        <div class="field"><span class="lbl">${w.score}</span><span class="line score">${scoreText}</span></div>
      </div>
    </div>`

  const th = `<tr><th class="crit">${w.criterion}</th>${opts.showZero ? `<th class="lv">0<span>${esc(labels[0])}</span></th>` : ''}${levels.map(n => `<th class="lv">${n}<span>${esc(labels[n])}</span></th>`).join('')}</tr>`
  const rows = rubric.criteria.map(c => {
    const v = slip.levels?.[c.key]
    const cell = (n: number, text: string) => `<td class="lv${v === n ? ' on' : ''}">${text}</td>`
    const std = opts.showStandards && c.standard ? `<span class="std">${esc(c.standard)}</span>` : ''
    return `<tr><td class="crit"><b>${esc(c.label)}</b>${std}</td>${opts.showZero ? cell(0, compact ? '0' : '') : ''}${levels.map(n => cell(n, compact ? String(n) : esc(c.levels[n - 1]))).join('')}</tr>`
  }).join('')
  const table = `<table class="rubric cols-${cols}">${th}${rows}</table>`

  const scale = compact
    ? `<div class="scale"><b>${w.scale}</b> ${(opts.showZero ? [0, 1, 2, 3, 4] : levels).map(n => `${n} ${esc(labels[n])}`).join(' · ')}</div>`
    : opts.showZero ? `<div class="scale">0 = ${esc(opts.lang === 'ko' ? '시도하지 않았거나 평가할 내용이 없음' : 'not attempted, or nothing to assess yet')}</div>` : ''
  const comment = opts.commentLine ? `<div class="comment"><span class="lbl">${w.comment}</span><div class="rule"></div><div class="rule"></div></div>` : ''

  return `<div class="slip">${head}${table}${scale}${comment}</div>`
}

const BASE_PX: Record<PrintLayout, number> = { full: 11.5, half: 9, quarter: 7.5 }

function css(layout: PrintLayout): string {
  const base = BASE_PX[layout]
  const page = layout === 'quarter'
    ? '@page{size:A4 landscape;margin:8mm}'
    : '@page{size:A4 portrait;margin:8mm}'
  // Sheet = printable area. A4 minus 8mm margins: 194×281 portrait, 281×194 landscape.
  const grid = layout === 'full' ? 'grid-template-columns:1fr;grid-template-rows:1fr;width:194mm;height:281mm'
    : layout === 'half' ? 'grid-template-columns:1fr;grid-template-rows:1fr 1fr;width:194mm;height:281mm'
    : 'grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;width:281mm;height:194mm'
  const pad = layout === 'full' ? '6mm' : layout === 'half' ? '4mm' : '3mm'
  return `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff;color:#1a1a1a;font-family:'Segoe UI',Arial,'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${page}
.sheet{display:grid;${grid};gap:0;page-break-after:always;break-after:page;margin:0 auto}
.sheet:last-child{page-break-after:auto;break-after:auto}
.cell{position:relative;padding:${pad};overflow:hidden;min-width:0;min-height:0}
.sheet.n2 .cell:first-child{border-bottom:1px dashed #9ca3af}
.sheet.n4 .cell:nth-child(1),.sheet.n4 .cell:nth-child(2){border-bottom:1px dashed #9ca3af}
.sheet.n4 .cell:nth-child(odd){border-right:1px dashed #9ca3af}
.slip{font-size:${base}px;line-height:1.3;height:100%;display:flex;flex-direction:column;gap:0.7em}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:1.5em;border-bottom:2px solid #1a1a1a;padding-bottom:0.5em}
.title{font-size:1.1em;font-weight:600;color:#374151}
.rubric-name{font-size:1.75em;font-weight:700;line-height:1.1}
.sub{font-size:0.9em;color:#6b7280;margin-top:0.25em}
.fields{display:flex;flex-direction:column;gap:0.45em;min-width:38%;flex-shrink:0}
.field{display:flex;align-items:baseline;gap:0.5em;font-size:0.95em}
.field .lbl{color:#6b7280;font-weight:600;white-space:nowrap}
.field .line{flex:1;border-bottom:1px solid #1a1a1a;min-height:1.4em;padding:0 0.3em;font-weight:600;white-space:nowrap}
.field .line.score{text-align:right;font-variant-numeric:tabular-nums}
table.rubric{width:100%;border-collapse:collapse;table-layout:fixed}
.rubric th,.rubric td{border:1px solid #9ca3af;padding:0.4em 0.5em;vertical-align:top;text-align:left}
.rubric th{background:#f3f4f6;font-size:0.95em;font-weight:700}
.rubric th.lv span{display:block;font-size:0.72em;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em}
.rubric th.crit,.rubric td.crit{width:${layout === 'quarter' ? '44%' : '18%'}}
.rubric td.crit b{display:block;font-size:1.05em}
.rubric td .std{display:block;font-size:0.8em;color:#2563eb;margin-top:0.15em}
.rubric td.lv{font-size:0.92em;line-height:1.3}
.rubric td.lv.on{background:#dbeafe;box-shadow:inset 0 0 0 2px #1d4ed8;font-weight:600}
.scale{font-size:0.85em;color:#4b5563}
.comment{margin-top:auto;padding-top:0.3em}
.comment .lbl{font-size:0.85em;font-weight:600;color:#6b7280}
.comment .rule{border-bottom:1px solid #9ca3af;height:1.9em}
${layout === 'quarter' ? `
.rubric th,.rubric td{padding:0.3em 0.35em}
.rubric td.lv{text-align:center;font-size:1.15em;font-weight:600}
.rubric th.lv{text-align:center}
.rubric-name{font-size:1.5em}
.fields{min-width:46%}
` : ''}
@media screen{body{background:#e5e7eb;padding:12px}.sheet{background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.25);margin-bottom:12px}}
`
}

/**
 * Sizes each slip's type to its cell: grows a short rubric up to 1.4× the
 * base so it fills the slip, shrinks a long one down to 0.55× so it never
 * spills over, then prints.
 */
function fitScript(autoPrint: boolean): string {
  return `
(function(){
  var cells=document.querySelectorAll('.cell');
  for(var i=0;i<cells.length;i++){
    var cell=cells[i], slip=cell.firstElementChild; if(!slip) continue;
    var base=parseFloat(getComputedStyle(slip).fontSize), size=base, min=base*0.55, max=base*1.4, guard=0;
    var fits=function(){ return slip.scrollHeight<=cell.clientHeight-1 };
    while(fits() && size<max && guard++<40){ size+=0.5; slip.style.fontSize=size+'px'; }
    guard=0;
    while(!fits() && size>min && guard++<80){ size-=0.25; slip.style.fontSize=size+'px'; }
  }
  ${autoPrint ? 'setTimeout(function(){ window.print(); }, 120);' : ''}
})();`
}

export function buildRubricPrintHtml(rubric: PrintRubric, opts: PrintOptions, slips?: PrintSlip[], autoPrint = true): string {
  const all = slipsFor(opts, slips)
  const per = SLIPS_PER_SHEET[opts.layout]
  const sheets: string[] = []
  for (let i = 0; i < all.length; i += per) {
    const chunk = all.slice(i, i + per)
    // Pad the last sheet so the grid, and the cut lines, stay the same shape.
    while (chunk.length < per) chunk.push({})
    sheets.push(`<div class="sheet n${per}">${chunk.map(s => `<div class="cell">${slipHtml(rubric, opts, s)}</div>`).join('')}</div>`)
  }
  const title = esc(opts.title ? `${opts.title} — ${rubric.name}` : rubric.name)
  return `<!DOCTYPE html><html lang="${opts.lang}"><head><meta charset="utf-8"><title>${title}</title><style>${css(opts.layout)}</style></head><body>${sheets.join('')}<script>${fitScript(autoPrint)}</script></body></html>`
}
