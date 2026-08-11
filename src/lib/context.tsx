'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react'
import { Teacher, Semester, Language } from '@/types'
import { translations } from '@/i18n/translations'
import { canManageSemesters } from '@/lib/utils'
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
  /** The semester an admin/Snapdragon account has marked active. */
  activeSemester: Semester | null
  /** Every non-archived semester. Only semester managers may browse these. */
  semesters: Semester[]
  semestersLoading: boolean
  /** Re-read the semester list — call after changing which one is active. */
  refreshSemesters: () => Promise<void>
  /** True when the signed-in account may set/switch the semester. */
  canSwitchSemester: boolean
  /**
   * Semesters the signed-in account is allowed to look at: all of them for a
   * manager, and only the active one for everyone else.
   */
  visibleSemesters: Semester[]
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
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [semestersLoading, setSemestersLoading] = useState(true)
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

  // ─── Semesters ───────────────────────────────────────────────────────
  // Held here rather than per-view so that every screen agrees on which
  // semester is active, and so a change made in Settings reaches the rest of
  // the app without a reload.
  const refreshSemesters = useCallback(async () => {
    // Imported here rather than at the top of the file: this provider wraps the
    // root layout, and a static import would drag the Supabase client (which
    // builds itself at module load) into every prerendered page.
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('is_archived', false)
      .order('start_date', { ascending: false })
    if (!error && data) setSemesters(data)
    setSemestersLoading(false)
  }, [])

  useEffect(() => { refreshSemesters() }, [refreshSemesters])

  // Another account may have switched the active semester while this tab sat
  // idle, so re-check whenever the tab is brought back into focus.
  useEffect(() => {
    const onFocus = () => { refreshSemesters() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshSemesters])

  const activeSemester = useMemo(() => semesters.find(s => s.is_active) || null, [semesters])
  const canSwitchSemester = canManageSemesters(currentTeacher)
  // Memoised: consumers put this in effect dependency arrays.
  const visibleSemesters = useMemo(() => (
    canSwitchSemester ? semesters
      : activeSemester ? [activeSemester] : semesters.slice(0, 1)
  ), [canSwitchSemester, semesters, activeSemester])

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
      activeSemester, semesters, semestersLoading, refreshSemesters,
      canSwitchSemester, visibleSemesters,
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
