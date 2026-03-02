'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Save, RotateCcw, Loader2, BarChart3, Check, X, Users, BookOpen, Eye } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type EnglishClass = 'Lily' | 'Daisy' | 'Rose' | 'Tulip' | 'Iris' | 'Snapdragon'

interface LevelTest { id: string; grade: number | string; name: string; status: string; semester: string }

interface QuestionDef {
  qNum: number
  section: string        // 'listening' | 'reading1' | 'reading2' | 'language1' | 'language2' | 'reading3'
  sectionLabel: string   // Display name e.g. "Listening", "Reading: Kate's Cake"
  text: string           // Short question text
  correct: string        // 'a' | 'b' | 'c' | 'd'
  standard: string       // e.g. 'RI.2.2'
  standardDesc: string   // Brief description
  dok: number
  domain: string         // 'Listening Comprehension' | 'Reading Comprehension' | 'Language/Grammar' | etc
}

interface WritingCategory {
  key: string
  label: string
  max: number
  standard: string
  standardDesc: string
}

// Rubric descriptors per grade — keyed by category key, then score level
type RubricDescriptors = Record<string, string[]>  // key -> [level0, level1, level2, ...]

// Multi-grade CCSS standard expansion
// Grade 2 → K/1/2, Grade 3 → 1/2/3, Grade 4 → 2/3/4, Grade 5 → 3/4/5
function expandStandard(standard: string, grade: number): string {
  // Parse standard format: "RI.5.1", "L.3.1d", "SL.4.2", "RF.2.3", "W.K.2"
  const match = standard.match(/^([A-Z]+)\.(\w+)\.(.+)$/)
  if (!match) return standard
  const [, domain, , suffix] = match
  
  // Determine grade range: current and 2 below (min K)
  const gradeLabels: string[] = []
  for (let g = Math.max(0, grade - 2); g <= grade; g++) {
    gradeLabels.push(g === 0 ? 'K' : String(g))
  }
  
  return gradeLabels.map(g => `${domain}.${g}.${suffix}`).join(' · ')
}

const GRADE_2_RUBRIC_DESC: RubricDescriptors = {
  completeness: [
    'No writing attempted or no English.',
    'Writing attempts to address 1 question only.',
    'Writing addresses 2 of the 4 questions.',
    'Writing addresses 3 of the 4 questions.',
    'Writing addresses all 4 questions but some lack detail.',
    'Writing fully addresses all 4 questions (what animal, appearance, habitat, and reason) with detail.',
  ],
  content: [
    'No written sentences.',
    '1–2 basic sentences. Names the animal with little or no detail.',
    '3–4 basic sentences. Basic description with limited detail (e.g., "It is big. It is brown.").',
    '5+ basic sentences. Includes some descriptive detail or gives a reason with explanation.',
    '5+ good sentences. Good detail about appearance, habitat, and reason. Some facts or personal connection.',
    '5+ great sentences. Rich, specific detail. Goes beyond basic description (e.g., facts, comparisons, feelings, personal experiences).',
  ],
  language: [
    'No intelligible English sentences.',
    'Significant errors make meaning difficult. Some English structure present.',
    'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I like...", "It is...").',
    'Some errors but meaning is always clear. Attempts some sentence variety.',
    'Mostly correct grammar. Some varied structures. Consistent subject-verb agreement.',
    'Strong grammar for grade level. Varied sentence structures. Confident use of English.',
  ],
  mechanics: [
    'No evidence of capitalization, punctuation, or recognizable spelling.',
    'Minimal punctuation/capitalization. Many misspellings, but words recognizable.',
    'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled.',
    'Capitalization and end punctuation present on most sentences. A few common words misspelled.',
    'Consistent capitalization and end punctuation. High-frequency words correct. Phonetic attempts at harder words acceptable.',
    'Strong control of mechanics. Correct spelling of grade-level words. Punctuation used accurately throughout.',
  ],
}

const GRADE_3_RUBRIC_DESC: RubricDescriptors = {
  brainstorm: [
    'Blank or no English attempted.',
    '1–2 fields filled with single English words, may be unrelated to picture.',
    'Some fields filled. Basic English words or short phrases that connect to the picture.',
    'Most fields completed with relevant ideas. Shows understanding of story elements.',
    'All fields completed with relevant, detailed ideas. Characters, setting, events, feelings, and ending all connect to the picture.',
  ],
  structure: [
    'No sentences written (brainstorm only or blank).',
    'Writing present but no identifiable structure — random sentences or list of observations.',
    'Attempts beginning and middle but no clear ending, OR events are out of order.',
    'Has beginning, middle, and end, but one part is weak or has a minor gap.',
    'Clear beginning, middle, and end. Events are sequenced logically. Easy to follow.',
  ],
  content: [
    'No written sentences.',
    '1–3 sentences. Minimal content — labels or very simple observations.',
    '4–5 sentences. Basic description of picture with limited story development.',
    '6–7 sentences. Most story elements present. Some detail beyond the picture.',
    '8+ sentences. Includes characters, setting, actions, and feelings. Imaginative detail beyond the picture.',
  ],
  language: [
    'No intelligible English sentences.',
    'Significant errors make meaning difficult. Some English structure present.',
    'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I see…").',
    'Some errors but meaning is always clear. Attempts sentence variety.',
    'Mostly correct grammar. Varied sentence structures. Consistent subject-verb agreement and verb tenses.',
  ],
  mechanics: [
    'No evidence of capitalization, punctuation, or recognizable spelling.',
    'Minimal punctuation/capitalization. Many misspellings, but words recognizable.',
    'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled.',
    'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled.',
    'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Phonetic attempts at harder words are acceptable.',
  ],
}

const GRADE_4_RUBRIC_DESC: RubricDescriptors = {
  brainstorm: [
    'Blank or no English attempted.',
    '1–2 fields filled with single English words, may be unrelated to pictures.',
    'Some fields filled. Basic English words or short phrases that connect to the pictures.',
    'Most fields completed with relevant ideas. Shows understanding of story elements across the three pictures.',
    'All fields completed with relevant, detailed ideas. Characters, setting, events, feelings, and ending all connect to the pictures.',
  ],
  structure: [
    'No sentences written (brainstorm only or blank).',
    'Writing present but no identifiable structure — random sentences or list of observations about the pictures.',
    'Attempts beginning and middle but no clear ending, OR events are out of order. Pictures not clearly connected.',
    'Has beginning, middle, and end that follow the three pictures, but one part is weak or has a gap.',
    'Clear beginning, middle, and end that logically follow the three pictures. Events are well-sequenced. Easy to follow.',
  ],
  content: [
    'No written sentences.',
    '1–4 sentences. Minimal content — labels or very simple observations about the pictures.',
    '5–7 sentences. Basic description of the pictures with limited story development. Mostly tells what is seen.',
    '8–9 sentences. Most story elements present. Some detail beyond the pictures (dialogue, feelings, names).',
    '10+ sentences. Includes characters, setting, actions, feelings, and dialogue. Imaginative detail beyond the pictures (inner thoughts, backstory, creative additions).',
  ],
  language: [
    'No intelligible English sentences.',
    'Significant errors make meaning difficult. Some English structure present.',
    'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("They go...", "They are...").',
    'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, dialogue, different starters).',
    'Mostly correct grammar. Varied sentence structures including compound/complex sentences. Consistent verb tenses and subject-verb agreement. Dialogue punctuated correctly or nearly so.',
  ],
  mechanics: [
    'No evidence of capitalization, punctuation, or recognizable spelling.',
    'Minimal punctuation/capitalization. Many misspellings, but words recognizable.',
    'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled.',
    'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled.',
    'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Attempted to use quotation marks for dialogue. More advanced diction.',
  ],
}

