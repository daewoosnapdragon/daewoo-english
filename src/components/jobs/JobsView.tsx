'use client'

import Loading from '@/components/brand/Loading'
import { useCallback, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useViewLog } from '@/lib/useViewLog'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { BOARD_SECTION_LABELS, adminAccounts, boardSection, categoriesInUse, dueLabel, shelf, urgency, type AdminJob, type BoardSection, type JobDraft } from '@/lib/adminJobs'
import { urgencyTone } from './JobCard'
import { addJob } from '@/lib/adminJobsData'
import { useAdminJobs } from './useAdminJobs'
import AddJob from './AddJob'
import JobCard from './JobCard'
import JobDrawer, { type DrawerCtx } from './JobDrawer'
import RoutinesPanel from './RoutinesPanel'
import { DoneLogList, TermSummary } from './DoneLog'
import type { Teacher } from '@/types'

// ─── Jobs: the office and admin work ─────────────────────────────
// For the two admin accounts. The board is three columns: you, nobody
// yet, the other account, each in three sections: Working on, This week,
// Coming up. What is further off waits on the Later shelf under the
// columns, by month, with Whenever at the end, and comes up by itself.
// Click a card to open it. Routines holds the yearly templates, Done the
// log, This term the counts.

type Tab = 'board' | 'routines' | 'done' | 'term'
const ORDER: Record<string, number> = { overdue: 0, today: 1, week: 2, soon: 3, later: 4, someday: 5, done: 6 }
const DONE_SHOWN_DAYS = 14
const COLUMN_SECTIONS: BoardSection[] = ['working', 'week', 'soon']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function JobsView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const allowed = canSeeAdminJobs(currentTeacher)
  const d = useAdminJobs({ routines: true })
  const [tab, setTab] = useState<Tab>('board')
  const [openId, setOpenId] = useState<string | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)
  useViewLog(allowed ? `Jobs · ${tab}` : null)

  const categories = useMemo(() => categoriesInUse(d.jobs, d.routines), [d.jobs, d.routines])
  const accounts = useMemo(() => adminAccounts(d.teachers), [d.teachers])
  const open = useMemo(() => d.jobs.filter(j => j.status !== 'done' && !j.parent_id), [d.jobs])
  const overdue = open.filter(j => j.due_date && j.due_date < d.today).length
  const unowned = open.filter(j => !j.owner_id).length
  const close = useCallback(() => { setOpenId(null); setFreshId(null) }, [])
  const openJob = d.jobs.find(j => j.id === openId) || null

  if (!currentTeacher) return null
  if (!allowed) return <div className="px-8 py-6"><p className="text-[length:calc(13px*var(--ts))] text-ink-3">{ko ? '이 페이지는 볼 수 없습니다.' : 'This page is not for your account.'}</p></div>

  const who = { id: currentTeacher.id, name: currentTeacher.name }
  // A new job lands under Nobody yet and opens at once, details showing, so the steps and the rest are filled in while it is in mind.
  const onAdd = async (draft: JobDraft) => { const r = await addJob(draft, who); if (!r.error && r.job) { await d.reload(); setFreshId(r.job.id); setOpenId(r.job.id) } return r.error }
  const ctx: DrawerCtx = { ko, today: d.today, me: d.me, teachers: d.teachers, accounts, categories, activeSemester: d.activeSemester, nameOf: d.nameOf, semesterName: d.semesterName, childrenOf: d.childrenOf, reload: d.reload }
  const tabs: [Tab, string][] = [['board', ko ? '보드' : 'Board'], ['routines', ko ? '루틴' : 'Routines'], ['done', ko ? '완료 기록' : 'Done'], ['term', ko ? '이번 학기' : 'This term']]

  // The viewer's column first, then nobody, then the other account; anyone else who owns a job gets a column too.
  const byUrg = (a: AdminJob, b: AdminJob) => ORDER[urgency(a, d.today)] - ORDER[urgency(b, d.today)] || (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.created_at.localeCompare(b.created_at)
  const mineFirst = [...accounts].sort((a, b) => (a.id === currentTeacher.id ? -1 : 0) - (b.id === currentTeacher.id ? -1 : 0))
  const others = d.teachers.filter(t => !accounts.some(a => a.id === t.id) && d.jobs.some(j => j.owner_id === t.id && j.status !== 'done'))
  const columns: { key: string | null; name: string; tone?: string }[] = [
    ...(mineFirst[0] ? [{ key: mineFirst[0].id, name: mineFirst[0].name }] : []),
    { key: null, name: ko ? '담당 없음' : 'Nobody yet', tone: 'text-warn' },
    ...mineFirst.slice(1).map(a => ({ key: a.id, name: a.name })),
    ...others.map((t: Teacher) => ({ key: t.id, name: t.name })),
  ]
  const recentDone = (key: string | null) => d.jobs.filter(j => j.status === 'done' && !j.parent_id && j.owner_id === key && j.completed_at && j.completed_at.slice(0, 10) >= addDaysIso(d.today, -DONE_SHOWN_DAYS)).sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))

  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1280px]">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{d.loading ? '' : `${open.length} ${ko ? '개 진행 중' : 'open'}${overdue ? ` · ${overdue} ${ko ? '기한 지남' : 'overdue'}` : ''}${unowned ? ` · ${unowned} ${ko ? '담당 없음' : 'with nobody yet'}` : ''}${d.questions.length ? ` · ${d.questions.length} ${ko ? '질문' : d.questions.length === 1 ? 'question' : 'questions'}` : ''}`}</p>
          <h1 className="font-display text-[length:calc(34px*var(--ts))] leading-none text-ink">{ko ? '업무' : 'Jobs'}</h1>
        </div>
        <div className="flex gap-1 flex-wrap">
          {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded text-[length:calc(12.5px*var(--ts))] ${tab === t ? 'bg-ink text-paper font-semibold' : 'text-ink-2 hover:bg-paper-2'}`}>{l}</button>)}
        </div>
      </div>

      {d.missing ? (
        <p className="text-[length:calc(13px*var(--ts))] text-ink-2">{ko ? 'supabase/migration-admin-jobs.sql을 Supabase SQL Editor에서 한 번 실행하세요.' : 'Run supabase/migration-admin-jobs.sql once in the Supabase SQL Editor.'}</p>
      ) : d.loading ? <Loading rows={6} /> : (
        <>
          {d.error && <p className="text-[length:calc(12px*var(--ts))] text-bad mb-3">{d.error}</p>}
          {tab === 'board' && (
            <>
              <div className="mb-6"><AddJob ko={ko} today={d.today} activeSemester={d.activeSemester} me={d.me} onAdd={onAdd} /></div>
              <div className="grid gap-6 md:grid-cols-3">
                {columns.map(c => {
                  const mine = open.filter(j => j.owner_id === c.key)
                  const sections = COLUMN_SECTIONS.map(sec => ({ sec, cards: mine.filter(j => boardSection(j, d.today) === sec).sort(byUrg) })).filter(x => x.cards.length)
                  const onBoard = sections.reduce((n, x) => n + x.cards.length, 0)
                  const onShelf = mine.length - onBoard
                  const done = recentDone(c.key)
                  return (
                    <section key={c.key || 'none'} className="min-w-0">
                      <h2 className={`font-display text-[length:calc(22px*var(--ts))] leading-none border-b border-rule-2 pb-2 mb-3 flex items-baseline justify-between gap-2 ${c.tone || 'text-ink'}`}>{c.name}<span className="font-body text-[length:calc(12px*var(--ts))] text-ink-3 tabular-nums">{onBoard}{onShelf ? ` + ${onShelf} ${ko ? '나중에' : 'later'}` : ''}</span></h2>
                      <div className="grid gap-4">
                        {sections.map(({ sec, cards }) => (
                          <div key={sec}>
                            <p className={`eyebrow mb-1.5 ${sec === 'working' ? 'eyebrow-accent' : sec === 'week' ? 'text-ink' : ''}`}>{BOARD_SECTION_LABELS[sec][ko ? 'ko' : 'en']} <span className="text-ink-3 normal-case tracking-normal">· {cards.length}</span></p>
                            <div className="grid gap-2">{cards.map(j => <JobCard key={j.id} job={j} ko={ko} today={d.today} semesterName={d.semesterName(j.semester_id)} parts={d.childrenOf[j.id] || []} onOpen={() => setOpenId(j.id)} />)}</div>
                          </div>
                        ))}
                        {onBoard === 0 && <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3 py-1">{onShelf ? (ko ? '이번 달에는 없음. 아래 나중에 목록에 있습니다.' : 'Nothing this month; see Later below.') : c.key === null ? (ko ? '모두 담당이 있습니다.' : 'Everything has an owner.') : (ko ? '없음.' : 'Nothing here.')}</p>}
                      </div>
                      {done.length > 0 && (
                        <div className="mt-4">
                          <p className="eyebrow mb-2">{ko ? '완료' : 'Done'} <span className="normal-case tracking-normal">· {ko ? '최근 2주' : 'last two weeks'}</span></p>
                          <div className="grid gap-2">{done.map(j => <JobCard key={j.id} job={j} ko={ko} today={d.today} semesterName={d.semesterName(j.semester_id)} parts={d.childrenOf[j.id] || []} onOpen={() => setOpenId(j.id)} />)}</div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
              <LaterShelf jobs={open} ko={ko} today={d.today} nameOf={d.nameOf} semesterName={d.semesterName} onOpen={j => setOpenId(j.id)} />
            </>
          )}
          {tab === 'routines' && <RoutinesPanel ko={ko} routines={d.routines} template={d.template} events={d.events} teachers={d.teachers} semesters={d.semesters} activeSemester={d.activeSemester} categories={categories} me={d.me} nameOf={d.nameOf} reload={d.reload} />}
          {tab === 'done' && <DoneLogList jobs={d.jobs} ko={ko} nameOf={d.nameOf} />}
          {tab === 'term' && <TermSummary jobs={d.jobs} ko={ko} teachers={d.teachers} semester={d.activeSemester} nameOf={d.nameOf} />}
        </>
      )}
      {openJob && <JobDrawer key={openJob.id} job={openJob} ctx={ctx} fresh={openJob.id === freshId} onClose={close} onOpen={j => setOpenId(j.id)} />}
    </div>
  )
}

const addDaysIso = (iso: string, n: number) => { const t = new Date(iso + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10) }

// ─── The Later shelf ─────────────────────────────────────────────
// Everything further off than a month, by month, then Whenever: one grey
// line each, with the owner, so the columns stay this month's work. A
// job comes up into its column on its own as its date nears, or as soon
// as someone sets it to In progress.
function LaterShelf({ jobs, ko, today, nameOf, semesterName, onOpen }: { jobs: AdminJob[]; ko: boolean; today: string; nameOf: (id: string | null | undefined) => string; semesterName: (id: string | null | undefined) => string | null; onOpen: (j: AdminJob) => void }) {
  const groups = shelf(jobs, today)
  if (groups.length === 0) return null
  const monthName = (key: string) => key === 'someday' ? BOARD_SECTION_LABELS.someday[ko ? 'ko' : 'en'] : ko ? `${Number(key.slice(5, 7))}월` : `${MONTH_EN[Number(key.slice(5, 7)) - 1]}${key.slice(0, 4) !== today.slice(0, 4) ? ` ${key.slice(0, 4)}` : ''}`
  const total = groups.reduce((n, g) => n + g.jobs.length, 0)
  return (
    <section className="mt-8 border-t border-rule-2 pt-3 text-ink-3">
      <p className="eyebrow mb-2">{BOARD_SECTION_LABELS.later[ko ? 'ko' : 'en']} <span className="normal-case tracking-normal">· {total} · {ko ? '때가 되면 위로 올라옵니다' : 'comes up by itself when its time is near'}</span></p>
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-3">
        {groups.map(g => (
          <div key={g.key} className="min-w-0">
            <p className="text-[length:calc(12px*var(--ts))] font-semibold text-ink-2 mb-0.5">{monthName(g.key)}</p>
            <ul>
              {g.jobs.map(j => (
                <li key={j.id}>
                  <button onClick={() => onOpen(j)} className="w-full text-left py-0.5 text-[length:calc(12.5px*var(--ts))] text-ink-3 hover:text-ink flex justify-between gap-3">
                    <span className="truncate">{j.title}<span className="text-ink-3"> · {j.owner_id ? nameOf(j.owner_id) : (ko ? '담당 없음' : 'nobody yet')}</span></span>
                    <span className={`shrink-0 tabular-nums ${urgencyTone(urgency(j, today))}`}>{g.key === 'someday' ? '' : dueLabel(j, today, ko, semesterName(j.semester_id))}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
