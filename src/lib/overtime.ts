// ─── Overtime: the arithmetic ────────────────────────────────────
// Teachers type the times they worked the way they say them ("4:30",
// "6:45", "16:30", "9am"); the app keeps them as 24-hour HH:MM and adds up
// the minutes. Money is never stored: it is minutes × the hourly rate from
// Settings, worked out when shown. Weekends and whole-school days off are
// not overtime at all, so no entry can be made on one, and an entry that
// later lands on a new day off is shown but not counted. A month is shown
// as its Monday-to-Friday weeks, each clipped to the month, so a month's
// totals are exact. Pure: no DOM, no database; tested in
// src/lib/__tests__/overtime.test.ts.

export interface OvertimeEntry {
  id: string
  teacher_id: string
  date: string          // YYYY-MM-DD
  start_time: string    // HH:MM, 24-hour
  end_time: string      // HH:MM, 24-hour
  minutes: number
  reason: string
  created_at?: string
  updated_at?: string
}

export interface OvertimeSettings {
  /** Won an hour. */
  rate: number
  /** Printed at the top of every sheet; {rate} becomes the rate. */
  policyEn: string
  policyKo: string
  /** Reasons offered as chips to everyone, after a teacher's own. */
  reasons: string[]
}

export const OVERTIME_KEY = 'overtime'

export const DEFAULT_OVERTIME_SETTINGS: OvertimeSettings = {
  rate: 10320,
  policyEn: 'According to the government official policy, from January 1st, 2021 the employer will pay for non-instructional overtime. In this case, the employee shall be entitled to supplementary overtime pay of {rate} won per hour. Overtime on weekends and national holidays is not included.',
  policyKo: '공무원 지침에 따라, 2021년 1월 1일부터 수업외의 시간외 근무에 관하여 초과근무 수당을 지급한다. 이러한 경우에는 시간외 수당은 1시간에 {rate}원을 지급한다. 단, 공휴일 및 토·일요일의 근무는 포함하지 않는다.',
  reasons: [],
}

/** The saved JSON, with defaults for anything missing or wrong. */
export function parseOvertimeSettings(raw: string | null | undefined): OvertimeSettings {
  const d = DEFAULT_OVERTIME_SETTINGS
  if (!raw) return d
  try {
    const v = JSON.parse(raw)
    return {
      rate: Number(v.rate) > 0 ? Number(v.rate) : d.rate,
      policyEn: typeof v.policyEn === 'string' && v.policyEn.trim() ? v.policyEn : d.policyEn,
      policyKo: typeof v.policyKo === 'string' && v.policyKo.trim() ? v.policyKo : d.policyKo,
      reasons: Array.isArray(v.reasons) ? v.reasons.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim()) : d.reasons,
    }
  } catch { return d }
}

// ─── Clock times ─────────────────────────────────────────────────

