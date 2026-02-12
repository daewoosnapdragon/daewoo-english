'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Teacher, ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, UserCog, School, CalendarDays, Plus, Trash2 } from 'lucide-react'

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
      setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, name: newName } : t))
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
              {teachers.map(teacher => {
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
                        onChange={e => setEdits(prev => ({ ...prev, [teacher.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(teacher) }}
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
  const [newSem, setNewSem] = useState({ name: '', name_ko: '', academic_year: '2025-2026', type: 'spring_mid' as string, start_date: '', end_date: '', grades_due_date: '' })

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
      end_date: sem.end_date || null, grades_due_date: sem.grades_due_date || null, is_active: sem.is_active,
    }).eq('id', sem.id)
    setSaving(null)
    if (error) showToast(`Error: ${error.message}`)
    else showToast('Saved')
  }

  const handleSetActive = async (id: string) => {
    // Deactivate all, then activate this one
    await supabase.from('semesters').update({ is_active: false }).neq('id', 'none')
    await supabase.from('semesters').update({ is_active: true }).eq('id', id)
    setSemesters(prev => prev.map(s => ({ ...s, is_active: s.id === id })))
    showToast('Active semester updated')
  }

  const handleAdd = async () => {
    if (!newSem.name.trim()) return
    const { data, error } = await supabase.from('semesters').insert({
      ...newSem, start_date: newSem.start_date || null, end_date: newSem.end_date || null,
      grades_due_date: newSem.grades_due_date || null, is_active: false,
    }).select().single()
    if (error) showToast(`Error: ${error.message}`)
    else { setSemesters(prev => [data, ...prev]); setAdding(false); setNewSem({ name: '', name_ko: '', academic_year: '2025-2026', type: 'spring_mid', start_date: '', end_date: '', grades_due_date: '' }); showToast('Semester added') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this semester? Assessments linked to it will lose their semester reference.')) return
    await supabase.from('semesters').delete().eq('id', id)
    setSemesters(prev => prev.filter(s => s.id !== id))
    showToast('Deleted')
  }

  const updateField = (id: string, field: string, value: any) => {
    setSemesters(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
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
              <input value={newSem.name} onChange={e => setNewSem({ ...newSem, name: e.target.value })} placeholder="e.g. Spring 2026" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Name (Korean)</label>
              <input value={newSem.name_ko} onChange={e => setNewSem({ ...newSem, name_ko: e.target.value })} placeholder="2026 봄학기" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Academic Year</label>
              <input value={newSem.academic_year} onChange={e => setNewSem({ ...newSem, academic_year: e.target.value })} className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
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
            {semesters.map(sem => (
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
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Start Date</label>
                    <input type="date" value={sem.start_date || ''} onChange={e => updateField(sem.id, 'start_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                  <div><label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">End Date</label>
                    <input type="date" value={sem.end_date || ''} onChange={e => updateField(sem.id, 'end_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                  <div><label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grades Due Date</label>
                    <input type="date" value={sem.grades_due_date || ''} onChange={e => updateField(sem.id, 'grades_due_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                </div>
                <p className="text-[9px] text-text-tertiary mt-2">Midterm cutoff = assessments before the midpoint. Report card = all assessments in the semester. Set dates when the yearly plan is available.</p>
              </div>
            ))}
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
            <input value={settings.principal_name || ''} onChange={e => setSettings({ ...settings, principal_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '교장 선생님 (한글)' : 'Principal (Korean)'}
            </label>
            <input value={settings.principal_name_ko || ''} onChange={e => setSettings({ ...settings, principal_name_ko: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '팀 매니저' : 'Team Manager'}
            </label>
            <input value={settings.team_manager || ''} onChange={e => setSettings({ ...settings, team_manager: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '학년도' : 'Academic Year'}
            </label>
            <input value={settings.academic_year || ''} onChange={e => setSettings({ ...settings, academic_year: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div className="col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '프로그램 부제' : 'Program Subtitle'}
            </label>
            <input value={settings.program_subtitle || ''} onChange={e => setSettings({ ...settings, program_subtitle: e.target.value })}
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
