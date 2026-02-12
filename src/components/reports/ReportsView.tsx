'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, Printer, User, Users } from 'lucide-react'

type LangKey = 'en' | 'ko'

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
type Domain = typeof DOMAINS[number]
const DOMAIN_HEADERS: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics &\nFoundational\nSkills', writing: 'Writing',
  speaking: 'Speaking &\nListening', language: 'Language\nStandards',
}
const DOMAIN_PRINT: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics &<br>Foundational<br>Skills', writing: 'Writing',
  speaking: 'Speaking &<br>Listening', language: 'Language<br>Standards',
}

const GRADING_SCALE = [
  { letter: 'A+', min: 97 }, { letter: 'A', min: 93 }, { letter: 'A-', min: 90 },
  { letter: 'B+', min: 87 }, { letter: 'B', min: 83 }, { letter: 'B', min: 83 },
  { letter: 'B-', min: 80 }, { letter: 'C+', min: 77 }, { letter: 'C', min: 73 },
  { letter: 'C-', min: 70 }, { letter: 'D+', min: 67 }, { letter: 'D', min: 63 },
  { letter: 'D-', min: 60 }, { letter: 'E', min: 0 },
]
const SCALE_DISPLAY = [
  { letter: 'A+', range: '97-100%' }, { letter: 'A', range: '93-96%' }, { letter: 'A-', range: '90-92%' },
  { letter: 'B+', range: '87-89%' }, { letter: 'B', range: '83-86%' }, { letter: 'B-', range: '80-82%' },
  { letter: 'C+', range: '77-79%' }, { letter: 'C', range: '73-76%' }, { letter: 'C-', range: '70-72%' },
  { letter: 'D+', range: '67-69%' }, { letter: 'D', range: '63-66%' }, { letter: 'D-', range: '60-62%' },
  { letter: 'E', range: '0-59%' },
]

function getLetterGrade(score: number): string {
  const r = Math.round(score)
  for (const tier of GRADING_SCALE) { if (r >= tier.min) return tier.letter }
  return 'E'
}

// Months for spring semester (Mar-Jul) and fall semester (Sep-Dec, Jan-Feb)
function getSemesterMonths(semesterName: string): { month: number; label: string }[] {
  const lower = semesterName.toLowerCase()
  if (lower.includes('spring')) return [{ month: 3, label: 'March' }, { month: 4, label: 'April' }, { month: 5, label: 'May' }, { month: 6, label: 'June' }, { month: 7, label: 'July' }]
  return [{ month: 9, label: 'September' }, { month: 10, label: 'October' }, { month: 11, label: 'November' }, { month: 12, label: 'December' }, { month: 1, label: 'January' }, { month: 2, label: 'February' }]
}

interface ReportCardData {
  student: any
  monthlyGrades: Record<number, Record<string, number | null>> // month -> domain -> avg%
  behaviorGrades: Record<number, string> // month -> letter
  summativeScores: { label: string; score: number | null; max: number }[]
  finalGrades: Record<string, number | null> // domain -> avg%
  overallGrade: number | null
  classAverages: Record<string, number | null> // domain -> class avg%
  classOverall: number | null
  comment: string
  teacherName: string
  semesterName: string
}

