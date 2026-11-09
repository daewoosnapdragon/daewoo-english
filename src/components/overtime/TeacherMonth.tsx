'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import type { Teacher } from '@/types'
import {
  blockedReason, byDateTime, counted, entriesInWeeks, fmtDate, fmtMinutes, fmtRange, fmtWon, monthLabel, overlapping, periodLabel,
  recentReasons, shiftMonth, totals, weekLabel, weekOf, weeksOfMonth, wonFor, type OvertimeEntry, type OvertimeSettings,
} from '@/lib/overtime'
import { addEntry, deleteEntry, fetchOvertime, fetchRecentOvertime, updateEntry, type EntryDraft } from '@/lib/overtimeData'
import EntryEditor, { type EntryEditorHandle } from './EntryEditor'
import { printOvertimeSheets } from './overtimeSheet'
import { useOvertimeMonth } from './useOvertime'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Pencil, Printer, Trash2 } from 'lucide-react'

// ─── One teacher's month ─────────────────────────────────────────
// The entry row at the top, then the month's weeks, newest first, each
// with a tick box, its subtotal and its entries. Print prints the ticked
// weeks as the school's sheet. Weeks with entries start ticked. Admin sees
// the same page for any teacher, opened from the staff table, and can fix
// entries for them.

const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const iconBtn = 'w-7 h-7 rounded hover:bg-paper-2 text-ink-3 hover:text-ink inline-flex items-center justify-center'

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

  const weeks = useMemo(() => weeksOfMonth(month), [month])
  const good = useMemo(() => counted(m.entries, m.daysOff), [m.entries, m.daysOff])
  const notCounted = useMemo(() => m.entries.filter(e => blockedReason(e.date, m.daysOff)), [m.entries, m.daysOff])
  // Until someone ticks or unticks, the weeks with entries are ticked.
  const ticked = useMemo(() => ticks ?? new Set(weeks.filter(w => good.some(e => e.date >= w.from && e.date <= w.to)).map(w => w.from)), [ticks, weeks, good])
  const tickedWeeks = weeks.filter(w => ticked.has(w.from))
  const monthTotal = totals(good, settings.rate)
  const tickedTotal = totals(entriesInWeeks(good, tickedWeeks), settings.rate)
  const known = useMemo(() => { const ids = new Set(m.entries.map(e => e.id)); return [...m.entries, ...recent.filter(e => !ids.has(e.id))] }, [m.entries, recent])
  const reasons = useMemo(() => { const own = recentReasons(known); const lc = new Set(own.map(r => r.toLowerCase())); return [...own, ...settings.reasons.filter(r => !lc.has(r.toLowerCase()))].slice(0, 9) }, [known, settings.reasons])
  const last = useMemo(() => [...known].sort(byDateTime).pop() || null, [known])

  const goMonth = (n: number) => { setMonth(shiftMonth(month, n)); setTicks(null); setEditing(null) }
  const toggle = (key: string) => { const n = new Set(ticked); if (n.has(key)) n.delete(key); else n.add(key); setTicks(n) }

  // The day is checked once more against the database: its days off and its other entries.
  const save = async (d: EntryDraft, id?: string): Promise<boolean> => {
    const day = await fetchOvertime(teacher.id, d.date, d.date)
    const blocked = blockedReason(d.date, day.daysOff)
    if (blocked) { showToast(blocked.kind === 'weekend' ? (ko ? '주말 근무는 초과근무에 포함되지 않습니다.' : 'Weekends are not overtime.') : (ko ? `${blocked.title}: 쉬는 날입니다.` : `${blocked.title} is a day off, so it is not overtime.`)); return false }
    const o = overlapping({ id, ...d }, day.entries)
    if (o) { showToast(ko ? `${fmtRange(o.start_time, o.end_time, true)} 기록과 겹칩니다.` : `Overlaps the ${fmtRange(o.start_time, o.end_time)} entry.`); return false }
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
    const ok = await confirmDialog({ title: ko ? '이 기록을 지울까요?' : 'Delete this entry?', message: `${fmtDate(e.date, ko)} · ${fmtRange(e.start_time, e.end_time, ko)} · ${e.reason}`, confirmLabel: ko ? '삭제' : 'Delete', danger: true })
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

  const row = (e: OvertimeEntry, note?: string) => editing === e.id ? (
    <li key={e.id} className="border-b border-rule last:border-0 px-1">
      <EntryEditor initial={e} today={today} rate={settings.rate} ko={ko} daysOff={m.daysOff} known={known} reasons={reasons} onSave={d => save(d, e.id)} onCancel={() => setEditing(null)} />
    </li>
  ) : (
    <li key={e.id} className={`group grid grid-cols-[64px_150px_88px_100px_minmax(0,1fr)_64px] items-center gap-3 px-1 py-1.5 border-b border-rule last:border-0 text-[13px] ${note ? 'text-ink-3' : 'text-ink'}`}>
      <span className="tabular-nums">{fmtDate(e.date, ko)}</span>
      <span className="tabular-nums text-ink-2">{fmtRange(e.start_time, e.end_time, ko)}</span>
      <span className={`tabular-nums font-semibold ${note ? 'line-through font-normal' : ''}`}>{fmtMinutes(e.minutes, ko)}</span>
      <span className={`tabular-nums text-ink-2 ${note ? 'line-through' : ''}`}>{fmtWon(wonFor(e.minutes, settings.rate), ko)}</span>
      <span className="truncate" title={e.reason}>{e.reason}{note && <span className="ml-2 text-[11.5px]">· {note}</span>}</span>
      <span className="flex justify-end gap-0.5 opacity-60 group-hover:opacity-100">
        <button onClick={() => setEditing(e.id)} className={iconBtn} title={ko ? '고치기' : 'Edit'} aria-label={ko ? '고치기' : 'Edit'}><Pencil size={13} /></button>
        <button onClick={() => remove(e)} className={iconBtn} title={ko ? '삭제' : 'Delete'} aria-label={ko ? '삭제' : 'Delete'}><Trash2 size={13} /></button>
      </span>
    </li>
  )

  return (
    <div>
      {asAdmin && onBack && (
        <button onClick={onBack} className="mb-4 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={13} />{ko ? '전체 교사로' : 'Back to all teachers'}</button>
      )}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{asAdmin ? `${teacher.name} · ${teacher.english_class}` : (ko ? '수업 외 초과근무' : 'Non-instructional overtime')}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h1>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <button onClick={() => goMonth(-1)} className={iconBtn} aria-label={ko ? '지난달' : 'Previous month'}><ChevronLeft size={15} /></button>
            <span className="text-[14px] font-semibold text-ink min-w-[130px] text-center">{monthLabel(month, ko)}</span>
            <button onClick={() => goMonth(1)} className={iconBtn} aria-label={ko ? '다음 달' : 'Next month'}><ChevronRight size={15} /></button>
          </div>
          <p className="text-[13px] text-ink mt-1 tabular-nums"><span className="font-semibold">{fmtMinutes(monthTotal.minutes, ko)}</span> · {fmtWon(monthTotal.won, ko)}</p>
          <p className="text-[11.5px] text-ink-3">{ko ? `시간당 ${fmtWon(settings.rate, true)}` : `${fmtWon(settings.rate)} an hour`}</p>
        </div>
      </div>

      <div id="add" className="border border-rule-2 rounded p-3.5 mb-7 bg-paper-2/40">
        <p className="text-[12px] font-semibold text-ink-2 mb-2">{asAdmin ? (ko ? `${teacher.name} 선생님 기록 추가` : `Add an entry for ${teacher.name}`) : (ko ? '초과근무 기록' : 'Log overtime')}</p>
        <EntryEditor ref={editorRef} today={today} rate={settings.rate} ko={ko} daysOff={m.daysOff} known={known} reasons={reasons} last={last} onSave={d => save(d)} />
      </div>

      {m.loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <p className="text-[12.5px] text-ink-2">{ko ? '인쇄할 주를 고르세요.' : 'Tick the weeks to print.'}{tickedWeeks.length > 0 && <span className="text-ink-3 tabular-nums"> · {ko ? '선택' : 'ticked'}: {fmtMinutes(tickedTotal.minutes, ko)} · {fmtWon(tickedTotal.won, ko)}</span>}</p>
            <button onClick={print} disabled={!tickedWeeks.length} className={btn}><Printer size={13} />{ko ? '선택한 주 인쇄' : 'Print ticked weeks'}</button>
          </div>
          <div className="space-y-4">
            {[...weeks].reverse().map(w => {
              const es = good.filter(e => weekOf(e.date, [w])).sort(byDateTime)
              const off = notCounted.filter(e => weekOf(e.date, [w]))
              const t = totals(es, settings.rate)
              return (
                <section key={w.from}>
                  <label className="flex items-center gap-2.5 border-b border-rule-2 pb-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={ticked.has(w.from)} onChange={() => toggle(w.from)} className="w-4 h-4 accent-[rgb(var(--accent))]" />
                    <span className="text-[13.5px] font-semibold text-ink">{weekLabel(w, ko)}</span>
                    <span className="ml-auto text-[12.5px] text-ink-2 tabular-nums">{es.length ? <><span className="font-semibold text-ink">{fmtMinutes(t.minutes, ko)}</span> · {fmtWon(t.won, ko)}</> : <span className="text-ink-3">{ko ? '기록 없음' : 'Nothing logged'}</span>}</span>
                  </label>
                  {(es.length > 0 || off.length > 0) && <ul>{es.map(e => row(e))}{off.map(e => row(e, m.daysOff[e.date] ? (ko ? `${m.daysOff[e.date]}, 포함 안 됨` : `${m.daysOff[e.date]}, not counted`) : (ko ? '포함 안 됨' : 'not counted')))}</ul>}
                </section>
              )
            })}
            {(() => {
              const weekend = notCounted.filter(e => !weekOf(e.date, weeks))
              return weekend.length > 0 && (
                <section>
                  <div className="border-b border-rule-2 pb-1.5 text-[13.5px] font-semibold text-ink-3">{ko ? '주말 (포함 안 됨)' : 'Weekends (not counted)'}</div>
                  <ul>{weekend.map(e => row(e, ko ? '주말' : 'weekend'))}</ul>
                </section>
              )
            })()}
          </div>
        </>
      )}
    </div>
  )
}
