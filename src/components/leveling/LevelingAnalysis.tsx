'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, PLACED_ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, ChevronDown } from 'lucide-react'
import { bandFromCalc, g2ClassFromBand } from './grade2Band'
import { computeRow, rankRows, buildLevelCwpmNorms, versionKeyForTest } from './placement'
import { calculateG1Composite, g1WeightedComposite, g1ClassFromRank } from './Grade1ScoreEntry'
import { g1ContentForTest } from './grade1Content'

/** 0 = red, 100 = violet. Used for the per-class tags on a question. */
function rainbow(pct: number): string {
  return `hsl(${Math.round(Math.max(0, Math.min(1, pct)) * 280)}, 72%, 45%)`
}

const PASSAGE_COLORS: Record<string, string> = {
  A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6', F: '#A855F7',
}
/** Where g2ClassFromBand cuts. Drawn on the picture so the colours explain themselves. */
const CLASS_CUTS = [20, 35, 50, 65, 80]
/** Maximum class size. Shown, never enforced -- placement is a teacher's call. */
const CLASS_CAP = 15
const testOrder = (t: LevelTest) => `${t.academic_year}-${t.semester === 'fall' ? '0' : '1'}`

/**
 * Grade 1 keeps its own band scale inside Grade1ScoreEntry and stores the
 * result as oral_score, so bandFromCalc -- which resolves the shared A-F
 * ladder -- has nothing to give it. Both are 0-100 built on passage floors.
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

interface Row {
  student: Student
  calc: any
  raw: any
  band: ReturnType<typeof bandOf>
  /** 0-1. What placement actually ranks on. */
  composite: number
  isTested: boolean
  /** The class the composite puts them in -- the same value the Results tab shows. */
  suggested: EnglishClass | null
  /** The class they were placed in at the most recent earlier test, if any. */
  lastYear: EnglishClass | null
}
interface Paper {
  questions: any[]
  writingCats: any[]
  /** Comprehension questions per passage level, so a comp score can be given its DOK. */
  compByLevel: Record<string, { q: string; dok: string }[]>
  compScoreMax: number
  phonicsRows: number
  phonicsRowMax: number
  sentenceCount: number
}

const EMPTY_PAPER: Paper = { questions: [], writingCats: [], compByLevel: {}, compScoreMax: 2, phonicsRows: 0, phonicsRowMax: 0, sentenceCount: 0 }

async function loadPaper(test: LevelTest): Promise<Paper> {
  const g = Number(test.grade)
  try {
    if (g === 1) {
      const c = (await import('./grade1Content')).g1ContentForTest(test as any)
      if (!c) return EMPTY_PAPER
      return {
        ...EMPTY_PAPER,
        questions: c.written.questions,
        writingCats: c.extendedWriting.categories as any[],
        compByLevel: (c.compQuestions || {}) as any,
        compScoreMax: 2,
      }
    }
    const mod = g === 2 ? await import('./grade2Content') : g === 3 ? await import('./grade3Content')
      : g === 4 ? await import('./grade4Content') : g === 5 ? await import('./grade5Content') : null
    const c = mod ? (mod as any)[`g${g}ContentForTest`](test as any) : null
    if (!c) return EMPTY_PAPER
    // Grade 2 nests its reading under oral.reading; grades 3-5 sit it directly
    // on oral, and only Grade 2 has phonics and sentence sections at all.
    const oral = c.oral ?? {}
    const reading = oral.reading ?? oral
    return {
      questions: c.written?.questions ?? [],
      writingCats: c.writing?.categories ?? [],
      compByLevel: (reading.compQuestions ?? {}) as any,
      compScoreMax: g === 2 ? 2 : 2,
      phonicsRows: oral.phonics?.rows?.length ?? 0,
      phonicsRowMax: oral.phonics?.rows?.length ? Math.round((oral.phonics.max ?? 0) / oral.phonics.rows.length) : 0,
      sentenceCount: oral.sentences?.items?.length ?? 0,
    }
  } catch { return EMPTY_PAPER }
}

