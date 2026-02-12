'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  Student, EnglishClass, Grade, ENGLISH_CLASSES, GRADES,
  LevelTest, LevelTestScore, LevelTestPlacement, TeacherAnecdotalRating
} from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import {
  Plus, Loader2, Save, Lock, Unlock, GripVertical, ArrowUp, ArrowDown, Minus,
  AlertTriangle, Eye, ChevronDown, ChevronRight, BarChart3, Users, ClipboardEdit,
  Layers, FileText, Star, MessageSquare, History
} from 'lucide-react'

type LangKey = 'en' | 'ko'
type Phase = 'setup' | 'scores' | 'anecdotal' | 'meeting'

const ANECDOTAL_DIMENSIONS = [
  { key: 'receptive_language', label: 'Receptive Language', desc: 'Listening & reading for their level' },
  { key: 'productive_language', label: 'Productive Language', desc: 'Speaking & writing for their level' },
  { key: 'engagement_pace', label: 'Engagement & Pace', desc: 'Progress relative to class pace' },
  { key: 'placement_recommendation', label: 'Placement Rec.', desc: 'Overall placement readiness' },
]

const ANECDOTAL_LABELS: Record<number, string> = {
  1: 'Struggling / Move down',
  2: 'Developing / Keep (building)',
  3: 'Solid / Keep (good fit)',
  4: 'Exceeding / Move up',
}

