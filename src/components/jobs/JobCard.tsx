'use client'

import { dueLabel, notStarted, progress, urgency, type AdminJob } from '@/lib/adminJobs'

// ─── One job on the board ────────────────────────────────────────
// Title, when, category, size, steps done, the first line of the note in
// italics, and a thin bar when there are steps. A job owned by the other person that has steps for you says so.
// Click opens it. Done cards are dimmed and struck through.

export const urgencyTone = (u: string) => u === 'overdue' ? 'text-bad' : u === 'today' ? 'text-accent font-semibold' : u === 'week' ? 'text-ink' : 'text-ink-3'

export default function JobCard({ job, ko, today, semesterName, semesterStart, me, onOpen }: { job: AdminJob; ko: boolean; today: string; semesterName: string | null; semesterStart: string | null; me: string | null; onOpen: () => void }) {
  const prog = progress(job)
  const pct = prog ? Math.round(100 * prog.done / prog.total) : null
  // Steps given to the viewer on someone else's job, so a shared job shows your share.
  const mine = me && job.owner_id !== me ? job.steps.filter(s => s.owner_id === me && !s.done).length : 0
  const u = urgency(job, today)
  return (
    <button onClick={onOpen} className={`w-full text-left border border-rule bg-surface rounded px-3 py-2.5 grid gap-1 hover:border-ink-3 ${job.status === 'done' ? 'opacity-55' : ''}`}>
      <span className={`text-[length:calc(13.5px*var(--ts))] leading-snug ${job.status === 'done' ? 'line-through text-ink-3' : 'text-ink font-medium'}`}>{job.title}</span>
      <span className="flex flex-wrap gap-x-2 text-[length:calc(11px*var(--ts))] text-ink-3">
        <span className={urgencyTone(u)}>{dueLabel(job, today, ko, semesterName, semesterStart)}</span>
        {job.status === 'in_progress' && <span className="text-accent">· {ko ? '진행 중' : 'in progress'}</span>}
        {job.status === 'waiting' && <span className="text-warn">· {ko ? '대기' : 'waiting'}{job.waiting_on ? `: ${job.waiting_on}` : ''}</span>}
        {notStarted(job, today) && <span className="text-warn">· {ko ? '아직 시작 안 함' : 'not started'}</span>}
        {job.category && <span>· {job.category}</span>}
        <span>· {job.size}</span>
        {prog && <span>· {prog.done}/{prog.total}</span>}
        {mine > 0 && <span className="text-accent">· {mine} {ko ? '내 단계' : mine === 1 ? 'step for you' : 'steps for you'}</span>}
      </span>
      {job.notes.trim() && job.status !== 'done' && <span className="block text-[length:calc(11.5px*var(--ts))] text-ink-2 italic truncate">{job.notes.trim().split('\n')[0]}</span>}
      {pct !== null && job.status !== 'done' && <span className="block h-[3px] bg-paper-2 rounded overflow-hidden"><span className="block h-full bg-good" style={{ width: `${pct}%` }} /></span>}
    </button>
  )
}
