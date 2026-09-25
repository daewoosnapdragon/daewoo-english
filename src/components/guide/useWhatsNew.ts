'use client'

import { useCallback, useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { releasedEntries, latestReleaseDate, type WhatsNewEntry } from '@/content/whats-new'

// Per-teacher "seen up to" date, kept in app_settings under
// whats_new_seen:<teacher id> so it follows the teacher between computers.
// A module cache keeps the masthead dot and the dashboard card in step.

const SEEN_EVENT = 'daewoo:whats-new-seen'
const cache: Record<string, string> = {}

export function useWhatsNew() {
  const { currentTeacher } = useApp()
  const tid = currentTeacher?.id || ''
  const [seen, setSeen] = useState<string | null>(tid && cache[tid] !== undefined ? cache[tid] : null)

  useEffect(() => {
    if (!tid) return
    if (cache[tid] !== undefined) { setSeen(cache[tid]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', `whats_new_seen:${tid}`).maybeSingle()
      if (cancelled) return
      cache[tid] = data?.value || ''
      setSeen(cache[tid])
    })()
    const on = () => setSeen(cache[tid] ?? '')
    window.addEventListener(SEEN_EVENT, on)
    return () => { cancelled = true; window.removeEventListener(SEEN_EVENT, on) }
  }, [tid])

  const released: WhatsNewEntry[] = releasedEntries()
  const unseen = seen == null ? [] : released.filter(e => e.date > seen)
  const markSeen = useCallback(async () => {
    if (!tid) return
    const latest = latestReleaseDate()
    cache[tid] = latest; setSeen(latest)
    window.dispatchEvent(new CustomEvent(SEEN_EVENT))
    await supabase.from('app_settings').upsert({ key: `whats_new_seen:${tid}`, value: latest }, { onConflict: 'key' })
  }, [tid])

  return { released, unseen, loaded: seen != null, markSeen }
}
