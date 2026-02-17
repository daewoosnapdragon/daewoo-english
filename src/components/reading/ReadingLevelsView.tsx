'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { getKSTDateString, classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, ChevronDown, BookOpen, TrendingUp, User, Users, Pencil, Trash2, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import WIDABadge from '@/components/shared/WIDABadge'
import StudentPopover from '@/components/shared/StudentPopover'

type LangKey = 'en' | 'ko'
interface ReadingRecord {
  id: string; student_id: string; date: string; passage_title: string; passage_level: string;
  word_count: number; time_seconds: number; errors: number; self_corrections: number;
  cwpm: number; accuracy_rate: number; reading_level: string; notes: string; assessed_by: string
}

// Grade-level CWPM benchmarks -- fallback defaults (used if no DB benchmarks found)
const CWPM_BENCHMARKS: Record<number, { below: number; approaching: number; proficient: number; advanced: number }> = {
  1: { below: 30, approaching: 53, proficient: 80, advanced: 100 },
  2: { below: 50, approaching: 72, proficient: 100, advanced: 120 },
  3: { below: 70, approaching: 92, proficient: 120, advanced: 145 },
  4: { below: 85, approaching: 110, proficient: 140, advanced: 165 },
  5: { below: 100, approaching: 127, proficient: 155, advanced: 180 },
  6: { below: 110, approaching: 140, proficient: 170, advanced: 195 },
}

// Load class benchmarks from DB for the selected class
function useClassBenchmarks(englishClass: string, grade: number) {
  const [dbBench, setDbBench] = useState<any>(null)
  useEffect(() => {
    setDbBench(null) // Reset on change to prevent stale legend
    ;(async () => {
      const { data } = await supabase.from('class_benchmarks').select('*').eq('english_class', englishClass).eq('grade', grade).limit(1).single()
      if (data) setDbBench(data)
    })()
  }, [englishClass, grade])
  return dbBench
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
    ? [currentTeacher.english_class as EnglishClass] : ALL_ENGLISH_CLASSES
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

        {subView === 'class' && <ClassOverview key={refreshKey} students={students} loading={loadingStudents} lang={lang} grade={selectedGrade} englishClass={selectedClass} onAddRecord={(sid: string) => { setAddForStudentId(sid); setShowAddModal(true) }} onSelectStudent={(sid: string) => { setSelectedStudentId(sid); setSubView('student') }} />}
        {subView === 'student' && <StudentReadingView key={refreshKey} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} grade={selectedGrade} onAddRecord={(sid: string) => { setAddForStudentId(sid); setShowAddModal(true) }} />}
        {subView === 'groups' && <FluencyGroups key={refreshKey} students={students} loading={loadingStudents} lang={lang} grade={selectedGrade} />}
      </div>

      {showAddModal && <AddReadingModal studentId={addForStudentId} students={students} lang={lang} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); setRefreshKey((k: number) => k + 1) }} />}
    </div>
  )
}

// ─── Class Overview ─────────────────────────────────────────────────

