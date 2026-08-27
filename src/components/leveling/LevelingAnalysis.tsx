'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, PLACED_ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor, IMPLAUSIBLE_CWPM } from '@/lib/utils'
import { Loader2, ChevronDown } from 'lucide-react'
import { bandFromCalc, g2ClassFromBand, BAND_LEVEL_ORDER } from './grade2Band'
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
/** Q1 and Q3 of a set, for the middle-half band on the class picture. */
function quartiles(vals: number[]): { q1: number; q3: number } | null {
  if (vals.length < 4) return null
  const v = [...vals].sort((a, b) => a - b)
  const at = (p: number) => {
    const i = (v.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i)
    return lo === hi ? v[lo] : v[lo] + (v[hi] - v[lo]) * (i - lo)
  }
  return { q1: at(0.25), q3: at(0.75) }
}

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
  /** Words in each sentence. They differ -- 7, 6, 6, 8, 9 -- so an average
      would put fractions in the denominator and decimals under every cell. */
  sentenceMaxes: number[]
}

const EMPTY_PAPER: Paper = { questions: [], writingCats: [], compByLevel: {}, compScoreMax: 2, phonicsRows: 0, phonicsRowMax: 0, sentenceCount: 0, sentenceMaxes: [] }

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
      sentenceMaxes: (oral.sentences?.items ?? []).map((it: any) => it.max ?? 1),
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

  const [view, setView] = useState<'placement' | 'questions' | 'skills'>('placement')
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
          {(['placement', 'questions', 'skills'] as const).map(v => (
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
        : view === 'placement' ? <Placement test={test} rows={rows} />
          : view === 'questions' ? <Questions test={test} rows={rows} paper={paper} />
          : <Skills test={test} rows={rows} paper={paper} />}
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

      {/* ── Each class: how wide it is, and what it read ── */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Each class</p>
        <p className="text-[10px] text-text-tertiary mb-3">
          Left: the range of ability in the room. The bar is the middle half of the class and the line is the middle student.
          Right: which passage they sustained &mdash; two classes on the same passage are reading the same text, whatever the rooms are called.
        </p>
        <div className="flex text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">
          <span className="w-20 shrink-0" />
          <span className="flex-[3]">Range of ability</span>
          <span className="w-14 shrink-0" />
          <span className="flex-[2]">Passage sustained</span>
          <span className="w-8 shrink-0" />
        </div>
        {classes.map(c => {
          const inClass = tested.filter(r => r.student.english_class === c)
          if (inClass.length === 0) return null
          const vals = inClass.map(r => r.composite * 100).sort((a, b) => a - b)
          const q = quartiles(vals)
          const mid = vals.length % 2 ? vals[(vals.length - 1) / 2] : (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2
          const passages: Record<string, number> = {}
          inClass.forEach(r => { if (r.band) passages[r.band.effectiveLevel] = (passages[r.band.effectiveLevel] || 0) + 1 })
          const withBand = Object.values(passages).reduce((a, b) => a + b, 0)
          return (
            <div key={c} className="flex items-center gap-0 mb-2">
              <span className="w-20 shrink-0 text-[10px] font-semibold text-right pr-2" style={{ color: classToTextColor(c) }}>{c}</span>
              <div className="flex-[3] relative h-6">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
                <div className="absolute top-1/2 h-px" style={{ left: `${vals[0]}%`, width: `${vals[vals.length - 1] - vals[0]}%`, backgroundColor: classToColor(c) }} />
                {q && <div className="absolute top-1 bottom-1 rounded-sm" title={`Middle half: ${Math.round(q.q1)} to ${Math.round(q.q3)}`}
                  style={{ left: `${q.q1}%`, width: `${Math.max(0.8, q.q3 - q.q1)}%`, backgroundColor: classToColor(c) + '66', border: `1px solid ${classToColor(c)}` }} />}
                <div className="absolute top-0.5 bottom-0.5 w-[2px]" title={`Middle student: ${Math.round(mid)}`} style={{ left: `${mid}%`, backgroundColor: classToTextColor(c) }} />
              </div>
              <span className="w-14 shrink-0 text-center text-[9.5px] text-text-tertiary tabular-nums"
                title="How wide the middle half of this class is. Bigger means a wider range of ability in one room.">
                {q ? `spread ${Math.round(q.q3 - q.q1)}` : ''}
              </span>
              <div className="flex-[2] h-4 flex rounded-full overflow-hidden bg-surface-alt">
                {BAND_LEVEL_ORDER.map(l => {
                  const n = passages[l] || 0
                  if (!n) return null
                  return <div key={l} title={`Passage ${l}: ${n}`} className="h-full flex items-center justify-center"
                    style={{ width: `${(n / withBand) * 100}%`, backgroundColor: PASSAGE_COLORS[l] }}>
                    {(n / withBand) > 0.16 && <span className="text-[8px] font-bold text-white">{l}</span>}
                  </div>
                })}
              </div>
              <span className="w-8 shrink-0 text-right text-[10px] text-text-tertiary">{inClass.length}</span>
            </div>
          )
        })}
      </div>

      {/* ── Speed against understanding ── */}
      <FluencyVsComprehension rows={tested} />

      {/* ── Reading aloud against the written paper ── */}
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
  // Unplaced is a holding pen for transfer students, not a class, so it gets no
  // column. Their answers still count toward each question's overall figure.
  const classes = PLACED_ENGLISH_CLASSES.filter(c => rows.some(r => r.student.english_class === c))

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
        cell.got += v; cell.max += paper.sentenceMaxes[i - 1] ?? 1
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
              Every figure is the whole class added together: points earned out of points available to them. Sentence reading is words read correctly out of words put in front of them.
              Comprehension is grouped by depth of knowledge, since the questions differ per passage &mdash; DOK 1 is retrieval, DOK 2 asks the student to do something with what they found.
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
      <span className="block text-[8px] text-text-tertiary mt-0.5">{sub || `${Math.round(v.hit)}/${Math.round(v.n)}`}</span>
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
  const [hover, setHover] = useState<{ r: Row; x: number; y: number } | null>(null)
  const pts = rows.map(r => ({ r, x: r.band?.composite ?? null, y: writtenPct(r.calc) }))
    .filter(p => p.x != null && p.y != null) as { r: Row; x: number; y: number }[]

  if (pts.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Reading aloud against the written paper</p>
        <p className="text-[10px] text-text-tertiary">Fills in once the written papers are marked.</p>
      </div>
    )
  }

  // Above the diagonal is a higher written score than oral; below it, the
  // reverse. The labels sit in the corners those describe -- top LEFT is a low
  // oral score with a high written one, which is the paper-stronger case.
  const gap = (p: { x: number; y: number }) => p.y - p.x
  const paperStronger = [...pts].filter(p => gap(p) > 18).sort((a, b) => gap(b) - gap(a))
  const readingStronger = [...pts].filter(p => gap(p) < -18).sort((a, b) => gap(a) - gap(b))

  const W = 820, H = 470, L = 54, R = 24, T = 26, B = 46
  const px = (v: number) => L + (v / 100) * (W - L - R)
  const py = (v: number) => H - B - (v / 100) * (H - T - B)

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[12px] font-semibold text-navy">Reading aloud against the written paper</p>
      <p className="text-[11px] text-text-secondary mb-1 max-w-[70ch]">
        Every dot is one student. How well they read aloud runs left to right; how they did on the written paper runs bottom to top.
      </p>
      <p className="text-[11px] text-text-secondary mb-3 max-w-[70ch]">
        A student on the dotted line did about as well on both. The further a dot sits from that line, the more the two tests disagree about them &mdash; and those are the students worth a second look.
      </p>

      <div className="relative w-full mx-auto" style={{ maxWidth: 820 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }} onMouseLeave={() => setHover(null)}>
          <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="var(--surface-alt, #F8FAFC)" stroke="#E2E8F0" />
          {/* The two halves, named where they actually are */}
          <polygon points={`${L},${T} ${px(100)},${T} ${L},${py(0)}`} fill="#3B82F6" opacity="0.045" />
          <polygon points={`${px(100)},${T} ${px(100)},${py(0)} ${L},${py(0)}`} fill="#F59E0B" opacity="0.05" />
          {[0, 25, 50, 75, 100].map(g => (
            <g key={g}>
              <line x1={px(g)} x2={px(g)} y1={T} y2={py(0)} stroke="#E2E8F0" strokeWidth="1" />
              <line x1={L} x2={px(100)} y1={py(g)} y2={py(g)} stroke="#E2E8F0" strokeWidth="1" />
              <text x={px(g)} y={py(0) + 16} fontSize="10" fill="#94A3B8" textAnchor="middle">{g}</text>
              <text x={L - 8} y={py(g) + 3.5} fontSize="10" fill="#94A3B8" textAnchor="end">{g}</text>
            </g>
          ))}
          <line x1={L} y1={py(0)} x2={px(100)} y2={py(100)} stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="5 4" />
          <text x={L + 12} y={T + 18} fontSize="11" fill="#3B82F6" opacity="0.85">Stronger on paper</text>
          <text x={px(100) - 12} y={py(0) - 12} fontSize="11" fill="#B45309" opacity="0.9" textAnchor="end">Stronger reading aloud</text>

          {pts.map(p => {
            const on = hover?.r.student.id === p.r.student.id
            return (
              <circle key={p.r.student.id} cx={px(p.x)} cy={py(p.y)} r={on ? 8 : 6}
                fill={classToColor(p.r.student.english_class as EnglishClass)}
                stroke={on ? '#0F172A' : '#fff'} strokeWidth={on ? 2 : 1.4}
                style={{ cursor: 'pointer', transition: 'r .1s' }}
                onMouseEnter={() => setHover({ r: p.r, x: p.x, y: p.y })} />
            )
          })}
          <text x={(L + px(100)) / 2} y={H - 8} fontSize="11" fill="#64748B" textAnchor="middle">how well they read aloud &rarr;</text>
          <text x={16} y={(T + py(0)) / 2} fontSize="11" fill="#64748B" textAnchor="middle" transform={`rotate(-90 16 ${(T + py(0)) / 2})`}>written paper score &rarr;</text>
        </svg>

        {hover && (
          <div className="absolute pointer-events-none bg-navy text-white rounded-lg px-2.5 py-1.5 shadow-lg text-[11px] whitespace-nowrap z-10"
            style={{ left: `${(px(hover.x) / W) * 100}%`, top: `${(py(hover.y) / H) * 100}%`, transform: 'translate(-50%, -140%)' }}>
            <span className="font-semibold">{hover.r.student.english_name}</span>
            <span className="opacity-70 ml-1.5">{hover.r.student.english_class}</span>
            <span className="block opacity-90">read aloud {Math.round(hover.x)} &middot; paper {Math.round(hover.y)}%</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <Corner title="Stronger reading aloud than on paper" tone="amber" people={readingStronger}
          note="They handled the passage out loud, but the written paper did not show it. Worth checking whether reading the questions, or writing the answers, is what got in the way." />
        <Corner title="Stronger on paper than reading aloud" tone="blue" people={paperStronger}
          note="They scored on the paper without holding the passage aloud. The gap is in decoding or fluency rather than in understanding." />
      </div>
    </div>
  )
}

function Corner({ title, note, people, tone }: { title: string; note: string; tone: 'amber' | 'blue'; people: { r: Row; x: number; y: number }[] }) {
  return (
    <div className={`rounded-lg border p-3 ${tone === 'amber' ? 'bg-amber-50/60 border-amber-200' : 'bg-blue-50/60 border-blue-200'}`}>
      <p className="text-[11.5px] font-semibold text-navy">{title} <span className="text-text-tertiary font-normal">{people.length}</span></p>
      <p className="text-[10px] text-text-tertiary leading-snug mb-2">{note}</p>
      {people.length === 0
        ? <p className="text-[10px] text-text-tertiary italic">Nobody on this test.</p>
        : <div className="flex flex-wrap gap-1">
            {people.map(p => (
              <span key={p.r.student.id} className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border"
                title={`read aloud ${Math.round(p.x)} · paper ${Math.round(p.y)}%`}>{p.r.student.english_name}</span>
            ))}
          </div>}
    </div>
  )
}

// ─── Skills ──────────────────────────────────────────────────────────
// Every part of the programme in one place, drawn from both tests. The two
// tests use different vocabularies -- the oral file says Comprehension and
// Fluency, the written file says Reading Info and Language/Grammar -- so the
// mapping happens here rather than either of them being renamed, which would
// re-point historical scores.
//
// Cells are distance from THIS grade's median, never a raw percentage side by
// side. 70% on an eleven-item grammar section and 70% on a hand-scored writing
// rubric are not the same achievement, and putting them on one scale invites a
// comparison the instruments cannot support. Deviations are comparable because
// each is measured against its own instrument's own cohort.

/** Written domain labels drifted as the tests were authored; folded on read. */
const SKILL_FOR_DOMAIN: Record<string, string> = {
  'Reading Info': 'read', 'Reading Lit': 'read', 'Reading Comprehension': 'read',
  'Listening': 'listen', 'Listening Comprehension': 'listen',
  'Vocabulary': 'vocab',
  'Language': 'grammar', 'Language/Grammar': 'grammar',
  'Language/Mechanics': 'mechanics',
  'Phonics': 'decode',
}

interface SkillDef { key: string; name: string; src: string; pair?: 'open' | 'close' }
const SKILL_DEFS: SkillDef[] = [
  { key: 'oral', name: 'Oral reading', src: 'oral · accuracy and expression' },
  { key: 'decode', name: 'Decoding', src: 'oral · phonics and sentences' },
  { key: 'heard', name: 'Comprehension heard', src: 'oral · questions on the passage', pair: 'open' },
  { key: 'read', name: 'Comprehension read', src: 'written · reading section', pair: 'close' },
  { key: 'listen', name: 'Listening', src: 'written · listening section' },
  { key: 'vocab', name: 'Vocabulary', src: 'written · vocabulary items' },
  { key: 'grammar', name: 'Grammar', src: 'written · language items' },
  { key: 'mechanics', name: 'Mechanics', src: 'written · punctuation and capitals' },
]

type Tally = { got: number; max: number }
/** A skill's percentage per class, and the grade's median across those classes. */
type SkillLine = { pcts: Record<string, number>; med: number } | null
const add = (t: Record<string, Tally>, k: string, got: number, max: number) => {
  const c = (t[k] ||= { got: 0, max: 0 }); c.got += got; c.max += max
}

function Skills({ test, rows, paper }: { test: LevelTest; rows: Row[]; paper: Paper }) {
  const [raw, setRaw] = useState(false)
  const [openWriting, setOpenWriting] = useState(true)
  const classes = PLACED_ENGLISH_CLASSES.filter(c => rows.some(r => r.student.english_class === c))

  const { byClass, writingCats } = useMemo(() => {
    const byClass: Record<string, Record<string, Tally>> = {}
    const catKeys = paper.writingCats.map((c: any) => c.key)
    rows.forEach(r => {
      const cls = r.student.english_class
      const t = (byClass[cls] ||= {})
      const calc = r.calc, rw = r.raw

      // Fluency, as the band reads it: accuracy across the 90-97 stretch the
      // guides care about, and NAEP on its 1-4 scale. Not rate -- rate is not
      // comparable between passages, which is the whole reason the band exists.
      if (calc?.accuracy_pct != null) add(t, 'oral', Math.max(0, Math.min(7, calc.accuracy_pct - 90)), 7)
      if (calc?.naep) add(t, 'oral', Math.max(0, calc.naep - 1), 3)

      for (let i = 1; i <= 5; i++) {
        if (rw?.[`phonics_row${i}`] != null) add(t, 'decode', rw[`phonics_row${i}`], paper.phonicsRowMax || 5)
        if (rw?.[`sent_${i}`] != null) add(t, 'decode', rw[`sent_${i}`], paper.sentenceMaxes[i - 1] ?? 1)
      }
      if (calc?.comp_total != null && calc?.comp_max > 0 && !calc.comp_not_administered) add(t, 'heard', calc.comp_total, calc.comp_max)

      const dom = calc?.written_domain_scores || {}
      Object.entries(dom).forEach(([d, v]: [string, any]) => {
        const k = SKILL_FOR_DOMAIN[d]
        if (k && v?.total > 0) add(t, k, v.correct || 0, v.total)
      })

      paper.writingCats.forEach((cat: any) => {
        const v = rw?.written_rubric?.[cat.key]
        if (v == null || !cat.max) return
        add(t, 'writing', v, cat.max)
        add(t, `w:${cat.key}`, v, cat.max)
      })
    })
    return { byClass, writingCats: paper.writingCats.filter((c: any) => catKeys.includes(c.key)) }
  }, [rows, paper])

  /** Percentage per class, and the grade's median across the classes that have it. */
  const line = (key: string): SkillLine => {
    const pcts: Record<string, number> = {}
    classes.forEach(c => {
      const t = byClass[c]?.[key]
      if (t && t.max > 0) pcts[c] = (t.got / t.max) * 100
    })
    const vals = Object.values(pcts).sort((a, b) => a - b)
    if (vals.length === 0) return null
    const m = vals.length >> 1
    const med = vals.length % 2 ? vals[m] : (vals[m - 1] + vals[m]) / 2
    return { pcts, med }
  }

  const rowsOut: { def: SkillDef; line: SkillLine }[] = SKILL_DEFS
    .map(def => ({ def, line: line(def.key) }))
  const writingLine = line('writing')
  const anything = rowsOut.some(r => r.line) || writingLine
  if (!anything) return <p className="text-[13px] text-text-tertiary py-10 text-center">Nothing marked yet for Grade {test.grade}.</p>

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-4 overflow-x-auto">
        <div className="flex items-start gap-3 mb-3">
          <div>
            <p className="text-[12px] font-semibold text-navy">Skills, against the grade median</p>
            <p className="text-[10px] text-text-tertiary">
              Blue above the grade, red below. Not raw percentages side by side &mdash; an eleven-item grammar section and a hand-scored writing rubric do not share a scale.
            </p>
          </div>
          <button onClick={() => setRaw(!raw)}
            className={`ml-auto shrink-0 text-[10px] px-2.5 py-1 rounded-lg ${raw ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            {raw ? 'Showing scores' : 'Show scores'}
          </button>
        </div>
        <table className="w-full text-[11px]">
          <thead><tr>
            <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[190px]">&nbsp;</th>
            {classes.map(c => <th key={c} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[74px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
            <th className="text-center px-2 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold min-w-[60px]">Grade</th>
          </tr></thead>
          <tbody>
            {rowsOut.map(({ def, line: l }) => (
              <SkillRow key={def.key} name={def.name} src={def.src} pair={def.pair} l={l} classes={classes} raw={raw} />
            ))}
            {writingLine && (
              <>
                <SkillRow name="Writing" src="written · rubric, all categories" l={writingLine} classes={classes} raw={raw}
                  onToggle={() => setOpenWriting(!openWriting)} open={openWriting} strong />
                {openWriting && writingCats.map((cat: any) => (
                  <SkillRow key={cat.key} name={cat.label} src={cat.standard ? `${cat.standard} · out of ${cat.max}` : `out of ${cat.max}`}
                    l={line(`w:${cat.key}`)} classes={classes} raw={raw} indent />
                ))}
              </>
            )}
          </tbody>
        </table>
        <p className="text-[10px] text-text-tertiary mt-3">
          <span className="inline-block w-2 h-2 rounded-sm bg-navy/40 align-middle mr-1" />
          The two comprehension rows are joined on purpose. A class level on what it hears and below on what it reads has a reading problem, not a comprehension one &mdash; merging them would hide it.
          &mdash; is a skill this grade&rsquo;s test does not measure, never a zero.
        </p>
      </div>

      {/* ── Standards, by class ── */}
      <StandardsByClass rows={rows} classes={classes} />

      {/* ── One card per class ── */}
      <div>
        <p className="text-[12px] font-semibold text-navy mb-1">What each class needs</p>
        <p className="text-[10px] text-text-tertiary mb-3">Strongest first, against the grade. One card per room, for the teacher who has it on Monday.</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
          {classes.map(c => {
            const items = [...SKILL_DEFS.map(d => ({ name: d.name, key: d.key })), { name: 'Writing', key: 'writing' }]
              .map(({ name, key }) => {
                const l = line(key)
                if (!l || l.pcts[c] == null) return null
                return { name, d: l.pcts[c] - l.med }
              }).filter(Boolean) as { name: string; d: number }[]
            if (items.length === 0) return null
            items.sort((a, b) => b.d - a.d)
            return (
              <div key={c} className="bg-surface border border-border rounded-xl p-3.5">
                <p className="text-[13px] font-semibold" style={{ color: classToTextColor(c) }}>{c}</p>
                <p className="text-[9px] text-text-tertiary mb-2.5">strongest first, against the grade</p>
                {items.map(it => {
                  const w = Math.min(50, (Math.abs(it.d) / 22) * 50)
                  return (
                    <div key={it.name} className="flex items-center gap-2 mb-1">
                      <span className="w-[92px] shrink-0 text-[10.5px] text-text-secondary truncate">{it.name}</span>
                      <span className="flex-1 h-1.5 rounded-full bg-surface-alt relative overflow-hidden">
                        <span className="absolute top-0 bottom-0 rounded-full"
                          style={{ left: `${it.d >= 0 ? 50 : 50 - w}%`, width: `${w}%`, backgroundColor: devColor(it.d) }} />
                      </span>
                      <span className="w-7 shrink-0 text-right text-[9.5px] text-text-tertiary tabular-nums">{it.d > 0 ? '+' : ''}{it.d.toFixed(0)}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Red below the grade, blue above, fading to nothing at the median. */
function devColor(d: number): string {
  const a = Math.min(1, Math.abs(d) / 15) * 0.8
  return d < 0 ? `rgba(200, 74, 62, ${a})` : `rgba(47, 112, 156, ${a})`
}

function SkillRow({ name, src, l, classes, raw, pair, indent, strong, onToggle, open }: {
  name: string; src: string; l: SkillLine; classes: EnglishClass[]; raw: boolean
  pair?: 'open' | 'close'; indent?: boolean; strong?: boolean; onToggle?: () => void; open?: boolean
}) {
  return (
    <tr className={`border-t border-border ${indent ? 'bg-surface-alt/25' : ''}`}>
      <td className={`px-3 py-2 ${indent ? 'pl-8' : ''} ${pair ? 'border-l-2 border-navy/40' : ''}`}>
        {onToggle ? (
          <button onClick={onToggle} className="flex items-center gap-1.5 text-left">
            <ChevronDown size={11} className={`text-text-tertiary transition-transform ${open ? 'rotate-180' : ''}`} />
            <span>
              <span className={`${strong ? 'font-semibold' : 'font-medium'} text-navy`}>{name}</span>
              <span className="block text-[9px] text-text-tertiary">{src}</span>
            </span>
          </button>
        ) : (
          <>
            <span className={`${indent ? 'text-[10.5px] text-text-secondary' : 'font-medium text-navy'}`}>{name}</span>
            <span className="block text-[9px] text-text-tertiary">{src}</span>
          </>
        )}
      </td>
      {classes.map(c => {
        const pct = l?.pcts[c]
        if (l == null || pct == null) return <td key={c} className="px-2 py-2 text-center text-text-tertiary" title="Not measured by this grade's test">—</td>
        const d = pct - l.med
        return (
          <td key={c} className="px-1.5 py-1.5 text-center">
            <span className="block rounded py-1.5 text-[11px] font-semibold tabular-nums"
              style={{ backgroundColor: devColor(d) }}
              title={`${c} · ${name}: ${Math.round(pct)}% (grade median ${Math.round(l.med)}%)`}>
              {raw ? `${Math.round(pct)}%` : `${d > 0 ? '+' : ''}${d.toFixed(0)}`}
            </span>
          </td>
        )
      })}
      <td className="px-2 py-2 text-center text-[10.5px] text-text-tertiary tabular-nums">{l ? `${Math.round(l.med)}%` : '—'}</td>
    </tr>
  )
}

// ─── Speed against understanding ─────────────────────────────────────
// Not the same question as reading aloud against the written paper. This one
// asks whether the words and the meaning arrive together: a child who reads
// quickly and follows none of it is word-calling, and reads as fine on any
// single fluency number. The guides say the same thing in their own words --
// when accuracy and comprehension disagree, comprehension decides.
function FluencyVsComprehension({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<{ r: Row; x: number; y: number } | null>(null)
  const pts = rows.map(r => {
    const cwpm = r.calc?.cwpm
    const comp = r.calc?.comp_total != null && r.calc?.comp_max > 0 && !r.calc?.comp_not_administered
      ? (r.calc.comp_total / r.calc.comp_max) * 100 : null
    return { r, x: cwpm as number, y: comp as number }
  }).filter(p => p.x != null && p.x > 0 && p.y != null)

  if (pts.length === 0) return null
  // A rate above the plausible ceiling is a mis-started stopwatch, not a fast
  // reader, and one of them stretches the axis far enough to squash the real
  // cohort into a corner. The axis is set by the believable readings; the rest
  // are pinned at the edge, ringed, and named underneath. Excluding them
  // silently would be worse -- they need fixing, not hiding.
  const believable = pts.filter(p => p.x <= IMPLAUSIBLE_CWPM)
  const suspect = pts.filter(p => p.x > IMPLAUSIBLE_CWPM)
  const maxX = Math.max(120, ...believable.map(p => p.x)) * 1.08

  const W = 820, H = 430, L = 54, R = 24, T = 26, B = 46
  const px = (v: number) => L + (v / maxX) * (W - L - R)
  const py = (v: number) => H - B - (v / 100) * (H - T - B)
  const midX = maxX / 2

  const wordCalling = believable.filter(p => p.x >= midX && p.y < 60).sort((a, b) => a.y - b.y)
  const slowButGets = believable.filter(p => p.x < midX && p.y >= 75).sort((a, b) => a.x - b.x)

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-[12px] font-semibold text-navy">Speed against understanding</p>
      <p className="text-[11px] text-text-secondary mb-1 max-w-[70ch]">
        Every dot is one student. How fast they read runs left to right; how much of the passage they understood runs bottom to top.
      </p>
      <p className="text-[11px] text-text-secondary mb-3 max-w-[70ch]">
        The two corners that matter are the bottom right &mdash; reading quickly and following none of it &mdash; and the top left, where a slow reader understood everything they got through.
      </p>

      <div className="relative w-full mx-auto" style={{ maxWidth: 820 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
          <rect x={L} y={T} width={W - L - R} height={H - T - B} fill="var(--surface-alt, #F8FAFC)" stroke="#E2E8F0" />
          <rect x={px(midX)} y={py(60)} width={px(maxX) - px(midX)} height={py(0) - py(60)} fill="#EF4444" opacity="0.05" />
          <rect x={L} y={T} width={px(midX) - L} height={py(75) - T} fill="#3B82F6" opacity="0.04" />
          {[0, 25, 50, 75, 100].map(g => (
            <g key={g}>
              <line x1={L} x2={px(maxX)} y1={py(g)} y2={py(g)} stroke="#E2E8F0" />
              <text x={L - 8} y={py(g) + 3.5} fontSize="10" fill="#94A3B8" textAnchor="end">{g}%</text>
            </g>
          ))}
          {[0, 50, 100, 150, 200].filter(v => v <= maxX).map(v => (
            <g key={v}>
              <line x1={px(v)} x2={px(v)} y1={T} y2={py(0)} stroke="#E2E8F0" />
              <text x={px(v)} y={py(0) + 16} fontSize="10" fill="#94A3B8" textAnchor="middle">{v}</text>
            </g>
          ))}
          <text x={px(maxX) - 10} y={py(0) - 10} fontSize="11" fill="#B91C1C" opacity="0.85" textAnchor="end">Fast, not following it</text>
          <text x={L + 10} y={T + 16} fontSize="11" fill="#2563EB" opacity="0.8">Slow, understood it</text>
          {believable.map(p => {
            const on = hover?.r.student.id === p.r.student.id
            return (
              <circle key={p.r.student.id} cx={px(p.x)} cy={py(p.y)} r={on ? 8 : 6}
                fill={classToColor(p.r.student.english_class as EnglishClass)}
                stroke={on ? '#0F172A' : '#fff'} strokeWidth={on ? 2 : 1.4}
                style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ r: p.r, x: p.x, y: p.y })} />
            )
          })}
          {suspect.map(p => (
            <circle key={p.r.student.id} cx={px(maxX) - 7} cy={py(p.y)} r="7"
              fill={classToColor(p.r.student.english_class as EnglishClass)}
              stroke="#DC2626" strokeWidth="2.5" strokeDasharray="3 2"
              style={{ cursor: 'pointer' }} onMouseEnter={() => setHover({ r: p.r, x: p.x, y: p.y })}>
              <title>{`${p.r.student.english_name}: ${Math.round(p.x)} wpm — off the scale`}</title>
            </circle>
          ))}
          <text x={(L + px(maxX)) / 2} y={H - 8} fontSize="11" fill="#64748B" textAnchor="middle">words a minute &rarr;</text>
          <text x={16} y={(T + py(0)) / 2} fontSize="11" fill="#64748B" textAnchor="middle" transform={`rotate(-90 16 ${(T + py(0)) / 2})`}>understood &rarr;</text>
        </svg>
        {hover && (
          <div className="absolute pointer-events-none bg-navy text-white rounded-lg px-2.5 py-1.5 shadow-lg text-[11px] whitespace-nowrap z-10"
            style={{ left: `${(px(hover.x) / W) * 100}%`, top: `${(py(hover.y) / H) * 100}%`, transform: 'translate(-50%, -140%)' }}>
            <span className="font-semibold">{hover.r.student.english_name}</span>
            <span className="opacity-70 ml-1.5">{hover.r.student.english_class}</span>
            <span className="block opacity-90">{Math.round(hover.x)} wpm &middot; understood {Math.round(hover.y)}%</span>
          </div>
        )}
      </div>

      {suspect.length > 0 && (
        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          <strong>{suspect.map(p => `${p.r.student.english_name} (${Math.round(p.x)} wpm)`).join(', ')}</strong>{' '}
          {suspect.length === 1 ? 'is' : 'are'} shown pinned at the right edge, because {suspect.length === 1 ? 'that rate is' : 'those rates are'} faster
          than fluent adult reading aloud and cannot be real. Almost always a stopwatch started partway through the read, so the whole passage counts
          against part of the time. Worth re-checking the recorded seconds against the words read, since the rate feeds the Band.
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <Corner title="Reading fast without following it" tone="amber" people={wordCalling}
          note="The words are coming out but the meaning is not going in. Slowing down and talking about the passage will do more than more reading practice." />
        <Corner title="Slow, but understood what they read" tone="blue" people={slowButGets}
          note="Comprehension is not the problem. These students need mileage and confidence rather than comprehension support." />
      </div>
    </div>
  )
}

// ─── Standards, by class ─────────────────────────────────────────────
// The CCSS view the History tab gives per student, given per class. Written
// standards are already tallied into written_standards_mastery as DOK-weighted
// points; the oral test records a met/not-met per code in standards_baseline.
// Both are proportions achieved, but they are not the same unit, so each row
// says which test it came from rather than the two being silently averaged.
function StandardsByClass({ rows, classes }: { rows: Row[]; classes: EnglishClass[] }) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<'weak' | 'strong' | 'code'>('weak')
  /** When set, weakest/strongest is judged on that class rather than the grade. */
  const [lens, setLens] = useState<EnglishClass | 'grade'>('grade')
  const data = useMemo(() => {
    const acc: Record<string, { src: 'written' | 'oral'; desc?: string; byCls: Record<string, { got: number; max: number }> }> = {}
    rows.forEach(r => {
      const cls = r.student.english_class
      Object.entries(r.calc?.written_standards_mastery || {}).forEach(([code, v]: [string, any]) => {
        if (!v || !(v.total > 0)) return
        const e = (acc[code] ||= { src: 'written', byCls: {} })
        const c = (e.byCls[cls] ||= { got: 0, max: 0 })
        c.got += v.met || 0; c.max += v.total
      })
      const base = r.calc?.standards_baseline
      if (Array.isArray(base)) base.forEach((b: any) => {
        if (!b?.code) return
        const e = (acc[b.code] ||= { src: 'oral', byCls: {} })
        const c = (e.byCls[cls] ||= { got: 0, max: 0 })
        if (b.met) c.got += 1
        c.max += 1
      })
    })
    return Object.entries(acc).map(([code, v]) => {
      const all = Object.values(v.byCls).reduce((a, b) => ({ got: a.got + b.got, max: a.max + b.max }), { got: 0, max: 0 })
      return { code, ...v, overall: all.max > 0 ? all.got / all.max : null }
    })
  }, [rows])

  const ordered = useMemo(() => {
    // The lens decides whose figure the ordering is judged on: the grade as a
    // whole, or one class. Weakest-in-Marigold is a different list from
    // weakest-in-the-grade, and it is the one their teacher wants.
    const score = (st: typeof data[number]) => {
      if (lens === 'grade') return st.overall
      const c = st.byCls[lens]
      return c && c.max > 0 ? c.got / c.max : null
    }
    const withScore = data.filter(st => sort === 'code' || score(st) != null)
    if (sort === 'code') return [...withScore].sort((a, b) => a.code.localeCompare(b.code))
    return [...withScore].sort((a, b) => sort === 'weak'
      ? (score(a) as number) - (score(b) as number)
      : (score(b) as number) - (score(a) as number))
  }, [data, sort, lens])

  if (data.length === 0) return null
  const shown = open ? ordered : ordered.slice(0, 8)

  return (
    <div className="bg-surface border border-border rounded-xl overflow-x-auto">
      <div className="px-4 pt-3.5 pb-2">
        <div className="flex items-start gap-3 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold text-navy">Standards, by class</p>
            <p className="text-[10px] text-text-tertiary">
              Written standards are scored out of the points behind them; oral ones out of the students who met them.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <select value={lens} onChange={e => setLens(e.target.value as any)}
              className="px-2 py-1 border border-border rounded-lg text-[10px] bg-surface">
              <option value="grade">Across the grade</option>
              {classes.map(c => <option key={c} value={c}>In {c}</option>)}
            </select>
            {([['weak', 'Weakest first'], ['strong', 'Strongest first'], ['code', 'By code']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setSort(k)}
                className={`text-[10px] px-2 py-1 rounded-lg ${sort === k ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[150px]">Standard</th>
          {classes.map(c => (
            <th key={c} className={`text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[70px] ${lens === c ? 'bg-navy/10' : ''}`} style={{ color: classToTextColor(c) }}>{c}</th>
          ))}
          <th className={`text-center px-2 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold min-w-[60px] ${lens === 'grade' ? 'bg-navy/10' : ''}`}>Grade</th>
        </tr></thead>
        <tbody>{shown.map(st => (
          <tr key={st.code} className="border-t border-border">
            <td className="px-3 py-2">
              <span className="font-medium text-navy">{st.code}</span>
              <span className="block text-[9px] text-text-tertiary">{st.src === 'oral' ? 'oral test' : 'written paper'}</span>
            </td>
            {classes.map(c => <Cell key={c} v={st.byCls[c] ? { hit: st.byCls[c].got, n: st.byCls[c].max } : null} />)}
            <td className="px-2 py-2 text-center text-[10.5px] text-text-tertiary tabular-nums">
              {st.overall != null ? `${Math.round(st.overall * 100)}%` : '—'}
            </td>
          </tr>
        ))}</tbody>
      </table>
      {ordered.length > 8 && (
        <button onClick={() => setOpen(!open)} className="text-[10px] text-navy hover:underline px-4 py-2.5">
          {open ? 'Show the first eight' : `Show all ${ordered.length} standards`}
        </button>
      )}
    </div>
  )
}
