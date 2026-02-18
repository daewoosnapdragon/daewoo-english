'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useStudentActions } from '@/hooks/useData'
import { Student, EnglishClass, Grade, ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, KOREAN_CLASSES, KoreanClass } from '@/types'
import { classToColor, classToTextColor, sortByKoreanClassAndNumber, domainLabel } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Search, Upload, Plus, Printer, FileSpreadsheet, AlertTriangle, X, Loader2, ChevronRight, User, Camera, Pencil, Trash2, Settings2, Download, Users2 } from 'lucide-react'
import BehaviorTracker from '@/components/behavior/BehaviorTracker'
import WIDABadge from '@/components/shared/WIDABadge'
import { WIDAProfiles } from '@/components/curriculum/CurriculumView'
import RosterUploadModal from './RosterUploadModal'
import { exportToCSV } from '@/lib/export'

// ─── Main View ──────────────────────────────────────────────────────

export default function StudentsView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<Grade | null>(null)
  const [filterClass, setFilterClass] = useState<EnglishClass | null>(null)
  const [sortMode, setSortMode] = useState<'name' | 'korean_class' | 'english_class' | 'grade'>('english_class')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showManage, setShowManage] = useState(false)
  const [subView, setSubView] = useState<'roster' | 'wida'>('roster')

  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class as EnglishClass : null

  const { students, loading, refetch } = useStudents({
    grade: filterGrade,
    english_class: filterClass || teacherClass || undefined,
    search: search || undefined,
  })

  const sorted = useMemo(() => {
    let result = [...students]
    if (sortMode === 'korean_class') result = sortByKoreanClassAndNumber(result)
    else if (sortMode === 'english_class') {
      const classOrder: Record<string, number> = { Lily: 1, Camellia: 2, Daisy: 3, Sunflower: 4, Marigold: 5, Snapdragon: 6 }
      result.sort((a, b) => (classOrder[a.english_class] || 99) - (classOrder[b.english_class] || 99) || a.english_name.localeCompare(b.english_name))
    } else if (sortMode === 'grade') result.sort((a, b) => a.grade - b.grade || a.english_name.localeCompare(b.english_name))
    else result.sort((a, b) => a.english_name.localeCompare(b.english_name))
    return result
  }, [students, sortMode])

  const duplicates = useMemo(() => {
    const seen = new Map<string, Student[]>()
    students.forEach(s => { const key = `${s.grade}-${s.korean_class}-${s.class_number}`; if (!seen.has(key)) seen.set(key, []); seen.get(key)!.push(s) })
    return Array.from(seen.entries()).filter(([, ss]) => ss.length > 1)
  }, [students])

  return (
    <div className="animate-fade-in">
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-medium tracking-tight">{t.students.title}</h2>
            <p className="text-text-secondary text-sm mt-1">
              {loading ? '...' : `${sorted.length} ${t.common.students}`}
              {filterGrade ? ` — Grade ${filterGrade}` : ''}
              {(filterClass || teacherClass) ? ` — ${filterClass || teacherClass}` : ''}
            </p>
          </div>
          {/* Manage button - opens panel for Upload Roster / Add Student */}
          <button onClick={() => setShowManage(!showManage)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${showManage ? 'bg-navy text-white' : 'bg-surface border border-border text-text-primary hover:bg-surface-alt'}`}>
            <Settings2 size={15} /> {language === 'ko' ? '학생 관리' : 'Manage Students'}
          </button>
        </div>
        <div className="flex gap-1 mt-4">
          <button onClick={() => setSubView('roster')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${subView === 'roster' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><User size={15} /> Roster</button>
          <button onClick={() => setSubView('wida')} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${subView === 'wida' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}><Users2 size={15} /> WIDA Profiles</button>
        </div>
      </div>

      {subView === 'wida' ? (
        <div className="px-8 py-6"><WIDAProfiles /></div>
      ) : (
      <div className="px-10 py-6">
        {/* Manage Panel - slides open */}
        {showManage && (
          <div className="mb-5 p-5 bg-accent-light border border-border rounded-xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-navy">{language === 'ko' ? '학생 관리' : 'Manage Students'}</h3>
              <button onClick={() => setShowManage(false)} className="p-1 rounded hover:bg-surface-alt"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ManageUploadCard onComplete={refetch} />
              <ManageAddCard onComplete={refetch} />
            </div>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="mb-4 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-medium text-yellow-800">{t.students.duplicateWarning}</p>
              <p className="text-[12px] text-yellow-700 mt-0.5">{duplicates.length} duplicate(s) found.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input type="text" placeholder={`${t.common.search}...`} value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-border-focus transition-colors" />
          </div>
          <select value={filterGrade || ''} onChange={e => setFilterGrade(e.target.value ? Number(e.target.value) as Grade : null)}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none">
            <option value="">{t.common.all} Grades</option>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
          {!teacherClass && (
            <select value={filterClass || ''} onChange={e => setFilterClass((e.target.value || null) as EnglishClass | null)}
              className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none">
              <option value="">{t.common.all} Classes</option>
              {ALL_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider mr-1">Sort:</span>
            {(['english_class', 'korean_class', 'name', 'grade'] as const).map(mode => (
              <button key={mode} onClick={() => setSortMode(mode)}
                className={`px-2.5 py-1.5 rounded text-[11.5px] font-medium transition-all ${sortMode === mode ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                {mode === 'english_class' ? 'Class' : mode === 'korean_class' ? '반/번호' : mode === 'name' ? 'Name' : 'Grade'}
              </button>
            ))}
          </div>
          <button onClick={() => { setSortMode('korean_class'); showToast('Sorted for printing — Korean class → student number') }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-warm text-white hover:opacity-90 transition-all">
            <Printer size={14} /> {t.students.sortForPrinting}
          </button>
          <button onClick={() => {
            exportToCSV('students', ['Name', 'Korean Name', 'Grade', 'English Class', 'Korean Class', 'Class Number', 'Active'],
              sorted.map(s => [s.english_name, s.korean_name, s.grade, s.english_class, s.korean_class, s.class_number, s.is_active ? 'Yes' : 'No']))
            showToast('Exported to CSV')
          }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-surface-alt text-text-secondary hover:bg-border transition-all">
            <Download size={14} /> CSV
          </button>
        </div>

        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" /><p className="text-text-tertiary text-sm">Loading...</p></div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center"><User size={32} className="text-text-tertiary mx-auto mb-2" /><p className="text-text-secondary text-sm">{search ? 'No students match.' : 'No students found.'}</p></div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-alt">
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-10"></th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{t.students.englishName}</th>
                  <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{t.students.koreanName}</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{t.common.grade}</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{t.students.koreanClass}</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">#</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">{t.students.englishClass}</th>
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={s.id} className={`border-t border-border table-row-hover cursor-pointer ${!s.is_active ? 'opacity-40' : ''}`} onClick={() => setSelectedStudent(s)}>
                    <td className="px-4 py-3 text-text-tertiary">{i + 1}</td>
                    <td className="px-4 py-2">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center"><User size={13} className="text-text-tertiary" /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.english_name} <WIDABadge studentId={s.id} compact /></td>
                    <td className="px-4 py-3 text-text-secondary">{s.korean_name}</td>
                    <td className="px-4 py-3 text-center">{s.grade}</td>
                    <td className="px-4 py-3 text-center font-medium">{s.korean_class}</td>
                    <td className="px-4 py-3 text-center">{s.class_number}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: classToColor(s.english_class), color: classToTextColor(s.english_class) }}>
                        {s.english_class}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><ChevronRight size={14} className="text-text-tertiary inline" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      )}

      {selectedStudent && <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} onUpdated={(s) => { setSelectedStudent(s); refetch() }} />}
    </div>
  )
}

