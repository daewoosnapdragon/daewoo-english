import { afterEach, describe, expect, it, vi } from 'vitest'
import { setUnsaved, hasUnsaved, setLeaveAsker, confirmLeave, leavingHref } from '@/lib/unsaved'

const KEYS = ['a', 'b', 'c']
afterEach(() => { KEYS.forEach(k => setUnsaved(k, false)); setLeaveAsker(null) })

describe('unsaved register', () => {
  it('is clean until a screen marks itself, and clean again when it clears', () => {
    expect(hasUnsaved()).toBe(false)
    setUnsaved('a', true)
    setUnsaved('b', true)
    expect(hasUnsaved()).toBe(true)
    setUnsaved('a', false)
    expect(hasUnsaved()).toBe(true)
    setUnsaved('b', false)
    expect(hasUnsaved()).toBe(false)
  })

  it('leaves without asking when nothing is unsaved', async () => {
    const ask = vi.fn(async () => false)
    setLeaveAsker(ask)
    await expect(confirmLeave()).resolves.toBe(true)
    expect(ask).not.toHaveBeenCalled()
  })

  it('asks the app question, and its answer decides', async () => {
    setUnsaved('a', true)
    setLeaveAsker(async () => false)
    await expect(confirmLeave()).resolves.toBe(false)
    setLeaveAsker(async () => true)
    await expect(confirmLeave()).resolves.toBe(true)
  })

  it('saves autosaving screens on the way out, without asking', async () => {
    const save = vi.fn(async () => true)
    const ask = vi.fn(async () => false)
    setUnsaved('a', true, { save })
    setLeaveAsker(ask)
    await expect(confirmLeave()).resolves.toBe(true)
    expect(save).toHaveBeenCalledOnce()
    expect(ask).not.toHaveBeenCalled()
    expect(hasUnsaved()).toBe(false)
  })

  it('asks when an autosave fails, so a failed write is never silent', async () => {
    setUnsaved('a', true, { save: async () => false })
    const ask = vi.fn(async () => false)
    setLeaveAsker(ask)
    await expect(confirmLeave()).resolves.toBe(false)
    expect(ask).toHaveBeenCalledOnce()
    expect(hasUnsaved()).toBe(true)
  })

  it('a thrown save counts as failed', async () => {
    setUnsaved('a', true, { save: async () => { throw new Error('offline') } })
    setLeaveAsker(async () => false)
    await expect(confirmLeave()).resolves.toBe(false)
  })

  it("uses a screen's own question when it is the only one unsaved", async () => {
    const own = vi.fn(async () => true)
    const app = vi.fn(async () => false)
    setUnsaved('a', true, { ask: own })
    setLeaveAsker(app)
    await expect(confirmLeave()).resolves.toBe(true)
    expect(own).toHaveBeenCalledOnce()
    expect(app).not.toHaveBeenCalled()
  })

  it('falls back to the app question when several screens are unsaved', async () => {
    const own = vi.fn(async () => true)
    const app = vi.fn(async () => false)
    setUnsaved('a', true, { ask: own })
    setUnsaved('b', true)
    setLeaveAsker(app)
    await expect(confirmLeave()).resolves.toBe(false)
    expect(own).not.toHaveBeenCalled()
    expect(app).toHaveBeenCalledOnce()
  })
})

describe('leavingHref', () => {
  const here = 'http://app.test/attendance'
  const plain = { button: 0 }

  it('returns the path for an in-app link to another page', () => {
    expect(leavingHref({ href: 'http://app.test/students' }, plain, here)).toBe('/students')
    expect(leavingHref({ href: '/grades?new=1#top' }, plain, here)).toBe('/grades?new=1#top')
  })

  it('ignores clicks the browser handles itself', () => {
    expect(leavingHref({ href: '/students' }, { button: 0, metaKey: true }, here)).toBeNull()
    expect(leavingHref({ href: '/students' }, { button: 0, ctrlKey: true }, here)).toBeNull()
    expect(leavingHref({ href: '/students' }, { button: 0, shiftKey: true }, here)).toBeNull()
    expect(leavingHref({ href: '/students' }, { button: 1 }, here)).toBeNull()
    expect(leavingHref({ href: '/students', target: '_blank' }, plain, here)).toBeNull()
    expect(leavingHref({ href: '/report.csv', download: true }, plain, here)).toBeNull()
  })

  it('ignores other sites and spots on this same page', () => {
    expect(leavingHref({ href: 'https://example.com/' }, plain, here)).toBeNull()
    expect(leavingHref({ href: '/attendance#roster' }, plain, here)).toBeNull()
    expect(leavingHref({ href: '/attendance' }, plain, here)).toBeNull()
  })

  it('treats a different query on the same path as leaving', () => {
    expect(leavingHref({ href: '/attendance?date=2026-11-19' }, plain, here)).toBe('/attendance?date=2026-11-19')
  })
})
