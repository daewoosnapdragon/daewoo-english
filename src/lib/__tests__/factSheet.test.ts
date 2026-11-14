import { describe, it, expect } from 'vitest'
import { pointChange, letterChange, assessmentsUpTo, midtermAsOf, letterRows, noticings, nextWithoutComment, rubricPieces } from '@/lib/factSheet'

describe('changes', () => {
  it('formats point and letter changes', () => {
    expect(pointChange(70, 74)).toBe('+4')
    expect(pointChange(77, 74)).toBe('−3')
    expect(pointChange(74, 74.4)).toBe('0')
    expect(pointChange(null, 74)).toBeNull()
    expect(letterChange(88, 91)).toBe('B+ → A-')
    expect(letterChange(84, 85)).toBe('B')
    expect(letterChange(84, undefined)).toBeNull()
  })
  it('dates the progress report at the cutoff or the day its comment was saved, whichever is later', () => {
    expect(midtermAsOf('2026-10-15', '2026-10-21T08:30:00+09:00')).toBe('2026-10-21')
    expect(midtermAsOf('2026-10-15', '2026-10-02T08:30:00Z')).toBe('2026-10-15')
    expect(midtermAsOf('2026-10-15', null)).toBe('2026-10-15')
    expect(midtermAsOf(null, '2026-10-21')).toBeNull()
  })
  it('keeps only the assessments the progress report was built from', () => {
    const as = [{ id: 'a', date: '2026-09-20' }, { id: 'b', date: '2026-10-20' }, { id: 'c', date: null }]
    expect(assessmentsUpTo(as, '2026-10-15').map(a => a.id)).toEqual(['a'])
    expect(assessmentsUpTo(as, null)).toEqual([])
  })
  it('builds the letter rows with both changes', () => {
    const rows = letterRows({ reading: 86, phonics: 90, writing: 74, speaking: 83, language: 85 }, { phonics: true } as any,
      { reading: 82, phonics: 90, writing: 77, speaking: 82, language: 85 }, { reading: 84, phonics: null, writing: 78, speaking: 81, language: 85 })
    const w = rows.find(r => r.domain === 'writing')!
    expect(w.letter).toBe('C'); expect(w.sinceMidterm).toBe('−3'); expect(w.sinceLast).toBe('C+ → C')
    expect(rows.find(r => r.domain === 'phonics')!.na).toBe(true)
    expect(rows.find(r => r.domain === 'phonics')!.score).toBeNull()
  })
})

const ASSESSMENTS = [
  { id: 'op', name: 'Opinion paragraph', date: '2026-11-04', question_map: [{ num: 1, type: 'rubric', max_points: 12, rubric: { criteria: [{ key: 'ideas', label: 'Ideas', standard: 'W.3.1' }, { key: 'org', label: 'Organization', standard: 'W.3.1' }, { key: 'conv', label: 'Conventions', standard: 'L.3.2' }] } }] },
  { id: 'u3', name: 'Unit 3 reading test', date: '2026-10-28', question_map: [
    { num: 1, max_points: 1, standard: 'RL.3.2' }, { num: 2, max_points: 1, standard: 'RL.3.2' }, { num: 3, max_points: 1, standard: 'RL.3.2' }, { num: 4, max_points: 1, standard: 'RL.3.2' },
    { num: 5, max_points: 1, standard: 'RL.3.3' }, { num: 6, max_points: 1, standard: 'RL.3.3' }, { num: 7, max_points: 1, standard: 'RL.3.3' }, { num: 8, max_points: 1, standard: 'RL.3.3' },
  ] },
]
const GRADES = [
  { assessment_id: 'op', rubric_scores: { ideas: 4, org: 2, conv: 3 } },
  { assessment_id: 'u3', item_responses: [1, 2, 3, 4].map(q => ({ q, points: q === 1 ? 1 : 0, max: 1 })).concat([5, 6, 7, 8].map(q => ({ q, points: 1, max: 1 }))) },
]

