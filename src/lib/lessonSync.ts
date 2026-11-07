import { splitUnitTitle, type CurriculumLesson, type CurriculumUnit } from '@/lib/curriculumCore'
import { addDays, columnToTeaching, type CurriculumPacing, type CurriculumPlacement, type Term, type YearWeeks } from '@/lib/curriculumPacing'

// ─── Lesson plans and the class board as one ─────────────────────
// Teachers plan in Lesson Plans; the board is those plans seen as weeks,
// plus an estimate of what comes next. A subject row in a day's plan can
// carry the unit (and lesson) it is about: picked from the units the board
// has running that week. The board then draws every unit that has such a
// day from the plans (it started the week its first day is in), and lays
// the rest out after it with their planned lengths. "Next week" fills a
// week from the one before, moving each linked row on to the next lesson
// or unit; "Push" slides the plans a class day when a trip or a sick day
// takes one. The pure parts are here so they can be tested.

// While this is tried out, only these classes have it: their teacher sees
// the new Lesson Plans tools on their own class, and their boards follow
// their plans. Every other class works as before. To turn it on for
// everyone, list every class here (or return true from both checks).
export const LESSON_SYNC_CLASSES: string[] = ['Snapdragon']
/** The Lesson Plans tools show for this viewer on this class. */
export const lessonSyncFor = (viewerClass: string | null | undefined, cls: string) => !!viewerClass && LESSON_SYNC_CLASSES.includes(viewerClass) && LESSON_SYNC_CLASSES.includes(cls)
/** This class's board is drawn from its lesson plans. */
export const followsPlans = (cls: string) => LESSON_SYNC_CLASSES.includes(cls)

export interface SubjectRow { label: string; content: string; unit_id?: string; lesson_id?: string; placement_id?: string }
export interface PlanDay { subjects: SubjectRow[]; objective: string; notes: string }
export interface LinkedDay { date: string; unit_id: string; lesson_id: string | null; placement_id: string | null }

const str = (v: unknown) => typeof v === 'string' && v ? v : undefined

/** A parent_calendar content value as a day, keeping each row's unit and lesson links. */
export function readPlanDay(raw: unknown): PlanDay {
  try {
    const c: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!c || typeof c !== 'object') return { subjects: [], objective: '', notes: '' }
    const subjects: SubjectRow[] = Array.isArray(c.subjects) ? c.subjects.filter((s: any) => s && typeof s === 'object').map((s: any) => {
      const row: SubjectRow = { label: String(s.label || ''), content: String(s.content || '') }
      if (str(s.unit_id)) row.unit_id = s.unit_id
      if (str(s.lesson_id)) row.lesson_id = s.lesson_id
      if (str(s.placement_id)) row.placement_id = s.placement_id
      return row
    }) : []
    return { subjects, objective: String(c.objective || ''), notes: String(c.notes || '') }
  } catch { return { subjects: [], objective: '', notes: '' } }
}

export const isEmptyDay = (d: PlanDay | undefined | null) => !d || (!d.objective.trim() && !d.notes.trim() && d.subjects.every(s => !s.content.trim()))

