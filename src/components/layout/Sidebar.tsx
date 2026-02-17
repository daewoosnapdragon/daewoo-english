'use client'

import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard, Users, ClipboardEdit, FileText, Layers,
  CalendarCheck, BookOpen, Settings, Globe, LogOut, GraduationCap,
  ChevronsLeft, ChevronsRight, Map, AlertTriangle, CalendarDays, Moon, Sun, BarChart3
} from 'lucide-react'

const NAV_ITEMS = [
  { section: 'DAILY' },
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'grades', icon: ClipboardEdit },
  { id: 'attendance', icon: CalendarCheck },
  { id: 'lessonPlans', icon: CalendarDays },
  { section: 'MANAGE' },
  { id: 'students', icon: Users },
  { id: 'readingLevels', icon: BookOpen },
  { id: 'reports', icon: FileText },
  { id: 'leveling', icon: Layers },
  { id: 'curriculum', icon: Map },
  { id: 'teacherGuides', icon: GraduationCap },
  { section: 'SYSTEM' },
  { id: 'adminDashboard', icon: BarChart3, adminOnly: true },
  { id: 'settings', icon: Settings },
]

// Notification dot types
interface NavDots { [key: string]: { count: number; color: string } }

export default function Sidebar({
  activeView, onNavigate, teachers, collapsed, onToggleCollapse
}: {
  activeView: string
  onNavigate: (view: string) => void
  teachers: Teacher[]
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { t, language, setLanguage, currentTeacher, setCurrentTeacher, theme, setTheme } = useApp()
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [dots, setDots] = useState<NavDots>({})

  // Load notification dots
  useEffect(() => {
    if (!currentTeacher) return
    const isAdmin = currentTeacher.role === 'admin'
    const cls = currentTeacher.english_class

    ;(async () => {
      const newDots: NavDots = {}

      // Flagged behavior count (admin only)
      if (isAdmin) {
        const { count } = await supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('is_flagged', true)
        if (count && count > 0) newDots.dashboard = { count, color: 'bg-red-500' }
      }

      // Check today's attendance
      const today = new Date().toISOString().split('T')[0]
      const studentQuery = isAdmin
        ? supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true)
        : supabase.from('students').select('id', { count: 'exact', head: true }).eq('english_class', cls).eq('is_active', true)
      const { count: studentCount } = await studentQuery
      const attQuery = isAdmin
        ? supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today)
        : supabase.from('attendance').select('id, students!inner(english_class)', { count: 'exact', head: true }).eq('date', today).eq('students.english_class', cls)
      const { count: attCount } = await attQuery
      if (studentCount && (!attCount || attCount < studentCount)) {
        newDots.attendance = { count: 0, color: 'bg-amber-500' } // dot only, no number
      }

      setDots(newDots)
      setFlaggedCount(newDots.dashboard?.count || 0)
    })()
  }, [currentTeacher, activeView])

  const handleLogout = () => {
    setCurrentTeacher(null)
    sessionStorage.removeItem('daewoo_teacher_id')
  }

  if (!currentTeacher) return null

  const w = collapsed ? 'w-[60px]' : 'w-[220px]'

  return (
    <aside className={`fixed left-0 top-0 bottom-0 ${w} bg-navy-dark flex flex-col z-50 transition-all duration-200`}>
      <div className={`${collapsed ? 'px-2' : 'px-3'} pt-4 mb-1`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-1'} mb-2`}>
          <div className="w-8 h-8 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={16} className="text-gold" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] font-display font-semibold tracking-tight">Daewoo English</p>
              <p className="text-blue-300/40 text-[9px]">School Management</p>
            </div>
          )}
        </div>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-1 py-2 rounded-lg bg-white/5">
            <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-[10px] font-bold text-gold">
              {currentTeacher.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[11px] font-medium truncate">{currentTeacher.name}</p>
              <p className="text-blue-300/50 text-[9px]">
                {currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}
              </p>
            </div>
            <button onClick={handleLogout} className="p-1 rounded-lg text-blue-300/40 hover:text-white hover:bg-white/10 transition-all" title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <button onClick={handleLogout} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-blue-300/40 hover:text-white hover:bg-white/10 transition-all" title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item && item.section) {
            if (collapsed) return <div key={i} className="border-t border-white/5 my-2 mx-2" />
            return <div key={i} className="text-[9px] uppercase tracking-widest text-blue-300/40 font-medium px-2.5 mt-4 mb-1.5">{item.section}</div>
          }
          if (!item.id || !item.icon) return null
          if ((item as any).adminOnly && currentTeacher?.role !== 'admin') return null
          const Icon = item.icon
          const label = (t.nav as any)[item.id] || item.id
          const isActive = activeView === item.id
          const badge = item.id === 'dashboard' && flaggedCount > 0 ? flaggedCount : null
          const dot = item.id ? dots[item.id] : null
          if (collapsed) {
            return (
              <button key={item.id} onClick={() => onNavigate(item.id!)} title={label}
                className={`w-full flex items-center justify-center py-2 rounded-lg transition-all mb-0.5 relative ${isActive ? 'bg-gold/15 text-gold' : 'text-blue-200/70 hover:text-white hover:bg-white/5'}`}>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                {badge ? <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[7px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>
                  : dot ? <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${dot.color} animate-pulse`} /> : null}
              </button>
            )
          }
          return (
            <button key={item.id} onClick={() => onNavigate(item.id!)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all mb-0.5 ${isActive ? 'bg-gold/15 text-gold' : 'text-blue-200/70 hover:text-white hover:bg-white/5'}`}>
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
              {badge ? <span className="ml-auto bg-red-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">{badge > 9 ? '9+' : badge}</span>
                : dot ? <span className={`ml-auto w-2 h-2 rounded-full ${dot.color} animate-pulse`} /> : null}
            </button>
          )
        })}
      </nav>
      <div className={`${collapsed ? 'px-1.5' : 'px-3'} py-3 border-t border-white/10`}>
        {!collapsed && (
          <>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] text-blue-200/70 hover:text-white hover:bg-white/5 transition-all mb-0.5">
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12px] text-blue-200/70 hover:text-white hover:bg-white/5 transition-all mb-1">
              <Globe size={15} />{language === 'en' ? '한국어' : 'English'}
            </button>
          </>
        )}
        {collapsed && (
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-center py-2 rounded-lg text-blue-200/70 hover:text-white hover:bg-white/5 transition-all mb-0.5" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
        <button onClick={onToggleCollapse}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-2.5'} py-2 rounded-lg text-[12px] text-blue-300/40 hover:text-white hover:bg-white/5 transition-all`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /> <span>Collapse</span></>}
        </button>
      </div>
    </aside>
  )
}
