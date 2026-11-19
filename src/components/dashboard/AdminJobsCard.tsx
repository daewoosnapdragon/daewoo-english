'use client'

import Link from 'next/link'
import { useApp } from '@/lib/context'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { attention, dueLabel, urgency, type AdminJob } from '@/lib/adminJobs'
import { setStatus } from '@/lib/adminJobsData'
import { useAdminJobs } from '@/components/jobs/useAdminJobs'
import { ArrowRight, Check } from 'lucide-react'

// ─── Jobs on the dashboard ───────────────────────────────────────
// For the two admin accounts, at the top of the page every day: the
// viewer's overdue, today and this-week jobs in large type with a tick,
// long-term goals that have not been started, how many jobs have no owner,
// and the way in to the full page. Nothing when there is nothing due.

export default function AdminJobsCard() {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const d = useAdminJobs()
  if (!canSeeAdminJobs(currentTeacher) || d.loading || d.missing) return null
  const { mine, notStartedGoals, unowned } = attention(d.jobs, d.today, currentTeacher?.id || null)
  const who = currentTeacher ? { id: currentTeacher.id, name: currentTeacher.name } : null
  const tick = async (j: AdminJob) => { const e = await setStatus(j, 'done', who); if (e) showToast(`Error: ${e}`); else { showToast(ko ? `완료: ${j.title}` : `Done: ${j.title}`); d.reload() } }
  const tone = (j: AdminJob) => { const u = urgency(j, d.today); return u === 'overdue' ? 'text-bad' : u === 'today' ? 'text-accent' : 'text-ink-3' }
  const rows = [...mine, ...notStartedGoals].slice(0, 8)

  return (
    <div className="border-t border-b border-rule-2 py-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="font-display text-[length:calc(22px*var(--ts))] leading-none text-ink">{ko ? '내 업무' : 'Your jobs'}</h2>
        <Link href="/jobs" className="text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink inline-flex items-center gap-1">{ko ? '전체 보기' : 'All jobs'}<ArrowRight size={12} /></Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-[length:calc(13px*var(--ts))] text-ink-3">{ko ? '이번 주에 기한인 일이 없습니다.' : 'Nothing due this week.'}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {rows.map(j => {
            const steps = j.steps.length ? `${j.steps.filter(s => s.done).length}/${j.steps.length}` : ''
            return (
              <li key={j.id} className="flex items-center gap-3 py-2">
                <button onClick={() => tick(j)} className="w-7 h-7 rounded-full border border-rule-2 hover:border-good hover:text-good text-transparent flex items-center justify-center shrink-0" aria-label={ko ? '완료' : 'Done'} title={ko ? '완료로 표시' : 'Mark done'}><Check size={14} /></button>
                <Link href="/jobs" className="flex-1 min-w-0">
                  <span className="block font-display text-[length:calc(19px*var(--ts))] leading-tight text-ink truncate">{j.title}</span>
                  <span className={`block text-[length:calc(11.5px*var(--ts))] ${tone(j)}`}>{dueLabel(j, d.today, ko, d.semesterName(j.semester_id), d.semesterStart(j.semester_id))}{j.status === 'scheduled' && j.due_kind !== 'date' ? (ko ? ' · 아직 시작 안 함' : ' · not started') : ''}{j.category ? ` · ${j.category}` : ''}{steps ? ` · ${steps}` : ''}{j.status === 'waiting' && j.waiting_on ? ` · ${ko ? '대기' : 'waiting on'} ${j.waiting_on}` : ''}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {unowned.length > 0 && <p className="text-[length:calc(11.5px*var(--ts))] text-warn mt-2"><Link href="/jobs" className="hover:underline">{unowned.length} {ko ? '개 일에 담당이 없습니다' : `job${unowned.length === 1 ? ' has' : 's have'} no owner`}</Link>{unowned.slice(0, 2).map(j => <span key={j.id} className="text-ink-3"> · {j.title}</span>)}</p>}
    </div>
  )
}
