'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { levelShort, splitUnitTitle, type CurriculumLesson, type CurriculumUnit } from '@/lib/curriculumCore'
import type { Lane, Week } from '@/lib/curriculumPacing'
import { emptyDay, unitsInWeek, weekDays, type DayContent, type LogRow } from '@/lib/curriculumWeek'
import { fetchWeek, importLesson, removeLesson, setDayDone } from '@/lib/curriculumWeekData'
import { ArrowLeft, Check, ExternalLink, Loader2, RotateCcw, X } from 'lucide-react'

// ─── One week of the board ───────────────────────────────────────
// The five days as they are on the Lesson Plans page, and beside them the
// units running this week with their lessons as chips. Press a day letter
// on a chip and the lesson's words go into that day: a subject row, the
// "students will" line, the notes. The day keeps a link to the lesson, so
// it can be taken out again and so Mark done counts its standards as
// taught. Only the class's own teacher can change anything.

type Bar = Lane['bars'][number]
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const DAY_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], DAY_KO = ['월', '화', '수', '목', '금']
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })

interface Props { cls: string; grade: number; week: Week; bars: Bar[]; units: CurriculumUnit[]; lessons: CurriculumLesson[]; canEdit: boolean; teacherId: string; today: string; holiday: string | undefined; label?: string; planInLessons?: boolean; onBack: () => void; onChanged?: () => void }

