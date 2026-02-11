'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Teacher, Semester, Language } from '@/types'
import { translations } from '@/i18n/translations'

interface AppContextType {
  currentTeacher: Teacher | null
  setCurrentTeacher: (teacher: Teacher | null) => void
  language: Language
  setLanguage: (lang: Language) => void
  activeSemester: Semester | null
  setActiveSemester: (semester: Semester | null) => void
  t: typeof translations.en | typeof translations.ko
  showToast: (message: string) => void
  toast: string | null
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null)
  const [language, setLanguage] = useState<Language>('en')
  const [activeSemester, setActiveSemester] = useState<Semester | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const t = language === 'ko' ? translations.ko : translations.en

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <AppContext.Provider value={{
      currentTeacher, setCurrentTeacher,
      language, setLanguage,
      activeSemester, setActiveSemester,
      t, showToast, toast,
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
