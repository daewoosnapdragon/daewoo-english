'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { loadLadderSettings, isOverdue } from '@/lib/behaviorLadder'
import { NAV_MORE } from '@/lib/routes'
import { canViewActivity } from '@/lib/activity'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { loadClassAttendanceToday, unmarkedByGrade, hasClassToday, type GradeUnmarked } from '@/lib/attendanceToday'
import DrawnCheck from '@/components/brand/DrawnCheck'

// ─── What the nav knows ──────────────────────────────────────────
// Shared by the masthead's links and the phone's bottom bar, so a dot or a
// count means the same thing in both.

/**
 * Flagged behavior logs the admin has to act on. A flag on good news (a
 * positive note, a plain note) is something to read, not a problem, so it
 * does not count toward the badge.
 */
export const FLAG_ACTION_TYPES = ['concern', 'negative', 'abc', 'intervention', 'parent_contact']

export interface Signals {
  /** The teacher's own grades still unmarked today, on a day they have class. */
  unmarked: GradeUnmarked[]
  /** Every grade the teacher has class with today is marked. */
  attendanceDone: boolean
  /** Admin: flagged logs that need an action. */
  flagged: number
  /** After 3:30 on a weekday with something unmarked: the reminder band shows. */
  reminder: boolean
  cases: number
  overdue: number
}

/**
 * What the nav has to know: which of the teacher's grades are still unmarked
 * today (read the same way as the dashboard's Attendance today figure, see
 * lib/attendanceToday), and for admin how many flags and cases want action.
 * Re-checked on every route change and once a minute, so the 3:30 reminder
 * appears without a reload.
 */
export function useNavSignals(pathname: string | null): Signals {
  const { currentTeacher } = useApp()
  const [s, setS] = useState<Signals>({ unmarked: [], attendanceDone: false, flagged: 0, reminder: false, cases: 0, overdue: 0 })
  const checkRef = useRef<() => void>(() => {})
  const lastCheck = useRef(Date.now())
  useEffect(() => {
    if (!currentTeacher) return
    let cancelled = false
    lastCheck.current = 0
    const check = async () => {
      const isAdmin = currentTeacher.role === 'admin'
      const cls = currentTeacher.english_class
      const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const today = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
      // Behavior ladder cases: every open one for admin, the class's for a teacher.
      const caseQuery = isAdmin
        ? supabase.from('behavior_cases').select('id, status, created_at').neq('status', 'closed')
        : supabase.from('behavior_cases').select('id, status, created_at, students!inner(english_class)').neq('status', 'closed').eq('students.english_class', cls)
      // Admin has no class of their own to mark; the dashboard shows them the school.
      const [att, flaggedRes, caseRes, ladder] = await Promise.all([
        isAdmin ? Promise.resolve(null) : loadClassAttendanceToday(cls, today),
        isAdmin ? supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('is_flagged', true).in('type', FLAG_ACTION_TYPES) : Promise.resolve({ count: 0 }),
        caseQuery, loadLadderSettings(),
      ])
      if (cancelled) return
      const caseRows = (caseRes.data || []) as any[]
      const overdue = isAdmin ? caseRows.filter(c => isOverdue(c, ladder.overdue_days)).length : 0
      const unmarked = att ? unmarkedByGrade(att.students, att.marked, att.day) : []
      const done = !!att && unmarked.length === 0 && hasClassToday(att.students, att.day)
      const minutes = kst.getHours() * 60 + kst.getMinutes()
      setS({ unmarked, attendanceDone: done, flagged: flaggedRes.count || 0, reminder: unmarked.length > 0 && minutes >= 15 * 60 + 30, cases: caseRows.length, overdue })
    }
    checkRef.current = () => { lastCheck.current = Date.now(); check() }
    checkRef.current()
    const id = setInterval(() => checkRef.current(), 60_000)
    const now = () => checkRef.current()
    window.addEventListener('daewoo:attendance-saved', now)
    window.addEventListener('daewoo:ladder-changed', now)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('daewoo:attendance-saved', now); window.removeEventListener('daewoo:ladder-changed', now) }
  }, [currentTeacher])
  // Changing page checks again only if the last check is more than 45 s old,
  // so a click does not send five requests the header already has answers to.
  useEffect(() => {
    if (Date.now() - lastCheck.current > 45_000) checkRef.current()
  }, [pathname])
  return s
}

/** The More pages this account may open: Jobs and Activity are for some accounts only. */
export function useMoreIds(): string[] {
  const { currentTeacher } = useApp()
  return NAV_MORE.filter(id => id === 'jobs' ? canSeeAdminJobs(currentTeacher) : id === 'activity' ? canViewActivity(currentTeacher) : true)
}

/** "Grade 3" or "Grades 3 and 4", for the reminder and the dots' labels. */
export function gradesPhrase(list: GradeUnmarked[], ko: boolean) {
  const gs = list.map(g => g.grade)
  if (ko) return gs.map(g => `${g}학년`).join(', ')
  return gs.length === 1 ? `Grade ${gs[0]}` : `Grades ${gs.slice(0, -1).join(', ')} and ${gs[gs.length - 1]}`
}

/**
 * The small marks after a link: a count on Dashboard when something wants
 * action, a dot on Attendance while one of the teacher's grades is unmarked
 * today, a drawn check once all are. The count is ink, not red: an open
 * case is work to do, not an error.
 */
export function NavMarks({ id, signals, ko }: { id: string; signals: Signals; ko: boolean }) {
  const badge = id === 'dashboard' ? (signals.cases || signals.flagged) : 0
  const dot = id === 'attendance' && signals.unmarked.length > 0
  const done = id === 'attendance' && signals.attendanceDone
  const dotText = dot ? (ko ? `${gradesPhrase(signals.unmarked, true)} 출석 미완료` : `${gradesPhrase(signals.unmarked, false)} not marked yet`) : ''
  return (
    <>
      {badge ? <span className="min-w-[16px] h-4 px-1 rounded-full bg-ink text-paper text-[length:calc(11.5px*var(--ts))] font-semibold tabular-nums flex items-center justify-center">{badge > 9 ? '9+' : badge}<span className="sr-only"> {ko ? '건 확인 필요' : 'need a look'}</span></span> : null}
      {dot ? <span className="w-1.5 h-1.5 rounded-full bg-warn" title={dotText}><span className="sr-only">{dotText}</span></span> : null}
      {done ? <span title={ko ? '오늘 출석 완료' : 'All marked today'} className="inline-flex"><DrawnCheck size={12} /><span className="sr-only">{ko ? '오늘 출석 완료' : 'All marked today'}</span></span> : null}
    </>
  )
}
