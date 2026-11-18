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

export interface JobStep { id: string; text: string; done: boolean; done_by_id?: string | null; done_at?: string | null }

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
  requested_by_id: string | null
  created_by_id: string | null
  completed_by_id: string | null
  completed_at: string | null
  waiting_on: string
  steps: JobStep[]
  notes: string
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
    owner_id: r.owner_id || null, requested_by_id: r.requested_by_id || null, created_by_id: r.created_by_id || null,
    completed_by_id: r.completed_by_id || null, completed_at: r.completed_at || null, waiting_on: String(r.waiting_on || ''),
    steps: parseSteps(r.steps), notes: String(r.notes || ''), link_path: String(r.link_path || ''),
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

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function fmtDay(iso: string, ko: boolean, withWeekday = true): string {
  const d = new Date(iso + 'T12:00:00+09:00')
  return d.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', ...(withWeekday ? { weekday: 'short' as const } : {}), month: 'short', day: 'numeric' })
}

/** The due, in words: "Today", "3 days ago", "Tue, Dec 2", "By end of November", "By end of Fall 2026", "When there is time". */
export function dueLabel(job: Pick<AdminJob, 'due_kind' | 'due_date' | 'status'>, today: string, ko: boolean, semesterName?: string | null): string {
  if (job.due_kind === 'someday' || !job.due_date) return ko ? '시간 날 때' : 'When there is time'
  const d = daysBetween(today, job.due_date)
  if (job.due_kind === 'month') {
    const m = Number(job.due_date.slice(5, 7)) - 1
    const base = ko ? `${m + 1}월 말까지` : `By end of ${MONTHS_EN[m]}`
    return job.status !== 'done' && d < 0 ? (ko ? `${base} · 지남` : `${base} · passed`) : base
  }
  if (job.due_kind === 'semester') {
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
export function attention(jobs: AdminJob[], today: string, viewerId: string | null): { mine: AdminJob[]; notStartedGoals: AdminJob[]; unowned: AdminJob[] } {
  const open = jobs.filter(j => j.status !== 'done')
  const pressing = (j: AdminJob) => ['overdue', 'today', 'week'].includes(urgency(j, today))
  const mine = open.filter(j => j.owner_id === viewerId && pressing(j)).sort(byDue)
  const notStartedGoals = open.filter(j => j.owner_id === viewerId && notStarted(j, today) && !pressing(j)).sort(byDue)
  const unowned = open.filter(j => !j.owner_id && !j.parent_id).sort(byDue)
  return { mine, notStartedGoals, unowned }
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
    owner_id: t.default_owner_id, requested_by_id: null, created_by_id: createdBy, completed_by_id: null, completed_at: null,
    waiting_on: '', steps: t.steps.map((s, i) => ({ id: `s${i + 1}`, text: s.text, done: false, done_by_id: null, done_at: null })),
    notes: '', link_path: t.link_path, parent_id: null, event_id: event.id, routine_job_id: t.id,
  }))
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
