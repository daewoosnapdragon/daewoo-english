// ─── WIDA can-do statements ──────────────────────────────────────
// What a child at each level does in the classroom, in plain words a teacher
// can tick. Four domains, six levels, two grade bands. The questionnaire
// shows the statements for a domain and band; the ticks suggest a level (see
// suggestLevel) and the teacher confirms or adjusts. Written for an EFL
// program in Korea: "English" is said where it matters, and Korean is the
// language the child falls back to. Draft for review.

import type { WIDADomainKey } from '@/lib/wida'
import { WIDA_LEVELS } from '@/lib/wida'

export type WidaBand = 'k2' | 'g35'
export type Level = 1 | 2 | 3 | 4 | 5 | 6
export const LEVELS: Level[] = [1, 2, 3, 4, 5, 6]

export interface CanDo { id: string; text: string }

const S = (domain: string, band: WidaBand, level: number, texts: string[]): CanDo[] =>
  texts.map((text, i) => ({ id: `${domain}.${band}.${level}.${i + 1}`, text }))

export const WIDA_CAN_DO: Record<WIDADomainKey, Record<WidaBand, Record<Level, CanDo[]>>> = {
  listening: {
    k2: {
      1: S('listening', 'k2', 1, [
        'Points to a picture or object when it is named',
        'Follows a one-step direction shown with a gesture (sit, line up, open)',
        'Responds to their name and to hello, goodbye, thank you',
        'Watches other children to work out what to do',
      ]),
      2: S('listening', 'k2', 2, [
        'Follows a one-step direction without a gesture',
        'Finds a named picture or word on the page',
        'Answers a yes/no question about a picture book read aloud',
        'Recognizes familiar classroom words and phrases (glue, partner, turn the page)',
      ]),
      3: S('listening', 'k2', 3, [
        'Follows two-step directions (get your book and sit on the carpet)',
        'Points to the part of a story that answers a who or where question',
        'Follows a short read-aloud on a familiar topic and says what happened',
        'Understands a classmate’s simple question or request',
      ]),
      4: S('listening', 'k2', 4, [
        'Follows multi-step directions for an activity the first time',
        'Answers why and how questions about a story read aloud',
        'Picks out the main idea of a short explanation',
        'Follows a class discussion and knows when it is their turn',
      ]),
      5: S('listening', 'k2', 5, [
        'Understands a read-aloud with new vocabulary using the context',
        'Follows directions with details, exceptions and order words (before you, unless)',
        'Understands a joke, a surprise or a change of tone in a story',
        'Keeps up with a fast discussion between classmates',
      ]),
      6: S('listening', 'k2', 6, [
        'Understands everything said in class at the pace of a native speaker',
        'Follows a story or explanation with unfamiliar words and works them out',
        'Understands playground talk and idioms from classmates',
        'Needs no repeating or slowing down',
      ]),
    },
    g35: {
      1: S('listening', 'g35', 1, [
        'Points to pictures, objects or words when they are named',
        'Follows a one-step direction with a gesture or a model',
        'Responds to greetings and their name',
        'Understands a few classroom phrases (open your book, line up)',
      ]),
      2: S('listening', 'g35', 2, [
        'Follows one-step directions without a gesture',
        'Answers yes/no and either/or questions about a picture or a short text',
        'Recognizes the topic of a read-aloud from the pictures and key words',
        'Understands a simple question from a partner',
      ]),
      3: S('listening', 'g35', 3, [
        'Follows two- and three-step directions for a familiar task',
        'Answers who, what, where, when questions about a read-aloud',
        'Follows a short lesson on a familiar topic and can say the main point',
        'Keeps up with a partner discussion on a familiar topic',
      ]),
      4: S('listening', 'g35', 4, [
        'Follows a lesson on a new topic, using the visuals and examples',
        'Answers why and how questions about what was said',
        'Takes notes or draws from an explanation',
        'Follows a class discussion and can say what each speaker thought',
      ]),
      5: S('listening', 'g35', 5, [
        'Understands academic explanations with grade-level vocabulary',
        'Works out an unfamiliar word from the sentence around it',
        'Understands tone: a joke, sarcasm, a warning',
        'Follows a fast discussion and a speaker who does not simplify',
      ]),
      6: S('listening', 'g35', 6, [
        'Understands everything at the pace and vocabulary of a native speaker',
        'Understands idioms and playground language from classmates',
        'Follows a long explanation or story without support',
        'Needs no repeating, slowing or simplifying',
      ]),
    },
  },
  speaking: {
    k2: {
      1: S('speaking', 'k2', 1, [
        'Says single English words for things in the room (book, pencil, dog)',
        'Repeats a word or short phrase after the teacher',
        'Uses gestures, pointing or Korean to make needs known',
        'Says hello, goodbye, thank you, yes, no',
      ]),
      2: S('speaking', 'k2', 2, [
        'Uses short phrases and memorized chunks (I like, can I have, it’s a)',
        'Names pictures and answers a simple question with one or two words',
        'Asks for help with a short phrase (help me, bathroom please)',
        'Joins in chants, songs and repeated lines',
      ]),
      3: S('speaking', 'k2', 3, [
        'Speaks in short simple sentences, with mistakes (He go to school)',
        'Describes a picture with a few sentences',
        'Retells a familiar story in order with help',
        'Asks and answers questions with a partner on a familiar topic',
      ]),
      4: S('speaking', 'k2', 4, [
        'Speaks in longer sentences joined with and, but, because',
        'Retells a story with a beginning, middle and end',
        'Explains how they did something or why they think something',
        'Talks with classmates in English without being asked to',
      ]),
      5: S('speaking', 'k2', 5, [
        'Speaks fluently on classroom topics with few errors',
        'Uses new vocabulary from lessons in their own sentences',
        'Tells a made-up story with details and feeling',
        'Explains an idea to a classmate who did not understand',
      ]),
      6: S('speaking', 'k2', 6, [
        'Speaks like a native speaker of the same age',
        'Uses playground language, jokes and expressions naturally',
        'Argues a point and responds to what others say',
        'Rarely searches for a word',
      ]),
    },
    g35: {
      1: S('speaking', 'g35', 1, [
        'Says single words and names things in English',
        'Repeats phrases after a model',
        'Uses gestures or Korean to communicate most of the time',
        'Answers yes or no',
      ]),
      2: S('speaking', 'g35', 2, [
        'Uses short phrases and memorized sentences (I don’t know, can I go)',
        'Answers a question in a word or a short phrase',
        'Describes a picture with a few words',
        'Asks for help or permission with a short phrase',
      ]),
      3: S('speaking', 'g35', 3, [
        'Speaks in simple sentences, with grammar mistakes',
        'Retells a story or event in order with some detail',
        'Gives an opinion with one reason (I like it because…)',
        'Takes part in a partner discussion on a familiar topic',
      ]),
      4: S('speaking', 'g35', 4, [
        'Speaks in connected sentences with mostly correct grammar',
        'Explains a process, a rule or a solution step by step',
        'Gives an opinion with reasons and responds to a classmate’s',
        'Presents to the class with notes and some expression',
      ]),
      5: S('speaking', 'g35', 5, [
        'Speaks fluently on academic topics with grade-level vocabulary',
        'Explains a complex idea so classmates understand it',
        'Adjusts how they speak for a friend, a teacher or a presentation',
        'Makes minor errors that do not get in the way',
      ]),
      6: S('speaking', 'g35', 6, [
        'Speaks like a native speaker of the same age in every classroom situation',
        'Uses idioms, humor and expressions naturally',
        'Debates and defends a point with evidence',
        'Rarely searches for a word or a structure',
      ]),
    },
  },
  reading: {
    k2: {
      1: S('reading', 'k2', 1, [
        'Recognizes some letters and their sounds',
        'Matches a few familiar words to pictures (cat, dog, mom)',
        'Knows print goes left to right and which way up a book goes',
        'Finds their own name',
      ]),
      2: S('reading', 'k2', 2, [
        'Knows most letter sounds and reads CVC words',
        'Reads a few sight words (the, is, and, I)',
        'Understands a simple sentence with a picture to help',
        'Follows a familiar story from the pictures and key words',
      ]),
      3: S('reading', 'k2', 3, [
        'Reads simple sentences and short decodable books',
        'Reads many sight words',
        'Answers who, what, where questions about a short text',
        'Uses the pictures to work out an unknown word',
      ]),
      4: S('reading', 'k2', 4, [
        'Reads grade-level books with some support',
        'Retells a story they read with the main events in order',
        'Works out new words from the sentence or the pictures',
        'Reads with some expression and self-corrects',
      ]),
      5: S('reading', 'k2', 5, [
        'Reads grade-level texts independently',
        'Answers why and how questions using the text',
        'Understands a text with some new vocabulary',
        'Reads fluently at a good pace with expression',
      ]),
      6: S('reading', 'k2', 6, [
        'Reads like a native speaker of the same age',
        'Understands chapter books and information books at grade level',
        'Infers feelings and reasons that are not stated',
        'Reads for pleasure in English by choice',
      ]),
    },
    g35: {
      1: S('reading', 'g35', 1, [
        'Recognizes letters, sounds and a few familiar words',
        'Matches words to pictures',
        'Understands single words and labels with a picture',
        'Reads short memorized phrases',
      ]),
      2: S('reading', 'g35', 2, [
        'Reads simple sentences with pictures to help',
        'Reads common sight words and CVC words',
        'Finds a named word or detail in a short text',
        'Understands the topic of a short text from pictures and key words',
      ]),
      3: S('reading', 'g35', 3, [
        'Reads short paragraphs on familiar topics',
        'Answers who, what, where, when questions from the text',
        'Works out some new words from context',
        'Reads below grade level but with understanding',
      ]),
      4: S('reading', 'g35', 4, [
        'Reads grade-level texts with some support for new vocabulary',
        'Finds the main idea and supporting details',
        'Answers why and how questions using evidence from the text',
        'Uses headings, captions and glossaries',
      ]),
      5: S('reading', 'g35', 5, [
        'Reads grade-level texts independently, fiction and information',
        'Infers meaning, motive and theme',
        'Works out academic vocabulary from the text',
        'Compares two texts on the same topic',
      ]),
      6: S('reading', 'g35', 6, [
        'Reads like a native speaker of the same age',
        'Understands figurative language and complex sentences',
        'Reads long texts independently and summarizes them',
        'Reads for pleasure in English by choice',
      ]),
    },
  },
  writing: {
    k2: {
      1: S('writing', 'k2', 1, [
        'Writes some letters and copies words',
        'Draws to show an idea and labels with a word or a letter',
        'Writes their own name',
        'Traces or copies a sentence',
      ]),
      2: S('writing', 'k2', 2, [
        'Writes familiar words and labels from a word bank',
        'Completes a sentence frame (I like ___)',
        'Writes a short sentence with best-guess spelling',
        'Copies a sentence pattern and changes a word',
      ]),
      3: S('writing', 'k2', 3, [
        'Writes two or three simple sentences on a topic',
        'Uses a capital letter and a period some of the time',
        'Spells common words correctly and sounds out others',
        'Writes about a picture or an event with help',
      ]),
      4: S('writing', 'k2', 4, [
        'Writes a short paragraph with a beginning, middle and end',
        'Uses capitals, periods and some question marks correctly',
        'Adds details and describing words',
        'Writes an opinion with a reason',
      ]),
      5: S('writing', 'k2', 5, [
        'Writes several sentences that stay on topic with details',
        'Uses new vocabulary from lessons in writing',
        'Edits their own writing for capitals, periods and spelling',
        'Writes a story, an opinion and an information piece',
      ]),
      6: S('writing', 'k2', 6, [
        'Writes like a native speaker of the same age',
        'Uses varied sentences and precise words',
        'Makes only minor errors',
        'Organizes writing without a frame',
      ]),
    },
    g35: {
      1: S('writing', 'g35', 1, [
        'Copies words and short phrases',
        'Labels pictures with single words',
        'Writes their name and a few familiar words from memory',
        'Uses Korean or drawings to show ideas',
      ]),
      2: S('writing', 'g35', 2, [
        'Writes short sentences from a frame or a word bank',
        'Lists words on a topic',
        'Writes a sentence with best-guess spelling that can be read',
        'Answers a question in a phrase',
      ]),
      3: S('writing', 'g35', 3, [
        'Writes a short paragraph of simple sentences, with errors',
        'Uses capitals and end punctuation most of the time',
        'Gives an opinion with a reason in writing',
        'Retells or describes with some detail',
      ]),
      4: S('writing', 'g35', 4, [
        'Writes a paragraph with a topic sentence, details and a closing',
        'Uses a variety of sentence types',
        'Uses transition words (first, then, because, however)',
        'Edits with a checklist and fixes most errors',
      ]),
      5: S('writing', 'g35', 5, [
        'Writes multi-paragraph pieces near grade level',
        'Uses academic vocabulary and precise words',
        'Organizes ideas clearly for opinion, information and narrative writing',
        'Makes minor errors that do not get in the way',
      ]),
      6: S('writing', 'g35', 6, [
        'Writes like a native speaker of the same age',
        'Uses voice, style and varied structure on purpose',
        'Revises for meaning, not just correctness',
        'Needs no language scaffolding',
      ]),
    },
  },
}

