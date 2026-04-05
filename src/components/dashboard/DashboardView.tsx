'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useClassCounts } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { Bell, Plus, X, Loader2, ChevronLeft, ChevronRight, Trash2, Pencil, GraduationCap, ClipboardCheck, TrendingDown, AlertTriangle, FileX, Sparkles, Eye, BookOpen, CalendarDays, UserCheck, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import WeeklySchedule from './WeeklySchedule'

const EVENT_TYPES = [
  { value: 'day_off', label: 'Day Off', color: '#22C55E', bg: 'bg-green-100 text-green-800' },
  { value: 'deadline', label: 'Deadline', color: '#EF4444', bg: 'bg-red-100 text-red-800' },
  { value: 'meeting', label: 'Meeting', color: '#A855F7', bg: 'bg-purple-100 text-purple-800' },
  { value: 'midterm', label: 'Midterm', color: '#F97316', bg: 'bg-orange-100 text-orange-800' },
  { value: 'report_cards', label: 'Report Cards', color: '#0EA5E9', bg: 'bg-sky-100 text-sky-800' },
  { value: 'event', label: 'School Event', color: '#F59E0B', bg: 'bg-amber-100 text-amber-800' },
  { value: 'field_trip', label: 'Field Trip', color: '#14B8A6', bg: 'bg-teal-100 text-teal-800' },
  { value: 'testing', label: 'Testing', color: '#EC4899', bg: 'bg-pink-100 text-pink-800' },
  { value: 'other', label: 'Other', color: '#6B7280', bg: 'bg-gray-100 text-gray-700' },
]

interface CalEvent { id: string; title: string; date: string; type: string; description: string; created_by: string | null; created_at: string; show_on_parent_calendar?: boolean; target_grades?: number[] | null }
interface FlaggedEntry { id: string; student_id: string; date: string; type: string; note: string; time: string; behaviors: string[]; antecedents: string[]; consequences: string[]; intensity: number; frequency: number; activity: string; duration: string; is_flagged: boolean; teacher_name: string; student_name: string; student_class: string; created_at: string }

// ─── Shared Dashboard Data ───────────────────────────────────────
// Fetches common data once and shares across all sub-components.
// Before: ~30 independent Supabase round trips on mount.
// After: ~10 queries in parallel via Promise.all.

interface DashboardStudent { id: string; english_name: string; english_class: string; grade: number }
interface SharedDashboardData {
  students: DashboardStudent[]
  activeSemester: any | null
  todayAttendanceIds: Set<string>
  todayEvents: any[]
  todayBehaviorCount: number
  readingAssessments: { student_id: string; cwpm: number | null; date: string }[]
  absences30d: { student_id: string }[]
  behaviorLogs28d: { student_id: string; date: string }[]
  semesterAssessments: any[]
  semesterGrades: any[]
  loading: boolean
}

