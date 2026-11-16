'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { viewForPath, PAGE_TITLES } from '@/lib/routes'
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
  const { currentTeacher, semestersLoading, pendingNavigation, clearNavigation } = useApp()
  const { teachers, loading: teachersLoading } = useTeachers()
  const pathname = usePathname()
  const view = viewForPath(pathname)

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

  if (teachersLoading || semestersLoading || intro !== 'done') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center" role="status" aria-label="Loading Daewoo English">
        <div className="text-center">
          <p className={`font-display text-[44px] leading-none text-ink ${intro === 'pending' ? 'wordmark-pending' : intro === 'soak' ? 'wordmark-soak' : ''}`}>Daewoo English</p>
          <p className={`eyebrow eyebrow-accent mt-4 ${intro === 'soak' ? 'wordmark-sub' : intro === 'pending' ? 'wordmark-pending' : ''}`}>Daewoo Elementary · English Program</p>
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
      <Masthead />
      <NoticeBoard />
      <main className="mx-auto max-w-[1440px]">
        <div key={pathname} className="page-set">
          {children}
        </div>
      </main>
      <Toast />
      <CommandPalette />
      <Spotlight />
    </div>
  )
}
