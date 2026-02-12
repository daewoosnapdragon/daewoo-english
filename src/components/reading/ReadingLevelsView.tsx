'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, ChevronDown, BookOpen, TrendingUp, User } from 'lucide-react'

type LangKey = 'en' | 'ko'
interface ReadingRecord {
  id: string; student_id: string; date: string; passage_title: string; passage_level: string;
  word_count: number; time_seconds: number; errors: number; self_corrections: number;
  cwpm: number; accuracy_rate: number; reading_level: string; notes: string; assessed_by: string
}

const READING_LEVELS = ['aa', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Z1', 'Z2']
const LEXILE_RANGES = ['BR', '0-100L', '100-200L', '200-300L', '300-400L', '400-500L', '500-600L', '600-700L', '700-800L', '800-900L', '900-1000L', '1000L+']

export default function ReadingLevelsView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [subView, setSubView] = useState<'class' | 'student'>('class')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForStudentId, setAddForStudentId] = useState<string | null>(null)

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ENGLISH_CLASSES
  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.nav.readingLevels}</h2>
            <p className="text-text-secondary text-sm mt-1">{selectedClass} · Grade {selectedGrade} · {students.length} students</p>
          </div>
          <button onClick={() => { setShowAddModal(true); setAddForStudentId(selectedStudentId || (students[0]?.id || null)) }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
            <Plus size={15} /> {lang === 'ko' ? 'ORF 기록 추가' : 'Add ORF Record'}
          </button>
        </div>
        <div className="flex gap-1 mt-4">
          <button onClick={() => setSubView('class')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${subView === 'class' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <BookOpen size={14} /> {lang === 'ko' ? '반 현황' : 'Class Overview'}
          </button>
          <button onClick={() => setSubView('student')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${subView === 'student' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <User size={14} /> {lang === 'ko' ? '학생별 보기' : 'Student View'}
          </button>
        </div>
      </div>

      <div className="px-10 py-6">
        <div className="flex items-center gap-3 mb-5">
          <select value={selectedGrade} onChange={(e: any) => setSelectedGrade(Number(e.target.value) as Grade)}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
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

        {subView === 'class' && <ClassOverview students={students} loading={loadingStudents} lang={lang} onAddRecord={(sid) => { setAddForStudentId(sid); setShowAddModal(true) }} />}
        {subView === 'student' && <StudentReadingView students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} onAddRecord={(sid) => { setAddForStudentId(sid); setShowAddModal(true) }} />}
      </div>

      {showAddModal && <AddReadingModal studentId={addForStudentId} students={students} lang={lang} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); /* trigger reload via key */ }} />}
    </div>
  )
}

// ─── Class Overview ─────────────────────────────────────────────────

