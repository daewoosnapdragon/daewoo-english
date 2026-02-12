'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useSemesters } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { FileText, Loader2, Printer, ChevronDown, ChevronRight, Save, Users, User } from 'lucide-react'

type LangKey = 'en' | 'ko'

const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language'] as const
const DOMAIN_LABELS: Record<string, { en: string; ko: string }> = {
  reading: { en: 'Reading', ko: '읽기' },
  phonics: { en: 'Phonics', ko: '파닉스' },
  writing: { en: 'Writing', ko: '쓰기' },
  speaking: { en: 'Speaking', ko: '말하기' },
  language: { en: 'Language', ko: '언어' },
}

interface DomainGrade {
  domain: string; average: number; letterGrade: string; assessmentCount: number
}
interface ReportData {
  student: any; domainGrades: DomainGrade[]; overallAvg: number; overallLetter: string
  attendance: { present: number; absent: number; tardy: number; total: number }
  behaviorSummary: { positive: number; concern: number; negative: number; total: number }
  readingFluency: { cwpm: number; accuracy: number; passageLevel: string; date: string } | null
  comment: string
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
  const [gradingScale, setGradingScale] = useState<any[]>([])

  const isTeacher = currentTeacher?.role === 'teacher'
  const availableClasses = isTeacher && currentTeacher?.english_class !== 'Admin'
    ? [currentTeacher.english_class as EnglishClass] : ENGLISH_CLASSES
  const { students } = useStudents({ grade: selectedGrade, english_class: selectedClass })

  // Set default semester
  useEffect(() => {
    if (semesters.length > 0 && !selectedSemesterId) {
      const active = semesters.find((s: any) => s.is_active)
      setSelectedSemesterId(active?.id || semesters[0].id)
    }
  }, [semesters, selectedSemesterId])

