import { describe, expect, it } from 'vitest'
import {
  blockedReason, counted, fmtDayDate, daysOffIn, fmtClock, fmtMinutes, fmtRange, fmtWon, minutesBetween, monthLabel, overlapping,
  parseClock, parseOvertimeSettings, parseRange, selectionLabel, nextWorkday, rangeSpan, mondayOf, quickRanges, pickFor, policyText, recentReasons, sheetRows, sheetLayout, shiftMonth,
  splitRange, totals, weekLabel, weeksOfMonth, wonFor, entriesInWeeks, DEFAULT_OVERTIME_SETTINGS, type OvertimeEntry,
} from '@/lib/overtime'

const entry = (p: Partial<OvertimeEntry>): OvertimeEntry => ({ id: Math.random().toString(36).slice(2), teacher_id: 't', date: '2026-11-03', start_time: '16:30', end_time: '18:45', minutes: 135, reason: 'Report cards', ...p })

describe('parseClock', () => {
  it('reads an afternoon time without am/pm', () => {
    expect(parseClock('4:30')).toEqual({ hhmm: '16:30', explicit: false })
    expect(parseClock('6:45')?.hhmm).toBe('18:45')
    expect(parseClock('4')?.hhmm).toBe('16:00')
    expect(parseClock('4.30')?.hhmm).toBe('16:30')
    expect(parseClock('430')?.hhmm).toBe('16:30')
  })
  it('reads 7 to 11 as morning and 12 as noon', () => {
    expect(parseClock('7:30')?.hhmm).toBe('07:30')
    expect(parseClock('11')?.hhmm).toBe('11:00')
    expect(parseClock('12:15')?.hhmm).toBe('12:15')
  })
  it('takes 24-hour figures and a leading zero as written', () => {
    expect(parseClock('16:30')).toEqual({ hhmm: '16:30', explicit: true })
    expect(parseClock('1630')?.hhmm).toBe('16:30')
    expect(parseClock('06:30')?.hhmm).toBe('06:30')
    expect(parseClock('0830')?.hhmm).toBe('08:30')
  })
  it('honours am and pm in any spelling, and Korean', () => {
    expect(parseClock('9am')?.hhmm).toBe('09:00')
    expect(parseClock('4 PM')?.hhmm).toBe('16:00')
    expect(parseClock('4:30 p.m.')?.hhmm).toBe('16:30')
    expect(parseClock('5a')?.hhmm).toBe('05:00')
    expect(parseClock('12am')?.hhmm).toBe('00:00')
    expect(parseClock('12pm')?.hhmm).toBe('12:00')
    expect(parseClock('오후 4:30')?.hhmm).toBe('16:30')
    expect(parseClock('오전 8시')?.hhmm).toBe('08:00')
    expect(parseClock('4시 30분')?.hhmm).toBe('16:30')
  })
  it('refuses what is not a time', () => {
    for (const s of ['', 'abc', '4:75', '25', '13pm', '4:3', '12345']) expect(parseClock(s)).toBeNull()
  })
})

describe('parseRange', () => {
  it('reads the usual after-school stint', () => {
    expect(parseRange('4:30', '6:45')).toEqual({ start: '16:30', end: '18:45' })
  })
  it('moves a To that would come first into the evening', () => {
    expect(parseRange('4:30', '8')).toEqual({ start: '16:30', end: '20:00' })
    expect(parseRange('11', '1')).toEqual({ start: '11:00', end: '13:00' })
  })
  it('leaves a To with am/pm alone, even when it is wrong', () => {
    expect(parseRange('4:30', '8am')).toEqual({ start: '16:30', end: '08:00' })
  })
  it('keeps morning stints in the morning', () => {
    expect(parseRange('7', '8:20')).toEqual({ start: '07:00', end: '08:20' })
  })
  it('is null when either side is not a time', () => {
    expect(parseRange('4:30', 'later')).toBeNull()
  })
})

