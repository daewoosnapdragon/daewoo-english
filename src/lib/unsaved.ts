'use client'

import { useEffect, useId, useRef } from 'react'

// ─── Unsaved work ────────────────────────────────────────────────────
// One register of the screens holding edits that are not saved yet, so that
// every way of leaving a page can ask first: the masthead links, the name
// menu, ⌘K, any in-app link, browser Back/Forward. Each screen used to guard
// only its own controls, and a click on "Students" in the masthead dropped a
// day's attendance marks without a word.
//
// A screen calls useUnsaved(dirty) and is done. A screen that autosaves can
// hand over its save, and is then simply saved on the way out; a screen with
// its own leave dialog (Attendance: Stay / Discard / Save first) can hand
// over that instead. Everything else gets the app's confirm dialog.

export interface UnsavedEntry {
  /** Writes the screen's edits. Resolves true when they are safely stored. */
  save?: () => Promise<boolean>
  /** The screen's own "leave?" question. Resolves true to leave. */
  ask?: () => Promise<boolean>
}

const entries = new Map<string, UnsavedEntry>()
let asker: (() => Promise<boolean>) | null = null

/** Marks a screen as holding unsaved edits (on) or not (off). */
export function setUnsaved(key: string, on: boolean, entry: UnsavedEntry = {}) {
  if (on) entries.set(key, entry)
  else entries.delete(key)
}

export function hasUnsaved() {
  return entries.size > 0
}

/** The question asked when nothing more specific applies; set once by the app shell. */
export function setLeaveAsker(fn: (() => Promise<boolean>) | null) {
  asker = fn
}

/**
 * Resolves true when it is fine to leave the page: nothing is unsaved, the
 * screens that can save themselves did, or the teacher chose to leave anyway.
 * The caller does the navigating.
 */
export async function confirmLeave(): Promise<boolean> {
  if (entries.size === 0) return true
  const pending = Array.from(entries.entries())
  // Autosaving screens write what they hold. A failed write falls through to
  // the question below, so a network error still never loses work silently.
  const left: [string, UnsavedEntry][] = []
  for (const [key, e] of pending) {
    if (!e.save) { left.push([key, e]); continue }
    let ok = false
    try { ok = await e.save() } catch { ok = false }
    if (ok) entries.delete(key)
    else left.push([key, { ask: e.ask }])
  }
  if (left.length === 0) return true
  if (left.length === 1 && left[0][1].ask) return left[0][1].ask()
  if (asker) return asker()
  return typeof window !== 'undefined' ? window.confirm('Leave without saving?') : true
}

/**
 * Where a click on a link would take the teacher, if it leaves this page and
 * so needs asking about; null for anything the browser or another tab handles
 * (a modified click, a new tab, a download, another site, a link to a spot on
 * this same page).
 */
export function leavingHref(
  link: { href: string; target?: string; download?: boolean },
  click: { button: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean },
  here: string,
): string | null {
  if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null
  if ((link.target && link.target !== '_self') || link.download) return null
  let to: URL, from: URL
  try { from = new URL(here); to = new URL(link.href, from) } catch { return null }
  if (to.origin !== from.origin) return null
  if (to.pathname === from.pathname && to.search === from.search) return null
  return to.pathname + to.search + to.hash
}

/**
 * While `dirty` is true this screen counts as holding unsaved edits. Cleared
 * when it turns false and when the screen unmounts. `entry` may change on
 * every render; the latest one is used.
 */
export function useUnsaved(dirty: boolean, entry: UnsavedEntry = {}) {
  const key = useId()
  const latest = useRef(entry)
  latest.current = entry
  const hasSave = !!entry.save, hasAsk = !!entry.ask
  useEffect(() => {
    setUnsaved(key, dirty, {
      save: hasSave ? () => latest.current.save ? latest.current.save() : Promise.resolve(false) : undefined,
      ask: hasAsk ? () => latest.current.ask ? latest.current.ask() : Promise.resolve(true) : undefined,
    })
    if (dirty) rememberHere()
    return () => setUnsaved(key, false)
  }, [key, dirty, hasSave, hasAsk])
}

// ─── Wiring ──────────────────────────────────────────────────────────

// The history entry of the page being edited, taken when it first holds
// unsaved work, so a Back that is answered "Stay" can put it back.
let here: { state: unknown; url: string } | null = null
function rememberHere() {
  if (typeof window === 'undefined') return
  here = { state: window.history.state, url: window.location.href }
}

/**
 * Installs the guards on the window: in-app links, Back/Forward, and closing
 * or reloading the tab. Returns the function that removes them. `navigate` is
 * the router's push, used when the clicked link is gone from the page by the
 * time the teacher answers.
 */
export function installLeaveGuard(navigate: (href: string) => void): () => void {
  let passing = false
  let asking = false

  // Capture phase on the window runs before React (whose listeners sit on the
  // document), so neither the Link's own navigation nor the masthead's slider
  // starts until the teacher has answered.
  const onClick = (e: MouseEvent) => {
    if (passing || e.defaultPrevented || !hasUnsaved()) return
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a) return
    const href = leavingHref({ href: a.href, target: a.target, download: a.hasAttribute('download') }, e, window.location.href)
    if (!href) return
    e.preventDefault()
    e.stopPropagation()
    if (asking) return
    asking = true
    confirmLeave().then(ok => {
      asking = false
      if (!ok) return
      // Clicking the same link again lets it do everything it normally does
      // (close its menu, move the masthead line) on top of navigating.
      if (a.isConnected) { passing = true; try { a.click() } finally { passing = false } }
      else navigate(href)
    })
  }

  // Back/Forward has already moved the address by the time anyone hears of
  // it. Next's router listens for this on the window too; a capture listener
  // there runs first and can keep it from redrawing the page. "Stay" then
  // puts this page's entry back on top; "Leave" lets the router catch up.
  const onPop = (e: PopStateEvent) => {
    if (passing || !hasUnsaved()) return
    e.stopImmediatePropagation()
    if (asking) return
    asking = true
    const back = here
    confirmLeave().then(ok => {
      asking = false
      if (ok) {
        passing = true
        try { window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state })) } finally { passing = false }
      } else if (back) {
        window.history.pushState(back.state, '', back.url)
      }
    })
  }

  const onUnload = (e: BeforeUnloadEvent) => {
    if (!hasUnsaved()) return
    e.preventDefault()
    e.returnValue = ''
  }

  window.addEventListener('click', onClick, true)
  window.addEventListener('popstate', onPop, true)
  window.addEventListener('beforeunload', onUnload)
  return () => {
    window.removeEventListener('click', onClick, true)
    window.removeEventListener('popstate', onPop, true)
    window.removeEventListener('beforeunload', onUnload)
  }
}
