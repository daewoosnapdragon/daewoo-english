'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { monthRange, DEFAULT_OVERTIME_SETTINGS, type OvertimeEntry, type OvertimeSettings } from '@/lib/overtime'
import { fetchOvertime, isOvertimeMissing, loadOvertimeSettings } from '@/lib/overtimeData'

// ─── Overtime entries for a span of days ─────────────────────────
// One teacher's entries (or everyone's, for admin) in [from, to], the
// whole-school days off in it, and whether the table exists yet. The page
// asks for the month on screen; the print view asks for the dates chosen,
// which can reach into other months. While a new span loads, the last one
// stays on screen; `loading` is true until the asked-for span is in.

interface Loaded { key: string; from: string; to: string; entries: OvertimeEntry[]; daysOff: Record<string, string> }

export function useOvertimeRange(teacherId: string | null, from: string, to: string) {
  const [data, setData] = useState<Loaded | null>(null)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)
  const key = teacherId || '*'

  const reload = useCallback(async () => {
    const n = ++seq.current
    const r = await fetchOvertime(teacherId, from, to)
    if (n !== seq.current) return
    if (r.error) { setMissing(isOvertimeMissing(r.error)); setError(r.error); setData(d => d || { key, from, to, entries: [], daysOff: {} }); return }
    setData({ key, from, to, entries: r.entries, daysOff: r.daysOff }); setMissing(false); setError(null)
  }, [teacherId, key, from, to])
  useEffect(() => { reload() }, [reload])

  const covered = !!data && data.key === key && data.from <= from && data.to >= to
  return {
    entries: data && data.key === key ? data.entries : [],
    daysOff: data && data.key === key ? data.daysOff : {},
    loading: !covered && !error,
    missing, error, reload,
  }
}

export function useOvertimeMonth(teacherId: string | null, month: string) {
  const { from, to } = monthRange(month)
  return useOvertimeRange(teacherId, from, to)
}

export function useOvertimeSettings() {
  const [settings, setSettings] = useState<OvertimeSettings>(DEFAULT_OVERTIME_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const reload = useCallback(async () => { setSettings(await loadOvertimeSettings()); setLoaded(true) }, [])
  useEffect(() => { reload() }, [reload])
  return { settings, setSettings, loaded, reload }
}
