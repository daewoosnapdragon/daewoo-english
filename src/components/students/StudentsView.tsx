'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents, useStudentActions } from '@/hooks/useData'
import { Student, EnglishClass, Grade, ENGLISH_CLASSES, ALL_ENGLISH_CLASSES, GRADES, KOREAN_CLASSES, KoreanClass } from '@/types'
import { classToColor, classToTextColor, sortByKoreanClassAndNumber, domainLabel } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Search, Upload, Plus, Printer, FileSpreadsheet, AlertTriangle, X, Loader2, ChevronRight, User, Camera, Pencil, Trash2, Settings2, Download, Users2, CheckCircle2, Circle, Target, Check, RefreshCw } from 'lucide-react'
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
          <button onClick={async () => {
            if (sorted.length === 0) return
            showToast('Generating data cards...')
            const ids = sorted.map(s => s.id)
            const [gradesRes, readingRes, behaviorRes, goalsRes] = await Promise.all([
              supabase.from('semester_grades').select('student_id, domain, score').in('student_id', ids),
              supabase.from('reading_records').select('student_id, cwpm, date').in('student_id', ids).order('date', { ascending: true }),
              supabase.from('behavior_logs').select('student_id, type').in('student_id', ids),
              supabase.from('student_goals').select('student_id, goal_text, completed_at').in('student_id', ids).is('completed_at', null).limit(200),
            ])
            const gradeMap: Record<string, Record<string, number>> = {}
            ;(gradesRes.data || []).forEach((g: any) => { if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {}; gradeMap[g.student_id][g.domain] = g.score })
            const readingMap: Record<string, { cwpm: number; prev: number | null }> = {}
            ;(readingRes.data || []).forEach((r: any) => { const prev = readingMap[r.student_id]?.cwpm ?? null; readingMap[r.student_id] = { cwpm: r.cwpm, prev } })
            const behaviorMap: Record<string, number> = {}
            ;(behaviorRes.data || []).forEach((b: any) => { if (b.type === 'negative') behaviorMap[b.student_id] = (behaviorMap[b.student_id] || 0) + 1 })
            const goalMap: Record<string, string[]> = {}
            ;(goalsRes.data || []).forEach((g: any) => { if (!goalMap[g.student_id]) goalMap[g.student_id] = []; if (goalMap[g.student_id].length < 2) goalMap[g.student_id].push(g.goal_text) })
            const doms = ['reading', 'phonics', 'writing', 'speaking', 'language']
            const domS: Record<string, string> = { reading: 'R', phonics: 'P', writing: 'W', speaking: 'S', language: 'L' }
            const domC: Record<string, string> = { reading: '#3b82f6', phonics: '#8b5cf6', writing: '#f59e0b', speaking: '#10b981', language: '#ec4899' }
            const clBg: Record<string, string> = { Lily: '#fef3c7', Camellia: '#fce7f3', Daisy: '#dbeafe', Sunflower: '#fef9c3', Marigold: '#ffedd5', Snapdragon: '#d1fae5' }
            const clTx: Record<string, string> = { Lily: '#92400e', Camellia: '#9d174d', Daisy: '#1e40af', Sunflower: '#854d0e', Marigold: '#c2410c', Snapdragon: '#065f46' }
            const cards = sorted.map(s => {
              const gr = gradeMap[s.id] || {}
              const vals = doms.map(d => gr[d]).filter(v => v != null) as number[]
              const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
              const tc = avg == null ? '#e2e8f0' : avg >= 80 ? '#22c55e' : avg >= 65 ? '#f59e0b' : '#ef4444'
              const rd = readingMap[s.id]
              const arrow = rd && rd.prev != null ? (rd.cwpm > rd.prev + 2 ? '&#9650;' : rd.cwpm < rd.prev - 2 ? '&#9660;' : '&#9654;') : ''
              const arC = rd && rd.prev != null ? (rd.cwpm > rd.prev + 2 ? '#16a34a' : rd.cwpm < rd.prev - 2 ? '#dc2626' : '#6b7280') : '#6b7280'
              const bN = behaviorMap[s.id] || 0
              const goals = goalMap[s.id] || []
              const bars = doms.map(d => { const p = gr[d] != null ? Math.round(gr[d]) : null; return `<div style="display:flex;align-items:center;gap:3px;margin:1px 0"><span style="font-size:8px;width:10px;font-weight:bold;color:${domC[d]}">${domS[d]}</span><div style="flex:1;height:5px;background:#f1f5f9;border-radius:3px;overflow:hidden"><div style="height:100%;width:${p ?? 0}%;background:${domC[d]};border-radius:3px"></div></div><span style="font-size:8px;color:#64748b;width:24px;text-align:right">${p != null ? p + '%' : '--'}</span></div>` }).join('')
              return `<div style="border:2px solid ${tc};border-radius:10px;padding:10px;page-break-inside:avoid;display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between;align-items:center"><div><span style="font-size:12px;font-weight:700;color:#1e293b">${s.english_name}</span> <span style="font-size:10px;color:#94a3b8">${s.korean_name}</span></div><span style="font-size:9px;padding:1px 6px;border-radius:6px;font-weight:700;background:${clBg[s.english_class] || '#f1f5f9'};color:${clTx[s.english_class] || '#475569'}">${s.english_class}</span></div><div style="display:flex;gap:8px;align-items:center;font-size:10px">${rd ? `<span style="font-weight:700;color:#1e3a5f">${Math.round(rd.cwpm)} CWPM</span><span style="color:${arC};font-size:9px">${arrow}</span>` : '<span style="color:#94a3b8">No ORF</span>'}${(s as any).wida_level ? `<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#eef2ff;color:#4338ca;font-weight:700">WIDA L${(s as any).wida_level}</span>` : ''}${bN > 0 ? `<span style="font-size:8px;padding:1px 4px;border-radius:3px;background:#fef2f2;color:#dc2626;font-weight:600">${bN} incidents</span>` : ''}</div><div style="margin:2px 0">${bars}</div>${goals.length > 0 ? `<div style="border-top:1px solid #f1f5f9;padding-top:3px;margin-top:1px">${goals.map(g => `<p style="font-size:8px;color:#475569;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">&#8226; ${g}</p>`).join('')}</div>` : ''}</div>`
            }).join('')
            const pw = window.open('', '_blank'); if (!pw) return
            pw.document.write(`<!DOCTYPE html><html><head><title>Data Cards</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}@media print{body{padding:6px}.grid{gap:6px}}@page{size:landscape;margin:10mm}</style></head><body><div style="text-align:center;margin-bottom:10px"><h2 style="font-size:14px;color:#1B2A4A;margin:0">Student Data Cards</h2><p style="font-size:10px;color:#999">${filterClass || teacherClass || 'All Classes'} | ${new Date().toLocaleDateString()} | ${sorted.length} students</p></div><div class="grid">${cards}</div><script>window.print()<\/script></body></html>`)
            pw.document.close()
          }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium bg-navy/10 text-navy hover:bg-navy/20 transition-all">
            <FileSpreadsheet size={14} /> Data Cards
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
    { id: 'behavior', label: lang === 'ko' ? '행동 기록' : 'Behavior Log' },
    { id: 'academic', label: lang === 'ko' ? '학업 이력' : 'Academic History' },
    { id: 'reading', label: lang === 'ko' ? '읽기 수준' : 'Reading' },
    { id: 'attendance', label: lang === 'ko' ? '출석' : 'Attendance' },
    { id: 'standards', label: lang === 'ko' ? '표준 숙달' : 'Standards' },
    { id: 'scaffolds', label: lang === 'ko' ? '스캐폴드' : 'Scaffolds' },
    { id: 'groups', label: lang === 'ko' ? '그룹' : 'Groups' },
    { id: 'goals', label: lang === 'ko' ? '목표' : 'Goals' },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[12px] font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'about' && <AboutTab studentId={studentId} lang={lang} />}
      {activeTab === 'behavior' && <BehaviorTracker studentId={studentId} studentName={studentName} />}
      {activeTab === 'academic' && <AcademicHistoryTab studentId={studentId} lang={lang} />}
      {activeTab === 'reading' && <ReadingTabInModal studentId={studentId} lang={lang} />}
      {activeTab === 'attendance' && <AttendanceTabInModal studentId={studentId} studentName={studentName} lang={lang} />}
      {activeTab === 'standards' && <StandardsMasteryTab studentId={studentId} lang={lang} />}
      {activeTab === 'scaffolds' && <ScaffoldsTab studentId={studentId} />}
      {activeTab === 'groups' && <StudentGroupsTab studentId={studentId} studentName={studentName} />}
      {activeTab === 'goals' && <GoalsTab studentId={studentId} studentName={studentName} />}
    </div>
  )
}

