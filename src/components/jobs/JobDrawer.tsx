'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { type AdminJob, type AdminJobHistory, type AdminJobQuestion, type JobStep, SIZES, SIZE_LABELS, afterStepChange, daysSinceTouched, dueLabel, fmtDay, pace, percent } from '@/lib/adminJobs'
import { addSteps, answerQuestion, askQuestion, assignJob, deleteJob, fetchHistory, fetchQuestions, saveSteps, setStepDoing, setStepDue, setStepOwner, setStatus, stepsAfterTick, toggleStep, touchJob, updateJob } from '@/lib/adminJobsData'
import StatusTag from './StatusTag'
import SizeMark from './SizeMark'
import { field } from './AddJob'
import type { Semester, Teacher } from '@/types'
import { Calendar, Check, Link as LinkIcon, Play, Trash2, X } from 'lucide-react'
import Overlay from '@/components/ui/Overlay'

// ─── A job, opened ───────────────────────────────────────────────
// Slides in from the right. Who owns it (one tap), the steps as a
// checklist with a box that takes one line or a whole pasted list, a
// question box, and the details. A step can be given to the other person
// with a tap on their initial, so one job can be shared without becoming
// two. Done, Hand to and Delete at the end.

export interface DrawerCtx {
  ko: boolean; today: string; me: Teacher | null; teachers: Teacher[]; accounts: Teacher[]; categories: string[]; activeSemester: Semester | null
  nameOf: (id: string | null | undefined) => string; semesterName: (id: string | null | undefined) => string | null; semesterStart: (id: string | null | undefined) => string | null
  childrenOf: Record<string, AdminJob[]>; reload: () => Promise<void>
  /** Show a change at once, before the save lands. */
  patchJob: (id: string, patch: Partial<AdminJob> | ((j: AdminJob) => AdminJob)) => void
}

