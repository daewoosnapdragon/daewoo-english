'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { NAV_DAILY, NAV_ORDER, VIEW_PATHS, PAGE_TITLES, viewForPath, navLabel } from '@/lib/routes'
import { logActivity, logPageOpen } from '@/lib/activity'
import { Search, Moon, Sun, Globe, LogOut, ChevronDown, ChevronUp, Bell, Sparkles, BookOpen, AlertTriangle, Type, Megaphone, CaseSensitive } from 'lucide-react'
import { useWhatsNew } from '@/components/guide/useWhatsNew'
import { OfficeJobsBand } from '@/components/dashboard/OfficeJobs'
import { FlowerAvatar, flowerForClass } from '@/components/brand/ClassFlower'
import PhoneNav from '@/components/layout/PhoneNav'
import { useNavSignals, useMoreIds, gradesPhrase, NavMarks, type Signals } from '@/components/layout/navSignals'
import { termProgress, termMonths, daysUntil } from '@/lib/term'
import { TEXT_SIZES, FONTS, type TextSize, type FontChoice, currentTextSize, setTextSize, currentFont, setFont, onDisplayChange } from '@/lib/display'
import { confirmLeave } from '@/lib/unsaved'

// ─── Masthead ────────────────────────────────────────────────────────
// What stays at the top while a page scrolls: the brand row, the links in
// two groups (Daily, Planning) with More after them, and one thin row of
// context that carries the term. Reminders sit below it and scroll away
// with the page. On a phone the top is one row (brand, find, name) and the
// links move to a bar at the bottom (PhoneNav).

