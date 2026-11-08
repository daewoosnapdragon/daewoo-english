'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, ExternalLink, X } from 'lucide-react'
import { bareObjective } from '@/lib/curriculumWeek'
import { standardInfo, standardTitle } from '@/lib/standardText'
import type { BookUnit, ClassBook } from '@/lib/planLinks'

/**
 * The line under a row linked to a unit, for the teacher only (never printed):
 * the book and unit, which lesson it is if they want to say, and the unit's
 * lessons, objectives, standards and files. "Add" puts an objective on the
 * day's Students will line.
 */
export function UnitLine({ book, unit, lessonId, objective, onLesson, onAddObjective, onUnlink }: {
  book: ClassBook; unit: BookUnit; lessonId?: string; objective: string
  onLesson: (lessonId: string | null) => void
  onAddObjective: (text: string) => void
  onUnlink: () => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const added = (text: string) => !!text && objective.toLowerCase().includes(text.toLowerCase())

  return (
    <div ref={box} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 ml-1 text-[11.5px] text-text-tertiary">
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: book.color }} />
        <span className="truncate">{book.name} · {unit.badge ? `${unit.badge} · ` : ''}{unit.name}</span>
        <button type="button" onClick={onUnlink} title="Not about this unit" aria-label="Not about this unit" className="p-0.5 rounded hover:text-text-primary"><X size={11} /></button>
      </span>
      {unit.lessons.length > 0 && (
        <label className="inline-flex items-center gap-1">
          <span>Lesson</span>
          <select value={lessonId || ''} onChange={e => onLesson(e.target.value || null)} title="Only you see this. It is not printed."
            className="bg-transparent border-b border-border/60 outline-none focus:border-navy text-[11.5px] text-text-secondary max-w-[220px]">
            <option value="">—</option>
            {unit.lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="inline-flex items-center gap-1 font-semibold text-navy hover:underline">
        <BookOpen size={12} /> About this unit
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-[420px] max-w-[90vw] max-h-[420px] overflow-y-auto bg-surface border border-border rounded-xl shadow-lg p-4 text-[12.5px] text-text-primary">
          <p className="font-semibold text-[13.5px]">{unit.name}</p>
          <p className="text-[11.5px] text-text-tertiary">{book.name}{unit.badge ? ` · ${unit.badge}` : ''} · {unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'}</p>
          {unit.summary && <p className="mt-2 text-text-secondary leading-snug">{unit.summary}</p>}
          {unit.lessons.length > 0 && (
            <ol className="mt-3 space-y-2">
              {unit.lessons.map((l, i) => {
                const obj = bareObjective(l.objective)
                return (
                  <li key={l.id}>
                    <p className={l.id === lessonId ? 'font-semibold text-navy' : 'font-medium'}>{i + 1}. {l.title}</p>
                    {obj && (
                      <div className="flex items-start gap-2 mt-0.5">
                        <p className="flex-1 text-text-secondary italic leading-snug"><span className="not-italic font-semibold text-navy">Students will</span> {obj}</p>
                        <button type="button" onClick={() => onAddObjective(obj)} disabled={added(obj)}
                          className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded border border-border text-navy enabled:hover:border-navy disabled:opacity-50">{added(obj) ? 'Added' : 'Add'}</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          )}
          {(() => {
            const codes = Array.from(new Set([...unit.ccss, ...unit.lessons.flatMap(l => l.ccss_codes)]))
            return codes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {codes.map(c => { const s = standardInfo(c); return <span key={c} title={standardTitle(c)} className="text-[10.5px] px-1.5 py-0.5 rounded border border-border text-text-secondary cursor-help">{s.code}{s.plain ? ` · ${s.plain}` : ''}</span> })}
              </div>
            )
          })()}
          {unit.files.length > 0 && (
            <ul className="mt-3 space-y-1">
              {unit.files.map(f => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-navy hover:underline"><ExternalLink size={11} />{f.name || 'File'}</a></li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
