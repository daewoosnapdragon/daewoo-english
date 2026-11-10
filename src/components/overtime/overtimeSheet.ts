import { fmtDayDate, fmtMinutes, fmtRange, fmtWon, policyText, sheetLayout, sheetRows, totals, type OvertimeEntry, type OvertimeSettings } from '@/lib/overtime'

// ─── The overtime sheet, on paper ────────────────────────────────
// The school's "Supplementary non-instructional overtime" form, tidied and
// set large for a reader with low vision: the same title, policy paragraph
// (English, then Korean, with the rate written in), signature box and
// columns, then the teacher, the weeks or dates, and the totals. Every
// teacher's sheet is exactly one A4 landscape page: up to twelve entries at
// full size with blank rows to twelve, more entries in shorter rows
// (sheetLayout), and the print window shrinks the whole page a little
// further only if it still runs over, say when long reasons wrap. Text is
// near-black on white throughout. One teacher or the whole staff in one
// document, a page each. The signature box stays empty for a pen. The
// builder is pure, so it can be tested; the fitting runs in the window.

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface SheetInput {
  teacherName: string
  className: string
  /** "November 2026" or "Nov 23 – Dec 4, 2026". */
  period: string
  /** Only entries that count, on the sheet. */
  entries: OvertimeEntry[]
}

function pageHtml(s: SheetInput, settings: OvertimeSettings, school: string): string {
  const rows = sheetRows(s.entries)
  const { rowMm, cellPx } = sheetLayout(rows.length)
  const t = totals(s.entries, settings.rate)
  const body = rows.map((r, i) => r ? `
        <tr>
          <td class="no">${r.no}</td>
          <td class="date">${esc(fmtDayDate(r.entry.date))}</td>
          <td class="time">${esc(fmtRange(r.entry.start_time, r.entry.end_time))}</td>
          <td class="hrs">${esc(fmtMinutes(r.entry.minutes))}</td>
          <td class="why">${esc(r.entry.reason)}</td>
        </tr>` : `
        <tr class="blank">
          <td class="no"></td><td class="date"></td>
          <td class="time">${i === 0 ? '<span class="hint">From</span><span class="hint to">To</span>' : ''}</td>
          <td class="hrs"></td><td class="why"></td>
        </tr>`).join('')
  return `
  <section class="page" style="--row: ${rowMm}mm; --cell: ${cellPx}px">
    <div class="sheet">
      <header>
        <h1>Supplementary non-instructional overtime</h1>
        <p class="policy">${esc(policyText(settings.policyEn, settings.rate))}</p>
        <p class="policy ko">${esc(policyText(settings.policyKo, settings.rate))}</p>
        <p class="school">${esc(school)}</p>
      </header>
      <div class="who">
        <div class="sig"><span class="lbl">Signature</span><span class="line"></span></div>
        <div class="name">
          <div class="n">${esc(s.teacherName)}${s.className ? ` <span class="c">· ${esc(s.className)}</span>` : ''}</div>
          <div class="p">${esc(s.period)}</div>
        </div>
      </div>
      <table>
        <colgroup><col class="c-no"><col class="c-date"><col class="c-time"><col class="c-hrs"><col class="c-why"></colgroup>
        <thead><tr><th class="no">No.</th><th>Date</th><th>Overtime hours<small>From – To</small></th><th>Time</th><th>Specific reason</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="total"><span>Total</span><strong>${esc(fmtMinutes(t.minutes))}</strong><span class="dot">·</span><strong>${esc(fmtWon(t.won))}</strong><span class="at">at ${esc(fmtWon(settings.rate))} an hour · ${t.count} ${t.count === 1 ? 'entry' : 'entries'}</span></div>
    </div>
  </section>`
}

// Runs in the print window: shrink a page only while it is taller than the
// paper, then print. The screen view of each page is the same size as the
// printed one, so what fits here fits on paper.
const FIT_SCRIPT = `
  function fitPages() {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      var p = pages[i], sheet = p.querySelector('.sheet'), cs = getComputedStyle(p);
      var room = p.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var s = 1; p.style.setProperty('--s', s);
      while (sheet.offsetHeight > room && s > 0.4) { s = Math.round((s - 0.02) * 100) / 100; p.style.setProperty('--s', s); }
    }
  }
  function go() { fitPages(); if (AUTO_PRINT) setTimeout(function () { window.print() }, 100) }
  window.addEventListener('beforeprint', fitPages);
  window.onload = function () { if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else setTimeout(go, 200) };
`