function useDashboardData(currentTeacher: any): SharedDashboardData {
  const [data, setData] = useState<Omit<SharedDashboardData, 'loading'>>({
    students: [], activeSemester: null, todayAttendanceIds: new Set(),
    todayEvents: [], todayBehaviorCount: 0, readingAssessments: [],
    absences30d: [], behaviorLogs28d: [], semesterAssessments: [], semesterGrades: [],
  })
  const [loading, setLoading] = useState(true)

  const isTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'
  const isAdmin = currentTeacher?.role === 'admin'
  const classFilter = isTeacher ? currentTeacher?.english_class : null

  useEffect(() => {
    if (!currentTeacher) return
    let cancelled = false
    ;(async () => {
      const today = getKSTDateString()
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const twentyEightDaysAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]

      // Phase 1: Fetch students + semester (needed to scope other queries)
      let studQuery = supabase.from('students').select('id, english_name, english_class, grade').eq('is_active', true)
      if (classFilter) studQuery = studQuery.eq('english_class', classFilter)

      const [studRes, semRes] = await Promise.all([
        studQuery,
        supabase.from('semesters').select('*').eq('is_active', true).single(),
      ])
      if (cancelled) return

      const students: DashboardStudent[] = studRes.data || []
      const activeSemester = semRes.data
      const studentIds = students.map(s => s.id)

      if (studentIds.length === 0) {
        setData(prev => ({ ...prev, students, activeSemester }))
        setLoading(false)
        return
      }

      // Phase 2: All other queries in parallel (scoped to student IDs)
      const [attRes, eventsRes, behaviorCountRes, readingRes, absRes, behaviorLogsRes, assessmentsRes] = await Promise.all([
        // Today's attendance
        supabase.from('attendance').select('student_id').eq('date', today).in('student_id', studentIds),
        // Today's calendar events
        supabase.from('calendar_events').select('title, type').eq('date', today),
        // Today's behavior log count
        supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('date', today),
        // All reading assessments (for growth tracking in InsightsBanner + missing ORF in Watchlist)
        supabase.from('reading_assessments').select('student_id, cwpm, date').in('student_id', studentIds).order('date', { ascending: true }),
        // Absences in last 30 days
        supabase.from('attendance').select('student_id').eq('status', 'absent').in('student_id', studentIds).gte('date', thirtyDaysAgo),
        // Behavior logs in last 28 days (covers both 14-day and 28-day windows)
        supabase.from('behavior_logs').select('student_id, date').in('student_id', studentIds).gte('date', twentyEightDaysAgo),
        // Semester assessments (if we have a semester)
        activeSemester
          ? supabase.from('assessments').select('id, domain, name, english_class, grade, max_score, created_at').eq('semester_id', activeSemester.id)
          : Promise.resolve({ data: [] as any[] }),
      ])
      if (cancelled) return

      // Fetch grades for semester assessments (separate because we need assessment IDs)
      const semAssessments = (assessmentsRes as any).data || []
      let semGrades: any[] = []
      if (semAssessments.length > 0) {
        const { data: grades } = await supabase.from('grades').select('student_id, assessment_id, score')
          .in('assessment_id', semAssessments.map((a: any) => a.id)).not('score', 'is', null)
        if (grades) semGrades = grades
      }
      if (cancelled) return

      setData({
        students,
        activeSemester,
        todayAttendanceIds: new Set((attRes.data || []).map((a: any) => a.student_id)),
        todayEvents: eventsRes.data || [],
        todayBehaviorCount: (behaviorCountRes as any).count || 0,
        readingAssessments: readingRes.data || [],
        absences30d: absRes.data || [],
        behaviorLogs28d: behaviorLogsRes.data || [],
        semesterAssessments: semAssessments,
        semesterGrades: semGrades,
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [currentTeacher?.id, classFilter, isAdmin])

  return useMemo(() => ({ ...data, loading }), [data, loading])
}

export default function DashboardView() {
  const { language, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const isTeacher = currentTeacher?.role === 'teacher'
  const [semesters, setSemesters] = useState<{ id: string; name: string; name_ko: string; is_active: boolean }[]>([])
  const [activeSem, setActiveSem] = useState<string>('')

  // Shared data: fetched once, shared across all sub-components
  const shared = useDashboardData(currentTeacher)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semesters').select('id, name, name_ko, is_active, type').order('start_date', { ascending: false })
      if (data && data.length > 0) {
        const activeSems = data.filter((s: any) => s.type !== 'archive')
        setSemesters(activeSems.length > 0 ? activeSems : data)
        const active = data.find((s: any) => s.is_active)
        setActiveSem(active?.name || data[0].name)
      } else {
        setActiveSem('Spring 2026')
      }
    })()
  }, [])

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  // Compute quick stats for hero card
  const totalStudents = shared.students.length
  const attendanceMarked = shared.todayAttendanceIds.size
  const attendancePct = totalStudents > 0 ? Math.round((attendanceMarked / totalStudents) * 100) : 0
  const urgentItems = shared.todayEvents.filter((ev: any) => ev.type === 'deadline' || ev.type === 'testing').length

  return (
    <div className="animate-fade-in">
      {/* Hero briefing card */}
      <div className="px-10 pt-7 pb-6 bg-gradient-to-br from-navy-dark via-navy to-navy-dark relative overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #FFB915 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-[24px] font-semibold tracking-tight text-white">
                {language === 'ko' ? '대시보드' : `${greeting}${currentTeacher?.name ? `, ${currentTeacher.name}` : ''}`}
              </h2>
              <p className="text-blue-200/40 text-[13px] mt-1">{dayStr}</p>
            </div>
            {semesters.length > 0 && (
              <select value={activeSem} onChange={(e: any) => setActiveSem(e.target.value)}
                className="px-3 py-2 border border-white/10 rounded-lg text-[12px] bg-white/5 text-blue-200/70 outline-none focus:border-gold/40 cursor-pointer">
                {semesters.map((sem: any) => (
                  <option key={sem.id} value={language === 'ko' ? sem.name_ko : sem.name} className="bg-navy-dark text-white">
                    {language === 'ko' ? sem.name_ko : sem.name}{sem.is_active ? ' *' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          {/* Quick stats row */}
          {!shared.loading && totalStudents > 0 && (
            <div className="flex gap-6 mt-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${attendancePct === 100 ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                  <UserCheck size={16} className={attendancePct === 100 ? 'text-green-400' : 'text-amber-400'} />
                </div>
                <div>
                  <p className="text-white text-[15px] font-bold leading-tight">{attendanceMarked}/{totalStudents}</p>
                  <p className="text-blue-200/35 text-[10px]">{language === 'ko' ? '출석 확인' : 'Attendance'}</p>
                </div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-navy/40 flex items-center justify-center">
                  <GraduationCap size={16} className="text-blue-300/60" />
                </div>
                <div>
                  <p className="text-white text-[15px] font-bold leading-tight">{totalStudents}</p>
                  <p className="text-blue-200/35 text-[10px]">{language === 'ko' ? '학생 수' : 'Students'}</p>
                </div>
              </div>
              {shared.todayBehaviorCount > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <ClipboardCheck size={16} className="text-amber-400/70" />
                    </div>
                    <div>
                      <p className="text-white text-[15px] font-bold leading-tight">{shared.todayBehaviorCount}</p>
                      <p className="text-blue-200/35 text-[10px]">{language === 'ko' ? '행동 기록' : 'Behavior logs'}</p>
                    </div>
                  </div>
                </>
              )}
              {shared.todayEvents.length > 0 && (
                <>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${urgentItems > 0 ? 'bg-red-500/15' : 'bg-blue-500/10'}`}>
                      <CalendarDays size={16} className={urgentItems > 0 ? 'text-red-400/70' : 'text-blue-300/60'} />
                    </div>
                    <div>
                      <p className="text-white text-[15px] font-bold leading-tight">{shared.todayEvents.length}</p>
                      <p className="text-blue-200/35 text-[10px]">{language === 'ko' ? '오늘 일정' : 'Events today'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="px-10 py-6 space-y-5">
        {/* ─── Top Row: Status + Calendar ─── */}
        <div className="grid grid-cols-[280px_1fr_220px] gap-5">
          <div className="space-y-4">
            <ActionableSummary shared={shared} />
            {isAdmin && <ClassOverviewTable />}
          </div>
          <SharedCalendar />
          <WeeklySchedule />
        </div>
        {/* ─── Below: Insights + Content ─── */}
        <InsightsBanner shared={shared} />
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-5">
            <TodaysPlanPreview />
            <NeedsAttentionWatchlist shared={shared} />
          </div>
          <div className="space-y-5">
            <QuickActions shared={shared} />
            {isAdmin && <AdminAlertPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Today's Plan Preview ─────────────────────────────────────────
function TodaysPlanPreview() {
  const { currentTeacher } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher'
  const [plan, setPlan] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isTeacher || !currentTeacher?.english_class) { setLoading(false); return }
    (async () => {
      try {
        const today = getKSTDateString()
        const { data } = await supabase.from('teacher_daily_plans')
          .select('plan_text')
          .eq('date', today)
          .eq('english_class', currentTeacher.english_class)
          .single()
        if (data) setPlan(data.plan_text || '')
      } catch {}
      setLoading(false)
    })()
  }, [currentTeacher, isTeacher])

  if (!isTeacher) return null

  return (
    <div className="bg-surface border border-gold/30 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 bg-gold/10 border-b border-gold/20 flex items-center gap-2">
        <BookOpen size={14} className="text-navy" />
        <p className="text-[13px] font-bold text-navy">Today's Plan</p>
      </div>
      <div className="px-5 py-4 min-h-[80px] max-h-[200px] overflow-y-auto">
        {loading ? (
          <Loader2 size={14} className="animate-spin text-text-tertiary" />
        ) : plan ? (
          <div className="text-[12px] text-text-primary leading-relaxed whitespace-pre-wrap">{plan}</div>
        ) : (
          <p className="text-[12px] text-text-tertiary">No plan for today. Head to Teacher Plans to add one.</p>
        )}
      </div>
    </div>
  )
}

// ─── Recent Notes Preview ─────────────────────────────────────────
// ─── Weekly Insight (rotating spotlight) ──────────────────────────
function InsightsBanner({ shared }: { shared: SharedDashboardData }) {
  const [showModal, setShowModal] = useState(false)
  const { currentTeacher, navigateTo } = useApp()
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem(`daewoo_dismissed_insights_${currentTeacher?.id || ''}`)
      if (saved) {
        const parsed: { key: string; at: number }[] = JSON.parse(saved)
        const weekAgo = Date.now() - 7 * 86400000
        return new Set(parsed.filter(d => d.at > weekAgo).map(d => d.key))
      }
    } catch {}
    return new Set()
  })

  // Compute insights from shared data — only past 7 days
  const insights = useMemo(() => {
    if (shared.loading || shared.students.length === 0) return []
    const allInsights: { key: string; text: string; detail: string; type: string; navView?: string; navStudent?: string; navDomain?: string }[] = []
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    // Reading growth & decline (only assessments from past 7 days)
    const recentReadings = shared.readingAssessments.filter(r => r.date >= sevenDaysAgo)
    if (recentReadings.length > 0) {
      const byStudent: Record<string, { name: string; id: string; first: number; last: number }> = {}
      recentReadings.forEach(r => {
        const s = shared.students.find(st => st.id === r.student_id)
        if (!s || r.cwpm == null) return
        if (!byStudent[r.student_id]) byStudent[r.student_id] = { name: s.english_name, id: s.id, first: r.cwpm, last: r.cwpm }
        byStudent[r.student_id].last = r.cwpm
      })
      const growths = Object.values(byStudent).filter(s => s.last > s.first + 5).sort((a, b) => (b.last - b.first) - (a.last - a.first))
      growths.slice(0, 3).forEach(top => {
        allInsights.push({ key: `reading_growth_${top.id}`, text: `${top.name} improved CWPM from ${top.first} to ${top.last}`, detail: 'Check their reading profile for the full growth trajectory.', type: 'positive', navView: 'readingLevels', navStudent: top.id })
      })
      const declines = Object.values(byStudent).filter(s => s.first > s.last + 10).sort((a, b) => (a.last - a.first) - (b.last - b.first))
      declines.slice(0, 2).forEach(d => {
        allInsights.push({ key: `reading_decline_${d.id}`, text: `${d.name}'s CWPM dropped from ${d.first} to ${d.last}`, detail: 'A drop this large may mean the assigned reading level is too high.', type: 'concern', navView: 'readingLevels', navStudent: d.id })
      })
    }

    // Attendance pattern (only past 7 days)
    const recentAbsences = shared.absences30d.filter(a => a.date >= sevenDaysAgo)
    const counts: Record<string, number> = {}
    recentAbsences.forEach(a => { counts[a.student_id] = (counts[a.student_id] || 0) + 1 })
    Object.entries(counts).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([sid, count]) => {
      const s = shared.students.find(st => st.id === sid)
      if (s) allInsights.push({ key: `attendance_${sid}`, text: `${s.english_name} has been absent ${count} times in the last month`, detail: 'Consider reaching out to parents or checking in with the homeroom teacher.', type: 'concern', navView: 'attendance', navStudent: sid })
    })

    return allInsights
  }, [shared.loading, shared.students, shared.readingAssessments, shared.absences30d])

  const dismissInsight = (key: string) => {
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(key)
      try { localStorage.setItem(`daewoo_dismissed_insights_${currentTeacher?.id || ''}`, JSON.stringify(Array.from(next).map(k => ({ key: k, at: Date.now() })))) } catch {}
      return next
    })
  }

  const visible = insights.filter(i => !dismissed.has(i.key))
  const positiveCount = visible.filter(i => i.type === 'positive').length
  const concernCount = visible.filter(i => i.type === 'concern').length

  if (shared.loading || visible.length === 0) return null

  return (
    <>
      {/* Compact banner */}
      <button onClick={() => setShowModal(true)}
        className="w-full rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 flex items-center gap-3 hover:bg-gold/10 transition-all text-left group">
        <Sparkles size={16} className="text-gold flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-semibold text-navy">{visible.length} insight{visible.length !== 1 ? 's' : ''}</span>
          {positiveCount > 0 && <span className="text-[10px] text-green-600 ml-2">✦ {positiveCount} positive</span>}
          {concernCount > 0 && <span className="text-[10px] text-amber-600 ml-2">⚠ {concernCount} concern{concernCount !== 1 ? 's' : ''}</span>}
        </div>
        <span className="text-[10px] text-text-tertiary group-hover:text-navy transition-colors">View all →</span>
      </button>

      {/* Insights Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-gold" />
                <h3 className="text-[14px] font-bold text-navy">Insights</h3>
                <span className="text-[9px] bg-gold/20 text-gold-dark px-1.5 py-0.5 rounded-full font-bold">{visible.length}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {visible.map(insight => {
                const colors = insight.type === 'positive'
                  ? { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', text: 'text-green-800', detail: 'text-green-600' }
                  : { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', text: 'text-amber-800', detail: 'text-amber-600' }
                return (
                  <div key={insight.key} className={`rounded-xl border ${colors.border} ${colors.bg} p-3.5 group`}>
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5"><Sparkles size={14} className={colors.icon} /></div>
                      <div className="flex-1 min-w-0">
                        <button onClick={() => { if (insight.navView) { navigateTo({ view: insight.navView, preSelectedStudent: insight.navStudent }); setShowModal(false) } }}
                          className={`text-[12px] font-semibold ${colors.text} leading-snug text-left hover:underline cursor-pointer`}>
                          {insight.text}
                          {insight.navView && <ArrowRight size={10} className="inline ml-1 opacity-50" />}
                        </button>
                        <p className={`text-[10px] ${colors.detail} mt-0.5`}>{insight.detail}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); dismissInsight(insight.key) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/50 text-text-tertiary hover:text-text-secondary flex-shrink-0"
                        title="Dismiss for 7 days">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Actionable Summary (sidebar) ────────────────────────────────
function ActionableSummary({ shared }: { shared: SharedDashboardData }) {
  const { currentTeacher, language, navigateTo } = useApp()
  const today = getKSTDateString()

  // Compute items from shared data (no independent fetching)
  const items = useMemo(() => {
    if (shared.loading) return []
    const newItems: { icon: any; text: string; urgent: boolean; nav?: string }[] = []

    // Unmarked attendance
    const unmarked = shared.students.length - shared.todayAttendanceIds.size
    if (unmarked > 0) {
      newItems.push({ icon: UserCheck, text: `${unmarked} students need attendance marked`, urgent: true, nav: 'attendance' })
    } else {
      newItems.push({ icon: UserCheck, text: 'All attendance recorded today', urgent: false })
    }

    // Today's events
    shared.todayEvents.forEach((ev: any) => {
      newItems.push({ icon: CalendarDays, text: ev.title, urgent: ev.type === 'deadline' || ev.type === 'testing' })
    })

    // Upcoming deadlines
    if (shared.activeSemester) {
      const sem = shared.activeSemester
      const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
      if (sem.midterm_cutoff_date) {
        const days = daysUntil(sem.midterm_cutoff_date)
        if (days >= 0 && days <= 7) newItems.push({ icon: AlertTriangle, text: `Midterm cutoff in ${days} day${days !== 1 ? 's' : ''}`, urgent: days <= 3 })
      }
      if (sem.report_card_cutoff_date) {
        const days = daysUntil(sem.report_card_cutoff_date)
        if (days >= 0 && days <= 14) newItems.push({ icon: AlertTriangle, text: `Report card cutoff in ${days} day${days !== 1 ? 's' : ''}`, urgent: days <= 5 })
      }
    }

    // Behavior logs today
    if (shared.todayBehaviorCount > 0) {
      newItems.push({ icon: ClipboardCheck, text: `${shared.todayBehaviorCount} behavior log${shared.todayBehaviorCount > 1 ? 's' : ''} recorded today`, urgent: false })
    }

    return newItems
  }, [shared.loading, shared.students.length, shared.todayAttendanceIds.size, shared.todayEvents, shared.activeSemester, shared.todayBehaviorCount, today])

  if (shared.loading) return null

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-navy/5 border-b border-border">
        <p className="text-[11px] font-bold text-navy uppercase tracking-wider">Today's Status</p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => {
          const Icon = item.icon
          const content = (
            <>
              <Icon size={14} className={item.urgent ? 'text-amber-500' : 'text-text-tertiary'} />
              <p className={`text-[12px] flex-1 ${item.urgent ? 'text-amber-800 font-medium' : 'text-text-secondary'}`}>{item.text}</p>
              {item.nav && <ArrowRight size={12} className="text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />}
            </>
          )
          return item.nav ? (
            <button key={i} onClick={() => navigateTo({ view: item.nav! })}
              className={`w-full px-4 py-2.5 flex items-center gap-2.5 group hover:bg-navy/5 transition-colors text-left ${item.urgent ? 'bg-amber-50/50' : ''}`}>
              {content}
            </button>
          ) : (
            <div key={i} className={`px-4 py-2.5 flex items-center gap-2.5 ${item.urgent ? 'bg-amber-50/50' : ''}`}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────
function QuickActions({ shared }: { shared: SharedDashboardData }) {
  const { currentTeacher } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'

  // Compute incomplete assessments from shared data (no independent fetching, no N+1)
  const incomplete = useMemo(() => {
    if (shared.loading || !isTeacher || shared.semesterAssessments.length === 0) return []

    // Get recent assessments for this teacher's class (sorted by created_at desc, limit 3)
    const classAssessments = shared.semesterAssessments
      .filter((a: any) => a.english_class === currentTeacher.english_class)
      .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 3)

    if (classAssessments.length === 0) return []

    // Count grades from shared data instead of N+1 queries
    const gradesByAssessment: Record<string, number> = {}
    shared.semesterGrades.forEach((g: any) => {
      gradesByAssessment[g.assessment_id] = (gradesByAssessment[g.assessment_id] || 0) + 1
    })

    return classAssessments.map((a: any) => {
      const total = shared.students.filter(s => s.english_class === a.english_class && s.grade === a.grade).length
      const entered = gradesByAssessment[a.id] || 0
      return { ...a, entered, total }
    }).filter((a: any) => a.total > 0 && a.entered < a.total)
  }, [shared.loading, shared.semesterAssessments, shared.semesterGrades, shared.students, isTeacher, currentTeacher?.english_class])

  if (!isTeacher || incomplete.length === 0) return null

  return (
    <div className="">
      <h3 className="text-[12px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Continue Grading</h3>
      <div className="flex gap-3">
        {incomplete.map(a => (
          <div key={a.id} className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[13px] font-semibold text-navy">{a.name}</p>
            <p className="text-[11px] text-text-tertiary mt-0.5 capitalize">{a.domain} -- /{a.max_score}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(a.entered / a.total) * 100}%` }} />
              </div>
              <span className="text-[11px] font-medium text-amber-700">{a.entered}/{a.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Needs Attention Watchlist ─────────────────────────────────────
interface WatchlistStudent {
  id: string
  name: string
  class: string
  concerns: { type: 'grade_decline' | 'behavior_spike' | 'missing_orf' | 'attendance' | 'missing_grades'; text: string }[]
}

function NeedsAttentionWatchlist({ shared }: { shared: SharedDashboardData }) {
  const { currentTeacher, navigateTo } = useApp()
  const [expanded, setExpanded] = useState(false)
  const [dismissedStudents, setDismissedStudents] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = localStorage.getItem(`daewoo_watchlist_dismissed_${currentTeacher?.id || ''}`)
      if (saved) {
        const parsed: { id: string; at: number }[] = JSON.parse(saved)
        const weekAgo = Date.now() - 7 * 86400000
        return new Set(parsed.filter(d => d.at > weekAgo).map(d => d.id))
      }
    } catch {}
    return new Set()
  })

  // Compute watchlist + class alerts from shared data
  const { watchlist, classAlerts } = useMemo(() => {
    if (shared.loading || shared.students.length === 0 || !shared.activeSemester) {
      return { watchlist: [] as WatchlistStudent[], classAlerts: [] as { id: string; text: string }[] }
    }

    const students = shared.students
    const studentConcerns: Record<string, WatchlistStudent> = {}
    const addConcern = (s: DashboardStudent, type: WatchlistStudent['concerns'][0]['type'], text: string) => {
      if (!studentConcerns[s.id]) studentConcerns[s.id] = { id: s.id, name: s.english_name, class: s.english_class, concerns: [] }
      studentConcerns[s.id].concerns.push({ type, text })
    }

    // Grade decline (from shared semester assessments + grades)
    const cAlerts: { id: string; text: string }[] = []
    if (shared.semesterAssessments.length > 0 && shared.semesterGrades.length > 0) {
      for (const student of students) {
        const sAssessments = shared.semesterAssessments.filter((a: any) => a.english_class === student.english_class && a.grade === student.grade)
        const domains = Array.from(new Set(sAssessments.map((a: any) => a.domain)))
        for (const domain of domains) {
          const scores = sAssessments.filter((a: any) => a.domain === domain).map((a: any) => {
            const g = shared.semesterGrades.find((gr: any) => gr.student_id === student.id && gr.assessment_id === a.id)
            return g?.score != null && a.max_score > 0 ? (g.score / a.max_score) * 100 : null
          }).filter((s): s is number => s != null)
          if (scores.length >= 3) {
            const recent = scores.slice(-3)
            const firstAvg = (recent[0] + recent[1]) / 2
            const last = recent[2]
            if (firstAvg - last >= 15) {
              addConcern(student, 'grade_decline', `${domain.charAt(0).toUpperCase() + domain.slice(1)} dropped ${firstAvg.toFixed(0)}% to ${last.toFixed(0)}%`)
            }
          }
        }
      }

      // Class-level: missing grades
      for (const a of shared.semesterAssessments) {
        const classStudents = students.filter(s => s.english_class === a.english_class && s.grade === a.grade)
        if (classStudents.length === 0) continue
        const gradedSet = new Set(shared.semesterGrades.filter((g: any) => g.assessment_id === a.id).map((g: any) => g.student_id))
        const ungradedCount = classStudents.filter(s => !gradedSet.has(s.id)).length
        if (ungradedCount > 0 && ungradedCount < classStudents.length) {
          cAlerts.push({ id: `mg-${a.id}`, text: `"${a.name}" (${a.english_class}) -- ${ungradedCount} of ${classStudents.length} students ungraded` })
        }
      }
    }

    // Behavior spike (past 7 days only)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
    const recentBeh: Record<string, number> = {}
    const priorBeh: Record<string, number> = {}
    shared.behaviorLogs28d.forEach(b => {
      if (b.date >= sevenDaysAgo) recentBeh[b.student_id] = (recentBeh[b.student_id] || 0) + 1
      else if (b.date >= twoWeeksAgo) priorBeh[b.student_id] = (priorBeh[b.student_id] || 0) + 1
    })
    for (const [sid, count] of Object.entries(recentBeh)) {
      if (count >= 3 && count >= (priorBeh[sid] || 0) * 2) {
        const s = students.find(st => st.id === sid)
        if (s) addConcern(s, 'behavior_spike', `${count} behavior logs in 7 days (was ${priorBeh[sid] || 0})`)
      }
    }

    // Attendance pattern (past 3 days only)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
    const absCounts: Record<string, number> = {}
    shared.absences30d.filter(a => a.date >= threeDaysAgo).forEach(a => { absCounts[a.student_id] = (absCounts[a.student_id] || 0) + 1 })
    Object.entries(absCounts).forEach(([sid, c]) => {
      if (c >= 2) {
        const s = students.find(st => st.id === sid)
        if (s) addConcern(s, 'attendance', `Absent ${c} times in 3 days`)
      }
    })

    // Sort by concern count
    const list = Object.values(studentConcerns)
      .sort((a, b) => b.concerns.length - a.concerns.length)

    return { watchlist: list, classAlerts: cAlerts }
  }, [shared.loading, shared.students, shared.activeSemester, shared.semesterAssessments, shared.semesterGrades, shared.behaviorLogs28d, shared.readingAssessments, shared.absences30d])

  if (shared.loading) return null
  if (watchlist.length === 0 && classAlerts.length === 0) return null

  const dismissStudent = (sid: string) => {
    setDismissedStudents(prev => {
      const next = new Set(prev)
      next.add(sid)
      try {
        const arr = Array.from(next).map(k => ({ id: k, at: Date.now() }))
        localStorage.setItem(`daewoo_watchlist_dismissed_${currentTeacher?.id || ''}`, JSON.stringify(arr))
      } catch {}
      return next
    })
  }

  const filteredWatchlist = watchlist.filter(s => !dismissedStudents.has(s.id))
  const shown = expanded ? filteredWatchlist : filteredWatchlist.slice(0, 5)
  const icons: Record<string, any> = { grade_decline: TrendingDown, behavior_spike: AlertTriangle, missing_orf: BookOpen, attendance: CalendarDays, missing_grades: FileX }
  const tagColors: Record<string, string> = { grade_decline: 'bg-red-100 text-red-700', behavior_spike: 'bg-amber-100 text-amber-700', missing_orf: 'bg-blue-100 text-blue-700', attendance: 'bg-purple-100 text-purple-700' }

  const handleConcernClick = (studentId: string, type: string) => {
    switch (type) {
      case 'grade_decline':
      case 'missing_grades':
        navigateTo({ view: 'grades', preSelectedStudent: studentId })
        break
      case 'behavior_spike':
        navigateTo({ view: 'students', preSelectedStudent: studentId, preSelectedFilter: 'behavior' })
        break
      case 'missing_orf':
        navigateTo({ view: 'readingLevels', preSelectedStudent: studentId })
        break
      case 'attendance':
        navigateTo({ view: 'attendance', preSelectedStudent: studentId })
        break
    }
  }

  return (
    <div>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-amber-600" />
            <h3 className="text-[13px] font-semibold text-amber-900">Needs Attention</h3>
            <span className="text-[10px] bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-bold">{filteredWatchlist.length}</span>
          </div>
        </div>

        {/* Class-level alerts (missing grades) */}
        {classAlerts.length > 0 && (
          <div className="px-5 py-2 bg-blue-50/40 border-b border-blue-100">
            {classAlerts.slice(0, 3).map(a => (
              <div key={a.id} className="flex items-center gap-2 py-1">
                <FileX size={12} className="text-blue-500 flex-shrink-0" />
                <p className="text-[11px] text-blue-700">{a.text}</p>
              </div>
            ))}
            {classAlerts.length > 3 && <p className="text-[10px] text-blue-500 mt-1">+ {classAlerts.length - 3} more</p>}
          </div>
        )}

        {/* Student watchlist */}
        <div className="divide-y divide-border">
          {shown.map(student => (
            <div key={student.id} className="px-5 py-3 hover:bg-surface-alt/30 transition-colors group">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-[13px] font-semibold text-navy">{student.name}</span>
                  <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: classToColor(student.class as EnglishClass), color: classToTextColor(student.class as EnglishClass) }}>{student.class}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-tertiary">{student.concerns.length} concern{student.concerns.length > 1 ? 's' : ''}</span>
                  <button onClick={() => dismissStudent(student.id)} title="Dismiss for 7 days"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-amber-100 text-text-tertiary hover:text-amber-600">
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {student.concerns.map((c, i) => {
                  const Icon = icons[c.type] || AlertTriangle
                  return (
                    <button key={i} onClick={() => handleConcernClick(student.id, c.type)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${tagColors[c.type] || 'bg-gray-100 text-gray-700'} hover:ring-1 hover:ring-current/30 transition-all cursor-pointer`}
                      title={`Go to ${c.type.replace(/_/g, ' ')}`}>
                      <Icon size={10} /> {c.text}
                      <ArrowRight size={8} className="opacity-40" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredWatchlist.length > 5 && (
          <div className="px-5 py-2.5 border-t border-border">
            <button onClick={() => setExpanded(!expanded)} className="text-[11px] font-medium text-navy hover:text-navy-dark">
              {expanded ? 'Show fewer' : `Show all ${filteredWatchlist.length} students...`}
            </button>
          </div>
        )}
        {dismissedStudents.size > 0 && (
          <div className="px-5 py-1.5 border-t border-border">
            <button onClick={() => { setDismissedStudents(new Set()); localStorage.removeItem(`daewoo_watchlist_dismissed_${currentTeacher?.id || ''}`) }}
              className="text-[10px] text-text-tertiary hover:text-navy">
              Show {dismissedStudents.size} dismissed student{dismissedStudents.size > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Admin Alert Panel ─────────────────────────────────────────────
function AdminAlertPanel() {
  const { showToast } = useApp()
  const [flagged, setFlagged] = useState<FlaggedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<FlaggedEntry | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('behavior_logs').select('*, teachers(name), students(english_name, english_class)')
        .eq('is_flagged', true).order('created_at', { ascending: false }).limit(20)
      if (data) setFlagged(data.map((r: any) => ({ ...r, teacher_name: r.teachers?.name || '', student_name: r.students?.english_name || '', student_class: r.students?.english_class || '' })) as FlaggedEntry[])
      setLoading(false)
    })()
  }, [])

  const dismiss = async (id: string) => {
    await supabase.from('behavior_logs').update({ is_flagged: false }).eq('id', id)
    setFlagged(p => p.filter(f => f.id !== id))
    showToast('Flag dismissed')
  }

  if (loading || flagged.length === 0) return null

  return (
    <div className="border border-red-200 rounded-xl bg-red-50/50 overflow-hidden">
      <div className="px-5 py-3 bg-red-100/60 border-b border-red-200 flex items-center gap-2">
        <Bell size={16} className="text-red-600" />
        <h3 className="text-[14px] font-semibold text-red-800">Flagged for Your Review</h3>
        <span className="text-[11px] bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-bold ml-1">{flagged.length}</span>
      </div>
      <div className="divide-y divide-red-100 max-h-[280px] overflow-y-auto">
        {flagged.map(e => (
          <div key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-red-50/80 transition-colors cursor-pointer" onClick={() => setDetail(e)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-red-900">{e.student_name}</span>
                {e.student_class && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: classToColor(e.student_class as EnglishClass), color: classToTextColor(e.student_class as EnglishClass) }}>{e.student_class}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{e.type.toUpperCase()}</span>
              </div>
              <p className="text-[12px] text-red-800 truncate">{e.note || (e.behaviors || []).join(', ')}</p>
              <p className="text-[10px] text-red-600 mt-0.5">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.time && ` at ${e.time}`} — {e.teacher_name || 'Unknown'}</p>
            </div>
            <button onClick={(ev: any) => { ev.stopPropagation(); dismiss(e.id) }} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-100 flex-shrink-0" title="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={(ev: any) => ev.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-[16px] font-semibold text-navy">Flagged — {detail.student_name}</h3>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-text-tertiary">Date</span><p className="font-medium">{new Date(detail.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                <div><span className="text-text-tertiary">Time</span><p className="font-medium">{detail.time || '—'}</p></div>
                <div><span className="text-text-tertiary">Type</span><p className="font-medium capitalize">{detail.type === 'abc' || detail.type === 'negative' ? 'Negative' : detail.type}</p></div>
                <div><span className="text-text-tertiary">Teacher</span><p className="font-medium">{detail.teacher_name || '—'}</p></div>
              </div>
              {detail.activity && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Activity / Task</p><p className="text-[12px]">{detail.activity}</p></div>}
              {detail.duration && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Duration</p><p className="text-[12px]">{detail.duration}</p></div>}
              {(detail.antecedents || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Antecedent</p>
                  <div className="flex flex-wrap gap-1">{detail.antecedents.map((a: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>)}</div></div>
              )}
              {(detail.behaviors || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Behaviors</p>
                  <div className="flex flex-wrap gap-1">{detail.behaviors.map((b: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b}</span>)}</div></div>
              )}
              {(detail.consequences || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Consequence</p>
                  <div className="flex flex-wrap gap-1">{detail.consequences.map((c: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{c}</span>)}</div></div>
              )}
              {detail.intensity > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-tertiary font-semibold uppercase">Intensity:</span>
                  {[1,2,3,4,5].map(i => <div key={i} className={`w-4 h-4 rounded-full ${i <= detail.intensity ? (detail.intensity >= 4 ? 'bg-red-500' : detail.intensity >= 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`} />)}
                </div>
              )}
              {detail.frequency > 1 && <div><span className="text-[10px] text-text-tertiary font-semibold uppercase">Frequency:</span><span className="text-[12px] ml-1">{detail.frequency}x</span></div>}
              {detail.note && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Notes</p><p className="text-[13px] whitespace-pre-wrap">{detail.note}</p></div>}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between">
              <button onClick={() => { dismiss(detail.id); setDetail(null) }} className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-600 hover:bg-red-50">Dismiss Flag</button>
              <button onClick={() => setDetail(null)} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Calendar ───────────────────────────────────────────────
function SharedCalendar() {
  const { showToast, currentTeacher } = useApp()
  const [cur, setCur] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selDay, setSelDay] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editEvent, setEditEvent] = useState<any>(null)

  const y = cur.getFullYear(), m = cur.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const today = getKSTDateString()

  const [tableError, setTableError] = useState(false)
  const loadRef = useRef(0)

  const load = useCallback(async () => {
    const token = ++loadRef.current
    setLoading(true)
    const s = `${y}-${String(m+1).padStart(2,'0')}-01`
    const e = `${y}-${String(m+1).padStart(2,'0')}-${String(days).padStart(2,'0')}`
    const { data, error } = await supabase.from('calendar_events').select('*').gte('date', s).lte('date', e).order('date')
    if (token !== loadRef.current) return // stale request, discard
    if (error) {
      console.warn('Calendar table error:', error.message)
      setTableError(true)
    } else {
      if (data) setEvents(data)
      setTableError(false)
    }
    setLoading(false)
  }, [y, m, days])

  useEffect(() => { load() }, [load])

  const dayEvts = (d: string) => events.filter((e: any) => e.date === d)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    showToast('Deleted'); load()
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dayN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden card-hover">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[16px] font-semibold text-navy">{months[m]} {y}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setCur(new Date(y, m-1, 1))} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronLeft size={16} /></button>
            <button onClick={() => setCur(new Date(y, m+1, 1))} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronRight size={16} /></button>
            <button onClick={() => setCur(new Date())} className="px-2 py-1 rounded text-[11px] font-medium text-navy hover:bg-accent-light ml-1">Today</button>
          </div>
        </div>
        <button onClick={() => { if (tableError) { showToast('Run the SQL migration first to create the calendar_events table'); return }; setShowAdd(true); if (!selDay) setSelDay(today) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Plus size={13} /> Add Event</button>
      </div>

      {/* Legend */}
      <div className="px-5 py-2 bg-surface-alt/50 border-b border-border flex gap-3 flex-wrap">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>

      {tableError && (
        <div className="mx-5 my-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[13px] font-medium text-amber-800 mb-1">Calendar table needs setup</p>
          <p className="text-[11px] text-amber-700">Run the SQL migration in Supabase SQL Editor to create the <code className="bg-amber-100 px-1 rounded">calendar_events</code> table.</p>
          <button onClick={() => load()} className="mt-2 px-3 py-1 rounded text-[11px] font-medium bg-amber-200 text-amber-800 hover:bg-amber-300">Retry</button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {dayN.map(d => <div key={d} className="text-center text-[10px] uppercase tracking-wider text-text-tertiary font-semibold py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} className="bg-surface-alt/50 min-h-[90px]" />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evts = dayEvts(dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selDay
            const isWeekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6

            return (
              <div key={d} onClick={() => setSelDay(dateStr)}
                className={`bg-surface min-h-[90px] p-1.5 cursor-pointer transition-all hover:bg-accent-light/50 ${isSelected ? 'ring-2 ring-navy ring-inset' : ''} ${isWeekend ? 'bg-surface-alt/30' : ''}`}>
                <div className={`text-[11px] font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-navy text-white' : 'text-text-primary'}`}>{d}</div>
                <div className="space-y-0.5">
                  {evts.slice(0, 3).map(ev => {
                    const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)
                    return (
                      <div key={ev.id} className="text-[9px] px-1 py-0.5 rounded truncate font-medium" style={{ backgroundColor: `${typeInfo?.color || '#6B7280'}20`, color: typeInfo?.color || '#6B7280' }}>
                        {ev.title}
                      </div>
                    )
                  })}
                  {evts.length > 3 && <div className="text-[9px] text-text-tertiary text-center">+{evts.length - 3} more</div>}
                </div>
              </div>
            )
          })}
          {Array.from({ length: (7 - (first + days) % 7) % 7 }).map((_, i) => <div key={`t${i}`} className="bg-surface-alt/50 min-h-[90px]" />)}
        </div>
      </div>

      {/* Day Detail */}
      {selDay && (
        <div className="px-5 pb-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[14px] font-semibold text-navy">
              {new Date(selDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowAdd(true) }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent-light text-navy hover:bg-accent-light/80"><Plus size={11} /> Add</button>
              <button onClick={() => setSelDay(null)} className="p-1 rounded hover:bg-surface-alt"><X size={14} /></button>
            </div>
          </div>
          {dayEvts(selDay).length === 0 ? (
            <p className="text-[12px] text-text-tertiary italic py-3">No events this day.</p>
          ) : (
            <div className="space-y-2">
              {dayEvts(selDay).map(ev => {
                const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-alt/30">
                    <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: typeInfo?.color || '#6B7280' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{ev.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${typeInfo?.bg || 'bg-gray-100 text-gray-700'}`}>{typeInfo?.label || ev.type}</span>
                      </div>
                      {ev.description && <p className="text-[11px] text-text-secondary mt-0.5">{ev.description}</p>}
                      <div className="flex gap-1.5 mt-1">
                        {(ev as any).show_on_parent_calendar && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Parent Cal{(ev as any).target_grades?.length > 0 ? ` (G${(ev as any).target_grades.join(',')})` : ''}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditEvent(ev)} className="p-1 rounded hover:bg-surface-alt text-text-tertiary hover:text-navy"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-surface-alt text-text-tertiary hover:text-danger"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showAdd && <AddEventModal date={selDay || today} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editEvent && <AddEventModal date={editEvent.date} existingEvent={editEvent} onClose={() => setEditEvent(null)} onSaved={() => { setEditEvent(null); load() }} />}
    </div>
  )
}

function AddEventModal({ date, onClose, onSaved, existingEvent }: { date: string; onClose: () => void; onSaved: () => void; existingEvent?: any }) {
  const { currentTeacher, showToast } = useApp()
  const [title, setTitle] = useState(existingEvent?.title || '')
  const [eventDate, setEventDate] = useState(existingEvent?.date || date)
  const [type, setType] = useState(existingEvent?.type || 'event')
  const [desc, setDesc] = useState(existingEvent?.description || '')
  const [showOnParentCalendar, setShowOnParentCalendar] = useState(existingEvent?.show_on_parent_calendar || false)
  const [targetGrades, setTargetGrades] = useState<number[]>(existingEvent?.target_grades || [])
  const [saving, setSaving] = useState(false)
  const isEdit = !!existingEvent

  const toggleGrade = (g: number) => {
    setTargetGrades(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort())
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload: any = {
      title: title.trim(), date: eventDate, type, description: desc.trim(),
      show_on_parent_calendar: showOnParentCalendar,
      target_grades: showOnParentCalendar && targetGrades.length > 0 ? targetGrades : null,
    }

    let error: any = null
    if (isEdit) {
      const res = await supabase.from('calendar_events').update(payload).eq('id', existingEvent.id)
      error = res.error
    } else {
      const res = await supabase.from('calendar_events').insert({ ...payload, created_by: currentTeacher?.id || null })
      error = res.error
    }

    // If columns don't exist, retry without them and warn
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema'))) {
      const { show_on_parent_calendar, target_grades, ...basePayload } = payload
      if (isEdit) {
        const res = await supabase.from('calendar_events').update(basePayload).eq('id', existingEvent.id)
        error = res.error
      } else {
        const res = await supabase.from('calendar_events').insert({ ...basePayload, created_by: currentTeacher?.id || null })
        error = res.error
      }
      if (!error) showToast('Saved -- run add_parent_calendar_fields.sql to enable parent calendar features')
    }

    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { if (!error) showToast(isEdit ? 'Event updated' : 'Event added'); onSaved() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-sm" onClick={(e: any) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-navy">{isEdit ? 'Edit Event' : 'Add Calendar Event'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Title *</label>
            <input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. Phonics Unit 3 Lesson Plan" autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={eventDate} onChange={(e: any) => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Type</label>
              <select value={type} onChange={(e: any) => setType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
          </div>
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Description <span className="normal-case text-text-tertiary">(opt)</span></label>
            <textarea value={desc} onChange={(e: any) => setDesc(e.target.value)} rows={2} placeholder="Details..."
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>

          <div className="bg-surface-alt/50 rounded-lg px-4 py-3 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={showOnParentCalendar} onChange={e => setShowOnParentCalendar(e.target.checked)}
                className="w-4 h-4 rounded border-border text-navy focus:ring-navy" />
              <div>
                <span className="text-[12px] font-medium text-text-primary">Show on Parent Calendar</span>
                <span className="text-[10px] text-text-tertiary block">Display this event on the parent calendar for selected grades</span>
              </div>
            </label>

            {showOnParentCalendar && (
              <div className="ml-7">
                <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1.5">Which grades?</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setTargetGrades(targetGrades.length === 5 ? [] : [1, 2, 3, 4, 5])}
                    className={`px-2 py-1 rounded text-[10px] font-medium ${targetGrades.length === 5 ? 'bg-navy text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                    All
                  </button>
                  {[1, 2, 3, 4, 5].map(g => (
                    <button key={g} onClick={() => toggleGrade(g)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium ${targetGrades.includes(g) ? 'bg-navy text-white' : 'bg-surface border border-border text-text-secondary hover:border-navy'}`}>
                      G{g}
                    </button>
                  ))}
                </div>
                {targetGrades.length === 0 && (
                  <p className="text-[9px] text-amber-600 mt-1">No grades selected = shows on ALL parent calendars</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} {isEdit ? 'Update' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Class Overview Table (Admin only) ────────────────────────────
function ClassOverviewTable() {
  const { language } = useApp()
  const { counts, loading } = useClassCounts()
  const totalStudents = counts.reduce((a: any, c: any) => a + c.count, 0)

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden card-hover">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-display text-[13px] font-semibold text-navy">{language === 'ko' ? '반별 학생 수' : 'Students by Class'}</h3>
      </div>
      <div className="p-3 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className="text-left px-1.5 py-1.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">{language === 'ko' ? '학년' : 'Gr'}</th>
              {ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(cls => (
                <th key={cls} className="text-center px-1 py-1.5">
                  <span className="inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map(grade => (
              <tr key={grade} className="border-t border-border">
                <td className="px-1.5 py-1.5 font-semibold text-navy">{grade}</td>
                {ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(cls => {
                  const c = counts.find(c => c.grade === grade && c.english_class === cls)
                  return <td key={cls} className="text-center px-1 py-1.5 font-medium">{c?.count || <span className="text-text-tertiary">—</span>}</td>
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-navy/20">
              <td className="px-1.5 py-1.5 font-bold text-navy">Σ</td>
              {ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(cls => {
                const total = counts.filter((c: any) => c.english_class === cls).reduce((a, c) => a + c.count, 0)
                return <td key={cls} className="text-center px-1 py-1.5 font-bold">{total || '—'}</td>
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