export interface ParsedClock {
  /** HH:MM, 24-hour. */
  hhmm: string
  /** True when the text said am/pm or used a 24-hour figure, so the hour is not a guess. */
  explicit: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
const toHHMM = (mins: number) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
export const toMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/**
 * A time as people type it: 4:30, 4.30, 430, 16:30, 1630, 4, 4pm, 4:30 p.m.,
 * 오후 4:30. With no am/pm and an hour from 1 to 12: 7 to 11 are morning,
 * 12 is noon and 1 to 6 are afternoon, since overtime is mostly after
 * school. A leading zero (07:30) or an hour of 13 or more is 24-hour.
 */
export function parseClock(text: string): ParsedClock | null {
  let s = (text || '').trim().toLowerCase().replace(/\s+/g, '')
  if (!s) return null
  let half: 'am' | 'pm' | null = null
  if (s.startsWith('오전')) { half = 'am'; s = s.slice(2) } else if (s.startsWith('오후')) { half = 'pm'; s = s.slice(2) }
  const suffix = s.match(/(a\.?m?\.?|p\.?m?\.?)$/)
  if (suffix) { half = suffix[1].startsWith('a') ? 'am' : 'pm'; s = s.slice(0, s.length - suffix[1].length) }
  s = s.replace(/시$/, '')
  let h: number, m: number, zeroLed = false
  let mm: RegExpMatchArray | null
  if ((mm = s.match(/^(\d{1,2})[:.h시](\d{2})분?$/))) { h = Number(mm[1]); m = Number(mm[2]); zeroLed = mm[1].length === 2 && mm[1][0] === '0' }
  else if ((mm = s.match(/^(\d{1,2})$/))) { h = Number(mm[1]); m = 0; zeroLed = mm[1].length === 2 && mm[1][0] === '0' }
  else if ((mm = s.match(/^(\d{3,4})$/))) { const v = mm[1]; h = Number(v.slice(0, v.length - 2)); m = Number(v.slice(-2)); zeroLed = v.length === 4 && v[0] === '0' }
  else return null
  if (m > 59 || h > 24 || (h === 24 && m > 0)) return null
  if (half) {
    if (h < 1 || h > 12) return null
    return { hhmm: toHHMM(((h % 12) + (half === 'pm' ? 12 : 0)) * 60 + m), explicit: true }
  }
  if (h === 24) return { hhmm: '24:00', explicit: true }
  if (zeroLed || h >= 13 || h === 0) return { hhmm: toHHMM(h * 60 + m), explicit: true }
  if (h === 12) return { hhmm: toHHMM(12 * 60 + m), explicit: false }
  if (h >= 7) return { hhmm: toHHMM(h * 60 + m), explicit: false }
  return { hhmm: toHHMM((h + 12) * 60 + m), explicit: false }
}

/**
 * From and To together. A To without am/pm that would come at or before
 * From is read twelve hours later when that makes sense, so "4:30" to "8"
 * is 4:30 to 8:00 in the evening. Also takes both in one string, "4:30-6:45".
 */
export function parseRange(fromText: string, toText: string): { start: string; end: string } | null {
  const a = parseClock(fromText), b = parseClock(toText)
  if (!a || !b) return null
  let end = toMinutes(b.hhmm)
  const start = toMinutes(a.hhmm)
  if (!b.explicit && end <= start && end + 720 > start && end + 720 <= 1440) end += 720
  return { start: a.hhmm, end: toHHMM(end) }
}

/** "4:30-6:45", "4:30 – 6:45", "4:30 to 6:45" typed into one field: the two halves, else null. */
export function splitRange(text: string): [string, string] | null {
  const m = (text || '').match(/^\s*(.+?)\s*(?:-|–|—|~|to|부터)\s*(.+?)\s*(?:까지)?\s*$/i)
  return m && m[1] && m[2] ? [m[1], m[2]] : null
}

/** 16:30 → "4:30", 08:15 → "8:15 am", 12:00 → "12:00". No am/pm means afternoon or evening. */
export function fmtClock(hhmm: string, ko = false): string {
  const t = toMinutes(hhmm.slice(0, 5))
  const h = Math.floor(t / 60) % 24, m = t % 60
  const h12 = h % 12 === 0 ? 12 : h % 12
  const core = `${h12}:${pad(m)}`
  if (h < 12) return ko ? `오전 ${core}` : `${core} am`
  return core
}

export const fmtRange = (start: string, end: string, ko = false) => `${fmtClock(start, ko)} – ${fmtClock(end, ko)}`

/** Whole minutes from start to end, or null when end is not after start. */
export function minutesBetween(start: string, end: string): number | null {
  const d = toMinutes(end.slice(0, 5)) - toMinutes(start.slice(0, 5))
  return d > 0 ? d : null
}

/** 135 → "2 h 15 m", 45 → "45 m", 180 → "3 h", 0 → "0 m". Korean: 2시간 15분. */
export function fmtMinutes(mins: number, ko = false): string {
  const h = Math.floor(mins / 60), m = mins % 60
  if (ko) return h && m ? `${h}시간 ${m}분` : h ? `${h}시간` : `${m}분`
  return h && m ? `${h} h ${m} m` : h ? `${h} h` : `${m} m`
}

/** Minutes as decimal hours to two places, for the spreadsheet. */
export const decimalHours = (mins: number) => Math.round((mins / 60) * 100) / 100

export const wonFor = (mins: number, rate: number) => Math.round((mins * rate) / 60)

/** 23220 → "23,220 won" (or "23,220원"). */
export const fmtWon = (n: number, ko = false) => `${Math.round(n).toLocaleString('en-US')}${ko ? '원' : ' won'}`

// ─── Days that are not overtime ──────────────────────────────────

export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const weekdayOf = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()

export type DayOffRow = { type: string; title: string; date: string; end_date: string | null; target_grades: number[] | null }

/** Whole-school days off in [from, to], by date, from calendar rows. A day off for some grades only is a working day for teachers. */
export function daysOffIn(events: DayOffRow[], from: string, to: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const e of events) {
    if (e.type !== 'day_off' || (e.target_grades && e.target_grades.length > 0)) continue
    const last = e.end_date && e.end_date > e.date ? e.end_date : e.date
    for (let d = e.date > from ? e.date : from; d <= last && d <= to; d = addDays(d, 1)) if (!out[d]) out[d] = e.title
  }
  return out
}

