'use client'

import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { UNIVERSAL_TEST_NOTES } from './testNotes'

export interface NoteGroup {
  /** Heading shown above the group. Omitted for the universal notes. */
  label?: string
  notes: string[]
}

/**
 * The "before you start" panel above every level test entry screen.
 *
 * The universal notes always come first — they are the ones about how to sit
 * with a nervous child — followed by whatever the grade and section add.
 * Collapse state is remembered per `storageKey` so a teacher entering twenty
 * students does not re-collapse it twenty times.
 */
export default function TestNotesPanel({ groups, storageKey, title = 'Before you start' }: {
  groups?: NoteGroup[]
  storageKey: string
  title?: string
}) {
  const all: NoteGroup[] = [{ notes: UNIVERSAL_TEST_NOTES }, ...(groups || [])].filter(g => g.notes.length > 0)
  const count = all.reduce((n, g) => n + g.notes.length, 0)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setOpen(window.localStorage.getItem(`notesPanel:${storageKey}`) !== 'closed')
  }, [storageKey])

  const toggle = (e: any) => {
    const next = e.currentTarget.open
    setOpen(next)
    try { window.localStorage.setItem(`notesPanel:${storageKey}`, next ? 'open' : 'closed') } catch {}
  }

  if (count === 0) return null

  return (
    <details open={open} onToggle={toggle} className="mb-4 bg-amber-50/60 border border-amber-200 rounded-xl px-4 py-2.5">
      <summary className="text-[11px] font-semibold text-amber-900 cursor-pointer flex items-center gap-1.5">
        <Info size={12} /> {title} ({count})
      </summary>
      <div className="mt-2 space-y-2.5">
        {all.map((g, gi) => (
          <div key={gi}>
            {g.label && (
              <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-1">{g.label}</p>
            )}
            <ul className="space-y-1 pl-4 list-disc">
              {g.notes.map((n, i) => (
                <li key={i} className="text-[10px] text-amber-800 leading-snug">{n}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  )
}
