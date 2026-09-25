'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Schedule rules ──────────────────────────────────────────────
// Days a grade has no English class, by weekday. Set in Settings and read by
// the lesson planner (the cell is greyed and skipped) and attendance (the day
// is skipped when stepping and shows as no class). Was "No G5 Mondays",
// hardcoded in three places.

export interface ScheduleRules { noClass: { grade: number; weekday: number }[] }   // weekday: 1 = Monday … 5 = Friday
export const DEFAULT_SCHEDULE_RULES: ScheduleRules = { noClass: [{ grade: 5, weekday: 1 }] }
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

let cache: ScheduleRules | null = null

export async function loadScheduleRules(): Promise<ScheduleRules> {
  if (cache) return cache
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'schedule_rules').single()
    if (data?.value) { const parsed = JSON.parse(data.value); if (Array.isArray(parsed?.noClass)) { cache = parsed; return parsed } }
  } catch {}
  cache = DEFAULT_SCHEDULE_RULES
  return cache
}

export async function saveScheduleRules(rules: ScheduleRules): Promise<string | null> {
  const { error } = await supabase.from('app_settings').upsert({ key: 'schedule_rules', value: JSON.stringify(rules) }, { onConflict: 'key' })
  if (!error) cache = rules
  return error ? error.message : null
}

export function noClassOn(rules: ScheduleRules, grade: number, weekday: number): boolean {
  return rules.noClass.some(r => r.grade === Number(grade) && r.weekday === weekday)
}

/** The rules, with a checker that takes a weekday (1–5) or a YYYY-MM-DD date. */
export function useScheduleRules() {
  const [rules, setRules] = useState<ScheduleRules>(cache || DEFAULT_SCHEDULE_RULES)
  const [loading, setLoading] = useState(!cache)
  useEffect(() => { loadScheduleRules().then(r => { setRules(r); setLoading(false) }) }, [])
  const isNoClassDay = useCallback((grade: number, when: number | string) => {
    const weekday = typeof when === 'number' ? when : new Date(when + 'T12:00:00').getDay()
    return noClassOn(rules, grade, weekday)
  }, [rules])
  return { rules, loading, isNoClassDay, setRules }
}
