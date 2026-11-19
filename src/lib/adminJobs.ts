// ─── Admin jobs: the words and the arithmetic ────────────────────
// The office and admin work for the two admin accounts. A job is one line
// of work with a size, a category, an owner and a due that may be a day,
// the end of a month, the end of the semester, or nothing ("when there is
// time"). Big jobs carry steps and can be split into child jobs. A routine
// is a yearly template: an event with jobs at day offsets from its date.
// Pure: no DOM, no database; tested in src/lib/__tests__/adminJobs.test.ts.

import { addDays } from '@/lib/officeJobs'

export type JobSize = 'XS' | 'S' | 'M' | 'L'
export type JobStatus = 'scheduled' | 'in_progress' | 'waiting' | 'done'
export type DueKind = 'date' | 'month' | 'semester' | 'someday'
export type RoutineAnchor = 'date' | 'semester_start' | 'midterm_cutoff' | 'report_card_cutoff' | 'semester_end'

export interface JobStep { id: string; text: string; done: boolean; done_by_id?: string | null; done_at?: string | null; /** Who this step is for, when a job is shared; null means whoever owns the job. */ owner_id?: string | null; /** A day this step is for, so a long job surfaces a bite at a time. */ due_date?: string | null; /** Started but not finished. */ doing?: boolean; /** Where it is up to, in a few words. */ note?: string | null }

export interface AdminJob {
  id: string
  title: string
  category: string
  size: JobSize
  status: JobStatus
  due_kind: DueKind
  due_date: string | null
  semester_id: string | null
  owner_id: string | null
  /** Both accounts own it; the steps say whose each piece is. Shows in both columns. */
  is_shared: boolean
  requested_by_id: string | null
  created_by_id: string | null
  completed_by_id: string | null
  completed_at: string | null
  waiting_on: string
  steps: JobStep[]
  notes: string
  /** One line on what happened, written when it was marked done. */
  done_note: string
  /** The last time someone worked on it, and how many stints so far. */
  touched_at: string | null
  touch_count: number
  link_path: string
  parent_id: string | null
  event_id: string | null
  routine_job_id: string | null
  created_at: string
  updated_at: string
}

export interface AdminRoutine { id: string; name: string; category: string; anchor: RoutineAnchor; notes: string; sort_order: number }
export interface AdminRoutineJob { id: string; routine_id: string; title: string; offset_days: number; default_owner_id: string | null; size: JobSize; steps: { text: string }[]; link_path: string; sort_order: number }
export interface AdminEvent { id: string; routine_id: string; semester_id: string | null; label: string; event_date: string; created_by_id: string | null; created_at: string }
export interface AdminJobHistory { id: string; job_id: string; action: string; by_id: string | null; from_id: string | null; to_id: string | null; note: string; at: string }
export interface AdminJobQuestion { id: string; job_id: string; asked_by_id: string | null; question: string; answer: string | null; answered_by_id: string | null; answered_at: string | null; created_at: string }

export const SIZES: JobSize[] = ['XS', 'S', 'M', 'L']
/** How big a job is, in words. No hours: the sizes are a feel, not a timesheet. */
export const SIZE_LABELS: Record<JobSize, { en: string; ko: string }> = {
  XS: { en: 'A few minutes', ko: '몇 분' }, S: { en: 'An hour or so', ko: '한 시간쯤' }, M: { en: 'Half a day', ko: '반나절' }, L: { en: 'Several days', ko: '며칠' },
}
export const STATUSES: JobStatus[] = ['scheduled', 'in_progress', 'waiting', 'done']
export const STATUS_LABELS: Record<JobStatus, { en: string; ko: string }> = {
  scheduled: { en: 'Scheduled', ko: '예정' }, in_progress: { en: 'In progress', ko: '진행 중' }, waiting: { en: 'Waiting', ko: '대기' }, done: { en: 'Done', ko: '완료' },
}
export const DUE_KINDS: DueKind[] = ['date', 'month', 'semester', 'someday']
export const DUE_KIND_LABELS: Record<DueKind, { en: string; ko: string }> = {
  date: { en: 'On a day', ko: '날짜' }, month: { en: 'By the end of a month', ko: '월말까지' }, semester: { en: 'By the end of the semester', ko: '학기말까지' }, someday: { en: 'When there is time', ko: '시간 날 때' },
}
export const ANCHOR_LABELS: Record<RoutineAnchor, { en: string; ko: string }> = {
  date: { en: 'A date you type', ko: '직접 입력' }, semester_start: { en: 'First day of the semester', ko: '학기 시작일' }, midterm_cutoff: { en: 'Midterm cutoff', ko: '중간 마감' }, report_card_cutoff: { en: 'Report card grades due', ko: '성적표 마감' }, semester_end: { en: 'Last day of the semester', ko: '학기 종료일' },
}
/** Categories offered when adding; anything typed is kept too. */
export const DEFAULT_CATEGORIES = ['Report cards', 'Open Class', 'Books', 'Level tests', 'Breaks', 'Events', 'Office Week', 'Staff', 'Lesson plans', 'Supplies', 'Observations', 'Polls', 'Student work', 'Office']

