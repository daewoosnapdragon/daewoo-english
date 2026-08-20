'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, Printer, X, Loader2, Save, Copy } from 'lucide-react'
import LessonScaffoldBanner from './LessonScaffoldBanner'

interface SlotTemplate { id: string; day_of_week: number; slot_label: string; sort_order: number; grade?: number }
interface LessonEntry { id?: string; slot_label: string; title: string; objective: string; notes: string }
interface HomeworkEntry { id?: string; homework_text: string }
interface CalendarEvent { id: string; title: string; date: string; type: string }

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Moves a YYYY-MM-DD date string by whole days, staying in local time. */
function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

// Subjects offered when picking a day's lesson. Program names ("Into Reading",
// "Hand in Hand", "Thumbs Up", "Rich Reading", "Easy Reading",
// "Wonderskills Reading", "Super Phonics") come first since those rotate day to
// day, then general skills, then Debate/Project/Review/Test.
// TODO: move to Settings so this can be edited without a code change.
export const SUBJECT_OPTIONS = [
  'Into Reading', 'Hand in Hand', 'Thumbs Up', 'Rich Reading', 'Easy Reading',
  'Wonderskills Reading', 'Super Phonics', 'Phonics', 'Reading', 'Writing',
  'Speaking', 'Grammar', 'Vocabulary', 'Spelling', 'Listening', 'Debate',
  'Project', 'Review', 'Test',
]


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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  interface DayContent { subjects: { label: string; content: string }[]; objective: string; notes: string }
  const emptyDay = (): DayContent => ({ subjects: [{ label: '', content: '' }], objective: '', notes: '' })

  const [dayData, setDayData] = useState<Record<string, DayContent>>({})
  const [weeklyHomework, setWeeklyHomework] = useState<Record<string, string>>({}) // keyed by Monday date
  const [calEvents, setCalEvents] = useState<Record<string, { title: string; type?: string }[]>>({})
  const [printWeeks, setPrintWeeks] = useState<Set<number>>(new Set()) // selected week indices for printing; empty = all
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  // Dates that already have a stored row, so we can tell "cleared by the
  // teacher" apart from "never filled in".
  const persistedDates = useRef<Set<string>>(new Set())

  // Which week's editor is open, and which row's subject picker within it.
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  // Autosave bookkeeping (see flushDirty below).
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const dirtyDates = useRef<Set<string>>(new Set())
  const dayDataRef = useRef<Record<string, DayContent>>({})
  const saveTargetRef = useRef<{ cls: EnglishClass; grade: Grade }>({ cls: selectedClass, grade: selectedGrade })
  // Holds the latest flushDirty so timers and unmount always call the current one.
  const flushRef = useRef<() => Promise<void>>(async () => {})

  const markDirty = (date: string) => {
    dirtyDates.current.add(date)
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => { flushRef.current() }, 1200)
  }

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
    // Three months of lead-in: enough for any realistic multi-day event that
    // starts before this month but runs into it, without pulling the whole table.
    const lookbackDate = new Date(year, month - 3, 1)
    const eventLookbackStart = `${lookbackDate.getFullYear()}-${String(lookbackDate.getMonth() + 1).padStart(2, '0')}-01`

    const [planRes, eventsRes] = await Promise.all([
      supabase.from('parent_calendar').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade).gte('date', firstDay).lte('date', lastDay),
      // A multi-day event can start before this month and still cover days in
      // it, so the window is opened backwards and the overlap worked out below.
      supabase.from('calendar_events').select('date, end_date, title, type, show_on_parent_calendar, target_grades')
        .gte('date', eventLookbackStart).lte('date', lastDay),
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
    let eventsList: any[] | null = eventsRes.data
    if (eventsRes.error) {
      // Older databases lack end_date / parent-calendar columns.
      const fallbackRes = await supabase.from('calendar_events').select('date, title, type').gte('date', firstDay).lte('date', lastDay)
      eventsList = fallbackRes.data || null
    }
    if (eventsList) {
      eventsList.forEach((ev: any) => {
        if (!ev.show_on_parent_calendar) return
        const tg = ev.target_grades as number[] | null
        const gradeMatch = !tg || tg.length === 0 || tg.includes(selectedGrade)
        if (!gradeMatch) return
        // A multi-day event belongs on every day it covers, not just its first,
        // clipped to the month being shown.
        const start = ev.date > firstDay ? ev.date : firstDay
        const end = (ev.end_date && ev.end_date > ev.date) ? ev.end_date : ev.date
        const lastShown = end < lastDay ? end : lastDay
        for (let d = start; d <= lastShown; d = shiftDate(d, 1)) {
          if (!ce[d]) ce[d] = []
          ce[d].push({ title: ev.title, type: ev.type })
        }
      })
    }
    setCalEvents(ce)
    setDayData(dd)
    // Remember which days already have a stored row, so clearing one still
    // saves while a never-saved template-only day stays out of the database.
    persistedDates.current = new Set(Object.keys(dd))

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
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects]; d.subjects[idx] = { ...d.subjects[idx], content }
      return { ...prev, [date]: d }
    })
  }
  const updateSubjectLabel = (date: string, idx: number, label: string) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects]; d.subjects[idx] = { ...d.subjects[idx], label }
      return { ...prev, [date]: d }
    })
  }
  const addSubjectRow = (date: string) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects, { label: '', content: '' }]
      return { ...prev, [date]: d }
    })
  }
  const removeSubjectRow = (date: string, idx: number) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = d.subjects.filter((_, i) => i !== idx)
      if (d.subjects.length === 0) d.subjects = [{ label: '', content: '' }]
      return { ...prev, [date]: d }
    })
  }
  // A day is "untouched" if nothing has actually been written into it, so we
  // never create a row for a day that was merely opened.
  const isDayEmpty = (c: DayContent) =>
    !c.objective?.trim() && !c.notes?.trim() &&
    c.subjects.every(s => !s.content?.trim())

  const updateField = (date: string, field: 'objective' | 'notes', value: string) => {
    markDirty(date)
    setDayData(prev => ({ ...prev, [date]: { ...(prev[date] || emptyDay()), [field]: value } }))
  }
  const updateHomework = (mondayDate: string, value: string) => {
    setWeeklyHomework(prev => ({ ...prev, [mondayDate]: value }))
  }

  /**
   * Copies the previous week's plan into this one, day for day. Queries rather
   * than reading dayData so it still works on the first week of a month, where
   * the source week belongs to the month that isn't loaded.
   *
   * Deliberately non-destructive: days that already have content are left
   * alone, so this can never overwrite something already written.
   */
  const [copyingWeek, setCopyingWeek] = useState<string | null>(null)
  const copyLastWeek = async (weekMonday: string) => {
    if (!canEdit || !weekMonday) return
    setCopyingWeek(weekMonday)
    const prevMonday = shiftDate(weekMonday, -7)
    const { data, error } = await supabase.from('parent_calendar')
      .select('date, content')
      .eq('english_class', selectedClass).eq('grade', selectedGrade)
      .gte('date', prevMonday).lte('date', shiftDate(prevMonday, 4))
    if (error) { showToast(`Error: ${error.message}`); setCopyingWeek(null); return }

    const source: Record<number, DayContent> = {}
    ;(data || []).forEach((row: any) => {
      try {
        const parsed = typeof row.content === 'string' ? JSON.parse(row.content) : row.content
        const offset = Math.round((new Date(row.date).getTime() - new Date(prevMonday).getTime()) / 86400000)
        if (offset >= 0 && offset <= 4) source[offset] = { ...emptyDay(), ...parsed }
      } catch { /* skip unparseable rows */ }
    })

    const validDates = new Set(monthDays.map(d => d.date))
    const updates: Record<string, DayContent> = {}
    let copied = 0, skipped = 0
    for (let offset = 0; offset <= 4; offset++) {
      const src = source[offset]
      if (!src || isDayEmpty(src)) continue
      if (offset === 0 && selectedGrade === 5) continue // no Grade 5 on Mondays
      const target = shiftDate(weekMonday, offset)
      if (!validDates.has(target)) continue
      const existing = dayData[target]
      if (existing && !isDayEmpty(existing)) { skipped++; continue }
      updates[target] = { subjects: src.subjects.map(s => ({ ...s })), objective: src.objective, notes: src.notes }
      copied++
    }

    if (copied === 0) {
      showToast(skipped > 0 ? 'This week already has content — nothing copied' : 'Last week is empty — nothing to copy')
      setCopyingWeek(null)
      return
    }

    setDayData(prev => ({ ...prev, ...updates }))
    for (const [date, content] of Object.entries(updates)) {
      const { error: upErr } = await supabase.from('parent_calendar').upsert({
        date, english_class: selectedClass, grade: selectedGrade,
        content: JSON.stringify(content),
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class,grade' })
      if (!upErr) persistedDates.current.add(date)
    }
    setCopyingWeek(null)
    showToast(`Copied ${copied} day${copied > 1 ? 's' : ''} from last week${skipped > 0 ? ` (${skipped} already had content)` : ''}`)
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

  // ─── Autosave ──────────────────────────────────────────────────────────
  // The week editor lets several days be edited without anything closing, so
  // edits are collected in a dirty set and flushed together. Class and grade
  // are snapshotted when the flush is scheduled, so a switch mid-timer cannot
  // write one class's plan onto another's.
  const flushDirty = useCallback(async () => {
    if (autosaveTimer.current) { clearTimeout(autosaveTimer.current); autosaveTimer.current = null }
    const dates = Array.from(dirtyDates.current)
    if (dates.length === 0) return
    dirtyDates.current.clear()
    const cls = saveTargetRef.current.cls
    const grd = saveTargetRef.current.grade
    for (const date of dates) {
      const content = dayDataRef.current[date]
      if (!content) continue
      // Never create a row for a day that holds nothing; days that already
      // exist still save when emptied, so clearing one persists.
      if (isDayEmpty(content) && !persistedDates.current.has(date)) continue
      const { error } = await supabase.from('parent_calendar').upsert({
        date, english_class: cls, grade: grd,
        content: JSON.stringify(content),
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'date,english_class,grade' })
      if (!error) persistedDates.current.add(date)
    }
  }, [currentTeacher?.id])

  useEffect(() => { flushRef.current = flushDirty }, [flushDirty])
  useEffect(() => { dayDataRef.current = dayData }, [dayData])
  useEffect(() => { saveTargetRef.current = { cls: selectedClass, grade: selectedGrade } }, [selectedClass, selectedGrade])

  // Flush on unmount so edits are never stranded by navigating away.
  useEffect(() => () => { flushRef.current() }, [])

  // Enter/arrows move down the week's fields, so a whole week can be filled in
  // without reaching for the mouse.
  const fieldNav = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && !(e.key === 'Enter' && !e.shiftKey)) return
    e.preventDefault()
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>('.lp-field'))
    const cur = fields.indexOf(e.currentTarget)
    if (cur < 0) return
    const next = e.key === 'ArrowUp' ? cur - 1 : cur + 1
    if (next >= 0 && next < fields.length) fields[next].focus()
  }

  // Open a day's week for editing. Switching weeks flushes pending edits first
  // so nothing is left unsaved behind a collapsed panel.
  const openDayWeek = async (weekIdx: number) => {
    if (!canEdit) return
    setOpenPicker(null)
    if (openWeek === weekIdx) { await flushDirty(); setOpenWeek(null); return }
    await flushDirty()
    setOpenWeek(weekIdx)
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
          // Only rows the teacher actually wrote in. A labelled-but-empty row
          // would otherwise print as a bare subject name on the parent copy.
          data.subjects.forEach(s => {
            if (!s.content.trim()) return
            // Colon belongs to the label; without one, print the text alone
            // rather than a stray leading ":".
            const lbl = s.label.trim()
            inner += `<div class="subj">${lbl ? `<span class="subj-label">${lbl}:</span> ` : ''}${s.content}</div>`
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
              <button key={c} onClick={async () => { if (c !== selectedClass) { await flushDirty(); setOpenWeek(null); setOpenPicker(null); setDayData({}); setWeeklyHomework({}); setSelectedClass(c) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedClass === c ? 'text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-1">
            {GRADES.map(g => <button key={g} onClick={async () => { if (g !== selectedGrade) { await flushDirty(); setOpenWeek(null); setOpenPicker(null); setDayData({}); setWeeklyHomework({}); setSelectedGrade(g) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Grade {g}</button>)}
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
                      onClick={() => openDayWeek(wi)}
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
                          {/* Only rows with content. A labelled-but-empty row must never
                              show here or in print -- this is the parent-facing calendar. */}
                          {data.subjects.filter(s => s.content.trim()).map((s, si) => (
                            <div key={si} className="text-[11px] leading-snug mb-1">
                              {s.label.trim() && <><span className="font-bold text-navy">{s.label}:</span>{' '}</>}
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

                {/* ─── Inline week editor ─── */}
                {openWeek === wi && canEdit && (
                  <div className="border-b border-border bg-surface-alt/50 px-5 py-4 animate-fade-in">
                    {fw.map((day, di) => {
                      if (!day) return null
                      if (di === 0 && selectedGrade === 5) return null // no Grade 5 Mondays
                      const data = dayData[day.date] || emptyDay()
                      return (
                        <div key={day.date} className="grid grid-cols-[64px_1fr] gap-3 items-start py-2.5 border-b border-border/40 last:border-b-0">
                          <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold pt-2.5">
                            {DAY_SHORT[di]}
                            <span className="block text-[12px] text-text-primary font-bold">{month + 1}/{day.dayNum}</span>
                          </div>
                          <div className="min-w-0 space-y-2">
                            {data.subjects.map((sub, si) => {
                              const pickerKey = `${day.date}-${si}`
                              return (
                                <div key={si}>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => setOpenPicker(openPicker === pickerKey ? null : pickerKey)}
                                      className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                                        sub.label
                                          ? 'bg-accent-light text-navy border border-accent-light hover:border-navy'
                                          : 'border border-dashed border-border text-text-tertiary hover:border-navy hover:text-navy'
                                      }`}>
                                      {sub.label || '+ Subject'}
                                    </button>
                                    <input
                                      value={sub.content}
                                      onChange={e => updateSubject(day.date, si, e.target.value)}
                                      placeholder={sub.label ? `What are students doing in ${sub.label}?` : 'Pick a subject, then say what students are doing'}
                                      className="lp-field flex-1 min-w-0 text-[13.5px] bg-transparent border-b border-border/60 outline-none focus:border-navy py-1.5 placeholder:text-text-tertiary/40"
                                      onKeyDown={fieldNav}
                                    />
                                    {data.subjects.length > 1 && (
                                      <button onClick={() => removeSubjectRow(day.date, si)}
                                        title="Remove this subject"
                                        className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors"><X size={13} /></button>
                                    )}
                                  </div>
                                  {openPicker === pickerKey && (
                                    <div className="mt-2 p-3 bg-surface border border-border rounded-xl">
                                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
                                        Subject for {DAY_SHORT[di]} {month + 1}/{day.dayNum}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {SUBJECT_OPTIONS.map(s => (
                                          <button key={s}
                                            onClick={() => { updateSubjectLabel(day.date, si, s); setOpenPicker(null) }}
                                            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                                              sub.label === s
                                                ? 'bg-navy text-white border-navy'
                                                : 'bg-surface text-text-secondary border-border hover:border-navy hover:text-navy'
                                            }`}>{s}</button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                            <div className="flex items-center gap-3">
                              <input
                                value={data.objective}
                                onChange={e => updateField(day.date, 'objective', e.target.value)}
                                placeholder="Students will…"
                                className="lp-field flex-1 min-w-0 text-[12px] italic bg-transparent border-b border-border/40 outline-none focus:border-navy py-1 placeholder:text-text-tertiary/35"
                                onKeyDown={fieldNav}
                              />
                              <button onClick={() => addSubjectRow(day.date)}
                                className="shrink-0 text-[11px] text-text-tertiary hover:text-navy font-medium px-2 py-1 rounded hover:bg-surface transition-colors">
                                + Another subject
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-between gap-3 pt-3 mt-1">
                      <span className="text-[11px] text-text-tertiary">Saves as you type. Homework below covers the whole week.</span>
                      <button onClick={async () => { await flushDirty(); setOpenWeek(null); setOpenPicker(null) }}
                        className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold bg-navy text-white hover:bg-navy-dark transition-colors">
                        Done
                      </button>
                    </div>
                  </div>
                )}

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
                    {canEdit && weekMonday && (
                      <button
                        onClick={() => copyLastWeek(weekMonday)}
                        disabled={copyingWeek === weekMonday}
                        title="Fill this week's empty days from last week. Days that already have content are left untouched."
                        className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-text-secondary hover:text-navy px-2 py-0.5 rounded hover:bg-surface-alt transition-colors disabled:opacity-50"
                      >
                        {copyingWeek === weekMonday
                          ? <><Loader2 size={10} className="animate-spin" /> Copying...</>
                          : <><Copy size={10} /> Copy last week</>}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

