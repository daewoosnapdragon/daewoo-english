'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useClassCounts } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Bell, Plus, X, Loader2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'day_off', label: 'Day Off', color: '#22C55E', bg: 'bg-green-100 text-green-800' },
  { value: 'deadline', label: 'Deadline', color: '#EF4444', bg: 'bg-red-100 text-red-800' },
  { value: 'meeting', label: 'Meeting', color: '#A855F7', bg: 'bg-purple-100 text-purple-800' },
  { value: 'midterm', label: 'Midterm', color: '#F97316', bg: 'bg-orange-100 text-orange-800' },
  { value: 'report_cards', label: 'Report Cards', color: '#0EA5E9', bg: 'bg-sky-100 text-sky-800' },
  { value: 'event', label: 'School Event', color: '#F59E0B', bg: 'bg-amber-100 text-amber-800' },
  { value: 'field_trip', label: 'Field Trip', color: '#14B8A6', bg: 'bg-teal-100 text-teal-800' },
  { value: 'testing', label: 'Testing', color: '#EC4899', bg: 'bg-pink-100 text-pink-800' },
  { value: 'other', label: 'Other', color: '#6B7280', bg: 'bg-gray-100 text-gray-700' },
]

interface CalEvent { id: string; title: string; date: string; type: string; description: string; created_by: string | null; created_at: string }
interface FlaggedEntry { id: string; student_id: string; date: string; type: string; note: string; time: string; behaviors: string[]; intensity: number; teacher_name: string; student_name: string; student_class: string; created_at: string }

