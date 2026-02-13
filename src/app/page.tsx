'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
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
import { Loader2, Lock, Eye, EyeOff } from 'lucide-react'
import { Teacher } from '@/types'

// ─── Login Screen ────────────────────────────────────────────────────

function LoginScreen({ teachers, onLogin }: { teachers: Teacher[]; onLogin: (teacher: Teacher) => void }) {
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleLogin = async () => {
    if (!selectedTeacherId) { setError('Please select your name.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setChecking(true)
    setError('')
    const { data, error: dbError } = await supabase
      .from('teachers')
      .select('*')
      .eq('id', selectedTeacherId)
      .single()
    if (dbError || !data) { setError('Could not verify. Try again.'); setChecking(false); return }
    if (data.password && data.password !== password) { setError('Incorrect password.'); setChecking(false); return }
    setChecking(false)
    localStorage.setItem('daewoo_teacher_id', data.id)
    onLogin(data as Teacher)
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain"
            onError={(e: any) => { e.target.style.display = 'none' }} />
          <h1 className="font-display text-2xl font-semibold text-navy tracking-tight">Daewoo English Program</h1>
          <p className="text-text-secondary text-sm mt-1">Sign in to continue</p>
        </div>
        <div className="bg-surface border border-border rounded-xl shadow-sm p-6 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1.5">Name</label>
            <select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setError('') }}
              className="w-full px-3 py-2.5 border border-border rounded-lg text-[14px] outline-none focus:border-navy bg-surface">
              <option value="">Select your name...</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.english_class === 'Snapdragon' && t.role === 'admin' ? '(Head Teacher)' : t.role === 'admin' ? '(Admin)' : `- ${t.english_class}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1.5">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                placeholder="Enter your password"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[14px] outline-none focus:border-navy bg-surface pr-10" />
              <button onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-[12px] text-danger font-medium">{error}</p>}
          <button onClick={handleLogin} disabled={checking}
            className="w-full py-2.5 rounded-lg text-[14px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {checking ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Sign In
          </button>
        </div>
      </div>
    </div>
  )
}

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
  const { t, currentTeacher, setCurrentTeacher, setActiveSemester } = useApp()
  const { teachers, loading: teachersLoading } = useTeachers()
  const { activeSemester, loading: semestersLoading } = useSemesters()
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    if (teachersLoading || teachers.length === 0) return
    const savedId = localStorage.getItem('daewoo_teacher_id')
    if (savedId) {
      const found = teachers.find(t => t.id === savedId)
      if (found) setCurrentTeacher(found)
    }
    setAuthChecked(true)
  }, [teachers, teachersLoading, setCurrentTeacher])

  useEffect(() => {
    if (activeSemester) setActiveSemester(activeSemester)
  }, [activeSemester, setActiveSemester])

  if (teachersLoading || semestersLoading || !authChecked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-navy mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Loading Daewoo English...</p>
        </div>
      </div>
    )
  }

  if (!currentTeacher) {
    return <LoginScreen teachers={teachers} onLogin={(teacher) => setCurrentTeacher(teacher)} />
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
