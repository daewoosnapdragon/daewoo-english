import type { CurriculumLesson, CurriculumUnit } from '@/lib/curriculumCore'
import { splitUnitTitle } from '@/lib/curriculumCore'
import type { Lane } from '@/lib/curriculumPacing'

// ─── The program map ─────────────────────────────────────────────
// Every class and grade on one page for a term: a row each, the books as
// thin strips, the units as segments. The point is what the rows have in
// common. At a chosen week, two rows that are on the same unit of the same
// book can plan together; two rows whose units carry the same skill tag
// (long a in Super Phonics 2 and in Super Phonics 1) can pool materials;
// and a row that reaches a unit another row finished earlier can borrow
// what that teacher already made. The pure parts are here.

export type MapBar = Lane['bars'][number]
export interface MapRow { key: string; cls: string; grade: number; teacherId: string | null; bars: MapBar[] }

/** The bars of a row that cover a week column. */
export const barsAtWeek = (row: MapRow, weekN: number) => row.bars.filter(b => b.viewStart <= weekN + 0.999 && b.viewEnd >= weekN - 0.001)

export interface OverlapMember { row: MapRow; bar: MapBar }
export interface Overlap { kind: 'unit' | 'skill'; key: string; label: string; detail: string; members: OverlapMember[] }

/** Skill tags of a unit and its lessons, once each. */
export function unitTags(unit: CurriculumUnit, lessons: CurriculumLesson[]): string[] {
  const out = new Set<string>(unit.skill_tags)
  lessons.filter(l => l.unit_id === unit.id).forEach(l => l.skill_tags.forEach(t => out.add(t)))
  out.delete('vocabulary in context'); out.delete('sight words'); out.delete('fluency')   // on nearly everything, so they say nothing
  return Array.from(out)
}

/**
 * What two or more rows share in a week: the same unit (same book, same
 * story or pattern), or a skill tag carried by units from different books.
 * A unit overlap is not also reported as a skill overlap for the same rows.
 */
export function overlapsAt(rows: MapRow[], weekN: number, lessons: CurriculumLesson[]): Overlap[] {
  const out: Overlap[] = []
  const members: OverlapMember[] = rows.flatMap(row => barsAtWeek(row, weekN).map(bar => ({ row, bar })))
  // same unit
  const byUnit = new Map<string, OverlapMember[]>()
  for (const m of members) { const k = m.bar.unit.id; if (!byUnit.has(k)) byUnit.set(k, []); byUnit.get(k)!.push(m) }
  const covered = new Set<string>()   // row keys already in a unit overlap, per tag
  for (const ms of Array.from(byUnit.values())) {
    const distinct = Array.from(new Set(ms.map(m => m.row.key)))
    if (distinct.length < 2) continue
    const b = ms[0].bar
    out.push({ kind: 'unit', key: 'u:' + b.unit.id, label: `${b.series?.name || ''} ${b.book.level_number}`.trim() + ' · ' + splitUnitTitle(b.unit.title).name, detail: 'Same book, same unit, the same week. One set of slides, one printing run.', members: ms })
    unitTags(b.unit, lessons).forEach(t => distinct.forEach(k => covered.add(t + '|' + k)))
  }
  // same skill, different units
  const byTag = new Map<string, OverlapMember[]>()
  for (const m of members) for (const t of unitTags(m.bar.unit, lessons)) { if (!byTag.has(t)) byTag.set(t, []); byTag.get(t)!.push(m) }
  for (const [tag, ms] of Array.from(byTag.entries())) {
    const fresh = ms.filter(m => !covered.has(tag + '|' + m.row.key))
    const distinctRows = Array.from(new Set(fresh.map(m => m.row.key)))
    const distinctUnits = Array.from(new Set(fresh.map(m => m.bar.unit.id)))
    if (distinctRows.length < 2 || distinctUnits.length < 2) continue
    out.push({ kind: 'skill', key: 's:' + tag, label: tag, detail: 'Different books, the same skill this week. Pool the word sorts, readers and anchor charts.', members: fresh })
  }
  return out.sort((a, b) => a.kind === b.kind ? b.members.length - a.members.length : a.kind === 'unit' ? -1 : 1)
}

export interface Earlier { row: MapRow; bar: MapBar; weeksAgo: number }

