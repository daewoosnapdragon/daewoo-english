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
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }

    // 1. Current semester assessments + grades
    const { data: assessments } = await supabase.from('assessments').select('*')
      .eq('semester_id', semesterId).eq('grade', student.grade).eq('english_class', selectedClass)
    const { data: studentGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)
    const { data: allGrades } = await supabase.from('grades').select('*').in('student_id', students.map((s: any) => s.id))

    // 2. Domain averages
    const domainGrades: Record<string, number | null> = {}
    const classAverages: Record<string, number | null> = {}

    DOMAINS.forEach((domain) => {
      const domAssessments = (assessments || []).filter((a: any) => a.domain === domain)
      const studentScores = domAssessments.map((a: any) => {
        const g = (studentGrades || []).find((gr: any) => gr.assessment_id === a.id)
        if (!g || g.score == null || g.is_exempt) return null
        return (g.score / a.max_score) * 100
      }).filter((x: any) => x !== null) as number[]
      domainGrades[domain] = studentScores.length > 0 ? Math.round(studentScores.reduce((a: number, b: number) => a + b, 0) / studentScores.length * 10) / 10 : null

      const classScores: number[] = []
      students.forEach((s: any) => {
        const sScores = domAssessments.map((a: any) => {
          const g = (allGrades || []).find((gr: any) => gr.assessment_id === a.id && gr.student_id === s.id)
          if (!g || g.score == null || g.is_exempt) return null
          return (g.score / a.max_score) * 100
        }).filter((x: any) => x !== null) as number[]
        if (sScores.length > 0) classScores.push(sScores.reduce((a: number, b: number) => a + b, 0) / sScores.length)
      })
      classAverages[domain] = classScores.length > 0 ? Math.round(classScores.reduce((a: number, b: number) => a + b, 0) / classScores.length * 10) / 10 : null
    })

    const scoredDomains = DOMAINS.filter((d) => domainGrades[d] != null)
    const overallGrade = scoredDomains.length > 0 ? Math.round(scoredDomains.reduce((a: number, d) => a + (domainGrades[d] as number), 0) / scoredDomains.length * 10) / 10 : null
    const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '\u2014'

    // 3. Previous semester data
    let prevDomainGrades: Record<string, number | null> | null = null
    let prevOverall: number | null = null
    let prevSemesterName: string | null = null

    const semesterIdx = allSemesters.findIndex((s: any) => s.id === semesterId)
    const prevSemester = semesterIdx < allSemesters.length - 1 ? allSemesters[semesterIdx + 1] : null
    if (prevSemester) {
      const { data: prevAssessments } = await supabase.from('assessments').select('*')
        .eq('semester_id', prevSemester.id).eq('grade', student.grade).eq('english_class', selectedClass)
      const { data: prevGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)

      if (prevAssessments && prevAssessments.length > 0) {
        prevDomainGrades = {}
        DOMAINS.forEach((domain) => {
          const domAssessments = (prevAssessments || []).filter((a: any) => a.domain === domain)
          const scores = domAssessments.map((a: any) => {
            const g = (prevGrades || []).find((gr: any) => gr.assessment_id === a.id)
            if (!g || g.score == null || g.is_exempt) return null
            return (g.score / a.max_score) * 100
          }).filter((x: any) => x !== null) as number[]
          prevDomainGrades![domain] = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10 : null
        })
        const prevScored = DOMAINS.filter((d) => prevDomainGrades![d] != null)
        prevOverall = prevScored.length > 0 ? Math.round(prevScored.reduce((a: number, d) => a + (prevDomainGrades![d] as number), 0) / prevScored.length * 10) / 10 : null
        prevSemesterName = prevSemester.name
        // Only show if there's actual data
        if (prevScored.length === 0) { prevDomainGrades = null; prevOverall = null; prevSemesterName = null }
      }
    }

    // 4. Comment
    const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()

    // 5. Teacher info
    const teacher = student.teacher_id ? (await supabase.from('teachers').select('name, photo_url').eq('id', student.teacher_id).single()).data : null

    setData({
      student, domainGrades, overallGrade, overallLetter, classAverages,
      classOverall: null,
      prevDomainGrades, prevOverall, prevSemesterName,
      comment: commentData?.text || '',
      teacherName: teacher?.name || currentTeacher?.name || '',
      teacherPhotoUrl: teacher?.photo_url || null,
      semesterName: semester.name,
    })
    setComment(commentData?.text || '')
    setLoading(false)
  }, [studentId, semesterId, semester, students, allSemesters, selectedClass, currentTeacher])

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

    // Score tiles
    const tiles = DOMAINS.map((dom) => {
      const v = d.domainGrades[dom]; if (v == null) return '<div style="text-align:center;padding:14px 8px;border:1.5px solid #e2e8f0;border-radius:12px">--</div>'
      const g = getLetterGrade(v); const diff = v - (d.classAverages[dom] || v); const t = tileBgPrint(v)
      return `<div style="text-align:center;padding:14px 8px;background:${t.bg};border:1.5px solid ${t.border};border-radius:12px">
        <div style="font-size:11px;color:#64748b;font-weight:600">${DOMAIN_SHORT[dom]}</div>
        <div style="font-size:26px;font-weight:800;color:#1e293b;margin-top:6px">${v.toFixed(1)}%</div>
        <div style="font-size:14px;font-weight:700;color:${letterColor(g)};margin-top:3px">${g}</div>
        <div style="font-size:9px;margin-top:6px;color:${diff >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;background:${diff >= 0 ? '#dcfce7' : '#fee2e2'};display:inline-block;padding:2px 6px;border-radius:10px">${diff >= 0 ? '+' : ''}${diff.toFixed(1)} vs class</div>
      </div>`
    }).join('')

    // Semester trends
    let trendsHtml = ''
    if (d.prevDomainGrades && d.prevOverall != null) {
      const arrowSvg = '<svg width="14" height="8" viewBox="0 0 16 10" style="flex-shrink:0;vertical-align:middle"><line x1="0" y1="5" x2="11" y2="5" stroke="#94a3b8" stroke-width="1.5"/><polygon points="9,1 15,5 9,9" fill="#94a3b8"/></svg>'
      const trendCells = DOMAINS.map((dom) => {
        const curr = d.domainGrades[dom]; const prev = d.prevDomainGrades![dom]
        if (curr == null || prev == null) return '<td style="text-align:center;padding:10px 4px;font-size:12px;color:#94a3b8">--</td>'
        const diff = curr - prev
        return `<td style="text-align:center;padding:10px 4px">
          <div style="display:flex;align-items:center;justify-content:center;gap:3px"><span style="font-size:11px;color:#94a3b8">${prev.toFixed(1)}</span> ${arrowSvg} <span style="font-size:12px;font-weight:700;color:#1e293b">${curr.toFixed(1)}</span></div>
          <div style="font-size:10px;font-weight:700;margin-top:3px;color:${diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#64748b'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}</div>
        </td>`
      }).join('')
      const overallDiff = d.overallGrade! - d.prevOverall!
      trendsHtml = `<div style="background:#fff;padding:16px 24px;border-bottom:1px solid #e8e0d8">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Semester Progress \u2014 ${d.prevSemesterName} to ${d.semesterName}</div>
        <table style="width:100%;border-collapse:collapse"><thead><tr>${DOMAINS.map((dom) => `<th style="text-align:center;padding-bottom:6px;font-size:10px;color:#94a3b8;font-weight:600;border-bottom:1px solid #f1ede8">${DOMAIN_SHORT[dom]}</th>`).join('')}<th style="text-align:center;padding-bottom:6px;font-size:10px;color:#94a3b8;font-weight:700;border-bottom:1px solid #f1ede8;padding-left:10px;border-left:1px solid #f1ede8">Overall</th></tr></thead>
        <tbody><tr>${trendCells}<td style="text-align:center;padding:10px 4px 10px 10px;border-left:1px solid #f1ede8">
          <div style="display:flex;align-items:center;justify-content:center;gap:3px"><span style="font-size:11px;color:#94a3b8">${d.prevOverall!.toFixed(1)}</span> ${arrowSvg} <span style="font-size:13px;font-weight:800;color:#1e3a5f">${d.overallGrade!.toFixed(1)}</span></div>
          <div style="font-size:11px;font-weight:800;margin-top:3px;color:${overallDiff > 0 ? '#16a34a' : '#dc2626'}">${overallDiff > 0 ? '+' : ''}${overallDiff.toFixed(1)}</div>
        </td></tr></tbody></table></div>`
    } else {
      trendsHtml = `<div style="background:#fff;padding:16px 24px;border-bottom:1px solid #e8e0d8">
        <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Semester Progress</div>
        <div style="background:#f8f9fb;border-radius:10px;padding:16px 20px;text-align:center">
          <div style="font-size:13px;font-weight:600;color:#475569">First semester in the English Program</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:4px">Semester-over-semester progress will appear here starting next reporting period.</div>
        </div></div>`
    }

    // Grading scale
    const scaleHtml = SCALE_DISPLAY.map((r: any) => `<span style="padding:2px 7px;border-radius:4px;background:#f8f5f1;border:1px solid #e8e0d8;font-size:9px;display:inline-flex;gap:4px;margin:1px"><strong style="color:${letterColor(r.letter)}">${r.letter}</strong><span style="color:#94a3b8">${r.range}</span></span>`).join(' ')

    // Teacher avatar
    const avatarHtml = d.teacherPhotoUrl
      ? `<img src="${d.teacherPhotoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid #f1ede8" />`
      : `<div style="width:32px;height:32px;border-radius:50%;background:#1e3a5f;color:white;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700">${d.teacherName[0] || ''}</div>`

    const pw = window.open('', '_blank')
    if (!pw) return
    pw.document.write(`<html><head><title>Report Card \u2014 ${s.english_name}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;padding:0;margin:0;color:#222;font-size:12px;background:#f5f0eb}
    .card{max-width:760px;margin:24px auto;overflow:hidden;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
    @media print{body{background:white;padding:0}.card{margin:0;box-shadow:none;border-radius:0}}</style></head>
    <body><div class="card">
    <!-- Header -->
    <div style="background:#1e3a5f;padding:18px 28px;color:white;display:flex;justify-content:space-between;align-items:center">
      <div><div style="font-size:10px;opacity:0.5;letter-spacing:2.5px;text-transform:uppercase">Daewoo Elementary School</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px;font-family:Georgia,serif">${d.semesterName} Report Card</div>
      <div style="font-size:11px;opacity:0.6;margin-top:2px;font-style:italic">English Program \u2014 Growing together through English.</div></div>
      <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2)"><img src="/logo.png" style="width:36px;height:36px;object-fit:contain" onerror="this.style.display='none'" /></div>
    </div>
    <!-- Student Info -->
    <div style="background:#fff;padding:14px 28px;border-bottom:1px solid #e8e0d8">
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr 0.8fr 0.8fr auto;gap:0 14px">
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Name</div><div style="font-size:13px;font-weight:700;margin-top:1px">${s.korean_name}  ${s.english_name}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Grade</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.grade}</div></div>
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
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">English Class</div><div style="font-size:13px;font-weight:600;margin-top:1px">${s.english_class}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Teacher</div><div style="font-size:13px;font-weight:600;margin-top:1px">${d.teacherName}</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Team Manager</div><div style="font-size:13px;font-weight:600;margin-top:1px">Victoria Park</div></div>
        <div style="padding:5px 0;border-bottom:1px solid #f1ede8"><div style="font-size:9px;color:#94a3b8;font-weight:600">Principal</div><div style="font-size:13px;font-weight:600;margin-top:1px">Kwak Cheol Ok</div></div>
      </div>
    </div>
    <!-- Score Tiles -->
    <div style="background:#fff;padding:18px 28px 22px;border-bottom:1px solid #e8e0d8">
      <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:12px">Academic Performance</div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px">${tiles}</div>
    </div>
    <!-- Trends -->
    ${trendsHtml}
    <!-- Comment -->
    <div style="background:#fff;padding:20px 28px;border-bottom:1px solid #e8e0d8">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">${avatarHtml}<div><div style="font-size:13px;font-weight:700;color:#1e293b">${d.teacherName}</div><div style="font-size:10px;color:#94a3b8">${s.english_class} Class</div></div></div>
      <div style="font-size:12px;line-height:1.8;color:#374151;white-space:pre-wrap;background:#fafaf8;border-radius:10px;padding:14px 18px;border:1px solid #e8e0d8">${comment || '<em style="color:#94a3b8">No comment entered.</em>'}</div>
    </div>
    <!-- Scale + Footer -->
    <div style="background:#fff;padding:14px 28px">
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
            <InfoCell label="학년 / Grade" value={s.grade} />
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
            <InfoCell label="영어반 / English Class" value={s.english_class} />
            <InfoCell label="담당 / Teacher" value={d.teacherName} />
            <InfoCell label="Team Manager" value="Victoria Park" />
            <InfoCell label="교장 / Principal" value="Kwak Cheol Ok" />
          </div>
        </div>

        {/* ─── Score Tiles ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3.5">Academic Performance</div>
          <div className="grid grid-cols-5 gap-2.5">
            {DOMAINS.map((dom) => {
              const v = d.domainGrades[dom]
              if (v == null) return <div key={dom} className="rounded-xl border border-border p-3.5 text-center text-text-tertiary text-[12px]">--</div>
              const g = getLetterGrade(v); const diff = v - (d.classAverages[dom] || v)
              return (
                <div key={dom} className={`rounded-xl border-[1.5px] ${tileBgClass(v)} p-3.5 text-center`}>
                  <div className="text-[11px] text-[#64748b] font-semibold">{DOMAIN_SHORT[dom]}</div>
                  <div className="text-[28px] font-extrabold text-[#1e293b] mt-2 leading-none">{v.toFixed(1)}%</div>
                  <div className="text-[15px] font-bold mt-1" style={{ color: letterColor(g) }}>{g}</div>
                  <div className={`text-[9px] mt-2 font-semibold inline-block px-1.5 py-0.5 rounded-full ${diff >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                    {diff >= 0 ? '+' : ''}{diff.toFixed(1)} vs class
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Semester Trends ─── */}
        <div className="bg-white px-7 py-5" style={{ borderBottom: '1px solid #e8e0d8' }}>
          <div className="text-[10px] tracking-[2px] uppercase text-[#94a3b8] font-semibold mb-3.5">
            {d.prevSemesterName ? `Semester Progress \u2014 ${d.prevSemesterName} to ${d.semesterName}` : 'Semester Progress'}
          </div>

          {d.prevDomainGrades && d.prevOverall != null ? (
            <div className="grid items-center" style={{ gridTemplateColumns: 'repeat(5, 1fr) auto' }}>
              {/* Headers */}
              {DOMAINS.map((dom) => (
                <div key={dom + '-h'} className="text-center pb-2 text-[10px] text-[#94a3b8] font-semibold" style={{ borderBottom: '1px solid #f1ede8' }}>{DOMAIN_SHORT[dom]}</div>
              ))}
              <div className="text-center pb-2 text-[10px] text-[#94a3b8] font-bold pl-3" style={{ borderBottom: '1px solid #f1ede8', borderLeft: '1px solid #f1ede8' }}>Overall</div>
              {/* Values */}
              {DOMAINS.map((dom) => {
                const curr = d.domainGrades[dom]; const prev = d.prevDomainGrades![dom]
                if (curr == null || prev == null) return <div key={dom + '-v'} className="text-center py-3 text-[12px] text-[#94a3b8]">--</div>
                const diff = curr - prev
                return (
                  <div key={dom + '-v'} className="text-center py-3">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[12px] text-[#94a3b8]">{prev.toFixed(1)}</span>
                      <svg width="14" height="8" viewBox="0 0 16 10"><line x1="0" y1="5" x2="11" y2="5" stroke="#94a3b8" strokeWidth="1.5" /><polygon points="9,1 15,5 9,9" fill="#94a3b8" /></svg>
                      <span className="text-[13px] font-bold text-[#1e293b]">{curr.toFixed(1)}</span>
                    </div>
                    <div className={`text-[11px] font-bold mt-1 ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-[#64748b]'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </div>
                  </div>
                )
              })}
              {/* Overall */}
              <div className="text-center py-3 pl-3" style={{ borderLeft: '1px solid #f1ede8' }}>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-[12px] text-[#94a3b8]">{d.prevOverall!.toFixed(1)}</span>
                  <svg width="14" height="8" viewBox="0 0 16 10"><line x1="0" y1="5" x2="11" y2="5" stroke="#94a3b8" strokeWidth="1.5" /><polygon points="9,1 15,5 9,9" fill="#94a3b8" /></svg>
                  <span className="text-[14px] font-extrabold text-navy">{d.overallGrade!.toFixed(1)}</span>
                </div>
                <div className={`text-[12px] font-extrabold mt-1 ${(d.overallGrade! - d.prevOverall!) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(d.overallGrade! - d.prevOverall!) > 0 ? '+' : ''}{(d.overallGrade! - d.prevOverall!).toFixed(1)}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8f9fb] rounded-xl p-5 text-center">
              <p className="text-[13px] font-semibold text-[#475569]">First semester in the English Program</p>
              <p className="text-[12px] text-[#94a3b8] mt-1">Semester-over-semester progress will appear here starting next reporting period.</p>
            </div>
          )}
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
            {/* AI Draft — hidden on print */}
            <button onClick={() => setShowAiPanel(!showAiPanel)}
              className={`print:hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${showAiPanel ? 'bg-navy text-white border-navy' : 'bg-[#f8f5f1] text-[#475569] border-[#d1d5db] hover:bg-[#f1ede8]'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              AI Draft
            </button>
          </div>

          {/* AI Panel -- Template-based comment generator */}
          {showAiPanel && (
            <div className="print:hidden bg-[#f8f9fb] border border-[#d1d5db] rounded-xl p-4 mb-3.5">
              <p className="text-[11px] font-bold text-[#475569] mb-2">Comment Draft Generator</p>
              <p className="text-[11px] text-[#64748b] leading-relaxed mb-3">Generates a draft from this student's grades, reading fluency, and semester trends. Edit to add your personal observations.</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {(['Balanced', 'Highlight growth', 'Constructive'] as const).map((tone) => (
                  <button key={tone} onClick={() => setCommentTone(tone)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all ${commentTone === tone ? 'bg-navy text-white border-navy' : 'bg-white border-[#d1d5db] text-[#475569] hover:bg-[#f1f5f9]'}`}>{tone}</button>
                ))}
              </div>
              <button onClick={() => generateTemplateComment()} className="w-full py-2 rounded-lg text-[12px] font-semibold bg-navy text-white hover:bg-navy-dark">Generate Draft Comment</button>
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

  const attPct = data.totalAtt > 0 ? `${Math.round((data.attCounts.present / data.totalAtt) * 100)}%` : '--'
  const cwpm = data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'
  const readLvl = data.latestReading ? (data.latestReading.passage_level || data.latestReading.reading_level || '--') : '--'

  const pw = window.open('', '_blank')
  if (!pw) return
  pw.document.write(`<html><head><title>Progress Report - ${student.english_name}</title>
  <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f5f0eb}
  .card{max-width:680px;margin:20px auto;overflow:hidden;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
  @media print{body{background:white}.card{margin:0;box-shadow:none;border-radius:0;page-break-after:always}}</style></head>
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
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px">${ds}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Attendance</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${attPct}</p><p style="font-size:10px;color:#94a3b8">${data.attCounts.present}P / ${data.attCounts.absent}A / ${data.attCounts.tardy}T</p></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Reading (CWPM)</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${cwpm}</p><p style="font-size:10px;color:#94a3b8">Level: ${readLvl}</p></div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Behavior Logs</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${data.behaviorCount}</p><p style="font-size:10px;color:#94a3b8">total entries</p></div>
    </div>
    ${data.comment ? `<p style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;font-weight:600;margin-bottom:6px">Teacher Comments</p><div style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:12px;line-height:1.7;color:#374151">${data.comment}</div>` : ''}
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

      const { data: attendance } = await supabase.from('attendance').select('status').eq('student_id', student.id)
      const attCounts = { present: 0, absent: 0, tardy: 0 }
      attendance?.forEach((a: any) => { if (attCounts[a.status as keyof typeof attCounts] !== undefined) attCounts[a.status as keyof typeof attCounts]++ })
      const totalAtt = (attendance || []).length
      const { data: reading } = await supabase.from('reading_assessments').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(1)
      const { count: behaviorCount } = await supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('student_id', student.id)
      const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', student.id).eq('semester_id', semesterId).limit(1).single()
      const { data: teacherData } = await supabase.from('teachers').select('name').eq('english_class', student.english_class).limit(1).single()
      const { data: semData } = await supabase.from('semesters').select('name').eq('id', semesterId).single()

      const data = {
        domainGrades, overallGrade, overallLetter,
        attCounts, totalAtt,
        latestReading: reading?.[0] || null,
        behaviorCount: behaviorCount || 0,
        comment: commentData?.text || '',
        teacherName: teacherData?.name || currentTeacher?.name || '',
        semesterName: semData?.name || '',
      }

      const ds = DOMAINS.map(dom => {
        const v = data.domainGrades[dom]; if (v == null) return `<div style="text-align:center;border:1px solid #e2e8f0;border-radius:8px;padding:10px 6px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:#94a3b8;margin-top:4px">--</p></div>`
        const letter = getLetterGrade(v); const t = tileBgPrint(v)
        return `<div style="text-align:center;border:1px solid ${t.border};border-radius:8px;padding:10px 6px;background:${t.bg}"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">${DOMAIN_SHORT[dom]}</p><p style="font-size:18px;font-weight:700;color:${letterColor(letter)};margin-top:4px">${letter}</p><p style="font-size:10px;color:#64748b">${v.toFixed(1)}%</p></div>`
      }).join('')

      const attPct = data.totalAtt > 0 ? `${Math.round((data.attCounts.present / data.totalAtt) * 100)}%` : '--'
      const cwpm = data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'
      const readLvl = data.latestReading ? (data.latestReading.passage_level || data.latestReading.reading_level || '--') : '--'

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
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Attendance</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${attPct}</p><p style="font-size:10px;color:#94a3b8">${data.attCounts.present}P / ${data.attCounts.absent}A / ${data.attCounts.tardy}T</p></div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Reading (CWPM)</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${cwpm}</p><p style="font-size:10px;color:#94a3b8">Level: ${readLvl}</p></div>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px"><p style="font-size:9px;color:#94a3b8;font-weight:600;text-transform:uppercase">Behavior Logs</p><p style="font-size:16px;font-weight:700;color:#1e3a5f;margin-top:4px">${data.behaviorCount}</p><p style="font-size:10px;color:#94a3b8">total entries</p></div>
        </div>
        ${data.comment ? `<div style="background:#f8f9fb;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;font-size:12px;line-height:1.7;color:#374151;margin-bottom:12px">${data.comment}</div>` : ''}
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

      // Get attendance stats
      const { data: attendance } = await supabase.from('attendance').select('status').eq('student_id', studentId)
      const attCounts = { present: 0, absent: 0, tardy: 0 }
      attendance?.forEach((a: any) => { if (attCounts[a.status as keyof typeof attCounts] !== undefined) attCounts[a.status as keyof typeof attCounts]++ })

      // Get latest reading assessment
      const { data: reading } = await supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(1)

      // Get behavior count
      const { count: behaviorCount } = await supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('student_id', studentId)

      // Get teacher comment
      const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()

      // Teacher name
      const { data: teacherData } = await supabase.from('teachers').select('name').eq('english_class', student.english_class).limit(1).single()

      setData({
        domainGrades, overallGrade,
        overallLetter: overallGrade != null ? getLetterGrade(overallGrade) : '--',
        attCounts, totalAtt: (attendance || []).length,
        latestReading: reading?.[0] || null,
        behaviorCount: behaviorCount || 0,
        comment: commentData?.text || '',
        teacherName: teacherData?.name || '',
        semesterName: semester?.name || '',
      })
      setLoading(false)
    })()
  }, [studentId, semesterId])

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!student || !data) return <div className="py-12 text-center text-text-tertiary">No data available.</div>

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
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

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-alt border border-border rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Attendance</p>
              <p className="text-[16px] font-bold text-navy">{data.totalAtt > 0 ? `${Math.round((data.attCounts.present / data.totalAtt) * 100)}%` : '--'}</p>
              <p className="text-[10px] text-text-tertiary">{data.attCounts.present}P / {data.attCounts.absent}A / {data.attCounts.tardy}T</p>
            </div>
            <div className="bg-surface-alt border border-border rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Reading (CWPM)</p>
              <p className="text-[16px] font-bold text-navy">{data.latestReading?.cwpm != null ? Math.round(data.latestReading.cwpm) : '--'}</p>
              <p className="text-[10px] text-text-tertiary">{data.latestReading ? `Level: ${data.latestReading.passage_level || data.latestReading.reading_level || '--'}` : 'No assessment'}</p>
            </div>
            <div className="bg-surface-alt border border-border rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Behavior Logs</p>
              <p className="text-[16px] font-bold text-navy">{data.behaviorCount}</p>
              <p className="text-[10px] text-text-tertiary">total entries</p>
            </div>
          </div>

          {/* Semester Progress Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold mb-1">Semester Progress</p>
            <p className="text-[12px] text-blue-600">Semester-over-semester progress will appear here starting next reporting period.</p>
          </div>

          {/* Teacher Comment */}
          {data.comment && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Teacher Comments</p>
              <div className="bg-surface-alt border border-border rounded-lg p-4">
                <p className="text-[13px] text-text-secondary leading-relaxed">{data.comment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print button */}
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

      const results = students.map((s: any) => {
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
