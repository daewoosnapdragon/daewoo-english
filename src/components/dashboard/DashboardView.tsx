'use client'

import { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { useClassCounts } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { getKSTDateString, domainLabel } from '@/lib/utils'
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Pencil, PanelLeftClose, UserX, UserMinus, ArrowRight, Bell, Loader2 } from 'lucide-react'
import WeeklySchedule from './WeeklySchedule'
import AttendanceDrawer, { ATTENDANCE_SAVED_EVENT } from '@/components/attendance/AttendanceDrawer'
import { loadDayStatus } from '@/lib/calendarDays'

// ─── Event types ─────────────────────────────────────────────────
// Nine stored types, five colors: fewer hues means each one is recognizable
// at a glance. Days off and exams also fill their day (`fills`).
const EVENT_TYPES = [
  { value: 'day_off', label: 'Day Off', color: 'var(--ev-good)', fills: true },
  { value: 'deadline', label: 'Deadline', color: 'var(--ev-accent)', fills: false },
  { value: 'meeting', label: 'Meeting', color: 'var(--ev-info)', fills: false },
  { value: 'midterm', label: 'Midterm', color: 'var(--ev-accent)', fills: true },
  { value: 'report_cards', label: 'Report Cards', color: 'var(--ev-info)', fills: false },
  { value: 'event', label: 'School Event', color: 'var(--ev-warn)', fills: false },
  { value: 'field_trip', label: 'Field Trip', color: 'var(--ev-teal)', fills: false },
  { value: 'testing', label: 'Testing', color: 'var(--ev-teal)', fills: true },
  { value: 'other', label: 'Other', color: 'var(--ev-other)', fills: false },
]
const LEGEND: [string, string][] = [
  ['Day off', 'var(--ev-good)'], ['Deadline · Midterm', 'var(--ev-accent)'], ['Meeting · Report cards', 'var(--ev-info)'],
  ['School event', 'var(--ev-warn)'], ['Field trip · Testing', 'var(--ev-teal)'], ['Other', 'var(--ev-other)'],
]
const typeOf = (t: string) => EVENT_TYPES.find(x => x.value === t) || EVENT_TYPES[EVENT_TYPES.length - 1]

interface CalEvent { id: string; title: string; date: string; end_date?: string | null; type: string; description: string; created_by: string | null; created_at: string; show_on_parent_calendar?: boolean; target_grades?: number[] | null }
interface FlaggedEntry { id: string; student_id: string; date: string; type: string; note: string; time: string; behaviors: string[]; antecedents: string[]; consequences: string[]; intensity: number; frequency: number; activity: string; duration: string; is_flagged: boolean; teacher_name: string; student_name: string; student_class: string; created_at: string }

// ─── Shared data ─────────────────────────────────────────────────
// Fetched once and shared across every panel: about ten queries in parallel.
interface DashboardStudent { id: string; english_name: string; english_class: string; grade: number }
interface GradeRow { student_id: string; assessment_id: string; score: number | null; is_absent?: boolean; is_exempt?: boolean }
interface SharedDashboardData {
  students: DashboardStudent[]
  activeSemester: any | null
  todayAttendanceIds: Set<string>
  todayEvents: any[]
  todayBehaviorCount: number
  readingAssessments: { student_id: string; cwpm: number | null; date: string }[]
  absences30d: { student_id: string; date: string }[]
  behaviorLogs28d: { student_id: string; date: string }[]
  semesterAssessments: any[]
  /** Rows that count as graded: a score, or absent, or exempt. */
  semesterGrades: GradeRow[]
  loading: boolean
  reload: () => void
}

function useDashboardData(currentTeacher: any): SharedDashboardData {
  const [data, setData] = useState<Omit<SharedDashboardData, 'loading' | 'reload'>>({
    students: [], activeSemester: null, todayAttendanceIds: new Set(),
    todayEvents: [], todayBehaviorCount: 0, readingAssessments: [],
    absences30d: [], behaviorLogs28d: [], semesterAssessments: [], semesterGrades: [],
  })
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick(t => t + 1), [])

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

      let studQuery = supabase.from('students').select('id, english_name, english_class, grade').eq('is_active', true)
      if (classFilter) studQuery = studQuery.eq('english_class', classFilter)
      const [studRes, semRes] = await Promise.all([
        studQuery,
        supabase.from('semesters').select('*').eq('is_active', true).order('start_date', { ascending: false }).limit(1),
      ])
      if (cancelled) return
      const students: DashboardStudent[] = studRes.data || []
      const activeSemester = semRes.data?.[0] || null
      const studentIds = students.map(s => s.id)
      if (studentIds.length === 0) { setData(prev => ({ ...prev, students, activeSemester })); setLoading(false); return }

      const [attRes, eventsRes, behaviorCountRes, readingRes, absRes, behaviorLogsRes, assessmentsRes] = await Promise.all([
        supabase.from('attendance').select('student_id').eq('date', today).in('student_id', studentIds),
        supabase.from('calendar_events').select('title, type').eq('date', today),
        supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('date', today),
        supabase.from('reading_assessments').select('student_id, cwpm, date').in('student_id', studentIds).order('date', { ascending: true }),
        supabase.from('attendance').select('student_id, date').eq('status', 'absent').in('student_id', studentIds).gte('date', thirtyDaysAgo),
        supabase.from('behavior_logs').select('student_id, date').in('student_id', studentIds).gte('date', twentyEightDaysAgo),
        activeSemester
          ? supabase.from('assessments').select('id, domain, name, english_class, grade, max_score, date, created_at').eq('semester_id', activeSemester.id)
          : Promise.resolve({ data: [] as any[] }),
      ])
      if (cancelled) return

      const semAssessments = (assessmentsRes as any).data || []
      let semGrades: GradeRow[] = []
      if (semAssessments.length > 0) {
        // Absent and exempt rows carry no score but the student IS dealt with;
        // they must not show up as "ungraded".
        const { data: grades } = await supabase.from('grades').select('student_id, assessment_id, score, is_absent, is_exempt')
          .in('assessment_id', semAssessments.map((a: any) => a.id))
        if (grades) semGrades = (grades as GradeRow[]).filter(g => g.score != null || g.is_absent || g.is_exempt)
      }
      if (cancelled) return

      setData({
        students, activeSemester,
        todayAttendanceIds: new Set((attRes.data || []).map((a: any) => a.student_id)),
        todayEvents: eventsRes.data || [],
        todayBehaviorCount: (behaviorCountRes as any).count || 0,
        readingAssessments: readingRes.data || [],
        absences30d: (absRes.data || []) as any,
        behaviorLogs28d: behaviorLogsRes.data || [],
        semesterAssessments: semAssessments,
        semesterGrades: semGrades,
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [currentTeacher?.id, classFilter, isAdmin, tick])

  return useMemo(() => ({ ...data, loading, reload }), [data, loading, reload])
}