/** Why a date cannot have overtime: a weekend, a day off (its title), or null. */
export function blockedReason(date: string, daysOff: Record<string, string>): { kind: 'weekend' } | { kind: 'dayoff'; title: string } | null {
  const w = weekdayOf(date)
  if (w === 0 || w === 6) return { kind: 'weekend' }
  if (daysOff[date]) return { kind: 'dayoff', title: daysOff[date] }
  return null
}

/** Entries that count: not on a weekend or a day off. */
export const counted = (entries: OvertimeEntry[], daysOff: Record<string, string>) => entries.filter(e => !blockedReason(e.date, daysOff))

/** Another entry the same day that this one's times run into, if any. */
export function overlapping(entry: { id?: string; date: string; start_time: string; end_time: string }, others: OvertimeEntry[]): OvertimeEntry | null {
  const s = toMinutes(entry.start_time.slice(0, 5)), e = toMinutes(entry.end_time.slice(0, 5))
  return others.find(o => o.id !== entry.id && o.date === entry.date && toMinutes(o.start_time.slice(0, 5)) < e && s < toMinutes(o.end_time.slice(0, 5))) || null
}

// ─── Weeks ───────────────────────────────────────────────────────

export interface MonthWeek {
  /** The week's first working day in the month; the week's key. */
  from: string
  /** Its last working day in the month (Friday, or the month's last weekday). */
  to: string
}

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "2026-11" → its Monday-to-Friday weeks, each clipped to the month. */
export function weeksOfMonth(month: string): MonthWeek[] {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const weeks: MonthWeek[] = []
  let cur: MonthWeek | null = null
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const w = weekdayOf(d)
    if (w === 0 || w === 6) { if (cur) { weeks.push(cur); cur = null } continue }
    if (!cur) cur = { from: d, to: d }; else cur.to = d
  }
  if (cur) weeks.push(cur)
  return weeks
}

/** "Nov 2", "Nov 3" style; Korean "11월 3일". */
export function fmtDate(iso: string, ko = false): string {
  const m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10))
  return ko ? `${m}월 ${d}일` : `${MONTHS_EN[m - 1]} ${d}`
}

const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

/** "Tue, Nov 3"; Korean "11월 3일 (화)". */
export function fmtDayDate(iso: string, ko = false): string {
  const w = weekdayOf(iso)
  return ko ? `${fmtDate(iso, true)} (${DAYS_KO[w]})` : `${DAYS_EN[w]}, ${fmtDate(iso)}`
}

/** "Nov 2 – 6", "Nov 30"; Korean "11월 2일 – 6일". */
export function weekLabel(w: MonthWeek, ko = false): string {
  if (w.from === w.to) return fmtDate(w.from, ko)
  const d = Number(w.to.slice(8, 10))
  return `${fmtDate(w.from, ko)} – ${ko ? `${d}일` : d}`
}

/** "November 2026", "2026년 11월". */
export function monthLabel(month: string, ko = false): string {
  const [y, m] = month.split('-').map(Number)
  return ko ? `${y}년 ${m}월` : `${MONTHS_LONG[m - 1]} ${y}`
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return d.toISOString().slice(0, 7)
}

