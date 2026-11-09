'use client'

import Link from 'next/link'
import { useApp } from '@/lib/context'
import { getKSTDateString } from '@/lib/utils'
import { counted, fmtMinutes, fmtWon, totals } from '@/lib/overtime'
import { useOvertimeMonth, useOvertimeSettings } from '@/components/overtime/useOvertime'
import { Plus } from 'lucide-react'

// ─── Overtime on the dashboard ───────────────────────────────────
// One line under Supplies: this month's overtime so far and a way to add
// some. Admin sees the whole staff's month. Hidden until the table exists.

export default function OvertimeLine() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const m = useOvertimeMonth(isAdmin ? null : currentTeacher?.id || null, getKSTDateString().slice(0, 7))
  const { settings, loaded } = useOvertimeSettings()
  if (!currentTeacher || m.loading || m.missing || m.error || !loaded) return null
  const t = totals(counted(m.entries, m.daysOff), settings.rate)
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-rule-2 pb-1.5 mb-2">
        <h3 className="font-display text-[18px] leading-none text-ink">{ko ? '초과근무' : 'Overtime'}</h3>
        <Link href="/overtime" className="eyebrow hover:text-ink">{ko ? '열기' : 'Open'}</Link>
      </div>
      <p className="text-[12.5px] text-ink-2 flex items-center gap-2 flex-wrap">
        <span className="tabular-nums">
          {t.count
            ? <>{isAdmin ? (ko ? '전체 교사 이번 달 ' : 'All teachers this month · ') : (ko ? '이번 달 ' : 'This month · ')}<span className="font-semibold text-ink">{fmtMinutes(t.minutes, ko)}</span> · {fmtWon(t.won, ko)}</>
            : <span className="text-ink-3">{isAdmin ? (ko ? '이번 달 기록 없음' : 'Nothing logged this month') : (ko ? '이번 달 기록 없음' : 'Nothing logged this month')}</span>}
        </span>
        {!isAdmin && <Link href="/overtime#add" className="ml-auto h-7 px-2.5 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Plus size={11} />{ko ? '추가' : 'Add'}</Link>}
      </p>
    </div>
  )
}
