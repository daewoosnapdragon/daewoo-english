'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { useStudentActions } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ALL_ENGLISH_CLASSES, GRADES, KOREAN_CLASSES, type Student, type EnglishClass, type Grade, type KoreanClass } from '@/types'
import { getKSTDateString, percentToLetter } from '@/lib/utils'
import WIDABadge from '@/components/shared/WIDABadge'
import BehaviorTracker from '@/components/behavior/BehaviorTracker'
import {
  AboutTab, AcademicHistoryTab, ReadingTabInModal, AttendanceTabInModal, StandardsMasteryTab,
  ScaffoldsTab, StudentGroupsTab, GoalsTab, WIDAPerformanceInsight, ClassTransferHistory, buildStudentPDFHtml, TEACHER_MAP,
} from './StudentsView'
import { ArrowLeft, Loader2, Pencil, Printer, Trash2 } from 'lucide-react'
import { LineChart, Bars, Sparkline } from '@/components/charts'
import { DOMAINS, DOMAIN_LABELS } from '@/types'
import { calculateWeightedAverage, domainLabel } from '@/lib/utils'
import { CWPM_BENCHMARKS } from '@/components/reading/ReadingLevelsView'

// ─── Student page ────────────────────────────────────────────────
// One address per student, /students/<id>. A rail on the left holds the
// facts you always want and a section list that follows the scroll; the body
// is every section in order of how often teachers look at it. No tabs.

const CLASS_BG: Record<string, string> = {
  Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy',
  Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon',
}

interface Facts {
  overall: number | null; attendanceRate: number | null; absences: number; tardies: number
  cwpm: number | null; readingLevel: string | null; readingDate: string | null
  placement: string | null; placementTest: string | null; behavior30: number
}

