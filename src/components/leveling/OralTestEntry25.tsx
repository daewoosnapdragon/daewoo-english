'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { Student, EnglishClass, ENGLISH_CLASSES, LevelTest } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  Save, Loader2, ChevronLeft, ChevronRight, BookOpen, Clock,
  CheckCircle2, Circle, X, Info, RotateCcw, Play, Pause, Square, Mic, Trash2, Ban
} from 'lucide-react'
import { g2ContentForTest, G2Content } from './grade2Content'
import { g3ContentForTest, G3Content } from './grade3Content'
import { g4ContentForTest, G4Content } from './grade4Content'
import { g5ContentForTest, G5Content } from './grade5Content'
import { FRUSTRATION_ACCURACY, INDEPENDENT_ACCURACY } from './grade2Band'
import TestNotesPanel from './TestNotesPanel'
import { ORAL_TEST_NOTES, STOPPING_NOTES } from './testNotes'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Legacy passages run A-E. The Fall 2026 Grade 2 test adds F, so anything that
// indexes a passage map is keyed by the wider union and the level list itself
// comes from the resolved content.
type PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

/** A phonics row as the grid renders it, whichever version supplied it. */
interface PhonicsRowView { label: string; words: string[]; max: number }
/** A sentence as the grid renders it. `focus` is the phonics pattern shown. */
interface SentenceView { text: string; max: number; focus: string }

interface PassageData {
  title: string
  text: string
  wordCount: number
  lexile: string
  genre?: string
}

interface CompQuestion {
  q: string
  expected: string
  dok: string
  /** Per-score anchors, index = score. Supplied from Fall 2026 on. */
  anchors?: string[]
  /** Guidance the guide attaches to this specific question. */
  note?: string
}

/** The per-grade passage data baked into this file (the legacy test). */
interface GradeTestData {
  hasPhonics: boolean
  hasSentences: boolean
  /** Partial: the legacy configs stop at E, the Fall 2026 Grade 2 test adds F. */
  passages: Partial<Record<PassageLevel, PassageData>>
  comprehension: Partial<Record<PassageLevel, CompQuestion[]>>
  naepLevels: PassageLevel[] // which levels get NAEP rating
}

/**
 * What the screen actually renders against. Built by `resolveConfig` from
 * either the legacy data above or an authored Grade 2 content version, so the
 * component never branches on which test it is scoring.
 */
interface GradeTestConfig extends GradeTestData {
  /** Levels offered on the selector, in order. */
  levels: PassageLevel[]
  /** Highest score a single comprehension question can earn. */
  compScoreMax: number
  /** Total comprehension points available. */
  compMax: number
  phonicsRows: PhonicsRowView[]
  phonicsMax: number
  sentences: SentenceView[]
  sentenceMax: number
  /** Fall 2026 Grade 2 only; legacy tests have no syllable component. */
  syllables: { key: string; word: string; answer: number }[] | null
  syllableMax: number
  /** Passage difficulty weights, keyed by level. */
  passageMultipliers: Record<string, number>
  /** Teacher-facing scripts, where the content version supplies them. */
  scripts: { phonics?: string; syllables?: string; sentences?: string; reading?: string }
  /** Administration cautions from the grade's guide. Empty on legacy tests. */
  adminNotes: string[]
  /**
   * The guide's Independent / Instructional / Frustration table. Shown at the
   * top of the passage reader so the teacher can read the live accuracy
   * against the band without leaving the modal.
   */
  readingLevels: { level: string; accuracy: string; comprehension?: string; action: string }[]
  /**
   * Comprehension score at the top of the Frustration band, out of compMax.
   * Stored on the score so a comprehension that was never administered can be
   * ranked at the bottom band rather than dropped from the composite.
   */
  frustrationCompMax: number | null
  /** Null on legacy tests, which are scored against this file's constants. */
  contentLabel: string | null
}

// Scores stored per student
interface OralScores {
  // Phonics (Grade 2 only)
  phonics_row1?: number | null
  phonics_row2?: number | null
  phonics_row3?: number | null
  phonics_row4?: number | null
  phonics_row5?: number | null
  // Sentences (Grade 2 only)
  sent_1?: number | null
  sent_2?: number | null
  sent_3?: number | null
  sent_4?: number | null
  sent_5?: number | null
  // Passage selection
  passage_level?: string | null
  // ORF data
  /**
   * Which word got which mark, so reopening the passage shows the reading as
   * it was left. Without it a teacher who closes the modal -- for a long break,
   * or by accident -- comes back to a clean passage, and saving again writes
   * the error count back as zero over a real one.
   */
  orf_word_marks?: Record<number, 'error' | 'self_correct' | null> | null
  orf_words_read?: number | null
  orf_errors?: number | null
  orf_time_seconds?: number | null
  orf_cwpm?: number | null
  orf_accuracy?: number | null
  // NAEP
  naep?: number | null
  /**
   * The student was stopped during the passage, so the comprehension questions
   * were never asked. Distinct from scoring them 0: comprehension is excluded
   * from the totals and rendered as "not administered" rather than a zero.
   */
  comp_not_administered?: boolean | null
  // Comprehension (0-3 per question)
  comp_1?: number | null
  comp_2?: number | null
  comp_3?: number | null
  comp_4?: number | null
  comp_5?: number | null
  // Teacher notes
  notes?: string | null
  // `passages_attempted` and `orf_word_marks` are objects, so the catch-all has
  // to allow one -- everything here is written straight to a JSONB column.
  [key: string]: number | string | boolean | null | undefined | Record<string, any> | any[]
}

/**
 * Compare score records by content rather than by key order.
 *
 * Postgres hands JSONB back in its own key order, so a row read from the
 * database never stringifies the same way as the object this screen sent, even
 * when the two hold identical scores. Plain JSON.stringify therefore reads
 * every refreshed row as "different" and every refresh as "something changed".
 */
