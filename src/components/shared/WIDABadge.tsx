'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WIDA_LEVELS } from '@/lib/wida'

// WIDA levels are read by badges on nearly every student row, so they are
// fetched once and shared rather than queried per badge. Mounted badges
// subscribe so an edit in WIDA Profiles refreshes them immediately, instead of
// showing stale levels until the next full page load.
let widaCache: Record<string, Record<string, number>> = {}
let cacheLoaded = false
let inFlight: Promise<typeof widaCache> | null = null
const subscribers = new Set<() => void>()

export async function loadWIDACache() {
  if (cacheLoaded) return widaCache
  // Dedupe concurrent first loads: many badges mount in the same tick.
  if (inFlight) return inFlight
  inFlight = (async () => {
    const { data } = await supabase.from('student_wida_levels').select('student_id, domain, wida_level')
    const next: Record<string, Record<string, number>> = {}
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
  const vals = Object.values(sl).filter((v): v is number => v != null && v > 0)
  if (vals.length === 0) return null
  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  const rounded = Math.round(avg)
  const info = WIDA_LEVELS.find(w => w.level === rounded)
  if (!info) return null

  // Build domain breakdown for tooltip
  const domainLabels: Record<string, string> = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' }
  const breakdown = Object.entries(sl).map(([d, v]) => `${domainLabels[d] || d}${v}`).join(' ')

  if (compact) {
    return (
      <span className="relative inline-block"
        onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold cursor-help"
          style={{ backgroundColor: info.bg, color: '#374151', borderLeft: `2px solid ${info.color}` }}>
          L{info.level}
        </span>
        {showTip && (
          <span className="absolute left-0 top-full mt-1 w-56 bg-navy-dark text-white rounded-lg shadow-lg p-3 z-[200] text-[10px] leading-relaxed pointer-events-none">
            <span className="font-bold text-gold block mb-1">L{info.level} {info.name} ({breakdown})</span>
            <span className="block text-blue-200 mb-1.5">{info.desc}</span>
            <span className="block text-green-300 font-medium">Scaffolds:</span>
            <span className="block text-green-200">{info.scaffolds}</span>
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="relative inline-block"
      onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium cursor-help"
        style={{ backgroundColor: info.bg, color: '#374151' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
        L{info.level}
      </span>
      {showTip && (
        <span className="absolute bottom-full left-0 mb-1 w-56 bg-navy-dark text-white rounded-lg shadow-lg p-3 z-[90] text-[10px] leading-relaxed pointer-events-none">
          <span className="font-bold text-gold block mb-1">L{info.level} {info.name} ({breakdown})</span>
          <span className="block text-blue-200 mb-1.5">{info.desc}</span>
          <span className="block text-green-300 font-medium">Scaffolds:</span>
          <span className="block text-green-200">{info.scaffolds}</span>
        </span>
      )}
    </span>
  )
}
