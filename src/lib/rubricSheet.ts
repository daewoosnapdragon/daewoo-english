import type { ExtractedRubric } from '@/lib/rubricImport'

// ─── Rubric spreadsheet: template and reader ─────────────────────
// Teachers bring a rubric they already use into the app through a sheet:
// download the template, have Claude (or anyone) fill it from the PDF, then
// upload or paste the filled sheet. Everything here is plain code on a grid
// of cells, no network, so the same reader runs in tests and in the browser.
//
// Template layout (sheet "Rubric"):
//   row 1  Rubric name | <name>
//   row 2  Wording     | K–2 or 3–5
//   row 4  Criterion | Standard (optional) | Level 1 … | Level 2 … | Level 3 … | Level 4 …
//   row 5+ one criterion per row
// The reader finds the header row by its words, so extra rows, a missing
// name row, or a sheet with 3 or 5 level columns still read.

export const TEMPLATE_FILE_NAME = 'rubric-template.xlsx'

export const TEMPLATE_HEADERS = ['Criterion', 'Standard (optional)', 'Level 1 · Needs guidance', 'Level 2 · Developing', 'Level 3 · Meets', 'Level 4 · Exceeds']

/** The "Rubric" sheet: name and wording rows, a blank, the header, and empty rows to fill. */
export function templateRows(): string[][] {
  return [
    ['Rubric name', ''],
    ['Wording', '3–5'],
    [],
    TEMPLATE_HEADERS,
    ...Array.from({ length: 8 }, () => ['', '', '', '', '', '']),
  ]
}

/** The message a teacher pastes into Claude with the rubric and the template attached. */
export const CLAUDE_PROMPT = `I am attaching a rubric (a PDF or a photo) and a spreadsheet template (${TEMPLATE_FILE_NAME}). Fill the template from the rubric and give me the file back as .xlsx. If you cannot make a file, give me the same table in a form I can copy straight into a spreadsheet: one row per line, cells separated by tabs.

Rules:
- Cell B1: the rubric's title, or a short name for the task it scores.
- Cell B2: K–2 or 3–5, whichever grades the rubric is written for.
- From row 5, one row per criterion. Column A: the criterion name as printed.
- Column B: a Common Core ELA code only if the rubric prints one (W.3.1, RL.K.2, SL.4.1). Otherwise leave it empty. Do not invent one.
- Columns C to F: the descriptor for each level in the rubric's own words, lowest performance in C and highest in F, even if the paper prints the top level first.
- If the rubric has 3 levels, put them in D, E and F and leave C empty. If it has 5, leave out the lowest one. Never write a descriptor the rubric does not have; leave that cell empty and I will write it.
- Keep every criterion. If anything does not fit the template, tell me in your reply instead of dropping it.`

/** The "How to fill it in" sheet. */
export function instructionRows(): string[][] {
  return [
    ['How to fill in this template'],
    [],
    ['1.', 'Open claude.ai (or any assistant that reads files). Attach your rubric as a PDF or a photo, and attach this template.'],
    ['2.', 'Paste the message below. You get the template back, filled in.'],
    ['3.', 'In the app, open Grades → New assessment → Rubric → Choose a rubric → Import from a spreadsheet, and drop the filled file (or paste the table).'],
    ['4.', 'The app checks the format and shows anything to fix before you save.'],
    [],
    ['Layout', 'Row 1: rubric name in B1. Row 2: wording in B2, K–2 or 3–5. Row 4: headers. From row 5: one criterion per row.'],
    ['Columns', 'A criterion · B standard code if the paper prints one, else empty · C to F the four levels, lowest to highest.'],
    ['3 levels?', 'Put them in D–F and leave C empty; you write level 1 in the app.'],
    ['5 levels?', 'Leave out the lowest; the app’s 0 covers no evidence.'],
    ['Example', 'Opinion', 'W.3.1', 'The opinion is missing or unclear.', 'States an opinion, but not until later or not clearly.', 'Introduces the topic and states a clear opinion at the start.', 'Opens with a clear, well-worded opinion that sets up the reasons to come.'],
    [],
    ['Message for Claude'],
    ...CLAUDE_PROMPT.split('\n').map(l => [l]),
  ]
}

/** Tab-separated text of the template, for pasting into Google Sheets. */
export function templateAsText(): string {
  return templateRows().map(r => r.join('\t')).join('\n')
}

// ─── Reading a filled sheet ──────────────────────────────────────

const clean = (v: unknown): string => (v == null ? '' : String(v)).replace(/\s+/g, ' ').trim()

const isCriterionHeader = (s: string) => /^(criteri(on|a)|기준|항목)/i.test(s)
const isStandardHeader = (s: string) => /standard|^code|성취\s*기준|기준\s*코드/i.test(s)
/** The level number a header names: "Level 3 · Meets" → 3, "4" → 4, "단계 2" → 2. */
function levelNumber(s: string): number | null {
  const m = s.match(/(?:level|단계|수준)\s*([1-9])\b/i) || s.match(/^([1-9])\b/)
  return m ? Number(m[1]) : null
}
const isLevelHeader = (s: string) => levelNumber(s) !== null || /^(level|단계|수준)\b/i.test(s)

