'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { BookOpen, CalendarRange, ClipboardCheck, Map, Rows3 } from 'lucide-react'
import BookshelfView from './BookshelfView'
import MapView from './PlacementsView'
import BoardView from './BoardView'
import LadderView from './LadderView'
import ReviewView from './ReviewView'

// ─── Curriculum ──────────────────────────────────────────────────
// Two tabs. Class boards, for everyone: any class and grade's term week by
// week, and the ladder of one level across the grades. Curriculum map, for
// admin: the grid of which book each class and grade uses for which term,
// with the pacing of each, the review queue of teachers' plans that differ
// from the master, and the Bookshelf behind it. See
// docs/curriculum-planner-plan.md.

type Tab = 'boards' | 'map'
type Sub = 'board' | 'ladder' | 'map' | 'review' | 'bookshelf'
const SUBS: Record<Tab, Sub[]> = { boards: ['board', 'ladder'], map: ['map', 'review', 'bookshelf'] }

export default function CurriculumView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const [tab, setTab] = useState<Tab>('boards')
  const [sub, setSub] = useState<Sub>('board')
  useEffect(() => {
    const fromHash = () => {
      const [t, s] = (window.location.hash || '').slice(1).split('/')
      if (t === 'boards' || t === 'map') { setTab(t); setSub(s && (SUBS[t] as string[]).includes(s) ? s as Sub : SUBS[t][0]) }
      else if (t === 'bookshelf') { setTab('map'); setSub('bookshelf') }
    }
    fromHash(); window.addEventListener('hashchange', fromHash); return () => window.removeEventListener('hashchange', fromHash)
  }, [])
  const go = (t: Tab, s?: Sub) => { const next = s || SUBS[t][0]; setTab(t); setSub(next); history.replaceState(null, '', `#${t}/${next}`) }
  const showTab: Tab = tab === 'map' && !canManage ? 'boards' : tab

  const tabs: { id: Tab; label: string; hint: string; icon: React.ReactNode; hidden?: boolean }[] = [
    { id: 'boards', label: ko ? '학급 보드' : 'Class boards', hint: ko ? '모든 교사' : 'everyone', icon: <CalendarRange size={13} /> },
    { id: 'map', label: ko ? '교육과정 지도' : 'Curriculum map', hint: ko ? '관리자' : 'admin', icon: <Map size={13} />, hidden: !canManage },
  ]
  const subs: Record<Sub, { label: string; icon: React.ReactNode }> = {
    board: { label: ko ? '학기 보드' : 'Board', icon: <CalendarRange size={12} /> },
    ladder: { label: ko ? '학년 사다리' : 'Ladder', icon: <Rows3 size={12} /> },
    map: { label: ko ? '배치와 진도' : 'Map', icon: <Map size={12} /> },
    review: { label: ko ? '교사 계획 확인' : 'Review', icon: <ClipboardCheck size={12} /> },
    bookshelf: { label: ko ? '책꽂이' : 'Bookshelf', icon: <BookOpen size={12} /> },
  }

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '가르칠 것, 언제' : 'What to teach, and when'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '교육과정' : 'Curriculum'}</h1>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-wrap mb-6">
        <div className="flex gap-1.5">
          {tabs.filter(t => !t.hidden).map(t => (
            <button key={t.id} onClick={() => go(t.id)} className={`h-9 px-3.5 rounded text-[13px] inline-flex items-center gap-2 border ${showTab === t.id ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>
              {t.icon}{t.label}<span className={`text-[10.5px] ${showTab === t.id ? 'text-paper/70' : 'text-ink-3'}`}>{t.hint}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 border-l border-rule pl-4">
          {SUBS[showTab].map(s => (
            <button key={s} onClick={() => go(showTab, s)} className={`h-8 px-3 rounded text-[12.5px] inline-flex items-center gap-1.5 ${sub === s ? 'bg-paper-2 text-ink font-medium' : 'text-ink-2 hover:text-ink'}`}>{subs[s].icon}{subs[s].label}</button>
          ))}
        </div>
      </div>
      {showTab === 'boards' && sub === 'board' && <BoardView />}
      {showTab === 'boards' && sub === 'ladder' && <LadderView />}
      {showTab === 'map' && sub === 'map' && <MapView />}
      {showTab === 'map' && sub === 'review' && <ReviewView />}
      {showTab === 'map' && sub === 'bookshelf' && <BookshelfView />}
    </div>
  )
}