  // Load grading scale
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('school_settings').select('grading_scale').limit(1).single()
      if (data?.grading_scale) setGradingScale(data.grading_scale)
    })()
  }, [])

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.reports.title}</h2>
        <p className="text-text-secondary text-sm mt-1">Generate progress reports and report cards</p>
        <div className="flex gap-1 mt-4">
          <button onClick={() => setMode('individual')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'individual' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <User size={14} /> Individual Report
          </button>
          <button onClick={() => setMode('class')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${mode === 'class' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <Users size={14} /> Class Summary
          </button>
        </div>
      </div>

      <div className="px-10 py-6">
        {/* Controls */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {semesters.length > 0 && (
            <select value={selectedSemesterId || ''} onChange={(e: any) => setSelectedSemesterId(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
              {semesters.map((sem: any) => <option key={sem.id} value={sem.id}>{lang === 'ko' ? sem.name_ko || sem.name : sem.name}</option>)}
            </select>
          )}
          <select value={selectedGrade} onChange={(e: any) => setSelectedGrade(Number(e.target.value) as Grade)}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map((g: any) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          <div className="flex gap-1">
            {availableClasses.map((cls: any) => (
              <button key={cls} onClick={() => setSelectedClass(cls)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${selectedClass === cls ? 'text-white shadow-sm' : 'hover:opacity-80'}`}
                style={{ backgroundColor: selectedClass === cls ? classToTextColor(cls) : classToColor(cls), color: selectedClass === cls ? 'white' : classToTextColor(cls) }}>
                {cls}
              </button>
            ))}
          </div>
          {mode === 'individual' && students.length > 0 && (
            <>
              <div className="w-px h-6 bg-border" />
              <select value={selectedStudentId || ''} onChange={(e: any) => setSelectedStudentId(e.target.value || null)}
                className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy min-w-[200px]">
                <option value="">Select student...</option>
                {students.map((s: any) => <option key={s.id} value={s.id}>{s.english_name} ({s.korean_name})</option>)}
              </select>
            </>
          )}
        </div>

        {mode === 'individual' && selectedStudentId && selectedSemesterId && (
          <IndividualReport studentId={selectedStudentId} semesterId={selectedSemesterId} students={students} gradingScale={gradingScale} lang={lang} />
        )}
        {mode === 'individual' && !selectedStudentId && (
          <div className="bg-surface border border-border rounded-xl p-12 text-center text-text-tertiary">Select a student to generate their report.</div>
        )}
        {mode === 'class' && selectedSemesterId && (
          <ClassSummary students={students} semesterId={selectedSemesterId} gradingScale={gradingScale} lang={lang} selectedClass={selectedClass} selectedGrade={selectedGrade} />
        )}
      </div>
    </div>
  )
}

// ─── Helper: Get Letter Grade ───────────────────────────────────────

function getLetterGrade(score: number, scale: any[]): string {
  if (!scale || scale.length === 0) return ''
  for (const tier of scale) {
    if (score >= tier.min && score <= tier.max) return tier.letter
  }
  return scale[scale.length - 1]?.letter || 'E'
}

function letterColor(letter: string): string {
  if (letter.startsWith('A')) return 'text-green-700'
  if (letter.startsWith('B')) return 'text-blue-700'
  if (letter.startsWith('C')) return 'text-amber-700'
  if (letter.startsWith('D')) return 'text-orange-700'
  return 'text-red-700'
}

// ─── Individual Report ──────────────────────────────────────────────

function IndividualReport({ studentId, semesterId, students, gradingScale, lang }: {
  studentId: string; semesterId: string; students: any[]; gradingScale: any[]; lang: LangKey
}) {
  const { showToast, currentTeacher } = useApp()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    const student = students.find((s: any) => s.id === studentId)
    if (!student) { setLoading(false); return }

    // 1. Get assessments + grades for this semester
    const { data: assessments } = await supabase.from('assessments').select('*')
      .eq('semester_id', semesterId).eq('grade', student.grade)
    const { data: grades } = await supabase.from('grades').select('*, assessments(domain, max_score)')
      .eq('student_id', studentId)

    // Calculate domain averages
    const domainGrades: DomainGrade[] = DOMAINS.map((domain) => {
      const domainAssessments = (assessments || []).filter((a: any) => a.domain === domain)
      const domainScores = domainAssessments.map((a: any) => {
        const grade = (grades || []).find((g: any) => g.assessment_id === a.id)
        if (!grade || grade.score == null || grade.is_exempt) return null
        return (grade.score / a.max_score) * 100
      }).filter((s: any) => s !== null) as number[]
      const average = domainScores.length > 0 ? domainScores.reduce((a: number, b: number) => a + b, 0) / domainScores.length : 0
      return { domain, average: Math.round(average * 10) / 10, letterGrade: domainScores.length > 0 ? getLetterGrade(average, gradingScale) : '—', assessmentCount: domainScores.length }
    })

    const scoredDomains = domainGrades.filter((d) => d.assessmentCount > 0)
    const overallAvg = scoredDomains.length > 0 ? scoredDomains.reduce((a: number, d) => a + d.average, 0) / scoredDomains.length : 0
    const overallLetter = scoredDomains.length > 0 ? getLetterGrade(overallAvg, gradingScale) : '—'

    // 2. Attendance
    const { data: attendanceData } = await supabase.from('attendance').select('status').eq('student_id', studentId)
    const attendance = {
      present: (attendanceData || []).filter((a: any) => a.status === 'present').length,
      absent: (attendanceData || []).filter((a: any) => a.status === 'absent').length,
      tardy: (attendanceData || []).filter((a: any) => a.status === 'tardy').length,
      total: (attendanceData || []).length,
    }

    // 3. Behavior summary
    const { data: behaviorData } = await supabase.from('behavior_logs').select('type').eq('student_id', studentId)
    const behaviorSummary = {
      positive: (behaviorData || []).filter((b: any) => b.type === 'positive').length,
      concern: (behaviorData || []).filter((b: any) => b.type === 'concern').length,
      negative: (behaviorData || []).filter((b: any) => b.type === 'abc' || b.type === 'negative').length,
      total: (behaviorData || []).length,
    }

    // 4. Reading fluency (latest)
    const { data: readingData } = await supabase.from('reading_assessments').select('*')
      .eq('student_id', studentId).order('date', { ascending: false }).limit(1)
    const readingFluency = readingData && readingData[0] ? {
      cwpm: Math.round(readingData[0].cwpm || 0),
      accuracy: readingData[0].accuracy_rate || 0,
      passageLevel: readingData[0].passage_level || '',
      date: readingData[0].date,
    } : null

    // 5. Teacher comment
    const { data: commentData } = await supabase.from('comments').select('text')
      .eq('student_id', studentId).eq('semester_id', semesterId).limit(1).single()
    const commentText = commentData?.text || ''

    setReport({ student, domainGrades, overallAvg: Math.round(overallAvg * 10) / 10, overallLetter, attendance, behaviorSummary, readingFluency, comment: commentText })
    setComment(commentText)
    setLoading(false)
  }, [studentId, semesterId, students, gradingScale])

  useEffect(() => { loadReport() }, [loadReport])

  const saveComment = async () => {
    setSavingComment(true)
    const { error } = await supabase.from('comments').upsert({
      student_id: studentId, semester_id: semesterId, text: comment.trim(),
      created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,semester_id' })
    setSavingComment(false)
    if (error) showToast(`Error: ${error.message}`)
    else showToast('Comment saved')
  }

  const handlePrint = () => {
    if (!report) return
    const r = report
    const domainRows = r.domainGrades.map((d) =>
      `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:500">${DOMAIN_LABELS[d.domain]?.en || d.domain}</td>
       <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:700;font-size:18px">${d.assessmentCount > 0 ? d.average.toFixed(1) + '%' : '—'}</td>
       <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:700;font-size:18px">${d.letterGrade}</td>
       <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;color:#999">${d.assessmentCount} assessments</td></tr>`
    ).join('')

    const printWin = window.open('', '_blank')
    if (!printWin) return
    printWin.document.write(`<html><head><title>Report Card — ${r.student.english_name}</title>
    <style>body{font-family:sans-serif;padding:30px;max-width:800px;margin:auto}table{border-collapse:collapse;width:100%}h1{margin-bottom:0}h2{color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px;margin-top:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:12px}.box{border:1px solid #ddd;border-radius:8px;padding:12px}.label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px}.value{font-size:20px;font-weight:700;color:#1e3a5f}@media print{body{padding:15px}}</style></head><body>
    <div style="text-align:center;margin-bottom:20px"><h1 style="color:#1e3a5f">Progress Report</h1><p style="color:#666">Daewoo Elementary School English Program</p></div>
    <div class="grid"><div class="box"><div class="label">Student</div><div class="value">${r.student.english_name}</div><div style="color:#666">${r.student.korean_name} · Grade ${r.student.grade}</div></div>
    <div class="box"><div class="label">Overall Grade</div><div class="value" style="font-size:32px">${r.overallLetter}</div><div style="color:#666">${r.overallAvg}%</div></div></div>
    <h2>Academic Performance</h2>
    <table><thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;border:1px solid #ddd;text-align:left">Domain</th><th style="padding:8px 12px;border:1px solid #ddd;text-align:center">Score</th><th style="padding:8px 12px;border:1px solid #ddd;text-align:center">Grade</th><th style="padding:8px 12px;border:1px solid #ddd;text-align:center">Based On</th></tr></thead><tbody>${domainRows}
    <tr style="background:#f0f4f8;font-weight:700"><td style="padding:8px 12px;border:1px solid #ddd">Overall</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-size:18px">${r.overallAvg}%</td><td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-size:18px">${r.overallLetter}</td><td style="padding:8px 12px;border:1px solid #ddd"></td></tr></tbody></table>
    <h2>Attendance</h2><div class="grid"><div class="box"><div class="label">Present</div><div class="value">${r.attendance.present}</div></div><div class="box"><div class="label">Absent</div><div class="value" style="color:#dc2626">${r.attendance.absent}</div></div><div class="box"><div class="label">Tardy</div><div class="value" style="color:#f59e0b">${r.attendance.tardy}</div></div><div class="box"><div class="label">Days Recorded</div><div class="value">${r.attendance.total}</div></div></div>
    ${r.readingFluency ? `<h2>Reading Fluency</h2><div class="grid"><div class="box"><div class="label">CWPM</div><div class="value">${r.readingFluency.cwpm}</div></div><div class="box"><div class="label">Accuracy</div><div class="value">${r.readingFluency.accuracy.toFixed(1)}%</div></div><div class="box"><div class="label">Passage Level</div><div class="value">${r.readingFluency.passageLevel || '—'}</div></div><div class="box"><div class="label">Assessed</div><div class="value" style="font-size:14px">${new Date(r.readingFluency.date).toLocaleDateString()}</div></div></div>` : ''}
    ${comment ? `<h2>Teacher Comments</h2><p style="line-height:1.6;white-space:pre-wrap">${comment}</p>` : ''}
    <div style="margin-top:40px;border-top:1px solid #ddd;padding-top:12px;color:#999;font-size:11px;text-align:center">Generated ${new Date().toLocaleDateString()} · Daewoo Elementary School English Program</div>
    </body></html>`)
    printWin.document.close()
    printWin.print()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!report) return <div className="py-12 text-center text-text-tertiary">Could not load report data.</div>

  const r = report

  return (
    <div className="space-y-6">
      {/* Print button */}
      <div className="flex justify-end">
        <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-surface-alt">
          <Printer size={15} /> Print Report Card
        </button>
      </div>

      {/* Student header + overall grade */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-5 bg-accent-light border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold text-navy">{r.student.english_name} <span className="text-text-tertiary font-normal text-[16px]">{r.student.korean_name}</span></h3>
            <p className="text-[12px] text-text-secondary mt-0.5">Grade {r.student.grade} · {r.student.english_class} · #{r.student.class_number}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Overall</p>
            <p className={`font-display text-4xl font-bold ${letterColor(r.overallLetter)}`}>{r.overallLetter}</p>
            <p className="text-[13px] text-text-secondary font-semibold">{r.overallAvg}%</p>
          </div>
        </div>

        {/* Domain grades */}
        <div className="p-6">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Academic Performance by Domain</h4>
          <div className="space-y-2">
            {r.domainGrades.map((d) => (
              <div key={d.domain} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                <span className="w-24 text-[13px] font-medium capitalize">{DOMAIN_LABELS[d.domain]?.en || d.domain}</span>
                <div className="flex-1">
                  <div className="h-5 bg-surface-alt rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(d.average, 100)}%`,
                      backgroundColor: d.average >= 90 ? '#22C55E' : d.average >= 80 ? '#3B82F6' : d.average >= 70 ? '#F59E0B' : '#EF4444'
                    }} />
                  </div>
                </div>
                <span className="w-14 text-right text-[13px] font-semibold">{d.assessmentCount > 0 ? `${d.average}%` : '—'}</span>
                <span className={`w-8 text-right text-[15px] font-bold ${letterColor(d.letterGrade)}`}>{d.letterGrade}</span>
                <span className="w-20 text-right text-[10px] text-text-tertiary">{d.assessmentCount} assessed</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Attendance */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Attendance</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-[10px] text-text-tertiary">Present</span><p className="text-xl font-bold text-green-600">{r.attendance.present}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Absent</span><p className="text-xl font-bold text-red-600">{r.attendance.absent}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Tardy</span><p className="text-xl font-bold text-amber-600">{r.attendance.tardy}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Total Days</span><p className="text-xl font-bold text-navy">{r.attendance.total}</p></div>
          </div>
        </div>

        {/* Behavior */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Behavior Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><span className="text-[10px] text-text-tertiary">Positive</span><p className="text-xl font-bold text-green-600">{r.behaviorSummary.positive}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Concerns</span><p className="text-xl font-bold text-amber-600">{r.behaviorSummary.concern}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Negative</span><p className="text-xl font-bold text-red-600">{r.behaviorSummary.negative}</p></div>
            <div><span className="text-[10px] text-text-tertiary">Total Entries</span><p className="text-xl font-bold text-navy">{r.behaviorSummary.total}</p></div>
          </div>
        </div>

        {/* Reading Fluency */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-3">Reading Fluency</h4>
          {r.readingFluency ? (
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-[10px] text-text-tertiary">CWPM</span><p className="text-xl font-bold text-navy">{r.readingFluency.cwpm}</p></div>
              <div><span className="text-[10px] text-text-tertiary">Accuracy</span><p className={`text-xl font-bold ${r.readingFluency.accuracy >= 95 ? 'text-green-600' : r.readingFluency.accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{r.readingFluency.accuracy.toFixed(1)}%</p></div>
              <div><span className="text-[10px] text-text-tertiary">Passage Level</span><p className="text-sm font-semibold">{r.readingFluency.passageLevel || '—'}</p></div>
              <div><span className="text-[10px] text-text-tertiary">Last Assessed</span><p className="text-sm font-semibold">{new Date(r.readingFluency.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
            </div>
          ) : (
            <p className="text-text-tertiary text-sm">No reading data yet.</p>
          )}
        </div>
      </div>

      {/* Teacher comment */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Teacher Comments</h4>
          <button onClick={saveComment} disabled={savingComment}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {savingComment ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Comment
          </button>
        </div>
        <textarea value={comment} onChange={(e: any) => setComment(e.target.value)} rows={4}
          placeholder="Write overall comments about this student's progress, strengths, and areas for growth..."
          className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none leading-relaxed" />
      </div>
    </div>
  )
}

// ─── Class Summary ──────────────────────────────────────────────────

function ClassSummary({ students, semesterId, gradingScale, lang, selectedClass, selectedGrade }: {
  students: any[]; semesterId: string; gradingScale: any[]; lang: LangKey; selectedClass: string; selectedGrade: number
}) {
  const [summaries, setSummaries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (students.length === 0) { setLoading(false); return }
    ;(async () => {
      setLoading(true)
      // Load all assessments for this semester/grade
      const { data: assessments } = await supabase.from('assessments').select('*')
        .eq('semester_id', semesterId).eq('grade', selectedGrade)
      // Load all grades for these students
      const { data: allGrades } = await supabase.from('grades').select('*')
        .in('student_id', students.map((s: any) => s.id))

      const results = students.map((s: any) => {
        const domainAvgs: Record<string, number> = {}
        let totalSum = 0, totalCount = 0
        DOMAINS.forEach((domain) => {
          const domainAssessments = (assessments || []).filter((a: any) => a.domain === domain)
          const scores = domainAssessments.map((a: any) => {
            const g = (allGrades || []).find((gr: any) => gr.assessment_id === a.id && gr.student_id === s.id)
            if (!g || g.score == null || g.is_exempt) return null
            return (g.score / a.max_score) * 100
          }).filter((x: any) => x !== null) as number[]
          if (scores.length > 0) {
            const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            domainAvgs[domain] = Math.round(avg * 10) / 10
            totalSum += avg; totalCount++
          }
        })
        const overall = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0
        return { student: s, domainAvgs, overall, letter: totalCount > 0 ? getLetterGrade(overall, gradingScale) : '—' }
      })

      results.sort((a: any, b: any) => b.overall - a.overall)
      setSummaries(results)
      setLoading(false)
    })()
  }, [students, semesterId, selectedGrade, gradingScale])

  const handlePrint = () => {
    const printWin = window.open('', '_blank')
    if (!printWin) return
    const rows = summaries.map((s: any, i: number) =>
      `<tr><td style="padding:6px 8px;border:1px solid #ddd">${i + 1}</td>
       <td style="padding:6px 8px;border:1px solid #ddd">${s.student.english_name} (${s.student.korean_name})</td>
       ${DOMAINS.map((d) => `<td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${s.domainAvgs[d] != null ? s.domainAvgs[d].toFixed(1) : '—'}</td>`).join('')}
       <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:700">${s.overall || '—'}</td>
       <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:700">${s.letter}</td></tr>`
    ).join('')
    printWin.document.write(`<html><head><title>Class Summary — ${selectedClass} Gr ${selectedGrade}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:11px}th{background:#f0f0f0;padding:6px 8px;border:1px solid #ddd}</style></head><body>
    <h2>${selectedClass} — Grade ${selectedGrade} Class Summary</h2><p style="color:#666">${summaries.length} students · Printed ${new Date().toLocaleDateString()}</p>
    <table><thead><tr><th>#</th><th>Student</th>${DOMAINS.map((d) => `<th>${d.charAt(0).toUpperCase() + d.slice(1)}</th>`).join('')}<th>Overall</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    printWin.document.close()
    printWin.print()
  }

  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>

  // Class averages
  const classAvgs: Record<string, number> = {}
  DOMAINS.forEach((d) => {
    const vals = summaries.filter((s: any) => s.domainAvgs[d] != null).map((s: any) => s.domainAvgs[d])
    classAvgs[d] = vals.length > 0 ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length * 10) / 10 : 0
  })
  const classOverall = summaries.filter((s: any) => s.overall > 0)
  const classOverallAvg = classOverall.length > 0 ? Math.round(classOverall.reduce((a: number, s: any) => a + s.overall, 0) / classOverall.length * 10) / 10 : 0

  return (
    <div className="space-y-4">
      {/* Class averages */}
      <div className="bg-accent-light border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Class Averages — {selectedClass} Grade {selectedGrade}</h4>
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-border hover:bg-surface-alt">
            <Printer size={13} /> Print
          </button>
        </div>
        <div className="flex gap-4">
          {DOMAINS.map((d) => (
            <div key={d} className="text-center flex-1">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold capitalize">{d}</p>
              <p className="text-xl font-bold text-navy">{classAvgs[d] > 0 ? `${classAvgs[d]}%` : '—'}</p>
            </div>
          ))}
          <div className="text-center flex-1 border-l border-border pl-4">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Overall</p>
            <p className="text-xl font-bold text-navy">{classOverallAvg > 0 ? `${classOverallAvg}%` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Student table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
            <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">Student</th>
            {DOMAINS.map((d) => <th key={d} className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold capitalize">{d}</th>)}
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
                    {s.domainAvgs[d] != null ? (
                      <span className={`font-semibold ${s.domainAvgs[d] >= 90 ? 'text-green-600' : s.domainAvgs[d] >= 80 ? 'text-blue-600' : s.domainAvgs[d] >= 70 ? 'text-amber-600' : 'text-red-600'}`}>{s.domainAvgs[d]}</span>
                    ) : <span className="text-text-tertiary">—</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-center font-bold text-navy">{s.overall > 0 ? s.overall : '—'}</td>
                <td className={`px-4 py-2.5 text-center font-bold text-[15px] ${letterColor(s.letter)}`}>{s.letter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
