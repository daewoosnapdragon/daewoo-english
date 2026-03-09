'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, ArrowRight, BookOpen, FileText, Target, PieChart, Layers } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────

function getWrittenMcTotal(grade: number | string): number {
  const g = Number(grade)
  if (g === 2) return 32; if (g === 3) return 26; if (g === 4) return 40; if (g === 5) return 37
  return 26
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function q1(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return median(sorted.slice(0, mid))
}

function q3(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return median(sorted.slice(sorted.length % 2 !== 0 ? mid + 1 : mid))
}

const PLACEMENT_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']
const PASSAGE_LEVELS = ['A', 'B', 'C', 'D', 'E'] as const

// ── Types ──────────────────────────────────────────────────────────

interface ClassMetrics {
  cls: EnglishClass
  count: number
  oral: StatBlock; writing: StatBlock; mc: StatBlock; grades: StatBlock; anecdotal: StatBlock; composite: StatBlock
  stayCount: number; moveUpCount: number; moveDownCount: number
  movements: { student: Student; from: EnglishClass; to: EnglishClass; composite: number }[]
}

interface StatBlock {
  median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean
}

function computeStats(values: number[]): StatBlock {
  if (values.length === 0) return { median: 0, q1: 0, q3: 0, min: 0, max: 0, values: [], hasData: false }
  return { median: median(values), q1: q1(values), q3: q3(values), min: Math.min(...values), max: Math.max(...values), values, hasData: true }
}

// ── Sub-components ─────────────────────────────────────────────────

function ClassBar({ cls, stats, maxVal, unit, prevMedian }: { cls: EnglishClass; stats: StatBlock; maxVal: number; unit: string; prevMedian: number | null }) {
  if (!stats.hasData) return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-20 text-[10px] font-semibold text-right" style={{ color: classToTextColor(cls) }}>{cls}</span>
      <span className="text-[10px] text-text-tertiary italic">No data</span>
    </div>
  )

  const scale = maxVal > 0 ? maxVal : stats.max
  const barMax = scale > 0 ? scale * 1.1 : 1
  const q1Pct = (stats.q1 / barMax) * 100
  const q3Pct = (stats.q3 / barMax) * 100
  const medPct = (stats.median / barMax) * 100

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(cls) }}>{cls}</span>
      <div className="flex-1 h-5 relative bg-gray-100 rounded-full overflow-hidden">
        <div className="absolute h-full rounded-full opacity-30" style={{ left: `${q1Pct}%`, width: `${q3Pct - q1Pct}%`, backgroundColor: classToColor(cls) }} />
        <div className="absolute h-full w-1 rounded-full" style={{ left: `${medPct}%`, backgroundColor: classToColor(cls) }} />
        {prevMedian != null && <div className="absolute h-full w-0.5 border-l-2 border-dashed opacity-40" style={{ left: `${(prevMedian / barMax) * 100}%`, borderColor: classToColor(cls) }} />}
      </div>
      <span className="w-12 text-[10px] font-bold text-navy text-right shrink-0">{Math.round(stats.median)}{unit}</span>
      {prevMedian != null && (
        <span className={`text-[9px] font-bold w-8 text-right ${stats.median > prevMedian ? 'text-green-600' : stats.median < prevMedian ? 'text-red-600' : 'text-text-tertiary'}`}>
          {stats.median > prevMedian ? '↑' : stats.median < prevMedian ? '↓' : '→'}{Math.abs(Math.round(stats.median - prevMedian))}
        </span>
      )}
    </div>
  )
}

