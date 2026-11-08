import { splitUnitTitle, type CurriculumLesson, type CurriculumUnit } from '@/lib/curriculumCore'
import { lessonSlots, type Recipe } from '@/lib/classSetup'
import type { PlanDay } from '@/lib/lessonSync'

// ─── The lesson tray ─────────────────────────────────────────────
// What Lesson Plans offers to drop onto days: for each book the class has on
// its board, the lessons not yet on a day, in the board's unit order, laid
// out by the class's recipe (a part over two days is two lessons, a skipped
// part none). A lesson leaves the tray when a day names it and comes back
// when it is taken off, so the tray is worked out from the plans every time.

export interface TrayBook { placement_id: string; book_id: string; series_id: string; label: string; level: string; color: string }
export interface TraySlot {
  key: string                      // lesson id, "#n" for a part on its second day; the unit id for a unit with no lessons
  unit_id: string; unitName: string
  lesson_id: string | null; title: string
  part: string                     // the part of the unit, for the recipe ("Grammar")
  kind: 'plain' | 'split' | 'join' // one lesson, a part over several days, or two lessons taught as one
  joined_id?: string               // for a join: the second lesson
  n: number; of: number
  tag: '' | 'this week' | 'carried over' | string
}
export interface TrayUnit { unit_id: string; name: string; slots: TraySlot[]; window: { first: string; last: string } | null }
export interface TrayLane { book: TrayBook; units: TrayUnit[]; left: number; due: number; skipped: { lesson_id: string; unit_id: string; unitName: string; title: string }[] }

/** How many days name each lesson, and each unit without a lesson. */
export function usedCounts(days: Record<string, PlanDay>): { lessons: Map<string, number>; unitOnly: Map<string, number> } {
  const lessons = new Map<string, number>(), unitOnly = new Map<string, number>()
  for (const d of Object.values(days)) for (const s of d.subjects || []) {
    if (s.lesson_id) lessons.set(s.lesson_id, (lessons.get(s.lesson_id) || 0) + 1)
    else if (s.unit_id) unitOnly.set(s.unit_id, (unitOnly.get(s.unit_id) || 0) + 1)
  }
  return { lessons, unitOnly }
}

/** The words a row gets for a lesson: "School Subjects — Grammar", "… (1 of 2)" for a part over two days. */
export const slotLine = (unitName: string, title: string | null, n: number, of: number) =>
  title ? `${unitName} — ${title}${of > 1 ? ` (${n} of ${of})` : ''}` : unitName

export interface TrayInput {
  books: TrayBook[]
  unitOrder: Map<string, string[]>
  units: Pick<CurriculumUnit, 'id' | 'title'>[]
  lessons: Pick<CurriculumLesson, 'id' | 'unit_id' | 'title' | 'sort_order'>[]
  recipes: Record<string, Recipe>                      // by series id
  used: ReturnType<typeof usedCounts>
  unitWeeks: Map<string, { first: string; last: string }>   // unit → the Mondays the board first and last has it
  focusMonday: string                                  // the week "this week" means
  moved?: Record<string, string>                       // slot key → "moved off Tue", for lessons taken off a day off
}

