'use client'

import Loading from '@/components/brand/Loading'
import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useViewLog } from '@/lib/useViewLog'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { SECTION_LABELS, categoriesInUse, groupOpen, type AdminJob, type JobDraft } from '@/lib/adminJobs'
import { addJob } from '@/lib/adminJobsData'
import { useAdminJobs } from './useAdminJobs'
import AddJob from './AddJob'
import JobRow, { type RowCtx } from './JobRow'
import RoutinesPanel from './RoutinesPanel'
import { DoneLogList, TermSummary } from './DoneLog'

// ─── Jobs: the office and admin work ─────────────────────────────
// For the two admin accounts. Up next lists every open job by when it is
// due, with the long-term goals and the when-there-is-time jobs in their
// own sections. By category and By owner regroup the same list. Routines
// holds the yearly templates. Done is the log, This term the counts.

type Tab = 'next' | 'category' | 'owner' | 'routines' | 'done' | 'term'

export default function JobsView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const allowed = canSeeAdminJobs(currentTeacher)
  const d = useAdminJobs({ routines: true })
  const [tab, setTab] = useState<Tab>('next')
  const [filterOwner, setFilterOwner] = useState<'all' | 'mine' | 'none'>('all')
  useViewLog(allowed ? `Jobs · ${tab}` : null)

  const categories = useMemo(() => categoriesInUse(d.jobs, d.routines), [d.jobs, d.routines])
  const open = useMemo(() => d.jobs.filter(j => j.status !== 'done'), [d.jobs])
  const shown = useMemo(() => filterOwner === 'all' ? open : filterOwner === 'mine' ? open.filter(j => j.owner_id === d.me?.id) : open.filter(j => !j.owner_id), [open, filterOwner, d.me?.id])
  const overdue = open.filter(j => j.due_date && j.due_date < d.today && !j.parent_id).length
  const unowned = open.filter(j => !j.owner_id && !j.parent_id).length

  if (!currentTeacher) return null
  if (!allowed) return <div className="px-8 py-6"><p className="text-[length:calc(13px*var(--ts))] text-ink-3">{ko ? '이 페이지는 볼 수 없습니다.' : 'This page is not for your account.'}</p></div>

  const who = { id: currentTeacher.id, name: currentTeacher.name }
  const onAdd = async (draft: JobDraft) => { const r = await addJob(draft, who); if (!r.error) await d.reload(); return r.error }
  const ctx: RowCtx = { ko, today: d.today, me: d.me, teachers: d.teachers, categories, semesters: d.semesters, activeSemester: d.activeSemester, nameOf: d.nameOf, semesterName: d.semesterName, childrenOf: d.childrenOf, openQuestions: d.questions, reload: d.reload }
  const tabs: [Tab, string][] = [['next', ko ? '다음 할 일' : 'Up next'], ['category', ko ? '분류별' : 'By category'], ['owner', ko ? '담당별' : 'By owner'], ['routines', ko ? '루틴' : 'Routines'], ['done', ko ? '완료 기록' : 'Done'], ['term', ko ? '이번 학기' : 'This term']]

  const groupBy = (key: (j: AdminJob) => string, order?: (a: string, b: string) => number) => {
    const m: Record<string, AdminJob[]> = {}
    shown.filter(j => !j.parent_id).forEach(j => (m[key(j)] ||= []).push(j))
    return Object.keys(m).sort(order).map(k => ({ k, jobs: m[k].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')) }))
  }

  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1200px]">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{d.loading ? '' : `${open.filter(j => !j.parent_id).length} ${ko ? '개 진행 중' : 'open'}${overdue ? ` · ${overdue} ${ko ? '기한 지남' : 'overdue'}` : ''}${unowned ? ` · ${unowned} ${ko ? '담당 없음' : 'unowned'}` : ''}${d.questions.length ? ` · ${d.questions.length} ${ko ? '질문' : d.questions.length === 1 ? 'question' : 'questions'}` : ''}`}</p>
          <h1 className="font-display text-[length:calc(34px*var(--ts))] leading-none text-ink">{ko ? '업무' : 'Jobs'}</h1>
        </div>
        <div className="flex gap-1 flex-wrap">
          {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded text-[length:calc(12.5px*var(--ts))] ${tab === t ? 'bg-ink text-paper font-semibold' : 'text-ink-2 hover:bg-paper-2'}`}>{l}</button>)}
        </div>
      </div>

      {d.missing ? (
        <p className="text-[length:calc(13px*var(--ts))] text-ink-2">{ko ? 'supabase/migration-admin-jobs.sql을 Supabase SQL Editor에서 한 번 실행하세요.' : 'Run supabase/migration-admin-jobs.sql once in the Supabase SQL Editor.'}</p>
      ) : d.noSession ? (
        <div className="text-[length:calc(13px*var(--ts))] text-ink-2 max-w-[640px] leading-relaxed">
          <p>{ko ? '이 브라우저는 Supabase Auth에 로그인되어 있지 않아 업무 표가 비어 보입니다.' : 'This browser is not signed in to Supabase Auth, so the jobs tables answer nothing.'}</p>
          <p className="mt-2 text-ink-3">{ko ? '설정 순서: Supabase 대시보드 → Authentication → Users에서 두 계정을 만들고, teachers.auth_email을 채운 뒤, 로그아웃하고 그 비밀번호로 다시 로그인하세요. 자세한 내용은 migration-admin-jobs.sql 끝에 있습니다.' : 'Set up once: make the two users under Authentication → Users in the Supabase dashboard, fill teachers.auth_email, then sign out and back in with that password. The steps are at the end of migration-admin-jobs.sql.'}</p>
        </div>
      ) : d.loading ? <Loading rows={6} /> : (
        <>
          {tab !== 'routines' && tab !== 'done' && tab !== 'term' && (
            <div className="mb-5">
              <AddJob ko={ko} teachers={d.teachers} categories={categories} activeSemester={d.activeSemester} semesters={d.semesters} me={d.me} onAdd={onAdd} />
              <div className="flex gap-1 mt-3 text-[length:calc(11.5px*var(--ts))]">
                {([['all', ko ? '전체' : 'Everyone'], ['mine', ko ? '내 것' : 'Mine'], ['none', ko ? '담당 없음' : 'No owner']] as ['all' | 'mine' | 'none', string][]).map(([k, l]) => <button key={k} onClick={() => setFilterOwner(k)} className={`h-7 px-2.5 rounded-full border ${filterOwner === k ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>{l}</button>)}
              </div>
            </div>
          )}
          {d.error && <p className="text-[length:calc(12px*var(--ts))] text-bad mb-3">{d.error}</p>}

          {tab === 'next' && (
            <div className="grid gap-6">
              {groupOpen(shown, d.today).map(({ section, jobs }) => (
                <section key={section}>
                  <p className={`eyebrow mb-1 ${section === 'overdue' ? 'text-bad' : section === 'today' ? 'eyebrow-accent' : ''}`}>{SECTION_LABELS[section][ko ? 'ko' : 'en']} <span className="text-ink-3 normal-case tracking-normal">· {jobs.length}</span></p>
                  <div className="border-t border-rule-2 divide-y divide-rule">{jobs.map(j => <JobRow key={j.id} job={j} ctx={ctx} />)}</div>
                </section>
              ))}
              {shown.length === 0 && <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '진행 중인 일이 없습니다.' : 'Nothing open.'}</p>}
            </div>
          )}
          {tab === 'category' && (
            <div className="grid gap-6">
              {groupBy(j => j.category || (ko ? '분류 없음' : 'No category')).map(({ k, jobs }) => (
                <section key={k}><p className="eyebrow mb-1">{k} <span className="text-ink-3 normal-case tracking-normal">· {jobs.length}</span></p><div className="border-t border-rule-2 divide-y divide-rule">{jobs.map(j => <JobRow key={j.id} job={j} ctx={ctx} />)}</div></section>
              ))}
            </div>
          )}
          {tab === 'owner' && (
            <div className="grid gap-6">
              {groupBy(j => j.owner_id || '', (a, b) => (a === '' ? -1 : b === '' ? 1 : d.nameOf(a).localeCompare(d.nameOf(b)))).map(({ k, jobs }) => (
                <section key={k || 'none'}><p className={`eyebrow mb-1 ${k ? '' : 'text-warn'}`}>{k ? d.nameOf(k) : (ko ? '담당 없음' : 'No owner')} <span className="text-ink-3 normal-case tracking-normal">· {jobs.length}</span></p><div className="border-t border-rule-2 divide-y divide-rule">{jobs.map(j => <JobRow key={j.id} job={j} ctx={ctx} />)}</div></section>
              ))}
            </div>
          )}
          {tab === 'routines' && <RoutinesPanel ko={ko} routines={d.routines} template={d.template} events={d.events} teachers={d.teachers} semesters={d.semesters} activeSemester={d.activeSemester} categories={categories} me={d.me} nameOf={d.nameOf} reload={d.reload} />}
          {tab === 'done' && <DoneLogList jobs={d.jobs} ko={ko} nameOf={d.nameOf} />}
          {tab === 'term' && <TermSummary jobs={d.jobs} ko={ko} teachers={d.teachers} semester={d.activeSemester} nameOf={d.nameOf} />}
        </>
      )}
    </div>
  )
}
