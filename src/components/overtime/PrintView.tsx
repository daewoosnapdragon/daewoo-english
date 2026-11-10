'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import type { Teacher } from '@/types'
import { counted, entriesInWeeks, fmtMinutes, fmtWon, pickFor, quickRanges, rangeSpan, selectionLabel, totals, type OvertimeSettings, type QuickPick } from '@/lib/overtime'
import { overtimeSheetHtml, printOvertimeSheets, type SheetInput } from './overtimeSheet'
import { exportOvertime } from './overtimeExport'
import { useOvertimeRange } from './useOvertime'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'

// ─── Print the sheet ─────────────────────────────────────────────
// Choosing what to print, with the sheet itself beside it. On the left a
// quick pick (this month, last month, the last two weeks) or any two dates,
// what that comes to, and Print; admin also picks everyone or one teacher,
// and can export. On the right the real sheet, the same document that
// prints, scaled to the column and redrawn as the dates change, so what is
// seen is what prints. Print prints that preview; a new window is the
// fallback.

interface Props {
  settings: OvertimeSettings
  /** The teacher whose sheet this is, or the whole staff for admin. */
  teachers: Teacher[]
  admin?: boolean
  initialFrom: string
  initialTo: string
  /** Admin: 'all', or one teacher's id. */
  initialWho?: string
  onBack: () => void
}

const pickBtn = 'h-9 px-3 rounded border text-[13px] text-left'
const dateInp = 'h-10 px-2.5 bg-surface border border-rule-2 rounded text-[13.5px] text-ink w-full focus:outline-none focus:border-ink-2'
const PREVIEW_W = 1140   // px: the preview document's width, an A4 landscape page and a little room

