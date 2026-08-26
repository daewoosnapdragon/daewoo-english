'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, Search, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'
import { calculateG2Band, bandScalesFromG2, bandScalesFromG3, bandScalesFromG4, bandScalesFromG5 } from './grade2Band'
import { getG2Content, g2VersionKeyForTest, g2StandardDescriptions } from './grade2Content'
import { getG3Content, g3VersionKeyForTest, g3StandardDescriptions } from './grade3Content'
import { getG4Content, g4VersionKeyForTest, g4StandardDescriptions } from './grade4Content'
import { getG5Content, g5VersionKeyForTest, g5StandardDescriptions } from './grade5Content'

// Every CCSS code any grade tests, with the guide's own wording. Built once:
// a persisted score carries the code and the met/total and nothing else, and
// "RI.5.1" on its own tells a teacher nothing about what was asked.
const STANDARD_TEXT: Record<string, string> = {
  ...g2StandardDescriptions(), ...g3StandardDescriptions(),
  ...g4StandardDescriptions(), ...g5StandardDescriptions(),
}

/** The wording for an anchor: take the highest grade's phrasing of it. */
function anchorText(codes: string[]): string | null {
  const withText = codes.filter(c => STANDARD_TEXT[c])
  if (withText.length === 0) return null
  const best = withText.sort((a, b) => (standardGrade(b) ?? 0) - (standardGrade(a) ?? 0))[0]
  return STANDARD_TEXT[best]
}

// The writing rubric is scored by category, not by question, so it never
// reaches written_standards_mastery -- that is built from the multiple choice
// alone. Categories are stable enough across grades to track: content,
// language_grammar and mechanics run the whole Grade 2-5 span. Maxima are not
// stable (Grade 2 scores each out of 5, grades 3-5 out of 4), so these are
// shown as a proportion with the denominator alongside.
const WRITING_CATEGORY_LABELS: Record<string, string> = {
  story_structure: 'Story Structure', content: 'Content and Detail',
  language_grammar: 'Language and Grammar', mechanics: 'Mechanics',
  word_choice: 'Word Choice and Voice', vocabulary: 'Vocabulary and Word Choice',
  completeness: 'Completeness',
}
const WRITING_CATEGORY_ORDER = ['story_structure', 'completeness', 'content', 'vocabulary', 'word_choice', 'language_grammar', 'mechanics']

function writingCategoriesFor(test: LevelTest) {
  const g = Number(test.grade)
  const key = versionKeyFor(test)
  if (!key) return null
  const c = g === 2 ? getG2Content(key) : g === 3 ? getG3Content(key)
    : g === 4 ? getG4Content(key) : g === 5 ? getG5Content(key) : null
  return (c as any)?.writing?.categories ?? null
}

// ─── CCSS anchors ────────────────────────────────────────────────────
// A standard code is STRAND.GRADE.NUMBER[letter] -- RI.3.1, L.2.4a, RF.K.3a.
// The grade digit moves every year but the anchor does not: RI.2.1, RI.3.1,
// RI.4.1 and RI.5.1 are one skill at a rising bar. Comparing full codes across
// years therefore finds nothing in common; comparing anchors lines the whole
// history up, and the rise in the bar is the point rather than a problem.
//
// Five anchors run the full Grade 2-5 span in these tests -- RI.1, RI.3, SL.2,
// L.1 and L.2 -- so a student's four-year record on them is genuinely readable.
function anchorOf(code: string): string {
  const parts = code.split('.')
  if (parts.length < 3) return code
  const num = (parts[2].match(/^\d+/) || [parts[2]])[0]
  return `${parts[0]}.${num}`
}

/** The grade a standard belongs to. 'K' sorts below 1. */
function standardGrade(code: string): number | null {
  const parts = code.split('.')
  if (parts.length < 3) return null
  if (parts[1] === 'K') return 0
  const n = Number(parts[1])
  return Number.isFinite(n) ? n : null
}

const STRAND_LABELS: Record<string, string> = {
  RL: 'Reading: Literature', RI: 'Reading: Informational', RF: 'Reading: Foundational',
  L: 'Language', SL: 'Speaking & Listening', W: 'Writing',
}

