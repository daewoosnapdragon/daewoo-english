import { fmtDate, fmtMinutes, fmtRange, fmtWon, policyText, sheetPages, totals, type OvertimeEntry, type OvertimeSettings } from '@/lib/overtime'

// ─── The overtime sheet, on paper ────────────────────────────────
// The school's "Supplementary non-instructional overtime" form, tidied:
// the same title, policy paragraph (English, then Korean, with the rate
// written in), signature box and columns, sixteen ruled rows to a page
// with blank rows to the bottom, plus a line naming the teacher and the
// weeks, and the totals under the table. One teacher or the whole staff
// in one document, each teacher starting on a new page. The signature box
// stays empty for a pen. Pure: no DOM here, so it can be tested.

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface SheetInput {
  teacherName: string
  className: string
  /** "November 2026" or "Nov 2 – 13, 2026". */
  period: string
  /** Only entries that count, in the ticked weeks. */
  entries: OvertimeEntry[]
}

function pageHtml(s: SheetInput, rows: ReturnType<typeof sheetPages>[number], pageNo: number, pageCount: number, settings: OvertimeSettings, school: string): string {
  const last = pageNo === pageCount
  const t = totals(s.entries, settings.rate)
  const body = rows.map((r, i) => r ? `
      <tr>
        <td class="no">${r.no}</td>
        <td class="date">${esc(fmtDate(r.entry.date))}</td>
        <td class="time">${esc(fmtRange(r.entry.start_time, r.entry.end_time))}</td>
        <td class="hrs">${esc(fmtMinutes(r.entry.minutes))}</td>
        <td class="why">${esc(r.entry.reason)}</td>
      </tr>` : `
      <tr class="blank">
        <td class="no"></td><td class="date"></td>
        <td class="time">${i === 0 && pageNo === 1 ? '<span class="hint">From</span><span class="hint to">To</span>' : ''}</td>
        <td class="hrs"></td><td class="why"></td>
      </tr>`).join('')
  return `
  <section class="page">
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
        <div class="p">${esc(s.period)}${pageCount > 1 ? ` · page ${pageNo} of ${pageCount}` : ''}</div>
      </div>
    </div>
    <table>
      <colgroup><col class="c-no"><col class="c-date"><col class="c-time"><col class="c-hrs"><col class="c-why"></colgroup>
      <thead><tr><th class="no">No.</th><th>Date</th><th>Overtime hours<small>From – To</small></th><th>Time</th><th>Specific reason</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    ${last ? `<div class="total"><span>Total</span><strong>${esc(fmtMinutes(t.minutes))}</strong><span class="dot">·</span><strong>${esc(fmtWon(t.won))}</strong><span class="at">at ${esc(fmtWon(settings.rate))} an hour · ${t.count} ${t.count === 1 ? 'entry' : 'entries'}</span></div>` : '<div class="total cont">Continued on the next page</div>'}
  </section>`
}

export function overtimeSheetHtml(sheets: SheetInput[], settings: OvertimeSettings, school = 'Daewoo Elementary School'): string {
  const pages = sheets.flatMap(s => {
    const ps = sheetPages(s.entries)
    return ps.map((rows, i) => pageHtml(s, rows, i + 1, ps.length, settings, school))
  }).join('')
  const title = sheets.length === 1 ? `Overtime · ${sheets[0].teacherName} · ${sheets[0].period}` : `Overtime · ${sheets[0]?.period || ''}`
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 11mm 13mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font: 11px/1.4 -apple-system, "Segoe UI", Helvetica, Arial, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; color: #16202a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { height: 187mm; padding: 0 0.6mm; display: flex; flex-direction: column; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  header { text-align: center; }
  h1 { font-size: 19px; letter-spacing: 0.2px; margin: 0 0 5px; font-weight: 700; }
  .policy { margin: 0 auto; max-width: 250mm; font-size: 9.6px; line-height: 1.45; color: #34404c; }
  .policy.ko { margin-top: 2px; }
  .school { margin: 4px 0 0; text-align: right; font-size: 10.5px; color: #34404c; letter-spacing: 0.3px; }
  .who { display: flex; justify-content: space-between; align-items: flex-end; margin: 7px 0 6px; }
  .sig { border: 1.4px solid #16202a; border-radius: 2px; padding: 7px 10px 6px; width: 92mm; display: flex; align-items: flex-end; gap: 8px; }
  .sig .lbl { font-weight: 700; font-size: 12.5px; }
  .sig .line { flex: 1; border-bottom: 1px solid #16202a; height: 15px; }
  .name { text-align: right; }
  .name .n { font-size: 13px; font-weight: 700; }
  .name .c { font-weight: 400; color: #4b5866; }
  .name .p { font-size: 10.5px; color: #4b5866; margin-top: 1px; }
  /* Borders drawn separately: in the collapsed model the last column's border-right: 0 wiped out the table's right edge in print. */
  table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; border: 1.4px solid #16202a; }
  col.c-no { width: 11mm; } col.c-date { width: 23mm; } col.c-time { width: 38mm; } col.c-hrs { width: 23mm; }
  th { font-size: 11px; font-weight: 700; text-align: left; padding: 4px 7px; background: #eef1f4; border-bottom: 1.4px solid #16202a; border-right: 1px solid #b9c2cc; vertical-align: middle; height: 10mm; }
  th small { display: block; font-weight: 400; font-size: 9px; color: #4b5866; }
  th.no { text-align: center; }
  td { height: 7.7mm; padding: 0 7px; border-bottom: 1px solid #c9d0d8; border-right: 1px solid #c9d0d8; vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 11px; }
  th:last-child, td:last-child { border-right: 0; }
  tbody tr:last-child td { border-bottom: 0; }
  td.no { text-align: center; color: #4b5866; }
  td.time, td.hrs, td.no, td.date { font-variant-numeric: tabular-nums; }
  td.why { white-space: normal; line-height: 1.2; }
  .hint { color: #8995a2; font-size: 10px; }
  .hint.to { margin-left: 15mm; }
  .total { padding-top: 6px; display: flex; align-items: baseline; gap: 7px; justify-content: flex-end; font-size: 12px; }
  .total strong { font-size: 13px; }
  .total .dot { color: #8995a2; }
  .total .at { color: #4b5866; font-size: 10.5px; margin-left: 4px; }
  .total.cont { color: #4b5866; font-size: 10.5px; }
  @media screen { body { background: #e6e9ed; padding: 12px 0; } .page { width: 297mm; height: 210mm; padding: 11mm 13mm; margin: 0 auto 12px; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.15); } }
</style></head><body>${pages}
  <script>window.onload = function () { setTimeout(function () { window.print() }, 150) }</script>
</body></html>`
}

export function printOvertimeSheets(sheets: SheetInput[], settings: OvertimeSettings): boolean {
  const w = window.open('', '_blank'); if (!w) return false
  w.document.write(overtimeSheetHtml(sheets, settings)); w.document.close()
  return true
}
