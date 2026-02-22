'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useClassCounts } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { Bell, Plus, X, Loader2, ChevronLeft, ChevronRight, Trash2, Pencil, GraduationCap, ClipboardCheck, TrendingDown, AlertTriangle, FileX, Sparkles, Eye, BookOpen, CalendarDays, UserCheck, CheckCircle, XCircle, ArrowRight } from 'lucide-react'

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

interface CalEvent { id: string; title: string; date: string; type: string; description: string; created_by: string | null; created_at: string }
interface FlaggedEntry { id: string; student_id: string; date: string; type: string; note: string; time: string; behaviors: string[]; antecedents: string[]; consequences: string[]; intensity: number; frequency: number; activity: string; duration: string; is_flagged: boolean; teacher_name: string; student_name: string; student_class: string; created_at: string }

export default function DashboardView() {
  const { language, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const isTeacher = currentTeacher?.role === 'teacher'
  const [semesters, setSemesters] = useState<{ id: string; name: string; name_ko: string; is_active: boolean }[]>([])
  const [activeSem, setActiveSem] = useState<string>('')

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

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-6 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[22px] font-semibold tracking-tight text-navy">
              {language === 'ko' ? '대시보드' : `${greeting}${currentTeacher?.name ? `, ${currentTeacher.name}` : ''}`}
            </h2>
            <p className="text-text-secondary text-[13px] mt-0.5">{dayStr} {activeSem ? `-- ${activeSem}` : ''}</p>
          </div>
          {semesters.length > 0 && (
            <select value={activeSem} onChange={(e: any) => setActiveSem(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map((sem: any) => (
                <option key={sem.id} value={language === 'ko' ? sem.name_ko : sem.name}>
                  {language === 'ko' ? sem.name_ko : sem.name}{sem.is_active ? ' ●' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="px-10 py-6 space-y-5">
        {/* ─── Calendar First (Full Width) ─── */}
        <SharedCalendar />
        {/* ─── Two Column Layout Below ─── */}
        <div className="grid grid-cols-3 gap-6">
          {/* ─── Main Column (2/3) ─── */}
          <div className="col-span-2 space-y-5">
            <InsightsBanner />
            <TodaysPlanPreview />
            <NeedsAttentionWatchlist />
            <QuickActions />
            {isAdmin && <AdminAlertPanel />}
          </div>
          {/* ─── Sidebar (1/3) ─── */}
          <div className="space-y-5">
            <ActionableSummary />
            {isAdmin && <ClassOverviewTable />}
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
function InsightsBanner() {
  const [showModal, setShowModal] = useState(false)
  const { currentTeacher, navigateTo } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'
  const isAdmin = currentTeacher?.role === 'admin'
  const [insights, setInsights] = useState<{ key: string; text: string; detail: string; type: string; navView?: string; navStudent?: string; navDomain?: string }[]>([])
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const allInsights: typeof insights = []
      const classFilter = isTeacher ? currentTeacher?.english_class : null

      let studQuery = supabase.from('students').select('id, english_name, english_class, grade').eq('is_active', true)
      if (classFilter) studQuery = studQuery.eq('english_class', classFilter)
      const { data: students } = await studQuery
      if (!students || students.length === 0) { setLoading(false); return }

      // Reading growth & decline
      const { data: readingData } = await supabase.from('reading_assessments').select('student_id, cwpm, date')
        .in('student_id', students.map(s => s.id)).order('date', { ascending: true })
      if (readingData && readingData.length > 0) {
        const byStudent: Record<string, { name: string; id: string; first: number; last: number }> = {}
        readingData.forEach(r => {
          const s = students.find(st => st.id === r.student_id)
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

      // Attendance pattern
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const { data: absences } = await supabase.from('attendance').select('student_id').eq('status', 'absent')
        .in('student_id', students.map(s => s.id)).gte('date', thirtyDaysAgo)
      if (absences) {
        const counts: Record<string, number> = {}
        absences.forEach(a => { counts[a.student_id] = (counts[a.student_id] || 0) + 1 })
        Object.entries(counts).filter(([, c]) => c >= 4).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([sid, count]) => {
          const s = students.find(st => st.id === sid)
          if (s) allInsights.push({ key: `attendance_${sid}`, text: `${s.english_name} has been absent ${count} times in the last month`, detail: 'Consider reaching out to parents or checking in with the homeroom teacher.', type: 'concern', navView: 'attendance', navStudent: sid })
        })
      }

      setInsights(allInsights)
      setLoading(false)
    })()
  }, [currentTeacher, isTeacher, isAdmin])

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

  if (loading || visible.length === 0) return null

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
function ActionableSummary() {
  const { currentTeacher, language } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class : null
  const [items, setItems] = useState<{ icon: any; text: string; urgent: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const today = getKSTDateString()

  useEffect(() => {
    ;(async () => {
      const newItems: { icon: any; text: string; urgent: boolean }[] = []

      // Unmarked attendance
      let unmarked = 0
      if (teacherClass) {
        const { data: studs } = await supabase.from('students').select('id').eq('english_class', teacherClass).eq('is_active', true)
        if (studs) {
          const { data: att } = await supabase.from('attendance').select('student_id').eq('date', today).in('student_id', studs.map((s: any) => s.id))
          unmarked = studs.length - (att?.length || 0)
        }
      } else if (isAdmin) {
        const { data: studs } = await supabase.from('students').select('id').eq('is_active', true)
        if (studs) {
          const { data: att } = await supabase.from('attendance').select('student_id').eq('date', today)
          unmarked = studs.length - (att?.length || 0)
        }
      }
      if (unmarked > 0) {
        newItems.push({ icon: UserCheck, text: `${unmarked} students need attendance marked`, urgent: true })
      } else {
        newItems.push({ icon: UserCheck, text: 'All attendance recorded today', urgent: false })
      }

      // Today's events
      const { data: events } = await supabase.from('calendar_events').select('title, type').eq('date', today)
      if (events && events.length > 0) {
        events.forEach((ev: any) => {
          newItems.push({ icon: CalendarDays, text: ev.title, urgent: ev.type === 'deadline' || ev.type === 'testing' })
        })
      }

      // Upcoming deadlines
      const { data: sem } = await supabase.from('semesters').select('*').eq('is_active', true).single()
      if (sem) {
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
      const { count: behaviorCount } = await supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('date', today)
      if (behaviorCount && behaviorCount > 0) {
        newItems.push({ icon: ClipboardCheck, text: `${behaviorCount} behavior log${behaviorCount > 1 ? 's' : ''} recorded today`, urgent: false })
      }

      setItems(newItems)
      setLoading(false)
    })()
  }, [teacherClass, isAdmin])

  if (loading) return null

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-navy/5 border-b border-border">
        <p className="text-[11px] font-bold text-navy uppercase tracking-wider">Today's Status</p>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className={`px-4 py-2.5 flex items-center gap-2.5 ${item.urgent ? 'bg-amber-50/50' : ''}`}>
              <Icon size={14} className={item.urgent ? 'text-amber-500' : 'text-text-tertiary'} />
              <p className={`text-[12px] ${item.urgent ? 'text-amber-800 font-medium' : 'text-text-secondary'}`}>{item.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Today at a Glance ──────────────────────────────────────────────
function TodayAtGlance() {
  const { currentTeacher, language } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class : null
  const [data, setData] = useState<{ unmarkedAttendance: number; behaviorToday: number; eventsToday: any[]; alerts: { declining: number; behaviorSpike: number; missingData: number; attendancePattern: number }; upcomingDeadlines: any[] }>({ unmarkedAttendance: 0, behaviorToday: 0, eventsToday: [], alerts: { declining: 0, behaviorSpike: 0, missingData: 0, attendancePattern: 0 }, upcomingDeadlines: [] })
  const [loading, setLoading] = useState(true)
  const today = getKSTDateString()

  useEffect(() => {
    (async () => {
      const [eventsRes, behaviorRes, semRes] = await Promise.all([
        supabase.from('calendar_events').select('*').eq('date', today),
        supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('date', today),
        supabase.from('semesters').select('*').eq('is_active', true).single(),
      ])

      // Check unmarked attendance
      let unmarked = 0
      if (teacherClass) {
        const { data: studs } = await supabase.from('students').select('id').eq('english_class', teacherClass).eq('is_active', true)
        if (studs) {
          const { data: att } = await supabase.from('attendance').select('student_id').eq('date', today).in('student_id', studs.map((s: any) => s.id))
          unmarked = studs.length - (att?.length || 0)
        }
      } else if (isAdmin) {
        const { data: studs } = await supabase.from('students').select('id').eq('is_active', true)
        if (studs) {
          const { data: att } = await supabase.from('attendance').select('student_id').eq('date', today)
          unmarked = studs.length - (att?.length || 0)
        }
      }

      // Student alerts: patterns that need attention
      let alerts = { declining: 0, behaviorSpike: 0, missingData: 0, attendancePattern: 0 }
      {
        let studQuery = supabase.from('students').select('id, english_class').eq('is_active', true)
        if (teacherClass) studQuery = studQuery.eq('english_class', teacherClass)
        const { data: studs } = await studQuery
        if (studs && studs.length > 0) {
          // Students with no reading assessments in last 60 days
          const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const { data: recentReading } = await supabase.from('reading_assessments').select('student_id')
            .in('student_id', studs.map(s => s.id)).gte('date', sixtyDaysAgo)
          const studentsWithReading = new Set((recentReading || []).map(r => r.student_id))
          alerts.missingData = studs.filter(s => !studentsWithReading.has(s.id)).length

          // Students with 3+ behavior incidents in last 14 days
          const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const { data: recentBehavior } = await supabase.from('behavior_logs').select('student_id')
            .in('student_id', studs.map(s => s.id)).gte('date', twoWeeksAgo)
          const behaviorCounts: Record<string, number> = {}
          recentBehavior?.forEach(b => { behaviorCounts[b.student_id] = (behaviorCounts[b.student_id] || 0) + 1 })
          alerts.behaviorSpike = Object.values(behaviorCounts).filter(c => c >= 3).length

          // Grade decline: students whose recent grades avg is 10+ points below their earlier avg
          const { data: allGrades } = await supabase.from('grades').select('student_id, score, assessment_id, assessments!inner(max_score, date)')
            .in('student_id', studs.map(s => s.id)).not('score', 'is', null)
          if (allGrades && allGrades.length > 0) {
            const byStudent: Record<string, { date: string; pct: number }[]> = {}
            allGrades.forEach((g: any) => {
              if (!byStudent[g.student_id]) byStudent[g.student_id] = []
              byStudent[g.student_id].push({ date: g.assessments?.date || '', pct: (g.score / (g.assessments?.max_score || 100)) * 100 })
            })
            Object.values(byStudent).forEach(entries => {
              if (entries.length < 4) return
              const sorted = entries.sort((a, b) => a.date.localeCompare(b.date))
              const mid = Math.floor(sorted.length / 2)
              const earlyAvg = sorted.slice(0, mid).reduce((s, e) => s + e.pct, 0) / mid
              const lateAvg = sorted.slice(mid).reduce((s, e) => s + e.pct, 0) / (sorted.length - mid)
              if (earlyAvg - lateAvg >= 10) alerts.declining++
            })
          }

          // Attendance patterns: students with 3+ absences in last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          const { data: recentAtt } = await supabase.from('attendance').select('student_id, status')
            .in('student_id', studs.map(s => s.id)).gte('date', thirtyDaysAgo).eq('status', 'absent')
          if (recentAtt) {
            const absCounts: Record<string, number> = {}
            recentAtt.forEach(a => { absCounts[a.student_id] = (absCounts[a.student_id] || 0) + 1 })
            alerts.attendancePattern = Object.values(absCounts).filter(c => c >= 3).length
          }
        }
      }

      // Upcoming deadlines
      const deadlines: any[] = []
      if (semRes.data) {
        const sem = semRes.data
        if (sem.midterm_cutoff_date && new Date(sem.midterm_cutoff_date) >= new Date(today)) deadlines.push({ label: 'Midterm Cutoff', date: sem.midterm_cutoff_date })
        if (sem.report_card_cutoff_date && new Date(sem.report_card_cutoff_date) >= new Date(today)) deadlines.push({ label: 'Report Card Cutoff', date: sem.report_card_cutoff_date })
        if (sem.end_date && new Date(sem.end_date) >= new Date(today)) deadlines.push({ label: 'Semester End', date: sem.end_date })
      }

      setData({
        unmarkedAttendance: Math.max(0, unmarked),
        behaviorToday: behaviorRes.count || 0,
        eventsToday: eventsRes.data || [],
        alerts,
        upcomingDeadlines: deadlines.slice(0, 3),
      })
      setLoading(false)
    })()
  }, [teacherClass, isAdmin])

  if (loading) return null

  const totalAlerts = data.alerts.behaviorSpike + data.alerts.missingData + data.alerts.declining + data.alerts.attendancePattern

  const cards = [
    { label: language === 'ko' ? '미기록 출석' : 'Unmarked Attendance', value: data.unmarkedAttendance, color: data.unmarkedAttendance > 0 ? 'text-red-600' : 'text-green-600', bg: data.unmarkedAttendance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200', sub: data.unmarkedAttendance > 0 ? 'Take attendance!' : 'All done' },
    { label: language === 'ko' ? '오늘 행동 기록' : 'Behavior Logs Today', value: data.behaviorToday, color: 'text-navy', bg: 'bg-surface-alt border-border', sub: '' },
    { label: 'Student Alerts', value: totalAlerts, color: totalAlerts > 0 ? 'text-amber-600' : 'text-green-600', bg: totalAlerts > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200', sub: totalAlerts > 0 ? [data.alerts.declining > 0 ? `${data.alerts.declining} grade decline` : '', data.alerts.behaviorSpike > 0 ? `${data.alerts.behaviorSpike} behavior` : '', data.alerts.attendancePattern > 0 ? `${data.alerts.attendancePattern} attendance` : '', data.alerts.missingData > 0 ? `${data.alerts.missingData} no ORF` : ''].filter(Boolean).join(', ') : 'No concerns' },
  ]

  return (
    <div className="">
      <h3 className="text-[12px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">{language === 'ko' ? '오늘 한눈에' : 'Today at a Glance'} -- {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
      <div className="grid grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <div key={i} className={`rounded-xl border p-4 ${c.bg}`}>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{c.label}</p>
            <p className={`text-[24px] font-bold ${c.color}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-text-tertiary mt-0.5">{c.sub}</p>}
          </div>
        ))}
        <div className="rounded-xl border bg-surface-alt border-border p-4">
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{language === 'ko' ? '오늘 일정' : "Today's Events"}</p>
          {data.eventsToday.length === 0 ? <p className="text-[13px] text-text-tertiary mt-1">No events today</p> :
            <div className="space-y-1 mt-1">{data.eventsToday.slice(0, 3).map((ev: any) => {
              const cfg = EVENT_TYPES.find(t => t.value === ev.type)
              return <p key={ev.id} className={`text-[11px] font-medium px-2 py-0.5 rounded ${cfg?.bg || 'bg-gray-100 text-gray-700'}`}>{ev.title}</p>
            })}</div>}
          {data.upcomingDeadlines.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Upcoming</p>
              {data.upcomingDeadlines.map((d: any, i: number) => (
                <p key={i} className="text-[10px] text-text-secondary">{d.label}: <span className="font-semibold">{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Quick Actions ────────────────────────────────────────────────
function QuickActions() {
  const { currentTeacher } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'
  const [recentAssessments, setRecentAssessments] = useState<any[]>([])

  useEffect(() => {
    if (!isTeacher) return
    (async () => {
      // Find assessments this teacher recently worked on
      const { data } = await supabase.from('assessments').select('id, name, domain, max_score, english_class, grade')
        .eq('english_class', currentTeacher.english_class)
        .order('created_at', { ascending: false }).limit(3)
      if (data && data.length > 0) {
        // For each, count entered grades
        const withCounts = await Promise.all(data.map(async (a: any) => {
          const { count } = await supabase.from('grades').select('*', { count: 'exact', head: true }).eq('assessment_id', a.id)
          const { data: studs } = await supabase.from('students').select('id', { count: 'exact', head: true }).eq('english_class', a.english_class).eq('grade', a.grade).eq('is_active', true)
          return { ...a, entered: count || 0, total: studs?.length || 0 }
        }))
        setRecentAssessments(withCounts.filter(a => a.total > 0))
      }
    })()
  }, [currentTeacher, isTeacher])

  if (!isTeacher || recentAssessments.length === 0) return null

  const incomplete = recentAssessments.filter(a => a.entered < a.total)
  if (incomplete.length === 0) return null

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

function NeedsAttentionWatchlist() {
  const { currentTeacher, navigateTo } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'
  const isAdmin = currentTeacher?.role === 'admin'
  const [watchlist, setWatchlist] = useState<WatchlistStudent[]>([])
  const [classAlerts, setClassAlerts] = useState<{ id: string; text: string; assessmentId?: string }[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    if (!currentTeacher) return
    ;(async () => {
      const classFilter = isTeacher ? currentTeacher.english_class : null
      let studQuery = supabase.from('students').select('id, english_name, english_class, grade').eq('is_active', true)
      if (classFilter) studQuery = studQuery.eq('english_class', classFilter)
      const { data: students } = await studQuery
      if (!students || students.length === 0) { setLoading(false); return }

      const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
      if (!sem) { setLoading(false); return }

      const studentConcerns: Record<string, WatchlistStudent> = {}
      const addConcern = (s: any, type: WatchlistStudent['concerns'][0]['type'], text: string) => {
        if (!studentConcerns[s.id]) studentConcerns[s.id] = { id: s.id, name: s.english_name, class: s.english_class, concerns: [] }
        studentConcerns[s.id].concerns.push({ type, text })
      }

      // Grade decline
      const { data: assessments } = await supabase.from('assessments').select('id, domain, name, english_class, grade, max_score').eq('semester_id', sem.id)
      if (assessments && assessments.length > 0) {
        const { data: allGrades } = await supabase.from('grades').select('student_id, assessment_id, score').in('assessment_id', assessments.map(a => a.id)).not('score', 'is', null)
        if (allGrades) {
          for (const student of students) {
            const sAssessments = assessments.filter(a => a.english_class === student.english_class && a.grade === student.grade)
            const domains = Array.from(new Set(sAssessments.map(a => a.domain)))
            for (const domain of domains) {
              const scores = sAssessments.filter(a => a.domain === domain).map(a => {
                const g = allGrades.find(gr => gr.student_id === student.id && gr.assessment_id === a.id)
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
          const cAlerts: { id: string; text: string }[] = []
          for (const a of assessments) {
            const classStudents = students.filter(s => s.english_class === a.english_class && s.grade === a.grade)
            if (classStudents.length === 0) continue
            const gradedSet = new Set(allGrades.filter(g => g.assessment_id === a.id).map(g => g.student_id))
            const ungradedCount = classStudents.filter(s => !gradedSet.has(s.id)).length
            if (ungradedCount > 0 && ungradedCount < classStudents.length) {
              cAlerts.push({ id: `mg-${a.id}`, text: `"${a.name}" (${a.english_class}) -- ${ungradedCount} of ${classStudents.length} students ungraded` })
            }
          }
          setClassAlerts(cAlerts)
        }
      }

      // Behavior spike
      const now = new Date()
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString().split('T')[0]
      const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000).toISOString().split('T')[0]
      const { data: recentBehavior } = await supabase.from('behavior_logs').select('student_id, date')
        .in('student_id', students.map(s => s.id)).gte('date', fourWeeksAgo)
      if (recentBehavior) {
        const recent: Record<string, number> = {}
        const prior: Record<string, number> = {}
        recentBehavior.forEach(b => {
          if (b.date >= twoWeeksAgo) recent[b.student_id] = (recent[b.student_id] || 0) + 1
          else prior[b.student_id] = (prior[b.student_id] || 0) + 1
        })
        for (const [sid, count] of Object.entries(recent)) {
          if (count >= 3 && count >= (prior[sid] || 0) * 2) {
            const s = students.find(st => st.id === sid)
            if (s) addConcern(s, 'behavior_spike', `${count} behavior logs in 2 weeks (was ${prior[sid] || 0})`)
          }
        }
      }

      // No ORF in 60 days
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
      const { data: recentReading } = await supabase.from('reading_assessments').select('student_id')
        .in('student_id', students.map(s => s.id)).gte('date', sixtyDaysAgo)
      const withReading = new Set((recentReading || []).map(r => r.student_id))
      students.forEach(s => {
        if (!withReading.has(s.id)) addConcern(s, 'missing_orf', 'No reading assessment in 60+ days')
      })

      // Attendance pattern
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const { data: recentAtt } = await supabase.from('attendance').select('student_id').eq('status', 'absent')
        .in('student_id', students.map(s => s.id)).gte('date', thirtyDaysAgo)
      if (recentAtt) {
        const counts: Record<string, number> = {}
        recentAtt.forEach(a => { counts[a.student_id] = (counts[a.student_id] || 0) + 1 })
        Object.entries(counts).forEach(([sid, c]) => {
          if (c >= 3) {
            const s = students.find(st => st.id === sid)
            if (s) addConcern(s, 'attendance', `Absent ${c} times in 30 days`)
          }
        })
      }

      // Sort by number of concerns (most concerning first), exclude "missing_orf only" students
      const list = Object.values(studentConcerns)
        .filter(s => s.concerns.some(c => c.type !== 'missing_orf') || s.concerns.length > 1)
        .sort((a, b) => b.concerns.length - a.concerns.length)
      setWatchlist(list)
      setLoading(false)
    })()
  }, [currentTeacher, isTeacher, isAdmin])

  if (loading) return null
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

  const load = useCallback(async () => {
    const s = `${y}-${String(m+1).padStart(2,'0')}-01`
    const e = `${y}-${String(m+1).padStart(2,'0')}-${days}`
    const { data, error } = await supabase.from('calendar_events').select('*').gte('date', s).lte('date', e).order('date')
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
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
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
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} className="bg-surface-alt/50 min-h-[80px]" />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evts = dayEvts(dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selDay
            const isWeekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6

            return (
              <div key={d} onClick={() => setSelDay(dateStr)}
                className={`bg-surface min-h-[80px] p-1.5 cursor-pointer transition-all hover:bg-accent-light/50 ${isSelected ? 'ring-2 ring-navy ring-inset' : ''} ${isWeekend ? 'bg-surface-alt/30' : ''}`}>
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
          {Array.from({ length: (7 - (first + days) % 7) % 7 }).map((_, i) => <div key={`t${i}`} className="bg-surface-alt/50 min-h-[80px]" />)}
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
  const [showOnLessonPlan, setShowOnLessonPlan] = useState(existingEvent?.show_on_lesson_plan || false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!existingEvent

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    if (isEdit) {
      const { error } = await supabase.from('calendar_events').update({ title: title.trim(), date: eventDate, type, description: desc.trim(), show_on_lesson_plan: showOnLessonPlan }).eq('id', existingEvent.id)
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`)
      else { showToast('Event updated'); onSaved() }
    } else {
      const { error } = await supabase.from('calendar_events').insert({ title: title.trim(), date: eventDate, type, description: desc.trim(), show_on_lesson_plan: showOnLessonPlan, created_by: currentTeacher?.id || null })
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`)
      else { showToast('Event added'); onSaved() }
    }
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
          <label className="flex items-center gap-2.5 cursor-pointer py-1 px-5 pb-2">
            <input type="checkbox" checked={showOnLessonPlan} onChange={e => setShowOnLessonPlan(e.target.checked)}
              className="w-4 h-4 rounded border-border text-navy focus:ring-navy" />
            <div>
              <span className="text-[12px] font-medium text-text-primary">Show on Lesson Plans</span>
              <span className="text-[10px] text-text-tertiary block">Block this day on monthly lesson plans</span>
            </div>
          </label>
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
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-display text-base font-semibold text-navy">{language === 'ko' ? '반별 학생 수' : 'Students by Class'}</h3>
      </div>
      <div className="p-5">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">{language === 'ko' ? '학년' : 'Grade'}</th>
              {ENGLISH_CLASSES.map(cls => (
                <th key={cls} className="text-center px-2 py-2">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                </th>
              ))}
              <th className="text-center px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {[2,3,4,5].map(grade => {
              const gradeTotal = counts.filter((c: any) => c.grade === grade).reduce((a, c) => a + c.count, 0)
              return (
                <tr key={grade} className="border-t border-border">
                  <td className="px-2 py-2.5 font-semibold text-navy">Grade {grade}</td>
                  {ENGLISH_CLASSES.map(cls => {
                    const c = counts.find(c => c.grade === grade && c.english_class === cls)
                    return <td key={cls} className="text-center px-2 py-2.5 font-medium">{c?.count || <span className="text-text-tertiary">—</span>}</td>
                  })}
                  <td className="text-center px-2 py-2.5 font-bold text-navy">{gradeTotal || '—'}</td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-navy/20">
              <td className="px-2 py-2.5 font-bold text-navy">Total</td>
              {ENGLISH_CLASSES.map(cls => {
                const total = counts.filter((c: any) => c.english_class === cls).reduce((a, c) => a + c.count, 0)
                return <td key={cls} className="text-center px-2 py-2.5 font-bold">{total || '—'}</td>
              })}
              <td className="text-center px-2 py-2.5 font-bold text-gold text-lg">{totalStudents || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
