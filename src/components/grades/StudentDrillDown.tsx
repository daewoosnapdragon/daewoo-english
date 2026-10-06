'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { DOMAINS, DOMAIN_LABELS, type QuestionMapItem } from '@/types'
import { calculateWeightedAverage, domainLabel, percentToLetter, type AssessmentType } from '@/lib/utils'
import { useAssessmentWeights, weightsFor } from '@/lib/assessmentWeights'
import { itemsForDomain, touchesDomain, domainForStandard } from '@/lib/domainSplit'
import { DOMAIN_COLOR, domainColor, domainShort, domainTint } from '@/lib/domainTone'
import { Sparkline } from '@/components/charts'
import { plainName } from '@/components/curriculum/standards-plain'
import WIDABadge from '@/components/shared/WIDABadge'
import { ChevronDown, ChevronRight, ChevronLeft, ExternalLink, Loader2, Printer, Search } from 'lucide-react'

// ─── Student drill-down ──────────────────────────────────────────
// One student's grades for the semester, read the way a teacher reads them:
// a roster rail to move between students, a header that says how the
// student is doing in each domain, a timeline of every score against the
// class, notes worth a look, what is still unmarked, one aligned table with
// the weighting behind each domain average, the standards the student has
// met or missed from their answer sheets, and what the report card will say.
// Every number comes from the same split and weighting the report card uses.

interface Assessment {
  id: string; name: string; domain: string; max_score: number; type: string; date: string | null; created_at: string
  question_map?: QuestionMapItem[] | null; mixed?: boolean; domain_split?: Record<string, number> | null
}
interface StudentRow { id: string; english_name: string; korean_name: string; photo_url?: string }
interface GradeRow { student_id: string; assessment_id: string; score: number | null; is_absent?: boolean; is_exempt?: boolean; domain_scores?: Record<string, number> | null; item_responses?: any[] | null }
type Lang = 'en' | 'ko'
type Bands = { above: number; on: number; approaching: number }

interface Props {
  allAssessments: Assessment[]
  students: StudentRow[]
  selectedStudentId: string | null
  setSelectedStudentId: (id: string | null) => void
  selectedGrade: number
  selectedClass: string
  selectedSemester: string | null
  lang: Lang
  /** Open the scoring sheet on an assessment (for the "not yet scored" list). */
  onOpenAssessment?: (a: Assessment) => void
}

type Row = {
  key: string; a: Assessment; domain: string; name: string; date: string | null
  score: number | null; max: number; pct: number | null
  classPct: number | null; classVals: { id: string; v: number }[]
  flag: 'absent' | 'exempt' | null
  whole?: { score: number | null; max: number; pct: number | null; classPct: number | null } | null
}

export const fmtPts = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
const pct1 = (v: number | null | undefined) => v == null ? '—' : `${v.toFixed(1)}%`
const sortKey = (a: Assessment) => `${a.date || '9999'}|${a.created_at || ''}`
const typeLabel = (t: string, ko: boolean) => t === 'summative' ? (ko ? '총괄' : 'tests') : t === 'performance_task' ? (ko ? '수행' : 'performance tasks') : (ko ? '형성' : 'quizzes & classwork')

