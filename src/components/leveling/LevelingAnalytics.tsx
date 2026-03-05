'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────

function getWrittenMcTotal(grade: number | string): number {
  // DOK-weighted: DOK1=1pt, DOK2+=2pt
  const g = Number(grade)
  if (g === 2) return 32; if (g === 3) return 26; if (g === 4) return 40; if (g === 5) return 28
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
  const lower = sorted.slice(0, mid)
  return median(lower)
}

function q3(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const upper = sorted.slice(sorted.length % 2 !== 0 ? mid + 1 : mid)
  return median(upper)
}

// Suggest class from composite rank (mirrors LevelingView logic)
const PLACEMENT_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

// ── Types ──────────────────────────────────────────────────────────

interface ClassMetrics {
  cls: EnglishClass
  count: number
  oral: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  writing: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  mc: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  grades: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  anecdotal: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  composite: { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean }
  stayCount: number; moveUpCount: number; moveDownCount: number
  movements: { student: Student; from: EnglishClass; to: EnglishClass; composite: number }[]
}

function computeStats(values: number[]): { median: number; q1: number; q3: number; min: number; max: number; values: number[]; hasData: boolean } {
  if (values.length === 0) return { median: 0, q1: 0, q3: 0, min: 0, max: 0, values: [], hasData: false }
  return { median: median(values), q1: q1(values), q3: q3(values), min: Math.min(...values), max: Math.max(...values), values, hasData: true }
}

// ── Main Component ─────────────────────────────────────────────────


function ClassBar({ cls, stats, maxVal, unit, prevMedian }: { cls: EnglishClass; stats: ClassMetrics['oral']; maxVal: number; unit: string; prevMedian: number | null }) {
  if (!stats.hasData) return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-20 text-[10px] font-semibold text-right" style={{ color: classToTextColor(cls) }}>{cls}</span>
      <span className="text-[10px] text-text-tertiary italic">No data</span>
    </div>
  )

  const scale = maxVal > 0 ? maxVal : stats.max
  const barMax = scale > 0 ? scale * 1.1 : 1 // add 10% headroom
  const q1Pct = (stats.q1 / barMax) * 100
  const q3Pct = (stats.q3 / barMax) * 100
  const medPct = (stats.median / barMax) * 100

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-20 text-[10px] font-semibold text-right shrink-0" style={{ color: classToTextColor(cls) }}>{cls}</span>
      <div className="flex-1 h-5 relative bg-gray-100 rounded-full overflow-hidden">
        {/* Q1-Q3 range */}
        <div className="absolute h-full rounded-full opacity-30" style={{ left: `${q1Pct}%`, width: `${q3Pct - q1Pct}%`, backgroundColor: classToColor(cls) }} />
        {/* Median marker */}
        <div className="absolute h-full w-1 rounded-full" style={{ left: `${medPct}%`, backgroundColor: classToColor(cls) }} />
        {/* Previous median marker */}
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
  if (value == null) return <td className="px-3 py-2.5 text-center text-text-tertiary">—</td>
  // Color scale: <50 red, 50-70 amber, 70-90 green, >90 deep green
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
      <div className="relative h-12 bg-gray-50 rounded-lg border border-border overflow-hidden">
        {/* Axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <div key={pct} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${pct * 100}%` }}>
            <span className="absolute -bottom-4 -translate-x-1/2 text-[8px] text-text-tertiary">{Math.round(pct * scale)}</span>
          </div>
        ))}
        {/* Dots */}
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
      <div className="h-5" /> {/* Space for axis labels */}
    </div>
  )
}

