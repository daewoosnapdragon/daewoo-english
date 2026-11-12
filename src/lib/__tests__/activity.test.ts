import { beforeEach, describe, expect, it, vi } from 'vitest'

// The activity log's folding rules: a page open is one row, the page's
// specifics rewrite it, later views add rows, and repeats within ten
// minutes bump a count instead of adding a row. Supabase is faked with an
// in-memory table so the rows written can be read back.

interface Row { id: string; teacher_id: string; action: string; detail: string; path: string; count: number }
const rows: Row[] = []
let nextId = 1

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (r: Omit<Row, 'id' | 'count'>) => ({
        select: () => ({ single: async () => { const row = { ...r, id: String(nextId++), count: 1 }; rows.push(row); return { data: { id: row.id }, error: null } } }),
      }),
      update: (patch: Partial<Row> & { updated_at?: string }) => ({
        eq: async (_col: string, id: string) => { const row = rows.find(x => x.id === id); if (!row) return { error: { message: 'no row' } }; const { updated_at: _u, ...rest } = patch; Object.assign(row, rest); return { error: null } },
      }),
    }),
  },
}))

import { logActivity, logPageOpen, logView, setActivityActor, canViewActivity, _resetActivityForTests } from '@/lib/activity'

beforeEach(() => { rows.length = 0; nextId = 1; _resetActivityForTests(); setActivityActor({ id: 't1', name: 'Kyla' }) })

describe('who may read the log', () => {
  it('is only the Snapdragon account', () => {
    expect(canViewActivity({ role: 'teacher', english_class: 'Snapdragon' })).toBe(true)
    expect(canViewActivity({ role: 'admin', english_class: 'Admin' })).toBe(false)
    expect(canViewActivity({ role: 'teacher', english_class: 'Lily', is_head_teacher: true })).toBe(false)
    expect(canViewActivity(null)).toBe(false)
  })
})

describe('page opens and what was on screen', () => {
  it('rewrites the bare "Opened" row with the page’s specifics', async () => {
    await logPageOpen('Grades', '/grades')
    await logView('Grades · Snapdragon · Grade 4 · Unit 3 Quiz score sheet', { path: '/grades' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ action: 'visit', detail: 'Grades · Snapdragon · Grade 4 · Unit 3 Quiz score sheet', count: 1, path: '/grades' })
  })

  it('waits for an open still being written before rewriting it', async () => {
    const open = logPageOpen('Grades', '/grades')
    await logView('Grades · Snapdragon · Grade 4 · score entry', { path: '/grades' })
    await open
    expect(rows).toHaveLength(1)
    expect(rows[0].detail).toBe('Grades · Snapdragon · Grade 4 · score entry')
  })

  it('adds a row for each new thing looked at and folds a return to an earlier one', async () => {
    await logPageOpen('Grades', '/grades')
    await logView('Grades · Snapdragon · Grade 4', { path: '/grades' })
    await logView('Grades · Snapdragon · Grade 5', { path: '/grades' })
    await logView('Grades · Snapdragon · Grade 4', { path: '/grades' })
    expect(rows.map(r => [r.detail, r.count])).toEqual([['Grades · Snapdragon · Grade 4', 2], ['Grades · Snapdragon · Grade 5', 1]])
  })

  it('does not fold a fresh open into a row that already says what was on screen', async () => {
    await logPageOpen('Grades', '/grades')
    await logView('Grades · Snapdragon · Grade 4', { path: '/grades' })
    await logPageOpen('Dashboard', '/dashboard')
    await logPageOpen('Grades', '/grades')
    expect(rows.map(r => r.detail)).toEqual(['Grades · Snapdragon · Grade 4', 'Dashboard', 'Grades'])
    await logView('Grades · Snapdragon · Grade 4', { path: '/grades' })
    expect(rows.map(r => [r.detail, r.count])).toEqual([['Grades · Snapdragon · Grade 4', 1], ['Dashboard', 1], ['Grades · Snapdragon · Grade 4', 1]])
  })

  it('folds a page opened twice with nothing more said', async () => {
    await logPageOpen('Guide', '/guide')
    await logPageOpen('Guide', '/guide')
    expect(rows).toHaveLength(1)
    expect(rows[0].count).toBe(2)
  })

  it('writes nothing with no one signed in or an empty line', async () => {
    await logView('', { path: '/grades' })
    setActivityActor(null)
    await logPageOpen('Grades', '/grades')
    await logView('Grades · Snapdragon', { path: '/grades' })
    expect(rows).toHaveLength(0)
  })
})

describe('actions', () => {
  it('folds the same keyed action and keeps the latest wording', async () => {
    await logActivity('scored', 'Unit 3 Quiz · 1 student', { key: 'a1', path: '/grades' })
    await logActivity('scored', 'Unit 3 Quiz · 2 students', { key: 'a1', path: '/grades' })
    await logActivity('scored', 'Spelling · 1 student', { key: 'a2', path: '/grades' })
    expect(rows.map(r => [r.detail, r.count])).toEqual([['Unit 3 Quiz · 2 students', 2], ['Spelling · 1 student', 1]])
  })

  it('never folds an action without a key', async () => {
    await logActivity('printed', 'Report card · Minji', { path: '/reports' })
    await logActivity('printed', 'Report card · Minji', { path: '/reports' })
    expect(rows).toHaveLength(2)
  })
})
