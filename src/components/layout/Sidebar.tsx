'use client'

import { useApp } from '@/lib/context'
import { Teacher } from '@/types'
import {
  LayoutDashboard, Users, ClipboardEdit, FileText, Layers,
  CalendarCheck, BookOpen, ListChecks, Wrench, Bell, Settings, Globe
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

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-navy-dark flex flex-col z-50">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-gold font-display text-xl font-bold tracking-tight">대우 English</h1>
        <p className="text-[11px] text-blue-300/60 uppercase tracking-widest mt-0.5">Program Management</p>
      </div>

      {/* Role Selector */}
      <div className="px-4 mb-4">
        <label className="text-[10px] uppercase tracking-widest text-blue-300/50 font-medium px-1 mb-1 block">
          {language === 'ko' ? '보기' : 'Viewing As'}
        </label>
        <select
          value={currentTeacher?.id || ''}
          onChange={e => {
            const teacher = teachers.find(t => t.id === e.target.value) || null
            setCurrentTeacher(teacher)
          }}
          className="w-full px-3 py-2 bg-navy rounded-lg text-[13px] text-white border border-blue-400/20 outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">{language === 'ko' ? '전체 보기 (관리자)' : 'All Classes (Admin)'}</option>
          {teachers.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.english_class === 'Admin' ? 'Admin' : t.english_class}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item, i) => {
          if ('section' in item && item.section) {
            return (
              <div key={i} className="text-[10px] uppercase tracking-widest text-blue-300/40 font-medium px-3 mt-5 mb-2">
                {item.section}
              </div>
            )
          }
          if (!item.id || !item.icon) return null
          const Icon = item.icon
          const label = (t.nav as any)[item.id] || item.id
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id!)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all mb-0.5 ${
                isActive
                  ? 'bg-gold/15 text-gold'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Language Toggle */}
      <div className="px-4 py-4 border-t border-white/10">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-blue-200/70 hover:text-white hover:bg-white/5 transition-all"
        >
          <Globe size={17} />
          {language === 'en' ? '한국어로 전환' : 'Switch to English'}
        </button>
      </div>
    </aside>
  )
}
