'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, ChevronDown, ChevronRight, User, BookOpen, MessageSquare, Ear, ImageIcon, X, Check } from 'lucide-react'

// -- Constants --

type PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

const PASSAGE_LEVELS: { id: PassageLevel; label: string; desc: string; hasCwpm: boolean; hasComp: boolean; maxRaw: number | null; weight: number | null }[] = [
  { id: 'A', label: 'Level A', desc: 'Oral Interview (no reading)', hasCwpm: false, hasComp: false, maxRaw: 4, weight: null },
  { id: 'B', label: 'Level B', desc: 'High-Frequency Words', hasCwpm: false, hasComp: false, maxRaw: 20, weight: null },
  { id: 'C', label: 'Level C', desc: 'Simple Sentences', hasCwpm: false, hasComp: false, maxRaw: 15, weight: null },
  { id: 'D', label: 'Level D', desc: '"My Cat" (~30 words)', hasCwpm: true, hasComp: true, maxRaw: null, weight: 1.1 },
  { id: 'E', label: 'Level E', desc: '"Lunch Time" (~50 words)', hasCwpm: true, hasComp: true, maxRaw: null, weight: 1.2 },
  { id: 'F', label: 'Level F', desc: '"Rainy Day" (~75 words)', hasCwpm: true, hasComp: true, maxRaw: null, weight: 1.3 },
]

const NAEP_LABELS: Record<number, string> = {
  1: 'Word-by-word',
  2: 'Choppy phrases',
  3: 'Appropriate phrasing',
  4: 'Smooth & expressive',
}

const NAEP_FACTORS: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.1 }

const COMP_QUESTIONS = [
  { key: 'q1', label: 'Q1', dok: 'DOK 1' },
  { key: 'q2', label: 'Q2', dok: 'DOK 1' },
  { key: 'q3', label: 'Q3', dok: 'DOK 2' },
  { key: 'q4', label: 'Q4', dok: 'DOK 2' },
  { key: 'q5', label: 'Q5', dok: 'DOK 3' },
]

// -- Helpers --

function calcWeightedCwpm(rawCwpm: number | null, passageLevel: PassageLevel, naep: number | null): number | null {
  const pl = PASSAGE_LEVELS.find(p => p.id === passageLevel)
  if (!pl?.hasCwpm || !pl.weight || rawCwpm == null || naep == null) return null
  return Math.round(rawCwpm * pl.weight * (NAEP_FACTORS[naep] || 1.0) * 10) / 10
}

interface G1Scores {
  alphabet_names: number | null
  alphabet_sounds: number | null
  alphabet_words: number | null
  phoneme_total: number | null
  orf_passage_level: PassageLevel | null
  orf_raw_score: number | null
  orf_naep: number | null
  orf_weighted_cwpm: number | null
  comp_q1: number | null
  comp_q2: number | null
  comp_q3: number | null
  comp_q4: number | null
  comp_q5: number | null
  comp_total: number | null
  open_response: number | null
  notes: string
}

function emptyScores(): G1Scores {
  return {
    alphabet_names: null, alphabet_sounds: null, alphabet_words: null,
    phoneme_total: null,
    orf_passage_level: null, orf_raw_score: null, orf_naep: null, orf_weighted_cwpm: null,
    comp_q1: null, comp_q2: null, comp_q3: null, comp_q4: null, comp_q5: null, comp_total: null,
    open_response: null, notes: '',
  }
}

function fromRawScores(raw: any): G1Scores {
  if (!raw) return emptyScores()
  return {
    alphabet_names: raw.alphabet_names ?? null,
    alphabet_sounds: raw.alphabet_sounds ?? null,
    alphabet_words: raw.alphabet_words ?? null,
    phoneme_total: raw.phoneme_total ?? null,
    orf_passage_level: raw.orf_passage_level ?? null,
    orf_raw_score: raw.orf_raw_score ?? null,
    orf_naep: raw.orf_naep ?? null,
    orf_weighted_cwpm: raw.orf_weighted_cwpm ?? null,
    comp_q1: raw.comp_q1 ?? null,
    comp_q2: raw.comp_q2 ?? null,
    comp_q3: raw.comp_q3 ?? null,
    comp_q4: raw.comp_q4 ?? null,
    comp_q5: raw.comp_q5 ?? null,
    comp_total: raw.comp_total ?? null,
    open_response: raw.open_response ?? null,
    notes: raw.notes || '',
  }
}

