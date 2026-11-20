'use client'

import { takeWelcome } from '@/lib/welcome'
import Welcome from '@/components/brand/Welcome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { markOpening, onStale, prefetchPage, setReader, warmUp } from '@/lib/readCache'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { viewForPath, PAGE_TITLES } from '@/lib/routes'
import { hasUnsaved } from '@/lib/unsaved'
import LoginPage from '@/components/layout/LoginPage'
import Masthead from '@/components/layout/Masthead'
import NoticeBoard from '@/components/layout/NoticeBoard'
import CommandPalette from '@/components/layout/CommandPalette'
import Spotlight from '@/components/guide/Spotlight'
import Toast from '@/components/ui/Toast'

/**
 * Everything signed-in screens share: the loading state, the login gate, the
 * masthead, the page title, and the toast. Each route renders its view inside.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { currentTeacher, semestersLoading, pendingNavigation, clearNavigation, language } = useApp()
  const { teachers, loading: teachersLoading } = useTeachers()
  const pathname = usePathname()
  const view = viewForPath(pathname)

  // The first load of a session: the wordmark soaks in like ink, and the app
  // waits for it to finish. Later reloads in the same session skip it.
  const [intro, setIntro] = useState<'pending' | 'soak' | 'done'>('pending')
  useEffect(() => {
    let first = false
    try { first = !sessionStorage.getItem('daewoo_inked'); sessionStorage.setItem('daewoo_inked', '1') } catch {}
    if (!first || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setIntro('done'); return }
    setIntro('soak')
    const t = setTimeout(() => setIntro('done'), 1300)
    return () => clearTimeout(t)
  }, [])

  const ready = !!currentTeacher && !teachersLoading && !semestersLoading && intro === 'done'
  const pageShownAt = useRef(0)
  useEffect(() => { pageShownAt.current = performance.now() }, [pathname])

  // A page opened again draws from remembered answers (lib/readCache). If the
  // database turns out to have something newer, the page is drawn again with
  // it, quietly, unless the teacher has already started typing in it or
  // holds unsaved edits.
  const [redraw, setRedraw] = useState(0)
  const quietUntil = useRef(0)
  useEffect(() => {
    onStale(path => {
      if (path !== window.location.pathname) return
      const a = document.activeElement
      if (a && a.closest('main') && a.matches('input, textarea, select, [contenteditable="true"]')) return
      // Redrawing remounts the page, which would drop unsaved marks made with
      // buttons (attendance, phonics) as surely as typing (lib/unsaved.ts).
      if (hasUnsaved()) return
      quietUntil.current = performance.now() + 800
      setRedraw(n => n + 1)
    })
    return () => onStale(null)
  }, [])
  useEffect(() => { setRedraw(0) }, [pathname])

  // Each teacher's pages are recorded under their own name. Set while
  // rendering, before the page below makes its first request.
  setReader(currentTeacher?.id || null)

  // A couple of seconds after the app opens, the teacher's most-used pages are
  // fetched quietly in the background, so the first visit to each is already
  // instant. Again when the tab comes back after ten minutes or more.
  useEffect(() => {
    if (!ready) return
    const auth = { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}` }
    let last = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const warm = () => {
      if (document.hidden || Date.now() - last < 9 * 60_000) return
      last = Date.now()
      const go = () => warmUp(auth, 5)
      const idle = (window as any).requestIdleCallback as ((cb: () => void, o?: { timeout: number }) => number) | undefined
      if (idle) idle(go, { timeout: 3000 }); else go()
    }
    timer = setTimeout(warm, 2500)
    const onVisible = () => { if (!document.hidden) warm() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [ready])

  // Resting on a link fetches what that page read last time, so a click on it
  // draws at once. A press marks the start of a page opening.
  useEffect(() => {
    if (!ready) return
    const auth = { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}` }
    let timer: ReturnType<typeof setTimeout> | null = null
    const target = (e: Event) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/"]') as HTMLAnchorElement | null
      return a ? new URL(a.href).pathname : null
    }
    const over = (e: Event) => { const p = target(e); if (timer) clearTimeout(timer); if (p) timer = setTimeout(() => prefetchPage(p, auth), 80) }
    const now = (e: Event) => { const p = target(e); if (p) { prefetchPage(p, auth); if (e.type === 'click') markOpening() } }
    document.addEventListener('pointerover', over)
    document.addEventListener('focusin', over)
    document.addEventListener('pointerdown', now)
    document.addEventListener('click', now)
    return () => { if (timer) clearTimeout(timer); document.removeEventListener('pointerover', over); document.removeEventListener('focusin', over); document.removeEventListener('pointerdown', now); document.removeEventListener('click', now) }
  }, [ready])

  // Content that replaces a loader fades in instead of popping: whenever the
  // ink dots leave the page, whatever took their place eases in over 160 ms.
  // Not while the page itself is still fading in, or while it is being
  // redrawn with newer answers: those should not blink.
  useEffect(() => {
    const root = document.querySelector('main')
    if (!ready || !root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const isLoader = (n: Node) => n instanceof Element && (n.classList.contains('ink-wait') || !!n.querySelector('.ink-wait'))
    const mo = new MutationObserver(records => {
      for (const r of records) {
        const t = performance.now()
        if (t - pageShownAt.current < 200 || t < quietUntil.current) return
        if (!Array.from(r.removedNodes).some(isLoader)) continue
        r.addedNodes.forEach(n => { if (n instanceof HTMLElement && !isLoader(n)) n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }) })
      }
    })
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [ready])

  // A deep link's extras (which student, which filter) stay readable by the
  // target view for a moment after the route changes, then are cleared.
  useEffect(() => {
    if (!pendingNavigation) return
    const timer = setTimeout(() => clearNavigation(), 1500)
    return () => clearTimeout(timer)
  }, [pendingNavigation, pathname, clearNavigation])

  useEffect(() => {
    document.title = currentTeacher ? `${PAGE_TITLES[view] || 'Dashboard'} · Daewoo English` : 'Daewoo English'
  }, [view, currentTeacher])

  // Right after logging in, a short welcome plays over the page while it loads.
  const [welcome, setWelcome] = useState(false)
  useEffect(() => { if (currentTeacher && takeWelcome()) setWelcome(true) }, [currentTeacher])
  const endWelcome = useCallback(() => setWelcome(false), [])

  if (teachersLoading || semestersLoading || intro !== 'done') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center" role="status" aria-label="Loading Daewoo English">
        <div className="text-center">
          <p className={`font-display text-[length:calc(44px*var(--ts))] leading-none text-ink ${intro === 'pending' ? 'wordmark-pending' : intro === 'soak' ? 'wordmark-soak' : ''}`}>Daewoo English</p>
          <p className={`text-[length:calc(13.5px*var(--ts))] text-ink-2 mt-3 ${intro === 'soak' ? 'wordmark-sub' : intro === 'pending' ? 'wordmark-pending' : ''}`}>Daewoo Elementary · English Program</p>
        </div>
      </div>
    )
  }

  if (!currentTeacher) {
    return (
      <>
        <LoginPage teachers={teachers} />
        <Toast />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* The first stop for Tab on every page: past the masthead and any
          notices to the page itself, with the page's top just under the
          sticky masthead rather than behind it. */}
      <a href="#main" className="skip-link no-print" onClick={e => {
        e.preventDefault()
        const m = document.getElementById('main')
        if (!m) return
        const head = document.querySelector('header')?.getBoundingClientRect().height || 0
        m.focus({ preventScroll: true })
        window.scrollTo({ top: Math.max(0, m.getBoundingClientRect().top + window.scrollY - head), behavior: 'auto' })
      }}>
        {language === 'ko' ? '본문으로 건너뛰기' : 'Skip to content'}
      </a>
      <Masthead />
      <NoticeBoard />
      {/* On a phone the page's foot clears the bottom bar (--tabbar-h, globals.css). */}
      <main id="main" tabIndex={-1} className="mx-auto max-w-[1440px] pb-[var(--tabbar-h,0px)]">
        <div key={`${pathname}#${redraw}`} data-page={pathname} className={redraw ? undefined : 'page-fade'}>
          {children}
        </div>
      </main>
      <Toast />
      {welcome && <Welcome name={currentTeacher.name} englishClass={currentTeacher.english_class} ko={language === 'ko'} onDone={endWelcome} />}
      <CommandPalette />
      <Spotlight />
    </div>
  )
}
