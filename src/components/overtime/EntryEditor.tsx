'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { blockedReason, fmtClock, fmtMinutes, fmtRange, fmtWon, minutesBetween, overlapping, parseClock, parseRange, splitRange, wonFor, type OvertimeEntry } from '@/lib/overtime'
import type { EntryDraft } from '@/lib/overtimeData'
import { Copy, Loader2, Plus, X } from 'lucide-react'

// ─── One entry, as a row of the overtime table ───────────────────
// The add row at the top of the table, and the same row in place of a
// listed entry while it is edited. Its cells line up with the table's
// columns: date, from – to, time, won, what the work was, and the
// button. Times are typed as people say them; the time and the won fill
// their columns as soon as both times read. Under the row, the reason
// chips (add row only) and, when a rule applies, one grey sentence; the
// button stays off while one does. The page checks the day once more
// against the database before it saves.

export interface EntryEditorHandle { focus: () => void }

/** The overtime table's columns; the header, the rows and this editor share them. */
export const OT_COLS = 'grid grid-cols-[40px_136px_196px_96px_112px_minmax(0,1fr)_96px] items-center'

interface Props {
  initial?: OvertimeEntry
  today: string
  rate: number
  ko: boolean
  /** Days off known to the page, by date. */
  daysOff: Record<string, string>
  /** Entries known to the page, for the overlap check. */
  known: OvertimeEntry[]
  /** Reason chips: the teacher's own first, then the house reasons (add row only). */
  reasons?: string[]
  /** The teacher's latest entry, for Same as last time (add row only). */
  last?: OvertimeEntry | null
  onSave: (d: EntryDraft) => Promise<boolean>
  onCancel?: () => void
}

const inp = 'h-9 px-2 bg-surface border border-rule-2 rounded text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink-2 w-full'
const chip = 'h-6 px-2.5 rounded-full border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink hover:border-ink-3 max-w-[220px] truncate'

