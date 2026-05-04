'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor, calculateWeightedAverage as calcWeightedAvg } from '@/lib/utils'
import { Loader2, Printer, User, Users, ChevronLeft, ChevronRight, Plus, Camera, BarChart3, ClipboardCheck, CheckCircle2, Circle, XCircle } from 'lucide-react'

type LangKey = 'en' | 'ko'

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
type Domain = typeof DOMAINS[number]
const DOMAIN_SHORT: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking', language: 'Language',
}
const DOMAIN_LONG: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics & Foundational Skills', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language Standards',
}
const DOMAIN_PRINT: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking', language: 'Language',
}

const SCALE_DISPLAY = [
  { letter: 'A+', range: '97-100%' }, { letter: 'A', range: '93-96%' }, { letter: 'A-', range: '90-92%' },
  { letter: 'B+', range: '87-89%' }, { letter: 'B', range: '83-86%' }, { letter: 'B-', range: '80-82%' },
  { letter: 'C+', range: '77-79%' }, { letter: 'C', range: '73-76%' }, { letter: 'C-', range: '70-72%' },
  { letter: 'D+', range: '67-69%' }, { letter: 'D', range: '63-66%' }, { letter: 'D-', range: '60-62%' },
  { letter: 'E', range: '0-59%' },
]

function getLetterGrade(score: number): string {
  const r = Math.round(score)
  if (r >= 97) return 'A+'; if (r >= 93) return 'A'; if (r >= 90) return 'A-'
  if (r >= 87) return 'B+'; if (r >= 83) return 'B'; if (r >= 80) return 'B-'
  if (r >= 77) return 'C+'; if (r >= 73) return 'C'; if (r >= 70) return 'C-'
  if (r >= 67) return 'D+'; if (r >= 63) return 'D'; if (r >= 60) return 'D-'
  return 'E'
}

function letterColor(l: string): string {
  if (l.startsWith('A')) return '#16a34a'; if (l.startsWith('B')) return '#2563eb'
  if (l.startsWith('C')) return '#d97706'; if (l.startsWith('D')) return '#dc2626'; return '#dc2626'
}

function tileBgClass(v: number): string {
  if (v >= 90) return 'bg-green-50 border-green-200'
  if (v >= 80) return 'bg-blue-50 border-blue-200'
  if (v >= 70) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}
function tileBgPrint(v: number): { bg: string; border: string } {
  if (v >= 90) return { bg: '#f0fdf4', border: '#bbf7d0' }
  if (v >= 80) return { bg: '#eff6ff', border: '#bfdbfe' }
  if (v >= 70) return { bg: '#fffbeb', border: '#fde68a' }
  return { bg: '#fef2f2', border: '#fecaca' }
}