const GRADE_5_RUBRIC_DESC: RubricDescriptors = {
  brainstorm: [
    'Blank or no English attempted.',
    '1–2 fields filled with single English words, may be unrelated to prompt.',
    'Some fields filled. Basic English words or short phrases that connect to the trip prompt.',
    'Most fields completed with relevant ideas. Shows understanding of story elements (where, how, what happened, ending).',
    'All fields completed with relevant, detailed ideas. Destination, travel, activities, highlights, and ending all clearly planned.',
  ],
  structure: [
    'No sentences written (brainstorm only or blank).',
    'Writing present but no identifiable structure — random sentences or unconnected ideas about travel.',
    'Attempts beginning and middle but no clear ending, OR events are out of order. Trip sequence is unclear.',
    'Has beginning, middle, and end that follow a logical trip sequence.',
    'Clear beginning, middle, and end. Events are well-sequenced and follow a natural trip timeline. Easy to follow.',
  ],
  content: [
    'No written sentences.',
    '1–4 sentences. Minimal content — names a place but provides little else.',
    '5–7 sentences. Basic description of the trip with limited development. Mostly tells what happened without sensory or emotional detail.',
    '8–9 sentences. Most prompt questions addressed (where, how, best part). Some vivid detail (descriptions, feelings, specific moments).',
    '10+ sentences. All prompt questions addressed with rich detail. Includes sensory descriptions, personal reactions, dialogue, or specific moments that make the trip come alive.',
  ],
  language: [
    'No intelligible English sentences.',
    'Significant errors make meaning difficult. Some English structure present.',
    'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("We go…", "It was…").',
    'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, transitions, different starters).',
    'Mostly correct grammar. Varied sentence structures including compound/complex sentences. Consistent verb tenses (especially past tense). Transitions between events (then, after that, finally).',
  ],
  mechanics: [
    'No evidence of capitalization, punctuation, or recognizable spelling.',
    'Minimal punctuation/capitalization. Many misspellings, but words recognizable.',
    'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled. Proper nouns (place names) may not be capitalized.',
    'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled. Proper nouns mostly capitalized.',
    'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Proper nouns capitalized. Commas used in lists and compound sentences. Phonetic attempts at harder words are acceptable.',
  ],
}

interface GradeConfig {
  grade: number
  totalMC: number
  questions: QuestionDef[]
  writingCategories: WritingCategory[]
  writingMax: number
  rubricDesc: RubricDescriptors
}

interface StudentScores {
  answers: Record<number, string>   // qNum -> 'a'|'b'|'c'|'d'
  writing: Record<string, number>   // category key -> score
}

// ═══════════════════════════════════════════════════════════════════════
// GRADE 2 TEST DATA
// ═══════════════════════════════════════════════════════════════════════

const GRADE_2_QUESTIONS: QuestionDef[] = [
  // Listening (Q1-5) — "Kids at the Park"
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: Kids at the Park', text: 'What is the story about?', correct: 'b', standard: 'RI.2.2', standardDesc: 'Main topic of multi-paragraph text', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: Kids at the Park', text: 'Where does the story happen?', correct: 'b', standard: 'SL.2.2', standardDesc: 'Key ideas from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: Kids at the Park', text: 'What can you NOT do at the park?', correct: 'd', standard: 'RI.2.1', standardDesc: 'Ask/answer who, what, where, when', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: Kids at the Park', text: 'What can you make in the sandbox?', correct: 'a', standard: 'SL.2.2', standardDesc: 'Key ideas from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: Kids at the Park', text: 'What does "swing" mean?', correct: 'a', standard: 'L.2.4a', standardDesc: 'Context clue to word meaning', dok: 2, domain: 'Vocabulary' },
  // Reading 1 (Q6-9) — "Kate's Cake"
  { qNum: 6, section: 'reading1', sectionLabel: 'Reading: Kate\'s Cake', text: 'What is this story about?', correct: 'a', standard: 'RL.2.2', standardDesc: 'Determine central message', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 7, section: 'reading1', sectionLabel: 'Reading: Kate\'s Cake', text: 'What happens last?', correct: 'd', standard: 'RL.2.5', standardDesc: 'Describe overall structure', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 8, section: 'reading1', sectionLabel: 'Reading: Kate\'s Cake', text: 'What word sounds the same as "bake"?', correct: 'c', standard: 'RF.2.3', standardDesc: 'Grade-level phonics/word families', dok: 1, domain: 'Phonics' },
  { qNum: 9, section: 'reading1', sectionLabel: 'Reading: Kate\'s Cake', text: 'How many pans does Kate use?', correct: 'b', standard: 'RL.2.1', standardDesc: 'Key details in text', dok: 1, domain: 'Reading Comprehension' },
  // Reading 2 (Q10-15) — "Jane's Sunflowers"
  { qNum: 10, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'What is this story about?', correct: 'b', standard: 'RI.2.2', standardDesc: 'Main topic of text', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 11, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'What does Jane do first?', correct: 'c', standard: 'RI.2.3', standardDesc: 'Connection between steps', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 12, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'What happens after Jane waters?', correct: 'd', standard: 'RI.2.3', standardDesc: 'Connection between events', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 13, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'Put these events in order', correct: 'b', standard: 'RI.2.5', standardDesc: 'Describe text structure', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 14, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'What is needed to grow sunflowers?', correct: 'c', standard: 'RI.2.1', standardDesc: 'Key details in text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 15, section: 'reading2', sectionLabel: 'Reading: Jane\'s Sunflowers', text: 'Which word means "tiny"?', correct: 'c', standard: 'L.2.5a', standardDesc: 'Word relationships/synonyms', dok: 1, domain: 'Vocabulary' },
  // Language 1: Cloze (Q16-20)
  { qNum: 16, section: 'language1', sectionLabel: 'Language: Cloze', text: 'Today is ___ dad\'s birthday', correct: 'a', standard: 'L.2.1d', standardDesc: 'Possessive pronouns', dok: 1, domain: 'Language/Grammar' },
  { qNum: 17, section: 'language1', sectionLabel: 'Language: Cloze', text: 'I will ___ him a birthday cake', correct: 'b', standard: 'L.2.1', standardDesc: 'Verb forms (future)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 18, section: 'language1', sectionLabel: 'Language: Cloze', text: 'Next, I ___ three eggs', correct: 'a', standard: 'L.2.1d', standardDesc: 'Verb forms (present simple)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 19, section: 'language1', sectionLabel: 'Language: Cloze', text: '___ sugar, and baking powder', correct: 'b', standard: 'L.2.1e', standardDesc: 'Adjectives/determiners', dok: 1, domain: 'Language/Grammar' },
  { qNum: 20, section: 'language1', sectionLabel: 'Language: Cloze', text: 'put in a pan ___ put it in a hot oven', correct: 'c', standard: 'L.2.1f', standardDesc: 'Conjunctions', dok: 1, domain: 'Language/Grammar' },
  // Language 2: Correct Sentence (Q21-25)
  { qNum: 21, section: 'language2', sectionLabel: 'Language: Correct Sentence', text: 'Which sentence is correct? (punctuation)', correct: 'a', standard: 'L.2.2', standardDesc: 'End punctuation', dok: 1, domain: 'Language/Mechanics' },
  { qNum: 22, section: 'language2', sectionLabel: 'Language: Correct Sentence', text: 'Which sentence is correct? (capitalization I)', correct: 'd', standard: 'L.2.2a', standardDesc: 'Capitalize proper nouns/"I"', dok: 1, domain: 'Language/Mechanics' },
  { qNum: 23, section: 'language2', sectionLabel: 'Language: Correct Sentence', text: 'Which sentence is correct? (days/months)', correct: 'b', standard: 'L.2.2a', standardDesc: 'Capitalize dates', dok: 1, domain: 'Language/Mechanics' },
  { qNum: 24, section: 'language2', sectionLabel: 'Language: Correct Sentence', text: 'Which sentence is correct? (past tense)', correct: 'c', standard: 'L.2.1d', standardDesc: 'Irregular past tense', dok: 1, domain: 'Language/Grammar' },
  { qNum: 25, section: 'language2', sectionLabel: 'Language: Correct Sentence', text: 'Which sentence is correct? (plurals)', correct: 'a', standard: 'L.2.1b', standardDesc: 'Irregular plurals', dok: 1, domain: 'Language/Grammar' },
]