function ClassOverview({ students, loading, lang, grade, englishClass, onAddRecord, onSelectStudent }: {
  students: any[]; loading: boolean; lang: LangKey; grade: number; englishClass: string; onAddRecord: (sid: string) => void; onSelectStudent: (sid: string) => void
}) {
  const [latestRecords, setLatestRecords] = useState<Record<string, ReadingRecord>>({})
  const [loadingRecords, setLoadingRecords] = useState(true)
  const dbBench = useClassBenchmarks(englishClass, grade)

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

  // Use DB benchmarks if available, fall back to hardcoded
  const bench = dbBench
    ? { below: 0, approaching: dbBench.cwpm_mid || 0, proficient: dbBench.cwpm_end || 0, advanced: Math.round((dbBench.cwpm_end || 0) * 1.2) }
    : CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[4]

  const getBand = (cwpm: number) => {
    if (cwpm >= bench.advanced) return { label: 'Advanced', color: 'bg-blue-100 text-blue-700 border-blue-300' }
    if (cwpm >= bench.proficient) return { label: 'Proficient', color: 'bg-green-100 text-green-700 border-green-300' }
    if (cwpm >= bench.approaching) return { label: 'Approaching', color: 'bg-amber-100 text-amber-700 border-amber-300' }
    return { label: 'Below', color: 'bg-red-100 text-red-700 border-red-300' }
  }

  return (
    <div>
      {/* Benchmark legend */}
      <div className="mb-4">
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-text-tertiary font-semibold">{englishClass} Gr {grade} Benchmarks{dbBench ? '' : ' (defaults)'}:</span>
          <span className="px-2 py-0.5 rounded border bg-red-100 text-red-700 border-red-300">Below &lt;{bench.approaching}</span>
          <span className="px-2 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-300">Approaching {bench.approaching}-{bench.proficient - 1}</span>
          <span className="px-2 py-0.5 rounded border bg-green-100 text-green-700 border-green-300">Proficient {bench.proficient}-{bench.advanced - 1}</span>
          <span className="px-2 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-300">Advanced {bench.advanced}+</span>
          <button onClick={() => {
            exportToCSV(`reading-${englishClass}-G${grade}`,
              ['Student', 'Korean Name', 'CWPM', 'Band', 'Accuracy', 'Passage Level', 'Last Assessed'],
              students.map((s: any) => {
                const r = latestRecords[s.id]
                const band = r?.cwpm != null ? getBand(r.cwpm) : null
                return [s.english_name, s.korean_name, r?.cwpm != null ? Math.round(r.cwpm) : '', band?.label || '', r?.accuracy_rate?.toFixed(1) || '', r?.passage_level || '', r?.date || '']
              }))
          }} className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
            <Download size={11} /> CSV
          </button>
        </div>
        {dbBench && <p className="text-[10px] text-text-tertiary mt-1">CWPM Mid ({dbBench.cwpm_mid}) = expected fluency by mid-semester. CWPM End ({dbBench.cwpm_end}) = target fluency by end of semester. Set in Settings &gt; Benchmarks.</p>}
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
          </tr></thead>
          <tbody>
            {students.map((s: any, i: number) => {
              const rec = latestRecords[s.id]
              const band = rec?.cwpm != null ? getBand(rec.cwpm) : null
              return (
                <tr key={s.id} className="border-t border-border table-row-hover cursor-pointer" onClick={() => onSelectStudent(s.id)}>
                  <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                  <td className="px-4 py-2.5"><StudentPopover studentId={s.id} name={s.english_name} koreanName={s.korean_name} trigger={<><span className="font-medium">{s.english_name}</span><span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span></>} /> <WIDABadge studentId={s.id} compact /></td>
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
  const [classBench, setClassBench] = useState<any>(null)
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

  // Load class benchmarks
  useEffect(() => {
    if (!selected) return
    ;(async () => {
      const { data } = await supabase.from('class_benchmarks').select('*').eq('english_class', selected.english_class).eq('grade', grade).limit(1).single()
      if (data) setClassBench(data)
    })()
  }, [selected, grade])

  // Growth projection
  const growthSentence = (() => {
    if (records.length < 2 || !classBench) return null
    const first = records[0], last = records[records.length - 1]
    const daysBetween = (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24)
    if (daysBetween < 7) return null
    const monthsBetween = daysBetween / 30
    const cwpmGain = (last.cwpm || 0) - (first.cwpm || 0)
    const gainPerMonth = cwpmGain / monthsBetween
    const target = classBench.cwpm_end
    const current = last.cwpm || 0
    const remaining = target - current
    const monthsToTarget = remaining > 0 && gainPerMonth > 0 ? remaining / gainPerMonth : null

    return {
      gain: Math.round(cwpmGain),
      assessments: records.length,
      perMonth: gainPerMonth.toFixed(1),
      current: Math.round(current),
      target,
      monthsToTarget: monthsToTarget ? monthsToTarget.toFixed(1) : null,
      onTrack: current >= target || (monthsToTarget !== null && monthsToTarget <= 4),
    }
  })()

  const [editRecord, setEditRecord] = useState<any>(null)

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('Delete this reading record?')) return
    await supabase.from('reading_assessments').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const handleUpdateRecord = async (updated: any) => {
    const { id, ...fields } = updated
    // Recalculate CWPM and accuracy
    const wc = Number(fields.word_count) || 0
    const ts = Number(fields.time_seconds) || 0
    const errors = Number(fields.errors) || 0
    const cwpm = ts > 0 ? ((wc - errors) / ts) * 60 : null
    const accuracy_rate = wc > 0 ? ((wc - errors) / wc) * 100 : null
    const toUpdate = { ...fields, word_count: wc || null, time_seconds: ts || null, errors, cwpm, accuracy_rate }
    const { error } = await supabase.from('reading_assessments').update(toUpdate).eq('id', id)
    if (!error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...toUpdate } : r))
      setEditRecord(null)
    }
  }

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
              <p className="text-[12px] text-text-secondary mt-0.5">{records.length} reading assessments{classBench && <span> | {selected.english_class} target: {classBench.cwpm_end} CWPM</span>}</p>
            </div>
            <button onClick={() => onAddRecord(selected.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
              <Plus size={12} /> Add Record
            </button>
          </div>

          {records.length > 0 ? (
            <>
              {growthSentence && (
                <div className={`px-5 py-3 border-b text-[12px] leading-relaxed ${growthSentence.onTrack ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-amber-50/50 border-amber-200 text-amber-800'}`}>
                  <span className="font-semibold">{selected.english_name}</span> has gained <span className="font-bold">{growthSentence.gain > 0 ? '+' : ''}{growthSentence.gain} CWPM</span> over {growthSentence.assessments} assessments ({growthSentence.perMonth}/month).
                  {growthSentence.current >= growthSentence.target
                    ? <span> Already at or above the <span className="font-semibold">{selected.english_class}</span> end-of-semester target of {growthSentence.target} CWPM.</span>
                    : growthSentence.monthsToTarget
                      ? <span> At this rate, projected to reach the <span className="font-semibold">{selected.english_class}</span> target of {growthSentence.target} CWPM in ~{growthSentence.monthsToTarget} months.</span>
                      : <span> Current trajectory needs attention to reach the {growthSentence.target} CWPM target.</span>
                  }
                </div>
              )}
              <div className="px-5 py-5 border-b border-border">
                <p className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3 flex items-center gap-1"><TrendingUp size={13} /> CWPM Progression</p>
                <CwpmLineChart records={records} classBench={classBench} />
                <div className="flex gap-4 mt-3 text-[9px] text-text-tertiary flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 95%+ accuracy</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 90-94% accuracy</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;90% accuracy</span>
                  {classBench && <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-200 inline-block border border-green-300" /> Target corridor ({classBench.cwpm_mid}-{classBench.cwpm_end} CWPM)</span>}
                </div>
              </div>
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
                  <th className="text-center px-2 py-2 w-16"></th>
                </tr></thead>
                <tbody>
                  {[...records].reverse().map((r: any) => (
                    <tr key={r.id} className="border-t border-border/50 table-row-hover group">
                      <td className="px-5 py-2 text-text-secondary">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-3 py-2 font-medium">{r.passage_title || '—'}</td>
                      <td className="px-3 py-2 text-center font-medium text-text-secondary">{r.passage_level || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.word_count || '—'}</td>
                      <td className="px-3 py-2 text-center">{r.time_seconds ? `${Math.floor(r.time_seconds / 60)}:${String(r.time_seconds % 60).padStart(2, '0')}` : '—'}</td>
                      <td className="px-3 py-2 text-center">{r.errors ?? '—'}</td>
                      <td className="px-3 py-2 text-center font-bold text-navy">{r.cwpm != null ? Math.round(r.cwpm) : '—'}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${r.accuracy_rate >= 95 ? 'text-green-600' : r.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{r.accuracy_rate != null ? `${r.accuracy_rate.toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-2 text-text-tertiary truncate max-w-[150px]">{r.notes || ''}</td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditRecord(r)} className="p-1 rounded hover:bg-surface-alt text-text-tertiary hover:text-navy" title="Edit"><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteRecord(r.id)} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500" title="Delete"><Trash2 size={12} /></button>
                        </div>
                      </td>
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

      {/* Edit Reading Record Modal */}
      {editRecord && <EditReadingModal record={editRecord} onClose={() => setEditRecord(null)} onSave={handleUpdateRecord} />}
    </div>
  )
}

// ─── Edit Reading Record Modal ──────────────────────────────────────

function EditReadingModal({ record, onClose, onSave }: { record: any; onClose: () => void; onSave: (updated: any) => void }) {
  const [form, setForm] = useState({
    date: record.date || '',
    passage_title: record.passage_title || '',
    passage_level: record.passage_level || '',
    word_count: record.word_count || '',
    time_seconds: record.time_seconds || '',
    errors: record.errors ?? '',
    self_corrections: record.self_corrections ?? '',
    reading_level: record.reading_level || '',
    notes: record.notes || '',
  })

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))
  const wc = Number(form.word_count) || 0
  const ts = Number(form.time_seconds) || 0
  const err = Number(form.errors) || 0
  const previewCwpm = ts > 0 ? ((wc - err) / ts) * 60 : null
  const previewAcc = wc > 0 ? ((wc - err) / wc) * 100 : null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-[15px] font-semibold text-navy">Edit Reading Record</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Level</label>
              <input value={form.passage_level} onChange={e => set('passage_level', e.target.value)} placeholder="e.g. 350L" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Title</label>
            <input value={form.passage_title} onChange={e => set('passage_title', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Words</label>
              <input type="number" value={form.word_count} onChange={e => set('word_count', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Time (sec)</label>
              <input type="number" value={form.time_seconds} onChange={e => set('time_seconds', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Errors</label>
              <input type="number" value={form.errors} onChange={e => set('errors', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Self-Corr</label>
              <input type="number" value={form.self_corrections} onChange={e => set('self_corrections', e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          {(previewCwpm != null || previewAcc != null) && (
            <div className="flex gap-4 p-3 bg-accent-light rounded-lg text-[12px]">
              {previewCwpm != null && <span>CWPM: <b className="text-navy">{Math.round(previewCwpm)}</b></span>}
              {previewAcc != null && <span>Accuracy: <b className={previewAcc >= 95 ? 'text-green-600' : previewAcc >= 90 ? 'text-amber-600' : 'text-red-600'}>{previewAcc.toFixed(1)}%</b></span>}
            </div>
          )}
          <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={() => onSave({ id: record.id, ...form })} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ─── CWPM Line Chart (SVG) ───────────────────────────────────────────

function CwpmLineChart({ records, classBench }: { records: any[]; classBench: any | null }) {
  if (records.length === 0) return null

  const W = 600, H = 220, PAD = { top: 20, right: 30, bottom: 35, left: 45 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const cwpmValues = records.map((r: any) => r.cwpm || 0)
  const targetMax = classBench ? classBench.cwpm_end : 0
  const maxY = Math.max(...cwpmValues, targetMax, 20) * 1.15
  const minY = 0

  const xScale = (i: number) => PAD.left + (i / Math.max(records.length - 1, 1)) * chartW
  const yScale = (v: number) => PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH

  // Target corridor
  const corridorY1 = classBench ? yScale(classBench.cwpm_end) : 0
  const corridorY2 = classBench ? yScale(classBench.cwpm_mid) : 0

  // Line path
  const linePath = records.map((r: any, i: number) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(r.cwpm || 0)}`).join(' ')

  // Y-axis ticks
  const yTicks: number[] = []
  const step = maxY <= 50 ? 10 : maxY <= 100 ? 20 : maxY <= 200 ? 25 : 50
  for (let v = 0; v <= maxY; v += step) yTicks.push(v)

  const dotColor = (acc: number) => acc >= 95 ? '#22C55E' : acc >= 90 ? '#F59E0B' : '#EF4444'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 240 }}>
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="#e5e7eb" strokeWidth="0.5" />
          <text x={PAD.left - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</text>
        </g>
      ))}

      {/* Target corridor */}
      {classBench && (
        <rect x={PAD.left} y={corridorY1} width={chartW} height={Math.max(corridorY2 - corridorY1, 1)}
          fill="#dcfce7" stroke="#bbf7d0" strokeWidth="0.5" opacity="0.6" rx="2" />
      )}

      {/* Midterm target line */}
      {classBench && (
        <>
          <line x1={PAD.left} y1={yScale(classBench.cwpm_mid)} x2={W - PAD.right} y2={yScale(classBench.cwpm_mid)}
            stroke="#86efac" strokeWidth="1" strokeDasharray="4 3" />
          <text x={W - PAD.right + 3} y={yScale(classBench.cwpm_mid) + 3} fontSize="8" fill="#16a34a" fontWeight="600">Mid {classBench.cwpm_mid}</text>
        </>
      )}

      {/* End target line */}
      {classBench && (
        <>
          <line x1={PAD.left} y1={yScale(classBench.cwpm_end)} x2={W - PAD.right} y2={yScale(classBench.cwpm_end)}
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 3" />
          <text x={W - PAD.right + 3} y={yScale(classBench.cwpm_end) + 3} fontSize="8" fill="#16a34a" fontWeight="700">End {classBench.cwpm_end}</text>
        </>
      )}

      {/* Data line */}
      <path d={linePath} fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points with accuracy color */}
      {records.map((r: any, i: number) => {
        const x = xScale(i), y = yScale(r.cwpm || 0)
        return (
          <g key={r.id || i}>
            {/* White border */}
            <circle cx={x} cy={y} r="6" fill="white" stroke="#e5e7eb" strokeWidth="1" />
            {/* Colored dot */}
            <circle cx={x} cy={y} r="5" fill={dotColor(r.accuracy_rate || 0)} stroke="white" strokeWidth="1.5" />
            {/* CWPM label */}
            <text x={x} y={y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e3a5f">{Math.round(r.cwpm || 0)}</text>
            {/* Passage level */}
            {r.passage_level && (
              <text x={x} y={y - 20} textAnchor="middle" fontSize="7" fill="#94a3b8">{r.passage_level}</text>
            )}
            {/* Date on x-axis */}
            <text x={x} y={H - 8} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </text>
          </g>
        )
      })}

      {/* Y-axis label */}
      <text x={12} y={PAD.top + chartH / 2} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600" transform={`rotate(-90, 12, ${PAD.top + chartH / 2})`}>CWPM</text>
    </svg>
  )
}

// ─── Fluency Groups ─────────────────────────────────────────────────

function FluencyGroups({ students, loading, lang, grade }: {
  students: any[]; loading: boolean; lang: LangKey; grade: number
}) {
  const { currentTeacher, showToast } = useApp()
  const selectedClass = (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as string
  const [latestRecords, setLatestRecords] = useState<Record<string, ReadingRecord>>({})
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [subgroups, setSubgroups] = useState<any[]>([])
  const [members, setMembers] = useState<Record<string, string>>({}) // studentId -> subgroupId
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [addingBand, setAddingBand] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const bench = CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[4]

  useEffect(() => {
    if (students.length === 0) { setLoadingRecords(false); return }
    ;(async () => {
      setLoadingRecords(true)
      const [{ data }, { data: sg }, { data: sgm }] = await Promise.all([
        supabase.from('reading_assessments').select('*').in('student_id', students.map((s: any) => s.id)).order('date', { ascending: false }),
        supabase.from('fluency_subgroups').select('*').eq('english_class', selectedClass).eq('grade', grade).order('sort_order'),
        supabase.from('fluency_subgroup_members').select('*, fluency_subgroups!inner(english_class, grade)').eq('fluency_subgroups.english_class', selectedClass).eq('fluency_subgroups.grade', grade),
      ])
      const map: Record<string, ReadingRecord> = {}
      if (data) data.forEach((r: any) => { if (!map[r.student_id]) map[r.student_id] = r })
      setLatestRecords(map)
      setSubgroups(sg || [])
      const mm: Record<string, string> = {}
      sgm?.forEach((m: any) => { mm[m.student_id] = m.subgroup_id })
      setMembers(mm)
      setLoadingRecords(false)
    })()
  }, [students, selectedClass, grade])

  if (loading || loadingRecords) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const addSubgroup = async (band: string) => {
    if (!newGroupName.trim()) return
    const { data, error } = await supabase.from('fluency_subgroups').insert({ english_class: selectedClass, grade, band, name: newGroupName.trim(), sort_order: subgroups.filter(s => s.band === band).length }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setSubgroups(prev => [...prev, data])
    setNewGroupName(''); setAddingBand(null)
    showToast(`Created group "${data.name}"`)
  }

  const renameSubgroup = async (id: string) => {
    if (!editName.trim()) return
    await supabase.from('fluency_subgroups').update({ name: editName.trim() }).eq('id', id)
    setSubgroups(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s))
    setEditingGroup(null)
  }

  const deleteSubgroup = async (id: string) => {
    if (!confirm('Delete this subgroup? Students will be unassigned.')) return
    await supabase.from('fluency_subgroups').delete().eq('id', id)
    setSubgroups(prev => prev.filter(s => s.id !== id))
    setMembers(prev => { const n = { ...prev }; Object.keys(n).forEach(k => { if (n[k] === id) delete n[k] }); return n })
  }

  const assignStudent = async (studentId: string, subgroupId: string | null) => {
    // Remove from current subgroup
    const current = members[studentId]
    if (current) await supabase.from('fluency_subgroup_members').delete().eq('student_id', studentId).eq('subgroup_id', current)
    // Add to new subgroup
    if (subgroupId) await supabase.from('fluency_subgroup_members').insert({ subgroup_id: subgroupId, student_id: studentId })
    setMembers(prev => { const n = { ...prev }; if (subgroupId) n[studentId] = subgroupId; else delete n[studentId]; return n })
  }

  const getBand = (cwpm: number) => {
    if (cwpm >= bench.advanced) return 'advanced'
    if (cwpm >= bench.proficient) return 'proficient'
    if (cwpm >= bench.approaching) return 'approaching'
    return 'below'
  }

  const groups: Record<string, { student: any; rec: ReadingRecord | null }[]> = { advanced: [], proficient: [], approaching: [], below: [], unassessed: [] }
  students.forEach((s: any) => {
    const rec = latestRecords[s.id]
    if (!rec || rec.cwpm == null) { groups.unassessed.push({ student: s, rec: null }); return }
    groups[getBand(rec.cwpm)].push({ student: s, rec })
  })

  const groupConfig = [
    { key: 'advanced', label: 'Advanced', desc: `${bench.advanced}+ CWPM`, color: 'border-blue-300 bg-blue-50', badge: 'bg-blue-200 text-blue-800' },
    { key: 'proficient', label: 'Proficient', desc: `${bench.proficient}-${bench.advanced - 1} CWPM`, color: 'border-green-300 bg-green-50', badge: 'bg-green-200 text-green-800' },
    { key: 'approaching', label: 'Approaching', desc: `${bench.approaching}-${bench.proficient - 1} CWPM`, color: 'border-amber-300 bg-amber-50', badge: 'bg-amber-200 text-amber-800' },
    { key: 'below', label: 'Below Grade Level', desc: `<${bench.approaching} CWPM`, color: 'border-red-300 bg-red-50', badge: 'bg-red-200 text-red-800' },
    { key: 'unassessed', label: 'Not Yet Assessed', desc: 'No reading data', color: 'border-gray-300 bg-gray-50', badge: 'bg-gray-200 text-gray-700' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-text-secondary">Students grouped by latest CWPM. Create subgroups within each band for small group planning.</p>
      {groupConfig.map((g) => {
        const bandStudents = groups[g.key] || []
        const bandSubgroups = subgroups.filter(sg => sg.band === g.key)
        return (
          <div key={g.key} className={`border rounded-xl overflow-hidden ${g.color}`}>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[12px] font-bold ${g.badge}`}>{g.label}</span>
                <span className="text-[12px] text-text-secondary">{g.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold">{bandStudents.length} students</span>
                {addingBand === g.key ? (
                  <div className="flex gap-1">
                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Group name"
                      className="px-2 py-1 text-[11px] border border-border rounded-lg w-28" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') addSubgroup(g.key); if (e.key === 'Escape') setAddingBand(null) }} />
                    <button onClick={() => addSubgroup(g.key)} className="px-2 py-1 rounded-lg bg-navy text-white text-[9px]">Add</button>
                  </div>
                ) : (
                  <button onClick={() => { setAddingBand(g.key); setNewGroupName('') }} className="text-[10px] text-text-tertiary hover:text-navy font-medium"><Plus size={11} className="inline" /> Subgroup</button>
                )}
              </div>
            </div>
            {bandStudents.length > 0 && (
              <div className="px-5 pb-4">
                {/* Subgroups within this band */}
                {bandSubgroups.length > 0 && (
                  <div className="space-y-3 mb-3">
                    {bandSubgroups.map(sg => {
                      const sgStudents = bandStudents.filter(item => members[item.student.id] === sg.id)
                      return (
                        <div key={sg.id} className="bg-white/60 rounded-lg border border-border/40 p-3">
                          <div className="flex items-center justify-between mb-2">
                            {editingGroup === sg.id ? (
                              <input value={editName} onChange={e => setEditName(e.target.value)} className="px-2 py-0.5 text-[12px] border border-navy rounded font-semibold" autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') renameSubgroup(sg.id); if (e.key === 'Escape') setEditingGroup(null) }} />
                            ) : (
                              <span className="text-[12px] font-semibold text-navy cursor-pointer hover:underline" onClick={() => { setEditingGroup(sg.id); setEditName(sg.name) }}>{sg.name}</span>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-text-tertiary">{sgStudents.length}</span>
                              <button onClick={() => deleteSubgroup(sg.id)} className="p-0.5 text-text-tertiary hover:text-red-500"><Trash2 size={11} /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                            {sgStudents.map((item: any) => (
                              <div key={item.student.id} className="bg-surface rounded px-2 py-1.5 border border-border/40 flex items-center justify-between">
                                <div>
                                  <p className="text-[11px] font-medium truncate">{item.student.english_name}</p>
                                  {item.rec && <p className="text-[10px] font-bold text-navy">{Math.round(item.rec.cwpm)} CWPM</p>}
                                </div>
                                <button onClick={() => assignStudent(item.student.id, null)} className="text-[9px] text-text-tertiary hover:text-red-500" title="Remove from group">x</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* Unassigned students in this band */}
                <div>
                  {bandSubgroups.length > 0 && <p className="text-[10px] text-text-tertiary font-semibold mb-1.5 uppercase tracking-wider">Unassigned</p>}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {bandStudents.filter(item => !members[item.student.id] || !bandSubgroups.find(sg => sg.id === members[item.student.id])).map((item: any) => (
                      <div key={item.student.id} className="bg-surface rounded-lg border border-border/60 px-3 py-2">
                        <p className="text-[12px] font-medium truncate">{item.student.english_name}</p>
                        <p className="text-[10px] text-text-tertiary">{item.student.korean_name}</p>
                        {item.rec && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[13px] font-bold text-navy">{Math.round(item.rec.cwpm)} CWPM</span>
                            {item.rec.passage_level && <span className="text-[9px] bg-surface-alt px-1.5 py-0.5 rounded text-text-tertiary">{item.rec.passage_level}</span>}
                          </div>
                        )}
                        {bandSubgroups.length > 0 && (
                          <select value="" onChange={e => { if (e.target.value) assignStudent(item.student.id, e.target.value) }}
                            className="mt-1.5 w-full px-1.5 py-1 border border-border rounded text-[10px] bg-surface">
                            <option value="">Assign to group...</option>
                            {bandSubgroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Add Reading Record Modal ───────────────────────────────────────

function AddReadingModal({ studentId, students, lang, onClose, onSaved }: {
  studentId: string | null; students: any[]; lang: LangKey; onClose: () => void; onSaved: () => void
}) {
  const { currentTeacher, showToast } = useApp()
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [selStudent, setSelStudent] = useState(studentId || '')
  const [date, setDate] = useState(getKSTDateString())
  const [passageTitle, setPassageTitle] = useState('')
  const [passageLevel, setPassageLevel] = useState('')
  const [wordCount, setWordCount] = useState<number | ''>('')
  const [timeSeconds, setTimeSeconds] = useState<number | ''>('')
  const [timeMode, setTimeMode] = useState<'sec' | 'minsec'>('sec')
  const [timeMin, setTimeMin] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [errors, setErrors] = useState<number | ''>(0)
  const [selfCorrections, setSelfCorrections] = useState<number | ''>(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Batch mode state: studentId -> { wordCount, timeSeconds, errors, selfCorrections, notes }
  const [batchScores, setBatchScores] = useState<Record<string, { wc: string; ts: string; err: string; sc: string; notes: string }>>({})

  const wc = typeof wordCount === 'number' ? wordCount : 0
  const ts = typeof timeSeconds === 'number' ? timeSeconds : 0
  const err = typeof errors === 'number' ? errors : 0
  const cwpm = ts > 0 ? ((wc - err) / (ts / 60)) : 0
  const accuracy = wc > 0 ? ((wc - err) / wc) * 100 : 0

  const setBatchField = (sid: string, field: string, value: string) => {
    setBatchScores(prev => ({ ...prev, [sid]: { ...(prev[sid] || { wc: '', ts: '', err: '0', sc: '0', notes: '' }), [field]: value } }))
  }

  const calcBatchCwpm = (b: { wc: string; ts: string; err: string }) => {
    const w = parseInt(b.wc) || 0; const t = parseInt(b.ts) || 0; const e = parseInt(b.err) || 0
    return t > 0 ? Math.round(((w - e) / (t / 60)) * 10) / 10 : 0
  }
  const calcBatchAcc = (b: { wc: string; err: string }) => {
    const w = parseInt(b.wc) || 0; const e = parseInt(b.err) || 0
    return w > 0 ? Math.round(((w - e) / w) * 1000) / 10 : 0
  }

  const handleSave = async () => {
    if (mode === 'single') {
      if (!selStudent) { showToast('Select a student'); return }
      if (!wordCount || !timeSeconds) { showToast('Enter word count and time'); return }
      setSaving(true)
      const { error } = await supabase.from('reading_assessments').insert({
        student_id: selStudent, date, passage_title: passageTitle || null, passage_level: passageLevel || null,
        word_count: wc, time_seconds: ts, errors: err, self_corrections: typeof selfCorrections === 'number' ? selfCorrections : 0,
        cwpm: Math.round(cwpm * 10) / 10, accuracy_rate: Math.round(accuracy * 10) / 10,
        reading_level: null, notes: notes.trim() || null, assessed_by: currentTeacher?.id || null,
      })
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`)
      else { showToast('Reading record saved'); onSaved() }
    } else {
      // Batch save
      const rows = Object.entries(batchScores)
        .filter(([_, b]) => b.wc && b.ts)
        .map(([sid, b]) => {
          const w = parseInt(b.wc) || 0; const t = parseInt(b.ts) || 0; const e = parseInt(b.err) || 0; const sc = parseInt(b.sc) || 0
          return {
            student_id: sid, date, passage_title: passageTitle || null, passage_level: passageLevel || null,
            word_count: w, time_seconds: t, errors: e, self_corrections: sc,
            cwpm: calcBatchCwpm(b), accuracy_rate: calcBatchAcc(b),
            reading_level: null, notes: b.notes?.trim() || null, assessed_by: currentTeacher?.id || null,
          }
        })
      if (rows.length === 0) { showToast('Enter scores for at least one student'); return }
      setSaving(true)
      const { error } = await supabase.from('reading_assessments').insert(rows)
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`)
      else { showToast(`Saved ${rows.length} reading records`); onSaved() }
    }
  }

  const batchFilled = Object.values(batchScores).filter(b => b.wc && b.ts).length

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className={`bg-surface rounded-xl shadow-lg w-full ${mode === 'batch' ? 'max-w-3xl max-h-[85vh] overflow-hidden flex flex-col' : 'max-w-lg'}`} onClick={(e: any) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-navy">Add ORF Record</h3>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-surface-alt rounded-lg p-0.5">
              <button onClick={() => setMode('single')} className={`px-3 py-1 rounded-md text-[11px] font-medium ${mode === 'single' ? 'bg-white shadow-sm text-navy' : 'text-text-tertiary'}`}>Single</button>
              <button onClick={() => setMode('batch')} className={`px-3 py-1 rounded-md text-[11px] font-medium ${mode === 'batch' ? 'bg-white shadow-sm text-navy' : 'text-text-tertiary'}`}>Batch</button>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
          </div>
        </div>

        {/* Shared passage info for both modes */}
        <div className="px-6 pt-4 pb-2 space-y-3 border-b border-border">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Title</label>
              <input value={passageTitle} onChange={(e: any) => setPassageTitle(e.target.value)} placeholder="e.g. The Big Storm" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Lexile</label>
              <input value={passageLevel} onChange={(e: any) => setPassageLevel(e.target.value)} placeholder="e.g. 450L" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
        </div>

        {mode === 'single' ? (
          <div className="p-6 space-y-4">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Student *</label>
              <select value={selStudent} onChange={(e: any) => setSelStudent(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
                <option value="">Select...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name}</option>)}
              </select></div>
            <div className="grid grid-cols-4 gap-3">
              <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Words *</label>
                <input type="number" min={0} value={wordCount} onChange={(e: any) => setWordCount(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
              <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
                Time * <button onClick={() => { setTimeMode(timeMode === 'sec' ? 'minsec' : 'sec'); setTimeSeconds(''); setTimeMin(''); setTimeSec('') }} className="text-[9px] text-navy hover:underline ml-1 normal-case">({timeMode === 'sec' ? 'switch to min:sec' : 'switch to seconds'})</button></label>
                {timeMode === 'sec' ? (
                  <input type="number" min={1} value={timeSeconds} onChange={(e: any) => setTimeSeconds(e.target.value ? parseInt(e.target.value) : '')} placeholder="seconds" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
                ) : (
                  <div className="flex gap-1 items-center">
                    <input type="number" min={0} value={timeMin} onChange={(e: any) => { setTimeMin(e.target.value); const m = parseInt(e.target.value) || 0; const s = parseInt(timeSec) || 0; setTimeSeconds(m * 60 + s || '') }} placeholder="min" className="w-1/2 px-2 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy text-center" />
                    <span className="text-text-tertiary font-bold">:</span>
                    <input type="number" min={0} max={59} value={timeSec} onChange={(e: any) => { setTimeSec(e.target.value); const m = parseInt(timeMin) || 0; const s = parseInt(e.target.value) || 0; setTimeSeconds(m * 60 + s || '') }} placeholder="sec" className="w-1/2 px-2 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy text-center" />
                  </div>
                )}</div>
              <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Errors</label>
                <input type="number" min={0} value={errors} onChange={(e: any) => setErrors(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
              <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Self-Corr</label>
                <input type="number" min={0} value={selfCorrections} onChange={(e: any) => setSelfCorrections(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            </div>
            {wc > 0 && ts > 0 && (
              <div className="bg-accent-light rounded-lg p-4 grid grid-cols-2 gap-4">
                <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">CWPM</span>
                  <p className="text-2xl font-display font-bold text-navy">{Math.round(cwpm)}</p></div>
                <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Accuracy</span>
                  <p className={`text-2xl font-display font-bold ${accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{accuracy.toFixed(1)}%</p>
                  <p className="text-[9px] text-text-tertiary">{accuracy >= 97 ? 'Easy — move up' : accuracy >= 95 ? 'Independent' : accuracy >= 90 ? 'Instructional' : 'Frustration — move down'}</p></div>
              </div>
            )}
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Notes</label>
              <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} rows={2} placeholder="Observations..." className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4">
            <p className="text-[11px] text-text-tertiary mb-3">Enter word count and time for each student who read this passage. Leave blank to skip.</p>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-36">Student</th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">Words</th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-20">Time <span className="text-[8px] normal-case">(m:ss or sec)</span></th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-14">Err</th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-14">SC</th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">CWPM</th>
                <th className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">Acc%</th>
              </tr></thead>
              <tbody>
                {students.map((s: any) => {
                  const b = batchScores[s.id] || { wc: '', ts: '', err: '0', sc: '0', notes: '' }
                  const bCwpm = calcBatchCwpm(b)
                  const bAcc = calcBatchAcc(b)
                  const filled = b.wc && b.ts
                  return (
                    <tr key={s.id} className={`border-b border-border/50 ${filled ? 'bg-green-50/50' : ''}`}>
                      <td className="py-1.5 px-2 text-[12px] font-medium">{s.english_name}</td>
                      <td className="py-1.5 px-1"><input type="number" min={0} value={b.wc} onChange={e => setBatchField(s.id, 'wc', e.target.value)} className="w-full text-center px-1 py-1 border border-border rounded text-[12px] outline-none focus:border-navy" /></td>
                      <td className="py-1.5 px-1"><input value={b.ts} onChange={e => {
                        const v = e.target.value
                        if (v.includes(':')) { const parts = v.split(':'); setBatchField(s.id, 'ts', String((parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0))) }
                        else { setBatchField(s.id, 'ts', v) }
                      }} placeholder="60 or 1:00" className="w-full text-center px-1 py-1 border border-border rounded text-[12px] outline-none focus:border-navy"
                        onBlur={e => { const v = e.target.value; if (v.includes(':')) { const parts = v.split(':'); setBatchField(s.id, 'ts', String((parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0))) } }} /></td>
                      <td className="py-1.5 px-1"><input type="number" min={0} value={b.err} onChange={e => setBatchField(s.id, 'err', e.target.value)} className="w-full text-center px-1 py-1 border border-border rounded text-[12px] outline-none focus:border-navy" /></td>
                      <td className="py-1.5 px-1"><input type="number" min={0} value={b.sc} onChange={e => setBatchField(s.id, 'sc', e.target.value)} className="w-full text-center px-1 py-1 border border-border rounded text-[12px] outline-none focus:border-navy" /></td>
                      <td className="py-1.5 px-1 text-center text-[12px] font-bold text-navy">{filled ? bCwpm : ''}</td>
                      <td className={`py-1.5 px-1 text-center text-[12px] font-bold ${bAcc >= 95 ? 'text-green-600' : bAcc >= 90 ? 'text-amber-600' : filled ? 'text-red-600' : ''}`}>{filled ? `${bAcc}%` : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-tertiary">{mode === 'batch' ? `${batchFilled} of ${students.length} students` : ''}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">Cancel</button>
            <button onClick={handleSave} disabled={saving || (mode === 'single' ? (!selStudent || !wordCount || !timeSeconds) : batchFilled === 0)}
              className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />} {mode === 'batch' ? `Save ${batchFilled} Records` : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
