'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Circle, BookOpen, Mic, PenTool, Eye, FileText, Users, Info, X } from 'lucide-react'

// ============================================================================
// GRADE 1 TEST CONFIGURATION
// ============================================================================

const WRITTEN_SECTIONS = [
  { key: 'w_letter_names', label: 'Letter Names', shortLabel: 'LN', max: 5, standards: ['RF.K.1d'] },
  { key: 'w_letter_sounds', label: 'Letter Sounds', shortLabel: 'LS', max: 5, standards: ['RF.K.3a'] },
  { key: 'w_word_picture', label: 'Word-Picture', shortLabel: 'WP', max: 10, standards: ['RF.K.3c', 'RF.1.3g'] },
  { key: 'w_passage_comp', label: 'Passage Comp', shortLabel: 'PC', max: 5, standards: ['RL.K.1', 'SL.K.2'] },
  { key: 'w_writing', label: 'Writing', shortLabel: 'Wr', max: 5, standards: ['W.K.2', 'W.1.2'] },
]
const WRITTEN_TOTAL = 30

const ORAL_SECTIONS = {
  alphabet: [
    { key: 'o_alpha_names', label: 'Letter Names', max: 16 },
    { key: 'o_alpha_sounds', label: 'Letter Sounds', max: 16 },
    { key: 'o_alpha_words', label: 'Words Given', max: 5 },
  ],
  phoneme: [
    { key: 'o_phoneme', label: 'Phoneme Total', max: 12 },
  ],
}

type PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

const PASSAGE_CONFIGS: Record<PassageLevel, {
  label: string
  description: string
  orfMax: number | null
  hasCwpm: boolean
  hasNaep: boolean
  compQuestions: number
  compMax: number
  wordCount: number | null
  passageWeight: number
  bumpUpThreshold?: number
  bumpDownThreshold?: number
}> = {
  A: {
    label: 'Level A: Oral Interview',
    description: 'For students with little or no English. Teacher asks 4 basic questions.',
    orfMax: 4, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: null, passageWeight: 0, bumpUpThreshold: 4,
  },
  B: {
    label: 'Level B: HF Word List',
    description: '20 high-frequency words. Student reads each word aloud.',
    orfMax: 20, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: null, passageWeight: 0, bumpUpThreshold: 15, bumpDownThreshold: 0,
  },
  C: {
    label: 'Level C: Simple Sentences',
    description: '3 simple sentences (15 words total). Score per word correct.',
    orfMax: 15, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: 15, passageWeight: 0, bumpDownThreshold: 0,
  },
  D: {
    label: 'Level D: "My Cat" (25 words)',
    description: 'Short decodable passage. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 4, compMax: 8,
    wordCount: 25, passageWeight: 1.1, bumpDownThreshold: 10,
  },
  E: {
    label: 'Level E: "Lunch Time" (47 words)',
    description: 'Narrative passage. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 5, compMax: 10,
    wordCount: 47, passageWeight: 1.2, bumpDownThreshold: 10,
  },
  F: {
    label: 'Level F: "Rainy Day" (59 words)',
    description: 'Longer narrative with dialogue. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 5, compMax: 10,
    wordCount: 59, passageWeight: 1.3, bumpDownThreshold: 10,
  },
}

const NAEP_LABELS: Record<number, string> = {
  1: 'Word-by-word, no expression',
  2: 'Two-word phrases, some expression',
  3: 'Mostly smooth, appropriate expression',
  4: 'Fluent with consistent expression',
}
const NAEP_MULTIPLIERS: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.1 }

const COMP_QUESTIONS: Record<string, { q: string; dok: string }[]> = {
  D: [
    { q: 'What pet do they have?', dok: 'DOK 1' },
    { q: 'What can the cat do?', dok: 'DOK 1' },
    { q: 'Can the cat swim?', dok: 'DOK 2' },
    { q: 'If you had a pet, what would it be? Why?', dok: 'Oral Production' },
  ],
  E: [
    { q: 'What is in the lunch box?', dok: 'DOK 1' },
    { q: 'What do they eat first?', dok: 'DOK 1' },
    { q: 'How does the child feel before/after lunch?', dok: 'DOK 2' },
    { q: 'Why is lunch their favorite time?', dok: 'DOK 2' },
    { q: 'What is YOUR favorite time at school? Why?', dok: 'Oral Production' },
  ],
  F: [
    { q: 'What was the weather like?', dok: 'DOK 1' },
    { q: 'What did Mina and her mom make?', dok: 'DOK 1' },
    { q: 'How did Mina\'s feelings change?', dok: 'DOK 2' },
    { q: 'Why did Mina say "I like rainy days now"?', dok: 'DOK 2' },
    { q: 'What do YOU like to do on a rainy day? Why?', dok: 'Oral Production' },
  ],
}

const WRITING_RUBRIC = [
  { score: 0, level: 'Pre-writer', desc: 'Blank, draws pictures, or writes in Korean only' },
  { score: 1, level: 'Letter level', desc: 'Writes some letters or initial sounds, not recognizable words' },
  { score: 2, level: 'Word level', desc: 'Writes 1-3 recognizable English words (spelling errors OK)' },
  { score: 3, level: 'Phrase level', desc: 'Writes a phrase or simple sentence with some errors' },
  { score: 4, level: 'Sentence level', desc: 'Writes 1-2 complete sentences, mostly correct spelling' },
  { score: 5, level: 'Strong writer', desc: 'Writes 3+ sentences with details (numbers, colors, adjectives)' },
]

