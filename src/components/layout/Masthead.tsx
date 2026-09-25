'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { NAV_ORDER, VIEW_PATHS, viewForPath } from '@/lib/routes'
import { isSchoolDayOff } from '@/lib/calendarDays'
import { Search, Moon, Sun, Globe, Settings, LogOut, ChevronDown, ChevronUp, Bell } from 'lucide-react'

// ─── Masthead ────────────────────────────────────────────────────────
// Brand on its own line, links centered beneath it, a thin context bar under
// that. Replaces the sidebar so every screen gets the full width.

const CLASS_DOT: Record<string, string> = {
  Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy',
  Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon',
}

/** Plainer English labels than the translation file's; Korean keeps its own. */
const EN_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', grades: 'Grades', attendance: 'Attendance', lessonPlans: 'Lesson Plans',
  students: 'Students', readingLevels: 'Reading', reports: 'Reports', leveling: 'Level Tests', curriculum: 'Standards', wida: 'WIDA',
}

interface Signals { attendanceIncomplete: boolean; flagged: number; reminder: boolean }

/**
 * The two things the nav has to know: is today's attendance done, and (admin)
 * how many behavior logs are flagged. Re-checked on every route change and
 * once a minute, so the 3:30 reminder appears without a reload.
 */
function useNavSignals(pathname: string | null): Signals {
  const { currentTeacher } = useApp()
  const [s, setS] = useState<Signals>({ attendanceIncomplete: false, flagged: 0, reminder: false })
  useEffect(() => {
    if (!currentTeacher) return
    let cancelled = false
    const check = async () => {
      const isAdmin = currentTeacher.role === 'admin'
      const cls = currentTeacher.english_class
      const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const today = `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`
      const studentQuery = isAdmin
        ? supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_active', true)
        : supabase.from('students').select('id', { count: 'exact', head: true }).eq('english_class', cls).eq('is_active', true)
      const attQuery = isAdmin
        ? supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today)
        : supabase.from('attendance').select('id, students!inner(english_class)', { count: 'exact', head: true }).eq('date', today).eq('students.english_class', cls)
      const [{ count: studentCount }, { count: attCount }, flaggedRes] = await Promise.all([
        studentQuery, attQuery,
        isAdmin ? supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('is_flagged', true) : Promise.resolve({ count: 0 }),
      ])
      if (cancelled) return
      const dayOff = await isSchoolDayOff(today)
      if (cancelled) return
      const incomplete = !dayOff && !!(studentCount && (!attCount || attCount < studentCount))
      const day = kst.getDay(), minutes = kst.getHours() * 60 + kst.getMinutes()
      const afterHalfThree = day >= 1 && day <= 5 && minutes >= 15 * 60 + 30
      setS({ attendanceIncomplete: incomplete, flagged: flaggedRes.count || 0, reminder: incomplete && afterHalfThree })
    }
    check()
    const id = setInterval(check, 60_000)
    window.addEventListener('daewoo:attendance-saved', check)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('daewoo:attendance-saved', check) }
  }, [currentTeacher, pathname])
  return s
}

/** A live KST clock, to the minute. */
function useKstClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' })))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

// ─── Find anything ───────────────────────────────────────────────
// Looks like a search box; opens the command palette (⌘K).
function StudentFinder() {
  const { language } = useApp()
  return (
    <button onClick={() => window.dispatchEvent(new Event('daewoo:open-palette'))}
      className="relative w-[220px] h-8 pl-8 pr-2 text-left text-[12.5px] bg-paper-2 border border-rule-2 rounded text-ink-3 hover:border-ink-3">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
      {language === 'ko' ? '학생, 페이지, 동작…  ⌘K' : 'Find anything…  ⌘K'}
    </button>
  )
}

