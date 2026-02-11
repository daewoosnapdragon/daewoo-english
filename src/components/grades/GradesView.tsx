'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, DOMAINS, DOMAIN_LABELS, EnglishClass, Grade, Domain } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, Check } from 'lucide-react'

interface Assessment {
  id: string
  name: string
  domain: Domain
  max_score: number
  grade: number
  english_class: string
  created_by: string | null
  created_at: string
}

export default function GradesView() {
  const { t, language, currentTeacher, showToast } = useApp()
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(
    (currentTeacher?.role === 'teacher' ? currentTeacher.english_class : 'Snapdragon') as EnglishClass
  )
  const [selectedDomain, setSelectedDomain] = useState<Domain>('reading')
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [saving, setSaving] = useState(false)
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const { students, loading: loadingStudents } = useStudents({
    grade: selectedGrade,
    english_class: selectedClass,
  })

  // Load assessments for current grade/class/domain
  const loadAssessments = useCallback(async () => {
    setLoadingAssessments(true)
    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('grade', selectedGrade)
      .eq('english_class', selectedClass)
      .eq('domain', selectedDomain)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setAssessments(data)
      if (data.length > 0 && !selectedAssessment) {
        setSelectedAssessment(data[data.length - 1]) // select most recent
      } else if (data.length > 0 && selectedAssessment) {
        // Keep current selection if it still exists
        const still = data.find(a => a.id === selectedAssessment.id)
        if (!still) setSelectedAssessment(data[data.length - 1])
      } else {
        setSelectedAssessment(null)
      }
    }
    setLoadingAssessments(false)
  }, [selectedGrade, selectedClass, selectedDomain])

  useEffect(() => { loadAssessments() }, [loadAssessments])

  // Load scores for selected assessment
  useEffect(() => {
    if (!selectedAssessment) { setScores({}); return }
    async function loadScores() {
      const { data } = await supabase
        .from('grades')
        .select('student_id, score')
        .eq('assessment_id', selectedAssessment!.id)

      const map: Record<string, number | null> = {}
      if (data) data.forEach((g: any) => { map[g.student_id] = g.score })
      setScores(map)
      setHasChanges(false)
    }
    loadScores()
  }, [selectedAssessment])

  // Update teacher filter when currentTeacher changes
  useEffect(() => {
    if (currentTeacher?.role === 'teacher' && currentTeacher.english_class !== 'Admin') {
      setSelectedClass(currentTeacher.english_class as EnglishClass)
    }
  }, [currentTeacher])

  const handleScoreChange = (studentId: string, value: string) => {
    let score: number | null = null

    if (value === '') {
      score = null
    } else if (value.includes('/')) {
      // Support "8/10" format
      const parts = value.split('/')
      const num = parseFloat(parts[0])
      const den = parseFloat(parts[1])
      if (!isNaN(num) && !isNaN(den) && den > 0) {
        score = Math.round((num / den) * selectedAssessment!.max_score * 10) / 10
      }
    } else {
      const num = parseFloat(value)
      if (!isNaN(num)) score = num
    }

    setScores(prev => ({ ...prev, [studentId]: score }))
    setHasChanges(true)
  }

  const handleSaveAll = async () => {
    if (!selectedAssessment) return
    setSaving(true)

    const entries = Object.entries(scores)
      .filter(([_, score]) => score !== null && score !== undefined)
      .map(([student_id, score]) => ({
        assessment_id: selectedAssessment.id,
        student_id,
        score,
        semester_id: null, // will link to active semester
      }))

    // Upsert scores
    for (const entry of entries) {
      const { error } = await supabase
        .from('grades')
        .upsert({
          assessment_id: selectedAssessment.id,
          student_id: entry.student_id,
          score: entry.score,
          entered_by: null,
        }, { onConflict: 'student_id,assessment_id' })

      if (error) {
        showToast(`Error saving: ${error.message}`)
        setSaving(false)
        return
      }
    }

    setHasChanges(false)
    setSaving(false)
    showToast(language === 'ko' ? '저장 완료!' : `Saved ${entries.length} scores`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      // Move to next input
      const inputs = document.querySelectorAll('.score-input') as NodeListOf<HTMLInputElement>
      const next = inputs[index + 1]
      if (next) next.focus()
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const inputs = document.querySelectorAll('.score-input') as NodeListOf<HTMLInputElement>
      const next = inputs[index + 1]
      if (next) next.focus()
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const inputs = document.querySelectorAll('.score-input') as NodeListOf<HTMLInputElement>
      const prev = inputs[index - 1]
      if (prev) prev.focus()
    }
  }

  const enteredCount = Object.values(scores).filter(s => s !== null && s !== undefined).length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-10 pt-8 pb-6 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-navy">{t.grades.title}</h2>
            <p className="text-text-secondary text-sm mt-1">
              Grade {selectedGrade} · {selectedClass} · {students.length} students
              {selectedAssessment && ` · ${selectedAssessment.name} (/${selectedAssessment.max_score})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[13px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all shadow-sm"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {language === 'ko' ? '저장' : 'Save All'}
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all"
            >
              <Plus size={15} /> {t.grades.createAssessment}
            </button>
          </div>
        </div>
      </div>

      <div className="px-10 py-6">
        {/* Controls Row */}
        <div className="flex items-center gap-3 mb-5">
          <select value={selectedGrade} onChange={e => { setSelectedGrade(Number(e.target.value) as Grade); setSelectedAssessment(null) }}
            className="px-3 py-2 border border-border rounded-lg text-[13px] bg-surface outline-none focus:border-navy">
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>

          <div className="flex gap-1">
            {ENGLISH_CLASSES.map(cls => (
              <button key={cls} onClick={() => { setSelectedClass(cls); setSelectedAssessment(null) }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                  selectedClass === cls ? 'text-white shadow-sm' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: selectedClass === cls ? classToTextColor(cls) : classToColor(cls),
                  color: selectedClass === cls ? 'white' : classToTextColor(cls),
                }}>
                {cls}
              </button>
            ))}
          </div>
        </div>

        {/* Domain Tabs */}
        <div className="flex gap-1 mb-5 border-b border-border">
          {DOMAINS.map(domain => (
            <button key={domain} onClick={() => { setSelectedDomain(domain); setSelectedAssessment(null) }}
              className={`px-4 py-2.5 text-[13px] font-medium transition-all border-b-2 -mb-px ${
                selectedDomain === domain
                  ? 'border-navy text-navy'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}>
              {DOMAIN_LABELS[domain][language]}
              {assessments.filter(a => a.domain === domain).length > 0 && (
                <span className="ml-1.5 text-[10px] bg-accent-light text-navy px-1.5 py-0.5 rounded-full font-bold">
                  {assessments.filter(a => a.domain === domain).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Assessment Selector */}
        {assessments.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider font-semibold">
              {language === 'ko' ? '평가:' : 'Assessment:'}
            </span>
            {assessments.map(a => (
              <button key={a.id} onClick={() => setSelectedAssessment(a)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  selectedAssessment?.id === a.id
                    ? 'border-navy bg-navy text-white'
                    : 'border-border bg-surface text-text-secondary hover:border-navy/30'
                }`}>
                {a.name} <span className="opacity-60">/{a.max_score}</span>
              </button>
            ))}
          </div>
        )}

        {/* Score Entry Table */}
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
          {loadingStudents || loadingAssessments ? (
            <div className="p-12 text-center">
              <Loader2 size={24} className="animate-spin text-navy mx-auto mb-2" />
              <p className="text-text-tertiary text-sm">Loading...</p>
            </div>
          ) : !selectedAssessment ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-display text-lg font-semibold text-navy mb-1">
                {assessments.length === 0
                  ? (language === 'ko' ? '평가를 먼저 생성하세요' : 'Create your first assessment')
                  : (language === 'ko' ? '평가를 선택하세요' : 'Select an assessment above')}
              </h3>
              <p className="text-text-tertiary text-sm max-w-md mx-auto">
                {assessments.length === 0
                  ? (language === 'ko' ? '"평가 생성" 버튼을 클릭하여 시작하세요. 이름, 도메인, 만점을 설정하면 바로 점수를 입력할 수 있습니다.'
                    : 'Click "Create Assessment" to get started. Name it, pick the domain, set the total points, then enter scores.')
                  : ''}
              </p>
              {assessments.length === 0 && (
                <button onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
                  <Plus size={15} /> {t.grades.createAssessment}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Entry info bar */}
              <div className="px-5 py-3 bg-accent-light border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-navy">{selectedAssessment.name}</span>
                  <span className="text-[12px] text-text-secondary">out of {selectedAssessment.max_score}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-text-secondary">
                    {enteredCount}/{students.length} entered
                  </span>
                  <div className="w-24 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                    <div className="h-full bg-navy rounded-full transition-all"
                      style={{ width: `${students.length > 0 ? (enteredCount / students.length) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-surface-alt">
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
                      <th className="text-left px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold min-w-[200px]">Student</th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-24">
                        Score /{selectedAssessment.max_score}
                      </th>
                      <th className="text-center px-4 py-2.5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold w-20">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => {
                      const score = scores[s.id]
                      const pct = score != null && selectedAssessment.max_score > 0
                        ? ((score / selectedAssessment.max_score) * 100).toFixed(1)
                        : null
                      const isLow = pct !== null && parseFloat(pct) < 60

                      return (
                        <tr key={s.id} className="border-t border-border table-row-hover">
                          <td className="px-4 py-2.5 text-text-tertiary">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium">{s.english_name}</span>
                            <span className="text-text-tertiary ml-2 text-[12px]">{s.korean_name}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="text"
                              className={`score-input ${score != null ? 'has-value' : ''} ${isLow ? 'error' : ''}`}
                              value={score != null ? score : ''}
                              onChange={e => handleScoreChange(s.id, e.target.value)}
                              onKeyDown={e => handleKeyDown(e, i)}
                              placeholder="—"
                            />
                          </td>
                          <td className={`px-4 py-2.5 text-center text-[12px] font-medium ${
                            isLow ? 'text-danger' : pct ? 'text-navy' : 'text-text-tertiary'
                          }`}>
                            {pct ? `${pct}%` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom bar */}
              {hasChanges && (
                <div className="px-5 py-3 bg-warm-light border-t border-gold/20 flex items-center justify-between">
                  <p className="text-[12px] text-amber-700">
                    {language === 'ko' ? '저장되지 않은 변경사항이 있습니다' : 'You have unsaved changes'}
                  </p>
                  <button onClick={handleSaveAll} disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light transition-all">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    {language === 'ko' ? '저장' : 'Save'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <CreateAssessmentModal
          grade={selectedGrade}
          englishClass={selectedClass}
          domain={selectedDomain}
          onClose={() => setShowCreateModal(false)}
          onCreated={(a) => {
            setShowCreateModal(false)
            loadAssessments().then(() => setSelectedAssessment(a))
          }}
        />
      )}
    </div>
  )
}

function CreateAssessmentModal({ grade, englishClass, domain, onClose, onCreated }: {
  grade: Grade; englishClass: EnglishClass; domain: Domain
  onClose: () => void; onCreated: (a: Assessment) => void
}) {
  const { language, currentTeacher, showToast } = useApp()
  const [name, setName] = useState('')
  const [maxScore, setMaxScore] = useState(10)
  const [selectedDomain, setSelectedDomain] = useState(domain)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        name: name.trim(),
        domain: selectedDomain,
        max_score: maxScore,
        grade,
        english_class: englishClass,
        created_by: currentTeacher?.id || null,
        type: 'formative',
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      showToast(`Error: ${error.message}`)
    } else {
      showToast(language === 'ko' ? `"${name}" 평가가 생성되었습니다` : `Created "${name}"`)
      onCreated(data)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface rounded-xl shadow-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-navy">
            {language === 'ko' ? '평가 생성' : 'Create Assessment'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
              {language === 'ko' ? '평가 이름' : 'Assessment Name'}
            </label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              placeholder={language === 'ko' ? '예: Reading Quiz 1' : 'e.g. Reading Quiz 1, Phonics Worksheet 3'}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Domain</label>
              <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value as Domain)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy">
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{DOMAIN_LABELS[d][language]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">
                {language === 'ko' ? '만점' : 'Total Points'}
              </label>
              <input type="number" min={1} max={1000} value={maxScore}
                onChange={e => setMaxScore(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" />
            </div>
          </div>
          <div className="bg-accent-light rounded-lg px-4 py-3">
            <p className="text-[12px] text-navy">
              <strong>Grade {grade} · {englishClass}</strong> — {language === 'ko' ? '이 반에만 적용됩니다' : 'This assessment is for this class only'}
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-surface-alt">
            {language === 'ko' ? '취소' : 'Cancel'}
          </button>
          <button onClick={handleCreate} disabled={saving || !name.trim()}
            className="px-5 py-2 rounded-lg text-[13px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {language === 'ko' ? '생성' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
