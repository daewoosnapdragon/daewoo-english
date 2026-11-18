'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { ANCHOR_LABELS, SIZES, SIZE_LABELS, anchorDate, offsetLabel, fmtDay, type AdminEvent, type AdminRoutine, type AdminRoutineJob, type JobSize, type RoutineAnchor } from '@/lib/adminJobs'
import { createEvent, deleteEvent, deleteRoutine, saveRoutine, saveRoutineJob, deleteRoutineJob } from '@/lib/adminJobsData'
import { field } from './AddJob'
import type { Semester, Teacher } from '@/types'
import { Plus, Trash2, X } from 'lucide-react'

// ─── Routines: the yearly templates ──────────────────────────────
// A routine is an event (report cards) with jobs at offsets from its date,
// each with a default owner, a size and its steps. "Set the date" for a
// term makes every job at once. The dates already set are listed under it.

export default function RoutinesPanel({ ko, routines, template, events, teachers, semesters, activeSemester, categories, me, nameOf, reload }: {
  ko: boolean; routines: AdminRoutine[]; template: AdminRoutineJob[]; events: AdminEvent[]; teachers: Teacher[]; semesters: Semester[]; activeSemester: Semester | null
  categories: string[]; me: Teacher | null; nameOf: (id: string | null | undefined) => string; reload: () => Promise<void>
}) {
  const { showToast, confirmDialog } = useApp()
  const who = me ? { id: me.id, name: me.name } : null
  const [open, setOpen] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const act = async (p: Promise<string | null>) => { const e = await p; if (e) showToast(`Error: ${e}`); await reload() }
  const add = async () => { if (!newName.trim()) return; const r = await saveRoutine({ name: newName, sort_order: routines.length }, who); if (r.error) showToast(`Error: ${r.error}`); else { setNewName(''); setOpen(r.routine?.id || null); await reload() } }

  return (
    <div className="grid gap-4">
      <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '매년 반복되는 일. 날짜를 한 번 정하면 그 일의 모든 단계가 한꺼번에 만들어집니다.' : 'The work that comes round every year. Set the event date once for a term and every job appears, dated from it.'}</p>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder={ko ? '새 루틴 이름 (예: 성적표)' : 'New routine, e.g. Report cards'} className={`${field} flex-1 max-w-[360px]`} />
        <button onClick={add} disabled={!newName.trim()} className="h-8 px-3 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold disabled:opacity-40 inline-flex items-center gap-1"><Plus size={13} />{ko ? '추가' : 'Add'}</button>
      </div>
      <div className="border-t border-rule-2 divide-y divide-rule">
        {routines.map(r => (
          <div key={r.id} className="py-2">
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="w-full flex items-baseline justify-between gap-3 text-left">
              <span className="font-display text-[length:calc(18px*var(--ts))] text-ink">{r.name}</span>
              <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{r.category || '—'} · {template.filter(t => t.routine_id === r.id).length} {ko ? '개 일' : 'jobs'} · {ANCHOR_LABELS[r.anchor][ko ? 'ko' : 'en']}</span>
            </button>
            {open === r.id && <RoutineEditor ko={ko} r={r} template={template.filter(t => t.routine_id === r.id)} events={events.filter(e => e.routine_id === r.id)} teachers={teachers} semesters={semesters} activeSemester={activeSemester} categories={categories} nameOf={nameOf} who={who} act={act} reload={reload}
              onDelete={async () => { const ok = await confirmDialog({ title: ko ? '이 루틴을 지울까요?' : 'Delete this routine?', message: ko ? '템플릿과 날짜 기록이 지워집니다. 이미 만들어진 일은 남습니다.' : 'Its template and dates go; jobs already made stay.', confirmLabel: ko ? '삭제' : 'Delete', danger: true }); if (ok) { await act(deleteRoutine(r)); setOpen(null) } }} />}
          </div>
        ))}
        {routines.length === 0 && <p className="py-3 text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '아직 루틴이 없습니다.' : 'No routines yet.'}</p>}
      </div>
    </div>
  )
}

