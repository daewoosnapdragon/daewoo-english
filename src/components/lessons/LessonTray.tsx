'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, Undo2, X } from 'lucide-react'
import type { TrayLane, TraySlot } from '@/lib/lessonTray'
import type { RunningUnit } from '@/lib/lessonSync'

// ─── The tray and the map on Lesson Plans (LESSON_SYNC_CLASSES only) ────
// The tray lists, book by book, the lessons not yet on a day. Drag one onto a
// day, or tap it and then a day; "Whole unit" spreads a unit over the book's
// usual days. The map shows what the board has running in the month's weeks.

export type TraySel = { kind: 'slot'; placement_id: string; slot: TraySlot } | { kind: 'unit'; placement_id: string; unit_id: string; name: string }
/** Drag data: "tray|slot|<placement>|<slot key>" or "tray|unit|<placement>|<unit id>". */
export const dragData = (sel: TraySel) => sel.kind === 'slot' ? `tray|slot|${sel.placement_id}|${sel.slot.key}` : `tray|unit|${sel.placement_id}|${sel.unit_id}`

export function LessonTray({ lanes, sel, onSelect, canEdit, open, onToggleBook, hoverUnit, onHoverUnit, focusUnit, undoLabel, onUndo, onHide, noSetup }: {
  lanes: TrayLane[]; sel: TraySel | null; onSelect: (s: TraySel | null) => void; canEdit: boolean
  open: (placementId: string, auto: boolean) => boolean; onToggleBook: (placementId: string, now: boolean) => void
  hoverUnit: string | null; onHoverUnit: (u: string | null) => void; focusUnit: string | null
  undoLabel: string | null; onUndo: () => void; onHide: () => void; noSetup: boolean
}) {
  const focusRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if (focusUnit) focusRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [focusUnit])
  return (
    <aside aria-label="Lesson tray" className="w-[360px] shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-3 pb-4">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-[22px] font-semibold text-navy flex-1">Up next</h3>
        {undoLabel && (
          <button onClick={onUndo} title={`Undo: ${undoLabel}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold px-3 rounded-lg border border-border bg-surface min-h-[40px] hover:border-navy">
            <Undo2 size={15} /> Undo
          </button>
        )}
        <button onClick={onHide} className="text-[14px] font-semibold px-3 rounded-lg border border-border bg-surface min-h-[40px] hover:border-navy">Hide</button>
      </div>
      <p className="text-[14px] text-text-secondary leading-snug">{canEdit ? 'Drag a lesson onto a day, or tap it and then tap the day. Take it off a day and it comes back here.' : 'The lessons not yet on a day, in the board’s order.'}</p>
      {noSetup && <p className="text-[14px] text-text-secondary leading-snug bg-surface border border-border rounded-xl px-3 py-2.5">Set your usual days in <a href="/lesson-plans/setup" className="font-semibold text-navy underline">Class setup</a> so “Whole unit” knows where each book goes.</p>}
      {lanes.length === 0 && <p className="text-[15px] text-text-secondary bg-surface border border-border rounded-xl px-4 py-3">No books on this class’s board for this grade yet. Add them in Curriculum → Planning → Books by class.</p>}
      {lanes.map(lane => {
        const auto = lane.due > 0
        const isOpen = open(lane.book.placement_id, auto)
        return (
          <section key={lane.book.placement_id} className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button onClick={() => onToggleBook(lane.book.placement_id, !isOpen)} aria-expanded={isOpen}
              className="w-full flex items-center gap-3 px-4 py-3 text-left min-h-[56px] hover:bg-surface-alt/50">
              <span className="w-3.5 h-3.5 rounded shrink-0" style={{ background: lane.book.color }} />
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-semibold text-text-primary">{lane.book.label}{lane.book.level ? ` ${lane.book.level}` : ''}</span>
                <span className={`block text-[13px] font-medium ${lane.due ? 'text-warn' : 'text-good'}`}>
                  {lane.left === 0 ? 'Everything is on a day' : lane.due ? `${lane.due} due now still to place` : `On pace · ${lane.left} later`}
                </span>
              </span>
              <ChevronDown size={18} className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-2.5">
                {lane.units.map(u => {
                  const lit = hoverUnit === u.unit_id || focusUnit === u.unit_id
                  const unitSel = sel?.kind === 'unit' && sel.unit_id === u.unit_id
                  const unitPick: TraySel = { kind: 'unit', placement_id: lane.book.placement_id, unit_id: u.unit_id, name: u.name }
                  return (
                    <div key={u.unit_id} ref={focusUnit === u.unit_id ? focusRef : undefined}
                      onMouseEnter={() => onHoverUnit(u.unit_id)} onMouseLeave={() => onHoverUnit(null)}
                      className={`rounded-xl p-2.5 space-y-2 transition-colors ${lit ? 'ring-2' : 'bg-surface-alt/60'}`}
                      style={lit ? { background: `${lane.book.color}14`, ['--tw-ring-color' as string]: lane.book.color } : undefined}>
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-[15px] font-semibold text-text-primary leading-snug">{u.name}</span>
                        {canEdit && u.slots.length > 1 && (
                          <button draggable onDragStart={e => { e.dataTransfer.setData('text/plain', dragData(unitPick)); e.dataTransfer.effectAllowed = 'copy'; onSelect(unitPick) }}
                            onClick={() => onSelect(unitSel ? null : unitPick)} aria-pressed={unitSel}
                            title="Drag onto the day the unit starts, or tap and then that day: its lessons spread over the book's usual days"
                            className="inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 rounded-lg border min-h-[36px] cursor-grab"
                            style={unitSel ? { background: lane.book.color, color: '#fff', borderColor: lane.book.color } : { color: lane.book.color, borderColor: lane.book.color, background: '#fff' }}>
                            <ArrowRight size={13} /> Whole unit
                          </button>
                        )}
                      </div>
                      {u.slots.map(s => {
                        const pick: TraySel = { kind: 'slot', placement_id: lane.book.placement_id, slot: s }
                        const on = sel?.kind === 'slot' && sel.slot.key === s.key
                        return (
                          <button key={s.key} disabled={!canEdit}
                            draggable={canEdit} onDragStart={e => { e.dataTransfer.setData('text/plain', dragData(pick)); e.dataTransfer.effectAllowed = 'copy'; onSelect(pick) }}
                            onClick={() => onSelect(on ? null : pick)} aria-pressed={on}
                            className={`w-full text-left flex flex-col gap-1 px-3 py-2.5 rounded-lg border-2 bg-surface min-h-[44px] ${canEdit ? 'cursor-grab' : 'cursor-default'}`}
                            style={{ borderColor: on ? lane.book.color : 'rgb(var(--rule))', boxShadow: on ? `0 0 0 3px ${lane.book.color}33` : undefined }}>
                            <span className="text-[15px] font-semibold text-text-primary leading-snug">{s.title}{s.of > 1 ? ` (${s.n} of ${s.of})` : ''}</span>
                            {s.tag && <span className={`self-start text-[12px] font-semibold rounded-full px-2 py-0.5 ${s.tag === 'this week' ? 'bg-surface-alt text-text-primary' : 'bg-warn-soft text-warn'}`}>{s.tag}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </aside>
  )
}

export interface MapWeek { monday: string; label: string; current: boolean }

/** The month on the board, one row per book; tap a unit to open it in the tray. Folds to one line. */
export function MonthMap({ weeks, books, runningAt, progress, open, onToggle, onPick, hoverUnit }: {
  weeks: MapWeek[]; books: { placement_id: string; label: string; level: string; color: string }[]
  runningAt: (monday: string) => RunningUnit[]; progress: Map<string, { placed: number; total: number }>
  open: boolean; onToggle: () => void; onPick: (placementId: string, unitId: string) => void; hoverUnit: string | null
}) {
  // Each book's runs of weeks on one unit, as bars across the weeks.
  const rows = books.map(b => {
    const bars: { unit_id: string; name: string; start: number; span: number }[] = []
    weeks.forEach((w, i) => {
      for (const ru of runningAt(w.monday).filter(r => r.placement_id === b.placement_id)) {
        const last = bars.find(x => x.unit_id === ru.unit_id && x.start + x.span === i)
        if (last) last.span++; else if (!bars.some(x => x.unit_id === ru.unit_id && x.start <= i && x.start + x.span > i)) bars.push({ unit_id: ru.unit_id, name: ru.name, start: i, span: 1 })
      }
    })
    return { book: b, bars }
  })
  const now = weeks.find(w => w.current) || weeks[0]
  const summary = now ? books.map(b => { const names = runningAt(now.monday).filter(r => r.placement_id === b.placement_id).map(r => r.name); return names.length ? `${b.label}: ${names.join(' → ')}` : '' }).filter(Boolean).join(' · ') : ''
  return (
    <section aria-label="This month on the board" className="bg-surface border border-border rounded-2xl px-4 py-3 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onToggle} aria-expanded={open} className="inline-flex items-center gap-2 text-[16px] font-semibold text-navy min-h-[40px]">
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} /> Curriculum map
        </button>
        <span className="text-[14px] text-text-secondary flex-1 min-w-[240px] truncate">{summary ? `${now?.current ? 'This week' : 'First week'} — ${summary}` : 'Nothing on the board this month'}</span>
      </div>
      {open && books.length > 0 && (
        <div className="overflow-x-auto mt-2">
          <div className="grid gap-y-2 min-w-[760px]" style={{ gridTemplateColumns: `170px repeat(${weeks.length}, minmax(110px, 1fr))` }}>
            <span />
            {weeks.map(w => (
              <span key={w.monday} className={`text-[13px] px-2 py-1 ${w.current ? 'font-bold text-accent bg-accent-light/60 rounded-md' : 'font-medium text-text-secondary'}`}>{w.label}{w.current ? ' · this week' : ''}</span>
            ))}
            {rows.map((r, ri) => (
              <div key={r.book.placement_id} className="contents">
                <span className="text-[14px] font-semibold text-text-primary self-center flex items-center gap-2" style={{ gridRow: ri + 2, gridColumn: 1 }}>
                  <span className="w-3 h-3 rounded shrink-0" style={{ background: r.book.color }} />{r.book.label}{r.book.level ? ` ${r.book.level}` : ''}
                </span>
                {r.bars.map(bar => {
                  const pr = progress.get(bar.unit_id); const pct = pr && pr.total ? Math.round((pr.placed / pr.total) * 100) : 0
                  const lit = hoverUnit === bar.unit_id
                  return (
                    <button key={bar.unit_id + bar.start} onClick={() => onPick(r.book.placement_id, bar.unit_id)} title={`Open ${bar.name} in the tray`}
                      className="mx-1 text-left rounded-lg px-2.5 py-1.5 min-h-[48px] flex flex-col justify-center"
                      style={{ gridRow: ri + 2, gridColumn: `${bar.start + 2} / span ${bar.span}`, border: `${lit ? 3 : 1}px solid ${r.book.color}`, background: `linear-gradient(90deg, ${r.book.color}40 ${pct}%, ${r.book.color}12 ${pct}%)` }}>
                      <span className="text-[14px] font-semibold text-text-primary leading-tight truncate">{bar.name}</span>
                      {pr && <span className="text-[12.5px] text-text-secondary">{pr.total ? `${pr.placed} of ${pr.total} planned` : 'no lessons'}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export function PlacingBar({ text, onCancel }: { text: string; onCancel: () => void }) {
  return (
    <div className="sticky top-2 z-30 mb-3 flex items-center gap-3 flex-wrap bg-navy text-white rounded-xl px-4 py-2.5 shadow-lg">
      <span className="flex-1 text-[15px]">{text}</span>
      <button onClick={onCancel} className="inline-flex items-center gap-1.5 text-[14px] font-semibold px-3 rounded-lg border border-white/40 min-h-[40px]"><X size={15} /> Cancel</button>
    </div>
  )
}
