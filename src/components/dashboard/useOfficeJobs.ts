'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { expandAwayDays, type CalendarRow } from '@/lib/calendarDays'
import { getKSTDateString } from '@/lib/utils'
import { OFFICE_JOBS_KEY, parseOfficeJobs, cleaningDays, upcoming, addDays, type OfficeJobsConfig } from '@/lib/officeJobs'

// ─── The office jobs rotation, as the app sees it today ─────────
// Loads the saved rotation and the whole-school days off around today,
// and derives the cleaning days from them (Friday, or the day before while
// Friday is off). Settings passes a draft to preview changes before saving.

export function useOfficeJobs(draft?: OfficeJobsConfig | null) {
  const [saved, setSaved] = useState<OfficeJobsConfig | null>(null)
  const [away, setAway] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const today = getKSTDateString()
  // Days off well back from today, so a week that was off earlier in the
  // semester still counts (the rotation waits through it) in what shows now.
  const from = addDays(today, -150), to = addDays(today, 84), shownFrom = addDays(today, -7)

  const load = useCallback(async () => {
    const [cfgRes, evRes] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', OFFICE_JOBS_KEY).limit(1),
      supabase.from('calendar_events').select('type, title, date, end_date, target_grades').eq('type', 'day_off').lte('date', to).or(`end_date.gte.${from},and(end_date.is.null,date.gte.${from})`),
    ])
    setSaved(parseOfficeJobs(((cfgRes.data as any[]) || [])[0]?.value))
    // Only a whole-school day off moves the jobs; a day off for one grade does not.
    const rows = ((evRes.data || []) as CalendarRow[]).filter(r => !r.target_grades || r.target_grades.length === 0)
    const map: Record<string, string> = {}
    expandAwayDays(rows, from, to, null, { noClass: [] }).forEach(d => { map[d.date] = d.reason })
    setAway(map)
    setLoading(false)
  }, [from, to])
  useEffect(() => { load() }, [load])

  const cfg = draft ?? saved
  const days = useMemo(() => cfg ? cleaningDays(cfg, to, away).filter(d => d.date >= shownFrom) : [], [cfg, away, to, shownFrom])
  const ready = !!cfg && cfg.people.length > 0 && cfg.jobs.length > 0 && !!cfg.start
  return { cfg, saved, away, days, today, loading, ready, reload: load, ...upcoming(days, today) }
}
