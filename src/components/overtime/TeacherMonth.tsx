'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import type { Teacher } from '@/types'
import {
  blockedReason, byDateTime, counted, entriesInWeeks, fmtDayDate, fmtMinutes, fmtRange, fmtWon, monthLabel, overlapping, periodLabel,
  recentReasons, shiftMonth, totals, weekLabel, weekOf, weeksOfMonth, wonFor, type MonthWeek, type OvertimeEntry, type OvertimeSettings,
} from '@/lib/overtime'
import { addEntry, deleteEntry, fetchOvertime, fetchRecentOvertime, updateEntry, type EntryDraft } from '@/lib/overtimeData'
import EntryEditor, { OT_COLS, type EntryEditorHandle } from './EntryEditor'
import { printOvertimeSheets } from './overtimeSheet'
import { useOvertimeMonth } from './useOvertime'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Pencil, Printer, Trash2 } from 'lucide-react'

// ─── One teacher's month, laid out like the paper sheet ──────────
// One table. Its headings come once; its first row is where a new entry
// is typed. Under that, the month's weeks oldest first, as they print,
// each a row with a tick box and its subtotal, then its entries, with the
// days off in it shown as a grey line. Weeks that have not started yet
// are left out. The month's total closes the table. Print prints the
// ticked weeks; weeks with entries start ticked. Admin sees the same page
// for any teacher, opened from the staff table, and can fix entries.

const iconBtn = 'w-8 h-8 rounded border border-rule-2 bg-surface text-ink-2 hover:text-ink inline-flex items-center justify-center'
const rowBtn = 'w-7 h-7 rounded hover:bg-paper-2 text-ink-3 hover:text-ink inline-flex items-center justify-center'

interface Props {
  teacher: Teacher
  settings: OvertimeSettings
  /** Admin looking at someone else's sheet. */
  asAdmin?: boolean
  initialMonth?: string
  initialTicks?: string[]
  onBack?: () => void
}