/** Long-term goals (month, semester) start to need attention this many days out. */
export const GOAL_WARNING_DAYS = 14
/** A long-term goal still 'scheduled' this close to its end is called not started. */
export const GOAL_NOT_STARTED_DAYS = 30

export const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

/** Steps as saved, tolerant of anything missing or wrong. */
export function parseSteps(raw: unknown): JobStep[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(s => s && typeof s.text === 'string' && s.text.trim()).map((s: any, i: number) => ({
    id: typeof s.id === 'string' && s.id ? s.id : `s${i + 1}`, text: String(s.text), done: !!s.done,
    done_by_id: typeof s.done_by_id === 'string' ? s.done_by_id : null, done_at: typeof s.done_at === 'string' ? s.done_at : null,
    owner_id: typeof s.owner_id === 'string' ? s.owner_id : null, due_date: typeof s.due_date === 'string' && s.due_date ? s.due_date : null,
    doing: !!s.doing && !s.done, note: typeof s.note === 'string' && s.note.trim() ? s.note.trim() : null,
  }))
}
/** Template steps: text only, in order. */
export function parseTemplateSteps(raw: unknown): { text: string }[] {
  if (!Array.isArray(raw)) return []
  return raw.map((s: any) => (typeof s === 'string' ? { text: s } : s && typeof s.text === 'string' ? { text: s.text } : null)).filter((s): s is { text: string } => !!s && !!s.text.trim())
}
/** A database row as the app wants it. */
export function parseJob(r: any): AdminJob {
  return {
    id: String(r.id), title: String(r.title || ''), category: String(r.category || ''),
    size: SIZES.includes(r.size) ? r.size : 'S', status: STATUSES.includes(r.status) ? r.status : 'scheduled',
    due_kind: DUE_KINDS.includes(r.due_kind) ? r.due_kind : 'someday', due_date: r.due_date || null, semester_id: r.semester_id || null,
    owner_id: r.owner_id || null, is_shared: !!r.is_shared, requested_by_id: r.requested_by_id || null, created_by_id: r.created_by_id || null,
    completed_by_id: r.completed_by_id || null, completed_at: r.completed_at || null, waiting_on: String(r.waiting_on || ''),
    steps: parseSteps(r.steps), notes: String(r.notes || ''), done_note: String(r.done_note || ''), touched_at: r.touched_at || null, touch_count: Number(r.touch_count) || 0, link_path: String(r.link_path || ''),
    parent_id: r.parent_id || null, event_id: r.event_id || null, routine_job_id: r.routine_job_id || null,
    created_at: String(r.created_at || ''), updated_at: String(r.updated_at || ''),
  }
}
export function parseRoutineJob(r: any): AdminRoutineJob {
  return { id: String(r.id), routine_id: String(r.routine_id), title: String(r.title || ''), offset_days: Number(r.offset_days) || 0, default_owner_id: r.default_owner_id || null, size: SIZES.includes(r.size) ? r.size : 'S', steps: parseTemplateSteps(r.steps), link_path: String(r.link_path || ''), sort_order: Number(r.sort_order) || 0 }
}

// ─── Dates ───────────────────────────────────────────────────────

/** The last day of the month a date is in. */
export function endOfMonth(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m, 0))
  return d.toISOString().slice(0, 10)
}
export const daysBetween = (from: string, to: string) => Math.round((Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10)) - Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))) / 86400000)

