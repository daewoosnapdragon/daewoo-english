'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WIDA_LEVELS } from '@/lib/wida'
import { widaLevelFromDomains, type WidaDomainMap } from '@/lib/rosterSort'

// WIDA levels are read by badges on nearly every student row, so they are
// fetched once and shared rather than queried per badge. Mounted badges
// subscribe so an edit in WIDA Profiles refreshes them immediately, instead of
// showing stale levels until the next full page load.
let widaCache: WidaDomainMap = {}
let cacheLoaded = false
let inFlight: Promise<typeof widaCache> | null = null
const subscribers = new Set<() => void>()

export async function loadWIDACache() {
  if (cacheLoaded) return widaCache
  // Dedupe concurrent first loads: many badges mount in the same tick.
  if (inFlight) return inFlight
  inFlight = (async () => {
    const { data } = await supabase.from('student_wida_levels').select('student_id, domain, wida_level')
    const next: WidaDomainMap = {}
    if (data) {
      data.forEach((r: any) => {
        if (!next[r.student_id]) next[r.student_id] = {}
        next[r.student_id][r.domain] = r.wida_level
      })
    }
    widaCache = next
    cacheLoaded = true
    inFlight = null
    return widaCache
  })()
  return inFlight
}

/** Call after writing student_wida_levels so every visible badge updates. */
export function invalidateWIDACache() {
  cacheLoaded = false
  inFlight = null
  loadWIDACache().then(() => { subscribers.forEach(fn => fn()) })
}

/**
 * The whole WIDA cache, for views that sort or filter rows by level rather
 * than rendering one badge each. Re-renders when the cache loads or is
 * invalidated, the same as the badges do.
 */
export function useWIDALevels(): WidaDomainMap {
  const [, forceRender] = useState(0)
  useEffect(() => {
    if (!cacheLoaded) { loadWIDACache().then(() => forceRender(n => n + 1)) }
    const onChange = () => forceRender(n => n + 1)
    subscribers.add(onChange)
    return () => { subscribers.delete(onChange) }
  }, [])
  return widaCache
}

export default function WIDABadge({ studentId, compact }: { studentId: string; compact?: boolean }) {
  const [, forceRender] = useState(0)
  const [ready, setReady] = useState(cacheLoaded)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (!cacheLoaded) { loadWIDACache().then(() => setReady(true)) }
    const onChange = () => { setReady(true); forceRender(n => n + 1) }
    subscribers.add(onChange)
    return () => { subscribers.delete(onChange) }
  }, [])

  if (!ready) return null
  const sl = widaCache[studentId]
  if (!sl) return null
  const rounded = widaLevelFromDomains(sl)
  if (rounded == null) return null
  const info = WIDA_LEVELS.find(w => w.level === rounded)
  if (!info) return null

  // Build domain breakdown for tooltip
  const domainLabels: Record<string, string> = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' }
  const breakdown = Object.entries(sl).map(([d, v]) => `${domainLabels[d] || d}${v}`).join(' ')

  // Fill, ink and dot all come from the --wida-N tokens in globals.css, so the
  // badge reads in dark mode and sits in the paper palette.
  const fill = `var(--wida-${info.level})`
  const ink = `var(--wida-${info.level}-ink)`
  const tip = (
    <>
      <span className="font-semibold text-ink block mb-1">L{info.level} {info.name} <span className="font-normal text-ink-3">({breakdown})</span></span>
      <span className="block text-ink-2 mb-1.5">{info.desc}</span>
      <span className="block text-ink font-semibold">Scaffolds:</span>
      <span className="block text-ink-2">{info.scaffolds}</span>
    </>
  )
  const tipBox = 'absolute w-56 bg-surface border border-rule-2 text-ink rounded-lg shadow-lg p-3 text-[length:calc(11.5px*var(--ts))] leading-relaxed pointer-events-none'

  if (compact) {
    return (
      <span className="relative inline-block"
        onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[length:calc(11.5px*var(--ts))] font-bold cursor-help border"
          style={{ backgroundColor: fill, color: ink, borderColor: `color-mix(in srgb, ${ink} 30%, transparent)` }}>
          L{info.level}
        </span>
        {showTip && <span className={`${tipBox} left-0 top-full mt-1 z-[200]`}>{tip}</span>}
      </span>
    )
  }

  return (
    <span className="relative inline-block"
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[length:calc(11.5px*var(--ts))] font-medium cursor-help"
        style={{ backgroundColor: fill, color: ink }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ink }} />
        L{info.level}
      </span>
      {showTip && <span className={`${tipBox} bottom-full left-0 mb-1 z-[90]`}>{tip}</span>}
    </span>
  )
}