function GrowthCell({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null && previous == null) return <><td className="px-3 py-2.5 text-center text-text-tertiary" colSpan={1}>—</td></>
  if (current == null) return <><td className="px-3 py-2.5 text-center text-text-tertiary" colSpan={1}>— <span className="text-[9px]">(was {Math.round(previous!)})</span></td></>
  if (previous == null) return <><td className="px-3 py-2.5 text-center font-bold text-navy" colSpan={1}>{Math.round(current)} <span className="text-[9px] text-text-tertiary font-normal">new</span></td></>

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



// ── Sub-components ─────────────────────────────────────────────────

export default function LevelingAnalytics({ levelTest }: { levelTest: LevelTest }) {
  const { showToast } = useApp()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [anecdotals, setAnecdotals] = useState<Record<string, any>>({})
  const [benchmarks, setBenchmarks] = useState<Record<string, any>>({})
  const [semGrades, setSemGrades] = useState<Record<string, any[]>>({})
  const [prevTest, setPrevTest] = useState<LevelTest | null>(null)
  const [prevScores, setPrevScores] = useState<Record<string, any>>({})
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

      // Load previous test for comparison
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

  // ── Compute auto-benchmarks (class medians) ────────────────────
  const autoBenchmarks = useMemo(() => {
    const ab: Record<string, { writing_median: number; mc_median: number; oral_median: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const classStudents = students.filter(s => s.english_class === cls)
      const writings: number[] = []; const mcs: number[] = []; const orals: number[] = []
      classStudents.forEach(s => {
        const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
        if (sc.writing != null) writings.push(sc.writing)
        if (sc.written_mc != null) mcs.push(sc.written_mc)
        const oral = sc.passage_cwpm ?? sc.orf_cwpm ?? calc.weighted_cwpm ?? calc.cwpm ?? null
        if (oral != null) orals.push(oral)
      })
      ab[cls] = { writing_median: median(writings), mc_median: median(mcs), oral_median: median(orals) }
    })
    return ab
  }, [students, scores])

  // ── Compute rows with auto-benchmarks ──────────────────────────
  const classMetrics = useMemo(() => {
    const metrics: ClassMetrics[] = []

    // Compute all composites first for ranking
    type RowData = { student: Student; oral: number | null; writing: number | null; mc: number | null; gradeAvg: number | null; anecAvg: number | null; composite: number; suggestedClass: EnglishClass }
    const allRows: RowData[] = []

    students.forEach(s => {
      const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
      const bench = benchmarks[s.english_class] || {}; const ab = autoBenchmarks[s.english_class] || {}
      const anec = anecdotals[s.id] || {}; const grades = semGrades[s.id] || []

      const oral = sc.passage_cwpm ?? sc.orf_cwpm ?? calc.weighted_cwpm ?? calc.cwpm ?? null
      const writing = sc.writing ?? null
      const mcRaw = sc.written_mc ?? null

      // Benchmark-relative ratios with auto-benchmark fallback
      const oralBench = bench.cwpm_end > 0 ? bench.cwpm_end : (ab.oral_median > 0 ? ab.oral_median : null)
      const writingBench = bench.writing_end > 0 ? bench.writing_end : (ab.writing_median > 0 ? ab.writing_median : null)
      const mcBench = ab.mc_median > 0 ? ab.mc_median : null

      const oralRatio = oral != null && oralBench ? oral / oralBench : null
      const writingRatio = writing != null && writingBench ? writing / writingBench : null
      const mcRatio = mcRaw != null && mcBench ? mcRaw / mcBench : (mcRaw != null ? mcRaw / WRITTEN_MC_TOTAL : null)
      const wrAcc = sc.word_reading_correct != null && sc.word_reading_attempted > 0 ? sc.word_reading_correct / sc.word_reading_attempted : null

      const testRatios = [oralRatio, writingRatio, mcRatio, wrAcc].filter(v => v != null) as number[]
      const testScore = testRatios.length > 0 ? testRatios.reduce((a, b) => a + b, 0) / testRatios.length : 0.5

      const gv = grades.filter((g: any) => g.score != null && (g.semester_name?.toLowerCase().includes('fall') || g.semesters?.name?.toLowerCase().includes('fall') || g.semesters?.type?.startsWith('fall')))
      const gradeScore = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length / 100 : null
      const gradeAvg = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length : null

      const av = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null) as number[]
      const anecScore = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / (av.length * 4) : 0.5
      const anecAvg = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / av.length : null

      const hasGrades = gradeScore != null
      const gScore = gradeScore ?? 0.5
      const composite = hasGrades ? testScore * 0.30 + gScore * 0.40 + anecScore * 0.30 : testScore * 0.80 + anecScore * 0.20

      allRows.push({ student: s, oral, writing, mc: mcRaw, gradeAvg, anecAvg, composite, suggestedClass: s.english_class as EnglishClass })
    })

    // Rank and suggest placements
    const sorted = [...allRows].sort((a, b) => a.composite - b.composite)
    sorted.forEach((row, idx) => {
      const sc = scores[row.student.id]?.raw_scores || {}
      if (sc.word_reading_correct != null && sc.word_reading_correct < 4) { row.suggestedClass = 'Lily'; return }
      if (sc.word_reading_correct != null && sc.word_reading_attempted > 0 && sc.word_reading_correct / sc.word_reading_attempted < 0.1) { row.suggestedClass = 'Lily'; return }
      const p = sorted.length > 1 ? idx / (sorted.length - 1) : 0.5
      row.suggestedClass = PLACEMENT_CLASSES[Math.min(Math.floor(p / (1 / PLACEMENT_CLASSES.length)), PLACEMENT_CLASSES.length - 1)]
    })

    // Build per-class metrics
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

      // Movement analysis
      const movements: ClassMetrics['movements'] = []
      let stay = 0, up = 0, down = 0
      classRows.forEach(r => {
        if (r.suggestedClass === cls) stay++
        else {
          const fromIdx = PLACEMENT_CLASSES.indexOf(cls)
          const toIdx = PLACEMENT_CLASSES.indexOf(r.suggestedClass)
          if (toIdx > fromIdx) up++
          else down++
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

    return metrics
  }, [students, scores, anecdotals, benchmarks, autoBenchmarks, semGrades, WRITTEN_MC_TOTAL])

  // ── All-student dots for distributions ─────────────────────────
  const allDots = useMemo(() => {
    return students.map(s => {
      const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
      return {
        student: s,
        oral: sc.passage_cwpm ?? sc.orf_cwpm ?? calc.weighted_cwpm ?? calc.cwpm ?? null,
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
        const oral = sc.passage_cwpm ?? sc.orf_cwpm ?? calc.weighted_cwpm ?? calc.cwpm ?? null
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
      // Only flag outliers for a component when >=50% of class has data (prevents false positives during incomplete test phases)
      const oralReliable = cm.oral.values.length >= 3 && cm.oral.values.length >= cm.count * 0.5
      const writingReliable = cm.writing.values.length >= 3 && cm.writing.values.length >= cm.count * 0.5
      const mcReliable = cm.mc.values.length >= 3 && cm.mc.values.length >= cm.count * 0.5
      students.filter(s => s.english_class === cls).forEach(s => {
        const sc = scores[s.id]?.raw_scores || {}; const calc = scores[s.id]?.calculated_metrics || {}
        const oral = sc.passage_cwpm ?? sc.orf_cwpm ?? calc.weighted_cwpm ?? calc.cwpm ?? null
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

  if (loading) return <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const totalStudents = students.length
  const totalMoving = classMetrics.reduce((sum, cm) => sum + cm.moveUpCount + cm.moveDownCount, 0)
  const totalStaying = classMetrics.reduce((sum, cm) => sum + cm.stayCount, 0)

  return (
    <div className="px-10 py-6 space-y-8">
      {/* Header */}
      <div>
        <h3 className="font-display text-lg font-semibold text-navy">Level Test Analytics</h3>
        <p className="text-[12px] text-text-secondary mt-1">
          Program-wide view of {totalStudents} students across {classMetrics.filter(cm => cm.count > 0).length} classes.
          Benchmarks are auto-calculated from class medians — the midpoint of each class's scores.
        </p>
      </div>

      {/* ── 1. Quick Summary Cards ────────────────────────────────── */}
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

      {/* ── 2. Class Performance Overview ─────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-display text-[14px] font-semibold text-navy flex items-center gap-2"><BarChart3 size={16} /> Class Performance Overview</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">Median scores per class. Bars show the middle 50% range (Q1–Q3). Higher is better.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-6">
            {/* Oral */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Oral (CWPM)</p>
              {classMetrics.filter(cm => cm.count > 0).map(cm => (
                <ClassBar key={cm.cls + '-oral'} cls={cm.cls} stats={cm.oral} maxVal={Math.max(...classMetrics.map(m => m.oral.max || 0), 1)} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.oral ?? null} />
              ))}
            </div>
            {/* Writing */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Writing (/20)</p>
              {classMetrics.filter(cm => cm.count > 0).map(cm => (
                <ClassBar key={cm.cls + '-writing'} cls={cm.cls} stats={cm.writing} maxVal={20} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.writing ?? null} />
              ))}
            </div>
            {/* MC */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">MC (/{WRITTEN_MC_TOTAL})</p>
              {classMetrics.filter(cm => cm.count > 0).map(cm => (
                <ClassBar key={cm.cls + '-mc'} cls={cm.cls} stats={cm.mc} maxVal={WRITTEN_MC_TOTAL} unit="" prevMedian={prevClassMetrics?.[cm.cls]?.mc ?? null} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Domain Breakdown Heatmap ──────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-display text-[14px] font-semibold text-navy">Strengths & Growth Areas</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Each cell shows the class median as a percentage of the benchmark. Green = meeting or exceeding expectations. Amber = approaching. Red = below expectations. This helps identify which skills need more instructional focus next semester.
          </p>
        </div>
        <div className="p-5 overflow-x-auto">
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
              // For heatmap: normalize scores to 0-100 scale relative to "good" performance
              // Oral: use CWPM benchmark or auto-benchmark
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
                  <HeatmapCell value={oralPct} label={cm.oral.hasData ? `${Math.round(cm.oral.median)}` : '—'} />
                  <HeatmapCell value={writingPct} label={cm.writing.hasData ? `${cm.writing.median.toFixed(1)}` : '—'} />
                  <HeatmapCell value={mcPct} label={cm.mc.hasData ? `${cm.mc.median.toFixed(1)}` : '—'} />
                  <HeatmapCell value={gradePct} label={cm.grades.hasData ? `${cm.grades.median.toFixed(0)}%` : '—'} />
                  <HeatmapCell value={anecPct} label={cm.anecdotal.hasData ? `${cm.anecdotal.median.toFixed(1)}/4` : '—'} />
                  <HeatmapCell value={compPct} label={cm.composite.hasData ? `${cm.composite.median.toFixed(0)}` : '—'} />
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </section>

      {/* ── 4. Movement Summary ──────────────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-display text-[14px] font-semibold text-navy">Movement Summary</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Suggested level changes based on composite scores. This is the starting point for discussion at the leveling meeting — the numbers make a suggestion, teachers make the decision.
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-6 gap-3 mb-6">
            {classMetrics.filter(cm => cm.count > 0).map(cm => (
              <div key={cm.cls} className="bg-surface-alt rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: classToColor(cm.cls) }} />
                  <span className="text-[12px] font-semibold text-navy">{cm.cls}</span>
                </div>
                <p className="text-[10px] text-text-tertiary">{cm.count} students</p>
                <div className="flex justify-center gap-3 mt-2">
                  {cm.moveDownCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600"><TrendingDown size={10} />{cm.moveDownCount}</span>}
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600"><Minus size={10} />{cm.stayCount}</span>
                  {cm.moveUpCount > 0 && <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600"><TrendingUp size={10} />{cm.moveUpCount}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Movement details */}
          {classMetrics.some(cm => cm.movements.length > 0) && (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Suggested Moves</p>
              {classMetrics.flatMap(cm => cm.movements).sort((a, b) => b.composite - a.composite).map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-surface-alt text-[11px]">
                  <span className="font-medium text-navy w-40 truncate">{m.student.english_name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(m.from) + '40', color: classToTextColor(m.from) }}>{m.from}</span>
                  <ArrowRight size={12} className="text-text-tertiary" />
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(m.to) + '40', color: classToTextColor(m.to) }}>{m.to}</span>
                  <span className="text-text-tertiary ml-auto text-[10px]">Composite: {m.composite.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Score Distributions ───────────────────────────────── */}
      <section className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-display text-[14px] font-semibold text-navy">Score Distributions</h4>
          <p className="text-[11px] text-text-secondary mt-0.5">
            Each dot is one student, color-coded by current class. Clusters and gaps reveal where students naturally group — useful for identifying borderline cases and class boundaries.
          </p>
        </div>
        <div className="p-5 space-y-6">
          <DotPlot title="Oral (CWPM)" data={allDots.map(d => ({ value: d.oral, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={null} outliers={outliers.filter(o => o.metric === 'oral')} students={students} />
          <DotPlot title="Writing (/20)" data={allDots.map(d => ({ value: d.writing, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={20} outliers={outliers.filter(o => o.metric === 'writing')} students={students} />
          <DotPlot title={`MC (/${WRITTEN_MC_TOTAL})`} data={allDots.map(d => ({ value: d.mc, cls: d.student.english_class as EnglishClass, name: d.student.english_name }))} maxVal={WRITTEN_MC_TOTAL} outliers={outliers.filter(o => o.metric === 'mc')} students={students} />
        </div>
      </section>

      {/* ── 6. Outlier Flags ─────────────────────────────────────── */}
      {outliers.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200">
            <h4 className="font-display text-[14px] font-semibold text-red-700 flex items-center gap-2"><AlertTriangle size={16} /> Outlier Flags</h4>
            <p className="text-[11px] text-red-600 mt-0.5">
              These scores are significantly below their class average — either below 10% of the class median or zero. This could indicate a data entry error, a no-show, or a student who genuinely needs attention.
            </p>
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

      {/* ── 7. Test-Over-Test Comparison ─────────────────────────── */}
      {prevTest && prevClassMetrics && (
        <section className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h4 className="font-display text-[14px] font-semibold text-navy">Growth Since Last Test</h4>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Comparing class medians between <span className="font-semibold">{prevTest.name}</span> and this test. Arrows show the direction and size of change.
            </p>
          </div>
          <div className="p-5 overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr>
                <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold" colSpan={2}>Oral (CWPM)</th>
                <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold" colSpan={2}>Writing</th>
                <th className="text-center px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold" colSpan={2}>MC</th>
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
        </section>
      )}
    </div>
  )
}