/**
 * The due date to store for a kind: the day itself, the month's last day, the
 * semester's end, or nothing. `pick` is the typed day (or any day of the month).
 */
export function dueDateFor(kind: DueKind, pick: string | null, semesterEnd: string | null): string | null {
  if (kind === 'date') return pick || null
  if (kind === 'month') return pick ? endOfMonth(pick) : null
  if (kind === 'semester') return semesterEnd || null
  return null
}

export type Urgency = 'overdue' | 'today' | 'week' | 'soon' | 'later' | 'someday' | 'done'

/** How pressing a job is today. Long-term goals count as 'week' for their last two weeks. */
export function urgency(job: Pick<AdminJob, 'status' | 'due_kind' | 'due_date'>, today: string): Urgency {
  if (job.status === 'done') return 'done'
  if (job.due_kind === 'someday' || !job.due_date) return 'someday'
  const d = daysBetween(today, job.due_date)
  if (d < 0) return 'overdue'
  if (job.due_kind === 'date') return d === 0 ? 'today' : d <= 7 ? 'week' : d <= 28 ? 'soon' : 'later'
  return d <= GOAL_WARNING_DAYS ? 'week' : d <= 45 ? 'soon' : 'later'
}

/** A long-term goal that is still 'scheduled' with a month or less to go. */
export function notStarted(job: Pick<AdminJob, 'status' | 'due_kind' | 'due_date'>, today: string): boolean {
  if (job.status !== 'scheduled' || job.due_kind === 'date' || job.due_kind === 'someday' || !job.due_date) return false
  const d = daysBetween(today, job.due_date)
  return d >= 0 && d <= GOAL_NOT_STARTED_DAYS
}

/** Steps done out of steps total; null when there are none. */
export function progress(job: Pick<AdminJob, 'steps'>): { done: number; total: number } | null {
  if (!job.steps.length) return null
  return { done: job.steps.filter(s => s.done).length, total: job.steps.length }
}

/** The first step not done yet, for the viewer first when one is theirs. */
export function nextStep(job: Pick<AdminJob, 'steps'>, viewerId: string | null = null): JobStep | null {
  const open = job.steps.filter(s => !s.done)
  const mine = (s: JobStep) => !!viewerId && s.owner_id === viewerId
  return open.find(s => s.doing && mine(s)) || open.find(s => s.doing) || open.find(mine) || open[0] || null
}

/** The step being worked on right now, if any. */
export const doingStep = (job: Pick<AdminJob, 'steps'>): JobStep | null => job.steps.find(s => s.doing && !s.done) || null

/**
 * The job after a step changes: ticking or starting a step means the job
 * is in progress (unless it was waiting) and was worked on today.
 */
export function afterStepChange(job: AdminJob, steps: JobStep[], now: string): AdminJob {
  const status = job.status === 'scheduled' ? 'in_progress' : job.status
  return { ...job, steps, status, touched_at: now }
}

/** Steps done as a whole percent; null when there are no steps. */
export function percent(job: Pick<AdminJob, 'steps'>): number | null {
  const p = progress(job)
  return p ? Math.round(100 * p.done / p.total) : null
}

/**
 * Where the work should be by today if the steps were spread evenly from
 * the day the job was made to its due date, as a percent; null when there
 * is nothing to pace (no steps, no date, or not started yet).
 */
export function pace(job: Pick<AdminJob, 'steps' | 'due_date' | 'created_at' | 'status'>, today: string): number | null {
  if (!job.steps.length || !job.due_date || !job.created_at || job.status === 'done') return null
  const from = toKstDay(job.created_at)
  const total = daysBetween(from, job.due_date)
  if (total <= 0) return 100
  return Math.max(0, Math.min(100, Math.round(100 * daysBetween(from, today) / total)))
}

/** How long since it was last worked on, in days; null if never. */
export function daysSinceTouched(job: Pick<AdminJob, 'touched_at'>, today: string): number | null {
  return job.touched_at ? daysBetween(toKstDay(job.touched_at), today) : null
}

/** A dated step on an open job: a bite of a long job, with where it sits on the board. */
export interface Bite { job: AdminJob; step: JobStep; section: BoardSection; ownerId: string | null; /** On a shared job with no one named on the step: either person's. */ shared: boolean }

