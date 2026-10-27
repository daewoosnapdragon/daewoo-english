'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ALL_ENGLISH_CLASSES, GRADES, DOMAINS, DOMAIN_LABELS, EnglishClass, Grade, Domain, Semester, QuestionMapItem } from '@/types'
import { classToColor, classToTextColor, calculateWeightedAverage as calcWeightedAvg, domainLabel } from '@/lib/utils'
import { Plus, Loader2, Pencil, Trash2, ChevronDown, BarChart3, User, FileText, Calendar, Download, ClipboardEdit, Save, CalendarDays, Printer } from 'lucide-react'
import { exportToCSV } from '@/lib/export'
import WIDABadge from '@/components/shared/WIDABadge'
import StudentPopover from '@/components/shared/StudentPopover'
import NewAssessmentFlow from './NewAssessmentFlow'
import KeyScoreSheet from './KeyScoreSheet'
import PointsScoreSheet from './PointsScoreSheet'
import StudentDrillDown from './StudentDrillDown'
import { Bars } from '@/components/charts'
import { itemsForDomain, touchesDomain } from '@/lib/domainSplit'
import { DOMAIN_COLOR, domainColor, domainShort } from '@/lib/domainTone'
import { loadAssessmentWeights, useAssessmentWeights } from '@/lib/assessmentWeights'
import RubricPicker from './RubricPicker'
import RubricScoreSheet from './RubricScoreSheet'
import RubricPrintDialog from './RubricPrintDialog'

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
  question_map?: QuestionMapItem[] | null
  rubric?: { name: string; band?: string; criteria: { key: string; label: string; levels: [string, string, string, string]; standard?: string }[] } | null
  rubric_id?: string | null
  mixed?: boolean
  domain_split?: Record<string, number> | null
  /** Listed in a tab that is not its own domain (a mixed or section-based paper). */
  _isMultiDomain?: boolean
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
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [showCreateFlow, setShowCreateFlow] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  // An answer-key or rubric assessment the teacher chose to score as plain
  // totals. It belongs to that one assessment and is forgotten when another
  // is picked, so every assessment opens on the sheet that fits it.
  const [totalsOnly, setTotalsOnly] = useState<string | null>(null)
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

  // ── One load for the class, every domain at once ──
  // The list for the open domain tab is derived from it, so switching tabs
  // never fetches. `loadedKey` names the grade, class and semester the list
  // belongs to; until it matches, the panel shows a spinner rather than the
  // previous class's assessments under the new class's students.
  const listKey = `${selectedGrade}|${selectedClass}|${selectedSemester || ''}`
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const allAssessmentsReq = useRef(0)
  const semesterUnresolved = !selectedSemester && semesters.length > 0
  const loadAllAssessments = useCallback(async () => {
    const req = ++allAssessmentsReq.current
    if (semesterUnresolved) return
    let query = supabase.from('assessments').select('*').eq('grade', selectedGrade).eq('english_class', selectedClass)
    if (selectedSemester) query = query.eq('semester_id', selectedSemester)
    const { data } = await query.order('date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    // A newer load already fired while this was in flight -- drop the answer.
    if (req !== allAssessmentsReq.current) return
    setAllAssessments((data || []) as Assessment[])
    setLoadedKey(listKey)
  }, [selectedGrade, selectedClass, selectedSemester, semesterUnresolved, listKey])
  useEffect(() => { loadAllAssessments() }, [loadAllAssessments])
  const listReady = loadedKey === listKey

  // /grades?assessment=<id> (from the dashboard's grading queue) opens that
  // assessment directly. Read from the URL in an effect rather than through
  // useSearchParams, which would force a Suspense boundary on the route.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('new')) { setShowCreateFlow(true); window.history.replaceState(null, '', '/grades') }
    const id = params.get('assessment')
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

  // The open tab's assessments: its own, plus mixed papers and older
  // section-based papers that put points in it.
  const assessments = useMemo(() => {
    if (!listReady) return []
    const inTab = (a: Assessment) => a.domain === selectedDomain || touchesDomain(a, selectedDomain) || (Array.isArray(a.sections) && a.sections.some((s: any) => s.domain === selectedDomain))
    return allAssessments.filter(inTab).map(a => a.domain === selectedDomain ? a : { ...a, _isMultiDomain: true })
      .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''))
  }, [allAssessments, selectedDomain, listReady])

  // Keep the selection when it is still in the list (a mixed paper is in
  // more than one tab); otherwise open the newest. Read through a ref so a
  // list refresh never captures a stale selection.
  const selectedAssessmentRef = useRef<Assessment | null>(null)
  selectedAssessmentRef.current = selectedAssessment
  useEffect(() => {
    if (!listReady) return
    const cur = selectedAssessmentRef.current
    if (assessments.length === 0) { if (cur) setSelectedAssessment(null); return }
    const fresh = cur ? assessments.find(a => a.id === cur.id) : undefined
    if (!fresh) setSelectedAssessment(assessments[assessments.length - 1])
    else if (fresh !== cur) setSelectedAssessment(fresh)
  }, [assessments, listReady])
  useEffect(() => { setTotalsOnly(null) }, [selectedAssessment?.id])

  useEffect(() => {
    if (currentTeacher?.role === 'teacher' && currentTeacher.english_class !== 'Admin')
      setSelectedClass(currentTeacher.english_class as EnglishClass)
  }, [currentTeacher])

  // Grade, class or semester changed: the selection belonged to the old list.
  const leaveList = () => { setSelectedAssessment(null); setEditingAssessment(null) }

  const handleDeleteAssessment = async (a: Assessment) => {
    if (!await confirmDialog({ title: lang === 'ko' ? `"${a.name}" 삭제` : `Delete "${a.name}"?`, message: lang === 'ko' ? '모든 점수가 함께 삭제됩니다.' : 'All its scores will be deleted. This cannot be undone.', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Delete', cancelLabel: lang === 'ko' ? '취소' : 'Cancel' })) return
    await supabase.from('grades').delete().eq('assessment_id', a.id)
    const { error } = await supabase.from('assessments').delete().eq('id', a.id)
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(lang === 'ko' ? '삭제되었습니다' : `Deleted "${a.name}"`)
    setAllAssessments(prev => prev.filter(x => x.id !== a.id))
    if (editingAssessment?.id === a.id) setEditingAssessment(null)
  }
  // A change made from the sheet (a rubric swapped in, a total changed) lands in the list without a refetch.
  const patchAssessment = (a: Assessment) => {
    setAllAssessments(prev => prev.map(x => x.id === a.id ? { ...x, ...a } : x))
    setSelectedAssessment(prev => prev && prev.id === a.id ? { ...prev, ...a } : prev)
  }

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
            {subView === 'entry' && !showCreateFlow && !editingAssessment && (
              <button data-guide="grades.new" onClick={() => setShowCreateFlow(true)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded text-[13px] font-semibold bg-accent text-white hover:bg-accent-hover">
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
            <select value={selectedSemester || ''} onChange={e => { leaveList(); setSelectedSemester(e.target.value || null) }}
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
          <select value={selectedGrade} onChange={e => { const g = Number(e.target.value) as Grade; leaveList(); setSelectedGrade(g); localStorage.setItem('daewoo_grade_tab_grade', String(g)) }}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {availableClasses.length > 1 ? (
            <div className="flex gap-1">
              {availableClasses.map(cls => (
                <button key={cls} onClick={() => { leaveList(); setSelectedClass(cls); localStorage.setItem('daewoo_grade_tab_class', cls) }}
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

        {subView === 'entry' && (showCreateFlow || editingAssessment) && (
          <div className="mb-6">
            <NewAssessmentFlow key={editingAssessment?.id || 'new'} grade={selectedGrade} englishClass={selectedClass} domain={selectedDomain} semesterId={selectedSemester}
              editing={editingAssessment}
              onClose={() => { setShowCreateFlow(false); setEditingAssessment(null) }}
              onCreated={a => { setShowCreateFlow(false); setSelectedDomain(a.domain); setAllAssessments(prev => [...prev, a]); setSelectedAssessment(a); loadAllAssessments() }}
              onSaved={a => { setEditingAssessment(null); setSelectedDomain(a.domain); patchAssessment(a); loadAllAssessments() }} />
          </div>
        )}
        {subView === 'entry' && !editingAssessment && (
          <ScoreEntryView selectedDomain={selectedDomain} setSelectedDomain={setSelectedDomain} assessments={assessments} allAssessments={allAssessments} selectedAssessment={selectedAssessment} setSelectedAssessment={setSelectedAssessment}
            students={students} loadingStudents={loadingStudents} listReady={listReady} lang={lang} catLabel={catLabel} selectedClass={selectedClass} selectedGrade={selectedGrade} selectedSemester={selectedSemester}
            handleDeleteAssessment={handleDeleteAssessment} onEditAssessment={a => { setShowCreateFlow(false); setEditingAssessment(a) }} onCreateAssessment={() => setShowCreateFlow(true)} createLabel={lang === 'ko' ? '새 평가' : 'New assessment'}
            onSheetSaved={() => loadAllAssessments()} totalsOnly={totalsOnly} setTotalsOnly={setTotalsOnly} onPatched={patchAssessment} />
        )}
        {subView === 'batch' && <BatchGridView selectedDomain={selectedDomain} setSelectedDomain={(d: Domain) => setSelectedDomain(d)} allAssessments={allAssessments} students={students} selectedClass={selectedClass} selectedGrade={selectedGrade} lang={lang} />}
        {subView === 'overview' && <DomainOverview allAssessments={allAssessments} selectedGrade={selectedGrade} selectedClass={selectedClass} lang={lang} />}
        {subView === 'student' && <StudentDrillDown allAssessments={allAssessments as any} students={students} selectedStudentId={selectedStudentId} setSelectedStudentId={setSelectedStudentId} selectedGrade={selectedGrade} selectedClass={selectedClass} selectedSemester={selectedSemester} lang={lang}
          onOpenAssessment={(a: any) => { setSubView('entry'); setSelectedDomain(a.domain); setSelectedAssessment(a) }} />}
        {subView === 'calendar' && <AssessmentCalendarView allAssessments={allAssessments} lang={lang} />}
      </div>
    </div>
  )
}

// ─── Score Entry ─────────────────────────────────────────────────────
// The domain tabs, the assessments in the open tab, and the sheet for the
// one that is selected. Each assessment opens on the sheet that fits how it
// is scored: the rubric sheet, the answer sheet, the older section entry,
// or the points sheet. "Totals only" puts an answer-key or rubric
// assessment on the points sheet for that assessment alone.

function ScoreEntryView({ selectedDomain, setSelectedDomain, assessments, allAssessments, selectedAssessment, setSelectedAssessment, students, loadingStudents, listReady, lang, catLabel, selectedClass, selectedGrade, selectedSemester, handleDeleteAssessment, onEditAssessment, onCreateAssessment, createLabel, onSheetSaved, totalsOnly, setTotalsOnly, onPatched }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; assessments: Assessment[]; allAssessments: Assessment[]; selectedAssessment: Assessment | null; setSelectedAssessment: (a: Assessment | null) => void
  students: StudentRow[]; loadingStudents: boolean; listReady: boolean; lang: LangKey; catLabel: (t: string) => string; selectedClass: EnglishClass; selectedGrade: Grade; selectedSemester: string | null
  handleDeleteAssessment: (a: Assessment) => void; onEditAssessment: (a: Assessment) => void; onCreateAssessment: () => void; createLabel: string; onSheetSaved: () => void
  totalsOnly: string | null; setTotalsOnly: (id: string | null) => void; onPatched: (a: Assessment) => void
}) {
  const { showToast } = useApp()
  const ko = lang === 'ko'
  const [rubricOpen, setRubricOpen] = useState(false)
  const [rubricPrintOpen, setRubricPrintOpen] = useState(false)
  const a = selectedAssessment
  const hasMap = !!(a?.question_map && a.question_map.length > 0)
  const kind: 'rubric' | 'key' | 'sections' | 'points' = !a ? 'points' : a.rubric ? 'rubric' : hasMap ? 'key' : a.sections && a.sections.length > 0 ? 'sections' : 'points'
  const view = a && (kind === 'rubric' || kind === 'key') && totalsOnly === a.id ? 'points' : kind
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const btn = 'inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-[12.5px] font-medium text-ink-2 hover:text-ink'
  const SHORT: Record<string, string> = { reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards' }
  const kindLabel = !a ? '' : kind === 'rubric' ? (ko ? '루브릭' : 'rubric') : kind === 'key' ? `${a.question_map!.length} ${ko ? '문항' : a.question_map!.length === 1 ? 'question' : 'questions'}` : kind === 'sections' ? (ko ? '섹션' : 'sections') : (ko ? '총점만' : 'points only')
  return (
    <>
      {rubricPrintOpen && a?.rubric && (
        <RubricPrintDialog rubric={a.rubric} title={a.name} subtitle={`${selectedClass} · ${ko ? `${selectedGrade}학년` : `Grade ${selectedGrade}`}`} students={students.map(s => ({ id: s.id, name: s.english_name }))} maxScore={a.max_score} onClose={() => setRubricPrintOpen(false)} />
      )}
      {rubricOpen && a && (
        <RubricPicker grade={selectedGrade} englishClass={selectedClass} onClose={() => setRubricOpen(false)}
          onUse={async r => {
            // Snapshot the rubric onto the assessment; the total becomes 4 per criterion.
            const snapshot = { name: r.name, band: r.band, criteria: r.criteria }
            const maxScore = r.criteria.length * 4
            const { error } = await supabase.from('assessments').update({ rubric: snapshot, rubric_id: r.rubric_id, max_score: maxScore }).eq('id', a.id)
            if (error) { showToast(`Error: ${error.message}${error.message.includes('rubric') ? ' · run supabase/migration-rubrics.sql first' : ''}`); return }
            setRubricOpen(false)
            onPatched({ ...a, rubric: snapshot, rubric_id: r.rubric_id, max_score: maxScore })
            setTotalsOnly(null)
          }} />
      )}
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto">
        {DOMAINS.map(d => (
          <button key={d} onClick={() => setSelectedDomain(d)} className={`px-4 py-2.5 text-[12px] font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${selectedDomain === d ? 'border-navy text-navy' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
            {SHORT[d] || DOMAIN_LABELS[d][lang]}
            {(() => { const n = allAssessments.filter(a => a.domain === d || touchesDomain(a, d)).length; return n > 0 ? <span className="ml-1.5 text-[10px] bg-accent-light text-navy px-1.5 py-0.5 rounded-full font-bold">{n}</span> : null })()}
          </button>
        ))}
      </div>

      {assessments.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="eyebrow mr-1">{ko ? '평가' : 'Assessment'}</span>
          {assessments.map(x => {
            const on = a?.id === x.id
            const partHere = x.mixed && x.domain_split && Number(x.domain_split[selectedDomain] || 0) > 0 && x.domain !== selectedDomain
            return (
              <button key={x.id} onClick={() => setSelectedAssessment(x)} className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`}>
                <span>{x.name}</span>
                <span className={on ? 'opacity-70' : 'text-ink-3'} title={partHere ? (ko ? `이 탭에는 ${x.max_score}점 중 ${x.domain_split![selectedDomain]}점이 반영됩니다` : `${x.domain_split![selectedDomain]} of the ${x.max_score} points count in this tab`) : undefined}>{partHere ? `/${x.domain_split![selectedDomain]} of ${x.max_score}` : `/${x.max_score}`}</span>
                {x.mixed && x.domain_split
                  ? <span className={`inline-flex items-center gap-1 text-[9.5px] px-1 py-0.5 rounded font-bold ${on ? 'bg-paper/20' : 'bg-paper-2'}`} title={Object.entries(x.domain_split).filter(([, v]) => Number(v) > 0).map(([d, v]) => `${domainLabel(d)} ${v}`).join(' · ')}>
                      {Object.entries(x.domain_split).filter(([, v]) => Number(v) > 0).map(([d, v]) => <span key={d} style={{ color: on ? undefined : domainColor(d) }}>{domainShort(d)} {v}</span>)}
                    </span>
                  : x._isMultiDomain && <span className={`text-[9.5px] px-1 py-0.5 rounded font-bold ${on ? 'bg-paper/20' : 'bg-paper-2 text-ink-2'}`}>Multi</span>}
                {x.type !== 'formative' && <span className={`text-[10px] px-1 py-0.5 rounded ${on ? 'bg-paper/20' : 'bg-paper-2 text-ink-2'}`}>{catLabel(x.type)}</span>}
                {x.date && <span className={`text-[10.5px] ${on ? 'opacity-60' : 'text-ink-3'}`}>{fmtDate(x.date)}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="bg-surface border border-rule-2 rounded-lg overflow-hidden">
        {loadingStudents || !listReady ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" /><p className="text-text-tertiary text-sm">Loading...</p></div>
        ) : !a ? (
          <div className="p-12 text-center">
            <h3 className="font-display text-lg font-semibold text-navy mb-1">{assessments.length === 0 ? (ko ? '평가를 먼저 생성하세요' : 'Create your first assessment') : (ko ? '평가를 선택하세요' : 'Select an assessment above')}</h3>
            <p className="text-text-tertiary text-sm max-w-md mx-auto">{assessments.length === 0 ? (ko ? '"새 평가" 버튼을 클릭하여 시작하세요.' : 'Click "New assessment" to get started. Name it, pick how it is scored, then score it on the sheet.') : ''}</p>
            {assessments.length === 0 && <button onClick={onCreateAssessment} className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all"><Plus size={15} /> {createLabel}</button>}
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-rule-2 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-baseline gap-3 min-w-0">
                <span className="font-display text-[20px] leading-none text-ink truncate">{a.name}</span>
                <span className="text-[12px] text-ink-3 whitespace-nowrap">/{a.max_score} · {catLabel(a.type)}{a.date ? ` · ${fmtDate(a.date)}` : ''} · {kindLabel}</span>
                {a.description && <span className="text-[11.5px] text-ink-3 truncate max-w-[280px]" title={a.description}>{a.description}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {kind === 'rubric' && view === 'rubric' && (
                  <>
                    <button onClick={() => setRubricOpen(true)} className={btn}>{ko ? '루브릭 변경' : 'Change rubric'}</button>
                    <button onClick={() => setRubricPrintOpen(true)} title={ko ? '루브릭 인쇄 (전체 · 반 · 1/4 페이지)' : 'Print the rubric: full, half or quarter page'} className={btn}><Printer size={12} />{ko ? '인쇄' : 'Print'}</button>
                  </>
                )}
                {(kind === 'rubric' || kind === 'key') && (view === 'points'
                  ? <button onClick={() => setTotalsOnly(null)} className={btn}>{kind === 'rubric' ? (ko ? '루브릭으로 채점' : 'Rubric sheet') : (ko ? '답안지로 채점' : 'Answer sheet')}</button>
                  : <button onClick={() => setTotalsOnly(a.id)} title={ko ? '문항별 채점 대신 학생별 총점만 입력' : 'Type one total per student instead of marking the paper'} className={btn}>{ko ? '총점만 입력' : 'Totals only'}</button>)}
                <CrossClassCompare assessmentName={a.name} domain={a.domain} maxScore={a.max_score} currentClass={selectedClass} grade={selectedGrade} semesterId={selectedSemester || ''} />
                <button onClick={() => onEditAssessment(a)} title={ko ? '이름, 날짜, 정답 키, 루브릭, 기준 수정' : 'Change the name, date, key, rubric or standards'} className={btn}><Pencil size={12} />{ko ? '수정' : 'Edit'}</button>
                <button onClick={() => handleDeleteAssessment(a)} title={ko ? '평가와 모든 점수 삭제' : 'Delete the assessment and every score'} className={`${btn} hover:text-bad hover:border-bad`}><Trash2 size={12} /></button>
              </div>
            </div>
            {view === 'rubric' ? (
              <div className="p-4"><RubricScoreSheet key={a.id + ':' + a.rubric!.criteria.length} assessment={a as any} students={students} onSaved={onSheetSaved} onExit={() => setTotalsOnly(a.id)} /></div>
            ) : view === 'key' ? (
              <div className="p-4"><KeyScoreSheet key={a.id} assessment={a as any} students={students} currentDomain={selectedDomain} onSaved={onSheetSaved} /></div>
            ) : view === 'sections' ? (
              <SectionScoreEntry assessment={a} students={students} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} selectedSemester={selectedSemester || ''} catLabel={catLabel} />
            ) : (
              <PointsScoreSheet key={a.id} assessment={a} students={students} currentDomain={selectedDomain} onSaved={onSheetSaved} />
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

// ─── Batch Grid View ──────────────────────────────────────────────

function BatchGridView({ selectedDomain, setSelectedDomain, allAssessments, students, selectedClass, selectedGrade, lang }: {
  selectedDomain: Domain; setSelectedDomain: (d: Domain) => void; allAssessments: Assessment[]; students: StudentRow[]; selectedClass: EnglishClass; selectedGrade: Grade; lang: LangKey
}) {
  const weightTable = useAssessmentWeights()
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
                  const avg = calcWeightedAvg(weightedItems, Number(selectedGrade), null, selectedClass, weightTable)
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
        const weightTable = await loadAssessmentWeights()
        for (const domain of DOMAINS) {
          const da = allAssessments.filter((a: any) => touchesDomain(a, domain))
          if (!result[domain]) result[domain] = { avg: null, count: 0, assessmentCount: 0, assessments: [] }
          result[domain].assessmentCount = da.length
          if (da.length === 0) continue
          const ids = da.map((a: any) => a.id)
          if (ids.length === 0) continue
          const { data: grades } = await supabase.from('grades').select('score, assessment_id, is_exempt, is_absent, domain_scores').in('assessment_id', ids).not('score', 'is', null)
          if (cancelled) return
          if (grades && grades.length > 0) {
            // Every grade row becomes one weighted item in this domain; a mixed
            // assessment contributes only the points it routed here.
            const allItems = grades.flatMap((g: any) => { const a = da.find((x: any) => x.id === g.assessment_id); return a ? itemsForDomain(domain, [a], () => g) : [] })
            result[domain].count = allItems.length
            result[domain].avg = calcWeightedAvg(allItems, Number(selectedGrade || 3), null, selectedClass, weightTable)
            for (const a of da) {
              const mine = grades.filter((g: any) => g.assessment_id === a.id)
              const aItems = mine.flatMap((g: any) => itemsForDomain(domain, [a], () => g))
              if (aItems.length > 0) {
                const avg = aItems.reduce((sum: number, it: any) => sum + (it.score / it.maxScore) * 100, 0) / aItems.length
                // A mixed paper shows its part here and the whole-paper average beside it.
                const wholeRows = a.mixed ? mine.filter((g: any) => !g.is_absent && !g.is_exempt && g.score != null) : []
                const whole = a.mixed && wholeRows.length && Number(a.max_score) > 0 ? wholeRows.reduce((sum: number, g: any) => sum + (Number(g.score) / Number(a.max_score)) * 100, 0) / wholeRows.length : null
                result[domain].assessments.push({ name: a.mixed ? `${a.name} · ${domainLabel(domain)} part` : a.name, avg, whole })
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
          <Bars rows={DOMAINS.map(domain => ({ label: DOMAIN_LABELS[domain][lang], a: stats[domain].avg, sub: `${stats[domain].assessmentCount} ${lang === 'ko' ? '개 평가' : stats[domain].assessmentCount === 1 ? 'assessment' : 'assessments'}`, tone: stats[domain].avg != null && stats[domain].avg! < 70 ? 'bad' as const : undefined }))} />
        </div>
      )}

      {/* Per-domain assessment breakdown with mini bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DOMAINS.map(domain => {
          const s = stats[domain]
          if (s.assessmentCount === 0) return null
          const color = DOMAIN_COLOR[domain]
          return (
            <div key={domain} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between" style={{ backgroundColor: `${color}08` }}>
                <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color }}>{DOMAIN_LABELS[domain][lang]}</span>
                {s.avg != null && <span className="text-[14px] font-bold" style={{ color }}>{s.avg.toFixed(1)}%</span>}
              </div>
              <div className="p-4 space-y-2">
                {s.assessments.length > 0 ? s.assessments.map((a: { name: string; avg: number; whole?: number | null }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary w-28 truncate text-right" title={a.name}>{a.name}</span>
                    <div className="flex-1 h-5 bg-surface-alt rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-500 flex items-center" style={{ width: `${Math.max(a.avg, 3)}%`, backgroundColor: `${color}CC` }}>
                        {a.avg > 15 && <span className="text-[9px] font-bold text-white ml-1.5">{a.avg.toFixed(0)}%</span>}
                      </div>
                    </div>
                    {a.avg <= 15 && <span className="text-[9px] font-medium text-text-tertiary">{a.avg.toFixed(0)}%</span>}
                    {a.whole != null && <span className="text-[9px] text-text-tertiary whitespace-nowrap" title={lang === 'ko' ? '시험지 전체 평균' : 'Class average on the whole paper'}>{lang === 'ko' ? '전체' : 'whole'} {a.whole.toFixed(0)}%</span>}
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
