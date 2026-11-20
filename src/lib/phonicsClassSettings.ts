'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'

// ─── Phonics: classes that skip the alphabet sheets ──────────────
// A class past the alphabet can switch the letter names and letter sounds
// sheets off. They then leave its heat map, sheet picker, printed sheets,
// CSV and the student page, and on Whole grade and All grades its row reads
// "Skipped" across those columns rather than a run of empty cells. Saved
// results are kept and come back if the class switches them on again.
//
// One app_settings row, a JSON list of "grade|class" keys, so every teacher
// sees the same choice. No table to migrate.

const KEY = 'phonics_skip_alphabet'

export const phonicsClassKey = (grade: number | string, englishClass: string) => `${grade}|${englishClass}`

let cache: Set<string> | null = null
let loading: Promise<void> | null = null
const listeners = new Set<(s: Set<string>) => void>()
const publish = (s: Set<string>) => { cache = s; listeners.forEach(fn => fn(s)) }

function parse(v: unknown): Set<string> {
  try {
    const arr = typeof v === 'string' ? JSON.parse(v) : v
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch { return new Set() }
}

async function read(): Promise<Set<string>> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', KEY).maybeSingle()
  return parse(data?.value)
}

function load(): Promise<void> {
  if (!loading) loading = read().then(publish).catch(() => publish(new Set()))
  return loading
}

/** The classes skipping the alphabet sheets, as phonicsClassKey keys; `loaded` false until read. */
export function useAlphabetSkips(): { skips: Set<string>; loaded: boolean } {
  const [skips, setSkips] = useState<Set<string> | null>(cache)
  useEffect(() => {
    listeners.add(setSkips)
    if (cache) setSkips(cache); else load()
    return () => { listeners.delete(setSkips) }
  }, [])
  return { skips: skips || new Set(), loaded: skips != null }
}

/** Switches the alphabet sheets off (skip) or on for one class. Returns an error message or null. */
export async function setAlphabetSkip(grade: number | string, englishClass: string, skip: boolean): Promise<string | null> {
  // Read fresh before writing, so a change another teacher made meanwhile is kept.
  const next = await read()
  const k = phonicsClassKey(grade, englishClass)
  if (skip) next.add(k); else next.delete(k)
  const { error } = await supabase.from('app_settings').upsert({ key: KEY, value: JSON.stringify(Array.from(next).sort()), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return error.message
  publish(next)
  logActivity('settings', `Phonics: alphabet sheets ${skip ? 'skipped' : 'switched back on'} for Grade ${grade} ${englishClass}`, { path: '/reading' })
  return null
}
