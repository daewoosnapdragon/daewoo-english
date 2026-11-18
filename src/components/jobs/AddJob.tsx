'use client'

import { useState } from 'react'
import { DUE_KINDS, DUE_KIND_LABELS, SIZES, SIZE_LABELS, dueDateFor, type DueKind, type JobDraft, type JobSize } from '@/lib/adminJobs'
import type { Semester, Teacher } from '@/types'
import { Plus } from 'lucide-react'

// ─── Add a job in one line ───────────────────────────────────────
// Title, then when (a day, the end of a month, the end of the semester, or
// when there is time), category, size and owner. Only the title is needed;
// Enter saves. Nothing is owned unless an owner is picked.

export const field = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink placeholder:text-ink-3'

export default function AddJob({ ko, teachers, categories, activeSemester, semesters, me, parentId, defaultCategory, onAdd, compact }: {
  ko: boolean; teachers: Teacher[]; categories: string[]; activeSemester: Semester | null; semesters: Semester[]; me: Teacher | null
  parentId?: string | null; defaultCategory?: string; onAdd: (d: JobDraft) => Promise<string | null>; compact?: boolean
}) {
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<DueKind>(parentId ? 'someday' : 'date')
  const [pick, setPick] = useState('')
  const [semId, setSemId] = useState(activeSemester?.id || '')
  const [category, setCategory] = useState(defaultCategory || '')
  const [size, setSize] = useState<JobSize>('S')
  const [owner, setOwner] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const sem = semesters.find(s => s.id === semId) || activeSemester
  const save = async () => {
    const t = title.trim(); if (!t || busy) return
    if (kind === 'semester' && !sem?.end_date) { setErr(ko ? '학기 종료일이 설정에 없습니다.' : 'The semester has no end date in Settings.'); return }
    if ((kind === 'date' || kind === 'month') && !pick) { setErr(ko ? '날짜를 고르세요.' : 'Pick a day.'); return }
    setBusy(true); setErr('')
    const e = await onAdd({
      title: t, category: category.trim(), size, status: 'scheduled', due_kind: kind, due_date: dueDateFor(kind, pick || null, sem?.end_date || null),
      semester_id: kind === 'semester' ? sem?.id || null : activeSemester?.id || null, owner_id: owner || null, requested_by_id: requestedBy || null, created_by_id: me?.id || null,
      completed_by_id: null, completed_at: null, waiting_on: '', steps: [], notes: '', link_path: '', parent_id: parentId || null, event_id: null, routine_job_id: null,
    })
    setBusy(false)
    if (e) { setErr(e); return }
    setTitle(''); setPick(''); setOwner(''); setRequestedBy('')
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') save() }

  return (
    <div className={compact ? '' : 'border-t border-b border-rule-2 py-3'}>
      <div className="flex flex-wrap items-center gap-2">
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={onKey} placeholder={parentId ? (ko ? '이 일의 한 부분…' : 'A part of this job…') : (ko ? '해야 할 일…' : 'Something that needs doing…')} className={`${field} flex-1 min-w-[220px]`} aria-label={ko ? '제목' : 'Title'} />
        <select value={kind} onChange={e => setKind(e.target.value as DueKind)} className={field} aria-label={ko ? '기한' : 'When'}>
          {DUE_KINDS.map(k => <option key={k} value={k}>{DUE_KIND_LABELS[k][ko ? 'ko' : 'en']}</option>)}
        </select>
        {(kind === 'date' || kind === 'month') && <input type={kind === 'month' ? 'month' : 'date'} value={kind === 'month' ? pick.slice(0, 7) : pick} onChange={e => setPick(kind === 'month' ? `${e.target.value}-01` : e.target.value)} onKeyDown={onKey} className={field} aria-label={ko ? '날짜' : 'Day'} />}
        {kind === 'semester' && semesters.length > 1 && <select value={semId} onChange={e => setSemId(e.target.value)} className={field}>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
        {!compact && <>
          <input list="job-categories" value={category} onChange={e => setCategory(e.target.value)} onKeyDown={onKey} placeholder={ko ? '분류' : 'Category'} className={`${field} w-[140px]`} />
          <datalist id="job-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </>}
        <select value={size} onChange={e => setSize(e.target.value as JobSize)} className={field} aria-label={ko ? '크기' : 'Size'} title={SIZE_LABELS[size][ko ? 'ko' : 'en']}>
          {SIZES.map(s => <option key={s} value={s}>{s} · {SIZE_LABELS[s][ko ? 'ko' : 'en']}</option>)}
        </select>
        <select value={owner} onChange={e => setOwner(e.target.value)} className={field} aria-label={ko ? '담당' : 'Owner'}>
          <option value="">{ko ? '담당 없음' : 'No owner yet'}</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {!compact && <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)} className={field} aria-label={ko ? '요청자' : 'Requested by'}>
          <option value="">{ko ? '요청자…' : 'Requested by…'}</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>}
        <button onClick={save} disabled={!title.trim() || busy} className="h-8 px-3 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-40 inline-flex items-center gap-1"><Plus size={13} />{ko ? '추가' : 'Add'}</button>
      </div>
      {err && <p className="text-[length:calc(11.5px*var(--ts))] text-bad mt-1.5">{err}</p>}
    </div>
  )
}