function RoutineEditor({ ko, r, template, events, teachers, semesters, activeSemester, categories, nameOf, who, act, reload, onDelete }: {
  ko: boolean; r: AdminRoutine; template: AdminRoutineJob[]; events: AdminEvent[]; teachers: Teacher[]; semesters: Semester[]; activeSemester: Semester | null; categories: string[]
  nameOf: (id: string | null | undefined) => string; who: { id: string; name: string } | null; act: (p: Promise<string | null>) => Promise<void>; reload: () => Promise<void>; onDelete: () => void
}) {
  const { showToast } = useApp()
  const [name, setName] = useState(r.name)
  const [category, setCategory] = useState(r.category)
  const [anchor, setAnchor] = useState<RoutineAnchor>(r.anchor)
  const [notes, setNotes] = useState(r.notes)
  const [semId, setSemId] = useState(activeSemester?.id || semesters[0]?.id || '')
  const [date, setDate] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const sem = semesters.find(s => s.id === semId) || null
  const suggested = anchorDate(anchor, sem)
  const eventDate = anchor === 'date' ? date : (date || suggested || '')
  const saveMeta = (over: Partial<AdminRoutine> = {}) => act(saveRoutine({ id: r.id, name, category, anchor, notes, sort_order: r.sort_order, ...over }, who).then(x => x.error))
  const setTheDate = async () => {
    if (!eventDate) return
    setBusy(true)
    const res = await createEvent({ ...r, name, category, anchor }, template, eventDate, sem?.id || null, label || sem?.name || '', who)
    setBusy(false)
    if (res.error) showToast(`Error: ${res.error}`); else { showToast(ko ? `${res.made}개 일이 만들어졌습니다` : `${res.made} jobs made`); setDate(''); setLabel(''); await reload() }
  }
  const small = 'text-[length:calc(11.5px*var(--ts))]'
  return (
    <div className="mt-3 grid gap-5">
      <div className="grid gap-3 md:grid-cols-[1fr_160px_220px] items-end">
        <div><p className="eyebrow mb-1">{ko ? '이름' : 'Name'}</p><input value={name} onChange={e => setName(e.target.value)} onBlur={() => saveMeta()} className={`${field} w-full`} /></div>
        <div><p className="eyebrow mb-1">{ko ? '분류' : 'Category'}</p><input list="job-categories" value={category} onChange={e => setCategory(e.target.value)} onBlur={() => saveMeta()} className={`${field} w-full`} /><datalist id="job-categories">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
        <div><p className="eyebrow mb-1">{ko ? '기준 날짜' : 'The date comes from'}</p><select value={anchor} onChange={e => { const a = e.target.value as RoutineAnchor; setAnchor(a); saveMeta({ anchor: a }) }} className={`${field} w-full`}>{(Object.keys(ANCHOR_LABELS) as RoutineAnchor[]).map(a => <option key={a} value={a}>{ANCHOR_LABELS[a][ko ? 'ko' : 'en']}</option>)}</select></div>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveMeta()} rows={2} placeholder={ko ? '메모' : 'Notes about this routine'} className="w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12px*var(--ts))] text-ink resize-y" />

      {/* Template */}
      <div>
        <p className="eyebrow mb-1.5">{ko ? '일 (기준일로부터)' : 'Jobs, by offset from the event'}</p>
        <div className="grid gap-2">
          {[...template].sort((a, b) => a.offset_days - b.offset_days || a.sort_order - b.sort_order).map(t => <TemplateRow key={t.id} t={t} ko={ko} teachers={teachers} act={act} />)}
          <TemplateRow key={`new-${template.length}`} t={{ id: '', routine_id: r.id, title: '', offset_days: -7, default_owner_id: null, size: 'S', steps: [], link_path: '', sort_order: template.length }} ko={ko} teachers={teachers} act={act} isNew />
        </div>
      </div>

      {/* Set the date */}
      <div className="border-t border-rule pt-3">
        <p className="eyebrow mb-1.5">{ko ? '이번 학기 날짜 정하기' : 'Set the date for a term'}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={semId} onChange={e => setSemId(e.target.value)} className={field}>{semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input type="date" value={eventDate} onChange={e => setDate(e.target.value)} className={field} />
          {anchor !== 'date' && <span className={`${small} text-ink-3`}>{suggested ? (ko ? `설정의 ${ANCHOR_LABELS[anchor].ko}: ${fmtDay(suggested, ko)}` : `${ANCHOR_LABELS[anchor].en} in Settings: ${fmtDay(suggested, ko)}`) : (ko ? '설정에 그 날짜가 없습니다' : 'That date is not set in Settings')}</span>}
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={sem?.name || (ko ? '이름' : 'Label')} className={`${field} w-[150px]`} />
          <button onClick={setTheDate} disabled={!eventDate || busy || template.length === 0} className="h-8 px-3 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold disabled:opacity-40">{ko ? `일 ${template.length}개 만들기` : `Make the ${template.length} jobs`}</button>
        </div>
        {events.length > 0 && (
          <ul className={`mt-2 divide-y divide-rule border-t border-rule ${small}`}>
            {events.map(e => <li key={e.id} className="py-1 flex items-center justify-between gap-2 text-ink-2"><span>{e.label || '—'} · {fmtDay(e.event_date, ko)} <span className="text-ink-3">· {nameOf(e.created_by_id)}</span></span>
              <button onClick={() => act(deleteEvent(e, r.name))} className="text-ink-3 hover:text-bad inline-flex items-center gap-1" title={ko ? '이 날짜와 미완료 일 삭제' : 'Remove this date and its unfinished jobs'}><X size={12} /></button></li>)}
          </ul>
        )}
      </div>
      <div className="flex justify-end"><button onClick={onDelete} className={`${small} text-ink-3 hover:text-bad inline-flex items-center gap-1`}><Trash2 size={12} />{ko ? '루틴 삭제' : 'Delete routine'}</button></div>
    </div>
  )
}

