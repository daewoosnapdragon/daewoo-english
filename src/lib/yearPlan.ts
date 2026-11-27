import { splitUnitTitle, type CurriculumBook } from '@/lib/curriculumCore'
import { addDays, mondayOf, termDates, weekList, type CurriculumPlacement, type SemesterLike, type Term, type YearWeeks } from '@/lib/curriculumPacing'

// ─── Year plan: the pure parts of dragging a book on the timeline ──────────
// Drag a book's end and its units share the new length evenly; drag the line
// between two units and one gets what the other loses. Weeks move in halves
// and no unit goes below half a week, as setPacingWeeks stores them. The
// pointer is read in columns of the year view; holiday columns are not
// teaching weeks, so they are skipped. See YearPlanView.tsx.

const half = (n: number) => Math.round(n * 2) / 2

/** `total` weeks shared evenly over `k` units in half weeks: everyone gets the same, the half weeks left over go to units spread down the list. */
export function spreadEvenly(total: number, k: number): number[] {
  if (k <= 0) return []
  const halves = Math.max(k, Math.round(Math.max(0, total) * 2))
  const base = Math.floor(halves / k), extra = halves - base * k
  return Array.from({ length: k }, (_, i) => (base + (Math.floor((i + 1) * extra / k) > Math.floor(i * extra / k) ? 1 : 0)) / 2)
}

/** Moves the line after unit `k` by `delta` weeks: that unit gets longer or shorter (never below half a week) and the units after it move along, keeping their lengths. */
export function moveBoundary(weeks: number[], k: number, delta: number): number[] {
  if (k < 0 || k >= weeks.length) return weeks.slice()
  const out = weeks.slice()
  out[k] = Math.max(0.5, weeks[k] + half(delta))
  return out
}

/** A position across the view's columns (0 is the left edge of column 1) as teaching weeks gone by: holiday columns count for nothing. */
export function teachingAtColumn(pos: number, holidays: Set<number>, n: number): number {
  const p = Math.min(Math.max(0, pos), n)
  const whole = Math.floor(p + 1e-9)
  let t = 0
  for (let c = 1; c <= whole; c++) if (!holidays.has(c)) t += 1
  if (whole < n && !holidays.has(whole + 1)) t += p - whole
  return t
}

/** The column (1-based) that teaching week `t` ends in, holiday columns skipped. Past the view's last teaching week it counts on past the last column. */
export function columnOfTeaching(t: number, holidays: Set<number>, n: number): number {
  const cols: number[] = []
  for (let c = 1; c <= n; c++) if (!holidays.has(c)) cols.push(c)
  const k = Math.max(1, Math.ceil(t - 1e-9))
  if (!cols.length) return k
  return k <= cols.length ? cols[k - 1] : n + (k - cols.length)
}

/** The rows (in sort order) whose weeks differ from `weeks`, as patches for patchMasterRows. */
export function changedWeeks(rows: { id: string; sort_order: number; weeks: number }[], weeks: number[]): { id: string; weeks: number }[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)
    .map((r, i) => ({ id: r.id, before: Number(r.weeks), weeks: weeks[i] }))
    .filter(r => r.weeks !== undefined && Math.abs(r.weeks - r.before) > 1e-9)
    .map(({ id, weeks }) => ({ id, weeks }))
}

/** The next level in the same series (by level number, retired books skipped), or nothing after the last. */
export function nextBook(book: CurriculumBook, books: CurriculumBook[]): CurriculumBook | undefined {
  const same = books.filter(b => b.series_id === book.series_id && (b.status !== 'retired' || b.id === book.id))
    .sort((a, b) => a.level_number.localeCompare(b.level_number, undefined, { numeric: true }))
  const i = same.findIndex(b => b.id === book.id)
  return i >= 0 ? same.slice(i + 1).find(b => b.status !== 'retired') : undefined
}

// ─── Meeting mode ───────────────────────────────────────────────
// Classes move up a grade in March: this year's Daisy G3 is last year's
// Daisy G2, and new G1s arrive. The plan follows the class, not students.

