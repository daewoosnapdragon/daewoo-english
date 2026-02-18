'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Printer, Settings, Plus, X, Loader2, Calendar, AlertCircle, CalendarRange, ClipboardList, Save } from 'lucide-react'
import LessonScaffoldBanner from './LessonScaffoldBanner'
import YearlyPlanView from '@/components/curriculum/YearlyPlanView'

interface SlotTemplate { id: string; day_of_week: number; slot_label: string; sort_order: number }
interface LessonEntry { id?: string; slot_label: string; title: string; objective: string; notes: string }
interface HomeworkEntry { id?: string; homework_text: string }
interface CalendarEvent { id: string; title: string; date: string; type: string }

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const SLOT_COLORS: Record<string, { bg: string; text: string; border: string; print: string }> = {}
const COLOR_PALETTE = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', print: '#DBEAFE' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', print: '#D1FAE5' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', print: '#FEF3C7' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', print: '#EDE9FE' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', print: '#FFE4E6' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', print: '#CFFAFE' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', print: '#FFEDD5' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', print: '#E0E7FF' },
]
function getSlotColor(label: string) {
  if (!SLOT_COLORS[label]) {
    const idx = Object.keys(SLOT_COLORS).length % COLOR_PALETTE.length
    SLOT_COLORS[label] = COLOR_PALETTE[idx]
  }
  return SLOT_COLORS[label]
}

function getMonthDays(year: number, month: number) {
  const days: { date: string; dayOfWeek: number; dayNum: number; weekIdx: number }[] = []
  const last = new Date(year, month + 1, 0)
  let weekIdx = 0; let lastDow = -1
  for (let d = 1; d <= last.getDate(); d++) {
    const dow = new Date(year, month, d).getDay()
    if (dow === 0 || dow === 6) continue
    if (dow === 1 && lastDow !== -1) weekIdx++
    lastDow = dow
    days.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dayOfWeek: dow, dayNum: d, weekIdx })
  }
  return days
}