function TemplateRow({ t, ko, teachers, act, isNew }: { t: AdminRoutineJob; ko: boolean; teachers: Teacher[]; act: (p: Promise<string | null>) => Promise<void>; isNew?: boolean }) {
  const [d, setD] = useState(t)
  const [steps, setSteps] = useState(t.steps.map(s => s.text).join('\n'))
  const [openSteps, setOpenSteps] = useState(false)
  const dirty = JSON.stringify({ ...d, steps: steps.split('\n').map(s => s.trim()).filter(Boolean) }) !== JSON.stringify({ ...t, steps: t.steps.map(s => s.text) })
  const save = async () => {
    if (!d.title.trim()) return
    await act(saveRoutineJob({ ...d, id: t.id || undefined, steps: steps.split('\n').map(s => s.trim()).filter(Boolean).map(text => ({ text })) }).then(x => x.error))
    if (isNew) { setD({ ...t, title: '' }); setSteps('') }
  }
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)_130px_90px_auto] gap-2 items-start">
      <div className="flex items-center gap-1">
        <input type="number" value={d.offset_days} onChange={e => setD({ ...d, offset_days: Number(e.target.value) })} className={`${field} w-[64px] tabular-nums`} aria-label="Offset days" />
        <span className="text-[length:calc(10.5px*var(--ts))] text-ink-3 leading-tight">{offsetLabel(d.offset_days, ko)}</span>
      </div>
      <div>
        <input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') save() }} placeholder={isNew ? (ko ? '새 일…' : 'Add a job to the template…') : ''} className={`${field} w-full`} />
        {(openSteps || steps) && <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={Math.max(2, steps.split('\n').length)} placeholder={ko ? '단계, 한 줄에 하나' : 'Steps, one per line'} className="mt-1 w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(11.5px*var(--ts))] text-ink leading-snug resize-y" />}
        {!openSteps && !steps && <button onClick={() => setOpenSteps(true)} className="text-[length:calc(10.5px*var(--ts))] text-ink-3 hover:text-ink mt-0.5">{ko ? '+ 단계' : '+ steps'}</button>}
      </div>
      <select value={d.default_owner_id || ''} onChange={e => setD({ ...d, default_owner_id: e.target.value || null })} className={`${field} w-full`}><option value="">{ko ? '담당 없음' : 'No owner'}</option>{teachers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <select value={d.size} onChange={e => setD({ ...d, size: e.target.value as JobSize })} className={`${field} w-full`} title={SIZE_LABELS[d.size][ko ? 'ko' : 'en']}>{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      <span className="flex items-center gap-1 h-8">
        {(dirty || isNew) && <button onClick={save} disabled={!d.title.trim()} className="h-7 px-2 rounded bg-accent text-white text-[length:calc(11px*var(--ts))] font-semibold disabled:opacity-40">{isNew ? (ko ? '추가' : 'Add') : (ko ? '저장' : 'Save')}</button>}
        {!isNew && <button onClick={() => act(deleteRoutineJob(t.id))} className="w-7 h-7 rounded text-ink-3 hover:text-bad flex items-center justify-center" aria-label="Remove"><X size={12} /></button>}
      </span>
    </div>
  )
}
