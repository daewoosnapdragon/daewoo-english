'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, Grade, ENGLISH_CLASSES, GRADES, LevelTest, TeacherAnecdotalRating } from '@/types'
import { classToColor, classToTextColor, domainLabel } from '@/lib/utils'
import { Plus, Loader2, Save, Lock, GripVertical, ArrowUp, ArrowDown, Minus, AlertTriangle, ChevronLeft, ChevronRight, Star, X, SlidersHorizontal, Printer, Download, Users } from 'lucide-react'
import WIDABadge from '@/components/shared/WIDABadge'
import LevelingHoverCard from '@/components/shared/LevelingHoverCard'
import Grade1ScoreEntry, { G1ResultsView } from '@/components/leveling/Grade1ScoreEntry'
import { WIDA_LEVELS } from '@/components/curriculum/CurriculumView'
import { exportToCSV } from '@/lib/export'

type Phase = 'setup' | 'scores' | 'anecdotal' | 'results' | 'meeting'

const DIMS = [
  { key: 'receptive_language', label: 'Receptive Language', desc: 'Listening & reading for their class level',
    levels: ['Consistently struggles with class-level input, even with support', 'Accesses some class material but needs frequent scaffolding', 'Keeps up with class-level material with occasional help', 'Handles class material easily, could manage more complex input'] },
  { key: 'productive_language', label: 'Productive Language', desc: 'Speaking & writing for their class level',
    levels: ['Minimal output at class level, relies heavily on L1 or gestures', 'Produces some output with scaffolding, limited independence', 'Produces expected output for class level with developing control', 'Output exceeds class expectations, showing readiness for next level'] },
  { key: 'engagement_pace', label: 'Engagement & Learning Pace', desc: 'Progress relative to class pace',
    levels: ['Disengaged or overwhelmed, not making visible progress', 'Engaged but progressing slowly relative to class pace', 'Keeping pace with class, steady progress', 'Progressing faster than class pace, needs more challenge'] },
  { key: 'placement_recommendation', label: 'Placement Recommendation', desc: 'Overall placement readiness',
    levels: ['Consider moving down', 'Keep in current class (still building)', 'Keep in current class (solid fit)', 'Consider moving up'] },
]

// ─── Main View ──────────────────────────────────────────────────────

export default function LevelingView() {
  const { showToast, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class as EnglishClass : null
  const [levelTests, setLevelTests] = useState<LevelTest[]>([])
  const [selectedTest, setSelectedTest] = useState<LevelTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('setup')

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

  if (!selectedTest) return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">Leveling</h2>
        <p className="text-text-secondary text-sm mt-1">Level tests, teacher ratings, and class placement decisions</p>
      </div>
      <div className="px-10 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-semibold text-navy">Level Tests</h3>
          {isAdmin && <CreateTestBtn onCreate={handleCreateTest} />}
        </div>
        {levelTests.length === 0 ? <p className="text-text-tertiary text-sm py-8 text-center">No level tests created yet.</p> :
          <div className="space-y-2">{levelTests.map(t => (
            <button key={t.id} onClick={() => { setSelectedTest(t); setPhase('scores') }}
              className="w-full flex items-center justify-between bg-surface border border-border rounded-xl p-4 hover:border-navy/30 transition-all text-left">
              <div><p className="text-[14px] font-semibold text-navy">{t.name}</p><p className="text-[12px] text-text-tertiary mt-0.5">Grade {t.grade} | {t.semester === 'spring' ? 'Spring' : t.semester === 'fall' ? 'Fall' : t.semester} | {t.academic_year}</p></div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t.status.toUpperCase()}</span>
            </button>))}</div>}

        {/* Emergency Leveling - Grade 1 Only */}
        {isAdmin && <EmergencyLeveling />}
      </div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">Leveling</h2>
      </div>
      <div className="px-10 py-3 bg-surface-alt border-b border-border flex items-center gap-1">
        <button onClick={() => setSelectedTest(null)} className="text-[12px] text-text-tertiary hover:text-navy mr-3"><ChevronLeft size={14} className="inline" /> All Tests</button>
        <span className="text-[14px] font-semibold text-navy mr-4">{selectedTest.name}</span>
        {/* Grade 1 Wave 1 (oral only): skip Teacher Ratings. Wave 2 (has written): show all phases. */}
        {(String(selectedTest.grade) === '1'
          ? (['scores', 'results', 'meeting'] as Phase[])
          : (['scores', 'anecdotal', 'results', 'meeting'] as Phase[])
        ).map(p => (
          <button key={p} onClick={() => setPhase(p)} className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${phase === p ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface'}`}>
            {p === 'scores' ? 'Test Scores' : p === 'anecdotal' ? 'Teacher Ratings' : p === 'results' ? 'Results' : 'Leveling Meeting'}
          </button>
        ))}
        <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded-full ${selectedTest.status === 'finalized' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedTest.status.toUpperCase()}</span>
      </div>
      {phase === 'scores' && <ScoreEntryPhase levelTest={selectedTest} teacherClass={teacherClass} isAdmin={isAdmin} onContinue={() => setPhase('anecdotal')} />}
      {phase === 'anecdotal' && <AnecdotalPhase levelTest={selectedTest} teacherClass={teacherClass} isAdmin={isAdmin} />}
      {phase === 'results' && <ResultsPhase levelTest={selectedTest} />}
      {phase === 'meeting' && <MeetingPhase levelTest={selectedTest} onFinalize={() => {
        setSelectedTest({ ...selectedTest, status: 'finalized' }); setLevelTests(prev => prev.map(t => t.id === selectedTest.id ? { ...t, status: 'finalized' } : t))
      }} />}
    </div>
  )
}

// ─── Emergency Leveling (Grade 1 Only) ──────────────────────────────