export default function ReportsView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [mode, setMode] = useState<'individual' | 'class'>('individual')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(4)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const { semesters } = useSemesters()
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null)

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ENGLISH_CLASSES
  const { students } = useStudents({ grade: selectedGrade, english_class: selectedClass })
  const selectedSemester = semesters.find((s: any) => s.id === selectedSemesterId)

  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      const active = semesters.find((s: any) => s.is_active)
      setSelectedSemesterId(active?.id || semesters[0].id)
    }
  }, [semesters, selectedSemesterId])

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.reports.title}</h2>
        <p className="text-text-secondary text-sm mt-1">Generate report cards matching school format</p>
        <div className="flex gap-1 mt-4">
          <button onClick={() => setMode('individual')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'individual' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><User size={14} /> Report Card</button>
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
          {mode === 'individual' && (
            <>
              <div className="w-px h-6 bg-border" />
              <select value={selectedStudentId || ''} onChange={(e: any) => setSelectedStudentId(e.target.value || null)} className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy min-w-[200px]">
                <option value="">Select student...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
              </select>
            </>
          )}
        </div>

        {mode === 'individual' && selectedStudentId && selectedSemesterId && selectedSemester && (
          <IndividualReport studentId={selectedStudentId} semesterId={selectedSemesterId} semester={selectedSemester} students={students} allStudents={students} lang={lang} selectedClass={selectedClass} />
        )}
        {mode === 'individual' && !selectedStudentId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">Select a student to generate their report card.</div>
        )}
        {mode === 'class' && selectedSemesterId && selectedSemester && (
          <ClassSummary students={students} semesterId={selectedSemesterId} semester={selectedSemester} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} />
        )}
      </div>
    </div>
  )
}

// ─── Individual Report Card ─────────────────────────────────────────

