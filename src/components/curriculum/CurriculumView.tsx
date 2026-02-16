'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Layers, Globe2, Loader2, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Info, Search } from 'lucide-react'

// ─── CCSS GRADE OFFSET BY CLASS TIER ─────────────────────────────────
function getAdjustedGrade(studentGrade: Grade, englishClass: EnglishClass): number {
  const tier2Below: EnglishClass[] = ['Lily', 'Camellia']
  const tier1Below: EnglishClass[] = ['Daisy', 'Sunflower']
  let offset = 0
  if (tier2Below.includes(englishClass)) offset = 2
  else if (tier1Below.includes(englishClass)) offset = 1
  return Math.max(0, studentGrade - offset)
}

function gradeLabel(g: number): string {
  return g === 0 ? 'Kindergarten' : `Grade ${g}`
}

type CCSSDomain = 'RL' | 'RI' | 'RF' | 'W' | 'SL' | 'L'
const CCSS_DOMAINS: { key: CCSSDomain; label: string }[] = [
  { key: 'RL', label: 'Reading: Literature' },
  { key: 'RI', label: 'Reading: Informational' },
  { key: 'RF', label: 'Foundational Skills' },
  { key: 'W', label: 'Writing' },
  { key: 'SL', label: 'Speaking & Listening' },
  { key: 'L', label: 'Language' },
]

interface CcssStandard { code: string; domain: CCSSDomain; grade: number; cluster: string; text: string }

