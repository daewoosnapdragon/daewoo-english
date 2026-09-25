import { describe, it, expect } from 'vitest'
import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import { PLAIN, SKILLS, SKILL_GROUPS, familyOf, plainName } from '@/components/curriculum/standards-plain'

describe('standards in plain language', () => {
  it('every code in the CCSS list has a plain name', () => {
    const missing = CCSS_STANDARDS.filter(s => !PLAIN[s.code]).map(s => s.code)
    expect(missing).toEqual([])
  })
  it('every plain name points at a real code', () => {
    const codes = new Set(CCSS_STANDARDS.map(s => s.code))
    const stray = Object.keys(PLAIN).filter(c => !codes.has(c))
    expect(stray).toEqual([])
  })
  it('every code belongs to a skill family in a known group', () => {
    const missing = CCSS_STANDARDS.filter(s => !SKILLS[familyOf(s.code)]).map(s => s.code)
    expect(missing).toEqual([])
    for (const f of Object.values(SKILLS)) expect(SKILL_GROUPS).toContain(f.group)
  })
  it('families resolve from codes and sub-codes', () => {
    expect(familyOf('RL.3.3')).toBe('RL.3')
    expect(familyOf('L.3.1a')).toBe('L.1')
    expect(familyOf('RF.1.2a')).toBe('RF.2')
    expect(familyOf('RL.K.10')).toBe('RL.10')
    expect(plainName('RL.3.3')).toMatch(/characters/i)
  })
})
