import { describe, it, expect } from 'vitest'
import { endOfMonth, dueDateFor, urgency, notStarted, dueLabel, sectionOf, groupOpen, attention, doneByDay, termSummary, jobsForEvent, parseSteps, parseJob, offsetLabel, parseStepLines, thisFriday, adminAccounts, boardSection, shelf, nextSemester, schoolYear, spanFraction, endOfNextMonth, percent, pace, bites, daysSinceTouched, type AdminJob } from '@/lib/adminJobs'

const job = (over: Partial<AdminJob> = {}): AdminJob => ({
  id: 'j', title: 'Send comment template', category: 'Report cards', size: 'S', status: 'scheduled', due_kind: 'date', due_date: '2026-11-26', semester_id: null,
  owner_id: 'kyla', is_shared: false, requested_by_id: null, created_by_id: 'kyla', completed_by_id: null, completed_at: null, waiting_on: '', steps: [], notes: '', link_path: '',
  done_note: '', touched_at: null, touch_count: 0, parent_id: null, event_id: null, routine_job_id: null, created_at: '2026-11-19T00:00:00Z', updated_at: '2026-11-19T00:00:00Z', ...over,
})
const today = '2026-11-19'

describe('dates', () => {
  it('finds the end of a month, leap years included', () => {
    expect(endOfMonth('2026-11-19')).toBe('2026-11-30')
    expect(endOfMonth('2028-02-03')).toBe('2028-02-29')
    expect(endOfMonth('2026-12-01')).toBe('2026-12-31')
  })
  it('stores the right due date for each kind', () => {
    expect(dueDateFor('date', '2026-12-02', null)).toBe('2026-12-02')
    expect(dueDateFor('month', '2026-12-02', null)).toBe('2026-12-31')
    expect(dueDateFor('semester', '2026-12-02', '2027-01-08')).toBe('2027-01-08')
    expect(dueDateFor('semester', null, null)).toBeNull()
    expect(dueDateFor('someday', '2026-12-02', '2027-01-08')).toBeNull()
  })
})

describe('urgency', () => {
  it('reads a dated job against today', () => {
    expect(urgency(job({ due_date: '2026-11-18' }), today)).toBe('overdue')
    expect(urgency(job({ due_date: today }), today)).toBe('today')
    expect(urgency(job({ due_date: '2026-11-25' }), today)).toBe('week')
    expect(urgency(job({ due_date: '2026-12-10' }), today)).toBe('soon')
    expect(urgency(job({ due_date: '2027-02-01' }), today)).toBe('later')
    expect(urgency(job({ status: 'done' }), today)).toBe('done')
  })
  it('a job with no date is never overdue', () => {
    expect(urgency(job({ due_kind: 'someday', due_date: null }), today)).toBe('someday')
    expect(dueLabel(job({ due_kind: 'someday', due_date: null }), today, false)).toBe('When there is time')
  })
  it('a long-term goal presses only in its last two weeks', () => {
    const goal = job({ due_kind: 'semester', due_date: '2027-01-08' })
    expect(urgency(goal, '2026-11-19')).toBe('later')
    expect(urgency(goal, '2026-12-01')).toBe('soon')
    expect(urgency(goal, '2026-12-28')).toBe('week')
    expect(urgency(goal, '2027-01-09')).toBe('overdue')
  })
  it('a goal still scheduled a month out is not started', () => {
    const goal = job({ due_kind: 'month', due_date: '2026-11-30' })
    expect(notStarted(goal, today)).toBe(true)
    expect(notStarted({ ...goal, status: 'in_progress' }, today)).toBe(false)
    expect(notStarted({ ...goal, due_date: '2027-01-31' }, today)).toBe(false)
    expect(notStarted(job(), today)).toBe(false)
  })
})

describe('labels', () => {
  it('says the due in words', () => {
    expect(dueLabel(job({ due_date: today }), today, false)).toBe('Today')
    expect(dueLabel(job({ due_date: '2026-11-20' }), today, false)).toBe('Tomorrow')
    expect(dueLabel(job({ due_date: '2026-11-16' }), today, false)).toBe('3 days ago')
    expect(dueLabel(job({ due_kind: 'month', due_date: '2026-11-30' }), today, false)).toBe('By end of November')
    expect(dueLabel(job({ due_kind: 'month', due_date: '2026-10-31' }), today, false)).toBe('By end of October · passed')
    expect(dueLabel(job({ due_kind: 'semester', due_date: '2027-01-08' }), today, false, 'Fall 2026', '2026-08-17')).toBe('By end of Fall 2026')
    expect(dueLabel(job({ due_kind: 'semester', due_date: '2027-08-01' }), today, false, 'Spring 2027', '2027-03-02')).toBe('Next semester · Spring 2027')
  })
  it('offsets in words', () => {
    expect(offsetLabel(-28, false)).toBe('28 days before')
    expect(offsetLabel(0, false)).toBe('On the day')
    expect(offsetLabel(1, false)).toBe('1 day after')
  })
})

