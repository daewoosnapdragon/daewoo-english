'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { NAV_ORDER, VIEW_PATHS, PAGE_TITLES } from '@/lib/routes'
import { getDisplayName } from '@/lib/utils'
import { Search, User, ArrowRight, Moon, Sun, Globe, Megaphone, Plus, ClipboardCheck, CalendarDays, FileText } from 'lucide-react'

// ─── Command palette ─────────────────────────────────────────────
// ⌘K from anywhere. Type a student's name to jump to them (⌘↩ opens their
// behavior log), a page name to go there, or an action: mark attendance,
// new assessment, post a notice, dark mode, 한국어.

export const OPEN_PALETTE_EVENT = 'daewoo:open-palette'
export const COMPOSE_NOTICE_EVENT = 'daewoo:compose-notice'

interface Lite { id: string; english_name: string; korean_name: string; english_class: string; grade: number }
interface Item { key: string; kind: 'student' | 'page' | 'action'; label: string; hint?: string; icon: any; run: (alt: boolean) => void; dot?: string }

const CLASS_DOT: Record<string, string> = {
  Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy',
  Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon',
}

export default function CommandPalette() {
  const { currentTeacher, language, setLanguage, theme, setTheme } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const [students, setStudents] = useState<Lite[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const lang = language

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener(OPEN_PALETTE_EVENT, onOpen) }
  }, [open])

  useEffect(() => {
    if (!open) { setQ(''); setHi(0); return }
    setTimeout(() => inputRef.current?.focus(), 0)
    if (students.length === 0 && currentTeacher) {
      supabase.from('students').select('id, english_name, korean_name, english_class, grade').eq('is_active', true)
        .then(({ data }) => { if (data) setStudents(data as Lite[]) })
    }
  }, [open, currentTeacher, students.length])

  const go = (path: string) => { setOpen(false); router.push(path) }

  const items = useMemo<Item[]>(() => {
    const s = q.trim().toLowerCase()
    const words = s.split(/\s+/).filter(Boolean)
    const matches = (hay: string) => words.every(w => hay.toLowerCase().includes(w))
    const own = currentTeacher?.english_class
    const out: Item[] = []

    const actions: Item[] = [
      { key: 'a-att', kind: 'action', label: lang === 'ko' ? '출석 체크' : 'Mark attendance', hint: lang === 'ko' ? '출석부 열기' : 'open Attendance', icon: ClipboardCheck, run: () => go('/attendance') },
      { key: 'a-new', kind: 'action', label: lang === 'ko' ? '새 평가' : 'New assessment', hint: lang === 'ko' ? '이름, 정답 키 또는 루브릭' : 'name it, then a key or a rubric', icon: Plus, run: () => go('/grades?new=1') },
      { key: 'a-grades', kind: 'action', label: lang === 'ko' ? '성적 입력' : 'Enter grades', hint: lang === 'ko' ? '성적 화면' : 'open Grades', icon: FileText, run: () => go('/grades') },
      { key: 'a-notice', kind: 'action', label: lang === 'ko' ? '공지 작성' : 'Post a notice', hint: lang === 'ko' ? '다른 교사에게' : 'for other teachers', icon: Megaphone, run: () => { setOpen(false); if (pathname !== '/dashboard') router.push('/dashboard'); setTimeout(() => window.dispatchEvent(new Event(COMPOSE_NOTICE_EVENT)), pathname === '/dashboard' ? 0 : 600) } },
      { key: 'a-lessons', kind: 'action', label: lang === 'ko' ? '이번 주 수업 계획' : 'This week’s lesson plans', icon: CalendarDays, run: () => go('/lesson-plans') },
      { key: 'a-theme', kind: 'action', label: theme === 'dark' ? (lang === 'ko' ? '라이트 모드' : 'Light mode') : (lang === 'ko' ? '다크 모드' : 'Dark mode'), icon: theme === 'dark' ? Sun : Moon, run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); setOpen(false) } },
      { key: 'a-lang', kind: 'action', label: lang === 'ko' ? 'English' : '한국어', hint: lang === 'ko' ? '언어 전환' : 'switch language', icon: Globe, run: () => { setLanguage(lang === 'ko' ? 'en' : 'ko'); setOpen(false) } },
    ]
    const pages: Item[] = NAV_ORDER.concat('settings').map(id => ({ key: `p-${id}`, kind: 'page', label: PAGE_TITLES[id] || id, hint: lang === 'ko' ? '이동' : 'go to', icon: ArrowRight, run: () => go(VIEW_PATHS[id]) }))

    if (words.length === 0) {
      out.push(...actions.slice(0, 4), ...pages.slice(0, 5))
      return out
    }
    const studentHits = students
      .filter(st => matches(`${st.english_name} ${st.korean_name} ${getDisplayName(st)}`))
      .sort((a, b) => Number(b.english_class === own) - Number(a.english_class === own) || a.english_name.localeCompare(b.english_name))
      .slice(0, 8)
      .map<Item>(st => ({
        key: `s-${st.id}`, kind: 'student', label: getDisplayName(st), dot: CLASS_DOT[st.english_class],
        hint: `${st.korean_name} · G${st.grade} · ${st.english_class}`, icon: User,
        run: alt => go(alt ? `/students/${st.id}#sec-behavior` : `/students/${st.id}`),
      }))
    out.push(...actions.filter(a => matches(`${a.label} ${a.hint || ''}`)), ...studentHits, ...pages.filter(p => matches(p.label)))
    return out
  }, [q, students, currentTeacher, lang, theme, pathname])

  useEffect(() => { setHi(0) }, [q])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/30 flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <div className="w-full max-w-[600px] bg-surface border border-rule-2 rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-rule">
          <Search size={15} className="text-ink-3" />
          <input ref={inputRef} id="palette-input" value={q} onChange={e => setQ(e.target.value)}
            placeholder={lang === 'ko' ? '학생 이름, 페이지, 또는 동작…' : 'A student, a page, or an action…'}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
              if (e.key === 'Enter' && items[hi]) items[hi].run(e.metaKey || e.ctrlKey)
            }}
            className="flex-1 h-full bg-transparent text-[15px] text-ink placeholder:text-ink-3 outline-none" />
          <span className="text-[11px] text-ink-3">esc</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {items.length === 0 && <p className="px-4 py-6 text-[13px] text-ink-3">{lang === 'ko' ? '일치하는 항목이 없습니다.' : 'Nothing matches.'}</p>}
          {items.map((it, i) => {
            const Icon = it.icon
            return (
              <button key={it.key} onMouseEnter={() => setHi(i)} onClick={e => it.run(e.metaKey || e.ctrlKey)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left ${hi === i ? 'bg-paper-2' : ''}`}>
                {it.dot ? <span className={`w-2.5 h-2.5 rounded-full ${it.dot}`} /> : <Icon size={14} className="text-ink-3" />}
                <span className="text-[14px] text-ink">{it.label}</span>
                {it.hint && <span className="text-[12px] text-ink-3 truncate">{it.hint}</span>}
                <span className="ml-auto text-[11px] text-ink-3 whitespace-nowrap">{it.kind === 'student' ? (hi === i ? (lang === 'ko' ? '↩ 열기 · ⌘↩ 행동 기록' : '↩ open · ⌘↩ behavior log') : '') : it.kind === 'page' ? (lang === 'ko' ? '페이지' : 'page') : ''}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
