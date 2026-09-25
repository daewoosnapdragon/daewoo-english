'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { viewForPath, PAGE_TITLES } from '@/lib/routes'
import LoginPage from '@/components/layout/LoginPage'
import Masthead from '@/components/layout/Masthead'
import Toast from '@/components/ui/Toast'
import { Loader2 } from 'lucide-react'

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

  if (teachersLoading || semestersLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-[28px] text-ink mb-3">Daewoo English</p>
          <Loader2 size={20} className="animate-spin text-accent mx-auto" />
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
      <main className="mx-auto max-w-[1440px]">
        <div key={pathname} className="animate-page-enter">
          {children}
        </div>
      </main>
      <Toast />
    </div>
  )
}
