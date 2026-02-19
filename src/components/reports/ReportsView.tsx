'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, Printer, User, Users, ChevronLeft, ChevronRight, Plus, Camera, BarChart3 } from 'lucide-react'

type LangKey = 'en' | 'ko'

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
type Domain = typeof DOMAINS[number]
const DOMAIN_SHORT: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking', language: 'Language',
}
const DOMAIN_PRINT: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics &<br>Foundational<br>Skills', writing: 'Writing',
  speaking: 'Speaking &<br>Listening', language: 'Language<br>Standards',
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
  const [mode, setMode] = useState<'individual' | 'progress' | 'class'>('individual')
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
        {mode === 'progress' && !selectedStudentId && selectedSemesterId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center">
            <p className="text-text-tertiary mb-4">Select a student to generate their progress report, or print all at once.</p>
            <BatchPrintButton students={students} semesterId={selectedSemesterId} className={selectedClass} />
          </div>
        )}
        {mode === 'progress' && !selectedStudentId && !selectedSemesterId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">Select a student to generate their progress report.</div>
        )}
        {mode === 'class' && selectedSemesterId && selectedSemester && (
          <ClassSummary students={students} semesterId={selectedSemesterId} semester={selectedSemester} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} />
        )}
      </div>
    </div>
  )
}

// ─── Info Cell ───────────────────────────────────────────────────────

