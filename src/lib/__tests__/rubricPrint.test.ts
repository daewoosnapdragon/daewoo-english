import { describe, it, expect } from 'vitest'
import { buildFromTemplate } from '@/components/curriculum/rubric-library'
import { buildRubricPrintHtml, esc, scoredForItem, sheetCount, slipsFor, type PrintOptions } from '@/components/grades/rubricPrint'

const rubric = buildFromTemplate('opinion', 3)!
const base: PrintOptions = { layout: 'full', lang: 'en', showStandards: true, showZero: true, commentLine: true, copies: 1 }
const count = (html: string, re: RegExp) => (html.match(re) || []).length

describe('rubric print', () => {
  it('lays slips out on sheets by size', () => {
    expect(sheetCount('full', 24)).toBe(24)
    expect(sheetCount('half', 24)).toBe(12)
    expect(sheetCount('quarter', 24)).toBe(6)
    expect(sheetCount('quarter', 5)).toBe(2)
    expect(sheetCount('half', 0)).toBe(1)
  })
  it('prints the asked number of blank copies, padding the last sheet', () => {
    expect(slipsFor({ ...base, copies: 3 })).toHaveLength(3)
    expect(slipsFor(base, [{ student: 'A' }])).toHaveLength(1)
    const html = buildRubricPrintHtml(rubric, { ...base, layout: 'quarter', copies: 5 })
    expect(count(html, /class="sheet n4"/g)).toBe(2)
    expect(count(html, /class="cell"/g)).toBe(8)
    expect(html).toContain('size:A4 landscape')
    expect(buildRubricPrintHtml(rubric, { ...base, layout: 'half' })).toContain('size:A4 portrait')
  })
  it('fills in names, shades marked levels and writes the total', () => {
    const slips = [
      { student: 'Mina', levels: { opinion: 4, reasons: 3 }, score: 21.5, maxScore: 24 },
      { student: 'Jun', note: 'absent' as const },
    ]
    const html = buildRubricPrintHtml(rubric, { ...base, layout: 'half' }, slips)
    expect(html).toContain('Mina')
    expect(html).toContain('21.5 / 24')
    expect(count(html, /class="lv on"/g)).toBe(2)
    expect(html).toContain('>Absent<')
    // Blank slips still get a date line; scored ones do not.
    expect(count(html, /class="lbl">Date</g)).toBe(0)
    expect(count(buildRubricPrintHtml(rubric, base), /class="lbl">Date</g)).toBe(1)
  })
  it('shows full descriptors except on quarter slips, and respects the toggles', () => {
    const full = buildRubricPrintHtml(rubric, base)
    expect(full).toContain(rubric.criteria[0].levels[2])
    expect(full).toContain('W.3.1')
    const quarter = buildRubricPrintHtml(rubric, { ...base, layout: 'quarter' })
    expect(quarter).not.toContain(rubric.criteria[0].levels[2])
    const bare = buildRubricPrintHtml(rubric, { ...base, showStandards: false, showZero: false, commentLine: false })
    expect(bare).not.toContain('W.3.1')
    expect(bare).toContain('cols-4')
    expect(bare).not.toContain('class="comment"')
    expect(full).toContain('cols-5')
  })
  it('uses Korean headings when asked', () => {
    const ko = buildRubricPrintHtml(rubric, { ...base, lang: 'ko' })
    expect(ko).toContain('이름')
    expect(ko).toContain('기준 충족')
    expect(ko).toContain('lang="ko"')
  })
  it('escapes rubric text', () => {
    expect(esc(`<b>"it's" & more</b>`)).toBe('&lt;b&gt;&quot;it&#39;s&quot; &amp; more&lt;/b&gt;')
    const html = buildRubricPrintHtml({ name: 'A <script> rubric', criteria: [{ key: 'x', label: 'Tom & Jerry', levels: ['a', 'b', 'c', '<i>d</i>'] }] }, base)
    expect(html).not.toContain('A <script>')
    expect(html).toContain('Tom &amp; Jerry')
    expect(html).toContain('&lt;i&gt;d&lt;/i&gt;')
  })
})

describe('scoredForItem (a rubric question inside an answer sheet)', () => {
  it('takes the levels from that question only, with the item points as the total', () => {
    const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    const responses = {
      a: { 1: { answer: 'B', points: 1 }, 6: { levels: { prompt: 4, ideas: 3 }, points: 17.5 } },
      b: { 1: { answer: 'A', points: 0 } },                 // no rubric marks yet
      c: { 6: { levels: {}, points: 0 } },                   // started but nothing marked
    }
    const flags = { d: { absent: true, exempt: false } }
    const out = scoredForItem(6, students, responses, flags)
    expect(out.a).toEqual({ levels: { prompt: 4, ideas: 3 }, score: 17.5 })
    expect(out.b).toBeUndefined()
    expect(out.c).toBeUndefined()
    expect(out.d).toEqual({ note: 'absent' })
    // A different question has no rubric marks for anyone.
    expect(Object.keys(scoredForItem(1, students, responses, flags))).toEqual(['d'])
  })
})
