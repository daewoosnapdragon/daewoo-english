'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers, useSemesters } from '@/hooks/useData'
import LoginPage from '@/components/layout/LoginPage'
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
import CurriculumView from '@/components/curriculum/CurriculumView'
import TeacherGuidesView from '@/components/guides/TeacherGuidesView'
import LessonPlanView from '@/components/lessons/LessonPlanView'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { t, currentTeacher, setActiveSemester } = useApp()
  const { teachers, loading: teachersLoading } = useTeachers()
  const { activeSemester, loading: semestersLoading } = useSemesters()

  useEffect(() => {
    if (activeSemester) setActiveSemester(activeSemester)
  }, [activeSemester, setActiveSemester])

  // Persist sidebar state
  useEffect(() => {
    const saved = sessionStorage.getItem('daewoo_sidebar_collapsed')
    if (saved === 'true') setSidebarCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      sessionStorage.setItem('daewoo_sidebar_collapsed', String(!prev))
      return !prev
    })
  }

  if (teachersLoading || semestersLoading) {
    return (
      <div className="min-h-screen bg-navy-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gold mx-auto mb-3" />
          <p className="text-blue-200/50 text-sm">Loading Daewoo English...</p>
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

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />
      case 'students': return <StudentsView />
      case 'grades': return <GradesView />
      case 'reports': return <ReportsView />
      case 'leveling': return <LevelingView />
      case 'attendance': return <AttendanceView />
      case 'readingLevels': return <ReadingLevelsView />
      case 'curriculum': return <CurriculumView />
      case 'teacherGuides': return <TeacherGuidesView />
      case 'lessonPlans': return <LessonPlanView />
      case 'adminDashboard': return <AdminDashboard />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  const ml = sidebarCollapsed ? 'ml-[60px]' : 'ml-[220px]'

  return (
    <div className="flex min-h-screen">
      <Sidebar activeView={activeView} onNavigate={setActiveView} teachers={teachers} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main className={`${ml} flex-1 min-h-screen transition-all duration-200`}>
        {renderView()}
      </main>
      <Toast />
    </div>
  )
}