/** The tray, book by book: units with lessons left, each lesson tagged by where the board has its unit. */
export function trayLanes({ books, unitOrder, units, lessons, recipes, used, unitWeeks, focusMonday, moved = {} }: TrayInput): TrayLane[] {
  const byUnit = new Map<string, TrayInput['lessons']>()
  for (const l of lessons) { const a = byUnit.get(l.unit_id); if (a) a.push(l); else byUnit.set(l.unit_id, [l]) }
  return books.map(book => {
    const out: TrayUnit[] = []
    for (const unitId of unitOrder.get(book.placement_id) || []) {
      const u = units.find(x => x.id === unitId)
      if (!u) continue
      const name = splitUnitTitle(u.title).name
      const window = unitWeeks.get(unitId) || null
      const when: TraySlot['tag'] = !window ? '' : window.last < focusMonday ? 'carried over' : window.first <= focusMonday ? 'this week' : ''
      const ls = byUnit.get(unitId) || []
      // A unit over several weeks is due a share at a time: by the end of this week, its lessons times the
      // weeks gone over its weeks on the board. Only that many of the ones left are "this week".
      const share = (total: number, left: number) => {
        if (when !== 'this week' || !window) return left
        const span = weeksFrom(window.first, window.last) + 1, gone = weeksFrom(window.first, focusMonday) + 1
        return Math.max(0, Math.min(left, Math.ceil((total * gone) / span) - (total - left)))
      }
      let slots: TraySlot[]
      if (!ls.length) {
        slots = (used.unitOnly.get(unitId) || 0) > 0 ? [] : [{ key: unitId, unit_id: unitId, unitName: name, lesson_id: null, title: name, part: '', kind: 'plain', n: 1, of: 1, tag: moved[unitId] || (share(1, 1) ? when : '') }]
      } else {
        // A lesson named on k days has used its first k slots.
        const seen = new Map<string, number>()
        const all = lessonSlots(ls, recipes[book.series_id])
        slots = all.filter(s => {
          const k = (seen.get(s.lesson.id) || 0) + 1; seen.set(s.lesson.id, k)
          return k > (used.lessons.get(s.lesson.id) || 0)
        }).map(s => {
          const key = s.joined ? `${s.lesson.id}+${s.joined.id}` : s.n > 1 ? `${s.lesson.id}#${s.n}` : s.lesson.id
          const kind: TraySlot['kind'] = s.joined ? 'join' : s.of > 1 ? 'split' : 'plain'
          return { key, unit_id: unitId, unitName: name, lesson_id: s.lesson.id, title: s.joined ? `${s.lesson.title} + ${s.joined.title}` : s.lesson.title, part: s.part, kind, ...(s.joined ? { joined_id: s.joined.id } : {}), n: s.n, of: s.of, tag: moved[key] || moved[s.lesson.id] || when }
        })
        const dueNow = share(all.length, slots.length)
        slots.forEach((s, i) => { if (s.tag === 'this week' && i >= dueNow) s.tag = '' })
      }
      if (slots.length) out.push({ unit_id: unitId, name, slots, window })
    }
    // Moved and carried-over lessons first, then the board's order.
    const rank = (s: TraySlot) => (s.tag.startsWith('moved') ? 0 : s.tag === 'carried over' ? 1 : 2)
    out.sort((a, b) => Math.min(...a.slots.map(rank)) - Math.min(...b.slots.map(rank)))
    const all = out.flatMap(u => u.slots)
    const skips = new Set(recipes[book.series_id]?.skips || [])
    const skipped = (unitOrder.get(book.placement_id) || []).flatMap(unitId => (byUnit.get(unitId) || []).filter(l => skips.has(l.id)).map(l => ({ lesson_id: l.id, unit_id: unitId, unitName: splitUnitTitle(units.find(x => x.id === unitId)?.title || '').name, title: l.title })))
    return { book, units: out, left: all.length, due: all.filter(s => s.tag && s.tag !== '').length, skipped }
  })
}

/**
 * The days a whole unit goes on: from `from`, each later day that is a class
 * day, one of the book's usual weekdays (every weekday when it has none) and
 * not already holding this book, until there are `count` or `last` is passed.
 */
export function spreadDates({ from, count, usual, isClassDay, hasBook, last }: {
  from: string; count: number; usual: number[] | null | undefined
  isClassDay: (date: string) => boolean; hasBook: (date: string) => boolean; last: string
}): string[] {
  const out: string[] = []
  const days = usual && usual.length ? usual : [0, 1, 2, 3, 4]
  for (let d = from; d <= last && out.length < count; d = addDay(d)) {
    const wd = (new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7   // 0 = Monday
    if (wd > 4 || !days.includes(wd) || !isClassDay(d) || hasBook(d)) continue
    out.push(d)
  }
  return out
}

/**
 * "Next from the board": a week filled from the tray. Each book with `pattern`
 * days (its usual days, else the days it had last week, else every day) gets,
 * on each of those days that will be written, the next lesson from its lane:
 * moved and carried-over lessons first, then the board's order. Lessons
 * already on any day are not in the tray, so nothing repeats. A day with
 * nothing from any book stays null.
 */
export function fillWeek(lanes: TrayLane[], pattern: (lane: TrayLane) => number[], skip: boolean[]): (PlanDay | null)[] {
  const queues = lanes.map(l => ({ lane: l, days: pattern(l), slots: l.units.flatMap(u => u.slots) }))
  const out: (PlanDay | null)[] = []
  for (let day = 0; day < 5; day++) {
    if (skip[day]) { out.push(null); continue }
    const subjects: PlanDay['subjects'] = []
    for (const q of queues) {
      if (!q.days.includes(day)) continue
      const s = q.slots.shift()
      if (!s) continue
      subjects.push({ label: q.lane.book.label, content: slotLine(s.unitName, s.lesson_id ? s.title : null, s.n, s.of), unit_id: s.unit_id, placement_id: q.lane.book.placement_id, ...(s.lesson_id ? { lesson_id: s.lesson_id } : {}) })
    }
    out.push(subjects.length ? { subjects, objective: '', notes: '' } : null)
  }
  return out
}

/** How many of a book's usual days this week have it planned, and how many there are. */
export function weekPace({ monday, usual, isClassDay, hasBook }: { monday: string; usual: number[] | undefined; isClassDay: (date: string) => boolean; hasBook: (date: string) => boolean }): { planned: number; days: number } | null {
  if (!usual || !usual.length) return null
  let planned = 0, days = 0
  for (const wd of usual) {
    let d = monday; for (let i = 0; i < wd; i++) d = addDay(d)
    if (!isClassDay(d)) continue
    days++; if (hasBook(d)) planned++
  }
  return { planned, days }
}

/** Whole weeks from one Monday to another. */
const weeksFrom = (a: string, b: string) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / (7 * 86400000))

function addDay(d: string): string {
  const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + 1)
  return t.toISOString().slice(0, 10)
}
