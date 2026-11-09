'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { blockedReason, fmtClock, fmtMinutes, fmtRange, fmtWon, minutesBetween, overlapping, parseClock, parseRange, splitRange, wonFor, type OvertimeEntry } from '@/lib/overtime'
import type { EntryDraft } from '@/lib/overtimeData'
import { Check, Copy, Loader2, Plus, X } from 'lucide-react'

// ─── One entry: date, from, to, reason ───────────────────────────
// The row at the top of the page for a new entry, and the same row in
// place of a listed entry while it is edited. Times are typed as people
// say them; the minutes and the won show as soon as both times read.
// Every rule is one grey sentence under the row, and the button stays off
// while one applies. The page checks the day once more against the
// database before it saves.

export interface EntryEditorHandle { focus: () => void }

interface Props {
  initial?: OvertimeEntry
  today: string
  rate: number
  ko: boolean
  /** Days off known to the page, by date. */
  daysOff: Record<string, string>
  /** Entries known to the page, for the overlap check. */
  known: OvertimeEntry[]
  /** Reason chips: the teacher's own first, then the house reasons. */
  reasons: string[]
  /** The teacher's latest entry, for Same as last time (new entries only). */
  last?: OvertimeEntry | null
  onSave: (d: EntryDraft) => Promise<boolean>
  onCancel?: () => void
}

const inp = 'h-9 px-2.5 bg-surface border border-rule-2 rounded text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink-2'
const chip = 'h-6 px-2 rounded-full border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink hover:border-ink-3 max-w-[220px] truncate'

const EntryEditor = forwardRef<EntryEditorHandle, Props>(function EntryEditor({ initial, today, rate, ko, daysOff, known, reasons, last, onSave, onCancel }, ref) {
  const [date, setDate] = useState(initial?.date || today)
  const [fromText, setFromText] = useState(initial ? fmtClock(initial.start_time) : '')
  const [toText, setToText] = useState(initial ? fmtClock(initial.end_time) : '')
  const [reason, setReason] = useState(initial?.reason || '')
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const fromRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => ({ focus: () => fromRef.current?.focus() }))
  useEffect(() => { if (initial) fromRef.current?.focus() }, [initial])

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
    else if (date > today) problem = ko ? '아직 오지 않은 날입니다.' : 'Not yet.'
    else if (blocked?.kind === 'weekend') problem = ko ? '주말 근무는 초과근무에 포함되지 않습니다.' : 'Weekends are not overtime.'
    else if (blocked?.kind === 'dayoff') problem = ko ? `${blocked.title}: 쉬는 날은 초과근무에 포함되지 않습니다.` : `${blocked.title} is a day off, so it is not overtime.`
    else if ((fromPart.trim() && !parseClock(fromPart)) || (toPart.trim() && !parseClock(toPart))) problem = ko ? '4:30처럼 시간을 입력하세요.' : 'Type a time like 4:30.'
    else if (range && minutes === null) problem = ko ? '끝나는 시간이 시작 시간보다 앞입니다.' : 'Finish time comes before start time.'
    else if (range && minutes !== null) {
      const o = overlapping({ id: initial?.id, date, start_time: range.start, end_time: range.end }, known)
      if (o) problem = ko ? `${fmtRange(o.start_time, o.end_time, true)} 기록과 겹칩니다.` : `Overlaps the ${fmtRange(o.start_time, o.end_time)} entry.`
      else if (tried && !reason.trim()) problem = ko ? '무슨 일이었는지 적어 주세요.' : 'Say what the work was.'
      else blocking = false
    }
    return { range, minutes, problem, blocking }
  }, [fromText, toText, date, daysOff, today, known, initial?.id, reason, tried, ko])

  const ready = !check.blocking && !!check.range && check.minutes !== null && !!reason.trim()

  const save = async () => {
    setTried(true)
    if (!ready || !check.range || check.minutes === null) return
    setSaving(true)
    const ok = await onSave({ date, start_time: check.range.start, end_time: check.range.end, minutes: check.minutes, reason: reason.trim() })
    setSaving(false)
    if (ok && !initial) { setFromText(''); setToText(''); setReason(''); setTried(false); fromRef.current?.focus() }
  }
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); splitFrom(); save() }
    if (e.key === 'Escape' && onCancel) { e.preventDefault(); onCancel() }
  }
  const sameAsLast = () => { if (!last) return; setFromText(fmtClock(last.start_time)); setToText(fmtClock(last.end_time)); setReason(last.reason) }

  return (
    <div className={initial ? 'py-2' : ''} onKeyDown={keys}>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={`${inp} w-[150px]`} aria-label={ko ? '날짜' : 'Date'} />
        <input ref={fromRef} value={fromText} onChange={e => setFromText(e.target.value)} onBlur={splitFrom} placeholder={ko ? '시작 4:30' : 'From 4:30'} className={`${inp} w-[92px] tabular-nums`} aria-label={ko ? '시작' : 'From'} />
        <span className="text-ink-3">–</span>
        <input value={toText} onChange={e => setToText(e.target.value)} placeholder={ko ? '끝 6:45' : 'To 6:45'} className={`${inp} w-[92px] tabular-nums`} aria-label={ko ? '끝' : 'To'} />
        <span className="min-w-[150px] text-[12.5px] text-ink-2 tabular-nums">
          {check.range && check.minutes !== null ? <>{fmtRange(check.range.start, check.range.end, ko)} · <span className="font-semibold text-ink">{fmtMinutes(check.minutes, ko)}</span> · {fmtWon(wonFor(check.minutes, rate), ko)}</> : <span className="text-ink-3">{ko ? '시간을 입력하면 계산됩니다' : 'Time and won show here'}</span>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder={ko ? '무슨 일이었나요? (예: 성적표 작성)' : 'What was the work? (Report cards, open class prep…)'} className={`${inp} flex-1 min-w-[260px]`} aria-label={ko ? '사유' : 'Reason'} />
        <button onClick={save} disabled={saving || (tried && !ready)} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">
          {saving ? <Loader2 size={13} className="animate-spin" /> : initial ? <Check size={14} /> : <Plus size={14} />}{initial ? (ko ? '저장' : 'Save') : (ko ? '추가' : 'Add')}
        </button>
        {onCancel && <button onClick={onCancel} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><X size={13} />{ko ? '취소' : 'Cancel'}</button>}
      </div>
      {(reasons.length > 0 || (!initial && last)) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {!initial && last && <button onClick={sameAsLast} className={`${chip} inline-flex items-center gap-1`}><Copy size={11} />{ko ? '지난번과 같이' : 'Same as last time'}</button>}
          {reasons.map(r => <button key={r} onClick={() => setReason(r)} className={chip} title={r}>{r}</button>)}
        </div>
      )}
      <p className="text-[12px] text-ink-3 mt-1.5 min-h-[18px]">{check.problem || ''}</p>
    </div>
  )
})

export default EntryEditor