// ============================================================================
// STANDARDS BASELINE MAPPING
// ============================================================================

interface StandardBaseline {
  code: string
  domain: string
  gradeLevel: string  // 'K' or '1'
  description: string
  testSection: string
  masteryThreshold: number
  alsoChecks?: string
}

const STANDARDS_BASELINE: StandardBaseline[] = [
  { code: 'RF.K.1d', domain: 'Print Concepts', gradeLevel: 'K',
    description: 'Recognize and name all upper- and lowercase letters',
    testSection: 'w_letter_names', masteryThreshold: 4, alsoChecks: 'o_alpha_names' },
  { code: 'RF.K.3a', domain: 'Phonics', gradeLevel: 'K',
    description: 'Letter-sound correspondences for consonants',
    testSection: 'w_letter_sounds', masteryThreshold: 4, alsoChecks: 'o_alpha_sounds' },
  { code: 'RF.K.2', domain: 'Phonological Awareness', gradeLevel: 'K',
    description: 'Demonstrate understanding of spoken words, syllables, and sounds',
    testSection: 'o_phoneme', masteryThreshold: 8 },
  { code: 'RF.K.3c', domain: 'Phonics', gradeLevel: 'K',
    description: 'Read common high-frequency words by sight',
    testSection: 'w_word_picture', masteryThreshold: 7 },
  { code: 'RF.1.3g', domain: 'Phonics', gradeLevel: '1',
    description: 'Recognize grade-appropriate irregularly spelled words',
    testSection: 'w_word_picture', masteryThreshold: 9 },
  { code: 'SL.K.2', domain: 'Listening', gradeLevel: 'K',
    description: 'Confirm understanding of a text read aloud',
    testSection: 'w_passage_comp', masteryThreshold: 3 },
  { code: 'RL.K.1', domain: 'Reading Lit', gradeLevel: 'K',
    description: 'Ask and answer questions about key details',
    testSection: 'w_passage_comp', masteryThreshold: 4 },
  { code: 'W.K.2', domain: 'Writing', gradeLevel: 'K',
    description: 'Use drawing, dictating, and writing to compose texts',
    testSection: 'w_writing', masteryThreshold: 2 },
  { code: 'W.1.2', domain: 'Writing', gradeLevel: '1',
    description: 'Write informative texts - name a topic, supply facts',
    testSection: 'w_writing', masteryThreshold: 4 },
  { code: 'L.K.2d', domain: 'Language', gradeLevel: 'K',
    description: 'Spell simple words phonetically',
    testSection: 'w_writing', masteryThreshold: 2 },
  { code: 'RF.1.4', domain: 'Fluency', gradeLevel: '1',
    description: 'Read with sufficient accuracy and fluency',
    testSection: 'o_naep', masteryThreshold: 3 },
]

// ============================================================================
// PLACEMENT ALGORITHM - GRADE 1 SPECIFIC
// ============================================================================

interface G1Scores {
  // Written
  w_letter_names?: number | null
  w_letter_sounds?: number | null
  w_word_picture?: number | null
  w_passage_comp?: number | null
  w_writing?: number | null
  // Oral
  o_alpha_names?: number | null
  o_alpha_sounds?: number | null
  o_alpha_words?: number | null
  o_phoneme?: number | null
  o_passage_level?: string | null
  o_orf_raw?: number | null
  o_orf_words_read?: number | null
  o_orf_errors?: number | null
  o_orf_time_seconds?: number | null
  o_naep?: number | null
  o_comp_q1?: number | null
  o_comp_q2?: number | null
  o_comp_q3?: number | null
  o_comp_q4?: number | null
  o_comp_q5?: number | null
  o_open_response?: number | null
  // Teacher
  teacher_impression?: string | null
  teacher_notes?: string
}

