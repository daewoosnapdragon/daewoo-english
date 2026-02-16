'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor, getKSTDateString } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Printer, Settings, Plus, X, Loader2, Save, Edit3, Trash2, Eye } from 'lucide-react'

interface SlotTemplate { id: string; day_of_week: number; slot_label: string; sort_order: number }
interface LessonEntry { id?: string; slot_label: string; title: string; objective: string; notes: string }
interface HomeworkEntry { id?: string; homework_text: string }

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function getMonthDays(year: number, month: number) {
  const days: { date: string; dayOfWeek: number; dayNum: number; weekIdx: number }[] = []
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  let weekIdx = 0
  let lastDow = -1
  for (let d = 1; d <= last.getDate(); d++) {
    const dt = new Date(year, month, d)
    const dow = dt.getDay() // 0=Sun
    if (dow === 0 || dow === 6) continue // skip weekends
    if (dow === 1 && lastDow !== -1) weekIdx++
    lastDow = dow
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ date: dateStr, dayOfWeek: dow, dayNum: d, weekIdx })
  }
  return days
}

function getWeekStart(dateStr: string): string {
  const dt = new Date(dateStr + 'T00:00:00')
  const dow = dt.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const monday = new Date(dt)
  monday.setDate(dt.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function LessonPlanView() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass

  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [slots, setSlots] = useState<SlotTemplate[]>([])
  const [entries, setEntries] = useState<Record<string, LessonEntry>>({}) // date::slotLabel
  const [homework, setHomework] = useState<Record<string, HomeworkEntry>>({}) // weekStart
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
    const w: typeof days[] = []
    days.forEach(d => { while (w.length <= d.weekIdx) w.push([]); w[d.weekIdx].push(d) })
    return w
  }, [days])

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true)
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    const firstDay = `${monthStr}-01`
    const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`

    const [slotsRes, entriesRes, hwRes] = await Promise.all([
      supabase.from('lesson_plan_slots').select('*').eq('english_class', selectedClass).order('sort_order'),
      supabase.from('lesson_plan_entries').select('*').eq('english_class', selectedClass).gte('date', firstDay).lte('date', lastDay),
      supabase.from('lesson_plan_homework').select('*').eq('english_class', selectedClass),
    ])

    setSlots(slotsRes.data || [])
    const em: Record<string, LessonEntry> = {}
    if (entriesRes.data) entriesRes.data.forEach((e: any) => { em[`${e.date}::${e.slot_label}`] = { id: e.id, slot_label: e.slot_label, title: e.title || '', objective: e.objective || '', notes: e.notes || '' } })
    setEntries(em)
    const hm: Record<string, HomeworkEntry> = {}
    if (hwRes.data) hwRes.data.forEach((h: any) => { hm[h.week_start] = { id: h.id, homework_text: h.homework_text || '' } })
    setHomework(hm)
    setLoading(false)
  }, [selectedClass, year, month])

  useEffect(() => { loadData() }, [loadData])

  const classSlots = useMemo(() => {
    const byDay: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    slots.forEach(s => { if (!byDay[s.day_of_week].includes(s.slot_label)) byDay[s.day_of_week].push(s.slot_label) })
    return byDay
  }, [slots])

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const saveEntry = async () => {
    if (!editingCell) return
    const { date, slot } = editingCell
    const key = `${date}::${slot}`
    const row = {
      english_class: selectedClass, date, slot_label: slot,
      title: editTitle.trim(), objective: editObjective.trim(),
      updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase.from('lesson_plan_entries').upsert(row, { onConflict: 'english_class,date,slot_label' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setEntries(prev => ({ ...prev, [key]: { id: data.id, slot_label: slot, title: editTitle.trim(), objective: editObjective.trim(), notes: '' } }))
    setEditingCell(null)
    setEditTitle('')
    setEditObjective('')
  }

  const saveHomework = async (weekStart: string) => {
    const row = {
      english_class: selectedClass, week_start: weekStart,
      homework_text: editHwText.trim(),
      updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
    }
    const { data, error } = await supabase.from('lesson_plan_homework').upsert(row, { onConflict: 'english_class,week_start' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setHomework(prev => ({ ...prev, [weekStart]: { id: data.id, homework_text: editHwText.trim() } }))
    setEditingHomework(null)
  }

  // Slot template management
  const addSlot = async (dayOfWeek: number, label: string) => {
    const maxOrder = slots.filter(s => s.day_of_week === dayOfWeek).reduce((max, s) => Math.max(max, s.sort_order), 0)
    const { data, error } = await supabase.from('lesson_plan_slots').upsert({
      english_class: selectedClass, day_of_week: dayOfWeek, slot_label: label.trim(), sort_order: maxOrder + 1
    }, { onConflict: 'english_class,day_of_week,slot_label' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setSlots(prev => [...prev, data])
  }

  const removeSlot = async (id: string) => {
    await supabase.from('lesson_plan_slots').delete().eq('id', id)
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  // Print handler
  const handlePrint = () => {
    const pw = window.open('', '_blank')
    if (!pw) return

    const headerColor = classToColor(selectedClass)
    const monthName = MONTH_NAMES[month]
    const className = selectedClass

    let html = `<html><head><title>${className} ${monthName} ${year} Lesson Plan</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
      .header { text-align: center; padding: 12px; margin-bottom: 16px; border-radius: 8px; color: white; font-size: 20px; font-weight: 700; }
      .week { margin-bottom: 18px; page-break-inside: avoid; }
      .week-grid { display: grid; grid-template-columns: repeat(5, 1fr); border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
      .day { border-right: 1px solid #eee; padding: 8px; min-height: 100px; }
      .day:last-child { border-right: none; }
      .day-header { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
      .slot-label { font-size: 9px; color: #888; font-style: italic; margin-top: 6px; }
      .slot-title { font-size: 11px; font-weight: 600; color: #1a1a1a; }
      .slot-obj { font-size: 10px; color: #555; margin-top: 2px; line-height: 1.4; }
      .hw { font-size: 10px; color: #666; font-style: italic; margin-top: 4px; padding: 4px 8px; background: #f9f9f9; border-radius: 4px; }
      .no-class { background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 11px; font-weight: 600; }
      @media print { body { padding: 10px; } .week { page-break-inside: avoid; } }
    </style></head><body>
    <div class="header" style="background:${headerColor}">${className} - ${monthName} ${year} Lesson Plan</div>`

    weeks.forEach((week, wi) => {
      // Build full Mon-Fri grid
      const fullWeek: (typeof days[0] | null)[] = [null, null, null, null, null]
      week.forEach(d => { fullWeek[d.dayOfWeek - 1] = d })

      const weekStart = week.length > 0 ? getWeekStart(week[0].date) : ''
      const hw = homework[weekStart]

      html += `<div class="week"><div class="week-grid">`
      fullWeek.forEach((day, di) => {
        if (!day) {
          html += `<div class="day no-class"><span></span></div>`
          return
        }
        const daySlots = classSlots[di + 1] || []
        html += `<div class="day"><div class="day-header">${DAY_NAMES[di]} ${month + 1}/${day.dayNum}</div>`
        if (daySlots.length === 0) {
          html += `<div style="color:#ccc;font-size:10px;margin-top:8px">No slots defined</div>`
        }
        daySlots.forEach(slot => {
          const entry = entries[`${day.date}::${slot}`]
          html += `<div class="slot-label">${slot}</div>`
          if (entry?.title) html += `<div class="slot-title">${entry.title}</div>`
          if (entry?.objective) html += `<div class="slot-obj">${entry.objective}</div>`
        })
        html += `</div>`
      })
      html += `</div>`
      if (hw?.homework_text) html += `<div class="hw">This week's homework: ${hw.homework_text}</div>`
      html += `</div>`
    })

    html += `<div style="text-align:center;margin-top:16px;font-size:9px;color:#bbb">Daewoo Elementary School English Program</div></body></html>`
    pw.document.write(html)
    pw.document.close()
    setTimeout(() => pw.print(), 300)
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold text-navy">Monthly Lesson Plans</h2>
          <div className="flex gap-1">
            {(isAdmin ? ENGLISH_CLASSES : [teacherClass]).filter(Boolean).map(c => (
              <button key={c} onClick={() => setSelectedClass(c)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selectedClass === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={() => setShowSetup(!showSetup)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${showSetup ? 'bg-navy text-white border-navy' : 'bg-surface-alt text-text-secondary border-border hover:border-navy/30'}`}>
              <Settings size={13} /> Day Setup
            </button>
          )}
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-center gap-4 mb-5">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-alt"><ChevronLeft size={18} /></button>
        <h3 className="text-lg font-display font-semibold text-navy min-w-[200px] text-center">{MONTH_NAMES[month]} {year}</h3>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-alt"><ChevronRight size={18} /></button>
      </div>

      {/* Day Setup Panel */}
      {showSetup && canEdit && (
        <DaySetupPanel
          selectedClass={selectedClass}
          slots={slots}
          onAdd={addSlot}
          onRemove={removeSlot}
          onClose={() => setShowSetup(false)}
        />
      )}

      {/* Week grids */}
      {weeks.map((week, wi) => {
        const fullWeek: (typeof days[0] | null)[] = [null, null, null, null, null]
        week.forEach(d => { fullWeek[d.dayOfWeek - 1] = d })
        const weekStart = week.length > 0 ? getWeekStart(week[0].date) : ''
        const hw = homework[weekStart]

        return (
          <div key={wi} className="mb-5">
            <div className="grid grid-cols-5 gap-px bg-border rounded-xl overflow-hidden border border-border">
              {fullWeek.map((day, di) => {
                const daySlots = classSlots[di + 1] || []
                const isToday = day?.date === getKSTDateString()
                return (
                  <div key={di} className={`bg-surface p-3 min-h-[120px] ${!day ? 'bg-surface-alt/50' : ''} ${isToday ? 'ring-2 ring-inset ring-gold' : ''}`}>
                    {day ? (
                      <>
                        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 pb-1.5 border-b border-border">
                          {DAY_SHORT[di]} {month + 1}/{day.dayNum}
                        </div>
                        {daySlots.length === 0 && <p className="text-[10px] text-text-tertiary italic mt-2">No slots set up for {DAY_NAMES[di]}</p>}
                        {daySlots.map(slot => {
                          const key = `${day.date}::${slot}`
                          const entry = entries[key]
                          const isEditing = editingCell?.date === day.date && editingCell?.slot === slot
                          return (
                            <div key={slot} className="mt-2">
                              <div className="text-[9px] text-text-tertiary italic">{slot}</div>
                              {isEditing ? (
                                <div className="mt-1 space-y-1.5">
                                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Title..."
                                    className="w-full px-2 py-1 text-[11px] border border-navy rounded outline-none" autoFocus />
                                  <textarea value={editObjective} onChange={e => setEditObjective(e.target.value)} placeholder="Learning objective..."
                                    className="w-full px-2 py-1 text-[10px] border border-border rounded outline-none resize-none" rows={2} />
                                  <div className="flex gap-1">
                                    <button onClick={saveEntry} className="px-2 py-0.5 rounded bg-navy text-white text-[9px] font-medium">Save</button>
                                    <button onClick={() => setEditingCell(null)} className="px-2 py-0.5 rounded bg-surface-alt text-text-secondary text-[9px]">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div onClick={() => { if (canEdit) { setEditingCell({ date: day.date, slot }); setEditTitle(entry?.title || ''); setEditObjective(entry?.objective || '') } }}
                                  className={`mt-0.5 rounded px-1.5 py-1 ${canEdit ? 'cursor-pointer hover:bg-surface-alt' : ''}`}>
                                  {entry?.title ? (
                                    <>
                                      <div className="text-[11px] font-semibold text-navy leading-snug">{entry.title}</div>
                                      {entry.objective && <div className="text-[10px] text-text-secondary leading-snug mt-0.5">{entry.objective}</div>}
                                    </>
                                  ) : (
                                    canEdit && <div className="text-[10px] text-text-tertiary italic">Click to add</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-text-tertiary text-[10px]"></div>
                    )}
                  </div>
                )
              })}
            </div>
            {/* Homework line */}
            <div className="mt-1.5 px-3">
              {editingHomework === weekStart ? (
                <div className="flex items-center gap-2">
                  <input value={editHwText} onChange={e => setEditHwText(e.target.value)} placeholder="This week's homework..."
                    className="flex-1 px-3 py-1 text-[11px] border border-border rounded-lg outline-none focus:border-navy"
                    onKeyDown={e => { if (e.key === 'Enter') saveHomework(weekStart); if (e.key === 'Escape') setEditingHomework(null) }} autoFocus />
                  <button onClick={() => saveHomework(weekStart)} className="px-2 py-1 rounded bg-navy text-white text-[10px] font-medium">Save</button>
                  <button onClick={() => setEditingHomework(null)} className="text-text-tertiary text-[10px]">Cancel</button>
                </div>
              ) : (
                <div onClick={() => { if (canEdit && weekStart) { setEditingHomework(weekStart); setEditHwText(hw?.homework_text || 'Weekly Homework Packet (due Friday)') } }}
                  className={`text-[10px] italic text-text-tertiary ${canEdit ? 'cursor-pointer hover:text-text-secondary' : ''}`}>
                  {hw?.homework_text ? `This week's homework: ${hw.homework_text}` : (canEdit ? 'Click to add homework note...' : '')}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Day Setup Panel ──────────────────────────────────────────────
function DaySetupPanel({ selectedClass, slots, onAdd, onRemove, onClose }: {
  selectedClass: EnglishClass; slots: SlotTemplate[];
  onAdd: (dow: number, label: string) => void; onRemove: (id: string) => void; onClose: () => void
}) {
  const [addingDay, setAddingDay] = useState<number | null>(null)
  const [newLabel, setNewLabel] = useState('')

  return (
    <div className="mb-5 bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-semibold text-navy">Daily Slot Setup for {selectedClass}</h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-alt"><X size={14} /></button>
      </div>
      <p className="text-[11px] text-text-tertiary mb-4">Define what content slots appear on each day of the week. For example, "Phonics" on Monday, "Into Reading" on Tuesday-Thursday, "Reading Groups" on Friday.</p>
      <div className="grid grid-cols-5 gap-3">
        {DAY_NAMES.map((dayName, di) => {
          const daySlots = slots.filter(s => s.day_of_week === di + 1)
          return (
            <div key={di} className="bg-surface-alt rounded-lg p-3">
              <div className="text-[11px] font-bold text-navy mb-2">{dayName}</div>
              <div className="space-y-1">
                {daySlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between bg-white rounded px-2 py-1 border border-border">
                    <span className="text-[10px] text-text-primary">{slot.slot_label}</span>
                    <button onClick={() => onRemove(slot.id)} className="p-0.5 text-text-tertiary hover:text-red-500"><X size={10} /></button>
                  </div>
                ))}
              </div>
              {addingDay === di + 1 ? (
                <div className="mt-2 flex gap-1">
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label..."
                    className="flex-1 px-2 py-1 text-[10px] border border-border rounded outline-none" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onAdd(di + 1, newLabel); setNewLabel(''); setAddingDay(null) }; if (e.key === 'Escape') setAddingDay(null) }} />
                  <button onClick={() => { if (newLabel.trim()) { onAdd(di + 1, newLabel); setNewLabel(''); setAddingDay(null) } }} className="px-1.5 py-0.5 rounded bg-navy text-white text-[9px]">Add</button>
                </div>
              ) : (
                <button onClick={() => setAddingDay(di + 1)} className="mt-2 flex items-center gap-1 text-[10px] text-text-tertiary hover:text-navy">
                  <Plus size={10} /> Add slot
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
