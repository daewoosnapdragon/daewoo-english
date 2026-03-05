'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Save, RotateCcw, Loader2, BarChart3, Check, X, Users, BookOpen, Eye } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type EnglishClass = 'Lily' | 'Camellia' | 'Daisy' | 'Sunflower' | 'Marigold' | 'Snapdragon'

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

interface GradeConfig {
  grade: number
  totalMC: number       // weighted max (DOK1=1pt, DOK2+=2pt)
  questionCount: number  // raw question count (for progress tracking)
  questions: QuestionDef[]
  writingCategories: WritingCategory[]
  writingMax: number
}

// DOK weighting: DOK 1 = 1 point, DOK 2+ = 2 points
function dokWeight(dok: number): number { return dok >= 2 ? 2 : 1 }

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
  { qNum: 18, section: 'language1', sectionLabel: 'Language: Cloze', text: 'Next, I ___ three eggs', correct: 'a', standard: 'L.2.1d', standardDesc: 'Past tense verbs', dok: 1, domain: 'Language/Grammar' },
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
  { key: 'completeness', label: 'Completeness', max: 5, standard: 'W.2.2', standardDesc: 'Informative texts - name topic' },
  { key: 'content', label: 'Content & Detail', max: 5, standard: 'W.2.2', standardDesc: 'Informative texts with detail' },
  { key: 'language', label: 'Language & Grammar', max: 5, standard: 'L.2.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 5, standard: 'L.2.2', standardDesc: 'Capitalization/punctuation/spelling' },
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
  { qNum: 7, section: 'language1', sectionLabel: 'Language: Picture Grammar', text: 'Will they do laundry?', correct: 'd', standard: 'L.3.1', standardDesc: 'Negative future tense', dok: 1, domain: 'Language/Grammar' },
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
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.3.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.3.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.3.3b', standardDesc: 'Narrative techniques' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.3.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.3.2', standardDesc: 'Capitalization/punctuation/spelling' },
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
  { qNum: 23, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'The ___ belt is expensive', correct: 'b', standard: 'L.4.1', standardDesc: 'Superlative adjectives', dok: 1, domain: 'Language/Grammar' },
  { qNum: 24, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'I like to ___ books', correct: 'a', standard: 'L.4.1', standardDesc: 'Infinitive verb forms', dok: 1, domain: 'Language/Grammar' },
  { qNum: 25, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'I am ___ watch the magic show', correct: 'd', standard: 'L.4.1', standardDesc: 'Future tense (going to)', dok: 1, domain: 'Language/Grammar' },
  { qNum: 26, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'Mike ___ when he won the award', correct: 'b', standard: 'L.4.1', standardDesc: 'Irregular past tense/linking verbs', dok: 1, domain: 'Language/Grammar' },
  { qNum: 27, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'What has she been doing?', correct: 'a', standard: 'L.4.1', standardDesc: 'Present perfect progressive', dok: 1, domain: 'Language/Grammar' },
  { qNum: 28, section: 'language2', sectionLabel: 'Language: Grammar 2', text: 'What does he have to do?', correct: 'd', standard: 'L.4.1', standardDesc: 'Modal expressions (has to)', dok: 1, domain: 'Language/Grammar' },
]

const GRADE_4_WRITING: WritingCategory[] = [
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.4.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.4.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.4.3b', standardDesc: 'Dialogue and description' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.4.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.4.2', standardDesc: 'Capitalization/punctuation/spelling' },
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
  // Reading: "The Great Migration of Monarch Butterflies" (Q21-25)
  { qNum: 21, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Main purpose of this passage?', correct: 'b', standard: 'RI.5.2', standardDesc: 'Determine main idea', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 22, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Why do migrating monarchs live longer?', correct: 'c', standard: 'RI.5.3', standardDesc: 'Relationships between concepts', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 23, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'Which is a threat to the migration?', correct: 'c', standard: 'RI.5.1', standardDesc: 'Quote accurately from text', dok: 1, domain: 'Reading Comprehension' },
  { qNum: 24, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'How does author show monarchs are remarkable?', correct: 'b', standard: 'RI.5.5', standardDesc: 'Text structure analysis', dok: 2, domain: 'Reading Comprehension' },
  { qNum: 25, section: 'reading2', sectionLabel: 'Reading: Monarch Butterflies', text: 'What can be inferred about monarchs?', correct: 'b', standard: 'RI.5.6', standardDesc: 'Analyze author perspective', dok: 3, domain: 'Reading Comprehension' },
]