const GRADE_2_WRITING: WritingCategory[] = [
  { key: 'completeness', label: 'Completeness', max: 5, standard: 'W.K.2 · W.1.2 · W.2.2', standardDesc: 'Informative texts - name topic' },
  { key: 'content', label: 'Content & Detail', max: 5, standard: 'W.K.2 · W.1.2 · W.2.2', standardDesc: 'Informative texts with detail' },
  { key: 'language', label: 'Language & Grammar', max: 5, standard: 'L.K.1 · L.1.1 · L.2.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 5, standard: 'L.K.2 · L.1.2 · L.2.2', standardDesc: 'Capitalization/punctuation/spelling' },
]

// ═══════════════════════════════════════════════════════════════════════
// GRADE 3 TEST DATA
// ═══════════════════════════════════════════════════════════════════════

const GRADE_3_QUESTIONS: QuestionDef[] = [
  // Listening (Q1-5) — "The Beach"
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: The Beach', text: 'Where are we going?', correct: 'd', standard: 'SL.3.2', standardDesc: 'Main ideas from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: The Beach', text: 'What color is the sand?', correct: 'a', standard: 'SL.3.2', standardDesc: 'Key details from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: The Beach', text: 'What did we eat?', correct: 'd', standard: 'SL.3.2', standardDesc: 'Key details from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: The Beach', text: 'What will we do first?', correct: 'b', standard: 'SL.3.3', standardDesc: 'Questions about speaker info', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: The Beach', text: 'What is the most important rule?', correct: 'b', standard: 'SL.3.2', standardDesc: 'Determine main ideas', dok: 2, domain: 'Listening Comprehension' },
  // Language Standards (Q6-13)
  { qNum: 6, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'What are they going to do?', correct: 'b', standard: 'L.3.1e', standardDesc: 'Verb tenses (future)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 7, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'Will they do laundry?', correct: 'b', standard: 'L.3.1', standardDesc: 'Negative future tense', dok: 1, domain: 'Language/Grammar' },
  { qNum: 8, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'Are they washing the dishes?', correct: 'b', standard: 'L.3.1', standardDesc: 'Present progressive/SVA', dok: 1, domain: 'Language/Grammar' },
  { qNum: 9, section: 'language1', sectionLabel: 'Language: Grammar', text: 'Has Tom ___ his homework?', correct: 'a', standard: 'L.3.1d', standardDesc: 'Irregular verbs (present perfect)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 10, section: 'language1', sectionLabel: 'Language: Grammar', text: 'How long has Mr. Smith ___ English?', correct: 'd', standard: 'L.3.1d', standardDesc: 'Irregular verbs (present perfect)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 11, section: 'language1', sectionLabel: 'Language: Grammar', text: 'My sister ___ practice piano', correct: 'b', standard: 'L.3.1', standardDesc: 'Modal/helping verbs', dok: 1, domain: 'Language/Grammar' },
  { qNum: 12, section: 'language1', sectionLabel: 'Language: Grammar', text: 'An elephant is ___ than a cat', correct: 'd', standard: 'L.3.1g', standardDesc: 'Comparative adjectives', dok: 1, domain: 'Language/Grammar' },
  { qNum: 13, section: 'language1', sectionLabel: 'Language: Grammar', text: 'The ___ toys were all over the floor', correct: 'c', standard: 'L.3.2d', standardDesc: 'Irregular possessives', dok: 1, domain: 'Language/Grammar' },
  // Reading: "Changing Seasons" (Q14-16)
  { qNum: 14, section: 'reading1', sectionLabel: 'Reading: Changing Seasons', text: 'What happens in fall?', correct: 'd', standard: 'RI.3.1', standardDesc: 'Questions referring to text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 15, section: 'reading1', sectionLabel: 'Reading: Changing Seasons', text: 'When should you wear a heavy coat?', correct: 'b', standard: 'RI.3.1', standardDesc: 'Questions referring to text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 16, section: 'reading1', sectionLabel: 'Reading: Changing Seasons', text: 'Why does the girl stay warm in fall?', correct: 'c', standard: 'RI.3.3', standardDesc: 'Relationship between ideas', dok: 2, domain: 'Reading Comprehension' },
  // Reading: "That's My Kitten!" (Q17-21)
  { qNum: 17, section: 'reading2', sectionLabel: 'Reading: That\'s My Kitten!', text: 'What is Jacy doing at the beginning?', correct: 'b', standard: 'RL.3.1', standardDesc: 'Questions referring to text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 18, section: 'reading2', sectionLabel: 'Reading: That\'s My Kitten!', text: 'Where does Jacy first find the kitten?', correct: 'c', standard: 'RL.3.1', standardDesc: 'Questions referring to text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 19, section: 'reading2', sectionLabel: 'Reading: That\'s My Kitten!', text: 'What do Jacy and her mom make?', correct: 'd', standard: 'RL.3.1', standardDesc: 'Questions referring to text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 20, section: 'reading2', sectionLabel: 'Reading: That\'s My Kitten!', text: 'Why did Jacy sigh?', correct: 'c', standard: 'RL.3.3', standardDesc: 'Character motivation', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 21, section: 'reading2', sectionLabel: 'Reading: That\'s My Kitten!', text: 'What is the lesson of the story?', correct: 'b', standard: 'RL.3.2', standardDesc: 'Central message/moral', dok: 3, domain: 'Reading Comprehension' },
]

const GRADE_3_WRITING: WritingCategory[] = [
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.1.5 · W.2.5 · W.3.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.1.3 · W.2.3 · W.3.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.1.3 · W.2.3 · W.3.3b', standardDesc: 'Narrative techniques' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.1.1 · L.2.1 · L.3.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.1.2 · L.2.2 · L.3.2', standardDesc: 'Capitalization/punctuation/spelling' },
]

// ═══════════════════════════════════════════════════════════════════════
// GRADE 4 TEST DATA
// ═══════════════════════════════════════════════════════════════════════

