'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Teacher, Semester, Language } from '@/types'
import { translations } from '@/i18n/translations'

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
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [theme, setThemeState] = useState<'light' | 'dark'>('light')
  const [pendingNavigation, setPendingNavigation] = useState<NavigationTarget | null>(null)

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
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
