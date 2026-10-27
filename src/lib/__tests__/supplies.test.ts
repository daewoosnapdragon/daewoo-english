import { describe, it, expect } from 'vitest'
import { parseReceiptLines, matchItem, matchRequest, isLow, fullCountStatus, toSingles, fmtQty, splitPacks, budgetSummary } from '@/lib/suppliesCore'

const items = [
  { id: 'a4', name: 'A4 paper', aliases: ['복사용지', 'A4 용지', 'copy paper'] },
  { id: 'mk', name: 'Whiteboard markers', aliases: ['보드마카', 'board marker'] },
  { id: 'tp', name: 'Tape', aliases: ['테이프'] },
]
const a4 = { unit: 'ream', pack_size: 5, pack_name: 'box' }
const toner = { unit: 'cartridge', pack_size: null, pack_name: '' }

describe('parseReceiptLines', () => {
  it('reads the common shapes, with units and prices', () => {
    const lines = parseReceiptLines(`A4 paper | 2 boxes | 45,000
Whiteboard markers, 3 packs, 12000원
Tape x2
2 x Glue sticks
Sticky notes 4 packs 8,000원
복사용지 3개
Coffee 12,000원
Milk
- Erasers | 1 | ₩3,500`)
    expect(lines.map(l => [l.name, l.qty, l.unit, l.price])).toEqual([
      ['A4 paper', 2, 'boxes', 45000],
      ['Whiteboard markers', 3, 'packs', 12000],
      ['Tape', 2, undefined, undefined],
      ['Glue sticks', 2, undefined, undefined],
      ['Sticky notes', 4, 'packs', 8000],
      ['복사용지', 3, '개', undefined],
      ['Coffee', 1, undefined, 12000],
      ['Milk', 1, undefined, undefined],
      ['Erasers', 1, undefined, 3500],
    ])
  })
  it('skips blank lines, a header row and totals', () => {
    expect(parseReceiptLines('item | qty | price\n\nTape | 1 | 2000\nTotal | 2000\n').map(l => [l.name, l.qty, l.price])).toEqual([['Tape', 1, 2000]])
  })
})

describe('packs', () => {
  it('turns packs into singles when the unit word says pack', () => {
    expect(toSingles(a4, 2, 'boxes')).toBe(10)
    expect(toSingles(a4, 2, 'box')).toBe(10)
    expect(toSingles(a4, 2, 'packs')).toBe(10)
    expect(toSingles(a4, 2, 'reams')).toBe(2)
    expect(toSingles(a4, 2, undefined)).toBe(2)
    expect(toSingles(toner, 2, 'box')).toBe(2)
  })
  it('shows packs and loose', () => {
    expect(fmtQty(a4, 7)).toBe('1 box + 2 reams')
    expect(fmtQty(a4, 10)).toBe('2 boxes')
    expect(fmtQty(a4, 10, true)).toBe('2 boxes (10 reams)')
    expect(fmtQty(a4, 1)).toBe('1 ream')
    expect(fmtQty(a4, 0)).toBe('0')
    expect(fmtQty(toner, 3)).toBe('3 cartridges')
    expect(splitPacks(a4, 12)).toEqual({ packs: 2, loose: 2 })
  })
})

describe('matching', () => {
  it('matches exact names, aliases, and names inside longer lines', () => {
    expect(matchItem('A4 paper', items)).toBe('a4')
    expect(matchItem('복사용지 80g 2500매', items)).toBe('a4')
    expect(matchItem('Board marker black 12', items)).toBe('mk')
    expect(matchItem('Scotch tape 18mm', items)).toBe('tp')
    expect(matchItem('Printer toner', items)).toBeNull()
  })
  it('matches an open request but not a closed one', () => {
    const reqs = [{ id: 'r1', name: 'Halloween stickers', status: 'needed' as const }, { id: 'r2', name: 'Laminating pouches', status: 'arrived' as const }]
    expect(matchRequest('Halloween stickers x3', reqs)).toBe('r1')
    expect(matchRequest('Laminating pouches', reqs)).toBeNull()
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

describe('budgetSummary', () => {
  it('adds purchases up per teacher, for the office, and by month', () => {
    const purchases = [
      { date: '2026-09-03', kind: 'stock' as const, price: 45000, for_teacher_id: null },
      { date: '2026-09-20', kind: 'oneoff' as const, price: 12000, for_teacher_id: 't1' },
      { date: '2026-10-02', kind: 'oneoff' as const, price: 30000, for_teacher_id: 't1' },
      { date: '2026-10-02', kind: 'oneoff' as const, price: 8000, for_teacher_id: null },
      { date: '2026-10-15', kind: 'stock' as const, price: 5000, for_teacher_id: null },
    ]
    const budgets = [{ teacher_id: 't1', amount: 100000 }, { teacher_id: null, amount: 200000 }]
    const s = budgetSummary(purchases, budgets, ['t1', 't2'])
    expect(s.teachers).toEqual([
      { teacherId: 't1', allowance: 100000, spent: 42000, remaining: 58000, count: 2 },
      { teacherId: 't2', allowance: 0, spent: 0, remaining: 0, count: 0 },
    ])
    expect(s.office).toEqual({ allowance: 200000, stock: 50000, events: 8000, spent: 58000, remaining: 142000 })
    expect(s.months).toEqual([{ key: '2026-09', stock: 45000, oneoff: 12000, total: 57000 }, { key: '2026-10', stock: 5000, oneoff: 38000, total: 43000 }])
    expect(s.total).toBe(100000)
  })
})
