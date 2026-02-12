'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, Printer, User, Users, ChevronLeft, ChevronRight } from 'lucide-react'

type LangKey = 'en' | 'ko'

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
type Domain = typeof DOMAINS[number]
const DOMAIN_HEADERS: Record<string, string> = {
  reading: 'Reading', phonics: 'Phonics &\nFoundational\nSkills', writing: 'Writing',
  speaking: 'Speaking &\nListening', language: 'Language\nStandards',
}
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
  if (l.startsWith('A')) return '#15803d'; if (l.startsWith('B')) return '#1d4ed8'
  if (l.startsWith('C')) return '#b45309'; if (l.startsWith('D')) return '#c2410c'; return '#dc2626'
}

interface ReportData {
  student: any
  domainGrades: Record<string, number | null>
  overallGrade: number | null
  overallLetter: string
  classAverages: Record<string, number | null>
  classOverall: number | null
  behaviorGrade: string
  comment: string
  teacherName: string
  semesterName: string
  strengths: string[]
  growthAreas: string[]
}

// ─── Radar Chart SVG Generator ──────────────────────────────────────

function radarChartSVG(studentVals: (number | null)[], classVals: (number | null)[], labels: string[], studentName: string, className: string, size: number = 280): string {
  const cx = size / 2, cy = size / 2, r = size * 0.35
  const n = labels.length
  const minVal = 50, maxVal = 100

  const polarToCart = (angle: number, val: number) => {
    const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)))
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: cx + norm * r * Math.cos(rad), y: cy + norm * r * Math.sin(rad) }
  }

  // Grid rings
  let grid = ''
  for (let ring = 0; ring <= 5; ring++) {
    const frac = ring / 5
    let pts = ''
    for (let i = 0; i < n; i++) {
      const angle = (360 / n) * i
      const rad = (angle - 90) * (Math.PI / 180)
      pts += `${cx + frac * r * Math.cos(rad)},${cy + frac * r * Math.sin(rad)} `
    }
    grid += `<polygon points="${pts.trim()}" fill="none" stroke="#ddd" stroke-width="${ring === 5 ? 1.5 : 0.5}"/>`
    // Ring label
    if (ring > 0) {
      const val = minVal + (ring / 5) * (maxVal - minVal)
      grid += `<text x="${cx + 3}" y="${cy - frac * r + 3}" font-size="7" fill="#999">${val}%</text>`
    }
  }

  // Spokes + labels
  let spokes = ''
  for (let i = 0; i < n; i++) {
    const angle = (360 / n) * i
    const rad = (angle - 90) * (Math.PI / 180)
    const ex = cx + r * Math.cos(rad), ey = cy + r * Math.sin(rad)
    spokes += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#ccc" stroke-width="0.5"/>`
    // Label
    const lx = cx + (r + 22) * Math.cos(rad), ly = cy + (r + 22) * Math.sin(rad)
    const lines = labels[i].split('\n')
    const anchor = Math.abs(lx - cx) < 5 ? 'middle' : lx > cx ? 'start' : 'end'
    lines.forEach((line: string, li: number) => {
      spokes += `<text x="${lx}" y="${ly + li * 10 - (lines.length - 1) * 4}" text-anchor="${anchor}" font-size="8" font-weight="600" fill="#333">${line}</text>`
    })
  }

  // Data polygons
  const makePolygon = (vals: (number | null)[], color: string, opacity: string) => {
    let pts = ''
    for (let i = 0; i < n; i++) {
      const v = vals[i] ?? minVal
      const angle = (360 / n) * i
      const { x, y } = polarToCart(angle, v)
      pts += `${x},${y} `
    }
    return `<polygon points="${pts.trim()}" fill="${color}" fill-opacity="${opacity}" stroke="${color}" stroke-width="1.5"/>` +
      vals.map((v: number | null, i: number) => {
        if (v == null) return ''
        const angle = (360 / n) * i
        const { x, y } = polarToCart(angle, v)
        return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" stroke="white" stroke-width="1"/><text x="${x}" y="${y - 7}" text-anchor="middle" font-size="8" font-weight="700" fill="${color}">${v.toFixed(1)}%</text>`
      }).join('')
  }

  const classPolygon = makePolygon(classVals, '#c77878', '0.15')
  const studentPolygon = makePolygon(studentVals, '#1e3a5f', '0.2')

  // Legend
  const legend = `<rect x="${size - 90}" y="${size - 30}" width="10" height="10" fill="#1e3a5f" rx="2"/><text x="${size - 76}" y="${size - 21}" font-size="8" fill="#333">${studentName}</text>` +
    `<rect x="${size - 90}" y="${size - 16}" width="10" height="10" fill="#c77878" rx="2"/><text x="${size - 76}" y="${size - 7}" font-size="8" fill="#333">${className} Avg</text>`

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${grid}${spokes}${classPolygon}${studentPolygon}${legend}</svg>`
}

// ─── Auto Insights ──────────────────────────────────────────────────

function generateInsights(domainGrades: Record<string, number | null>, classAverages: Record<string, number | null>): { strengths: string[]; growthAreas: string[] } {
  const strengths: string[] = []
  const growthAreas: string[] = []

  const scored = DOMAINS.filter((d) => domainGrades[d] != null).map((d) => ({
    domain: d, score: domainGrades[d] as number, classAvg: classAverages[d] as number | null,
    label: DOMAIN_SHORT[d],
  })).sort((a, b) => b.score - a.score)

  if (scored.length === 0) return { strengths: ['No assessment data available yet.'], growthAreas: [] }

  // Top domains
  scored.slice(0, 2).forEach((s) => {
    const grade = getLetterGrade(s.score)
    if (s.score >= 90) strengths.push(`Strong performance in ${s.label} (${s.score.toFixed(1)}%, ${grade})`)
    else if (s.score >= 80) strengths.push(`Solid work in ${s.label} (${s.score.toFixed(1)}%, ${grade})`)
    if (s.classAvg != null && s.score > s.classAvg + 3) strengths.push(`Scores above class average in ${s.label} by ${(s.score - s.classAvg).toFixed(1)} points`)
  })

  // Bottom domains
  scored.slice(-2).reverse().forEach((s) => {
    if (s.score < 70) growthAreas.push(`${s.label} needs significant improvement (${s.score.toFixed(1)}%, ${getLetterGrade(s.score)})`)
    else if (s.score < 80) growthAreas.push(`${s.label} is an area for continued development (${s.score.toFixed(1)}%, ${getLetterGrade(s.score)})`)
    else if (scored.length > 2 && s.score < scored[0].score - 5) growthAreas.push(`Relative area for growth: ${s.label} (${s.score.toFixed(1)}%)`)
    if (s.classAvg != null && s.score < s.classAvg - 3) growthAreas.push(`Below class average in ${s.label} by ${(s.classAvg - s.score).toFixed(1)} points`)
  })

  if (strengths.length === 0) strengths.push('Making progress across all domains.')
  if (growthAreas.length === 0) growthAreas.push('Performing well across the board — continue the great work!')

  return { strengths: strengths.slice(0, 3), growthAreas: growthAreas.slice(0, 3) }
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReportsView() {
  const { t, language, currentTeacher } = useApp()
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

  // Navigate between students
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
          <IndividualReport key={selectedStudentId} studentId={selectedStudentId} semesterId={selectedSemesterId} semester={selectedSemester} students={students} lang={lang} selectedClass={selectedClass} />
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

function IndividualReport({ studentId, semesterId, semester, students, lang, selectedClass }: {
  studentId: string; semesterId: string; semester: any; students: any[]; lang: LangKey; selectedClass: string
}) {
  const { showToast, currentTeacher } = useApp()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)

  const loadReport = useCallback(async () => {
    setLoading(true)
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }

    // 1. Get assessments + grades
    const { data: assessments } = await supabase.from('assessments').select('*')
      .eq('semester_id', semesterId).eq('grade', student.grade).eq('english_class', selectedClass)
    const { data: studentGrades } = await supabase.from('grades').select('*').eq('student_id', studentId)
    const { data: allGrades } = await supabase.from('grades').select('*').in('student_id', students.map((s: any) => s.id))

    // 2. Calculate domain averages for student and class
    const domainGrades: Record<string, number | null> = {}
    const classAverages: Record<string, number | null> = {}

    DOMAINS.forEach((domain) => {
      const domAssessments = (assessments || []).filter((a: any) => a.domain === domain)

      // Student scores
      const studentScores = domAssessments.map((a: any) => {
        const g = (studentGrades || []).find((gr: any) => gr.assessment_id === a.id)
        if (!g || g.score == null || g.is_exempt) return null
        return (g.score / a.max_score) * 100
      }).filter((x: any) => x !== null) as number[]
      domainGrades[domain] = studentScores.length > 0 ? Math.round(studentScores.reduce((a: number, b: number) => a + b, 0) / studentScores.length * 10) / 10 : null

      // Class scores
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
    const overallLetter = overallGrade != null ? getLetterGrade(overallGrade) : '—'
    const classScoredDomains = DOMAINS.filter((d) => classAverages[d] != null)
    const classOverall = classScoredDomains.length > 0 ? Math.round(classScoredDomains.reduce((a: number, d) => a + (classAverages[d] as number), 0) / classScoredDomains.length * 10) / 10 : null

    // 3. Behavior
    const { data: behaviorData } = await supabase.from('monthly_behavior_grades').select('grade').eq('student_id', studentId).eq('semester_id', semesterId)
    const behaviorGrade = behaviorData && behaviorData.length > 0 ? behaviorData[behaviorData.length - 1].grade : ''

    // 4. Comment
    const { data: commentData } = await supabase.from('comments').select('text').eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()

    // 5. Teacher name
    const teacher = student.teacher_id ? (await supabase.from('teachers').select('name').eq('id', student.teacher_id).single()).data : null

    // 6. Insights
    const { strengths, growthAreas } = generateInsights(domainGrades, classAverages)

    setData({
      student, domainGrades, overallGrade, overallLetter, classAverages, classOverall,
      behaviorGrade, comment: commentData?.text || '',
      teacherName: teacher?.name || currentTeacher?.name || '', semesterName: semester.name,
      strengths, growthAreas,
    })
    setComment(commentData?.text || '')
    setLoading(false)
  }, [studentId, semesterId, semester, students, selectedClass, currentTeacher])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    await supabase.from('comments').upsert({ student_id: studentId, semester_id: semesterId, text: comment.trim(), created_by: currentTeacher?.id || null, updated_at: new Date().toISOString() }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    showToast('Comment saved')
  }

  // ─── Print Handler ──────────────────────────────────────────────────

  const handlePrint = () => {
    if (!data) return
    const d = data, s = d.student

    const radarSvg = radarChartSVG(
      DOMAINS.map((dom) => d.domainGrades[dom]),
      DOMAINS.map((dom) => d.classAverages[dom]),
      ['Reading', 'Phonics &\nFoundational\nSkills', 'Writing', 'Speaking &\nListening', 'Language\nStandards'],
      s.english_name, selectedClass, 300
    )

    const scaleRows = SCALE_DISPLAY.map((r: any) => `<tr><td style="padding:2px 8px;border:1px solid #bbb;font-weight:600;text-align:center;font-size:11px">${r.letter}</td><td style="padding:2px 8px;border:1px solid #bbb;font-size:11px;text-align:center">${r.range}</td></tr>`).join('')

    const strengthsList = d.strengths.map((s: string) => `<li style="margin-bottom:3px">${s}</li>`).join('')
    const growthList = d.growthAreas.map((g: string) => `<li style="margin-bottom:3px">${g}</li>`).join('')

    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`<html><head><title>Report Card — ${s.english_name}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:24px 30px;max-width:850px;margin:auto;color:#222;font-size:12px}
      .banner{background:#1e3a5f;color:white;text-align:center;padding:14px;font-size:24px;font-weight:700;border-radius:6px;font-family:Georgia,serif;margin-bottom:14px}
      table{border-collapse:collapse;width:100%}
      .section{margin-top:14px;border:2px solid #1e3a5f;border-radius:6px;overflow:hidden}
      .section-title{background:#1e3a5f;color:white;text-align:center;padding:6px;font-size:15px;font-weight:700;font-family:Georgia,serif}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:2px solid #1e3a5f}
      .info-left{padding:12px 16px}
      .info-right{padding:12px 16px;text-align:right;display:flex;flex-direction:column;align-items:flex-end;justify-content:center}
      .info-row{display:flex;gap:4px;margin-bottom:2px;font-size:12px}
      .info-label{font-weight:700;min-width:100px}
      .school-block{display:flex;align-items:center;gap:10px}
      .logo-circle{width:52px;height:52px;border-radius:50%;background:#f0f4f8;display:flex;align-items:center;justify-content:center;border:1px solid #ddd}
      .logo-circle img{width:36px;height:36px;object-fit:contain}
      .school-text{text-align:right}
      .school-name{font-weight:700;font-size:14px;color:#1e3a5f}
      .grades-table td,.grades-table th{padding:8px 10px;border:1px solid #999;text-align:center}
      .grades-table th{background:#f0f4f8;font-size:10px;font-weight:700}
      .grades-table .score{font-size:15px;font-weight:700}
      .grades-table .letter{font-size:13px;font-weight:600}
      .overall-cell{background:#e8eef6;font-weight:800;font-size:18px}
      .chart-area{display:flex;gap:16px;margin-top:14px;align-items:flex-start}
      .insights{margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .insight-box{border:1px solid #ddd;border-radius:6px;padding:10px 14px}
      .insight-title{font-weight:700;font-size:12px;margin-bottom:6px}
      .insight-list{font-size:11px;line-height:1.5;padding-left:16px;margin:0}
      .comment-section{border:2px solid #1e3a5f;border-radius:6px;overflow:hidden;margin-top:14px}
      .comment-title{background:#1e3a5f;color:white;text-align:center;padding:6px;font-size:15px;font-weight:700;font-family:Georgia,serif}
      .comment-body{padding:14px;min-height:80px;line-height:1.65;white-space:pre-wrap;font-size:12px}
      @media print{body{padding:12px 16px;font-size:11px}.banner{font-size:20px;padding:10px}}
    </style></head><body>
    <div class="banner">${d.semesterName} Report Card</div>
    <div style="text-align:center;font-weight:600;margin-bottom:6px;font-size:13px">Student Information</div>
    <div class="info-grid">
      <div class="info-left">
        <div class="info-row"><span class="info-label">Korean Name</span><span>${s.korean_name}</span></div>
        <div class="info-row"><span class="info-label">English Name</span><span>${s.english_name}</span></div>
        <div class="info-row"><span class="info-label">Grade</span><span>${s.grade}</span><span class="info-label" style="margin-left:24px">Team Manager</span><span>Victoria Park</span></div>
        <div class="info-row"><span class="info-label">Korean Class</span><span>${s.korean_class}</span><span class="info-label" style="margin-left:24px">Principal</span><span>Kwak Cheol Ok</span></div>
        <div class="info-row"><span class="info-label">Class Number</span><span>${s.class_number}</span></div>
        <div class="info-row"><span class="info-label">English Class</span><span>${s.english_class}</span></div>
        <div class="info-row"><span class="info-label">Teacher</span><span>${d.teacherName}</span></div>
      </div>
      <div class="info-right">
        <div class="school-block"><div class="school-text"><div class="school-name">Daewoo Elementary School</div><div style="font-size:12px">English Program</div><div style="font-size:11px;font-style:italic;color:#666">Growing together through English.</div></div><div class="logo-circle"><img src="/logo.png" onerror="this.parentElement.innerHTML='🏫'" /></div></div>
      </div>
    </div>
    <div class="section"><div class="section-title">${d.semesterName} Grades</div>
    <table class="grades-table"><thead><tr>
      ${DOMAINS.map((dom) => `<th style="width:17%">${DOMAIN_PRINT[dom]}</th>`).join('')}
      <th style="width:15%;background:#e8eef6">Overall<br>Grade</th>
    </tr></thead><tbody><tr>
      ${DOMAINS.map((dom) => `<td><div class="score">${d.domainGrades[dom] != null ? (d.domainGrades[dom] as number).toFixed(1) + '%' : '—'}</div><div class="letter" style="color:${d.domainGrades[dom] != null ? letterColor(getLetterGrade(d.domainGrades[dom] as number)) : '#999'}">${d.domainGrades[dom] != null ? getLetterGrade(d.domainGrades[dom] as number) : ''}</div></td>`).join('')}
      <td class="overall-cell"><div style="font-size:22px;color:#1e3a5f">${d.overallGrade != null ? d.overallGrade.toFixed(1) + '%' : '—'}</div><div style="font-size:16px;color:${d.overallGrade != null ? letterColor(d.overallLetter) : '#999'}">${d.overallLetter}</div></td>
    </tr></tbody></table></div>
    <div class="chart-area"><div style="flex:1">${radarSvg}</div><div><table style="width:auto;border-collapse:collapse"><thead><tr style="background:#f0f0f0"><th colspan="2" style="padding:4px 10px;border:1px solid #bbb;font-size:12px;font-weight:700">Grading Scale</th></tr></thead><tbody>${scaleRows}</tbody></table></div></div>
    <div class="insights"><div class="insight-box" style="border-color:#22c55e"><div class="insight-title" style="color:#15803d">✦ Strengths</div><ul class="insight-list">${strengthsList}</ul></div><div class="insight-box" style="border-color:#f59e0b"><div class="insight-title" style="color:#b45309">△ Areas for Growth</div><ul class="insight-list">${growthList}</ul></div></div>
    <div class="comment-section"><div class="comment-title">Teacher Comment</div><div class="comment-body">${comment || '<span style="color:#999;font-style:italic">No comment entered.</span>'}</div></div>
    </body></html>`)
    printWin.document.close()
    printWin.print()
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!data) return <div className="py-12 text-center text-text-tertiary">Could not load report data.</div>

  const d = data, s = d.student

  // In-app radar chart
  const inAppRadar = radarChartSVG(
    DOMAINS.map((dom) => d.domainGrades[dom]),
    DOMAINS.map((dom) => d.classAverages[dom]),
    ['Reading', 'Phonics &\nFoundational\nSkills', 'Writing', 'Speaking &\nListening', 'Language\nStandards'],
    s.english_name, selectedClass, 320
  )

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-2">
        <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt"><Printer size={15} /> Print Report Card</button>
      </div>

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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-[14px] text-navy">Daewoo Elementary School</p>
              <p className="text-[12px] text-text-secondary">English Program</p>
              <p className="text-[11px] text-text-tertiary italic">Growing together through English.</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-surface-alt border border-border flex items-center justify-center">
              <img src="/logo.png" alt="" className="w-10 h-10 object-contain" onError={(e: any) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          </div>
        </div>

        {/* Grades table */}
        <div className="px-6 py-4">
          <div className="border-2 border-navy rounded-lg overflow-hidden">
            <div className="bg-navy text-white text-center py-2 text-[14px] font-bold">{d.semesterName} Grades</div>
            <table className="w-full text-[12px]">
              <thead><tr className="bg-surface-alt">
                {DOMAINS.map((dom) => <th key={dom} className="px-2 py-2.5 border border-border text-center font-bold text-[10px]" style={{ whiteSpace: 'pre-wrap' }}>{DOMAIN_HEADERS[dom]}</th>)}
                <th className="px-2 py-2.5 border border-border text-center font-bold bg-accent-light text-[11px]">Overall<br/>Grade</th>
              </tr></thead>
              <tbody><tr>
                {DOMAINS.map((dom) => {
                  const val = d.domainGrades[dom]
                  const letter = val != null ? getLetterGrade(val) : '—'
                  return (
                    <td key={dom} className="px-2 py-3 border border-border text-center">
                      <div className="text-[16px] font-bold">{val != null ? `${val.toFixed(1)}%` : '—'}</div>
                      <div className="text-[13px] font-semibold" style={{ color: val != null ? letterColor(letter) : '#999' }}>{val != null ? letter : ''}</div>
                    </td>
                  )
                })}
                <td className="px-2 py-3 border border-border text-center bg-accent-light">
                  <div className="text-[22px] font-bold text-navy">{d.overallGrade != null ? `${d.overallGrade.toFixed(1)}%` : '—'}</div>
                  <div className="text-[16px] font-bold" style={{ color: letterColor(d.overallLetter) }}>{d.overallLetter}</div>
                </td>
              </tr></tbody>
            </table>
          </div>
        </div>

        {/* Radar chart + grading scale */}
        <div className="px-6 pb-4 flex gap-6 items-start">
          <div className="flex-1 flex justify-center" dangerouslySetInnerHTML={{ __html: inAppRadar }} />
          <div>
            <table className="text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead><tr className="bg-surface-alt"><th colSpan={2} className="px-3 py-1.5 border border-border font-bold text-[12px]">Grading Scale</th></tr></thead>
              <tbody>
                {SCALE_DISPLAY.map((r: any) => (
                  <tr key={r.letter}><td className="px-3 py-1 border border-border font-semibold text-center">{r.letter}</td><td className="px-3 py-1 border border-border text-center">{r.range}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strengths & Growth */}
        <div className="px-6 pb-4 grid grid-cols-2 gap-4">
          <div className="border border-green-300 rounded-lg p-4 bg-green-50/50">
            <p className="text-[12px] font-bold text-green-800 mb-2">✦ Strengths</p>
            <ul className="text-[12px] text-text-primary space-y-1 list-disc pl-4">
              {d.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="border border-amber-300 rounded-lg p-4 bg-amber-50/50">
            <p className="text-[12px] font-bold text-amber-800 mb-2">△ Areas for Growth</p>
            <ul className="text-[12px] text-text-primary space-y-1 list-disc pl-4">
              {d.growthAreas.map((g: string, i: number) => <li key={i}>{g}</li>)}
            </ul>
          </div>
        </div>

        {/* Comment */}
        <div className="px-6 pb-6">
          <div className="border-2 border-navy rounded-lg overflow-hidden">
            <div className="bg-navy text-white text-center py-2 text-[14px] font-bold">Teacher Comment</div>
            <div className="p-4">
              <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={5}
                placeholder="Write comments about this student's progress, strengths, and areas for growth..."
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
        return { student: s, domainAvgs, overall, letter: overall != null ? getLetterGrade(overall) : '—' }
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
       ${DOMAINS.map((d) => `<td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:600">${s.domainAvgs[d] != null ? s.domainAvgs[d].toFixed(1) : '—'}</td>`).join('')}
       <td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:700">${s.overall != null ? s.overall.toFixed(1) : '—'}</td>
       <td style="padding:5px 8px;border:1px solid #bbb;text-align:center;font-weight:700;color:${s.letter !== '—' ? letterColor(s.letter) : '#999'}">${s.letter}</td></tr>`
    ).join('')
    const pw = window.open('', '_blank'); if (!pw) return
    pw.document.write(`<html><head><title>Class Summary</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#f0f0f0;padding:6px 8px;border:1px solid #bbb;font-size:10px}</style></head><body>
    <h2 style="color:#1e3a5f">${selectedClass} — Grade ${selectedGrade} · Class Summary</h2><p style="color:#666">${summaries.length} students</p>
    <table><thead><tr><th>#</th><th>Student</th>${DOMAINS.map((d) => `<th>${DOMAIN_PRINT[d]}</th>`).join('')}<th>Overall</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    pw.document.close(); pw.print()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  // Class averages
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
              <p className="text-lg font-bold text-navy">{classAvgs[d] > 0 ? `${classAvgs[d]}%` : '—'}</p>
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
                    {s.domainAvgs[d] != null ? <span className={`font-semibold ${s.domainAvgs[d] >= 90 ? 'text-green-600' : s.domainAvgs[d] >= 80 ? 'text-blue-600' : s.domainAvgs[d] >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.domainAvgs[d].toFixed(1)}</span> : <span className="text-text-tertiary">—</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-navy">{s.overall != null ? s.overall.toFixed(1) : '—'}</td>
                <td className="px-4 py-2.5 text-center font-bold text-[15px]" style={{ color: s.letter !== '—' ? letterColor(s.letter) : '#999' }}>{s.letter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
