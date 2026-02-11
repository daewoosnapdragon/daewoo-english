'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Teacher, ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, UserCog, School, Calendar } from 'lucide-react'

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