function bandFromCell(s: string): 'k2' | 'g35' | null {
  const t = s.toLowerCase().replace(/\s/g, '')
  if (!t) return null
  if (/^k|k\D{0,3}2|^1\D{0,3}2|유치|1\D{0,3}2학년/.test(t)) return 'k2'
  if (/3\D{0,3}5|g35/.test(t)) return 'g35'
  return null
}

export interface SheetReadResult {
  rubric: ExtractedRubric
  /** Things about the sheet's shape the teacher should know. */
  problems: string[]
}

/**
 * Read a grid of cells (as a spreadsheet library returns a sheet) into the
 * loose rubric shape. The header row is found by its words; the rows before
 * it may hold the name and the wording. Never throws.
 */
export function parseRubricSheet(rawRows: unknown[][]): SheetReadResult {
  const rows = (Array.isArray(rawRows) ? rawRows : []).map(r => (Array.isArray(r) ? r.map(clean) : []))
  const problems: string[] = []

  let headerIdx = -1
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const cells = rows[r]
    if (cells.some(isCriterionHeader) && cells.some(isLevelHeader)) { headerIdx = r; break }
  }

  let name = ''
  let band: 'k2' | 'g35' | null = null
  const top = headerIdx >= 0 ? rows.slice(0, headerIdx) : []
  for (const cells of top) {
    const key = cells[0] || ''
    const value = cells.slice(1).find(Boolean) || ''
    if (/^(rubric\s*)?(name|title)|제목|이름|루브릭\s*명/i.test(key)) name = value
    else if (/wording|band|grade|문구|학년/i.test(key)) {
      const b = bandFromCell(value)
      if (b) band = b
      else if (value) problems.push(`Wording “${value}” was not understood; write K–2 or 3–5. The grade's wording is used for now.`)
    }
  }

  let labelCol = 0, standardCol = -1, levelCols: number[] = [], dataStart = 0
  if (headerIdx >= 0) {
    const h = rows[headerIdx]
    labelCol = h.findIndex(isCriterionHeader)
    standardCol = h.findIndex(isStandardHeader)
    const numbered = h.map((c, i) => ({ i, n: levelNumber(c) })).filter(x => x.n !== null && x.i !== labelCol && x.i !== standardCol)
    if (numbered.length) levelCols = numbered.sort((a, b) => (a.n as number) - (b.n as number)).map(x => x.i)
    else levelCols = h.map((c, i) => (isLevelHeader(c) && i !== labelCol && i !== standardCol ? i : -1)).filter(i => i >= 0)
    dataStart = headerIdx + 1
  } else {
    // No header: read columns in template order, and say so.
    const width = Math.max(0, ...rows.map(r => { let n = r.length; while (n > 0 && !r[n - 1]) n--; return n }))
    if (width === 0) return { rubric: { name: '', band: null, criteria: [], notes: [] }, problems: ['The sheet is empty.'] }
    standardCol = width >= 6 ? 1 : -1
    levelCols = Array.from({ length: Math.max(0, width - (standardCol >= 0 ? 2 : 1)) }, (_, k) => k + (standardCol >= 0 ? 2 : 1))
    problems.push('No header row (Criterion, Level 1 …) was found, so the columns were read in the template order: criterion, ' + (standardCol >= 0 ? 'standard, ' : '') + 'then the levels.')
  }
  if (levelCols.length === 0) problems.push('No level columns were found. Use the template headers: Level 1, Level 2, Level 3, Level 4.')

  const criteria: ExtractedRubric['criteria'] = []
  for (let r = dataStart; r < rows.length; r++) {
    const cells = rows[r]
    const label = cells[labelCol] || ''
    const levels = levelCols.map(c => cells[c] || '')
    if (!label && levels.every(l => !l)) continue
    if (headerIdx >= 0 && isCriterionHeader(label) && levels.some(isLevelHeader)) continue  // a repeated header
    const standard = standardCol >= 0 ? cells[standardCol] || null : null
    criteria.push({ label, levels, standard })
  }

  return { rubric: { name, band, criteria, notes: [] }, problems }
}

/**
 * Pasted text into a grid. Tabs (what a spreadsheet or a table in a document
 * gives when copied) win; then a Markdown-style table with pipes; then CSV.
 */
export function parseDelimited(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  if (lines.some(l => l.includes('\t'))) return lines.map(l => l.split('\t'))
  if (lines.filter(l => (l.match(/\|/g) || []).length >= 2).length >= Math.ceil(lines.length / 2)) {
    return lines
      .filter(l => !/^\s*\|?\s*:?-{2,}/.test(l))  // the |---|---| rule under a Markdown header
      .map(l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()))
  }
  return lines.map(splitCsvLine)
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out
}
