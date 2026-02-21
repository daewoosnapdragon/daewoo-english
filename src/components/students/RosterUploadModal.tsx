'use client'

import { useState, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, Grade, GRADES, ENGLISH_CLASSES, KOREAN_CLASSES, KoreanClass, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import {
  FileSpreadsheet, Upload, AlertTriangle, Check, X, Loader2,
  ArrowRight, UserPlus, UserMinus, RefreshCw, HelpCircle, ChevronDown
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface ParsedRow {
  korean_name: string
  grade: number
  korean_class: string
  class_number: number
  english_name?: string // may not be in admin roster
}

type MatchStatus = 'matched' | 'new' | 'missing' | 'changed'

interface ComparisonRow {
  status: MatchStatus
  parsed: ParsedRow
  existing?: Student
  changes?: string[] // what changed
  action: 'update' | 'add' | 'transfer' | 'skip'
  englishName: string
  englishClass: EnglishClass
}

interface Props {
  existingStudents: Student[]
  onComplete: () => void
  onClose: () => void
}

export default function RosterUploadModal({ existingStudents, onComplete, onClose }: Props) {
  const { currentTeacher, showToast } = useApp()
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'processing'>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [comparison, setComparison] = useState<ComparisonRow[]>([])
  const [missingStudents, setMissingStudents] = useState<Student[]>([])
  const [gradeFilter, setGradeFilter] = useState<Grade | 'all'>('all')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [fileName, setFileName] = useState('')

  // Column mapping state
  const [columns, setColumns] = useState<string[]>([])
  const [rawData, setRawData] = useState<any[][]>([])
  const [colMap, setColMap] = useState<Record<string, number>>({
    korean_name: -1, grade: -1, korean_class: -1, class_number: -1, english_name: -1
  })

  // ─── Step 1: Parse file ───────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

      if (json.length < 2) { showToast('File appears empty'); return }

      // First row = headers
      const headers = json[0].map((h: any) => String(h || '').trim())
      setColumns(headers)
      setRawData(json.slice(1).filter((r: any[]) => r.some(c => c != null && c !== '')))

      // Try auto-mapping common column names
      const autoMap = { korean_name: -1, grade: -1, korean_class: -1, class_number: -1, english_name: -1 }
      headers.forEach((h: string, i: number) => {
        const lower = h.toLowerCase()
        if (lower.includes('이름') || lower.includes('name') && !lower.includes('english')) autoMap.korean_name = i
        if (lower.includes('학년') || lower === 'grade') autoMap.grade = i
        if (lower.includes('반') && !lower.includes('번')) autoMap.korean_class = i
        if (lower.includes('번') || lower.includes('number')) autoMap.class_number = i
        if (lower.includes('english') || lower.includes('영어')) autoMap.english_name = i
      })
      setColMap(autoMap)
      setStep('map')
    } catch (e: any) {
      showToast(`Error reading file: ${e.message}`)
    }
  }, [showToast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ─── Step 2: Confirm mapping and compare ──────────────
  const canProceed = colMap.korean_name >= 0 && colMap.grade >= 0 && colMap.korean_class >= 0 && colMap.class_number >= 0

  const processMapping = () => {
    const rows: ParsedRow[] = []
    rawData.forEach(row => {
      const kn = String(row[colMap.korean_name] || '').trim()
      const gr = Number(row[colMap.grade]) || 0
      const kc = String(row[colMap.korean_class] || '').trim()
      const cn = Number(row[colMap.class_number]) || 0
      const en = colMap.english_name >= 0 ? String(row[colMap.english_name] || '').trim() : ''
      if (kn && gr >= 1 && gr <= 6 && cn > 0) {
        rows.push({ korean_name: kn, grade: gr, korean_class: kc, class_number: cn, english_name: en || undefined })
      }
    })
    setParsedRows(rows)
    runComparison(rows)
    setStep('review')
  }

  const runComparison = (rows: ParsedRow[]) => {
    const activeStudents = existingStudents.filter(s => s.is_active)
    const matchedExistingIds = new Set<string>()
    const results: ComparisonRow[] = []

    rows.forEach(parsed => {
      // Try exact match: same korean_name + grade (allowing grade progression: grade-1)
      let match = activeStudents.find(s =>
        s.korean_name === parsed.korean_name && s.grade === parsed.grade && !matchedExistingIds.has(s.id)
      )
      // Try grade progression match (student moved up a grade)
      if (!match) {
        match = activeStudents.find(s =>
          s.korean_name === parsed.korean_name && (s.grade === parsed.grade - 1 || s.grade === parsed.grade + 1) && !matchedExistingIds.has(s.id)
        )
      }
      // Try name-only match (last resort)
      if (!match) {
        match = activeStudents.find(s =>
          s.korean_name === parsed.korean_name && !matchedExistingIds.has(s.id)
        )
      }

      if (match) {
        matchedExistingIds.add(match.id)
        const changes: string[] = []
        if (match.grade !== parsed.grade) changes.push(`Grade: ${match.grade} → ${parsed.grade}`)
        if (match.korean_class !== parsed.korean_class) changes.push(`Korean class: ${match.korean_class} → ${parsed.korean_class}`)
        if (match.class_number !== parsed.class_number) changes.push(`Number: ${match.class_number} → ${parsed.class_number}`)

        results.push({
          status: changes.length > 0 ? 'changed' : 'matched',
          parsed,
          existing: match,
          changes,
          action: 'update',
          englishName: match.english_name,
          englishClass: match.english_class as EnglishClass,
        })
      } else {
        results.push({
          status: 'new',
          parsed,
          action: 'add',
          englishName: parsed.english_name || '',
          englishClass: 'Lily',
        })
      }
    })

    // Students in DB but not in new roster = potentially transferred
    const missing = activeStudents.filter(s => !matchedExistingIds.has(s.id))
    setMissingStudents(missing)
    setComparison(results)
  }

  // ─── Step 3: Apply changes ────────────────────────────
  const applyChanges = async () => {
    setProcessing(true)
    setStep('processing')
    const toProcess = comparison.filter(r => r.action !== 'skip')
    setProgress({ done: 0, total: toProcess.length + missingStudents.filter(s => s.is_active).length })
    let done = 0

    for (const row of toProcess) {
      if (row.action === 'update' && row.existing) {
        await supabase.from('students').update({
          grade: row.parsed.grade,
          korean_class: row.parsed.korean_class,
          class_number: row.parsed.class_number,
          english_name: row.englishName || row.existing.english_name,
          english_class: row.englishClass,
          updated_at: new Date().toISOString(),
        }).eq('id', row.existing.id)
      } else if (row.action === 'add') {
        await supabase.from('students').insert({
          korean_name: row.parsed.korean_name,
          english_name: row.englishName || row.parsed.korean_name,
          grade: row.parsed.grade,
          korean_class: row.parsed.korean_class,
          class_number: row.parsed.class_number,
          english_class: row.englishClass,
          is_active: true,
          notes: '',
          photo_url: '',
          google_drive_folder_url: '',
        })
      }
      done++
      setProgress({ done, total: toProcess.length + missingStudents.length })
    }

    // Mark missing students as transferred
    for (const s of missingStudents) {
      await supabase.from('students').update({
        is_active: false,
        notes: (s.notes ? s.notes + '\n' : '') + `Marked as transfer on ${new Date().toLocaleDateString()} (not in uploaded roster)`,
        updated_at: new Date().toISOString(),
      }).eq('id', s.id)
      done++
      setProgress({ done, total: toProcess.length + missingStudents.length })
    }

    setProcessing(false)
    showToast(`Roster updated: ${comparison.filter(r => r.action === 'update').length} updated, ${comparison.filter(r => r.action === 'add').length} added, ${missingStudents.length} marked as transfer`)
    onComplete()
  }

  const updateRow = (idx: number, field: string, value: any) => {
    setComparison(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  // Filter
  const filtered = gradeFilter === 'all' ? comparison : comparison.filter(r => r.parsed.grade === gradeFilter)
  const stats = {
    matched: comparison.filter(r => r.status === 'matched').length,
    changed: comparison.filter(r => r.status === 'changed').length,
    new: comparison.filter(r => r.status === 'new').length,
    missing: missingStudents.length,
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-navy/5 to-transparent">
          <div>
            <h2 className="text-lg font-display font-bold text-navy">Upload Roster</h2>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              {step === 'upload' ? 'Upload an Excel or CSV file with student data' :
               step === 'map' ? 'Map columns from your file to student fields' :
               step === 'review' ? `Review ${comparison.length} students before applying` :
               'Applying changes...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* ─── UPLOAD STEP ─── */}
          {step === 'upload' && (
            <div className="max-w-md mx-auto py-8">
              <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors hover:border-navy/40 cursor-pointer ${fileName ? 'border-green-300 bg-green-50' : 'border-border'}`}
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv'; input.onchange = (e: any) => { if (e.target.files[0]) handleFile(e.target.files[0]) }; input.click() }}>
                <Upload size={36} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-[14px] font-medium text-navy">Drop file here or click to browse</p>
                <p className="text-[11px] text-text-tertiary mt-1">.xlsx, .xls, or .csv</p>
              </div>
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Expected columns:</strong> Korean Name (이름), Grade (학년), Korean Class (반), Class Number (번호). English Name is optional -- existing English names will be carried over from the current roster.
                </p>
              </div>
            </div>
          )}

          {/* ─── COLUMN MAPPING STEP ─── */}
          {step === 'map' && (
            <div className="max-w-xl mx-auto">
              <p className="text-[12px] text-text-secondary mb-4">File: <strong>{fileName}</strong> ({rawData.length} rows found)</p>
              <div className="space-y-3">
                {[
                  { key: 'korean_name', label: 'Korean Name (이름)', required: true },
                  { key: 'grade', label: 'Grade (학년)', required: true },
                  { key: 'korean_class', label: 'Korean Class (반)', required: true },
                  { key: 'class_number', label: 'Class Number (번호)', required: true },
                  { key: 'english_name', label: 'English Name (optional)', required: false },
                ].map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-navy w-48">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </span>
                    <ArrowRight size={14} className="text-text-tertiary" />
                    <select value={colMap[field.key]} onChange={e => setColMap(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                      className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap[field.key] >= 0 ? 'border-green-300 bg-green-50' : field.required ? 'border-red-300 bg-red-50' : 'border-border'}`}>
                      <option value={-1}>-- Select column --</option>
                      {columns.map((col, i) => <option key={i} value={i}>{col}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {rawData.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Preview (first 5 rows)</p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="text-[11px] w-full">
                      <thead><tr className="bg-surface-alt">{columns.map((c, i) => <th key={i} className="px-3 py-2 text-left text-text-secondary">{c}</th>)}</tr></thead>
                      <tbody>{rawData.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-t border-border">{columns.map((_, ci) => <td key={ci} className="px-3 py-1.5">{row[ci] ?? ''}</td>)}</tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Back</button>
                <button onClick={processMapping} disabled={!canProceed}
                  className="px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
                  Compare with Current Roster
                </button>
              </div>
            </div>
          )}

          {/* ─── REVIEW STEP ─── */}
          {step === 'review' && (
            <div>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-green-700">{stats.matched}</p>
                  <p className="text-[10px] text-green-600 font-medium">Matched</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-amber-700">{stats.changed}</p>
                  <p className="text-[10px] text-amber-600 font-medium">Changed</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-blue-700">{stats.new}</p>
                  <p className="text-[10px] text-blue-600 font-medium">New Students</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-red-700">{stats.missing}</p>
                  <p className="text-[10px] text-red-600 font-medium">Not in Roster (Transfer?)</p>
                </div>
              </div>

              {/* Grade filter */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Filter:</span>
                <button onClick={() => setGradeFilter('all')} className={`px-3 py-1 rounded-lg text-[11px] font-medium ${gradeFilter === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
                {GRADES.map(g => (
                  <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1 rounded-lg text-[11px] font-medium ${gradeFilter === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>
                ))}
              </div>

              {/* Comparison table */}
              <div className="border border-border rounded-xl overflow-hidden mb-4">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface-alt sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-8">Status</th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Korean Name</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Gr</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">반/번</th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">English Name</th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">English Class</th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Changes</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((row, i) => {
                        const realIdx = comparison.indexOf(row)
                        return (
                        <tr key={i} className={row.action === 'skip' ? 'opacity-40' : ''}>
                          <td className="px-3 py-2">
                            {row.status === 'matched' && <Check size={14} className="text-green-500" />}
                            {row.status === 'changed' && <RefreshCw size={14} className="text-amber-500" />}
                            {row.status === 'new' && <UserPlus size={14} className="text-blue-500" />}
                          </td>
                          <td className="px-3 py-2 font-medium">{row.parsed.korean_name}</td>
                          <td className="px-3 py-2 text-center">{row.parsed.grade}</td>
                          <td className="px-3 py-2 text-center">{row.parsed.korean_class} {row.parsed.class_number}</td>
                          <td className="px-3 py-2">
                            <input value={row.englishName} onChange={e => updateRow(realIdx, 'englishName', e.target.value)}
                              className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy"
                              placeholder={row.status === 'new' ? 'Enter English name' : ''} />
                          </td>
                          <td className="px-3 py-2">
                            <select value={row.englishClass} onChange={e => updateRow(realIdx, 'englishClass', e.target.value)}
                              className="px-2 py-1 border border-border rounded text-[11px] outline-none">
                              {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-text-tertiary">
                            {row.changes && row.changes.length > 0 ? row.changes.join(', ') : row.status === 'new' ? 'New student' : 'No changes'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <select value={row.action} onChange={e => updateRow(realIdx, 'action', e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-medium border ${
                                row.action === 'skip' ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-surface border-border'
                              }`}>
                              <option value="update">Update</option>
                              <option value="add">Add New</option>
                              <option value="skip">Skip</option>
                            </select>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Missing students (not in uploaded roster) */}
              {missingStudents.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <h4 className="text-[12px] font-bold text-red-800 mb-2 flex items-center gap-1.5">
                    <UserMinus size={14} /> Students NOT in Uploaded Roster ({missingStudents.length})
                  </h4>
                  <p className="text-[10px] text-red-700 mb-3">These students exist in the current roster but were not found in the uploaded file. They will be marked as inactive (transferred).</p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingStudents.map(s => (
                      <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-red-200 text-[10px]">
                        <span className="font-medium">{s.korean_name}</span>
                        <span className="text-text-tertiary">({s.english_name})</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ backgroundColor: classToColor(s.english_class as EnglishClass), color: classToTextColor(s.english_class as EnglishClass) }}>{s.english_class}</span>
                        <span className="text-text-tertiary">Gr{s.grade}</span>
                      </span>
                    ))}
                  </div>
                  <button onClick={() => setMissingStudents([])}
                    className="mt-2 text-[10px] text-red-600 hover:text-red-800 underline">
                    Keep all these students active (don't mark as transfer)
                  </button>
                </div>
              )}

              <div className="flex justify-between items-center">
                <button onClick={() => setStep('map')} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Back to Mapping</button>
                <div className="flex gap-2">
                  <p className="text-[11px] text-text-tertiary self-center mr-2">
                    {comparison.filter(r => r.action !== 'skip').length} to update/add, {missingStudents.length} to mark as transfer
                  </p>
                  <button onClick={applyChanges} className="px-5 py-2.5 rounded-lg text-[12px] font-bold bg-gold text-navy-dark hover:bg-gold-light">
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── PROCESSING STEP ─── */}
          {step === 'processing' && (
            <div className="max-w-md mx-auto py-12 text-center">
              <Loader2 size={32} className="animate-spin text-navy mx-auto mb-4" />
              <p className="text-[14px] font-medium text-navy">Applying roster changes...</p>
              <p className="text-[12px] text-text-secondary mt-1">{progress.done} / {progress.total}</p>
              <div className="w-full h-2 bg-surface-alt rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