const EntryEditor = forwardRef<EntryEditorHandle, Props>(function EntryEditor({ initial, today, rate, ko, daysOff, known, reasons = [], last, onSave, onCancel }, ref) {
  const editing = !!initial
  const [date, setDate] = useState(initial?.date || today)
  const [fromText, setFromText] = useState(initial ? fmtClock(initial.start_time) : '')
  const [toText, setToText] = useState(initial ? fmtClock(initial.end_time) : '')
  const [reason, setReason] = useState(initial?.reason || '')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const fromRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => fromRef.current?.focus() }))
  useEffect(() => { if (editing) fromRef.current?.focus() }, [editing])

  // "4:30-6:45" typed into From fills both.
  const splitFrom = () => {
    const sp = splitRange(fromText)
    if (sp && parseClock(sp[0]) && parseClock(sp[1])) { setFromText(sp[0]); setToText(sp[1]) }
  }

  const check = useMemo(() => {
    const sp = splitRange(fromText)
    const fromPart = sp ? sp[0] : fromText, toPart = sp ? sp[1] : toText
    const range = parseRange(fromPart, toPart)
    const minutes = range ? minutesBetween(range.start, range.end) : null
    let problem: string | null = null
    let blocking = true
    const blocked = date ? blockedReason(date, daysOff) : null
    if (!date) problem = ko ? '날짜를 고르세요.' : 'Pick a date.'
    else if (date > today) problem = ko ? '아직 오지 않은 날입니다.' : 'That day hasn’t come yet.'
    else if (blocked?.kind === 'weekend') problem = ko ? '주말 근무는 초과근무에 포함되지 않습니다.' : 'Weekends are not overtime.'
    else if (blocked?.kind === 'dayoff') problem = ko ? `${blocked.title}: 쉬는 날은 초과근무에 포함되지 않습니다.` : `${blocked.title} is a day off, so it is not overtime.`
    else if ((fromPart.trim() && !parseClock(fromPart)) || (toPart.trim() && !parseClock(toPart))) problem = ko ? '4:30처럼 시간을 입력하세요.' : 'Type a time like 4:30.'
    else if (range && minutes === null) problem = ko ? '끝나는 시간이 시작 시간보다 앞입니다.' : 'The finish time comes before the start time.'
    else if (range && minutes !== null) {
      const o = overlapping({ id: initial?.id, date, start_time: range.start, end_time: range.end }, known)
      if (o) problem = ko ? `${fmtRange(o.start_time, o.end_time, true)} 기록과 겹칩니다.` : `Overlaps the ${fmtRange(o.start_time, o.end_time)} entry that day.`
      else if (tried && !reason.trim()) problem = ko ? '무슨 일이었는지 적어 주세요.' : 'Say what the work was.'
      else blocking = false
    }
    return { range, minutes, problem, blocking }
  }, [fromText, toText, date, daysOff, today, known, initial?.id, reason, tried, ko])

  const ready = !check.blocking && !!check.range && check.minutes !== null && !!reason.trim()
  const timed = check.range && check.minutes !== null

  const save = async () => {
    setTried(true)
    if (!ready || !check.range || check.minutes === null) return
    setSaving(true)
    const ok = await onSave({ date, start_time: check.range.start, end_time: check.range.end, minutes: check.minutes, reason: reason.trim() })
    setSaving(false)
    if (ok && !editing) { setFromText(''); setToText(''); setReason(''); setTried(false); fromRef.current?.focus() }
  }
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); splitFrom(); save() }
    if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel() }
  }
  const sameAsLast = () => { if (!last) return; setFromText(fmtClock(last.start_time)); setToText(fmtClock(last.end_time)); setReason(last.reason) }
  const showUnder = !editing ? (reasons.length > 0 || !!last || !!check.problem) : !!check.problem

  return (
    <div onKeyDown={keys} className={editing ? 'bg-paper-2/60 border-b border-rule' : ''}>
      <div className={`${OT_COLS} px-4 ${editing ? 'h-[54px]' : 'h-[58px]'}`}>
        <span className="text-accent flex items-center" aria-hidden="true">{editing ? null : <Plus size={16} strokeWidth={2.5} />}</span>
        <div className="pr-3"><input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={inp} aria-label={ko ? '날짜' : 'Date'} /></div>
        <div className="pr-3 flex items-center gap-1.5">
          <input ref={fromRef} value={fromText} onChange={e => setFromText(e.target.value)} onBlur={splitFrom} placeholder="4:30" className={`${inp} tabular-nums`} aria-label={ko ? '시작' : 'From'} />
          <span className="text-ink-3">–</span>
          <input value={toText} onChange={e => setToText(e.target.value)} placeholder="6:45" className={`${inp} tabular-nums`} aria-label={ko ? '끝' : 'To'} />
        </div>
        <span className={`text-[13px] tabular-nums ${timed ? 'font-semibold text-ink' : 'text-ink-3'}`}>{timed ? fmtMinutes(check.minutes!, ko) : '—'}</span>
        <span className="text-[13px] tabular-nums text-ink-2">{timed ? fmtWon(wonFor(check.minutes!, rate), ko) : <span className="text-ink-3">—</span>}</span>
        <div className="pr-3"><input value={reason} onChange={e => setReason(e.target.value)} placeholder={ko ? '무슨 일이었나요? (성적표, 공개수업 준비…)' : 'Report cards, open class prep…'} className={inp} aria-label={ko ? '무슨 일이었나요' : 'What was the work'} /></div>
        <div className="flex items-center justify-end gap-1">
          <button onClick={save} disabled={saving || (tried && !ready)} className="h-9 px-3.5 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />}{editing ? (ko ? '저장' : 'Save') : (ko ? '추가' : 'Add')}
          </button>
          {onCancel && <button onClick={onCancel} className="w-8 h-9 rounded text-ink-3 hover:text-ink hover:bg-paper-2 inline-flex items-center justify-center" aria-label={ko ? '취소' : 'Cancel'} title={ko ? '취소' : 'Cancel'}><X size={14} /></button>}
        </div>
      </div>
      {showUnder && (
        <div className={`${OT_COLS} px-4 pb-2.5 -mt-1`}>
          <span />
          <div className="col-span-6 flex flex-wrap items-center gap-1.5">
            {!editing && last && <button onClick={sameAsLast} className={`${chip} inline-flex items-center gap-1`}><Copy size={11} />{ko ? '지난번과 같이' : 'Same as last time'}</button>}
            {!editing && reasons.map(r => <button key={r} onClick={() => setReason(r)} className={chip} title={r}>{r}</button>)}
            {check.problem && <span className="ml-auto text-[12px] text-ink-2">{check.problem}</span>}
          </div>
        </div>
      )}
    </div>
  )
})

export default EntryEditor
