'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers, useSemesters } from '@/hooks/useData'
import Sidebar from '@/components/layout/Sidebar'
import Toast from '@/components/ui/Toast'
import DashboardView from '@/components/dashboard/DashboardView'
import StudentsView from '@/components/students/StudentsView'
import GradesView from '@/components/grades/GradesView'
import AttendanceView from '@/components/attendance/AttendanceView'
import ReadingLevelsView from '@/components/reading/ReadingLevelsView'
import ReportsView from '@/components/reports/ReportsView'
import SettingsView from '@/components/settings/SettingsView'
import LevelingView from '@/components/leveling/LevelingView'
import { Loader2 } from 'lucide-react'

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-medium tracking-tight">{title}</h2>
        <p className="text-text-secondary text-sm mt-1">{description}</p>
      </div>
      <div className="px-10 py-8">
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <h3 className="font-display text-lg font-medium mb-2">Coming Soon</h3>
          <p className="text-text-secondary text-sm max-w-md mx-auto">This module is being built.</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard')
  const { t, setActiveSemester } = useApp()
  const { teachers, loading: teachersLoading } = useTeachers()
  const { activeSemester, loading: semestersLoading } = useSemesters()

  useEffect(() => {
    if (activeSemester) setActiveSemester(activeSemester)
  }, [activeSemester, setActiveSemester])

  if (teachersLoading || semestersLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-navy mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Loading Daewoo English...</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />
      case 'students': return <StudentsView />
      case 'grades': return <GradesView />
      case 'reports': return <ReportsView />
      case 'leveling': return <LevelingView />
      case 'attendance': return <AttendanceView />
      case 'readingLevels': return <ReadingLevelsView />
      case 'checklist': return <PlaceholderView title={t.nav.checklist} description="Semester kickoff checklist and task management" />
      case 'tools': return <PlaceholderView title={t.nav.tools} description="Grade calculator, score analyzer, and grading scale reference" />
      case 'alerts': return <PlaceholderView title={t.nav.alerts} description="View flagged students, generate warning letters" />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar activeView={activeView} onNavigate={setActiveView} teachers={teachers} />
      <main className="ml-[260px] flex-1 min-h-screen">
        {renderView()}
      </main>
      <Toast />
    </div>
  )
}
