'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useAvailableClasses } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Check, UserCheck, UserX, Clock, Download, AlertTriangle, Printer } from 'lucide-react'
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

export default function AttendanceView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
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
    setRecords(map)
    setLoading(false)
    setHasChanges(false)
  }, [selectedDate, students])

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

  const markAllAbsent = (reason: string) => {
    const updated: typeof records = {}
    students.forEach((s: any) => { updated[s.id] = { status: 'absent', note: reason } })
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
    if (dow === 1 && grade === 5) return true // Grade 5 no Monday
    return false
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

  // Print monthly attendance
  const handlePrintAttendance = async () => {
    const curDate = new Date(selectedDate)
    const year = curDate.getFullYear(), month = curDate.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthName = curDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    // Load all attendance for this month
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`
    const { data: monthData } = await supabase.from('attendance').select('*')
      .in('student_id', students.map((s: any) => s.id)).gte('date', startDate).lte('date', endDate)
    const lookup: Record<string, Record<string, string>> = {}
    if (monthData) monthData.forEach((r: any) => { if (!lookup[r.student_id]) lookup[r.student_id] = {}; lookup[r.student_id][r.date] = r.status })
    const dates = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1)
      const dow = d.getDay()
      const isWknd = dow === 0 || dow === 6
      const isG5Monday = dow === 1 && selectedGrade === 5
      return { date: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, day: i + 1, isWknd, isG5Monday, isNoClass: isWknd || isG5Monday, dayName: d.toLocaleDateString('en-US', { weekday: 'short' }) }
    }).filter(d => !d.isNoClass) // Exclude weekends and Grade 5 Mondays from printout
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
    printWin.document.write(`<html><head><title>Attendance — ${selectedClass} ${monthName}</title><style>body{font-family:sans-serif;padding:15px}table{border-collapse:collapse}@media print{body{padding:0}}</style></head><body>
      <h3 style="margin-bottom:4px">${selectedClass} — Grade ${selectedGrade} Attendance</h3><p style="color:#666;margin-top:0;font-size:12px">${monthName} · ${students.length} students</p>
      <table><thead><tr><th style="padding:4px 8px;border:1px solid #ccc;text-align:left;font-size:10px">Student</th><th style="padding:4px 6px;border:1px solid #ccc;font-size:9px">Korean Class</th><th style="padding:4px 6px;border:1px solid #ccc;font-size:9px">No.</th>${headerRow}</tr></thead><tbody>${rows}</tbody></table>
      <p style="font-size:9px;color:#999;margin-top:8px">✓ Present · ✗ Absent · T Tardy</p></body></html>`)
    printWin.document.close()
    printWin.print()
  }

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.nav.attendance}</h2>
            <p className="text-text-secondary text-sm mt-1">{selectedClass} · Grade {selectedGrade} · {students.length} students</p>
          </div>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
              hasChanges ? 'bg-gold text-navy-dark hover:bg-gold-light shadow-md shadow-gold/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {lang === 'ko' ? '출석 저장' : 'Save Attendance'}
          </button>
          <button onClick={handlePrintAttendance}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt">
            <Printer size={14} /> {lang === 'ko' ? '월별 출력' : 'Print Monthly'}
          </button>
        </div>
      </div>

      <div className="px-10 py-6">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select value={selectedGrade} onChange={(e: any) => { const v = Number(e.target.value) as Grade; guardUnsaved(() => setSelectedGrade(v)) }}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => guardUnsaved(() => setSelectedClass(cls))}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${selectedClass === cls ? 'text-white shadow-sm' : 'hover:opacity-80'}`}
                  style={{ backgroundColor: selectedClass === cls ? classToTextColor(cls) : classToColor(cls), color: selectedClass === cls ? 'white' : classToTextColor(cls) }}>
                  {cls}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: classToTextColor(selectedClass) }}>{selectedClass}</div>
          )}
          <div className="w-px h-6 bg-border" />
          {/* Date nav */}
          <div className="flex items-center gap-1">
            <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronLeft size={16} /></button>
            <input type="date" value={selectedDate} onChange={(e: any) => guardUnsaved(() => setSelectedDate(e.target.value))}
              className="px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
            <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronRight size={16} /></button>
            {!isToday && <button onClick={() => guardUnsaved(() => setSelectedDate(getKSTDateString()))} className="px-2 py-1 rounded text-[11px] font-medium text-navy hover:bg-accent-light ml-1">Today</button>}
          </div>
          <div className="w-px h-6 bg-border" />
          <button onClick={markAllPresent} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200">
            <UserCheck size={13} /> {lang === 'ko' ? '전원 출석' : 'Mark All Present'}
          </button>
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 cursor-pointer hover:bg-red-100 transition-all">
            <input type="checkbox" checked={absentCount === students.length && students.length > 0 && Object.values(records).some((r: any) => r.note === 'Field Trip')}
              onChange={(e: any) => {
                if (e.target.checked) {
                  markAllAbsent('Field Trip')
                } else {
                  setRecords({})
                  setHasChanges(true)
                }
              }}
              className="w-3.5 h-3.5 rounded border-red-300 text-red-600 focus:ring-red-500" />
            {lang === 'ko' ? '현장학습 (전원 결석)' : 'Field Trip (all absent)'}
          </label>
          {Object.keys(records).length > 0 && (
            <button onClick={() => { setRecords({}); setHasChanges(true) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border transition-all">
              Clear All
            </button>
          )}
        </div>

        {/* Date display */}
        <div className="mb-4">
          <h3 className="font-display text-lg font-semibold text-navy">
            {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          {isNoClassDay && (
            <p className="text-[12px] text-amber-600 font-medium mt-0.5">
              {isWeekend ? 'No classes on weekends' : `Grade 5 does not attend English on Mondays`}
              {' — '}use arrows to skip to the next class day
            </p>
          )}
          {isToday && <p className="text-[12px] text-green-600 font-medium mt-0.5">Today</p>}
          <p className="text-[10px] text-text-tertiary mt-1">Click a row, then use <kbd className="px-1.5 py-0.5 bg-surface-alt rounded text-[9px] font-mono border border-border shadow-sm">P</kbd> <kbd className="px-1.5 py-0.5 bg-surface-alt rounded text-[9px] font-mono border border-border shadow-sm">A</kbd> <kbd className="px-1.5 py-0.5 bg-surface-alt rounded text-[9px] font-mono border border-border shadow-sm">T</kbd> and <kbd className="px-1.5 py-0.5 bg-surface-alt rounded text-[9px] font-mono border border-border shadow-sm">↑</kbd> <kbd className="px-1.5 py-0.5 bg-surface-alt rounded text-[9px] font-mono border border-border shadow-sm">↓</kbd> to navigate</p>
        </div>

        {/* Quick-start prompt when today has no records */}
        {isToday && !isNoClassDay && !loading && !loadingStudents && students.length > 0 && Object.keys(records).length === 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-amber-800">{lang === 'ko' ? '오늘 출석이 아직 기록되지 않았습니다' : 'Attendance not yet recorded for today'}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">{lang === 'ko' ? '출석을 표시한 후 반드시 저장 버튼을 눌러주세요' : 'Mark attendance and press Save to record it'}</p>
            </div>
            <button onClick={() => { markAllPresent(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold bg-green-500 text-white hover:bg-green-600 shadow-sm transition-all">
              <UserCheck size={14} /> {lang === 'ko' ? '전원 출석 표시' : 'Mark All Present'}
            </button>
          </div>
        )}

        {/* Stats bar */}
        {Object.keys(records).length > 0 && (
          <div className="flex gap-4 mb-5 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> <AnimatedNumber value={presentCount} /> Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> <AnimatedNumber value={absentCount} /> Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> <AnimatedNumber value={tardyCount} /> Tardy</span>
            {unmarkedCount > 0 && <span className="text-text-tertiary"><AnimatedNumber value={unmarkedCount} /> unmarked</span>}
          </div>
        )}

        {/* Attendance grid */}
        {loadingStudents || loading ? (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="bg-surface-alt px-4 py-3"><div className="skeleton h-3 w-full" /></div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-t border-border flex items-center gap-4">
                <div className="skeleton h-3 w-6" />
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-12 ml-auto" />
                <div className="skeleton h-6 w-6 rounded-full" />
                <div className="skeleton h-6 w-6 rounded-full" />
                <div className="skeleton h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <EmptyState icon={UserCheck} title="No students in this class" description="Select a different grade or class to view students" />
        ) : (
          <div className={`bg-surface border border-border rounded-xl shadow-sm overflow-hidden ${saveSuccess ? 'animate-success-flash' : ''}`}>
            <table className="w-full text-[13px]">
              <thead><tr className="bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
                <th className="text-center px-2 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-14">{lang === 'ko' ? '반' : 'Korean Class'}</th>
                <th className="text-center px-2 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-10">{lang === 'ko' ? '번호' : 'No.'}</th>
                <th className="text-center px-2 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">Status</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-green-600 font-bold w-12">P</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-red-600 font-bold w-12">A</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-amber-600 font-bold w-12">T</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Note</th>
              </tr></thead>
              <tbody>
                {students.map((s: any, i: number) => {
                  const rec = records[s.id]
                  const status = rec?.status
                  return (
                    <tr key={s.id} className={`border-t border-border table-row-hover ${focusedRow === i ? 'ring-2 ring-inset ring-navy/30 bg-blue-50/30' : ''}`}
                      onClick={() => setFocusedRow(i)}>
                      <td className="px-4 py-2 text-text-tertiary">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{s.english_name}</span>
                        <span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span>
                      </td>
                      <td className="px-2 py-2 text-center text-[12px] text-text-secondary">{s.korean_class}</td>
                      <td className="px-2 py-2 text-center text-[12px] text-text-secondary">{s.class_number}</td>
                      <td className="px-2 py-2 text-center">
                        {status ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[status as Status].bg}`}>
                            {STATUS_CONFIG[status as Status].label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-tertiary">—</span>
                        )}
                      </td>
                      {(['present', 'absent', 'tardy'] as Status[]).map(st => (
                        <td key={st} className="px-2 py-2 text-center">
                          <button onClick={() => setStatus(s.id, st)}
                            className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all border-2 ${
                              status === st
                                ? st === 'present' ? 'bg-green-500 border-green-500 text-white'
                                : st === 'absent' ? 'bg-red-500 border-red-500 text-white'
                                : st === 'tardy' ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-teal-500 border-teal-500 text-white'
                                : 'bg-surface border-border text-text-tertiary hover:border-navy/30'
                            }`}>
                            {STATUS_CONFIG[st].short}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <input type="text" value={rec?.note || ''} onChange={(e: any) => setNote(s.id, e.target.value)}
                          placeholder="..." className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy bg-transparent" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Export bar */}
        <div className="mt-4">
          <button onClick={() => {
            exportToCSV(`attendance-${selectedClass}-${selectedDate}`,
              ['Student', 'Korean Name', 'Status', 'Note'],
              students.map((s: any) => [s.english_name, s.korean_name, records[s.id]?.status || '', records[s.id]?.note || '']))
          }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
            <Download size={12} /> Export CSV
          </button>
        </div>

        {/* Sticky save bar */}
        {hasChanges && (
          <div className="sticky-save-bar -mx-10 mt-4 flex items-center justify-between">
            <p className="text-[12px] text-amber-700 font-medium">{lang === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'You have unsaved changes'}</p>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light transition-all shadow-md">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {lang === 'ko' ? '출석 저장' : 'Save Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* Unsaved changes confirmation modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setShowUnsavedModal(false)}>
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-amber-500" />
              <h3 className="text-[16px] font-bold text-navy">{lang === 'ko' ? '저장되지 않은 변경사항' : 'Unsaved Changes'}</h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-5">{lang === 'ko' ? '저장하지 않으면 변경사항이 사라집니다.' : 'You have unsaved attendance changes. Save before leaving?'}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowUnsavedModal(false); setHasChanges(false); if (pendingAction) pendingAction(); setPendingAction(null) }}
                className="px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt">
                {lang === 'ko' ? '저장 안 함' : 'Discard'}
              </button>
              <button onClick={async () => { await handleSave(); setShowUnsavedModal(false); if (pendingAction) pendingAction(); setPendingAction(null) }}
                className="px-4 py-2 rounded-lg text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light">
                {lang === 'ko' ? '저장' : 'Save First'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