function ClassOverview({ students, loading, lang, onAddRecord }: { students: any[]; loading: boolean; lang: LangKey; onAddRecord: (sid: string) => void }) {
  const [latestRecords, setLatestRecords] = useState<Record<string, ReadingRecord>>({})
  const [loadingRecords, setLoadingRecords] = useState(true)

  useEffect(() => {
    if (students.length === 0) { setLoadingRecords(false); return }
    (async () => {
      setLoadingRecords(true)
      const { data } = await supabase.from('reading_assessments').select('*')
        .in('student_id', students.map(s => s.id)).order('date', { ascending: false })
      const map: Record<string, ReadingRecord> = {}
      if (data) data.forEach((r: any) => { if (!map[r.student_id]) map[r.student_id] = r })
      setLatestRecords(map)
      setLoadingRecords(false)
    })()
  }, [students])

  if (loading || loadingRecords) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const levelColor = (level: string) => {
    const idx = READING_LEVELS.indexOf(level)
    if (idx < 0) return '#6B7280'
    if (idx <= 3) return '#DC2626'
    if (idx <= 8) return '#F59E0B'
    if (idx <= 14) return '#22C55E'
    return '#3B82F6'
  }

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
          <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">RAZ</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">Lexile</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">CWPM</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">Accuracy</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-28">Last Assessed</th>
          <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-16"></th>
        </tr></thead>
        <tbody>
          {students.map((s, i) => {
            const rec = latestRecords[s.id]
            return (
              <tr key={s.id} className="border-t border-border table-row-hover">
                <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                <td className="px-4 py-2.5"><span className="font-medium">{s.english_name}</span><span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span></td>
                <td className="px-4 py-2.5 text-center">
                  {rec?.reading_level ? (
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold text-white" style={{ backgroundColor: levelColor(rec.reading_level) }}>{rec.reading_level}</span>
                  ) : <span className="text-text-tertiary">—</span>}
                </td>
                <td className="px-4 py-2.5 text-center text-[12px] font-medium text-text-secondary">{rec?.passage_level || '—'}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-navy">{rec?.cwpm != null ? Math.round(rec.cwpm) : '—'}</td>
                <td className="px-4 py-2.5 text-center">
                  {rec?.accuracy_rate != null ? (
                    <span className={`font-semibold ${rec.accuracy_rate >= 95 ? 'text-green-600' : rec.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{rec.accuracy_rate.toFixed(1)}%</span>
                  ) : '—'}
                </td>
                <td className="px-4 py-2.5 text-center text-[11px] text-text-tertiary">
                  {rec?.date ? new Date(rec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={() => onAddRecord(s.id)} className="text-[10px] text-navy hover:underline font-medium">+ Add</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Student Reading View ───────────────────────────────────────────

function StudentReadingView({ students, selectedStudentId, setSelectedStudentId, lang, onAddRecord }: {
  students: any[]; selectedStudentId: string | null; setSelectedStudentId: (id: string | null) => void; lang: LangKey; onAddRecord: (sid: string) => void
}) {
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const selected = students.find((s: any) => s.id === selectedStudentId)

  useEffect(() => {
    if (!selectedStudentId) return
    (async () => {
      setLoading(true)
      const { data } = await supabase.from('reading_assessments').select('*').eq('student_id', selectedStudentId).order('date', { ascending: true })
      if (data) setRecords(data)
      setLoading(false)
    })()
  }, [selectedStudentId])

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">{lang === 'ko' ? '학생 선택' : 'Select Student'}</label>
        <select value={selectedStudentId || ''} onChange={(e: any) => setSelectedStudentId(e.target.value || null)}
          className="w-full max-w-sm px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
          <option value="">{lang === 'ko' ? '학생을 선택하세요...' : 'Choose a student...'}</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
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
              {/* CWPM Progression Bar Chart */}
              <div className="px-5 py-4 border-b border-border">
                <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3 flex items-center gap-1"><TrendingUp size={12} /> CWPM Progression</p>
                <div className="flex items-end gap-1 h-24">
                  {records.map((r: any, i: number) => {
                    const maxCwpm = Math.max(...records.map((x: any) => x.cwpm || 0), 1)
                    const height = ((r.cwpm || 0) / maxCwpm) * 100
                    return (
                      <div key={r.id} className="flex-1 flex flex-col items-center gap-1" title={`${r.date}: ${Math.round(r.cwpm || 0)} CWPM`}>
                        <span className="text-[8px] text-text-tertiary font-bold">{Math.round(r.cwpm || 0)}</span>
                        <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(height, 4)}%`, backgroundColor: r.accuracy_rate >= 95 ? '#22C55E' : r.accuracy_rate >= 90 ? '#F59E0B' : '#EF4444' }} />
                        <span className="text-[7px] text-text-tertiary">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Records table */}
              <table className="w-full text-[12px]">
                <thead><tr className="bg-surface-alt text-[10px] uppercase tracking-wider text-text-tertiary">
                  <th className="text-left px-5 py-2">Date</th>
                  <th className="text-left px-3 py-2">Passage</th>
                  <th className="text-center px-3 py-2">Level</th>
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
                      <td className="px-3 py-2 text-center"><span className="font-bold text-navy">{r.reading_level || '—'}</span></td>
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
  const [readingLevel, setReadingLevel] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Auto-calculate CWPM and accuracy
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
      reading_level: readingLevel || null, notes: notes.trim() || null,
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
          <h3 className="font-display text-lg font-semibold text-navy">{lang === 'ko' ? 'ORF 기록 추가' : 'Add ORF Record'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Student *</label>
              <select value={selStudent} onChange={(e: any) => setSelStudent(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
                <option value="">Select...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.english_name}</option>)}
              </select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Date</label>
              <input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Title</label>
              <input value={passageTitle} onChange={(e: any) => setPassageTitle(e.target.value)} placeholder="e.g. The Big Storm" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Passage Level</label>
              <input value={passageLevel} onChange={(e: any) => setPassageLevel(e.target.value)} placeholder="e.g. F, DRA 10" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
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

          {/* Auto-calculated stats */}
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

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">RAZ Level</label>
              <select value={readingLevel} onChange={(e: any) => setReadingLevel(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
                <option value="">Select RAZ level...</option>
                {READING_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Lexile</label>
              <input value={passageLevel} onChange={(e: any) => setPassageLevel(e.target.value)} placeholder="e.g. 450L" className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
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
