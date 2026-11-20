'use client'

import Loading from '@/components/brand/Loading'
import { useCallback, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useViewLog } from '@/lib/useViewLog'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { BOARD_SECTION_LABELS, adminAccounts, afterStepChange, bites, boardSection, categoriesInUse, daysSinceTouched, dueLabel, nextStep, pace, percent, progress, shelf, urgency, type AdminJob, type Bite, type BoardSection, type JobDraft } from '@/lib/adminJobs'
import StatusTag from './StatusTag'
import SizeMark from './SizeMark'
import { setStatus } from '@/lib/adminJobsData'
import { stepsAfterTick, toggleStep } from '@/lib/adminJobsData'
import { urgencyTone } from './JobCard'
import { addJob } from '@/lib/adminJobsData'
import { useAdminJobs } from './useAdminJobs'
import AddJob from './AddJob'
import JobCard from './JobCard'
import JobDrawer, { type DrawerCtx } from './JobDrawer'
import RoutinesPanel from './RoutinesPanel'
import YearView from './YearView'
import { DoneLogList, TermSummary } from './DoneLog'
import type { Teacher } from '@/types'
import { needsUpdate } from '@/lib/dbUpdate'

// ─── Jobs: the office and admin work ─────────────────────────────
// For the two admin accounts. The board opens with the big jobs (this
// semester's long ones and anything shared) as wide cards with their
// progress, then three columns: you, nobody yet, the other account, each
// in sections: Working on, This week, Later
// this month, Next month. What is further off waits on the Later shelf under the
// columns, by month, with Whenever at the end, and comes up by itself.
// Click a card to open it. The year is one line of every routine's date
// with month tiles and the routine templates under it, Done the log,
// This term the counts.

