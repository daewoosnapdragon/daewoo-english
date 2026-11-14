import { describe, it, expect } from 'vitest'
import { carryOverCandidates, assessmentCounts } from '@/lib/classNa'

describe('class N/A by document', () => {
  it('offers to carry over only the areas October had and the report card lacks', () => {
    expect(carryOverCandidates({ phonics: true, writing: true }, { writing: true })).toEqual(['phonics'])
    expect(carryOverCandidates({}, { phonics: true })).toEqual([])
  })
  it('counts assessments per area, mixed ones in every area they touch', () => {
    const c = assessmentCounts([{ domain: 'reading' }, { domain: 'reading' }, { domain: 'phonics', mixed: false }, { domain: 'reading', mixed: true, domain_split: { reading: 10, language: 4, phonics: 0 } }, { domain: 'oddball' }])
    expect(c).toEqual({ reading: 3, phonics: 1, writing: 0, speaking: 0, language: 1 })
  })
})
