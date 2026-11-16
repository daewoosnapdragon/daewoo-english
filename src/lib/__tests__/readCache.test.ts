import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cachedFetch, _reset, onStale, prefetchPage, favouritePages, warmUp, OPENING_MS } from '../readCache'

const API = 'https://x.supabase.co/rest/v1/'
let clock = 0
let path = '/grades'
let rows: Record<string, string> = {}
const calls: string[] = []
const fakeFetch = vi.fn(async (input: any, init: any = {}) => {
  const url = String(input); const m = (init.method || 'GET').toUpperCase()
  calls.push(`${m} ${url.replace(API, '')}`)
  if (m !== 'GET' && m !== 'HEAD') return new Response(null, { status: 201 })
  return new Response(rows[url.replace(API, '')] ?? '[]', { status: 200, headers: { 'content-range': '0-0/1' } })
}) as unknown as typeof fetch

const get = async (t: string) => (await cachedFetch(API + t, { method: 'GET', headers: { apikey: 'k' } })).text()

beforeEach(() => {
  clock = 1_000_000; path = '/grades'; rows = { students: '[1]' }; calls.length = 0
  _reset({ fetch: fakeFetch, now: () => clock, path: () => path })
})

describe('remembered reads', () => {
  it('a page opened again draws from memory, then checks the database behind it', async () => {
    expect(await get('students')).toBe('[1]')
    path = '/attendance'; clock += 10_000; await get('other')
    path = '/grades'; clock += 10_000; calls.length = 0
    expect(await get('students')).toBe('[1]')
    await Promise.resolve()
    expect(calls).toEqual(['GET students']) // the background check
  })

  it('outside the opening moment, reads go to the database (polling stays live)', async () => {
    await get('students')
    clock += OPENING_MS + 1; rows.students = '[2]'; calls.length = 0
    expect(await get('students')).toBe('[2]')
    expect(calls).toEqual(['GET students'])
  })

  it('tells the page when what it was shown is out of date', async () => {
    const stale = vi.fn(); onStale(stale)
    await get('students')
    path = '/attendance'; clock += 10_000; await get('x')
    path = '/grades'; clock += 10_000; rows.students = '[9]'
    expect(await get('students')).toBe('[1]')
    await new Promise(r => setTimeout(r, 0))
    expect(stale).toHaveBeenCalledWith('/grades')
    clock += 10; expect(await get('students')).toBe('[9]')
  })

  it('any write forgets everything, except the activity log', async () => {
    await get('students')
    await cachedFetch(API + 'activity_log', { method: 'POST', body: '{}' })
    calls.length = 0; await get('students'); expect(calls).toEqual([])
    await cachedFetch(API + 'grades', { method: 'PATCH', body: '{}' })
    calls.length = 0; await get('students'); expect(calls).toEqual(['GET students'])
  })

  it('the same read asked twice at once goes out once', async () => {
    const [a, b] = await Promise.all([get('students'), get('students')])
    expect(a).toBe('[1]'); expect(b).toBe('[1]')
    expect(calls).toEqual(['GET students'])
  })

  it('fetches ahead what a page read last time', async () => {
    path = '/reports'; await get('comments')
    path = '/grades'; clock += 60_000; calls.length = 0
    prefetchPage('/reports', { apikey: 'k' })
    await new Promise(r => setTimeout(r, 0))
    expect(calls).toEqual(['GET comments'])
    path = '/reports'; calls.length = 0
    await get('comments'); expect(calls).toEqual([])
  })

  it('warms the most-opened pages first', async () => {
    // Each address change is one visit: reports ×3, attendance ×2, reading ×1, dashboard ×1.
    for (const p of ['/reports', '/attendance', '/reports', '/attendance', '/reports', '/reading', '/dashboard']) { path = p; await get(p.slice(1)) }
    expect(favouritePages(2)).toEqual(['/reports', '/attendance'])
    clock += 60_000; calls.length = 0
    vi.useFakeTimers(); warmUp({ apikey: 'k' }, 2, 10); vi.runAllTimers(); vi.useRealTimers()
    await new Promise(r => setTimeout(r, 0))
    expect(calls).toEqual(['GET reports', 'GET attendance'])
  })

  it('leaves non-REST requests alone', async () => {
    await cachedFetch('https://x.supabase.co/storage/v1/object/a', {})
    await cachedFetch('https://x.supabase.co/storage/v1/object/a', {})
    expect(calls.length).toBe(2)
  })
})