describe('what the app noticed', () => {
  const base = {
    cur: { reading: 86, phonics: 90, writing: 74, speaking: 83, language: 85 }, na: {},
    midterm: { reading: 82, phonics: 90, writing: 77, speaking: 82, language: 85 }, prev: null,
    assessments: ASSESSMENTS, grades: GRADES, readingNotes: [], behaviorLogs: [], absences: 0, tardies: 0,
  }
  it('names the weakest and strongest areas with their movement', () => {
    const n = noticings(base)
    expect(n[0]).toBe('Writing is the weakest area and slipped 3 points since the progress report.')
    expect(n[1]).toBe('Phonics is the strongest.')
  })
  it('reports the latest rubric by criterion and the most-missed standard by plain name', () => {
    const n = noticings({ ...base, standardName: c => (c === 'RL.3.2' ? 'central message' : c) })
    expect(n).toContain('Opinion paragraph, 4 Nov: Ideas 4, Organization 2, Conventions 3 (out of 4).')
    expect(n).toContain('Most-missed standard: RL.3.2, central message (25% of points).')
  })
  it('reads criterion labels from an assessment-level rubric', () => {
    const n = noticings({ ...base, assessments: [{ id: 'dd', name: 'Debate Discussion', date: '2026-11-06', rubric: { criteria: [{ key: 'listening', label: 'Listening' }, { key: 'on_topic_talk', label: 'On-topic talk' }] } }], grades: [{ assessment_id: 'dd', rubric_scores: { listening: 3, on_topic_talk: 2 } }] })
    expect(n).toContain('Debate Discussion, 6 Nov: Listening 3, On-topic talk 2 (out of 4).')
  })
  it('adds the latest reading and behavior notes and heavy absence', () => {
    const n = noticings({ ...base, readingNotes: [{ date: '2026-09-10', notes: 'word by word' }, { date: '2026-10-30', notes: 'self-corrects now' }],
      behaviorLogs: [{ date: '2026-10-22', note: 'helped two classmates' }, { date: '2026-09-01', note: '' }], absences: 4, tardies: 1 })
    expect(n).toContain('Reading check, 30 Oct: “self-corrects now”')
    expect(n).toContain('Behavior, 22 Oct: “helped two classmates”')
    expect(n[n.length - 1]).toBe('Absent 4 days, tardy 1.')
  })
  it('says nothing when there is nothing to say', () => {
    expect(noticings({ cur: {}, na: {}, midterm: null, prev: null, assessments: [], grades: [], readingNotes: [], behaviorLogs: [], absences: 1, tardies: 0 })).toEqual([])
  })
  it('skips the strongest line when the spread is small and the standard when nothing is really missed', () => {
    const n = noticings({ ...base, cur: { reading: 84, phonics: 86, writing: 83, speaking: 85, language: 85 }, midterm: null,
      grades: [{ assessment_id: 'u3', item_responses: [1, 2, 3, 4, 5, 6, 7, 8].map(q => ({ q, points: 1, max: 1 })) }] })
    expect(n).toEqual(['Writing is the weakest area.'])
  })
})

describe('rubric pieces with descriptors', () => {
  const LV = (s: string): [string, string, string, string] => [`${s} 1`, `${s} 2`, `${s} 3`, `${s} 4`]
  const assessments = [
    { id: 'dd', name: 'Debate Discussion', date: '2026-11-06', rubric: { name: 'Discussion', criteria: [{ key: 'listening', label: 'Listening', levels: LV('listens'), standard: 'SL.4.1' }, { key: 'talk', label: 'On-topic talk', levels: LV('talks') }, { key: 'extra', label: 'Unused' }] } },
    { id: 'op', name: 'Opinion paragraph', date: '2026-11-04', question_map: [{ num: 3, type: 'rubric', max_points: 8, rubric: { name: 'Opinion', criteria: [{ key: 'ideas', label: 'Ideas', levels: LV('ideas') }, { key: 'org', label: 'Organization', levels: LV('order') }] } }] },
    { id: 'mc', name: 'Unit test', date: '2026-11-10', question_map: [{ num: 1, max_points: 1, standard: 'RL.4.1' }] },
  ]
  const grades = [
    { assessment_id: 'dd', rubric_scores: { listening: 3, talk: 0 } },
    { assessment_id: 'op', item_responses: [{ q: 3, points: 6, max: 8, levels: { ideas: 4, org: 2 } }] },
    { assessment_id: 'mc', item_responses: [{ q: 1, points: 1, max: 1 }] },
  ]
  it('lists each rubric piece newest first with the descriptor of the level scored', () => {
    const p = rubricPieces(assessments, grades)
    expect(p.map(x => x.name)).toEqual(['Debate Discussion', 'Opinion paragraph'])
    const dd = p[0]
    expect(dd.rubricName).toBe('Discussion')
    expect(dd.criteria.map(c => [c.label, c.score, c.descriptor])).toEqual([['Listening', 3, 'listens 3'], ['On-topic talk', 0, null], ['Unused', null, null]])
    expect(dd.criteria[0].standard).toBe('SL.4.1')
    expect(dd.earned).toBe(3); expect(dd.possible).toBe(8)
    expect(p[1].criteria.map(c => c.descriptor)).toEqual(['ideas 4', 'order 2'])
  })
  it('skips absent papers and pieces with nothing scored', () => {
    expect(rubricPieces(assessments, [{ assessment_id: 'dd', is_absent: true, rubric_scores: { listening: 3 } }, { assessment_id: 'dd', rubric_scores: {} }])).toEqual([])
  })
})

describe('next student without a comment', () => {
  const roster = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
  it('walks forward from the current student and wraps around', () => {
    const done = new Set(['a', 'c'])
    expect(nextWithoutComment(roster, 'b', id => done.has(id))!.id).toBe('d')
    expect(nextWithoutComment(roster, 'd', id => done.has(id))!.id).toBe('b')
  })
  it('is null when everyone else has one', () => {
    expect(nextWithoutComment(roster, 'b', id => id !== 'b')).toBeNull()
  })
})