function calculateG1Composite(scores: G1Scores): {
  writtenPct: number
  oralScore: number  // 0-100 normalized
  teacherPct: number
  composite: number
  passageLevel: string
  cwpm: number | null
  weightedCwpm: number | null
  compTotal: number | null
  compMax: number | null
  standardsBaseline: { code: string; met: boolean; score: number; threshold: number }[]
  suggestedClass: EnglishClass
} {
  // ── Written score (simple percentage) ──
  const wScores = [
    scores.w_letter_names, scores.w_letter_sounds,
    scores.w_word_picture, scores.w_passage_comp, scores.w_writing
  ].filter(v => v != null) as number[]
  const writtenRaw = wScores.reduce((a, b) => a + b, 0)
  const writtenPct = WRITTEN_TOTAL > 0 ? (writtenRaw / WRITTEN_TOTAL) * 100 : 0

  // ── Oral score (normalized 0-100) ──
  // This is the complex part because passage level determines the scoring range
  const passageLevel = (scores.o_passage_level || 'A') as PassageLevel
  const config = PASSAGE_CONFIGS[passageLevel]

  // Alphabet subscore (0-37 raw -> normalize)
  const alphaRaw = ((scores.o_alpha_names ?? 0) + (scores.o_alpha_sounds ?? 0) + (scores.o_alpha_words ?? 0))
  const alphaPct = (alphaRaw / 37) * 100

  // Phoneme subscore
  const phonemePct = ((scores.o_phoneme ?? 0) / 12) * 100

  // ORF subscore - this varies dramatically by level
  let orfPct = 0
  let cwpm: number | null = null
  let weightedCwpm: number | null = null

  if (passageLevel === 'A') {
    orfPct = ((scores.o_orf_raw ?? 0) / 4) * 100
  } else if (passageLevel === 'B') {
    orfPct = ((scores.o_orf_raw ?? 0) / 20) * 100
  } else if (passageLevel === 'C') {
    orfPct = ((scores.o_orf_raw ?? 0) / 15) * 100
  } else {
    // Levels D-F: Calculate CWPM
    const wordsRead = scores.o_orf_words_read ?? 0
    const errors = scores.o_orf_errors ?? 0
    const timeSeconds = scores.o_orf_time_seconds ?? 60
    const wordsCorrect = Math.max(0, wordsRead - errors)

    if (timeSeconds > 0) {
      cwpm = Math.round((wordsCorrect / timeSeconds) * 60)
    }

    const naepMultiplier = NAEP_MULTIPLIERS[scores.o_naep ?? 3] ?? 1.0
    weightedCwpm = cwpm != null ? Math.round(cwpm * config.passageWeight * naepMultiplier) : null

    // Normalize CWPM to 0-100 scale using grade 1 benchmarks
    // Lily end target: 15 CWPM, Snapdragon end target: 90 CWPM
    if (weightedCwpm != null) {
      orfPct = Math.min(100, (weightedCwpm / 90) * 100)
    }
  }

  // Passage level itself is a strong signal - add a level bonus
  const levelBonus: Record<string, number> = { A: 0, B: 15, C: 30, D: 50, E: 70, F: 85 }
  const levelScore = levelBonus[passageLevel] ?? 0

  // Comprehension subscore
  let compTotal: number | null = null
  let compMax: number | null = null
  if (config.compQuestions > 0) {
    const compScores = [scores.o_comp_q1, scores.o_comp_q2, scores.o_comp_q3, scores.o_comp_q4]
    if (config.compQuestions >= 5) compScores.push(scores.o_comp_q5)
    const validComp = compScores.filter(v => v != null) as number[]
    compTotal = validComp.reduce((a, b) => a + b, 0)
    compMax = config.compMax
  }
  const compPct = compMax && compMax > 0 && compTotal != null ? (compTotal / compMax) * 100 : 0

  // Open response
  const openPct = ((scores.o_open_response ?? 0) / 5) * 100

  // Weighted oral composite:
  // For non-readers (A/B): alphabet + phoneme matter more
  // For readers (D-F): ORF + comprehension matter more
  let oralScore: number
  if (['A', 'B'].includes(passageLevel)) {
    oralScore = alphaPct * 0.30 + phonemePct * 0.25 + orfPct * 0.20 + levelScore * 0.15 + openPct * 0.10
  } else if (passageLevel === 'C') {
    oralScore = alphaPct * 0.15 + phonemePct * 0.15 + orfPct * 0.30 + levelScore * 0.25 + openPct * 0.15
  } else {
    oralScore = alphaPct * 0.05 + phonemePct * 0.10 + orfPct * 0.20 + levelScore * 0.25 + compPct * 0.25 + openPct * 0.15
  }

  // Teacher impression: class name -> 0-100 based on class position, 'Unsure' or null -> neutral
  const CLASS_IMPRESSION_MAP: Record<string, number> = {
    'Lily': 8, 'Camellia': 25, 'Daisy': 42, 'Sunflower': 58, 'Marigold': 75, 'Snapdragon': 92,
  }
  const hasTeacherImpression = scores.teacher_impression && scores.teacher_impression !== 'Unsure'
  const teacherPct = hasTeacherImpression ? (CLASS_IMPRESSION_MAP[scores.teacher_impression as string] ?? 50) : 50

  // Final composite: if teacher picked 'Unsure' or didn't rate, reweight to 59% oral + 41% written
  const teacherWeight = hasTeacherImpression ? 0.15 : 0
  const oralWeight = hasTeacherImpression ? 0.50 : 0.59
  const writtenWeight = hasTeacherImpression ? 0.35 : 0.41
  const composite = oralScore * oralWeight + writtenPct * writtenWeight + teacherPct * teacherWeight

  // ── Standards baseline ──
  const standardsBaseline = STANDARDS_BASELINE.map(std => {
    let score = (scores as any)[std.testSection] ?? 0
    // For standards that also check oral scores, use the higher of the two
    if (std.alsoChecks) {
      const altScore = (scores as any)[std.alsoChecks] ?? 0
      // Normalize: oral alphabet is /16, written is /5 -- compare percentages
      const primaryMax = WRITTEN_SECTIONS.find(s => s.key === std.testSection)?.max ?? 1
      const altMax = std.alsoChecks === 'o_alpha_names' ? 16 : std.alsoChecks === 'o_alpha_sounds' ? 16 : 1
      const primaryPct = score / primaryMax
      const altPct = altScore / altMax
      if (altPct > primaryPct) {
        score = Math.round(altPct * primaryMax)
      }
    }
    return {
      code: std.code,
      met: score >= std.masteryThreshold,
      score,
      threshold: std.masteryThreshold,
    }
  })

  // ── Suggested class placement ──
  const suggestedClass = suggestG1Class(passageLevel, composite, writtenRaw, scores, cwpm)

  return {
    writtenPct, oralScore, teacherPct, composite,
    passageLevel, cwpm, weightedCwpm,
    compTotal, compMax, standardsBaseline, suggestedClass,
  }
}