// ─── Manage Cards (replaces header buttons) ─────────────────────────

function ManageUploadCard({ onComplete }: { onComplete: () => void }) {
  const { language, showToast } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [existingStudents, setExistingStudents] = useState<Student[]>([])

  const openUpload = async () => {
    const { data } = await supabase.from('students').select('*').eq('is_active', true)
    setExistingStudents(data || [])
    setShowModal(true)
  }

  return (
    <>
      <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-border hover:border-navy/40 bg-surface"
        onClick={openUpload}>
        <FileSpreadsheet size={28} className="mx-auto text-text-tertiary mb-2" />
        <p className="text-[13px] font-medium">{language === 'ko' ? '명단 업로드' : 'Upload Roster'}</p>
        <p className="text-[11px] text-text-tertiary mt-0.5">.xlsx, .xls, or .csv</p>
      </div>
      {showModal && (
        <RosterUploadModal
          existingStudents={existingStudents}
          onComplete={() => { setShowModal(false); onComplete() }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

function ManageAddCard({ onComplete }: { onComplete: () => void }) {
  const { language, showToast } = useApp()
  const { addStudent } = useStudentActions()
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ korean_name: '', english_name: '', grade: 2 as Grade, korean_class: '대' as KoreanClass, class_number: 1, english_class: 'Lily' as EnglishClass })

  const teacherMap: Record<string, string> = {
    Lily: '00000000-0000-0000-0000-000000000001', Camellia: '00000000-0000-0000-0000-000000000002',
    Daisy: '00000000-0000-0000-0000-000000000003', Sunflower: '00000000-0000-0000-0000-000000000004',
    Marigold: '00000000-0000-0000-0000-000000000005', Snapdragon: '00000000-0000-0000-0000-000000000006',
  }

  const handleSave = async () => {
    if (!form.korean_name || !form.english_name) return
    setSaving(true)
    // Check for duplicate before insert
    const { data: existing } = await supabase.from('students').select('id, english_name').eq('grade', form.grade).eq('korean_class', form.korean_class).eq('class_number', form.class_number).eq('is_active', true).limit(1)
    if (existing && existing.length > 0) {
      setSaving(false)
      showToast(`A student already exists with ${form.korean_class} #${form.class_number} in Grade ${form.grade} (${existing[0].english_name}). Change the class number or edit the existing student.`)
      return
    }
    const { error } = await addStudent({ ...form, teacher_id: teacherMap[form.english_class] || null, is_active: true, notes: '', photo_url: '', google_drive_folder_url: '' })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(`Added ${form.english_name}`); setForm({ korean_name: '', english_name: '', grade: 2 as Grade, korean_class: '대' as KoreanClass, class_number: 1, english_class: 'Lily' as EnglishClass }); onComplete() }
  }

  if (!show) {
    return (
      <div className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors border-border hover:border-navy/40 bg-surface"
        onClick={() => setShow(true)}>
        <Plus size={28} className="mx-auto text-text-tertiary mb-2" />
        <p className="text-[13px] font-medium">{language === 'ko' ? '학생 추가' : 'Add Student'}</p>
        <p className="text-[11px] text-text-tertiary mt-0.5">{language === 'ko' ? '개별 학생 추가' : 'Add individual student'}</p>
      </div>
    )
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-surface space-y-3">
      <div className="flex items-center justify-between"><h4 className="text-[12px] font-semibold text-navy">Add Student</h4><button onClick={() => setShow(false)} className="p-1 rounded hover:bg-surface-alt"><X size={12} /></button></div>
      <div className="grid grid-cols-2 gap-2">
        <input value={form.korean_name} onChange={e => setForm({ ...form, korean_name: e.target.value })} placeholder="Korean Name" className="px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
        <input value={form.english_name} onChange={e => setForm({ ...form, english_name: e.target.value })} placeholder="English Name" className="px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <select value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) as Grade })} className="px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
          {GRADES.map(g => <option key={g} value={g}>G{g}</option>)}</select>
        <select value={form.korean_class} onChange={e => setForm({ ...form, korean_class: e.target.value as KoreanClass })} className="px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
          {KOREAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <input type="number" min={1} max={35} value={form.class_number} onChange={e => setForm({ ...form, class_number: parseInt(e.target.value) || 1 })} className="px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none text-center" />
        <select value={form.english_class} onChange={e => setForm({ ...form, english_class: e.target.value as EnglishClass })} className="px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
          {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>
      <div className="flex gap-2">
        <button onClick={async () => { await handleSave(); setShow(false) }} disabled={saving || !form.korean_name || !form.english_name}
          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-surface-alt text-text-secondary hover:bg-border disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving && <Loader2 size={12} className="animate-spin" />} Add & Close
        </button>
        <button onClick={handleSave} disabled={saving || !form.korean_name || !form.english_name}
          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center justify-center gap-1.5">
          {saving && <Loader2 size={12} className="animate-spin" />} Save & Add Another
        </button>
      </div>
    </div>
  )
}

// ─── Student Module Tabs ────────────────────────────────────────────

function StudentModuleTabs({ studentId, studentName, lang }: { studentId: string; studentName: string; lang: 'en' | 'ko' }) {
  const [activeTab, setActiveTab] = useState('about')
  const tabs = [
    { id: 'about', label: lang === 'ko' ? '정보' : 'About' },
    { id: 'notes', label: lang === 'ko' ? '메모' : 'Quick Notes' },
    { id: 'behavior', label: lang === 'ko' ? '행동 기록' : 'Behavior Log' },
    { id: 'academic', label: lang === 'ko' ? '학업 이력' : 'Academic History' },
    { id: 'reading', label: lang === 'ko' ? '읽기 수준' : 'Reading' },
    { id: 'attendance', label: lang === 'ko' ? '출석' : 'Attendance' },
    { id: 'standards', label: lang === 'ko' ? '표준 숙달' : 'Standards' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[12px] font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'about' && <AboutTab studentId={studentId} lang={lang} />}
      {activeTab === 'notes' && <QuickNotesTab studentId={studentId} />}
      {activeTab === 'behavior' && <BehaviorTracker studentId={studentId} studentName={studentName} />}
      {activeTab === 'academic' && <AcademicHistoryTab studentId={studentId} lang={lang} />}
      {activeTab === 'reading' && <ReadingTabInModal studentId={studentId} lang={lang} />}
      {activeTab === 'attendance' && <AttendanceTabInModal studentId={studentId} studentName={studentName} lang={lang} />}
      {activeTab === 'standards' && <StandardsMasteryTab studentId={studentId} lang={lang} />}
    </div>
  )
}

// ─── About Tab ──────────────────────────────────────────────────────

function AboutTab({ studentId, lang }: { studentId: string; lang: 'en' | 'ko' }) {
  const { showToast } = useApp()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useState(() => {
    (async () => {
      const { data } = await supabase.from('students').select('notes').eq('id', studentId).single()
      if (data) setNotes(data.notes || '')
      setLoading(false)
    })()
  })

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('students').update({ notes }).eq('id', studentId)
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '저장되었습니다' : 'Notes saved'); setDirty(false) }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
            {lang === 'ko' ? '학생 정보 / 메모' : 'About This Student'}
          </label>
          {dirty && (
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              {saving ? <Loader2 size={10} className="animate-spin" /> : null} {lang === 'ko' ? '저장' : 'Save'}
            </button>
          )}
        </div>
        <textarea value={notes} onChange={e => { setNotes(e.target.value); setDirty(true) }} rows={5}
          placeholder={lang === 'ko' ? '학생에 대한 중요한 정보, 메모, 알레르기, 특이사항 등...' : 'Important info about this student — allergies, notes for subs, learning needs, parent communication, anything teachers should know...'}
          className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none bg-surface leading-relaxed" />
        <p className="text-[10px] text-text-tertiary mt-1">{lang === 'ko' ? '모든 교사가 볼 수 있습니다' : 'Visible to all teachers in this class'}</p>
      </div>
    </div>
  )
}

