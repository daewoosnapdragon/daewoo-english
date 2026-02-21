'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Teacher, ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor, DEFAULT_WEIGHTS, AssessmentType } from '@/lib/utils'
import { Save, Loader2, UserCog, School, CalendarDays, Plus, Trash2, Target, AlertTriangle, Scale, ChevronDown } from 'lucide-react'

export default function SettingsView() {
  const { language, showToast, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.is_head_teacher

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">
          {language === 'ko' ? '설정' : 'Settings'}
        </h2>
        <p className="text-text-secondary text-sm mt-1">
          {language === 'ko' ? '교사, 학교 정보, 학기 관리' : 'Manage teachers, school info, and semesters'}
        </p>
      </div>

      <div className="px-10 py-8 max-w-4xl">
        <TeacherSection />
        <SemesterSection />
        <ProgramBenchmarksSection />
        <AssessmentWeightsSection />
        {isAdmin && <ClassManagementSection />}
        <SchoolInfoSection />
      </div>
    </div>
  )
}

function TeacherSection() {
  const { language, showToast, currentTeacher } = useApp()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<Teacher | null>(null)
  const [deleteStats, setDeleteStats] = useState<{ students: number; logs: number; grades: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('teachers')
        .select('*')
        .eq('is_active', true)
        .order('english_class')
      if (data) setTeachers(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (teacher: Teacher) => {
    const newName = edits[teacher.id]
    if (!newName || newName === teacher.name) return

    setSaving(teacher.id)
    const { error } = await supabase
      .from('teachers')
      .update({ name: newName })
      .eq('id', teacher.id)

    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setTeachers((prev: any[]) => prev.map((t: any) => t.id === teacher.id ? { ...t, name: newName } : t))
      showToast(language === 'ko' ? `${newName}(으)로 변경됨` : `Updated to ${newName}`)
    }
    setSaving(null)
  }

  const startDelete = async (teacher: Teacher) => {
    // Fetch stats about this teacher's data
    const [{ count: studentCount }, { count: logCount }, { count: gradeCount }] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id).eq('is_active', true),
      supabase.from('behavior_logs').select('*', { count: 'exact', head: true }).eq('teacher_id', teacher.id),
      supabase.from('grades').select('*', { count: 'exact', head: true }).eq('entered_by', teacher.id),
    ])
    setDeleteStats({ students: studentCount || 0, logs: logCount || 0, grades: gradeCount || 0 })
    setDeleteConfirm(teacher)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    setSaving(deleteConfirm.id)
    // Soft delete: set is_active = false, unassign students
    await supabase.from('students').update({ teacher_id: null }).eq('teacher_id', deleteConfirm.id)
    const { error } = await supabase.from('teachers').update({ is_active: false }).eq('id', deleteConfirm.id)
    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      setTeachers(prev => prev.filter(t => t.id !== deleteConfirm.id))
      showToast(language === 'ko' ? '교사가 비활성화됨' : `${deleteConfirm.name} deactivated`)
    }
    setSaving(null)
    setDeleteConfirm(null)
    setDeleteStats(null)
  }

  const handleExportTeacherData = async (teacher: Teacher) => {
    // Export all data associated with this teacher as JSON
    const [{ data: students }, { data: logs }, { data: grades }] = await Promise.all([
      supabase.from('students').select('*').eq('teacher_id', teacher.id),
      supabase.from('behavior_logs').select('*').eq('teacher_id', teacher.id),
      supabase.from('grades').select('*').eq('entered_by', teacher.id),
    ])
    const exportData = { teacher, students, behavior_logs: logs, grades, exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `teacher-data-${teacher.name.replace(/\s+/g, '-')}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast(language === 'ko' ? '데이터 다운로드됨' : 'Data exported')
  }

  // Core class teachers cannot be deleted
  const coreClasses = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']
  const isCore = (t: Teacher) => coreClasses.includes(t.english_class) || t.role === 'admin'

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <UserCog size={20} className="text-navy" />
        <h3 className="font-display text-lg font-semibold text-navy">
          {language === 'ko' ? '교사 관리' : 'Teacher Management'}
        </h3>
      </div>
      <p className="text-[13px] text-text-secondary mb-4">
        {language === 'ko' ? '교사 이름을 수정하고 Enter를 누르거나 저장 버튼을 클릭하세요.' : 'Edit teacher names and press Enter or click Save. Non-core teachers can be deactivated.'}
      </p>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-alt">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                  {language === 'ko' ? '영어반' : 'English Class'}
                </th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                  {language === 'ko' ? '교사 이름' : 'Teacher Name'}
                </th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                  {language === 'ko' ? '역할' : 'Role'}
                </th>
                <th className="px-5 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher: any) => {
                const edited = edits[teacher.id] !== undefined && edits[teacher.id] !== teacher.name
                return (
                  <tr key={teacher.id} className="border-t border-border">
                    <td className="px-5 py-3">
                      {teacher.english_class === 'Admin' ? (
                        <span className="text-[12px] font-semibold text-navy">Admin</span>
                      ) : (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                          style={{
                            backgroundColor: classToColor(teacher.english_class as EnglishClass),
                            color: classToTextColor(teacher.english_class as EnglishClass),
                          }}>
                          {teacher.english_class}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        value={edits[teacher.id] ?? teacher.name}
                        onChange={(e: any) => setEdits((prev: any) => ({ ...prev, [teacher.id]: e.target.value }))}
                        onKeyDown={(e: any) => { if (e.key === 'Enter') handleSave(teacher) }}
                        className={`px-3 py-1.5 border rounded-lg text-[13px] outline-none w-48 transition-colors ${
                          edited ? 'border-gold bg-warm-light' : 'border-border'
                        } focus:border-navy`}
                      />
                    </td>
                    <td className="px-5 py-3 text-text-secondary capitalize">{teacher.role}</td>
                    <td className="px-5 py-3 flex items-center gap-1">
                      {edited && (
                        <button onClick={() => handleSave(teacher)} disabled={saving === teacher.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
                          {saving === teacher.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          {language === 'ko' ? '저장' : 'Save'}
                        </button>
                      )}
                      {!edited && !isCore(teacher) && teacher.id !== currentTeacher?.id && (
                        <button onClick={() => startDelete(teacher)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={12} /> {language === 'ko' ? '삭제' : 'Remove'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => { setDeleteConfirm(null); setDeleteStats(null) }}>
          <div className="bg-surface rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={20} className="text-amber-500" />
              <h3 className="font-display text-lg font-semibold text-navy">
                {language === 'ko' ? '교사 비활성화' : 'Deactivate Teacher'}
              </h3>
            </div>
            <p className="text-[13px] text-text-secondary mb-3">
              {language === 'ko'
                ? `${deleteConfirm.name}을(를) 비활성화하시겠습니까? 이 작업은 로그인 목록에서 제거되지만 기록 데이터는 유지됩니다.`
                : `Deactivate ${deleteConfirm.name}? This removes them from login but preserves all historical data.`}
            </p>
            {deleteStats && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-[12px]">
                <p className="font-semibold text-amber-800 mb-1">Associated data:</p>
                <p className="text-amber-700">{deleteStats.students} active students (will be unassigned)</p>
                <p className="text-amber-700">{deleteStats.logs} behavior logs</p>
                <p className="text-amber-700">{deleteStats.grades} grade entries</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleExportTeacherData(deleteConfirm)}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border border-border text-text-secondary hover:bg-surface-alt transition-colors">
                {language === 'ko' ? '데이터 다운로드' : 'Download Data First'}
              </button>
              <button onClick={handleDelete} disabled={saving === deleteConfirm.id}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">
                {saving === deleteConfirm.id ? <Loader2 size={14} className="animate-spin mx-auto" /> : (language === 'ko' ? '비활성화' : 'Deactivate')}
              </button>
            </div>
            <button onClick={() => { setDeleteConfirm(null); setDeleteStats(null) }}
              className="w-full mt-2 py-2 rounded-lg text-[12px] text-text-tertiary hover:text-text-secondary transition-colors">
              {language === 'ko' ? '취소' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SemesterSection() {
  const { language, showToast } = useApp()
  const lang = language as 'en' | 'ko'
  const [semesters, setSemesters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newSem, setNewSem] = useState({ name: '', name_ko: '', academic_year: '2025-2026', type: 'spring' as string, start_date: '', end_date: '', midterm_cutoff_date: '', report_card_cutoff_date: '' })

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('semesters').select('*').order('start_date', { ascending: false })
      if (data) setSemesters(data)
      setLoading(false)
    })()
  }, [])

  const handleSave = async (sem: any) => {
    setSaving(sem.id)
    const { error } = await supabase.from('semesters').update({
      name: sem.name, name_ko: sem.name_ko, start_date: sem.start_date || null,
      end_date: sem.end_date || null, midterm_cutoff_date: sem.midterm_cutoff_date || null,
      report_card_cutoff_date: sem.report_card_cutoff_date || null, is_active: sem.is_active,
    }).eq('id', sem.id)
    setSaving(null)
    if (error) showToast(`Error: ${error.message}`)
    else showToast('Saved')
  }

  const handleSetActive = async (id: string) => {
    await supabase.from('semesters').update({ is_active: false }).neq('id', 'none')
    await supabase.from('semesters').update({ is_active: true }).eq('id', id)
    setSemesters((prev: any) => prev.map((s: any) => ({ ...s, is_active: s.id === id })))
    showToast('Active semester updated')
  }

  const handleAdd = async () => {
    if (!newSem.name.trim()) return
    const { data, error } = await supabase.from('semesters').insert({
      name: newSem.name, name_ko: newSem.name_ko, academic_year: newSem.academic_year,
      type: newSem.type, start_date: newSem.start_date || null, end_date: newSem.end_date || null,
      grades_due_date: newSem.midterm_cutoff_date || null,
      comments_due_date: newSem.report_card_cutoff_date || null, is_active: false,
    }).select().single()
    if (error) showToast(`Error: ${error.message}`)
    else { setSemesters((prev: any) => [data, ...prev]); setAdding(false); setNewSem({ name: '', name_ko: '', academic_year: '2025-2026', type: 'spring', start_date: '', end_date: '', midterm_cutoff_date: '', report_card_cutoff_date: '' }); showToast('Semester added') }
  }

  const handleDelete = async (id: string) => {
    // Check for linked data across all tables that reference semesters
    const [sg, ss, cm, as_] = await Promise.all([
      supabase.from('semester_grades').select('*', { count: 'exact', head: true }).eq('semester_id', id),
      supabase.from('summative_scores').select('*', { count: 'exact', head: true }).eq('semester_id', id),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('semester_id', id),
      supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('semester_id', id),
    ])
    const counts = {
      semester_grades: sg.count || 0,
      summative_scores: ss.count || 0,
      comments: cm.count || 0,
      assessments: as_.count || 0,
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)

    const msg = total > 0
      ? `This semester has linked data:\n- ${counts.semester_grades} grade(s)\n- ${counts.summative_scores} summative score(s)\n- ${counts.comments} comment(s)\n- ${counts.assessments} assessment(s)\n\nAll linked data will be deleted. Continue?`
      : 'Delete this semester?'
    if (!confirm(msg)) return

    // Delete all linked records first (order matters for FKs)
    if (counts.semester_grades > 0) await supabase.from('semester_grades').delete().eq('semester_id', id)
    if (counts.summative_scores > 0) await supabase.from('summative_scores').delete().eq('semester_id', id)
    if (counts.comments > 0) await supabase.from('comments').delete().eq('semester_id', id)
    if (counts.assessments > 0) await supabase.from('assessments').update({ semester_id: null }).eq('semester_id', id)

    // Also check monthly_behavior_grades
    await supabase.from('monthly_behavior_grades').delete().eq('semester_id', id).then(() => {})

    const { error } = await supabase.from('semesters').delete().eq('id', id)
    if (error) {
      showToast(`Could not delete: ${error.message}`)
    } else {
      setSemesters((prev: any) => prev.filter((s: any) => s.id !== id))
      showToast('Deleted')
    }
  }

  const updateField = (id: string, field: string, value: any) => {
    setSemesters((prev: any) => prev.map((s: any) => s.id === id ? { ...s, [field]: value } : s))
  }

  // Check if a cutoff date has passed
  const isPast = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-navy" />
          <h3 className="font-display text-lg font-semibold text-navy">{lang === 'ko' ? '학기 관리' : 'Semesters & Cutoff Dates'}</h3>
        </div>
        <button onClick={() => setAdding(!adding)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">
          <Plus size={13} /> {lang === 'ko' ? '학기 추가' : 'Add Semester'}
        </button>
      </div>

      {adding && (
        <div className="bg-accent-light border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Name *</label>
              <input value={newSem.name} onChange={(e: any) => setNewSem({ ...newSem, name: e.target.value })} placeholder="e.g. Spring 2026" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Name (Korean)</label>
              <input value={newSem.name_ko} onChange={(e: any) => setNewSem({ ...newSem, name_ko: e.target.value })} placeholder="2026 봄학기" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Academic Year</label>
              <input value={newSem.academic_year} onChange={(e: any) => setNewSem({ ...newSem, academic_year: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Type</label>
              <select value={newSem.type} onChange={(e: any) => setNewSem({ ...newSem, type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy">
                <option value="spring">Spring</option>
                <option value="fall">Fall</option>
                <option value="spring_mid">Spring Midterm</option>
                <option value="spring_final">Spring Final</option>
                <option value="fall_mid">Fall Midterm</option>
                <option value="fall_final">Fall Final</option>
              </select></div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Start Date</label>
              <input type="date" value={newSem.start_date} onChange={(e: any) => setNewSem({ ...newSem, start_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">End Date</label>
              <input type="date" value={newSem.end_date} onChange={(e: any) => setNewSem({ ...newSem, end_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Midterm Cutoff</label>
              <input type="date" value={newSem.midterm_cutoff_date} onChange={(e: any) => setNewSem({ ...newSem, midterm_cutoff_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Report Card Cutoff</label>
              <input type="date" value={newSem.report_card_cutoff_date} onChange={(e: any) => setNewSem({ ...newSem, report_card_cutoff_date: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
        ) : semesters.length === 0 ? (
          <div className="p-8 text-center text-text-tertiary text-sm">No semesters created yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {semesters.map((sem: any) => (
              <div key={sem.id} className={`p-4 ${sem.is_active ? 'bg-green-50/50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-navy">{sem.name}</span>
                    {sem.name_ko && <span className="text-[12px] text-text-tertiary">{sem.name_ko}</span>}
                    {sem.is_active && <span className="text-[9px] bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!sem.is_active && <button onClick={() => handleSetActive(sem.id)} className="text-[10px] px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">Set Active</button>}
                    <button onClick={() => handleSave(sem)} disabled={saving === sem.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-navy text-white hover:bg-navy-dark">
                      {saving === sem.id ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                    </button>
                    <button onClick={() => handleDelete(sem.id)} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Start Date</label>
                    <input type="date" value={sem.start_date || ''} onChange={(e: any) => updateField(sem.id, 'start_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                  <div><label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">End Date</label>
                    <input type="date" value={sem.end_date || ''} onChange={(e: any) => updateField(sem.id, 'end_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: isPast(sem.midterm_cutoff_date) ? '#dc2626' : '#94a3b8' }}>
                      Midterm Cutoff {isPast(sem.midterm_cutoff_date) && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">LOCKED</span>}
                    </label>
                    <input type="date" value={sem.midterm_cutoff_date || ''} onChange={(e: any) => updateField(sem.id, 'midterm_cutoff_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider font-semibold block mb-1" style={{ color: isPast(sem.report_card_cutoff_date) ? '#dc2626' : '#94a3b8' }}>
                      Report Card Cutoff {isPast(sem.report_card_cutoff_date) && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full ml-1">LOCKED</span>}
                    </label>
                    <input type="date" value={sem.report_card_cutoff_date || ''} onChange={(e: any) => updateField(sem.id, 'report_card_cutoff_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                </div>
                <p className="text-[9px] text-text-tertiary mt-2">Grades entered before the midterm cutoff count toward progress reports. All grades in the semester count toward the final report card. Grades auto-lock after each cutoff date.</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramBenchmarksSection() {
  const { language, showToast, currentTeacher } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher?.english_class : null
  const canEdit = (cls: string) => isAdmin || teacherClass === cls
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedGrade, setSelectedGrade] = useState(1)

  const GRADES = [1, 2, 3, 4, 5]
  const CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

  // Default benchmarks: grade x class (realistic ELL targets)
  const defaultBenchmarks: any[] = []
  const defaults: Record<number, Record<string, any>> = {
    1: {
      Lily:       { cwpm_mid: 5,   cwpm_end: 15,  lexile_min: 0,   lexile_max: 50,  notes: 'Letter recognition, initial sounds' },
      Camellia:   { cwpm_mid: 12,  cwpm_end: 25,  lexile_min: 0,   lexile_max: 100, notes: 'CVC blending, HFW sets 1-2' },
      Daisy:      { cwpm_mid: 20,  cwpm_end: 40,  lexile_min: 50,  lexile_max: 200, notes: 'Simple decodable readers' },
      Sunflower:  { cwpm_mid: 30,  cwpm_end: 55,  lexile_min: 100, lexile_max: 300, notes: 'Short sentences, basic fluency' },
      Marigold:   { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, notes: 'Paragraph reading, comprehension' },
      Snapdragon: { cwpm_mid: 60,  cwpm_end: 90,  lexile_min: 300, lexile_max: 550, notes: 'Independent reading, inference' },
    },
    2: {
      Lily:       { cwpm_mid: 8,   cwpm_end: 20,  lexile_min: 0,   lexile_max: 75,  notes: 'Letter-sound relationships' },
      Camellia:   { cwpm_mid: 20,  cwpm_end: 35,  lexile_min: 50,  lexile_max: 150, notes: 'CVC mastery, digraphs starting' },
      Daisy:      { cwpm_mid: 30,  cwpm_end: 50,  lexile_min: 100, lexile_max: 300, notes: 'Decodable chapter books' },
      Sunflower:  { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, notes: 'Developing comprehension' },
      Marigold:   { cwpm_mid: 60,  cwpm_end: 90,  lexile_min: 350, lexile_max: 550, notes: 'Chapter books, varied genres' },
      Snapdragon: { cwpm_mid: 80,  cwpm_end: 110, lexile_min: 500, lexile_max: 700, notes: 'Complex texts, analysis' },
    },
    3: {
      Lily:       { cwpm_mid: 10,  cwpm_end: 25,  lexile_min: 0,   lexile_max: 100, notes: 'Basic decoding, HFW' },
      Camellia:   { cwpm_mid: 25,  cwpm_end: 45,  lexile_min: 50,  lexile_max: 200, notes: 'Blends, digraphs, short vowels' },
      Daisy:      { cwpm_mid: 40,  cwpm_end: 65,  lexile_min: 150, lexile_max: 350, notes: 'Fluency building, expression' },
      Sunflower:  { cwpm_mid: 55,  cwpm_end: 80,  lexile_min: 300, lexile_max: 500, notes: 'Nonfiction, text features' },
      Marigold:   { cwpm_mid: 75,  cwpm_end: 105, lexile_min: 450, lexile_max: 650, notes: 'Independent chapter books' },
      Snapdragon: { cwpm_mid: 95,  cwpm_end: 130, lexile_min: 600, lexile_max: 800, notes: 'Complex comprehension, writing' },
    },
    4: {
      Lily:       { cwpm_mid: 12,  cwpm_end: 28,  lexile_min: 0,   lexile_max: 100, notes: 'Phonics foundations, decoding' },
      Camellia:   { cwpm_mid: 28,  cwpm_end: 50,  lexile_min: 75,  lexile_max: 250, notes: 'Multi-syllable words starting' },
      Daisy:      { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, notes: 'Fluency and expression' },
      Sunflower:  { cwpm_mid: 65,  cwpm_end: 90,  lexile_min: 350, lexile_max: 550, notes: 'Content-area reading' },
      Marigold:   { cwpm_mid: 85,  cwpm_end: 115, lexile_min: 500, lexile_max: 700, notes: 'Novel studies, critical thinking' },
      Snapdragon: { cwpm_mid: 105, cwpm_end: 140, lexile_min: 650, lexile_max: 900, notes: 'Advanced comprehension, debate' },
    },
    5: {
      Lily:       { cwpm_mid: 15,  cwpm_end: 30,  lexile_min: 0,   lexile_max: 100, notes: 'Still building letter-sound, basic decoding' },
      Camellia:   { cwpm_mid: 30,  cwpm_end: 55,  lexile_min: 100, lexile_max: 300, notes: 'Blends, vowel teams, HFW mastery' },
      Daisy:      { cwpm_mid: 50,  cwpm_end: 75,  lexile_min: 250, lexile_max: 450, notes: 'Paragraph-level fluency' },
      Sunflower:  { cwpm_mid: 70,  cwpm_end: 100, lexile_min: 400, lexile_max: 600, notes: 'Nonfiction, academic vocab' },
      Marigold:   { cwpm_mid: 90,  cwpm_end: 120, lexile_min: 550, lexile_max: 750, notes: 'Complex texts, essay writing' },
      Snapdragon: { cwpm_mid: 115, cwpm_end: 150, lexile_min: 700, lexile_max: 950, notes: 'Near grade-level, advanced analysis' },
    },
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('class_benchmarks').select('*').order('display_order')
      if (data && data.length > 0) {
        setBenchmarks(data)
      } else {
        // Generate defaults for all grade x class combos
        const all: any[] = []
        let order = 0
        for (const g of GRADES) {
          for (const c of CLASSES) {
            const d = defaults[g]?.[c] || { cwpm_mid: 0, cwpm_end: 0, lexile_min: 0, lexile_max: 0, notes: '' }
            all.push({ ...d, grade: g, english_class: c, id: `temp_${order}`, display_order: order })
            order++
          }
        }
        setBenchmarks(all)
      }
      setLoading(false)
    })()
  }, [])

  const getBenchmark = (grade: number, cls: string) => {
    return benchmarks.find((b) => b.grade === grade && b.english_class === cls)
  }

  const updateBenchmark = (grade: number, cls: string, field: string, value: any) => {
    setBenchmarks((prev) => prev.map((b) =>
      b.grade === grade && b.english_class === cls ? { ...b, [field]: value } : b
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('class_benchmarks').delete().gte('display_order', 0)
    const toInsert = benchmarks.map((b, i) => ({
      grade: Number(b.grade),
      english_class: b.english_class,
      cwpm_mid: Number(b.cwpm_mid) || 0,
      cwpm_end: Number(b.cwpm_end) || 0,
      lexile_min: Number(b.lexile_min) || 0,
      lexile_max: Number(b.lexile_max) || 0,
      reading_level: '',
      notes: b.notes || '',
      display_order: i,
    }))
    const { error } = await supabase.from('class_benchmarks').insert(toInsert)
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else showToast('Benchmarks saved')
    const { data } = await supabase.from('class_benchmarks').select('*').order('display_order')
    if (data) setBenchmarks(data)
  }

  const gradeData = CLASSES.map((cls) => getBenchmark(selectedGrade, cls)).filter(Boolean)

  if (loading) return <div className="mb-8 p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-navy" />
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">Program Benchmarks</h3>
            <p className="text-[10px] text-text-tertiary">CWPM and Lexile targets per grade and class. Visible to all teachers.</p>
          </div>
        </div>
        {(isAdmin || teacherClass) && (
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Benchmarks
          </button>
        )}
      </div>

      {/* Grade tabs */}
      <div className="flex gap-1 mb-3">
        {GRADES.map((g) => (
          <button key={g} onClick={() => setSelectedGrade(g)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'
            }`}>
            Grade {g}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold" title="Expected reading fluency by mid-semester">CWPM Mid <span className="normal-case text-text-tertiary block text-[8px]">mid-semester target</span></th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold" title="Target reading fluency by end of semester">CWPM End <span className="normal-case text-text-tertiary block text-[8px]">end-semester target</span></th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Lexile Range</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold min-w-[200px]">Focus / WIDA Notes</th>
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((cls) => {
              const b = getBenchmark(selectedGrade, cls)
              if (!b) return null
              const editable = canEdit(cls)
              return (
                <tr key={cls} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-[13px] px-2 py-0.5 rounded" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                      {cls}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {editable ? (
                      <input type="number" value={b.cwpm_mid} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'cwpm_mid', e.target.value)}
                        className="w-16 px-2 py-1 border border-border rounded text-center text-[12px] outline-none focus:border-navy" />
                    ) : <span className="font-bold text-navy">{b.cwpm_mid}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {editable ? (
                      <input type="number" value={b.cwpm_end} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'cwpm_end', e.target.value)}
                        className="w-16 px-2 py-1 border border-border rounded text-center text-[12px] outline-none focus:border-navy" />
                    ) : <span className="font-bold text-navy">{b.cwpm_end}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {editable ? (
                      <span className="flex items-center justify-center gap-1">
                        <input type="number" value={b.lexile_min} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'lexile_min', e.target.value)}
                          className="w-14 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                        <span className="text-text-tertiary">-</span>
                        <input type="number" value={b.lexile_max} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'lexile_max', e.target.value)}
                          className="w-14 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                        <span className="text-[10px] text-text-tertiary">L</span>
                      </span>
                    ) : <span className="text-text-secondary">{b.lexile_min}-{b.lexile_max}L</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    {editable ? (
                      <textarea value={b.notes} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'notes', e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 border border-border rounded text-[11px] outline-none focus:border-navy resize-y min-h-[48px]"
                        placeholder="Focus areas, WIDA levels, standards..." />
                    ) : <span className="text-text-tertiary text-[11px] whitespace-pre-wrap">{b.notes}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-text-tertiary mt-2"><strong>CWPM Mid</strong> = expected correct words per minute by mid-semester (used as "Approaching" threshold). <strong>CWPM End</strong> = target fluency by end of semester (used as "Proficient" threshold). These are realistic ELL program targets, not native-speaker norms. Benchmarks appear in Reading Fluency, Leveling, and Report Cards. Admin and class teachers can edit.</p>
    </div>
  )
}

function ClassManagementSection() {
  const { showToast, language } = useApp()
  const [classes, setClasses] = useState<{ english_class: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      // Get all distinct classes with student counts
      const { data } = await supabase.from('students').select('english_class').eq('is_active', true)
      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((s: any) => { counts[s.english_class] = (counts[s.english_class] || 0) + 1 })
        const all = ENGLISH_CLASSES.map(cls => ({ english_class: cls, count: counts[cls] || 0 }))
        setClasses(all)
      }
      setLoading(false)
    })()
  }, [])

  const handleDeleteClass = async (cls: string) => {
    if (ENGLISH_CLASSES.includes(cls as EnglishClass)) {
      showToast('Cannot delete core program classes (Lily-Snapdragon)')
      return
    }
    const classData = classes.find(c => c.english_class === cls)
    if (classData && classData.count > 0) {
      if (!confirm(`"${cls}" has ${classData.count} active student(s). Deleting will deactivate all students in this class. This cannot be undone. Continue?`)) return
    } else {
      if (!confirm(`Delete class "${cls}"? All associated data (grades, attendance, behavior logs) for students in this class will remain but students will be deactivated.`)) return
    }
    setDeleting(cls)
    // Deactivate students in this class
    const { error } = await supabase.from('students').update({ is_active: false }).eq('english_class', cls)
    if (error) { showToast(`Error: ${error.message}`); setDeleting(null); return }
    // Remove benchmarks for this class
    await supabase.from('class_benchmarks').delete().eq('english_class', cls)
    setClasses(prev => prev.filter(c => c.english_class !== cls))
    setDeleting(null)
    showToast(`Class "${cls}" deleted and students deactivated`)
  }

  if (loading) return <div className="mb-8 p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-amber-600" />
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">Class Management</h3>
          <p className="text-[10px] text-text-tertiary">Delete non-core classes. Core classes (Lily-Snapdragon) cannot be deleted.</p>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
              <th className="text-center px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Students</th>
              <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cls => {
              const isCore = ENGLISH_CLASSES.includes(cls.english_class as EnglishClass)
              return (
                <tr key={cls.english_class} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-[13px] px-2 py-0.5 rounded" style={{ backgroundColor: classToColor(cls.english_class as EnglishClass), color: classToTextColor(cls.english_class as EnglishClass) }}>
                      {cls.english_class}
                    </span>
                    {isCore && <span className="text-[9px] text-text-tertiary ml-2">Core</span>}
                  </td>
                  <td className="text-center px-4 py-2.5 font-medium">{cls.count}</td>
                  <td className="text-right px-4 py-2.5">
                    {!isCore ? (
                      <button onClick={() => handleDeleteClass(cls.english_class)} disabled={deleting === cls.english_class}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-40">
                        {deleting === cls.english_class ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                      </button>
                    ) : <span className="text-[10px] text-text-tertiary">Protected</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssessmentWeightsSection() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.is_head_teacher
  // Keys are "grade" for global defaults, "grade-Class" for class-specific overrides
  const [weights, setWeights] = useState<Record<string, Record<AssessmentType, number>>>({})
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [showClassOverrides, setShowClassOverrides] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'assessment_weights').single()
      if (data?.value) {
        try { setWeights(JSON.parse(data.value)) } catch {}
      }
      // Initialize default weights for any missing grades
      setWeights(prev => {
        const merged = { ...prev }
        for (const g of [1, 2, 3, 4, 5]) {
          if (!merged[String(g)]) merged[String(g)] = DEFAULT_WEIGHTS[g]
        }
        return merged
      })
      setLoaded(true)
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('app_settings').upsert({ key: 'assessment_weights', value: JSON.stringify(weights) }, { onConflict: 'key' })
    setSaving(false)
    showToast('Assessment weights saved')
  }

  const getWeight = (key: string): Record<AssessmentType, number> => {
    return weights[key] || DEFAULT_WEIGHTS[Number(key.split('-')[0])] || { formative: 33, summative: 34, performance_task: 33 }
  }

  const update = (key: string, type: AssessmentType, val: number) => {
    setWeights(prev => ({ ...prev, [key]: { ...getWeight(key), [type]: val } }))
  }

  if (!loaded) return null

  const typeLabels: Record<AssessmentType, string> = {
    formative: 'Formative',
    summative: 'Summative',
    performance_task: 'Performance Task',
  }
  const typeDescs: Record<AssessmentType, string> = {
    formative: 'Quizzes, exit tickets, classwork, homework, participation',
    summative: 'End-of-unit tests, midterms, finals',
    performance_task: 'Projects, presentations, portfolios, writing tasks',
  }

  const classes: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

  return (
    <div className="mb-8">
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Scale size={16} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-navy">Assessment Weights</h3>
            <p className="text-[12px] text-text-secondary">How formative, summative, and performance task grades are weighted. Weights must sum to 100%.</p>
          </div>
        </div>

        {/* Category descriptions */}
        <div className="grid grid-cols-3 gap-2 mb-4 mt-3">
          {(['formative', 'summative', 'performance_task'] as AssessmentType[]).map(type => (
            <div key={type} className="bg-surface-alt/50 rounded-lg px-3 py-2">
              <p className="text-[11px] font-semibold text-navy">{typeLabels[type]}</p>
              <p className="text-[9px] text-text-tertiary mt-0.5">{typeDescs[type]}</p>
            </div>
          ))}
        </div>

        {/* Grade-level defaults */}
        <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Default Weights by Grade</p>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(grade => {
            const key = String(grade)
            const w = getWeight(key)
            const total = w.formative + w.summative + w.performance_task
            const isValid = total === 100
            return (
              <div key={grade} className={`flex items-center gap-4 px-4 py-2.5 rounded-lg border ${isValid ? 'border-border bg-surface-alt/30' : 'border-red-300 bg-red-50/30'}`}>
                <span className="text-[13px] font-bold text-navy w-16">Grade {grade}</span>
                {(['formative', 'summative', 'performance_task'] as AssessmentType[]).map(type => (
                  <div key={type} className="flex items-center gap-1.5">
                    <label className="text-[10px] text-text-secondary w-20">{typeLabels[type]}</label>
                    {isAdmin ? (
                      <input type="number" min={0} max={100} value={w[type]}
                        onChange={e => update(key, type, Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-14 px-2 py-1 border border-border rounded-lg text-center text-[12px] outline-none focus:border-navy" />
                    ) : (
                      <span className="text-[13px] font-semibold text-navy w-14 text-center">{w[type]}%</span>
                    )}
                  </div>
                ))}
                <span className={`text-[11px] font-medium ml-auto ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {total}%{!isValid && ' (must be 100)'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Class-specific overrides */}
        <div className="mt-4">
          <button onClick={() => setShowClassOverrides(!showClassOverrides)}
            className="text-[11px] font-medium text-navy hover:underline flex items-center gap-1">
            <ChevronDown size={12} className={`transition-transform ${showClassOverrides ? 'rotate-180' : ''}`} />
            {showClassOverrides ? 'Hide' : 'Show'} class-specific overrides
          </button>
          <p className="text-[9px] text-text-tertiary mt-1">Override weights for specific class+grade combos (e.g. Lily Grade 1 vs Snapdragon Grade 1)</p>
        </div>

        {showClassOverrides && (
          <div className="mt-3 space-y-4">
            {[1, 2, 3, 4, 5].map(grade => (
              <div key={grade}>
                <p className="text-[11px] font-semibold text-navy mb-1.5">Grade {grade} — Class Overrides</p>
                <div className="space-y-1.5">
                  {classes.map(cls => {
                    const key = `${grade}-${cls}`
                    const hasOverride = !!weights[key]
                    const w = hasOverride ? getWeight(key) : getWeight(String(grade))
                    const total = w.formative + w.summative + w.performance_task
                    const isValid = total === 100
                    return (
                      <div key={cls} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${!hasOverride ? 'border-border/50 bg-surface-alt/20 opacity-60' : isValid ? 'border-border bg-surface-alt/30' : 'border-red-300 bg-red-50/30'}`}>
                        <span className="text-[11px] font-medium w-24" style={{ color: classToTextColor(cls as EnglishClass) }}>{cls}</span>
                        {(['formative', 'summative', 'performance_task'] as AssessmentType[]).map(type => (
                          <div key={type} className="flex items-center gap-1">
                            <label className="text-[9px] text-text-tertiary w-14">{typeLabels[type]}</label>
                            {isAdmin ? (
                              <input type="number" min={0} max={100} value={hasOverride ? w[type] : ''}
                                placeholder={String(getWeight(String(grade))[type])}
                                onChange={e => {
                                  const val = Number(e.target.value)
                                  if (e.target.value === '' && !weights[key]) return
                                  if (e.target.value === '') {
                                    // Clear override
                                    setWeights(prev => { const n = { ...prev }; delete n[key]; return n })
                                  } else {
                                    // Set or create override
                                    const base = getWeight(String(grade))
                                    if (!weights[key]) {
                                      setWeights(prev => ({ ...prev, [key]: { ...base, [type]: Math.max(0, Math.min(100, val || 0)) } }))
                                    } else {
                                      update(key, type, Math.max(0, Math.min(100, val || 0)))
                                    }
                                  }
                                }}
                                className="w-12 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                            ) : (
                              <span className="text-[11px] font-medium w-12 text-center">{hasOverride ? w[type] + '%' : '—'}</span>
                            )}
                          </div>
                        ))}
                        {hasOverride && <span className={`text-[10px] font-medium ml-auto ${isValid ? 'text-green-600' : 'text-red-600'}`}>{total}%</span>}
                        {!hasOverride && <span className="text-[9px] text-text-tertiary ml-auto italic">using default</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end mt-4">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Weights
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SchoolInfoSection() {
  const { language, showToast } = useApp()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('school_settings').select('*').limit(1).single()
      if (data) setSettings(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    const { error } = await supabase
      .from('school_settings')
      .update({
        principal_name: settings.principal_name,
        principal_name_ko: settings.principal_name_ko,
        team_manager: settings.team_manager,
        academic_year: settings.academic_year,
        program_subtitle: settings.program_subtitle,
      })
      .eq('id', settings.id)

    if (error) showToast(`Error: ${error.message}`)
    else showToast(language === 'ko' ? '설정이 저장되었습니다' : 'Settings saved')
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
  if (!settings) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <School size={20} className="text-navy" />
        <h3 className="font-display text-lg font-semibold text-navy">
          {language === 'ko' ? '학교 정보' : 'School Information'}
        </h3>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '교장 선생님' : 'Principal'}
            </label>
            <input value={settings.principal_name || ''} onChange={(e: any) => setSettings({ ...settings, principal_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '교장 선생님 (한글)' : 'Principal (Korean)'}
            </label>
            <input value={settings.principal_name_ko || ''} onChange={(e: any) => setSettings({ ...settings, principal_name_ko: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '팀 매니저' : 'Team Manager'}
            </label>
            <input value={settings.team_manager || ''} onChange={(e: any) => setSettings({ ...settings, team_manager: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '학년도' : 'Academic Year'}
            </label>
            <input value={settings.academic_year || ''} onChange={(e: any) => setSettings({ ...settings, academic_year: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '프로그램 부제' : 'Program Subtitle'}
            </label>
            <input value={settings.program_subtitle || ''} onChange={(e: any) => setSettings({ ...settings, program_subtitle: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {language === 'ko' ? '저장' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