/** Every linked subject row in some days, one entry per row. */
export function linkedDays(days: Record<string, PlanDay>): LinkedDay[] {
  const out: LinkedDay[] = []
  for (const [date, d] of Object.entries(days)) for (const s of d.subjects) if (s.unit_id && s.content.trim()) out.push({ date, unit_id: s.unit_id, lesson_id: s.lesson_id || null, placement_id: s.placement_id || null })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ─── The board follows the plans ─────────────────────────────────

/**
 * A date as a teaching week of a placement: its week in the half, less the
 * holiday weeks before it (a holiday week counts as the teaching week after
 * it), with the spring's teaching weeks added for a whole-year placement in
 * the fall. Null when the date is in neither half or outside the placement's term.
 */
export function teachingWeekOf(date: string, term: Term, yw: YearWeeks, holSpring: Set<number>, holFall: Set<number>): number | null {
  for (const half of ['spring', 'fall'] as const) {
    const w = yw[half].find(x => date >= x.monday && date <= addDays(x.monday, 6))
    if (!w) continue
    if (term !== 'year' && term !== half) return null
    const t = columnToTeaching(w.n, half === 'spring' ? holSpring : holFall)
    return term === 'year' && half === 'fall' ? t + yw.spring.length - holSpring.size : t
  }
  return null
}

export interface Actual { first: number; last: number }

/** For each unit with a linked day: the teaching week of its first and last day. */
export function actualsFor(linked: LinkedDay[], unitIds: Set<string>, weekOf: (date: string) => number | null): Map<string, Actual> {
  const m = new Map<string, Actual>()
  for (const l of linked) {
    if (!unitIds.has(l.unit_id)) continue
    const w = weekOf(l.date)
    if (w === null) continue
    const a = m.get(l.unit_id)
    if (!a) m.set(l.unit_id, { first: w, last: w })
    else { a.first = Math.min(a.first, w); a.last = Math.max(a.last, w) }
  }
  return m
}

/**
 * Lays a plan out from what the lesson plans say. Units with linked days are
 * drawn from them, in the order they were started: each runs from the week of
 * its first day to the week before the next one starts, and the latest runs at
 * least its planned length. Units before them that the plans never named keep
 * their lengths, squeezed (gaps first, latest first) to end before the first
 * named one. Units after, and any skipped so far, follow with their planned
 * lengths and gaps. `rows` already carry their weeks (after sharing the term).
 * Returns copies for drawing; nothing is written.
 */
export function followPlans(rows: CurriculumPacing[], actual: Map<string, Actual>): CurriculumPacing[] {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const started = sorted.filter(r => actual.has(r.unit_id)).sort((a, b) => actual.get(a.unit_id)!.first - actual.get(b.unit_id)!.first || a.sort_order - b.sort_order)
  if (!started.length) return rows
  const minSo = Math.min(...started.map(r => r.sort_order))
  const W = (r: CurriculumPacing) => Math.max(0.5, Number(r.weeks) || 0)
  const G = (r: CurriculumPacing) => Math.max(0, Number(r.gap_before) || 0)
  const total = (rs: CurriculumPacing[]) => rs.reduce((a, r) => a + W(r) + G(r), 0)
  // Before: units the plans never named, ahead of the first named one. They are
  // squeezed into the weeks before it (gaps first, then weeks, latest first,
  // never under half a week). If even that does not fit, the latest of them
  // have not been taught as far as the plans say, so they move after the
  // units being taught instead of pushing those late.
  const room = Math.max(0, actual.get(started[0].unit_id)!.first - 1)
  const squeeze = (rs: CurriculumPacing[]) => {
    const out = rs.map(r => ({ ...r }))
    let over = total(out) - room
    for (let i = out.length - 1; i >= 0 && over > 1e-9; i--) { const take = Math.min(G(out[i]), over); out[i].gap_before = G(out[i]) - take; over -= take }
    for (let i = out.length - 1; i >= 0 && over > 1e-9; i--) { const take = Math.min(W(out[i]) - 0.5, over); out[i].weeks = W(out[i]) - take; over -= take }
    return { out, over }
  }
  let pre = sorted.filter(r => !actual.has(r.unit_id) && r.sort_order < minSo)
  const pushedOut: CurriculumPacing[] = []
  let sq = squeeze(pre)
  while (sq.over > 1e-9 && pre.length) { pushedOut.unshift(pre[pre.length - 1]); pre = pre.slice(0, -1); sq = squeeze(pre) }
  const before = sq.out
  const after = [...pushedOut, ...sorted.filter(r => !actual.has(r.unit_id) && r.sort_order > minSo)].map(r => ({ ...r }))
  // Named units: each starts in the week of its first day and runs to the week
  // before the next named one starts; the latest runs at least its planned
  // length. Two starting the same week share it, without pushing later units.
  let cursor = total(before)
  const mid = started.map((r, k) => {
    const a = actual.get(r.unit_id)!
    const next = started[k + 1] ? actual.get(started[k + 1].unit_id)! : null
    const gap = Math.max(0, a.first - 1 - cursor)
    const left = cursor + gap
    const targetEnd = next ? next.first - 1 : Math.max(a.first - 1 + W(r), a.last)
    const weeks = Math.max(0.5, targetEnd - left)
    cursor = left + weeks
    // Done once a later unit has started and this one is not named again from then on.
    const done = !!next && next.first > a.last
    return { ...r, gap_before: gap, weeks, done_at: done ? (r.done_at || 'lesson-plans') : r.done_at }
  })
  return [...before, ...mid, ...after].map((r, i) => ({ ...r, sort_order: i + 1, fixed: true }))
}

/** The callback the board hands to boardLanes: a placement's rows drawn from the linked days. */
export function planFollower(linked: LinkedDay[], yw: YearWeeks, holSpring: Set<number>, holFall: Set<number>) {
  return (pl: CurriculumPlacement, rows: CurriculumPacing[]) => {
    if (!linked.length) return rows
    const mine = linked.filter(l => !l.placement_id || l.placement_id === pl.id)
    const actual = actualsFor(mine, new Set(rows.map(r => r.unit_id)), d => teachingWeekOf(d, pl.term, yw, holSpring, holFall))
    return actual.size ? followPlans(rows, actual) : rows
  }
}

// ─── Next week from the board ────────────────────────────────────

/** A unit the board has running in a week, as the Lesson Plans page shows it. */
export interface RunningUnit { placement_id: string; unit_id: string; label: string; name: string; level: string; color: string; weekOf: number; weeks: number }

export interface NextWeekInput {
  source: (PlanDay | null)[]                      // last week, Monday to Friday
  running: RunningUnit[]                          // this week's units on the board
  unitOrder: Map<string, string[]>                // placement → its unit ids in plan order
  units: Pick<CurriculumUnit, 'id' | 'title'>[]
  lessons: Pick<CurriculumLesson, 'id' | 'unit_id' | 'title' | 'objective' | 'sort_order'>[]
  skip?: boolean[]                                // this week's days that will not be written
}

/**
 * Last week's days moved on a week: rows with no link are copied as they are;
 * a linked row stays on its unit if the board still has it running this week,
 * else takes the unit the board has running for that book. A row that named a
 * lesson takes the next lesson of its unit, and the first lesson of the next
 * unit once the unit's lessons run out. Only subjects and titles come over:
 * when a lesson moved on, last week's objective no longer fits, so it is left
 * empty for the new lesson's suggestion. Days with nothing last week stay null.
 */
export function nextWeekDays({ source, running, unitOrder, units, lessons, skip }: NextWeekInput): (PlanDay | null)[] {
  const lessonsOf = (u: string) => lessons.filter(l => l.unit_id === u).sort((a, b) => a.sort_order - b.sort_order)
  const nameOf = (u: string) => { const t = units.find(x => x.id === u)?.title; return t ? splitUnitTitle(t).name : '' }
  const cursor = new Map<string, number>()
  for (const d of source) for (const s of d?.subjects || []) if (s.unit_id && s.lesson_id) { const i = lessonsOf(s.unit_id).findIndex(l => l.id === s.lesson_id); if (i >= 0) cursor.set(s.unit_id, Math.max(cursor.get(s.unit_id) ?? -1, i)) }
  /** The unit after `unit` for this book: the one the board has running if it is later, else the next in the plan. */
  const nextUnit = (placementId: string | undefined, unit: string) => {
    const order = placementId ? unitOrder.get(placementId) || [] : []
    const here = order.indexOf(unit)
    const onBoard = running.filter(r => r.placement_id === placementId).map(r => r.unit_id).find(u => order.indexOf(u) > here)
    return onBoard || order[here + 1] || null
  }
  return source.map((d, day) => {
    // A day this week that will not be written (off, no class, already planned) takes nothing, so no lesson is used up on it.
    if (!d || isEmptyDay(d) || skip?.[day]) return null
    let movedOn = false
    const subjects = d.subjects.filter(s => s.label.trim() || s.content.trim()).map(s => {
      if (!s.unit_id) return { ...s }
      if (!s.lesson_id) {
        // A unit-only row follows the board: the unit it has running for this book now.
        const mine = running.filter(r => r.placement_id === s.placement_id)
        const unit = mine.some(r => r.unit_id === s.unit_id) ? s.unit_id : (mine[0]?.unit_id || s.unit_id)
        if (unit === s.unit_id || !nameOf(unit)) return { ...s }
        movedOn = true
        return { ...s, unit_id: unit, content: nameOf(unit) }
      }
      // A lesson row stays on its unit while the unit has lessons left, whatever the board's estimate says.
      let unit = s.unit_id
      let idx = (cursor.get(unit) ?? -1) + 1
      if (idx >= lessonsOf(unit).length) {
        const after = nextUnit(s.placement_id, unit)
        if (!after) return { ...s }                    // the book is finished: keep the row as it was
        unit = after; idx = (cursor.get(unit) ?? -1) + 1
      }
      const lesson = lessonsOf(unit)[idx]
      if (!lesson || !nameOf(unit)) return { ...s }    // nothing known to move on to: never blank the row
      cursor.set(unit, idx)
      movedOn = true
      return { ...s, unit_id: unit, lesson_id: lesson.id, content: `${nameOf(unit)}: ${lesson.title}` }
    })
    return { subjects, objective: movedOn ? '' : d.objective, notes: d.notes }
  })
}

// ─── Push and pull ───────────────────────────────────────────────

/**
 * Slides plans along a timeline of class days. `timeline[0]` is the day pushed
 * from (it may be a day off that still holds a plan); the rest are the class
 * days after it. Pushing moves every day's plan one class day later, up to the
 * last planned day, and empties the first. Pulling moves every plan after the
 * first day one class day earlier into it; the first day must be empty.
 * Returns only the days that change, with an empty day where a plan left.
 */
export function pushPlan(timeline: string[], days: Record<string, PlanDay>, dir: 1 | -1): { changes: Record<string, PlanDay>; moved: number; error: string | null } {
  const empty = (): PlanDay => ({ subjects: [], objective: '', notes: '' })
  let last = -1
  timeline.forEach((d, i) => { if (!isEmptyDay(days[d])) last = i })
  const changes: Record<string, PlanDay> = {}
  if (dir === 1) {
    if (last < 0) return { changes, moved: 0, error: 'Nothing planned from this day on.' }
    if (last + 1 >= timeline.length) return { changes, moved: 0, error: 'No class day left to push into.' }
    for (let i = last; i >= 0; i--) changes[timeline[i + 1]] = days[timeline[i]] ? clone(days[timeline[i]]) : empty()
    changes[timeline[0]] = empty()
    const moved = timeline.slice(0, last + 1).filter(d => !isEmptyDay(days[d])).length
    return { changes: real(changes, days), moved, error: null }
  }
  if (!isEmptyDay(days[timeline[0]])) return { changes, moved: 0, error: 'This day has a plan. Pull back into an empty day.' }
  if (last < 1) return { changes, moved: 0, error: 'Nothing planned after this day.' }
  for (let i = 0; i < last; i++) changes[timeline[i]] = days[timeline[i + 1]] ? clone(days[timeline[i + 1]]) : empty()
  changes[timeline[last]] = empty()
  const moved = timeline.slice(1, last + 1).filter(d => !isEmptyDay(days[d])).length
  return { changes: real(changes, days), moved, error: null }
}
/** Drops the days that were empty and stay empty, so no blank rows are written for them. */
const real = (changes: Record<string, PlanDay>, days: Record<string, PlanDay>) => Object.fromEntries(Object.entries(changes).filter(([d, c]) => !(isEmptyDay(c) && isEmptyDay(days[d]))))
const clone = (d: PlanDay): PlanDay => ({ subjects: d.subjects.map(s => ({ ...s })), objective: d.objective, notes: d.notes })

/** The class days from `from` (always first, even when it is away) to `to`: weekdays the grade has class that are not away days. */
export function classDays(from: string, to: string, away: Set<string>, noClass: (weekday: number) => boolean): string[] {
  const out = [from]
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) {
    const wd = new Date(d + 'T12:00:00Z').getUTCDay()
    if (wd === 0 || wd === 6 || noClass(wd) || away.has(d)) continue
    out.push(d)
  }
  return out
}
