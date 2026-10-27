// ─── Office jobs: the Friday cleaning rotation ───────────────────
// Six jobs, six people, and on every cleaning day each person moves one
// job along. The whole semester is three facts: the people in order, the
// jobs in order, and when it started. Cleaning day is Friday; when the
// calendar has the school off that Friday, the jobs move to the day before
// (and back again while the days before are off too). A week can be
// skipped, and a day can be everyone-together. Saved as one JSON row in
// app_settings under OFFICE_JOBS_KEY.

export interface OfficeJob { key: string; name: string; description: string }
export interface OfficeJobsConfig {
  jobs: OfficeJob[]
  /** Teacher ids in rotation order. */
  people: string[]
  /** The first cleaning day (its week's Friday). */
  start: string
  /** Fridays of weeks with no cleaning; the rotation waits. */
  skip: string[]
  /** Fridays of weeks when everyone cleans together; the rotation waits. */
  all: string[]
}

export const OFFICE_JOBS_KEY = 'office_jobs'

/** The jobs from the Fall 2026 sheet, in the order they rotate. */
export const DEFAULT_OFFICE_JOBS: OfficeJob[] = [
  { key: 'table', name: 'Table / Recycling', description: 'Clear the office table. Put all materials back in their place, if possible. Wipe down the table with glass cleaner. Check the plastic, can, and glass recycling bins. If they are more than halfway full, use a plastic bag to bag them up and take them down to the trash and recycling area.' },
  { key: 'mopping', name: 'Mopping', description: 'Use bleach water to mop the office. Mop under desks.' },
  { key: 'garden', name: 'Reading Garden', description: 'Clean up the Reading Garden. Put all materials back in their place, if possible. Use the vacuum cleaner to vacuum the floor. Do not mop the floor.' },
  { key: 'sink', name: 'Sink / Fridge', description: 'Wash all dishes and wipe down the sink area. Put all dry dishes back in the cupboard. Check the food in the refrigerator. If it is expired, dispose of it. Check the milk. If it will expire over the weekend, pour it down the drain, rinse out the box, and put it in the paper recycling.' },
  { key: 'trash', name: 'Trash', description: 'Wait for all teachers to bring out their classroom trash. Check the office trash to see if it has been brought out. Take the trash down to the trash and recycling area. If there is a lot of trash, other people who have finished their job should help take down the trash.' },
  { key: 'recycling', name: 'Recycling', description: 'Take the paper recycling from next to the printers into the hallway. Wait for all teachers to bring out their classroom paper recycling. Make sure only paper trash is in the bag. Take the recycling down to the trash and recycling area. If there is a lot of recycling, other people who have finished their job should help take down the trash.' },
]
export const DEFAULT_OFFICE_JOBS_CONFIG: OfficeJobsConfig = { jobs: DEFAULT_OFFICE_JOBS, people: [], start: '2026-08-28', skip: [], all: [] }

/** The saved JSON, tolerant of anything missing. */
export function parseOfficeJobs(raw: string | null | undefined): OfficeJobsConfig | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== 'object') return null
    const strs = (x: unknown) => Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string' && !!s) : []
    const jobs = Array.isArray(v.jobs) ? v.jobs.filter((j: any) => j && typeof j.name === 'string').map((j: any, i: number) => ({ key: String(j.key || `job${i + 1}`), name: String(j.name), description: String(j.description || '') })) : DEFAULT_OFFICE_JOBS
    return { jobs, people: strs(v.people), start: typeof v.start === 'string' ? v.start : DEFAULT_OFFICE_JOBS_CONFIG.start, skip: strs(v.skip), all: strs(v.all) }
  } catch { return null }
}

export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const weekdayOf = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()
/** The Friday on or after a date: the cleaning week a date belongs to. */
export const fridayOf = (iso: string) => addDays(iso, (5 - weekdayOf(iso) + 7) % 7)

export interface CleaningDay {
  /** The day the jobs are done. */
  date: string
  /** The Friday of that week. */
  friday: string
  /** True when the Friday was off and the jobs moved earlier. */
  moved: boolean
  /** Why the Friday was off. */
  reason?: string
  everyone: boolean
  /** Position in the rotation (the everyone days have none). */
  index: number
  assignments: { job: OfficeJob; personId: string }[]
}

/** Every cleaning day from the start through `through`. `away` maps a date off to its reason. */
export function cleaningDays(cfg: OfficeJobsConfig, through: string, away: Record<string, string> = {}): CleaningDay[] {
  const jobs = cfg.jobs.filter(j => j.name.trim())
  const people = cfg.people.filter(Boolean)
  if (!jobs.length || !people.length || !cfg.start) return []
  const skip = new Set(cfg.skip.map(fridayOf))
  const all = new Set(cfg.all.map(fridayOf))
  const out: CleaningDay[] = []
  let index = 0
  for (let f = fridayOf(cfg.start); addDays(f, -4) <= through; f = addDays(f, 7)) {
    if (skip.has(f)) continue
    // Friday, or the day before while the school is off.
    let d = f, steps = 0
    while (away[d] && steps < 4) { d = addDays(d, -1); steps++ }
    if (away[d]) continue // the whole week is off
    if (d > through) break
    const everyone = all.has(f)
    out.push({
      date: d, friday: f, moved: d !== f, reason: d !== f ? away[f] : undefined, everyone, index: everyone ? -1 : index,
      assignments: everyone ? [] : jobs.map((job, j) => ({ job, personId: people[(j + index) % people.length] })),
    })
    if (!everyone) index++
  }
  return out
}

/** Today's cleaning day if there is one, the next one, and the one after. */
export function upcoming(days: CleaningDay[], today: string): { todays: CleaningDay | null; next: CleaningDay | null; following: CleaningDay | null } {
  const i = days.findIndex(d => d.date >= today)
  if (i < 0) return { todays: null, next: null, following: null }
  const next = days[i]
  return { todays: next.date === today ? next : null, next, following: days[i + 1] || null }
}
