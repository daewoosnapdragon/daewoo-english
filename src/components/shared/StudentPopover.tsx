'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useApp } from '@/lib/context'
import { Loader2, X, BookOpen, BarChart3, AlertTriangle, MessageSquare } from 'lucide-react'
import WIDABadge from './WIDABadge'

interface PopoverData {
  reading: { cwpm: number; date: string } | null
  gradeAvg: number | null
  behaviorCount: number
  attendanceRate: number | null
  note: string
}

export default function StudentPopover({ studentId, name, koreanName, trigger }: {
  studentId: string; name: string; koreanName?: string; trigger: React.ReactNode
}) {
  const { currentTeacher } = useApp()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<PopoverData | null>(null)
  const [loading, setLoading] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const saveNote = async () => {
    if (!noteText.trim() || !currentTeacher) return
    setSavingNote(true)
    await supabase.from('student_notes').insert({
      student_id: studentId, teacher_id: currentTeacher.id, note: noteText.trim(),
    })
    setData(prev => prev ? { ...prev, note: noteText.trim() } : prev)
    setNoteText('')
    setSavingNote(false)
  }

  const loadData = async () => {
    if (data) { setOpen(true); return }
    setOpen(true); setLoading(true)
    const [readingRes, gradesRes, behaviorRes, attRes, noteRes] = await Promise.all([
      supabase.from('reading_assessments').select('cwpm, date').eq('student_id', studentId).order('date', { ascending: false }).limit(1),
      supabase.from('grades').select('score, assessments(max_score)').eq('student_id', studentId).not('score', 'is', null).limit(50),
      supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('student_notes').select('note').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1),
    ])

    const reading = readingRes.data?.[0] ? { cwpm: readingRes.data[0].cwpm, date: readingRes.data[0].date } : null
    let gradeAvg: number | null = null
    if (gradesRes.data && gradesRes.data.length > 0) {
      const pcts = gradesRes.data.map((g: any) => g.assessments?.max_score > 0 ? (g.score / g.assessments.max_score) * 100 : 0).filter((p: number) => p > 0)
      if (pcts.length > 0) gradeAvg = Math.round(pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length)
    }
    const behaviorCount = behaviorRes.count || 0
    let attendanceRate: number | null = null
    if (attRes.data && attRes.data.length > 0) {
      const present = attRes.data.filter((a: any) => a.status === 'present').length
      attendanceRate = Math.round((present / attRes.data.length) * 100)
    }

    setData({ reading, gradeAvg, behaviorCount, attendanceRate, note: noteRes.data?.[0]?.note || '' })
    setLoading(false)
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <span onClick={loadData} className="cursor-pointer hover:underline decoration-dotted underline-offset-2">{trigger}</span>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-[80] w-72 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-semibold text-navy">{name}</p>
              {koreanName && <p className="text-[11px] text-text-tertiary">{koreanName}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <WIDABadge studentId={studentId} compact />
              <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-surface-alt"><X size={14} className="text-text-tertiary" /></button>
            </div>
          </div>
          {loading ? <div className="py-4 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div> :
          data && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-text-secondary"><BookOpen size={12} /> Last CWPM</span>
                {data.reading ? <span className="font-bold text-navy">{Math.round(data.reading.cwpm)}</span> : <span className="text-text-tertiary">--</span>}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-text-secondary"><BarChart3 size={12} /> Grade Avg</span>
                {data.gradeAvg != null ? <span className={`font-bold ${data.gradeAvg >= 80 ? 'text-green-600' : data.gradeAvg >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{data.gradeAvg}%</span> : <span className="text-text-tertiary">--</span>}
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 text-text-secondary"><AlertTriangle size={12} /> Behavior Logs</span>
                <span className="font-bold text-navy">{data.behaviorCount}</span>
              </div>
              {data.attendanceRate != null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-secondary">Attendance</span>
                  <span className={`font-bold ${data.attendanceRate >= 95 ? 'text-green-600' : data.attendanceRate >= 85 ? 'text-amber-600' : 'text-red-600'}`}>{data.attendanceRate}%</span>
                </div>
              )}
              {/* Quick note */}
              {data.note && <p className="text-[10px] text-text-secondary bg-surface-alt rounded-lg px-2.5 py-1.5 mt-2 italic"><MessageSquare size={10} className="inline mr-1 text-text-tertiary" />{data.note}</p>}
              <div className="pt-2 border-t border-border mt-2">
                <div className="flex gap-1.5">
                  <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Quick note..." onKeyDown={e => { if (e.key === 'Enter') saveNote() }}
                    className="flex-1 px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy" />
                  <button onClick={saveNote} disabled={savingNote || !noteText.trim()} className="px-2 py-1 rounded bg-navy text-white text-[10px] font-medium disabled:opacity-40">
                    {savingNote ? '...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
