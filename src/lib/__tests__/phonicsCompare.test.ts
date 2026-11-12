import { describe, it, expect } from 'vitest'
import type { LatestBySkill } from '@/lib/phonics'
import { masteryPosition, groupStats, checksSince, byPosition, median, meetsBasis, quartiles, levelingLanes, openCeiling, type MasteryPosition } from '@/lib/phonicsCompare'

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

describe('quartiles', () => {
  it('uses the medians of each half', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7])).toEqual({ q1: 2, q3: 6 })
    expect(quartiles([1, 2, 3, 4])).toEqual({ q1: 1.5, q3: 3.5 })
    expect(quartiles([5])).toEqual({ q1: 5, q3: 5 })
    expect(quartiles([])).toBeNull()
  })
})

describe('levelingLanes', () => {
  // A position as masteryPosition would give it: `at` meets the bar, tested to `to`.
  const P = (at: number, to = at + 1): MasteryPosition => ({ through: null, position: at, gaps: [], testedThrough: to, tested: to, unticked: 0 })
  const pos: Record<string, MasteryPosition> = {
    l1: P(3), l2: P(4), l3: P(12), l4: P(4, 4),
    d1: P(8), d2: P(9), d3: P(10), d4: P(2), d5: P(2, 2),
    s1: P(14), s2: P(15), s3: P(16),
  }
  const lanes = [
    { englishClass: 'Lily', placed: true, studentIds: ['l1', 'l2', 'l3', 'l4'] },
    { englishClass: 'Daisy', placed: true, studentIds: ['d1', 'd2', 'd3', 'd4', 'd5', 'dx'] },
    { englishClass: 'Sunflower', placed: true, studentIds: ['s1', 's2', 's3'] },
  ]
  const { lanes: out, flags } = levelingLanes(lanes, pos)

  it('gives each lane its median and middle range over tested students', () => {
    expect(out[1]).toMatchObject({ tested: 5, median: 8, range: { q1: 2, q3: 9.5 } })
  })

  it('flags a student who reaches the next class up', () => {
    expect(flags.l3).toEqual({ dir: 'up', likeClass: 'Daisy', likeMedian: 8, unsure: false })
    expect(flags.l1).toBeUndefined()
  })

  it('flags a student at or under the class below, unsure when never tested past their position', () => {
    expect(flags.d4).toEqual({ dir: 'down', likeClass: 'Lily', likeMedian: 4, unsure: false })
    expect(flags.d5).toMatchObject({ dir: 'down', unsure: true })
    expect(flags.dx).toBeUndefined()
  })

  it('does not flag against a neighbour that is not actually ahead', () => {
    const swapped = levelingLanes([lanes[2], lanes[0]], pos)
    expect(Object.keys(swapped.flags)).toEqual([])
  })

  it('leaves unplaced students out', () => {
    const r = levelingLanes([{ englishClass: 'Unplaced', placed: false, studentIds: ['l3'] }, lanes[1]], pos)
    expect(r.flags.l3).toBeUndefined()
  })
})

describe('openCeiling', () => {
  it('is true when the furthest sheet tested is the position', () => {
    expect(openCeiling({ through: 'cvc', position: 1, gaps: [], testedThrough: 1, tested: 1, unticked: 0 })).toBe(true)
    expect(openCeiling({ through: 'cvc', position: 1, gaps: [], testedThrough: 2, tested: 2, unticked: 0 })).toBe(false)
  })
})
