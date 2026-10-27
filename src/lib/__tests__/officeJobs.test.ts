import { describe, it, expect } from 'vitest'
import { cleaningDays, upcoming, fridayOf, parseOfficeJobs, DEFAULT_OFFICE_JOBS, type OfficeJobsConfig } from '@/lib/officeJobs'

// The Fall 2026 sheet: six people, start 28 Aug, the week of 30 Oct skipped,
// four Fridays off (so the jobs move to Thursday), everyone together on 8 Jan.
const people = ['Megan', 'Dineo', 'Taylor', 'Fola', 'Izzy', 'Kyla']
const cfg: OfficeJobsConfig = { jobs: DEFAULT_OFFICE_JOBS, people, start: '2026-08-28', skip: ['2026-10-30'], all: ['2027-01-08'] }
const away = { '2026-10-09': 'Hangul Day', '2026-10-16': 'Field trip', '2026-12-25': 'Christmas', '2027-01-01': 'New Year' }
const who = (d: ReturnType<typeof cleaningDays>[number], jobKey: string) => d.assignments.find(a => a.job.key === jobKey)?.personId

describe('cleaningDays', () => {
  const days = cleaningDays(cfg, '2027-01-08', away)
  it('reproduces the dates on the sheet', () => {
    expect(days.map(d => d.date)).toEqual([
      '2026-08-28', '2026-09-04', '2026-09-11', '2026-09-18', '2026-09-25', '2026-10-02', '2026-10-08', '2026-10-15', '2026-10-23',
      '2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11', '2026-12-18', '2026-12-24', '2026-12-31', '2027-01-08',
    ])
  })
  it('moves the jobs to Thursday when Friday is off, and says why', () => {
    const oct8 = days.find(d => d.date === '2026-10-08')!
    expect(oct8.moved).toBe(true)
    expect(oct8.friday).toBe('2026-10-09')
    expect(oct8.reason).toBe('Hangul Day')
  })
  it('rotates one job along per cleaning day and waits through skipped weeks', () => {
    const by = Object.fromEntries(days.map(d => [d.date, d]))
    expect(who(by['2026-08-28'], 'table')).toBe('Megan')
    expect(who(by['2026-09-04'], 'table')).toBe('Dineo')
    expect(who(by['2026-09-04'], 'recycling')).toBe('Megan')
    expect(who(by['2026-10-02'], 'table')).toBe('Kyla')
    expect(who(by['2026-10-08'], 'table')).toBe('Megan')
    expect(who(by['2026-10-23'], 'table')).toBe('Taylor')
    expect(who(by['2026-11-06'], 'table')).toBe('Fola')
    expect(who(by['2026-12-31'], 'recycling')).toBe('Izzy')
    expect(who(by['2026-12-31'], 'table')).toBe('Kyla')
  })
  it('marks an everyone day and does not advance the rotation on it', () => {
    const jan8 = days[days.length - 1]
    expect(jan8.everyone).toBe(true)
    expect(jan8.assignments).toEqual([])
    const after = cleaningDays(cfg, '2027-01-15', away)
    expect(who(after[after.length - 1], 'table')).toBe('Megan')
  })
  it('skips a week that is off from Monday to Friday without advancing', () => {
    const off = { '2026-09-07': 'Break', '2026-09-08': 'Break', '2026-09-09': 'Break', '2026-09-10': 'Break', '2026-09-11': 'Break' }
    const d = cleaningDays(cfg, '2026-09-18', off)
    expect(d.map(x => x.date)).toEqual(['2026-08-28', '2026-09-04', '2026-09-18'])
    expect(who(d[2], 'table')).toBe('Taylor')
  })
  it('does nothing without people or jobs', () => {
    expect(cleaningDays({ ...cfg, people: [] }, '2026-12-31')).toEqual([])
    expect(cleaningDays({ ...cfg, jobs: [] }, '2026-12-31')).toEqual([])
  })
})

describe('upcoming', () => {
  const days = cleaningDays(cfg, '2027-01-08', away)
  it('finds today, the next day and the one after', () => {
    const u = upcoming(days, '2026-10-08')
    expect(u.todays?.date).toBe('2026-10-08')
    expect(u.next?.date).toBe('2026-10-08')
    expect(u.following?.date).toBe('2026-10-15')
    expect(upcoming(days, '2026-10-24').next?.date).toBe('2026-11-06')
    expect(upcoming(days, '2027-02-01').next).toBeNull()
  })
})

describe('fridayOf and parseOfficeJobs', () => {
  it('finds the Friday on or after a date', () => {
    expect(fridayOf('2026-10-12')).toBe('2026-10-16')
    expect(fridayOf('2026-10-16')).toBe('2026-10-16')
    expect(fridayOf('2026-10-17')).toBe('2026-10-23')
  })
  it('reads saved settings and falls back to the defaults', () => {
    expect(parseOfficeJobs(null)).toBeNull()
    expect(parseOfficeJobs('not json')).toBeNull()
    const c = parseOfficeJobs(JSON.stringify({ people: ['a', 'b'], start: '2026-08-28', skip: 'nope' }))!
    expect(c.people).toEqual(['a', 'b'])
    expect(c.skip).toEqual([])
    expect(c.jobs).toHaveLength(6)
  })
})
