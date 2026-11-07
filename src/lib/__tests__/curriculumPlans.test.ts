import { describe, it, expect } from 'vitest'
import { applyPatches, blockBars, deviations, effectiveRows, layoutPacing, planSignature, reflowTo, type CurriculumBlock, type CurriculumPacing } from '../curriculumPacing'
import type { CurriculumUnit } from '../curriculumCore'

const unit = (id: string): CurriculumUnit => ({ id, book_id: 'b1', sort_order: 0, title: id, summary: '', skill_tags: [], ccss_codes: [], default_weeks: 2, source: 'claude', confirmed_by: null, confirmed_at: null, drive_folder_url: '', created_at: '', updated_at: '' })
const row = (id: string, unit_id: string, sort_order: number, weeks: number, extra: Partial<CurriculumPacing> = {}): CurriculumPacing => ({ id, placement_id: 'p1', unit_id, sort_order, weeks, owner: 'master', teacher_id: null, gap_before: 0, fixed: false, done_at: null, created_at: '', updated_at: '', ...extra })
const units = [unit('u1'), unit('u2'), unit('u3'), unit('u4')]
const master = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 3), row('c', 'u3', 3, 2), row('d', 'u4', 4, 1)]

describe('gaps in the layout', () => {
  it('adds a gap before a unit', () => {
    const rows = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 3, { gap_before: 1.5 })]
    expect(layoutPacing(rows, units).map(b => [b.start, b.end])).toEqual([[1, 2], [4.5, 6.5]])
  })
})

describe('effectiveRows', () => {
  const mine = [row('x', 'u1', 1, 4, { owner: 'teacher', teacher_id: 't1' })]
  it('uses the teacher’s copy when there is one, else the master', () => {
    expect(effectiveRows([...master, ...mine], 'p1', 't1').map(r => r.id)).toEqual(['x'])
    expect(effectiveRows([...master, ...mine], 'p1', 't2').map(r => r.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(effectiveRows([...master, ...mine], 'p1', null).map(r => r.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('reflowTo, "we’re here"', () => {
  it('behind the plan: the unit gets a gap and everything after moves', () => {
    // u2 is planned for week 3; the class only reaches it in week 5.
    const patches = reflowTo(master, units, 'u2', 5)
    expect(patches).toEqual([{ id: 'b', gap_before: 2 }])
    const after = layoutPacing(applyPatches(master, patches), units)
    expect(after.map(b => [b.unit.id, b.start])).toEqual([['u1', 1], ['u2', 5], ['u3', 8], ['u4', 10]])
  })
  it('ahead of the plan: the earlier units get shorter, latest first, never under half a week', () => {
    // u3 is planned for week 6; the class is ready in week 4.
    const patches = reflowTo(master, units, 'u3', 4)
    expect(patches).toEqual([{ id: 'b', gap_before: 0, weeks: 1, fixed: true }])   // a shortened unit keeps its length
    const after = layoutPacing(applyPatches(master, patches), units)
    expect(after.map(b => [b.unit.id, b.start])).toEqual([['u1', 1], ['u2', 3], ['u3', 4], ['u4', 6]])
  })
  it('ahead by more than one unit can give: it keeps taking from earlier units', () => {
    const patches = reflowTo(master, units, 'u3', 2)
    expect(patches).toEqual([{ id: 'b', gap_before: 0, weeks: 0.5, fixed: true }, { id: 'a', gap_before: 0, weeks: 0.5, fixed: true }])
    expect(layoutPacing(applyPatches(master, patches), units).find(b => b.unit.id === 'u3')!.start).toBe(2)
  })
  it('uses an existing gap before shortening anything', () => {
    const rows = [row('a', 'u1', 1, 2), row('b', 'u2', 2, 3, { gap_before: 2 })]  // u2 at week 5
    expect(reflowTo(rows, units, 'u2', 4)).toEqual([{ id: 'b', gap_before: 1 }])
  })
  it('does nothing for a unit not in the plan or already there', () => {
    expect(reflowTo(master, units, 'nope', 3)).toEqual([])
    expect(reflowTo(master, units, 'u2', 3)).toEqual([])
  })
})

describe('deviations', () => {
  it('reads later, longer, dropped and added against the master', () => {
    const mine = [
      row('x1', 'u1', 1, 2, { owner: 'teacher', teacher_id: 't1' }),
      row('x2', 'u2', 2, 4, { owner: 'teacher', teacher_id: 't1', gap_before: 1 }),
      row('x4', 'u4', 3, 1, { owner: 'teacher', teacher_id: 't1' }),
    ]
    const d = deviations(master, mine, units)
    // u4 lands on week 8 either way: the gap and the extra week cancel the dropped unit.
    expect(d.map(x => `${x.unit.id}:${x.kind}:${x.by}`)).toEqual(['u2:later:1', 'u2:longer:1', 'u3:dropped:0'])
  })
  it('is empty for an untouched copy', () => {
    const copy = master.map(r => ({ ...r, id: 'c' + r.id, owner: 'teacher' as const, teacher_id: 't1' }))
    expect(deviations(master, copy, units)).toEqual([])
    expect(planSignature(copy)).toBe(planSignature(master))
  })
})

describe('blockBars', () => {
  const block = (id: string, start_week: number, weeks: number, term: 'fall' | 'spring' = 'fall'): CurriculumBlock => ({ id, teacher_id: 't1', english_class: 'Daisy', grade: 2, academic_year: '2027-2028', term, title: id, strand: 'other', skill_tags: [], start_week, weeks, notes: '', created_at: '', updated_at: '' })
  it('places blocks in the view and clips at the end', () => {
    const bars = blockBars([block('a', 3, 2), block('b', 17, 4), block('c', 1, 1, 'spring')], 'Daisy', 2, '2027-2028', 'fall', 't1', 18)
    expect(bars.map(b => [b.id, b.viewStart, b.viewEnd])).toEqual([['a', 3, 4], ['b', 17, 18]])
  })
})
