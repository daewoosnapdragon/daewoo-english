import { describe, it, expect } from 'vitest'
import type { LatestBySkill } from '@/lib/phonics'
import { masteryPosition, groupStats, checksSince, byPosition, median, meetsBasis } from '@/lib/phonicsCompare'

const sc = (skill: string, pct: number, automatic = false) => ({
  score: { skill, correct: pct / 5, errors: 20 - pct / 5, unread: 0, total: 20, pct, automatic },
  date: '2026-11-01', checkId: 'c',
})
const latest = (...xs: ReturnType<typeof sc>[]): LatestBySkill => Object.fromEntries(xs.map(x => [x.score.skill, x]))

describe('meetsBasis', () => {
  it('mastered needs the band; secure takes proficient too', () => {
    expect(meetsBasis('mastered', 'mastered')).toBe(true)
    expect(meetsBasis('proficient', 'mastered')).toBe(false)
    expect(meetsBasis('proficient', 'secure')).toBe(true)
    expect(meetsBasis('developing', 'secure')).toBe(false)
  })
})

describe('masteryPosition', () => {
  it('is zero for a student never checked', () => {
    expect(masteryPosition({}, 'mastered')).toEqual({ through: null, position: 0, gaps: [], testedThrough: 0, tested: 0, unticked: 0 })
  })

  it('is the furthest mastered sheet in packet order, with earlier weak sheets as gaps', () => {
    // cvc (1) mastered, digraphs (2) developing, silent_e (7) mastered, vowel_teams (9) beginning
    const l = latest(sc('cvc', 100, true), sc('digraphs', 75), sc('silent_e', 95, true), sc('vowel_teams', 40))
    const p = masteryPosition(l, 'mastered')
    expect(p.through).toBe('silent_e')
    expect(p.position).toBe(7)
    expect(p.gaps).toEqual(['digraphs'])
    expect(p.testedThrough).toBe(9)
    expect(p.tested).toBe(4)
  })

  it('counts 90%+ without the automatic tick, which mastered does not accept and secure does', () => {
    const l = latest(sc('cvc', 100, true), sc('blends', 95))
    expect(masteryPosition(l, 'mastered')).toMatchObject({ through: 'cvc', position: 1, unticked: 1 })
    expect(masteryPosition(l, 'secure')).toMatchObject({ through: 'blends', position: 3, gaps: [] })
  })

  it('does not call an unticked 90%+ sheet below the position a gap', () => {
    const l = latest(sc('cvc', 95), sc('blends', 100, true))
    expect(masteryPosition(l, 'mastered')).toMatchObject({ through: 'blends', gaps: [] })
  })
})

describe('groupStats', () => {
  const by: Record<string, LatestBySkill> = {
    a: latest(sc('cvc', 100, true), sc('digraphs', 100, true)),
    b: latest(sc('cvc', 95, true), sc('digraphs', 60)),
    c: latest(sc('cvc', 80), sc('digraphs', 100, true)),
    d: {},
  }
  const g = groupStats(['a', 'b', 'c', 'd'], by, 'mastered')

  it('gives each sheet the share of tested students meeting the bar', () => {
    expect(g.bySheet.cvc).toEqual({ tested: 3, meeting: 2, pct: 67, thin: false })
    expect(g.bySheet.blends).toEqual({ tested: 0, meeting: 0, pct: null, thin: true })
  })

  it('takes the median position over tested students only', () => {
    expect(g.students).toBe(4)
    expect(g.tested).toBe(3)
    // a 2, b 1, c 2
    expect(g.medianPosition).toBe(2)
  })

  it('puts the edge at the first well-tested sheet under 70%', () => {
    expect(g.edge).toBe('cvc')
    // Proficient+ without the tick: c reaches 90% on CVC, so CVC is got and digraphs (2 of 3) is next
    const by2 = { ...by, c: latest(sc('cvc', 90), sc('digraphs', 100, true)) }
    expect(groupStats(['a', 'b', 'c'], by2, 'secure').edge).toBe('digraphs')
  })

  it('ignores thinly tested sheets for the edge', () => {
    expect(groupStats(['b'], by, 'mastered').edge).toBeNull()
  })
})

describe('median', () => {
  it('handles odd, even and empty', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('checksSince', () => {
  const rows = [{ date: '2026-09-01' }, { date: '2026-11-02' }] as any
  it('keeps checks on or after the date, or all of them when empty', () => {
    expect(checksSince(rows, '2026-11-02')).toHaveLength(1)
    expect(checksSince(rows, '')).toHaveLength(2)
  })
})

describe('byPosition', () => {
  it('sorts highest position first and untested last', () => {
    const studs = [{ id: 'x', english_name: 'X' }, { id: 'y', english_name: 'Y' }, { id: 'z', english_name: 'Z' }]
    const pos = {
      x: masteryPosition({}, 'mastered'),
      y: masteryPosition(latest(sc('cvc', 100, true)), 'mastered'),
      z: masteryPosition(latest(sc('blends', 100, true)), 'mastered'),
    }
    expect(byPosition(studs, pos).map(s => s.id)).toEqual(['z', 'y', 'x'])
  })
})
