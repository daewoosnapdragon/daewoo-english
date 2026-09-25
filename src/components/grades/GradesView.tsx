'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, DOMAINS, DOMAIN_LABELS, EnglishClass, Grade, Domain, Semester, QuestionMapItem, ItemResponse } from '@/types'
import { classToColor, classToTextColor, calculateWeightedAverage as calcWeightedAvg } from '@/lib/utils'
import { Plus, X, Loader2, Check, Pencil, Trash2, ChevronDown, ChevronUp, BarChart3, User, FileText, Calendar, Download, ClipboardEdit, Save, CalendarDays, Zap, Filter, Search } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import WIDABadge from '@/components/shared/WIDABadge'
import StudentPopover from '@/components/shared/StudentPopover'
import NewAssessmentFlow from './NewAssessmentFlow'
import KeyScoreSheet from './KeyScoreSheet'
import RubricPicker from './RubricPicker'
import RubricScoreSheet from './RubricScoreSheet'

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
  standards?: { code: string; dok?: number; description?: string }[]
  sections?: { label: string; standard: string; max_points: number }[] | null
  question_map?: { num: number; type: string; max_points: number; standard?: string; answer_key?: string }[] | null
  rubric?: { name: string; band?: string; criteria: { key: string; label: string; levels: [string, string, string, string]; standard?: string }[] } | null
  rubric_id?: string | null
}

interface StudentRow { id: string; english_name: string; korean_name: string; photo_url?: string }
type SubView = 'entry' | 'overview' | 'student' | 'batch' | 'calendar'
type LangKey = 'en' | 'ko'