export const monthRange = (month: string) => {
  const weeks = weeksOfMonth(month)
  const [y, m] = month.split('-').map(Number)
  return { from: `${month}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10), weeks }
}

export const weekOf = (date: string, weeks: MonthWeek[]) => weeks.find(w => date >= w.from && date <= w.to) || null

/** Entries whose date falls in one of the ticked weeks. */
export const entriesInWeeks = <T extends { date: string }>(entries: T[], weeks: MonthWeek[]) => entries.filter(e => weeks.some(w => e.date >= w.from && e.date <= w.to))

// ─── What goes on the sheet: a range of dates ────────────────────
// The print view takes a From and a To, filled by a quick pick (this
// month, last month, the last two weeks) or typed. selectionLabel names
// it on the sheet.

/** The first Monday-to-Friday day after a date. */
export function nextWorkday(iso: string): string {
  let d = addDays(iso, 1)
  while (weekdayOf(d) === 0 || weekdayOf(d) === 6) d = addDays(d, 1)
  return d
}

function rangeLabel(from: string, to: string, ko: boolean, withYear: boolean): string {
  const y1 = from.slice(0, 4), y2 = to.slice(0, 4)
  const dFrom = Number(from.slice(8, 10)), dTo = Number(to.slice(8, 10))
  if (ko) {
    const a = `${withYear && y1 !== y2 ? `${y1}년 ` : ''}${fmtDate(from, true)}`
    if (from === to) return a
    const b = from.slice(0, 7) === to.slice(0, 7) ? `${dTo}일` : `${withYear && y1 !== y2 ? `${y2}년 ` : ''}${fmtDate(to, true)}`
    return `${a} – ${b}`
  }
  if (from === to) return fmtDate(from) + (withYear && y1 !== y2 ? `, ${y1}` : '')
  if (from.slice(0, 7) === to.slice(0, 7)) return `${fmtDate(from)} – ${dTo}`
  if (withYear && y1 !== y2) return `${fmtDate(from)}, ${y1} – ${fmtDate(to)}, ${y2}`
  return `${fmtDate(from)} – ${fmtDate(to)}`
}

/** A date range typed by hand, as a span the week helpers take; null unless both are dates and from is not after to. */
export function rangeSpan(from: string, to: string): MonthWeek | null {
  const ok = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d + 'T12:00:00Z').getTime())
  return ok(from) && ok(to) && from <= to ? { from, to } : null
}

/**
 * What the ticked weeks are called on the sheet: the month when they are
 * exactly one whole month, else runs of back-to-back weeks, across months
 * too: "Nov 2 – 13, Nov 23 – 27, 2026", "Nov 23 – Dec 4, 2026".
 */
export function selectionLabel(weeks: MonthWeek[], ko = false): string {
  const ws = [...weeks].sort((a, b) => a.from.localeCompare(b.from))
  if (!ws.length) return ''
  const months = new Set(ws.map(w => w.from.slice(0, 7)))
  // A date range that is exactly one month.
  if (ws.length === 1 && ws[0].from.slice(0, 7) === ws[0].to.slice(0, 7) && ws[0].from.endsWith('-01') && ws[0].to === monthRange(ws[0].from.slice(0, 7)).to) return monthLabel(ws[0].from.slice(0, 7), ko)
  if (months.size === 1) {
    const month = ws[0].from.slice(0, 7)
    const all = weeksOfMonth(month)
    if (all.length === ws.length && all.every((w, i) => w.from === ws[i].from)) return monthLabel(month, ko)
  }
  const runs: { from: string; to: string }[] = []
  for (const w of ws) {
    const last = runs[runs.length - 1]
    if (last && nextWorkday(last.to) === w.from) last.to = w.to
    else runs.push({ from: w.from, to: w.to })
  }
  const y1 = ws[0].from.slice(0, 4), y2 = ws[ws.length - 1].to.slice(0, 4)
  const oneYear = y1 === y2
  const body = runs.map(r => rangeLabel(r.from, r.to, ko, !oneYear)).join(', ')
  if (!oneYear) return body
  return ko ? `${y1}년 ${body}` : `${body}, ${y1}`
}

/** Monday of the week a date is in (Sunday counts with the week before). */
export function mondayOf(iso: string): string {
  const w = weekdayOf(iso)
  return addDays(iso, w === 0 ? -6 : 1 - w)
}

export type QuickPick = 'thisMonth' | 'lastMonth' | 'twoWeeks'

/** The quick picks in the print view, as date ranges from today. Last 2 weeks is last week's Monday to this week's Friday. */
export function quickRanges(today: string): Record<QuickPick, { from: string; to: string }> {
  const thisMonth = monthRange(today.slice(0, 7)), lastMonth = monthRange(shiftMonth(today.slice(0, 7), -1))
  const mon = mondayOf(today)
  return {
    thisMonth: { from: thisMonth.from, to: thisMonth.to },
    lastMonth: { from: lastMonth.from, to: lastMonth.to },
    twoWeeks: { from: addDays(mon, -7), to: addDays(mon, 4) },
  }
}

/** Which quick pick a range is, if any. */
export function pickFor(from: string, to: string, today: string): QuickPick | null {
  const q = quickRanges(today)
  return (Object.keys(q) as QuickPick[]).find(k => q[k].from === from && q[k].to === to) || null
}

// ─── Totals ──────────────────────────────────────────────────────

export function totals(entries: OvertimeEntry[], rate: number): { minutes: number; won: number; count: number } {
  const minutes = entries.reduce((n, e) => n + e.minutes, 0)
  return { minutes, won: wonFor(minutes, rate), count: entries.length }
}

export const byDateTime = (a: OvertimeEntry, b: OvertimeEntry) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)

/** A teacher's most recent distinct reasons, newest first. */
export function recentReasons(entries: OvertimeEntry[], n = 5): string[] {
  const seen = new Set<string>(), out: string[] = []
  const sorted = [...entries].sort((a, b) => (b.date + (b.created_at || '')).localeCompare(a.date + (a.created_at || '')))
  for (const e of sorted) {
    const r = e.reason.trim(), k = r.toLowerCase()
    if (!r || seen.has(k)) continue
    seen.add(k); out.push(r)
    if (out.length >= n) break
  }
  return out
}

/** The policy paragraph with the rate written in. */
export const policyText = (template: string, rate: number) => template.split('{rate}').join(Math.round(rate).toLocaleString('en-US'))

// ─── The printed sheet: always one page ──────────────────────────
// A teacher's sheet is one A4 landscape page, whatever the number of
// entries, in type large enough for a reader with low vision. Up to
// twelve entries the rows are full size and blank rows fill the table to
// twelve; with more, the rows get shorter and the type follows them, never
// past what fits. The print window then checks the real page and shrinks
// everything a little further only if a long reason wrapped.

export const SHEET_MIN_ROWS = 12
/** The height the table rows share on the page, at full size, in mm. */
export const SHEET_ROWS_MM = 114
/** Full-size row height (mm) and cell type (px). */
export const SHEET_ROW_MM = 9.5
export const SHEET_CELL_PX = 17

/** Entries in date order, numbered from 1, then blank rows up to the minimum. */
export function sheetRows(entries: OvertimeEntry[], minRows = SHEET_MIN_ROWS): ({ no: number; entry: OvertimeEntry } | null)[] {
  const rows: ({ no: number; entry: OvertimeEntry } | null)[] = [...entries].sort(byDateTime).map((entry, i) => ({ no: i + 1, entry }))
  while (rows.length < minRows) rows.push(null)
  return rows
}

/** Row height (mm) and cell type size (px) for a sheet of this many rows, so they fit the page. */
export function sheetLayout(rowCount: number): { rowMm: number; cellPx: number } {
  const n = Math.max(rowCount, 1)
  const rowMm = Math.min(SHEET_ROW_MM, SHEET_ROWS_MM / n)
  // The type is about 60% of the row's height, and never more than full size.
  const cellPx = Math.min(SHEET_CELL_PX, Math.round(rowMm * 3.78 * 0.6 * 10) / 10)
  return { rowMm: Math.round(rowMm * 100) / 100, cellPx }
}