const TERM_ORDER: Term[] = ['spring', 'year', 'fall']

/** Last year's books for a class: the grade below for G2 to G5, last year's G1 for G1; spring, then year, then fall. */
export function lastYearFor(placements: CurriculumPlacement[], cls: string, grade: number, prevYear: string, inStrand: (pl: CurriculumPlacement) => boolean): { grade: number; placements: CurriculumPlacement[] } {
  const g = grade > 1 ? grade - 1 : 1
  if (!prevYear) return { grade: g, placements: [] }
  const out = placements.filter(p => p.is_master && p.english_class === cls && p.grade === g && p.academic_year === prevYear && inStrand(p))
    .sort((a, b) => TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term))
  return { grade: g, placements: out }
}

/** What to offer: for a new G1 the book last year's G1 used, else the next level after the latest of last year's books (fall, then year, then spring); a series with only one book (Science of Reading) runs on, so it is offered again. */
export function suggestBook(grade: number, last: CurriculumPlacement[], books: CurriculumBook[]): CurriculumBook | undefined {
  const latest = [...last].sort((a, b) => TERM_ORDER.indexOf(b.term) - TERM_ORDER.indexOf(a.term))[0]
  const book = latest ? books.find(b => b.id === latest.book_id) : undefined
  if (!book) return undefined
  if (grade === 1) return book
  return nextBook(book, books) || (books.some(b => b.series_id === book.series_id && b.id !== book.id) ? undefined : book)
}

const SPRING_WEEKS = 20, FALL_WEEKS = 18
/** The nth Monday of a month (month 1-12). */
const nthMonday = (year: number, month: number, n: number) => addDays(mondayOf(`${year}-${String(month).padStart(2, '0')}-07`), 7 * (n - 1))

/** A year's weeks from Settings; a half with no dates is assumed: spring from the first Monday of March for 20 weeks, fall from the fourth Monday of August for 18. */
export function fillYearWeeks(semesters: SemesterLike[], year: string): { yw: YearWeeks; assumed: { spring: boolean; fall: boolean } } {
  const s = termDates(semesters, year, 'spring'), f = termDates(semesters, year, 'fall')
  const cal = Number((s.start || f.start || year).slice(0, 4)) || new Date().getFullYear()
  const springReal = !!(s.start && s.end), fallReal = !!(f.start && f.end)
  const spring = springReal ? weekList(s.start!, s.end!) : weekList(nthMonday(cal, 3, 1), addDays(nthMonday(cal, 3, 1), 7 * (SPRING_WEEKS - 1) + 4))
  const fall = fallReal ? weekList(f.start!, f.end!) : weekList(nthMonday(cal, 8, 4), addDays(nthMonday(cal, 8, 4), 7 * (FALL_WEEKS - 1) + 4))
  return { yw: { spring, fall }, assumed: { spring: !springReal, fall: !fallReal } }
}

