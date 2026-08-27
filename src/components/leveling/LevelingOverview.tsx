'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, PLACED_ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor, IMPLAUSIBLE_CWPM } from '@/lib/utils'
import { Loader2, AlertTriangle, Users, Layers, ListChecks, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { bandFromCalc, bandRangeFor, BAND_LEVEL_ORDER } from './grade2Band'

type Tab = 'coverage' | 'classes' | 'items' | 'cohorts' | 'overrides'

const PASSAGE_COLORS: Record<string, string> = {
  A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6', F: '#A855F7',
}

/** Fall precedes spring inside an academic year. */
const testOrder = (t: LevelTest) => `${t.academic_year}-${t.semester === 'fall' ? '0' : '1'}`

interface Row {
  student: Student
  calc: any
  band: ReturnType<typeof bandFromCalc>
}

export default function LevelingOverview({ levelTests }: { levelTests: LevelTest[] }) {
  const [tab, setTab] = useState<Tab>('coverage')
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, any>>>({})
  const [placements, setPlacements] = useState<Record<string, Record<string, any>>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Newest academic year by default. Loading every year at once is the
  // difference between a page and a wait, and last year's tests are only
  // wanted by the cohort and override views, which fetch them on their own.
  const years = useMemo(() => Array.from(new Set(levelTests.map(t => t.academic_year))).sort().reverse(), [levelTests])
  const [year, setYear] = useState<string>(years[0] || '')
  useEffect(() => { if (!year && years[0]) setYear(years[0]) }, [years, year])

  const testsInYear = useMemo(
    () => levelTests.filter(t => t.academic_year === year).sort((a, b) => Number(a.grade) - Number(b.grade)),
    [levelTests, year])

  useEffect(() => {
    if (testsInYear.length === 0) { setLoading(false); return }
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const ids = testsInYear.map(t => t.id)
        const [{ data: studs, error: sErr }, { data: sc, error: scErr }, { data: pl }] = await Promise.all([
          supabase.from('students').select('id, english_name, korean_name, english_class, grade').eq('is_active', true).order('english_name'),
          // calculated_metrics only. raw_scores carries the running record and
          // every written answer; across a whole year of tests that is the
          // difference between this screen opening and it hanging.
          supabase.from('level_test_scores').select('level_test_id, student_id, calculated_metrics').in('level_test_id', ids),
          supabase.from('level_test_placements').select('level_test_id, student_id, final_placement, auto_placement, is_overridden').in('level_test_id', ids),
        ])
        if (!alive) return
        if (sErr || scErr) { setError(sErr?.message || scErr?.message || null); return }
        setStudents((studs || []) as any)
        const sm: Record<string, Record<string, any>> = {}
        sc?.forEach((r: any) => { (sm[r.level_test_id] ||= {})[r.student_id] = r.calculated_metrics || {} })
        setScores(sm)
        const pm: Record<string, Record<string, any>> = {}
        pl?.forEach((r: any) => { (pm[r.level_test_id] ||= {})[r.student_id] = r })
        setPlacements(pm)
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not load the overview.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [year, testsInYear.length])

  /** Every tested student of a grade, with their band resolved. */
  const rowsForTest = (t: LevelTest): Row[] => {
    const byStudent = scores[t.id] || {}
    return students.filter(s => Number(s.grade) === Number(t.grade)).map(s => ({
      student: s, calc: byStudent[s.id] || null, band: byStudent[s.id] ? bandFromCalc(t, byStudent[s.id]) : null,
    }))
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const TABS: [Tab, string, any][] = [
    ['coverage', 'Coverage', ListChecks], ['classes', 'Classes', Layers],
    ['items', 'Questions', Users], ['cohorts', 'Cohorts', ArrowRight], ['overrides', 'Overrides', AlertTriangle],
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium ${tab === k ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        {years.length > 1 && (
          <select value={year} onChange={e => setYear(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-[11px] bg-surface ml-auto">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-[11px] text-red-700">Could not load: {error}</div>}
      {testsInYear.length === 0 && <p className="text-text-tertiary text-[13px] py-8 text-center">No level tests in {year || 'this year'}.</p>}

      {tab === 'coverage' && <Coverage tests={testsInYear} rowsForTest={rowsForTest} />}
      {tab === 'classes' && <Classes tests={testsInYear} rowsForTest={rowsForTest} />}
      {tab === 'items' && <ItemAnalysis tests={testsInYear} students={students} />}
      {tab === 'cohorts' && <Cohorts tests={testsInYear} levelTests={levelTests} students={students} />}
      {tab === 'overrides' && <Overrides tests={testsInYear} students={students} placements={placements} />}
    </div>
  )
}

// ─── Coverage ────────────────────────────────────────────────────────
// The operational question during testing week: who has been dealt with, and
// where has entry stalled. Everything here is a count, so it is the one panel
// that compares cleanly across grades without any caveat.
function Coverage({ tests, rowsForTest }: { tests: LevelTest[]; rowsForTest: (t: LevelTest) => Row[] }) {
  const data = tests.map(t => {
    const rows = rowsForTest(t)
    const byClass = ENGLISH_CLASSES.map(cls => {
      const inClass = rows.filter(r => r.student.english_class === cls)
      const oral = inClass.filter(r => r.calc && (r.calc.oral_complete || r.calc.passage_level != null || r.calc.cwpm != null)).length
      const written = inClass.filter(r => r.calc && (r.calc.written_mc_total != null || r.calc.writing_total != null)).length
      return { cls, total: inClass.length, oral, written }
    }).filter(c => c.total > 0)
    const all = rows
    return {
      test: t, byClass,
      total: all.length,
      flags: {
        rate: all.filter(r => r.calc?.cwpm != null && r.calc.cwpm > IMPLAUSIBLE_CWPM).length,
        compNa: all.filter(r => r.calc?.comp_not_administered).length,
        attemptedNone: all.filter(r => r.calc?.oral_complete && r.calc?.passage_level == null).length,
        untested: all.filter(r => !r.calc || (r.calc.passage_level == null && !r.calc.oral_complete && r.calc.written_mc_total == null)).length,
      },
    }
  })

  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.test.id} className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[14px] font-semibold text-navy">Grade {d.test.grade}</span>
            <span className="text-[11px] text-text-tertiary">{d.test.name}</span>
            <span className="text-[11px] text-text-tertiary ml-auto">{d.total} students</span>
          </div>
          <div className="space-y-1.5">
            {d.byClass.map(c => (
              <div key={c.cls} className="flex items-center gap-2">
                <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
                <CoverageBar label="Oral" done={c.oral} total={c.total} />
                <CoverageBar label="Written" done={c.written} total={c.total} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
            <Flag n={d.flags.untested} tone="grey" label="not started" title="No oral passage, no completion mark and no written score." />
            <Flag n={d.flags.attemptedNone} tone="amber" label="attempted none" title="Oral session marked complete with no passage read. Scored 0 and ranked at the bottom." />
            <Flag n={d.flags.compNa} tone="amber" label="comp not administered" title="Stopped mid-passage, so the questions were never asked. The passage counts as not sustained." />
            <Flag n={d.flags.rate} tone="red" label="rate too fast to be real" title={`Over ${IMPLAUSIBLE_CWPM} wpm. Almost always a stopwatch started late — check before placing, since rate feeds the Band.`} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CoverageBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  const full = done === total && total > 0
  return (
    <div className="flex-1 flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] uppercase tracking-wider text-text-tertiary w-12 shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: full ? '#22C55E' : pct > 0 ? '#EAB308' : 'transparent' }} />
      </div>
      <span className={`text-[10px] font-semibold w-12 shrink-0 ${full ? 'text-green-600' : 'text-text-secondary'}`}>{done}/{total}</span>
    </div>
  )
}

function Flag({ n, label, tone, title }: { n: number; label: string; tone: 'grey' | 'amber' | 'red'; title: string }) {
  if (n === 0) return null
  const cls = tone === 'red' ? 'bg-red-50 text-red-700 border-red-200'
    : tone === 'amber' ? 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-surface-alt text-text-tertiary border-border'
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold ${cls}`}>
      {tone === 'red' && <AlertTriangle size={10} />}{n} {label}
    </span>
  )
}

// ─── Classes ─────────────────────────────────────────────────────────
// Class against class inside one grade, which is the only fully comparable
// comparison there is: same test, same passages, same paper. A dot per student
// rather than a bar per class, because the average is the one number that
// cannot show what a leveling meeting needs to see -- a class that is really
// two groups, or two classes sitting on top of each other.
function Classes({ tests, rowsForTest }: { tests: LevelTest[]; rowsForTest: (t: LevelTest) => Row[] }) {
  const [gradeIdx, setGradeIdx] = useState(0)
  const test = tests[Math.min(gradeIdx, tests.length - 1)]
  if (!test) return null
  const rows = rowsForTest(test).filter(r => r.band != null)

  // Unplaced is not a level. It is where a transfer student waits until they
  // have been tested, so it has no class above or below it and nothing on the
  // ladder should treat it as a rung. It gets its own panel instead, answering
  // the only question it exists to hold: where does this child go.
  const summarise = (cls: EnglishClass) => {
    const inClass = rows.filter(r => r.student.english_class === cls)
    const bands = inClass.map(r => r.band!.composite).sort((a, b) => a - b)
    const median = bands.length ? (bands.length % 2 ? bands[(bands.length - 1) / 2] : (bands[bands.length / 2 - 1] + bands[bands.length / 2]) / 2) : null
    const passages: Record<string, number> = {}
    inClass.forEach(r => { const l = r.band!.effectiveLevel; passages[l] = (passages[l] || 0) + 1 })
    const modalPassage = Object.entries(passages).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return { cls, rows: inClass, bands, median, passages, modalPassage }
  }
  const byClass = PLACED_ENGLISH_CLASSES.map(summarise).filter(c => c.rows.length > 0)
  const unplaced = rows.filter(r => !PLACED_ENGLISH_CLASSES.includes(r.student.english_class as EnglishClass))

  // ── Class overlap, both directions ──
  // Students sitting nearer the class above them, and nearer the class below.
  // Neither is a verdict: it is the shortlist a leveling meeting exists to work
  // through, and it was previously spread across two tables. The cut is the
  // midpoint between the two class medians, so it moves with the cohort rather
  // than sitting on a number somebody picked.
  const drift = byClass.flatMap((c, i) => {
    const out: { cls: EnglishClass; dir: 'up' | 'down'; other: EnglishClass; names: string[] }[] = []
    if (c.median == null) return out
    const above = byClass[i + 1], below = byClass[i - 1]
    // Only meaningful while the ladder is actually in order. Where a class
    // outranks the one above it the midpoint falls on the wrong side of the
    // median and the list fills with most of the room, which says nothing about
    // those children. The inversion itself is the finding, and is reported
    // separately.
    if (above?.median != null && above.median > c.median) {
      const cut = (c.median + above.median) / 2
      const names = c.rows.filter(r => r.band!.composite > cut).map(r => r.student.english_name)
      if (names.length) out.push({ cls: c.cls, dir: 'up', other: above.cls, names })
    }
    if (below?.median != null && below.median < c.median) {
      const cut = (c.median + below.median) / 2
      const names = c.rows.filter(r => r.band!.composite < cut).map(r => r.student.english_name)
      if (names.length) out.push({ cls: c.cls, dir: 'down', other: below.cls, names })
    }
    return out
  })
  const above = drift.filter(d => d.dir === 'up')
  const below = drift.filter(d => d.dir === 'down')

  // Adjacent classes whose medians run the wrong way round. Rarer and more
  // serious than any individual drifting: it means two rooms are not in the
  // order their names claim.
  const inversions = byClass.slice(0, -1).map((c, i) => ({ lower: c, upper: byClass[i + 1] }))
    .filter(p => p.lower.median != null && p.upper.median != null && p.upper.median < p.lower.median)

  const maxBand = 100
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {tests.map((t, i) => (
          <button key={t.id} onClick={() => setGradeIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${i === gradeIdx ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            Grade {t.grade}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Where each class actually sits</p>
        <p className="text-[10px] text-text-tertiary mb-4">
          One dot per student, placed by Band &mdash; the passage they sustained sets the floor, so a dot further right read a harder text.
          The line is the class median. Look for classes whose dots overlap, and for a class that is really two clusters rather than one.
        </p>
        {byClass.map(c => (
          <div key={c.cls} className="flex items-center gap-2 mb-2.5">
            <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
            <div className="flex-1 relative h-7 bg-surface-alt/60 rounded border border-border">
              {[25, 50, 75].map(g => <div key={g} className="absolute top-0 h-full border-l border-border/60" style={{ left: `${g}%` }} />)}
              {c.rows.map(r => (
                <div key={r.student.id}
                  title={`${r.student.english_name} — Band ${Math.round(r.band!.composite)}, passage ${r.band!.effectiveLevel}${r.band!.downgraded ? ` (tried ${r.band!.attemptedLevel})` : ''}`}
                  className="absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 border border-white/70"
                  style={{ left: `${(r.band!.composite / maxBand) * 100}%`, top: '50%', marginTop: -5, backgroundColor: PASSAGE_COLORS[r.band!.effectiveLevel] || '#94a3b8' }} />
              ))}
              {c.median != null && (
                <div className="absolute top-0 h-full w-0.5 bg-navy" style={{ left: `${(c.median / maxBand) * 100}%` }} title={`Median ${Math.round(c.median)}`} />
              )}
            </div>
            <span className="w-9 text-[10px] font-semibold text-navy shrink-0 text-right">{c.median != null ? Math.round(c.median) : '—'}</span>
            <span className="w-8 text-[10px] text-text-tertiary shrink-0">n={c.rows.length}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-text-secondary flex-wrap">
          <span className="text-text-tertiary">Dot colour = passage sustained:</span>
          {BAND_LEVEL_ORDER.map(l => (
            <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PASSAGE_COLORS[l] }} />{l}</span>
          ))}
        </div>
      </div>

      {/* ── Same passage, different class ── */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <p className="text-[12px] font-semibold text-navy">Same passage, different class</p>
        <p className="text-[10px] text-text-tertiary mb-3">
          Which passage each class typically sustained, across the six placed classes. Two of them on the same passage are reading the same text, whatever their names say &mdash;
          that is the concrete version of &ldquo;these rooms are not actually different levels&rdquo;.
        </p>
        <div className="space-y-1.5">
          {byClass.map(c => (
            <div key={c.cls} className="flex items-center gap-2">
              <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
              <div className="flex-1 h-5 flex rounded-full overflow-hidden bg-gray-100">
                {BAND_LEVEL_ORDER.map(l => {
                  const n = c.passages[l] || 0
                  if (!n) return null
                  return (
                    <div key={l} title={`Passage ${l}: ${n} student${n === 1 ? '' : 's'}`}
                      className="h-full flex items-center justify-center" style={{ width: `${(n / c.rows.length) * 100}%`, backgroundColor: PASSAGE_COLORS[l] }}>
                      {(n / c.rows.length) > 0.12 && <span className="text-[9px] font-bold text-white">{l}</span>}
                    </div>
                  )
                })}
              </div>
              <span className="w-24 text-[10px] text-text-secondary shrink-0">mostly <strong>{c.modalPassage ?? '—'}</strong></span>
            </div>
          ))}
        </div>
        {(() => {
          const shared: Record<string, EnglishClass[]> = {}
          byClass.forEach(c => { if (c.modalPassage) (shared[c.modalPassage] ||= []).push(c.cls) })
          const clashes = Object.entries(shared).filter(([, cs]) => cs.length > 1)
          if (clashes.length === 0) return null
          return (
            <div className="mt-3 pt-3 border-t border-border space-y-1">
              {clashes.map(([lvl, cs]) => (
                <p key={lvl} className="text-[11px] text-amber-700">
                  <strong>{cs.join(' and ')}</strong> both sit mostly on passage <strong>{lvl}</strong> &mdash; on the oral evidence they are the same reading level.
                </p>
              ))}
            </div>
          )
        })()}
      </div>

      {inversions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[12px] font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} /> Two classes are the wrong way round
          </p>
          {inversions.map(p => (
            <p key={p.lower.cls} className="text-[11px] text-amber-800">
              <strong>{p.upper.cls}</strong> has a lower median Band ({Math.round(p.upper.median as number)}) than <strong>{p.lower.cls}</strong> ({Math.round(p.lower.median as number)}),
              though it is meant to be the stronger class. Individual drift between these two is not listed below, because with the ladder inverted it would name most of both rooms.
            </p>
          ))}
        </div>
      )}

      {/* ── Drift shortlists, both directions ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <DriftPanel title="Sitting above their class" tone="up" rows={above}
          blurb="Band closer to the class above than to their own. Not a verdict &mdash; the shortlist the meeting works through." />
        <DriftPanel title="Sitting below their class" tone="down" rows={below}
          blurb="Band closer to the class below. Read these against the Coverage flags first: a rate that was never real, or a passage stopped early, lands a student here without meaning anything." />
      </div>

      {/* ── Unplaced ── */}
      {unplaced.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[12px] font-semibold text-navy">Waiting to be placed</p>
          <p className="text-[10px] text-text-tertiary mb-3">
            Transfer students held outside the ladder until they have been tested. Unplaced is not a level, so it is left out of the class comparisons above &mdash;
            but the Band answers the question it exists to hold.
          </p>
          <div className="space-y-1">
            {unplaced.sort((a, b) => b.band!.composite - a.band!.composite).map(r => (
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

// ─── Questions ───────────────────────────────────────────────────────
// Item analysis, built on the chosen letter rather than on right/wrong.
// That a class got a question wrong is a statistic. That eleven of them picked
// the same wrong answer, and that the test's own note says what picking it
// means, is a lesson.
function ItemAnalysis({ tests, students }: { tests: LevelTest[]; students: Student[] }) {
  const [idx, setIdx] = useState(0)
  const test = tests[Math.min(idx, tests.length - 1)]
  const [answers, setAnswers] = useState<Record<string, Record<number, string>>>({})
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'qNum' | 'hardest'>('qNum')

  useEffect(() => {
    if (!test) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const qs = await loadQuestions(test)
        // written_answers is the only place the chosen letter lives, so this is
        // the one view that has to pay for raw_scores -- scoped to one test.
        const { data } = await supabase.from('level_test_scores')
          .select('student_id, raw_scores').eq('level_test_id', test.id)
        if (!alive) return
        const a: Record<string, Record<number, string>> = {}
        data?.forEach((r: any) => { if (r.raw_scores?.written_answers) a[r.student_id] = r.raw_scores.written_answers })
        setQuestions(qs); setAnswers(a)
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [test?.id])

  const cohort = useMemo(() => students.filter(s => Number(s.grade) === Number(test?.grade)), [students, test?.grade])
  const classes = useMemo(() => ENGLISH_CLASSES.filter(c => cohort.some(s => s.english_class === c)), [cohort])

  const items = useMemo(() => questions.map(q => {
    const picks: Record<string, number> = {}
    let answered = 0, correct = 0
    const byClass: Record<string, { n: number; correct: number }> = {}
    cohort.forEach(s => {
      const chosen = answers[s.id]?.[q.qNum]
      if (!chosen) return
      answered++
      picks[chosen] = (picks[chosen] || 0) + 1
      const ok = chosen === q.correct
      if (ok) correct++
      const b = (byClass[s.english_class] ||= { n: 0, correct: 0 })
      b.n++; if (ok) b.correct++
    })
    const topWrong = Object.entries(picks).filter(([k]) => k !== q.correct).sort((a, b) => b[1] - a[1])[0] || null
    return { q, picks, answered, correct, byClass, topWrong, pct: answered ? correct / answered : null }
  }), [questions, answers, cohort])

  const ordered = useMemo(() => sortBy === 'hardest'
    ? [...items].sort((a, b) => (a.pct ?? 2) - (b.pct ?? 2))
    : items, [items, sortBy])

  // Domain and DOK rollups: the coarse view for when one question has too few
  // students behind it to read on its own.
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

  if (!test) return null
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap items-center">
        {tests.map((t, i) => (
          <button key={t.id} onClick={() => setIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${i === idx ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            Grade {t.grade}
          </button>
        ))}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 border border-border rounded-lg text-[11px] bg-surface ml-auto">
          <option value="qNum">In paper order</option>
          <option value="hardest">Hardest first</option>
        </select>
      </div>

      {loading && <div className="p-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>}
      {!loading && questions.length === 0 && <p className="text-text-tertiary text-[12px] py-8 text-center">No question set is authored for this test.</p>}
      {!loading && questions.length > 0 && items.every(i => i.answered === 0) && (
        <p className="text-text-tertiary text-[12px] py-8 text-center">No written answers recorded yet for Grade {test.grade}.</p>
      )}

      {!loading && items.some(i => i.answered > 0) && (
        <>
          <Rollup title="By domain" acc={rollup('domain')} classes={classes}
            blurb="Every question grouped by what it asks for. The coarse view, and the one to trust when a single question has three students behind it." />
          <Rollup title="By depth of knowledge" acc={rollup('dok')} classes={classes} prefix="DOK "
            blurb="DOK 1 is retrieval, DOK 2 asks the student to do something with what they found. A class strong on 1 and weak on 2 can locate but not infer, which is a different lesson from not understanding the passage." />

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-4 pb-2">
              <p className="text-[12px] font-semibold text-navy">Question by question</p>
              <p className="text-[10px] text-text-tertiary">
                The bar shows what the whole grade chose. The key is green; the wrong answer most often chosen is amber, and where the paper says
                what choosing it means, it says so underneath. Anything with fewer than five answers behind it is greyed &mdash; that is noise, not a finding.
              </p>
            </div>
            <div className="divide-y divide-border">
              {ordered.map(it => <Item key={it.q.qNum} it={it} classes={classes} />)}
            </div>
          </div>
        </>
      )}
    </div>
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
          {classes.map(c => <th key={c} className="text-center px-3 py-2 text-[9px] uppercase tracking-wider font-semibold min-w-[80px]" style={{ color: classToTextColor(c) }}>{c}</th>)}
        </tr></thead>
        <tbody>{keys.map(k => (
          <tr key={k} className="border-t border-border">
            <td className="px-3 py-2 font-medium text-navy">{prefix}{k}</td>
            {classes.map(c => {
              const v = acc[k][c]
              if (!v || v.n === 0) return <td key={c} className="px-3 py-2 text-center text-text-tertiary">—</td>
              const pct = Math.round((v.correct / v.n) * 100)
              const thin = v.n < 5
              const tone = thin ? 'bg-surface-alt text-text-tertiary border-border'
                : pct >= 80 ? 'bg-green-50 text-green-700 border-green-200'
                : pct >= 55 ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-red-50 text-red-700 border-red-200'
              return (
                <td key={c} className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${tone}`}
                    title={thin ? `Only ${v.n} answers behind this.` : undefined}>{pct}%</span>
                  <span className="block text-[8px] text-text-tertiary mt-0.5">{v.correct}/{v.n}</span>
                </td>
              )
            })}
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
  // A distractor chosen more often than the key, across a whole grade, is the
  // signal that the item or its key is wrong rather than the students.
  const keyBeaten = it.topWrong && it.topWrong[1] > (it.picks[q.correct] || 0) && it.answered >= 8
  return (
    <div className={`p-4 ${keyBeaten ? 'bg-red-50/40' : ''}`}>
      <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
        <span className="text-[11px] font-bold text-navy shrink-0">Q{q.qNum}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${thin ? 'bg-surface-alt text-text-tertiary' : pct != null && pct >= 80 ? 'bg-green-100 text-green-700' : pct != null && pct >= 55 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
          {pct != null ? `${pct}%` : '—'}
        </span>
        <span className="text-[9px] text-text-tertiary">{it.correct}/{it.answered}</span>
        {q.standard && <span className="text-[9px] text-text-tertiary">{q.standard}</span>}
        {q.dok != null && <span className="text-[9px] text-text-tertiary">DOK {q.dok}</span>}
        {keyBeaten && (
          <span className="text-[9px] font-bold text-red-700 inline-flex items-center gap-1" title="More of the grade chose one wrong answer than chose the key. Check the answer key and the question before counting this item.">
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
          return (
            <span key={c} title={`${v.correct} of ${v.n}`}
              className={`text-[9px] px-1.5 py-0.5 rounded border ${weak ? 'bg-red-50 text-red-700 border-red-200 font-semibold' : 'bg-surface-alt text-text-tertiary border-border'}`}>
              {c} {p}%
            </span>
          )
        })}
      </div>
    </div>
  )
}

/** The authored question set for a test, or [] where none exists. */
async function loadQuestions(test: LevelTest): Promise<any[]> {
  const g = Number(test.grade)
  try {
    if (g === 1) {
      const m = await import('./grade1Content')
      return m.g1ContentForTest(test as any)?.written.questions ?? []
    }
    if (g === 2) { const m = await import('./grade2Content'); return m.g2ContentForTest(test as any)?.written.questions ?? [] }
    if (g === 3) { const m = await import('./grade3Content'); return m.g3ContentForTest(test as any)?.written.questions ?? [] }
    if (g === 4) { const m = await import('./grade4Content'); return m.g4ContentForTest(test as any)?.written.questions ?? [] }
    if (g === 5) { const m = await import('./grade5Content'); return m.g5ContentForTest(test as any)?.written.questions ?? [] }
  } catch { /* an unauthored version is missing data, not a broken page */ }
  return []
}

// ─── Cohorts ─────────────────────────────────────────────────────────
// The same children, a year apart. This is the only view that separates "this
// year's Grade 4 is weak" from "these particular children are weak" -- a
// curriculum problem from a cohort one -- and nothing else here can tell them
// apart. Matched on student id, so a child who joined mid-year simply has no
// prior column rather than being counted as a decline.
function Cohorts({ tests, levelTests, students }: { tests: LevelTest[]; levelTests: LevelTest[]; students: Student[] }) {
  const [idx, setIdx] = useState(0)
  const test = tests[Math.min(idx, tests.length - 1)]
  const [rows, setRows] = useState<{ student: Student; now: number | null; before: number | null; beforeTest: LevelTest | null }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!test) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const cohort = students.filter(s => Number(s.grade) === Number(test.grade))
        const ids = cohort.map(s => s.id)
        if (ids.length === 0) { setRows([]); return }
        const { data } = await supabase.from('level_test_scores')
          .select('level_test_id, student_id, calculated_metrics').in('student_id', ids)
        if (!alive) return
        const byStudent: Record<string, any[]> = {}
        data?.forEach((r: any) => { (byStudent[r.student_id] ||= []).push(r) })
        const out = cohort.map(s => {
          const mine = (byStudent[s.id] || [])
            .map(r => ({ r, t: levelTests.find(lt => lt.id === r.level_test_id) }))
            .filter(x => x.t) as { r: any; t: LevelTest }[]
          mine.sort((a, b) => testOrder(a.t).localeCompare(testOrder(b.t)))
          const cur = mine.find(x => x.t.id === test.id)
          const prior = mine.filter(x => testOrder(x.t) < testOrder(test)).pop() ?? null
          return {
            student: s,
            now: cur ? bandFromCalc(cur.t, cur.r.calculated_metrics)?.composite ?? null : null,
            before: prior ? bandFromCalc(prior.t, prior.r.calculated_metrics)?.composite ?? null : null,
            beforeTest: prior?.t ?? null,
          }
        })
        setRows(out)
      } finally { if (alive) setLoading(false) }
    })()
    return () => { alive = false }
  }, [test?.id, students.length])

  const paired = rows.filter(r => r.now != null && r.before != null)
  const gained = paired.filter(r => (r.now as number) > (r.before as number)).length
  const held = paired.filter(r => Math.abs((r.now as number) - (r.before as number)) < 3).length
  const lost = paired.filter(r => (r.now as number) < (r.before as number) - 3).length
  const avg = paired.length ? paired.reduce((s, r) => s + ((r.now as number) - (r.before as number)), 0) / paired.length : null

  if (!test) return null
  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {tests.map((t, i) => (
          <button key={t.id} onClick={() => setIdx(i)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${i === idx ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            Grade {t.grade}
          </button>
        ))}
      </div>
      {loading && <div className="p-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>}
      {!loading && paired.length === 0 && (
        <p className="text-text-tertiary text-[12px] py-8 text-center">
          No Grade {test.grade} student has an earlier level test to compare against yet.
        </p>
      )}
      {!loading && paired.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-[12px] font-semibold text-navy">The same children, a year on</p>
          <p className="text-[10px] text-text-tertiary mb-3">
            {paired.length} of {rows.length} Grade {test.grade} students sat an earlier test. Band is comparable across years only in the sense that it says
            how far up their OWN grade&rsquo;s ladder a child reached &mdash; the ladder itself got harder, so holding steady is real progress.
          </p>
          <div className="flex gap-2 flex-wrap mb-3">
            <Stat n={gained} label="moved up their ladder" tone="green" />
            <Stat n={held} label="held position" tone="grey" />
            <Stat n={lost} label="fell back" tone="red" />
            {avg != null && <Stat n={Math.round(avg)} label="average band change" tone={avg >= 0 ? 'green' : 'red'} signed />}
          </div>
          <div className="space-y-1 max-h-[340px] overflow-y-auto">
            {[...paired].sort((a, b) => ((a.now as number) - (a.before as number)) - ((b.now as number) - (b.before as number))).map(r => {
              const d = Math.round((r.now as number) - (r.before as number))
              return (
                <div key={r.student.id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-40 truncate text-navy font-medium shrink-0">{r.student.english_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: classToColor(r.student.english_class as EnglishClass) + '40', color: classToTextColor(r.student.english_class as EnglishClass) }}>{r.student.english_class}</span>
                  <span className="text-text-tertiary shrink-0">{Math.round(r.before as number)}</span>
                  <ArrowRight size={11} className="text-text-tertiary shrink-0" />
                  <span className="text-navy font-semibold shrink-0">{Math.round(r.now as number)}</span>
                  <span className={`text-[10px] font-semibold shrink-0 ${d > 2 ? 'text-green-600' : d < -2 ? 'text-red-600' : 'text-text-tertiary'}`}>
                    {d > 2 ? <TrendingUp size={10} className="inline" /> : d < -2 ? <TrendingDown size={10} className="inline" /> : <Minus size={10} className="inline" />} {d > 0 ? `+${d}` : d}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ n, label, tone, signed }: { n: number; label: string; tone: 'green' | 'red' | 'grey'; signed?: boolean }) {
  const cls = tone === 'green' ? 'text-green-700 bg-green-50 border-green-200'
    : tone === 'red' ? 'text-red-700 bg-red-50 border-red-200' : 'text-text-secondary bg-surface-alt border-border'
  return (
    <span className={`inline-flex items-baseline gap-1.5 px-2.5 py-1.5 rounded-lg border ${cls}`}>
      <strong className="text-[15px]">{signed && n > 0 ? `+${n}` : n}</strong>
      <span className="text-[10px]">{label}</span>
    </span>
  )
}

// ─── Overrides ───────────────────────────────────────────────────────
// Where a teacher disagreed with the test. Worth watching in both directions:
// a class with no overrides may not have been read at all, and a class where
// everyone was overridden is a teacher telling you the test is wrong for them.
function Overrides({ tests, students, placements }: { tests: LevelTest[]; students: Student[]; placements: Record<string, Record<string, any>> }) {
  return (
    <div className="space-y-3">
      {tests.map(t => {
        const pl = placements[t.id] || {}
        const cohort = students.filter(s => Number(s.grade) === Number(t.grade))
        const rows = cohort.map(s => ({ s, p: pl[s.id] })).filter(x => x.p)
        const moved = rows.filter(x => x.p.is_overridden && x.p.auto_placement && x.p.auto_placement !== x.p.final_placement)
        const byClass = ENGLISH_CLASSES.map(cls => {
          const inClass = rows.filter(x => x.s.english_class === cls)
          const ov = inClass.filter(x => x.p.is_overridden && x.p.auto_placement !== x.p.final_placement)
          return { cls, total: inClass.length, ov: ov.length }
        }).filter(c => c.total > 0)
        if (rows.length === 0) return null
        return (
          <div key={t.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-[14px] font-semibold text-navy">Grade {t.grade}</span>
              <span className="text-[11px] text-text-tertiary">{moved.length} of {rows.length} placements overridden</span>
            </div>
            <div className="space-y-1.5 mb-3">
              {byClass.map(c => (
                <div key={c.cls} className="flex items-center gap-2">
                  <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(c.cls) }}>{c.cls}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${c.total ? (c.ov / c.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[10px] text-text-secondary w-14 shrink-0">{c.ov}/{c.total}</span>
                  {c.total >= 4 && c.ov / c.total > 0.5 && (
                    <span className="text-[9px] text-amber-700 font-semibold shrink-0" title="More than half this class was moved off the test's suggestion. Either the test is reading this class badly, or the placements were made before the scores were.">most of the class</span>
                  )}
                </div>
              ))}
            </div>
            {moved.length > 0 && (
              <div className="pt-3 border-t border-border space-y-1 max-h-[240px] overflow-y-auto">
                {moved.map(x => (
                  <div key={x.s.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-40 truncate text-navy font-medium shrink-0">{x.s.english_name}</span>
                    <span className="text-text-tertiary shrink-0">{x.p.auto_placement}</span>
                    <ArrowRight size={11} className="text-text-tertiary shrink-0" />
                    <span className="font-semibold shrink-0" style={{ color: classToTextColor(x.p.final_placement) }}>{x.p.final_placement}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