function EmergencyLeveling() {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [newClass, setNewClass] = useState<EnglishClass>('Lily')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      const { data: studs } = await supabase.from('students').select('*').eq('grade', 1).eq('is_active', true).order('english_class').order('english_name')
      if (studs) setStudents(studs)
      // Load emergency move history from notes pattern
      const { data: logs } = await supabase.from('behavior_logs').select('*, students(english_name, korean_name)').eq('type', 'note').like('note', 'EMERGENCY LEVEL CHANGE%').order('created_at', { ascending: false }).limit(20)
      if (logs) setHistory(logs)
      setLoading(false)
    })()
  }, [])

  const handleMove = async () => {
    if (!selectedStudent || !reason.trim()) { showToast('Select a student and provide a reason'); return }
    const student = students.find(s => s.id === selectedStudent)
    if (!student) return
    const oldClass = student.english_class
    if (oldClass === newClass) { showToast('Student is already in that class'); return }

    if (!confirm(`Move ${student.english_name} from ${oldClass} to ${newClass}?\n\nReason: ${reason}`)) return

    setSaving(true)
    // Update student class
    const teacherMap: Record<string, string> = { Lily: '00000000-0000-0000-0000-000000000001', Camellia: '00000000-0000-0000-0000-000000000002', Daisy: '00000000-0000-0000-0000-000000000003', Sunflower: '00000000-0000-0000-0000-000000000004', Marigold: '00000000-0000-0000-0000-000000000005', Snapdragon: '00000000-0000-0000-0000-000000000006' }
    await supabase.from('students').update({ english_class: newClass, teacher_id: teacherMap[newClass] || null }).eq('id', selectedStudent)
    // Log the change as a behavior note for tracking
    await supabase.from('behavior_logs').insert({
      student_id: selectedStudent, date: new Date().toISOString().split('T')[0], type: 'note',
      note: `EMERGENCY LEVEL CHANGE: ${oldClass} -> ${newClass}. Reason: ${reason}`,
      is_flagged: false, teacher_id: currentTeacher?.id || null,
    })
    setSaving(false)
    showToast(`${student.english_name} moved from ${oldClass} to ${newClass}`)
    setSelectedStudent(''); setReason(''); setNewClass('Lily')
    // Refresh
    const { data: studs } = await supabase.from('students').select('*').eq('grade', 1).eq('is_active', true).order('english_class').order('english_name')
    if (studs) setStudents(studs)
    const { data: logs } = await supabase.from('behavior_logs').select('*, students(english_name, korean_name)').eq('type', 'note').like('note', 'EMERGENCY LEVEL CHANGE%').order('created_at', { ascending: false }).limit(20)
    if (logs) setHistory(logs)
  }

  if (loading) return null

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="font-display text-lg font-semibold text-navy">Emergency Leveling</h3>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Grade 1 Only</span>
      </div>
      <p className="text-[12px] text-text-secondary mb-4">Move Grade 1 students between classes mid-semester if they are not a good fit. This is tracked and logged.</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Student</label>
            <select value={selectedStudent} onChange={e => { setSelectedStudent(e.target.value); const s = students.find(st => st.id === e.target.value); if (s) setNewClass(s.english_class as EnglishClass) }}
              className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-[12px] bg-white outline-none">
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name}) -- {s.english_class}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Move To</label>
            <select value={newClass} onChange={e => setNewClass(e.target.value as EnglishClass)}
              className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-[12px] bg-white outline-none">
              {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Reason *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this student being moved?"
              className="w-full px-2.5 py-2 border border-amber-300 rounded-lg text-[12px] bg-white outline-none" />
          </div>
        </div>
        <button onClick={handleMove} disabled={saving || !selectedStudent || !reason.trim()}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />} Move Student
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold text-text-secondary mb-2">Recent Emergency Moves</p>
          <div className="space-y-1">
            {history.map((h: any) => (
              <div key={h.id} className="flex items-center gap-2 text-[11px] text-text-secondary bg-surface-alt rounded-lg px-3 py-1.5">
                <span className="font-medium text-navy">{h.students?.english_name || 'Unknown'}</span>
                <span className="text-text-tertiary">{h.note.replace('EMERGENCY LEVEL CHANGE: ', '')}</span>
                <span className="ml-auto text-text-tertiary">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CreateTestBtn({ onCreate }: { onCreate: (g: Grade, s: 'fall' | 'spring') => void }) {
  const [open, setOpen] = useState(false)
  const [g, setG] = useState<Grade>(3)
  const [sem, setSem] = useState<'fall' | 'spring'>('spring')
  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Plus size={14} /> New Level Test</button>
  return (
    <div className="flex items-end gap-3">
      <select value={g} onChange={(e: any) => setG(Number(e.target.value) as Grade)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface">{GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
      <select value={sem} onChange={(e: any) => setSem(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface"><option value="fall">Fall</option><option value="spring">Spring</option></select>
      <button onClick={() => { onCreate(g, sem); setOpen(false) }} className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark">Create</button>
      <button onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-text-secondary">Cancel</button>
    </div>
  )
}

// ─── Class Tabs Component ───────────────────────────────────────────

function ClassTabs({ active, onSelect, counts, available }: { active: EnglishClass; onSelect: (c: EnglishClass) => void; counts: Record<string, { total: number; done: number }>; available: EnglishClass[] }) {
  return (
    <div className="flex items-center gap-1 mb-4">
      {available.map(cls => (
        <button key={cls} onClick={() => onSelect(cls)}
          className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 ${active === cls ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
          style={active === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
          {cls} <span className={`text-[10px] ${active === cls ? 'opacity-80' : 'text-text-tertiary'}`}>{counts[cls]?.done}/{counts[cls]?.total}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Score Entry Phase ──────────────────────────────────────────────

function ScoreEntryPhase({ levelTest, teacherClass, isAdmin, onContinue }: { levelTest: LevelTest; teacherClass: EnglishClass | null; isAdmin: boolean; onContinue: () => void }) {
  // Grade 1 uses the comprehensive two-part test entry (Written + Oral + Results)
  if (levelTest.grade === 1 || levelTest.grade === '1' as any) {
    return (
      <div>
        <Grade1ScoreEntry levelTest={levelTest} isAdmin={isAdmin} />
      </div>
    )
  }

  // Generic scoring for other grades (until grade-specific modules are built)
  return <GenericScoreEntry levelTest={levelTest} teacherClass={teacherClass} isAdmin={isAdmin} onContinue={onContinue} />
}

function GenericScoreEntry({ levelTest, teacherClass, isAdmin, onContinue }: { levelTest: LevelTest; teacherClass: EnglishClass | null; isAdmin: boolean; onContinue: () => void }) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, Record<string, number | null>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<EnglishClass>(teacherClass || 'Lily')
  const [editingSections, setEditingSections] = useState(false)
  const [editSections, setEditSections] = useState<{ key: string; label: string; max: number | null }[]>([])

  const sections = levelTest.config?.sections || [
    { key: 'word_reading_correct', label: 'WR Correct', max: 80 },
    { key: 'word_reading_attempted', label: 'WR Attempted', max: null },
    { key: 'passage_cwpm', label: 'CWPM', max: null },
    { key: 'comprehension', label: 'Comprehension', max: 5 },
    { key: 'written_mc', label: 'MC', max: 21 },
    { key: 'writing', label: 'Writing', max: 20 },
  ]

  const handleSaveSections = async () => {
    const config = { ...(levelTest.config || {}), sections: editSections }
    const { error } = await supabase.from('level_tests').update({ config }).eq('id', levelTest.id)
    if (error) showToast(`Error: ${error.message}`)
    else {
      // Update local levelTest config so changes show immediately
      levelTest.config = config
      showToast('Sections updated')
      setEditingSections(false)
    }
  }

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      const map: Record<string, Record<string, number | null>> = {}
      if (existing) existing.forEach((s: any) => { map[s.student_id] = s.raw_scores || {} })
      if (studs) studs.forEach(s => { if (!map[s.id]) map[s.id] = {} })
      setScores(map)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const handleSaveClass = async () => {
    setSaving(true)
    const cs = students.filter(s => s.english_class === activeTab)
    let errors = 0
    for (const s of cs) {
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id, student_id: s.id, raw_scores: scores[s.id] || {}, previous_class: s.english_class, entered_by: currentTeacher?.id || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    setSaving(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved ${activeTab} scores (${cs.length} students)`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const available = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classCounts: Record<string, { total: number; done: number }> = {}
  ENGLISH_CLASSES.forEach(cls => {
    const s = students.filter(s => s.english_class === cls)
    classCounts[cls] = { total: s.length, done: s.filter(st => { const sc = scores[st.id]; return sc && Object.values(sc).some(v => v != null) }).length }
  })
  const classStudents = students.filter(s => s.english_class === activeTab)

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between">
        <ClassTabs active={activeTab} onSelect={setActiveTab} counts={classCounts} available={available} />
        <div className="flex items-center gap-2 mb-4">
          {!editingSections && (
            <button onClick={() => { setEditSections(sections.map(s => ({ ...s }))); setEditingSections(true) }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
              <SlidersHorizontal size={12} /> Edit Sections
            </button>
          )}
          <button onClick={handleSaveClass} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save {activeTab}
          </button>
        </div>
      </div>

      {editingSections && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-amber-800">Edit Test Sections</p>
            <div className="flex gap-2">
              <button onClick={() => setEditSections([...editSections, { key: `section_${Date.now()}`, label: 'New Section', max: null }])}
                className="text-[11px] px-2 py-1 rounded bg-amber-200 text-amber-800 hover:bg-amber-300"><Plus size={10} className="inline" /> Add</button>
              <button onClick={handleSaveSections} className="text-[11px] px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">Save Sections</button>
              <button onClick={() => setEditingSections(false)} className="text-[11px] px-2 py-1 rounded text-amber-700 hover:bg-amber-100">Cancel</button>
            </div>
          </div>
          {editSections.map((sec, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={sec.label} onChange={e => { const ns = [...editSections]; ns[i] = { ...ns[i], label: e.target.value }; setEditSections(ns) }}
                className="flex-1 px-2 py-1 border border-amber-300 rounded text-[12px] bg-white" placeholder="Label" />
              <input value={sec.key} onChange={e => { const ns = [...editSections]; ns[i] = { ...ns[i], key: e.target.value.replace(/\s/g, '_').toLowerCase() }; setEditSections(ns) }}
                className="w-32 px-2 py-1 border border-amber-300 rounded text-[11px] bg-white font-mono" placeholder="key_name" />
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-amber-700">Max:</span>
                <input type="number" value={sec.max ?? ''} onChange={e => { const ns = [...editSections]; ns[i] = { ...ns[i], max: e.target.value === '' ? null : Number(e.target.value) }; setEditSections(ns) }}
                  className="w-14 px-1.5 py-1 border border-amber-300 rounded text-[11px] text-center bg-white" placeholder="--" />
              </div>
              <button onClick={() => setEditSections(editSections.filter((_, j) => j !== i))} className="p-1 text-amber-600 hover:text-red-600"><X size={12} /></button>
            </div>
          ))}
          <p className="text-[9px] text-amber-600">Changes are saved to the database and apply immediately.</p>
        </div>
      )}
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[200px]">Student</th>
            {sections.map(s => <th key={s.key} className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold min-w-[80px]">{s.label}{s.max ? <span className="text-text-tertiary font-normal"> /{s.max}</span> : ''}</th>)}
          </tr></thead>
          <tbody>{classStudents.length === 0 ? <tr><td colSpan={sections.length + 1} className="text-center py-8 text-text-tertiary">No students in {activeTab}</td></tr> :
            classStudents.map(student => (
              <tr key={student.id} className="border-t border-border hover:bg-surface-alt/30">
                <td className="px-4 py-2 sticky left-0 bg-surface font-medium text-navy whitespace-nowrap">{student.english_name} <span className="text-text-tertiary font-normal text-[11px]">{student.korean_name}</span></td>
                {sections.map(sec => <td key={sec.key} className="px-2 py-1.5 text-center">
                  <input type="number" step="0.5" value={scores[student.id]?.[sec.key] ?? ''} onChange={e => setScores(prev => ({ ...prev, [student.id]: { ...prev[student.id], [sec.key]: e.target.value === '' ? null : Number(e.target.value) } }))}
                    className="w-16 px-2 py-1.5 border border-border rounded-lg text-center text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20" max={sec.max || undefined} />
                </td>)}
              </tr>))}</tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-tertiary mt-3">Entered by: {currentTeacher?.name || 'Unknown'} | Only {activeTab} students saved when you click Save.</p>
    </div>
  )
}

// ─── Anecdotal Phase ────────────────────────────────────────────────

function AnecdotalPhase({ levelTest, teacherClass, isAdmin }: { levelTest: LevelTest; teacherClass: EnglishClass | null; isAdmin: boolean }) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [ratings, setRatings] = useState<Record<string, Partial<TeacherAnecdotalRating>>>({})
  const [studentData, setStudentData] = useState<Record<string, { grades: any[]; reading: any[]; scores: any }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<EnglishClass>(teacherClass || 'Lily')
  const [modalIdx, setModalIdx] = useState<number | null>(null)

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }, { data: testScores }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) {
        setStudents(studs)
        const ids = studs.map((s: Student) => s.id)
        const [{ data: sg }, { data: rd }] = await Promise.all([
          supabase.from('semester_grades').select('*, semesters(name)').in('student_id', ids),
          supabase.from('reading_assessments').select('*').in('student_id', ids).order('date', { ascending: false }),
        ])
        const dm: Record<string, { grades: any[]; reading: any[]; scores: any }> = {}
        studs.forEach((s: Student) => { dm[s.id] = { grades: [], reading: [], scores: null } })
        sg?.forEach((g: any) => { if (dm[g.student_id]) dm[g.student_id].grades.push(g) })
        rd?.forEach((r: any) => { if (dm[r.student_id]) dm[r.student_id].reading.push(r) })
        testScores?.forEach((ts: any) => { if (dm[ts.student_id]) dm[ts.student_id].scores = ts.raw_scores })
        setStudentData(dm)
      }
      const map: Record<string, Partial<TeacherAnecdotalRating>> = {}
      existing?.forEach((r: any) => { map[r.student_id] = r })
      studs?.forEach((s: any) => { if (!map[s.id]) map[s.id] = {} })
      setRatings(map)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const saveOne = async (sid: string) => {
    const r = ratings[sid] || {}
    const { error } = await supabase.from('teacher_anecdotal_ratings').upsert({
      level_test_id: levelTest.id, student_id: sid, teacher_id: currentTeacher?.id || null,
      receptive_language: r.receptive_language || null, productive_language: r.productive_language || null,
      engagement_pace: r.engagement_pace || null, placement_recommendation: r.placement_recommendation || null,
      notes: r.notes || '', is_watchlist: r.is_watchlist || false, teacher_recommends: r.teacher_recommends || null,
    }, { onConflict: 'level_test_id,student_id' })
    if (error) showToast(`Error: ${error.message}`); else showToast('Saved')
  }

  const saveAll = async () => {
    setSaving(true)
    const cs = students.filter(s => s.english_class === activeTab); let errors = 0
    for (const s of cs) { const r = ratings[s.id] || {}; const { error } = await supabase.from('teacher_anecdotal_ratings').upsert({ level_test_id: levelTest.id, student_id: s.id, teacher_id: currentTeacher?.id || null, receptive_language: r.receptive_language || null, productive_language: r.productive_language || null, engagement_pace: r.engagement_pace || null, placement_recommendation: r.placement_recommendation || null, notes: r.notes || '', is_watchlist: r.is_watchlist || false, teacher_recommends: r.teacher_recommends || null }, { onConflict: 'level_test_id,student_id' }); if (error) errors++ }
    setSaving(false); showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved all ${activeTab} ratings`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const available = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classCounts: Record<string, { total: number; done: number }> = {}
  ENGLISH_CLASSES.forEach(cls => {
    const s = students.filter(s => s.english_class === cls)
    classCounts[cls] = { total: s.length, done: s.filter(st => { const r = ratings[st.id]; return r && [r.receptive_language, r.productive_language, r.engagement_pace, r.placement_recommendation].some(v => v != null) }).length }
  })
  const classStudents = students.filter(s => s.english_class === activeTab)
  const modalStudent = modalIdx !== null ? classStudents[modalIdx] : null

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between">
        <ClassTabs active={activeTab} onSelect={c => { setActiveTab(c); setModalIdx(null) }} counts={classCounts} available={available} />
        <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 mb-4">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All {activeTab}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
        <p className="text-[12px] text-amber-800 leading-relaxed">
          <strong>How to rate:</strong> Rate each student <strong>relative to your class</strong>. A score of 3 means this student is keeping pace with your class expectations. A 4 means they may be ready for a higher level. A 1-2 means they are struggling relative to where your class is. This is NOT an absolute measure -- it is about fit within your specific class level.
        </p>
      </div>

      {(levelTest.grade === 1 || levelTest.grade === '1' as any) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-[12px] text-blue-800 leading-relaxed">
            <strong>Grade 1 -- Wave 2 Ratings:</strong> These teacher ratings are for the Wave 2 (end of March) assessment. Wave 1 class impressions were captured during the oral test phase. These ratings combined with the written test will produce the final placement recommendation.
          </p>
        </div>
      )}

      {/* Student list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-surface-alt border-b border-border grid grid-cols-[1fr,auto] items-center">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Student</span>
          <div className="flex gap-4 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">
            <span className="w-[80px] text-center">Receptive</span>
            <span className="w-[80px] text-center">Productive</span>
            <span className="w-[80px] text-center">Engagement</span>
            <span className="w-[80px] text-center">Placement</span>
            <span className="w-8 text-center">Avg</span>
            <span className="w-20"></span>
          </div>
        </div>
        {classStudents.map((student, idx) => {
          const r = ratings[student.id] || {}
          const vals = [r.receptive_language, r.productive_language, r.engagement_pace, r.placement_recommendation]
          const filled = vals.filter(v => v != null).length
          const avg = filled > 0 ? (vals.filter(v => v != null) as number[]).reduce((a, b) => a + b, 0) / filled : null

          return (
            <button key={student.id} onClick={() => setModalIdx(idx)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-alt/50 transition-all text-left">
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-navy">{student.english_name}</span>
                <span className="text-[12px] text-text-tertiary ml-2">{student.korean_name}</span>
                <span className="ml-1.5"><WIDABadge studentId={student.id} compact /></span>
              </div>
              <div className="flex items-center gap-4">
                {vals.map((val, i) => (
                  <div key={i} className={`w-[80px] flex justify-center`}>
                    <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      val == null ? 'bg-gray-100 text-gray-300' : val <= 1 ? 'bg-red-100 text-red-700' : val === 2 ? 'bg-amber-100 text-amber-700' : val === 3 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{val ?? '—'}</span>
                  </div>
                ))}
                <span className="text-[12px] font-bold text-navy w-8 text-center">{avg != null ? avg.toFixed(1) : '—'}</span>
                <div className="w-20 flex items-center justify-end gap-1">
                  {r.is_watchlist && <Star size={12} className="text-amber-500 fill-amber-500" />}
                  {r.teacher_recommends && <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${r.teacher_recommends === 'keep' ? 'bg-blue-100 text-blue-700' : r.teacher_recommends === 'move_up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.teacher_recommends === 'keep' ? 'KEEP' : r.teacher_recommends === 'move_up' ? 'UP' : 'DOWN'}</span>}
                  <ChevronRight size={14} className="text-text-tertiary" />
                </div>
              </div>
            </button>
          )
        })}
        {classStudents.length === 0 && <p className="text-center py-8 text-text-tertiary text-[13px]">No students in {activeTab}</p>}
      </div>

      {/* Rating Modal */}
      {modalStudent && modalIdx !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">{modalStudent.english_name}</h3>
                <p className="text-[12px] text-text-tertiary">{modalStudent.korean_name} | Grade {modalStudent.grade} |
                  <span className="inline-flex ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: classToColor(modalStudent.english_class as EnglishClass), color: classToTextColor(modalStudent.english_class as EnglishClass) }}>{modalStudent.english_class}</span>
                  <span className="ml-2">{modalIdx + 1} of {classStudents.length}</span>
                </p>
              </div>
              <button onClick={() => setModalIdx(null)} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
            </div>

            {/* Student data */}
            {studentData[modalStudent.id] && (
              <div className="px-6 py-3 bg-surface-alt/50 border-b border-border">
                <div className="grid grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Level Test Scores</p>
                    {studentData[modalStudent.id]?.scores ? (
                      <div className="space-y-0.5">
                        {studentData[modalStudent.id].scores.passage_cwpm != null && <p>CWPM: <span className="font-bold text-navy">{Math.round(studentData[modalStudent.id].scores.passage_cwpm)}</span></p>}
                        {studentData[modalStudent.id].scores.writing != null && <p>Writing: <span className="font-bold text-navy">{studentData[modalStudent.id].scores.writing}/20</span></p>}
                        {studentData[modalStudent.id].scores.written_mc != null && <p>MC: <span className="font-bold text-navy">{studentData[modalStudent.id].scores.written_mc}/21</span></p>}
                        {studentData[modalStudent.id].scores.word_reading_correct != null && <p>WR: <span className="font-bold text-navy">{studentData[modalStudent.id].scores.word_reading_correct}{studentData[modalStudent.id].scores.word_reading_attempted ? `/${studentData[modalStudent.id].scores.word_reading_attempted}` : ''}</span></p>}
                      </div>) : <p className="text-text-tertiary italic">No scores yet</p>}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Semester Grades</p>
                    {studentData[modalStudent.id]?.grades.length > 0 ? <div className="space-y-0.5">{studentData[modalStudent.id].grades.slice(0, 5).map((g: any, i: number) => <p key={i}>{domainLabel(g.domain)}: <span className="font-bold text-navy">{g.score?.toFixed(0)}%</span> <span className="text-text-tertiary">({g.semesters?.name})</span></p>)}</div> : <p className="text-text-tertiary italic">No grades</p>}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Recent Reading</p>
                    {studentData[modalStudent.id]?.reading.length > 0 ? <div className="space-y-0.5">{studentData[modalStudent.id].reading.slice(0, 3).map((r: any, i: number) => <p key={i}>{r.date}: <span className="font-bold text-navy">{Math.round(r.cwpm)} CWPM</span> {r.accuracy_rate != null && <span className="text-text-tertiary">({r.accuracy_rate}%)</span>}</p>)}</div> : <p className="text-text-tertiary italic">No reading data</p>}
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">WIDA Profile</p>
                    <WIDABadge studentId={modalStudent.id} />
                    <WIDADetail studentId={modalStudent.id} />
                  </div>
                </div>
              </div>
            )}

            {/* Rating dimensions */}
            <div className="px-6 py-4 space-y-4">
              {DIMS.map(dim => {
                const cur = (ratings[modalStudent.id] as any)?.[dim.key] as number | null | undefined
                return (
                  <div key={dim.key}>
                    <p className="text-[13px] font-semibold text-navy mb-0.5">{dim.label}</p>
                    <p className="text-[11px] text-text-tertiary mb-2">{dim.desc}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[1,2,3,4].map(val => (
                        <button key={val} onClick={() => setRatings(prev => ({ ...prev, [modalStudent.id]: { ...prev[modalStudent.id], [dim.key]: cur === val ? null : val } }))}
                          className={`p-2.5 rounded-lg text-left transition-all border-2 ${cur === val ? (val <= 1 ? 'border-red-400 bg-red-50' : val === 2 ? 'border-amber-400 bg-amber-50' : val === 3 ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50') : 'border-transparent bg-surface-alt hover:bg-surface-alt/80'}`}>
                          <span className={`text-[12px] font-bold ${cur === val ? (val <= 1 ? 'text-red-700' : val === 2 ? 'text-amber-700' : val === 3 ? 'text-blue-700' : 'text-green-700') : 'text-text-secondary'}`}>{val}</span>
                          <p className="text-[9px] text-text-tertiary mt-0.5 leading-tight">{dim.levels[val - 1]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Watchlist + Rec */}
              <div className="flex items-center gap-4 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                  <input type="checkbox" checked={ratings[modalStudent.id]?.is_watchlist || false} onChange={e => setRatings(prev => ({ ...prev, [modalStudent.id]: { ...prev[modalStudent.id], is_watchlist: e.target.checked } }))} className="w-4 h-4 rounded" />
                  <Star size={14} className="text-amber-500" /> Watchlist
                </label>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-text-secondary">Recommends:</span>
                  {(['keep', 'move_up', 'move_down'] as const).map(opt => (
                    <button key={opt} onClick={() => setRatings(prev => ({ ...prev, [modalStudent.id]: { ...prev[modalStudent.id], teacher_recommends: prev[modalStudent.id]?.teacher_recommends === opt ? null : opt } }))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${ratings[modalStudent.id]?.teacher_recommends === opt ? (opt === 'keep' ? 'bg-blue-500 text-white' : opt === 'move_up' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-surface-alt text-text-secondary'}`}>
                      {opt === 'keep' ? 'Keep' : opt === 'move_up' ? 'Move Up' : 'Move Down'}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={ratings[modalStudent.id]?.notes || ''} onChange={e => setRatings(prev => ({ ...prev, [modalStudent.id]: { ...prev[modalStudent.id], notes: e.target.value } }))}
                placeholder="Optional notes for the leveling meeting..." className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-20" />
            </div>

            {/* Nav footer */}
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-surface-alt/30">
              <button onClick={() => { saveOne(modalStudent.id); setModalIdx(Math.max(0, modalIdx - 1)) }} disabled={modalIdx === 0} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30"><ChevronLeft size={14} /> Previous</button>
              <button onClick={() => saveOne(modalStudent.id)} className="inline-flex items-center gap-1 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark"><Save size={14} /> Save</button>
              <button onClick={() => { saveOne(modalStudent.id); setModalIdx(Math.min(classStudents.length - 1, modalIdx + 1)) }} disabled={modalIdx === classStudents.length - 1} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30">Save & Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── G1 Results Wrapper (loads data for G1ResultsView) ─────────────
function G1ResultsWrapper({ levelTest }: { levelTest: LevelTest }) {
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: testScores }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', 1).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      setStudents(studs || [])
      const sm: Record<string, any> = {}
      testScores?.forEach((ts: any) => { sm[ts.student_id] = ts.raw_scores || {} })
      setScores(sm)
      setLoading(false)
    })()
  }, [levelTest.id])

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return <G1ResultsView students={students} scores={scores} levelTest={levelTest} />
}

// ─── Results Phase ──────────────────────────────────────────────────

function ResultsPhase({ levelTest }: { levelTest: LevelTest }) {
  // Grade 1 uses its own ResultsView
  if (String(levelTest.grade) === '1') return <G1ResultsWrapper levelTest={levelTest} />

  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, any>>({})
  const [anecdotals, setAnecdotals] = useState<Record<string, any>>({})
  const [benchmarks, setBenchmarks] = useState<Record<string, any>>({})
  const [semGrades, setSemGrades] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('composite')
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>('all')
  const [showBorderline, setShowBorderline] = useState(false)

  const handlePrintSummary = (allRows: any[]) => {
    const pw = window.open('', '_blank'); if (!pw) return
    // Group by current class
    const byClass: Record<string, any[]> = {}
    ENGLISH_CLASSES.forEach(c => { byClass[c] = [] })
    allRows.forEach(r => { if (byClass[r.student.english_class]) byClass[r.student.english_class].push(r) })
    // Sort each class by composite desc
    Object.values(byClass).forEach(arr => arr.sort((a, b) => b.composite - a.composite))

    let pagesHTML = ''
    ENGLISH_CLASSES.forEach(cls => {
      const students = byClass[cls]
      if (students.length === 0) return
      let rowsHTML = students.map((r: any, i: number) => {
        const move = r.suggestedClass !== r.student.english_class
        return `<tr style="${move ? 'background:#fef3c7;' : ''}">
          <td style="padding:6px 10px;font-weight:600;color:#1e3a5f">${i + 1}</td>
          <td style="padding:6px 10px;font-weight:600">${r.student.english_name}<br><span style="color:#94a3b8;font-size:10px">${r.student.korean_name}</span></td>
          <td style="padding:6px 10px;text-align:center">${r.rawCwpm != null ? Math.round(r.rawCwpm) : '—'}</td>
          <td style="padding:6px 10px;text-align:center">${r.rawWriting ?? '—'}</td>
          <td style="padding:6px 10px;text-align:center">${r.rawMc != null ? r.rawMc + '/21' : '—'}</td>
          <td style="padding:6px 10px;text-align:center">${(r.gradeScore * 100).toFixed(0)}%</td>
          <td style="padding:6px 10px;text-align:center;font-weight:700;color:#1e3a5f">${(r.composite * 100).toFixed(0)}</td>
          <td style="padding:6px 10px;text-align:center">${Math.round(r.percentile * 100)}%</td>
          <td style="padding:6px 10px;text-align:center;font-weight:600;${move ? 'color:#d97706' : ''}">${r.suggestedClass}${move ? ' *' : ''}</td>
          <td style="padding:6px 10px;text-align:center;font-size:10px;color:${r.anec?.teacher_recommends === 'move_up' ? '#16a34a' : r.anec?.teacher_recommends === 'move_down' ? '#dc2626' : '#6b7280'}">${r.anec?.teacher_recommends === 'keep' ? 'KEEP' : r.anec?.teacher_recommends === 'move_up' ? 'UP' : r.anec?.teacher_recommends === 'move_down' ? 'DOWN' : '—'}</td>
        </tr>`
      }).join('')

      pagesHTML += `<div style="page-break-after:always;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding:10px 16px;background:#1e3a5f;border-radius:8px;color:white">
          <div><span style="font-size:18px;font-weight:700;font-family:Lora,serif">${cls}</span><span style="font-size:12px;margin-left:8px;opacity:0.7">${students.length} students</span></div>
          <div style="font-size:11px">Grade ${levelTest.grade} Level Test Summary</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">#</th>
            <th style="padding:6px 10px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">Student</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">CWPM</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">Writing</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">MC</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">Grades</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:800">Composite</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">%ile</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">Suggested</th>
            <th style="padding:6px 10px;text-align:center;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b">Teacher</th>
          </tr></thead>
          <tbody>${rowsHTML}</tbody>
        </table>
        <p style="font-size:9px;color:#94a3b8;margin-top:8px">* = suggested class differs from current. Composite = 30% test + 40% grades + 30% anecdotal. Printed ${new Date().toLocaleDateString()}</p>
      </div>`
    })

    pw.document.write(`<!DOCTYPE html><html><head><title>Leveling Summary - Grade ${levelTest.grade}</title>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
      <style>body{font-family:Roboto,sans-serif;margin:20px;color:#1a1a2e} table{border-collapse:collapse} td,th{border-bottom:1px solid #e2e8f0} @media print{@page{margin:12mm 14mm}}</style>
      </head><body>${pagesHTML}</body></html>`)
    pw.document.close()
    pw.print()
  }

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: sd }, { data: ad }, { data: bd }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
        supabase.from('class_benchmarks').select('*').eq('grade', levelTest.grade),
      ])
      if (studs) {
        setStudents(studs)
        const { data: sg } = await supabase.from('semester_grades').select('*').in('student_id', studs.map((s: Student) => s.id))
        const sgm: Record<string, any[]> = {}; sg?.forEach((g: any) => { if (!sgm[g.student_id]) sgm[g.student_id] = []; sgm[g.student_id].push(g) }); setSemGrades(sgm)
      }
      const sm: Record<string, any> = {}; sd?.forEach((s: any) => { sm[s.student_id] = s }); setScores(sm)
      const am: Record<string, any> = {}; ad?.forEach((a: any) => { am[a.student_id] = a }); setAnecdotals(am)
      const bm: Record<string, any> = {}; bd?.forEach((b: any) => { bm[b.english_class] = b }); setBenchmarks(bm)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const rows = useMemo(() => {
    const r = students.map(s => computeRow(s, scores, anecdotals, benchmarks, semGrades))
    const sorted = [...r].sort((a, b) => a.composite - b.composite)
    return sorted.map((row, idx) => ({
      ...row, percentile: sorted.length > 1 ? idx / (sorted.length - 1) : 0.5,
      suggestedClass: suggestClass(row, idx, sorted.length),
    }))
  }, [students, scores, anecdotals, benchmarks, semGrades])

  const displayed = useMemo(() => {
    let res = [...rows]
    if (filterClass !== 'all') res = res.filter(r => r.student.english_class === filterClass)
    if (showBorderline) res = res.filter(r => r.suggestedClass !== r.student.english_class)
    switch (sortBy) {
      case 'composite': res.sort((a, b) => b.composite - a.composite); break
      case 'percentile': res.sort((a, b) => b.percentile - a.percentile); break
      case 'cwpm': res.sort((a, b) => (b.rawCwpm ?? -1) - (a.rawCwpm ?? -1)); break
      case 'writing': res.sort((a, b) => (b.rawWriting ?? -1) - (a.rawWriting ?? -1)); break
      case 'name': res.sort((a, b) => a.student.english_name.localeCompare(b.student.english_name)); break
    }
    return res
  }, [rows, filterClass, sortBy, showBorderline])

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="px-10 py-6">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1">
          <button onClick={() => setFilterClass('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
          {ENGLISH_CLASSES.map(cls => <button key={cls} onClick={() => setFilterClass(cls)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === cls ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`} style={filterClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>{cls}</button>)}
        </div>
        <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="px-3 py-1.5 border border-border rounded-lg text-[11px] bg-surface">
          <option value="composite">Sort: Composite</option><option value="percentile">Sort: %ILE</option><option value="cwpm">Sort: CWPM</option><option value="writing">Sort: Writing</option><option value="name">Sort: Name</option>
        </select>
        <button onClick={() => setShowBorderline(!showBorderline)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ${showBorderline ? 'bg-amber-100 text-amber-700' : 'bg-surface-alt text-text-secondary'}`}>
          <AlertTriangle size={12} /> Borderline
        </button>
        <button onClick={() => handlePrintSummary(rows)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
          <Printer size={12} /> Print Summary
        </button>
        <button onClick={() => {
          exportToCSV(`leveling-G${levelTest.grade}`,
            ['Student', 'Korean Name', 'Current Class', 'CWPM', 'Writing', 'MC', 'Grade Avg%', 'Anecdotal', 'Composite', 'Percentile', 'Suggested'],
            displayed.map(r => [r.student.english_name, r.student.korean_name, r.student.english_class,
              r.rawCwpm != null ? Math.round(r.rawCwpm) : '', r.rawWriting ?? '', r.rawMc ?? '',
              (r.gradeScore * 100).toFixed(0), (r.anecScore * 100).toFixed(0), (r.composite * 100).toFixed(0),
              Math.round(r.percentile * 100), r.suggestedClass]))
        }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
          <Download size={12} /> CSV
        </button>
        <span className="text-[11px] text-text-tertiary ml-auto">{displayed.length} students</span>
      </div>
      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[180px]">Student</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Current</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">CWPM</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Writing</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">MC</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Grade Avg</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Anecdotal</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Composite</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">%ile</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Suggested</th>
            <th className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Teacher</th>
          </tr></thead>
          <tbody>{displayed.map(row => {
            const move = row.suggestedClass !== row.student.english_class
            return (
              <tr key={row.student.id} className={`border-t border-border hover:bg-surface-alt/30 ${move ? 'bg-amber-50/30' : ''}`}>
                <td className="px-3 py-2 sticky left-0 bg-surface font-medium text-navy whitespace-nowrap">{row.anec?.is_watchlist && <Star size={10} className="text-amber-500 fill-amber-500 inline mr-1" />}{row.student.english_name} <span className="text-text-tertiary font-normal text-[10px]">{row.student.korean_name}</span></td>
                <td className="px-2 py-2 text-center"><span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(row.student.english_class as EnglishClass) + '40', color: classToTextColor(row.student.english_class as EnglishClass) }}>{row.student.english_class}</span></td>
                <td className="px-2 py-2 text-center">{row.rawCwpm != null ? <span>{Math.round(row.rawCwpm)} <span className="text-text-tertiary text-[9px]">({row.cwpmRatio != null ? (row.cwpmRatio * 100).toFixed(0) + '%' : '—'})</span></span> : '—'}</td>
                <td className="px-2 py-2 text-center">{row.rawWriting != null ? <span>{row.rawWriting} <span className="text-text-tertiary text-[9px]">({row.writingRatio != null ? (row.writingRatio * 100).toFixed(0) + '%' : '—'})</span></span> : '—'}</td>
                <td className="px-2 py-2 text-center">{row.rawMc != null ? `${row.rawMc}/21` : '—'}</td>
                <td className="px-2 py-2 text-center">{row.gradeScore !== 0.5 ? `${(row.gradeScore * 100).toFixed(0)}%` : '—'}</td>
                <td className="px-2 py-2 text-center">{row.anecScore !== 0.5 ? (row.anecScore * 4).toFixed(1) : '—'}</td>
                <td className="px-2 py-2 text-center font-bold text-navy">{(row.composite * 100).toFixed(0)}</td>
                <td className="px-2 py-2 text-center">{(row.percentile * 100).toFixed(0)}%</td>
                <td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${move ? 'ring-2 ring-amber-400' : ''}`} style={{ backgroundColor: classToColor(row.suggestedClass) + '40', color: classToTextColor(row.suggestedClass) }}>{row.suggestedClass}</span></td>
                <td className="px-2 py-2 text-center">{row.anec?.teacher_recommends ? <span className={`text-[9px] font-bold ${row.anec.teacher_recommends === 'keep' ? 'text-blue-600' : row.anec.teacher_recommends === 'move_up' ? 'text-green-600' : 'text-red-600'}`}>{row.anec.teacher_recommends === 'keep' ? 'Keep' : row.anec.teacher_recommends === 'move_up' ? 'Up' : 'Down'}</span> : '—'}</td>
              </tr>)})}</tbody>
        </table>
      </div>
      <p className="text-[10px] text-text-tertiary mt-3">Benchmark-relative % shown in parentheses (100% = at class target). Composite = 30% test + 40% grades + 30% anecdotal.</p>
    </div>
  )
}

// ─── Meeting Phase ──────────────────────────────────────────────────

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
  const [profileStudent, setProfileStudent] = useState<Student | null>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [weights, setWeights] = useState({ test: 30, grades: 40, anecdotal: 30 })
  const [showWeights, setShowWeights] = useState(false)
  const [compareStudents, setCompareStudents] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: sd }, { data: ad }, { data: bd }, { data: pd }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
        supabase.from('teacher_anecdotal_ratings').select('*').eq('level_test_id', levelTest.id),
        supabase.from('class_benchmarks').select('*').eq('grade', levelTest.grade),
        supabase.from('level_test_placements').select('*').eq('level_test_id', levelTest.id),
      ])
      // Sort by class order (Lily→Snapdragon) then alphabetically within each class
      const classOrder: Record<string, number> = { Lily: 1, Camellia: 2, Daisy: 3, Sunflower: 4, Marigold: 5, Snapdragon: 6 }
      const sortedStuds = (studs || []).sort((a: any, b: any) => (classOrder[a.english_class] || 99) - (classOrder[b.english_class] || 99) || a.english_name.localeCompare(b.english_name))
      if (sortedStuds.length) setStudents(sortedStuds)
      const bm: Record<string, any> = {}; bd?.forEach((b: any) => { bm[b.english_class] = b }); setBenchmarks(bm)
      const sm: Record<string, any> = {}; sd?.forEach((s: any) => { sm[s.student_id] = s }); setScores(sm)
      const am: Record<string, any> = {}; ad?.forEach((a: any) => { am[a.student_id] = a }); setAnecdotals(am)
      if (studs) {
        const { data: sg } = await supabase.from('semester_grades').select('*, semesters(name)').in('student_id', studs.map((s: any) => s.id))
        const sgm: Record<string, any[]> = {}; sg?.forEach((g: any) => { const gWithName = { ...g, semester_name: g.semesters?.name || '' }; if (!sgm[g.student_id]) sgm[g.student_id] = []; sgm[g.student_id].push(gWithName) }); setSemGrades(sgm)
        const auto = calcAuto(studs, sm, am, bm, sgm, { test: 0.3, grades: 0.4, anecdotal: 0.3 })
        setAutoPlacements(auto)
        const pm: Record<string, EnglishClass> = {}
        if (pd?.length) pd.forEach((p: any) => { pm[p.student_id] = p.final_placement })
        else studs.forEach((s: any) => { pm[s.id] = s.english_class })
        setPlacements(pm)
      }
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const recompute = () => {
    const auto = calcAuto(students, scores, anecdotals, benchmarks, semGrades, { test: weights.test / 100, grades: weights.grades / 100, anecdotal: weights.anecdotal / 100 })
    setAutoPlacements(auto); showToast('Auto-placements recalculated (drag students to apply)')
  }

  const resetToCurrentClasses = () => {
    if (!confirm('Reset all students to their current class assignments? Any manual moves will be undone.')) return
    const pm: Record<string, EnglishClass> = {}
    students.forEach((s: any) => { pm[s.id] = s.english_class })
    setPlacements(pm)
    showToast('Reset to current classes')
  }

  const handleSave = async () => {
    setSaving(true); let errors = 0
    for (const [sid, fc] of Object.entries(placements)) {
      const { error } = await supabase.from('level_test_placements').upsert({
        level_test_id: levelTest.id, student_id: sid, auto_placement: autoPlacements[sid] || 'Lily', final_placement: fc, is_overridden: fc !== autoPlacements[sid], override_by: fc !== autoPlacements[sid] ? currentTeacher?.id : null,
      }, { onConflict: 'level_test_id,student_id' }); if (error) errors++
    }
    setSaving(false); showToast(errors ? `Saved with ${errors} error(s)` : 'Placements saved')
  }

  const handleFinalize = async () => {
    if (!confirm('Finalize placements? This will update all student class assignments.')) return
    await handleSave()
    for (const [sid, fc] of Object.entries(placements)) await supabase.from('students').update({ english_class: fc }).eq('id', sid)
    await supabase.from('level_tests').update({ status: 'finalized', finalized_at: new Date().toISOString() }).eq('id', levelTest.id)
    showToast('Placements finalized'); onFinalize()
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const counts: Record<string, number> = {}; ENGLISH_CLASSES.forEach(c => { counts[c] = 0 }); Object.values(placements).forEach(c => { counts[c] = (counts[c] || 0) + 1 })

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">{ENGLISH_CLASSES.map(cls => (
          <div key={cls} className="text-center px-3 py-1.5 rounded-lg" style={{ backgroundColor: classToColor(cls) + '30' }}>
            <p className="text-[9px] font-bold" style={{ color: classToTextColor(cls) }}>{cls}</p><p className="text-[15px] font-bold text-navy">{counts[cls]}</p>
          </div>))}
          <div className="text-center px-3 py-1.5 rounded-lg bg-surface-alt"><p className="text-[9px] font-bold text-text-tertiary">Total</p><p className="text-[15px] font-bold text-navy">{students.length}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowWeights(!showWeights)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ${showWeights ? 'bg-amber-100 text-amber-700' : 'bg-surface-alt text-text-secondary'}`}><SlidersHorizontal size={13} /> Weights</button>
          <button onClick={() => setShowCompare(!showCompare)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium ${showCompare ? 'bg-blue-100 text-blue-700' : 'bg-surface-alt text-text-secondary'}`}><Users size={13} /> Compare{compareStudents.length > 0 ? ` (${compareStudents.length})` : ''}</button>
          {(isAdmin || currentTeacher?.english_class === 'Snapdragon') && <button onClick={resetToCurrentClasses} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-amber-50 hover:text-amber-700">Reset to Current Classes</button>}
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button>
          {isAdmin && levelTest.status !== 'finalized' && <button onClick={handleFinalize} className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[12px] font-medium bg-green-600 text-white hover:bg-green-700"><Lock size={14} /> Finalize</button>}
        </div>
      </div>

      {showWeights && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-6">
          {(['test', 'grades', 'anecdotal'] as const).map(k => (
            <div key={k} className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-amber-800 capitalize">{k}:</label>
              <input type="number" min={0} max={100} step={5} value={weights[k]} onChange={e => setWeights(w => ({ ...w, [k]: Number(e.target.value) }))} className="w-14 px-2 py-1 border border-amber-300 rounded text-[12px] text-center bg-white" />
              <span className="text-[11px] text-amber-600">%</span>
            </div>
          ))}
          <span className={`text-[11px] font-bold ${weights.test + weights.grades + weights.anecdotal === 100 ? 'text-green-700' : 'text-red-600'}`}>= {weights.test + weights.grades + weights.anecdotal}%</span>
          <button onClick={recompute} className="ml-auto px-4 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600 text-white hover:bg-amber-700">Recalculate</button>
        </div>
      )}

      {/* Side-by-side comparison panel */}
      {showCompare && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] font-semibold text-blue-800">Compare Students Side-by-Side</p>
            <div className="flex gap-2">
              {compareStudents.length > 0 && <button onClick={() => setCompareStudents([])} className="text-[10px] px-2 py-1 rounded bg-blue-200 text-blue-800 hover:bg-blue-300">Clear All</button>}
              <button onClick={() => setShowCompare(false)} className="text-[10px] px-2 py-1 rounded text-blue-700 hover:bg-blue-100">Close</button>
            </div>
          </div>
          {compareStudents.length < 2 && <p className="text-[11px] text-blue-600 mb-3">Click student cards below to add them to the comparison (2-4 students).</p>}
          {compareStudents.length >= 2 && (
            <div>
              {/* Radar Chart */}
              <div className="bg-white rounded-lg border border-blue-200 p-4 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold mb-3">Visual Comparison</p>
                <div className="flex justify-center">
                  {(() => {
                    const size = 240, cx = size / 2, cy = size / 2, r = 90
                    const axes = ['CWPM', 'Writing', 'MC', 'Grades', 'Anecdotal']
                    const n = axes.length
                    const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b']
                    // Normalize data to 0-1
                    const studentData = compareStudents.map(sid => {
                      const sc = scores[sid]; const an = anecdotals[sid]; const sg = semGrades[sid] || []
                      const cwpmRaw = sc?.raw_scores?.passage_cwpm || 0
                      const writing = sc?.raw_scores?.writing || 0
                      const mc = sc?.raw_scores?.written_mc || 0
                      const gradeAvg = sg.length > 0 ? sg.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / sg.length : 0
                      const anAvg = an ? ([an.receptive_language, an.productive_language, an.engagement_pace, an.placement_recommendation].filter((v: any) => v != null) as number[]).reduce((a: number, b: number) => a + b, 0) / Math.max(1, [an.receptive_language, an.productive_language, an.engagement_pace, an.placement_recommendation].filter((v: any) => v != null).length) : 0
                      return [Math.min(1, cwpmRaw / 150), writing / 20, mc / 21, gradeAvg / 100, anAvg / 4]
                    })
                    const angleStep = (Math.PI * 2) / n
                    const getPoint = (angle: number, val: number) => ({
                      x: cx + r * val * Math.sin(angle), y: cy - r * val * Math.cos(angle)
                    })
                    return (
                      <svg width={size} height={size + 24} viewBox={`0 0 ${size} ${size + 24}`}>
                        {/* Grid lines */}
                        {[0.25, 0.5, 0.75, 1].map(level => (
                          <polygon key={level} points={Array.from({ length: n }, (_, i) => {
                            const p = getPoint(i * angleStep, level)
                            return `${p.x},${p.y}`
                          }).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                        ))}
                        {/* Axis lines and labels */}
                        {axes.map((label, i) => {
                          const p = getPoint(i * angleStep, 1.15)
                          const ep = getPoint(i * angleStep, 1)
                          return <g key={label}>
                            <line x1={cx} y1={cy} x2={ep.x} y2={ep.y} stroke="#cbd5e1" strokeWidth="1" />
                            <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#64748b" fontWeight="600">{label}</text>
                          </g>
                        })}
                        {/* Data polygons */}
                        {studentData.map((vals, si) => {
                          const points = vals.map((v, i) => getPoint(i * angleStep, v))
                          return <polygon key={si}
                            points={points.map(p => `${p.x},${p.y}`).join(' ')}
                            fill={COLORS[si % COLORS.length] + '20'} stroke={COLORS[si % COLORS.length]} strokeWidth="2" />
                        })}
                        {/* Legend */}
                        {compareStudents.map((sid, i) => {
                          const s = students.find(st => st.id === sid)
                          return <g key={sid} transform={`translate(${10 + i * 70}, ${size + 8})`}>
                            <rect width="8" height="8" rx="2" fill={COLORS[i % COLORS.length]} />
                            <text x="12" y="7" fontSize="9" fill="#475569">{s?.english_name?.split(' ')[0] || '?'}</text>
                          </g>
                        })}
                      </svg>
                    )
                  })()}
                </div>
              </div>
              {/* Cards */}
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(compareStudents.length, 4)}, 1fr)` }}>
              {compareStudents.map(sid => {
                const s = students.find(st => st.id === sid)
                if (!s) return null
                const sc = scores[sid]; const an = anecdotals[sid]; const sg = semGrades[sid] || []
                const gradeAvg = sg.length > 0 ? sg.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / sg.length : null
                return (
                  <div key={sid} className="bg-white rounded-lg border border-blue-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-[13px] font-bold text-navy">{s.english_name}</p>
                        <p className="text-[10px] text-text-tertiary">{s.korean_name}</p>
                      </div>
                      <button onClick={() => setCompareStudents(prev => prev.filter(id => id !== sid))} className="text-text-tertiary hover:text-red-500"><X size={12} /></button>
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-text-tertiary">Current</span><span className="font-bold px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: classToColor(s.english_class as EnglishClass) + '40', color: classToTextColor(s.english_class as EnglishClass) }}>{s.english_class}</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">CWPM</span><span className="font-bold text-navy">{sc?.raw_scores?.passage_cwpm != null ? Math.round(sc.raw_scores.passage_cwpm) : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">Writing</span><span className="font-bold text-navy">{sc?.raw_scores?.writing ?? '—'}/20</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">MC</span><span className="font-bold text-navy">{sc?.raw_scores?.written_mc ?? '—'}/21</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">Grade Avg</span><span className={`font-bold ${gradeAvg != null ? (gradeAvg >= 80 ? 'text-green-600' : gradeAvg >= 60 ? 'text-amber-600' : 'text-red-600') : ''}`}>{gradeAvg != null ? `${gradeAvg.toFixed(0)}%` : '—'}</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">Anecdotal Avg</span><span className="font-bold text-navy">{an ? ((([an.receptive_language, an.productive_language, an.engagement_pace, an.placement_recommendation].filter((v: any) => v != null) as number[]).reduce((a: number, b: number) => a + b, 0) / [an.receptive_language, an.productive_language, an.engagement_pace, an.placement_recommendation].filter((v: any) => v != null).length) || 0).toFixed(1) : '—'}/4</span></div>
                      <div className="flex justify-between"><span className="text-text-tertiary">Teacher Rec</span><span className={`font-bold text-[10px] ${an?.teacher_recommends === 'move_up' ? 'text-green-600' : an?.teacher_recommends === 'move_down' ? 'text-red-600' : 'text-blue-600'}`}>{an?.teacher_recommends === 'keep' ? 'KEEP' : an?.teacher_recommends === 'move_up' ? 'MOVE UP' : an?.teacher_recommends === 'move_down' ? 'MOVE DOWN' : '—'}</span></div>
                      {an?.notes && <p className="text-[10px] text-text-secondary bg-surface-alt rounded px-2 py-1 mt-1 italic">{an.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-6 gap-3">
        {ENGLISH_CLASSES.map(cls => {
          const cs = students.filter(s => placements[s.id] === cls)
          return (
            <div key={cls} className="rounded-xl border-2 min-h-[400px] transition-all" style={{ borderColor: dragStudent ? classToColor(cls) : '#e2e8f0', backgroundColor: dragStudent ? classToColor(cls) + '08' : '#fafafa' }}
              onDragOver={e => e.preventDefault()} onDrop={() => { if (dragStudent) { setPlacements(prev => ({ ...prev, [dragStudent]: cls })); setDragStudent(null) } }}>
              <div className="px-3 py-2 rounded-t-xl" style={{ backgroundColor: classToColor(cls) }}>
                <p className="text-[12px] font-bold text-center" style={{ color: classToTextColor(cls) }}>{cls} ({cs.length})</p>
              </div>
              <div className="p-1.5 space-y-1">{cs.map(student => {
                const score = scores[student.id]; const anec = anecdotals[student.id]; const auto = autoPlacements[student.id]
                const isOvr = auto && auto !== cls
                const up = ENGLISH_CLASSES.indexOf(cls) > ENGLISH_CLASSES.indexOf(student.english_class as EnglishClass)
                const down = ENGLISH_CLASSES.indexOf(cls) < ENGLISH_CLASSES.indexOf(student.english_class as EnglishClass)
                const levelDiff = Math.abs(ENGLISH_CLASSES.indexOf(cls) - ENGLISH_CLASSES.indexOf(student.english_class as EnglishClass))
                const bigJump = levelDiff >= 2
                return (
                  <div key={student.id} draggable={levelTest.status !== 'finalized'} onDragStart={() => setDragStudent(student.id)} onDragEnd={() => setDragStudent(null)}
                    className={`bg-white rounded-lg border p-2 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${bigJump ? 'border-red-400 ring-1 ring-red-200' : isOvr ? 'border-amber-300' : anec?.is_watchlist ? 'border-amber-400' : 'border-border'} ${expandedCard === student.id ? 'ring-2 ring-navy/20' : ''}`}
                    onClick={() => setExpandedCard(expandedCard === student.id ? null : student.id)}>
                    <div className="flex items-center gap-1">
                      {showCompare && (
                        <input type="checkbox" checked={compareStudents.includes(student.id)}
                          onChange={e => { e.stopPropagation(); setCompareStudents(prev => prev.includes(student.id) ? prev.filter(id => id !== student.id) : prev.length < 4 ? [...prev, student.id] : prev) }}
                          className="w-3 h-3 rounded border-blue-300 text-blue-600 flex-shrink-0" />
                      )}
                      <GripVertical size={10} className="text-text-tertiary flex-shrink-0" />
                      <div className="flex-1 min-w-0"><LevelingHoverCard studentId={student.id} studentName={student.english_name} koreanName={student.korean_name} className={student.english_class} grade={student.grade}
                        trigger={<p className="text-[10px] font-semibold text-navy truncate cursor-pointer hover:underline">{student.english_name}</p>}
                      /><p className="text-[8px] text-text-tertiary truncate">{student.korean_name}</p></div>
                      <div className="flex items-center gap-0.5">
                        {up && <ArrowUp size={10} className="text-green-500" />}{down && <ArrowDown size={10} className="text-red-500" />}{!up && !down && <Minus size={10} className="text-text-tertiary" />}
                        {bigJump && <span className="text-[7px] font-bold bg-red-500 text-white px-1 rounded">{levelDiff}+</span>}
                        {anec?.is_watchlist && <Star size={9} className="text-amber-500 fill-amber-500" />}{isOvr && <AlertTriangle size={9} className="text-amber-500" />}
                      </div>
                    </div>
                    {score?.raw_scores && <div className="flex gap-1 mt-1 text-[8px] text-text-tertiary">{score.raw_scores.passage_cwpm != null && <span>C:{Math.round(score.raw_scores.passage_cwpm)}</span>}{score.raw_scores.writing != null && <span>W:{score.raw_scores.writing}</span>}{score.raw_scores.written_mc != null && <span>M:{score.raw_scores.written_mc}</span>}</div>}
                    {anec && <div className="flex gap-0.5 mt-1">{DIMS.map(d => { const v = anec[d.key]; const c = !v ? '#e5e7eb' : v <= 1 ? '#ef4444' : v === 2 ? '#f59e0b' : v === 3 ? '#3b82f6' : '#22c55e'; return <div key={d.key} className="w-3 h-3 rounded-sm flex items-center justify-center" style={{ backgroundColor: c, color: v ? '#fff' : '#d1d5db', fontSize: '7px', fontWeight: 700 }}>{v || '—'}</div> })}</div>}
                    {anec?.teacher_recommends && <p className={`text-[7px] font-bold mt-0.5 ${anec.teacher_recommends === 'keep' ? 'text-blue-600' : anec.teacher_recommends === 'move_up' ? 'text-green-600' : 'text-red-600'}`}>{anec.teacher_recommends === 'keep' ? 'KEEP' : anec.teacher_recommends === 'move_up' ? 'UP' : 'DOWN'}</p>}
                    {expandedCard === student.id && (
                      <div className="mt-2 pt-2 border-t border-border text-[9px] space-y-1" onClick={e => e.stopPropagation()}>
                        <p className="text-text-secondary">Was: <b>{student.english_class}</b> | Auto: <b>{auto || '—'}</b></p>
                        {anec?.notes && <p className="text-text-tertiary italic">"{anec.notes}"</p>}
                        {semGrades[student.id]?.length > 0 && <div><p className="font-semibold text-text-secondary">Grades:</p>{semGrades[student.id].slice(0, 4).map((g: any, i: number) => <span key={i} className="inline-block mr-2">{g.domain}: {g.score?.toFixed(0)}%</span>)}</div>}
                        <select value={cls} onChange={e => { setPlacements(prev => ({ ...prev, [student.id]: e.target.value as EnglishClass })); setDragStudent(null) }} className="w-full px-2 py-1 border border-border rounded text-[10px] bg-surface mt-1">{ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      </div>
                    )}
                  </div>)})}</div>
            </div>)
        })}
      </div>

      {/* Student Profile Modal */}
      {profileStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => { setProfileStudent(null); setProfileData(null) }}>
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">{profileStudent.english_name}</h3>
                <p className="text-text-secondary text-[13px]">{profileStudent.korean_name} -- {profileStudent.english_class} -- Grade {profileStudent.grade}</p>
              </div>
              <button onClick={() => { setProfileStudent(null); setProfileData(null) }} className="p-2 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
            </div>
            {!profileData ? (
              <div className="p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
            ) : (
              <div className="px-6 py-4 space-y-4 text-[12px]">
                {/* Notes */}
                {profileData.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">Teacher Notes</p>
                    <p className="text-text-secondary">{profileData.notes}</p>
                  </div>
                )}
                {/* Grades */}
                {profileData.grades.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Semester Grades</p>
                    <div className="grid grid-cols-3 gap-2">
                      {profileData.grades.slice(0, 6).map((g: any, i: number) => (
                        <div key={i} className="bg-surface-alt rounded-lg p-2 text-center">
                          <p className="text-[10px] text-text-tertiary capitalize">{g.domain}</p>
                          <p className={`text-[14px] font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{g.score?.toFixed(0)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Reading */}
                {profileData.reading.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Recent Reading</p>
                    <div className="flex gap-3">
                      {profileData.reading.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="bg-surface-alt rounded-lg p-2 text-center flex-1">
                          <p className="text-[10px] text-text-tertiary">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p className="text-[16px] font-bold text-navy">{r.cwpm ? Math.round(r.cwpm) : '—'}</p>
                          <p className="text-[9px] text-text-tertiary">CWPM</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Attendance */}
                <div className="flex gap-3">
                  <div className="bg-green-50 rounded-lg p-2 text-center flex-1">
                    <p className="text-[14px] font-bold text-green-600">{profileData.attCounts.present}</p><p className="text-[9px] text-green-700">Present</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center flex-1">
                    <p className="text-[14px] font-bold text-red-600">{profileData.attCounts.absent}</p><p className="text-[9px] text-red-700">Absent</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 text-center flex-1">
                    <p className="text-[14px] font-bold text-amber-600">{profileData.attCounts.tardy}</p><p className="text-[9px] text-amber-700">Tardy</p>
                  </div>
                </div>
                {/* Behavior */}
                {profileData.behavior.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Recent Behavior ({profileData.behavior.length})</p>
                    <div className="space-y-1 max-h-[120px] overflow-y-auto">
                      {profileData.behavior.slice(0, 5).map((b: any) => (
                        <div key={b.id} className={`text-[11px] px-2 py-1 rounded ${b.type === 'positive' ? 'bg-green-50 text-green-700' : b.type === 'negative' || b.type === 'abc' ? 'bg-red-50 text-red-700' : 'bg-surface-alt text-text-secondary'}`}>
                          <span className="font-medium capitalize">{b.type}</span> -- {b.note || (b.behaviors || []).join(', ') || '—'} <span className="text-text-tertiary ml-1">({new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function computeRow(s: Student, scores: Record<string, any>, anecdotals: Record<string, any>, benchmarks: Record<string, any>, semGrades: Record<string, any[]>) {
  const sc = scores[s.id]?.raw_scores || {}; const bench = benchmarks[s.english_class] || {}; const anec = anecdotals[s.id] || {}; const grades = semGrades[s.id] || []
  const cwpmRatio = sc.passage_cwpm != null && bench.cwpm_end > 0 ? sc.passage_cwpm / bench.cwpm_end : null
  const writingRatio = sc.writing != null && bench.writing_end > 0 ? sc.writing / bench.writing_end : null
  const mcPct = sc.written_mc != null ? sc.written_mc / 21 : null
  const wrAcc = sc.word_reading_correct != null && sc.word_reading_attempted > 0 ? sc.word_reading_correct / sc.word_reading_attempted : null
  const testRatios = [cwpmRatio, writingRatio, mcPct, wrAcc].filter(v => v != null) as number[]
  const testScore = testRatios.length > 0 ? testRatios.reduce((a, b) => a + b, 0) / testRatios.length : 0.5
  const gv = grades.filter((g: any) => g.score != null && g.semester_name?.toLowerCase().includes('fall')); const gradeScore = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length / 100 : null
  const av = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null) as number[]
  const anecScore = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / (av.length * 4) : 0.5
  // Composite: if student has grades, use test 30% + grades 40% + anecdotal 30%
  // If no grades (transfer, etc.): test 40% + anecdotal 20% (heavier on test)
  const hasGrades = gradeScore != null
  const gScore = gradeScore ?? 0.5
  const composite = hasGrades
    ? testScore * 0.30 + gScore * 0.40 + anecScore * 0.30
    : testScore * 0.80 + anecScore * 0.20
  return { student: s, score: sc, bench, anec, grades, cwpmRatio, writingRatio, mcPct, wrAcc, testScore, gradeScore: gScore, anecScore, composite, rawCwpm: sc.passage_cwpm ?? null, rawWriting: sc.writing ?? null, rawMc: sc.written_mc ?? null, hasGrades }
}

function suggestClass(row: any, idx: number, total: number): EnglishClass {
  if (row.score.word_reading_correct != null && row.score.word_reading_correct < 4) return 'Lily'
  if (row.wrAcc != null && row.wrAcc < 0.1) return 'Lily'
  const p = total > 1 ? idx / (total - 1) : 0.5
  const bi = Math.min(Math.floor(p / (1 / ENGLISH_CLASSES.length)), ENGLISH_CLASSES.length - 1)
  return ENGLISH_CLASSES[bi]
}

function calcAuto(students: Student[], scores: Record<string, any>, anecdotals: Record<string, any>, benchmarks: Record<string, any>, semGrades: Record<string, any[]>, w: { test: number; grades: number; anecdotal: number }): Record<string, EnglishClass> {
  const result: Record<string, EnglishClass> = {}
  const metrics: Record<string, number> = {}
  students.forEach(s => {
    const sc = scores[s.id]?.raw_scores || {}; const bench = benchmarks[s.english_class] || {}; const anec = anecdotals[s.id] || {}; const grades = semGrades[s.id] || []
    const tr: number[] = []; if (sc.passage_cwpm != null && bench.cwpm_end > 0) tr.push(sc.passage_cwpm / bench.cwpm_end); if (sc.writing != null && bench.writing_end > 0) tr.push(sc.writing / bench.writing_end); if (sc.written_mc != null) tr.push(sc.written_mc / 21); if (sc.word_reading_correct != null && sc.word_reading_attempted > 0) tr.push(sc.word_reading_correct / sc.word_reading_attempted)
    const ts = tr.length > 0 ? tr.reduce((a, b) => a + b, 0) / tr.length : 0.5
    const gv = grades.filter((g: any) => g.score != null); const gs = gv.length > 0 ? gv.reduce((sum: number, g: any) => sum + g.score, 0) / gv.length / 100 : 0.5
    const av = [anec.receptive_language, anec.productive_language, anec.engagement_pace, anec.placement_recommendation].filter((v: any) => v != null) as number[]
    const as2 = av.length > 0 ? av.reduce((a: number, b: number) => a + b, 0) / (av.length * 4) : 0.5
    metrics[s.id] = ts * w.test + gs * w.grades + as2 * w.anecdotal
  })
  const sorted = students.map(s => ({ id: s.id, m: metrics[s.id] || 0 })).sort((a, b) => a.m - b.m)
  sorted.forEach((item, idx) => {
    const s = students.find(st => st.id === item.id)!; const sc = scores[s.id]?.raw_scores || {}
    if (sc.word_reading_correct != null && sc.word_reading_correct < 4) { result[item.id] = 'Lily'; return }
    if (sc.word_reading_correct != null && sc.word_reading_attempted > 0 && sc.word_reading_correct / sc.word_reading_attempted < 0.1) { result[item.id] = 'Lily'; return }
    const p = sorted.length > 1 ? idx / (sorted.length - 1) : 0.5
    result[item.id] = ENGLISH_CLASSES[Math.min(Math.floor(p / (1 / ENGLISH_CLASSES.length)), ENGLISH_CLASSES.length - 1)]
  })
  return result
}

// ─── WIDA Detail for Leveling Modal ──────────────────────────────
function WIDADetail({ studentId }: { studentId: string }) {
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', studentId)
      if (data) {
        const m: Record<string, number> = {}
        data.forEach((r: any) => { m[r.domain] = r.wida_level })
        setLevels(m)
      }
      setLoaded(true)
    })()
  }, [studentId])

  if (!loaded) return null
  const vals = Object.values(levels).filter(v => v > 0)
  if (vals.length === 0) return <p className="text-text-tertiary italic text-[10px] mt-1">No WIDA levels set</p>

  const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  const rounded = Math.round(avg)
  const info = WIDA_LEVELS.find(w => w.level === rounded)

  const domLabels: Record<string, string> = { listening: 'List', speaking: 'Spk', reading: 'Read', writing: 'Wrt' }

  return (
    <div className="mt-1 space-y-0.5">
      {Object.entries(levels).filter(([, v]) => v > 0).map(([dom, lvl]) => {
        const wl = WIDA_LEVELS.find(w => w.level === lvl)
        return (
          <p key={dom} className="text-[10px]">
            {domLabels[dom] || dom}: <span className="font-bold" style={{ color: wl ? '#1e293b' : undefined }}>{lvl}</span>
            <span className="text-text-tertiary ml-1">{wl?.name}</span>
          </p>
        )
      })}
      {info && avg !== rounded && (
        <p className="text-[10px] text-text-tertiary mt-1">Avg: {avg.toFixed(1)}</p>
      )}
    </div>
  )
}