function IndividualReport({ studentId, semesterId, semester, students, allStudents, lang, selectedClass }: {
  studentId: string; semesterId: string; semester: any; students: any[]; allStudents: any[]; lang: LangKey; selectedClass: string
}) {
  const { showToast, currentTeacher } = useApp()
  const [data, setData] = useState<ReportCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }

    const months = getSemesterMonths(semester.name)

    // 1. Get all assessments for this grade/class/semester
    const { data: assessments } = await supabase.from('assessments').select('*')
      .eq('semester_id', semesterId).eq('grade', student.grade).eq('english_class', selectedClass)
    // Get all grades for this student
    const { data: grades } = await supabase.from('grades').select('*').eq('student_id', studentId)
    // Get all grades for class students (for class averages)
    const { data: allGrades } = await supabase.from('grades').select('*').in('student_id', allStudents.map((s: any) => s.id))

    // 2. Group assessments by month
    const monthlyGrades: Record<number, Record<string, number | null>> = {}
    const classMonthlyGrades: Record<number, Record<string, number[]>> = {}
    months.forEach((m: any) => { monthlyGrades[m.month] = {}; classMonthlyGrades[m.month] = {} })
    DOMAINS.forEach((d) => months.forEach((m: any) => { classMonthlyGrades[m.month][d] = [] }))

    ;(assessments || []).forEach((a: any) => {
      if (!a.date) return
      const assessMonth = new Date(a.date + 'T00:00').getMonth() + 1
      const matchMonth = months.find((m: any) => m.month === assessMonth)
      if (!matchMonth) return

      const studentGrade = (grades || []).find((g: any) => g.assessment_id === a.id)
      if (studentGrade && studentGrade.score != null && !studentGrade.is_exempt) {
        const pct = (studentGrade.score / a.max_score) * 100
        if (!monthlyGrades[assessMonth][a.domain]) monthlyGrades[assessMonth][a.domain] = pct
        else monthlyGrades[assessMonth][a.domain] = ((monthlyGrades[assessMonth][a.domain] as number) + pct) / 2
      }

      // Class averages
      allStudents.forEach((s: any) => {
        const sg = (allGrades || []).find((g: any) => g.assessment_id === a.id && g.student_id === s.id)
        if (sg && sg.score != null && !sg.is_exempt) {
          classMonthlyGrades[assessMonth][a.domain].push((sg.score / a.max_score) * 100)
        }
      })
    })

    // 3. Behavior grades
    const { data: behaviorData } = await supabase.from('monthly_behavior_grades').select('*')
      .eq('student_id', studentId).eq('semester_id', semesterId)
    const behaviorGrades: Record<number, string> = {}
    ;(behaviorData || []).forEach((b: any) => { behaviorGrades[b.month] = b.grade })

    // 4. Summative scores (Assessment A, B)
    const { data: summData } = await supabase.from('summative_scores').select('*')
      .eq('student_id', studentId).eq('semester_id', semesterId).order('assessment_label')
    const summativeScores = (summData || []).map((s: any) => ({ label: s.assessment_label, score: s.score, max: s.max_score || 100 }))
    if (summativeScores.length === 0) {
      summativeScores.push({ label: 'Assessment A', score: null, max: 100 }, { label: 'Assessment B', score: null, max: 100 })
    }

    // 5. Final grades per domain (average of all monthly grades)
    const finalGrades: Record<string, number | null> = {}
    const classAverages: Record<string, number | null> = {}
    DOMAINS.forEach((d) => {
      const vals = months.map((m: any) => monthlyGrades[m.month][d]).filter((v: any) => v != null) as number[]
      finalGrades[d] = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : null

      const classVals = months.flatMap((m: any) => classMonthlyGrades[m.month][d])
      classAverages[d] = classVals.length > 0 ? Math.round(classVals.reduce((a: number, b: number) => a + b, 0) / classVals.length * 10) / 10 : null
    })

    const scoredDomains = DOMAINS.filter((d) => finalGrades[d] != null)
    const overallGrade = scoredDomains.length > 0 ? Math.round(scoredDomains.reduce((a: number, d) => a + (finalGrades[d] as number), 0) / scoredDomains.length * 10) / 10 : null
    const classOverall = DOMAINS.filter((d) => classAverages[d] != null).length > 0
      ? Math.round(DOMAINS.filter((d) => classAverages[d] != null).reduce((a: number, d) => a + (classAverages[d] as number), 0) / DOMAINS.filter((d) => classAverages[d] != null).length * 10) / 10 : null

    // 6. Comment
    const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()

    // Teacher name
    const teacher = student.teacher_id ? (await supabase.from('teachers').select('name').eq('id', student.teacher_id).single()).data : null

    setData({
      student, monthlyGrades, behaviorGrades, summativeScores, finalGrades, overallGrade,
      classAverages, classOverall, comment: commentData?.text || '',
      teacherName: teacher?.name || currentTeacher?.name || '', semesterName: semester.name,
    })
    setComment(commentData?.text || '')
    setLoading(false)
  }, [studentId, semesterId, semester, students, allStudents, selectedClass, currentTeacher])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    await supabase.from('comments').upsert({ student_id: studentId, semester_id: semesterId, text: comment.trim(), created_by: currentTeacher?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    showToast('Comment saved')
  }

  const handlePrint = () => {
    if (!data) return
    const d = data, s = d.student
    const months = getSemesterMonths(d.semesterName)
    const activeMonths = months.filter((m: any) => {
      const hasData = DOMAINS.some((dom) => d.monthlyGrades[m.month]?.[dom] != null) || d.behaviorGrades[m.month]
      return hasData
    })
    // Use active months or default to 3 months
    const displayMonths = activeMonths.length > 0 ? activeMonths : months.slice(0, 3)

    // Monthly grades rows
    const monthRows = displayMonths.map((m: any) =>
      `<tr><td style="padding:6px 8px;border:1px solid #999;font-weight:600;text-align:center">${m.label}</td>
      ${DOMAINS.map((dom) => `<td style="padding:6px 8px;border:1px solid #999;text-align:center">${d.monthlyGrades[m.month]?.[dom] != null ? (d.monthlyGrades[m.month][dom] as number).toFixed(1) + '%' : ''}</td>`).join('')}
      <td style="padding:6px 8px;border:1px solid #999;text-align:center;font-weight:600">${d.behaviorGrades[m.month] || ''}</td></tr>`
    ).join('')

    // Summative row
    const summRow = `<tr><td style="padding:6px 8px;border:1px solid #999;font-weight:600;text-align:center;font-size:11px">Unit / Module<br>Assessment</td>
      <td colspan="3" style="padding:6px 8px;border:1px solid #999;text-align:center"><strong>${d.summativeScores[0]?.label || 'Assessment A'}</strong> ${d.summativeScores[0]?.score != null ? d.summativeScores[0].score + '%' : ''}</td>
      <td colspan="3" style="padding:6px 8px;border:1px solid #999;text-align:center"><strong>${d.summativeScores[1]?.label || 'Assessment B'}</strong> ${d.summativeScores[1]?.score != null ? d.summativeScores[1].score + '%' : ''}</td></tr>`

    // Final grades
    const finalRow = `<tr style="background:#e8eef6"><td style="padding:8px;border:1px solid #999;font-weight:700;font-size:11px;text-align:center">${d.semesterName}<br>Final Grades</td>
      ${DOMAINS.map((dom) => `<td style="padding:8px;border:1px solid #999;text-align:center;font-weight:700;font-size:14px">${d.finalGrades[dom] != null ? (d.finalGrades[dom] as number).toFixed(1) + '%' : ''}</td>`).join('')}
      <td style="padding:8px;border:1px solid #999;text-align:center;font-weight:800;font-size:14px">Overall Grade<br>${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : ''}</td></tr>`

    // Chart SVG
    const chartW = 420, chartH = 180, barW = 28, gap = 50
    const domainLabels = ['Reading', 'Phonics &\nFoundational Skills', 'Writing', 'Speaking &\nListening', 'Language\nStandards', 'Average']
    const studentVals = [...DOMAINS.map((dom) => d.finalGrades[dom]), d.overallGrade]
    const classVals = [...DOMAINS.map((dom) => d.classAverages[dom]), d.classOverall]
    const minY = 70, maxY = 100
    const scaleY = (v: number | null) => v != null ? chartH - ((Math.min(Math.max(v, minY), maxY) - minY) / (maxY - minY)) * chartH : chartH

    let chartBars = ''
    for (let i = 0; i < 6; i++) {
      const x = 40 + i * gap
      const sv = studentVals[i], cv = classVals[i]
      if (sv != null) chartBars += `<rect x="${x}" y="${scaleY(sv)}" width="${barW}" height="${chartH - scaleY(sv)}" fill="#4a5899" rx="2"/><text x="${x + barW / 2}" y="${scaleY(sv) - 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#333">${sv.toFixed(1)}%</text>`
      if (cv != null) chartBars += `<rect x="${x + barW + 2}" y="${scaleY(cv)}" width="${barW}" height="${chartH - scaleY(cv)}" fill="#c77878" rx="2"/><text x="${x + barW + 2 + barW / 2}" y="${scaleY(cv) - 4}" text-anchor="middle" font-size="8" font-weight="700" fill="#333">${cv.toFixed(1)}%</text>`
    }
    // Y axis labels
    let yLabels = ''
    for (let v = minY; v <= maxY; v += 5) { const y = scaleY(v); yLabels += `<text x="32" y="${y + 3}" text-anchor="end" font-size="8" fill="#666">${v}%</text><line x1="36" y1="${y}" x2="${40 + 5 * gap + barW * 2 + 10}" y2="${y}" stroke="#ddd" stroke-width="0.5"/>` }
    // X axis labels
    let xLabels = ''
    domainLabels.forEach((label, i) => {
      const x = 40 + i * gap + barW
      const lines = label.split('\n')
      lines.forEach((line: string, li: number) => { xLabels += `<text x="${x}" y="${chartH + 12 + li * 9}" text-anchor="middle" font-size="7" fill="#333">${line}</text>` })
    })

    const chartSvg = `<svg width="${chartW}" height="${chartH + 50}" viewBox="0 0 ${chartW} ${chartH + 50}">
      <text x="${chartW / 2}" y="-8" text-anchor="middle" font-size="12" font-weight="700">Student Average Vs. Class Average</text>
      <text x="${chartW / 2}" y="4" text-anchor="middle" font-size="9">·${s.english_name}·${selectedClass} Class</text>
      <g transform="translate(0,14)">${yLabels}${chartBars}${xLabels}
      <rect x="${chartW - 100}" y="0" width="10" height="10" fill="#4a5899" rx="1"/><text x="${chartW - 86}" y="9" font-size="8">${s.english_name}</text>
      <rect x="${chartW - 100}" y="14" width="10" height="10" fill="#c77878" rx="1"/><text x="${chartW - 86}" y="23" font-size="8">${selectedClass} Class</text></g></svg>`

    // Grading scale table
    const scaleRows = SCALE_DISPLAY.map((r: any) => `<tr><td style="padding:2px 6px;border:1px solid #999;font-weight:600;text-align:center;font-size:11px">${r.letter}</td><td style="padding:2px 6px;border:1px solid #999;font-size:11px;text-align:center">${r.range}</td></tr>`).join('')

    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`<html><head><title>Report Card — ${s.english_name}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;max-width:850px;margin:auto;color:#222;font-size:12px}
    .banner{background:#1e3a5f;color:white;text-align:center;padding:12px;font-size:22px;font-weight:700;border-radius:6px;font-family:Georgia,serif;margin-bottom:12px}
    table{border-collapse:collapse;width:100%}
    .info-table td{padding:3px 8px;font-size:12px;border:none}
    .info-label{font-weight:700;width:100px}
    .school-info{text-align:right}
    .school-name{font-weight:700;font-size:14px}
    .section{margin-top:16px;border:2px solid #1e3a5f;border-radius:6px;overflow:hidden}
    .section-title{background:#1e3a5f;color:white;text-align:center;padding:6px;font-size:15px;font-weight:700;font-family:Georgia,serif}
    .chart-section{display:flex;gap:12px;margin-top:16px;align-items:flex-start}
    .comment-section{border:2px solid #1e3a5f;border-radius:6px;overflow:hidden;margin-top:16px}
    .comment-title{background:#1e3a5f;color:white;text-align:center;padding:6px;font-size:15px;font-weight:700;font-family:Georgia,serif}
    .comment-body{padding:12px;min-height:100px;line-height:1.6;white-space:pre-wrap;font-size:12px}
    @media print{body{padding:10px;font-size:11px}}</style></head><body>
    <div class="banner">${d.semesterName} Report Card</div>
    <div style="text-align:center;font-weight:600;margin-bottom:8px">Student Information</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <table class="info-table" style="width:auto">
        <tr><td class="info-label">Korean Name</td><td>${s.korean_name}</td></tr>
        <tr><td class="info-label">English Name</td><td>${s.english_name}</td></tr>
        <tr><td class="info-label">Grade</td><td>${s.grade}</td><td class="info-label">Team Manager</td><td>Victoria Park</td></tr>
        <tr><td class="info-label">Korean Class</td><td>${s.korean_class}</td><td class="info-label">Principal</td><td>Kwak Cheol Ok</td></tr>
        <tr><td class="info-label">Class Number</td><td>${s.class_number}</td></tr>
        <tr><td class="info-label">English Class</td><td>${s.english_class}</td></tr>
        <tr><td class="info-label">Teacher</td><td>${d.teacherName}</td></tr>
      </table>
      <div class="school-info"><div class="school-name">Daewoo Elementary School</div><div>English Program<br><em>Growing together through English.</em></div></div>
    </div>
    <div class="section"><div class="section-title">${d.semesterName} Monthly Grades</div>
    <table><thead><tr style="background:#f0f0f0">
      <th style="padding:6px 8px;border:1px solid #999;font-size:11px;font-weight:700">Month</th>
      ${DOMAINS.map((dom) => `<th style="padding:6px 8px;border:1px solid #999;font-size:10px;font-weight:700;text-align:center">${DOMAIN_PRINT[dom]}</th>`).join('')}
      <th style="padding:6px 8px;border:1px solid #999;font-size:11px;font-weight:700;text-align:center">Behavior</th>
    </tr></thead><tbody>${monthRows}${summRow}</tbody></table></div>
    <div class="section" style="margin-top:8px"><table><thead><tr style="background:#e8eef6">
      <th style="padding:8px;border:1px solid #999;font-size:11px">${d.semesterName}<br>Final Grades</th>
      ${DOMAINS.map((dom) => `<th style="padding:8px;border:1px solid #999;font-size:10px;text-align:center">${DOMAIN_PRINT[dom]}</th>`).join('')}
      <th style="padding:8px;border:1px solid #999;font-size:11px;text-align:center">Overall Grade</th>
    </tr></thead><tbody><tr>
      <td style="border:1px solid #999"></td>
      ${DOMAINS.map((dom) => `<td style="padding:8px;border:1px solid #999;text-align:center;font-weight:700;font-size:14px">${d.finalGrades[dom] != null ? (d.finalGrades[dom] as number).toFixed(1) + '%' : ''}</td>`).join('')}
      <td style="padding:8px;border:1px solid #999;text-align:center;font-weight:800;font-size:16px">${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : ''}</td>
    </tr></tbody></table></div>
    <div class="chart-section"><div style="flex:1">${chartSvg}</div><div><table style="width:auto"><thead><tr style="background:#f0f0f0"><th colspan="2" style="padding:4px 8px;border:1px solid #999;font-size:11px;font-weight:700">Grading Scale</th></tr></thead><tbody>${scaleRows}</tbody></table></div></div>
    <div class="comment-section"><div class="comment-title">Teacher Comment</div><div class="comment-body">${comment || ''}</div></div>
    </body></html>`)
    printWin.document.close()
    printWin.print()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!data) return <div className="py-12 text-center text-text-tertiary">Could not load report data.</div>

  const d = data, s = d.student
  const months = getSemesterMonths(d.semesterName)
  const displayMonths = months.filter((m: any) => DOMAINS.some((dom) => d.monthlyGrades[m.month]?.[dom] != null) || d.behaviorGrades[m.month]).length > 0
    ? months.filter((m: any) => DOMAINS.some((dom) => d.monthlyGrades[m.month]?.[dom] != null) || d.behaviorGrades[m.month])
    : months.slice(0, 3)

  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt"><Printer size={15} /> Print Report Card</button></div>

      {/* Report card preview */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Banner */}
        <div className="bg-navy text-white text-center py-3 text-[18px] font-display font-bold">{d.semesterName} Report Card</div>

        {/* Student info */}
        <div className="px-6 py-4 flex justify-between items-start border-b border-border">
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1 text-[12px]">
            <span className="font-bold">Korean Name</span><span>{s.korean_name}</span><span className="font-bold">Team Manager</span><span>Victoria Park</span>
            <span className="font-bold">English Name</span><span>{s.english_name}</span><span className="font-bold">Principal</span><span>Kwak Cheol Ok</span>
            <span className="font-bold">Grade</span><span>{s.grade}</span><span></span><span></span>
            <span className="font-bold">Korean Class</span><span>{s.korean_class}</span><span></span><span></span>
            <span className="font-bold">Class Number</span><span>{s.class_number}</span><span></span><span></span>
            <span className="font-bold">English Class</span><span>{s.english_class}</span><span></span><span></span>
            <span className="font-bold">Teacher</span><span>{d.teacherName}</span><span></span><span></span>
          </div>
          <div className="text-right"><p className="font-bold text-[14px]">Daewoo Elementary School</p><p className="text-[12px] text-text-secondary">English Program<br/><em>Growing together through English.</em></p></div>
        </div>

        {/* Monthly grades table */}
        <div className="px-6 py-4">
          <div className="border border-navy rounded-lg overflow-hidden">
            <div className="bg-navy text-white text-center py-2 text-[14px] font-bold">{d.semesterName} Monthly Grades</div>
            <table className="w-full text-[12px]">
              <thead><tr className="bg-surface-alt">
                <th className="px-3 py-2 border border-border text-center font-bold w-20">Month</th>
                {DOMAINS.map((dom) => <th key={dom} className="px-2 py-2 border border-border text-center font-bold text-[10px]" style={{ whiteSpace: 'pre-wrap' }}>{DOMAIN_HEADERS[dom]}</th>)}
                <th className="px-2 py-2 border border-border text-center font-bold">Behavior</th>
              </tr></thead>
              <tbody>
                {displayMonths.map((m: any) => (
                  <tr key={m.month}>
                    <td className="px-3 py-2 border border-border text-center font-semibold">{m.label}</td>
                    {DOMAINS.map((dom) => <td key={dom} className="px-2 py-2 border border-border text-center">{d.monthlyGrades[m.month]?.[dom] != null ? `${(d.monthlyGrades[m.month][dom] as number).toFixed(1)}%` : ''}</td>)}
                    <td className="px-2 py-2 border border-border text-center font-semibold">{d.behaviorGrades[m.month] || ''}</td>
                  </tr>
                ))}
                <tr className="bg-surface-alt">
                  <td className="px-3 py-2 border border-border text-center font-bold text-[10px]">Unit / Module<br/>Assessment</td>
                  <td colSpan={3} className="px-2 py-2 border border-border text-center"><strong>{d.summativeScores[0]?.label}</strong> {d.summativeScores[0]?.score != null ? `${d.summativeScores[0].score}%` : ''}</td>
                  <td colSpan={3} className="px-2 py-2 border border-border text-center"><strong>{d.summativeScores[1]?.label}</strong> {d.summativeScores[1]?.score != null ? `${d.summativeScores[1].score}%` : ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Final grades */}
        <div className="px-6 pb-4">
          <div className="border border-navy rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="bg-accent-light">
                <th className="px-3 py-2 border border-border font-bold text-[11px]">{d.semesterName}<br/>Final Grades</th>
                {DOMAINS.map((dom) => <th key={dom} className="px-2 py-2 border border-border text-center font-bold text-[10px]" style={{ whiteSpace: 'pre-wrap' }}>{DOMAIN_HEADERS[dom]}</th>)}
                <th className="px-2 py-2 border border-border text-center font-bold">Overall Grade</th>
              </tr></thead>
              <tbody><tr>
                <td className="border border-border"></td>
                {DOMAINS.map((dom) => <td key={dom} className="px-2 py-3 border border-border text-center font-bold text-[15px]">{d.finalGrades[dom] != null ? `${(d.finalGrades[dom] as number).toFixed(1)}%` : ''}</td>)}
                <td className="px-2 py-3 border border-border text-center font-bold text-[18px] text-navy">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}%` : ''}</td>
              </tr></tbody>
            </table>
          </div>
        </div>

        {/* Comment */}
        <div className="px-6 pb-6">
          <div className="border border-navy rounded-lg overflow-hidden">
            <div className="bg-navy text-white text-center py-2 text-[14px] font-bold">Teacher Comment</div>
            <div className="p-4">
              <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={5}
                placeholder="Write comments about this student's progress..."
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none leading-relaxed" />
              <div className="flex justify-end mt-2">
                <button onClick={saveComment} disabled={savingComment}
                  className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
                  {savingComment ? 'Saving...' : 'Save Comment'}
                </button>
              </div>
            </div>
          </div>
        </div>
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
          const domainAssessments = (assessments || []).filter((a: any) => a.domain === domain)
          const scores = domainAssessments.map((a: any) => {
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
        return { student: s, domainAvgs, overall, letter: overall != null ? getLetterGrade(overall) : '—' }
      })
      results.sort((a: any, b: any) => (b.overall || 0) - (a.overall || 0))
      setSummaries(results)
      setLoading(false)
    })()
  }, [students, semesterId, selectedGrade, selectedClass])

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
          <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
          {DOMAINS.map((d) => <th key={d} className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{DOMAIN_HEADERS[d].replace('\n', ' ')}</th>)}
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
                  {s.domainAvgs[d] != null ? <span className={`font-semibold ${s.domainAvgs[d] >= 90 ? 'text-green-600' : s.domainAvgs[d] >= 80 ? 'text-blue-600' : s.domainAvgs[d] >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.domainAvgs[d].toFixed(1)}</span> : <span className="text-text-tertiary">—</span>}
                </td>
              ))}
              <td className="px-4 py-2.5 text-center font-bold text-navy">{s.overall != null ? s.overall.toFixed(1) : '—'}</td>
              <td className={`px-4 py-2.5 text-center font-bold text-[15px] ${s.letter.startsWith('A') ? 'text-green-700' : s.letter.startsWith('B') ? 'text-blue-700' : s.letter.startsWith('C') ? 'text-amber-700' : 'text-red-700'}`}>{s.letter}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
