'use client'

import Loading from '@/components/brand/Loading'
import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useViewLog } from '@/lib/useViewLog'
import { useTeachers } from '@/hooks/useData'
import { getKSTDateString } from '@/lib/utils'
import type { Teacher } from '@/types'
import AdminMonth from './AdminMonth'
import TeacherMonth from './TeacherMonth'
import { useOvertimeMonth, useOvertimeSettings } from './useOvertime'
import { Loader2 } from 'lucide-react'
import { needsUpdate } from '@/lib/dbUpdate'

// ─── Overtime ────────────────────────────────────────────────────
// A teacher logs their own non-instructional overtime and prints the
// school's sheet for the dates they choose. Admin sees every teacher's
// month, prints one sheet or all of them, exports, and can open any
// teacher's page to fix an entry. Only role admin sees everyone.

export default function OvertimeView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const { teachers, loading: teachersLoading } = useTeachers()
  const { settings, loaded } = useOvertimeSettings()
  const [month, setMonth] = useState(getKSTDateString().slice(0, 7))
  const [open, setOpen] = useState<Teacher | null>(null)
  useViewLog(`Overtime · ${month}${open ? ` · ${open.name}` : ''}`)
  // One cheap read tells whether the table exists yet.
  const probe = useOvertimeMonth(currentTeacher?.id || null, getKSTDateString().slice(0, 7))
  const staff = useMemo(() => teachers.filter(t => t.role !== 'admin'), [teachers])

  if (!currentTeacher) return null
  return (
    <div className="px-8 py-6 animate-fade-in max-w-[1100px]">
      {probe.missing ? (
        <div>
          <h1 className="font-display text-[length:calc(34px*var(--ts))] leading-none text-ink mb-4">{ko ? '초과근무' : 'Overtime'}</h1>
          <p className="text-[length:calc(13px*var(--ts))] text-ink-2">{isAdmin
            // supabase/migration-overtime.sql
            ? needsUpdate({ en: 'overtime', ko: '초과근무' }, ko)
            : (ko ? '아직 준비되지 않았습니다.' : 'Not set up yet.')}</p>
        </div>
      ) : !loaded || probe.loading || (isAdmin && teachersLoading) ? (
        <Loading rows={5} />
      ) : isAdmin ? (
        open
          ? <TeacherMonth key={open.id} teacher={open} settings={settings} asAdmin initialMonth={month} onBack={() => setOpen(null)} />
          : <AdminMonth staff={staff} settings={settings} month={month} setMonth={setMonth} onOpen={t => setOpen(t)} />
      ) : (
        <TeacherMonth teacher={currentTeacher} settings={settings} />
      )}
    </div>
  )
}