interface ReportData {
  student: any
  domainGrades: Record<string, number | null>
  domainNa: Record<string, boolean>
  domainStudentNa: Record<string, boolean>
  domainClassNa: Record<string, boolean>
  overallGrade: number | null
  overallLetter: string
  classAverages: Record<string, number | null>
  classOverall: number | null
  prevDomainGrades: Record<string, number | null> | null
  prevOverall: number | null
  prevSemesterName: string | null
  comment: string
  teacherName: string
  teacherPhotoUrl: string | null
  semesterName: string
  latestReading: any | null
  semesterGrade: number | null
  semesterClass: string | null
  behaviorCount: number
  behaviorGrade: string | null
  totalAtt: number
  attCounts: { present: number; absent: number; tardy: number }
  scaffolds: any[]
  goals: any[]
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReportsView() {
  const { t, language, currentTeacher } = useApp()
  const lang = language as LangKey
  const [mode, setMode] = useState<'individual' | 'progress' | 'class' | 'review'>('individual')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const { semesters } = useSemesters()
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null)

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ALL_ENGLISH_CLASSES
  const { students } = useStudents({ grade: selectedGrade, english_class: selectedClass })
  const selectedSemester = semesters.find((s: any) => s.id === selectedSemesterId)

  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      const active = semesters.find((s: any) => s.is_active)
      setSelectedSemesterId(active?.id || semesters[0].id)
    }
  }, [semesters, selectedSemesterId])

  const currentIdx = students.findIndex((s: any) => s.id === selectedStudentId)
  const prevStudent = () => { if (currentIdx > 0) setSelectedStudentId(students[currentIdx - 1].id) }
  const nextStudent = () => { if (currentIdx < students.length - 1) setSelectedStudentId(students[currentIdx + 1].id) }

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.reports.title}</h2>
        <p className="text-text-secondary text-sm mt-1">Generate report cards matching school format</p>
        <div className="flex gap-1 mt-4">
          <button onClick={() => setMode('individual')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'individual' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><User size={14} /> Report Card</button>
          <button onClick={() => setMode('progress')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'progress' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><BarChart3 size={14} /> Progress Report</button>
          <button onClick={() => setMode('class')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'class' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><Users size={14} /> Class Summary</button>
          <button onClick={() => setMode('review')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'review' ? 'bg-amber-600 text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><ClipboardCheck size={14} /> Review & Approve</button>
        </div>
      </div>

      <div className="px-10 py-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {semesters.length > 0 && (
            <select value={selectedSemesterId || ''} onChange={(e: any) => setSelectedSemesterId(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map((sem: any) => <option key={sem.id} value={sem.id}>{sem.name}</option>)}
            </select>
          )}
          <select value={selectedGrade} onChange={(e: any) => setSelectedGrade(Number(e.target.value) as Grade)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map((g: any) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <div className="flex gap-1">
            {availableClasses.map((cls: any) => (
              <button key={cls} onClick={() => setSelectedClass(cls)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${selectedClass === cls ? 'text-white shadow-sm' : 'hover:opacity-80'}`}
                style={{ backgroundColor: selectedClass === cls ? classToTextColor(cls) : classToColor(cls), color: selectedClass === cls ? 'white' : classToTextColor(cls) }}>{cls}</button>
            ))}
          </div>
          {(mode === 'individual' || mode === 'progress') && (
            <>
              <div className="w-px h-6 bg-border" />
              <select value={selectedStudentId || ''} onChange={(e: any) => setSelectedStudentId(e.target.value || null)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy min-w-[200px]">
                <option value="">Select student...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
              </select>
              {selectedStudentId && (
                <div className="flex gap-1">
                  <button onClick={prevStudent} disabled={currentIdx <= 0} className="p-1.5 rounded-lg border border-border hover:bg-surface-alt disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <button onClick={nextStudent} disabled={currentIdx >= students.length - 1} className="p-1.5 rounded-lg border border-border hover:bg-surface-alt disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
              )}
            </>
          )}
        </div>

        {mode === 'individual' && selectedStudentId && selectedSemesterId && selectedSemester && (
          <IndividualReport key={selectedStudentId} studentId={selectedStudentId} semesterId={selectedSemesterId} semester={selectedSemester} students={students} allSemesters={semesters} lang={lang} selectedClass={selectedClass} />
        )}
        {mode === 'individual' && !selectedStudentId && selectedSemesterId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-text-tertiary mb-4">Select a student to generate their report card, or print all at once.</p>
            <BatchPrintButton students={students} semesterId={selectedSemesterId} className={selectedClass} />
          </div>
        )}
        {mode === 'individual' && !selectedStudentId && !selectedSemesterId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">Select a student to generate their report card.</div>
        )}
        {mode === 'progress' && selectedStudentId && selectedSemesterId && selectedSemester && (
          <ProgressReport key={`prog-${selectedStudentId}`} studentId={selectedStudentId} semesterId={selectedSemesterId} semester={selectedSemester} students={students} allSemesters={semesters} lang={lang} selectedClass={selectedClass} />
        )}
        {mode === 'progress' && !selectedStudentId && selectedSemesterId && selectedSemester && (
          <ProgressClassOverview students={students} semesterId={selectedSemesterId} semester={selectedSemester}
            selectedClass={selectedClass} selectedGrade={selectedGrade}
            onSelectStudent={(id: string) => setSelectedStudentId(id)} />
        )}
        {mode === 'progress' && !selectedStudentId && !selectedSemesterId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">Select a semester to view the class overview.</div>
        )}
        {mode === 'class' && selectedSemesterId && selectedSemester && (
          <ClassSummary students={students} semesterId={selectedSemesterId} semester={selectedSemester} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} />
        )}
        {mode === 'review' && selectedSemesterId && (
          <ReviewApproval students={students} semesterId={selectedSemesterId} selectedClass={selectedClass} selectedGrade={selectedGrade} />
        )}
      </div>
    </div>
  )
}

// ─── Info Cell ───────────────────────────────────────────────────────

function InfoCell({ label, value, bold = false }: { label: string; value: any; bold?: boolean }) {
  return (
    <div className="py-1.5 border-b border-[#DFE4EB]">
      <div className="text-[9px] text-[#94a3b8] font-semibold tracking-wide">{label}</div>
      <div className={`text-[13px] text-[#1e293b] mt-0.5 ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</div>
    </div>
  )
}

// ─── Individual Report Card ─────────────────────────────────────────

// ─── Radar Chart (Pentagon) ──────────────────────────────────────────

function RadarChart({ studentGrades, classAverages }: {
  studentGrades: Record<string, number | null>
  classAverages: Record<string, number | null>
}) {
  const size = 300
  const cx = size / 2, cy = size / 2 + 4
  const maxR = 80
  const levels = [20, 40, 60, 80, 100]
  const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const labels = ['Reading', 'Phonics', 'Writing', 'Speaking &\nListening', 'Language\nStandards']
  const angles = domains.map((_, i) => (Math.PI * 2 * i) / domains.length - Math.PI / 2)

  const toXY = (angle: number, pct: number) => ({
    x: cx + Math.cos(angle) * (pct / 100) * maxR,
    y: cy + Math.sin(angle) * (pct / 100) * maxR,
  })

  const makePolygon = (values: (number | null)[]) => {
    return values.map((v, i) => {
      const pt = toXY(angles[i], v ?? 0)
      return `${pt.x},${pt.y}`
    }).join(' ')
  }

  const studentValues = domains.map(d => studentGrades[d])
  const classValues = domains.map(d => classAverages[d])
  const filledCount = studentValues.filter(v => v != null).length
  const hasClass = classValues.some(v => v != null)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto" style={{ maxWidth: '100%' }}>
      {/* Background grid rings */}
      {levels.map(lvl => (
        <polygon key={lvl}
          points={angles.map(a => { const p = toXY(a, lvl); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="#C8CED8" strokeWidth={lvl === 60 ? 0.8 : 0.5}
          strokeDasharray={lvl === 100 ? undefined : '2,2'}
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const end = toXY(a, 100)
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#C8CED8" strokeWidth={0.5} />
      })}

      {/* Class average polygon */}
      {hasClass && (
        <polygon
          points={makePolygon(classValues)}
          fill="rgba(148,163,184,0.18)" stroke="#94a3b8" strokeWidth={1.5}
          strokeDasharray="4,3"
        />
      )}

      {/* Student polygon — only draw if 3+ domains, otherwise just dots */}
      {filledCount >= 3 && (
        <polygon
          points={makePolygon(studentValues)}
          fill="rgba(30,58,95,0.3)" stroke="#647FBC" strokeWidth={2.5}
        />
      )}

      {/* For 2 domains, draw a line between them */}
      {filledCount === 2 && (() => {
        const pts = studentValues.map((v, i) => v != null ? toXY(angles[i], v) : null).filter(Boolean) as { x: number; y: number }[]
        return pts.length === 2 ? <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke="#647FBC" strokeWidth={2} /> : null
      })()}

      {/* Student dots — always show */}
      {studentValues.map((v, i) => {
        if (v == null) return null
        const pt = toXY(angles[i], v)
        return <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={4} fill="#647FBC" stroke="white" strokeWidth={1.5} />
      })}

      {/* Domain labels -- positioned further out with smart anchoring */}
      {angles.map((a, i) => {
        const labelR = maxR + 38
        const pt = toXY(a, (labelR / maxR) * 100)
        const sv = studentValues[i]
        // Smart text anchor: left side = end, right side = start, top/bottom = middle
        const anchor = pt.x < cx - 10 ? 'end' : pt.x > cx + 10 ? 'start' : 'middle'
        const labelLines = labels[i].split('\n')
        return (
          <g key={`label-${i}`}>
            {labelLines.map((line, li) => (
              <text key={li} x={pt.x} y={pt.y - 5 + (li * 12) - ((labelLines.length - 1) * 6)} textAnchor={anchor} dominantBaseline="middle"
                style={{ fontSize: '10px', fontWeight: 700, fill: '#475569' }}>
                {line}
              </text>
            ))}
            {sv != null && (
              <text x={pt.x} y={pt.y + 7 + ((labelLines.length - 1) * 6)} textAnchor={anchor} dominantBaseline="middle"
                style={{ fontSize: '9px', fontWeight: 700, fill: '#647FBC' }}>
                {sv.toFixed(0)}%
              </text>
            )}
          </g>
        )
      })}

      {/* Scale labels along top axis */}
      {[60, 80, 100].map(lvl => {
        const pt = toXY(-Math.PI / 2, lvl)
        return (
          <text key={`scale-${lvl}`} x={pt.x + 10} y={pt.y + 3}
            style={{ fontSize: '7px', fill: '#94a3b8' }}>
            {lvl}
          </text>
        )
      })}
    </svg>
  )
}

function IndividualReport({ studentId, semesterId, semester, students, allSemesters, lang, selectedClass }: {
  studentId: string; semesterId: string; semester: any; students: any[]; allSemesters: any[]; lang: LangKey; selectedClass: string
}) {
  const { showToast, currentTeacher } = useApp()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentSkipped, setCommentSkipped] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [showRefPanel, setShowRefPanel] = useState(false)
  const [editingGrades, setEditingGrades] = useState(false)
  const [editGradeValues, setEditGradeValues] = useState<Record<string, string>>({})
  const [editNaValues, setEditNaValues] = useState<Record<string, boolean>>({})
  const [reviewStatus, setReviewStatus] = useState<{ partner_approved: boolean; admin_approved: boolean } | null>(null)

  // Load review status
  useEffect(() => {
    ;(async () => {
      const { data: rev } = await supabase.from('report_card_reviews').select('partner_approved, admin_approved')
        .eq('student_id', studentId).eq('semester_id', semesterId).single().catch(() => ({ data: null }))
      setReviewStatus(rev || { partner_approved: false, admin_approved: false })
    })()
  }, [studentId, semesterId])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setEditingGrades(false)
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }
    const semester = allSemesters.find((s: any) => s.id === semesterId)
    if (!semester) { setLoading(false); return }

    // ─── STEP 1: For active semesters, calculate from assessments and sync to semester_grades ───
    const isArchive = semester.type === 'archive'
    if (!isArchive) {
      const { data: assessments } = await supabase.from('assessments').select('*')
        .eq('semester_id', semesterId).eq('grade', student.grade).eq('english_class', selectedClass)
      if (assessments && assessments.length > 0) {
        // Only calculate for the selected student (not all students)
        const { data: studentGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)
          .in('assessment_id', assessments.map((a: any) => a.id))
        for (const domain of DOMAINS) {
          const domAssessments = assessments.filter((a: any) => a.domain === domain)
          const items: { score: number; maxScore: number; assessmentType: 'formative' | 'summative' | 'performance_task' }[] = []
          domAssessments.forEach((a: any) => {
            const g = (studentGrades || []).find((gr: any) => gr.assessment_id === a.id)
            if (!g || g.score == null || g.is_exempt || a.max_score <= 0) return
            items.push({ score: g.score, maxScore: a.max_score, assessmentType: a.type || 'formative' })
          })
          const avg = calcWeightedAvg(items, Number(student.grade || 3))
          if (avg != null) {
            await supabase.from('semester_grades').upsert({
              student_id: studentId, semester_id: semesterId, domain,
              calculated_grade: Math.round(avg * 10) / 10, english_class: student.english_class, grade: student.grade,
            }, { onConflict: 'student_id,semester_id,domain' })
          }
        }
      }
    }

    // ─── STEP 2: Read this student's grades from semester_grades ───
    const { data: myGrades } = await supabase.from('semester_grades').select('*')
      .eq('student_id', studentId).eq('semester_id', semesterId)
    
    const domainGrades: Record<string, number | null> = {}
    const domainStudentNa: Record<string, boolean> = {}
    let behaviorGrade: string | null = null
    DOMAINS.forEach(d => { domainGrades[d] = null; domainStudentNa[d] = false })
    ;(myGrades || []).forEach((sg: any) => {
      if (sg.domain === 'overall') {
        behaviorGrade = sg.behavior_grade || null
      } else if (DOMAINS.includes(sg.domain)) {
        // final_grade (manual override) takes priority over calculated_grade
        domainGrades[sg.domain] = sg.final_grade ?? sg.calculated_grade ?? null
        domainStudentNa[sg.domain] = !!sg.is_na
      }
    })

    // Class-level N/A settings — applied OR'd with student-level
    const sgClass = (myGrades || []).find((sg: any) => sg.english_class)?.english_class || selectedClass
    const sgGrade = (myGrades || []).find((sg: any) => sg.grade)?.grade || student.grade
    const { data: classSettings } = await supabase.from('class_report_settings').select('domain, is_na')
      .eq('semester_id', semesterId).eq('english_class', sgClass).eq('grade', sgGrade)
    const domainClassNa: Record<string, boolean> = {}
    DOMAINS.forEach(d => { domainClassNa[d] = false })
    ;(classSettings || []).forEach((r: any) => { if (DOMAINS.includes(r.domain)) domainClassNa[r.domain] = !!r.is_na })
    const domainNa: Record<string, boolean> = {}
    DOMAINS.forEach(d => { domainNa[d] = domainStudentNa[d] || domainClassNa[d] })

    const scoredDomains = DOMAINS.filter(d => !domainNa[d] && domainGrades[d] != null)
    const overallGrade = scoredDomains.length > 0 ? Math.round(scoredDomains.reduce((a: number, d) => a + (domainGrades[d] as number), 0) / scoredDomains.length * 10) / 10 : null
    const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '\u2014'

    // ─── STEP 3: Class averages from semester_grades (same semester + same class + same grade) ───
    // Excludes students whose domain is marked N/A. Domains marked class-level N/A
    // return null (every student is N/A — no average to compute).
    const classAverages: Record<string, number | null> = {}
    const { data: classSemGrades } = await supabase.from('semester_grades').select('student_id, domain, final_grade, calculated_grade, is_na')
      .eq('semester_id', semesterId).eq('english_class', sgClass).eq('grade', sgGrade)
    DOMAINS.forEach(domain => {
      if (domainClassNa[domain]) { classAverages[domain] = null; return }
      const vals = (classSemGrades || []).filter((sg: any) => sg.domain === domain && !sg.is_na)
        .map((sg: any) => sg.final_grade ?? sg.calculated_grade).filter((v: any) => v != null) as number[]
      classAverages[domain] = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : null
    })

    // ─── STEP 4: Previous semester (just query semester_grades for previous semester) ───
    let prevDomainGrades: Record<string, number | null> | null = null
    let prevOverall: number | null = null
    let prevSemesterName: string | null = null

    const typeOrder: Record<string, number> = { archive: 0, fall_mid: 1, fall_final: 2, fall: 2, spring_mid: 3, spring_final: 4, spring: 4 }
    const getYearFromSem = (s: any) => { const m = s.name?.match(/\d{4}/); return m ? parseInt(m[0]) : 2025 }
    const sortedSems = [...allSemesters].sort((a: any, b: any) => {
      const yd = getYearFromSem(a) - getYearFromSem(b)
      return yd !== 0 ? yd : (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0)
    })
    const semIdx = sortedSems.findIndex((s: any) => s.id === semesterId)
    const prevSem = semIdx > 0 ? sortedSems[semIdx - 1] : null
    if (prevSem) {
      const { data: prevGrades } = await supabase.from('semester_grades').select('*')
        .eq('student_id', studentId).eq('semester_id', prevSem.id)
      if (prevGrades && prevGrades.length > 0) {
        prevDomainGrades = {}
        DOMAINS.forEach(d => {
          const sg = prevGrades.find((g: any) => g.domain === d)
          prevDomainGrades![d] = sg ? (sg.final_grade ?? sg.calculated_grade ?? null) : null
        })
        const prevScored = DOMAINS.filter(d => prevDomainGrades![d] != null)
        prevOverall = prevScored.length > 0 ? Math.round(prevScored.reduce((a: number, d) => a + (prevDomainGrades![d] as number), 0) / prevScored.length * 10) / 10 : null
        prevSemesterName = prevSem.name
        if (prevScored.length === 0) { prevDomainGrades = null; prevOverall = null; prevSemesterName = null }
      }
    }

    // ─── STEP 5: Comment, teacher, reading, attendance, behavior, scaffolds, goals ───
    const { data: commentData } = await supabase.from('comments').select('text, is_skipped').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()
    const teacher = student.teacher_id ? (await supabase.from('teachers').select('name, photo_url').eq('id', student.teacher_id).single()).data : null

    const [readingRes, attRes, behaviorRes, scaffoldRes, goalsRes] = await Promise.all([
      supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(5),
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('behavior_logs').select('id', { count: 'exact' }).eq('student_id', studentId),
      supabase.from('student_scaffolds').select('domain, scaffold_text, effectiveness').eq('student_id', studentId).eq('is_active', true),
      supabase.from('student_goals').select('goal_text, goal_type, completed_at').eq('student_id', studentId).eq('is_active', true),
    ])
    const attRecords = attRes.data || []
    const attCounts = { present: 0, absent: 0, tardy: 0 }
    attRecords.forEach((r: any) => { if (r.status === 'present') attCounts.present++; else if (r.status === 'absent') attCounts.absent++; else if (r.status === 'tardy') attCounts.tardy++ })

    setData({
      student, domainGrades, domainNa, domainStudentNa, domainClassNa, overallGrade, overallLetter, classAverages,
      classOverall: null,
      prevDomainGrades, prevOverall, prevSemesterName,
      comment: commentData?.text || '',
      commentSkipped: !!commentData?.is_skipped,
      teacherName: teacher?.name || currentTeacher?.name || '',
      teacherPhotoUrl: teacher?.photo_url || null,
      semesterName: semester.name,
      // Use grade/class from semester_grades if available (historical accuracy), else current student
      semesterGrade: (myGrades || []).find((sg: any) => sg.grade)?.grade || student.grade,
      semesterClass: (myGrades || []).find((sg: any) => sg.english_class)?.english_class || student.english_class,
      latestReading: readingRes.data?.[0] || null,
      behaviorCount: behaviorRes.count || 0,
      behaviorGrade,
      totalAtt: attRecords.length,
      attCounts,
      scaffolds: scaffoldRes.data || [],
      goals: goalsRes.data || [],
    })
    setComment(commentData?.text || '')
    setCommentSkipped(!!commentData?.is_skipped)
    setLoading(false)
  }, [studentId, semesterId, students, allSemesters, selectedClass, currentTeacher])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    await supabase.from('comments').upsert({ student_id: studentId, semester_id: semesterId, text: comment.trim(), is_skipped: commentSkipped, created_by: currentTeacher?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    showToast(commentSkipped ? 'Comment skipped' : 'Comment saved')
  }

  const handleTeacherPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentTeacher) return
    const ext = file.name.split('.').pop()
    const path = `teacher-photos/${currentTeacher.id}.${ext}`
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
    if (error) { showToast('Upload failed'); return }
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
    await supabase.from('teachers').update({ photo_url: urlData.publicUrl }).eq('id', currentTeacher.id)
    showToast('Photo updated')
    loadReport()
  }

  // ─── Print Handler ──────────────────────────────────────────────────

  const handlePrint = () => {
    if (!data) return
    const d = data, s = d.student

    const gc = d.overallGrade != null ? letterColor(d.overallLetter) : '#94a3b8'
    const pct = (d.overallGrade || 0) / 100
    const radius = 50, stroke = 8, circ = 2 * Math.PI * radius
    const displayGrade = d.semesterGrade || s.grade
    const displayClass = d.semesterClass || s.english_class

    // Score tiles (clean — no vs class badge)
    const tiles = DOMAINS.map((dom) => {
      if (d.domainNa[dom]) return `<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f5f5f5">
        <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
        <div style="font-size:20px;font-weight:800;color:#94a3b8;margin-top:6px">N/A</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:3px">Not assessed</div>
      </div>`
      const v = d.domainGrades[dom]; if (v == null) return '<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px">--</div>'
      const g = getLetterGrade(v); const t = tileBgPrint(v)
      return `<div style="text-align:center;padding:14px 8px;background:${t.bg};border:1.5px solid ${t.border};border-radius:12px">
        <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
        <div style="font-size:26px;font-weight:800;color:#1e293b;margin-top:6px">${v.toFixed(1)}%</div>
        <div style="font-size:14px;font-weight:700;color:${letterColor(g)};margin-top:3px">${g}</div>
      </div>`
    }).join('')

    // Radar chart SVG for print
    const radarSize = 280, rcx = radarSize / 2, rcy = radarSize / 2 + 6, maxR = 80
    const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
    const rLabels = ['Reading', 'Phonics', 'Writing', 'Speaking', 'Language']
    const rAngles = domains.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2)
    const toXY = (a: number, p: number) => ({ x: rcx + Math.cos(a) * (p / 100) * maxR, y: rcy + Math.sin(a) * (p / 100) * maxR })
    const makePoly = (vals: (number | null)[]) => vals.map((v, i) => { const pt = toXY(rAngles[i], v ?? 0); return `${pt.x},${pt.y}` }).join(' ')
    const sVals = domains.map(dm => d.domainNa[dm] ? null : d.domainGrades[dm])
    const cVals = domains.map(dm => d.classAverages[dm])
    const sFilledCount = sVals.filter(v => v != null).length

    const gridLines = [20, 40, 60, 80, 100].map(lvl =>
      `<polygon points="${rAngles.map(a => { const p = toXY(a, lvl); return `${p.x},${p.y}` }).join(' ')}" fill="none" stroke="#C8CED8" stroke-width="0.5" ${lvl < 100 ? 'stroke-dasharray="2,2"' : ''}/>`
    ).join('')
    const axisLines = rAngles.map(a => { const e = toXY(a, 100); return `<line x1="${rcx}" y1="${rcy}" x2="${e.x}" y2="${e.y}" stroke="#C8CED8" stroke-width="0.5"/>` }).join('')
    const classPoly = cVals.some(v => v != null) ? `<polygon points="${makePoly(cVals)}" fill="rgba(148,163,184,0.08)" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,3"/>` : ''
    const studentPoly = sFilledCount >= 3 ? `<polygon points="${makePoly(sVals)}" fill="rgba(30,58,95,0.15)" stroke="#647FBC" stroke-width="2"/>` : ''
    const dots = sVals.map((v, i) => { if (v == null) return ''; const pt = toXY(rAngles[i], v); return `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#647FBC" stroke="white" stroke-width="1.5"/>` }).join('')
    const radarLabels = rAngles.map((a, i) => {
      const pt = toXY(a, ((maxR + 26) / maxR) * 100)
      const sv = sVals[i]
      const anchor = pt.x < rcx - 10 ? 'end' : pt.x > rcx + 10 ? 'start' : 'middle'
      return `<text x="${pt.x}" y="${pt.y - 4}" text-anchor="${anchor}" dominant-baseline="middle" style="font-size:9px;font-weight:700;fill:#475569">${rLabels[i]}</text>
        ${sv != null ? `<text x="${pt.x}" y="${pt.y + 7}" text-anchor="${anchor}" dominant-baseline="middle" style="font-size:8px;font-weight:700;fill:#647FBC">${sv.toFixed(0)}%</text>` : ''}`
    }).join('')

    const radarSvg = `<svg width="${radarSize}" height="${radarSize}" viewBox="0 0 ${radarSize} ${radarSize}">${gridLines}${axisLines}${classPoly}${studentPoly}${dots}${radarLabels}</svg>`

    // Reading fluency HTML — with null safety
    const r = d.latestReading
    const readingHtml = r ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:#EDF1F8;border-radius:8px;padding:10px;text-align:center;border:1px solid #C8CED8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Words Per Minute</div><div style="font-size:20px;font-weight:800;color:#647FBC">${r.cwpm != null ? Math.round(r.cwpm) : '—'}</div></div>
        <div style="background:#EDF1F8;border-radius:8px;padding:10px;text-align:center;border:1px solid #C8CED8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Reading Accuracy</div><div style="font-size:20px;font-weight:800;color:${r.accuracy_rate != null ? (r.accuracy_rate >= 96 ? '#16a34a' : r.accuracy_rate >= 90 ? '#d97706' : '#dc2626') : '#94a3b8'}">${r.accuracy_rate != null ? r.accuracy_rate.toFixed(1) + '%' : '—'}</div></div>
        <div style="background:#EDF1F8;border-radius:8px;padding:10px;text-align:center;border:1px solid #C8CED8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Lexile</div><div style="font-size:16px;font-weight:700;color:#475569">${r.reading_level || r.passage_level || '—'}</div></div>
        <div style="background:#EDF1F8;border-radius:8px;padding:10px;text-align:center;border:1px solid #C8CED8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Fluency Rating</div><div style="font-size:16px;font-weight:700;color:#475569">${r.naep_fluency ? r.naep_fluency + ' of 4' : '—'}</div></div>
      </div>` : '<div style="background:#EDF1F8;border:1px solid #C8CED8;border-radius:8px;padding:14px;text-align:center;font-size:11px;color:#94a3b8">No reading assessments recorded yet.</div>'

    // Goals HTML
    const goalsHtml = d.goals?.length ? d.goals.slice(0, 5).map((g: any) =>
      `<div style="display:flex;align-items:start;gap:6px;font-size:11px;margin-bottom:4px">
        <span style="flex-shrink:0">${g.completed_at ? '[done]' : g.goal_type === 'stretch' ? '' : g.goal_type === 'behavioral' ? '' : ''}</span>
        <span style="${g.completed_at ? 'text-decoration:line-through;color:#94a3b8' : 'color:#475569;line-height:1.5'}">${g.goal_text}</span>
      </div>`
    ).join('') : '<div style="background:#EDF1F8;border:1px solid #C8CED8;border-radius:8px;padding:10px;text-align:center;font-size:11px;color:#94a3b8">No goals set yet.</div>'

    // Grading scale
    const scaleHtml = SCALE_DISPLAY.map((r: any) => `<span style="padding:2px 7px;border-radius:4px;background:#EDF1F8;border:1px solid #C8CED8;font-size:9px;display:inline-flex;gap:4px;margin:1px"><strong style="color:${letterColor(r.letter)}">${r.letter}</strong><span style="color:#94a3b8">${r.range}</span></span>`).join(' ')

    // Teacher avatar
    const avatarHtml = d.teacherPhotoUrl
      ? `<img src="${d.teacherPhotoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #DFE4EB" />`
      : `<div style="width:32px;height:32px;border-radius:50%;background:#647FBC;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${d.teacherName[0] || ''}</div>`

    const pw = window.open('', '_blank')
    if (!pw) return
    pw.document.write(`<html><head><title>Report Card \u2014 ${s.english_name}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222;font-size:12px;background:#f5f0eb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .card{max-width:760px;margin:24px auto;overflow:hidden;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);background:#f5f0eb}
      @media print{@page{size:A4;margin:8mm}body{padding:0}.card{margin:0;box-shadow:none;border-radius:0;max-height:277mm;overflow:hidden}}
    </style></head>
    <body><div class="card">
    <!-- Header -->
    <div style="background:#647FBC;padding:18px 28px;color:white;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:10px;opacity:0.5;letter-spacing:2.5px;text-transform:uppercase">Daewoo Elementary School</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px;font-family:Georgia,serif">${d.semesterName} Report Card</div>
      <div style="font-size:11px;opacity:0.6;margin-top:2px;font-style:italic">English Program \u2014 Growing together through English.</div></div>
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)"><img src="/logo.png" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'" /></div>
    </div>
    <!-- Student Info -->
    <div style="background:#fdfcfa;padding:14px 28px;border-bottom:1px solid #C8CED8">
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr 0.8fr 0.8fr auto;gap:0 14px">
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Name</div><div style="font-size:13px;font-weight:700;margin-top:1px">${s.korean_name}  ${s.english_name}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Grade</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayGrade}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Korean Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.korean_class}반</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Class Number</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.class_number}번</div></div>
        <div style="grid-row:1/3;display:flex;align-items:center;justify-content:center;padding-left:8px">
          <div style="position:relative;width:76px;height:76px">
            <svg width="76" height="76" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#C8CED8" stroke-width="${stroke}"/>
            <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${gc}" stroke-width="${stroke}" stroke-dasharray="${pct * circ} ${circ}" stroke-linecap="round" transform="rotate(-90 60 60)"/></svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font-size:20px;font-weight:800;color:#647FBC">${d.overallLetter}</div>
              <div style="font-size:10px;color:#64748b">${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : ''}</div>
            </div>
          </div>
        </div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">English Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayClass}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Teacher</div><div style="font-size:13px;font-weight:600;margin-top:1px">${d.teacherName}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Team Manager</div><div style="font-size:13px;font-weight:600;margin-top:1px">Victoria Park</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Principal</div><div style="font-size:13px;font-weight:600;margin-top:1px">Kwak Cheol Ok</div></div>
      </div>
    </div>
    <!-- Score Tiles -->
    <div style="background:#fdfcfa;padding:18px 28px 22px;border-bottom:1px solid #C8CED8">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Academic Performance</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${tiles}</div>
    </div>
    <!-- Student Snapshot: Radar + Reading + Goals -->
    <div style="background:#fdfcfa;padding:20px 28px;border-bottom:1px solid #C8CED8">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Class Comparison</div>
          <div style="text-align:center">${radarSvg}</div>
          <div style="text-align:center;margin-top:4px;font-size:8px;color:#94a3b8">
            <span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px"><span style="width:8px;height:8px;border-radius:2px;background:rgba(30,58,95,0.25);border:1.5px solid #647FBC;display:inline-block"></span> Student</span>
            <span style="display:inline-flex;align-items:center;gap:3px"><span style="width:8px;height:8px;border-radius:2px;background:rgba(148,163,184,0.15);border:1.5px solid #cbd5e1;display:inline-block"></span> Class Avg</span>
          </div>
        </div>
        <div>
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Reading Fluency</div>
          ${readingHtml}
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin:14px 0 8px">Student Goals</div>
          ${goalsHtml}
        </div>
      </div>
    </div>
    ${commentSkipped ? '' : `<!-- Comment -->
    <div style="background:#fdfcfa;padding:20px 28px;border-bottom:1px solid #C8CED8">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${avatarHtml}<div><div style="font-size:13px;font-weight:700;color:#1e293b">${d.teacherName}</div><div style="font-size:10px;color:#94a3b8">${displayClass} Class</div></div></div>
      <div style="font-size:12px;line-height:1.8;color:#374151;white-space:pre-wrap;background:#fafaf8;border-radius:10px;padding:14px 18px;border:1px solid #C8CED8">${comment || '<em style="color:#94a3b8">No comment entered.</em>'}</div>
    </div>`}
    <!-- Scale + Footer -->
    <div style="background:#fdfcfa;padding:14px 28px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Grading Scale</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap">${scaleHtml}</div>
      <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #C8CED8;font-size:10px;color:#b8b0a6;letter-spacing:1px">Daewoo Elementary School \u00b7 English Program \u00b7 ${d.semesterName}</div>
    </div>
    </div></body></html>`)
    pw.document.close()
    pw.print()
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!data) return <div className="py-12 text-center text-text-tertiary">Could not load report data.</div>

  const d = data, s = d.student
  const gc = d.overallGrade != null ? letterColor(d.overallLetter) : '#94a3b8'
  const pct = (d.overallGrade || 0) / 100
  const radius = 50, stroke = 8, circ = 2 * Math.PI * radius

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {reviewStatus && (
            <>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium ${reviewStatus.partner_approved ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-text-tertiary'}`}>
                {reviewStatus.partner_approved ? <CheckCircle2 size={11} /> : <Circle size={11} />} Partner
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium ${reviewStatus.admin_approved ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-text-tertiary'}`}>
                {reviewStatus.admin_approved ? <CheckCircle2 size={11} /> : <Circle size={11} />} Admin
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {reviewStatus && !reviewStatus.partner_approved && !reviewStatus.admin_approved && (
            <span className="text-[10px] text-amber-600">Needs partner + admin approval to print</span>
          )}
          <button onClick={handlePrint}
            disabled={reviewStatus != null && (!reviewStatus.partner_approved || !reviewStatus.admin_approved)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed">
            <Printer size={15} /> Print Report Card
          </button>
        </div>
      </div>

      {/* Card container — warm paper bg */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#f5f0eb' }}>

        {/* ─── Header ─── */}
        <div className="bg-navy px-7 py-5 text-white flex justify-between items-center">
          <div>
            <div className="text-[10px] opacity-50 tracking-[2.5px] uppercase font-medium">Daewoo Elementary School</div>
            <div className="text-[22px] font-bold mt-1 font-display">{d.semesterName} Report Card</div>
            <div className="text-[11px] opacity-60 mt-0.5 italic">English Program &mdash; Growing together through English.</div>
          </div>
          <div className="w-[52px] h-[52px] rounded-full bg-white/95 flex items-center justify-center shadow-lg flex-shrink-0">
            <img src="/logo.png" alt="" className="w-9 h-9 object-contain" onError={(e: any) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        {/* ─── Student Info — 4 columns + donut ─── */}
        <div className="bg-white px-7 py-3.5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="grid gap-x-4" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr auto' }}>
            {/* Row 1 */}
            <InfoCell label="이름 / Name" value={`${s.korean_name}  ${s.english_name}`} bold />
            <InfoCell label="학년 / Grade" value={d.semesterGrade || s.grade} />
            <InfoCell label="반 / Korean Class" value={`${s.korean_class}반`} />
            <InfoCell label="번호 / Class Number" value={`${s.class_number}번`} />
            {/* Donut — spans 2 rows */}
            <div className="flex items-center justify-center pl-2" style={{ gridRow: '1 / 3' }}>
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#C8CED8" strokeWidth={stroke} />
                  <circle cx="60" cy="60" r={radius} fill="none" stroke={gc} strokeWidth={stroke}
                    strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[20px] font-extrabold text-navy leading-none">{d.overallLetter}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}%` : ''}</div>
                </div>
              </div>
            </div>
            {/* Row 2 */}
            <InfoCell label="영어반 / English Class" value={d.semesterClass || s.english_class} />
            <InfoCell label="담당 / Teacher" value={d.teacherName} />
            <InfoCell label="Team Manager" value="Victoria Park" />
            <InfoCell label="교장 / Principal" value="Kwak Cheol Ok" />
          </div>
        </div>

        {/* ─── Score Tiles ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold">Academic Performance</div>
            {!editingGrades ? (
              <button onClick={() => {
                const eg: Record<string, string> = {}
                const en: Record<string, boolean> = {}
                DOMAINS.forEach(dom => {
                  eg[dom] = d.domainGrades[dom] != null ? String(d.domainGrades[dom]) : ''
                  en[dom] = !!d.domainStudentNa[dom]
                })
                eg.behavior = d.behaviorGrade || ''
                setEditGradeValues(eg)
                setEditNaValues(en)
                setEditingGrades(true)
              }} className="text-[10px] text-navy font-medium hover:underline cursor-pointer">✎ Edit Grades</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingGrades(false)} className="text-[10px] text-text-tertiary hover:text-red-500">Cancel</button>
                <button onClick={async () => {
                  const student = students.find((s: any) => s.id === studentId)
                  // Save to semester_grades with class snapshot
                  for (const dom of DOMAINS) {
                    const isNa = !!editNaValues[dom]
                    const val = parseFloat(editGradeValues[dom])
                    if (isNa) {
                      const row: any = {
                        student_id: studentId, semester_id: semesterId, domain: dom, is_na: true,
                        english_class: student?.english_class || selectedClass, grade: student?.grade,
                      }
                      if (!isNaN(val)) row.final_grade = val
                      await supabase.from('semester_grades').upsert(row, { onConflict: 'student_id,semester_id,domain' })
                    } else if (!isNaN(val)) {
                      await supabase.from('semester_grades').upsert({
                        student_id: studentId, semester_id: semesterId, domain: dom, final_grade: val, is_na: false,
                        english_class: student?.english_class || selectedClass, grade: student?.grade,
                      }, { onConflict: 'student_id,semester_id,domain' })
                    } else {
                      await supabase.from('semester_grades').delete().eq('student_id', studentId).eq('semester_id', semesterId).eq('domain', dom)
                    }
                  }
                  // Save behavior
                  if (editGradeValues.behavior) {
                    await supabase.from('semester_grades').upsert({
                      student_id: studentId, semester_id: semesterId, domain: 'overall', behavior_grade: editGradeValues.behavior,
                      english_class: student?.english_class || selectedClass, grade: student?.grade,
                    }, { onConflict: 'student_id,semester_id,domain' })
                  }
                  setEditingGrades(false)
                  showToast('Grades saved')
                  loadReport()
                }} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy-dark">Save</button>
              </div>
            )}
          </div>
          {editingGrades ? (
            <div className="grid grid-cols-5 gap-2.5">
              {DOMAINS.map((dom) => {
                const classNa = !!d.domainClassNa[dom]
                const isNa = classNa || !!editNaValues[dom]
                return (
                  <div key={dom} className={`rounded-xl border-[1.5px] ${isNa ? 'border-[#94a3b8] bg-[#f5f5f5]' : 'border-border bg-white'} p-3.5 text-center`}>
                    <div className="text-[11px] text-[#64748b] font-semibold mb-2">{DOMAIN_SHORT[dom]}</div>
                    {isNa ? (
                      <div className="text-[18px] font-bold text-[#94a3b8] py-2 leading-none">N/A</div>
                    ) : (
                      <>
                        <input type="number" min={0} max={100} step={0.1} value={editGradeValues[dom] || ''}
                          onChange={e => setEditGradeValues(prev => ({ ...prev, [dom]: e.target.value }))}
                          className="w-full text-center text-[18px] font-bold px-2 py-1.5 border border-border rounded-lg outline-none focus:border-navy"
                          placeholder="--" />
                        <div className="text-[9px] text-text-tertiary mt-1">%</div>
                      </>
                    )}
                    {classNa ? (
                      <div className="text-[8px] text-[#94a3b8] mt-2 leading-tight">Class N/A · change in Class Overview</div>
                    ) : (
                      <button onClick={() => setEditNaValues(prev => ({ ...prev, [dom]: !prev[dom] }))}
                        className={`text-[9px] mt-2 px-2 py-0.5 rounded font-medium ${isNa ? 'bg-[#94a3b8] text-white hover:bg-[#64748b]' : 'bg-white text-text-secondary border border-border hover:bg-surface-alt'}`}>
                        {isNa ? 'Remove N/A' : 'Mark N/A'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
          <div className="grid grid-cols-5 gap-2.5">
            {DOMAINS.map((dom) => {
              if (d.domainNa[dom]) return (
                <div key={dom} className="rounded-xl border border-border bg-[#f5f5f5] p-3.5 text-center flex flex-col justify-center" style={{ minHeight: 90 }}>
                  <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[20px] font-bold text-[#94a3b8] mt-2 leading-none">N/A</div>
                  <div className="text-[9px] text-[#94a3b8] mt-1">Not assessed</div>
                </div>
              )
              const v = d.domainGrades[dom]
              if (v == null) return <div key={dom} className="rounded-xl border border-border p-3.5 text-center text-text-tertiary text-[12px]">--</div>
              const g = getLetterGrade(v)
              return (
                <div key={dom} className={`rounded-xl border-[1.5px] ${tileBgClass(v)} p-3.5 text-center`}>
                  <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[28px] font-extrabold text-[#1e293b] mt-2 leading-none">{v.toFixed(1)}%</div>
                  <div className="text-[15px] font-bold mt-1" style={{ color: letterColor(g) }}>{g}</div>
                </div>
              )
            })}
          </div>
          )}
        </div>
        {/* ─── Student Snapshot: Radar + Reading + Goals ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Left: Radar Chart — Student vs Class */}
            <div>
              <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3">Class Comparison</div>
              <RadarChart studentGrades={Object.fromEntries(DOMAINS.map(dom => [dom, d.domainNa[dom] ? null : d.domainGrades[dom]]))} classAverages={d.classAverages} />
              <div className="flex items-center justify-center gap-4 mt-2 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(30,58,95,0.25)', border: '1.5px solid #647FBC' }} /> Student</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(148,163,184,0.15)', border: '1.5px solid #cbd5e1' }} /> Class Average</span>
              </div>
            </div>

            {/* Right: Reading Fluency + Goals */}
            <div className="space-y-4">
              {/* Reading Fluency */}
              <div>
                <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-2.5">Reading Fluency</div>
                {d.latestReading ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                      <div className="text-[9px] text-[#94a3b8] font-semibold mb-1">Words Per Minute</div>
                      <div className="text-[22px] font-extrabold text-navy leading-none">{d.latestReading.cwpm != null ? Math.round(d.latestReading.cwpm) : '—'}</div>
                    </div>
                    <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                      <div className="text-[9px] text-[#94a3b8] font-semibold mb-1">Reading Accuracy</div>
                      <div className={`text-[22px] font-extrabold leading-none ${d.latestReading.accuracy_rate != null ? (d.latestReading.accuracy_rate >= 96 ? 'text-green-600' : d.latestReading.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-500') : 'text-[#94a3b8]'}`}>
                        {d.latestReading.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                      <div className="text-[9px] text-[#94a3b8] font-semibold mb-1">Lexile</div>
                      <div className="text-[18px] font-bold text-[#475569]">{d.latestReading.reading_level || d.latestReading.passage_level || '—'}</div>
                    </div>
                    <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                      <div className="text-[9px] text-[#94a3b8] font-semibold mb-1">Fluency Rating</div>
                      <div className="text-[18px] font-bold text-[#475569]">{d.latestReading.naep_fluency ? `${d.latestReading.naep_fluency} of 4` : '—'}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#f8f9fb] rounded-lg p-4 text-center text-[12px] text-[#94a3b8]">No reading assessments recorded yet.</div>
                )}
              </div>

              {/* Student Goals */}
              <div>
                <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-2">Student Goals</div>
                {d.goals && d.goals.length > 0 ? (
                  <div className="space-y-1.5">
                    {d.goals.slice(0, 5).map((g: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="flex-shrink-0 mt-0.5">{g.completed_at ? '[done]' : g.goal_type === 'stretch' ? '' : g.goal_type === 'behavioral' ? '' : ''}</span>
                        <span className={g.completed_at ? 'line-through text-[#94a3b8]' : 'text-[#475569] leading-relaxed'}>{g.goal_text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#f8f9fb] rounded-lg p-3 text-center text-[11px] text-[#94a3b8]">No goals set yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Teacher Comment ─── */}
        <div className="bg-white px-7 py-6" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              {/* Teacher avatar — clickable to upload */}
              <label className="cursor-pointer relative group">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleTeacherPhotoUpload} />
                {d.teacherPhotoUrl ? (
                  <img src={d.teacherPhotoUrl} className="w-9 h-9 rounded-full object-cover border-2 border-[#DFE4EB]" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#C8CED8] text-[#64748b] flex items-center justify-center text-[14px] font-bold border-2 border-[#DFE4EB]">
                    {d.teacherName[0] || ''}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  <Camera size={9} className="text-white" />
                </div>
              </label>
              <div>
                <div className="text-[14px] font-bold text-[#1e293b]">{d.teacherName}</div>
                <div className="text-[10px] text-[#94a3b8]">{s.english_class} Class</div>
              </div>
            </div>
            {/* Student Reference — hidden on print */}
            <button onClick={() => setShowRefPanel(!showRefPanel)}
              className={`print:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${showRefPanel ? 'bg-navy text-white border-navy' : 'bg-[#EDF1F8] text-[#475569] border-[#d1d5db] hover:bg-[#DFE4EB]'}`}>
              <BarChart3 size={14} />
              Student Reference
            </button>
          </div>

          {/* Student Reference Panel */}
          {showRefPanel && (
            <div className="print:hidden bg-[#f8f9fb] border border-[#d1d5db] rounded-xl p-4 mb-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-[#475569]">Student Reference -- All Data at a Glance</p>
                <button onClick={() => {
                  const lines = [
                    `${s.english_name} (${s.korean_name}) -- ${s.english_class} -- Grade ${s.grade}`,
                    `Semester: ${d.semesterName}`,
                    '',
                    'DOMAIN GRADES:',
                    ...DOMAINS.map(dom => `  ${DOMAIN_SHORT[dom]}: ${d.domainNa[dom] ? 'N/A' : (d.domainGrades[dom] != null ? `${d.domainGrades[dom]!.toFixed(1)}% (${getLetterGrade(d.domainGrades[dom]!)})` : 'No grade')}`),
                    `  Overall: ${d.overallGrade != null ? `${d.overallGrade.toFixed(1)}% (${d.overallLetter})` : 'No grade'}`,
                    '',
                    'READING FLUENCY:',
                    `  CWPM: ${d.latestReading?.cwpm != null ? Math.round(d.latestReading.cwpm) : 'N/A'}`,
                    `  Lexile: ${d.latestReading?.reading_level || d.latestReading?.passage_level || 'N/A'}`,
                    `  Accuracy: ${d.latestReading?.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : 'N/A'}`,
                    `  NAEP Fluency: ${d.latestReading?.naep_fluency ? `Level ${d.latestReading.naep_fluency}` : 'N/A'}`,
                    '',
                    `ATTENDANCE: ${d.totalAtt > 0 ? `${Math.round((d.attCounts.present / d.totalAtt) * 100)}% (${d.attCounts.present}P/${d.attCounts.absent}A/${d.attCounts.tardy}T)` : 'N/A'}`,
                    `BEHAVIOR LOGS: ${d.behaviorCount} entries`,
                    ...(d.scaffolds?.length ? ['', 'SCAFFOLDS:', ...d.scaffolds.map((sc: any) => `  [${sc.domain}] ${sc.scaffold_text}${sc.effectiveness ? ` (${sc.effectiveness})` : ''}`)] : []),
                    ...(d.goals?.length ? ['', 'GOALS:', ...d.goals.map((g: any) => `  ${g.completed_at ? '[done]' : '[ ]'} [${g.goal_type}] ${g.goal_text}`)] : []),
                  ]
                  navigator.clipboard.writeText(lines.join('\n'))
                  showToast('Copied to clipboard')
                }} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white border border-[#d1d5db] text-[#475569] hover:bg-[#f1f5f9]">
                  Copy to Clipboard
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-2">Domain Grades</p>
                  {DOMAINS.map(dom => {
                    const isNa = !!d.domainNa[dom]
                    const v = d.domainGrades[dom]
                    return (
                      <div key={dom} className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-[#64748b]">{DOMAIN_SHORT[dom]}</span>
                        <span className="text-[11px] font-bold" style={{ color: isNa ? '#94a3b8' : (v != null ? letterColor(getLetterGrade(v)) : '#94a3b8') }}>
                          {isNa ? 'N/A' : (v != null ? `${v.toFixed(1)}% (${getLetterGrade(v)})` : '--')}
                        </span>
                      </div>
                    )
                  })}
                  <div className="border-t border-[#e2e8f0] mt-1 pt-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-navy">Overall</span>
                    <span className="text-[11px] font-bold text-navy">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}% (${d.overallLetter})` : '--'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1">Reading Fluency</p>
                    <div className="flex gap-4">
                      <div><p className="text-[9px] text-[#94a3b8]">CWPM</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.cwpm != null ? Math.round(d.latestReading.cwpm) : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Lexile</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.reading_level || d.latestReading?.passage_level || '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Acc.</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">NAEP</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.naep_fluency ? `L${d.latestReading.naep_fluency}` : '--'}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1">Attendance / Behavior</p>
                    <div className="flex gap-4">
                      <div><p className="text-[9px] text-[#94a3b8]">Attendance</p><p className="text-[12px] font-bold text-navy">{d.totalAtt > 0 ? `${Math.round((d.attCounts.present / d.totalAtt) * 100)}%` : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Behavior</p><p className="text-[14px] font-bold text-navy">{d.behaviorGrade || '--'}</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scaffolds */}
              {d.scaffolds && d.scaffolds.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3 mb-2">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1.5">Active Scaffolds ({d.scaffolds.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {d.scaffolds.map((sc: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] text-blue-800">
                        <span className="font-bold uppercase text-[8px]">{sc.domain}</span> {sc.scaffold_text}
                        {sc.effectiveness === 'working' && <span className="text-green-600">✓</span>}
                        {sc.effectiveness === 'not_working' && <span className="text-red-600">✗</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {d.goals && d.goals.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1.5">Student Goals ({d.goals.length})</p>
                  <div className="space-y-0.5">
                    {d.goals.map((g: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span>{g.completed_at ? '[done]' : g.goal_type === 'stretch' ? '' : g.goal_type === 'behavioral' ? '' : ''}</span>
                        <span className={g.completed_at ? 'line-through text-text-tertiary' : 'text-[#475569]'}>{g.goal_text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={commentSkipped}
                onChange={(e: any) => setCommentSkipped(e.target.checked)} />
              Skip comment for this student
            </label>
            {commentSkipped && <span className="text-[10px] text-[#94a3b8] italic">Comment section will be hidden on the printed report.</span>}
          </div>
          <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={6}
            disabled={commentSkipped}
            placeholder={commentSkipped ? 'Skipped — uncheck above to write a comment.' : "Write comments about this student's progress..."}
            className={`w-full px-4 py-3 border border-[#C8CED8] rounded-xl text-[13px] outline-none focus:border-navy resize-none leading-relaxed ${commentSkipped ? 'bg-[#f5f5f5] text-text-tertiary cursor-not-allowed' : 'bg-[#fafaf8]'}`} />
          <div className="flex justify-end mt-2">
            <button onClick={saveComment} disabled={savingComment}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              {savingComment ? 'Saving...' : 'Save Comment'}
            </button>
          </div>
        </div>

        {/* ─── Grading Scale + Footer ─── */}
        <div className="bg-white px-7 py-4">
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-2.5">Grading Scale</div>
          <div className="flex gap-1 flex-wrap">
            {SCALE_DISPLAY.map((r: any) => (
              <span key={r.letter + r.range} className="px-2 py-0.5 rounded bg-[#EDF1F8] border border-[#C8CED8] text-[10px] inline-flex gap-1">
                <strong style={{ color: letterColor(r.letter) }}>{r.letter}</strong>
                <span className="text-[#94a3b8]">{r.range}</span>
              </span>
            ))}
          </div>
          <div className="text-center mt-4 pt-3 text-[10px] text-[#b8b0a6] tracking-wider" style={{ borderTop: '1px solid #C8CED8' }}>
            Daewoo Elementary School &middot; English Program &middot; {d.semesterName}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Progress Report Card HTML (shared by single + batch print) ──────
function progressCardHtml(s: any, d: any, comment: string): string {
  const naMap: Record<string, boolean> = d.domainNa || {}
  const tiles = DOMAINS.map((dom) => {
    if (naMap[dom]) return `<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px;background:#f5f5f5">
      <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
      <div style="font-size:20px;font-weight:800;color:#94a3b8;margin-top:6px">N/A</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:3px">Not assessed</div>
    </div>`
    const v = d.domainGrades[dom]
    if (v == null) return `<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px;background:white">
      <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
      <div style="font-size:22px;font-weight:800;color:#94a3b8;margin-top:8px">—</div>
    </div>`
    const g = getLetterGrade(v); const t = tileBgPrint(v)
    return `<div style="text-align:center;padding:14px 8px;background:${t.bg};border:1.5px solid ${t.border};border-radius:12px">
      <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
      <div style="font-size:26px;font-weight:800;color:#1e293b;margin-top:6px">${v.toFixed(1)}%</div>
      <div style="font-size:14px;font-weight:700;color:${letterColor(g)};margin-top:3px">${g}</div>
    </div>`
  }).join('')

  const scaleHtml = SCALE_DISPLAY.map((r: any) => `<span style="padding:2px 7px;border-radius:4px;background:#EDF1F8;border:1px solid #C8CED8;font-size:9px;display:inline-flex;gap:4px;margin:1px"><strong style="color:${letterColor(r.letter)}">${r.letter}</strong><span style="color:#94a3b8">${r.range}</span></span>`).join(' ')

  const avatarHtml = d.teacherPhotoUrl
    ? `<img src="${d.teacherPhotoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #DFE4EB" />`
    : `<div style="width:32px;height:32px;border-radius:50%;background:#C8CED8;color:#64748b;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${(d.teacherName || '')[0] || ''}</div>`

  const gc = d.overallGrade != null ? letterColor(d.overallLetter) : '#94a3b8'
  const pct = (d.overallGrade || 0) / 100
  const radius = 50, stroke = 8, circ = 2 * Math.PI * radius
  const displayGrade = d.semesterGrade || s.grade
  const displayClass = d.semesterClass || s.english_class

  return `<div class="card">
  <!-- Header -->
  <div style="background:#647FBC;padding:18px 28px;color:white;display:flex;justify-content:space-between;align-items:center">
    <div><div style="font-size:10px;opacity:0.5;letter-spacing:2.5px;text-transform:uppercase">Daewoo Elementary School</div>
    <div style="font-size:22px;font-weight:700;margin-top:4px;font-family:Georgia,serif">${d.semesterName} Progress Report</div>
    <div style="font-size:11px;opacity:0.6;margin-top:2px;font-style:italic">English Program — Mid-semester progress.</div></div>
    <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)"><img src="/logo.png" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display=\'none\'" /></div>
  </div>
  <!-- Student Info -->
  <div style="background:#fdfcfa;padding:14px 28px;border-bottom:1px solid #C8CED8">
    <div style="display:grid;grid-template-columns:1.2fr 0.8fr 0.8fr 0.8fr auto;gap:0 14px">
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Name</div><div style="font-size:13px;font-weight:700;margin-top:1px">${s.korean_name}  ${s.english_name}</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Grade</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayGrade}</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Korean Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.korean_class}반</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Class Number</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.class_number}번</div></div>
      <div style="grid-row:1/3;display:flex;align-items:center;justify-content:center;padding-left:8px">
        <div style="position:relative;width:76px;height:76px">
          <svg width="76" height="76" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#C8CED8" stroke-width="${stroke}"/>
          <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${gc}" stroke-width="${stroke}" stroke-dasharray="${pct * circ} ${circ}" stroke-linecap="round" transform="rotate(-90 60 60)"/></svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:20px;font-weight:800;color:#647FBC">${d.overallLetter}</div>
            <div style="font-size:10px;color:#64748b">${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : ''}</div>
          </div>
        </div>
      </div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">English Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayClass}</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Teacher</div><div style="font-size:13px;font-weight:600;margin-top:1px">${d.teacherName}</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Team Manager</div><div style="font-size:13px;font-weight:600;margin-top:1px">Victoria Park</div></div>
      <div style="padding:5px 0;border-bottom:1px solid #DFE4EB"><div style="font-size:9px;color:#94a3b8;font-weight:600">Principal</div><div style="font-size:13px;font-weight:600;margin-top:1px">Kwak Cheol Ok</div></div>
    </div>
  </div>
  <!-- Score Tiles -->
  <div style="background:#fdfcfa;padding:18px 28px 22px;border-bottom:1px solid #C8CED8">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Domain Performance</div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${tiles}</div>
  </div>
  ${d.commentSkipped ? '' : `<!-- Comment -->
  <div style="background:#fdfcfa;padding:20px 28px;border-bottom:1px solid #C8CED8">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${avatarHtml}<div><div style="font-size:13px;font-weight:700;color:#1e293b">${d.teacherName}</div><div style="font-size:10px;color:#94a3b8">${displayClass} Class</div></div></div>
    <div style="font-size:12px;line-height:1.8;color:#374151;white-space:pre-wrap;background:#fafaf8;border-radius:10px;padding:14px 18px;border:1px solid #C8CED8">${comment || '<em style="color:#94a3b8">No comment entered.</em>'}</div>
  </div>`}
  <!-- Scale + Footer -->
  <div style="background:#fdfcfa;padding:14px 28px">
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Grading Scale</div>
    <div style="display:flex;gap:3px;flex-wrap:wrap">${scaleHtml}</div>
    <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #C8CED8;font-size:10px;color:#b8b0a6;letter-spacing:1px">Daewoo Elementary School · English Program · ${d.semesterName}</div>
  </div>
  </div>`
}

// ─── Print Single Progress Report ────────────────────
function printProgressReport(s: any, d: any, comment: string) {
  const pw = window.open('', '_blank')
  if (!pw) return
  pw.document.write(`<!DOCTYPE html><html><head><title>Progress Report — ${s.english_name}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222;font-size:12px;background:#f5f0eb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .card{max-width:760px;margin:24px auto;overflow:hidden;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);background:#f5f0eb}
    @media print{@page{size:A4;margin:8mm}body{padding:0}.card{margin:0;box-shadow:none;border-radius:0;max-height:277mm;overflow:hidden}}
  </style></head>
  <body>${progressCardHtml(s, d, comment)}</body></html>`)
  pw.document.close()
  setTimeout(() => pw.print(), 300)
}

// ─── Batch Print All Progress Reports ────────────────────────────────
function BatchPrintButton({ students, semesterId, className: cls }: { students: any[]; semesterId: string; className: string }) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { currentTeacher, showToast } = useApp()

  const handleStart = async () => {
    if (students.length === 0) return
    setGenerating(true)
    setProgress({ current: 0, total: students.length })

    try {
      // Load semester name + class N/A settings once for the whole class
      const { data: semData } = await supabase.from('semesters').select('name').eq('id', semesterId).single()
      const semesterName = semData?.name || ''
      const grade = students[0]?.grade
      const { data: classSettings } = await supabase.from('class_report_settings').select('domain, is_na')
        .eq('semester_id', semesterId).eq('english_class', cls).eq('grade', grade)
      const domainClassNa: Record<string, boolean> = {}
      DOMAINS.forEach(dd => { domainClassNa[dd] = false })
      ;(classSettings || []).forEach((r: any) => { if (DOMAINS.includes(r.domain)) domainClassNa[r.domain] = !!r.is_na })

      const head = `<!DOCTYPE html><html><head><title>Progress Reports — ${cls} Grade ${grade}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#222;font-size:12px;background:#f5f0eb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .card{max-width:760px;margin:24px auto;overflow:hidden;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);background:#f5f0eb;page-break-after:always;page-break-inside:avoid;break-after:page;break-inside:avoid}
  .card:last-child{page-break-after:auto;break-after:auto}
  @media print{@page{size:A4;margin:8mm}.card{margin:0;box-shadow:none;border-radius:0}}
</style></head><body>`
      let body = ''

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const { data: myGrades } = await supabase.from('semester_grades').select('*')
          .eq('student_id', student.id).eq('semester_id', semesterId)
        const domainGrades: Record<string, number | null> = {}
        const domainNa: Record<string, boolean> = {}
        DOMAINS.forEach(dd => { domainGrades[dd] = null; domainNa[dd] = domainClassNa[dd] })
        ;(myGrades || []).forEach((sg: any) => {
          if (DOMAINS.includes(sg.domain)) {
            domainGrades[sg.domain] = sg.final_grade ?? sg.calculated_grade ?? null
            if (sg.is_na) domainNa[sg.domain] = true
          }
        })
        const scored = DOMAINS.filter(dd => !domainNa[dd] && domainGrades[dd] != null)
        const overallGrade = scored.length > 0 ? Math.round(scored.reduce((acc: number, dd) => acc + (domainGrades[dd] as number), 0) / scored.length * 10) / 10 : null
        const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '—'

        const { data: commentData } = await supabase.from('comments').select('text, is_skipped').eq('student_id', student.id).eq('semester_id', semesterId).limit(1).single()
        const teacher = student.teacher_id ? (await supabase.from('teachers').select('name, photo_url').eq('id', student.teacher_id).single()).data : null

        const data = {
          domainGrades, domainNa, overallGrade, overallLetter, semesterName,
          commentSkipped: !!commentData?.is_skipped,
          teacherName: teacher?.name || currentTeacher?.name || '',
          teacherPhotoUrl: teacher?.photo_url || null,
          semesterGrade: (myGrades || []).find((sg: any) => sg.grade)?.grade || student.grade,
          semesterClass: (myGrades || []).find((sg: any) => sg.english_class)?.english_class || student.english_class,
        }
        body += progressCardHtml(student, data, commentData?.text || '')
        setProgress({ current: i + 1, total: students.length })
      }

      setPreviewHtml(head + body + '</body></html>')
    } catch (err: any) {
      showToast(`Failed to generate reports: ${err?.message || 'unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = () => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentWindow) return
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  }

  const handleClose = () => {
    setPreviewHtml(null)
    setProgress({ current: 0, total: 0 })
  }

  const buttonLabel = generating
    ? <><Loader2 size={14} className="animate-spin" /> Generating {progress.current} of {progress.total}…</>
    : <><Printer size={14} /> Print All {students.length} Students</>

  return (
    <>
      <button onClick={handleStart} disabled={generating || students.length === 0}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light disabled:opacity-50">
        {buttonLabel}
      </button>

      {/* Generation progress overlay */}
      {generating && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[360px]">
            <div className="text-[14px] font-semibold text-navy mb-1">Generating progress reports…</div>
            <div className="text-[12px] text-text-secondary mb-3">Loading student {progress.current} of {progress.total}</div>
            <div className="w-full h-2 bg-surface-alt rounded-full overflow-hidden">
              <div className="h-full bg-navy transition-all" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewHtml != null && !generating && (
        <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
          <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="text-[14px] font-semibold text-navy">Preview &middot; {students.length} progress reports</div>
              <div className="text-[11px] text-text-secondary mt-0.5">Choose <strong>Save as PDF</strong> as the destination in the print dialog to download the whole class as one file.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleClose}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-alt">
                Cancel
              </button>
              <button onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">
                <Printer size={14} /> Print / Save as PDF
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-[#f5f0eb]">
            <iframe ref={iframeRef} srcDoc={previewHtml} className="w-full h-full border-0" title="Progress reports preview" />
          </div>
        </div>
      )}
    </>
  )
}

// ─── Progress Report ────────────────────────────────────────────────
function ProgressReport({ studentId, semesterId, semester, students, allSemesters, lang, selectedClass }: {
  studentId: string; semesterId: string; semester: any; students: any[]; allSemesters: any[]; lang: LangKey; selectedClass: EnglishClass
}) {
  const { showToast, currentTeacher } = useApp()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [commentSkipped, setCommentSkipped] = useState(false)
  const [savingComment, setSavingComment] = useState(false)
  const [showRefPanel, setShowRefPanel] = useState(false)
  const [editingGrades, setEditingGrades] = useState(false)
  const [editGradeValues, setEditGradeValues] = useState<Record<string, string>>({})
  const [editNaValues, setEditNaValues] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setEditingGrades(false)
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }
    const sem = allSemesters.find((s: any) => s.id === semesterId)
    if (!sem) { setLoading(false); return }

    // Sync calculated grades from assessments → semester_grades for active semesters
    const isArchive = sem.type === 'archive'
    if (!isArchive) {
      const { data: assessments } = await supabase.from('assessments').select('*')
        .eq('semester_id', semesterId).eq('grade', student.grade).eq('english_class', selectedClass)
      if (assessments && assessments.length > 0) {
        const { data: studentGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)
          .in('assessment_id', assessments.map((a: any) => a.id))
        for (const domain of DOMAINS) {
          const domAssessments = assessments.filter((a: any) => a.domain === domain)
          const items: { score: number; maxScore: number; assessmentType: 'formative' | 'summative' | 'performance_task' }[] = []
          domAssessments.forEach((a: any) => {
            const g = (studentGrades || []).find((gr: any) => gr.assessment_id === a.id)
            if (!g || g.score == null || g.is_exempt || a.max_score <= 0) return
            items.push({ score: g.score, maxScore: a.max_score, assessmentType: a.type || 'formative' })
          })
          const avg = calcWeightedAvg(items, Number(student.grade || 3))
          if (avg != null) {
            await supabase.from('semester_grades').upsert({
              student_id: studentId, semester_id: semesterId, domain,
              calculated_grade: Math.round(avg * 10) / 10, english_class: student.english_class, grade: student.grade,
            }, { onConflict: 'student_id,semester_id,domain' })
          }
        }
      }
    }

    // Read final grades from semester_grades
    const { data: myGrades } = await supabase.from('semester_grades').select('*')
      .eq('student_id', studentId).eq('semester_id', semesterId)
    const domainGrades: Record<string, number | null> = {}
    const domainStudentNa: Record<string, boolean> = {}
    DOMAINS.forEach(d => { domainGrades[d] = null; domainStudentNa[d] = false })
    ;(myGrades || []).forEach((sg: any) => {
      if (DOMAINS.includes(sg.domain)) {
        domainGrades[sg.domain] = sg.final_grade ?? sg.calculated_grade ?? null
        domainStudentNa[sg.domain] = !!sg.is_na
      }
    })

    // Class-level N/A settings — applied OR'd with student-level
    const { data: classSettings } = await supabase.from('class_report_settings').select('domain, is_na')
      .eq('semester_id', semesterId).eq('english_class', student.english_class).eq('grade', student.grade)
    const domainClassNa: Record<string, boolean> = {}
    DOMAINS.forEach(d => { domainClassNa[d] = false })
    ;(classSettings || []).forEach((r: any) => { if (DOMAINS.includes(r.domain)) domainClassNa[r.domain] = !!r.is_na })

    // Effective N/A (used for display + overall avg) is the OR of both
    const domainNa: Record<string, boolean> = {}
    DOMAINS.forEach(d => { domainNa[d] = domainStudentNa[d] || domainClassNa[d] })

    const scoredDomains = DOMAINS.filter(d => !domainNa[d] && domainGrades[d] != null)
    const overallGrade = scoredDomains.length > 0 ? Math.round(scoredDomains.reduce((a: number, d) => a + (domainGrades[d] as number), 0) / scoredDomains.length * 10) / 10 : null
    const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '—'

    // Comment, teacher, plus extras for Student Reference panel
    const { data: commentData } = await supabase.from('comments').select('text, is_skipped').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()
    const teacher = student.teacher_id ? (await supabase.from('teachers').select('name, photo_url').eq('id', student.teacher_id).single()).data : null
    const [readingRes, attRes, behaviorRes, scaffoldRes, goalsRes] = await Promise.all([
      supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(1),
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('behavior_logs').select('id', { count: 'exact' }).eq('student_id', studentId),
      supabase.from('student_scaffolds').select('domain, scaffold_text, effectiveness').eq('student_id', studentId).eq('is_active', true),
      supabase.from('student_goals').select('goal_text, goal_type, completed_at').eq('student_id', studentId).eq('is_active', true),
    ])
    const attRecords = attRes.data || []
    const attCounts = { present: 0, absent: 0, tardy: 0 }
    attRecords.forEach((r: any) => { if (r.status === 'present') attCounts.present++; else if (r.status === 'absent') attCounts.absent++; else if (r.status === 'tardy') attCounts.tardy++ })

    setData({
      student, domainGrades, domainNa, domainStudentNa, domainClassNa, overallGrade, overallLetter,
      comment: commentData?.text || '',
      commentSkipped: !!commentData?.is_skipped,
      teacherName: teacher?.name || currentTeacher?.name || '',
      teacherPhotoUrl: teacher?.photo_url || null,
      semesterName: sem.name,
      semesterGrade: (myGrades || []).find((sg: any) => sg.grade)?.grade || student.grade,
      semesterClass: (myGrades || []).find((sg: any) => sg.english_class)?.english_class || student.english_class,
      latestReading: readingRes.data?.[0] || null,
      behaviorCount: behaviorRes.count || 0,
      totalAtt: attRecords.length,
      attCounts,
      scaffolds: scaffoldRes.data || [],
      goals: goalsRes.data || [],
    })
    setComment(commentData?.text || '')
    setCommentSkipped(!!commentData?.is_skipped)
    setLoading(false)
  }, [studentId, semesterId, students, allSemesters, selectedClass, currentTeacher])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    const { error } = await supabase.from('comments').upsert({
      student_id: studentId, semester_id: semesterId, text: comment.trim(),
      is_skipped: commentSkipped,
      created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(commentSkipped ? 'Comment skipped' : 'Comment saved'); setData((prev: any) => ({ ...prev, comment: comment.trim(), commentSkipped })) }
  }

  const handleTeacherPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentTeacher) return
    const ext = file.name.split('.').pop()
    const path = `teacher-photos/${currentTeacher.id}.${ext}`
    const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
    if (error) { showToast('Upload failed'); return }
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
    await supabase.from('teachers').update({ photo_url: urlData.publicUrl }).eq('id', currentTeacher.id)
    showToast('Photo updated')
    loadReport()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!data) return <div className="py-12 text-center text-text-tertiary">Could not load report data.</div>

  const d = data, s = d.student
  const gc = d.overallGrade != null ? letterColor(d.overallLetter) : '#94a3b8'
  const pct = (d.overallGrade || 0) / 100
  const radius = 50, stroke = 8, circ = 2 * Math.PI * radius

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <button onClick={() => printProgressReport(s, d, comment)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt">
          <Printer size={15} /> Print Progress Report
        </button>
      </div>

      {/* Card container — warm paper bg */}
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#f5f0eb' }}>

        {/* ─── Header ─── */}
        <div className="bg-navy px-7 py-5 text-white flex justify-between items-center">
          <div>
            <div className="text-[10px] opacity-50 tracking-[2.5px] uppercase font-medium">Daewoo Elementary School</div>
            <div className="text-[22px] font-bold mt-1 font-display">{d.semesterName} Progress Report</div>
            <div className="text-[11px] opacity-60 mt-0.5 italic">English Program &mdash; Mid-semester progress.</div>
          </div>
          <div className="w-[52px] h-[52px] rounded-full bg-white/95 flex items-center justify-center shadow-lg flex-shrink-0">
            <img src="/logo.png" alt="" className="w-9 h-9 object-contain" onError={(e: any) => { (e.target as HTMLImageElement).style.display = 'none' }} />
          </div>
        </div>

        {/* ─── Student Info — 4 columns + donut ─── */}
        <div className="bg-white px-7 py-3.5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="grid gap-x-4" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr auto' }}>
            <InfoCell label="이름 / Name" value={`${s.korean_name}  ${s.english_name}`} bold />
            <InfoCell label="학년 / Grade" value={d.semesterGrade || s.grade} />
            <InfoCell label="반 / Korean Class" value={`${s.korean_class}반`} />
            <InfoCell label="번호 / Class Number" value={`${s.class_number}번`} />
            <div className="flex items-center justify-center pl-2" style={{ gridRow: '1 / 3' }}>
              <div className="relative" style={{ width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#C8CED8" strokeWidth={stroke} />
                  <circle cx="60" cy="60" r={radius} fill="none" stroke={gc} strokeWidth={stroke}
                    strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[20px] font-extrabold text-navy leading-none">{d.overallLetter}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}%` : ''}</div>
                </div>
              </div>
            </div>
            <InfoCell label="영어반 / English Class" value={d.semesterClass || s.english_class} />
            <InfoCell label="담당 / Teacher" value={d.teacherName} />
            <InfoCell label="Team Manager" value="Victoria Park" />
            <InfoCell label="교장 / Principal" value="Kwak Cheol Ok" />
          </div>
        </div>

        {/* ─── Score Tiles ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold">Domain Performance</div>
            {!editingGrades ? (
              <button onClick={() => {
                const eg: Record<string, string> = {}
                const en: Record<string, boolean> = {}
                DOMAINS.forEach(dom => {
                  eg[dom] = d.domainGrades[dom] != null ? String(d.domainGrades[dom]) : ''
                  en[dom] = !!d.domainStudentNa[dom]
                })
                setEditGradeValues(eg)
                setEditNaValues(en)
                setEditingGrades(true)
              }} className="text-[10px] text-navy font-medium hover:underline cursor-pointer">✎ Edit Grades</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingGrades(false)} className="text-[10px] text-text-tertiary hover:text-red-500">Cancel</button>
                <button onClick={async () => {
                  const student = students.find((st: any) => st.id === studentId)
                  for (const dom of DOMAINS) {
                    const isNa = !!editNaValues[dom]
                    const val = parseFloat(editGradeValues[dom])
                    if (isNa) {
                      // Mark N/A — preserve any existing grade in case teacher untoggles later
                      const row: any = {
                        student_id: studentId, semester_id: semesterId, domain: dom, is_na: true,
                        english_class: student?.english_class || selectedClass, grade: student?.grade,
                      }
                      if (!isNaN(val)) row.final_grade = val
                      await supabase.from('semester_grades').upsert(row, { onConflict: 'student_id,semester_id,domain' })
                    } else if (!isNaN(val)) {
                      await supabase.from('semester_grades').upsert({
                        student_id: studentId, semester_id: semesterId, domain: dom, final_grade: val, is_na: false,
                        english_class: student?.english_class || selectedClass, grade: student?.grade,
                      }, { onConflict: 'student_id,semester_id,domain' })
                    } else {
                      await supabase.from('semester_grades').delete().eq('student_id', studentId).eq('semester_id', semesterId).eq('domain', dom)
                    }
                  }
                  setEditingGrades(false)
                  showToast('Grades saved')
                  loadReport()
                }} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy-dark">Save</button>
              </div>
            )}
          </div>
          {editingGrades ? (
            <div className="grid grid-cols-5 gap-2.5">
              {DOMAINS.map((dom) => {
                const classNa = !!d.domainClassNa[dom]
                const isNa = classNa || !!editNaValues[dom]
                return (
                  <div key={dom} className={`rounded-xl border-[1.5px] ${isNa ? 'border-[#94a3b8] bg-[#f5f5f5]' : 'border-border bg-white'} p-3.5 text-center`}>
                    <div className="text-[11px] text-[#64748b] font-semibold mb-2">{DOMAIN_SHORT[dom]}</div>
                    {isNa ? (
                      <div className="text-[18px] font-bold text-[#94a3b8] py-2 leading-none">N/A</div>
                    ) : (
                      <>
                        <input type="number" min={0} max={100} step={0.1} value={editGradeValues[dom] || ''}
                          onChange={e => setEditGradeValues(prev => ({ ...prev, [dom]: e.target.value }))}
                          className="w-full text-center text-[18px] font-bold px-2 py-1.5 border border-border rounded-lg outline-none focus:border-navy"
                          placeholder="--" />
                        <div className="text-[9px] text-text-tertiary mt-1">%</div>
                      </>
                    )}
                    {classNa ? (
                      <div className="text-[8px] text-[#94a3b8] mt-2 leading-tight">Class N/A · change in Class Overview</div>
                    ) : (
                      <button onClick={() => setEditNaValues(prev => ({ ...prev, [dom]: !prev[dom] }))}
                        className={`text-[9px] mt-2 px-2 py-0.5 rounded font-medium ${isNa ? 'bg-[#94a3b8] text-white hover:bg-[#64748b]' : 'bg-white text-text-secondary border border-border hover:bg-surface-alt'}`}>
                        {isNa ? 'Remove N/A' : 'Mark N/A'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2.5">
              {DOMAINS.map((dom) => {
                if (d.domainNa[dom]) return (
                  <div key={dom} className="rounded-xl border border-border bg-[#f5f5f5] p-3.5 text-center flex flex-col justify-center" style={{ minHeight: 96 }}>
                    <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                    <div className="text-[20px] font-bold text-[#94a3b8] mt-2 leading-none">N/A</div>
                    <div className="text-[9px] text-[#94a3b8] mt-1">Not assessed</div>
                  </div>
                )
                const v = d.domainGrades[dom]
                if (v == null) return (
                  <div key={dom} className="rounded-xl border border-border p-3.5 text-center flex flex-col justify-center" style={{ minHeight: 96 }}>
                    <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                    <div className="text-[22px] font-bold text-[#94a3b8] mt-2 leading-none">—</div>
                  </div>
                )
                const g = getLetterGrade(v)
                return (
                  <div key={dom} className={`rounded-xl border-[1.5px] ${tileBgClass(v)} p-3.5 text-center flex flex-col justify-center`} style={{ minHeight: 96 }}>
                    <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                    <div className="text-[28px] font-extrabold text-[#1e293b] mt-2 leading-none">{v.toFixed(1)}%</div>
                    <div className="text-[15px] font-bold mt-1" style={{ color: letterColor(g) }}>{g}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ─── Teacher Comment ─── */}
        <div className="bg-white px-7 py-6" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <label className="cursor-pointer relative group">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleTeacherPhotoUpload} />
                {d.teacherPhotoUrl ? (
                  <img src={d.teacherPhotoUrl} className="w-9 h-9 rounded-full object-cover border-2 border-[#DFE4EB]" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#C8CED8] text-[#64748b] flex items-center justify-center text-[14px] font-bold border-2 border-[#DFE4EB]">
                    {d.teacherName[0] || ''}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-navy flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                  <Camera size={9} className="text-white" />
                </div>
              </label>
              <div>
                <div className="text-[14px] font-bold text-[#1e293b]">{d.teacherName}</div>
                <div className="text-[10px] text-[#94a3b8]">{s.english_class} Class</div>
              </div>
            </div>
            <button onClick={() => setShowRefPanel(!showRefPanel)}
              className={`print:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${showRefPanel ? 'bg-navy text-white border-navy' : 'bg-[#EDF1F8] text-[#475569] border-[#d1d5db] hover:bg-[#DFE4EB]'}`}>
              <BarChart3 size={14} />
              Student Reference
            </button>
          </div>

          {/* Student Reference Panel */}
          {showRefPanel && (
            <div className="print:hidden bg-[#f8f9fb] border border-[#d1d5db] rounded-xl p-4 mb-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-[#475569]">Student Reference -- All Data at a Glance</p>
                <button onClick={() => {
                  const lines = [
                    `${s.english_name} (${s.korean_name}) -- ${s.english_class} -- Grade ${s.grade}`,
                    `Semester: ${d.semesterName}`,
                    '',
                    'DOMAIN GRADES:',
                    ...DOMAINS.map(dom => `  ${DOMAIN_LONG[dom]}: ${d.domainNa[dom] ? 'N/A' : (d.domainGrades[dom] != null ? `${d.domainGrades[dom]!.toFixed(1)}% (${getLetterGrade(d.domainGrades[dom]!)})` : 'No grade')}`),
                    `  Overall: ${d.overallGrade != null ? `${d.overallGrade.toFixed(1)}% (${d.overallLetter})` : 'No grade'}`,
                    '',
                    'READING FLUENCY:',
                    `  CWPM: ${d.latestReading?.cwpm != null ? Math.round(d.latestReading.cwpm) : 'N/A'}`,
                    `  Lexile: ${d.latestReading?.reading_level || d.latestReading?.passage_level || 'N/A'}`,
                    `  Accuracy: ${d.latestReading?.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : 'N/A'}`,
                    `  NAEP Fluency: ${d.latestReading?.naep_fluency ? `Level ${d.latestReading.naep_fluency}` : 'N/A'}`,
                    '',
                    `ATTENDANCE: ${d.totalAtt > 0 ? `${Math.round((d.attCounts.present / d.totalAtt) * 100)}% (${d.attCounts.present}P/${d.attCounts.absent}A/${d.attCounts.tardy}T)` : 'N/A'}`,
                    `BEHAVIOR LOGS: ${d.behaviorCount} entries`,
                    ...(d.scaffolds?.length ? ['', 'SCAFFOLDS:', ...d.scaffolds.map((sc: any) => `  [${sc.domain}] ${sc.scaffold_text}${sc.effectiveness ? ` (${sc.effectiveness})` : ''}`)] : []),
                    ...(d.goals?.length ? ['', 'GOALS:', ...d.goals.map((g: any) => `  ${g.completed_at ? '[done]' : '[ ]'} [${g.goal_type}] ${g.goal_text}`)] : []),
                  ]
                  navigator.clipboard.writeText(lines.join('\n'))
                  showToast('Copied to clipboard')
                }} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white border border-[#d1d5db] text-[#475569] hover:bg-[#f1f5f9]">
                  Copy to Clipboard
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-2">Domain Grades</p>
                  {DOMAINS.map(dom => {
                    const isNa = !!d.domainNa[dom]
                    const v = d.domainGrades[dom]
                    return (
                      <div key={dom} className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-[#64748b]">{DOMAIN_LONG[dom]}</span>
                        <span className="text-[11px] font-bold" style={{ color: isNa ? '#94a3b8' : (v != null ? letterColor(getLetterGrade(v)) : '#94a3b8') }}>
                          {isNa ? 'N/A' : (v != null ? `${v.toFixed(1)}% (${getLetterGrade(v)})` : '--')}
                        </span>
                      </div>
                    )
                  })}
                  <div className="border-t border-[#e2e8f0] mt-1 pt-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-navy">Overall</span>
                    <span className="text-[11px] font-bold text-navy">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}% (${d.overallLetter})` : '--'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1">Reading Fluency</p>
                    <div className="flex gap-4">
                      <div><p className="text-[9px] text-[#94a3b8]">CWPM</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.cwpm != null ? Math.round(d.latestReading.cwpm) : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Lexile</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.reading_level || d.latestReading?.passage_level || '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Acc.</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">NAEP</p><p className="text-[14px] font-bold text-navy">{d.latestReading?.naep_fluency ? `L${d.latestReading.naep_fluency}` : '--'}</p></div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1">Attendance / Behavior</p>
                    <div className="flex gap-4">
                      <div><p className="text-[9px] text-[#94a3b8]">Attendance</p><p className="text-[12px] font-bold text-navy">{d.totalAtt > 0 ? `${Math.round((d.attCounts.present / d.totalAtt) * 100)}%` : '--'}</p></div>
                      <div><p className="text-[9px] text-[#94a3b8]">Behavior Logs</p><p className="text-[12px] font-bold text-navy">{d.behaviorCount}</p></div>
                    </div>
                  </div>
                </div>
              </div>

              {d.scaffolds && d.scaffolds.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3 mb-2">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1.5">Active Scaffolds ({d.scaffolds.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {d.scaffolds.map((sc: any, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] text-blue-800">
                        <span className="font-bold uppercase text-[8px]">{sc.domain}</span> {sc.scaffold_text}
                        {sc.effectiveness === 'working' && <span className="text-green-600">✓</span>}
                        {sc.effectiveness === 'not_working' && <span className="text-red-600">✗</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {d.goals && d.goals.length > 0 && (
                <div className="bg-white rounded-lg border border-[#e2e8f0] p-3">
                  <p className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-semibold mb-1.5">Student Goals ({d.goals.length})</p>
                  <div className="space-y-0.5">
                    {d.goals.map((g: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span>{g.completed_at ? '[done]' : '[ ]'}</span>
                        <span className={g.completed_at ? 'line-through text-text-tertiary' : 'text-[#475569]'}>{g.goal_text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-[11px] text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={commentSkipped}
                onChange={(e: any) => setCommentSkipped(e.target.checked)} />
              Skip comment for this student
            </label>
            {commentSkipped && <span className="text-[10px] text-[#94a3b8] italic">Comment section will be hidden on the printed report.</span>}
          </div>
          <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={6}
            disabled={commentSkipped}
            placeholder={commentSkipped ? 'Skipped — uncheck above to write a comment.' : "Write comments about this student's progress..."}
            className={`w-full px-4 py-3 border border-[#C8CED8] rounded-xl text-[13px] outline-none focus:border-navy resize-none leading-relaxed ${commentSkipped ? 'bg-[#f5f5f5] text-text-tertiary cursor-not-allowed' : 'bg-[#fafaf8]'}`} />
          <div className="flex justify-end mt-2">
            <button onClick={saveComment} disabled={savingComment}
              className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              {savingComment ? 'Saving...' : 'Save Comment'}
            </button>
          </div>
        </div>

        {/* ─── Grading Scale + Footer ─── */}
        <div className="bg-white px-7 py-4">
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-2.5">Grading Scale</div>
          <div className="flex gap-1 flex-wrap">
            {SCALE_DISPLAY.map((r: any) => (
              <span key={r.letter + r.range} className="px-2 py-0.5 rounded bg-[#EDF1F8] border border-[#C8CED8] text-[10px] inline-flex gap-1">
                <strong style={{ color: letterColor(r.letter) }}>{r.letter}</strong>
                <span className="text-[#94a3b8]">{r.range}</span>
              </span>
            ))}
          </div>
          <div className="text-center mt-4 pt-3 text-[10px] text-[#b8b0a6] tracking-wider" style={{ borderTop: '1px solid #C8CED8' }}>
            Daewoo Elementary School &middot; English Program &middot; {d.semesterName}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Review & Approval Workflow ─────────────────────────────────────

interface ReviewStatus {
  student_id: string
  semester_id: string
  partner_approved: boolean
  partner_teacher_id: string | null
  partner_approved_at: string | null
  admin_approved: boolean
  admin_approved_at: string | null
  notes: string
}

function ReviewApproval({ students, semesterId, selectedClass, selectedGrade }: {
  students: any[]; semesterId: string; selectedClass: EnglishClass; selectedGrade: Grade
}) {
  const { showToast, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.is_head_teacher
  const [reviews, setReviews] = useState<Record<string, ReviewStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from('report_card_reviews').select('*')
          .eq('semester_id', semesterId).in('student_id', students.map(s => s.id))
        if (!error) {
          const map: Record<string, ReviewStatus> = {}
          data?.forEach((r: any) => { map[r.student_id] = r })
          setReviews(map)
        }
      } catch { /* table may not exist yet */ }
      setLoading(false)
    })()
  }, [semesterId, students])

  const toggleApproval = async (studentId: string, field: 'partner_approved' | 'admin_approved') => {
    if (field === 'admin_approved' && !isAdmin) return
    setSaving(studentId)
    const existing = reviews[studentId]
    const newVal = !(existing?.[field])
    const row: any = {
      student_id: studentId, semester_id: semesterId,
      [field]: newVal,
      ...(field === 'partner_approved' ? {
        partner_teacher_id: newVal ? currentTeacher?.id : null,
        partner_approved_at: newVal ? new Date().toISOString() : null,
      } : {
        admin_approved_at: newVal ? new Date().toISOString() : null,
      }),
    }
    const { data, error } = await supabase.from('report_card_reviews').upsert(row, {
      onConflict: 'student_id,semester_id'
    }).select().single()
    if (error) {
      showToast(error.message?.includes('404') || error.code === '42P01' ? 'Report card reviews table not set up yet. Run the SQL migration.' : `Error: ${error.message}`)
    } else {
      setReviews(prev => ({ ...prev, [studentId]: { ...prev[studentId], ...data } }))
      showToast(newVal ? 'Approved' : 'Approval removed')
    }
    setSaving(null)
  }

  const approveAll = async (field: 'partner_approved' | 'admin_approved') => {
    if (field === 'admin_approved' && !isAdmin) return
    setSaving('all')
    let errors = 0
    for (const s of students) {
      const existing = reviews[s.id]
      if (existing?.[field]) continue // already approved
      const row: any = {
        student_id: s.id, semester_id: semesterId,
        [field]: true,
        ...(field === 'partner_approved' ? {
          partner_teacher_id: currentTeacher?.id,
          partner_approved_at: new Date().toISOString(),
        } : {
          admin_approved_at: new Date().toISOString(),
        }),
      }
      const { error } = await supabase.from('report_card_reviews').upsert(row, { onConflict: 'student_id,semester_id' }).select().single()
      if (!error) {
        setReviews(prev => ({ ...prev, [s.id]: { ...prev[s.id], ...row } }))
      } else errors++
    }
    setSaving(null)
    showToast(errors > 0 ? `Approved with ${errors} error(s)` : `All ${students.length} students approved`)
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const partnerCount = students.filter(s => reviews[s.id]?.partner_approved).length
  const adminCount = students.filter(s => reviews[s.id]?.admin_approved).length
  const fullyApproved = students.filter(s => reviews[s.id]?.partner_approved && reviews[s.id]?.admin_approved).length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">Report Card Review</h3>
            <p className="text-[12px] text-text-secondary">{selectedClass} -- Grade {selectedGrade} -- {students.length} students</p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-[22px] font-bold text-blue-600">{partnerCount}/{students.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Partner Reviewed</p>
            </div>
            <div>
              <p className="text-[22px] font-bold text-green-600">{adminCount}/{students.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Admin Approved</p>
            </div>
            <div>
              <p className="text-[22px] font-bold text-navy">{fullyApproved}/{students.length}</p>
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary">Ready to Print</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${students.length > 0 ? (fullyApproved / students.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Bulk approve buttons */}
      <div className="flex gap-2">
        <button onClick={() => approveAll('partner_approved')} disabled={saving === 'all'}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
          <CheckCircle2 size={14} /> Approve All as Partner
        </button>
        {isAdmin && (
          <button onClick={() => approveAll('admin_approved')} disabled={saving === 'all'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
            <CheckCircle2 size={14} /> Approve All as Admin
          </button>
        )}
      </div>

      {/* Student list */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-surface-alt border-b border-border grid grid-cols-[1fr,auto,auto,auto] items-center gap-4">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Student</span>
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-32 text-center">Partner Review</span>
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-32 text-center">Admin Approval</span>
          <span className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-24 text-center">Status</span>
        </div>
        {students.map(student => {
          const r = reviews[student.id]
          const partnerOk = r?.partner_approved
          const adminOk = r?.admin_approved
          const ready = partnerOk && adminOk

          return (
            <div key={student.id} className={`px-4 py-3 border-b border-border last:border-0 grid grid-cols-[1fr,auto,auto,auto] items-center gap-4 ${ready ? 'bg-green-50/30' : ''}`}>
              <div>
                <span className="text-[13px] font-medium text-navy">{student.english_name}</span>
                <span className="text-[11px] text-text-tertiary ml-2">{student.korean_name}</span>
              </div>
              <div className="w-32 flex justify-center">
                <button onClick={() => toggleApproval(student.id, 'partner_approved')}
                  disabled={saving === student.id}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    partnerOk
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-surface-alt text-text-tertiary border border-border hover:border-blue-300'
                  }`}>
                  {partnerOk ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                  {partnerOk ? 'Reviewed' : 'Review'}
                </button>
              </div>
              <div className="w-32 flex justify-center">
                {isAdmin ? (
                  <button onClick={() => toggleApproval(student.id, 'admin_approved')}
                    disabled={saving === student.id}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      adminOk
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-surface-alt text-text-tertiary border border-border hover:border-green-300'
                    }`}>
                    {adminOk ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                    {adminOk ? 'Approved' : 'Approve'}
                  </button>
                ) : (
                  <span className={`text-[11px] font-medium ${adminOk ? 'text-green-600' : 'text-text-tertiary'}`}>
                    {adminOk ? 'Approved' : 'Pending'}
                  </span>
                )}
              </div>
              <div className="w-24 flex justify-center">
                {ready ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600"><CheckCircle2 size={13} /> Ready</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600"><Circle size={13} /> Pending</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Class Summary ──────────────────────────────────────────────────

function ClassSummary({ students, semesterId, semester, lang, selectedClass, selectedGrade }: {
  students: any[]; semesterId: string; semester: any; lang: LangKey; selectedClass: string; selectedGrade: number
}) {
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (students.length === 0) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      const { data: assessments } = await supabase.from('assessments').select('*')
        .eq('semester_id', semesterId).eq('grade', selectedGrade).eq('english_class', selectedClass)
      const { data: allGrades } = await supabase.from('grades').select('*').in('student_id', students.map((s: any) => s.id))

      const hasAssessments = (assessments || []).length > 0

      let results: any[]
      if (hasAssessments) {
        results = students.map((s: any) => {
          const domainAvgs: Record<string, number | null> = {}
          let totalSum = 0, totalCount = 0
          DOMAINS.forEach((domain) => {
            const domAssessments = (assessments || []).filter((a: any) => a.domain === domain)
            const items: { score: number; maxScore: number; assessmentType: 'formative' | 'summative' | 'performance_task' }[] = []
            domAssessments.forEach((a: any) => {
              const g = (allGrades || []).find((gr: any) => gr.assessment_id === a.id && gr.student_id === s.id)
              if (!g || g.score == null || g.is_exempt || a.max_score <= 0) return
              items.push({ score: g.score, maxScore: a.max_score, assessmentType: a.type || 'formative' })
            })
            const avg = calcWeightedAvg(items, Number(selectedGrade))
            if (avg != null) {
              domainAvgs[domain] = Math.round(avg * 10) / 10; totalSum += domainAvgs[domain]!; totalCount++
            } else { domainAvgs[domain] = null }
          })
          const overall = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : null
          return { student: s, domainAvgs, overall, letter: overall != null ? getLetterGrade(overall) : '\u2014' }
        })
      } else {
        // Fallback: semester_grades (historical imports)
        const { data: semGrades } = await supabase.from('semester_grades').select('*')
          .eq('semester_id', semesterId).in('student_id', students.map((s: any) => s.id))
        results = students.map((s: any) => {
          const domainAvgs: Record<string, number | null> = {}
          let totalSum = 0, totalCount = 0
          const studentSG = (semGrades || []).filter((sg: any) => sg.student_id === s.id)
          DOMAINS.forEach((domain) => {
            const sg = studentSG.find((g: any) => g.domain === domain)
            const val = sg ? (sg.final_grade ?? sg.calculated_grade ?? null) : null
            domainAvgs[domain] = val
            if (val != null) { totalSum += val; totalCount++ }
          })
          const overall = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : null
          const behaviorSG = studentSG.find((g: any) => g.domain === 'overall')
          return { student: s, domainAvgs, overall, letter: overall != null ? getLetterGrade(overall) : '\u2014', behaviorGrade: behaviorSG?.behavior_grade || null }
        })
      }
      results.sort((a: any, b: any) => (b.overall || 0) - (a.overall || 0))
      setSummaries(results)
      setLoading(false)
    })()
  }, [students, semesterId, selectedGrade, selectedClass])

  const handlePrint = () => {
    const rows = summaries.map((s: any, i: number) =>
      `<tr><td style="padding:6px 10px;color:#94a3b8">${i + 1}</td>
       <td style="padding:6px 10px;font-weight:500;color:#647FBC">${s.student.english_name} <span style="color:#94a3b8;font-size:10px">${s.student.korean_name}</span></td>
       ${DOMAINS.map((d) => `<td style="padding:6px 10px;text-align:center;font-weight:600;color:${s.domainAvgs[d] != null ? (s.domainAvgs[d] >= 80 ? '#16a34a' : s.domainAvgs[d] >= 60 ? '#647FBC' : '#dc2626') : '#94a3b8'}">${s.domainAvgs[d] != null ? s.domainAvgs[d].toFixed(1) : '\u2014'}</td>`).join('')}
       <td style="padding:6px 10px;text-align:center;font-weight:700;color:#647FBC">${s.overall != null ? s.overall.toFixed(1) : '\u2014'}</td>
       <td style="padding:6px 10px;text-align:center;font-weight:700;color:${s.letter !== '\u2014' ? letterColor(s.letter) : '#999'}">${s.letter}</td></tr>`
    ).join('')
    const pw = window.open('', '_blank'); if (!pw) return
    pw.document.write(`<html><head><title>Class Summary</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f5f0eb}
    .page{max-width:900px;margin:20px auto;overflow:hidden;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#f0eae3;padding:8px 10px;border-bottom:2px solid #d4c8b8;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#647FBC}
    td{padding:6px 10px;border-bottom:1px solid #C8CED8}
    tr:nth-child(even) td{background:#faf8f5}
    @media print{@page{size:A4 landscape;margin:8mm}body{background:white}.page{margin:0;box-shadow:none;border-radius:0}}
    </style></head><body><div class="page">
    <div style="background:#647FBC;padding:16px 24px;color:white;display:flex;justify-content:space-between;align-items:center">
      <div>
        <p style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:0.6">Class Summary</p>
        <p style="font-size:20px;font-weight:700;font-family:Georgia,serif;margin-top:4px">${selectedClass} -- Grade ${selectedGrade}</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:12px;opacity:0.7">${summaries.length} students</p>
        <p style="font-size:11px;opacity:0.5">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
    </div>
    <div style="background:white;padding:16px">
    <table><thead><tr><th style="text-align:left">#</th><th style="text-align:left">Student</th>${DOMAINS.map((d) => `<th style="text-align:center">${DOMAIN_PRINT[d]}</th>`).join('')}<th style="text-align:center">Overall</th><th style="text-align:center">Grade</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div style="background:#EDF1F8;padding:10px 24px;text-align:center;border-top:1px solid #C8CED8;font-size:9px;color:#b8b0a6;letter-spacing:1px">Daewoo Elementary School \u00b7 English Program</div>
    </div></body></html>`)
    pw.document.close(); pw.print()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  const classAvgs: Record<string, number> = {}
  DOMAINS.forEach((d) => {
    const vals = summaries.filter((s: any) => s.domainAvgs[d] != null).map((s: any) => s.domainAvgs[d])
    classAvgs[d] = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : 0
  })

  return (
    <div className="space-y-4">
      <div className="bg-accent-light border border-border rounded-xl p-5 flex items-center justify-between">
        <div className="flex gap-6">
          {DOMAINS.map((d) => (
            <div key={d} className="text-center">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">{DOMAIN_SHORT[d]}</p>
              <p className="text-lg font-bold text-navy">{classAvgs[d] > 0 ? `${classAvgs[d]}%` : '\u2014'}</p>
            </div>
          ))}
        </div>
        <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border hover:bg-surface-alt"><Printer size={13} /> Print</button>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
            {DOMAINS.map((d) => <th key={d} className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{DOMAIN_SHORT[d]}</th>)}
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Overall</th>
            <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Grade</th>
          </tr></thead>
          <tbody>
            {summaries.map((s: any, i: number) => (
              <tr key={s.student.id} className="border-t border-border table-row-hover">
                <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                <td className="px-4 py-2.5"><span className="font-medium">{s.student.english_name}</span><span className="text-text-tertiary ml-2 text-[11px]">{s.student.korean_name}</span></td>
                {DOMAINS.map((d) => (
                  <td key={d} className="px-3 py-2.5 text-center">
                    {s.domainAvgs[d] != null ? <span className={`font-semibold ${s.domainAvgs[d] >= 90 ? 'text-green-600' : s.domainAvgs[d] >= 80 ? 'text-blue-600' : s.domainAvgs[d] >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.domainAvgs[d].toFixed(1)}</span> : <span className="text-text-tertiary">&mdash;</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-navy">{s.overall != null ? s.overall.toFixed(1) : '\u2014'}</td>
                <td className="px-4 py-2.5 text-center font-bold text-[15px]" style={{ color: s.letter !== '\u2014' ? letterColor(s.letter) : '#999' }}>{s.letter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Progress Report Class Overview ─────────────────────────────────
function ProgressClassOverview({ students, semesterId, semester, selectedClass, selectedGrade, onSelectStudent }: {
  students: any[]; semesterId: string; semester: any;
  selectedClass: EnglishClass; selectedGrade: Grade;
  onSelectStudent: (studentId: string) => void;
}) {
  const { showToast, currentTeacher } = useApp()
  const [loading, setLoading] = useState(true)
  const [classNa, setClassNa] = useState<Record<string, boolean>>({})
  const [studentRows, setStudentRows] = useState<Array<{ student: any; status: Record<string, 'graded' | 'na' | 'empty'>; isComplete: boolean; hasComment: boolean; commentSkipped: boolean }>>([])
  const [domainAvgs, setDomainAvgs] = useState<Record<string, number | null>>({})
  const [savingNa, setSavingNa] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    if (students.length === 0) {
      setClassNa({}); setStudentRows([]); setDomainAvgs({}); setLoading(false); return
    }
    const studentIds = students.map(s => s.id)

    // Class N/A settings
    const { data: cls } = await supabase.from('class_report_settings').select('domain, is_na')
      .eq('semester_id', semesterId).eq('english_class', selectedClass).eq('grade', selectedGrade)
    const cna: Record<string, boolean> = {}
    DOMAINS.forEach(d => { cna[d] = false })
    ;(cls || []).forEach((r: any) => { if (DOMAINS.includes(r.domain)) cna[r.domain] = !!r.is_na })

    // Bulk load all student grades + comments for this class+semester
    const [allGradesRes, allCommentsRes] = await Promise.all([
      supabase.from('semester_grades').select('student_id, domain, final_grade, calculated_grade, is_na')
        .eq('semester_id', semesterId).in('student_id', studentIds),
      supabase.from('comments').select('student_id, text, is_skipped')
        .eq('semester_id', semesterId).in('student_id', studentIds),
    ])
    const allGrades = allGradesRes.data || []
    const commentsByStudent: Record<string, { text: string; skipped: boolean }> = {}
    ;(allCommentsRes.data || []).forEach((c: any) => { commentsByStudent[c.student_id] = { text: (c.text || '').trim(), skipped: !!c.is_skipped } })

    const rows = students.map(student => {
      const myGrades = allGrades.filter((g: any) => g.student_id === student.id)
      const status: Record<string, 'graded' | 'na' | 'empty'> = {}
      let scoredCount = 0
      let naCount = 0
      DOMAINS.forEach(d => {
        const sg = myGrades.find((g: any) => g.domain === d)
        const studentNa = !!sg?.is_na
        const grade = sg ? (sg.final_grade ?? sg.calculated_grade ?? null) : null
        if (studentNa || cna[d]) { status[d] = 'na'; naCount++ }
        else if (grade != null) { status[d] = 'graded'; scoredCount++ }
        else { status[d] = 'empty' }
      })
      const isComplete = (scoredCount + naCount) === DOMAINS.length
      const c = commentsByStudent[student.id]
      const hasComment = !!(c && (c.text || c.skipped))
      const commentSkipped = !!c?.skipped
      return { student, status, isComplete, hasComment, commentSkipped }
    })

    // Class domain averages — exclude student-level is_na; class-N/A → null
    const avgs: Record<string, number | null> = {}
    DOMAINS.forEach(d => {
      if (cna[d]) { avgs[d] = null; return }
      const vals = allGrades.filter((g: any) => g.domain === d && !g.is_na)
        .map((g: any) => g.final_grade ?? g.calculated_grade)
        .filter((v: any) => v != null) as number[]
      avgs[d] = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : null
    })

    setClassNa(cna)
    setStudentRows(rows)
    setDomainAvgs(avgs)
    setLoading(false)
  }, [students, semesterId, selectedClass, selectedGrade])

  useEffect(() => { load() }, [load])

  const toggleClassNa = async (domain: string) => {
    setSavingNa(domain)
    const newVal = !classNa[domain]
    const { error } = await supabase.from('class_report_settings').upsert({
      semester_id: semesterId, english_class: selectedClass, grade: selectedGrade,
      domain, is_na: newVal, updated_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'semester_id,english_class,grade,domain' })
    setSavingNa(null)
    if (error) {
      showToast(error.code === '42P01' ? 'class_report_settings table not set up yet. Run the SQL migration.' : `Error: ${error.message}`)
      return
    }
    showToast(newVal ? `${DOMAIN_SHORT[domain]} marked N/A for class` : `${DOMAIN_SHORT[domain]} N/A removed for class`)
    load()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  if (students.length === 0) {
    return <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">No students in this class.</div>
  }

  const completeCount = studentRows.filter(r => r.isComplete).length
  const commentCount = studentRows.filter(r => r.hasComment).length

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#f5f0eb' }}>
        {/* Header */}
        <div className="bg-navy px-7 py-5 text-white">
          <div className="text-[10px] opacity-50 tracking-[2.5px] uppercase font-medium">Progress Report Class Overview</div>
          <div className="text-[22px] font-bold mt-1 font-display">{semester.name} &middot; Grade {selectedGrade} &middot; {selectedClass}</div>
          <div className="text-[11px] opacity-60 mt-0.5 italic">{students.length} student{students.length === 1 ? '' : 's'}</div>
        </div>

        {/* Class averages */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3">Class Domain Averages</div>
          <div className="grid grid-cols-5 gap-2.5">
            {DOMAINS.map(dom => {
              if (classNa[dom]) return (
                <div key={dom} className="rounded-xl border border-border bg-[#f5f5f5] p-3 text-center flex flex-col justify-center" style={{ minHeight: 76 }}>
                  <div className="text-[10px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[16px] font-bold text-[#94a3b8] mt-1">N/A</div>
                </div>
              )
              const v = domainAvgs[dom]
              if (v == null) return (
                <div key={dom} className="rounded-xl border border-border p-3 text-center flex flex-col justify-center bg-white" style={{ minHeight: 76 }}>
                  <div className="text-[10px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[18px] font-bold text-[#94a3b8] mt-1">&mdash;</div>
                </div>
              )
              return (
                <div key={dom} className={`rounded-xl border-[1.5px] ${tileBgClass(v)} p-3 text-center flex flex-col justify-center`} style={{ minHeight: 76 }}>
                  <div className="text-[10px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[20px] font-extrabold text-[#1e293b] mt-1 leading-none">{v.toFixed(1)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Completion stats */}
        <div className="bg-white px-7 py-4" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3">Completion</div>
          <div className="flex gap-8">
            <div>
              <div className="text-[10px] text-text-secondary">All 5 domains scored or N/A</div>
              <div className="text-[18px] font-bold text-navy mt-0.5">{completeCount} <span className="text-text-tertiary text-[12px] font-normal">/ {students.length}</span></div>
            </div>
            <div>
              <div className="text-[10px] text-text-secondary">Comment written</div>
              <div className="text-[18px] font-bold text-navy mt-0.5">{commentCount} <span className="text-text-tertiary text-[12px] font-normal">/ {students.length}</span></div>
            </div>
          </div>
        </div>

        {/* Class N/A toggles */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-1">Class N/A Settings</div>
          <p className="text-[11px] text-text-tertiary mb-3">Mark a domain as <strong>not assessed this term</strong> for the entire class. Every student's report will show N/A for that domain (per-student N/A still applies on top).</p>
          <div className="grid grid-cols-5 gap-2.5">
            {DOMAINS.map(dom => {
              const isOn = !!classNa[dom]
              const saving = savingNa === dom
              return (
                <button key={dom} onClick={() => toggleClassNa(dom)} disabled={saving}
                  className={`rounded-lg p-3 text-center border transition-all ${isOn ? 'bg-[#94a3b8] text-white border-[#94a3b8]' : 'bg-white text-[#475569] border-border hover:bg-surface-alt'} ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                  <div className="text-[11px] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{isOn ? '✓ N/A' : 'Mark N/A'}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Student list */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #C8CED8' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold">Students</div>
            <div className="text-[10px] text-text-tertiary">Click a student to open their progress report</div>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Student</th>
                {DOMAINS.map(d => <th key={d} className="text-center py-2 px-1 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{DOMAIN_SHORT[d]}</th>)}
                <th className="text-center py-2 px-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Comment</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map(({ student, status, hasComment, commentSkipped }) => (
                <tr key={student.id} onClick={() => onSelectStudent(student.id)}
                  className="border-b border-border cursor-pointer hover:bg-surface-alt">
                  <td className="py-2 px-2">
                    <div className="font-semibold text-navy text-[12px]">{student.english_name}</div>
                    <div className="text-[10px] text-text-tertiary">{student.korean_name} &middot; #{student.class_number}</div>
                  </td>
                  {DOMAINS.map(d => (
                    <td key={d} className="text-center py-2 px-1">
                      {status[d] === 'graded' && <span title="Graded" className="inline-block w-3 h-3 rounded-full bg-green-500" />}
                      {status[d] === 'na' && <span title="N/A" className="text-[9px] font-bold text-[#94a3b8]">N/A</span>}
                      {status[d] === 'empty' && <span title="No grade" className="inline-block w-3 h-3 rounded-full border border-border bg-white" />}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2">
                    {commentSkipped
                      ? <span title="Comment skipped" className="text-[#94a3b8] text-[10px] font-semibold">SKIP</span>
                      : hasComment
                      ? <span title="Comment written" className="text-green-600 font-bold">&#10003;</span>
                      : <span title="No comment" className="text-text-tertiary">&mdash;</span>}
                  </td>
                  <td className="text-right py-2 px-2 text-text-tertiary">
                    <ChevronRight size={14} className={isComplete ? '' : 'opacity-50'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Batch print */}
        <div className="bg-white px-7 py-4 flex items-center justify-between">
          <div className="text-[11px] text-text-tertiary">Save as PDF in the print dialog to download the whole class as one file.</div>
          <BatchPrintButton students={students} semesterId={semesterId} className={selectedClass} />
        </div>
      </div>
    </div>
  )
}