export default function WeekView({ cls, grade, week, bars, units, lessons, canEdit, teacherId, today, holiday, label, planInLessons, onBack, onChanged }: Props) {
  const { language, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const dates = useMemo(() => weekDays(week), [week])
  const [days, setDays] = useState<Record<string, DayContent>>({})
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [logMissing, setLogMissing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const reload = useCallback(async () => {
    const r = await fetchWeek(cls, grade, dates)
    if (r.error) showToast(r.error)
    setDays(r.days); setLogs(r.logs); setLogMissing(r.logMissing); setLoading(false)
  }, [cls, grade, dates, showToast])
  useEffect(() => { setLoading(true); reload() }, [reload])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  const running = useMemo(() => unitsInWeek(bars, week.n), [bars, week.n])
  const lessonsOf = (u: CurriculumUnit) => lessons.filter(l => l.unit_id === u.id).sort((a, b) => a.sort_order - b.sort_order)
  const logFor = (lessonId: string, date: string) => logs.find(l => l.lesson_id === lessonId && l.date === date)
  const whereIs = (lessonId: string) => dates.map((d, i) => logFor(lessonId, d) ? i : -1).filter(i => i >= 0)
  const barOf = (unitId: string) => bars.find(b => b.unit.id === unitId)

  const add = async (b: Bar, lesson: CurriculumLesson, date: string) => {
    setBusy(lesson.id + date)
    if (!fail(await importLesson(date, cls, grade, lesson, b.unit, b.series?.name || b.book.title || 'Reading', days[date] || emptyDay(), teacherId))) { await reload(); onChanged?.() }
    setBusy(null)
  }
  const remove = async (row: LogRow) => {
    const lesson = lessons.find(l => l.id === row.lesson_id), b = barOf(row.unit_id), unit = units.find(u => u.id === row.unit_id)
    if (!lesson || !unit) return
    setBusy(row.id)
    if (!fail(await removeLesson(row.date, cls, grade, lesson, unit, b?.series?.name || b?.book.title || 'Reading', days[row.date] || emptyDay(), teacherId))) { await reload(); onChanged?.() }
    setBusy(null)
  }
  const done = async (date: string, value: boolean) => {
    if (value && !await confirmDialog({ title: ko ? '오늘 완료' : 'Mark the day done', message: ko ? `${fmtDay(date, ko)}의 차시를 가르친 것으로 표시합니다. 그 표준은 가르친 것으로 셉니다.` : `The lessons on ${fmtDay(date, ko)} count as taught, and so do their standards.`, confirmLabel: ko ? '완료' : 'Done' })) return
    setBusy(date)
    if (!fail(await setDayDone(date, cls, grade, value))) { await reload(); onChanged?.() }
    setBusy(null)
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <button onClick={onBack} className={btnS}><ArrowLeft size={11} />{ko ? '학기 보드로' : 'Back to the term'}</button>
        <span className="text-[14px] font-semibold text-ink">{ko ? `${label || week.n}주` : `Week ${label || week.n}`} · {fmtDay(week.monday, ko)} – {fmtDay(week.friday, ko)}</span>
        {holiday && <span className="text-[12px] text-ink-3">{holiday}</span>}
        <Link href="/lesson-plans" className="ml-auto text-[12px] text-accent inline-flex items-center gap-1">{ko ? '수업 계획 페이지' : 'Open Lesson Plans'}<ExternalLink size={11} /></Link>
      </div>
      {planInLessons && <p className="text-[12px] text-ink-2 mb-3 px-3 py-2 rounded bg-paper-2">{ko ? '이 반은 수업 계획 페이지에서 차시를 날짜에 넣습니다. 이 주 보기는 보여주기만 합니다.' : 'This class puts lessons into days on Lesson Plans (the board’s units are offered there). This week view only shows them.'} <Link href="/lesson-plans" className="text-accent">{ko ? '수업 계획 열기' : 'Open Lesson Plans'}</Link></p>}
      {logMissing && canEdit && <p className="text-[12px] text-warn mb-3">{ko ? 'supabase/migration-curriculum-lesson-log.sql을 실행하면 가져오기와 완료 표시가 켜집니다.' : 'Run supabase/migration-curriculum-lesson-log.sql once to turn on importing and Mark done.'}</p>}
      {loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : (
        <div className="flex gap-5 items-start flex-wrap">
          {/* Days */}
          <div className="flex-[999_1_560px] min-w-0 grid gap-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {dates.map((d, i) => {
              const day = days[d] || emptyDay()
              const rows = logs.filter(l => l.date === d)
              const allDone = rows.length > 0 && rows.every(r => r.done)
              const isToday = d === today
              return (
                <div key={d} className={`border rounded bg-surface flex flex-col min-w-0 ${isToday ? 'border-accent' : 'border-rule'}`}>
                  <div className={`px-2.5 py-1.5 border-b border-rule flex items-baseline gap-1.5 ${isToday ? 'bg-accent-soft' : ''}`}>
                    <span className="text-[12.5px] font-semibold text-ink">{ko ? DAY_KO[i] : DAY_EN[i]}</span>
                    <span className="text-[10.5px] text-ink-3">{fmtDay(d, ko)}</span>
                    {allDone && <Check size={11} className="text-good ml-auto" />}
                  </div>
                  <div className="px-2.5 py-2 flex flex-col gap-1.5 text-[11.5px] flex-1">
                    {day.subjects.filter(s => s.label || s.content).map((s, j) => <div key={j} className="min-w-0"><span className="text-[10px] uppercase tracking-wide text-ink-3 block">{s.label}</span><span className="text-ink block leading-snug">{s.content}</span></div>)}
                    {day.objective && <p className="text-ink-2 leading-snug whitespace-pre-line">{day.objective}</p>}
                    {day.notes && <p className="text-ink-3 leading-snug whitespace-pre-line">{day.notes}</p>}
                    {!day.subjects.some(s => s.label || s.content) && !day.objective && <p className="text-ink-3">{ko ? '계획 없음' : 'Nothing planned yet'}</p>}
                    {rows.length > 0 && (
                      <div className="mt-auto pt-1.5 border-t border-rule flex flex-col gap-1">
                        {rows.map(r => { const l = lessons.find(x => x.id === r.lesson_id); return (
                          <div key={r.id} className="flex items-center gap-1 text-[10.5px]">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.done ? 'bg-good' : 'bg-ink-3'}`} />
                            <span className="truncate text-ink-2">{l?.title || '?'}</span>
                            {canEdit && <button onClick={() => remove(r)} disabled={busy === r.id} className="ml-auto text-ink-3 hover:text-bad" aria-label="Remove"><X size={10} /></button>}
                          </div>) })}
                      </div>
                    )}
                  </div>
                  {canEdit && rows.length > 0 && (
                    <div className="px-2.5 py-1.5 border-t border-rule">
                      {allDone ? <button onClick={() => done(d, false)} disabled={busy === d} className="text-[11px] text-ink-3 hover:text-ink inline-flex items-center gap-1"><RotateCcw size={10} />{ko ? '다시 열기' : 'Reopen'}</button>
                        : <button onClick={() => done(d, true)} disabled={busy === d} className="text-[11px] text-good font-medium inline-flex items-center gap-1"><Check size={10} />{ko ? '완료' : 'Mark done'}</button>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* Units this week */}
          <aside className="flex-[1_1_300px] max-w-[380px] border border-rule rounded bg-surface">
            <div className="px-4 py-3 border-b border-rule">
              <p className="eyebrow">{ko ? '이번 주 단원' : 'This week’s units'}</p>
              <p className="text-[11.5px] text-ink-3 mt-0.5">{canEdit ? (ko ? '요일 글자를 누르면 그 날로 들어갑니다. 말은 복사되고 태그는 연결됩니다.' : 'Press a day letter to put a lesson into that day. The words are copied; the tags stay linked.') : (ko ? '이번 주에 진행 중인 단원과 차시' : 'The units running this week and their lessons.')}</p>
            </div>
            {running.length === 0 && <p className="px-4 py-3 text-[12px] text-ink-3">{ko ? '이번 주에 진행 중인 단원이 없습니다.' : 'No unit runs this week.'}</p>}
            {running.map(b => {
              const t = splitUnitTitle(b.unit.title)
              const ls = lessonsOf(b.unit)
              return (
                <div key={b.pacing.id} className="px-4 py-3 border-b border-rule last:border-b-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-display text-[18px] leading-none" style={{ color: b.color }}>{levelShort(b.book.level_number) || '·'}</span>
                    <div className="min-w-0"><p className="text-[12.5px] font-semibold text-ink truncate">{t.name}</p><p className="text-[10.5px] text-ink-3">{b.series?.name}{t.badge ? ` · ${t.badge}` : ''} · {ko ? '주' : 'wk'} {Math.floor(b.viewStart)}–{Math.ceil(b.viewEnd)}</p></div>
                  </div>
                  {ls.length === 0 && <p className="text-[11.5px] text-ink-3">{ko ? '차시 없음' : 'No lessons indexed yet.'}</p>}
                  <div className="flex flex-col gap-1">
                    {ls.map((l, i) => {
                      const placed = whereIs(l.id)
                      return (
                        <div key={l.id} className={`flex items-center gap-2 rounded px-2 py-1 border ${placed.length ? 'border-rule bg-paper-2' : 'border-rule'}`}>
                          <span className="text-[10.5px] text-ink-3 w-4 shrink-0">{i + 1}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[12px] text-ink truncate" title={l.objective}>{l.title}</span>{placed.length > 0 && <span className="block text-[10px] text-good">{ko ? '들어감: ' : 'in '}{placed.map(x => (ko ? DAY_KO : DAY_EN)[x]).join(', ')}</span>}</span>
                          {canEdit && !logMissing && (
                            <span className="inline-flex gap-0.5 shrink-0">
                              {dates.map((d, di) => {
                                const on = !!logFor(l.id, d)
                                return <button key={d} onClick={() => !on && add(b, l, d)} disabled={busy === l.id + d || on} title={fmtDay(d, ko)} className={`w-5 h-5 rounded text-[9.5px] font-semibold ${on ? 'bg-good text-white' : 'bg-paper-2 text-ink-2 hover:bg-ink hover:text-paper'}`}>{(ko ? DAY_KO : DAY_EN)[di].charAt(0)}</button>
                              })}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </aside>
        </div>
      )}
    </div>
  )
}
