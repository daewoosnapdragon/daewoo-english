'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Loader2, CheckCircle2, AlertCircle, Clock, Users, BookOpen, FileText, ClipboardCheck, MessageSquare } from 'lucide-react'

interface CheckItem {
  label: string
  detail: string
  done: number
  total: number
  icon: any
  students?: { name: string; done: boolean }[]
}

export default function SemesterChecklistView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class as EnglishClass : null
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Lily')
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CheckItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const cls = selectedClass

      // Get students for this class
      const { data: students } = await supabase.from('students').select('id, english_name, korean_name').eq('english_class', cls).eq('is_active', true).order('english_name')
      if (!students || students.length === 0) { setItems([]); setLoading(false); return }
      const ids = students.map(s => s.id)
      const total = students.length

      // 1. Reading assessments
      const { data: readings } = await supabase.from('reading_assessments').select('student_id').in('student_id', ids).not('cwpm', 'is', null)
      const readingStudents = new Set((readings || []).map(r => r.student_id))

      // 2. WIDA profiles
      const { data: wida } = await supabase.from('wida_profiles').select('student_id').in('student_id', ids)
      const widaStudents = new Set((wida || []).map(w => w.student_id))

      // 3. Grades entered (at least 1 grade per student)
      const { data: grades } = await supabase.from('grades').select('student_id').in('student_id', ids).not('score', 'is', null)
      const gradeStudents = new Set((grades || []).map(g => g.student_id))

      // 4. Report card comments
      const { data: comments } = await supabase.from('report_card_comments').select('student_id').in('student_id', ids)
      const commentStudents = new Set((comments || []).map(c => c.student_id))

      // 5. Goals set
      const { data: goals } = await supabase.from('student_goals').select('student_id').in('student_id', ids).eq('is_active', true)
      const goalStudents = new Set((goals || []).map(g => g.student_id))

      // 6. Behavior logs (at least 1)
      const { data: behavior } = await supabase.from('behavior_logs').select('student_id').in('student_id', ids)
      const behaviorStudents = new Set((behavior || []).map(b => b.student_id))

      const makeStudentList = (doneSet: Set<string>) =>
        students.map(s => ({ name: `${s.english_name} (${s.korean_name})`, done: doneSet.has(s.id) }))

      setItems([
        { label: 'Reading Assessments (ORF)', detail: 'At least one oral reading fluency assessment per student', done: readingStudents.size, total, icon: BookOpen, students: makeStudentList(readingStudents) },
        { label: 'WIDA Profiles', detail: 'WIDA language proficiency levels entered for all students', done: widaStudents.size, total, icon: Users, students: makeStudentList(widaStudents) },
        { label: 'Grades Entered', detail: 'At least one graded assessment per student', done: gradeStudents.size, total, icon: ClipboardCheck, students: makeStudentList(gradeStudents) },
        { label: 'Report Card Comments', detail: 'Written comments for each student', done: commentStudents.size, total, icon: FileText, students: makeStudentList(commentStudents) },
        { label: 'Student Goals', detail: 'At least one active learning goal per student', done: goalStudents.size, total, icon: MessageSquare, students: makeStudentList(goalStudents) },
        { label: 'Behavior Documentation', detail: 'At least one behavior log entry per student', done: behaviorStudents.size, total, icon: AlertCircle, students: makeStudentList(behaviorStudents) },
      ])
      setLoading(false)
    })()
  }, [selectedClass])

  const overallDone = items.reduce((s, i) => s + i.done, 0)
  const overallTotal = items.reduce((s, i) => s + i.total, 0)
  const overallPct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-10 py-6">
        <h1 className="font-display text-2xl font-bold text-navy">{ko ? '학기 체크리스트' : 'Semester Checklist'}</h1>
        <p className="text-[13px] text-text-secondary mt-1">{ko ? '데이터 기반 자동 확인 -- 실제 데이터에서 완료 상태를 확인합니다.' : 'Data-driven auto-verification -- completion status pulled from actual data.'}</p>
      </div>

      <div className="px-10 py-6">
        {/* Class selector */}
        <div className="flex gap-1 mb-5">
          {ENGLISH_CLASSES.map(cls => (
            <button key={cls} onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${selectedClass === cls ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
              style={selectedClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
              {cls}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
        ) : (
          <>
            {/* Overall progress */}
            <div className="bg-surface border border-border rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-bold text-navy">Overall Completion</span>
                <span className={`text-[20px] font-bold ${overallPct >= 80 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{overallPct}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${overallPct >= 80 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${overallPct}%` }} />
              </div>
            </div>

            {/* Individual items */}
            <div className="space-y-3">
              {items.map(item => {
                const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0
                const complete = item.done === item.total
                const isExp = expanded === item.label
                const Icon = item.icon
                return (
                  <div key={item.label} className="bg-surface border border-border rounded-xl overflow-hidden">
                    <button onClick={() => setExpanded(isExp ? null : item.label)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-alt/30">
                      {complete ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" /> : <Clock size={20} className="text-amber-500 flex-shrink-0" />}
                      <Icon size={16} className="text-text-tertiary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[13px] font-semibold text-navy">{item.label}</span>
                        <p className="text-[10px] text-text-tertiary">{item.detail}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[14px] font-bold ${complete ? 'text-green-600' : 'text-amber-600'}`}>{item.done}/{item.total}</span>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full ${complete ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                    {isExp && item.students && (
                      <div className="border-t border-border px-5 py-3 bg-surface-alt/30 grid grid-cols-2 gap-1">
                        {item.students.map(s => (
                          <div key={s.name} className="flex items-center gap-1.5 text-[11px]">
                            {s.done
                              ? <CheckCircle2 size={12} className="text-green-500" />
                              : <AlertCircle size={12} className="text-red-400" />
                            }
                            <span className={s.done ? 'text-text-tertiary' : 'text-text-primary font-medium'}>{s.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