export default function StudentPage({ studentId }: { studentId: string }) {
  const { language: lang, currentTeacher, showToast, confirmDialog, activeSemester } = useApp()
  const { updateStudent } = useStudentActions()
  const router = useRouter()
  const [student, setStudent] = useState<Student | null>(null)
  const [missing, setMissing] = useState(false)
  const [facts, setFacts] = useState<Facts | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [active, setActive] = useState('behavior')

  const load = async () => {
    const { data } = await supabase.from('students').select('*, teachers ( name )').eq('id', studentId).single()
    if (!data) { setMissing(true); return }
    setStudent({ ...(data as any), teacher_name: (data as any).teachers?.name || '' })
  }
  useEffect(() => { load() }, [studentId])

  // The rail's facts: one round of queries, scoped to the active semester where it makes sense.
  useEffect(() => {
    if (!student) return
    let cancelled = false
    ;(async () => {
      const today = getKSTDateString()
      const semStart = activeSemester?.start_date || `${new Date().getFullYear()}-01-01`
      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const [sg, att, rd, pl, beh] = await Promise.all([
        activeSemester ? supabase.from('semester_grades').select('calculated_grade, final_grade').eq('student_id', student.id).eq('semester_id', activeSemester.id).eq('domain', 'overall').maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('attendance').select('status').eq('student_id', student.id).gte('date', semStart).lte('date', today),
        supabase.from('reading_assessments').select('cwpm, reading_level, date').eq('student_id', student.id).order('date', { ascending: false }).limit(1),
        supabase.from('level_test_placements').select('final_placement, level_tests ( name )').eq('student_id', student.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('student_id', student.id).gte('date', thirtyAgo),
      ])
      if (cancelled) return
      const rows = (att.data || []) as { status: string }[]
      const present = rows.filter(r => r.status === 'present').length, tardy = rows.filter(r => r.status === 'tardy').length, absent = rows.filter(r => r.status === 'absent').length
      const g: any = (sg as any).data
      const r: any = rd.data?.[0]
      const p: any = pl.data?.[0]
      setFacts({
        overall: g ? (g.final_grade ?? g.calculated_grade ?? null) : null,
        attendanceRate: rows.length ? Math.round(((present + tardy) / rows.length) * 100) : null, absences: absent, tardies: tardy,
        cwpm: r?.cwpm ?? null, readingLevel: r?.reading_level ?? null, readingDate: r?.date ?? null,
        placement: p?.final_placement ?? null, placementTest: p?.level_tests?.name ?? null,
        behavior30: (beh as any).count || 0,
      })
    })()
    return () => { cancelled = true }
  }, [student?.id, activeSemester?.id])

  // Section list follows the scroll.
  const sectionIds = ['behavior', 'grades', 'reading', 'attendance', 'standards', 'leveltests', 'support', 'notes']
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (vis[0]) setActive(vis[0].target.id.replace('sec-', ''))
    }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 })
    sectionIds.forEach(id => { const el = document.getElementById(`sec-${id}`); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [student?.id])

  const startEdit = () => {
    if (!student) return
    setForm({ english_name: student.english_name, korean_name: student.korean_name, grade: student.grade, korean_class: student.korean_class, class_number: student.class_number, english_class: student.english_class, is_transfer: (student as any).is_transfer || false, transfer_date: (student as any).transfer_date || '' })
    setEditing(true)
  }
  const saveEdit = async () => {
    if (!student) return
    setSaving(true)
    const updates: any = { ...form, teacher_id: TEACHER_MAP[form.english_class] || null, transfer_date: form.is_transfer ? (form.transfer_date || null) : null }
    const { error } = await updateStudent(student.id, updates)
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(lang === 'ko' ? '저장되었습니다' : 'Student updated'); setEditing(false); load()
  }
  const exportPDF = async () => {
    if (!student) return
    showToast(lang === 'ko' ? '포트폴리오 생성 중…' : 'Generating student portfolio…')
    const [grades, semGrades, reading, behavior, attendance, comments, scaffolds, goals, assessments] = await Promise.all([
      supabase.from('grades').select('*, assessments(name, domain, date, max_score, standards, sections)').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('semester_grades').select('*, semesters(name, type, academic_year)').eq('student_id', student.id),
      supabase.from('reading_assessments').select('*').eq('student_id', student.id).order('date', { ascending: true }),
      supabase.from('behavior_logs').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(100),
      supabase.from('attendance').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(200),
      supabase.from('comments').select('*, semesters(name, type, academic_year)').eq('student_id', student.id).eq('report_type', 'report_card'),
      supabase.from('student_scaffolds').select('domain, scaffold_text, effectiveness').eq('student_id', student.id).eq('is_active', true),
      supabase.from('student_goals').select('goal_text, goal_type, completed_at').eq('student_id', student.id).eq('is_active', true),
      supabase.from('assessments').select('id, name, domain, date, max_score, standards, sections').eq('english_class', student.english_class).eq('grade', student.grade),
    ])
    const html = buildStudentPDFHtml(student, { grades: grades.data || [], semesterGrades: semGrades.data || [], readingRecords: reading.data || [], behaviorLogs: behavior.data || [], attendanceRecords: attendance.data || [], comments: comments.data || [], scaffolds: scaffolds.data || [], goals: goals.data || [], assessments: assessments.data || [] })
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close() }
  }
  const remove = async () => {
    if (!student) return
    const tables = ['semester_grades', 'grades', 'summative_scores', 'comments', 'reading_assessments', 'behavior_logs', 'attendance', 'level_test_scores', 'level_test_placements', 'student_scaffolds', 'student_goals', 'student_vocabulary', 'student_wida_levels', 'peer_observations', 'parent_communications', 'class_transfers']
    const counts: Record<string, number> = {}
    for (const t of tables) { try { const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('student_id', student.id); if ((count || 0) > 0) counts[t] = count || 0 } catch {} }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const details = Object.entries(counts).map(([t, c]) => `${c} ${t.replace(/_/g, ' ')}`).join(', ')
    if (!await confirmDialog({ title: `Delete ${student.english_name}?`, message: total > 0 ? `This permanently removes ${total} linked records:\n${details}\n\nThis cannot be undone.` : 'This cannot be undone.', danger: true, confirmLabel: 'Delete' })) return
    setDeleting(true)
    const { error } = await supabase.from('students').delete().eq('id', student.id)
    setDeleting(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(`${student.english_name} deleted`); router.push('/students')
  }

  if (missing) return <div className="px-8 py-16 text-center"><p className="font-display text-[26px] text-ink">{lang === 'ko' ? '학생을 찾을 수 없습니다' : 'No such student'}</p><Link href="/students" className="text-accent underline text-[13px]">{lang === 'ko' ? '학생 명단으로' : 'Back to students'}</Link></div>
  if (!student) return <div className="p-16 flex justify-center"><Loader2 size={20} className="animate-spin text-ink-3" /></div>

  // Behavior first: it is what teachers open a student for most often.
  const sections: [string, string][] = [
    ['behavior', lang === 'ko' ? '행동' : 'Behavior'],
    ['grades', lang === 'ko' ? '성적' : 'Grades'], ['reading', lang === 'ko' ? '읽기' : 'Reading'], ['attendance', lang === 'ko' ? '출석' : 'Attendance'],
    ['standards', lang === 'ko' ? '기준' : 'Standards'], ['leveltests', lang === 'ko' ? '레벨 테스트' : 'Level tests'],
    ['support', lang === 'ko' ? '지원 · WIDA, 스캐폴드, 목표, 그룹' : 'Support · WIDA, scaffolds, goals, groups'], ['notes', lang === 'ko' ? '메모와 이력' : 'Notes and history'],
  ]
  const letter = facts?.overall != null ? percentToLetter(facts.overall) : null
  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fieldCls = 'h-9 px-3 bg-surface border border-rule-2 rounded text-[13px] text-ink w-full'

  return (
    <div className="px-8 py-6">
      <Link href="/students" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink mb-4"><ArrowLeft size={13} />{lang === 'ko' ? '학생 명단' : 'Students'}</Link>
      {student.needs_review && (
        <div className="mb-4 px-4 py-2.5 bg-warn-soft border border-rule rounded flex items-center justify-between gap-3 text-[13px] text-warn">
          <span>{lang === 'ko' ? '명단 업로드 시 검토 대상으로 표시된 학생입니다. 정보를 확인하세요.' : 'Flagged for review during roster upload. Check the details are right.'}</span>
          <button onClick={async () => { const { error } = await supabase.from('students').update({ needs_review: false }).eq('id', student.id); if (!error) { showToast('Review flag cleared'); load() } }} className="h-7 px-3 rounded bg-warn text-white text-[12px] font-semibold whitespace-nowrap">{lang === 'ko' ? '검토 완료' : 'Mark reviewed'}</button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
        {/* Rail */}
        <aside className="lg:sticky lg:top-[140px] self-start space-y-4">
          <div>
            <h1 className="font-display text-[30px] leading-none text-ink">{student.english_name}</h1>
            <p className="text-[15px] text-ink-2 mt-1">{student.korean_name}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${CLASS_BG[student.english_class] || 'bg-ink'}`}>{student.english_class}</span>
            <WIDABadge studentId={student.id} />
            {(student as any).is_transfer && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-info-soft text-info">{lang === 'ko' ? '전학' : 'Transfer'}{(student as any).transfer_date ? ` · ${new Date((student as any).transfer_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}</span>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px] tabular-nums">
            <dt className="text-ink-3">{lang === 'ko' ? '학년' : 'Grade'}</dt><dd className="text-ink font-medium">{student.grade} · {student.korean_class} {student.class_number}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '담당' : 'Teacher'}</dt><dd className="text-ink font-medium">{student.teacher_name || '—'}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '종합' : 'Overall'}</dt><dd className="text-ink font-medium">{facts ? (facts.overall != null ? `${Math.round(facts.overall)} · ${letter}` : '—') : '…'}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '출석' : 'Attendance'}</dt><dd className="text-ink font-medium">{facts ? (facts.attendanceRate != null ? `${facts.attendanceRate}% · ${facts.absences} ${lang === 'ko' ? '결석' : 'absent'}` : '—') : '…'}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '읽기' : 'Reading'}</dt><dd className="text-ink font-medium">{facts ? (facts.cwpm != null ? `${facts.cwpm} cwpm${facts.readingLevel ? ` · ${facts.readingLevel}` : ''}` : '—') : '…'}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '레벨 테스트' : 'Level test'}</dt><dd className="text-ink font-medium">{facts ? (facts.placement ? `${facts.placement}${facts.placementTest ? ` · ${facts.placementTest}` : ''}` : '—') : '…'}</dd>
            <dt className="text-ink-3">{lang === 'ko' ? '행동 (30일)' : 'Behavior · 30d'}</dt><dd className="text-ink font-medium">{facts ? `${facts.behavior30} ${lang === 'ko' ? '건' : facts.behavior30 === 1 ? 'log' : 'logs'}` : '…'}</dd>
          </dl>
          <nav className="border-t border-rule-2 pt-3 grid gap-0.5 text-[12.5px]" aria-label="Sections">
            {sections.map(([id, l]) => <a key={id} href={`#sec-${id}`} onClick={e => { e.preventDefault(); document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={`px-2 py-1 rounded ${active === id ? 'bg-surface text-ink font-semibold shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'text-ink-2 hover:text-ink'}`}>{l}</a>)}
          </nav>
          <div className="border-t border-rule-2 pt-3 grid gap-1.5">
            <button onClick={editing ? () => setEditing(false) : startEdit} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink hover:border-ink-3 inline-flex items-center gap-1.5"><Pencil size={12} />{editing ? (lang === 'ko' ? '편집 취소' : 'Cancel edit') : (lang === 'ko' ? '정보 수정' : 'Edit details')}</button>
            <button onClick={exportPDF} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink hover:border-ink-3 inline-flex items-center gap-1.5"><Printer size={12} />{lang === 'ko' ? '포트폴리오 PDF' : 'Export portfolio'}</button>
            {currentTeacher?.role === 'admin' && <button onClick={remove} disabled={deleting} className="h-8 px-3 rounded text-[12.5px] text-ink-3 hover:text-bad inline-flex items-center gap-1.5">{deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}{lang === 'ko' ? '학생 삭제' : 'Delete student'}</button>}
          </div>
        </aside>

        {/* Body */}
        <div className="min-w-0 space-y-10">
          {editing && (
            <section className="border border-rule-2 rounded-lg p-4 bg-paper-2 grid gap-3">
              <h2 className="font-display text-[20px] leading-none text-ink">{lang === 'ko' ? '학생 정보 수정' : 'Edit details'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '영어 이름' : 'English name'}</span><input value={form.english_name} onChange={e => setForm({ ...form, english_name: e.target.value })} className={fieldCls} /></label>
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '한국어 이름' : 'Korean name'}</span><input value={form.korean_name} onChange={e => setForm({ ...form, korean_name: e.target.value })} className={fieldCls} /></label>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '학년' : 'Grade'}</span><select value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) as Grade })} className={fieldCls}>{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></label>
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '한국 반' : 'Korean class'}</span><select value={form.korean_class} onChange={e => setForm({ ...form, korean_class: e.target.value as KoreanClass })} className={fieldCls}>{KOREAN_CLASSES.map(k => <option key={k} value={k}>{k}</option>)}</select></label>
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '번호' : 'Number'}</span><input type="number" min={1} max={35} value={form.class_number} onChange={e => setForm({ ...form, class_number: parseInt(e.target.value) || 1 })} className={fieldCls} /></label>
                <label className="grid gap-1"><span className="eyebrow">{lang === 'ko' ? '영어 반' : 'English class'}</span><select value={form.english_class} onChange={e => setForm({ ...form, english_class: e.target.value as EnglishClass })} className={fieldCls}>{ALL_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={!!form.is_transfer} onChange={e => setForm({ ...form, is_transfer: e.target.checked, transfer_date: e.target.checked ? (form.transfer_date || getKSTDateString()) : '' })} />{lang === 'ko' ? '전학생' : 'Transfer student'}</label>
                {form.is_transfer && <input type="date" value={form.transfer_date || ''} onChange={e => setForm({ ...form, transfer_date: e.target.value })} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[12px] text-ink" />}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setEditing(false)} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '취소' : 'Cancel'}</button>
                  <button onClick={saveEdit} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5">{saving && <Loader2 size={13} className="animate-spin" />}{lang === 'ko' ? '저장' : 'Save'}</button>
                </div>
              </div>
            </section>
          )}

          <Section id="behavior" title={lang === 'ko' ? '행동 기록' : 'Behavior'} meta={facts ? `${facts.behavior30} ${lang === 'ko' ? '건 · 30일' : facts.behavior30 === 1 ? 'log in 30 days' : 'logs in 30 days'}` : ''}>
            <BehaviorTracker studentId={student.id} studentName={student.english_name} />
          </Section>
          <Section id="grades" title={lang === 'ko' ? '성적' : 'Grades'} meta={activeSemester ? (lang === 'ko' ? activeSemester.name_ko || activeSemester.name : activeSemester.name) : ''}>
            <GradesAtAGlance student={student} semesterId={activeSemester?.id || null} lang={lang} />
            <AcademicHistoryTab studentId={student.id} lang={lang as 'en' | 'ko'} />
          </Section>
          <Section id="reading" title={lang === 'ko' ? '읽기' : 'Reading'} meta={facts?.readingDate ? `${lang === 'ko' ? '최근' : 'last test'} ${fmtDate(facts.readingDate)}` : ''}>
            <ReadingTrend student={student} lang={lang} />
            <ReadingTabInModal studentId={student.id} studentName={student.english_name} lang={lang as 'en' | 'ko'} />
          </Section>
          <Section id="attendance" title={lang === 'ko' ? '출석' : 'Attendance'} meta={facts?.attendanceRate != null ? `${facts.attendanceRate}% · ${facts.absences} ${lang === 'ko' ? '결석' : 'absent'} · ${facts.tardies} ${lang === 'ko' ? '지각' : 'tardy'}` : ''}>
            <AttendanceTabInModal studentId={student.id} studentName={student.english_name} lang={lang as 'en' | 'ko'} />
          </Section>
          <Section id="standards" title={lang === 'ko' ? '기준 숙달' : 'Standards'}>
            <StandardsMasteryTab studentId={student.id} lang={lang as 'en' | 'ko'} />
          </Section>
          <Section id="leveltests" title={lang === 'ko' ? '레벨 테스트' : 'Level tests'}>
            <LevelTestHistory studentId={student.id} lang={lang} />
          </Section>
          <Section id="support" title={lang === 'ko' ? '지원' : 'Support'} meta={lang === 'ko' ? 'WIDA · 스캐폴드 · 목표 · 그룹' : 'WIDA · scaffolds · goals · groups'}>
            <div className="space-y-8">
              <WIDAPerformanceInsight studentId={student.id} lang={lang} />
              <div><h3 className="eyebrow mb-2">{lang === 'ko' ? '스캐폴드' : 'Scaffolds'}</h3><ScaffoldsTab studentId={student.id} /></div>
              <div><h3 className="eyebrow mb-2">{lang === 'ko' ? '목표' : 'Goals'}</h3><GoalsTab studentId={student.id} studentName={student.english_name} /></div>
              <div><h3 className="eyebrow mb-2">{lang === 'ko' ? '그룹' : 'Groups'}</h3><StudentGroupsTab studentId={student.id} studentName={student.english_name} /></div>
            </div>
          </Section>
          <Section id="notes" title={lang === 'ko' ? '메모와 이력' : 'Notes and history'}>
            <div className="space-y-8">
              <AboutTab studentId={student.id} lang={lang as 'en' | 'ko'} />
              <ClassTransferHistory studentId={student.id} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ id, title, meta, children }: { id: string; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section id={`sec-${id}`} className="scroll-mt-[140px]">
      <div className="flex items-baseline justify-between gap-3 border-b border-rule-2 pb-2 mb-4">
        <h2 className="font-display text-[24px] leading-none text-ink">{title}</h2>
        {meta && <span className="eyebrow">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

// Every level test the student has sat, newest first. Placement is what the
// meeting decided; the composite is what the numbers suggested.
function LevelTestHistory({ studentId, lang }: { studentId: string; lang: string }) {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => {
    ;(async () => {
      const [sc, pl] = await Promise.all([
        supabase.from('level_test_scores').select('level_test_id, previous_class, composite_index, composite_band, entered_at, level_tests ( name, academic_year, semester, grade )').eq('student_id', studentId),
        supabase.from('level_test_placements').select('level_test_id, auto_placement, final_placement, is_overridden, override_reason').eq('student_id', studentId),
      ])
      const byTest: Record<string, any> = {}
      ;(sc.data || []).forEach((s: any) => { byTest[s.level_test_id] = { ...s } })
      ;(pl.data || []).forEach((p: any) => { byTest[p.level_test_id] = { ...(byTest[p.level_test_id] || { level_test_id: p.level_test_id }), ...p } })
      setRows(Object.values(byTest).sort((a: any, b: any) => (b.level_tests?.academic_year || '').localeCompare(a.level_tests?.academic_year || '') || (b.level_tests?.semester || '').localeCompare(a.level_tests?.semester || '')))
    })()
  }, [studentId])
  if (!rows) return <Loader2 size={16} className="animate-spin text-ink-3" />
  if (rows.length === 0) return <p className="text-[13px] text-ink-3">{lang === 'ko' ? '레벨 테스트 기록이 없습니다.' : 'No level tests on record.'}</p>
  return (
    <table className="w-full text-[13px] tabular-nums">
      <thead><tr className="border-b border-rule-2"><th className="text-left py-1.5 eyebrow font-semibold">{lang === 'ko' ? '시험' : 'Test'}</th><th className="text-left py-1.5 eyebrow font-semibold">{lang === 'ko' ? '이전 반' : 'From'}</th><th className="text-right py-1.5 eyebrow font-semibold">{lang === 'ko' ? '종합' : 'Composite'}</th><th className="text-left py-1.5 pl-4 eyebrow font-semibold">{lang === 'ko' ? '배치' : 'Placed'}</th></tr></thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r: any) => (
          <tr key={r.level_test_id}>
            <td className="py-2 text-ink">{r.level_tests?.name || '—'}<span className="text-ink-3 ml-2 text-[11.5px]">G{r.level_tests?.grade}</span></td>
            <td className="py-2 text-ink-2">{r.previous_class || '—'}</td>
            <td className="py-2 text-right text-ink-2">{r.composite_index != null ? Math.round(Number(r.composite_index) * 100) : '—'}{r.composite_band ? <span className="text-ink-3 ml-1 text-[11.5px]">{r.composite_band}</span> : null}</td>
            <td className="py-2 pl-4"><span className="font-semibold text-ink">{r.final_placement || '—'}</span>{r.is_overridden && <span className="text-[11px] text-warn ml-2" title={r.override_reason || ''}>{lang === 'ko' ? '교사 판단' : 'teacher decision'}{r.auto_placement ? ` · ${lang === 'ko' ? '제안' : 'suggested'} ${r.auto_placement}` : ''}</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Reading speed over time, against the class target ─────────────
function ReadingTrend({ student, lang }: { student: Student; lang: string }) {
  const [points, setPoints] = useState<{ x: string; y: number; label?: string; note?: string; tone?: 'good' | 'warn' | 'bad' }[] | null>(null)
  const [band, setBand] = useState<{ low: number; high: number; label: string } | undefined>()
  useEffect(() => {
    ;(async () => {
      const [rd, cb] = await Promise.all([
        supabase.from('reading_assessments').select('date, cwpm, accuracy_rate, reading_level').eq('student_id', student.id).order('date', { ascending: true }),
        supabase.from('class_benchmarks').select('cwpm_mid, cwpm_end').eq('english_class', student.english_class).eq('grade', student.grade).limit(1).maybeSingle(),
      ])
      setPoints((rd.data || []).filter((r: any) => r.cwpm != null).map((r: any) => ({
        x: r.date, y: r.cwpm, label: r.reading_level || undefined,
        note: r.accuracy_rate != null ? `${Number(r.accuracy_rate).toFixed(0)}% ${lang === 'ko' ? '정확도' : 'accuracy'}` : undefined,
        tone: r.accuracy_rate == null ? undefined : r.accuracy_rate >= 96 ? 'good' : r.accuracy_rate >= 90 ? 'warn' : 'bad',
      })))
      const b: any = (cb as any).data
      if (b && b.cwpm_mid != null && b.cwpm_end != null) setBand({ low: Number(b.cwpm_mid), high: Number(b.cwpm_end), label: `${student.english_class} ${lang === 'ko' ? '목표' : 'target'} ${b.cwpm_mid}–${b.cwpm_end}` })
      else { const f = CWPM_BENCHMARKS[student.grade]; if (f) setBand({ low: f.approaching, high: f.proficient, label: `${lang === 'ko' ? `${student.grade}학년 기준` : `Grade ${student.grade} benchmark`} ${f.approaching}–${f.proficient}` }) }
    })()
  }, [student.id, student.english_class, student.grade, lang])
  if (!points) return null
  if (points.length === 0) return null
  return (
    <div className="mb-6">
      <LineChart points={points} band={band} height={200} unit="" />
      <p className="text-[11px] text-ink-3 mt-1">{lang === 'ko' ? '점 색은 정확도: 초록 96%+, 노랑 90–95%, 빨강 그 이하.' : 'Dot color is accuracy: green 96%+, amber 90–95%, red below.'}</p>
    </div>
  )
}

// ── Domain tiles and student-vs-class bars for the active semester ──
function GradesAtAGlance({ student, semesterId, lang }: { student: Student; semesterId: string | null; lang: string }) {
  const [data, setData] = useState<{ domain: string; mine: number | null; cls: number | null; series: number[] }[] | null>(null)
  useEffect(() => {
    if (!semesterId) { setData([]); return }
    ;(async () => {
      const { data: assessments } = await supabase.from('assessments').select('id, domain, type, max_score, date, created_at').eq('semester_id', semesterId).eq('english_class', student.english_class).eq('grade', student.grade)
      const list = (assessments || []) as any[]
      if (list.length === 0) { setData([]); return }
      const { data: grades } = await supabase.from('grades').select('student_id, assessment_id, score').in('assessment_id', list.map(a => a.id)).not('score', 'is', null)
      const g = (grades || []) as any[]
      const byA: Record<string, any> = Object.fromEntries(list.map(a => [a.id, a]))
      const toItems = (rows: any[]) => rows.filter(r => byA[r.assessment_id]?.max_score > 0).map(r => ({ score: r.score, maxScore: byA[r.assessment_id].max_score, assessmentType: (['formative', 'summative', 'performance_task'].includes(byA[r.assessment_id].type) ? byA[r.assessment_id].type : 'formative') }))
      const out = DOMAINS.map(domain => {
        const ids = new Set(list.filter(a => a.domain === domain).map(a => a.id))
        const mineRows = g.filter(r => r.student_id === student.id && ids.has(r.assessment_id))
        const allRows = g.filter(r => ids.has(r.assessment_id))
        const ordered = [...mineRows].sort((x, y) => ((byA[x.assessment_id].date || '') + byA[x.assessment_id].created_at).localeCompare((byA[y.assessment_id].date || '') + byA[y.assessment_id].created_at))
        return {
          domain,
          mine: mineRows.length ? calculateWeightedAverage(toItems(mineRows) as any, student.grade, null, student.english_class) : null,
          cls: allRows.length ? calculateWeightedAverage(toItems(allRows) as any, student.grade, null, student.english_class) : null,
          series: ordered.map(r => (r.score / byA[r.assessment_id].max_score) * 100),
        }
      })
      setData(out)
    })()
  }, [student.id, student.english_class, student.grade, semesterId])
  if (!data || data.every(d => d.mine == null)) return null
  const label = (d: string) => (DOMAIN_LABELS as any)[d]?.[lang === 'ko' ? 'ko' : 'en'] || domainLabel(d)
  return (
    <div className="mb-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 border border-rule-2 rounded-md overflow-hidden">
        {data.map(d => {
          const drop = d.series.length >= 3 ? ((d.series[d.series.length - 3] + d.series[d.series.length - 2]) / 2) - d.series[d.series.length - 1] : 0
          const tone = d.mine != null && d.mine < 70 ? 'bad' : drop >= 15 ? 'warn' : undefined
          return (
            <div key={d.domain} className="px-3 py-2.5 border-r border-rule last:border-r-0 min-w-0">
              <p className="eyebrow truncate">{label(d.domain)}</p>
              <p className={`font-display text-[24px] leading-none mt-1 tabular-nums ${tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-ink'}`}>{d.mine != null ? Math.round(d.mine) : '—'}</p>
              <div className="mt-1.5"><Sparkline values={d.series} tone={tone} width={110} height={22} /></div>
              <p className="text-[10.5px] text-ink-3 mt-0.5">{d.series.length} {lang === 'ko' ? '개 평가' : d.series.length === 1 ? 'assessment' : 'assessments'}{drop >= 15 ? ` · ${lang === 'ko' ? '최근 하락' : 'recent drop'}` : ''}</p>
            </div>
          )
        })}
      </div>
      <Bars rows={data.filter(d => d.mine != null).map(d => ({ label: label(d.domain), a: d.mine, b: d.cls, tone: d.mine != null && d.mine < 70 ? 'bad' as const : undefined }))} aLabel={student.english_name} bLabel={`${student.english_class} ${lang === 'ko' ? '평균' : 'average'}`} />
    </div>
  )
}
