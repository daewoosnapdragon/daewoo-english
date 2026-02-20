'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass, GRADES } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, TrendingUp, Users, BookOpen, ClipboardCheck, AlertTriangle, Download, Calendar, BarChart3, Activity } from 'lucide-react'
import { exportToCSV } from '@/lib/export'

type AdminTab = 'overview' | 'attendance' | 'reading' | 'behavior'

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

      const [studentsRes, attendanceRes, recentAttRes, allAttRes, behaviorRes, behaviorDetailRes, readingRes, gradesRes, semRes] = await Promise.all([
        supabase.from('students').select('id, english_name, korean_name, grade, english_class, is_active').eq('is_active', true),
        supabase.from('attendance').select('student_id, status, date').eq('date', today),
        supabase.from('attendance').select('student_id, status, date').gte('date', thirtyDaysAgo),
        supabase.from('attendance').select('student_id, status, date').gte('date', ninetyDaysAgo),
        supabase.from('behavior_logs').select('student_id, date, flagged').gte('date', thirtyDaysAgo),
        supabase.from('behavior_logs').select('student_id, date, flagged, antecedent, behavior, consequence').gte('date', ninetyDaysAgo),
        supabase.from('reading_assessments').select('student_id, cwpm, date, accuracy_rate').order('date', { ascending: true }),
        supabase.from('semesters').select('id').eq('is_active', true).limit(1).single(),
        supabase.from('wida_profiles').select('student_id, overall_level'),
      ])

      const students = studentsRes.data || []
      const todayAtt = attendanceRes.data || []
      const recentAtt = recentAttRes.data || []
      const allAtt = allAttRes.data || []
      const behavior = behaviorRes.data || []
      const behaviorDetail = behaviorDetailRes.data || []
      const reading = readingRes.data || []
      const wida = semRes.data || []

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
      const widaMap: Record<string, number> = {}
      ;(wida as any[]).forEach(w => { widaMap[w.student_id] = w.overall_level })
      const widaByClass: Record<string, Record<number, number>> = {}
      ENGLISH_CLASSES.forEach(c => { widaByClass[c] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 } })
      students.forEach(s => {
        const lvl = widaMap[s.id]
        if (lvl && widaByClass[s.english_class]) widaByClass[s.english_class][Math.round(lvl)] = (widaByClass[s.english_class][Math.round(lvl)] || 0) + 1
      })

      // --- Grade averages by class ---
      let gradeAvgByClass: Record<string, number | null> = {}
      if (gradesRes.data) {
        const semId = gradesRes.data.id
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
        behaviorDetail,
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
    </div>
  )
}

// ─── Overview Tab ──────────────────────────────────────────────────

function OverviewTab({ data, ko }: { data: any; ko: boolean }) {
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard icon={Users} label={ko ? '전체 학생' : 'Total Students'} value={data.totalStudents} sub={`${ENGLISH_CLASSES.length} ${ko ? '개 반' : 'classes'}`} />
        <SummaryCard icon={ClipboardCheck} label={ko ? '오늘 출석' : "Today's Attendance"} value={`${data.todayPresent}/${data.totalStudents}`}
          sub={data.todayUnmarked > 0 ? `${data.todayUnmarked} ${ko ? '미확인' : 'unmarked'}` : (ko ? '전원 확인' : 'All marked')} alert={data.todayUnmarked > 0} />
        <SummaryCard icon={AlertTriangle} label={ko ? '행동 (30일)' : 'Behavior (30d)'} value={ENGLISH_CLASSES.reduce((sum: number, c: string) => sum + data.behByClass[c], 0)}
          sub={data.flaggedCount > 0 ? `${data.flaggedCount} ${ko ? '개 플래그' : 'flagged'}` : (ko ? '플래그 없음' : 'No flagged')} />
        <SummaryCard icon={BookOpen} label={ko ? '평균 CWPM' : 'Avg CWPM'} value={Math.round(avg(Object.values(data.cwpmByClass).flat() as number[]))} sub={ko ? '최신 읽기 유창성' : 'Latest fluency'} />
      </div>
      {/* Attendance rate + Grade avg + CWPM side by side */}
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
  const trends: Record<string, { month: string; avg: number }[]> = data.readingTrends || {}
  const allMonths = Array.from(new Set(Object.values(trends).flatMap((t: any) => t.map((r: any) => r.month)))).sort()
  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-1">{ko ? '반별 월간 CWPM 추세' : 'Monthly CWPM by Class'}</h3>
        <p className="text-[11px] text-text-tertiary mb-4">{ko ? '월별 평균 읽기 유창성 점수' : 'Average reading fluency scores per month'}</p>
        {allMonths.length === 0 ? <p className="text-text-tertiary text-center py-8">No reading data</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                {allMonths.map(m => <th key={m} className="text-center px-2 py-2 text-[10px] text-text-secondary font-semibold">{m.slice(5)}</th>)}
                <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{ko ? '변화' : 'Change'}</th>
              </tr></thead>
              <tbody>{ENGLISH_CLASSES.map((cls: string) => { const t = trends[cls] || []; const first = t[0]?.avg; const last = t[t.length - 1]?.avg; const change = first && last ? last - first : null; return (
                <tr key={cls} className="border-b border-border/50">
                  <td className="px-3 py-2"><span className="font-bold px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span></td>
                  {allMonths.map(m => { const entry = t.find((r: any) => r.month === m); return <td key={m} className="text-center px-2 py-2 font-medium">{entry ? Math.round(entry.avg) : '—'}</td> })}
                  <td className={`text-center px-3 py-2 font-bold ${change == null ? 'text-text-tertiary' : change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change != null ? `${change >= 0 ? '+' : ''}${Math.round(change)}` : '—'}</td>
                </tr>) })}</tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="font-display text-base font-semibold text-navy mb-4">{ko ? '반별 현재 CWPM' : 'Current CWPM by Class'}</h3>
        <div className="space-y-3">{ENGLISH_CLASSES.map((cls: string) => { const cwpms: number[] = data.cwpmByClass[cls] || []; const sorted = [...cwpms].sort((a, b) => a - b); const lo = sorted[0] || 0; const hi = sorted[sorted.length - 1] || 0; const avg = cwpms.length > 0 ? cwpms.reduce((a: number, b: number) => a + b, 0) / cwpms.length : 0; const maxAll = Math.max(...Object.values(data.cwpmByClass).flat().map((v: any) => v || 0), 1); return (
          <div key={cls} className="flex items-center gap-3">
            <span className="text-[11px] font-bold w-20 px-2 py-0.5 rounded text-center" style={{ backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
            <div className="flex-1 h-6 bg-surface-alt rounded-lg overflow-hidden relative">
              {cwpms.length > 0 && <><div className="absolute h-full bg-blue-200 rounded-lg" style={{ left: `${(lo / maxAll) * 100}%`, width: `${((hi - lo) / maxAll) * 100}%` }} />
              <div className="absolute h-full w-0.5 bg-blue-600" style={{ left: `${(avg / maxAll) * 100}%` }} /></>}
              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold z-10">{cwpms.length > 0 ? `${lo}–${hi} (avg ${Math.round(avg)})` : 'No data'}</span>
            </div>
            <span className="text-[10px] text-text-tertiary w-10">{cwpms.length}</span>
          </div>) })}</div>
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
  return (
    <div className="px-10 py-6 space-y-6 max-w-[1200px]">
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
