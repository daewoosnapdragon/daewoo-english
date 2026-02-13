'use client'

import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, ClipboardEdit, FileText, Layers,
  CalendarCheck, BookOpen, ListChecks, Wrench, Bell, Settings, Globe, LogOut, Lock
} from 'lucide-react'

const NAV_ITEMS = [
  { section: 'MENU' },
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'students', icon: Users },
  { id: 'grades', icon: ClipboardEdit },
  { id: 'reports', icon: FileText },
  { id: 'leveling', icon: Layers },
  { section: 'DATA' },
  { id: 'attendance', icon: CalendarCheck },
  { id: 'readingLevels', icon: BookOpen },
  { id: 'checklist', icon: ListChecks },
  { section: 'SYSTEM' },
  { id: 'tools', icon: Wrench },
  { id: 'alerts', icon: Bell },
  { id: 'settings', icon: Settings },
]

export default function Sidebar({
  activeView, onNavigate, teachers
}: {
  activeView: string
  onNavigate: (view: string) => void
  teachers: Teacher[]
}) {
  const { t, language, setLanguage, currentTeacher, setCurrentTeacher } = useApp()
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [showLogin, setShowLogin] = useState(!currentTeacher)
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.is_head_teacher
    if (!isAdmin) { setFlaggedCount(0); return }
    (async () => {
      const { count } = await supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('is_flagged', true)
      setFlaggedCount(count || 0)
    })()
  }, [currentTeacher, activeView])

  useEffect(() => {
    const savedId = sessionStorage.getItem('daewoo_teacher_id')
    if (savedId && !currentTeacher) {
      const teacher = teachers.find(t => t.id === savedId)
      if (teacher) { setCurrentTeacher(teacher); setShowLogin(false) }
    }
  }, [teachers, currentTeacher, setCurrentTeacher])

  const handleLogin = () => {
    setLoginError('')
    const teacher = teachers.find(t => t.id === selectedTeacherId)
    if (!teacher) { setLoginError('Please select your name'); return }
    if (teacher.password && teacher.password !== password) {
      setLoginError('Incorrect password')
      return
    }
    setCurrentTeacher(teacher)
    sessionStorage.setItem('daewoo_teacher_id', teacher.id)
    setShowLogin(false)
    setPassword('')
  }

  const handleLogout = () => {
    setCurrentTeacher(null)
    sessionStorage.removeItem('daewoo_teacher_id')
    setShowLogin(true)
    setSelectedTeacherId('')
    setPassword('')
    setLoginError('')
  }

  if (showLogin || !currentTeacher) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-navy-dark flex flex-col z-50">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <img src="/logo.png" alt="Daewoo" className="w-16 h-16 object-contain mb-4 rounded-full bg-white/10 p-1" onError={(e: any) => { e.target.style.display = 'none' }} />
          <h2 className="text-white font-display text-lg font-semibold mb-1">Daewoo English</h2>
          <p className="text-blue-300/50 text-[11px] mb-6">Sign in to continue</p>
          <div className="w-full space-y-3">
            <select value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setLoginError('') }}
              className="w-full px-3 py-2.5 bg-navy rounded-lg text-[13px] text-white border border-blue-400/20 outline-none focus:border-gold/50">
              <option value="">Select your name...</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.role === 'admin' ? '(Admin)' : `- ${t.english_class}`}</option>
              ))}
            </select>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40" />
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setLoginError('') }}
                onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
                placeholder="Password" className="w-full pl-9 pr-3 py-2.5 bg-navy rounded-lg text-[13px] text-white border border-blue-400/20 outline-none focus:border-gold/50 placeholder-blue-300/30" />
            </div>
            {loginError && <p className="text-red-400 text-[11px] font-medium px-1">{loginError}</p>}
            <button onClick={handleLogin} className="w-full py-2.5 rounded-lg text-[13px] font-semibold bg-gold text-navy-dark hover:bg-gold-light transition-all">Sign In</button>
          </div>
        </div>
        <div className="px-4 py-4 border-t border-white/10">
          <button onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-blue-200/70 hover:text-white hover:bg-white/5 transition-all">
            <Globe size={17} />{language === 'en' ? '한국어로 전환' : 'Switch to English'}
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-navy-dark flex flex-col z-50">
      <div className="px-4 pt-5 mb-4">
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-[12px] font-bold text-gold">
            {currentTeacher.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate">{currentTeacher.name}</p>
            <p className="text-blue-300/50 text-[10px]">
              {currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}
              {currentTeacher.is_head_teacher ? ' (Head Teacher)' : ''}
            </p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-lg text-blue-300/40 hover:text-white hover:bg-white/10 transition-all" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item && item.section) {
            return <div key={i} className="text-[10px] uppercase tracking-widest text-blue-300/40 font-medium px-3 mt-5 mb-2">{item.section}</div>
          }
          if (!item.id || !item.icon) return null
          const Icon = item.icon
          const label = (t.nav as any)[item.id] || item.id
          const isActive = activeView === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id!)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all mb-0.5 ${isActive ? 'bg-gold/15 text-gold' : 'text-blue-200/70 hover:text-white hover:bg-white/5'}`}>
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
              {item.id === 'dashboard' && flaggedCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">{flaggedCount > 9 ? '9+' : flaggedCount}</span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        <button onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-blue-200/70 hover:text-white hover:bg-white/5 transition-all">
          <Globe size={17} />{language === 'en' ? '한국어로 전환' : 'Switch to English'}
        </button>
      </div>
    </aside>
  )
}
