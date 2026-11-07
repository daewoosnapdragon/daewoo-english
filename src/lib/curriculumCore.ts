// ─── Curriculum catalogue ────────────────────────────────────────
// The books the program uses, divided into units and lessons, with the
// "students will" line for every lesson and the CCSS codes and skill tags
// that make overlap and throughlines visible. See
// supabase/migration-curriculum-catalogue.sql. The pure parts (reading the
// lines Claude writes from a table of contents, tag handling, colours,
// counts) are here so they can be tested; the Bookshelf page calls them.

export type Strand = 'phonics' | 'reading' | 'writing' | 'speaking' | 'grammar' | 'other'
export const STRANDS: Strand[] = ['phonics', 'reading', 'writing', 'speaking', 'grammar', 'other']
export const STRAND_LABEL: Record<Strand, { en: string; ko: string }> = {
  phonics: { en: 'Phonics', ko: '파닉스' }, reading: { en: 'Reading', ko: '읽기' }, writing: { en: 'Writing', ko: '쓰기' },
  speaking: { en: 'Speaking', ko: '말하기' }, grammar: { en: 'Grammar', ko: '문법' }, other: { en: 'Other', ko: '기타' },
}

/** A book is in use ("confirmed", the stored value) or retired. Rows written before 8 Nov 2026 as "polled" read as in use. */
export type BookStatus = 'confirmed' | 'retired'
export const BOOK_STATUS_LABEL: Record<BookStatus, { en: string; ko: string }> = {
  confirmed: { en: 'In use', ko: '사용 중' }, retired: { en: 'Retired', ko: '사용 안 함' },
}
export const normalizeStatus = (s: string): BookStatus => s === 'retired' ? 'retired' : 'confirmed'

/**
 * A book's level as a short mark for the big coloured numeral beside its name:
 * "3" and "S" stay as they are; longer levels shorten to initials and numbers,
 * so "Intermediate 1 Plus" is "I1+", "Basic 2" is "B2" and "Purple" is "P".
 * The full level is still written beside the mark.
 */
export function levelShort(level: string | null | undefined): string {
  const t = (level || '').trim()
  if (t.length <= 3) return t
  return t.split(/\s+/).map(w => /^plus$/i.test(w) ? '+' : /^\d/.test(w) ? w : w.charAt(0).toUpperCase()).join('').slice(0, 4)
}

/** "M3 W2 · The Story of You" splits into the badge "M3 W2" and the title; so does any short prefix before " · ", such as a section name. */
export function splitUnitTitle(title: string): { badge: string; name: string } {
  const m = title.match(/^(M\d+\s*W\d+|Unit\s*\d+[a-z]?|Module\s*\d+)\s*[·:\-–]\s*(.+)$/i)
  if (m) return { badge: m[1].replace(/\s+/g, ' '), name: m[2] }
  const g = title.match(/^(.{1,28}?)\s·\s(.+)$/)
  return g ? { badge: g[1], name: g[2] } : { badge: '', name: title }
}

export type ResourceKind = 'slides' | 'pdf' | 'doc' | 'sheet' | 'audio' | 'video' | 'folder' | 'other'
export const RESOURCE_KINDS: ResourceKind[] = ['slides', 'pdf', 'doc', 'sheet', 'audio', 'video', 'folder', 'other']

/** Colour means book, everywhere in the app. Eight muted keys; the hex is what the pages draw. */
export const BOOK_COLORS: Record<string, { hex: string; label: string }> = {
  blue: { hex: '#2F5C8A', label: 'Blue' }, plum: { hex: '#6B4C9A', label: 'Plum' }, green: { hex: '#2E6B3A', label: 'Green' },
  orange: { hex: '#B8641E', label: 'Orange' }, teal: { hex: '#4E948A', label: 'Teal' }, ochre: { hex: '#9A6A12', label: 'Ochre' },
  berry: { hex: '#A5466B', label: 'Berry' }, slate: { hex: '#857D6E', label: 'Slate' },
}
export const colorHex = (key: string) => (BOOK_COLORS[key] || BOOK_COLORS.slate).hex