// Domain labels drifted as the tests were authored -- every grade carries both
// "Listening" and "Listening Comprehension", and "Language" alongside
// "Language/Grammar" and "Language/Mechanics". Left alone they split one row
// into three in any rollup, so they are folded here rather than in the content
// files, where changing them would re-point historical scores.
const DOMAIN_CANON: Record<string, string> = {
  'Listening': 'Listening', 'Listening Comprehension': 'Listening',
  'Language': 'Language', 'Language/Grammar': 'Language', 'Language/Mechanics': 'Language',
  'Reading Info': 'Reading', 'Reading Lit': 'Reading', 'Reading Comprehension': 'Reading',
  'Vocabulary': 'Vocabulary', 'Writing': 'Writing', 'Phonics': 'Phonics', 'Fluency': 'Fluency',
}
const canonDomain = (d: string) => DOMAIN_CANON[d] || d

/** Fall precedes spring inside an academic year. */
function testOrder(t: LevelTest): string {
  return `${t.academic_year}-${t.semester === 'fall' ? '0' : '1'}`
}

function versionKeyFor(test: LevelTest): string {
  const g = Number(test.grade)
  if (g === 2) return g2VersionKeyForTest(test as any)
  if (g === 3) return g3VersionKeyForTest(test as any)
  if (g === 4) return g4VersionKeyForTest(test as any)
  if (g === 5) return g5VersionKeyForTest(test as any)
  return ''
}

/**
 * Null rather than throwing for anything this build cannot resolve.
 *
 * getG*Content returns null for a version key it does not know -- a test from
 * an academic year whose content was never authored, say -- and the
 * bandScalesFrom* helpers dereference their argument immediately. Passing the
 * null straight through threw inside the load, which left the spinner up
 * forever for any student whose history touched such a test. A band we cannot
 * compute is missing data, not a broken page.
 */
function bandFor(test: LevelTest, calc: any) {
  const g = Number(test.grade)
  const key = versionKeyFor(test)
  if (!key) return null
  const content = g === 2 ? getG2Content(key) : g === 3 ? getG3Content(key)
    : g === 4 ? getG4Content(key) : g === 5 ? getG5Content(key) : null
  if (!content) return null
  const scales = g === 2 ? bandScalesFromG2(content as any)
    : g === 3 ? bandScalesFromG3(content as any)
    : g === 4 ? bandScalesFromG4(content as any)
    : g === 5 ? bandScalesFromG5(content as any) : null
  if (!scales) return null
  return calculateG2Band({
    passageLevel: calc.passage_level ?? null,
    phonicsTotal: calc.phonics_total ?? null,
    syllableTotal: calc.syllable_total ?? null,
    sentenceTotal: calc.sentence_total ?? null,
    compTotal: calc.comp_total ?? null,
    compNotAdministered: calc.comp_not_administered ?? null,
    accuracyPct: calc.accuracy_pct ?? null,
    naep: calc.naep ?? null,
    cwpm: calc.cwpm ?? null,
  }, scales)
}

interface Sitting {
  test: LevelTest
  calc: any
  raw: any
  placement: EnglishClass | null
  autoPlacement: EnglishClass | null
  overridden: boolean
  anec: any
  band: ReturnType<typeof bandFor>
}

