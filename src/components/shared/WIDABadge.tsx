'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { WIDA_LEVELS } from '@/components/curriculum/CurriculumView'

// Cache WIDA levels globally to avoid repeated queries
let widaCache: Record<string, Record<string, number>> = {}
let cacheLoaded = false

export async function loadWIDACache() {
  if (cacheLoaded) return widaCache
  const { data } = await supabase.from('student_wida_levels').select('student_id, domain, wida_level')
  if (data) {
    widaCache = {}
    data.forEach((r: any) => {
      if (!widaCache[r.student_id]) widaCache[r.student_id] = {}
      widaCache[r.student_id][r.domain] = r.wida_level
    })
  }
  cacheLoaded = true
  return widaCache
}

export function getStudentWIDAOverall(studentId: string): number | null {
  const sl = widaCache[studentId]
  if (!sl) return null
  const vals = Object.values(sl).filter((v): v is number => v != null && v > 0)
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

export default function WIDABadge({ studentId, compact }: { studentId: string; compact?: boolean }) {
  const [ready, setReady] = useState(cacheLoaded)

  useEffect(() => {
    if (!cacheLoaded) { loadWIDACache().then(() => setReady(true)) }
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

  if (compact) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
        style={{ backgroundColor: info.bg, color: '#374151', borderLeft: `2px solid ${info.color}` }}
        title={`WIDA L${info.level} ${info.name}`}>
        L{info.level}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ backgroundColor: info.bg, color: '#374151' }}
      title={`WIDA L${info.level} ${info.name}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      L{info.level}
    </span>
  )
}
