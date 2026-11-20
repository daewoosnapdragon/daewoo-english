'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Users, BookOpen, LayoutDashboard, MoreHorizontal, Megaphone, CircleHelp, X } from 'lucide-react'
import { useApp } from '@/lib/context'
import { NAV_DAILY, NAV_PLANNING, PHONE_TABS, VIEW_PATHS, navLabel, guideHrefFor } from '@/lib/routes'
import { NavMarks, useMoreIds, gradesPhrase, type Signals } from '@/components/layout/navSignals'

// ─── Phone navigation ────────────────────────────────────────────
// Below 640px the masthead is one row and the links live here, at the
// bottom where a thumb reaches: Attendance first, because that is what a
// teacher opens in a hallway. More opens a sheet with every other page.
// Links are plain links, so the unsaved-work guard (lib/unsaved.ts) asks
// before any of them leaves a page with edits, as it does in the masthead.
// The bar's height, safe area included, is --tabbar-h (globals.css): the
// page pads its foot by it and sticky save bars sit on it.

const ICONS: Record<string, typeof Users> = {
  attendance: ClipboardCheck, students: Users, readingLevels: BookOpen, dashboard: LayoutDashboard,
}

export default function PhoneNav({ active, signals }: { active: string; signals: Signals }) {
  const { language } = useApp()
  const ko = language === 'ko'
  const moreIds = useMoreIds()
  const [open, setOpen] = useState(false)
  const moreRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // A page change closes the sheet.
  useEffect(() => { setOpen(false) }, [active])

  // Open: focus the first link, keep Tab inside, Esc closes, the page under
  // it does not scroll. Closing gives focus back to More.
  useEffect(() => {
    if (!open) return
    const sheet = sheetRef.current
    const focusables = () => Array.from(sheet?.querySelectorAll<HTMLElement>('a[href], button') || [])
    focusables()[1]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); moreRef.current?.focus(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  const close = () => { setOpen(false); moreRef.current?.focus() }
  const others = [
    { title: ko ? '매일' : 'Daily', ids: NAV_DAILY.filter(id => !PHONE_TABS.includes(id)) },
    { title: ko ? '계획' : 'Planning', ids: NAV_PLANNING },
    { title: ko ? '그 밖의 페이지' : 'Other pages', ids: moreIds },
  ]
  const moreActive = !PHONE_TABS.includes(active)
  const tab = (on: boolean) => `relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[length:calc(11.5px*var(--ts))] leading-tight ${on ? 'text-accent font-semibold' : 'text-ink-2 font-medium hover:text-ink'}`
  const unmarkedText = signals.unmarked.length ? (ko ? `${gradesPhrase(signals.unmarked, true)} 출석 미완료` : `${gradesPhrase(signals.unmarked, false)} not marked yet`) : ''
  const badge = signals.cases || signals.flagged

  return (
    <>
      <nav data-tabbar aria-label={ko ? '주 메뉴' : 'Main'} className="phone-tabbar sm:hidden no-print">
        {PHONE_TABS.map(id => {
          const Icon = ICONS[id]
          const on = active === id
          return (
            <Link key={id} href={VIEW_PATHS[id]} aria-current={on ? 'page' : undefined} className={tab(on)}>
              <span className="relative">
                <Icon size={21} strokeWidth={on ? 2.1 : 1.7} aria-hidden="true" />
                {id === 'attendance' && signals.unmarked.length > 0 && <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-warn ring-2 ring-[rgb(var(--white))]" />}
                {id === 'dashboard' && badge > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-ink text-paper text-[length:calc(11.5px*var(--ts))] font-semibold tabular-nums flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
              </span>
              <span className="truncate max-w-full px-0.5">{navLabel(id, language)}</span>
              {id === 'attendance' && unmarkedText && <span className="sr-only">{unmarkedText}</span>}
              {id === 'dashboard' && badge > 0 && <span className="sr-only">{badge} {ko ? '건 확인 필요' : 'need a look'}</span>}
            </Link>
          )
        })}
        <button ref={moreRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="dialog" className={tab(moreActive)}>
          <MoreHorizontal size={21} strokeWidth={moreActive ? 2.1 : 1.7} aria-hidden="true" />
          <span>{ko ? '더보기' : 'More'}</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[60] sm:hidden no-print overlay-sheet" onClick={close}>
          <div className="phone-sheet-backdrop absolute inset-0 bg-black/40" />
          <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={ko ? '더보기' : 'More'} onClick={e => e.stopPropagation()}
            className="phone-sheet absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto bg-surface border-t border-rule-2 rounded-t-lg">
            <div className="sticky top-0 bg-surface flex items-center justify-between pl-4 pr-1 h-12 border-b border-rule">
              <h2 className="font-display text-[length:calc(19px*var(--ts))] leading-none text-ink">{ko ? '더보기' : 'More'}</h2>
              <button type="button" onClick={close} aria-label={ko ? '닫기' : 'Close'} className="w-11 h-11 rounded flex items-center justify-center text-ink-2 hover:text-ink"><X size={18} /></button>
            </div>
            {others.filter(g => g.ids.length).map(g => (
              <section key={g.title} className="pt-3">
                <h3 className="px-4 pb-1 text-[length:calc(12px*var(--ts))] font-semibold text-ink-2">{g.title}</h3>
                <ul>
                  {g.ids.map(id => (
                    <li key={id}>
                      <Link href={VIEW_PATHS[id]} aria-current={active === id ? 'page' : undefined}
                        className={`flex items-center gap-2 px-4 h-11 text-[length:calc(15px*var(--ts))] ${active === id ? 'text-accent font-semibold' : 'text-ink hover:bg-paper-2'}`}>
                        {navLabel(id, language)}<NavMarks id={id} signals={signals} ko={ko} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="mt-2 border-t border-rule px-4 py-3 flex flex-wrap gap-2" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              {active !== 'guide' && (
                <Link href={guideHrefFor(active)} aria-label={ko ? '이 페이지 도움말' : 'Help with this page'}
                  className="h-10 px-3 inline-flex items-center gap-2 rounded border border-rule-2 text-[length:calc(14px*var(--ts))] text-ink-2 hover:text-ink">
                  <CircleHelp size={15} aria-hidden="true" />{ko ? '도움말' : 'Help'}
                </Link>
              )}
              <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event('daewoo:compose-notice')) }}
                className="h-10 px-3 inline-flex items-center gap-2 rounded border border-rule-2 text-[length:calc(14px*var(--ts))] text-ink-2 hover:text-ink">
                <Megaphone size={15} />{ko ? '공지 남기기' : 'Post a notice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
