'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, Printer, X, Loader2, Calendar, AlertCircle, Save } from 'lucide-react'
import LessonScaffoldBanner from './LessonScaffoldBanner'

interface SlotTemplate { id: string; day_of_week: number; slot_label: string; sort_order: number; grade?: number }
interface LessonEntry { id?: string; slot_label: string; title: string; objective: string; notes: string }
interface HomeworkEntry { id?: string; homework_text: string }
interface CalendarEvent { id: string; title: string; date: string; type: string }

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


export default function LessonPlanView() {
  return (
    <div className="animate-fade-in">
      <ParentCalendarView />
    </div>
  )
}

function ParentCalendarView() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Snapdragon'
  const teacherClass = currentTeacher?.english_class as EnglishClass

  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daewoo_lesson_grade')
      if (saved) { const n = Number(saved); if ([1,2,3,4,5].includes(n)) return n as Grade }
    }
    return 3
  })
  useEffect(() => { localStorage.setItem('daewoo_lesson_grade', String(selectedGrade)) }, [selectedGrade])
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [editDate, setEditDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const DEFAULT_SUBJECTS = ['Reading', 'Phonics', 'Writing', 'Speaking', 'Language']
  interface DayContent { subjects: { label: string; content: string }[]; objective: string; notes: string }
  const emptyDay = (): DayContent => ({ subjects: [{ label: '', content: '' }], objective: '', notes: '' })

  const [dayData, setDayData] = useState<Record<string, DayContent>>({})
  const [weeklyHomework, setWeeklyHomework] = useState<Record<string, string>>({}) // keyed by Monday date
  const [calEvents, setCalEvents] = useState<Record<string, { title: string; type?: string }[]>>({})
  const [printWeeks, setPrintWeeks] = useState<Set<number>>(new Set()) // selected week indices for printing; empty = all
  const [showPrintOptions, setShowPrintOptions] = useState(false)

  const canEdit = isAdmin || currentTeacher?.english_class === selectedClass

  const getMondayOf = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const dow = dt.getDay(); const diff = dow === 0 ? -6 : 1 - dow
    const mon = new Date(dt); mon.setDate(dt.getDate() + diff)
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
  }

  // Build month grid
  const monthDays = useMemo(() => {
    const first = new Date(year, month, 1)
    const lastDate = new Date(year, month + 1, 0).getDate()
    const startDow = first.getDay() // 0=Sun
    const days: { date: string; dayNum: number; dayOfWeek: number; weekIdx: number }[] = []
    for (let d = 1; d <= lastDate; d++) {
      const dt = new Date(year, month, d)
      const dow = dt.getDay()
      if (dow === 0 || dow === 6) continue // skip weekends
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: dateStr, dayNum: d, dayOfWeek: dow, weekIdx: 0 })
    }
    // Assign week indices
    let wi = 0; let lastWeekMon = ''
    days.forEach(d => {
      const dt = new Date(year, month, d.dayNum)
      const diff = dt.getDay() === 0 ? -6 : 1 - dt.getDay()
      const mon = new Date(dt); mon.setDate(dt.getDate() + diff)
      const monStr = mon.toISOString().split('T')[0]
      if (monStr !== lastWeekMon) { if (lastWeekMon) wi++; lastWeekMon = monStr }
      d.weekIdx = wi
    })
    return days
  }, [year, month])

  const weeks = useMemo(() => {
    const w: typeof monthDays[number][][] = []
    monthDays.forEach(d => { while (w.length <= d.weekIdx) w.push([]); w[d.weekIdx].push(d) })
    return w
  }, [monthDays])

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const todayStr = getKSTDateString()

  const loadData = useCallback(async () => {
    setLoading(true)
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    const [planRes, eventsRes] = await Promise.all([
      supabase.from('parent_calendar').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade).gte('date', firstDay).lte('date', lastDay),
      supabase.from('calendar_events').select('date, title, type, show_on_parent_calendar, target_grades').gte('date', firstDay).lte('date', lastDay),
    ])

    const dd: Record<string, DayContent> = {}

    if (planRes.error && (planRes.error.message?.includes('does not exist') || planRes.error.code === '42P01')) {
      // parent_calendar table doesn't exist -- fall back to legacy
      const legacyRes = await supabase.from('lesson_plan_entries').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade).gte('date', firstDay).lte('date', lastDay)
      if (legacyRes.data) {
        legacyRes.data.forEach((e: any) => {
          if (!dd[e.date]) dd[e.date] = emptyDay()
          const subIdx = dd[e.date].subjects.findIndex(s => s.label.toLowerCase() === (e.slot_label || '').toLowerCase())
          if (subIdx >= 0) dd[e.date].subjects[subIdx].content = e.title || ''
          if (e.objective && !dd[e.date].objective) dd[e.date].objective = e.objective
        })
      }
    } else if (planRes.data) {
      planRes.data.forEach((row: any) => {
        try {
          const parsed = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
          dd[row.date] = { ...emptyDay(), ...parsed }
          // Filter out empty subject rows — only keep rows where the teacher has entered content
          if (parsed.subjects && parsed.subjects.length > 0) {
            const filledSubjects = parsed.subjects.filter((s: any) => s.content && s.content.trim())
            // If there are filled subjects, show only those. Otherwise show one empty row.
            dd[row.date].subjects = filledSubjects.length > 0 ? filledSubjects : [{ label: '', content: '' }]
          } else {
            dd[row.date].subjects = [{ label: '', content: '' }]
          }
        } catch { dd[row.date] = emptyDay() }
      })
    }

    // Load calendar events for parent calendar
    const ce: Record<string, { title: string; type?: string }[]> = {}
    let eventsList = eventsRes.data
    if (eventsRes.error) {
      const fallbackRes = await supabase.from('calendar_events').select('date, title, type').gte('date', firstDay).lte('date', lastDay)
      eventsList = fallbackRes.data || null
    }
    if (eventsList) {
      eventsList.forEach((ev: any) => {
        if (!ev.show_on_parent_calendar) return
        const tg = ev.target_grades as number[] | null
        const gradeMatch = !tg || tg.length === 0 || tg.includes(selectedGrade)
        if (gradeMatch) {
          if (!ce[ev.date]) ce[ev.date] = []
          ce[ev.date].push({ title: ev.title, type: ev.type })
        }
      })
    }
    setCalEvents(ce)
    setDayData(dd)

    // Load weekly homework (stored as class_hw entries keyed by Monday date)
    // Extend range to cover Mondays that might fall in adjacent months
    // (e.g. a Monday in late March is the hw key for first week shown in April)
    const hwFirstDay = getMondayOf(firstDay)
    const hwLastDay = (() => {
      // Get the Monday of the last day of the month, then add 6 days to cover full week
      const lastDayDate = new Date(year, month + 1, 0)
      const mon = getMondayOf(`${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`)
      return mon
    })()
    const hwRes = await supabase.from('parent_calendar').select('date, content')
      .eq('english_class', selectedClass + '_hw').eq('grade', selectedGrade)
      .gte('date', hwFirstDay).lte('date', hwLastDay)
    const hw: Record<string, string> = {}
    if (hwRes.data) {
      hwRes.data.forEach((row: any) => {
        try { hw[row.date] = typeof row.content === 'string' ? JSON.parse(row.content)?.homework || '' : '' } catch { }
      })
    }
    // Also check if old per-day homework exists in dayData and migrate it
    Object.entries(dd).forEach(([date, d]) => {
      if ((d as any).homework) {
        const mon = getMondayOf(date)
        if (!hw[mon]) hw[mon] = (d as any).homework
      }
    })
    setWeeklyHomework(hw)
    setLoading(false)
  }, [year, month, selectedClass, selectedGrade])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const updateSubject = (date: string, idx: number, content: string) => {
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects]; d.subjects[idx] = { ...d.subjects[idx], content }
      return { ...prev, [date]: d }
    })
  }
  const updateSubjectLabel = (date: string, idx: number, label: string) => {
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects]; d.subjects[idx] = { ...d.subjects[idx], label }
      return { ...prev, [date]: d }
    })
  }
  const addSubjectRow = (date: string) => {
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects, { label: '', content: '' }]
      return { ...prev, [date]: d }
    })
  }
  const removeSubjectRow = (date: string, idx: number) => {
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = d.subjects.filter((_, i) => i !== idx)
      return { ...prev, [date]: d }
    })
  }
  const openDay = (date: string) => {
    if (!canEdit) return
    // If this day has no data at all, initialize with one empty subject row
    if (!dayData[date]) {
      setDayData(prev => ({ ...prev, [date]: emptyDay() }))
    }
    setEditDate(date)
  }

  const updateField = (date: string, field: 'objective' | 'notes', value: string) => {
    setDayData(prev => ({ ...prev, [date]: { ...(prev[date] || emptyDay()), [field]: value } }))
  }
  const updateHomework = (mondayDate: string, value: string) => {
    setWeeklyHomework(prev => ({ ...prev, [mondayDate]: value }))
  }

  // Save a single day
  const saveDay = async (date: string) => {
    const content = dayData[date] || emptyDay()
    const { error } = await supabase.from('parent_calendar').upsert({
      date, english_class: selectedClass, grade: selectedGrade,
      content: JSON.stringify(content),
      updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'date,english_class,grade' })
    if (error) { showToast(`Error: ${error.message}`); return false }
    // Also save weekly homework for this week
    const mon = getMondayOf(date)
    const hw = weeklyHomework[mon] || ''
    await supabase.from('parent_calendar').upsert({
      date: mon, english_class: selectedClass + '_hw', grade: selectedGrade,
      content: JSON.stringify({ homework: hw }),
      updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'date,english_class,grade' })
    return true
  }

  // Save all days in the month + all weekly homework
  const saveAll = async () => {
    setSaving(true)
    let errors = 0
    for (const date of monthDays.map(d => d.date)) {
      if (!dayData[date]) continue
      const content = dayData[date] || emptyDay()
      const { error } = await supabase.from('parent_calendar').upsert({
        date, english_class: selectedClass, grade: selectedGrade,
        content: JSON.stringify(content),
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class,grade' })
      if (error) errors++
    }
    // Save all weekly homework entries
    for (const [mon, hw] of Object.entries(weeklyHomework)) {
      const { error } = await supabase.from('parent_calendar').upsert({
        date: mon, english_class: selectedClass + '_hw', grade: selectedGrade,
        content: JSON.stringify({ homework: hw }),
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class,grade' })
      if (error) errors++
    }
    setSaving(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : 'Month saved')
  }

  // Debounced autosave -- save current day after 2s of no edits
  // IMPORTANT: We snapshot class/grade/date at timer-set time to prevent
  // race conditions where switching class/grade before the timer fires
  // would save data to the wrong destination.
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!editDate || !canEdit) return
    const content = dayData[editDate]
    if (!content) return
    const contentStr = JSON.stringify(content)
    if (contentStr === lastSavedRef.current) return

    // Snapshot current values so the timeout closure uses the correct targets
    const snapshotDate = editDate
    const snapshotClass = selectedClass
    const snapshotGrade = selectedGrade
    const snapshotTeacherId = currentTeacher?.id

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      await supabase.from('parent_calendar').upsert({
        date: snapshotDate, english_class: snapshotClass, grade: snapshotGrade,
        content: contentStr,
        updated_by: snapshotTeacherId, updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class,grade' })
      lastSavedRef.current = contentStr
    }, 2000)

    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [dayData, editDate, canEdit, selectedClass, selectedGrade])

  // Navigate to adjacent weekday from modal
  const getAdjacentDate = (date: string, direction: 'prev' | 'next'): string | null => {
    const idx = monthDays.findIndex(d => d.date === date)
    if (idx < 0) return null
    const newIdx = direction === 'next' ? idx + 1 : idx - 1
    return newIdx >= 0 && newIdx < monthDays.length ? monthDays[newIdx].date : null
  }

  const navigateModal = async (direction: 'prev' | 'next') => {
    if (!editDate) return
    // Auto-save current day before navigating
    await saveDay(editDate)
    const next = getAdjacentDate(editDate, direction)
    if (next) setEditDate(next)
  }

  // Print full month
  const handlePrint = (selectedWeekIndices?: Set<number>) => {
    const pw = window.open('', '_blank'); if (!pw) return
    const mn = MONTH_NAMES[month]
    const weeksToPrint = selectedWeekIndices && selectedWeekIndices.size > 0
      ? weeks.filter((_, i) => selectedWeekIndices.has(i))
      : weeks
    const isPartial = selectedWeekIndices && selectedWeekIndices.size > 0 && selectedWeekIndices.size < weeks.length

    let weeksHTML = ''
    weeksToPrint.forEach(week => {
      const fw: (typeof monthDays[0] | null)[] = [null, null, null, null, null]
      week.forEach(d => { fw[d.dayOfWeek - 1] = d })

      let daysHTML = ''
      fw.forEach((day, di) => {
        if (!day) { daysHTML += '<td class="day empty"></td>'; return }
        const data = dayData[day.date] || emptyDay()
        const evts = calEvents[day.date] || []
        const noG5 = di === 0 && selectedGrade === 5

        let inner = ''
        if (noG5) {
          inner = '<div class="no-class">No Grade 5</div>'
        } else {
          evts.forEach(ev => { inner += `<div class="event">${ev.title}</div>` })
          const hasAny = data.subjects.some(s => s.content.trim()) || data.objective
          data.subjects.forEach(s => {
            if (!s.content.trim() && !hasAny) return
            if (!s.content.trim() && !s.label.trim()) return
            inner += `<div class="subj"><span class="subj-label">${s.label}${s.content ? ':' : ''}</span>${s.content ? ' ' + s.content : ''}</div>`
          })
          if (data.objective) inner += `<div class="obj"><span class="obj-pre">Students will</span> ${data.objective}</div>`
          if (!inner) inner = '<div class="empty-day">--</div>'
        }

        daysHTML += `<td class="day"><div class="day-hdr">${DAY_SHORT[di]} <span class="day-num">${month + 1}/${day.dayNum}</span></div>${inner}</td>`
      })

      // Add weekly homework row if this week has homework
      const weekMonday = week.length > 0 ? getMondayOf(week[0].date) : ''
      const hw = weeklyHomework[weekMonday] || ''
      if (hw) {
        weeksHTML += `<tr>${daysHTML}</tr><tr><td colspan="5" class="hw-row"><span class="hw-label">Weekly Homework:</span> ${hw}</td></tr>`
      } else {
        weeksHTML += `<tr>${daysHTML}</tr>`
      }
    })

    pw.document.write(`<!DOCTYPE html><html><head><title>${selectedClass} Grade ${selectedGrade} - ${mn} ${year}</title>
<style>
  @page { size: landscape; margin: 8mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { background: #647FBC; color: white; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; position: relative; }
  .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #C9A84C, #e8d48b, #C9A84C); }
  .header h1 { font-size: 20px; font-weight: 700; font-family: Georgia, serif; }
  .header .sub { font-size: 11px; opacity: 0.6; margin-top: 2px; }
  .header .right { text-align: right; font-size: 11px; opacity: 0.6; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  .col-hdr { text-align: center; font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding: 6px 4px; background: #f1f5f9; border: 1px solid #e2e8f0; }
  .day { vertical-align: top; padding: 6px 8px; border: 1px solid #e2e8f0; width: 20%; min-height: 60px; }
  .day.empty { background: #fafafa; }
  .day-hdr { font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px solid #f1f5f9; }
  .day-num { color: #475569; font-weight: 800; }
  .subj { font-size: 9.5px; line-height: 1.4; margin: 2px 0; }
  .subj-label { font-weight: 700; color: #647FBC; }
  .obj { font-size: 9px; color: #1e293b; font-style: italic; margin-top: 3px; padding-top: 3px; border-top: 1px solid #f1f5f9; }
  .obj-pre { color: #475569; font-weight: 600; }
  .hw { font-size: 9px; font-weight: 600; color: #b8860b; margin-top: 3px; padding: 2px 5px; background: #fff8e1; border-radius: 3px; }
  .event { font-size: 9px; font-weight: 700; color: #475569; background: #e2e8f0; border-radius: 4px; padding: 3px 6px; margin-bottom: 4px; }
  .no-class { font-size: 9px; color: #94a3b8; font-style: italic; text-align: center; padding: 10px 0; }
  .empty-day { font-size: 9px; color: #cbd5e1; text-align: center; padding: 8px 0; }
  .hw-row { padding: 5px 10px; background: #fffbeb; border: 1px solid #e2e8f0; font-size: 9.5px; color: #92400e; }
  .hw-label { font-weight: 700; }
  .footer { text-align: center; margin-top: 8px; font-size: 8px; color: #94a3b8; letter-spacing: 1px; }
</style></head><body>
  <div class="header">
    <div><h1>${selectedClass} -- ${mn} ${year}${isPartial ? ' (Selected Weeks)' : ''}</h1><div class="sub">Grade ${selectedGrade} -- Daewoo Elementary School English Program</div></div>
    <div class="right">Daewoo Elementary School<br>English Program</div>
  </div>
  <table>
    <tr><th class="col-hdr">Monday</th><th class="col-hdr">Tuesday</th><th class="col-hdr">Wednesday</th><th class="col-hdr">Thursday</th><th class="col-hdr">Friday</th></tr>
    ${weeksHTML}
  </table>
  <div class="footer">Daewoo Elementary School -- English Program -- ${mn} ${year}</div>
</body></html>`)
    pw.document.close(); setTimeout(() => pw.print(), 400)
  }

  const fmtShort = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const fmtDayName = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' })
  }

  if (loading) return (
    <div>
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">Lesson Plans</h2>
        <p className="text-[13px] text-text-secondary mt-1">Monthly parent calendar by class and grade</p>
      </div>
      <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
    </div>
  )

  const editDay = editDate ? (dayData[editDate] || emptyDay()) : null
  const editDateIsNoG5 = editDate ? (new Date(editDate + 'T12:00:00').getDay() === 1 && selectedGrade === 5) : false

  return (
    <div>
      <div className="bg-surface border-b border-border px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">Lesson Plans</h2>
            <p className="text-[13px] text-text-secondary mt-1">Monthly parent calendar by class and grade</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="flex">
                <button onClick={() => handlePrint()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-l-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Printer size={14} /> Print Month</button>
                <button onClick={() => setShowPrintOptions(!showPrintOptions)} className="px-2 py-2 rounded-r-lg text-white bg-navy hover:bg-navy-dark border-l border-white/20"><ChevronDown size={14} /></button>
              </div>
              {showPrintOptions && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 p-3 min-w-[220px]">
                  <p className="text-[11px] font-semibold text-navy mb-2">Print Selected Weeks</p>
                  <div className="space-y-1.5 mb-3">
                    {weeks.map((week, i) => {
                      const firstDay = week[0]; const lastDay = week[week.length - 1]
                      const label = firstDay && lastDay ? `${month + 1}/${firstDay.dayNum} - ${month + 1}/${lastDay.dayNum}` : `Week ${i + 1}`
                      return (
                        <label key={i} className="flex items-center gap-2 text-[11px] text-text-primary cursor-pointer hover:bg-surface-alt rounded px-1.5 py-1">
                          <input type="checkbox" checked={printWeeks.has(i)}
                            onChange={() => setPrintWeeks(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                            className="rounded border-border text-navy" />
                          Week {i + 1}: {label}
                        </label>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { handlePrint(printWeeks); setShowPrintOptions(false); setPrintWeeks(new Set()) }}
                      disabled={printWeeks.size === 0}
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
                      Print {printWeeks.size > 0 ? `${printWeeks.size} Week${printWeeks.size > 1 ? 's' : ''}` : '(select weeks)'}
                    </button>
                    <button onClick={() => { setShowPrintOptions(false); setPrintWeeks(new Set()) }}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            {canEdit && (
              <button onClick={saveAll} disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-semibold bg-gold text-navy-dark hover:bg-gold/90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Month'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex gap-1">
            {(isAdmin ? ENGLISH_CLASSES : [teacherClass]).filter(Boolean).map(c => (
              <button key={c} onClick={() => { if (c !== selectedClass) { setEditDate(null); if (autosaveTimer.current) clearTimeout(autosaveTimer.current); setDayData({}); setWeeklyHomework({}); setSelectedClass(c) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedClass === c ? 'text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-1">
            {GRADES.map(g => <button key={g} onClick={() => { if (g !== selectedGrade) { setEditDate(null); if (autosaveTimer.current) clearTimeout(autosaveTimer.current); lastSavedRef.current = ''; setDayData({}); setWeeklyHomework({}); setSelectedGrade(g) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Grade {g}</button>)}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] mx-auto">
        {/* Month nav */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronLeft size={20} /></button>
          <h3 className="text-xl font-display font-bold text-navy min-w-[240px] text-center">{MONTH_NAMES[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronRight size={20} /></button>
        </div>

        {/* Month grid */}
        <div className="border border-border rounded-xl overflow-hidden shadow-sm">
          {/* Column headers */}
          <div className="grid grid-cols-5 bg-surface-alt border-b border-border">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
              <div key={d} className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-tertiary border-r border-border last:border-r-0">{d}</div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            const fw: (typeof monthDays[0] | null)[] = [null, null, null, null, null]
            week.forEach(d => { fw[d.dayOfWeek - 1] = d })
            const weekMonday = week.length > 0 ? getMondayOf(week[0].date) : ''
            const hw = weeklyHomework[weekMonday] || ''
            return (
              <div key={wi}>
                <div className="grid grid-cols-5 border-b border-border">
                {fw.map((day, di) => {
                  if (!day) return <div key={di} className="bg-gray-50/50 border-r border-border last:border-r-0 min-h-[110px]" />
                  const data = dayData[day.date] || emptyDay()
                  const evts = calEvents[day.date] || []
                  const isToday = day.date === todayStr
                  const noG5 = di === 0 && selectedGrade === 5
                  const hasFill = data.subjects.some(s => s.content.trim()) || data.objective
                  return (
                    <div key={di}
                      onClick={() => openDay(day.date)}
                      className={`border-r border-border last:border-r-0 min-h-[140px] p-3 transition-all ${
                        canEdit ? 'cursor-pointer hover:bg-blue-50/30' : ''
                      } ${isToday ? 'bg-amber-50/30 ring-2 ring-inset ring-gold/40' : 'bg-white'}`}>
                      {/* Day header */}
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 pb-1.5 border-b flex items-center justify-between ${isToday ? 'text-amber-700 border-gold/30' : 'text-slate-500 border-border/40'}`}>
                        <span>{DAY_SHORT[di]} <span className="text-text-primary font-extrabold">{month + 1}/{day.dayNum}</span></span>
                        {isToday && <span className="text-[8px] bg-gold/20 text-gold-dark px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                        {canEdit && hasFill && <span className="text-[8px] text-blue-400">✎</span>}
                      </div>

                      {noG5 ? (
                        <div className="text-[11px] text-text-secondary italic text-center mt-6">No G5 Mondays</div>
                      ) : (
                        <>
                          {evts.map((ev, ei) => <div key={ei} className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-1 mb-1.5">{ev.title}</div>)}
                          {data.subjects.filter(s => s.content.trim() || (hasFill && s.label.trim())).map(s => (
                            <div key={s.label} className="text-[11px] leading-snug mb-1">
                              <span className="font-bold text-navy">{s.label}{s.content ? ':' : ''}</span>{s.content ? ' ' : ''}
                              <span className="text-text-primary">{s.content}</span>
                            </div>
                          ))}
                          {data.objective && (
                            <div className="text-[10px] text-text-primary italic mt-1.5 pt-1.5 border-t border-border/20">
                              <span className="text-navy font-semibold">Students will</span> {data.objective}
                            </div>
                          )}
                          {!hasFill && !data.objective && evts.length === 0 && canEdit && (
                            <div className="text-[11px] text-text-tertiary/30 italic text-center mt-8">Click to add</div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
                </div>
                {/* Weekly homework bar */}
                {(hw || canEdit) && (
                  <div className={`border-b border-border px-3 py-1.5 flex items-center gap-2 ${hw ? 'bg-amber-50/50' : 'bg-gray-50/30'}`}>
                    <span className="text-[10px] font-bold text-amber-800 shrink-0">Weekly HW:</span>
                    {canEdit ? (
                      <input value={hw} onChange={e => updateHomework(weekMonday, e.target.value)}
                        onBlur={async () => {
                          await supabase.from('parent_calendar').upsert({
                            date: weekMonday, english_class: selectedClass + '_hw', grade: selectedGrade,
                            content: JSON.stringify({ homework: weeklyHomework[weekMonday] || '' }),
                            updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
                          }, { onConflict: 'date,english_class,grade' })
                        }}
                        placeholder="Enter homework for this week..."
                        className="flex-1 text-[10px] bg-transparent outline-none text-amber-900 placeholder:text-amber-300 py-0.5" />
                    ) : (
                      <span className="text-[10px] text-amber-900">{hw || '--'}</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ EDIT DAY MODAL ═══ */}
      {editDate && editDay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={async () => { await saveDay(editDate); setEditDate(null) }}>
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-[16px] font-bold text-navy">{fmtDayName(editDate)}</h3>
                <p className="text-[12px] text-text-secondary">{fmtShort(editDate)} -- {selectedClass} Grade {selectedGrade}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigateModal('prev')} disabled={!getAdjacentDate(editDate, 'prev')} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Previous day"><ChevronLeft size={18} /></button>
                <button onClick={() => navigateModal('next')} disabled={!getAdjacentDate(editDate, 'next')} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Next day"><ChevronRight size={18} /></button>
                <div className="w-px h-5 bg-border mx-1" />
                <button onClick={async () => { await saveDay(editDate); setEditDate(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={18} /></button>
              </div>
            </div>

            {/* Calendar event banner */}
            {calEvents[editDate]?.length > 0 && (
              <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 space-y-1">
                {calEvents[editDate].map((ev, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-slate-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-700">{ev.title}</span>
                  </div>
                ))}
              </div>
            )}

            {editDateIsNoG5 ? (
              <div className="px-5 py-16 text-center">
                <p className="text-[15px] font-semibold text-text-tertiary">No Grade 5 on Mondays</p>
              </div>
            ) : (
              <div className="px-5 py-5 space-y-0">
                {/* Subject inputs */}
                {editDay.subjects.map((sub, idx) => (
                  <SubjectLabelRow
                    key={idx}
                    label={sub.label}
                    content={sub.content}
                    onLabelChange={(label: string) => updateSubjectLabel(editDate, idx, label)}
                    onContentChange={(content: string) => updateSubject(editDate, idx, content)}
                    onRemove={editDay.subjects.length > 1 ? () => removeSubjectRow(editDate, idx) : undefined}
                    autoFocus={idx === 0}
                    onNavigateDay={navigateModal}
                  />
                ))}
                {/* Add subject row */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => addSubjectRow(editDate)} className="ml-[100px] text-[11px] text-text-tertiary hover:text-navy font-medium px-2 py-1 rounded hover:bg-surface-alt transition-colors">+ Add row</button>
                </div>

                {/* Objective */}
                <div className="flex items-center gap-3 pt-4 mt-2 border-t border-border/20">
                  <label className="text-[12px] font-bold text-navy w-[72px] text-right shrink-0 italic">Students will</label>
                  <input
                    value={editDay.objective}
                    onChange={e => updateField(editDate, 'objective', e.target.value)}
                    placeholder="identify main idea and key details in a nonfiction text"
                    className="pcal-modal-input flex-1 px-3 py-3 text-[14px] bg-transparent border-b border-border/40 outline-none focus:border-navy transition-colors placeholder:text-text-tertiary/20 italic"
                    onKeyDown={e => {
                      if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
                        e.preventDefault()
                        const inputs = document.querySelectorAll('.pcal-modal-input')
                        const cur = Array.from(inputs).indexOf(e.currentTarget)
                        if (cur >= 0 && cur < inputs.length - 1) (inputs[cur + 1] as HTMLInputElement).focus()
                      }
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const inputs = document.querySelectorAll('.pcal-modal-input')
                        const cur = Array.from(inputs).indexOf(e.currentTarget)
                        if (cur > 0) (inputs[cur - 1] as HTMLInputElement).focus()
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); navigateModal('prev') }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); navigateModal('next') }
                    }}
                  />
                </div>

                {/* Weekly Homework */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="text-[11px] font-bold text-gray-800 w-[72px] text-right shrink-0">Weekly HW</label>
                  <input
                    value={weeklyHomework[getMondayOf(editDate)] || ''}
                    onChange={e => updateHomework(getMondayOf(editDate), e.target.value)}
                    placeholder="Homework for this week (shared across Mon-Fri)"
                    className="pcal-modal-input flex-1 px-3 py-3 text-[14px] bg-amber-50/30 border-b border-amber-200/30 outline-none focus:border-amber-400 transition-colors placeholder:text-amber-300/50 rounded-t"
                    onKeyDown={e => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        const inputs = document.querySelectorAll('.pcal-modal-input')
                        const cur = Array.from(inputs).indexOf(e.currentTarget)
                        if (cur > 0) (inputs[cur - 1] as HTMLInputElement).focus()
                      }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); navigateModal('prev') }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); navigateModal('next') }
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveDay(editDate).then(() => setEditDate(null)) }
                      if (e.key === 'Escape') { saveDay(editDate).then(() => setEditDate(null)) }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-surface-alt/30 rounded-b-xl">
              <p className="text-[10px] text-text-tertiary">Arrow keys to move between fields -- Cmd+Arrow to change day -- Esc to save and close</p>
              <button onClick={async () => { await saveDay(editDate); setEditDate(null) }}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const SUBJECT_OPTIONS = ['Reading', 'Into Reading', 'Phonics', 'Writing', 'Speaking', 'Grammar', 'Vocabulary', 'Spelling', 'Listening', 'Review', 'Thumbs Up']

function SubjectLabelRow({ label, content, onLabelChange, onContentChange, onRemove, autoFocus, onNavigateDay }: {
  label: string; content: string
  onLabelChange: (label: string) => void
  onContentChange: (content: string) => void
  onRemove?: () => void
  autoFocus?: boolean
  onNavigateDay: (direction: 'prev' | 'next') => void
}) {
  const isCustom = label !== '' && !SUBJECT_OPTIONS.includes(label)
  const [showCustomInput, setShowCustomInput] = useState(isCustom)

  return (
    <div className="flex items-center gap-2 group">
      {showCustomInput ? (
        <div className="flex items-center w-[100px] shrink-0">
          <input
            value={label}
            onChange={e => onLabelChange(e.target.value)}
            className="text-[12px] font-bold text-navy w-full text-right py-3 bg-transparent outline-none border-b border-navy/30 placeholder:text-navy/30"
            placeholder="Custom..."
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Escape') { if (!label) setShowCustomInput(false) }
            }}
          />
          <button onClick={() => { onLabelChange(''); setShowCustomInput(false) }}
            className="p-0.5 text-text-tertiary hover:text-navy ml-0.5 shrink-0" title="Back to dropdown">
            <X size={10} />
          </button>
        </div>
      ) : (
        <select
          value={label}
          onChange={e => {
            if (e.target.value === '__custom__') {
              setShowCustomInput(true)
              onLabelChange('')
            } else {
              onLabelChange(e.target.value)
            }
          }}
          className="text-[12px] font-bold text-navy w-[100px] text-right shrink-0 py-3 bg-transparent outline-none border-b border-transparent focus:border-navy/30 cursor-pointer"
          style={{ textAlignLast: 'right' }}
        >
          <option value="">Select...</option>
          {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="__custom__">Custom...</option>
        </select>
      )}
      <input
        value={content}
        onChange={e => onContentChange(e.target.value)}
        placeholder={label ? `What are students doing in ${label}?` : 'Select a subject first...'}
        className="pcal-modal-input flex-1 px-3 py-3 text-[14px] bg-transparent border-b border-border/40 outline-none focus:border-navy transition-colors placeholder:text-text-tertiary/25"
        autoFocus={autoFocus}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey)) {
            e.preventDefault()
            const inputs = document.querySelectorAll('.pcal-modal-input')
            const cur = Array.from(inputs).indexOf(e.currentTarget)
            if (cur >= 0 && cur < inputs.length - 1) (inputs[cur + 1] as HTMLInputElement).focus()
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            const inputs = document.querySelectorAll('.pcal-modal-input')
            const cur = Array.from(inputs).indexOf(e.currentTarget)
            if (cur > 0) (inputs[cur - 1] as HTMLInputElement).focus()
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); onNavigateDay('prev') }
          if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); onNavigateDay('next') }
        }}
        ref={el => { if (el) el.classList.add('pcal-modal-input') }}
      />
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity shrink-0" title="Remove row"><X size={14} /></button>
      )}
    </div>
  )
}

