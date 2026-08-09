'use client'

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { Teacher, Semester, Language } from '@/types'
import { translations } from '@/i18n/translations'
import ConfirmDialog, { DialogRequest } from '@/components/ui/ConfirmDialog'

export interface NavigationTarget {
  view: string
  preSelectedStudent?: string
  preSelectedFilter?: string
  preSelectedDomain?: string
  preSelectedAssessment?: string
}

interface AppContextType {
  currentTeacher: Teacher | null
  setCurrentTeacher: (teacher: Teacher | null) => void
  language: Language
  setLanguage: (lang: Language) => void
  activeSemester: Semester | null
  setActiveSemester: (semester: Semester | null) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  t: typeof translations.en | typeof translations.ko
  showToast: (message: string) => void
  toast: string | null
  navigateTo: (target: NavigationTarget) => void
  pendingNavigation: NavigationTarget | null
  clearNavigation: () => void
  /** Themed replacement for window.confirm. Resolves true if accepted. */
  confirmDialog: (opts: Omit<DialogRequest, 'kind'>) => Promise<boolean>
  /** Themed replacement for window.prompt. Resolves null if cancelled. */
  promptDialog: (opts: Omit<DialogRequest, 'kind'>) => Promise<string | null>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [pendingNavigation, setPendingNavigation] = useState<NavigationTarget | null>(null)

  // One dialog at a time; the pending promise's resolver is held in a ref so
  // the call site can simply `await` the user's answer.
  const [dialog, setDialog] = useState<DialogRequest | null>(null)
  const dialogResolver = useRef<((v: boolean | string | null) => void) | null>(null)

  const openDialog = useCallback((req: DialogRequest) => {
    // If something is already open, resolve it as cancelled rather than
    // stranding the awaiting caller forever.
    dialogResolver.current?.(req.kind === 'prompt' ? null : false)
    setDialog(req)
    return new Promise<boolean | string | null>(resolve => { dialogResolver.current = resolve })
  }, [])

  const resolveDialog = useCallback((value: boolean | string | null) => {
    const resolve = dialogResolver.current
    dialogResolver.current = null
    setDialog(null)
    resolve?.(value)
  }, [])

  const confirmDialog = useCallback(
    (opts: Omit<DialogRequest, 'kind'>) => openDialog({ ...opts, kind: 'confirm' }) as Promise<boolean>,
    [openDialog])

  const promptDialog = useCallback(
    (opts: Omit<DialogRequest, 'kind'>) => openDialog({ ...opts, kind: 'prompt' }) as Promise<string | null>,
    [openDialog])

  const navigateTo = useCallback((target: NavigationTarget) => {
    setPendingNavigation(target)
  }, [])

  const clearNavigation = useCallback(() => {
    setPendingNavigation(null)
  }, [])

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t)
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', t === 'dark')
      localStorage.setItem('daewoo_theme', t)
    }
  }, [])

  // Init theme from localStorage
  if (typeof window !== 'undefined' && !window.__themeInit) {
    window.__themeInit = true
    const saved = localStorage.getItem('daewoo_theme') as 'light' | 'dark' | null
    if (saved === 'dark') { setThemeState('dark'); document.documentElement.classList.add('dark') }
  }

  const t = language === 'ko' ? translations.ko : translations.en

  const showToast = useCallback((message: string) => {
    setToast(message)
    const duration = message.toLowerCase().startsWith('error') ? 5000 : 3000
    setTimeout(() => setToast(null), duration)
  }, [])

  return (
    <AppContext.Provider value={{
      currentTeacher, setCurrentTeacher,
      language, setLanguage,
      activeSemester, setActiveSemester,
      theme, setTheme,
      t, showToast, toast,
      navigateTo, pendingNavigation, clearNavigation,
      confirmDialog, promptDialog,
    }}>
      {children}
      {dialog && <ConfirmDialog request={dialog} onResolve={resolveDialog} />}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