/** Rows that had the same unit before this week, nearest first: their notes and files are ready. */
export function earlierOnUnit(rows: MapRow[], unitId: string, weekN: number, except: string): Earlier[] {
  const out: Earlier[] = []
  for (const row of rows) {
    if (row.key === except) continue
    for (const bar of row.bars) if (bar.unit.id === unitId && bar.viewEnd < weekN) out.push({ row, bar, weeksAgo: Math.round(weekN - bar.viewEnd) })
  }
  return out.sort((a, b) => a.weeksAgo - b.weeksAgo)
}

/** For every week, how many overlaps there are: the little marks on the week header. */
export function overlapCounts(rows: MapRow[], n: number, lessons: CurriculumLesson[]): number[] {
  const out: number[] = []
  for (let w = 1; w <= n; w++) out.push(overlapsAt(rows, w, lessons).length)
  return out
}

// ─── A week of the map, as a table, with plan-together notes ─────

const rowLabel = (r: MapRow) => `${r.cls} G${r.grade}`
const joinNames = (xs: string[]) => xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

export interface Together { tag: string; unitId: string; unitName: string; rows: MapRow[]; text: string }
export interface Ready { from: MapRow; to: MapRow; unitName: string; weeksAgo: number; text: string }
export interface BookNote { bookId: string; label: string; color: string; together: Together[]; ready: Ready[] }

/**
 * What a week's classes can do together, book by book: two or more classes on
 * the same unit this week ("plan together"), and a class starting or on a unit
 * another class has already finished ("their slides are ready"). Each
 * plan-together group gets a letter, A, B, C…, for the table's cells.
 */
export function planTogether(rows: MapRow[], weekN: number): { books: BookNote[]; tagOf: Map<string, string> } {
  const byBook = new Map<string, BookNote>()
  const note = (b: MapBar) => {
    if (!byBook.has(b.book.id)) byBook.set(b.book.id, { bookId: b.book.id, label: `${b.series?.name || b.book.title} ${b.book.level_number}`.trim(), color: b.color, together: [], ready: [] })
    return byBook.get(b.book.id)!
  }
  // Same unit, same week.
  const byUnit = new Map<string, { bar: MapBar; rows: MapRow[] }>()
  for (const r of rows) for (const b of barsAtWeek(r, weekN)) {
    if (!byUnit.has(b.unit.id)) byUnit.set(b.unit.id, { bar: b, rows: [] })
    const g = byUnit.get(b.unit.id)!
    if (!g.rows.some(x => x.key === r.key)) g.rows.push(r)
  }
  const tagOf = new Map<string, string>()
  const groups = Array.from(byUnit.values()).filter(g => g.rows.length > 1).sort((a, b) => b.rows.length - a.rows.length)
  groups.forEach((g, i) => {
    const tag = i < 26 ? String.fromCharCode(65 + i) : String(i + 1)
    tagOf.set(g.bar.unit.id, tag)
    const name = splitUnitTitle(g.bar.unit.title).name
    const names = g.rows.map(rowLabel)
    note(g.bar).together.push({ tag, unitId: g.bar.unit.id, unitName: name, rows: g.rows, text: `${joinNames(names)} are ${g.rows.length === 2 ? 'both' : 'all'} on ${name} this week.` })
  })
  // Finished earlier by someone else: the nearest one, once per class and unit.
  for (const r of rows) for (const b of barsAtWeek(r, weekN)) {
    const e = earlierOnUnit(rows, b.unit.id, Math.floor(b.viewStart), r.key)[0]
    if (!e) continue
    const name = splitUnitTitle(b.unit.title).name
    const ago = Math.max(1, Math.round(weekN - e.bar.viewEnd))
    note(b).ready.push({ from: e.row, to: r, unitName: name, weeksAgo: ago, text: `${rowLabel(e.row)} finished ${name} ${ago} ${ago === 1 ? 'week' : 'weeks'} ago, so their slides and notes are ready for ${rowLabel(r)}.` })
  }
  const books = Array.from(byBook.values()).sort((a, b) => (b.together.length * 10 + b.ready.length) - (a.together.length * 10 + a.ready.length) || a.label.localeCompare(b.label))
  return { books, tagOf }
}

/** Where a week falls in a bar: "week 2 of 3", counting teaching weeks only (holiday columns are skipped). */
export function weekOfBar(bar: { viewStart: number; viewEnd: number }, weekN: number, holidays: Set<number>): { at: number; of: number } {
  const from = Math.floor(bar.viewStart), to = Math.ceil(bar.viewEnd)
  let at = 0, of = 0
  for (let c = from; c <= to; c++) { if (holidays.has(c)) continue; of += 1; if (c <= weekN) at += 1 }
  return { at: Math.max(1, at), of: Math.max(1, of) }
}