type Tab = 'board' | 'year' | 'done' | 'term'
const ORDER: Record<string, number> = { overdue: 0, today: 1, week: 2, soon: 3, later: 4, someday: 5, done: 6 }
const DONE_SHOWN_DAYS = 14
const COLUMN_SECTIONS: BoardSection[] = ['working', 'week', 'month', 'nextmonth']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function JobsView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const allowed = canSeeAdminJobs(currentTeacher)
  const d = useAdminJobs({ routines: true })
  const [tab, setTab] = useState<Tab>('board')
  const [pick, setPick] = useState<{ id: string; n: number } | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [freshId, setFreshId] = useState<string | null>(null)
  useViewLog(allowed ? `Jobs · ${tab}` : null)

  const categories = useMemo(() => categoriesInUse(d.jobs, d.routines), [d.jobs, d.routines])
  const accounts = useMemo(() => adminAccounts(d.teachers), [d.teachers])
  const open = useMemo(() => d.jobs.filter(j => j.status !== 'done' && !j.parent_id), [d.jobs])
  const overdue = open.filter(j => j.due_date && j.due_date < d.today).length
  const unowned = open.filter(j => !j.owner_id && !j.is_shared).length
  const close = useCallback(() => { setOpenId(null); setFreshId(null) }, [])
  const allBites = useMemo(() => bites(d.jobs, d.today), [d.jobs, d.today])
  const semId = d.activeSemester?.id || null
  const openJob = d.jobs.find(j => j.id === openId) || null

  if (!currentTeacher) return null
  if (!allowed) return <div className="px-8 py-6"><p className="text-[length:calc(13px*var(--ts))] text-ink-3">{ko ? '이 페이지는 볼 수 없습니다.' : 'This page is not for your account.'}</p></div>

  const who = { id: currentTeacher.id, name: currentTeacher.name }
  // A new job lands under Nobody yet and opens at once, details showing, so the steps and the rest are filled in while it is in mind.
  const onAdd = async (draft: JobDraft) => { const r = await addJob(draft, who); if (!r.error && r.job) { await d.reload(); setFreshId(r.job.id); setOpenId(r.job.id) } return r.error }
  const ctx: DrawerCtx = { ko, today: d.today, me: d.me, teachers: d.teachers, accounts, categories, activeSemester: d.activeSemester, nameOf: d.nameOf, semesterName: d.semesterName, semesterStart: d.semesterStart, childrenOf: d.childrenOf, reload: d.reload, patchJob: d.patchJob }
  const tabs: [Tab, string][] = [['board', ko ? '보드' : 'Board'], ['year', ko ? '연간' : 'The year'], ['done', ko ? '완료 기록' : 'Done'], ['term', ko ? '이번 학기' : 'This term']]

  // The viewer's column first, then nobody, then the other account; anyone else who owns a job gets a column too.
  const byUrg = (a: AdminJob, b: AdminJob) => ORDER[urgency(a, d.today)] - ORDER[urgency(b, d.today)] || (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.created_at.localeCompare(b.created_at)
  const mineFirst = [...accounts].sort((a, b) => (a.id === currentTeacher.id ? -1 : 0) - (b.id === currentTeacher.id ? -1 : 0))
  const others = d.teachers.filter(t => !accounts.some(a => a.id === t.id) && d.jobs.some(j => j.owner_id === t.id && j.status !== 'done'))
  const recentDoneOf = (key: string | null, j: AdminJob) => j.owner_id === key || (key !== null && j.is_shared && accounts.some(a => a.id === key))
  const columns: { key: string | null; name: string; tone?: string }[] = [
    ...(mineFirst[0] ? [{ key: mineFirst[0].id, name: mineFirst[0].name }] : []),
    { key: null, name: ko ? '담당 없음' : 'Nobody yet', tone: 'text-warn' },
    ...mineFirst.slice(1).map(a => ({ key: a.id, name: a.name })),
    ...others.map((t: Teacher) => ({ key: t.id, name: t.name })),
  ]
  const recentDone = (key: string | null) => d.jobs.filter(j => j.status === 'done' && !j.parent_id && recentDoneOf(key, j) && j.completed_at && j.completed_at.slice(0, 10) >= addDaysIso(d.today, -DONE_SHOWN_DAYS)).sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))

  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1280px]">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <h1 className="font-display text-[length:calc(34px*var(--ts))] leading-none text-ink">{ko ? '업무' : 'Jobs'}</h1>
          <p className="text-[length:calc(13.5px*var(--ts))] text-ink-2 mt-2">{d.loading ? '' : `${open.length} ${ko ? '개 진행 중' : 'open'}${overdue ? ` · ${overdue} ${ko ? '기한 지남' : 'overdue'}` : ''}${unowned ? ` · ${unowned} ${ko ? '담당 없음' : 'with nobody yet'}` : ''}${d.questions.length ? ` · ${d.questions.length} ${ko ? '질문' : d.questions.length === 1 ? 'question' : 'questions'}` : ''}`}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {tabs.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`h-8 px-3 rounded text-[length:calc(12.5px*var(--ts))] ${tab === t ? 'bg-ink text-paper font-semibold' : 'text-ink-2 hover:bg-paper-2'}`}>{l}</button>)}
        </div>
      </div>

      {d.missing ? (
        <p className="text-[length:calc(13px*var(--ts))] text-ink-2">{/* supabase/migration-admin-jobs.sql */}{needsUpdate({ en: 'admin jobs', ko: '업무' }, ko)}</p>
      ) : d.loading ? <Loading rows={6} /> : (
        <>
          {d.error && <p className="text-[length:calc(12px*var(--ts))] text-bad mb-3">{d.error}</p>}
          {tab === 'board' && (
            <>
              <div className="mb-6"><AddJob ko={ko} today={d.today} activeSemester={d.activeSemester} semesters={d.semesters} me={d.me} onAdd={onAdd} /></div>
              <GoalsBand jobs={open.filter(j => boardSection(j, d.today, semId) === 'goal')} ko={ko} today={d.today} me={currentTeacher.id} nameOf={d.nameOf} semesterName={d.semesterName} semesterStart={d.semesterStart} who={who} reload={d.reload} onOpen={j => setOpenId(j.id)} />
              <div className="grid gap-6 md:grid-cols-3">
                {columns.map(c => {
                  const mine = open.filter(j => j.owner_id === c.key || (c.key !== null && j.is_shared && accounts.some(a => a.id === c.key)))
                  // A bite rides in the section its day falls in, under the cards, unless the whole job is already a card there.
                  const sections = COLUMN_SECTIONS.map(sec => {
                    const cards = mine.filter(j => boardSection(j, d.today, semId) === sec).sort(byUrg)
                    const bs = allBites.filter(b => (b.ownerId === c.key || (b.shared && c.key !== null && accounts.some(a => a.id === c.key))) && b.section === sec && !cards.includes(b.job))
                    return { sec, cards, bites: bs }
                  }).filter(x => x.cards.length || x.bites.length)
                  const onBoard = sections.reduce((n, x) => n + x.cards.length, 0)
                  const onShelf = mine.filter(j => { const b = boardSection(j, d.today, semId); return b === 'later' || b === 'someday' }).length
                  const done = recentDone(c.key)
                  return (
                    <section key={c.key || 'none'} className="min-w-0">
                      <h2 className={`font-display text-[length:calc(22px*var(--ts))] leading-none border-b border-rule-2 pb-2 mb-3 flex items-baseline justify-between gap-2 ${c.tone || 'text-ink'}`}>{c.name}<span className="font-body text-[length:calc(12px*var(--ts))] text-ink-3 tabular-nums">{onBoard}{onShelf ? ` + ${onShelf} ${ko ? '나중에' : 'later'}` : ''}</span></h2>
                      <div className="grid gap-4">
                        {sections.map(({ sec, cards, bites: bs }) => (
                          <div key={sec}>
                            <p className={`eyebrow mb-1.5 ${sec === 'working' || sec === 'week' ? 'text-ink' : ''}`}>{BOARD_SECTION_LABELS[sec][ko ? 'ko' : 'en']} <span className="text-ink-3">· {cards.length + bs.length}</span></p>
                            <div className="grid gap-2">
                              {cards.map(j => <JobCard key={j.id} job={j} ko={ko} today={d.today} semesterName={d.semesterName(j.semester_id)} semesterStart={d.semesterStart(j.semester_id)} me={currentTeacher.id} onOpen={() => setOpenId(j.id)} />)}
                              {bs.map(b => <BiteLine key={`${b.job.id}-${b.step.id}`} bite={b} ko={ko} today={d.today} who={who} reload={d.reload} patchJob={d.patchJob} onOpen={() => setOpenId(b.job.id)} />)}
                            </div>
                          </div>
                        ))}
                        {onBoard === 0 && <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3 py-1">{onShelf ? (ko ? '두 달 안에는 없음. 아래 나중에 목록에 있습니다.' : 'Nothing in the next two months; see Later below.') : c.key === null ? (ko ? '모두 담당이 있습니다.' : 'Everything has an owner.') : (ko ? '없음.' : 'Nothing here.')}</p>}
                      </div>
                      {done.length > 0 && (
                        <div className="mt-4">
                          <p className="eyebrow mb-2">{ko ? '완료' : 'Done'} <span className="">· {ko ? '최근 2주' : 'last two weeks'}</span></p>
                          <div className="grid gap-2">{done.map(j => <JobCard key={j.id} job={j} ko={ko} today={d.today} semesterName={d.semesterName(j.semester_id)} semesterStart={d.semesterStart(j.semester_id)} me={currentTeacher.id} onOpen={() => setOpenId(j.id)} />)}</div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
              <LaterShelf jobs={open} ko={ko} today={d.today} activeSemesterId={semId} me={currentTeacher.id} nameOf={d.nameOf} semesterName={d.semesterName} semesterStart={d.semesterStart} onOpen={j => setOpenId(j.id)} />
              <OneDay jobs={open.filter(j => j.due_kind === 'oneday')} ko={ko} today={d.today} me={currentTeacher.id} nameOf={d.nameOf} onOpen={j => setOpenId(j.id)} />
            </>
          )}
          {tab === 'year' && (
            <div className="grid gap-10">
              <YearView ko={ko} today={d.today} routines={d.routines} events={d.events} jobs={d.jobs} semesters={d.semesters} nameOf={d.nameOf} onPick={id => setPick(p => ({ id, n: (p?.n || 0) + 1 }))} />
              <RoutinesPanel ko={ko} routines={d.routines} template={d.template} events={d.events} teachers={d.teachers} semesters={d.semesters} activeSemester={d.activeSemester} categories={categories} me={d.me} nameOf={d.nameOf} reload={d.reload} pick={pick} />
            </div>
          )}
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
// Everything past next month, by month, then Whenever: the same full
// cards as the columns, with the owner on each, so nothing down here is
// small enough to pretend not to see. A job comes up into its column on
// its own as its date nears, or as soon as someone sets it to In progress.
function LaterShelf({ jobs, ko, today, activeSemesterId, me, nameOf, semesterName, semesterStart, onOpen }: { jobs: AdminJob[]; ko: boolean; today: string; activeSemesterId: string | null; me: string; nameOf: (id: string | null | undefined) => string; semesterName: (id: string | null | undefined) => string | null; semesterStart: (id: string | null | undefined) => string | null; onOpen: (j: AdminJob) => void }) {
  const groups = shelf(jobs, today, activeSemesterId)
  if (groups.length === 0) return null
  const monthName = (key: string) => key === 'someday' ? BOARD_SECTION_LABELS.someday[ko ? 'ko' : 'en'] : key.startsWith('sem:') ? (semesterName(key.slice(4)) || (ko ? '학기' : 'Semester')) : ko ? `${Number(key.slice(5, 7))}월` : `${MONTH_EN[Number(key.slice(5, 7)) - 1]}${key.slice(0, 4) !== today.slice(0, 4) ? ` ${key.slice(0, 4)}` : ''}`
  const total = groups.reduce((n, g) => n + g.jobs.length, 0)
  return (
    <section className="mt-10 border-t border-rule-2 pt-4">
      <p className="eyebrow mb-3">{BOARD_SECTION_LABELS.later[ko ? 'ko' : 'en']} <span className="text-ink-3">· {total} · {ko ? '때가 되면 위로 올라옵니다' : 'each comes up into its column when its time is near'}</span></p>
      <div className="grid gap-6">
        {groups.map(g => (
          <div key={g.key}>
            <h2 className="font-display text-[length:calc(20px*var(--ts))] leading-none text-ink border-b border-rule pb-2 mb-3 flex items-baseline justify-between"><span>{monthName(g.key)}</span><span className="font-body text-[length:calc(12px*var(--ts))] text-ink-3 tabular-nums">{g.jobs.length}</span></h2>
            <div className="grid gap-2 md:grid-cols-3">
              {g.jobs.map(j => <JobCard key={j.id} job={j} ko={ko} today={today} semesterName={semesterName(j.semester_id)} semesterStart={semesterStart(j.semester_id)} me={me} ownerName={nameOf(j.owner_id)} onOpen={() => onOpen(j)} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── A bite of a long job ────────────────────────────────────────
// One dated step, shown as a slim line in the section its day falls in:
// the job's name, which step it is, and a tick. The whole job stays
// wherever it lives (the shelf, usually) with its percent.
function BiteLine({ bite, ko, today, who, reload, patchJob, onOpen }: { bite: Bite; ko: boolean; today: string; who: { id: string; name: string }; reload: () => Promise<void>; patchJob: (id: string, f: (j: AdminJob) => AdminJob) => void; onOpen: () => void }) {
  const { showToast } = useApp()
  const { job, step } = bite
  const n = job.steps.findIndex(s => s.id === step.id) + 1
  const u = urgency({ status: 'scheduled', due_kind: 'date', due_date: step.due_date! }, today)
  const tick = async () => { patchJob(job.id, j => afterStepChange(j, stepsAfterTick(j, step.id, who), new Date().toISOString())); const e = await toggleStep(job, step.id, who); if (e) showToast(`Error: ${e}`); else showToast(ko ? `완료: ${step.text}` : `Done: ${step.text}`); await reload() }
  return (
    <div className="flex items-start gap-2 border-l-2 border-rule-2 pl-2.5 py-1">
      <input type="checkbox" checked={false} onChange={tick} className="mt-1 rounded border-rule-2" aria-label={step.text} />
      <button onClick={onOpen} className="min-w-0 text-left flex-1">
        <span className="block text-[length:calc(12.5px*var(--ts))] text-ink leading-snug truncate">{step.text}{step.doing ? <span className="text-accent font-semibold"> · {ko ? '진행 중' : 'working on it'}</span> : null}{step.note ? <span className="text-ink-2 italic"> · {step.note}</span> : null}</span>
        <span className="block text-[length:calc(11.5px*var(--ts))] text-ink-3 truncate"><span className={urgencyTone(u)}>{dueLabel({ status: 'scheduled', due_kind: 'date', due_date: step.due_date }, today, ko)}</span> · {job.title} · {ko ? `${n}/${job.steps.length} 단계` : `step ${n} of ${job.steps.length}`}{percent(job) !== null ? ` · ${percent(job)}%` : ''}</span>
      </button>
    </div>
  )
}

// ─── The big jobs ────────────────────────────────────────────────
// This semester's long jobs and anything shared, wide across the top so
// they are never out of sight: progress with the pace tick, the next
// step (yours first), when it was last worked on, and the status.
function GoalsBand({ jobs, ko, today, me, nameOf, semesterName, semesterStart, who, reload, onOpen }: {
  jobs: AdminJob[]; ko: boolean; today: string; me: string; nameOf: (id: string | null | undefined) => string
  semesterName: (id: string | null | undefined) => string | null; semesterStart: (id: string | null | undefined) => string | null
  who: { id: string; name: string }; reload: () => Promise<void>; onOpen: (j: AdminJob) => void
}) {
  const { showToast } = useApp()
  if (jobs.length === 0) return null
  const sorted = [...jobs].sort((a, b) => Number(b.is_shared) - Number(a.is_shared) || (a.due_date || '9999').localeCompare(b.due_date || '9999'))
  return (
    <section className="mb-8">
      <p className="eyebrow text-ink mb-2">{BOARD_SECTION_LABELS.goal[ko ? 'ko' : 'en']} <span className="text-ink-3">· {ko ? '이번 학기의 긴 일과 함께 하는 일' : 'this semester’s long jobs, and anything shared'}</span></p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map(j => {
          const p = percent(j), e = pace(j, today), pr = progress(j), since = daysSinceTouched(j, today), nx = nextStep(j, me)
          const myOpen = j.is_shared ? j.steps.filter(s => s.owner_id === me && !s.done).length : 0
          const behind = e !== null && p !== null && e > p + 10
          return (
            <div key={j.id} className={`rounded border bg-surface p-4 grid gap-2.5 content-start ${j.is_shared ? 'border-accent' : 'border-rule-2'}`}>
              <button onClick={() => onOpen(j)} className="text-left">
                <span className="block font-display text-[length:calc(21px*var(--ts))] leading-tight text-ink">{j.title}</span>
                <span className="block text-[length:calc(11.5px*var(--ts))] text-ink-3 mt-1">
                  {j.is_shared ? <span className="text-accent font-semibold">{ko ? '함께' : 'Shared'}</span> : nameOf(j.owner_id)} · {dueLabel(j, today, ko, semesterName(j.semester_id), semesterStart(j.semester_id))}{j.category ? ` · ${j.category}` : ''} · <SizeMark size={j.size} ko={ko} />
                </span>
              </button>
              <div>
                <div className="flex items-baseline justify-between text-[length:calc(12px*var(--ts))]">
                  <span className="font-display text-[length:calc(26px*var(--ts))] leading-none text-ink tabular-nums">{p === null ? '—' : `${p}%`}</span>
                  <span className={`${behind ? 'text-warn' : 'text-ink-3'}`}>{pr ? `${pr.done}/${pr.total} ${ko ? '단계' : 'steps'}` : (ko ? '단계 없음' : 'no steps yet')}{e !== null ? ` · ${ko ? `기간의 ${e}%` : `${e}% of the time`}` : ''}</span>
                </div>
                <span className="block relative h-[6px] bg-paper-2 rounded mt-1">
                  <span className="block h-full bg-good rounded" style={{ width: `${p ?? 0}%` }} />
                  {e !== null && <span className={`absolute -top-[3px] w-px h-[12px] ${behind ? 'bg-warn' : 'bg-ink-3'}`} style={{ left: `${e}%` }} />}
                </span>
              </div>
              {nx && <p className="text-[length:calc(12.5px*var(--ts))] text-ink leading-snug"><span className={nx.doing ? 'text-accent font-semibold' : 'text-ink-3'}>{nx.doing ? (ko ? '진행 중' : 'Working on') : (ko ? '다음' : 'Next')}: </span>{nx.text}{nx.owner_id ? <span className="text-ink-3"> · {nameOf(nx.owner_id)}</span> : null}{nx.note ? <span className="block text-ink-2 italic text-[length:calc(11.5px*var(--ts))]">{nx.note}</span> : null}</p>}
              <div className="flex items-center justify-between gap-2 text-[length:calc(11.5px*var(--ts))] text-ink-3">
                <span>{since === null ? (ko ? '아직 손대지 않음' : 'not touched yet') : since === 0 ? (ko ? '오늘 작업' : 'touched today') : (ko ? `${since}일 전 작업` : `touched ${since} days ago`)}{myOpen ? <span className="text-accent"> · {myOpen} {ko ? '내 단계' : myOpen === 1 ? 'step for you' : 'steps for you'}</span> : null}</span>
                <StatusTag status={j.status} waitingOn={j.waiting_on} ko={ko} small onChange={async (st, w) => { const er = await setStatus(j, st, who, w); if (er) showToast(`Error: ${er}`); await reload() }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── One day ─────────────────────────────────────────────────────
// The wishes: what would get done if there were time. Full cards, at the
// very bottom, dashed, with no date and no owner needed. Never on the
// dashboard, never overdue. Give one a date in its panel and it becomes
// a real job.
function OneDay({ jobs, ko, today, me, nameOf, onOpen }: { jobs: AdminJob[]; ko: boolean; today: string; me: string; nameOf: (id: string | null | undefined) => string; onOpen: (j: AdminJob) => void }) {
  if (jobs.length === 0) return null
  return (
    <section className="mt-10 border-t border-dashed border-rule-2 pt-4">
      <h2 className="font-display text-[length:calc(22px*var(--ts))] leading-none text-ink mb-1">{ko ? '언젠가' : 'One day'}</h2>
      <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3 mb-3">{ko ? '여유가 생기면 하고 싶은 일. 기한도, 담당도 없어도 됩니다. 날짜를 주면 진짜 일이 됩니다.' : 'If there were time. No date, no owner needed. Give one a date in its panel and it becomes a real job.'}</p>
      <div className="grid gap-2 md:grid-cols-3">
        {jobs.sort((a, b) => a.created_at.localeCompare(b.created_at)).map(j => (
          <div key={j.id} className="rounded border border-dashed border-rule-2">
            <JobCard job={j} ko={ko} today={today} semesterName={null} semesterStart={null} me={me} ownerName={j.owner_id ? nameOf(j.owner_id) : ''} onOpen={() => onOpen(j)} />
          </div>
        ))}
      </div>
    </section>
  )
}
