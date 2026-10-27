'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { useOfficeJobs } from './useOfficeJobs'
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'

// ─── Office jobs on the dashboard ────────────────────────────────
// Beside the weekly schedule: this week's cleaning day, your job in large
// type, everyone else's underneath, and your job next week. The day is
// Friday, or the day before when Friday is a day off on the calendar. On
// the day itself the band under the masthead says your job on every page.

const fmtDay = (iso: string, lang: string) => new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function OfficeJobs() {
  const { currentTeacher, language: lang } = useApp()
  const ko = lang === 'ko'
  const { teachers } = useTeachers()
  const { loading, ready, todays, next, following } = useOfficeJobs()
  const [open, setOpen] = useState<string | null>(null)
  const isAdmin = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  if (loading) return null
  const head = (meta?: string) => (
    <div className="flex items-baseline justify-between border-b border-rule-2 pb-1.5 mb-2">
      <h3 className="font-display text-[18px] leading-none text-ink">{ko ? '사무실 청소' : 'Office jobs'}</h3>
      {meta && <span className="eyebrow">{meta}</span>}
    </div>
  )
  if (!ready) {
    if (!isAdmin) return null
    return <div>{head()}<p className="text-[12.5px] text-ink-3">{ko ? '순번이 아직 없습니다. ' : 'No rotation yet. '}<Link href="/settings#set-office" className="text-accent hover:underline">{ko ? '설정에서 만들기' : 'Set it up in Settings'}</Link></p></div>
  }
  const day = next
  if (!day) return <div>{head()}<p className="text-[12.5px] text-ink-3">{ko ? '예정된 청소일이 없습니다.' : 'No cleaning days ahead.'}</p></div>
  const nameOf = (id: string) => teachers.find(t => t.id === id)?.name || '—'
  const me = currentTeacher?.id
  const mine = day.assignments.find(a => a.personId === me)
  const mineNext = following?.assignments.find(a => a.personId === me)
  return (
    <div>
      {head(todays ? (ko ? '오늘' : 'Today') : fmtDay(day.date, lang))}
      {day.moved && <p className="text-[11px] text-warn mb-1.5">{ko ? `금요일이 쉬는 날(${day.reason || '휴일'})이라 하루 앞당깁니다` : `Friday is ${day.reason || 'a day off'}, so the jobs are a day early`}</p>}
      {day.everyone ? (
        <p className="text-[12.5px] text-ink-2">{ko ? '모두 함께 청소하는 날입니다.' : 'Everyone cleans together.'}</p>
      ) : (
        <>
          {mine && (
            <div className="mb-2.5">
              <p className="eyebrow eyebrow-accent">{ko ? '내 담당' : 'Your job'}</p>
              <p className="font-display text-[24px] leading-tight text-ink">{mine.job.name}</p>
              {todays && mine.job.description && <p className="text-[11.5px] text-ink-2 mt-1 leading-snug">{mine.job.description}</p>}
            </div>
          )}
          <ul className="divide-y divide-rule">
            {day.assignments.map(a => {
              const isMe = a.personId === me, isOpen = open === a.job.key
              return (
                <li key={a.job.key} className="py-1">
                  <button onClick={() => setOpen(isOpen ? null : a.job.key)} className="w-full flex items-center justify-between gap-2 text-left text-[12.5px]" title={a.job.description ? (ko ? '설명 보기' : 'What the job is') : undefined}>
                    <span className={`inline-flex items-center gap-1.5 ${isMe ? 'font-semibold text-ink' : 'text-ink-2'}`}>{a.job.name}{a.job.description ? (isOpen ? <ChevronUp size={11} className="text-ink-3" /> : <ChevronDown size={11} className="text-ink-3" />) : null}</span>
                    <span className={`tabular-nums ${isMe ? 'font-semibold text-ink' : 'text-ink-3'}`}>{nameOf(a.personId)}</span>
                  </button>
                  {isOpen && a.job.description && <p className="text-[11px] text-ink-3 leading-snug pb-1 pr-6">{a.job.description}</p>}
                </li>
              )
            })}
          </ul>
        </>
      )}
      <div className="flex items-baseline justify-between gap-2 mt-2">
        {following
          ? <p className="text-[11px] text-ink-3">{ko ? '다음' : 'Next'}: {fmtDay(following.date, lang)}{following.everyone ? (ko ? ' · 모두 함께' : ' · everyone') : mineNext ? ` · ${ko ? '내 담당' : 'you'}: ${mineNext.job.name}` : ''}</p>
          : <span />}
        {isAdmin && <Link href="/settings#set-office" className="text-[11px] text-ink-3 hover:text-ink whitespace-nowrap">{ko ? '설정에서 수정' : 'Edit in Settings'}</Link>}
      </div>
    </div>
  )
}

/** The one-liner under the masthead on the cleaning day itself. */
export function OfficeJobsBand() {
  const { currentTeacher, language: lang } = useApp()
  const ko = lang === 'ko'
  const { ready, todays } = useOfficeJobs()
  if (!ready || !todays) return null
  const mine = todays.assignments.find(a => a.personId === currentTeacher?.id)
  const text = todays.everyone ? (ko ? '오늘은 모두 함께 사무실 청소' : 'Office cleaning today: everyone together') : mine ? (ko ? `오늘 사무실 청소 · 내 담당: ${mine.job.name}` : `Office jobs today · you're on ${mine.job.name}`) : null
  if (!text) return null
  return (
    <Link href="/dashboard" className="block bg-paper-2 border-t border-rule">
      <div className="mx-auto max-w-[1440px] px-6 h-8 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-ink-2"><ClipboardList size={13} />{text}</div>
    </Link>
  )
}