describe('splitRange', () => {
  it('splits both times typed in one field', () => {
    expect(splitRange('4:30-6:45')).toEqual(['4:30', '6:45'])
    expect(splitRange('4:30 – 6:45')).toEqual(['4:30', '6:45'])
    expect(splitRange('4:30 to 6:45')).toEqual(['4:30', '6:45'])
    expect(splitRange('4:30')).toBeNull()
  })
})

describe('formatting', () => {
  it('shows afternoon times bare and morning times with am', () => {
    expect(fmtClock('16:30')).toBe('4:30')
    expect(fmtClock('12:00')).toBe('12:00')
    expect(fmtClock('08:15')).toBe('8:15 am')
    expect(fmtClock('08:15', true)).toBe('오전 8:15')
    expect(fmtClock('16:30:00')).toBe('4:30')
    expect(fmtRange('16:30', '18:45')).toBe('4:30 – 6:45')
  })
  it('adds up minutes and shows them as hours and minutes', () => {
    expect(minutesBetween('16:30', '18:45')).toBe(135)
    expect(minutesBetween('18:45', '16:30')).toBeNull()
    expect(minutesBetween('16:30', '16:30')).toBeNull()
    expect(fmtMinutes(135)).toBe('2 h 15 m')
    expect(fmtMinutes(45)).toBe('45 m')
    expect(fmtMinutes(180)).toBe('3 h')
    expect(fmtMinutes(135, true)).toBe('2시간 15분')
  })
  it('works out won from minutes at the rate', () => {
    expect(wonFor(135, 10320)).toBe(23220)
    expect(wonFor(60, 10320)).toBe(10320)
    expect(fmtWon(23220)).toBe('23,220 won')
    expect(fmtWon(23220, true)).toBe('23,220원')
  })
  it('writes the rate into the policy text', () => {
    expect(policyText('pay of {rate} won per hour', 10320)).toBe('pay of 10,320 won per hour')
    expect(policyText(DEFAULT_OVERTIME_SETTINGS.policyKo, 10320)).toContain('10,320원')
  })
})

describe('days that are not overtime', () => {
  const events = [
    { type: 'day_off', title: 'Chuseok', date: '2026-09-24', end_date: '2026-09-26', target_grades: null },
    { type: 'day_off', title: 'Grade 5 trip day', date: '2026-11-04', end_date: null, target_grades: [5] },
    { type: 'meeting', title: 'Staff meeting', date: '2026-11-05', end_date: null, target_grades: null },
    { type: 'day_off', title: 'Foundation day', date: '2026-11-06', end_date: null, target_grades: [] },
  ]
  it('expands whole-school days off only', () => {
    expect(daysOffIn(events, '2026-09-01', '2026-11-30')).toEqual({ '2026-09-24': 'Chuseok', '2026-09-25': 'Chuseok', '2026-09-26': 'Chuseok', '2026-11-06': 'Foundation day' })
    expect(daysOffIn(events, '2026-09-25', '2026-09-25')).toEqual({ '2026-09-25': 'Chuseok' })
  })
  it('blocks weekends and days off', () => {
    const off = daysOffIn(events, '2026-11-01', '2026-11-30')
    expect(blockedReason('2026-11-07', off)).toEqual({ kind: 'weekend' })
    expect(blockedReason('2026-11-08', off)).toEqual({ kind: 'weekend' })
    expect(blockedReason('2026-11-06', off)).toEqual({ kind: 'dayoff', title: 'Foundation day' })
    expect(blockedReason('2026-11-04', off)).toBeNull()
  })
  it('leaves entries on blocked days out of what counts', () => {
    const off = { '2026-11-06': 'Foundation day' }
    const es = [entry({ date: '2026-11-05' }), entry({ date: '2026-11-06' }), entry({ date: '2026-11-07' })]
    expect(counted(es, off).map(e => e.date)).toEqual(['2026-11-05'])
  })
})

