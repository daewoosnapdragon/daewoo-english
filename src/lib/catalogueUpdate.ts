// ─── Update the books: matching and preview ────────────────────────────
// The catalogue (src/data/catalogue.json, built from scripts/catalogue/books)
// holds each book as the publisher's materials give it. Updating a book swaps
// its units for these: each old unit is matched to a new one (by the new
// unit's `replaces` list, then by title, then by "Unit N" / "School Link N"),
// and the database moves every class row, done tick, file and lesson-plan link
// to the match. This file works out the matches and what the page shows
// before anything changes; curriculumUpdateData.ts calls the database.
// Design: docs/superpowers/specs/2026-11-28-book-rebuild-design.md

export interface CatalogueUnit {
  title: string; summary?: string; default_weeks?: number; ccss?: string[]; skill_tags?: string[]
  replaces?: string[]
  lessons: { title: string; notes?: string }[]
  objectives: { text: string; ccss: string[]; wida: string[] }[]
}
export interface CatalogueBook {
  series: string; level: string; title?: string; strand?: string; color?: string; kind?: string
  source: string; absorbs?: string[]; units: CatalogueUnit[]
}
export interface CatalogueEntry { key: string; version: string; book: CatalogueBook }

/** What the page reads from the database to plan an update. */
export interface UpdateDb {
  series: { id: string; name: string }[]
  books: { id: string; series_id: string; level_number: string; catalogue_version?: string | null; status?: string }[]
  units: { id: string; book_id: string; title: string }[]
  placements: { id: string; book_id: string; english_class: string; grade: number; academic_year: string; term: string; is_master: boolean }[]
  pacing: { placement_id: string; unit_id: string; owner: string }[]
  resources: { unit_id: string | null; lesson_id: string | null }[]
  lessons: { id: string; unit_id: string }[]
}