// ─── User menu ───────────────────────────────────────────────────────
function UserMenu() {
  const { currentTeacher, setCurrentTeacher, language, setLanguage, theme, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  if (!currentTeacher) return null
  const signOut = () => { setCurrentTeacher(null); sessionStorage.removeItem('daewoo_teacher_id'); router.push('/dashboard') }
  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-ink-2 hover:bg-paper-2 hover:text-ink text-left'
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded border border-transparent hover:border-rule-2 text-[13px]">
        <span className={`w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${CLASS_DOT[currentTeacher.english_class] || 'bg-ink'}`}>
          {currentTeacher.name.charAt(0)}
        </span>
        <span className="font-medium text-ink">{currentTeacher.name}</span>
        <span className="text-ink-3 hidden md:inline">· {currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span>
        <ChevronDown size={13} className="text-ink-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 w-[220px] bg-surface border border-rule-2 rounded shadow-lg z-50 py-1">
            <button className={item} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? (language === 'ko' ? '라이트 모드' : 'Light mode') : (language === 'ko' ? '다크 모드' : 'Dark mode')}
            </button>
            <button className={item} onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}>
              <Globe size={14} />{language === 'en' ? '한국어' : 'English'}
            </button>
            <Link href="/settings" className={item} onClick={() => setOpen(false)}>
              <Settings size={14} />{language === 'ko' ? '설정' : 'Settings'}
            </Link>
            <div className="border-t border-rule my-1" />
            <button className={item} onClick={signOut}>
              <LogOut size={14} />{language === 'ko' ? '로그아웃' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── The bar ─────────────────────────────────────────────────────────
export default function Masthead() {
  const { t, language, currentTeacher, activeSemester } = useApp()
  const pathname = usePathname()
  const active = viewForPath(pathname)
  const signals = useNavSignals(pathname)
  const now = useKstClock()
  // Collapsed: one slim row (brand · links · user). Remembered per browser.
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => { try { setCollapsed(localStorage.getItem('daewoo_masthead') === 'collapsed') } catch {} }, [])
  const toggleCollapsed = () => setCollapsed(c => { try { localStorage.setItem('daewoo_masthead', c ? 'open' : 'collapsed') } catch {}; return !c })
  if (!currentTeacher) return null

  const label = (id: string) => language === 'ko' ? ((t.nav as any)[id] || id) : (EN_LABELS[id] || id)
  const dateStr = now
    ? now.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      + ' · ' + now.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' }) + ' KST'
    : ''

  const links = (h: string) => NAV_ORDER.map(id => {
    const on = active === id
    const badge = id === 'dashboard' && signals.flagged > 0 ? signals.flagged : 0
    const dot = id === 'attendance' && signals.attendanceIncomplete
    return (
      <Link key={id} href={VIEW_PATHS[id]}
        className={`relative flex items-center gap-1.5 px-3 ${h} text-[13.5px] font-medium whitespace-nowrap transition-colors ${on ? 'text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`}>
        {label(id)}
        {badge ? <span className="min-w-[16px] h-4 px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center">{badge > 9 ? '9+' : badge}</span> : null}
        {dot ? <span className="w-1.5 h-1.5 rounded-full bg-warn" title={language === 'ko' ? '오늘 출석 미완료' : "Today's attendance is not finished"} /> : null}
        {on && <span className="absolute left-3 right-3 bottom-0 h-[2px] bg-accent" />}
      </Link>
    )
  })

  const reminder = signals.reminder && (
    <Link href="/attendance" className="block bg-warn-soft border-t border-rule">
      <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-warn">
        <Bell size={13} />{language === 'ko' ? '오늘 출석을 확인하셨나요?' : 'Did you mark attendance today?'}
      </div>
    </Link>
  )

  const toggle = (
    <button onClick={toggleCollapsed} title={collapsed ? (language === 'ko' ? '헤더 펼치기' : 'Expand header') : (language === 'ko' ? '헤더 접기' : 'Collapse header')}
      className="w-7 h-7 rounded flex items-center justify-center text-ink-3 hover:text-ink hover:bg-paper-2">
      {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </button>
  )

  if (collapsed) {
    return (
      <header className="sticky top-0 z-40 bg-surface border-b border-rule-2 no-print">
        <div className="mx-auto max-w-[1440px] px-6 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Link href="/dashboard" className="font-display text-[18px] leading-none text-ink tracking-tight whitespace-nowrap">Daewoo English</Link>
          <nav className="flex justify-center overflow-x-auto" aria-label="Main">{links('h-10')}</nav>
          <div className="flex items-center gap-2"><UserMenu />{toggle}</div>
        </div>
        {reminder}
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-rule-2 no-print">
      <div className="mx-auto max-w-[1440px] px-6">
        {/* Row 1: find · brand · user */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-3 pb-2">
          <div className="justify-self-start"><StudentFinder /></div>
          <Link href="/dashboard" className="justify-self-center font-display text-[26px] leading-none text-ink tracking-tight">
            Daewoo English
          </Link>
          <div className="justify-self-end flex items-center gap-2"><UserMenu />{toggle}</div>
        </div>
        {/* Row 2: links, centered */}
        <nav className="flex justify-center border-t border-rule overflow-x-auto" aria-label="Main">{links('h-10')}</nav>
      </div>
      {/* Row 3: context */}
      <div className="bg-paper-2 border-t border-rule">
        <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-5 text-[12px] text-ink-2">
          <span className="font-semibold text-ink">{activeSemester ? (language === 'ko' ? activeSemester.name_ko || activeSemester.name : activeSemester.name) : (language === 'ko' ? '학기 없음' : 'No active semester')}</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CLASS_DOT[currentTeacher.english_class] || 'bg-ink-3'}`} />
            <span className="font-semibold text-ink">{currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span>
          </span>
          <span className="tabular-nums">{dateStr}</span>
        </div>
      </div>
      {reminder}
    </header>
  )
}