/** A sequence is taught unit by unit in order and paced in weeks; an anthology is a book of stories a class picks from. */
export type SeriesKind = 'sequence' | 'anthology'
export const SERIES_KIND_LABEL: Record<SeriesKind, { en: string; ko: string }> = { sequence: { en: 'Sequence', ko: '순서대로' }, anthology: { en: 'Anthology', ko: '선집' } }
export interface CurriculumSeries { id: string; name: string; publisher: string; strand: Strand; color: string; kind: SeriesKind; sort_order: number; created_at: string }
export interface CurriculumBook {
  id: string; series_id: string; level_number: string; title: string; status: BookStatus; drive_folder_url: string; notes: string
  created_at: string; updated_at: string
}
export interface CurriculumUnit {
  id: string; book_id: string; sort_order: number; title: string; summary: string; skill_tags: string[]; ccss_codes: string[]
  default_weeks: number; source: 'claude' | 'teacher'; confirmed_by: string | null; confirmed_at: string | null; drive_folder_url: string
  created_at: string; updated_at: string
}
export interface CurriculumLesson {
  id: string; unit_id: string; sort_order: number; title: string; objective: string; notes: string; ccss_codes: string[]; skill_tags: string[]
  source: 'claude' | 'teacher'; confirmed_by: string | null; confirmed_at: string | null; created_at: string; updated_at: string
}
export interface CurriculumResource {
  id: string; unit_id: string | null; lesson_id: string | null; name: string; kind: ResourceKind; url: string; copies_hint: number | null
  added_by: string | null; created_at: string
}
export interface CurriculumSkill { code: string; label: string; strand: Strand; parent_code: string | null; sort_order: number }

export const isCurriculumMissing = (message: string | undefined | null) =>
  !!message && /curriculum_series|curriculum_books|curriculum_units|curriculum_lessons|curriculum_resources|curriculum_skills/.test(message)

/** "Super Phonics 2", or the book's own title when it has one, with the level after the series name. */
export function bookName(book: Pick<CurriculumBook, 'level_number' | 'title'>, series: Pick<CurriculumSeries, 'name'> | undefined): string {
  const base = `${series?.name || 'Book'}${book.level_number ? ' ' + book.level_number : ''}`
  return book.title && book.title.trim() && book.title.trim() !== base ? `${base} · ${book.title.trim()}` : base
}

// ─── Tags ────────────────────────────────────────────────────────

/** A skill tag as stored: lower case, single spaces, no trailing dots. */
export const normalizeTag = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.;,]+$/, '')

/** Splits "RF.1.3c, L.1.2d" (or with spaces, slashes, semicolons) into upper-case codes, in order, without repeats. */
export function parseCodes(s: string): string[] {
  const out: string[] = []
  for (const raw of s.split(/[,;/\s]+/)) {
    const c = raw.trim().toUpperCase().replace(/[.,;]+$/, '')
    if (/^(RL|RI|RF|W|SL|L)\.(K|[0-9]+)\.[0-9]+[A-Z]?$/.test(c) && !out.includes(c)) out.push(c)
  }
  return out
}

/** Splits "short a, long a vce; cvc" into tags, in order, without repeats. */
export function parseTags(s: string): string[] {
  const out: string[] = []
  for (const raw of s.split(/[,;/]+/)) { const t = normalizeTag(raw); if (t && !out.includes(t)) out.push(t) }
  return out
}

// ─── Reading pasted units and lessons ────────────────────────────
// The shape Claude writes from a table of contents or a teacher's guide:
//
//   Unit 1 · Short vowels | weeks: 3 | skills: short a, short e | ccss: RF.1.2c, RF.1.3b
//   - Lesson 1 · Short a words | Students will blend and read CVC words with short a. | ccss: RF.1.3b | skills: short a
//   - Lesson 2 · Short e words | Students will read and spell short e words. | notes: word sort first
//
// A line that starts with Unit (or Module, Chapter, Theme, or "#") begins a
// unit. A line that starts with "-", "*" or "•" is a lesson of the unit
// above it. Fields after the title are separated by "|": a "key: value"
// field is read by its key (weeks, skills, ccss, notes, students will,
// summary); a bare field is the objective for a lesson and the summary for
// a unit. Anything else on the page is ignored, so a heading or a blank
// line does no harm.