export default function GradesView() {
  const { t, language, currentTeacher, showToast, confirmDialog, activeSemester, visibleSemesters, canSwitchSemester } = useApp()
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
  const [showCreateFlow, setShowCreateFlow] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  // Assessments with an answer key open on the answer sheet; the plain score
  // list is one click away for either kind.
  const [sheetMode, setSheetMode] = useState(true)
  const [scoresTick, setScoresTick] = useState(0)
  const [hasChanges, setHasChanges] = useState(false)

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  // Only semester managers get a picker; everyone else follows the active one.
  const semesters = useMemo(() => {
    const nonArchive = visibleSemesters.filter((s: Semester) => String(s.type) !== 'archive')
    return nonArchive.length > 0 ? nonArchive : visibleSemesters
  }, [visibleSemesters])

  // Seeded from the active semester on the very first render, not from an
  // effect: an effect runs after the first fetch has already been queued, so
  // that fetch would go out with no semester filter and pull in assessments
  // from every semester.
  const [selectedSemester, setSelectedSemester] = useState<string | null>(
    () => activeSemester?.id || semesters[0]?.id || null)

  // Follow the active semester: on first load, and again whenever an admin
  // changes it out from under a teacher who cannot switch.
  useEffect(() => {
    if (semesters.length === 0) return
    const fallback = activeSemester?.id || semesters[0].id
    setSelectedSemester(prev => {
      if (!prev) return fallback
      if (!canSwitchSemester && prev !== fallback) return fallback
      return semesters.some(s => s.id === prev) ? prev : fallback
    })
  }, [semesters, activeSemester, canSwitchSemester])

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ALL_ENGLISH_CLASSES

  const { students, loading: loadingStudents } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  // Every load below is keyed to the grade/class/domain/semester that started
  // it. Switching any of them fires a new request while the old one is still in
  // flight, and the old one can come back last -- these counters make sure only
  // the newest response is allowed to write to state.
  const assessmentsReq = useRef(0)
  const allAssessmentsReq = useRef(0)
  const scoresReq = useRef(0)
  const selectedAssessmentRef = useRef<Assessment | null>(null)
  selectedAssessmentRef.current = selectedAssessment

  // Nothing is scoped correctly until we know which semester to filter on, and
  // an unfiltered query returns every semester's assessments at once.
  const semesterUnresolved = !selectedSemester && semesters.length > 0

  const loadAssessments = useCallback(async () => {
    const req = ++assessmentsReq.current
    if (semesterUnresolved) { setLoadingAssessments(true); return }
    setLoadingAssessments(true)
    // Load assessments for the selected domain
    let query = supabase.from('assessments').select('*')
      .eq('grade', selectedGrade).eq('english_class', selectedClass).eq('domain', selectedDomain)
    if (selectedSemester) query = query.eq('semester_id', selectedSemester)
    const { data, error } = await query
      .order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })

    // Also load multi-domain assessments that have sections targeting this domain
    let crossQuery = supabase.from('assessments').select('*')
      .eq('grade', selectedGrade).eq('english_class', selectedClass).neq('domain', selectedDomain)
      .not('sections', 'is', null)
    if (selectedSemester) crossQuery = crossQuery.eq('semester_id', selectedSemester)
    const { data: crossData } = await crossQuery

    // Filter cross-domain assessments to only those with sections matching selectedDomain
    const crossDomainAssessments = (crossData || []).filter((a: any) => {
      const secs = Array.isArray(a.sections) ? a.sections : []
      return secs.some((s: any) => s.domain === selectedDomain)
    }).map((a: any) => ({ ...a, _isMultiDomain: true }))

    const allAssessments = [...(data || []), ...crossDomainAssessments]
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''))

    // A newer switch already fired while this was in flight -- drop the answer
    // rather than painting the previous grade/class/semester over it.
    if (req !== assessmentsReq.current) return

    if (!error) {
      // Read through a ref: this callback is only rebuilt when the filters
      // change, so a captured `selectedAssessment` goes stale as soon as the
      // teacher picks a different assessment.
      const current = selectedAssessmentRef.current
      setAssessments(allAssessments)
      if (allAssessments.length === 0) setSelectedAssessment(null)
      else if (!current || !allAssessments.find(a => a.id === current.id)) {
        setSelectedAssessment(allAssessments[allAssessments.length - 1])
      }
    }
    setLoadingAssessments(false)
  }, [selectedGrade, selectedClass, selectedDomain, selectedSemester, semesterUnresolved])

  const loadAllAssessments = useCallback(async () => {
    const req = ++allAssessmentsReq.current
    if (semesterUnresolved) return
    let query = supabase.from('assessments').select('*')
      .eq('grade', selectedGrade).eq('english_class', selectedClass)
    if (selectedSemester) query = query.eq('semester_id', selectedSemester)
    const { data } = await query.order('domain').order('created_at', { ascending: true })
    if (req !== allAssessmentsReq.current) return
    if (data) setAllAssessments(data)
  }, [selectedGrade, selectedClass, selectedSemester, semesterUnresolved])

  useEffect(() => { loadAssessments() }, [loadAssessments])

  // /grades?assessment=<id> (from the dashboard's grading queue) opens that
  // assessment directly. Read from the URL in an effect rather than through
  // useSearchParams, which would force a Suspense boundary on the route.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = new URLSearchParams(window.location.search).get('assessment')
    if (!id) return
    ;(async () => {
      const { data } = await supabase.from('assessments').select('*').eq('id', id).single()
      if (!data) return
      setSubView('entry')
      setSelectedGrade(data.grade)
      setSelectedClass(data.english_class)
      setSelectedDomain(data.domain)
      if (data.semester_id) setSelectedSemester(data.semester_id)
      setSelectedAssessment(data)
      window.history.replaceState(null, '', '/grades')
    })()
  }, [])
  useEffect(() => { loadAllAssessments() }, [loadAllAssessments])

  const selectedAssessmentId = selectedAssessment?.id
  useEffect(() => {
    const req = ++scoresReq.current
    void scoresTick
    if (!selectedAssessmentId) { setScores({}); setRawInputs({}); setAbsentMap({}); setExemptMap({}); return }
    const aid = selectedAssessmentId
    // Blank the table first so the previous assessment's numbers are never on
    // screen underneath the new assessment's header.
    setScores({}); setRawInputs({}); setAbsentMap({}); setExemptMap({})
    async function loadScores() {
      const { data } = await supabase.from('grades').select('student_id, score, is_absent, is_exempt').eq('assessment_id', aid)
      // Another assessment was selected while this was loading -- these numbers
      // belong to the old one and must not land in the visible table.
      if (req !== scoresReq.current) return
      const map: Record<string, number | null> = {}
      const abs: Record<string, boolean> = {}
      const exm: Record<string, boolean> = {}
      if (data) data.forEach((g: any) => { map[g.student_id] = g.score; if (g.is_absent) abs[g.student_id] = true; if (g.is_exempt) exm[g.student_id] = true })
      setScores(map); setAbsentMap(abs); setExemptMap(exm); setRawInputs({}); setHasChanges(false)
    }
    loadScores()
  }, [selectedAssessmentId, scoresTick])

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

  // When an input gets focus, ensure the committed score is in rawInputs
  // so backspace/delete works properly on existing values
  const handleScoreFocus = (studentId: string) => {
    if (rawInputs[studentId] === undefined && scores[studentId] != null) {
      setRawInputs(prev => ({ ...prev, [studentId]: String(scores[studentId]) }))
    }
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
    loadAllAssessments() // Refresh so domain overview picks up new grades
  }

  const handleDeleteAssessment = async (a: Assessment) => {
    const msg = lang === 'ko' ? `"${a.name}" 평가와 모든 점수를 삭제하시겠습니까?` : `Delete "${a.name}" and all its scores? This cannot be undone.`
    if (!await confirmDialog({ title: lang === 'ko' ? `"${a.name}" 삭제` : `Delete "${a.name}"?`, message: lang === 'ko' ? '모든 점수가 함께 삭제됩니다.' : 'All its scores will be deleted. This cannot be undone.', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Delete', cancelLabel: lang === 'ko' ? '취소' : 'Cancel' })) return
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
            <h2 className="font-display text-[30px] leading-none text-ink">{t.grades.title}</h2>
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
            {subView === 'entry' && !showCreateFlow && (
              <button onClick={() => setShowCreateFlow(true)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded text-[13px] font-semibold bg-accent text-white hover:bg-accent-hover">
                <Plus size={15} /> {lang === 'ko' ? '새 평가' : 'New assessment'}
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
          {/* Semester — a picker for admin/Snapdragon, a fixed label for everyone else */}
          {semesters.length > 0 && (canSwitchSemester ? (
            <select value={selectedSemester || ''} onChange={e => { setSelectedSemester(e.target.value || null); setSelectedAssessment(null) }}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map(sem => (
                <option key={sem.id} value={sem.id}>
                  {lang === 'ko' ? sem.name_ko : sem.name}{sem.is_active ? ' ●' : ''}
                </option>
              ))}
            </select>
          ) : (
            <span title="The active semester is set by an admin" className="px-3 py-2 rounded-lg text-[13px] font-medium bg-surface-alt text-text-secondary border border-border">
              {(() => { const sem = semesters.find(s => s.id === selectedSemester) || semesters[0]; return (lang === 'ko' ? sem.name_ko : sem.name) })()}
            </span>
          ))}
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

        {subView === 'entry' && showCreateFlow && (
          <div className="mb-6">
            <NewAssessmentFlow grade={selectedGrade} englishClass={selectedClass} domain={selectedDomain} semesterId={selectedSemester}
              onClose={() => setShowCreateFlow(false)}
              onCreated={(a, scoring) => { setShowCreateFlow(false); setSelectedDomain(a.domain); setSheetMode(scoring !== 'points'); setSelectedAssessment(a); loadAssessments(); loadAllAssessments() }} />
          </div>
        )}
        {subView === 'entry' && <ScoreEntryView {...{ selectedDomain, assessments, selectedAssessment, scores, rawInputs, absentMap, exemptMap, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester }} setSelectedDomain={(d: Domain) => { setSelectedDomain(d); setSelectedAssessment(null) }} setSelectedAssessment={setSelectedAssessment} handleScoreChange={handleScoreChange} handleKeyDown={handleKeyDown} commitScore={commitScore} handleSaveAll={handleSaveAll} handleDeleteAssessment={handleDeleteAssessment} onEditAssessment={setEditingAssessment} onCreateAssessment={() => setShowCreateFlow(true)} createLabel={lang === 'ko' ? '새 평가' : 'New assessment'} sheetMode={sheetMode} setSheetMode={setSheetMode} onSheetSaved={() => { setScoresTick(t => t + 1); loadAllAssessments() }} onToggleAbsent={(sid: string) => { setAbsentMap(prev => { const n = { ...prev }; if (n[sid]) delete n[sid]; else { n[sid] = true; setExemptMap(p => { const e = { ...p }; delete e[sid]; return e }) }; return n }); setHasChanges(true) }} onToggleExempt={(sid: string) => { setExemptMap(prev => { const n = { ...prev }; if (n[sid]) delete n[sid]; else { n[sid] = true; setAbsentMap(p => { const a = { ...p }; delete a[sid]; return a }) }; return n }); setHasChanges(true) }} onRubricApply={(newScores: Record<string, number>, rubricMax?: number) => { if (rubricMax && selectedAssessment && rubricMax !== selectedAssessment.max_score) { supabase.from('assessments').update({ max_score: rubricMax }).eq('id', selectedAssessment.id).then(() => { setSelectedAssessment({ ...selectedAssessment, max_score: rubricMax }); setAllAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, max_score: rubricMax } : a)); setAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { ...a, max_score: rubricMax } : a)) }) } setScores(prev => ({ ...prev, ...newScores })); setHasChanges(true) }} />}
        {subView === 'batch' && <BatchGridView selectedDomain={selectedDomain} setSelectedDomain={(d: Domain) => setSelectedDomain(d)} allAssessments={allAssessments} students={students} selectedClass={selectedClass} selectedGrade={selectedGrade} lang={lang} />}
        {subView === 'overview' && <DomainOverview allAssessments={allAssessments} selectedGrade={selectedGrade} selectedClass={selectedClass} lang={lang} />}
        {subView === 'student' && <StudentDrillDown allAssessments={allAssessments} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} lang={lang} />}
        {subView === 'calendar' && <AssessmentCalendarView allAssessments={allAssessments} lang={lang} />}
      </div>

      {editingAssessment && <AssessmentModal grade={selectedGrade} englishClass={selectedClass} domain={selectedDomain} editing={editingAssessment} semesterId={selectedSemester} onClose={() => setEditingAssessment(null)} onSaved={(a: Assessment) => { setEditingAssessment(null); loadAssessments().then(() => setSelectedAssessment(a)); loadAllAssessments() }} />}
    </div>
  )
}