describe('grouping', () => {
  const jobs = [
    job({ id: 'a', due_date: '2026-11-10' }),
    job({ id: 'b', due_date: today }),
    job({ id: 'c', due_date: '2026-11-24' }),
    job({ id: 'd', due_kind: 'month', due_date: '2026-12-31' }),
    job({ id: 'e', due_kind: 'semester', due_date: '2027-01-08' }),
    job({ id: 'f', due_kind: 'someday', due_date: null, owner_id: null }),
    job({ id: 'g', status: 'done', completed_at: '2026-11-18T08:00:00Z', completed_by_id: 'victoria' }),
    job({ id: 'h', parent_id: 'e', due_date: '2026-12-20' }),
  ]
  it('puts each open job in its section and keeps children with their parent', () => {
    expect(sectionOf(jobs[3], today)).toBe('month')
    expect(sectionOf(jobs[4], today)).toBe('semester')
    expect(sectionOf(jobs[3], '2026-12-20')).toBe('week')
    const g = groupOpen(jobs, today)
    expect(g.map(s => s.section)).toEqual(['overdue', 'today', 'week', 'month', 'semester', 'someday'])
    expect(g.flatMap(s => s.jobs.map(j => j.id))).not.toContain('h')
    expect(g.flatMap(s => s.jobs.map(j => j.id))).not.toContain('g')
  })
  it('the dashboard sees the viewer’s pressing jobs, stalled goals and the unowned', () => {
    const a = attention(jobs, '2026-12-10', 'kyla')
    expect(a.mine.map(j => j.id)).toEqual(['a', 'b', 'c'])
    expect(a.notStartedGoals.map(j => j.id)).toEqual(['d', 'e'])
    expect(a.unowned.map(j => j.id)).toEqual(['f'])
    expect(attention(jobs, '2026-12-10', 'victoria').mine).toEqual([])
    expect(attention(jobs, today, 'kyla').notStartedGoals).toEqual([])
    const sharedJob = job({ id: 'sh', owner_id: null, is_shared: true, due_date: today })
    expect(attention([sharedJob], today, 'victoria').mine.map(j => j.id)).toEqual(['sh'])
    expect(attention([sharedJob], today, 'victoria').unowned).toEqual([])
  })
  it('logs done jobs by the Korean day', () => {
    const log = doneByDay([...jobs, job({ id: 'i', status: 'done', completed_at: '2026-11-18T16:30:00Z' })])
    expect(log.map(d => d.day)).toEqual(['2026-11-19', '2026-11-18'])
    expect(log[0].jobs.map(j => j.id)).toEqual(['i'])
  })
  it('counts the term per person and category, no hours anywhere', () => {
    const s = termSummary([...jobs, job({ id: 'i', status: 'done', completed_at: '2026-11-18T16:30:00Z', completed_by_id: 'victoria', category: 'Supplies', size: 'L' })], '2026-08-17', '2027-01-08')
    expect(s.byPerson.victoria.total).toBe(2)
    expect(s.byPerson.victoria.byCategory).toEqual({ 'Report cards': 1, Supplies: 1 })
    expect(s.byPerson.victoria.bySize.L).toBe(1)
    expect(s.categories).toEqual(['Report cards', 'Supplies'])
    expect(Object.keys(s.byPerson)).toEqual(['victoria'])
  })
})

