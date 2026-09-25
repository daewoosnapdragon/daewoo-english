'use client'

import { useScheduleRules } from '@/lib/scheduleRules'
import { loadDayStatus, type DayStatus } from '@/lib/calendarDays'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useAvailableClasses } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, Loader2, Check, UserCheck, UserX, Clock, Download, AlertTriangle, Printer, CalendarDays, List } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import EmptyState from '@/components/shared/EmptyState'
import AnimatedNumber from '@/components/shared/AnimatedNumber'

type Status = 'present' | 'absent' | 'tardy'
type LangKey = 'en' | 'ko'

const STATUS_CONFIG: Record<Status, { label: string; labelKo: string; icon: typeof UserCheck; color: string; bg: string; short: string }> = {
  present: { label: 'Present', labelKo: '출석', icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100 border-green-300 text-green-700', short: 'P' },
  absent: { label: 'Absent', labelKo: '결석', icon: UserX, color: 'text-red-600', bg: 'bg-red-100 border-red-300 text-red-700', short: 'A' },
  tardy: { label: 'Tardy', labelKo: '지각', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 border-amber-300 text-amber-700', short: 'T' },
}

// Fetch every attendance row for the given students + date range, paging past
// PostgREST's default 1000-row cap. Without this, a whole-class month (or a
// multi-month print) can exceed 1000 rows and silently drop records, making
// dates that DO have attendance render as unmarked/partial in the month view.
async function fetchAllAttendance(
  ids: string[], startKey: string, endKey: string, columns = '*'
): Promise<any[]> {
  if (ids.length === 0) return []
  const PAGE = 1000
  const all: any[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('attendance').select(columns)
      .in('student_id', ids).gte('date', startKey).lte('date', endKey)
      .order('date', { ascending: true }).order('student_id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error || !data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

export default function AttendanceView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const { isNoClassDay: ruleNoClass } = useScheduleRules()
  const [selectedDate, setSelectedDate] = useState(getKSTDateString())
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [records, setRecords] = useState<Record<string, { status: Status; note: string; id?: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [focusedRow, setFocusedRow] = useState<number>(-1)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [printWeeks, setPrintWeeks] = useState<Set<string>>(new Set())
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [printNavMonth, setPrintNavMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date(getKSTDateString() + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const printDropdownRef = useRef<HTMLDivElement>(null)

  // Month-at-a-glance view: highlights class days with missing attendance
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day')
  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date(getKSTDateString() + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  // Per-grade summary keyed by `${grade}::${date}`, so the month view can show every
  // grade of the class at once (teachers run multiple grades of the same class per day).
  const [monthGradeSummary, setMonthGradeSummary] = useState<Record<string, { count: number; present: number; absent: number; tardy: number }>>({})
  const [classGrades, setClassGrades] = useState<Grade[]>([])
  const [gradeTotals, setGradeTotals] = useState<Record<number, number>>({})
  const [monthLoading, setMonthLoading] = useState(false)
  const [dayStatus, setDayStatus] = useState<DayStatus>({ off: null, trip: null })
  useEffect(() => { loadDayStatus(selectedDate, selectedGrade).then(setDayStatus) }, [selectedDate, selectedGrade])

  const guardUnsaved = (action: () => void) => {
    if (hasChanges) { setPendingAction(() => action); setShowUnsavedModal(true) }
    else action()
  }

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // When the print dropdown opens, reset its month to the currently selected date's month
  useEffect(() => {
    if (showPrintOptions) {
      const d = new Date(selectedDate + 'T12:00:00')
      setPrintNavMonth({ year: d.getFullYear(), month: d.getMonth() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrintOptions])

  // Close print dropdown on outside click
  useEffect(() => {
    if (!showPrintOptions) return
    const handler = (e: MouseEvent) => {
      if (printDropdownRef.current && !printDropdownRef.current.contains(e.target as Node)) {
        setShowPrintOptions(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [showPrintOptions])

  const isTeacher = currentTeacher?.role === 'teacher'
  const { classes: allClasses } = useAvailableClasses()
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : allClasses
  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('attendance').select('*')
      .eq('date', selectedDate)
      .in('student_id', students.map((s: any) => s.id))
    const map: Record<string, { status: Status; note: string; id?: string }> = {}
    if (data) data.forEach((r: any) => { map[r.student_id] = { status: r.status, note: r.note || '', id: r.id } })
    // A field trip on the school calendar: everyone is away. Mark them absent
    // with the trip as the reason and save, so nobody has to.
    if (Object.keys(map).length === 0 && students.length > 0) {
      const st = await loadDayStatus(selectedDate, selectedGrade)
      if (st.trip && !st.off) {
        const rows = students.map((s: any) => ({ student_id: s.id, date: selectedDate, status: 'absent', note: st.trip, recorded_by: currentTeacher?.id || null }))
        const { error } = await supabase.from('attendance').upsert(rows, { onConflict: 'student_id,date' })
        if (!error) { rows.forEach(r => { map[r.student_id] = { status: 'absent', note: st.trip! } }); showToast(lang === 'ko' ? `현장학습: 전원 결석 처리됨 (${st.trip})` : `Field trip: everyone marked absent (${st.trip})`) }
      }
    }
    setRecords(map)
    setLoading(false)
    setHasChanges(false)
  }, [selectedDate, students, selectedGrade])

  useEffect(() => { if (students.length > 0) loadRecords() }, [loadRecords, students])

  const setStatus = (studentId: string, status: Status) => {
    setRecords((prev: any) => ({ ...prev, [studentId]: { ...prev[studentId], status, note: prev[studentId]?.note || '' } }))
    setHasChanges(true)
  }

  // Keyboard navigation: arrow keys + P/A/T
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (students.length === 0) return

      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedRow(r => Math.min(r + 1, students.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedRow(r => Math.max(r - 1, 0)) }
      else if (focusedRow >= 0 && focusedRow < students.length) {
        const sid = (students[focusedRow] as any).id
        if (e.key === 'p' || e.key === 'P') { setStatus(sid, 'present') }
        else if (e.key === 'a' || e.key === 'A') { setStatus(sid, 'absent') }
        else if (e.key === 't' || e.key === 'T') { setStatus(sid, 'tardy') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [students, focusedRow])

  const setNote = (studentId: string, note: string) => {
    setRecords((prev: any) => ({ ...prev, [studentId]: { ...prev[studentId], note, status: prev[studentId]?.status || 'present' } }))
    setHasChanges(true)
  }

  const markAllPresent = () => {
    const updated: typeof records = {}
    students.forEach((s: any) => { updated[s.id] = { status: 'present', note: records[s.id]?.note || '' } })
    setRecords(updated)
    setHasChanges(true)
  }

  // reason === '' keeps whatever note each student already has, so the plain
  // "Mark All Absent" button doesn't wipe individual notes. The Field Trip
  // checkbox passes a reason and stamps it on everyone.
  const markAllAbsent = (reason: string) => {
    const updated: typeof records = {}
    students.forEach((s: any) => { updated[s.id] = { status: 'absent', note: reason || records[s.id]?.note || '' } })
    setRecords(updated)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    // Get existing DB records for this date + these students
    const { data: existing } = await supabase.from('attendance').select('id, student_id')
      .eq('date', selectedDate).in('student_id', students.map((s: any) => s.id))

    // Upsert current records in batch
    const entries = Object.entries(records).map(([studentId, r]: [string, any]) => ({
      student_id: studentId, date: selectedDate, status: r.status, note: r.note,
      recorded_by: currentTeacher?.id || null,
    }))
    if (entries.length > 0) {
      const { error } = await supabase.from('attendance').upsert(entries, { onConflict: 'student_id,date' })
      if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
    }

    // Delete records that were cleared (exist in DB but not in current records)
    const currentStudentIds = new Set(Object.keys(records))
    const toDelete = (existing || []).filter(e => !currentStudentIds.has(e.student_id))
    if (toDelete.length > 0) {
      await supabase.from('attendance').delete().in('id', toDelete.map(d => d.id))
    }

    setSaving(false)
    setHasChanges(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 1500)
    showToast(lang === 'ko' ? '출석이 저장되었습니다' : entries.length > 0 ? `Saved attendance for ${entries.length} students` : 'Attendance cleared')
  }

  // Skip weekends (and Monday for Grade 5) in date navigation
  const isNonClassDay = (dateStr: string, grade: Grade) => {
    const dow = new Date(dateStr + 'T12:00:00').getDay()
    if (dow === 0 || dow === 6) return true // weekend
    if (dateStr === selectedDate && dayStatus.off) return true // a day off on the school calendar
    return ruleNoClass(grade, dow) // e.g. no Grade 5 on Mondays, set in Settings
  }
  const prevDay = () => guardUnsaved(() => {
    const d = new Date(selectedDate)
    do { d.setDate(d.getDate() - 1) } while (isNonClassDay(d.toISOString().split('T')[0], selectedGrade))
    setSelectedDate(d.toISOString().split('T')[0])
  })
  const nextDay = () => guardUnsaved(() => {
    const d = new Date(selectedDate)
    do { d.setDate(d.getDate() + 1) } while (isNonClassDay(d.toISOString().split('T')[0], selectedGrade))
    setSelectedDate(d.toISOString().split('T')[0])
  })
  const isToday = selectedDate === getKSTDateString()
  const isWeekend = [0, 6].includes(new Date(selectedDate + 'T00:00').getDay())
  const isNoClassDay = isNonClassDay(selectedDate, selectedGrade)

  // Stats
  const presentCount = Object.values(records).filter((r: any) => r.status === 'present').length
  const absentCount = Object.values(records).filter((r: any) => r.status === 'absent').length
  const tardyCount = Object.values(records).filter((r: any) => r.status === 'tardy').length
  const unmarkedCount = students.length - Object.keys(records).length

  // Weeks shown in the print-options dropdown (for printNavMonth)
  const monthWeeks = useMemo(() => {
    const { year, month } = printNavMonth
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const seen = new Set<string>()
    const result: { mondayKey: string; label: string }[] = []
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue
      if (dow === 1 && selectedGrade === 5) continue
      const diff = dow === 0 ? -6 : 1 - dow
      const mon = new Date(d); mon.setDate(d.getDate() + diff)
      const mondayKey = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
      if (seen.has(mondayKey)) continue
      seen.add(mondayKey)
      const fri = new Date(mon); fri.setDate(mon.getDate() + 4)
      result.push({
        mondayKey,
        label: `${mon.getMonth() + 1}/${mon.getDate()} – ${fri.getMonth() + 1}/${fri.getDate()}`,
      })
    }
    return result
  }, [printNavMonth, selectedGrade])

  const navMonthLabel = useMemo(() => {
    return new Date(printNavMonth.year, printNavMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [printNavMonth])

  const stepPrintMonth = (delta: number) => {
    setPrintNavMonth(prev => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // ─── Month-at-a-glance ──────────────────────────────────────────────
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const toKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const todayKey = getKSTDateString()

  // For the visible month, count how many students have a record on each (grade, date),
  // across every grade of the selected class.
  const loadMonthSummary = useCallback(async () => {
    setMonthLoading(true)
    const { year, month } = calMonth
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startKey = `${year}-${pad2(month + 1)}-01`
    const endKey = `${year}-${pad2(month + 1)}-${pad2(daysInMonth)}`
    // Whole class roster across all grades
    const { data: roster } = await supabase.from('students').select('id, grade')
      .eq('is_active', true).eq('english_class', selectedClass)
    const studentGrade: Record<string, number> = {}
    const totals: Record<number, number> = {}
    const gradeSet = new Set<number>()
    ;(roster || []).forEach((s: any) => {
      studentGrade[s.id] = s.grade
      totals[s.grade] = (totals[s.grade] || 0) + 1
      gradeSet.add(s.grade)
    })
    const ids = (roster || []).map((s: any) => s.id)
    const sum: Record<string, { count: number; present: number; absent: number; tardy: number }> = {}
    if (ids.length > 0) {
      const data = await fetchAllAttendance(ids, startKey, endKey, 'date, status, student_id')
      data.forEach((r: any) => {
        const g = studentGrade[r.student_id]
        if (g == null) return
        const k = `${g}::${r.date}`
        if (!sum[k]) sum[k] = { count: 0, present: 0, absent: 0, tardy: 0 }
        sum[k].count++
        if (r.status === 'present') sum[k].present++
        else if (r.status === 'absent') sum[k].absent++
        else if (r.status === 'tardy') sum[k].tardy++
      })
    }
    setMonthGradeSummary(sum)
    setGradeTotals(totals)
    setClassGrades(Array.from(gradeSet).sort((a, b) => a - b) as Grade[])
    setMonthLoading(false)
  }, [selectedClass, calMonth])

  // Reload whenever we enter month view or the class/grade/month changes
  useEffect(() => { if (viewMode === 'month') loadMonthSummary() }, [viewMode, loadMonthSummary])

  // Weeks of the visible month as Mon–Fri rows (null = padding before/after the month)
  const calWeeks = useMemo(() => {
    const { year, month } = calMonth
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeks: Array<Array<Date | null>> = []
    let week: Array<Date | null> = [null, null, null, null, null]
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) continue // skip weekends
      week[dow - 1] = d // Mon=0 … Fri=4
      if (dow === 5) { weeks.push(week); week = [null, null, null, null, null] }
    }
    if (week.some(c => c)) weeks.push(week)
    return weeks
  }, [calMonth])

  const calMonthLabel = useMemo(() =>
    new Date(calMonth.year, calMonth.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  [calMonth])

  const stepCalMonth = (delta: number) => {
    setCalMonth(prev => {
      const d = new Date(prev.year, prev.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  // Count of past/today (grade, class-day) sessions in the visible month with no attendance
  const unmarkedSessions = useMemo(() => {
    let n = 0
    calWeeks.forEach(week => week.forEach(d => {
      if (!d) return
      const key = toKey(d)
      if (key > todayKey) return
      classGrades.forEach(g => {
        if (isNonClassDay(key, g)) return
        if (!monthGradeSummary[`${g}::${key}`]?.count) n++
      })
    }))
    return n
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calWeeks, monthGradeSummary, classGrades, todayKey])

  // Build the list of dates to print: either a specific set of weeks, or the month of selectedDate.
  type PrintDate = { date: string; day: number; dayName: string; monthShort: string; year: number; month: number }
  const buildPrintDates = (selectedMondayKeys?: Set<string>): PrintDate[] => {
    const toEntry = (d: Date): PrintDate => {
      const y = d.getFullYear(), m = d.getMonth(), dn = d.getDate()
      return {
        date: `${y}-${String(m + 1).padStart(2, '0')}-${String(dn).padStart(2, '0')}`,
        day: dn,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        year: y, month: m,
      }
    }
    const isClassDay = (d: Date) => {
      const dow = d.getDay()
      if (dow === 0 || dow === 6) return false
      if (dow === 1 && selectedGrade === 5) return false
      return true
    }
    if (selectedMondayKeys && selectedMondayKeys.size > 0) {
      const out: PrintDate[] = []
      const sortedMondays = Array.from(selectedMondayKeys).sort()
      for (const mondayKey of sortedMondays) {
        const [my, mm, md] = mondayKey.split('-').map(Number)
        const mon = new Date(my, mm - 1, md)
        for (let i = 0; i < 5; i++) {
          const d = new Date(mon); d.setDate(mon.getDate() + i)
          if (isClassDay(d)) out.push(toEntry(d))
        }
      }
      return out
    }
    // Default: whole month of selectedDate
    const curDate = new Date(selectedDate + 'T12:00:00')
    const year = curDate.getFullYear(), month = curDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out: PrintDate[] = []
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      if (isClassDay(d)) out.push(toEntry(d))
    }
    return out
  }

  const handlePrintAttendance = async (selectedMondayKeys?: Set<string>) => {
    const dates = buildPrintDates(selectedMondayKeys)
    if (dates.length === 0) {
      showToast(lang === 'ko' ? '인쇄할 날짜가 없습니다' : 'No dates to print')
      return
    }
    const startDate = dates[0].date
    const endDate = dates[dates.length - 1].date

    // Title — either single month, "Selected Weeks", or a date range across months
    let title: string
    let subtitle: string
    if (!selectedMondayKeys || selectedMondayKeys.size === 0) {
      title = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      subtitle = `${students.length} students`
    } else {
      const startD = new Date(startDate + 'T12:00:00')
      const endD = new Date(endDate + 'T12:00:00')
      const sameMonth = startD.getMonth() === endD.getMonth() && startD.getFullYear() === endD.getFullYear()
      if (sameMonth) {
        title = startD.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        subtitle = `${selectedMondayKeys.size} week${selectedMondayKeys.size > 1 ? 's' : ''} selected · ${students.length} students`
      } else {
        title = `${startD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        subtitle = `${selectedMondayKeys.size} weeks selected · ${students.length} students`
      }
    }

    const monthData = await fetchAllAttendance(students.map((s: any) => s.id), startDate, endDate)
    const lookup: Record<string, Record<string, string>> = {}
    monthData.forEach((r: any) => { if (!lookup[r.student_id]) lookup[r.student_id] = {}; lookup[r.student_id][r.date] = r.status })

    // Group columns by month so we can render a month-spanning header row when the print covers multiple months
    const monthGroups: { label: string; span: number }[] = []
    let lastKey = ''
    for (const d of dates) {
      const key = `${d.year}-${d.month}`
      if (key !== lastKey) {
        monthGroups.push({ label: new Date(d.year, d.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), span: 1 })
        lastKey = key
      } else {
        monthGroups[monthGroups.length - 1].span++
      }
    }
    const showMonthRow = monthGroups.length > 1
    const monthRow = showMonthRow
      ? `<tr><th colspan="3" style="border:1px solid #ccc;background:#f8fafc"></th>${monthGroups.map(g => `<th colspan="${g.span}" style="padding:3px 4px;border:1px solid #ccc;font-size:10px;background:#f1f5f9;font-weight:700;text-align:center">${g.label}</th>`).join('')}</tr>`
      : ''

    const printWin = window.open('', '_blank')
    if (!printWin) return
    const headerRow = dates.map(d => `<th style="padding:2px 4px;border:1px solid #ccc;font-size:9px;" title="${d.dayName}">${d.day}<br/><span style="font-size:7px;color:#999">${d.dayName}</span></th>`).join('')
    const rows = students.map((s: any) => {
      const cells = dates.map(d => {
        const st = lookup[s.id]?.[d.date]
        const sym = st === 'present' ? '✓' : st === 'absent' ? '✗' : st === 'tardy' ? 'T' : ''
        const bg = st === 'present' ? '#dcfce7' : st === 'absent' ? '#fee2e2' : st === 'tardy' ? '#fef3c7' : ''
        return `<td style="padding:2px 4px;border:1px solid #ccc;text-align:center;font-size:10px;font-weight:600;background:${bg}">${sym}</td>`
      }).join('')
      return `<tr><td style="padding:4px 8px;border:1px solid #ccc;font-size:11px;white-space:nowrap">${s.english_name} (${s.korean_name})</td><td style="padding:4px 6px;border:1px solid #ccc;font-size:10px;text-align:center">${s.korean_class || ''}</td><td style="padding:4px 6px;border:1px solid #ccc;font-size:10px;text-align:center">${s.class_number || ''}</td>${cells}</tr>`
    }).join('')
    printWin.document.write(`<html><head><title>Attendance — ${selectedClass} ${title}</title><style>body{font-family:sans-serif;padding:15px}table{border-collapse:collapse}@media print{body{padding:0}@page{size:landscape;margin:8mm 10mm}}</style></head><body>
      <h3 style="margin-bottom:4px">${selectedClass} — Grade ${selectedGrade} Attendance</h3><p style="color:#666;margin-top:0;font-size:12px">${title} · ${subtitle}</p>
      <table><thead>${monthRow}<tr><th style="padding:4px 8px;border:1px solid #ccc;text-align:left;font-size:10px">Student</th><th style="padding:4px 6px;border:1px solid #ccc;font-size:9px">Korean Class</th><th style="padding:4px 6px;border:1px solid #ccc;font-size:9px">No.</th>${headerRow}</tr></thead><tbody>${rows}</tbody></table>
      <p style="font-size:9px;color:#999;margin-top:8px">✓ Present · ✗ Absent · T Tardy</p></body></html>`)
    printWin.document.close()
    printWin.print()
  }

  const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }
  const chip = (on: boolean) => `inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const seg = (on: boolean, tone: string) => `w-9 h-8 text-[12px] font-bold border-l first:border-l-0 border-rule-2 ${on ? tone : 'text-ink-3 hover:bg-paper-2'}`
  const dateHeading = new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const weekdayName = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
  const marked = Object.keys(records).length

  return (
    <div className="px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{selectedClass} · {lang === 'ko' ? `${selectedGrade}학년` : `Grade ${selectedGrade}`} · {students.length} {lang === 'ko' ? '명' : 'students'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{t.nav.attendance}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={printDropdownRef}>
            <div className="inline-flex border border-rule-2 rounded overflow-hidden">
              <button onClick={() => handlePrintAttendance()} className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-medium text-ink hover:bg-paper-2"><Printer size={14} /> {lang === 'ko' ? '월별 출력' : 'Print month'}</button>
              <button onClick={() => setShowPrintOptions(v => !v)} aria-label="Choose weeks to print" className="h-9 px-2 border-l border-rule-2 text-ink-2 hover:bg-paper-2"><ChevronDown size={14} /></button>
            </div>
            {showPrintOptions && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-rule-2 rounded shadow-lg z-50 p-3 min-w-[280px]">
                <p className="eyebrow mb-2">{lang === 'ko' ? '주별로 인쇄' : 'Print selected weeks'}</p>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => stepPrintMonth(-1)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center" aria-label="Previous month"><ChevronLeft size={14} /></button>
                  <span className="text-[12.5px] font-medium text-ink">{navMonthLabel}</span>
                  <button onClick={() => stepPrintMonth(1)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center" aria-label="Next month"><ChevronRight size={14} /></button>
                </div>
                <div className="space-y-0.5 mb-3 max-h-56 overflow-y-auto">
                  {monthWeeks.length === 0 ? <p className="text-[12px] text-ink-3 px-1.5 py-2">{lang === 'ko' ? '이 달에는 수업일이 없습니다' : 'No class days this month'}</p>
                    : monthWeeks.map((w, i) => (
                      <label key={w.mondayKey} className="flex items-center gap-2 text-[12.5px] text-ink cursor-pointer hover:bg-paper-2 rounded px-1.5 py-1">
                        <input type="checkbox" checked={printWeeks.has(w.mondayKey)} onChange={() => setPrintWeeks(prev => { const n = new Set(prev); n.has(w.mondayKey) ? n.delete(w.mondayKey) : n.add(w.mondayKey); return n })} />
                        {lang === 'ko' ? `${i + 1}주차` : `Week ${i + 1}`}: {w.label}
                      </label>
                    ))}
                </div>
                {printWeeks.size > 0 && <p className="text-[11px] text-ink-3 mb-2">{printWeeks.size} {printWeeks.size === 1 ? 'week' : 'weeks'} {lang === 'ko' ? '선택됨' : 'selected across all months'}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { handlePrintAttendance(printWeeks); setShowPrintOptions(false); setPrintWeeks(new Set()) }} disabled={printWeeks.size === 0} className="flex-1 h-8 rounded bg-accent text-white text-[12px] font-semibold hover:bg-accent-hover disabled:opacity-40">{printWeeks.size > 0 ? `${lang === 'ko' ? '인쇄' : 'Print'} ${printWeeks.size}` : (lang === 'ko' ? '주를 선택하세요' : 'Select weeks')}</button>
                  <button onClick={() => { setShowPrintOptions(false); setPrintWeeks(new Set()) }} className="h-8 px-3 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink">{lang === 'ko' ? '취소' : 'Cancel'}</button>
                </div>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving || !hasChanges} className="inline-flex items-center gap-2 h-9 px-4 rounded text-[13px] font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{lang === 'ko' ? '출석 저장' : 'Save attendance'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap border-t border-b border-rule-2 py-3 mb-6">
        <div className="flex gap-1.5">{GRADES.map(g => <button key={g} onClick={() => guardUnsaved(() => setSelectedGrade(g))} className={chip(selectedGrade === g)}>{lang === 'ko' ? `${g}학년` : `Grade ${g}`}</button>)}</div>
        <span className="w-px h-6 bg-rule" />
        {availableClasses.length > 1
          ? <div className="flex gap-1.5">{availableClasses.map(cls => <button key={cls} onClick={() => guardUnsaved(() => setSelectedClass(cls))} className={chip(selectedClass === cls)}><span className={`w-2 h-2 rounded-full ${CLASS_DOT[cls] || 'bg-ink-3'}`} />{cls}</button>)}</div>
          : <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink"><span className={`w-2 h-2 rounded-full ${CLASS_DOT[selectedClass] || 'bg-ink-3'}`} />{selectedClass}</span>}
        <span className="w-px h-6 bg-rule" />
        <div className="inline-flex border border-rule-2 rounded overflow-hidden">
          <button onClick={() => setViewMode('day')} className={`inline-flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium ${viewMode === 'day' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}><List size={13} /> {lang === 'ko' ? '일별' : 'Day'}</button>
          <button onClick={() => setViewMode('month')} className={`inline-flex items-center gap-1.5 h-7 px-3 text-[12px] font-medium border-l border-rule-2 ${viewMode === 'month' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}><CalendarDays size={13} /> {lang === 'ko' ? '월별' : 'Month'}</button>
        </div>
        {viewMode === 'day' && (
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={prevDay} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2" aria-label="Previous class day"><ChevronLeft size={16} /></button>
            <input id="att-date" type="date" value={selectedDate} onChange={(e: any) => guardUnsaved(() => setSelectedDate(e.target.value))} className="h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink" />
            <button onClick={nextDay} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2" aria-label="Next class day"><ChevronRight size={16} /></button>
            {!isToday && <button onClick={() => guardUnsaved(() => setSelectedDate(getKSTDateString()))} className="h-7 px-2 rounded text-[12px] font-medium text-ink-2 hover:bg-paper-2">{lang === 'ko' ? '오늘' : 'Today'}</button>}
          </div>
        )}
      </div>

      {viewMode === 'day' && (<>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            {isToday && <p className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '오늘' : 'Today'}</p>}
            <h2 className="font-display text-[26px] leading-none text-ink">{dateHeading}</h2>
            {isNoClassDay
              ? <p className="text-[12.5px] text-warn mt-1.5">{isWeekend ? (lang === 'ko' ? '주말에는 수업이 없습니다' : 'No classes on weekends') : dayStatus.off ? (lang === 'ko' ? `휴일: ${dayStatus.off}` : `Day off: ${dayStatus.off}`) : (lang === 'ko' ? `${selectedGrade}학년은 ${weekdayName}에 영어 수업이 없습니다` : `Grade ${selectedGrade} has no English on ${weekdayName}s`)} · {lang === 'ko' ? '화살표로 다음 수업일로 이동' : 'use the arrows to skip to the next class day'}</p>
              : dayStatus.trip ? <p className="text-[12.5px] text-info mt-1.5">{lang === 'ko' ? `현장학습 (${dayStatus.trip}): 전원 결석으로 자동 기록됨. 참석한 학생은 바꾸세요.` : `Field trip (${dayStatus.trip}): everyone was marked absent automatically. Change anyone who came to class.`}</p>
              : <p className="text-[12px] text-ink-3 mt-1.5">{lang === 'ko' ? '행을 클릭한 뒤' : 'Click a row, then press'} <kbd className="px-1 border border-rule-2 rounded text-[10.5px]">P</kbd> <kbd className="px-1 border border-rule-2 rounded text-[10.5px]">A</kbd> <kbd className="px-1 border border-rule-2 rounded text-[10.5px]">T</kbd> · ↑ ↓</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={markAllPresent} className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-[12.5px] font-medium text-ink hover:border-ink-3"><UserCheck size={13} className="text-good" /> {lang === 'ko' ? '전원 출석' : 'All present'}</button>
            <button onClick={() => markAllAbsent('')} title="Mark every student absent without a reason" className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-[12.5px] font-medium text-ink hover:border-ink-3"><UserX size={13} className="text-bad" /> {lang === 'ko' ? '전원 결석' : 'All absent'}</button>
            <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-[12.5px] font-medium text-ink cursor-pointer hover:border-ink-3">
              <input type="checkbox" checked={absentCount === students.length && students.length > 0 && Object.values(records).some((r: any) => r.note === 'Field Trip')}
                onChange={(e: any) => { if (e.target.checked) markAllAbsent('Field Trip'); else { setRecords({}); setHasChanges(true) } }} />
              {lang === 'ko' ? '현장학습' : 'Field trip'}
            </label>
            {marked > 0 && <button onClick={() => { setRecords({}); setHasChanges(true) }} className="h-8 px-2.5 rounded text-[12.5px] text-ink-3 hover:text-ink">{lang === 'ko' ? '모두 지우기' : 'Clear all'}</button>}
          </div>
        </div>

        {isToday && !isNoClassDay && !loading && !loadingStudents && students.length > 0 && marked === 0 && (
          <div className="mb-4 px-4 py-2.5 bg-warn-soft border border-rule rounded flex items-center justify-between gap-3">
            <p className="text-[13px] text-warn">{lang === 'ko' ? '오늘 출석이 아직 기록되지 않았습니다. 표시한 뒤 저장을 누르세요.' : 'Today is not marked yet. Everyone present? Mark them all, adjust the exceptions, then save.'}</p>
            <button onClick={markAllPresent} className="h-8 px-3 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover whitespace-nowrap">{lang === 'ko' ? '전원 출석 표시' : 'Mark all present'}</button>
          </div>
        )}

        {marked > 0 && (
          <div className="flex gap-5 mb-3 text-[12.5px] tabular-nums">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-good" /><AnimatedNumber value={presentCount} /> {lang === 'ko' ? '출석' : 'present'}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-bad" /><AnimatedNumber value={absentCount} /> {lang === 'ko' ? '결석' : 'absent'}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn" /><AnimatedNumber value={tardyCount} /> {lang === 'ko' ? '지각' : 'tardy'}</span>
            {unmarkedCount > 0 && <span className="text-ink-3"><AnimatedNumber value={unmarkedCount} /> {lang === 'ko' ? '미표시' : 'unmarked'}</span>}
          </div>
        )}

        {loadingStudents || loading ? (
          <div className="border-t border-rule-2">{[...Array(6)].map((_, i) => <div key={i} className="py-3 border-b border-rule flex items-center gap-4"><div className="skeleton h-3 w-6" /><div className="skeleton h-3 w-40" /><div className="skeleton h-7 w-28 ml-auto rounded" /></div>)}</div>
        ) : students.length === 0 ? (
          <EmptyState icon={UserCheck} title="No students in this class" description="Select a different grade or class to view students" />
        ) : (
          <div className={`border-t border-rule-2 ${saveSuccess ? 'animate-success-flash' : ''}`}>
            <table className="w-full text-[13px]">
              <thead><tr>
                <th className="text-left px-2 py-2 eyebrow font-semibold w-8 border-b border-rule">#</th>
                <th className="text-left px-2 py-2 eyebrow font-semibold border-b border-rule">{lang === 'ko' ? '학생' : 'Student'}</th>
                <th className="text-left px-2 py-2 eyebrow font-semibold w-24 border-b border-rule">{lang === 'ko' ? '반 · 번호' : 'Homeroom'}</th>
                <th className="text-center px-2 py-2 eyebrow font-semibold w-[124px] border-b border-rule">P · A · T</th>
                <th className="text-left px-2 py-2 eyebrow font-semibold border-b border-rule">{lang === 'ko' ? '메모' : 'Note'}</th>
              </tr></thead>
              <tbody className="divide-y divide-rule">
                {students.map((s: any, i: number) => {
                  const rec = records[s.id]
                  const status = rec?.status
                  const focused = focusedRow === i
                  return (
                    <tr key={s.id} onClick={() => setFocusedRow(i)} className={`${focused ? 'bg-paper-2 shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-paper-2/50'}`}>
                      <td className="px-2 py-1.5 text-ink-3 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5"><span className="font-medium text-ink">{s.english_name}</span><span className="text-ink-3 ml-2 text-[12px]">{s.korean_name}</span>{status && status !== 'present' && <span className={`ml-2 text-[10.5px] font-semibold uppercase tracking-wide ${status === 'absent' ? 'text-bad' : 'text-warn'}`}>{lang === 'ko' ? STATUS_CONFIG[status as Status].labelKo : STATUS_CONFIG[status as Status].label}</span>}</td>
                      <td className="px-2 py-1.5 text-[12px] text-ink-3 tabular-nums">{s.korean_class} {s.class_number}</td>
                      <td className="px-2 py-1.5 text-center">
                        <div className="inline-flex border border-rule-2 rounded overflow-hidden bg-surface">
                          <button onClick={e => { e.stopPropagation(); setFocusedRow(i); setStatus(s.id, 'present') }} className={seg(status === 'present', 'bg-good text-white')}>P</button>
                          <button onClick={e => { e.stopPropagation(); setFocusedRow(i); setStatus(s.id, 'absent') }} className={seg(status === 'absent', 'bg-bad text-white')}>A</button>
                          <button onClick={e => { e.stopPropagation(); setFocusedRow(i); setStatus(s.id, 'tardy') }} className={seg(status === 'tardy', 'bg-warn text-white')}>T</button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={rec?.note || ''} onChange={(e: any) => setNote(s.id, e.target.value)} placeholder={status && status !== 'present' ? (lang === 'ko' ? '사유' : 'Reason') : ''}
                          className={`w-full h-7 px-2 rounded text-[12px] text-ink placeholder:text-ink-3 bg-transparent border ${status && status !== 'present' ? 'border-rule-2 bg-surface' : 'border-transparent hover:border-rule'}`} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => { exportToCSV(`attendance-${selectedClass}-${selectedDate}`, ['Student', 'Korean Name', 'Status', 'Note'], students.map((s: any) => [s.english_name, s.korean_name, records[s.id]?.status || '', records[s.id]?.note || ''])) }} className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink"><Download size={12} /> CSV</button>
        </div>

        {hasChanges && (
          <div className="sticky-save-bar -mx-8 mt-4 flex items-center justify-between">
            <p className="text-[12.5px] text-warn font-medium">{lang === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'Unsaved changes'}</p>
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 h-9 px-4 rounded text-[13px] font-semibold bg-accent text-white hover:bg-accent-hover">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{lang === 'ko' ? '출석 저장' : 'Save attendance'}
            </button>
          </div>
        )}
      </>)}

      {viewMode === 'month' && (
        <div>
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-[26px] leading-none text-ink">{calMonthLabel}</h2>
              <button onClick={() => stepCalMonth(-1)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2" aria-label="Previous month"><ChevronLeft size={16} /></button>
              <button onClick={() => stepCalMonth(1)} className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-2" aria-label="Next month"><ChevronRight size={16} /></button>
              <button onClick={() => { const d = new Date(getKSTDateString() + 'T12:00:00'); setCalMonth({ year: d.getFullYear(), month: d.getMonth() }) }} className="h-7 px-2 rounded text-[12px] font-medium text-ink-2 hover:bg-paper-2">{lang === 'ko' ? '이번 달' : 'This month'}</button>
            </div>
            <div className="flex items-center gap-4 text-[11.5px] text-ink-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-good-soft border border-good/40" />{lang === 'ko' ? '기록됨' : 'Marked'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warn-soft border border-warn/40" />{lang === 'ko' ? '일부' : 'Partial'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-bad-soft border border-bad/40" />{lang === 'ko' ? '미기록' : 'Not marked'}</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-surface border border-rule-2" />{lang === 'ko' ? '예정' : 'Upcoming'}</span>
            </div>
          </div>
          {!monthLoading && classGrades.length > 0 && (
            <p className={`mb-3 text-[13px] ${unmarkedSessions > 0 ? 'text-warn' : 'text-good'}`}>
              {unmarkedSessions > 0
                ? `${unmarkedSessions} ${unmarkedSessions === 1 ? 'grade session' : 'grade sessions'} this month ${unmarkedSessions === 1 ? 'has' : 'have'} no attendance recorded. Click a highlighted grade to fill it in.`
                : `Every grade of ${selectedClass} is marked up to today.`}
            </p>
          )}
          <div className="border border-rule-2 rounded-md overflow-hidden">
            <div className="grid grid-cols-5 bg-paper-2 border-b border-rule-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => <div key={d} className="px-3 py-1.5 eyebrow font-semibold">{d}</div>)}</div>
            {monthLoading ? <div className="p-12 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
            : classGrades.length === 0 ? <div className="p-12 text-center text-ink-3 text-[13px]">No students in {selectedClass}.</div>
            : calWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-5 border-t first:border-t-0 border-rule">
                {week.map((d, di) => {
                  if (!d) return <div key={di} className="min-h-[96px] border-r last:border-r-0 border-rule bg-paper-2/40" />
                  const key = toKey(d)
                  const future = key > todayKey
                  const todayCell = key === todayKey
                  return (
                    <div key={di} className="min-h-[96px] border-r last:border-r-0 border-rule p-1.5 flex flex-col gap-1">
                      <span className={`w-[22px] h-[22px] flex items-center justify-center rounded-full text-[12px] font-semibold tabular-nums ${todayCell ? 'bg-accent text-white' : 'text-ink-2'}`}>{d.getDate()}</span>
                      <div className="flex flex-col gap-0.5">
                        {classGrades.map(g => {
                          const nonClass = isNonClassDay(key, g)
                          const sm = monthGradeSummary[`${g}::${key}`]
                          const count = sm?.count || 0
                          const total = gradeTotals[g] || 0
                          let cls = 'text-ink-3'
                          let right: React.ReactNode = '—'
                          let clickable = false
                          if (nonClass) right = '—'
                          else if (count === 0) { if (future) { right = '·'; clickable = true } else { cls = 'bg-bad-soft text-bad'; right = <AlertTriangle size={10} />; clickable = true } }
                          else if (count < total) { cls = 'bg-warn-soft text-warn'; right = `${count}/${total}`; clickable = true }
                          else { cls = 'bg-good-soft text-good'; right = <span className="inline-flex items-center gap-0.5"><Check size={10} /> {count}</span>; clickable = true }
                          const titleTxt = nonClass ? `Grade ${g}: no class` : count === 0 && !future ? `Grade ${g}: not marked` : count === 0 ? `Grade ${g}: upcoming` : `Grade ${g}: ${count}/${total} marked`
                          return (
                            <div key={g} title={titleTxt} onClick={clickable ? (e) => { e.stopPropagation(); guardUnsaved(() => { setSelectedGrade(g); setSelectedDate(key); setViewMode('day') }) } : undefined}
                              className={`flex items-center justify-between gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${cls} ${clickable ? 'cursor-pointer hover:brightness-95' : ''}`}>
                              <span>G{g}</span><span className="inline-flex items-center">{right}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-3 mt-2">{lang === 'ko' ? `각 칩은 ${selectedClass}의 한 학년입니다. 학년을 클릭하면 일별 보기가 열립니다.` : `Each chip is one grade of ${selectedClass}. Click a grade to open that day and record attendance.`}</p>
        </div>
      )}

      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setShowUnsavedModal(false)}>
          <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-[22px] leading-none text-ink mb-2">{lang === 'ko' ? '저장되지 않은 변경사항' : 'Unsaved changes'}</h3>
            <p className="text-[13px] text-ink-2 mb-5">{lang === 'ko' ? '저장하지 않으면 변경사항이 사라집니다.' : 'Save this attendance before leaving?'}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowUnsavedModal(false); setHasChanges(false); if (pendingAction) pendingAction(); setPendingAction(null) }} className="h-9 px-3.5 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '저장 안 함' : 'Discard'}</button>
              <button onClick={async () => { await handleSave(); setShowUnsavedModal(false); if (pendingAction) pendingAction(); setPendingAction(null) }} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover">{lang === 'ko' ? '저장' : 'Save first'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