export function overtimeSheetHtml(sheets: SheetInput[], settings: OvertimeSettings, school = 'Daewoo Elementary School', opts: { autoPrint?: boolean } = {}): string {
  const pages = sheets.map(s => pageHtml(s, settings, school)).join('')
  const title = sheets.length === 1 ? `Overtime · ${sheets[0].teacherName} · ${sheets[0].period}` : `Overtime · ${sheets[0]?.period || ''}`
  const autoPrint = opts.autoPrint !== false
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* One A4 landscape page, 277 x 190 mm inside the margins. --s shrinks everything only when the page would run over. */
  .page { --s: 1; height: 190mm; overflow: hidden; padding: 0 0.6mm; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .sheet { display: flex; flex-direction: column; }
  header { text-align: center; }
  h1 { font-size: calc(28px * var(--s)); margin: 0 0 calc(5px * var(--s)); font-weight: 700; line-height: 1.2; }
  .policy { margin: 0 auto; font-size: calc(13px * var(--s)); line-height: 1.4; color: #222; }
  .policy.ko { margin-top: calc(2px * var(--s)); }
  .school { margin: calc(4px * var(--s)) 0 0; text-align: right; font-size: calc(14px * var(--s)); color: #222; }
  .who { display: flex; justify-content: space-between; align-items: flex-end; margin: calc(8px * var(--s)) 0 calc(8px * var(--s)); }
  .sig { border: 2px solid #111; border-radius: 2px; padding: calc(9px * var(--s)) 12px calc(8px * var(--s)); width: 105mm; display: flex; align-items: flex-end; gap: 10px; }
  .sig .lbl { font-weight: 700; font-size: calc(18px * var(--s)); }
  .sig .line { flex: 1; border-bottom: 1.5px solid #111; height: calc(20px * var(--s)); }
  .name { text-align: right; }
  .name .n { font-size: calc(20px * var(--s)); font-weight: 700; line-height: 1.25; }
  .name .c { font-weight: 400; }
  .name .p { font-size: calc(17px * var(--s)); margin-top: 2px; }
  /* Borders drawn separately: in the collapsed model the last column's border-right: 0 wiped out the table's right edge in print. */
  table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 2px solid #111; }
  col.c-no { width: 14mm; } col.c-date { width: 36mm; } col.c-time { width: 52mm; } col.c-hrs { width: 30mm; }
  th { font-size: calc(17px * var(--s)); font-weight: 700; text-align: left; padding: calc(5px * var(--s)) 9px; background: #e6eaee; border-bottom: 2px solid #111; border-right: 1px solid #6b7480; vertical-align: middle; height: calc(12mm * var(--s)); line-height: 1.2; }
  th small { display: block; font-weight: 400; font-size: calc(13px * var(--s)); color: #222; }
  th.no { text-align: center; }
  td { height: calc(var(--row) * var(--s)); padding: 0 9px; border-bottom: 1px solid #6b7480; border-right: 1px solid #6b7480; vertical-align: middle; white-space: nowrap; overflow: hidden; font-size: calc(var(--cell) * var(--s)); line-height: 1.2; }
  th:last-child, td:last-child { border-right: 0; }
  tbody tr:last-child td { border-bottom: 0; }
  td.no { text-align: center; }
  td.time, td.hrs, td.no, td.date { font-variant-numeric: tabular-nums; }
  td.hrs { font-weight: 700; }
  td.why { white-space: normal; }
  .hint { color: #555; font-size: calc(14px * var(--s)); }
  .hint.to { margin-left: 22mm; }
  .total { padding-top: calc(8px * var(--s)); display: flex; align-items: baseline; gap: 10px; justify-content: flex-end; font-size: calc(18px * var(--s)); }
  .total strong { font-size: calc(21px * var(--s)); }
  .total .at { font-size: calc(15px * var(--s)); color: #222; margin-left: 4px; }
  @media screen { body { background: #e6e9ed; padding: 12px 0; } .page { width: 297mm; height: 210mm; padding: 10mm 10.6mm; margin: 0 auto 12px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }
</style></head><body>${pages}
  <script>var AUTO_PRINT = ${autoPrint ? 'true' : 'false'};${FIT_SCRIPT}</script>
</body></html>`
}

export function printOvertimeSheets(sheets: SheetInput[], settings: OvertimeSettings): boolean {
  const w = window.open('', '_blank'); if (!w) return false
  w.document.write(overtimeSheetHtml(sheets, settings)); w.document.close()
  return true
}