describe('routines', () => {
  it('dates every template job from the event and copies the steps unticked', () => {
    const routine = { id: 'r', name: 'Report cards', category: 'Report cards', anchor: 'report_card_cutoff' as const, notes: '', sort_order: 0 }
    const template = [
      { id: 't2', routine_id: 'r', title: 'Grades in', offset_days: 0, default_owner_id: null, size: 'M' as const, steps: [], link_path: '/grades', sort_order: 2 },
      { id: 't1', routine_id: 'r', title: 'Send comment template', offset_days: -28, default_owner_id: 'victoria', size: 'S' as const, steps: [{ text: 'Open the bank' }, { text: 'Post a notice' }], link_path: '', sort_order: 1 },
    ]
    const made = jobsForEvent(routine, template, { id: 'ev', event_date: '2026-12-24', semester_id: 'sem' }, 'kyla')
    expect(made.map(j => [j.title, j.due_date, j.owner_id])).toEqual([['Send comment template', '2026-11-26', 'victoria'], ['Grades in', '2026-12-24', null]])
    expect(made[0].steps).toEqual([{ id: 's1', text: 'Open the bank', done: false, done_by_id: null, done_at: null, owner_id: null, due_date: null }, { id: 's2', text: 'Post a notice', done: false, done_by_id: null, done_at: null, owner_id: null, due_date: null }])
    expect(made[0].routine_job_id).toBe('t1'); expect(made[0].event_id).toBe('ev'); expect(made[0].due_kind).toBe('date')
  })
})

describe('parsing', () => {
  it('reads steps and rows tolerantly', () => {
    expect(parseSteps([{ text: 'a' }, { id: 'x', text: 'b', done: 1, owner_id: 'v' }, { text: '' }, null])).toEqual([
      { id: 's1', text: 'a', done: false, done_by_id: null, done_at: null, owner_id: null, due_date: null }, { id: 'x', text: 'b', done: true, done_by_id: null, done_at: null, owner_id: 'v', due_date: null }])
    const j = parseJob({ id: '1', title: 'T', size: 'XL', status: 'odd', due_kind: 'weird', steps: 'no' })
    expect([j.size, j.status, j.due_kind, j.steps]).toEqual(['S', 'scheduled', 'someday', []])
  })
})

describe('the steps box', () => {
  it('turns pasted lines into steps without their numbering', () => {
    expect(parseStepLines('1. Open Drive\n- Make a folder\n• Share it\nStep 4: Tell everyone\n\n  \n2) Last')).toEqual(['Open Drive', 'Make a folder', 'Share it', 'Tell everyone', 'Last'])
    expect(parseStepLines('just one')).toEqual(['just one'])
  })
  it('finds this week’s Friday', () => {
    expect(thisFriday('2026-11-19')).toBe('2026-11-20')
    expect(thisFriday('2026-11-20')).toBe('2026-11-27')
    expect(thisFriday('2026-11-22')).toBe('2026-11-27')
  })
  it('names the two accounts in order', () => {
    const ts = [{ id: 'v', role: 'admin', english_class: 'Admin' }, { id: 't', role: 'teacher', english_class: 'Lily' }, { id: 'k', role: 'teacher', english_class: 'Snapdragon' }]
    expect(adminAccounts(ts).map(t => t.id)).toEqual(['k', 'v'])
  })
})

describe('the board', () => {
  it('puts each open job in its column section or on the shelf', () => {
    expect(boardSection(job({ status: 'in_progress', due_kind: 'someday', due_date: null }), today)).toBe('working')
    expect(boardSection(job({ status: 'waiting', due_date: '2027-03-01' }), today)).toBe('working')
    expect(boardSection(job({ due_date: '2026-11-10' }), today)).toBe('week')
    expect(boardSection(job({ due_date: '2026-11-25' }), today)).toBe('week')
    expect(boardSection(job({ due_date: '2026-11-28' }), today)).toBe('month')
    expect(boardSection(job({ due_date: '2026-12-10' }), today)).toBe('nextmonth')
    expect(boardSection(job({ due_kind: 'month', due_date: '2026-12-31' }), today)).toBe('nextmonth')
    expect(boardSection(job({ due_date: '2027-01-05' }), today)).toBe('later')
    expect(boardSection(job({ due_date: '2027-01-05' }), '2026-12-30')).toBe('week')
    expect(boardSection(job({ due_date: '2027-01-20' }), '2026-12-30')).toBe('nextmonth')
    expect(boardSection(job({ due_kind: 'someday', due_date: null }), today)).toBe('someday')
    expect(boardSection(job({ status: 'done' }), today)).toBeNull()
  })
  it('keeps a long-term goal on the shelf until its last two weeks', () => {
    const goal = job({ due_kind: 'semester', due_date: '2027-01-08' })
    expect(boardSection(goal, '2026-11-19')).toBe('later')
    expect(boardSection(goal, '2026-12-20')).toBe('later')
    expect(boardSection(goal, '2026-12-28')).toBe('week')
    expect(boardSection({ ...goal, status: 'in_progress' }, '2026-11-19')).toBe('working')
  })
  it('groups the shelf by month with Whenever last', () => {
    const s = shelf([
      job({ id: 'a', due_date: '2027-02-03' }), job({ id: 'b', due_kind: 'someday', due_date: null }), job({ id: 'c', due_date: '2027-01-20' }),
      job({ id: 'd', due_date: '2027-01-04' }), job({ id: 'e', due_date: today }), job({ id: 'f', due_date: '2027-01-30', parent_id: 'a' }),
    ], today)
    expect(s.map(g => [g.key, g.jobs.map(j => j.id)])).toEqual([['2027-01', ['d', 'c']], ['2027-02', ['a']], ['someday', ['b']]])
  })
})

