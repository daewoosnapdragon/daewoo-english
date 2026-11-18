'use client'

import { useState } from 'react'
import { endOfMonth, thisFriday, type DueKind, type JobDraft } from '@/lib/adminJobs'
import type { Semester, Teacher } from '@/types'
import { Plus } from 'lucide-react'

// ─── Add a job in one line ───────────────────────────────────────
// A title and when: today, this week, a day you pick, the end of the
// month, the end of the semester, or whenever. Enter adds it with no
// owner; everything else is set on the card.

export const field = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink placeholder:text-ink-3'
const chip = (on: boolean) => `h-7 px-2.5 rounded-full border text-[length:calc(11.5px*var(--ts))] whitespace-nowrap ${on ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-3 hover:text-ink'}`

type When = 'today' | 'week' | 'day' | 'month' | 'semester' | 'someday'

export default function AddJob({ ko, today, activeSemester, me, parentId, defaultCategory, onAdd, compact }: {
  ko: boolean; today: string; activeSemester: Semester | null; me: Teacher | null
  parentId?: string | null; defaultCategory?: string; onAdd: (d: JobDraft) => Promise<string | null>; compact?: boolean
}) {
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState<When>(parentId ? 'someday' : 'week')
  const [day, setDay] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const whens: [When, string][] = [['today', ko ? '오늘' : 'Today'], ['week', ko ? '이번 주' : 'This week'], ['day', ko ? '날짜' : 'A day'], ['month', ko ? '월말' : 'End of month'], ['semester', ko ? '학기말' : 'End of semester'], ['someday', ko ? '언제든' : 'Whenever']]

  const save = async () => {
    const t = title.trim(); if (!t || busy) return
    let due_kind: DueKind = 'date', due_date: string | null = null
    if (when === 'today') due_date = today
    else if (when === 'week') due_date = thisFriday(today)
    else if (when === 'day') { if (!day) { setErr(ko ? '날짜를 고르세요.' : 'Pick a day.'); return } due_date = day }
    else if (when === 'month') { due_kind = 'month'; due_date = endOfMonth(today) }
    else if (when === 'semester') { if (!activeSemester?.end_date) { setErr(ko ? '학기 종료일이 설정에 없습니다.' : 'The semester has no end date in Settings.'); return } due_kind = 'semester'; due_date = activeSemester.end_date }
    else { due_kind = 'someday' }
    setBusy(true); setErr('')
    const e = await onAdd({
      title: t, category: defaultCategory || '', size: 'S', status: 'scheduled', due_kind, due_date,
      semester_id: activeSemester?.id || null, owner_id: null, requested_by_id: null, created_by_id: me?.id || null,
      completed_by_id: null, completed_at: null, waiting_on: '', steps: [], notes: '', link_path: '', parent_id: parentId || null, event_id: null, routine_job_id: null,
    })
    setBusy(false)
    if (e) { setErr(e); return }
    setTitle(''); setDay('')
  }

  return (
    <div className={compact ? '' : 'border-t border-b border-rule-2 py-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} placeholder={parentId ? (ko ? '이 일의 한 부분…' : 'A part of this job…') : (ko ? '해야 할 일…' : 'Something that needs doing…')} className={`${field} flex-1 min-w-[200px] ${compact ? '' : 'h-9'}`} aria-label={ko ? '제목' : 'Title'} />
        <div className="flex gap-1 flex-wrap">{whens.map(([w, l]) => <button key={w} onClick={() => setWhen(w)} className={chip(when === w)}>{l}</button>)}</div>
        {when === 'day' && <input type="date" value={day} onChange={e => setDay(e.target.value)} className={field} aria-label={ko ? '날짜' : 'Day'} />}
        <button onClick={save} disabled={!title.trim() || busy} className="h-8 px-3 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-40 inline-flex items-center gap-1"><Plus size={13} />{ko ? '추가' : 'Add'}</button>
      </div>
      {err && <p className="text-[length:calc(11.5px*var(--ts))] text-bad mt-1.5">{err}</p>}
    </div>
  )
}