// ─── About Tab ──────────────────────────────────────────────────────

// ─── WIDA-to-Performance Insight ──────────────────────────────────

const WIDA_EXPECTED_RANGES: Record<number, { min: number; max: number; label: string }> = {
  1: { min: 40, max: 55, label: 'Entering' },
  2: { min: 50, max: 65, label: 'Emerging' },
  3: { min: 60, max: 75, label: 'Developing' },
  4: { min: 70, max: 85, label: 'Expanding' },
  5: { min: 80, max: 95, label: 'Bridging' },
}

const WIDA_DOMAIN_MAP: Record<string, string[]> = {
  listening: ['listening'],
  speaking: ['speaking'],
  reading: ['reading', 'phonics'],
  writing: ['writing'],
}

function WIDAPerformanceInsight({ studentId, lang }: { studentId: string; lang: string }) {
  const [insights, setInsights] = useState<{ domain: string; widaLevel: number; widaLabel: string; actualPct: number; expected: { min: number; max: number }; status: 'within' | 'above' | 'below'; message: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [missingWida, setMissingWida] = useState(false)

  useEffect(() => {
    ;(async () => {
      // Get WIDA levels
      const { data: widaData } = await supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', studentId)
      if (!widaData || widaData.length === 0) { setMissingWida(true); setLoading(false); return }

      const widaMap: Record<string, number> = {}
      widaData.forEach((w: any) => { if (w.wida_level > 0) widaMap[w.domain] = w.wida_level })
      if (Object.keys(widaMap).length === 0) { setMissingWida(true); setLoading(false); return }

      // Get semester grades
      const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
      if (!sem) { setLoading(false); return }

      const { data: semGrades } = await supabase.from('semester_grades').select('domain, score').eq('student_id', studentId).eq('semester_id', sem.id)
      if (!semGrades || semGrades.length === 0) { setLoading(false); return }

      const gradesByDomain: Record<string, number> = {}
      semGrades.forEach((g: any) => { if (g.score != null) gradesByDomain[g.domain] = g.score })

      // Compare WIDA levels to actual performance
      const newInsights: typeof insights = []
      for (const [widaDomain, widaLevel] of Object.entries(widaMap)) {
        const expected = WIDA_EXPECTED_RANGES[widaLevel]
        if (!expected) continue

        // Find matching grade domains
        const gradeDomains = WIDA_DOMAIN_MAP[widaDomain] || [widaDomain]
        const matchingGrades = gradeDomains.map(d => gradesByDomain[d]).filter(v => v != null)
        if (matchingGrades.length === 0) continue

        const actualPct = matchingGrades.reduce((s, g) => s + g, 0) / matchingGrades.length

        let status: 'within' | 'above' | 'below' = 'within'
        let message = ''
        const name = widaDomain.charAt(0).toUpperCase() + widaDomain.slice(1)

        if (actualPct > expected.max + 5) {
          status = 'above'
          message = `WIDA ${widaLevel} (${expected.label}) in ${name} but scoring ${Math.round(actualPct)}% -- outperforming language level, possible reclassification candidate.`
        } else if (actualPct < expected.min - 5) {
          status = 'below'
          message = `WIDA ${widaLevel} (${expected.label}) in ${name} but scoring ${Math.round(actualPct)}% -- underperforming relative to language proficiency, investigate non-language factors.`
        } else {
          status = 'within'
          message = `WIDA ${widaLevel} (${expected.label}) in ${name}, scoring ${Math.round(actualPct)}% -- within expected range, scaffolding is appropriate.`
        }

        newInsights.push({ domain: widaDomain, widaLevel, widaLabel: expected.label, actualPct, expected, status, message })
      }

      setInsights(newInsights)
      setLoading(false)
    })()
  }, [studentId])

  if (loading) return null
  if (missingWida) return (
    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
      <p className="text-[11px] text-blue-700">Complete this student's WIDA profile to unlock performance insights.</p>
    </div>
  )
  if (insights.length === 0) return null

  const flagged = insights.filter(i => i.status !== 'within')

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
        <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">WIDA-to-Performance Analysis</p>
      </div>
      <div className="p-4 space-y-2">
        {insights.map((ins, i) => {
          const colors = ins.status === 'above' ? 'bg-green-50 border-green-200 text-green-800'
            : ins.status === 'below' ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-surface-alt border-border text-text-secondary'
          return (
            <div key={i} className={`px-3 py-2 rounded-lg border ${colors}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-semibold capitalize">{ins.domain}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/60">WIDA {ins.widaLevel}</span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/60">Actual: {Math.round(ins.actualPct)}%</span>
                  <span className="text-[9px] text-text-tertiary">Expected: {ins.expected.min}-{ins.expected.max}%</span>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed">{ins.message}</p>
            </div>
          )
        })}
        {flagged.length === 0 && <p className="text-[10px] text-green-600">All domains are performing within expected ranges for this student's WIDA levels.</p>}
      </div>
    </div>
  )
}

function AboutTab({ studentId, lang }: { studentId: string; lang: 'en' | 'ko' }) {
  const { currentTeacher, showToast } = useApp()
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

      {/* WIDA-to-Performance Insight */}
      <WIDAPerformanceInsight studentId={studentId} lang={lang} />

      {/* #35: Class Transfer History */}
      <ClassTransferHistory studentId={studentId} />
    </div>
  )
}

function ClassTransferHistory({ studentId }: { studentId: string }) {
  const [transfers, setTransfers] = useState<any[]>([])
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('class_transfers').select('*').eq('student_id', studentId).order('transfer_date', { ascending: true })
      if (data) setTransfers(data)
    })()
  }, [studentId])
  if (transfers.length === 0) return null
  return (
    <div className="mt-4 border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-surface-alt border-b border-border">
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Class History</span>
      </div>
      <div className="px-4 py-2 space-y-1">
        {transfers.map((t, i) => (
          <div key={t.id || i} className="flex items-center gap-2 text-[11px]">
            <span className="text-text-tertiary w-20">{new Date(t.transfer_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(t.from_class), color: classToTextColor(t.from_class) }}>{t.from_class}</span>
            <span className="text-text-tertiary">→</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(t.to_class), color: classToTextColor(t.to_class) }}>{t.to_class}</span>
            {t.reason && <span className="text-[9px] text-text-tertiary ml-2">({t.reason})</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

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
  const [semesterHistory, setSemesterHistory] = useState<{ semester: string; grades: Record<string, number | null>; behavior: string | null }[]>([])
  const [loading, setLoading] = useState(true)

  const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const DOMAIN_LABELS: Record<string, Record<string, string>> = {
    reading: { en: 'Reading', ko: '읽기' }, phonics: { en: 'Phonics', ko: '파닉스' },
    writing: { en: 'Writing', ko: '쓰기' }, speaking: { en: 'Speaking', ko: '말하기' },
    language: { en: 'Language', ko: '언어' },
  }
  const domainColors: Record<string, string> = { reading: '#3B82F6', phonics: '#8B5CF6', writing: '#F59E0B', speaking: '#22C55E', language: '#EC4899' }

  useEffect(() => {
    setLoading(true)
    setSemesterHistory([])
    setData([]);
    (async () => {
      // 1. Load semester_grades history
      const { data: semGrades } = await supabase.from('semester_grades').select('*, semesters(name, start_date)').eq('student_id', studentId)
      if (semGrades && semGrades.length > 0) {
        const bySem: Record<string, { name: string; startDate: string; grades: Record<string, number | null>; behavior: string | null }> = {}
        semGrades.forEach((sg: any) => {
          const semName = sg.semesters?.name || 'Unknown'
          const startDate = sg.semesters?.start_date || '9999-12-31'
          const semId = sg.semester_id
          if (!bySem[semId]) bySem[semId] = { name: semName, startDate, grades: {}, behavior: null }
          if (sg.domain === 'overall') {
            bySem[semId].behavior = sg.behavior_grade
          } else {
            bySem[semId].grades[sg.domain] = sg.final_grade ?? sg.calculated_grade ?? sg.score ?? null
          }
        })
        const history = Object.values(bySem)
          .filter(s => DOMAINS.some(d => s.grades[d] != null))
          .sort((a, b) => {
            // Force Fall before Spring regardless of start_date
            const aIsFall = a.name.toLowerCase().includes('fall')
            const bIsFall = b.name.toLowerCase().includes('fall')
            if (aIsFall && !bIsFall) return -1
            if (!aIsFall && bIsFall) return 1
            return a.startDate.localeCompare(b.startDate)
          })
        setSemesterHistory(history.map(({ startDate, ...rest }) => rest))
      }

      // 2. Load individual assessment grades (existing logic)
      const { data: grades } = await supabase.from('grades').select('score, assessment_id, assessments(name, domain, max_score, date)').eq('student_id', studentId).not('score', 'is', null)
      if (!grades || grades.length === 0) { setLoading(false); return }

      const byDomain: Record<string, { name: string; score: number; max: number; pct: number; date: string | null; assessmentId: string }[]> = {}
      for (const g of grades) {
        const a = (g as any).assessments
        if (!a) continue
        if (!byDomain[a.domain]) byDomain[a.domain] = []
        byDomain[a.domain].push({ name: a.name, score: g.score, max: a.max_score, pct: a.max_score > 0 ? (g.score / a.max_score) * 100 : 0, date: a.date, assessmentId: g.assessment_id })
      }

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
        })).sort((a, b) => {
          // Sort oldest first (ascending by date)
          if (a.date && b.date) return a.date.localeCompare(b.date)
          if (a.date) return -1
          if (b.date) return 1
          return 0
        })
      }))
      setData(result); setLoading(false)
    })()
  }, [studentId])

  if (loading) return <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto mb-2" /><p className="text-text-tertiary text-[12px]">Loading grades...</p></div>

  return (
    <div className="space-y-5">
      {/* Semester-over-semester summary */}
      {semesterHistory.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-navy/5 border-b border-border flex items-center justify-between">
            <span className="text-[12px] font-bold text-navy uppercase tracking-wider">{lang === 'ko' ? '학기별 성적' : 'Semester Grades'}</span>
            <span className="text-[10px] text-text-tertiary">{semesterHistory.length} semester{semesterHistory.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-text-secondary uppercase w-24">Domain</th>
                  {semesterHistory.map((s, i) => (
                    <th key={i} className="px-2 py-2 text-center text-[10px] font-semibold text-text-secondary uppercase">{s.name.replace('Fall 2025', 'F25').replace('Spring Mid 2026', 'S26-M').replace('Spring Final 2026', 'S26-F').replace('Spring 2026', 'S26')}</th>
                  ))}
                  {semesterHistory.length >= 2 && <th className="px-2 py-2 text-center text-[10px] font-semibold text-text-secondary uppercase w-16">Δ</th>}
                </tr>
              </thead>
              <tbody>
                {DOMAINS.map(domain => {
                  const vals = semesterHistory.map(s => s.grades[domain])
                  const first = vals[0]
                  const last = vals[vals.length - 1]
                  const change = first != null && last != null && vals.length >= 2 ? last - first : null
                  return (
                    <tr key={domain} className="border-b border-border/50">
                      <td className="px-3 py-1.5 font-semibold text-[11px]" style={{ color: domainColors[domain] }}>{DOMAIN_LABELS[domain]?.[lang] || domain}</td>
                      {vals.map((v, i) => (
                        <td key={i} className="px-2 py-1.5 text-center">
                          {v != null ? (
                            <span className={`font-bold text-[12px] ${v >= 80 ? 'text-green-600' : v >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{v.toFixed(1)}</span>
                          ) : <span className="text-text-tertiary text-[11px]">--</span>}
                        </td>
                      ))}
                      {semesterHistory.length >= 2 && (
                        <td className="px-2 py-1.5 text-center font-bold text-[11px]">
                          {change != null ? (
                            <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-text-tertiary'}>
                              {change > 0 ? '▲' : change < 0 ? '▼' : '–'}{Math.abs(change).toFixed(1)}
                            </span>
                          ) : '--'}
                        </td>
                      )}
                    </tr>
                  )
                })}
                {/* Overall row */}
                {(() => {
                  const overalls = semesterHistory.map(s => {
                    const scored = DOMAINS.map(d => s.grades[d]).filter(v => v != null) as number[]
                    return scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : null
                  })
                  const first = overalls[0]; const last = overalls[overalls.length - 1]
                  const change = first != null && last != null && overalls.length >= 2 ? last - first : null
                  return (
                    <tr className="border-t-2 border-navy/20 bg-navy/5">
                      <td className="px-3 py-2 font-bold text-[11px] text-navy">Overall</td>
                      {overalls.map((v, i) => (
                        <td key={i} className="px-2 py-2 text-center font-extrabold text-[13px] text-navy">{v != null ? v.toFixed(1) : '--'}</td>
                      ))}
                      {semesterHistory.length >= 2 && (
                        <td className="px-2 py-2 text-center font-bold text-[12px]">
                          {change != null ? (
                            <span className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-text-tertiary'}>
                              {change > 0 ? '▲' : change < 0 ? '▼' : '–'}{Math.abs(change).toFixed(1)}
                            </span>
                          ) : '--'}
                        </td>
                      )}
                    </tr>
                  )
                })()}
                {/* Behavior row */}
                {semesterHistory.some(s => s.behavior) && (
                  <tr className="border-t border-border/50">
                    <td className="px-3 py-1.5 font-medium text-[11px] text-text-secondary">{lang === 'ko' ? '행동' : 'Behavior'}</td>
                    {semesterHistory.map((s, i) => (
                      <td key={i} className="px-2 py-1.5 text-center font-bold text-[12px] text-navy">{s.behavior || '--'}</td>
                    ))}
                    {semesterHistory.length >= 2 && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trend sparklines per domain (shows trajectory at a glance) */}
      {data.length >= 2 && (
        <div className="border border-border rounded-xl p-4">
          <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-3">{lang === 'ko' ? '영역별 추세' : 'Domain Trends'}</p>
          <div className="grid grid-cols-5 gap-3">
            {data.map(({ domain, assessments }) => {
              const color = domainColors[domain] || '#6B7280'
              const pts = assessments.map(a => a.pct)
              if (pts.length < 2) return <div key={domain} className="text-center text-[9px] text-text-tertiary">{DOMAIN_LABELS[domain]?.[lang] || domain}<br/>--</div>
              const min = Math.min(...pts), max = Math.max(...pts)
              const range = max - min || 1
              const w = 80, h = 32, pad = 2
              const pathD = pts.map((p, i) => {
                const x = pad + (i / (pts.length - 1)) * (w - pad * 2)
                const y = h - pad - ((p - min) / range) * (h - pad * 2)
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')
              const first = pts[0], last = pts[pts.length - 1]
              const trend = last - first
              return (
                <div key={domain} className="text-center">
                  <span className="text-[9px] font-semibold block mb-1" style={{ color }}>{DOMAIN_LABELS[domain]?.[lang] || domain}</span>
                  <svg width={w} height={h} className="mx-auto">
                    <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={pad} cy={h - pad - ((first - min) / range) * (h - pad * 2)} r={2} fill={color} />
                    <circle cx={w - pad} cy={h - pad - ((last - min) / range) * (h - pad * 2)} r={2.5} fill={color} />
                  </svg>
                  <span className={`text-[9px] font-bold ${trend > 2 ? 'text-green-600' : trend < -2 ? 'text-red-600' : 'text-text-tertiary'}`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(0)}% {trend > 2 ? '▲' : trend < -2 ? '▼' : '→'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Individual assessments by domain */}
      {data.length === 0 && semesterHistory.length === 0 && (
        <div className="py-8 text-center text-text-tertiary text-[13px]">{lang === 'ko' ? '아직 성적이 없습니다.' : 'No grades recorded yet for this student.'}</div>
      )}
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
    const [grades, semGrades, reading, behavior, attendance, comments, scaffolds, goals] = await Promise.all([
      supabase.from('grades').select('*, assessments(name, domain, date)').eq('student_id', student.id).order('created_at', { ascending: false }),
      supabase.from('semester_grades').select('*, semesters(name)').eq('student_id', student.id),
      supabase.from('reading_assessments').select('*').eq('student_id', student.id).order('date', { ascending: true }),
      supabase.from('behavior_logs').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(50),
      supabase.from('attendance').select('*').eq('student_id', student.id).order('date', { ascending: false }).limit(100),
      supabase.from('comments').select('*, semesters(name)').eq('student_id', student.id),
      supabase.from('student_scaffolds').select('domain, scaffold_text, effectiveness').eq('student_id', student.id).eq('is_active', true),
      supabase.from('student_goals').select('goal_text, goal_type, completed_at').eq('student_id', student.id).eq('is_active', true),
    ])
    const html = buildStudentPDFHtml(student, {
      grades: grades.data || [], semesterGrades: semGrades.data || [],
      readingRecords: reading.data || [], behaviorLogs: behavior.data || [],
      attendanceRecords: attendance.data || [], comments: comments.data || [],
      scaffolds: scaffolds.data || [], goals: goals.data || [],
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* BIGGER MODAL: max-w-5xl */}
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto">
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

  // Classify reading levels based on accuracy
  const classifyLevel = (accuracy: number | null): { label: string; color: string; description: string } => {
    if (accuracy == null) return { label: '—', color: 'text-text-tertiary', description: '' }
    if (accuracy >= 96) return { label: 'Independent', color: 'text-green-600', description: 'Student reads fluently with minimal errors. Appropriate for independent reading.' }
    if (accuracy >= 90) return { label: 'Instructional', color: 'text-blue-600', description: 'Student can read with teacher support. Best level for guided reading.' }
    return { label: 'Frustration', color: 'text-red-600', description: 'Text is too difficult. Consider moving to a lower passage level.' }
  }

  // Determine current levels from latest assessment
  const latest = records[0]
  const latestLevel = latest ? classifyLevel(latest.accuracy_rate) : null

  return (
    <div className="space-y-3">
      {/* Reading Level Summary */}
      {latest && latest.accuracy_rate != null && (
        <div className={`rounded-xl border p-4 ${latestLevel?.label === 'Frustration' ? 'bg-red-50 border-red-200' : latestLevel?.label === 'Independent' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Current Reading Level</p>
            <span className={`text-[12px] font-bold ${latestLevel?.color}`}>{latestLevel?.label}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[22px] font-bold text-navy">{Math.round(latest.cwpm || 0)}</p>
              <p className="text-[9px] text-text-tertiary uppercase">CWPM</p>
            </div>
            <div className="text-center">
              <p className={`text-[22px] font-bold ${latestLevel?.color}`}>{latest.accuracy_rate?.toFixed(1)}%</p>
              <p className="text-[9px] text-text-tertiary uppercase">Accuracy</p>
            </div>
            <div className="flex-1">
              <p className={`text-[11px] ${latestLevel?.color} leading-snug`}>{latestLevel?.description}</p>
            </div>
          </div>
          {/* Level guide */}
          <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
            <span className="text-[9px] text-red-500 font-medium">Below 90% = Frustration</span>
            <span className="text-[9px] text-blue-500 font-medium">90-95% = Instructional</span>
            <span className="text-[9px] text-green-500 font-medium">96%+ = Independent</span>
          </div>
        </div>
      )}

      <p className="text-[11px] text-text-tertiary">{records.length} {lang === 'ko' ? '개 기록' : 'assessments recorded'}</p>
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="bg-surface-alt">
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Date</th>
            <th className="text-left px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Passage</th>
            <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">CWPM</th>
            <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Acc%</th>
            <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Reading Level</th>
            <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Lexile</th>
            <th className="text-center px-2 py-2 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">NAEP</th>
          </tr></thead>
          <tbody>
            {records.map((r: any) => {
              const level = classifyLevel(r.accuracy_rate)
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-2 py-2 font-medium truncate max-w-[100px]">{r.passage_title || '—'}</td>
                  <td className="px-2 py-2 text-center font-semibold text-navy">{r.cwpm != null ? Math.round(r.cwpm) : '—'}</td>
                  <td className={`px-2 py-2 text-center font-semibold ${(r.accuracy_rate || 0) >= 96 ? 'text-green-600' : (r.accuracy_rate || 0) >= 90 ? 'text-blue-600' : 'text-red-600'}`}>{r.accuracy_rate != null ? `${r.accuracy_rate.toFixed(1)}%` : '—'}</td>
                  <td className={`px-2 py-2 text-center text-[10px] font-semibold ${level.color}`}>{level.label}</td>
                  <td className="px-2 py-2 text-center text-purple-600 font-medium">{r.reading_level || '—'}</td>
                  <td className="px-2 py-2 text-center text-text-secondary">{r.naep_fluency ? `L${r.naep_fluency}` : '—'}</td>
                </tr>
              )
            })}
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
  const [correlation, setCorrelation] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('attendance').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(100)
      if (data) setRecords(data)

      // Attendance-academic correlation analysis
      if (data && data.length >= 10) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
        const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]
        const recentAbs = data.filter((r: any) => r.date >= thirtyDaysAgo && r.status === 'absent').length
        const priorAbs = data.filter((r: any) => r.date >= sixtyDaysAgo && r.date < thirtyDaysAgo && r.status === 'absent').length

        if (recentAbs >= 3) {
          // Check if grades also declined in that period
          const { data: grades } = await supabase.from('grades').select('score, assessment_id, assessments!inner(max_score, date)')
            .eq('student_id', studentId).not('score', 'is', null)
          if (grades && grades.length >= 4) {
            const scored = grades.map((g: any) => ({ date: g.assessments?.date || '', pct: (g.score / (g.assessments?.max_score || 100)) * 100 })).sort((a: any, b: any) => a.date.localeCompare(b.date))
            const recentGrades = scored.filter((g: any) => g.date >= thirtyDaysAgo)
            const priorGrades = scored.filter((g: any) => g.date >= sixtyDaysAgo && g.date < thirtyDaysAgo)
            if (recentGrades.length >= 2 && priorGrades.length >= 2) {
              const recentAvg = recentGrades.reduce((s: number, g: any) => s + g.pct, 0) / recentGrades.length
              const priorAvg = priorGrades.reduce((s: number, g: any) => s + g.pct, 0) / priorGrades.length
              if (priorAvg - recentAvg >= 5) {
                setCorrelation(`${studentName.split(' ')[0]} missed ${recentAbs} sessions in the last 30 days (up from ${priorAbs}) and grades dropped ${Math.round(priorAvg - recentAvg)} points in the same period (${Math.round(priorAvg)}% to ${Math.round(recentAvg)}%).`)
              }
            }
          }
          if (!correlation && recentAbs > priorAbs) {
            setCorrelation(`${studentName.split(' ')[0]} has been absent ${recentAbs} times in the last 30 days${priorAbs > 0 ? ` (up from ${priorAbs} in the prior 30 days)` : ''}. Monitor for academic impact.`)
          }
        }
      }

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

      {/* Attendance-Academic Correlation */}
      {correlation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold mb-1">Attendance-Academic Insight</p>
          <p className="text-[12px] text-amber-900 leading-relaxed">{correlation}</p>
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
  const [studentClass, setStudentClass] = useState<string>('')

  const CLASS_THRESHOLDS: Record<string, { mastered: number; approaching: number }> = {
    Lily: { mastered: 70, approaching: 50 }, Camellia: { mastered: 75, approaching: 55 },
    Daisy: { mastered: 80, approaching: 60 }, Sunflower: { mastered: 85, approaching: 65 },
    Marigold: { mastered: 90, approaching: 70 }, Snapdragon: { mastered: 90, approaching: 70 },
  }
  const th = CLASS_THRESHOLDS[studentClass] || { mastered: 80, approaching: 60 }

  useEffect(() => {
    (async () => {
      const { data: studentData } = await supabase.from('students').select('english_class').eq('id', studentId).single()
      if (studentData) setStudentClass(studentData.english_class || '')
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

  const mastered = standardsData.filter(s => s.avgPct >= th.mastered).length
  const approaching = standardsData.filter(s => s.avgPct >= th.approaching && s.avgPct < th.mastered).length
  const below = standardsData.filter(s => s.avgPct < th.approaching).length

  const DOMAIN_COLORS: Record<string, string> = {
    reading: '#3b82f6', phonics: '#8b5cf6', writing: '#f59e0b', speaking: '#10b981', language: '#ec4899',
  }

  return (
    <div>
      {/* Visual grid overview */}
      <div className="mb-4 p-3 bg-surface-alt rounded-xl">
        <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Standards Mastery Overview</p>
        {(() => {
          const byDomain: Record<string, typeof standardsData> = {}
          standardsData.forEach(s => { const d = s.domain || 'other'; if (!byDomain[d]) byDomain[d] = []; byDomain[d].push(s) })
          return Object.entries(byDomain).map(([domain, stds]) => (
            <div key={domain} className="mb-2 last:mb-0">
              <p className="text-[8px] uppercase font-semibold text-text-tertiary mb-1">{domain}</p>
              <div className="flex flex-wrap gap-1">
                {stds.map(std => (
                  <div key={std.code} className={`px-2 py-1 rounded text-[8px] font-semibold cursor-help ${std.avgPct >= th.mastered ? 'bg-green-500 text-white' : std.avgPct >= th.approaching ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'}`}
                    title={`${std.code}: ${std.description}\n${Math.round(std.avgPct)}% (${std.assessments.length} assessment${std.assessments.length !== 1 ? 's' : ''})`}>
                    {std.code}
                  </div>
                ))}
              </div>
            </div>
          ))
        })()}
        <div className="flex items-center gap-3 mt-2 text-[9px] text-text-tertiary">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-500" /> {th.mastered}%+ mastered</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> {th.approaching}-{th.mastered - 1}% approaching</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> &lt;{th.approaching}% below</span>
        </div>
      </div>
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
          const pctColor = std.avgPct >= th.mastered ? 'text-green-600' : std.avgPct >= th.approaching ? 'text-amber-600' : 'text-red-600'
          const barColor = std.avgPct >= th.mastered ? 'bg-green-400' : std.avgPct >= th.approaching ? 'bg-amber-400' : 'bg-red-400'
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

// ─── Scaffolds Tab ──────────────────────────────────────────────────

function ScaffoldsTab({ studentId }: { studentId: string }) {
  const { showToast, currentTeacher } = useApp()
  const [scaffolds, setScaffolds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [widaLevels, setWidaLevels] = useState<Record<string, number>>({})
  const [addingCustom, setAddingCustom] = useState(false)
  const [customText, setCustomText] = useState('')
  const [customDomain, setCustomDomain] = useState('general')

  // Suggested scaffolds by WIDA level
  const SUGGESTED_SCAFFOLDS: Record<number, string[]> = {
    1: ['Visual supports and picture cues', 'Sentence frames for oral responses', 'Word walls with L1 translations', 'Graphic organizers', 'Total Physical Response (TPR)', 'Bilingual glossaries', 'Manipulatives and realia'],
    2: ['Sentence starters for writing', 'Vocabulary pre-teaching', 'Think-pair-share structures', 'Cloze activities', 'Leveled texts', 'Anchor charts', 'Word banks for tasks'],
    3: ['Graphic organizers for extended writing', 'Academic language frames', 'Peer collaboration activities', 'Content-specific vocabulary instruction', 'Text annotation strategies', 'Structured note-taking templates'],
    4: ['Complex sentence modeling', 'Academic discussion protocols', 'Argumentative writing scaffolds', 'Mentor text analysis', 'Self-monitoring checklists', 'Independent research frameworks'],
    5: ['Advanced vocabulary enrichment', 'Rhetorical analysis tools', 'Cross-curricular connections', 'Student-led discussions', 'Peer editing with rubrics'],
  }

  useEffect(() => {
    (async () => {
      const [scaffRes, widaRes] = await Promise.all([
        supabase.from('student_scaffolds').select('*').eq('student_id', studentId).eq('is_active', true).order('assigned_at', { ascending: false }),
        supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', studentId),
      ])
      setScaffolds(scaffRes.data || [])
      const wm: Record<string, number> = {}
      widaRes.data?.forEach((w: any) => { wm[w.domain] = w.wida_level })
      setWidaLevels(wm)
      setLoading(false)
    })()
  }, [studentId])

  const DOMAIN_COLORS: Record<string, string> = {
    reading: 'bg-blue-100 text-blue-700', phonics: 'bg-purple-100 text-purple-700',
    writing: 'bg-amber-100 text-amber-700', speaking: 'bg-green-100 text-green-700',
    language: 'bg-pink-100 text-pink-700', general: 'bg-gray-100 text-gray-700',
  }

  const toggleEffectiveness = async (id: string, current: string | null) => {
    const next = current === 'working' ? 'not_working' : current === 'not_working' ? null : 'working'
    const { error } = await supabase.from('student_scaffolds').update({ effectiveness: next, effectiveness_updated_at: new Date().toISOString() }).eq('id', id)
    if (error) showToast(`Error: ${error.message}`)
    else setScaffolds(prev => prev.map(s => s.id === id ? { ...s, effectiveness: next } : s))
  }

  const removeScaffold = async (id: string) => {
    const { error } = await supabase.from('student_scaffolds').update({ is_active: false }).eq('id', id)
    if (error) showToast(`Error: ${error.message}`)
    else setScaffolds(prev => prev.filter(s => s.id !== id))
  }

  const addSuggested = async (text: string) => {
    const { data, error } = await supabase.from('student_scaffolds').insert({
      student_id: studentId, domain: 'general', scaffold_text: text,
      is_active: true, assigned_at: new Date().toISOString(), assigned_by: currentTeacher?.id,
    }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setScaffolds(prev => [data, ...prev])
    showToast('Scaffold added')
  }

  const addCustom = async () => {
    if (!customText.trim()) return
    const { data, error } = await supabase.from('student_scaffolds').insert({
      student_id: studentId, domain: customDomain, scaffold_text: customText.trim(),
      is_active: true, assigned_at: new Date().toISOString(), assigned_by: currentTeacher?.id,
    }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setScaffolds(prev => [data, ...prev])
    setCustomText(''); setAddingCustom(false)
    showToast('Custom scaffold added')
  }

  if (loading) return <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-navy mx-auto" /></div>

  // Determine primary WIDA level for suggestions
  const widaVals = Object.values(widaLevels).filter(v => v > 0)
  const avgWida = widaVals.length > 0 ? Math.round(widaVals.reduce((a, b) => a + b, 0) / widaVals.length) : null
  const suggestions = avgWida ? (SUGGESTED_SCAFFOLDS[avgWida] || []) : []
  const activeTexts = new Set(scaffolds.map(s => s.scaffold_text))

  return (
    <div>
      {/* Currently using */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-text-tertiary">{scaffolds.length} active scaffold{scaffolds.length !== 1 ? 's'  : ''}</p>
        <button onClick={() => setAddingCustom(!addingCustom)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-navy text-white hover:bg-navy-dark">
          {addingCustom ? <><X size={10} /> Cancel</> : <><Plus size={10} /> Custom</>}
        </button>
      </div>

      {addingCustom && (
        <div className="bg-surface-alt/50 border border-border rounded-lg p-3 mb-3 flex gap-2">
          <select value={customDomain} onChange={e => setCustomDomain(e.target.value)}
            className="px-2 py-1.5 border border-border rounded-lg text-[10px] outline-none">
            <option value="general">General</option><option value="reading">Reading</option><option value="writing">Writing</option>
            <option value="speaking">Speaking</option><option value="phonics">Phonics</option><option value="language">Language</option>
          </select>
          <input value={customText} onChange={e => setCustomText(e.target.value)} placeholder="Describe the scaffold..."
            className="flex-1 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy" />
          <button onClick={addCustom} disabled={!customText.trim()}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">Add</button>
        </div>
      )}

      {scaffolds.length > 0 && (
        <div className="space-y-1.5 mb-5">
          {scaffolds.map(s => (
            <div key={s.id} className="flex items-start gap-2.5 p-2.5 bg-surface border border-border rounded-lg group">
              <span className={`flex-shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${DOMAIN_COLORS[s.domain] || DOMAIN_COLORS.general}`}>{s.domain}</span>
              <p className="flex-1 text-[11px] text-text-primary leading-relaxed">{s.scaffold_text}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleEffectiveness(s.id, s.effectiveness)}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${s.effectiveness === 'working' ? 'bg-green-100 text-green-700' : s.effectiveness === 'not_working' ? 'bg-red-100 text-red-700' : 'bg-surface-alt text-text-tertiary'}`}>
                  {s.effectiveness === 'working' ? 'Working' : s.effectiveness === 'not_working' ? 'Not working' : 'Untested'}
                </button>
                <button onClick={() => removeScaffold(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-tertiary hover:text-red-500">
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WIDA-suggested scaffolds */}
      {avgWida && suggestions.length > 0 && (
        <div className="border border-blue-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-200">
            <p className="text-[11px] font-semibold text-blue-800">Suggested for WIDA Level {avgWida}</p>
            <p className="text-[9px] text-blue-600 mt-0.5">Click + to add to this student's active scaffolds</p>
          </div>
          <div className="divide-y divide-blue-100">
            {suggestions.map((text, i) => {
              const alreadyAdded = activeTexts.has(text)
              return (
                <div key={i} className={`px-4 py-2 flex items-center gap-3 ${alreadyAdded ? 'bg-green-50/30' : 'hover:bg-blue-50/30'}`}>
                  <p className={`flex-1 text-[11px] ${alreadyAdded ? 'text-green-700' : 'text-text-primary'}`}>{text}</p>
                  {alreadyAdded ? (
                    <span className="text-[9px] text-green-600 font-medium">In use</span>
                  ) : (
                    <button onClick={() => addSuggested(text)}
                      className="p-1 rounded-lg text-blue-500 hover:bg-blue-100 hover:text-blue-700">
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!avgWida && scaffolds.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-text-tertiary text-[12px]">No WIDA profile set for this student.</p>
          <p className="text-text-tertiary text-[10px] mt-1">Complete their WIDA profile to see suggested scaffolds.</p>
        </div>
      )}
    </div>
  )
}

// ─── Student PDF Export ─────────────────────────────────────────────

function buildStudentPDFHtml(student: Student, data: {
  grades: any[]; semesterGrades: any[]; readingRecords: any[];
  behaviorLogs: any[]; attendanceRecords: any[]; comments: any[];
  scaffolds?: any[]; goals?: any[];
}) {
  const { grades, semesterGrades, readingRecords, behaviorLogs, attendanceRecords, comments, scaffolds = [], goals = [] } = data
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
  <tr><th>Date</th><th>CWPM</th><th>Accuracy</th><th>Level</th><th>Lexile</th><th>NAEP</th><th>Errors</th></tr>
  ${readingRecords.map((r: any) => `<tr><td>${r.date}</td><td>${Math.round(r.cwpm || 0)}</td><td>${r.accuracy_rate != null ? r.accuracy_rate + '%' : '—'}</td><td>${r.passage_level || '—'}</td><td>${r.reading_level || '—'}</td><td>${r.naep_fluency ? 'L' + r.naep_fluency : '—'}</td><td>${r.errors || '—'}</td></tr>`).join('')}
</table>` : '<p class="empty">No reading assessments recorded.</p>'}

${scaffolds.length > 0 ? `<h2>Active Scaffolds (${scaffolds.length})</h2>
<div>${scaffolds.map((s: any) => `<div class="note"><strong style="text-transform:uppercase;font-size:9px;background:#EEF2FF;padding:1px 5px;border-radius:3px">${s.domain}</strong> ${s.scaffold_text}${s.effectiveness === 'working' ? ' <span style="color:#059669">✓ Working</span>' : s.effectiveness === 'not_working' ? ' <span style="color:#dc2626">✗ Not Working</span>' : ''}</div>`).join('')}
</div>` : ''}

${goals.length > 0 ? `<h2>Student Goals (${goals.length})</h2>
<div>${goals.map((g: any) => `<div class="note">${g.completed_at ? '✅' : g.goal_type === 'stretch' ? '🚀' : g.goal_type === 'behavioral' ? '🎯' : '📚'} <span style="${g.completed_at ? 'text-decoration:line-through;color:#94a3b8' : ''}">${g.goal_text}</span>${g.completed_at ? ` <span style="color:#059669;font-size:9px">Done ${new Date(g.completed_at).toLocaleDateString()}</span>` : ''}</div>`).join('')}
</div>` : ''}

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

// ─── Student Groups Tab ─────────────────────────────────────────────
function StudentGroupsTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('student_groups').select('*').contains('student_ids', [studentId]).eq('is_archived', false).order('type')
      setGroups(data || [])
      setLoading(false)
    })()
  }, [studentId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-navy" /></div>

  const typeColors: Record<string, string> = { skill: 'bg-blue-100 text-blue-700', fluency: 'bg-green-100 text-green-700', litCircle: 'bg-purple-100 text-purple-700', partner: 'bg-amber-100 text-amber-700', custom: 'bg-gray-100 text-gray-700' }
  const typeLabels: Record<string, string> = { skill: 'Skill Group', fluency: 'Reading Group', litCircle: 'Lit Circle', partner: 'Partner Pair', custom: 'Custom' }

  return (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <p className="text-center text-text-tertiary py-8 text-[12px]">{studentName} is not in any active groups.</p>
      ) : (
        groups.map(g => (
          <div key={g.id} className="bg-surface border border-border rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${typeColors[g.type] || typeColors.custom}`}>{typeLabels[g.type] || g.type}</span>
              <span className="text-[12px] font-semibold text-navy">{g.name}</span>
              <span className="text-[10px] text-text-tertiary ml-auto">{(g.student_ids || []).length} students</span>
            </div>
            {g.focus && <p className="text-[10px] text-text-secondary">{g.focus}</p>}
            {g.book && <p className="text-[10px] text-purple-600">📖 {g.book}</p>}
            {g.roles && g.roles[studentId] && <p className="text-[10px] text-purple-700">Role: {g.roles[studentId]}</p>}
            {g.notes && <p className="text-[10px] text-text-tertiary italic mt-1">{g.notes}</p>}
            {g.active_from && <p className="text-[9px] text-text-tertiary">📅 {g.active_from}{g.active_until ? ` → ${g.active_until}` : ''}</p>}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Goals Tab ─────────────────────────────────────────────────────

interface StudentGoal {
  id: string
  goal_text: string
  target_metric: string | null
  target_value: number | null
  baseline_value: number | null
  current_value: number | null
  status: string
  created_at: string
}

function GoalsTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { showToast, currentTeacher } = useApp()
  const [goals, setGoals] = useState<StudentGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newGoal, setNewGoal] = useState({ goal_text: '', target_metric: 'custom', target_value: '', baseline_value: '' })
  const [semId, setSemId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
      if (sem) setSemId(sem.id)
      const { data } = await supabase.from('student_goals').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
      if (data) setGoals(data)
      setLoading(false)
    })()
  }, [studentId])

  const addGoal = async () => {
    if (!newGoal.goal_text.trim() || !semId) return
    const { data, error } = await supabase.from('student_goals').insert({
      student_id: studentId, semester_id: semId,
      goal_text: newGoal.goal_text.trim(),
      target_metric: newGoal.target_metric || 'custom',
      target_value: newGoal.target_value ? Number(newGoal.target_value) : null,
      baseline_value: newGoal.baseline_value ? Number(newGoal.baseline_value) : null,
      status: 'active', created_by: currentTeacher?.id,
    }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setGoals(prev => [data, ...prev])
    setNewGoal({ goal_text: '', target_metric: 'custom', target_value: '', baseline_value: '' })
    setAdding(false)
    showToast('Goal added')
  }

  const updateStatus = async (goalId: string, status: string) => {
    await supabase.from('student_goals').update({ status, updated_at: new Date().toISOString() }).eq('id', goalId)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g))
    showToast(`Goal marked as ${status}`)
  }

  const deleteGoal = async (goalId: string) => {
    await supabase.from('student_goals').delete().eq('id', goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
    showToast('Goal removed')
  }

  if (loading) return <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>

  const metricLabels: Record<string, string> = { cwpm: 'CWPM', grade_pct: 'Grade %', writing: 'Writing', custom: 'Custom' }
  const statusColors: Record<string, string> = { active: 'bg-blue-100 text-blue-700', achieved: 'bg-green-100 text-green-700', revised: 'bg-amber-100 text-amber-700', dropped: 'bg-gray-100 text-gray-500' }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-text-secondary">Set 2-3 measurable goals per semester for {studentName.split(' ')[0]}.</p>
        <button onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
          {adding ? <><X size={12} /> Cancel</> : <><Plus size={12} /> Add Goal</>}
        </button>
      </div>

      {adding && (
        <div className="bg-surface-alt/50 border border-border rounded-xl p-4 mb-4 space-y-3">
          <textarea value={newGoal.goal_text} onChange={e => setNewGoal(p => ({ ...p, goal_text: e.target.value }))}
            placeholder="e.g., Increase CWPM from 45 to 65 by midterm"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy resize-none" rows={2} />
          <div className="flex gap-3">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Metric</label>
              <select value={newGoal.target_metric} onChange={e => setNewGoal(p => ({ ...p, target_metric: e.target.value }))}
                className="px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
                <option value="cwpm">CWPM</option><option value="grade_pct">Grade %</option><option value="writing">Writing</option><option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Baseline</label>
              <input type="number" value={newGoal.baseline_value} onChange={e => setNewGoal(p => ({ ...p, baseline_value: e.target.value }))}
                className="w-20 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Start" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Target</label>
              <input type="number" value={newGoal.target_value} onChange={e => setNewGoal(p => ({ ...p, target_value: e.target.value }))}
                className="w-20 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Target" />
            </div>
          </div>
          <button onClick={addGoal} disabled={!newGoal.goal_text.trim()}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11px] font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
            <Check size={12} /> Save Goal
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary">
          <Target size={24} className="mx-auto mb-2 text-text-tertiary" />
          <p className="text-[12px]">No goals set yet. Click "Add Goal" to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map(goal => {
            const progress = goal.baseline_value != null && goal.target_value != null && goal.current_value != null
              ? Math.min(100, Math.max(0, ((goal.current_value - goal.baseline_value) / (goal.target_value - goal.baseline_value)) * 100))
              : null
            return (
              <div key={goal.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-navy leading-snug">{goal.goal_text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColors[goal.status] || statusColors.active}`}>
                        {(goal.status || 'active').charAt(0).toUpperCase() + (goal.status || 'active').slice(1)}
                      </span>
                      {goal.target_metric && goal.target_metric !== 'custom' && (
                        <span className="text-[10px] text-text-tertiary">{metricLabels[goal.target_metric] || goal.target_metric}</span>
                      )}
                      {goal.baseline_value != null && goal.target_value != null && (
                        <span className="text-[10px] text-text-tertiary">{goal.baseline_value} &rarr; {goal.target_value}</span>
                      )}
                      <span className="text-[9px] text-text-tertiary">{new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    {progress != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-medium text-text-secondary">{Math.round(progress)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {goal.status === 'active' && (
                      <button onClick={() => updateStatus(goal.id, 'achieved')}
                        className="p-1.5 rounded-lg text-green-500 hover:bg-green-50" title="Mark achieved">
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    {goal.status === 'achieved' && (
                      <button onClick={() => updateStatus(goal.id, 'active')}
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50" title="Reactivate">
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button onClick={() => deleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-50" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── #39 Peer/Partner Teacher Observation Notes ───────────────────────

function PeerNotesTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { currentTeacher, showToast } = useApp()
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('peer_observations').select('*, teachers(name)').eq('student_id', studentId).order('created_at', { ascending: false })
      setNotes(data || [])
      setLoading(false)
    })()
  }, [studentId])

  const handleAdd = async () => {
    if (!newNote.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('peer_observations').insert({
      student_id: studentId, teacher_id: currentTeacher.id, note: newNote.trim(),
    }).select('*, teachers(name)').single()
    if (error) { showToast('Error saving note'); return }
    if (data) setNotes(prev => [data, ...prev])
    setNewNote('')
    showToast('Observation saved')
  }

  if (loading) return <div className="py-8 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[10px] text-blue-800">
        Peer observations are visible to all teachers. Use this to share insights from co-teaching, covering, or peer observations about {studentName.split(' ')[0]}.
      </div>
      <div className="flex gap-2">
        <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="What did you notice about this student?"
          className="flex-1 px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-16" />
        <button onClick={handleAdd} disabled={!newNote.trim()}
          className="self-end px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
          Add Note
        </button>
      </div>
      {notes.length === 0 ? (
        <p className="text-[12px] text-text-tertiary text-center py-4">No peer observations yet.</p>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="bg-surface border border-border rounded-lg px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-navy">{n.teachers?.name || 'Unknown Teacher'}</span>
                <span className="text-[9px] text-text-tertiary">{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="text-[12px] text-text-primary leading-relaxed">{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── #47 Parent Communication Log ─────────────────────────────────────

function ParentLogTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { currentTeacher, showToast } = useApp()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'note_home', summary: '' })

  const COMM_TYPES = [
    { value: 'note_home', label: 'Note sent home' },
    { value: 'parent_response', label: 'Parent responded' },
    { value: 'phone_call', label: 'Phone/app call' },
    { value: 'conference', label: 'Conference' },
    { value: 'translation', label: 'Translation requested' },
    { value: 'reading_log', label: 'Reading log sent' },
    { value: 'other', label: 'Other' },
  ]

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('parent_communications').select('*, teachers(name)').eq('student_id', studentId).order('created_at', { ascending: false })
      setLogs(data || [])
      setLoading(false)
    })()
  }, [studentId])

  const handleAdd = async () => {
    if (!form.summary.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('parent_communications').insert({
      student_id: studentId, teacher_id: currentTeacher.id, comm_type: form.type, summary: form.summary.trim(),
    }).select('*, teachers(name)').single()
    if (error) { showToast('Error saving'); return }
    if (data) setLogs(prev => [data, ...prev])
    setForm({ type: 'note_home', summary: '' })
    setShowForm(false)
    showToast('Communication logged')
  }

  const typeLabel = (t: string) => COMM_TYPES.find(c => c.value === t)?.label || t

  if (loading) return <div className="py-8 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-secondary">Log all parent communication for {studentName.split(' ')[0]} -- notes home, responses, conferences, translation requests.</p>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
          {showForm ? 'Cancel' : '+ Log Communication'}
        </button>
      </div>
      {showForm && (
        <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">Type</label>
            <div className="flex gap-1 flex-wrap">
              {COMM_TYPES.map(ct => (
                <button key={ct.value} onClick={() => setForm(f => ({ ...f, type: ct.value }))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${form.type === ct.value ? 'bg-navy text-white' : 'bg-surface border border-border text-text-secondary hover:bg-border'}`}>
                  {ct.label}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            placeholder="Brief summary of the communication..."
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-16" />
          <button onClick={handleAdd} disabled={!form.summary.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">Save</button>
        </div>
      )}
      {logs.length === 0 ? (
        <p className="text-[12px] text-text-tertiary text-center py-4">No parent communication logged yet.</p>
      ) : (
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="bg-surface border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-navy/10 text-navy uppercase">{typeLabel(l.comm_type)}</span>
                <span className="text-[10px] text-text-tertiary ml-auto">{l.teachers?.name} -- {new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <p className="text-[12px] text-text-primary">{l.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── #37 Vocabulary Tracker ───────────────────────────────────────────

function VocabularyTab({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { currentTeacher, showToast } = useApp()
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newWord, setNewWord] = useState('')
  const [newDomain, setNewDomain] = useState('reading')
  const [newStatus, setNewStatus] = useState<'introduced' | 'practicing' | 'mastered'>('introduced')

  const DOMAINS = ['reading', 'phonics', 'writing', 'speaking', 'language']
  const STATUS_OPTS = [
    { value: 'introduced', label: 'Introduced', color: 'bg-blue-100 text-blue-700' },
    { value: 'practicing', label: 'Practicing', color: 'bg-amber-100 text-amber-700' },
    { value: 'mastered', label: 'Mastered', color: 'bg-green-100 text-green-700' },
  ]

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('student_vocabulary').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
      setWords(data || [])
      setLoading(false)
    })()
  }, [studentId])

  const handleAdd = async () => {
    if (!newWord.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('student_vocabulary').insert({
      student_id: studentId, word: newWord.trim(), domain: newDomain, status: newStatus,
      added_by: currentTeacher.id,
    }).select().single()
    if (error) { showToast('Error saving'); return }
    if (data) setWords(prev => [data, ...prev])
    setNewWord('')
    showToast('Word added')
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('student_vocabulary').update({ status }).eq('id', id)
    setWords(prev => prev.map(w => w.id === id ? { ...w, status } : w))
  }

  if (loading) return <div className="py-8 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>

  const grouped = DOMAINS.reduce((acc, d) => {
    acc[d] = words.filter(w => w.domain === d)
    return acc
  }, {} as Record<string, any[]>)

  const statusColor = (s: string) => STATUS_OPTS.find(o => o.value === s)?.color || 'bg-gray-100 text-gray-700'

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[10px] text-blue-800">
        Track key vocabulary for {studentName.split(' ')[0]}. Words are organized by domain and status. Click status badges to cycle through introduced, practicing, mastered.
      </div>

      {/* Add word form */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <input value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="New vocabulary word or phrase"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface"
            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        </div>
        <select value={newDomain} onChange={e => setNewDomain(e.target.value)}
          className="px-2 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
          {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={handleAdd} disabled={!newWord.trim()} className="px-3 py-2 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">Add</button>
      </div>

      {/* Word counts */}
      <div className="flex gap-3 text-[10px]">
        <span className="text-text-tertiary">{words.length} total words</span>
        <span className="text-blue-600">{words.filter(w => w.status === 'introduced').length} introduced</span>
        <span className="text-amber-600">{words.filter(w => w.status === 'practicing').length} practicing</span>
        <span className="text-green-600">{words.filter(w => w.status === 'mastered').length} mastered</span>
      </div>

      {/* Grouped by domain */}
      {DOMAINS.map(domain => {
        const domWords = grouped[domain]
        if (!domWords || domWords.length === 0) return null
        return (
          <div key={domain} className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-surface-alt border-b border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">{domain} ({domWords.length})</span>
            </div>
            <div className="px-3 py-2 flex flex-wrap gap-1.5">
              {domWords.map(w => (
                <button key={w.id} onClick={() => {
                  const next = w.status === 'introduced' ? 'practicing' : w.status === 'practicing' ? 'mastered' : 'introduced'
                  updateStatus(w.id, next)
                }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${statusColor(w.status)}`}
                  title={`Click to change status (currently: ${w.status})`}>
                  {w.word}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {words.length === 0 && <p className="text-center text-text-tertiary text-[12px] py-4">No vocabulary words tracked yet.</p>}
    </div>
  )
}
