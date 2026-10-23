import { describe, it, expect } from 'vitest'
import { parseRubricSheet, parseDelimited, templateRows, templateAsText, TEMPLATE_HEADERS, instructionRows, CLAUDE_PROMPT } from '@/lib/rubricSheet'
import { normalizeExtractedRubric } from '@/lib/rubricImport'
import * as XLSX from 'xlsx'

const filled = [
  ['Rubric name', 'Opinion writing'],
  ['Wording', '3–5'],
  [],
  TEMPLATE_HEADERS,
  ['Opinion', 'W.3.1', 'No opinion.', 'An opinion, unclear.', 'A clear opinion.', 'A clear opinion that sets up the reasons.'],
  ['Reasons', '', 'No reasons.', 'One reason.', 'Two reasons.', 'Three reasons, each explained.'],
  ['', '', '', '', '', ''],
]

describe('parseRubricSheet', () => {
  it('reads the template filled in', () => {
    const { rubric, problems } = parseRubricSheet(filled)
    expect(problems).toEqual([])
    expect(rubric.name).toBe('Opinion writing')
    expect(rubric.band).toBe('g35')
    expect(rubric.criteria).toEqual([
      { label: 'Opinion', standard: 'W.3.1', levels: ['No opinion.', 'An opinion, unclear.', 'A clear opinion.', 'A clear opinion that sets up the reasons.'] },
      { label: 'Reasons', standard: null, levels: ['No reasons.', 'One reason.', 'Two reasons.', 'Three reasons, each explained.'] },
    ])
  })
  it('and the result passes the format check with no issues', () => {
    const r = normalizeExtractedRubric(parseRubricSheet(filled).rubric, 'k2')
    expect(r.issues).toEqual([])
    expect(r.criteria[0]).toMatchObject({ key: 'opinion', standard: 'W.3.1' })
  })
  it('does not mind the blank template itself', () => {
    const { rubric } = parseRubricSheet(templateRows())
    expect(rubric.criteria).toEqual([])
    expect(normalizeExtractedRubric(rubric, 'g35').issues.map(i => i.level)).toEqual(['fix', 'fix'])
  })
  it('finds the header wherever it is and maps columns by their words, in any order', () => {
    const { rubric } = parseRubricSheet([
      ['My school rubric'],
      ['Level 4', 'Level 3', 'Criterion', 'Level 2', 'Level 1', 'Standard'],
      ['top', 'meets', 'Voice', 'dev', 'low', 'W.4.3'],
    ])
    expect(rubric.criteria).toEqual([{ label: 'Voice', standard: 'W.4.3', levels: ['low', 'dev', 'meets', 'top'] }])
  })
  it('keeps an empty level 1 in place so the check can flag it', () => {
    const { rubric } = parseRubricSheet([TEMPLATE_HEADERS, ['Ideas', '', '', 'b', 'c', 'd']])
    expect(rubric.criteria[0].levels).toEqual(['', 'b', 'c', 'd'])
    const issues = normalizeExtractedRubric(rubric, 'g35').issues
    expect(issues).toContainEqual({ level: 'fix', criterion: 0, message: 'Level 1 is empty.' })
  })
  it('reads five level columns and lets the check drop the lowest', () => {
    const { rubric } = parseRubricSheet([['Criterion', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'], ['Ideas', 'none', 'a', 'b', 'c', 'd']])
    expect(rubric.criteria[0].levels).toHaveLength(5)
    expect(normalizeExtractedRubric(rubric, 'g35').criteria[0].levels).toEqual(['a', 'b', 'c', 'd'])
  })
  it('falls back to template column order when there is no header, and says so', () => {
    const { rubric, problems } = parseRubricSheet([['Ideas', 'W.3.3', 'a', 'b', 'c', 'd'], ['Voice', '', 'e', 'f', 'g', 'h']])
    expect(problems[0]).toMatch(/No header row/)
    expect(rubric.criteria[1]).toEqual({ label: 'Voice', standard: null, levels: ['e', 'f', 'g', 'h'] })
  })
  it('understands K–2 in a few spellings and complains about the rest', () => {
    expect(parseRubricSheet([['Wording', 'K-2'], TEMPLATE_HEADERS]).rubric.band).toBe('k2')
    expect(parseRubricSheet([['Wording', 'k2'], TEMPLATE_HEADERS]).rubric.band).toBe('k2')
    expect(parseRubricSheet([['Wording', 'grades 3 to 5'], TEMPLATE_HEADERS]).rubric.band).toBe('g35')
    const r = parseRubricSheet([['Wording', 'middle school'], TEMPLATE_HEADERS])
    expect(r.rubric.band).toBeNull(); expect(r.problems[0]).toMatch(/not understood/)
  })
  it('survives junk', () => {
    expect(parseRubricSheet([]).problems).toEqual(['The sheet is empty.'])
    expect(parseRubricSheet([[null, undefined, 3]] as unknown[][]).rubric.criteria).toHaveLength(1)
  })
})

describe('parseDelimited', () => {
  it('splits tabs, Markdown tables, and CSV', () => {
    expect(parseDelimited('a\tb\n\nc\td\n')).toEqual([['a', 'b'], ['c', 'd']])
    expect(parseDelimited('| Criterion | Level 1 |\n|---|---|\n| Ideas | low |')).toEqual([['Criterion', 'Level 1'], ['Ideas', 'low']])
    expect(parseDelimited('Ideas,"No idea, yet.","Says ""hi"""')).toEqual([['Ideas', 'No idea, yet.', 'Says "hi"']])
    expect(parseDelimited('  ')).toEqual([])
  })
  it('round-trips the pasted template', () => {
    expect(parseDelimited(templateAsText())).toContainEqual(TEMPLATE_HEADERS)
  })
})

describe('template', () => {
  it('has the name and wording rows, a header on row 4, and the prompt on the instructions sheet', () => {
    const t = templateRows()
    expect(t[0][0]).toBe('Rubric name'); expect(t[1][0]).toBe('Wording'); expect(t[3]).toEqual(TEMPLATE_HEADERS)
    expect(instructionRows().flat().join('\n')).toContain(CLAUDE_PROMPT.split('\n')[0])
  })
})

describe('xlsx round trip', () => {
  it('reads a template workbook that was filled in and saved by a spreadsheet library', () => {
    // Build the template the way the dialog does, fill it the way Claude is asked to.
    const rows = templateRows()
    rows[0][1] = 'Narrative writing'
    rows[1][1] = 'K–2'
    rows[4] = ['Ideas', '', 'Idea is unclear or off topic.', 'Has an idea but few details.', 'Stays on topic and adds some details.', 'Stays on topic with details that make the idea clear.']
    rows[5] = ['Sequence words', 'W.1.3', '', 'Uses one order word.', 'Uses first, next, then, and last.', 'Uses a range of order and time words.']
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructionRows()), 'How to fill it in')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Rubric')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Read it back the way the dialog does: the sheet called Rubric, as a grid.
    const back = XLSX.read(buf, { type: 'buffer' })
    const name = back.SheetNames.find(n => /rubric/i.test(n)) || back.SheetNames[0]
    const grid: unknown[][] = XLSX.utils.sheet_to_json(back.Sheets[name], { header: 1, raw: false, defval: '' })
    const read = parseRubricSheet(grid)
    expect(read.problems).toEqual([])
    const r = normalizeExtractedRubric(read.rubric, 'g35')
    expect(r.name).toBe('Narrative writing')
    expect(r.band).toBe('k2')
    expect(r.criteria.map(c => c.key)).toEqual(['ideas', 'sequence_words'])
    expect(r.criteria[1].standard).toBe('W.1.3')
    expect(r.issues).toEqual([{ level: 'fix', criterion: 1, message: 'Level 1 is empty.' }])
  })
})
