'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import type { Teacher } from '@/types'
import { chosenSpans, counted, entriesInWeeks, fmtDate, fmtMinutes, fmtWon, joinSpan, monthLabel, monthRange, selectionLabel, selSpans, selTicked, setWeeks, shiftMonth, toggleWeek, totals, weekLabel, weeksOfMonth, weeksSpan, type OvertimeSettings, type SheetSel } from '@/lib/overtime'
import { printOvertimeSheets, type SheetInput } from './overtimeSheet'
import { exportOvertime } from './overtimeExport'
import SheetBar from './SheetBar'
import { useOvertimeRange } from './useOvertime'
import { ChevronLeft, ChevronRight, Download, Loader2, Printer, RefreshCw } from 'lucide-react'

// ─── Everyone's month (admin) ────────────────────────────────────
// Tick the weeks the office is asking for, in one month or several, or
// type a range of dates; the totals, the table, Print and Export follow. One row per teacher: entries, time, won,
// the last entry, and Open (their page, editable) and Print (their sheet).
// Print all puts every teacher with entries in one document, one teacher
// per sheet.

const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2.5 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const iconBtn = 'w-7 h-7 rounded hover:bg-paper-2 text-ink-3 hover:text-ink inline-flex items-center justify-center'

interface Props {
  staff: Teacher[]
  settings: OvertimeSettings
  month: string
  setMonth: (m: string) => void
  sel: SheetSel
  setSel: (s: SheetSel) => void
  onOpen: (t: Teacher) => void
}

