'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, Grade, GRADES, ENGLISH_CLASSES, KOREAN_CLASSES, KoreanClass, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import {
  FileSpreadsheet, Upload, AlertTriangle, Check, X, Loader2,
  ArrowRight, UserPlus, UserMinus, RefreshCw, HelpCircle, ChevronDown,
  Shield, Eye, CheckCircle2, XCircle, Info
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

type MatchStatus = 'matched' | 'new' | 'changed' | 'needs_review'

type MatchConfidence = 'exact' | 'grade_changed' | 'ambiguous'

interface ComparisonRow {
  status: MatchStatus
  confidence: MatchConfidence
  parsed: ParsedRow
  existing?: Student
  changes?: string[]
  action: 'update' | 'add' | 'skip'
  englishName: string
  englishClass: EnglishClass
  candidates?: Student[] // for ambiguous matches
  reviewReason?: string  // why this needs manual review
}

interface MissingStudent {
  student: Student
  deactivate: boolean // user controls per-student
}

interface Props {
  existingStudents: Student[]
  onComplete: () => void
  onClose: () => void
}

// ─── Main Component ─────────────────────────────────────────────────

export default function RosterUploadModal({ existingStudents, onComplete, onClose }: Props) {
  const { currentTeacher, showToast } = useApp()
  const [step, setStep] = useState<'upload' | 'map' | 'review' | 'confirm' | 'processing' | 'done'>('upload')
  const [comparison, setComparison] = useState<ComparisonRow[]>([])
  const [missingStudents, setMissingStudents] = useState<MissingStudent[]>([])
  const [gradeFilter, setGradeFilter] = useState<Grade | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] as string[] })
  const [fileName, setFileName] = useState('')
  const [fileNames, setFileNames] = useState<string[]>([])
  const [detectedFormat, setDetectedFormat] = useState<'standard' | 'korean_admin'>('standard')

  // Column mapping state
  const [columns, setColumns] = useState<string[]>([])
  const [rawData, setRawData] = useState<any[][]>([])
  const [colMap, setColMap] = useState<Record<string, number>>({
    korean_name: -1, grade: -1, korean_class: -1, class_number: -1, english_name: -1
  })
  // Grade 1 simple mode: when file is just a name list
  const [gradeOverride, setGradeOverride] = useState<number | null>(null)
  const [classOverride, setClassOverride] = useState<string>('')
  const [autoNumber, setAutoNumber] = useState(false)

  // ─── Step 1: Parse file ───────────────────────────────

  // Parse a single file into columns + raw data (for mapping step)
  const parseFile = useCallback(async (file: File): Promise<{ headers: string[]; dataRows: any[][]; isKorean: boolean; autoMap: Record<string, number>; gradeFromName: number | null; classFromName: string }> => {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    if (json.length < 2) throw new Error('File appears empty')

    // Smart header detection for Korean admin format
    let headerRowIdx = 0
    let detectedKoreanAdmin = false

    for (let r = 0; r < Math.min(json.length, 15); r++) {
      const rowStrs = (json[r] || []).map((c: any) => String(c || '').trim())
      const has번호 = rowStrs.some(s => s === '번호')
      const has성명 = rowStrs.some(s => s === '성명' || s === '이름')
      const has학년 = rowStrs.some(s => s === '학년')
      if ((has번호 && has성명) || (has학년 && has번호)) {
        headerRowIdx = r
        detectedKoreanAdmin = true
        break
      }
    }

    const headers = (json[headerRowIdx] || []).map((h: any) => String(h || '').trim())
    let dataStartIdx = headerRowIdx + 1
    if (detectedKoreanAdmin && dataStartIdx < json.length) {
      const nextRow = (json[dataStartIdx] || []).map((c: any) => String(c || '').trim())
      const looksLikeSubHeader = nextRow.filter(s => s).length <= 4 &&
        nextRow.some(s => ['학년', '반', '번호'].includes(s))
      if (looksLikeSubHeader) dataStartIdx++
    }

    const dataRows = json.slice(dataStartIdx).filter((r: any[]) => {
      const nonEmpty = r.filter(c => c != null && c !== '')
      if (nonEmpty.length === 0) return false
      const rowStr = nonEmpty.map(String).join('')
      if (/[남여]\(\d+\)명/.test(rowStr) || /계:\(\d+\)/.test(rowStr)) return false
      if (/초등학교|중학교|학교$/.test(rowStr.trim())) return false
      return true
    })

    // Auto-mapping
    const autoMap = { korean_name: -1, grade: -1, korean_class: -1, class_number: -1, english_name: -1 }
    headers.forEach((h: string, i: number) => {
      const s = h.trim()
      if (s === '성명' || s === '이름') autoMap.korean_name = i
      else if (s === '학년') autoMap.grade = i
      else if (s === '반') autoMap.korean_class = i
      else if (s === '번호') autoMap.class_number = i
      else if (/english|영어/i.test(s)) autoMap.english_name = i
    })
    if (autoMap.korean_name < 0) {
      headers.forEach((h: string, i: number) => {
        const lower = h.toLowerCase()
        if (autoMap.korean_name < 0 && (lower.includes('name') && !lower.includes('english'))) autoMap.korean_name = i
        if (autoMap.grade < 0 && lower === 'grade') autoMap.grade = i
        if (autoMap.korean_class < 0 && lower.includes('class') && !lower.includes('english')) autoMap.korean_class = i
        if (autoMap.class_number < 0 && lower.includes('number')) autoMap.class_number = i
        if (autoMap.english_name < 0 && lower.includes('english')) autoMap.english_name = i
      })
    }

    // Detect grade/class from filename
    const fnGradeMatch = file.name.match(/(\d)학년/)
    const gradeFromName = fnGradeMatch ? Number(fnGradeMatch[1]) : null
    const fnClassMatch = file.name.match(/[가-힣]*([가-힣])반/)
    const classFromName = fnClassMatch ? fnClassMatch[1] : ''

    return { headers, dataRows, isKorean: detectedKoreanAdmin, autoMap, gradeFromName, classFromName }
  }, [])

  // Convert raw data rows to ParsedRows using mapping + overrides
  const rowsToParsed = (dataRows: any[][], map: Record<string, number>, gradeOvr: number | null, classOvr: string, autoNum: boolean): ParsedRow[] => {
    const rows: ParsedRow[] = []
    dataRows.forEach((row, rowIdx) => {
      const kn = String(row[map.korean_name] || '').trim()
      let gr = 0
      if (map.grade >= 0) { const m = String(row[map.grade] || '').match(/(\d+)/); gr = m ? Number(m[1]) : 0 }
      else if (gradeOvr != null) gr = gradeOvr
      let kc = ''
      if (map.korean_class >= 0) kc = String(row[map.korean_class] || '').trim()
      else if (classOvr) kc = classOvr
      let cn = 0
      if (map.class_number >= 0) cn = Number(row[map.class_number]) || 0
      else if (autoNum) cn = rowIdx + 1
      const en = map.english_name >= 0 ? String(row[map.english_name] || '').trim() : ''
      if (kn && gr >= 1 && gr <= 6 && cn > 0) {
        rows.push({ korean_name: kn, grade: gr, korean_class: kc, class_number: cn, english_name: en || undefined })
      }
    })
    return rows
  }

  // Handle single file (falls through to mapping if auto-map incomplete)
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    setFileNames([file.name])
    try {
      const result = await parseFile(file)
      setColumns(result.headers)
      setRawData(result.dataRows)
      setColMap(result.autoMap)
      setDetectedFormat(result.isKorean ? 'korean_admin' : 'standard')
      if (result.gradeFromName && result.autoMap.grade < 0) setGradeOverride(result.gradeFromName)
      if (result.classFromName && result.autoMap.korean_class < 0) setClassOverride(result.classFromName)
      setStep('map')
    } catch (e: any) {
      showToast(`Error reading file: ${e.message}`)
    }
  }, [showToast, parseFile])

  // Handle multiple files — parse all, merge, skip to review
  const handleMultipleFiles = useCallback(async (files: File[]) => {
    const names: string[] = []
    const allParsed: ParsedRow[] = []
    const errors: string[] = []

    for (const file of files) {
      names.push(file.name)
      try {
        const result = await parseFile(file)
        const canAutoMap = result.autoMap.korean_name >= 0 && result.autoMap.class_number >= 0
          && (result.autoMap.grade >= 0 || result.gradeFromName != null)
          && (result.autoMap.korean_class >= 0 || result.classFromName !== '')

        if (!canAutoMap) {
          errors.push(`${file.name}: couldn't auto-detect columns. Upload individually to map manually.`)
          continue
        }

        const rows = rowsToParsed(
          result.dataRows, result.autoMap,
          result.autoMap.grade < 0 ? result.gradeFromName : null,
          result.autoMap.korean_class < 0 ? result.classFromName : '',
          false
        )
        allParsed.push(...rows)
      } catch (e: any) {
        errors.push(`${file.name}: ${e.message}`)
      }
    }

    if (errors.length > 0) showToast(errors.join('\n'))

    if (allParsed.length === 0) {
      showToast('No valid student rows found across files.')
      return
    }

    setFileNames(names)
    setFileName(names.join(', '))
    runComparison(allParsed)
    setStep('review')
  }, [showToast, parseFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name))
    if (files.length === 0) return
    if (files.length === 1) handleFile(files[0])
    else handleMultipleFiles(files)
  }, [handleFile, handleMultipleFiles])

  // ─── Step 2: Parse rows and run comparison ────────────

  const hasGrade = colMap.grade >= 0 || gradeOverride != null
  const hasClass = colMap.korean_class >= 0 || classOverride !== ''
  const hasNumber = colMap.class_number >= 0 || autoNumber
  const canProceed = colMap.korean_name >= 0 && hasGrade && hasClass && hasNumber

  const processMapping = () => {
    const rows = rowsToParsed(rawData, colMap, gradeOverride, classOverride, autoNumber)
    if (rows.length === 0) {
      showToast('No valid student rows found. Check your column mapping.')
      return
    }
    runComparison(rows)
    setStep('review')
  }

  const runComparison = (rows: ParsedRow[]) => {
    const activeStudents = existingStudents.filter(s => s.is_active)
    const matchedExistingIds = new Set<string>()
    const results: ComparisonRow[] = []

    rows.forEach(parsed => {
      // Find ALL candidates with same korean_name (across all grades)
      const allNameMatches = activeStudents.filter(s =>
        s.korean_name === parsed.korean_name && !matchedExistingIds.has(s.id)
      )

      // Case 1: No matches at all → new student
      if (allNameMatches.length === 0) {
        results.push({
          status: 'new',
          confidence: 'exact',
          parsed,
          action: 'add',  // FIX: default new students to "add", not "update"
          englishName: parsed.english_name || '',
          englishClass: 'Lily',
        })
        return
      }

      // Case 2: Exact match on name + grade, OR grade±1 (normal year-to-year update)
      const exactMatch = allNameMatches.find(s => s.grade === parsed.grade)
      const gradeAdjacentMatch = !exactMatch
        ? allNameMatches.find(s => Math.abs(s.grade - parsed.grade) === 1)
        : null

      // Case 3: No exact or adjacent match, but name matches exist → needs review
      if (!exactMatch && !gradeAdjacentMatch && allNameMatches.length >= 1) {
        results.push({
          status: 'needs_review',
          confidence: 'ambiguous',
          parsed,
          candidates: allNameMatches,
          action: 'skip',
          englishName: parsed.english_name || allNameMatches[0]?.english_name || '',
          englishClass: (allNameMatches[0]?.english_class || 'Lily') as EnglishClass,
          reviewReason: allNameMatches.length === 1
            ? `Name matches ${allNameMatches[0].english_name} (Gr${allNameMatches[0].grade} → Gr${parsed.grade}, ±${Math.abs(allNameMatches[0].grade - parsed.grade)} grades)`
            : `${allNameMatches.length} students share this Korean name`,
        })
        return
      }

      // Case 4: Multiple same-grade matches → needs review (duplicate names)
      const sameGradeMatches = allNameMatches.filter(s => s.grade === parsed.grade)
      if (sameGradeMatches.length > 1) {
        results.push({
          status: 'needs_review',
          confidence: 'ambiguous',
          parsed,
          candidates: sameGradeMatches,
          action: 'skip',
          englishName: parsed.english_name || '',
          englishClass: (sameGradeMatches[0]?.english_class || 'Lily') as EnglishClass,
          reviewReason: `${sameGradeMatches.length} students named "${parsed.korean_name}" in Grade ${parsed.grade}`,
        })
        return
      }

      // Case 5: Single clear match (exact grade or grade±1)
      const match = exactMatch || gradeAdjacentMatch!
      matchedExistingIds.add(match.id)

      const changes: string[] = []
      if (match.grade !== parsed.grade) changes.push(`Grade: ${match.grade} → ${parsed.grade}`)
      if (match.korean_class !== parsed.korean_class) changes.push(`반: ${match.korean_class} → ${parsed.korean_class}`)
      if (match.class_number !== parsed.class_number) changes.push(`번호: ${match.class_number} → ${parsed.class_number}`)

      results.push({
        status: changes.length > 0 ? 'changed' : 'matched',
        confidence: match.grade !== parsed.grade ? 'grade_changed' : 'exact',
        parsed,
        existing: match,
        changes,
        action: 'update',
        englishName: match.english_name,
        englishClass: match.english_class as EnglishClass,
      })
    })

    // Students in DB but not matched → potentially graduated/transferred
    // Default to NOT deactivating (safer) — teacher must opt in per-student
    const missing = activeStudents
      .filter(s => !matchedExistingIds.has(s.id))
      .map(s => ({ student: s, deactivate: false }))
    setMissingStudents(missing)
    setComparison(results)
  }

  // ─── Step 3: Apply changes ────────────────────────────

  const applyChanges = async () => {
    setProcessing(true)
    setStep('processing')

    const toProcess = comparison.filter(r => r.action !== 'skip')
    const skippedWithExisting = comparison.filter(r => r.action === 'skip' && r.existing)
    const toDeactivate = missingStudents.filter(m => m.deactivate)
    const totalOps = toProcess.length + skippedWithExisting.length + toDeactivate.length
    setProgress({ done: 0, total: totalOps, errors: [] })

    let done = 0
    const errors: string[] = []

    // ── TWO-PASS UPDATE to avoid unique constraint collisions ──
    // The unique constraint is (grade, korean_class, class_number).
    // We need to clear ALL potential collision slots — not just students in
    // this upload, but any student who currently sits in a slot we need.
    
    const updates = toProcess.filter(r => r.action === 'update' && r.existing)
    const adds = toProcess.filter(r => r.action === 'add')

    // Collect all target slots we need to write to
    const targetSlots = [...updates, ...adds].map(r => ({
      grade: r.parsed.grade,
      korean_class: r.parsed.korean_class,
      class_number: r.parsed.class_number,
    }))

    // Pass 1: Clear slots — for students being updated, set class_number negative
    // Also find and temporarily displace any OTHER students sitting in target slots
    if (updates.length > 0 || adds.length > 0) {
      // IDs of students we're updating (they'll all get new values in Pass 2)
      const updateIds = new Set(updates.map(r => r.existing!.id))
      
      // Find other students occupying our target slots
      const grades = [...new Set(targetSlots.map(s => s.grade))]
      const { data: potentialBlockers } = await supabase
        .from('students')
        .select('id, grade, korean_class, class_number')
        .eq('is_active', true)
        .in('grade', grades)
      
      const blockerIds: string[] = []
      if (potentialBlockers) {
        for (const blocker of potentialBlockers) {
          if (updateIds.has(blocker.id)) continue // we'll handle these below
          // Check if this student sits in a slot we need
          const isBlocking = targetSlots.some(t =>
            t.grade === blocker.grade && t.korean_class === blocker.korean_class && t.class_number === blocker.class_number
          )
          if (isBlocking) blockerIds.push(blocker.id)
        }
      }

      // Temporarily displace blockers to class_number = -(original_number + 1000)
      for (const bid of blockerIds) {
        const b = potentialBlockers!.find(p => p.id === bid)!
        await supabase.from('students').update({ class_number: -(b.class_number + 1000) }).eq('id', bid)
      }

      // Temporarily displace all students being updated
      const ids = updates.map(r => r.existing!.id)
      for (let i = 0; i < ids.length; i++) {
        await supabase.from('students').update({ class_number: -(i + 1) }).eq('id', ids[i])
      }
    }

    // Pass 2: Write all final values
    for (const row of updates) {
      try {
        const upd: Record<string, any> = {
          grade: row.parsed.grade,
          korean_class: row.parsed.korean_class,
          class_number: row.parsed.class_number,
          needs_review: false,
          updated_at: new Date().toISOString(),
        }
        if (row.englishName && row.englishName !== row.existing!.english_name) {
          upd.english_name = row.englishName
        }
        if (row.englishClass !== row.existing!.english_class) {
          upd.english_class = row.englishClass
        }
        const { error } = await supabase.from('students').update(upd).eq('id', row.existing!.id)
        if (error) throw new Error(`Update ${row.existing!.english_name}: ${error.message}`)
      } catch (e: any) {
        errors.push(e.message)
      }
      done++
      setProgress({ done, total: totalOps, errors: [...errors] })
    }

    // Pass 3: Insert new students
    for (const row of adds) {
      try {
        const { error } = await supabase.from('students').insert({
          korean_name: row.parsed.korean_name,
          english_name: row.englishName || row.parsed.korean_name,
          grade: row.parsed.grade,
          korean_class: row.parsed.korean_class,
          class_number: row.parsed.class_number,
          english_class: row.englishClass,
          is_active: true,
          needs_review: false,
          notes: '',
          photo_url: '',
          google_drive_folder_url: '',
        })
        if (error) throw new Error(`Add ${row.parsed.korean_name}: ${error.message}`)
      } catch (e: any) {
        errors.push(e.message)
      }
      done++
      setProgress({ done, total: totalOps, errors: [...errors] })
    }

    // Pass 4: Restore any displaced blockers that weren't overwritten
    // (students who were temporarily moved to negative numbers but aren't in this upload)
    const { data: stillNegative } = await supabase
      .from('students')
      .select('id, class_number')
      .eq('is_active', true)
      .lt('class_number', 0)
    if (stillNegative && stillNegative.length > 0) {
      for (const s of stillNegative) {
        // Restore: -(original + 1000) → original
        const original = s.class_number <= -1000 ? -(s.class_number + 1000) : -s.class_number
        await supabase.from('students').update({ class_number: original }).eq('id', s.id)
      }
      if (stillNegative.length > 0) {
        errors.push(`Note: ${stillNegative.length} student(s) had slot conflicts and were restored to original numbers. Re-upload their class files to fix.`)
      }
    }

    // Flag skipped students as needs_review so teacher can find them later
    for (const row of skippedWithExisting) {
      try {
        const reason = row.reviewReason || 'Skipped during roster upload'
        const { error } = await supabase.from('students').update({
          needs_review: true,
          notes: (row.existing!.notes ? row.existing!.notes + '\n' : '') +
            `⚠️ Needs review (${new Date().toLocaleDateString()}): ${reason}`,
          updated_at: new Date().toISOString(),
        }).eq('id', row.existing!.id)
        if (error) throw new Error(`Flag ${row.existing!.english_name}: ${error.message}`)
      } catch (e: any) {
        errors.push(e.message)
      }
      done++
      setProgress({ done, total: totalOps, errors: [...errors] })
    }

    // Deactivate only the students the teacher explicitly checked
    for (const m of toDeactivate) {
      try {
        const { error } = await supabase.from('students').update({
          is_active: false,
          notes: (m.student.notes ? m.student.notes + '\n' : '') +
            `Marked inactive on ${new Date().toLocaleDateString()} (not in ${fileName} roster upload)`,
          updated_at: new Date().toISOString(),
        }).eq('id', m.student.id)
        if (error) throw new Error(`Deactivate ${m.student.english_name}: ${error.message}`)
      } catch (e: any) {
        errors.push(e.message)
      }
      done++
      setProgress({ done, total: totalOps, errors: [...errors] })
    }

    setProcessing(false)
    setStep('done')
  }

  const updateRow = (idx: number, field: string, value: any) => {
    setComparison(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const resolveCandidate = (rowIdx: number, candidate: Student) => {
    setComparison(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      const changes: string[] = []
      if (candidate.grade !== r.parsed.grade) changes.push(`Grade: ${candidate.grade} → ${r.parsed.grade}`)
      if (candidate.korean_class !== r.parsed.korean_class) changes.push(`반: ${candidate.korean_class} → ${r.parsed.korean_class}`)
      if (candidate.class_number !== r.parsed.class_number) changes.push(`번호: ${candidate.class_number} → ${r.parsed.class_number}`)
      return {
        ...r,
        status: 'changed' as MatchStatus,
        confidence: 'exact' as MatchConfidence,
        existing: candidate,
        action: 'update' as const,
        englishName: candidate.english_name,
        englishClass: candidate.english_class as EnglishClass,
        changes,
        candidates: undefined,
        reviewReason: undefined,
      }
    }))
  }

  // ─── Computed stats ────────────────────────────────────

  const stats = useMemo(() => ({
    matched: comparison.filter(r => r.status === 'matched').length,
    changed: comparison.filter(r => r.status === 'changed').length,
    new: comparison.filter(r => r.status === 'new').length,
    needs_review: comparison.filter(r => r.status === 'needs_review').length,
    missing: missingStudents.length,
    toDeactivate: missingStudents.filter(m => m.deactivate).length,
    skipped: comparison.filter(r => r.action === 'skip').length,
  }), [comparison, missingStudents])

  const filtered = useMemo(() => {
    let result = comparison
    if (gradeFilter !== 'all') result = result.filter(r => r.parsed.grade === gradeFilter)
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)
    return result
  }, [comparison, gradeFilter, statusFilter])

  const hasUnresolvedReviews = comparison.some(r => r.status === 'needs_review' && r.action !== 'skip')

  // ─── Render ────────────────────────────────────────────

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
               step === 'confirm' ? 'Final confirmation — review the summary below' :
               step === 'processing' ? 'Applying changes...' :
               'Done!'}
            </p>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">

          {/* ─── UPLOAD STEP ─── */}
          {step === 'upload' && (
            <div className="max-w-md mx-auto py-8">
              <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors hover:border-navy/40 cursor-pointer ${fileNames.length > 0 ? 'border-green-300 bg-green-50' : 'border-border'}`}
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.xlsx,.xls,.csv'; input.multiple = true; input.onchange = (e: any) => { const files = Array.from(e.target.files || []) as File[]; if (files.length === 1) handleFile(files[0]); else if (files.length > 1) handleMultipleFiles(files) }; input.click() }}>
                <Upload size={36} className="mx-auto text-text-tertiary mb-3" />
                <p className="text-[14px] font-medium text-navy">Drop files here or click to browse</p>
                <p className="text-[11px] text-text-tertiary mt-1">.xlsx, .xls, or .csv — select multiple files to batch upload</p>
              </div>
              {fileNames.length > 1 && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-green-800 mb-1">{fileNames.length} files selected:</p>
                  <p className="text-[10px] text-green-700">{fileNames.join(', ')}</p>
                </div>
              )}
              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[11px] text-gray-900 leading-relaxed">
                  <strong>Expected columns:</strong> Korean Name (이름), Grade (학년), Korean Class (반), Class Number (번호). English Name is optional — existing English names will be carried over from the current roster.
                </p>
              </div>
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[11px] text-blue-800 leading-relaxed flex items-start gap-2">
                  <Shield size={14} className="shrink-0 mt-0.5" />
                  <span><strong>Safe for year rollover.</strong> English names, English classes, photos, notes, WIDA profiles, behavior logs, and all academic data will be preserved. Only grade, Korean class, and class number update automatically.</span>
                </p>
              </div>
            </div>
          )}

          {/* ─── COLUMN MAPPING STEP ─── */}
          {step === 'map' && (
            <div className="max-w-xl mx-auto">
              <p className="text-[12px] text-text-secondary mb-4">
                File: <strong>{fileName}</strong> ({rawData.length} rows found)
                {detectedFormat === 'korean_admin' && (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                    ✓ Korean admin format detected (반편성내역)
                  </span>
                )}
              </p>
              <div className="space-y-3">
                {/* Korean Name — always needs a column */}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-navy w-48">
                    Korean Name (이름) <span className="text-red-500">*</span>
                  </span>
                  <ArrowRight size={14} className="text-text-tertiary" />
                  <select value={colMap.korean_name} onChange={e => setColMap(prev => ({ ...prev, korean_name: Number(e.target.value) }))}
                    className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap.korean_name >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                    <option value={-1}>-- Select column --</option>
                    {columns.map((col, i) => <option key={i} value={i}>{col || `Column ${i + 1}`}</option>)}
                  </select>
                </div>

                {/* Grade — column or override */}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-navy w-48">
                    Grade (학년) <span className="text-red-500">*</span>
                  </span>
                  <ArrowRight size={14} className="text-text-tertiary" />
                  {gradeOverride != null ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-[12px] font-medium text-green-700 flex-1">
                        All students → Grade {gradeOverride}
                      </span>
                      <button onClick={() => setGradeOverride(null)} className="text-[10px] text-text-tertiary hover:text-navy underline">Use column</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <select value={colMap.grade} onChange={e => setColMap(prev => ({ ...prev, grade: Number(e.target.value) }))}
                        className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap.grade >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <option value={-1}>-- Select column --</option>
                        {columns.map((col, i) => <option key={i} value={i}>{col || `Column ${i + 1}`}</option>)}
                      </select>
                      <span className="text-[10px] text-text-tertiary">or</span>
                      <select value="" onChange={e => { const v = Number(e.target.value); if (v) setGradeOverride(v) }}
                        className="w-28 px-2 py-2 border border-border rounded-lg text-[11px] outline-none">
                        <option value="">Set all...</option>
                        {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Korean Class — column or override */}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-navy w-48">
                    Korean Class (반) <span className="text-red-500">*</span>
                  </span>
                  <ArrowRight size={14} className="text-text-tertiary" />
                  {classOverride ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-[12px] font-medium text-green-700 flex-1">
                        All students → {classOverride}반
                      </span>
                      <button onClick={() => setClassOverride('')} className="text-[10px] text-text-tertiary hover:text-navy underline">Use column</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <select value={colMap.korean_class} onChange={e => setColMap(prev => ({ ...prev, korean_class: Number(e.target.value) }))}
                        className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap.korean_class >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <option value={-1}>-- Select column --</option>
                        {columns.map((col, i) => <option key={i} value={i}>{col || `Column ${i + 1}`}</option>)}
                      </select>
                      <span className="text-[10px] text-text-tertiary">or</span>
                      <select value="" onChange={e => { if (e.target.value) setClassOverride(e.target.value) }}
                        className="w-28 px-2 py-2 border border-border rounded-lg text-[11px] outline-none">
                        <option value="">Set all...</option>
                        {KOREAN_CLASSES.map(c => <option key={c} value={c}>{c}반</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Class Number — column or auto-assign */}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-navy w-48">
                    Class Number (번호) <span className="text-red-500">*</span>
                  </span>
                  <ArrowRight size={14} className="text-text-tertiary" />
                  {autoNumber ? (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-[12px] font-medium text-green-700 flex-1">
                        Auto-assign 1, 2, 3... by row order
                      </span>
                      <button onClick={() => setAutoNumber(false)} className="text-[10px] text-text-tertiary hover:text-navy underline">Use column</button>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <select value={colMap.class_number} onChange={e => setColMap(prev => ({ ...prev, class_number: Number(e.target.value) }))}
                        className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap.class_number >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                        <option value={-1}>-- Select column --</option>
                        {columns.map((col, i) => <option key={i} value={i}>{col || `Column ${i + 1}`}</option>)}
                      </select>
                      <span className="text-[10px] text-text-tertiary">or</span>
                      <button onClick={() => setAutoNumber(true)}
                        className="px-3 py-2 border border-border rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt whitespace-nowrap">
                        Auto-number
                      </button>
                    </div>
                  )}
                </div>

                {/* English Name — always optional */}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-navy w-48">English Name (optional)</span>
                  <ArrowRight size={14} className="text-text-tertiary" />
                  <select value={colMap.english_name} onChange={e => setColMap(prev => ({ ...prev, english_name: Number(e.target.value) }))}
                    className={`flex-1 px-3 py-2 border rounded-lg text-[12px] outline-none ${colMap.english_name >= 0 ? 'border-green-300 bg-green-50' : 'border-border'}`}>
                    <option value={-1}>-- Select column --</option>
                    {columns.map((col, i) => <option key={i} value={i}>{col || `Column ${i + 1}`}</option>)}
                  </select>
                </div>
              </div>

              {rawData.length > 0 && (
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Preview (first 5 rows)</p>
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="text-[11px] w-full">
                      <thead><tr className="bg-surface-alt">{columns.map((c, i) => <th key={i} className="px-3 py-2 text-left text-text-secondary">{c || `Col ${i + 1}`}</th>)}</tr></thead>
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
              {/* Stats row */}
              <div className="grid grid-cols-5 gap-3 mb-4">
                <button onClick={() => setStatusFilter('matched')}
                  className={`rounded-xl p-3 text-center border transition-all ${statusFilter === 'matched' ? 'ring-2 ring-green-400' : ''} bg-green-50 border-green-200`}>
                  <p className="text-[20px] font-bold text-green-700">{stats.matched}</p>
                  <p className="text-[10px] text-green-600 font-medium">Matched ✓</p>
                </button>
                <button onClick={() => setStatusFilter('changed')}
                  className={`rounded-xl p-3 text-center border transition-all ${statusFilter === 'changed' ? 'ring-2 ring-amber-400' : ''} bg-amber-50 border-amber-200`}>
                  <p className="text-[20px] font-bold text-gray-900">{stats.changed}</p>
                  <p className="text-[10px] text-gray-800 font-medium">Changed</p>
                </button>
                <button onClick={() => setStatusFilter('new')}
                  className={`rounded-xl p-3 text-center border transition-all ${statusFilter === 'new' ? 'ring-2 ring-blue-400' : ''} bg-blue-50 border-blue-200`}>
                  <p className="text-[20px] font-bold text-blue-700">{stats.new}</p>
                  <p className="text-[10px] text-blue-600 font-medium">New Students</p>
                </button>
                <button onClick={() => setStatusFilter('needs_review')}
                  className={`rounded-xl p-3 text-center border transition-all ${statusFilter === 'needs_review' ? 'ring-2 ring-purple-400' : ''} bg-purple-50 border-purple-200`}>
                  <p className="text-[20px] font-bold text-purple-700">{stats.needs_review}</p>
                  <p className="text-[10px] text-purple-600 font-medium">⚠ Needs Review</p>
                </button>
                <button onClick={() => setStatusFilter('all')}
                  className={`rounded-xl p-3 text-center border transition-all ${statusFilter === 'all' ? 'ring-2 ring-navy' : ''} bg-surface-alt border-border`}>
                  <p className="text-[20px] font-bold text-navy">{comparison.length}</p>
                  <p className="text-[10px] text-text-secondary font-medium">Total</p>
                </button>
              </div>

              {/* Safe fields notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
                <Shield size={14} className="text-emerald-600 shrink-0" />
                <p className="text-[11px] text-emerald-800">
                  <strong>Preserved for all returning students:</strong> English name, English class, photo, notes, WIDA levels, behavior logs, grades, reading records, goals, scaffolds, attendance.
                  Only grade, Korean class (반), and class number (번호) are updated from the file.
                </p>
              </div>

              {/* Grade filter */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] text-text-tertiary font-semibold uppercase tracking-wider">Grade:</span>
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
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-8"></th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Korean Name</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">New Gr</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">New 반/번</th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">English Name <span className="text-emerald-500">(kept)</span></th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">English Class <span className="text-emerald-500">(kept)</span></th>
                        <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Changes</th>
                        <th className="px-3 py-2.5 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((row, i) => {
                        const realIdx = comparison.indexOf(row)

                        // ── Needs Review row ──
                        if (row.status === 'needs_review') {
                          return (
                            <tr key={i} className="bg-purple-50/50">
                              <td className="px-3 py-2"><AlertTriangle size={14} className="text-purple-500" /></td>
                              <td className="px-3 py-2 font-medium">{row.parsed.korean_name}</td>
                              <td className="px-3 py-2 text-center">{row.parsed.grade}</td>
                              <td className="px-3 py-2 text-center">{row.parsed.korean_class} {row.parsed.class_number}</td>
                              <td colSpan={3} className="px-3 py-2">
                                <div className="text-[10px] text-purple-700 font-semibold mb-1.5">{row.reviewReason}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {(row.candidates || []).map(c => (
                                    <button key={c.id} onClick={() => resolveCandidate(realIdx, c)}
                                      className={'px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ' +
                                        (row.existing?.id === c.id ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-surface border-border text-text-secondary hover:border-purple-300')}>
                                      {c.english_name || c.korean_name} <span className="opacity-60">({c.english_class}, Gr{c.grade})</span>
                                    </button>
                                  ))}
                                  <button onClick={() => updateRow(realIdx, 'action', 'add')}
                                    className={'px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ' +
                                      (row.action === 'add' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-surface border-border text-text-secondary hover:border-blue-300')}>
                                    + Add as new student
                                  </button>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <select value={row.action} onChange={e => updateRow(realIdx, 'action', e.target.value)}
                                  className="px-2 py-1 rounded text-[10px] font-medium border bg-purple-50 border-purple-200 text-purple-600">
                                  <option value="skip">Skip</option>
                                  <option value="update">Update</option>
                                  <option value="add">Add New</option>
                                </select>
                              </td>
                            </tr>
                          )
                        }

                        // ── Normal row (matched / changed / new) ──
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
                              {row.status === 'new' ? (
                                <input value={row.englishName} onChange={e => updateRow(realIdx, 'englishName', e.target.value)}
                                  className="w-full px-2 py-1 border border-border rounded text-[11px] outline-none focus:border-navy"
                                  placeholder="Enter English name" />
                              ) : (
                                <span className="text-[11px] text-text-primary">{row.englishName}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.status === 'new' ? (
                                <select value={row.englishClass} onChange={e => updateRow(realIdx, 'englishClass', e.target.value)}
                                  className="px-2 py-1 border border-border rounded text-[11px] outline-none">
                                  {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                  style={{ backgroundColor: classToColor(row.englishClass), color: classToTextColor(row.englishClass) }}>
                                  {row.englishClass}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-text-tertiary">
                              {row.changes && row.changes.length > 0 ? row.changes.join(', ') :
                               row.status === 'new' ? <span className="text-blue-600 font-medium">New student</span> :
                               <span className="text-green-600">No changes</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <select value={row.action} onChange={e => updateRow(realIdx, 'action', e.target.value)}
                                className={`px-2 py-1 rounded text-[10px] font-medium border ${
                                  row.action === 'skip' ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-surface border-border'
                                }`}>
                                {row.status === 'new' ? (
                                  <>
                                    <option value="add">Add New</option>
                                    <option value="skip">Skip</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="update">Update</option>
                                    <option value="skip">Skip</option>
                                  </>
                                )}
                              </select>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Missing Students ── */}
              {missingStudents.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[12px] font-bold text-red-800 flex items-center gap-1.5">
                      <UserMinus size={14} /> Students NOT in Uploaded File ({missingStudents.length})
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={() => setMissingStudents(prev => prev.map(m => ({ ...m, deactivate: true })))}
                        className="text-[10px] text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-100">
                        Select All
                      </button>
                      <button onClick={() => setMissingStudents(prev => prev.map(m => ({ ...m, deactivate: false })))}
                        className="text-[10px] text-text-secondary hover:text-text-primary font-medium px-2 py-1 rounded hover:bg-surface-alt">
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-red-700 mb-3">
                    These students are in your current roster but not in the uploaded file. Check the box next to any student you want to mark as inactive.
                    <strong> Unchecked students will NOT be changed.</strong>
                  </p>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {missingStudents.map((m, i) => (
                      <label key={m.student.id}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          m.deactivate ? 'bg-red-100 border border-red-300' : 'bg-white border border-red-100 hover:border-red-200'
                        }`}>
                        <input type="checkbox" checked={m.deactivate}
                          onChange={e => setMissingStudents(prev => prev.map((p, j) => j === i ? { ...p, deactivate: e.target.checked } : p))}
                          className="rounded border-red-300 text-red-600 focus:ring-red-500" />
                        <span className="text-[11px] font-medium">{m.student.korean_name}</span>
                        <span className="text-[11px] text-text-tertiary">({m.student.english_name})</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold"
                          style={{ backgroundColor: classToColor(m.student.english_class as EnglishClass), color: classToTextColor(m.student.english_class as EnglishClass) }}>
                          {m.student.english_class}
                        </span>
                        <span className="text-[10px] text-text-tertiary">Gr{m.student.grade}</span>
                        {m.deactivate && <XCircle size={12} className="text-red-500 ml-auto" />}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved reviews warning */}
              {hasUnresolvedReviews && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-purple-800">
                    <strong>{stats.needs_review} student{stats.needs_review !== 1 ? 's' : ''} need{stats.needs_review === 1 ? 's' : ''} manual review.</strong> Select the correct match for each, choose "Add as new student", or set action to "Skip".
                  </div>
                </div>
              )}

              {/* Bottom bar */}
              <div className="flex justify-between items-center">
                <button onClick={() => setStep('map')} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Back to Mapping</button>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] text-text-tertiary">
                    {comparison.filter(r => r.action === 'update').length} update · {comparison.filter(r => r.action === 'add').length} add · {stats.toDeactivate} deactivate · {stats.skipped} skip
                  </p>
                  <button onClick={() => setStep('confirm')}
                    className="px-5 py-2.5 rounded-lg text-[12px] font-bold bg-navy text-white hover:bg-navy-dark">
                    Review Summary →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── CONFIRM STEP (dry-run summary) ─── */}
          {step === 'confirm' && (
            <div className="max-w-lg mx-auto py-4">
              <h3 className="text-[16px] font-bold text-navy mb-4 flex items-center gap-2">
                <Eye size={18} /> Confirm Before Applying
              </h3>

              <div className="space-y-3 mb-6">
                {/* Updates */}
                {(() => {
                  const updates = comparison.filter(r => r.action === 'update')
                  const withChanges = updates.filter(r => r.changes && r.changes.length > 0)
                  const noChanges = updates.filter(r => !r.changes || r.changes.length === 0)
                  return (
                    <div className="bg-surface border border-border rounded-xl p-4">
                      <p className="text-[13px] font-semibold text-navy mb-1">
                        <RefreshCw size={14} className="inline mr-1.5 -mt-0.5" />
                        {updates.length} returning student{updates.length !== 1 ? 's' : ''} will be updated
                      </p>
                      {withChanges.length > 0 && (
                        <p className="text-[11px] text-amber-700 ml-6">
                          {withChanges.length} with roster changes (grade, 반, 번호)
                        </p>
                      )}
                      {noChanges.length > 0 && (
                        <p className="text-[11px] text-green-700 ml-6">
                          {noChanges.length} confirmed with no changes
                        </p>
                      )}
                      <p className="text-[10px] text-text-tertiary ml-6 mt-1">
                        English name, English class, photos, notes, and all academic data are NOT modified.
                      </p>
                    </div>
                  )
                })()}

                {/* New students */}
                {(() => {
                  const adds = comparison.filter(r => r.action === 'add')
                  if (adds.length === 0) return null
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-[13px] font-semibold text-blue-800 mb-1">
                        <UserPlus size={14} className="inline mr-1.5 -mt-0.5" />
                        {adds.length} new student{adds.length !== 1 ? 's' : ''} will be added
                      </p>
                      <div className="ml-6 mt-1 flex flex-wrap gap-1">
                        {adds.slice(0, 10).map((r, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                            {r.parsed.korean_name} {r.englishName ? `(${r.englishName})` : ''} → {r.englishClass}
                          </span>
                        ))}
                        {adds.length > 10 && <span className="text-[10px] text-blue-600">+{adds.length - 10} more</span>}
                      </div>
                      {adds.some(r => !r.englishName) && (
                        <p className="text-[10px] text-gray-700 ml-6 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> Some new students have no English name — Korean name will be used
                        </p>
                      )}
                    </div>
                  )
                })()}

                {/* Deactivations */}
                {(() => {
                  const toDeact = missingStudents.filter(m => m.deactivate)
                  if (toDeact.length === 0) return null
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-[13px] font-semibold text-red-800 mb-1">
                        <UserMinus size={14} className="inline mr-1.5 -mt-0.5" />
                        {toDeact.length} student{toDeact.length !== 1 ? 's' : ''} will be marked inactive
                      </p>
                      <div className="ml-6 mt-1 flex flex-wrap gap-1">
                        {toDeact.map((m, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700">
                            {m.student.korean_name} ({m.student.english_name})
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-red-600 ml-6 mt-1">Their data is preserved — they can be reactivated later.</p>
                    </div>
                  )
                })()}

                {/* Skipped */}
                {stats.skipped > 0 && (
                  <div className="bg-surface-alt border border-border rounded-xl p-4">
                    <p className="text-[13px] font-semibold text-text-secondary">
                      {stats.skipped} student{stats.skipped !== 1 ? 's' : ''} skipped (no action)
                    </p>
                  </div>
                )}

                {/* Unchanged missing */}
                {(() => {
                  const kept = missingStudents.filter(m => !m.deactivate)
                  if (kept.length === 0) return null
                  return (
                    <div className="bg-surface-alt border border-border rounded-xl p-4">
                      <p className="text-[13px] font-semibold text-text-secondary">
                        {kept.length} student{kept.length !== 1 ? 's' : ''} not in file but kept active (no action)
                      </p>
                    </div>
                  )
                })()}
              </div>

              <div className="flex justify-between items-center">
                <button onClick={() => setStep('review')} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">← Back to Review</button>
                <button onClick={applyChanges}
                  className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light transition-all">
                  Apply {comparison.filter(r => r.action !== 'skip').length + missingStudents.filter(m => m.deactivate).length} Changes
                </button>
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
              {progress.errors.length > 0 && (
                <div className="mt-4 text-left bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-[10px] font-bold text-red-700 mb-1">{progress.errors.length} error(s):</p>
                  {progress.errors.map((e, i) => <p key={i} className="text-[10px] text-red-600">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {/* ─── DONE STEP ─── */}
          {step === 'done' && (
            <DoneStepWithBatchAssign
              comparison={comparison}
              missingStudents={missingStudents}
              progress={progress}
              onComplete={onComplete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Done Step with Batch Assign ────────────────────────────────────

function DoneStepWithBatchAssign({
  comparison,
  missingStudents,
  progress,
  onComplete,
}: {
  comparison: ComparisonRow[]
  missingStudents: MissingStudent[]
  progress: { done: number; total: number; errors: string[] }
  onComplete: () => void
}) {
  const [showBatchAssign, setShowBatchAssign] = useState(false)
  const newlyAdded = comparison.filter(r => r.action === 'add')
  const skipped = comparison.filter(r => r.action === 'skip')
  const updated = comparison.filter(r => r.action === 'update')
  const deactivated = missingStudents.filter(m => m.deactivate)

  if (showBatchAssign) {
    return <BatchAssignEnglishClass onDone={() => { setShowBatchAssign(false); onComplete() }} />
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      {/* Header */}
      <div className="text-center mb-5">
        {progress.errors.length === 0 ? (
          <>
            <CheckCircle2 size={44} className="mx-auto text-green-500 mb-3" />
            <p className="text-[16px] font-bold text-navy">Roster Updated Successfully</p>
          </>
        ) : (
          <>
            <AlertTriangle size={44} className="mx-auto text-gray-700 mb-3" />
            <p className="text-[16px] font-bold text-navy">Roster Updated with {progress.errors.length} Error{progress.errors.length !== 1 ? 's' : ''}</p>
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="rounded-xl p-3 text-center bg-blue-50 border border-blue-200">
          <p className="text-[18px] font-bold text-gray-900">{updated.length}</p>
          <p className="text-[10px] text-gray-700 font-medium">Updated</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-green-50 border border-green-200">
          <p className="text-[18px] font-bold text-gray-900">{newlyAdded.length}</p>
          <p className="text-[10px] text-gray-700 font-medium">Added</p>
        </div>
        <div className="rounded-xl p-3 text-center bg-gray-50 border border-gray-200">
          <p className="text-[18px] font-bold text-gray-900">{deactivated.length}</p>
          <p className="text-[10px] text-gray-700 font-medium">Deactivated</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${skipped.length > 0 ? 'bg-amber-50 border-2 border-amber-400' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-[18px] font-bold ${skipped.length > 0 ? 'text-gray-900' : 'text-gray-900'}`}>{skipped.length}</p>
          <p className={`text-[10px] font-medium ${skipped.length > 0 ? 'text-gray-800' : 'text-gray-700'}`}>Skipped</p>
        </div>
      </div>

      {/* Skipped students detail */}
      {skipped.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4">
          <p className="text-[12px] font-bold text-gray-900 mb-2">
            ⚠ {skipped.length} student{skipped.length !== 1 ? 's' : ''} skipped — flagged for review
          </p>
          <p className="text-[11px] text-gray-700 mb-3">
            These students were marked with a review flag. Use the "⚠ Need Review" filter on the Students page to find and fix them.
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {skipped.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-gray-800">
                <span className="font-medium">{r.parsed.korean_name}</span>
                {r.reviewReason && <span className="text-gray-600">— {r.reviewReason}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors detail */}
      {progress.errors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4">
          <p className="text-[12px] font-bold text-gray-900 mb-2">
            ✕ {progress.errors.length} error{progress.errors.length !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-gray-700 mb-3">
            {progress.done - progress.errors.length} of {progress.total} operations succeeded. Failed students were not modified.
          </p>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {progress.errors.map((e, i) => {
              // Clean up verbose DB error messages
              const clean = e.replace(/duplicate key value violates unique constraint "[^"]*"/, 'slot already taken (duplicate grade+반+번호)')
              return <p key={i} className="text-[11px] text-red-800">{clean}</p>
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-5">
        {newlyAdded.length > 0 && (
          <button onClick={() => setShowBatchAssign(true)}
            className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light transition-all">
            Assign English Classes ({newlyAdded.length} new students) →
          </button>
        )}
        <button onClick={onComplete}
          className={`px-6 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
            newlyAdded.length > 0
              ? 'bg-surface-alt text-text-secondary hover:bg-border'
              : 'bg-navy text-white hover:bg-navy-dark'
          }`}>
          {newlyAdded.length > 0 ? 'Skip — Assign Later' : 'Close'}
        </button>
      </div>
    </div>
  )
}

// ─── Batch Assign English Class (New Students Only) ─────────────────
// For incoming students (typically Grade 1) who need a temporary English
// class placement before level testing. Grades 2-5 returning students
// get reassigned through the Leveling → Meeting → Finalize flow.

export function BatchAssignEnglishClass({ onDone }: { onDone: () => void }) {
  const { showToast } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignments, setAssignments] = useState<Record<string, EnglishClass>>({})
  const [bulkClass, setBulkClass] = useState<EnglishClass | ''>('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Load only students who look "new" — no English name, or English name = Korean name
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('students')
        .select('*')
        .eq('is_active', true)
        .order('grade')
        .order('korean_class')
        .order('class_number')
      if (data) {
        // Show students that appear to need initial placement:
        // no english_name, english_name === korean_name, or english_class is still default 'Lily' with no english_name
        const needsPlacement = (data as Student[]).filter(s =>
          !s.english_name || s.english_name === s.korean_name
        )
        setStudents(needsPlacement)
        const asgn: Record<string, EnglishClass> = {}
        needsPlacement.forEach(s => { asgn[s.id] = s.english_class })
        setAssignments(asgn)
      }
      setLoading(false)
    })()
  }, [])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelected(new Set(students.map(s => s.id)))
  }

  const deselectAll = () => setSelected(new Set())

  const applyBulkClass = () => {
    if (!bulkClass) return
    setAssignments(prev => {
      const next = { ...prev }
      selected.forEach(id => { next[id] = bulkClass })
      return next
    })
    showToast(`Set ${selected.size} students to ${bulkClass}`)
  }

  const handleSave = async () => {
    const changed = students.filter(s => assignments[s.id] && assignments[s.id] !== s.english_class)
    if (changed.length === 0) { showToast('No changes to save'); return }

    setSaving(true)
    let errors = 0
    for (const s of changed) {
      const { error } = await supabase.from('students')
        .update({ english_class: assignments[s.id], updated_at: new Date().toISOString() })
        .eq('id', s.id)
      if (error) errors++
    }
    setSaving(false)

    if (errors > 0) {
      showToast(`Saved with ${errors} error(s)`)
    } else {
      showToast(`${changed.length} student${changed.length !== 1 ? 's' : ''} assigned`)
    }
    onDone()
  }

  const changedCount = students.filter(s => assignments[s.id] && assignments[s.id] !== s.english_class).length

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" />
        <p className="text-[12px] text-text-tertiary">Loading students...</p>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
        <p className="text-[14px] font-medium text-navy mb-1">All students have English names</p>
        <p className="text-[11px] text-text-tertiary mb-4">No new students need initial class assignment right now.</p>
        <p className="text-[10px] text-text-tertiary">For G1 reassignment after testing, use <strong>Leveling → Finalize</strong> (oral test → temporary class, written test → final class).</p>
        <button onClick={onDone} className="mt-4 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Close</button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-navy">Assign New Students to English Classes</h3>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          {students.length} new student{students.length !== 1 ? 's' : ''} need an initial random class for the first day.
          After the oral test, they'll be reassigned to temporary classes, then finalized after the written test via <strong>Leveling → Finalize</strong>.
        </p>
      </div>

      {/* Bulk controls */}
      <div className="flex items-center gap-3 mb-3 p-3 bg-surface-alt rounded-xl flex-wrap">
        <button onClick={selectAll} className="text-[10px] text-navy font-medium hover:underline">
          Select all ({students.length})
        </button>
        <button onClick={deselectAll} className="text-[10px] text-text-tertiary hover:underline">
          Deselect
        </button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-tertiary font-medium">Assign selected to:</span>
          <select value={bulkClass} onChange={e => setBulkClass(e.target.value as EnglishClass)}
            className="px-2 py-1 border border-border rounded text-[11px] outline-none">
            <option value="">Choose class...</option>
            {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={applyBulkClass} disabled={!bulkClass || selected.size === 0}
            className="px-3 py-1 rounded text-[10px] font-bold bg-navy text-white hover:bg-navy-dark disabled:opacity-30 transition-all">
            Apply ({selected.size})
          </button>
        </div>
      </div>

      {/* Student table */}
      <div className="border border-border rounded-xl overflow-hidden mb-4">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-surface-alt sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-center w-8">
                  <input type="checkbox"
                    checked={students.length > 0 && students.every(s => selected.has(s.id))}
                    onChange={e => e.target.checked ? selectAll() : deselectAll()}
                    className="rounded border-border" />
                </th>
                <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Korean Name</th>
                <th className="px-3 py-2 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Gr</th>
                <th className="px-3 py-2 text-center text-[9px] uppercase tracking-wider text-text-secondary font-semibold">반/번</th>
                <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Current</th>
                <th className="px-3 py-2 text-left text-[9px] uppercase tracking-wider text-text-secondary font-semibold">→ Assign To</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map(s => {
                const currentAssign = assignments[s.id] || s.english_class
                const changed = currentAssign !== s.english_class
                return (
                  <tr key={s.id} className={selected.has(s.id) ? 'bg-blue-50/50' : ''}>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                        className="rounded border-border" />
                    </td>
                    <td className="px-3 py-2 font-medium">{s.korean_name}</td>
                    <td className="px-3 py-2 text-center">{s.grade}</td>
                    <td className="px-3 py-2 text-center">{s.korean_class} {s.class_number}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ backgroundColor: classToColor(s.english_class), color: classToTextColor(s.english_class) }}>
                        {s.english_class}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select value={currentAssign} onChange={e => setAssignments(prev => ({ ...prev, [s.id]: e.target.value as EnglishClass }))}
                        className={`px-2 py-1 border rounded text-[11px] outline-none font-medium ${
                          changed ? 'border-navy bg-navy/5 text-navy' : 'border-border text-text-secondary'
                        }`}>
                        {ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {changed && <span className="ml-1 text-[9px] text-navy font-bold">●</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center justify-between">
        <button onClick={onDone} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">
          {changedCount > 0 ? 'Skip — Assign Later' : 'Close'}
        </button>
        <div className="flex items-center gap-3">
          {changedCount > 0 && (
            <p className="text-[11px] text-navy font-medium">
              {changedCount} assignment{changedCount !== 1 ? 's' : ''} to save
            </p>
          )}
          <button onClick={handleSave} disabled={changedCount === 0 || saving}
            className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-gold text-navy-dark hover:bg-gold-light disabled:opacity-40 transition-all flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save Assignments
          </button>
        </div>
      </div>
    </div>
  )
}