export interface ParsedLesson { title: string; objective: string; notes: string; ccss_codes: string[]; skill_tags: string[] }
export interface ParsedUnit { title: string; summary: string; default_weeks: number; skill_tags: string[]; ccss_codes: string[]; lessons: ParsedLesson[] }

const UNIT_LINE = /^(?:#+\s*)?(?:unit|module|chapter|theme|topic)\s*([0-9]+[a-z]?)?\s*[.:·\-–—)]?\s*(.*)$/i
const LESSON_LINE = /^[-*•]\s*(?:(?:lesson|day|session)\s*([0-9]+[a-z]?)\s*[.:·\-–—)]?\s*)?(.*)$/i
const KEYED = /^([a-z][a-z ]{0,20}):\s*(.*)$/i

function readFields(fields: string[], free: (value: string, index: number) => void): Record<string, string> {
  const keyed: Record<string, string> = {}
  let i = 0
  for (const raw of fields) {
    const f = raw.trim()
    const m = f.match(KEYED)
    if (m) keyed[m[1].trim().toLowerCase()] = m[2].trim()
    else if (f) { free(f, i); i += 1 }
  }
  return keyed
}

const stripOrdinal = (title: string, n: string | undefined, word: string) => {
  const t = title.trim()
  if (!t) return n ? `${word} ${n}` : word
  return n ? `${word} ${n} · ${t}` : t
}

export function parseCatalogueLines(text: string): ParsedUnit[] {
  const units: ParsedUnit[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const um = line.match(UNIT_LINE)
    const lm = line.match(LESSON_LINE)
    if (lm && units.length) {
      const [first, ...rest] = lm[2].split('|')
      const lesson: ParsedLesson = { title: stripOrdinal(first, lm[1], 'Lesson'), objective: '', notes: '', ccss_codes: [], skill_tags: [] }
      const keyed = readFields(rest, (v, i) => { if (i === 0) lesson.objective = v; else if (i === 1) lesson.notes = v })
      if (keyed['students will']) lesson.objective = /^students will/i.test(keyed['students will']) ? keyed['students will'] : `Students will ${keyed['students will']}`
      if (keyed.objective) lesson.objective = keyed.objective
      if (keyed.notes) lesson.notes = keyed.notes
      if (keyed.ccss) lesson.ccss_codes = parseCodes(keyed.ccss)
      if (keyed.standards) lesson.ccss_codes = parseCodes(keyed.standards)
      if (keyed.skills) lesson.skill_tags = parseTags(keyed.skills)
      if (keyed.skill) lesson.skill_tags = parseTags(keyed.skill)
      if (!lesson.ccss_codes.length) { const inline = parseCodes(first + ' ' + lesson.objective); if (inline.length && !lesson.objective) lesson.ccss_codes = inline }
      units[units.length - 1].lessons.push(lesson)
      continue
    }
    if (um && !/^[-*•]/.test(line)) {
      const [first, ...rest] = um[2].split('|')
      const unit: ParsedUnit = { title: stripOrdinal(first, um[1], 'Unit'), summary: '', default_weeks: 2, skill_tags: [], ccss_codes: [], lessons: [] }
      const keyed = readFields(rest, (v, i) => { if (i === 0) unit.summary = v })
      if (keyed.summary) unit.summary = keyed.summary
      if (keyed.weeks) { const w = parseFloat(keyed.weeks); if (!Number.isNaN(w) && w > 0) unit.default_weeks = w }
      if (keyed.ccss) unit.ccss_codes = parseCodes(keyed.ccss)
      if (keyed.standards) unit.ccss_codes = parseCodes(keyed.standards)
      if (keyed.skills) unit.skill_tags = parseTags(keyed.skills)
      if (keyed.skill) unit.skill_tags = parseTags(keyed.skill)
      units.push(unit)
    }
  }
  return units
}

