'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { getKSTDateString } from '@/lib/utils'
import type { Teacher } from '@/types'
import AdminMonth from './AdminMonth'
import TeacherMonth from './TeacherMonth'
import { useOvertimeMonth, useOvertimeSettings } from './useOvertime'
import { Loader2 } from 'lucide-react'

// ─── Overtime ────────────────────────────────────────────────────
// A teacher logs their own non-instructional overtime and prints the
// school's sheet for the weeks they tick. Admin sees every teacher's
// month, prints one sheet or all of them, exports, and can open any
// teacher's page to fix an entry. Only role admin sees everyone.

export default function OvertimeView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const { teachers, loading: teachersLoading } = useTeachers()
  const { settings, loaded } = useOvertimeSettings()
  const [month, setMonth] = useState(getKSTDateString().slice(0, 7))
  const [ticks, setTicks] = useState<Set<string> | null>(null)
  const [open, setOpen] = useState<{ teacher: Teacher; ticks: string[] } | null>(null)
  // One cheap read tells whether the table exists yet.
  const probe = useOvertimeMonth(currentTeacher?.id || null, getKSTDateString().slice(0, 7))
  const staff = useMemo(() => teachers.filter(t => t.role !== 'admin'), [teachers])

  if (!currentTeacher) return null
  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1100px]">
      {probe.missing ? (
        <div>
          <h1 className="font-display text-[34px] leading-none text-ink mb-4">{ko ? '초과근무' : 'Overtime'}</h1>
          <p className="text-[13px] text-ink-2">{isAdmin
            ? (ko ? 'supabase/migration-overtime.sql을 Supabase SQL Editor에서 한 번 실행하세요.' : 'Run supabase/migration-overtime.sql once in the Supabase SQL Editor.')
            : (ko ? '아직 준비되지 않았습니다.' : 'Not set up yet.')}</p>
        </div>
      ) : !loaded || probe.loading || (isAdmin && teachersLoading) ? (
        <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
      ) : isAdmin ? (
        open
          ? <TeacherMonth key={open.teacher.id} teacher={open.teacher} settings={settings} asAdmin initialMonth={month} initialTicks={open.ticks} onBack={() => setOpen(null)} />
          : <AdminMonth staff={staff} settings={settings} month={month} setMonth={setMonth} ticks={ticks} setTicks={setTicks} onOpen={(t, tk) => setOpen({ teacher: t, ticks: tk })} />
      ) : (
        <TeacherMonth teacher={currentTeacher} settings={settings} />
      )}
    </div>
  )
}
