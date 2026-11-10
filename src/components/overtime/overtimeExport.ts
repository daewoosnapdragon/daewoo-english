import type { Teacher } from '@/types'
import { byDateTime, decimalHours, fmtMinutes, fmtRange, totals, wonFor, type OvertimeEntry } from '@/lib/overtime'

// ─── Overtime to Excel ───────────────────────────────────────────
// Two sheets for the office: every entry in the ticked weeks, and the
// totals per teacher. xlsx is loaded only when someone exports.

export async function exportOvertime(rows: { teacher: Teacher; entries: OvertimeEntry[] }[], rate: number, filename: string, period: string) {
  const XLSX = await import('xlsx')
  const entries = rows.flatMap(r => [...r.entries].sort(byDateTime).map(e => ({
    Teacher: r.teacher.name, Class: r.teacher.english_class, Date: e.date, 'From – To': fmtRange(e.start_time, e.end_time),
    From: e.start_time, To: e.end_time, Minutes: e.minutes, Hours: decimalHours(e.minutes), Won: wonFor(e.minutes, rate), Reason: e.reason,
  })))
  const sums = rows.map(r => { const t = totals(r.entries, rate); return { Teacher: r.teacher.name, Class: r.teacher.english_class, Entries: t.count, Time: fmtMinutes(t.minutes), Minutes: t.minutes, Hours: decimalHours(t.minutes), Won: t.won } })
  const all = totals(rows.flatMap(r => r.entries), rate)
  sums.push({ Teacher: 'Total', Class: '', Entries: all.count, Time: fmtMinutes(all.minutes), Minutes: all.minutes, Hours: decimalHours(all.minutes), Won: all.won })
  const wb = XLSX.utils.book_new()
  const a = XLSX.utils.json_to_sheet(entries.length ? entries : [{ Teacher: '', Class: '', Date: '', 'From – To': '', From: '', To: '', Minutes: '', Hours: '', Won: '', Reason: '' }])
  a['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 11 }, { wch: 14 }, { wch: 7 }, { wch: 7 }, { wch: 8 }, { wch: 7 }, { wch: 10 }, { wch: 50 }]
  const b = XLSX.utils.json_to_sheet(sums)
  b['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 7 }, { wch: 12 }]
  XLSX.utils.sheet_add_aoa(b, [[], [`${period} · ${rate.toLocaleString('en-US')} won an hour`]], { origin: -1 })
  XLSX.utils.book_append_sheet(wb, a, 'Entries')
  XLSX.utils.book_append_sheet(wb, b, 'Totals')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
