'use client'

import Link from 'next/link'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { useSupplies } from '@/components/supplies/useSupplies'
import { AlertTriangle, ClipboardCheck } from 'lucide-react'

// ─── Supplies on the dashboard ───────────────────────────────────
// Under the office jobs: what is low, what is waiting to be ordered, and
// whose quick count it is this week. The person who has it sees a button
// on the cleaning day; admin sees when the full count is due.

const fmtDay = (iso: string, lang: string) => new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function SuppliesCard() {
  const { currentTeacher, language: lang } = useApp()
  const ko = lang === 'ko'
  const { teachers } = useTeachers()
  const s = useSupplies()
  const me = currentTeacher?.id
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher || currentTeacher?.english_class === 'Snapdragon'
  if (s.loading || s.missing) return null
  const nameOf = (id: string | null) => teachers.find(t => t.id === id)?.name || '—'
  const w = s.week
  const mine = !!w && w.personId === me && !w.done
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-rule-2 pb-1.5 mb-2">
        <h3 className="font-display text-[18px] leading-none text-ink">{ko ? '비품' : 'Supplies'}</h3>
        <Link href="/supplies" className="eyebrow hover:text-ink">{ko ? '열기' : 'Open'}</Link>
      </div>
      <ul className="text-[12.5px] space-y-1">
        <li>
          {s.low.length
            ? <Link href="/supplies#stock" className="text-warn hover:underline inline-flex items-start gap-1.5"><AlertTriangle size={12} className="mt-[3px] shrink-0" /><span><span className="font-semibold">{s.low.length} {ko ? '개 부족' : 'low'}</span> · {s.low.slice(0, 4).map(i => i.name).join(', ')}{s.low.length > 4 ? ` +${s.low.length - 4}` : ''}</span></Link>
            : <span className="text-ink-3">{ko ? '부족한 비품 없음' : 'Nothing is low'}</span>}
        </li>
        <li>
          {s.needed.length
            ? <Link href="/supplies#requests" className="text-ink-2 hover:text-ink">{s.needed.length} {ko ? '건 요청 대기' : s.needed.length === 1 ? 'request waiting' : 'requests waiting'}{s.ordered.length ? ` · ${s.ordered.length} ${ko ? '건 주문됨' : 'ordered'}` : ''}</Link>
            : <span className="text-ink-3">{ko ? '대기 중인 요청 없음' : 'No requests waiting'}{s.ordered.length ? ` · ${s.ordered.length} ${ko ? '건 주문됨' : 'ordered'}` : ''}</span>}
        </li>
        {w && (
          <li className={w.done ? 'text-ink-3' : 'text-ink-2'}>
            {ko ? '간단 조사' : 'Quick count'} · {w.isToday ? (ko ? '오늘' : 'today') : fmtDay(w.date, lang)} · {w.personId === me ? (ko ? '나' : 'you') : nameOf(w.personId)}{w.done ? ' ✓' : ''}
          </li>
        )}
        {canManage && s.full.due && <li className="text-warn">{ko ? '전체 조사 할 때' : 'Full count due'}{s.full.daysAgo != null ? ` · ${ko ? `${s.full.daysAgo}일 전` : `last ${s.full.daysAgo} days ago`}` : ''}</li>}
      </ul>
      {mine && (
        <Link href="/supplies#count" className="mt-2 h-8 px-3 inline-flex items-center gap-1.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover">
          <ClipboardCheck size={13} />{w!.isToday ? (ko ? '오늘 간단 조사 하기' : 'Do the quick count today') : (ko ? '간단 조사 하기' : 'Do the quick count')}
        </Link>
      )}
    </div>
  )
}
