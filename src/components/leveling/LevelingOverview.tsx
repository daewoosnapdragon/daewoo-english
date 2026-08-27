'use client'

import { useState, useEffect, useMemo, Fragment, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, PLACED_ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor, IMPLAUSIBLE_CWPM } from '@/lib/utils'
import { Loader2, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus, Printer } from 'lucide-react'
import { bandFromCalc, g2ClassFromBand, BAND_LEVEL_ORDER } from './grade2Band'

const PASSAGE_COLORS: Record<string, string> = {
  A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6', F: '#A855F7',
}
const testOrder = (t: LevelTest) => `${t.academic_year}-${t.semester === 'fall' ? '0' : '1'}`

/**
 * Grade 1 keeps its own band scale inside Grade1ScoreEntry and stores the
 * result as oral_score, so bandFromCalc -- which resolves the shared A-F
 * ladder -- has nothing to give it. Both scales are 0-100 built on passage
 * floors, so the shape is the same and only the source differs.
 */
function bandOf(test: LevelTest, calc: any) {
  if (!calc) return null
  if (Number(test.grade) === 1) {
    if (calc.oral_score == null) return null
    const attempted = calc.passage_level ?? null
    const effective = calc.effective_passage_level ?? attempted
    return {
      composite: calc.oral_score as number,
      effectiveLevel: (effective ?? '?') as string,
      attemptedLevel: (attempted ?? '?') as string,
      downgraded: !!(attempted && effective && attempted !== effective),
      suggestedClass: g2ClassFromBand(calc.oral_score),
    }
  }
  return bandFromCalc(test, calc)
}

interface Sit { student: Student; calc: any; raw: any; band: ReturnType<typeof bandOf> }
interface Finding { grade: number; rank: number; n: number; kind: string; body: ReactNode }
interface GradeContent { questions: any[]; writingCats: any[]; shortMax: number | null }

/** The authored paper for a test: questions, writing rubric, short response. */
async function loadContent(test: LevelTest): Promise<GradeContent> {
  const g = Number(test.grade)
  const empty = { questions: [], writingCats: [], shortMax: null }
  try {
    if (g === 1) {
      const c = (await import('./grade1Content')).g1ContentForTest(test as any)
      return c ? { questions: c.written.questions, writingCats: c.extendedWriting.categories as any[], shortMax: c.shortWriting?.max ?? null } : empty
    }
    const mod = g === 2 ? await import('./grade2Content') : g === 3 ? await import('./grade3Content')
      : g === 4 ? await import('./grade4Content') : g === 5 ? await import('./grade5Content') : null
    if (!mod) return empty
    const c = (mod as any)[`g${g}ContentForTest`](test as any)
    if (!c) return empty
    return { questions: c.written.questions ?? [], writingCats: c.writing?.categories ?? [], shortMax: c.shortWriting?.max ?? null }
  } catch { return empty }
}