export default function AdminMonth({ staff, settings, month, setMonth, sel, setSel, onOpen }: Props) {
  const { language, showToast } = useApp()
  const ko = language === 'ko'
  const range = monthRange(month)
  const load = joinSpan(range, weeksSpan(chosenSpans(sel)))
  const m = useOvertimeRange(null, load.from, load.to)
  const [exporting, setExporting] = useState(false)
  const weeks = useMemo(() => weeksOfMonth(month), [month])
  // Until someone ticks or picks dates, every week of the month on screen is on the sheet.
  const defaultKeys = useMemo(() => weeks.map(w => w.from), [weeks])
  const spans = useMemo(() => selSpans(sel, defaultKeys), [sel, defaultKeys])
  const good = useMemo(() => counted(m.entries, m.daysOff), [m.entries, m.daysOff])
  const inTicked = useMemo(() => entriesInWeeks(good, spans), [good, spans])
  const rows = useMemo(() => staff.map(t => {
    const es = inTicked.filter(e => e.teacher_id === t.id)
    return { t, es, ...totals(es, settings.rate), last: es.map(e => e.date).sort().pop() || null }
  }), [staff, inTicked, settings.rate])
  const all = totals(inTicked.filter(e => staff.some(t => t.id === e.teacher_id)), settings.rate)
  const withEntries = rows.filter(r => r.count > 0)
  const period = selectionLabel(spans)
  // Leaving the month keeps what is on the sheet: the default ticks become real ones.
  const goMonth = (to: string) => { if (sel.kind === 'weeks' && sel.keys === null) setSel({ kind: 'weeks', keys: defaultKeys }); setMonth(to) }
  const isCurrent = month === getKSTDateString().slice(0, 7)

  const sheetFor = (r: typeof rows[number]): SheetInput => ({ teacherName: r.t.name, className: r.t.english_class, period, entries: r.es })
  const print = (rs: typeof rows) => {
    if (!rs.length) return
    if (!printOvertimeSheets(rs.map(sheetFor), settings)) { showToast(ko ? '팝업이 차단되었습니다' : 'The print window was blocked. Allow pop-ups for this site.'); return }
    logActivity('printed', `Overtime sheets: ${rs.length === 1 ? rs[0].t.name : `${rs.length} teachers`} · ${period}`, { path: '/overtime' })
  }
  const doExport = async () => {
    setExporting(true)
    const span = weeksSpan(spans)
    try { await exportOvertime(rows.map(r => ({ teacher: r.t, entries: r.es })), settings.rate, span ? `overtime-${span.from}-to-${span.to}` : `overtime-${month}`, period) }
    catch (e: any) { showToast(e?.message || String(e)) }
    setExporting(false)
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '전체 교사' : 'All teachers'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(shiftMonth(month, -1))} className={iconBtn} aria-label={ko ? '지난달' : 'Previous month'}><ChevronLeft size={15} /></button>
          <span className="text-[14px] font-semibold text-ink min-w-[130px] text-center">{monthLabel(month, ko)}</span>
          <button onClick={() => goMonth(shiftMonth(month, 1))} className={iconBtn} aria-label={ko ? '다음 달' : 'Next month'}><ChevronRight size={15} /></button>
          {!isCurrent && <button onClick={() => goMonth(getKSTDateString().slice(0, 7))} className={`${btnS} ml-1`}>{ko ? '이번 달' : 'This month'}</button>}
          <button onClick={m.reload} className={`${iconBtn} ml-1`} title={ko ? '새로고침' : 'Refresh'} aria-label={ko ? '새로고침' : 'Refresh'}><RefreshCw size={13} /></button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {weeks.map(w => { const on = selTicked(sel, w.from, defaultKeys); return (
          <label key={w.from} className={`h-8 px-2.5 rounded border text-[12.5px] inline-flex items-center gap-1.5 cursor-pointer select-none ${on ? 'border-ink bg-ink text-paper' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>
            <input type="checkbox" checked={on} onChange={() => setSel(toggleWeek(sel, w.from, defaultKeys))} className="sr-only" />
            <span className={`w-3.5 h-3.5 rounded-sm border inline-flex items-center justify-center text-[10px] ${on ? 'border-paper' : 'border-ink-3'}`}>{on ? '✓' : ''}</span>
            {weekLabel(w, ko)}
          </label>
        ) })}
        <button onClick={() => setSel(setWeeks(sel, defaultKeys, true, defaultKeys))} className={btnS}>{ko ? '이 달 전체' : 'All this month'}</button>
        <button onClick={() => setSel(setWeeks(sel, defaultKeys, false, defaultKeys))} className={btnS}>{ko ? '이 달 없음' : 'None this month'}</button>
      </div>
      <div className="mb-2">
        <SheetBar sel={sel} setSel={setSel} label={selectionLabel(spans, ko)} total={all} ko={ko}
          hint={ko ? '주를 고르세요 (여러 달 가능). 또는 날짜를 고르세요.' : 'Tick weeks, in any month, or pick dates.'}
          suffix={`${withEntries.length} ${ko ? '명' : withEntries.length === 1 ? 'teacher' : 'teachers'} · ${ko ? `시간당 ${fmtWon(settings.rate, true)}` : `${fmtWon(settings.rate)} an hour`}`} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => print(withEntries)} disabled={!withEntries.length} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5"><Printer size={13} />{ko ? '모두 인쇄' : 'Print all'}{withEntries.length ? ` (${withEntries.length})` : ''}</button>
        <button onClick={doExport} disabled={exporting || !spans.length} className={btn}>{exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{ko ? '엑셀로 내보내기' : 'Export to Excel'}</button>
      </div>

      {!m.covers(range.from, range.to) ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3 border-b border-rule-2">
                <th className="py-2 pr-3 font-semibold">{ko ? '교사' : 'Teacher'}</th>
                <th className="py-2 pr-3 font-semibold">{ko ? '반' : 'Class'}</th>
                <th className="py-2 pr-3 font-semibold text-right">{ko ? '기록' : 'Entries'}</th>
                <th className="py-2 pr-3 font-semibold text-right">{ko ? '시간' : 'Time'}</th>
                <th className="py-2 pr-3 font-semibold text-right">{ko ? '금액' : 'Won'}</th>
                <th className="py-2 pr-3 font-semibold">{ko ? '마지막 기록' : 'Last entry'}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.t.id} className="border-b border-rule">
                  <td className="py-2 pr-3 font-medium text-ink">{r.t.name}</td>
                  <td className="py-2 pr-3 text-ink-2">{r.t.english_class}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-2">{r.count || '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold text-ink">{r.count ? fmtMinutes(r.minutes, ko) : <span className="font-normal text-ink-3">—</span>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-2">{r.count ? fmtWon(r.won, ko) : '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-3">{r.last ? fmtDate(r.last, ko) : '—'}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button onClick={() => onOpen(r.t)} className={btnS}>{ko ? '열기' : 'Open'}</button>
                    <button onClick={() => print([r])} disabled={!spans.length} className={`${btnS} ml-1.5`}><Printer size={11} />{ko ? '인쇄' : 'Print'}</button>
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2.5 pr-3 text-ink" colSpan={2}>{ko ? '합계' : 'Total'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{all.count || '—'}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{fmtMinutes(all.minutes, ko)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{fmtWon(all.won, ko)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
          {staff.length === 0 && <p className="text-[12.5px] text-ink-3 mt-3">{ko ? '교사가 없습니다.' : 'No teachers yet.'}</p>}
        </div>
      )}
    </div>
  )
}
