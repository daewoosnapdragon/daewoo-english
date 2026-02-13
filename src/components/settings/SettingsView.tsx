'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Teacher, ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, UserCog, School, CalendarDays, Plus, Trash2, Target } from 'lucide-react'

export default function SettingsView() {
  const { language, showToast } = useApp()

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
        <SchoolInfoSection />
      </div>
    </div>
  )
}

function TeacherSection() {
  const { language, showToast } = useApp()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})

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

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <UserCog size={20} className="text-navy" />
        <h3 className="font-display text-lg font-semibold text-navy">
          {language === 'ko' ? '교사 관리' : 'Teacher Management'}
        </h3>
      </div>
      <p className="text-[13px] text-text-secondary mb-4">
        {language === 'ko' ? '교사 이름을 수정하고 Enter를 누르거나 저장 버튼을 클릭하세요.' : 'Edit teacher names and press Enter or click Save. Class assignments are fixed to the 6 English classes.'}
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
                <th className="px-5 py-3 w-20"></th>
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
                    <td className="px-5 py-3">
                      {edited && (
                        <button onClick={() => handleSave(teacher)} disabled={saving === teacher.id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
                          {saving === teacher.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          {language === 'ko' ? '저장' : 'Save'}
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
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.is_head_teacher
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
      Lily:       { cwpm_mid: 5,   cwpm_end: 15,  lexile_min: 0,   lexile_max: 50,  reading_level: 'Pre-A', notes: 'Letter recognition, initial sounds' },
      Camellia:   { cwpm_mid: 12,  cwpm_end: 25,  lexile_min: 0,   lexile_max: 100, reading_level: 'A to B', notes: 'CVC blending, HFW sets 1-2' },
      Daisy:      { cwpm_mid: 20,  cwpm_end: 40,  lexile_min: 50,  lexile_max: 200, reading_level: 'B to D', notes: 'Simple decodable readers' },
      Sunflower:  { cwpm_mid: 30,  cwpm_end: 55,  lexile_min: 100, lexile_max: 300, reading_level: 'D to G', notes: 'Short sentences, basic fluency' },
      Marigold:   { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, reading_level: 'G to J', notes: 'Paragraph reading, comprehension' },
      Snapdragon: { cwpm_mid: 60,  cwpm_end: 90,  lexile_min: 300, lexile_max: 550, reading_level: 'J to M', notes: 'Independent reading, inference' },
    },
    2: {
      Lily:       { cwpm_mid: 8,   cwpm_end: 20,  lexile_min: 0,   lexile_max: 75,  reading_level: 'Pre-A to A', notes: 'Letter-sound relationships' },
      Camellia:   { cwpm_mid: 20,  cwpm_end: 35,  lexile_min: 50,  lexile_max: 150, reading_level: 'B to D', notes: 'CVC mastery, digraphs starting' },
      Daisy:      { cwpm_mid: 30,  cwpm_end: 50,  lexile_min: 100, lexile_max: 300, reading_level: 'D to G', notes: 'Decodable chapter books' },
      Sunflower:  { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, reading_level: 'G to J', notes: 'Developing comprehension' },
      Marigold:   { cwpm_mid: 60,  cwpm_end: 90,  lexile_min: 350, lexile_max: 550, reading_level: 'J to M', notes: 'Chapter books, varied genres' },
      Snapdragon: { cwpm_mid: 80,  cwpm_end: 110, lexile_min: 500, lexile_max: 700, reading_level: 'M to P', notes: 'Complex texts, analysis' },
    },
    3: {
      Lily:       { cwpm_mid: 10,  cwpm_end: 25,  lexile_min: 0,   lexile_max: 100, reading_level: 'A to B', notes: 'Basic decoding, HFW' },
      Camellia:   { cwpm_mid: 25,  cwpm_end: 45,  lexile_min: 50,  lexile_max: 200, reading_level: 'C to F', notes: 'Blends, digraphs, short vowels' },
      Daisy:      { cwpm_mid: 40,  cwpm_end: 65,  lexile_min: 150, lexile_max: 350, reading_level: 'F to I', notes: 'Fluency building, expression' },
      Sunflower:  { cwpm_mid: 55,  cwpm_end: 80,  lexile_min: 300, lexile_max: 500, reading_level: 'I to L', notes: 'Nonfiction, text features' },
      Marigold:   { cwpm_mid: 75,  cwpm_end: 105, lexile_min: 450, lexile_max: 650, reading_level: 'L to O', notes: 'Independent chapter books' },
      Snapdragon: { cwpm_mid: 95,  cwpm_end: 130, lexile_min: 600, lexile_max: 800, reading_level: 'O to R', notes: 'Complex comprehension, writing' },
    },
    4: {
      Lily:       { cwpm_mid: 12,  cwpm_end: 28,  lexile_min: 0,   lexile_max: 100, reading_level: 'A to C', notes: 'Phonics foundations, decoding' },
      Camellia:   { cwpm_mid: 28,  cwpm_end: 50,  lexile_min: 75,  lexile_max: 250, reading_level: 'C to G', notes: 'Multi-syllable words starting' },
      Daisy:      { cwpm_mid: 45,  cwpm_end: 70,  lexile_min: 200, lexile_max: 400, reading_level: 'G to J', notes: 'Fluency and expression' },
      Sunflower:  { cwpm_mid: 65,  cwpm_end: 90,  lexile_min: 350, lexile_max: 550, reading_level: 'J to M', notes: 'Content-area reading' },
      Marigold:   { cwpm_mid: 85,  cwpm_end: 115, lexile_min: 500, lexile_max: 700, reading_level: 'M to P', notes: 'Novel studies, critical thinking' },
      Snapdragon: { cwpm_mid: 105, cwpm_end: 140, lexile_min: 650, lexile_max: 900, reading_level: 'P to S', notes: 'Advanced comprehension, debate' },
    },
    5: {
      Lily:       { cwpm_mid: 15,  cwpm_end: 30,  lexile_min: 0,   lexile_max: 100, reading_level: 'A to C', notes: 'Still building letter-sound, basic decoding' },
      Camellia:   { cwpm_mid: 30,  cwpm_end: 55,  lexile_min: 100, lexile_max: 300, reading_level: 'D to G', notes: 'Blends, vowel teams, HFW mastery' },
      Daisy:      { cwpm_mid: 50,  cwpm_end: 75,  lexile_min: 250, lexile_max: 450, reading_level: 'G to K', notes: 'Paragraph-level fluency' },
      Sunflower:  { cwpm_mid: 70,  cwpm_end: 100, lexile_min: 400, lexile_max: 600, reading_level: 'K to N', notes: 'Nonfiction, academic vocab' },
      Marigold:   { cwpm_mid: 90,  cwpm_end: 120, lexile_min: 550, lexile_max: 750, reading_level: 'N to Q', notes: 'Complex texts, essay writing' },
      Snapdragon: { cwpm_mid: 115, cwpm_end: 150, lexile_min: 700, lexile_max: 950, reading_level: 'Q to T', notes: 'Near grade-level, advanced analysis' },
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
            const d = defaults[g]?.[c] || { cwpm_mid: 0, cwpm_end: 0, lexile_min: 0, lexile_max: 0, reading_level: '', notes: '' }
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
      reading_level: b.reading_level || '',
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
            <p className="text-[10px] text-text-tertiary">CWPM, Lexile, and reading level targets per grade and class. Visible to all teachers.</p>
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
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM Mid</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM End</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Lexile Range</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Focus / Notes</th>
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
                      <input value={b.notes} onChange={(e: any) => updateBenchmark(selectedGrade, cls, 'notes', e.target.value)}
                        className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy" />
                    ) : <span className="text-text-tertiary text-[11px]">{b.notes}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-text-tertiary mt-2">These benchmarks are used for CWPM charts, reading grouping, and progress tracking. They reflect realistic ELL program targets per grade level, not native-speaker norms. Admin can edit.</p>
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
