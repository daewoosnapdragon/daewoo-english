import { describe, it, expect } from 'vitest'
import { parseReceiptLines, matchItem, isLow, fullCountStatus } from '@/lib/suppliesCore'

const items = [
  { id: 'a4', name: 'A4 paper', aliases: ['복사용지', 'A4 용지', 'copy paper'] },
  { id: 'mk', name: 'Whiteboard markers', aliases: ['보드마카', 'board marker'] },
  { id: 'tp', name: 'Tape', aliases: ['테이프'] },
]

describe('parseReceiptLines', () => {
  it('reads the common shapes and ignores prices', () => {
    const lines = parseReceiptLines(`A4 paper | 2
Whiteboard markers, 3
Tape x2
2 x Glue sticks
Sticky notes 4 packs
복사용지 3개
Coffee 12,000원
Milk`)
    expect(lines.map(l => [l.name, l.qty])).toEqual([
      ['A4 paper', 2], ['Whiteboard markers', 3], ['Tape', 2], ['Glue sticks', 2], ['Sticky notes', 4], ['복사용지', 3], ['Coffee', 1], ['Milk', 1],
    ])
  })
  it('skips blank lines and a header row', () => {
    expect(parseReceiptLines('item | qty\n\nTape | 1\n')).toEqual([{ name: 'Tape', qty: 1, raw: 'Tape | 1' }])
  })
})

describe('matchItem', () => {
  it('matches exact names, aliases, and names inside longer lines', () => {
    expect(matchItem('A4 paper', items)).toBe('a4')
    expect(matchItem('복사용지 80g 2500매', items)).toBe('a4')
    expect(matchItem('Board marker black 12', items)).toBe('mk')
    expect(matchItem('Scotch tape 18mm', items)).toBe('tp')
    expect(matchItem('Printer toner', items)).toBeNull()
  })
})

describe('isLow and fullCountStatus', () => {
  it('is low under par, or when flagged since the last count', () => {
    expect(isLow({ on_hand: 0, par: 1, low_flagged_at: null, last_counted_at: null })).toBe(true)
    expect(isLow({ on_hand: 3, par: 1, low_flagged_at: null, last_counted_at: null })).toBe(false)
    expect(isLow({ on_hand: 3, par: 1, low_flagged_at: '2026-10-20T00:00:00Z', last_counted_at: '2026-10-10T00:00:00Z' })).toBe(true)
    expect(isLow({ on_hand: 3, par: 1, low_flagged_at: '2026-10-05T00:00:00Z', last_counted_at: '2026-10-10T00:00:00Z' })).toBe(false)
  })
  it('says when the full count is due', () => {
    const now = new Date('2026-10-27T00:00:00Z')
    expect(fullCountStatus([{ last_counted_at: '2026-10-01T00:00:00Z', last_count_kind: 'full' }, { last_counted_at: '2026-10-20T00:00:00Z', last_count_kind: 'quick' }], 30, now)).toEqual({ last: '2026-10-01T00:00:00Z', due: false, daysAgo: 26 })
    expect(fullCountStatus([{ last_counted_at: '2026-09-01T00:00:00Z', last_count_kind: 'full' }], 30, now).due).toBe(true)
    expect(fullCountStatus([{ last_counted_at: null, last_count_kind: null }], 30, now)).toEqual({ last: null, due: true, daysAgo: null })
    expect(fullCountStatus([], 30, now).due).toBe(false)
  })
})