export default function PrintView({ settings, teachers, admin, initialFrom, initialTo, initialWho = 'all', onBack }: Props) {
  const { language, showToast } = useApp()
  const ko = language === 'ko'
  const today = getKSTDateString()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [who, setWho] = useState(initialWho)
  const [exporting, setExporting] = useState(false)
  const span = rangeSpan(from, to)
  // Keep the last good range while one date is being changed.
  const [shown, setShown] = useState(() => rangeSpan(initialFrom, initialTo) || { from: initialFrom, to: initialTo })
  useEffect(() => { if (span) setShown(span) }, [span?.from, span?.to]) // eslint-disable-line react-hooks/exhaustive-deps

  const single = !admin ? teachers[0] : who !== 'all' ? teachers.find(t => t.id === who) || null : null
  const data = useOvertimeRange(admin && !single ? null : (single || teachers[0])?.id || null, shown.from, shown.to)
  const good = useMemo(() => entriesInWeeks(counted(data.entries, data.daysOff), [shown]), [data.entries, data.daysOff, shown])
  const period = selectionLabel([shown])
  const sheets: SheetInput[] = useMemo(() => {
    const sheet = (t: Teacher): SheetInput => ({ teacherName: t.name, className: t.role === 'admin' ? '' : t.english_class, period, entries: good.filter(e => e.teacher_id === t.id) })
    if (single) return [sheet(single)]
    return teachers.map(sheet).filter(s => s.entries.length > 0)
  }, [single, teachers, good, period])
  const total = totals(sheets.flatMap(s => s.entries), settings.rate)
  const html = useMemo(() => overtimeSheetHtml(sheets, settings, undefined, { autoPrint: false }), [sheets, settings])
  const pick = pickFor(from, to, today)
  const picks: { id: QuickPick; label: string }[] = [
    { id: 'thisMonth', label: ko ? '이번 달' : 'This month' },
    { id: 'lastMonth', label: ko ? '지난달' : 'Last month' },
    { id: 'twoWeeks', label: ko ? '최근 2주' : 'Last 2 weeks' },
  ]
  const choose = (id: QuickPick) => { const r = quickRanges(today)[id]; setFrom(r.from); setTo(r.to) }

  // The preview: the sheet document in a frame, scaled to fit the column.
  const boxRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [boxW, setBoxW] = useState(800)
  const [docH, setDocH] = useState(820)
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth))
    ro.observe(el); setBoxW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const measure = () => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    const h = () => setDocH(Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0))
    h(); setTimeout(h, 300)   // again once the sheet has fitted itself
  }
  const scale = Math.min(1, boxW / PREVIEW_W)

  const print = () => {
    if (!sheets.length) return
    const win = frameRef.current?.contentWindow
    try {
      if (!win) throw new Error('no frame')
      win.focus(); win.print()
    } catch {
      if (!printOvertimeSheets(sheets, settings)) { showToast(ko ? '팝업이 차단되었습니다' : 'The print window was blocked. Allow pop-ups for this site.'); return }
    }
    logActivity('printed', `Overtime ${sheets.length === 1 ? `sheet: ${sheets[0].teacherName}` : `sheets: ${sheets.length} teachers`} · ${period}`, { path: '/overtime' })
  }
  const doExport = async () => {
    setExporting(true)
    const rows = (single ? [single] : teachers).map(t => ({ teacher: t, entries: good.filter(e => e.teacher_id === t.id) }))
    try { await exportOvertime(rows, settings.rate, `overtime-${shown.from}-to-${shown.to}`, period) }
    catch (e: any) { showToast(e?.message || String(e)) }
    setExporting(false)
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={13} />{ko ? '기록으로 돌아가기' : 'Back to the log'}</button>
      <div className="mb-5">
        <p className="eyebrow eyebrow-accent mb-1.5">{admin && !single ? (ko ? '전체 교사' : 'All teachers') : single ? `${single.name}${single.role !== 'admin' ? ` · ${single.english_class}` : ''}` : ''}</p>
        <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '양식 인쇄' : 'Print the sheet'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-7 items-start">
        <div className="flex flex-col gap-5">
          {admin && (
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink-2">
              {ko ? '누구' : 'Who'}
              <select value={who} onChange={e => setWho(e.target.value)} className={`${dateInp} font-normal`}>
                <option value="all">{ko ? '기록이 있는 모든 교사' : 'Everyone with overtime'}</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} · {t.english_class}</option>)}
              </select>
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-ink-2">{ko ? '기간' : 'Dates'}</span>
            <div className="flex flex-col gap-1.5" role="group" aria-label={ko ? '빠른 선택' : 'Quick picks'}>
              {picks.map(p => (
                <button key={p.id} onClick={() => choose(p.id)} aria-pressed={pick === p.id}
                  className={`${pickBtn} ${pick === p.id ? 'border-ink bg-ink text-paper font-semibold' : 'border-rule-2 bg-surface text-ink-2 hover:text-ink'}`}>
                  {p.label}
                  <span className={`ml-2 text-[12px] font-normal ${pick === p.id ? 'text-paper/80' : 'text-ink-3'}`}>{selectionLabel([quickRanges(today)[p.id]], ko)}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">{ko ? '시작' : 'From'}<input type="date" value={from} onChange={e => setFrom(e.target.value)} className={dateInp} /></label>
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">{ko ? '끝' : 'To'}<input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className={dateInp} /></label>
            </div>
            {!span && <p className="text-[12px] text-ink-2">{ko ? '시작 날짜가 끝 날짜보다 앞이어야 합니다.' : 'From has to come before To.'}</p>}
          </div>

          <div className="bg-paper-2 rounded-md px-4 py-3.5 flex flex-col gap-1">
            <span className="text-[12px] text-ink-2">{ko ? '인쇄할 내용' : 'On the sheet'}</span>
            <span className="text-[15px] font-semibold text-ink">{selectionLabel([shown], ko)}</span>
            <span className="text-[14px] tabular-nums text-ink"><span className="font-semibold">{fmtMinutes(total.minutes, ko)}</span> · {fmtWon(total.won, ko)}</span>
            <span className="text-[12px] text-ink-2">{total.count} {ko ? '건' : total.count === 1 ? 'entry' : 'entries'}{admin && !single ? ` · ${sheets.length} ${ko ? '명, 한 사람당 한 장' : sheets.length === 1 ? 'teacher, one page' : 'teachers, a page each'}` : ''}</span>
          </div>

          <button onClick={print} disabled={!sheets.length || data.loading} className="h-11 rounded bg-accent text-white text-[14px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center justify-center gap-2">
            <Printer size={15} />{ko ? '인쇄' : 'Print'}
          </button>
          {admin && (
            <button onClick={doExport} disabled={exporting || data.loading} className="h-9 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center justify-center gap-1.5">
              {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{ko ? '엑셀로 내보내기' : 'Export to Excel'}
            </button>
          )}
        </div>

        <div ref={boxRef} className="min-w-0 rounded-md border border-rule bg-[#e6e9ed] overflow-hidden relative" style={{ height: sheets.length ? docH * scale : 240 }}>
          {data.loading && <span className="absolute top-3 right-3 z-10 text-[12px] text-ink-2 inline-flex items-center gap-1.5 bg-surface/90 rounded px-2 py-1"><Loader2 size={12} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</span>}
          {sheets.length ? (
            <iframe ref={frameRef} srcDoc={html} onLoad={measure} title={ko ? '양식 미리보기' : 'Sheet preview'}
              style={{ width: PREVIEW_W, height: docH, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', display: 'block' }} />
          ) : (
            <p className="p-8 text-[13.5px] text-ink-2">{ko ? '이 기간에는 초과근무 기록이 없습니다.' : 'No overtime in these dates.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
