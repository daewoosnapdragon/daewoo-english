'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { SIZE_LABELS, SIZES, dueLabel, notStarted, progress, urgency, fmtDay, type AdminJob, type AdminJobHistory, type AdminJobQuestion, type JobDraft, type JobSize, type JobStatus } from '@/lib/adminJobs'
import { addJob, addStep, answerQuestion, askQuestion, assignJob, deleteJob, fetchHistory, fetchQuestions, saveSteps, setStatus, toggleStep, updateJob } from '@/lib/adminJobsData'
import StatusTag from './StatusTag'
import AddJob, { field } from './AddJob'
import type { Semester, Teacher } from '@/types'
import { ChevronDown, ChevronRight, HelpCircle, Link as LinkIcon, Trash2, X } from 'lucide-react'

// ─── One job on the list ─────────────────────────────────────────
// Closed: status, title, due, category, size, owner, steps done. Open: the
// steps as a checklist, the parts (child jobs), the notes and link, who
// asked for it and who did it, the Stuck questions, and the history.

export interface RowCtx {
  ko: boolean; today: string; me: Teacher | null; teachers: Teacher[]; categories: string[]; semesters: Semester[]; activeSemester: Semester | null
  nameOf: (id: string | null | undefined) => string; semesterName: (id: string | null | undefined) => string | null
  childrenOf: Record<string, AdminJob[]>; openQuestions: AdminJobQuestion[]; reload: () => Promise<void>
}

const urgencyTone = (u: string) => u === 'overdue' ? 'text-bad' : u === 'today' ? 'text-accent' : u === 'week' ? 'text-ink' : 'text-ink-3'

export default function JobRow({ job, ctx, depth = 0, startOpen = false }: { job: AdminJob; ctx: RowCtx; depth?: number; startOpen?: boolean }) {
  const { ko, today, me, nameOf } = ctx
  const { showToast } = useApp()
  const [open, setOpen] = useState(startOpen)
  const kids = ctx.childrenOf[job.id] || []
  const prog = progress(job)
  const kidsDone = kids.filter(k => k.status === 'done').length
  const u = urgency(job, today)
  const stalled = notStarted(job, today)
  const asked = ctx.openQuestions.filter(q => q.job_id === job.id).length
  const who = me ? { id: me.id, name: me.name } : null
  const act = async (p: Promise<string | null>) => { const e = await p; if (e) showToast(`Error: ${e}`); await ctx.reload() }

  return (
    <div className={depth ? 'ml-6 border-l border-rule pl-3' : ''}>
      <div className={`grid grid-cols-[22px_auto_minmax(0,1fr)_auto] md:grid-cols-[22px_auto_minmax(0,1fr)_130px_110px_60px_120px] gap-x-3 items-center py-1.5 ${job.status === 'done' ? 'opacity-60' : ''}`}>
        <button onClick={() => setOpen(o => !o)} className="w-[22px] h-6 flex items-center justify-center text-ink-3 hover:text-ink" aria-label={open ? 'Close' : 'Open'}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
        <StatusTag status={job.status} waitingOn={job.waiting_on} ko={ko} small onChange={(s, w) => act(setStatus(job, s, who, w))} />
        <button onClick={() => setOpen(o => !o)} className="text-left min-w-0">
          <span className={`block truncate text-[length:calc(13px*var(--ts))] ${job.status === 'done' ? 'line-through text-ink-3' : 'text-ink'}`}>{job.title}</span>
          <span className="block text-[length:calc(10.5px*var(--ts))] text-ink-3 truncate md:hidden">{dueLabel(job, today, ko, ctx.semesterName(job.semester_id))}{job.category ? ` · ${job.category}` : ''}</span>
        </button>
        <span className={`hidden md:block text-[length:calc(11.5px*var(--ts))] tabular-nums truncate ${urgencyTone(u)}`} title={job.due_date || undefined}>
          {dueLabel(job, today, ko, ctx.semesterName(job.semester_id))}{stalled && <span className="block text-[length:calc(10px*var(--ts))] text-warn">{ko ? '아직 시작 안 함' : 'Not started'}</span>}
        </span>
        <span className="hidden md:block text-[length:calc(11.5px*var(--ts))] text-ink-3 truncate">{job.category || '—'}</span>
        <span className="hidden md:block text-[length:calc(11.5px*var(--ts))] text-ink-3 tabular-nums" title={SIZE_LABELS[job.size][ko ? 'ko' : 'en']}>{job.size}{prog ? ` · ${prog.done}/${prog.total}` : kids.length ? ` · ${kidsDone}/${kids.length}` : ''}{asked ? <HelpCircle size={11} className="inline ml-1 text-warn" /> : null}</span>
        <span className="hidden md:block text-[length:calc(11.5px*var(--ts))] truncate text-right">
          <span className={job.owner_id ? (job.owner_id === me?.id ? 'text-ink font-semibold' : 'text-ink-2') : 'text-warn'}>{job.owner_id ? nameOf(job.owner_id) : (ko ? '담당 없음' : 'No owner')}</span>
        </span>
      </div>
      {open && <JobDetail job={job} ctx={ctx} kids={kids} onAct={act} />}
      {open && kids.map(k => <JobRow key={k.id} job={k} ctx={ctx} depth={depth + 1} />)}
    </div>
  )
}

