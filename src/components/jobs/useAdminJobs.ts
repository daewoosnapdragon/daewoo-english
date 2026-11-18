'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { fetchJobs, fetchOpenQuestions, fetchRoutines, isAdminJobsMissing } from '@/lib/adminJobsData'
import { getKSTDateString } from '@/lib/utils'
import type { AdminEvent, AdminJob, AdminJobQuestion, AdminRoutine, AdminRoutineJob } from '@/lib/adminJobs'

// ─── The admin jobs, as the app sees them now ────────────────────
// Loads everything the page and the dashboard card need in one go: the
// jobs, the routines with their templates and dated events, and the
// unanswered Stuck questions. `missing` means the migration has not been run.

export function useAdminJobs(opts: { routines?: boolean } = {}) {
  const { currentTeacher, semesters, activeSemester } = useApp()
  const { teachers } = useTeachers()
  const [jobs, setJobs] = useState<AdminJob[]>([])
  const [routines, setRoutines] = useState<AdminRoutine[]>([])
  const [template, setTemplate] = useState<AdminRoutineJob[]>([])
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [questions, setQuestions] = useState<AdminJobQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = getKSTDateString()

  const reload = useCallback(async () => {
    const [j, q, r] = await Promise.all([fetchJobs(), fetchOpenQuestions(), opts.routines ? fetchRoutines() : Promise.resolve(null)])
    if (isAdminJobsMissing(j.error) || isAdminJobsMissing(r?.error)) { setMissing(true); setLoading(false); return }
    setError(j.error || r?.error || null)
    setJobs(j.jobs); setQuestions(q)
    if (r) { setRoutines(r.routines); setTemplate(r.template); setEvents(r.events) }
    setLoading(false)
  }, [opts.routines])
  useEffect(() => { reload() }, [reload])

  const nameOf = useCallback((id: string | null | undefined) => id ? (teachers.find(t => t.id === id)?.name || '—') : '—', [teachers])
  const semesterName = useCallback((id: string | null | undefined) => id ? (semesters.find(s => s.id === id)?.name || null) : null, [semesters])
  const childrenOf = useMemo(() => { const m: Record<string, AdminJob[]> = {}; jobs.forEach(j => { if (j.parent_id) (m[j.parent_id] ||= []).push(j) }); return m }, [jobs])

  return { jobs, routines, template, events, questions, loading, missing, error, reload, today, teachers, nameOf, semesterName, childrenOf, me: currentTeacher, activeSemester, semesters }
}