export function widaBandForGrade(grade: number): WidaBand { return grade <= 2 ? 'k2' : 'g35' }

/**
 * What the ticks point to. A level is "met" when at least three quarters of
 * its statements are ticked and every level below it is met too, so one
 * optimistic tick at level 5 does not lift a child who cannot yet do level 3.
 * `level` is the highest met level (1 when nothing is ticked). `decimal` adds
 * the share of the next level's statements that are ticked, so a student who
 * does all of level 3 and half of level 4 reads as 3.5.
 */
export function suggestLevel(domain: WIDADomainKey, band: WidaBand, ticked: Set<string>): { level: Level; decimal: number; strength: Record<Level, number> } {
  const strength = {} as Record<Level, number>
  for (const lv of LEVELS) {
    const items = WIDA_CAN_DO[domain][band][lv]
    strength[lv] = items.length ? items.filter(i => ticked.has(i.id)).length / items.length : 0
  }
  let level: Level = 1
  for (const lv of LEVELS) {
    if (strength[lv] >= 0.75) level = lv; else break
  }
  const next = LEVELS.find(lv => lv === level + 1)
  const decimal = Math.min(6, Math.round((level + (next ? strength[next] : 0)) * 10) / 10)
  return { level, decimal, strength }
}

/** Tick every statement from level 1 through `through`: the skip-ahead for a student you already know well. */
export function ticksThrough(domain: WIDADomainKey, band: WidaBand, through: Level, existing: Set<string> = new Set()): Set<string> {
  const out = new Set(existing)
  for (const lv of LEVELS) if (lv <= through) WIDA_CAN_DO[domain][band][lv].forEach(i => out.add(i.id))
  return out
}
/** Untick every statement from `from` upward. */
export function ticksClearFrom(domain: WIDADomainKey, band: WidaBand, from: Level, existing: Set<string>): Set<string> {
  const out = new Set(existing)
  for (const lv of LEVELS) if (lv >= from) WIDA_CAN_DO[domain][band][lv].forEach(i => out.delete(i.id))
  return out
}