export interface Unmatched { unitId: string; title: string; classes: string[]; files: number }
export interface BookPlan {
  key: string; status: 'new' | 'up-to-date' | 'replace'
  bookId?: string; absorbIds: string[]
  pairs: { old: string; new_index: number }[]
  unmatched: Unmatched[]
  classes: string[]
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** "Unit 3 · Pack and Go" → "unit 3"; "School Link 2 · …" → "school link 2"; anything else → null. */
export function unitKey(title: string): string | null {
  const m = /^\s*(unit|school link|review)\s+(\d+)\b/i.exec(title)
  return m ? `${m[1].toLowerCase()} ${Number(m[2])}` : null
}

/**
 * Pairs old units with new ones. A new unit's `replaces` list wins and may take
 * several old units; otherwise each new unit takes at most one old unit, by
 * title first, then by unit number. Pairs come back in new-unit order.
 */
export function matchUnits(old: { id: string; title: string }[], next: { title: string; replaces?: string[] }[], first?: Set<string>): { pairs: { old: string; new_index: number }[]; unmatched: string[] } {
  const pairs: { old: string; new_index: number }[] = []
  const left = new Map(old.map(o => [o.id, o]))
  const taken = new Set<number>()
  const byReplace = new Map<string, number>()
  next.forEach((n, i) => (n.replaces || []).forEach(r => byReplace.set(r, i)))
  for (const o of old) {
    const i = byReplace.get(o.title)
    if (i !== undefined) { pairs.push({ old: o.id, new_index: i }); left.delete(o.id); taken.add(i) }
  }
  const pass = (key: (t: string) => string | null, group: (id: string) => boolean) => {
    const index = new Map<string, number>()
    next.forEach((n, i) => { const k = key(n.title); if (k && !taken.has(i) && !index.has(k)) index.set(k, i) })
    for (const o of Array.from(left.values())) {
      if (!group(o.id)) continue
      const k = key(o.title); const i = k ? index.get(k) : undefined
      if (i === undefined || taken.has(i)) continue
      pairs.push({ old: o.id, new_index: i }); left.delete(o.id); taken.add(i)
    }
  }
  // Units in `first` (the ones classes use) go through every rule before the rest get a turn.
  const groups: ((id: string) => boolean)[] = first ? [id => first.has(id), id => !first.has(id)] : [() => true]
  for (const g of groups) { pass(t => norm(t) || null, g); pass(unitKey, g) }
  pairs.sort((a, b) => a.new_index - b.new_index || old.findIndex(o => o.id === a.old) - old.findIndex(o => o.id === b.old))
  return { pairs, unmatched: Array.from(left.keys()) }
}

const classLabel = (p: UpdateDb['placements'][number]) => `${p.english_class} G${p.grade} · ${p.academic_year} ${p.term}`
const uniq = (a: string[]) => Array.from(new Set(a))

function classesOn(db: UpdateDb, bookIds: string[]): string[] {
  return uniq(db.placements.filter(p => bookIds.includes(p.book_id)).sort((a, b) => a.english_class.localeCompare(b.english_class) || a.grade - b.grade).map(classLabel))
}

function unmatchedOf(db: UpdateDb, ids: string[]): Unmatched[] {
  return ids.map(id => {
    const u = db.units.find(x => x.id === id)!
    const placements = uniq(db.pacing.filter(r => r.unit_id === id && r.owner === 'master').map(r => r.placement_id))
    const lessonIds = new Set(db.lessons.filter(l => l.unit_id === id).map(l => l.id))
    return {
      unitId: id, title: u.title,
      classes: db.placements.filter(p => placements.includes(p.id)).map(classLabel),
      files: db.resources.filter(r => r.unit_id === id || (r.lesson_id && lessonIds.has(r.lesson_id))).length,
    }
  })
}

/** What updating one book would do. */
export function planBook(entry: CatalogueEntry, db: UpdateDb): BookPlan {
  const { book } = entry
  const empty: BookPlan = { key: entry.key, status: 'new', absorbIds: [], pairs: [], unmatched: [], classes: [] }
  const series = db.series.find(s => s.name.toLowerCase() === book.series.toLowerCase())
  if (!series) return empty
  const inSeries = db.books.filter(b => b.series_id === series.id)
  const target = inSeries.find(b => b.level_number.toLowerCase() === book.level.toLowerCase())
  const absorbIds = inSeries.filter(b => b !== target && (book.absorbs || []).some(l => l.toLowerCase() === b.level_number.toLowerCase())).map(b => b.id)
  if (!target && !absorbIds.length) return empty
  const ids = [target?.id, ...absorbIds].filter((x): x is string => !!x)
  if (target && (target.catalogue_version || '') === entry.version && !absorbIds.length) return { ...empty, status: 'up-to-date', bookId: target.id, classes: classesOn(db, ids) }
  // Units a class has in its plan are matched first, so when Starter and the absorbed "S" both have a Unit 5,
  // the one classes use is the one that moves; the unused twin is simply removed.
  const used = new Set(db.pacing.map(r => r.unit_id))
  const old = ids.flatMap(id => db.units.filter(u => u.book_id === id))
  const m = matchUnits(old, book.units, used)
  return { key: entry.key, status: 'replace', bookId: target?.id, absorbIds, pairs: m.pairs, unmatched: unmatchedOf(db, m.unmatched), classes: classesOn(db, ids) }
}

export interface SplitPlan { oldBookId: string; ready: boolean; pairs: { old: string; new: string }[]; unmatched: Unmatched[]; classes: string[] }

/**
 * Moving classes off a series' old single book (level "") onto its level books,
 * through the level units' `replaces` lists. Ready once every level book is
 * loaded at its catalogue version. Null when no old book is left in use.
 */
export function planSplit(seriesName: string, levels: CatalogueEntry[], db: UpdateDb): SplitPlan | null {
  const series = db.series.find(s => s.name.toLowerCase() === seriesName.toLowerCase())
  if (!series) return null
  const old = db.books.find(b => b.series_id === series.id && b.level_number === '' && b.status !== 'retired')
  if (!old) return null
  const levelBooks = levels.map(e => ({ e, b: db.books.find(b => b.series_id === series.id && b.level_number.toLowerCase() === e.book.level.toLowerCase()) }))
  const ready = levelBooks.every(x => x.b && (x.b.catalogue_version || '') === x.e.version)
  const target = new Map<string, string>()   // old title → new unit id
  for (const { e, b } of levelBooks) {
    if (!b) continue
    for (const u of e.book.units) {
      const nu = db.units.find(x => x.book_id === b.id && x.title === u.title)
      if (nu) for (const r of u.replaces || []) target.set(r, nu.id)
    }
  }
  const oldUnits = db.units.filter(u => u.book_id === old.id)
  const pairs = oldUnits.filter(u => target.has(u.title)).map(u => ({ old: u.id, new: target.get(u.title)! }))
  return { oldBookId: old.id, ready, pairs, unmatched: unmatchedOf(db, oldUnits.filter(u => !target.has(u.title)).map(u => u.id)), classes: classesOn(db, [old.id]) }
}
