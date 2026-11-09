'use client'

import { useCallback, useEffect, useState } from 'react'
import { monthRange, DEFAULT_OVERTIME_SETTINGS, type OvertimeEntry, type OvertimeSettings } from '@/lib/overtime'
import { fetchOvertime, isOvertimeMissing, loadOvertimeSettings } from '@/lib/overtimeData'

// ─── One month of overtime, as the page sees it ──────────────────
// One teacher's entries (or everyone's, for admin) for the month, the
// whole-school days off in it, and whether the table exists yet.

export function useOvertimeMonth(teacherId: string | null, month: string) {
  const [entries, setEntries] = useState<OvertimeEntry[]>([])
  const [daysOff, setDaysOff] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const { from, to } = monthRange(month)
    const r = await fetchOvertime(teacherId, from, to)
    if (r.error) { setMissing(isOvertimeMissing(r.error)); setError(r.error); setLoading(false); return }
    setEntries(r.entries); setDaysOff(r.daysOff); setMissing(false); setError(null); setLoading(false)
  }, [teacherId, month])
  useEffect(() => { setLoading(true); reload() }, [reload])

  return { entries, daysOff, loading, missing, error, reload }
}

export function useOvertimeSettings() {
  const [settings, setSettings] = useState<OvertimeSettings>(DEFAULT_OVERTIME_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => { setSettings(await loadOvertimeSettings()); setLoaded(true) }, [])
  useEffect(() => { reload() }, [reload])
  return { settings, setSettings, loaded, reload }
}