const GRADE_4_QUESTIONS: QuestionDef[] = [
  // Listening (Q1-5) — "Crocodiles and Alligators"
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: Crocs & Gators', text: 'Main idea of this passage?', correct: 'b', standard: 'SL.4.2', standardDesc: 'Paraphrase text read aloud', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: Crocs & Gators', text: 'One way crocs and gators are the same?', correct: 'c', standard: 'SL.4.2', standardDesc: 'Key details from text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: Crocs & Gators', text: 'One way to tell a croc from a gator?', correct: 'a', standard: 'SL.4.3', standardDesc: 'Speaker\'s reasons/evidence', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: Crocs & Gators', text: 'Which is NOT true?', correct: 'c', standard: 'RI.4.1', standardDesc: 'Refer to details', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: Crocs & Gators', text: 'Best title for this story?', correct: 'd', standard: 'RI.4.2', standardDesc: 'Determine main idea/summarize', dok: 2, domain: 'Listening Comprehension' },
  // Reading: "Spider and the Watermelon" (Q6-11)
  { qNum: 6, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'How did Spider get into the watermelon?', correct: 'b', standard: 'RL.4.1', standardDesc: 'Refer to details/examples', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 7, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'What is Spider\'s problem?', correct: 'c', standard: 'RL.4.3', standardDesc: 'Describe character/setting/event', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 8, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'What is the lesson of this story?', correct: 'b', standard: 'RL.4.2', standardDesc: 'Determine theme from details', dok: 3, domain: 'Reading Comprehension' },
  { qNum: 9, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'How does Spider trick Possum?', correct: 'c', standard: 'RL.4.3', standardDesc: 'Character actions/details', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 10, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'What can we tell about Spider?', correct: 'b', standard: 'RL.4.3', standardDesc: 'Character traits', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 11, section: 'reading1', sectionLabel: 'Reading: Spider & Watermelon', text: 'What does "rind" mean?', correct: 'a', standard: 'L.4.4a', standardDesc: 'Context clue to word meaning', dok: 2, domain: 'Vocabulary' },
  // Language Standards (Q12-17)
  { qNum: 12, section: 'language1', sectionLabel: 'Language: Grammar', text: 'Correct singular and plural noun', correct: 'c', standard: 'L.4.1b', standardDesc: 'Irregular plurals', dok: 1, domain: 'Language/Grammar' },
  { qNum: 13, section: 'language1', sectionLabel: 'Language: Grammar', text: 'Look at ___ sky', correct: 'a', standard: 'L.4.1', standardDesc: 'Article usage (definite)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 14, section: 'language1', sectionLabel: 'Language: Grammar', text: 'I need ___ onion', correct: 'c', standard: 'L.4.1', standardDesc: 'Article usage (indefinite/vowel)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 15, section: 'language1', sectionLabel: 'Language: Grammar', text: 'How many people in the pool?', correct: 'a', standard: 'L.4.1', standardDesc: 'Quantifiers', dok: 1, domain: 'Language/Grammar' },
  { qNum: 16, section: 'language1', sectionLabel: 'Language: Grammar', text: 'Why are you hungry?', correct: 'b', standard: 'L.4.1', standardDesc: 'Indefinite pronouns', dok: 1, domain: 'Language/Grammar' },
  { qNum: 17, section: 'language1', sectionLabel: 'Language: Grammar', text: 'Is this book yours?', correct: 'a', standard: 'L.4.2d', standardDesc: 'Possessives', dok: 1, domain: 'Language/Grammar' },
  // Reading: "Enormous Insects" (Q18-22)
  { qNum: 18, section: 'reading2', sectionLabel: 'Reading: Enormous Insects', text: 'How do stick insects protect themselves?', correct: 'c', standard: 'RI.4.1', standardDesc: 'Refer to details', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 19, section: 'reading2', sectionLabel: 'Reading: Enormous Insects', text: 'Which is true about the insects?', correct: 'c', standard: 'RI.4.2', standardDesc: 'Determine main idea', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 20, section: 'reading2', sectionLabel: 'Reading: Enormous Insects', text: 'Main idea of the last paragraph?', correct: 'b', standard: 'RI.4.2', standardDesc: 'Main idea of section', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 21, section: 'reading2', sectionLabel: 'Reading: Enormous Insects', text: 'What is NOT true about Goliath beetles?', correct: 'b', standard: 'RI.4.1', standardDesc: 'Refer to details/examples', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 22, section: 'reading2', sectionLabel: 'Reading: Enormous Insects', text: 'Another word for "blend in with"?', correct: 'a', standard: 'L.4.4a', standardDesc: 'Context clue to word meaning', dok: 2, domain: 'Vocabulary' },
  // Language Standards 2 (Q23-28)
  { qNum: 23, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'The ___ belt is expensive', correct: 'b', standard: 'L.4.1', standardDesc: 'Comparative adjectives', dok: 1, domain: 'Language/Grammar' },
  { qNum: 24, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'I like to ___ books', correct: 'a', standard: 'L.4.1', standardDesc: 'Infinitive verb forms', dok: 1, domain: 'Language/Grammar' },
  { qNum: 25, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'I am ___ watch the magic show', correct: 'd', standard: 'L.4.1', standardDesc: 'Future tense (going to)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 26, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'Mike ___ when he won the award', correct: 'b', standard: 'L.4.1', standardDesc: 'Irregular past tense/linking verbs', dok: 1, domain: 'Language/Grammar' },
  { qNum: 27, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'What has she been doing?', correct: 'a', standard: 'L.4.1', standardDesc: 'Present perfect progressive', dok: 1, domain: 'Language/Grammar' },
  { qNum: 28, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'What does he have to do?', correct: 'd', standard: 'L.4.1', standardDesc: 'Modal expressions (has to)', dok: 1, domain: 'Language/Grammar' },
]

const GRADE_4_WRITING: WritingCategory[] = [
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.2.5 · W.3.5 · W.4.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.2.3 · W.3.3a · W.4.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.2.3 · W.3.3b · W.4.3b', standardDesc: 'Dialogue and description' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.2.1 · L.3.1 · L.4.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.2.2 · L.3.2 · L.4.2', standardDesc: 'Capitalization/punctuation/spelling' },
]

// ═══════════════════════════════════════════════════════════════════════
// GRADE 5 TEST DATA
// ═══════════════════════════════════════════════════════════════════════