export default function LevelingAnalysis({ levelTests }: { levelTests: LevelTest[] }) {
  const years = useMemo(() => Array.from(new Set(levelTests.map(t => t.academic_year))).sort().reverse(), [levelTests])
  const [year, setYear] = useState(years[0] || '')
  const tests = useMemo(
    () => levelTests.filter(t => t.academic_year === year).sort((a, b) => Number(a.grade) - Number(b.grade)),
    [levelTests, year])

  const [testId, setTestId] = useState<string | null>(null)
  const test = tests.find(t => t.id === testId) || tests[0] || null
  useEffect(() => { if (tests.length && !tests.some(t => t.id === testId)) setTestId(tests[0].id) }, [tests, testId])

  const [view, setView] = useState<'placement' | 'questions'>('placement')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [paper, setPaper] = useState<Paper>(EMPTY_PAPER)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!test) { setLoading(false); return }
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const [{ data: studs }, { data: sc }] = await Promise.all([
          supabase.from('students').select('id, english_name, korean_name, english_class, grade')
            .eq('is_active', true).eq('grade', Number(test.grade)).order('english_name'),
          supabase.from('level_test_scores').select('student_id, calculated_metrics, raw_scores').eq('level_test_id', test.id),
        ])
        if (!alive) return
        const ids = (studs || []).map((s: any) => s.id)
        // Where they were placed at the most recent EARLIER test. Class to class
        // is comparable across years in a way Band is not: a Grade 4 Band and a
        // Grade 5 Band both mean "near the top of what my grade was asked".
        const { data: pl } = ids.length
          ? await supabase.from('level_test_placements').select('level_test_id, student_id, final_placement').in('student_id', ids)
          : { data: [] as any[] }
        if (!alive) return
        const priorBy: Record<string, EnglishClass> = {}
        pl?.forEach((p: any) => {
          const t = levelTests.find(x => x.id === p.level_test_id)
          if (!t || testOrder(t) >= testOrder(test)) return
          const cur = priorBy[p.student_id]
          if (!cur) priorBy[p.student_id] = p.final_placement
        })
        // The composite and the suggested class come from the same functions the
        // Results tab and the drag board use, so this page cannot answer "where
        // does this child go" differently from the screen that saves it.
        const scoreMap: Record<string, any> = {}
        sc?.forEach((r: any) => { scoreMap[r.student_id] = { raw_scores: r.raw_scores, calculated_metrics: r.calculated_metrics } })

        // Grade 1 keeps its own scoring end to end -- its raw keys are prefixed
        // o_ and w_, its written score is a rubric rather than an MC total, and
        // its composite is g1WeightedComposite. computeRow reads none of those,
        // so pointing it at Grade 1 returned a grade of untested students.
        if (Number(test.grade) === 1) {
          const content = g1ContentForTest(test as any)
          const scored = (studs || []).map((s: any) => {
            const raw = scoreMap[s.id]?.raw_scores || {}
            if (!content) return { student: s, raw, weighted: null as number | null, metrics: null as any }
            const metrics = calculateG1Composite(raw, content, s.english_class, null)
            return { student: s, raw, weighted: g1WeightedComposite(metrics, raw, content), metrics }
          })
          const ranked = scored.filter(r => r.weighted != null).sort((a, b) => (a.weighted as number) - (b.weighted as number))
          const suggestion: Record<string, EnglishClass> = {}
          ranked.forEach((r, i) => { suggestion[r.student.id] = g1ClassFromRank(i, ranked.length) })
          setRows(scored.map(r => ({
            student: r.student,
            calc: scoreMap[r.student.id]?.calculated_metrics || null,
            raw: r.raw,
            band: bandOf(test, scoreMap[r.student.id]?.calculated_metrics),
            composite: r.weighted ?? 0,
            isTested: r.weighted != null,
            suggested: suggestion[r.student.id] ?? null,
            lastYear: priorBy[r.student.id] ?? null,
          })))
          setPaper(await loadPaper(test))
          return
        }

        const norms = buildLevelCwpmNorms(studs as any, scoreMap)
        const computed = rankRows((studs || []).map((s: any) =>
          computeRow(s, scoreMap, {}, {}, {}, test.grade, undefined, versionKeyForTest(test), undefined, norms)))
        setRows(computed.map((r: any) => ({
          student: r.student,
          calc: scoreMap[r.student.id]?.calculated_metrics || null,
          raw: scoreMap[r.student.id]?.raw_scores || null,
          band: r.band,
          composite: r.composite,
          isTested: r.isTested,
          suggested: r.suggestedClass as EnglishClass | null,
          lastYear: priorBy[r.student.id] ?? null,
        })))
        setPaper(await loadPaper(test))
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [test?.id])

  if (!test) return <p className="text-text-tertiary text-[13px] py-8 text-center">No level tests yet.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {tests.map(t => (
            <button key={t.id} onClick={() => setTestId(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold ${t.id === test.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
              Grade {t.grade}
            </button>
          ))}
        </div>
        <div className="flex gap-1 border-l border-border pl-2 ml-1">
          {(['placement', 'questions'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize ${view === v ? 'bg-navy/10 text-navy' : 'text-text-secondary hover:bg-surface-alt'}`}>
              {v}
            </button>
          ))}
        </div>
        {years.length > 1 && (
          <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-[11px] bg-surface ml-auto">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {loading || rows == null
        ? <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
        : view === 'placement'
          ? <Placement test={test} rows={rows} />
          : <Questions test={test} rows={rows} paper={paper} />}
    </div>
  )
}

// ─── Placement ───────────────────────────────────────────────────────
// A working document for a room of people deciding where a grade of children
// go. Three objects, in the order they get used: the matrix says how much
// movement there is and between which classes, the picture shows who, and the
// table is what gets read out.
function Placement({ test, rows }: { test: LevelTest; rows: Row[] }) {
  // Ranked students, i.e. those with test evidence. The suggestion is the one
  // that gets saved, so this table and the Results tab cannot disagree.
  const tested = rows.filter(r => r.suggested != null)
  const [cell, setCell] = useState<{ from: EnglishClass; to: EnglishClass } | null>(null)
  const [onlyMoves, setOnlyMoves] = useState(false)

  const classes = useMemo(
    () => ENGLISH_CLASSES.filter(c => rows.some(r => r.student.english_class === c)),
    [rows])

  // Rows are where a student is, columns are where the Band puts them. The
  // diagonal is staying; everything off it is a move.
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, Row[]>> = {}
    tested.forEach(r => {
      const from = r.student.english_class as EnglishClass
      const to = r.suggested as EnglishClass
      ;((m[from] ||= {})[to] ||= []).push(r)
    })
    return m
  }, [tested])

  const listed = useMemo(() => {
    let out = cell ? (matrix[cell.from]?.[cell.to] ?? []) : tested
    if (!cell && onlyMoves) out = out.filter(r => r.suggested !== r.student.english_class)
    return [...out].sort((a, b) => b.composite - a.composite)
  }, [tested, matrix, cell, onlyMoves])

  if (tested.length === 0) {
    return <p className="text-[13px] text-text-tertiary py-10 text-center">No scores recorded for Grade {test.grade} yet.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-secondary">
        <strong className="text-navy">{rows.length}</strong> students &middot; <strong className="text-navy">{tested.length}</strong> tested
      </p>

      {/* ── Movement matrix ── */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <div className="px-4 pt-3.5 pb-2">
          <p className="text-[12px] font-semibold text-navy">Where they are, and where the test puts them</p>
          <p className="text-[10px] text-text-tertiary">Down the diagonal is staying. Click any number for the names.</p>
        </div>
        <table className="text-[11px] w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">In</th>
              {PLACED_ENGLISH_CLASSES.map(c => (
                <th key={c} className="px-2 py-2 text-center text-[9px] uppercase tracking-wider font-semibold min-w-[64px]" style={{ color: classToTextColor(c) }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>{classes.map(from => {
            const inRow = PLACED_ENGLISH_CLASSES.reduce((s, to) => s + (matrix[from]?.[to]?.length ?? 0), 0)
            if (inRow === 0) return null
            return (
              <tr key={from} className="border-t border-border">
                <td className="px-3 py-2 font-semibold whitespace-nowrap" style={{ color: classToTextColor(from as EnglishClass) }}>{from}</td>
                {PLACED_ENGLISH_CLASSES.map(to => {
                  const n = matrix[from]?.[to]?.length ?? 0
                  const stay = from === to
                  const on = cell?.from === from && cell?.to === to
                  return (
                    <td key={to} className="p-0 text-center">
                      {n === 0
                        ? <span className="block py-2 text-text-tertiary/40">·</span>
                        : <button onClick={() => setCell(on ? null : { from: from as EnglishClass, to })}
                            className={`w-full py-2 font-bold transition-colors ${on ? 'bg-navy text-white' : stay ? 'text-text-secondary hover:bg-surface-alt' : 'text-navy hover:bg-surface-alt'}`}
                            style={!on && !stay ? { backgroundColor: classToColor(to) + '22' } : undefined}>
                            {n}
                          </button>}
                    </td>
                  )
                })}
              </tr>
            )
          })}</tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-alt/50">
              <td className="px-3 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">Would be</td>
              {PLACED_ENGLISH_CLASSES.map(to => {
                const n = classes.reduce((sum, from) => sum + (matrix[from]?.[to]?.length ?? 0), 0)
                const over = n > CLASS_CAP
                return (
                  <td key={to} className="px-2 py-2 text-center">
                    <span className={`font-bold ${over ? 'text-red-600' : 'text-navy'}`}
                      title={over ? `${n} is over the cap of ${CLASS_CAP}` : undefined}>{n || '·'}</span>
                    {over && <span className="block text-[8px] text-red-600">over {CLASS_CAP}</span>}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
        {/* The names belong where the click happened. They used to appear in a
            table far below, which meant scrolling away from the number you were
            asking about. */}
        {cell && (
          <div className="border-t border-border px-4 py-3 bg-surface-alt/40">
            <p className="text-[11px] font-semibold text-navy mb-1.5">
              {cell.from} <span className="text-text-tertiary">&rarr;</span> {cell.to}
              <span className="text-text-tertiary font-normal ml-1.5">{matrix[cell.from]?.[cell.to]?.length ?? 0}</span>

            </p>
            <div className="flex flex-wrap gap-1.5">
              {(matrix[cell.from]?.[cell.to] ?? []).sort((a, b) => b.composite - a.composite).map(r => (
                <span key={r.student.id} className="inline-flex items-baseline gap-1 px-2 py-1 rounded-lg bg-surface border border-border text-[11px]">
                  <span className="font-medium text-navy">{r.student.english_name}</span>
                  <span className="text-text-tertiary text-[10px]">{Math.round(r.composite * 100)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Where the cut lines fall ── */}
      {/* The matrix counts moves; it cannot show WHY one is a move. This can:
          the six bands behind the dots are the score ranges each class occupies,
          so a student's distance from the nearest line is how marginal their
          placement is -- which is the thing a meeting actually argues about. */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">How close each student is to a cut line</p>
        <p className="text-[10px] text-text-tertiary mb-3">
          The bands are the score range for each class. A dot sitting near a line could go either way; a dot in the middle of a band is settled.
        </p>
        <div className="flex mb-1 ml-20 mr-8">
          {PLACED_ENGLISH_CLASSES.map((c, i) => {
            const from = i === 0 ? 0 : CLASS_CUTS[i - 1]
            const to = i === CLASS_CUTS.length ? 100 : CLASS_CUTS[i]
            return (
              <div key={c} className="text-center overflow-hidden" style={{ width: `${to - from}%` }}>
                <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: classToTextColor(c) }}>{c}</span>
              </div>
            )
          })}
        </div>
        <div className="space-y-1.5">
          {classes.map(c => {
            const inClass = tested.filter(r => r.student.english_class === c)
            if (inClass.length === 0) return null
            return (
              <div key={c} className="flex items-center gap-2">
                <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c) }}>{c}</span>
                <div className="flex-1 relative h-7 rounded overflow-hidden border border-border">
                  {PLACED_ENGLISH_CLASSES.map((band, i) => {
                    const from = i === 0 ? 0 : CLASS_CUTS[i - 1]
                    const to = i === CLASS_CUTS.length ? 100 : CLASS_CUTS[i]
                    return <div key={band} className="absolute top-0 h-full" style={{ left: `${from}%`, width: `${to - from}%`, backgroundColor: classToColor(band) + '1f' }} />
                  })}
                  {CLASS_CUTS.map(x => <div key={x} className="absolute top-0 h-full w-px bg-border" style={{ left: `${x}%` }} />)}
                  {inClass.map(r => {
                    const x = r.composite * 100
                    const sug = r.suggested as EnglishClass
                    const moving = sug !== c
                    const marginal = Math.min(...CLASS_CUTS.map(cut => Math.abs(x - cut))) < 4
                    return (
                      <div key={r.student.id}
                        title={`${r.student.english_name} — composite ${Math.round(x)} → ${sug}${marginal ? ' (close to a line)' : ''}`}
                        className={`absolute w-3 h-3 rounded-full -translate-x-1/2 ${moving ? 'ring-2 ring-navy' : 'border border-white/70'}`}
                        style={{ left: `${Math.min(99, Math.max(1, x))}%`, top: '50%', marginTop: -6, backgroundColor: classToColor(sug), zIndex: moving ? 2 : 1 }} />
                    )
                  })}
                </div>
                <span className="w-7 text-[10px] text-text-tertiary shrink-0">{inClass.length}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-text-tertiary mt-2">
          Dot colour is the class the test puts them in. A <span className="inline-block w-2.5 h-2.5 rounded-full ring-2 ring-navy align-middle bg-surface-alt" /> ringed dot is one whose row and colour disagree &mdash; a move.
        </p>
      </div>

      {/* ── Oral against written ── */}
      {/* The one comparison nothing else in the app makes. A strong decoder who
          does not comprehend and a nervous reader who is fine on paper both
          read as "middling" everywhere else; here they sit in opposite corners.
          It also explains WHY a student landed where the matrix put them, which
          is what gets argued about in the room. */}
      <OralVsWritten rows={tested} />

      {/* ── The list that gets read out ── */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <div className="px-4 pt-3.5 pb-2 flex items-center gap-2 flex-wrap">
          <p className="text-[12px] font-semibold text-navy">
            {cell ? <>{cell.from} <span className="text-text-tertiary">&rarr;</span> {cell.to}</> : 'Every tested student'}
          </p>
          <span className="text-[10px] text-text-tertiary">{listed.length}</span>
          {cell
            ? <button onClick={() => setCell(null)} className="text-[10px] text-navy hover:underline ml-auto">Show all</button>
            : <button onClick={() => setOnlyMoves(!onlyMoves)} className={`text-[10px] ml-auto px-2 py-1 rounded-lg ${onlyMoves ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
                Only where it differs
              </button>}
        </div>
        <table className="w-full text-[11px]">
          <thead><tr className="bg-surface-alt">
            {['Student', 'In', 'Composite', 'Band', 'Passage', 'Test suggests', 'Last placed'].map((h, i) => (
              <th key={h} className={`px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{listed.map(r => {
            // r.band is null for a student with written scores but no oral
            // passage on record, and for one whose oral session was marked
            // complete with nothing read. They are still ranked, so the
            // suggestion comes off the composite, never off the band.
            const sug = r.suggested as EnglishClass
            const diff = sug !== r.student.english_class
            return (
              <tr key={r.student.id} className={`border-t border-border ${diff ? 'bg-amber-50/30' : ''}`}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-medium text-navy">{r.student.english_name}</span>
                  <span className="text-text-tertiary ml-1.5 text-[10px]">{r.student.korean_name}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(r.student.english_class as EnglishClass) + '40', color: classToTextColor(r.student.english_class as EnglishClass) }}>{r.student.english_class}</span>
                </td>
                <td className="px-3 py-2 text-center font-semibold text-navy">{Math.round(r.composite * 100)}</td>
                <td className="px-3 py-2 text-center text-text-secondary">{r.band ? Math.round(r.band.composite) : '—'}</td>
                <td className="px-3 py-2 text-center">
                  {r.band ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PASSAGE_COLORS[r.band.effectiveLevel] }} />
                      {r.band.effectiveLevel}
                      {r.band.downgraded && <span className="text-[8px] text-amber-600" title={`Tried ${r.band.attemptedLevel}, did not sustain it`}>&darr;</span>}
                    </span>
                  ) : <span className="text-text-tertiary">—</span>}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(sug) + '40', color: classToTextColor(sug) }}>{sug}</span>
                </td>
                <td className="px-3 py-2 text-center text-[10px] text-text-tertiary">{r.lastYear ?? '—'}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Questions ───────────────────────────────────────────────────────
// A different job on a different day: after the meeting, deciding what to
// reteach. Item analysis on the chosen letter rather than on right and wrong,
// and the writing beside it -- the rubric never reaches the standards grid, so
// this is the only place a whole-class writing weakness shows up.
function Questions({ test, rows, paper }: { test: LevelTest; rows: Row[]; paper: Paper }) {
  const [openQ, setOpenQ] = useState<number | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const classes = ENGLISH_CLASSES.filter(c => rows.some(r => r.student.english_class === c))

  const items = useMemo(() => paper.questions.map((q: any) => {
    const picks: Record<string, number> = {}
    const byClass: Record<string, { n: number; correct: number }> = {}
    let answered = 0, correct = 0
    rows.forEach(r => {
      const chosen = r.raw?.written_answers?.[q.qNum]
      if (!chosen) return
      answered++; picks[chosen] = (picks[chosen] || 0) + 1
      const ok = chosen === q.correct
      if (ok) correct++
      const b = (byClass[r.student.english_class] ||= { n: 0, correct: 0 })
      b.n++; if (ok) b.correct++
    })
    const topWrong = Object.entries(picks).filter(([k]) => k !== q.correct).sort((a, b) => b[1] - a[1])[0] || null
    return { q, picks, answered, correct, byClass, topWrong, pct: answered ? correct / answered : null }
  }), [paper, rows])

  const writing = useMemo(() => paper.writingCats.map((cat: any) => {
    const byClass: Record<string, { sum: number; n: number }> = {}
    rows.forEach(r => {
      const v = r.raw?.written_rubric?.[cat.key]
      if (v == null) return
      const c = (byClass[r.student.english_class] ||= { sum: 0, n: 0 })
      c.sum += v; c.n++
    })
    // written_checklist stores category key -> the array of box keys that were
    // ticked, not a map of booleans. Indexing it by box key returned undefined
    // for everyone, so these percentages never appeared at all. A student counts
    // once their category was scored: an unticked box is a nil, but only if
    // somebody actually marked the script.
    const criteria = (cat.checklist || []).map((item: any) => {
      const byCls: Record<string, { hit: number; n: number }> = {}
      rows.forEach(r => {
        if (r.raw?.written_rubric?.[cat.key] == null) return
        const ticked: string[] = r.raw?.written_checklist?.[cat.key] || []
        const c = (byCls[r.student.english_class] ||= { hit: 0, n: 0 })
        if (ticked.includes(item.key)) c.hit++
        c.n++
      })
      return { item, byCls }
    })
    return { cat, byClass, criteria }
  }).filter(w => Object.keys(w.byClass).length > 0), [paper, rows])

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

  // ── The oral half ──
  // Comprehension is grouped by DOK rather than by question number: the
  // questions differ per passage level, so "Q3" is five different questions
  // across a grade and would leave four students in every cell. DOK is the
  // grouping the oral test's own standards table already uses.
  const oral = useMemo(() => {
    const dok: Record<string, Record<string, { got: number; max: number }>> = {}
    const phonics: Record<string, { got: number; max: number }> = {}
    const sentences: Record<string, { got: number; max: number }> = {}
    const naep: Record<string, number[]> = {}
    rows.forEach(r => {
      const cls = r.student.english_class
      const lvl = r.calc?.passage_level
      const qs = lvl ? paper.compByLevel[lvl] : null
      if (qs && !r.calc?.comp_not_administered) {
        qs.forEach((q, i) => {
          const v = r.raw?.[`comp_${i + 1}`]
          if (v == null) return
          const key = (q.dok || '—').replace('DOK ', 'DOK ')
          const cell = ((dok[key] ||= {})[cls] ||= { got: 0, max: 0 })
          cell.got += v; cell.max += paper.compScoreMax
        })
      }
      for (let i = 1; i <= paper.phonicsRows; i++) {
        const v = r.raw?.[`phonics_row${i}`]
        if (v == null) continue
        const cell = (phonics[cls] ||= { got: 0, max: 0 })
        cell.got += v; cell.max += paper.phonicsRowMax
      }
      for (let i = 1; i <= paper.sentenceCount; i++) {
        const v = r.raw?.[`sent_${i}`]
        if (v == null) continue
        const cell = (sentences[cls] ||= { got: 0, max: 0 })
        cell.got += v; cell.max += 1
      }
      if (r.calc?.naep) (naep[cls] ||= []).push(r.calc.naep)
    })
    return { dok, phonics, sentences, naep }
  }, [rows, paper])

  const hasOral = Object.keys(oral.dok).length > 0 || Object.keys(oral.phonics).length > 0 || Object.keys(oral.naep).length > 0
  const anyAnswers = items.some(i => i.answered > 0)
  if (!anyAnswers && writing.length === 0 && !hasOral) {
    return <p className="text-[13px] text-text-tertiary py-10 text-center">Nothing marked yet for Grade {test.grade}.</p>
  }

  return (
    <div className="space-y-4">
      {hasOral && (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-[12px] font-semibold text-navy">Oral test</p>
            <p className="text-[10px] text-text-tertiary">
              Comprehension by depth of knowledge, since the questions differ per passage &mdash; DOK 1 is retrieval, DOK 2 asks the student to do something with what they found.
            </p>
          </div>
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-alt">
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[200px]">&nbsp;</th>
              {classes.map(c => <th key={c} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[70px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
            </tr></thead>
            <tbody>
              {Object.keys(oral.dok).sort().map(k => (
                <tr key={k} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-navy">Comprehension &middot; {k}</td>
                  {classes.map(c => <Cell key={c} v={oral.dok[k][c] ? { hit: oral.dok[k][c].got, n: oral.dok[k][c].max } : null} />)}
                </tr>
              ))}
              {Object.keys(oral.phonics).length > 0 && (
                <tr className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-navy">Phonics grid</td>
                  {classes.map(c => <Cell key={c} v={oral.phonics[c] ? { hit: oral.phonics[c].got, n: oral.phonics[c].max } : null} />)}
                </tr>
              )}
              {Object.keys(oral.sentences).length > 0 && (
                <tr className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-navy">Sentence reading</td>
                  {classes.map(c => <Cell key={c} v={oral.sentences[c] ? { hit: oral.sentences[c].got, n: oral.sentences[c].max } : null} />)}
                </tr>
              )}
              {Object.keys(oral.naep).length > 0 && (
                <tr className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-navy">Expression <span className="text-[9px] text-text-tertiary font-normal">NAEP, out of 4</span></td>
                  {classes.map(c => {
                    const v = oral.naep[c]
                    if (!v?.length) return <td key={c} className="px-2 py-2 text-center text-text-tertiary">—</td>
                    const avg = v.reduce((a, b) => a + b, 0) / v.length
                    return <Cell key={c} v={{ hit: avg, n: 4 }} sub={`${v.length}`} />
                  })}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {anyAnswers && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-3">
            <p className="text-[12px] font-semibold text-navy">Written test &middot; every question</p>
            <p className="text-[10px] text-text-tertiary">One bar per question, in paper order. Taller is better. Click a bar to open it.</p>
          </div>
          <div className="px-4 pb-2 flex items-end gap-[3px] h-24">
            {items.map(it => {
              const pct = it.pct ?? 0
              const dead = it.answered === 0
              return (
                <button key={it.q.qNum} onClick={() => setOpenQ(openQ === it.q.qNum ? null : it.q.qNum)}
                  title={`Q${it.q.qNum} — ${it.answered ? Math.round(pct * 100) + '%' : 'not marked'}`}
                  className={`flex-1 min-w-[5px] rounded-t transition-all ${openQ === it.q.qNum ? 'ring-2 ring-navy' : ''}`}
                  style={{ height: `${dead ? 4 : Math.max(8, pct * 100)}%`, backgroundColor: dead ? '#E2E8F0' : pct >= 0.75 ? '#22C55E' : pct >= 0.45 ? '#F59E0B' : '#EF4444' }} />
              )
            })}
          </div>
          <div className="px-4 pb-3 flex items-center gap-2 text-[9px] text-text-tertiary">
            <span>Q{items[0]?.q.qNum}</span><span className="flex-1 border-b border-border" /><span>Q{items[items.length - 1]?.q.qNum}</span>
          </div>
          {openQ != null && (() => {
            const it = items.find(x => x.q.qNum === openQ)
            return it ? <div className="border-t border-border"><Item it={it} classes={classes} /></div> : null
          })()}
        </div>
      )}

      {writing.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <div className="px-4 pt-3.5 pb-2">
            <p className="text-[12px] font-semibold text-navy">Writing</p>
            <p className="text-[10px] text-text-tertiary">Each cell is a share of that category&rsquo;s own total. Open a category for the criteria beneath it.</p>
          </div>
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-alt">
              <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[200px]">Category</th>
              {classes.map(c => <th key={c} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[70px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
            </tr></thead>
            <tbody>{writing.map(w => {
              const open = openCat === w.cat.key
              return (
                <Fragment key={w.cat.key}>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2">
                      <button onClick={() => setOpenCat(open ? null : w.cat.key)} className="flex items-center gap-1.5 text-left">
                        {w.criteria.length > 0 && <ChevronDown size={11} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />}
                        <span>
                          <span className="font-medium text-navy">{w.cat.label}</span>
                          <span className="block text-[9px] text-text-tertiary">out of {w.cat.max}{w.cat.standard ? ` · ${w.cat.standard}` : ''}</span>
                        </span>
                      </button>
                    </td>
                    {classes.map(c => <Cell key={c} v={w.byClass[c] ? { hit: w.byClass[c].sum, n: w.byClass[c].n * w.cat.max } : null} sub={w.byClass[c] ? `${w.byClass[c].n}` : ''} />)}
                  </tr>
                  {open && w.criteria.map((cr: any) => (
                    <tr key={cr.item.key} className="border-t border-border/50 bg-surface-alt/25">
                      <td className="px-3 py-1.5 pl-8">
                        <span className="text-[10px] text-text-secondary">{cr.item.label}</span>
                        {cr.item.desc && <span className="block text-[9px] text-text-tertiary leading-snug max-w-[300px]">{cr.item.desc}</span>}
                      </td>
                      {classes.map(c => <Cell key={c} v={cr.byCls[c] ? { hit: cr.byCls[c].hit, n: cr.byCls[c].n } : null} small />)}
                    </tr>
                  ))}
                </Fragment>
              )
            })}</tbody>
          </table>
        </div>
      )}

      {anyAnswers && (
        <>
          <Rollup title="By domain" acc={rollup('domain')} classes={classes} />
          <Rollup title="By depth of knowledge" acc={rollup('dok')} classes={classes} prefix="DOK "
            blurb="DOK 1 is retrieval; DOK 2 asks the student to do something with what they found." />
        </>
      )}
    </div>
  )
}

function Cell({ v, sub, small }: { v: { hit: number; n: number } | null; sub?: string; small?: boolean }) {
  if (!v || v.n === 0) return <td className="px-2 py-2 text-center text-text-tertiary">—</td>
  const pct = Math.round((v.hit / v.n) * 100)
  const tone = pct >= 75 ? 'bg-green-50 text-green-700 border-green-200'
    : pct >= 45 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-block px-2 py-0.5 rounded border font-semibold ${small ? 'text-[9px]' : 'text-[10px]'} ${tone}`}
        title={`${v.hit} of ${v.n}`}>{pct}%</span>
      <span className="block text-[8px] text-text-tertiary mt-0.5">{sub || `${v.n}`}</span>
    </td>
  )
}

function Rollup({ title, blurb, acc, classes, prefix = '' }: { title: string; blurb?: string; acc: Record<string, Record<string, { n: number; correct: number }>>; classes: EnglishClass[]; prefix?: string }) {
  const keys = Object.keys(acc).sort()
  if (keys.length === 0) return null
  return (
    <div className="bg-surface border border-border rounded-xl overflow-x-auto">
      <div className="px-4 pt-3.5 pb-2">
        <p className="text-[12px] font-semibold text-navy">{title}</p>
        {blurb && <p className="text-[10px] text-text-tertiary">{blurb}</p>}
      </div>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[150px]">&nbsp;</th>
          {classes.map(c => <th key={c} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[70px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
        </tr></thead>
        <tbody>{keys.map(k => (
          <tr key={k} className="border-t border-border">
            <td className="px-3 py-2 font-medium text-navy">{prefix}{k}</td>
            {classes.map(c => <Cell key={c} v={acc[k][c] ? { hit: acc[k][c].correct, n: acc[k][c].n } : null} />)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function Item({ it, classes }: { it: any; classes: EnglishClass[] }) {
  const q = it.q
  const letters = ['a', 'b', 'c', 'd'].slice(0, (q.choices || []).length)
  return (
    <div className="p-4">
      <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-navy">Q{q.qNum}</span>
        <span className="text-[10px] text-text-tertiary">{it.correct}/{it.answered}</span>
        {q.standard && <span className="text-[9px] text-text-tertiary">{q.standard}</span>}
        {q.dok != null && <span className="text-[9px] text-text-tertiary">DOK {q.dok}</span>}
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
              <span className="w-8 text-[10px] text-text-tertiary shrink-0 text-right">{n}</span>
            </div>
          )
        })}
      </div>
      {q.note && <p className="text-[10px] text-text-secondary bg-surface-alt/60 border border-border rounded-lg px-2.5 py-1.5 mb-2 leading-snug">{q.note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {classes.map(c => {
          const v = it.byClass[c]
          if (!v || v.n === 0) return null
          const p = v.correct / v.n
          // Red through the spectrum to violet, so a row of tags reads as a
          // gradient and the weak class is the one that looks wrong.
          const col = rainbow(p)
          return <span key={c} title={`${v.correct} of ${v.n}`}
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold text-white"
            style={{ backgroundColor: col }}>{c} {Math.round(p * 100)}%</span>
        })}
      </div>
    </div>
  )
}

/** The whole written paper as a percentage: multiple choice, short response and rubric. */
function writtenPct(calc: any): number | null {
  if (!calc) return null
  const parts: [number, number][] = []
  if (calc.written_mc_total != null && calc.written_mc_max > 0) parts.push([calc.written_mc_total, calc.written_mc_max])
  if (calc.short_writing_total != null && calc.short_writing_max > 0) parts.push([calc.short_writing_total, calc.short_writing_max])
  if (calc.writing_total != null && calc.writing_max > 0) parts.push([calc.writing_total, calc.writing_max])
  if (parts.length === 0) return null
  const got = parts.reduce((s, p) => s + p[0], 0)
  const max = parts.reduce((s, p) => s + p[1], 0)
  return max > 0 ? (got / max) * 100 : null
}

function OralVsWritten({ rows }: { rows: Row[] }) {
  const pts = rows.map(r => ({ r, x: r.band?.composite ?? null, y: writtenPct(r.calc) }))
    .filter(p => p.x != null && p.y != null) as { r: Row; x: number; y: number }[]

  if (pts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Oral against written</p>
        <p className="text-[10px] text-text-tertiary">Fills in once the written papers are marked.</p>
      </div>
    )
  }
  // Far from the diagonal is the point of the chart.
  const gap = (p: { x: number; y: number }) => p.y - p.x
  const readsBetter = [...pts].filter(p => gap(p) < -18).sort((a, b) => gap(a) - gap(b))
  const testsBetter = [...pts].filter(p => gap(p) > 18).sort((a, b) => gap(b) - gap(a))

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[12px] font-semibold text-navy">Oral against written</p>
      <p className="text-[10px] text-text-tertiary mb-3">
        Reading aloud across, the written paper up. On the line means the two agree; the distance off it is the disagreement.
      </p>
      <div className="flex gap-4 flex-wrap">
        <svg viewBox="0 0 220 200" className="w-[300px] h-[270px] shrink-0">
          <rect x="30" y="10" width="180" height="170" fill="#F8FAFC" stroke="#E2E8F0" />
          {[0, 25, 50, 75, 100].map(g => (
            <g key={g}>
              <line x1={30 + g * 1.8} x2={30 + g * 1.8} y1="10" y2="180" stroke="#E2E8F0" strokeWidth="0.5" />
              <line x1="30" x2="210" y1={180 - g * 1.7} y2={180 - g * 1.7} stroke="#E2E8F0" strokeWidth="0.5" />
            </g>
          ))}
          <line x1="30" y1="180" x2="210" y2="10" stroke="#94A3B8" strokeWidth="0.8" strokeDasharray="3 3" />
          {pts.map(p => (
            <circle key={p.r.student.id} cx={30 + p.x * 1.8} cy={180 - p.y * 1.7} r="3.2"
              fill={classToColor(p.r.student.english_class as EnglishClass)} stroke="#fff" strokeWidth="0.8">
              <title>{`${p.r.student.english_name} — oral ${Math.round(p.x)}, written ${Math.round(p.y)}%`}</title>
            </circle>
          ))}
          <text x="120" y="196" fontSize="7" fill="#94A3B8" textAnchor="middle">oral (Band)</text>
          <text x="10" y="95" fontSize="7" fill="#94A3B8" textAnchor="middle" transform="rotate(-90 10 95)">written paper %</text>
          <text x="205" y="22" fontSize="6.5" fill="#94A3B8" textAnchor="end">tests better than reads</text>
          <text x="36" y="176" fontSize="6.5" fill="#94A3B8">reads better than tests</text>
        </svg>
        <div className="flex-1 min-w-[220px] space-y-3">
          <Corner title="Reads better than they test" tone="amber" people={readsBetter}
            note="Handles the passage aloud but loses it on paper. Worth checking whether the paper, not the reading, is the obstacle." />
          <Corner title="Tests better than they read" tone="blue" people={testsBetter}
            note="Scores on paper without sustaining the passage aloud. Decoding or fluency is the gap, not understanding." />
        </div>
      </div>
    </div>
  )
}

function Corner({ title, note, people, tone }: { title: string; note: string; tone: 'amber' | 'blue'; people: { r: Row; x: number; y: number }[] }) {
  return (
    <div className={`rounded-lg border p-2.5 ${tone === 'amber' ? 'bg-amber-50/60 border-amber-200' : 'bg-blue-50/60 border-blue-200'}`}>
      <p className="text-[11px] font-semibold text-navy">{title} <span className="text-text-tertiary font-normal">{people.length}</span></p>
      <p className="text-[9px] text-text-tertiary leading-snug mb-1.5">{note}</p>
      {people.length === 0
        ? <p className="text-[10px] text-text-tertiary italic">Nobody.</p>
        : <div className="flex flex-wrap gap-1">
            {people.slice(0, 12).map(p => (
              <span key={p.r.student.id} className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border"
                title={`oral ${Math.round(p.x)} · written ${Math.round(p.y)}%`}>{p.r.student.english_name}</span>
            ))}
          </div>}
    </div>
  )
}
