'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { loadLadderSettings, isOverdue } from '@/lib/behaviorLadder'
import { NAV_ORDER, VIEW_PATHS, PAGE_TITLES, viewForPath } from '@/lib/routes'
import { logActivity, logPageOpen, canViewActivity } from '@/lib/activity'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { isSchoolDayOff } from '@/lib/calendarDays'
import { Search, Moon, Sun, Globe, Settings, LogOut, ChevronDown, ChevronUp, Bell, Sparkles, BookOpen, AlertTriangle, Activity, Package, Wallet, Clock, Type, ClipboardList } from 'lucide-react'
import { useWhatsNew } from '@/components/guide/useWhatsNew'
import { OfficeJobsBand } from '@/components/dashboard/OfficeJobs'
import { FlowerAvatar, flowerForClass } from '@/components/brand/ClassFlower'
import DrawnCheck from '@/components/brand/DrawnCheck'
import { termProgress, termMonths, daysUntil } from '@/lib/term'
import { TEXT_SIZES, type TextSize, currentTextSize, setTextSize, onDisplayChange } from '@/lib/display'
import { confirmLeave } from '@/lib/unsaved'

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
  students: 'Students', readingLevels: 'Reading', reports: 'Reports', leveling: 'Level Tests', curriculum: 'Standards', wida: 'WIDA', planner: 'Curriculum',
}

interface Signals { attendanceIncomplete: boolean; attendanceDone: boolean; flagged: number; reminder: boolean; cases: number; overdue: number }

/**
 * The two things the nav has to know: is today's attendance done, and (admin)
 * how many behavior logs are flagged. Re-checked on every route change and
 * once a minute, so the 3:30 reminder appears without a reload.
 */
function useNavSignals(pathname: string | null): Signals {
  const { currentTeacher } = useApp()
  const [s, setS] = useState<Signals>({ attendanceIncomplete: false, attendanceDone: false, flagged: 0, reminder: false, cases: 0, overdue: 0 })
  const checkRef = useRef<() => void>(() => {})
  const lastCheck = useRef(Date.now())
  useEffect(() => {
    if (!currentTeacher) return
    let cancelled = false
    lastCheck.current = 0
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
      // Behavior ladder cases: every open one for admin, the class's for a teacher.
      const caseQuery = isAdmin
        ? supabase.from('behavior_cases').select('id, status, created_at').neq('status', 'closed')
        : supabase.from('behavior_cases').select('id, status, created_at, students!inner(english_class)').neq('status', 'closed').eq('students.english_class', cls)
      const [{ count: studentCount }, { count: attCount }, flaggedRes, caseRes, ladder] = await Promise.all([
        studentQuery, attQuery,
        isAdmin ? supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('is_flagged', true) : Promise.resolve({ count: 0 }),
        caseQuery, loadLadderSettings(),
      ])
      if (cancelled) return
      const caseRows = (caseRes.data || []) as any[]
      const overdue = isAdmin ? caseRows.filter(c => isOverdue(c, ladder.overdue_days)).length : 0
      const dayOff = await isSchoolDayOff(today)
      if (cancelled) return
      const incomplete = !dayOff && !!(studentCount && (!attCount || attCount < studentCount))
      const done = !dayOff && !!studentCount && !!attCount && attCount >= studentCount
      const day = kst.getDay(), minutes = kst.getHours() * 60 + kst.getMinutes()
      const afterHalfThree = day >= 1 && day <= 5 && minutes >= 15 * 60 + 30
      setS({ attendanceIncomplete: incomplete, attendanceDone: done, flagged: flaggedRes.count || 0, reminder: incomplete && afterHalfThree, cases: caseRows.length, overdue })
    }
    checkRef.current = () => { lastCheck.current = Date.now(); check() }
    checkRef.current()
    const id = setInterval(() => checkRef.current(), 60_000)
    const now = () => checkRef.current()
    window.addEventListener('daewoo:attendance-saved', now)
    window.addEventListener('daewoo:ladder-changed', now)
    return () => { cancelled = true; clearInterval(id); window.removeEventListener('daewoo:attendance-saved', now); window.removeEventListener('daewoo:ladder-changed', now) }
  }, [currentTeacher])
  // Changing page checks again only if the last check is more than 45 s old,
  // so a click does not send five requests the header already has answers to.
  useEffect(() => {
    if (Date.now() - lastCheck.current > 45_000) checkRef.current()
  }, [pathname])
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
    <button data-guide="find" onClick={() => window.dispatchEvent(new Event('daewoo:open-palette'))}
      className="relative w-[220px] h-8 pl-8 pr-2 text-left text-[length:calc(12.5px*var(--ts))] bg-paper-2 border border-rule-2 rounded text-ink-3 hover:border-ink-3">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
      {language === 'ko' ? '학생, 페이지, 동작…  ⌘K' : 'Find anything…  ⌘K'}
    </button>
  )
}