describe('overlapping', () => {
  const day = [entry({ id: 'a', start_time: '16:30', end_time: '18:00' })]
  it('finds a stint that runs into another the same day', () => {
    expect(overlapping({ date: '2026-11-03', start_time: '17:00', end_time: '19:00' }, day)?.id).toBe('a')
  })
  it('lets stints touch end to start', () => {
    expect(overlapping({ date: '2026-11-03', start_time: '18:00', end_time: '19:00' }, day)).toBeNull()
  })
  it('ignores the entry being edited and other days', () => {
    expect(overlapping({ id: 'a', date: '2026-11-03', start_time: '16:00', end_time: '18:30' }, day)).toBeNull()
    expect(overlapping({ date: '2026-11-04', start_time: '16:30', end_time: '18:00' }, day)).toBeNull()
  })
})

describe('weeks', () => {
  it('cuts November 2026 into Monday-to-Friday weeks inside the month', () => {
    expect(weeksOfMonth('2026-11')).toEqual([
      { from: '2026-11-02', to: '2026-11-06' }, { from: '2026-11-09', to: '2026-11-13' }, { from: '2026-11-16', to: '2026-11-20' },
      { from: '2026-11-23', to: '2026-11-27' }, { from: '2026-11-30', to: '2026-11-30' },
    ])
  })
  it('starts a month mid-week on its first weekday', () => {
    expect(weeksOfMonth('2026-12')[0]).toEqual({ from: '2026-12-01', to: '2026-12-04' })
  })
  it('labels weeks and months', () => {
    expect(weekLabel({ from: '2026-11-02', to: '2026-11-06' })).toBe('Nov 2 – 6')
    expect(weekLabel({ from: '2026-11-30', to: '2026-11-30' })).toBe('Nov 30')
    expect(weekLabel({ from: '2026-11-02', to: '2026-11-06' }, true)).toBe('11월 2일 – 6일')
    expect(monthLabel('2026-11')).toBe('November 2026')
    expect(fmtDayDate('2026-11-03')).toBe('Tue, Nov 3')
    expect(fmtDayDate('2026-11-03', true)).toBe('11월 3일 (화)')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('names the ticked weeks for the sheet', () => {
    const w = weeksOfMonth('2026-11')
    expect(selectionLabel(w)).toBe('November 2026')
    expect(selectionLabel([w[0], w[1]])).toBe('Nov 2 – 13, 2026')
    expect(selectionLabel([w[3], w[0], w[1]])).toBe('Nov 2 – 13, Nov 23 – 27, 2026')
    expect(selectionLabel([w[1]], true)).toBe('2026년 11월 9일 – 13일')
  })
  it('joins weeks from different months into one run', () => {
    const nov = weeksOfMonth('2026-11'), dec = weeksOfMonth('2026-12')
    expect(selectionLabel([nov[3], nov[4], dec[0]])).toBe('Nov 23 – Dec 4, 2026')
    expect(selectionLabel([...nov, dec[0]])).toBe('Nov 2 – Dec 4, 2026')
    expect(selectionLabel([nov[1], dec[1]])).toBe('Nov 9 – 13, Dec 7 – 11, 2026')
    const jan = weeksOfMonth('2027-01')
    expect(selectionLabel([dec[dec.length - 1], jan[0]])).toBe('Dec 28, 2026 – Jan 1, 2027')
  })
  it('takes a date range typed by hand', () => {
    const r = rangeSpan('2026-10-01', '2026-11-07')
    expect(r).toEqual({ from: '2026-10-01', to: '2026-11-07' })
    expect(selectionLabel([r!])).toBe('Oct 1 – Nov 7, 2026')
    expect(selectionLabel([rangeSpan('2026-11-01', '2026-11-30')!])).toBe('November 2026')
    expect(selectionLabel([rangeSpan('2026-11-01', '2026-11-20')!])).toBe('Nov 1 – 20, 2026')
    expect(rangeSpan('2026-11-07', '2026-10-01')).toBeNull()
    expect(rangeSpan('', '2026-10-01')).toBeNull()
    const es = [entry({ date: '2026-09-30' }), entry({ date: '2026-10-01' }), entry({ date: '2026-11-07' }), entry({ date: '2026-11-09' })]
    expect(entriesInWeeks(es, [r!]).map(e => e.date)).toEqual(['2026-10-01', '2026-11-07'])
  })
  it('finds the next working day', () => {
    expect(nextWorkday('2026-11-27')).toBe('2026-11-30')
    expect(nextWorkday('2026-11-30')).toBe('2026-12-01')
  })
  it('keeps the entries in the ticked weeks', () => {
    const w = weeksOfMonth('2026-11')
    const es = [entry({ date: '2026-11-03' }), entry({ date: '2026-11-10' }), entry({ date: '2026-11-24' })]
    expect(entriesInWeeks(es, [w[0], w[3]]).map(e => e.date)).toEqual(['2026-11-03', '2026-11-24'])
  })
})

describe('quick picks', () => {
  it('works out this month, last month and the last two weeks', () => {
    expect(mondayOf('2026-11-10')).toBe('2026-11-09')
    expect(mondayOf('2026-11-15')).toBe('2026-11-09')
    expect(quickRanges('2026-11-10')).toEqual({
      thisMonth: { from: '2026-11-01', to: '2026-11-30' },
      lastMonth: { from: '2026-10-01', to: '2026-10-31' },
      twoWeeks: { from: '2026-11-02', to: '2026-11-13' },
    })
    expect(quickRanges('2026-01-06').lastMonth).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
  it('names a range that is a quick pick', () => {
    expect(pickFor('2026-10-01', '2026-10-31', '2026-11-10')).toBe('lastMonth')
    expect(pickFor('2026-10-01', '2026-11-07', '2026-11-10')).toBeNull()
  })
})

describe('totals and reasons', () => {
  it('adds minutes, then works out won once', () => {
    expect(totals([entry({ minutes: 135 }), entry({ minutes: 270 })], 10320)).toEqual({ minutes: 405, won: 69660, count: 2 })
  })
  it('lists recent distinct reasons, newest first', () => {
    const es = [
      entry({ date: '2026-11-02', reason: 'Report cards' }), entry({ date: '2026-11-05', reason: 'Open class prep' }),
      entry({ date: '2026-11-04', reason: 'report cards' }), entry({ date: '2026-11-03', reason: 'Parent meeting' }),
    ]
    expect(recentReasons(es)).toEqual(['Open class prep', 'report cards', 'Parent meeting'])
  })
})

describe('the printed sheet', () => {
  it('fills a short list to twelve rows', () => {
    const r = sheetRows([entry({ date: '2026-11-05' }), entry({ date: '2026-11-03' })])
    expect(r).toHaveLength(12)
    expect(r[0]?.entry.date).toBe('2026-11-03')
    expect(r[1]?.no).toBe(2)
    expect(r[2]).toBeNull()
  })
  it('gives a blank sheet when there is nothing', () => {
    expect(sheetRows([])).toEqual(Array(12).fill(null))
  })
  it('keeps every entry on the one page, however many', () => {
    const es = Array.from({ length: 25 }, (_, i) => entry({ date: `2026-11-${String(i + 1).padStart(2, '0')}` }))
    const r = sheetRows(es)
    expect(r).toHaveLength(25)
    expect(r[24]?.no).toBe(25)
  })
  it('prints full size up to twelve rows and shrinks only past that', () => {
    expect(sheetLayout(12)).toEqual({ rowMm: 9.5, cellPx: 17 })
    const l20 = sheetLayout(20)
    expect(l20.rowMm * 20).toBeLessThanOrEqual(114)
    expect(l20.cellPx).toBeLessThan(17)
    expect(l20.cellPx).toBeGreaterThan(12)
    expect(sheetLayout(40).rowMm * 40).toBeLessThanOrEqual(114)
  })
})

describe('parseOvertimeSettings', () => {
  it('fills defaults for anything missing or wrong', () => {
    expect(parseOvertimeSettings(null)).toEqual(DEFAULT_OVERTIME_SETTINGS)
    expect(parseOvertimeSettings('not json')).toEqual(DEFAULT_OVERTIME_SETTINGS)
    const s = parseOvertimeSettings(JSON.stringify({ rate: 11000, reasons: ['Report cards', '', 3] }))
    expect(s.rate).toBe(11000)
    expect(s.reasons).toEqual(['Report cards'])
    expect(s.policyEn).toBe(DEFAULT_OVERTIME_SETTINGS.policyEn)
  })
})
