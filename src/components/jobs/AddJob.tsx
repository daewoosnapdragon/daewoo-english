'use client'

import { useState } from 'react'
import { SIZES, SIZE_LABELS, endOfMonth, nextMonthKey, nextSemester, thisFriday, type DueKind, type JobDraft, type JobSize } from '@/lib/adminJobs'
import type { Semester, Teacher } from '@/types'
import { Calendar, Plus } from 'lucide-react'
import SizeMark from './SizeMark'

// ─── Add a job in one line ───────────────────────────────────────
// A title, when (today, this week, a month by name meaning by its end,
// the end of the semester, next semester, whenever, or an exact day from
// the calendar) and how big. Enter adds it with no
// owner; everything else is set on the card.

export const field = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink placeholder:text-ink-3'
const chip = (on: boolean) => `h-7 px-2.5 rounded-full border text-[length:calc(11.5px*var(--ts))] whitespace-nowrap ${on ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-3 hover:text-ink'}`

type When = 'today' | 'week' | 'day' | 'semester' | 'next' | 'someday' | 'oneday' | `m:${string}`
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** This month and the next few, as chips: a job "for December" is due by its end. */
const MONTH_CHIPS = 6

export default function AddJob({ ko, today, activeSemester, semesters, me, onAdd }: {
  ko: boolean; today: string; activeSemester: Semester | null; semesters: Semester[]; me: Teacher | null; onAdd: (d: JobDraft) => Promise<string | null>
}) {
  const next = nextSemester(semesters, today)
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<When>('week')
  const [day, setDay] = useState('')
  const [size, setSize] = useState<JobSize>('S')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const months: string[] = []
  for (let k = today.slice(0, 7), i = 0; i < MONTH_CHIPS; k = nextMonthKey(k + '-01'), i++) months.push(k)
  const monthName = (k: string) => { const m = Number(k.slice(5, 7)); return ko ? `${m}월` : `${MONTHS_EN[m - 1]}${m === 1 ? ` ${k.slice(0, 4)}` : ''}` }
  const whens: [When, string][] = [['today', ko ? '오늘' : 'Today'], ['week', ko ? '이번 주' : 'This week'], ...months.map(k => [`m:${k}` as When, monthName(k)] as [When, string]), ['semester', ko ? '학기말' : 'End of semester'], ['next', ko ? '다음 학기' : 'Next semester'], ['someday', ko ? '언제든' : 'Whenever'], ['oneday', ko ? '언젠가' : 'One day']]

  const save = async () => {
    const t = title.trim(); if (!t || busy) return
    let due_kind: DueKind = 'date', due_date: string | null = null
    if (when === 'today') due_date = today
    else if (when === 'week') due_date = thisFriday(today)
    else if (when === 'day') { if (!day) { setErr(ko ? '날짜를 고르세요.' : 'Pick a day.'); return } due_date = day }
    else if (when.startsWith('m:')) { due_kind = 'month'; due_date = endOfMonth(when.slice(2) + '-01') }
    else if (when === 'semester') { if (!activeSemester?.end_date) { setErr(ko ? '학기 종료일이 설정에 없습니다.' : 'The semester has no end date in Settings.'); return } due_kind = 'semester'; due_date = activeSemester.end_date }
    else if (when === 'next') { if (!next?.end_date) { setErr(ko ? '다음 학기가 설정에 없습니다 (시작일과 종료일).' : 'No next semester in Settings yet; add it with its start and end dates.'); return } due_kind = 'semester'; due_date = next.end_date }
    else if (when === 'oneday') { due_kind = 'oneday' }
    else { due_kind = 'someday' }
    setBusy(true); setErr('')
    const e = await onAdd({
      title: t, category: '', size, status: 'scheduled', due_kind, due_date,
      semester_id: when === 'next' ? next!.id : activeSemester?.id || null, owner_id: null, is_shared: false, requested_by_id: null, created_by_id: me?.id || null,
      completed_by_id: null, completed_at: null, waiting_on: '', steps: [], notes: '', done_note: '', touched_at: null, touch_count: 0, link_path: '', parent_id: null, event_id: null, routine_job_id: null,
    })
    setBusy(false)
    if (e) { setErr(e); return }
    setTitle(''); setDay('')
  }

  return (
    <div className="border-t border-b border-rule-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} placeholder={ko ? '해야 할 일…' : 'Something that needs doing…'} className={`${field} flex-1 min-w-[200px] h-9`} aria-label={ko ? '제목' : 'Title'} />
        <div className="flex gap-1 flex-wrap items-center">
          {whens.map(([w, l]) => <button key={w} onClick={() => setWhen(w)} className={chip(when === w)}>{l}</button>)}
          <label className={`${chip(when === 'day')} relative inline-flex items-center gap-1 cursor-pointer`} title={ko ? '정확한 날짜' : 'An exact day'}>
            <Calendar size={12} />{when === 'day' && day ? day.slice(5).replace('-', '/') : ''}
            <input type="date" value={day} onChange={e => { setDay(e.target.value); if (e.target.value) setWhen('day') }} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" aria-label={ko ? '날짜' : 'Day'} />
          </label>
        </div>
        <span className="inline-flex gap-1" role="radiogroup" aria-label={ko ? '크기' : 'Size'}>
          {SIZES.map(z => <button key={z} onClick={() => setSize(z)} role="radio" aria-checked={size === z} title={SIZE_LABELS[z][ko ? 'ko' : 'en']} className={`h-7 px-2 rounded-full border ${size === z ? 'border-ink' : 'border-rule-2 opacity-60 hover:opacity-100'}`}><SizeMark size={z} ko={ko} word={size === z} className="text-[length:calc(11.5px*var(--ts))]" /></button>)}
        </span>
        <button onClick={save} disabled={!title.trim() || busy} className="h-8 px-3 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-40 inline-flex items-center gap-1"><Plus size={13} />{ko ? '추가' : 'Add'}</button>
      </div>
      {err && <p className="text-[length:calc(11.5px*var(--ts))] text-bad mt-1.5">{err}</p>}
    </div>
  )
}
