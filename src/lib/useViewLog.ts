'use client'

import { useEffect } from 'react'
import { logView } from '@/lib/activity'

// ─── What is on screen ───────────────────────────────────────────
// A page passes one line describing what it is showing right now, built
// from its own state ("Attendance · Snapdragon · Grade 4 · 2026-11-12").
// Whenever that line changes and stays put for a moment, it goes to the
// activity log, replacing the masthead's bare "Opened Attendance" the first
// time and adding a row for each new thing after that. Flicking through
// grades on the way to the one wanted logs only where the teacher lands.
// Pass null or '' while the page has not settled (still loading, nothing
// picked yet) and nothing is written.

const SETTLE_MS = 800

export function useViewLog(detail: string | null | undefined, path?: string) {
  useEffect(() => {
    if (!detail) return
    const t = setTimeout(() => { logView(detail, path ? { path } : {}) }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [detail, path])
}