const PERIOD_LABEL: Record<string, string> = { spring_mid: 'Spring midterm', spring_final: 'Spring final', fall_mid: 'Fall midterm', fall_final: 'Fall final' }
/** The level tests: the end date of each grading period of the year, in date order. */
export function levelTestDates(semesters: SemesterLike[], year: string): { label: string; date: string }[] {
  return semesters.filter(x => x.academic_year === year && PERIOD_LABEL[x.type] && x.end_date)
    .map(x => ({ label: PERIOD_LABEL[x.type], date: x.end_date as string }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Stories grouped by module ("M7 W1 · …"), in order: the module named from a summary's "Module 7 · Name,"; a story with no module badge is a group of its own. */
export function moduleGroups(items: { title: string; summary: string }[]): { key: string; label: string; from: number; to: number }[] {
  const out: { key: string; label: string; from: number; to: number }[] = []
  items.forEach((it, i) => {
    const m = it.title.match(/^M(\d+)\b/i)
    const key = m ? 'M' + m[1] : it.title
    const last = out[out.length - 1]
    if (m && last && last.key === key) { last.to = i } else out.push({ key, label: key, from: i, to: i })
    if (m) {
      const g = out[out.length - 1]
      const named = (it.summary || '').match(new RegExp(`Module ${m[1]}\\s*·\\s*([^,]+),`))
      if (named && g.label === key) g.label = `${key} · ${named[1].trim()}`
    }
  })
  return out
}

/** Which unit a book is in `t` weeks after it starts: its index, null before it starts, 'done' after its last unit. */
export function unitAt(weeks: number[], t: number): number | 'done' | null {
  if (t <= 0) return null
  let end = 0
  for (let i = 0; i < weeks.length; i++) { end += weeks[i]; if (t <= end + 1e-9) return i }
  return 'done'
}

/** Like teachingAtColumn, but a position past the last column keeps counting weeks, so a book can be dragged beyond the end of the year. */
export function teachingAtColumnOpen(pos: number, holidays: Set<number>, n: number): number {
  return teachingAtColumn(pos, holidays, n) + Math.max(0, pos - n)
}

export interface ClassKeyCtx { key: string; alt: boolean; ctrl: boolean; meta: boolean; shift: boolean; defaultPrevented: boolean; inField: boolean; onGrip: boolean; dialogOpen: boolean; panelOpen: boolean; present: boolean }
/** What a key does on the meeting screen: plain ← → switch class (never with a modifier, in a field, a dialog, on a book's handle or with a form open); Esc leaves Present unless typing. */
export function classKey(k: ClassKeyCtx): 'prev' | 'next' | 'exit' | null {
  if (k.alt || k.ctrl || k.meta || k.shift || k.defaultPrevented) return null
  if (k.key === 'Escape') return k.present && !k.inField ? 'exit' : null
  if (k.key !== 'ArrowLeft' && k.key !== 'ArrowRight') return null
  if (k.inField || k.onGrip || k.dialogOpen || k.panelOpen) return null
  return k.key === 'ArrowRight' ? 'next' : 'prev'
}

/**
 * What fits on a unit's bar. A phonics unit ("Closed Syllables · Consonant Digraphs: sh") shows its pattern ("sh"),
 * since the section name is the same for weeks on end; any other unit shows its badge ("Unit 4", "M3 W1"),
 * "SL 2" for a School Link, else its name.
 */
export function unitLabel(title: string, phonics: boolean): string {
  const t = splitUnitTitle(title)
  if (phonics) {
    // The pattern follows the first colon outside brackets; an aside in brackets ("(& new grapheme: ng)") is dropped.
    const name = t.name.replace(/\s*\(&[^)]*\)/g, '')
    let p = name.includes(':') ? name.slice(name.indexOf(':') + 1) : name
    p = p.replace(/^\s*Suffix\s+/i, '').replace(/<([^>]+)>\s*spells\s*/i, '$1 → ').replace(/[<>]/g, '').replace(/\bTogether\b/i, '').replace(/,\s*/g, ' ')
    return p.replace(/\s+/g, ' ').trim() || t.name
  }
  const sl = t.name.match(/^School Link\s*(\d+)/i)
  return t.badge || (sl ? `SL ${sl[1]}` : t.name)
}

/** The units from one to the other, both included, in the list's order; either end may come first, and an end that is not in the list means the start or the end. */
export function unitsInRange<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  let a = list.findIndex(u => u.id === fromId), b = list.findIndex(u => u.id === toId)
  if (a < 0) a = 0
  if (b < 0) b = list.length - 1
  if (a > b) [a, b] = [b, a]
  return list.slice(a, b + 1)
}

// ─── Labels that fit a bar ────────────────────────────────────────

/** Short forms of Science of Reading patterns too long for a thin bar (the full pattern stays in the bar's tooltip). */
const PHONICS_SHORT: Record<string, string> = {
  "All Short Vowels": "All short",
  "Beginning /k/ spelling rule": "/k/ c k",
  "Digraph & Triple Blends (str spr spl scr)": "str spr spl scr",
  "One-syllable Open": "Open",
  "Y as a vowel (long i)": "y = long i",
  "Drop the y make it an i": "y → i",
  "ge and dge spelling rule": "ge dge",
  "Silent e with suffixes": "e + suffix",
  "ie; other sounds of ea": "ie ea",
  "Short /oo/ (as in book)": "oo (book)",
  "/ou/ = ou and ow": "ou ow",
  "VCCV Words (closed-closed)": "VC/CV",
  "Y spells /ē/ & review Suffix -y": "y = /ē/",
  "VCCCV Syllable Division Rule (closed-closed)": "VC/CCV",
  "VCV Words (V-CV and VC-V)": "V/CV VC/V",
  "Soft c and Soft G": "soft c g",
  "2-Syllable Words with silent e": "2-syl e",
  "2-Syllable Words with Bossy r": "2-syl r",
  "2-Syllable Words with long Vowel Teams": "2-syl teams",
  "2-Syllable Words with Vowel Teams (ou ow oo ue ew oi oy aw)": "2-syl ou oi aw",
  "-al/-ial (final stable cial tial)": "-al -ial",
  "ild old ost ind olt": "ild old ost",
  "Suffixes -er and -est": "-er -est",
  "Prefixes re- un-": "re- un-",
  "Prefixes pre- and mis-": "pre- mis-",
  "Prefixes con com in im": "con com in im",
  "Prefixes de dis": "de- dis-",
  "Prefix sub- trans-": "sub- trans-",
  "Prefix ex-": "ex-",
  "ir er ur = /er/": "ir er ur",
  "oy and oi": "oy oi",
  "aw and au": "aw au",
  "-ive and -ion": "-ive -ion",
  "Compound Words": "Compounds",
  "Consonant -le": "-le",
  "The Schwa": "schwa",
  "-ng and -nk": "-ng -nk",
  "Beginning Blends": "Blends",
  "Ending Blends": "End blends",
  "Review all": "Review",
  "-ful -less -ly -ness": "-ful -less",
}
/** A pattern with no set short form loses its filler words and brackets: "Prefixes up- and down-" → "up- down-". */
const shortenPattern = (p: string) => p.replace(/\([^)]*\)/g, ' ').replace(/\b(Prefix(es)?|Suffix(es)?|Words?|with|and|spelling|rule)\b/gi, ' ').replace(/\s+/g, ' ').trim()

