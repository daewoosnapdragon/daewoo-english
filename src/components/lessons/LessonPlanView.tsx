'use client'

import { logActivity } from '@/lib/activity'
import { useScheduleRules, WEEKDAY_LABELS } from '@/lib/scheduleRules'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, ChevronDown, Printer, X, Loader2, Save, Copy } from 'lucide-react'
import { classDays, isEmptyDay as isEmptyPlan, planMoves, pushPlan, type PlanDay, type PlanMove } from '@/lib/lessonSync'
import { fetchFixedDays, fetchPlanDays, saveDays } from '@/lib/lessonSyncData'
import { HALVES, academicYears, termDates } from '@/lib/curriculumPacing'
import { loadAwayDays } from '@/lib/calendarDays'
import { addObjective, booksForLabel, copiedRow, escapeHtml, linkedRow, withContent, type UnitMatch } from '@/lib/planLinks'
import { useClassBooks } from './useClassBooks'
import { UnitInput } from './UnitInput'
import { UnitLine } from './UnitDetail'

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

/**
 * Writes days only if nobody changed them since this page loaded them: before
 * the upsert each day's updated_at is read again and compared with the one
 * remembered at load (or at our own last write). A day changed elsewhere (a
 * Push, another tab, the board's week view) is left alone and reported, so a
 * stale screen can never put old plans back. `stamps` is keyed class|grade|date.
 */
type Stamps = Record<string, string | null>
const fmtShortDate = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
async function writeDays(cls: string, grade: number, entries: [string, unknown][], teacherId: string | undefined, stamps: Stamps): Promise<{ saved: string[]; conflicts: string[]; errors: number }> {
  if (!entries.length) return { saved: [], conflicts: [], errors: 0 }
  const key = (d: string) => `${cls}|${grade}|${d}`
  const { data, error } = await supabase.from('parent_calendar').select('date, updated_at').eq('english_class', cls).eq('grade', grade).in('date', entries.map(e => e[0]))
  if (error) return { saved: [], conflicts: [], errors: entries.length }
  const now = new Map(((data || []) as { date: string; updated_at: string | null }[]).map(r => [r.date, r.updated_at || null]))
  const conflicts: string[] = [], ok: [string, unknown][] = []
  for (const [d, c] of entries) {
    const cur = now.has(d) ? now.get(d)! : null
    const seen = key(d) in stamps ? stamps[key(d)] : null
    if (now.has(d) && cur !== seen) conflicts.push(d); else ok.push([d, c])
  }
  if (!ok.length) return { saved: [], conflicts, errors: 0 }
  const at = new Date().toISOString()
  const res = await supabase.from('parent_calendar').upsert(ok.map(([date, content]) => ({ date, english_class: cls, grade, content: JSON.stringify(content), updated_by: teacherId, updated_at: at })), { onConflict: 'date,english_class,grade' }).select('date, updated_at')
  if (res.error) return { saved: [], conflicts, errors: ok.length }
  for (const r of (res.data || []) as { date: string; updated_at: string | null }[]) stamps[key(r.date)] = r.updated_at || null
  return { saved: ok.map(e => e[0]), conflicts, errors: 0 }
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

// A teacher can also write in a subject the list doesn't cover. Write-ins are
// remembered in this browser so they come back as chips next time, and any
// label found in a saved plan is folded into the same list -- so a subject a
// colleague wrote in shows up here too once their month is opened.
const CUSTOM_SUBJECTS_KEY = 'daewoo_lesson_custom_subjects'

function readCustomSubjects(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_SUBJECTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((s: any) => typeof s === 'string' && s.trim()) : []
  } catch { return [] }
}

/**
 * The spelling already in use for this subject, matched case-insensitively, so
 * "into reading" typed by hand doesn't become a second chip beside the real one.
 */
function canonicalSubject(label: string, custom: string[]): string {
  const t = label.trim()
  return [...SUBJECT_OPTIONS, ...custom].find(s => s.toLowerCase() === t.toLowerCase()) || t
}


export default function LessonPlanView() {
  return (
    <div className="animate-fade-in">
      <ParentCalendarView />
    </div>
  )
}

