'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ALL_ENGLISH_CLASSES, EnglishClass } from '@/types'
import { getDisplayName, getKSTDateString } from '@/lib/utils'
import { X, Loader2, Check } from 'lucide-react'
import { loadDayStatus, type DayStatus } from '@/lib/calendarDays'

// ─── Attendance drawer ───────────────────────────────────────────
// Opened from a class period on the dashboard schedule. That grade's students
// in the teacher's class, everyone preselected present, P/A/T per student,
// one Save. Writes the same rows as the Attendance screen (upsert on
// student_id + date), so the two never disagree.

type Status = 'present' | 'absent' | 'tardy'
interface Row { id: string; english_name: string; korean_name: string; class_number: number }

export const ATTENDANCE_SAVED_EVENT = 'daewoo:attendance-saved'

export default function AttendanceDrawer({ grade, onClose }: { grade: number; onClose: () => void }) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const [cls, setCls] = useState<EnglishClass>((isAdmin ? 'Snapdragon' : currentTeacher?.english_class || 'Snapdragon') as EnglishClass)
  const [students, setStudents] = useState<Row[]>([])
  const [records, setRecords] = useState<Record<string, { status: Status; note: string }>>({})
  const [existingCount, setExistingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState(0)
  const [day, setDay] = useState<DayStatus>({ off: null, trip: null })
  const today = getKSTDateString()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data: st } = await supabase.from('students').select('id, english_name, korean_name, class_number')
        .eq('is_active', true).eq('grade', grade).eq('english_class', cls).order('english_name')
      if (cancelled) return
      const rows = (st || []) as Row[]
      setStudents(rows)
      const ds = await loadDayStatus(today, grade)
      if (cancelled) return
      setDay(ds)
      const init: Record<string, { status: Status; note: string }> = {}
      rows.forEach(r => { init[r.id] = ds.trip ? { status: 'absent', note: ds.trip } : { status: 'present', note: '' } })
      if (rows.length) {
        const { data: att } = await supabase.from('attendance').select('student_id, status, note').eq('date', today).in('student_id', rows.map(r => r.id))
        if (cancelled) return
        ;(att || []).forEach((a: any) => { init[a.student_id] = { status: a.status, note: a.note || '' } })
        setExistingCount((att || []).length)
      } else setExistingCount(0)
      setRecords(init)
      setFocus(0)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [grade, cls, today])

  const setStatus = (id: string, status: Status) => setRecords(prev => ({ ...prev, [id]: { status, note: status === 'present' ? '' : (prev[id]?.note || '') } }))
  const setNote = (id: string, note: string) => setRecords(prev => ({ ...prev, [id]: { ...prev[id], note } }))

  // P / A / T on the focused row, arrows to move, Escape to close, ⌘↩ to save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === 'Escape') { onClose(); return }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { save(); return }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(f => Math.min(f + 1, students.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => Math.max(f - 1, 0)) }
      const s = students[focus]
      if (!s) return
      const k = e.key.toLowerCase()
      if (k === 'p') setStatus(s.id, 'present')
      if (k === 'a') setStatus(s.id, 'absent')
      if (k === 't') setStatus(s.id, 'tardy')
      if (k === 'p' || k === 'a' || k === 't') setFocus(f => Math.min(f + 1, students.length - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, tardy: 0 }
    Object.values(records).forEach(r => { c[r.status]++ })
    return c
  }, [records])

  const save = async () => {
    if (saving || students.length === 0) return
    setSaving(true)
    const entries = students.map(s => ({ student_id: s.id, date: today, status: records[s.id]?.status || 'present', note: records[s.id]?.note || '', recorded_by: currentTeacher?.id || null }))
    const { error } = await supabase.from('attendance').upsert(entries, { onConflict: 'student_id,date' })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(lang === 'ko' ? `${grade}학년 ${cls} 출석 저장됨` : `Saved attendance for Grade ${grade} · ${cls}`)
    window.dispatchEvent(new Event(ATTENDANCE_SAVED_EVENT))
    onClose()
  }

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const seg = (on: boolean, tone: string) => `w-9 h-8 text-[12px] font-bold border-l first:border-l-0 border-rule-2 ${on ? tone : 'text-ink-3 hover:bg-paper-2'}`

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[440px] bg-surface border-l border-rule-2 shadow-2xl flex flex-col animate-slide-in">
        <div className="px-5 pt-4 pb-3 border-b border-rule-2 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow eyebrow-accent">{lang === 'ko' ? '출석' : 'Attendance'} · {dateLabel}</p>
            <h2 className="font-display text-[26px] leading-none text-ink mt-1">{lang === 'ko' ? `${grade}학년` : `Grade ${grade}`} <span className="text-ink-3">· {cls}</span></h2>
            {isAdmin && (
              <select id="drawer-class" value={cls} onChange={e => setCls(e.target.value as EnglishClass)} className="mt-2 h-7 px-2 bg-surface border border-rule-2 rounded text-[12px] text-ink">
                {ALL_ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
          ) : students.length === 0 ? (
            <p className="p-6 text-[13px] text-ink-3">{lang === 'ko' ? '이 학년·반에 학생이 없습니다.' : `No Grade ${grade} students in ${cls}.`}</p>
          ) : (
            <div className="divide-y divide-rule">
              {day.off && <p className="px-5 py-2 text-[12px] text-warn bg-warn-soft">{lang === 'ko' ? `휴일 (${day.off}): 출석이 필요하지 않습니다.` : `Day off (${day.off}): no attendance expected today.`}</p>}
              {day.trip && !day.off && <p className="px-5 py-2 text-[12px] text-info bg-info-soft">{lang === 'ko' ? `현장학습 (${day.trip}): 전원 결석으로 미리 표시됨.` : `Field trip (${day.trip}): everyone preset to absent with the trip as the reason.`}</p>}
              {existingCount > 0 && <p className="px-5 py-2 text-[11.5px] text-ink-3 bg-paper-2">{lang === 'ko' ? `오늘 이미 ${existingCount}명 기록됨 · 수정 가능` : `${existingCount} already marked today · you can change them`}</p>}
              {students.map((s, i) => {
                const r = records[s.id] || { status: 'present' as Status, note: '' }
                return (
                  <div key={s.id} onClick={() => setFocus(i)} className={`px-5 py-2 grid grid-cols-[1fr_auto] gap-3 items-center ${focus === i ? 'bg-paper-2' : ''}`}>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink truncate">{getDisplayName(s)} <span className="text-ink-3 font-normal text-[12.5px] ml-1">{s.korean_name}</span></p>
                      {r.status !== 'present' && (
                        <input id={`note-${s.id}`} value={r.note} onChange={e => setNote(s.id, e.target.value)}
                          placeholder={lang === 'ko' ? '메모 (선택)' : 'Note (optional)'}
                          className="mt-1 w-full h-7 px-2 bg-surface border border-rule-2 rounded text-[12px] text-ink placeholder:text-ink-3" />
                      )}
                    </div>
                    <div className="inline-flex border border-rule-2 rounded overflow-hidden bg-surface">
                      <button onClick={() => setStatus(s.id, 'present')} className={seg(r.status === 'present', 'bg-good text-white')}>P</button>
                      <button onClick={() => setStatus(s.id, 'absent')} className={seg(r.status === 'absent', 'bg-bad text-white')}>A</button>
                      <button onClick={() => setStatus(s.id, 'tardy')} className={seg(r.status === 'tardy', 'bg-warn text-white')}>T</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-rule-2 bg-paper-2 flex items-center gap-3">
          <span className="text-[12px] text-ink-2 tabular-nums">
            <span className="text-good font-semibold">{counts.present}</span> P · <span className="text-bad font-semibold">{counts.absent}</span> A · <span className="text-warn font-semibold">{counts.tardy}</span> T
          </span>
          <span className="text-[11px] text-ink-3 hidden sm:inline">P A T · ↑↓ · ⌘↩</span>
          <button onClick={save} disabled={saving || loading || students.length === 0}
            className="ml-auto h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {lang === 'ko' ? `${students.length}명 저장` : `Save ${students.length}`}
          </button>
        </div>
      </aside>
    </div>
  )
}