/** What a unit's bar can say, longest first: a phonics pattern then its short form; "Unit 4", "U4", "4"; "School Link 2", "SL 2", "SL". */
export function unitLabels(title: string, phonics: boolean): string[] {
  const full = unitLabel(title, phonics)
  if (phonics) {
    const s = PHONICS_SHORT[full] ?? shortenPattern(full)
    return s && s !== full ? [full, s] : [full]
  }
  const u = full.match(/^Unit\s*(\d+)$/i)
  if (u) return [`Unit ${u[1]}`, `U${u[1]}`, u[1]]
  const sl = full.match(/^SL\s*(\d+)$/i)
  if (sl) return [`School Link ${sl[1]}`, `SL ${sl[1]}`, 'SL']
  return [full]
}

/** The longest label that fits `room` pixels, or the shortest when none does. */
export function pickLabel(labels: string[], room: number, width: (t: string) => number): string {
  return labels.find(t => width(t) <= room) ?? labels[labels.length - 1] ?? ''
}

/** For bars of one kind in a row (every "Unit n"): the index of the longest form that fits every bar, so the row reads Unit 1 … Unit 12, never Unit 9 next to U10. */
export function levelForAll(labelSets: string[][], rooms: number[], width: (t: string) => number): number {
  let level = 0
  labelSets.forEach((ls, i) => { const k = ls.findIndex(t => width(t) <= rooms[i]); level = Math.max(level, k < 0 ? ls.length - 1 : k) })
  return level
}