function sameScores(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

function stableStringify(v: any): string {
  if (v === null || v === undefined || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']'
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}'
}

// ============================================================================
// NAEP SCALE
// ============================================================================

const NAEP_LABELS: Record<number, { label: string; desc: string }> = {
  1: { label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words.' },
  2: { label: 'Choppy phrases', desc: 'Reads in short, 2-word phrases. Some pauses in awkward places. Little expression.' },
  3: { label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression.' },
  4: { label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation.' },
}

const NAEP_MULTIPLIERS: Record<number, number> = { 1: 0.85, 2: 0.95, 3: 1.0, 4: 1.1 }

// Passage difficulty multiplier: C = baseline (1.0), lower = easier, higher = harder
export const PASSAGE_MULTIPLIERS: Record<string, number> = { A: 0.70, B: 0.85, C: 1.00, D: 1.15, E: 1.30 }

// ============================================================================
// CCSS STANDARDS BY GRADE — from teacher guides
// ============================================================================

interface CcssStandard {
  code: string
  domain: string
  description: string
  testSection: string // which score key maps to this
  masteryThreshold: number
}

const CCSS_STANDARDS: Record<number, CcssStandard[]> = {
  2: [
    // Phonics / Word Reading
    { code: 'RF.K.3a', domain: 'Phonics', description: 'Letter-sound correspondences for consonants', testSection: 'phonics_row1', masteryThreshold: 4 },
    { code: 'RF.K.3b', domain: 'Phonics', description: 'Associate long and short sounds with common vowel spellings', testSection: 'phonics_row1', masteryThreshold: 4 },
    { code: 'RF.1.3a', domain: 'Phonics', description: 'Know spelling-sound correspondences for common consonant digraphs', testSection: 'phonics_row3', masteryThreshold: 4 },
    { code: 'RF.1.3c', domain: 'Phonics', description: 'Know final -e and common vowel team conventions', testSection: 'phonics_row4', masteryThreshold: 4 },
    { code: 'RF.2.3', domain: 'Phonics', description: 'Know and apply grade-level phonics and word analysis skills', testSection: 'phonics_row5', masteryThreshold: 3 },
    // Fluency
    { code: 'RF.2.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.2.4b', domain: 'Fluency', description: 'Read grade-level text orally with accuracy, appropriate rate, and expression', testSection: 'naep', masteryThreshold: 3 },
    // Comprehension DOK 1
    { code: 'RL/RI.K.1', domain: 'Comprehension', description: 'With prompting, ask and answer questions about key details', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RL/RI.1.1', domain: 'Comprehension', description: 'Ask and answer questions about key details', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RL/RI.2.1', domain: 'Comprehension', description: 'Ask and answer who, what, where, when, why, and how questions', testSection: 'comp_dok1', masteryThreshold: 2 },
    // Comprehension DOK 2
    { code: 'RL/RI.2.3', domain: 'Comprehension', description: 'Describe how characters respond to major events and challenges', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.2.6', domain: 'Comprehension', description: 'Identify the main purpose of a text', testSection: 'comp_dok2', masteryThreshold: 2 },
    // Speaking/Listening DOK 3
    { code: 'SL.K.2', domain: 'Speaking/Listening', description: 'Confirm understanding of a text read aloud', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.2.2', domain: 'Speaking/Listening', description: 'Recount or describe key ideas and details', testSection: 'comp_dok3', masteryThreshold: 1 },
  ],
  3: [
    // Fluency
    { code: 'RF.1.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 2 },
    { code: 'RF.2.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.3.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.3.4b', domain: 'Fluency', description: 'Read grade-level prose and poetry orally with accuracy, appropriate rate, and expression', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.3.4c', domain: 'Fluency', description: 'Use context to confirm or self-correct word recognition and understanding', testSection: 'naep', masteryThreshold: 3 },
    // Comprehension DOK 1
    { code: 'RL/RI.1.1', domain: 'Comprehension', description: 'Ask and answer questions about key details', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RL/RI.2.1', domain: 'Comprehension', description: 'Ask and answer who, what, where, when, why, and how questions', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RL/RI.3.1', domain: 'Comprehension', description: 'Ask and answer questions, referring explicitly to the text', testSection: 'comp_dok1', masteryThreshold: 2 },
    // Comprehension DOK 2
    { code: 'RI.1.3', domain: 'Comprehension', description: 'Describe connection between individuals, events, ideas, or information', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL/RI.2.3', domain: 'Comprehension', description: 'Describe how characters respond to major events and challenges', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL.3.2', domain: 'Comprehension', description: 'Recount stories and determine central message, lesson, or moral', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.3.3', domain: 'Comprehension', description: 'Describe relationship between historical events, scientific ideas, or steps', testSection: 'comp_dok2', masteryThreshold: 2 },
    // Speaking/Listening DOK 3
    { code: 'SL.1.2', domain: 'Speaking/Listening', description: 'Ask and answer questions about key details in a text read aloud', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.2.4', domain: 'Speaking/Listening', description: 'Tell a story or recount an experience with appropriate facts and detail', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.3.1d', domain: 'Speaking/Listening', description: 'Explain their own ideas and understanding in light of the discussion', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.3.4', domain: 'Speaking/Listening', description: 'Report on a topic with appropriate facts and relevant details', testSection: 'comp_dok3', masteryThreshold: 1 },
  ],
  4: [
    // Fluency
    { code: 'RF.2.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 2 },
    { code: 'RF.3.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.4.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.4.4b', domain: 'Fluency', description: 'Read grade-level prose and poetry orally with accuracy, appropriate rate, and expression', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.4.4c', domain: 'Fluency', description: 'Use context to confirm or self-correct, rereading as necessary', testSection: 'naep', masteryThreshold: 3 },
    // Comprehension DOK 1
    { code: 'RI.2.3', domain: 'Comprehension', description: 'Describe connection between events, ideas, or steps', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RI.2.6', domain: 'Comprehension', description: 'Identify the main purpose of a text', testSection: 'comp_dok1', masteryThreshold: 2 },
    // Comprehension DOK 2
    { code: 'RL.3.2', domain: 'Comprehension', description: 'Recount stories and determine central message, lesson, or moral', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL/RI.3.3', domain: 'Comprehension', description: 'Describe characters and explain how their actions contribute to events', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL.4.2', domain: 'Comprehension', description: 'Determine a theme from details in the text', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL.4.3', domain: 'Comprehension', description: 'Describe in depth a character, setting, or event using specific details', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.4.3', domain: 'Comprehension', description: 'Explain events, ideas, or concepts based on specific information', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.4.5', domain: 'Comprehension', description: 'Describe overall structure of events, ideas, concepts, or information', testSection: 'comp_dok2', masteryThreshold: 2 },
    // Speaking/Listening DOK 3
    { code: 'SL.3.1d', domain: 'Speaking/Listening', description: 'Explain their own ideas and understanding in light of the discussion', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.4.1d', domain: 'Speaking/Listening', description: 'Review key ideas expressed and explain own ideas', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.4.4', domain: 'Speaking/Listening', description: 'Report on a topic using appropriate facts and relevant details', testSection: 'comp_dok3', masteryThreshold: 1 },
  ],
  5: [
    // Fluency (uses same RF.4 standards since RF stops at grade 5)
    { code: 'RF.4.4a', domain: 'Fluency', description: 'Read grade-level text with purpose and understanding', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.4.4b', domain: 'Fluency', description: 'Read grade-level prose and poetry orally with accuracy, appropriate rate, and expression', testSection: 'naep', masteryThreshold: 3 },
    { code: 'RF.4.4c', domain: 'Fluency', description: 'Use context to confirm or self-correct, rereading as necessary', testSection: 'naep', masteryThreshold: 3 },
    // Comprehension DOK 1
    { code: 'RL/RI.4.1', domain: 'Comprehension', description: 'Refer to details and examples when explaining and drawing inferences', testSection: 'comp_dok1', masteryThreshold: 2 },
    { code: 'RL/RI.5.1', domain: 'Comprehension', description: 'Quote accurately from a text when explaining and drawing inferences', testSection: 'comp_dok1', masteryThreshold: 2 },
    // Comprehension DOK 2
    { code: 'RL.4.2', domain: 'Comprehension', description: 'Determine a theme from details in the text', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RL.5.2', domain: 'Comprehension', description: 'Determine a theme and summarize the text', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.4.3', domain: 'Comprehension', description: 'Explain events, ideas, or concepts based on specific information', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.5.3', domain: 'Comprehension', description: 'Explain relationships or interactions based on specific information', testSection: 'comp_dok2', masteryThreshold: 2 },
    { code: 'RI.5.5', domain: 'Comprehension', description: 'Compare and contrast overall structure of events, ideas, concepts', testSection: 'comp_dok2', masteryThreshold: 2 },
    // Speaking/Listening DOK 3
    { code: 'SL.4.1d', domain: 'Speaking/Listening', description: 'Review key ideas expressed and explain own ideas', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.5.1d', domain: 'Speaking/Listening', description: 'Review key ideas and draw conclusions in light of discussion', testSection: 'comp_dok3', masteryThreshold: 1 },
    { code: 'SL.5.4', domain: 'Speaking/Listening', description: 'Report on a topic sequencing ideas logically with relevant facts', testSection: 'comp_dok3', masteryThreshold: 1 },
  ],
}

/**
 * Standards mastery for a test with authored content.
 *
 * The legacy thresholds below are calibrated to the old scales -- comprehension
 * out of 3 per question, phonics rows out of 5. Reading a Fall 2026 score
 * against them would silently move the bar (a comprehension threshold of 2 is
 * moderate out of 3 but full credit out of 2), so a version that ships its own
 * baseline is scored against that instead.
 */
function calculateVersionedStandards(
  standards: { code: string; testSection: string; masteryThreshold: number }[],
  sc: OralScores,
  config: GradeTestConfig,
): { code: string; met: boolean; score: number; threshold: number }[] {
  const compSkipped = !!sc.comp_not_administered
  const num = (v: unknown) => (typeof v === 'number' ? v : 0)
  const compSum = [sc.comp_1, sc.comp_2, sc.comp_3, sc.comp_4, sc.comp_5].reduce((a: number, b) => a + num(b), 0)
  const totals: Record<string, number | null> = {
    o_g2_phonics: config.phonicsRows.reduce((a, _, i) => a + num(sc[`phonics_row${i + 1}`]), 0),
    o_g2_syllables: config.syllables ? config.syllables.reduce((a, w) => a + num(sc[w.key]), 0) : 0,
    o_g2_sentences: config.sentences.reduce((a, _, i) => a + num(sc[`sent_${i + 1}`]), 0),
    // Comprehension never asked cannot show mastery either way.
    o_g2_comp: compSkipped ? null : compSum,
    o_g2_naep: num(sc.naep),
    o_g3_comp: compSkipped ? null : compSum,
    o_g3_naep: num(sc.naep),
    o_g4_comp: compSkipped ? null : compSum,
    o_g4_naep: num(sc.naep),
    o_g5_comp: compSkipped ? null : compSum,
    o_g5_naep: num(sc.naep),
  }
  return standards
    .filter(std => std.testSection in totals)
    .filter(std => totals[std.testSection] !== null)
    .map(std => {
      const score = totals[std.testSection] as number
      return { code: std.code, met: score >= std.masteryThreshold, score, threshold: std.masteryThreshold }
    })
}

// Calculate standards mastery from scores
function calculateStandards(grade: number, sc: OralScores): { code: string; met: boolean; score: number; threshold: number }[] {
  const standards = CCSS_STANDARDS[grade] || []
  // Comprehension questions that were never asked cannot show mastery either
  // way, so the comprehension standards are dropped rather than scored 0.
  const compSkipped = !!sc.comp_not_administered
  return standards.filter(std => !(compSkipped && std.testSection.startsWith('comp_dok'))).map(std => {
    let score = 0
    if (std.testSection === 'naep') {
      score = (sc.naep as number) || 0
    } else if (std.testSection.startsWith('phonics_row')) {
      score = (sc[std.testSection] as number) || 0
    } else if (std.testSection === 'comp_dok1') {
      // Average of DOK 1 questions (Q1, Q2 — typically first two)
      score = Math.max((sc.comp_1 as number) || 0, (sc.comp_2 as number) || 0)
    } else if (std.testSection === 'comp_dok2') {
      // Average of DOK 2 questions (Q3, Q4)
      score = Math.max((sc.comp_3 as number) || 0, (sc.comp_4 as number) || 0)
    } else if (std.testSection === 'comp_dok3') {
      // Open question (Q5)
      score = (sc.comp_5 as number) || 0
    }
    return { code: std.code, met: score >= std.masteryThreshold, score, threshold: std.masteryThreshold }
  })
}

// ============================================================================
// GRADE 2 PHONICS SCREENER
// ============================================================================

const PHONICS_ROWS = [
  { label: 'Row 1: CVC', words: ['hat', 'bed', 'pin', 'dot', 'bus'] },
  { label: 'Row 2: Blends', words: ['trap', 'sled', 'swim', 'crisp', 'stomp'] },
  { label: 'Row 3: Digraphs', words: ['ship', 'chat', 'thin', 'whip', 'much'] },
  { label: 'Row 4: CVCe', words: ['cake', 'ride', 'home', 'cute', 'flame'] },
  { label: 'Row 5: Vowel Teams', words: ['rain', 'feet', 'boat', 'loud', 'coin'] },
]

const SENTENCES = [
  { text: 'The man is mad at his pet.', max: 7, level: 'CVC / short vowel' },
  { text: 'Beth will rush on the path.', max: 6, level: 'Blends + digraphs' },
  { text: 'Did Stan spill his milk?', max: 5, level: 'Blends + clusters' },
  { text: 'Kate ate the ripe grapes in the shade.', max: 8, level: 'CVCe + long vowels' },
  { text: 'I found a new blue blouse in my room.', max: 9, level: 'Diphthongs + vowel teams' },
]

// ============================================================================
// PASSAGE DATA — ALL GRADES
// ============================================================================

const GRADE_CONFIGS: Record<number, GradeTestData> = {
  2: {
    hasPhonics: true,
    hasSentences: true,
    naepLevels: ['A', 'B', 'C', 'D', 'E'],
    passages: {
      A: {
        title: 'My Pets', lexile: 'BR80L', wordCount: 43, genre: 'Nonfiction',
        text: 'I have a cat. My cat is big and black. She can run fast. She likes to nap on my bed. I have a dog, too. My dog is small and white. He likes to dig in the mud. I love my pets!',
      },
      B: {
        title: 'My Room', lexile: '~50L', wordCount: 61, genre: 'Fiction',
        text: 'I have a big room. My bed is next to the wall. I have a red rug on the floor. My toys are in a box. I like to play in my room. Sometimes I read a book on my bed. My mom says, "Clean up!" I put my toys back in the box. Now my room is nice and clean.',
      },
      C: {
        title: 'What Day Is It?', lexile: '230L', wordCount: 67, genre: 'Fiction',
        text: 'What day is it? There are red, blue, green, and yellow hats. Boys and girls are playing games. They are playing hide-and-seek. Red, blue, green, and yellow balloons are on the trees. There are big and small boxes with bows of many colors. We are eating yellow cake. Do you know what day it is? It is a very special day. It is my birthday!',
      },
      D: {
        title: 'How to Make Pizza', lexile: '370L', wordCount: 87, genre: 'Nonfiction',
        text: 'This is how to make a great pizza. First, put some flour, water, salt, and olive oil in a bowl. Next, mix them together to make the dough. Then, roll out the dough to make a big, flat circle. Next, put tomato sauce all over the dough. Then put on some meat. Do not forget to put on lots of cheese! You can put other things on top, too. Bake your pizza for twenty minutes. Take it out and let it cool. Now you can eat your pizza.',
      },
      E: {
        title: 'Turtles', lexile: '450L', wordCount: 106, genre: 'Nonfiction',
        text: 'Turtles are very old animals. They have lived on Earth for a long time. Some turtles live in the ocean. They swim far to find food. Other turtles live on land. They walk slowly and carry their shell on their back. The shell keeps them safe. When a turtle is scared, it hides inside the shell. Baby turtles come from eggs. The mother puts her eggs in the sand. When the babies come out, they walk to the water by themselves. It is hard for the tiny babies because the water is far away. Many people help keep turtles safe so they can live for a long time.',
      },
    },
    comprehension: {
      A: [
        { q: 'What color is the cat?', expected: 'Big and black / black', dok: 'DOK 1' },
        { q: 'Where does the cat like to nap?', expected: 'On my/the bed', dok: 'DOK 1' },
        { q: 'What does the dog like to do?', expected: 'Dig in the mud', dok: 'DOK 1' },
        { q: 'How are the cat and the dog different?', expected: 'Cat is big/black, dog is small/white; one digs, one naps (any difference)', dok: 'DOK 2' },
        { q: 'Which pet would you want? Why?', expected: '(Open - any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'Where is the bed?', expected: 'Next to the wall', dok: 'DOK 1' },
        { q: 'What color is the rug?', expected: 'Red', dok: 'DOK 1' },
        { q: 'Where does the child put the toys?', expected: 'In the/a box', dok: 'DOK 1' },
        { q: 'Why does the child clean up the room?', expected: '(Inference: mom says to / mom tells them to)', dok: 'DOK 2' },
        { q: 'What is your favorite thing in your room? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'What are the kids playing?', expected: 'Games / hide-and-seek', dok: 'DOK 1' },
        { q: 'What are they eating?', expected: 'Yellow cake', dok: 'DOK 1' },
        { q: 'What clues tell you it is a birthday?', expected: 'Hats, balloons, boxes with bows, cake (any 2+)', dok: 'DOK 2' },
        { q: 'How do you think the person feels? Why?', expected: 'Happy/excited because it\'s their birthday, they have a party', dok: 'DOK 2' },
        { q: 'What would you do at this party?', expected: '(Open - personal connection with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'What do you need to make the dough?', expected: 'Flour, water, salt, and olive oil', dok: 'DOK 1' },
        { q: 'How long do you bake the pizza?', expected: 'Twenty minutes', dok: 'DOK 1' },
        { q: 'What do you do right after you roll out the dough?', expected: 'Put tomato sauce all over it', dok: 'DOK 2' },
        { q: 'Why does the story say to let the pizza cool?', expected: '(Inference: it\'s hot from the oven / you could burn yourself)', dok: 'DOK 2' },
        { q: 'What toppings would you put on your pizza? Why?', expected: '(Open - personal preference with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'Where do some turtles live?', expected: 'In the ocean / on land (either or both)', dok: 'DOK 1' },
        { q: 'What does a turtle do when it is scared?', expected: 'Hides inside its shell', dok: 'DOK 1' },
        { q: 'How are ocean turtles and land turtles different?', expected: 'Ocean turtles swim, land turtles walk slowly / one in water, one on land', dok: 'DOK 2' },
        { q: 'Why is it hard for baby turtles to get to the water?', expected: '(Inference: they are tiny, the water is far away, they are alone)', dok: 'DOK 2' },
        { q: 'Why do you think people help turtles? Do you think it is important?', expected: '(Open - evaluate: turtles are old/special, babies in danger, animals need help)', dok: 'Open' },
      ],
    },
  },

  3: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['A', 'B', 'C', 'D', 'E'],
    passages: {
      A: {
        title: 'My Pet Cat', lexile: '120L', wordCount: 82, genre: 'Fiction',
        text: 'I have a pet cat. My cat is soft and small. She has big green eyes. She likes to sit on my lap. I pet her, and she purrs. My cat likes to play. She runs and jumps a lot. She plays with a red ball. Sometimes she hides under the bed. I look for her, but she is fast! At night, my cat sleeps on my bed. She curls up next to me. I love my cat. She is my best friend.',
      },
      B: {
        title: 'Baseball', lexile: '270L', wordCount: 96, genre: 'Nonfiction',
        text: 'Go and see a baseball game. It is played with a bat and a ball. There are nine players on a team. There are two teams. One team throws the ball. A player from the other team tries to hit the ball. If the player hits the ball, he runs. He tries to run to home base. His team gets one run if he makes it. The other team tries to tag him. If the runner is tagged, he is out. The team with the most runs wins. Baseball can be a fun game to play!',
      },
      C: {
        title: 'Basketball', lexile: '330L', wordCount: 111, genre: 'Nonfiction',
        text: 'Many people like the game of basketball. Players need basketball nets and a court to play. There are two nets on a court. There are five players on a team. Two teams play each other. Players also need a large ball. The ball is orange or brown. Players try to put the ball in the other team\'s net. Sometimes they run with the ball. Sometimes they catch the ball. If they put the ball in the net when they are close to it, they get two points. If they are far from the net, they get three points. The team with the most points wins. Would you like to play basketball?',
      },
      D: {
        title: 'Mars', lexile: '440L', wordCount: 100, genre: 'Nonfiction',
        text: 'If you get a chance, look at Mars through a telescope. Mars is the fourth planet from the Sun. It is smaller than Earth and has two moons. Mars is called the Red Planet because it is covered with red rocks and dirt. There are even dust storms there! You might also see an ice cap. People think that Mars used to be like Earth. There are signs that there used to be rivers. Now the rivers are dry. People still do not know if there is or was life on Mars. Would you like to make Mars your home?',
      },
      E: {
        title: 'The Amazing Octopus', lexile: '650L', wordCount: 183, genre: 'Nonfiction',
        text: 'The octopus is one of the most interesting animals in the ocean. It has a soft body and eight long arms called tentacles. Each tentacle is covered with small suction cups that help the octopus grab things and taste its food. Octopuses are very smart. Scientists have watched them solve puzzles and open jars to get food inside. They can also change the color and texture of their skin in less than a second. This helps them hide from predators like sharks and eels. An octopus does not have any bones. Because of this, it can squeeze through tiny spaces. Some octopuses can fit through an opening as small as a coin! If an octopus is in danger, it can shoot a cloud of dark ink into the water. While the predator is confused, the octopus swims away quickly. Most octopuses live on the ocean floor, but some swim near the surface. They eat crabs, clams, and small fish. After an octopus catches its food, it uses its hard beak to crack open shells. There is still so much to learn about these remarkable creatures.',
      },
    },
    comprehension: {
      A: [
        { q: 'What does the cat look like?', expected: 'Soft and small / big green eyes', dok: 'DOK 1' },
        { q: 'What does the cat play with?', expected: 'A red ball', dok: 'DOK 1' },
        { q: 'Why do you think the cat hides under the bed?', expected: '(Inference: playing a game / likes small spaces / thinks it\'s fun)', dok: 'DOK 2' },
        { q: 'How do you know the girl loves her cat?', expected: 'She pets her, the cat sleeps on her bed, she calls the cat her best friend', dok: 'DOK 2' },
        { q: 'Do you have a pet? Tell me about it. If not, what pet would you like? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'How many players are on a baseball team?', expected: 'Nine / nine players', dok: 'DOK 1' },
        { q: 'What happens when a runner is tagged?', expected: 'He is out', dok: 'DOK 1' },
        { q: 'What does a player do after he hits the ball?', expected: 'He runs / he tries to run to home base / his team gets a run if he makes it', dok: 'DOK 2' },
        { q: 'How are baseball and basketball the same? How are they different?', expected: 'Both have teams, both try to win / baseball uses bat and ball, basketball uses net; baseball has 9 players, basketball has 5', dok: 'DOK 2' },
        { q: 'Would you like to play baseball? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'How many players are on a basketball team?', expected: 'Five / five players', dok: 'DOK 1' },
        { q: 'What color is the basketball?', expected: 'Orange or brown', dok: 'DOK 1' },
        { q: 'What is the difference between getting two points and three points?', expected: 'Two points when close to the net, three points when far from the net', dok: 'DOK 2' },
        { q: 'How are baseball and basketball the same? How are they different?', expected: '(Any reasonable comparison)', dok: 'DOK 2' },
        { q: 'Would you like to play basketball? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'How many moons does Mars have?', expected: 'Two / two moons', dok: 'DOK 1' },
        { q: 'Why is Mars called the Red Planet?', expected: 'Because it is covered with red rocks and dirt', dok: 'DOK 1' },
        { q: 'What clues tell us Mars used to be like Earth?', expected: 'There are signs of rivers / there is an ice cap (either or both)', dok: 'DOK 2' },
        { q: 'Why do you think people still don\'t know if there was life on Mars?', expected: '(Inference: it\'s far away / hard to get there / the rivers are dry now / no one has been there yet)', dok: 'DOK 2' },
        { q: 'Would you like to live on Mars? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'What are the octopus\'s arms called?', expected: 'Tentacles', dok: 'DOK 1' },
        { q: 'What does an octopus eat?', expected: 'Crabs, clams, and small fish', dok: 'DOK 1' },
        { q: 'The passage describes two ways an octopus hides from predators. What are they?', expected: 'Changes the color and texture of its skin / shoots dark ink into the water (both needed for full credit)', dok: 'DOK 2' },
        { q: 'Why can an octopus squeeze through tiny spaces? How does this help it?', expected: 'It has no bones / helps it escape danger or hide from predators', dok: 'DOK 2' },
        { q: 'What is the most interesting thing you learned about octopuses? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
    },
  },

  4: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['A', 'B', 'C', 'D', 'E'],
    passages: {
      A: {
        title: 'The School Garden', lexile: '220L', wordCount: 106, genre: 'Nonfiction',
        text: 'Our class has a garden behind the school. We planted seeds in the spring. We planted tomatoes, beans, and sunflowers. Every week, we water the plants. We pull out the weeds. The sun helps the plants grow tall. The tomatoes turned red in the summer. We picked them and washed them. Our teacher cut them up. We ate them for a snack. They were so good! The beans grew long and green. The sunflowers grew taller than us. We learned that plants need water, sun, and good soil. Taking care of a garden is hard work, but it is fun to eat food you grew yourself.',
      },
      B: {
        title: 'Can You See?', lexile: '370L', wordCount: 80, genre: 'Nonfiction',
        text: 'Animals live all around us. Most animals live outside. Birds are easy to see. Spiders and bugs and bees are all around. Some animals are hard to see. Your eyes work hard to find an owl. Owls sleep during the day. They do not wake until night. You have to look extra hard to see a dragonfly or a chameleon. A chameleon is a kind of lizard. They can change colors to hide. Look around. What animals can you find?',
      },
      C: {
        title: 'What\'s For Lunch?', lexile: '440L', wordCount: 128, genre: 'Realistic fiction',
        text: 'What\'s that noise? Oh! It\'s my stomach! I didn\'t realize how very hungry for lunch I am. My friend Jacob and I are outside playing a fun game, and it is lunchtime. This morning Mom said she is making my favorite soup. Hot soup sounds really good, but playing with Jacob is so much fun. We keep playing the detective game we made up. Soon, I hear my mother calling. I look at my watch and realize I am an hour late for lunch. Playing with Jacob is so much fun that I forgot all about the time. Now, I am going to be in trouble for not being home on time. I tell Jacob goodbye and run home as quickly as I can. Cold soup for lunch doesn\'t sound very good.',
      },
      D: {
        title: 'Emma the Artist', lexile: '560L', wordCount: 204, genre: 'Realistic fiction',
        text: '"Emma, would you please get the stapler for me?" Ms. Harrison asked. Emma was helping Ms. Harrison, the art teacher, set up the class for Open House. She was putting up student artwork in her classroom. Emma was helping by finding things Ms. Harrison needed. Emma opened the cabinet and began looking for the stapler. As she looked at the paints, pencils, and brushes, she felt excited. She spent much of her time painting pictures. Her favorite subject was horses. She didn\'t think her paintings were very good, but she loved making them. Emma handed the stapler to Ms. Harrison, who was going through a stack of artwork. She was choosing those that were the best examples of what the students had learned. Emma knew that her paintings were not as good as those of some of the other students. Then Ms. Harrison held up Emma\'s painting of a horse. "This painting is lovely!" she said. "The lines and shapes are great examples of what we\'ve been learning. I think you\'re quite an artist!" "Thank you for your kindness," Emma answered, blushing. Ms. Harrison put her hand on Emma\'s shoulder. "Emma, I\'m not being kind. I\'m simply telling you the truth," she said softly.',
      },
      E: {
        title: 'The Secret Life of Soil', lexile: '800L', wordCount: 251, genre: 'Nonfiction',
        text: 'Most people walk over soil every day without thinking about it. But under your feet, there is a hidden world full of life. A single handful of healthy soil can contain more living things than there are people on Earth. Earthworms are some of the most important creatures in soil. As they dig tunnels underground, they create spaces for air and water to reach plant roots. They also eat dead leaves and break them down into nutrients that help plants grow. Without earthworms, soil would become hard and packed, and plants would struggle to survive. Soil is also home to billions of tiny organisms called bacteria and fungi. These microscopic helpers break down dead plants and animals, recycling them into food for living plants. Some fungi grow in long, thread-like networks that connect the roots of different trees. Scientists call this the "Wood Wide Web" because trees actually share nutrients and send warning signals to each other through these underground connections. Not all soil is the same. Sandy soil drains water quickly and is found near beaches. Clay soil holds water tightly and can become very hard when it dries. Loam, a mixture of sand, clay, and organic matter, is considered the best soil for growing crops because it holds just the right amount of water and nutrients. The next time you step outside, remember that beneath your feet lies one of the most complex ecosystems on the planet.',
      },
    },
    comprehension: {
      A: [
        { q: 'What did the class plant in the garden?', expected: 'Tomatoes, beans, and sunflowers', dok: 'DOK 1' },
        { q: 'What color did the tomatoes turn?', expected: 'Red', dok: 'DOK 1' },
        { q: 'Why does the passage say taking care of a garden is "hard work"?', expected: 'You have to water every week, pull weeds, pick the food -- it takes time and effort', dok: 'DOK 2' },
        { q: 'How is a school garden similar to taking care of a pet? How is it different?', expected: 'Both need care/water/attention; garden grows food but pet doesn\'t; pet can move but plant can\'t', dok: 'DOK 2' },
        { q: 'Would you like to have a garden? What would you grow? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      B: [
        { q: 'Name two animals that are easy to see outside.', expected: 'Birds, spiders, bugs, bees (any two)', dok: 'DOK 1' },
        { q: 'What is a chameleon?', expected: 'A kind of lizard / a lizard that can change colors', dok: 'DOK 1' },
        { q: 'Why are owls hard to see during the day?', expected: 'They sleep during the day and don\'t wake until night', dok: 'DOK 2' },
        { q: 'Owls and chameleons are both hard to see. How are their reasons different?', expected: 'Owls: only come out at night (timing). Chameleons: change colors to hide (camouflage). Different strategies.', dok: 'DOK 2' },
        { q: 'What animal do you think is the most interesting? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'What is Mom making for lunch?', expected: 'Soup / the narrator\'s favorite soup', dok: 'DOK 1' },
        { q: 'Who is the narrator playing with?', expected: 'Jacob / his friend Jacob', dok: 'DOK 1' },
        { q: 'Why is the soup cold at the end of the story?', expected: 'The narrator was an hour late -- the soup sat out and got cold while he was playing', dok: 'DOK 2' },
        { q: 'The narrator says playing with Jacob is "so much fun" two times. Why does the author repeat this?', expected: 'To show how much fun they had / to explain why he lost track of time / more fun than eating', dok: 'DOK 2' },
        { q: 'Have you ever lost track of time doing something fun? What happened?', expected: '(Open -- any reasonable response with detail)', dok: 'Open' },
      ],
      D: [
        { q: 'What is Emma\'s favorite thing to paint?', expected: 'Horses', dok: 'DOK 1' },
        { q: 'What is Ms. Harrison setting up the classroom for?', expected: 'Open House', dok: 'DOK 1' },
        { q: 'Why does Emma say "thank you for your kindness" instead of just "thank you"?', expected: 'She doesn\'t believe the compliment / thinks Ms. Harrison is just being nice, not honest', dok: 'DOK 2' },
        { q: 'Ms. Harrison says "I\'m not being kind. I\'m simply telling you the truth." Why is this important for Emma?', expected: 'Helps Emma believe her art really is good / it\'s real praise not politeness / she might start to believe in herself', dok: 'DOK 2' },
        { q: 'Have you ever been surprised to find out you were good at something? Tell me about it.', expected: '(Open -- any reasonable response with personal connection)', dok: 'Open' },
      ],
      E: [
        { q: 'What do earthworms do that helps plants?', expected: 'Dig tunnels for air/water to reach roots; eat dead leaves and turn them into nutrients', dok: 'DOK 1' },
        { q: 'What are the three types of soil mentioned?', expected: 'Sandy soil, clay soil, and loam', dok: 'DOK 1' },
        { q: 'Why do scientists call the fungi network the "Wood Wide Web"?', expected: 'It connects trees underground like the internet / trees share nutrients and warnings through it', dok: 'DOK 2' },
        { q: 'Earthworms and fungi are both important for soil. How are their jobs similar and different?', expected: 'Both break down dead material / earthworms dig tunnels, fungi create networks connecting trees', dok: 'DOK 2' },
        { q: 'What is the most surprising thing you learned about soil? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
    },
  },

  5: {
    hasPhonics: false,
    hasSentences: false,
    naepLevels: ['A', 'B', 'C', 'D', 'E'],
    passages: {
      A: {
        title: 'The Lunchbox Mix-Up', lexile: '~380L', wordCount: 124, genre: 'Realistic fiction',
        text: 'Maya grabbed her lunchbox from the shelf and sat down at her table. She was so hungry after morning classes. But when she opened the lunchbox, she found a sandwich with pickles and mustard. Maya hated pickles! This was not her lunch. She looked around the cafeteria. A boy at the next table was staring into a lunchbox with a confused look on his face. He was holding up a container of rice and kimchi. "I think we have each other\'s lunches," Maya said. The boy laughed. "I was wondering why my mom packed me Korean food!" They traded lunchboxes and both started eating. "My name is Daniel," the boy said. "Your mom makes good-looking food." "Thanks," Maya smiled. "Maybe we can sit together tomorrow."',
      },
      B: {
        title: 'Sara\'s Brother', lexile: '~470L', wordCount: 159, genre: 'Realistic fiction',
        text: 'Mom brought my new baby brother home last week. He was wrapped in a bundle of yellow blankets. He seemed so small! I\'m here to tell you, though, that his lungs are not small at all. Nope, those lungs can really scream. We have not had any peace in this apartment since he came home. A little crying may not sound awful to you. That\'s because he is not staying in your room. I thought it would be fun to share my room with the baby. But I nearly fell out of bed when he started crying this morning. It was four in the morning! I rushed over to his crib. What was the matter? Why, nothing at all. Ugh! Do you want to know the most incredible thing about having a little brother? It\'s the way he laughs and smiles when I\'m tickling him. He is by far the loudest person in our apartment. But I love him all the same.',
      },
      C: {
        title: 'A Park for All Seasons', lexile: '~600L', wordCount: 152, genre: 'Nonfiction',
        text: 'As seasons change, so do events that happen in city parks. Meet a friend at the fall festival. You can listen to music, play games, and buy crafts. Take along a snack and watch a Thanksgiving play. Could there be a part in the play for you? Walk through the park in the crisp autumn air. Maybe you\'ll collect a colorful leaf or two. You can string acorns to make an interesting necklace. Be sure to bring your camera to take snapshots! Does winter snow dot the landscape where you live? If so, building a snowman in the park is lots of fun. Perhaps it\'s too cold or rainy outside. A trip to the city park art center is a great way to spend the day. You can cut out paper snowflakes or make a calendar. Maybe you\'ll just listen to a story and draw a picture. Afterward, you can sip hot chocolate. Yummy!',
      },
      D: {
        title: 'The Edible Schoolyard', lexile: '~750L', wordCount: 223, genre: 'Nonfiction',
        text: 'What does a certain school in California have that most other schools don\'t have? King Middle School has a garden. The garden is part of a cooking and gardening program called the Edible Schoolyard. The idea for the program came from Alice Waters. Waters started a restaurant that makes food from fresh ingredients. Something delicious is always growing in the garden. Students are learning a different type of ABCs \u2014 asparagus, beans, and carrots! They grow fruits, vegetables, and flowers. Teachers and students work together in the program. Parents and local farmers support the program. In the garden, students take care of the soil and plants. They harvest the crops. Students can explore and sample new foods directly from the garden. They learn firsthand the ways in which fresh food is healthy for your body. A classroom kitchen is also part of the program. In the kitchen, students prepare and eat healthy dishes made from the food they grow. Teachers at the school use the garden and kitchen activities to extend the learning in other subject areas, too. For example, students learn information about plants and the relationship between living things and their environment. Both the garden and the program are growing, and word of this program is spreading. Other schools across the country have started their own edible schoolyards.',
      },
      E: {
        title: 'The World\'s Biomes', lexile: '~925L', wordCount: 352, genre: 'Nonfiction',
        text: 'If you could travel across the entire globe, you would notice that Earth\'s landscapes vary greatly from one region to another. Scientists classify these large areas into categories called biomes, each defined by its climate, plant life, and the animals that have adapted to survive there. Tropical rainforests, located near the equator, are among the most complex ecosystems on the planet. Warm temperatures and heavy rainfall throughout the year create perfect conditions for an incredible variety of life. Although rainforests cover less than six percent of Earth\'s surface, they contain more than half of all known plant and animal species. Competition for sunlight is so intense that many creatures, such as toucans and tree frogs, have evolved to spend their entire lives in the treetops, rarely touching the forest floor. At the other extreme, deserts receive fewer than 25 centimeters of rain per year. While many people picture hot sand dunes, not all deserts are warm. Antarctica is actually considered a desert because it gets so little precipitation, despite being the coldest place on Earth. Desert animals and plants have developed clever ways to survive. Camels store fat in their humps for energy, while certain plants can stay dormant for years, waiting for the next rainfall. Grasslands are wide, open areas found on every continent except Antarctica. Covered mostly in grasses with few trees, they support large herds of grazing animals. The African savanna, perhaps the most famous grassland, is home to lions, zebras, and elephants. Below the surface, grassland soil is extremely fertile, which is why humans have turned much of the world\'s grasslands into farmland. The taiga stretches across northern Canada, Russia, and Scandinavia, making it the largest land biome on Earth. Winters can last up to eight months, and summers are brief and mild. Dense forests of spruce, pine, and fir trees cover the landscape, while animals like moose, wolves, and lynx have adapted to handle the extreme cold. Understanding these biomes and the balance within each ecosystem is important for protecting the natural world, especially as human activity continues to change it.',
      },
    },
    comprehension: {
      A: [
        { q: 'What was wrong when Maya opened her lunchbox?', expected: 'It wasn\'t her lunch / she found a sandwich with pickles', dok: 'DOK 1' },
        { q: 'What food was in Maya\'s actual lunchbox?', expected: 'Rice and kimchi', dok: 'DOK 1' },
        { q: 'How did Maya figure out the lunches were switched?', expected: 'She saw a boy at the next table looking confused at her food / he was holding her rice and kimchi', dok: 'DOK 2' },
        { q: 'Maya says "maybe we can sit together tomorrow." What does this tell you about her?', expected: 'She is friendly / wants to make a new friend / the mix-up turned into something good', dok: 'DOK 2' },
        { q: 'Has anything surprising ever happened to you at lunch or school? What happened?', expected: '(Open -- any reasonable response with detail)', dok: 'Open' },
      ],
      B: [
        { q: 'What woke Sara up at four in the morning?', expected: 'Her baby brother was crying', dok: 'DOK 1' },
        { q: 'What was wrong with the baby when Sara rushed to his crib?', expected: 'Nothing / nothing was wrong at all', dok: 'DOK 1' },
        { q: 'Why does Sara say "Ugh!" when she checks on the baby?', expected: 'Because nothing was wrong / the baby was crying for no reason / she got up at 4am for nothing', dok: 'DOK 2' },
        { q: 'How do Sara\'s feelings about her brother change from the beginning to the end of the story?', expected: 'At first she is annoyed/frustrated because he cries a lot / at the end she loves him because he laughs and smiles', dok: 'DOK 2' },
        { q: 'Do you have a younger brother or sister? What are they like? If not, would you want one? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      C: [
        { q: 'Name two things you can do at the fall festival.', expected: 'Listen to music, play games, buy crafts, watch a Thanksgiving play, eat a snack (any two)', dok: 'DOK 1' },
        { q: 'What can you do at the city park art center in winter?', expected: 'Cut out paper snowflakes, make a calendar, listen to a story and draw a picture, sip hot chocolate', dok: 'DOK 1' },
        { q: 'The passage only describes fall and winter. Why do you think the title says "All Seasons"?', expected: 'Parks are fun year-round / there are probably spring and summer activities too', dok: 'DOK 2' },
        { q: 'How are the fall and winter activities different from each other?', expected: 'Fall is mostly outdoors (festival, walking, collecting leaves) / winter has both outdoor and indoor', dok: 'DOK 2' },
        { q: 'What is your favorite thing to do outside in your favorite season? Why?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      D: [
        { q: 'Who came up with the idea for the Edible Schoolyard?', expected: 'Alice Waters', dok: 'DOK 1' },
        { q: 'What do students do in the classroom kitchen?', expected: 'Prepare and eat healthy dishes made from the food they grow', dok: 'DOK 1' },
        { q: 'What does "ABCs" stand for in this passage?', expected: 'Asparagus, beans, and carrots / it\'s the names of vegetables they grow', dok: 'DOK 2' },
        { q: 'How is learning in the Edible Schoolyard different from learning in a regular classroom?', expected: 'Students are outside/hands-on instead of sitting at desks / they grow and cook real food', dok: 'DOK 2' },
        { q: 'Would you like your school to have a program like this? Why or why not?', expected: '(Open -- any reasonable response with reason)', dok: 'Open' },
      ],
      E: [
        { q: 'What percentage of Earth\'s surface do rainforests cover?', expected: 'Less than six percent', dok: 'DOK 1' },
        { q: 'What is the largest land biome on Earth?', expected: 'The taiga', dok: 'DOK 1' },
        { q: 'Why does the author say Antarctica is a desert?', expected: 'Because it gets very little rain or snow / deserts don\'t have to be hot', dok: 'DOK 2' },
        { q: 'How are the challenges faced by desert organisms and taiga wildlife similar and different?', expected: 'Both face harsh conditions requiring adaptations / desert: heat and lack of water / taiga: extreme cold and long winters', dok: 'DOK 2' },
        { q: 'The passage says humans have turned much of the world\'s grasslands into farmland. Do you think this is a good thing or a bad thing? Why?', expected: '(Open -- good because we need food / bad because it destroys habitats / both)', dok: 'Open' },
      ],
    },
  },
}

// ============================================================================
// CONTENT RESOLUTION
// ============================================================================
// A Grade 2 test whose academic_year/semester matches an authored content
// version is scored against that version. Everything else -- grades 3-5, and
// Grade 2 tests predating the Fall 2026 rewrite -- keeps the constants above,
// so historical results are read against exactly the content they were sat on.

function resolveConfig(grade: number, g2: G2Content | null, g3: G3Content | null, g4: G4Content | null, g5: G5Content | null): GradeTestConfig | null {
  const data = GRADE_CONFIGS[grade]

  if (g5) {
    // Grade 5 is fluency plus comprehension only, across five levels A-E.
    const passages: Partial<Record<PassageLevel, PassageData>> = {}
    const comprehension: Partial<Record<PassageLevel, CompQuestion[]>> = {}
    const levels = Object.keys(g5.oral.passages) as PassageLevel[]
    const multipliers: Record<string, number> = {}
    levels.forEach(lv => {
      const p = g5.oral.passages[lv as keyof typeof g5.oral.passages]
      passages[lv] = { title: p.title, text: p.text, wordCount: p.wordCount, lexile: p.textType, genre: p.textType }
      comprehension[lv] = g5.oral.compQuestions[lv as keyof typeof g5.oral.compQuestions].map(cq => ({
        q: cq.q, dok: cq.dok, expected: cq.anchors[2], anchors: cq.anchors,
        note: cq.examples ? cq.examples.join('  ') : undefined,
      }))
      multipliers[lv] = p.passageWeight
    })
    return {
      hasPhonics: false,
      hasSentences: false,
      passages,
      comprehension,
      naepLevels: levels,
      levels,
      compScoreMax: 2,
      compMax: g5.oral.compMax,
      phonicsRows: [], phonicsMax: 0,
      sentences: [], sentenceMax: 0,
      syllables: null, syllableMax: 0,
      passageMultipliers: multipliers,
      scripts: { reading: g5.oral.say },
      adminNotes: g5.oral.adminNotes,
      readingLevels: g5.oral.readingLevels,
      frustrationCompMax: g5.oral.frustrationCompMax ?? null,
      contentLabel: g5.label,
    }
  }

  if (g4) {
    // Grade 4 is fluency plus comprehension only, across five levels A-E.
    const passages: Partial<Record<PassageLevel, PassageData>> = {}
    const comprehension: Partial<Record<PassageLevel, CompQuestion[]>> = {}
    const levels = Object.keys(g4.oral.passages) as PassageLevel[]
    const multipliers: Record<string, number> = {}
    levels.forEach(lv => {
      const p = g4.oral.passages[lv as keyof typeof g4.oral.passages]
      passages[lv] = { title: p.title, text: p.text, wordCount: p.wordCount, lexile: p.textType, genre: p.textType }
      comprehension[lv] = g4.oral.compQuestions[lv as keyof typeof g4.oral.compQuestions].map(cq => ({
        q: cq.q, dok: cq.dok, expected: cq.anchors[2], anchors: cq.anchors,
      }))
      multipliers[lv] = p.passageWeight
    })
    return {
      hasPhonics: false,
      hasSentences: false,
      passages,
      comprehension,
      naepLevels: levels,
      levels,
      compScoreMax: 2,
      compMax: g4.oral.compMax,
      phonicsRows: [], phonicsMax: 0,
      sentences: [], sentenceMax: 0,
      syllables: null, syllableMax: 0,
      passageMultipliers: multipliers,
      scripts: { reading: g4.oral.say },
      adminNotes: g4.oral.adminNotes,
      readingLevels: g4.oral.readingLevels,
      frustrationCompMax: g4.oral.frustrationCompMax ?? null,
      contentLabel: g4.label,
    }
  }

  if (g3) {
    // Grade 3 is fluency plus comprehension only -- no phonics, syllables or
    // sentence reading -- so the component sections stay empty and the screen
    // opens straight on the passage.
    const passages: Partial<Record<PassageLevel, PassageData>> = {}
    const comprehension: Partial<Record<PassageLevel, CompQuestion[]>> = {}
    const levels = Object.keys(g3.oral.passages) as PassageLevel[]
    const multipliers: Record<string, number> = {}
    levels.forEach(lv => {
      const p = g3.oral.passages[lv as keyof typeof g3.oral.passages]
      passages[lv] = {
        title: p.title,
        text: p.text,
        wordCount: p.wordCount,
        lexile: p.lexile ?? `×${p.passageWeight.toFixed(1)}`,
      }
      comprehension[lv] = g3.oral.compQuestions[lv as keyof typeof g3.oral.compQuestions].map(cq => ({
        q: cq.q,
        dok: cq.dok,
        expected: cq.anchors[2],
        anchors: cq.anchors,
        note: cq.note,
      }))
      multipliers[lv] = p.passageWeight
    })

    return {
      hasPhonics: false,
      hasSentences: false,
      passages,
      comprehension,
      naepLevels: levels,
      levels,
      compScoreMax: 2,
      compMax: g3.oral.compMax,
      phonicsRows: [],
      phonicsMax: 0,
      sentences: [],
      sentenceMax: 0,
      syllables: null,
      syllableMax: 0,
      passageMultipliers: multipliers,
      scripts: { reading: g3.oral.say },
      adminNotes: g3.oral.adminNotes,
      readingLevels: g3.oral.readingLevels,
      frustrationCompMax: null,
      contentLabel: g3.label,
    }
  }

  if (g2) {
    const r = g2.oral.reading
    const passages: Partial<Record<PassageLevel, PassageData>> = {}
    const comprehension: Partial<Record<PassageLevel, CompQuestion[]>> = {}
    const levels = Object.keys(r.passages) as PassageLevel[]
    levels.forEach(lv => {
      const p = r.passages[lv as keyof typeof r.passages]
      passages[lv] = {
        title: p.title,
        text: p.text,
        wordCount: p.wordCount,
        // This test weights passages by its own scale rather than by Lexile,
        // so the band is shown as the weight instead of a fabricated level.
        lexile: `×${p.passageWeight.toFixed(1)}`,
      }
      comprehension[lv] = r.compQuestions[lv as keyof typeof r.compQuestions].map(cq => ({
        q: cq.q,
        dok: cq.dok,
        // The guide's 2-point anchor is what a full-credit answer looks like.
        expected: cq.anchors[2],
        anchors: cq.anchors,
      }))
    })
    const multipliers: Record<string, number> = {}
    levels.forEach(lv => { multipliers[lv] = r.passages[lv as keyof typeof r.passages].passageWeight })

    return {
      hasPhonics: true,
      hasSentences: true,
      passages,
      comprehension,
      naepLevels: levels,
      levels,
      compScoreMax: 2,
      compMax: r.compMax,
      phonicsRows: g2.oral.phonics.rows.map(row => ({
        label: `${row.label}: ${row.focus}`,
        words: row.words,
        max: row.max,
      })),
      phonicsMax: g2.oral.phonics.max,
      sentences: g2.oral.sentences.items.map(s => ({ text: s.text, max: s.max, focus: s.focus })),
      sentenceMax: g2.oral.sentences.max,
      syllables: g2.oral.syllables.words.map(w => ({ key: w.key, word: w.word, answer: w.answer })),
      syllableMax: g2.oral.syllables.max,
      passageMultipliers: multipliers,
      scripts: {
        phonics: g2.oral.phonics.say,
        syllables: g2.oral.syllables.say,
        sentences: g2.oral.sentences.say,
        reading: r.say,
      },
      adminNotes: [...g2.adminNotes, ...r.adminNotes],
      readingLevels: [],
      frustrationCompMax: null,
      contentLabel: g2.label,
    }
  }

  if (!data) return null
  return {
    ...data,
    levels: ['A', 'B', 'C', 'D', 'E'],
    compScoreMax: 3,
    compMax: 15,
    phonicsRows: PHONICS_ROWS.map(r => ({ label: r.label, words: r.words, max: 5 })),
    phonicsMax: 25,
    sentences: SENTENCES.map(s => ({ text: s.text, max: s.max, focus: s.level })),
    sentenceMax: SENTENCES.reduce((a, s) => a + s.max, 0),
    syllables: null,
    syllableMax: 0,
    passageMultipliers: PASSAGE_MULTIPLIERS,
    scripts: {},
    adminNotes: [],
    readingLevels: [],
    frustrationCompMax: null,
    contentLabel: null,
  }
}

// ============================================================================
// PASSAGE READER MODAL
// ============================================================================

function PassageReaderModal({ passage, level, readingLevels, prevLevel, onSave, onClose, initialData }: {
  passage: PassageData
  level: PassageLevel
  /** The guide's Independent / Instructional / Frustration table, if authored. */
  readingLevels: { level: string; accuracy: string; comprehension?: string; action: string }[]
  /** The passage below this one, or null on the lowest level offered. */
  prevLevel: PassageLevel | null
  onSave: (data: { wordsRead: number; errors: number; timeSeconds: number; notes?: string; wordMarks: Record<number, 'error' | 'self_correct' | null> }) => void
  onClose: () => void
  initialData?: {
    wordsRead?: number | null; errors?: number | null; timeSeconds?: number | null
    wordMarks?: Record<number, 'error' | 'self_correct' | null> | null
  }
}) {
  const { confirmDialog } = useApp()
  // An em-dash joins two words with no space ("kids\u2014and"), so splitting on
  // whitespace alone would give the teacher one box holding two words to mark.
  // Split on the dash too, keeping it on the word it followed so the passage
  // still reads as printed.
  const words = passage.text.split(/\s+/).flatMap(w =>
    /[\u2014\u2013]/.test(w)
      ? w.split(/(?<=[\u2014\u2013])/).filter(Boolean)
      : [w]
  )
  const [wordMarks, setWordMarks] = useState<Record<number, 'error' | 'self_correct' | null>>({})
  const [lastWordIdx, setLastWordIdx] = useState<number | null>(null)
  const [timing, setTiming] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [pausedForBreak, setPausedForBreak] = useState(false)
  const [notes, setNotes] = useState('')
  const startRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize from saved data
  useEffect(() => {
    if (initialData?.wordsRead != null && initialData.wordsRead > 0 && initialData.wordsRead < words.length) {
      setLastWordIdx(initialData.wordsRead - 1)
    }
    if (initialData?.timeSeconds != null && initialData.timeSeconds > 0) {
      setElapsed(initialData.timeSeconds)
    }
    if (initialData?.wordMarks && Object.keys(initialData.wordMarks).length > 0) {
      setWordMarks(initialData.wordMarks)
    }
  }, [])

  // Timer logic
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

  // The clock is stopped part-way and the reading can carry on. True after a
  // Pause, and also when a saved passage is reopened -- so `pausedForBreak`,
  // set only by the button, is what labels the break; a reopened passage that
  // was actually finished must not claim someone is on a break.
  const canResume = !timing && !finished && elapsed > 0

  // Which band the live accuracy falls in, and the reference row to show for
  // each. Grades whose guide authors the table use its exact wording; the rest
  // fall back to the thresholds every guide shares.
  const liveBand = accuracy >= INDEPENDENT_ACCURACY ? 'independent'
    : accuracy >= FRUSTRATION_ACCURACY ? 'instructional'
    : 'frustration'
  const FALLBACK_BANDS = [
    { level: 'Independent', accuracy: `${INDEPENDENT_ACCURACY}% or higher`, action: 'The passage is too easy. Try one level up.' },
    { level: 'Instructional', accuracy: `${FRUSTRATION_ACCURACY}-${INDEPENDENT_ACCURACY - 1}%`, action: 'This is the placement level. Stop here.' },
    { level: 'Frustration', accuracy: `below ${FRUSTRATION_ACCURACY}%`, action: 'The passage is too hard. Try one level down.' },
  ]
  const refBands = (readingLevels.length > 0 ? readingLevels : FALLBACK_BANDS).map(b => ({
    key: b.level.toLowerCase(),
    label: b.level,
    accuracy: b.accuracy,
    comprehension: (b as any).comprehension as string | undefined,
    action: b.action,
  }))

  const handleWordClick = (idx: number) => {
    if (lastWordIdx !== null && idx > lastWordIdx) return
    // If this word IS the lastWord marker: 4th click = clear marker
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

  const handleSaveAndClose = () => {
    onSave({ wordsRead: wRead, errors: errCount, timeSeconds: elapsed > 0 && elapsed < 60 ? elapsed : (elapsed || 60), notes: notes || undefined, wordMarks })
    setFinished(true)
    setTiming(false)
    onClose()
  }

  const handleReset = () => {
    setWordMarks({})
    setLastWordIdx(null)
    setTiming(false)
    setElapsed(0)
    setFinished(false)
    setPausedForBreak(false)
  }

  // Detect whether the teacher has done anything worth keeping
  const hasUnsavedData = timing || elapsed > 0 || Object.keys(wordMarks).length > 0 || lastWordIdx !== null || notes.length > 0

  const handleClose = async () => {
    if (!hasUnsavedData) { onClose(); return }
    if (await confirmDialog({ title: 'Close without saving?', message: 'You have unsaved reading data.', danger: true, confirmLabel: 'Discard' })) onClose()
  }

  // Split words into lines of 10
  const lines: { word: string; idx: number }[][] = []
  for (let i = 0; i < words.length; i += 10) {
    lines.push(words.slice(i, i + 10).map((w, j) => ({ word: w, idx: i + j })))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-[850px] max-h-[90vh] flex flex-col overflow-hidden" onClick={(e: any) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-green-50 shrink-0">
          <div>
            <h3 className="font-display text-lg font-semibold text-navy">Passage {level}: {passage.title}</h3>
            <p className="text-[10px] text-text-secondary">{passage.wordCount} words | {passage.lexile}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={18} /></button>
        </div>

        {/* Reading-level reference. Kept at the top of the modal so the teacher
            can read the live accuracy against the guide's bands without
            closing the passage. Highlights the band the reading is currently
            in once there is a timed reading to judge. */}
        <div className="px-6 py-2 border-b border-border bg-surface-alt/40 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mr-0.5">Reading level</span>
            {refBands.map(b => {
              const live = elapsed > 0 && b.key === liveBand
              return (
                <span key={b.key} title={b.action}
                  className={`text-[9.5px] px-2 py-1 rounded-lg border transition-all ${
                    live
                      ? b.key === 'frustration' ? 'bg-red-100 border-red-300 text-red-800 font-bold'
                      : b.key === 'instructional' ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold'
                      : 'bg-green-100 border-green-300 text-green-800 font-bold'
                      : 'bg-surface border-border text-text-secondary'
                  }`}>
                  <span className="font-semibold">{b.label}</span> {b.accuracy}
                  {b.comprehension && <span className="opacity-70"> {'\u00B7'} comp {b.comprehension}</span>}
                </span>
              )
            })}
          </div>
        </div>

        {/* Frustration flag. Held back until the reading is finished -- a
            banner appearing mid-read, or during a break, would push the whole
            word grid down under the teacher's finger. Advisory only -- the guide's rule is to try one level down,
            but a tired or shy student does not always need a re-read, so the
            call stays with the teacher. */}
        {finished && elapsed > 0 && liveBand === 'frustration' && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-[10px] text-red-800 shrink-0 flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            <span>
              <strong>{accuracy}% accuracy is Frustration level</strong> for this passage.
              {prevLevel
                ? <> You may want to stop here and try Passage {prevLevel} instead {'\u2014'} but that is your call, not a rule. A student who is nearly at {FRUSTRATION_ACCURACY}%, tired, or just nervous does not always need a re-read.</>
                : <> This is the lowest passage, so there is nothing to move down to. Record it and move on {'\u2014'} the placement is Level {level}.</>}
            </span>
          </div>
        )}

        {/* Timer bar — idle, running, paused for a break, finished */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-navy-dark text-white shrink-0">
          <div className="flex items-center gap-3">
            {!timing && !finished && (
              <button onClick={() => { setTiming(true); setFinished(false); setPausedForBreak(false) }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-[12px] font-semibold">
                <Play size={12} /> {canResume ? 'Resume' : 'Start'}
              </button>
            )}
            {/* Pause is for a break, not for the end of the reading. The clock
                picks up where it stopped, so the break is not counted in the
                CWPM -- which is the whole point of having it. */}
            {timing && (
              <button onClick={() => { setTiming(false); setPausedForBreak(true) }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold">
                <Pause size={12} /> Pause
              </button>
            )}
            {(timing || canResume) && (
              <button onClick={() => { setTiming(false); setPausedForBreak(false); setFinished(true) }}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold ${timing ? 'animate-pulse' : ''}`}>
                <Square size={12} /> Stop
              </button>
            )}
            {finished && (
              <button onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium">
                <RotateCcw size={11} /> Reset
              </button>
            )}
            <span className={`text-[24px] font-mono font-bold tabular-nums ${pausedForBreak ? 'text-amber-300' : ''}`}>{formatTime(elapsed)}</span>
            {pausedForBreak && (
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">
                Paused {'\u2014'} clock stopped for a break
              </span>
            )}
          </div>
          <div className="flex items-center gap-5 text-[11px]">
            <div className="text-center"><div className="text-[18px] font-bold">{errCount}</div><div className="text-white/60 text-[8px] uppercase">Errors</div></div>
            <div className="text-center"><div className="text-[18px] font-bold">{scCount}</div><div className="text-white/60 text-[8px] uppercase">SC</div></div>
            <div className="text-center"><div className="text-[18px] font-bold text-gold">{elapsed > 0 ? cwpm : '\u2014'}</div><div className="text-white/60 text-[8px] uppercase">CWPM</div></div>
            <div className="text-center"><div className={`text-[18px] font-bold ${accuracy >= INDEPENDENT_ACCURACY ? 'text-green-400' : accuracy >= FRUSTRATION_ACCURACY ? 'text-amber-400' : elapsed > 0 ? 'text-red-400' : ''}`}>{elapsed > 0 ? `${accuracy}%` : '\u2014'}</div><div className="text-white/60 text-[8px] uppercase">Acc</div></div>
            <div className="text-center"><div className="text-[18px] font-bold">{wRead}/{words.length}</div><div className="text-white/60 text-[8px] uppercase">Words</div></div>
          </div>
        </div>

        {/* Click instructions */}
        <div className="px-6 py-1.5 bg-accent-light border-b border-border text-[10px] text-navy shrink-0">
          <strong>Click:</strong> 1x = <span className="text-red-600 font-bold">error</span> {'\u00B7'} 2x = <span className="text-amber-600 font-bold">self-correct</span> {'\u00B7'} 3x = <span className="text-red-600 font-bold">last word read</span> {'\u00B7'} 4x = reset
        </div>

        {/* Passage words */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Last-word-read banner */}
          {lastWordIdx !== null && (
            <div className="mb-3 flex items-center justify-between bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
              <span className="text-[11px] text-blue-800 font-medium">
                Last word: &ldquo;{words[lastWordIdx]}&rdquo; &mdash; <span className="font-bold">{lastWordIdx + 1}/{words.length}</span>
                {lastWordIdx + 1 < words.length && <span className="text-blue-600 ml-1">(didn&apos;t finish)</span>}
              </span>
              <button onClick={() => setLastWordIdx(null)} className="text-[10px] text-red-500 hover:text-red-700 font-medium">Clear</button>
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

        {/* Footer: notes + save */}
        <div className="px-6 py-3 border-t border-border bg-surface-alt/30 shrink-0 space-y-2">
          <input value={notes} onChange={(e: any) => setNotes(e.target.value)}
            placeholder="Quick notes (e.g. struggled with blends, good expression)..."
            className="w-full px-3 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy bg-white" />
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-text-tertiary">
              {elapsed > 0 && <>CWPM: <strong className="text-navy">{cwpm}</strong> {'\u00B7'} Accuracy: <strong className={accuracy >= INDEPENDENT_ACCURACY ? 'text-green-600' : accuracy >= FRUSTRATION_ACCURACY ? 'text-amber-600' : 'text-red-600'}>{accuracy}%</strong> {'\u00B7'} </>}
              Errors: <strong className="text-red-600">{errCount}</strong> {'\u00B7'} SC: <strong className="text-amber-600">{scCount}</strong>
              {elapsed > 0 && liveBand === 'independent' && <span className="ml-2 text-green-600">(Independent)</span>}
              {elapsed > 0 && liveBand === 'instructional' && <span className="ml-2 text-amber-600">(Instructional)</span>}
              {elapsed > 0 && liveBand === 'frustration' && <span className="ml-2 text-red-600">(Frustration -- consider one level down)</span>}
            </div>
            <button onClick={handleSaveAndClose}
              className="px-5 py-2 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 transition-all">
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ============================================================================
// CLICKABLE PHONICS GRID (Grade 2 - like Grade 1 Level B)
// ============================================================================

function PhonicsClickableGrid({ sc, studentId, updateScore, rows, max, stoppingRule }: {
  sc: OralScores
  studentId: string
  updateScore: (sid: string, key: string, val: number | string | null) => void
  rows: PhonicsRowView[]
  max: number
  /** Present from Fall 2026 on; absent means the legacy per-row ceiling rule. */
  stoppingRule?: string
}) {
  const [wordStatus, setWordStatus] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      const ws: Record<string, boolean> = {}
      rows.forEach((row, ri) => {
        const saved = sc[`phonics_row${ri + 1}` as keyof OralScores] as number | null | undefined
        if (saved != null && saved > 0) {
          row.words.forEach((_, wi) => {
            if (wi < saved) ws[`${ri}-${wi}`] = true
          })
        }
      })
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [sc, initialized, rows])

  const toggle = (rowIdx: number, wordIdx: number) => {
    const key = `${rowIdx}-${wordIdx}`
    setWordStatus(prev => {
      const next = { ...prev }
      if (next[key]) { delete next[key] } else { next[key] = true }
      const rowCount = rows[rowIdx].words.reduce((acc, _, wi) => {
        return acc + (next[`${rowIdx}-${wi}`] ? 1 : 0)
      }, 0)
      updateScore(studentId, `phonics_row${rowIdx + 1}`, rowCount)
      return next
    })
    setInitialized(true)
  }

  const getRowCount = (ri: number) => {
    return rows[ri].words.reduce((acc, _, wi) => acc + (wordStatus[`${ri}-${wi}`] ? 1 : 0), 0)
  }

  const totalCorrect = rows.reduce((acc, _, ri) => acc + getRowCount(ri), 0)

  return (
    <div className="space-y-4">
      {rows.map((row, ri) => {
        const rowCount = getRowCount(ri)
        return (
          <div key={ri}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-text-secondary">{row.label}</span>
              <span className={`text-[11px] font-bold ${rowCount >= 4 ? 'text-green-600' : rowCount >= 2 ? 'text-amber-600' : 'text-text-tertiary'}`}>
                {rowCount}/{row.max}
              </span>
            </div>
            <div className="flex gap-2">
              {row.words.map((word, wi) => {
                const key = `${ri}-${wi}`
                return (
                  <button key={wi} onClick={() => toggle(ri, wi)}
                    className={`flex-1 px-3 py-3 rounded-xl text-[16px] font-serif font-bold transition-all ${
                      wordStatus[key] === true ? 'bg-green-100 text-green-800 border-2 border-green-400 shadow-sm' :
                      'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
                    }`} style={{ touchAction: 'manipulation' }}>
                    {word}
                  </button>
                )
              })}
            </div>
            {!stoppingRule && rowCount <= 1 && initialized && rows[ri].words.some((_, wi) => wordStatus[`${ri}-${wi}`] !== undefined) && (
              <p className="text-[9px] text-amber-600 mt-1 italic">Stopping rule: 0-1 correct -- this is the ceiling. Stop here.</p>
            )}
            {/* Fall 2026 stops on two consecutive rows missed outright, so the
                warning belongs on the second such row, not on any weak one. */}
            {stoppingRule && ri > 0 && rowCount === 0 && getRowCount(ri - 1) === 0 && initialized && (
              <p className="text-[9px] text-amber-600 mt-1 italic">Stopping rule met: all 5 missed on two rows in a row. Stop here and move on.</p>
            )}
          </div>
        )
      })}
      {stoppingRule && (
        <p className="text-[10px] text-text-tertiary italic">Stopping rule: {stoppingRule}</p>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[12px] font-semibold text-navy">Total: {totalCorrect} / {max}</span>
        <div className="flex gap-2">
          <button onClick={() => {
            const ws: Record<string, boolean> = {}
            rows.forEach((row, ri) => {
              row.words.forEach((_, wi) => { ws[`${ri}-${wi}`] = true })
              updateScore(studentId, `phonics_row${ri + 1}`, row.max)
            })
            setWordStatus(ws); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => {
            setWordStatus({})
            rows.forEach((_, ri) => { updateScore(studentId, `phonics_row${ri + 1}`, 0) })
            setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SYLLABLE COUNTING (Fall 2026 Grade 2 onward)
// ============================================================================
// Scored 0/1 on the count alone. The teacher may read the word for the student
// -- reading it is not what is being probed here.

function SyllableGrid({ sc, studentId, updateScore, words, max }: {
  sc: OralScores
  studentId: string
  updateScore: (sid: string, key: string, val: number | string | null) => void
  words: { key: string; word: string; answer: number }[]
  max: number
}) {
  const total = words.reduce((acc, w) => acc + ((sc[w.key] as number) || 0), 0)
  const anyEntered = words.some(w => sc[w.key] != null)

  return (
    <div className="space-y-2">
      {words.map(w => {
        const val = sc[w.key] as number | null | undefined
        return (
          <div key={w.key} className="flex items-center gap-3 bg-surface-alt/50 rounded-lg px-4 py-2.5">
            <span className="text-[16px] font-serif font-bold text-gray-800 flex-1">{w.word}</span>
            <span className="text-[10px] text-text-tertiary shrink-0">answer: {w.answer}</span>
            <div className="flex gap-1 shrink-0">
              {[0, 1].map(score => (
                <button key={score} onClick={() => updateScore(studentId, w.key, val === score ? null : score)}
                  className={`w-9 h-9 rounded-lg text-[12px] font-bold transition-all ${
                    val === score
                      ? score === 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      : 'bg-surface border border-border text-text-secondary hover:bg-surface-alt'
                  }`} style={{ touchAction: 'manipulation' }}>
                  {score}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[12px] font-semibold text-navy">Total: {anyEntered ? total : '--'} / {max}</span>
        <div className="flex gap-2">
          <button onClick={() => words.forEach(w => updateScore(studentId, w.key, 1))}
            className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => words.forEach(w => updateScore(studentId, w.key, null))}
            className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// CLICKABLE SENTENCE GRID (Grade 2 - like Grade 1 Level C)
// ============================================================================

function SentenceClickableGrid({ sc, studentId, updateScore, sentences }: {
  sc: OralScores
  studentId: string
  updateScore: (sid: string, key: string, val: number | string | null) => void
  sentences: SentenceView[]
}) {
  const [wordStatus, setWordStatus] = useState<Record<string, boolean>>({})
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      const ws: Record<string, boolean> = {}
      sentences.forEach((sent, si) => {
        const saved = sc[`sent_${si + 1}` as keyof OralScores] as number | null | undefined
        if (saved != null && saved > 0) {
          const words = sent.text.split(/\s+/)
          words.forEach((_, wi) => {
            if (wi < saved) ws[`${si}-${wi}`] = true
          })
        }
      })
      setWordStatus(ws)
      setInitialized(true)
    }
  }, [sc, initialized, sentences])

  const toggle = (sentIdx: number, wordIdx: number) => {
    const key = `${sentIdx}-${wordIdx}`
    setWordStatus(prev => {
      const next = { ...prev }
      if (next[key]) { delete next[key] } else { next[key] = true }
      const words = sentences[sentIdx].text.split(/\s+/)
      const sentCount = words.reduce((acc, _, wi) => acc + (next[`${sentIdx}-${wi}`] ? 1 : 0), 0)
      updateScore(studentId, `sent_${sentIdx + 1}`, sentCount)
      return next
    })
    setInitialized(true)
  }

  const getSentCount = (si: number) => {
    const words = sentences[si].text.split(/\s+/)
    return words.reduce((acc, _, wi) => acc + (wordStatus[`${si}-${wi}`] ? 1 : 0), 0)
  }

  const totalCorrect = sentences.reduce((acc, _, si) => acc + getSentCount(si), 0)
  const totalMax = sentences.reduce((acc, s) => acc + s.max, 0)

  return (
    <div className="space-y-4">
      {sentences.map((sent, si) => {
        const words = sent.text.split(/\s+/)
        const sentCount = getSentCount(si)
        return (
          <div key={si} className="bg-surface-alt/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center shrink-0">{si + 1}</span>
                <span className="text-[9px] text-text-tertiary">{sent.focus}</span>
              </div>
              <span className={`text-[11px] font-bold ${sentCount >= sent.max - 1 ? 'text-green-600' : sentCount >= Math.floor(sent.max / 2) ? 'text-amber-600' : 'text-text-tertiary'}`}>
                {sentCount}/{sent.max}
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {words.map((word, wi) => {
                const key = `${si}-${wi}`
                return (
                  <button key={key} onClick={() => toggle(si, wi)}
                    className={`px-2.5 py-2 rounded-lg text-[15px] font-serif transition-all ${
                      wordStatus[key] === true ? 'bg-green-100 text-green-800 border-2 border-green-400' :
                      'bg-white text-gray-800 border-2 border-gray-200 hover:border-navy/40'
                    }`} style={{ touchAction: 'manipulation' }}>
                    {word}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-[12px] font-semibold text-navy">Total: {totalCorrect} / {totalMax}</span>
        <div className="flex gap-2">
          <button onClick={() => {
            const ws: Record<string, boolean> = {}
            sentences.forEach((sent, si) => {
              const words = sent.text.split(/\s+/)
              words.forEach((_, wi) => { ws[`${si}-${wi}`] = true })
              updateScore(studentId, `sent_${si + 1}`, sent.max)
            })
            setWordStatus(ws); setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-green-50 text-green-600 hover:bg-green-100">All correct</button>
          <button onClick={() => {
            setWordStatus({})
            sentences.forEach((_, si) => { updateScore(studentId, `sent_${si + 1}`, 0) })
            setInitialized(true)
          }} className="text-[10px] px-2 py-1 rounded-lg bg-surface-alt text-text-tertiary hover:bg-surface">Reset</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OralTestGrades2to5({ levelTest, teacherClass, isAdmin }: {
  levelTest: LevelTest
  teacherClass: EnglishClass | null
  isAdmin: boolean
}) {
  const { showToast, currentTeacher, confirmDialog } = useApp()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Record<string, OralScores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeClass, setActiveClass] = useState<EnglishClass>(teacherClass || 'Lily')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [showPassageReader, setShowPassageReader] = useState(false)

  const grade = typeof levelTest.grade === 'string' ? parseInt(levelTest.grade) : levelTest.grade
  // Only Grade 2 has authored content versions; every other grade resolves to
  // the legacy constants in this file.
  const g2Content = useMemo(
    () => (grade === 2 ? g2ContentForTest(levelTest as any) : null),
    [grade, levelTest]
  )
  const g3Content = useMemo(
    () => (grade === 3 ? g3ContentForTest(levelTest as any) : null),
    [grade, levelTest]
  )
  const g4Content = useMemo(
    () => (grade === 4 ? g4ContentForTest(levelTest as any) : null),
    [grade, levelTest]
  )
  const g5Content = useMemo(
    () => (grade === 5 ? g5ContentForTest(levelTest as any) : null),
    [grade, levelTest]
  )
  const config = useMemo(
    () => resolveConfig(grade, g2Content, g3Content, g4Content, g5Content),
    [grade, g2Content, g3Content, g4Content, g5Content]
  )

  const [activeSection, setActiveSection] = useState<'phonics' | 'syllables' | 'sentences' | 'passage'>(config?.hasPhonics ? 'phonics' : 'passage')

  // Keys that belong to oral scoring — used to strip written keys on load
  // Everything that belongs to the current passage and is cleared when the
  // teacher switches level. Also the tail of the oral key list below -- the two
  // were maintained separately, and `comp_not_administered` ended up in this
  // one but not that one, so the "not administered" mark was written to the
  // database and then dropped on the next load. Deriving one from the other
  // means a new field cannot go missing from persistence again.
  const PASSAGE_FIELDS = [
    'orf_words_read', 'orf_errors', 'orf_time_seconds', 'orf_word_marks', 'naep',
    'comp_1', 'comp_2', 'comp_3', 'comp_4', 'comp_5', 'comp_not_administered', 'notes',
  ]

  const ORAL_RAW_KEYS = new Set([
    'phonics_row1','phonics_row2','phonics_row3','phonics_row4','phonics_row5',
    'syllable_1','syllable_2','syllable_3','syllable_4','syllable_5',
    'sent_1','sent_2','sent_3','sent_4','sent_5',
    'passage_level','orf_cwpm','orf_accuracy','passages_attempted',
    // Deliberately NOT in PASSAGE_FIELDS: switching passages must not un-finish
    // a session the teacher has already declared over.
    'oral_complete',
    ...PASSAGE_FIELDS,
  ])

  /** The metrics side of ORAL_RAW_KEYS — what Clear removes. */
  const ORAL_CALC_KEYS = [
    'passage_level', 'passage_multiplier', 'cwpm', 'weighted_cwpm',
    'best_weighted_cwpm', 'best_passage_level', 'naep', 'naep_multiplier',
    'accuracy_pct', 'comp_total', 'comp_max', 'comp_answered',
    'comp_not_administered', 'comp_frustration_max',
    'phonics_total', 'phonics_max', 'sentence_total', 'sentence_max',
    'syllable_total', 'syllable_max', 'oral_content_version',
    'passages_attempted', 'standards_baseline',
  ]

  // Lock to prevent overlapping async saves
  const savingRef = useRef(false)

  // Load students and existing scores (strip written keys from local state)
  useEffect(() => {
    (async () => {
      const [{ data: studs }, { data: existing }] = await Promise.all([
        supabase.from('students').select('*').eq('grade', levelTest.grade).eq('is_active', true).order('english_name'),
        supabase.from('level_test_scores').select('*').eq('level_test_id', levelTest.id),
      ])
      if (studs) setStudents(studs)
      const map: Record<string, OralScores> = {}
      if (existing) existing.forEach((s: any) => {
        const full = s.raw_scores || {}
        // Only keep oral keys in local state — never hold written keys
        const oral: OralScores = {}
        for (const k of Object.keys(full)) {
          if (ORAL_RAW_KEYS.has(k)) (oral as any)[k] = full[k]
        }
        map[s.student_id] = oral
      })
      if (studs) studs.forEach(s => { if (!map[s.id]) map[s.id] = {} })
      setScores(map)
      setSavedSnapshot(JSON.parse(JSON.stringify(map)))
      setLoading(false)
    })()
  }, [levelTest.id, levelTest.grade])

  // Track saved state for dirty detection
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, OralScores>>({})
  const scoresRef = useRef(scores)
  const savedSnapshotRef = useRef(savedSnapshot)
  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savedSnapshotRef.current = savedSnapshot }, [savedSnapshot])

  const isStudentDirty = useCallback((sid: string) => {
    return !sameScores(scoresRef.current[sid] || {}, savedSnapshotRef.current[sid] || {})
  }, [])

  // The same question asked during render. `isStudentDirty` reads refs that are
  // only synced in an effect, so it answers for the render before this one --
  // fine for deciding what to save, wrong for a label that has to say "unsaved"
  // the moment a score is entered.
  const studentDirtyNow = (sid: string) =>
    JSON.stringify(scores[sid] || {}) !== JSON.stringify(savedSnapshot[sid] || {})

  // Bumped on every write, so the refresh below can tell whether a save landed
  // while it was fetching.
  const saveSeqRef = useRef(0)

  /**
   * Pull in what other teachers have entered.
   *
   * Saves already skip any student whose scores match the last snapshot, so a
   * stale screen cannot overwrite someone else's work by sitting open. What it
   * COULD do is show a student as blank after another teacher tested them,
   * which invites a second teacher to enter scores over the top. Re-reading
   * every fifteen seconds closes that: students with unsaved local edits are
   * left alone, everyone else picks up whatever is now on the row.
   *
   * The snapshot has to move student by student, alongside the scores. It once
   * moved wholesale -- `setSavedSnapshot(next)`, where `next` carried the live
   * local scores for every student the loop had skipped. One other teacher
   * saving one other student was therefore enough to mark the student being
   * tested right now as saved, while their answers were still only on this
   * screen. The next auto-save skipped them, the next refresh no longer saw
   * them as dirty, and their answers were replaced by the blank row on the
   * server -- roughly fifteen seconds after being entered.
   */
  useEffect(() => {
    const timer = setInterval(async () => {
      if (savingRef.current) return
      const seqBefore = saveSeqRef.current
      const { data, error } = await supabase.from('level_test_scores')
        .select('student_id, raw_scores').eq('level_test_id', levelTest.id)
      if (error || !data || saveSeqRef.current !== seqBefore || savingRef.current) return

      const cur = scoresRef.current
      const nextScores = { ...cur }
      const nextSnap = { ...savedSnapshotRef.current }
      let changed = false
      data.forEach((row: any) => {
        const sid = row.student_id
        // Unsaved local edits: leave both the scores AND the snapshot alone, so
        // the student stays dirty and the next auto-save still writes them.
        if (isStudentDirty(sid)) return
        const oral: OralScores = {}
        for (const k of Object.keys(row.raw_scores || {})) {
          if (ORAL_RAW_KEYS.has(k)) (oral as any)[k] = row.raw_scores[k]
        }
        if (sameScores(oral, cur[sid] || {})) return
        nextScores[sid] = oral
        nextSnap[sid] = JSON.parse(JSON.stringify(oral))
        changed = true
      })
      if (changed) {
        setScores(nextScores)
        setSavedSnapshot(nextSnap)
      }
    }, 15000)
    return () => clearInterval(timer)
  }, [levelTest.id, isStudentDirty])

  // Auto-save: saves dirty students via existing handleSave, then updates snapshot
  const autoSaveRef = useRef<(() => Promise<void>) | null>(null)

  // Filter students by class
  const availableClasses = isAdmin ? ENGLISH_CLASSES : (teacherClass ? [teacherClass] : ENGLISH_CLASSES)
  const classStudents = useMemo(() => students.filter(s => s.english_class === activeClass), [students, activeClass])
  const classCounts = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {}
    ENGLISH_CLASSES.forEach(cls => {
      const s = students.filter(s => s.english_class === cls)
      counts[cls] = { total: s.length, done: s.filter(st => { const sc = scores[st.id]; return sc && (sc.oral_complete || sc.passage_level || sc.orf_cwpm != null) }).length }
    })
    return counts
  }, [students, scores])

  // Fields that belong to the current passage and should be cleared on passage switch
  const updateScore = useCallback((sid: string, key: string, val: number | string | boolean | null | Record<string, unknown>) => {
    setScores(prev => {
      const current = prev[sid] || {}
      // If changing passage_level, archive current passage data and clear fields
      if (key === 'passage_level' && current.passage_level && val !== current.passage_level) {
        const archive: Record<string, any> = { level: current.passage_level }
        PASSAGE_FIELDS.forEach(f => { if (current[f] != null) archive[f] = current[f] })
        // Only archive if there's actual data (not just an empty passage selection)
        const hasData = PASSAGE_FIELDS.some(f => current[f] != null)
        const attempts = Array.isArray(current.passages_attempted) ? [...current.passages_attempted] : []
        if (hasData) attempts.push(archive)
        const cleared: Record<string, any> = { ...current, passage_level: val, passages_attempted: attempts }
        // Null, not `delete`. A save sends only these keys and the row-level
        // merge trigger computes OLD || NEW, so a key that is simply absent is
        // read as "not mentioned" and the previous passage's value stays on the
        // row -- and comes back to this screen on the next refresh, attached to
        // the new passage. Everything here treats null and absent alike.
        PASSAGE_FIELDS.forEach(f => { cleared[f] = null })
        return { ...prev, [sid]: cleared }
      }
      return { ...prev, [sid]: { ...current, [key]: val } }
    })
  }, [])

  const handleSave = async (sids?: string[]) => {
    if (savingRef.current) return
    savingRef.current = true
    saveSeqRef.current++
    setSaving(true)
    // Only save dirty students (not all class students) unless specific sids given
    const toSave = sids || classStudents.filter(s => isStudentDirty(s.id)).map(s => s.id)
    if (toSave.length === 0) { setSaving(false); savingRef.current = false; return }
    let errors = 0
    // What actually reached the database, per student. The snapshot advances to
    // this rather than to the live scores: a teacher who keeps marking during
    // the save round-trip would otherwise have those clicks recorded as saved
    // without ever being written, and wiped by the next refresh.
    const written: Record<string, OralScores> = {}
    for (const sid of toSave) {
      const raw = scoresRef.current[sid] || {}
      const versioned = g2Content?.standards ?? g3Content?.standards ?? g4Content?.standards ?? g5Content?.standards ?? null
      const standards = versioned
        ? calculateVersionedStandards(versioned, raw, config)
        : calculateStandards(grade, raw)
      const wordsRead = (raw.orf_words_read as number) || 0
      const orfErrors = (raw.orf_errors as number) || 0
      const time = (raw.orf_time_seconds as number) || 60
      // Only compute CWPM if student actually has reading data entered
      const calcCwpm = wordsRead > 0 && time > 0 ? Math.round(((wordsRead - orfErrors) / time) * 60) : null
      const calcAccuracy = wordsRead > 0 ? Math.round(((wordsRead - orfErrors) / wordsRead) * 1000) / 10 : null
      const naepVal = (raw.naep as number) || null
      const passageMult = config.passageMultipliers[raw.passage_level as string] || 1.0
      const naepMult = naepVal ? (NAEP_MULTIPLIERS[naepVal] || 1) : 1
      const wCwpm = calcCwpm != null && calcCwpm > 0 ? Math.round(calcCwpm * passageMult * naepMult) : null

      // Best weighted CWPM across ALL attempts (current + archived)
      // If a student tries a harder passage and does better, that score should count
      let bestWeightedCwpm = wCwpm
      let bestPassageLevel = raw.passage_level || null
      const attempts = Array.isArray(raw.passages_attempted) ? raw.passages_attempted : []
      for (const att of attempts) {
        const attWords = (att.orf_words_read as number) || 0
        const attErrors = (att.orf_errors as number) || 0
        const attTime = (att.orf_time_seconds as number) || 60
        const attCwpm = attTime > 0 ? Math.round(((attWords - attErrors) / attTime) * 60) : null
        if (attCwpm != null && attCwpm > 0) {
          const attPassageMult = config.passageMultipliers[att.level as string] || 1.0
          const attNaepMult = att.naep ? (NAEP_MULTIPLIERS[att.naep] || 1) : 1
          const attWeighted = Math.round(attCwpm * attPassageMult * attNaepMult)
          if (bestWeightedCwpm == null || attWeighted > bestWeightedCwpm) {
            bestWeightedCwpm = attWeighted
            bestPassageLevel = att.level || null
          }
        }
      }
      // Comprehension that was never asked, or not yet scored, carries no
      // information: store null rather than 0 so neither is read as "answered
      // everything wrong". A scored 0 is real evidence and IS stored as 0.
      const compSkipped = !!raw.comp_not_administered
      const compScored = [raw.comp_1, raw.comp_2, raw.comp_3, raw.comp_4, raw.comp_5].filter(v => v != null) as number[]
      const compAnswered = compSkipped ? 0 : compScored.length
      const cTotal = compAnswered > 0 ? compScored.reduce((a, b) => a + b, 0) : null
      const pTotal = [raw.phonics_row1, raw.phonics_row2, raw.phonics_row3, raw.phonics_row4, raw.phonics_row5].reduce((a: number, b) => a + ((b as number) || 0), 0)
      const sTotal = [raw.sent_1, raw.sent_2, raw.sent_3, raw.sent_4, raw.sent_5].reduce((a: number, b) => a + ((b as number) || 0), 0)
      // Syllable counting exists only from Fall 2026 on. Null on older tests so
      // it is never read as "scored zero on a component they never sat".
      const sylScored = config.syllables
        ? config.syllables.map(w => raw[w.key]).filter(v => v != null) as number[]
        : []
      const sylTotal = sylScored.length > 0 ? sylScored.reduce((a, b) => a + b, 0) : null

      // Upsert with only oral keys — DB trigger merges with existing written keys
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id,
        student_id: sid,
        raw_scores: raw,
        calculated_metrics: {
          passage_level: raw.passage_level || null,
          passage_multiplier: passageMult,
          cwpm: calcCwpm,
          weighted_cwpm: wCwpm,
          best_weighted_cwpm: bestWeightedCwpm,
          best_passage_level: bestPassageLevel,
          naep: naepVal,
          naep_multiplier: naepMult,
          accuracy_pct: calcAccuracy,
          comp_total: cTotal,
          // Carried even when nothing was scored, so a set that was never
          // administered can still be read against the right denominator.
          comp_max: cTotal != null || compSkipped ? config.compMax : null,
          comp_answered: compAnswered,
          comp_not_administered: compSkipped,
          // Top of the Frustration band. What an unadministered set is scored
          // at in the composite -- see compRatioForComposite.
          comp_frustration_max: config.frustrationCompMax,
          phonics_total: pTotal || null,
          phonics_max: config.phonicsMax,
          sentence_total: sTotal || null,
          sentence_max: config.sentenceMax,
          syllable_total: sylTotal,
          syllable_max: config.syllables ? config.syllableMax : null,
          // Which content the score is to be read against. Without this a
          // future edit to the word lists would silently re-point old results.
          oral_content_version: g2Content?.version ?? g3Content?.version ?? g4Content?.version ?? g5Content?.version ?? null,
          passages_attempted: raw.passages_attempted || [],
          standards_baseline: standards,
        },
        previous_class: students.find(s => s.id === sid)?.english_class || null,
        entered_by: currentTeacher?.id || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) { console.error('Save error:', error); errors++ }
      else written[sid] = JSON.parse(JSON.stringify(raw))
    }
    setSaving(false)
    savingRef.current = false
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved (${toSave.length} student${toSave.length === 1 ? '' : 's'})`)
    // Only the students this save actually wrote. It once advanced the snapshot
    // for the whole roster, so a save of one class marked another class's
    // unsaved work as saved -- and the refresh then erased it from the screen.
    if (Object.keys(written).length > 0) setSavedSnapshot(prev => ({ ...prev, ...written }))
  }

  // Auto-save function for timer/unmount/visibility (silent, no toast for timer)
  const autoSave = useCallback(async (silent = true) => {
    if (savingRef.current) return // prevent overlapping saves
    const currentScores = scoresRef.current
    const snapshot = savedSnapshotRef.current
    const dirty = students.filter(s => {
      const cur = currentScores[s.id]
      if (!cur || Object.keys(cur).length === 0) return false
      return !sameScores(cur, snapshot[s.id] || {})
    })
    if (dirty.length === 0) return
    await handleSave(dirty.map(s => s.id))
  }, [students, handleSave])

  useEffect(() => { autoSaveRef.current = autoSave }, [autoSave])

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => { autoSaveRef.current?.() }, 30000)
    return () => clearInterval(timer)
  }, [])

  // Auto-save on tab visibility change
  useEffect(() => {
    const handler = () => { if (document.hidden) autoSaveRef.current?.() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Auto-save on unmount (teacher switches phases)
  useEffect(() => {
    return () => { autoSaveRef.current?.() }
  }, [])

  // Warn before leaving with unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const cur = scoresRef.current; const snap = savedSnapshotRef.current
      const dirty = students.some(s => !sameScores(cur[s.id] || {}, snap[s.id] || {}))
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [students])

  // Restore a previous passage attempt (swap it with current)
  const restoreAttempt = useCallback((sid: string, attemptIdx: number) => {
    setScores(prev => {
      const current = { ...(prev[sid] || {}) }
      const attempts = Array.isArray(current.passages_attempted) ? [...current.passages_attempted] : []
      if (attemptIdx < 0 || attemptIdx >= attempts.length) return prev
      const toRestore = { ...attempts[attemptIdx] }
      const restoredLevel = toRestore.level
      delete toRestore.level

      // Archive current passage data if it has any
      const hasCurrentData = PASSAGE_FIELDS.some(f => current[f] != null)
      if (hasCurrentData && current.passage_level) {
        const archive: Record<string, any> = { level: current.passage_level }
        PASSAGE_FIELDS.forEach(f => { if (current[f] != null) archive[f] = current[f] })
        attempts[attemptIdx] = archive
      } else {
        attempts.splice(attemptIdx, 1)
      }

      // Clear current passage fields, then apply restored data. Nulled rather
      // than deleted, for the same reason as the passage switch above.
      const updated: Record<string, any> = { ...current }
      PASSAGE_FIELDS.forEach(f => { updated[f] = null })
      updated.passage_level = restoredLevel
      updated.passages_attempted = attempts
      Object.entries(toRestore).forEach(([k, v]) => { updated[k] = v })

      return { ...prev, [sid]: updated }
    })
  }, [])

  // Clear oral data — drops the oral keys server-side, in one transaction, so
  // a teacher marking the written paper at the same moment never sees the row
  // vanish and never has their work re-inserted from this screen's snapshot.
  const clearStudent = async (sid: string, name: string) => {
    if (!await confirmDialog({ title: `Clear oral test scores for ${name}?`, message: 'This cannot be undone.', danger: true, confirmLabel: 'Clear scores' })) return
    const { error } = await supabase.rpc('clear_score_keys', {
      p_level_test_id: levelTest.id,
      p_student_id: sid,
      p_raw_keys: Array.from(ORAL_RAW_KEYS).concat('notes'),
      p_calc_keys: ORAL_CALC_KEYS,
    })
    if (error) { console.error('Clear DB error:', error); showToast('Error clearing scores'); return }
    setScores(prev => ({ ...prev, [sid]: {} }))
    setSavedSnapshot(prev => ({ ...prev, [sid]: {} }))
    saveSeqRef.current++
    showToast(`Cleared oral scores for ${name}`)
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
  if (!config) return <div className="p-12 text-center text-text-tertiary">No oral test configuration for Grade {grade}.</div>

  const student = classStudents[selectedIdx]
  const sc = student ? (scores[student.id] || {}) : {}
  const passageLevel = (sc.passage_level || '') as PassageLevel | ''
  const passage = passageLevel ? config.passages[passageLevel as PassageLevel] : null
  const compQuestions = passageLevel ? config.comprehension[passageLevel as PassageLevel] : []
  const hasNaep = passageLevel ? config.naepLevels.includes(passageLevel as PassageLevel) : false

  /**
   * Has this student been dealt with?
   *
   * Data presence alone was the test, which quietly excluded the students it
   * matters most to get right: a child who could not attempt a passage, answer
   * a question or read a phonics row leaves no trace, so the roster showed
   * them as still to do however many times a teacher sat with them. Marking
   * the session complete is an explicit statement that the testing happened,
   * whatever it produced.
   */
  const studentHasData = (sid: string) => {
    const s = scores[sid] || {}
    return !!(s.oral_complete || s.passage_level || s.orf_cwpm != null || s.phonics_row1 != null)
  }

  // Calculate derived values
  const cwpm = sc.orf_time_seconds && sc.orf_words_read != null && sc.orf_errors != null
    ? Math.round(((sc.orf_words_read - sc.orf_errors) / sc.orf_time_seconds) * 60)
    : null
  const accuracy = sc.orf_words_read && sc.orf_errors != null
    ? Math.round(((sc.orf_words_read - sc.orf_errors) / sc.orf_words_read) * 1000) / 10
    : null
  const livePassageMult = passageLevel ? (config.passageMultipliers[passageLevel] || 1.0) : 1.0
  const liveNaepMult = sc.naep ? (NAEP_MULTIPLIERS[sc.naep] || 1) : 1
  const weightedCwpm = cwpm ? Math.round(cwpm * livePassageMult * liveNaepMult) : cwpm
  const compNotAdministered = !!sc.comp_not_administered

  // Turning the flag on clears any comprehension scores already entered, so a
  // record cannot hold both "not asked" and a set of answers.
  const handleToggleCompNotAdministered = async (sid: string, cur: OralScores) => {
    const compKeys = ['comp_1', 'comp_2', 'comp_3', 'comp_4', 'comp_5'] as const
    if (cur.comp_not_administered) {
      updateScore(sid, 'comp_not_administered', null)
      return
    }
    const entered = compKeys.filter(k => cur[k] != null)
    if (entered.length > 0) {
      const ok = await confirmDialog({
        title: 'Clear comprehension scores?',
        message: `${entered.length} comprehension ${entered.length === 1 ? 'answer has' : 'answers have'} already been scored. Marking the questions as not administered will clear ${entered.length === 1 ? 'it' : 'them'}.`,
        confirmLabel: 'Clear and mark',
        danger: true,
      })
      if (!ok) return
      compKeys.forEach(k => updateScore(sid, k, null))
    }
    updateScore(sid, 'comp_not_administered', true)
  }
  const compTotal = [sc.comp_1, sc.comp_2, sc.comp_3, sc.comp_4, sc.comp_5].reduce((a: number, b) => a + (b || 0), 0)
  const phonicsTotal = [sc.phonics_row1, sc.phonics_row2, sc.phonics_row3, sc.phonics_row4, sc.phonics_row5].reduce((a: number, b) => a + (b || 0), 0)
  const sentTotal = [sc.sent_1, sc.sent_2, sc.sent_3, sc.sent_4, sc.sent_5].reduce((a: number, b) => a + (b || 0), 0)
  const syllableTotal = config.syllables
    ? config.syllables.reduce((a, w) => a + ((sc[w.key] as number) || 0), 0)
    : 0
  const hasSyllableData = !!config.syllables && config.syllables.some(w => sc[w.key] != null)


  return (
    <div className="flex h-[calc(100vh-220px)]">
      {/* Student List Sidebar */}
      <div className="w-64 border-r border-border bg-surface-alt/50 overflow-y-auto flex-shrink-0">
        {/* Class tabs */}
        <div className="px-3 py-2 border-b border-border bg-surface flex flex-wrap gap-1">
          {ENGLISH_CLASSES.map(cls => {
            const avail = availableClasses.includes(cls)
            const count = classCounts[cls]
            return (
              <button key={cls} onClick={() => { if (avail) { setActiveClass(cls); setSelectedIdx(0) } }}
                disabled={!avail}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                  activeClass === cls ? 'text-white shadow-sm' :
                  avail ? 'text-text-secondary hover:bg-surface-alt' : 'opacity-30 cursor-not-allowed'
                }`}
                style={activeClass === cls ? { backgroundColor: classToColor(cls), color: classToTextColor(cls) } : {}}>
                {cls.slice(0, 3)}
                {count && <span className="ml-0.5 opacity-70">{count.done}/{count.total}</span>}
              </button>
            )
          })}
        </div>
        <div className="px-4 py-2 border-b border-border bg-surface">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Students</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">
            {classStudents.filter(s => studentHasData(s.id)).length}/{classStudents.length} entered
          </p>
        </div>
        <div className="py-1">
          {classStudents.map((s, idx) => {
            const done = studentHasData(s.id)
            const studentSc = scores[s.id] || {}
            return (
              <button key={s.id} onClick={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left transition-all ${
                  idx === selectedIdx ? 'bg-navy/10 border-r-2 border-navy' : 'hover:bg-surface-alt'
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
                {studentSc.passage_level && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">{studentSc.passage_level}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Entry Form */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!student ? (
          <div className="p-8 text-center text-text-tertiary">No students in {activeClass}.</div>
        ) : (
          <>
            {/* Student Header + Nav */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-navy">{student.english_name}</h3>
                <p className="text-[12px] text-text-secondary">{student.korean_name} -- {student.english_class} -- Grade {grade}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Clear Student */}
                {studentHasData(student.id) && (
                  <button onClick={() => clearStudent(student.id, student.english_name)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-red-500 hover:bg-red-50 border border-red-200">
                    <RotateCcw size={12} /> Clear
                  </button>
                )}
                <button onClick={() => { handleSave([student.id]); if (selectedIdx > 0) setSelectedIdx(selectedIdx - 1) }}
                  disabled={selectedIdx === 0 || saving}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30">
                  <ChevronLeft size={14} /> Prev
                </button>
                <button onClick={() => handleSave([student.id])} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-semibold bg-navy text-white hover:bg-navy/90 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save
                </button>
                <button onClick={() => { handleSave([student.id]); if (selectedIdx < classStudents.length - 1) setSelectedIdx(selectedIdx + 1) }}
                  disabled={selectedIdx === classStudents.length - 1 || saving}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-30">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Before-you-start notes: the universal ones, then the oral-test
                ones, then whatever this grade's guide adds. */}
            <TestNotesPanel
              storageKey={`oral-g${grade}`}
              groups={[
                { label: 'Oral test', notes: ORAL_TEST_NOTES },
                ...(config.adminNotes.length > 0
                  ? [{ label: config.contentLabel ? `${config.contentLabel} notes` : 'This test', notes: config.adminNotes }]
                  : []),
              ]}
            />

            {/* Section tabs (Grade 2 has Phonics + Sentences + Passage; others just Passage) */}
            {config.hasPhonics && (
              <div className="flex gap-1 mb-5 bg-surface-alt rounded-xl p-1">
                <button onClick={() => setActiveSection('phonics')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'phonics' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  1. Phonics
                  {phonicsTotal > 0 && <span className="ml-1 text-[9px] opacity-70">({phonicsTotal}/{config.phonicsMax})</span>}
                </button>
                {config.syllables && (
                  <button onClick={() => setActiveSection('syllables')}
                    className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'syllables' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                    2. Syllables
                    {hasSyllableData && <span className="ml-1 text-[9px] opacity-70">({syllableTotal}/{config.syllableMax})</span>}
                  </button>
                )}
                <button onClick={() => setActiveSection('sentences')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'sentences' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  {config.syllables ? '3' : '2'}. Sentences
                  {sentTotal > 0 && <span className="ml-1 text-[9px] opacity-70">({sentTotal}/{config.sentenceMax})</span>}
                </button>
                <button onClick={() => setActiveSection('passage')}
                  className={`flex-1 px-4 py-2 rounded-lg text-[11px] font-semibold transition-all ${activeSection === 'passage' ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface'}`}>
                  {config.syllables ? '4' : '3'}. Passage
                  {passageLevel && <span className="ml-1 text-[9px] opacity-70">(Lv {passageLevel})</span>}
                </button>
              </div>
            )}

            {/* ═══ PHONICS SCREENER (Grade 2 only) ═══ */}
            {activeSection === 'phonics' && config.hasPhonics && (
              <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                <h4 className="text-[13px] font-semibold text-navy mb-1 flex items-center gap-2">
                  <Mic size={15} /> Component 1: Phonics Screener
                </h4>
                <p className="text-[11px] text-text-secondary mb-4">
                  {config.scripts.phonics
                    ? <>Say: &ldquo;{config.scripts.phonics}&rdquo; Tap each word: green = correct, tap again = incorrect. Self-corrections count as correct.</>
                    : <>Show the word card. Say: &ldquo;Read each word out loud. Do your best.&rdquo; Tap each word: green = correct, tap again = incorrect. If student gets 0-1 on a row, stop.</>}
                </p>
                {g2Content && (
                  <p className="text-[10px] text-text-tertiary italic mb-3">{g2Content.oral.phonics.l1Note}</p>
                )}
                <PhonicsClickableGrid key={student.id} sc={sc} studentId={student.id} updateScore={updateScore}
                  rows={config.phonicsRows} max={config.phonicsMax}
                  stoppingRule={g2Content?.oral.phonics.stoppingRule} />
              </div>
            )}

            {/* ═══ SYLLABLE COUNTING (Fall 2026 Grade 2 onward) ═══ */}
            {activeSection === 'syllables' && config.syllables && (
              <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                <h4 className="text-[13px] font-semibold text-navy mb-1 flex items-center gap-2">
                  <Mic size={15} /> Component 2: Syllable Counting
                </h4>
                <p className="text-[11px] text-text-secondary mb-3">
                  Say: &ldquo;{config.scripts.syllables}&rdquo;
                </p>
                {g2Content?.oral.syllables.modelWord && (
                  <p className="text-[11px] text-amber-700 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                    Model <strong>{g2Content.oral.syllables.modelWord.word}</strong> ({g2Content.oral.syllables.modelWord.answer}) first. The model is not scored.
                  </p>
                )}
                <ul className="text-[10px] text-text-tertiary space-y-1 mb-4 list-disc pl-4">
                  {g2Content?.oral.syllables.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
                <SyllableGrid key={student.id} sc={sc} studentId={student.id} updateScore={updateScore}
                  words={config.syllables} max={config.syllableMax} />
              </div>
            )}

            {/* ═══ SENTENCE READING (Grade 2 only) ═══ */}
            {activeSection === 'sentences' && config.hasSentences && (
              <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                <h4 className="text-[13px] font-semibold text-navy mb-1 flex items-center gap-2">
                  <BookOpen size={15} /> Component {config.syllables ? 3 : 2}: Sentence Reading
                </h4>
                <p className="text-[11px] text-text-secondary mb-4">
                  Say: &ldquo;{config.scripts.sentences || 'Now read these sentences out loud. Do your best.'}&rdquo; Tap each word: green = correct, tap again = incorrect.
                </p>
                <SentenceClickableGrid key={student.id} sc={sc} studentId={student.id} updateScore={updateScore}
                  sentences={config.sentences} />
              </div>
            )}

            {/* ═══ PASSAGE READING ═══ */}
            {(activeSection === 'passage' || !config.hasPhonics) && (
              <>
                {/* Passage Level Selector */}
                <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                  <h4 className="text-[13px] font-semibold text-navy mb-3 flex items-center gap-2">
                    <BookOpen size={15} /> {config.hasPhonics ? 'Component 3: ' : ''}Passage Reading
                  </h4>
                  <p className="text-[11px] text-text-secondary mb-3">
                    Select a passage level based on the student's reading ability. Click "Open Passage" to do a timed reading with word-by-word marking.
                    You do not have to start at {config.levels[0]} {'\u2014'} start where the student will be comfortable.
                  </p>

                  {/* Teacher script, with the stopping guidance directly under
                      it: that is the moment it is needed, not the top of the
                      screen. */}
                  {config.scripts.reading && (
                    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/60 px-3.5 py-2.5">
                      <p className="text-[11px] font-semibold text-blue-800">Say: &ldquo;{config.scripts.reading}&rdquo;</p>
                      <ul className="mt-1.5 space-y-0.5 pl-4 list-disc">
                        {STOPPING_NOTES.map((n, i) => (
                          <li key={i} className="text-[10px] text-blue-700/90 leading-snug">{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    {config.levels.map(level => {
                      const p = config.passages[level]
                      if (!p) return null
                      return (
                        <button key={level} onClick={async () => {
                          if (passageLevel && level !== passageLevel && PASSAGE_FIELDS.some(f => sc[f] != null)) {
                            if (!await confirmDialog({ title: `Switch from passage ${passageLevel} to ${level}?`, message: 'Current scores will be archived and a fresh entry started.', confirmLabel: 'Switch' })) return
                          }
                          updateScore(student.id, 'passage_level', level)
                        }}
                          className={`flex-1 px-3 py-3 rounded-xl text-center transition-all ${
                            passageLevel === level
                              ? 'bg-navy text-white shadow-sm ring-2 ring-navy/30'
                              : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                          }`}>
                          <div className="text-[14px] font-bold">{level}</div>
                          <div className="text-[10px] mt-0.5 opacity-80">{p.title}</div>
                          <div className="text-[9px] mt-0.5 opacity-60">{p.wordCount}w</div>
                          <div className={`text-[8px] mt-0.5 font-semibold ${config.passageMultipliers[level] === 1.0 ? 'opacity-80' : 'opacity-60'}`}>×{config.passageMultipliers[level]?.toFixed(2)}</div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Previous attempts -- click to restore */}
                  {Array.isArray(sc.passages_attempted) && sc.passages_attempted.length > 0 && (
                    <div className="mb-4 bg-amber-50/50 border border-amber-100 rounded-lg px-3 py-2">
                      <p className="text-[9px] uppercase tracking-wider text-amber-700 font-semibold mb-1">Previous Attempts (click to restore)</p>
                      <div className="flex gap-2 flex-wrap">
                        {sc.passages_attempted.map((att: any, i: number) => (
                          <button key={i} onClick={async () => {
                            if (!await confirmDialog({ title: `Restore the Level ${att.level} attempt?`, message: 'Current passage data will be swapped into the archive.', confirmLabel: 'Restore' })) return
                            restoreAttempt(student.id, i)
                          }}
                            className="inline-flex items-center gap-1.5 text-[10px] text-amber-800 bg-amber-100/60 hover:bg-amber-200/80 border border-amber-200 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer">
                            <RotateCcw size={10} />
                            <span className="font-bold">Lv {att.level}</span>
                            {att.orf_words_read != null && att.orf_errors != null && att.orf_time_seconds ? (
                              <span className="text-text-tertiary">
                                {Math.round(((att.orf_words_read - att.orf_errors) / (att.orf_time_seconds || 60)) * 60)} CWPM
                              </span>
                            ) : null}
                            {att.comp_not_administered ? (
                              <span className="text-text-tertiary italic">Comp n/a</span>
                            ) : att.comp_1 != null ? (
                              <span className="text-text-tertiary">
                                Comp {[att.comp_1, att.comp_2, att.comp_3, att.comp_4, att.comp_5].reduce((a: number, b: any) => a + (b || 0), 0)}/{config.compMax}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected passage info + open button */}
                  {passage && (
                    <div className="bg-green-50/50 rounded-lg px-4 py-3 border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-navy">Level {passageLevel}: {passage.title}</p>
                        <p className="text-[10px] text-text-secondary">
                          {passage.wordCount} words
                          {passage.genre ? ` | ${passage.genre}` : ''}
                          {` | weight ${(config.passageMultipliers[passageLevel] ?? 1).toFixed(2)}`}
                        </p>
                      </div>
                      <button onClick={() => setShowPassageReader(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-all">
                        <BookOpen size={14} />
                        {sc.orf_words_read ? 'Re-open' : 'Open'} Passage
                      </button>
                    </div>
                  )}
                </div>

                {/* ORF Results (shown when passage selected) */}
                {passage && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-4">Oral Reading Fluency Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Words Read</label>
                        <input type="number" min={0} max={passage.wordCount}
                          value={sc.orf_words_read ?? ''}
                          onChange={e => updateScore(student.id, 'orf_words_read', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Errors</label>
                        <input type="number" min={0}
                          value={sc.orf_errors ?? ''}
                          onChange={e => updateScore(student.id, 'orf_errors', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Time (seconds)</label>
                        <input type="number" min={1}
                          value={sc.orf_time_seconds ?? ''}
                          onChange={e => updateScore(student.id, 'orf_time_seconds', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface"
                          placeholder="--"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">CWPM</label>
                        <div className={`px-3 py-2 rounded-lg text-[16px] font-bold text-center ${cwpm ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-surface-alt text-text-tertiary border border-border'}`}>
                          {cwpm ?? '--'}
                        </div>
                      </div>
                    </div>
                    {accuracy != null && (
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-text-secondary">Accuracy:</span>
                        <span className={`font-bold ${accuracy >= INDEPENDENT_ACCURACY ? 'text-green-600' : accuracy >= FRUSTRATION_ACCURACY ? 'text-amber-600' : 'text-red-600'}`}>
                          {accuracy}%
                        </span>
                        <span className="text-text-tertiary">
                          {accuracy >= INDEPENDENT_ACCURACY ? '(Independent)' : accuracy >= FRUSTRATION_ACCURACY ? '(Instructional)' : '(Frustration -- consider one level down)'}
                        </span>
                        {weightedCwpm && weightedCwpm !== cwpm && (
                          <>
                            <span className="text-text-tertiary mx-2">|</span>
                            <span className="text-text-secondary">Adjusted:</span>
                            <span className="font-bold text-navy">{weightedCwpm}</span>
                            <span className="text-text-tertiary text-[9px]">
                              ({cwpm} × {livePassageMult !== 1 ? `Lv${passageLevel}:${livePassageMult}` : ''}{livePassageMult !== 1 && liveNaepMult !== 1 ? ' × ' : ''}{liveNaepMult !== 1 ? `NAEP:${liveNaepMult}` : ''})
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* NAEP Rating */}
                {passage && hasNaep && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-3">NAEP Oral Reading Fluency Rating</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {([1, 2, 3, 4] as const).map(n => (
                        <button key={n} onClick={() => updateScore(student.id, 'naep', sc.naep === n ? null : n)}
                          className={`p-3 rounded-xl text-left transition-all ${
                            sc.naep === n
                              ? 'bg-navy text-white ring-2 ring-navy/30'
                              : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80 border border-border'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              sc.naep === n ? 'bg-white/20' : 'bg-navy/10 text-navy'
                            }`}>{n}</span>
                            <span className={`text-[12px] font-semibold ${sc.naep === n ? '' : 'text-navy'}`}>{NAEP_LABELS[n].label}</span>
                          </div>
                          <p className={`text-[10px] mt-1 ${sc.naep === n ? 'opacity-80' : 'text-text-tertiary'}`}>
                            {NAEP_LABELS[n].desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comprehension Questions */}
                {passage && compQuestions.length > 0 && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-1">Comprehension Questions</h4>
                    <p className="text-[10px] text-text-tertiary mb-3">
                      {compNotAdministered
                        ? 'Not administered — excluded from this student\'s score.'
                        : <>Score each question 0-{config.compScoreMax}. Total: {compTotal} / {config.compMax}</>}
                    </p>

                    {/* Not-administered switch. A student stopped mid-passage never
                        heard these questions -- zeros would read as "answered wrong". */}
                    <label className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-4 cursor-pointer border transition-all ${
                      compNotAdministered
                        ? 'bg-slate-100 border-slate-300'
                        : 'bg-surface-alt/60 border-border hover:border-navy/30'
                    }`}>
                      <input type="checkbox" checked={compNotAdministered}
                        onChange={() => handleToggleCompNotAdministered(student.id, sc)}
                        className="w-4 h-4 mt-0.5 rounded border-2 border-navy/30 text-slate-600 focus:ring-slate-500 shrink-0" />
                      <span>
                        <span className="text-[11px] font-semibold text-text-primary flex items-center gap-1.5">
                          <Ban size={11} className="text-slate-500" />
                          Student struggled &mdash; comprehension not administered
                        </span>
                        <span className="block text-[10px] text-text-tertiary mt-0.5">
                          Check this when the student was stopped during the passage and never heard the questions.
                          Comprehension is then excluded from the score rather than counted as zero.
                        </span>
                      </span>
                    </label>

                    <div
                      aria-disabled={compNotAdministered}
                      className={`space-y-4 transition-opacity ${compNotAdministered ? 'opacity-40 pointer-events-none select-none' : ''}`}
                    >
                      {compQuestions.map((cq, qi) => {
                        const key = `comp_${qi + 1}` as keyof OralScores
                        const val = sc[key] as number | null | undefined
                        return (
                          <div key={qi} className="bg-surface-alt/50 rounded-lg p-3.5">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{qi + 1}</span>
                              <div className="flex-1">
                                <p className="text-[12px] font-medium text-text-primary">{cq.q}</p>
                                <p className="text-[10px] text-text-tertiary mt-0.5">
                                  <span className={`font-semibold ${cq.dok === 'DOK 1' ? 'text-blue-600' : cq.dok === 'DOK 2' ? 'text-amber-600' : 'text-green-600'}`}>{cq.dok}</span>
                                  {!cq.anchors && <><span className="mx-1.5">--</span>Expected: {cq.expected}</>}
                                </p>
                                {/* Where the guide gives an anchor per score, show
                                    them all: picking between 1 and 2 is the whole
                                    judgment, and one "expected" line hides it. */}
                                {cq.anchors && (
                                  <ul className="mt-1 space-y-0.5">
                                    {cq.anchors.map((a, ai) => (
                                      <li key={ai} className="text-[10px] text-text-tertiary flex gap-1.5">
                                        <span className={`font-bold shrink-0 ${ai === 0 ? 'text-red-500' : ai === cq.anchors!.length - 1 ? 'text-green-600' : 'text-amber-600'}`}>{ai}</span>
                                        <span>{a}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {cq.note && (
                                  <p className="text-[10px] text-amber-700 bg-amber-50/60 border border-amber-100 rounded px-2 py-1 mt-1.5">{cq.note}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {Array.from({ length: config.compScoreMax + 1 }, (_, score) => (
                                  <button key={score} onClick={() => updateScore(student.id, key as string, val === score ? null : score)}
                                    className={`w-8 h-8 rounded-lg text-[12px] font-bold transition-all ${
                                      val === score
                                        ? score === 0 ? 'bg-red-500 text-white'
                                          : score === config.compScoreMax ? 'bg-green-500 text-white'
                                          : score === 1 ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                                        : 'bg-surface border border-border text-text-secondary hover:bg-surface-alt'
                                    }`}>
                                    {score}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-navy">
                        Comprehension Total: {compNotAdministered ? <span className="text-text-tertiary">Not administered</span> : `${compTotal} / ${config.compMax}`}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        {compNotAdministered
                          ? 'Excluded from scoring'
                          : compTotal >= config.compMax * 0.8 ? 'Strong comprehension'
                          : compTotal >= config.compMax * 0.53 ? 'Adequate comprehension'
                          : compTotal > 0 ? 'Below expectations' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Teacher Notes */}
                {passage && (
                  <div className="bg-surface border border-border rounded-xl p-5 mb-4">
                    <h4 className="text-[13px] font-semibold text-navy mb-2">Teacher Notes</h4>
                    <textarea
                      value={sc.notes || ''}
                      onChange={e => updateScore(student.id, 'notes', e.target.value || null)}
                      placeholder="Observations, reading behaviors, error patterns, intervention notes..."
                      className="w-full min-h-[60px] px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 bg-surface resize-y placeholder:text-text-tertiary/50"
                    />
                  </div>
                )}

                {/* Summary card when data exists */}
                {cwpm && (
                  <div className="bg-gradient-to-r from-navy/5 to-gold/5 border border-navy/10 rounded-xl p-5">
                    <h4 className="text-[12px] font-semibold text-navy mb-3">Summary for {student.english_name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Passage</div>
                        <div className="text-[16px] font-bold text-navy">Level {passageLevel}</div>
                        <div className="text-[9px] text-text-tertiary">{passage?.title}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">CWPM</div>
                        <div className="text-[16px] font-bold text-green-600">{cwpm}</div>
                        {weightedCwpm && weightedCwpm !== cwpm && <div className="text-[9px] text-text-tertiary">Adjusted: {weightedCwpm} ({passageLevel})</div>}
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Accuracy</div>
                        <div className={`text-[16px] font-bold ${accuracy != null && accuracy >= INDEPENDENT_ACCURACY ? 'text-green-600' : accuracy != null && accuracy >= FRUSTRATION_ACCURACY ? 'text-amber-600' : 'text-red-600'}`}>
                          {accuracy}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-text-tertiary uppercase">Comprehension</div>
                        <div className="text-[16px] font-bold text-navy" title={compNotAdministered ? 'Student was stopped during the passage; the questions were never asked.' : undefined}>
                          {compNotAdministered ? <span className="text-text-tertiary text-[13px]">n/a</span> : `${compTotal} / ${config.compMax}`}
                        </div>
                      </div>
                    </div>
                    {config.hasPhonics && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-navy/10">
                        <div className="text-center">
                          <div className="text-[10px] text-text-tertiary uppercase">Phonics</div>
                          <div className="text-[14px] font-bold text-navy">{phonicsTotal} / {config.phonicsMax}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-text-tertiary uppercase">Sentences</div>
                          <div className="text-[14px] font-bold text-navy">{sentTotal} / {config.sentenceMax}</div>
                        </div>
                      </div>
                    )}

                    {/* CCSS Standards */}
                    {(() => {
                      const versionedStds = g2Content?.standards ?? g3Content?.standards ?? g4Content?.standards ?? g5Content?.standards ?? null
                      const stds = versionedStds
                        ? calculateVersionedStandards(versionedStds, sc, config)
                        : calculateStandards(grade, sc)
                      const met = stds.filter(s => s.met).length
                      return stds.length > 0 ? (
                        <div className="mt-3 pt-3 border-t border-navy/10">
                          <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">CCSS Standards ({met}/{stds.length} met)</p>
                          <div className="flex flex-wrap gap-1.5">
                            {stds.map((std, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                                std.met ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                              }`}>{std.code}</span>
                            ))}
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </>
            )}

            {/* Save, again, at the bottom. The oral form runs well past one
                screen, so by the time a session finishes the header button is
                scrolled out of sight -- and that scroll back up is where
                saving gets forgotten. */}
            <div className="mt-8 mb-2 pt-5 border-t border-border">
              {/* Marks the session finished even when it produced nothing to
                  score. Saves immediately: a teacher who presses this is done
                  with the child in front of them and is about to call the next. */}
              <button
                onClick={() => { updateScore(student.id, 'oral_complete', !sc.oral_complete); setTimeout(() => handleSave([student.id]), 0) }}
                disabled={saving}
                className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[14px] font-bold mb-3 border-2 transition-all disabled:opacity-50 ${
                  sc.oral_complete
                    ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                    : 'bg-surface text-navy border-navy/25 hover:border-navy/50 hover:bg-surface-alt'}`}>
                {sc.oral_complete ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                {sc.oral_complete ? 'Test complete' : 'Mark test complete'}
              </button>
              {!sc.oral_complete && !studentHasData(student.id) && (
                <p className="text-[10px] text-text-tertiary text-center mb-3 -mt-1">
                  Use this for a student who sat the test but could not attempt anything &mdash; it records that the session happened.
                </p>
              )}
              <button onClick={() => handleSave([student.id])} disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-[16px] font-bold bg-navy text-white hover:bg-navy/90 disabled:opacity-50 shadow-md transition-all">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Saving...' : `Save ${student.english_name}`}
              </button>
              <div className="flex items-center justify-center gap-3 mt-2">
                <span className={`text-[11px] ${studentDirtyNow(student.id) ? 'text-amber-600 font-semibold' : 'text-text-tertiary'}`}>
                  {studentDirtyNow(student.id) ? 'Unsaved changes' : 'All changes saved'}
                </span>
                {selectedIdx < classStudents.length - 1 && (
                  <button onClick={() => { handleSave([student.id]); setSelectedIdx(selectedIdx + 1) }} disabled={saving}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:underline disabled:opacity-40">
                    Save and go to {classStudents[selectedIdx + 1].english_name} <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Passage Reader Modal */}
      {showPassageReader && passage && passageLevel && (
        <PassageReaderModal
          passage={passage}
          level={passageLevel as PassageLevel}
          readingLevels={config.readingLevels}
          prevLevel={config.levels[config.levels.indexOf(passageLevel as PassageLevel) - 1] ?? null}
          initialData={{ wordsRead: sc.orf_words_read, errors: sc.orf_errors, timeSeconds: sc.orf_time_seconds, wordMarks: sc.orf_word_marks }}
          onSave={(data) => {
            updateScore(student.id, 'orf_words_read', data.wordsRead)
            updateScore(student.id, 'orf_errors', data.errors)
            updateScore(student.id, 'orf_time_seconds', data.timeSeconds)
            updateScore(student.id, 'orf_word_marks', data.wordMarks)
            if (data.notes) updateScore(student.id, 'notes', data.notes)
          }}
          onClose={() => setShowPassageReader(false)}
        />
      )}
    </div>
  )
}
