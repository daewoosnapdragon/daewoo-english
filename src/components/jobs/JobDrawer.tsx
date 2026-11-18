'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { SIZE_LABELS, SIZES, dueLabel, fmtDay, type AdminJob, type AdminJobHistory, type AdminJobQuestion, type JobDraft, type JobSize } from '@/lib/adminJobs'
import { addJob, addSteps, answerQuestion, askQuestion, assignJob, deleteJob, fetchHistory, fetchQuestions, saveSteps, setStatus, toggleStep, updateJob } from '@/lib/adminJobsData'
import StatusTag from './StatusTag'
import AddJob, { field } from './AddJob'
import type { Semester, Teacher } from '@/types'
import { Link as LinkIcon, Trash2, X } from 'lucide-react'

// ─── A job, opened ───────────────────────────────────────────────
// Slides in from the right. Who owns it (one tap), the steps as a
// checklist with a box that takes one line or a whole pasted list, the
// parts, a question box, and the details. Done and Hand over at the end.

export interface DrawerCtx {
  ko: boolean; today: string; me: Teacher | null; teachers: Teacher[]; accounts: Teacher[]; categories: string[]; activeSemester: Semester | null
  nameOf: (id: string | null | undefined) => string; semesterName: (id: string | null | undefined) => string | null
  childrenOf: Record<string, AdminJob[]>; reload: () => Promise<void>
}

