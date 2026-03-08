'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Save, Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Circle, BookOpen, Mic, PenTool, Eye, FileText, Users, BarChart3, Info, X } from 'lucide-react'

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
    description: 'For students with little or no English. Teacher asks 5 basic questions, scoring each 0-4.',
    orfMax: 20, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: null, passageWeight: 0, bumpUpThreshold: 10,
  },
  B: {
    label: 'Level B: HF Word List',
    description: '20 high-frequency words. Student reads each word aloud.',
    orfMax: 20, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: null, passageWeight: 0, bumpUpThreshold: 15, bumpDownThreshold: 0,
  },
  C: {
    label: 'Level C: Simple Sentences',
    description: '3 simple sentences (11 words total). Score per word correct. If they can produce a full sentence, try Level D.',
    orfMax: 11, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: 11, passageWeight: 0, bumpDownThreshold: 0,
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

// Per-question scoring examples: [0-response, 1-response, 2-response]
const COMP_SCORING_EXAMPLES: Record<string, string[][]> = {
  D: [
    ['No answer or says animal in Korean', '"Animal" or "pet" without specifying', '"A cat" or "They have a cat"'],
    ['No answer or unrelated', '"Run" or single word', '"The cat can run and jump" or lists 2+ actions'],
    ['Says yes or no answer only in Korean', '"No" with no elaboration', '"No, the cat cannot swim" or gives reason'],
    ['No answer or repeats question', 'Names an animal only', 'Names animal and gives a reason why'],
  ],
  E: [
    ['No answer or in Korean', '"Food" or one vague item', '"Rice and soup" -- names both items from the passage'],
    ['No answer or wrong item', 'Gets the item but vague', '"The rice" or "They eat the rice first"'],
    ['No answer', 'Says "happy" or one emotion only', '"First hungry, then not hungry" or "hungry then happy"'],
    ['No answer', '"Because lunch" or circular', '"Because they get to eat" or "rice and soup taste good"'],
    ['No answer or Korean only', 'One word: "recess" or "lunch"', 'Names a time and explains why with 2+ words'],
  ],
  F: [
    ['No answer or Korean', '"Bad" or "rain"', '"It was rainy" or "raining outside"'],
    ['No answer', 'One item only: "cookies"', '"Mina and her mom made paper animals" or "paper animals"'],
    ['No answer or "happy"', 'One feeling only: "sad"', '"First sad then happy" -- shows change over time'],
    ['No answer', '"Because rain" or circular', '"Because she had fun making paper animals inside"'],
    ['No answer or Korean', 'One word answer', 'Names activity and gives reason in English'],
  ],
}

// ============================================================================
// LEVEL TEST PASSAGE CONTENT (A-F) -- NOT in passage library, test-only
// ============================================================================

const LEVEL_A_QUESTIONS = [
  { q: 'What is your name?', prompt: 'Say: "What is your name?"' },
  { q: 'How old are you?', prompt: 'Say: "How old are you?"' },
  { q: 'Who is in your family?', prompt: 'Say: "Who is in your family?"' },
  { q: 'What color do you like?', prompt: 'Say: "What color do you like?"' },
  { q: 'What animal do you like?', prompt: 'Say: "What animal do you like?"' },
]

const LEVEL_A_RUBRIC = [
  { score: 0, label: 'No response', desc: 'No response. Does not attempt English.' },
  { score: 1, label: 'Korean only', desc: 'Responds in Korean only, or single English word with heavy prompting.' },
  { score: 2, label: 'Single words', desc: 'Produces single English words independently (e.g., "seven," "blue," "dog").' },
  { score: 3, label: 'Phrases', desc: 'Produces English phrases or simple sentences (e.g., "I like blue," "my mom, my dad").' },
  { score: 4, label: 'Full sentences', desc: 'Produces full English sentences with some detail (e.g., "My name is Mina. I am seven years old. I like cats.").' },
]

const LEVEL_B_WORDS = ['I', 'a', 'the', 'is', 'my', 'see', 'can', 'go', 'it', 'big', 'like', 'and', 'we', 'to', 'you', 'she', 'he', 'was', 'are', 'have']

const LEVEL_C_SENTENCES = [
  { text: 'I see a cat.', words: ['I', 'see', 'a', 'cat.'] },
  { text: 'The dog is big.', words: ['The', 'dog', 'is', 'big.'] },
  { text: 'I can run.', words: ['I', 'can', 'run.'] },
]

const LEVEL_TEST_PASSAGES: Record<string, { title: string; text: string; wordCount: number }> = {
  D: {
    title: 'My Cat',
    text: 'I have a pet. My pet is a cat. The cat is fat. The cat can sit. The cat can nap. I like my cat.',
    wordCount: 25,
  },
  E: {
    title: 'Lunch Time',
    text: 'It is time for lunch. I am hungry. I open my lunch box. I see rice and soup. The rice is white. The soup is hot. I eat my rice. Then I drink my soup. Now I am not hungry. Lunch is my favorite time at school.',
    wordCount: 47,
  },
  F: {
    title: 'Rainy Day',
    text: 'Mina woke up and looked out the window. It was raining. The sky was gray. "Oh no," said Mina. "I wanted to play outside." Her mom said, "Let\'s make something fun." They got paper and scissors. They made paper animals. Mina made a cat. Her mom made a dog. "This is fun!" said Mina. "I like rainy days now."',
    wordCount: 59,
  },
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
// COMPONENT 1: ALPHABET LETTERS
// ============================================================================

const ALPHABET_LETTERS = ['s', 'a', 't', 'm', 'p', 'i', 'n', 'd', 'o', 'g', 'c', 'e', 'k', 'j', 'x', 'y']

// ============================================================================
// COMPONENT 2: PHONEME MANIPULATION WORDS
// ============================================================================

const PHONEME_WORDS = [
  {
    word: 'sun',
    sounds: ['/s/', '/u/', '/n/'],
    soundCount: 3,
    beginning: '/s/',
    middle: '/u/',
    end: '/n/',
  },
  {
    word: 'map',
    sounds: ['/m/', '/a/', '/p/'],
    soundCount: 3,
    beginning: '/m/',
    middle: '/a/',
    end: '/p/',
  },
  {
    word: 'leg',
    sounds: ['/l/', '/e/', '/g/'],
    soundCount: 3,
    beginning: '/l/',
    middle: '/e/',
    end: '/g/',
  },
  {
    word: 'fish',
    sounds: ['/f/', '/i/', '/sh/'],
    soundCount: 3,
    beginning: '/f/',
    middle: '/i/',
    end: '/sh/',
  },
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
  // Level A per-question scores
  o_a_q1?: number | null
  o_a_q2?: number | null
  o_a_q3?: number | null
  o_a_q4?: number | null
  o_a_q5?: number | null
  // Phoneme per-word scores
  o_ph_seg_sun?: boolean | null
  o_ph_seg_map?: boolean | null
  o_ph_seg_leg?: boolean | null
  o_ph_seg_fish?: boolean | null
  o_ph_count_sun?: boolean | null
  o_ph_count_map?: boolean | null
  o_ph_count_leg?: boolean | null
  o_ph_count_fish?: boolean | null
  o_ph_bme_sun_b?: boolean | null
  o_ph_bme_sun_m?: boolean | null
  o_ph_bme_sun_e?: boolean | null
  o_ph_bme_map_b?: boolean | null
  o_ph_bme_map_m?: boolean | null
  o_ph_bme_map_e?: boolean | null
  o_ph_bme_leg_b?: boolean | null
  o_ph_bme_leg_m?: boolean | null
  o_ph_bme_leg_e?: boolean | null
  o_ph_bme_fish_b?: boolean | null
  o_ph_bme_fish_m?: boolean | null
  o_ph_bme_fish_e?: boolean | null
  // Teacher
  teacher_impression?: number | null
  teacher_notes?: string
  // Wave 1 class impression (teacher's gut feeling after oral test)
  wave1_class_impression?: string | null
}

function calculateG1Composite(scores: G1Scores): {
  writtenPct: number
  oralScore: number  // 0-100 normalized
  teacherPct: number
  composite: number
  wave: 1 | 2
  passageLevel: string
  cwpm: number | null
  weightedCwpm: number | null
  compTotal: number | null
  compMax: number | null
  standardsBaseline: { code: string; met: boolean; score: number; threshold: number }[]
  suggestedClass: EnglishClass
} {
  // -- Written score (simple percentage) --
  const wScores = [
    scores.w_letter_names, scores.w_letter_sounds,
    scores.w_word_picture, scores.w_passage_comp, scores.w_writing
  ].filter(v => v != null) as number[]
  const writtenRaw = wScores.reduce((a, b) => a + b, 0)
  const writtenPct = WRITTEN_TOTAL > 0 ? (writtenRaw / WRITTEN_TOTAL) * 100 : 0

  // -- Oral score (normalized 0-100) --
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
    // Level A: sum of per-question scores /20
    const aTotal = (scores.o_a_q1 ?? 0) + (scores.o_a_q2 ?? 0) + (scores.o_a_q3 ?? 0) + (scores.o_a_q4 ?? 0) + (scores.o_a_q5 ?? 0)
    // Also check legacy o_orf_raw for backward compat
    const rawScore = aTotal > 0 ? aTotal : (scores.o_orf_raw ?? 0)
    orfPct = (rawScore / 20) * 100
  } else if (passageLevel === 'B') {
    orfPct = ((scores.o_orf_raw ?? 0) / 20) * 100
  } else if (passageLevel === 'C') {
    orfPct = ((scores.o_orf_raw ?? 0) / 11) * 100
  } else {
    // Levels D-F: Calculate CWPM
    const wordsRead = scores.o_orf_words_read ?? 0
    const errors = scores.o_orf_errors ?? 0
    const timeSeconds = scores.o_orf_time_seconds ?? 60
    const wordsCorrect = Math.max(0, wordsRead - errors)

    if (timeSeconds > 0) {
      cwpm = Math.round((wordsCorrect / timeSeconds) * 60)
    }

    weightedCwpm = cwpm

    if (cwpm != null) {
      orfPct = Math.min(100, (cwpm / 90) * 100)
    }
  }

  // Passage level itself is a strong signal
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

  // Weighted oral composite
  let oralScore: number
  if (['A', 'B'].includes(passageLevel)) {
    oralScore = alphaPct * 0.30 + phonemePct * 0.25 + orfPct * 0.20 + levelScore * 0.15 + openPct * 0.10
  } else if (passageLevel === 'C') {
    oralScore = alphaPct * 0.15 + phonemePct * 0.15 + orfPct * 0.30 + levelScore * 0.25 + openPct * 0.15
  } else {
    oralScore = alphaPct * 0.05 + phonemePct * 0.10 + orfPct * 0.20 + levelScore * 0.25 + compPct * 0.25 + openPct * 0.15
  }

  // Teacher impression -- wave-aware
  const CLASS_IMPRESSION_MAP: Record<string, number> = {
    Lily: 8, Camellia: 25, Daisy: 42, Sunflower: 58, Marigold: 75, Snapdragon: 92
  }
  const hasClassImpression = scores.wave1_class_impression && scores.wave1_class_impression !== 'Unsure'
  const hasNumericImpression = scores.teacher_impression != null
  const teacherPct = hasClassImpression
    ? (CLASS_IMPRESSION_MAP[scores.wave1_class_impression as string] ?? 50)
    : hasNumericImpression
      ? ((scores.teacher_impression! - 1) / 4) * 100
      : 50

  const hasWrittenData = wScores.length > 0 && writtenRaw > 0
  const hasOralData = scores.o_passage_level != null

  let composite: number
  let wave: 1 | 2

  if (!hasWrittenData) {
    if (hasClassImpression) {
      composite = oralScore * 0.50 + teacherPct * 0.50
    } else {
      composite = oralScore
    }
    wave = 1
  } else {
    if (hasOralData && hasClassImpression) {
      composite = oralScore * 0.30 + writtenPct * 0.30 + teacherPct * 0.40
    } else if (hasOralData) {
      composite = oralScore * 0.50 + writtenPct * 0.50
    } else {
      composite = writtenPct
    }
    wave = 2
  }

  // -- Standards baseline --
  const standardsBaseline = STANDARDS_BASELINE.map(std => {
    let score = (scores as any)[std.testSection] ?? 0
    if (std.alsoChecks) {
      const altScore = (scores as any)[std.alsoChecks] ?? 0
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

  const suggestedClass = suggestG1Class(passageLevel, composite, writtenRaw, scores, cwpm)

  return {
    writtenPct, oralScore, teacherPct, composite, wave,
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
  if (passageLevel === 'A') {
    const aTotal = (scores.o_a_q1 ?? 0) + (scores.o_a_q2 ?? 0) + (scores.o_a_q3 ?? 0) + (scores.o_a_q4 ?? 0) + (scores.o_a_q5 ?? 0)
    const rawScore = aTotal > 0 ? aTotal : (scores.o_orf_raw ?? 0)
    if (rawScore <= 5) return 'Lily'
    return composite > 35 ? 'Camellia' : 'Lily'
  }

  if (passageLevel === 'B') {
    if ((scores.o_orf_raw ?? 0) < 8) return 'Lily'
    if ((scores.o_orf_raw ?? 0) < 15) return 'Camellia'
    return composite > 50 ? 'Daisy' : 'Camellia'
  }

  if (passageLevel === 'C') {
    if ((scores.o_orf_raw ?? 0) < 5) return 'Camellia'
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

function Grade1ScoreEntry({ levelTest, isAdmin, teacherClass }: {
  levelTest: LevelTest
  isAdmin: boolean
  teacherClass?: EnglishClass | null
}) {
  const { showToast, currentTeacher } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, G1Scores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'written' | 'oral' | 'results'>('oral')
  const [selectedStudentIdx, setSelectedStudentIdx] = useState(0)
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'complete'>('all')
  const [activeClass, setActiveClass] = useState<EnglishClass>(teacherClass || 'Lily')

  // Load students and existing scores
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*')
          .eq('grade', levelTest.grade).eq('is_active', true)
          
          .order('english_name'),
        supabase.from('level_test_scores').select('*')
          .eq('level_test_id', levelTest.id),
      ])

      if (studs) setStudents(studs)

      const scoreMap: Record<string, G1Scores> = {}
      if (existing) {
        existing.forEach((row: any) => {
          scoreMap[row.student_id] = row.raw_scores || {}
        })
      }
      setScores(scoreMap)
      setSavedSnapshot(JSON.parse(JSON.stringify(scoreMap)))
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // Auto-save infrastructure
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, G1Scores>>({})
  const savingRef = useRef(false)
  const scoresRef = useRef(scores)
  const savedSnapshotRef = useRef(savedSnapshot)
  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savedSnapshotRef.current = savedSnapshot }, [savedSnapshot])

  const isStudentDirty = useCallback((sid: string) => {
    return JSON.stringify(scoresRef.current[sid] || {}) !== JSON.stringify(savedSnapshotRef.current[sid] || {})
  }, [])

  const updateScore = useCallback((studentId: string, key: string, value: number | string | boolean | null) => {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [key]: value },
    }))
  }, [])

  const saveScores = useCallback(async (studentIds: string[], silent = false) => {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    let errors = 0
    try {
      for (const sid of studentIds) {
        const raw = scoresRef.current[sid] || {}

        // Compute o_phoneme from individual checkboxes
        let phonemeTotal = 0
        for (const pw of PHONEME_WORDS) {
          const w = pw.word
          if ((raw as any)[`o_ph_seg_${w}`]) phonemeTotal++
          if ((raw as any)[`o_ph_count_${w}`]) phonemeTotal++
          if ((raw as any)[`o_ph_bme_${w}_b`]) phonemeTotal++
          if ((raw as any)[`o_ph_bme_${w}_m`]) phonemeTotal++
          if ((raw as any)[`o_ph_bme_${w}_e`]) phonemeTotal++
        }
        // But also keep manually set o_phoneme if it's higher (backward compat)
        const existingPhoneme = raw.o_phoneme ?? 0
        const finalRaw = { ...raw, o_phoneme: Math.max(phonemeTotal, existingPhoneme) }

        // For Level A, compute o_orf_raw from per-question scores
        if (finalRaw.o_passage_level === 'A') {
          const aTotal = (finalRaw.o_a_q1 ?? 0) + (finalRaw.o_a_q2 ?? 0) + (finalRaw.o_a_q3 ?? 0) + (finalRaw.o_a_q4 ?? 0) + (finalRaw.o_a_q5 ?? 0)
          if (aTotal > 0) finalRaw.o_orf_raw = aTotal
        }

        const metrics = calculateG1Composite(finalRaw)

        const { error } = await supabase.from('level_test_scores').upsert({
          level_test_id: levelTest.id,
          student_id: sid,
          raw_scores: finalRaw,
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
          previous_class: students.find(s => s.id === sid)?.english_class || null,
          entered_by: currentTeacher?.id || null,
        }, { onConflict: 'level_test_id,student_id' })
        if (error) errors++
      }
      if (errors === 0) {
        setSavedSnapshot(JSON.parse(JSON.stringify(scoresRef.current)))
        if (!silent) showToast(`Saved ${studentIds.length} student${studentIds.length > 1 ? 's' : ''}`)
      } else {
        showToast(`Saved with ${errors} error(s)`)
      }
    } catch (err: any) {
      showToast(`Error saving: ${err.message}`)
    }
    setSaving(false)
    savingRef.current = false
  }, [levelTest.id, currentTeacher?.id, students, showToast])

  const autoSave = useCallback(async () => {
    if (savingRef.current) return
    const current = scoresRef.current
    const snapshot = savedSnapshotRef.current
    const dirty = students.filter(s => {
      const cur = current[s.id]
      if (!cur || Object.keys(cur).length === 0) return false
      return JSON.stringify(cur) !== JSON.stringify(snapshot[s.id] || {})
    })
    if (dirty.length === 0) return
    await saveScores(dirty.map(s => s.id), true)
    showToast(`Auto-saved ${dirty.length} student${dirty.length === 1 ? '' : 's'}`)
  }, [students, saveScores, showToast])

  const autoSaveRef = useRef<(() => Promise<void>) | null>(null)
  useEffect(() => { autoSaveRef.current = autoSave }, [autoSave])

  useEffect(() => {
    const timer = setInterval(() => { autoSaveRef.current?.() }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handler = () => { if (document.hidden) autoSaveRef.current?.() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  useEffect(() => {
    return () => { autoSaveRef.current?.() }
  }, [])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const cur = scoresRef.current; const snap = savedSnapshotRef.current
      const dirty = students.some(s => JSON.stringify(cur[s.id] || {}) !== JSON.stringify(snap[s.id] || {}))
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [students])

  const availableClasses = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classStudents = useMemo(() => students.filter(s => s.english_class === activeClass), [students, activeClass])

  const completionStats = useMemo(() => {
    let writtenDone = 0, oralDone = 0
    classStudents.forEach(s => {
      const sc = scores[s.id] || {}
      if (sc.w_letter_names != null || sc.w_letter_sounds != null || sc.w_word_picture != null) writtenDone++
      if (sc.o_passage_level) oralDone++
    })
    return { writtenDone, oralDone, total: classStudents.length }
  }, [classStudents, scores])

  const classCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const s = students.filter(st => st.english_class === cls)
      const done = s.filter(st => {
        const sc = scores[st.id] || {}
        return sc.o_passage_level != null
      })
      counts[cls] = { total: s.length, done: done.length }
    })
    return counts
  }, [students, scores])

  if (loading) return (
    <div className="p-12 text-center">
      <Loader2 size={24} className="animate-spin text-navy mx-auto" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Class Tabs */}
      <div className="px-10 pt-4 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {ENGLISH_CLASSES.map(cls => {
            const ct = classCounts[cls] || { total: 0, done: 0 }
            const isAvail = availableClasses.includes(cls)
            if (ct.total === 0 && !isAvail) return null
            return (
              <button key={cls} onClick={() => { if (isAvail) { setActiveClass(cls); setSelectedStudentIdx(0) } }} disabled={!isAvail}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                  activeClass === cls ? 'text-white shadow-sm' : isAvail ? 'text-text-secondary hover:bg-surface-alt' : 'text-text-tertiary/40 cursor-not-allowed'
                }`} style={activeClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
                {cls}
                {ct.total > 0 && (
                  <span className={`text-[9px] px-1 rounded ${activeClass === cls ? 'bg-white/20' : 'bg-surface-alt'}`}>
                    {ct.done}/{ct.total}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Flat Tab Bar -- Teacher Ratings REMOVED for Grade 1 */}
      <div className="px-10 bg-surface border-b border-border">
        <div className="flex items-center gap-2 pb-3">
          {[
            { key: 'oral' as const, icon: Mic, label: 'Oral Test', sub: `${completionStats.oralDone}/${completionStats.total}` },
            { key: 'written' as const, icon: PenTool, label: 'Written Test', sub: `${completionStats.writtenDone}/${completionStats.total}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                activeTab === tab.key ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'
              }`}>
              <tab.icon size={15} />
              {tab.label}
              {tab.sub && <span className={`text-[10px] ml-1 ${activeTab === tab.key ? 'opacity-70' : 'text-text-tertiary'}`}>{tab.sub}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {classStudents.length === 0 ? (
        <div className="text-center py-12 text-text-tertiary text-[13px]">No students in {activeClass}</div>
      ) : (
        <>
          {activeTab === 'oral' && (
            <OralTestEntry
              students={classStudents}
              scores={scores}
              updateScore={updateScore}
              onSave={saveScores}
              saving={saving}
              selectedIdx={selectedStudentIdx}
              onSelectIdx={setSelectedStudentIdx}
              activeWave={1}
            />
          )}
          {activeTab === 'written' && (
            <WrittenTestEntry
              students={classStudents}
              scores={scores}
              updateScore={updateScore}
              onSave={saveScores}
              saving={saving}
            />
          )}
        </>
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
    </div>
  )
}

// ============================================================================
// ORAL TEST ENTRY - Per-Student Adaptive Form
// ============================================================================

// ============================================================================
// INTERACTIVE ORF SUB-COMPONENTS FOR LEVEL TEST
// ============================================================================

// ─── COMPONENT 1: Clickable Letter Grids ────────────────────────────────────

function AlphabetGrids({ sc, studentId, updateScore }: {
  sc: G1Scores
  studentId: string
  updateScore: (sid: string, key: string, val: number | boolean | null) => void
}) {
  // Letter names grid
  const [nameStatus, setNameStatus] = useState<Record<number, boolean>>({})
  const [soundStatus, setSoundStatus] = useState<Record<number, boolean>>({})
  const [wordsCount, setWordsCount] = useState<number>(sc.o_alpha_words ?? 0)
  const [wordsNote, setWordsNote] = useState<string>('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      // Initialize name status from saved score
      if (sc.o_alpha_names != null) {
        const ns: Record<number, boolean> = {}
        for (let i = 0; i < ALPHABET_LETTERS.length; i++) ns[i] = i < (sc.o_alpha_names ?? 0)
        setNameStatus(ns)
      }
      // Initialize sound status from saved score
      if (sc.o_alpha_sounds != null) {
        const ss: Record<number, boolean> = {}
        for (let i = 0; i < ALPHABET_LETTERS.length; i++) ss[i] = i < (sc.o_alpha_sounds ?? 0)
        setSoundStatus(ss)
      }
      if (sc.o_alpha_words != null) setWordsCount(sc.o_alpha_words)
      setInitialized(true)
    }
  }, [sc.o_alpha_names, sc.o_alpha_sounds, sc.o_alpha_words, initialized])

  const toggleName = (idx: number) => {
    setNameStatus(prev => {
      const next = { ...prev, [idx]: !prev[idx] }
      const count = Object.values(next).filter(Boolean).length
      updateScore(studentId, 'o_alpha_names', count)
      return next
    })
    setInitialized(true)
  }

  const toggleSound = (idx: number) => {
    setSoundStatus(prev => {
      const next = { ...prev, [idx]: !prev[idx] }
      const count = Object.values(next).filter(Boolean).length
      updateScore(studentId, 'o_alpha_sounds', count)
      return next
    })
    setInitialized(true)
  }

  const nameCount = Object.values(nameStatus).filter(Boolean).length
  const soundCount = Object.values(soundStatus).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Letter Names Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Letter Names</p>
          <span className={`text-[12px] font-bold ${nameCount >= 12 ? 'text-green-600' : nameCount >= 8 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {nameCount}/16
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-2">
          <p className="text-[10px] text-blue-700">Say: "Tell me the name of each letter." Point to each letter. Tap green = correct.</p>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {ALPHABET_LETTERS.map((letter, i) => (
            <button key={`name-${i}`} onClick={() => toggleName(i)}
              className={`px-2 py-3 rounded-xl text-[18px] font-bold font-serif transition-all ${
                nameStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
                nameStatus[i] === false ? 'bg-red-50 text-red-400 border-2 border-red-200' :
                'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
              }`} style={{ touchAction: 'manipulation' }}>
              {letter}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => {
            const ns: Record<number, boolean> = {}; ALPHABET_LETTERS.forEach((_, i) => { ns[i] = true }); setNameStatus(ns); updateScore(studentId, 'o_alpha_names', 16); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setNameStatus({}); updateScore(studentId, 'o_alpha_names', 0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>

      {/* Letter Sounds Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Letter Sounds</p>
          <span className={`text-[12px] font-bold ${soundCount >= 12 ? 'text-green-600' : soundCount >= 8 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {soundCount}/16
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-2">
          <p className="text-[10px] text-blue-700">Say: "Now tell me the sound each letter makes." Point to each letter. Tap green = correct sound.</p>
        </div>
        <div className="grid grid-cols-8 gap-1.5">
          {ALPHABET_LETTERS.map((letter, i) => (
            <button key={`sound-${i}`} onClick={() => toggleSound(i)}
              className={`px-2 py-3 rounded-xl text-[18px] font-bold font-serif transition-all ${
                soundStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
                soundStatus[i] === false ? 'bg-red-50 text-red-400 border-2 border-red-200' :
                'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
              }`} style={{ touchAction: 'manipulation' }}>
              /{letter}/
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={() => {
            const ss: Record<number, boolean> = {}; ALPHABET_LETTERS.forEach((_, i) => { ss[i] = true }); setSoundStatus(ss); updateScore(studentId, 'o_alpha_sounds', 16); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setSoundStatus({}); updateScore(studentId, 'o_alpha_sounds', 0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>

      {/* Words Given */}
      <div className="bg-surface-alt/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-navy">Words Given /5</p>
          <span className={`text-[12px] font-bold ${wordsCount >= 4 ? 'text-green-600' : wordsCount >= 2 ? 'text-amber-600' : 'text-text-secondary'}`}>
            {wordsCount}/5
          </span>
        </div>
        <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-100 mb-3">
          <p className="text-[10px] text-blue-700">Say: "Can you tell me a word that starts with [letter]?" Pick 5 letters from above. Check how many words they can produce.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => {
                setWordsCount(v)
                updateScore(studentId, 'o_alpha_words', v)
              }}
                className={`w-10 h-10 rounded-xl text-[13px] font-bold transition-all ${
                  wordsCount === v
                    ? 'bg-navy text-white ring-2 ring-navy/30'
                    : 'bg-surface text-text-secondary hover:bg-surface-alt border border-border'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <input
          value={wordsNote}
          onChange={(e: any) => setWordsNote(e.target.value)}
          placeholder="Optional: note which words they said..."
          className="w-full mt-3 px-3 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-surface"
        />
      </div>

      <p className="text-[10px] text-text-tertiary italic">Stopping rule: If student misses 5 consecutive letter names, stop and move on.</p>
    </div>
  )
}

// ─── COMPONENT 2: Phoneme Manipulation (redesigned) ─────────────────────────

function PhonemeManipulation({ sc, studentId, updateScore }: {
  sc: G1Scores
  studentId: string
  updateScore: (sid: string, key: string, val: number | boolean | null) => void
}) {
  // Compute phoneme total from checkboxes
  const getPhonemeTotal = () => {
    let total = 0
    for (const pw of PHONEME_WORDS) {
      const w = pw.word
      if ((sc as any)[`o_ph_seg_${w}`]) total++
      if ((sc as any)[`o_ph_count_${w}`]) total++
      if ((sc as any)[`o_ph_bme_${w}_b`]) total++
      if ((sc as any)[`o_ph_bme_${w}_m`]) total++
      if ((sc as any)[`o_ph_bme_${w}_e`]) total++
    }
    return total
  }

  const phonemeTotal = getPhonemeTotal()

  return (
    <div className="space-y-4">
      {/* Teacher Model Reminder */}
      <div className="bg-amber-50 rounded-xl px-5 py-4 border border-amber-200">
        <p className="text-[12px] font-bold text-amber-900 mb-2">Teacher Model First!</p>
        <p className="text-[11px] text-amber-800 leading-relaxed">
          Model with the first word before the student tries. Example with "big":
        </p>
        <div className="mt-2 bg-white/60 rounded-lg px-4 py-3 text-[11px] text-amber-900 space-y-1.5">
          <p><span className="font-bold">1.</span> Say the word: <span className="font-semibold">"big"</span></p>
          <p><span className="font-bold">2.</span> Segment it: <span className="font-semibold">"b - i - g"</span> (stretch each sound)</p>
          <p><span className="font-bold">3.</span> Blend with sweeping motion: <span className="font-semibold">"biiig"</span></p>
          <p><span className="font-bold">4.</span> Count: <span className="font-semibold">"One, two, three -- three sounds"</span></p>
          <p><span className="font-bold">5.</span> Ask: <span className="font-semibold">"What sound is in the beginning? /b/. The middle? /i/. The end? /g/."</span></p>
        </div>
        <p className="text-[10px] text-amber-700 mt-2 italic">Model ALL steps with "big", then have the student try each word below.</p>
      </div>

      {/* Per-word assessment */}
      <div className="space-y-4">
        {PHONEME_WORDS.map((pw) => {
          const w = pw.word
          const segKey = `o_ph_seg_${w}`
          const countKey = `o_ph_count_${w}`
          const bKey = `o_ph_bme_${w}_b`
          const mKey = `o_ph_bme_${w}_m`
          const eKey = `o_ph_bme_${w}_e`

          const segChecked = !!(sc as any)[segKey]
          const countChecked = !!(sc as any)[countKey]
          const bChecked = !!(sc as any)[bKey]
          const mChecked = !!(sc as any)[mKey]
          const eChecked = !!(sc as any)[eKey]
          const wordTotal = (segChecked ? 1 : 0) + (countChecked ? 1 : 0) + (bChecked ? 1 : 0) + (mChecked ? 1 : 0) + (eChecked ? 1 : 0)

          return (
            <div key={w} className="bg-surface border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[20px] font-bold font-serif text-navy">{pw.word}</span>
                  <div className="flex gap-1">
                    {pw.sounds.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-navy/5 rounded text-[11px] font-mono text-navy">{s}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-[12px] font-bold ${wordTotal >= 4 ? 'text-green-600' : wordTotal >= 2 ? 'text-amber-600' : 'text-text-tertiary'}`}>
                  {wordTotal}/5
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Segmenting */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-alt cursor-pointer transition-all">
                  <input type="checkbox" checked={segChecked}
                    onChange={() => updateScore(studentId, segKey, !segChecked)}
                    className="w-5 h-5 rounded border-2 border-navy/30 text-green-600 focus:ring-green-500" />
                  <div>
                    <span className="text-[12px] font-medium text-text-primary">Can segment</span>
                    <span className="text-[10px] text-text-tertiary ml-2">("{pw.word}" -> {pw.sounds.join(' - ')})</span>
                  </div>
                </label>

                {/* Sound count */}
                <label className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-alt cursor-pointer transition-all">
                  <input type="checkbox" checked={countChecked}
                    onChange={() => updateScore(studentId, countKey, !countChecked)}
                    className="w-5 h-5 rounded border-2 border-navy/30 text-green-600 focus:ring-green-500" />
                  <div>
                    <span className="text-[12px] font-medium text-text-primary">Correct # of sounds</span>
                    <span className="text-[10px] text-text-tertiary ml-2">({pw.soundCount} sounds)</span>
                  </div>
                </label>

                {/* B/M/E sounds */}
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[11px] font-medium text-text-secondary w-28">Correct sound:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={bChecked}
                      onChange={() => updateScore(studentId, bKey, !bChecked)}
                      className="w-4 h-4 rounded border-2 border-navy/30 text-green-600" />
                    <span className="text-[11px]">B <span className="text-text-tertiary">{pw.beginning}</span></span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input type="checkbox" checked={mChecked}
                      onChange={() => updateScore(studentId, mKey, !mChecked)}
                      className="w-4 h-4 rounded border-2 border-navy/30 text-green-600" />
                    <span className="text-[11px]">M <span className="text-text-tertiary">{pw.middle}</span></span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer ml-3">
                    <input type="checkbox" checked={eChecked}
                      onChange={() => updateScore(studentId, eKey, !eChecked)}
                      className="w-4 h-4 rounded border-2 border-navy/30 text-green-600" />
                    <span className="text-[11px]">E <span className="text-text-tertiary">{pw.end}</span></span>
                  </label>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between bg-navy/5 rounded-xl px-4 py-3 border border-navy/10">
        <span className="text-[13px] font-bold text-navy">Phoneme Total: {phonemeTotal} / 20</span>
        <span className="text-[10px] text-text-tertiary italic">Stopping rule: If student cannot segment "sun" after one model, record 0.</span>
      </div>
    </div>
  )
}

// ─── Level B: HFW clickable word grid (unchanged) ───────────────────────────

function LevelBWordGrid({ score, onScore }: { score: number | null | undefined; onScore: (n: number | null) => void }) {
  const [wordStatus, setWordStatus] = useState<Record<number, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (score != null && !initialized) {
      const ws: Record<number, boolean> = {}
      for (let i = 0; i < LEVEL_B_WORDS.length; i++) ws[i] = i < score
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [score, initialized])

  const toggle = (idx: number) => {
    setWordStatus(prev => {
      const next = { ...prev, [idx]: !prev[idx] }
      const count = Object.values(next).filter(Boolean).length
      onScore(count)
      return next
    })
    setInitialized(true)
  }

  const correctCount = Object.values(wordStatus).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
        <p className="text-[11px] font-semibold text-blue-800">Say: "Read each word. Try your best."</p>
        <p className="text-[10px] text-blue-600 mt-0.5">Point to each word. Give 3-5 seconds per word. Tap green for correct, tap again to mark incorrect.</p>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {LEVEL_B_WORDS.map((word, i) => (
          <button key={i} onClick={() => toggle(i)}
            className={`px-3 py-3 rounded-xl text-[16px] font-serif font-bold transition-all ${
              wordStatus[i] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
              wordStatus[i] === false ? 'bg-red-50 text-red-400 border-2 border-red-200 line-through' :
              'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
            }`}>
            {word}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-bold ${correctCount >= 15 ? 'text-green-600' : correctCount >= 8 ? 'text-amber-600' : 'text-text-secondary'}`}>
          {correctCount}/20 correct
        </span>
        <div className="flex gap-2">
          <button onClick={() => { const ws: Record<number, boolean> = {}; LEVEL_B_WORDS.forEach((_, i) => { ws[i] = true }); setWordStatus(ws); onScore(20); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setWordStatus({}); onScore(0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
      {correctCount >= 15 && <p className="text-[10px] text-blue-600 font-medium">Bump-up: Score is 15+. Consider moving to Level C.</p>}
      {initialized && correctCount === 0 && <p className="text-[10px] text-amber-600 font-medium">Bump-down: Cannot read any words. Consider moving to Level A.</p>}
    </div>
  )
}

// ─── Level C: Clickable sentence words ──────────────────────────────────────

function LevelCSentences({ score, onScore }: { score: number | null | undefined; onScore: (n: number | null) => void }) {
  const allWords = LEVEL_C_SENTENCES.flatMap((s, si) => s.words.map((w, wi) => ({ word: w, sentIdx: si, wordIdx: wi, key: `${si}-${wi}` })))
  const [wordStatus, setWordStatus] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (score != null && !initialized) {
      const ws: Record<string, boolean> = {}
      let count = 0
      allWords.forEach(w => { if (count < score) { ws[w.key] = true; count++ } })
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [score, initialized])

  const toggle = (key: string) => {
    setWordStatus(prev => {
      const next = { ...prev, [key]: !prev[key] }
      const count = Object.values(next).filter(Boolean).length
      onScore(count)
      return next
    })
    setInitialized(true)
  }

  const correctCount = Object.values(wordStatus).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
        <p className="text-[11px] font-semibold text-blue-800">Say: "Read these sentences out loud. Try your best."</p>
        <p className="text-[10px] text-blue-600 mt-0.5">1 pt per word read correctly. Self-corrections count as correct. Tap each word.</p>
      </div>
      <div className="space-y-3">
        {LEVEL_C_SENTENCES.map((sent, si) => (
          <div key={si} className="flex items-center gap-2">
            <span className="text-[11px] text-text-tertiary font-bold w-5 shrink-0">{si + 1}.</span>
            <div className="flex gap-1.5 flex-wrap">
              {sent.words.map((word, wi) => {
                const key = `${si}-${wi}`
                return (
                  <button key={key} onClick={() => toggle(key)}
                    className={`px-3 py-2 rounded-lg text-[16px] font-serif transition-all ${
                      wordStatus[key] === true ? 'bg-green-100 text-green-800 border-2 border-green-400' :
                      wordStatus[key] === false ? 'bg-red-50 text-red-400 border-2 border-red-200 line-through' :
                      'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
                    }`}>
                    {word}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-[13px] font-bold ${correctCount >= 9 ? 'text-green-600' : correctCount >= 5 ? 'text-amber-600' : 'text-text-secondary'}`}>
          {correctCount}/11 correct
        </span>
        <div className="flex gap-2">
          <button onClick={() => { const ws: Record<string, boolean> = {}; allWords.forEach(w => { ws[w.key] = true }); setWordStatus(ws); onScore(11); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => { setWordStatus({}); onScore(0); setInitialized(true) }}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
      {correctCount >= 9 && <p className="text-[10px] text-blue-600 font-medium">If they can give you a full sentence, try them with Level D.</p>}
      {initialized && correctCount === 0 && <p className="text-[10px] text-amber-600 font-medium">Bump-down: Cannot read any words. Consider moving to Level B.</p>}
    </div>
  )
}

// ─── Level D/E/F: Passage reader (unchanged from original) ─────────────────

function LevelDEFPassage({ level, wordsRead, errors, timeSeconds, onUpdate }: {
  level: string; wordsRead: number | null | undefined; errors: number | null | undefined; timeSeconds: number | null | undefined;
  onUpdate: (field: string, val: number | null) => void
}) {
  const [showPassage, setShowPassage] = useState(false)
  const [wordMarks, setWordMarks] = useState<Record<number, 'error' | 'self_correct' | null>>({})
  const [lastWordIdx, setLastWordIdx] = useState<number | null>(null)
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [notes, setNotes] = useState('')
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const passage = LEVEL_TEST_PASSAGES[level]
  if (!passage) return null
  const words = passage.text.split(/\s+/)

  useEffect(() => {
    if (timing) {
      startRef.current = Date.now() - (elapsed * 1000)
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000))
      }, 100)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timing])

  const wRead = lastWordIdx !== null ? lastWordIdx + 1 : words.length
  const errCount = Object.entries(wordMarks).filter(([i, m]) => m === 'error' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const scCount = Object.entries(wordMarks).filter(([i, m]) => m === 'self_correct' && (lastWordIdx === null || Number(i) <= lastWordIdx)).length
  const t = elapsed || 1
  const cwpm = Math.round(((wRead - errCount) / t) * 60)
  const accuracy = wRead > 0 ? Math.round(((wRead - errCount) / wRead) * 1000) / 10 : 0
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleWordClick = (idx: number) => {
    if (lastWordIdx !== null && idx > lastWordIdx) return
    if (lastWordIdx === idx) { setLastWordIdx(null); return }

    const current = wordMarks[idx] || null
    if (current === null) {
      setWordMarks(prev => ({ ...prev, [idx]: 'error' }))
    } else if (current === 'error') {
      setWordMarks(prev => ({ ...prev, [idx]: 'self_correct' }))
    } else if (current === 'self_correct') {
      setWordMarks(prev => ({ ...prev, [idx]: null }))
      setLastWordIdx(idx)
    }
  }

  const handleSave = () => {
    onUpdate('o_orf_words_read', wRead)
    onUpdate('o_orf_errors', errCount)
    onUpdate('o_orf_time_seconds', elapsed > 0 && elapsed < 60 ? elapsed : null)
    setFinished(true)
    setTiming(false)
    setShowPassage(false)
  }

  const handleReset = () => {
    setWordMarks({})
    setLastWordIdx(null)
    setTiming(false)
    setElapsed(0)
    setFinished(false)
    setNotes('')
  }

  useEffect(() => {
    if (wordsRead != null && wordsRead > 0 && wordsRead < words.length && lastWordIdx === null && !showPassage) {
      setLastWordIdx(wordsRead - 1)
    }
  }, [wordsRead])

  const lines: { word: string; idx: number }[][] = []
  for (let i = 0; i < words.length; i += 10) {
    lines.push(words.slice(i, i + 10).map((w, j) => ({ word: w, idx: i + j })))
  }

  return (
    <>
      <button onClick={() => setShowPassage(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-all">
        <BookOpen size={14} /> {finished ? 'Done -- ' : ''}Open Passage: "{passage.title}" ({passage.wordCount} words)
      </button>

      {showPassage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowPassage(false)}>
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[850px] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
            <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-green-50 shrink-0">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">Passage {level}: {passage.title}</h3>
                <p className="text-[10px] text-text-secondary">{passage.wordCount} words</p>
              </div>
              <button onClick={() => setShowPassage(false)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
            </div>

            <div className="flex items-center justify-between px-6 py-2.5 bg-navy-dark text-white shrink-0">
              <div className="flex items-center gap-3">
                {!timing && !finished && (
                  <button onClick={() => { setTiming(true); setFinished(false) }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[12px] font-semibold">
                    Start
                  </button>
                )}
                {timing && (
                  <button onClick={() => { setTiming(false); setFinished(true) }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold animate-pulse">
                    Stop
                  </button>
                )}
                {finished && (
                  <button onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium">
                    Reset
                  </button>
                )}
                <span className="text-[24px] font-mono font-bold tabular-nums">{formatTime(elapsed)}</span>
              </div>
              <div className="flex items-center gap-5 text-[11px]">
                <div className="text-center"><div className="text-[18px] font-bold">{errCount}</div><div className="text-white/60 text-[8px] uppercase">Errors</div></div>
                <div className="text-center"><div className="text-[18px] font-bold">{scCount}</div><div className="text-white/60 text-[8px] uppercase">SC</div></div>
                <div className="text-center"><div className="text-[18px] font-bold text-gold">{elapsed > 0 ? cwpm : '--'}</div><div className="text-white/60 text-[8px] uppercase">CWPM</div></div>
                <div className="text-center"><div className={`text-[18px] font-bold ${accuracy >= 95 ? 'text-green-400' : accuracy >= 90 ? 'text-amber-400' : elapsed > 0 ? 'text-red-400' : ''}`}>{elapsed > 0 ? `${accuracy}%` : '--'}</div><div className="text-white/60 text-[8px] uppercase">Acc</div></div>
                <div className="text-center"><div className="text-[18px] font-bold">{wRead}/{words.length}</div><div className="text-white/60 text-[8px] uppercase">Words</div></div>
              </div>
            </div>

            <div className="px-6 py-1.5 bg-accent-light border-b border-border text-[10px] text-navy shrink-0">
              <strong>Click:</strong> 1x = <span className="text-red-600 font-bold">error</span> | 2x = <span className="text-amber-600 font-bold">self-correct</span> | 3x = <span className="text-red-600 font-bold">last word read</span> | 4x = reset
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {lastWordIdx !== null && (
                <div className="mb-3 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                  <span className="text-[11px] text-blue-800 font-medium">
                    Last word: "{words[lastWordIdx]}" -- <span className="font-bold">{lastWordIdx + 1}/{words.length}</span>
                    {lastWordIdx + 1 < words.length && <span className="text-blue-600 ml-1">(didn't finish)</span>}
                  </span>
                  <button onClick={() => setLastWordIdx(null)} className="text-[10px] text-red-500 hover:text-red-700">Clear</button>
                </div>
              )}
              <div className="leading-[2.8]">
                {lines.map((line, li) => (
                  <div key={li} className="flex flex-wrap gap-x-1 mb-1">
                    <span className="text-[8px] text-text-tertiary w-5 text-right mr-2 mt-2 shrink-0">{li * 10 + 1}</span>
                    {line.map(({ word, idx }) => {
                      const mark = wordMarks[idx] || null
                      const isPastLast = lastWordIdx !== null && idx > lastWordIdx
                      const isLastWord = lastWordIdx === idx
                      return (
                        <button key={idx} onClick={() => handleWordClick(idx)}
                          className={`px-1.5 py-1 rounded-lg text-[17px] font-serif font-medium transition-all select-none ${
                            isPastLast ? 'text-gray-300 border-2 border-transparent cursor-default' :
                            isLastWord ? 'bg-red-500 text-white border-2 border-red-600 ring-2 ring-red-300 font-bold' :
                            mark === 'error' ? 'bg-red-100 text-red-700 border-2 border-red-400 line-through decoration-2' :
                            mark === 'self_correct' ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' :
                            'hover:bg-surface-alt border-2 border-transparent text-text-primary'
                          }`} style={{ touchAction: 'manipulation' }}>
                          {word}
                          {mark === 'self_correct' && !isPastLast && <span className="text-[8px] align-super ml-0.5">SC</span>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-border bg-surface-alt/30 shrink-0 space-y-2">
              <input value={notes} onChange={(e: any) => setNotes(e.target.value)}
                placeholder="Quick notes (e.g. struggled with blends, good expression)..."
                className="w-full px-3 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-white" />
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-text-tertiary">
                  {elapsed > 0 && <>CWPM: <strong className="text-navy">{cwpm}</strong> | Accuracy: <strong className={accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}>{accuracy}%</strong> | </>}
                  Errors: <strong className="text-red-600">{errCount}</strong> | SC: <strong className="text-amber-600">{scCount}</strong>
                </div>
                <button onClick={handleSave}
                  className="px-5 py-2 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 transition-all">
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// ORAL TEST ENTRY MAIN
// ============================================================================

function OralTestEntry({ students, scores, updateScore, onSave, saving, selectedIdx, onSelectIdx, activeWave }: {
  students: Student[]
  scores: Record<string, G1Scores>
  updateScore: (sid: string, key: string, val: number | string | boolean | null) => void
  onSave: (sids: string[]) => Promise<void>
  saving: boolean
  selectedIdx: number
  onSelectIdx: (idx: number) => void
  activeWave: 1 | 2
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

  const getClassImpression = (sid: string): string | null => {
    const s = scores[sid] || {}
    return s.wave1_class_impression || null
  }

  // For Level A: compute per-question total
  const aTotal = (sc.o_a_q1 ?? 0) + (sc.o_a_q2 ?? 0) + (sc.o_a_q3 ?? 0) + (sc.o_a_q4 ?? 0) + (sc.o_a_q5 ?? 0)

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
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] truncate ${idx === selectedIdx ? 'font-semibold text-navy' : 'text-text-primary'}`}>
                    {s.english_name}
                  </p>
                  <p className="text-[10px] text-text-tertiary truncate">{s.korean_name}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getClassImpression(s.id) && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200" title="Wave 1 impression">
                      {getClassImpression(s.id)!.slice(0, 3)}
                    </span>
                  )}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: classToColor(s.english_class as EnglishClass), color: classToTextColor(s.english_class as EnglishClass) }}>
                    {s.english_class.slice(0, 3)}
                  </span>
                </div>
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

        {/* Section 1: Alphabet Recognition -- clickable grids */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 1: Alphabet Recognition</h4>
          <p className="text-[11px] text-text-secondary mb-4">Letters: s, a, t, m, p, i, n, d, o, g, c, e, k, j, x, y (16 letters)</p>
          <AlphabetGrids sc={sc} studentId={student.id} updateScore={updateScore} />
        </div>

        {/* Section 2: Phoneme Manipulation -- redesigned */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Component 2: Phoneme Manipulation</h4>
          <p className="text-[11px] text-text-secondary mb-4">Words: sun, map, leg, fish -- segmenting, counting, isolating sounds</p>
          <PhonemeManipulation sc={sc} studentId={student.id} updateScore={updateScore} />
        </div>

        {/* Section 3: Oral Reading Fluency -- Passage Level Selection */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-3">Component 3: Oral Reading Fluency</h4>

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

          {/* Level A: Per-question rubric scoring */}
          {passageLevel === 'A' && (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <p className="text-[11px] font-semibold text-blue-800">Say: "I'm going to ask you some questions. Just try your best."</p>
              </div>

              <div className="space-y-3">
                {LEVEL_A_QUESTIONS.map((q, qi) => {
                  const qKey = `o_a_q${qi + 1}` as keyof G1Scores
                  const qVal = (sc as any)[qKey] as number | null | undefined

                  return (
                    <div key={qi} className="bg-surface-alt/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-6 rounded-full bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center shrink-0">{qi + 1}</span>
                        <span className="text-[12px] font-medium text-text-primary">{q.q}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {LEVEL_A_RUBRIC.map(r => (
                          <button key={r.score} onClick={() => updateScore(student.id, qKey, qVal === r.score ? null : r.score)}
                            title={`${r.label}: ${r.desc}`}
                            className={`flex-1 px-2 py-2.5 rounded-xl text-center transition-all ${
                              qVal === r.score
                                ? r.score === 0 ? 'bg-red-500 text-white' :
                                  r.score === 1 ? 'bg-orange-500 text-white' :
                                  r.score === 2 ? 'bg-amber-500 text-white' :
                                  r.score === 3 ? 'bg-blue-500 text-white' :
                                  'bg-green-500 text-white'
                                : 'bg-surface text-text-secondary hover:bg-surface-alt border border-border'
                            }`}>
                            <div className="text-[14px] font-bold">{r.score}</div>
                            <div className={`text-[8px] mt-0.5 leading-tight ${qVal === r.score ? 'opacity-90' : 'text-text-tertiary'}`}>{r.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between bg-navy/5 rounded-xl px-4 py-3 border border-navy/10 mt-3">
                <span className="text-[13px] font-bold text-navy">Total: {aTotal} / 20</span>
                {aTotal >= 10 && <span className="text-[10px] text-blue-600 font-medium">Bump-up: Score is 10+. Try Level B.</span>}
                {aTotal > 0 && aTotal < 5 && <span className="text-[10px] text-red-600 font-medium">Very limited English production.</span>}
              </div>

              {/* Rubric reference */}
              <details className="mt-2">
                <summary className="text-[10px] text-purple-600 cursor-pointer hover:underline font-medium">View full rubric descriptions</summary>
                <div className="mt-2 space-y-1">
                  {LEVEL_A_RUBRIC.map(r => (
                    <div key={r.score} className="flex items-start gap-2 text-[10px] px-2 py-1">
                      <span className="w-5 h-5 rounded-lg bg-navy/10 text-navy font-bold flex items-center justify-center shrink-0">{r.score}</span>
                      <div><span className="font-semibold text-navy">{r.label}:</span> <span className="text-text-secondary">{r.desc}</span></div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {passageLevel === 'B' && (
            <LevelBWordGrid score={sc.o_orf_raw} onScore={(n: number | null) => updateScore(student.id, 'o_orf_raw', n)} />
          )}

          {passageLevel === 'C' && (
            <LevelCSentences score={sc.o_orf_raw} onScore={(n: number | null) => updateScore(student.id, 'o_orf_raw', n)} />
          )}

          {passageLevel && config?.hasCwpm && (
            <div className="space-y-4">
              <LevelDEFPassage
                level={passageLevel}
                wordsRead={sc.o_orf_words_read}
                errors={sc.o_orf_errors}
                timeSeconds={sc.o_orf_time_seconds}
                onUpdate={(field: string, val: number | null) => updateScore(student.id, field, val)}
              />

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

              {sc.o_orf_words_read != null && (
                <div className="bg-green-50 rounded-lg px-4 py-2.5 border border-green-100">
                  <span className="text-[11px] text-green-700 font-medium">
                    CWPM: {Math.round(((sc.o_orf_words_read - (sc.o_orf_errors ?? 0)) / (sc.o_orf_time_seconds || 60)) * 60)}
                    <span className="text-green-600/70 ml-2">(The app calculates weighted CWPM automatically)</span>
                  </span>
                </div>
              )}

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
            <p className="text-[11px] text-text-secondary mb-2">Ask after reading. Passage turned over.</p>
            <div className="bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <p className="text-[9px] text-amber-800 font-semibold mb-1">Scoring Guide</p>
              <div className="flex gap-4 text-[9px] text-amber-700">
                <span><span className="font-bold text-red-600">0</span> = No response, wrong, or Korean only</span>
                <span><span className="font-bold text-amber-600">1</span> = Partial, vague, or incomplete in English</span>
                <span><span className="font-bold text-green-600">2</span> = Correct and reasonably complete in English</span>
              </div>
            </div>
            <div className="space-y-3">
              {COMP_QUESTIONS[passageLevel]?.map((cq, qi) => {
                const key = `o_comp_q${qi + 1}` as keyof G1Scores
                const examples = COMP_SCORING_EXAMPLES[passageLevel]?.[qi]
                return (
                  <div key={qi}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-text-primary">
                          <span className="font-semibold text-navy">Q{qi + 1}</span>
                          <span className="text-text-tertiary ml-1 text-[10px]">[{cq.dok}]</span>
                          <span className="ml-2">{cq.q}</span>
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {[0, 1, 2].map(v => {
                          const titles = ['No response / wrong / Korean only', 'Partial or incomplete answer', 'Correct and complete']
                          return (
                            <button key={v} onClick={() => updateScore(student.id, key, (sc as any)[key] === v ? null : v)}
                              title={titles[v]}
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
                    {examples && (
                      <details className="ml-6 mt-1">
                        <summary className="text-[9px] text-purple-600 cursor-pointer hover:underline font-medium">Scoring examples</summary>
                        <div className="grid grid-cols-3 gap-2 mt-1.5 text-[9px]">
                          <div className="bg-red-50 rounded px-2 py-1.5"><span className="font-bold text-red-600">0:</span> <span className="text-red-800">{examples[0]}</span></div>
                          <div className="bg-amber-50 rounded px-2 py-1.5"><span className="font-bold text-amber-600">1:</span> <span className="text-amber-800">{examples[1]}</span></div>
                          <div className="bg-green-50 rounded px-2 py-1.5"><span className="font-bold text-green-600">2:</span> <span className="text-green-800">{examples[2]}</span></div>
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 5: Open Response */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Open Response (Picture Description)</h4>
          <p className="text-[11px] text-text-secondary mb-2">"Look at this picture. Tell me about it. What do you see?"</p>
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2 mb-3">
            <p className="text-[9px] text-blue-800 font-semibold mb-1">Scoring Guide</p>
            <div className="grid grid-cols-3 gap-x-3 gap-y-0.5 text-[9px] text-blue-700">
              <span><span className="font-bold">0</span> = No response / Korean only</span>
              <span><span className="font-bold">1</span> = Single English word</span>
              <span><span className="font-bold">2</span> = 2-3 words or a phrase</span>
              <span><span className="font-bold">3</span> = Simple sentence</span>
              <span><span className="font-bold">4</span> = 2+ sentences with detail</span>
              <span><span className="font-bold">5</span> = Fluent description with variety</span>
            </div>
          </div>
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

        {/* Section 6: Class Impression (no Teacher Rating for G1) */}
        <div className="bg-surface border border-border rounded-xl p-5 mb-4">
          <h4 className="text-[13px] font-semibold text-navy mb-1">Class Impression</h4>
          <p className="text-[11px] text-text-secondary mb-3">
            Which class do you think this student belongs in based on this oral test? Pick "Unsure" if you need the algorithm to decide.
          </p>

          <div className="rounded-lg p-3 mb-3 bg-blue-50/60 border border-blue-200/60">
            <div className="flex gap-1.5 flex-wrap">
              {ENGLISH_CLASSES.map(cls => (
                <button key={cls} onClick={() => updateScore(student.id, 'wave1_class_impression', sc.wave1_class_impression === cls ? null : cls)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    sc.wave1_class_impression === cls
                      ? 'text-white ring-2 ring-offset-1'
                      : 'border border-border hover:opacity-80'
                  }`}
                  style={sc.wave1_class_impression === cls
                    ? { backgroundColor: classToTextColor(cls), ringColor: classToTextColor(cls) }
                    : { backgroundColor: classToColor(cls), color: classToTextColor(cls) }
                  }>
                  {cls}
                </button>
              ))}
              <button onClick={() => updateScore(student.id, 'wave1_class_impression', sc.wave1_class_impression === 'Unsure' ? null : 'Unsure')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  sc.wave1_class_impression === 'Unsure'
                    ? 'bg-gray-600 text-white ring-2 ring-gray-400 ring-offset-1'
                    : 'bg-gray-100 text-text-secondary border border-border hover:bg-gray-200'
                }`}>
                Unsure
              </button>
            </div>
          </div>

          <textarea
            value={sc.teacher_notes || ''}
            onChange={e => updateScore(student.id, 'teacher_notes', e.target.value)}
            placeholder="Optional notes about this student's performance..."
            className="w-full px-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-16"
          />
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
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${metrics.wave === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
          {metrics.wave === 1 ? 'Wave 1: Oral + Teacher Impression' : 'Wave 2: 30% oral + 30% written + 40% teacher'}
        </span>
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

      {metrics.cwpm != null && (
        <div className="flex items-center gap-4 mb-3 text-[11px]">
          <span className="text-text-secondary">Passage {metrics.passageLevel}</span>
          <span className="text-navy font-semibold">Raw CWPM: {metrics.cwpm}</span>
          {metrics.weightedCwpm != null && <span className="text-text-secondary">Weighted: {metrics.weightedCwpm}</span>}
          {metrics.compTotal != null && <span className="text-text-secondary">Comp: {metrics.compTotal}/{metrics.compMax}</span>}
        </div>
      )}

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
// RESULTS VIEW - All Students Summary + Placement
// ============================================================================

function ResultsView({ students, scores, levelTest }: {
  students: Student[]
  scores: Record<string, G1Scores>
  levelTest: LevelTest
}) {
  const [sortBy, setSortBy] = useState<'composite' | 'name' | 'suggested'>('composite')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  const rows = useMemo(() => {
    return students.map(s => {
      const sc = scores[s.id] || {}
      const metrics = calculateG1Composite(sc)
      return { student: s, scores: sc, ...metrics }
    }).filter(r => r.scores.o_passage_level || r.scores.w_letter_names != null)
      .sort((a, b) => {
        if (sortBy === 'composite') return b.composite - a.composite
        if (sortBy === 'name') return a.student.english_name.localeCompare(b.student.english_name)
        if (sortBy === 'suggested') {
          const ai = ENGLISH_CLASSES.indexOf(a.suggestedClass)
          const bi = ENGLISH_CLASSES.indexOf(b.suggestedClass)
          return ai !== bi ? ai - bi : b.composite - a.composite
        }
        return 0
      })
  }, [students, scores, sortBy])

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    ENGLISH_CLASSES.forEach(c => counts[c] = 0)
    rows.forEach(r => counts[r.suggestedClass] = (counts[r.suggestedClass] || 0) + 1)
    return counts
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="px-10 py-12 text-center">
        <p className="text-text-tertiary">No scores entered yet. Complete the Oral test (Wave 1) or Written test (Wave 2) first.</p>
      </div>
    )
  }

  return (
    <div className="px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-navy">Results & Suggested Placement</h3>
          <p className="text-[12px] text-text-secondary mt-1">{rows.length} students scored. Wave 1 = 50% oral + 50% teacher impression. Wave 2 = 30% oral + 30% written + 40% teacher ratings.</p>
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface">
          <option value="composite">Sort by Composite (high to low)</option>
          <option value="name">Sort by Name</option>
          <option value="suggested">Sort by Suggested Class</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 mb-4">
        <p className="text-[11px] font-semibold text-text-secondary mb-2 uppercase tracking-wider">Suggested Class Distribution</p>
        <div className="flex gap-2">
          {ENGLISH_CLASSES.map(cls => (
            <div key={cls} className="flex-1 text-center">
              <div className="text-[18px] font-bold" style={{ color: classToColor(cls) }}>{classCounts[cls]}</div>
              <div className="text-[10px] font-medium px-2 py-0.5 rounded-full inline-block"
                style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                {cls}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">#</th>
              <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Student</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Passage</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Written<br/>/30</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">CWPM</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Comp</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Oral</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-navy font-bold">Composite</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Suggested</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-amber-700 font-semibold">W1 Impression</th>
              <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Standards</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const writtenRaw = WRITTEN_SECTIONS.map(s => (row.scores as any)[s.key] ?? 0).reduce((a: number, b: number) => a + b, 0)
              const metCount = row.standardsBaseline.filter(s => s.met).length
              const expanded = expandedStudent === row.student.id

              return (<>
                <tr key={row.student.id}
                  onClick={() => setExpandedStudent(expanded ? null : row.student.id)}
                  className={`border-t border-border cursor-pointer transition-colors ${idx % 2 === 0 ? '' : 'bg-surface-alt/30'} hover:bg-blue-50/50`}>
                  <td className="px-4 py-2.5 text-text-tertiary">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ backgroundColor: classToColor(row.student.english_class as EnglishClass), color: classToTextColor(row.student.english_class as EnglishClass) }}>
                        {row.student.english_class.slice(0, 3)}
                      </span>
                      <span className="font-medium text-navy">{row.student.english_name}</span>
                      <span className="text-text-tertiary">{row.student.korean_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className="font-bold text-navy">{row.passageLevel}</span>
                  </td>
                  <td className="text-center px-3 py-2.5">{writtenRaw}</td>
                  <td className="text-center px-3 py-2.5">{row.cwpm ?? '--'}</td>
                  <td className="text-center px-3 py-2.5">{row.compTotal != null ? `${row.compTotal}/${row.compMax}` : '--'}</td>
                  <td className="text-center px-3 py-2.5">{Math.round(row.oralScore)}</td>
                  <td className="text-center px-3 py-2.5">
                    <span className={`text-[13px] font-bold ${
                      row.composite >= 70 ? 'text-green-600' : row.composite >= 40 ? 'text-amber-600' : 'text-red-600'
                    }`}>{Math.round(row.composite)}</span>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: classToColor(row.suggestedClass), color: classToTextColor(row.suggestedClass) }}>
                      {row.suggestedClass}
                    </span>
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {row.scores.wave1_class_impression ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border-2 border-amber-300"
                        style={{ backgroundColor: classToColor(row.scores.wave1_class_impression as EnglishClass), color: classToTextColor(row.scores.wave1_class_impression as EnglishClass) }}>
                        {row.scores.wave1_class_impression}
                      </span>
                    ) : <span className="text-text-tertiary text-[10px]">--</span>}
                  </td>
                  <td className="text-center px-3 py-2.5 relative group">
                    <span className={`text-[11px] font-medium cursor-help ${metCount >= 8 ? 'text-green-600' : metCount >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {metCount}/{row.standardsBaseline.length}
                    </span>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white border border-border rounded-xl shadow-xl p-3 z-50 text-left">
                      <p className="text-[10px] font-bold text-navy mb-1.5">Standards Baseline</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {row.standardsBaseline.map((std: any) => (
                          <div key={std.code} className="flex items-center gap-1.5 text-[9px]">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${std.met ? 'bg-green-500' : 'bg-red-400'}`} />
                            <span className={`font-semibold ${std.met ? 'text-green-700' : 'text-red-600'}`}>{std.code}</span>
                            <span className="text-text-tertiary">{std.score}/{std.threshold}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={11} className="px-4 py-4 bg-blue-50/50 border-t border-blue-200">
                      <div className="max-w-4xl">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-[13px] font-bold text-navy">Leveling Dossier: {row.student.english_name}</h4>
                          <span className="text-[10px] text-text-tertiary">{row.student.korean_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: classToColor(row.student.english_class as EnglishClass), color: classToTextColor(row.student.english_class as EnglishClass) }}>
                            Current: {row.student.english_class}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-1"
                            style={{ backgroundColor: classToColor(row.suggestedClass), color: classToTextColor(row.suggestedClass) }}>
                            Suggested: {row.suggestedClass}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Written Test</p>
                            {WRITTEN_SECTIONS.map(sec => {
                              const val = (row.scores as any)[sec.key] ?? 0
                              const pct = sec.max > 0 ? (val / sec.max) * 100 : 0
                              return (
                                <div key={sec.key} className="flex items-center justify-between text-[10px] py-0.5">
                                  <span className="text-text-secondary">{sec.label}</span>
                                  <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{val}/{sec.max}</span>
                                </div>
                              )
                            })}
                          </div>
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Oral / Reading</p>
                            <div className="space-y-1 text-[10px]">
                              <div className="flex justify-between"><span className="text-text-secondary">Passage Level</span><span className="font-bold text-navy">{row.passageLevel}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">CWPM</span><span className="font-bold">{row.cwpm ?? '--'}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">Comprehension</span><span className="font-bold">{row.compTotal != null ? `${row.compTotal}/${row.compMax}` : '--'}</span></div>
                              <div className="flex justify-between"><span className="text-text-secondary">Oral Score</span><span className="font-bold">{Math.round(row.oralScore)}</span></div>
                              <div className="flex justify-between border-t border-border pt-1 mt-1"><span className="text-text-secondary font-semibold">Composite</span><span className={`font-extrabold text-[12px] ${row.composite >= 70 ? 'text-green-600' : row.composite >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(row.composite)}</span></div>
                            </div>
                          </div>
                          <div className="bg-white rounded-lg border border-border p-3">
                            <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">Standards ({metCount}/{row.standardsBaseline.length} met)</p>
                            <div className="space-y-0.5 max-h-32 overflow-y-auto">
                              {row.standardsBaseline.map((std: any) => (
                                <div key={std.code} className="flex items-center gap-1.5 text-[9px]">
                                  <span className={`text-[10px] ${std.met ? 'text-green-600' : 'text-red-500'}`}>{std.met ? 'Met' : 'X'}</span>
                                  <span className="font-semibold text-navy">{std.code}</span>
                                  <span className="text-text-tertiary ml-auto">{std.score}/{std.threshold}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>)
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-surface border border-border rounded-xl p-5">
        <h4 className="text-[12px] font-semibold text-navy mb-3">Placement Band Descriptions</h4>
        <div className="grid grid-cols-3 gap-3">
          {([
            ['Lily', 'Pre-reader / minimal English. Passage A. Building letter recognition.'],
            ['Camellia', 'Emerging letter knowledge, some sight words. Passage A-B.'],
            ['Daisy', 'Solid letter knowledge, beginning reader. Passage B-C.'],
            ['Sunflower', 'Reading simple connected text. Passage C-D.'],
            ['Marigold', 'Reading with developing fluency. Passage D-E. CWPM 15-35.'],
            ['Snapdragon', 'Fluent reader, strong comprehension. Passage E-F. CWPM 30+.'],
          ] as [EnglishClass, string][]).map(([cls, desc]) => (
            <div key={cls} className="flex items-start gap-2 text-[11px]">
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 mt-0.5"
                style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                {cls}
              </span>
              <span className="text-text-secondary">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// EXPORTS for use in LevelingView
// ============================================================================

export default Grade1ScoreEntry
export { calculateG1Composite, suggestG1Class, ResultsView as G1ResultsView, WRITTEN_SECTIONS, PASSAGE_CONFIGS, STANDARDS_BASELINE, NAEP_MULTIPLIERS }
export type { G1Scores, PassageLevel }