export default function StudentDrillDown({ allAssessments, students, selectedStudentId, setSelectedStudentId, selectedGrade, selectedClass, selectedSemester, lang, onOpenAssessment }: Props) {
  const ko = lang === 'ko'
  const { navigateTo, visibleSemesters } = useApp()
  const weightTable = useAssessmentWeights()
  const [classGrades, setClassGrades] = useState<GradeRow[]>([])
  const [mine, setMine] = useState<Record<string, GradeRow>>({})
  const [semRows, setSemRows] = useState<{ domain: string; calculated_grade: number | null; final_grade: number | null; is_overridden?: boolean }[]>([])
  const [prevRows, setPrevRows] = useState<{ domain: string; calculated_grade: number | null; final_grade: number | null }[]>([])
  const [reading, setReading] = useState<{ cwpm: number | null; level: string | null } | null>(null)
  const [bands, setBands] = useState<Bands>({ above: 86, on: 71, approaching: 61 })
  const [loadingClass, setLoadingClass] = useState(false)
  const [loadingMine, setLoadingMine] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [showWhy, setShowWhy] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState('')
  const railRef = useRef<HTMLDivElement>(null)

  const selected = students.find(s => s.id === selectedStudentId) || null
  const grade = Number(selectedGrade || 3)
  const prevSemester = useMemo(() => {
    // Semesters come newest first; the one after the selected one is the previous term.
    const i = visibleSemesters.findIndex(s => s.id === selectedSemester)
    return i >= 0 ? visibleSemesters[i + 1] || null : null
  }, [visibleSemesters, selectedSemester])

  // ── Class-wide grades (for the rail, the class averages and the position strips) ──
  useEffect(() => {
    if (allAssessments.length === 0) { setClassGrades([]); return }
    let cancelled = false
    ;(async () => {
      setLoadingClass(true)
      const { data } = await supabase.from('grades').select('student_id, assessment_id, score, is_absent, is_exempt, domain_scores').in('assessment_id', allAssessments.map(a => a.id)).not('score', 'is', null)
      if (cancelled) return
      setClassGrades((data || []) as GradeRow[]); setLoadingClass(false)
    })()
    return () => { cancelled = true }
  }, [allAssessments])

  // ── Mastery bands, same setting the analysis view reads ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
        if (!cancelled && data?.value) { const saved = JSON.parse(data.value); if (saved[selectedClass]?.above != null) setBands(saved[selectedClass]) }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [selectedClass])

  // ── The selected student's own rows, semester grades and reading level ──
  useEffect(() => {
    if (!selectedStudentId) { setMine({}); setSemRows([]); setPrevRows([]); setReading(null); return }
    let cancelled = false
    ;(async () => {
      setLoadingMine(true)
      const ids = allAssessments.map(a => a.id)
      const [g, sg, pg, rd] = await Promise.all([
        ids.length ? supabase.from('grades').select('student_id, assessment_id, score, is_absent, is_exempt, domain_scores, item_responses').eq('student_id', selectedStudentId).in('assessment_id', ids) : Promise.resolve({ data: [] as any[] }),
        selectedSemester ? supabase.from('semester_grades').select('domain, calculated_grade, final_grade, is_overridden').eq('student_id', selectedStudentId).eq('semester_id', selectedSemester) : Promise.resolve({ data: [] as any[] }),
        prevSemester ? supabase.from('semester_grades').select('domain, calculated_grade, final_grade').eq('student_id', selectedStudentId).eq('semester_id', prevSemester.id) : Promise.resolve({ data: [] as any[] }),
        supabase.from('reading_assessments').select('cwpm, reading_level').eq('student_id', selectedStudentId).order('date', { ascending: false }).limit(1),
      ])
      if (cancelled) return
      const m: Record<string, GradeRow> = {}; ((g as any).data || []).forEach((r: GradeRow) => { m[r.assessment_id] = r })
      setMine(m); setSemRows(((sg as any).data || []) as any); setPrevRows(((pg as any).data || []) as any)
      const r = ((rd as any).data || [])[0]; setReading(r ? { cwpm: r.cwpm ?? null, level: r.reading_level ?? null } : null)
      setLoadingMine(false)
    })()
    return () => { cancelled = true }
  }, [selectedStudentId, allAssessments, selectedSemester, prevSemester])

  // ── Overall per student, for the rail ──
  const overallOf = useMemo(() => {
    const byStudent: Record<string, GradeRow[]> = {}
    classGrades.forEach(r => { (byStudent[r.student_id] ||= []).push(r) })
    const out: Record<string, number | null> = {}
    for (const s of students) {
      const rows = byStudent[s.id] || []
      const avgs = DOMAINS.map(d => calculateWeightedAverage(itemsForDomain(d, allAssessments, a => rows.find(r => r.assessment_id === a.id)), grade, null, selectedClass, weightTable)).filter((v): v is number => v != null)
      out[s.id] = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null
    }
    return out
  }, [classGrades, students, allAssessments, grade, selectedClass, weightTable])

  // ── Rows per domain, with class averages and the class spread ──
  const byDomain = useMemo(() => {
    const out: Record<string, { rows: Row[]; avg: number | null; classAvg: number | null; items: { type: AssessmentType; pct: number; name: string }[] }> = {}
    const ordered = [...allAssessments].sort((x, y) => sortKey(x).localeCompare(sortKey(y)))
    for (const domain of DOMAINS) {
      const da = ordered.filter(a => touchesDomain(a, domain))
      if (da.length === 0) continue
      const rows: Row[] = da.map(a => {
        const g = mine[a.id]
        const it = g ? itemsForDomain(domain, [a], () => g)[0] : null
        const cls = classGrades.filter(x => x.assessment_id === a.id).map(x => ({ id: x.student_id, it: itemsForDomain(domain, [a], () => x)[0] })).filter(x => x.it)
        const classVals = cls.map(x => ({ id: x.id, v: x.it.maxScore > 0 ? (x.it.score / x.it.maxScore) * 100 : 0 }))
        const classPct = classVals.length ? classVals.reduce((s, x) => s + x.v, 0) / classVals.length : null
        const max = a.mixed && a.domain_split ? Number(a.domain_split[domain] || 0) : Number(a.max_score)
        let whole: Row['whole'] = null
        if (a.mixed) {
          const wmax = Number(a.max_score)
          const sc = g && !g.is_absent && !g.is_exempt && g.score != null ? Number(g.score) : null
          const wcls = classGrades.filter(x => x.assessment_id === a.id && !x.is_absent && !x.is_exempt && x.score != null)
          whole = { score: sc, max: wmax, pct: sc != null && wmax > 0 ? (sc / wmax) * 100 : null, classPct: wcls.length && wmax > 0 ? wcls.reduce((s, x) => s + (Number(x.score) / wmax) * 100, 0) / wcls.length : null }
        }
        return {
          key: `${a.id}:${domain}`, a, domain, name: a.mixed ? `${a.name} · ${domainLabel(domain)} part` : a.name, date: a.date,
          score: it ? it.score : null, max: it ? it.maxScore : max, pct: it && it.maxScore > 0 ? (it.score / it.maxScore) * 100 : null,
          classPct, classVals, flag: g?.is_absent ? 'absent' : g?.is_exempt ? 'exempt' : null, whole,
        }
      })
      const items = da.flatMap(a => mine[a.id] ? itemsForDomain(domain, [a], () => mine[a.id]).map(it => ({ type: it.assessmentType, pct: it.maxScore > 0 ? (it.score / it.maxScore) * 100 : 0, name: a.name })) : [])
      const weighted = da.flatMap(a => mine[a.id] ? itemsForDomain(domain, [a], () => mine[a.id]) : [])
      const classItems = classGrades.flatMap(x => { const a = da.find(y => y.id === x.assessment_id); return a ? itemsForDomain(domain, [a], () => x) : [] })
      out[domain] = { rows, avg: calculateWeightedAverage(weighted, grade, null, selectedClass, weightTable), classAvg: calculateWeightedAverage(classItems, grade, null, selectedClass, weightTable), items }
    }
    return out
  }, [allAssessments, mine, classGrades, grade, selectedClass, weightTable])

  const domainAvgs = DOMAINS.map(d => byDomain[d]?.avg).filter((v): v is number => v != null)
  const overall = domainAvgs.length ? domainAvgs.reduce((a, b) => a + b, 0) / domainAvgs.length : null
  const scoredCount = allAssessments.filter(a => mine[a.id]?.score != null).length
  const toneOf = (v: number | null | undefined) => v == null ? 'text-text-tertiary' : v >= 80 ? 'text-success' : v >= 60 ? 'text-amber-600' : 'text-danger'

  // ── Not yet scored: the class has it, this student has no mark and is not absent or exempt ──
  const unscored = useMemo(() => [...allAssessments].sort((x, y) => sortKey(x).localeCompare(sortKey(y))).filter(a => { const g = mine[a.id]; return !(g && (g.score != null || g.is_absent || g.is_exempt)) }), [allAssessments, mine])

  // ── Timeline: every scored part in date order, with the class average for each ──
  const timeline = useMemo(() => {
    const pts: { x: number; y: number; cls: number | null; domain: string; label: string; date: string | null }[] = []
    const all = DOMAINS.flatMap(d => byDomain[d]?.rows || []).filter(r => r.pct != null).sort((x, y) => sortKey(x.a).localeCompare(sortKey(y.a)))
    all.forEach((r, i) => pts.push({ x: i, y: r.pct!, cls: r.classPct, domain: r.domain, label: r.name, date: r.date }))
    return pts
  }, [byDomain])

  // ── Standards the student has met, is approaching, or missed, from their answer sheets ──
  const standards = useMemo(() => {
    const acc: Record<string, { earned: number; possible: number; where: { name: string; qs: number[] }[] }> = {}
    for (const a of allAssessments) {
      const g = mine[a.id]
      if (!a.question_map?.length || !Array.isArray(g?.item_responses)) continue
      const where: Record<string, number[]> = {}
      const add = (code: string, e: number, p: number, q: number) => { const x = (acc[code] ||= { earned: 0, possible: 0, where: [] }); x.earned += e; x.possible += p; (where[code] ||= []).push(q) }
      for (const q of a.question_map) {
        const r = g!.item_responses!.find((x: any) => x.q === q.num); if (!r) continue
        if (q.type === 'rubric' && q.rubric?.criteria?.length && r.levels) {
          for (const c of q.rubric.criteria) { const lv = r.levels[c.key]; const code = c.standard || q.standard; if (lv == null || !code) continue; add(code, Number(lv), 4, q.num) }
        } else if (q.standard && (r.answer || r.points != null || r.blank)) add(q.standard, Number(r.points) || 0, Number(q.max_points) || 0, q.num)
      }
      Object.entries(where).forEach(([code, qs]) => acc[code].where.push({ name: a.name, qs }))
    }
    return Object.entries(acc).map(([code, x]) => ({ code, pct: x.possible ? (x.earned / x.possible) * 100 : null, earned: x.earned, possible: x.possible, where: x.where, domain: domainForStandard(code, 'reading') }))
      .filter(s => s.pct != null).sort((a, b) => a.pct! - b.pct!)
  }, [allAssessments, mine])
  const stdBand = (p: number) => p >= bands.on ? 'met' : p >= bands.approaching ? 'approaching' : 'below'

  // ── Notes worth a look, only when there is something to say ──
  const notes = useMemo(() => {
    if (!selected) return []
    const out: { tone: 'good' | 'warn' | 'bad' | 'info'; text: string }[] = []
    const rows = DOMAINS.flatMap(d => byDomain[d]?.rows || [])
    const scored = rows.filter(r => r.pct != null)
    const byType = (t: string) => { const v = scored.filter(r => r.a.type === t).map(r => r.pct!); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
    const f = byType('formative'), s = byType('summative')
    if (f != null && s != null && Math.abs(f - s) >= 15) out.push({ tone: 'warn', text: ko ? `형성평가 ${Math.round(f)}%, 총괄평가 ${Math.round(s)}%: 차이가 큽니다.` : `Scores ${Math.round(f)}% on quizzes and classwork but ${Math.round(s)}% on tests.` })
    for (const d of DOMAINS) {
      const seq = (byDomain[d]?.rows || []).filter(r => r.pct != null).map(r => r.pct!)
      if (seq.length >= 3) { const prev = (seq[seq.length - 3] + seq[seq.length - 2]) / 2, last = seq[seq.length - 1]; if (prev - last >= 15) out.push({ tone: 'bad', text: ko ? `${DOMAIN_LABELS[d].ko}: 최근 ${Math.round(prev)}%에서 ${Math.round(last)}%로 하락.` : `${DOMAIN_LABELS[d].en} dropped from about ${Math.round(prev)}% to ${Math.round(last)}% on the latest assessment.` }); else if (last - prev >= 15) out.push({ tone: 'good', text: ko ? `${DOMAIN_LABELS[d].ko}: 최근 ${Math.round(prev)}%에서 ${Math.round(last)}%로 상승.` : `${DOMAIN_LABELS[d].en} climbed from about ${Math.round(prev)}% to ${Math.round(last)}% on the latest assessment.` }) }
    }
    const withClass = DOMAINS.filter(d => byDomain[d]?.avg != null && byDomain[d]?.classAvg != null)
    if (withClass.length >= 2) {
      const above = withClass.filter(d => byDomain[d].avg! >= byDomain[d].classAvg!)
      if (above.length === withClass.length) out.push({ tone: 'good', text: ko ? '모든 영역에서 반 평균 이상입니다.' : 'Above the class average in every domain.' })
      else if (above.length === 0) out.push({ tone: 'warn', text: ko ? '모든 영역에서 반 평균 이하입니다.' : 'Below the class average in every domain.' })
      else { const below = withClass.filter(d => !above.includes(d)); out.push({ tone: 'info', text: ko ? `반 평균 이하: ${below.map(d => DOMAIN_LABELS[d].ko).join(', ')}.` : `Below the class average in ${below.map(d => DOMAIN_LABELS[d].en).join(' and ')}.` }) }
    }
    const low = scored.filter(r => r.pct! < 60)
    if (low.length) out.push({ tone: 'bad', text: ko ? `60% 미만 평가 ${low.length}개: ${low.map(r => r.a.name).slice(0, 3).join(', ')}${low.length > 3 ? ' …' : ''}.` : `Under 60% on ${low.length} ${low.length === 1 ? 'assessment' : 'assessments'}: ${low.map(r => r.a.name).slice(0, 3).join(', ')}${low.length > 3 ? ' …' : ''}.` })
    const absent = allAssessments.filter(a => mine[a.id]?.is_absent).length, exempt = allAssessments.filter(a => mine[a.id]?.is_exempt).length
    if (absent) out.push({ tone: 'info', text: ko ? `결석 ${absent}회.` : `Absent for ${absent} ${absent === 1 ? 'assessment' : 'assessments'}.` })
    if (exempt) out.push({ tone: 'info', text: ko ? `면제 ${exempt}회.` : `Exempt from ${exempt} ${exempt === 1 ? 'assessment' : 'assessments'}.` })
    const notMet = standards.filter(s => stdBand(s.pct!) === 'below')
    if (notMet.length) out.push({ tone: 'warn', text: ko ? `아직 도달하지 못한 기준 ${notMet.length}개: ${notMet.slice(0, 3).map(s => s.code).join(', ')}.` : `${notMet.length} ${notMet.length === 1 ? 'standard' : 'standards'} not yet met: ${notMet.slice(0, 3).map(s => `${s.code} ${plainName(s.code)}`).join('; ')}.` })
    return out
  }, [selected, byDomain, allAssessments, mine, standards, ko]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard: ↑ ↓ move through the roster ──
  const visibleStudents = useMemo(() => students.filter(s => !filter || `${s.english_name} ${s.korean_name}`.toLowerCase().includes(filter.toLowerCase())), [students, filter])
  const step = (dir: -1 | 1) => {
    const i = visibleStudents.findIndex(s => s.id === selectedStudentId)
    const next = visibleStudents[i < 0 ? 0 : Math.max(0, Math.min(visibleStudents.length - 1, i + dir))]
    if (next) setSelectedStudentId(next.id)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowDown') { e.preventDefault(); step(1) } else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { railRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [selectedStudentId])

  const semFor = (d: string) => semRows.find(r => r.domain === d)
  const prevFor = (d: string) => { const r = prevRows.find(x => x.domain === d); return r ? (r.final_grade ?? r.calculated_grade) : null }
  const { weights, source: weightSource } = weightsFor(weightTable, grade, selectedClass)
  const weightSourceText = weightSource === 'class' ? (ko ? `${selectedClass} 반 설정 가중치` : `${selectedClass} weights from Settings`) : weightSource === 'grade' ? (ko ? `${grade}학년 설정 가중치` : `grade ${grade} weights from Settings`) : (ko ? `${grade}학년 기본 가중치` : `grade ${grade} default weights`)

  // ── Print: the summary, the table and the standards, in the domain colours ──
  const printReport = () => {
    if (!selected) return
    const pw = window.open('', '_blank'); if (!pw) return
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
    const tiles = DOMAINS.filter(d => byDomain[d]).map(d => `<div style="flex:1;min-width:110px;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${DOMAIN_COLOR[d]};font-weight:700">${esc(DOMAIN_LABELS[d][lang])}</div><div style="font-size:22px;font-weight:700">${byDomain[d].avg != null ? Math.round(byDomain[d].avg!) + '%' : '—'}</div><div style="font-size:10px;color:#64748b">${ko ? '반 평균' : 'class'} ${byDomain[d].classAvg != null ? Math.round(byDomain[d].classAvg!) + '%' : '—'}</div></div>`).join('')
    const tables = DOMAINS.filter(d => byDomain[d]).map(d => {
      const rows = byDomain[d].rows.map(r => `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0">${esc(r.name)}${r.whole && r.whole.score != null ? `<br><span style="font-size:9px;color:#64748b">${ko ? '시험지 전체' : 'whole paper'} ${fmtPts(r.whole.score)}/${fmtPts(r.whole.max)} · ${pct1(r.whole.pct)}</span>` : ''}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">${r.score != null ? `${fmtPts(r.score)}/${fmtPts(r.max)}` : r.flag === 'absent' ? (ko ? '결석' : 'Absent') : r.flag === 'exempt' ? (ko ? '면제' : 'Exempt') : '—'}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600">${pct1(r.pct)}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;color:#64748b">${pct1(r.classPct)}</td></tr>`).join('')
      return `<div style="margin-bottom:14px"><h3 style="font-size:12px;font-weight:700;color:${DOMAIN_COLOR[d]};text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;display:flex;justify-content:space-between">${esc(DOMAIN_LABELS[d][lang])}<span>${pct1(byDomain[d].avg)}</span></h3><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f1f5f9"><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:left">${ko ? '평가' : 'Assessment'}</th><th style="padding:4px 8px;border:1px solid #e2e8f0">${ko ? '점수' : 'Score'}</th><th style="padding:4px 8px;border:1px solid #e2e8f0">%</th><th style="padding:4px 8px;border:1px solid #e2e8f0">${ko ? '반 평균' : 'Class'}</th></tr></thead><tbody>${rows}</tbody></table></div>`
    }).join('')
    const stds = standards.length ? `<h3 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:14px 0 4px">${ko ? '기준별' : 'Standards'}</h3><table style="width:100%;border-collapse:collapse;font-size:11px">${standards.map(s => { const b = stdBand(s.pct!); return `<tr><td style="padding:3px 8px;border:1px solid #e2e8f0;color:${DOMAIN_COLOR[s.domain] || '#64748b'};font-family:monospace">${s.code}</td><td style="padding:3px 8px;border:1px solid #e2e8f0">${esc(plainName(s.code))}</td><td style="padding:3px 8px;border:1px solid #e2e8f0;text-align:center">${fmtPts(s.earned)}/${fmtPts(s.possible)}</td><td style="padding:3px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600;color:${b === 'met' ? '#16a34a' : b === 'approaching' ? '#d97706' : '#dc2626'}">${b === 'met' ? (ko ? '도달' : 'Met') : b === 'approaching' ? (ko ? '근접' : 'Approaching') : (ko ? '미달' : 'Not yet')}</td></tr>` }).join('')}</table>` : ''
    pw.document.write(`<!DOCTYPE html><html><head><title>Grade Report - ${esc(selected.english_name)}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;margin:24px;color:#1a1a2e}@media print{@page{margin:15mm}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#647FBC;border-radius:8px;color:white;margin-bottom:14px"><div><span style="font-size:20px;font-weight:700">${esc(selected.english_name)}</span><span style="font-size:14px;margin-left:8px;opacity:0.7">${esc(selected.korean_name)}</span></div><div style="font-size:11px;text-align:right">${ko ? '성적표' : 'Grade Report'}<br>${new Date().toLocaleDateString()}${overall != null ? `<br><b style="font-size:16px">${overall.toFixed(1)}% · ${percentToLetter(overall)}</b>` : ''}</div></div><div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">${tiles}</div>${tables}${stds}<p style="font-size:9px;color:#94a3b8;margin-top:16px">Daewoo Elementary English Program</p></body></html>`)
    pw.document.close(); pw.print()
  }

  // ─────────────────────────── render ───────────────────────────
  return (
    <div className="grid grid-cols-[230px_minmax(0,1fr)] gap-4 items-start">
      {/* Roster rail */}
      <div ref={railRef} className="bg-surface border border-border rounded-xl overflow-hidden sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col">
        <div className="px-3 py-2.5 border-b border-border">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder={ko ? '학생 찾기' : 'Find a student'} className="w-full h-8 pl-7 pr-2 text-[12.5px] bg-surface-alt border border-border rounded-md outline-none focus:border-navy" />
          </div>
          <p className="text-[10.5px] text-text-tertiary mt-1.5">{students.length} {ko ? '명' : 'students'} · ↑ ↓ {ko ? '이동' : 'to move'}</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {visibleStudents.map(s => {
            const v = overallOf[s.id]
            const active = s.id === selectedStudentId
            return (
              <button key={s.id} data-active={active} onClick={() => setSelectedStudentId(s.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-border/60 ${active ? 'bg-accent-light shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-surface-alt'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${v == null ? 'bg-border' : v < 60 ? 'bg-danger' : v < 70 ? 'bg-amber-500' : 'bg-transparent'}`} title={v != null && v < 70 ? (ko ? '70% 미만' : 'Under 70%') : undefined} />
                <span className="min-w-0 flex-1"><span className={`block text-[12.5px] truncate ${active ? 'font-semibold text-navy' : 'text-text-primary'}`}>{s.english_name}</span><span className="block text-[10.5px] text-text-tertiary truncate">{s.korean_name}</span></span>
                <span className={`text-[12px] tabular-nums font-semibold ${toneOf(v)}`}>{v != null ? Math.round(v) : loadingClass ? '…' : '—'}</span>
              </button>
            )
          })}
          {visibleStudents.length === 0 && <p className="px-3 py-4 text-[12px] text-text-tertiary">{ko ? '일치하는 학생이 없습니다.' : 'No one matches.'}</p>}
        </div>
      </div>

      {/* Main */}
      {!selected ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <h3 className="font-display text-lg font-semibold text-navy mb-1">{ko ? '학생을 선택하세요' : 'Pick a student'}</h3>
          <p className="text-[13px] text-text-tertiary">{ko ? '왼쪽 목록에서 학생을 클릭하면 이번 학기 성적이 나타납니다.' : 'Click a name on the left to see their grades for the semester, assessment by assessment.'}</p>
          {allAssessments.length === 0 && <p className="text-[12px] text-text-tertiary mt-2">{ko ? '이 반에 아직 평가가 없습니다.' : 'No assessments yet for this class.'}</p>}
        </div>
      ) : loadingMine ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
      ) : (
        <div className="space-y-4 min-w-0">
          {/* Header */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-accent-light border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                {selected.photo_url ? <img src={selected.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" /> : null}
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold text-navy leading-tight">{selected.english_name}<span className="text-text-tertiary ml-2 text-[14px] font-normal">{selected.korean_name}</span></h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                    <WIDABadge studentId={selected.id} compact />
                    {reading && (reading.cwpm != null || reading.level) && <span className="px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary" title={ko ? '최근 읽기 평가' : 'Latest reading record'}>{ko ? '읽기' : 'Reading'} {reading.cwpm != null ? `${reading.cwpm} cwpm` : ''}{reading.level ? ` · ${reading.level}` : ''}</span>}
                    <button onClick={() => navigateTo({ view: 'students', preSelectedStudent: selected.id })} className="inline-flex items-center gap-1 text-navy hover:underline"><ExternalLink size={10} />{ko ? '학생 페이지' : 'Student page'}</button>
                    <button onClick={() => navigateTo({ view: 'reports', preSelectedStudent: selected.id })} className="inline-flex items-center gap-1 text-navy hover:underline"><ExternalLink size={10} />{ko ? '성적표' : 'Report card'}</button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => step(-1)} className="w-8 h-8 rounded-lg border border-border bg-surface text-text-secondary hover:text-navy flex items-center justify-center" title={ko ? '이전 학생 (↑)' : 'Previous student (↑)'}><ChevronLeft size={14} /></button>
                <button onClick={() => step(1)} className="w-8 h-8 rounded-lg border border-border bg-surface text-text-secondary hover:text-navy flex items-center justify-center" title={ko ? '다음 학생 (↓)' : 'Next student (↓)'}><ChevronRight size={14} /></button>
                <button onClick={printReport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface text-text-secondary hover:bg-border border border-border"><Printer size={12} />{ko ? '인쇄' : 'Print report'}</button>
              </div>
            </div>
            <div className="px-5 py-3 flex items-center gap-5 flex-wrap border-b border-border bg-surface-alt/40">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-display font-bold ${toneOf(overall)}`}>{overall != null ? `${overall.toFixed(1)}%` : '—'}</span>
                {overall != null && <span className="text-[13px] font-semibold text-text-secondary">{percentToLetter(overall)}</span>}
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">{ko ? '전체' : 'Overall'}</span>
              </div>
              <span className="text-[11px] text-text-tertiary">{ko ? '영역 평균의 평균, 성적표와 같은 값' : 'the mean of the domain averages, the same number the report card uses'}</span>
              <span className="text-[11px] text-text-tertiary ml-auto tabular-nums">{scoredCount}/{allAssessments.length} {ko ? '채점됨' : 'scored'}{unscored.length ? ` · ${unscored.length} ${ko ? '미채점' : 'to score'}` : ''}</span>
            </div>
            {/* Domain tiles */}
            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border">
              {DOMAINS.map(d => {
                const b = byDomain[d]
                const seq = (b?.rows || []).filter(r => r.pct != null).map(r => r.pct!)
                const prev = prevFor(d)
                const diff = prev != null && b?.avg != null ? b.avg - prev : null
                const drop = seq.length >= 3 ? ((seq[seq.length - 3] + seq[seq.length - 2]) / 2) - seq[seq.length - 1] : 0
                const tone = b?.avg != null && b.avg < 70 ? 'bad' : drop >= 15 ? 'warn' : undefined
                return (
                  <div key={d} className="px-4 py-3 min-w-0" style={{ backgroundColor: b ? domainTint(d, '0A') : undefined }}>
                    <p className="text-[10px] uppercase tracking-wider font-semibold truncate" style={{ color: DOMAIN_COLOR[d] }} title={DOMAIN_LABELS[d][lang]}>{DOMAIN_LABELS[d][lang]}</p>
                    {!b ? (
                      <p className="text-[11px] text-text-tertiary mt-2 leading-snug">{ko ? '아직 평가 없음' : 'no assessments yet'}</p>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className={`font-display text-[24px] leading-none tabular-nums ${toneOf(b.avg)}`}>{b.avg != null ? Math.round(b.avg) : '—'}</span>
                          {b.avg != null && <span className="text-[11px] text-text-tertiary">%</span>}
                          {diff != null && <span className={`text-[10.5px] tabular-nums font-semibold ${diff >= 0 ? 'text-success' : 'text-danger'}`} title={`${prevSemester?.name || (ko ? '지난 학기' : 'last semester')}: ${Math.round(prev!)}%`}>{diff >= 0 ? '▲' : '▼'} {Math.abs(Math.round(diff))}</span>}
                        </div>
                        <div className="mt-1.5"><Sparkline values={seq} tone={tone} width={110} height={22} /></div>
                        <p className="text-[10.5px] text-text-tertiary mt-0.5 tabular-nums truncate">{ko ? '반' : 'class'} {b.classAvg != null ? `${Math.round(b.classAvg)}%` : '—'} · {seq.length}/{b.rows.length}{drop >= 15 ? ` · ${ko ? '최근 하락' : 'recent drop'}` : ''}</p>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notes + unscored */}
          {(notes.length > 0 || unscored.length > 0) && (
            <div className={`grid gap-4 ${notes.length > 0 && unscored.length > 0 ? 'md:grid-cols-2' : ''}`}>
              {notes.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">{ko ? '눈여겨볼 점' : 'Worth a look'}</p>
                  <ul className="space-y-1.5">
                    {notes.map((n, i) => <li key={i} className="flex items-start gap-2 text-[12.5px] text-text-primary"><span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.tone === 'good' ? 'bg-success' : n.tone === 'bad' ? 'bg-danger' : n.tone === 'warn' ? 'bg-amber-500' : 'bg-navy/40'}`} />{n.text}</li>)}
                  </ul>
                </div>
              )}
              {unscored.length > 0 && (
                <div className="bg-surface border border-amber-300/60 rounded-xl p-4 bg-amber-50/30">
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">{ko ? '미채점' : 'Not yet scored'} · {unscored.length}</p>
                  <ul className="space-y-1">
                    {unscored.map(a => (
                      <li key={a.id} className="flex items-center gap-2 text-[12.5px]">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: domainColor(a.domain) }} />
                        <span className="truncate text-text-primary">{a.name}</span>
                        {a.date && <span className="text-[10.5px] text-text-tertiary">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        {onOpenAssessment && <button onClick={() => onOpenAssessment(a)} className="ml-auto text-[11px] text-navy hover:underline whitespace-nowrap">{ko ? '채점하기' : 'Open sheet'}</button>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {timeline.length >= 2 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{ko ? '시간순' : 'Over the semester'}</p>
                <span className="flex items-center gap-3 text-[10.5px] text-text-tertiary">
                  {DOMAINS.filter(d => timeline.some(p => p.domain === d)).map(d => <span key={d} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLOR[d] }} />{domainShort(d)}</span>)}
                  <span className="inline-flex items-center gap-1"><span className="w-4 border-t border-dashed border-text-tertiary" />{ko ? '반 평균' : 'class avg'}</span>
                </span>
              </div>
              <Timeline points={timeline} />
            </div>
          )}

          {/* One aligned table */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-[12px] table-fixed">
              <colgroup><col /><col className="w-[88px]" /><col className="w-[64px]" /><col className="w-[120px]" /><col className="w-[72px]" /><col className="w-[72px]" /></colgroup>
              <thead><tr className="text-[10px] uppercase tracking-wider text-text-tertiary bg-surface-alt/60">
                <th className="text-left px-5 py-2">{ko ? '평가' : 'Assessment'}</th><th className="text-left px-3 py-2">{ko ? '점수' : 'Score'}</th><th className="text-left px-3 py-2">%</th><th className="text-left px-3 py-2">{ko ? '반 분포' : 'In the class'}</th><th className="text-right px-3 py-2">{ko ? '반 평균' : 'Class avg'}</th><th className="text-right px-3 py-2">{ko ? '차이' : 'vs. class'}</th>
              </tr></thead>
              {DOMAINS.map(domain => {
                const d = byDomain[domain]; if (!d) return null
                const collapsed = open[domain] === false
                const why = !!showWhy[domain]
                const groups = (['formative', 'summative', 'performance_task'] as AssessmentType[]).map(t => ({ t, pcts: d.items.filter(i => i.type === t).map(i => i.pct), names: d.items.filter(i => i.type === t).map(i => i.name) })).filter(g => g.pcts.length)
                const totalW = groups.reduce((s, g) => s + weights[g.t], 0)
                const sem = semFor(domain)
                return (
                  <tbody key={domain} className="border-t border-border">
                    <tr className="bg-surface-alt">
                      <td colSpan={6} className="px-5 py-2.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={() => setOpen(p => ({ ...p, [domain]: collapsed }))} className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: DOMAIN_COLOR[domain] }}>
                            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}<span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DOMAIN_COLOR[domain] }} />{DOMAIN_LABELS[domain][lang]}
                          </button>
                          <span className="text-[11px] text-text-tertiary">{d.rows.length} {ko ? '개 평가' : d.rows.length === 1 ? 'assessment' : 'assessments'}</span>
                          <button onClick={() => setShowWhy(p => ({ ...p, [domain]: !why }))} className="text-[11px] text-navy hover:underline">{why ? (ko ? '계산 숨기기' : 'hide how it is computed') : (ko ? '어떻게 계산되나' : 'how is this computed?')}</button>
                          <span className="ml-auto flex items-baseline gap-3">
                            {sem && (sem.final_grade != null || sem.calculated_grade != null) && (
                              <span className="text-[11px] text-text-tertiary" title={ko ? '성적표에 들어갈 값' : 'What the report card will show'}>{ko ? '성적표' : 'report card'} <span className="font-semibold text-text-secondary tabular-nums">{(sem.final_grade ?? sem.calculated_grade)!.toFixed(1)}%</span>{sem.final_grade != null && sem.calculated_grade != null && Math.abs(sem.final_grade - sem.calculated_grade) >= 0.05 && <span className="text-amber-700"> · {ko ? '교사 조정' : 'teacher override'}</span>}</span>
                            )}
                            {d.classAvg != null && <span className="text-[11px] text-text-tertiary tabular-nums">{ko ? '반' : 'class'} {d.classAvg.toFixed(1)}%</span>}
                            {d.avg != null && <span className={`text-[14px] font-bold tabular-nums ${toneOf(d.avg)}`}>{d.avg.toFixed(1)}%</span>}
                          </span>
                        </div>
                        {why && (
                          <div className="mt-2 text-[11.5px] text-text-secondary bg-surface rounded-md border border-border px-3 py-2 leading-relaxed">
                            {groups.length === 0 ? (ko ? '아직 점수가 없습니다.' : 'Nothing scored yet.') : groups.length === 1 ? (
                              <>{ko ? `${typeLabel(groups[0].t, ko)}만 있어서 단순 평균입니다: ` : `Only ${typeLabel(groups[0].t, ko)} so far, so this is their plain average: `}{groups[0].pcts.map(p => Math.round(p)).join(', ')} → <b className="text-text-primary">{d.avg?.toFixed(1)}%</b>. {ko ? '다른 유형이 추가되면 가중치가 적용됩니다' : 'Once another type is scored the weights apply'} ({ko ? '형성' : 'quizzes'} {weights.formative} · {ko ? '총괄' : 'tests'} {weights.summative} · {ko ? '수행' : 'tasks'} {weights.performance_task}).</>
                            ) : (
                              <>
                                {groups.map(g => { const avg = g.pcts.reduce((a, b) => a + b, 0) / g.pcts.length; return <span key={g.t} className="block"><b className="text-text-primary">{typeLabel(g.t, ko)}</b> {g.pcts.map(p => Math.round(p)).join(', ')} → {avg.toFixed(1)}% × {ko ? '가중치' : 'weight'} {weights[g.t]}{totalW !== 100 ? ` (${Math.round((weights[g.t] / totalW) * 100)}% ${ko ? '정규화' : 'after scaling to the types present'})` : ''}</span> })}
                                <span className="block mt-1">= <b className="text-text-primary">{d.avg?.toFixed(1)}%</b> · {weightSourceText}{(prevFor(domain) != null) ? ` · ${prevSemester?.name || (ko ? '지난 학기' : 'last semester')} ${Math.round(prevFor(domain)!)}%` : ''}</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {!collapsed && d.rows.map(r => {
                      const diff = r.pct != null && r.classPct != null ? r.pct - r.classPct : null
                      return (
                        <tr key={r.key} className="border-t border-border/50 hover:bg-surface-alt/40">
                          <td className="px-5 py-2 min-w-0">
                            <span className="font-medium text-text-primary">{r.name}</span>
                            <span className="text-text-tertiary ml-1.5 text-[10px]">{r.a.type !== 'formative' ? typeLabel(r.a.type, ko) : ''}{r.date ? `${r.a.type !== 'formative' ? ' · ' : ''}${new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span>
                            {r.whole && <span className="block text-[10px] text-text-tertiary tabular-nums">{ko ? '시험지 전체' : 'whole paper'} {r.whole.score != null ? `${fmtPts(r.whole.score)}/${fmtPts(r.whole.max)} · ${pct1(r.whole.pct)}` : '—'}{r.whole.classPct != null && <span className="ml-1.5">({ko ? '반' : 'class'} {pct1(r.whole.classPct)})</span>}</span>}
                          </td>
                          <td className="px-3 py-2 font-medium tabular-nums">{r.score != null ? `${fmtPts(r.score)}/${fmtPts(r.max)}` : r.flag ? <span className="text-text-tertiary text-[10px] uppercase tracking-wider">{r.flag}</span> : <span className="text-amber-700 text-[10px] uppercase tracking-wider">{ko ? '미채점' : 'unscored'}</span>}</td>
                          <td className={`px-3 py-2 font-semibold tabular-nums ${toneOf(r.pct)}`}>{r.pct != null ? `${r.pct.toFixed(1)}%` : '—'}</td>
                          <td className="px-3 py-1.5"><PositionStrip vals={r.classVals} me={selected.id} color={DOMAIN_COLOR[domain]} /></td>
                          <td className="px-3 py-2 text-right text-text-secondary tabular-nums">{r.classPct != null ? `${r.classPct.toFixed(1)}%` : '—'}</td>
                          <td className={`px-3 py-2 text-right font-semibold tabular-nums ${diff == null ? 'text-text-tertiary' : diff >= 0 ? 'text-success' : 'text-danger'}`}>{diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                )
              })}
            </table>
            {allAssessments.length === 0 && <div className="p-8 text-center text-text-tertiary text-sm">{ko ? '이 반에 아직 평가가 없습니다.' : 'No assessments yet for this class.'}</div>}
          </div>

          {/* Standards */}
          {standards.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-baseline justify-between mb-1 flex-wrap gap-2">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{ko ? '기준별 도달' : 'Standards from the answer sheets'}</p>
                <span className="text-[10.5px] text-text-tertiary">{ko ? `도달 ${bands.on}%+ · 근접 ${bands.approaching}%+` : `Met ${bands.on}%+ · Approaching ${bands.approaching}%+ · weakest first`}</span>
              </div>
              <p className="text-[11.5px] text-text-tertiary mb-3">{ko ? '문항별로 채점한 평가에서만 집계됩니다.' : 'Only assessments marked question by question count here, so this is the "what to reteach" list for this student.'}</p>
              <div className="grid gap-1.5">
                {standards.map(s => {
                  const b = stdBand(s.pct!)
                  return (
                    <div key={s.code} className="grid grid-cols-[80px_minmax(0,1fr)_72px_84px] gap-3 items-center text-[12px]">
                      <span className="font-mono text-[11px] inline-flex items-center gap-1.5" style={{ color: domainColor(s.domain) }}><span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: domainColor(s.domain) }} />{s.code}</span>
                      <span className="min-w-0"><span className="text-text-primary">{plainName(s.code)}</span><span className="block text-[10.5px] text-text-tertiary truncate">{s.where.map(w => `${w.name} Q${w.qs.join(', ')}`).join(' · ')}</span></span>
                      <span className="tabular-nums text-text-secondary">{fmtPts(s.earned)}/{fmtPts(s.possible)} · {Math.round(s.pct!)}%</span>
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full text-center ${b === 'met' ? 'bg-green-100 text-green-700' : b === 'approaching' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{b === 'met' ? (ko ? '도달' : 'Met') : b === 'approaching' ? (ko ? '근접' : 'Approaching') : (ko ? '미달' : 'Not yet')}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Where this student sits in the class on one assessment ──
// A short strip: the class as faint dots, the average as a tick, the student
// as the solid dot. Hover for the exact numbers.
function PositionStrip({ vals, me, color }: { vals: { id: string; v: number }[]; me: string; color: string }) {
  if (vals.length < 2) return <span className="text-[10px] text-text-tertiary">—</span>
  const W = 110, H = 16
  const x = (v: number) => 4 + (Math.max(0, Math.min(100, v)) / 100) * (W - 8)
  const mine = vals.find(v => v.id === me)
  const avg = vals.reduce((a, b) => a + b.v, 0) / vals.length
  const rank = mine ? vals.filter(v => v.v > mine.v).length + 1 : null
  return (
    <svg width={W} height={H} className="block" role="img">
      <title>{mine ? `${Math.round(mine.v)}% · ${rank} of ${vals.length} in the class · class average ${Math.round(avg)}%` : `class average ${Math.round(avg)}%`}</title>
      <line x1={4} x2={W - 4} y1={H / 2} y2={H / 2} stroke="currentColor" strokeOpacity="0.15" />
      {vals.filter(v => v.id !== me).map(v => <circle key={v.id} cx={x(v.v)} cy={H / 2} r={2.2} fill={color} fillOpacity="0.28" />)}
      <line x1={x(avg)} x2={x(avg)} y1={2} y2={H - 2} stroke="currentColor" strokeOpacity="0.5" />
      {mine && <circle cx={x(mine.v)} cy={H / 2} r={4} fill={color} stroke="white" strokeWidth="1.5" />}
    </svg>
  )
}

// ── Every scored part in date order, dots by domain, class average dashed ──
function Timeline({ points }: { points: { x: number; y: number; cls: number | null; domain: string; label: string; date: string | null }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = 170, P = { top: 14, right: 16, bottom: 26, left: 34 }
  const cw = W - P.left - P.right, ch = H - P.top - P.bottom
  const n = points.length
  const xs = (i: number) => P.left + (n > 1 ? (i / (n - 1)) * cw : cw / 2)
  const ys = (v: number) => P.top + ch - (Math.max(0, Math.min(100, v)) / 100) * ch
  const line = points.map((p, i) => `${i ? 'L' : 'M'} ${xs(i)} ${ys(p.y)}`).join(' ')
  const cls = points.filter(p => p.cls != null)
  const clsLine = cls.map((p, i) => `${i ? 'L' : 'M'} ${xs(p.x)} ${ys(p.cls!)}`).join(' ')
  const h = hover != null ? points[hover] : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" onMouseLeave={() => setHover(null)}>
        {[0, 25, 50, 75, 100].map(t => <g key={t}><line x1={P.left} x2={W - P.right} y1={ys(t)} y2={ys(t)} stroke="currentColor" strokeOpacity={t === 0 ? 0.3 : 0.08} /><text x={P.left - 6} y={ys(t) + 3.5} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.5">{t}</text></g>)}
        <rect x={P.left} y={ys(70)} width={cw} height={ys(0) - ys(70)} fill="#dc2626" fillOpacity="0.04" />
        {cls.length >= 2 && <path d={clsLine} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="4 3" />}
        <path d={line} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={xs(i) - (n > 1 ? cw / (n - 1) / 2 : cw / 2)} y={P.top} width={n > 1 ? cw / (n - 1) : cw} height={ch} fill="transparent" />
            <circle cx={xs(i)} cy={ys(p.y)} r={hover === i ? 6 : 4.5} fill={domainColor(p.domain)} stroke="white" strokeWidth="1.5" />
          </g>
        ))}
        {points.map((p, i) => (n <= 12 || i % Math.ceil(n / 12) === 0) && p.date ? <text key={`d${i}`} x={xs(i)} y={H - 8} textAnchor="middle" fontSize="9.5" fill="currentColor" fillOpacity="0.5">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text> : null)}
      </svg>
      {h && (
        <div className="absolute pointer-events-none bg-surface border border-border rounded shadow-lg px-2.5 py-1.5 text-[11.5px] text-text-primary whitespace-nowrap" style={{ left: `${(xs(hover!) / W) * 100}%`, top: `${(ys(h.y) / H) * 100}%`, transform: 'translate(-50%, calc(-100% - 10px))' }}>
          <span className="font-medium" style={{ color: domainColor(h.domain) }}>{h.label}</span> · <span className="font-semibold tabular-nums">{Math.round(h.y)}%</span>{h.cls != null && <span className="text-text-tertiary"> · class {Math.round(h.cls)}%</span>}
        </div>
      )}
    </div>
  )
}