export default function LevelingHistory({ levelTest }: { levelTest: LevelTest }) {
  const [students, setStudents] = useState<Student[]>([])
  const [tests, setTests] = useState<LevelTest[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sittings, setSittings] = useState<Sitting[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>('all')
  const [error, setError] = useState<string | null>(null)

  // Only this grade's students. The tab used to pull every active student in
  // the school and select('*') on top, which is most of the load time for a
  // list nobody wants -- a Grade 5 leveling meeting has no use for Grade 2 names.
  // Level tests stay unfiltered: a Grade 5 student's history lives in the
  // Grade 4 and Grade 3 tests they sat in earlier years.
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: studs, error: sErr }, { data: lts, error: tErr }] = await Promise.all([
        supabase.from('students')
          .select('id, english_name, korean_name, english_class, grade')
          .eq('is_active', true).eq('grade', Number(levelTest.grade)).order('english_name'),
        supabase.from('level_tests').select('id, name, grade, academic_year, semester'),
      ])
      if (!alive) return
      setError(sErr?.message || tErr?.message || null)
      setStudents((studs || []) as any)
      setTests(((lts || []) as any).sort((a: any, b: any) => testOrder(a).localeCompare(testOrder(b))))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [levelTest.grade])

  useEffect(() => {
    if (!selected || tests.length === 0) { setSittings([]); return }
    let alive = true
    setLoadingStudent(true)
    setError(null)
    ;(async () => {
      try {
        // raw_scores comes back after all: the writing rubric is scored by
        // category into written_rubric, and the teacher's oral notes live here
        // too. It is a heavy column, but this is one student across a handful
        // of sittings -- the load problem was pulling every student in the
        // school, not the width of four rows.
        const [{ data: scores, error: scErr }, { data: places, error: plErr }, { data: anecs }] = await Promise.all([
          supabase.from('level_test_scores').select('level_test_id, calculated_metrics, raw_scores').eq('student_id', selected),
          supabase.from('level_test_placements').select('level_test_id, final_placement, auto_placement, is_overridden').eq('student_id', selected),
          supabase.from('teacher_anecdotal_ratings').select('*').eq('student_id', selected),
        ])
        if (!alive) return
        if (scErr || plErr) { setError(scErr?.message || plErr?.message || null); setSittings([]); return }
        const placeBy: Record<string, any> = {}
        places?.forEach((p: any) => { placeBy[p.level_test_id] = p })
        const anecBy: Record<string, any> = {}
        anecs?.forEach((a: any) => { anecBy[a.level_test_id] = a })
        const rows = (scores || []).map((sc: any) => {
          const test = tests.find(t => t.id === sc.level_test_id)
          if (!test) return null
          const calc = sc.calculated_metrics || {}
          let band = null
          try { band = bandFor(test, calc) } catch { band = null }
          const pl = placeBy[test.id]
          return {
            test, calc, raw: sc.raw_scores || {}, band, anec: anecBy[test.id] ?? null,
            placement: pl?.final_placement ?? null,
            autoPlacement: pl?.auto_placement ?? null,
            overridden: !!pl?.is_overridden,
          }
        }).filter(Boolean) as Sitting[]
        rows.sort((a, b) => testOrder(a.test).localeCompare(testOrder(b.test)))
        setSittings(rows)
      } catch (e: any) {
        if (alive) { setError(e?.message || 'Could not load this student\u2019s history.'); setSittings([]) }
      } finally {
        // Always clears. A throw in here used to leave the spinner up forever,
        // which read as "this student never loads" rather than as an error.
        if (alive) setLoadingStudent(false)
      }
    })()
    return () => { alive = false }
  }, [selected, tests])

  const student = students.find(s => s.id === selected) || null
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return students.filter(s => {
      if (filterClass !== 'all' && s.english_class !== filterClass) return false
      if (!q) return true
      // Korean names are matched untrimmed-of-case because they have none, and
      // the class name is searchable too so "marigold" finds a whole class.
      return (s.english_name || '').toLowerCase().includes(q)
        || (s.korean_name || '').includes(query.trim())
        || (s.english_class || '').toLowerCase().includes(q)
    })
  }, [students, query, filterClass])

  const classCounts = useMemo(() => {
    const c: Record<string, number> = {}
    students.forEach(s => { c[s.english_class] = (c[s.english_class] || 0) + 1 })
    return c
  }, [students])

  // ── Standards, by anchor, one column per sitting ──
  const standardsRows = useMemo(() => {
    const byAnchor: Record<string, { strand: string; perTest: Record<string, { code: string; met: number; total: number }[]> }> = {}
    sittings.forEach(s => {
      const mastery = s.calc.written_standards_mastery || {}
      Object.entries(mastery).forEach(([code, v]: [string, any]) => {
        if (!v || typeof v.total !== 'number' || v.total <= 0) return
        const a = anchorOf(code)
        if (!byAnchor[a]) byAnchor[a] = { strand: code.split('.')[0], perTest: {} }
        if (!byAnchor[a].perTest[s.test.id]) byAnchor[a].perTest[s.test.id] = []
        byAnchor[a].perTest[s.test.id].push({ code, met: v.met || 0, total: v.total })
      })
    })
    return Object.entries(byAnchor)
      .map(([anchor, v]) => {
        const codes = Array.from(new Set(Object.values(v.perTest).flat().map(h => h.code)))
        return { anchor, ...v, codes, text: anchorText(codes), span: Object.keys(v.perTest).length }
      })
      .sort((a, b) => b.span - a.span || a.anchor.localeCompare(b.anchor))
  }, [sittings])

  // ── Unfinished business ──
  // Standards from a grade BELOW the one the student was sitting, still being
  // missed on their most recent test. The papers probe these deliberately --
  // Grade 5 asks L.3.1a, Grade 3 asks L.1.1e -- so a miss here is a specific
  // named gap from an earlier year, not a general "did badly" signal.
  const unfinished = useMemo(() => {
    const last = sittings[sittings.length - 1]
    if (!last) return []
    const testGrade = Number(last.test.grade)
    const mastery = last.calc.written_standards_mastery || {}
    return Object.entries(mastery)
      .map(([code, v]: [string, any]) => ({ code, met: v?.met || 0, total: v?.total || 0, g: standardGrade(code) }))
      .filter(r => r.total > 0 && r.met < r.total && r.g != null && (r.g as number) < testGrade)
      .sort((a, b) => (a.g as number) - (b.g as number) || a.code.localeCompare(b.code))
  }, [sittings])

  // ── Writing, by rubric category ──
  // written_standards_mastery is built from the multiple choice only, so the
  // writing rubric never appeared anywhere in a student's record despite being
  // 25-30% of their composite. The categories themselves are stable enough to
  // track: content, language_grammar and mechanics run the full Grade 2-5 span.
  const writingRows = useMemo(() => {
    const byCat: Record<string, Record<string, { score: number; max: number; standard?: string }>> = {}
    sittings.forEach(s => {
      const cats = writingCategoriesFor(s.test)
      const scored = s.raw?.written_rubric || {}
      if (!cats) return
      cats.forEach((cat: any) => {
        const v = scored[cat.key]
        if (v == null) return
        if (!byCat[cat.key]) byCat[cat.key] = {}
        byCat[cat.key][s.test.id] = { score: v, max: cat.max, standard: cat.standard }
      })
    })
    return WRITING_CATEGORY_ORDER.filter(k => byCat[k]).map(k => ({ key: k, perTest: byCat[k] }))
  }, [sittings])

  const domainRows = useMemo(() => {
    const byDomain: Record<string, Record<string, { correct: number; total: number }>> = {}
    sittings.forEach(s => {
      const ds = s.calc.written_domain_scores || {}
      Object.entries(ds).forEach(([dom, v]: [string, any]) => {
        if (!v || !v.total) return
        const d = canonDomain(dom)
        if (!byDomain[d]) byDomain[d] = {}
        const cur = byDomain[d][s.test.id] || { correct: 0, total: 0 }
        byDomain[d][s.test.id] = { correct: cur.correct + (v.correct || 0), total: cur.total + v.total }
      })
    })
    return Object.entries(byDomain).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sittings])

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const pct = (m: number, t: number) => t > 0 ? Math.round((m / t) * 100) : 0
  const tone = (m: number, t: number) => {
    if (t < 3) return 'bg-surface-alt text-text-tertiary border-border'
    const p = pct(m, t)
    return p >= 80 ? 'bg-green-50 text-green-700 border-green-200'
      : p >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200'
  }
  const delta = (now: number | null, before: number | null) => {
    if (now == null || before == null) return null
    const d = Math.round((now - before) * 10) / 10
    if (Math.abs(d) < 0.05) return <span className="text-text-tertiary text-[10px]"><Minus size={9} className="inline" /></span>
    return d > 0
      ? <span className="text-green-600 text-[10px] font-semibold"><TrendingUp size={9} className="inline" /> +{d}</span>
      : <span className="text-red-600 text-[10px] font-semibold"><TrendingDown size={9} className="inline" /> {d}</span>
  }

  return (
    <div className="px-10 py-6">
      {/* ── Student picker: this grade only, filter by class, search by name ── */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or class..."
              className="pl-8 pr-3 py-2 border border-border rounded-lg text-[12px] bg-surface w-56" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFilterClass('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
            {ENGLISH_CLASSES.filter(c => (classCounts[c] || 0) > 0).map(cls => (
              <button key={cls} onClick={() => setFilterClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === cls ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={filterClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
                {cls} <span className="opacity-60">{classCounts[cls]}</span>
              </button>
            ))}
          </div>
          <span className="text-[11px] text-text-tertiary ml-auto">Grade {levelTest.grade} &middot; {matches.length} of {students.length}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap max-h-[132px] overflow-y-auto p-1 bg-surface-alt/40 rounded-lg border border-border">
          {matches.length === 0 && <span className="text-[11px] text-text-tertiary px-2 py-1">No students match.</span>}
          {matches.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors ${selected === s.id ? 'bg-navy text-white border-navy' : 'bg-surface border-border hover:bg-surface-alt'}`}>
              <span className="font-medium">{s.english_name}</span>
              <span className={`ml-1 ${selected === s.id ? 'opacity-70' : 'text-text-tertiary'}`}>{s.korean_name}</span>
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ backgroundColor: classToColor(s.english_class as EnglishClass) }} />
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[11px] text-red-700">
          Could not load history: {error}
        </div>
      )}

      {student && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-semibold text-navy">{student.english_name}</span>
          <span className="text-[12px] text-text-tertiary">{student.korean_name}</span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(student.english_class as EnglishClass) + '40', color: classToTextColor(student.english_class as EnglishClass) }}>{student.english_class}</span>
          <span className="text-[11px] text-text-tertiary">{sittings.length} level test{sittings.length === 1 ? '' : 's'} on record</span>
        </div>
      )}

      {!selected && (
        <div className="text-center py-16 text-text-tertiary text-[13px]">
          Pick a Grade {levelTest.grade} student to see every level test they have sat, side by side {'\u2014'} including the ones from earlier years, in lower grades.
        </div>
      )}

      {selected && loadingStudent && <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>}

      {selected && !loadingStudent && sittings.length === 0 && (
        <div className="text-center py-16 text-text-tertiary text-[13px]">
          No level test scores on record for this student.
        </div>
      )}

      {selected && !loadingStudent && sittings.length > 0 && (
        <div className="space-y-5">
          {/* ── Headline: one column per sitting ── */}
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-surface-alt">
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[130px]">&nbsp;</th>
                {sittings.map(s => (
                  <th key={s.test.id} className="text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[110px]">
                    {s.test.academic_year} {s.test.semester}<br/>
                    <span className="normal-case text-text-tertiary">Grade {s.test.grade}</span>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-text-secondary font-medium">Passage sustained</td>
                  {sittings.map(s => (
                    <td key={s.test.id} className="px-3 py-2 text-center">
                      {s.band ? <><span className="font-bold text-navy text-[13px]">{s.band.effectiveLevel}</span>
                        {s.band.downgraded && <span className="block text-[8px] text-amber-600" title={`Attempted ${s.band.attemptedLevel}, did not sustain it.`}>tried {s.band.attemptedLevel}</span>}</>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-surface-alt/30">
                  <td className="px-3 py-2 text-text-secondary font-medium">Band</td>
                  {sittings.map((s, i) => (
                    <td key={s.test.id} className="px-3 py-2 text-center">
                      {s.band ? <><span className="font-bold text-navy">{Math.round(s.band.composite)}</span>
                        {i > 0 && <span className="ml-1">{delta(s.band.composite, sittings[i - 1].band?.composite ?? null)}</span>}</>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-text-secondary font-medium">CWPM <span className="text-text-tertiary font-normal">(as clocked)</span></td>
                  {sittings.map((s, i) => (
                    <td key={s.test.id} className="px-3 py-2 text-center">
                      {s.calc.cwpm != null ? <><span className="font-medium">{Math.round(s.calc.cwpm)}</span>
                        {i > 0 && <span className="ml-1">{delta(s.calc.cwpm, sittings[i - 1].calc.cwpm ?? null)}</span>}</>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-surface-alt/30">
                  <td className="px-3 py-2 text-text-secondary font-medium">Accuracy</td>
                  {sittings.map(s => <td key={s.test.id} className="px-3 py-2 text-center">{s.calc.accuracy_pct != null ? `${s.calc.accuracy_pct}%` : <span className="text-text-tertiary">—</span>}</td>)}
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2 text-text-secondary font-medium">Comprehension</td>
                  {sittings.map(s => (
                    <td key={s.test.id} className="px-3 py-2 text-center">
                      {s.calc.comp_not_administered ? <span className="text-amber-700 text-[9px]">not administered</span>
                        : s.calc.comp_total != null ? <>{s.calc.comp_total}<span className="text-text-tertiary/50">/{s.calc.comp_max ?? '?'}</span></>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-surface-alt/30">
                  <td className="px-3 py-2 text-text-secondary font-medium">Placed in</td>
                  {sittings.map(s => (
                    <td key={s.test.id} className="px-3 py-2 text-center">
                      {s.placement
                        ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(s.placement) + '40', color: classToTextColor(s.placement) }}>{s.placement}</span>
                        : <span className="text-text-tertiary">—</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-text-tertiary px-3 py-2 border-t border-border">
              Raw written totals are deliberately absent: the papers change between versions, so a 24/31 this year and a 22/26 last year are not the same measure.
              Passage level, band and CWPM survive a version change intact, and the standards below survive it by anchor.
            </p>
          </div>

          {/* ── Unfinished business ── */}
          {unfinished.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-[12px] font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Unfinished business
              </p>
              <p className="text-[11px] text-amber-700 mb-2.5">
                Standards from an earlier grade that this student is still missing on their most recent paper.
                The tests probe these on purpose, so each one is a named gap rather than a general weakness.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unfinished.map(u => (
                  <span key={u.code} className="inline-flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-amber-200 text-[10px] max-w-[320px]">
                    <span className="font-bold text-amber-900 whitespace-nowrap">{u.code}</span>
                    <span className="text-text-tertiary whitespace-nowrap">{u.met}/{u.total}</span>
                    <span className="text-amber-800 leading-snug">{STANDARD_TEXT[u.code] || STRAND_LABELS[u.code.split('.')[0]] || ''}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Teacher observations over time ── */}
          {sittings.some(s => s.anec || s.raw?.notes) && (
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <p className="text-[12px] font-semibold text-navy px-3 pt-3">What teachers saw</p>
              <p className="text-[10px] text-text-tertiary px-3 pb-2">
                Ratings are notes, not scores &mdash; they are deliberately outside the composite, since a teacher new this year has rated nobody.
                Across sittings they are the one record of how a student is changing that no test question captures.
              </p>
              <table className="w-full text-[11px]">
                <thead><tr className="bg-surface-alt">
                  <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[190px]">&nbsp;</th>
                  {sittings.map(s => <th key={s.test.id} className="text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[110px]">{s.test.academic_year} {s.test.semester}</th>)}
                </tr></thead>
                <tbody>
                  {([['receptive_language', 'Receptive language'], ['productive_language', 'Productive language'], ['engagement_pace', 'Engagement and pace']] as const).map(([k, label], ri) => (
                    <tr key={k} className={`border-t border-border ${ri % 2 ? 'bg-surface-alt/30' : ''}`}>
                      <td className="px-3 py-2 text-text-secondary font-medium">{label}</td>
                      {sittings.map((s, i) => {
                        const v = s.anec?.[k]
                        return (
                          <td key={s.test.id} className="px-3 py-2 text-center">
                            {v != null ? <>{v}<span className="text-text-tertiary/60">/4</span>
                              {i > 0 && sittings[i - 1].anec?.[k] != null && <span className="ml-1">{delta(v, sittings[i - 1].anec[k])}</span>}</>
                              : <span className="text-text-tertiary">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-text-secondary font-medium">Teacher recommended</td>
                    {sittings.map(s => (
                      <td key={s.test.id} className="px-3 py-2 text-center">
                        {s.anec?.teacher_recommends
                          ? <span className={`text-[10px] font-bold ${s.anec.teacher_recommends === 'keep' ? 'text-blue-600' : s.anec.teacher_recommends === 'move_up' ? 'text-green-600' : 'text-red-600'}`}>
                              {s.anec.teacher_recommends === 'keep' ? 'Keep' : s.anec.teacher_recommends === 'move_up' ? 'Move up' : 'Move down'}</span>
                          : <span className="text-text-tertiary">—</span>}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t border-border bg-surface-alt/30">
                    <td className="px-3 py-2 text-text-secondary font-medium">Placement</td>
                    {sittings.map(s => (
                      <td key={s.test.id} className="px-3 py-2 text-center">
                        {s.placement
                          ? <><span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(s.placement) + '40', color: classToTextColor(s.placement) }}>{s.placement}</span>
                            {s.overridden && s.autoPlacement && s.autoPlacement !== s.placement &&
                              <span className="block text-[8px] text-amber-600 mt-0.5" title={`The test suggested ${s.autoPlacement}; a teacher moved them.`}>overridden from {s.autoPlacement}</span>}</>
                          : <span className="text-text-tertiary">—</span>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              {sittings.some(s => s.raw?.notes || s.anec?.notes) && (
                <div className="border-t border-border px-3 py-2.5 space-y-2">
                  {sittings.filter(s => s.raw?.notes || s.anec?.notes).map(s => (
                    <div key={s.test.id}>
                      <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">{s.test.academic_year} {s.test.semester}</p>
                      {s.raw?.notes && <p className="text-[11px] text-text-secondary leading-snug">&ldquo;{s.raw.notes}&rdquo; <span className="text-text-tertiary text-[9px]">&mdash; oral test</span></p>}
                      {s.anec?.notes && <p className="text-[11px] text-text-secondary leading-snug">&ldquo;{s.anec.notes}&rdquo; <span className="text-text-tertiary text-[9px]">&mdash; teacher rating</span></p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Standards by anchor ── */}
          {standardsRows.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <p className="text-[12px] font-semibold text-navy px-3 pt-3">Standards, by anchor</p>
              <p className="text-[10px] text-text-tertiary px-3 pb-2">
                The grade digit in a CCSS code rises every year but the anchor does not &mdash; RI.2.1, RI.3.1 and RI.4.1 are one skill at a harder bar.
                Rows are anchors, so a score holding steady across two columns means the student got better, because the test got harder.
                Cells with fewer than three questions behind them are greyed: one item is noise, not a trend.
              </p>
              <table className="w-full text-[11px]">
                <thead><tr className="bg-surface-alt">
                  <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[170px]">Anchor</th>
                  {sittings.map(s => <th key={s.test.id} className="text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[110px]">{s.test.academic_year} {s.test.semester}</th>)}
                </tr></thead>
                <tbody>{standardsRows.map(r => (
                  <tr key={r.anchor} className="border-t border-border">
                    <td className="px-3 py-2 align-top">
                      <span className="font-bold text-navy">{r.anchor.replace('.', '·')}</span>
                      <span className="block text-[9px] text-text-tertiary">{STRAND_LABELS[r.strand] || r.strand}</span>
                      {r.text && <span className="block text-[10px] text-text-secondary mt-0.5 leading-snug max-w-[300px]">{r.text}</span>}
                    </td>
                    {sittings.map(s => {
                      const hits = r.perTest[s.test.id]
                      if (!hits) return <td key={s.test.id} className="px-3 py-2 text-center text-text-tertiary">—</td>
                      const met = hits.reduce((a, h) => a + h.met, 0)
                      const total = hits.reduce((a, h) => a + h.total, 0)
                      return (
                        <td key={s.test.id} className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${tone(met, total)}`}
                            title={total < 3 ? `Only ${total} question${total === 1 ? '' : 's'} behind this — too few to read as a trend.` : undefined}>
                            {met}/{total}
                          </span>
                          <span className="block text-[8px] text-text-tertiary mt-0.5"
                            title={hits.map(h => STANDARD_TEXT[h.code] ? `${h.code} \u2014 ${STANDARD_TEXT[h.code]}` : h.code).join('\n')}>
                            {hits.map(h => h.code).join(', ')}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {/* ── Writing ── */}
          {(writingRows.length > 0 || sittings.some(s => s.calc.writing_total != null || s.calc.short_writing_total != null)) && (
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <p className="text-[12px] font-semibold text-navy px-3 pt-3">Writing</p>
              <p className="text-[10px] text-text-tertiary px-3 pb-2">
                Scored by rubric rather than by question, so none of this reaches the standards grid above &mdash; that is built from the multiple choice alone.
                Maxima differ by grade (Grade 2 marks each category out of 5, grades 3&ndash;5 out of 4), so the score is shown over its own denominator.
              </p>
              <table className="w-full text-[11px]">
                <thead><tr className="bg-surface-alt">
                  <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[190px]">Category</th>
                  {sittings.map(s => <th key={s.test.id} className="text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[110px]">{s.test.academic_year} {s.test.semester}</th>)}
                </tr></thead>
                <tbody>
                  {writingRows.map(r => (
                    <tr key={r.key} className="border-t border-border">
                      <td className="px-3 py-2 align-top">
                        <span className="font-medium text-navy">{WRITING_CATEGORY_LABELS[r.key] || r.key}</span>
                        {(() => {
                          const std = Object.values(r.perTest).map(v => v.standard).find(Boolean)
                          return std ? <span className="block text-[9px] text-text-tertiary">{std}{STANDARD_TEXT[std] ? ` \u2014 ${STANDARD_TEXT[std]}` : ''}</span> : null
                        })()}
                      </td>
                      {sittings.map(s => {
                        const v = r.perTest[s.test.id]
                        if (!v) return <td key={s.test.id} className="px-3 py-2 text-center text-text-tertiary">—</td>
                        return (
                          <td key={s.test.id} className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${tone(v.score, Math.max(v.max, 3))}`}>{v.score}<span className="opacity-60">/{v.max}</span></span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-surface-alt/40">
                    <td className="px-3 py-2 font-semibold text-navy">Extended writing total</td>
                    {sittings.map((s, i) => (
                      <td key={s.test.id} className="px-3 py-2 text-center font-semibold">
                        {s.calc.writing_total != null
                          ? <>{s.calc.writing_total}<span className="text-text-tertiary/60">/{s.calc.writing_max ?? 20}</span>
                            {i > 0 && <span className="ml-1">{delta(s.calc.writing_total, sittings[i - 1].calc.writing_total ?? null)}</span>}</>
                          : <span className="text-text-tertiary font-normal">—</span>}
                      </td>
                    ))}
                  </tr>
                  {sittings.some(s => s.calc.short_writing_total != null) && (
                    <tr className="border-t border-border">
                      <td className="px-3 py-2 text-text-secondary font-medium">Short written response</td>
                      {sittings.map(s => (
                        <td key={s.test.id} className="px-3 py-2 text-center">
                          {s.calc.short_writing_total != null
                            ? <>{s.calc.short_writing_total}<span className="text-text-tertiary/60">/{s.calc.short_writing_max ?? '?'}</span></>
                            : <span className="text-text-tertiary">—</span>}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Domain rollup ── */}
          {domainRows.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <p className="text-[12px] font-semibold text-navy px-3 pt-3">By domain</p>
              <p className="text-[10px] text-text-tertiary px-3 pb-2">The coarse view, for when a single anchor has too few questions to trust on its own.</p>
              <table className="w-full text-[11px]">
                <thead><tr className="bg-surface-alt">
                  <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[170px]">Domain</th>
                  {sittings.map(s => <th key={s.test.id} className="text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[110px]">{s.test.academic_year} {s.test.semester}</th>)}
                </tr></thead>
                <tbody>{domainRows.map(([dom, perTest]) => (
                  <tr key={dom} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-navy">{dom}</td>
                    {sittings.map(s => {
                      const v = perTest[s.test.id]
                      if (!v) return <td key={s.test.id} className="px-3 py-2 text-center text-text-tertiary">—</td>
                      return (
                        <td key={s.test.id} className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${tone(v.correct, v.total)}`}>{pct(v.correct, v.total)}%</span>
                          <span className="block text-[8px] text-text-tertiary mt-0.5">{v.correct}/{v.total}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