// ─── Score Entry ─────────────────────────────────────────────────────

function ScoreEntryView({ selectedDomain, setSelectedDomain, assessments, selectedAssessment, setSelectedAssessment, scores, rawInputs, absentMap, exemptMap, students, loadingStudents, loadingAssessments, enteredCount, hasChanges, saving, lang, catLabel, selectedClass, selectedGrade, selectedSemester, handleScoreChange, handleKeyDown, commitScore, handleSaveAll, handleDeleteAssessment, onEditAssessment, onCreateAssessment, createLabel, onToggleAbsent, onToggleExempt, onRubricApply, sheetMode, setSheetMode, onSheetSaved }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; assessments: Assessment[]; selectedAssessment: Assessment | null; setSelectedAssessment: (a: Assessment | null) => void; scores: Record<string, number | null>; rawInputs: Record<string, string>; absentMap: Record<string, boolean>; exemptMap: Record<string, boolean>; students: StudentRow[]; loadingStudents: boolean; loadingAssessments: boolean; enteredCount: number; hasChanges: boolean; saving: boolean; lang: LangKey; catLabel: (t: string) => string; selectedClass: EnglishClass; selectedGrade: Grade; selectedSemester: string | null; handleScoreChange: (sid: string, v: string) => void; handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, i: number, sid: string) => void; commitScore: (sid: string) => void; handleSaveAll: () => void; handleDeleteAssessment: (a: Assessment) => void; onEditAssessment: (a: Assessment) => void; onCreateAssessment: () => void; createLabel: string; onToggleAbsent: (sid: string) => void; onToggleExempt: (sid: string) => void; onRubricApply: (scores: Record<string, number>, rubricMax?: number) => void
  sheetMode: boolean; setSheetMode: (v: boolean) => void; onSheetSaved: () => void
}) {
  const { showToast } = useApp()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [rubricOpen, setRubricOpen] = useState(false)
  const hasQuestionMap = selectedAssessment?.question_map && selectedAssessment.question_map.length > 0
  return (
    <>
      {rubricOpen && selectedAssessment && (
        <RubricPicker grade={selectedGrade} englishClass={selectedClass} onClose={() => setRubricOpen(false)}
          onUse={async r => {
            // Snapshot the rubric onto the assessment; the total becomes 4 per criterion.
            const snapshot = { name: r.name, band: r.band, criteria: r.criteria }
            const maxScore = r.criteria.length * 4
            const { error } = await supabase.from('assessments').update({ rubric: snapshot, rubric_id: r.rubric_id, max_score: maxScore }).eq('id', selectedAssessment.id)
            if (error) { showToast(`Error: ${error.message}${error.message.includes('rubric') ? ' · run supabase/migration-rubrics.sql first' : ''}`); return }
            setRubricOpen(false)
            setSelectedAssessment({ ...selectedAssessment, rubric: snapshot, rubric_id: r.rubric_id, max_score: maxScore })
            setSheetMode(true)
          }} />
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
                {(a as any)._isMultiDomain && <span className={`ml-1.5 text-[8px] px-1 py-0.5 rounded font-bold ${selectedAssessment?.id === a.id ? 'bg-white/20' : 'bg-purple-100 text-purple-700'}`}>Multi</span>}
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
        ) : selectedAssessment.rubric && sheetMode ? (
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-display text-[20px] leading-none text-ink truncate">{selectedAssessment.name}</span>
                <span className="text-[12px] text-ink-3">/{selectedAssessment.max_score} · {catLabel(selectedAssessment.type)} · {lang === 'ko' ? '루브릭' : 'rubric'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRubricOpen(true)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink">{lang === 'ko' ? '루브릭 변경' : 'Change rubric'}</button>
                <button onClick={() => setSheetMode(false)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink">{lang === 'ko' ? '점수 목록으로' : 'Score list'}</button>
              </div>
            </div>
            <RubricScoreSheet key={selectedAssessment.id + ':' + (selectedAssessment.rubric.criteria.length)} assessment={selectedAssessment as any} students={students} onSaved={onSheetSaved} />
          </div>
        ) : hasQuestionMap && sheetMode ? (
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-display text-[20px] leading-none text-ink truncate">{selectedAssessment.name}</span>
                <span className="text-[12px] text-ink-3">/{selectedAssessment.max_score} · {catLabel(selectedAssessment.type)}{selectedAssessment.date ? ` · ${new Date(selectedAssessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}</span>
              </div>
              <button onClick={() => setSheetMode(false)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink">{lang === 'ko' ? '점수 목록으로' : 'Score list'}</button>
            </div>
            <KeyScoreSheet key={selectedAssessment.id} assessment={selectedAssessment as any} students={students} onSaved={onSheetSaved} />
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
                  {selectedAssessment.rubric && <button onClick={() => setSheetMode(true)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-rule-2 text-[11.5px] font-medium text-ink-2 hover:text-ink">{lang === 'ko' ? '루브릭으로 채점' : 'Rubric sheet'}</button>}
                  {!selectedAssessment.rubric && <button onClick={() => setRubricOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-all"><ClipboardEdit size={13} />Score with Rubric</button>}
                                    {hasQuestionMap && <button onClick={() => setSheetMode(true)} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-rule-2 text-[11.5px] font-medium text-ink-2 hover:text-ink"><Zap size={12} /> {lang === 'ko' ? '답안지로 채점' : 'Answer sheet'}</button>}
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
                        <td className="px-4 py-2.5 text-center">{isAbsent ? <span className="text-[11px] text-text-tertiary italic">Absent</span> : isExempt ? <span className="text-[11px] text-amber-600 italic">Exempt</span> : <input type="text" className={`score-input ${score != null ? 'has-value' : ''} ${isLow ? 'error' : ''}`} value={rawInputs[s.id] !== undefined ? rawInputs[s.id] : (score != null ? String(score) : '')} onChange={e => handleScoreChange(s.id, e.target.value)} onFocus={e => { if (rawInputs[s.id] === undefined && score != null) { handleScoreChange(s.id, String(score)); } e.target.select() }} onBlur={() => commitScore(s.id)} onKeyDown={e => handleKeyDown(e, i, s.id)} placeholder="" />}</td>
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

  // Keyed on the actual student ids, not the count: switching to a class with
  // the same number of students would otherwise leave the previous class's
  // section scores in place.
  const studentKey = students.map(s => s.id).join(',')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('grades').select('student_id, score, section_scores')
        .eq('assessment_id', assessment.id)
        .in('student_id', students.map(s => s.id))
      if (cancelled) return
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
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment.id, studentKey])

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

  // Identity, not counts: a different semester with the same number of
  // assessments (or a different class with the same headcount) has to reload,
  // otherwise the grid keeps showing the scores it already had.
  const gridKey = `${students.map(s => s.id).join(',')}|${domainAssessments.map(a => a.id).join(',')}`

  useEffect(() => {
    let cancelled = false
    if (domainAssessments.length === 0 || students.length === 0) { setScores({}); setSectionScores({}); setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const { data } = await supabase.from('grades').select('student_id, assessment_id, score, section_scores')
        .in('assessment_id', domainAssessments.map(a => a.id))
        .in('student_id', students.map(s => s.id))
      if (cancelled) return
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
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain, gridKey])

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
      const secs = Array.isArray(a.sections) ? a.sections : null
      if (secs && secs.length > 0 && expandedAssessment === a.id) {
        secs.forEach((sec: any, i: number) => {
          cols.push({ type: 'section', assessment: a, sectionIdx: i, sectionLabel: sec?.label || `S${i + 1}` })
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
            <strong>Batch Grid</strong> lets you view and edit scores for all students across all assessments. {domainAssessments.some(a => Array.isArray(a.sections) && a.sections.length > 0) ? 'Click an assessment header to expand/collapse its sections.' : ''} Changes are saved when you click "Save All."
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
                  const hasSections = Array.isArray(a.sections) && a.sections.length > 0
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
                      weightedItems.push({ score: sc, maxScore: a.max_score, assessmentType: (['formative','summative','performance_task'].includes(a.type) ? a.type : 'formative') as any })
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
                        const hasSections = Array.isArray(a.sections) && a.sections.length > 0 && expandedAssessment === a.id
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
              studentScores['_all'].push({ score: g.score, maxScore: a.max_score, assessmentType: (['formative','summative','performance_task'].includes(a.type) ? a.type : 'formative') as any })
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
    let cancelled = false
    async function load() {
      setLoading(true)
      const ids = allAssessments.map(a => a.id)
      const { data: sg } = await supabase.from('grades').select('assessment_id, score').eq('student_id', selectedStudentId!).in('assessment_id', ids)
      if (cancelled) return
      const gm: Record<string, number | null> = {}; if (sg) sg.forEach(g => { gm[g.assessment_id] = g.score }); setStudentGrades(gm)
      const { data: ag } = await supabase.from('grades').select('assessment_id, score').in('assessment_id', ids).not('score', 'is', null)
      if (cancelled) return
      const am: Record<string, number | null> = {}
      if (ag) { const grouped: Record<string, number[]> = {}; ag.forEach(g => { if (!grouped[g.assessment_id]) grouped[g.assessment_id] = []; grouped[g.assessment_id].push(g.score) }); for (const [id, sc] of Object.entries(grouped)) { am[id] = sc.reduce((a, b) => a + b, 0) / sc.length } }
      setClassAvgs(am); setLoading(false)
    }
    load()
    return () => { cancelled = true }
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
                domainsHTML += `<div style="margin-bottom:16px"><h3 style="font-size:13px;font-weight:700;color:#647FBC;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;display:flex;justify-content:space-between">${DOMAIN_LABELS[domain][lang]}${dAvg != null ? `<span style="color:${dAvg >= 80 ? '#16a34a' : dAvg >= 60 ? '#d97706' : '#dc2626'}">${dAvg.toFixed(1)}%</span>` : ''}</h3><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr style="background:#f1f5f9"><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:left">Assessment</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">Score</th><th style="padding:4px 8px;border:1px solid #e2e8f0;text-align:center">%</th></tr></thead><tbody>${rows}</tbody></table></div>`
              })
              pw.document.write(`<!DOCTYPE html><html><head><title>Grade Report - ${selected.english_name}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;margin:24px;color:#1a1a2e}@media print{@page{margin:15mm}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#647FBC;border-radius:8px;color:white;margin-bottom:16px"><div><span style="font-size:20px;font-weight:700;font-family:Inter,sans-serif;font-weight:700">${selected.english_name}</span><span style="font-size:14px;margin-left:8px;opacity:0.7">${selected.korean_name}</span></div><div style="font-size:11px;text-align:right">Grade Report<br>${new Date().toLocaleDateString()}</div></div>${domainsHTML}<p style="font-size:9px;color:#94a3b8;margin-top:16px">Daewoo Elementary English Program</p></body></html>`)
              pw.document.close(); pw.print()
            }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border border border-border">
              Print Report
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
                    <th className="text-left px-5 py-2">Assessment</th><th className="text-left px-3 py-2 w-20">Score</th><th className="text-left px-3 py-2 w-14">%</th><th className="text-center px-3 py-2">{lang === 'ko' ? '반 평균' : 'Class Avg'}</th><th className="text-center px-3 py-2">{lang === 'ko' ? '반 평균 대비' : 'vs. Class'}</th>
                  </tr></thead>
                  <tbody>{da.map(a => {
                    const sc = studentGrades[a.id]; const pct = sc != null && a.max_score > 0 ? (sc / a.max_score) * 100 : null
                    const ca = classAvgs[a.id]; const caP = ca != null && a.max_score > 0 ? (ca / a.max_score) * 100 : null
                    const diff = pct != null && caP != null ? pct - caP : null
                    return (
                      <tr key={a.id} className="border-t border-border/50 table-row-hover">
                        <td className="px-5 py-2"><span className="font-medium">{a.name}</span>{a.date && <span className="text-text-tertiary ml-1.5 text-[10px]">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}</td>
                        <td className="text-left px-3 py-2 font-medium tabular-nums">{sc != null ? `${sc}/${a.max_score}` : '—'}</td>
                        <td className={`text-left px-3 py-2 font-semibold tabular-nums ${pct == null ? 'text-text-tertiary' : pct >= 80 ? 'text-success' : pct >= 60 ? 'text-amber-600' : 'text-danger'}`}>{pct != null ? `${pct.toFixed(1)}%` : '—'}</td>
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
  const { language, currentTeacher, showToast, promptDialog } = useApp()
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
  const [useQuestionMap, setUseQuestionMap] = useState(!!editing?.question_map?.length)
  const [questionMap, setQuestionMap] = useState<{ num: number; type: string; max_points: number; standard: string; answer_key: string }[]>(
    editing?.question_map?.map(q => ({ num: q.num, type: q.type, max_points: q.max_points, standard: q.standard || '', answer_key: q.answer_key || '' })) || []
  )
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
    const finalQuestionMap = useQuestionMap && questionMap.length > 0 ? questionMap : null
    const finalMaxScore = finalQuestionMap ? finalQuestionMap.reduce((s, q) => s + q.max_points, 0) : finalSections ? finalSections.reduce((s, sec) => s + sec.max_points, 0) : maxScore
    // Merge section standards into the assessment-level standards
    const sectionStds = (finalSections || []).map(s => s.standard).filter(s => s && !standards.includes(s))
    const allStdTags = [...stdTags, ...sectionStds.map(code => { const s = ccssStandards.find(x => x.code === code); return { code, dok: s?.dok || 0, description: s?.text || '' } })]
    const basePayload = { name: name.trim(), domain: selDomain, max_score: finalMaxScore, grade, type: category, date: date || null, description: notes.trim(), created_by: currentTeacher?.id || null, semester_id: semesterId || null, standards: allStdTags, sections: finalSections, question_map: useQuestionMap && questionMap.length > 0 ? questionMap.map((q, i) => ({ num: i + 1, type: q.type, max_points: q.max_points, standard: q.standard || undefined, answer_key: q.answer_key || undefined })) : null }
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
                {createdAssessment?.question_map && ` · ${createdAssessment.question_map.length} questions`}
              </p>
            </div>

            {/* Question-map based entry: student sidebar + question grid */}
            {createdAssessment?.question_map && createdAssessment.question_map.length > 0 ? (
              <div>
                <KeyScoreSheet assessment={createdAssessment as any} students={scoreStudents} />
                <div className="flex justify-end mt-3"><button onClick={() => onSaved(createdAssessment!)} className="h-8 px-3.5 rounded bg-ink text-paper text-[12.5px] font-semibold">Done</button></div>
              </div>
            ) : (
              <>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
              {createdAssessment?.sections && createdAssessment.sections.length > 0 ? (
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
                                    let next = tbl?.querySelector(`input[data-col="${si + 1}"][data-row="${i}"]`) as HTMLInputElement
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
              </>
            )}
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
                    <select value={sec.domain || ''} onChange={e => { const ns = [...sections]; ns[si] = { ...ns[si], domain: e.target.value || undefined }; setSections(ns) }}
                      className="w-28 px-1.5 py-1.5 border border-border rounded-lg text-[10px] outline-none focus:border-navy" title="Section domain (for multi-domain assessments)">
                      <option value="">Same domain</option>
                      {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d].en}</option>)}
                    </select>
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
                  <button onClick={() => setSections([...sections, { label: `Section ${sections.length + 1}`, standard: '', max_points: 5, domain: undefined }])}
                    className="inline-flex items-center gap-1 text-[10px] text-navy font-medium hover:text-navy-dark"><Plus size={11} /> Add Section</button>
                  <span className="text-[10px] text-text-tertiary font-semibold">
                    Total: {sections.reduce((s, sec) => s + sec.max_points, 0)} pts
                  </span>
                </div>
                <p className="text-[9px] text-text-tertiary">Each section's score is tracked separately. Total points auto-calculated from sections. Set a section's domain to create multi-domain assessments — section scores automatically roll into each domain's gradebook.</p>
              </div>
            )}
          </div>

          {/* Question Map Builder (for Item Analysis) */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button onClick={() => {
              setUseQuestionMap(!useQuestionMap)
              if (!useQuestionMap && questionMap.length === 0) {
                setQuestionMap([{ num: 1, type: 'mc', max_points: 1, standard: '', answer_key: '' }])
              }
            }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-alt hover:bg-surface-alt/80 transition-all">
              <span className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                Question Map <span className="text-text-tertiary font-normal normal-case">(for item-by-item analysis)</span>
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${useQuestionMap ? 'bg-navy text-white' : 'bg-surface text-text-tertiary border border-border'}`}>
                {useQuestionMap ? 'ON' : 'OFF'}
              </span>
            </button>
            {useQuestionMap && (
              <div className="p-4 space-y-2">
                <div className="grid grid-cols-[32px_90px_50px_1fr_70px_24px] gap-1.5 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1 px-0.5">
                  <span>#</span><span>Type</span><span>Pts</span><span>Standard</span><span>Key</span><span></span>
                </div>
                {questionMap.map((q, qi) => (
                  <div key={qi} className="grid grid-cols-[24px_32px_90px_50px_1fr_70px_24px] gap-1.5 items-center">
                    <div className="flex flex-col">
                      <button disabled={qi === 0} onClick={() => { const nm = [...questionMap]; [nm[qi - 1], nm[qi]] = [nm[qi], nm[qi - 1]]; setQuestionMap(nm) }}
                        className="text-text-tertiary hover:text-navy disabled:opacity-20 p-0"><ChevronUp size={10} /></button>
                      <button disabled={qi === questionMap.length - 1} onClick={() => { const nm = [...questionMap]; [nm[qi], nm[qi + 1]] = [nm[qi + 1], nm[qi]]; setQuestionMap(nm) }}
                        className="text-text-tertiary hover:text-navy disabled:opacity-20 p-0"><ChevronDown size={10} /></button>
                    </div>
                    <span className="text-[11px] text-text-secondary font-semibold text-center">{qi + 1}</span>
                    <select value={q.type} onChange={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], type: e.target.value }; setQuestionMap(nm) }}
                      className="px-1.5 py-1.5 border border-border rounded text-[10px] outline-none focus:border-navy bg-surface">
                      <option value="mc">MC</option>
                      <option value="true_false">T/F</option>
                      <option value="short_answer">Short Ans</option>
                      <option value="open_ended">Open End</option>
                      <option value="matching">Matching</option>
                      <option value="fill_blank">Fill Blank</option>
                      <option value="listening">Listening</option>
                      <option value="oral">Oral</option>
                      <option value="rubric">Rubric</option>
                    </select>
                    <input type="number" min={1} value={q.max_points} onChange={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], max_points: parseInt(e.target.value) || 1 }; setQuestionMap(nm) }}
                      className="w-full px-1.5 py-1.5 border border-border rounded text-[10px] text-center outline-none focus:border-navy" />
                    {standards.length > 0 ? (
                      <select value={q.standard} onChange={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], standard: e.target.value }; setQuestionMap(nm) }}
                        className="w-full px-1.5 py-1.5 border border-border rounded text-[10px] outline-none focus:border-navy bg-surface">
                        <option value="">-- standard --</option>
                        {standards.map(code => <option key={code} value={code}>{code}</option>)}
                      </select>
                    ) : (
                      <input value={q.standard} onChange={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], standard: e.target.value }; setQuestionMap(nm) }}
                        onBlur={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], standard: normalizeCCSS(e.target.value) }; setQuestionMap(nm) }}
                        placeholder="e.g. RL.3.1" className="w-full px-1.5 py-1.5 border border-border rounded text-[10px] outline-none focus:border-navy" />
                    )}
                    {(q.type === 'mc' || q.type === 'true_false') ? (
                      <select value={q.answer_key} onChange={e => { const nm = [...questionMap]; nm[qi] = { ...nm[qi], answer_key: e.target.value }; setQuestionMap(nm) }}
                        className="px-1.5 py-1.5 border border-border rounded text-[10px] outline-none focus:border-navy bg-surface">
                        <option value="">--</option>
                        {q.type === 'mc' ? ['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>) : ['T', 'F'].map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : <span className="text-[9px] text-text-tertiary text-center">n/a</span>}
                    <button onClick={() => setQuestionMap(questionMap.filter((_, i) => i !== qi))} className="p-0.5 text-text-tertiary hover:text-red-500"><X size={12} /></button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setQuestionMap([...questionMap, { num: questionMap.length + 1, type: 'mc', max_points: 1, standard: '', answer_key: '' }])}
                      className="inline-flex items-center gap-1 text-[10px] text-navy font-medium hover:text-navy-dark"><Plus size={11} /> Add Question</button>
                    <button onClick={async () => {
                      const count = parseInt(await promptDialog({ title: 'Bulk add multiple-choice questions', message: 'Up to 50 at a time.', placeholder: 'How many?', confirmLabel: 'Add' }) || '0')
                      if (count > 0 && count <= 50) {
                        const newQs = Array.from({ length: count }, (_, i) => ({ num: questionMap.length + i + 1, type: 'mc', max_points: 1, standard: '', answer_key: '' }))
                        setQuestionMap([...questionMap, ...newQs])
                      }
                    }} className="inline-flex items-center gap-1 text-[10px] text-text-tertiary font-medium hover:text-navy"><Plus size={11} /> Bulk Add</button>
                    {standards.length > 0 && (
                      <button onClick={async () => {
                        const rangeStr = await promptDialog({ title: 'Apply a standard to a range', message: 'Which questions? Enter a range like 1-5, or "all".', placeholder: 'e.g. 1-5', confirmLabel: 'Next' })
                        if (!rangeStr) return
                        const stdCode = await promptDialog({ title: 'Which standard?', message: `Available: ${standards.join(', ')}`, placeholder: 'e.g. RL.3.1', confirmLabel: 'Apply' })
                        if (!stdCode || !standards.includes(stdCode)) return
                        const nm = [...questionMap]
                        if (rangeStr.toLowerCase() === 'all') {
                          nm.forEach(q => { q.standard = stdCode })
                        } else {
                          const [start, end] = rangeStr.split('-').map(Number)
                          if (start && end) nm.forEach(q => { if (q.num >= start && q.num <= end) q.standard = stdCode })
                          else if (start) nm.forEach(q => { if (q.num === start) q.standard = stdCode })
                        }
                        setQuestionMap(nm)
                      }} className="inline-flex items-center gap-1 text-[10px] text-text-tertiary font-medium hover:text-navy">⚡ Set Standard (range)</button>
                    )}
                  </div>
                  <span className="text-[10px] text-text-tertiary font-semibold">
                    {questionMap.length} Q · {questionMap.reduce((s, q) => s + q.max_points, 0)} pts total
                  </span>
                </div>
                <p className="text-[9px] text-text-tertiary">Question map enables item-by-item entry and analysis. For MC/T-F, set answer keys for auto-scoring. Standards tag each question for mastery rollups.</p>
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
  const [viewMode, setViewMode] = useState<'1' | '3'>('3')

  const year = Number(month.split('-')[0])
  const mon = Number(month.split('-')[1]) - 1

  const prevMonth = () => { const step = viewMode === '3' ? 3 : 1; const d = new Date(year, mon - step, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setSelectedDate(null) }
  const nextMonth = () => { const step = viewMode === '3' ? 3 : 1; const d = new Date(year, mon + step, 1); setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); setSelectedDate(null) }

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

  const selectedAssessments = selectedDate ? (byDate[selectedDate] || []) : []

  // Build month data for 1 or 3 months
  const monthsToShow = viewMode === '3' ? [0, 1, 2] : [0]
  const monthData = monthsToShow.map(offset => {
    const mYear = new Date(year, mon + offset, 1).getFullYear()
    const mMon = new Date(year, mon + offset, 1).getMonth()
    const firstDayOfWeek = new Date(mYear, mMon, 1).getDay()
    const daysCount = new Date(mYear, mMon + 1, 0).getDate()
    const label = new Date(mYear, mMon, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const key = `${mYear}-${String(mMon + 1).padStart(2, '0')}`
    const days: (number | null)[] = []
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null)
    for (let d = 1; d <= daysCount; d++) days.push(d)
    while (days.length % 7 !== 0) days.push(null)
    return { mYear, mMon, firstDayOfWeek, daysCount, label, key, days }
  })

  const renderCalendar = (md: typeof monthData[0], compact: boolean) => (
    <div key={md.key} className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-surface-alt border-b border-border text-center">
        <h3 className={`${compact ? 'text-[12px]' : 'text-[14px]'} font-bold text-navy`}>{md.label}</h3>
      </div>
      <div className="grid grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`${md.key}-h-${i}`} className={`py-1 text-center ${compact ? 'text-[7px]' : 'text-[9px]'} font-semibold text-text-tertiary uppercase border-b border-border bg-surface-alt/50`}>{d}</div>
        ))}
        {md.days.map((day, i) => {
          if (day === null) return <div key={`${md.key}-e-${i}`} className={`${compact ? 'min-h-[40px]' : 'min-h-[72px]'} border-b border-r border-border/30 bg-surface-alt/20`} />
          const dateStr = `${md.mYear}-${String(md.mMon + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayAssessments = byDate[dateStr] || []
          const isToday = dateStr === new Date().toISOString().split('T')[0]
          const isSelected = dateStr === selectedDate
          const isWeekend = i % 7 === 0 || i % 7 === 6
          return (
            <div key={dateStr} onClick={() => dayAssessments.length > 0 ? setSelectedDate(isSelected ? null : dateStr) : null}
              className={`${compact ? 'min-h-[40px]' : 'min-h-[72px]'} border-b border-r border-border/30 p-0.5 transition-all ${
                isSelected ? 'bg-navy/5 ring-1 ring-navy/30' : dayAssessments.length > 0 ? 'cursor-pointer hover:bg-surface-alt' : ''
              } ${isWeekend ? 'bg-surface-alt/30' : ''}`}>
              <div className={`${compact ? 'text-[9px]' : 'text-[10px]'} font-medium ${isToday ? 'text-white bg-navy rounded-full w-5 h-5 flex items-center justify-center mx-auto' : 'text-text-secondary text-right px-0.5'}`}>{day}</div>
              {compact ? (
                dayAssessments.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
                    {dayAssessments.slice(0, 3).map(a => (
                      <span key={a.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[a.domain] }} />
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-0.5 mt-0.5">
                  {dayAssessments.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center gap-1 rounded px-1 py-0.5" style={{ backgroundColor: `${DOMAIN_COLORS[a.domain]}10` }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_COLORS[a.domain] }} />
                      <span className="text-[8px] font-medium text-text-primary truncate leading-tight">{a.name}</span>
                    </div>
                  ))}
                  {dayAssessments.length > 3 && <span className="text-[8px] text-text-tertiary px-1">+{dayAssessments.length - 3} more</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

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

      {/* View toggle + nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="px-3 py-1.5 rounded-lg hover:bg-surface-alt text-text-secondary text-[13px] border border-border">&larr; {viewMode === '3' ? 'Prev 3' : 'Prev'}</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('1')} className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${viewMode === '1' ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt border border-border'}`}>1 Month</button>
          <button onClick={() => setViewMode('3')} className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${viewMode === '3' ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt border border-border'}`}>3 Months</button>
        </div>
        <button onClick={nextMonth} className="px-3 py-1.5 rounded-lg hover:bg-surface-alt text-text-secondary text-[13px] border border-border">{viewMode === '3' ? 'Next 3' : 'Next'} &rarr;</button>
      </div>

      {/* Calendar Grid(s) */}
      {viewMode === '1' ? (
        renderCalendar(monthData[0], false)
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {monthData.map(md => renderCalendar(md, true))}
        </div>
      )}

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

      {/* Period summary */}
      {(() => {
        const visibleMonthKeys = monthData.map(m => m.key)
        const visibleAssessments = allAssessments.filter(a => a.date && visibleMonthKeys.some(k => a.date!.startsWith(k)))
        if (visibleAssessments.length === 0) return <p className="text-center text-text-tertiary text-[12px] py-4">No assessments in this period.</p>
        const byDom: Record<string, number> = {}
        visibleAssessments.forEach(a => { byDom[a.domain] = (byDom[a.domain] || 0) + 1 })
        return (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h4 className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2">{viewMode === '3' ? 'These 3 Months' : 'This Month'}: {visibleAssessments.length} assessments</h4>
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
