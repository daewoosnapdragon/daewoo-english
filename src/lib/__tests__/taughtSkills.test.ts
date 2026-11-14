import { describe, it, expect } from 'vitest'
import { taughtSkills, unitIdsFromPlanRows, codesFromAssessments, parsePicks, togglePick } from '@/lib/taughtSkills'
import { skillsOf, PHRASE_SKILLS, AREA_FAMILIES } from '@/lib/phraseSkills'

describe('taught skills', () => {
  it('merges the sources into families, with the teacher winning', () => {
    const t = taughtSkills({ planCodes: ['RL.3.2', 'RF.3.3a', 'rl.3.3'], assessedCodes: ['RL.3.2', 'W.3.1'], statusCodes: ['L.3.2'], picks: { add: ['SL.4'], remove: ['RF.3'] } })
    expect(Array.from(t.families).sort()).toEqual(['L.2', 'RL.2', 'RL.3', 'SL.4', 'W.1'])
    expect(t.source['RL.2']).toBe('assessed')
    expect(t.source['RL.3']).toBe('plans')
    expect(t.source['SL.4']).toBe('teacher')
  })
  it('ignores codes that are not standards', () => {
    expect(taughtSkills({ planCodes: ['', 'nonsense', 'ELD-SI.1'], assessedCodes: [], statusCodes: [], picks: { add: [], remove: [] } }).families.size).toBe(0)
  })
  it('reads unit ids out of saved plan days, JSON string or object', () => {
    const rows = [{ content: JSON.stringify({ subjects: [{ label: 'Reading', content: 'Unit 3', unit_id: 'u3' }, { label: '', content: '' }] }) }, { content: { subjects: [{ unit_id: 'u3' }, { unit_id: 'u4' }] } }, { content: 'not json' }]
    expect(unitIdsFromPlanRows(rows)).toEqual(['u3', 'u4'])
  })
  it('collects codes from tags, question maps and rubric criteria', () => {
    expect(codesFromAssessments([{ standards: [{ code: 'RL.3.2' }], question_map: [{ standard: 'RL.3.3' }, { rubric: { criteria: [{ standard: 'W.3.1' }, {}] } }] }, { standards: null }])).toEqual(['RL.3.2', 'RL.3.3', 'W.3.1'])
  })
  it('keeps the teacher picks as a small JSON value', () => {
    expect(parsePicks(null)).toEqual({ add: [], remove: [] })
    expect(parsePicks('{"add":["SL.4"],"remove":["RF.3"]}')).toEqual({ add: ['SL.4'], remove: ['RF.3'] })
    expect(parsePicks('garbage')).toEqual({ add: [], remove: [] })
    expect(togglePick({ add: [], remove: [] }, 'RF.3', true)).toEqual({ add: [], remove: ['RF.3'] })
    expect(togglePick({ add: [], remove: ['RF.3'] }, 'RF.3', false)).toEqual({ add: ['RF.3'], remove: [] })
  })
})

describe('phrase skill tags', () => {
  it('only use families the picker knows, and every skill area is covered', () => {
    const known = new Set(Object.values(AREA_FAMILIES).flat())
    for (const [key, fams] of Object.entries(PHRASE_SKILLS)) for (const f of fams) expect(known.has(f), `${key} → ${f}`).toBe(true)
    expect(skillsOf('reading-002')).toEqual(['RI.2'])
    expect(skillsOf('opener-001')).toEqual([])
    expect(skillsOf(null)).toEqual([])
  })
})