/** The text to give Claude with the table of contents or guide pages, so it writes lines in the shape above. */
export function draftPrompt(book: string, gradeHint: string, skills: string[]): string {
  const list = skills.length ? ` Use these skill tags where one fits, spelled exactly like this: ${skills.join(', ')}. Add a new short tag only when none fits.` : ''
  return `Here are the table of contents and teacher's guide pages for ${book}. Write its units and lessons, one per line, in this shape and nothing else:\n` +
    `Unit 1 · <unit title> | weeks: <how many weeks the book expects> | skills: <tags> | ccss: <codes>\n` +
    `- Lesson 1 · <lesson title> | Students will <what they will be able to do, from the guide> | ccss: <codes> | skills: <tags>\n` +
    `One Unit line per unit (or module), then its lessons as "-" lines under it. The "Students will" line comes from the guide's objective where there is one.` +
    ` CCSS codes are Common Core ELA for ${gradeHint}, like RF.1.3c or RL.2.3; two or three per lesson, the ones it really teaches.${list} No headings, no notes, no other text.`
}

// ─── Counts and status ───────────────────────────────────────────

export interface BookCounts { units: number; lessons: number; confirmedUnits: number; confirmedLessons: number }
export function countBook(units: CurriculumUnit[], lessons: CurriculumLesson[]): BookCounts {
  const unitIds = new Set(units.map(u => u.id))
  const ls = lessons.filter(l => unitIds.has(l.unit_id))
  return { units: units.length, lessons: ls.length, confirmedUnits: units.filter(u => !!u.confirmed_at).length, confirmedLessons: ls.filter(l => !!l.confirmed_at).length }
}

/** "4 units · 12 lessons · 9 confirmed", or "Not indexed yet". */
export function countLine(c: BookCounts, ko: boolean): string {
  if (!c.units) return ko ? '아직 색인 안 됨' : 'Not indexed yet'
  const parts = [ko ? `단원 ${c.units}` : `${c.units} ${c.units === 1 ? 'unit' : 'units'}`]
  if (c.lessons) parts.push(ko ? `차시 ${c.lessons}` : `${c.lessons} ${c.lessons === 1 ? 'lesson' : 'lessons'}`)
  const total = c.units + c.lessons, done = c.confirmedUnits + c.confirmedLessons
  parts.push(done === total ? (ko ? '모두 확인됨' : 'all confirmed') : (ko ? `${done}/${total} 확인됨` : `${done} of ${total} confirmed`))
  return parts.join(' · ')
}

/** Tags that are not in the vocabulary yet, from a set of units and lessons. */
export function unknownTags(units: ParsedUnit[], known: Set<string>): string[] {
  const out: string[] = []
  const add = (t: string) => { if (!known.has(t) && !out.includes(t)) out.push(t) }
  for (const u of units) { u.skill_tags.forEach(add); u.lessons.forEach(l => l.skill_tags.forEach(add)) }
  return out
}

/** The Drive file or folder id in a link, or null. Used to tell a real Drive link from any other. */
export function driveId(url: string): string | null {
  const m = url.match(/\/(?:d|folders)\/([A-Za-z0-9_-]{10,})/) || url.match(/[?&]id=([A-Za-z0-9_-]{10,})/)
  return m ? m[1] : null
}

/** Guesses the resource kind from a Drive link. */
export function kindFromUrl(url: string): ResourceKind {
  if (/docs\.google\.com\/presentation/.test(url)) return 'slides'
  if (/docs\.google\.com\/document/.test(url)) return 'doc'
  if (/docs\.google\.com\/spreadsheets/.test(url)) return 'sheet'
  if (/drive\.google\.com\/drive\/folders/.test(url)) return 'folder'
  if (/\.pdf(\?|$)/i.test(url)) return 'pdf'
  if (/\.(mp3|m4a|wav)(\?|$)/i.test(url)) return 'audio'
  if (/\.(mp4|mov)(\?|$)/i.test(url) || /youtu/.test(url)) return 'video'
  return 'other'
}