export default function DashboardView() {
  const { language, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const [semesters, setSemesters] = useState<{ id: string; name: string; name_ko: string; is_active: boolean }[]>([])
  const [activeSem, setActiveSem] = useState<string>('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semesters').select('id, name, name_ko, is_active').order('start_date', { ascending: false })
      if (data && data.length > 0) {
        setSemesters(data)
        const active = data.find((s: any) => s.is_active)
        setActiveSem(active?.name || data[0].name)
      } else {
        setActiveSem('Spring 2026')
      }
    })()
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-6 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="School Logo" className="w-14 h-14 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <h2 className="font-display text-[22px] font-semibold tracking-tight text-navy">{language === 'ko' ? '대시보드' : 'Dashboard'}</h2>
              <p className="text-text-secondary text-[13px] mt-0.5">{language === 'ko' ? '프로그램 전체 현황' : `Program overview — ${activeSem}`}</p>
            </div>
          </div>
          {semesters.length > 0 && (
            <select value={activeSem} onChange={e => setActiveSem(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map(sem => (
                <option key={sem.id} value={language === 'ko' ? sem.name_ko : sem.name}>
                  {language === 'ko' ? sem.name_ko : sem.name}{sem.is_active ? ' ●' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="px-10 py-6">
        {isAdmin && <AdminAlertPanel />}
        <SharedCalendar />
        <ClassOverviewTable />
      </div>
    </div>
  )
}

// ─── Admin Alert Panel ─────────────────────────────────────────────
function AdminAlertPanel() {
  const { showToast } = useApp()
  const [flagged, setFlagged] = useState<FlaggedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<FlaggedEntry | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('behavior_logs').select('*, teachers(name), students(english_name, english_class)')
        .eq('is_flagged', true).order('created_at', { ascending: false }).limit(20)
      if (data) setFlagged(data.map((r: any) => ({ ...r, teacher_name: r.teachers?.name || '', student_name: r.students?.english_name || '', student_class: r.students?.english_class || '' })))
      setLoading(false)
    })()
  }, [])

  const dismiss = async (id: string) => {
    await supabase.from('behavior_logs').update({ is_flagged: false }).eq('id', id)
    setFlagged(p => p.filter(f => f.id !== id))
    showToast('Flag dismissed')
  }

  if (loading || flagged.length === 0) return null

  return (
    <div className="mb-6 border border-red-200 rounded-xl bg-red-50/50 overflow-hidden">
      <div className="px-5 py-3 bg-red-100/60 border-b border-red-200 flex items-center gap-2">
        <Bell size={16} className="text-red-600" />
        <h3 className="text-[14px] font-semibold text-red-800">Flagged for Your Review</h3>
        <span className="text-[11px] bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-bold ml-1">{flagged.length}</span>
      </div>
      <div className="divide-y divide-red-100 max-h-[280px] overflow-y-auto">
        {flagged.map(e => (
          <div key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-red-50/80 transition-colors cursor-pointer" onClick={() => setDetail(e)}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-red-900">{e.student_name}</span>
                {e.student_class && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: classToColor(e.student_class as EnglishClass), color: classToTextColor(e.student_class as EnglishClass) }}>{e.student_class}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">{e.type.toUpperCase()}</span>
              </div>
              <p className="text-[12px] text-red-800 truncate">{e.note || (e.behaviors || []).join(', ')}</p>
              <p className="text-[10px] text-red-600 mt-0.5">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.time && ` at ${e.time}`} — {e.teacher_name || 'Unknown'}</p>
            </div>
            <button onClick={ev => { ev.stopPropagation(); dismiss(e.id) }} className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-100 flex-shrink-0" title="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setDetail(null)}>
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={ev => ev.stopPropagation()}>
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-[16px] font-semibold text-navy">Flagged — {detail.student_name}</h3>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div><span className="text-text-tertiary">Date</span><p className="font-medium">{new Date(detail.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                <div><span className="text-text-tertiary">Time</span><p className="font-medium">{detail.time || '—'}</p></div>
                <div><span className="text-text-tertiary">Type</span><p className="font-medium capitalize">{detail.type === 'abc' || detail.type === 'negative' ? 'Negative Behavior' : detail.type}</p></div>
                <div><span className="text-text-tertiary">Teacher</span><p className="font-medium">{detail.teacher_name || '—'}</p></div>
              </div>
              {detail.activity && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Activity / Task</p><p className="text-[12px]">{detail.activity}</p></div>}
              {detail.duration && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Duration</p><p className="text-[12px]">{detail.duration}</p></div>}
              {(detail.antecedents || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Antecedent</p>
                  <div className="flex flex-wrap gap-1">{detail.antecedents.map((a: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>)}</div></div>
              )}
              {(detail.behaviors || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Behaviors</p>
                  <div className="flex flex-wrap gap-1">{detail.behaviors.map((b: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b}</span>)}</div></div>
              )}
              {(detail.consequences || []).length > 0 && (
                <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Consequence</p>
                  <div className="flex flex-wrap gap-1">{detail.consequences.map((c: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{c}</span>)}</div></div>
              )}
              {detail.intensity > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-tertiary font-semibold uppercase">Intensity:</span>
                  {[1,2,3,4,5].map(i => <div key={i} className={`w-4 h-4 rounded-full ${i <= detail.intensity ? (detail.intensity >= 4 ? 'bg-red-500' : detail.intensity >= 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`} />)}
                </div>
              )}
              {detail.frequency > 1 && <div><span className="text-[10px] text-text-tertiary font-semibold uppercase">Frequency:</span><span className="text-[12px] ml-1">{detail.frequency}x</span></div>}
              {detail.note && <div><p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Notes</p><p className="text-[13px] whitespace-pre-wrap">{detail.note}</p></div>}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between">
              <button onClick={() => { dismiss(detail.id); setDetail(null) }} className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-600 hover:bg-red-50">Dismiss Flag</button>
              <button onClick={() => setDetail(null)} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared Calendar ───────────────────────────────────────────────
function SharedCalendar() {
  const { showToast, currentTeacher } = useApp()
  const [cur, setCur] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selDay, setSelDay] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const y = cur.getFullYear(), m = cur.getMonth()
  const first = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const today = new Date().toISOString().split('T')[0]

  const [tableError, setTableError] = useState(false)

  const load = useCallback(async () => {
    const s = `${y}-${String(m+1).padStart(2,'0')}-01`
    const e = `${y}-${String(m+1).padStart(2,'0')}-${days}`
    const { data, error } = await supabase.from('calendar_events').select('*').gte('date', s).lte('date', e).order('date')
    if (error) {
      console.warn('Calendar table error:', error.message)
      setTableError(true)
    } else {
      if (data) setEvents(data)
      setTableError(false)
    }
    setLoading(false)
  }, [y, m, days])

  useEffect(() => { load() }, [load])

  const dayEvts = (d: string) => events.filter(e => e.date === d)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    showToast('Deleted'); load()
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dayN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[16px] font-semibold text-navy">{months[m]} {y}</h3>
          <div className="flex items-center gap-1">
            <button onClick={() => setCur(new Date(y, m-1, 1))} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronLeft size={16} /></button>
            <button onClick={() => setCur(new Date(y, m+1, 1))} className="p-1.5 rounded-lg hover:bg-surface-alt"><ChevronRight size={16} /></button>
            <button onClick={() => setCur(new Date())} className="px-2 py-1 rounded text-[11px] font-medium text-navy hover:bg-accent-light ml-1">Today</button>
          </div>
        </div>
        <button onClick={() => { if (tableError) { showToast('Run the SQL migration first to create the calendar_events table'); return }; setShowAdd(true); if (!selDay) setSelDay(today) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Plus size={13} /> Add Event</button>
      </div>

      {/* Legend */}
      <div className="px-5 py-2 bg-surface-alt/50 border-b border-border flex gap-3 flex-wrap">
        {EVENT_TYPES.map(t => (
          <span key={t.value} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>

      {/* Table setup needed */}
      {tableError && (
        <div className="mx-5 my-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[13px] font-medium text-amber-800 mb-1">Calendar table needs setup</p>
          <p className="text-[11px] text-amber-700">Run the SQL migration in Supabase SQL Editor to create the <code className="bg-amber-100 px-1 rounded">calendar_events</code> table. See the migration file included in the deployment package.</p>
          <button onClick={() => load()} className="mt-2 px-3 py-1 rounded text-[11px] font-medium bg-amber-200 text-amber-800 hover:bg-amber-300">Retry</button>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-1">
          {dayN.map(d => <div key={d} className="text-center text-[10px] uppercase tracking-wider text-text-tertiary font-semibold py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} className="bg-surface-alt/50 min-h-[80px]" />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const evts = dayEvts(dateStr)
            const isToday = dateStr === today
            const isSelected = dateStr === selDay
            const isWeekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6

            return (
              <div key={d} onClick={() => setSelDay(dateStr)}
                className={`bg-surface min-h-[80px] p-1.5 cursor-pointer transition-all hover:bg-accent-light/50 ${isSelected ? 'ring-2 ring-navy ring-inset' : ''} ${isWeekend ? 'bg-surface-alt/30' : ''}`}>
                <div className={`text-[11px] font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-navy text-white' : 'text-text-primary'}`}>{d}</div>
                <div className="space-y-0.5">
                  {evts.slice(0, 3).map(ev => {
                    const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)
                    return (
                      <div key={ev.id} className="text-[9px] px-1 py-0.5 rounded truncate font-medium" style={{ backgroundColor: `${typeInfo?.color || '#6B7280'}20`, color: typeInfo?.color || '#6B7280' }}>
                        {ev.title}
                      </div>
                    )
                  })}
                  {evts.length > 3 && <div className="text-[9px] text-text-tertiary text-center">+{evts.length - 3} more</div>}
                </div>
              </div>
            )
          })}
          {Array.from({ length: (7 - (first + days) % 7) % 7 }).map((_, i) => <div key={`t${i}`} className="bg-surface-alt/50 min-h-[80px]" />)}
        </div>
      </div>

      {/* Day Detail Modal */}
      {selDay && (
        <div className="px-5 pb-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[14px] font-semibold text-navy">
              {new Date(selDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowAdd(true) }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent-light text-navy hover:bg-accent-light/80"><Plus size={11} /> Add</button>
              <button onClick={() => setSelDay(null)} className="p-1 rounded hover:bg-surface-alt"><X size={14} /></button>
            </div>
          </div>
          {dayEvts(selDay).length === 0 ? (
            <p className="text-[12px] text-text-tertiary italic py-3">No events this day.</p>
          ) : (
            <div className="space-y-2">
              {dayEvts(selDay).map(ev => {
                const typeInfo = EVENT_TYPES.find(t => t.value === ev.type)
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-surface-alt/30">
                    <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: typeInfo?.color || '#6B7280' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium">{ev.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${typeInfo?.bg || 'bg-gray-100 text-gray-700'}`}>{typeInfo?.label || ev.type}</span>
                      </div>
                      {ev.description && <p className="text-[11px] text-text-secondary mt-0.5">{ev.description}</p>}
                    </div>
                    <button onClick={() => handleDelete(ev.id)} className="p-1 rounded hover:bg-surface-alt text-text-tertiary hover:text-danger"><Trash2 size={13} /></button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {showAdd && <AddEventModal date={selDay || today} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddEventModal({ date, onClose, onSaved }: { date: string; onClose: () => void; onSaved: () => void }) {
  const { currentTeacher, showToast } = useApp()
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(date)
  const [type, setType] = useState('lesson_plan')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('calendar_events').insert({ title: title.trim(), date: eventDate, type, description: desc.trim(), created_by: currentTeacher?.id || null })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast('Event added'); onSaved() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-navy">Add Calendar Event</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Phonics Unit 3 Lesson Plan" autoFocus
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select></div>
          </div>
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Description <span className="normal-case text-text-tertiary">(opt)</span></label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Details..."
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
          {/* Type color preview */}
          <div className="flex flex-wrap gap-1.5">
            {EVENT_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${type === t.value ? 'border-navy bg-navy text-white' : 'border-border bg-surface hover:border-navy/30'}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: type === t.value ? '#fff' : t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Add Event
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Class Overview Table ──────────────────────────────────────────
function ClassOverviewTable() {
  const { language } = useApp()
  const { counts, loading } = useClassCounts()
  const totalStudents = counts.reduce((a, c) => a + c.count, 0)

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="font-display text-base font-semibold text-navy">{language === 'ko' ? '반별 학생 수' : 'Students by Class'}</h3>
      </div>
      <div className="p-5">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              <th className="text-left px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">{language === 'ko' ? '학년' : 'Grade'}</th>
              {ENGLISH_CLASSES.map(cls => (
                <th key={cls} className="text-center px-2 py-2">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                </th>
              ))}
              <th className="text-center px-2 py-2 text-[11px] uppercase tracking-wider text-text-secondary font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {[2,3,4,5].map(grade => {
              const gradeTotal = counts.filter(c => c.grade === grade).reduce((a, c) => a + c.count, 0)
              return (
                <tr key={grade} className="border-t border-border">
                  <td className="px-2 py-2.5 font-semibold text-navy">Grade {grade}</td>
                  {ENGLISH_CLASSES.map(cls => {
                    const c = counts.find(c => c.grade === grade && c.english_class === cls)
                    return <td key={cls} className="text-center px-2 py-2.5 font-medium">{c?.count || <span className="text-text-tertiary">—</span>}</td>
                  })}
                  <td className="text-center px-2 py-2.5 font-bold text-navy">{gradeTotal || '—'}</td>
                </tr>
              )
            })}
            <tr className="border-t-2 border-navy/20">
              <td className="px-2 py-2.5 font-bold text-navy">Total</td>
              {ENGLISH_CLASSES.map(cls => {
                const total = counts.filter(c => c.english_class === cls).reduce((a, c) => a + c.count, 0)
                return <td key={cls} className="text-center px-2 py-2.5 font-bold">{total || '—'}</td>
              })}
              <td className="text-center px-2 py-2.5 font-bold text-gold text-lg">{totalStudents || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