const GRADE_5_QUESTIONS: QuestionDef[] = [
  // Listening (Q1-5) — "Zoos Through the Years"
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: Zoos Through the Years', text: 'What changed about zoo habitats in 1970s?', correct: 'c', standard: 'SL.5.2', standardDesc: 'Summarize text read aloud', dok: 1, domain: 'Listening Comprehension' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: Zoos Through the Years', text: 'Main purpose of modern zoos?', correct: 'd', standard: 'SL.5.3', standardDesc: 'Speaker\'s reasoning', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: Zoos Through the Years', text: 'What is this story mostly about?', correct: 'b', standard: 'RI.5.2', standardDesc: 'Main idea / key details', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: Zoos Through the Years', text: 'Most important difference past vs now?', correct: 'b', standard: 'RI.5.3', standardDesc: 'Relationships between concepts', dok: 2, domain: 'Listening Comprehension' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: Zoos Through the Years', text: 'What is a good title?', correct: 'd', standard: 'RI.5.2', standardDesc: 'Main idea / summarize', dok: 2, domain: 'Listening Comprehension' },
  // Language: Picture-based (Q6-9)
  { qNum: 6, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'What does she want to be?', correct: 'd', standard: 'L.5.1', standardDesc: 'SVA/article usage', dok: 1, domain: 'Language/Grammar' },
  { qNum: 7, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'Did she get a haircut?', correct: 'a', standard: 'L.5.1', standardDesc: 'Past tense/question formation', dok: 1, domain: 'Language/Grammar' },
  { qNum: 8, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'What did they do yesterday?', correct: 'b', standard: 'L.5.1d', standardDesc: 'Irregular past tense', dok: 1, domain: 'Language/Grammar' },
  { qNum: 9, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'Does he like to do yoga?', correct: 'c', standard: 'L.5.1', standardDesc: 'SVA/infinitive usage', dok: 1, domain: 'Language/Grammar' },
  // Language Standards (Q10-15)
  { qNum: 10, section: 'language2', sectionLabel: 'Language: Grammar', text: 'Many fallen ___ on the ground', correct: 'a', standard: 'L.5.1b', standardDesc: 'Irregular plural nouns', dok: 1, domain: 'Language/Grammar' },
  { qNum: 11, section: 'language2', sectionLabel: 'Language: Grammar', text: 'This backpack is not ___', correct: 'b', standard: 'L.5.1', standardDesc: 'Possessive pronouns', dok: 1, domain: 'Language/Grammar' },
  { qNum: 12, section: 'language2', sectionLabel: 'Language: Grammar', text: 'Cathy has two cats. ___ names are...', correct: 'b', standard: 'L.5.1', standardDesc: 'Possessive vs contraction', dok: 1, domain: 'Language/Grammar' },
  { qNum: 13, section: 'language2', sectionLabel: 'Language: Grammar', text: 'What ___ you do at 9 last night?', correct: 'd', standard: 'L.5.1', standardDesc: 'Past tense question formation', dok: 1, domain: 'Language/Grammar' },
  { qNum: 14, section: 'language2', sectionLabel: 'Language: Grammar', text: 'Brian ___ his speech now', correct: 'd', standard: 'L.5.1', standardDesc: 'Present progressive', dok: 1, domain: 'Language/Grammar' },
  { qNum: 15, section: 'language2', sectionLabel: 'Language: Grammar', text: 'I ___ this book more than five times', correct: 'b', standard: 'L.5.1d', standardDesc: 'Perfect verb tenses', dok: 1, domain: 'Language/Grammar' },
  // Reading: "Mount Everest" (Q16-20)
  { qNum: 16, section: 'reading1', sectionLabel: 'Reading: Mount Everest', text: 'Main purpose of this passage?', correct: 'a', standard: 'RI.5.2', standardDesc: 'Determine main idea', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 17, section: 'reading1', sectionLabel: 'Reading: Mount Everest', text: 'What is true about the temperature?', correct: 'd', standard: 'RI.5.1', standardDesc: 'Quote accurately from text', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 18, section: 'reading1', sectionLabel: 'Reading: Mount Everest', text: 'How many people reached the summit?', correct: 'c', standard: 'RI.5.1', standardDesc: 'Quote accurately from text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 19, section: 'reading1', sectionLabel: 'Reading: Mount Everest', text: 'People\'s attitude toward climbing?', correct: 'c', standard: 'RI.5.3', standardDesc: 'Relationships between concepts', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 20, section: 'reading1', sectionLabel: 'Reading: Mount Everest', text: 'How does author support main idea?', correct: 'c', standard: 'RI.5.5', standardDesc: 'Text structure analysis', dok: 3, domain: 'Reading Comprehension' },
  // Reading: "Monarch Butterflies" (Q21-25)
  { qNum: 21, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Main purpose of this passage?', correct: 'b', standard: 'RI.5.2', standardDesc: 'Determine main idea/summarize', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 22, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Why do migrating monarchs live longer?', correct: 'c', standard: 'RI.5.1', standardDesc: 'Quote accurately from text', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 23, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Which is a threat to the migration?', correct: 'c', standard: 'RI.5.1', standardDesc: 'Refer to details in text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 24, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'How does author show monarchs are remarkable?', correct: 'b', standard: 'RI.5.3', standardDesc: 'Relationships between concepts', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 25, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'What can be inferred about monarchs?', correct: 'b', standard: 'RI.5.1', standardDesc: 'Draw inferences from text', dok: 3, domain: 'Reading Comprehension' },
]

const GRADE_5_WRITING: WritingCategory[] = [
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.3.5 · W.4.5 · W.5.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.3.3a · W.4.3a · W.5.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.3.3b · W.4.3b · W.5.3b', standardDesc: 'Narrative techniques' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.3.1 · L.4.1 · L.5.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.3.2 · L.4.2 · L.5.2', standardDesc: 'Capitalization/punctuation/spelling' },
]

// ═══════════════════════════════════════════════════════════════════════
// CONFIG LOOKUP
// ═══════════════════════════════════════════════════════════════════════

