import { describe, it, expect } from 'vitest'
import { layoutDomainBars, domainBarsSvg, LETTER_BANDS } from '@/lib/domainBars'

const rows = [
  { key: 'reading', label: 'Reading', value: 50, classAvg: 100 },
  { key: 'phonics', label: 'Phonics', value: null, na: true, classAvg: 80 },
  { key: 'writing', label: 'Writing', value: 92.4, classAvg: null },
  { key: 'speaking', label: 'Speaking & Listening', value: null },
]
const letterOf = (v: number) => v >= 90 ? 'A' : v >= 80 ? 'B' : v >= 70 ? 'C' : v >= 60 ? 'D' : 'E'

describe('layoutDomainBars', () => {
  it('scales bars and class ticks across the plot', () => {
    const L = layoutDomainBars(rows)
    expect(L.rows[0].barW).toBeCloseTo(L.plotW / 2)
    expect(L.rows[0].tickX).toBeCloseTo(L.plotX + L.plotW)
    expect(L.rows[1].barW).toBe(0)
    expect(L.rows[1].tickX).toBeNull()
    expect(L.rows[2].tickX).toBeNull()
  })
  it('uses the school bands with E as the floor', () => {
    expect(LETTER_BANDS.map(b => b.letter)).toEqual(['E', 'D', 'C', 'B', 'A'])
    expect(LETTER_BANDS[0]).toEqual({ letter: 'E', from: 0, to: 60 })
  })
})

describe('domainBarsSvg', () => {
  it('draws a bar and letter for a graded area, and words for the rest', () => {
    const svg = domainBarsSvg(rows, { letterOf })
    expect(svg).toContain('92.4%</text>')
    expect(svg).toContain('>A</text>')
    expect(svg).toContain('50.0%</text>')
    expect(svg).toContain('>E</text>')
    expect(svg).toContain('Not assessed')
    expect(svg).toContain('No grade yet')
    expect(svg).toContain('Speaking &amp; Listening')
  })
  it('marks the class average only where there is one, and not when hidden', () => {
    const ticks = (s: string) => (s.match(/data-tick="1"/g) || []).length
    expect(ticks(domainBarsSvg(rows, { letterOf }))).toBe(1)
    expect(ticks(domainBarsSvg(rows, { letterOf, showClass: false }))).toBe(0)
    expect(domainBarsSvg(rows, { letterOf, showClass: false })).not.toContain('Class average')
  })
  it('colours the letter the way the caller asks', () => {
    expect(domainBarsSvg(rows, { letterOf, letterColorOf: l => l === 'A' ? '#16a34a' : '#000' })).toContain('fill="#16a34a">A<')
  })
})