function getWeekStart(dateStr: string): string {
  const dt = new Date(dateStr + 'T00:00:00')
  const diff = dt.getDay() === 0 ? -6 : 1 - dt.getDay()
  const monday = new Date(dt); monday.setDate(dt.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

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
      {tab === 'monthly' ? <MonthlyLessonPlanView tabBar={tabButtons} /> : tab === 'teacher' ? (
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

function MonthlyLessonPlanView({ tabBar }: { tabBar: React.ReactNode }) {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass

  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [slots, setSlots] = useState<SlotTemplate[]>([])
  const [entries, setEntries] = useState<Record<string, LessonEntry>>({})
  const [homework, setHomework] = useState<Record<string, HomeworkEntry>>({})
  const [calEvents, setCalEvents] = useState<Record<string, CalendarEvent>>({})
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [editingCell, setEditingCell] = useState<{ date: string; slot: string } | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editObjective, setEditObjective] = useState('')
  const [editingHomework, setEditingHomework] = useState<string | null>(null)
  const [editHwText, setEditHwText] = useState('')

  const canEdit = isAdmin || currentTeacher?.english_class === selectedClass
  const days = useMemo(() => getMonthDays(year, month), [year, month])
  const weeks = useMemo(() => {
    const w: (typeof days[number])[][] = []
    days.forEach(d => { while (w.length <= d.weekIdx) w.push([]); w[d.weekIdx].push(d) })
    return w
  }, [days])

  const loadData = useCallback(async () => {
    setLoading(true)
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`
    const [slotsRes, entriesRes, hwRes, eventsRes] = await Promise.all([
      supabase.from('lesson_plan_slots').select('*').eq('english_class', selectedClass).order('sort_order'),
      supabase.from('lesson_plan_entries').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade).gte('date', firstDay).lte('date', lastDay),
      supabase.from('lesson_plan_homework').select('*').eq('english_class', selectedClass).eq('grade', selectedGrade),
      supabase.from('calendar_events').select('*').gte('date', firstDay).lte('date', lastDay),
    ])
    setSlots(slotsRes.data || [])
    const em: Record<string, LessonEntry> = {}
    if (entriesRes.data) entriesRes.data.forEach((e: any) => { em[`${e.date}::${e.slot_label}`] = e })
    setEntries(em)
    const hm: Record<string, HomeworkEntry> = {}
    if (hwRes.data) hwRes.data.forEach((h: any) => { hm[h.week_start] = h })
    setHomework(hm)
    const ce: Record<string, CalendarEvent> = {}
    if (eventsRes.data) eventsRes.data.forEach((ev: any) => { if (ev.show_on_lesson_plan) ce[ev.date] = ev })
    setCalEvents(ce)
    setLoading(false)
  }, [selectedClass, selectedGrade, year, month])

  useEffect(() => { loadData() }, [loadData])

  const classSlots = useMemo(() => {
    const byDay: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    slots.forEach(s => { if (!byDay[s.day_of_week].includes(s.slot_label)) byDay[s.day_of_week].push(s.slot_label) })
    return byDay
  }, [slots])

  const [addingSlotDate, setAddingSlotDate] = useState<string | null>(null)
  const [newSlotLabel, setNewSlotLabel] = useState('')

  // Get all slots for a specific date: template slots + any ad-hoc entries
  const getDaySlots = (date: string, dayOfWeek: number) => {
    const template = classSlots[dayOfWeek] || []
    // Find ad-hoc entries for this date that aren't in the template
    const adHoc = Object.keys(entries)
      .filter(k => k.startsWith(`${date}::`))
      .map(k => k.split('::')[1])
      .filter(s => !template.includes(s))
    return [...template, ...Array.from(new Set(adHoc))]
  }

  const hasSlots = slots.length > 0
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const saveEntry = async () => {
    if (!editingCell) return
    const { date, slot } = editingCell
    const row = { english_class: selectedClass, grade: selectedGrade, date, slot_label: slot, title: editTitle.trim(), objective: editObjective.trim(), updated_by: currentTeacher?.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('lesson_plan_entries').upsert(row, { onConflict: 'english_class,grade,date,slot_label' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setEntries(prev => ({ ...prev, [`${date}::${slot}`]: data }))
    setEditingCell(null)
  }

  const saveHomework = async (weekStart: string) => {
    const row = { english_class: selectedClass, grade: selectedGrade, week_start: weekStart, homework_text: editHwText.trim(), updated_by: currentTeacher?.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('lesson_plan_homework').upsert(row, { onConflict: 'english_class,grade,week_start' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setHomework(prev => ({ ...prev, [weekStart]: data }))
    setEditingHomework(null)
  }

  const copyPreviousWeek = async (targetWeek: (typeof days[number])[]) => {
    if (targetWeek.length === 0) return
    const targetMonday = getWeekStart(targetWeek[0].date)
    const targetDate = new Date(targetMonday + 'T00:00:00')
    const prevMonday = new Date(targetDate); prevMonday.setDate(prevMonday.getDate() - 7)
    const prevMondayStr = prevMonday.toISOString().split('T')[0]
    const prevSunday = new Date(prevMonday); prevSunday.setDate(prevSunday.getDate() + 6)

    const { data: prevEntries } = await supabase.from('lesson_plan_entries').select('*')
      .eq('english_class', selectedClass).eq('grade', selectedGrade)
      .gte('date', prevMondayStr).lte('date', prevSunday.toISOString().split('T')[0])
    if (!prevEntries || prevEntries.length === 0) { showToast('No entries found in previous week'); return }

    let copied = 0
    for (const entry of prevEntries) {
      const prevDate = new Date(entry.date + 'T00:00:00')
      const dayOffset = (prevDate.getDay() === 0 ? 7 : prevDate.getDay()) - 1
      const newDate = new Date(targetDate); newDate.setDate(newDate.getDate() + dayOffset)
      const { error } = await supabase.from('lesson_plan_entries').upsert({
        english_class: selectedClass, grade: selectedGrade, date: newDate.toISOString().split('T')[0],
        slot_label: entry.slot_label, title: entry.title, objective: entry.objective,
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
      }, { onConflict: 'english_class,grade,date,slot_label' })
      if (!error) copied++
    }
    showToast(`Copied ${copied} entries from previous week`)
    loadData()
  }

  const addSlot = async (dayOfWeek: number, label: string) => {
    const maxOrder = slots.filter(s => s.day_of_week === dayOfWeek).reduce((max, s) => Math.max(max, s.sort_order), 0)
    const { data, error } = await supabase.from('lesson_plan_slots').upsert({ english_class: selectedClass, day_of_week: dayOfWeek, slot_label: label.trim(), sort_order: maxOrder + 1 }, { onConflict: 'english_class,day_of_week,slot_label' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setSlots(prev => [...prev, data])
  }
  const removeSlot = async (id: string) => { await supabase.from('lesson_plan_slots').delete().eq('id', id); setSlots(prev => prev.filter(s => s.id !== id)) }

  const weekCompletion = (week: (typeof days[number])[]) => {
    let filled = 0; let total = 0
    week.forEach(d => {
      if (calEvents[d.date]) return
      const ds = classSlots[d.dayOfWeek] || []
      total += ds.length
      ds.forEach(slot => { if (entries[`${d.date}::${slot}`]?.title) filled++ })
    })
    return { filled, total }
  }

  const handlePrint = () => {
    const pw = window.open('', '_blank'); if (!pw) return
    const allLabels = Array.from(new Set(slots.map(s => s.slot_label)))
    allLabels.forEach(l => getSlotColor(l))
    const mn = MONTH_NAMES[month]

    let weeksHTML = ''
    weeks.forEach((week) => {
      const fw: (typeof days[0] | null)[] = [null, null, null, null, null]
      week.forEach(d => { fw[d.dayOfWeek - 1] = d })
      const ws = week.length > 0 ? getWeekStart(week[0].date) : ''
      const hw = homework[ws]

      let daysHTML = ''
      fw.forEach((day, di) => {
        if (!day) { daysHTML += `<td class="day empty"></td>`; return }
        const event = calEvents[day.date]
        if (event) {
          daysHTML += `<td class="day event-day">
            <div class="day-hdr">${DAY_NAMES[di]} ${month + 1}/${day.dayNum}</div>
            <div class="event-block"><div class="event-star">&#9733;</div><div class="event-name">${event.title}</div></div></td>`
          return
        }
        const ds = getDaySlots(day.date, di + 1)
        let slotsHTML = ''
        ds.forEach(slot => {
          const entry = entries[`${day.date}::${slot}`]; const sc = getSlotColor(slot)
          slotsHTML += `<div class="slot"><span class="pill" style="background:${sc.print}">${slot}</span>`
          if (entry?.title) slotsHTML += `<div class="slot-title">${entry.title}</div>`
          if (entry?.objective) slotsHTML += `<div class="slot-obj"><em>Students will</em> ${entry.objective}</div>`
          slotsHTML += `</div>`
        })
        daysHTML += `<td class="day"><div class="day-hdr">${DAY_NAMES[di]} ${month + 1}/${day.dayNum}</div>${slotsHTML}</td>`
      })

      weeksHTML += `<table class="week"><tr>${daysHTML}</tr></table>`
      if (hw?.homework_text) weeksHTML += `<div class="hw-row">&#9998; <strong>Homework:</strong> ${hw.homework_text}</div>`
      weeksHTML += `<div style="height:12px"></div>`
    })

    pw.document.write(`<!DOCTYPE html><html><head><title>${selectedClass} Grade ${selectedGrade} - ${mn} ${year}</title>
<style>
  @page { size: landscape; margin: 12mm 14mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* ── HEADER ── */
  .header {
    background: #1e3a5f; color: white; padding: 16px 28px 12px;
    border-radius: 10px 10px 0 0; position: relative;
    display: flex; justify-content: space-between; align-items: center;
  }
  .header::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0;
    height: 4px; background: linear-gradient(90deg, #C9A84C, #e8d48b, #C9A84C);
  }
  .header .label { font-size: 8px; text-transform: uppercase; letter-spacing: 2.5px; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
  .header h1 { font-size: 22px; font-weight: 700; font-family: Georgia, serif; }
  .header .sub { font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 2px; }
  .header .month-box { text-align: right; }
  .header .month-name { font-size: 18px; font-weight: 700; font-family: Georgia, serif; color: rgba(255,255,255,0.85); }
  .header .year { font-size: 13px; color: rgba(255,255,255,0.35); font-weight: 600; }

  /* ── BODY ── */
  .body { padding: 16px 0 8px; }

  /* ── WEEK TABLE ── */
  .week {
    width: 100%; border-collapse: collapse;
    border: 1.5px solid #d4cfc7; border-radius: 8px; overflow: hidden;
    page-break-inside: avoid; margin-bottom: 2px;
  }
  .week td {
    width: 20%; vertical-align: top;
    border-right: 1px solid #e5e0d8;
    padding: 10px 12px; min-height: 110px;
    background: white;
  }
  .week td:last-child { border-right: none; }

  /* Day header */
  .day-hdr {
    font-size: 10px; font-weight: 700; color: #6b5f50;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding-bottom: 6px; margin-bottom: 8px;
    border-bottom: 2px solid #e8e0d4;
  }

  /* Empty / Event days */
  .day.empty { background: #f9f7f4; }
  .day.event-day { background: #f5f2ec; }
  .event-block { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px 0; }
  .event-star { font-size: 18px; color: #C9A84C; margin-bottom: 4px; }
  .event-name { font-size: 13px; font-weight: 700; color: #5a4e3c; font-family: Georgia, serif; text-align: center; }

  /* Slot content */
  .slot { margin-top: 8px; }
  .slot:first-child { margin-top: 0; }
  .pill {
    display: inline-block; font-size: 9px; font-weight: 700;
    padding: 2px 8px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: 0.3px;
    border: 1px solid rgba(0,0,0,0.08);
  }
  .slot-title { font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 3px; line-height: 1.35; }
  .slot-obj { font-size: 10.5px; color: #64748b; margin-top: 2px; line-height: 1.4; }
  .slot-obj em { color: #94a3b8; font-style: italic; }

  /* Homework */
  .hw-row {
    font-size: 10px; color: #7a6e5e; padding: 5px 14px;
    background: #f9f7f4; border: 1px solid #e5e0d8; border-top: none;
    border-radius: 0 0 8px 8px;
  }

  /* ── FOOTER ── */
  .footer {
    text-align: center; padding-top: 10px; margin-top: 4px;
    border-top: 1.5px solid #e5e0d8;
  }
  .footer span {
    font-size: 8px; color: #b0a494; letter-spacing: 2px; text-transform: uppercase;
  }
</style></head><body>
  <div class="header">
    <div>
      <div class="label">Monthly Lesson Plan</div>
      <h1>${selectedClass} Class</h1>
      <div class="sub">Grade ${selectedGrade} &bull; Daewoo Elementary School English Program</div>
    </div>
    <div class="month-box">
      <div class="month-name">${mn}</div>
      <div class="year">${year}</div>
    </div>
  </div>
  <div class="body">${weeksHTML}</div>
  <div class="footer"><span>Daewoo Elementary School &bull; English Program &bull; ${mn} ${year}</span></div>
</body></html>`)
    pw.document.close(); setTimeout(() => pw.print(), 400)
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-navy">Lesson Plans</h2>
            <p className="text-[13px] text-text-secondary mt-1">Monthly lesson planning by class and grade</p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && <button onClick={() => setShowSetup(!showSetup)} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium border transition-all ${showSetup ? 'bg-navy text-white border-navy' : 'bg-surface-alt text-text-secondary border-border'}`}><Settings size={14} /> Day Setup</button>}
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Printer size={14} /> Print for Parents</button>
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
        <div className="flex items-center justify-center gap-4 mb-6">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronLeft size={20} /></button>
          <h3 className="text-xl font-display font-bold text-navy min-w-[220px] text-center">{MONTH_NAMES[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary"><ChevronRight size={20} /></button>
        </div>

        {showSetup && canEdit && <DaySetupPanel selectedClass={selectedClass} slots={slots} onAdd={addSlot} onRemove={removeSlot} onClose={() => setShowSetup(false)} />}

        {weeks.map((week, wi) => {
          const fw: (typeof days[0] | null)[] = [null, null, null, null, null]
          week.forEach(d => { fw[d.dayOfWeek - 1] = d })
          const ws = week.length > 0 ? getWeekStart(week[0].date) : ''
          const hw = homework[ws]

          return (
            <div key={wi} className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
              </div>

              <div className="grid grid-cols-5 gap-px bg-border rounded-xl overflow-hidden border border-border shadow-sm">
                {fw.map((day, di) => {
                  const daySlots = day ? getDaySlots(day.date, di + 1) : (classSlots[di + 1] || [])
                  const isToday = day?.date === getKSTDateString()
                  const event = day ? calEvents[day.date] : null
                  const isMonday = di === 0
                  const noG5Monday = isMonday && selectedGrade === 5
                  return (
                    <div key={di} className={`p-3 min-h-[130px] transition-colors ${!day ? 'bg-gray-50' : noG5Monday ? 'bg-gray-100' : event ? 'bg-slate-100' : isToday ? 'bg-amber-50/40 ring-2 ring-inset ring-gold/60' : 'bg-white'}`}>
                      {day ? (
                        <>
                          <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 pb-1.5 border-b ${isToday ? 'text-gold border-gold/30' : 'text-text-tertiary border-border'}`}>
                            {DAY_SHORT[di]} <span className="text-text-primary">{month + 1}/{day.dayNum}</span>
                          </div>
                          {noG5Monday ? (
                            <div className="flex items-center justify-center h-[70px]">
                              <div className="text-center">
                                <p className="text-[11px] font-semibold text-text-tertiary">No Grade 5</p>
                                <p className="text-[9px] text-text-tertiary mt-0.5">on Mondays</p>
                              </div>
                            </div>
                          ) : event ? (
                            <div className="flex items-center justify-center h-[70px]">
                              <div className="text-center">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-[11px] font-bold"><AlertCircle size={12} /> {event.title}</div>
                                <p className="text-[9px] text-slate-500 mt-1">{event.type || 'Event'}</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {daySlots.length === 0 && !canEdit && <p className="text-[10px] text-text-tertiary italic mt-3">No slots for {DAY_NAMES[di]}</p>}
                              {daySlots.map(slot => {
                                const key = `${day.date}::${slot}`; const entry = entries[key]; const sc = getSlotColor(slot)
                                const isEditing = editingCell?.date === day.date && editingCell?.slot === slot
                                return (
                                  <div key={slot} className="mt-2 first:mt-0">
                                    <span className={`inline-block px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wide ${sc.bg} ${sc.text} ${sc.border} border`}>{slot}</span>
                                    {isEditing ? (
                                      <div className="mt-1 space-y-1.5">
                                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title (e.g., Into Reading 2.2 - What's the Matter?)"
                                          className="w-full px-2 py-1.5 text-[11px] border border-navy rounded-lg outline-none font-medium" autoFocus />
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-[10px] text-text-tertiary italic pointer-events-none">Students will</span>
                                          <textarea value={editObjective} onChange={e => setEditObjective(e.target.value)} placeholder="(e.g., classify three kinds of matter)"
                                            className="w-full pl-[76px] pr-2 py-1.5 text-[10px] border border-border rounded-lg outline-none resize-none focus:border-navy" rows={2} />
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={saveEntry} className="px-2.5 py-1 rounded-lg bg-navy text-white text-[10px] font-medium">Save</button>
                                          <button onClick={() => setEditingCell(null)} className="px-2.5 py-1 rounded-lg bg-surface-alt text-text-secondary text-[10px]">Cancel</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div onClick={() => { if (canEdit) { setEditingCell({ date: day.date, slot }); setEditTitle(entry?.title || ''); setEditObjective(entry?.objective || '') } }}
                                        className={`mt-0.5 rounded-lg px-1.5 py-1 ${canEdit ? 'cursor-pointer hover:bg-surface-alt/60' : ''} ${!entry?.title ? 'border border-dashed border-border/60' : ''}`}>
                                        {entry?.title ? (
                                          <>
                                            <div className="text-[11px] font-semibold text-navy leading-snug">{entry.title}</div>
                                            {entry.objective && <div className="text-[10px] text-text-secondary leading-snug mt-0.5"><span className="text-text-tertiary italic">Students will </span>{entry.objective}</div>}
                                          </>
                                        ) : (canEdit && <div className="text-[10px] text-text-tertiary/50 py-1">+ Add</div>)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              {/* Per-day add slot for one-off overrides */}
                              {canEdit && day && (
                                addingSlotDate === day.date ? (
                                  <div className="mt-2">
                                    <input value={newSlotLabel} onChange={e => setNewSlotLabel(e.target.value)} placeholder="e.g., Phonics"
                                      className="w-full px-2 py-1 text-[10px] border border-navy rounded-lg outline-none" autoFocus
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && newSlotLabel.trim()) {
                                          setEditingCell({ date: day.date, slot: newSlotLabel.trim() })
                                          setEditTitle(''); setEditObjective('')
                                          setEntries(prev => ({ ...prev, [`${day.date}::${newSlotLabel.trim()}`]: { title: '', objective: '', notes: '' } as any }))
                                          setNewSlotLabel(''); setAddingSlotDate(null)
                                        }
                                        if (e.key === 'Escape') { setAddingSlotDate(null); setNewSlotLabel('') }
                                      }} />
                                  </div>
                                ) : (
                                  <button onClick={() => setAddingSlotDate(day.date)} className="mt-2 text-[9px] text-text-tertiary/50 hover:text-navy font-medium">+ Add slot</button>
                                )
                              )}
                            </>
                          )}
                        </>
                      ) : <div />}
                    </div>
                  )
                })}
              </div>

              <div className={`mt-1.5 px-3 py-2 rounded-lg ${hw?.homework_text ? 'bg-amber-50 border border-amber-200' : 'bg-surface-alt/50 border border-dashed border-border'}`}>
                {editingHomework === ws ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-amber-700 font-semibold whitespace-nowrap">📝 Homework:</span>
                    <input value={editHwText} onChange={e => setEditHwText(e.target.value)} className="flex-1 px-2 py-1 text-[11px] border border-amber-300 rounded-lg outline-none focus:border-navy bg-white"
                      onKeyDown={e => { if (e.key === 'Enter') saveHomework(ws); if (e.key === 'Escape') setEditingHomework(null) }} autoFocus />
                    <button onClick={() => saveHomework(ws)} className="px-2 py-1 rounded-lg bg-navy text-white text-[10px] font-medium">Save</button>
                    <button onClick={() => setEditingHomework(null)} className="text-[10px] text-text-tertiary">Cancel</button>
                  </div>
                ) : (
                  <div onClick={() => { if (canEdit && ws) { setEditingHomework(ws); setEditHwText(hw?.homework_text || '') } }}
                    className={`text-[11px] ${hw?.homework_text ? 'text-amber-800 font-medium' : 'text-text-tertiary'} ${canEdit ? 'cursor-pointer hover:text-amber-900' : ''}`}>
                    {hw?.homework_text ? `📝 Homework: ${hw.homework_text}` : (canEdit ? '+ Click to add homework note for this week' : 'No homework assigned')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DaySetupPanel({ selectedClass, slots, onAdd, onRemove, onClose }: {
  selectedClass: EnglishClass; slots: SlotTemplate[]; onAdd: (dow: number, label: string) => void; onRemove: (id: string) => void; onClose: () => void
}) {
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [newLabel, setNewLabel] = useState('')
  return (
    <div className="mb-6 bg-surface border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-[14px] font-semibold text-navy">Weekly Schedule for {selectedClass}</h4>
          <p className="text-[11px] text-text-tertiary mt-0.5">Define what content appears on each day. This applies to all months and all grades.</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {DAY_NAMES.map((dayName, di) => {
          const daySlots = slots.filter(s => s.day_of_week === di + 1)
          return (
            <div key={di} className="bg-surface-alt rounded-xl p-3">
              <div className="text-[12px] font-bold text-navy mb-2.5">{dayName}</div>
              <div className="space-y-1.5">
                {daySlots.map(slot => {
                  const sc = getSlotColor(slot.slot_label)
                  return (
                    <div key={slot.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-border">
                      <span className={`text-[10px] font-medium ${sc.text}`}>{slot.slot_label}</span>
                      <button onClick={() => onRemove(slot.id)} className="p-0.5 text-text-tertiary hover:text-red-500"><X size={11} /></button>
                    </div>
                  )
                })}
              </div>
              {addingDay === di + 1 ? (
                <div className="mt-2 flex gap-1">
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g., Phonics"
                    className="flex-1 px-2 py-1.5 text-[10px] border border-border rounded-lg outline-none focus:border-navy" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onAdd(di + 1, newLabel); setNewLabel(''); setAddingDay(null) }; if (e.key === 'Escape') setAddingDay(null) }} />
                  <button onClick={() => { if (newLabel.trim()) { onAdd(di + 1, newLabel); setNewLabel(''); setAddingDay(null) } }} className="px-2 py-1 rounded-lg bg-navy text-white text-[9px] font-medium">Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingDay(di + 1)} className="mt-2 flex items-center gap-1 text-[10px] text-text-tertiary hover:text-navy font-medium"><Plus size={11} /> Add slot</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// TEACHER WEEKLY PLANS -- Freeform text, Mon-Fri, printable
// ═══════════════════════════════════════════════════════════════════

function getWeekDatesForPlans(dateStr: string): string[] {
  // Parse date parts directly to avoid timezone issues
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d) // local midnight, no TZ ambiguity
  const dow = date.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return Array.from({ length: 5 }, (_, i) => {
    const dd = new Date(y, m - 1, d + mondayOffset + i)
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
  })
}

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function TeacherWeeklyPlans() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass

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

      <LessonScaffoldBanner englishClass={selectedClass} grade={selectedGrade} />

      {loading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
      ) : (
        <>
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