// ─── Grading queue: assessments with students still ungraded ─────
interface QueueItem { id: string; name: string; domain: string; max_score: number; date: string | null; english_class: string; grade: number; total: number; done: number; ungraded: DashboardStudent[] }

function useGradingQueue(shared: SharedDashboardData, resolved: Record<string, Set<string>>): QueueItem[] {
  return useMemo(() => {
    if (shared.loading || !shared.activeSemester) return []
    const graded: Record<string, Set<string>> = {}
    shared.semesterGrades.forEach(g => { (graded[g.assessment_id] ||= new Set()).add(g.student_id) })
    const items: QueueItem[] = []
    for (const a of shared.semesterAssessments) {
      const roster = shared.students.filter(s => s.english_class === a.english_class && s.grade === a.grade)
      if (roster.length === 0) continue
      const done = new Set([...Array.from(graded[a.id] || []), ...Array.from(resolved[a.id] || [])])
      const ungraded = roster.filter(s => !done.has(s.id))
      // Nothing entered at all means the test has not been given yet, not that
      // grading stalled; only partly graded assessments are a queue.
      if (ungraded.length === 0 || ungraded.length === roster.length) continue
      items.push({ id: a.id, name: a.name, domain: a.domain, max_score: a.max_score, date: a.date, english_class: a.english_class, grade: a.grade, total: roster.length, done: roster.length - ungraded.length, ungraded })
    }
    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [shared.loading, shared.activeSemester, shared.semesterAssessments, shared.semesterGrades, shared.students, resolved])
}

// ═══════════════════════════════════════════════════════════════════
export default function DashboardView() {
  const { language, currentTeacher, showToast } = useApp()
  const lang = language
  const isAdmin = currentTeacher?.role === 'admin'
  const shared = useDashboardData(currentTeacher)

  // The weekly schedule can be tucked away; remembered per browser.
  const [scheduleOpen, setScheduleOpen] = useState(true)
  useEffect(() => { try { if (localStorage.getItem('daewoo_schedule') === 'closed') setScheduleOpen(false) } catch {} }, [])
  const toggleSchedule = (open: boolean) => { setScheduleOpen(open); try { localStorage.setItem('daewoo_schedule', open ? 'open' : 'closed') } catch {} }

  // Attendance drawer, opened from a class period on the schedule.
  const [attendanceGrade, setAttendanceGrade] = useState<number | null>(null)
  const [todayOff, setTodayOff] = useState<string | null>(null)
  useEffect(() => { loadDayStatus(getKSTDateString(), null).then(s => setTodayOff(s.off)) }, [])
  useEffect(() => {
    const onSaved = () => shared.reload()
    window.addEventListener(ATTENDANCE_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(ATTENDANCE_SAVED_EVENT, onSaved)
  }, [shared.reload])

  // Students marked absent/exempt from this page, so the queue updates without a refetch.
  const [resolved, setResolved] = useState<Record<string, Set<string>>>({})
  const queue = useGradingQueue(shared, resolved)

  const markStudent = async (item: QueueItem, student: DashboardStudent, how: 'absent' | 'exempt') => {
    const { error } = await supabase.from('grades').upsert(
      { assessment_id: item.id, student_id: student.id, score: null, is_absent: how === 'absent', is_exempt: how === 'exempt', entered_by: currentTeacher?.id || null },
      { onConflict: 'student_id,assessment_id' })
    if (error) { showToast(`Error: ${error.message}`); return }
    setResolved(prev => ({ ...prev, [item.id]: new Set([...Array.from(prev[item.id] || []), student.id]) }))
    showToast(lang === 'ko'
      ? `${student.english_name} · ${how === 'absent' ? '결석' : '면제'} 처리됨`
      : `${student.english_name} marked ${how} on ${item.name}`)
  }

  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const hour = kst.getHours()
  const greeting = lang === 'ko' ? '안녕하세요' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dayStr = kst.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const unmarked = shared.students.length - shared.todayAttendanceIds.size
  const ungradedStudents = queue.reduce((n, q) => n + q.ungraded.length, 0)
  const sem = shared.activeSemester
  const daysUntil = (d?: string | null) => d ? Math.ceil((new Date(d).getTime() - new Date(getKSTDateString()).getTime()) / 86400000) : null
  const fmtShort = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { day: 'numeric', month: 'short' })
  const midtermDays = daysUntil(sem?.midterm_cutoff_date)
  const gradesDue: string | null = sem?.report_card_cutoff_date || sem?.grades_due_date || null
  const gradesDays = daysUntil(gradesDue)

  return (
    <div className="px-8 py-6 space-y-8 animate-fade-in">
      {/* ─── Header ─── */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{dayStr}{sem ? ` · ${lang === 'ko' ? sem.name_ko || sem.name : sem.name}` : ''}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{greeting}{currentTeacher?.name ? `, ${currentTeacher.name}` : ''}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/attendance" className="h-9 px-3.5 inline-flex items-center rounded border border-rule-2 bg-surface text-[13px] font-medium text-ink hover:border-ink-3">
            {lang === 'ko' ? '출석 체크' : 'Mark attendance'}
          </Link>
          <Link href="/grades" className="h-9 px-3.5 inline-flex items-center rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover">
            {lang === 'ko' ? '성적 입력' : 'Enter grades'}
          </Link>
        </div>
      </div>

      {/* ─── Stats ─── */}
      {!shared.loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 border-t border-b border-rule-2">
          <Stat href="/attendance" label={lang === 'ko' ? '오늘 출석' : 'Attendance today'} value={todayOff ? '—' : unmarked > 0 ? String(unmarked) : '✓'} sub={todayOff ? `${lang === 'ko' ? '휴일' : 'day off'} · ${todayOff}` : unmarked > 0 ? (lang === 'ko' ? '명 미체크' : 'students unmarked') : (lang === 'ko' ? '모두 완료' : 'all marked')} alert={!todayOff && unmarked > 0} />
          <Stat href="#grading" label={lang === 'ko' ? '미채점' : 'Ungraded'} value={String(queue.length)} sub={queue.length ? `${lang === 'ko' ? '평가' : 'assessments'} · ${ungradedStudents} ${lang === 'ko' ? '명' : 'students'}` : (lang === 'ko' ? '없음' : 'nothing waiting')} alert={queue.length > 0} />
          <Stat label={lang === 'ko' ? '중간고사 마감' : 'Midterm cutoff'} value={midtermDays != null && midtermDays >= 0 ? String(midtermDays) : '—'} sub={midtermDays != null && midtermDays >= 0 ? `${lang === 'ko' ? '일 남음' : 'days'} · ${fmtShort(sem.midterm_cutoff_date)}` : (lang === 'ko' ? '설정 없음' : 'not set')} alert={midtermDays != null && midtermDays >= 0 && midtermDays <= 3} />
          <Stat label={lang === 'ko' ? '성적표 성적 마감' : 'Report card grades due'} value={gradesDue ? fmtShort(gradesDue) : '—'} sub={gradesDays != null && gradesDays >= 0 ? `${gradesDays} ${lang === 'ko' ? '일 남음' : 'days'}` : (lang === 'ko' ? '설정 없음' : 'not set')} alert={gradesDays != null && gradesDays >= 0 && gradesDays <= 5} />
          <Stat label={lang === 'ko' ? '오늘 행동 기록' : 'Behavior logs today'} value={String(shared.todayBehaviorCount)} sub={shared.todayEvents.length ? `${shared.todayEvents.length} ${lang === 'ko' ? '개 일정' : 'events today'}` : ''} />
        </div>
      )}

      {/* ─── Month + agenda + schedule ─── */}
      <SharedCalendar aside={
        scheduleOpen
          ? <WeeklySchedule onCollapse={() => toggleSchedule(false)} onPickPeriod={g => setAttendanceGrade(g)} />
          : <button onClick={() => toggleSchedule(true)} className="w-full h-9 border border-rule rounded flex items-center justify-center gap-2 text-[12px] text-ink-3 hover:text-ink hover:bg-paper-2">
              <PanelLeftClose size={13} />{lang === 'ko' ? '주간 시간표 보기' : 'Show weekly schedule'}
            </button>
      } />

      {/* ─── Attention + grading ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <NeedsAttention shared={shared} />
        <GradingQueue queue={queue} loading={shared.loading} onMark={markStudent} />
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <ClassOverviewTable />
          <AdminAlertPanel />
        </div>
      )}
      {attendanceGrade != null && <AttendanceDrawer grade={attendanceGrade} onClose={() => setAttendanceGrade(null)} />}
    </div>
  )
}

function Stat({ label, value, sub, alert, href }: { label: string; value: string; sub?: string; alert?: boolean; href?: string }) {
  const inner = (
    <>
      <p className="eyebrow">{label}</p>
      <p className={`font-display text-[28px] leading-none mt-1.5 tabular-nums ${alert ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub ? <p className="text-[11.5px] text-ink-3 mt-1 truncate">{sub}</p> : <p className="text-[11.5px] mt-1">&nbsp;</p>}
    </>
  )
  const cls = 'px-4 py-3 border-r border-rule last:border-r-0 min-w-0 block'
  return href ? <a href={href} className={`${cls} hover:bg-paper-2 transition-colors`}>{inner}</a> : <div className={cls}>{inner}</div>
}

function SectionHead({ title, meta, children }: { title: string; meta?: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-2 border-b border-rule-2 pb-2">
      <h2 className="font-display text-[22px] leading-none text-ink">{title}</h2>
      <div className="flex items-center gap-3">
        {meta && <span className="eyebrow">{meta}</span>}
        {children}
      </div>
    </div>
  )
}

// ─── Grading queue ───────────────────────────────────────────────
function GradingQueue({ queue, loading, onMark }: { queue: QueueItem[]; loading: boolean; onMark: (item: QueueItem, s: DashboardStudent, how: 'absent' | 'exempt') => void }) {
  const { language: lang } = useApp()
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? queue : queue.slice(0, 4)
  return (
    <section id="grading">
      <SectionHead title={lang === 'ko' ? '채점 대기' : 'Grading'} meta={loading ? '' : queue.length ? `${queue.length} ${lang === 'ko' ? '개 평가' : queue.length === 1 ? 'assessment' : 'assessments'}` : (lang === 'ko' ? '완료' : 'all caught up')} />
      {!loading && queue.length === 0 && (
        <p className="text-[13px] text-ink-3 py-4">{lang === 'ko' ? '미채점 평가가 없습니다.' : 'Every started assessment is fully graded.'}</p>
      )}
      <div className="divide-y divide-rule">
        {shown.map(item => (
          <div key={item.id} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink truncate">{item.name}</p>
                <p className="text-[11.5px] text-ink-3">{domainLabel(item.domain)} · /{item.max_score}{item.date ? ` · ${new Date(item.date + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''} · {item.english_class} G{item.grade}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[12px] text-ink-2 tabular-nums">{item.done} / {item.total}</span>
                <Link href={`/grades?assessment=${item.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
                  {lang === 'ko' ? '계속 채점' : 'Continue'} <ArrowRight size={12} />
                </Link>
              </div>
            </div>
            <div className="h-1 bg-paper-3 rounded-sm mt-2 overflow-hidden"><div className="h-full bg-ink-3" style={{ width: `${(item.done / item.total) * 100}%` }} /></div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.ungraded.map(s => (
                <span key={s.id} className="inline-flex items-center border border-rule-2 rounded text-[12px] bg-surface overflow-hidden">
                  <span className="px-2 py-0.5 text-ink">{s.english_name}</span>
                  <button onClick={() => onMark(item, s, 'absent')} title={lang === 'ko' ? '결석 처리' : 'Mark absent for this assessment'}
                    className="px-1.5 py-0.5 border-l border-rule-2 text-ink-3 hover:bg-warn-soft hover:text-warn inline-flex items-center gap-1"><UserX size={11} />ABS</button>
                  <button onClick={() => onMark(item, s, 'exempt')} title={lang === 'ko' ? '면제 처리' : 'Exempt from this assessment'}
                    className="px-1.5 py-0.5 border-l border-rule-2 text-ink-3 hover:bg-info-soft hover:text-info inline-flex items-center gap-1"><UserMinus size={11} />EXM</button>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {queue.length > 4 && (
        <button onClick={() => setShowAll(v => !v)} className="mt-2 text-[12.5px] font-medium text-accent hover:underline">
          {showAll ? (lang === 'ko' ? '접기' : 'Show fewer') : `${lang === 'ko' ? '모두 보기' : 'Show all'} ${queue.length}`}
        </button>
      )}
    </section>
  )
}

// ─── Needs attention ─────────────────────────────────────────────
// Students the numbers point at: grade drops, behaviour spikes, absences,
// reading-speed changes. Each row is a link; each can be put away for a week.
interface Concern { key: string; kind: string; studentId: string; name: string; cls: string; text: string; href: string }

function NeedsAttention({ shared }: { shared: SharedDashboardData }) {
  const { currentTeacher, language: lang } = useApp()
  const storageKey = `daewoo_dismissed_${currentTeacher?.id || ''}`
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: { key: string; at: number }[] = JSON.parse(saved)
        const weekAgo = Date.now() - 7 * 86400000
        setDismissed(new Set(parsed.filter(d => d.at > weekAgo).map(d => d.key)))
      }
    } catch {}
  }, [storageKey])
  const putAway = (key: string) => {
    setDismissed(prev => {
      const next = new Set(prev); next.add(key)
      try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next).map(k => ({ key: k, at: Date.now() })))) } catch {}
      return next
    })
  }
  const bringBack = () => { setDismissed(new Set()); try { localStorage.removeItem(storageKey) } catch {} }

  const concerns = useMemo<Concern[]>(() => {
    if (shared.loading || shared.students.length === 0) return []
    const out: Concern[] = []
    const students = shared.students
    const byId = (id: string) => students.find(s => s.id === id)
    const push = (kind: string, s: DashboardStudent, text: string, href: string) =>
      out.push({ key: `${kind}_${s.id}`, kind, studentId: s.id, name: s.english_name, cls: s.english_class, text, href })

    // Grade decline: average of two earlier scores vs the latest, per domain
    if (shared.activeSemester && shared.semesterAssessments.length && shared.semesterGrades.length) {
      for (const s of students) {
        const mine = shared.semesterAssessments.filter((a: any) => a.english_class === s.english_class && a.grade === s.grade)
        for (const domain of Array.from(new Set(mine.map((a: any) => a.domain)))) {
          const scores = mine.filter((a: any) => a.domain === domain).map((a: any) => {
            const g = shared.semesterGrades.find(gr => gr.student_id === s.id && gr.assessment_id === a.id)
            return g?.score != null && a.max_score > 0 ? (g.score / a.max_score) * 100 : null
          }).filter((x): x is number => x != null)
          if (scores.length >= 3) {
            const [a, b, c] = scores.slice(-3)
            const before = (a + b) / 2
            if (before - c >= 15) push('grade', s, `${domainLabel(String(domain))} ${lang === 'ko' ? '하락' : 'dropped'} ${before.toFixed(0)}% → ${c.toFixed(0)}%`, `/students/${s.id}`)
          }
        }
      }
    }
    // Behavior spike: 3+ logs this week and at least double the week before
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const fourteenAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0]
    const recent: Record<string, number> = {}, prior: Record<string, number> = {}
    shared.behaviorLogs28d.forEach(b => { if (b.date >= sevenAgo) recent[b.student_id] = (recent[b.student_id] || 0) + 1; else if (b.date >= fourteenAgo) prior[b.student_id] = (prior[b.student_id] || 0) + 1 })
    for (const [sid, n] of Object.entries(recent)) {
      const s = byId(sid)
      if (s && n >= 3 && n >= (prior[sid] || 0) * 2) push('behavior', s, `${n} ${lang === 'ko' ? '건의 행동 기록 (7일)' : 'behavior logs in 7 days'} (${lang === 'ko' ? '이전' : 'was'} ${prior[sid] || 0})`, `/students/${sid}`)
    }
    // Absences: 2+ in the last 3 days, or 2+ in the last week
    const threeAgo = new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0]
    const abs3: Record<string, number> = {}, abs7: Record<string, number> = {}
    shared.absences30d.forEach(a => { if (a.date >= threeAgo) abs3[a.student_id] = (abs3[a.student_id] || 0) + 1; if (a.date >= sevenAgo) abs7[a.student_id] = (abs7[a.student_id] || 0) + 1 })
    for (const s of students) {
      if ((abs3[s.id] || 0) >= 2) push('attendance', s, `${lang === 'ko' ? '3일 중' : 'Absent'} ${abs3[s.id]} ${lang === 'ko' ? '일 결석' : 'of the last 3 days'}`, '/attendance')
      else if ((abs7[s.id] || 0) >= 2) push('attendance', s, `${lang === 'ko' ? '이번 주' : 'Absent'} ${abs7[s.id]} ${lang === 'ko' ? '회 결석' : 'times this week'}`, '/attendance')
    }
    // Reading speed: first vs last test in the past week
    const byStudent: Record<string, { first: number; last: number }> = {}
    shared.readingAssessments.filter(r => r.date >= sevenAgo && r.cwpm != null).forEach(r => {
      if (!byStudent[r.student_id]) byStudent[r.student_id] = { first: r.cwpm!, last: r.cwpm! }
      byStudent[r.student_id].last = r.cwpm!
    })
    for (const [sid, v] of Object.entries(byStudent)) {
      const s = byId(sid); if (!s) continue
      if (v.first > v.last + 10) push('reading', s, `CWPM ${v.first} → ${v.last}`, `/students/${sid}`)
      else if (v.last > v.first + 5) push('reading-up', s, `CWPM ${v.first} → ${v.last}`, `/students/${sid}`)
    }
    return out
  }, [shared, lang])

  const live = concerns.filter(c => !dismissed.has(c.key))
  const away = concerns.filter(c => dismissed.has(c.key))
  const shown = showAll ? live : live.slice(0, 6)
  const kindLabel: Record<string, string> = { grade: lang === 'ko' ? '성적' : 'Grades', behaviour: lang === 'ko' ? '행동' : 'Behavior', attendance: lang === 'ko' ? '출석' : 'Attend.', reading: lang === 'ko' ? '읽기' : 'Reading', 'reading-up': lang === 'ko' ? '읽기 ↑' : 'Reading ↑' }
  const kindTone: Record<string, string> = { grade: 'text-bad', behaviour: 'text-warn', attendance: 'text-warn', reading: 'text-bad', 'reading-up': 'text-good' }

  return (
    <section>
      <SectionHead title={lang === 'ko' ? '주의 필요' : 'Needs attention'} meta={shared.loading ? '' : `${live.length} ${lang === 'ko' ? '건' : live.length === 1 ? 'item' : 'items'}${away.length ? ` · ${away.length} ${lang === 'ko' ? '보류' : 'put away'}` : ''}`} />
      {!shared.loading && live.length === 0 && (
        <p className="text-[13px] text-ink-3 py-4">{lang === 'ko' ? '지금은 주의할 항목이 없습니다.' : 'Nothing needs you right now.'}</p>
      )}
      <div className="divide-y divide-rule">
        {shown.map(c => (
          <div key={c.key} className="group grid grid-cols-[72px_1fr_auto] gap-3 items-baseline py-2.5">
            <span className={`eyebrow ${kindTone[c.kind] || ''}`}>{kindLabel[c.kind] || c.kind}</span>
            <Link href={c.href} className="min-w-0 hover:underline">
              <span className="text-[14px] font-semibold text-ink">{c.name}</span>
              <span className="text-[13px] text-ink-2 ml-2">{c.text}</span>
            </Link>
            <span className="flex items-center gap-2 text-[11.5px] text-ink-3">
              {c.cls}
              <button onClick={() => putAway(c.key)} title={lang === 'ko' ? '7일간 보류' : 'Put away for a week'} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink"><X size={13} /></button>
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {live.length > 6 && <button onClick={() => setShowAll(v => !v)} className="text-[12.5px] font-medium text-accent hover:underline">{showAll ? (lang === 'ko' ? '접기' : 'Show fewer') : `${lang === 'ko' ? '모두 보기' : 'Show all'} ${live.length}`}</button>}
        {away.length > 0 && <button onClick={bringBack} className="text-[12.5px] text-ink-3 hover:text-ink">{lang === 'ko' ? '보류 항목 다시 보기' : `Bring back ${away.length} put away`}</button>}
      </div>
    </section>
  )
}

// ─── Calendar: one month, an agenda, and a slot for the schedule ────
function SharedCalendar({ aside }: { aside: ReactNode }) {
  const { showToast, confirmDialog, language: lang } = useApp()
  const [cur, setCur] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [selDay, setSelDay] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editEvent, setEditEvent] = useState<any>(null)
  const [tableError, setTableError] = useState(false)
  const loadRef = useRef(0)

  const y = cur.getFullYear(), m = cur.getMonth()
  const today = getKSTDateString()
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthsKo = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
  const dayN = lang === 'ko' ? ['일','월','화','수','목','금','토'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
  const nextM = new Date(y, m + 1, 1)
  const monthName = (yy: number, mm: number) => lang === 'ko' ? `${yy}년 ${monthsKo[mm]}` : `${months[mm]} ${yy}`

  const load = useCallback(async () => {
    const token = ++loadRef.current
    // This month and the next (the agenda), plus a month of lead-in so
    // multi-day events that began earlier still render.
    const bufferStart = fmt(new Date(y, m - 1, 1))
    const windowEnd = fmt(new Date(y, m + 2, 0))
    const { data, error } = await supabase.from('calendar_events').select('*').gte('date', bufferStart).lte('date', windowEnd).order('date')
    if (token !== loadRef.current) return
    if (error) { console.warn('Calendar table error:', error.message); setTableError(true) }
    else { if (data) setEvents(data); setTableError(false) }
  }, [y, m])
  useEffect(() => { load() }, [load])

  const dayEvts = (d: string) => events.filter(e => d >= e.date && d <= (e.end_date || e.date))
  const isMulti = (e: CalEvent) => !!e.end_date && e.end_date > e.date

  useEffect(() => {
    if (!selDay || showAdd || editEvent) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelDay(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selDay, showAdd, editEvent])

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: lang === 'ko' ? '이 일정을 삭제할까요?' : 'Delete this event?', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Delete' })) return
    await supabase.from('calendar_events').delete().eq('id', id)
    showToast(lang === 'ko' ? '삭제되었습니다' : 'Deleted'); load()
  }

  // ── Month grid ──
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const cols = { gridTemplateColumns: 'minmax(0,0.6fr) repeat(5, minmax(0,1fr)) minmax(0,0.6fr)' }
  const cells: ReactNode[] = []
  for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} className="bg-paper-2/40 min-h-[112px]" />)
  for (let i = 0; i < days; i++) {
    const d = i + 1
    const date = new Date(y, m, d)
    const dateStr = fmt(date)
    const evts = dayEvts(dateStr)
    const dow = date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isToday = dateStr === today
    const filler = evts.find(ev => typeOf(ev.type).fills)
    const shown = evts.slice(0, 3)
    cells.push(
      <div key={d} onClick={() => setSelDay(dateStr)}
        style={filler ? { backgroundColor: `color-mix(in srgb, ${typeOf(filler.type).color} 8%, transparent)` } : undefined}
        className={`min-h-[112px] min-w-0 overflow-hidden px-1.5 py-1 cursor-pointer transition-colors hover:bg-paper-2/60 ${isWeekend ? 'bg-paper-2/40' : 'bg-surface'} ${selDay === dateStr ? 'ring-2 ring-accent ring-inset' : ''}`}>
        <div className={`text-[12px] font-semibold mb-1 w-[22px] h-[22px] flex items-center justify-center rounded-full tabular-nums ${isToday ? 'bg-accent text-white' : isWeekend ? 'text-ink-3' : 'text-ink-2'}`}>{d}</div>
        <div className="space-y-[3px]">
          {shown.map(ev => {
            const t = typeOf(ev.type)
            if (t.fills || isMulti(ev)) {
              // One continuous bar across the days it covers; the title sits on the
              // first day, on the 1st when it began last month, and again each Monday.
              const showTitle = dateStr === ev.date || d === 1 || dow === 1
              return (
                <div key={ev.id} title={ev.title} className="text-[10.5px] leading-tight -mx-1.5 px-1.5 py-[2px] font-semibold text-white truncate min-h-[16px]" style={{ backgroundColor: t.color }}>
                  {showTitle ? ev.title : ' '}
                </div>
              )
            }
            return (
              <div key={ev.id} title={ev.title} className="flex items-start gap-1 text-[11px] leading-[1.25] text-ink min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[4px]" style={{ backgroundColor: t.color }} />
                <span className="line-clamp-2 break-words">{ev.title}</span>
              </div>
            )
          })}
          {evts.length > 3 && <div className="text-[10px] text-ink-3 pl-2.5">+{evts.length - 3} {lang === 'ko' ? '더' : 'more'}</div>}
        </div>
      </div>
    )
  }
  const trailing = (7 - (first + days) % 7) % 7
  for (let i = 0; i < trailing; i++) cells.push(<div key={`t${i}`} className="bg-paper-2/40 min-h-[112px]" />)

  // ── Agenda: from today through the end of next month ──
  const agendaEnd = fmt(new Date(y, m + 2, 0))
  const agenda = events
    .filter(e => (e.end_date || e.date) >= today && e.date <= agendaEnd)
    .sort((a, b) => a.date.localeCompare(b.date))
  const agendaDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { day: 'numeric', month: 'short' })

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[26px] leading-none text-ink">{monthName(y, m)}</h2>
          <div className="flex items-center gap-0.5">
            <button onClick={() => setCur(new Date(y, m-1, 1))} aria-label="Previous month" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2"><ChevronLeft size={16} /></button>
            <button onClick={() => setCur(new Date(y, m+1, 1))} aria-label="Next month" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2"><ChevronRight size={16} /></button>
            <button onClick={() => setCur(new Date())} className="px-2 h-7 rounded text-[12px] font-medium text-ink-2 hover:bg-paper-2">{lang === 'ko' ? '오늘' : 'Today'}</button>
          </div>
        </div>
        <button onClick={() => { if (tableError) { showToast('Run the SQL migration first to create the calendar_events table'); return }; setShowAdd(true) }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 bg-surface text-[12.5px] font-medium text-ink hover:border-ink-3"><Plus size={13} /> {lang === 'ko' ? '일정 추가' : 'Add event'}</button>
      </div>

      {tableError && (
        <div className="my-3 p-3 bg-warn-soft border border-rule rounded text-[12.5px] text-warn">
          The calendar table is missing. Run the SQL migration in Supabase, then <button onClick={() => load()} className="underline font-semibold">retry</button>.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-8">
        <div>
          <div className="grid" style={cols}>
            {dayN.map(d => <div key={d} className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold py-1 px-1.5">{d}</div>)}
          </div>
          <div className="grid gap-px bg-rule border border-rule" style={cols}>{cells}</div>
          <div className="flex gap-4 flex-wrap mt-2.5">
            {LEGEND.map(([l, c]) => (
              <span key={l} className="flex items-center gap-1.5 text-[11px] text-ink-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />{l}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-6 min-w-0">
          {aside}
          <div>
            <div className="flex items-baseline justify-between border-b border-rule-2 pb-1.5 mb-1">
              <h3 className="font-display text-[18px] leading-none text-ink">{lang === 'ko' ? '다가오는 일정' : 'Coming up'}</h3>
              <span className="eyebrow">{lang === 'ko' ? `${monthsKo[nextM.getMonth()]}까지` : `through ${months[nextM.getMonth()]}`}</span>
            </div>
            {agenda.length === 0 ? (
              <p className="text-[12.5px] text-ink-3 py-3">{lang === 'ko' ? '예정된 일정이 없습니다.' : 'Nothing scheduled.'}</p>
            ) : (
              <div className="divide-y divide-rule max-h-[560px] overflow-y-auto">
                {agenda.map(ev => {
                  const t = typeOf(ev.type)
                  const isTodayEv = ev.date <= today && (ev.end_date || ev.date) >= today
                  return (
                    <button key={ev.id} onClick={() => setSelDay(ev.date >= today ? ev.date : today)}
                      className="w-full grid grid-cols-[64px_1fr] gap-2 items-baseline py-2 text-left hover:bg-paper-2/60 -mx-1 px-1 rounded">
                      <span className={`text-[10.5px] font-semibold uppercase tracking-wide tabular-nums ${isTodayEv ? 'text-accent' : 'text-ink-3'}`}>
                        {isTodayEv ? (lang === 'ko' ? '오늘' : 'Today') : agendaDate(ev.date)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[6px]" style={{ backgroundColor: t.color }} />
                          <span className="text-[13px] text-ink leading-snug">{ev.title}</span>
                        </span>
                        <span className="block text-[11px] text-ink-3 pl-3">{t.label}{isMulti(ev) ? ` · ${agendaDate(ev.date)} – ${agendaDate(ev.end_date!)}` : ''}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day detail */}
      {selDay && !showAdd && !editEvent && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setSelDay(null)}>
          <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
              <h4 className="font-display text-[20px] text-ink leading-none">
                {new Date(selDay + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-rule-2 text-[12px] font-medium text-ink hover:border-ink-3"><Plus size={11} /> {lang === 'ko' ? '추가' : 'Add'}</button>
                <button onClick={() => setSelDay(null)} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center"><X size={16} /></button>
              </div>
            </div>
            <div className="px-5 py-3 overflow-y-auto divide-y divide-rule">
              {dayEvts(selDay).length === 0 ? (
                <p className="text-[13px] text-ink-3 py-3">{lang === 'ko' ? '일정이 없습니다.' : 'No events this day.'}</p>
              ) : dayEvts(selDay).map(ev => {
                const t = typeOf(ev.type)
                return (
                  <div key={ev.id} className="flex items-start gap-3 py-3">
                    <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{ev.title}</p>
                      <p className="text-[11.5px] text-ink-3">{t.label}{isMulti(ev) ? ` · ${ev.date} → ${ev.end_date}` : ''}{ev.show_on_parent_calendar ? ` · ${lang === 'ko' ? '학부모 달력' : 'Parent calendar'}${ev.target_grades?.length ? ` (G${ev.target_grades.join(',')})` : ''}` : ''}</p>
                      {ev.description && <p className="text-[12.5px] text-ink-2 mt-1">{ev.description}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditEvent(ev)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(ev.id)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-bad"><Trash2 size={13} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
      {showAdd && <AddEventModal date={selDay || today} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editEvent && <AddEventModal date={editEvent.date} existingEvent={editEvent} onClose={() => setEditEvent(null)} onSaved={() => { setEditEvent(null); load() }} />}
    </section>
  )
}

// ─── Students by class (admin) ───────────────────────────────────
function ClassOverviewTable() {
  const { language: lang } = useApp()
  const { counts } = useClassCounts()
  const classes = ENGLISH_CLASSES.filter(c => c !== 'Unplaced')
  return (
    <section>
      <SectionHead title={lang === 'ko' ? '반별 학생 수' : 'Students by class'} />
      <table className="w-full text-[13px] tabular-nums">
        <thead>
          <tr>
            <th className="text-left py-1.5 eyebrow font-semibold">{lang === 'ko' ? '학년' : 'Grade'}</th>
            {classes.map(cls => <th key={cls} className="text-right py-1.5 eyebrow font-semibold">{cls}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {[1,2,3,4,5].map(grade => (
            <tr key={grade}>
              <td className="py-1.5 font-semibold text-ink">{grade}</td>
              {classes.map(cls => {
                const c = counts.find(c => c.grade === grade && c.english_class === cls)
                return <td key={cls} className="text-right py-1.5 text-ink-2">{c?.count || <span className="text-ink-3">—</span>}</td>
              })}
            </tr>
          ))}
          <tr className="border-t border-rule-2">
            <td className="py-1.5 font-semibold text-ink">{lang === 'ko' ? '합계' : 'Total'}</td>
            {classes.map(cls => {
              const total = counts.filter((c: any) => c.english_class === cls).reduce((a, c) => a + c.count, 0)
              return <td key={cls} className="text-right py-1.5 font-semibold text-ink">{total || '—'}</td>
            })}
          </tr>
        </tbody>
      </table>
    </section>
  )
}

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

  useEffect(() => {
    if (!detail) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  const dismiss = async (id: string) => {
    await supabase.from('behavior_logs').update({ is_flagged: false }).eq('id', id)
    setFlagged(p => p.filter(f => f.id !== id))
    showToast('Flag dismissed')
  }

  if (loading || flagged.length === 0) return <section><SectionHead title="Flagged for review" meta="nothing flagged" /></section>

  return (
    <div className="border border-rule-2 rounded-lg overflow-hidden">
      <div className="px-5 py-3 bg-bad-soft border-b border-rule-2 flex items-center gap-2">
        <Bell size={16} className="text-bad" />
        <h3 className="font-display text-[18px] leading-none text-ink">Flagged for Your Review</h3>
        <span className="text-[11px] bg-bad text-white px-2 py-0.5 rounded-full font-bold ml-1">{flagged.length}</span>
      </div>
      <div className="divide-y divide-rule max-h-[280px] overflow-y-auto">
        {flagged.map(e => (
          <div key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-paper-2 transition-colors cursor-pointer" onClick={() => setDetail(e)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-ink">{e.student_name}</span>
                {e.student_class && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-paper-2 text-ink-2">{e.student_class}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-soft text-info font-medium">{e.type.toUpperCase()}</span>
              </div>
              <p className="text-[12px] text-ink-2 truncate">{e.note || (e.behaviors || []).join(', ')}</p>
              <p className="text-[10px] text-ink-3 mt-0.5">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.time && ` at ${e.time}`} — {e.teacher_name || 'Unknown'}</p>
            </div>
            <button onClick={(ev: any) => { ev.stopPropagation(); dismiss(e.id) }} className="p-1.5 rounded text-ink-3 hover:text-bad hover:bg-bad-soft flex-shrink-0" title="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setDetail(null)}>
          <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(ev: any) => ev.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="font-display text-[20px] leading-none text-ink">Flagged · {detail.student_name}</h3>
              <button onClick={() => setDetail(null)} aria-label="Close" className="p-1.5 rounded hover:bg-paper-2"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto min-h-0">
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
                  <div className="flex flex-wrap gap-1">{detail.antecedents.map((a: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-info-soft text-info">{a}</span>)}</div></div>
              )}
              {(detail.behaviors || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Behaviors</p>
                  <div className="flex flex-wrap gap-1">{detail.behaviors.map((b: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-warn-soft text-warn">{b}</span>)}</div></div>
              )}
              {(detail.consequences || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Consequence</p>
                  <div className="flex flex-wrap gap-1">{detail.consequences.map((c: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-bad-soft text-bad">{c}</span>)}</div></div>
              )}
              {detail.intensity > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-tertiary font-semibold uppercase">Intensity:</span>
                  {[1,2,3,4,5].map(i => <div key={i} className={`w-4 h-4 rounded-full ${i <= detail.intensity ? (detail.intensity >= 4 ? 'bg-bad' : detail.intensity >= 3 ? 'bg-warn' : 'bg-good') : 'bg-paper-3'}`} />)}
                </div>
              )}
              {detail.frequency > 1 && <div><span className="text-[10px] text-text-tertiary font-semibold uppercase">Frequency:</span><span className="text-[12px] ml-1">{detail.frequency}x</span></div>}
              {detail.note && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Notes</p><p className="text-[13px] whitespace-pre-wrap">{detail.note}</p></div>}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between">
              <button onClick={() => { dismiss(detail.id); setDetail(null) }} className="px-3 py-1.5 rounded text-[12px] font-medium text-bad hover:bg-bad-soft">Dismiss Flag</button>
              <button onClick={() => setDetail(null)} className="px-4 py-1.5 rounded text-[12px] font-medium bg-accent text-white hover:bg-accent-hover">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function AddEventModal({ date, onClose, onSaved, existingEvent }: { date: string; onClose: () => void; onSaved: () => void; existingEvent?: any }) {
  const { currentTeacher, showToast } = useApp()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const [title, setTitle] = useState(existingEvent?.title || '')
  const [eventDate, setEventDate] = useState(existingEvent?.date || date)
  const [endDate, setEndDate] = useState(existingEvent?.end_date || '')
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
      end_date: endDate && endDate > eventDate ? endDate : null,
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
      const { show_on_parent_calendar, target_grades, end_date, ...basePayload } = payload
      if (isEdit) {
        const res = await supabase.from('calendar_events').update(basePayload).eq('id', existingEvent.id)
        error = res.error
      } else {
        const res = await supabase.from('calendar_events').insert({ ...basePayload, created_by: currentTeacher?.id || null })
        error = res.error
      }
      if (!error) showToast('Saved — run the calendar migrations (parent-calendar + end_date) to enable multi-day and parent-calendar features')
    }

    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { if (!error) showToast(isEdit ? 'Event updated' : 'Event added'); onSaved() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col" onClick={(e: any) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h3 className="font-display text-[20px] leading-none text-ink">{isEdit ? 'Edit event' : 'Add event'}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-paper-2"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto min-h-0">
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Title *</label>
            <input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. Phonics Unit 3 Lesson Plan" autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Start date</label>
              <input type="date" value={eventDate} onChange={(e: any) => { setEventDate(e.target.value); if (endDate && endDate < e.target.value) setEndDate('') }}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">End date <span className="normal-case text-text-tertiary">(opt)</span></label>
              <input type="date" value={endDate} min={eventDate} onChange={(e: any) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          {endDate && endDate > eventDate && (
            <p className="text-[10px] text-navy -mt-1">Multi-day event — shows on every day from {eventDate} to {endDate}.</p>
          )}
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Type</label>
            <select value={type} onChange={(e: any) => setType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select></div>
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
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} {isEdit ? 'Update' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Class Overview Table (Admin only) ────────────────────────────

