'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Printer, X, Loader2, Calendar, AlertCircle, CalendarRange, ClipboardList, Save } from 'lucide-react'
import LessonScaffoldBanner from './LessonScaffoldBanner'
import YearlyPlanView from '@/components/curriculum/YearlyPlanView'

interface SlotTemplate { id: string; day_of_week: number; slot_label: string; sort_order: number; grade?: number }
interface LessonEntry { id?: string; slot_label: string; title: string; objective: string; notes: string }
interface HomeworkEntry { id?: string; homework_text: string }
interface CalendarEvent { id: string; title: string; date: string; type: string }

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


export default function LessonPlanView() {
  const [tab, setTab] = useState<'monthly' | 'teacher' | 'yearly'>('monthly')
  const tabButtons = (
    <div className="flex gap-1 mt-4">
      <button onClick={() => setTab('monthly')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium ${tab === 'monthly' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><Calendar size={15} /> Parent Calendar</button>
      <button onClick={() => setTab('teacher')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium ${tab === 'teacher' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><ClipboardList size={15} /> Teacher Plans</button>
      <button onClick={() => setTab('yearly')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium ${tab === 'yearly' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><CalendarRange size={15} /> Yearly Plan</button>
    </div>
  )
  return (
    <div className="animate-fade-in">
      {tab === 'monthly' ? <ParentCalendarView tabBar={tabButtons} /> : tab === 'teacher' ? (
        <div>
          <div className="bg-surface border-b border-border px-8 py-5">
            <h2 className="font-display text-2xl font-bold text-navy">Lesson Plans</h2>
            <p className="text-[13px] text-text-secondary mt-1">Weekly teacher planning -- freeform notes for each day</p>
            {tabButtons}
          </div>
          <div className="px-8 py-6"><TeacherWeeklyPlans /></div>
        </div>
      ) : (
        <div>
          <div className="bg-surface border-b border-border px-8 py-5">
            <h2 className="font-display text-2xl font-bold text-navy">Lesson Plans</h2>
            <p className="text-[13px] text-text-secondary mt-1">Program-wide yearly curriculum planning</p>
            {tabButtons}
          </div>
          <div className="px-8 py-6"><YearlyPlanView /></div>
        </div>
      )}
    </div>
  )
}

function ParentCalendarView({ tabBar }: { tabBar: React.ReactNode }) {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Snapdragon'
  const teacherClass = currentTeacher?.english_class as EnglishClass

  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [editDate, setEditDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const DEFAULT_SUBJECTS = ['Reading', 'Phonics', 'Writing', 'Speaking', 'Language']
  interface DayContent { subjects: { label: string; content: string }[]; objective: string; notes: string }
  const emptyDay = (): DayContent => ({ subjects: DEFAULT_SUBJECTS.map(s => ({ label: s, content: '' })), objective: '', notes: '' })

  const [dayData, setDayData] = useState<Record<string, DayContent>>({})
  const [weeklyHomework, setWeeklyHomework] = useState<Record<string, string>>({}) // keyed by Monday date
  const [calEvents, setCalEvents] = useState<Record<string, { title: string; type?: string }[]>>({})

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
          DEFAULT_SUBJECTS.forEach(s => {
            if (!dd[row.date].subjects.find((sub: any) => sub.label === s)) {
              dd[row.date].subjects.push({ label: s, content: '' })
            }
          })
        } catch { dd[row.date] = emptyDay() }
      })
    }

    // Load calendar events for parent calendar
    const ce: Record<string, { title: string; type?: string }[]> = {}
    let eventsList = eventsRes.data
    if (eventsRes.error) {
      const fallbackRes = await supabase.from('calendar_events').select('date, title, type').gte('date', firstDay).lte('date', lastDay)
      eventsList = null
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
    const hwRes = await supabase.from('parent_calendar').select('date, content')
      .eq('english_class', selectedClass + '_hw').eq('grade', selectedGrade)
      .gte('date', firstDay).lte('date', lastDay)
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
    // If this day has no data, inherit labels from the nearest day that does
    if (!dayData[date] || !dayData[date].subjects.some(s => s.content.trim() || s.label !== DEFAULT_SUBJECTS[dayData[date].subjects.indexOf(s)])) {
      const filledDays = Object.entries(dayData).filter(([_, d]) => d.subjects.some(s => s.content.trim()))
      if (filledDays.length > 0) {
        // Use the labels from the closest filled day
        const closest = filledDays.reduce((best, [d]) => {
          return Math.abs(new Date(d).getTime() - new Date(date).getTime()) <
                 Math.abs(new Date(best).getTime() - new Date(date).getTime()) ? d : best
        }, filledDays[0][0])
        const templateLabels = dayData[closest].subjects.map(s => s.label)
        setDayData(prev => ({
          ...prev,
          [date]: {
            ...(prev[date] || emptyDay()),
            subjects: templateLabels.map(label => ({ label, content: prev[date]?.subjects.find(s => s.label === label)?.content || '' }))
          }
        }))
      }
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
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!editDate || !canEdit) return
    const content = dayData[editDate]
    if (!content) return
    const contentStr = JSON.stringify(content)
    if (contentStr === lastSavedRef.current) return

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      await supabase.from('parent_calendar').upsert({
        date: editDate, english_class: selectedClass, grade: selectedGrade,
        content: contentStr,
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
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
  const handlePrint = () => {
    const pw = window.open('', '_blank'); if (!pw) return
    const mn = MONTH_NAMES[month]

    let weeksHTML = ''
    weeks.forEach(week => {
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
  .header { background: #1e3a5f; color: white; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; position: relative; }
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
  .subj-label { font-weight: 700; color: #1e3a5f; }
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
    <div><h1>${selectedClass} -- ${mn} ${year}</h1><div class="sub">Grade ${selectedGrade} -- Daewoo Elementary School English Program</div></div>
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
        {tabBar}
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
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Printer size={14} /> Print Month</button>
            {canEdit && (
              <button onClick={saveAll} disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-semibold bg-gold text-navy-dark hover:bg-gold/90 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Month'}
              </button>
            )}
          </div>
        </div>
        {tabBar}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex gap-1">
            {(isAdmin ? ENGLISH_CLASSES : [teacherClass]).filter(Boolean).map(c => (
              <button key={c} onClick={() => setSelectedClass(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedClass === c ? 'text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-1">
            {GRADES.map(g => <button key={g} onClick={() => setSelectedGrade(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Grade {g}</button>)}
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
                      className={`border-r border-border last:border-r-0 min-h-[110px] p-2.5 transition-all ${
                        canEdit ? 'cursor-pointer hover:bg-blue-50/30' : ''
                      } ${isToday ? 'bg-amber-50/30 ring-2 ring-inset ring-gold/40' : 'bg-white'}`}>
                      {/* Day header */}
                      <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 pb-1 border-b ${isToday ? 'text-amber-700 border-gold/30' : 'text-slate-500 border-border/40'}`}>
                        {DAY_SHORT[di]} <span className="text-text-primary font-extrabold">{month + 1}/{day.dayNum}</span>
                        {isToday && <span className="text-gold ml-1">TODAY</span>}
                      </div>

                      {noG5 ? (
                        <div className="text-[10px] text-text-secondary italic text-center mt-4">No G5 Mondays</div>
                      ) : (
                        <>
                          {evts.map((ev, ei) => <div key={ei} className="text-[9px] font-bold text-slate-600 bg-slate-100 rounded px-1.5 py-1 mb-1">{ev.title}</div>)}
                          {data.subjects.filter(s => s.content.trim() || (hasFill && s.label.trim())).map(s => (
                            <div key={s.label} className="text-[10px] leading-snug mb-0.5">
                              <span className="font-bold text-navy">{s.label}{s.content ? ':' : ''}</span>{s.content ? ' ' : ''}
                              <span className="text-text-primary">{s.content}</span>
                            </div>
                          ))}
                          {data.objective && (
                            <div className="text-[9px] text-text-primary italic mt-1 pt-1 border-t border-border/20">
                              <span className="text-navy font-semibold">Students will</span> {data.objective}
                            </div>
                          )}
                          {!hasFill && !data.objective && evts.length === 0 && canEdit && (
                            <div className="text-[10px] text-text-tertiary/25 italic text-center mt-5">Click to edit</div>
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
                  <div key={idx} className="flex items-center gap-2 group">
                    <input
                      value={sub.label}
                      onChange={e => updateSubjectLabel(editDate, idx, e.target.value)}
                      className="text-[12px] font-bold text-navy w-[76px] text-right shrink-0 py-3 bg-transparent outline-none border-b border-transparent focus:border-navy/30 placeholder:text-navy/30"
                      placeholder="Label"
                    />
                    <input
                      value={sub.content}
                      onChange={e => updateSubject(editDate, idx, e.target.value)}
                      placeholder={sub.label ? `What are students doing in ${sub.label}?` : 'Content...'}
                      className="pcal-modal-input flex-1 px-3 py-3 text-[14px] bg-transparent border-b border-border/40 outline-none focus:border-navy transition-colors placeholder:text-text-tertiary/25"
                      autoFocus={idx === 0}
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
                      ref={el => { if (el) el.classList.add('pcal-modal-input') }}
                    />
                    {editDay.subjects.length > 1 && (
                      <button onClick={() => removeSubjectRow(editDate, idx)} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 text-red-400 hover:text-red-600 transition-opacity shrink-0" title="Remove row"><X size={14} /></button>
                    )}
                  </div>
                ))}
                {/* Add subject row */}
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => addSubjectRow(editDate)} className="ml-[76px] text-[11px] text-text-tertiary hover:text-navy font-medium px-2 py-1 rounded hover:bg-surface-alt transition-colors">+ Add row</button>
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
                  <label className="text-[11px] font-bold text-amber-700 w-[72px] text-right shrink-0">Weekly HW</label>
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

// Get Mon-Fri dates for a given week containing the target date
function getWeekDatesForPlans(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7)) // Roll back to Monday
  const dates: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

function TeacherWeeklyPlans() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass

  const formatShort = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return `${m}/${d}`
  }

  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  const todayStr = getKSTDateString()
  const [weekDates, setWeekDates] = useState<string[]>(getWeekDatesForPlans(todayStr))
  const [plans, setPlans] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    // Default to today's index in the week (0=Mon, 4=Fri)
    const d = new Date(); const dow = d.getDay()
    return dow >= 1 && dow <= 5 ? dow - 1 : 0
  })
  const [calEvents, setCalEvents] = useState<Record<string, { title: string; type?: string }>>({})

  // Load calendar events for this week
  useEffect(() => {
    if (weekDates.length < 5) return
    supabase.from('calendar_events').select('date, title, type')
      .gte('date', weekDates[0]).lte('date', weekDates[4])
      .then(({ data }) => {
        const ce: Record<string, { title: string; type?: string }> = {}
        data?.forEach((ev: any) => { ce[ev.date] = { title: ev.title, type: ev.type } })
        setCalEvents(ce)
      }).catch(() => {})
  }, [weekDates])

  const canEdit = isAdmin || currentTeacher?.english_class === selectedClass

  const weekLabel = useMemo(() => {
    const [y1, m1, d1] = weekDates[0].split('-').map(Number)
    const [y2, m2, d2] = weekDates[4].split('-').map(Number)
    const mon = new Date(y1, m1 - 1, d1)
    const fri = new Date(y2, m2 - 1, d2)
    return `${mon.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${fri.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  }, [weekDates])

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      // Load day plans + reflection (reflection stored as class + '_refl' on Monday date)
      const { data, error } = await supabase
        .from('teacher_daily_plans')
        .select('date, english_class, plan_text')
        .in('english_class', [selectedClass, selectedClass + '_refl'])
        .in('date', weekDates)

      if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
        setTableExists(false)
        setLoading(false)
        return
      }

      const map: Record<string, string> = {}
      weekDates.forEach(d => { map[d] = '' })
      data?.forEach((row: any) => {
        if (row.english_class === selectedClass + '_refl') {
          map['_reflection'] = row.plan_text || ''
        } else {
          map[row.date] = row.plan_text || ''
        }
      })
      setPlans(map)
    } catch {
      setTableExists(false)
    }
    setLoading(false)
    setHasChanges(false)
  }, [weekDates, selectedClass])

  useEffect(() => { loadPlans() }, [loadPlans])

  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // Debounced autosave -- save all plans after 3s of no edits
  const teacherAutosaveTimer = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (!hasChanges || !canEdit) return
    if (teacherAutosaveTimer.current) clearTimeout(teacherAutosaveTimer.current)
    teacherAutosaveTimer.current = setTimeout(async () => {
      let errors = 0
      for (const date of weekDates) {
        const text = plans[date] || ''
        const { error } = await supabase.from('teacher_daily_plans').upsert({
          date, english_class: selectedClass, plan_text: text,
          updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'date,english_class' })
        if (error) errors++
      }
      if (plans['_reflection'] !== undefined) {
        await supabase.from('teacher_daily_plans').upsert({
          date: weekDates[0], english_class: selectedClass + '_refl',
          plan_text: plans['_reflection'] || '',
          updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'date,english_class' })
      }
      if (errors === 0) setHasChanges(false)
    }, 3000)
    return () => { if (teacherAutosaveTimer.current) clearTimeout(teacherAutosaveTimer.current) }
  }, [plans, hasChanges, canEdit])

  const changeWeek = (delta: number) => {
    const [y, m, d] = weekDates[0].split('-').map(Number)
    const mon = new Date(y, m - 1, d + (delta * 7))
    const ds = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`
    setWeekDates(getWeekDatesForPlans(ds))
  }

  const updateDay = (date: string, text: string) => {
    setPlans(prev => ({ ...prev, [date]: text }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    let errors = 0
    // Save day plans
    for (const date of weekDates) {
      const text = plans[date] || ''
      const { error } = await supabase.from('teacher_daily_plans').upsert({
        date,
        english_class: selectedClass,
        plan_text: text,
        updated_by: currentTeacher?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class' })
      if (error) errors++
    }
    // Save reflection as a special entry using the Monday date + '_refl' suffix
    if (plans['_reflection'] !== undefined) {
      const reflDate = weekDates[0] // Monday
      const { error } = await supabase.from('teacher_daily_plans').upsert({
        date: reflDate,
        english_class: selectedClass + '_refl',
        plan_text: plans['_reflection'] || '',
        updated_by: currentTeacher?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class' })
      if (error) errors++
    }
    setSaving(false)
    setHasChanges(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : 'Week plans saved')
  }

  const handlePrint = () => {
    const printWin = window.open('', '_blank')
    if (!printWin) return
    const html = `<!DOCTYPE html><html><head><title>Teacher Plans - ${selectedClass} - ${weekLabel}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Roboto:wght@400;500&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Roboto', sans-serif; font-size: 11px; color: #1a1a1a; padding: 20px; }
      h1 { font-family: 'Lora', serif; font-size: 18px; color: #1a2744; margin-bottom: 4px; }
      .sub { font-size: 11px; color: #666; margin-bottom: 16px; }
      .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
      .day { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
      .dh { background: #1a2744; color: white; padding: 6px 10px; font-weight: 600; font-size: 11px; }
      .dd { font-weight: 400; font-size: 9px; opacity: 0.7; }
      .db { padding: 8px 10px; min-height: 200px; font-size: 10px; line-height: 1.5; white-space: pre-wrap; }
      .db strong { font-weight: 600; }
      @media print { body { padding: 10px; } .grid { gap: 4px; } }
    </style></head><body>
      <h1>${selectedClass} - Teacher Plans</h1>
      <div class="sub">${weekLabel} | Grade ${selectedGrade}</div>
      <div class="grid">${weekDates.map((date, i) => {
        const raw = plans[date] || ''
        const text = raw ? raw.replace(/</g, '&lt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') : '<span style="color:#999">(No plan)</span>'
        return `<div class="day"><div class="dh">${DAY_NAMES[i]} <span class="dd">${formatShort(date)}</span></div><div class="db">${text}</div></div>`
      }).join('')}</div>
    </body></html>`
    printWin.document.write(html)
    printWin.document.close()
    printWin.print()
  }

  if (!tableExists) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-surface border border-dashed border-border rounded-2xl">
        <ClipboardList size={36} className="mx-auto text-text-tertiary mb-3" />
        <h3 className="font-display text-lg font-semibold text-navy mb-2">Teacher Plans Setup Required</h3>
        <p className="text-[13px] text-text-secondary max-w-md mx-auto">Run the teacher_daily_plans migration in Supabase to enable this feature.</p>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          {isAdmin && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
              <div className="flex gap-1">
                {ENGLISH_CLASSES.map(c => (
                  <button key={c} onClick={() => setSelectedClass(c)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${selectedClass === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                    style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
            <div className="flex gap-1">
              {GRADES.map(g => (
                <button key={g} onClick={() => setSelectedGrade(g)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
                  Gr {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={async () => {
              const prevWeek = getWeekDatesForPlans((() => {
                const [y, m, d] = weekDates[0].split('-').map(Number)
                const prev = new Date(y, m - 1, d - 7)
                return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`
              })())
              const { data } = await supabase.from('teacher_daily_plans').select('date, plan_text').eq('english_class', selectedClass).in('date', prevWeek)
              if (!data || data.length === 0) { showToast('No plans found for last week'); return }
              const newPlans = { ...plans }
              data.forEach((row: any, idx: number) => {
                const prevDate = row.date
                const prevIdx = prevWeek.indexOf(prevDate)
                if (prevIdx >= 0 && weekDates[prevIdx]) {
                  newPlans[weekDates[prevIdx]] = row.plan_text || ''
                }
              })
              setPlans(newPlans)
              setHasChanges(true)
              showToast('Copied last week plans -- review and edit, then save')
            }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border" title="Copy plans from previous week as a starting point">
              Copy Last Week
            </button>
          )}
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
            <Printer size={14} /> Print Week
          </button>
          {canEdit && (
            <button onClick={handleSave} disabled={saving || !hasChanges}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-semibold bg-gold text-navy-dark hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Week'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={() => changeWeek(-1)} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronLeft size={20} /></button>
        <h3 className="text-lg font-display font-bold text-navy min-w-[300px] text-center">{weekLabel}</h3>
        <button onClick={() => changeWeek(1)} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronRight size={20} /></button>
        <div className="flex gap-0.5 ml-4 bg-surface-alt rounded-lg p-0.5">
          <button onClick={() => setViewMode('week')} className={`px-3 py-1 rounded-md text-[10px] font-semibold ${viewMode === 'week' ? 'bg-navy text-white' : 'text-text-tertiary hover:text-text-secondary'}`}>Week</button>
          <button onClick={() => setViewMode('day')} className={`px-3 py-1 rounded-md text-[10px] font-semibold ${viewMode === 'day' ? 'bg-navy text-white' : 'text-text-tertiary hover:text-text-secondary'}`}>Day</button>
        </div>
      </div>

      <LessonScaffoldBanner englishClass={selectedClass} grade={selectedGrade} onGradeChange={setSelectedGrade} />

      {loading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
      ) : (
        <>
          {/* Calendar events strip for the week */}
          {Object.keys(calEvents).length > 0 && (
            <div className="mb-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-start gap-2">
              <Calendar size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {weekDates.map((date, i) => {
                  const ev = calEvents[date]
                  if (!ev) return null
                  return (
                    <div key={date} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500">{DAY_SHORT[i]}</span>
                      <span className="text-[11px] font-semibold text-slate-700">{ev.title}</span>
                      {ev.type && <span className="text-[8px] text-slate-400 bg-slate-200 px-1 py-0.5 rounded">{ev.type}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' ? (
            /* Day view -- single day at full width */
            <div>
              <div className="flex gap-1 mb-3">
                {weekDates.map((date, i) => (
                  <button key={date} onClick={() => setSelectedDayIdx(i)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${selectedDayIdx === i ? 'bg-navy text-white' : date === todayStr ? 'bg-gold/10 text-navy border border-gold/30' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                    {DAY_NAMES[i]} <span className="text-[9px] ml-1 opacity-70">{formatShort(date)}</span>
                    {date === todayStr && selectedDayIdx !== i && <span className="text-[8px] ml-1">TODAY</span>}
                  </button>
                ))}
              </div>
              <div className={`bg-surface border rounded-xl overflow-hidden ${weekDates[selectedDayIdx] === todayStr ? 'border-gold ring-2 ring-gold/20' : 'border-border'}`}>
                <div className={`px-4 py-3 text-[13px] font-bold ${weekDates[selectedDayIdx] === todayStr ? 'bg-gold/10 text-navy' : 'bg-surface-alt text-text-secondary'}`}>
                  {DAY_NAMES[selectedDayIdx]} {formatShort(weekDates[selectedDayIdx])}
                  {weekDates[selectedDayIdx] === todayStr && <span className="text-[10px] font-semibold text-gold ml-2">TODAY</span>}
                </div>
                {calEvents[weekDates[selectedDayIdx]] && (
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2">
                    <AlertCircle size={13} className="text-slate-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-700">{calEvents[weekDates[selectedDayIdx]].title}</span>
                    {calEvents[weekDates[selectedDayIdx]].type && <span className="text-[9px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{calEvents[weekDates[selectedDayIdx]].type}</span>}
                  </div>
                )}
                <textarea
                  value={plans[weekDates[selectedDayIdx]] || ''}
                  onChange={e => updateDay(weekDates[selectedDayIdx], e.target.value)}
                  disabled={!canEdit}
                  placeholder={`${DAY_NAMES[selectedDayIdx]} plan...`}
                  className="w-full min-h-[400px] px-4 py-3 text-[13px] text-text-primary bg-surface resize-none outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-text-tertiary/40 leading-relaxed disabled:opacity-50"
                  spellCheck={true}
                />
              </div>
            </div>
          ) : (
            /* Week view -- 5 columns */
            <div className="grid grid-cols-5 gap-3">
              {weekDates.map((date, i) => {
                const isToday = date === todayStr
                return (
                  <div key={date} className={`bg-surface border rounded-xl overflow-hidden flex flex-col ${isToday ? 'border-gold ring-2 ring-gold/20' : 'border-border'}`}>
                    <div className={`px-3 py-2 text-[12px] font-bold flex items-center justify-between ${isToday ? 'bg-gold/10 text-navy' : 'bg-surface-alt text-text-secondary'}`}>
                      <span>
                        {DAY_NAMES[i]}
                        <span className="text-[10px] font-normal ml-1.5">{formatShort(date)}</span>
                        {isToday && <span className="text-[9px] font-semibold text-gold ml-1.5">TODAY</span>}
                      </span>
                    </div>
                    {calEvents[date] && (
                      <div className="px-2 py-1.5 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5">
                        <AlertCircle size={10} className="text-slate-600 shrink-0" />
                        <span className="text-[9px] font-semibold text-slate-700 truncate">{calEvents[date].title}</span>
                      </div>
                    )}
                    <textarea
                      value={plans[date] || ''}
                      onChange={e => updateDay(date, e.target.value)}
                      disabled={!canEdit}
                      placeholder={`${DAY_NAMES[i]} plan...`}
                      className="flex-1 min-h-[280px] px-3 py-2.5 text-[11.5px] text-text-primary bg-surface resize-none outline-none focus:ring-2 focus:ring-gold/20 placeholder:text-text-tertiary/40 leading-relaxed disabled:opacity-50"
                      spellCheck={true}
                    />
                  </div>
                )
              })}
            </div>
          )}
          {hasChanges && <div className="mt-3 text-center"><span className="text-[11px] text-amber-600 font-medium">Unsaved changes</span></div>}

          {/* Weekly Reflection */}
          <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-alt/50 border-b border-border flex items-center gap-2">
              <span className="text-[11px] font-bold text-navy">Weekly Reflection</span>
              <span className="text-[9px] text-text-tertiary">(saved with your plans)</span>
            </div>
            <textarea
              value={plans['_reflection'] || ''}
              onChange={e => { setPlans(prev => ({ ...prev, _reflection: e.target.value })); setHasChanges(true) }}
              disabled={!canEdit}
              placeholder="End-of-week reflection... What worked well? What needs adjustment? Which students need follow-up? Notes for next week."
              className="w-full min-h-[80px] px-4 py-3 text-[11.5px] text-text-primary bg-surface outline-none focus:ring-2 focus:ring-gold/20 leading-relaxed placeholder:text-text-tertiary/40 resize-none disabled:opacity-50"
            />
          </div>
        </>
      )}
    </div>
  )
}
