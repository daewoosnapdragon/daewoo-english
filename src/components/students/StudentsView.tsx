'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useStudentActions } from '@/hooks/useData'
import { Student, EnglishClass, Grade, ENGLISH_CLASSES, GRADES, KOREAN_CLASSES, KoreanClass } from '@/types'
import { classToColor, classToTextColor, sortByKoreanClassAndNumber } from '@/lib/utils'
import { Search, Upload, Plus, Printer, FileSpreadsheet, AlertTriangle, X, Loader2, ChevronRight, User } from 'lucide-react'

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
    return Array.from(seen.entries()).filter(([_, ss]) => ss.length > 1)
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
                    <td className="px-4 py-3 text-center">
                      <ChevronRight size={14} className="text-text-tertiary inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onComplete={() => { setShowAddModal(false); refetch() }} />}
      {selectedStudent && <StudentPanel student={selectedStudent} onClose={() => setSelectedStudent(null)} />}
    </div>
  )
}

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

function StudentPanel({ student, onClose }: { student: Student; onClose: () => void }) {
  const { language } = useApp()
  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute right-0 top-0 bottom-0 w-[420px] bg-surface shadow-lg overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <h3 className="font-display text-lg font-medium">{student.english_name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6">
          <div className="bg-surface-alt rounded-xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-border flex items-center justify-center"><User size={20} className="text-text-tertiary" /></div>
              <div><p className="font-medium text-[15px]">{student.english_name}</p><p className="text-text-secondary text-[13px]">{student.korean_name}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div><span className="text-text-tertiary">Grade</span><p className="font-medium">{student.grade}</p></div>
              <div><span className="text-text-tertiary">English Class</span><p><span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: classToColor(student.english_class), color: classToTextColor(student.english_class) }}>{student.english_class}</span></p></div>
              <div><span className="text-text-tertiary">Korean Class</span><p className="font-medium">{student.korean_class}반 {student.class_number}번</p></div>
              <div><span className="text-text-tertiary">Teacher</span><p className="font-medium">{student.teacher_name || '—'}</p></div>
            </div>
          </div>
          {['Academic History', 'Behavior Log', 'Level Test History', 'Reading Levels', 'Attendance', 'Warnings'].map((label, i) => (
            <button key={i} className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-surface-alt transition-all text-left mb-1">
              <p className="text-[13px] font-medium">{label}</p>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