export default function JobDrawer({ job, ctx, fresh = false, onClose, onOpen }: { job: AdminJob; ctx: DrawerCtx; fresh?: boolean; onClose: () => void; onOpen: (j: AdminJob) => void }) {
  const { ko, me, teachers, accounts, nameOf } = ctx
  const { showToast, confirmDialog } = useApp()
  const who = me ? { id: me.id, name: me.name } : null
  const [stepText, setStepText] = useState('')
  const [notes, setNotes] = useState(job.notes)
  const [link, setLink] = useState(job.link_path)
  const [title, setTitle] = useState(job.title)
  const [question, setQuestion] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [questions, setQuestions] = useState<AdminJobQuestion[]>([])
  const [hist, setHist] = useState<AdminJobHistory[]>([])
  const [showHist, setShowHist] = useState(false)
  // A just-added job opens with its details showing, so nothing is skipped.
  const [showMore, setShowMore] = useState(fresh)
  const [finishing, setFinishing] = useState(false)
  const [stepNote, setStepNote] = useState<Record<string, string>>({})
  const [doneNote, setDoneNote] = useState('')
  useEffect(() => { fetchQuestions(job.id).then(setQuestions) }, [job.id, job.updated_at])
  useEffect(() => { if (showHist) fetchHistory(job.id).then(setHist) }, [showHist, job.id, job.updated_at])
  useEffect(() => { setNotes(job.notes); setLink(job.link_path); setTitle(job.title) }, [job.notes, job.link_path, job.title])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])

  const act = async (p: Promise<string | null>) => { const e = await p; if (e) showToast(`Error: ${e}`); await ctx.reload() }
  // Step changes draw at once, then save; the reload only confirms.
  const work = (steps: JobStep[], p: Promise<string | null>) => { ctx.patchJob(job.id, j => afterStepChange(j, steps, new Date().toISOString())); return act(p) }
  const tick = (s: JobStep) => work(stepsAfterTick(job, s.id, who), toggleStep(job, s.id, who))
  const doing = (s: JobStep, on: boolean) => { const note = stepNote[s.id] ?? s.note ?? ''; work(job.steps.map(x => x.id === s.id ? { ...x, doing: on, note: note.trim() || null } : x), setStepDoing(job, s.id, on, note, who)) }
  const saveField = (patch: Partial<AdminJob>) => { if (Object.entries(patch).some(([k, v]) => (job as any)[k] !== v)) act(updateJob(job, patch, who)) }
  const remove = async () => {
    const ok = await confirmDialog({ title: ko ? '이 일을 지울까요?' : 'Delete this job?', message: job.title, confirmLabel: ko ? '삭제' : 'Delete', danger: true })
    if (ok) { await act(deleteJob(job, who)); onClose() }
  }
  const submitSteps = () => { if (stepText.trim()) { act(addSteps(job, stepText, who)); setStepText('') } }
  const other = accounts.find(a => a.id !== me?.id) || accounts.find(a => a.id !== job.owner_id)
  const fmtAt = (iso: string) => new Date(iso).toLocaleString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const label = 'eyebrow mb-1.5'
  const small = 'text-[length:calc(11.5px*var(--ts))]'
  const chip = (on: boolean) => `h-8 px-3 rounded-full border text-[length:calc(12.5px*var(--ts))] ${on ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-2 hover:text-ink'}`
  const stepsDone = job.steps.filter(s => s.done).length

  return (
    <Overlay>
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[560px] bg-paper border-l border-rule-2 overflow-y-auto px-6 py-5 grid gap-5 content-start" role="dialog" aria-label={job.title}>
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded text-ink-3 hover:text-ink hover:bg-paper-2 flex items-center justify-center" aria-label={ko ? '닫기' : 'Close'}><X size={16} /></button>

        <div className="pr-8">
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={() => title.trim() && saveField({ title: title.trim() })} className="w-full bg-transparent font-display text-[length:calc(26px*var(--ts))] leading-tight text-ink border-b border-transparent hover:border-rule-2 focus:border-rule-2 outline-none" aria-label={ko ? '제목' : 'Title'} />
          <p className="text-[length:calc(13px*var(--ts))] text-ink-2 mt-1.5">{job.category || (ko ? '분류 없음' : 'No category')} · <span>{dueLabel(job, ctx.today, ko, ctx.semesterName(job.semester_id), ctx.semesterStart(job.semester_id))}</span></p>
          {fresh && <p className="text-[length:calc(12.5px*var(--ts))] text-ink-2 mt-1">{ko ? '추가됨 · 담당 없음 · 단계와 세부 내용을 적어 두세요' : 'Added · nobody yet · add the steps and details while it is in mind'}</p>}
        </div>

        {/* Owner */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${small} text-ink-3 mr-1`}>{ko ? '담당' : 'Owner'}</span>
          {accounts.map(a => <button key={a.id} onClick={() => act(assignJob(job, a.id, who))} className={chip(job.owner_id === a.id && !job.is_shared)}>{job.owner_id === a.id && !job.is_shared ? '✓ ' : ''}{a.name}</button>)}
          <button onClick={() => act(assignJob(job, 'shared', who))} className={chip(job.is_shared)} title={ko ? '둘 다 맡고, 단계마다 이름을 붙입니다' : 'Both of you; name each step'}>{job.is_shared ? '✓ ' : ''}{ko ? '함께' : 'Shared'}</button>
          <button onClick={() => act(assignJob(job, null, who))} className={chip(!job.owner_id && !job.is_shared)}>{!job.owner_id && !job.is_shared ? '✓ ' : ''}{ko ? '아직 없음' : 'Nobody yet'}</button>
          <span className="ml-auto"><StatusTag status={job.status} waitingOn={job.waiting_on} ko={ko} onChange={(s, w) => act(setStatus(job, s, who, w))} /></span>
        </div>
        {/* Size, and how it is going */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${small} text-ink-3 mr-1`}>{ko ? '크기' : 'Size'}</span>
          {SIZES.map(z => <button key={z} onClick={() => saveField({ size: z })} className={`${chip(job.size === z)} ${job.size === z ? '' : 'opacity-60 hover:opacity-100'}`} title={SIZE_LABELS[z][ko ? 'ko' : 'en']}><SizeMark size={z} ko={ko} word={job.size === z} /></button>)}
          {job.status !== 'done' && (
            <span className="ml-auto flex items-center gap-2">
              {(() => { const d = daysSinceTouched(job, ctx.today); return <span className={`${small} text-ink-3`}>{d === null ? (ko ? '아직 손대지 않음' : 'not touched yet') : d === 0 ? (ko ? '오늘 작업함' : 'worked on today') : d === 1 ? (ko ? '어제 작업함' : 'worked on yesterday') : (ko ? `${d}일 전 작업` : `${d} days since last worked on`)}{job.touch_count ? ` · ${job.touch_count} ${ko ? '회' : job.touch_count === 1 ? 'stint' : 'stints'}` : ''}</span> })()}
              <button onClick={() => act(touchJob(job, who))} className="h-7 px-2.5 rounded border border-rule-2 text-[length:calc(11.5px*var(--ts))] text-ink-2 hover:text-ink hover:border-ink-3">{ko ? '오늘 작업함' : 'Worked on it today'}</button>
            </span>
          )}
        </div>

        {job.due_kind === 'oneday' && job.status !== 'done' && (
          <div className="flex flex-wrap items-center gap-2 text-[length:calc(12.5px*var(--ts))] text-ink-2">
            <span>{ko ? '언젠가 할 일입니다. 진짜 일로 만들려면:' : 'A one-day wish. To make it a real job:'}</span>
            <button onClick={() => saveField({ due_kind: 'someday', due_date: null })} className="h-7 px-2.5 rounded-full border border-rule-2 hover:border-ink">{ko ? '언제든' : 'Whenever'}</button>
            {ctx.activeSemester?.end_date && <button onClick={() => saveField({ due_kind: 'semester', due_date: ctx.activeSemester!.end_date, semester_id: ctx.activeSemester!.id })} className="h-7 px-2.5 rounded-full border border-rule-2 hover:border-ink">{ko ? '이번 학기' : 'This semester'}</button>}
            <label className="relative h-7 px-2.5 rounded-full border border-rule-2 hover:border-ink inline-flex items-center gap-1 cursor-pointer"><Calendar size={12} />{ko ? '날짜' : 'A day'}<input type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={e => e.target.value && saveField({ due_kind: 'date', due_date: e.target.value })} aria-label={ko ? '날짜' : 'Day'} /></label>
          </div>
        )}

        {/* Notes: what is in the way, what was agreed, where things are */}
        <textarea value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => saveField({ notes })} rows={notes.includes('\n') ? Math.min(6, notes.split('\n').length + 1) : 1}
          placeholder={ko ? '메모 · 예: 사무실에서 명단을 받기 전에는 끝낼 수 없음' : 'A note · e.g. can’t finish until the office sends the list'} className="w-full px-2 py-1.5 bg-transparent border-b border-rule-2 text-[length:calc(13px*var(--ts))] text-ink italic placeholder:not-italic placeholder:text-ink-3 leading-snug resize-none outline-none focus:border-ink-3" aria-label={ko ? '메모' : 'Notes'} />

        {/* Steps */}
        <div>
          <p className={label}>{ko ? '단계' : 'Steps'}{job.steps.length ? ` · ${stepsDone}/${job.steps.length} · ${percent(job)}%` : ''}{(() => { const e = pace(job, ctx.today); return e !== null ? <span className={`${e > (percent(job) || 0) + 10 ? 'text-warn' : 'text-ink-3'}`}> · {ko ? `기간의 ${e}% 경과` : `${e}% of the time gone`}</span> : null })()}</p>
          {percent(job) !== null && job.status !== 'done' && (() => { const e = pace(job, ctx.today), p = percent(job)!; return <span className="block relative h-[4px] bg-paper-2 rounded mb-2"><span className="block h-full bg-good rounded" style={{ width: `${p}%` }} />{e !== null && <span className={`absolute -top-[2px] w-px h-[8px] ${e > p + 10 ? 'bg-warn' : 'bg-ink-3'}`} style={{ left: `${e}%` }} />}</span> })()}
          <ul className="border-t border-rule">
            {job.steps.map(s => (
              <li key={s.id} className={`py-2 border-b border-rule group ${s.doing ? 'bg-paper-2/60 -mx-2 px-2 rounded' : ''}`}>
                <div className="flex items-start gap-2.5">
                <input type="checkbox" checked={s.done} onChange={() => tick(s)} className="mt-1 rounded border-rule-2" aria-label={s.text} />
                <span className={`flex-1 text-[length:calc(13.5px*var(--ts))] leading-snug ${s.done ? 'line-through text-ink-3' : 'text-ink'}`}>{s.text}{s.done && s.done_by_id ? <span className={`${small} text-ink-3`}> · {nameOf(s.done_by_id)}</span> : null}{s.doing && !s.done ? <span className={`${small} text-accent font-semibold`}> · {ko ? '진행 중' : 'working on it'}</span> : null}</span>
                {!s.done && <button onClick={() => doing(s, !s.doing)} className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${s.doing ? 'bg-accent text-white' : 'text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-paper-2'}`} title={s.doing ? (ko ? '잠시 멈춤' : 'Pause this step') : (ko ? '이 단계 시작' : 'Start this step')} aria-pressed={!!s.doing}><Play size={10} /></button>}
                <span className="flex items-center gap-1 mt-0.5">
                  {s.due_date
                    ? <button onClick={() => act(setStepDue(job, s.id, null, who))} className={`${small} tabular-nums text-ink-2 hover:text-bad whitespace-nowrap`} title={ko ? '날짜 지우기' : 'Clear the day'}>{fmtDay(s.due_date, ko)}</button>
                    : <label className="relative w-6 h-6 rounded text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-paper-2 flex items-center justify-center cursor-pointer" title={ko ? '이 단계의 날짜' : 'Give this step a day'}><Calendar size={12} /><input type="date" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" onChange={e => e.target.value && act(setStepDue(job, s.id, e.target.value, who))} aria-label={ko ? '단계 날짜' : 'Step day'} /></label>}
                </span>
                <span className="flex items-center gap-0.5 mt-0.5" title={ko ? '이 단계는 누가' : 'Who does this step'}>
                  {accounts.map(a => <button key={a.id} onClick={() => act(setStepOwner(job, s.id, s.owner_id === a.id ? null : a.id, who, a.name))} className={`w-6 h-6 rounded-full text-[length:calc(11.5px*var(--ts))] font-semibold ${s.owner_id === a.id ? 'bg-ink text-paper' : 'text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-paper-2'}`} aria-label={a.name} aria-pressed={s.owner_id === a.id}>{a.name.slice(0, 1)}</button>)}
                </span>
                <button onClick={() => act(saveSteps(job, job.steps.filter(x => x.id !== s.id), who, 'removed a step'))} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-bad mt-1" aria-label={ko ? '단계 삭제' : 'Remove step'}><X size={12} /></button>
                </div>
                {s.doing && !s.done && (
                  <input value={stepNote[s.id] ?? s.note ?? ''} onChange={e => setStepNote(n => ({ ...n, [s.id]: e.target.value }))} onBlur={() => { if ((stepNote[s.id] ?? '') !== (s.note ?? '') && stepNote[s.id] !== undefined) doing(s, true) }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    placeholder={ko ? '어디까지 했나요? 예: 캐비닛 A, B 끝, C부터' : 'Where are you? e.g. cabinets A and B done, C next'} className="mt-1.5 ml-[26px] w-[calc(100%-26px)] px-2 py-1 bg-surface border border-rule-2 rounded text-[length:calc(12px*var(--ts))] text-ink italic placeholder:not-italic placeholder:text-ink-3" aria-label={ko ? '진행 메모' : 'Where you are'} />
                )}
                {!s.doing && s.note && !s.done && <p className={`ml-[26px] mt-0.5 ${small} text-ink-2 italic`}>{s.note}</p>}
              </li>
            ))}
            {job.steps.length === 0 && <li className={`py-2 border-b border-rule ${small} text-ink-3`}>{ko ? '아직 단계가 없습니다.' : 'No steps yet.'}</li>}
          </ul>
          <textarea value={stepText} onChange={e => setStepText(e.target.value)} rows={stepText.includes('\n') ? Math.min(8, stepText.split('\n').length + 1) : 1}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitSteps() } }}
            placeholder={ko ? '단계 추가 (한 줄에 하나, 목록을 붙여 넣어도 됩니다)' : 'Add a step, or paste a list: one per line'} className="mt-2 w-full px-2 py-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink leading-snug resize-none" />
          <div className="flex items-center justify-between mt-1">
            <span className={`${small} text-ink-3`}>{ko ? 'Enter로 추가, Shift+Enter로 줄바꿈. ▶로 단계를 시작하고 어디까지 했는지 적습니다. 달력으로 날짜를, 이니셜로 담당을. 체크하면 이 일은 진행 중이 됩니다.' : 'Enter adds; Shift+Enter for a new line. ▶ starts a step and takes a note on where you are. The calendar gives it a day, the initial a person. Any tick marks the job In progress.'}</span>
            {stepText.trim() && <button onClick={submitSteps} className="h-7 px-2.5 rounded bg-accent text-white text-[length:calc(11.5px*var(--ts))] font-semibold">{ko ? '추가' : 'Add'}</button>}
          </div>
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
        {job.status === 'done' && job.done_note && <p className={`${small} text-ink-2 italic border-t border-rule-2 pt-3`}>{ko ? '완료 메모: ' : 'When it was done: '}{job.done_note}</p>}
        {finishing && job.status !== 'done' && (
          <div className="border-t border-rule-2 pt-4 grid gap-2">
            <p className={label}>{ko ? '이 일을 완료로 표시합니다 · 어떻게 됐나요? (선택)' : 'Marking this job done · what happened? (optional)'}</p>
            <input autoFocus value={doneNote} onChange={e => setDoneNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { act(setStatus(job, 'done', who, '', doneNote)); setFinishing(false) } if (e.key === 'Escape') setFinishing(false) }} placeholder={ko ? '예: 2026년 폴더로 보냈음, 이지가 리더 역할' : 'e.g. sent as the 2026 folder; Izzy ran the reading part'} className={`${field} w-full`} />
            <div className="flex gap-2">
              <button onClick={() => { act(setStatus(job, 'done', who, '', doneNote)); setFinishing(false) }} className="h-9 px-4 rounded bg-accent text-white text-[length:calc(13px*var(--ts))] font-semibold hover:bg-accent-hover">{ko ? '완료' : 'Yes, done'}</button>
              <button onClick={() => setFinishing(false)} className="h-9 px-3 rounded border border-rule-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink">{ko ? '취소' : 'Cancel'}</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-rule-2 pt-4">
          <button onClick={() => { if (job.status === 'done') act(setStatus(job, 'scheduled', who)); else setFinishing(true) }} className={`h-9 px-4 rounded text-[length:calc(13px*var(--ts))] font-semibold ${job.status === 'done' ? 'border border-rule-2 text-ink-2 hover:text-ink' : finishing ? 'border border-rule-2 text-ink-3' : 'bg-accent text-white hover:bg-accent-hover'}`} disabled={finishing && job.status !== 'done'}>{job.status === 'done' ? (ko ? '다시 열기' : 'Reopen') : <span className="inline-flex items-center gap-1.5"><Check size={14} />{ko ? '이 일 완료' : 'Mark as done'}</span>}</button>
          {other && job.owner_id !== other.id && <button onClick={() => act(assignJob(job, other.id, who))} className="h-9 px-3 rounded border border-rule-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink">{ko ? `${other.name}에게 넘기기` : `Hand to ${other.name}`}</button>}
          <button onClick={remove} className="h-9 px-3 rounded text-[length:calc(12.5px*var(--ts))] text-ink-3 hover:text-bad inline-flex items-center gap-1 ml-auto"><Trash2 size={13} />{ko ? '삭제' : 'Delete'}</button>
          <button onClick={() => setShowMore(m => !m)} className="h-9 px-3 rounded text-[length:calc(12.5px*var(--ts))] text-ink-3 hover:text-ink">{showMore ? (ko ? '간단히' : 'Less') : (ko ? '자세히' : 'Details')}</button>
        </div>

        {showMore && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><p className={label}>{ko ? '분류' : 'Category'}</p>
                <input list="job-categories" defaultValue={job.category} onBlur={e => saveField({ category: e.target.value.trim() })} className={`${field} w-full`} />
                <datalist id="job-categories">{ctx.categories.map(c => <option key={c} value={c} />)}</datalist></div>
              <div><p className={label}>{ko ? '기한' : 'Due'}</p>
                <input type="date" value={job.due_date || ''} onChange={e => saveField(e.target.value ? { due_date: e.target.value, due_kind: 'date' } : { due_date: null, due_kind: 'someday' })} className={`${field} w-full`} />
                {job.due_kind !== 'date' && job.due_date && <p className={`${small} text-ink-3 mt-1`}>{dueLabel(job, ctx.today, ko, ctx.semesterName(job.semester_id), ctx.semesterStart(job.semester_id))} · {fmtDay(job.due_date, ko)}</p>}</div>
              <div><p className={label}>{ko ? '요청자' : 'Requested by'}</p>
                <select value={job.requested_by_id || ''} onChange={e => saveField({ requested_by_id: e.target.value || null })} className={`${field} w-full`}><option value="">—</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
            <div><p className={label}>{ko ? '앱 내 위치' : 'Where in the app'}</p>
              <div className="flex gap-2 items-center">
                <input value={link} onChange={e => setLink(e.target.value)} onBlur={() => saveField({ link_path: link.trim() })} placeholder="/reports" className={`${field} flex-1`} />
                {job.link_path && <Link href={job.link_path} className="text-accent hover:underline inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))]"><LinkIcon size={12} />{ko ? '열기' : 'Open'}</Link>}
              </div></div>
            <p className={`${small} text-ink-3 leading-relaxed`}>
              {ko ? '만든 사람' : 'Created by'} {nameOf(job.created_by_id)}{job.created_at ? ` · ${fmtAt(job.created_at)}` : ''}
              {job.status === 'done' && <><br />{ko ? '완료' : 'Done by'} {nameOf(job.completed_by_id)}{job.completed_at ? ` · ${fmtAt(job.completed_at)}` : ''}</>}
            </p>
            <div>
              <button onClick={() => setShowHist(h => !h)} className={`${small} text-ink-3 hover:text-ink`}>{showHist ? (ko ? '기록 닫기' : 'Hide history') : (ko ? '기록' : 'History')}</button>
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
    </Overlay>
  )
}
