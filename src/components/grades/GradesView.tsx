'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, DOMAINS, DOMAIN_LABELS, EnglishClass, Grade, Domain } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, Check, Pencil, Trash2, ChevronDown, BarChart3, User, FileText, Calendar, Download } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import WIDABadge from '@/components/shared/WIDABadge'
import StudentPopover from '@/components/shared/StudentPopover'

const ASSESSMENT_CATEGORIES = [
  { value: 'quiz', label: 'Quiz', labelKo: '퀴즈' },
  { value: 'project', label: 'Project', labelKo: '프로젝트' },
  { value: 'assignment', label: 'Assignment', labelKo: '과제' },
  { value: 'homework', label: 'Homework', labelKo: '숙제' },
  { value: 'participation', label: 'Participation', labelKo: '참여' },
  { value: 'performance_task', label: 'Performance Task', labelKo: '수행과제' },
  { value: 'formative', label: 'Formative', labelKo: '형성평가' },
  { value: 'summative', label: 'Summative', labelKo: '총괄평가' },
  { value: 'other', label: 'Other', labelKo: '기타' },
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
type SubView = 'entry' | 'overview' | 'student'
type LangKey = 'en' | 'ko'

interface Semester { id: string; name: string; name_ko: string; type: string; is_active: boolean }

export default function GradesView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [subView, setSubView] = useState<SubView>('entry')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedDomain, setSelectedDomain] = useState<Domain>('reading')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null)

  // Load semesters
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semesters').select('*').order('start_date', { ascending: false })
      if (data && data.length > 0) {
        setSemesters(data)
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

  useEffect(() => {
    if (!selectedAssessment) { setScores({}); setRawInputs({}); return }
    const aid = selectedAssessment.id
    async function loadScores() {
      const { data } = await supabase.from('grades').select('student_id, score').eq('assessment_id', aid)
      const map: Record<string, number | null> = {}
      if (data) data.forEach((g: { student_id: string; score: number | null }) => { map[g.student_id] = g.score })
      setScores(map); setRawInputs({}); setHasChanges(false)
    }
    loadScores()
  }, [selectedAssessment])

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
    const entries = Object.entries(finalScores).filter(([, s]) => s !== null && s !== undefined)
      .map(([sid, score]) => ({ assessment_id: selectedAssessment.id, student_id: sid, score }))
    for (const e of entries) {
      const { error } = await supabase.from('grades').upsert(
        { assessment_id: selectedAssessment.id, student_id: e.student_id, score: e.score, entered_by: currentTeacher?.id || null },
        { onConflict: 'student_id,assessment_id' })
      if (error) { showToast(`Error saving: ${error.message}`); setSaving(false); return }
    }
    setHasChanges(false); setSaving(false)
    showToast(lang === 'ko' ? '저장 완료!' : `Saved ${entries.length} scores`)
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

  const enteredCount = Object.values(scores).filter(s => s !== null && s !== undefined).length
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
        <div className="flex gap-1 mt-4">
          {([
            { id: 'entry' as SubView, icon: FileText, label: lang === 'ko' ? '점수 입력' : 'Score Entry' },
            { id: 'overview' as SubView, icon: BarChart3, label: lang === 'ko' ? '도메인 개요' : 'Domain Overview' },
            { id: 'student' as SubView, icon: User, label: lang === 'ko' ? '학생별 보기' : 'Student View' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${subView === tab.id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <tab.icon size={14} /> {tab.label}
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
          <select value={selectedGrade} onChange={e => { setSelectedGrade(Number(e.target.value) as Grade); setSelectedAssessment(null) }}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => { setSelectedClass(cls); setSelectedAssessment(null) }}
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

        {subView === 'entry' && <ScoreEntryView {...{ selectedDomain, assessments, selectedAssessment, scores, rawInputs, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester }} setSelectedDomain={(d: Domain) => { setSelectedDomain(d); setSelectedAssessment(null) }} setSelectedAssessment={setSelectedAssessment} handleScoreChange={handleScoreChange} handleKeyDown={handleKeyDown} commitScore={commitScore} handleSaveAll={handleSaveAll} handleDeleteAssessment={handleDeleteAssessment} onEditAssessment={setEditingAssessment} onCreateAssessment={() => setShowCreateModal(true)} createLabel={t.grades.createAssessment} />}
        {subView === 'overview' && <DomainOverview allAssessments={allAssessments} selectedGrade={selectedGrade} selectedClass={selectedClass} lang={lang} />}
        {subView === 'student' && <StudentDrillDown allAssessments={allAssessments} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} />}
      </div>

      {(showCreateModal || editingAssessment) && <AssessmentModal grade={selectedGrade} englishClass={selectedClass} domain={selectedDomain} editing={editingAssessment} semesterId={selectedSemester} onClose={() => { setShowCreateModal(false); setEditingAssessment(null) }} onSaved={(a: Assessment) => { setShowCreateModal(false); setEditingAssessment(null); loadAssessments().then(() => setSelectedAssessment(a)); loadAllAssessments() }} />}
    </div>
  )
}

// ─── Score Entry ─────────────────────────────────────────────────────

function ScoreEntryView({ selectedDomain, setSelectedDomain, assessments, selectedAssessment, setSelectedAssessment, scores, rawInputs, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester, handleScoreChange, handleKeyDown, commitScore, handleSaveAll, handleDeleteAssessment, onEditAssessment, onCreateAssessment, createLabel }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; assessments: Assessment[]; selectedAssessment: Assessment | null; setSelectedAssessment: (a: Assessment | null) => void; scores: Record<string, number | null>; rawInputs: Record<string, string>; students: StudentRow[]; loadingStudents: boolean; loadingAssessments: boolean; enteredCount: number; hasChanges: boolean; saving: boolean; lang: LangKey; catLabel: (t: string) => string; selectedClass: EnglishClass; selectedGrade: Grade; selectedSemester: string | null; handleScoreChange: (sid: string, v: string) => void; handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, i: number, sid: string) => void; commitScore: (sid: string) => void; handleSaveAll: () => void; handleDeleteAssessment: (a: Assessment) => void; onEditAssessment: (a: Assessment) => void; onCreateAssessment: () => void; createLabel: string
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  return (
    <>
      <div className="flex gap-1 mb-5 border-b border-border">
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setSelectedDomain(d)} className={`px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-px ${selectedDomain === d ? 'border-navy text-navy' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {DOMAIN_LABELS[d][lang]}
            {assessments.filter(a => a.domain === d).length > 0 && <span className="ml-1.5 text-[10px] bg-accent-light text-navy px-1.5 py-0.5 rounded-full font-bold">{assessments.filter(a => a.domain === d).length}</span>}
          </button>
        ))}
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
            <div className="text-4xl mb-3">📝</div>
            <h3 className="font-display text-lg font-semibold text-navy mb-1">{assessments.length === 0 ? (lang === 'ko' ? '평가를 먼저 생성하세요' : 'Create your first assessment') : (lang === 'ko' ? '평가를 선택하세요' : 'Select an assessment above')}</h3>
            <p className="text-text-tertiary text-sm max-w-md mx-auto">{assessments.length === 0 ? (lang === 'ko' ? '"평가 생성" 버튼을 클릭하여 시작하세요.' : 'Click "Create Assessment" to get started. Name it, pick the domain and category, set the total points, then enter scores.') : ''}</p>
            {assessments.length === 0 && <button onClick={onCreateAssessment} className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all"><Plus size={15} /> {createLabel}</button>}
          </div>
        ) : (
          <>
            <div className="px-5 py-3 bg-accent-light border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-navy">{selectedAssessment.name}</span>
                  <span className="text-[12px] text-text-secondary">out of {selectedAssessment.max_score}</span>
                  <span className="text-[10px] bg-navy/10 text-navy px-2 py-0.5 rounded-full font-medium">{catLabel(selectedAssessment.type)}</span>
                  {selectedAssessment.date && <span className="text-[11px] text-text-tertiary flex items-center gap-1"><Calendar size={11} />{new Date(selectedAssessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  {selectedAssessment.description && <span className="text-[11px] text-text-tertiary" title={selectedAssessment.description}>📝 {selectedAssessment.description.length > 40 ? selectedAssessment.description.slice(0, 40) + '...' : selectedAssessment.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-secondary">{enteredCount}/{students.length} entered</span>
                  <div className="w-24 h-1.5 bg-navy/10 rounded-full overflow-hidden"><div className="h-full bg-navy rounded-full transition-all" style={{ width: `${students.length > 0 ? (enteredCount / students.length) * 100 : 0}%` }} /></div>
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
                </tr></thead>
                <tbody>
                  {students.map((s, i) => {
                    const score = scores[s.id]
                    const pct = score != null && selectedAssessment.max_score > 0 ? ((score / selectedAssessment.max_score) * 100).toFixed(1) : null
                    const isLow = pct !== null && parseFloat(pct) < 60
                    return (
                      <tr key={s.id} className="border-t border-border table-row-hover">
                        <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                        <td className="px-4 py-2">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center"><User size={12} className="text-text-tertiary" /></div>
                          )}
                        </td>
                        <td className="px-4 py-2.5"><StudentPopover studentId={s.id} name={s.english_name} koreanName={s.korean_name} trigger={<><span className="font-medium">{s.english_name}</span><span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span></>} /> <WIDABadge studentId={s.id} compact /></td>
                        <td className="px-4 py-2.5 text-center"><input type="text" className={`score-input ${score != null ? 'has-value' : ''} ${isLow ? 'error' : ''}`} value={rawInputs[s.id] !== undefined ? rawInputs[s.id] : (score != null ? score : '')} onChange={e => handleScoreChange(s.id, e.target.value)} onBlur={() => commitScore(s.id)} onKeyDown={e => handleKeyDown(e, i, s.id)} placeholder="" /></td>
                        <td className={`px-4 py-2.5 text-center text-[12px] font-medium ${isLow ? 'text-danger' : pct ? 'text-navy' : 'text-text-tertiary'}`}>{pct ? `${pct}%` : '—'}</td>
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

function StatsBar({ scores, maxScore, lang }: { scores: Record<string, number | null>; maxScore: number; lang: LangKey }) {
  const valid = Object.values(scores).filter((s): s is number => s != null)
  if (valid.length === 0) return null
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  const hi = Math.max(...valid), lo = Math.min(...valid)
  const pA = maxScore > 0 ? (avg / maxScore) * 100 : 0
  const pH = maxScore > 0 ? (hi / maxScore) * 100 : 0
  const pL = maxScore > 0 ? (lo / maxScore) * 100 : 0
  return (
    <div className="px-5 py-2.5 bg-surface-alt border-t border-border flex items-center gap-6 text-[12px]">
      <span className="text-text-tertiary font-medium">{lang === 'ko' ? '통계' : 'Stats'}:</span>
      <span><span className="text-text-tertiary">Avg:</span> <span className="font-semibold text-navy">{avg.toFixed(1)} ({pA.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">High:</span> <span className="font-semibold text-success">{hi} ({pH.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">Low:</span> <span className={`font-semibold ${pL < 60 ? 'text-danger' : 'text-navy'}`}>{lo} ({pL.toFixed(1)}%)</span></span>
      <span><span className="text-text-tertiary">n:</span> <span className="font-medium">{valid.length}</span></span>
    </div>
  )
}

// ─── Domain Overview ────────────────────────────────────────────────

function makeDomainStats() {
  const empty = { avg: null, count: 0, assessmentCount: 0, assessments: [] }
  return { reading: {...empty, assessments: []}, phonics: {...empty, assessments: []}, writing: {...empty, assessments: []}, speaking: {...empty, assessments: []}, language: {...empty, assessments: []} } as any
}

function DomainOverview({ allAssessments, selectedGrade, selectedClass, lang }: { allAssessments: any[]; selectedGrade: any; selectedClass: any; lang: any }) {
  const [stats, setStats] = useState(makeDomainStats())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = makeDomainStats()
      for (const domain of DOMAINS) {
        const da = allAssessments.filter((a: any) => a.domain === domain)
        result[domain].assessmentCount = da.length
        if (da.length === 0) continue
        const ids = da.map((a: any) => a.id)
        const { data: grades } = await supabase.from('grades').select('score, assessment_id').in('assessment_id', ids).not('score', 'is', null)
        if (grades && grades.length > 0) {
          const pcts = grades.map((g: any) => { const a = da.find((x: any) => x.id === g.assessment_id); return a && a.max_score > 0 ? (g.score / a.max_score) * 100 : null }).filter((p: any) => p != null)
          result[domain].count = pcts.length
          result[domain].avg = pcts.length > 0 ? pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length : null
          for (const a of da) {
            const aGrades = grades.filter((g: any) => g.assessment_id === a.id)
            if (aGrades.length > 0 && a.max_score > 0) {
              const avg = aGrades.reduce((sum: number, g: any) => sum + (g.score / a.max_score) * 100, 0) / aGrades.length
              result[domain].assessments.push({ name: a.name, avg })
            }
          }
        }
      }
      setStats(result)
      setLoading(false)
    }
    load()
  }, [allAssessments])

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" />
        <p className="text-text-tertiary text-sm">Loading...</p>
      </div>
    )
  }

  const validAvgs = DOMAINS.map(d => stats[d].avg).filter((v: any) => v != null)
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
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { nameRef.current?.focus() }, [])

  // Load CCSS standards for suggestions
  const [ccssStandards, setCcssStandards] = useState<any[]>([])
  useEffect(() => {
    import('../curriculum/ccss-standards').then(m => { if (m.CCSS_STANDARDS) setCcssStandards(m.CCSS_STANDARDS) }).catch(() => {})
  }, [])

  const filteredStds = stdSearch.length >= 2 ? ccssStandards.filter(s =>
    (s.code.toLowerCase().includes(stdSearch.toLowerCase()) || s.description?.toLowerCase().includes(stdSearch.toLowerCase()))
    && !standards.includes(s.code)
  ).slice(0, 6) : []

  const otherClasses = ENGLISH_CLASSES.filter((c: any) => c !== englishClass)

  const handleSave = async () => {
    if (!name.trim()) return; setSaving(true)
    const stdTags = standards.map(code => { const s = ccssStandards.find(x => x.code === code); return { code, dok: s?.dok || 0, description: s?.description || '' } })
    const basePayload = { name: name.trim(), domain: selDomain, max_score: maxScore, grade, type: category, date: date || null, description: notes.trim(), created_by: currentTeacher?.id || null, semester_id: semesterId || null, standards: stdTags }
    if (editing) {
      const { data, error } = await supabase.from('assessments').update({ ...basePayload, english_class: englishClass }).eq('id', editing.id).select().single()
      setSaving(false)
      if (error) showToast(`Error: ${error.message}`); else { showToast(lang === 'ko' ? `"${name}" 수정 완료` : `Updated "${name}"`); onSaved(data) }
    } else {
      // Create for current class
      const { data, error } = await supabase.from('assessments').insert({ ...basePayload, english_class: englishClass }).select().single()
      if (error) { setSaving(false); showToast(`Error: ${error.message}`); return }
      // Create copies for shared classes
      if (shareClasses.length > 0) {
        const copies = shareClasses.map((cls: string) => ({ ...basePayload, english_class: cls }))
        await supabase.from('assessments').insert(copies)
      }
      setSaving(false)
      showToast(lang === 'ko' ? `"${name}" 평가가 생성되었습니다` : `Created "${name}"${shareClasses.length > 0 ? ` (+ ${shareClasses.length} shared)` : ''}`)
      onSaved(data)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-navy">{editing ? (lang === 'ko' ? '평가 수정' : 'Edit Assessment') : (lang === 'ko' ? '평가 생성' : 'Create Assessment')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '평가 이름' : 'Assessment Name'}</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSave() }} placeholder={lang === 'ko' ? '예: Reading Quiz 1' : 'e.g. Reading Quiz 1'} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Domain</label>
              <select value={selDomain} onChange={e => setSelDomain(e.target.value as Domain)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">{DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d][lang]}</option>)}</select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '유형' : 'Category'}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">{ASSESSMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{lang === 'ko' ? c.labelKo : c.label}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '만점' : 'Total Points'}</label>
              <input type="number" min={1} max={1000} step="any" value={maxScore} onChange={e => setMaxScore(parseFloat(e.target.value) || 10)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '날짜' : 'Date'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" /></div>
          </div>
          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '메모' : 'Notes'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
            <textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder={lang === 'ko' ? '평가에 대한 메모...' : 'Notes about this assessment...'} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none" /></div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '표준 (CCSS)' : 'Standards (CCSS)'} <span className="text-text-tertiary font-normal normal-case">(optional)</span></label>
            {standards.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {standards.map(code => (
                  <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">
                    {code}
                    <button onClick={() => setStandards(prev => prev.filter(c => c !== code))} className="text-navy/50 hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input value={stdSearch} onChange={e => setStdSearch(e.target.value)} placeholder={lang === 'ko' ? 'CCSS 코드 검색...' : 'Search CCSS code (e.g. RL.3.1)'}
                className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
              {filteredStds.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                  {filteredStds.map(s => (
                    <button key={s.code} onClick={() => { setStandards(prev => [...prev, s.code]); setStdSearch('') }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-alt border-b border-border/50 last:border-0">
                      <span className="text-[11px] font-bold text-navy">{s.code}</span>
                      <span className="text-[10px] text-text-tertiary ml-2 line-clamp-1">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <button onClick={handleSave} disabled={saving || !name.trim()} className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} {editing ? (lang === 'ko' ? '수정' : 'Update') : (lang === 'ko' ? '생성' : 'Create')}
          </button>
        </div>
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
      if (m) byClass[m.english_class].push((g.score / maxScore) * 100)
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