export function widaLevelName(level: number): string { return WIDA_LEVELS.find(l => l.level === Math.floor(level))?.name || String(level) }

// ─── Scaffolds suggested by level and domain ──────────────────────
// Short, assignable in one tap. Level 6 needs none.
export const SCAFFOLD_SUGGESTIONS: Record<WIDADomainKey, Record<Level, string[]>> = {
  listening: {
    1: ['Show directions with gestures and a model', 'Pair with a bilingual buddy', 'Picture cards for key words', 'Repeat and slow down for this student'],
    2: ['One direction at a time', 'Check understanding with a yes/no question', 'Pre-teach 5 key words with pictures', 'Extra wait time'],
    3: ['Two-step directions, then check', 'Sit near the teacher for read-alouds', 'Visual agenda for the lesson', 'Restate the main point at the end'],
    4: ['Note-taking frame for explanations', 'Partner check after instructions', 'Signal new vocabulary before use'],
    5: ['Ask this student to restate for the class', 'Introduce idioms as they come up'],
    6: [],
  },
  speaking: {
    1: ['Accept gestures, pointing and Korean', 'Sentence frame: "I want ___"', 'Choral repetition of key phrases', 'Total physical response activities'],
    2: ['Sentence starters on the desk', 'Word bank for the task', 'Answer with a partner first, then the class', 'Ask either/or questions'],
    3: ['Think-pair-share before speaking to the class', 'Sentence frames for opinions: "I think ___ because ___"', 'Model the full sentence back', 'Accept errors that do not block meaning'],
    4: ['Give a presenting role with notes', 'Discussion sentence starters: "I agree with ___ because"', 'Push for a second reason'],
    5: ['Peer tutoring role', 'Ask to explain to a classmate', 'Formal vs informal register practice'],
    6: [],
  },
  reading: {
    1: ['Picture books with labels', 'Letter-sound cards daily', 'Bilingual word wall', 'Read to the student one to one'],
    2: ['Decodable readers at CVC level', 'Sight word ring', 'Pictures beside every text', 'Echo reading'],
    3: ['Pre-teach 3 to 5 words before reading', 'Partner reading', 'Highlight who / what / where in the text', 'Graphic organizer for retelling'],
    4: ['Vocabulary notebook for academic words', 'Text features walk before reading', 'Question stems for why and how'],
    5: ['Compare-two-texts tasks', 'Mentor texts for analysis', 'Independent reading log with choice'],
    6: [],
  },
  writing: {
    1: ['Trace and copy', 'Label pictures with a word bank', 'Accept drawings as writing', 'Name and date model'],
    2: ['Sentence frames: "I like ___. It is ___."', 'Word bank with pictures', 'Copy a pattern, change one word', 'Best-guess spelling accepted'],
    3: ['Graphic organizer before writing', 'Editing checklist: capital, period, spaces', 'Sentence starters for each part', 'Model paragraph to follow'],
    4: ['Transition word list on the desk', 'Peer editing with a checklist', 'Mentor text for the genre'],
    5: ['Academic word list for the unit', 'Revision conference on ideas, not errors', 'Choice of genre and audience'],
    6: [],
  },
}