function suggestG1Class(
  passageLevel: string,
  composite: number,
  writtenRaw: number,
  scores: G1Scores,
  cwpm: number | null,
): EnglishClass {
  // Primary signal: passage level achieved
  // Secondary: composite score within that band
  // This uses the placement bands from the migration

  // Hard rules first
  if (passageLevel === 'A' && (scores.o_orf_raw ?? 0) <= 2) return 'Lily'
  if (passageLevel === 'A') return composite > 35 ? 'Camellia' : 'Lily'

  if (passageLevel === 'B') {
    if ((scores.o_orf_raw ?? 0) < 8) return 'Lily'
    if ((scores.o_orf_raw ?? 0) < 15) return 'Camellia'
    return composite > 50 ? 'Daisy' : 'Camellia'
  }

  if (passageLevel === 'C') {
    if ((scores.o_orf_raw ?? 0) < 8) return 'Camellia'
    return composite > 55 ? 'Sunflower' : 'Daisy'
  }

  if (passageLevel === 'D') {
    if (cwpm != null && cwpm < 15) return 'Daisy'
    if (cwpm != null && cwpm < 25) return 'Sunflower'
    return composite > 65 ? 'Marigold' : 'Sunflower'
  }

  if (passageLevel === 'E') {
    if (cwpm != null && cwpm < 20) return 'Sunflower'
    if (cwpm != null && cwpm >= 35) return composite > 75 ? 'Snapdragon' : 'Marigold'
    return 'Marigold'
  }

  if (passageLevel === 'F') {
    if (cwpm != null && cwpm < 25) return 'Marigold'
    if (cwpm != null && cwpm >= 40 && composite > 80) return 'Snapdragon'
    return composite > 70 ? 'Snapdragon' : 'Marigold'
  }

  // Fallback: use composite ranges
  if (composite < 20) return 'Lily'
  if (composite < 35) return 'Camellia'
  if (composite < 50) return 'Daisy'
  if (composite < 65) return 'Sunflower'
  if (composite < 80) return 'Marigold'
  return 'Snapdragon'
}

// ============================================================================
// MAIN COMPONENT: Grade1ScoreEntry
// ============================================================================

export default function Grade1ScoreEntry({ levelTest, isAdmin }: {
  levelTest: LevelTest
  isAdmin: boolean
}) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, G1Scores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'written' | 'oral'>('written')
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'complete'>('all')

  // Load students and existing scores
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*')
          .eq('grade', levelTest.grade).eq('is_active', true)
          .neq('english_class', 'Sample').neq('english_class', 'Trial')
          .order('english_name'),
        supabase.from('level_test_scores').select('*')
          .eq('level_test_id', levelTest.id),
      ])

      if (studs) setStudents(studs)

      // Load existing scores
      const scoreMap: Record<string, G1Scores> = {}
      if (existing) {
        existing.forEach((row: any) => {
          scoreMap[row.student_id] = row.raw_scores || {}
        })
      }
      setScores(scoreMap)
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // Update a score field for a student
  const updateScore = useCallback((studentId: string, key: string, value: number | string | null) => {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [key]: value },
    }))
  }, [])

  // Save scores for given student IDs
  const saveScores = useCallback(async (studentIds: string[]) => {
    setSaving(true)
    try {
      for (const sid of studentIds) {
        const raw = scores[sid] || {}
        const metrics = calculateG1Composite(raw)

        const payload = {
          level_test_id: levelTest.id,
          student_id: sid,
          raw_scores: raw,
          calculated_metrics: {
            written_pct: metrics.writtenPct,
            oral_score: metrics.oralScore,
            teacher_pct: metrics.teacherPct,
            passage_level: metrics.passageLevel,
            cwpm: metrics.cwpm,
            weighted_cwpm: metrics.weightedCwpm,
            comp_total: metrics.compTotal,
            comp_max: metrics.compMax,
            standards_baseline: metrics.standardsBaseline,
          },
          composite_index: metrics.composite,
          composite_band: metrics.suggestedClass,
          entered_by: currentTeacher?.id || null,
        }

        await supabase.from('level_test_scores').upsert(payload, {
          onConflict: 'level_test_id,student_id',
        })
      }
      showToast(`Saved ${studentIds.length} student${studentIds.length > 1 ? 's' : ''}`)
    } catch (err: any) {
      showToast(`Error saving: ${err.message}`)
    }
    setSaving(false)
  }, [scores, levelTest.id, currentTeacher?.id, showToast])

  // Completion stats
  const completionStats = useMemo(() => {
    let writtenDone = 0, oralDone = 0
    students.forEach(s => {
      const sc = scores[s.id] || {}
      if (sc.w_letter_names != null || sc.w_letter_sounds != null || sc.w_word_picture != null) writtenDone++
      if (sc.o_passage_level) oralDone++
    })
    return { writtenDone, oralDone, total: students.length }
  }, [students, scores])

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 size={24} className="animate-spin text-navy mx-auto" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Tab Bar */}
      <div className="px-10 py-4 bg-surface border-b border-border">
        <div className="flex items-center gap-2">
          {[
            { key: 'written' as const, icon: PenTool, label: 'Written Test', sub: `${completionStats.writtenDone}/${completionStats.total}` },
            { key: 'oral' as const, icon: Mic, label: 'Oral Test', sub: `${completionStats.oralDone}/${completionStats.total}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-navy text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-alt'
              }`}>
              <tab.icon size={15} />
              {tab.label}
              {tab.sub && <span className={`text-[10px] ml-1 ${activeTab === tab.key ? 'opacity-70' : 'text-text-tertiary'}`}>{tab.sub}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'written' && (
        <WrittenTestEntry
          students={students}
          scores={scores}
          updateScore={updateScore}
          onSave={saveScores}
          saving={saving}
        />
      )}
      {activeTab === 'oral' && (
        <OralTestEntry
          students={students}
          scores={scores}
          updateScore={updateScore}
          onSave={saveScores}
          saving={saving}
          selectedIdx={selectedStudentIdx}
          onSelectIdx={setSelectedStudentIdx}
        />
      )}
    </div>
  )
}

