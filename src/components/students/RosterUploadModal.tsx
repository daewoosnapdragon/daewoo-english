'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, Grade, GRADES, ENGLISH_CLASSES, KOREAN_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import {
  Upload, AlertTriangle, Check, X, Loader2,
  ArrowRight, UserPlus, CheckCircle2
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ─── Types ──────────────────────────────────────────────────────────

interface ParsedRow {
  korean_name: string
  grade: number
  korean_class: string
  class_number: number
  english_name?: string
}

type RowStatus = 'match' | 'changed' | 'new' | 'ambiguous'

interface ComparisonRow {
  status: RowStatus
  parsed: ParsedRow
  existing?: Student
  candidates?: Student[]
  changes: string[]
  include: boolean
}

interface MissingStudent {
  student: Student
  deactivate: boolean
}

interface Props {
  existingStudents: Student[]
  onComplete: () => void
  onClose: () => void
}

// ─── Main Component ─────────────────────────────────────────────────

export default function RosterUploadModal({ existingStudents, onComplete, onClose }: Props) {
  const { showToast } = useApp()
  const [step, setStep] = useState<'upload' | 'review' | 'processing' | 'done'>('upload')
  const [fileNames, setFileNames] = useState<string[]>([])
  const [comparison, setComparison] = useState<ComparisonRow[]>([])
  const [missing, setMissing] = useState<MissingStudent[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] as string[] })
  const [processing, setProcessing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | RowStatus>('all')

  // ─── File Parsing ────────────────────────────────────────────────

  const parseFile = useCallback(async (file: File): Promise<ParsedRow[]> => {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (json.length < 2) throw new Error('File appears empty')

    // Find header row (Korean admin files bury headers on row 6+)
    let headerIdx = 0
    for (let r = 0; r < Math.min(json.length, 15); r++) {
      const cells = (json[r] || []).map((c: any) => String(c || '').trim())
      if ((cells.includes('번호') && (cells.includes('성명') || cells.includes('이름'))) ||
          (cells.includes('학년') && cells.includes('번호'))) {
        headerIdx = r; break
      }
    }

    const headers = (json[headerIdx] || []).map((h: any) => String(h || '').trim())

    // Skip sub-header row
    let dataStart = headerIdx + 1
    if (dataStart < json.length) {
      const next = (json[dataStart] || []).map((c: any) => String(c || '').trim())
      if (next.filter(s => s).length <= 4 && next.some(s => ['학년', '반', '번호'].includes(s))) dataStart++
    }

    // Auto-map columns — only match FIRST occurrence to avoid 이전학적 columns
    const map = { name: -1, grade: -1, class: -1, number: -1, english: -1 }
    headers.forEach((h: string, i: number) => {
      const s = h.trim()
      if (map.name < 0 && (s === '성명' || s === '이름')) map.name = i
      else if (map.grade < 0 && s === '학년') map.grade = i
      else if (map.class < 0 && s === '반') map.class = i
      else if (map.number < 0 && s === '번호') map.number = i
      else if (map.english < 0 && /english|영어/i.test(s)) map.english = i
    })

    // Fallback: English-style headers
    if (map.name < 0) {
      headers.forEach((h: string, i: number) => {
        const lower = h.toLowerCase()
        if (map.name < 0 && lower.includes('name') && !lower.includes('english')) map.name = i
        if (map.grade < 0 && lower === 'grade') map.grade = i
        if (map.class < 0 && lower.includes('class') && !lower.includes('english')) map.class = i
        if (map.number < 0 && lower.includes('number')) map.number = i
        if (map.english < 0 && lower.includes('english')) map.english = i
      })
    }

    if (map.name < 0 || map.number < 0) throw new Error(`Can't find name/number columns in ${file.name}`)

    // Grade/class from filename fallback
    const fnGrade = file.name.match(/(\d)학년/)
    const fnClass = file.name.match(/[가-힣]*([가-힣])반/)

    // Parse rows, skip footer/summary rows
    const rows: ParsedRow[] = []
    const dataRows = json.slice(dataStart).filter((r: any[]) => {
      const nonEmpty = r.filter(c => c != null && c !== '')
      if (nonEmpty.length === 0) return false
      const str = nonEmpty.map(String).join('')
      if (/[남여]\(\d+\)명/.test(str) || /계:\(\d+\)/.test(str)) return false
      if (/초등학교|중학교|학교$/.test(str.trim())) return false
      return true
    })

    for (const row of dataRows) {
      const kn = String(row[map.name] || '').trim()
      if (!kn) continue
      let gr = 0
      if (map.grade >= 0) { const m = String(row[map.grade] || '').match(/(\d+)/); gr = m ? Number(m[1]) : 0 }
      else if (fnGrade) gr = Number(fnGrade[1])
      let kc = ''
      if (map.class >= 0) kc = String(row[map.class] || '').trim()
      else if (fnClass) kc = fnClass[1]
      const cn = Number(row[map.number]) || 0
      const en = map.english >= 0 ? String(row[map.english] || '').trim() : ''
      if (gr >= 1 && gr <= 6 && cn > 0) {
        rows.push({ korean_name: kn, grade: gr, korean_class: kc, class_number: cn, english_name: en || undefined })
      }
    }
    return rows
  }, [])

  // ─── Matching ────────────────────────────────────────────────────

  const runComparison = useCallback((parsed: ParsedRow[]) => {
    const active = existingStudents.filter(s => s.is_active)
    const matchedIds = new Set<string>()
    const results: ComparisonRow[] = []

    for (const row of parsed) {
      // Match: same korean_name AND DB grade within ±1 of file grade
      const candidates = active.filter(s =>
        s.korean_name === row.korean_name &&
        Math.abs(s.grade - row.grade) <= 1 &&
        !matchedIds.has(s.id)
      )

      if (candidates.length === 0) {
        results.push({ status: 'new', parsed: row, changes: [], include: true })
      } else if (candidates.length === 1) {
        const match = candidates[0]
        matchedIds.add(match.id)
        const changes: string[] = []
        if (match.grade !== row.grade) changes.push(`Grade ${match.grade}→${row.grade}`)
        if (match.korean_class !== row.korean_class) changes.push(`반 ${match.korean_class}→${row.korean_class}`)
        if (match.class_number !== row.class_number) changes.push(`# ${match.class_number}→${row.class_number}`)
        results.push({ status: changes.length > 0 ? 'changed' : 'match', parsed: row, existing: match, changes, include: true })
      } else {
        results.push({ status: 'ambiguous', parsed: row, candidates, changes: [], include: true })
      }
    }

    // Missing: in DB but not matched, only for grades in this upload
    const uploadGrades = new Set(parsed.map(p => p.grade))
    const missingStudents = active
      .filter(s => !matchedIds.has(s.id) && (uploadGrades.has(s.grade) || uploadGrades.has(s.grade + 1)))
      .map(s => ({ student: s, deactivate: false }))

    setComparison(results)
    setMissing(missingStudents)
  }, [existingStudents])

  // ─── File Handlers ───────────────────────────────────────────────

  const handleFiles = useCallback(async (files: File[]) => {
    const names: string[] = []
    const allParsed: ParsedRow[] = []
    const errors: string[] = []
    for (const file of files) {
      names.push(file.name)
      try { allParsed.push(...await parseFile(file)) }
      catch (e: any) { errors.push(`${file.name}: ${e.message}`) }
    }
    if (errors.length > 0) showToast(errors.join('\n'))
    if (allParsed.length === 0) { showToast('No valid rows found.'); return }
    setFileNames(names)
    runComparison(allParsed)
    setStep('review')
  }, [parseFile, runComparison, showToast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (files.length > 0) handleFiles(files)
  }, [handleFiles])

  // ─── Resolve Ambiguous ───────────────────────────────────────────

  const resolveAmbiguous = (rowIdx: number, studentId: string | 'new') => {
    setComparison(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      if (studentId === 'new') return { ...r, status: 'new' as RowStatus, existing: undefined, candidates: undefined, changes: [] }
      const match = r.candidates?.find(s => s.id === studentId)
      if (!match) return r
      const changes: string[] = []
      if (match.grade !== r.parsed.grade) changes.push(`Grade ${match.grade}→${r.parsed.grade}`)
      if (match.korean_class !== r.parsed.korean_class) changes.push(`반 ${match.korean_class}→${r.parsed.korean_class}`)
      if (match.class_number !== r.parsed.class_number) changes.push(`# ${match.class_number}→${r.parsed.class_number}`)
      return { ...r, status: 'changed' as RowStatus, existing: match, candidates: undefined, changes }
    }))
  }

  // ─── Apply Changes ───────────────────────────────────────────────

  const applyChanges = async () => {
    setProcessing(true)
    setStep('processing')

    const toUpdate = comparison.filter(r => r.include && (r.status === 'changed' || r.status === 'match') && r.existing)
    const toAdd = comparison.filter(r => r.include && r.status === 'new')
    const toDeactivate = missing.filter(m => m.deactivate)
    const total = toUpdate.length + toAdd.length + toDeactivate.length
    setProgress({ done: 0, total, errors: [] })
    let done = 0
    const errors: string[] = []

    // Pass 1: Clear all slots for students being updated (set class_number negative)
    for (let i = 0; i < toUpdate.length; i++) {
      await supabase.from('students').update({ class_number: -(i + 1) }).eq('id', toUpdate[i].existing!.id)
    }
    // Also clear any OTHER students sitting in target slots
    const targetSlots = [...toUpdate, ...toAdd].map(r => ({ grade: r.parsed.grade, korean_class: r.parsed.korean_class, class_number: r.parsed.class_number }))
    const affectedGrades = [...new Set(targetSlots.map(s => s.grade))]
    const { data: potentialBlockers } = await supabase.from('students').select('id, grade, korean_class, class_number').eq('is_active', true).in('grade', affectedGrades).gt('class_number', 0)
    const updateIds = new Set(toUpdate.map(r => r.existing!.id))
    const blockerIds: string[] = []
    if (potentialBlockers) {
      for (const b of potentialBlockers) {
        if (updateIds.has(b.id)) continue
        if (targetSlots.some(t => t.grade === b.grade && t.korean_class === b.korean_class && t.class_number === b.class_number)) {
          blockerIds.push(b.id)
          await supabase.from('students').update({ class_number: -(b.class_number + 1000) }).eq('id', b.id)
        }
      }
    }

    // Pass 2: Write correct values
    for (const row of toUpdate) {
      try {
        const { error } = await supabase.from('students').update({
          grade: row.parsed.grade, korean_class: row.parsed.korean_class, class_number: row.parsed.class_number,
          needs_review: false, updated_at: new Date().toISOString(),
        }).eq('id', row.existing!.id)
        if (error) throw new Error(`Update ${row.existing!.english_name || row.parsed.korean_name}: ${error.message}`)
      } catch (e: any) { errors.push(e.message) }
      done++; setProgress({ done, total, errors: [...errors] })
    }

    // Pass 3: Add new students
    for (const row of toAdd) {
      try {
        const { error } = await supabase.from('students').insert({
          korean_name: row.parsed.korean_name, english_name: row.parsed.english_name || row.parsed.korean_name,
          grade: row.parsed.grade, korean_class: row.parsed.korean_class, class_number: row.parsed.class_number,
          english_class: 'Unplaced', is_active: true, needs_review: false, notes: '', photo_url: '', google_drive_folder_url: '',
        })
        if (error) throw new Error(`Add ${row.parsed.korean_name}: ${error.message}`)
      } catch (e: any) { errors.push(e.message) }
      done++; setProgress({ done, total, errors: [...errors] })
    }

    // Pass 4: Deactivate
    for (const m of toDeactivate) {
      try {
        const { error } = await supabase.from('students').update({
          is_active: false, notes: (m.student.notes ? m.student.notes + '\n' : '') + `Inactive ${new Date().toLocaleDateString()} (roster upload)`,
          updated_at: new Date().toISOString(),
        }).eq('id', m.student.id)
        if (error) throw new Error(`Deactivate ${m.student.english_name}: ${error.message}`)
      } catch (e: any) { errors.push(e.message) }
      done++; setProgress({ done, total, errors: [...errors] })
    }

    // Pass 5: Restore any displaced blockers
    const { data: stuck } = await supabase.from('students').select('id, class_number').lt('class_number', 0).eq('is_active', true)
    if (stuck && stuck.length > 0) {
      for (const s of stuck) {
        const restored = s.class_number <= -1000 ? -(s.class_number + 1000) : Math.abs(s.class_number)
        await supabase.from('students').update({ class_number: restored }).eq('id', s.id)
      }
    }

    setProcessing(false)
    setStep('done')
  }

  // ─── Stats ───────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    match: comparison.filter(r => r.status === 'match').length,
    changed: comparison.filter(r => r.status === 'changed').length,
    new: comparison.filter(r => r.status === 'new').length,
    ambiguous: comparison.filter(r => r.status === 'ambiguous').length,
    total: comparison.length,
  }), [comparison])

  const filtered = useMemo(() => filterStatus === 'all' ? comparison : comparison.filter(r => r.status === filterStatus), [comparison, filterStatus])
  const hasUnresolved = comparison.some(r => r.status === 'ambiguous')

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-navy/5 to-transparent">
          <div>
            <h2 className="text-[16px] font-bold text-navy">Upload Roster</h2>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              {step === 'upload' ? 'Drop files or click to browse' :
               step === 'review' ? `${fileNames.join(', ')} — ${comparison.length} students` :
               step === 'processing' ? 'Applying...' : 'Complete'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ─── Upload ─── */}
          {step === 'upload' && (
            <div className="max-w-md mx-auto py-8">
              <div className="border-2 border-dashed rounded-xl p-10 text-center transition-colors hover:border-navy/40 cursor-pointer border-border"
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                onClick={() => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx,.xls,.csv'; i.multiple = true; i.onchange = (e: any) => { const f = Array.from(e.target.files || []) as File[]; if (f.length > 0) handleFiles(f) }; i.click() }}>
                <Upload size={36} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-[14px] font-medium text-navy">Drop files here or click to browse</p>
                <p className="text-[11px] text-text-tertiary mt-1">.xlsx, .xls, or .csv — multiple files OK</p>
              </div>
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[11px] text-gray-800 leading-relaxed">
                  <strong>How it works:</strong> Upload the 반편성내역 files. Students are matched by Korean name (±1 grade) to keep their English name, class, and data.
                  You'll see a side-by-side comparison before anything changes.
                </p>
              </div>
            </div>
          )}

          {/* ─── Review ─── */}
          {step === 'review' && (
            <div>
              {/* Filter cards */}
              <div className="grid grid-cols-5 gap-2 mb-4">
                {([
                  { key: 'all', label: 'All', count: stats.total, bg: 'bg-surface border-border' },
                  { key: 'match', label: 'No Change', count: stats.match, bg: 'bg-green-50 border-green-200' },
                  { key: 'changed', label: 'Updated', count: stats.changed, bg: 'bg-blue-50 border-blue-200' },
                  { key: 'new', label: 'New', count: stats.new, bg: 'bg-emerald-50 border-emerald-200' },
                  { key: 'ambiguous', label: 'Pick Match', count: stats.ambiguous, bg: 'bg-red-50 border-red-200' },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setFilterStatus(f.key)}
                    className={`rounded-xl p-3 text-center border transition-all ${f.bg} ${filterStatus === f.key ? 'ring-2 ring-navy' : ''}`}>
                    <p className="text-[18px] font-bold text-gray-900">{f.count}</p>
                    <p className="text-[10px] text-gray-700 font-medium">{f.label}</p>
                  </button>
                ))}
              </div>

              {hasUnresolved && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-gray-900"><strong>{stats.ambiguous}</strong> student{stats.ambiguous !== 1 ? 's' : ''} matched multiple records. Pick the correct match or "Add as New".</p>
                </div>
              )}

              {/* Side-by-side table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="bg-surface-alt sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-center w-8"><input type="checkbox" checked={filtered.every(r => r.include)} onChange={e => { const s = new Set(filtered.map((_, i) => comparison.indexOf(filtered[i]))); setComparison(prev => prev.map((r, i) => s.has(i) ? { ...r, include: e.target.checked } : r)) }} /></th>
                        <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary" colSpan={3}>File → </th>
                        <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary" colSpan={3}>DB (current)</th>
                        <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary">Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, fIdx) => {
                        const gIdx = comparison.indexOf(row)
                        const bg = row.status === 'new' ? 'bg-emerald-50/40' : row.status === 'changed' ? 'bg-blue-50/40' : row.status === 'ambiguous' ? 'bg-red-50/40' : ''
                        return (
                          <tr key={fIdx} className={`border-t border-border ${bg} ${!row.include ? 'opacity-30' : ''}`}>
                            <td className="px-2 py-2 text-center"><input type="checkbox" checked={row.include} onChange={() => setComparison(prev => prev.map((r, i) => i === gIdx ? { ...r, include: !r.include } : r))} /></td>
                            {/* File side */}
                            <td className="px-3 py-2 font-medium text-gray-900">{row.parsed.korean_name}</td>
                            <td className="px-2 py-2 text-center">{row.parsed.korean_class}</td>
                            <td className="px-2 py-2 text-center">{row.parsed.class_number}</td>
                            {/* DB side */}
                            {row.status === 'ambiguous' ? (
                              <td colSpan={3} className="px-3 py-2">
                                <div className="space-y-1">
                                  {row.candidates?.map(c => (
                                    <button key={c.id} onClick={() => resolveAmbiguous(gIdx, c.id)}
                                      className="block w-full text-left px-2 py-1.5 rounded border border-red-200 hover:bg-red-100 text-[11px]">
                                      <span className="font-medium">{c.english_name}</span>
                                      <span className="text-text-tertiary ml-1">Gr{c.grade} {c.korean_class}#{c.class_number}</span>
                                      <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: classToColor(c.english_class), color: classToTextColor(c.english_class) }}>{c.english_class}</span>
                                    </button>
                                  ))}
                                  <button onClick={() => resolveAmbiguous(gIdx, 'new')} className="block w-full text-left px-2 py-1.5 rounded border border-emerald-200 hover:bg-emerald-50 text-[11px] text-emerald-700 font-medium">+ Add as new</button>
                                </div>
                              </td>
                            ) : row.existing ? (
                              <>
                                <td className="px-3 py-2">
                                  <span className="font-medium">{row.existing.english_name}</span>
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: classToColor(row.existing.english_class), color: classToTextColor(row.existing.english_class) }}>{row.existing.english_class}</span>
                                </td>
                                <td className={`px-2 py-2 text-center ${row.existing.korean_class !== row.parsed.korean_class ? 'font-bold text-blue-600' : ''}`}>{row.existing.korean_class}</td>
                                <td className={`px-2 py-2 text-center ${row.existing.class_number !== row.parsed.class_number ? 'font-bold text-blue-600' : ''}`}>{row.existing.class_number}</td>
                              </>
                            ) : (
                              <><td className="px-3 py-2 text-text-tertiary italic">New student</td><td></td><td></td></>
                            )}
                            {/* Status */}
                            <td className="px-3 py-2">
                              {row.status === 'match' && <span className="text-[10px] text-green-600 font-medium">✓ OK</span>}
                              {row.status === 'changed' && <span className="text-[10px] text-blue-600 font-medium">{row.changes.join(', ')}</span>}
                              {row.status === 'new' && <span className="text-[10px] text-emerald-600 font-medium">+ New</span>}
                              {row.status === 'ambiguous' && <span className="text-[10px] text-red-600 font-bold">← Pick</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Missing students */}
              {missing.length > 0 && (
                <div className="mt-4 border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-surface-alt border-b border-border">
                    <p className="text-[12px] font-semibold text-gray-900">{missing.length} in DB but not in files</p>
                    <p className="text-[10px] text-text-tertiary">Check to deactivate. Unchecked = left alone.</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {missing.map((m, i) => (
                      <div key={m.student.id} className="flex items-center gap-3 px-4 py-2 border-t border-border first:border-t-0 text-[12px]">
                        <input type="checkbox" checked={m.deactivate} onChange={() => setMissing(prev => prev.map((x, j) => j === i ? { ...x, deactivate: !x.deactivate } : x))} />
                        <span className="font-medium">{m.student.english_name}</span>
                        <span className="text-text-tertiary">{m.student.korean_name} · Gr{m.student.grade} {m.student.korean_class}#{m.student.class_number}</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: classToColor(m.student.english_class), color: classToTextColor(m.student.english_class) }}>{m.student.english_class}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply bar */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                <p className="text-[11px] text-text-tertiary">
                  {comparison.filter(r => r.include && r.status === 'changed').length} update · {comparison.filter(r => r.include && r.status === 'new').length} add · {missing.filter(m => m.deactivate).length} deactivate · {comparison.filter(r => r.include && r.status === 'match').length} no change
                </p>
                <div className="flex items-center gap-3">
                  <button onClick={onClose} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
                  <button onClick={applyChanges} disabled={hasUnresolved || processing}
                    className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-2">
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Processing ─── */}
          {step === 'processing' && (
            <div className="max-w-sm mx-auto py-12 text-center">
              <Loader2 size={36} className="animate-spin text-navy mx-auto mb-4" />
              <p className="text-[14px] font-medium text-navy">Applying changes...</p>
              <p className="text-[12px] text-text-secondary mt-1">{progress.done} / {progress.total}</p>
              <div className="w-full bg-surface-alt rounded-full h-2 mt-3"><div className="h-full bg-navy rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
            </div>
          )}

          {/* ─── Done ─── */}
          {step === 'done' && (
            <DoneStep comparison={comparison} missing={missing} progress={progress} onComplete={onComplete} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Done Step ──────────────────────────────────────────────────────

function DoneStep({ comparison, missing, progress, onComplete }: {
  comparison: ComparisonRow[]; missing: MissingStudent[]; progress: { done: number; total: number; errors: string[] }; onComplete: () => void
}) {
  const [showBatchAssign, setShowBatchAssign] = useState(false)
  const newlyAdded = comparison.filter(r => r.include && r.status === 'new')
  const updated = comparison.filter(r => r.include && r.status === 'changed')
  const deactivated = missing.filter(m => m.deactivate)

  if (showBatchAssign) return <BatchAssignEnglishClass onDone={() => { setShowBatchAssign(false); onComplete() }} />

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="text-center mb-5">
        {progress.errors.length === 0 ? (
          <><CheckCircle2 size={44} className="mx-auto text-green-500 mb-3" /><p className="text-[16px] font-bold text-navy">Roster Updated</p></>
        ) : (
          <><AlertTriangle size={44} className="mx-auto text-gray-700 mb-3" /><p className="text-[16px] font-bold text-navy">Done with {progress.errors.length} issue{progress.errors.length !== 1 ? 's' : ''}</p></>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="rounded-xl p-3 text-center bg-blue-50 border border-blue-200"><p className="text-[18px] font-bold text-gray-900">{updated.length}</p><p className="text-[10px] text-gray-700 font-medium">Updated</p></div>
        <div className="rounded-xl p-3 text-center bg-emerald-50 border border-emerald-200"><p className="text-[18px] font-bold text-gray-900">{newlyAdded.length}</p><p className="text-[10px] text-gray-700 font-medium">Added</p></div>
        <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-200"><p className="text-[18px] font-bold text-gray-900">{deactivated.length}</p><p className="text-[10px] text-gray-700 font-medium">Deactivated</p></div>
      </div>
      {progress.errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
          <p className="text-[12px] font-bold text-gray-900 mb-2">{progress.errors.length} issue{progress.errors.length !== 1 ? 's' : ''}</p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {progress.errors.map((e, i) => <p key={i} className="text-[11px] text-red-800">{e.replace(/duplicate key value violates unique constraint "[^"]*"/, 'slot conflict')}</p>)}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 mt-5">
        {newlyAdded.length > 0 && (
          <button onClick={() => setShowBatchAssign(true)} className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light">
            Assign English Classes ({newlyAdded.length} new) →
          </button>
        )}
        <button onClick={onComplete} className={`px-6 py-2.5 rounded-lg text-[13px] font-bold ${newlyAdded.length > 0 ? 'bg-surface-alt text-text-secondary hover:bg-border' : 'bg-navy text-white hover:bg-navy-dark'}`}>
          {newlyAdded.length > 0 ? 'Skip — Close' : 'Done'}
        </button>
      </div>
    </div>
  )
}

// ─── Batch Assign ───────────────────────────────────────────────────

export function BatchAssignEnglishClass({ onDone }: { onDone: () => void }) {
  const { showToast } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, EnglishClass>>({})
  const [bulkClass, setBulkClass] = useState<EnglishClass | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students').select('*').eq('is_active', true).order('grade').order('korean_class').order('class_number')
      if (data) {
        const need = (data as Student[]).filter(s => !s.english_name || s.english_name === s.korean_name)
        setStudents(need)
        const a: Record<string, EnglishClass> = {}; need.forEach(s => { a[s.id] = s.english_class }); setAssignments(a)
      }
      setLoading(false)
    })()
  }, [])

  const toggle = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const all = () => setSelected(new Set(students.map(s => s.id)))
  const none = () => setSelected(new Set())

  const handleSave = async () => {
    const changed = students.filter(s => assignments[s.id] && assignments[s.id] !== s.english_class)
    if (!changed.length) { showToast('No changes'); return }
    setSaving(true)
    let err = 0
    for (const s of changed) { const { error } = await supabase.from('students').update({ english_class: assignments[s.id], updated_at: new Date().toISOString() }).eq('id', s.id); if (error) err++ }
    setSaving(false)
    showToast(err ? `Saved with ${err} error(s)` : `${changed.length} assigned`)
    onDone()
  }

  const cnt = students.filter(s => assignments[s.id] && assignments[s.id] !== s.english_class).length
  if (loading) return <div className="py-12 text-center"><Loader2 size={24} className="animate-spin text-navy mx-auto" /></div>
  if (!students.length) return <div className="py-12 text-center"><CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" /><p className="text-[14px] font-medium text-navy">All students have names</p><button onClick={onDone} className="mt-4 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white">Close</button></div>

  return (
    <div>
      <h3 className="text-[15px] font-bold text-navy mb-1">Assign English Classes</h3>
      <p className="text-[11px] text-text-tertiary mb-3">{students.length} student{students.length !== 1 ? 's' : ''} need class assignment.</p>
      <div className="flex items-center gap-3 mb-3 p-3 bg-surface-alt rounded-xl flex-wrap">
        <button onClick={all} className="text-[10px] text-navy font-medium hover:underline">All ({students.length})</button>
        <button onClick={none} className="text-[10px] text-text-tertiary hover:underline">None</button>
        <div className="h-5 w-px bg-border" />
        <select value={bulkClass} onChange={e => setBulkClass(e.target.value as EnglishClass)} className="px-2 py-1 border border-border rounded text-[11px]"><option value="">Class...</option>{ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <button onClick={() => { if (!bulkClass) return; setAssignments(p => { const n = { ...p }; selected.forEach(id => { n[id] = bulkClass }); return n }); showToast(`Set ${selected.size} → ${bulkClass}`) }} disabled={!bulkClass || !selected.size} className="px-3 py-1 rounded text-[10px] font-bold bg-navy text-white disabled:opacity-30">Apply</button>
      </div>
      <div className="border border-border rounded-xl overflow-hidden mb-4"><div className="max-h-[400px] overflow-y-auto">
        <table className="w-full text-[11px]"><thead className="bg-surface-alt sticky top-0 z-10"><tr>
          <th className="px-3 py-2 w-8"><input type="checkbox" checked={students.every(s => selected.has(s.id))} onChange={e => e.target.checked ? all() : none()} /></th>
          <th className="px-3 py-2 text-left text-[9px] uppercase text-text-secondary">Name</th><th className="px-3 py-2 text-center text-[9px] uppercase text-text-secondary">Gr</th><th className="px-3 py-2 text-center text-[9px] uppercase text-text-secondary">반/번</th><th className="px-3 py-2 text-left text-[9px] uppercase text-text-secondary">Current</th><th className="px-3 py-2 text-left text-[9px] uppercase text-text-secondary">→ Assign</th>
        </tr></thead><tbody className="divide-y divide-border">
          {students.map(s => { const cur = assignments[s.id] || s.english_class; const ch = cur !== s.english_class; return (
            <tr key={s.id} className={selected.has(s.id) ? 'bg-blue-50/50' : ''}>
              <td className="px-3 py-2 text-center"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></td>
              <td className="px-3 py-2 font-medium">{s.korean_name}</td><td className="px-3 py-2 text-center">{s.grade}</td><td className="px-3 py-2 text-center">{s.korean_class} {s.class_number}</td>
              <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: classToColor(s.english_class), color: classToTextColor(s.english_class) }}>{s.english_class}</span></td>
              <td className="px-3 py-2"><select value={cur} onChange={e => setAssignments(p => ({ ...p, [s.id]: e.target.value as EnglishClass }))} className={`px-2 py-1 border rounded text-[11px] ${ch ? 'border-navy bg-navy/5 text-navy' : 'border-border text-text-secondary'}`}>{ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>{ch && <span className="ml-1 text-navy font-bold">●</span>}</td>
            </tr>
          ) })}
        </tbody></table>
      </div></div>
      <div className="flex items-center justify-between">
        <button onClick={onDone} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">{cnt ? 'Skip' : 'Close'}</button>
        <button onClick={handleSave} disabled={!cnt || saving} className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-gold text-navy-dark disabled:opacity-40 flex items-center gap-2">{saving && <Loader2 size={14} className="animate-spin" />} Save ({cnt})</button>
      </div>
    </div>
  )
}