// ─── Quick Notes Tab ────────────────────────────────────────────────

const NOTE_CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
  { value: 'academic', label: 'Academic', color: 'bg-blue-100 text-blue-700' },
  { value: 'behavior', label: 'Behavior', color: 'bg-amber-100 text-amber-700' },
  { value: 'social', label: 'Social/Emotional', color: 'bg-purple-100 text-purple-700' },
  { value: 'parent', label: 'Parent Communication', color: 'bg-green-100 text-green-700' },
  { value: 'followup', label: 'Follow Up Needed', color: 'bg-red-100 text-red-700' },
]

function QuickNotesTab({ studentId }: { studentId: string }) {
  const { currentTeacher, showToast } = useApp()
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [saving, setSaving] = useState(false)
  const [tableExists, setTableExists] = useState(true)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_notes')
        .select('*, teachers(name)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error && (error.message.includes('does not exist') || error.code === '42P01' || error.message.includes('schema cache'))) {
        if (error.message.includes('category')) {
          // Column missing - try without category
          const { data: d2 } = await supabase.from('student_notes').select('id, student_id, note, created_by, created_at, teachers(name)').eq('student_id', studentId).order('created_at', { ascending: false }).limit(50)
          setNotes((d2 || []).map((n: any) => ({ ...n, category: 'general' })))
          setLoading(false)
          return
        }
        setTableExists(false)
        setLoading(false)
        return
      }
      setNotes(data || [])
    } catch {
      setTableExists(false)
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => { loadNotes() }, [loadNotes])

  const handleAdd = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    const { error } = await supabase.from('student_notes').insert({
      student_id: studentId,
      note: newNote.trim(),
      category: newCategory,
      created_by: currentTeacher?.id,
    })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { setNewNote(''); loadNotes() }
  }

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase.from('student_notes').delete().eq('id', noteId)
    if (error) showToast(`Error: ${error.message}`)
    else loadNotes()
  }

  if (!tableExists) {
    return <p className="text-[12px] text-text-tertiary py-4">Run the student_notes migration in Supabase to enable Quick Notes.</p>
  }

  const getCat = (c: string) => NOTE_CATEGORIES.find(x => x.value === c) || NOTE_CATEGORIES[0]

  return (
    <div className="space-y-4">
      {/* Add note */}
      <div className="bg-surface border border-border rounded-xl p-3">
        <div className="flex gap-2 mb-2">
          <input value={newNote} onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
            placeholder="Quick note... (Enter to save)"
            className="flex-1 px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" autoFocus />
          <button onClick={handleAdd} disabled={saving || !newNote.trim()}
            className="px-4 py-2 rounded-lg text-[11px] font-semibold bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Add'}
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {NOTE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setNewCategory(c.value)}
              className={`px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all ${newCategory === c.value ? c.color + ' ring-1 ring-navy/30' : 'bg-surface-alt text-text-tertiary hover:bg-border'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes timeline */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>
      ) : notes.length === 0 ? (
        <p className="text-[12px] text-text-tertiary text-center py-6">No notes yet. Add your first one above.</p>
      ) : (
        <div className="space-y-1.5">
          {notes.map((n: any) => {
            const cat = getCat(n.category)
            const date = new Date(n.created_at)
            const isOwn = n.created_by === currentTeacher?.id
            return (
              <div key={n.id} className="flex items-start gap-2 group">
                <div className="w-1.5 h-1.5 rounded-full bg-navy/30 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${cat.color}`}>{cat.label}</span>
                    <span className="text-[10px] text-text-tertiary">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-text-tertiary">by {n.teachers?.name || 'Unknown'}</span>
                    {isOwn && (
                      <button onClick={() => handleDelete(n.id)} className="opacity-0 group-hover:opacity-100 text-[9px] text-red-400 hover:text-red-600 transition-opacity ml-1">delete</button>
                    )}
                  </div>
                  <p className="text-[12px] text-text-primary mt-0.5 leading-relaxed">{n.note}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Academic History Tab (Domain Graphs) ───────────────────────────

function AcademicHistoryTab({ studentId, lang }: { studentId: string; lang: 'en' | 'ko' }) {
  const [data, setData] = useState<{ domain: string; assessments: { name: string; score: number; max: number; pct: number; classAvg: number | null; date: string | null }[] }[]>([])
  const [loading, setLoading] = useState(true)

  const DOMAIN_LABELS: Record<string, Record<string, string>> = {
    reading: { en: 'Reading', ko: '읽기' }, phonics: { en: 'Phonics', ko: '파닉스' },
    writing: { en: 'Writing', ko: '쓰기' }, speaking: { en: 'Speaking', ko: '말하기' },
    language: { en: 'Language', ko: '언어' },
  }
  const domainColors: Record<string, string> = { reading: '#3B82F6', phonics: '#8B5CF6', writing: '#F59E0B', speaking: '#22C55E', language: '#EC4899' }

  useState(() => {
    (async () => {
      // Get all grades for this student with assessment info
      const { data: grades } = await supabase.from('grades').select('score, assessment_id, assessments(name, domain, max_score, date)').eq('student_id', studentId).not('score', 'is', null)
      if (!grades || grades.length === 0) { setLoading(false); return }

      // Group by domain
      const byDomain: Record<string, { name: string; score: number; max: number; pct: number; date: string | null; assessmentId: string }[]> = {}
      for (const g of grades) {
        const a = (g as any).assessments
        if (!a) continue
        if (!byDomain[a.domain]) byDomain[a.domain] = []
        byDomain[a.domain].push({ name: a.name, score: g.score, max: a.max_score, pct: a.max_score > 0 ? (g.score / a.max_score) * 100 : 0, date: a.date, assessmentId: g.assessment_id })
      }

      // Get class averages for each assessment
      const allIds = grades.map(g => g.assessment_id)
      const { data: allGrades } = await supabase.from('grades').select('assessment_id, score').in('assessment_id', allIds).not('score', 'is', null)
      const avgMap: Record<string, number> = {}
      if (allGrades) {
        const grouped: Record<string, number[]> = {}
        allGrades.forEach(g => { if (!grouped[g.assessment_id]) grouped[g.assessment_id] = []; grouped[g.assessment_id].push(g.score) })
        for (const [id, scores] of Object.entries(grouped)) {
          avgMap[id] = scores.reduce((a, b) => a + b, 0) / scores.length
        }
      }

      const result = Object.entries(byDomain).map(([domain, items]) => ({
        domain,
        assessments: items.map(item => ({
          ...item,
          classAvg: avgMap[item.assessmentId] != null && item.max > 0 ? (avgMap[item.assessmentId] / item.max) * 100 : null
        }))
      }))
      setData(result); setLoading(false)
    })()
  })

  if (loading) return <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto mb-2" /><p className="text-text-tertiary text-[12px]">Loading grades...</p></div>
  if (data.length === 0) return <div className="py-8 text-center text-text-tertiary text-[13px]">{lang === 'ko' ? '아직 성적이 없습니다.' : 'No grades recorded yet for this student.'}</div>

  return (
    <div className="space-y-4">
      {data.map(({ domain, assessments }) => {
        const color = domainColors[domain] || '#6B7280'
        const domAvg = assessments.length > 0 ? assessments.reduce((s, a) => s + a.pct, 0) / assessments.length : 0
        return (
          <div key={domain} className="border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between" style={{ backgroundColor: `${color}08` }}>
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color }}>{DOMAIN_LABELS[domain]?.[lang] || domain}</span>
              <span className="text-[13px] font-bold" style={{ color }}>{domAvg.toFixed(1)}%</span>
            </div>
            <div className="p-3 space-y-1.5">
              {assessments.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-secondary w-24 truncate text-right" title={a.name}>{a.name}</span>
                  <div className="flex-1 h-5 bg-surface-alt rounded overflow-hidden relative">
                    {/* Class avg marker */}
                    {a.classAvg != null && (
                      <div className="absolute top-0 bottom-0 w-px bg-navy/40 z-10" style={{ left: `${a.classAvg}%` }} title={`Class avg: ${a.classAvg.toFixed(0)}%`}>
                        <div className="absolute -top-0.5 -left-[3px] w-[7px] h-[7px] rounded-full bg-navy/40" />
                      </div>
                    )}
                    <div className="h-full rounded transition-all duration-500" style={{ width: `${Math.max(a.pct, 3)}%`, backgroundColor: `${color}CC` }} />
                  </div>
                  <span className="text-[10px] font-semibold w-12 text-right" style={{ color: a.pct >= 80 ? '#059669' : a.pct >= 60 ? '#d97706' : '#DC2626' }}>{a.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-1.5 border-t border-border/50 bg-surface-alt/50 flex items-center gap-4 text-[9px] text-text-tertiary">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ backgroundColor: `${color}CC` }} /> Student</span>
              <span className="flex items-center gap-1"><span className="w-px h-3 bg-navy/40 inline-block" /><span className="w-1.5 h-1.5 rounded-full bg-navy/40" /> Class Average</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Student Modal (BIGGER) ─────────────────────────────────────────

function StudentModal({ student, onClose, onUpdated }: { student: Student; onClose: () => void; onUpdated: (s: Student) => void }) {
  const { language, showToast } = useApp()
  const { updateStudent } = useStudentActions()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({
    english_name: student.english_name, korean_name: student.korean_name, grade: student.grade,
    korean_class: student.korean_class as KoreanClass, class_number: student.class_number,
    english_class: student.english_class as EnglishClass, notes: student.notes || '',
    is_transfer: (student as any).is_transfer || false, transfer_date: (student as any).transfer_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(student.photo_url || '')
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDelete = async () => {
    const counts: Record<string, number> = {}
    const tables = ['semester_grades', 'grades', 'summative_scores', 'comments', 'reading_assessments', 'behavior_logs', 'attendance', 'level_test_scores']
    for (const t of tables) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('student_id', student.id)
      if ((count || 0) > 0) counts[t] = count || 0
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    const details = Object.entries(counts).map(([t, c]) => `${c} ${t.replace(/_/g, ' ')}`).join(', ')
    const msg = total > 0
      ? `Delete ${student.english_name}?\n\nThis will permanently remove ${total} linked records:\n${details}\n\nThis cannot be undone.`
      : `Delete ${student.english_name}? This cannot be undone.`
    
    if (!confirm(msg)) return

    setDeleting(true)
    const { error } = await supabase.from('students').delete().eq('id', student.id)
    setDeleting(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(`${student.english_name} deleted`); onClose(); onUpdated(student) }
  }

  const handleExportPDF = async () => {
    showToast('Generating student portfolio...')
    const [grades, semGrades, reading, behavior, attendance, comments] = await Promise.all([
      supabase.from('grades').select('*, assessments(name, domain, date)').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('semester_grades').select('*, semesters(name)').eq('student_id', student.id),
      supabase.from('reading_assessments').select('*').eq('student_id', student.id).order('date', { ascending: true }),
      supabase.from('behavior_logs').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(50),
      supabase.from('attendance').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(100),
      supabase.from('comments').select('*, semesters(name)').eq('student_id', student.id),
    ])
    const html = buildStudentPDFHtml(student, {
      grades: grades.data || [], semesterGrades: semGrades.data || [],
      readingRecords: reading.data || [], behaviorLogs: behavior.data || [],
      attendanceRecords: attendance.data || [], comments: comments.data || [],
    })
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const teacherMap: Record<string, string> = {
    Lily: '00000000-0000-0000-0000-000000000001', Camellia: '00000000-0000-0000-0000-000000000002',
    Daisy: '00000000-0000-0000-0000-000000000003', Sunflower: '00000000-0000-0000-0000-000000000004',
    Marigold: '00000000-0000-0000-0000-000000000005', Snapdragon: '00000000-0000-0000-0000-000000000006',
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { showToast('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB'); return }
    setUploadingPhoto(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `student-photos/${student.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (uploadError) {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const dataUrl = reader.result as string
        const { error } = await supabase.from('students').update({ photo_url: dataUrl }).eq('id', student.id)
        setUploadingPhoto(false)
        if (!error) { setPhotoUrl(dataUrl); showToast('Photo uploaded'); onUpdated({ ...student, photo_url: dataUrl }) }
      }
      reader.readAsDataURL(file)
      return
    }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('students').update({ photo_url: publicUrl }).eq('id', student.id)
    setUploadingPhoto(false)
    setPhotoUrl(publicUrl); showToast('Photo uploaded'); onUpdated({ ...student, photo_url: publicUrl })
  }

  const handleRemovePhoto = async () => {
    await supabase.from('students').update({ photo_url: '' }).eq('id', student.id)
    setPhotoUrl(''); showToast('Photo removed'); onUpdated({ ...student, photo_url: '' })
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    const updateData: any = { ...form, teacher_id: teacherMap[form.english_class] || null }
    if ((form as any).is_transfer !== undefined) { updateData.is_transfer = (form as any).is_transfer; updateData.transfer_date = (form as any).transfer_date || null }
    const { data, error } = await updateStudent(student.id, updateData)
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast('Student updated'); setEditing(false); if (data) onUpdated(data) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      {/* BIGGER MODAL: max-w-4xl */}
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface-alt border-2 border-border flex items-center justify-center"><User size={28} className="text-text-tertiary" /></div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingPhoto}
                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                {uploadingPhoto ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
              </button>
              {photoUrl && (
                <button onClick={handleRemovePhoto} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700"><X size={10} /></button>
              )}
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-navy">{student.english_name}</h3>
              <p className="text-text-secondary text-[14px]">{student.korean_name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[12px] text-text-tertiary">Grade {student.grade}</span>
                <span className="text-text-tertiary">·</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ backgroundColor: classToColor(student.english_class as EnglishClass), color: classToTextColor(student.english_class as EnglishClass) }}>
                  {student.english_class}
                </span>
                <span className="text-text-tertiary">·</span>
                <span className="text-[12px] text-text-tertiary">{student.korean_class} {student.class_number}</span>
                {(student as any).is_transfer && (
                  <>
                    <span className="text-text-tertiary">·</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                      Transfer {(student as any).transfer_date ? `(${new Date((student as any).transfer_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export PDF */}
            <button onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface border border-border text-text-secondary hover:bg-surface-alt transition-all"
              title="Export student portfolio as PDF">
              <FileSpreadsheet size={13} /> Export PDF
            </button>
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-navy transition-all" title="Edit"><Pencil size={16} /></button>
            )}
            <button onClick={handleDelete} disabled={deleting}
              className="p-2 rounded-lg hover:bg-red-50 text-text-tertiary hover:text-red-500 transition-all" title="Delete student">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
          </div>
        </div>

        {/* Edit Mode */}
        {editing && (
          <div className="px-8 py-5 bg-accent-light border-b border-border">
            <h4 className="text-[12px] uppercase tracking-wider text-navy font-semibold mb-3">Edit Student Info</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Name</label>
                  <input value={form.korean_name} onChange={e => setForm({ ...form, korean_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Name</label>
                  <input value={form.english_name} onChange={e => setForm({ ...form, english_name: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Grade</label>
                  <select value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) as Grade })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Class</label>
                  <select value={form.korean_class} onChange={e => setForm({ ...form, korean_class: e.target.value as KoreanClass })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{KOREAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Number</label>
                  <input type="number" min={1} max={35} value={form.class_number} onChange={e => setForm({ ...form, class_number: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Class</label>
                  <select value={form.english_class} onChange={e => setForm({ ...form, english_class: e.target.value as EnglishClass })} className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              {/* Transfer Student */}
              <div className="flex items-center gap-4 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(form as any).is_transfer || false}
                    onChange={e => setForm({ ...form, is_transfer: e.target.checked, transfer_date: e.target.checked ? ((form as any).transfer_date || new Date().toISOString().split('T')[0]) : '' } as any)}
                    className="w-4 h-4 rounded border-border text-navy focus:ring-navy" />
                  <span className="text-[12px] font-medium text-text-secondary">Transfer Student</span>
                </label>
                {(form as any).is_transfer && (
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Transfer Date:</label>
                    <input type="date" value={(form as any).transfer_date || ''} onChange={e => setForm({ ...form, transfer_date: e.target.value } as any)}
                      className="px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
                  {saving && <Loader2 size={14} className="animate-spin" />} Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Teacher</p>
              <p className="text-[14px] font-medium text-navy">{student.teacher_name || '—'}</p>
            </div>
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Homeroom</p>
              <p className="text-[14px] font-medium text-navy">{student.korean_class} {student.class_number}</p>
            </div>
          </div>

          <StudentModuleTabs studentId={student.id} studentName={student.english_name} lang={language as 'en' | 'ko'} />
        </div>
      </div>
    </div>
  )
}

// ─── Reading Tab (in Modal) ──────────────────────────────────────────

function ReadingTabInModal({ studentId, lang }: { studentId: string; lang: 'en' | 'ko' }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false })
      if (data) setRecords(data)
      setLoading(false)
    })()
  }, [studentId])

  if (loading) return <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>
  if (records.length === 0) return <div className="py-8 text-center text-text-tertiary text-[13px]">{lang === 'ko' ? '읽기 기록이 없습니다.' : 'No reading assessments recorded yet.'}</div>

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-text-tertiary">{records.length} {lang === 'ko' ? '개 기록' : 'assessments recorded'}</p>
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Date</th>
            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM</th>
            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Accuracy</th>
            <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Level</th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Notes</th>
          </tr></thead>
          <tbody>
            {records.map((r: any) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                <td className="px-3 py-2 text-center font-semibold text-navy">{r.cwpm != null ? Math.round(r.cwpm) : '—'}</td>
                <td className="px-3 py-2 text-center">{r.accuracy_rate != null ? `${r.accuracy_rate}%` : '—'}</td>
                <td className="px-3 py-2 text-center">{r.passage_level || r.reading_level || '—'}</td>
                <td className="px-3 py-2 text-text-tertiary truncate max-w-[150px]">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Attendance Tab (in Modal) ──────────────────────────────────────

function AttendanceTabInModal({ studentId, studentName, lang }: { studentId: string; studentName: string; lang: 'en' | 'ko' }) {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(100)
      if (data) setRecords(data)
      setLoading(false)
    })()
  }, [studentId])

  if (loading) return <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>

  const counts = { present: 0, absent: 0, tardy: 0, field_trip: 0 }
  records.forEach((r: any) => { if (counts[r.status as keyof typeof counts] !== undefined) counts[r.status as keyof typeof counts]++ })
  const total = records.length

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-green-700">{counts.present}</p>
          <p className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">{lang === 'ko' ? '출석' : 'Present'}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-red-700">{counts.absent}</p>
          <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">{lang === 'ko' ? '결석' : 'Absent'}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-amber-700">{counts.tardy}</p>
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">{lang === 'ko' ? '지각' : 'Tardy'}</p>
        </div>
        <div className="bg-surface-alt border border-border rounded-lg p-3 text-center">
          <p className="text-[20px] font-bold text-navy">{total}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{lang === 'ko' ? '전체' : 'Total Days'}</p>
        </div>
      </div>

      {/* Attendance rate */}
      {total > 0 && (
        <div className="bg-surface-alt rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] font-semibold text-text-secondary">Attendance Rate</span>
            <span className="text-[13px] font-bold text-navy">{((counts.present / total) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(counts.present / total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Recent records */}
      {records.length === 0 ? (
        <p className="text-center text-text-tertiary text-[13px] py-4">{lang === 'ko' ? '출석 기록이 없습니다.' : 'No attendance records yet.'}</p>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0"><tr className="bg-surface-alt">
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Date</th>
              <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Status</th>
              <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Note</th>
            </tr></thead>
            <tbody>
              {records.slice(0, 30).map((r: any) => {
                const colors: Record<string, string> = { present: 'text-green-600', absent: 'text-red-600', tardy: 'text-amber-600', field_trip: 'text-teal-600' }
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-1.5">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</td>
                    <td className={`px-3 py-1.5 text-center font-semibold capitalize ${colors[r.status] || ''}`}>{r.status === 'field_trip' ? 'Field Trip' : r.status}</td>
                    <td className="px-3 py-1.5 text-text-tertiary">{r.note || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Standards Mastery Tab ──────────────────────────────────────────

function StandardsMasteryTab({ studentId, lang }: { studentId: string; lang: 'en' | 'ko' }) {
  const [loading, setLoading] = useState(true)
  const [standardsData, setStandardsData] = useState<{ code: string; description: string; domain: string; assessments: { name: string; pct: number }[]; avgPct: number }[]>([])

  useEffect(() => {
    (async () => {
      // Get all assessments that have standards tagged
      const { data: assessments } = await supabase.from('assessments').select('*')
      // Get all grades for this student
      const { data: grades } = await supabase.from('grades').select('*').eq('student_id', studentId)

      if (!assessments || !grades) { setLoading(false); return }

      // Build a map: standard_code -> list of { assessment_name, score_pct }
      const stdMap = new Map<string, { code: string; description: string; domain: string; assessments: { name: string; pct: number }[] }>()

      assessments.forEach((a: any) => {
        if (!a.standards || a.standards.length === 0) return
        const grade = grades.find((g: any) => g.assessment_id === a.id)
        if (!grade || grade.score == null || grade.is_exempt) return
        const pct = (grade.score / a.max_score) * 100

        a.standards.forEach((std: any) => {
          if (!stdMap.has(std.code)) {
            stdMap.set(std.code, { code: std.code, description: std.description || '', domain: a.domain, assessments: [] })
          }
          stdMap.get(std.code)!.assessments.push({ name: a.name, pct })
        })
      })

      // Calculate averages and sort
      const results = Array.from(stdMap.values()).map(s => ({
        ...s,
        avgPct: s.assessments.reduce((sum, a) => sum + a.pct, 0) / s.assessments.length
      })).sort((a, b) => a.code.localeCompare(b.code))

      setStandardsData(results)
      setLoading(false)
    })()
  }, [studentId])

  if (loading) return <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>

  if (standardsData.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-text-tertiary text-[13px]">{lang === 'ko' ? '표준과 연결된 평가가 없습니다.' : 'No standards-tagged assessments found for this student.'}</p>
        <p className="text-text-tertiary text-[11px] mt-1">Tag assessments with CCSS standards in the Grades tab to see mastery data here.</p>
      </div>
    )
  }

  const mastered = standardsData.filter(s => s.avgPct >= 80).length
  const approaching = standardsData.filter(s => s.avgPct >= 60 && s.avgPct < 80).length
  const below = standardsData.filter(s => s.avgPct < 60).length

  const DOMAIN_COLORS: Record<string, string> = {
    reading: '#3b82f6', phonics: '#8b5cf6', writing: '#f59e0b', speaking: '#10b981', language: '#ec4899',
  }

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-[11px] font-semibold text-green-700">{mastered} mastered</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-[11px] font-semibold text-amber-700">{approaching} approaching</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[11px] font-semibold text-red-700">{below} below</span>
        </div>
        <span className="text-[10px] text-text-tertiary ml-2">{standardsData.length} standards across {standardsData.reduce((s, d) => s + d.assessments.length, 0)} assessments</span>
      </div>

      {/* Standards list */}
      <div className="space-y-1.5">
        {standardsData.map(std => {
          const pctColor = std.avgPct >= 80 ? 'text-green-600' : std.avgPct >= 60 ? 'text-amber-600' : 'text-red-600'
          const barColor = std.avgPct >= 80 ? 'bg-green-400' : std.avgPct >= 60 ? 'bg-amber-400' : 'bg-red-400'
          return (
            <div key={std.code} className="bg-surface border border-border rounded-lg px-4 py-2.5 flex items-center gap-3">
              <div className="w-10 text-center">
                <p className={`text-[14px] font-bold ${pctColor}`}>{Math.round(std.avgPct)}%</p>
              </div>
              <div className={`w-1.5 h-8 rounded-full ${barColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-navy">{std.code}</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-white" style={{ backgroundColor: DOMAIN_COLORS[std.domain] || '#6b7280' }}>
                    {std.domain}
                  </span>
                  <span className="text-[9px] text-text-tertiary">{std.assessments.length} assessment{std.assessments.length !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate">{std.description}</p>
              </div>
              {/* Mini progress bar */}
              <div className="w-24 h-2 bg-surface-alt rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, std.avgPct)}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Student PDF Export ─────────────────────────────────────────────

function buildStudentPDFHtml(student: Student, data: {
  grades: any[]; semesterGrades: any[]; readingRecords: any[];
  behaviorLogs: any[]; attendanceRecords: any[]; comments: any[];
}) {
  const { grades, semesterGrades, readingRecords, behaviorLogs, attendanceRecords, comments } = data
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Semester grades grouped
  const semGradesByDomain: Record<string, any[]> = {}
  semesterGrades.forEach((sg: any) => {
    const key = sg.domain || 'Unknown'
    if (!semGradesByDomain[key]) semGradesByDomain[key] = []
    semGradesByDomain[key].push(sg)
  })

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${student.english_name} - Student Portfolio</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 22px; color: #1e3a5f; margin-bottom: 4px; }
  h2 { font-size: 14px; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 4px; margin: 24px 0 10px; }
  h3 { font-size: 12px; color: #475569; margin: 12px 0 6px; }
  .header { border-bottom: 3px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
  .meta { color: #64748b; font-size: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; background: #dbeafe; color: #1e3a5f; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 10px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
  tr:nth-child(even) { background: #f8fafc; }
  .note { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 8px 12px; margin: 8px 0; font-size: 10px; }
  .empty { color: #94a3b8; font-style: italic; padding: 12px 0; }
  @media print { body { padding: 20px; } h2 { break-before: auto; } }
  @page { size: A4; margin: 20mm; }
</style></head><body>
<div class="header">
  <h1>${student.english_name} <span style="color:#64748b;font-weight:400">(${student.korean_name})</span></h1>
  <p class="meta">Grade ${student.grade} | <span class="badge">${student.english_class}</span> | ${student.korean_class} ${student.class_number} | Exported: ${date}</p>
</div>

<h2>Semester Grades</h2>
${semesterGrades.length > 0 ? `<table>
  <tr><th>Semester</th><th>Domain</th><th>Score</th><th>Letter</th></tr>
  ${semesterGrades.map((sg: any) => `<tr><td>${sg.semesters?.name || '—'}</td><td>${domainLabel(sg.domain)}</td><td>${sg.score != null ? sg.score.toFixed(1) + '%' : '—'}</td><td>${sg.letter_grade || '—'}</td></tr>`).join('')}
</table>` : '<p class="empty">No semester grades recorded.</p>'}

<h2>Reading Assessments (${readingRecords.length})</h2>
${readingRecords.length > 0 ? `<table>
  <tr><th>Date</th><th>CWPM</th><th>Accuracy</th><th>Passage Level</th><th>Errors</th></tr>
  ${readingRecords.map((r: any) => `<tr><td>${r.date}</td><td>${Math.round(r.cwpm || 0)}</td><td>${r.accuracy_rate != null ? r.accuracy_rate + '%' : '—'}</td><td>${r.passage_level || '—'}</td><td>${r.errors || '—'}</td></tr>`).join('')}
</table>` : '<p class="empty">No reading assessments recorded.</p>'}

<h2>Behavior Log (last 50)</h2>
${behaviorLogs.length > 0 ? `<table>
  <tr><th>Date</th><th>Type</th><th>Category</th><th>Note</th></tr>
  ${behaviorLogs.map((b: any) => `<tr><td>${b.date}</td><td style="color:${b.type === 'positive' ? '#16a34a' : '#dc2626'}">${b.type}</td><td>${b.category || '—'}</td><td>${b.note || '—'}</td></tr>`).join('')}
</table>` : '<p class="empty">No behavior logs recorded.</p>'}

<h2>Attendance Summary</h2>
${attendanceRecords.length > 0 ? (() => {
    const counts: Record<string, number> = { present: 0, absent: 0, tardy: 0, excused: 0 }
    attendanceRecords.forEach((a: any) => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return `<p>Present: ${counts.present} | Absent: ${counts.absent} | Tardy: ${counts.tardy} | Excused: ${counts.excused} | Total: ${attendanceRecords.length}</p>`
  })() : '<p class="empty">No attendance records.</p>'}

<h2>Teacher Comments</h2>
${comments.length > 0 ? comments.map((c: any) => `<div class="note"><strong>${c.semesters?.name || '—'}:</strong> ${c.comment || '—'}</div>`).join('') : '<p class="empty">No comments recorded.</p>'}

<script>window.print()</script>
</body></html>`
}
