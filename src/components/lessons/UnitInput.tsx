'use client'

import { useMemo, useState } from 'react'
import { matchUnits, norm, type ClassBook, type UnitMatch } from '@/lib/planLinks'

/**
 * What students do in a subject, as the teacher types it. When the words
 * start to name a unit of the class's books, the units are offered below;
 * picking one links the row. Up and down choose, Enter or Tab picks, Escape
 * closes. With nothing offered, the keys do what the page's other fields do.
 */
export function UnitInput({ value, books, linkedName, placeholder, onChange, onPick, onKeyDown }: {
  value: string
  books: ClassBook[]
  /** The unit the row is linked to, so its own name is not offered again. */
  linkedName?: string
  placeholder: string
  onChange: (v: string) => void
  onPick: (m: UnitMatch) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [typing, setTyping] = useState(false)
  const [active, setActive] = useState(0)
  const matches = useMemo(() => typing ? matchUnits(value, books) : [], [typing, value, books])
  const open = matches.length > 0 && !(linkedName && norm(value) === norm(linkedName) && matches.length === 1)
  const several = books.length > 1
  const pick = (m: UnitMatch) => { onPick(m); setTyping(false); setActive(0) }

  return (
    <div className="relative flex-1 min-w-0">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setTyping(true); setActive(0) }}
        onBlur={() => setTyping(false)}
        onKeyDown={e => {
          if (open) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length); return }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length); return }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[Math.min(active, matches.length - 1)]); return }
            if (e.key === 'Escape') { e.preventDefault(); setTyping(false); return }
          }
          onKeyDown(e)
        }}
        placeholder={placeholder}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        className="lp-field w-full text-[13.5px] bg-transparent border-b border-border/60 outline-none focus:border-navy py-1.5 placeholder:text-text-tertiary/40"
      />
      {open && (
        <ul role="listbox" className="absolute left-0 right-0 top-full mt-1 z-30 bg-surface border border-border rounded-lg shadow-lg py-1 max-h-[260px] overflow-y-auto">
          {matches.map((m, i) => (
            <li key={m.book.placement_id + m.unit.id} role="option" aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(m) }}
              onMouseEnter={() => setActive(i)}
              className={`px-3 py-1.5 cursor-pointer flex items-center gap-2 text-[13px] ${i === active ? 'bg-surface-alt' : ''}`}>
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: m.book.color }} />
              <span className="text-text-primary font-medium truncate">{m.unit.name}</span>
              <span className="ml-auto shrink-0 text-[11.5px] text-text-tertiary">{[several ? m.book.name : '', m.unit.badge].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
