'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { useViewLog } from '@/lib/useViewLog'
import { BookOpen, CalendarRange, Map, TrainFront } from 'lucide-react'
import BookshelfView from './BookshelfView'
import MapView from './PlacementsView'
import ClassPlanView from './ClassPlanView'
import ProgramMapView from './ProgramMapView'

// ─── Curriculum ──────────────────────────────────────────────────
// Class plans: one class and grade's books as a timeline, units at their
// suggested lengths (admin edits the lists under it). All classes this
// week: every class's units this week and what they share. Books by class:
// the grid of every class plan, for admin. Bookshelf: the books, their
// units, lessons, objectives and files. See docs/lesson-planning-review.md.

type Tab = 'plans' | 'week' | 'books' | 'bookshelf'
const TABS: Tab[] = ['plans', 'week', 'books', 'bookshelf']

/** Old addresses (#boards/board, #map/bookshelf, …) still land somewhere sensible. */
function tabFromHash(hash: string): Tab {
  const [path] = hash.replace(/^#/, '').split('?')
  const [t, s] = path.split('/')
  if ((TABS as string[]).includes(t)) return t as Tab
  if (t === 'boards') return s === 'program' ? 'week' : 'plans'
  if (t === 'map') return s === 'bookshelf' ? 'bookshelf' : 'books'
  return 'plans'
}

export default function CurriculumView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const [tab, setTab] = useState<Tab>('plans')
  useEffect(() => {
    const fromHash = () => setTab(tabFromHash(window.location.hash || ''))
    fromHash(); window.addEventListener('hashchange', fromHash); return () => window.removeEventListener('hashchange', fromHash)
  }, [])
  const go = (t: Tab) => { setTab(t); history.replaceState(null, '', `#${t}`) }
  const shown: Tab = tab === 'books' && !canManage ? 'plans' : tab
  useViewLog(`Curriculum · ${{ plans: 'class plans', week: 'program week', books: 'books', bookshelf: 'bookshelf' }[shown]}`)

  const tabs: { id: Tab; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'plans', label: ko ? '학급 계획' : 'Class plans', icon: <CalendarRange size={13} /> },
    { id: 'week', label: ko ? '이번 주 전체 반' : 'All classes this week', icon: <TrainFront size={13} /> },
    { id: 'books', label: ko ? '반별 교재' : 'Books by class', icon: <Map size={13} />, hidden: !canManage },
    { id: 'bookshelf', label: ko ? '책꽂이' : 'Bookshelf', icon: <BookOpen size={13} /> },
  ]

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '가르칠 것, 언제' : 'What to teach, and when'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '교육과정' : 'Curriculum'}</h1>
        </div>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-6">
        {tabs.filter(t => !t.hidden).map(t => (
          <button key={t.id} onClick={() => go(t.id)} className={`h-9 px-3.5 rounded text-[13px] inline-flex items-center gap-2 border ${shown === t.id ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {shown === 'plans' && <ClassPlanView />}
      {shown === 'week' && <ProgramMapView />}
      {shown === 'books' && <MapView />}
      {shown === 'bookshelf' && <BookshelfView />}
    </div>
  )
}