function InfoCell({ label, value, bold = false }: { label: string; value: any; bold?: boolean }) {
  return (
    <div className="py-1.5 border-b border-[#f1ede8]">
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
  const size = 280
  const cx = size / 2, cy = size / 2 + 6 // shift center down slightly so top label fits
  const maxR = 75
  const levels = [20, 40, 60, 80, 100]
  const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const labels = ['Read', 'Phon', 'Write', 'Speak', 'Lang']
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
          fill="none" stroke="#e8e0d8" strokeWidth={lvl === 60 ? 0.8 : 0.5}
          strokeDasharray={lvl === 100 ? undefined : '2,2'}
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const end = toXY(a, 100)
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#e8e0d8" strokeWidth={0.5} />
      })}

      {/* Class average polygon */}
      {hasClass && (
        <polygon
          points={makePolygon(classValues)}
          fill="rgba(148,163,184,0.15)" stroke="#94a3b8" strokeWidth={2}
          strokeDasharray="4,3"
        />
      )}

      {/* Student polygon — only draw if 3+ domains, otherwise just dots */}
      {filledCount >= 3 && (
        <polygon
          points={makePolygon(studentValues)}
          fill="rgba(30,58,95,0.3)" stroke="#1e3a5f" strokeWidth={2.5}
        />
      )}

      {/* For 2 domains, draw a line between them */}
      {filledCount === 2 && (() => {
        const pts = studentValues.map((v, i) => v != null ? toXY(angles[i], v) : null).filter(Boolean) as { x: number; y: number }[]
        return pts.length === 2 ? <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke="#1e3a5f" strokeWidth={2} /> : null
      })()}

      {/* Student dots — always show */}
      {studentValues.map((v, i) => {
        if (v == null) return null
        const pt = toXY(angles[i], v)
        return <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r={4} fill="#1e3a5f" stroke="white" strokeWidth={1.5} />
      })}

      {/* Domain labels — positioned further out with smart anchoring */}
      {angles.map((a, i) => {
        const labelR = maxR + 28
        const pt = toXY(a, (labelR / maxR) * 100)
        const sv = studentValues[i]
        // Smart text anchor: left side = end, right side = start, top/bottom = middle
        const anchor = pt.x < cx - 10 ? 'end' : pt.x > cx + 10 ? 'start' : 'middle'
        return (
          <g key={`label-${i}`}>
            <text x={pt.x} y={pt.y - 5} textAnchor={anchor} dominantBaseline="middle"
              style={{ fontSize: '10px', fontWeight: 700, fill: '#475569' }}>
              {labels[i]}
            </text>
            {sv != null && (
              <text x={pt.x} y={pt.y + 7} textAnchor={anchor} dominantBaseline="middle"
                style={{ fontSize: '9px', fontWeight: 700, fill: '#1e3a5f' }}>
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
  const [savingComment, setSavingComment] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [commentTone, setCommentTone] = useState<'Balanced' | 'Highlight growth' | 'Constructive'>('Balanced')
  const [editingGrades, setEditingGrades] = useState(false)
  const [editGradeValues, setEditGradeValues] = useState<Record<string, string>>({})

  const generateTemplateComment = useCallback(async () => {
    if (!data || !studentId) return
    const d = data, s = d.student
    const name = s.english_name?.split(' ')[0] || s.english_name || 'This student'

    // Fetch extra data for richer comments
    const [widaRes, readingRes, behaviorRes] = await Promise.all([
      supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', studentId),
      supabase.from('reading_assessments').select('cwpm, accuracy_rate, date').eq('student_id', studentId).order('date', { ascending: false }).limit(3),
      supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])

    // WIDA info
    const widaLevels = widaRes.data || []
    const widaMap: Record<string, number> = {}
    widaLevels.forEach((w: any) => { widaMap[w.domain] = w.wida_level })
    const widaVals = Object.values(widaMap).filter(v => v > 0)
    const widaAvg = widaVals.length > 0 ? Math.round((widaVals.reduce((a, b) => a + b, 0) / widaVals.length) * 10) / 10 : null
    const WIDA_NAMES: Record<number, string> = { 1: 'Entering', 2: 'Emerging', 3: 'Developing', 4: 'Expanding', 5: 'Bridging', 6: 'Reaching' }

    // Reading
    const readings = readingRes.data || []
    const latestCwpm = readings[0]?.cwpm ? Math.round(readings[0].cwpm) : null
    const readingTrend = readings.length >= 2 ? (readings[0].cwpm > readings[1].cwpm ? 'improving' : readings[0].cwpm < readings[1].cwpm ? 'declining' : 'stable') : null

    // Grades
    const scoredDomains = DOMAINS.filter(dom => d.domainGrades[dom] != null)
    const strongDomains = scoredDomains.filter(dom => (d.domainGrades[dom] || 0) >= 80)
    const weakDomains = scoredDomains.filter(dom => (d.domainGrades[dom] || 0) < 65)
    const growthDomains = d.prevDomainGrades ? scoredDomains.filter(dom => d.prevDomainGrades![dom] != null && (d.domainGrades[dom] || 0) > (d.prevDomainGrades![dom] || 0) + 3) : []

    // Build comment
    const parts: string[] = []

    // Opening
    if (d.overallGrade != null && d.overallGrade >= 85) {
      parts.push(`${name} is performing very well in the English program this semester with an overall average of ${d.overallGrade.toFixed(1)}%.`)
    } else if (d.overallGrade != null && d.overallGrade >= 70) {
      parts.push(`${name} is making steady progress in the English program this semester with an overall average of ${d.overallGrade.toFixed(1)}%.`)
    } else if (d.overallGrade != null) {
      parts.push(`${name} is working to build foundational skills in the English program this semester with a current overall average of ${d.overallGrade.toFixed(1)}%.`)
    } else {
      parts.push(`${name} is a member of the ${s.english_class} class this semester.`)
    }

    // Strengths
    if (strongDomains.length > 0) {
      const labels = strongDomains.map(dom => DOMAIN_SHORT[dom]).join(' and ')
      parts.push(`${name} shows particular strength in ${labels}.`)
    }

    // Growth areas (tone-dependent)
    if (commentTone === 'Constructive' && weakDomains.length > 0) {
      const labels = weakDomains.map(dom => DOMAIN_SHORT[dom]).join(' and ')
      parts.push(`${labels} ${weakDomains.length > 1 ? 'are areas' : 'is an area'} where additional practice and support would be beneficial.`)
    } else if (commentTone === 'Highlight growth' && growthDomains.length > 0) {
      const labels = growthDomains.map(dom => DOMAIN_SHORT[dom]).join(' and ')
      parts.push(`${name} has shown notable improvement in ${labels} compared to last semester.`)
    }

    // WIDA context
    if (widaAvg != null) {
      const widaRounded = Math.round(widaAvg)
      const widaName = WIDA_NAMES[widaRounded] || ''
      if (widaRounded <= 2) {
        parts.push(`As a WIDA Level ${widaRounded} (${widaName}) English learner, ${name} benefits from visual supports, sentence frames, and vocabulary pre-teaching.`)
      } else if (widaRounded === 3) {
        parts.push(`As a WIDA Level 3 (Developing) English learner, ${name} is growing in independence and benefits from graphic organizers and structured writing support.`)
      } else if (widaRounded >= 4) {
        parts.push(`As a WIDA Level ${widaRounded} (${widaName}) English learner, ${name} communicates effectively and is working to refine academic language skills.`)
      }
    }

    // Reading fluency
    if (latestCwpm != null) {
      if (readingTrend === 'improving') {
        parts.push(`In reading fluency, ${name} is currently reading at ${latestCwpm} CWPM and showing an upward trend.`)
      } else if (readingTrend === 'declining') {
        parts.push(`${name}'s current reading fluency is ${latestCwpm} CWPM. Continued practice with independent reading would help build consistency.`)
      } else {
        parts.push(`${name} is currently reading at ${latestCwpm} CWPM.`)
      }
    }

    // Closing
    if (commentTone === 'Highlight growth' && d.prevOverall != null && d.overallGrade != null && d.overallGrade > d.prevOverall) {
      parts.push(`Overall, ${name} has improved from ${d.prevOverall.toFixed(1)}% to ${d.overallGrade.toFixed(1)}% since last semester, which reflects real effort and growth.`)
    } else if (commentTone === 'Constructive') {
      parts.push(`With continued effort and targeted practice, ${name} is well-positioned for further growth.`)
    } else {
      parts.push(`${name} is a valued member of the classroom and I look forward to continued progress.`)
    }

    setComment(parts.join(' '))
    setShowAiPanel(false)
    showToast('Draft generated -- please review and edit before saving')
  }, [data, studentId, commentTone])
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
        const { data: allGrades } = await supabase.from('grades').select('*').in('student_id', students.map((s: any) => s.id))
        // Calculate and upsert for each student in current roster
        for (const s of students) {
          for (const domain of DOMAINS) {
            const domAssessments = assessments.filter((a: any) => a.domain === domain)
            const scores = domAssessments.map((a: any) => {
              const g = (allGrades || []).find((gr: any) => gr.assessment_id === a.id && gr.student_id === s.id)
              if (!g || g.score == null || g.is_exempt) return null
              return (g.score / a.max_score) * 100
            }).filter((x: any) => x !== null) as number[]
            if (scores.length > 0) {
              const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10
              await supabase.from('semester_grades').upsert({
                student_id: s.id, semester_id: semesterId, domain,
                calculated_grade: avg, english_class: s.english_class, grade: s.grade,
              }, { onConflict: 'student_id,semester_id,domain' })
            }
          }
        }
      }
    }

    // ─── STEP 2: Read this student's grades from semester_grades ───
    const { data: myGrades } = await supabase.from('semester_grades').select('*')
      .eq('student_id', studentId).eq('semester_id', semesterId)
    
    const domainGrades: Record<string, number | null> = {}
    let behaviorGrade: string | null = null
    DOMAINS.forEach(d => { domainGrades[d] = null })
    ;(myGrades || []).forEach((sg: any) => {
      if (sg.domain === 'overall') {
        behaviorGrade = sg.behavior_grade || null
      } else if (DOMAINS.includes(sg.domain)) {
        // final_grade (manual override) takes priority over calculated_grade
        domainGrades[sg.domain] = sg.final_grade ?? sg.calculated_grade ?? null
      }
    })

    const scoredDomains = DOMAINS.filter(d => domainGrades[d] != null)
    const overallGrade = scoredDomains.length > 0 ? Math.round(scoredDomains.reduce((a: number, d) => a + (domainGrades[d] as number), 0) / scoredDomains.length * 10) / 10 : null
    const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '\u2014'

    // ─── STEP 3: Class averages from semester_grades (same semester + same class + same grade) ───
    const classAverages: Record<string, number | null> = {}
    const sgClass = (myGrades || []).find((sg: any) => sg.english_class)?.english_class || selectedClass
    const sgGrade = (myGrades || []).find((sg: any) => sg.grade)?.grade || student.grade
    const { data: classSemGrades } = await supabase.from('semester_grades').select('student_id, domain, final_grade, calculated_grade')
      .eq('semester_id', semesterId).eq('english_class', sgClass).eq('grade', sgGrade)
    DOMAINS.forEach(domain => {
      const vals = (classSemGrades || []).filter((sg: any) => sg.domain === domain)
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
    console.log('[Report] Semesters sorted:', sortedSems.map((s: any) => `${s.name} (${s.type}, yr=${getYearFromSem(s)}, id=${s.id?.slice(0,8)})`))
    console.log('[Report] Current semester idx:', semIdx, 'prev:', prevSem?.name, 'prevId:', prevSem?.id?.slice(0,8))
    if (prevSem) {
      const { data: prevGrades } = await supabase.from('semester_grades').select('*')
        .eq('student_id', studentId).eq('semester_id', prevSem.id)
      console.log('[Report] Prev semester grades for', studentId.slice(0,8), ':', prevGrades?.length, 'rows', prevGrades?.map((g: any) => `${g.domain}=${g.final_grade ?? g.calculated_grade}`))
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
    const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()
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
      student, domainGrades, overallGrade, overallLetter, classAverages,
      classOverall: null,
      prevDomainGrades, prevOverall, prevSemesterName,
      comment: commentData?.text || '',
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
    setLoading(false)
  }, [studentId, semesterId, students, allSemesters, selectedClass, currentTeacher])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    await supabase.from('comments').upsert({ student_id: studentId, semester_id: semesterId, text: comment.trim(), created_by: currentTeacher?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    showToast('Comment saved')
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
      const v = d.domainGrades[dom]; if (v == null) return '<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px">--</div>'
      const g = getLetterGrade(v); const t = tileBgPrint(v)
      return `<div style="text-align:center;padding:14px 8px;background:${t.bg};border:1.5px solid ${t.border};border-radius:12px">
        <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
        <div style="font-size:26px;font-weight:800;color:#1e293b;margin-top:6px">${v.toFixed(1)}%</div>
        <div style="font-size:14px;font-weight:700;color:${letterColor(g)};margin-top:3px">${g}</div>
      </div>`
    }).join('')

    // Radar chart SVG for print
    const radarSize = 240, rcx = radarSize / 2, rcy = radarSize / 2 + 6, maxR = 70
    const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
    const rLabels = ['Reading', 'Phonics', 'Writing', 'Speaking', 'Language']
    const rAngles = domains.map((_, i) => (Math.PI * 2 * i) / 5 - Math.PI / 2)
    const toXY = (a: number, p: number) => ({ x: rcx + Math.cos(a) * (p / 100) * maxR, y: rcy + Math.sin(a) * (p / 100) * maxR })
    const makePoly = (vals: (number | null)[]) => vals.map((v, i) => { const pt = toXY(rAngles[i], v ?? 0); return `${pt.x},${pt.y}` }).join(' ')
    const sVals = domains.map(dm => d.domainGrades[dm])
    const cVals = domains.map(dm => d.classAverages[dm])
    const sFilledCount = sVals.filter(v => v != null).length

    const gridLines = [20, 40, 60, 80, 100].map(lvl =>
      `<polygon points="${rAngles.map(a => { const p = toXY(a, lvl); return `${p.x},${p.y}` }).join(' ')}" fill="none" stroke="#e8e0d8" stroke-width="0.5" ${lvl < 100 ? 'stroke-dasharray="2,2"' : ''}/>`
    ).join('')
    const axisLines = rAngles.map(a => { const e = toXY(a, 100); return `<line x1="${rcx}" y1="${rcy}" x2="${e.x}" y2="${e.y}" stroke="#e8e0d8" stroke-width="0.5"/>` }).join('')
    const classPoly = cVals.some(v => v != null) ? `<polygon points="${makePoly(cVals)}" fill="rgba(148,163,184,0.15)" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4,3"/>` : ''
    const studentPoly = sFilledCount >= 3 ? `<polygon points="${makePoly(sVals)}" fill="rgba(30,58,95,0.3)" stroke="#1e3a5f" stroke-width="2.5"/>` : ''
    const dots = sVals.map((v, i) => { if (v == null) return ''; const pt = toXY(rAngles[i], v); return `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#1e3a5f" stroke="white" stroke-width="1.5"/>` }).join('')
    const radarLabels = rAngles.map((a, i) => {
      const pt = toXY(a, ((maxR + 32) / maxR) * 100)
      const sv = sVals[i]
      const anchor = pt.x < rcx - 10 ? 'end' : pt.x > rcx + 10 ? 'start' : 'middle'
      return `<text x="${pt.x}" y="${pt.y - 4}" text-anchor="${anchor}" dominant-baseline="middle" style="font-size:9px;font-weight:700;fill:#475569">${rLabels[i]}</text>
        ${sv != null ? `<text x="${pt.x}" y="${pt.y + 7}" text-anchor="${anchor}" dominant-baseline="middle" style="font-size:8px;font-weight:700;fill:#1e3a5f">${sv.toFixed(0)}%</text>` : ''}`
    }).join('')

    const radarSvg = `<svg width="${radarSize}" height="${radarSize}" viewBox="0 0 ${radarSize} ${radarSize}">${gridLines}${axisLines}${classPoly}${studentPoly}${dots}${radarLabels}</svg>`

    // Reading fluency HTML — with null safety
    const r = d.latestReading
    const readingHtml = r ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:#f8f5f1;border-radius:8px;padding:10px;text-align:center;border:1px solid #e8e0d8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Words Per Minute</div><div style="font-size:20px;font-weight:800;color:#1e3a5f">${r.cwpm != null ? Math.round(r.cwpm) : '—'}</div></div>
        <div style="background:#f8f5f1;border-radius:8px;padding:10px;text-align:center;border:1px solid #e8e0d8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Reading Accuracy</div><div style="font-size:20px;font-weight:800;color:${r.accuracy_rate != null ? (r.accuracy_rate >= 95 ? '#16a34a' : r.accuracy_rate >= 90 ? '#d97706' : '#dc2626') : '#94a3b8'}">${r.accuracy_rate != null ? r.accuracy_rate.toFixed(1) + '%' : '—'}</div></div>
        <div style="background:#f8f5f1;border-radius:8px;padding:10px;text-align:center;border:1px solid #e8e0d8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Reading Level</div><div style="font-size:16px;font-weight:700;color:#475569">${r.reading_level || r.passage_level || '—'}</div></div>
        <div style="background:#f8f5f1;border-radius:8px;padding:10px;text-align:center;border:1px solid #e8e0d8"><div style="font-size:8px;color:#94a3b8;font-weight:600;margin-bottom:3px">Fluency Rating</div><div style="font-size:16px;font-weight:700;color:#475569">${r.naep_fluency ? r.naep_fluency + ' of 4' : '—'}</div></div>
      </div>` : '<div style="background:#f8f5f1;border:1px solid #e8e0d8;border-radius:8px;padding:14px;text-align:center;font-size:11px;color:#94a3b8">No reading assessments recorded yet.</div>'

    // Goals HTML
    const goalsHtml = d.goals?.length ? d.goals.slice(0, 5).map((g: any) =>
      `<div style="display:flex;align-items:start;gap:6px;font-size:11px;margin-bottom:4px">
        <span style="flex-shrink:0">${g.completed_at ? '✅' : g.goal_type === 'stretch' ? '🚀' : g.goal_type === 'behavioral' ? '🎯' : '📚'}</span>
        <span style="${g.completed_at ? 'text-decoration:line-through;color:#94a3b8' : 'color:#475569;line-height:1.5'}">${g.goal_text}</span>
      </div>`
    ).join('') : '<div style="background:#f8f5f1;border:1px solid #e8e0d8;border-radius:8px;padding:10px;text-align:center;font-size:11px;color:#94a3b8">No goals set yet.</div>'

    // Grading scale
    const scaleHtml = SCALE_DISPLAY.map((r: any) => `<span style="padding:2px 7px;border-radius:4px;background:#f8f5f1;border:1px solid #e8e0d8;font-size:9px;display:inline-flex;gap:4px;margin:1px"><strong style="color:${letterColor(r.letter)}">${r.letter}</strong><span style="color:#94a3b8">${r.range}</span></span>`).join(' ')

    // Teacher avatar
    const avatarHtml = d.teacherPhotoUrl
      ? `<img src="${d.teacherPhotoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #f1ede8" />`
      : `<div style="width:32px;height:32px;border-radius:50%;background:#1e3a5f;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${d.teacherName[0] || ''}</div>`

    const pw = window.open('', '_blank')
    if (!pw) return
    pw.document.write(`<html><head><title>Report Card \u2014 ${s.english_name}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222;font-size:11px;background:#f5f0eb;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .card{max-width:760px;margin:24px auto;overflow:hidden;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);background:#f5f0eb;page-break-after:always;page-break-inside:avoid}
      @page{size:A4;margin:6mm}
      @media print{body{padding:0;font-size:9px;line-height:1.3}.card{margin:0;box-shadow:none;border-radius:0;max-width:100%;max-height:277mm;overflow:hidden}}
    </style></head>
    <body><div class="card">
    <!-- Header -->
    <div style="background:#1e3a5f;padding:18px 28px;color:white;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:10px;opacity:0.5;letter-spacing:2.5px;text-transform:uppercase">Daewoo Elementary School</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px;font-family:Georgia,serif">${d.semesterName} Report Card</div>
      <div style="font-size:11px;opacity:0.6;margin-top:2px;font-style:italic">English Program \u2014 Growing together through English.</div></div>
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)"><img src="/logo.png" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'" /></div>
    </div>
    <!-- Student Info -->
    <div style="background:#fdfcfa;padding:14px 28px;border-bottom:1px solid #e8e0d8">
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr 0.8fr 0.8fr auto;gap:0 14px">
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Name</div><div style="font-size:13px;font-weight:700;margin-top:1px">${s.korean_name}  ${s.english_name}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Grade</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayGrade}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Korean Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.korean_class}반</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Class Number</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.class_number}번</div></div>
        <div style="grid-row:1/3;display:flex;align-items:center;justify-content:center;padding-left:8px">
          <div style="position:relative;width:76px;height:76px">
            <svg width="76" height="76" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#e8e0d8" stroke-width="${stroke}"/>
            <circle cx="60" cy="60" r="${radius}" fill="none" stroke="${gc}" stroke-width="${stroke}" stroke-dasharray="${pct * circ} ${circ}" stroke-linecap="round" transform="rotate(-90 60 60)"/></svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font-size:20px;font-weight:800;color:#1e3a5f">${d.overallLetter}</div>
              <div style="font-size:10px;color:#64748b">${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : ''}</div>
            </div>
          </div>
        </div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">English Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${displayClass}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Teacher</div><div style="font-size:13px;font-weight:600;margin-top:1px">${d.teacherName}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Team Manager</div><div style="font-size:13px;font-weight:600;margin-top:1px">Victoria Park</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Principal</div><div style="font-size:13px;font-weight:600;margin-top:1px">Kwak Cheol Ok</div></div>
      </div>
    </div>
    <!-- Score Tiles -->
    <div style="background:#fdfcfa;padding:18px 28px 22px;border-bottom:1px solid #e8e0d8">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Academic Performance</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${tiles}</div>
      <div style="margin-top:10px;padding-top:8px;border-top:1px solid #e8e0d8;display:flex;align-items:center;gap:10px">
        <span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:600">Behavior</span>
        <span style="font-size:18px;font-weight:800;color:#1e3a5f">${d.behaviorGrade || '--'}</span>
      </div>
    </div>
    <!-- Student Snapshot: Radar + Reading + Goals -->
    <div style="background:#fdfcfa;padding:20px 28px;border-bottom:1px solid #e8e0d8">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div>
          <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Class Comparison</div>
          <div style="text-align:center">${radarSvg}</div>
          <div style="text-align:center;margin-top:4px;font-size:8px;color:#94a3b8">
            <span style="display:inline-flex;align-items:center;gap:3px;margin-right:10px"><span style="width:8px;height:8px;border-radius:2px;background:rgba(30,58,95,0.25);border:1.5px solid #1e3a5f;display:inline-block"></span> Student</span>
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
    <!-- Comment -->
    <div style="background:#fdfcfa;padding:20px 28px;border-bottom:1px solid #e8e0d8">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${avatarHtml}<div><div style="font-size:13px;font-weight:700;color:#1e293b">${d.teacherName}</div><div style="font-size:10px;color:#94a3b8">${displayClass} Class</div></div></div>
      <div style="font-size:12px;line-height:1.8;color:#374151;white-space:pre-wrap;background:#fafaf8;border-radius:10px;padding:14px 18px;border:1px solid #e8e0d8">${comment || '<em style="color:#94a3b8">No comment entered.</em>'}</div>
    </div>
    <!-- Scale + Footer -->
    <div style="background:#fdfcfa;padding:14px 28px">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Grading Scale</div>
      <div style="display:flex;gap:3px;flex-wrap:wrap">${scaleHtml}</div>
      <div style="text-align:center;margin-top:14px;padding-top:10px;border-top:1px solid #e8e0d8;font-size:10px;color:#b8b0a6;letter-spacing:1px">Daewoo Elementary School \u00b7 English Program \u00b7 ${d.semesterName}</div>
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
      <div className="flex justify-end"><button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt"><Printer size={15} /> Print Report Card</button></div>

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
        <div className="bg-white px-7 py-3.5" style={{ borderBottom: '1px solid #e8e0d8' }}>
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
                  <circle cx="60" cy="60" r={radius} fill="none" stroke="#e8e0d8" strokeWidth={stroke} />
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
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold">Academic Performance</div>
            {!editingGrades ? (
              <button onClick={() => {
                const eg: Record<string, string> = {}
                DOMAINS.forEach(dom => { eg[dom] = d.domainGrades[dom] != null ? String(d.domainGrades[dom]) : '' })
                eg.behavior = d.behaviorGrade || ''
                setEditGradeValues(eg)
                setEditingGrades(true)
              }} className="text-[10px] text-navy font-medium hover:underline cursor-pointer">✎ Edit Grades</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingGrades(false)} className="text-[10px] text-text-tertiary hover:text-red-500">Cancel</button>
                <button onClick={async () => {
                  const student = students.find((s: any) => s.id === studentId)
                  // Save to semester_grades with class snapshot
                  for (const dom of DOMAINS) {
                    const val = parseFloat(editGradeValues[dom])
                    if (!isNaN(val)) {
                      await supabase.from('semester_grades').upsert({
                        student_id: studentId, semester_id: semesterId, domain: dom, final_grade: val,
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
            <div className="grid grid-cols-5 gap-2.5 mb-3">
              {DOMAINS.map((dom) => (
                <div key={dom} className="rounded-xl border-[1.5px] border-border p-3.5 text-center">
                  <div className="text-[11px] text-[#64748b] font-semibold mb-2">{DOMAIN_SHORT[dom]}</div>
                  <input type="number" min={0} max={100} step={0.1} value={editGradeValues[dom] || ''}
                    onChange={e => setEditGradeValues(prev => ({ ...prev, [dom]: e.target.value }))}
                    className="w-full text-center text-[18px] font-bold px-2 py-1.5 border border-border rounded-lg outline-none focus:border-navy"
                    placeholder="--" />
                  <div className="text-[9px] text-text-tertiary mt-1">%</div>
                </div>
              ))}
            </div>
          ) : (
          <div className="grid grid-cols-5 gap-2.5 mb-3">
            {DOMAINS.map((dom) => {
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
          {/* Behavior Grade */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Behavior</span>
            {editingGrades ? (
              <div className="flex gap-1.5">
                {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E'].map(g => (
                  <button key={g} onClick={() => setEditGradeValues(prev => ({ ...prev, behavior: prev.behavior === g ? '' : g }))}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${editGradeValues.behavior === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                    {g}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`text-[18px] font-extrabold ${d.behaviorGrade ? 'text-navy' : 'text-text-tertiary'}`}>{d.behaviorGrade || '--'}</span>
            )}
          </div>
        </div>
        {/* ─── Student Snapshot: Radar + Reading + Goals ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {/* Left: Radar Chart — Student vs Class */}
            <div>
              <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3">Class Comparison</div>
              <RadarChart studentGrades={d.domainGrades} classAverages={d.classAverages} />
              <div className="flex items-center justify-center gap-4 mt-2 text-[9px]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(30,58,95,0.25)', border: '1.5px solid #1e3a5f' }} /> Student</span>
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
                      <div className={`text-[22px] font-extrabold leading-none ${d.latestReading.accuracy_rate != null ? (d.latestReading.accuracy_rate >= 95 ? 'text-green-600' : d.latestReading.accuracy_rate >= 90 ? 'text-amber-600' : 'text-red-500') : 'text-[#94a3b8]'}`}>
                        {d.latestReading.accuracy_rate != null ? `${d.latestReading.accuracy_rate.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                    <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                      <div className="text-[9px] text-[#94a3b8] font-semibold mb-1">Reading Level</div>
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
                        <span className="flex-shrink-0 mt-0.5">{g.completed_at ? '✅' : g.goal_type === 'stretch' ? '🚀' : g.goal_type === 'behavioral' ? '🎯' : '📚'}</span>
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
        <div className="bg-white px-7 py-6" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              {/* Teacher avatar — clickable to upload */}
              <label className="cursor-pointer relative group">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleTeacherPhotoUpload} />
                {d.teacherPhotoUrl ? (
                  <img src={d.teacherPhotoUrl} className="w-9 h-9 rounded-full object-cover border-2 border-[#f1ede8]" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#e8e0d8] text-[#64748b] flex items-center justify-center text-[14px] font-bold border-2 border-[#f1ede8]">
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
            <button onClick={() => setShowAiPanel(!showAiPanel)}
              className={`print:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${showAiPanel ? 'bg-navy text-white border-navy' : 'bg-[#f8f5f1] text-[#475569] border-[#d1d5db] hover:bg-[#f1ede8]'}`}>
              <BarChart3 size={14} />
              Student Reference
            </button>
          </div>

          {/* Student Reference Panel */}
          {showAiPanel && (
            <div className="print:hidden bg-[#f8f9fb] border border-[#d1d5db] rounded-xl p-4 mb-3.5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-[#475569]">Student Reference -- All Data at a Glance</p>
                <button onClick={() => {
                  const lines = [
                    `${s.english_name} (${s.korean_name}) -- ${s.english_class} -- Grade ${s.grade}`,
                    `Semester: ${d.semesterName}`,
                    '',
                    'DOMAIN GRADES:',
                    ...DOMAINS.map(dom => `  ${DOMAIN_SHORT[dom]}: ${d.domainGrades[dom] != null ? `${d.domainGrades[dom]!.toFixed(1)}% (${getLetterGrade(d.domainGrades[dom]!)})` : 'No grade'}`),
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
                    ...(d.goals?.length ? ['', 'GOALS:', ...d.goals.map((g: any) => `  ${g.completed_at ? '✅' : '⬜'} [${g.goal_type}] ${g.goal_text}`)] : []),
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
                    const v = d.domainGrades[dom]
                    return (
                      <div key={dom} className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-[#64748b]">{DOMAIN_SHORT[dom]}</span>
                        <span className="text-[11px] font-bold" style={{ color: v != null ? letterColor(getLetterGrade(v)) : '#94a3b8' }}>
                          {v != null ? `${v.toFixed(1)}% (${getLetterGrade(v)})` : '--'}
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
                      <div><p className="text-[9px] text-[#94a3b8]">Behavior</p><p className="text-[12px] font-bold text-navy">{d.behaviorCount} logs</p></div>
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
                        <span>{g.completed_at ? '✅' : g.goal_type === 'stretch' ? '🚀' : g.goal_type === 'behavioral' ? '🎯' : '📚'}</span>
                        <span className={g.completed_at ? 'line-through text-text-tertiary' : 'text-[#475569]'}>{g.goal_text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={6}
            placeholder="Write comments about this student's progress..."
            className="w-full px-4 py-3 border border-[#e8e0d8] rounded-xl text-[13px] outline-none focus:border-navy resize-none leading-relaxed bg-[#fafaf8]" />
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
              <span key={r.letter + r.range} className="px-2 py-0.5 rounded bg-[#f8f5f1] border border-[#e8e0d8] text-[10px] inline-flex gap-1">
                <strong style={{ color: letterColor(r.letter) }}>{r.letter}</strong>
                <span className="text-[#94a3b8]">{r.range}</span>
              </span>
            ))}
          </div>
          <div className="text-center mt-4 pt-3 text-[10px] text-[#b8b0a6] tracking-wider" style={{ borderTop: '1px solid #e8e0d8' }}>
            Daewoo Elementary School &middot; English Program &middot; {d.semesterName}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Print Progress Report Helper ────────────────────────────────────
function printProgressReport(student: any, data: any) {
  const ds = DOMAINS.map(dom => {
    const v = data.domainGrades[dom]; if (v == null) return `<div style="text-align:center;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:#94a3b8;margin-top:4px">--</p></div>`
    const letter = getLetterGrade(v); const t = tileBgPrint(v)
    return `<div style="text-align:center;border:1px solid ${t.border};border-radius:8px;padding:10px 6px;background:${t.bg}"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:${letterColor(letter)};margin-top:4px">${letter}</p><p style="font-size:10px;color:#64748b">${v.toFixed(1)}%</p></div>`
  }).join('')

  const cwpm = data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'
  const lexile = data.latestReading ? (data.latestReading.reading_level || data.latestReading.passage_level || '--') : '--'
  const accuracy = data.latestReading?.accuracy_rate != null ? `${data.latestReading.accuracy_rate.toFixed(1)}%` : '--'

  const pw = window.open('', '_blank')
  if (!pw) return
  pw.document.write(`<html><head><title>Progress Report - ${student.english_name}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f5f0eb}
  .card{max-width:680px;margin:20px auto;overflow:hidden;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
  @page{size:A4;margin:6mm}
  @media print{body{background:white;font-size:9px}.card{margin:0;box-shadow:none;border-radius:0;page-break-after:always;page-break-inside:avoid;max-height:277mm;overflow:hidden}}</style></head>
  <body><div class="card">
  <div style="background:#1e3a5f;padding:16px 24px;color:white;display:flex;justify-content:space-between;align-items:center">
    <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:0.6">Progress Report</p>
    <p style="font-size:20px;font-weight:700;font-family:Georgia,serif;margin-top:4px">${student.english_name}</p>
    <p style="font-size:12px;opacity:0.7">${student.korean_name} -- ${student.english_class} -- Grade ${student.grade}</p></div>
    <div style="text-align:right"><p style="font-size:11px;opacity:0.6">${data.semesterName}</p><p style="font-size:11px;opacity:0.6">Teacher: ${data.teacherName}</p></div>
  </div>
  <div style="background:white;padding:20px 24px">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
      <div style="width:64px;height:64px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${data.overallGrade != null ? tileBgPrint(data.overallGrade).bg : '#f8fafc'};border:2px solid ${data.overallGrade != null ? tileBgPrint(data.overallGrade).border : '#e2e8f0'}">
        <div style="text-align:center"><p style="font-size:22px;font-weight:800;color:${data.overallGrade != null ? letterColor(data.overallLetter) : '#94a3b8'}">${data.overallLetter}</p>
        ${data.overallGrade != null ? `<p style="font-size:9px;color:#64748b">${data.overallGrade.toFixed(1)}%</p>` : ''}</div>
      </div>
      <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600">Overall Grade</p>
      <p style="font-size:14px;font-weight:700;color:#1e3a5f">${data.overallGrade != null ? `${data.overallGrade.toFixed(1)}% (${data.overallLetter})` : 'No grades entered'}</p></div>
    </div>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:8px">Domain Scores</p>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:12px">${ds}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;padding-top:8px;border-top:1px solid #e8e0d8">
      <span style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;font-weight:600">Behavior</span>
      <span style="font-size:18px;font-weight:800;color:#1e3a5f">${data.behaviorGrade || '--'}</span>
    </div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:20px">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:8px">Reading Fluency</p>
      <div style="display:flex;gap:24px">
        <div><p style="font-size:9px;color:#94a3b8">CWPM</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${cwpm}</p></div>
        <div><p style="font-size:9px;color:#94a3b8">Lexile</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${lexile}</p></div>
        <div><p style="font-size:9px;color:#94a3b8">Accuracy</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${accuracy}</p></div>
      </div>
    </div>
    ${data.comment ? `<p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:6px">Teacher Comment</p><div style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:12px;line-height:1.7;color:#374151">${data.comment}</div>` : ''}
    <div style="text-align:center;margin-top:16px;padding-top:12px;border-top:1px solid #e8e0d8;font-size:10px;color:#b8b0a6;letter-spacing:1px">Daewoo Elementary School \u00b7 English Program \u00b7 ${data.semesterName}</div>
  </div></div></body></html>`)
  pw.document.close(); pw.print()
}

// ─── Batch Print All Progress Reports ────────────────────────────────
function BatchPrintButton({ students, semesterId, className: cls }: { students: any[]; semesterId: string; className: string }) {
  const [printing, setPrinting] = useState(false)
  const { currentTeacher } = useApp()

  const handleBatchPrint = async () => {
    if (students.length === 0) return
    setPrinting(true)

    const pw = window.open('', '_blank')
    if (!pw) { setPrinting(false); return }

    pw.document.write(`<html><head><title>Progress Reports - ${cls} Grade ${students[0]?.grade}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:white}
    .card{max-width:680px;margin:0 auto;overflow:hidden;page-break-after:always}
    .card:last-child{page-break-after:auto}
    @media print{.card{margin:0;box-shadow:none}}</style></head><body>`)

    for (const student of students) {
      // Load data for each student
      const { data: assessments } = await supabase.from('assessments').select('*').eq('semester_id', semesterId).or(`english_class.eq.${student.english_class},english_class.is.null`).eq('grade', student.grade)
      const { data: grades } = await supabase.from('grades').select('*').eq('student_id', student.id).in('assessment_id', (assessments || []).map((a: any) => a.id))

      const domainGrades: Record<string, number | null> = {}
      for (const dom of DOMAINS) {
        const da = (assessments || []).filter((a: any) => a.domain === dom)
        const pcts = da.map((a: any) => {
          const g = (grades || []).find((g: any) => g.assessment_id === a.id)
          if (!g || g.score == null || g.is_exempt) return null
          return (g.score / a.max_score) * 100
        }).filter((p: any): p is number => p != null)
        domainGrades[dom] = pcts.length > 0 ? pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length : null
      }
      const validDomains = Object.values(domainGrades).filter((v): v is number => v != null)
      const overallGrade = validDomains.length > 0 ? validDomains.reduce((a, b) => a + b, 0) / validDomains.length : null
      const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '--'

      const { data: reading } = await supabase.from('reading_assessments').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(1)
      const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', student.id).eq('semester_id', semesterId).limit(1).single()
      const { data: teacherData } = await supabase.from('teachers').select('name').eq('english_class', student.english_class).limit(1).single()
      const { data: semData } = await supabase.from('semesters').select('name').eq('id', semesterId).single()

      const data = {
        domainGrades, overallGrade, overallLetter,
        latestReading: reading?.[0] || null,
        comment: commentData?.text || '',
        teacherName: teacherData?.name || currentTeacher?.name || '',
        semesterName: semData?.name || '',
      }

      const ds = DOMAINS.map(dom => {
        const v = data.domainGrades[dom]; if (v == null) return `<div style="text-align:center;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:#94a3b8;margin-top:4px">--</p></div>`
        const letter = getLetterGrade(v); const t = tileBgPrint(v)
        return `<div style="text-align:center;border:1px solid ${t.border};border-radius:8px;padding:10px 6px;background:${t.bg}"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:${letterColor(letter)};margin-top:4px">${letter}</p><p style="font-size:10px;color:#64748b">${v.toFixed(1)}%</p></div>`
      }).join('')

      const cwpm = data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'
      const lexile = data.latestReading ? (data.latestReading.reading_level || data.latestReading.passage_level || '--') : '--'
      const accuracy = data.latestReading?.accuracy_rate != null ? `${data.latestReading.accuracy_rate.toFixed(1)}%` : '--'

      pw.document.write(`<div class="card">
      <div style="background:#1e3a5f;padding:16px 24px;color:white;display:flex;justify-content:space-between;align-items:center">
        <div><p style="font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:0.6">Progress Report</p>
        <p style="font-size:20px;font-weight:700;font-family:Georgia,serif;margin-top:4px">${student.english_name}</p>
        <p style="font-size:12px;opacity:0.7">${student.korean_name} -- ${student.english_class} -- Grade ${student.grade}</p></div>
        <div style="text-align:right"><p style="font-size:11px;opacity:0.6">${data.semesterName}</p><p style="font-size:11px;opacity:0.6">Teacher: ${data.teacherName}</p></div>
      </div>
      <div style="background:white;padding:20px 24px">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:64px;height:64px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:${data.overallGrade != null ? tileBgPrint(data.overallGrade).bg : '#f8fafc'};border:2px solid ${data.overallGrade != null ? tileBgPrint(data.overallGrade).border : '#e2e8f0'}">
            <div style="text-align:center"><p style="font-size:22px;font-weight:800;color:${data.overallGrade != null ? letterColor(data.overallLetter) : '#94a3b8'}">${data.overallLetter}</p></div>
          </div>
          <div><p style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600">Overall Grade</p>
          <p style="font-size:14px;font-weight:700;color:#1e3a5f">${data.overallGrade != null ? `${data.overallGrade.toFixed(1)}% (${data.overallLetter})` : 'No grades entered'}</p></div>
        </div>
        <p style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Domain Scores</p>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px">${ds}</div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px">
          <p style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:8px">Reading Fluency</p>
          <div style="display:flex;gap:24px">
            <div><p style="font-size:9px;color:#94a3b8">CWPM</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${cwpm}</p></div>
            <div><p style="font-size:9px;color:#94a3b8">Lexile</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${lexile}</p></div>
            <div><p style="font-size:9px;color:#94a3b8">Accuracy</p><p style="font-size:18px;font-weight:700;color:#1e3a5f">${accuracy}</p></div>
          </div>
        </div>
        ${data.comment ? `<p style="font-size:10px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:6px">Teacher Comment</p><div style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:12px;line-height:1.7;color:#374151;margin-bottom:12px">${data.comment}</div>` : ''}
        <div style="text-align:center;padding-top:10px;border-top:1px solid #e8e0d8;font-size:9px;color:#b8b0a6">Daewoo Elementary School \u00b7 English Program \u00b7 ${data.semesterName}</div>
      </div></div>`)
    }

    pw.document.write('</body></html>')
    pw.document.close()
    // Small delay to ensure rendering
    setTimeout(() => { pw.print(); setPrinting(false) }, 500)
  }

  return (
    <button onClick={handleBatchPrint} disabled={printing || students.length === 0}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light disabled:opacity-50">
      {printing ? <><Loader2 size={14} className="animate-spin" /> Generating {students.length} reports...</> : <><Printer size={14} /> Print All {students.length} Students</>}
    </button>
  )
}

// ─── Progress Report (simplified, overall averages only) ────────────
function ProgressReport({ studentId, semesterId, semester, students, allSemesters, lang, selectedClass }: {
  studentId: string; semesterId: string; semester: any; students: any[]; allSemesters: any[]; lang: LangKey; selectedClass: EnglishClass
}) {
  const { showToast, currentTeacher } = useApp()
  const student = students.find((s: any) => s.id === studentId)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [behaviorGrade, setBehaviorGrade] = useState<string>('')

  useEffect(() => {
    if (!student) { setLoading(false); return }
    ;(async () => {
      // Get assessments + grades for this semester
      const { data: assessments } = await supabase.from('assessments').select('*').eq('semester_id', semesterId)
      const { data: grades } = await supabase.from('grades').select('*').eq('student_id', studentId).in('assessment_id', (assessments || []).map((a: any) => a.id))

      // Calculate domain averages
      const domainGrades: Record<string, number | null> = {}
      for (const dom of DOMAINS) {
        const da = (assessments || []).filter((a: any) => a.domain === dom)
        const pcts = da.map((a: any) => {
          const g = (grades || []).find((g: any) => g.assessment_id === a.id)
          if (!g || g.score == null || g.is_exempt) return null
          return (g.score / a.max_score) * 100
        }).filter((p: any): p is number => p != null)
        domainGrades[dom] = pcts.length > 0 ? pcts.reduce((a: number, b: number) => a + b, 0) / pcts.length : null
      }
      const validDomains = Object.values(domainGrades).filter((v): v is number => v != null)
      const overallGrade = validDomains.length > 0 ? validDomains.reduce((a, b) => a + b, 0) / validDomains.length : null

      // Get latest reading assessment
      const { data: reading } = await supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(1)

      // Get teacher comment
      const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()

      // Get behavior grade from semester_grades
      const { data: behaviorSG } = await supabase.from('semester_grades').select('behavior_grade')
        .eq('student_id', studentId).eq('semester_id', semesterId).eq('domain', 'overall').limit(1).single()

      // Teacher name
      const { data: teacherData } = await supabase.from('teachers').select('name').eq('english_class', student.english_class).limit(1).single()

      setData({
        domainGrades, overallGrade,
        overallLetter: overallGrade != null ? getLetterGrade(overallGrade) : '--',
        latestReading: reading?.[0] || null,
        comment: commentData?.text || '',
        behaviorGrade: behaviorSG?.behavior_grade || null,
        teacherName: teacherData?.name || '',
        semesterName: semester?.name || '',
      })
      setComment(commentData?.text || '')
      setBehaviorGrade(behaviorSG?.behavior_grade || '')
      setLoading(false)
    })()
  }, [studentId, semesterId])

  const saveComment = async () => {
    setSavingComment(true)
    const { error } = await supabase.from('comments').upsert({
      student_id: studentId, semester_id: semesterId, text: comment.trim(),
      teacher_id: currentTeacher?.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast('Comment saved'); setData((prev: any) => ({ ...prev, comment: comment.trim() })) }
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!student || !data) return <div className="py-12 text-center text-text-tertiary">No data available.</div>

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-navy px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-blue-200/60 font-semibold">Progress Report</p>
              <h3 className="font-display text-xl font-bold mt-1">{student.english_name}</h3>
              <p className="text-blue-200/70 text-[13px]">{student.korean_name} -- {student.english_class} -- Grade {student.grade}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200/60 text-[11px]">{data.semesterName}</p>
              <p className="text-blue-200/60 text-[11px]">Teacher: {data.teacherName}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall Grade */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl flex items-center justify-center" style={{ backgroundColor: data.overallGrade != null ? tileBgPrint(data.overallGrade).bg : '#f8fafc', border: `2px solid ${data.overallGrade != null ? tileBgPrint(data.overallGrade).border : '#e2e8f0'}` }}>
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: data.overallGrade != null ? letterColor(data.overallLetter) : '#94a3b8' }}>{data.overallLetter}</p>
                {data.overallGrade != null && <p className="text-[10px] text-text-tertiary">{data.overallGrade.toFixed(1)}%</p>}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Overall Grade</p>
              <p className="text-[14px] font-semibold text-navy mt-0.5">{data.overallGrade != null ? `${data.overallGrade.toFixed(1)}% (${data.overallLetter})` : 'No grades entered'}</p>
            </div>
          </div>

          {/* Domain Breakdown */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Domain Scores</p>
            <div className="grid grid-cols-5 gap-2">
              {DOMAINS.map(dom => {
                const v = data.domainGrades[dom]
                const letter = v != null ? getLetterGrade(v) : '--'
                return (
                  <div key={dom} className={`text-center rounded-lg border p-3 ${v != null ? tileBgClass(v) : 'bg-surface-alt border-border'}`}>
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{DOMAIN_SHORT[dom]}</p>
                    <p className="text-lg font-bold" style={{ color: v != null ? letterColor(letter) : '#94a3b8' }}>{letter}</p>
                    {v != null && <p className="text-[10px] text-text-secondary">{v.toFixed(1)}%</p>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Behavior Grade */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">Behavior</span>
            <div className="flex gap-1.5">
              {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'E'].map(g => (
                <button key={g} onClick={async () => {
                  const newVal = behaviorGrade === g ? '' : g
                  setBehaviorGrade(newVal)
                  await supabase.from('semester_grades').upsert({
                    student_id: studentId, semester_id: semesterId, domain: 'overall', behavior_grade: newVal || null,
                    english_class: student.english_class, grade: student.grade,
                  }, { onConflict: 'student_id,semester_id,domain' })
                  setData((prev: any) => ({ ...prev, behaviorGrade: newVal || null }))
                }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${behaviorGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Reading Info */}
          <div className="bg-surface-alt border border-border rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Reading Fluency</p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] text-text-tertiary">CWPM</p>
                <p className="text-[20px] font-bold text-navy">{data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'}</p>
              </div>
              <div>
                <p className="text-[9px] text-text-tertiary">Lexile</p>
                <p className="text-[20px] font-bold text-navy">{data.latestReading?.passage_level || data.latestReading?.reading_level || '--'}</p>
              </div>
              {data.latestReading?.accuracy_rate != null && (
                <div>
                  <p className="text-[9px] text-text-tertiary">Accuracy</p>
                  <p className="text-[20px] font-bold text-navy">{data.latestReading.accuracy_rate.toFixed(1)}%</p>
                </div>
              )}
              {data.latestReading?.date && (
                <div>
                  <p className="text-[9px] text-text-tertiary">Last Assessed</p>
                  <p className="text-[12px] font-medium text-text-secondary">{new Date(data.latestReading.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Comment */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Teacher Comment</p>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              rows={4} placeholder="Write a comment about this student's progress..."
              className="w-full px-4 py-3 border border-border rounded-lg text-[13px] text-text-secondary outline-none focus:border-navy resize-none leading-relaxed" />
            {comment !== (data.comment || '') && (
              <div className="flex justify-end mt-2">
                <button onClick={saveComment} disabled={savingComment}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-medium bg-gold text-navy-dark hover:bg-gold-light disabled:opacity-50">
                  {savingComment ? <Loader2 size={12} className="animate-spin" /> : null} Save Comment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button onClick={() => printProgressReport(student, data)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">
          <Printer size={14} /> Print Progress Report
        </button>
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
            const scores = domAssessments.map((a: any) => {
              const g = (allGrades || []).find((gr: any) => gr.assessment_id === a.id && gr.student_id === s.id)
              if (!g || g.score == null || g.is_exempt) return null
              return (g.score / a.max_score) * 100
            }).filter((x: any) => x !== null) as number[]
            if (scores.length > 0) {
              const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10
              domainAvgs[domain] = avg; totalSum += avg; totalCount++
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
      `<tr><td style="padding:5px 8px;border:1px solid #bbb">${i + 1}</td>
       <td style="padding:5px 8px;border:1px solid #bbb">${s.student.english_name} (${s.student.korean_name})</td>
       ${DOMAINS.map((d) => `<td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:600">${s.domainAvgs[d] != null ? s.domainAvgs[d].toFixed(1) : '\u2014'}</td>`).join('')}
       <td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:700">${s.overall != null ? s.overall.toFixed(1) : '\u2014'}</td>
       <td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:700;color:${s.letter !== '\u2014' ? letterColor(s.letter) : '#999'}">${s.letter}</td></tr>`
    ).join('')
    const pw = window.open('', '_blank'); if (!pw) return
    pw.document.write(`<html><head><title>Class Summary</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#f0f0f0;padding:6px 8px;border:1px solid #bbb;font-size:10px}</style></head><body>
    <h2 style="color:#1e3a5f">${selectedClass} \u2014 Grade ${selectedGrade} \u00b7 Class Summary</h2><p style="color:#666">${summaries.length} students</p>
    <table><thead><tr><th>#</th><th>Student</th>${DOMAINS.map((d) => `<th>${DOMAIN_PRINT[d]}</th>`).join('')}<th>Overall</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
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