// ─── User menu ───────────────────────────────────────────────────────
function UserMenu() {
  const { currentTeacher, setCurrentTeacher, language, setLanguage, theme, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const { unseen } = useWhatsNew()
  // Esc closes the menu and puts focus back on the name, like the More menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // Text size: Standard, Larger, Largest. Every font size follows it (globals.css --ts).
  const [textSize, setSize] = useState<TextSize>('standard')
  useEffect(() => { setSize(currentTextSize()); return onDisplayChange(() => setSize(currentTextSize())) }, [])
  const nextTextSize = () => setTextSize(TEXT_SIZES[(TEXT_SIZES.indexOf(textSize) + 1) % TEXT_SIZES.length])
  const sizeLabel = language === 'ko' ? { standard: '보통', larger: '크게', largest: '아주 크게' }[textSize] : { standard: 'Standard', larger: 'Larger', largest: 'Largest' }[textSize]
  if (!currentTeacher) return null
  // Signing out leaves the page too, so unsaved edits are asked about first (lib/unsaved.ts).
  const signOut = async () => { setOpen(false); if (!(await confirmLeave())) return; logActivity('logout'); setCurrentTeacher(null); sessionStorage.removeItem('daewoo_teacher_id'); router.push('/dashboard') }
  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:bg-paper-2 hover:text-ink text-left'
  return (
    <div className="relative">
      <button ref={triggerRef} onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex items-center gap-2 h-9 pl-0.5 pr-2 rounded border border-transparent hover:border-rule-2 text-[length:calc(13px*var(--ts))]">
        <FlowerAvatar name={flowerForClass(currentTeacher.english_class)} size={30} />
        <span className="font-medium text-ink">{currentTeacher.name}</span>
        {unseen.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Something new" />}
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
            <button className={item} onClick={nextTextSize}>
              <Type size={14} />{language === 'ko' ? '글자 크기' : 'Text size'}<span className="ml-auto text-ink-3">{sizeLabel}</span>
            </button>
            <button className={item} onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}>
              <Globe size={14} />{language === 'en' ? '한국어' : 'English'}
            </button>
            {canSeeAdminJobs(currentTeacher) && (
              <Link href="/jobs" className={item} onClick={() => setOpen(false)}>
                <ClipboardList size={14} />{language === 'ko' ? '업무' : 'Jobs'}
              </Link>
            )}
            <Link href="/behavior" className={item} onClick={() => setOpen(false)}>
              <AlertTriangle size={14} />{language === 'ko' ? '행동' : 'Behavior'}
            </Link>
            <Link href="/supplies" className={item} onClick={() => setOpen(false)}>
              <Package size={14} />{language === 'ko' ? '비품' : 'Supplies'}
            </Link>
            <Link href="/overtime" className={item} onClick={() => setOpen(false)}>
              <Clock size={14} />{language === 'ko' ? '초과근무' : 'Overtime'}
            </Link>
            <Link href="/budget" className={item} onClick={() => setOpen(false)}>
              <Wallet size={14} />{language === 'ko' ? '예산' : 'Budget'}
            </Link>
            <Link href="/settings" className={item} onClick={() => setOpen(false)}>
              <Settings size={14} />{language === 'ko' ? '설정' : 'Settings'}
            </Link>
            {canViewActivity(currentTeacher) && (
              <Link href="/activity" className={item} onClick={() => setOpen(false)}>
                <Activity size={14} />{language === 'ko' ? '활동 기록' : 'Activity'}
              </Link>
            )}
            <div className="border-t border-rule my-1" />
            <Link href="/whats-new" className={item} onClick={() => setOpen(false)}>
              <Sparkles size={14} />{language === 'ko' ? '새로운 기능' : 'What’s new'}{unseen.length > 0 && <span className="ml-auto text-[length:calc(10.5px*var(--ts))] font-semibold text-white bg-accent rounded-full px-1.5">{unseen.length}</span>}
            </Link>
            <Link href="/guide" className={item} onClick={() => setOpen(false)}>
              <BookOpen size={14} />{language === 'ko' ? '사용 안내' : 'How to use this app'}
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

// ─── The term line ───────────────────────────────────────────────
// A solid line under the header that fills across the semester, with an
// oxblood notch where report card grades are due. Hover, tap or focus it
// and a band opens underneath with the months and what the marks mean.
function TermLine({ term, months, today, cutoffDate, ko }: { term: ReturnType<typeof termProgress> & {}; months: { label: string; frac: number }[]; today: string; cutoffDate: string | null; ko: boolean }) {
  const [open, setOpen] = useState(false)
  // Opens only when the pointer rests on the line, not when it crosses it on the way to the tabs.
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rest = () => { if (restTimer.current) clearTimeout(restTimer.current); restTimer.current = setTimeout(() => setOpen(true), 500) }
  const leave = () => { if (restTimer.current) clearTimeout(restTimer.current); setOpen(false) }
  useEffect(() => () => { if (restTimer.current) clearTimeout(restTimer.current) }, [])
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const left = cutoffDate ? daysUntil(cutoffDate, today) : null
  const pct = (f: number) => `${(f * 100).toFixed(2)}%`
  const weekText = ko ? `${term.weeks}주 중 ${term.week}주차` : `Week ${term.week} of ${term.weeks}`
  return (
    <div className={`term-wrap${open ? ' is-open' : ''}`} onMouseLeave={leave}>
      <div className="term-line" tabIndex={0} role="button" aria-expanded={open} aria-label={`${weekText}${cutoffDate ? ` · ${ko ? '성적표 마감' : 'Report cards due'} ${fmt(cutoffDate)}` : ''}`}
        onMouseEnter={rest} onClick={() => setOpen(o => !o)} onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setOpen(true) }} onBlur={leave}>
        <span className="term-fill" style={{ width: pct(term.frac) }} />
        {term.cutoff != null && <span className="term-cut" style={{ left: pct(term.cutoff) }} />}
      </div>
      <div className="term-band" aria-hidden={!open}>
        <div className="term-months">
          {months.map(m => <span key={m.label} style={{ left: pct(m.frac) }}>{ko ? `${new Date(`${m.label} 1, 2000`).getMonth() + 1}월` : m.label}</span>)}
        </div>
        <div className="term-facts">
          <span><b>{weekText}</b> · {fmt(today)}</span>
          {cutoffDate && left != null && (
            <span className="term-due"><i />{ko ? '성적표 마감' : 'Report cards due'} {fmt(cutoffDate)}{left > 0 ? (ko ? ` · ${left}일 남음` : ` · in ${left} day${left === 1 ? '' : 's'}`) : left === 0 ? (ko ? ' · 오늘' : ' · today') : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Nav links and the underline that stretches to the next page ─────
// Clicking a link stretches the oxblood underline from where it is toward
// the new page; if the page takes a moment, it spans the whole row and
// breathes until the page arrives, then settles under the new link.
// The row never scrolls: it shows as many links as fit, in order, and the
// rest go into More at the end.
function NavLinks({ active, signals, label, className = '' }: { active: string; signals: Signals; label: (id: string) => string; className?: string }) {
  const { language } = useApp()
  const navRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const sliderRef = useRef<HTMLSpanElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const pending = useRef<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [visible, setVisible] = useState(NAV_ORDER.length)
  const [menuOpen, setMenuOpen] = useState(false)
  const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const hiddenIds = NAV_ORDER.slice(visible)

  // How many links fit: measured from an invisible copy of the row.
  const fit = useCallback(() => {
    const nav = navRef.current, m = measureRef.current
    if (!nav || !m) return
    const items = Array.from(m.children) as HTMLElement[]
    const more = items.pop()!.offsetWidth
    const widths = items.map(el => el.offsetWidth)
    const avail = nav.clientWidth
    if (widths.reduce((a, b) => a + b, 0) <= avail) { setVisible(NAV_ORDER.length); return }
    let used = more, k = 0
    while (k < widths.length && used + widths[k] <= avail) { used += widths[k]; k++ }
    setVisible(Math.max(1, k))
  }, [])
  useLayoutEffect(() => { fit() }, [fit, language, signals.cases, signals.flagged, signals.attendanceIncomplete, signals.attendanceDone])
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(nav)
    document.fonts?.ready.then(() => { fit(); requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))) })
    return () => ro.disconnect()
  }, [fit])
  useEffect(() => { setMenuOpen(false) }, [active])

  const edges = (id: string): [number, number] | null => {
    const hidden = NAV_ORDER.indexOf(id) >= visible
    const a = hidden ? moreRef.current : linkRefs.current[id]
    const nav = navRef.current
    if (!a || !nav) return null
    // Measured against the nav itself: the More button sits inside its own wrapper.
    const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect()
    const left = r.left - n.left + nav.scrollLeft
    return [left + 12, left + r.width - 12]
  }
  const place = useCallback((l: number, r: number, ms = 0, easing = 'cubic-bezier(.2,.7,.2,1)') => {
    const s = sliderRef.current
    if (!s) return
    s.getAnimations().forEach(a => a.cancel())
    const from = { transform: getComputedStyle(s).transform, width: getComputedStyle(s).width }
    s.style.width = `${r - l}px`; s.style.transform = `translateX(${l}px)`
    s.classList.add('is-placed')
    if (ms && !reduce() && from.width !== '0px') s.animate([from, { transform: `translateX(${l}px)`, width: `${r - l}px` }], { duration: ms, easing })
  }, [])
  const settle = useCallback((animate: boolean) => {
    timers.current.forEach(clearTimeout); timers.current = []
    const s = sliderRef.current
    s?.classList.remove('is-waiting')
    const e = edges(active)
    if (!e || !NAV_ORDER.includes(active)) { s?.classList.remove('is-placed'); return }
    place(e[0], e[1], animate ? 280 : 0)
  }, [active, place, visible])

  useLayoutEffect(() => { settle(pending.current != null); pending.current = null }, [active, settle])
  useEffect(() => {
    const again = () => settle(false)
    window.addEventListener('resize', again)
    return () => window.removeEventListener('resize', again)
  }, [settle])

  const go = (id: string, e: React.MouseEvent) => {
    setMenuOpen(false)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || id === active) return
    const o = NAV_ORDER.includes(active) ? edges(active) : null, n = edges(id)
    if (!n) return
    pending.current = id
    timers.current.forEach(clearTimeout); timers.current = []
    if (o) place(Math.min(o[0], n[0]), Math.max(o[1], n[1]), 170, 'cubic-bezier(.3,0,.2,1)')
    else place(n[0], n[1], 0)
    timers.current.push(setTimeout(() => {
      if (pending.current !== id || !navRef.current) return
      place(4, navRef.current.clientWidth - 4, 320)
      sliderRef.current?.classList.add('is-waiting')
    }, 190))
    // If the page never comes (an error, a cancelled click), put the line back.
    timers.current.push(setTimeout(() => { if (pending.current === id) { pending.current = null; settle(true) } }, 10000))
  }

  const linkClass = (on: boolean) => `relative flex flex-none items-center gap-1.5 px-3 h-10 text-[length:calc(13.5px*var(--ts))] font-medium whitespace-nowrap transition-colors ${on ? 'text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`
  const marks = (id: string) => {
    const badge = id === 'dashboard' ? (signals.cases || signals.flagged) : 0
    const dot = id === 'attendance' && signals.attendanceIncomplete
    const done = id === 'attendance' && signals.attendanceDone
    return (
      <>
        {badge ? <span className="min-w-[16px] h-4 px-1 rounded-full bg-bad text-white text-[length:calc(10px*var(--ts))] font-bold flex items-center justify-center">{badge > 9 ? '9+' : badge}<span className="sr-only"> {language === 'ko' ? '건 확인 필요' : 'need a look'}</span></span> : null}
        {dot ? <span className="w-1.5 h-1.5 rounded-full bg-warn" title={language === 'ko' ? '오늘 출석 미완료' : "Today's attendance is not finished"}><span className="sr-only">{language === 'ko' ? '오늘 출석 미완료' : "Today's attendance is not finished"}</span></span> : null}
        {done ? <span title={language === 'ko' ? '오늘 출석 완료' : 'All marked today'} className="inline-flex"><DrawnCheck size={12} /><span className="sr-only">{language === 'ko' ? '오늘 출석 완료' : 'All marked today'}</span></span> : null}
      </>
    )
  }
  const hiddenNeedsLook = hiddenIds.some(id => (id === 'dashboard' && (signals.cases || signals.flagged)) || (id === 'attendance' && signals.attendanceIncomplete))
  const moreLabel = language === 'ko' ? '더보기' : 'More'

  return (
    <nav ref={navRef} className={`relative flex justify-center min-w-0 ${className}`} aria-label="Main">
      {NAV_ORDER.slice(0, visible).map(id => (
        <Link key={id} href={VIEW_PATHS[id]} ref={el => { linkRefs.current[id] = el }} onClick={e => go(id, e)} aria-current={active === id ? 'page' : undefined} className={linkClass(active === id)}>
          {label(id)}{marks(id)}
        </Link>
      ))}
      {hiddenIds.length > 0 && (
        <div className="relative flex-none">
          <button ref={moreRef} type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-haspopup="menu" className={linkClass(hiddenIds.includes(active))}>
            {moreLabel}
            {hiddenNeedsLook && <span className="w-1.5 h-1.5 rounded-full bg-warn" />}
            <ChevronDown size={13} className="text-ink-3" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 top-full mt-1 z-50 min-w-[190px] bg-surface border border-rule-2 rounded shadow-lg py-1"
                onKeyDown={e => { if (e.key === 'Escape') setMenuOpen(false) }}>
                {hiddenIds.map(id => (
                  <Link key={id} role="menuitem" href={VIEW_PATHS[id]} onClick={e => go(id, e)} aria-current={active === id ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-[length:calc(13px*var(--ts))] ${active === id ? 'text-ink font-semibold bg-paper-2' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}>
                    {label(id)}{marks(id)}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <span ref={sliderRef} className="nav-slider" aria-hidden="true" />
      {/* An invisible copy of the row, to measure what fits. */}
      <div ref={measureRef} aria-hidden="true" className="absolute left-0 top-0 h-0 w-0 overflow-hidden invisible flex">
        {NAV_ORDER.map(id => <span key={id} className={linkClass(false)}>{label(id)}{marks(id)}</span>)}
        <span className={linkClass(false)}>{moreLabel}<span className="w-1.5 h-1.5" /><ChevronDown size={13} /></span>
      </div>
    </nav>
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
  // Every page opened goes to the activity log, once per page per visit.
  // Pages that know what is on them rewrite this line with the specifics
  // (src/lib/useViewLog.ts).
  const lastVisit = useRef<string | null>(null)
  useEffect(() => {
    if (!currentTeacher || !pathname || lastVisit.current === pathname) return
    lastVisit.current = pathname
    const view = viewForPath(pathname)
    logPageOpen(`${PAGE_TITLES[view] || pathname}${pathname !== (VIEW_PATHS[view] || '') ? ` · ${pathname}` : ''}`, pathname)
  }, [pathname, currentTeacher])
  if (!currentTeacher) return null

  const label = (id: string) => language === 'ko' ? ((t.nav as any)[id] || id) : (EN_LABELS[id] || id)
  // Where we are in the term: a solid line under the context bar.
  const todayKey = now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` : null
  const term = activeSemester && todayKey ? termProgress(activeSemester.start_date, activeSemester.end_date, todayKey, activeSemester.report_card_cutoff_date || activeSemester.grades_due_date) : null
  const cutoffDate = activeSemester ? (activeSemester.report_card_cutoff_date || activeSemester.grades_due_date) : null
  const termLine = term && activeSemester && todayKey ? (
    <TermLine term={term} months={termMonths(activeSemester.start_date, activeSemester.end_date)} today={todayKey} cutoffDate={cutoffDate} ko={language === 'ko'} />
  ) : null
  const dateStr = now
    ? now.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      + ' · ' + now.toLocaleTimeString(language === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' }) + ' KST'
    : ''

  const reminder = (
    <>
      {signals.overdue > 0 && (
        <Link href="/dashboard" className="block bg-bad border-t border-bad">
          <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-2 text-[length:calc(12.5px*var(--ts))] font-semibold text-white">
            <AlertTriangle size={13} />{language === 'ko' ? `행동 사례 ${signals.overdue}건이 처리되지 않고 기다리고 있습니다` : `${signals.overdue} behavior ${signals.overdue === 1 ? 'case has' : 'cases have'} been waiting for your action for days`}
          </div>
        </Link>
      )}
      {signals.reminder && (
        <Link href="/attendance" className="block bg-warn-soft border-t border-rule">
          <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-2 text-[length:calc(12.5px*var(--ts))] font-semibold text-warn">
            <Bell size={13} />{language === 'ko' ? '오늘 출석을 확인하셨나요?' : 'Did you mark attendance today?'}
          </div>
        </Link>
      )}
      <OfficeJobsBand />
    </>
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
          <Link href="/dashboard" className="font-display text-[length:calc(18px*var(--ts))] leading-none text-ink tracking-tight whitespace-nowrap">Daewoo English</Link>
          <NavLinks active={active} signals={signals} label={label} />
          <div className="flex items-center gap-2"><UserMenu />{toggle}</div>
        </div>
        {termLine}
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
          <Link href="/dashboard" className="justify-self-center font-display text-[length:calc(26px*var(--ts))] leading-none text-ink tracking-tight">
            Daewoo English
          </Link>
          <div className="justify-self-end flex items-center gap-2"><UserMenu />{toggle}</div>
        </div>
        {/* Row 2: links, centered */}
        <NavLinks active={active} signals={signals} label={label} className="border-t border-rule" />
      </div>
      {/* Row 3: context */}
      <div className="bg-paper-2 border-t border-rule">
        <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-5 text-[length:calc(12px*var(--ts))] text-ink-2">
          <span className="font-semibold text-ink">{activeSemester ? (language === 'ko' ? activeSemester.name_ko || activeSemester.name : activeSemester.name) : (language === 'ko' ? '학기 없음' : 'No active semester')}</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${CLASS_DOT[currentTeacher.english_class] || 'bg-ink-3'}`} />
            <span className="font-semibold text-ink">{currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span>
          </span>
          <span className="tabular-nums">{dateStr}</span>
          {term && <span className="font-display italic text-[length:calc(13px*var(--ts))] text-ink">{language === 'ko' ? `${term.weeks}주 중 ${term.week}주차` : `Week ${term.week} of ${term.weeks}`}</span>}
        </div>
      </div>
      {termLine}
      {reminder}
    </header>
  )
}