export default function LevelingView() {
  const { language, showToast, currentTeacher } = useApp()
  const lang = language as LangKey
  const isAdmin = currentTeacher?.role === 'admin'

  const [levelTests, setLevelTests] = useState<LevelTest[]>([])
  const [selectedTest, setSelectedTest] = useState<LevelTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('setup')

  // Load level tests
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('level_tests').select('*').order('created_at', { ascending: false })
      if (data) setLevelTests(data)
      setLoading(false)
    })()
  }, [])

  const handleCreateTest = async (grade: Grade, semester: 'fall' | 'spring') => {
    const name = `${semester === 'fall' ? 'Fall' : 'Spring'} ${new Date().getFullYear()} - Grade ${grade}`
    const { data, error } = await supabase.from('level_tests').insert({
      name, grade, academic_year: '2025-2026', semester, created_by: currentTeacher?.id || null,
    }).select().single()
    if (error) showToast(`Error: ${error.message}`)
    else { setLevelTests(prev => [data, ...prev]); setSelectedTest(data); setPhase('scores'); showToast('Level test created') }
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">Leveling</h2>
        <p className="text-text-secondary text-sm mt-1">Level tests, teacher ratings, and class placement decisions</p>
      </div>

      {!selectedTest ? (
        <TestSelector levelTests={levelTests} onSelect={(t) => { setSelectedTest(t); setPhase(t.status === 'finalized' ? 'meeting' : t.status === 'placement' ? 'meeting' : 'scores') }}
          onCreate={handleCreateTest} isAdmin={isAdmin} />
      ) : (
        <div>
          {/* Phase tabs */}
          <div className="px-10 py-3 bg-surface-alt border-b border-border flex items-center gap-1">
            <button onClick={() => setSelectedTest(null)} className="text-[12px] text-text-tertiary hover:text-navy mr-4">All Tests</button>
            <span className="text-[14px] font-semibold text-navy mr-4">{selectedTest.name}</span>
            {(['scores', 'anecdotal', 'meeting'] as Phase[]).map((p) => (
              <button key={p} onClick={() => setPhase(p)}
                className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${phase === p ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface'}`}>
                {p === 'scores' ? 'Test Scores' : p === 'anecdotal' ? 'Teacher Ratings' : 'Leveling Meeting'}
              </button>
            ))}
            <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${
              selectedTest.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>{selectedTest.status.toUpperCase()}</span>
          </div>

          {phase === 'scores' && <ScoreEntryPhase levelTest={selectedTest} />}
          {phase === 'anecdotal' && <AnecdotalPhase levelTest={selectedTest} />}
          {phase === 'meeting' && <MeetingPhase levelTest={selectedTest} onFinalize={() => {
            setSelectedTest({ ...selectedTest, status: 'finalized' })
            setLevelTests(prev => prev.map(t => t.id === selectedTest.id ? { ...t, status: 'finalized' } : t))
          }} />}
        </div>
      )}
    </div>
  )
}

// ─── Test Selector ──────────────────────────────────────────────────

function TestSelector({ levelTests, onSelect, onCreate, isAdmin }: {
  levelTests: LevelTest[]; onSelect: (t: LevelTest) => void; onCreate: (g: Grade, s: 'fall' | 'spring') => void; isAdmin: boolean
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newGrade, setNewGrade] = useState<Grade>(3)
  const [newSemester, setNewSemester] = useState<'fall' | 'spring'>('spring')

  return (
    <div className="px-10 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold text-navy">Level Tests</h3>
        {isAdmin && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">
            <Plus size={14} /> New Level Test
          </button>
        )}
      </div>

      {showCreate && (
        <div className="bg-accent-light border border-border rounded-xl p-4 mb-6 flex items-end gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Grade</label>
            <select value={newGrade} onChange={(e: any) => setNewGrade(Number(e.target.value) as Grade)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface">{GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Semester</label>
            <select value={newSemester} onChange={(e: any) => setNewSemester(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface">
              <option value="fall">Fall</option><option value="spring">Spring</option>
            </select>
          </div>
          <button onClick={() => { onCreate(newGrade, newSemester); setShowCreate(false) }}
            className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark">Create</button>
        </div>
      )}

      {levelTests.length === 0 ? (
        <p className="text-text-tertiary text-sm py-8 text-center">No level tests created yet.</p>
      ) : (
        <div className="space-y-2">
          {levelTests.map(t => (
            <button key={t.id} onClick={() => onSelect(t)}
              className="w-full flex items-center justify-between bg-surface border border-border rounded-xl p-4 hover:border-navy/30 transition-all text-left">
              <div>
                <p className="text-[14px] font-semibold text-navy">{t.name}</p>
                <p className="text-[12px] text-text-tertiary mt-0.5">Grade {t.grade} | {t.semester} | {t.academic_year}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                t.status === 'finalized' ? 'bg-green-100 text-green-700' : t.status === 'placement' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>{t.status.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Score Entry Phase ──────────────────────────────────────────────

function ScoreEntryPhase({ levelTest }: { levelTest: LevelTest }) {
  const { showToast } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, number | null>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const sections = levelTest.config?.sections || [
    { key: 'word_reading_correct', label: 'WR Correct', max: 80 },
    { key: 'word_reading_attempted', label: 'WR Attempted', max: null },
    { key: 'passage_cwpm', label: 'CWPM', max: null },
    { key: 'comprehension', label: 'Comprehension', max: 5 },
    { key: 'written_mc', label: 'MC', max: 21 },
    { key: 'writing', label: 'Writing', max: 20 },
  ]

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existingScores }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_class').order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      // Load existing scores
      const scoreMap: Record<string, Record<string, number | null>> = {}
      if (existingScores) {
        existingScores.forEach((s: any) => { scoreMap[s.student_id] = s.raw_scores || {} })
      }
      if (studs) studs.forEach(s => { if (!scoreMap[s.id]) scoreMap[s.id] = {} })
      setScores(scoreMap)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const updateScore = (studentId: string, key: string, value: string) => {
    const num = value === '' ? null : Number(value)
    setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: num } }))
  }

  const handleSave = async () => {
    setSaving(true)
    let errors = 0
    for (const [studentId, raw] of Object.entries(scores)) {
      const student = students.find(s => s.id === studentId)
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id, student_id: studentId,
        raw_scores: raw, previous_class: student?.english_class || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    setSaving(false)
    if (errors > 0) showToast(`Saved with ${errors} error(s)`)
    else showToast(`Saved scores for ${Object.keys(scores).length} students`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  // Group students by class
  const byClass: Record<string, Student[]> = {}
  students.forEach(s => { if (!byClass[s.english_class]) byClass[s.english_class] = []; byClass[s.english_class].push(s) })

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-text-secondary">{students.length} students in Grade {levelTest.grade}</p>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All Scores
        </button>
      </div>

      {ENGLISH_CLASSES.map(cls => {
        const classStudents = byClass[cls]
        if (!classStudents || classStudents.length === 0) return null
        return (
          <div key={cls} className="mb-6">
            <h4 className="text-[12px] font-bold mb-2 px-2 py-1 rounded inline-block"
              style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls} ({classStudents.length})</h4>
            <div className="bg-surface border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface-alt">
                    <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt">Student</th>
                    {sections.map(s => (
                      <th key={s.key} className="text-center px-2 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[70px]">
                        {s.label}{s.max ? ` /${s.max}` : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(student => (
                    <tr key={student.id} className="border-t border-border hover:bg-surface-alt/50">
                      <td className="px-3 py-1.5 sticky left-0 bg-surface font-medium text-navy whitespace-nowrap">
                        {student.english_name} <span className="text-text-tertiary font-normal">({student.korean_name})</span>
                      </td>
                      {sections.map(sec => (
                        <td key={sec.key} className="px-1 py-1 text-center">
                          <input
                            type="number" step="0.5"
                            value={scores[student.id]?.[sec.key] ?? ''}
                            onChange={(e) => updateScore(student.id, sec.key, e.target.value)}
                            className="w-14 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy"
                            max={sec.max || undefined}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Anecdotal Phase ────────────────────────────────────────────────

function AnecdotalPhase({ levelTest }: { levelTest: LevelTest }) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [ratings, setRatings] = useState<Record<string, Partial<TeacherAnecdotalRating>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_class').order('english_name'),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      const map: Record<string, Partial<TeacherAnecdotalRating>> = {}
      if (existing) existing.forEach((r: any) => { map[r.student_id] = r })
      if (studs) studs.forEach(s => { if (!map[s.id]) map[s.id] = {} })
      setRatings(map)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const updateRating = (studentId: string, field: string, value: any) => {
    setRatings(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const handleSave = async () => {
    setSaving(true)
    let errors = 0
    for (const [studentId, rating] of Object.entries(ratings)) {
      const { error } = await supabase.from('teacher_anecdotal_ratings').upsert({
        level_test_id: levelTest.id, student_id: studentId,
        teacher_id: currentTeacher?.id || null,
        receptive_language: rating.receptive_language || null,
        productive_language: rating.productive_language || null,
        engagement_pace: rating.engagement_pace || null,
        placement_recommendation: rating.placement_recommendation || null,
        notes: rating.notes || '',
        is_watchlist: rating.is_watchlist || false,
        teacher_recommends: rating.teacher_recommends || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    setSaving(false)
    if (errors > 0) showToast(`Saved with ${errors} error(s)`)
    else showToast(`Saved ratings for ${Object.keys(ratings).length} students`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const byClass: Record<string, Student[]> = {}
  students.forEach(s => { if (!byClass[s.english_class]) byClass[s.english_class] = []; byClass[s.english_class].push(s) })

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] text-text-secondary">Rate each student on 4 dimensions (1-4). Descriptors are relative to the student's current class level.</p>
          <div className="flex gap-4 mt-2 text-[10px] text-text-tertiary">
            {[1,2,3,4].map(n => <span key={n} className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-surface-alt border border-border flex items-center justify-center font-bold text-navy">{n}</span> {ANECDOTAL_LABELS[n]}</span>)}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All Ratings
        </button>
      </div>

      {ENGLISH_CLASSES.map(cls => {
        const classStudents = byClass[cls]
        if (!classStudents || classStudents.length === 0) return null
        return (
          <div key={cls} className="mb-6">
            <h4 className="text-[12px] font-bold mb-2 px-2 py-1 rounded inline-block"
              style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls} ({classStudents.length})</h4>
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              {classStudents.map(student => {
                const r = ratings[student.id] || {}
                const avg = [r.receptive_language, r.productive_language, r.engagement_pace, r.placement_recommendation]
                  .filter(v => v != null).reduce((a, b) => a! + b!, 0)! / Math.max([r.receptive_language, r.productive_language, r.engagement_pace, r.placement_recommendation].filter(v => v != null).length, 1)
                const isExpanded = expandedStudent === student.id

                return (
                  <div key={student.id} className="border-b border-border last:border-0">
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-alt/50 cursor-pointer" onClick={() => setExpandedStudent(isExpanded ? null : student.id)}>
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium text-navy">{student.english_name}</span>
                        <span className="text-[11px] text-text-tertiary ml-2">{student.korean_name}</span>
                      </div>
                      {/* Quick rating buttons */}
                      <div className="flex items-center gap-2">
                        {ANECDOTAL_DIMENSIONS.map(dim => (
                          <div key={dim.key} className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                            {[1,2,3,4].map(val => (
                              <button key={val} onClick={() => updateRating(student.id, dim.key, val)}
                                className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                  (r as any)[dim.key] === val
                                    ? val <= 1 ? 'bg-red-500 text-white' : val === 2 ? 'bg-amber-500 text-white' : val === 3 ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                                    : 'bg-surface-alt text-text-tertiary hover:bg-surface-alt/80'
                                }`}>{val}</button>
                            ))}
                          </div>
                        ))}
                        <span className="text-[11px] font-bold text-navy w-8 text-center">{avg > 0 ? avg.toFixed(1) : '—'}</span>
                        {r.is_watchlist && <Star size={12} className="text-amber-500 fill-amber-500" />}
                        {isExpanded ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 bg-accent-light border-t border-border" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center gap-2 text-[11px]">
                            <input type="checkbox" checked={r.is_watchlist || false} onChange={e => updateRating(student.id, 'is_watchlist', e.target.checked)} />
                            <Star size={12} className="text-amber-500" /> Watchlist
                          </label>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-text-secondary">Recommends:</span>
                            {(['keep', 'move_up', 'move_down'] as const).map(opt => (
                              <button key={opt} onClick={() => updateRating(student.id, 'teacher_recommends', r.teacher_recommends === opt ? null : opt)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                  r.teacher_recommends === opt
                                    ? opt === 'keep' ? 'bg-blue-500 text-white' : opt === 'move_up' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                    : 'bg-surface border border-border text-text-secondary hover:bg-surface-alt'
                                }`}>
                                {opt === 'keep' ? 'Keep' : opt === 'move_up' ? 'Move Up' : 'Move Down'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={r.notes || ''} onChange={e => updateRating(student.id, 'notes', e.target.value)}
                          placeholder="Optional notes for leveling meeting..."
                          className="w-full px-3 py-2 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-surface resize-none h-16"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Meeting Phase (Drag & Drop Placement) ──────────────────────────

function MeetingPhase({ levelTest, onFinalize }: { levelTest: LevelTest; onFinalize: () => void }) {
  const { showToast, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [anecdotals, setAnecdotals] = useState<Record<string, any>>({})
  const [placements, setPlacements] = useState<Record<string, EnglishClass>>({})
  const [autoPlacements, setAutoPlacements] = useState<Record<string, EnglishClass>>({})
  const [benchmarks, setBenchmarks] = useState<Record<string, any>>({})
  const [semGrades, setSemGrades] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragStudent, setDragStudent] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const [
        { data: studs },
        { data: scoreData },
        { data: anecData },
        { data: benchData },
        { data: placementData },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
        supabase.from('class_benchmarks').select('*').eq('grade', levelTest.grade),
        supabase.from('level_test_placements').select('*').eq('level_test_id', levelTest.id),
      ])

      if (studs) setStudents(studs)

      // Build benchmark map: class -> benchmarks
      const bMap: Record<string, any> = {}
      if (benchData) benchData.forEach((b: any) => { bMap[b.english_class] = b })
      setBenchmarks(bMap)

      // Build score map
      const sMap: Record<string, any> = {}
      if (scoreData) scoreData.forEach((s: any) => { sMap[s.student_id] = s })
      setScores(sMap)

      // Build anecdotal map
      const aMap: Record<string, any> = {}
      if (anecData) anecData.forEach((a: any) => { aMap[a.student_id] = a })
      setAnecdotals(aMap)

      // Load semester grades for all students
      if (studs) {
        const ids = studs.map((s: any) => s.id)
        const { data: sgData } = await supabase.from('semester_grades').select('*').in('student_id', ids)
        const sgMap: Record<string, any[]> = {}
        if (sgData) sgData.forEach((sg: any) => { if (!sgMap[sg.student_id]) sgMap[sg.student_id] = []; sgMap[sg.student_id].push(sg) })
        setSemGrades(sgMap)
      }

      // Run algorithm and set placements
      if (studs && benchData) {
        const computed = computePlacements(studs, sMap, aMap, bMap, {})
        setAutoPlacements(computed)
        // Use existing placements if finalized, otherwise auto
        const pMap: Record<string, EnglishClass> = {}
        if (placementData && placementData.length > 0) {
          placementData.forEach((p: any) => { pMap[p.student_id] = p.final_placement })
        } else {
          Object.entries(computed).forEach(([sid, cls]) => { pMap[sid] = cls })
        }
        setPlacements(pMap)
      }

      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const handleDrop = (studentId: string, targetClass: EnglishClass) => {
    setPlacements(prev => ({ ...prev, [studentId]: targetClass }))
    setDragStudent(null)
  }

  const handleSave = async () => {
    setSaving(true)
    let errors = 0
    for (const [studentId, finalClass] of Object.entries(placements)) {
      const autoClass = autoPlacements[studentId] || students.find(s => s.id === studentId)?.english_class || 'Lily'
      const { error } = await supabase.from('level_test_placements').upsert({
        level_test_id: levelTest.id, student_id: studentId,
        auto_placement: autoClass, final_placement: finalClass,
        is_overridden: finalClass !== autoClass,
        override_by: finalClass !== autoClass ? currentTeacher?.id : null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    setSaving(false)
    if (errors > 0) showToast(`Saved with ${errors} error(s)`)
    else showToast('Placements saved')
  }

  const handleFinalize = async () => {
    if (!confirm('Finalize placements? This will update all student class assignments.')) return
    await handleSave()
    // Update student records
    for (const [studentId, finalClass] of Object.entries(placements)) {
      await supabase.from('students').update({ english_class: finalClass }).eq('id', studentId)
    }
    await supabase.from('level_tests').update({ status: 'finalized', finalized_at: new Date().toISOString() }).eq('id', levelTest.id)
    showToast('Placements finalized and students updated')
    onFinalize()
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  // Class size distribution
  const classCounts: Record<string, number> = {}
  ENGLISH_CLASSES.forEach(c => { classCounts[c] = 0 })
  Object.values(placements).forEach(c => { classCounts[c] = (classCounts[c] || 0) + 1 })

  return (
    <div className="px-6 py-6">
      {/* Class distribution bar + actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {ENGLISH_CLASSES.map(cls => (
            <div key={cls} className="text-center px-3 py-1.5 rounded-lg" style={{ backgroundColor: classToColor(cls) + '40' }}>
              <p className="text-[10px] font-bold" style={{ color: classToTextColor(cls) }}>{cls}</p>
              <p className="text-[16px] font-bold text-navy">{classCounts[cls]}</p>
            </div>
          ))}
          <div className="text-center px-3 py-1.5 rounded-lg bg-surface-alt">
            <p className="text-[10px] font-bold text-text-tertiary">Total</p>
            <p className="text-[16px] font-bold text-navy">{students.length}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
          {isAdmin && levelTest.status !== 'finalized' && (
            <button onClick={handleFinalize}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-green-600 text-white hover:bg-green-700">
              <Lock size={14} /> Finalize & Apply
            </button>
          )}
        </div>
      </div>

      {/* Class columns */}
      <div className="grid grid-cols-6 gap-3">
        {ENGLISH_CLASSES.map(cls => {
          const classStudents = students.filter(s => placements[s.id] === cls)
            .sort((a, b) => {
              const scoreA = scores[a.id]?.composite_index || 0
              const scoreB = scores[b.id]?.composite_index || 0
              return scoreB - scoreA
            })

          return (
            <div key={cls}
              className="rounded-xl border-2 min-h-[400px] transition-all"
              style={{ borderColor: dragStudent ? classToColor(cls) : '#e2e8f0', backgroundColor: dragStudent ? classToColor(cls) + '08' : '#fafafa' }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragStudent && handleDrop(dragStudent, cls)}>
              <div className="px-3 py-2 rounded-t-xl" style={{ backgroundColor: classToColor(cls) }}>
                <p className="text-[12px] font-bold text-center" style={{ color: classToTextColor(cls) }}>{cls} ({classStudents.length})</p>
              </div>
              <div className="p-1.5 space-y-1">
                {classStudents.map(student => {
                  const score = scores[student.id]
                  const anec = anecdotals[student.id]
                  const auto = autoPlacements[student.id]
                  const isOverride = auto && auto !== cls
                  const wasInClass = student.english_class === cls
                  const movedUp = ENGLISH_CLASSES.indexOf(cls) > ENGLISH_CLASSES.indexOf(student.english_class as EnglishClass)
                  const movedDown = ENGLISH_CLASSES.indexOf(cls) < ENGLISH_CLASSES.indexOf(student.english_class as EnglishClass)

                  return (
                    <div key={student.id}
                      draggable={levelTest.status !== 'finalized'}
                      onDragStart={() => setDragStudent(student.id)}
                      onDragEnd={() => setDragStudent(null)}
                      className={`bg-white rounded-lg border p-2 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${
                        isOverride ? 'border-amber-300' : anec?.is_watchlist ? 'border-amber-400' : 'border-border'
                      } ${expandedCard === student.id ? 'ring-2 ring-navy/20' : ''}`}
                      onClick={() => setExpandedCard(expandedCard === student.id ? null : student.id)}>
                      <div className="flex items-center gap-1">
                        <GripVertical size={10} className="text-text-tertiary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-navy truncate">{student.english_name}</p>
                          <p className="text-[8px] text-text-tertiary truncate">{student.korean_name}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {movedUp && <ArrowUp size={10} className="text-green-500" />}
                          {movedDown && <ArrowDown size={10} className="text-red-500" />}
                          {wasInClass && !movedUp && !movedDown && <Minus size={10} className="text-text-tertiary" />}
                          {anec?.is_watchlist && <Star size={9} className="text-amber-500 fill-amber-500" />}
                          {isOverride && <AlertTriangle size={9} className="text-amber-500" />}
                        </div>
                      </div>

                      {/* Compact score summary */}
                      {score?.raw_scores && (
                        <div className="flex gap-1 mt-1 text-[8px] text-text-tertiary">
                          {score.raw_scores.passage_cwpm != null && <span>CWPM:{Math.round(score.raw_scores.passage_cwpm)}</span>}
                          {score.raw_scores.writing != null && <span>W:{score.raw_scores.writing}</span>}
                          {score.raw_scores.written_mc != null && <span>MC:{score.raw_scores.written_mc}</span>}
                        </div>
                      )}

                      {/* Anecdotal avg */}
                      {anec && (
                        <div className="flex gap-0.5 mt-1">
                          {ANECDOTAL_DIMENSIONS.map(dim => {
                            const val = anec[dim.key]
                            if (!val) return <div key={dim.key} className="w-3 h-3 rounded-sm bg-gray-100" />
                            const color = val <= 1 ? '#ef4444' : val === 2 ? '#f59e0b' : val === 3 ? '#3b82f6' : '#22c55e'
                            return <div key={dim.key} className="w-3 h-3 rounded-sm text-white flex items-center justify-center" style={{ backgroundColor: color, fontSize: '7px', fontWeight: 700 }}>{val}</div>
                          })}
                        </div>
                      )}

                      {/* Teacher recommends */}
                      {anec?.teacher_recommends && (
                        <p className={`text-[7px] font-bold mt-0.5 ${
                          anec.teacher_recommends === 'keep' ? 'text-blue-600' : anec.teacher_recommends === 'move_up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          Teacher: {anec.teacher_recommends === 'keep' ? 'KEEP' : anec.teacher_recommends === 'move_up' ? 'MOVE UP' : 'MOVE DOWN'}
                        </p>
                      )}

                      {/* Expanded detail */}
                      {expandedCard === student.id && (
                        <div className="mt-2 pt-2 border-t border-border text-[9px] space-y-1" onClick={e => e.stopPropagation()}>
                          <p className="text-text-secondary">Previous: <span className="font-bold">{student.english_class}</span> | Auto: <span className="font-bold">{auto || '—'}</span></p>
                          {anec?.notes && <p className="text-text-tertiary italic">"{anec.notes}"</p>}
                          {/* Semester grades summary */}
                          {semGrades[student.id] && semGrades[student.id].length > 0 && (
                            <div>
                              <p className="font-semibold text-text-secondary">Grades:</p>
                              {semGrades[student.id].slice(0, 6).map((sg: any, i: number) => (
                                <span key={i} className="inline-block mr-2">{sg.domain}: {sg.score?.toFixed(0)}%</span>
                              ))}
                            </div>
                          )}
                          {/* Override dropdown */}
                          <select value={cls} onChange={e => handleDrop(student.id, e.target.value as EnglishClass)}
                            className="w-full px-2 py-1 border border-border rounded text-[10px] bg-surface">
                            {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Placement Algorithm (Option C: Benchmark-Relative) ─────────────

function computePlacements(
  students: Student[],
  scores: Record<string, any>,
  anecdotals: Record<string, any>,
  benchmarks: Record<string, any>,
  semGrades: Record<string, any[]>,
): Record<string, EnglishClass> {
  const result: Record<string, EnglishClass> = {}

  // Step 1: Compute benchmark-relative scores for each student
  const studentMetrics: Record<string, { testScore: number; gradeScore: number; anecScore: number; composite: number }> = {}

  students.forEach(s => {
    const bench = benchmarks[s.english_class]
    const score = scores[s.id]
    const anec = anecdotals[s.id]
    const grades = semGrades[s.id] || []

    // Test score: benchmark-relative
    let testRatio = 0.5 // default middle if no data
    if (score?.raw_scores && bench) {
      const ratios: number[] = []
      // CWPM
      if (score.raw_scores.passage_cwpm != null && bench.cwpm_end > 0) {
        ratios.push(score.raw_scores.passage_cwpm / bench.cwpm_end)
      }
      // Writing
      if (score.raw_scores.writing != null && bench.writing_end > 0) {
        ratios.push(score.raw_scores.writing / bench.writing_end)
      }
      // MC (directly comparable, use raw percentile later)
      if (score.raw_scores.written_mc != null) {
        ratios.push(score.raw_scores.written_mc / 21) // max MC
      }
      // WR accuracy
      if (score.raw_scores.word_reading_correct != null && score.raw_scores.word_reading_attempted > 0) {
        ratios.push(score.raw_scores.word_reading_correct / score.raw_scores.word_reading_attempted)
      }
      if (ratios.length > 0) testRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
    }

    // Classroom grades: average score / 100
    let gradeRatio = 0.5
    if (grades.length > 0) {
      const avg = grades.filter((g: any) => g.score != null).reduce((sum: number, g: any) => sum + g.score, 0) / Math.max(grades.filter((g: any) => g.score != null).length, 1)
      gradeRatio = avg / 100
    }

    // Anecdotal: average of 4 dimensions / 4
    let anecRatio = 0.5
    if (anec) {
      const vals = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null)
      if (vals.length > 0) anecRatio = vals.reduce((a: number, b: number) => a + b, 0) / (vals.length * 4)
    }

    // Weighted composite: 30% test, 40% grades, 30% anecdotal
    const composite = (testRatio * 0.3) + (gradeRatio * 0.4) + (anecRatio * 0.3)
    studentMetrics[s.id] = { testScore: testRatio, gradeScore: gradeRatio, anecScore: anecRatio, composite }
  })

  // Step 2: Percentile rank the composites within the grade
  const composites = students.map(s => ({ id: s.id, composite: studentMetrics[s.id]?.composite || 0 }))
    .sort((a, b) => a.composite - b.composite)

  const percentiles: Record<string, number> = {}
  composites.forEach((c, i) => { percentiles[c.id] = i / Math.max(composites.length - 1, 1) })

  // Step 3: Map percentiles to classes
  // Divide into 6 roughly equal bands
  const bandSize = 1 / ENGLISH_CLASSES.length
  students.forEach(s => {
    const p = percentiles[s.id] || 0
    // Safety floor: if CWPM < threshold or can't read, floor to Lily
    const score = scores[s.id]
    if (score?.raw_scores) {
      const wr = score.raw_scores.word_reading_correct || 0
      const wrAtt = score.raw_scores.word_reading_attempted || 1
      if (wr < 4 || (wr / wrAtt) < 0.1) {
        result[s.id] = 'Lily'
        return
      }
    }

    const classIndex = Math.min(Math.floor(p / bandSize), ENGLISH_CLASSES.length - 1)
    result[s.id] = ENGLISH_CLASSES[classIndex]
  })

  return result
}