function getGradeConfig(grade: number): GradeConfig | null {
  switch (grade) {
    case 2: return { grade: 2, totalMC: 25, questions: GRADE_2_QUESTIONS, writingCategories: GRADE_2_WRITING, writingMax: 20, rubricDesc: GRADE_2_RUBRIC_DESC }
    case 3: return { grade: 3, totalMC: 21, questions: GRADE_3_QUESTIONS, writingCategories: GRADE_3_WRITING, writingMax: 20, rubricDesc: GRADE_3_RUBRIC_DESC }
    case 4: return { grade: 4, totalMC: 28, questions: GRADE_4_QUESTIONS, writingCategories: GRADE_4_WRITING, writingMax: 20, rubricDesc: GRADE_4_RUBRIC_DESC }
    case 5: return { grade: 5, totalMC: 25, questions: GRADE_5_QUESTIONS, writingCategories: GRADE_5_WRITING, writingMax: 20, rubricDesc: GRADE_5_RUBRIC_DESC }
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function classToColor(cls: string) {
  const m: Record<string, string> = { Lily: '#C084FC', Daisy: '#FACC15', Rose: '#FB7185', Tulip: '#F97316', Iris: '#60A5FA', Snapdragon: '#34D399' }
  return m[cls] || '#94A3B8'
}

function computeAnalytics(allScores: Record<string, StudentScores>, config: GradeConfig) {
  const studentIds = Object.keys(allScores).filter(id => {
    const s = allScores[id]
    return Object.keys(s.answers).length > 0 || Object.values(s.writing).some((v: any) => v > 0)
  })
  if (studentIds.length === 0) return null

  // Item difficulty: % correct per question
  const itemDifficulty: Record<number, { correct: number; total: number; distractors: Record<string, number> }> = {}
  config.questions.forEach(q => {
    itemDifficulty[q.qNum] = { correct: 0, total: 0, distractors: { a: 0, b: 0, c: 0, d: 0 } }
  })
  studentIds.forEach(sid => {
    const ans = allScores[sid].answers
    config.questions.forEach(q => {
      if (ans[q.qNum]) {
        itemDifficulty[q.qNum].total++
        if (ans[q.qNum] === q.correct) itemDifficulty[q.qNum].correct++
        itemDifficulty[q.qNum].distractors[ans[q.qNum]]++
      }
    })
  })

  // Domain averages
  const domains: Record<string, { correct: number; total: number }> = {}
  studentIds.forEach(sid => {
    const ans = allScores[sid].answers
    config.questions.forEach(q => {
      if (ans[q.qNum]) {
        if (!domains[q.domain]) domains[q.domain] = { correct: 0, total: 0 }
        domains[q.domain].total++
        if (ans[q.qNum] === q.correct) domains[q.domain].correct++
      }
    })
  })

  // Standards mastery per student
  const studentStandards: Record<string, Record<string, { met: number; total: number }>> = {}
  studentIds.forEach(sid => {
    studentStandards[sid] = {}
    const ans = allScores[sid].answers
    config.questions.forEach(q => {
      if (ans[q.qNum]) {
        if (!studentStandards[sid][q.standard]) studentStandards[sid][q.standard] = { met: 0, total: 0 }
        studentStandards[sid][q.standard].total++
        if (ans[q.qNum] === q.correct) studentStandards[sid][q.standard].met++
      }
    })
  })

  return { itemDifficulty, domains, studentStandards, studentCount: studentIds.length }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export default function WrittenTestEntry({ levelTest, isAdmin, teacherClass }: {
  levelTest: LevelTest; isAdmin: boolean; teacherClass: EnglishClass | null
}) {
  const grade = Number(levelTest.grade)
  const config = getGradeConfig(grade)

  const [students, setStudents] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, StudentScores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>(teacherClass || 'all')
  const [view, setView] = useState<'entry' | 'analytics'>('entry')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Load students and existing scores
  useEffect(() => {
    if (!config) return
    async function load() {
      setLoading(true)
      const [studRes, scoreRes] = await Promise.all([
        supabase.from('students').select('*').eq('grade', grade).eq('is_active', true).order('english_class').order('english_name'),
        supabase.from('level_test_scores').select('student_id, raw_scores').eq('level_test_id', levelTest.id),
      ])
      const studs = studRes.data || []
      setStudents(studs)

      // Hydrate existing written test data
      const map: Record<string, StudentScores> = {}
      studs.forEach(s => { map[s.id] = { answers: {}, writing: {} } })
      ;(scoreRes.data || []).forEach((row: any) => {
        if (row.raw_scores?.written_answers) {
          map[row.student_id] = {
            answers: row.raw_scores.written_answers || {},
            writing: row.raw_scores.written_rubric || {},
          }
        }
      })
      setScores(map)
      setLoading(false)
    }
    load()
  }, [levelTest.id, grade])

  // Filter students by class
  const classStudents = useMemo(() => {
    if (filterClass === 'all') return students
    return students.filter(s => s.english_class === filterClass)
  }, [students, filterClass])

  const classes = useMemo(() => {
    const set = new Set<string>()
    students.forEach(s => { if (s.english_class) set.add(s.english_class) })
    return Array.from(set).sort()
  }, [students])

  // Current student
  const student = classStudents[selectedIdx]
  const sc = student ? (scores[student.id] || { answers: {}, writing: {} }) : { answers: {}, writing: {} }

  // Set answer for current student
  const setAnswer = useCallback((qNum: number, letter: string) => {
    if (!student) return
    setScores(prev => ({
      ...prev,
      [student.id]: {
        ...prev[student.id] || { answers: {}, writing: {} },
        answers: { ...(prev[student.id]?.answers || {}), [qNum]: letter },
      }
    }))
  }, [student])

  // Set writing score
  const setWritingScore = useCallback((key: string, val: number) => {
    if (!student) return
    setScores(prev => ({
      ...prev,
      [student.id]: {
        ...prev[student.id] || { answers: {}, writing: {} },
        writing: { ...(prev[student.id]?.writing || {}), [key]: val },
      }
    }))
  }, [student])

  // Clear student
  const clearStudent = useCallback(() => {
    if (!student) return
    if (!confirm(`Clear all written test scores for ${student.english_name || student.korean_name}? This cannot be undone.`)) return
    setScores(prev => ({ ...prev, [student.id]: { answers: {}, writing: {} } }))
    showToast('Cleared')
  }, [student])

  // Count correct for current student
  const mcCorrect = useMemo(() => {
    if (!config) return 0
    return config.questions.filter(q => sc.answers[q.qNum] === q.correct).length
  }, [sc, config])

  const writingTotal = useMemo(() => {
    if (!config) return 0
    return config.writingCategories.reduce((sum, cat) => sum + (sc.writing[cat.key] || 0), 0)
  }, [sc, config])

  // Student has data?
  const studentHasData = (sid: string) => {
    const s = scores[sid]
    if (!s) return false
    return Object.keys(s.answers).length > 0 || Object.values(s.writing).some((v: any) => v > 0)
  }

  // Save
  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    let errors = 0
    const toSave = classStudents.filter(s => studentHasData(s.id))

    for (const stu of toSave) {
      const sc = scores[stu.id]
      const mcTotal = config.questions.filter(q => sc.answers[q.qNum] === q.correct).length
      const wTotal = config.writingCategories.reduce((sum, cat) => sum + (sc.writing[cat.key] || 0), 0)

      // Domain breakdown
      const domainScores: Record<string, { correct: number; total: number }> = {}
      config.questions.forEach(q => {
        if (sc.answers[q.qNum]) {
          if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 }
          domainScores[q.domain].total++
          if (sc.answers[q.qNum] === q.correct) domainScores[q.domain].correct++
        }
      })

      // Standards mastery
      const standardsMastery: Record<string, { met: number; total: number }> = {}
      config.questions.forEach(q => {
        if (sc.answers[q.qNum]) {
          if (!standardsMastery[q.standard]) standardsMastery[q.standard] = { met: 0, total: 0 }
          standardsMastery[q.standard].total++
          if (sc.answers[q.qNum] === q.correct) standardsMastery[q.standard].met++
        }
      })

      // Merge with existing raw_scores (preserve oral test data)
      const existingRes = await supabase.from('level_test_scores')
        .select('raw_scores, calculated_metrics')
        .eq('level_test_id', levelTest.id)
        .eq('student_id', stu.id)
        .maybeSingle()

      const existingRaw = existingRes.data?.raw_scores || {}
      const existingCalc = existingRes.data?.calculated_metrics || {}

      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id,
        student_id: stu.id,
        raw_scores: {
          ...existingRaw,
          written_answers: sc.answers,
          written_rubric: sc.writing,
          written_mc: mcTotal,
          writing: wTotal,
        },
        calculated_metrics: {
          ...existingCalc,
          written_mc_total: mcTotal,
          written_mc_max: config.totalMC,
          written_mc_pct: Math.round((mcTotal / config.totalMC) * 100),
          writing_total: wTotal,
          writing_max: config.writingMax,
          written_domain_scores: domainScores,
          written_standards_mastery: standardsMastery,
        },
        previous_class: stu.english_class || null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }

    setSaving(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : `Saved ${toSave.length} student${toSave.length === 1 ? '' : 's'}`)
  }

  // Analytics
  const analytics = useMemo(() => {
    if (!config) return null
    return computeAnalytics(scores, config)
  }, [scores, config])

  // ─── Render ─────────────────────────────────────────────────

  if (!config) return <div className="p-12 text-center text-text-tertiary">No written test configuration for Grade {grade}.</div>
  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  // Group questions by section
  const sections = config.questions.reduce<Record<string, QuestionDef[]>>((acc, q) => {
    if (!acc[q.section]) acc[q.section] = []
    acc[q.section].push(q)
    return acc
  }, {})
  const sectionKeys = Object.keys(sections)

  return (
    <div className="flex h-[calc(100vh-160px)]">
      {/* ─── Sidebar ─── */}
      <div className="w-[220px] bg-surface border-r border-border flex flex-col">
        {/* View toggle */}
        <div className="p-3 border-b border-border flex gap-1">
          <button onClick={() => setView('entry')} className={`flex-1 text-[11px] py-1.5 rounded font-medium ${view === 'entry' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <BookOpen size={12} className="inline mr-1" />Entry
          </button>
          <button onClick={() => setView('analytics')} className={`flex-1 text-[11px] py-1.5 rounded font-medium ${view === 'analytics' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
            <BarChart3 size={12} className="inline mr-1" />Analytics
          </button>
        </div>

        {/* Class filter */}
        <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1">
          <button onClick={() => { setFilterClass('all'); setSelectedIdx(0) }} className={`text-[10px] px-2 py-1 rounded ${filterClass === 'all' ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt'}`}>All</button>
          {classes.map(cls => (
            <button key={cls} onClick={() => { setFilterClass(cls as EnglishClass); setSelectedIdx(0) }}
              className={`text-[10px] px-2 py-1 rounded font-medium`}
              style={filterClass === cls ? { backgroundColor: classToColor(cls), color: '#fff' } : { color: classToColor(cls) }}>
              {cls}
            </button>
          ))}
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto">
          {classStudents.map((s, idx) => {
            const hasData = studentHasData(s.id)
            const sAnswered = Object.keys(scores[s.id]?.answers || {}).length
            return (
              <button key={s.id} onClick={() => setSelectedIdx(idx)}
                className={`w-full text-left px-3 py-2 border-b border-border/50 flex items-center gap-2 transition-colors ${idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-surface-alt'}`}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: classToColor(s.english_class) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{s.english_name || s.korean_name}</div>
                  {hasData && <div className="text-[9px] text-text-tertiary">{sAnswered}/{config.totalMC} MC</div>}
                </div>
                {hasData && <Check size={12} className="text-green-500 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Save button */}
        <div className="p-3 border-t border-border">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2 bg-navy text-white rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-navy/90 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save All
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {view === 'entry' ? (
          <EntryView
            student={student}
            config={config}
            sc={sc}
            sections={sections}
            sectionKeys={sectionKeys}
            mcCorrect={mcCorrect}
            writingTotal={writingTotal}
            setAnswer={setAnswer}
            setWritingScore={setWritingScore}
            clearStudent={clearStudent}
            studentHasData={student ? studentHasData(student.id) : false}
            selectedIdx={selectedIdx}
            setSelectedIdx={setSelectedIdx}
            totalStudents={classStudents.length}
          />
        ) : (
          <AnalyticsView config={config} analytics={analytics} scores={scores} students={students} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-navy text-white px-4 py-2 rounded-lg shadow-lg text-[13px] animate-fade-in z-50">{toast}</div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// ENTRY VIEW
// ═══════════════════════════════════════════════════════════════════════

function EntryView({ student, config, sc, sections, sectionKeys, mcCorrect, writingTotal, setAnswer, setWritingScore, clearStudent, studentHasData, selectedIdx, setSelectedIdx, totalStudents }: {
  student: any; config: GradeConfig; sc: StudentScores; sections: Record<string, QuestionDef[]>; sectionKeys: string[]
  mcCorrect: number; writingTotal: number; setAnswer: (q: number, l: string) => void; setWritingScore: (k: string, v: number) => void
  clearStudent: () => void; studentHasData: boolean; selectedIdx: number; setSelectedIdx: (i: number) => void; totalStudents: number
}) {
  if (!student) return <div className="p-12 text-center text-text-tertiary">Select a student from the sidebar</div>

  return (
    <div className="p-6 max-w-4xl">
      {/* Student header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[18px] font-display font-semibold text-navy">
            {student.english_name || student.korean_name}
          </h3>
          <div className="text-[12px] text-text-tertiary mt-0.5">
            {student.english_class} -- Grade {config.grade} Written Test
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Score summary */}
          <div className="text-right mr-4">
            <div className="text-[20px] font-bold text-navy">{mcCorrect}<span className="text-[14px] text-text-tertiary">/{config.totalMC}</span></div>
            <div className="text-[10px] text-text-tertiary">MC ({Math.round(mcCorrect / config.totalMC * 100)}%)</div>
          </div>
          <div className="text-right mr-4">
            <div className="text-[20px] font-bold text-navy">{writingTotal}<span className="text-[14px] text-text-tertiary">/{config.writingMax}</span></div>
            <div className="text-[10px] text-text-tertiary">Writing</div>
          </div>
          {studentHasData && (
            <button onClick={clearStudent} className="text-[11px] text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded flex items-center gap-1">
              <RotateCcw size={12} /> Clear
            </button>
          )}
          {/* Nav */}
          <button onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0}
            className="p-1.5 rounded hover:bg-surface-alt disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-[11px] text-text-tertiary">{selectedIdx + 1}/{totalStudents}</span>
          <button onClick={() => setSelectedIdx(Math.min(totalStudents - 1, selectedIdx + 1))} disabled={selectedIdx >= totalStudents - 1}
            className="p-1.5 rounded hover:bg-surface-alt disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* MC Bubble Sheet */}
      {sectionKeys.map(sKey => {
        const qs = sections[sKey]
        const sectionLabel = qs[0].sectionLabel
        const sCorrect = qs.filter(q => sc.answers[q.qNum] === q.correct).length
        return (
          <div key={sKey} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-navy">{sectionLabel}</h4>
              <span className="text-[11px] text-text-tertiary">{sCorrect}/{qs.length}</span>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              {qs.map((q, qi) => {
                const chosen = sc.answers[q.qNum]
                const isCorrect = chosen === q.correct
                return (
                  <div key={q.qNum} className={`flex items-center gap-3 px-3 py-1.5 ${qi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${chosen && !isCorrect ? 'bg-red-50/40' : ''}`}>
                    <span className="w-5 text-[11px] text-text-tertiary text-right font-mono">{q.qNum}</span>
                    <div className="flex gap-1">
                      {['a', 'b', 'c', 'd'].map(letter => {
                        const isChosen = chosen === letter
                        const isCorrectAnswer = q.correct === letter
                        let bg = 'bg-white border-gray-200 hover:border-navy/40'
                        if (isChosen && isCorrect) bg = 'bg-green-500 border-green-500 text-white'
                        else if (isChosen && !isCorrect) bg = 'bg-red-400 border-red-400 text-white'
                        else if (chosen && isCorrectAnswer) bg = 'bg-green-100 border-green-300 text-green-700'
                        return (
                          <button key={letter} onClick={() => setAnswer(q.qNum, isChosen ? '' : letter)}
                            className={`w-7 h-7 rounded-full text-[11px] font-bold border-2 transition-all ${bg}`}>
                            {letter.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                    <span className="flex-1 text-[10px] text-text-tertiary truncate">{q.text}</span>
                    <span className="text-[9px] text-text-tertiary/60 font-mono text-right whitespace-nowrap">{expandStandard(q.standard, config.grade)}</span>
                    {chosen && (isCorrect
                      ? <Check size={12} className="text-green-500" />
                      : <X size={12} className="text-red-400" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Writing Rubric — Full Table */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[13px] font-semibold text-navy">Writing Rubric</h4>
          <span className="text-[11px] text-text-tertiary">{writingTotal}/{config.writingMax}</span>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          {config.writingCategories.map((cat, ci) => {
            const val = sc.writing[cat.key] || 0
            const descriptors = config.rubricDesc[cat.key] || []
            return (
              <div key={cat.key} className={`${ci < config.writingCategories.length - 1 ? 'border-b border-border' : ''}`}>
                {/* Category header with score buttons */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50/80">
                  <div className="w-44 flex-shrink-0">
                    <div className="text-[12px] font-semibold">{cat.label}</div>
                    <div className="text-[9px] text-text-tertiary">{cat.standard}</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: cat.max + 1 }, (_, i) => (
                      <button key={i} onClick={() => setWritingScore(cat.key, i)}
                        className={`w-8 h-8 rounded text-[12px] font-bold border-2 transition-all ${
                          val === i ? 'bg-navy border-navy text-white shadow-sm' : 'bg-white border-gray-200 hover:border-navy/40'
                        }`}>
                        {i}
                      </button>
                    ))}
                  </div>
                  <span className="text-[13px] font-bold text-navy ml-2">{val}/{cat.max}</span>
                </div>
                {/* Full rubric descriptors grid */}
                <div className="px-3 py-2 bg-white">
                  <div className="grid gap-1">
                    {descriptors.map((desc, level) => (
                      <div key={level}
                        onClick={() => setWritingScore(cat.key, level)}
                        className={`flex gap-2 px-2 py-1.5 rounded cursor-pointer transition-all ${
                          val === level
                            ? 'bg-blue-50 border border-blue-200 shadow-sm'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}>
                        <span className={`text-[10px] font-bold w-4 flex-shrink-0 pt-px ${
                          val === level ? 'text-navy' : 'text-text-tertiary'
                        }`}>{level}</span>
                        <span className={`text-[10px] leading-relaxed ${
                          val === level ? 'text-navy font-medium' : 'text-text-secondary'
                        }`}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ═══════════════════════════════════════════════════════════════════════

function AnalyticsView({ config, analytics, scores, students }: {
  config: GradeConfig; analytics: ReturnType<typeof computeAnalytics>; scores: Record<string, StudentScores>; students: any[]
}) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null)

  if (!analytics) return (
    <div className="p-12 text-center text-text-tertiary">
      <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-[14px]">No data to analyze yet.</p>
      <p className="text-[12px] mt-1">Enter scores for at least one student to see analytics.</p>
    </div>
  )

  const { itemDifficulty, domains, studentCount } = analytics

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[18px] font-display font-semibold text-navy">Written Test Analytics</h3>
        <span className="text-[12px] text-text-tertiary">{studentCount} students with data</span>
      </div>

      {/* Domain Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {Object.entries(domains).map(([domain, data]) => {
          const pct = Math.round((data.correct / data.total) * 100)
          const color = pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'
          return (
            <div key={domain} className="border border-border rounded-lg p-3">
              <div className="text-[11px] font-medium text-text-secondary mb-1">{domain}</div>
              <div className={`text-[22px] font-bold text-${color}-600`}>{pct}%</div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                <div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Item Difficulty Table */}
      <h4 className="text-[14px] font-semibold text-navy mb-3">Item Analysis</h4>
      <div className="border border-border rounded-lg overflow-hidden mb-6">
        <div className="grid grid-cols-[40px_1fr_140px_80px_60px_60px_60px_60px_40px] bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-text-tertiary border-b border-border">
          <span>#</span><span>Question</span><span>Standard</span><span>Domain</span>
          <span className="text-center">A</span><span className="text-center">B</span><span className="text-center">C</span><span className="text-center">D</span>
          <span className="text-center">%</span>
        </div>
        {config.questions.map(q => {
          const item = itemDifficulty[q.qNum]
          const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0
          const bgColor = pct >= 80 ? 'bg-green-50' : pct >= 50 ? 'bg-amber-50' : 'bg-red-50'
          return (
            <div key={q.qNum}>
              <button onClick={() => setExpandedQ(expandedQ === q.qNum ? null : q.qNum)}
                className={`w-full grid grid-cols-[40px_1fr_140px_80px_60px_60px_60px_60px_40px] px-3 py-1.5 text-[11px] border-b border-border/50 hover:bg-gray-50 ${bgColor}`}>
                <span className="font-mono">{q.qNum}</span>
                <span className="text-left truncate">{q.text}</span>
                <span className="font-mono text-text-tertiary">{expandStandard(q.standard, config.grade)}</span>
                <span className="text-text-tertiary truncate">{q.domain.replace('Comprehension', 'Comp.').replace('Language/', '')}</span>
                {['a', 'b', 'c', 'd'].map(letter => {
                  const count = item.distractors[letter] || 0
                  const letterPct = item.total > 0 ? Math.round((count / item.total) * 100) : 0
                  const isCorrect = q.correct === letter
                  return (
                    <span key={letter} className={`text-center font-mono ${isCorrect ? 'font-bold text-green-700' : count > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {letterPct > 0 ? `${letterPct}%` : '-'}
                    </span>
                  )
                })}
                <span className={`text-center font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {pct}%
                </span>
              </button>
              {expandedQ === q.qNum && (
                <div className="px-6 py-3 bg-blue-50/50 border-b border-border text-[11px]">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <div><span className="text-text-tertiary">Standard:</span> <span className="font-medium">{expandStandard(q.standard, config.grade)} -- {q.standardDesc}</span></div>
                    <div><span className="text-text-tertiary">DOK Level:</span> <span className="font-medium">{q.dok}</span></div>
                    <div><span className="text-text-tertiary">Correct Answer:</span> <span className="font-bold text-green-700">{q.correct.toUpperCase()}</span></div>
                    <div><span className="text-text-tertiary">Students answered:</span> <span className="font-medium">{item.total}</span></div>
                  </div>
                  <div className="mt-2 flex gap-4">
                    {['a', 'b', 'c', 'd'].map(letter => {
                      const count = item.distractors[letter] || 0
                      const isCorrect = q.correct === letter
                      return (
                        <div key={letter} className="flex items-center gap-1">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCorrect ? 'bg-green-500 text-white' : count > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                            {letter.toUpperCase()}
                          </span>
                          <span className="font-mono">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Most Missed Questions */}
      <h4 className="text-[14px] font-semibold text-navy mb-3">Instructional Priorities (Most Missed)</h4>
      <div className="border border-border rounded-lg overflow-hidden mb-6">
        {config.questions
          .filter(q => {
            const item = itemDifficulty[q.qNum]
            return item.total > 0 && (item.correct / item.total) < 0.6
          })
          .sort((a, b) => {
            const aP = itemDifficulty[a.qNum].correct / (itemDifficulty[a.qNum].total || 1)
            const bP = itemDifficulty[b.qNum].correct / (itemDifficulty[b.qNum].total || 1)
            return aP - bP
          })
          .slice(0, 8)
          .map(q => {
            const item = itemDifficulty[q.qNum]
            const pct = Math.round((item.correct / item.total) * 100)
            // Find the most-chosen wrong answer
            const wrongDistractors = Object.entries(item.distractors)
              .filter(([l]) => l !== q.correct)
              .sort((a, b) => b[1] - a[1])
            const topWrong = wrongDistractors[0]
            return (
              <div key={q.qNum} className="flex items-center gap-3 px-3 py-2 border-b border-border/50">
                <span className="text-[11px] font-mono text-text-tertiary w-5">Q{q.qNum}</span>
                <span className="text-[11px] flex-1">{q.text}</span>
                <span className="text-[9px] font-mono text-text-tertiary">{expandStandard(q.standard, config.grade)}</span>
                <span className="text-[11px] font-bold text-red-600 w-10 text-right">{pct}%</span>
                {topWrong && topWrong[1] > 0 && (
                  <span className="text-[9px] text-red-400">
                    {Math.round((topWrong[1] / item.total) * 100)}% chose {topWrong[0].toUpperCase()}
                  </span>
                )}
              </div>
            )
          })}
        {config.questions.filter(q => itemDifficulty[q.qNum].total > 0 && (itemDifficulty[q.qNum].correct / itemDifficulty[q.qNum].total) < 0.6).length === 0 && (
          <div className="px-3 py-4 text-center text-[12px] text-text-tertiary">All questions above 60% correct -- great results!</div>
        )}
      </div>

      {/* Writing Summary */}
      <h4 className="text-[14px] font-semibold text-navy mb-3">Writing Scores Summary</h4>
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_repeat(6,60px)] bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-text-tertiary border-b border-border">
          <span>Category</span>
          {config.writingCategories.map(cat => <span key={cat.key} className="text-center">{cat.label.split(' ')[0]}</span>)}
          <span className="text-center">Total</span>
        </div>
        {students.filter(s => {
          const sc = scores[s.id]
          return sc && Object.values(sc.writing).some(v => v > 0)
        }).map(s => {
          const sc = scores[s.id]
          const total = config.writingCategories.reduce((sum, cat) => sum + (sc.writing[cat.key] || 0), 0)
          return (
            <div key={s.id} className="grid grid-cols-[1fr_repeat(6,60px)] px-3 py-1.5 text-[11px] border-b border-border/50">
              <span className="font-medium truncate">{s.english_name || s.korean_name}</span>
              {config.writingCategories.map(cat => (
                <span key={cat.key} className="text-center font-mono">{sc.writing[cat.key] || 0}/{cat.max}</span>
              ))}
              <span className="text-center font-bold text-navy">{total}/{config.writingMax}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
