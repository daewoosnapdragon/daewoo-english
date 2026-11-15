import { describe, it, expect } from 'vitest'
import { applyOverrides, parseOverrides, releasedWith, setOverride, visibleEntries } from '@/lib/whatsNewOverrides'
import type { WhatsNewEntry } from '@/content/whats-new'

const entries: WhatsNewEntry[] = [
  { id: 'a', date: '2026-11-16', title: 'A', body: '' },
  { id: 'b', date: '2026-11-09', title: 'B', body: '' },
  { id: 'c', date: '2026-10-27', title: 'C', body: '' },
]
const today = '2026-11-15'

describe('parseOverrides', () => {
  it('reads the stored JSON and drops anything malformed', () => {
    expect(parseOverrides('{"a":{"date":"2026-11-23"},"b":{"off":true},"c":{"off":false,"date":"soon"},"d":"x"}'))
      .toEqual({ a: { date: '2026-11-23' }, b: { off: true } })
    expect(parseOverrides(null)).toEqual({})
    expect(parseOverrides('not json')).toEqual({})
    expect(parseOverrides([1])).toEqual({})
  })
})

describe('setOverride', () => {
  it('merges a patch and drops a row that no longer changes anything', () => {
    let o = setOverride({}, 'a', { off: true })
    expect(o).toEqual({ a: { off: true } })
    o = setOverride(o, 'a', { date: '2026-11-23' })
    expect(o).toEqual({ a: { off: true, date: '2026-11-23' } })
    o = setOverride(o, 'a', { off: false })
    expect(o).toEqual({ a: { date: '2026-11-23' } })
    o = setOverride(o, 'a', { date: undefined })
    expect(o).toEqual({})
  })
})

describe('applyOverrides / visibleEntries', () => {
  it('moves dates, keeps the code date, and marks what changed', () => {
    const eff = applyOverrides(entries, { a: { date: '2026-11-23' }, c: { off: true } })
    expect(eff.map(e => [e.id, e.date, e.codeDate, e.off, e.overridden])).toEqual([
      ['a', '2026-11-23', '2026-11-16', false, true],
      ['b', '2026-11-09', '2026-11-09', false, false],
      ['c', '2026-10-27', '2026-10-27', true, true],
    ])
  })
  it('hides off entries and held ones unless scheduled are asked for', () => {
    const eff = applyOverrides(entries, { c: { off: true } })
    expect(visibleEntries(eff, today).map(e => e.id)).toEqual(['b'])
    expect(visibleEntries(eff, today, true).map(e => e.id)).toEqual(['a', 'b'])
  })
  it('releases an entry early when its date is moved to today', () => {
    expect(releasedWith(entries, { a: { date: today } }, today).map(e => e.id)).toEqual(['a', 'b', 'c'])
    expect(releasedWith(entries, {}, today).map(e => e.id)).toEqual(['b', 'c'])
  })
})