const S: CcssStandard[] = [
  // K
  {code:'RL.K.1',domain:'RL',grade:0,cluster:'Key Ideas',text:'With prompting and support, ask and answer questions about key details in a text.'},
  {code:'RL.K.2',domain:'RL',grade:0,cluster:'Key Ideas',text:'With prompting and support, retell familiar stories, including key details.'},
  {code:'RL.K.3',domain:'RL',grade:0,cluster:'Key Ideas',text:'With prompting and support, identify characters, settings, and major events in a story.'},
  {code:'RL.K.7',domain:'RL',grade:0,cluster:'Integration',text:'With prompting and support, describe the relationship between illustrations and the story.'},
  {code:'RI.K.1',domain:'RI',grade:0,cluster:'Key Ideas',text:'With prompting and support, ask and answer questions about key details in a text.'},
  {code:'RI.K.2',domain:'RI',grade:0,cluster:'Key Ideas',text:'With prompting and support, identify the main topic and retell key details of a text.'},
  {code:'RF.K.1',domain:'RF',grade:0,cluster:'Print Concepts',text:'Demonstrate understanding of the organization and basic features of print.'},
  {code:'RF.K.2',domain:'RF',grade:0,cluster:'Phonological Awareness',text:'Demonstrate understanding of spoken words, syllables, and sounds (phonemes).'},
  {code:'RF.K.3',domain:'RF',grade:0,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.K.4',domain:'RF',grade:0,cluster:'Fluency',text:'Read emergent-reader texts with purpose and understanding.'},
  {code:'W.K.1',domain:'W',grade:0,cluster:'Text Types',text:'Use drawing, dictating, and writing to compose opinion pieces.'},
  {code:'W.K.2',domain:'W',grade:0,cluster:'Text Types',text:'Use drawing, dictating, and writing to compose informative/explanatory texts.'},
  {code:'W.K.3',domain:'W',grade:0,cluster:'Text Types',text:'Use drawing, dictating, and writing to narrate events.'},
  {code:'SL.K.1',domain:'SL',grade:0,cluster:'Collaboration',text:'Participate in collaborative conversations about kindergarten topics and texts.'},
  {code:'SL.K.4',domain:'SL',grade:0,cluster:'Presentation',text:'Describe familiar people, places, things, and events with prompting and support.'},
  {code:'SL.K.6',domain:'SL',grade:0,cluster:'Presentation',text:'Speak audibly and express thoughts, feelings, and ideas clearly.'},
  {code:'L.K.1',domain:'L',grade:0,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.K.2',domain:'L',grade:0,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.K.4',domain:'L',grade:0,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on kindergarten reading and content.'},
  {code:'L.K.5',domain:'L',grade:0,cluster:'Vocabulary',text:'With guidance and support, explore word relationships and nuances in word meanings.'},
  // Grade 1
  {code:'RL.1.1',domain:'RL',grade:1,cluster:'Key Ideas',text:'Ask and answer questions about key details in a text.'},
  {code:'RL.1.2',domain:'RL',grade:1,cluster:'Key Ideas',text:'Retell stories, including key details, and demonstrate understanding of their central message or lesson.'},
  {code:'RL.1.3',domain:'RL',grade:1,cluster:'Key Ideas',text:'Describe characters, settings, and major events in a story, using key details.'},
  {code:'RL.1.7',domain:'RL',grade:1,cluster:'Integration',text:'Use illustrations and details in a story to describe its characters, setting, or events.'},
  {code:'RI.1.1',domain:'RI',grade:1,cluster:'Key Ideas',text:'Ask and answer questions about key details in a text.'},
  {code:'RI.1.2',domain:'RI',grade:1,cluster:'Key Ideas',text:'Identify the main topic and retell key details of a text.'},
  {code:'RI.1.5',domain:'RI',grade:1,cluster:'Craft & Structure',text:'Know and use various text features to locate key facts or information in a text.'},
  {code:'RF.1.1',domain:'RF',grade:1,cluster:'Print Concepts',text:'Demonstrate understanding of the organization and basic features of print.'},
  {code:'RF.1.2',domain:'RF',grade:1,cluster:'Phonological Awareness',text:'Demonstrate understanding of spoken words, syllables, and sounds (phonemes).'},
  {code:'RF.1.3',domain:'RF',grade:1,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.1.4',domain:'RF',grade:1,cluster:'Fluency',text:'Read with sufficient accuracy and fluency to support comprehension.'},
  {code:'W.1.1',domain:'W',grade:1,cluster:'Text Types',text:'Write opinion pieces introducing the topic, stating an opinion, supplying a reason, and providing closure.'},
  {code:'W.1.2',domain:'W',grade:1,cluster:'Text Types',text:'Write informative/explanatory texts naming a topic, supplying facts, and providing closure.'},
  {code:'W.1.3',domain:'W',grade:1,cluster:'Text Types',text:'Write narratives recounting sequenced events with details and temporal words.'},
  {code:'SL.1.1',domain:'SL',grade:1,cluster:'Collaboration',text:'Participate in collaborative conversations about grade 1 topics and texts.'},
  {code:'SL.1.4',domain:'SL',grade:1,cluster:'Presentation',text:'Describe people, places, things, and events with relevant details, expressing ideas clearly.'},
  {code:'L.1.1',domain:'L',grade:1,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.1.2',domain:'L',grade:1,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.1.4',domain:'L',grade:1,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on grade 1 reading and content.'},
  // Grade 2
  {code:'RL.2.1',domain:'RL',grade:2,cluster:'Key Ideas',text:'Ask and answer questions (who, what, where, when, why, how) to demonstrate understanding of key details.'},
  {code:'RL.2.2',domain:'RL',grade:2,cluster:'Key Ideas',text:'Recount stories and determine their central message, lesson, or moral.'},
  {code:'RL.2.3',domain:'RL',grade:2,cluster:'Key Ideas',text:'Describe how characters in a story respond to major events and challenges.'},
  {code:'RL.2.7',domain:'RL',grade:2,cluster:'Integration',text:'Use information from illustrations and words to demonstrate understanding of characters, setting, or plot.'},
  {code:'RI.2.1',domain:'RI',grade:2,cluster:'Key Ideas',text:'Ask and answer questions to demonstrate understanding of key details in a text.'},
  {code:'RI.2.2',domain:'RI',grade:2,cluster:'Key Ideas',text:'Identify the main topic of a multiparagraph text and the focus of specific paragraphs.'},
  {code:'RF.2.3',domain:'RF',grade:2,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.2.4',domain:'RF',grade:2,cluster:'Fluency',text:'Read with sufficient accuracy and fluency to support comprehension.'},
  {code:'W.2.1',domain:'W',grade:2,cluster:'Text Types',text:'Write opinion pieces introducing the topic, stating an opinion, supplying reasons with linking words, and providing closure.'},
  {code:'W.2.2',domain:'W',grade:2,cluster:'Text Types',text:'Write informative/explanatory texts introducing a topic, using facts and definitions, and providing closure.'},
  {code:'W.2.3',domain:'W',grade:2,cluster:'Text Types',text:'Write narratives recounting well-elaborated events with details, temporal words, and closure.'},
  {code:'SL.2.1',domain:'SL',grade:2,cluster:'Collaboration',text:'Participate in collaborative conversations about grade 2 topics and texts.'},
  {code:'SL.2.4',domain:'SL',grade:2,cluster:'Presentation',text:'Tell a story or recount an experience with appropriate facts and descriptive details.'},
  {code:'L.2.1',domain:'L',grade:2,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.2.2',domain:'L',grade:2,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.2.4',domain:'L',grade:2,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on grade 2 reading and content.'},
  // Grade 3
  {code:'RL.3.1',domain:'RL',grade:3,cluster:'Key Ideas',text:'Ask and answer questions, referring explicitly to the text as the basis for the answers.'},
  {code:'RL.3.2',domain:'RL',grade:3,cluster:'Key Ideas',text:'Recount stories including fables, folktales, and myths; determine the central message or moral.'},
  {code:'RL.3.3',domain:'RL',grade:3,cluster:'Key Ideas',text:'Describe characters (traits, motivations, feelings) and explain how their actions contribute to events.'},
  {code:'RL.3.4',domain:'RL',grade:3,cluster:'Craft & Structure',text:'Determine meaning of words and phrases, distinguishing literal from nonliteral language.'},
  {code:'RI.3.1',domain:'RI',grade:3,cluster:'Key Ideas',text:'Ask and answer questions, referring explicitly to the text as the basis for the answers.'},
  {code:'RI.3.2',domain:'RI',grade:3,cluster:'Key Ideas',text:'Determine the main idea; recount key details and explain how they support the main idea.'},
  {code:'RF.3.3',domain:'RF',grade:3,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.3.4',domain:'RF',grade:3,cluster:'Fluency',text:'Read with sufficient accuracy and fluency to support comprehension.'},
  {code:'W.3.1',domain:'W',grade:3,cluster:'Text Types',text:'Write opinion pieces on topics or texts, supporting a point of view with reasons.'},
  {code:'W.3.2',domain:'W',grade:3,cluster:'Text Types',text:'Write informative/explanatory texts to examine a topic and convey ideas clearly.'},
  {code:'W.3.3',domain:'W',grade:3,cluster:'Text Types',text:'Write narratives using effective technique, descriptive details, and clear event sequences.'},
  {code:'SL.3.1',domain:'SL',grade:3,cluster:'Collaboration',text:'Engage in collaborative discussions building on others\' ideas and expressing own clearly.'},
  {code:'SL.3.4',domain:'SL',grade:3,cluster:'Presentation',text:'Report on a topic or text with appropriate facts and descriptive details, speaking clearly.'},
  {code:'L.3.1',domain:'L',grade:3,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.3.2',domain:'L',grade:3,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.3.4',domain:'L',grade:3,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on grade 3 reading and content.'},
  // Grade 4
  {code:'RL.4.1',domain:'RL',grade:4,cluster:'Key Ideas',text:'Refer to details and examples in a text when explaining what the text says explicitly and when drawing inferences.'},
  {code:'RL.4.2',domain:'RL',grade:4,cluster:'Key Ideas',text:'Determine a theme of a story, drama, or poem from details in the text; summarize the text.'},
  {code:'RL.4.3',domain:'RL',grade:4,cluster:'Key Ideas',text:'Describe in depth a character, setting, or event, drawing on specific details in the text.'},
  {code:'RI.4.1',domain:'RI',grade:4,cluster:'Key Ideas',text:'Refer to details and examples in a text when explaining what the text says explicitly and when drawing inferences.'},
  {code:'RI.4.2',domain:'RI',grade:4,cluster:'Key Ideas',text:'Determine the main idea and explain how it is supported by key details; summarize the text.'},
  {code:'RF.4.3',domain:'RF',grade:4,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.4.4',domain:'RF',grade:4,cluster:'Fluency',text:'Read with sufficient accuracy and fluency to support comprehension.'},
  {code:'W.4.1',domain:'W',grade:4,cluster:'Text Types',text:'Write opinion pieces on topics or texts, supporting a point of view with reasons and information.'},
  {code:'W.4.2',domain:'W',grade:4,cluster:'Text Types',text:'Write informative/explanatory texts to examine a topic and convey ideas clearly.'},
  {code:'W.4.3',domain:'W',grade:4,cluster:'Text Types',text:'Write narratives using effective technique, descriptive details, and clear event sequences.'},
  {code:'SL.4.1',domain:'SL',grade:4,cluster:'Collaboration',text:'Engage in collaborative discussions building on others\' ideas and expressing own clearly.'},
  {code:'SL.4.4',domain:'SL',grade:4,cluster:'Presentation',text:'Report on a topic or text using appropriate facts and descriptive details to support main ideas.'},
  {code:'L.4.1',domain:'L',grade:4,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.4.2',domain:'L',grade:4,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.4.4',domain:'L',grade:4,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on grade 4 reading and content.'},
  // Grade 5
  {code:'RL.5.1',domain:'RL',grade:5,cluster:'Key Ideas',text:'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences.'},
  {code:'RL.5.2',domain:'RL',grade:5,cluster:'Key Ideas',text:'Determine a theme from details in the text, including how characters respond to challenges; summarize.'},
  {code:'RL.5.3',domain:'RL',grade:5,cluster:'Key Ideas',text:'Compare and contrast two or more characters, settings, or events, drawing on specific details.'},
  {code:'RL.5.4',domain:'RL',grade:5,cluster:'Craft & Structure',text:'Determine meaning of words and phrases including figurative language such as metaphors and similes.'},
  {code:'RI.5.1',domain:'RI',grade:5,cluster:'Key Ideas',text:'Quote accurately from a text when explaining what the text says explicitly and when drawing inferences.'},
  {code:'RI.5.2',domain:'RI',grade:5,cluster:'Key Ideas',text:'Determine two or more main ideas and explain how they are supported by key details; summarize.'},
  {code:'RF.5.3',domain:'RF',grade:5,cluster:'Phonics',text:'Know and apply grade-level phonics and word analysis skills in decoding words.'},
  {code:'RF.5.4',domain:'RF',grade:5,cluster:'Fluency',text:'Read with sufficient accuracy and fluency to support comprehension.'},
  {code:'W.5.1',domain:'W',grade:5,cluster:'Text Types',text:'Write opinion pieces on topics or texts, supporting a point of view with reasons and information.'},
  {code:'W.5.2',domain:'W',grade:5,cluster:'Text Types',text:'Write informative/explanatory texts to examine a topic and convey ideas clearly.'},
  {code:'W.5.3',domain:'W',grade:5,cluster:'Text Types',text:'Write narratives using effective technique, descriptive details, and clear event sequences.'},
  {code:'SL.5.1',domain:'SL',grade:5,cluster:'Collaboration',text:'Engage in collaborative discussions building on others\' ideas and expressing own clearly.'},
  {code:'SL.5.4',domain:'SL',grade:5,cluster:'Presentation',text:'Report on a topic or present an opinion with logical ideas, facts, and descriptive details.'},
  {code:'L.5.1',domain:'L',grade:5,cluster:'Conventions',text:'Demonstrate command of conventions of standard English grammar and usage.'},
  {code:'L.5.2',domain:'L',grade:5,cluster:'Conventions',text:'Demonstrate command of conventions of standard English capitalization, punctuation, and spelling.'},
  {code:'L.5.4',domain:'L',grade:5,cluster:'Vocabulary',text:'Determine or clarify meaning of unknown words based on grade 5 reading and content.'},
  {code:'L.5.5',domain:'L',grade:5,cluster:'Vocabulary',text:'Demonstrate understanding of figurative language, word relationships, and nuances in word meanings.'},
]

// ─── WIDA LEVELS ─────────────────────────────────────────────────────
const WIDA_LEVELS = [
  { level: 1, name: 'Entering', color: '#EF9A9A' },
  { level: 2, name: 'Emerging', color: '#FFCC80' },
  { level: 3, name: 'Developing', color: '#FFF59D' },
  { level: 4, name: 'Expanding', color: '#A5D6A7' },
  { level: 5, name: 'Bridging', color: '#90CAF9' },
  { level: 6, name: 'Reaching', color: '#CE93D8' },
]

type WIDAKeyUse = 'recount' | 'explain' | 'argue' | 'discuss'
type WIDADomain = 'listening' | 'speaking' | 'reading' | 'writing' | 'discuss'

interface WDesc { gradeBand: string; domain: WIDADomain; keyUse: WIDAKeyUse; level: number; descriptors: string[] }

// Representative WIDA data from uploaded Can-Do descriptors
const W: WDesc[] = [
  // Gr 2-3 Listening Recount
  {gradeBand:'2-3',domain:'listening',keyUse:'recount',level:1,descriptors:['Show what happens next from familiar oral stories by pointing or drawing','Draw or provide visual displays in response to oral prompts']},
  {gradeBand:'2-3',domain:'listening',keyUse:'recount',level:2,descriptors:['Identify who, where, and when of illustrated statements','Identify main materials from oral descriptions']},
  {gradeBand:'2-3',domain:'listening',keyUse:'recount',level:3,descriptors:['Identify linking words related to time in speech','Illustrate events in response to stories or poems']},
  {gradeBand:'2-3',domain:'listening',keyUse:'recount',level:4,descriptors:['Re-enact content-related situations from oral descriptions','Identify ideas from oral discourse using multimedia']},
  {gradeBand:'2-3',domain:'listening',keyUse:'recount',level:5,descriptors:['Identify details of content-related topics from oral discourse','Make designs or models following oral directions']},
  // Gr 2-3 Speaking Recount
  {gradeBand:'2-3',domain:'speaking',keyUse:'recount',level:1,descriptors:['Respond to questions related to stories or experiences','Act out and name events throughout the school day']},
  {gradeBand:'2-3',domain:'speaking',keyUse:'recount',level:2,descriptors:['Reproduce facts or statements in context','Participate in multimedia presentations']},
  {gradeBand:'2-3',domain:'speaking',keyUse:'recount',level:3,descriptors:['Retell simple stories from picture cues','State information from personal or school experiences']},
  {gradeBand:'2-3',domain:'speaking',keyUse:'recount',level:4,descriptors:['Sequence events with temporal transitions','Describe situations from school and community']},
  {gradeBand:'2-3',domain:'speaking',keyUse:'recount',level:5,descriptors:['Describe main ideas of content-related information','Ask and answer questions about information from speakers']},
  // Gr 2-3 Reading Recount
  {gradeBand:'2-3',domain:'reading',keyUse:'recount',level:1,descriptors:['Identify key words and phrases in illustrated text','Signal language associated with content-related information']},
  {gradeBand:'2-3',domain:'reading',keyUse:'recount',level:2,descriptors:['Identify time-related language in context','Illustrate experiences of characters in statements']},
  {gradeBand:'2-3',domain:'reading',keyUse:'recount',level:3,descriptors:['Create timelines or graphic organizers from illustrated statements','Identify temporal words that signal order of events']},
  {gradeBand:'2-3',domain:'reading',keyUse:'recount',level:4,descriptors:['Order a series of events based on familiar texts','Identify main ideas and details in illustrated texts']},
  {gradeBand:'2-3',domain:'reading',keyUse:'recount',level:5,descriptors:['Paraphrase narratives or informational text with support','Highlight relevant information to produce summaries']},
  // Gr 2-3 Writing Recount
  {gradeBand:'2-3',domain:'writing',keyUse:'recount',level:1,descriptors:['Label images illustrating steps for processes','Create visual representations of ideas or stories']},
  {gradeBand:'2-3',domain:'writing',keyUse:'recount',level:2,descriptors:['List ideas using graphic organizers','Describe visual information']},
  {gradeBand:'2-3',domain:'writing',keyUse:'recount',level:3,descriptors:['Retell past experiences','Express ideas in various genres (poetry, journals)']},
  {gradeBand:'2-3',domain:'writing',keyUse:'recount',level:4,descriptors:['Describe a series of events or procedures','Create stories with details about characters and events']},
  {gradeBand:'2-3',domain:'writing',keyUse:'recount',level:5,descriptors:['Describe the sequence of content-related ideas','Provide details and examples about narratives']},
  // Gr 2-3 Discuss
  {gradeBand:'2-3',domain:'discuss',keyUse:'discuss',level:1,descriptors:['Express own ideas through drawings, gestures, words','Express agreement/disagreement nonverbally']},
  {gradeBand:'2-3',domain:'discuss',keyUse:'discuss',level:2,descriptors:['Ask yes/no questions to request clarification','Recognize how intonation conveys different meanings']},
  {gradeBand:'2-3',domain:'discuss',keyUse:'discuss',level:3,descriptors:['Negotiate agreement in small groups','Express own ideas consistent with the topic']},
  {gradeBand:'2-3',domain:'discuss',keyUse:'discuss',level:4,descriptors:['Express own ideas and support ideas of others','Propose solutions to resolve conflict in groups']},
  {gradeBand:'2-3',domain:'discuss',keyUse:'discuss',level:5,descriptors:['Initiate and maintain conversations','Challenge ideas respectfully']},
  // Gr 4-5 Speaking Recount
  {gradeBand:'4-5',domain:'speaking',keyUse:'recount',level:1,descriptors:['State key words associated with content using visual support','Communicate personal experiences orally']},
  {gradeBand:'4-5',domain:'speaking',keyUse:'recount',level:2,descriptors:['Retell short stories or content-related events','State procedural steps across content areas']},
  {gradeBand:'4-5',domain:'speaking',keyUse:'recount',level:3,descriptors:['Present detailed content-related information that has been rehearsed','State main ideas in classroom conversations']},
  {gradeBand:'4-5',domain:'speaking',keyUse:'recount',level:4,descriptors:['Give content-related oral reports','Sequence steps to solve a problem']},
  {gradeBand:'4-5',domain:'speaking',keyUse:'recount',level:5,descriptors:['Convey personal and content-related experiences in a team','Use technical vocabulary when sharing content']},
  // Gr 4-5 Reading Explain
  {gradeBand:'4-5',domain:'reading',keyUse:'explain',level:1,descriptors:['Match illustrated words to causal or sequential language','Sequence sentence strips for content-area processes']},
  {gradeBand:'4-5',domain:'reading',keyUse:'explain',level:2,descriptors:['Identify different types of connectors (first, next, because)','Identify key words describing the topic']},
  {gradeBand:'4-5',domain:'reading',keyUse:'explain',level:3,descriptors:['Match causes with effects','Identify words to determine the type of explanation']},
  {gradeBand:'4-5',domain:'reading',keyUse:'explain',level:4,descriptors:['Identify different words used to describe the same topic','Organize information on how or why phenomena occur']},
  {gradeBand:'4-5',domain:'reading',keyUse:'explain',level:5,descriptors:['Identify how text provides clear details of the topic','Identify components of systems (ecosystems, government)']},
  // Gr 1 Speaking Recount
  {gradeBand:'1',domain:'speaking',keyUse:'recount',level:1,descriptors:['Repeat words, phrases, and memorized chunks related to topics','Answer yes/no questions about stories']},
  {gradeBand:'1',domain:'speaking',keyUse:'recount',level:2,descriptors:['State content-related facts in context','Describe characters or places in picture books']},
  {gradeBand:'1',domain:'speaking',keyUse:'recount',level:3,descriptors:['Retell simple stories from picture cues','Participate in dialog with peers on familiar topics']},
  {gradeBand:'1',domain:'speaking',keyUse:'recount',level:4,descriptors:['Restate information with some details','Summarize a series of familiar events or routines']},
  {gradeBand:'1',domain:'speaking',keyUse:'recount',level:5,descriptors:['Present information on content-related topics','Share details about personal experiences']},
  // K Speaking Recount
  {gradeBand:'K',domain:'speaking',keyUse:'recount',level:1,descriptors:['Repeat words and phrases from familiar stories','Participate in songs, chants, or poems using gestures']},
  {gradeBand:'K',domain:'speaking',keyUse:'recount',level:2,descriptors:['Restate language from illustrated short stories','Re-enact various roles in pairs or small groups']},
  {gradeBand:'K',domain:'speaking',keyUse:'recount',level:3,descriptors:['Retell main events in short stories using pictures','Describe attributes of familiar objects and people']},
  {gradeBand:'K',domain:'speaking',keyUse:'recount',level:4,descriptors:['Retell familiar stories through a series of pictures','Share personal stories or experiences']},
  {gradeBand:'K',domain:'speaking',keyUse:'recount',level:5,descriptors:['Relate school-based content and personal experiences','Rephrase events from stories with a partner']},
]

function getGradeBand(grade: number): string {
  if (grade === 0) return 'K'
  if (grade === 1) return '1'
  if (grade <= 3) return '2-3'
  return '4-5'
}

type StdStatus = 'not_started' | 'in_progress' | 'mastered'
const STATUS_CFG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  mastered: { label: 'Mastered', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
}

// ═════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════
export default function CurriculumView() {
  const { language } = useApp()
  const [view, setView] = useState<'tracker'|'roadmap'|'wida'>('tracker')

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{language==='ko'?'교육과정 맵':'Curriculum Map'}</h2>
        <p className="text-[13px] text-text-secondary mt-1">CCSS ELA standards tracking with WIDA scaffolding support</p>
        <div className="flex gap-1 mt-4">
          {([['tracker','Standards Tracker',BookOpen],['roadmap','Class Roadmap',Layers],['wida','WIDA Reference',Globe2]] as const).map(([id,label,Icon]) => (
            <button key={id} onClick={() => setView(id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${view===id?'bg-navy text-white':'text-text-secondary hover:bg-surface-alt'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {view==='tracker'&&<Tracker />}
        {view==='roadmap'&&<Roadmap />}
        {view==='wida'&&<WIDARef />}
      </div>
    </div>
  )
}

// ─── STANDARDS TRACKER ───────────────────────────────────────────────
function Tracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass)||'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [dom, setDom] = useState<CCSSDomain>('RL')
  const [statuses, setStatuses] = useState<Record<string,StdStatus>>({})
  const [expanded, setExpanded] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Ensure valid class
  useEffect(() => {
    if (!ENGLISH_CLASSES.includes(cls)) setCls('Lily')
  }, [cls])

  const adj = getAdjustedGrade(gr, cls)
  const stds = useMemo(() => {
    let r = S.filter(s => s.domain===dom && s.grade===adj)
    if (search) { const q=search.toLowerCase(); r=r.filter(s=>s.code.toLowerCase().includes(q)||s.text.toLowerCase().includes(q)) }
    return r
  }, [dom, adj, search])

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const { data } = await supabase.from('class_standard_status').select('*').eq('english_class',cls).eq('student_grade',gr)
      const m: Record<string,StdStatus> = {}
      if (data) data.forEach((r:any)=>{ m[r.standard_code]=r.status })
      setStatuses(m); setLoading(false)
    })()
  }, [cls, gr])

  const cycle = async (code: string) => {
    const cur = statuses[code]||'not_started'
    const nxt = cur==='not_started'?'in_progress':cur==='in_progress'?'mastered':'not_started'
    setStatuses(p=>({...p,[code]:nxt}))
    const { error } = await supabase.from('class_standard_status').upsert({
      english_class:cls, student_grade:gr, standard_code:code, status:nxt, updated_by:currentTeacher?.id, updated_at:new Date().toISOString()
    }, { onConflict:'english_class,student_grade,standard_code' })
    if (error) showToast(`Error: ${error.message}`)
  }

  const tier = ['Lily','Camellia'].includes(cls)?'2 below':['Daisy','Sunflower'].includes(cls)?'1 below':'On level'

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {ENGLISH_CLASSES.map(c=>(
              <button key={c} onClick={()=>setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls===c?'text-white':'text-text-secondary hover:bg-surface-alt'}`}
                style={cls===c?{backgroundColor:classToColor(c),color:classToTextColor(c)}:{}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Student Grade</label>
          <div className="flex gap-1">
            {GRADES.map(g=><button key={g} onClick={()=>setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}
          </div>
        </div>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search standards..." className="pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] w-56 outline-none focus:border-navy" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
        <Info size={15} className="text-blue-500 flex-shrink-0" />
        <p className="text-[12px] text-blue-700"><span className="font-semibold">{cls}</span> Grade {gr} students work at <span className="font-semibold">{gradeLabel(adj)} CCSS</span> ({tier})</p>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {CCSS_DOMAINS.map(d=>{
          const cnt=S.filter(s=>s.domain===d.key&&s.grade===adj).length
          return <button key={d.key} onClick={()=>setDom(d.key)} className={`px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap ${dom===d.key?'bg-navy text-white':'bg-surface-alt text-text-secondary hover:bg-border'}`}>{d.key} ({cnt})</button>
        })}
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
       stds.length===0 ? <div className="py-12 text-center text-text-tertiary text-[13px]">No standards for {dom} at {gradeLabel(adj)}.</div> :
       <div className="space-y-1.5">{stds.map(std=>{
        const status=statuses[std.code]||'not_started'; const cfg=STATUS_CFG[status]; const Icon=cfg.icon; const isExp=expanded===std.code
        return <div key={std.code} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <button onClick={()=>cycle(std.code)} className="mt-0.5 flex-shrink-0" title={`${cfg.label} - click to change`}>
              <Icon size={20} className={cfg.color} fill={status==='mastered'?'#22c55e':status==='in_progress'?'#3b82f6':'none'} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-navy">{std.code}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] text-text-tertiary">{std.cluster}</span>
              </div>
              <p className="text-[12.5px] text-text-primary mt-1 leading-relaxed">{std.text}</p>
            </div>
            <button onClick={()=>setExpanded(isExp?null:std.code)} className="mt-1 p-1 rounded-lg text-text-tertiary hover:text-navy hover:bg-surface-alt flex-shrink-0" title="WIDA scaffolds">
              {isExp?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
            </button>
          </div>
          {isExp && <div className="border-t border-border bg-gradient-to-b from-blue-50/50 to-surface px-4 py-3">
            <p className="text-[11px] font-semibold text-blue-600 mb-2 flex items-center gap-1"><Globe2 size={13} /> WIDA Can-Do -- {getGradeBand(adj)} band</p>
            <WIDAPanel gradeBand={getGradeBand(adj)} />
          </div>}
        </div>
       })}</div>
      }
    </div>
  )
}

function WIDAPanel({ gradeBand }: { gradeBand: string }) {
  const data = W.filter(d=>d.gradeBand===gradeBand&&d.keyUse==='recount')
  const doms = [...new Set(data.map(d=>d.domain))]
  if (!data.length) return <p className="text-[11px] text-text-tertiary italic">WIDA descriptors available for grade bands: K, 1, 2-3, 4-5</p>
  return <div className="space-y-2">{doms.map(dm=>
    <div key={dm}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-text-secondary mb-1 capitalize">{dm}</p>
      <div className="grid grid-cols-5 gap-1">{WIDA_LEVELS.slice(0,5).map(wl=>{
        const d=data.find(x=>x.domain===dm&&x.level===wl.level)
        return <div key={wl.level} className="bg-white border border-border rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor:wl.color}} /><span className="text-[9px] font-bold text-text-secondary">L{wl.level} {wl.name}</span></div>
          {d ? <ul className="text-[10px] text-text-primary space-y-0.5">{d.descriptors.map((t,i)=><li key={i} className="leading-tight">{t}</li>)}</ul> : <p className="text-[10px] text-text-tertiary">--</p>}
        </div>
      })}</div>
    </div>
  )}</div>
}

// ─── CLASS ROADMAP ───────────────────────────────────────────────────
function Roadmap() {
  const [gr, setGr] = useState<Grade>(3)
  const [dom, setDom] = useState<CCSSDomain>('RL')
  const [allSt, setAllSt] = useState<Record<string,StdStatus>>({})
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    (async()=>{
      setLoading(true)
      const {data}=await supabase.from('class_standard_status').select('*').eq('student_grade',gr)
      const m:Record<string,StdStatus>={}
      if(data) data.forEach((r:any)=>{m[`${r.english_class}::${r.standard_code}`]=r.status})
      setAllSt(m); setLoading(false)
    })()
  },[gr])

  const relStds = S.filter(s=>s.domain===dom && ENGLISH_CLASSES.some(c=>getAdjustedGrade(gr,c)===s.grade)).sort((a,b)=>a.grade-b.grade||a.code.localeCompare(b.code))

  return <div>
    <div className="flex items-center gap-4 mb-5">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
        <div className="flex gap-1">{GRADES.map(g=><button key={g} onClick={()=>setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Domain</label>
        <div className="flex gap-1">{CCSS_DOMAINS.map(d=><button key={d.key} onClick={()=>setDom(d.key)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium ${dom===d.key?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>{d.key}</button>)}</div>
      </div>
    </div>
    <div className="flex items-center gap-4 mb-4 text-[10px]">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border" /> Not Started</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> In Progress</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Mastered</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-dashed border-gray-300" /> N/A for class</span>
    </div>
    {loading?<div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>:
    <div className="bg-surface border border-border rounded-xl overflow-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[180px]">Standard</th>
          {ENGLISH_CLASSES.map(c=><th key={c} className="px-2 py-2.5 text-center min-w-[95px]">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{backgroundColor:classToColor(c),color:classToTextColor(c)}}>{c}</span>
            <div className="text-[9px] text-text-tertiary mt-0.5">{gradeLabel(getAdjustedGrade(gr,c))}</div>
          </th>)}
        </tr></thead>
        <tbody>
          {relStds.map(std=><tr key={std.code} className="border-t border-border hover:bg-surface-alt/50">
            <td className="px-3 py-2 sticky left-0 bg-surface">
              <span className="font-bold text-navy">{std.code}</span>
              <p className="text-[10px] text-text-tertiary mt-0.5 line-clamp-2">{std.text}</p>
            </td>
            {ENGLISH_CLASSES.map(c=>{
              const a=getAdjustedGrade(gr,c)
              if(a!==std.grade) return <td key={c} className="px-2 py-2 text-center"><span className="w-4 h-4 rounded bg-gray-100 border border-dashed border-gray-300 inline-block" /></td>
              const st=allSt[`${c}::${std.code}`]||'not_started'
              const bg=st==='mastered'?'bg-green-200 border-green-300':st==='in_progress'?'bg-blue-200 border-blue-300':'bg-gray-200 border-gray-300'
              return <td key={c} className="px-2 py-2 text-center"><span className={`w-4 h-4 rounded border inline-block ${bg}`} title={`${c}: ${st}`} /></td>
            })}
          </tr>)}
        </tbody>
      </table>
    </div>}
  </div>
}

// ─── WIDA REFERENCE ──────────────────────────────────────────────────
function WIDARef() {
  const [gb, setGb] = useState('2-3')
  const [ku, setKu] = useState<WIDAKeyUse>('recount')
  const [df, setDf] = useState<WIDADomain|'all'>('all')

  const data = W.filter(d=>d.gradeBand===gb&&d.keyUse===ku&&(df==='all'||d.domain===df))
  const doms = [...new Set(data.map(d=>d.domain))]

  return <div>
    <div className="flex flex-wrap items-center gap-4 mb-5">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade Band</label>
        <div className="flex gap-1">{['K','1','2-3','4-5'].map(g=><button key={g} onClick={()=>setGb(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gb===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>{g}</button>)}</div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Key Use</label>
        <div className="flex gap-1">{(['recount','explain','argue','discuss'] as WIDAKeyUse[]).map(k=><button key={k} onClick={()=>setKu(k)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize ${ku===k?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>{k}</button>)}</div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Domain</label>
        <div className="flex gap-1">
          <button onClick={()=>setDf('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${df==='all'?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>All</button>
          {(['listening','speaking','reading','writing','discuss'] as WIDADomain[]).map(d=><button key={d} onClick={()=>setDf(d)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize ${df===d?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>{d}</button>)}
        </div>
      </div>
    </div>

    {doms.length===0?<div className="py-12 text-center text-text-tertiary text-[13px]">No descriptors loaded for this combination. Descriptors are available for: Listening/Speaking/Reading/Writing in Recount key use across all grade bands.</div>:
    <div className="space-y-4">{doms.map(dm=>
      <div key={dm} className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="bg-surface-alt px-4 py-2.5"><h4 className="text-[12px] font-bold text-navy uppercase">{dm}</h4></div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-2">
            {WIDA_LEVELS.slice(0,5).map(wl=>{
              const d=data.find(x=>x.domain===dm&&x.level===wl.level)
              return <div key={wl.level} className="border border-border rounded-xl p-3" style={{borderTopColor:wl.color,borderTopWidth:3}}>
                <div className="flex items-center gap-1.5 mb-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:wl.color}} /><span className="text-[11px] font-bold text-navy">Level {wl.level}</span></div>
                <p className="text-[10px] font-semibold text-text-secondary mb-1.5">{wl.name}</p>
                {d?<ul className="text-[11px] text-text-primary space-y-1.5">{d.descriptors.map((t,i)=><li key={i} className="leading-snug flex gap-1.5"><span className="text-text-tertiary mt-0.5">&#8226;</span><span>{t}</span></li>)}</ul>:<p className="text-[11px] text-text-tertiary italic">No descriptors loaded</p>}
              </div>
            })}
          </div>
        </div>
      </div>
    )}</div>}
  </div>
}
