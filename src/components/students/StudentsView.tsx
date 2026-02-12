'use client'

import { useState, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useStudentActions } from '@/hooks/useData'
import { Student, EnglishClass, Grade, ENGLISH_CLASSES, GRADES, KOREAN_CLASSES, KoreanClass } from '@/types'
import { classToColor, classToTextColor, sortByKoreanClassAndNumber } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Search, Upload, Plus, Printer, FileSpreadsheet, AlertTriangle, X, Loader2, ChevronRight, User, Camera, Pencil, Trash2 } from 'lucide-react'
import BehaviorTracker from '@/components/behavior/BehaviorTracker'

export default function StudentsView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState<Grade | null>(null)
  const [filterClass, setFilterClass] = useState<EnglishClass | null>(null)
  const [sortMode, setSortMode] = useState<'name' | 'korean_class' | 'english_class' | 'grade'>('english_class')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const teacherClass = currentTeacher?.role === 'teacher' ? currentTeacher.english_class as EnglishClass : null

  const { students, loading, refetch } = useStudents({
    grade: filterGrade,
    english_class: filterClass || teacherClass || undefined,
    search: search || undefined,
  })

  const sorted = useMemo(() => {
    let result = [...students]
    if (sortMode === 'korean_class') {
      result = sortByKoreanClassAndNumber(result)
    } else if (sortMode === 'english_class') {
      const classOrder: Record<string, number> = { Lily: 1, Camellia: 2, Daisy: 3, Sunflower: 4, Marigold: 5, Snapdragon: 6 }
      result.sort((a, b) => (classOrder[a.english_class] || 99) - (classOrder[b.english_class] || 99) || a.english_name.localeCompare(b.english_name))
    } else if (sortMode === 'grade') {
      result.sort((a, b) => a.grade - b.grade || a.english_name.localeCompare(b.english_name))
    } else {
      result.sort((a, b) => a.english_name.localeCompare(b.english_name))
    }
    return result
  }, [students, sortMode])

  const duplicates = useMemo(() => {
    const seen = new Map<string, Student[]>()
    students.forEach(s => {
      const key = `${s.grade}-${s.korean_class}-${s.class_number}`
      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push(s)
    })
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
          <div className="flex gap-2">
            <button onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-surface border border-border text-text-primary hover:bg-surface-alt transition-all">
              <Upload size={15} /> {t.students.uploadRoster}
            </button>
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
              <Plus size={15} /> {t.students.addStudent}
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-6">
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
              {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
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
                  <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <tr key={s.id} className="border-t border-border table-row-hover cursor-pointer" onClick={() => setSelectedStudent(s)}>
                    <td className="px-4 py-3 text-text-tertiary">{i + 1}</td>
                    <td className="px-4 py-2">
                      {s.photo_url ? (
                        <img src={s.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-surface-alt flex items-center justify-center"><User size={13} className="text-text-tertiary" /></div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.english_name}</td>
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

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onComplete={() => { setShowAddModal(false); refetch() }} />}
      {selectedStudent && <StudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} onUpdated={(s) => { setSelectedStudent(s); refetch() }} />}
    </div>
  )
}

// ─── Upload Modal ───────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const { language, showToast } = useApp()
  const [dragOver, setDragOver] = useState(false)
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-medium">{language === 'ko' ? '명단 업로드' : 'Upload Roster'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-accent bg-accent-light' : 'border-border hover:border-accent'}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); showToast('Excel parsing coming in next update') }}
            onClick={() => showToast('Excel parsing coming in next update')}>
            <FileSpreadsheet size={40} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-sm font-medium">{language === 'ko' ? 'Excel 파일을 드래그하거나 클릭하세요' : 'Drag & drop Excel roster, or click to browse'}</p>
            <p className="text-xs text-text-tertiary mt-1">.xlsx, .xls, or .csv</p>
          </div>
          <div className="mt-4 p-4 bg-accent-light rounded-lg">
            <p className="text-[12px] text-navy">Required: Korean Name · English Name · Grade · Korean Class · Class Number · English Class</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Student Modal ──────────────────────────────────────────────

function AddStudentModal({ onClose, onComplete }: { onClose: () => void; onComplete: () => void }) {
  const { language, showToast } = useApp()
  const { addStudent } = useStudentActions()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ korean_name: '', english_name: '', grade: 1 as Grade, korean_class: '대' as KoreanClass, class_number: 1, english_class: 'Lily' as EnglishClass })

  const teacherMap: Record<string, string> = {
    Lily: '00000000-0000-0000-0000-000000000001', Camellia: '00000000-0000-0000-0000-000000000002',
    Daisy: '00000000-0000-0000-0000-000000000003', Sunflower: '00000000-0000-0000-0000-000000000004',
    Marigold: '00000000-0000-0000-0000-000000000005', Snapdragon: '00000000-0000-0000-0000-000000000006',
  }

  const handleSave = async () => {
    if (!form.korean_name || !form.english_name) return
    setSaving(true)
    const { error } = await addStudent({ ...form, teacher_id: teacherMap[form.english_class] || null, is_active: true, notes: '', photo_url: '', google_drive_folder_url: '' })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`) } else { showToast(`Added ${form.english_name}`); onComplete() }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-medium">{language === 'ko' ? '학생 추가' : 'Add Student'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Name *</label>
              <input value={form.korean_name} onChange={e => setForm({ ...form, korean_name: e.target.value })} placeholder="김하린"
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-border-focus" /></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Name *</label>
              <input value={form.english_name} onChange={e => setForm({ ...form, english_name: e.target.value })} placeholder="Kim Ha Rin"
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-border-focus" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Grade</label>
              <select value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) as Grade })}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Class</label>
              <select value={form.korean_class} onChange={e => setForm({ ...form, korean_class: e.target.value as KoreanClass })}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
                {KOREAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Number</label>
              <input type="number" min={1} max={35} value={form.class_number} onChange={e => setForm({ ...form, class_number: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-border-focus" /></div>
          </div>
          <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Class</label>
            <select value={form.english_class} onChange={e => setForm({ ...form, english_class: e.target.value as EnglishClass })}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none">
              {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.korean_name || !form.english_name}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />} Add Student</button>
        </div>
      </div>
    </div>
  )
}

// ─── Student Module Tabs ────────────────────────────────────────────

function StudentModuleTabs({ studentId, studentName, lang }: { studentId: string; studentName: string; lang: 'en' | 'ko' }) {
  const [activeTab, setActiveTab] = useState('behavior')
  const tabs = [
    { id: 'behavior', label: lang === 'ko' ? '행동 기록' : 'Behavior Log', icon: '📋' },
    { id: 'academic', label: lang === 'ko' ? '학업 이력' : 'Academic History', icon: '📊' },
    { id: 'leveltest', label: lang === 'ko' ? '레벨 테스트' : 'Level Tests', icon: '📈' },
    { id: 'reading', label: lang === 'ko' ? '읽기 수준' : 'Reading Levels', icon: '📖' },
    { id: 'attendance', label: lang === 'ko' ? '출석' : 'Attendance', icon: '📅' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[12px] font-medium transition-all border-b-2 -mb-px ${activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
            <span className="mr-1">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'behavior' && <BehaviorTracker studentId={studentId} studentName={studentName} />}
      {activeTab !== 'behavior' && (
        <div className="py-8 text-center text-text-tertiary text-[13px]">
          {lang === 'ko' ? '준비 중입니다.' : 'Coming soon.'}
        </div>
      )}
    </div>
  )
}

function StudentModal({ student, onClose, onUpdated }: { student: Student; onClose: () => void; onUpdated: (s: Student) => void }) {
  const { language, showToast } = useApp()
  const { updateStudent } = useStudentActions()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    english_name: student.english_name,
    korean_name: student.korean_name,
    grade: student.grade,
    korean_class: student.korean_class as KoreanClass,
    class_number: student.class_number,
    english_class: student.english_class as EnglishClass,
    notes: student.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(student.photo_url || '')
  const fileRef = useRef<HTMLInputElement>(null)

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

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from('photos').upload(path, file, { upsert: true })
    if (uploadError) {
      // If bucket doesn't exist, use base64 data URL as fallback
      const reader = new FileReader()
      reader.onloadend = async () => {
        const dataUrl = reader.result as string
        const { error: updateError } = await supabase.from('students').update({ photo_url: dataUrl }).eq('id', student.id)
        setUploadingPhoto(false)
        if (updateError) { showToast(`Error: ${updateError.message}`) }
        else { setPhotoUrl(dataUrl); showToast(language === 'ko' ? '사진이 업로드되었습니다' : 'Photo uploaded'); onUpdated({ ...student, photo_url: dataUrl }) }
      }
      reader.readAsDataURL(file)
      return
    }

    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
    const publicUrl = urlData.publicUrl + '?t=' + Date.now()
    const { error: updateError } = await supabase.from('students').update({ photo_url: publicUrl }).eq('id', student.id)
    setUploadingPhoto(false)
    if (updateError) { showToast(`Error: ${updateError.message}`) }
    else { setPhotoUrl(publicUrl); showToast(language === 'ko' ? '사진이 업로드되었습니다' : 'Photo uploaded'); onUpdated({ ...student, photo_url: publicUrl }) }
  }

  const handleRemovePhoto = async () => {
    const { error } = await supabase.from('students').update({ photo_url: '' }).eq('id', student.id)
    if (error) { showToast(`Error: ${error.message}`) }
    else { setPhotoUrl(''); showToast(language === 'ko' ? '사진이 삭제되었습니다' : 'Photo removed'); onUpdated({ ...student, photo_url: '' }) }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    const { data, error } = await updateStudent(student.id, {
      ...form,
      teacher_id: teacherMap[form.english_class] || null,
    })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`) }
    else { showToast(language === 'ko' ? '저장되었습니다' : 'Student updated'); setEditing(false); if (data) onUpdated(data) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-border flex items-start justify-between">
          <div className="flex items-center gap-5">
            {/* Photo */}
            <div className="relative group">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-surface-alt border-2 border-border flex items-center justify-center">
                  <User size={28} className="text-text-tertiary" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                {uploadingPhoto ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
              </button>
              {photoUrl && (
                <button onClick={handleRemovePhoto} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-700">
                  <X size={10} />
                </button>
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
                <span className="text-[12px] text-text-tertiary">{student.korean_class}반 {student.class_number}번</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-navy transition-all" title="Edit">
                <Pencil size={16} />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
          </div>
        </div>

        {/* Edit Mode */}
        {editing && (
          <div className="px-8 py-5 bg-accent-light border-b border-border">
            <h4 className="text-[12px] uppercase tracking-wider text-navy font-semibold mb-3">{language === 'ko' ? '학생 정보 수정' : 'Edit Student Info'}</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Name</label>
                  <input value={form.korean_name} onChange={e => setForm({ ...form, korean_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Name</label>
                  <input value={form.english_name} onChange={e => setForm({ ...form, english_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Grade</label>
                  <select value={form.grade} onChange={e => setForm({ ...form, grade: Number(e.target.value) as Grade })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Korean Class</label>
                  <select value={form.korean_class} onChange={e => setForm({ ...form, korean_class: e.target.value as KoreanClass })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{KOREAN_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Number</label>
                  <input type="number" min={1} max={35} value={form.class_number} onChange={e => setForm({ ...form, class_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy bg-surface" /></div>
                <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">English Class</label>
                  <select value={form.english_class} onChange={e => setForm({ ...form, english_class: e.target.value as EnglishClass })}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none bg-surface">{ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{language === 'ko' ? '메모' : 'Notes'}</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder={language === 'ko' ? '학생 메모...' : 'Student notes...'}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy resize-none bg-surface" /></div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface">{language === 'ko' ? '취소' : 'Cancel'}</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
                  {saving && <Loader2 size={14} className="animate-spin" />} {language === 'ko' ? '저장' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Sections */}
        <div className="px-8 py-6">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Teacher</p>
              <p className="text-[14px] font-medium text-navy">{student.teacher_name || '—'}</p>
            </div>
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{language === 'ko' ? '한국반' : 'Homeroom'}</p>
              <p className="text-[14px] font-medium text-navy">{student.korean_class}반 {student.class_number}번</p>
            </div>
            <div className="bg-surface-alt rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{language === 'ko' ? '상태' : 'Status'}</p>
              <p className="text-[14px] font-medium text-success">{student.is_active ? (language === 'ko' ? '재학' : 'Active') : (language === 'ko' ? '비활성' : 'Inactive')}</p>
            </div>
          </div>

          {/* Notes */}
          {student.notes && (
            <div className="mb-6 p-4 bg-warm-light rounded-lg border border-gold/20">
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-1">{language === 'ko' ? '메모' : 'Notes'}</p>
              <p className="text-[13px] text-amber-900">{student.notes}</p>
            </div>
          )}

          {/* Module Tabs */}
          <StudentModuleTabs studentId={student.id} studentName={student.english_name} lang={language as 'en' | 'ko'} />
        </div>
      </div>
    </div>
  )
}
