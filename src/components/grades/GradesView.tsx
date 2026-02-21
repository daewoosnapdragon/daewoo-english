'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, DOMAINS, DOMAIN_LABELS, EnglishClass, Grade, Domain } from '@/types'
import { classToColor, classToTextColor, calculateWeightedAverage as calcWeightedAvg } from '@/lib/utils'
import { Plus, X, Loader2, Check, Pencil, Trash2, ChevronDown, BarChart3, User, FileText, Calendar, Download, ClipboardEdit, Save, CalendarDays, Zap, Filter, Search } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import WIDABadge from '@/components/shared/WIDABadge'
import StudentPopover from '@/components/shared/StudentPopover'
import { SCORING_RUBRICS, LEVEL_LABELS, LEVEL_COLORS, RUBRIC_CATEGORIES } from '@/components/curriculum/scoring-rubrics'

// Normalize CCSS input: "rl21" -> "RL.2.1", "rf13a" -> "RF.1.3a", "sl42" -> "SL.4.2"
function normalizeCCSS(input: string): string {
  const s = input.trim().toUpperCase()
  // Already has dots? return as-is
  if (s.includes('.')) return s
  // Match patterns like RL21, RF13A, SL42, W31, L52A
  const match = s.match(/^(RL|RI|RF|W|SL|L)(\d)(\d+)([A-Z]?)$/i)
  if (match) {
    const [, domain, grade, standard, sub] = match
    return `${domain.toUpperCase()}.${grade}.${standard}${sub ? sub.toLowerCase() : ''}`
  }
  return input
}

const ASSESSMENT_CATEGORIES = [
  // === WEIGHTED CATEGORIES (these determine final grades) ===
  { value: 'formative', label: 'Formative', labelKo: '형성평가', weighted: true, desc: 'Ongoing checks: quizzes, exit tickets, classwork, homework, participation' },
  { value: 'summative', label: 'Summative', labelKo: '총괄평가', weighted: true, desc: 'End-of-unit tests, midterms, finals, chapter tests' },
  { value: 'performance_task', label: 'Performance Task', labelKo: '수행과제', weighted: true, desc: 'Projects, presentations, portfolios, writing tasks' },
] as const

interface Assessment {
  id: string
  name: string
  domain: Domain
  max_score: number
  grade: number
  english_class: string
  type: string
  date: string | null
  description: string
  created_by: string | null
  created_at: string
}

interface StudentRow { id: string; english_name: string; korean_name: string; photo_url?: string }
type SubView = 'entry' | 'overview' | 'student' | 'batch' | 'calendar' | 'itemAnalysis' | 'quickCheck'
type LangKey = 'en' | 'ko'

interface Semester { id: string; name: string; name_ko: string; type: string; is_active: boolean }

export default function GradesView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [subView, setSubView] = useState<SubView>('entry')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daewoo_grade_tab_grade')
      if (saved) return Number(saved) as Grade
    }
    return (currentTeacher?.grade || 3) as Grade
  })
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daewoo_grade_tab_class')
      if (saved) return saved as EnglishClass
    }
    return (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  })
  const [selectedDomain, setSelectedDomain] = useState<Domain>('reading')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [absentMap, setAbsentMap] = useState<Record<string, boolean>>({})
  const [exemptMap, setExemptMap] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)

  // Load semesters
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semesters').select('*').order('start_date', { ascending: false })
      if (data && data.length > 0) {
        const activeSems = data.filter((s: Semester) => s.type !== 'archive')
        setSemesters(activeSems.length > 0 ? activeSems : data)
        const active = data.find((s: Semester) => s.is_active)
        setSelectedSemester(active?.id || data[0].id)
      }
    })()
  }, [])

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ALL_ENGLISH_CLASSES

  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  const loadAssessments = useCallback(async () => {
    setLoadingAssessments(true)
    let query = supabase.from('assessments').select('*')
      .eq('grade', selectedGrade).eq('english_class', selectedClass).eq('domain', selectedDomain)
    if (selectedSemester) query = query.eq('semester_id', selectedSemester)
    const { data, error } = await query
      .order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    if (!error && data) {
      setAssessments(data)
      if (data.length > 0 && !selectedAssessment) { setSelectedAssessment(data[data.length - 1]) }
      else if (data.length > 0 && selectedAssessment) {
        if (!data.find(a => a.id === selectedAssessment.id)) setSelectedAssessment(data[data.length - 1])
      } else { setSelectedAssessment(null) }
    }
    setLoadingAssessments(false)
  }, [selectedGrade, selectedClass, selectedDomain, selectedSemester])

  const loadAllAssessments = useCallback(async () => {
    let query = supabase.from('assessments').select('*')
      .eq('grade', selectedGrade).eq('english_class', selectedClass)
    if (selectedSemester) query = query.eq('semester_id', selectedSemester)
    const { data } = await query.order('domain').order('created_at', { ascending: true })
    if (data) setAllAssessments(data)
  }, [selectedGrade, selectedClass, selectedSemester])

  useEffect(() => { loadAssessments() }, [loadAssessments])
  useEffect(() => { loadAllAssessments() }, [loadAllAssessments])

  const selectedAssessmentId = selectedAssessment?.id
  useEffect(() => {
    if (!selectedAssessmentId) { setScores({}); setRawInputs({}); setAbsentMap({}); setExemptMap({}); return }
    const aid = selectedAssessmentId
    async function loadScores() {
      const { data } = await supabase.from('grades').select('student_id, score, is_absent, is_exempt').eq('assessment_id', aid)
      const map: Record<string, number | null> = {}
      const abs: Record<string, boolean> = {}
      const exm: Record<string, boolean> = {}
      if (data) data.forEach((g: any) => { map[g.student_id] = g.score; if (g.is_absent) abs[g.student_id] = true; if (g.is_exempt) exm[g.student_id] = true })
      setScores(map); setAbsentMap(abs); setExemptMap(exm); setRawInputs({}); setHasChanges(false)
    }
    loadScores()
  }, [selectedAssessmentId])

  useEffect(() => {
    if (currentTeacher?.role === 'teacher' && currentTeacher.english_class !== 'Admin')
      setSelectedClass(currentTeacher.english_class as EnglishClass)
  }, [currentTeacher])

  const handleScoreChange = (studentId: string, value: string) => {
    if (!selectedAssessment) return
    // Store raw text for display -- allows typing decimals like "9."
    setRawInputs(prev => ({ ...prev, [studentId]: value }))
    setHasChanges(true)
  }

  const commitScore = (studentId: string) => {
    if (!selectedAssessment) return
    const value = rawInputs[studentId]
    if (value === undefined) return
    let score: number | null = null
    if (value === '') { score = null }
    else if (value.startsWith('=') && value.includes('/')) {
      const parts = value.substring(1).split('/')
      const n = parseFloat(parts[0]), d = parseFloat(parts[1])
      if (!isNaN(n) && !isNaN(d) && d > 0) score = Math.round((n / d) * selectedAssessment.max_score * 100) / 100
    } else if (value.includes('/')) {
      const parts = value.split('/')
      const n = parseFloat(parts[0]), d = parseFloat(parts[1])
      if (!isNaN(n) && !isNaN(d) && d > 0) score = Math.round((n / d) * selectedAssessment.max_score * 100) / 100
    } else { const n = parseFloat(value); if (!isNaN(n)) score = Math.round(n * 100) / 100 }
    setScores(prev => ({ ...prev, [studentId]: score }))
    setRawInputs(prev => { const next = { ...prev }; delete next[studentId]; return next })
  }

  const handleSaveAll = async () => {
    if (!selectedAssessment) return
    // Commit any pending raw inputs first
    const pending = { ...rawInputs }
    const finalScores = { ...scores }
    for (const [sid, value] of Object.entries(pending)) {
      if (value === '') { finalScores[sid] = null; continue }
      let s: number | null = null
      if (value.includes('/')) {
        const isEq = value.startsWith('=')
        const parts = (isEq ? value.substring(1) : value).split('/')
        const n = parseFloat(parts[0]), d = parseFloat(parts[1])
        if (!isNaN(n) && !isNaN(d) && d > 0) s = Math.round((n / d) * selectedAssessment.max_score * 100) / 100
      } else { const n = parseFloat(value); if (!isNaN(n)) s = Math.round(n * 100) / 100 }
      finalScores[sid] = s
    }
    setScores(finalScores); setRawInputs({})
    setSaving(true)
    // Save scores (including absent/exempt students with null scores)
    const allStudentIds = new Set([
      ...Object.keys(finalScores).filter(sid => finalScores[sid] !== null && finalScores[sid] !== undefined),
      ...Object.keys(absentMap).filter(sid => absentMap[sid]),
      ...Object.keys(exemptMap).filter(sid => exemptMap[sid]),
    ])
    for (const sid of allStudentIds) {
      const isAbsent = absentMap[sid] || false
      const isExempt = exemptMap[sid] || false
      const score = isAbsent ? null : (finalScores[sid] ?? null)
      const { error } = await supabase.from('grades').upsert(
        { assessment_id: selectedAssessment.id, student_id: sid, score, is_absent: isAbsent, is_exempt: isExempt, entered_by: currentTeacher?.id || null },
        { onConflict: 'student_id,assessment_id' })
      if (error) { showToast(`Error saving: ${error.message}`); setSaving(false); return }
    }
    setHasChanges(false); setSaving(false)
    showToast(lang === 'ko' ? '저장 완료!' : `Saved ${allStudentIds.size} entries`)
  }

  const handleDeleteAssessment = async (a: Assessment) => {
    const msg = lang === 'ko' ? `"${a.name}" 평가와 모든 점수를 삭제하시겠습니까?` : `Delete "${a.name}" and all its scores? This cannot be undone.`
    if (!confirm(msg)) return
    await supabase.from('grades').delete().eq('assessment_id', a.id)
    const { error } = await supabase.from('assessments').delete().eq('id', a.id)
    if (error) { showToast(`Error: ${error.message}`) }
    else { showToast(lang === 'ko' ? '삭제되었습니다' : `Deleted "${a.name}"`); if (selectedAssessment?.id === a.id) setSelectedAssessment(null); loadAssessments(); loadAllAssessments() }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number, studentId: string) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') {
      e.preventDefault(); commitScore(studentId); const inputs = document.querySelectorAll('.score-input') as NodeListOf<HTMLInputElement>; inputs[i + 1]?.focus()
    }
    if (e.key === 'ArrowUp') { e.preventDefault(); commitScore(studentId); const inputs = document.querySelectorAll('.score-input') as NodeListOf<HTMLInputElement>; inputs[i - 1]?.focus() }
  }

  const enteredCount = Object.values(scores).filter(s => s !== null && s !== undefined).length + Object.keys(absentMap).filter(sid => absentMap[sid]).length + Object.keys(exemptMap).filter(sid => exemptMap[sid]).length
  const catLabel = (type: string) => { const c = ASSESSMENT_CATEGORIES.find(x => x.value === type); return c ? (lang === 'ko' ? c.labelKo : c.label) : type }

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.grades.title}</h2>
            <p className="text-text-secondary text-sm mt-1">
              Grade {selectedGrade} · {selectedClass} · {students.length} students
              {selectedAssessment && subView === 'entry' && ` · ${selectedAssessment.name} (/${selectedAssessment.max_score})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && subView === 'entry' && (
              <button onClick={handleSaveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all shadow-sm">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {lang === 'ko' ? '저장' : 'Save All'}
              </button>
            )}
            {subView === 'entry' && (
              <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
                <Plus size={15} /> {t.grades.createAssessment}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-px bg-border/50 rounded-xl p-1 mt-4 overflow-x-auto">
          {([
            { id: 'entry' as SubView, icon: FileText, label: lang === 'ko' ? '점수 입력' : 'Score Entry' },
            { id: 'batch' as SubView, icon: ClipboardEdit, label: lang === 'ko' ? '일괄 입력' : 'Batch Grid' },
            { id: 'overview' as SubView, icon: BarChart3, label: lang === 'ko' ? '도메인 개요' : 'Domain Overview' },
            { id: 'student' as SubView, icon: User, label: lang === 'ko' ? '학생별 보기' : 'Student View' },
            { id: 'calendar' as SubView, icon: CalendarDays, label: lang === 'ko' ? '평가 일정' : 'Calendar' },
            { id: 'itemAnalysis' as SubView, icon: BarChart3, label: lang === 'ko' ? '문항 분석' : 'Item Analysis' },
            { id: 'quickCheck' as SubView, icon: Zap, label: lang === 'ko' ? '빠른 점검' : 'Quick Check' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${subView === tab.id ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt hover:text-navy'}`}>
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-10 py-6">
        <div className="flex items-center gap-3 mb-5">
          {/* Semester Dropdown */}
          {semesters.length > 0 && (
            <select value={selectedSemester || ''} onChange={e => { setSelectedSemester(e.target.value || null); setSelectedAssessment(null) }}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map(sem => (
                <option key={sem.id} value={sem.id}>
                  {lang === 'ko' ? sem.name_ko : sem.name}{sem.is_active ? ' ●' : ''}
                </option>
              ))}
            </select>
          )}
          <div className="w-px h-6 bg-border" />
          <select value={selectedGrade} onChange={e => { const g = Number(e.target.value) as Grade; setSelectedGrade(g); setSelectedAssessment(null); localStorage.setItem('daewoo_grade_tab_grade', String(g)) }}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => { setSelectedClass(cls); setSelectedAssessment(null); localStorage.setItem('daewoo_grade_tab_class', cls) }}
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

        {subView === 'entry' && <ScoreEntryView {...{ selectedDomain, assessments, selectedAssessment, scores, rawInputs, absentMap, exemptMap, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester }} setSelectedDomain={(d: Domain) => { setSelectedDomain(d); setSelectedAssessment(null) }} setSelectedAssessment={setSelectedAssessment} handleScoreChange={handleScoreChange} handleKeyDown={handleKeyDown} commitScore={commitScore} handleSaveAll={handleSaveAll} handleDeleteAssessment={handleDeleteAssessment} onEditAssessment={setEditingAssessment} onCreateAssessment={() => setShowCreateModal(true)} createLabel={t.grades.createAssessment} onToggleAbsent={(sid: string) => { setAbsentMap(prev => { const n = { ...prev }; if (n[sid]) delete n[sid]; else { n[sid] = true; setExemptMap(p => { const e = { ...p }; delete e[sid]; return e }) }; return n }); setHasChanges(true) }} onToggleExempt={(sid: string) => { setExemptMap(prev => { const n = { ...prev }; if (n[sid]) delete n[sid]; else { n[sid] = true; setAbsentMap(p => { const a = { ...p }; delete a[sid]; return a }) }; return n }); setHasChanges(true) }} onRubricApply={(newScores: Record<string, number>, rubricMax?: number) => { if (rubricMax && selectedAssessment && rubricMax !== selectedAssessment.max_score) { supabase.from('assessments').update({ max_score: rubricMax }).eq('id', selectedAssessment.id).then(() => { setSelectedAssessment({ ...selectedAssessment, max_score: rubricMax }); setAllAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, max_score: rubricMax } : a)); setAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, max_score: rubricMax } : a)) }) } setScores(prev => ({ ...prev, ...newScores })); setHasChanges(true) }} />}
        {subView === 'batch' && <BatchGridView selectedDomain={selectedDomain} setSelectedDomain={(d: Domain) => setSelectedDomain(d)} allAssessments={allAssessments} students={students} selectedClass={selectedClass} selectedGrade={selectedGrade} lang={lang} />}
        {subView === 'overview' && <DomainOverview allAssessments={allAssessments} selectedGrade={selectedGrade} selectedClass={selectedClass} lang={lang} />}
        {subView === 'student' && <StudentDrillDown allAssessments={allAssessments} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} />}
        {subView === 'calendar' && <AssessmentCalendarView allAssessments={allAssessments} lang={lang} />}
        {subView === 'itemAnalysis' && <ItemAnalysisView allAssessments={allAssessments} students={students} />}
        {subView === 'quickCheck' && <QuickCheckView students={students} selectedClass={selectedClass} selectedGrade={selectedGrade} />}
      </div>

      {(showCreateModal || editingAssessment) && <AssessmentModal grade={selectedGrade} englishClass={selectedClass} domain={selectedDomain} editing={editingAssessment} semesterId={selectedSemester} onClose={() => { setShowCreateModal(false); setEditingAssessment(null) }} onSaved={(a: Assessment) => { setShowCreateModal(false); setEditingAssessment(null); loadAssessments().then(() => setSelectedAssessment(a)); loadAllAssessments() }} />}
    </div>
  )
}

