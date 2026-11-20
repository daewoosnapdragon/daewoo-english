'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { WHATS_NEW, todayISO } from '@/content/whats-new'
import { WHATS_NEW_OVERRIDES_KEY, applyOverrides, parseOverrides, visibleEntries, type EffectiveEntry, type WhatsNewOverrides } from '@/lib/whatsNewOverrides'

// Per-teacher "seen up to" date, kept in app_settings under
// whats_new_seen:<teacher id> so it follows the teacher between computers,
// and the admin overrides (dates moved, entries turned off) under one
// shared key. A module cache keeps the dot on the name button, the count
// in the name menu, the popup the What's new page can replay and the page
// itself in step.

const SEEN_EVENT = 'daewoo:whats-new-seen'
const seenCache: Record<string, string> = {}
let overridesCache: WhatsNewOverrides | null = null

export function useWhatsNew() {
  const { currentTeacher } = useApp()
  const tid = currentTeacher?.id || ''
  const [seen, setSeen] = useState<string | null>(tid && seenCache[tid] !== undefined ? seenCache[tid] : null)
  const [overrides, setOverridesState] = useState<WhatsNewOverrides | null>(overridesCache)

  useEffect(() => {
    if (!tid) return
    let cancelled = false
    const on = () => { setSeen(seenCache[tid] ?? ''); setOverridesState(overridesCache) }
    window.addEventListener(SEEN_EVENT, on)
    if (seenCache[tid] !== undefined && overridesCache) { on() }
    else (async () => {
      const { data } = await supabase.from('app_settings').select('key, value').in('key', [`whats_new_seen:${tid}`, WHATS_NEW_OVERRIDES_KEY])
      if (cancelled) return
      const rows = (data || []) as { key: string; value: string | null }[]
      seenCache[tid] = rows.find(r => r.key === `whats_new_seen:${tid}`)?.value || ''
      overridesCache = parseOverrides(rows.find(r => r.key === WHATS_NEW_OVERRIDES_KEY)?.value)
      on()
    })()
    return () => { cancelled = true; window.removeEventListener(SEEN_EVENT, on) }
  }, [tid])

  const loaded = seen != null && overrides != null
  const today = todayISO()
  /** Every entry, code order, with the overrides applied (off ones included). */
  const entries: EffectiveEntry[] = applyOverrides(WHATS_NEW, overrides || {})
  /** What teachers see: on, and dated today or earlier; newest first. */
  const released = loaded ? visibleEntries(entries, today) : []
  /** Held for a later date, soonest first. */
  const scheduled = loaded ? entries.filter(e => !e.off && e.date > today).sort((a, b) => a.date.localeCompare(b.date)) : []
  const unseen = seen == null ? [] : released.filter(e => e.date > seen)

  const markSeen = useCallback(async () => {
    if (!tid) return
    const latest = released[0]?.date || ''
    seenCache[tid] = latest; setSeen(latest)
    window.dispatchEvent(new CustomEvent(SEEN_EVENT))
    await supabase.from('app_settings').upsert({ key: `whats_new_seen:${tid}`, value: latest }, { onConflict: 'key' })
  }, [tid, released])

  /** Admin: store a new override table. Returns an error message, or null. */
  const saveOverrides = useCallback(async (next: WhatsNewOverrides, what: string): Promise<string | null> => {
    overridesCache = next; setOverridesState(next)
    window.dispatchEvent(new CustomEvent(SEEN_EVENT))
    const { error } = await supabase.from('app_settings').upsert({ key: WHATS_NEW_OVERRIDES_KEY, value: JSON.stringify(next), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (!error) logActivity('settings', `What’s new · ${what}`)
    return error?.message || null
  }, [])

  return { entries, released, scheduled, unseen, loaded, today, markSeen, overrides: overrides || {}, saveOverrides }
}
