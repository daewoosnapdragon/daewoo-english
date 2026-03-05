'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, X, CheckCircle2, Circle, Users, Calendar } from 'lucide-react'

const MEETING_TYPES = [
  { value: 'team', label: 'Team Meeting' },
  { value: 'grade_level', label: 'Grade-Level Meeting' },
  { value: 'one_on_one', label: 'One-on-One' },
  { value: 'admin', label: 'Admin Check-in' },
  { value: 'pd', label: 'PD Session' },
  { value: 'parent', label: 'Parent Meeting' },
]

export default function MeetingNotesView() {
  const { currentTeacher, showToast, language } = useApp()
  const ko = language === 'ko'
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'team', title: '', notes: '', action_items: '' as string, attendees: '' })
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('meeting_notes').select('*').order('meeting_date', { ascending: false })
      setMeetings(data || [])
      setLoading(false)
    })()
  }, [])

  const handleAdd = async () => {
    if (!form.title.trim() || !currentTeacher) return
    const actions = form.action_items.split('\n').filter(Boolean).map(line => {
      const parts = line.split('|')
      return { task: parts[0]?.trim() || '', assignee: parts[1]?.trim() || '', done: false }
    })
    const { data, error } = await supabase.from('meeting_notes').insert({
      meeting_type: form.type, title: form.title.trim(), notes: form.notes.trim() || null,
      action_items: actions.length > 0 ? actions : null,
      attendees: form.attendees ? form.attendees.split(',').map(a => a.trim()).filter(Boolean) : null,
      created_by: currentTeacher.id, meeting_date: new Date().toISOString(),
    }).select().single()
    if (error) { showToast('Error saving'); return }
    if (data) setMeetings(prev => [data, ...prev])
    setForm({ type: 'team', title: '', notes: '', action_items: '', attendees: '' })
    setShowForm(false)
    showToast('Meeting notes saved')
  }

  const toggleAction = async (meetingId: string, actionIdx: number) => {
    const meeting = meetings.find(m => m.id === meetingId)
    if (!meeting?.action_items) return
    const updated = [...meeting.action_items]
    updated[actionIdx] = { ...updated[actionIdx], done: !updated[actionIdx].done }
    await supabase.from('meeting_notes').update({ action_items: updated }).eq('id', meetingId)
    setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, action_items: updated } : m))
    if (selected?.id === meetingId) setSelected({ ...selected, action_items: updated })
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const typeLabel = (t: string) => MEETING_TYPES.find(m => m.value === t)?.label || t

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-10 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{ko ? '회의 기록' : 'Meeting Notes'}</h1>
          <p className="text-[13px] text-text-secondary mt-1">{ko ? '팀 회의, 등급별 회의, 일대일 기록' : 'Team meetings, grade-level meetings, and one-on-ones with action items.'}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 rounded-xl text-[13px] font-medium bg-navy text-white hover:bg-navy-dark">
          {showForm ? 'Cancel' : '+ New Meeting'}
        </button>
      </div>

      <div className="px-10 py-6">
        {showForm && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-6 space-y-3">
            <div className="flex gap-1 flex-wrap">
              {MEETING_TYPES.map(mt => (
                <button key={mt.value} onClick={() => setForm(f => ({ ...f, type: mt.value }))}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${form.type === mt.value ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border'}`}>
                  {mt.label}
                </button>
              ))}
            </div>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" />
            <input value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} placeholder="Attendees (comma-separated)"
              className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Meeting notes and discussion points"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-24" />
            <div>
              <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">Action Items (one per line, use | to separate task from assignee)</label>
              <textarea value={form.action_items} onChange={e => setForm(f => ({ ...f, action_items: e.target.value }))}
                placeholder={"Review reading data for Daisy | Sarah\nUpdate WIDA profiles | Kyla\nPrepare parent letters | All teachers"}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-20 font-mono" />
            </div>
            <button onClick={handleAdd} disabled={!form.title.trim()} className="px-5 py-2.5 rounded-xl text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">Save Meeting Notes</button>
          </div>
        )}

        {selected ? (
          <div>
            <button onClick={() => setSelected(null)} className="text-[12px] text-text-tertiary hover:text-navy mb-3 inline-flex items-center gap-1"><X size={14} /> Back to all meetings</button>
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase">{typeLabel(selected.meeting_type)}</span>
                  <h2 className="text-[16px] font-bold text-navy mt-2">{selected.title}</h2>
                  <p className="text-[11px] text-text-tertiary mt-1">
                    <Calendar size={12} className="inline mr-1" />{new Date(selected.meeting_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    {selected.attendees?.length > 0 && <><span className="mx-2">|</span><Users size={12} className="inline mr-1" />{selected.attendees.join(', ')}</>}
                  </p>
                </div>
              </div>
              {selected.notes && <p className="text-[13px] text-text-primary leading-relaxed whitespace-pre-wrap mb-4">{selected.notes}</p>}
              {selected.action_items?.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Action Items</h3>
                  <div className="space-y-2">
                    {selected.action_items.map((ai: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <button onClick={() => toggleAction(selected.id, i)}>
                          {ai.done ? <CheckCircle2 size={16} className="text-green-500" /> : <Circle size={16} className="text-text-tertiary" />}
                        </button>
                        <span className={`text-[12px] flex-1 ${ai.done ? 'line-through text-text-tertiary' : ''}`}>{ai.task}</span>
                        {ai.assignee && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary">{ai.assignee}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.length === 0 && <p className="text-center text-text-tertiary py-12 text-[13px]">No meeting notes yet.</p>}
            {meetings.map(m => {
              const actionsDone = (m.action_items || []).filter((a: any) => a.done).length
              const actionsTotal = (m.action_items || []).length
              return (
                <button key={m.id} onClick={() => setSelected(m)} className="w-full text-left bg-surface border border-border rounded-xl px-5 py-4 hover:shadow-sm hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase">{typeLabel(m.meeting_type)}</span>
                    <span className="text-[10px] text-text-tertiary ml-auto">{new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <h3 className="text-[14px] font-semibold text-navy">{m.title}</h3>
                  {actionsTotal > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden max-w-[120px]">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(actionsDone / actionsTotal) * 100}%` }} />
                      </div>
                      <span className="text-[9px] text-text-tertiary">{actionsDone}/{actionsTotal} actions done</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