export default function LevelingOverview({ levelTests }: { levelTests: LevelTest[] }) {
  const [students, setStudents] = useState<Student[]>([])
  const [calcs, setCalcs] = useState<Record<string, Record<string, any>>>({})
  const [raws, setRaws] = useState<Record<string, Record<string, any>>>({})
  const [content, setContent] = useState<Record<string, GradeContent>>({})
  const [loading, setLoading] = useState(true)
  const [answersLoading, setAnswersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>('all')

  const years = useMemo(() => Array.from(new Set(levelTests.map(t => t.academic_year))).sort().reverse(), [levelTests])
  const [year, setYear] = useState<string>(years[0] || '')
  useEffect(() => { if (!year && years[0]) setYear(years[0]) }, [years, year])

  const tests = useMemo(
    () => levelTests.filter(t => t.academic_year === year).sort((a, b) => Number(a.grade) - Number(b.grade)),
    [levelTests, year])
  const testIds = tests.map(t => t.id).join(',')

  // Scores first, so the page is usable immediately. calculated_metrics alone
  // carries everything the school strip, the class panels and most findings
  // need, and it is a fraction of the width of a full row.
  useEffect(() => {
    if (tests.length === 0) { setLoading(false); return }
    let alive = true
    setLoading(true); setSelected(null)
    ;(async () => {
      try {
        const ids = tests.map(t => t.id)
        const [{ data: studs, error: sErr }, { data: sc, error: scErr }] = await Promise.all([
          supabase.from('students').select('id, english_name, korean_name, english_class, grade').eq('is_active', true).order('english_name'),
          supabase.from('level_test_scores').select('level_test_id, student_id, calculated_metrics').in('level_test_id', ids),
        ])
        if (!alive) return
        if (sErr || scErr) { setError(sErr?.message || scErr?.message || null); return }
        setStudents((studs || []) as any)
        const m: Record<string, Record<string, any>> = {}
        sc?.forEach((r: any) => { (m[r.level_test_id] ||= {})[r.student_id] = r.calculated_metrics || {} })
        setCalcs(m)
        const cs: Record<string, GradeContent> = {}
        await Promise.all(tests.map(async t => { cs[t.id] = await loadContent(t) }))
        if (alive) setContent(cs)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not load the overview.')
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [testIds])

  // Answers and rubrics follow in the background. They are the only thing that
  // needs raw_scores, and question findings are worth the second query -- but
  // not worth making the whole page wait behind it.
  useEffect(() => {
    if (tests.length === 0) { setAnswersLoading(false); return }
    let alive = true
    setAnswersLoading(true)
    ;(async () => {
      try {
        const { data } = await supabase.from('level_test_scores')
          .select('level_test_id, student_id, raw_scores').in('level_test_id', tests.map(t => t.id))
        if (!alive) return
        const m: Record<string, Record<string, any>> = {}
        data?.forEach((r: any) => { (m[r.level_test_id] ||= {})[r.student_id] = r.raw_scores || {} })
        setRaws(m)
      } finally { if (alive) setAnswersLoading(false) }
    })()
    return () => { alive = false }
  }, [testIds])

  const rowsFor = (t: LevelTest): Sit[] => {
    const c = calcs[t.id] || {}, r = raws[t.id] || {}
    return students.filter(s => Number(s.grade) === Number(t.grade))
      .map(s => ({ student: s, calc: c[s.id] || null, raw: r[s.id] || null, band: bandOf(t, c[s.id]) }))
  }

  const perGrade = useMemo(() => tests.map(t => {
    const rows = rowsFor(t)
    const tested = rows.filter(r => r.band != null)
    const bands = tested.map(r => r.band!.composite).sort((a, b) => a - b)
    const med = (a: number[]) => a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null
    const comps = rows.map(r => r.calc?.comp_total != null && r.calc?.comp_max ? r.calc.comp_total / r.calc.comp_max : null).filter(v => v != null) as number[]
    const cwpms = rows.map(r => r.calc?.cwpm).filter(v => v != null) as number[]
    return {
      test: t, rows, tested: tested.length, total: rows.length,
      medianBand: med(bands),
      spread: bands.length > 1 ? bands[bands.length - 1] - bands[0] : null,
      comprehension: comps.length ? comps.reduce((a, b) => a + b, 0) / comps.length : null,
      medianCwpm: med([...cwpms].sort((a, b) => a - b)),
    }
  }), [tests, students, calcs, raws])

  const findings = useMemo(
    () => buildFindings(perGrade, content, raws).sort((a, b) => b.rank - a.rank || b.n - a.n),
    [perGrade, content, raws])

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
  if (tests.length === 0) return <p className="text-text-tertiary text-[13px] py-8 text-center">No level tests in {year || 'this year'}.</p>

  const sel = perGrade.find(g => g.test.id === selected) || null

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700">Could not load: {error}</div>}

      {years.length > 1 && (
        <div className="flex justify-end">
          <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-[11px] bg-surface">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}

      <SchoolStrip grades={perGrade} findings={findings} selected={selected} onSelect={g => { setSelected(g); setFilterClass('all') }} />
      <Findings findings={findings} loading={answersLoading} onGrade={g => {
        const t = tests.find(x => Number(x.grade) === g); if (t) { setSelected(t.id); setFilterClass('all') }
      }} />

      {sel && (
        <GradeDetail
          key={sel.test.id}
          summary={sel}
          content={content[sel.test.id]}
          filterClass={filterClass}
          onFilterClass={setFilterClass}
          answersLoading={answersLoading}
          allTests={levelTests}
          students={students}
        />
      )}
    </div>
  )
}

// ─── School strip ────────────────────────────────────────────────────
// Every grade at once, carrying only what compares honestly between them:
// counts, a proportion, and a rate. Band and composite are deliberately absent
// -- a Grade 2 Band 85 and a Grade 5 Band 85 both mean "near the top of what my
// grade was asked", which is not the same reading level, and putting them on one
// axis would invite exactly that reading.
function SchoolStrip({ grades, findings, selected, onSelect }: {
  grades: any[]; findings: Finding[]; selected: string | null; onSelect: (id: string) => void
}) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 pt-3 pb-2">
        <p className="text-[12px] font-semibold text-navy">Every grade</p>
        <p className="text-[10px] text-text-tertiary">
          Only measures that mean the same thing in each grade. Band is not among them, so it is not here &mdash; open a grade to see it against its own classes.
        </p>
      </div>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          {['Grade', 'Tested', 'Comprehension', 'Median CWPM', 'Needs a look'].map((h, i) => (
            <th key={h} className={`px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody>{grades.map(g => {
          const f = findings.filter(x => x.grade === Number(g.test.grade))
          const urgent = f.filter(x => x.rank >= 80).length
          const on = selected === g.test.id
          return (
            <tr key={g.test.id} onClick={() => onSelect(g.test.id)}
              className={`border-t border-border cursor-pointer transition-colors ${on ? 'bg-navy/10' : 'hover:bg-surface-alt/60'}`}>
              <td className="px-3 py-2.5">
                <span className="font-semibold text-navy">Grade {g.test.grade}</span>
                {on && <span className="text-[9px] text-navy/60 ml-1.5">showing below</span>}
              </td>
              <td className="px-3 py-2.5 text-center">
                <span className={g.tested === g.total ? 'text-green-600 font-semibold' : 'text-text-secondary'}>{g.tested}/{g.total}</span>
              </td>
              <td className="px-3 py-2.5 text-center">
                {g.comprehension != null
                  ? <span className={`font-semibold ${g.comprehension >= 0.75 ? 'text-green-600' : g.comprehension >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(g.comprehension * 100)}%</span>
                  : <span className="text-text-tertiary">—</span>}
              </td>
              <td className="px-3 py-2.5 text-center text-text-secondary">{g.medianCwpm != null ? Math.round(g.medianCwpm) : '—'}</td>
              <td className="px-3 py-2.5 text-center">
                {f.length === 0 ? <span className="text-text-tertiary">—</span> : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${urgent ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {urgent > 0 && <AlertTriangle size={9} />}{f.length}
                  </span>
                )}
              </td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}

// ─── Findings ────────────────────────────────────────────────────────
// The list answers the question an admin actually arrives with -- what should
// I look at -- rather than leaving six charts and the hunt. Everything here is
// derived from the panels below, so nothing is asserted that cannot be checked
// a scroll away, and each is ranked by how much evidence sits behind it: a
// finding resting on three students sorts under one resting on sixty.
function buildFindings(perGrade: any[], content: Record<string, GradeContent>, raws: Record<string, Record<string, any>>): Finding[] {
  const out: Finding[] = []
  perGrade.forEach(g => {
    const grade = Number(g.test.grade)
    const tested = g.rows.filter((r: Sit) => r.band != null)
    if (tested.length === 0) return

    const summarise = (cls: EnglishClass) => {
      const inClass = tested.filter((r: Sit) => r.student.english_class === cls)
      const b = inClass.map((r: Sit) => r.band!.composite).sort((a: number, x: number) => a - x)
      const median = b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null
      const passages: Record<string, number> = {}
      inClass.forEach((r: Sit) => { passages[r.band!.effectiveLevel] = (passages[r.band!.effectiveLevel] || 0) + 1 })
      return { cls, rows: inClass, median, modal: Object.entries(passages).sort((a, x) => x[1] - a[1])[0]?.[0] ?? null }
    }
    const ladder = PLACED_ENGLISH_CLASSES.map(summarise).filter(c => c.rows.length > 0)

    // Two rooms the wrong way round. Rarer than any individual drifting and
    // more serious, because it is a statement about the classes themselves.
    ladder.slice(0, -1).forEach((c, i) => {
      const up = ladder[i + 1]
      if (c.median != null && up.median != null && up.median < c.median) {
        out.push({ grade, rank: 95, n: c.rows.length + up.rows.length, kind: 'inversion',
          body: <><strong>{up.cls}</strong> is reading below <strong>{c.cls}</strong> (median Band {Math.round(up.median)} against {Math.round(c.median)}), though it is meant to be the stronger class.</> })
      }
    })

    // Two classes on the same passage are the same reading level, whatever
    // their names say.
    const byModal: Record<string, EnglishClass[]> = {}
    ladder.forEach(c => { if (c.modal) (byModal[c.modal] ||= []).push(c.cls) })
    Object.entries(byModal).filter(([, cs]) => cs.length > 1).forEach(([lvl, cs]) => {
      out.push({ grade, rank: 75, n: ladder.filter(c => cs.includes(c.cls)).reduce((s, c) => s + c.rows.length, 0), kind: 'same-passage',
        body: <><strong>{cs.join(' and ')}</strong> both sit mostly on passage <strong>{lvl}</strong> &mdash; on the oral evidence they are the same reading level.</> })
    })

    // A rate faster than fluent adult reading aloud is a stopwatch started
    // late, and it feeds the Band, so it should be caught before placement.
    const fast = g.rows.filter((r: Sit) => r.calc?.cwpm != null && r.calc.cwpm > IMPLAUSIBLE_CWPM)
    if (fast.length) out.push({ grade, rank: 90, n: fast.length, kind: 'rate',
      body: <><strong>{fast.length}</strong> reading {fast.length === 1 ? 'rate is' : 'rates are'} too fast to be real (over {IMPLAUSIBLE_CWPM} wpm) &mdash; {fast.map((r: Sit) => r.student.english_name).join(', ')}. Almost always a stopwatch started late, and the rate feeds the Band.</> })

    // Drift, counted rather than named -- the names are a scroll away.
    ladder.forEach((c, i) => {
      const up = ladder[i + 1], down = ladder[i - 1]
      if (c.median != null && up?.median != null && up.median > c.median) {
        const n = c.rows.filter((r: Sit) => r.band!.composite > (c.median! + up.median!) / 2).length
        if (n >= 3) out.push({ grade, rank: 55, n, kind: 'drift-up',
          body: <><strong>{n}</strong> of <strong>{c.cls}</strong> sit closer to {up.cls} than to their own class.</> })
      }
      if (c.median != null && down?.median != null && down.median < c.median) {
        const n = c.rows.filter((r: Sit) => r.band!.composite < (c.median! + down.median!) / 2).length
        if (n >= 3) out.push({ grade, rank: 55, n, kind: 'drift-down',
          body: <><strong>{n}</strong> of <strong>{c.cls}</strong> sit closer to {down.cls} than to their own class.</> })
      }
    })

    // ── Question and writing findings ──
    const ct = content[g.test.id]
    const raw = raws[g.test.id] || {}
    if (!ct) return
    const cohort = g.rows as Sit[]

    ct.questions.forEach((q: any) => {
      const picks: Record<string, number> = {}
      let answered = 0, correct = 0
      cohort.forEach(r => {
        const chosen = raw[r.student.id]?.written_answers?.[q.qNum]
        if (!chosen) return
        answered++; picks[chosen] = (picks[chosen] || 0) + 1
        if (chosen === q.correct) correct++
      })
      if (answered < 8) return
      const topWrong = Object.entries(picks).filter(([k]) => k !== q.correct).sort((a, b) => b[1] - a[1])[0]
      if (topWrong && topWrong[1] > (picks[q.correct] || 0)) {
        out.push({ grade, rank: 92, n: answered, kind: 'key-beaten',
          body: <><strong>Q{q.qNum}</strong>: more of the grade chose <strong>{topWrong[0]})</strong> than the key ({topWrong[1]} against {picks[q.correct] || 0} of {answered}). Check the question and its key before counting it.</> })
      } else if (correct / answered < 0.3) {
        out.push({ grade, rank: 70, n: answered, kind: 'hard-item',
          body: <><strong>Q{q.qNum}</strong> was missed by {Math.round((1 - correct / answered) * 100)}% of the grade{q.standard ? <> ({q.standard})</> : null}. {topWrong ? <>Most picked {topWrong[0]}).</> : null}</> })
      }
    })

    // Writing, by rubric category. Never reaches the standards grid, since that
    // is built from the multiple choice alone, so this is the only place a
    // whole-class writing weakness shows up.
    ct.writingCats.forEach((cat: any) => {
      PLACED_ENGLISH_CLASSES.forEach(cls => {
        const inClass = cohort.filter(r => r.student.english_class === cls)
        const vals = inClass.map(r => raw[r.student.id]?.written_rubric?.[cat.key]).filter(v => v != null) as number[]
        if (vals.length < 4 || !cat.max) return
        const pct = vals.reduce((a, b) => a + b, 0) / (vals.length * cat.max)
        if (pct < 0.45) out.push({ grade, rank: 65, n: vals.length, kind: 'writing',
          body: <><strong>{cls}</strong> averaged {Math.round(pct * 100)}% on <strong>{cat.label}</strong> in the writing ({vals.length} scripts){cat.standard ? <> &mdash; {cat.standard}</> : null}.</> })
      })
    })

    // The checklist criteria are the sharpest thing on the paper: each one is
    // already a sentence describing the move a student did or did not make.
    ct.writingCats.forEach((cat: any) => {
      (cat.checklist || []).forEach((item: any) => {
        const marked = cohort.map(r => raw[r.student.id]?.written_checklist?.[cat.key]?.[item.key])
          .filter(v => v != null)
        if (marked.length < 6) return
        const hit = marked.filter(Boolean).length
        const pct = hit / marked.length
        if (pct < 0.4) out.push({ grade, rank: 68, n: marked.length, kind: 'checklist',
          body: <><strong>{Math.round((1 - pct) * 100)}%</strong> of the grade missed <strong>{item.label}</strong> in the writing &mdash; {item.desc}</> })
      })
    })
  })
  return out
}

function Findings({ findings, loading, onGrade }: { findings: Finding[]; loading: boolean; onGrade: (g: number) => void }) {
  const [all, setAll] = useState(false)
  const shown = all ? findings : findings.slice(0, 8)
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-[12px] font-semibold text-navy">What stands out</p>
        {loading && <span className="text-[10px] text-text-tertiary inline-flex items-center gap-1"><Loader2 size={9} className="animate-spin" /> reading the papers</span>}
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1 text-[10px] text-text-tertiary hover:text-navy">
          <Printer size={11} /> Print
        </button>
      </div>
      <p className="text-[10px] text-text-tertiary mb-3">
        Ranked by how much evidence sits behind each, so a finding resting on three students sorts under one resting on sixty.
        Every line is checkable in the panels below &mdash; click one to open its grade.
      </p>
      {findings.length === 0 && !loading && <p className="text-[11px] text-text-tertiary italic">Nothing stands out on this year&rsquo;s tests.</p>}
      <div className="space-y-1.5">
        {shown.map((f, i) => (
          <button key={i} onClick={() => onGrade(f.grade)}
            className="w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-surface-alt transition-colors">
            <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${f.rank >= 88 ? 'bg-red-500' : f.rank >= 65 ? 'bg-amber-500' : 'bg-text-tertiary/40'}`} />
            <span className="text-[9px] font-bold text-text-tertiary shrink-0 mt-0.5 w-9">G{f.grade}</span>
            <span className="text-[11px] text-text-secondary leading-snug">{f.body}</span>
          </button>
        ))}
      </div>
      {findings.length > 8 && (
        <button onClick={() => setAll(!all)} className="text-[10px] text-navy hover:underline mt-2">
          {all ? 'Show fewer' : `Show all ${findings.length}`}
        </button>
      )}
    </div>
  )
}

// ─── One grade, on one page ──────────────────────────────────────────
// Sections rather than tabs, sharing one class filter. The valuable reading is
// almost always a conjunction -- this class overlaps the one above AND is weak
// on DOK 2 -- and tabs put the two halves in different rooms.
function GradeDetail({ summary, content, filterClass, onFilterClass, answersLoading, allTests, students }: {
  summary: any; content?: GradeContent; filterClass: EnglishClass | 'all'
  onFilterClass: (c: EnglishClass | 'all') => void; answersLoading: boolean
  allTests: LevelTest[]; students: Student[]
}) {
  const test: LevelTest = summary.test
  const rows: Sit[] = summary.rows
  const tested = rows.filter(r => r.band != null)
  const classesPresent = ENGLISH_CLASSES.filter(c => rows.some(r => r.student.english_class === c))
  const inFilter = (r: Sit) => filterClass === 'all' || r.student.english_class === filterClass

  return (
    <div className="space-y-4 border-t-2 border-navy/20 pt-5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[15px] font-semibold text-navy">Grade {test.grade}</span>
        <span className="text-[11px] text-text-tertiary">{test.name}</span>
        <div className="flex gap-1 flex-wrap ml-auto">
          <button onClick={() => onFilterClass('all')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All classes</button>
          {classesPresent.map(c => (
            <button key={c} onClick={() => onFilterClass(c)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${filterClass === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
              style={filterClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
          ))}
        </div>
      </div>

      <Classes test={test} tested={tested} filterClass={filterClass} />
      <Questions test={test} rows={rows.filter(inFilter)} allRows={rows} content={content} loading={answersLoading} filterClass={filterClass} />
      <Cohorts test={test} rows={rows.filter(inFilter)} allTests={allTests} students={students} />
    </div>
  )
}

function Classes({ test, tested, filterClass }: { test: LevelTest; tested: Sit[]; filterClass: EnglishClass | 'all' }) {
  const summarise = (cls: EnglishClass) => {
    const inClass = tested.filter(r => r.student.english_class === cls)
    const b = inClass.map(r => r.band!.composite).sort((a, x) => a - x)
    const median = b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null
    const passages: Record<string, number> = {}
    inClass.forEach(r => { passages[r.band!.effectiveLevel] = (passages[r.band!.effectiveLevel] || 0) + 1 })
    return { cls, rows: inClass, median, passages, modal: Object.entries(passages).sort((a, x) => x[1] - a[1])[0]?.[0] ?? null }
  }
  const ladder = PLACED_ENGLISH_CLASSES.map(summarise).filter(c => c.rows.length > 0)
  // Unplaced is not a rung -- it is where a transfer student waits until they
  // have been tested -- so it stays off the ladder and gets its own list.
  const unplaced = tested.filter(r => !PLACED_ENGLISH_CLASSES.includes(r.student.english_class as EnglishClass))

  const drift = ladder.flatMap((c, i) => {
    const out: { cls: EnglishClass; dir: 'up' | 'down'; other: EnglishClass; names: string[] }[] = []
    if (c.median == null) return out
    const up = ladder[i + 1], down = ladder[i - 1]
    if (up?.median != null && up.median > c.median) {
      const names = c.rows.filter(r => r.band!.composite > (c.median! + up.median!) / 2).map(r => r.student.english_name)
      if (names.length) out.push({ cls: c.cls, dir: 'up', other: up.cls, names })
    }
    if (down?.median != null && down.median < c.median) {
      const names = c.rows.filter(r => r.band!.composite < (c.median! + down.median!) / 2).map(r => r.student.english_name)
      if (names.length) out.push({ cls: c.cls, dir: 'down', other: down.cls, names })
    }
    return out
  })

  if (tested.length === 0) return <p className="text-[12px] text-text-tertiary py-6 text-center">No oral scores recorded for Grade {test.grade} yet.</p>

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Where each class actually sits</p>
        <p className="text-[10px] text-text-tertiary mb-4">
          One dot per student, placed by Band &mdash; the passage they sustained sets the floor, so a dot further right read a harder text.
          The line is the class median. Look for classes whose dots overlap, and for a class that is really two clusters rather than one.
        </p>
        {ladder.map(c => {
          const dim = filterClass !== 'all' && filterClass !== c.cls
          return (
            <div key={c.cls} className={`flex items-center gap-2 mb-2.5 transition-opacity ${dim ? 'opacity-25' : ''}`}>
              <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
              <div className="flex-1 relative h-7 bg-surface-alt/60 rounded border border-border">
                {[25, 50, 75].map(g => <div key={g} className="absolute top-0 h-full border-l border-border/60" style={{ left: `${g}%` }} />)}
                {c.rows.map(r => (
                  <div key={r.student.id}
                    title={`${r.student.english_name} — Band ${Math.round(r.band!.composite)}, passage ${r.band!.effectiveLevel}${r.band!.downgraded ? ` (tried ${r.band!.attemptedLevel})` : ''}`}
                    className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 border border-white/70"
                    style={{ left: `${Math.min(100, r.band!.composite)}%`, top: '50%', marginTop: -5, backgroundColor: PASSAGE_COLORS[r.band!.effectiveLevel] || '#94a3b8' }} />
                ))}
                {c.median != null && <div className="absolute top-0 h-full w-0.5 bg-navy" style={{ left: `${c.median}%` }} title={`Median ${Math.round(c.median)}`} />}
              </div>
              <span className="w-9 text-[10px] font-semibold text-navy shrink-0 text-right">{c.median != null ? Math.round(c.median) : '—'}</span>
              <span className="w-8 text-[10px] text-text-tertiary shrink-0">n={c.rows.length}</span>
            </div>
          )
        })}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-text-secondary flex-wrap">
          <span className="text-text-tertiary">Dot colour = passage sustained:</span>
          {BAND_LEVEL_ORDER.filter(l => ladder.some(c => c.passages[l])).map(l => (
            <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PASSAGE_COLORS[l] }} />{l}</span>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Same passage, different class</p>
        <p className="text-[10px] text-text-tertiary mb-3">
          Which passage each class typically sustained, across the six placed classes. Two of them on the same passage are reading the same text, whatever their names say.
        </p>
        {ladder.map(c => (
          <div key={c.cls} className="flex items-center gap-2 mb-1.5">
            <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
            <div className="flex-1 h-5 flex rounded-full overflow-hidden bg-gray-100">
              {BAND_LEVEL_ORDER.map(l => {
                const n = c.passages[l] || 0
                if (!n) return null
                return <div key={l} title={`Passage ${l}: ${n}`} className="h-full flex items-center justify-center"
                  style={{ width: `${(n / c.rows.length) * 100}%`, backgroundColor: PASSAGE_COLORS[l] }}>
                  {(n / c.rows.length) > 0.12 && <span className="text-[9px] font-bold text-white">{l}</span>}
                </div>
              })}
            </div>
            <span className="w-24 text-[10px] text-text-secondary shrink-0">mostly <strong>{c.modal ?? '—'}</strong></span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <DriftPanel title="Sitting above their class" tone="up" rows={drift.filter(d => d.dir === 'up')}
          blurb="Band closer to the class above than to their own. Not a verdict — the shortlist the meeting works through." />
        <DriftPanel title="Sitting below their class" tone="down" rows={drift.filter(d => d.dir === 'down')}
          blurb="Band closer to the class below. Check these against the reading-rate findings first: a rate that was never real, or a passage stopped early, lands a student here without meaning anything." />
      </div>

      {unplaced.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[12px] font-semibold text-navy">Waiting to be placed</p>
          <p className="text-[10px] text-text-tertiary mb-3">
            Transfer students held outside the ladder until they have been tested, so they are left out of the comparisons above. The Band answers the question the holding pen exists to hold.
          </p>
          <div className="space-y-1">
            {[...unplaced].sort((a, b) => b.band!.composite - a.band!.composite).map(r => (
              <div key={r.student.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-40 truncate text-navy font-medium shrink-0">{r.student.english_name}</span>
                <span className="text-text-tertiary shrink-0">Band {Math.round(r.band!.composite)}</span>
                <span className="text-text-tertiary shrink-0">passage {r.band!.effectiveLevel}</span>
                <ArrowRight size={11} className="text-text-tertiary shrink-0" />
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: classToColor(r.band!.suggestedClass as EnglishClass) + '40', color: classToTextColor(r.band!.suggestedClass as EnglishClass) }}>
                  {r.band!.suggestedClass}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DriftPanel({ title, blurb, rows, tone }: { title: string; blurb: string; tone: 'up' | 'down'; rows: { cls: EnglishClass; other: EnglishClass; names: string[] }[] }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[12px] font-semibold text-navy flex items-center gap-1.5">
        {tone === 'up' ? <TrendingUp size={13} className="text-green-600" /> : <TrendingDown size={13} className="text-amber-600" />}{title}
      </p>
      <p className="text-[10px] text-text-tertiary mb-3">{blurb}</p>
      {rows.length === 0
        ? <p className="text-[11px] text-text-tertiary italic">Nobody, on this test.</p>
        : rows.map(o => (
          <div key={`${o.cls}-${o.other}`} className="flex items-start gap-2 mb-2">
            <span className="text-[10px] font-semibold w-20 text-right shrink-0 pt-0.5" style={{ color: classToTextColor(o.cls) }}>{o.cls}</span>
            <span className="text-[11px] text-text-secondary">
              <strong className="text-navy">{o.names.length}</strong> closer to {o.other}: <span className="text-text-tertiary">{o.names.join(', ')}</span>
            </span>
          </div>
        ))}
    </div>
  )
}

// ─── Questions and writing ───────────────────────────────────────────
// Item analysis on the chosen letter rather than on right and wrong, and the
// writing beside it. The writing rubric never reaches the standards grid --
// that is built from the multiple choice alone -- so this is the only place a
// whole-class writing weakness is visible, and its checklist criteria are the
// sharpest thing on the paper: each is already a sentence naming the move a
// student did or did not make.
function Questions({ test, rows, allRows, content, loading, filterClass }: {
  test: LevelTest; rows: Sit[]; allRows: Sit[]; content?: GradeContent; loading: boolean; filterClass: EnglishClass | 'all'
}) {
  const [sortBy, setSortBy] = useState<'qNum' | 'hardest'>('qNum')
  const classes = ENGLISH_CLASSES.filter(c => allRows.some(r => r.student.english_class === c))

  const items = useMemo(() => (content?.questions || []).map((q: any) => {
    const picks: Record<string, number> = {}
    let answered = 0, correct = 0
    const byClass: Record<string, { n: number; correct: number }> = {}
    allRows.forEach(r => {
      const chosen = r.raw?.written_answers?.[q.qNum]
      if (!chosen) return
      const b = (byClass[r.student.english_class] ||= { n: 0, correct: 0 })
      b.n++; if (chosen === q.correct) b.correct++
      if (filterClass !== 'all' && r.student.english_class !== filterClass) return
      answered++; picks[chosen] = (picks[chosen] || 0) + 1
      if (chosen === q.correct) correct++
    })
    const topWrong = Object.entries(picks).filter(([k]) => k !== q.correct).sort((a, b) => b[1] - a[1])[0] || null
    return { q, picks, answered, correct, byClass, topWrong, pct: answered ? correct / answered : null }
  }), [content, allRows, filterClass])

  const ordered = useMemo(() => sortBy === 'hardest' ? [...items].sort((a, b) => (a.pct ?? 2) - (b.pct ?? 2)) : items, [items, sortBy])

  const rollup = (key: 'domain' | 'dok') => {
    const acc: Record<string, Record<string, { n: number; correct: number }>> = {}
    items.forEach(it => {
      const k = String(it.q[key] ?? '—')
      Object.entries(it.byClass).forEach(([cls, v]) => {
        const cell = ((acc[k] ||= {})[cls] ||= { n: 0, correct: 0 })
        cell.n += v.n; cell.correct += v.correct
      })
    })
    return acc
  }

  // Writing, per rubric category and then per checklist criterion.
  const writing = useMemo(() => (content?.writingCats || []).map((cat: any) => {
    const byClass: Record<string, { sum: number; n: number }> = {}
    allRows.forEach(r => {
      const v = r.raw?.written_rubric?.[cat.key]
      if (v == null) return
      const c = (byClass[r.student.english_class] ||= { sum: 0, n: 0 })
      c.sum += v; c.n++
    })
    const criteria = (cat.checklist || []).map((item: any) => {
      const byCls: Record<string, { hit: number; n: number }> = {}
      allRows.forEach(r => {
        const v = r.raw?.written_checklist?.[cat.key]?.[item.key]
        if (v == null) return
        const c = (byCls[r.student.english_class] ||= { hit: 0, n: 0 })
        if (v) c.hit++
        c.n++
      })
      return { item, byCls }
    })
    return { cat, byClass, criteria }
  }).filter((w: any) => Object.keys(w.byClass).length > 0), [content, allRows])

  if (loading) return <div className="p-8 text-center bg-surface border border-border rounded-xl"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>
  if (!content || (content.questions.length === 0 && content.writingCats.length === 0)) {
    return <p className="text-[12px] text-text-tertiary py-6 text-center">No paper is authored for this test.</p>
  }
  const anyAnswers = items.some(i => i.answered > 0)
  const anyWriting = writing.length > 0

  return (
    <div className="space-y-4">
      {!anyAnswers && !anyWriting && (
        <p className="text-[12px] text-text-tertiary py-6 text-center bg-surface border border-border rounded-xl">
          No written paper marked yet for Grade {test.grade}{filterClass !== 'all' ? ` ${filterClass}` : ''}.
        </p>
      )}

      {anyWriting && (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <div className="p-4 pb-2">
            <p className="text-[12px] font-semibold text-navy">Writing</p>
            <p className="text-[10px] text-text-tertiary">
              Scored by rubric, so none of this reaches the standards grid. Maxima differ by grade, so each cell is a share of its own category&rsquo;s total.
              Where a category is a checklist, the criteria beneath it name the exact move that was missed.
            </p>
          </div>
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-alt">
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[210px]">Category</th>
              {classes.map(c => <th key={c} className="text-center px-3 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[76px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
            </tr></thead>
            <tbody>{writing.map((w: any) => (
              // Keyed on the fragment: the category row and its criteria rows
              // are one group, and a key on the inner <tr> alone does not
              // satisfy the list.
              <Fragment key={w.cat.key}>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">
                    <span className="font-medium text-navy">{w.cat.label}</span>
                    <span className="block text-[9px] text-text-tertiary">out of {w.cat.max}{w.cat.standard ? ` · ${w.cat.standard}` : ''}</span>
                  </td>
                  {classes.map(c => <Cell key={c} v={w.byClass[c] ? { correct: w.byClass[c].sum, n: w.byClass[c].n * w.cat.max } : null} sub={w.byClass[c] ? `${w.byClass[c].n} scripts` : ''} />)}
                </tr>
                {w.criteria.map((cr: any) => (
                  <tr key={`${w.cat.key}-${cr.item.key}`} className="border-t border-border/50 bg-surface-alt/20">
                    <td className="px-3 py-1.5 pl-7">
                      <span className="text-[10px] text-text-secondary">{cr.item.label}</span>
                      {cr.item.desc && <span className="block text-[9px] text-text-tertiary leading-snug max-w-[280px]">{cr.item.desc}</span>}
                    </td>
                    {classes.map(c => <Cell key={c} v={cr.byCls[c] ? { correct: cr.byCls[c].hit, n: cr.byCls[c].n } : null} small />)}
                  </tr>
                ))}
              </Fragment>
            ))}</tbody>
          </table>
        </div>
      )}

      {anyAnswers && (
        <>
          <Rollup title="By domain" acc={rollup('domain')} classes={classes}
            blurb="Every question grouped by what it asks for. The view to trust when a single question has three students behind it." />
          <Rollup title="By depth of knowledge" acc={rollup('dok')} classes={classes} prefix="DOK "
            blurb="DOK 1 is retrieval; DOK 2 asks the student to do something with what they found. Strong on 1 and weak on 2 means they can locate but not infer, which is a different lesson from not understanding the passage." />

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-4 pb-2 flex items-start gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-navy">Question by question{filterClass !== 'all' ? ` — ${filterClass}` : ''}</p>
                <p className="text-[10px] text-text-tertiary">
                  The bar is what {filterClass === 'all' ? 'the grade' : filterClass} chose. Key in green, most-chosen wrong answer in amber, and where the paper says what choosing it means, it says so underneath.
                </p>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 border border-border rounded-lg text-[10px] bg-surface ml-auto shrink-0">
                <option value="qNum">Paper order</option>
                <option value="hardest">Hardest first</option>
              </select>
            </div>
            <div className="divide-y divide-border">{ordered.map(it => <Item key={it.q.qNum} it={it} classes={classes} />)}</div>
          </div>
        </>
      )}
    </div>
  )
}

function Cell({ v, sub, small }: { v: { correct: number; n: number } | null; sub?: string; small?: boolean }) {
  if (!v || v.n === 0) return <td className="px-3 py-2 text-center text-text-tertiary">—</td>
  const pct = Math.round((v.correct / v.n) * 100)
  const thin = v.n < 4
  const tone = thin ? 'bg-surface-alt text-text-tertiary border-border'
    : pct >= 75 ? 'bg-green-50 text-green-700 border-green-200'
    : pct >= 45 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <td className="px-3 py-1.5 text-center">
      <span className={`inline-block px-2 py-0.5 rounded border font-semibold ${small ? 'text-[9px]' : 'text-[10px]'} ${tone}`}
        title={thin ? `Only ${v.n} behind this.` : undefined}>{pct}%</span>
      {sub && <span className="block text-[8px] text-text-tertiary mt-0.5">{sub}</span>}
    </td>
  )
}

function Rollup({ title, blurb, acc, classes, prefix = '' }: { title: string; blurb: string; acc: Record<string, Record<string, { n: number; correct: number }>>; classes: EnglishClass[]; prefix?: string }) {
  const keys = Object.keys(acc).sort()
  if (keys.length === 0) return null
  return (
    <div className="bg-surface border border-border rounded-xl overflow-x-auto">
      <div className="p-4 pb-2">
        <p className="text-[12px] font-semibold text-navy">{title}</p>
        <p className="text-[10px] text-text-tertiary">{blurb}</p>
      </div>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[150px]">&nbsp;</th>
          {classes.map(c => <th key={c} className="text-center px-3 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[76px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
        </tr></thead>
        <tbody>{keys.map(k => (
          <tr key={k} className="border-t border-border">
            <td className="px-3 py-2 font-medium text-navy">{prefix}{k}</td>
            {classes.map(c => <Cell key={c} v={acc[k][c] ?? null} sub={acc[k][c] ? `${acc[k][c].correct}/${acc[k][c].n}` : ''} />)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function Item({ it, classes }: { it: any; classes: EnglishClass[] }) {
  const q = it.q
  const letters = ['a', 'b', 'c', 'd'].slice(0, (q.choices || []).length)
  const thin = it.answered < 5
  const pct = it.pct != null ? Math.round(it.pct * 100) : null
  const keyBeaten = it.topWrong && it.topWrong[1] > (it.picks[q.correct] || 0) && it.answered >= 8
  return (
    <div className={`p-4 ${keyBeaten ? 'bg-red-50/40' : ''}`}>
      <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-navy shrink-0">Q{q.qNum}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${thin ? 'bg-surface-alt text-text-tertiary' : pct != null && pct >= 75 ? 'bg-green-100 text-green-700' : pct != null && pct >= 45 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {pct != null ? `${pct}%` : '—'}
        </span>
        <span className="text-[9px] text-text-tertiary">{it.correct}/{it.answered}</span>
        {q.standard && <span className="text-[9px] text-text-tertiary">{q.standard}</span>}
        {q.dok != null && <span className="text-[9px] text-text-tertiary">DOK {q.dok}</span>}
        {keyBeaten && (
          <span className="text-[9px] font-bold text-red-700 inline-flex items-center gap-1" title="More chose one wrong answer than chose the key. Check the question and its key before counting this item.">
            <AlertTriangle size={10} /> a wrong answer beat the key
          </span>
        )}
      </div>
      <p className="text-[11px] text-text-secondary mb-2">{q.text}</p>
      <div className="space-y-1 mb-2">
        {letters.map((L, i) => {
          const n = it.picks[L] || 0
          const share = it.answered ? (n / it.answered) * 100 : 0
          const isKey = L === q.correct
          const isTopWrong = it.topWrong && it.topWrong[0] === L
          return (
            <div key={L} className="flex items-center gap-2">
              <span className={`w-4 text-[10px] font-bold shrink-0 ${isKey ? 'text-green-700' : 'text-text-tertiary'}`}>{L})</span>
              <span className={`text-[10px] flex-1 min-w-0 truncate ${isKey ? 'text-green-800 font-medium' : 'text-text-secondary'}`}>{q.choices?.[i]}</span>
              <div className="w-32 h-3 bg-gray-100 rounded-full overflow-hidden shrink-0">
                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: isKey ? '#22C55E' : isTopWrong ? '#F59E0B' : '#CBD5E1' }} />
              </div>
              <span className="w-9 text-[10px] text-text-tertiary shrink-0 text-right">{n}</span>
            </div>
          )
        })}
      </div>
      {q.note && <p className="text-[10px] text-text-secondary bg-surface-alt/60 border border-border rounded-lg px-2.5 py-1.5 mb-2 leading-snug">{q.note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {classes.map(c => {
          const v = it.byClass[c]
          if (!v || v.n === 0) return null
          const p = Math.round((v.correct / v.n) * 100)
          const weak = v.n >= 3 && p < 50
          return <span key={c} title={`${v.correct} of ${v.n}`}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${weak ? 'bg-red-50 text-red-700 border-red-200 font-semibold' : 'bg-surface-alt text-text-tertiary border-border'}`}>{c} {p}%</span>
        })}
      </div>
    </div>
  )
}

// ─── Cohorts ─────────────────────────────────────────────────────────
// The same children a year on. The only view that separates "this year's grade
// is weak" from "these particular children are weak" -- a curriculum problem
// from a cohort one. Matched on student id, so a child who joined mid-year has
// no prior column rather than counting as a decline.
function Cohorts({ test, rows, allTests, students }: { test: LevelTest; rows: Sit[]; allTests: LevelTest[]; students: Student[] }) {
  const [data, setData] = useState<{ student: Student; now: number; before: number }[] | null>(null)
  const ids = rows.map(r => r.student.id).join(',')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const idList = rows.map(r => r.student.id)
      if (idList.length === 0) { setData([]); return }
      const { data: sc } = await supabase.from('level_test_scores')
        .select('level_test_id, student_id, calculated_metrics').in('student_id', idList)
      if (!alive) return
      const by: Record<string, any[]> = {}
      sc?.forEach((r: any) => { (by[r.student_id] ||= []).push(r) })
      const out: { student: Student; now: number; before: number }[] = []
      rows.forEach(r => {
        const mine = (by[r.student.id] || []).map(x => ({ x, t: allTests.find(t => t.id === x.level_test_id) }))
          .filter(v => v.t) as { x: any; t: LevelTest }[]
        mine.sort((a, b) => testOrder(a.t).localeCompare(testOrder(b.t)))
        const prior = mine.filter(v => testOrder(v.t) < testOrder(test)).pop()
        const now = r.band?.composite
        const before = prior ? bandOf(prior.t, prior.x.calculated_metrics)?.composite : null
        if (now != null && before != null) out.push({ student: r.student, now, before })
      })
      setData(out)
    })()
    return () => { alive = false }
  }, [ids, test.id])

  if (data == null) return <div className="p-6 text-center bg-surface border border-border rounded-xl"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>
  if (data.length === 0) return null
  const up = data.filter(d => d.now > d.before + 3).length
  const flat = data.filter(d => Math.abs(d.now - d.before) <= 3).length
  const down = data.filter(d => d.now < d.before - 3).length

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[12px] font-semibold text-navy">The same children, a year on</p>
      <p className="text-[10px] text-text-tertiary mb-3">
        {data.length} of these students sat an earlier test. Band says how far up their OWN grade&rsquo;s ladder a child reached, and the ladder gets harder each year &mdash;
        so holding position is real progress, not standing still.
      </p>
      <div className="flex gap-2 flex-wrap mb-3">
        <Stat n={up} label="moved up their ladder" tone="green" />
        <Stat n={flat} label="held position" tone="grey" />
        <Stat n={down} label="fell back" tone="red" />
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {[...data].sort((a, b) => (a.now - a.before) - (b.now - b.before)).map(d => {
          const delta = Math.round(d.now - d.before)
          return (
            <div key={d.student.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-40 truncate text-navy font-medium shrink-0">{d.student.english_name}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: classToColor(d.student.english_class as EnglishClass) + '40', color: classToTextColor(d.student.english_class as EnglishClass) }}>{d.student.english_class}</span>
              <span className="text-text-tertiary shrink-0">{Math.round(d.before)}</span>
              <ArrowRight size={11} className="text-text-tertiary shrink-0" />
              <span className="text-navy font-semibold shrink-0">{Math.round(d.now)}</span>
              <span className={`text-[10px] font-semibold shrink-0 ${delta > 3 ? 'text-green-600' : delta < -3 ? 'text-red-600' : 'text-text-tertiary'}`}>
                {delta > 3 ? <TrendingUp size={10} className="inline" /> : delta < -3 ? <TrendingDown size={10} className="inline" /> : <Minus size={10} className="inline" />} {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: 'green' | 'red' | 'grey' }) {
  const cls = tone === 'green' ? 'text-green-700 bg-green-50 border-green-200'
    : tone === 'red' ? 'text-red-700 bg-red-50 border-red-200' : 'text-text-secondary bg-surface-alt border-border'
  return <span className={`inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-lg border ${cls}`}><strong className="text-[15px]">{n}</strong><span className="text-[10px]">{label}</span></span>
}