const GRADE_5_WRITING: WritingCategory[] = [
  { key: 'brainstorm', label: 'Brainstorm / Planning', max: 4, standard: 'W.5.5', standardDesc: 'Planning/prewriting' },
  { key: 'structure', label: 'Story Structure', max: 4, standard: 'W.5.3a', standardDesc: 'Orient reader, organize events' },
  { key: 'content', label: 'Content & Detail', max: 4, standard: 'W.5.3b', standardDesc: 'Narrative techniques' },
  { key: 'language', label: 'Language & Grammar', max: 4, standard: 'L.5.1', standardDesc: 'Standard English grammar' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.5.2', standardDesc: 'Capitalization/punctuation/spelling' },
]

// ═══════════════════════════════════════════════════════════════════════
// CONFIG LOOKUP
// ═══════════════════════════════════════════════════════════════════════

function getGradeConfig(grade: number): GradeConfig | null {
  switch (grade) {
    case 2: return { grade: 2, totalMC: 32, questionCount: 25, questions: GRADE_2_QUESTIONS, writingCategories: GRADE_2_WRITING, writingMax: 20 }
    case 3: return { grade: 3, totalMC: 26, questionCount: 21, questions: GRADE_3_QUESTIONS, writingCategories: GRADE_3_WRITING, writingMax: 20 }
    case 4: return { grade: 4, totalMC: 40, questionCount: 28, questions: GRADE_4_QUESTIONS, writingCategories: GRADE_4_WRITING, writingMax: 20 }
    case 5: return { grade: 5, totalMC: 37, questionCount: 25, questions: GRADE_5_QUESTIONS, writingCategories: GRADE_5_WRITING, writingMax: 20 }
    default: return null
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function classToColor(cls: string) {
  const m: Record<string, string> = { Lily: '#C084FC', Camellia: '#F5D0A9', Daisy: '#FACC15', Sunflower: '#ABEBC6', Marigold: '#AED6F1', Snapdragon: '#34D399' }
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

  // Domain averages (DOK-weighted)
  const domains: Record<string, { correct: number; total: number }> = {}
  studentIds.forEach(sid => {
    const ans = allScores[sid].answers
    config.questions.forEach(q => {
      if (ans[q.qNum]) {
        const w = dokWeight(q.dok)
        if (!domains[q.domain]) domains[q.domain] = { correct: 0, total: 0 }
        domains[q.domain].total += w
        if (ans[q.qNum] === q.correct) domains[q.domain].correct += w
      }
    })
  })

  // Standards mastery per student (DOK-weighted)
  const studentStandards: Record<string, Record<string, { met: number; total: number }>> = {}
  studentIds.forEach(sid => {
    studentStandards[sid] = {}
    const ans = allScores[sid].answers
    config.questions.forEach(q => {
      if (ans[q.qNum]) {
        const w = dokWeight(q.dok)
        if (!studentStandards[sid][q.standard]) studentStandards[sid][q.standard] = { met: 0, total: 0 }
        studentStandards[sid][q.standard].total += w
        if (ans[q.qNum] === q.correct) studentStandards[sid][q.standard].met += w
      }
    })
  })

  // ── Point-biserial correlation per question ──
  // For each MC question, correlate binary correct/incorrect against total DOK-weighted MC score
  // Computed across the full grade (all classes combined)
  const totalScores: Record<string, number> = {}
  studentIds.forEach(sid => {
    const ans = allScores[sid].answers
    totalScores[sid] = config.questions.reduce((sum, q) => sum + (ans[q.qNum] === q.correct ? dokWeight(q.dok) : 0), 0)
  })
  const allTotals = studentIds.map(sid => totalScores[sid])
  const meanTotal = allTotals.length > 0 ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length : 0
  const stdTotal = allTotals.length > 1 ? Math.sqrt(allTotals.reduce((s, v) => s + (v - meanTotal) ** 2, 0) / (allTotals.length - 1)) : 0

  const discrimination: Record<number, { rpb: number; flag: string; flagColor: string }> = {}
  config.questions.forEach(q => {
    const item = itemDifficulty[q.qNum]
    const n = item.total
    if (n < 3 || stdTotal === 0) {
      discrimination[q.qNum] = { rpb: 0, flag: 'LOW N', flagColor: 'gray' }
      return
    }
    const accuracy = item.correct / n
    // Compute point-biserial: r_pb = (M1 - M0) / S * sqrt(p * q)
    // M1 = mean total score of students who got this right
    // M0 = mean total score of students who got this wrong
    const correctTotals: number[] = []
    const wrongTotals: number[] = []
    studentIds.forEach(sid => {
      const ans = allScores[sid].answers
      if (!ans[q.qNum]) return
      if (ans[q.qNum] === q.correct) correctTotals.push(totalScores[sid])
      else wrongTotals.push(totalScores[sid])
    })
    const m1 = correctTotals.length > 0 ? correctTotals.reduce((a, b) => a + b, 0) / correctTotals.length : 0
    const m0 = wrongTotals.length > 0 ? wrongTotals.reduce((a, b) => a + b, 0) / wrongTotals.length : 0
    const p = correctTotals.length / n
    const qProp = 1 - p
    const rpb = stdTotal > 0 && p > 0 && qProp > 0 ? ((m1 - m0) / stdTotal) * Math.sqrt(p * qProp) : 0

    // Determine flag
    let flag: string
    let flagColor: string
    if (rpb < 0) {
      flag = 'CHECK KEY'
      flagColor = 'red'
    } else if (accuracy > 0.9) {
      flag = 'TOO EASY'
      flagColor = 'blue'
    } else if (accuracy < 0.2) {
      flag = 'TOO HARD'
      flagColor = 'amber'
    } else if (rpb <= 0.1 && accuracy >= 0.2 && accuracy <= 0.9) {
      flag = 'BAD DISCRIMINATOR'
      flagColor = 'red'
    } else if (rpb > 0.2 && accuracy >= 0.3 && accuracy <= 0.9) {
      flag = 'KEEP'
      flagColor = 'green'
    } else {
      flag = 'OK'
      flagColor = 'gray'
    }
    discrimination[q.qNum] = { rpb, flag, flagColor }
  })

  return { itemDifficulty, domains, studentStandards, studentCount: studentIds.length, discrimination }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════
// ENTRY VIEW
// ═══════════════════════════════════════════════════════════════════════

// ── Writing Rubric Descriptors (from actual test rubrics) ─────────
// Grade 2: 0-5 scale (informative writing — animal report)
// Grades 3-5: 0-4 scale (narrative writing — picture/prompt based)
// Each grade has its own descriptors keyed by grade number + category key

const WRITING_RUBRIC_BY_GRADE: Record<number, Record<string, Record<number, string>>> = {
  2: {
    completeness: {
      0: 'No writing attempted or no English',
      1: 'Writing attempts to address 1 question only',
      2: 'Writing addresses 2 of the 4 questions',
      3: 'Writing addresses 3 of the 4 questions',
      4: 'Writing addresses all 4 questions but some lack detail',
      5: 'Writing fully addresses all 4 questions (what animal, appearance, habitat, and reason) with detail',
    },
    content: {
      0: 'No written sentences',
      1: '1-2 basic sentences. Names the animal with little or no detail',
      2: '3-4 basic sentences. Basic description with limited detail (e.g., "It is big. It is brown.")',
      3: '5+ basic sentences. Includes some descriptive detail or gives a reason with explanation',
      4: '5+ good sentences. Good detail about appearance, habitat, and reason. Some facts or personal connection',
      5: '5+ great sentences. Rich, specific detail. Goes beyond basic description (e.g., facts, comparisons, feelings, personal experiences)',
    },
    language: {
      0: 'No intelligible English sentences',
      1: 'Significant errors make meaning difficult. Some English structure present',
      2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I like...", "It is...")',
      3: 'Some errors but meaning is always clear. Attempts some sentence variety',
      4: 'Mostly correct grammar. Some varied structures. Consistent subject-verb agreement',
      5: 'Strong grammar for grade level. Varied sentence structures. Confident use of English',
    },
    mechanics: {
      0: 'No evidence of capitalization, punctuation, or recognizable spelling',
      1: 'Minimal punctuation/capitalization. Many misspellings, but words recognizable',
      2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled',
      3: 'Capitalization and end punctuation present on most sentences. A few common words misspelled',
      4: 'Consistent capitalization and end punctuation. High-frequency words correct. Phonetic attempts at harder words acceptable',
      5: 'Strong control of mechanics. Correct spelling of grade-level words. Punctuation used accurately throughout',
    },
  },
  3: {
    brainstorm: {
      0: 'Blank or no English attempted',
      1: '1-2 fields filled with single English words, may be unrelated to picture',
      2: 'Some fields filled. Basic English words or short phrases that connect to the picture',
      3: 'Most fields completed with relevant ideas. Shows understanding of story elements',
      4: 'All fields completed with relevant, detailed ideas. Characters, setting, events, feelings, and ending all connect to the picture',
    },
    structure: {
      0: 'No sentences written (brainstorm only or blank)',
      1: 'Writing present but no identifiable structure — random sentences or list of observations',
      2: 'Attempts beginning and middle but no clear ending, OR events are out of order',
      3: 'Has beginning, middle, and end, but one part is weak or has a minor gap',
      4: 'Clear beginning, middle, and end. Events are sequenced logically. Easy to follow',
    },
    content: {
      0: 'No sentences written (brainstorm only or blank)',
      1: '1-3 sentences. Minimal content — labels or very simple observations',
      2: '4-5 sentences. Basic description of picture with limited story development',
      3: '6-7 sentences. Most story elements present. Some detail beyond the picture',
      4: '8+ sentences. Includes characters, setting, actions, and feelings. Imaginative detail beyond the picture',
    },
    language: {
      0: 'No sentences written (brainstorm only or blank)',
      1: 'Significant errors make meaning difficult. Some English structure present',
      2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I see...")',
      3: 'Some errors but meaning is always clear. Attempts sentence variety',
      4: 'Mostly correct grammar. Varied sentence structures. Consistent subject-verb agreement and verb tenses',
    },
    mechanics: {
      0: 'No sentences written (brainstorm only or blank)',
      1: 'Minimal punctuation/capitalization. Many misspellings, but words recognizable',
      2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled',
      3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled',
      4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Phonetic attempts at harder words are acceptable',
    },
  },
  4: {
    brainstorm: {
      0: 'Blank or no English attempted',
      1: '1-2 fields filled with single English words, may be unrelated to pictures',
      2: 'Some fields filled. Basic English words or short phrases that connect to the pictures',
      3: 'Most fields completed with relevant ideas. Shows understanding of story elements across the three pictures',
      4: 'All fields completed with relevant, detailed ideas. Characters, setting, events, feelings, and ending all connect to the pictures',
    },
    structure: {
      0: 'No sentences written (brainstorm only or blank)',
      1: 'Writing present but no identifiable structure — random sentences or list of observations about the pictures',
      2: 'Attempts beginning and middle but no clear ending, OR events are out of order. Pictures not clearly connected',
      3: 'Has beginning, middle, and end that follow the three pictures, but one part is weak or has a gap',
      4: 'Clear beginning, middle, and end that logically follow the three pictures. Events are well-sequenced. Easy to follow',
    },
    content: {
      0: 'No written sentences',
      1: '1-4 sentences. Minimal content — labels or very simple observations about the pictures',
      2: '5-7 sentences. Basic description of the pictures with limited story development. Mostly tells what is seen',
      3: '8-9 sentences. Most story elements present. Some detail beyond the pictures (dialogue, feelings, names)',
      4: '10+ sentences. Includes characters, setting, actions, feelings, and dialogue. Imaginative detail beyond the pictures (inner thoughts, backstory, creative additions)',
    },
    language: {
      0: 'No intelligible English sentences',
      1: 'Significant errors make meaning difficult. Some English structure present',
      2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("They go...", "They are...")',
      3: 'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, dialogue, different starters)',
      4: 'Mostly correct grammar. Varied sentence structures including compound/complex sentences. Consistent verb tenses and subject-verb agreement. Dialogue punctuated correctly or nearly so',
    },
    mechanics: {
      0: 'No evidence of capitalization, punctuation, or recognizable spelling',
      1: 'Minimal punctuation/capitalization. Many misspellings, but words recognizable',
      2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled',
      3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled',
      4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Attempted to use quotation marks used for dialogue. More advanced diction',
    },
  },
  5: {
    brainstorm: {
      0: 'Blank or no English attempted',
      1: '1-2 fields filled with single English words, may be unrelated to prompt',
      2: 'Some fields filled. Basic English words or short phrases that connect to the trip prompt',
      3: 'Most fields completed with relevant ideas. Shows understanding of story elements (where, how, what happened, ending)',
      4: 'All fields completed with relevant, detailed ideas. Destination, travel, activities, highlights, and ending all clearly planned',
    },
    structure: {
      0: 'No sentences written (brainstorm only or blank)',
      1: 'Writing present but no identifiable structure — random sentences or unconnected ideas about travel. Trip sequence is unclear',
      2: 'Attempts beginning and middle but no clear ending, OR events are out of order. Trip sequence is unclear',
      3: 'Has beginning, middle, and end that follow a logical trip sequence',
      4: 'Clear beginning, middle, and end. Events are well-sequenced and follow a natural trip timeline. Easy to follow',
    },
    content: {
      0: 'No written sentences',
      1: '1-4 sentences. Minimal content — names a place but provides little else',
      2: '5-7 sentences. Basic description of the trip with limited development. Mostly tells what happened without sensory or emotional detail',
      3: '8-9 sentences. Most prompt questions addressed (where, how, best part). Some vivid detail (descriptions, feelings, specific moments)',
      4: '10+ sentences. All prompt questions addressed with rich detail. Includes sensory descriptions, personal reactions, dialogue, or specific moments that make the trip come alive',
    },
    language: {
      0: 'No intelligible English sentences',
      1: 'Significant errors make meaning difficult. Some English structure present',
      2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("We go...", "It was...")',
      3: 'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, transitions, different starters)',
      4: 'Mostly correct grammar. Varied sentence structures including compound/complex sentences. Consistent verb tenses (especially past tense). Transitions between events (then, after that, finally)',
    },
    mechanics: {
      0: 'No evidence of capitalization, punctuation, or recognizable spelling',
      1: 'Minimal punctuation/capitalization. Many misspellings, but words recognizable',
      2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled. Proper nouns (place names) may not be capitalized',
      3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled. Proper nouns mostly capitalized',
      4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Proper nouns capitalized. Commas used in lists and compound sentences. Phonetic attempts at harder words are acceptable',
    },
  },
}

// Grade-aware rubric descriptor lookup
function getRubricDescriptors(key: string, grade: number): Record<number, string> | undefined {
  return WRITING_RUBRIC_BY_GRADE[grade]?.[key]
}

// ── CCSS Standard Progressions (Grades 2-5) ──────────────────────
// Maps standard family (e.g., 'RI._.2') to grade-level descriptions
// Used for hover cards showing how a skill progresses across grade bands
const CCSS_PROGRESSIONS: Record<string, Record<number, string>> = {
  // Reading: Literature
  'RL._.1': { 2: 'Ask and answer who, what, where, when, why, how about key details', 3: 'Ask and answer questions referring explicitly to the text', 4: 'Refer to details and examples when explaining what the text says', 5: 'Quote accurately from a text when explaining what it says' },
  'RL._.2': { 2: 'Recount stories; determine central message, lesson, or moral', 3: 'Recount stories; determine central message, lesson, or moral', 4: 'Determine theme from details; summarize the text', 5: 'Determine theme from details; summarize the text' },
  'RL._.3': { 2: 'Describe how characters respond to major events/challenges', 3: 'Describe characters and explain how their actions contribute to events', 4: 'Describe a character, setting, or event using specific details', 5: 'Compare and contrast two or more characters, settings, or events' },
  'RL._.5': { 2: 'Describe overall structure (beginning, middle, end)', 3: 'Refer to parts of stories; describe how parts build on each other', 4: 'Explain structural differences between poems, drama, and prose', 5: 'Explain how chapters, scenes, or stanzas fit together' },
  // Reading: Informational
  'RI._.1': { 2: 'Ask and answer who, what, where, when, why, how', 3: 'Ask and answer questions referring explicitly to the text', 4: 'Refer to details and examples when explaining what the text says', 5: 'Quote accurately from a text when explaining what it says' },
  'RI._.2': { 2: 'Identify the main topic of a multi-paragraph text', 3: 'Determine the main idea; recount key details that support it', 4: 'Determine main idea; explain how supported by key details', 5: 'Determine two or more main ideas; explain how supported by key details' },
  'RI._.3': { 2: 'Describe the connection between a series of steps or events', 3: 'Describe relationship between events, ideas, or concepts', 4: 'Explain events, procedures, ideas, or concepts based on the text', 5: 'Explain relationships between concepts, ideas, or steps' },
  'RI._.5': { 2: 'Know and use text features (captions, headings, glossaries)', 3: 'Use text features to locate information', 4: 'Describe overall structure (chronology, comparison, cause/effect)', 5: 'Compare and contrast the overall structure of events/ideas in texts' },
  // Speaking & Listening
  'SL._.2': { 2: 'Recount or describe key ideas from a text read aloud', 3: 'Determine main ideas and supporting details from a text read aloud', 4: 'Paraphrase portions of a text read aloud', 5: 'Summarize a written text read aloud or information presented' },
  'SL._.3': { 3: 'Ask and answer questions about what a speaker says', 4: 'Identify reasons and evidence a speaker provides', 5: 'Summarize points a speaker makes and explain their reasoning' },
  // Language: Grammar
  'L._.1': { 2: 'Demonstrate command of standard English grammar (nouns, verbs, adjectives)', 3: 'Explain function of nouns, pronouns, verbs, adjectives, adverbs', 4: 'Use relative pronouns, progressive verb tenses, modal auxiliaries', 5: 'Explain function of conjunctions, prepositions, interjections; use verb tenses' },
  'L._.1b': { 2: 'Form and use frequently occurring irregular plural nouns', 3: 'Form and use regular and irregular plural nouns', 4: 'Form and use progressive verb tenses', 5: 'Form and use perfect verb tenses' },
  'L._.1d': { 2: 'Form and use past tense of frequently occurring irregular verbs', 3: 'Form and use regular and irregular verbs', 4: 'Order adjectives within sentences', 5: 'Recognize and correct inappropriate shifts in verb tense' },
  'L._.1e': { 2: 'Use adjectives and adverbs, choose between them', 3: 'Form and use simple verb tenses', 4: 'Use prepositional phrases', 5: 'Use correlative conjunctions' },
  'L._.1f': { 2: 'Produce and expand complete sentences', 3: 'Ensure subject-verb and pronoun-antecedent agreement', 4: 'Produce complete sentences; correct fragments and run-ons', 5: 'Produce complete sentences; correct inappropriate fragments' },
  'L._.1g': { 3: 'Form and use comparative and superlative adjectives/adverbs', 4: 'Correctly use frequently confused words', 5: 'Correctly use frequently confused words' },
  // Language: Mechanics
  'L._.2': { 2: 'Demonstrate command of capitalization, punctuation, spelling', 3: 'Capitalize appropriate words in titles', 4: 'Use correct capitalization', 5: 'Use punctuation to separate items in a series; use commas' },
  'L._.2a': { 2: 'Capitalize holidays, product names, geographic names', 3: 'Use commas in addresses; use commas and quotation marks in dialogue', 4: 'Use commas and quotation marks to mark direct speech', 5: 'Use punctuation to separate items in a series' },
  'L._.2d': { 3: 'Form and use possessives', 4: 'Spell grade-appropriate words correctly', 5: 'Spell grade-appropriate words correctly' },
  // Language: Vocabulary
  'L._.4a': { 2: 'Use sentence-level context to determine word meaning', 3: 'Use sentence-level context to determine word meaning', 4: 'Use context as a clue to the meaning of a word or phrase', 5: 'Use context as a clue to the meaning of a word or phrase' },
  'L._.5a': { 2: 'Identify real-life connections between words and their use', 3: 'Distinguish literal from nonliteral meanings', 4: 'Explain the meaning of simple similes and metaphors', 5: 'Interpret figurative language including similes and metaphors' },
  // Reading: Foundational
  'RF._.3': { 2: 'Know and apply grade-level phonics and word analysis', 3: 'Know and apply grade-level phonics and word analysis', 4: 'Know and apply grade-level phonics and word analysis', 5: 'Know and apply grade-level phonics and word analysis' },
}

function getStandardFamily(code: string): string | null {
  const m = code.match(/^([A-Z]+)\.(\d+)\.(.+)$/)
  if (!m) return null
  return `${m[1]}._.${m[3]}`
}

function StandardBadge({ code, description }: { code: string; description: string }) {
  const [showHover, setShowHover] = useState(false)
  const family = getStandardFamily(code)
  const progression = family ? CCSS_PROGRESSIONS[family] : null
  const currentGrade = code.match(/\.(\d+)\./)?.[1]

  return (
    <span className="relative" onMouseEnter={() => setShowHover(true)} onMouseLeave={() => setShowHover(false)}>
      <span className="text-[9px] text-text-tertiary/60 font-mono w-14 text-right cursor-help underline decoration-dotted decoration-text-tertiary/30">{code}</span>
      {showHover && (
        <div className="absolute right-0 bottom-full mb-1 w-72 bg-white border border-border rounded-lg shadow-lg p-3 z-50 text-left" onClick={e => e.stopPropagation()}>
          <p className="text-[11px] font-semibold text-navy mb-1">{code}</p>
          <p className="text-[10px] text-text-secondary mb-2">{description}</p>
          {progression && (
            <div className="border-t border-border pt-2 space-y-1">
              <p className="text-[8px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Skill Progression</p>
              {[2, 3, 4, 5].map(g => {
                if (!progression[g]) return null
                const gCode = code.replace(/\.\d+\./, `.${g}.`)
                const isCurrent = String(g) === currentGrade
                return (
                  <div key={g} className={`text-[9px] flex gap-2 ${isCurrent ? 'text-navy font-semibold bg-blue-50 -mx-1 px-1 py-0.5 rounded' : 'text-text-tertiary'}`}>
                    <span className="font-mono w-12 shrink-0">{gCode}</span>
                    <span>{progression[g]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </span>
  )
}

function EntryView({ student, config, sc, sections, sectionKeys, mcCorrect, writingTotal, setAnswer, setWritingScore, clearStudent, studentHasData, selectedIdx, setSelectedIdx, totalStudents }: {
  student: any; config: GradeConfig; sc: StudentScores; sections: Record<string, QuestionDef[]>; sectionKeys: string[]
  mcCorrect: number; writingTotal: number; setAnswer: (q: number, l: string) => void; setWritingScore: (k: string, v: number) => void
  clearStudent: () => void; studentHasData: boolean; selectedIdx: number; setSelectedIdx: (i: number) => void; totalStudents: number
}) {
  const [focusedQ, setFocusedQ] = useState<number | null>(null)
  const [showRubricGuide, setShowRubricGuide] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allQNums = useMemo(() => config.questions.map(q => q.qNum), [config])

  // Keyboard handler for MC scoring
  useEffect(() => {
    if (!student) return
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      // a/b/c/d to select answer for focused question
      if (['a', 'b', 'c', 'd'].includes(key) && focusedQ != null) {
        e.preventDefault()
        const currentAnswer = sc.answers[focusedQ]
        setAnswer(focusedQ, currentAnswer === key ? '' : key)
        // Auto-advance to next question after selection
        const idx = allQNums.indexOf(focusedQ)
        if (idx < allQNums.length - 1) {
          setTimeout(() => setFocusedQ(allQNums[idx + 1]), 100)
        }
        return
      }
      // Arrow keys to navigate questions
      if ((key === 'arrowdown' || key === 'arrowup') && focusedQ != null) {
        e.preventDefault()
        const idx = allQNums.indexOf(focusedQ)
        if (key === 'arrowdown' && idx < allQNums.length - 1) setFocusedQ(allQNums[idx + 1])
        else if (key === 'arrowup' && idx > 0) setFocusedQ(allQNums[idx - 1])
        return
      }
      // Number keys 1-9 to jump to question (with shift held)
      if (e.shiftKey && key >= '1' && key <= '9') {
        const qNum = parseInt(key)
        if (allQNums.includes(qNum)) { e.preventDefault(); setFocusedQ(qNum) }
        return
      }
      // Escape to unfocus
      if (key === 'escape') { setFocusedQ(null); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [student, focusedQ, sc.answers, allQNums, setAnswer])

  // Scroll focused question into view
  useEffect(() => {
    if (focusedQ == null) return
    const el = document.getElementById(`q-row-${focusedQ}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusedQ])

  if (!student) return <div className="p-12 text-center text-text-tertiary">Select a student from the sidebar</div>

  return (
    <div className="p-6 max-w-4xl" ref={containerRef}>
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

      {/* Keyboard hint */}
      <div className="mb-3 flex items-center gap-3 text-[10px] text-text-tertiary bg-surface-alt/60 rounded-lg px-3 py-1.5">
        <span className="font-semibold">Keyboard:</span>
        <span>Click a row to focus, then press <kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">A</kbd> <kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">B</kbd> <kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">C</kbd> <kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">D</kbd> to answer</span>
        <span><kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">↑↓</kbd> to navigate</span>
        <span><kbd className="px-1 py-0.5 bg-white rounded border border-border font-mono text-[9px]">Esc</kbd> to unfocus</span>
      </div>

      {/* MC Bubble Sheet */}
      {sectionKeys.map(sKey => {
        const qs = sections[sKey]
        const sectionLabel = qs[0].sectionLabel
        const sCorrect = qs.reduce((sum, q) => sum + (sc.answers[q.qNum] === q.correct ? dokWeight(q.dok) : 0), 0)
        const sMax = qs.reduce((sum, q) => sum + dokWeight(q.dok), 0)
        return (
          <div key={sKey} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-navy">{sectionLabel}</h4>
              <span className="text-[11px] text-text-tertiary">{sCorrect}/{sMax}</span>
            </div>
            <div className="border border-border rounded-lg">
              {qs.map((q, qi) => {
                const chosen = sc.answers[q.qNum]
                const isCorrect = chosen === q.correct
                const isFocused = focusedQ === q.qNum
                return (
                  <div key={q.qNum} id={`q-row-${q.qNum}`}
                    onClick={() => setFocusedQ(q.qNum)}
                    className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-all ${qi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${chosen && !isCorrect ? 'bg-red-50/40' : ''} ${isFocused ? 'ring-2 ring-navy/40 ring-inset bg-blue-50/30' : ''}`}>
                    <span className={`w-5 text-[11px] text-right font-mono ${q.dok >= 2 ? 'text-amber-600 font-bold' : isFocused ? 'text-navy font-bold' : 'text-text-tertiary'}`}>{q.qNum}</span>
                    <div className="flex gap-1">
                      {['a', 'b', 'c', 'd'].map(letter => {
                        const isChosen = chosen === letter
                        const isCorrectAnswer = q.correct === letter
                        let bg = 'bg-white border-gray-200 hover:border-navy/40'
                        if (isChosen && isCorrect) bg = 'bg-green-500 border-green-500 text-white'
                        else if (isChosen && !isCorrect) bg = 'bg-red-400 border-red-400 text-white'
                        else if (chosen && isCorrectAnswer) bg = 'bg-green-100 border-green-300 text-green-700'
                        return (
                          <button key={letter} onClick={(e) => { e.stopPropagation(); setAnswer(q.qNum, isChosen ? '' : letter); setFocusedQ(q.qNum) }}
                            className={`w-7 h-7 rounded-full text-[11px] font-bold border-2 transition-all ${bg}`}>
                            {letter.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                    <span className="flex-1 text-[10px] text-text-tertiary truncate">{q.text}</span>
                    <StandardBadge code={q.standard} description={q.standardDesc} />
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

      {/* Writing Rubric */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-navy">Writing Rubric</h4>
            <button onClick={() => setShowRubricGuide(!showRubricGuide)}
              className={`text-[10px] px-2 py-0.5 rounded-full transition-all flex items-center gap-1 ${showRubricGuide ? 'bg-navy text-white' : 'bg-surface-alt text-text-tertiary hover:bg-border'}`}>
              <Eye size={10} /> {showRubricGuide ? 'Hide Guide' : 'Show Guide'}
            </button>
          </div>
          <span className="text-[11px] text-text-tertiary">{writingTotal}/{config.writingMax}</span>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          {config.writingCategories.map((cat, ci) => {
            const val = sc.writing[cat.key] || 0
            const descriptors = getRubricDescriptors(cat.key, config.grade)
            return (
              <div key={cat.key} className={`${ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-40">
                    <div className="text-[12px] font-medium">{cat.label}</div>
                    <div className="text-[9px] text-text-tertiary">{cat.standard} -- {cat.standardDesc}</div>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: cat.max + 1 }, (_, i) => (
                      <button key={i} onClick={() => setWritingScore(cat.key, i)}
                        title={descriptors?.[i] || ''}
                        className={`w-8 h-8 rounded text-[12px] font-bold border-2 transition-all ${
                          val === i ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200 hover:border-navy/40'
                        }`}>
                        {i}
                      </button>
                    ))}
                  </div>
                  <span className="text-[12px] font-bold text-navy ml-2">{val}/{cat.max}</span>
                </div>
                {/* Rubric guide row */}
                {showRubricGuide && descriptors && (
                  <div className="px-3 pb-2">
                    <div className="bg-surface-alt/60 rounded-lg px-3 py-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${cat.max + 1}, 1fr)` }}>
                      {Array.from({ length: cat.max + 1 }, (_, i) => (
                        <div key={i} className={`text-[8px] leading-tight px-1 py-1 rounded ${val === i ? 'bg-navy/10 font-semibold text-navy' : 'text-text-tertiary'}`}>
                          <span className="font-bold text-[9px]">{i}:</span> {descriptors[i] || '—'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

function AnalyticsView({ config, analytics, scores, students, excludedQuestions, onToggleExclude, canToggleExclude }: {
  config: GradeConfig; analytics: ReturnType<typeof computeAnalytics>; scores: Record<string, StudentScores>; students: any[]
  excludedQuestions: number[]; onToggleExclude: (qNum: number) => void; canToggleExclude: boolean
}) {
  const [expandedQ, setExpandedQ] = useState<number | null>(null)
  const [showInfoCard, setShowInfoCard] = useState(false)

  if (!analytics) return (
    <div className="p-12 text-center text-text-tertiary">
      <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-[14px]">No data to analyze yet.</p>
      <p className="text-[12px] mt-1">Enter scores for at least one student to see analytics.</p>
    </div>
  )

  const { itemDifficulty, domains, studentCount, discrimination } = analytics
  const excludedSet = new Set(excludedQuestions)
  const excludedCount = excludedQuestions.length
  const flagCounts = { KEEP: 0, 'TOO EASY': 0, 'TOO HARD': 0, 'BAD DISCRIMINATOR': 0, 'CHECK KEY': 0, OK: 0, 'LOW N': 0 }
  if (discrimination) Object.values(discrimination).forEach(d => { if (flagCounts[d.flag as keyof typeof flagCounts] !== undefined) flagCounts[d.flag as keyof typeof flagCounts]++ })

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

      {/* Test Quality Section with Info Card */}
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-[14px] font-semibold text-navy">Test Quality</h4>
        <div className="relative">
          <button onClick={() => setShowInfoCard(!showInfoCard)} className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[11px] font-bold flex items-center justify-center hover:bg-blue-200 transition-colors">?</button>
          {showInfoCard && (
            <div className="absolute left-0 top-7 w-96 bg-white border border-border rounded-xl shadow-xl p-4 z-50 text-[11px] text-text-secondary leading-relaxed">
              <p className="font-semibold text-navy mb-2">How Question Discrimination Works</p>
              <p>Some questions don't help us make good placement decisions. A well-written question is one where students who scored well overall also got this question right. When that pattern breaks down -- when strong students miss it and weak students get it right -- the question adds noise instead of signal to our data.</p>
              <p className="mt-2">Excluding these questions doesn't change anyone's answers. It recalculates the MC component of the composite score using only the questions that reliably measure student ability. This gives us more accurate placements, especially for borderline students.</p>
              <button onClick={() => setShowInfoCard(false)} className="mt-2 text-[10px] text-navy font-semibold hover:underline">Got it</button>
            </div>
          )}
        </div>
        {excludedCount > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{excludedCount} question{excludedCount !== 1 ? 's' : ''} excluded</span>
        )}
      </div>

      {/* Discrimination flag legend */}
      {discrimination && (
        <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
          {flagCounts.KEEP > 0 && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">KEEP ({flagCounts.KEEP})</span>}
          {flagCounts['TOO EASY'] > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">TOO EASY ({flagCounts['TOO EASY']})</span>}
          {flagCounts['TOO HARD'] > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">TOO HARD ({flagCounts['TOO HARD']})</span>}
          {flagCounts['BAD DISCRIMINATOR'] > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">BAD DISCRIMINATOR ({flagCounts['BAD DISCRIMINATOR']})</span>}
          {flagCounts['CHECK KEY'] > 0 && <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">CHECK KEY ({flagCounts['CHECK KEY']})</span>}
        </div>
      )}

      {/* Item Analysis Table with Discrimination */}
      <h4 className="text-[14px] font-semibold text-navy mb-3">Item Analysis</h4>
      <div className="border border-border rounded-lg mb-6">
        <div className="grid grid-cols-[32px_40px_1fr_60px_80px_60px_60px_60px_60px_40px_90px] bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-text-tertiary border-b border-border">
          {canToggleExclude && <span className="text-center">Excl</span>}
          {!canToggleExclude && <span />}
          <span>#</span><span>Question</span><span>Standard</span><span>Domain</span>
          <span className="text-center">A</span><span className="text-center">B</span><span className="text-center">C</span><span className="text-center">D</span>
          <span className="text-center">%</span>
          <span className="text-center">Quality</span>
        </div>
        {config.questions.map(q => {
          const item = itemDifficulty[q.qNum]
          const pct = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0
          const bgColor = pct >= 80 ? 'bg-green-50' : pct >= 50 ? 'bg-amber-50' : 'bg-red-50'
          const isExcluded = excludedSet.has(q.qNum)
          const disc = discrimination?.[q.qNum]
          const flagBg: Record<string, string> = { green: 'bg-green-100 text-green-700', blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', gray: 'bg-gray-100 text-gray-500' }
          return (
            <div key={q.qNum} className={isExcluded ? 'opacity-50' : ''}>
              <button onClick={() => setExpandedQ(expandedQ === q.qNum ? null : q.qNum)}
                className={`w-full grid grid-cols-[32px_40px_1fr_60px_80px_60px_60px_60px_60px_40px_90px] px-3 py-1.5 text-[11px] border-b border-border/50 hover:bg-gray-50 ${isExcluded ? 'bg-gray-100' : bgColor}`}>
                {canToggleExclude ? (
                  <span className="text-center" onClick={e => { e.stopPropagation(); onToggleExclude(q.qNum) }}>
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded border-2 cursor-pointer transition-all ${isExcluded ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 hover:border-navy'}`}>
                      {isExcluded && <X size={10} />}
                    </span>
                  </span>
                ) : (
                  <span className="text-center">{isExcluded && <X size={10} className="inline text-red-400" />}</span>
                )}
                <span className={`font-mono ${isExcluded ? 'line-through' : ''}`}>{q.qNum}</span>
                <span className={`text-left truncate ${isExcluded ? 'line-through' : ''}`}>{q.text}</span>
                <StandardBadge code={q.standard} description={q.standardDesc} />
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
                <span className="text-center">
                  {disc && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${flagBg[disc.flagColor] || 'bg-gray-100 text-gray-500'} ${disc.flag === 'CHECK KEY' ? 'font-extrabold' : ''}`}>
                      {disc.flag}
                      {disc.flag !== 'LOW N' && <span className="font-normal ml-0.5">({disc.rpb.toFixed(2)})</span>}
                    </span>
                  )}
                </span>
              </button>
              {expandedQ === q.qNum && (
                <div className="px-6 py-3 bg-blue-50/50 border-b border-border text-[11px]">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                    <div><span className="text-text-tertiary">Standard:</span> <span className="font-medium">{q.standard} -- {q.standardDesc}</span></div>
                    <div><span className="text-text-tertiary">DOK Level:</span> <span className="font-medium">{q.dok} ({dokWeight(q.dok)}pt)</span></div>
                    <div><span className="text-text-tertiary">Correct Answer:</span> <span className="font-bold text-green-700">{q.correct.toUpperCase()}</span></div>
                    <div><span className="text-text-tertiary">Students answered:</span> <span className="font-medium">{item.total}</span></div>
                    {disc && <div><span className="text-text-tertiary">Discrimination (r_pb):</span> <span className={`font-bold ${disc.rpb < 0 ? 'text-red-600' : disc.rpb > 0.2 ? 'text-green-600' : 'text-amber-600'}`}>{disc.rpb.toFixed(3)}</span></div>}
                    <div><span className="text-text-tertiary">Status:</span> <span className="font-medium">{isExcluded ? 'EXCLUDED from MC scoring' : 'Included'}</span></div>
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
      <div className="border border-border rounded-lg mb-6">
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
            const isExcluded = excludedSet.has(q.qNum)
            // Find the most-chosen wrong answer
            const wrongDistractors = Object.entries(item.distractors)
              .filter(([l]) => l !== q.correct)
              .sort((a, b) => b[1] - a[1])
            const topWrong = wrongDistractors[0]
            return (
              <div key={q.qNum} className={`flex items-center gap-3 px-3 py-2 border-b border-border/50 ${isExcluded ? 'opacity-50 bg-gray-50' : ''}`}>
                <span className="text-[11px] font-mono text-text-tertiary w-5">Q{q.qNum}</span>
                <span className={`text-[11px] flex-1 ${isExcluded ? 'line-through' : ''}`}>{q.text}</span>
                <StandardBadge code={q.standard} description={q.standardDesc} />
                <span className="text-[11px] font-bold text-red-600 w-10 text-right">{pct}%</span>
                {topWrong && topWrong[1] > 0 && (
                  <span className="text-[9px] text-red-400">
                    {Math.round((topWrong[1] / item.total) * 100)}% chose {topWrong[0].toUpperCase()}
                  </span>
                )}
                {isExcluded && <span className="text-[8px] text-red-500 font-bold">EXCL</span>}
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


// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT (export default)
// ═══════════════════════════════════════════════════════════════════════

export default function WrittenTestEntry({ levelTest, isAdmin, teacherClass }: {
  levelTest: LevelTest; isAdmin: boolean; teacherClass: EnglishClass | null
}) {
  const grade = Number(levelTest.grade)
  const config = getGradeConfig(grade)

  const [students, setStudents] = useState<any[]>([])
  const [scores, setScores] = useState<Record<string, StudentScores>>({})
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, StudentScores>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [filterClass, setFilterClass] = useState<EnglishClass | 'all'>(teacherClass || 'all')
  const [view, setView] = useState<'entry' | 'analytics'>('entry')
  const [toast, setToast] = useState('')
  const [excludedQuestions, setExcludedQuestions] = useState<number[]>([])

  // Can toggle exclusions: Snapdragon teacher or admin only
  const canToggleExclude = isAdmin || teacherClass === 'Snapdragon'

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
      setSavedSnapshot(JSON.parse(JSON.stringify(map)))
      setLoading(false)
    }
    load()
  }, [levelTest.id, grade])

  // Load excluded questions from level_tests.config
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('level_tests').select('config').eq('id', levelTest.id).single()
      if (data?.config?.excluded_questions) {
        setExcludedQuestions(data.config.excluded_questions)
      }
    })()
  }, [levelTest.id])

  // Toggle question exclusion and save to DB
  const handleToggleExclude = useCallback(async (qNum: number) => {
    if (!canToggleExclude) return
    const newExcluded = excludedQuestions.includes(qNum)
      ? excludedQuestions.filter(q => q !== qNum)
      : [...excludedQuestions, qNum]
    setExcludedQuestions(newExcluded)
    // Save to level_tests.config.excluded_questions
    const { data: lt } = await supabase.from('level_tests').select('config').eq('id', levelTest.id).single()
    const currentConfig = lt?.config || {}
    const { error } = await supabase.from('level_tests').update({
      config: { ...currentConfig, excluded_questions: newExcluded }
    }).eq('id', levelTest.id)
    if (error) {
      showToast('Error saving exclusion')
      // Revert on error
      setExcludedQuestions(excludedQuestions)
    } else {
      showToast(newExcluded.includes(qNum) ? `Q${qNum} excluded from scoring` : `Q${qNum} restored to scoring`)
    }
  }, [excludedQuestions, canToggleExclude, levelTest.id])

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

  // Clear student — clears local state AND removes written data from DB (preserves oral data)
  const clearStudent = useCallback(async () => {
    if (!student) return
    if (!confirm(`Clear all written test scores for ${student.english_name || student.korean_name}? This cannot be undone.`)) return
    setScores(prev => ({ ...prev, [student.id]: { answers: {}, writing: {} } }))
    // Remove written-specific fields from DB while preserving oral test data
    try {
      const { data: existing } = await supabase.from('level_test_scores')
        .select('raw_scores, calculated_metrics')
        .eq('level_test_id', levelTest.id)
        .eq('student_id', student.id)
        .maybeSingle()
      if (existing) {
        const raw = { ...(existing.raw_scores || {}) }
        const calc = { ...(existing.calculated_metrics || {}) }
        // Remove written-specific keys
        delete raw.written_answers; delete raw.written_rubric; delete raw.written_mc; delete raw.writing
        delete calc.written_mc_total; delete calc.written_mc_max; delete calc.written_mc_pct
        delete calc.writing_total; delete calc.writing_max; delete calc.written_domain_scores; delete calc.written_standards_mastery
        // Check if anything remains (oral data)
        const hasOralData = Object.keys(raw).some(k => !k.startsWith('written'))
        if (hasOralData) {
          await supabase.from('level_test_scores').update({ raw_scores: raw, calculated_metrics: calc })
            .eq('level_test_id', levelTest.id).eq('student_id', student.id)
        } else {
          await supabase.from('level_test_scores').delete()
            .eq('level_test_id', levelTest.id).eq('student_id', student.id)
        }
      }
    } catch (e) { console.error('Clear DB error:', e) }
    // Update saved snapshot to match cleared state
    setSavedSnapshot(prev => ({ ...prev, [student.id]: { answers: {}, writing: {} } }))
    showToast('Cleared written test scores')
  }, [student, levelTest.id])

  // Count weighted score for current student (DOK1=1pt, DOK2+=2pt)
  const mcCorrect = useMemo(() => {
    if (!config) return 0
    return config.questions.reduce((sum, q) => sum + (sc.answers[q.qNum] === q.correct ? dokWeight(q.dok) : 0), 0)
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

  // Track which students have unsaved changes (changed since last save/load)
  const hasDirtyData = useMemo(() => {
    return students.some(s => {
      const current = scores[s.id]
      const saved = savedSnapshot[s.id]
      if (!current || !saved) return studentHasData(s.id) && JSON.stringify(current) !== JSON.stringify(saved)
      return JSON.stringify(current) !== JSON.stringify(saved)
    })
  }, [scores, savedSnapshot, students])

  // Warn before leaving with unsaved data
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasDirtyData) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasDirtyData])

  // Refs for auto-save (so effects always have latest values)
  const scoresRef = useRef(scores)
  const savedSnapshotRef = useRef(savedSnapshot)
  const savingRef = useRef(false)
  useEffect(() => { scoresRef.current = scores }, [scores])
  useEffect(() => { savedSnapshotRef.current = savedSnapshot }, [savedSnapshot])

  // Auto-save function (saves all dirty students silently)
  const autoSave = useCallback(async () => {
    if (!config || savingRef.current) return
    const currentScores = scoresRef.current
    const snapshot = savedSnapshotRef.current
    const dirty = students.filter(s => {
      const cur = currentScores[s.id]
      const sav = snapshot[s.id]
      if (!cur) return false
      const hasData = Object.keys(cur.answers).length > 0 || Object.values(cur.writing).some((v: any) => v > 0)
      if (!hasData) return false
      return JSON.stringify(cur) !== JSON.stringify(sav)
    })
    if (dirty.length === 0) return

    savingRef.current = true
    let errors = 0
    for (const stu of dirty) {
      const sc = currentScores[stu.id]
      const mcTotal = config.questions.reduce((sum, q) => sum + (sc.answers[q.qNum] === q.correct ? dokWeight(q.dok) : 0), 0)
      const wTotal = config.writingCategories.reduce((sum, cat) => sum + (sc.writing[cat.key] || 0), 0)
      const domainScores: Record<string, { correct: number; total: number }> = {}
      config.questions.forEach(q => { if (sc.answers[q.qNum]) { const w = dokWeight(q.dok); if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 }; domainScores[q.domain].total += w; if (sc.answers[q.qNum] === q.correct) domainScores[q.domain].correct += w } })
      const standardsMastery: Record<string, { met: number; total: number }> = {}
      config.questions.forEach(q => { if (sc.answers[q.qNum]) { const w = dokWeight(q.dok); if (!standardsMastery[q.standard]) standardsMastery[q.standard] = { met: 0, total: 0 }; standardsMastery[q.standard].total += w; if (sc.answers[q.qNum] === q.correct) standardsMastery[q.standard].met += w } })
      const existingRes = await supabase.from('level_test_scores').select('raw_scores, calculated_metrics').eq('level_test_id', levelTest.id).eq('student_id', stu.id).maybeSingle()
      const existingRaw = existingRes.data?.raw_scores || {}
      const existingCalc = existingRes.data?.calculated_metrics || {}
      const { error } = await supabase.from('level_test_scores').upsert({
        level_test_id: levelTest.id, student_id: stu.id,
        raw_scores: { ...existingRaw, written_answers: sc.answers, written_rubric: sc.writing, written_mc: mcTotal, writing: wTotal },
        calculated_metrics: { ...existingCalc, written_mc_total: mcTotal, written_mc_max: config.totalMC, written_mc_pct: Math.round((mcTotal / config.totalMC) * 100), writing_total: wTotal, writing_max: config.writingMax, written_domain_scores: domainScores, written_standards_mastery: standardsMastery },
        previous_class: students.find(s => s.id === stu.id)?.english_class || null, entered_by: null,
      }, { onConflict: 'level_test_id,student_id' })
      if (error) errors++
    }
    savingRef.current = false
    if (errors === 0) {
      setSavedSnapshot(JSON.parse(JSON.stringify(scoresRef.current)))
      showToast(`Auto-saved ${dirty.length} student${dirty.length === 1 ? '' : 's'}`)
    }
  }, [config, students, levelTest.id])

  // Auto-save every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => { autoSave() }, 30000)
    return () => clearInterval(timer)
  }, [autoSave])

  // Auto-save on tab visibility change (teacher switches tabs)
  useEffect(() => {
    const handler = () => { if (document.hidden) autoSave() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [autoSave])

  // Auto-save on unmount (teacher switches phases)
  useEffect(() => {
    return () => { autoSave() }
  }, [autoSave])

  // Save — saves ALL students with data across ALL classes (not just current filter)
  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    let errors = 0
    const toSave = students.filter(s => studentHasData(s.id))

    for (const stu of toSave) {
      const sc = scores[stu.id]
      const mcTotal = config.questions.reduce((sum, q) => sum + (sc.answers[q.qNum] === q.correct ? dokWeight(q.dok) : 0), 0)
      const wTotal = config.writingCategories.reduce((sum, cat) => sum + (sc.writing[cat.key] || 0), 0)

      // Domain breakdown (weighted)
      const domainScores: Record<string, { correct: number; total: number }> = {}
      config.questions.forEach(q => {
        if (sc.answers[q.qNum]) {
          const w = dokWeight(q.dok)
          if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 }
          domainScores[q.domain].total += w
          if (sc.answers[q.qNum] === q.correct) domainScores[q.domain].correct += w
        }
      })

      // Standards mastery (weighted)
      const standardsMastery: Record<string, { met: number; total: number }> = {}
      config.questions.forEach(q => {
        if (sc.answers[q.qNum]) {
          const w = dokWeight(q.dok)
          if (!standardsMastery[q.standard]) standardsMastery[q.standard] = { met: 0, total: 0 }
          standardsMastery[q.standard].total += w
          if (sc.answers[q.qNum] === q.correct) standardsMastery[q.standard].met += w
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
    if (errors === 0) setSavedSnapshot(JSON.parse(JSON.stringify(scores))) // Update clean snapshot
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
                  {hasData && <div className="text-[9px] text-text-tertiary">{sAnswered}/{config.questionCount} MC</div>}
                </div>
                {hasData && <Check size={12} className="text-green-500 flex-shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Save button */}
        <div className="p-3 border-t border-border">
          {hasDirtyData && <p className="text-[9px] text-amber-600 font-medium text-center mb-1">Unsaved changes</p>}
          <button onClick={handleSave} disabled={saving}
            className={`w-full py-2 rounded-lg text-[12px] font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${hasDirtyData ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-navy text-white hover:bg-navy/90'}`}>
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
          <AnalyticsView config={config} analytics={analytics} scores={scores} students={students} excludedQuestions={excludedQuestions} onToggleExclude={handleToggleExclude} canToggleExclude={canToggleExclude} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-navy text-white px-4 py-2 rounded-lg shadow-lg text-[13px] animate-fade-in z-50">{toast}</div>
      )}
    </div>
  )
}
