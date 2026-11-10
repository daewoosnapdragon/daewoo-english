'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import type { Teacher } from '@/types'
import { counted, fmtDate, fmtMinutes, fmtWon, monthLabel, monthRange, shiftMonth, totals, type OvertimeSettings } from '@/lib/overtime'
import PrintView from './PrintView'
import { useOvertimeMonth } from './useOvertime'
import { ChevronLeft, ChevronRight, Loader2, Printer, RefreshCw } from 'lucide-react'

// ─── Everyone's month (admin) ────────────────────────────────────
// The month on screen, one row per teacher: entries, time, won and the last
// entry, with Open (their page, editable) and Print (their sheet). Print or
// export opens the print view for everyone: there the dates are chosen, by
// a quick pick or two dates in any months, beside a preview of every
// teacher's sheet, a page each, and the Excel export follows the same dates.

const btnS = 'h-7 px-2.5 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const iconBtn = 'w-7 h-7 rounded hover:bg-paper-2 text-ink-3 hover:text-ink inline-flex items-center justify-center'

interface Props {
  staff: Teacher[]
  settings: OvertimeSettings
  month: string
  setMonth: (m: string) => void
  onOpen: (t: Teacher) => void
}

export default function AdminMonth({ staff, settings, month, setMonth, onOpen }: Props) {
  const { language } = useApp()
  const ko = language === 'ko'
  const range = monthRange(month)
  const m = useOvertimeMonth(null, month)
  const [printing, setPrinting] = useState<string | null>(null)   // 'all' or a teacher's id
  const good = useMemo(() => counted(m.entries, m.daysOff), [m.entries, m.daysOff])
  const rows = useMemo(() => staff.map(t => {
    const es = good.filter(e => e.teacher_id === t.id)
    return { t, ...totals(es, settings.rate), last: es.map(e => e.date).sort().pop() || null }
  }), [staff, good, settings.rate])
  const all = totals(good.filter(e => staff.some(t => t.id === e.teacher_id)), settings.rate)
  const withEntries = rows.filter(r => r.count > 0).length
  const isCurrent = month === getKSTDateString().slice(0, 7)

  if (printing) return <PrintView settings={settings} teachers={staff} admin initialFrom={range.from} initialTo={range.to} initialWho={printing} onBack={() => { setPrinting(null); m.reload() }} />

  return (
    <div>
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '전체 교사' : 'All teachers'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h1>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className={iconBtn} aria-label={ko ? '지난달' : 'Previous month'}><ChevronLeft size={15} /></button>
            <span className="text-[14px] font-semibold text-ink min-w-[130px] text-center">{monthLabel(month, ko)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} className={iconBtn} aria-label={ko ? '다음 달' : 'Next month'}><ChevronRight size={15} /></button>
            {!isCurrent && <button onClick={() => setMonth(getKSTDateString().slice(0, 7))} className={`${btnS} ml-1`}>{ko ? '이번 달' : 'This month'}</button>}
            <button onClick={m.reload} className={`${iconBtn} ml-1`} title={ko ? '새로고침' : 'Refresh'} aria-label={ko ? '새로고침' : 'Refresh'}><RefreshCw size={13} /></button>
          </div>
          <button onClick={() => setPrinting('all')} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-2">
            <Printer size={14} />{ko ? '인쇄 또는 내보내기' : 'Print or export'}
          </button>
        </div>
      </div>

      <p className="text-[12.5px] text-ink-2 mb-4 tabular-nums">
        {monthLabel(month, ko)} · <span className="font-semibold text-ink">{fmtMinutes(all.minutes, ko)}</span> · {fmtWon(all.won, ko)} · {withEntries} {ko ? '명' : withEntries === 1 ? 'teacher' : 'teachers'}
        <span className="text-ink-3"> · {ko ? `시간당 ${fmtWon(settings.rate, true)}` : `${fmtWon(settings.rate)} an hour`}</span>
      </p>

      {m.loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : (
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
                    <button onClick={() => setPrinting(r.t.id)} className={`${btnS} ml-1.5`}><Printer size={11} />{ko ? '인쇄' : 'Print'}</button>
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