function ParentCalendarView() {
  const { currentTeacher, showToast, language, confirmDialog, semesters } = useApp()
  const lang = language
  const { isNoClassDay } = useScheduleRules()
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

  // A subject row may name the board unit (and lesson) it is about; see lib/lessonSync.ts.
  interface DayContent { subjects: { label: string; content: string; unit_id?: string; lesson_id?: string; placement_id?: string }[]; objective: string; notes: string }
  const emptyDay = (): DayContent => ({ subjects: [{ label: '', content: '' }], objective: '', notes: '' })

  const [dayData, setDayData] = useState<Record<string, DayContent>>({})
  const monthFirst = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthLast = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`
  // The class and grade's books this month: typing a unit's name in a row offers it, and picking it links the row.
  const { books: classBooks, unitName } = useClassBooks(selectedClass, selectedGrade, monthFirst, monthLast)
  // The class's books first in the subject list, then the usual subjects.
  const subjectChoices = useMemo(() => Array.from(new Set([...classBooks.map(b => b.label), ...SUBJECT_OPTIONS])), [classBooks])
  const [weeklyHomework, setWeeklyHomework] = useState<Record<string, string>>({}) // keyed by Monday date
  const [calEvents, setCalEvents] = useState<Record<string, { title: string; type?: string }[]>>({})
  // Days the school calendar takes over: a day off blocks the cell outright
  // (no lesson can be planned on Chuseok); a midterm or testing day is tinted
  // and stays editable, since review and test administration are planned.
  const [blockedDays, setBlockedDays] = useState<Record<string, { title: string; kind: 'off' | 'exam' }>>({})
  const [printWeeks, setPrintWeeks] = useState<Set<number>>(new Set()) // selected week indices for printing; empty = all
  const [showPrintOptions, setShowPrintOptions] = useState(false)
  const [printAllGrades, setPrintAllGrades] = useState(false) // print every grade of the class in one document
  const [printingAll, setPrintingAll] = useState(false)
  // Dates that already have a stored row, so we can tell "cleared by the
  // teacher" apart from "never filled in".
  const persistedDates = useRef<Set<string>>(new Set())
  // Each day's updated_at as this page last saw it, so a stale screen can't overwrite newer plans (see writeDays).
  const stampsRef = useRef<Stamps>({})
  const conflictToast = (dates: string[]) => {
    if (!dates.length) return
    const list = dates.slice(0, 3).map(d => fmtShortDate(d)).join(', ') + (dates.length > 3 ? ` and ${dates.length - 3} more` : '')
    showToast(`Not saved: ${list} changed somewhere else since this page loaded (another tab, a move a day, or the board). Copy anything you typed, then reload the month.`)
  }

  // Which week's editor is open, and which row's subject picker within it.
  const [openWeek, setOpenWeek] = useState<number | null>(null)
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  // Write-in subjects, and the text being typed into the open picker's box.
  const [customSubjects, setCustomSubjects] = useState<string[]>(readCustomSubjects)
  const [customDraft, setCustomDraft] = useState('')
  useEffect(() => {
    try { localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(customSubjects)) } catch { /* private mode */ }
  }, [customSubjects])

  /** Adds labels to the write-in list, ignoring blanks and ones already offered. */
  const rememberSubjects = useCallback((labels: string[]) => {
    setCustomSubjects(prev => {
      const known = new Set([...SUBJECT_OPTIONS, ...prev].map(s => s.toLowerCase()))
      const added: string[] = []
      labels.forEach(raw => {
        const label = (raw || '').trim()
        if (!label || known.has(label.toLowerCase())) return
        known.add(label.toLowerCase())
        added.push(label)
      })
      return added.length ? [...prev, ...added] : prev
    })
  }, [])
  const forgetSubject = (label: string) =>
    setCustomSubjects(prev => prev.filter(s => s !== label))

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

  // One class and grade's month: its plans, the calendar events shown on it,
  // the days the calendar takes over, and each week's homework. The page
  // loads the grade on screen with it; printing every grade loads all five.
  const fetchMonth = useCallback(async (selectedClass: EnglishClass, selectedGrade: Grade) => {
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`
    // Three months of lead-in: enough for any realistic multi-day event that
    // starts before this month but runs into it, without pulling the whole table.
    const lookbackDate = new Date(year, month - 3, 1)
    const eventLookbackStart = `${lookbackDate.getFullYear()}-${String(lookbackDate.getMonth() + 1).padStart(2, '0')}-01`

    const [planRes, eventsRes] = await Promise.all([
      supabase.from('parent_calendar').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade).gte('date', firstDay).lte('date', lastDay),
      // A multi-day event can start before this month and still cover days in
      // it, so the window is opened backward and the overlap worked out below.
      supabase.from('calendar_events').select('date, end_date, title, type, show_on_parent_calendar, target_grades')
        .gte('date', eventLookbackStart).lte('date', lastDay),
    ])

    const dd: Record<string, DayContent> = {}
    const stamps: Stamps = {}

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
      planRes.data.forEach((row: any) => { stamps[`${selectedClass}|${selectedGrade}|${row.date}`] = row.updated_at || null })
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
    const bd: Record<string, { title: string; kind: 'off' | 'exam' }> = {}
    if (eventsList) {
      eventsList.forEach((ev: any) => {
        const tg = ev.target_grades as number[] | null
        const gradeMatch = !tg || tg.length === 0 || tg.includes(selectedGrade)
        if (!gradeMatch) return
        // Days off and field trips take the day whatever the calendar box says:
        // there is no class. A midterm or testing day only tints (and names
        // itself) when it is marked for the parent calendar, so a teacher
        // deadline like "midterm grades due" stays off the printed plan.
        const blockKind: 'off' | 'exam' | null = (ev.type === 'day_off' || ev.type === 'field_trip') ? 'off' : ((ev.type === 'midterm' || ev.type === 'testing') && ev.show_on_parent_calendar) ? 'exam' : null
        if (!ev.show_on_parent_calendar && !blockKind) return
        // A multi-day event belongs on every day it covers, not just its first,
        // clipped to the month being shown.
        const start = ev.date > firstDay ? ev.date : firstDay
        const end = (ev.end_date && ev.end_date > ev.date) ? ev.end_date : ev.date
        const lastShown = end < lastDay ? end : lastDay
        for (let d = start; d <= lastShown; d = shiftDate(d, 1)) {
          if (ev.show_on_parent_calendar) { if (!ce[d]) ce[d] = []; ce[d].push({ title: ev.title, type: ev.type }) }
          // A day off outranks an exam on the same day.
          if (blockKind && (!bd[d] || blockKind === 'off')) bd[d] = { title: ev.title, kind: blockKind }
        }
      })
    }

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
    return { dd, ce, bd, hw, stamps }
  }, [year, month])

  // Each load gets a number; a slower, older load that lands after a newer one is dropped.
  const loadToken = useRef(0)
  const loadData = useCallback(async () => {
    const token = ++loadToken.current
    setLoading(true)
    const { dd, ce, bd, hw, stamps } = await fetchMonth(selectedClass, selectedGrade)
    if (token !== loadToken.current) return
    Object.assign(stampsRef.current, stamps)
    setCalEvents(ce)
    setBlockedDays(bd)
    setDayData(dd)
    // Fold write-ins already saved in this month back into the chip list.
    rememberSubjects(Object.values(dd).flatMap(d => d.subjects.map(s => s.label)))
    // Remember which days already have a stored row, so clearing one still
    // saves while a never-saved template-only day stays out of the database.
    persistedDates.current = new Set(Object.keys(dd))
    setWeeklyHomework(hw)
    setLoading(false)
  }, [fetchMonth, selectedClass, selectedGrade, rememberSubjects])

  useEffect(() => { loadData() }, [loadData])

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const updateSubject = (date: string, idx: number, content: string) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      // The link stays only while the words still name the unit.
      const cur = d.subjects[idx] || { label: '', content: '' }
      d.subjects = [...d.subjects]; d.subjects[idx] = withContent(cur, content, cur.unit_id ? unitName(cur.unit_id) : undefined)
      return { ...prev, [date]: d }
    })
  }
  const updateSubjectLabel = (date: string, idx: number, label: string) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      const cur = d.subjects[idx] || { label: '', content: '' }
      if (cur.label === label) return prev
      // Another subject is not about the unit the row named, so the link goes.
      d.subjects = [...d.subjects]; d.subjects[idx] = { label, content: cur.content }
      return { ...prev, [date]: d }
    })
  }
  const changeRow = (date: string, idx: number, change: (row: DayContent['subjects'][number]) => DayContent['subjects'][number]) => {
    markDirty(date)
    setDayData(prev => {
      const d = { ...(prev[date] || emptyDay()) }
      d.subjects = [...d.subjects]; d.subjects[idx] = change(d.subjects[idx] || { label: '', content: '' })
      return { ...prev, [date]: d }
    })
  }
  /** Links a row to the unit picked from the suggestions: the book becomes the subject, the words name the unit. */
  const linkUnit = (date: string, idx: number, m: UnitMatch) => { rememberSubjects([m.book.label]); changeRow(date, idx, row => linkedRow(row, m.book, m.unit)) }
  /** Which lesson of the unit a row is about. Only the teacher sees it; it is never printed. */
  const setRowLesson = (date: string, idx: number, lessonId: string | null) => changeRow(date, idx, row => { const { lesson_id: _l, ...rest } = row; return lessonId ? { ...rest, lesson_id: lessonId } : rest })
  /** The row is not about that unit after all: the words stay, the link goes. */
  const unlinkRow = (date: string, idx: number) => changeRow(date, idx, row => ({ label: row.label, content: row.content }))
  /** Applies whatever is typed in the picker's write-in box to this row. */
  const applyCustomSubject = (date: string, idx: number) => {
    const label = canonicalSubject(customDraft, customSubjects)
    if (!label) return
    rememberSubjects([label])
    updateSubjectLabel(date, idx, label)
    setCustomDraft('')
    setOpenPicker(null)
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
    await flushDirty()   // so an edit to last week from a moment ago is copied too
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
      if (isNoClassDay(selectedGrade, offset + 1)) continue // no class for this grade that weekday
      const target = shiftDate(weekMonday, offset)
      if (!validDates.has(target)) continue
      const existing = dayData[target]
      if (existing && !isDayEmpty(existing)) { skipped++; continue }
      // The words and the unit come along; the lesson does not, since this week is usually another one.
      updates[target] = { subjects: src.subjects.map(copiedRow), objective: src.objective, notes: src.notes }
      copied++
    }

    if (copied === 0) {
      showToast(skipped > 0 ? 'This week already has content — nothing copied' : 'Last week is empty — nothing to copy')
      setCopyingWeek(null)
      return
    }

    const w = await writeDays(selectedClass, selectedGrade, Object.entries(updates), currentTeacher?.id, stampsRef.current)
    w.saved.forEach(d => persistedDates.current.add(d))
    // Only what was really saved goes on screen.
    setDayData(prev => { const next = { ...prev }; w.saved.forEach(d => { next[d] = updates[d] }); return next })
    setCopyingWeek(null)
    if (w.conflicts.length) conflictToast(w.conflicts)
    else if (w.errors) showToast(`Could not save ${w.errors} day${w.errors > 1 ? 's' : ''}. Try again.`)
    else showToast(`Copied ${w.saved.length} day${w.saved.length !== 1 ? 's' : ''} from last week${skipped > 0 ? ` (${skipped} already had content)` : ''}`)
    if (w.saved.length) logActivity('saved', `Lesson plans · ${selectedClass} · Grade ${selectedGrade}: copied last week into ${weekMonday}`, { key: `lessons|${selectedClass}|${selectedGrade}` })
  }

  /**
   * Push: this day's plan and every later one move one class day on, skipping
   * days off, trips and the grade's no-class days, so a field trip or a sick
   * day does not mean retyping the month. Pull back does the reverse into an
   * empty day. The board follows, since it reads the plans. Homework stays
   * with its week.
   */
  const [shifting, setShifting] = useState<string | null>(null)
  // A Push or Pull is worked out first and shown as a preview (every day and
  // where it goes, for this grade or all five); nothing is written until the
  // teacher presses Push. Afterwards a bar offers Undo, which puts every
  // changed day back as it was, unless it was edited again since.
  interface GradeShift { grade: Grade; changes: Record<string, PlanDay>; before: Record<string, PlanDay>; moves: PlanMove[]; error: string | null }
  interface ShiftPlan { date: string; dir: 1 | -1; to: string; all: boolean; grades: GradeShift[] }
  const [shiftPlan, setShiftPlan] = useState<ShiftPlan | null>(null)
  const [undo, setUndo] = useState<{ text: string; cls: EnglishClass; grades: { grade: Grade; before: Record<string, PlanDay>; after: Record<string, PlanDay> }[] } | null>(null)
  // While a Push, Pull or Copy is being worked out, previewed or written, the class, grade and month stay put, so it lands on the right page.
  const busyWriting = !!shifting || !!copyingWeek || !!shiftPlan

  const prepareShift = async (date: string, dir: 1 | -1, all: boolean) => {
    if (!canEdit) return
    // Only today on can be pulled into; plans never slide into the past.
    if (dir === -1 && date < todayStr) { showToast('Moving a day earlier works from today on, so no plan moves into a day that has passed.'); return }
    // Plans move only within the term the day is in: never across a break into the next term.
    const term = academicYears(semesters).flatMap(y => HALVES.map(h => termDates(semesters, y, h))).find(t => t.start && t.end && date >= t.start && date <= t.end)
    if (!term?.end) { showToast('This day is outside the terms in Settings, so nothing moves.'); return }
    setShifting(date)
    try {
      await flushDirty()
      const to = term.end
      const grades = await Promise.all((all ? GRADES : [selectedGrade]).map(async (g): Promise<GradeShift> => {
        const [{ days, error }, away, fixed] = await Promise.all([fetchPlanDays(selectedClass, g, date, to), loadAwayDays(date, to, g), fetchFixedDays(date, to, g)])
        if (error) return { grade: g, changes: {}, before: {}, moves: [], error }
        // Exam days keep their plans: nothing slides onto them or off them.
        const timeline = classDays(date, to, new Set([...away.map(a => a.date), ...Array.from(fixed).filter(d => d !== date)]), wd => isNoClassDay(g, wd))
        const r = pushPlan(timeline, days, dir)
        const before: Record<string, PlanDay> = {}
        Object.keys(r.changes).forEach(d => { before[d] = days[d] || { subjects: [], objective: '', notes: '' } })
        return { grade: g, changes: r.changes, before, moves: r.error ? [] : planMoves(timeline, days, dir), error: r.error }
      }))
      if (!all && grades[0].error) { showToast(grades[0].error); return }
      setShiftPlan({ date, dir, to, all, grades })
    } finally { setShifting(null) }
  }
  const shiftFrom = (date: string, dir: 1 | -1) => prepareShift(date, dir, false)
  const applyShift = async () => {
    const plan = shiftPlan
    if (!plan) return
    setShifting(plan.date)
    try {
      const done: { grade: Grade; before: Record<string, PlanDay>; after: Record<string, PlanDay> }[] = []
      for (const g of plan.grades) {
        if (g.error || !Object.keys(g.changes).length) continue
        const e = await saveDays(selectedClass, g.grade, g.changes, currentTeacher?.id || null, `${plan.dir === 1 ? 'pushed' : 'pulled back'} a class day from ${plan.date}`)
        if (e) { showToast(`Grade ${g.grade}: ${e}`); continue }
        done.push({ grade: g.grade, before: g.before, after: g.changes })
      }
      setShiftPlan(null)
      const moved = plan.grades.reduce((a, g) => a + (done.some(d => d.grade === g.grade) ? g.moves.length : 0), 0)
      if (done.length) setUndo({ cls: selectedClass, grades: done, text: `${moved} planned day${moved === 1 ? '' : 's'} moved ${plan.dir === 1 ? 'a class day later' : 'a class day earlier'} from ${fmtShort(plan.date)}${done.length > 1 ? ` in ${done.length} grades` : ''}.` })
      await loadData()
    } finally { setShifting(null) }
  }
  /** Puts every day a Push or Pull changed back, except days edited again since (those are named and left alone). */
  const undoShift = async () => {
    const u = undo
    if (!u) return
    setShifting('undo')
    try {
      const kept: string[] = []
      for (const g of u.grades) {
        const dates = Object.keys(g.before)
        const { days } = await fetchPlanDays(u.cls, g.grade, dates[0], dates[dates.length - 1])
        const same = (a?: PlanDay, b?: PlanDay) => JSON.stringify(a || { subjects: [], objective: '', notes: '' }) === JSON.stringify(b || { subjects: [], objective: '', notes: '' })
        const back: Record<string, PlanDay> = {}
        for (const d of dates) { if (same(days[d], g.after[d]) || (isEmptyPlan(days[d]) && isEmptyPlan(g.after[d]))) back[d] = g.before[d]; else kept.push(`G${g.grade} ${fmtShort(d)}`) }
        const e = await saveDays(u.cls, g.grade, back, currentTeacher?.id || null, 'undid a push or pull')
        if (e) showToast(`Grade ${g.grade}: ${e}`)
      }
      setUndo(null)
      await loadData()
      showToast(kept.length ? `Undone, except ${kept.slice(0, 4).join(', ')}${kept.length > 4 ? ` and ${kept.length - 4} more` : ''}, edited since` : 'Undone: the plans are back where they were')
    } finally { setShifting(null) }
  }

  // Save all days in the month + all weekly homework
  const saveAll = async () => {
    setSaving(true)
    // Pending edits first, then every day of the month, skipping any changed elsewhere since load.
    await flushDirty()
    const w = await writeDays(selectedClass, selectedGrade, monthDays.map(d => d.date).filter(d => dayData[d]).map(d => [d, dayData[d]] as [string, unknown]), currentTeacher?.id, stampsRef.current)
    w.saved.forEach(d => persistedDates.current.add(d))
    let errors = w.errors
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
    if (w.conflicts.length) conflictToast(w.conflicts)
    else showToast(errors > 0 ? `Saved with ${errors} error(s)` : 'Month saved')
    logActivity('saved', `Lesson plans · ${selectedClass} · Grade ${selectedGrade}`, { key: `lessons|${selectedClass}|${selectedGrade}` })
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
    const entries: [string, unknown][] = []
    for (const date of dates) {
      const content = dayDataRef.current[date]
      if (!content) continue
      // Never create a row for a day that holds nothing; days that already
      // exist still save when emptied, so clearing one persists.
      if (isDayEmpty(content) && !persistedDates.current.has(date)) continue
      entries.push([date, content])
    }
    const w = await writeDays(cls, grd, entries, currentTeacher?.id, stampsRef.current)
    w.saved.forEach(d => persistedDates.current.add(d))
    if (w.conflicts.length) conflictToastRef.current(w.conflicts)
  }, [currentTeacher?.id])

  useEffect(() => { flushRef.current = flushDirty }, [flushDirty])
  const conflictToastRef = useRef(conflictToast)
  useEffect(() => { conflictToastRef.current = conflictToast })
  useEffect(() => { dayDataRef.current = dayData }, [dayData])
  useEffect(() => { saveTargetRef.current = { cls: selectedClass, grade: selectedGrade } }, [selectedClass, selectedGrade])

  // Flush on unmount so edits are never stranded by navigating away.
  useEffect(() => () => { flushRef.current() }, [])

  /** The hint in a row's box: a book's row asks for the unit, another subject for what students do. */
  const rowPlaceholder = (label: string) => {
    const books = booksForLabel(label, classBooks)
    if (label.trim() && books.length) return `Start typing the ${label.trim()} unit or story`
    if (label.trim()) return `What are students doing in ${label.trim()}?`
    return classBooks.length ? 'Pick a subject, or start typing a unit' : 'Pick a subject, then say what students are doing'
  }

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

  // ─── Printing ───
  // Each grade prints as its own landscape page: header, the chosen weeks,
  // footer. One grade prints the page on screen; "all grades" loads the
  // other four and puts all five pages in one document, so Save as PDF gives
  // a single file for the whole class.
  type MonthPlan = Awaited<ReturnType<typeof fetchMonth>>

  const pickWeeks = (selectedWeekIndices?: Set<number>) =>
    selectedWeekIndices && selectedWeekIndices.size > 0 ? weeks.filter((_, i) => selectedWeekIndices.has(i)) : weeks

  /** True when a teacher wrote anything for this grade in these weeks. */
  const hasPlans = (plan: MonthPlan, weeksToPrint: typeof weeks) =>
    weeksToPrint.some(week =>
      !!plan.hw[getMondayOf(week[0].date)]?.trim() ||
      week.some(d => { const data = plan.dd[d.date]; return !!data && (data.subjects.some(s => s.content.trim()) || !!data.objective?.trim()) }))

  const gradePageHTML = (grade: Grade, plan: MonthPlan, weeksToPrint: typeof weeks, isPartial: boolean) => {
    const mn = MONTH_NAMES[month]
    let weeksHTML = ''
    weeksToPrint.forEach(week => {
      const fw: (typeof monthDays[0] | null)[] = [null, null, null, null, null]
      week.forEach(d => { fw[d.dayOfWeek - 1] = d })

      let daysHTML = ''
      fw.forEach((day, di) => {
        if (!day) { daysHTML += '<td class="day empty"></td>'; return }
        const data = plan.dd[day.date] || emptyDay()
        const evts = plan.ce[day.date] || []
        const noG5 = isNoClassDay(grade, di + 1)
        const blocked = plan.bd[day.date]

        let inner = ''
        if (noG5) {
          inner = `<div class="no-class">No Grade ${grade}</div>`
        } else if (blocked?.kind === 'off') {
          inner = `<div class="no-class">${escapeHtml(blocked.title)}</div>`
        } else {
          if (blocked?.kind === 'exam') inner += `<div class="event">${escapeHtml(blocked.title)}</div>`
          evts.forEach(ev => { inner += `<div class="event">${escapeHtml(ev.title)}</div>` })
          // Only rows the teacher actually wrote in. A labeled-but-empty row
          // would otherwise print as a bare subject name on the parent copy.
          data.subjects.forEach(s => {
            if (!s.content.trim()) return
            // Colon belongs to the label; without one, print the text alone
            // rather than a stray leading ":".
            const lbl = s.label.trim()
            inner += `<div class="subj">${lbl ? `<span class="subj-label">${escapeHtml(lbl)}:</span> ` : ''}${escapeHtml(s.content)}</div>`
          })
          if (data.objective) inner += `<div class="obj"><span class="obj-pre">Students will</span> ${escapeHtml(data.objective)}</div>`
          if (!inner) inner = '<div class="empty-day">--</div>'
        }

        daysHTML += `<td class="day"><div class="day-hdr">${DAY_SHORT[di]} <span class="day-num">${month + 1}/${day.dayNum}</span></div>${inner}</td>`
      })

      // Add weekly homework row if this week has homework
      const weekMonday = week.length > 0 ? getMondayOf(week[0].date) : ''
      const hw = plan.hw[weekMonday] || ''
      if (hw) {
        weeksHTML += `<tr>${daysHTML}</tr><tr><td colspan="5" class="hw-row"><span class="hw-label">Weekly Homework:</span> ${escapeHtml(hw)}</td></tr>`
      } else {
        weeksHTML += `<tr>${daysHTML}</tr>`
      }
    })

    return `<div class="page">
  <div class="header">
    <div><h1>${selectedClass} -- ${mn} ${year}${isPartial ? ' (Selected Weeks)' : ''}</h1><div class="sub">Grade ${grade} -- Daewoo Elementary School English Program</div></div>
    <div class="right">Daewoo Elementary School<br>English Program</div>
  </div>
  <table>
    <tr><th class="col-hdr">Monday</th><th class="col-hdr">Tuesday</th><th class="col-hdr">Wednesday</th><th class="col-hdr">Thursday</th><th class="col-hdr">Friday</th></tr>
    ${weeksHTML}
  </table>
  <div class="footer">Daewoo Elementary School -- English Program -- ${mn} ${year}</div>
</div>`
  }

  const writePrintDoc = (pw: Window, title: string, pages: string[]) => {
    pw.document.open()
    pw.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title>
<style>
  @page { size: landscape; margin: 8mm 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page + .page { break-before: page; page-break-before: always; }
  @media screen { .page + .page { margin-top: 32px; } }
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
${pages.join('\n')}
</body></html>`)
    pw.document.close(); setTimeout(() => pw.print(), 400)
  }

  const isPartialPick = (selectedWeekIndices?: Set<number>) =>
    !!selectedWeekIndices && selectedWeekIndices.size > 0 && selectedWeekIndices.size < weeks.length

  // Print the grade on screen
  const handlePrint = (selectedWeekIndices?: Set<number>) => {
    const pw = window.open('', '_blank'); if (!pw) return
    const plan: MonthPlan = { dd: dayData, ce: calEvents, bd: blockedDays, hw: weeklyHomework, stamps: {} }
    writePrintDoc(pw, `${selectedClass} Grade ${selectedGrade} - ${MONTH_NAMES[month]} ${year}`,
      [gradePageHTML(selectedGrade, plan, pickWeeks(selectedWeekIndices), isPartialPick(selectedWeekIndices))])
  }

  // Print every grade of this class, one page per grade. The window opens
  // straight from the click (so the browser doesn't block it) and fills in
  // once the other grades have loaded. Grades with nothing written for these
  // weeks are left out rather than printed blank.
  const handlePrintAllGrades = async (selectedWeekIndices?: Set<number>) => {
    const pw = window.open('', '_blank'); if (!pw) return
    pw.document.write('<p style="font-family: Arial, sans-serif; color: #64748b; padding: 24px">Loading Grades 1–5…</p>')
    setPrintingAll(true)
    try {
      await flushDirty()
      const plans = await Promise.all(GRADES.map(g => fetchMonth(selectedClass, g)))
      const weeksToPrint = pickWeeks(selectedWeekIndices)
      const withPlans = GRADES.filter((_, i) => hasPlans(plans[i], weeksToPrint))
      if (!withPlans.length) {
        pw.close()
        showToast(`No ${selectedClass} lesson plans written for ${isPartialPick(selectedWeekIndices) ? 'these weeks' : MONTH_NAMES[month]} yet`)
        return
      }
      const skipped = GRADES.filter(g => !withPlans.includes(g))
      writePrintDoc(pw, `${selectedClass} Grades 1-5 - ${MONTH_NAMES[month]} ${year}`,
        withPlans.map(g => gradePageHTML(g, plans[GRADES.indexOf(g)], weeksToPrint, isPartialPick(selectedWeekIndices))))
      if (skipped.length) showToast(`Left out Grade ${skipped.join(', ')}: nothing written for these weeks`)
    } catch {
      pw.close()
      showToast('Could not load the other grades. Try again.')
    } finally {
      setPrintingAll(false)
    }
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
                <button onClick={() => handlePrint()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-l-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">{printingAll ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Print Month</button>
                <button onClick={() => setShowPrintOptions(!showPrintOptions)} className="px-2 py-2 rounded-r-lg text-white bg-navy hover:bg-navy-dark border-l border-white/20"><ChevronDown size={14} /></button>
              </div>
              {showPrintOptions && (
                <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-50 p-3 min-w-[240px]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-navy">Print Selected Weeks</p>
                    <button onClick={() => setPrintWeeks(printWeeks.size === weeks.length ? new Set() : new Set(weeks.map((_, i) => i)))}
                      className="text-[10.5px] text-text-secondary hover:text-navy">{printWeeks.size === weeks.length ? 'Clear' : 'All weeks'}</button>
                  </div>
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
                  {/* Every grade of this class in one document: one page per
                      grade, so Save as PDF gives a single file. */}
                  <label className="flex items-start gap-2 text-[11px] text-text-primary cursor-pointer hover:bg-surface-alt rounded px-1.5 py-1 mb-3 border-t border-border pt-2.5">
                    <input type="checkbox" checked={printAllGrades} onChange={() => setPrintAllGrades(v => !v)} className="rounded border-border text-navy mt-px" />
                    <span>All grades (1–5)<span className="block text-[10px] text-text-tertiary">{selectedClass}, one page per grade, one file</span></span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => { if (printAllGrades) handlePrintAllGrades(printWeeks); else handlePrint(printWeeks); setShowPrintOptions(false); setPrintWeeks(new Set()) }}
                      disabled={printWeeks.size === 0 || printingAll}
                      className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
                      Print {printWeeks.size > 0 ? `${printWeeks.size} Week${printWeeks.size > 1 ? 's' : ''}${printAllGrades ? ' · Grades 1–5' : ''}` : '(select weeks)'}
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
              <button key={c} disabled={busyWriting} onClick={async () => { if (busyWriting) return; if (c !== selectedClass) { await flushDirty(); setOpenWeek(null); setOpenPicker(null); setDayData({}); setWeeklyHomework({}); setSelectedClass(c) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedClass === c ? 'text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-1">
            {GRADES.map(g => <button key={g} disabled={busyWriting} onClick={async () => { if (busyWriting) return; if (g !== selectedGrade) { await flushDirty(); setOpenWeek(null); setOpenPicker(null); setDayData({}); setWeeklyHomework({}); setSelectedGrade(g) } }} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Grade {g}</button>)}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 mx-auto max-w-[1400px]">
        {/* After a Push or Pull: what moved, and Undo */}
        {undo && undo.cls === selectedClass && (
          <div className="mb-4 flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-lg border border-border bg-surface-alt text-[13px]">
            <span className="text-text-primary">{undo.text}</span>
            <button onClick={undoShift} disabled={shifting === 'undo'} className="px-3 py-1 rounded-lg text-[12px] font-semibold bg-navy text-white hover:bg-navy-dark disabled:opacity-50">{shifting === 'undo' ? 'Undoing…' : 'Undo'}</button>
            <button onClick={() => setUndo(null)} className="ml-auto text-text-tertiary hover:text-text-primary" aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}
        {/* Month nav */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevMonth} disabled={busyWriting} aria-label="Previous month" className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary disabled:opacity-40"><ChevronLeft size={20} /></button>
          <h3 className="text-xl font-display font-bold text-navy min-w-[240px] text-center">{MONTH_NAMES[month]} {year}</h3>
          <button onClick={nextMonth} disabled={busyWriting} aria-label="Next month" className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary disabled:opacity-40"><ChevronRight size={20} /></button>
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
                  const noG5 = isNoClassDay(selectedGrade, di + 1)
                  const blocked = blockedDays[day.date]
                  const isOff = blocked?.kind === 'off'
                  const hasFill = data.subjects.some(s => s.content.trim()) || data.objective
                  if (isOff) {
                    return (
                      <div key={di} title={`${blocked.title} · from the school calendar`}
                        className="border-r border-border last:border-r-0 min-h-[140px] p-3 flex flex-col items-center justify-center text-center gap-1"
                        style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--good-soft)) 0 8px, rgb(var(--paper-2)) 8px 10px)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">{DAY_SHORT[di]} {month + 1}/{day.dayNum}</span>
                        <span className="text-[13px] font-semibold text-good">{blocked.title}</span>
                        <span className="text-[10.5px] text-ink-3">{lang === 'ko' ? '수업 없음 · 학교 달력' : 'No lesson · from the school calendar'}</span>
                        {/* A plan written before the day was taken: say so, and offer to move it on. */}
                        {canEdit && dayData[day.date] && !isDayEmpty(dayData[day.date]) && (
                          <span className="mt-1 flex flex-col items-center gap-1 bg-white/85 rounded px-2 py-1.5">
                            <span className="text-[10.5px] text-text-primary leading-snug">Planned here: {dayData[day.date].subjects.filter(s => s.content.trim()).map(s => s.label || s.content).join(', ') || dayData[day.date].objective}</span>
                            <button onClick={() => shiftFrom(day.date, 1)} disabled={shifting === day.date} className="text-[10.5px] font-semibold text-navy hover:underline disabled:opacity-50">{shifting === day.date ? 'Moving…' : 'Move a day later from here →'}</button>
                          </span>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div key={di}
                      onClick={() => openDayWeek(wi)}
                      className={`border-r border-border last:border-r-0 min-h-[140px] p-3 transition-all ${
                        canEdit ? 'cursor-pointer hover:bg-blue-50/30' : ''
                      } ${isToday ? 'bg-amber-50/30 ring-2 ring-inset ring-gold/40' : blocked?.kind === 'exam' ? 'bg-warn-soft/60' : 'bg-white'}`}>
                      {/* Day header */}
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 pb-1.5 border-b flex items-center justify-between ${isToday ? 'text-amber-700 border-gold/30' : 'text-slate-500 border-border/40'}`}>
                        <span>{DAY_SHORT[di]} <span className="text-text-primary font-extrabold">{month + 1}/{day.dayNum}</span></span>
                        {isToday && <span className="text-[8px] bg-gold/20 text-gold-dark px-1.5 py-0.5 rounded-full font-bold">TODAY</span>}
                        {canEdit && hasFill && <span className="text-[8px] text-blue-400">✎</span>}
                      </div>

                      {noG5 ? (
                        <div className="text-[11px] text-text-secondary italic text-center mt-6">{lang === 'ko' ? `${selectedGrade}학년 ${WEEKDAY_LABELS[di + 1]} 수업 없음` : `No Grade ${selectedGrade} on ${WEEKDAY_LABELS[di + 1]}s`}</div>
                      ) : (
                        <>
                          {blocked?.kind === 'exam' && <div className="text-[10px] font-bold uppercase tracking-wider text-warn mb-1.5">{blocked.title}</div>}
                          {evts.map((ev, ei) => <div key={ei} className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-1 mb-1.5">{ev.title}</div>)}
                          {/* Only rows with content. A labeled-but-empty row must never
                              show here or in print -- this is the parent-facing calendar. */}
                          {data.subjects.map((s, si) => s.content.trim() ? (
                            <div key={si} className="group/row text-[11px] leading-snug mb-1 flex items-start gap-1">
                              <span className="flex-1 min-w-0">
                                {s.label.trim() && <><span className="font-bold text-navy">{s.label}:</span>{' '}</>}
                                <span className="text-text-primary">{s.content}</span>
                              </span>
                            </div>
                          ) : null)}
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
                      if (isNoClassDay(selectedGrade, di + 1)) return null // no class for this grade that weekday
                      const off = blockedDays[day.date]?.kind === 'off' ? blockedDays[day.date] : null
                      if (off) return (
                        <div key={day.date} className="grid grid-cols-[64px_1fr] gap-3 items-center py-2.5 border-b border-border/40 last:border-b-0">
                          <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{DAY_SHORT[di]}<span className="block text-[12px] text-text-primary font-bold">{month + 1}/{day.dayNum}</span></div>
                          <div className="text-[12.5px] text-good font-semibold flex items-center gap-3">{off.title} <span className="text-ink-3 font-normal">· {lang === 'ko' ? '수업 없음' : 'no lesson'}</span>
                            {dayData[day.date] && !isDayEmpty(dayData[day.date]) && <button onClick={() => shiftFrom(day.date, 1)} disabled={shifting === day.date} className="text-[11px] font-semibold text-navy hover:underline disabled:opacity-50">A plan is still here · Move a day later from here →</button>}
                          </div>
                        </div>
                      )
                      const data = dayData[day.date] || emptyDay()
                      return (
                        <div key={day.date} className="grid grid-cols-[64px_1fr] gap-3 items-start py-2.5 border-b border-border/40 last:border-b-0">
                          <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold pt-2.5">
                            {DAY_SHORT[di]}
                            <span className="block text-[12px] text-text-primary font-bold">{month + 1}/{day.dayNum}</span>
                            {(
                              <span className="flex flex-col items-start gap-0.5 mt-1.5 normal-case tracking-normal">
                                {!isDayEmpty(data) && <button onClick={() => shiftFrom(day.date, 1)} disabled={!!shifting} title="Move this day's plan and every later one a class day on" className="text-[10.5px] font-semibold text-navy hover:underline disabled:opacity-50">Move a day later →</button>}
                                {isDayEmpty(data) && <button onClick={() => shiftFrom(day.date, -1)} disabled={!!shifting} title="Bring the plans after this day back a class day, into this one" className="text-[10.5px] font-semibold text-navy hover:underline disabled:opacity-50">← Move a day earlier</button>}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 space-y-2">
                            {data.subjects.map((sub, si) => {
                              const pickerKey = `${day.date}-${si}`
                              return (
                                <div key={si}>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => { setCustomDraft(''); setOpenPicker(openPicker === pickerKey ? null : pickerKey) }}
                                      className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                                        sub.label
                                          ? 'bg-accent-light text-navy border border-accent-light hover:border-navy'
                                          : 'border border-dashed border-border text-text-tertiary hover:border-navy hover:text-navy'
                                      }`}>
                                      {sub.label || '+ Subject'}
                                    </button>
                                    <UnitInput
                                      value={sub.content}
                                      books={booksForLabel(sub.label, classBooks)}
                                      linkedName={sub.unit_id ? unitName(sub.unit_id) : undefined}
                                      placeholder={rowPlaceholder(sub.label)}
                                      onChange={v => updateSubject(day.date, si, v)}
                                      onPick={m => linkUnit(day.date, si, m)}
                                      onKeyDown={fieldNav}
                                    />
                                    {data.subjects.length > 1 && (
                                      <button onClick={() => removeSubjectRow(day.date, si)}
                                        title="Remove this subject"
                                        className="shrink-0 p-1 text-text-tertiary hover:text-red-500 transition-colors"><X size={13} /></button>
                                    )}
                                  </div>
                                  {/* The unit this row is about: for the teacher, never printed. */}
                                  {sub.unit_id && openPicker !== pickerKey && (() => {
                                    const book = classBooks.find(b => b.placement_id === sub.placement_id && b.units.some(u => u.id === sub.unit_id)) || classBooks.find(b => b.units.some(u => u.id === sub.unit_id))
                                    const unit = book?.units.find(u => u.id === sub.unit_id)
                                    if (!book || !unit) return null
                                    return (
                                      <UnitLine book={book} unit={unit} lessonId={sub.lesson_id} objective={data.objective}
                                        onLesson={id => setRowLesson(day.date, si, id)}
                                        onUnlink={() => unlinkRow(day.date, si)}
                                        onAddObjective={text => updateField(day.date, 'objective', addObjective(data.objective, text))} />
                                    )
                                  })()}
                                  {openPicker === pickerKey && (
                                    <div className="mt-2 p-3 bg-surface border border-border rounded-xl">
                                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">
                                        Subject for {DAY_SHORT[di]} {month + 1}/{day.dayNum}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {subjectChoices.map(s => (
                                          <button key={s}
                                            onClick={() => { updateSubjectLabel(day.date, si, s); setOpenPicker(null) }}
                                            className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                                              sub.label === s
                                                ? 'bg-navy text-white border-navy'
                                                : 'bg-surface text-text-secondary border-border hover:border-navy hover:text-navy'
                                            }`}>{s}</button>
                                        ))}
                                        {/* Write-ins sit alongside the standard chips, each with an x to
                                            drop it from the list once it is no longer being taught. */}
                                        {customSubjects.filter(s => !subjectChoices.includes(s)).map(s => (
                                          <span key={s}
                                            className={`inline-flex items-center rounded-full border transition-colors ${
                                              sub.label === s
                                                ? 'bg-navy text-white border-navy'
                                                : 'bg-surface text-text-secondary border-border hover:border-navy'
                                            }`}>
                                            <button
                                              onClick={() => { updateSubjectLabel(day.date, si, s); setOpenPicker(null) }}
                                              className="text-[12px] font-semibold pl-3 pr-1 py-1.5 rounded-l-full">{s}</button>
                                            <button onClick={() => forgetSubject(s)}
                                              title={`Remove "${s}" from the subject list`}
                                              className="pl-0.5 pr-2.5 py-1.5 rounded-r-full opacity-50 hover:opacity-100"><X size={11} /></button>
                                          </span>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/60">
                                        <input
                                          value={customDraft}
                                          onChange={e => setCustomDraft(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') { e.preventDefault(); applyCustomSubject(day.date, si) }
                                            if (e.key === 'Escape') { setCustomDraft(''); setOpenPicker(null) }
                                          }}
                                          placeholder="Or write your own subject…"
                                          className="flex-1 min-w-0 text-[12px] bg-transparent border-b border-border/60 outline-none focus:border-navy py-1 placeholder:text-text-tertiary/40"
                                        />
                                        <button onClick={() => applyCustomSubject(day.date, si)}
                                          disabled={!customDraft.trim()}
                                          className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border border-border text-text-secondary transition-colors enabled:hover:border-navy enabled:hover:text-navy disabled:opacity-40 disabled:cursor-not-allowed">
                                          Add
                                        </button>
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
                      <button data-guide="lessons.copy"
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

      {/* The Push or Pull preview: nothing is written until Push is pressed */}
      {shiftPlan && (() => {
        const sp = shiftPlan
        const total = sp.grades.reduce((a, g) => a + g.moves.length, 0)
        const verb = sp.dir === 1 ? 'Move a day later' : 'Move a day earlier'
        return (
          <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${verb} preview`}>
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-[620px] max-h-[85vh] flex flex-col">
              <div className="px-5 pt-4 pb-3 border-b border-border">
                <h3 className="text-[16px] font-semibold text-navy">{sp.dir === 1 ? 'Move the plans a class day later' : 'Move the plans a class day earlier'}</h3>
                <p className="text-[12.5px] text-text-secondary mt-1 leading-snug">From {fmtShort(sp.date)} to the end of the term ({fmtShort(sp.to)}). Days off, trips, no-class days and exam days are skipped and keep what they have. Weekly homework stays with its week.{sp.date < todayStr ? ' This starts on a day that has already passed.' : ''}</p>
                <label className="mt-2.5 inline-flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer">
                  <input type="checkbox" checked={sp.all} disabled={!!shifting} onChange={e => prepareShift(sp.date, sp.dir, e.target.checked)} />
                  All grades of {selectedClass} (1–5), for a day the whole class missed
                </label>
              </div>
              <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
                {sp.grades.map(g => (
                  <div key={g.grade}>
                    {sp.all && <p className="text-[11px] uppercase tracking-wider font-semibold text-text-tertiary mb-1">Grade {g.grade}</p>}
                    {g.error ? <p className="text-[12.5px] text-text-tertiary">{g.error}</p> : (
                      <ul className="space-y-1">
                        {g.moves.slice(0, sp.all ? 4 : 14).map(m => (
                          <li key={m.from} className="grid grid-cols-[132px_1fr] gap-2 text-[12.5px]">
                            <span className="text-text-secondary tabular-nums">{fmtShort(m.from)} → <span className="text-text-primary font-semibold">{fmtShort(m.to)}</span></span>
                            <span className="text-text-primary truncate" title={m.summary}>{m.summary}</span>
                          </li>
                        ))}
                        {g.moves.length > (sp.all ? 4 : 14) && <li className="text-[12px] text-text-tertiary">and {g.moves.length - (sp.all ? 4 : 14)} more days, each one class day {sp.dir === 1 ? 'later' : 'earlier'}</li>}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-border flex items-center gap-2">
                <span className="text-[12px] text-text-tertiary">{total} planned day{total === 1 ? '' : 's'} move. You can undo it afterwards.</span>
                <span className="flex-1" />
                <button onClick={() => setShiftPlan(null)} disabled={!!shifting} className="px-4 py-1.5 rounded-lg text-[12.5px] font-medium bg-surface-alt text-text-secondary hover:bg-border">Cancel</button>
                <button onClick={applyShift} disabled={!!shifting || total === 0} className="px-4 py-1.5 rounded-lg text-[12.5px] font-semibold bg-navy text-white hover:bg-navy-dark disabled:opacity-50">{shifting ? 'Moving…' : verb}</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