const CLASS_DOT: Record<string, string> = {
  Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy',
  Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon',
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

// ─── Name menu ───────────────────────────────────────────────────────
// Only what belongs to the person: how the app looks and reads, help, and
// signing out. The pages that used to live here are in the nav's More.
const FONT_LABEL: Record<FontChoice, { en: string; ko: string }> = {
  classic: { en: 'Classic', ko: '기본' }, clean: { en: 'Clean', ko: '깔끔하게' },
  readable: { en: 'Easy to read', ko: '읽기 쉽게' }, system: { en: 'This device', ko: '기기 기본' },
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const { currentTeacher, setCurrentTeacher, language, setLanguage, theme, setTheme } = useApp()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const { unseen } = useWhatsNew()
  const ko = language === 'ko'
  // Esc closes the menu and puts focus back on the name, like the More menu.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  // Text size and typeface follow lib/display (globals.css --ts, data-font).
  const [textSize, setSize] = useState<TextSize>('standard')
  const [font, setFontState] = useState<FontChoice>('classic')
  useEffect(() => {
    const sync = () => { setSize(currentTextSize()); setFontState(currentFont()) }
    sync()
    return onDisplayChange(sync)
  }, [])
  const nextTextSize = () => setTextSize(TEXT_SIZES[(TEXT_SIZES.indexOf(textSize) + 1) % TEXT_SIZES.length])
  const nextFont = () => setFont(FONTS[(FONTS.indexOf(font) + 1) % FONTS.length])
  const sizeLabel = ko ? { standard: '보통', larger: '크게', largest: '아주 크게' }[textSize] : { standard: 'Standard', larger: 'Larger', largest: 'Largest' }[textSize]
  if (!currentTeacher) return null
  // Signing out leaves the page too, so unsaved edits are asked about first (lib/unsaved.ts).
  const signOut = async () => { setOpen(false); if (!(await confirmLeave())) return; logActivity('logout'); setCurrentTeacher(null); sessionStorage.removeItem('daewoo_teacher_id'); router.push('/dashboard') }
  const item = 'w-full flex items-center gap-2.5 px-3 py-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:bg-paper-2 hover:text-ink text-left'
  const newCount = unseen.length
  return (
    <div className="relative">
      <button ref={triggerRef} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="true"
        aria-label={compact ? `${currentTeacher.name}${newCount ? (ko ? ` · 새 소식 ${newCount}개` : ` · ${newCount} new`) : ''}` : undefined}
        className={`relative flex items-center gap-2 h-9 rounded border border-transparent hover:border-rule-2 text-[length:calc(13px*var(--ts))] ${compact ? 'px-0.5' : 'pl-0.5 pr-2'}`}>
        <FlowerAvatar name={flowerForClass(currentTeacher.english_class)} size={30} />
        {!compact && <span className="font-medium text-ink">{currentTeacher.name}</span>}
        {newCount > 0 && <span className={`w-1.5 h-1.5 rounded-full bg-accent ${compact ? 'absolute top-1 right-0' : ''}`} title={ko ? '새 소식' : 'Something new'} />}
        {!compact && <span className="text-ink-3 hidden md:inline">· {currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span>}
        {!compact && <ChevronDown size={13} className="text-ink-3" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-[230px] bg-surface border border-rule-2 rounded shadow-lg z-50 py-1">
            {compact && <p className="px-3 pt-1.5 pb-2 text-[length:calc(13px*var(--ts))] text-ink border-b border-rule mb-1"><span className="font-semibold">{currentTeacher.name}</span><span className="text-ink-3"> · {currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span></p>}
            <button className={item} onClick={() => setLanguage(language === 'en' ? 'ko' : 'en')}>
              <Globe size={14} />{language === 'en' ? '한국어' : 'English'}
            </button>
            <button className={item} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? (ko ? '라이트 모드' : 'Light mode') : (ko ? '다크 모드' : 'Dark mode')}
            </button>
            <button className={item} onClick={nextTextSize}>
              <Type size={14} />{ko ? '글자 크기' : 'Text size'}<span className="ml-auto text-ink-3">{sizeLabel}</span>
            </button>
            <button className={item} onClick={nextFont}>
              <CaseSensitive size={14} />{ko ? '글꼴' : 'Font'}<span className="ml-auto text-ink-3">{ko ? FONT_LABEL[font].ko : FONT_LABEL[font].en}</span>
            </button>
            <div className="border-t border-rule my-1" />
            <Link href="/guide" className={item} onClick={() => setOpen(false)}>
              <BookOpen size={14} />{ko ? '사용 안내' : 'How to use this app'}
            </Link>
            <Link href="/whats-new" className={item} onClick={() => setOpen(false)}>
              <Sparkles size={14} />{ko ? '새로운 기능' : 'What’s new'}
              {newCount > 0 && <span className="ml-auto text-[length:calc(11.5px*var(--ts))] font-semibold text-accent tabular-nums">{newCount}<span className="sr-only">{ko ? '개 새 소식' : ' new'}</span></span>}
            </Link>
            <div className="border-t border-rule my-1" />
            <button className={item} onClick={signOut}>
              <LogOut size={14} />{ko ? '로그아웃' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Context row: who, when, and where in the term ───────────────────
// One thin row under the links. The term reads as words ("Week 13 of 22 ·
// report cards Dec 11"); the line along the row's foot fills across the
// semester with an oxblood notch at the report card cutoff. The words are a
// button: click or Enter opens a band with the months, Esc or a click
// elsewhere closes it. Resting the pointer on the line opens it too.
function ContextRow({ now, ko, slim = false }: { now: Date | null; ko: boolean; slim?: boolean }) {
  const { currentTeacher, activeSemester, language } = useApp()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const bandId = useId()
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rest = () => { if (restTimer.current) clearTimeout(restTimer.current); restTimer.current = setTimeout(() => setOpen(true), 500) }
  const leave = () => { if (restTimer.current) clearTimeout(restTimer.current) }
  useEffect(() => () => { if (restTimer.current) clearTimeout(restTimer.current) }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus() } }
    const onDown = (e: PointerEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown) }
  }, [open])
  if (!currentTeacher) return null

  const todayKey = now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` : null
  const cutoffDate = activeSemester ? (activeSemester.report_card_cutoff_date || activeSemester.grades_due_date) : null
  const term = activeSemester && todayKey ? termProgress(activeSemester.start_date, activeSemester.end_date, todayKey, cutoffDate) : null
  const months = term && activeSemester ? termMonths(activeSemester.start_date, activeSemester.end_date) : []
  const pct = (f: number) => `${(f * 100).toFixed(2)}%`
  const fmt = (d: string, o: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }) => new Date(d + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', o)
  const left = cutoffDate && todayKey ? daysUntil(cutoffDate, todayKey) : null
  const weekText = term ? (ko ? `${term.weeks}주 중 ${term.week}주차` : `Week ${term.week} of ${term.weeks}`) : ''
  const dueShort = cutoffDate && left != null && left >= 0 ? (ko ? `성적표 마감 ${fmt(cutoffDate, { month: 'long', day: 'numeric' })}` : `report cards ${fmt(cutoffDate, { month: 'short', day: 'numeric' })}`) : ''
  const dateStr = now
    ? now.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      + ' · ' + now.toLocaleTimeString(ko ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' }) + ' KST'
    : ''

  const line = term ? (
    <div className="term-line" aria-hidden="true" onMouseEnter={rest} onMouseLeave={leave} onClick={() => setOpen(o => !o)}>
      <span className="term-fill" style={{ width: pct(term.frac) }} />
      {term.cutoff != null && <span className="term-cut" style={{ left: pct(term.cutoff) }} />}
    </div>
  ) : <div className="h-px bg-rule" />

  const band = term && todayKey ? (
    <div id={bandId} className="term-band" aria-hidden={!open}>
      <div className="term-months" aria-hidden="true">
        {months.map(m => <span key={m.label} style={{ left: pct(m.frac) }}>{ko ? `${new Date(`${m.label} 1, 2000`).getMonth() + 1}월` : m.label}</span>)}
      </div>
      <div className="term-facts">
        <span><b>{weekText}</b> · {fmt(todayKey)}</span>
        {cutoffDate && left != null && (
          <span className="term-due"><i />{ko ? '성적표 마감' : 'Report cards due'} {fmt(cutoffDate)}{left > 0 ? (ko ? ` · ${left}일 남음` : ` · in ${left} day${left === 1 ? '' : 's'}`) : left === 0 ? (ko ? ' · 오늘' : ' · today') : ''}</span>
        )}
      </div>
    </div>
  ) : null

  // Collapsed masthead: the line alone, as before.
  if (slim) return <div ref={wrapRef} className={`term-wrap${open ? ' is-open' : ''}`}>{line}{band}</div>

  return (
    <div ref={wrapRef} className={`term-wrap max-sm:hidden${open ? ' is-open' : ''}`}>
      <div className="bg-paper-2 border-t border-rule">
        <div className="mx-auto max-w-[1440px] px-6 h-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-[length:calc(12px*var(--ts))] text-ink-2">
          <span />
          <div className="flex items-center gap-4 min-w-0 whitespace-nowrap">
            <span className="font-semibold text-ink">{activeSemester ? (language === 'ko' ? activeSemester.name_ko || activeSemester.name : activeSemester.name) : (ko ? '학기 없음' : 'No active semester')}</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${CLASS_DOT[currentTeacher.english_class] || 'bg-ink-3'}`} />
              <span className="font-semibold text-ink">{currentTeacher.role === 'admin' ? 'Admin' : currentTeacher.english_class}</span>
            </span>
            <span className="tabular-nums max-lg:hidden">{dateStr}</span>
            {term && (
              <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={bandId}
                className="h-6 -mx-1.5 px-1.5 rounded inline-flex items-center gap-1.5 text-ink hover:bg-paper-3/70">
                <span className="font-display italic text-[length:calc(13px*var(--ts))]">{weekText}</span>
                {dueShort && <span className="text-ink-2">· {dueShort}</span>}
                <ChevronDown size={12} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <span className="justify-self-end">
            <button type="button" onClick={() => window.dispatchEvent(new Event('daewoo:compose-notice'))}
              className="h-6 px-1.5 -mr-1.5 rounded inline-flex items-center gap-1.5 text-ink-2 hover:text-ink hover:bg-paper-3/70">
              <Megaphone size={12} />{ko ? '공지 남기기' : 'Post a notice'}
            </button>
          </span>
        </div>
      </div>
      {line}
      {band}
    </div>
  )
}

// ─── Nav links and the underline that stretches to the next page ─────
// Clicking a link stretches the oxblood underline from where it is toward
// the new page; if the page takes a moment, it spans the whole row and
// breathes until the page arrives, then settles under the new link.
// Daily links, a thin rule, Planning links, then More. The row never
// scrolls: it shows as many links as fit, in order, and the rest go into
// More ahead of the pages that always live there.
function NavLinks({ active, signals, className = '' }: { active: string; signals: Signals; className?: string }) {
  const { language } = useApp()
  const ko = language === 'ko'
  const moreIds = useMoreIds()
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
  const inMore = (id: string) => NAV_ORDER.indexOf(id) >= visible || moreIds.includes(id)
  const label = (id: string) => navLabel(id, language)

  // How many links fit: measured from an invisible copy of the row.
  const fit = useCallback(() => {
    const nav = navRef.current, m = measureRef.current
    if (!nav || !m) return
    const items = Array.from(m.children) as HTMLElement[]
    const more = items.pop()!.offsetWidth
    const sep = items.pop()!.offsetWidth
    const widths = items.map(el => el.offsetWidth)
    const avail = nav.clientWidth
    let used = more + sep, k = 0
    while (k < widths.length && used + widths[k] + (k === NAV_DAILY.length ? sep : 0) <= avail) { used += widths[k] + (k === NAV_DAILY.length ? sep : 0); k++ }
    setVisible(Math.max(1, k))
  }, [])
  useLayoutEffect(() => { fit() }, [fit, language, signals.cases, signals.flagged, signals.unmarked.length, signals.attendanceDone])
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const ro = new ResizeObserver(() => fit())
    ro.observe(nav)
    document.fonts?.ready.then(() => { fit(); requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))) })
    return () => ro.disconnect()
  }, [fit])
  useEffect(() => { setMenuOpen(false) }, [active])
  // Esc closes More wherever focus is, and puts focus back on More.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); moreRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const edges = (id: string): [number, number] | null => {
    const a = inMore(id) ? moreRef.current : linkRefs.current[id]
    const nav = navRef.current
    if (!a || !nav) return null
    // Measured against the nav itself: the More button sits inside its own wrapper.
    const r = a.getBoundingClientRect(), n = nav.getBoundingClientRect()
    const left = r.left - n.left + nav.scrollLeft
    return [left + 12, left + r.width - 12]
  }
  const known = (id: string) => NAV_ORDER.includes(id) || moreIds.includes(id)
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
    const e = known(active) ? edges(active) : null
    if (!e) { s?.classList.remove('is-placed'); return }
    place(e[0], e[1], animate ? 280 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, place, visible, moreIds.join()])

  useLayoutEffect(() => { settle(pending.current != null); pending.current = null }, [active, settle])
  useEffect(() => {
    const again = () => settle(false)
    window.addEventListener('resize', again)
    return () => window.removeEventListener('resize', again)
  }, [settle])

  const go = (id: string, e: React.MouseEvent) => {
    setMenuOpen(false)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 || id === active) return
    const o = known(active) ? edges(active) : null, n = edges(id)
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
  const marks = (id: string) => <NavMarks id={id} signals={signals} ko={ko} />
  const hiddenNeedsLook = hiddenIds.some(id => (id === 'dashboard' && (signals.cases || signals.flagged)) || (id === 'attendance' && signals.unmarked.length > 0))
  const moreLabel = ko ? '더보기' : 'More'
  const sep = <span aria-hidden="true" className="flex-none self-center w-px h-4 mx-2 bg-rule-2" />
  const menuItem = (id: string) => (
    <Link key={id} role="menuitem" href={VIEW_PATHS[id]} onClick={e => go(id, e)} aria-current={active === id ? 'page' : undefined}
      className={`flex items-center gap-2 px-3 py-2 text-[length:calc(13px*var(--ts))] ${active === id ? 'text-ink font-semibold bg-paper-2' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}>
      {label(id)}{marks(id)}
    </Link>
  )

  return (
    <nav ref={navRef} className={`relative flex justify-center min-w-0 ${className}`} aria-label={ko ? '주 메뉴' : 'Main'}>
      {NAV_ORDER.slice(0, visible).map((id, i) => (
        <span key={id} className="contents">
          {i === NAV_DAILY.length && sep}
          <Link href={VIEW_PATHS[id]} ref={el => { linkRefs.current[id] = el }} onClick={e => go(id, e)} aria-current={active === id ? 'page' : undefined} className={linkClass(active === id)}>
            {label(id)}{marks(id)}
          </Link>
        </span>
      ))}
      {visible <= NAV_DAILY.length ? null : sep}
      <div className="relative flex-none">
        <button ref={moreRef} type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-haspopup="menu"
          className={linkClass(inMore(active))}>
          {moreLabel}
          {hiddenNeedsLook && <span className="w-1.5 h-1.5 rounded-full bg-warn" />}
          <ChevronDown size={13} className="text-ink-3" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div role="menu" className="absolute right-0 top-full mt-1 z-50 min-w-[190px] bg-surface border border-rule-2 rounded shadow-lg py-1">
              {hiddenIds.map(menuItem)}
              {hiddenIds.length > 0 && <div className="border-t border-rule my-1" />}
              {moreIds.map(menuItem)}
            </div>
          </>
        )}
      </div>
      <span ref={sliderRef} className="nav-slider" aria-hidden="true" />
      {/* An invisible copy of the row, to measure what fits: the links, the rule, More. */}
      <div ref={measureRef} aria-hidden="true" className="absolute left-0 top-0 h-0 w-0 overflow-hidden invisible flex">
        {NAV_ORDER.map(id => <span key={id} className={linkClass(false)}>{label(id)}{marks(id)}</span>)}
        <span className="flex-none w-px mx-2" />
        <span className={linkClass(false)}>{moreLabel}<span className="w-1.5 h-1.5" /><ChevronDown size={13} /></span>
      </div>
    </nav>
  )
}

// ─── The bar ─────────────────────────────────────────────────────────
export default function Masthead() {
  const { language, currentTeacher } = useApp()
  const ko = language === 'ko'
  const pathname = usePathname()
  const active = viewForPath(pathname)
  const signals = useNavSignals(pathname)
  const now = useKstClock()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
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

  // Below the sticky part, and gone once there is nothing to say. The
  // attendance reminder names the grade and opens it; it is not shown on
  // Attendance itself, where the page already says what is unmarked.
  const first = signals.unmarked[0]
  const reminders = (
    <div className="no-print">
      {signals.overdue > 0 && (
        <Link href="/dashboard" className="block bg-bad-soft border-b border-rule">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 min-h-8 py-1.5 flex items-center justify-center gap-2 text-center text-[length:calc(12.5px*var(--ts))] font-semibold text-bad">
            <AlertTriangle size={13} className="flex-none" />{ko ? `행동 사례 ${signals.overdue}건이 처리되지 않고 기다리고 있습니다` : `${signals.overdue} behavior ${signals.overdue === 1 ? 'case has' : 'cases have'} been waiting for your action for days`}
          </div>
        </Link>
      )}
      {signals.reminder && first && active !== 'attendance' && (
        <Link href={`/attendance?grade=${first.grade}`} className="block bg-warn-soft border-b border-rule">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 min-h-8 py-1.5 flex items-center justify-center gap-2 text-center text-[length:calc(12.5px*var(--ts))] font-semibold text-warn">
            <Bell size={13} className="flex-none" />
            {ko
              ? `${currentTeacher.english_class} · ${gradesPhrase(signals.unmarked, true)} 출석이 아직 체크되지 않았습니다`
              : `${currentTeacher.english_class} · ${gradesPhrase(signals.unmarked, false)} ${signals.unmarked.length === 1 ? 'is' : 'are'} not marked yet`}
            <span className="font-normal underline underline-offset-2">{ko ? '출석부 열기' : 'Mark it'}</span>
          </div>
        </Link>
      )}
      <OfficeJobsBand />
    </div>
  )

  const toggle = (
    <button onClick={toggleCollapsed} title={collapsed ? (ko ? '헤더 펼치기' : 'Expand header') : (ko ? '헤더 접기' : 'Collapse header')}
      aria-label={collapsed ? (ko ? '헤더 펼치기' : 'Expand header') : (ko ? '헤더 접기' : 'Collapse header')}
      className="w-7 h-7 rounded flex items-center justify-center text-ink-3 hover:text-ink hover:bg-paper-2">
      {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
    </button>
  )

  // Phone: one row. The links are in the bar at the bottom (PhoneNav).
  const phoneRow = (
    <div className="sm:hidden h-12 flex items-center gap-1" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))' }}>
      <Link href="/dashboard" className="font-display text-[length:calc(20px*var(--ts))] leading-none text-ink tracking-tight whitespace-nowrap mr-auto">Daewoo English</Link>
      <button type="button" onClick={() => window.dispatchEvent(new Event('daewoo:open-palette'))} aria-label={ko ? '찾기: 학생, 페이지, 동작' : 'Find a student, page or action'}
        className="w-11 h-11 rounded flex items-center justify-center text-ink-2 hover:text-ink">
        <Search size={19} />
      </button>
      <UserMenu compact />
    </div>
  )

  const phoneNav = mounted ? createPortal(<PhoneNav active={active} signals={signals} />, document.body) : null

  if (collapsed) {
    return (
      <>
        <header className="sticky top-0 z-40 bg-surface border-b border-rule-2 no-print">
          {phoneRow}
          <div className="max-sm:hidden mx-auto max-w-[1440px] px-6 grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <Link href="/dashboard" className="font-display text-[length:calc(18px*var(--ts))] leading-none text-ink tracking-tight whitespace-nowrap">Daewoo English</Link>
            <NavLinks active={active} signals={signals} />
            <div className="flex items-center gap-2"><UserMenu />{toggle}</div>
          </div>
          <div className="max-sm:hidden"><ContextRow now={now} ko={ko} slim /></div>
        </header>
        {reminders}
        {phoneNav}
      </>
    )
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface no-print">
        {phoneRow}
        <div className="max-sm:hidden mx-auto max-w-[1440px] px-6">
          {/* Row 1: find · brand · name */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-2">
            <div className="justify-self-start"><StudentFinder /></div>
            <Link href="/dashboard" className="justify-self-center font-display text-[length:calc(26px*var(--ts))] leading-none text-ink tracking-tight">
              Daewoo English
            </Link>
            <div className="justify-self-end flex items-center gap-2"><UserMenu />{toggle}</div>
          </div>
          {/* Row 2: Daily | Planning | More */}
          <NavLinks active={active} signals={signals} className="border-t border-rule" />
        </div>
        {/* Row 3: context and the term; its foot is the term line. On a phone, the line alone. */}
        <ContextRow now={now} ko={ko} />
        <div className="sm:hidden"><ContextRow now={now} ko={ko} slim /></div>
      </header>
      {reminders}
      {phoneNav}
    </>
  )
}
