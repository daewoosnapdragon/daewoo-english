'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, PLACED_ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, ChevronDown } from 'lucide-react'
import { bandFromCalc, g2ClassFromBand, BAND_LEVEL_ORDER } from './grade2Band'

const PASSAGE_COLORS: Record<string, string> = {
  A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6', F: '#A855F7',
}
/** Where g2ClassFromBand cuts. Drawn on the picture so the colours explain themselves. */
const CLASS_CUTS = [20, 35, 50, 65, 80]
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
  /** The class they were placed in at the most recent earlier test, if any. */
  lastYear: EnglishClass | null
}
interface Paper { questions: any[]; writingCats: any[] }

async function loadPaper(test: LevelTest): Promise<Paper> {
  const g = Number(test.grade)
  try {
    if (g === 1) {
      const c = (await import('./grade1Content')).g1ContentForTest(test as any)
      return c ? { questions: c.written.questions, writingCats: c.extendedWriting.categories as any[] } : { questions: [], writingCats: [] }
    }
    const mod = g === 2 ? await import('./grade2Content') : g === 3 ? await import('./grade3Content')
      : g === 4 ? await import('./grade4Content') : g === 5 ? await import('./grade5Content') : null
    const c = mod ? (mod as any)[`g${g}ContentForTest`](test as any) : null
    return c ? { questions: c.written.questions ?? [], writingCats: c.writing?.categories ?? [] } : { questions: [], writingCats: [] }
  } catch { return { questions: [], writingCats: [] } }
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
  const [paper, setPaper] = useState<Paper>({ questions: [], writingCats: [] })
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
        const byStudent: Record<string, any> = {}
        sc?.forEach((r: any) => { byStudent[r.student_id] = r })
        setRows((studs || []).map((s: any) => {
          const rec = byStudent[s.id]
          const calc = rec?.calculated_metrics || null
          return { student: s, calc, raw: rec?.raw_scores || null, band: bandOf(test, calc), lastYear: priorBy[s.id] ?? null }
        }))
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
  const tested = rows.filter(r => r.band != null)
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
      const to = r.band!.suggestedClass as EnglishClass
      ;((m[from] ||= {})[to] ||= []).push(r)
    })
    return m
  }, [tested])

  const listed = useMemo(() => {
    let out = cell ? (matrix[cell.from]?.[cell.to] ?? []) : tested
    if (!cell && onlyMoves) out = out.filter(r => r.band!.suggestedClass !== r.student.english_class)
    return [...out].sort((a, b) => b.band!.composite - a.band!.composite)
  }, [tested, matrix, cell, onlyMoves])

  if (tested.length === 0) {
    return <p className="text-[13px] text-text-tertiary py-10 text-center">No oral scores recorded for Grade {test.grade} yet.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-secondary">
        <strong className="text-navy">{rows.length}</strong> students &middot; <strong className="text-navy">{tested.length}</strong> tested
      </p>

      {/* ── Movement matrix ── */}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <div className="px-4 pt-3.5 pb-2">
          <p className="text-[12px] font-semibold text-navy">Where they are, and where the Band puts them</p>
          <p className="text-[10px] text-text-tertiary">Down the diagonal is staying. Click any number for the names.</p>
        </div>
        <table className="text-[11px] w-full">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">In</th>
              {PLACED_ENGLISH_CLASSES.map(c => (
                <th key={c} className="px-2 py-2 text-center text-[9px] uppercase tracking-wider font-semibold min-w-[64px]" style={{ color: classToTextColor(c) }}>{c}</th>
              ))}
              <th className="px-3 py-2 text-center text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>{classes.map(from => {
            const total = PLACED_ENGLISH_CLASSES.reduce((s, to) => s + (matrix[from]?.[to]?.length ?? 0), 0)
            if (total === 0) return null
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
                <td className="px-3 py-2 text-center text-text-tertiary">{total}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>

      {/* ── The grade in one picture ── */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Every student, by Band</p>
        <p className="text-[10px] text-text-tertiary mb-3">
          A row per class they are in now. A dot&rsquo;s colour is the class its Band points at, so a dot that does not match its row is a move.
        </p>
        <div className="space-y-2">
          {classes.map(c => {
            const inClass = tested.filter(r => r.student.english_class === c)
            if (inClass.length === 0) return null
            return (
              <div key={c} className="flex items-center gap-2">
                <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c) }}>{c}</span>
                <div className="flex-1 relative h-8 bg-surface-alt/50 rounded border border-border">
                  {CLASS_CUTS.map(x => <div key={x} className="absolute top-0 h-full border-l border-border" style={{ left: `${x}%` }} />)}
                  {inClass.map(r => {
                    const sug = r.band!.suggestedClass as EnglishClass
                    const moving = sug !== c
                    return (
                      <div key={r.student.id}
                        title={`${r.student.english_name} — Band ${Math.round(r.band!.composite)}, passage ${r.band!.effectiveLevel} → ${sug}`}
                        className={`absolute w-3 h-3 rounded-full -translate-x-1/2 ${moving ? 'ring-2 ring-white' : 'border border-white/60'}`}
                        style={{ left: `${Math.min(99, Math.max(1, r.band!.composite))}%`, top: '50%', marginTop: -6, backgroundColor: classToColor(sug), zIndex: moving ? 2 : 1 }} />
                    )
                  })}
                </div>
                <span className="w-7 text-[10px] text-text-tertiary shrink-0">{inClass.length}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap text-[10px] text-text-secondary">
          <span className="text-text-tertiary">Dot colour = suggested class:</span>
          {PLACED_ENGLISH_CLASSES.map(c => (
            <span key={c} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: classToColor(c) }} />{c}</span>
          ))}
        </div>
      </div>

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
                Only where the Band differs
              </button>}
        </div>
        <table className="w-full text-[11px]">
          <thead><tr className="bg-surface-alt">
            {['Student', 'In', 'Band', 'Passage', 'Band suggests', 'Last placed'].map((h, i) => (
              <th key={h} className={`px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{listed.map(r => {
            const sug = r.band!.suggestedClass as EnglishClass
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
                <td className="px-3 py-2 text-center font-semibold text-navy">{Math.round(r.band!.composite)}</td>
                <td className="px-3 py-2 text-center">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PASSAGE_COLORS[r.band!.effectiveLevel] }} />
                    {r.band!.effectiveLevel}
                    {r.band!.downgraded && <span className="text-[8px] text-amber-600" title={`Tried ${r.band!.attemptedLevel}, did not sustain it`}>&darr;</span>}
                  </span>
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
    const criteria = (cat.checklist || []).map((item: any) => {
      const byCls: Record<string, { hit: number; n: number }> = {}
      rows.forEach(r => {
        const v = r.raw?.written_checklist?.[cat.key]?.[item.key]
        if (v == null) return
        const c = (byCls[r.student.english_class] ||= { hit: 0, n: 0 })
        if (v) c.hit++
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

  const anyAnswers = items.some(i => i.answered > 0)
  if (!anyAnswers && writing.length === 0) {
    return <p className="text-[13px] text-text-tertiary py-10 text-center">No written paper marked yet for Grade {test.grade}.</p>
  }

  return (
    <div className="space-y-4">
      {anyAnswers && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 pt-3.5 pb-3">
            <p className="text-[12px] font-semibold text-navy">Every question</p>
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
  const thin = v.n < 4
  const tone = thin ? 'bg-surface-alt text-text-tertiary border-border'
    : pct >= 75 ? 'bg-green-50 text-green-700 border-green-200'
    : pct >= 45 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-red-50 text-red-700 border-red-200'
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`inline-block px-2 py-0.5 rounded border font-semibold ${small ? 'text-[9px]' : 'text-[10px]'} ${tone}`}
        title={thin ? `Only ${v.n} behind this.` : undefined}>{pct}%</span>
      {sub && <span className="block text-[8px] text-text-tertiary mt-0.5">{sub}</span>}
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
          const p = Math.round((v.correct / v.n) * 100)
          return <span key={c} title={`${v.correct} of ${v.n}`}
            className={`text-[9px] px-1.5 py-0.5 rounded border ${v.n >= 3 && p < 50 ? 'bg-red-50 text-red-700 border-red-200 font-semibold' : 'bg-surface-alt text-text-tertiary border-border'}`}>{c} {p}%</span>
        })}
      </div>
    </div>
  )
}