// ─── Score Entry ─────────────────────────────────────────────────────

function ScoreEntryView({ selectedDomain, setSelectedDomain, assessments, selectedAssessment, setSelectedAssessment, scores, rawInputs, absentMap, exemptMap, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester, handleScoreChange, handleKeyDown, commitScore, handleSaveAll, handleDeleteAssessment, onEditAssessment, onCreateAssessment, createLabel, onToggleAbsent, onToggleExempt, onRubricApply }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; assessments: Assessment[]; selectedAssessment: Assessment | null; setSelectedAssessment: (a: Assessment | null) => void; scores: Record<string, number | null>; rawInputs: Record<string, string>; absentMap: Record<string, boolean>; exemptMap: Record<string, boolean>; students: StudentRow[]; loadingStudents: boolean; loadingAssessments: boolean; enteredCount: number; hasChanges: boolean; saving: boolean; lang: LangKey; catLabel: (t: string) => string; selectedClass: EnglishClass; selectedGrade: Grade; selectedSemester: string | null; handleScoreChange: (sid: string, v: string) => void; handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, i: number, sid: string) => void; commitScore: (sid: string) => void; handleSaveAll: () => void; handleDeleteAssessment: (a: Assessment) => void; onEditAssessment: (a: Assessment) => void; onCreateAssessment: () => void; createLabel: string; onToggleAbsent: (sid: string) => void; onToggleExempt: (sid: string) => void; onRubricApply: (scores: Record<string, number>, rubricMax?: number) => void
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [rubricOpen, setRubricOpen] = useState(false)
  const isRubricDomain = selectedDomain === 'writing' || selectedDomain === 'reading' || selectedDomain === 'speaking'
  return (
    <>
      {rubricOpen && selectedAssessment && (
        <RubricScoringModal
          students={students}
          existingScores={scores}
          maxScore={selectedAssessment.max_score}
          domain={selectedDomain}
          grade={selectedGrade}
          assessmentId={selectedAssessment.id}
          onApplyScores={(newScores, rubricMax) => onRubricApply(newScores, rubricMax)}
          onClose={() => setRubricOpen(false)}
        />
      )}
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {DOMAINS.map(d => {
          const SHORT: Record<string, string> = { reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards' }
          return (
          <button key={d} onClick={() => setSelectedDomain(d)} className={`px-4 py-2.5 text-[12px] font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${selectedDomain === d ? 'border-navy text-navy' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {SHORT[d] || DOMAIN_LABELS[d][lang]}
            {assessments.filter(a => a.domain === d).length > 0 && <span className="ml-1.5 text-[10px] bg-accent-light text-navy px-1.5 py-0.5 rounded-full font-bold">{assessments.filter(a => a.domain === d).length}</span>}
          </button>
        )})}
      </div>

      {assessments.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">{lang === 'ko' ? '평가:' : 'Assessment:'}</span>
          {assessments.map(a => (
            <div key={a.id} className="relative">
              <button onClick={() => setSelectedAssessment(a)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${selectedAssessment?.id === a.id ? 'border-navy bg-navy text-white' : 'border-border bg-surface text-text-secondary hover:border-navy/30'}`}>
                <span>{a.name}</span><span className="opacity-60 ml-1">/{a.max_score}</span>
                {a.type !== 'formative' && <span className={`ml-1.5 text-[9px] px-1 py-0.5 rounded ${selectedAssessment?.id === a.id ? 'bg-white/20' : 'bg-surface-alt'}`}>{catLabel(a.type)}</span>}
                {a.date && <span className={`ml-1 text-[10px] ${selectedAssessment?.id === a.id ? 'opacity-60' : 'text-text-tertiary'}`}>{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
              </button>
              {selectedAssessment?.id === a.id && (
                <div className="absolute -top-1 -right-1 z-10">
                  <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === a.id ? null : a.id) }} className="w-5 h-5 rounded-full bg-navy-dark text-white flex items-center justify-center hover:bg-navy transition-colors"><ChevronDown size={10} /></button>
                  {menuOpen === a.id && (
                    <div className="absolute right-0 top-6 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-20" onClick={() => setMenuOpen(null)}>
                      <button onClick={() => onEditAssessment(a)} className="w-full text-left px-3 py-2 text-[12px] hover:bg-surface-alt flex items-center gap-2"><Pencil size={12} /> {lang === 'ko' ? '수정' : 'Edit'}</button>
                      <button onClick={() => handleDeleteAssessment(a)} className="w-full text-left px-3 py-2 text-[12px] hover:bg-danger-light text-danger flex items-center gap-2"><Trash2 size={12} /> {lang === 'ko' ? '삭제' : 'Delete'}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {loadingStudents || loadingAssessments ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" /><p className="text-text-tertiary text-sm">Loading...</p></div>
        ) : !selectedAssessment ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3"></div>
            <h3 className="font-display text-lg font-semibold text-navy mb-1">{assessments.length === 0 ? (lang === 'ko' ? '평가를 먼저 생성하세요' : 'Create your first assessment') : (lang === 'ko' ? '평가를 선택하세요' : 'Select an assessment above')}</h3>
            <p className="text-text-tertiary text-sm max-w-md mx-auto">{assessments.length === 0 ? (lang === 'ko' ? '"평가 생성" 버튼을 클릭하여 시작하세요.' : 'Click "Create Assessment" to get started. Name it, pick the domain and category, set the total points, then enter scores.') : ''}</p>
            {assessments.length === 0 && <button onClick={onCreateAssessment} className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all"><Plus size={15} /> {createLabel}</button>}
          </div>
        ) : selectedAssessment.sections && selectedAssessment.sections.length > 0 ? (
          /* Section-based score entry */
          <SectionScoreEntry assessment={selectedAssessment} students={students} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} selectedSemester={selectedSemester || ''} catLabel={catLabel} />
        ) : (
          <>
            <div className="px-5 py-3 bg-accent-light border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-navy">{selectedAssessment.name}</span>
                  <span className="text-[12px] text-text-secondary">out of {selectedAssessment.max_score}</span>
                  <span className="text-[10px] bg-navy/10 text-navy px-2 py-0.5 rounded-full font-medium">{catLabel(selectedAssessment.type)}</span>
                  {selectedAssessment.date && <span className="text-[11px] text-text-tertiary flex items-center gap-1"><Calendar size={11} />{new Date(selectedAssessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {selectedAssessment.description && <span className="text-[11px] text-text-tertiary" title={selectedAssessment.description}> {selectedAssessment.description.length > 40 ? selectedAssessment.description.slice(0, 40) + '...' : selectedAssessment.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-secondary">{enteredCount}/{students.length} entered</span>
                  <div className="w-24 h-1.5 bg-navy/10 rounded-full overflow-hidden"><div className="h-full bg-navy rounded-full transition-all" style={{ width: `${students.length > 0 ? (enteredCount / students.length) * 100 : 0}%` }} /></div>
                  {isRubricDomain && <button onClick={() => setRubricOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all"><ClipboardEdit size={13} />Score with Rubric</button>}
                  <CrossClassCompare assessmentName={selectedAssessment.name} domain={selectedAssessment.domain} maxScore={selectedAssessment.max_score} currentClass={selectedClass} grade={selectedGrade} semesterId={selectedSemester || ''} />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="bg-surface-alt">
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-10"></th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold min-w-[200px]">Student</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">Score /{selectedAssessment.max_score}</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">%</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">Status</th>
                </tr></thead>
                <tbody>
                  {students.map((s, i) => {
                    const isAbsent = absentMap[s.id] || false
                    const isExempt = exemptMap[s.id] || false
                    const score = isAbsent ? null : scores[s.id]
                    const pct = score != null && selectedAssessment.max_score > 0 ? ((score / selectedAssessment.max_score) * 100).toFixed(1) : null
                    const isLow = pct !== null && parseFloat(pct) < 60
                    return (
                      <tr key={s.id} className={`border-t border-border table-row-hover ${isAbsent ? 'opacity-50' : ''} ${isExempt ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                        <td className="px-4 py-2">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center"><User size={12} className="text-text-tertiary" /></div>
                          )}
                        </td>
                        <td className="px-4 py-2.5"><StudentPopover studentId={s.id} name={s.english_name} koreanName={s.korean_name} trigger={<><span className="font-medium">{s.english_name}</span><span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span></>} /> <WIDABadge studentId={s.id} compact /></td>
                        <td className="px-4 py-2.5 text-center">{isAbsent ? <span className="text-[11px] text-text-tertiary italic">Absent</span> : isExempt ? <span className="text-[11px] text-amber-600 italic">Exempt</span> : <input type="text" className={`score-input ${score != null ? 'has-value' : ''} ${isLow ? 'error' : ''}`} value={rawInputs[s.id] !== undefined ? rawInputs[s.id] : (score != null ? score : '')} onChange={e => handleScoreChange(s.id, e.target.value)} onBlur={() => commitScore(s.id)} onKeyDown={e => handleKeyDown(e, i, s.id)} placeholder="" />}</td>
                        <td className={`px-4 py-2.5 text-center text-[12px] font-medium ${isLow ? 'text-danger' : pct ? 'text-navy' : 'text-text-tertiary'}`}>{isAbsent || isExempt ? '—' : pct ? `${pct}%` : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="inline-flex gap-1">
                            <button onClick={() => onToggleAbsent(s.id)} title="Mark absent" className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${isAbsent ? 'bg-red-100 text-red-600 ring-1 ring-red-300' : 'bg-surface-alt text-text-tertiary hover:bg-red-50 hover:text-red-500'}`}>ABS</button>
                            <button onClick={() => onToggleExempt(s.id)} title="Mark exempt" className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${isExempt ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-300' : 'bg-surface-alt text-text-tertiary hover:bg-amber-50 hover:text-amber-500'}`}>EXM</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <StatsBar scores={scores} maxScore={selectedAssessment.max_score} lang={lang} />
            {hasChanges && (
              <div className="px-5 py-3 bg-warm-light border-t border-gold/20 flex items-center justify-between">
                <p className="text-[12px] text-amber-700">{lang === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'You have unsaved changes'}</p>
                <button onClick={handleSaveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {lang === 'ko' ? '저장' : 'Save'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ─── Section-Based Score Entry ─────────────────────────────────────
function SectionScoreEntry({ assessment, students, lang, selectedClass, selectedGrade, selectedSemester, catLabel }: {
  assessment: Assessment; students: StudentRow[]; lang: LangKey; selectedClass: EnglishClass; selectedGrade: Grade; selectedSemester: string; catLabel: (t: string) => string
}) {
  const { showToast } = useApp()
  const sections = assessment.sections || []
  const [sectionScores, setSectionScores] = useState<Record<string, Record<string, number | null>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase.from('grades').select('student_id, score, section_scores')
        .eq('assessment_id', assessment.id)
        .in('student_id', students.map(s => s.id))
      const map: Record<string, Record<string, number | null>> = {}
      students.forEach(s => { map[s.id] = {} })
      data?.forEach((g: any) => {
        if (g.section_scores) {
          map[g.student_id] = g.section_scores
        } else if (g.score != null) {
          // Legacy: single score, no sections -- put it all in section 0
          map[g.student_id] = { '0': g.score }
        }
      })
      setSectionScores(map)
      setLoading(false)
      setHasChanges(false)
    })()
  }, [assessment.id, students.length])

  const handleChange = (sid: string, secIdx: number, value: string) => {
    setSectionScores(prev => ({
      ...prev,
      [sid]: { ...(prev[sid] || {}), [String(secIdx)]: value === '' ? null : Number(value) }
    }))
    setHasChanges(true)
  }

  const getTotal = (sid: string) => {
    const ss = sectionScores[sid] || {}
    return sections.reduce((sum, _, i) => sum + (Number(ss[String(i)]) || 0), 0)
  }

  const hasAnyScore = (sid: string) => {
    const ss = sectionScores[sid] || {}
    return sections.some((_, i) => ss[String(i)] != null)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let errors = 0
    for (const s of students) {
      if (!hasAnyScore(s.id)) continue
      const ss = sectionScores[s.id] || {}
      const total = getTotal(s.id)
      const { error } = await supabase.from('grades').upsert({
        student_id: s.id,
        assessment_id: assessment.id,
        score: total,
        max_score: assessment.max_score,
        section_scores: ss,
        is_exempt: false,
      }, { onConflict: 'student_id,assessment_id' })
      if (error) errors++
    }
    setSaving(false)
    setHasChanges(false)
    const entered = students.filter(s => hasAnyScore(s.id)).length
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved section scores for ${entered} students`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <>
      <div className="px-5 py-3 bg-accent-light border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-navy">{assessment.name}</span>
            <span className="text-[10px] bg-navy/10 text-navy px-2 py-0.5 rounded-full font-medium">{catLabel(assessment.type)}</span>
            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">{sections.length} sections</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-text-secondary">{students.filter(s => hasAnyScore(s.id)).length}/{students.length} entered</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[180px] z-10">Student</th>
            {sections.map((sec, si) => (
              <th key={si} className="text-center px-2 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[70px]">
                <div className="font-bold">{sec.label}</div>
                <div className="text-[8px] text-text-tertiary font-normal">/{sec.max_points}</div>
                {sec.standard && <div className="text-[7px] text-purple-600 font-medium mt-0.5">{sec.standard}</div>}
              </th>
            ))}
            <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">Total /{assessment.max_score}</th>
            <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-14">%</th>
          </tr></thead>
          <tbody>
            {students.map((s, si) => {
              const total = getTotal(s.id)
              const has = hasAnyScore(s.id)
              const pct = has && assessment.max_score > 0 ? (total / assessment.max_score) * 100 : null
              return (
                <tr key={s.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2 sticky left-0 bg-surface font-medium text-navy whitespace-nowrap z-10">
                    {s.english_name} <span className="text-text-tertiary font-normal text-[10px]">{s.korean_name}</span>
                  </td>
                  {sections.map((sec, secIdx) => {
                    const val = sectionScores[s.id]?.[String(secIdx)]
                    return (
                      <td key={secIdx} className="px-1 py-1.5 text-center">
                        <input type="number" step="0.5" min={0} max={sec.max_points}
                          value={val ?? ''}
                          onChange={e => handleChange(s.id, secIdx, e.target.value)}
                          data-col={secIdx} data-row={si}
                          onKeyDown={e => {
                            if (e.key === 'Tab' || e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault()
                              const tbl = (e.target as HTMLElement).closest('table')
                              const next = tbl?.querySelector(`input[data-col="${secIdx}"][data-row="${si + 1}"]`) as HTMLInputElement
                              next?.focus()
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const tbl = (e.target as HTMLElement).closest('table')
                              const next = tbl?.querySelector(`input[data-col="${secIdx}"][data-row="${si - 1}"]`) as HTMLInputElement
                              next?.focus()
                            }
                          }}
                          className={`w-14 px-1.5 py-1.5 border rounded-lg text-center text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 ${val != null && sec.max_points > 0 && (Number(val) / sec.max_points) < 0.6 ? 'border-red-300 bg-red-50' : 'border-border'}`}
                        />
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-bold text-navy text-[13px]">{has ? total : ''}</td>
                  <td className={`px-3 py-2 text-center text-[11px] font-semibold ${pct != null ? (pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600') : 'text-text-tertiary'}`}>
                    {pct != null ? `${pct.toFixed(0)}%` : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy/20 bg-surface-alt/50">
              <td className="px-3 py-2 sticky left-0 bg-surface-alt/50 font-bold text-[11px] text-navy z-10">Class Average</td>
              {sections.map((sec, si) => {
                const vals = students.map(s => sectionScores[s.id]?.[String(si)]).filter((v): v is number => v != null)
                const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
                const pct = sec.max_points > 0 ? (avg / sec.max_points) * 100 : 0
                return (
                  <td key={si} className={`px-1 py-2 text-center text-[12px] font-bold ${vals.length === 0 ? 'text-text-tertiary' : pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {vals.length > 0 ? `${avg.toFixed(1)}` : ''}
                  </td>
                )
              })}
              {(() => {
                const allTotals = students.filter(s => hasAnyScore(s.id)).map(s => getTotal(s.id))
                const totalAvg = allTotals.length > 0 ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length : 0
                const totalPct = allTotals.length > 0 && assessment.max_score > 0 ? (totalAvg / assessment.max_score) * 100 : 0
                return (
                  <>
                    <td className="px-3 py-2 text-center font-bold text-navy text-[13px]">{allTotals.length > 0 ? totalAvg.toFixed(1) : ''}</td>
                    <td className={`px-3 py-2 text-center text-[11px] font-bold ${totalPct >= 80 ? 'text-green-600' : totalPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {allTotals.length > 0 ? `${totalPct.toFixed(0)}%` : ''}
                    </td>
                  </>
                )
              })()}
            </tr>
          </tfoot>
        </table>
      </div>
      {/* Per-section stats */}
      <div className="px-5 py-2.5 bg-surface-alt border-t border-border flex items-center gap-4 text-[11px] flex-wrap">
        {sections.map((sec, si) => {
          const vals = students.map(s => sectionScores[s.id]?.[String(si)]).filter((v): v is number => v != null)
          const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          const pct = sec.max_points > 0 ? (avg / sec.max_points) * 100 : 0
          return (
            <span key={si} className="inline-flex items-center gap-1">
              <span className="font-semibold text-navy">{sec.label}:</span>
              <span className={pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}>{avg.toFixed(1)}/{sec.max_points} ({pct.toFixed(0)}%)</span>
              {sec.standard && <span className="text-[8px] text-purple-600">{sec.standard}</span>}
            </span>
          )
        })}
      </div>
      {hasChanges && (
        <div className="px-5 py-3 bg-warm-light border-t border-gold/20 flex items-center justify-between">
          <p className="text-[12px] text-amber-700">Unsaved changes</p>
          <button onClick={handleSaveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Section Scores
          </button>
        </div>
      )}
    </>
  )
}

function StatsBar({ scores, maxScore, lang }: { scores: Record<string, number | null>; maxScore: number; lang: LangKey }) {
  const valid = Object.values(scores).filter((s): s is number => s != null)
  if (valid.length === 0) return null
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  const hi = Math.max(...valid), lo = Math.min(...valid)
  const pA = maxScore > 0 ? (avg / maxScore) * 100 : 0
  const pH = maxScore > 0 ? (hi / maxScore) * 100 : 0
  const pL = maxScore > 0 ? (lo / maxScore) * 100 : 0

  // Decile histogram
  const deciles = Array(10).fill(0)
  valid.forEach(s => {
    const pct = maxScore > 0 ? (s / maxScore) * 100 : 0
    const bin = Math.min(9, Math.floor(pct / 10))
    deciles[bin]++
  })
  const maxBin = Math.max(...deciles, 1)
  const nBelow60 = valid.filter(s => maxScore > 0 && (s / maxScore) * 100 < 60).length

  return (
    <div className="px-5 py-2.5 bg-surface-alt border-t border-border flex items-center gap-6 text-[12px]">
      <span className="text-text-tertiary font-medium">{lang === 'ko' ? '통계' : 'Stats'}:</span>
      <span><span className="text-text-tertiary">Avg:</span> <span className="font-semibold text-navy">{avg.toFixed(1)} ({pA.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">High:</span> <span className="font-semibold text-success">{hi} ({pH.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">Low:</span> <span className={`font-semibold ${pL < 60 ? 'text-danger' : 'text-navy'}`}>{lo} ({pL.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">n:</span> <span className="font-medium">{valid.length}</span></span>
      {/* Mini decile histogram */}
      <div className="flex items-end gap-px h-5 ml-2" title="Score distribution by decile (0-10% through 90-100%)">
        {deciles.map((count, i) => {
          const h = count > 0 ? Math.max(4, Math.round((count / maxBin) * 20)) : 2
          const color = i < 6 ? 'bg-red-400' : i < 8 ? 'bg-amber-400' : 'bg-green-400'
          return <div key={i} className={`w-[5px] rounded-sm ${count > 0 ? color : 'bg-gray-200'}`} style={{ height: `${h}px` }} />
        })}
      </div>
      {nBelow60 > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">
          {nBelow60} below 60%
        </span>
      )}
    </div>
  )
}

// ─── Batch Grid View ──────────────────────────────────────────────

function BatchGridView({ selectedDomain, setSelectedDomain, allAssessments, students, selectedClass, selectedGrade, lang }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; allAssessments: Assessment[]; students: StudentRow[]; selectedClass: EnglishClass; selectedGrade: Grade; lang: LangKey
}) {
  const { showToast } = useApp()
  const [scores, setScores] = useState<any>({})
  const [sectionScores, setSectionScores] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null)

  const domainAssessments = allAssessments.filter(a => a.domain === selectedDomain)

  useEffect(() => {
    if (domainAssessments.length === 0 || students.length === 0) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('grades').select('student_id, assessment_id, score, section_scores')
        .in('assessment_id', domainAssessments.map(a => a.id))
        .in('student_id', students.map(s => s.id))
      const map: any = {}
      const secMap: any = {}
      students.forEach(s => { map[s.id] = {}; secMap[s.id] = {} })
      data?.forEach((g: any) => {
        if (map[g.student_id]) {
          map[g.student_id][g.assessment_id] = g.score
          if (g.section_scores) secMap[g.student_id][g.assessment_id] = g.section_scores
        }
      })
      setScores(map)
      setSectionScores(secMap)
      setLoading(false)
      setHasChanges(false)
    })()
  }, [selectedDomain, students.length, allAssessments.length])

  const handleChange = (studentId: string, assessmentId: string, value: string) => {
    setScores((prev: any) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [assessmentId]: value === '' ? null : Number(value) }
    }))
    setHasChanges(true)
  }

  const handleSectionChange = (studentId: string, assessmentId: string, sectionIdx: number, value: string, sections: any[]) => {
    setSectionScores((prev: any) => {
      const studentSec = { ...(prev[studentId]?.[assessmentId] || {}) }
      studentSec[String(sectionIdx)] = value === '' ? null : Number(value)
      // Auto-compute total
      const total = sections.reduce((sum, _, i) => sum + (Number(studentSec[String(i)]) || 0), 0)
      const newPrev = { ...prev, [studentId]: { ...(prev[studentId] || {}), [assessmentId]: studentSec } }
      // Also update the total score
      setScores((sp: any) => ({ ...sp, [studentId]: { ...(sp[studentId] || {}), [assessmentId]: total } }))
      return newPrev
    })
    setHasChanges(true)
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let errors = 0
    const rows: any[] = []
    for (const s of students) {
      for (const a of domainAssessments) {
        const score = scores[s.id]?.[a.id]
        if (score != null) {
          const row: any = { student_id: s.id, assessment_id: a.id, score }
          if (sectionScores[s.id]?.[a.id]) row.section_scores = sectionScores[s.id][a.id]
          rows.push(row)
        }
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('grades').upsert(rows, { onConflict: 'student_id,assessment_id' })
      if (error) errors++
    }
    setSaving(false)
    setHasChanges(false)
    showToast(errors > 0 ? 'Saved with errors' : 'Saved ' + rows.length + ' scores')
  }

  // Build column list: for each assessment, show total + optional expanded sections
  const buildColumns = () => {
    const cols: { type: 'total' | 'section'; assessment: any; sectionIdx?: number; sectionLabel?: string }[] = []
    for (const a of domainAssessments) {
      cols.push({ type: 'total', assessment: a })
      const hasSections = a.sections && a.sections.length > 0
      if (hasSections && expandedAssessment === a.id) {
        a.sections.forEach((sec: any, i: number) => {
          cols.push({ type: 'section', assessment: a, sectionIdx: i, sectionLabel: sec.label || `S${i + 1}` })
        })
      }
    }
    return cols
  }

  const columns = loading ? [] : buildColumns()

  return (
    <>
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {DOMAINS.map(d => {
          const SHORT: Record<string, string> = { reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards' }
          return (
          <button key={d} onClick={() => setSelectedDomain(d)} className={`px-4 py-2.5 text-[12px] font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${selectedDomain === d ? 'border-navy text-navy' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {SHORT[d] || DOMAIN_LABELS[d][lang]}
          </button>
        )})}
      </div>

      {loading ? <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> : domainAssessments.length === 0 ? (
        <div className="p-12 text-center text-text-tertiary">No assessments in {DOMAIN_LABELS[selectedDomain][lang]}</div>
      ) : (
        <div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-[12px] text-blue-800 leading-relaxed">
            <strong>Batch Grid</strong> lets you view and edit scores for all students across all assessments. {domainAssessments.some(a => a.sections?.length > 0) ? 'Click an assessment header to expand/collapse its sections.' : ''} Changes are saved when you click "Save All."
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead><tr className="bg-surface-alt">
                <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[180px] z-10">Student</th>
                {columns.map((col, ci) => {
                  if (col.type === 'section') {
                    return (
                      <th key={`sec-${col.assessment.id}-${col.sectionIdx}`} className="text-center px-1 py-2.5 text-[8px] uppercase tracking-wider text-purple-600 font-semibold min-w-[100px] bg-purple-50/50">
                        <div className="whitespace-nowrap">{col.sectionLabel}</div>
                        <div className="text-[7px] text-purple-400 font-normal">/{col.assessment.sections[col.sectionIdx!].max_points || col.assessment.sections[col.sectionIdx!].max_score || '?'}</div>
                      </th>
                    )
                  }
                  const a = col.assessment
                  const hasSections = a.sections && a.sections.length > 0
                  const isExpanded = expandedAssessment === a.id
                  return (
                    <th key={a.id} className={`text-center px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[130px] ${hasSections ? 'cursor-pointer hover:bg-navy/5' : ''}`}
                      onClick={() => hasSections && setExpandedAssessment(isExpanded ? null : a.id)} title={hasSections ? `Click to ${isExpanded ? 'collapse' : 'expand'} sections` : a.name}>
                      <div className="flex items-center justify-center gap-0.5 leading-tight">
                        {a.name}
                        {hasSections && <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                      </div>
                      <div className="text-[8px] text-text-tertiary font-normal">/{a.max_score}{hasSections ? ` (${a.sections.length} sec)` : ''}</div>
                    </th>
                  )
                })}
                <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">Avg%</th>
              </tr></thead>
              <tbody>
                {students.map(s => {
                  const weightedItems: { score: number; maxScore: number; assessmentType: 'formative' | 'summative' | 'performance_task' }[] = []
                  domainAssessments.forEach(a => {
                    const sc = scores[s.id]?.[a.id]
                    if (sc != null && a.max_score > 0) {
                      weightedItems.push({ score: sc, maxScore: a.max_score, assessmentType: a.type || 'formative' })
                    }
                  })
                  const avg = calcWeightedAvg(weightedItems, Number(selectedGrade))
                  return (
                    <tr key={s.id} className="border-t border-border hover:bg-surface-alt/30">
                      <td className="px-3 py-2 sticky left-0 bg-surface font-medium text-navy whitespace-nowrap z-10">{s.english_name} <span className="text-text-tertiary font-normal text-[10px]">{s.korean_name}</span></td>
                      {columns.map((col, ci) => {
                        if (col.type === 'section') {
                          const secVal = sectionScores[s.id]?.[col.assessment.id]?.[String(col.sectionIdx)] ?? ''
                          return (
                            <td key={`sec-${col.assessment.id}-${col.sectionIdx}-${s.id}`} className="px-1 py-1.5 text-center bg-purple-50/20">
                              <input type="number" step="0.5" value={secVal ?? ''} onChange={e => handleSectionChange(s.id, col.assessment.id, col.sectionIdx!, e.target.value, col.assessment.sections)}
                                className="batch-input w-14 px-1 py-1.5 border rounded-lg text-center text-[11px] outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 border-purple-200" />
                            </td>
                          )
                        }
                        const a = col.assessment
                        const sc = scores[s.id]?.[a.id]
                        const pct = sc != null && a.max_score > 0 ? (sc / a.max_score) * 100 : null
                        const hasSections = a.sections && a.sections.length > 0 && expandedAssessment === a.id
                        return (
                          <td key={`total-${a.id}-${s.id}`} className="px-1 py-1.5 text-center">
                            <input type="number" step="0.5" value={sc ?? ''} onChange={e => handleChange(s.id, a.id, e.target.value)}
                              max={a.max_score} readOnly={hasSections}
                              className={`batch-input w-16 px-2 py-1.5 border rounded-lg text-center text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 ${hasSections ? 'bg-gray-50 text-text-tertiary' : ''} ${pct != null && pct < 60 ? 'border-red-300 bg-red-50' : 'border-border'}`} />
                          </td>
                        )
                      })}
                      <td className={`px-3 py-2 text-center font-bold text-[12px] ${avg != null ? (avg >= 80 ? 'text-green-600' : avg >= 60 ? 'text-amber-600' : 'text-red-600') : 'text-text-tertiary'}`}>{avg != null ? avg.toFixed(0) + '%' : '\u2014'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {hasChanges && (
            <div className="px-5 py-3 bg-warm-light border-t border-gold/20 flex items-center justify-between">
              <p className="text-[12px] text-amber-700">{lang === 'ko' ? '\uC800\uC7A5\uB418\uC9C0 \uC54A\uC740 \uBCC0\uACBD\uC0AC\uD56D' : 'Unsaved changes'}</p>
              <button onClick={handleSaveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {lang === 'ko' ? '\uC804\uCCB4 \uC800\uC7A5' : 'Save All'}
              </button>
            </div>
          )}
        </div>
        </div>
      )}
    </>
  )
}

// ─── Domain Overview ────────────────────────────────────────────────

function makeDomainStats() {
  const empty = { avg: null, count: 0, assessmentCount: 0, assessments: [] }
  return { reading: {...empty, assessments: []}, phonics: {...empty, assessments: []}, writing: {...empty, assessments: []}, speaking: {...empty, assessments: []}, language: {...empty, assessments: []} } as any
}

function DomainOverview({ allAssessments, selectedGrade, selectedClass, lang }: { allAssessments: Assessment[]; selectedGrade: Grade; selectedClass: EnglishClass; lang: LangKey }) {
  const [stats, setStats] = useState(makeDomainStats())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const result = makeDomainStats()
      try {
        for (const domain of DOMAINS) {
          const da = allAssessments.filter((a: any) => a.domain === domain)
          if (!result[domain]) result[domain] = { avg: null, count: 0, assessmentCount: 0, assessments: [] }
          result[domain].assessmentCount = da.length
          if (da.length === 0) continue
          const ids = da.map((a: any) => a.id)
          if (ids.length === 0) continue
          const { data: grades } = await supabase.from('grades').select('score, assessment_id').in('assessment_id', ids).not('score', 'is', null)
          if (cancelled) return
          if (grades && grades.length > 0) {
            const studentScores: Record<string, { score: number; maxScore: number; assessmentType: 'formative' | 'summative' | 'performance_task' }[]> = {}
            grades.forEach((g: any) => {
              const a = da.find((x: any) => x.id === g.assessment_id)
              if (!a || a.max_score <= 0) return
              if (!studentScores['_all']) studentScores['_all'] = []
              studentScores['_all'].push({ score: g.score, maxScore: a.max_score, assessmentType: a.type || 'formative' })
            })
            const allItems = studentScores['_all'] || []
            result[domain].count = allItems.length
            result[domain].avg = calcWeightedAvg(allItems, Number(selectedGrade || 3))
            for (const a of da) {
              const aGrades = grades.filter((g: any) => g.assessment_id === a.id)
              if (aGrades.length > 0 && a.max_score > 0) {
                const avg = aGrades.reduce((sum: number, g: any) => sum + (g.score / a.max_score) * 100, 0) / aGrades.length
                result[domain].assessments.push({ name: a.name, avg })
              }
            }
          }
        }
      } catch (err) {
        console.error('DomainOverview load error:', err)
      }
      if (!cancelled) {
        setStats(result)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [allAssessments, selectedGrade])

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" />
        <p className="text-text-tertiary text-sm">Loading...</p>
      </div>
    )
  }

  const validAvgs = DOMAINS.map(d => stats[d].avg).filter((v: any): v is number => v != null)
  const overallAvg = validAvgs.length > 0 ? validAvgs.reduce((a: number, b: number) => a + b, 0) / validAvgs.length : null
  const domainColors = { reading: '#3B82F6', phonics: '#8B5CF6', writing: '#F59E0B', speaking: '#22C55E', language: '#EC4899' }

  return (
    <div className="space-y-4">
      {/* Overall summary bar */}
      {overallAvg != null && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-navy">{lang === 'ko' ? '도메인 개요' : 'Domain Overview'}</h3>
              <p className="text-[12px] text-text-tertiary">Grade {selectedGrade} · {selectedClass} · {allAssessments.length} {lang === 'ko' ? '개 평가' : 'assessments total'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => {
                const headers = ['Domain', 'Average %', 'Assessments', 'Scores Entered']
                const rows = DOMAINS.map(d => [DOMAIN_LABELS[d][lang], stats[d].avg?.toFixed(1) ?? 'N/A', stats[d].assessmentCount, stats[d].count])
                exportToCSV(`grades-overview-${selectedClass}-G${selectedGrade}`, headers, rows)
              }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
                <Download size={12} /> CSV
              </button>
              <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{lang === 'ko' ? '전체 평균' : 'Overall Average'}</p>
              <p className="text-3xl font-display font-bold text-navy">{overallAvg.toFixed(1)}%</p>
            </div>
            </div>
          </div>
          {/* Domain bar chart */}
          <div className="space-y-3">
            {DOMAINS.map(domain => {
              const s = stats[domain]; const pct = s.avg
              const color = domainColors[domain]
              return (
                <div key={domain} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-text-secondary w-20 text-right">{DOMAIN_LABELS[domain][lang]}</span>
                  <div className="flex-1 h-7 bg-surface-alt rounded-lg overflow-hidden relative">
                    {pct != null ? (
                      <div className="h-full rounded-lg transition-all duration-700 flex items-center" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}>
                        <span className="text-[10px] font-bold text-white ml-2 whitespace-nowrap">{pct.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-tertiary">No data</span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-tertiary w-10">{s.assessmentCount} {lang === 'ko' ? '개' : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Per-domain assessment breakdown with mini bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DOMAINS.map(domain => {
          const s = stats[domain]
          if (s.assessmentCount === 0) return null
          const color = domainColors[domain]
          return (
            <div key={domain} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ backgroundColor: `${color}08` }}>
                <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color }}>{DOMAIN_LABELS[domain][lang]}</span>
                {s.avg != null && <span className="text-[14px] font-bold" style={{ color }}>{s.avg.toFixed(1)}%</span>}
              </div>
              <div className="p-4 space-y-2">
                {s.assessments.length > 0 ? s.assessments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary w-28 truncate text-right" title={a.name}>{a.name}</span>
                    <div className="flex-1 h-5 bg-surface-alt rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-500 flex items-center" style={{ width: `${Math.max(a.avg, 3)}%`, backgroundColor: `${color}CC` }}>
                        {a.avg > 15 && <span className="text-[9px] font-bold text-white ml-1.5">{a.avg.toFixed(0)}%</span>}
                      </div>
                    </div>
                    {a.avg <= 15 && <span className="text-[9px] font-medium text-text-tertiary">{a.avg.toFixed(0)}%</span>}
                  </div>
                )) : (
                  <p className="text-[11px] text-text-tertiary text-center py-2">No scores entered yet</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {allAssessments.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-text-tertiary text-sm">{lang === 'ko' ? '아직 평가가 없습니다.' : 'No assessments yet. Create your first assessment in Score Entry.'}</p>
        </div>
      )}
    </div>
  )
}

// ─── Student Drill-Down ─────────────────────────────────────────────

function StudentDrillDown({ allAssessments, students, selectedStudentId, setSelectedStudentId, lang }: { allAssessments: Assessment[]; students: StudentRow[]; selectedStudentId: string | null; setSelectedStudentId: (id: string | null) => void; lang: LangKey }) {
  const [studentGrades, setStudentGrades] = useState<Record<string, number | null>>({})
  const [classAvgs, setClassAvgs] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(false)
  const selected = students.find(s => s.id === selectedStudentId)

  useEffect(() => {
    if (!selectedStudentId || allAssessments.length === 0) return
    async function load() {
      setLoading(true)
      const ids = allAssessments.map(a => a.id)
      const { data: sg } = await supabase.from('grades').select('assessment_id, score').eq('student_id', selectedStudentId!).in('assessment_id', ids)
      const gm: Record<string, number | null> = {}; if (sg) sg.forEach(g => { gm[g.assessment_id] = g.score }); setStudentGrades(gm)
      const { data: ag } = await supabase.from('grades').select('assessment_id, score').in('assessment_id', ids).not('score', 'is', null)
      const am: Record<string, number | null> = {}
      if (ag) { const grouped: Record<string, number[]> = {}; ag.forEach(g => { if (!grouped[g.assessment_id]) grouped[g.assessment_id] = []; grouped[g.assessment_id].push(g.score) }); for (const [id, sc] of Object.entries(grouped)) { am[id] = sc.reduce((a, b) => a + b, 0) / sc.length } }
      setClassAvgs(am); setLoading(false)
    }
    load()
  }, [selectedStudentId, allAssessments])

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-xl p-5">
        <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">{lang === 'ko' ? '학생 선택' : 'Select Student'}</label>
        <select value={selectedStudentId || ''} onChange={e => setSelectedStudentId(e.target.value || null)} className="w-full max-w-sm px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
          <option value="">{lang === 'ko' ? '학생을 선택하세요...' : 'Choose a student...'}</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
        </select>
      </div>
      {selected && !loading && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-accent-light border-b border-border flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-navy">{selected.english_name}<span className="text-text-tertiary ml-2 text-[14px] font-normal">{selected.korean_name}</span></h3>
            <button onClick={() => {
              const pw = window.open('', '_blank'); if (!pw) return
              let domainsHTML = ''
              DOMAINS.forEach(domain => {
                const da = allAssessments.filter(a => a.domain === domain)
                if (da.length === 0) return
                const sp = da.map(a => { const s = studentGrades[a.id]; return s != null && a.max_score > 0 ? (s / a.max_score) * 100 : null }).filter((p): p is number => p != null)
                const dAvg = sp.length > 0 ? sp.reduce((a, b) => a + b, 0) / sp.length : null
                let rows = da.map(a => {
                  const sc = studentGrades[a.id]; const pct = sc != null && a.max_score > 0 ? ((sc / a.max_score) * 100).toFixed(1) : '—'
                  return `<tr><td style="padding:4px 8px;border:1px solid #e2e8f0">${a.name}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">${sc != null ? `${sc}/${a.max_score}` : '—'}</td><td style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center;font-weight:600">${pct}%</td></tr>`
                }).join('')
                domainsHTML += `<div style="margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;display:flex;justify-content:space-between">${DOMAIN_LABELS[domain][lang]}${dAvg != null ? `<span style="color:${dAvg >= 80 ? '#16a34a' : dAvg >= 60 ? '#d97706' : '#dc2626'}">${dAvg.toFixed(1)}%</span>` : ''}</h3><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f1f5f9"><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:left">Assessment</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">Score</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">%</th></tr></thead><tbody>${rows}</tbody></table></div>`
              })
              pw.document.write(`<!DOCTYPE html><html><head><title>Grade Report - ${selected.english_name}</title><link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet"><style>body{font-family:Roboto,sans-serif;margin:24px;color:#1a1a2e}@media print{@page{margin:15mm}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e3a5f;border-radius:8px;color:white;margin-bottom:16px"><div><span style="font-size:20px;font-weight:700;font-family:Lora,serif">${selected.english_name}</span><span style="font-size:14px;margin-left:8px;opacity:0.7">${selected.korean_name}</span></div><div style="font-size:11px;text-align:right">Grade Report<br>${new Date().toLocaleDateString()}</div></div>${domainsHTML}<p style="font-size:9px;color:#94a3b8;margin-top:16px">Daewoo Elementary English Program</p></body></html>`)
              pw.document.close(); pw.print()
            }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border border border-border">
              🖨️ Print Report
            </button>
          </div>
          {/* Overall score summary */}
          {(() => {
            const domainAvgs = DOMAINS.map(domain => {
              const da = allAssessments.filter(a => a.domain === domain)
              if (da.length === 0) return null
              const sp = da.map(a => { const s = studentGrades[a.id]; return s != null && a.max_score > 0 ? (s / a.max_score) * 100 : null }).filter((p): p is number => p != null)
              return sp.length > 0 ? sp.reduce((a, b) => a + b, 0) / sp.length : null
            }).filter((v): v is number => v != null)
            const overallAvg = domainAvgs.length > 0 ? domainAvgs.reduce((a, b) => a + b, 0) / domainAvgs.length : null
            const totalAssessed = allAssessments.filter(a => studentGrades[a.id] != null).length
            if (overallAvg == null) return null
            return (
              <div className="px-5 py-3 bg-surface-alt/50 border-b border-border flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl font-display font-bold ${overallAvg >= 80 ? 'text-success' : overallAvg >= 60 ? 'text-amber-600' : 'text-danger'}`}>{overallAvg.toFixed(1)}%</span>
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">Overall</span>
                </div>
                {DOMAINS.map(d => {
                  const da = allAssessments.filter(a => a.domain === d)
                  if (da.length === 0) return null
                  const sp = da.map(a => { const s = studentGrades[a.id]; return s != null && a.max_score > 0 ? (s / a.max_score) * 100 : null }).filter((p): p is number => p != null)
                  const avg = sp.length > 0 ? sp.reduce((a, b) => a + b, 0) / sp.length : null
                  if (avg == null) return null
                  const SHORT: Record<string, string> = { reading: 'R', phonics: 'PF', writing: 'W', speaking: 'SL', language: 'L' }
                  return <span key={d} className={`text-[11px] font-semibold ${avg >= 80 ? 'text-success' : avg >= 60 ? 'text-amber-600' : 'text-danger'}`}>{SHORT[d]}: {avg.toFixed(0)}%</span>
                })}
                <span className="text-[10px] text-text-tertiary ml-auto">{totalAssessed}/{allAssessments.length} assessed</span>
              </div>
            )
          })()}
          {DOMAINS.map(domain => {
            const da = allAssessments.filter(a => a.domain === domain)
            if (da.length === 0) return null
            const sp = da.map(a => { const s = studentGrades[a.id]; return s != null && a.max_score > 0 ? (s / a.max_score) * 100 : null }).filter((p): p is number => p != null)
            const dAvg = sp.length > 0 ? sp.reduce((a, b) => a + b, 0) / sp.length : null
            return (
              <div key={domain} className="border-b border-border last:border-b-0">
                <div className="px-5 py-3 bg-surface-alt flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-navy uppercase tracking-wider">{DOMAIN_LABELS[domain][lang]}</span>
                  {dAvg != null && <span className={`text-[13px] font-bold ${dAvg >= 80 ? 'text-success' : dAvg >= 60 ? 'text-amber-600' : 'text-danger'}`}>{dAvg.toFixed(1)}%</span>}
                </div>
                <table className="w-full text-[12px]">
                  <thead><tr className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    <th className="text-left px-5 py-2">Assessment</th><th className="text-center px-3 py-2">Score</th><th className="text-center px-3 py-2">%</th><th className="text-center px-3 py-2">{lang === 'ko' ? '반 평균' : 'Class Avg'}</th><th className="text-center px-3 py-2">{lang === 'ko' ? '반 평균 대비' : 'vs. Class'}</th>
                  </tr></thead>
                  <tbody>{da.map(a => {
                    const sc = studentGrades[a.id]; const pct = sc != null && a.max_score > 0 ? (sc / a.max_score) * 100 : null
                    const ca = classAvgs[a.id]; const caP = ca != null && a.max_score > 0 ? (ca / a.max_score) * 100 : null
                    const diff = pct != null && caP != null ? pct - caP : null
                    return (
                      <tr key={a.id} className="border-t border-border/50 table-row-hover">
                        <td className="px-5 py-2"><span className="font-medium">{a.name}</span>{a.date && <span className="text-text-tertiary ml-1.5 text-[10px]">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}</td>
                        <td className="text-center px-3 py-2 font-medium">{sc != null ? `${sc}/${a.max_score}` : '—'}</td>
                        <td className={`text-center px-3 py-2 font-semibold ${pct == null ? 'text-text-tertiary' : pct >= 80 ? 'text-success' : pct >= 60 ? 'text-amber-600' : 'text-danger'}`}>{pct != null ? `${pct.toFixed(1)}%` : '—'}</td>
                        <td className="text-center px-3 py-2 text-text-secondary">{caP != null ? `${caP.toFixed(1)}%` : '—'}</td>
                        <td className={`text-center px-3 py-2 font-semibold ${diff == null ? 'text-text-tertiary' : diff >= 0 ? 'text-success' : 'text-danger'}`}>{diff != null ? `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}` : '—'}</td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </div>
            )
          })}
          {allAssessments.length === 0 && <div className="p-8 text-center text-text-tertiary text-sm">{lang === 'ko' ? '이 반에 아직 평가가 없습니다.' : 'No assessments yet for this class.'}</div>}
        </div>
      )}
      {loading && <div className="bg-surface border border-border rounded-xl p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" /></div>}
    </div>
  )
}

// ─── Assessment Modal ───────────────────────────────────────────────

function AssessmentModal({ grade, englishClass, domain, editing, semesterId, onClose, onSaved }: { grade: Grade; englishClass: EnglishClass; domain: Domain; editing: Assessment | null; semesterId: string | null; onClose: () => void; onSaved: (a: Assessment) => void }) {
  const { language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [name, setName] = useState(editing?.name || '')
  const [maxScore, setMaxScore] = useState(editing?.max_score || 10)
  const [selDomain, setSelDomain] = useState<Domain>(editing?.domain || domain)
  const [category, setCategory] = useState(editing?.type || 'formative')
  const [date, setDate] = useState(editing?.date || '')
  const [notes, setNotes] = useState(editing?.description || '')
  const [saving, setSaving] = useState(false)
  const [shareClasses, setShareClasses] = useState<string[]>([])
  const [standards, setStandards] = useState<string[]>(editing?.standards?.map(s => s.code) || [])
  const [stdSearch, setStdSearch] = useState('')
  const [useSections, setUseSections] = useState(!!editing?.sections?.length)
  const [sections, setSections] = useState<{ label: string; standard: string; max_points: number }[]>(
    editing?.sections || []
  )
  const [focusedSection, setFocusedSection] = useState<number | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  // Inline score entry state
  const [scorePhase, setScorePhase] = useState(false)
  const [createdAssessment, setCreatedAssessment] = useState<Assessment | null>(null)
  const [scoreStudents, setScoreStudents] = useState<any[]>([])
  const [inlineScores, setInlineScores] = useState<Record<string, string>>({})
  const [savingScores, setSavingScores] = useState(false)

  // Load CCSS standards for suggestions
  const [ccssStandards, setCcssStandards] = useState<any[]>([])
  const [stdGradeFilter, setStdGradeFilter] = useState<number | null>(null)
  const [stdDomainFilter, setStdDomainFilter] = useState<string>('all')
  useEffect(() => {
    import('../curriculum/ccss-standards').then(m => { if (m.CCSS_STANDARDS) setCcssStandards(m.CCSS_STANDARDS) }).catch(() => {})
  }, [])

  // Auto-set grade filter based on class ability level
  const adjustedCcssGrade = (() => {
    if (['Lily', 'Camellia'].includes(englishClass)) return Math.max(0, grade - 2)
    if (['Daisy', 'Sunflower'].includes(englishClass)) return Math.max(0, grade - 1)
    return grade
  })()
  useEffect(() => { if (stdGradeFilter === null) setStdGradeFilter(adjustedCcssGrade) }, [adjustedCcssGrade])

  // Map our app domains to CCSS domain codes
  const DOMAIN_TO_CCSS: Record<string, string[]> = {
    reading: ['RL', 'RI'], phonics: ['RF'], writing: ['W'],
    speaking: ['SL'], language: ['L'], all: [],
  }

  const filteredStds = stdSearch.length >= 2 ? ccssStandards.filter(s => {
    if (standards.includes(s.code)) return false
    if (stdGradeFilter !== null && s.grade !== stdGradeFilter) return false
    if (stdDomainFilter !== 'all' && DOMAIN_TO_CCSS[stdDomainFilter] && !DOMAIN_TO_CCSS[stdDomainFilter].includes(s.domain)) return false
    return s.code.toLowerCase().includes(stdSearch.toLowerCase()) || s.text?.toLowerCase().includes(stdSearch.toLowerCase())
  }).slice(0, 8) : []

  const otherClasses = ENGLISH_CLASSES.filter((c: any) => c !== englishClass)

  const handleSave = async (enterScores = false) => {
    if (!name.trim()) return; setSaving(true)
    const stdTags = standards.map(code => { const s = ccssStandards.find(x => x.code === code); return { code, dok: s?.dok || 0, description: s?.text || '' } })
    // If using sections, merge section standards into stdTags and auto-calc max_score
    const finalSections = useSections && sections.length > 0 ? sections : null
    const finalMaxScore = finalSections ? finalSections.reduce((s, sec) => s + sec.max_points, 0) : maxScore
    // Merge section standards into the assessment-level standards
    const sectionStds = (finalSections || []).map(s => s.standard).filter(s => s && !standards.includes(s))
    const allStdTags = [...stdTags, ...sectionStds.map(code => { const s = ccssStandards.find(x => x.code === code); return { code, dok: s?.dok || 0, description: s?.text || '' } })]
    const basePayload = { name: name.trim(), domain: selDomain, max_score: finalMaxScore, grade, type: category, date: date || null, description: notes.trim(), created_by: currentTeacher?.id || null, semester_id: semesterId || null, standards: allStdTags, sections: finalSections }
    if (editing) {
      const { data, error } = await supabase.from('assessments').update({ ...basePayload, english_class: englishClass }).eq('id', editing.id).select().single()
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`); else { showToast(lang === 'ko' ? `"${name}" 수정 완료` : `Updated "${name}"`); onSaved(data) }
    } else {
      const { data, error } = await supabase.from('assessments').insert({ ...basePayload, english_class: englishClass }).select().single()
      if (error) { setSaving(false); showToast(`Error: ${error.message}`); return }
      if (shareClasses.length > 0) {
        const copies = shareClasses.map((cls: string) => ({ ...basePayload, english_class: cls }))
        await supabase.from('assessments').insert(copies)
      }
      setSaving(false)
      if (enterScores && data) {
        setCreatedAssessment(data)
        // Load students for score entry
        const { data: studs } = await supabase.from('students').select('*').eq('english_class', englishClass).eq('grade', grade).eq('is_active', true).order('english_name')
        setScoreStudents(studs || [])
        setScorePhase(true)
        showToast(lang === 'ko' ? `"${name}" 생성됨 — 점수 입력` : `Created "${name}" — enter scores below`)
      } else {
        showToast(lang === 'ko' ? `"${name}" 평가가 생성되었습니다` : `Created "${name}"${shareClasses.length > 0 ? ` (+ ${shareClasses.length} shared)` : ''}`)
        onSaved(data)
      }
    }
  }

  const handleSaveScores = async () => {
    if (!createdAssessment) return
    setSavingScores(true)

    if (createdAssessment.sections && createdAssessment.sections.length > 0) {
      // Section-based: compute total from section scores, store both
      const rows = scoreStudents
        .filter(s => createdAssessment.sections!.some((_: any, si: number) => inlineScores[`${s.id}:${si}`] && inlineScores[`${s.id}:${si}`] !== ''))
        .map(s => {
          const sectionScores: Record<string, number> = {}
          let total = 0
          createdAssessment.sections!.forEach((_: any, si: number) => {
            const v = parseFloat(inlineScores[`${s.id}:${si}`] || '0') || 0
            sectionScores[String(si)] = v
            total += v
          })
          return { student_id: s.id, assessment_id: createdAssessment.id, score: total, section_scores: sectionScores, is_exempt: false }
        })
      if (rows.length > 0) {
        const { error } = await supabase.from('grades').insert(rows)
        if (error) { showToast(`Error: ${error.message}`); setSavingScores(false); return }
      }
      setSavingScores(false)
      showToast(`Saved ${rows.length} section scores`)
    } else {
      // Simple score
      const rows = Object.entries(inlineScores)
        .filter(([, v]) => v !== '')
        .map(([sid, v]) => ({ student_id: sid, assessment_id: createdAssessment.id, score: parseFloat(v), is_exempt: false }))
      if (rows.length > 0) {
        const { error } = await supabase.from('grades').insert(rows)
        if (error) { showToast(`Error: ${error.message}`); setSavingScores(false); return }
      }
      setSavingScores(false)
      showToast(`Saved ${rows.length} scores`)
    }
    onSaved(createdAssessment)
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className={"bg-surface rounded-xl shadow-lg w-full " + (scorePhase ? "max-w-2xl" : "max-w-lg") + " max-h-[90vh] overflow-y-auto"} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-navy">{scorePhase ? `Enter Scores: ${createdAssessment?.name}` : editing ? (lang === 'ko' ? '평가 수정' : 'Edit Assessment') : (lang === 'ko' ? '평가 생성' : 'Create Assessment')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>

        {scorePhase ? (
          <div>
            <div className="px-6 py-2 bg-accent-light border-b border-border">
              <p className="text-[11px] text-navy">{selDomain} · {category} · max {createdAssessment?.max_score || maxScore} pts · {scoreStudents.length} students
                {createdAssessment?.sections && ` · ${createdAssessment.sections.length} sections`}
              </p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {createdAssessment?.sections && createdAssessment.sections.length > 0 ? (
                /* Section-based score entry */
                <table className="w-full text-[12px]">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
                    {createdAssessment.sections.map((sec: any, si: number) => (
                      <th key={si} className="text-center py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold min-w-[60px]">
                        <div>{sec.label}</div>
                        <div className="text-[8px] text-text-tertiary font-normal">/{sec.max_points}{sec.standard ? ` ${sec.standard}` : ''}</div>
                      </th>
                    ))}
                    <th className="text-center py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-14">Total</th>
                    <th className="text-center py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-12">%</th>
                  </tr></thead>
                  <tbody>
                    {scoreStudents.map((s: any, i: number) => {
                      const sectionVals = createdAssessment.sections!.map((_: any, si: number) => parseFloat(inlineScores[`${s.id}:${si}`] || '') || 0)
                      const total = sectionVals.reduce((a: number, b: number) => a + b, 0)
                      const hasAny = createdAssessment.sections!.some((_: any, si: number) => inlineScores[`${s.id}:${si}`] !== '' && inlineScores[`${s.id}:${si}`] !== undefined)
                      const pct = hasAny ? (total / createdAssessment.max_score) * 100 : null
                      return (
                        <tr key={s.id} className="border-b border-border/50">
                          <td className="py-1.5"><span className="font-medium text-[11px]">{s.english_name}</span></td>
                          {createdAssessment.sections!.map((_: any, si: number) => (
                            <td key={si} className="py-1 text-center">
                              <input type="number" min={0} max={createdAssessment.sections![si].max_points} step="any"
                                value={inlineScores[`${s.id}:${si}`] || ''}
                                onChange={e => setInlineScores(prev => ({ ...prev, [`${s.id}:${si}`]: e.target.value }))}
                                data-col={si} data-row={i}
                                onKeyDown={e => {
                                  if (e.key === 'Tab' || e.key === 'Enter') {
                                    e.preventDefault()
                                    const tbl = (e.target as HTMLElement).closest('table')
                                    // Try next section same student
                                    let next = tbl?.querySelector(`input[data-col="${si + 1}"][data-row="${i}"]`) as HTMLInputElement
                                    // If no more sections, go to first section of next student
                                    if (!next) next = tbl?.querySelector(`input[data-col="0"][data-row="${i + 1}"]`) as HTMLInputElement
                                    next?.focus()
                                  }
                                }}
                                className="w-12 px-1 py-1 text-center border border-border rounded text-[11px] outline-none focus:border-navy"
                              />
                            </td>
                          ))}
                          <td className="py-1.5 text-center text-[12px] font-bold text-navy">{hasAny ? total : ''}</td>
                          <td className="py-1.5 text-center text-[11px]">
                            {pct !== null ? <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct.toFixed(0)}%</span> : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                /* Simple single-score entry */
                <table className="w-full text-[13px]">
                  <thead><tr className="border-b border-border">
                    <th className="text-left py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                    <th className="text-left py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
                    <th className="text-center py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-24">Score / {createdAssessment?.max_score || maxScore}</th>
                    <th className="text-center py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-16">%</th>
                  </tr></thead>
                  <tbody>
                    {scoreStudents.map((s: any, i: number) => {
                      const val = inlineScores[s.id] || ''
                      const pct = val !== '' ? ((parseFloat(val) / (createdAssessment?.max_score || maxScore)) * 100) : null
                      return (
                        <tr key={s.id} className="border-b border-border/50">
                          <td className="py-1.5 text-text-tertiary text-[11px]">{i + 1}</td>
                          <td className="py-1.5"><span className="font-medium">{s.english_name}</span> <span className="text-text-tertiary text-[11px] ml-1">{s.korean_name}</span></td>
                          <td className="py-1.5 text-center">
                            <input type="number" min={0} max={createdAssessment?.max_score || maxScore} step="any" value={val}
                              onChange={e => setInlineScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') { const inputs = document.querySelectorAll<HTMLInputElement>('.inline-score-input'); const idx = Array.from(inputs).indexOf(e.target as HTMLInputElement); if (idx >= 0 && idx < inputs.length - 1) { e.preventDefault(); inputs[idx + 1].focus() } } }}
                              className="inline-score-input w-16 px-2 py-1 text-center border border-border rounded text-[13px] outline-none focus:border-navy"
                            />
                          </td>
                          <td className="py-1.5 text-center text-[11px]">
                            {pct !== null ? <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{pct.toFixed(0)}%</span> : ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary">{Object.values(inlineScores).filter(v => v !== '').length} of {scoreStudents.length} entered</span>
              <div className="flex gap-2">
                <button onClick={() => { onSaved(createdAssessment!); }} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">Skip Scores</button>
                <button onClick={handleSaveScores} disabled={savingScores || Object.values(inlineScores).filter(v => v !== '').length === 0}
                  className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
                  {savingScores && <Loader2 size={14} className="animate-spin" />} Save Scores
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div>
        <div className="p-6 space-y-4">
          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '평가 이름' : 'Assessment Name'}</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave() }} placeholder={lang === 'ko' ? '예: Reading Quiz 1' : 'e.g. Reading Quiz 1'} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Domain</label>
              <select value={selDomain} onChange={e => setSelDomain(e.target.value as Domain)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">{DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d][lang]}</option>)}</select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '유형' : 'Category'}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">{ASSESSMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{lang === 'ko' ? c.labelKo : c.label}</option>)}</select>
              <p className="text-[9px] text-text-tertiary mt-1">{ASSESSMENT_CATEGORIES.find(c => c.value === category)?.desc || ''}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '만점' : 'Total Points'}</label>
              <input type="text" inputMode="decimal" value={maxScore || ''} onChange={e => { const v = e.target.value; if (v === '') setMaxScore(0 as any); else { const n = parseFloat(v); if (!isNaN(n)) setMaxScore(n) } }} onBlur={() => { if (!maxScore || maxScore < 1) setMaxScore(10) }} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '날짜' : 'Date'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '메모' : 'Notes'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
            <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={lang === 'ko' ? '평가에 대한 메모...' : 'Notes about this assessment...'} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '표준 (CCSS)' : 'Standards (CCSS)'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
            {standards.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {standards.map(code => {
                  const stdInfo = ccssStandards.find(x => x.code === code)
                  return (
                  <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium cursor-help" title={stdInfo?.text || code}>
                    {code}
                    <button onClick={() => setStandards(prev => prev.filter(c => c !== code))} className="text-navy/50 hover:text-red-500"><X size={10} /></button>
                  </span>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2 mb-1.5">
              <select value={stdGradeFilter ?? adjustedCcssGrade} onChange={e => setStdGradeFilter(e.target.value === '' ? null : Number(e.target.value))}
                className="px-2 py-1 border border-border rounded text-[10px] bg-surface outline-none">
                <option value="">All Grades</option>
                {[0, 1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g === 0 ? 'K' : `Grade ${g}`}</option>)}
              </select>
              <select value={stdDomainFilter} onChange={e => setStdDomainFilter(e.target.value)}
                className="px-2 py-1 border border-border rounded text-[10px] bg-surface outline-none">
                <option value="all">All Domains</option>
                <option value="reading">Reading (RL + RI)</option>
                <option value="phonics">Phonics & Foundational Skills (RF)</option>
                <option value="speaking">Speaking & Listening (SL)</option>
                <option value="writing">Writing (W)</option>
                <option value="language">Language Standards (L)</option>
              </select>
              <span className="text-[9px] text-text-tertiary self-center">Auto: {adjustedCcssGrade === 0 ? 'K' : `Gr ${adjustedCcssGrade}`} for {englishClass}</span>
            </div>
            <div className="relative">
              <input value={stdSearch} onChange={e => setStdSearch(e.target.value)} placeholder={lang === 'ko' ? 'CCSS 코드 검색...' : 'Search CCSS code (e.g. RL.3.1)'}
                className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
              {filteredStds.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {filteredStds.map(s => (
                    <button key={s.code} onClick={() => { setStandards(prev => [...prev, s.code]); setStdSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-alt border-b border-border/50 last:border-0">
                      <span className="text-[11px] font-bold text-navy">{s.code}</span>
                      <span className="text-[9px] text-text-tertiary ml-1.5">{s.cluster}</span>
                      <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-2">{s.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assessment Sections Builder */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button onClick={() => { setUseSections(!useSections); if (!useSections && sections.length === 0) setSections([{ label: 'Section 1', standard: '', max_points: 5 }]) }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-alt hover:bg-surface-alt/80 transition-all">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                Assessment Sections <span className="text-text-tertiary font-normal normal-case">(split into parts with standards)</span>
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${useSections ? 'bg-navy text-white' : 'bg-surface text-text-tertiary border border-border'}`}>
                {useSections ? 'ON' : 'OFF'}
              </span>
            </button>
            {useSections && (
              <div className="p-4 space-y-2">
                {sections.map((sec, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <input value={sec.label} onChange={e => { const ns = [...sections]; ns[si] = { ...ns[si], label: e.target.value }; setSections(ns) }}
                      placeholder="e.g. Q1-3" className="w-24 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy" />
                    <div className="relative flex-1">
                      <input value={sec.standard}
                        onChange={e => { const ns = [...sections]; ns[si] = { ...ns[si], standard: e.target.value }; setSections(ns); setFocusedSection(si) }}
                        onFocus={() => setFocusedSection(si)}
                        onBlur={() => { const ns = [...sections]; ns[si] = { ...ns[si], standard: normalizeCCSS(ns[si].standard) }; setSections(ns); setTimeout(() => setFocusedSection(null), 150) }}
                        placeholder="Standard (e.g. RL.2.1 or rl21)" className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy" />
                      {/* Quick-pick from assessment-level standards */}
                      {!sec.standard && standards.length > 0 && focusedSection !== si && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {standards.filter(code => !sections.some((s, idx) => idx !== si && s.standard === code)).map(code => (
                            <button key={code} onClick={() => { const ns = [...sections]; ns[si] = { ...ns[si], standard: code }; setSections(ns) }}
                              className="px-1.5 py-0.5 rounded bg-navy/8 text-navy text-[9px] font-medium hover:bg-navy/15 transition-colors">{code}</button>
                          ))}
                        </div>
                      )}
                      {focusedSection === si && sec.standard.length >= 2 && (() => {
                        const normalized = normalizeCCSS(sec.standard)
                        const matches = ccssStandards.filter(s => s.code.toLowerCase().includes(normalized.toLowerCase()) || s.code.toLowerCase().includes(sec.standard.toLowerCase())).filter(s => s.code !== sec.standard).slice(0, 4)
                        if (matches.length === 0) return null
                        return (
                          <div className="absolute left-0 right-0 top-full mt-0.5 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-32 overflow-y-auto">
                            {matches.map(s => (
                              <button key={s.code} onMouseDown={e => e.preventDefault()} onClick={() => { const ns = [...sections]; ns[si] = { ...ns[si], standard: s.code }; setSections(ns); setFocusedSection(null) }}
                                className="w-full text-left px-2 py-1.5 hover:bg-surface-alt text-[10px] border-b border-border/50 last:border-0">
                                <span className="font-bold text-navy">{s.code}</span>
                                <span className="text-text-tertiary ml-1.5 line-clamp-1">{s.description}</span>
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" min={1} value={sec.max_points} onChange={e => { const ns = [...sections]; ns[si] = { ...ns[si], max_points: parseInt(e.target.value) || 1 }; setSections(ns) }}
                        className="w-12 px-1.5 py-1.5 border border-border rounded-lg text-[11px] text-center outline-none focus:border-navy" />
                      <span className="text-[9px] text-text-tertiary">pts</span>
                    </div>
                    <button onClick={() => setSections(sections.filter((_, i) => i !== si))} className="p-1 text-text-tertiary hover:text-red-500"><X size={12} /></button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => setSections([...sections, { label: `Section ${sections.length + 1}`, standard: '', max_points: 5 }])}
                    className="inline-flex items-center gap-1 text-[10px] text-navy font-medium hover:text-navy-dark"><Plus size={11} /> Add Section</button>
                  <span className="text-[10px] text-text-tertiary font-semibold">
                    Total: {sections.reduce((s, sec) => s + sec.max_points, 0)} pts
                  </span>
                </div>
                <p className="text-[9px] text-text-tertiary">Each section's score is tracked separately. Total points auto-calculated from sections. Standards mastery is tracked per-section.</p>
              </div>
            )}
          </div>

          {!editing && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">Share with Other Classes</label>
              <div className="flex flex-wrap gap-2">
                {otherClasses.map((cls: any) => (
                  <label key={cls} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border transition-all ${shareClasses.includes(cls) ? 'border-navy bg-navy/10 text-navy' : 'border-border text-text-tertiary hover:bg-surface-alt'}`}>
                    <input type="checkbox" checked={shareClasses.includes(cls)} onChange={() => setShareClasses((prev: string[]) => prev.includes(cls) ? prev.filter((c: string) => c !== cls) : [...prev, cls])} className="sr-only" />
                    <span className="w-3 h-3 rounded-sm border flex items-center justify-center" style={{ borderColor: shareClasses.includes(cls) ? classToTextColor(cls as EnglishClass) : '#d1d5db', backgroundColor: shareClasses.includes(cls) ? classToTextColor(cls as EnglishClass) : 'transparent' }}>
                      {shareClasses.includes(cls) && <span className="text-white text-[8px]">✓</span>}
                    </span>
                    {cls}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">Same assessment will be created in checked classes (each enters scores separately).</p>
            </div>
          )}
          <div className="bg-accent-light rounded-lg px-4 py-3"><p className="text-[12px] text-navy"><strong>Grade {grade} · {englishClass}{shareClasses.length > 0 ? ` + ${shareClasses.join(', ')}` : ''}</strong></p></div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">{lang === 'ko' ? '취소' : 'Cancel'}</button>
          {!editing && (
            <button onClick={() => handleSave(true)} disabled={saving || !name.trim()} className="px-4 py-2 rounded-lg text-[13px] font-medium bg-gold text-navy-dark hover:bg-gold-light disabled:opacity-40 flex items-center gap-1.5">
              {saving && <Loader2 size={14} className="animate-spin" />} Create & Enter Scores
            </button>
          )}
          <button onClick={() => handleSave(false)} disabled={saving || !name.trim()} className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} {editing ? (lang === 'ko' ? '수정' : 'Update') : (lang === 'ko' ? '생성' : 'Create')}
          </button>
        </div>
        </div>
        )}
      </div>
    </div>
  )
}

// ─── Cross-Class Comparison ────────────────────────────────────────
function CrossClassCompare({ assessmentName, domain, maxScore, currentClass, grade, semesterId }: {
  assessmentName: string; domain: string; maxScore: number; currentClass: string; grade: number; semesterId: string
}) {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<{ cls: string; avg: number; count: number }[]>([])
  const [loading, setLoading] = useState(false)

  const loadComparison = async () => {
    if (show) { setShow(false); return }
    setLoading(true)
    // Find assessments with same name, domain, grade across other classes
    const { data: matches } = await supabase.from('assessments').select('id, english_class')
      .eq('name', assessmentName).eq('domain', domain).eq('grade', grade).eq('semester_id', semesterId)
      .neq('english_class', currentClass)
    if (!matches || matches.length === 0) { setData([]); setShow(true); setLoading(false); return }
    const ids = matches.map(m => m.id)
    const { data: grades } = await supabase.from('grades').select('score, assessment_id').in('assessment_id', ids).not('score', 'is', null)
    const byClass: Record<string, number[]> = {}
    matches.forEach(m => { byClass[m.english_class] = [] })
    grades?.forEach((g: any) => {
      const m = matches.find(mm => mm.id === g.assessment_id)
      if (m && byClass[m.english_class]) byClass[m.english_class].push((g.score / maxScore) * 100)
    })
    setData(Object.entries(byClass).map(([cls, scores]) => ({
      cls, avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0, count: scores.length,
    })).sort((a, b) => b.avg - a.avg))
    setShow(true); setLoading(false)
  }

  return (
    <div className="relative">
      <button onClick={loadComparison} className="text-[10px] px-2 py-1 rounded-lg border border-border text-text-secondary hover:bg-surface-alt font-medium flex items-center gap-1">
        {loading ? <Loader2 size={10} className="animate-spin" /> : <BarChart3 size={10} />} Compare
      </button>
      {show && (
        <div className="absolute right-0 top-8 bg-surface border border-border rounded-xl shadow-lg z-50 w-56 p-3">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-2">Same assessment in other classes</p>
          {data.length === 0 ? <p className="text-[11px] text-text-tertiary italic">Not shared with other classes</p> :
          <div className="space-y-1.5">{data.map(d => (
            <div key={d.cls} className="flex items-center justify-between">
              <span className="text-[11px] font-medium" style={{ color: classToTextColor(d.cls as EnglishClass) }}>{d.cls}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(d.avg, 100)}%`, backgroundColor: classToColor(d.cls as EnglishClass) }} /></div>
                <span className="text-[11px] font-bold text-navy">{d.avg.toFixed(1)}%</span>
                <span className="text-[9px] text-text-tertiary">n={d.count}</span>
              </div>
            </div>
          ))}</div>}
        </div>
      )}
    </div>
  )
}

// ─── #33 Assessment Calendar / Pacing View ────────────────────────────

function AssessmentCalendarView({ allAssessments, lang }: { allAssessments: Assessment[]; lang: LangKey }) {
  const DOMAINS: Domain[] = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const DOMAIN_COLORS: Record<string, string> = { reading: '#3B82F6', phonics: '#8B5CF6', writing: '#F59E0B', speaking: '#22C55E', language: '#EC4899' }
  const DOMAIN_LABELS: Record<string, string> = { reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards' }

  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = Number(month.split('-')[0])
  const mon = Number(month.split('-')[1]) - 1
  const firstDay = new Date(year, mon, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const monthLabel = new Date(year, mon, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => { const d = new Date(year, mon - 1, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setSelectedDate(null) }
  const nextMonth = () => { const d = new Date(year, mon + 1, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setSelectedDate(null) }

  // Map assessments by date
  const byDate: Record<string, Assessment[]> = {}
  allAssessments.filter(a => a.date).forEach(a => {
    if (!byDate[a.date!]) byDate[a.date!] = []
    byDate[a.date!].push(a)
  })

  // Domain coverage gaps
  const domainDates: Record<string, string> = {}
  allAssessments.filter(a => a.date).sort((a, b) => a.date!.localeCompare(b.date!)).forEach(a => { domainDates[a.domain] = a.date! })
  const now = new Date()
  const gaps = DOMAINS.filter(d => {
    const last = domainDates[d]
    if (!last) return true
    return (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24) > 42
  })

  // Domain counts for distribution
  const domainCounts: Record<string, number> = {}
  DOMAINS.forEach(d => { domainCounts[d] = allAssessments.filter(a => a.domain === d).length })
  const totalAssessments = allAssessments.length || 1

  // Selected date details
  const selectedAssessments = selectedDate ? (byDate[selectedDate] || []) : []

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)
  while (calendarDays.length % 7 !== 0) calendarDays.push(null)

  return (
    <div className="px-10 py-6 space-y-4">
      {/* Domain distribution bar */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-[12px] font-semibold text-navy mb-3">Assessment Distribution by Domain</h3>
        <div className="flex h-6 rounded-full overflow-hidden mb-2">
          {DOMAINS.map(d => {
            const pct = (domainCounts[d] / totalAssessments) * 100
            return pct > 0 ? <div key={d} style={{ width: `${pct}%`, backgroundColor: DOMAIN_COLORS[d] }} className="transition-all" title={`${DOMAIN_LABELS[d]}: ${domainCounts[d]} (${pct.toFixed(0)}%)`} /> : null
          })}
        </div>
        <div className="flex gap-4 text-[9px]">
          {DOMAINS.map(d => (
            <span key={d} className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
              {DOMAIN_LABELS[d]}: {domainCounts[d]}
            </span>
          ))}
        </div>
      </div>

      {/* Coverage gaps */}
      {gaps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800">
          <span className="font-bold">Coverage gap: </span>
          {gaps.map(d => DOMAIN_LABELS[d]).join(', ')} {gaps.length === 1 ? 'has' : 'have'} not been assessed in over 6 weeks.
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-surface-alt border-b border-border flex items-center justify-between">
          <button onClick={prevMonth} className="px-2 py-1 rounded hover:bg-border text-text-secondary text-[13px]">&larr;</button>
          <h3 className="text-[14px] font-bold text-navy">{monthLabel}</h3>
          <button onClick={nextMonth} className="px-2 py-1 rounded hover:bg-border text-text-secondary text-[13px]">&rarr;</button>
        </div>
        <div className="grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-1.5 text-center text-[9px] font-semibold text-text-tertiary uppercase border-b border-border bg-surface-alt/50">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e${i}`} className="min-h-[72px] border-b border-r border-border/30 bg-surface-alt/20" />
            const dateStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayAssessments = byDate[dateStr] || []
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            const isSelected = dateStr === selectedDate
            const isWeekend = i % 7 === 0 || i % 7 === 6
            return (
              <div key={dateStr} onClick={() => dayAssessments.length > 0 ? setSelectedDate(isSelected ? null : dateStr) : null}
                className={`min-h-[72px] border-b border-r border-border/30 p-1 transition-all ${
                  isSelected ? 'bg-navy/5 ring-1 ring-navy/30' : dayAssessments.length > 0 ? 'cursor-pointer hover:bg-surface-alt' : ''
                } ${isWeekend ? 'bg-surface-alt/30' : ''}`}>
                <span className={`text-[10px] font-medium ${isToday ? 'bg-navy text-white px-1.5 py-0.5 rounded-full' : 'text-text-secondary'}`}>{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {dayAssessments.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center gap-1 rounded px-1 py-0.5" style={{ backgroundColor: `${DOMAIN_COLORS[a.domain]}10` }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_COLORS[a.domain] }} />
                      <span className="text-[8px] font-medium text-text-primary truncate leading-tight">{a.name}</span>
                    </div>
                  ))}
                  {dayAssessments.length > 3 && <span className="text-[8px] text-text-tertiary px-1">+{dayAssessments.length - 3} more</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected date detail panel */}
      {selectedDate && selectedAssessments.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <h4 className="text-[12px] font-bold text-navy mb-2">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>
          <div className="space-y-2">
            {selectedAssessments.map(a => (
              <div key={a.id} className="flex items-center gap-3 bg-surface-alt/50 rounded-lg px-3 py-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_COLORS[a.domain] }} />
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-semibold text-text-primary">{a.name}</span>
                  <span className="text-[10px] text-text-tertiary ml-2">{DOMAIN_LABELS[a.domain]} · {a.type || 'formative'} · /{a.max_score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month summary */}
      {(() => {
        const monthAssessments = allAssessments.filter(a => a.date?.startsWith(month))
        if (monthAssessments.length === 0) return <p className="text-center text-text-tertiary text-[12px] py-4">No assessments this month.</p>
        const byDom: Record<string, number> = {}
        monthAssessments.forEach(a => { byDom[a.domain] = (byDom[a.domain] || 0) + 1 })
        return (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">This Month: {monthAssessments.length} assessments</h4>
            <div className="flex gap-3 flex-wrap">
              {DOMAINS.filter(d => byDom[d]).map(d => (
                <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${DOMAIN_COLORS[d]}15`, color: DOMAIN_COLORS[d] }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
                  {DOMAIN_LABELS[d]}: {byDom[d]}
                </span>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── #36 Rubric Builder and Library ───────────────────────────────────

// ─── Rubric Scoring Modal (Bulk) ──────────────────────────────────
// Full-class rubric scoring: student sidebar + rubric grid + auto-fill scores


// Uses LEVEL_COLORS and LEVEL_LABELS from scoring-rubrics.ts

// ─── Rubric Picker ──────────────────────────────────────────────────
function RubricPicker({ grade, domain, onSelect }: { grade: number; domain: string; onSelect: (idx: number) => void }) {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)

  const filtered = SCORING_RUBRICS.map((r, i) => ({ ...r, idx: i })).filter(r => {
    if (filterCat !== 'all' && r.category !== filterCat) return false
    if (search) {
      const q = search.toLowerCase()
      return r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q) || r.criteria.some(c => c.label.toLowerCase().includes(q))
    }
    return true
  })

  // Sort: grade match first, then alphabetical
  filtered.sort((a, b) => {
    const aMatch = a.grades.includes(grade) ? 0 : 1
    const bMatch = b.grades.includes(grade) ? 0 : 1
    if (aMatch !== bMatch) return aMatch - bMatch
    return a.name.localeCompare(b.name)
  })

  const previewRubric = previewIdx != null ? SCORING_RUBRICS[previewIdx] : null

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: Search + List */}
      <div className={`${previewRubric ? 'w-1/2' : 'w-full'} flex flex-col border-r border-border`}>
        <div className="p-4 border-b border-border space-y-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rubrics by name or topic..."
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setFilterCat('all')}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${filterCat === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
              All ({SCORING_RUBRICS.length})
            </button>
            {RUBRIC_CATEGORIES.map(cat => {
              const count = SCORING_RUBRICS.filter(r => r.category === cat).length
              return (
                <button key={cat} onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${filterCat === cat ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {filtered.length === 0 && <p className="text-center text-text-tertiary text-[12px] py-8">No rubrics match your search.</p>}
          {filtered.map(r => {
            const isGradeMatch = r.grades.includes(grade)
            const isPreviewing = previewIdx === r.idx
            return (
              <div key={r.idx}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all border ${
                  isPreviewing ? 'bg-purple-50 border-purple-200' : isGradeMatch ? 'bg-surface border-border hover:border-navy/30 hover:bg-surface-alt/50' : 'bg-surface/60 border-border/50 hover:border-border hover:bg-surface-alt/30 opacity-70 hover:opacity-100'
                }`}>
                <div className="flex-1 min-w-0" onClick={() => setPreviewIdx(isPreviewing ? null : r.idx)}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isGradeMatch ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-500'}`}>
                      Gr {r.grades.join(',')}
                    </span>
                    <span className="text-[8px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">{r.category}</span>
                    <span className="text-[8px] text-text-tertiary">{r.criteria.length} criteria</span>
                  </div>
                  <h4 className="text-[12px] font-semibold text-navy leading-tight truncate">{r.name}</h4>
                  <p className="text-[9px] text-text-tertiary mt-0.5 truncate">{r.criteria.map(c => c.label).join(' · ')}</p>
                </div>
                <button onClick={() => onSelect(r.idx)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy-dark shrink-0">
                  Use
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right: Preview panel */}
      {previewRubric && (
        <div className="w-1/2 overflow-y-auto p-5 bg-surface-alt/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-navy">{previewRubric.name}</h3>
              <p className="text-[10px] text-text-tertiary">{previewRubric.category} · Grades {previewRubric.grades.join(', ')} · {previewRubric.criteria.length} criteria</p>
            </div>
            <button onClick={() => { if (previewIdx != null) onSelect(previewIdx) }}
              className="px-4 py-2 rounded-xl text-[11px] font-semibold bg-navy text-white hover:bg-navy-dark">
              Use This Rubric
            </button>
          </div>
          <div className="space-y-2">
            {previewRubric.criteria.map((c, ci) => (
              <div key={ci} className="bg-surface border border-border rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-bold text-navy shrink-0">{ci + 1}.</span>
                  <div>
                    <h4 className="text-[12px] font-bold text-navy">{c.label}</h4>
                    {c.description && <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">{c.description}</p>}
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-3 p-3 bg-surface-alt rounded-lg">
              <p className="text-[10px] text-text-secondary">Each criterion is scored 1–4:</p>
              <div className="flex gap-2 mt-1.5">
                {LEVEL_LABELS.map((lvl, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded text-[9px] font-medium border ${LEVEL_COLORS[i]}`}>{i + 1} = {lvl}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RubricScoringModal({ students, existingScores, maxScore, domain, grade, assessmentId, onApplyScores, onClose }: {
  students: { id: string; english_name: string; korean_name: string }[]
  existingScores: Record<string, number | null>
  maxScore: number
  domain: string
  grade: number
  assessmentId?: string
  onApplyScores: (scores: Record<string, number>, rubricMax?: number) => void
  onClose: () => void
}) {
  // Auto-select the same rubric used last time for this assessment
  const [selectedRubric, setSelectedRubric] = useState<number | null>(() => {
    if (assessmentId && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`daewoo_rubric_${assessmentId}`)
      if (saved != null) return Number(saved)
    }
    return null
  })
  const [activeStudentIdx, setActiveStudentIdx] = useState(0)
  // Per-student scores: { studentId: number[] (one per criterion) }
  const [allScores, setAllScores] = useState<Record<string, number[]>>({})

  const rubric = selectedRubric != null ? SCORING_RUBRICS[selectedRubric] : null
  const activeStudent = students[activeStudentIdx]
  const studentScores = activeStudent ? (allScores[activeStudent.id] || []) : []
  const studentTotal = studentScores.reduce((s, v) => s + v, 0)
  const maxTotal = rubric ? rubric.criteria.length * 4 : 0

  const setStudentScore = (criterionIdx: number, value: number) => {
    if (!activeStudent || !rubric) return
    const current = allScores[activeStudent.id] || new Array(rubric.criteria.length).fill(0)
    const updated = [...current]
    updated[criterionIdx] = value
    setAllScores(prev => ({ ...prev, [activeStudent.id]: updated }))
  }

  const getStudentTotal = (sid: string) => {
    const sc = allScores[sid]
    return sc ? sc.reduce((s, v) => s + v, 0) : null
  }

  const scoredCount = Object.keys(allScores).filter(sid => {
    const sc = allScores[sid]
    return sc && sc.length > 0 && sc.every(v => v > 0)
  }).length

  const handleApply = () => {
    const result: Record<string, number> = {}
    Object.entries(allScores).forEach(([sid, sc]) => {
      if (sc && sc.length > 0 && sc.every(v => v > 0)) {
        result[sid] = sc.reduce((s, v) => s + v, 0)
      }
    })
    onApplyScores(result, maxTotal || undefined)
    onClose()
  }

  const goNext = () => { if (activeStudentIdx < students.length - 1) setActiveStudentIdx(activeStudentIdx + 1) }
  const goPrev = () => { if (activeStudentIdx > 0) setActiveStudentIdx(activeStudentIdx - 1) }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-navy">Score with Rubric</h2>
            <p className="text-[11px] text-text-secondary">{scoredCount}/{students.length} students scored{rubric ? ` · ${rubric.category} › ${rubric.name}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            {rubric && <button onClick={() => setSelectedRubric(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border text-text-secondary hover:bg-surface-alt">Change Rubric</button>}
            {rubric && <button onClick={handleApply} disabled={scoredCount === 0}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              Apply {scoredCount} Score{scoredCount !== 1 ? 's' : ''}
            </button>}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
          </div>
        </div>

        {!rubric ? (
          /* Rubric Selection - searchable with category filter and preview */
          <RubricPicker grade={grade} domain={domain} onSelect={(idx) => {
            setSelectedRubric(idx)
            if (assessmentId && typeof window !== 'undefined') localStorage.setItem(`daewoo_rubric_${assessmentId}`, String(idx))
          }} />
        ) : (
          /* Scoring Interface: Sidebar + Rubric Grid */
          <div className="flex flex-1 overflow-hidden">
            {/* Student Sidebar */}
            <div className="w-52 shrink-0 border-r border-border overflow-y-auto bg-surface-alt/30">
              <div className="p-2 space-y-0.5">
                {students.map((s, i) => {
                  const total = getStudentTotal(s.id)
                  const isComplete = total != null && allScores[s.id]?.every(v => v > 0)
                  const isActive = i === activeStudentIdx
                  return (
                    <button key={s.id} onClick={() => setActiveStudentIdx(i)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all flex items-center gap-2 ${
                        isActive ? 'bg-navy text-white' : 'hover:bg-surface-alt text-text-primary'
                      }`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${
                        isComplete ? (isActive ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700') :
                        total != null ? (isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700') :
                        (isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400')
                      }`}>
                        {isComplete ? '✓' : total != null ? '~' : (i + 1)}
                      </span>
                      <span className="truncate font-medium">{s.english_name}</span>
                      {total != null && <span className={`ml-auto text-[10px] shrink-0 ${isActive ? 'text-white/70' : 'text-text-tertiary'}`}>{total}</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Main Scoring Area */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeStudent && (
                <>
                  {/* Student header + nav */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button onClick={goPrev} disabled={activeStudentIdx === 0} className="p-1.5 rounded-lg border border-border hover:bg-surface-alt disabled:opacity-30"><ChevronDown size={14} className="rotate-90" /></button>
                      <div>
                        <h3 className="text-[15px] font-bold text-navy">{activeStudent.english_name} <span className="text-text-tertiary font-normal">{activeStudent.korean_name}</span></h3>
                        <p className="text-[10px] text-text-tertiary">Student {activeStudentIdx + 1} of {students.length}</p>
                      </div>
                      <button onClick={goNext} disabled={activeStudentIdx === students.length - 1} className="p-1.5 rounded-lg border border-border hover:bg-surface-alt disabled:opacity-30"><ChevronDown size={14} className="-rotate-90" /></button>
                    </div>
                    <div className="text-right">
                      <div className="text-[28px] font-bold text-navy">{studentTotal}<span className="text-[15px] text-text-tertiary">/{maxTotal}</span></div>
                      <div className="text-[11px] text-text-secondary">{maxTotal > 0 ? Math.round((studentTotal / maxTotal) * 100) : 0}%</div>
                    </div>
                  </div>

                  {/* Level legend */}
                  <div className="flex gap-2 mb-3">
                    {LEVEL_LABELS.map((l, i) => (
                      <span key={i} className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${LEVEL_COLORS[i].split(' ').slice(0, 2).join(' ')}`}>{i + 1} = {l}</span>
                    ))}
                  </div>

                  {/* Criteria Grid */}
                  <div className="space-y-2.5">
                    {rubric.criteria.map((c, ci) => (
                      <div key={ci} className="bg-surface-alt/40 border border-border rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-navy">{c.label}</p>
                        <p className="text-[9px] text-text-tertiary mb-2">{c.description}</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map(v => (
                            <button key={v} onClick={() => setStudentScore(ci, v)}
                              className={`py-2 px-1 rounded-lg border-2 text-center transition-all ${
                                studentScores[ci] === v ? LEVEL_COLORS[v - 1] + ' ring-2 shadow-sm' : 'bg-surface border-border text-text-tertiary hover:bg-surface-alt'
                              }`}>
                              <div className="text-[15px] font-bold">{v}</div>
                              <div className="text-[8px] leading-tight mt-0.5">{LEVEL_LABELS[v - 1]}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Auto-advance to next unscored */}
                  {studentScores.length === rubric.criteria.length && studentScores.every(v => v > 0) && activeStudentIdx < students.length - 1 && (
                    <div className="mt-4 flex justify-end">
                      <button onClick={goNext} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold bg-gold text-navy-dark hover:bg-gold-light">
                        Next Student →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



// ─── #46 Assessment Item Analysis ─────────────────────────────────────

function ItemAnalysisView({ allAssessments, students }: { allAssessments: Assessment[]; students: any[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scores, setScores] = useState<{ student: string; score: number }[]>([])
  const [loading, setLoading] = useState(false)

  const selected = allAssessments.find(a => a.id === selectedId)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true);
    (async () => {
      const { data } = await supabase.from('grades').select('student_id, score').eq('assessment_id', selectedId).not('score', 'is', null)
      if (data) {
        setScores(data.map(g => {
          const st = students.find(s => s.id === g.student_id)
          return { student: st?.english_name || 'Unknown', score: g.score }
        }).sort((a, b) => a.score - b.score))
      }
      setLoading(false)
    })()
  }, [selectedId])

  return (
    <div className="px-10 py-6 space-y-4">
      <div>
        <label className="text-[10px] font-semibold text-text-secondary uppercase mb-1 block">Select Assessment</label>
        <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value || null)}
          className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface outline-none w-full max-w-md">
          <option value="">Choose an assessment...</option>
          {allAssessments.map(a => <option key={a.id} value={a.id}>{a.name} ({a.domain}, /{a.max_score})</option>)}
        </select>
      </div>

      {loading && <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>}

      {selected && !loading && scores.length > 0 && (() => {
        const max = selected.max_score
        const vals = scores.map(s => s.score)
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length
        const median = vals.length % 2 === 0 ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2 : vals[Math.floor(vals.length / 2)]
        const stdDev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
        const pctArr = vals.map(v => (v / max) * 100)
        const passing = pctArr.filter(p => p >= 60).length
        const proficient = pctArr.filter(p => p >= 80).length

        // Score distribution buckets
        const buckets = [0, 0, 0, 0, 0] // 0-20, 20-40, 40-60, 60-80, 80-100
        pctArr.forEach(p => { const idx = Math.min(4, Math.floor(p / 20)); buckets[idx]++ })
        const maxBucket = Math.max(...buckets, 1)

        return (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Mean', value: `${mean.toFixed(1)}/${max}`, sub: `${((mean / max) * 100).toFixed(0)}%` },
                { label: 'Median', value: `${median}/${max}`, sub: `${((median / max) * 100).toFixed(0)}%` },
                { label: 'Std Dev', value: stdDev.toFixed(1), sub: `${((stdDev / max) * 100).toFixed(0)}% of max` },
                { label: 'Passing (60%+)', value: `${passing}/${vals.length}`, sub: `${Math.round((passing / vals.length) * 100)}%` },
                { label: 'Proficient (80%+)', value: `${proficient}/${vals.length}`, sub: `${Math.round((proficient / vals.length) * 100)}%` },
              ].map(stat => (
                <div key={stat.label} className="bg-surface border border-border rounded-xl p-3 text-center">
                  <p className="text-[9px] font-semibold text-text-tertiary uppercase">{stat.label}</p>
                  <p className="text-[16px] font-bold text-navy">{stat.value}</p>
                  <p className="text-[10px] text-text-secondary">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Distribution chart */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <h3 className="text-[12px] font-semibold text-navy mb-3">Score Distribution</h3>
              <div className="flex items-end gap-2 h-24">
                {['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'].map((label, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-text-secondary mb-1">{buckets[i]}</span>
                    <div className="w-full rounded-t" style={{
                      height: `${(buckets[i] / maxBucket) * 80}px`,
                      backgroundColor: i < 2 ? '#ef4444' : i === 2 ? '#f59e0b' : i === 3 ? '#3b82f6' : '#22c55e',
                      minHeight: buckets[i] > 0 ? '4px' : '0',
                    }} />
                    <span className="text-[8px] text-text-tertiary mt-1">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Students needing reteach (below 60%) */}
            {(() => {
              const needsReteach = scores.filter(s => (s.score / max) * 100 < 61)
              const approaching = scores.filter(s => { const p = (s.score / max) * 100; return p >= 61 && p < 71 })
              if (needsReteach.length === 0 && approaching.length === 0) return null
              return (
                <div className="bg-surface border border-border rounded-xl p-4">
                  <h3 className="text-[12px] font-semibold text-navy mb-3">Action Items</h3>
                  {needsReteach.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Below Standard (0-60%) — Needs Reteaching ({needsReteach.length})</p>
                      <p className="text-[11px] text-text-secondary">{needsReteach.map(s => `${s.student} (${s.score}/${max})`).join(', ')}</p>
                    </div>
                  )}
                  {approaching.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">Approaching Standard (61-70%) — Monitor ({approaching.length})</p>
                      <p className="text-[11px] text-text-secondary">{approaching.map(s => `${s.student} (${s.score}/${max})`).join(', ')}</p>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Student scores ranked */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-surface-alt border-b border-border">
                <span className="text-[11px] font-semibold text-navy">Individual Scores (ranked)</span>
              </div>
              <div className="px-4 py-2 grid grid-cols-3 gap-1">
                {scores.map((s, i) => {
                  const pct = (s.score / max) * 100
                  return (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-[10px] text-text-secondary w-20 truncate">{s.student}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${pct}%`,
                          backgroundColor: pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#ef4444',
                        }} />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right">{s.score}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── #42 Assessment Blueprint ─────────────────────────────────────────

function AssessmentBlueprintView() {
  const { currentTeacher, showToast } = useApp()
  const [blueprints, setBlueprints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', domain: 'reading', type: 'summative', standards: '', dok_levels: '1,2',
    item_count: 10, time_minutes: 30, format_notes: '',
  })

  const DOK_LABELS: Record<string, string> = { '1': 'Recall', '2': 'Skill/Concept', '3': 'Strategic Thinking', '4': 'Extended Thinking' }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('assessment_blueprints').select('*').order('created_at', { ascending: false })
      setBlueprints(data || [])
      setLoading(false)
    })()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('assessment_blueprints').insert({
      name: form.name.trim(), domain: form.domain, assessment_type: form.type,
      standards: form.standards.split(',').map(s => s.trim()).filter(Boolean),
      dok_levels: form.dok_levels.split(',').map(s => s.trim()).filter(Boolean),
      item_count: form.item_count, time_minutes: form.time_minutes,
      format_notes: form.format_notes.trim() || null,
      created_by: currentTeacher.id,
    }).select().single()
    if (error) { showToast('Error saving'); return }
    if (data) setBlueprints(prev => [data, ...prev])
    setForm({ name: '', domain: 'reading', type: 'summative', standards: '', dok_levels: '1,2', item_count: 10, time_minutes: 30, format_notes: '' })
    setShowForm(false)
    showToast('Blueprint saved')
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="px-10 py-6 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-[11px] text-blue-800">
        Assessment blueprints help plan assessments before creating them. Define which standards, DOK levels, item counts, and time constraints each assessment should target.
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px] text-text-secondary">{blueprints.length} blueprints</span>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white">{showForm ? 'Cancel' : '+ New Blueprint'}</button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Assessment name"
              className="col-span-2 px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
            <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {['reading', 'phonics', 'writing', 'speaking', 'language'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              <option value="formative">Formative</option>
              <option value="summative">Summative</option>
              <option value="performance_task">Performance Task</option>
            </select>
            <input type="number" value={form.item_count} onChange={e => setForm(f => ({ ...f, item_count: +e.target.value }))} placeholder="# items"
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
            <input type="number" value={form.time_minutes} onChange={e => setForm(f => ({ ...f, time_minutes: +e.target.value }))} placeholder="Minutes"
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
            <input value={form.dok_levels} onChange={e => setForm(f => ({ ...f, dok_levels: e.target.value }))} placeholder="DOK levels (1,2,3)"
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
          </div>
          <input value={form.standards} onChange={e => setForm(f => ({ ...f, standards: e.target.value }))} placeholder="Standards (comma-separated: RL.3.1, RL.3.2)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
          <textarea value={form.format_notes} onChange={e => setForm(f => ({ ...f, format_notes: e.target.value }))} placeholder="Format notes (e.g., multiple choice, short answer, oral response...)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-14" />
          <button onClick={handleAdd} disabled={!form.name.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white disabled:opacity-40">Save Blueprint</button>
        </div>
      )}

      <div className="space-y-2">
        {blueprints.map(bp => (
          <div key={bp.id} className="bg-surface border border-border rounded-xl px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase">{bp.domain}</span>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-surface-alt text-text-secondary uppercase">{bp.assessment_type}</span>
              <span className="text-[10px] text-text-tertiary ml-auto">{new Date(bp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <h3 className="text-[14px] font-semibold text-navy">{bp.name}</h3>
            <div className="flex gap-4 mt-2 text-[10px] text-text-secondary">
              <span>{bp.item_count} items</span>
              <span>{bp.time_minutes} min</span>
              {bp.dok_levels?.length > 0 && <span>DOK: {bp.dok_levels.map((d: string) => `${d} (${DOK_LABELS[d] || d})`).join(', ')}</span>}
            </div>
            {bp.standards?.length > 0 && <p className="text-[10px] text-text-tertiary mt-1">Standards: {bp.standards.join(', ')}</p>}
            {bp.format_notes && <p className="text-[10px] text-text-tertiary mt-1 italic">{bp.format_notes}</p>}
          </div>
        ))}
        {blueprints.length === 0 && <p className="text-center text-text-tertiary py-8 text-[12px]">No blueprints yet.</p>}
      </div>
    </div>
  )
}

// ─── Quick Check (moved from Curriculum) ──────────────────────────────

function getAdjustedGradeQC(studentGrade: number, englishClass: string): number {
  // Must match CurriculumView's getAdjustedGrade exactly
  if (['Lily', 'Camellia'].includes(englishClass)) return Math.max(0, studentGrade - 2)
  if (['Daisy', 'Sunflower'].includes(englishClass)) return Math.max(0, studentGrade - 1)
  return studentGrade // Marigold, Snapdragon = on level
}

function getClustersQC(domain: string, grade: number, ccssData: any[]) {
  if (!ccssData || ccssData.length === 0) return []
  // Map app domain keys to CCSS domain codes
  const DOMAIN_MAP: Record<string, string[]> = {
    reading: ['RL', 'RI'], phonics: ['RF'], writing: ['W'], speaking: ['SL'], language: ['L'],
  }
  const codes = DOMAIN_MAP[domain] || []
  const domainStds = ccssData.filter((s: any) => codes.includes(s.domain) && s.grade === grade)
  const clusters: Record<string, any[]> = {}
  domainStds.forEach((s: any) => {
    const cl = s.cluster || 'General'
    if (!clusters[cl]) clusters[cl] = []
    clusters[cl].push(s)
  })
  return Object.entries(clusters).map(([name, standards]) => ({ name, standards }))
}

const QC_OPTIONS_G = [
  { value: 'got_it', emoji: '✓', label: 'Got it', bg: 'bg-green-100', color: 'text-green-700' },
  { value: 'almost', emoji: '~', label: 'Almost', bg: 'bg-amber-100', color: 'text-amber-700' },
  { value: 'not_yet', emoji: '✗', label: 'Not yet', bg: 'bg-red-100', color: 'text-red-700' },
]

function QuickCheckView({ students, selectedClass, selectedGrade }: { students: any[]; selectedClass: string; selectedGrade: number }) {
  const { currentTeacher, showToast } = useApp()
  const [selectedStd, setSelectedStd] = useState<string | null>(null)
  const [marks, setMarks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [ccssData, setCcssData] = useState<any[]>([])
  const [showArchive, setShowArchive] = useState(false)
  const [archiveData, setArchiveData] = useState<any[]>([])
  const [filterStd, setFilterStd] = useState('')

  // Load CCSS standards data
  useEffect(() => {
    import('../curriculum/ccss-standards').then(m => {
      if (m.CCSS_STANDARDS) setCcssData(m.CCSS_STANDARDS)
    }).catch(() => {})
  }, [])

  const adj = getAdjustedGradeQC(selectedGrade, selectedClass)
  const allStandards = useMemo(() => {
    if (ccssData.length === 0) return []
    const CCSS_DOMAINS = [
      { key: 'reading', label: 'Reading' }, { key: 'phonics', label: 'Phonics & Foundational Skills' },
      { key: 'writing', label: 'Writing' }, { key: 'speaking', label: 'Speaking & Listening' },
      { key: 'language', label: 'Language Standards' },
    ]
    return CCSS_DOMAINS.flatMap(d => getClustersQC(d.key, adj, ccssData).flatMap(c => c.standards))
  }, [adj, ccssData])

  useEffect(() => {
    if (!selectedStd) return
    ;(async () => {
      const { data } = await supabase.from('quick_checks').select('*').eq('standard_code', selectedStd).eq('english_class', selectedClass).eq('student_grade', selectedGrade).order('created_at', { ascending: false }).limit(50)
      setHistory(data || [])
    })()
  }, [selectedStd, selectedClass, selectedGrade])

  // Load archive (all quick checks for this class/grade)
  useEffect(() => {
    if (!showArchive) return
    ;(async () => {
      const { data } = await supabase.from('quick_checks').select('*').eq('english_class', selectedClass).eq('student_grade', selectedGrade).order('created_at', { ascending: false }).limit(200)
      setArchiveData(data || [])
    })()
  }, [showArchive, selectedClass, selectedGrade])

  const saveQuickCheck = async () => {
    if (!selectedStd || Object.keys(marks).length === 0) return
    setSaving(true)
    const rows = Object.entries(marks).map(([studentId, mark]) => ({
      student_id: studentId, standard_code: selectedStd, english_class: selectedClass, student_grade: selectedGrade, mark, created_by: currentTeacher?.id,
    }))
    const { error } = await supabase.from('quick_checks').insert(rows)
    if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
    showToast(`Quick check saved for ${Object.keys(marks).length} students`)
    setMarks({}); setSaving(false)
    const { data } = await supabase.from('quick_checks').select('*').eq('standard_code', selectedStd).eq('english_class', selectedClass).eq('student_grade', selectedGrade).order('created_at', { ascending: false }).limit(50)
    setHistory(data || [])
  }

  if (showArchive) {
    // Group archive by standard, then by date
    const byStd: Record<string, { time: string; timeLabel: string; got_it: number; almost: number; not_yet: number; ids: string[] }[]> = {}
    const sorted = [...archiveData].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    sorted.forEach((r: any) => {
      const std = r.standard_code
      if (!byStd[std]) byStd[std] = []
      const t = new Date(r.created_at).getTime()
      const last = byStd[std][byStd[std].length - 1]
      if (last && Math.abs(t - new Date(last.time).getTime()) < 2000) {
        last[r.mark as 'got_it' | 'almost' | 'not_yet'] = (last[r.mark as 'got_it' | 'almost' | 'not_yet'] || 0) + 1
        last.ids.push(r.id)
      } else {
        const dt = new Date(r.created_at)
        const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        byStd[std].push({ time: r.created_at, timeLabel: label, got_it: r.mark === 'got_it' ? 1 : 0, almost: r.mark === 'almost' ? 1 : 0, not_yet: r.mark === 'not_yet' ? 1 : 0, ids: [r.id] })
      }
    })

    const allStds = Object.keys(byStd).sort()
    const filteredByStd = filterStd ? { [filterStd]: byStd[filterStd] } : byStd

    const deleteQuickCheckBatch = async (ids: string[]) => {
      if (!confirm(`Delete ${ids.length} quick check record(s)?`)) return
      await supabase.from('quick_checks').delete().in('id', ids)
      setArchiveData(prev => prev.filter((r: any) => !ids.includes(r.id)))
      showToast(`Deleted ${ids.length} records`)
    }

    return (
      <div className="px-2 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-navy">Quick Check Archive</h3>
          <button onClick={() => setShowArchive(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">Back to Quick Check</button>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-text-tertiary" />
            <select value={filterStd} onChange={e => setFilterStd(e.target.value)} className="text-[11px] border border-border rounded-lg px-2 py-1 outline-none">
              <option value="">All Standards</option>
              {allStds.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {Object.keys(filteredByStd).length === 0 ? (
          <p className="text-center text-text-tertiary py-8 text-[12px]">No quick checks recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredByStd).sort(([a], [b]) => a.localeCompare(b)).map(([std, batches]) => (
              <div key={std} className="bg-surface border border-border rounded-xl p-4">
                <h4 className="text-[12px] font-bold text-navy mb-2">{std}</h4>
                <div className="space-y-1">
                  {batches.map((batch, i) => {
                    const total = batch.got_it + batch.almost + batch.not_yet
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-[11px] text-text-tertiary w-28 shrink-0">{batch.timeLabel}</span>
                        <div className="flex-1 flex h-4 rounded-full overflow-hidden bg-surface-alt">
                          {batch.got_it > 0 && <div className="bg-green-400 h-full" style={{ width: `${(batch.got_it / total) * 100}%` }} />}
                          {batch.almost > 0 && <div className="bg-amber-400 h-full" style={{ width: `${(batch.almost / total) * 100}%` }} />}
                          {batch.not_yet > 0 && <div className="bg-red-400 h-full" style={{ width: `${(batch.not_yet / total) * 100}%` }} />}
                        </div>
                        <span className="text-[9px] text-green-600 font-medium w-8">{batch.got_it}</span>
                        <span className="text-[9px] text-amber-600 font-medium w-8">{batch.almost}</span>
                        <span className="text-[9px] text-red-600 font-medium w-8">{batch.not_yet}</span>
                        <button onClick={() => deleteQuickCheckBatch(batch.ids)} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500" title="Delete this batch"><Trash2 size={11} /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-2 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[10px] text-blue-700">
          Quick checks contribute to <strong>standard mastery tracking</strong> in the Curriculum view. They are separate from grades — they show formative progress toward CCSS standards.
        </div>
        <button onClick={() => setShowArchive(true)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">View Archive</button>
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Select a Standard</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
            {allStandards.length === 0 && <p className="p-4 text-[11px] text-text-tertiary">Loading standards...</p>}
            {allStandards.map(std => (
              <button key={std.code} onClick={() => { setSelectedStd(std.code); setMarks({}) }}
                className={`w-full text-left px-4 py-2.5 hover:bg-surface-alt/50 transition-colors ${selectedStd === std.code ? 'bg-navy/5 border-l-2 border-navy' : ''}`}>
                <span className="text-[11px] font-bold text-navy">{std.code}</span>
                <p className="text-[10px] text-text-secondary leading-snug truncate">{std.text}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          {!selectedStd ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Zap size={24} className="mx-auto text-text-tertiary mb-2" />
              <p className="text-[13px] text-text-tertiary">Select a standard to begin a quick check.</p>
              <p className="text-[11px] text-text-tertiary mt-1">3 taps per student, ~90 seconds for 16 students.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-navy/5 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-navy">{selectedStd}</p>
                    <p className="text-[11px] text-text-secondary">{allStandards.find(s => s.code === selectedStd)?.text}</p>
                  </div>
                  <button onClick={saveQuickCheck} disabled={saving || Object.keys(marks).length === 0}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11px] font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save ({Object.keys(marks).length})
                  </button>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {students.map(s => {
                    const m = marks[s.id]
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-surface-alt/30 rounded-lg px-3 py-2">
                        <span className="text-[12px] font-medium text-navy flex-1 truncate">{s.english_name}</span>
                        <div className="flex gap-1">
                          {QC_OPTIONS_G.map(opt => (
                            <button key={opt.value} onClick={() => setMarks(p => ({ ...p, [s.id]: opt.value }))}
                              className={`w-8 h-8 rounded-lg border text-[13px] font-bold transition-all ${m === opt.value ? `${opt.bg} ${opt.color} border-2` : 'bg-surface border-border text-text-tertiary hover:bg-surface-alt'}`}
                              title={opt.label}>{opt.emoji}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {history.length > 0 && (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Recent Quick Checks for {selectedStd}</p>
                  </div>
                  <div className="px-4 py-3 max-h-[180px] overflow-y-auto">
                    {(() => {
                      // Group by batch: records within 2 seconds of each other are the same batch
                      const batches: { time: string; timeLabel: string; counts: Record<string, number> }[] = []
                      const sorted = [...history].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      sorted.forEach((h: any) => {
                        const t = new Date(h.created_at).getTime()
                        const last = batches[batches.length - 1]
                        if (last && Math.abs(t - new Date(last.time).getTime()) < 2000) {
                          last.counts[h.mark as string] = (last.counts[h.mark as string] || 0) + 1
                        } else {
                          const dt = new Date(h.created_at)
                          const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                          batches.push({ time: h.created_at, timeLabel: label, counts: { [h.mark]: 1 } })
                        }
                      })
                      return batches.map((batch, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <span className="text-[11px] text-text-tertiary w-28 shrink-0">{batch.timeLabel}</span>
                          <span className="text-[10px] text-green-600 font-medium">{batch.counts.got_it || 0} got it</span>
                          <span className="text-[10px] text-amber-600 font-medium">{batch.counts.almost || 0} almost</span>
                          <span className="text-[10px] text-red-600 font-medium">{batch.counts.not_yet || 0} not yet</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