function JobDetail({ job, ctx, kids, onAct }: { job: AdminJob; ctx: RowCtx; kids: AdminJob[]; onAct: (p: Promise<string | null>) => Promise<void> }) {
  const { ko, me, teachers, nameOf } = ctx
  const { showToast, confirmDialog } = useApp()
  const who = me ? { id: me.id, name: me.name } : null
  const [step, setStep] = useState('')
  const [notes, setNotes] = useState(job.notes)
  const [link, setLink] = useState(job.link_path)
  const [title, setTitle] = useState(job.title)
  const [question, setQuestion] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [questions, setQuestions] = useState<AdminJobQuestion[]>([])
  const [hist, setHist] = useState<AdminJobHistory[]>([])
  const [showHist, setShowHist] = useState(false)
  useEffect(() => { fetchQuestions(job.id).then(setQuestions) }, [job.id, job.updated_at])
  useEffect(() => { if (showHist) fetchHistory(job.id).then(setHist) }, [showHist, job.id, job.updated_at])
  useEffect(() => { setNotes(job.notes); setLink(job.link_path); setTitle(job.title) }, [job.notes, job.link_path, job.title])

  const label = 'eyebrow mb-1'
  const small = 'text-[length:calc(11.5px*var(--ts))]'
  const fmtAt = (iso: string) => new Date(iso).toLocaleString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const saveField = (patch: Partial<AdminJob>) => { if (Object.entries(patch).some(([k, v]) => (job as any)[k] !== v)) onAct(updateJob(job, patch, who)) }
  const addChild = async (d: JobDraft) => { const r = await addJob({ ...d, parent_id: job.id, category: d.category || job.category }, who); if (!r.error) await ctx.reload(); return r.error }
  const remove = async () => {
    const ok = await confirmDialog({ title: ko ? '이 일을 지울까요?' : 'Delete this job?', message: `${job.title}${kids.length ? (ko ? ` · 하위 ${kids.length}개도 함께` : ` · and its ${kids.length} parts`) : ''}`, confirmLabel: ko ? '삭제' : 'Delete', danger: true })
    if (ok) onAct(deleteJob(job, who))
  }
  const removeStep = (id: string) => onAct(saveSteps(job, job.steps.filter(s => s.id !== id), who, 'removed a step'))

  return (
    <div className="ml-[34px] mb-3 mt-1 grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] border-t border-rule pt-3">
      <div className="grid gap-4">
        <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && saveField({ title: title.trim() })} className={`${field} w-full font-medium`} aria-label={ko ? '제목' : 'Title'} />
        {/* Steps */}
        <div>
          <p className={label}>{ko ? '단계' : 'Steps'}{job.steps.length ? ` · ${job.steps.filter(s => s.done).length}/${job.steps.length}` : ''}</p>
          <ul className="divide-y divide-rule border-t border-b border-rule">
            {job.steps.map(s => (
              <li key={s.id} className="flex items-start gap-2 py-1.5 group">
                <input type="checkbox" checked={s.done} onChange={() => onAct(toggleStep(job, s.id, who))} className="mt-0.5 rounded border-rule-2" aria-label={s.text} />
                <span className={`flex-1 ${small} leading-snug ${s.done ? 'line-through text-ink-3' : 'text-ink'}`}>{s.text}{s.done && s.done_by_id ? <span className="text-ink-3"> · {nameOf(s.done_by_id)}{s.done_at ? `, ${fmtAt(s.done_at)}` : ''}</span> : null}</span>
                <button onClick={() => removeStep(s.id)} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-bad" aria-label="Remove step"><X size={12} /></button>
              </li>
            ))}
            {job.steps.length === 0 && <li className={`py-1.5 ${small} text-ink-3`}>{ko ? '아직 단계가 없습니다. 아래에 어떻게 하는지 적어 두세요.' : 'No steps yet. Write down how it is done, one line at a time.'}</li>}
          </ul>
          <div className="flex gap-2 mt-2">
            <input value={step} onChange={e => setStep(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && step.trim()) { onAct(addStep(job, step, who)); setStep('') } }} placeholder={ko ? '단계 추가…' : 'Add a step…'} className={`${field} flex-1`} />
            <button onClick={() => { if (step.trim()) { onAct(addStep(job, step, who)); setStep('') } }} disabled={!step.trim()} className="h-8 px-2.5 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] text-ink-2 hover:text-ink disabled:opacity-40">{ko ? '추가' : 'Add'}</button>
          </div>
        </div>
        {/* Parts */}
        <div>
          <p className={label}>{ko ? '부분 (하위 일)' : 'Parts of this job'}{kids.length ? ` · ${kids.filter(k => k.status === 'done').length}/${kids.length}` : ''}</p>
          <AddJob ko={ko} teachers={teachers} categories={ctx.categories} activeSemester={ctx.activeSemester} semesters={ctx.semesters} me={me} parentId={job.id} defaultCategory={job.category} onAdd={addChild} compact />
        </div>
        {/* Stuck */}
        <div>
          <p className={label}>{ko ? '막혔어요' : 'Stuck'}</p>
          {questions.map(q => (
            <div key={q.id} className={`${small} py-1.5 border-b border-rule`}>
              <p className="text-ink"><span className="text-ink-3">{nameOf(q.asked_by_id)} · {fmtAt(q.created_at)}:</span> {q.question}</p>
              {q.answer ? <p className="text-ink-2 mt-0.5 pl-3 border-l-2 border-rule-2">{q.answer} <span className="text-ink-3">· {nameOf(q.answered_by_id)}</span></p> : (
                <div className="flex gap-2 mt-1">
                  <input value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && (answers[q.id] || '').trim()) onAct(answerQuestion(job, q, answers[q.id], who)) }} placeholder={ko ? '답을 적으면 단계에 추가됩니다' : 'Answer; it becomes a step on this job'} className={`${field} flex-1`} />
                  <button onClick={() => (answers[q.id] || '').trim() && onAct(answerQuestion(job, q, answers[q.id], who))} className="h-8 px-2.5 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] text-ink-2 hover:text-ink">{ko ? '답하기' : 'Answer'}</button>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && question.trim()) { onAct(askQuestion(job, question, who)); setQuestion('') } }} placeholder={ko ? '무엇이 막혔나요?' : 'What is unclear?'} className={`${field} flex-1`} />
            <button onClick={() => { if (question.trim()) { onAct(askQuestion(job, question, who)); setQuestion('') } }} disabled={!question.trim()} className="h-8 px-2.5 rounded border border-warn text-[length:calc(12px*var(--ts))] text-warn hover:bg-paper-2 disabled:opacity-40 inline-flex items-center gap-1"><HelpCircle size={12} />{ko ? '질문' : 'Ask'}</button>
          </div>
        </div>
      </div>
      <div className="grid gap-3 content-start">
        <div className="grid grid-cols-2 gap-3">
          <div><p className={label}>{ko ? '담당' : 'Owner'}</p>
            <select value={job.owner_id || ''} onChange={e => onAct(assignJob(job, e.target.value || null, who))} className={`${field} w-full`}><option value="">{ko ? '담당 없음' : 'No owner'}</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><p className={label}>{ko ? '요청자' : 'Requested by'}</p>
            <select value={job.requested_by_id || ''} onChange={e => saveField({ requested_by_id: e.target.value || null })} className={`${field} w-full`}><option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          <div><p className={label}>{ko ? '크기' : 'Size'}</p>
            <select value={job.size} onChange={e => saveField({ size: e.target.value as JobSize })} className={`${field} w-full`}>{SIZES.map(s => <option key={s} value={s}>{s} · {SIZE_LABELS[s][ko ? 'ko' : 'en']}</option>)}</select></div>
          <div><p className={label}>{ko ? '분류' : 'Category'}</p>
            <input list="job-categories" defaultValue={job.category} onBlur={e => saveField({ category: e.target.value.trim() })} className={`${field} w-full`} /></div>
          <div><p className={label}>{ko ? '기한' : 'Due'}</p>
            {job.due_kind === 'date' || job.due_kind === 'month'
              ? <input type="date" value={job.due_date || ''} onChange={e => e.target.value && saveField({ due_date: e.target.value, due_kind: 'date' })} className={`${field} w-full`} />
              : <p className={`${small} text-ink-2 h-8 flex items-center`}>{dueLabel(job, ctx.today, ko, ctx.semesterName(job.semester_id))}</p>}
          </div>
          <div><p className={label}>{ko ? '상태' : 'Status'}</p><div className="h-8 flex items-center"><StatusTag status={job.status} waitingOn={job.waiting_on} ko={ko} onChange={(s: JobStatus, w) => onAct(setStatus(job, s, who, w))} /></div></div>
        </div>
        <div><p className={label}>{ko ? '메모' : 'Notes'}</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField({ notes })} rows={3} className="w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12px*var(--ts))] text-ink leading-snug resize-y" /></div>
        <div><p className={label}>{ko ? '앱 내 위치' : 'Where in the app'}</p>
          <div className="flex gap-2 items-center">
            <input value={link} onChange={e => setLink(e.target.value)} onBlur={() => saveField({ link_path: link.trim() })} placeholder="/reports" className={`${field} flex-1`} />
            {job.link_path && <Link href={job.link_path} className="text-accent hover:underline inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))]"><LinkIcon size={12} />{ko ? '열기' : 'Open'}</Link>}
          </div></div>
        <p className={`${small} text-ink-3 leading-relaxed`}>
          {ko ? '만든 사람' : 'Created by'} {nameOf(job.created_by_id)}{job.created_at ? ` · ${fmtAt(job.created_at)}` : ''}
          {job.status === 'done' && <><br />{ko ? '완료' : 'Done by'} {nameOf(job.completed_by_id)}{job.completed_at ? ` · ${fmtAt(job.completed_at)}` : ''}</>}
          {job.due_date && job.due_kind !== 'date' && <><br />{ko ? '기준일' : 'Counts to'} {fmtDay(job.due_date, ko)}</>}
        </p>
        <div className="flex items-center justify-between">
          <button onClick={() => setShowHist(h => !h)} className={`${small} text-ink-3 hover:text-ink`}>{showHist ? (ko ? '기록 닫기' : 'Hide history') : (ko ? '기록 보기' : 'History')}</button>
          <button onClick={remove} className={`${small} text-ink-3 hover:text-bad inline-flex items-center gap-1`}><Trash2 size={12} />{ko ? '삭제' : 'Delete'}</button>
        </div>
        {showHist && (
          <ul className={`${small} divide-y divide-rule border-t border-rule`}>
            {hist.map(h => <li key={h.id} className="py-1 text-ink-2"><span className="text-ink-3 tabular-nums">{fmtAt(h.at)}</span> · {nameOf(h.by_id)} · {h.action}{h.action === 'assigned' || h.action === 'reassigned' ? ` ${h.from_id ? nameOf(h.from_id) + ' → ' : '→ '}${h.to_id ? nameOf(h.to_id) : (ko ? '담당 없음' : 'no owner')}` : ''}{h.note ? ` · ${h.note}` : ''}</li>)}
            {hist.length === 0 && <li className="py-1 text-ink-3">—</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
