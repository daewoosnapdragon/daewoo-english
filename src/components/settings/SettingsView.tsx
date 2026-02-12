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
      ...newSem, start_date: newSem.start_date || null, end_date: newSem.end_date || null,
      midterm_cutoff_date: newSem.midterm_cutoff_date || null,
      report_card_cutoff_date: newSem.report_card_cutoff_date || null, is_active: false,
    }).select().single()
    if (error) showToast(`Error: ${error.message}`)
    else { setSemesters((prev: any) => [data, ...prev]); setAdding(false); setNewSem({ name: '', name_ko: '', academic_year: '2025-2026', type: 'spring', start_date: '', end_date: '', midterm_cutoff_date: '', report_card_cutoff_date: '' }); showToast('Semester added') }
  }

  const handleDelete = async (id: string) => {
    // Check for linked data first
    const { count: assessmentCount } = await supabase.from('assessments').select('*', { count: 'exact', head: true }).eq('semester_id', id)
    const { count: commentCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('semester_id', id)
    const linked = (assessmentCount || 0) + (commentCount || 0)

    const msg = linked > 0
      ? `This semester has ${assessmentCount || 0} assessment(s) and ${commentCount || 0} comment(s) linked to it. Deleting will remove the semester reference from these items. Continue?`
      : 'Delete this semester?'
    if (!confirm(msg)) return

    // Unlink assessments and comments first
    if ((assessmentCount || 0) > 0) await supabase.from('assessments').update({ semester_id: null }).eq('semester_id', id)
    if ((commentCount || 0) > 0) await supabase.from('comments').delete().eq('semester_id', id)

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
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Name *</label>
              <input value={newSem.name} onChange={(e: any) => setNewSem({ ...newSem, name: e.target.value })} placeholder="e.g. Spring 2026" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Name (Korean)</label>
              <input value={newSem.name_ko} onChange={(e: any) => setNewSem({ ...newSem, name_ko: e.target.value })} placeholder="2026 봄학기" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Academic Year</label>
              <input value={newSem.academic_year} onChange={(e: any) => setNewSem({ ...newSem, academic_year: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
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
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const defaultBenchmarks = [
    { english_class: 'Lily', cwpm_mid: 15, cwpm_end: 30, lexile_min: 0, lexile_max: 100, reading_level: 'Pre-A to B', notes: 'Letter-sound relationships, basic decoding' },
    { english_class: 'Camellia', cwpm_mid: 30, cwpm_end: 50, lexile_min: 100, lexile_max: 250, reading_level: 'C to F', notes: 'CVC words, simple sentences, HFW sets 1-3' },
    { english_class: 'Daisy', cwpm_mid: 45, cwpm_end: 70, lexile_min: 200, lexile_max: 400, reading_level: 'F to I', notes: 'Decodable readers, basic fluency' },
    { english_class: 'Sunflower', cwpm_mid: 60, cwpm_end: 85, lexile_min: 350, lexile_max: 550, reading_level: 'I to L', notes: 'Short passages, developing comprehension' },
    { english_class: 'Marigold', cwpm_mid: 80, cwpm_end: 110, lexile_min: 500, lexile_max: 700, reading_level: 'L to O', notes: 'Chapter books starting, inference skills' },
    { english_class: 'Snapdragon', cwpm_mid: 100, cwpm_end: 140, lexile_min: 650, lexile_max: 900, reading_level: 'O to R', notes: 'Independent readers, complex comprehension' },
  ]

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('class_benchmarks').select('*').order('display_order')
      if (data && data.length > 0) {
        setBenchmarks(data)
      } else {
        // Initialize with defaults
        setBenchmarks(defaultBenchmarks.map((b, i) => ({ ...b, id: `temp_${i}`, display_order: i })))
      }
      setLoading(false)
    })()
  }, [])

  const updateBenchmark = (idx: number, field: string, value: any) => {
    setBenchmarks((prev) => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  const handleSave = async () => {
    setSaving(true)
    // Delete existing and re-insert all
    await supabase.from('class_benchmarks').delete().gte('display_order', 0)
    const toInsert = benchmarks.map((b, i) => ({
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
    // Reload to get real IDs
    const { data } = await supabase.from('class_benchmarks').select('*').order('display_order')
    if (data) setBenchmarks(data)
  }

  if (loading) return <div className="mb-8 p-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-navy" />
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">Program Benchmarks</h3>
            <p className="text-[10px] text-text-tertiary">CWPM, Lexile, and reading level targets per class. Visible to all teachers.</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Benchmarks
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM Mid</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM End</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Lexile Range</th>
              <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Reading Level</th>
              <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Focus / Notes</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((b, idx) => (
              <tr key={b.id || idx} className="border-t border-border">
                <td className="px-4 py-2.5">
                  <span className="font-semibold text-[13px] px-2 py-0.5 rounded" style={{ backgroundColor: classToColor(b.english_class as EnglishClass), color: classToTextColor(b.english_class as EnglishClass) }}>
                    {b.english_class}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {isAdmin ? (
                    <input type="number" value={b.cwpm_mid} onChange={(e: any) => updateBenchmark(idx, 'cwpm_mid', e.target.value)}
                      className="w-16 px-2 py-1 border border-border rounded text-center text-[12px] outline-none focus:border-navy" />
                  ) : <span className="font-bold text-navy">{b.cwpm_mid}</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {isAdmin ? (
                    <input type="number" value={b.cwpm_end} onChange={(e: any) => updateBenchmark(idx, 'cwpm_end', e.target.value)}
                      className="w-16 px-2 py-1 border border-border rounded text-center text-[12px] outline-none focus:border-navy" />
                  ) : <span className="font-bold text-navy">{b.cwpm_end}</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {isAdmin ? (
                    <span className="flex items-center justify-center gap-1">
                      <input type="number" value={b.lexile_min} onChange={(e: any) => updateBenchmark(idx, 'lexile_min', e.target.value)}
                        className="w-14 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                      <span className="text-text-tertiary">-</span>
                      <input type="number" value={b.lexile_max} onChange={(e: any) => updateBenchmark(idx, 'lexile_max', e.target.value)}
                        className="w-14 px-1.5 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                      <span className="text-[10px] text-text-tertiary">L</span>
                    </span>
                  ) : <span className="text-text-secondary">{b.lexile_min}-{b.lexile_max}L</span>}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {isAdmin ? (
                    <input value={b.reading_level} onChange={(e: any) => updateBenchmark(idx, 'reading_level', e.target.value)}
                      className="w-20 px-2 py-1 border border-border rounded text-center text-[11px] outline-none focus:border-navy" />
                  ) : <span className="text-text-secondary">{b.reading_level}</span>}
                </td>
                <td className="px-3 py-2.5">
                  {isAdmin ? (
                    <input value={b.notes} onChange={(e: any) => updateBenchmark(idx, 'notes', e.target.value)}
                      className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy" />
                  ) : <span className="text-text-tertiary text-[11px]">{b.notes}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-text-tertiary mt-2">These benchmarks are used for CWPM charts, reading grouping, and progress tracking. They should reflect realistic ELL program targets, not native-speaker norms. Admin can edit.</p>
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