// ============================================================================
// WRITTEN TEST ENTRY - Spreadsheet Mode
// ============================================================================

function WrittenTestEntry({ students, scores, updateScore, onSave, saving }: {
  students: Student[]
  scores: Record<string, G1Scores>
  updateScore: (sid: string, key: string, val: number | null) => void
  onSave: (sids: string[]) => Promise<void>
  saving: boolean
}) {
  const [sortBy, setSortBy] = useState<'name' | 'class'>('name')

  const sorted = useMemo(() => {
    return [...students].sort((a, b) => {
      if (sortBy === 'class') {
        const ca = ENGLISH_CLASSES.indexOf(a.english_class as EnglishClass)
        const cb = ENGLISH_CLASSES.indexOf(b.english_class as EnglishClass)
        if (ca !== cb) return ca - cb
      }
      return a.english_name.localeCompare(b.english_name)
    })
  }, [students, sortBy])

  const getWrittenTotal = (sid: string) => {
    const sc = scores[sid] || {}
    const vals = WRITTEN_SECTIONS.map(s => (sc as any)[s.key] ?? 0)
    return vals.reduce((a: number, b: number) => a + b, 0)
  }

  return (
    <div className="px-10 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy flex items-center gap-2">
            <PenTool size={18} /> Written Test Entry
          </h3>
          <p className="text-[12px] text-text-secondary mt-1">
            Whole-class test. Enter section scores for each student. Total: /30
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface">
            <option value="name">Sort by Name</option>
            <option value="class">Sort by Class</option>
          </select>
          <button onClick={() => onSave(students.map(s => s.id))} disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save All
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface-alt">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold sticky left-0 bg-surface-alt z-10 min-w-[200px]">
                  Student
                </th>
                {WRITTEN_SECTIONS.map(sec => (
                  <th key={sec.key} className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold min-w-[80px]">
                    <div>{sec.shortLabel}</div>
                    <div className="text-[9px] font-normal text-text-tertiary">/{sec.max}</div>
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-navy font-bold min-w-[70px]">
                  Total<br/><span className="text-[9px] font-normal">/{WRITTEN_TOTAL}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((student, idx) => {
                const total = getWrittenTotal(student.id)
                const sc = scores[student.id] || {}
                const hasData = WRITTEN_SECTIONS.some(s => (sc as any)[s.key] != null)
                return (
                  <tr key={student.id} className={`border-t border-border ${idx % 2 === 0 ? '' : 'bg-surface-alt/30'} hover:bg-blue-50/50 transition-colors`}>
                    <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ backgroundColor: classToColor(student.english_class as EnglishClass), color: classToTextColor(student.english_class as EnglishClass) }}>
                          {student.english_class.slice(0, 3)}
                        </span>
                        <div>
                          <span className="font-medium text-navy">{student.english_name}</span>
                          <span className="text-text-tertiary ml-1.5">{student.korean_name}</span>
                        </div>
                        {hasData && <CheckCircle2 size={12} className="text-green-500 ml-auto flex-shrink-0" />}
                      </div>
                    </td>
                    {WRITTEN_SECTIONS.map(sec => (
                      <td key={sec.key} className="text-center px-1 py-1.5">
                        <input
                          type="number"
                          min={0}
                          max={sec.max}
                          value={(sc as any)[sec.key] ?? ''}
                          onChange={e => updateScore(student.id, sec.key, e.target.value === '' ? null : Math.min(sec.max, Math.max(0, Number(e.target.value))))}
                          className="w-14 px-2 py-1.5 border border-border rounded-lg text-center text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface transition-all"
                          placeholder="--"
                        />
                      </td>
                    ))}
                    <td className="text-center px-3 py-2.5">
                      <span className={`text-[13px] font-bold ${total >= 25 ? 'text-green-600' : total >= 15 ? 'text-amber-600' : total > 0 ? 'text-red-600' : 'text-text-tertiary'}`}>
                        {hasData ? total : '--'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Writing Rubric Reference */}
      <div className="mt-6 bg-surface border border-border rounded-xl p-5">
        <h4 className="text-[12px] font-semibold text-navy mb-3 flex items-center gap-2">
          <Info size={14} /> Writing Rubric Reference (Page 7)
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {WRITING_RUBRIC.map(r => (
            <div key={r.score} className="flex items-start gap-2 text-[11px]">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-navy text-white text-[10px] font-bold flex-shrink-0 mt-0.5">{r.score}</span>
              <div>
                <span className="font-semibold text-navy">{r.level}</span>
                <span className="text-text-secondary ml-1">-- {r.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="mt-6 flex justify-end">
        <button onClick={() => onSave(students.map(s => s.id))} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-all shadow-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save All Written Scores
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// ORAL TEST ENTRY - Per-Student Adaptive Form
// ============================================================================

function OralTestEntry({ students, scores, updateScore, onSave, saving, selectedIdx, onSelectIdx }: {
  students: Student[]
  scores: Record<string, G1Scores>
  updateScore: (sid: string, key: string, val: number | string | null) => void
  onSave: (sids: string[]) => Promise<void>
  saving: boolean
  selectedIdx: number
  onSelectIdx: (idx: number) => void
}) {
  const student = students[selectedIdx]
  if (!student) return <div className="p-8 text-center text-text-tertiary">No students found.</div>

  const sc = scores[student.id] || {}
  const passageLevel = (sc.o_passage_level || '') as PassageLevel | ''
  const config = passageLevel ? PASSAGE_CONFIGS[passageLevel as PassageLevel] : null

  const studentHasOralData = (sid: string) => {
    const s = scores[sid] || {}
    return !!(s.o_passage_level || s.o_alpha_names != null)
  }

  return (
    <div className="flex h-[calc(100vh-220px)]">
      {/* Student List Sidebar */}
      <div className="w-64 border-r border-border bg-surface-alt/50 overflow-y-auto flex-shrink-0">
        <div className="px-4 py-3 border-b border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Students</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">{students.filter(s => studentHasOralData(s.id)).length}/{students.length} entered</p>
        </div>
        <div className="py-1">
          {students.map((s, idx) => {
            const done = studentHasOralData(s.id)
            return (
              <button key={s.id} onClick={() => onSelectIdx(idx)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all ${
                  idx === selectedIdx
                    ? 'bg-navy/10 border-r-2 border-navy'
                    : 'hover:bg-surface-alt'
                }`}>
                {done
                  ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                  : <Circle size={13} className="text-text-tertiary flex-shrink-0" />
                }
                <div className="min-w-0">
                  <p className={`text-[12px] truncate ${idx === selectedIdx ? 'font-semibold text-navy' : 'text-text-primary'}`}>
                    {s.english_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">{s.korean_name}</p>
                </div>
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: classToColor(s.english_class as EnglishClass), color: classToTextColor(s.english_class as EnglishClass) }}>
                  {s.english_class.slice(0, 3)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Entry Form */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Student Header + Nav */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">{student.english_name}</h3>
            <p className="text-[12px] text-text-secondary">{student.korean_name} -- {student.english_class}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onSave([student.id]); if (selectedIdx > 0) onSelectIdx(selectedIdx - 1) }}
              disabled={selectedIdx === 0 || saving}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30 transition-all">
              <ChevronLeft size={14} /> Prev
            </button>
            <button onClick={() => onSave([student.id])} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
            <button onClick={() => { onSave([student.id]); if (selectedIdx < students.length - 1) onSelectIdx(selectedIdx + 1) }}
              disabled={selectedIdx === students.length - 1 || saving}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30 transition-all">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Section 1: Alphabet Recognition */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 1: Alphabet Recognition</h4>
          <p className="text-[11px] text-text-secondary mb-4">Letters: s, a, t, m, p, i, n, d, o, g, c, e, k, j, x, y (16 letters)</p>
          <div className="grid grid-cols-3 gap-4">
            {ORAL_SECTIONS.alphabet.map(sec => (
              <div key={sec.key}>
                <label className="text-[11px] font-medium text-text-secondary block mb-1">{sec.label} <span className="text-text-tertiary">/{sec.max}</span></label>
                <input type="number" min={0} max={sec.max}
                  value={(sc as any)[sec.key] ?? ''}
                  onChange={e => updateScore(student.id, sec.key, e.target.value === '' ? null : Math.min(sec.max, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                  placeholder="--"
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-tertiary mt-2 italic">Stopping rule: If student misses 5 consecutive letter names, stop and move on.</p>
        </div>

        {/* Section 2: Phoneme Manipulation */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 2: Phoneme Manipulation</h4>
          <p className="text-[11px] text-text-secondary mb-4">Words: sun, map, leg, fish -- segmenting, counting, isolating sounds</p>
          <div className="w-48">
            <label className="text-[11px] font-medium text-text-secondary block mb-1">Total Correct <span className="text-text-tertiary">/12</span></label>
            <input type="number" min={0} max={12}
              value={sc.o_phoneme ?? ''}
              onChange={e => updateScore(student.id, 'o_phoneme', e.target.value === '' ? null : Math.min(12, Math.max(0, Number(e.target.value))))}
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
              placeholder="--"
            />
          </div>
          <p className="text-[10px] text-text-tertiary mt-2 italic">Stopping rule: If student cannot segment "sun" after one model, record 0.</p>
        </div>

        {/* Section 3: Oral Reading Fluency -- Passage Level Selection */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-3">Component 3: Oral Reading Fluency</h4>

          {/* Passage Level Selector */}
          <div className="mb-4">
            <label className="text-[11px] font-medium text-text-secondary block mb-2">Passage Level</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C', 'D', 'E', 'F'] as PassageLevel[]).map(level => (
                <button key={level} onClick={() => updateScore(student.id, 'o_passage_level', level)}
                  className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                    passageLevel === level
                      ? 'bg-navy text-white shadow-sm ring-2 ring-navy/30'
                      : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                  }`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Passage description */}
          {config && (
            <div className="bg-blue-50/50 rounded-lg px-4 py-3 mb-4 border border-blue-100">
              <p className="text-[12px] font-semibold text-navy">{config.label}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{config.description}</p>
              {config.bumpUpThreshold != null && (
                <p className="text-[10px] text-blue-600 mt-1">Bump up if score reaches {config.bumpUpThreshold}+</p>
              )}
              {config.bumpDownThreshold != null && (
                <p className="text-[10px] text-amber-600">Bump down if student cannot read any words</p>
              )}
            </div>
          )}

          {/* Adaptive ORF fields based on passage level */}
          {passageLevel && !config?.hasCwpm && (
            // Levels A, B, C: Simple raw score
            <div className="w-48">
              <label className="text-[11px] font-medium text-text-secondary block mb-1">
                {passageLevel === 'A' ? 'Interview Score' : passageLevel === 'B' ? 'Words Correct' : 'Words Read Correctly'}
                <span className="text-text-tertiary ml-1">/{config?.orfMax}</span>
              </label>
              <input type="number" min={0} max={config?.orfMax ?? 100}
                value={sc.o_orf_raw ?? ''}
                onChange={e => updateScore(student.id, 'o_orf_raw', e.target.value === '' ? null : Number(e.target.value))}
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                placeholder="--"
              />
            </div>
          )}

          {passageLevel && config?.hasCwpm && (
            // Levels D, E, F: CWPM calculation fields
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Words Read (:60) <span className="text-text-tertiary">/{config.wordCount}</span>
                  </label>
                  <input type="number" min={0} max={config.wordCount ?? 100}
                    value={sc.o_orf_words_read ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_words_read', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="--"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">Errors</label>
                  <input type="number" min={0}
                    value={sc.o_orf_errors ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_errors', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="--"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-text-secondary block mb-1">
                    Time (sec) <span className="text-text-tertiary">if finished early</span>
                  </label>
                  <input type="number" min={1} max={60}
                    value={sc.o_orf_time_seconds ?? ''}
                    onChange={e => updateScore(student.id, 'o_orf_time_seconds', e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Live CWPM calculation */}
              {sc.o_orf_words_read != null && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 border border-green-100">
                  <span className="text-[11px] text-green-700 font-medium">
                    CWPM: {Math.round(((sc.o_orf_words_read - (sc.o_orf_errors ?? 0)) / (sc.o_orf_time_seconds || 60)) * 60)}
                    <span className="text-green-600/70 ml-2">(The app calculates weighted CWPM automatically)</span>
                  </span>
                </div>
              )}

              {/* NAEP Rating */}
              <div>
                <label className="text-[11px] font-medium text-text-secondary block mb-2">NAEP Fluency Rating</label>
                <div className="grid grid-cols-2 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} onClick={() => updateScore(student.id, 'o_naep', sc.o_naep === n ? null : n)}
                      className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-left text-[11px] transition-all ${
                        sc.o_naep === n
                          ? 'bg-navy text-white ring-2 ring-navy/30'
                          : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                      }`}>
                      <span className="font-bold flex-shrink-0">{n}</span>
                      <span className={sc.o_naep === n ? 'opacity-90' : ''}>{NAEP_LABELS[n]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Comprehension (only for D, E, F) */}
        {config && config.compQuestions > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5 mb-4">
            <h4 className="text-[13px] font-semibold text-navy mb-1">
              Comprehension <span className="text-text-tertiary font-normal">/{config.compMax}</span>
            </h4>
            <p className="text-[11px] text-text-secondary mb-4">Ask after reading. Passage turned over.</p>
            <div className="space-y-3">
              {COMP_QUESTIONS[passageLevel]?.map((cq, qi) => (
                <div key={qi} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-text-primary">
                      <span className="font-semibold text-navy">Q{qi + 1}</span>
                      <span className="text-text-tertiary ml-1 text-[10px]">[{cq.dok}]</span>
                      <span className="ml-2">{cq.q}</span>
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {[0, 1, 2].map(v => {
                      const key = `o_comp_q${qi + 1}` as keyof G1Scores
                      return (
                        <button key={v} onClick={() => updateScore(student.id, key, (sc as any)[key] === v ? null : v)}
                          className={`w-9 h-9 rounded-lg text-[12px] font-bold transition-all ${
                            (sc as any)[key] === v
                              ? v === 0 ? 'bg-red-500 text-white' : v === 1 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white'
                              : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                          }`}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Open Response */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Open Response (Picture Description)</h4>
          <p className="text-[11px] text-text-secondary mb-3">"Look at this picture. Tell me about it. What do you see?"</p>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => updateScore(student.id, 'o_open_response', sc.o_open_response === v ? null : v)}
                className={`w-11 h-11 rounded-xl text-[13px] font-bold transition-all ${
                  sc.o_open_response === v
                    ? 'bg-navy text-white ring-2 ring-navy/30'
                    : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Section 6: Teacher Impression -- Class Placement Guess */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Teacher Impression</h4>
          <p className="text-[11px] text-text-secondary mb-3">Based on testing this student, which class feels right? This factors into placement (15% weight).</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {([...ENGLISH_CLASSES, 'Unsure'] as string[]).map(cls => {
              const isClass = cls !== 'Unsure'
              const selected = sc.teacher_impression === cls
              return (
                <button key={cls} onClick={() => updateScore(student.id, 'teacher_impression', selected ? null : cls)}
                  className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all ${
                    selected
                      ? isClass ? 'text-white ring-2 ring-offset-1' : 'bg-gray-500 text-white ring-2 ring-gray-400 ring-offset-1'
                      : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                  }`}
                  style={selected && isClass ? {
                    backgroundColor: classToColor(cls as EnglishClass),
                    color: classToTextColor(cls as EnglishClass),
                    ringColor: classToColor(cls as EnglishClass),
                  } : {}}>
                  {cls}
                </button>
              )
            })}
          </div>
          <textarea
            value={sc.teacher_notes || ''}
            onChange={e => updateScore(student.id, 'teacher_notes', e.target.value)}
            placeholder="Optional notes about this student's performance..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-16"
          />
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end mb-4">
          <button onClick={() => onSave([student.id])} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 transition-all shadow-sm">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save {student.english_name}
          </button>
        </div>

        {/* Live Preview of Calculated Scores */}
        {(sc.o_passage_level || sc.o_alpha_names != null) && (
          <StudentScorePreview scores={sc} student={student} />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// STUDENT SCORE PREVIEW (live calculation while entering)
// ============================================================================

function StudentScorePreview({ scores, student }: { scores: G1Scores; student: Student }) {
  const metrics = calculateG1Composite(scores)

  return (
    <div className="bg-gradient-to-br from-navy/5 to-navy/10 border border-navy/20 rounded-xl p-5 mb-4">
      <h4 className="text-[13px] font-semibold text-navy mb-3 flex items-center gap-2">
        <Eye size={14} /> Live Score Preview
      </h4>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Written</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.writtenPct)}%</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Oral</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.oralScore)}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Composite</p>
          <p className="text-[18px] font-bold text-navy">{Math.round(metrics.composite)}</p>
        </div>
        <div className="bg-surface rounded-lg p-3 text-center">
          <p className="text-[10px] text-text-tertiary uppercase tracking-wider">Suggested</p>
          <p className="text-[14px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
            style={{ backgroundColor: classToColor(metrics.suggestedClass), color: classToTextColor(metrics.suggestedClass) }}>
            {metrics.suggestedClass}
          </p>
        </div>
      </div>

      {/* CWPM detail */}
      {metrics.cwpm != null && (
        <div className="flex items-center gap-4 mb-3 text-[11px]">
          <span className="text-text-secondary">Passage {metrics.passageLevel}</span>
          <span className="text-navy font-semibold">Raw CWPM: {metrics.cwpm}</span>
          {metrics.weightedCwpm != null && <span className="text-text-secondary">Weighted: {metrics.weightedCwpm}</span>}
          {metrics.compTotal != null && <span className="text-text-secondary">Comp: {metrics.compTotal}/{metrics.compMax}</span>}
        </div>
      )}

      {/* Standards Baseline */}
      <div className="mt-3 pt-3 border-t border-navy/10">
        <p className="text-[10px] font-semibold text-navy mb-2 uppercase tracking-wider">Standards Baseline</p>
        <div className="flex flex-wrap gap-1.5">
          {metrics.standardsBaseline.map(std => (
            <span key={std.code}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${
                std.met
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
              {std.met ? <CheckCircle2 size={10} /> : <Circle size={10} />}
              {std.code}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS for use in LevelingView
// ============================================================================

export { calculateG1Composite, suggestG1Class, WRITTEN_SECTIONS, PASSAGE_CONFIGS, STANDARDS_BASELINE, NAEP_MULTIPLIERS }
export type { G1Scores, PassageLevel }
