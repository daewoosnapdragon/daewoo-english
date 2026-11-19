'use client'

import { daysSinceTouched, doingStep, dueLabel, notStarted, pace, percent, progress, urgency, type AdminJob } from '@/lib/adminJobs'
import SizeMark from './SizeMark'

// ─── One job on the board ────────────────────────────────────────
// Title, when, category, size, steps done, the first line of the note in
// italics, and a thin bar when there are steps. A job owned by the other person that has steps for you says so.
// Click opens it. Done cards are dimmed and struck through.

export const urgencyTone = (u: string) => u === 'overdue' ? 'text-bad' : u === 'today' ? 'text-accent font-semibold' : u === 'week' ? 'text-ink' : 'text-ink-3'

export default function JobCard({ job, ko, today, semesterName, semesterStart, me, ownerName, onOpen }: { job: AdminJob; ko: boolean; today: string; semesterName: string | null; semesterStart: string | null; me: string | null; /** Shown when the card is outside its owner's column. */ ownerName?: string | null; onOpen: () => void }) {
  const prog = progress(job)
  const pct = percent(job)
  const expected = pace(job, today)
  const since = daysSinceTouched(job, today)
  const now = doingStep(job)
  // Steps given to the viewer on someone else's job, so a shared job shows your share.
  const mine = me && (job.is_shared || job.owner_id !== me) ? job.steps.filter(s => s.owner_id === me && !s.done).length : 0
  const u = urgency(job, today)
  return (
    <button onClick={onOpen} className={`w-full text-left border border-rule bg-surface rounded px-3 py-2.5 grid gap-1 hover:border-ink-3 ${job.status === 'done' ? 'opacity-55' : ''}`}>
      <span className={`text-[length:calc(13.5px*var(--ts))] leading-snug ${job.status === 'done' ? 'line-through text-ink-3' : 'text-ink font-medium'}`}>{job.title}</span>
      <span className="flex flex-wrap gap-x-2 text-[length:calc(11px*var(--ts))] text-ink-3">
        <span className={urgencyTone(u)}>{dueLabel(job, today, ko, semesterName, semesterStart)}</span>
        {job.status === 'in_progress' && <span className="text-accent">· {ko ? '진행 중' : 'in progress'}</span>}
        {job.status === 'waiting' && <span className="text-warn">· {ko ? '대기' : 'waiting'}{job.waiting_on ? `: ${job.waiting_on}` : ''}</span>}
        {notStarted(job, today) && <span className="text-warn">· {ko ? '아직 시작 안 함' : 'not started'}</span>}
        {ownerName !== undefined && (job.due_kind !== 'oneday' || job.owner_id || job.is_shared) && <span className={job.is_shared ? 'text-accent font-semibold' : job.owner_id ? 'text-ink' : 'text-warn font-semibold'}>· {job.is_shared ? (ko ? '함께' : 'Shared') : job.owner_id ? ownerName : (ko ? '담당 없음' : 'Nobody yet')}</span>}
        {ownerName === undefined && job.is_shared && <span className="text-ink-2">· {ko ? '함께' : 'shared'}</span>}
        {job.category && <span>· {job.category}</span>}
        <span className="inline-flex items-center gap-1">· <SizeMark size={job.size} ko={ko} /></span>
        {prog && <span>· {prog.done}/{prog.total} · {pct}%</span>}
        {since !== null && job.status !== 'done' && <span>· {since === 0 ? (ko ? '오늘 작업' : 'touched today') : since === 1 ? (ko ? '어제 작업' : 'touched yesterday') : (ko ? `${since}일 전 작업` : `touched ${since} days ago`)}</span>}
        {mine > 0 && <span className="text-accent">· {mine} {ko ? '내 단계' : mine === 1 ? 'step for you' : 'steps for you'}</span>}
      </span>
      {now && job.status !== 'done' && <span className="block text-[length:calc(11.5px*var(--ts))] text-ink truncate"><span className="text-accent font-semibold">{ko ? '진행 중' : 'Working on'}:</span> {now.text}{now.note ? <span className="text-ink-2 italic"> · {now.note}</span> : null}</span>}
      {job.notes.trim() && job.status !== 'done' && <span className="block text-[length:calc(11.5px*var(--ts))] text-ink-2 italic truncate">{job.notes.trim().split('\n')[0]}</span>}
      {pct !== null && job.status !== 'done' && (
        <span className="block relative h-[3px] bg-paper-2 rounded" title={expected !== null ? (ko ? `${pct}% 완료 · 기간의 ${expected}% 경과` : `${pct}% done · ${expected}% of the time gone`) : `${pct}%`}>
          <span className="block h-full bg-good rounded" style={{ width: `${pct}%` }} />
          {expected !== null && <span className={`absolute -top-[2px] w-px h-[7px] ${expected > pct + 10 ? 'bg-warn' : 'bg-ink-3'}`} style={{ left: `${expected}%` }} />}
        </span>
      )}
    </button>
  )
}
