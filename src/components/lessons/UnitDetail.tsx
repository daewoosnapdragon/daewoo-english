'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, ExternalLink, X } from 'lucide-react'
import { standardInfo, standardTitle } from '@/lib/standardText'
import { norm, type BookUnit, type ClassBook } from '@/lib/planLinks'

/**
 * The lines under a row linked to a unit, for the teacher only (never printed):
 * the book and unit, which lesson it is if they want to say, the unit's
 * objectives as chips that go onto the day's Students will line with a tap,
 * and About this unit with its lessons, standards and files.
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
  const added = (text: string) => !!text && norm(objective).includes(norm(text))
  const bank = unit.objectives.slice(0, 5)
  const codes = Array.from(new Set([...unit.objectives.flatMap(o => o.ccss), ...unit.ccss, ...unit.lessons.flatMap(l => l.ccss_codes)]))
  const wida = Array.from(new Set(unit.objectives.flatMap(o => o.wida)))

  return (
    <div ref={box} className="relative mt-1 ml-1 text-[11.5px] text-text-tertiary">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
      </div>
      {bank.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          <span className="italic text-text-secondary mr-0.5">Students will</span>
          {bank.map(o => {
            const on = added(o.text)
            return (
              <button key={o.text} type="button" onClick={() => onAddObjective(o.text)} disabled={on} title={on ? 'On the Students will line' : 'Put this on the Students will line'}
                className={`text-[11.5px] px-2 py-0.5 rounded-full border text-left max-w-[340px] truncate transition-colors ${on ? 'bg-navy text-white border-navy' : 'border-border text-text-secondary hover:border-navy hover:text-navy'}`}>
                {on && <Check size={10} className="inline mr-1 -mt-px" />}{o.text}
              </button>
            )
          })}
        </div>
      )}
      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 w-[440px] max-w-[90vw] max-h-[440px] overflow-y-auto bg-surface border border-border rounded-xl shadow-lg p-4 text-[12.5px] text-text-primary">
          <p className="font-semibold text-[13.5px]">{unit.name}</p>
          <p className="text-[11.5px] text-text-tertiary">{book.name}{unit.badge ? ` · ${unit.badge}` : ''} · {unit.lessons.length} lesson{unit.lessons.length === 1 ? '' : 's'}</p>
          {unit.summary && <p className="mt-2 text-text-secondary leading-snug whitespace-pre-line">{unit.summary}</p>}
          {unit.objectives.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {unit.objectives.map(o => (
                <li key={o.text} className="flex items-start gap-2">
                  <p className="flex-1 text-text-secondary italic leading-snug"><span className="not-italic font-semibold text-navy">Students will</span> {o.text}</p>
                  <button type="button" onClick={() => onAddObjective(o.text)} disabled={added(o.text)}
                    className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded border border-border text-navy enabled:hover:border-navy disabled:opacity-50">{added(o.text) ? 'Added' : 'Add'}</button>
                </li>
              ))}
            </ul>
          )}
          {unit.lessons.length > 0 && (
            <>
              <p className="mt-3 text-[11px] uppercase tracking-wider font-semibold text-text-tertiary">Lessons</p>
              <ol className="mt-1 space-y-0.5">
                {unit.lessons.map((l, i) => <li key={l.id} className={l.id === lessonId ? 'font-semibold text-navy' : ''}>{i + 1}. {l.title}</li>)}
              </ol>
            </>
          )}
          {(codes.length > 0 || wida.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1">
              {codes.map(c => { const s = standardInfo(c); return <span key={c} title={standardTitle(c)} className="text-[10.5px] px-1.5 py-0.5 rounded border border-border text-text-secondary cursor-help">{s.code}{s.plain ? ` · ${s.plain}` : ''}</span> })}
              {wida.map(w => <span key={w} title="WIDA 2020 language expectation" className="text-[10.5px] px-1.5 py-0.5 rounded border border-border text-text-tertiary">{w}</span>)}
            </div>
          )}
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