export default function JobDrawer({ job, ctx, onClose, onOpen }: { job: AdminJob; ctx: DrawerCtx; onClose: () => void; onOpen: (j: AdminJob) => void }) {
  const { ko, me, teachers, accounts, nameOf } = ctx
  const { showToast, confirmDialog } = useApp()
  const who = me ? { id: me.id, name: me.name } : null
  const kids = ctx.childrenOf[job.id] || []
  const [stepText, setStepText] = useState('')
  const [notes, setNotes] = useState(job.notes)
  const [link, setLink] = useState(job.link_path)
  const [title, setTitle] = useState(job.title)
  const [question, setQuestion] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [questions, setQuestions] = useState<AdminJobQuestion[]>([])
  const [hist, setHist] = useState<AdminJobHistory[]>([])
  const [showHist, setShowHist] = useState(false)
  const [showMore, setShowMore] = useState(false)
  useEffect(() => { fetchQuestions(job.id).then(setQuestions) }, [job.id, job.updated_at])
  useEffect(() => { if (showHist) fetchHistory(job.id).then(setHist) }, [showHist, job.id, job.updated_at])
  useEffect(() => { setNotes(job.notes); setLink(job.link_path); setTitle(job.title) }, [job.notes, job.link_path, job.title])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const act = async (p: Promise<string | null>) => { const e = await p; if (e) showToast(`Error: ${e}`); await ctx.reload() }
  const saveField = (patch: Partial<AdminJob>) => { if (Object.entries(patch).some(([k, v]) => (job as any)[k] !== v)) act(updateJob(job, patch, who)) }
  const addChild = async (d: JobDraft) => { const r = await addJob({ ...d, parent_id: job.id, category: d.category || job.category }, who); if (!r.error) await ctx.reload(); return r.error }
  const remove = async () => {
    const ok = await confirmDialog({ title: ko ? '이 일을 지울까요?' : 'Delete this job?', message: `${job.title}${kids.length ? (ko ? ` · 하위 ${kids.length}개도 함께` : ` · and its ${kids.length} parts`) : ''}`, confirmLabel: ko ? '삭제' : 'Delete', danger: true })
    if (ok) { await act(deleteJob(job, who)); onClose() }
  }
  const submitSteps = () => { if (stepText.trim()) { act(addSteps(job, stepText, who)); setStepText('') } }
  const other = accounts.find(a => a.id !== job.owner_id && a.id !== me?.id) || accounts.find(a => a.id !== job.owner_id)
  const fmtAt = (iso: string) => new Date(iso).toLocaleString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const label = 'eyebrow mb-1.5'
  const small = 'text-[length:calc(11.5px*var(--ts))]'
  const chip = (on: boolean) => `h-8 px-3 rounded-full border text-[length:calc(12.5px*var(--ts))] ${on ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-2 hover:text-ink'}`
  const stepsDone = job.steps.filter(s => s.done).length

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[560px] bg-paper border-l border-rule-2 overflow-y-auto px-6 py-5 grid gap-5 content-start" role="dialog" aria-label={job.title}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded text-ink-3 hover:text-ink hover:bg-paper-2 flex items-center justify-center" aria-label={ko ? '닫기' : 'Close'}><X size={16} /></button>

        <div className="pr-8">
          <p className="eyebrow mb-1">{job.category || (ko ? '분류 없음' : 'No category')} · {job.size} · <span>{dueLabel(job, ctx.today, ko, ctx.semesterName(job.semester_id))}</span></p>
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && saveField({ title: title.trim() })} className="w-full bg-transparent font-display text-[length:calc(26px*var(--ts))] leading-tight text-ink border-b border-transparent hover:border-rule-2 focus:border-rule-2 outline-none" aria-label={ko ? '제목' : 'Title'} />
        </div>

        {/* Owner */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${small} text-ink-3 mr-1`}>{ko ? '담당' : 'Owner'}</span>
          {accounts.map(a => <button key={a.id} onClick={() => act(assignJob(job, a.id, who))} className={chip(job.owner_id === a.id)}>{job.owner_id === a.id ? '✓ ' : ''}{a.name}</button>)}
          <button onClick={() => act(assignJob(job, null, who))} className={chip(!job.owner_id)}>{!job.owner_id ? '✓ ' : ''}{ko ? '아직 없음' : 'Nobody yet'}</button>
          <span className="ml-auto"><StatusTag status={job.status} waitingOn={job.waiting_on} ko={ko} onChange={(s, w) => act(setStatus(job, s, who, w))} /></span>
        </div>

        {/* Steps */}
        <div>
          <p className={label}>{ko ? '단계' : 'Steps'}{job.steps.length ? ` · ${stepsDone}/${job.steps.length}` : ''}</p>
          <ul className="border-t border-rule">
            {job.steps.map(s => (
              <li key={s.id} className="flex items-start gap-2.5 py-2 border-b border-rule group">
                <input type="checkbox" checked={s.done} onChange={() => act(toggleStep(job, s.id, who))} className="mt-1 rounded border-rule-2" aria-label={s.text} />
                <span className={`flex-1 text-[length:calc(13.5px*var(--ts))] leading-snug ${s.done ? 'line-through text-ink-3' : 'text-ink'}`}>{s.text}{s.done && s.done_by_id ? <span className={`${small} text-ink-3`}> · {nameOf(s.done_by_id)}</span> : null}</span>
                <button onClick={() => act(saveSteps(job, job.steps.filter(x => x.id !== s.id), who, 'removed a step'))} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-bad mt-1" aria-label={ko ? '단계 삭제' : 'Remove step'}><X size={12} /></button>
              </li>
            ))}
            {job.steps.length === 0 && <li className={`py-2 border-b border-rule ${small} text-ink-3`}>{ko ? '아직 단계가 없습니다.' : 'No steps yet.'}</li>}
          </ul>
          <textarea value={stepText} onChange={e => setStepText(e.target.value)} rows={stepText.includes('\n') ? Math.min(8, stepText.split('\n').length + 1) : 1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSteps() } }}
            placeholder={ko ? '단계 추가 (한 줄에 하나, 목록을 붙여 넣어도 됩니다)' : 'Add a step, or paste a list: one per line'} className="mt-2 w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink leading-snug resize-none" />
          <div className="flex items-center justify-between mt-1">
            <span className={`${small} text-ink-3`}>{ko ? 'Enter로 추가, Shift+Enter로 줄바꿈' : 'Enter adds. Shift+Enter for a new line.'}</span>
            {stepText.trim() && <button onClick={submitSteps} className="h-7 px-2.5 rounded bg-accent text-white text-[length:calc(11.5px*var(--ts))] font-semibold">{ko ? '추가' : 'Add'}</button>}
          </div>
        </div>

        {/* Parts */}
        <div>
          <p className={label}>{ko ? '부분' : 'Parts'}{kids.length ? ` · ${kids.filter(k => k.status === 'done').length}/${kids.length}` : ''}</p>
          {kids.length > 0 && (
            <ul className="border-t border-rule mb-2">
              {kids.map(k => (
                <li key={k.id} className="flex items-center gap-2.5 py-2 border-b border-rule">
                  <input type="checkbox" checked={k.status === 'done'} onChange={() => act(setStatus(k, k.status === 'done' ? 'scheduled' : 'done', who))} className="rounded border-rule-2" aria-label={k.title} />
                  <button onClick={() => onOpen(k)} className={`flex-1 text-left text-[length:calc(13.5px*var(--ts))] ${k.status === 'done' ? 'line-through text-ink-3' : 'text-ink hover:text-accent'}`}>{k.title}</button>
                  <span className={`${small} text-ink-3`}>{k.owner_id ? nameOf(k.owner_id) : (ko ? '담당 없음' : 'no owner')} · {dueLabel(k, ctx.today, ko, ctx.semesterName(k.semester_id))}</span>
                </li>
              ))}
            </ul>
          )}
          <AddJob ko={ko} today={ctx.today} activeSemester={ctx.activeSemester} me={me} parentId={job.id} defaultCategory={job.category} onAdd={addChild} compact />
        </div>

        {/* Stuck */}
        <div>
          <p className={label}>{ko ? '막혔어요' : 'Stuck?'}</p>
          {questions.map(q => (
            <div key={q.id} className={`${small} py-1.5 border-b border-rule`}>
              <p className="text-ink"><span className="text-ink-3">{nameOf(q.asked_by_id)}:</span> {q.question}</p>
              {q.answer ? <p className="text-ink-2 mt-0.5 pl-3 border-l-2 border-rule-2">{q.answer} <span className="text-ink-3">· {nameOf(q.answered_by_id)}</span></p> : (
                <div className="flex gap-2 mt-1">
                  <input value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && (answers[q.id] || '').trim()) act(answerQuestion(job, q, answers[q.id], who)) }} placeholder={ko ? '답을 적으면 단계에 추가됩니다' : 'Answer; it is added to the steps'} className={`${field} flex-1`} />
                  <button onClick={() => (answers[q.id] || '').trim() && act(answerQuestion(job, q, answers[q.id], who))} className="h-8 px-2.5 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] text-ink-2 hover:text-ink">{ko ? '답하기' : 'Answer'}</button>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-1.5">
            <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && question.trim()) { act(askQuestion(job, question, who)); setQuestion('') } }} placeholder={other ? (ko ? `${other.name}에게 물어보기…` : `Ask ${other.name}…`) : (ko ? '질문…' : 'Ask…')} className={`${field} flex-1`} />
            <button onClick={() => { if (question.trim()) { act(askQuestion(job, question, who)); setQuestion('') } }} disabled={!question.trim()} className="h-8 px-2.5 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] text-ink-2 hover:text-ink disabled:opacity-40">{ko ? '보내기' : 'Send'}</button>
          </div>
        </div>

        {/* Done / hand over */}
        <div className="flex flex-wrap gap-2 border-t border-rule-2 pt-4">
          <button onClick={() => act(setStatus(job, job.status === 'done' ? 'scheduled' : 'done', who))} className={`h-9 px-4 rounded text-[length:calc(13px*var(--ts))] font-semibold ${job.status === 'done' ? 'border border-rule-2 text-ink-2 hover:text-ink' : 'bg-accent text-white hover:bg-accent-hover'}`}>{job.status === 'done' ? (ko ? '다시 열기' : 'Reopen') : (ko ? '완료' : 'Done')}</button>
          {other && <button onClick={() => act(assignJob(job, other.id, who))} className="h-9 px-3 rounded border border-rule-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink">{ko ? `${other.name}에게 넘기기` : `Hand to ${other.name}`}</button>}
          <button onClick={() => setShowMore(m => !m)} className={`h-9 px-3 rounded text-[length:calc(12.5px*var(--ts))] text-ink-3 hover:text-ink ml-auto`}>{showMore ? (ko ? '간단히' : 'Less') : (ko ? '자세히' : 'Details')}</button>
        </div>

        {showMore && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className={label}>{ko ? '크기' : 'Size'}</p>
                <select value={job.size} onChange={e => saveField({ size: e.target.value as JobSize })} className={`${field} w-full`}>{SIZES.map(s => <option key={s} value={s}>{s} · {SIZE_LABELS[s][ko ? 'ko' : 'en']}</option>)}</select></div>
              <div><p className={label}>{ko ? '분류' : 'Category'}</p>
                <input list="job-categories" defaultValue={job.category} onBlur={e => saveField({ category: e.target.value.trim() })} className={`${field} w-full`} />
                <datalist id="job-categories">{ctx.categories.map(c => <option key={c} value={c} />)}</datalist></div>
              <div><p className={label}>{ko ? '기한' : 'Due'}</p>
                <input type="date" value={job.due_date || ''} onChange={e => saveField(e.target.value ? { due_date: e.target.value, due_kind: 'date' } : { due_date: null, due_kind: 'someday' })} className={`${field} w-full`} />
                {job.due_kind !== 'date' && job.due_date && <p className={`${small} text-ink-3 mt-1`}>{dueLabel(job, ctx.today, ko, ctx.semesterName(job.semester_id))} · {fmtDay(job.due_date, ko)}</p>}</div>
              <div><p className={label}>{ko ? '요청자' : 'Requested by'}</p>
                <select value={job.requested_by_id || ''} onChange={e => saveField({ requested_by_id: e.target.value || null })} className={`${field} w-full`}><option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
            <div><p className={label}>{ko ? '메모' : 'Notes'}</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField({ notes })} rows={3} className="w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink leading-snug resize-y" /></div>
            <div><p className={label}>{ko ? '앱 내 위치' : 'Where in the app'}</p>
              <div className="flex gap-2 items-center">
                <input value={link} onChange={e => setLink(e.target.value)} onBlur={() => saveField({ link_path: link.trim() })} placeholder="/reports" className={`${field} flex-1`} />
                {job.link_path && <Link href={job.link_path} className="text-accent hover:underline inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))]"><LinkIcon size={12} />{ko ? '열기' : 'Open'}</Link>}
              </div></div>
            <p className={`${small} text-ink-3 leading-relaxed`}>
              {ko ? '만든 사람' : 'Created by'} {nameOf(job.created_by_id)}{job.created_at ? ` · ${fmtAt(job.created_at)}` : ''}
              {job.status === 'done' && <><br />{ko ? '완료' : 'Done by'} {nameOf(job.completed_by_id)}{job.completed_at ? ` · ${fmtAt(job.completed_at)}` : ''}</>}
            </p>
            <div className="flex items-center justify-between">
              <button onClick={() => setShowHist(h => !h)} className={`${small} text-ink-3 hover:text-ink`}>{showHist ? (ko ? '기록 닫기' : 'Hide history') : (ko ? '기록' : 'History')}</button>
              <button onClick={remove} className={`${small} text-ink-3 hover:text-bad inline-flex items-center gap-1`}><Trash2 size={12} />{ko ? '삭제' : 'Delete'}</button>
            </div>
            {showHist && (
              <ul className={`${small} divide-y divide-rule border-t border-rule`}>
                {hist.map(h => <li key={h.id} className="py-1 text-ink-2"><span className="text-ink-3 tabular-nums">{fmtAt(h.at)}</span> · {nameOf(h.by_id)} · {h.action}{h.action === 'assigned' || h.action === 'reassigned' ? ` ${h.from_id ? nameOf(h.from_id) + ' → ' : '→ '}${h.to_id ? nameOf(h.to_id) : (ko ? '담당 없음' : 'no owner')}` : ''}{h.note ? ` · ${h.note}` : ''}</li>)}
                {hist.length === 0 && <li className="py-1 text-ink-3">—</li>}
              </ul>
            )}
          </div>
        )}
      </aside>
    </>
  )
}
