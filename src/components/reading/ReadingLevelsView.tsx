'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, ChevronDown, BookOpen, TrendingUp, User, Users } from 'lucide-react'

type LangKey = 'en' | 'ko'
interface ReadingRecord {
  id: string; student_id: string; date: string; passage_title: string; passage_level: string;
  word_count: number; time_seconds: number; errors: number; self_corrections: number;
  cwpm: number; accuracy_rate: number; reading_level: string; notes: string; assessed_by: string
}

// Grade-level CWPM benchmarks (beginning / mid / end of year)
const CWPM_BENCHMARKS: Record<number, { below: number; approaching: number; proficient: number; advanced: number }> = {
  1: { below: 30, approaching: 53, proficient: 80, advanced: 100 },
  2: { below: 50, approaching: 72, proficient: 100, advanced: 120 },
  3: { below: 70, approaching: 92, proficient: 120, advanced: 145 },
  4: { below: 85, approaching: 110, proficient: 140, advanced: 165 },
  5: { below: 100, approaching: 127, proficient: 155, advanced: 180 },
  6: { below: 110, approaching: 140, proficient: 170, advanced: 195 },
}

export default function ReadingLevelsView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [subView, setSubView] = useState<'class' | 'student' | 'groups'>('class')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForStudentId, setAddForStudentId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ENGLISH_CLASSES
  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">Reading Fluency</h2>
            <p className="text-text-secondary text-sm mt-1">{selectedClass} · Grade {selectedGrade} · {students.length} students</p>
          </div>
          <button onClick={() => { setShowAddModal(true); setAddForStudentId(selectedStudentId || (students[0]?.id || null)) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
            <Plus size={15} /> Add ORF Record
          </button>
        </div>
        <div className="flex gap-1 mt-4">
          {([
            { id: 'class', icon: BookOpen, label: 'Class Overview' },
            { id: 'student', icon: User, label: 'Student Detail' },
            { id: 'groups', icon: Users, label: 'Fluency Groups' },
          ] as const).map((tab) => (
            <button key={tab.id} onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${subView === tab.id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-10 py-6">
        <div className="flex items-center gap-3 mb-5">
          <select value={selectedGrade} onChange={(e: any) => setSelectedGrade(Number(e.target.value) as Grade)}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map((g: any) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map((cls: any) => (
                <button key={cls} onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${selectedClass === cls ? 'text-white shadow-sm' : 'hover:opacity-80'}`}
                  style={{ backgroundColor: selectedClass === cls ? classToTextColor(cls) : classToColor(cls), color: selectedClass === cls ? 'white' : classToTextColor(cls) }}>
                  {cls}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white" style={{ backgroundColor: classToTextColor(selectedClass) }}>{selectedClass}</div>
          )}
        </div>

        {subView === 'class' && <ClassOverview key={refreshKey} students={students} loading={loadingStudents} lang={lang} grade={selectedGrade} onAddRecord={(sid: string) => { setAddForStudentId(sid); setShowAddModal(true) }} onSelectStudent={(sid: string) => { setSelectedStudentId(sid); setSubView('student') }} />}
        {subView === 'student' && <StudentReadingView key={refreshKey} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} grade={selectedGrade} onAddRecord={(sid: string) => { setAddForStudentId(sid); setShowAddModal(true) }} />}
        {subView === 'groups' && <FluencyGroups key={refreshKey} students={students} loading={loadingStudents} lang={lang} grade={selectedGrade} />}
      </div>

      {showAddModal && <AddReadingModal studentId={addForStudentId} students={students} lang={lang} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); setRefreshKey((k: number) => k + 1) }} />}
    </div>
  )
}

// ─── Class Overview ─────────────────────────────────────────────────

function ClassOverview({ students, loading, lang, grade, onAddRecord, onSelectStudent }: {
  students: any[]; loading: boolean; lang: LangKey; grade: number; onAddRecord: (sid: string) => void; onSelectStudent: (sid: string) => void
}) {
  const [latestRecords, setLatestRecords] = useState<Record<string, ReadingRecord>>({})
  const [loadingRecords, setLoadingRecords] = useState(true)

  useEffect(() => {
    if (students.length === 0) { setLoadingRecords(false); return }
    ;(async () => {
      setLoadingRecords(true)
      const { data } = await supabase.from('reading_assessments').select('*')
        .in('student_id', students.map((s: any) => s.id)).order('date', { ascending: false })
      const map: Record<string, ReadingRecord> = {}
      if (data) data.forEach((r: any) => { if (!map[r.student_id]) map[r.student_id] = r })
      setLatestRecords(map)
      setLoadingRecords(false)
    })()
  }, [students])

  if (loading || loadingRecords) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const bench = CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[4]

  const getBand = (cwpm: number) => {
    if (cwpm >= bench.advanced) return { label: 'Advanced', color: 'bg-blue-100 text-blue-700 border-blue-300' }
    if (cwpm >= bench.proficient) return { label: 'Proficient', color: 'bg-green-100 text-green-700 border-green-300' }
    if (cwpm >= bench.approaching) return { label: 'Approaching', color: 'bg-amber-100 text-amber-700 border-amber-300' }
    return { label: 'Below', color: 'bg-red-100 text-red-700 border-red-300' }
  }

  return (
    <div>
      {/* Benchmark legend */}
      <div className="flex items-center gap-4 mb-4 text-[11px]">
        <span className="text-text-tertiary font-semibold">Grade {grade} Benchmarks:</span>
        <span className="px-2 py-0.5 rounded border bg-red-100 text-red-700 border-red-300">Below &lt;{bench.approaching}</span>
        <span className="px-2 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-300">Approaching {bench.approaching}-{bench.proficient - 1}</span>
        <span className="px-2 py-0.5 rounded border bg-green-100 text-green-700 border-green-300">Proficient {bench.proficient}-{bench.advanced - 1}</span>
        <span className="px-2 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-300">Advanced {bench.advanced}+</span>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">CWPM</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">Level</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-28">Passage Lexile</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">Accuracy</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-28">Last Assessed</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-16"></th>
          </tr></thead>
          <tbody>
            {students.map((s: any, i: number) => {
              const rec = latestRecords[s.id]
              const band = rec?.cwpm != null ? getBand(rec.cwpm) : null
              return (
                <tr key={s.id} className="border-t border-border table-row-hover cursor-pointer" onClick={() => onSelectStudent(s.id)}>
                  <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                  <td className="px-4 py-2.5"><span className="font-medium">{s.english_name}</span><span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span></td>
                  <td className="px-4 py-2.5 text-center font-bold text-navy text-[15px]">{rec?.cwpm != null ? Math.round(rec.cwpm) : '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {band ? <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${band.color}`}>{band.label}</span> : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[12px] text-text-secondary">{rec?.passage_level || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {rec?.accuracy_rate != null ? (
                      <span className={`font-semibold ${rec.accuracy_rate >= 95 ? 'text-green-600' : rec.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{rec.accuracy_rate.toFixed(1)}%</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center text-[11px] text-text-tertiary">
                    {rec?.date ? new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={(ev: any) => { ev.stopPropagation(); onAddRecord(s.id) }} className="text-[10px] text-navy hover:underline font-medium">+ Add</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Student Reading View ───────────────────────────────────────────

function StudentReadingView({ students, selectedStudentId, setSelectedStudentId, lang, grade, onAddRecord }: {
  students: any[]; selectedStudentId: string | null; setSelectedStudentId: (id: string | null) => void; lang: LangKey; grade: number; onAddRecord: (sid: string) => void
}) {
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const selected = students.find((s: any) => s.id === selectedStudentId)
  const bench = CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[4]

  useEffect(() => {
    if (!selectedStudentId) return
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('reading_assessments').select('*').eq('student_id', selectedStudentId).order('date', { ascending: true })
      if (data) setRecords(data)
      setLoading(false)
    })()
  }, [selectedStudentId])

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">Select Student</label>
        <select value={selectedStudentId || ''} onChange={(e: any) => setSelectedStudentId(e.target.value || null)}
          className="w-full max-w-sm px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
          <option value="">Choose a student...</option>
          {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
        </select>
      </div>

      {selected && !loading && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-accent-light border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold text-navy">{selected.english_name}<span className="text-text-tertiary ml-2 text-[14px] font-normal">{selected.korean_name}</span></h3>
              <p className="text-[12px] text-text-secondary mt-0.5">{records.length} reading assessments</p>
            </div>
            <button onClick={() => onAddRecord(selected.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
              <Plus size={12} /> Add Record
            </button>
          </div>

          {records.length > 0 ? (
            <>
              {/* CWPM Chart — bigger, with Lexile context and benchmark lines */}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3 flex items-center gap-1"><TrendingUp size={13} /> CWPM Progression <span className="normal-case font-normal">— passage Lexile shown on each bar</span></p>
                <div className="relative" style={{ height: '200px' }}>
                  {/* Benchmark lines */}
                  {[
                    { val: bench.approaching, label: 'Approaching', color: '#F59E0B' },
                    { val: bench.proficient, label: 'Proficient', color: '#22C55E' },
                    { val: bench.advanced, label: 'Advanced', color: '#3B82F6' },
                  ].map((line) => {
                    const maxCwpm = Math.max(...records.map((r: any) => r.cwpm || 0), line.val + 20)
                    const top = ((1 - line.val / maxCwpm) * 100)
                    return top > 0 && top < 100 ? (
                      <div key={line.label} className="absolute left-0 right-0 flex items-center" style={{ top: `${top}%` }}>
                        <div className="flex-1 border-t border-dashed" style={{ borderColor: line.color, opacity: 0.4 }} />
                        <span className="text-[8px] font-bold ml-1 whitespace-nowrap" style={{ color: line.color }}>{line.val} {line.label}</span>
                      </div>
                    ) : null
                  })}
                  <div className="flex items-end gap-2 h-full relative z-10">
                    {records.map((r: any, i: number) => {
                      const maxCwpm = Math.max(...records.map((x: any) => x.cwpm || 0), bench.advanced + 20)
                      const height = ((r.cwpm || 0) / maxCwpm) * 100
                      const barColor = r.accuracy_rate >= 95 ? '#22C55E' : r.accuracy_rate >= 90 ? '#F59E0B' : '#EF4444'
                      return (
                        <div key={r.id} className="flex-1 flex flex-col items-center gap-1" title={`${r.date}: ${Math.round(r.cwpm || 0)} CWPM${r.passage_level ? ' @ ' + r.passage_level : ''}`}>
                          <span className="text-[10px] font-bold text-navy">{Math.round(r.cwpm || 0)}</span>
                          {r.passage_level && <span className="text-[7px] text-text-tertiary font-medium bg-surface-alt px-1 rounded">{r.passage_level}</span>}
                          <div className="w-full max-w-[40px] rounded-t transition-all" style={{ height: `${Math.max(height, 4)}%`, backgroundColor: barColor }} />
                          <span className="text-[8px] text-text-tertiary">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-[9px] text-text-tertiary">
                  <span>Bar color: <span className="text-green-600 font-bold">green</span> = ≥95% accuracy, <span className="text-amber-600 font-bold">amber</span> = 90-95%, <span className="text-red-600 font-bold">red</span> = &lt;90%</span>
                </div>
              </div>

              {/* Records table */}
              <table className="w-full text-[12px]">
                <thead><tr className="bg-surface-alt text-[10px] uppercase tracking-wider text-text-tertiary">
                  <th className="text-left px-5 py-2">Date</th>
                  <th className="text-left px-3 py-2">Passage</th>
                  <th className="text-center px-3 py-2">Lexile</th>
                  <th className="text-center px-3 py-2">Words</th>
                  <th className="text-center px-3 py-2">Time</th>
                  <th className="text-center px-3 py-2">Errors</th>
                  <th className="text-center px-3 py-2">CWPM</th>
                  <th className="text-center px-3 py-2">Accuracy</th>
                  <th className="text-left px-3 py-2">Notes</th>
                </tr></thead>
                <tbody>
                  {[...records].reverse().map((r: any) => (
                    <tr key={r.id} className="border-t border-border/50 table-row-hover">
                      <td className="px-5 py-2 text-text-secondary">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-3 py-2 font-medium">{r.passage_title || '—'}</td>
                      <td className="px-3 py-2 text-center font-medium text-text-secondary">{r.passage_level || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.word_count || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.time_seconds ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, '0')}` : '—'}</td>
                      <td className="px-3 py-2 text-center">{r.errors ?? '—'}</td>
                      <td className="px-3 py-2 text-center font-bold text-navy">{r.cwpm != null ? Math.round(r.cwpm) : '—'}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${r.accuracy_rate >= 95 ? 'text-green-600' : r.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{r.accuracy_rate != null ? `${r.accuracy_rate.toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-2 text-text-tertiary truncate max-w-[150px]">{r.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="p-8 text-center text-text-tertiary text-sm">No reading assessments yet.</div>
          )}
        </div>
      )}
      {loading && <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>}
    </div>
  )
}

// ─── Fluency Groups ─────────────────────────────────────────────────

function FluencyGroups({ students, loading, lang, grade }: {
  students: any[]; loading: boolean; lang: LangKey; grade: number
}) {
  const [latestRecords, setLatestRecords] = useState<Record<string, ReadingRecord>>({})
  const [loadingRecords, setLoadingRecords] = useState(true)
  const bench = CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[4]

  useEffect(() => {
    if (students.length === 0) { setLoadingRecords(false); return }
    ;(async () => {
      setLoadingRecords(true)
      const { data } = await supabase.from('reading_assessments').select('*')
        .in('student_id', students.map((s: any) => s.id)).order('date', { ascending: false })
      const map: Record<string, ReadingRecord> = {}
      if (data) data.forEach((r: any) => { if (!map[r.student_id]) map[r.student_id] = r })
      setLatestRecords(map)
      setLoadingRecords(false)
    })()
  }, [students])

  if (loading || loadingRecords) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const groups = {
    advanced: [] as { student: any; rec: ReadingRecord }[],
    proficient: [] as { student: any; rec: ReadingRecord }[],
    approaching: [] as { student: any; rec: ReadingRecord }[],
    below: [] as { student: any; rec: ReadingRecord }[],
    unassessed: [] as { student: any }[],
  }

  students.forEach((s: any) => {
    const rec = latestRecords[s.id]
    if (!rec || rec.cwpm == null) { groups.unassessed.push({ student: s }); return }
    if (rec.cwpm >= bench.advanced) groups.advanced.push({ student: s, rec })
    else if (rec.cwpm >= bench.proficient) groups.proficient.push({ student: s, rec })
    else if (rec.cwpm >= bench.approaching) groups.approaching.push({ student: s, rec })
    else groups.below.push({ student: s, rec })
  })

  const groupConfig = [
    { key: 'advanced', label: 'Advanced', desc: `${bench.advanced}+ CWPM — Independent readers, can handle challenging text`, color: 'border-blue-300 bg-blue-50', badge: 'bg-blue-200 text-blue-800', students: groups.advanced },
    { key: 'proficient', label: 'Proficient', desc: `${bench.proficient}-${bench.advanced - 1} CWPM — On grade level`, color: 'border-green-300 bg-green-50', badge: 'bg-green-200 text-green-800', students: groups.proficient },
    { key: 'approaching', label: 'Approaching', desc: `${bench.approaching}-${bench.proficient - 1} CWPM — Needs targeted practice`, color: 'border-amber-300 bg-amber-50', badge: 'bg-amber-200 text-amber-800', students: groups.approaching },
    { key: 'below', label: 'Below Grade Level', desc: `<${bench.approaching} CWPM — Needs intensive support`, color: 'border-red-300 bg-red-50', badge: 'bg-red-200 text-red-800', students: groups.below },
    { key: 'unassessed', label: 'Not Yet Assessed', desc: 'No reading data available', color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-200 text-gray-700', students: groups.unassessed.map((s: any) => ({ student: s.student, rec: null })) },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-text-secondary">Students grouped by latest CWPM against Grade {grade} benchmarks — use for small group planning.</p>
      {groupConfig.map((g) => (
        <div key={g.key} className={`border rounded-xl overflow-hidden ${g.color}`}>
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-[12px] font-bold ${g.badge}`}>{g.label}</span>
              <span className="text-[12px] text-text-secondary">{g.desc}</span>
            </div>
            <span className="text-[13px] font-bold">{g.students.length} students</span>
          </div>
          {g.students.length > 0 && (
            <div className="px-5 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {g.students.map((item: any) => (
                  <div key={item.student.id} className="bg-surface rounded-lg border border-border/60 px-3 py-2">
                    <p className="text-[12px] font-medium truncate">{item.student.english_name}</p>
                    <p className="text-[10px] text-text-tertiary">{item.student.korean_name}</p>
                    {item.rec && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[13px] font-bold text-navy">{Math.round(item.rec.cwpm)} CWPM</span>
                        {item.rec.passage_level && <span className="text-[9px] bg-surface-alt px-1.5 py-0.5 rounded text-text-tertiary">{item.rec.passage_level}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Add Reading Record Modal ───────────────────────────────────────

function AddReadingModal({ studentId, students, lang, onClose, onSaved }: {
  studentId: string | null; students: any[]; lang: LangKey; onClose: () => void; onSaved: () => void
}) {
  const { currentTeacher, showToast } = useApp()
  const [selStudent, setSelStudent] = useState(studentId || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [passageTitle, setPassageTitle] = useState('')
  const [passageLevel, setPassageLevel] = useState('')
  const [wordCount, setWordCount] = useState<number | ''>('')
  const [timeSeconds, setTimeSeconds] = useState<number | ''>('')
  const [errors, setErrors] = useState<number | ''>(0)
  const [selfCorrections, setSelfCorrections] = useState<number | ''>(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const wc = typeof wordCount === 'number' ? wordCount : 0
  const ts = typeof timeSeconds === 'number' ? timeSeconds : 0
  const err = typeof errors === 'number' ? errors : 0
  const cwpm = ts > 0 ? ((wc - err) / (ts / 60)) : 0
  const accuracy = wc > 0 ? ((wc - err) / wc) * 100 : 0

  const handleSave = async () => {
    if (!selStudent) { showToast('Select a student'); return }
    if (!wordCount || !timeSeconds) { showToast('Enter word count and time'); return }
    setSaving(true)
    const { error } = await supabase.from('reading_assessments').insert({
      student_id: selStudent, date, passage_title: passageTitle || null, passage_level: passageLevel || null,
      word_count: wc, time_seconds: ts, errors: err, self_corrections: typeof selfCorrections === 'number' ? selfCorrections : 0,
      cwpm: Math.round(cwpm * 10) / 10, accuracy_rate: Math.round(accuracy * 10) / 10,
      reading_level: null, notes: notes.trim() || null,
      assessed_by: currentTeacher?.id || null,
    })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast('Reading record saved'); onSaved() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-lg" onClick={(e: any) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-navy">Add ORF Record</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Student *</label>
              <select value={selStudent} onChange={(e: any) => setSelStudent(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
                <option value="">Select...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name}</option>)}
              </select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Title</label>
              <input value={passageTitle} onChange={(e: any) => setPassageTitle(e.target.value)} placeholder="e.g. The Big Storm" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Lexile</label>
              <input value={passageLevel} onChange={(e: any) => setPassageLevel(e.target.value)} placeholder="e.g. 450L" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Words *</label>
              <input type="number" min={0} value={wordCount} onChange={(e: any) => setWordCount(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Time (sec) *</label>
              <input type="number" min={1} value={timeSeconds} onChange={(e: any) => setTimeSeconds(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Errors</label>
              <input type="number" min={0} value={errors} onChange={(e: any) => setErrors(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Self-Corr</label>
              <input type="number" min={0} value={selfCorrections} onChange={(e: any) => setSelfCorrections(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>

          {wc > 0 && ts > 0 && (
            <div className="bg-accent-light rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">CWPM</span>
                <p className="text-2xl font-display font-bold text-navy">{Math.round(cwpm)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Accuracy</span>
                <p className={`text-2xl font-display font-bold ${accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{accuracy.toFixed(1)}%</p>
                <p className="text-[9px] text-text-tertiary">{accuracy >= 97 ? 'Easy — move up' : accuracy >= 95 ? 'Independent' : accuracy >= 90 ? 'Instructional' : 'Frustration — move down'}</p>
              </div>
            </div>
          )}

          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Notes</label>
            <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} placeholder="Observations..." className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={handleSave} disabled={saving || !selStudent || !wordCount || !timeSeconds}
            className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}