/**
 * Every undone step that has its own day, as a bite. A bite belongs to the
 * step's own person when one is set, else the job's owner, and sits in the
 * section its day falls in, so a semester-long job shows one piece this
 * week while the whole stays on the shelf.
 */
export function bites(jobs: AdminJob[], today: string): Bite[] {
  const out: Bite[] = []
  jobs.filter(j => j.status !== 'done').forEach(job => job.steps.forEach(step => {
    if (step.done || !step.due_date) return
    const section = boardSection({ status: 'scheduled', due_kind: 'date', due_date: step.due_date, semester_id: null, is_shared: false }, today)
    if (section) out.push({ job, step, section, ownerId: step.owner_id || job.owner_id, shared: job.is_shared && !step.owner_id })
  }))
  return out.sort((a, b) => a.step.due_date!.localeCompare(b.step.due_date!))
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function fmtDay(iso: string, ko: boolean, withWeekday = true): string {
  const d = new Date(iso + 'T12:00:00+09:00')
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', ...(withWeekday ? { weekday: 'short' as const } : {}), month: 'short', day: 'numeric' })
}

/** The due, in words: "Today", "3 days ago", "Tue, Dec 2", "By end of November", "By end of Fall 2026", "When there is time". */
export function dueLabel(job: Pick<AdminJob, 'due_kind' | 'due_date' | 'status'>, today: string, ko: boolean, semesterName?: string | null, semesterStart?: string | null): string {
  if (job.due_kind === 'someday' || !job.due_date) return ko ? '시간 날 때' : 'When there is time'
  const d = daysBetween(today, job.due_date)
  if (job.due_kind === 'month') {
    const m = Number(job.due_date.slice(5, 7)) - 1
    const base = ko ? `${m + 1}월 말까지` : `By end of ${MONTHS_EN[m]}`
    return job.status !== 'done' && d < 0 ? (ko ? `${base} · 지남` : `${base} · passed`) : base
  }
  if (job.due_kind === 'semester') {
    // A semester that has not started yet reads as "next semester", not as a deadline.
    if (semesterStart && semesterStart > today) return ko ? `다음 학기 · ${semesterName || ''}`.trim() : `Next semester${semesterName ? ` · ${semesterName}` : ''}`
    const base = ko ? `${semesterName || '학기'} 말까지` : `By end of ${semesterName || 'the semester'}`
    return job.status !== 'done' && d < 0 ? (ko ? `${base} · 지남` : `${base} · passed`) : base
  }
  if (job.status === 'done') return fmtDay(job.due_date, ko)
  if (d === 0) return ko ? '오늘' : 'Today'
  if (d === 1) return ko ? '내일' : 'Tomorrow'
  if (d === -1) return ko ? '어제' : 'Yesterday'
  if (d < 0) return ko ? `${-d}일 지남` : `${-d} days ago`
  return fmtDay(job.due_date, ko)
}

// ─── Grouping for the page and the dashboard ─────────────────────

export type Section = 'overdue' | 'today' | 'week' | 'soon' | 'later' | 'month' | 'semester' | 'someday'
export const SECTION_LABELS: Record<Section, { en: string; ko: string }> = {
  overdue: { en: 'Overdue', ko: '기한 지남' }, today: { en: 'Today', ko: '오늘' }, week: { en: 'This week', ko: '이번 주' }, soon: { en: 'Coming up', ko: '다가오는' }, later: { en: 'Later', ko: '나중에' },
  month: { en: 'By the end of the month', ko: '월말까지' }, semester: { en: 'By the end of the semester', ko: '학기말까지' }, someday: { en: 'When there is time', ko: '시간 날 때' },
}
const SECTION_ORDER: Section[] = ['overdue', 'today', 'week', 'soon', 'month', 'semester', 'later', 'someday']

/** Which section of the Up next list a job belongs in. Goals with two weeks or less left join the week. */
export function sectionOf(job: Pick<AdminJob, 'status' | 'due_kind' | 'due_date'>, today: string): Section | null {
  const u = urgency(job, today)
  if (u === 'done') return null
  if (u === 'overdue' || u === 'today' || u === 'week' || u === 'someday') return u
  if (job.due_kind === 'month') return 'month'
  if (job.due_kind === 'semester') return 'semester'
  return u
}

const byDue = (a: AdminJob, b: AdminJob) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.created_at.localeCompare(b.created_at)

/** Open top-level jobs in sections, in the order the page shows them. Children ride with their parent. */
export function groupOpen(jobs: AdminJob[], today: string): { section: Section; jobs: AdminJob[] }[] {
  const out: Record<string, AdminJob[]> = {}
  jobs.filter(j => !j.parent_id).forEach(j => { const s = sectionOf(j, today); if (s) (out[s] ||= []).push(j) })
  return SECTION_ORDER.filter(s => out[s]).map(s => ({ section: s, jobs: out[s].sort(byDue) }))
}

/** What the dashboard shows: the viewer's overdue, today and this-week jobs, then goals not started, then anyone's unowned. */
export function attention(jobs: AdminJob[], today: string, viewerId: string | null): { mine: AdminJob[]; myBites: Bite[]; notStartedGoals: AdminJob[]; unowned: AdminJob[]; shared: AdminJob[] } {
  const open = jobs.filter(j => j.status !== 'done')
  const pressing = (j: AdminJob) => ['overdue', 'today', 'week'].includes(urgency(j, today))
  const mine = open.filter(j => (j.owner_id === viewerId || (j.is_shared && viewerId)) && pressing(j)).sort(byDue)
  const myBites = bites(open, today).filter(b => (b.ownerId === viewerId || (b.shared && viewerId)) && b.section === 'week' && !mine.includes(b.job))
  const notStartedGoals = open.filter(j => (j.owner_id === viewerId || (j.is_shared && viewerId)) && notStarted(j, today) && !pressing(j)).sort(byDue)
  const unowned = open.filter(j => !j.owner_id && !j.is_shared && !j.parent_id).sort(byDue)
  const shared = open.filter(j => j.is_shared && !mine.includes(j) && !notStartedGoals.includes(j)).sort(byDue)
  return { mine, myBites, notStartedGoals, unowned, shared }
}

/** Done jobs by the day they were finished, newest day first. */
export function doneByDay(jobs: AdminJob[]): { day: string; jobs: AdminJob[] }[] {
  const out: Record<string, AdminJob[]> = {}
  jobs.filter(j => j.status === 'done' && j.completed_at).forEach(j => { const day = toKstDay(j.completed_at!); (out[day] ||= []).push(j) })
  return Object.keys(out).sort((a, b) => b.localeCompare(a)).map(day => ({ day, jobs: out[day].sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')) }))
}
export const toKstDay = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10)

/** Done jobs in [from, to] counted per person and per category, with the sizes. */
export function termSummary(jobs: AdminJob[], from: string, to: string): { byPerson: Record<string, { total: number; byCategory: Record<string, number>; bySize: Record<JobSize, number> }>; categories: string[] } {
  const byPerson: Record<string, { total: number; byCategory: Record<string, number>; bySize: Record<JobSize, number> }> = {}
  const cats = new Set<string>()
  jobs.filter(j => j.status === 'done' && j.completed_at).forEach(j => {
    const day = toKstDay(j.completed_at!)
    if (day < from || day > to) return
    const who = j.completed_by_id || 'unknown'
    const p = (byPerson[who] ||= { total: 0, byCategory: {}, bySize: { XS: 0, S: 0, M: 0, L: 0 } })
    p.total++
    const c = j.category || (j.parent_id ? 'Part of a bigger job' : 'Other')
    cats.add(c); p.byCategory[c] = (p.byCategory[c] || 0) + 1
    p.bySize[j.size]++
  })
  return { byPerson, categories: Array.from(cats).sort() }
}

/** Categories in use, the defaults first, for the pickers. */
export function categoriesInUse(jobs: { category: string }[], routines: { category: string }[] = []): string[] {
  const seen = new Set<string>(DEFAULT_CATEGORIES)
  jobs.forEach(j => { if (j.category.trim()) seen.add(j.category.trim()) })
  routines.forEach(r => { if (r.category.trim()) seen.add(r.category.trim()) })
  return Array.from(seen)
}

// ─── Routines ────────────────────────────────────────────────────

/** The event date a routine's anchor points at in a semester, or null when that date is not set. */
export function anchorDate(anchor: RoutineAnchor, sem: { start_date?: string | null; end_date?: string | null; midterm_cutoff_date?: string | null; report_card_cutoff_date?: string | null; grades_due_date?: string | null } | null | undefined): string | null {
  if (!sem) return null
  switch (anchor) {
    case 'semester_start': return sem.start_date || null
    case 'semester_end': return sem.end_date || null
    case 'midterm_cutoff': return sem.midterm_cutoff_date || null
    case 'report_card_cutoff': return sem.report_card_cutoff_date || sem.grades_due_date || null
    default: return null
  }
}

export type JobDraft = Omit<AdminJob, 'id' | 'created_at' | 'updated_at'>

/** Every job a routine's template makes for one event, dated from the event. Nothing is owned unless the template says so. */
export function jobsForEvent(routine: AdminRoutine, template: AdminRoutineJob[], event: Pick<AdminEvent, 'id' | 'event_date' | 'semester_id'>, createdBy: string | null): JobDraft[] {
  return [...template].sort((a, b) => a.sort_order - b.sort_order || a.offset_days - b.offset_days).map(t => ({
    title: t.title, category: routine.category, size: t.size, status: 'scheduled' as JobStatus,
    due_kind: 'date' as DueKind, due_date: addDays(event.event_date, t.offset_days), semester_id: event.semester_id,
    owner_id: t.default_owner_id, is_shared: false, requested_by_id: null, created_by_id: createdBy, completed_by_id: null, completed_at: null,
    waiting_on: '', steps: t.steps.map((s, i) => ({ id: `s${i + 1}`, text: s.text, done: false, done_by_id: null, done_at: null, owner_id: null, due_date: null, doing: false, note: null })),
    notes: '', done_note: '', touched_at: null, touch_count: 0, link_path: t.link_path, parent_id: null, event_id: event.id, routine_job_id: t.id,
  }))
}

/** Lines typed or pasted into the steps box, one step per line; numbering, dashes and bullets are stripped. */
export function parseStepLines(text: string): string[] {
  return text.split('\n').map(l => l.replace(/^\s*(?:[-*•·]|\d+[.)]|step\s*\d+[:.])\s*/i, '').trim()).filter(Boolean)
}

/** The Friday of this week, or next Friday when today is Friday or the weekend. */
export function thisFriday(today: string): string {
  const dow = new Date(today + 'T12:00:00Z').getUTCDay()
  const ahead = (5 - dow + 7) % 7
  return addDays(today, ahead === 0 ? 7 : ahead)
}

/** The semester after the one running now: the earliest that starts after today. */
export function nextSemester<T extends { start_date?: string | null; is_archived?: boolean }>(semesters: T[], today: string): T | null {
  return semesters.filter(s => s.start_date && s.start_date > today && !s.is_archived).sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0] || null
}

/** The two accounts that own jobs: the Snapdragon teacher and the admin account, in that order. */
export function adminAccounts<T extends { role?: string; english_class?: string; is_active?: boolean }>(teachers: T[]): T[] {
  const snap = teachers.find(t => t.english_class === 'Snapdragon' && t.is_active !== false)
  const admin = teachers.find(t => t.role === 'admin' && t.is_active !== false)
  return [snap, admin].filter((t): t is T => !!t)
}

// ─── The board ───────────────────────────────────────────────────

export type BoardSection = 'goal' | 'working' | 'week' | 'month' | 'nextmonth' | 'later' | 'someday'
export const BOARD_SECTION_LABELS: Record<BoardSection, { en: string; ko: string }> = {
  goal: { en: 'Big jobs', ko: '큰 일' }, working: { en: 'Working on', ko: '진행 중' }, week: { en: 'This week', ko: '이번 주' }, month: { en: 'Later this month', ko: '이달 중' }, nextmonth: { en: 'Next month', ko: '다음 달' }, later: { en: 'Later', ko: '나중에' }, someday: { en: 'Whenever', ko: '언제든' },
}

/** The YYYY-MM after a date's month. */
export const nextMonthKey = (iso: string) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}` }
/** The last day of the month after a date's month. */
export const endOfNextMonth = (iso: string) => endOfMonth(nextMonthKey(iso) + '-01')

/**
 * Where an open job sits on the board. This semester's long jobs are a
 * band of their own above the columns. Started jobs come first whatever
 * their date. Then this week, the rest of this month, and next month.
 * Everything further out, and every semester goal until its last two
 * weeks, is on the Later shelf under the columns; undated jobs are
 * Whenever, at the shelf's end. A by-end-of-month goal sits with its month.
 */
export function boardSection(job: Pick<AdminJob, 'status' | 'due_kind' | 'due_date' | 'semester_id' | 'is_shared'>, today: string, activeSemesterId: string | null = null): BoardSection | null {
  if (job.status === 'done') return null
  // The big ones, their own band at the top whatever their status: this semester's long jobs, and anything shared.
  if (job.is_shared || (job.due_kind === 'semester' && job.semester_id && job.semester_id === activeSemesterId)) return 'goal'
  if (job.status === 'in_progress' || job.status === 'waiting') return 'working'
  const u = urgency(job, today)
  if (u === 'someday') return 'someday'
  if (u === 'overdue' || u === 'today' || u === 'week') return 'week'
  if (job.due_kind === 'semester') return 'later'
  const key = job.due_date!.slice(0, 7)
  if (key === today.slice(0, 7)) return 'month'
  if (key === nextMonthKey(today)) return 'nextmonth'
  return 'later'
}

// ─── The year ────────────────────────────────────────────────────

/** The school year a date is in: March to the end of February. */
export function schoolYear(today: string): { from: string; to: string; months: string[] } {
  const y = +today.slice(0, 4), m = +today.slice(5, 7)
  const start = m >= 3 ? y : y - 1
  const months: string[] = []
  for (let i = 0; i < 12; i++) { const mm = ((2 + i) % 12) + 1; months.push(`${mm < 3 ? start + 1 : start}-${String(mm).padStart(2, '0')}`) }
  return { from: `${start}-03-01`, to: endOfMonth(`${start + 1}-02-01`), months }
}

/** Where a date falls across a span, 0 to 1; outside the span, null. */
export function spanFraction(iso: string, from: string, to: string): number | null {
  if (iso < from || iso > to) return null
  const total = daysBetween(from, to)
  return total <= 0 ? 0 : daysBetween(from, iso) / total
}

/** The Later shelf: far-off jobs by month, then Whenever, each sorted by date. */
export function shelf(jobs: AdminJob[], today: string, activeSemesterId: string | null = null): { key: string; jobs: AdminJob[] }[] {
  // Keys: 'YYYY-MM' for dated jobs and month goals, 'sem:<id>' for next-semester goals, 'someday' last; groups in date order.
  const out: Record<string, AdminJob[]> = {}
  jobs.filter(j => !j.parent_id).forEach(j => {
    const s = boardSection(j, today, activeSemesterId)
    if (s === 'later') (out[j.due_kind === 'semester' && j.semester_id ? `sem:${j.semester_id}` : j.due_date!.slice(0, 7)] ||= []).push(j)
    else if (s === 'someday') (out['someday'] ||= []).push(j)
  })
  const byDate = (a: AdminJob, b: AdminJob) => (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.created_at.localeCompare(b.created_at)
  const first = (k: string) => k === 'someday' ? '9999' : k.startsWith('sem:') ? (out[k].map(j => j.due_date || '9999').sort()[0]) : k
  const keys = Object.keys(out).sort((a, b) => first(a).localeCompare(first(b)) || a.localeCompare(b))
  return keys.map(key => ({ key, jobs: out[key].sort(byDate) }))
}

/** A question and its answer as one step, so the how-to grows: "Q: … → A: …". */
export const answerStepText = (question: string, answer: string) => `${question.trim()} → ${answer.trim()}`

/** The offset in words: "28 days before", "On the day", "3 days after". */
export function offsetLabel(days: number, ko: boolean): string {
  if (days === 0) return ko ? '당일' : 'On the day'
  const n = Math.abs(days)
  if (ko) return `${n}일 ${days < 0 ? '전' : '후'}`
  return `${n} day${n === 1 ? '' : 's'} ${days < 0 ? 'before' : 'after'}`
}
