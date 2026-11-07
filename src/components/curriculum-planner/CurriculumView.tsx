'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { BookOpen, CalendarRange, Layers, Rows3 } from 'lucide-react'
import BookshelfView from './BookshelfView'
import PlacementsView from './PlacementsView'
import BoardView from './BoardView'
import LadderView from './LadderView'

// ─── Curriculum ──────────────────────────────────────────────────
// One page, four tabs. Bookshelf: the catalogue of books, units and
// lessons. Placements (admin): which book each class and grade uses for
// which term, and how many weeks each unit gets, the master plan. Class
// board: a class and grade's term, week by week, lane per strand, the
// units as bars, today and the holidays marked, read-only for now. Ladder:
// one level across Grades 1 to 5, the books per grade and what the
// progression looks like. See docs/curriculum-planner-plan.md.

type Tab = 'bookshelf' | 'placements' | 'board' | 'ladder'
const TABS: Tab[] = ['bookshelf', 'placements', 'board', 'ladder']

export default function CurriculumView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const [tab, setTab] = useState<Tab>('board')
  useEffect(() => {
    const fromHash = () => { const h = (window.location.hash || '').slice(1).split('/')[0]; if ((TABS as string[]).includes(h)) setTab(h as Tab) }
    fromHash(); window.addEventListener('hashchange', fromHash); return () => window.removeEventListener('hashchange', fromHash)
  }, [])
  const go = (t: Tab) => { setTab(t); history.replaceState(null, '', `#${t}`) }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'board', label: ko ? '학급 보드' : 'Class board', icon: <CalendarRange size={13} /> },
    { id: 'ladder', label: ko ? '학년 사다리' : 'Ladder', icon: <Rows3 size={13} /> },
    { id: 'placements', label: ko ? '배치와 진도' : 'Placements', icon: <Layers size={13} />, hidden: !canManage },
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
          <button key={t.id} onClick={() => go(t.id)} className={`h-8 px-3 rounded text-[12.5px] inline-flex items-center gap-1.5 border ${tab === t.id ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === 'bookshelf' && <BookshelfView />}
      {tab === 'placements' && canManage && <PlacementsView />}
      {tab === 'board' && <BoardView />}
      {tab === 'ladder' && <LadderView />}
    </div>
  )
}
