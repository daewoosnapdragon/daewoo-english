'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { WIDA_LEVELS, WIDA_DOMAINS } from './CurriculumView'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CCSSDomain } from './ccss-standards'
import {
  BookOpen, Globe2, Layers, ChevronDown, ChevronRight, Info, Search,
  Plus, X, Check, Loader2, User, ArrowLeftRight, Lightbulb, GraduationCap,
  Bookmark, BookMarked, ListChecks
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// SCAFFOLD DATABASE - Organized by domain and WIDA level
// Content sourced from the WIDA Teacher Training Manual
// ═══════════════════════════════════════════════════════════════════

export interface Scaffold {
  id: string
  domain: 'listening' | 'speaking' | 'reading' | 'writing' | 'general'
  levelRange: [number, number] // e.g. [1, 2] = L1-L2
  text: string
  category: string // grouping label
}

export const SCAFFOLD_BANK: Scaffold[] = [
  // ═══════════════════════════════════════════════════════════════
  // LISTENING
  // ═══════════════════════════════════════════════════════════════

  // L1-L2: Direct Instruction (Krashen) -- heavy teacher scaffolding
  { id: 'L-1', domain: 'listening', levelRange: [1, 2], category: 'Input Modification',
    text: 'Use simplified language with short sentences, clear enunciation, and frequent pauses' },
  { id: 'L-2', domain: 'listening', levelRange: [1, 2], category: 'Input Modification',
    text: 'Pair all verbal instructions with visual steps (pictures, diagrams, or written keywords)' },
  { id: 'L-3', domain: 'listening', levelRange: [1, 2], category: 'Input Modification',
    text: 'Use Total Physical Response (TPR) -- act out vocabulary and instructions' },
  { id: 'L-4', domain: 'listening', levelRange: [1, 2], category: 'Comprehension Support',
    text: 'Pre-teach 5-7 key vocabulary words before each lesson using picture cards' },
  { id: 'L-5', domain: 'listening', levelRange: [1, 2], category: 'Comprehension Support',
    text: 'Allow bilingual buddy to translate key instructions into Korean' },
  { id: 'L-6', domain: 'listening', levelRange: [1, 2], category: 'Comprehension Support',
    text: 'Use yes/no and either/or comprehension checks instead of open-ended questions' },
  { id: 'L-6b', domain: 'listening', levelRange: [1, 2], category: 'Comprehension Support',
    text: 'Use physical objects and realia to make abstract concepts concrete during instruction' },
  { id: 'L-6c', domain: 'listening', levelRange: [1, 2], category: 'Input Modification',
    text: 'Pace instruction slowly with frequent modeling -- show then tell, not just tell' },
  { id: 'L-6d', domain: 'listening', levelRange: [1, 2], category: 'Input Modification',
    text: 'View content videos in Korean first to build schema, then replay in English' },

  // L3: Joint Construction -- teacher guides, student begins constructing
  { id: 'L-7', domain: 'listening', levelRange: [3, 3], category: 'Input Modification',
    text: 'Speak at a natural pace but repeat key information and rephrase complex ideas' },
  { id: 'L-8', domain: 'listening', levelRange: [3, 3], category: 'Input Modification',
    text: 'Use graphic organizers (T-charts, Venn diagrams) to structure listening tasks' },
  { id: 'L-9', domain: 'listening', levelRange: [3, 3], category: 'Comprehension Support',
    text: 'Provide listening guides with key questions written out before audio/video activities' },
  { id: 'L-10', domain: 'listening', levelRange: [3, 3], category: 'Comprehension Support',
    text: 'Use think-pair-share after listening tasks to allow oral processing before writing' },
  { id: 'L-10b', domain: 'listening', levelRange: [3, 3], category: 'Comprehension Support',
    text: 'Use annotated diagrams and outlines during lectures to anchor verbal input visually' },
  { id: 'L-10c', domain: 'listening', levelRange: [3, 3], category: 'Comprehension Support',
    text: 'Highlight key words using color-coding on the board to distinguish categories of information' },

  // L4-L5: Coached Construction -- teacher provides feedback as students use strategies independently
  { id: 'L-11', domain: 'listening', levelRange: [4, 5], category: 'Academic Extension',
    text: 'Introduce academic listening -- note-taking strategies, identifying main idea vs. detail' },
  { id: 'L-12', domain: 'listening', levelRange: [4, 5], category: 'Academic Extension',
    text: 'Use content-area videos and podcasts with comprehension tasks' },
  { id: 'L-13', domain: 'listening', levelRange: [4, 5], category: 'Academic Extension',
    text: 'Teach students to identify signal words (however, therefore, in contrast) in oral language' },
  { id: 'L-13b', domain: 'listening', levelRange: [4, 5], category: 'Academic Extension',
    text: 'Have students evaluate ideas from oral presentations and provide reasoned responses' },

  // L5-L6: Monitor -- monitor students\' independent use of strategies
  { id: 'L-14', domain: 'listening', levelRange: [5, 6], category: 'Critical Listening',
    text: 'Analyze speaker\'s purpose, bias, and rhetorical strategies in oral texts (speeches, debates, ads)' },
  { id: 'L-15', domain: 'listening', levelRange: [5, 6], category: 'Critical Listening',
    text: 'Compare information across multiple oral sources and evaluate conflicting claims' },
  { id: 'L-16', domain: 'listening', levelRange: [5, 6], category: 'Academic Register',
    text: 'Identify register shifts in spoken language -- how the same speaker adjusts for audience (formal presentation vs. casual chat)' },
  { id: 'L-17', domain: 'listening', levelRange: [5, 6], category: 'Academic Register',
    text: 'Listen to academic lectures and take structured Cornell-style notes independently' },
  { id: 'L-18', domain: 'listening', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Identify and discuss idioms, sarcasm, and implied meaning in spoken English' },
  { id: 'L-19', domain: 'listening', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Notice and discuss how intonation and stress change meaning in English sentences' },

  // ═══════════════════════════════════════════════════════════════
  // SPEAKING
  // ═══════════════════════════════════════════════════════════════

  // L1-L2: Direct Instruction
  { id: 'S-1', domain: 'speaking', levelRange: [1, 2], category: 'Output Support',
    text: 'Accept one-word and short-phrase responses; do not force full sentences' },
  { id: 'S-2', domain: 'speaking', levelRange: [1, 2], category: 'Output Support',
    text: 'Provide sentence frames on cards: "I see a ___." "This is ___." "I like ___."' },
  { id: 'S-3', domain: 'speaking', levelRange: [1, 2], category: 'Output Support',
    text: 'Use choral response and repetition activities to build confidence' },
  { id: 'S-4', domain: 'speaking', levelRange: [1, 2], category: 'Participation',
    text: 'Allow 10+ seconds of wait time before expecting a verbal response' },
  { id: 'S-5', domain: 'speaking', levelRange: [1, 2], category: 'Participation',
    text: 'Value nonverbal participation (pointing, gesturing, drawing) as communication' },
  { id: 'S-6', domain: 'speaking', levelRange: [1, 2], category: 'Participation',
    text: 'Pair with a bilingual peer for small group activities' },
  { id: 'S-6b', domain: 'speaking', levelRange: [1, 2], category: 'Output Support',
    text: 'Use labeling, naming, and gesturing activities -- match images to vocabulary orally' },

  // L3: Joint Construction
  { id: 'S-7', domain: 'speaking', levelRange: [3, 3], category: 'Output Support',
    text: 'Provide discussion sentence starters: "I think ___ because ___." "I agree/disagree because ___."' },
  { id: 'S-8', domain: 'speaking', levelRange: [3, 3], category: 'Output Support',
    text: 'Use talk moves: "Can you say more about ___?" "What do you mean by ___?"' },
  { id: 'S-9', domain: 'speaking', levelRange: [3, 3], category: 'Structured Practice',
    text: 'Assign specific discussion roles (questioner, summarizer, connector)' },
  { id: 'S-10', domain: 'speaking', levelRange: [3, 3], category: 'Structured Practice',
    text: 'Use structured turn-taking protocols (numbered heads, talking chips)' },
  { id: 'S-10b', domain: 'speaking', levelRange: [3, 3], category: 'Structured Practice',
    text: 'Practice prepared summaries -- students rehearse oral summaries before sharing with the class' },
  { id: 'S-10c', domain: 'speaking', levelRange: [3, 3], category: 'Output Support',
    text: 'Use compare-and-contrast speaking tasks with provided vocabulary and structure' },

  // L4-L5: Coached Construction
  { id: 'S-11', domain: 'speaking', levelRange: [4, 5], category: 'Academic Language',
    text: 'Teach academic language functions: compare/contrast, cause/effect, persuade' },
  { id: 'S-12', domain: 'speaking', levelRange: [4, 5], category: 'Academic Language',
    text: 'Assign as discussion leader or peer tutor to deepen understanding through teaching' },
  { id: 'S-13', domain: 'speaking', levelRange: [4, 5], category: 'Academic Language',
    text: 'Challenge with higher-order questions: "What would happen if ___?" "How does ___ relate to ___?"' },
  { id: 'S-13b', domain: 'speaking', levelRange: [4, 5], category: 'Academic Language',
    text: 'Use sentence frames that require explaining and justifying: "The evidence suggests ___ because ___."' },
  { id: 'S-13c', domain: 'speaking', levelRange: [4, 5], category: 'Academic Language',
    text: 'Practice oral presentations with audience-awareness coaching (eye contact, volume, pacing)' },

  // L5-L6: Monitor
  { id: 'S-14', domain: 'speaking', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Lead Socratic seminars -- facilitate discussion using open-ended questions and textual evidence' },
  { id: 'S-15', domain: 'speaking', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Debate a topic using formal argumentation structure (claim, evidence, counterargument, rebuttal)' },
  { id: 'S-16', domain: 'speaking', levelRange: [5, 6], category: 'Academic Register',
    text: 'Practice register shifting -- deliver the same information formally (to a teacher) and informally (to a friend)' },
  { id: 'S-17', domain: 'speaking', levelRange: [5, 6], category: 'Academic Register',
    text: 'Use hedging and qualifying language: "It could be argued that..." "While some evidence suggests..."' },
  { id: 'S-18', domain: 'speaking', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Serve as language mentor for L1-L3 peers -- teach vocabulary, model pronunciation, explain concepts' },
  { id: 'S-19', domain: 'speaking', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Facilitate small-group instruction -- lead a guided reading group or writing workshop for lower-level peers' },
  { id: 'S-20', domain: 'speaking', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Explain grammar rules to peers in own words -- articulating rules deepens internalization' },
  { id: 'S-21', domain: 'speaking', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Discuss word choice and connotation -- why "strolled" vs "walked" vs "trudged" matters' },

  // ═══════════════════════════════════════════════════════════════
  // READING
  // ═══════════════════════════════════════════════════════════════

  // L1-L2: Direct Instruction
  { id: 'R-1', domain: 'reading', levelRange: [1, 2], category: 'Text Access',
    text: 'Provide texts with picture support on every page' },
  { id: 'R-2', domain: 'reading', levelRange: [1, 2], category: 'Text Access',
    text: 'Use predictable and patterned texts with repetitive structures' },
  { id: 'R-3', domain: 'reading', levelRange: [1, 2], category: 'Text Access',
    text: 'Pre-read texts aloud while students follow along before independent reading' },
  { id: 'R-4', domain: 'reading', levelRange: [1, 2], category: 'Comprehension',
    text: 'Use picture walks before reading to build background knowledge' },
  { id: 'R-5', domain: 'reading', levelRange: [1, 2], category: 'Comprehension',
    text: 'Accept pointing to pictures, matching, and drawing as comprehension responses' },
  { id: 'R-6', domain: 'reading', levelRange: [1, 2], category: 'Comprehension',
    text: 'Create bilingual vocabulary cards for key terms in each text' },
  { id: 'R-6b', domain: 'reading', levelRange: [1, 2], category: 'Text Access',
    text: 'Read modified texts or Korean-language texts on the same topic to build schema before English text' },

  // L3: Joint Construction
  { id: 'R-7', domain: 'reading', levelRange: [3, 3], category: 'Text Access',
    text: 'Highlight key vocabulary in texts before distributing' },
  { id: 'R-8', domain: 'reading', levelRange: [3, 3], category: 'Text Access',
    text: 'Provide graphic organizers (story maps, main idea webs) alongside texts' },
  { id: 'R-9', domain: 'reading', levelRange: [3, 3], category: 'Comprehension',
    text: 'Teach text features explicitly (headings, bold words, captions, glossary)' },
  { id: 'R-10', domain: 'reading', levelRange: [3, 3], category: 'Comprehension',
    text: 'Use guided reading groups with teacher-led discussion of each section' },
  { id: 'R-10b', domain: 'reading', levelRange: [3, 3], category: 'Comprehension',
    text: 'Categorize information from texts using tables, charts, or sorting activities' },
  { id: 'R-10c', domain: 'reading', levelRange: [3, 3], category: 'Comprehension',
    text: 'Sequence events from a text using sentence strips or timeline activities' },

  // L4-L5: Coached Construction
  { id: 'R-11', domain: 'reading', levelRange: [4, 5], category: 'Academic Reading',
    text: 'Introduce annotation strategies (underline key ideas, circle unknown words, margin notes)' },
  { id: 'R-12', domain: 'reading', levelRange: [4, 5], category: 'Academic Reading',
    text: 'Use text-dependent questions that require citing evidence' },
  { id: 'R-13', domain: 'reading', levelRange: [4, 5], category: 'Academic Reading',
    text: 'Assign mentor texts as models for writing style and structure' },
  { id: 'R-13b', domain: 'reading', levelRange: [4, 5], category: 'Academic Reading',
    text: 'Use analogies and connections between texts -- compare themes, characters, or arguments across readings' },
  { id: 'R-13c', domain: 'reading', levelRange: [4, 5], category: 'Academic Reading',
    text: 'Create infographics or posters to synthesize and present information from texts' },

  // L5-L6: Monitor
  { id: 'R-14', domain: 'reading', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Analyze author\'s craft -- why did the author choose this structure, word, or perspective?' },
  { id: 'R-15', domain: 'reading', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Identify bias, perspective, and missing voices in nonfiction texts' },
  { id: 'R-16', domain: 'reading', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Compare how two authors treat the same topic differently -- analyze purpose, audience, and rhetorical choices' },
  { id: 'R-17', domain: 'reading', levelRange: [5, 6], category: 'Academic Register',
    text: 'Read content-area texts (science, social studies) and identify discipline-specific language patterns' },
  { id: 'R-18', domain: 'reading', levelRange: [5, 6], category: 'Academic Register',
    text: 'Recognize passive voice, nominalizations, and other academic writing features and explain their purpose' },
  { id: 'R-19', domain: 'reading', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Study word origins, roots, prefixes, and suffixes to build deep vocabulary understanding' },
  { id: 'R-20', domain: 'reading', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Discuss figurative language (metaphor, irony, symbolism) and explain how it creates meaning beyond the literal' },
  { id: 'R-21', domain: 'reading', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Lead literature circles -- facilitate peer discussion and model reading strategies for mixed-level groups' },

  // ═══════════════════════════════════════════════════════════════
  // WRITING
  // ═══════════════════════════════════════════════════════════════

  // L1-L2: Direct Instruction
  { id: 'W-1', domain: 'writing', levelRange: [1, 2], category: 'Output Support',
    text: 'Accept drawings with labels, word lists, and copied sentences as valid writing' },
  { id: 'W-2', domain: 'writing', levelRange: [1, 2], category: 'Output Support',
    text: 'Provide word banks organized by topic with pictures' },
  { id: 'W-3', domain: 'writing', levelRange: [1, 2], category: 'Output Support',
    text: 'Use cloze (fill-in-the-blank) sentence frames: "The ___ is ___."' },
  { id: 'W-4', domain: 'writing', levelRange: [1, 2], category: 'Scaffolded Tasks',
    text: 'Use shared writing (teacher writes, students contribute ideas orally)' },
  { id: 'W-5', domain: 'writing', levelRange: [1, 2], category: 'Scaffolded Tasks',
    text: 'Provide sentence-level writing tasks rather than paragraph-level' },
  { id: 'W-5b', domain: 'writing', levelRange: [1, 2], category: 'Scaffolded Tasks',
    text: 'Create in home-language groups first, then translate specific words into English' },
  { id: 'W-5c', domain: 'writing', levelRange: [1, 2], category: 'Output Support',
    text: 'Use Quick Writes (1-2 minutes of low-pressure free writing) to build fluency without accuracy pressure' },

  // L3: Joint Construction
  { id: 'W-6', domain: 'writing', levelRange: [3, 3], category: 'Output Support',
    text: 'Provide paragraph frames with transition words and sentence starters' },
  { id: 'W-7', domain: 'writing', levelRange: [3, 3], category: 'Output Support',
    text: 'Use graphic organizers (hamburger paragraph, web) for pre-writing' },
  { id: 'W-8', domain: 'writing', levelRange: [3, 3], category: 'Process Support',
    text: 'Give writing checklists: "Did I include ___? Did I use a capital letter?"' },
  { id: 'W-9', domain: 'writing', levelRange: [3, 3], category: 'Process Support',
    text: 'Allow oral rehearsal before writing (tell a partner what you will write)' },
  { id: 'W-9b', domain: 'writing', levelRange: [3, 3], category: 'Output Support',
    text: 'Use concept maps to organize ideas before drafting' },
  { id: 'W-9c', domain: 'writing', levelRange: [3, 3], category: 'Process Support',
    text: 'Write collaboratively -- joint construction of a paragraph before independent practice' },
  { id: 'W-9d', domain: 'writing', levelRange: [3, 3], category: 'Output Support',
    text: 'Explain cause and effect and defend opinions using sentence frames that require reasoning' },

  // L4-L5: Coached Construction
  { id: 'W-10', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Teach editing and revision strategies using peer editing protocols' },
  { id: 'W-11', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Use mentor texts to teach specific writing craft moves' },
  { id: 'W-12', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Focus on academic vocabulary and connectors (however, therefore, in addition)' },
  { id: 'W-12b', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Compose multi-paragraph texts to communicate a central message with evidence' },
  { id: 'W-12c', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Hypothesize and provide written justification -- practice "because" and "evidence shows" structures' },
  { id: 'W-12d', domain: 'writing', levelRange: [4, 5], category: 'Academic Writing',
    text: 'Connect topics to different contexts -- apply ideas from one text/subject to another in writing' },

  // L5-L6: Monitor
  { id: 'W-13', domain: 'writing', levelRange: [5, 6], category: 'Academic Register',
    text: 'Teach nominalization -- turning verbs/adjectives into nouns for academic writing ("decide" > "the decision to...")' },
  { id: 'W-14', domain: 'writing', levelRange: [5, 6], category: 'Academic Register',
    text: 'Practice writing in different registers for different audiences (email to teacher vs. letter to editor vs. lab report)' },
  { id: 'W-15', domain: 'writing', levelRange: [5, 6], category: 'Academic Register',
    text: 'Use hedging language in analytical writing: "The data suggests..." "It appears that..." "One interpretation is..."' },
  { id: 'W-16', domain: 'writing', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Write literary analysis examining author\'s craft, theme development, and use of literary devices' },
  { id: 'W-17', domain: 'writing', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Construct persuasive essays with counterarguments and rebuttals' },
  { id: 'W-18', domain: 'writing', levelRange: [5, 6], category: 'Creative Extension',
    text: 'Experiment with voice, style, and genre -- write the same event as a news article, diary entry, and poem' },
  { id: 'W-19', domain: 'writing', levelRange: [5, 6], category: 'Creative Extension',
    text: 'Design a product, create a process, or produce an exhibit with written explanation and rationale' },
  { id: 'W-20', domain: 'writing', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Self-edit for academic register -- identify and revise informal language into academic tone' },
  { id: 'W-21', domain: 'writing', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Analyze own writing for patterns of error and develop personalized editing checklists' },
  { id: 'W-22', domain: 'writing', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Serve as peer editor for lower-level writers -- provide constructive feedback using a rubric' },

  // ═══════════════════════════════════════════════════════════════
  // GENERAL / CROSS-DOMAIN
  // ═══════════════════════════════════════════════════════════════

  // L1-L2
  { id: 'G-1', domain: 'general', levelRange: [1, 2], category: 'Classroom Environment',
    text: 'Seat near teacher and bilingual buddy' },
  { id: 'G-2', domain: 'general', levelRange: [1, 2], category: 'Classroom Environment',
    text: 'Maintain a bilingual word wall updated weekly with current unit vocabulary' },
  { id: 'G-3', domain: 'general', levelRange: [1, 2], category: 'Classroom Environment',
    text: 'Post visual daily schedule and classroom routines' },
  { id: 'G-3b', domain: 'general', levelRange: [1, 2], category: 'Classroom Environment',
    text: 'Work 1-on-1 with the teacher during independent practice time for direct instruction' },
  { id: 'G-3c', domain: 'general', levelRange: [1, 2], category: 'Comprehensible Input',
    text: 'Use Google Translate strategically -- translate key concepts from Korean to English, not entire lessons' },

  // L3
  { id: 'G-4', domain: 'general', levelRange: [3, 3], category: 'Classroom Environment',
    text: 'Use collaborative seating arrangements for structured peer interaction' },
  { id: 'G-5', domain: 'general', levelRange: [3, 3], category: 'Classroom Environment',
    text: 'Provide anchor charts for frequently used academic language' },
  { id: 'G-5b', domain: 'general', levelRange: [3, 3], category: 'Comprehensible Input',
    text: 'Use examples, outlines, and videos to supplement verbal instruction' },
  { id: 'G-5c', domain: 'general', levelRange: [3, 3], category: 'Comprehensible Input',
    text: 'Use graphs, tables, and charts to present information in non-linguistic formats' },

  // L4-L5
  { id: 'G-6', domain: 'general', levelRange: [4, 5], category: 'Coached Construction',
    text: 'Assign leadership roles: peer tutor, discussion facilitator, materials manager' },
  { id: 'G-7', domain: 'general', levelRange: [4, 5], category: 'Coached Construction',
    text: 'Provide extension activities and independent research opportunities' },
  { id: 'G-7b', domain: 'general', levelRange: [4, 5], category: 'Coached Construction',
    text: 'Use mix-pair collaboration -- partner advanced ELLs with native speakers for content-area projects' },
  { id: 'G-7c', domain: 'general', levelRange: [4, 5], category: 'Coached Construction',
    text: 'Create models -- students build and explain physical or digital models of concepts' },

  // L5-L6
  { id: 'G-8', domain: 'general', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Assign as cross-class language ambassador -- visit lower-level classes to model and assist' },
  { id: 'G-9', domain: 'general', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Create and teach mini-lessons to peers -- the act of teaching deepens the teacher\'s own mastery' },
  { id: 'G-10', domain: 'general', levelRange: [5, 6], category: 'Leadership & Mentoring',
    text: 'Facilitate small-group collaborative projects with mixed-proficiency teams' },
  { id: 'G-11', domain: 'general', levelRange: [5, 6], category: 'Academic Register',
    text: 'Study how language differs across content areas -- science language vs. literary language vs. math language' },
  { id: 'G-12', domain: 'general', levelRange: [5, 6], category: 'Academic Register',
    text: 'Practice code-switching explicitly -- when and how to shift between casual and academic English' },
  { id: 'G-13', domain: 'general', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Evaluate sources for credibility, bias, and purpose -- develop information literacy skills' },
  { id: 'G-14', domain: 'general', levelRange: [5, 6], category: 'Critical Literacy',
    text: 'Debate ethical and social issues using structured academic discourse protocols' },
  { id: 'G-15', domain: 'general', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Compare English grammar/structures with Korean -- use L1 knowledge as a resource, not a barrier' },
  { id: 'G-16', domain: 'general', levelRange: [5, 6], category: 'Metalinguistic Awareness',
    text: 'Study how language changes across time periods and genres -- develop awareness of English as a living system' },
  { id: 'G-17', domain: 'general', levelRange: [5, 6], category: 'Creative Extension',
    text: 'Produce exhibits, blogs, or presentations for authentic audiences beyond the classroom' },
  { id: 'G-18', domain: 'general', levelRange: [5, 6], category: 'Creative Extension',
    text: 'Design and execute independent research projects with teacher as advisor rather than instructor' },
]

const DOMAIN_LABELS: Record<string, string> = {
  listening: 'Listening', speaking: 'Speaking', reading: 'Reading', writing: 'Writing', general: 'General'
}

const DOMAIN_ICONS: Record<string, string> = {
  listening: 'ear', speaking: 'mic', reading: 'book', writing: 'pen', general: 'star'
}

// ═══════════════════════════════════════════════════════════════════
// MAIN GUIDE COMPONENT
// ═══════════════════════════════════════════════════════════════════

type GuideSection = 'overview' | 'comparison' | 'scaffolds' | 'assign'

export default function WIDAGuide() {
  const [section, setSection] = useState<GuideSection>('overview')

  const tabs: { id: GuideSection; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'WIDA Overview', icon: GraduationCap },
    { id: 'comparison', label: 'WIDA vs CCSS', icon: ArrowLeftRight },
    { id: 'scaffolds', label: 'Scaffold Index', icon: Lightbulb },
    { id: 'assign', label: 'Assign to Students', icon: BookMarked },
  ]

  return (
    <div>
      <div className="flex gap-1 mb-6">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setSection(tab.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
              section === tab.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {section === 'overview' && <WIDAOverview />}
      {section === 'comparison' && <WIDAvsCCSS />}
      {section === 'scaffolds' && <ScaffoldIndex />}
      {section === 'assign' && <AssignScaffolds />}
    </div>
  )
}

// ─── SECTION 1: WIDA Overview ──────────────────────────────────────

function WIDAOverview() {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null)

  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-5 mb-6">
        <h3 className="text-[15px] font-bold text-navy mb-2">What is WIDA?</h3>
        <p className="text-[13px] text-text-secondary leading-relaxed mb-3">
          WIDA is a framework for understanding and supporting English Language Learners. It describes six levels of English language proficiency (1-6) across four domains: Listening, Speaking, Reading, and Writing. At Daewoo, we use WIDA to identify what kind of language support each student needs -- regardless of which class they are in.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
          <p className="text-[12px] text-amber-800 font-medium">
            Key distinction: WIDA levels are ABSOLUTE, not relative to your class. A Level 3 student means the same thing whether they are in Lily or Snapdragon. Your class placement (Lily-Snapdragon) determines WHAT you teach. WIDA levels determine HOW you teach it.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-3">The Four Language Domains</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { domain: 'Listening', desc: 'How well the student understands spoken English. Can they follow your instructions? Understand a read-aloud? Process classroom discussion?', questions: ['Can this student follow multi-step verbal instructions?', 'Do they understand your read-aloud without pictures?', 'Can they pick up on tone and implied meaning?'] },
            { domain: 'Speaking', desc: 'How well the student produces spoken English. Can they answer questions? Participate in discussion? Explain their thinking?', questions: ['How does this student respond when called on?', 'Can they explain their reasoning in English?', 'Do they initiate conversation with peers in English?'] },
            { domain: 'Reading', desc: 'How well the student comprehends written English. Can they decode? Understand text at their instructional level? Use reading strategies?', questions: ['Can this student read independently at their class level?', 'Do they understand what they read, or just decode?', 'Can they answer text-dependent questions?'] },
            { domain: 'Writing', desc: 'How well the student produces written English. Can they write sentences? Paragraphs? Organize ideas on paper?', questions: ['What does this student produce when asked to write freely?', 'Do they need sentence frames or word banks?', 'Can they organize ideas into paragraphs?'] },
          ].map(d => (
            <div key={d.domain} className="bg-surface-alt/50 border border-border rounded-lg p-4">
              <h4 className="text-[13px] font-bold text-navy mb-1">{d.domain}</h4>
              <p className="text-[11px] text-text-secondary leading-relaxed mb-2">{d.desc}</p>
              <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-1">Ask yourself:</p>
              {d.questions.map((q, i) => (
                <p key={i} className="text-[10px] text-text-tertiary leading-relaxed pl-3 relative before:content-['\2022'] before:absolute before:left-0 before:text-navy/40">{q}</p>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">Native Speaker Benchmarks by Grade</h3>
        <p className="text-[11px] text-text-tertiary mb-4">What a typical native English-speaking student can do at each grade level. Use this as an anchor to calibrate where your ELLs fall. A WIDA L5-L6 student should approximate these benchmarks for their grade.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-[60px]">Grade</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Listening</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Speaking</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Reading</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Writing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { grade: '1', 
                  listening: 'Follows 2-3 step oral directions. Understands stories read aloud with picture support. Can identify rhyming words and beginning sounds.',
                  speaking: 'Speaks in complete sentences. Retells familiar stories in order. Asks and answers questions about a text. Vocabulary of ~6,000 words.',
                  reading: 'Reads simple texts (levels D-J). Decodes CVC words. Recognizes ~100 sight words. Reads 60-80 CWPM by end of year.',
                  writing: 'Writes 3-5 simple sentences on a topic. Uses invented spelling. Capitalizes first word and uses periods. Can label and list.' },
                { grade: '2',
                  listening: 'Follows multi-step directions. Understands grade-level read-alouds without picture support. Identifies main idea in oral presentations.',
                  speaking: 'Uses complete sentences with growing complexity. Can explain reasoning. Participates in sustained conversations. Retells with key details.',
                  reading: 'Reads chapter books (levels K-N). Fluency of 90-110 CWPM. Uses context clues for unknown words. Identifies story elements.',
                  writing: 'Writes paragraphs with topic sentence. Uses basic punctuation and capitalization correctly. Spells common words correctly. Writes simple opinions and narratives.' },
                { grade: '3',
                  listening: 'Understands academic language in content areas. Follows classroom discussions and takes simple notes. Can distinguish fact from opinion in oral text.',
                  speaking: 'Explains ideas using academic vocabulary. Asks clarifying questions. Can summarize information from a presentation. Uses compound sentences.',
                  reading: 'Reads grade-level text independently (levels O-S). Fluency of 110-130 CWPM. Makes inferences. Identifies theme and main idea. Uses text features.',
                  writing: 'Writes multi-paragraph pieces with introduction and conclusion. Uses transition words. Writes in different genres (narrative, opinion, informational). Revises own writing.' },
                { grade: '4',
                  listening: 'Understands abstract concepts presented orally. Can synthesize information from multiple speakers. Identifies speaker purpose and perspective.',
                  speaking: 'Uses academic language functions (compare, analyze, evaluate). Presents organized oral reports. Supports opinions with evidence. Uses complex sentences.',
                  reading: 'Reads complex texts across genres (levels T-V). Fluency of 120-145 CWPM. Analyzes character development. Compares texts. Reads content-area textbooks.',
                  writing: 'Writes organized essays with evidence. Uses varied sentence structure. Edits for grammar and conventions. Writes research-based informational pieces.' },
                { grade: '5',
                  listening: 'Comprehends nuanced academic discourse. Evaluates oral arguments. Understands figurative language, idioms, and sarcasm in context.',
                  speaking: 'Engages in academic debate. Uses precise vocabulary. Adjusts register for audience. Can teach concepts to peers. Uses conditional and hypothetical language.',
                  reading: 'Reads at adult-level fluency 140-170 CWPM. Analyzes author\'s craft and perspective. Reads across disciplines independently. Synthesizes multiple sources.',
                  writing: 'Writes sophisticated multi-paragraph essays. Uses literary devices. Writes in formal and informal registers. Self-edits effectively. Develops and supports a thesis.' },
              ].map(row => (
                <tr key={row.grade}>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg bg-navy text-white text-[12px] font-bold">{row.grade}</span>
                  </td>
                  <td className="px-3 py-3 align-top text-[10px] text-text-secondary leading-relaxed">{row.listening}</td>
                  <td className="px-3 py-3 align-top text-[10px] text-text-secondary leading-relaxed">{row.speaking}</td>
                  <td className="px-3 py-3 align-top text-[10px] text-text-secondary leading-relaxed">{row.reading}</td>
                  <td className="px-3 py-3 align-top text-[10px] text-text-secondary leading-relaxed">{row.writing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-text-tertiary mt-2 italic">Sources: Common Core State Standards, Hasbrouck-Tindal ORF norms, and typical developmental milestones. CWPM figures represent 50th percentile spring benchmarks.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">Typical WIDA Distributions by Class</h3>
        <p className="text-[11px] text-text-tertiary mb-4">These are general expectations. Individual students may vary -- and those outliers are the whole point of tracking WIDA levels.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Class</th>
                <th className="text-center px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Typical Range</th>
                <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">What This Means</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cls: 'Lily', range: 'L1-L2', desc: 'Most students are Entering or Emerging. Heavy scaffolding is the norm. Instruction should rely on visuals, TPR, bilingual support, and single-word/phrase-level output expectations.' },
                { cls: 'Camellia', range: 'L1-L3', desc: 'Mix of Emerging and early Developing students. Sentence frames, word banks, and structured output tasks. Some students beginning to produce sentences independently.' },
                { cls: 'Daisy', range: 'L2-L3', desc: 'Mostly Developing. Students follow familiar topics, speak in simple sentences, write with support. Graphic organizers and structured activities are key scaffolds.' },
                { cls: 'Sunflower', range: 'L3-L4', desc: 'Developing to Expanding. Growing independence. Less scaffolding needed, but academic vocabulary and text features still require explicit teaching.' },
                { cls: 'Marigold', range: 'L3-L5', desc: 'Expanding to Bridging. Students can work independently on most tasks. Focus shifts to academic language precision, complex texts, and writing craft.' },
                { cls: 'Snapdragon', range: 'L4-L6', desc: 'Expanding to Reaching. Most students are L4-L5 with a few at L6. Focus on academic register, critical literacy, metalinguistic awareness, and leadership roles for the highest-proficiency students.' },
              ].map(row => (
                <tr key={row.cls} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold"
                      style={{ backgroundColor: classToColor(row.cls as EnglishClass), color: classToTextColor(row.cls as EnglishClass) }}>
                      {row.cls}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold text-navy">{row.range}</td>
                  <td className="px-4 py-2.5 text-text-secondary text-[11px] leading-relaxed">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="text-[14px] font-bold text-navy mb-3">The Six Proficiency Levels</h3>
      <div className="space-y-2">
        {WIDA_LEVELS.map(wl => {
          const isOpen = expandedLevel === wl.level
          const classroomIndicators: Record<number, string[]> = {
            1: [
              'Uses Korean to communicate basic needs',
              'Points or gestures instead of speaking English',
              'Can copy words but cannot write independently',
              'Needs picture support for every activity',
              'May understand some words but cannot respond in English',
              'Often appears confused during whole-class instruction',
            ],
            2: [
              'Answers yes/no and simple WH-questions with support',
              'Uses memorized phrases: "Can I go bathroom?"',
              'Reads familiar sight words and patterned text',
              'Writes using word banks and copied sentence patterns',
              'Follows routine classroom instructions',
              'Speaks in 2-4 word phrases',
            ],
            3: [
              'Speaks in simple sentences with noticeable errors',
              'Follows most classroom discussion on familiar topics',
              'Reads at instructional level with some support',
              'Writes paragraphs but with frequent grammar errors',
              'Can retell a story with prompting',
              'Beginning to use academic vocabulary',
            ],
            4: [
              'Communicates well for most classroom tasks',
              'Reads independently with occasional confusion on academic text',
              'Writes organized paragraphs with developing control',
              'You sometimes forget this student is an ELL',
              'Uses varied vocabulary including some academic terms',
              'Can explain thinking and reasoning with some complexity',
            ],
            5: [
              'Near-native fluency in conversation',
              'Reads and writes at or near grade level',
              'Errors are minor and do not impede communication',
              'Can explain complex ideas to peers',
              'Uses figurative language and idioms with some accuracy',
              'Participates fully in academic discussion',
            ],
            6: [
              'Fully proficient -- indistinguishable from native speakers',
              'Performs at or above grade level across all domains',
              'No longer needs ELL-specific scaffolding',
              'Can serve as a language model for peers',
              'Understands nuance, humor, and cultural references in English',
            ],
          }

          return (
            <div key={wl.level} className="bg-surface border border-border rounded-xl overflow-hidden">
              <button onClick={() => setExpandedLevel(isOpen ? null : wl.level)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-alt/30 transition-colors">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[16px] font-bold text-white"
                  style={{ backgroundColor: wl.color }}>
                  L{wl.level}
                </div>
                <div className="flex-1">
                  <span className="text-[13px] font-bold text-navy">{wl.name}</span>
                  <p className="text-[11px] text-text-secondary">{wl.desc}</p>
                </div>
                {isOpen ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 border-t border-border pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">What you will see in your classroom</p>
                      {(classroomIndicators[wl.level] || []).map((ind, i) => (
                        <p key={i} className="text-[11px] text-text-secondary leading-relaxed pl-3 mb-1 relative before:content-['\2022'] before:absolute before:left-0 before:text-navy/30">{ind}</p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Scaffolding strategies</p>
                      <p className="text-[11px] text-blue-700 bg-blue-50 rounded-lg p-3 leading-relaxed">{wl.scaffolds}</p>
                      <p className="text-[10px] text-text-tertiary mt-2 italic">See the Scaffold Index tab for a complete list organized by domain.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SECTION 2: WIDA vs CCSS Comparison ────────────────────────────

function WIDAvsCCSS() {
  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-5 mb-6">
        <h3 className="text-[15px] font-bold text-navy mb-2">Two Systems, One Classroom</h3>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          CCSS (Common Core State Standards) and WIDA serve different but complementary purposes. Understanding how they work together is the key to effective differentiated instruction in our program.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-6">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-alt">
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-40"></th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#1565C0' }}>CCSS</th>
              <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#2E7D32' }}>WIDA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { label: 'Answers the question', ccss: 'WHAT should students learn?', wida: 'HOW do ELLs access that learning?' },
              { label: 'Purpose', ccss: 'Defines grade-level content expectations in ELA', wida: 'Describes stages of English language acquisition' },
              { label: 'Structure', ccss: '6 domains (RL, RI, RF, W, SL, L) by grade level', wida: '4 domains (Listening, Speaking, Reading, Writing) by proficiency level 1-6' },
              { label: 'Scope', ccss: 'What a student at grade level should know and be able to do', wida: 'What an English learner CAN do at each proficiency stage' },
              { label: 'Designed for', ccss: 'All students (assumes English proficiency)', wida: 'English Language Learners specifically' },
              { label: 'At Daewoo', ccss: 'Determines the content standards each class works on (adjusted by class tier)', wida: 'Determines the language scaffolding each student receives' },
              { label: 'Changes with', ccss: 'Class placement (Lily teaches CCSS 2 below grade, Snapdragon teaches on grade)', wida: 'Individual student progress in English acquisition' },
              { label: 'Teacher action', ccss: 'Select appropriate standards for your class level', wida: 'Differentiate instruction based on student proficiency' },
            ].map(row => (
              <tr key={row.label}>
                <td className="px-5 py-3 text-[11px] font-semibold text-navy">{row.label}</td>
                <td className="px-5 py-3 text-[11px] text-text-secondary leading-relaxed">{row.ccss}</td>
                <td className="px-5 py-3 text-[11px] text-text-secondary leading-relaxed">{row.wida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-2">How It Works at Daewoo</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
          Each class teaches CCSS standards adjusted to their tier. Within that class, students are at different WIDA levels. The CCSS standard stays the same for everyone in the class -- the language support varies by student.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-[12px] font-semibold text-amber-800 mb-2">Example: Daisy, Grade 3</p>
          <p className="text-[11px] text-amber-700 leading-relaxed mb-2">
            Daisy teaches 1 level below grade, so this class works on CCSS Grade 2 standards. The standard is RL.2.2: "Recount stories and determine their central message."
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-[10px] font-bold text-red-700 mb-1">L1-L2 Student</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Shows understanding by pointing to pictures, sequencing image cards, or drawing the main events. May retell using single words or in Korean. Teacher accepts non-verbal demonstration.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-[10px] font-bold text-amber-700 mb-1">L3 Student</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Retells story events in simple sentences using a graphic organizer. Identifies the message with a sentence frame: "The lesson is ___." May need prompting for sequence.
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-200">
              <p className="text-[10px] font-bold text-green-700 mb-1">L4 Student</p>
              <p className="text-[10px] text-text-secondary leading-relaxed">
                Retells with detail, identifies the central message independently, and can explain why using text evidence: "I think the message is ___ because in the story ___."
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-2">The Three-Tier Approach to Lesson Planning</h3>
        <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
          You do not need separate lesson plans for each WIDA level. Instead, plan your lesson using the CCSS standard, then think about three tiers of support. Most of the time, you are already doing this intuitively.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { tier: 'Tier 1: Heavy Support', levels: 'L1-L2', color: '#FFCDD2', border: '#EF9A9A',
              desc: 'Modify the task so they can access it. Simplified language input, visual supports, word/phrase-level output, significant teacher or peer help.' },
            { tier: 'Tier 2: Moderate Support', levels: 'L3', color: '#FFF9C4', border: '#FFF59D',
              desc: 'Provide scaffolding tools. Sentence frames, graphic organizers, vocabulary lists, structured peer interaction.' },
            { tier: 'Tier 3: Light Support', levels: 'L4-L5', color: '#C8E6C9', border: '#A5D6A7',
              desc: 'Students engage with the task as designed. Focus on academic vocabulary, extension questions, and writing craft.' },
          ].map(t => (
            <div key={t.tier} className="rounded-lg p-4 border" style={{ backgroundColor: t.color + '30', borderColor: t.border }}>
              <p className="text-[12px] font-bold text-navy">{t.tier}</p>
              <p className="text-[10px] font-semibold text-text-tertiary mb-2">{t.levels}</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Krashen Comprehensible Input/Output Framework ─── */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">Comprehensible Input & Output Framework</h3>
        <p className="text-[11px] text-text-secondary leading-relaxed mb-1">
          Based on Krashen (1981). As students move from Beginning to Bridging, teacher scaffolding decreases and student output independence increases. The four columns below show how the teacher's role shifts from <strong>Direct Instruction</strong> (doing it for them) through <strong>Joint Construction</strong> (doing it with them) and <strong>Coached Construction</strong> (guiding while they do it) to <strong>Monitoring</strong> (watching them do it independently).
        </p>
        <p className="text-[10px] text-text-tertiary italic mb-4">
          Source: Krashen, S.D. (1981). Second language acquisition and second language learning. Oxford: Pergamon Press. Adapted by EmpoweringELLs.
        </p>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider font-semibold bg-surface-alt text-text-tertiary w-[100px]">WIDA Level</th>
                <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider font-semibold text-white" style={{ backgroundColor: '#0277BD' }}>
                  Direct Instruction
                  <span className="block font-normal normal-case tracking-normal text-[8px] opacity-80 mt-0.5">Teacher directly teaches strategies to build knowledge and comprehension</span>
                </th>
                <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider font-semibold text-white" style={{ backgroundColor: '#0288D1' }}>
                  Joint Construction
                  <span className="block font-normal normal-case tracking-normal text-[8px] opacity-80 mt-0.5">Teacher prompts students to construct meaning using learned strategies</span>
                </th>
                <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider font-semibold text-white" style={{ backgroundColor: '#039BE5' }}>
                  Coached Construction
                  <span className="block font-normal normal-case tracking-normal text-[8px] opacity-80 mt-0.5">Teacher provides feedback as students use strategies independently</span>
                </th>
                <th className="px-3 py-2.5 text-left text-[9px] uppercase tracking-wider font-semibold text-white" style={{ backgroundColor: '#03A9F4' }}>
                  Monitor
                  <span className="block font-normal normal-case tracking-normal text-[8px] opacity-80 mt-0.5">Teacher monitors students' independent use of strategies</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* L1-L2: Beginning / Entering-Emerging */}
              <tr>
                <td className="px-3 py-3 align-top">
                  <div className="px-2 py-1 rounded text-[10px] font-bold text-center" style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>L1-L2</div>
                  <p className="text-[8px] text-text-tertiary text-center mt-1">Beginning</p>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE' }}>
                  <div className="space-y-1">
                    {['Images and gestures', 'Modeling tasks step-by-step', 'Physical objects and realia', 'Pacing instruction slowly', 'Viewing videos in Korean (HL)', 'Reading texts in Korean first', '1-on-1 teacher support', 'Google Translate for key concepts'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-400">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE40' }}>
                  <div className="space-y-1">
                    {['Cloze passages', 'Sentence frames', 'Highlighting with colors', 'Annotated diagrams', 'Short sentences translating HL to English', 'Draw, label, circle, name'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-300">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-[10px] text-text-tertiary italic" colSpan={2}>
                  <p className="mt-4">Students at L1-L2 are primarily in the Direct Instruction and Joint Construction zones. Teacher scaffolding is heavy.</p>
                </td>
              </tr>

              {/* L3: Developing */}
              <tr>
                <td className="px-3 py-3 align-top">
                  <div className="px-2 py-1 rounded text-[10px] font-bold text-center" style={{ backgroundColor: '#FFFDE7', color: '#F57F17' }}>L3</div>
                  <p className="text-[8px] text-text-tertiary text-center mt-1">Developing</p>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE30' }}>
                  <div className="space-y-1">
                    {['Modified texts', 'Examples before tasks', 'Collaborating in HL groups'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-400">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE60' }}>
                  <div className="space-y-1">
                    {['Compare & contrast tasks', 'Prepared summaries', 'Lists and categorize activities', 'Outlines and videos', 'Graphs, tables, and charts', 'Summarize and sequence events', 'Quick Writes'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-300">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE40' }}>
                  <div className="space-y-1">
                    {['Explain & evaluate ideas', 'Compare & contrast ideas', 'Explain cause and effect', 'Defend opinions', 'Concept maps', 'Sentence frames that require explaining'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-200">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-[10px] text-text-tertiary italic">
                  <p className="mt-4">Some students beginning to reach monitored output for familiar tasks</p>
                </td>
              </tr>

              {/* L4-L5: Expanding / Bridging */}
              <tr>
                <td className="px-3 py-3 align-top">
                  <div className="px-2 py-1 rounded text-[10px] font-bold text-center" style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>L4-L5</div>
                  <p className="text-[8px] text-text-tertiary text-center mt-1">Expanding / Bridging</p>
                </td>
                <td className="px-3 py-3 align-top text-[10px] text-text-tertiary italic" colSpan={1}>
                  <p className="mt-2">Minimal direct instruction needed</p>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE30' }}>
                  <div className="space-y-1">
                    {['Case studies', 'Mentor texts and analogies', 'Blog and infograph creation'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-300">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE50' }}>
                  <div className="space-y-1">
                    {['Mix groups and presentations', 'Poster creation', 'Construct single paragraphs', 'Evaluate ideas with sentence starters', 'Mix-pair collaboration'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-200">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE60' }}>
                  <div className="space-y-1">
                    {['Compose multi-paragraph texts', 'Independent construction', 'Hypothesize & provide justification', 'Inferencing & providing reasoning', 'Connect topics to different contexts', 'Using mainly English with some HL'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-200">{s}</p>
                    ))}
                  </div>
                </td>
              </tr>

              {/* L5-L6: Bridging / Reaching */}
              <tr>
                <td className="px-3 py-3 align-top">
                  <div className="px-2 py-1 rounded text-[10px] font-bold text-center" style={{ backgroundColor: '#E3F2FD', color: '#1565C0' }}>L5-L6</div>
                  <p className="text-[8px] text-text-tertiary text-center mt-1">Bridging / Reaching</p>
                </td>
                <td className="px-3 py-3 align-top text-[10px] text-text-tertiary italic" colSpan={2}>
                  <p className="mt-2">Students at L5-L6 operate primarily in the Coached Construction and Monitor zones. Teacher role shifts to advisor.</p>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE40' }}>
                  <div className="space-y-1">
                    {['Formal debate and argumentation', 'Literary analysis', 'Cross-text comparison', 'Register shifting practice', 'Peer teaching and mentoring'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-200">{s}</p>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top" style={{ backgroundColor: '#E1F5FE60' }}>
                  <div className="space-y-1">
                    {['Design products and processes', 'Produce exhibits for real audiences', 'Teach others (language mentor role)', 'Independent research projects', 'Creative writing with voice and style', 'Create models and systems'].map((s, i) => (
                      <p key={i} className="text-[10px] text-text-secondary leading-snug pl-2 relative before:content-['\2022'] before:absolute before:left-0 before:text-blue-100">{s}</p>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="bg-navy/5 rounded-lg p-3">
            <p className="text-[10px] font-bold text-navy mb-1">Reading the table</p>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              The vertical axis represents teacher scaffolding (heavy at top, light at bottom). The horizontal axis represents student output independence (low at left, high at right). As WIDA level increases, activities shift from the top-left (teacher-directed, simple output) toward the bottom-right (student-directed, complex output).
            </p>
          </div>
          <div className="bg-navy/5 rounded-lg p-3">
            <p className="text-[10px] font-bold text-navy mb-1">Using this in practice</p>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              For any lesson, identify where each student falls on this grid. A student at L2 working on the same content as an L5 student needs strategies from a different column. The content standard (CCSS) stays the same -- the input strategies and output expectations shift based on the student's WIDA level.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-[14px] font-bold text-blue-900 mb-2">Grade-Level Offset Reminder</h3>
        <p className="text-[11px] text-blue-800 leading-relaxed mb-3">
          The CCSS standards each class works on are adjusted based on class tier:
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { classes: 'Lily, Camellia', offset: '2 below grade', example: 'Grade 4 students work on CCSS Grade 2 standards' },
            { classes: 'Daisy, Sunflower', offset: '1 below grade', example: 'Grade 4 students work on CCSS Grade 3 standards' },
            { classes: 'Marigold, Snapdragon', offset: 'On grade level', example: 'Grade 4 students work on CCSS Grade 4 standards' },
          ].map(o => (
            <div key={o.classes} className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-[11px] font-bold text-navy">{o.classes}</p>
              <p className="text-[10px] font-semibold text-blue-700">{o.offset}</p>
              <p className="text-[10px] text-text-tertiary mt-1 italic">{o.example}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── SECTION 3: Scaffold Index ─────────────────────────────────────

function ScaffoldIndex() {
  const [filterDomain, setFilterDomain] = useState<string>('all')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = useMemo(() => {
    return SCAFFOLD_BANK.filter(s => {
      if (filterDomain !== 'all' && s.domain !== filterDomain) return false
      if (filterLevel !== 'all') {
        const [lo, hi] = filterLevel === '1-2' ? [1, 2] : filterLevel === '3' ? [3, 3] : filterLevel === '5-6' ? [5, 6] : [4, 5]
        if (s.levelRange[0] > hi || s.levelRange[1] < lo) return false
      }
      if (searchTerm && !s.text.toLowerCase().includes(searchTerm.toLowerCase()) && !s.category.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }, [filterDomain, filterLevel, searchTerm])

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Scaffold[]>>()
    filtered.forEach(s => {
      const domKey = DOMAIN_LABELS[s.domain] || s.domain
      if (!map.has(domKey)) map.set(domKey, new Map())
      const catMap = map.get(domKey)!
      if (!catMap.has(s.category)) catMap.set(s.category, [])
      catMap.get(s.category)!.push(s)
    })
    return map
  }, [filtered])

  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 mb-5">
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Browse scaffolding strategies by domain and WIDA level. Use the "Assign to Students" tab to attach specific scaffolds to individual students -- they will appear on the student's profile for quick reference during instruction.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1">
          <button onClick={() => setFilterDomain('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterDomain === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All Domains</button>
          {['listening', 'speaking', 'reading', 'writing', 'general'].map(d => (
            <button key={d} onClick={() => setFilterDomain(d)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize ${filterDomain === d ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex gap-1">
          <button onClick={() => setFilterLevel('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterLevel === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All Levels</button>
          {[{ key: '1-2', label: 'L1-L2' }, { key: '3', label: 'L3' }, { key: '4-5', label: 'L4-L5' }, { key: '5-6', label: 'L5-L6' }].map(l => (
            <button key={l.key} onClick={() => setFilterLevel(l.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterLevel === l.key ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="relative flex-1 max-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search scaffolds..."
            className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
        </div>
      </div>

      <p className="text-[11px] text-text-tertiary mb-4">{filtered.length} scaffold{filtered.length !== 1 ? 's' : ''} found</p>

      <div className="space-y-5">
        {Array.from(grouped.entries()).map(([domain, categories]) => (
          <div key={domain}>
            <h3 className="text-[13px] font-bold text-navy mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-navy/10 flex items-center justify-center text-[10px] font-bold text-navy">
                {domain[0]}
              </span>
              {domain}
            </h3>
            <div className="space-y-3">
              {Array.from(categories.entries()).map(([category, scaffolds]) => (
                <div key={category} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-surface-alt/50 border-b border-border">
                    <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{category}</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {scaffolds.map(s => {
                      const levelLabel = s.levelRange[0] === s.levelRange[1] ? `L${s.levelRange[0]}` : `L${s.levelRange[0]}-L${s.levelRange[1]}`
                      const levelColor = s.levelRange[1] <= 2 ? { bg: '#FFEBEE', text: '#C62828', border: '#EF9A9A' }
                        : s.levelRange[0] >= 5 ? { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' }
                        : s.levelRange[0] >= 4 ? { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' }
                        : { bg: '#FFFDE7', text: '#F57F17', border: '#FFF59D' }
                      return (
                        <div key={s.id} className="flex items-start gap-3 px-4 py-2.5">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: levelColor.bg, color: levelColor.text, borderColor: levelColor.border }}>
                            {levelLabel}
                          </span>
                          <p className="text-[12px] text-text-primary leading-relaxed">{s.text}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SECTION 4: Assign Scaffolds to Students ───────────────────────

function AssignScaffolds() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Snapdragon')
  const [gr, setGr] = useState<Grade>(3)
  const { students, loading: loadingStudents } = useStudents({ grade: gr, english_class: cls })
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [assignedScaffolds, setAssignedScaffolds] = useState<any[]>([])
  const [widaLevels, setWidaLevels] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerDomain, setPickerDomain] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'individual' | 'class'>('individual')
  const [classScaffolds, setClassScaffolds] = useState<Record<string, any[]>>({})
  const [classLoading, setClassLoading] = useState(false)

  const availableClasses = isAdmin ? ENGLISH_CLASSES : [currentTeacher?.english_class as EnglishClass].filter(Boolean)

  // Load assigned scaffolds and WIDA levels for selected student
  useEffect(() => {
    if (!selectedStudent) { setAssignedScaffolds([]); setWidaLevels({}); return }
    setLoading(true)
    ;(async () => {
      const [{ data: scaffolds }, { data: wida }] = await Promise.all([
        supabase.from('student_scaffolds').select('*').eq('student_id', selectedStudent).eq('is_active', true).order('assigned_at', { ascending: false }),
        supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', selectedStudent),
      ])
      setAssignedScaffolds(scaffolds || [])
      const wm: Record<string, number> = {}
      wida?.forEach((w: any) => { wm[w.domain] = w.wida_level })
      setWidaLevels(wm)
      setLoading(false)
    })()
  }, [selectedStudent])

  const assignScaffold = async (scaffold: Scaffold) => {
    if (!selectedStudent) return
    setSaving(true)
    const { data, error } = await supabase.from('student_scaffolds').insert({
      student_id: selectedStudent,
      domain: scaffold.domain,
      scaffold_text: scaffold.text,
      wida_level: scaffold.levelRange[0],
      assigned_by: currentTeacher?.id,
    }).select().single()
    if (error) {
      showToast(`Error: ${error.message}`)
    } else if (data) {
      setAssignedScaffolds(prev => [data, ...prev])
      showToast('Scaffold assigned')
    }
    setSaving(false)
  }

  const removeScaffold = async (id: string) => {
    const { error } = await supabase.from('student_scaffolds').update({ is_active: false }).eq('id', id)
    if (error) { showToast(`Error: ${error.message}`); return }
    setAssignedScaffolds(prev => prev.filter(s => s.id !== id))
    showToast('Scaffold removed')
  }

  const assignCustom = async (domain: string, text: string) => {
    if (!selectedStudent || !text.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('student_scaffolds').insert({
      student_id: selectedStudent,
      domain,
      scaffold_text: text.trim(),
      assigned_by: currentTeacher?.id,
    }).select().single()
    if (error) { showToast(`Error: ${error.message}`) } else if (data) {
      setAssignedScaffolds(prev => [data, ...prev])
      showToast('Custom scaffold added')
    }
    setSaving(false)
  }

  const student = students.find(s => s.id === selectedStudent)

  // Auto-suggest scaffolds based on WIDA levels
  const suggestions = useMemo(() => {
    const vals = Object.values(widaLevels).filter(v => v > 0)
    if (vals.length === 0) return []
    const avgLevel = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    const assignedTexts = new Set(assignedScaffolds.map(s => s.scaffold_text))
    return SCAFFOLD_BANK.filter(s =>
      avgLevel >= s.levelRange[0] && avgLevel <= s.levelRange[1] && !assignedTexts.has(s.text)
    ).slice(0, 8)
  }, [widaLevels, assignedScaffolds])

  const [customDomain, setCustomDomain] = useState('general')
  const [customText, setCustomText] = useState('')

  // Load all scaffolds for class view
  useEffect(() => {
    if (viewMode !== 'class' || students.length === 0) return
    setClassLoading(true)
    ;(async () => {
      const { data } = await supabase.from('student_scaffolds').select('student_id, domain, scaffold_text')
        .in('student_id', students.map(s => s.id)).eq('is_active', true)
      const map: Record<string, any[]> = {}
      if (data) data.forEach((r: any) => {
        if (!map[r.student_id]) map[r.student_id] = []
        map[r.student_id].push(r)
      })
      setClassScaffolds(map)
      setClassLoading(false)
    })()
  }, [viewMode, students])

  // Group students by shared scaffolds for class view
  const scaffoldGroups = useMemo(() => {
    if (viewMode !== 'class') return []
    const textToStudents = new Map<string, { domain: string; text: string; studentIds: Set<string> }>()
    Object.entries(classScaffolds).forEach(([sid, scaffs]) => {
      scaffs.forEach(s => {
        const key = s.scaffold_text
        if (!textToStudents.has(key)) textToStudents.set(key, { domain: s.domain, text: s.scaffold_text, studentIds: new Set() })
        textToStudents.get(key)!.studentIds.add(sid)
      })
    })
    return Array.from(textToStudents.values())
      .map(g => ({ ...g, studentIds: Array.from(g.studentIds), count: g.studentIds.size }))
      .sort((a, b) => b.count - a.count)
  }, [classScaffolds, viewMode])

  const updateEffectiveness = async (scaffoldId: string, effectiveness: string | null) => {
    const { error } = await supabase.from('student_scaffolds').update({
      effectiveness, effectiveness_updated_at: new Date().toISOString()
    }).eq('id', scaffoldId)
    if (error) { showToast(`Error: ${error.message}`); return }
    setAssignedScaffolds(prev => prev.map(s => s.id === scaffoldId ? { ...s, effectiveness } : s))
  }

  const printScaffoldCard = () => {
    if (!student || assignedScaffolds.length === 0) return
    const pw = window.open('', '_blank'); if (!pw) return
    const scaffoldHTML = assignedScaffolds.map(s =>
      `<div class="scaffold"><span class="domain">${s.domain.toUpperCase()}</span> ${s.scaffold_text}${s.effectiveness === 'working' ? ' <span class="eff working">Working</span>' : s.effectiveness === 'not_working' ? ' <span class="eff notworking">Not Working</span>' : ''}</div>`
    ).join('')
    const widaHTML = WIDA_DOMAINS.map(d => {
      const v = widaLevels[d]; return v ? `<span class="wida-badge">${d[0].toUpperCase()}: L${v}</span>` : ''
    }).filter(Boolean).join(' ')
    pw.document.write(`<!DOCTYPE html><html><head><title>Scaffold Card - ${student.english_name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto}
      h2{color:#1B2A4A;margin:0 0 4px}p.sub{color:#666;font-size:12px;margin:0 0 12px}
      .wida-badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;background:#E3F2FD;color:#1565C0;margin-right:4px}
      .scaffold{padding:8px 12px;margin:4px 0;border-radius:8px;font-size:13px;border:1px solid #e2e8f0;background:#f8fafc}
      .domain{display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:bold;background:#EEF2FF;color:#1B2A4A;text-transform:uppercase;margin-right:6px}
      .eff{font-size:9px;padding:1px 4px;border-radius:3px;margin-left:6px}
      .working{background:#D1FAE5;color:#065F46}.notworking{background:#FEE2E2;color:#991B1B}
      .footer{margin-top:16px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}
      @media print{body{padding:12px}}</style></head><body>
      <h2>${student.english_name} <span style="color:#999;font-weight:normal">${student.korean_name}</span></h2>
      <p class="sub">${cls} -- Grade ${gr}</p>
      <div style="margin-bottom:12px">${widaHTML}</div>
      <h3 style="font-size:13px;color:#1B2A4A;margin:12px 0 6px">Active Scaffolds</h3>
      ${scaffoldHTML}
      <p class="footer">Printed ${new Date().toLocaleDateString()} -- Daewoo English Program</p>
      </body></html>`)
    pw.document.close()
    pw.print()
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1">
          {availableClasses.map(c => (
            <button key={c} onClick={() => { setCls(c); setSelectedStudent(null) }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
              style={cls === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {GRADES.map(g => (
            <button key={g} onClick={() => { setGr(g); setSelectedStudent(null) }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
              Gr {g}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex gap-1">
          <button onClick={() => setViewMode('individual')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === 'individual' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
            Individual
          </button>
          <button onClick={() => setViewMode('class')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${viewMode === 'class' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
            Class View
          </button>
        </div>
      </div>

      {viewMode === 'class' ? (
        <div>
          <div className="bg-navy/5 border border-navy/10 rounded-xl p-4 mb-5">
            <p className="text-[12px] text-text-secondary leading-relaxed">
              See all assigned scaffolds across your class, grouped by strategy. Students who share the same scaffold appear together -- use this to identify natural groupings for differentiated instruction.
            </p>
          </div>
          {classLoading ? (
            <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
          ) : scaffoldGroups.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <p className="text-text-tertiary text-[13px]">No scaffolds assigned to students in this class yet.</p>
              <p className="text-text-tertiary text-[11px] mt-1">Switch to Individual mode to assign scaffolds, then come back here to see groupings.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scaffoldGroups.map((group, gi) => (
                <div key={gi} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center">
                      <span className="text-[14px] font-bold text-navy">{group.count}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">{group.domain}</span>
                        <p className="text-[12px] text-text-primary leading-relaxed">{group.text}</p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {group.studentIds.map(sid => {
                          const s = students.find(st => st.id === sid)
                          return s ? (
                            <span key={sid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-alt border border-border text-[10px] font-medium text-text-secondary">
                              {s.english_name}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary stats */}
              <div className="bg-surface-alt rounded-xl p-4 mt-4">
                <p className="text-[11px] font-semibold text-navy mb-2">Quick Stats</p>
                <div className="flex gap-4 text-[11px] text-text-secondary">
                  <span>{students.length} students in class</span>
                  <span>{Object.keys(classScaffolds).length} with assigned scaffolds</span>
                  <span>{students.length - Object.keys(classScaffolds).length} without scaffolds</span>
                  <span>{scaffoldGroups.length} unique strategies in use</span>
                </div>
                {students.length - Object.keys(classScaffolds).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] text-amber-700 font-medium">Students without scaffolds:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {students.filter(s => !classScaffolds[s.id]).map(s => (
                        <button key={s.id} onClick={() => { setViewMode('individual'); setSelectedStudent(s.id) }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-700 hover:bg-amber-100">
                          {s.english_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-12 gap-5">
        {/* Student list */}
        <div className="col-span-3 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">{cls} -- Grade {gr} ({students.length})</p>
          </div>
          <div className="divide-y divide-border/50 max-h-[600px] overflow-auto">
            {students.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s.id)}
                className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors ${selectedStudent === s.id ? 'bg-navy/5 border-l-2 border-l-navy' : 'hover:bg-surface-alt'}`}>
                <span className="font-medium text-navy">{s.english_name}</span>
                <span className="text-text-tertiary ml-2 text-[11px]">{s.korean_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scaffold panel */}
        <div className="col-span-9">
          {!selectedStudent ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <User size={32} className="text-text-tertiary mx-auto mb-3" />
              <p className="text-text-tertiary text-[13px]">Select a student to view and assign scaffolds</p>
            </div>
          ) : loading ? (
            <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
          ) : (
            <div className="space-y-4">
              {/* Student header with WIDA levels */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-navy">{student?.english_name} <span className="text-text-tertiary font-normal text-[13px]">{student?.korean_name}</span></h3>
                    <p className="text-[11px] text-text-tertiary">{cls} -- Grade {gr}</p>
                  </div>
                  <div className="flex gap-2">
                    {WIDA_DOMAINS.map(d => {
                      const lvl = widaLevels[d]
                      const info = lvl ? WIDA_LEVELS.find(w => w.level === lvl) : null
                      return (
                        <div key={d} className="text-center px-2.5 py-1.5 rounded-lg border"
                          style={{ backgroundColor: info?.bg || '#f8fafc', borderColor: info?.color || '#e2e8f0' }}>
                          <p className="text-[8px] font-bold uppercase text-text-tertiary">{d.slice(0, 4)}</p>
                          <p className="text-[14px] font-bold" style={{ color: info?.color || '#94a3b8' }}>{lvl || '--'}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {Object.keys(widaLevels).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-1.5 border border-amber-200">
                    No WIDA levels set for this student. Go to WIDA Profiles to assign levels first -- this helps auto-suggest appropriate scaffolds.
                  </p>
                )}
              </div>

              {/* Currently assigned scaffolds */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-bold text-navy">Assigned Scaffolds ({assignedScaffolds.length})</h4>
                  <div className="flex gap-1.5">
                    {assignedScaffolds.length > 0 && (
                      <button onClick={printScaffoldCard}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary border border-border hover:bg-surface">
                        Print Card
                      </button>
                    )}
                    <button onClick={() => setShowPicker(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
                      <Plus size={13} /> Add Scaffold
                    </button>
                  </div>
                </div>
                {assignedScaffolds.length === 0 ? (
                  <p className="text-[11px] text-text-tertiary italic py-4 text-center">No scaffolds assigned yet. Click "Add Scaffold" or use the suggestions below.</p>
                ) : (
                  <div className="space-y-1.5">
                    {assignedScaffolds.map(s => (
                      <div key={s.id} className="px-3 py-2 rounded-lg bg-surface-alt/50 border border-border/50 group">
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-navy/10 text-navy uppercase flex-shrink-0 mt-0.5">{s.domain}</span>
                          <p className="text-[12px] text-text-primary leading-relaxed flex-1">{s.scaffold_text}</p>
                          <button onClick={() => removeScaffold(s.id)} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 ml-8">
                          <span className="text-[8px] text-text-tertiary uppercase tracking-wider">Effectiveness:</span>
                          {['working', 'not_working', 'unclear'].map(eff => (
                            <button key={eff} onClick={() => updateEffectiveness(s.id, s.effectiveness === eff ? null : eff)}
                              className={`px-2 py-0.5 rounded text-[9px] font-medium transition-all ${
                                s.effectiveness === eff
                                  ? eff === 'working' ? 'bg-green-100 text-green-700 border border-green-300' : eff === 'not_working' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-600 border border-gray-300'
                                  : 'bg-surface text-text-tertiary border border-border hover:bg-surface-alt'
                              }`}>
                              {eff === 'working' ? 'Working' : eff === 'not_working' ? 'Not Working' : 'Unclear'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-suggestions based on WIDA level */}
              {suggestions.length > 0 && (
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
                  <h4 className="text-[13px] font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <Lightbulb size={14} /> Suggested Scaffolds
                  </h4>
                  <p className="text-[10px] text-blue-700 mb-3">Based on this student's WIDA levels. Click to assign.</p>
                  <div className="space-y-1.5">
                    {suggestions.map(s => {
                      const levelLabel = s.levelRange[0] === s.levelRange[1] ? `L${s.levelRange[0]}` : `L${s.levelRange[0]}-L${s.levelRange[1]}`
                      return (
                        <button key={s.id} onClick={() => assignScaffold(s)} disabled={saving}
                          className="w-full flex items-start gap-2 px-3 py-2 rounded-lg bg-white border border-blue-200 text-left hover:bg-blue-50 transition-colors">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 uppercase flex-shrink-0 mt-0.5">{s.domain}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary font-medium flex-shrink-0 mt-0.5">{levelLabel}</span>
                          <p className="text-[12px] text-text-primary leading-relaxed flex-1">{s.text}</p>
                          <Plus size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Custom scaffold */}
              <div className="bg-surface border border-border rounded-xl p-4">
                <h4 className="text-[12px] font-bold text-navy mb-2">Add Custom Scaffold</h4>
                <div className="flex items-start gap-2">
                  <select value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                    className="px-2.5 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface">
                    {['general', 'listening', 'speaking', 'reading', 'writing'].map(d => (
                      <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
                    ))}
                  </select>
                  <input value={customText} onChange={e => setCustomText(e.target.value)}
                    placeholder="Type a custom scaffold strategy..."
                    className="flex-1 px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy"
                    onKeyDown={e => { if (e.key === 'Enter' && customText.trim()) { assignCustom(customDomain, customText); setCustomText('') } }} />
                  <button onClick={() => { if (customText.trim()) { assignCustom(customDomain, customText); setCustomText('') } }}
                    disabled={!customText.trim() || saving}
                    className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Scaffold picker modal */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPicker(false)}>
          <div className="bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-navy">Choose Scaffolds for {student?.english_name}</h3>
              <button onClick={() => setShowPicker(false)} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
            </div>
            <div className="px-5 py-3 border-b border-border flex gap-1">
              <button onClick={() => setPickerDomain('all')} className={`px-3 py-1 rounded-lg text-[11px] font-medium ${pickerDomain === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All</button>
              {['listening', 'speaking', 'reading', 'writing', 'general'].map(d => (
                <button key={d} onClick={() => setPickerDomain(d)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium capitalize ${pickerDomain === d ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>
                  {DOMAIN_LABELS[d]}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-1.5">
              {SCAFFOLD_BANK.filter(s => pickerDomain === 'all' || s.domain === pickerDomain).map(s => {
                const isAssigned = assignedScaffolds.some(a => a.scaffold_text === s.text)
                const levelLabel = s.levelRange[0] === s.levelRange[1] ? `L${s.levelRange[0]}` : `L${s.levelRange[0]}-L${s.levelRange[1]}`
                return (
                  <button key={s.id} onClick={() => !isAssigned && assignScaffold(s)} disabled={isAssigned || saving}
                    className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg border text-left transition-colors ${
                      isAssigned ? 'bg-green-50 border-green-200 opacity-60' : 'bg-surface border-border hover:bg-surface-alt'
                    }`}>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-navy/10 text-navy uppercase flex-shrink-0 mt-0.5">{s.domain}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary font-medium flex-shrink-0 mt-0.5">{levelLabel}</span>
                    <p className="text-[12px] text-text-primary leading-relaxed flex-1">{s.text}</p>
                    {isAssigned ? <Check size={14} className="text-green-500 flex-shrink-0 mt-0.5" /> : <Plus size={14} className="text-text-tertiary flex-shrink-0 mt-0.5" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
