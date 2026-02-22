'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass, GRADES } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, TrendingUp, Users, BookOpen, ClipboardCheck, AlertTriangle, Download, Calendar, BarChart3, Activity } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

type AdminTab = 'overview' | 'attendance' | 'reading' | 'behavior' | 'growth' | 'wida_corr' | 'domain_str' | 'class_comp'

export default function AdminDashboard() {
  const { language } = useApp()
  const ko = language === 'ko'
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    (async () => {
      // Parallel data fetching
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [studentsRes, attendanceRes, recentAttRes, allAttRes, behaviorRes, behaviorDetailRes, readingRes, semesterRes, widaRes] = await Promise.all([
        supabase.from('students').select('id, english_name, korean_name, grade, english_class, is_active').eq('is_active', true),
        supabase.from('attendance').select('student_id, status, date').eq('date', today),
        supabase.from('attendance').select('student_id, status, date').gte('date', thirtyDaysAgo),
        supabase.from('attendance').select('student_id, status, date').gte('date', ninetyDaysAgo),
        supabase.from('behavior_logs').select('student_id, date, flagged').gte('date', thirtyDaysAgo),
        supabase.from('behavior_logs').select('student_id, date, flagged, antecedent, behavior, consequence').gte('date', ninetyDaysAgo),
        supabase.from('reading_assessments').select('student_id, cwpm, date, accuracy_rate').order('date', { ascending: true }),
        supabase.from('semesters').select('id').eq('is_active', true).limit(1),
        supabase.from('student_wida_levels').select('student_id, domain, wida_level'),
      ])

      const students = studentsRes.data || []
      const todayAtt = attendanceRes.data || []
      const recentAtt = recentAttRes.data || []
      const allAtt = allAttRes.data || []
      const behavior = behaviorRes.data || []
      const behaviorDetail = behaviorDetailRes.data || []
      const reading = readingRes.data || []
      const activeSemester = semesterRes.data?.[0] || null
      const wida = widaRes.data || []

      // --- Attendance by class (30 days) ---
      const attByClass: Record<string, { present: number; absent: number; tardy: number; total: number }> = {}
      ENGLISH_CLASSES.forEach(c => { attByClass[c] = { present: 0, absent: 0, tardy: 0, total: 0 } })
      recentAtt.forEach(a => {
        const s = students.find(st => st.id === a.student_id)
        if (!s || !attByClass[s.english_class]) return
        attByClass[s.english_class].total++
        if (a.status === 'present') attByClass[s.english_class].present++
        else if (a.status === 'absent') attByClass[s.english_class].absent++
        else if (a.status === 'tardy') attByClass[s.english_class].tardy++
      })

      // --- Today's attendance status ---
      const todayMarked = new Set(todayAtt.map(a => a.student_id))
      const todayUnmarked = students.filter(s => !todayMarked.has(s.id))
      const todayByClass: Record<string, { marked: number; total: number }> = {}
      ENGLISH_CLASSES.forEach(c => {
        const cs = students.filter(s => s.english_class === c)
        todayByClass[c] = { total: cs.length, marked: cs.filter(s => todayMarked.has(s.id)).length }
      })

      // --- Students per class ---
      const studentsByClass: Record<string, number> = {}
      ENGLISH_CLASSES.forEach(c => { studentsByClass[c] = students.filter(s => s.english_class === c).length })

      // --- Behavior incidents by class (30 days) ---
      const behByClass: Record<string, number> = {}
      ENGLISH_CLASSES.forEach(c => { behByClass[c] = 0 })
      behavior.forEach(b => {
        const s = students.find(st => st.id === b.student_id)
        if (s && behByClass[s.english_class] != null) behByClass[s.english_class]++
      })
      const flaggedCount = behavior.filter(b => b.flagged).length

      // --- Reading: latest CWPM by class ---
      const latestReading: Record<string, number> = {}
      reading.forEach(r => { if (!latestReading[r.student_id]) latestReading[r.student_id] = r.cwpm })
      const cwpmByClass: Record<string, number[]> = {}
      ENGLISH_CLASSES.forEach(c => { cwpmByClass[c] = [] })
      students.forEach(s => {
        if (latestReading[s.id] != null && cwpmByClass[s.english_class]) cwpmByClass[s.english_class].push(latestReading[s.id])
      })

      // --- WIDA distribution ---
      // Compute overall WIDA level as average of domain levels
      const widaByStudentDomain: Record<string, number[]> = {}
      ;(wida as any[]).forEach(w => {
        if (!widaByStudentDomain[w.student_id]) widaByStudentDomain[w.student_id] = []
        widaByStudentDomain[w.student_id].push(w.wida_level)
      })
      const widaMap: Record<string, number> = {}
      Object.entries(widaByStudentDomain).forEach(([sid, levels]) => {
        widaMap[sid] = levels.reduce((a, b) => a + b, 0) / levels.length
      })
      const widaByClass: Record<string, Record<number, number>> = {}
      ENGLISH_CLASSES.forEach(c => { widaByClass[c] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } })
      students.forEach(s => {
        const lvl = widaMap[s.id]
        if (lvl && widaByClass[s.english_class]) widaByClass[s.english_class][Math.round(lvl)] = (widaByClass[s.english_class][Math.round(lvl)] || 0) + 1
      })

      // --- Grade averages by class ---
      let gradeAvgByClass: Record<string, number | null> = {}
      if (activeSemester) {
        const semId = activeSemester.id
        const { data: assessments } = await supabase.from('assessments').select('id, english_class, max_score').eq('semester_id', semId)
        const { data: grades } = await supabase.from('grades').select('score, assessment_id').in('assessment_id', (assessments || []).map(a => a.id)).not('score', 'is', null)
        ENGLISH_CLASSES.forEach(c => {
          const classAssessments = (assessments || []).filter(a => a.english_class === c)
          if (classAssessments.length === 0) { gradeAvgByClass[c] = null; return }
          const classGrades = (grades || []).filter(g => classAssessments.find(a => a.id === g.assessment_id))
          if (classGrades.length === 0) { gradeAvgByClass[c] = null; return }
          const pcts = classGrades.map(g => {
            const a = classAssessments.find(x => x.id === g.assessment_id)
            return a && a.max_score > 0 ? (g.score / a.max_score) * 100 : null
          }).filter((p): p is number => p != null)
          gradeAvgByClass[c] = pcts.length > 0 ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null
        })
      }

      // --- Weekly attendance trends (90 days) ---
      const weeklyAtt: { week: string; present: number; absent: number; tardy: number; total: number }[] = []
      const attByWeek: Record<string, { present: number; absent: number; tardy: number; total: number }> = {}
      allAtt.forEach(a => {
        const d = new Date(a.date + 'T12:00:00')
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay() + 1) // Monday
        const wk = weekStart.toISOString().split('T')[0]
        if (!attByWeek[wk]) attByWeek[wk] = { present: 0, absent: 0, tardy: 0, total: 0 }
        attByWeek[wk].total++
        if (a.status === 'present') attByWeek[wk].present++
        else if (a.status === 'absent') attByWeek[wk].absent++
        else if (a.status === 'tardy') attByWeek[wk].tardy++
      })
      Object.entries(attByWeek).sort(([a], [b]) => a.localeCompare(b)).forEach(([week, d]) => weeklyAtt.push({ week, ...d }))

      // --- Behavior patterns (90 days) ---
      const behByWeek: Record<string, number> = {}
      const topBehaviors: Record<string, number> = {}
      const topAntecedents: Record<string, number> = {}
      behaviorDetail.forEach(b => {
        const d = new Date(b.date + 'T12:00:00')
        const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay() + 1)
        const wk = weekStart.toISOString().split('T')[0]
        behByWeek[wk] = (behByWeek[wk] || 0) + 1
        if (b.behavior) topBehaviors[b.behavior] = (topBehaviors[b.behavior] || 0) + 1
        if (b.antecedent) topAntecedents[b.antecedent] = (topAntecedents[b.antecedent] || 0) + 1
      })
      const behaviorWeekly = Object.entries(behByWeek).sort(([a], [b]) => a.localeCompare(b)).map(([week, count]) => ({ week, count }))
      const topBeh = Object.entries(topBehaviors).sort(([, a], [, b]) => b - a).slice(0, 8)
      const topAnt = Object.entries(topAntecedents).sort(([, a], [, b]) => b - a).slice(0, 8)

      // --- Reading progress (all time, per class) ---
      const readingByClassDate: Record<string, Record<string, number[]>> = {}
      ENGLISH_CLASSES.forEach(c => { readingByClassDate[c] = {} })
      reading.forEach(r => {
        const s = students.find(st => st.id === r.student_id)
        if (!s || !readingByClassDate[s.english_class]) return
        const month = r.date.slice(0, 7) // YYYY-MM
        if (!readingByClassDate[s.english_class][month]) readingByClassDate[s.english_class][month] = []
        readingByClassDate[s.english_class][month].push(r.cwpm)
      })
      // Convert to monthly averages
      const readingTrends: Record<string, { month: string; avg: number }[]> = {}
      ENGLISH_CLASSES.forEach(c => {
        readingTrends[c] = Object.entries(readingByClassDate[c]).sort(([a], [b]) => a.localeCompare(b)).map(([month, vals]) => ({
          month, avg: vals.reduce((a, b) => a + b, 0) / vals.length
        }))
      })

      // --- Per-student growth (reading) ---
      const studentReadingHistory: Record<string, { date: string; cwpm: number }[]> = {}
      reading.forEach(r => {
        if (!studentReadingHistory[r.student_id]) studentReadingHistory[r.student_id] = []
        studentReadingHistory[r.student_id].push({ date: r.date, cwpm: r.cwpm })
      })

      setData({
        students, studentsByClass, todayByClass, attByClass, behByClass, flaggedCount,
        cwpmByClass, widaByClass, gradeAvgByClass, totalStudents: students.length,
        todayPresent: todayAtt.filter(a => a.status === 'present').length,
        todayAbsent: todayAtt.filter(a => a.status === 'absent').length,
        todayUnmarked: todayUnmarked.length,
        weeklyAtt, behaviorWeekly, topBeh, topAnt, readingTrends, studentReadingHistory,
        behaviorDetail, widaMap, recentAtt, reading,
      })
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!data) return null

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{ko ? '프로그램 개요' : 'Program Overview'}</h2>
        <p className="text-text-secondary text-sm mt-1">{data.totalStudents} {ko ? '명 학생' : 'students'} · {ENGLISH_CLASSES.length} {ko ? '개 반' : 'classes'}</p>
        <div className="flex gap-1 mt-4">
          {([
            { id: 'overview' as AdminTab, icon: BarChart3, label: ko ? '개요' : 'Overview' },
            { id: 'attendance' as AdminTab, icon: Calendar, label: ko ? '출석 추세' : 'Attendance Trends' },
            { id: 'reading' as AdminTab, icon: BookOpen, label: ko ? '읽기 성장' : 'Reading Progress' },
            { id: 'behavior' as AdminTab, icon: Activity, label: ko ? '행동 패턴' : 'Behavior Patterns' },
            { id: 'growth' as AdminTab, icon: TrendingUp, label: ko ? '성장 속도' : 'Growth Velocity' },
            { id: 'wida_corr' as AdminTab, icon: Users, label: ko ? 'WIDA 상관' : 'WIDA Correlation' },
            { id: 'domain_str' as AdminTab, icon: ClipboardCheck, label: ko ? '영역 강점' : 'Domain Strength' },
            { id: 'class_comp' as AdminTab, icon: BarChart3, label: ko ? '반 구성' : 'Class Composition' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${activeTab === tab.id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <OverviewTab data={data} ko={ko} />}
      {activeTab === 'attendance' && <AttendanceTrendsTab data={data} ko={ko} />}
      {activeTab === 'reading' && <ReadingProgressTab data={data} ko={ko} />}
      {activeTab === 'behavior' && <BehaviorPatternsTab data={data} ko={ko} />}
      {activeTab === 'growth' && <GrowthVelocityTab data={data} ko={ko} />}
      {activeTab === 'wida_corr' && <WIDACorrelationTab data={data} ko={ko} />}
      {activeTab === 'domain_str' && <DomainStrengthTab data={data} ko={ko} />}
      {activeTab === 'class_comp' && <ClassCompositionTab data={data} ko={ko} />}
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────

function OverviewTab({ data, ko }: { data: any; ko: boolean }) {
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  const students: any[] = data.students || []
  const history: Record<string, { date: string; cwpm: number }[]> = data.studentReadingHistory || {}

  // Build Needs Attention list across ALL classes
  const concerns: { name: string; cls: string; grade: number; reasons: string[] }[] = []
  students.forEach(s => {
    const reasons: string[] = []
    // High absence
    const absCount = (data.recentAtt || []).filter((a: any) => a.student_id === s.id && a.status === 'absent').length
    if (absCount >= 4) reasons.push(`${absCount} absences (30d)`)
    // Behavior incidents
    const behCount = (data.behaviorDetail || []).filter((b: any) => b.student_id === s.id).length
    if (behCount >= 5) reasons.push(`${behCount} behavior incidents (90d)`)
    // Reading decline
    const readings = history[s.id]
    if (readings && readings.length >= 2) {
      const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
      if (sorted[sorted.length - 1].cwpm < sorted[0].cwpm - 10) reasons.push(`CWPM dropped ${sorted[0].cwpm}→${sorted[sorted.length - 1].cwpm}`)
    }
    if (reasons.length > 0) concerns.push({ name: s.english_name, cls: s.english_class, grade: s.grade, reasons })
  })

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Needs Attention - TOP */}
      {concerns.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-display text-base font-semibold text-navy">{ko ? '주의 필요 학생' : 'Needs Attention'}</h3>
            <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">{concerns.length}</span>
          </div>
          <div className="space-y-2">
            {concerns.slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: classToColor(c.cls as EnglishClass), color: classToTextColor(c.cls as EnglishClass) }}>{c.cls}</span>
                <span className="text-[12px] font-medium text-navy w-28">{c.name}</span>
                <span className="text-[10px] text-text-tertiary">G{c.grade}</span>
                <div className="flex-1 flex flex-wrap gap-1">
                  {c.reasons.map((r, ri) => <span key={ri} className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">{r}</span>)}
                </div>
              </div>
            ))}
            {concerns.length > 8 && <p className="text-[10px] text-text-tertiary text-center">+{concerns.length - 8} more students</p>}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={Users} label={ko ? '전체 학생' : 'Total Students'} value={data.totalStudents} sub={`${ENGLISH_CLASSES.length} ${ko ? '개 반' : 'classes'}`} />
        <SummaryCard icon={ClipboardCheck} label={ko ? '오늘 출석' : "Today's Attendance"} value={`${data.todayPresent}/${data.totalStudents}`}
          sub={data.todayUnmarked > 0 ? `${data.todayUnmarked} ${ko ? '미확인' : 'unmarked'}` : (ko ? '전원 확인' : 'All marked')} alert={data.todayUnmarked > 0} />
        <SummaryCard icon={AlertTriangle} label={ko ? '행동 (30일)' : 'Behavior (30d)'} value={ENGLISH_CLASSES.reduce((sum: number, c: string) => sum + data.behByClass[c], 0)}
          sub={data.flaggedCount > 0 ? `${data.flaggedCount} ${ko ? '개 플래그' : 'flagged'}` : (ko ? '플래그 없음' : 'No flagged')} />
        <SummaryCard icon={BookOpen} label={ko ? '평균 CWPM' : 'Avg CWPM'} value={Math.round(avg(Object.values(data.cwpmByClass).flat() as number[]))} sub={ko ? '최신 읽기 유창성' : 'Latest fluency'} />
      </div>

      {/* Attendance rate */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 출석률 (30일)' : 'Attendance Rate by Class (30 days)'}</h3>
        <div className="space-y-3">
          {ENGLISH_CLASSES.map((cls: string) => { const a = data.attByClass[cls]; const rate = a.total > 0 ? (a.present / a.total) * 100 : 0; return (
            <div key={cls} className="flex items-center gap-3">
              <span className="text-[12px] font-bold w-24 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <div className="flex-1 h-6 bg-surface-alt rounded-lg overflow-hidden relative">
                <div className="h-full rounded-lg" style={{ width: `${rate}%`, backgroundColor: rate >= 95 ? '#22c55e' : rate >= 90 ? '#f59e0b' : '#ef4444' }} />
                <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold" style={{ color: rate > 50 ? 'white' : '#374151' }}>{rate.toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-text-tertiary w-24 text-right">{a.absent} absent / {a.tardy} tardy</span>
            </div>) })}
        </div>
      </div>

      {/* Grade avg + CWPM side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 성적 평균' : 'Grade Averages by Class'}</h3>
          <div className="space-y-3">{ENGLISH_CLASSES.map((cls: string) => { const a = data.gradeAvgByClass[cls]; return (
            <div key={cls} className="flex items-center gap-3">
              <span className="text-[11px] font-bold w-20 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden relative">{a != null ? <div className="h-full rounded-lg" style={{ width: `${a}%`, backgroundColor: a >= 80 ? '#22c55e' : a >= 60 ? '#f59e0b' : '#ef4444' }} /> : null}<span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold">{a != null ? `${a.toFixed(1)}%` : 'No data'}</span></div>
            </div>) })}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 평균 CWPM' : 'Average CWPM by Class'}</h3>
          <div className="space-y-3">{ENGLISH_CLASSES.map((cls: string) => { const cwpms = data.cwpmByClass[cls]; const ca = cwpms.length > 0 ? cwpms.reduce((a: number, b: number) => a + b, 0) / cwpms.length : null; const mx = Math.max(...Object.values(data.cwpmByClass).flat().map((v: any) => v || 0), 1); return (
            <div key={cls} className="flex items-center gap-3">
              <span className="text-[11px] font-bold w-20 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden relative">{ca != null ? <div className="h-full rounded-lg bg-blue-500" style={{ width: `${(ca / mx) * 100}%` }} /> : null}<span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold">{ca != null ? `${Math.round(ca)} CWPM` : 'No data'} <span className="text-text-tertiary ml-1">({cwpms.length})</span></span></div>
            </div>) })}</div>
        </div>
      </div>

      {/* Students by Class - BOTTOM */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 학생 수' : 'Students by Class'}</h3>
        <div className="grid grid-cols-6 gap-3">
          {ENGLISH_CLASSES.map((cls: string) => {
            const classStudents = students.filter(s => s.english_class === cls)
            const grades: Record<number, number> = {}
            classStudents.forEach(s => { grades[s.grade] = (grades[s.grade] || 0) + 1 })
            return (
              <div key={cls} className="text-center p-4 rounded-xl border border-border bg-surface-alt/30">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold mb-2" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
                <p className="text-2xl font-bold text-navy">{classStudents.length}</p>
                <div className="text-[9px] text-text-tertiary mt-1 space-x-1">
                  {Object.entries(grades).sort(([a], [b]) => Number(a) - Number(b)).map(([g, c]) => <span key={g}>G{g}:{c}</span>)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Trends ─────────────────────────────────────────────

function AttendanceTrendsTab({ data, ko }: { data: any; ko: boolean }) {
  const weeks: { week: string; present: number; absent: number; tardy: number; total: number }[] = data.weeklyAtt || []
  const maxTotal = Math.max(...weeks.map(w => w.total), 1)
  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-1">{ko ? '주간 출석 추세 (90일)' : 'Weekly Attendance Trends (90 days)'}</h3>
        <p className="text-[11px] text-text-tertiary mb-4">{ko ? '주별 출석, 결석, 지각 현황' : 'Present, absent, and tardy counts per week'}</p>
        {weeks.length === 0 ? <p className="text-text-tertiary text-center py-8">No attendance data</p> : (
          <div className="space-y-2">
            {weeks.map(w => { const rate = w.total > 0 ? (w.present / w.total) * 100 : 0; return (
              <div key={w.week} className="flex items-center gap-3">
                <span className="text-[10px] text-text-tertiary w-20 font-mono">{w.week.slice(5)}</span>
                <div className="flex-1 h-6 bg-surface-alt rounded-lg overflow-hidden flex">
                  <div className="h-full bg-green-500" style={{ width: `${(w.present / maxTotal) * 100}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${(w.absent / maxTotal) * 100}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${(w.tardy / maxTotal) * 100}%` }} />
                </div>
                <span className={`text-[10px] font-bold w-14 text-right ${rate >= 95 ? 'text-green-600' : rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{rate.toFixed(0)}%</span>
              </div>) })}
          </div>
        )}
        <div className="flex gap-4 mt-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> {ko ? '출석' : 'Present'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> {ko ? '결석' : 'Absent'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400" /> {ko ? '지각' : 'Tardy'}</span>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 오늘 출석 현황' : "Today's Attendance by Class"}</h3>
        <div className="grid grid-cols-6 gap-3">
          {ENGLISH_CLASSES.map((cls: string) => { const t = data.todayByClass[cls]; const done = t.marked === t.total; return (
            <div key={cls} className={`text-center p-4 rounded-xl border ${done ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
              <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold mb-2" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <p className={`text-lg font-bold ${done ? 'text-green-600' : 'text-amber-600'}`}>{t.marked}/{t.total}</p>
              <p className="text-[10px] text-text-tertiary">{done ? (ko ? '완료' : 'Complete') : `${t.total - t.marked} ${ko ? '명 남음' : 'remaining'}`}</p>
            </div>) })}
        </div>
      </div>
    </div>
  )
}

// ─── Reading Progress ──────────────────────────────────────────────

function ReadingProgressTab({ data, ko }: { data: any; ko: boolean }) {
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const students: any[] = data.students || []
  const reading: any[] = data.reading || []
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => a - b)

  // School year months: Mar-Feb
  const yearStart = schoolYear === '2025-2026' ? '2025-03' : '2026-03'
  const yearEnd = schoolYear === '2025-2026' ? '2026-02' : '2027-02'
  const schoolMonths: string[] = []
  let cur = new Date(yearStart + '-01')
  const end = new Date(yearEnd + '-28')
  while (cur <= end) {
    schoolMonths.push(cur.toISOString().slice(0, 7))
    cur.setMonth(cur.getMonth() + 1)
  }

  // Filter students by grade
  const filteredStudents = gradeFilter ? students.filter(s => s.grade === gradeFilter) : students
  const filteredIds = new Set(filteredStudents.map(s => s.id))

  // Build reading trends by class for filtered students within school year
  const readingByClassDate: Record<string, Record<string, number[]>> = {}
  ENGLISH_CLASSES.forEach(c => { readingByClassDate[c] = {} })
  reading.forEach((r: any) => {
    const s = students.find((st: any) => st.id === r.student_id)
    if (!s || !filteredIds.has(s.id) || !readingByClassDate[s.english_class]) return
    const month = r.date.slice(0, 7)
    if (month < yearStart || month > yearEnd) return
    if (!readingByClassDate[s.english_class][month]) readingByClassDate[s.english_class][month] = []
    readingByClassDate[s.english_class][month].push(r.cwpm)
  })
  const trends: Record<string, Record<string, number>> = {}
  ENGLISH_CLASSES.forEach(c => {
    trends[c] = {}
    Object.entries(readingByClassDate[c]).forEach(([month, vals]) => {
      trends[c][month] = vals.reduce((a, b) => a + b, 0) / vals.length
    })
  })

  // Grade-level trends
  const readingByGradeDate: Record<number, Record<string, number[]>> = {}
  uniqueGrades.forEach(g => { readingByGradeDate[g] = {} })
  reading.forEach((r: any) => {
    const s = students.find((st: any) => st.id === r.student_id)
    if (!s || !readingByGradeDate[s.grade]) return
    const month = r.date.slice(0, 7)
    if (month < yearStart || month > yearEnd) return
    if (!readingByGradeDate[s.grade][month]) readingByGradeDate[s.grade][month] = []
    readingByGradeDate[s.grade][month].push(r.cwpm)
  })

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">School Year</span>
          {['2025-2026', '2026-2027'].map(yr => (
            <button key={yr} onClick={() => setSchoolYear(yr)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${schoolYear === yr ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>
              {yr}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Grade</span>
          <button onClick={() => setGradeFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === null ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>All</button>
          {uniqueGrades.map(g => (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>
              G{g}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly CWPM table by class */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-1">{ko ? '반별 월간 CWPM 추세' : 'Monthly CWPM by Class'}</h3>
        <p className="text-[11px] text-text-tertiary mb-4">{gradeFilter ? `Grade ${gradeFilter} students only` : 'All students'} · {schoolYear}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
              {schoolMonths.map(m => {
                const [y, mo] = m.split('-')
                return <th key={m} className="text-center px-2 py-2 text-[10px] text-text-secondary font-semibold">{MONTH_NAMES[parseInt(mo)]} {y.slice(2)}</th>
              })}
              <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{ko ? '변화' : 'Change'}</th>
            </tr></thead>
            <tbody>{ENGLISH_CLASSES.map((cls: string) => {
              const clsTrends = trends[cls] || {}
              const months = schoolMonths.filter(m => clsTrends[m])
              const first = months.length > 0 ? clsTrends[months[0]] : null
              const last = months.length > 0 ? clsTrends[months[months.length - 1]] : null
              const change = first && last ? last - first : null
              return (
                <tr key={cls} className="border-b border-border/50">
                  <td className="px-3 py-2"><span className="font-bold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span></td>
                  {schoolMonths.map(m => <td key={m} className="text-center px-2 py-2 font-medium">{clsTrends[m] ? Math.round(clsTrends[m]) : '—'}</td>)}
                  <td className={`text-center px-3 py-2 font-bold ${change == null ? 'text-text-tertiary' : change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change != null ? `${change >= 0 ? '+' : ''}${Math.round(change)}` : '—'}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </div>

      {/* Current CWPM by class */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 현재 CWPM' : 'Current CWPM by Class'}</h3>
        <div className="space-y-3">{ENGLISH_CLASSES.map((cls: string) => {
          const classStudents = filteredStudents.filter(s => s.english_class === cls)
          const cwpms = classStudents.map(s => {
            const readings = data.studentReadingHistory[s.id]
            return readings && readings.length > 0 ? readings[readings.length - 1].cwpm : null
          }).filter((c: any): c is number => c != null)
          const sorted = [...cwpms].sort((a, b) => a - b)
          const lo = sorted[0] || 0; const hi = sorted[sorted.length - 1] || 0
          const avg = cwpms.length > 0 ? cwpms.reduce((a: number, b: number) => a + b, 0) / cwpms.length : 0
          const mx = 180
          return (
            <div key={cls} className="flex items-center gap-3">
              <span className="text-[11px] font-bold w-20 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <div className="flex-1 h-6 bg-surface-alt rounded-lg overflow-hidden relative">
                {cwpms.length > 0 && <><div className="absolute h-full bg-blue-200 rounded-lg" style={{ left: `${(lo / mx) * 100}%`, width: `${((hi - lo) / mx) * 100}%` }} />
                <div className="absolute h-full w-0.5 bg-blue-600" style={{ left: `${(avg / mx) * 100}%` }} /></>}
                <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold z-10">{cwpms.length > 0 ? `${lo}–${hi} (avg ${Math.round(avg)})` : 'No data'}</span>
              </div>
              <span className="text-[10px] text-text-tertiary w-10">{cwpms.length}</span>
            </div>
          )
        })}</div>
      </div>
    </div>
  )
}

// ─── Behavior Patterns ─────────────────────────────────────────────

function BehaviorPatternsTab({ data, ko }: { data: any; ko: boolean }) {
  const weekly: { week: string; count: number }[] = data.behaviorWeekly || []
  const topBeh: [string, number][] = data.topBeh || []
  const topAnt: [string, number][] = data.topAnt || []
  const maxWeekly = Math.max(...weekly.map(w => w.count), 1)
  const students: any[] = data.students || []
  const behaviorDetail: any[] = data.behaviorDetail || []

  // Students to watch: high negative behavior count (90 days)
  const behByStudent: Record<string, { name: string; cls: string; count: number; flagged: number }> = {}
  behaviorDetail.forEach(b => {
    const s = students.find((st: any) => st.id === b.student_id)
    if (!s) return
    if (!behByStudent[b.student_id]) behByStudent[b.student_id] = { name: s.english_name, cls: s.english_class, count: 0, flagged: 0 }
    behByStudent[b.student_id].count++
    if (b.flagged) behByStudent[b.student_id].flagged++
  })
  const studentsToWatch = Object.values(behByStudent).filter(s => s.count >= 3).sort((a, b) => b.count - a.count)

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Students to Watch */}
      {studentsToWatch.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="font-display text-base font-semibold text-navy">{ko ? '주의 학생' : 'Students to Watch'}</h3>
            <span className="text-[10px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">{studentsToWatch.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {studentsToWatch.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/60 rounded-lg px-3 py-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: classToColor(s.cls as EnglishClass), color: classToTextColor(s.cls as EnglishClass) }}>{s.cls}</span>
                <span className="text-[12px] font-medium text-navy">{s.name}</span>
                <span className="text-[10px] text-red-600 font-bold ml-auto">{s.count} incidents</span>
                {s.flagged > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">{s.flagged} flagged</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly trend chart */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-1">{ko ? '주간 행동 사건 추세 (90일)' : 'Weekly Behavior Incidents (90 days)'}</h3>
        <p className="text-[11px] text-text-tertiary mb-4">{ko ? '주별 전체 행동 기록 건수' : 'Total behavior logs per week across all classes'}</p>
        {weekly.length === 0 ? <p className="text-text-tertiary text-center py-8">No behavior data</p> : (
          <div className="space-y-1.5">
            {weekly.map(w => (
              <div key={w.week} className="flex items-center gap-3">
                <span className="text-[10px] text-text-tertiary w-20 font-mono">{w.week.slice(5)}</span>
                <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden">
                  <div className={`h-full rounded-lg ${w.count > 15 ? 'bg-red-500' : w.count > 8 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${(w.count / maxWeekly) * 100}%` }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right">{w.count}</span>
              </div>))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '가장 흔한 행동' : 'Most Common Behaviors'}</h3>
          {topBeh.length === 0 ? <p className="text-text-tertiary text-sm">No data</p> : (
            <div className="space-y-2">{topBeh.map(([label, count]) => { const maxB = topBeh[0]?.[1] || 1; return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] text-text-primary w-36 truncate" title={label}>{label}</span>
                <div className="flex-1 h-4 bg-surface-alt rounded overflow-hidden"><div className="h-full bg-red-400 rounded" style={{ width: `${(count / maxB) * 100}%` }} /></div>
                <span className="text-[11px] font-bold w-6 text-right">{count}</span>
              </div>) })}</div>
          )}
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '가장 흔한 선행사건' : 'Most Common Antecedents'}</h3>
          {topAnt.length === 0 ? <p className="text-text-tertiary text-sm">No data</p> : (
            <div className="space-y-2">{topAnt.map(([label, count]) => { const maxA = topAnt[0]?.[1] || 1; return (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] text-text-primary w-36 truncate" title={label}>{label}</span>
                <div className="flex-1 h-4 bg-surface-alt rounded overflow-hidden"><div className="h-full bg-amber-400 rounded" style={{ width: `${(count / maxA) * 100}%` }} /></div>
                <span className="text-[11px] font-bold w-6 text-right">{count}</span>
              </div>) })}</div>
          )}
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 행동 사건 (30일)' : 'Behavior Incidents by Class (30 days)'}</h3>
        <div className="grid grid-cols-6 gap-3">{ENGLISH_CLASSES.map((cls: string) => { const count = data.behByClass[cls]; return (
          <div key={cls} className="text-center p-4 rounded-xl border border-border bg-surface-alt/30">
            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold mb-2" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
            <p className={`text-2xl font-bold ${count > 10 ? 'text-red-600' : count > 5 ? 'text-amber-600' : 'text-navy'}`}>{count}</p>
            <p className="text-[10px] text-text-tertiary">{ko ? '건' : 'incidents'}</p>
          </div>) })}</div>
      </div>
    </div>
  )
}

// ─── Growth Velocity ───────────────────────────────────────────────

function GrowthVelocityTab({ data, ko }: { data: any; ko: boolean }) {
  const students: any[] = data.students || []
  const history: Record<string, { date: string; cwpm: number }[]> = data.studentReadingHistory || {}
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => a - b)

  const filteredStudents = gradeFilter ? students.filter(s => s.grade === gradeFilter) : students

  // Calculate growth rate (CWPM per month) for each student
  const growthData = filteredStudents.map(s => {
    const readings = history[s.id]
    if (!readings || readings.length < 2) return null
    const sorted = [...readings].sort((a, b) => a.date.localeCompare(b.date))
    const first = sorted[0], last = sorted[sorted.length - 1]
    const monthsDiff = Math.max(0.5, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
    const rate = (last.cwpm - first.cwpm) / monthsDiff
    return { ...s, cwpm: last.cwpm, rate, readings: sorted.length, firstDate: first.date, lastDate: last.date }
  }).filter(Boolean) as any[]

  const byClass: Record<string, any[]> = {}
  ENGLISH_CLASSES.forEach(c => { byClass[c] = growthData.filter(s => s.english_class === c).sort((a: any, b: any) => b.rate - a.rate) })
  const maxRate = Math.max(...growthData.map(s => Math.abs(s.rate)), 1)

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Teacher-facing description */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-navy mb-2">{ko ? '읽기 성장 속도란?' : 'What is Reading Growth Velocity?'}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-2">
          {ko ? '이 차트는 학생의 읽기 유창성이 얼마나 빠르게 성장하고 있는지를 보여줍니다.' : 'This shows how quickly each student is gaining reading fluency, measured in CWPM gained per month. A student reading 40 CWPM but gaining 8/month will overtake a student at 60 CWPM gaining 2/month within a semester.'}
        </p>
        <p className="text-[11px] text-text-tertiary leading-relaxed"><strong>{ko ? '왜 중요한가:' : 'Why it matters:'}</strong> {ko ? '평탄하거나 감소하는 성장은 학생이 정체되었음을 의미합니다.' : 'Flat or declining growth signals a student has plateaued and may need a different approach -- different reading level, more decodable texts, or a fluency intervention.'}</p>
        <p className="text-[11px] text-text-tertiary leading-relaxed mt-1"><strong>{ko ? '조치:' : 'What to do:'}</strong> {ko ? '빨간색 학생은 즉시 중재가 필요합니다.' : 'Red students need immediate intervention. Green students are on track. Look for students with high current CWPM but slow growth -- they may be coasting. Look for low CWPM but fast growth -- they are catching up and may need a level bump.'}</p>
      </div>

      {/* Grade filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Grade</span>
        <button onClick={() => setGradeFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === null ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>All ({growthData.length})</button>
        {uniqueGrades.map(g => {
          const count = growthData.filter(s => s.grade === g).length
          return (
            <button key={g} onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>
              G{g} ({count})
            </button>
          )
        })}
      </div>

      {ENGLISH_CLASSES.map((cls: string) => {
        const classStudents = byClass[cls] || []
        if (classStudents.length === 0) return null
        return (
          <div key={cls} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="font-bold px-2.5 py-1 rounded text-[11px]" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
              <span className="text-[11px] text-text-tertiary">{classStudents.length} students with 2+ assessments</span>
            </div>
            <div className="space-y-1.5">
              {classStudents.map((s: any) => {
                const color = s.rate > 3 ? 'bg-green-500' : s.rate > 0 ? 'bg-blue-400' : s.rate > -2 ? 'bg-amber-400' : 'bg-red-500'
                const textColor = s.rate > 3 ? 'text-green-700' : s.rate > 0 ? 'text-blue-700' : s.rate > -2 ? 'text-amber-700' : 'text-red-700'
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <span className="text-[11px] font-medium w-28 truncate" title={`${s.english_name} (${s.korean_name})`}>{s.english_name}</span>
                    <span className="text-[10px] text-text-tertiary w-16">{Math.round(s.cwpm)} CWPM</span>
                    <div className="flex-1 h-5 bg-surface-alt rounded-lg overflow-hidden relative">
                      {s.rate >= 0 ? (
                        <div className={`absolute h-full left-1/2 rounded-r-lg ${color}`} style={{ width: `${(s.rate / maxRate) * 50}%` }} />
                      ) : (
                        <div className={`absolute h-full rounded-l-lg ${color}`} style={{ right: '50%', width: `${(Math.abs(s.rate) / maxRate) * 50}%` }} />
                      )}
                      <div className="absolute h-full w-px bg-gray-300 left-1/2" />
                    </div>
                    <span className={`text-[11px] font-bold w-20 text-right ${textColor}`}>{s.rate >= 0 ? '+' : ''}{s.rate.toFixed(1)}/mo</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {growthData.length === 0 && <p className="text-text-tertiary text-center py-12">Need 2+ reading assessments per student to calculate growth velocity.</p>}
    </div>
  )
}

// ─── WIDA-to-Performance Correlation ──────────────────────────────

function WIDACorrelationTab({ data, ko }: { data: any; ko: boolean }) {
  const students: any[] = data.students || []
  const widaMap: Record<string, number> = data.widaMap || {}
  const gradeAvgByClass: Record<string, number | null> = data.gradeAvgByClass || {}
  const cwpmByClass: Record<string, number[]> = data.cwpmByClass || {}
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const uniqueGrades = Array.from(new Set(students.map((s: any) => s.grade))).sort((a: number, b: number) => a - b)
  const filteredStudents = gradeFilter ? students.filter((s: any) => s.grade === gradeFilter) : students

  // Build per-student data: wida level, latest cwpm, class
  const history: Record<string, { date: string; cwpm: number }[]> = data.studentReadingHistory || {}
  const scatterData = filteredStudents.map((s: any) => {
    const wida = widaMap[s.id]
    if (!wida) return null
    const readings = history[s.id]
    const latestCwpm = readings && readings.length > 0 ? readings[readings.length - 1].cwpm : null
    return { id: s.id, name: s.english_name, cls: s.english_class, wida, cwpm: latestCwpm }
  }).filter(Boolean) as any[]

  const maxCwpm = Math.max(...scatterData.map(s => s.cwpm || 0), 100)

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Grade filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Grade:</span>
        <button onClick={() => setGradeFilter(null)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${!gradeFilter ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>All</button>
        {uniqueGrades.map((g: number) => (
          <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>G{g}</button>
        ))}
        {gradeFilter && <span className="text-[10px] text-text-tertiary ml-2">{filteredStudents.length} students</span>}
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-navy mb-2">{ko ? 'WIDA 수준과 성적의 상관관계' : 'WIDA Level vs. Performance'}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-2">
          {ko ? '학생의 WIDA 수준이 실제 읽기 유창성과 어떤 관계가 있는지 보여줍니다.' : 'Shows the relationship between WIDA proficiency levels and actual reading fluency. You would expect higher WIDA = higher CWPM, but the interesting cases are the outliers.'}
        </p>
        <p className="text-[11px] text-text-tertiary leading-relaxed"><strong>{ko ? '왜 중요한가:' : 'Why it matters:'}</strong> {ko ? '이상치 학생들은 다른 중재가 필요합니다.' : 'Students above the trend line are outperforming their language level (resilient learners -- celebrate and study what is working). Students below are underperforming (may be disengaged, have other barriers, or need different scaffolding).'}</p>
        <p className="text-[11px] text-text-tertiary leading-relaxed mt-1"><strong>{ko ? '조치:' : 'What to do:'}</strong> {ko ? '아래쪽 이상치는 추가 지원이 필요하며, 위쪽 이상치는 수준 상향을 고려하세요.' : 'Outliers below the line need investigation -- are they getting the right scaffolds for their WIDA level? Outliers above may be ready for a class-level bump at the next leveling meeting.'}</p>
      </div>

      {/* Scatterplot as positioned dots */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">WIDA Level vs. CWPM</h3>
        <div className="relative h-[300px] border-l-2 border-b-2 border-gray-300 ml-8 mb-8">
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(pct => (
            <div key={pct} className="absolute left-0 flex items-center" style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}>
              <span className="text-[9px] text-text-tertiary absolute -left-8 w-7 text-right">{Math.round(maxCwpm * pct / 100)}</span>
              <div className="w-full border-t border-gray-100 absolute left-0" style={{ width: '100%' }} />
            </div>
          ))}
          {/* X-axis labels */}
          {[1, 2, 3, 4, 5, 6].map(lvl => (
            <span key={lvl} className="absolute text-[10px] font-semibold text-text-secondary" style={{ left: `${((lvl - 0.5) / 6) * 100}%`, bottom: '-24px', transform: 'translateX(-50%)' }}>L{lvl}</span>
          ))}
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map(lvl => (
            <div key={lvl} className="absolute border-l border-gray-100 h-full" style={{ left: `${(lvl / 6) * 100}%` }} />
          ))}
          {/* Dots */}
          {scatterData.map((s: any, i: number) => s.cwpm != null && (
            <div key={i} className="absolute w-3 h-3 rounded-full border border-white shadow-sm cursor-pointer hover:scale-150 transition-transform"
              style={{
                backgroundColor: classToColor(s.cls as EnglishClass),
                left: `${((s.wida - 0.5) / 6) * 100}%`,
                bottom: `${(s.cwpm / maxCwpm) * 100}%`,
                transform: 'translate(-50%, 50%)'
              }}
              title={`${s.name}: WIDA L${s.wida}, ${Math.round(s.cwpm)} CWPM (${s.cls})`}
            />
          ))}
          <span className="absolute -left-8 top-1/2 -rotate-90 text-[9px] text-text-tertiary font-semibold origin-center" style={{ transform: 'translateX(-100%) rotate(-90deg)' }}>CWPM</span>
          <span className="absolute bottom-[-36px] left-1/2 text-[9px] text-text-tertiary font-semibold" style={{ transform: 'translateX(-50%)' }}>WIDA Level</span>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {ENGLISH_CLASSES.map((cls: string) => (
            <span key={cls} className="inline-flex items-center gap-1.5 text-[10px] font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: classToColor(cls as EnglishClass) }} />
              {cls}
            </span>
          ))}
        </div>
      </div>

      {/* Summary table: avg WIDA and avg CWPM by class */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-3">{ko ? '반별 요약' : 'Class-Level Summary'}</h3>
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-secondary">
            <th className="text-left px-3 py-2">Class</th>
            <th className="text-center px-3 py-2">Students with WIDA</th>
            <th className="text-center px-3 py-2">Avg WIDA</th>
            <th className="text-center px-3 py-2">Avg CWPM</th>
          </tr></thead>
          <tbody>{ENGLISH_CLASSES.map((cls: string) => {
            const classStudents = scatterData.filter(s => s.cls === cls)
            const avgWida = classStudents.length > 0 ? classStudents.reduce((a: number, b: any) => a + b.wida, 0) / classStudents.length : null
            const withCwpm = classStudents.filter(s => s.cwpm != null)
            const avgCwpm = withCwpm.length > 0 ? withCwpm.reduce((a: number, b: any) => a + b.cwpm, 0) / withCwpm.length : null
            return (
              <tr key={cls} className="border-b border-border/50">
                <td className="px-3 py-2"><span className="font-bold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span></td>
                <td className="text-center px-3 py-2">{classStudents.length}</td>
                <td className="text-center px-3 py-2 font-semibold text-purple-700">{avgWida ? `L${avgWida.toFixed(1)}` : '--'}</td>
                <td className="text-center px-3 py-2 font-semibold text-navy">{avgCwpm ? Math.round(avgCwpm) : '--'}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Domain Strength Profiles ─────────────────────────────────────

function DomainStrengthTab({ data, ko }: { data: any; ko: boolean }) {
  const [domainData, setDomainData] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const students: any[] = data.students || []
  const uniqueGrades = Array.from(new Set(students.map((s: any) => s.grade))).sort((a: number, b: number) => a - b)

  useEffect(() => {
    (async () => {
      const { data: semGrades } = await supabase.from('semester_grades').select('student_id, domain, calculated_grade, final_grade')
      const filteredStudents = gradeFilter ? students.filter((s: any) => s.grade === gradeFilter) : students
      const filteredIds = new Set(filteredStudents.map((s: any) => s.id))
      const byClass: Record<string, Record<string, number[]>> = {}
      ENGLISH_CLASSES.forEach(c => { byClass[c] = { reading: [], phonics: [], writing: [], speaking: [], language: [] } })
      ;(semGrades || []).forEach((sg: any) => {
        if (!filteredIds.has(sg.student_id)) return
        const s = students.find((st: any) => st.id === sg.student_id)
        const score = sg.final_grade ?? sg.calculated_grade
        if (s && score != null && byClass[s.english_class] && byClass[s.english_class][sg.domain]) {
          byClass[s.english_class][sg.domain].push(score)
        }
      })
      const avgByClass: Record<string, Record<string, number>> = {}
      ENGLISH_CLASSES.forEach(c => {
        avgByClass[c] = {}
        Object.entries(byClass[c]).forEach(([d, scores]) => {
          avgByClass[c][d] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        })
      })
      setDomainData(avgByClass)
      setLoading(false)
    })()
  }, [data.students, gradeFilter])

  const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const domainLabels: Record<string, string> = { reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards' }
  const domainColors: Record<string, string> = { reading: '#3b82f6', phonics: '#8b5cf6', writing: '#f59e0b', speaking: '#10b981', language: '#ec4899' }

  // SVG radar chart helper
  const radarSize = 200, cx = radarSize / 2, cy = radarSize / 2, maxR = 80
  const angleStep = (2 * Math.PI) / domains.length
  const point = (i: number, pct: number) => {
    const angle = angleStep * i - Math.PI / 2
    return { x: cx + Math.cos(angle) * (pct / 100) * maxR, y: cy + Math.sin(angle) * (pct / 100) * maxR }
  }

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      {/* Grade filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Grade:</span>
        <button onClick={() => setGradeFilter(null)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${!gradeFilter ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>All</button>
        {uniqueGrades.map((g: number) => (
          <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>G{g}</button>
        ))}
        {gradeFilter && <span className="text-[10px] text-text-tertiary ml-2">{students.filter((s: any) => s.grade === gradeFilter).length} students</span>}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-navy mb-2">{ko ? '영역별 강점 프로필' : 'What are Domain Strength Profiles?'}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-2">
          {ko ? '각 반의 5개 영역(읽기, 파닉스, 쓰기, 말하기, 언어) 평균 성적을 레이더 차트로 보여줍니다.' : 'Shows each class\'s average performance across the 5 domains (Reading, Phonics, Writing, Speaking, Language) as a radar chart. A balanced pentagon means even performance; an uneven shape reveals where the class is strong or weak.'}
        </p>
        <p className="text-[11px] text-text-tertiary leading-relaxed"><strong>{ko ? '왜 중요한가:' : 'Why it matters:'}</strong> {ko ? '교사가 어디에 집중해야 하는지 알 수 있습니다.' : 'Tells teachers exactly where to focus. If Writing is the weak point across the class, that is a teaching issue not a student issue -- adjust instruction accordingly.'}</p>
        <p className="text-[11px] text-text-tertiary leading-relaxed mt-1"><strong>{ko ? '조치:' : 'What to do:'}</strong> {ko ? '가장 약한 영역에 수업 시간을 더 배정하세요.' : 'Allocate more instructional time to the weakest domain. If all classes are weak in the same area, it may be a curriculum gap. Compare across classes to see if one teacher is producing stronger results in a domain -- pair them with struggling teachers for coaching.'}</p>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div> : (
        <div className="grid grid-cols-3 gap-4">
          {ENGLISH_CLASSES.map((cls: string) => {
            const avgs = domainData[cls] || {}
            const hasData = domains.some(d => (avgs[d] || 0) > 0)
            const points = domains.map((d, i) => point(i, avgs[d] || 0))
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
            const weakest = domains.reduce((a, b) => (avgs[a] || 0) < (avgs[b] || 0) ? a : b)
            const strongest = domains.reduce((a, b) => (avgs[a] || 0) > (avgs[b] || 0) ? a : b)
            return (
              <div key={cls} className="bg-surface border border-border rounded-xl p-4 text-center">
                <span className="font-bold px-2.5 py-1 rounded text-[11px] inline-block mb-3" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
                {!hasData ? <p className="text-text-tertiary text-[11px] py-8">No grade data</p> : (
                  <>
                    <svg width={radarSize} height={radarSize} className="mx-auto">
                      {/* Grid rings */}
                      {[20, 40, 60, 80, 100].map(pct => (
                        <polygon key={pct} points={domains.map((_, i) => { const p = point(i, pct); return `${p.x},${p.y}` }).join(' ')}
                          fill="none" stroke="#e2e8f0" strokeWidth={pct === 60 ? 1.5 : 0.5} />
                      ))}
                      {/* Axes */}
                      {domains.map((_, i) => { const p = point(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} /> })}
                      {/* Data polygon */}
                      <polygon points={points.map(p => `${p.x},${p.y}`).join(' ')} fill={classToColor(cls as EnglishClass)} fillOpacity={0.2} stroke={classToColor(cls as EnglishClass)} strokeWidth={2} />
                      {/* Domain labels */}
                      {domains.map((d, i) => {
                        const labelP = point(i, 120)
                        return <text key={d} x={labelP.x} y={labelP.y} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight={600} fill={domainColors[d]}>{domainLabels[d]}</text>
                      })}
                    </svg>
                    <div className="flex justify-center gap-4 mt-2 text-[10px]">
                      <span className="text-green-700">Strongest: <strong>{domainLabels[strongest]} ({Math.round(avgs[strongest] || 0)}%)</strong></span>
                      <span className="text-red-700">Weakest: <strong>{domainLabels[weakest]} ({Math.round(avgs[weakest] || 0)}%)</strong></span>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Class Composition Analytics ──────────────────────────────────

function ClassCompositionTab({ data, ko }: { data: any; ko: boolean }) {
  const students: any[] = data.students || []
  const widaMap: Record<string, number> = data.widaMap || {}
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const [classFilter, setClassFilter] = useState<string | null>(null)
  const uniqueGrades = Array.from(new Set(students.map(s => s.grade))).sort((a, b) => a - b)

  const filteredStudents = students.filter(s =>
    (!gradeFilter || s.grade === gradeFilter) &&
    (!classFilter || s.english_class === classFilter)
  )
  const displayClasses = classFilter ? [classFilter] : ENGLISH_CLASSES

  // Build CWPM data for filtered students
  const history: Record<string, { date: string; cwpm: number }[]> = data.studentReadingHistory || {}
  const cwpmByClass: Record<string, number[]> = {}
  displayClasses.forEach((c: string) => { cwpmByClass[c] = [] })
  filteredStudents.forEach(s => {
    const readings = history[s.id]
    if (readings && readings.length > 0 && cwpmByClass[s.english_class]) {
      cwpmByClass[s.english_class].push(readings[readings.length - 1].cwpm)
    }
  })

  // Compute stats per class: min, max, median, q1, q3, mean for CWPM
  const classStats = (displayClasses as string[]).map((cls: string) => {
    const cwpms = [...(cwpmByClass[cls] || [])].sort((a, b) => a - b)
    const n = cwpms.length
    if (n === 0) return { cls, n: 0, min: 0, max: 0, q1: 0, median: 0, q3: 0, mean: 0, spread: 0 }
    const median = n % 2 === 0 ? (cwpms[n / 2 - 1] + cwpms[n / 2]) / 2 : cwpms[Math.floor(n / 2)]
    const q1 = cwpms[Math.floor(n * 0.25)] || cwpms[0]
    const q3 = cwpms[Math.floor(n * 0.75)] || cwpms[n - 1]
    const mean = cwpms.reduce((a, b) => a + b, 0) / n
    const spread = q3 - q1
    return { cls, n, min: cwpms[0], max: cwpms[n - 1], q1, median, q3, mean, spread }
  })

  const maxCwpm = Math.max(...classStats.map(s => s.max), 100)

  // WIDA distribution by class
  const widaByClass: Record<string, number[]> = {}
  ;(displayClasses as string[]).forEach(c => { widaByClass[c] = [] })
  filteredStudents.forEach(s => {
    const w = widaMap[s.id]
    if (w && widaByClass[s.english_class]) widaByClass[s.english_class].push(w)
  })

  // Grade spread by class
  const gradesByClass: Record<string, number[]> = {}
  ;(displayClasses as string[]).forEach(c => { gradesByClass[c] = filteredStudents.filter(s => s.english_class === c).map(s => s.grade) })

  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <h3 className="font-display text-base font-semibold text-navy mb-2">{ko ? '반 구성 분석이란?' : 'What is Class Composition Analysis?'}</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-2">
          {ko ? '각 반의 학생 분포를 보여줍니다.' : 'Shows the spread (range and distribution) of key metrics within each class. Ideally, ability-grouped classes should have tight clusters. Wide spreads indicate the class may have too much internal variation for effective whole-group instruction.'}
        </p>
        <p className="text-[11px] text-text-tertiary leading-relaxed"><strong>{ko ? '왜 중요한가:' : 'Why it matters:'}</strong> {ko ? '넓은 분포는 차별화된 수업이 필요함을 의미합니다.' : 'A class where the top student reads at 120 CWPM and the bottom at 20 CWPM is essentially two classes. The teacher cannot effectively reach both ends. This data drives leveling decisions.'}</p>
        <p className="text-[11px] text-text-tertiary leading-relaxed mt-1"><strong>{ko ? '조치:' : 'What to do:'}</strong> {ko ? 'IQR이 큰 반은 수준 조정이 필요합니다.' : 'Classes with wide IQR (the dark bar) need attention at leveling meetings. Consider whether borderline students should move classes. Also compare WIDA spreads -- a class with L1 through L5 needs more differentiation than one clustered at L2-L3.'}</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Grade</span>
          <button onClick={() => setGradeFilter(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === null ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
          {uniqueGrades.map(g => (
            <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>G{g}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Class</span>
          <button onClick={() => setClassFilter(null)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${classFilter === null ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
          {ENGLISH_CLASSES.map(c => (
            <button key={c} onClick={() => setClassFilter(c)} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${classFilter === c ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Box-and-whisker style chart for CWPM */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? 'CWPM 분포 (반별)' : 'CWPM Distribution by Class'}</h3>
        <div className="space-y-4">
          {classStats.map(s => s.n > 0 && (
            <div key={s.cls} className="flex items-center gap-3">
              <span className="text-[11px] font-bold w-20 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(s.cls as EnglishClass), color: classToTextColor(s.cls as EnglishClass) }}>{s.cls}</span>
              <div className="flex-1 h-8 bg-surface-alt rounded-lg relative">
                {/* Whisker line (min to max) */}
                <div className="absolute h-px bg-gray-400 top-1/2" style={{ left: `${(s.min / maxCwpm) * 100}%`, width: `${((s.max - s.min) / maxCwpm) * 100}%` }} />
                {/* IQR box (q1 to q3) */}
                <div className="absolute h-4 top-1/2 -translate-y-1/2 rounded border border-gray-400" style={{ left: `${(s.q1 / maxCwpm) * 100}%`, width: `${((s.q3 - s.q1) / maxCwpm) * 100}%`, backgroundColor: classToColor(s.cls as EnglishClass), opacity: 0.3 }} />
                {/* Median line */}
                <div className="absolute h-5 w-0.5 top-1/2 -translate-y-1/2 bg-navy" style={{ left: `${(s.median / maxCwpm) * 100}%` }} />
                {/* Min/max whisker caps */}
                <div className="absolute h-2 w-px bg-gray-400 top-1/2 -translate-y-1/2" style={{ left: `${(s.min / maxCwpm) * 100}%` }} />
                <div className="absolute h-2 w-px bg-gray-400 top-1/2 -translate-y-1/2" style={{ left: `${(s.max / maxCwpm) * 100}%` }} />
              </div>
              <div className="text-[10px] text-text-secondary w-44 text-right">
                <span>{s.min}–{s.max}</span> <span className="text-text-tertiary">(IQR: {Math.round(s.spread)})</span> <span className="font-semibold text-navy">med {Math.round(s.median)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WIDA level distribution */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? 'WIDA 수준 분포' : 'WIDA Level Distribution by Class'}</h3>
        <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min((displayClasses as string[]).length, 6)}, 1fr)` }}>
          {(displayClasses as string[]).map((cls: string) => {
            const widas = widaByClass[cls] || []
            const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
            widas.forEach(w => { counts[Math.round(w)] = (counts[Math.round(w)] || 0) + 1 })
            const maxCount = Math.max(...Object.values(counts), 1)
            return (
              <div key={cls} className="text-center">
                <span className="inline-block font-bold px-2 py-0.5 rounded text-[10px] mb-2" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
                <div className="flex items-end justify-center gap-0.5 h-12">
                  {[1, 2, 3, 4, 5, 6].map(lvl => (
                    <div key={lvl} className="w-3 bg-purple-400 rounded-t" style={{ height: `${(counts[lvl] / maxCount) * 48}px`, opacity: counts[lvl] > 0 ? 1 : 0.15 }}
                      title={`L${lvl}: ${counts[lvl]} students`} />
                  ))}
                </div>
                <div className="flex justify-center gap-0.5 mt-0.5">{[1, 2, 3, 4, 5, 6].map(l => <span key={l} className="text-[7px] text-text-tertiary w-3 text-center">{l}</span>)}</div>
                <p className="text-[9px] text-text-tertiary mt-1">{widas.length} rated</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grade distribution per class */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-3">{ko ? '학년 구성' : 'Grade Level Mix by Class'}</h3>
        <p className="text-[11px] text-text-tertiary mb-4">{ko ? '각 반에 몇 학년 학생이 있는지 보여줍니다.' : 'Shows which grade levels are represented in each class. Multi-grade classes require more differentiation.'}</p>
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-secondary">
            <th className="text-left px-3 py-2">Class</th>
            {GRADES.map(g => <th key={g} className="text-center px-2 py-2">G{g}</th>)}
            <th className="text-center px-3 py-2">Total</th>
            <th className="text-center px-3 py-2">Grades Span</th>
          </tr></thead>
          <tbody>{(displayClasses as string[]).map((cls: string) => {
            const grades = gradesByClass[cls] || []
            const counts: Record<number, number> = {}
            grades.forEach(g => { counts[g] = (counts[g] || 0) + 1 })
            const uniqueGrades = Object.keys(counts).length
            return (
              <tr key={cls} className="border-b border-border/50">
                <td className="px-3 py-2"><span className="font-bold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span></td>
                {GRADES.map(g => <td key={g} className={`text-center px-2 py-2 ${counts[g] ? 'font-semibold' : 'text-text-tertiary'}`}>{counts[g] || '—'}</td>)}
                <td className="text-center px-3 py-2 font-semibold">{grades.length}</td>
                <td className={`text-center px-3 py-2 font-semibold ${uniqueGrades >= 4 ? 'text-amber-600' : 'text-navy'}`}>{uniqueGrades} {uniqueGrades >= 4 ? '(wide)' : ''}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, sub, alert }: { icon: any; label: string; value: string | number; sub: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${alert ? 'bg-amber-50 border-amber-200' : 'bg-surface border-border'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={alert ? 'text-amber-600' : 'text-navy'} />
        <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-amber-600' : 'text-navy'}`}>{value}</p>
      {sub && <p className="text-[11px] text-text-tertiary mt-0.5">{sub}</p>}
    </div>
  )
}
