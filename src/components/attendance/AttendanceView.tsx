'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Check, UserCheck, UserX, Clock, FileText } from 'lucide-react'

type Status = 'present' | 'absent' | 'tardy' | 'excused'
type LangKey = 'en' | 'ko'

const STATUS_CONFIG: Record<Status, { label: string; labelKo: string; icon: typeof UserCheck; color: string; bg: string }> = {
  present: { label: 'Present', labelKo: '출석', icon: UserCheck, color: 'text-green-600', bg: 'bg-green-100 border-green-300 text-green-700' },
  absent: { label: 'Absent', labelKo: '결석', icon: UserX, color: 'text-red-600', bg: 'bg-red-100 border-red-300 text-red-700' },
  tardy: { label: 'Tardy', labelKo: '지각', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 border-amber-300 text-amber-700' },
  excused: { label: 'Excused', labelKo: '공결', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-300 text-blue-700' },
}

export default function AttendanceView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [records, setRecords] = useState<Record<string, { status: Status; note: string; id?: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ENGLISH_CLASSES
  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  const loadRecords = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('attendance').select('*')
      .eq('date', selectedDate)
      .in('student_id', students.map(s => s.id))
    const map: Record<string, { status: Status; note: string; id?: string }> = {}
    if (data) data.forEach((r: any) => { map[r.student_id] = { status: r.status, note: r.note || '', id: r.id } })
    setRecords(map)
    setLoading(false)
    setHasChanges(false)
  }, [selectedDate, students])

  useEffect(() => { if (students.length > 0) loadRecords() }, [loadRecords, students])

  const setStatus = (studentId: string, status: Status) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], status, note: prev[studentId]?.note || '' } }))
    setHasChanges(true)
  }

  const setNote = (studentId: string, note: string) => {
    setRecords(prev => ({ ...prev, [studentId]: { ...prev[studentId], note, status: prev[studentId]?.status || 'present' } }))
    setHasChanges(true)
  }

  const markAllPresent = () => {
    const updated: typeof records = { ...records }
    students.forEach(s => { if (!updated[s.id]) updated[s.id] = { status: 'present', note: '' } })
    setRecords(updated)
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const entries = Object.entries(records).map(([studentId, r]) => ({
      student_id: studentId, date: selectedDate, status: r.status, note: r.note,
      recorded_by: currentTeacher?.id || null,
    }))
    for (const entry of entries) {
      const { error } = await supabase.from('attendance').upsert(entry, { onConflict: 'student_id,date' })
      if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
    }
    setSaving(false)
    setHasChanges(false)
    showToast(lang === 'ko' ? '출석이 저장되었습니다' : `Saved attendance for ${entries.length} students`)
    loadRecords()
  }

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }
  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const isWeekend = [0, 6].includes(new Date(selectedDate + 'T00:00').getDay())

  // Stats
  const presentCount = Object.values(records).filter(r => r.status === 'present').length
  const absentCount = Object.values(records).filter(r => r.status === 'absent').length
  const tardyCount = Object.values(records).filter(r => r.status === 'tardy').length
  const excusedCount = Object.values(records).filter(r => r.status === 'excused').length
  const unmarkedCount = students.length - Object.keys(records).length

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.nav.attendance}</h2>
            <p className="text-text-secondary text-sm mt-1">{selectedClass} · Grade {selectedGrade} · {students.length} students</p>
          </div>
          {hasChanges && (
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all shadow-sm">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {lang === 'ko' ? '저장' : 'Save Attendance'}
            </button>
          )}
        </div>
      </div>

      <div className="px-10 py-6">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <select value={selectedGrade} onChange={e => setSelectedGrade(Number(e.target.value) as Grade)}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => setSelectedClass(cls)}
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
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
            <button onClick={nextDay} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronRight size={16} /></button>
            {!isToday && <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="px-2 py-1 rounded text-[11px] font-medium text-navy hover:bg-accent-light ml-1">Today</button>}
          </div>
          <div className="w-px h-6 bg-border" />
          <button onClick={markAllPresent} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-green-100 text-green-700 hover:bg-green-200">
            <UserCheck size={13} /> {lang === 'ko' ? '전원 출석' : 'Mark All Present'}
          </button>
        </div>

        {/* Date display */}
        <div className="mb-4">
          <h3 className="font-display text-lg font-semibold text-navy">
            {new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          {isWeekend && <p className="text-[12px] text-amber-600 font-medium mt-0.5">⚠️ This is a weekend</p>}
          {isToday && <p className="text-[12px] text-green-600 font-medium mt-0.5">Today</p>}
        </div>

        {/* Stats bar */}
        {Object.keys(records).length > 0 && (
          <div className="flex gap-4 mb-5 text-[12px]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> {presentCount} Present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> {absentCount} Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> {tardyCount} Tardy</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> {excusedCount} Excused</span>
            {unmarkedCount > 0 && <span className="text-text-tertiary">{unmarkedCount} unmarked</span>}
          </div>
        )}

        {/* Attendance grid */}
        {loadingStudents || loading ? (
          <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-text-tertiary">No students in this class.</div>
        ) : (
          <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-[13px]">
              <thead><tr className="bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
                <th className="text-center px-2 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">Status</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-green-600 font-bold w-12">P</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-red-600 font-bold w-12">A</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-amber-600 font-bold w-12">T</th>
                <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-blue-600 font-bold w-12">E</th>
                <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-40">Note</th>
              </tr></thead>
              <tbody>
                {students.map((s, i) => {
                  const rec = records[s.id]
                  const status = rec?.status
                  return (
                    <tr key={s.id} className="border-t border-border table-row-hover">
                      <td className="px-4 py-2 text-text-tertiary">{i + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{s.english_name}</span>
                        <span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {status ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[status].bg}`}>
                            {STATUS_CONFIG[status].label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-tertiary">—</span>
                        )}
                      </td>
                      {(['present', 'absent', 'tardy', 'excused'] as Status[]).map(st => (
                        <td key={st} className="px-2 py-2 text-center">
                          <button onClick={() => setStatus(s.id, st)}
                            className={`w-7 h-7 rounded-full text-[10px] font-bold transition-all border-2 ${
                              status === st
                                ? st === 'present' ? 'bg-green-500 border-green-500 text-white'
                                : st === 'absent' ? 'bg-red-500 border-red-500 text-white'
                                : st === 'tardy' ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-surface border-border text-text-tertiary hover:border-navy/30'
                            }`}>
                            {st[0].toUpperCase()}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <input type="text" value={rec?.note || ''} onChange={e => setNote(s.id, e.target.value)}
                          placeholder="..." className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy bg-transparent" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Save bar */}
        {hasChanges && (
          <div className="mt-4 px-5 py-3 bg-warm-light border border-gold/20 rounded-lg flex items-center justify-between">
            <p className="text-[12px] text-amber-700">{lang === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'You have unsaved changes'}</p>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