export default function TeacherMonth({ teacher, settings, asAdmin, initialMonth, initialTicks, onBack }: Props) {
  const { language, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const today = getKSTDateString()
  const [month, setMonth] = useState(initialMonth || today.slice(0, 7))
  const m = useOvertimeMonth(teacher.id, month)
  const [recent, setRecent] = useState<OvertimeEntry[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [ticks, setTicks] = useState<Set<string> | null>(initialTicks ? new Set(initialTicks) : null)
  const editorRef = useRef<EntryEditorHandle>(null)
  const who = asAdmin ? teacher.name : undefined

  const loadRecent = () => fetchRecentOvertime(teacher.id).then(setRecent)
  useEffect(() => { loadRecent() }, [teacher.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!asAdmin && typeof window !== 'undefined' && window.location.hash === '#add') setTimeout(() => editorRef.current?.focus(), 200) }, [asAdmin])

  const allWeeks = useMemo(() => weeksOfMonth(month), [month])
  // Weeks that have started; later ones appear as they come.
  const weeks = useMemo(() => allWeeks.filter(w => w.from <= today), [allWeeks, today])
  const good = useMemo(() => counted(m.entries, m.daysOff), [m.entries, m.daysOff])
  const notCounted = useMemo(() => m.entries.filter(e => blockedReason(e.date, m.daysOff)), [m.entries, m.daysOff])
  const ticked = useMemo(() => ticks ?? new Set(weeks.filter(w => good.some(e => e.date >= w.from && e.date <= w.to)).map(w => w.from)), [ticks, weeks, good])
  const tickedWeeks = weeks.filter(w => ticked.has(w.from))
  const monthTotal = totals(good, settings.rate)
  const tickedTotal = totals(entriesInWeeks(good, tickedWeeks), settings.rate)
  const known = useMemo(() => { const ids = new Set(m.entries.map(e => e.id)); return [...m.entries, ...recent.filter(e => !ids.has(e.id))] }, [m.entries, recent])
  const reasons = useMemo(() => { const own = recentReasons(known); const lc = new Set(own.map(r => r.toLowerCase())); return [...own, ...settings.reasons.filter(r => !lc.has(r.toLowerCase()))].slice(0, 8) }, [known, settings.reasons])
  const last = useMemo(() => [...known].sort(byDateTime).pop() || null, [known])
  const isCurrent = month === today.slice(0, 7)
  const weekend = notCounted.filter(e => !weekOf(e.date, allWeeks))

  const goMonth = (n: number) => { setMonth(shiftMonth(month, n)); setTicks(null); setEditing(null) }
  const toggle = (key: string) => { const n = new Set(ticked); if (n.has(key)) n.delete(key); else n.add(key); setTicks(n) }

  // The day is checked once more against the database: its days off and its other entries.
  const save = async (d: EntryDraft, id?: string): Promise<boolean> => {
    const day = await fetchOvertime(teacher.id, d.date, d.date)
    const blocked = blockedReason(d.date, day.daysOff)
    if (blocked) { showToast(blocked.kind === 'weekend' ? (ko ? '주말 근무는 초과근무에 포함되지 않습니다.' : 'Weekends are not overtime.') : (ko ? `${blocked.title}: 쉬는 날입니다.` : `${blocked.title} is a day off, so it is not overtime.`)); return false }
    const o = overlapping({ id, ...d }, day.entries)
    if (o) { showToast(ko ? `${fmtRange(o.start_time, o.end_time, true)} 기록과 겹칩니다.` : `Overlaps the ${fmtRange(o.start_time, o.end_time)} entry that day.`); return false }
    const error = id ? await updateEntry(id, d, who) : (await addEntry(teacher.id, d, who)).error
    if (error) { showToast(error); return false }
    showToast(id ? (ko ? '저장됨' : 'Saved') : `${ko ? '추가됨' : 'Added'} · ${fmtMinutes(d.minutes, ko)} · ${fmtWon(wonFor(d.minutes, settings.rate), ko)}`)
    setEditing(null)
    const target = d.date.slice(0, 7)
    if (target !== month) { setMonth(target); setTicks(null) } else await m.reload()
    loadRecent()
    return true
  }
  const remove = async (e: OvertimeEntry) => {
    const ok = await confirmDialog({ title: ko ? '이 기록을 지울까요?' : 'Delete this entry?', message: `${fmtDayDate(e.date, ko)} · ${fmtRange(e.start_time, e.end_time, ko)} · ${e.reason}`, confirmLabel: ko ? '삭제' : 'Delete', danger: true })
    if (!ok) return
    const error = await deleteEntry(e, who)
    if (error) { showToast(error); return }
    showToast(ko ? '삭제됨' : 'Deleted'); m.reload(); loadRecent()
  }
  const print = () => {
    const entries = entriesInWeeks(good, tickedWeeks)
    const period = periodLabel(month, tickedWeeks)
    if (!printOvertimeSheets([{ teacherName: teacher.name, className: teacher.role === 'admin' ? '' : teacher.english_class, period, entries }], settings)) { showToast(ko ? '팝업이 차단되었습니다' : 'The print window was blocked. Allow pop-ups for this site.'); return }
    logActivity('printed', `Overtime sheet: ${teacher.name} · ${period}`, { path: '/overtime' })
  }

  const entryRow = (e: OvertimeEntry, note?: string) => editing === e.id ? (
    <EntryEditor key={e.id} initial={e} today={today} rate={settings.rate} ko={ko} daysOff={m.daysOff} known={known} onSave={d => save(d, e.id)} onCancel={() => setEditing(null)} />
  ) : (
    <div key={e.id} className={`group ${OT_COLS} px-4 h-[42px] border-b border-rule text-[13.5px] ${note ? 'text-ink-3' : 'text-ink'}`}>
      <span />
      <span className="tabular-nums">{fmtDayDate(e.date, ko)}</span>
      <span className="tabular-nums text-ink-2">{fmtRange(e.start_time, e.end_time, ko)}</span>
      <span className={`tabular-nums ${note ? 'line-through' : 'font-semibold'}`}>{fmtMinutes(e.minutes, ko)}</span>
      <span className={`tabular-nums text-ink-2 ${note ? 'line-through' : ''}`}>{fmtWon(wonFor(e.minutes, settings.rate), ko)}</span>
      <span className="truncate pr-3" title={e.reason}>{e.reason}{note && <span className="ml-2 text-[12px]">· {note}</span>}</span>
      <span className="flex justify-end gap-0.5 opacity-50 group-hover:opacity-100 focus-within:opacity-100">
        <button onClick={() => setEditing(e.id)} className={rowBtn} title={ko ? '고치기' : 'Edit'} aria-label={ko ? '고치기' : 'Edit'}><Pencil size={13} /></button>
        <button onClick={() => remove(e)} className={rowBtn} title={ko ? '삭제' : 'Delete'} aria-label={ko ? '삭제' : 'Delete'}><Trash2 size={13} /></button>
      </span>
    </div>
  )

  const weekBlock = (w: MonthWeek) => {
    const es = good.filter(e => e.date >= w.from && e.date <= w.to).sort(byDateTime)
    const off = notCounted.filter(e => e.date >= w.from && e.date <= w.to)
    const offDays = Object.keys(m.daysOff).filter(d => d >= w.from && d <= w.to && !off.some(e => e.date === d)).sort()
    const t = totals(es, settings.rate)
    const thisWeek = today >= w.from && today <= w.to
    // Entries and days off, in date order.
    const lines: ({ kind: 'entry'; date: string; e: OvertimeEntry; note?: string } | { kind: 'off'; date: string })[] = [
      ...es.map(e => ({ kind: 'entry' as const, date: e.date + e.start_time, e })),
      ...off.map(e => ({ kind: 'entry' as const, date: e.date + e.start_time, e, note: ko ? `${m.daysOff[e.date] || '쉬는 날'}, 포함 안 됨` : `${m.daysOff[e.date] || 'day off'}, not counted` })),
      ...offDays.map(d => ({ kind: 'off' as const, date: d })),
    ].sort((a, b) => a.date.localeCompare(b.date))
    return (
      <div key={w.from}>
        <label className={`${OT_COLS} px-4 h-[44px] bg-paper border-b border-rule cursor-pointer select-none`}>
          <input type="checkbox" checked={ticked.has(w.from)} onChange={() => toggle(w.from)} className="w-4 h-4 accent-[rgb(var(--accent))]" aria-label={ko ? `${weekLabel(w, true)} 인쇄` : `Print ${weekLabel(w)}`} />
          <span className="col-span-4 text-[14px] font-semibold text-ink">{weekLabel(w, ko)}{thisWeek && <span className="ml-1.5 font-normal text-[12.5px] text-ink-2">· {ko ? '이번 주' : 'this week'}</span>}</span>
          <span className="col-span-2 text-right text-[13px] text-ink-2 tabular-nums">{es.length ? <><span className="font-semibold text-ink">{fmtMinutes(t.minutes, ko)}</span> · {fmtWon(t.won, ko)}</> : <span className="text-ink-3">{ko ? '기록 없음' : 'Nothing logged'}</span>}</span>
        </label>
        {lines.map(l => l.kind === 'entry' ? entryRow(l.e, l.note) : (
          <div key={`off-${l.date}`} className={`${OT_COLS} px-4 h-[34px] border-b border-rule text-[12.5px] text-ink-3`}>
            <span />
            <span className="tabular-nums">{fmtDayDate(l.date, ko)}</span>
            <span className="col-span-5">{ko ? `${m.daysOff[l.date]} · 쉬는 날, 초과근무 없음` : `${m.daysOff[l.date]} · day off, no overtime`}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {asAdmin && onBack && (
        <button onClick={onBack} className="mb-4 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={13} />{ko ? '전체 교사로' : 'Back to all teachers'}</button>
      )}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{teacher.name}{teacher.role !== 'admin' ? ` · ${teacher.english_class}` : ''}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h1>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => goMonth(-1)} className={iconBtn} aria-label={ko ? '지난달' : 'Previous month'}><ChevronLeft size={15} /></button>
            <span className="text-[14.5px] font-semibold text-ink min-w-[140px] text-center">{monthLabel(month, ko)}</span>
            <button onClick={() => goMonth(1)} className={iconBtn} aria-label={ko ? '다음 달' : 'Next month'}><ChevronRight size={15} /></button>
          </div>
          <button onClick={print} disabled={!tickedWeeks.length} title={tickedWeeks.length ? `${fmtMinutes(tickedTotal.minutes)} · ${fmtWon(tickedTotal.won)}` : undefined}
            className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-2">
            <Printer size={14} />{ko ? `선택한 ${tickedWeeks.length}주 인쇄` : tickedWeeks.length === 1 ? 'Print 1 ticked week' : `Print ${tickedWeeks.length} ticked weeks`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div id="add" className="min-w-[900px] bg-surface border border-rule rounded-md overflow-hidden">
          <div className={`${OT_COLS} px-4 h-[38px] bg-paper-2 border-b border-rule-2 text-[11px] uppercase tracking-wider font-semibold text-ink-2`}>
            <span /><span>{ko ? '날짜' : 'Date'}</span><span>{ko ? '시작 – 끝' : 'From – To'}</span><span>{ko ? '시간' : 'Time'}</span><span>{ko ? '금액' : 'Won'}</span><span>{ko ? '무슨 일' : 'What was the work'}</span><span />
          </div>

          <div className="bg-accent-light/60 border-b border-rule-2">
            <EntryEditor ref={editorRef} today={today} rate={settings.rate} ko={ko} daysOff={m.daysOff} known={known} reasons={reasons} last={last} onSave={d => save(d)} />
          </div>

          {m.loading ? (
            <p className="px-4 py-6 text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
          ) : (
            <>
              {weeks.length === 0 && <p className="px-14 py-5 text-[13px] text-ink-3">{ko ? '이 달은 아직 시작되지 않았습니다.' : 'This month hasn’t started yet.'}</p>}
              {weeks.map(weekBlock)}
              {weekend.length > 0 && (
                <div>
                  <div className={`${OT_COLS} px-4 h-[40px] bg-paper border-b border-rule text-[13.5px] font-semibold text-ink-3`}><span /><span className="col-span-6">{ko ? '주말 (포함 안 됨)' : 'Weekends (not counted)'}</span></div>
                  {weekend.map(e => entryRow(e, ko ? '주말' : 'weekend'))}
                </div>
              )}
              <div className={`${OT_COLS} px-4 h-[52px] bg-paper-2`}>
                <span />
                <span className="col-span-4 text-[13px] text-ink-2">{isCurrent ? (ko ? `${monthLabel(month, true)} 현재까지` : `${monthLabel(month).split(' ')[0]} so far`) : monthLabel(month, ko)} · {ko ? `시간당 ${fmtWon(settings.rate, true)}` : `${fmtWon(settings.rate)} an hour`}{isCurrent && !ko ? ' · later weeks appear as they come' : ''}</span>
                <span className="col-span-2 text-right text-[15px] tabular-nums text-ink"><span className="font-semibold">{fmtMinutes(monthTotal.minutes, ko)}</span> · {fmtWon(monthTotal.won, ko)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