function toRawScores(s: G1Scores): Record<string, any> {
  const pl = PASSAGE_LEVELS.find(p => p.id === s.orf_passage_level)
  const weighted = pl?.hasCwpm ? calcWeightedCwpm(s.orf_raw_score, s.orf_passage_level!, s.orf_naep) : null
  const compTotal = (pl?.hasComp) ? [s.comp_q1, s.comp_q2, s.comp_q3, s.comp_q4, s.comp_q5].reduce((sum: number, v) => sum + (v ?? 0), 0) : null
  return {
    ...s,
    orf_weighted_cwpm: weighted,
    comp_total: compTotal,
    // Also store in the flat keys the generic system expects
    passage_cwpm: weighted ?? s.orf_raw_score,
  }
}

// -- Class Tab Bar (matches parent) --

function ClassTabs({ active, onSelect, counts, available }: {
  active: EnglishClass; onSelect: (c: EnglishClass) => void;
  counts: Record<string, { total: number; done: number }>; available: EnglishClass[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {ENGLISH_CLASSES.filter(c => c !== 'Sample' && c !== 'Trial').map(cls => {
        const ct = counts[cls] || { total: 0, done: 0 }
        const isAvail = available.includes(cls)
        return (
          <button key={cls} onClick={() => isAvail && onSelect(cls)} disabled={!isAvail}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
              active === cls ? `text-white shadow-sm` : isAvail ? 'text-text-secondary hover:bg-surface-alt' : 'text-text-tertiary/40 cursor-not-allowed'
            }`} style={active === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
            {cls}
            {ct.total > 0 && (
              <span className={`text-[9px] px-1 rounded ${active === cls ? 'bg-white/20' : 'bg-surface-alt'}`}>
                {ct.done}/{ct.total}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// -- Number Input --

function NumInput({ value, onChange, max, min = 0, placeholder, className = '' }: {
  value: number | null; onChange: (v: number | null) => void; max?: number; min?: number; placeholder?: string; className?: string
}) {
  return (
    <input
      type="number" min={min} max={max}
      value={value ?? ''} placeholder={placeholder || (max != null ? `/${max}` : '--')}
      onChange={e => onChange(e.target.value === '' ? null : Math.min(Math.max(Number(e.target.value), min ?? 0), max ?? 99999))}
      className={`w-16 px-2 py-1.5 border border-border rounded-lg text-center text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 ${className}`}
    />
  )
}

// -- Student Card --

function StudentCard({ student, scores, onChange, onSave, saving }: {
  student: Student; scores: G1Scores; onChange: (s: G1Scores) => void; onSave: () => void; saving: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const pl = PASSAGE_LEVELS.find(p => p.id === scores.orf_passage_level)
  const isComplete = scores.alphabet_names != null && scores.phoneme_total != null && scores.orf_passage_level != null && scores.orf_raw_score != null && scores.open_response != null

  const alphabetTotal = (scores.alphabet_names ?? 0) + (scores.alphabet_sounds ?? 0) + (scores.alphabet_words ?? 0)
  const weighted = pl?.hasCwpm ? calcWeightedCwpm(scores.orf_raw_score, scores.orf_passage_level!, scores.orf_naep) : null
  const compTotal = pl?.hasComp ? [scores.comp_q1, scores.comp_q2, scores.comp_q3, scores.comp_q4, scores.comp_q5].reduce((sum: number, v) => sum + (v ?? 0), 0) : null

  const set = (key: keyof G1Scores, val: any) => onChange({ ...scores, [key]: val })

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-navy/30 shadow-sm' : 'border-border'} ${isComplete ? 'bg-green-50/30' : 'bg-surface'}`}>
      {/* Collapsed header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-alt/30 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? <ChevronDown size={14} className="text-text-tertiary flex-shrink-0" /> : <ChevronRight size={14} className="text-text-tertiary flex-shrink-0" />}
          <span className="font-semibold text-[13px] text-navy truncate">{student.english_name}</span>
          <span className="text-[11px] text-text-tertiary">{student.korean_name}</span>
          {isComplete && <Check size={12} className="text-green-600 flex-shrink-0" />}
        </div>
        {/* Summary chips when collapsed */}
        {!expanded && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {scores.alphabet_names != null && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">ABC {alphabetTotal}/37</span>
            )}
            {scores.phoneme_total != null && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">PA {scores.phoneme_total}/12</span>
            )}
            {scores.orf_passage_level && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Lv{scores.orf_passage_level}
                {weighted != null ? ` ${weighted}w` : scores.orf_raw_score != null ? ` ${scores.orf_raw_score}/${pl?.maxRaw || ''}` : ''}
              </span>
            )}
            {compTotal != null && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Comp {compTotal}/10</span>
            )}
            {scores.open_response != null && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">OR {scores.open_response}/5</span>
            )}
          </div>
        )}
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">

          {/* 1. Alphabet Recognition */}
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={13} className="text-blue-600" />
              <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">1. Alphabet Recognition</h4>
              <span className="text-[10px] text-text-tertiary ml-auto">{alphabetTotal}/37</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">Names /16</label>
                <NumInput value={scores.alphabet_names} onChange={v => set('alphabet_names', v)} max={16} />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">Sounds /16</label>
                <NumInput value={scores.alphabet_sounds} onChange={v => set('alphabet_sounds', v)} max={16} />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">Word Probes /5</label>
                <NumInput value={scores.alphabet_words} onChange={v => set('alphabet_words', v)} max={5} />
              </div>
            </div>
          </div>

          {/* 2. Phoneme Manipulation */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Ear size={13} className="text-purple-600" />
              <h4 className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">2. Phoneme Manipulation</h4>
              <span className="text-[10px] text-text-tertiary ml-auto">{scores.phoneme_total ?? '--'}/12</span>
            </div>
            <div>
              <label className="text-[10px] text-text-secondary block mb-1">Total Correct /12</label>
              <NumInput value={scores.phoneme_total} onChange={v => set('phoneme_total', v)} max={12} />
            </div>
          </div>

          {/* 3. ORF */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={13} className="text-emerald-600" />
              <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">3. Oral Reading Fluency</h4>
              {weighted != null && <span className="text-[10px] text-emerald-700 ml-auto font-semibold">Weighted: {weighted}</span>}
            </div>

            {/* Passage level selector */}
            <div className="mb-3">
              <label className="text-[10px] text-text-secondary block mb-1.5">Passage Level</label>
              <div className="grid grid-cols-3 gap-1.5">
                {PASSAGE_LEVELS.map(p => (
                  <button key={p.id} onClick={() => {
                    const newScores = { ...scores, orf_passage_level: p.id as PassageLevel }
                    // Clear fields that don't apply
                    if (!p.hasCwpm) { newScores.orf_naep = null }
                    if (!p.hasComp) { newScores.comp_q1 = null; newScores.comp_q2 = null; newScores.comp_q3 = null; newScores.comp_q4 = null; newScores.comp_q5 = null }
                    onChange(newScores)
                  }}
                    className={`px-2 py-2 rounded-lg text-left transition-all ${
                      scores.orf_passage_level === p.id
                        ? 'bg-emerald-100 border-2 border-emerald-500 shadow-sm'
                        : 'bg-surface-alt border border-border hover:border-emerald-300'
                    }`}>
                    <span className="text-[11px] font-bold block">{p.label}</span>
                    <span className="text-[9px] text-text-tertiary">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Level-specific inputs */}
            {scores.orf_passage_level && (() => {
              const selPl = PASSAGE_LEVELS.find(p => p.id === scores.orf_passage_level)!
              return (
                <div className="space-y-3">
                  {/* A/B/C: simple score */}
                  {!selPl.hasCwpm && (
                    <div>
                      <label className="text-[10px] text-text-secondary block mb-1">
                        {selPl.id === 'A' ? 'Rubric Score (0-4)' : `Words Correct /${selPl.maxRaw}`}
                      </label>
                      <NumInput value={scores.orf_raw_score} onChange={v => set('orf_raw_score', v)} max={selPl.maxRaw!} />
                      {selPl.id === 'A' && (
                        <div className="mt-1.5 text-[9px] text-text-tertiary space-y-0.5">
                          <p>0 = No response | 1 = Korean only/single word | 2 = Single English words | 3 = Phrases/simple sentences | 4 = Full sentences with detail</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* D/E/F: CWPM + NAEP */}
                  {selPl.hasCwpm && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-1">Raw CWPM</label>
                        <NumInput value={scores.orf_raw_score} onChange={v => set('orf_raw_score', v)} max={300} />
                      </div>
                      <div>
                        <label className="text-[10px] text-text-secondary block mb-1">NAEP Fluency</label>
                        <select value={scores.orf_naep ?? ''} onChange={e => set('orf_naep', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface">
                          <option value="">--</option>
                          {[1, 2, 3, 4].map(n => (
                            <option key={n} value={n}>{n} - {NAEP_LABELS[n]}</option>
                          ))}
                        </select>
                      </div>
                      {weighted != null && (
                        <div className="col-span-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700">
                              {scores.orf_raw_score} CWPM x {selPl.weight}x (passage) x {NAEP_FACTORS[scores.orf_naep!]}x (NAEP {scores.orf_naep})
                            </span>
                            <span className="text-[13px] font-bold text-emerald-800">{weighted} wCWPM</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* 4. Comprehension (D/E/F only) */}
          {pl?.hasComp && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={13} className="text-amber-600" />
                <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">4. Comprehension</h4>
                <span className="text-[10px] text-text-tertiary ml-auto">{compTotal ?? 0}/10</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {COMP_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <label className="text-[10px] text-text-secondary block mb-1 text-center">
                      {q.label} <span className="text-text-tertiary">{q.dok}</span>
                    </label>
                    <select
                      value={(scores as any)[`comp_${q.key}`] ?? ''}
                      onChange={e => set(`comp_${q.key}` as keyof G1Scores, e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full px-1.5 py-1.5 border border-border rounded-lg text-[12px] text-center outline-none focus:border-navy bg-surface"
                    >
                      <option value="">--</option>
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Open Response */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={13} className="text-rose-600" />
              <h4 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">5. Open Response</h4>
              <span className="text-[10px] text-text-tertiary ml-auto">{scores.open_response ?? '--'}/5</span>
            </div>
            <div className="flex items-start gap-3">
              <div>
                <label className="text-[10px] text-text-secondary block mb-1">Score (0-5)</label>
                <NumInput value={scores.open_response} onChange={v => set('open_response', v)} max={5} />
              </div>
              <div className="text-[9px] text-text-tertiary space-y-0.5 pt-1">
                <p>0 = No response | 1 = Korean only | 2 = Single English words | 3 = Phrases | 4 = Simple sentences | 5 = Extended response</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] text-text-secondary block mb-1">Teacher Notes</label>
            <textarea value={scores.notes || ''} onChange={e => set('notes', e.target.value)}
              placeholder="Bump-up/down notes, observations, verbatim responses..."
              className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy resize-none h-16" />
          </div>

          {/* Save */}
          <div className="flex justify-end pt-1">
            <button onClick={onSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save {student.english_name}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// -- Main Component --

export default function Grade1OralTest({ levelTest, teacherClass, isAdmin }: {
  levelTest: LevelTest; teacherClass: EnglishClass | null; isAdmin: boolean
}) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [allScores, setAllScores] = useState<Record<string, G1Scores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // student id currently saving
  const [activeTab, setActiveTab] = useState<EnglishClass>(teacherClass || 'Lily')

  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).neq('english_class', 'Sample').neq('english_class', 'Trial').order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      const map: Record<string, G1Scores> = {}
      if (studs) studs.forEach(s => { map[s.id] = emptyScores() })
      if (existing) existing.forEach((s: any) => { map[s.student_id] = fromRawScores(s.raw_scores) })
      setAllScores(map)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  const handleSaveStudent = async (studentId: string) => {
    setSaving(studentId)
    const raw = toRawScores(allScores[studentId] || emptyScores())
    const student = students.find(s => s.id === studentId)
    const { error } = await supabase.from('level_test_scores').upsert({
      level_test_id: levelTest.id,
      student_id: studentId,
      raw_scores: raw,
      previous_class: student?.english_class || null,
      entered_by: currentTeacher?.id || null,
    }, { onConflict: 'level_test_id,student_id' })
    setSaving(null)
    if (error) showToast(`Error: ${error.message}`)
    else showToast(`Saved ${student?.english_name || 'student'}`)
  }

  const handleSaveAll = async () => {
    setSaving('all')
    const cs = students.filter(s => s.english_class === activeTab)
    let errors = 0
    for (const s of cs) {
      const raw = toRawScores(allScores[s.id] || emptyScores())
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id,
        student_id: s.id,
        raw_scores: raw,
        previous_class: s.english_class,
        entered_by: currentTeacher?.id || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    setSaving(null)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved all ${activeTab} scores (${cs.length} students)`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const available = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classCounts: Record<string, { total: number; done: number }> = {}
  ENGLISH_CLASSES.forEach(cls => {
    const s = students.filter(s => s.english_class === cls)
    const done = s.filter(st => {
      const sc = allScores[st.id]
      return sc && sc.alphabet_names != null && sc.orf_passage_level != null && sc.open_response != null
    })
    classCounts[cls] = { total: s.length, done: done.length }
  })

  const classStudents = students.filter(s => s.english_class === activeTab)

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between">
        <ClassTabs active={activeTab} onSelect={setActiveTab} counts={classCounts} available={available} />
        <button onClick={handleSaveAll} disabled={saving === 'all'}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 mb-4">
          {saving === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save All {activeTab}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
        <p className="text-[11px] text-amber-800">
          <span className="font-bold">Grade 1 Oral Test.</span> Click a student to expand their scoring form. Each student is saved individually or use "Save All" for the whole class.
          Passage levels A-C do not have CWPM or comprehension. Levels D-F include timed reading with NAEP fluency rating and 5 comprehension questions.
        </p>
      </div>

      {classStudents.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-[13px]">No students in {activeTab}</div>
      ) : (
        <div className="space-y-2">
          {classStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              scores={allScores[student.id] || emptyScores()}
              onChange={s => setAllScores(prev => ({ ...prev, [student.id]: s }))}
              onSave={() => handleSaveStudent(student.id)}
              saving={saving === student.id}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-text-tertiary mt-3">Entered by: {currentTeacher?.name || 'Unknown'}</p>
    </div>
  )
}