describe('next semester', () => {
  const sems = [{ id: 'f26', name: 'Fall 2026', start_date: '2026-08-17' }, { id: 's27', name: 'Spring 2027', start_date: '2027-03-02' }, { id: 'f27', name: 'Fall 2027', start_date: '2027-08-16' }, { id: 'old', name: 'Old', start_date: '2027-02-01', is_archived: true }]
  it('is the earliest semester starting after today', () => {
    expect(nextSemester(sems, '2026-11-19')?.id).toBe('s27')
    expect(nextSemester(sems, '2027-03-02')?.id).toBe('f27')
    expect(nextSemester(sems, '2027-09-01')).toBeNull()
  })
  it('shelves a next-semester goal under its semester, in date order with the months', () => {
    const s = shelf([
      job({ id: 'a', due_date: '2027-02-03' }), job({ id: 'b', due_kind: 'semester', due_date: '2027-08-01', semester_id: 's27' }),
      job({ id: 'c', due_date: '2027-01-20' }), job({ id: 'd', due_kind: 'someday', due_date: null }),
    ], '2026-11-19')
    expect(s.map(g => [g.key, g.jobs.map(j => j.id)])).toEqual([['2027-01', ['c']], ['2027-02', ['a']], ['sem:s27', ['b']], ['someday', ['d']]])
  })
})

describe('the year', () => {
  it('runs March to February', () => {
    expect(schoolYear('2026-11-19')).toEqual({ from: '2026-03-01', to: '2027-02-28', months: ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02'] })
    expect(schoolYear('2027-02-10').from).toBe('2026-03-01')
    expect(schoolYear('2027-03-01').from).toBe('2027-03-01')
  })
  it('places a date along the span', () => {
    expect(spanFraction('2026-03-01', '2026-03-01', '2027-02-28')).toBe(0)
    expect(spanFraction('2027-02-28', '2026-03-01', '2027-02-28')).toBe(1)
    expect(spanFraction('2027-03-01', '2026-03-01', '2027-02-28')).toBeNull()
    expect(endOfNextMonth('2026-11-19')).toBe('2026-12-31')
    expect(endOfNextMonth('2026-12-19')).toBe('2027-01-31')
  })
})

describe('long jobs', () => {
  const st = (id: string, over: Partial<AdminJob['steps'][number]> = {}) => ({ id, text: id, done: false, done_by_id: null, done_at: null, owner_id: null, due_date: null, ...over })
  const long = job({ id: 'cab', due_kind: 'semester', due_date: '2027-01-08', created_at: '2026-11-01T00:00:00Z', steps: [st('a', { done: true }), st('b', { due_date: '2026-11-20' }), st('c', { due_date: '2026-12-10', owner_id: 'victoria' }), st('d'), st('e', { due_date: '2026-11-10', done: true })] })
  it('percent and pace', () => {
    expect(percent(long)).toBe(40)
    expect(percent(job())).toBeNull()
    // made 1 Nov, due 8 Jan: 68 days; today is day 18
    expect(pace(long, '2026-11-19')).toBe(26)
    expect(pace(long, '2027-02-01')).toBe(100)
    expect(pace({ ...long, steps: [] }, today)).toBeNull()
  })
  it('a dated, undone step is a bite in its section for its person', () => {
    const b = bites([long, job({ id: 'done', status: 'done', steps: [st('z', { due_date: today })] })], today)
    expect(b.map(x => [x.step.id, x.section, x.ownerId, x.shared])).toEqual([['b', 'week', 'kyla', false], ['c', 'nextmonth', 'victoria', false]])
    expect(bites([{ ...long, owner_id: null, is_shared: true }], today).map(x => [x.step.id, x.ownerId, x.shared])).toEqual([['b', null, true], ['c', 'victoria', false]])
  })
  it('days since touched', () => {
    expect(daysSinceTouched(job(), today)).toBeNull()
    expect(daysSinceTouched(job({ touched_at: '2026-11-13T08:00:00Z' }), today)).toBe(6)
  })
})