function HeatmapCell({ value, label }: { value: number | null; label: string }) {
  if (value == null) return <td className="px-3 py-2.5 text-center text-text-tertiary">--</td>
  let bg = 'bg-gray-50'; let text = 'text-gray-400'
  if (value >= 90) { bg = 'bg-green-100'; text = 'text-green-800' }
  else if (value >= 70) { bg = 'bg-green-50'; text = 'text-green-700' }
  else if (value >= 50) { bg = 'bg-amber-50'; text = 'text-amber-700' }
  else { bg = 'bg-red-50'; text = 'text-red-700' }

  return (
    <td className="px-3 py-2.5 text-center">
      <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${bg} ${text}`}>{label}</span>
    </td>
  )
}

function DotPlot({ title, data, maxVal, outliers, students }: { title: string; data: { value: number | null; cls: EnglishClass; name: string }[]; maxVal: number | null; outliers: any[]; students: Student[] }) {
  const valid = data.filter(d => d.value != null) as { value: number; cls: EnglishClass; name: string }[]
  if (valid.length === 0) return null

  const actualMax = maxVal ?? Math.max(...valid.map(d => d.value))
  const scale = actualMax > 0 ? actualMax * 1.1 : 1
  const outlierIds = new Set(outliers.map(o => o.studentId))

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">{title}</p>
      <div className="relative h-20 bg-gray-50 rounded-lg border border-border overflow-hidden">
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <div key={pct} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${pct * 100}%` }}>
            <span className="absolute -bottom-4 -translate-x-1/2 text-[8px] text-text-tertiary">{Math.round(pct * scale)}</span>
          </div>
        ))}
        {valid.map((d, i) => {
          const student = students.find(s => s.english_name === d.name)
          const isOutlier = student ? outlierIds.has(student.id) : false
          const leftPct = (d.value / scale) * 100
          return (
            <div key={i} className="absolute top-1/2 -translate-y-1/2 group" style={{ left: `${leftPct}%` }}>
              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${isOutlier ? 'ring-2 ring-red-400' : ''}`} style={{ backgroundColor: classToColor(d.cls) }} />
              <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                {d.name} ({d.cls}): {d.value}
              </div>
            </div>
          )
        })}
      </div>
      <div className="h-5" />
    </div>
  )
}

function GrowthCell({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null && previous == null) return <td className="px-3 py-2.5 text-center text-text-tertiary" colSpan={1}>--</td>
  if (current == null) return <td className="px-3 py-2.5 text-center text-text-tertiary" colSpan={1}>-- <span className="text-[9px]">(was {Math.round(previous!)})</span></td>
  if (previous == null) return <td className="px-3 py-2.5 text-center font-bold text-navy" colSpan={1}>{Math.round(current)} <span className="text-[9px] text-text-tertiary font-normal">new</span></td>

  const diff = current - previous
  const color = diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-text-tertiary'
  const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→'

  return (
    <td className="px-3 py-2.5 text-center" colSpan={1}>
      <span className="font-bold text-navy">{Math.round(current)}</span>
      <span className={`ml-1.5 text-[10px] font-bold ${color}`}>{arrow}{Math.abs(Math.round(diff))}</span>
      <span className="text-[9px] text-text-tertiary ml-1">(was {Math.round(previous)})</span>
    </td>
  )
}

function SectionCard({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h4 className="font-display text-[14px] font-semibold text-navy flex items-center gap-2"><Icon size={16} /> {title}</h4>
        <p className="text-[11px] text-text-secondary mt-0.5">{description}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ── NEW: Passage Distribution Bar ──────────────────────────────
function PassageDistributionBar({ cls, counts, total }: { cls: EnglishClass; counts: Record<string, number>; total: number }) {
  if (total === 0) return null
  const colors: Record<string, string> = { A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6' }

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(cls) }}>{cls}</span>
      <div className="flex-1 h-6 flex rounded-full overflow-hidden bg-gray-100">
        {PASSAGE_LEVELS.map(level => {
          const c = counts[level] || 0
          if (c === 0) return null
          const pct = (c / total) * 100
          return (
            <div key={level} className="h-full flex items-center justify-center group relative" style={{ width: `${pct}%`, backgroundColor: colors[level] }}>
              {pct > 8 && <span className="text-[9px] font-bold text-white">{level}</span>}
              <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                Passage {level}: {c} student{c !== 1 ? 's' : ''} ({Math.round(pct)}%)
              </div>
            </div>
          )
        })}
      </div>
      <span className="w-8 text-[10px] text-text-tertiary text-right shrink-0">{total}</span>
    </div>
  )
}

// ── NEW: Domain Score Mini Bar ──────────────────────────────────
function DomainMiniBar({ domain, pct, count }: { domain: string; pct: number; count: number }) {
  let bg = '#EF4444'
  if (pct >= 80) bg = '#22C55E'
  else if (pct >= 65) bg = '#EAB308'
  else if (pct >= 50) bg = '#F97316'

  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-[10px] text-text-secondary truncate">{domain}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden relative">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: bg }} />
      </div>
      <span className="w-12 text-[10px] font-bold text-right" style={{ color: bg }}>{Math.round(pct)}%</span>
      <span className="w-8 text-[8px] text-text-tertiary text-right">n={count}</span>
    </div>
  )
}

// ── NEW: Standards Mastery Cell ─────────────────────────────────
function StandardsMasteryCell({ met, total }: { met: number; total: number }) {
  if (total === 0) return <td className="px-2 py-2 text-center text-text-tertiary text-[10px]">--</td>
  const pct = (met / total) * 100
  let bg = 'bg-red-100 text-red-700'
  if (pct >= 80) bg = 'bg-green-100 text-green-700'
  else if (pct >= 60) bg = 'bg-amber-100 text-amber-700'

  return (
    <td className="px-2 py-2 text-center">
      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${bg}`}>
        {Math.round(pct)}%
      </span>
    </td>
  )
}

// ── NEW: Composite Strip Plot (one row per class) ───────────────
function CompositeStripPlot({ data, classMetrics }: { data: { value: number; cls: EnglishClass; name: string }[]; classMetrics: ClassMetrics[] }) {
  if (data.length === 0) return null

  const activeClasses = classMetrics.filter(cm => cm.count > 0 && cm.composite.hasData)
  // Find actual data range — allow values > 100 if composites exceed benchmarks
  const allValues = data.map(d => d.value)
  const dataMin = Math.max(0, Math.floor(Math.min(...allValues) / 5) * 5 - 5)
  const dataMax = Math.ceil(Math.max(...allValues, 100) / 5) * 5 + 5
  const range = dataMax - dataMin || 1

  // Generate tick marks
  const ticks: number[] = []
  for (let t = Math.ceil(dataMin / 10) * 10; t <= dataMax; t += 10) ticks.push(t)

  return (
    <div>
      {/* Axis header */}
      <div className="flex items-center mb-1">
        <div className="w-24 shrink-0" />
        <div className="flex-1 relative h-4">
          {ticks.map(t => (
            <span key={t} className="absolute text-[8px] text-text-tertiary -translate-x-1/2" style={{ left: `${((t - dataMin) / range) * 100}%` }}>{t}</span>
          ))}
        </div>
        <div className="w-16 shrink-0" />
      </div>

      {/* Class rows */}
      {activeClasses.map(cm => {
        const classStudents = data.filter(d => d.cls === cm.cls)
        const med = cm.composite.median
        const q1Val = cm.composite.q1
        const q3Val = cm.composite.q3

        return (
          <div key={cm.cls} className="flex items-center mb-1">
            <span className="w-24 text-[10px] font-semibold text-right pr-3 shrink-0" style={{ color: classToTextColor(cm.cls) }}>
              {cm.cls} <span className="text-text-tertiary font-normal">({cm.count})</span>
            </span>
            <div className="flex-1 relative h-10 bg-gray-50 rounded border border-gray-100">
              {/* Grid lines */}
              {ticks.map(t => (
                <div key={t} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${((t - dataMin) / range) * 100}%` }} />
              ))}
              {/* IQR range band */}
              <div className="absolute top-1 bottom-1 rounded opacity-15" style={{
                left: `${((q1Val - dataMin) / range) * 100}%`,
                width: `${((q3Val - q1Val) / range) * 100}%`,
                backgroundColor: classToColor(cm.cls),
              }} />
              {/* Median line */}
              <div className="absolute top-0 h-full w-0.5 z-10" style={{
                left: `${((med - dataMin) / range) * 100}%`,
                backgroundColor: classToColor(cm.cls),
                opacity: 0.6,
              }} />
              {/* Student dots */}
              {classStudents.map((s, i) => {
                const leftPct = ((s.value - dataMin) / range) * 100
                // Jitter vertically to reduce overlap
                const jitter = classStudents.length > 1 ? ((i % 3) - 1) * 6 : 0
                return (
                  <div key={i} className="absolute group z-20" style={{ left: `${leftPct}%`, top: '50%', transform: `translate(-50%, calc(-50% + ${jitter}px))` }}>
                    <div className="w-2.5 h-2.5 rounded-full border border-white shadow-sm cursor-default" style={{ backgroundColor: classToColor(cm.cls) }} />
                    <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                      {s.name}: {s.value.toFixed(1)}%
                    </div>
                  </div>
                )
              })}
            </div>
            <span className="w-16 text-[10px] font-bold text-right pl-2 shrink-0" style={{ color: classToTextColor(cm.cls) }}>
              {med.toFixed(0)}%
            </span>
          </div>
        )
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 ml-24 text-[9px] text-text-tertiary">
        <span className="flex items-center gap-1"><span className="w-4 h-2 rounded bg-gray-300 opacity-30" /> Q1-Q3 range</span>
        <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-gray-400" /> Median</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Student</span>
      </div>
    </div>
  )
}

// ── NEW: Comprehension scatter ──────────────────────────────────
function CompScatter({ data }: { data: { studentId: string; cwpm: number; comp: number; compMax: number; cls: EnglishClass; name: string }[] }) {
  if (data.length === 0) return <p className="text-[11px] text-text-tertiary italic">No comprehension data available yet.</p>

  const maxCwpm = Math.max(...data.map(d => d.cwpm), 1)
  const xScale = maxCwpm * 1.1

  return (
    <div className="relative" style={{ height: '200px' }}>
      {[0, 25, 50, 75, 100].map(pct => (
        <div key={pct} className="absolute left-0 w-full border-b border-gray-100" style={{ bottom: `${pct}%` }}>
          <span className="absolute -left-1 -translate-x-full text-[8px] text-text-tertiary">{pct}%</span>
        </div>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <div key={pct} className="absolute bottom-0 h-full border-l border-gray-100" style={{ left: `${pct * 100}%` }}>
          <span className="absolute -bottom-4 -translate-x-1/2 text-[8px] text-text-tertiary">{Math.round(pct * xScale)}</span>
        </div>
      ))}
      {data.map((d, i) => {
        const x = (d.cwpm / xScale) * 100
        const y = d.compMax > 0 ? (d.comp / d.compMax) * 100 : 0
        return (
          <div key={i} className="absolute group" style={{ left: `${x}%`, bottom: `${y}%`, transform: 'translate(-50%, 50%)' }}>
            <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: classToColor(d.cls) }} />
            <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-navy text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
              {d.name} ({d.cls}): {d.cwpm} CWPM, {d.comp}/{d.compMax} comp ({d.compMax > 0 ? Math.round((d.comp / d.compMax) * 100) : 0}%)
            </div>
          </div>
        )
      })}
      <span className="absolute top-1 right-1 text-[8px] text-green-600 font-semibold opacity-60">Fast + Strong Comp</span>
      <span className="absolute top-1 left-8 text-[8px] text-amber-600 font-semibold opacity-60">Slow + Strong Comp</span>
      <span className="absolute bottom-5 right-1 text-[8px] text-amber-600 font-semibold opacity-60">Fast + Weak Comp</span>
      <span className="absolute bottom-5 left-8 text-[8px] text-red-600 font-semibold opacity-60">Needs Support</span>
    </div>
  )
}


// ── Main Component ─────────────────────────────────────────────────

function LevelingAnalytics({ levelTest }: { levelTest: LevelTest }) {
  const { showToast } = useApp()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [anecdotals, setAnecdotals] = useState<Record<string, any>>({})
  const [benchmarks, setBenchmarks] = useState<Record<string, any>>({})
  const [semGrades, setSemGrades] = useState<Record<string, any[]>>({})
  const [prevTest, setPrevTest] = useState<LevelTest | null>(null)
  const [prevScores, setPrevScores] = useState<Record<string, any>>({})
  const [activeSection, setActiveSection] = useState<'overview' | 'domains' | 'standards' | 'passages' | 'comprehension'>('overview')
  const WRITTEN_MC_TOTAL = getWrittenMcTotal(levelTest.grade)

  // Load data
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: sd }, { data: ad }, { data: bd }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
        supabase.from('class_benchmarks').select('*').eq('grade', levelTest.grade),
      ])
      if (studs) {
        setStudents(studs)
        const { data: sg } = await supabase.from('semester_grades').select('*, semesters(name, type)').in('student_id', studs.map((s: Student) => s.id))
        const sgm: Record<string, any[]> = {}; sg?.forEach((g: any) => { if (!sgm[g.student_id]) sgm[g.student_id] = []; sgm[g.student_id].push({ ...g, score: g.final_grade ?? g.calculated_grade ?? null, semester_name: g.semesters?.name || '' }) }); setSemGrades(sgm)
      }
      const sm: Record<string, any> = {}; sd?.forEach((s: any) => { sm[s.student_id] = s }); setScores(sm)
      const am: Record<string, any> = {}; ad?.forEach((a: any) => { am[a.student_id] = a }); setAnecdotals(am)
      const bm: Record<string, any> = {}; bd?.forEach((b: any) => { bm[b.english_class] = b }); setBenchmarks(bm)

      const { data: prevTests } = await supabase.from('level_tests').select('*')
        .eq('grade', levelTest.grade).neq('id', levelTest.id).order('created_at', { ascending: false }).limit(1)
      if (prevTests && prevTests.length > 0) {
        setPrevTest(prevTests[0])
        const { data: psd } = await supabase.from('level_test_scores').select('*').eq('level_test_id', prevTests[0].id)
        const psm: Record<string, any> = {}; psd?.forEach((s: any) => { psm[s.student_id] = s }); setPrevScores(psm)
      }

      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // ── Auto-benchmarks ────────────────────────────────────────────
  const autoBenchmarks = useMemo(() => {
    const ab: Record<string, { writing_median: number; mc_median: number; oral_median: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const classStudents = students.filter(s => s.english_class === cls)
      const writings: number[] = []; const mcs: number[] = []; const orals: number[] = []
      classStudents.forEach(s => {
        const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
        if (sc.writing != null) writings.push(sc.writing)
        if (sc.written_mc != null) mcs.push(sc.written_mc)
        const oral = calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
        if (oral != null) orals.push(oral)
      })
      ab[cls] = { writing_median: median(writings), mc_median: median(mcs), oral_median: median(orals) }
    })
    return ab
  }, [students, scores])

  // ── Compute class metrics ──────────────────────────────────────
  const { classMetrics, allComposites } = useMemo(() => {
    const metrics: ClassMetrics[] = []

    type RowData = { student: Student; oral: number | null; writing: number | null; mc: number | null; gradeAvg: number | null; anecAvg: number | null; composite: number; suggestedClass: EnglishClass }
    const allRows: RowData[] = []

    students.forEach(s => {
      const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
      const bench = benchmarks[s.english_class] || {}; const ab = autoBenchmarks[s.english_class] || {}
      const anec = anecdotals[s.id] || {}; const grades = semGrades[s.id] || []

      const oral = calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
      const writing = sc.writing ?? null
      const mcRaw = sc.written_mc ?? null

      const oralBench = bench.cwpm_end > 0 ? bench.cwpm_end : (ab.oral_median > 0 ? ab.oral_median : null)
      const oralRatio = oral != null && oralBench ? Math.min(oral / oralBench, 1.2) : null
      const writingRatio = writing != null ? writing / 20 : null
      const mcRatio = mcRaw != null ? mcRaw / WRITTEN_MC_TOTAL : null
      const wrAcc = sc.word_reading_correct != null && sc.word_reading_attempted > 0 ? sc.word_reading_correct / sc.word_reading_attempted : null

      const gv = grades.filter((g: any) => g.score != null && (g.semester_name?.toLowerCase().includes('fall') || g.semesters?.name?.toLowerCase().includes('fall') || g.semesters?.type?.startsWith('fall')))
      const gradeAvg = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length : null

      const av = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null) as number[]
      const anecScore = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / (av.length * 4) : 0.5
      const anecAvg = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / av.length : null

      const oralRatios2 = [oralRatio, wrAcc].filter(v => v != null) as number[]
      // Include comprehension in oral score (matching LevelingView composite)
      const compTotal = calc.comp_total != null && calc.comp_total > 0 ? calc.comp_total : null
      const compRatio = compTotal != null ? compTotal / (calc.comp_max || 15) : null
      if (compRatio != null) oralRatios2.push(compRatio)
      const oralScoreCalc = oralRatios2.length > 0 ? oralRatios2.reduce((a, b) => a + b, 0) / oralRatios2.length : null
      const hasAnec2 = av.length > 0
      const parts: { score: number; weight: number }[] = []
      if (oralScoreCalc != null) parts.push({ score: oralScoreCalc, weight: 0.40 })
      if (mcRatio != null) parts.push({ score: mcRatio, weight: 0.15 })
      if (writingRatio != null) parts.push({ score: writingRatio, weight: 0.35 })
      if (hasAnec2) parts.push({ score: anecScore, weight: 0.10 })
      let composite: number
      if (parts.length > 0) {
        const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
        composite = parts.reduce((s, p) => s + p.score * (p.weight / totalWeight), 0)
      } else {
        const testRatios = [oralRatio, writingRatio, mcRatio, wrAcc].filter(v => v != null) as number[]
        composite = testRatios.length > 0 ? testRatios.reduce((a, b) => a + b, 0) / testRatios.length : 0.5
      }

      allRows.push({ student: s, oral, writing, mc: mcRaw, gradeAvg, anecAvg, composite, suggestedClass: s.english_class as EnglishClass })
    })

    const sorted = [...allRows].sort((a, b) => a.composite - b.composite)
    sorted.forEach((row, idx) => {
      const sc = scores[row.student.id]?.raw_scores || {}
      if (sc.word_reading_correct != null && sc.word_reading_correct < 4) { row.suggestedClass = 'Lily'; return }
      if (sc.word_reading_correct != null && sc.word_reading_attempted > 0 && sc.word_reading_correct / sc.word_reading_attempted < 0.1) { row.suggestedClass = 'Lily'; return }
      const p = sorted.length > 1 ? idx / (sorted.length - 1) : 0.5
      row.suggestedClass = PLACEMENT_CLASSES[Math.min(Math.floor(p / (1 / PLACEMENT_CLASSES.length)), PLACEMENT_CLASSES.length - 1)]
    })

    // Save composites for histogram
    const allComposites = allRows.map(r => ({ value: r.composite * 100, cls: r.student.english_class as EnglishClass, name: r.student.english_name || r.student.korean_name }))

    ENGLISH_CLASSES.forEach(cls => {
      const classRows = allRows.filter(r => r.student.english_class === cls)
      if (classRows.length === 0) {
        metrics.push({ cls, count: 0, oral: computeStats([]), writing: computeStats([]), mc: computeStats([]), grades: computeStats([]), anecdotal: computeStats([]), composite: computeStats([]), stayCount: 0, moveUpCount: 0, moveDownCount: 0, movements: [] })
        return
      }

      const oralVals = classRows.map(r => r.oral).filter(v => v != null) as number[]
      const writingVals = classRows.map(r => r.writing).filter(v => v != null) as number[]
      const mcVals = classRows.map(r => r.mc).filter(v => v != null) as number[]
      const gradeVals = classRows.map(r => r.gradeAvg).filter(v => v != null) as number[]
      const anecVals = classRows.map(r => r.anecAvg).filter(v => v != null) as number[]
      const compositeVals = classRows.map(r => r.composite * 100)

      const movements: ClassMetrics['movements'] = []
      let stay = 0, up = 0, down = 0
      classRows.forEach(r => {
        if (r.suggestedClass === cls) stay++
        else {
          const fromIdx = PLACEMENT_CLASSES.indexOf(cls)
          const toIdx = PLACEMENT_CLASSES.indexOf(r.suggestedClass)
          if (toIdx > fromIdx) up++; else down++
          movements.push({ student: r.student, from: cls, to: r.suggestedClass, composite: r.composite * 100 })
        }
      })

      metrics.push({
        cls, count: classRows.length,
        oral: computeStats(oralVals), writing: computeStats(writingVals), mc: computeStats(mcVals),
        grades: computeStats(gradeVals), anecdotal: computeStats(anecVals), composite: computeStats(compositeVals),
        stayCount: stay, moveUpCount: up, moveDownCount: down, movements,
      })
    })

    return { classMetrics: metrics, allComposites }
  }, [students, scores, anecdotals, benchmarks, autoBenchmarks, semGrades, WRITTEN_MC_TOTAL])

  // ── All-student dots ──────────────────────────────────────────
  const allDots = useMemo(() => {
    return students.map(s => {
      const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
      return {
        student: s,
        oral: calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null,
        writing: sc.writing ?? null,
        mc: sc.written_mc ?? null,
      }
    })
  }, [students, scores])

  // ── Previous test comparison ───────────────────────────────────
  const prevClassMetrics = useMemo(() => {
    if (!prevTest || Object.keys(prevScores).length === 0) return null
    const result: Record<string, { oral: number | null; writing: number | null; mc: number | null }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const classStudents = students.filter(s => s.english_class === cls)
      const orals: number[] = []; const writings: number[] = []; const mcs: number[] = []
      classStudents.forEach(s => {
        const sc = prevScores[s.id]?.raw_scores || {}; const calc = prevScores[s.id]?.calculated_metrics || {}
        const oral = calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
        if (oral != null) orals.push(oral)
        if (sc.writing != null) writings.push(sc.writing)
        if (sc.written_mc != null) mcs.push(sc.written_mc)
      })
      result[cls] = {
        oral: orals.length > 0 ? median(orals) : null,
        writing: writings.length > 0 ? median(writings) : null,
        mc: mcs.length > 0 ? median(mcs) : null,
      }
    })
    return result
  }, [prevTest, prevScores, students])

  // ── Outlier detection ──────────────────────────────────────────
  const outliers = useMemo(() => {
    const flagged: { studentId: string; metric: string; value: number; classMedian: number }[] = []
    ENGLISH_CLASSES.forEach(cls => {
      const cm = classMetrics.find(m => m.cls === cls)
      if (!cm || cm.count < 3) return
      const oralReliable = cm.oral.values.length >= 3 && cm.oral.values.length >= cm.count * 0.5
      const writingReliable = cm.writing.values.length >= 3 && cm.writing.values.length >= cm.count * 0.5
      const mcReliable = cm.mc.values.length >= 3 && cm.mc.values.length >= cm.count * 0.5
      students.filter(s => s.english_class === cls).forEach(s => {
        const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
        const oral = calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
        if (oralReliable && oral != null && cm.oral.hasData && (oral === 0 || (cm.oral.median > 0 && oral < cm.oral.median * 0.1)))
          flagged.push({ studentId: s.id, metric: 'oral', value: oral, classMedian: cm.oral.median })
        if (writingReliable && sc.writing != null && cm.writing.hasData && (sc.writing === 0 || (cm.writing.median > 0 && sc.writing < cm.writing.median * 0.1)))
          flagged.push({ studentId: s.id, metric: 'writing', value: sc.writing, classMedian: cm.writing.median })
        if (mcReliable && sc.written_mc != null && cm.mc.hasData && (sc.written_mc === 0 || (cm.mc.median > 0 && sc.written_mc < cm.mc.median * 0.1)))
          flagged.push({ studentId: s.id, metric: 'mc', value: sc.written_mc, classMedian: cm.mc.median })
      })
    })
    return flagged
  }, [classMetrics, students, scores])

  // ── NEW: Written domain breakdown per class ────────────────────
  const domainBreakdown = useMemo(() => {
    const result: Record<string, { domains: Record<string, { correct: number; total: number; count: number }>; studentCount: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      result[cls] = { domains: {}, studentCount: 0 }
      const classStudents = students.filter(s => s.english_class === cls)
      classStudents.forEach(s => {
        const calc = scores[s.id]?.calculated_metrics || {}
        const ds = calc.written_domain_scores
        if (!ds) return
        result[cls].studentCount++
        Object.entries(ds).forEach(([domain, val]: [string, any]) => {
          if (!result[cls].domains[domain]) result[cls].domains[domain] = { correct: 0, total: 0, count: 0 }
          result[cls].domains[domain].correct += val.correct || 0
          result[cls].domains[domain].total += val.total || 0
          result[cls].domains[domain].count++
        })
      })
    })
    return result
  }, [students, scores])

  // ── NEW: Standards mastery aggregation ─────────────────────────
  const standardsBreakdown = useMemo(() => {
    const allStandards = new Set<string>()
    const perClass: Record<string, Record<string, { met: number; total: number; count: number }>> = {}

    ENGLISH_CLASSES.forEach(cls => {
      perClass[cls] = {}
      const classStudents = students.filter(s => s.english_class === cls)
      classStudents.forEach(s => {
        const calc = scores[s.id]?.calculated_metrics || {}
        const writtenSm = calc.written_standards_mastery || {}
        const oralSb = calc.standards_baseline || {}
        const combined: Record<string, { met: number; total: number }> = {}
        Object.entries(writtenSm).forEach(([std, val]: [string, any]) => {
          combined[std] = { met: val.met || 0, total: val.total || 0 }
        })
        Object.entries(oralSb).forEach(([std, val]: [string, any]) => {
          if (combined[std]) {
            combined[std].met += val.met || 0
            combined[std].total += val.total || 0
          } else {
            combined[std] = { met: val.met || 0, total: val.total || 0 }
          }
        })

        Object.entries(combined).forEach(([std, val]) => {
          allStandards.add(std)
          if (!perClass[cls][std]) perClass[cls][std] = { met: 0, total: 0, count: 0 }
          perClass[cls][std].met += val.met
          perClass[cls][std].total += val.total
          perClass[cls][std].count++
        })
      })
    })

    return { standards: [...allStandards].sort(), perClass }
  }, [students, scores])

  // ── NEW: Passage level distribution ───────────────────────────
  const passageDistribution = useMemo(() => {
    const result: Record<string, { counts: Record<string, number>; total: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      result[cls] = { counts: {}, total: 0 }
      const classStudents = students.filter(s => s.english_class === cls)
      classStudents.forEach(s => {
        const calc = scores[s.id]?.calculated_metrics || {}
        const pl = calc.passage_level
        if (pl) {
          const level = String(pl).toUpperCase()
          result[cls].counts[level] = (result[cls].counts[level] || 0) + 1
          result[cls].total++
        }
      })
    })
    return result
  }, [students, scores])

  // ── NEW: Comprehension data ───────────────────────────────────
  const compData = useMemo(() => {
    const data: { studentId: string; cwpm: number; comp: number; compMax: number; cls: EnglishClass; name: string }[] = []
    students.forEach(s => {
      const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
      const cwpm = calc.weighted_cwpm ?? calc.cwpm ?? sc.passage_cwpm ?? sc.orf_cwpm ?? null
      const comp = calc.comp_total
      const compMax = calc.comp_max || 15
      if (cwpm != null && comp != null) {
        data.push({ studentId: s.id, cwpm, comp, compMax, cls: s.english_class as EnglishClass, name: s.english_name || s.korean_name })
      }
    })
    return data
  }, [students, scores])

  // ── NEW: Per-class comprehension averages ─────────────────────
  const compByClass = useMemo(() => {
    const result: Record<string, { avg: number; count: number; values: number[] }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const classData = compData.filter(d => d.cls === cls)
      const pcts = classData.map(d => d.compMax > 0 ? (d.comp / d.compMax) * 100 : 0)
      result[cls] = { avg: pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0, count: pcts.length, values: pcts }
    })
    return result
  }, [compData])

  if (loading) return <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const totalStudents = students.length
  const totalMoving = classMetrics.reduce((sum, cm) => sum + cm.moveUpCount + cm.moveDownCount, 0)
  const totalStaying = classMetrics.reduce((sum, cm) => sum + cm.stayCount, 0)

  const allDomains = new Set<string>()
  Object.values(domainBreakdown).forEach(cd => Object.keys(cd.domains).forEach(d => allDomains.add(d)))
  const domainList = [...allDomains].sort()

  const hasDomainData = domainList.length > 0 && Object.values(domainBreakdown).some(cd => cd.studentCount > 0)
  const hasStandardsData = standardsBreakdown.standards.length > 0
  const hasPassageData = Object.values(passageDistribution).some(pd => pd.total > 0)
  const hasCompData = compData.length > 0

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3, always: true },
    { id: 'domains' as const, label: 'Domain Breakdown', icon: Layers, always: false, hasData: hasDomainData },
    { id: 'standards' as const, label: 'Standards Mastery', icon: Target, always: false, hasData: hasStandardsData },
    { id: 'passages' as const, label: 'Passage & Comprehension', icon: BookOpen, always: false, hasData: hasPassageData || hasCompData },
    { id: 'comprehension' as const, label: 'Score Distributions', icon: PieChart, always: true },
  ].filter(t => t.always || t.hasData)

  return (
    <div className="px-10 py-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-display text-lg font-semibold text-navy">Level Test Analytics</h3>
        <p className="text-[12px] text-text-secondary mt-1">
          Program-wide view of {totalStudents} students across {classMetrics.filter(cm => cm.count > 0).length} classes.
          Benchmarks are auto-calculated from class medians.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeSection === tab.id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt border border-border'}`}>
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Students Tested</p>
              <p className="text-[28px] font-bold text-navy mt-1">{totalStudents}</p>
              <p className="text-[11px] text-text-secondary">Grade {levelTest.grade}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Suggested to Stay</p>
              <p className="text-[28px] font-bold text-green-600 mt-1">{totalStaying}</p>
              <p className="text-[11px] text-text-secondary">{totalStudents > 0 ? Math.round(totalStaying / totalStudents * 100) : 0}% of students</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Suggested to Move</p>
              <p className="text-[28px] font-bold text-amber-600 mt-1">{totalMoving}</p>
              <p className="text-[11px] text-text-secondary">{totalStudents > 0 ? Math.round(totalMoving / totalStudents * 100) : 0}% of students</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Outliers Flagged</p>
              <p className="text-[28px] font-bold text-red-600 mt-1">{outliers.length}</p>
              <p className="text-[11px] text-text-secondary">Scores &lt;10% of class median</p>
            </div>
          </div>

          <SectionCard icon={BarChart3} title="Class Performance Overview"
            description="Median scores per class. Bars show the middle 50% range (Q1-Q3). Higher is better. Dashed markers show previous test medians when available.">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Oral (CWPM)</p>
                {classMetrics.filter(cm => cm.count > 0).map(cm => (
                  <ClassBar key={cm.cls + '-oral'} cls={cm.cls} stats={cm.oral} maxVal={Math.max(...classMetrics.map(m => m.oral.max || 0), 1)} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.oral ?? null} />
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Writing (/20)</p>
                {classMetrics.filter(cm => cm.count > 0).map(cm => (
                  <ClassBar key={cm.cls + '-writing'} cls={cm.cls} stats={cm.writing} maxVal={20} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.writing ?? null} />
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">MC (/{WRITTEN_MC_TOTAL})</p>
                {classMetrics.filter(cm => cm.count > 0).map(cm => (
                  <ClassBar key={cm.cls + '-mc'} cls={cm.cls} stats={cm.mc} maxVal={WRITTEN_MC_TOTAL} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.mc ?? null} />
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Target} title="Strengths & Growth Areas"
            description="Each cell shows the class median as a percentage of the benchmark. Green = meeting/exceeding. Amber = approaching. Red = below expectations.">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr>
                  <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Oral</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Writing</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">MC</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Grades</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Anecdotal</th>
                  <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Composite</th>
                </tr></thead>
                <tbody>{classMetrics.filter(cm => cm.count > 0).map(cm => {
                  const bench = benchmarks[cm.cls] || {}
                  const ab = autoBenchmarks[cm.cls] || {}
                  const oralBench = bench.cwpm_end > 0 ? bench.cwpm_end : (ab.oral_median > 0 ? ab.oral_median : null)
                  const oralPct = cm.oral.hasData && oralBench ? (cm.oral.median / oralBench) * 100 : null
                  const writingPct = cm.writing.hasData ? (cm.writing.median / 20) * 100 : null
                  const mcPct = cm.mc.hasData ? (cm.mc.median / WRITTEN_MC_TOTAL) * 100 : null
                  const gradePct = cm.grades.hasData ? cm.grades.median : null
                  const anecPct = cm.anecdotal.hasData ? (cm.anecdotal.median / 4) * 100 : null
                  const compPct = cm.composite.hasData ? cm.composite.median : null

                  return (
                    <tr key={cm.cls} className="border-t border-border">
                      <td className="px-3 py-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: classToColor(cm.cls) }} />{cm.cls} <span className="text-text-tertiary font-normal">({cm.count})</span></span></td>
                      <HeatmapCell value={oralPct} label={cm.oral.hasData ? `${Math.round(cm.oral.median)}` : '--'} />
                      <HeatmapCell value={writingPct} label={cm.writing.hasData ? `${cm.writing.median.toFixed(1)}` : '--'} />
                      <HeatmapCell value={mcPct} label={cm.mc.hasData ? `${cm.mc.median.toFixed(1)}` : '--'} />
                      <HeatmapCell value={gradePct} label={cm.grades.hasData ? `${cm.grades.median.toFixed(0)}%` : '--'} />
                      <HeatmapCell value={anecPct} label={cm.anecdotal.hasData ? `${cm.anecdotal.median.toFixed(1)}/4` : '--'} />
                      <HeatmapCell value={compPct} label={cm.composite.hasData ? `${cm.composite.median.toFixed(0)}` : '--'} />
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </SectionCard>

          {outliers.length > 0 && (
            <section className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-red-200">
                <h4 className="font-display text-[14px] font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={16} /> Outlier Flags</h4>
                <p className="text-[11px] text-red-600 mt-0.5">Scores significantly below class average -- below 10% of class median or zero. Could indicate data entry error, no-show, or student needing attention.</p>
              </div>
              <div className="p-5 space-y-1">
                {outliers.map((o, i) => {
                  const s = students.find(st => st.id === o.studentId)
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg text-[11px]">
                      <AlertTriangle size={12} className="text-red-500 shrink-0" />
                      <span className="font-medium text-navy w-40 truncate">{s?.english_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(s?.english_class as EnglishClass) + '40', color: classToTextColor(s?.english_class as EnglishClass) }}>{s?.english_class}</span>
                      <span className="text-text-secondary capitalize">{o.metric}:</span>
                      <span className="font-bold text-red-700">{o.value}</span>
                      <span className="text-text-tertiary">(class median: {Math.round(o.classMedian)})</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {prevTest && prevClassMetrics && (
            <SectionCard icon={TrendingUp} title="Growth Since Last Test"
              description={`Comparing class medians between ${prevTest.name} and this test. Arrows show direction and size of change.`}>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead><tr>
                    <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                    <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Oral (CWPM)</th>
                    <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Writing</th>
                    <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">MC</th>
                  </tr></thead>
                  <tbody>{classMetrics.filter(cm => cm.count > 0).map(cm => {
                    const prev = prevClassMetrics[cm.cls]
                    return (
                      <tr key={cm.cls} className="border-t border-border">
                        <td className="px-3 py-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: classToColor(cm.cls) }} />{cm.cls}</span></td>
                        <GrowthCell current={cm.oral.hasData ? cm.oral.median : null} previous={prev?.oral ?? null} />
                        <GrowthCell current={cm.writing.hasData ? cm.writing.median : null} previous={prev?.writing ?? null} />
                        <GrowthCell current={cm.mc.hasData ? cm.mc.median : null} previous={prev?.mc ?? null} />
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══════════════ DOMAIN BREAKDOWN TAB ═══════════════ */}
      {activeSection === 'domains' && (
        <div className="space-y-8">
          <SectionCard icon={Layers} title="Written Test Domain Breakdown"
            description="Shows how each class performed across different content domains on the written test. Each bar shows the class average percentage for that domain. This reveals whether low scores are across-the-board or concentrated in specific skill areas -- important for planning targeted review or reteaching.">
            {!hasDomainData ? (
              <p className="text-[11px] text-text-tertiary italic">No written domain data available yet. Domain scores appear after written tests are scored.</p>
            ) : (
              <div className="space-y-6">
                {classMetrics.filter(cm => cm.count > 0).map(cm => {
                  const cd = domainBreakdown[cm.cls]
                  if (!cd || cd.studentCount === 0) return null
                  return (
                    <div key={cm.cls}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: classToColor(cm.cls) }} />
                        <span className="text-[12px] font-semibold text-navy">{cm.cls}</span>
                        <span className="text-[10px] text-text-tertiary">({cd.studentCount} students with data)</span>
                      </div>
                      <div className="space-y-1.5 ml-5">
                        {domainList.map(domain => {
                          const d = cd.domains[domain]
                          if (!d || d.count === 0) return null
                          const pct = d.total > 0 ? (d.correct / d.total) * 100 : 0
                          return <DomainMiniBar key={domain} domain={domain} pct={pct} count={d.count} />
                        })}
                      </div>
                    </div>
                  )
                })}

                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-[11px] font-semibold text-navy mb-3">Cross-Class Domain Comparison</p>
                  <p className="text-[10px] text-text-secondary mb-3">
                    Green = strong (80%+). Red = struggling (&lt;50%). If a column is consistently red across all classes, the curriculum may need more emphasis there.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead><tr>
                        <th className="text-left px-2 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                        {domainList.map(d => (
                          <th key={d} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold whitespace-nowrap">{d}</th>
                        ))}
                      </tr></thead>
                      <tbody>{classMetrics.filter(cm => cm.count > 0).map(cm => {
                        const cd = domainBreakdown[cm.cls]
                        return (
                          <tr key={cm.cls} className="border-t border-border">
                            <td className="px-2 py-2 font-semibold"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: classToColor(cm.cls) }} />{cm.cls}</span></td>
                            {domainList.map(domain => {
                              const d = cd?.domains[domain]
                              if (!d || d.count === 0) return <td key={domain} className="px-2 py-2 text-center text-text-tertiary text-[10px]">--</td>
                              const pct = d.total > 0 ? (d.correct / d.total) * 100 : 0
                              return <HeatmapCell key={domain} value={pct} label={`${Math.round(pct)}%`} />
                            })}
                          </tr>
                        )
                      })}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ═══════════════ STANDARDS MASTERY TAB ═══════════════ */}
      {activeSection === 'standards' && (
        <div className="space-y-8">
          <SectionCard icon={Target} title="Standards Mastery by Class"
            description="Percentage of students in each class meeting mastery on each CCSS standard tested. Combines written and oral test data. Red cells indicate instructional gaps. If even higher classes show low mastery, the standard may need more curriculum time or the test items may need calibration.">
            {!hasStandardsData ? (
              <p className="text-[11px] text-text-tertiary italic">No standards data available yet. Standards mastery appears after tests are scored.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead><tr>
                    <th className="text-left px-2 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface z-10">Standard</th>
                    {classMetrics.filter(cm => cm.count > 0).map(cm => (
                      <th key={cm.cls} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider font-semibold" style={{ color: classToTextColor(cm.cls) }}>{cm.cls}</th>
                    ))}
                    <th className="text-center px-2 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Grade Avg</th>
                  </tr></thead>
                  <tbody>{standardsBreakdown.standards.map(std => {
                    let totalMet = 0; let totalTotal = 0
                    classMetrics.filter(cm => cm.count > 0).forEach(cm => {
                      const d = standardsBreakdown.perClass[cm.cls]?.[std]
                      if (d) { totalMet += d.met; totalTotal += d.total }
                    })
                    const gradeAvg = totalTotal > 0 ? (totalMet / totalTotal) * 100 : null

                    return (
                      <tr key={std} className="border-t border-border hover:bg-surface-alt">
                        <td className="px-2 py-2 font-mono text-[10px] font-medium text-navy sticky left-0 bg-surface z-10 whitespace-nowrap">{std}</td>
                        {classMetrics.filter(cm => cm.count > 0).map(cm => {
                          const d = standardsBreakdown.perClass[cm.cls]?.[std]
                          if (!d || d.count === 0) return <td key={cm.cls} className="px-2 py-2 text-center text-text-tertiary">--</td>
                          return <StandardsMasteryCell key={cm.cls} met={d.met} total={d.total} />
                        })}
                        <td className="px-2 py-2 text-center">
                          {gradeAvg != null ? (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${gradeAvg >= 80 ? 'bg-green-100 text-green-700' : gradeAvg >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {Math.round(gradeAvg)}%
                            </span>
                          ) : '--'}
                        </td>
                      </tr>
                    )
                  })}</tbody>
                </table>

                <div className="flex items-center gap-4 mt-4 text-[10px] text-text-secondary">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> 80%+ Mastery</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100" /> 60-79% Approaching</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> Below 60%</span>
                </div>

                {(() => {
                  const weakStandards = standardsBreakdown.standards.filter(std => {
                    let totalMet = 0; let totalTotal = 0
                    classMetrics.filter(cm => cm.count > 0).forEach(cm => {
                      const d = standardsBreakdown.perClass[cm.cls]?.[std]
                      if (d) { totalMet += d.met; totalTotal += d.total }
                    })
                    return totalTotal > 0 && (totalMet / totalTotal) < 0.6
                  })
                  if (weakStandards.length === 0) return null
                  return (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-[11px] font-semibold text-amber-800">Program-Wide Gaps</p>
                      <p className="text-[10px] text-amber-700 mt-1">
                        These standards are below 60% mastery grade-wide: {weakStandards.join(', ')}. Consider whether these need more instructional time or whether the test questions need calibration.
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ═══════════════ PASSAGE & COMPREHENSION TAB ═══════════════ */}
      {activeSection === 'passages' && (
        <div className="space-y-8">
          {hasPassageData && (
            <SectionCard icon={BookOpen} title="Passage Level Distribution"
              description="Shows which reading passages (A through E) students were tested on in the oral test. Lower classes should cluster around A-B, while higher classes should be at D-E. A wide spread within one class suggests a bigger range of reading levels than expected -- worth noting for differentiation.">
              <div>
                {classMetrics.filter(cm => cm.count > 0).map(cm => {
                  const pd = passageDistribution[cm.cls]
                  if (!pd || pd.total === 0) return null
                  return <PassageDistributionBar key={cm.cls} cls={cm.cls} counts={pd.counts} total={pd.total} />
                })}
                <div className="flex items-center gap-3 mt-4 text-[10px] text-text-secondary">
                  {PASSAGE_LEVELS.map(level => {
                    const colors: Record<string, string> = { A: '#EF4444', B: '#F97316', C: '#EAB308', D: '#22C55E', E: '#3B82F6' }
                    return (
                      <span key={level} className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: colors[level] }} />
                        Passage {level}
                      </span>
                    )
                  })}
                </div>
              </div>
            </SectionCard>
          )}

          {hasCompData && (
            <SectionCard icon={FileText} title="Fluency vs. Comprehension"
              description="Each dot is a student. X-axis = oral reading speed (CWPM), Y-axis = comprehension percentage. Top-right = strong reader with strong understanding. Bottom-right = reads fast but doesn't understand (word-calling). Top-left = reads slowly but understands (needs fluency practice, not comprehension support).">
              <CompScatter data={compData} />
              <div className="h-6" />
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[11px] font-semibold text-navy mb-2">Comprehension Averages by Class</p>
                {classMetrics.filter(cm => cm.count > 0).map(cm => {
                  const cc = compByClass[cm.cls]
                  if (!cc || cc.count === 0) return null
                  const pct = cc.avg
                  let barColor = '#EF4444'
                  if (pct >= 80) barColor = '#22C55E'
                  else if (pct >= 65) barColor = '#EAB308'
                  else if (pct >= 50) barColor = '#F97316'
                  return (
                    <div key={cm.cls} className="flex items-center gap-2 mb-1.5">
                      <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(cm.cls) }}>{cm.cls}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                      </div>
                      <span className="w-14 text-[10px] font-bold text-right" style={{ color: barColor }}>{Math.round(pct)}%</span>
                      <span className="w-10 text-[8px] text-text-tertiary text-right">n={cc.count}</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      {/* ═══════════════ SCORE DISTRIBUTIONS TAB ═══════════════ */}
      {activeSection === 'comprehension' && (
        <div className="space-y-8">
          <SectionCard icon={PieChart} title="Composite Score Distribution"
            description="Each row is a class. Dots show individual student composite scores on a shared 0-100 scale. The shaded band is the Q1-Q3 range (middle 50%) and the vertical line is the median. Look for overlap between classes -- students in the overlap zone are borderline cases worth discussing. Wide spreads within a class suggest mixed ability levels.">
            <CompositeStripPlot data={allComposites} classMetrics={classMetrics} />
          </SectionCard>

          <SectionCard icon={BarChart3} title="Component Score Distributions"
            description="Each dot is one student, color-coded by current class. Clusters and gaps reveal where students naturally group -- useful for identifying borderline cases and class boundaries.">
            <div className="space-y-6">
              <DotPlot title="Oral (CWPM)" data={allDots.map(d => ({ value: d.oral, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={null} outliers={outliers.filter(o => o.metric === 'oral')} students={students} />
              <DotPlot title="Writing (/20)" data={allDots.map(d => ({ value: d.writing, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={20} outliers={outliers.filter(o => o.metric === 'writing')} students={students} />
              <DotPlot title={`MC (/${WRITTEN_MC_TOTAL})`} data={allDots.map(d => ({ value: d.mc, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={WRITTEN_MC_TOTAL} outliers={outliers.filter(o => o.metric === 'mc')} students={students} />
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

export default LevelingAnalytics
