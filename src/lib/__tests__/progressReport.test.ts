import { describe, it, expect } from 'vitest'
import { progressSizeFor, packSheets, sheetSummary, HALF_COMMENT_MAX } from '@/lib/progressReport'

describe('progressSizeFor', () => {
  it('is a half page with no comment, a skipped comment, or a short one', () => {
    expect(progressSizeFor('', false)).toBe('half')
    expect(progressSizeFor('   ', false)).toBe('half')
    expect(progressSizeFor('x'.repeat(2000), true)).toBe('half')
    expect(progressSizeFor('x'.repeat(HALF_COMMENT_MAX), false)).toBe('half')
  })
  it('is a full page once the comment is longer than a half page holds', () => {
    expect(progressSizeFor('x'.repeat(HALF_COMMENT_MAX + 1), false)).toBe('full')
  })
})

describe('packSheets', () => {
  const it_ = (size: 'full' | 'half', item: string) => ({ size, item })
  it('pairs half pages two to a sheet and gives full pages their own', () => {
    const sheets = packSheets([it_('half', 'A'), it_('half', 'B'), it_('full', 'C'), it_('half', 'D')])
    expect(sheets).toEqual([{ kind: 'halves', top: 'A', bottom: 'B' }, { kind: 'full', item: 'C' }, { kind: 'halves', top: 'D', bottom: null }])
    expect(sheetSummary(sheets)).toEqual({ sheets: 3, fullPages: 1, halfPages: 3 })
  })
  it('lets a half page wait across a full page for its partner', () => {
    const sheets = packSheets([it_('half', 'A'), it_('full', 'B'), it_('half', 'C')])
    expect(sheets).toEqual([{ kind: 'full', item: 'B' }, { kind: 'halves', top: 'A', bottom: 'C' }])
  })
  it('handles an empty class', () => {
    expect(packSheets([])).toEqual([])
    expect(sheetSummary([])).toEqual({ sheets: 0, fullPages: 0, halfPages: 0 })
  })
})
