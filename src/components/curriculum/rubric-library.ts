// ─── Rubric library ──────────────────────────────────────────────
// A rubric is a chosen set of criteria on a 1–4 scale (0 = not applicable).
// Each criterion carries four level descriptors in two wordings, K–2 and 3–5,
// written so a line can double as a comment to a student or a parent, and a
// standard code with the grade left as {g}. Templates are named sets of
// criteria for common tasks. Teachers customise either in the builder and
// save the result to the rubrics table; these are the starting points.

export type Band = 'k2' | 'g35'
export const LEVEL_LABELS: Record<number, string> = { 0: 'N/A', 1: 'Needs guidance', 2: 'Developing', 3: 'Meets', 4: 'Exceeds' }
export const LEVEL_LABELS_KO: Record<number, string> = { 0: '해당 없음', 1: '지도 필요', 2: '발전 중', 3: '기준 충족', 4: '기준 초과' }

export interface LibraryCriterion {
  key: string
  label: string
  group: 'Conventions' | 'Content' | 'Reading' | 'Speaking & listening' | 'Work habits'
  /** Standard code with {g} for the grade; K resolves to K. */
  standard?: string
  levels: Record<Band, [string, string, string, string]>
}

/** A criterion as stored on a rubric: descriptors resolved for one band and grade. */
export interface RubricCriterion {
  key: string
  label: string
  levels: [string, string, string, string]
  standard?: string
}

export interface RubricTemplate {
  key: string
  name: string
  description: string
  bands: Band[]
  criteria: string[]
}

export const CRITERIA: LibraryCriterion[] = [
  // ═══ Conventions ═══
  { key: 'capitalization', label: 'Capitalization', group: 'Conventions', standard: 'L.{g}.2', levels: {
    k2: ['Capitals appear at random or not at all.', 'Capitalizes the start of some sentences or the word I.', 'Capitalizes the start of every sentence, names, and I.', 'Also capitalizes days, months, places, and titles without prompting.'],
    g35: ['Capitals are missing or used at random.', 'Capitalizes sentence starts but misses names, titles, or places.', 'Capitalizes sentence starts, proper nouns, and titles correctly.', 'Capitalization is correct throughout, including in dialogue and headings.'] } },
  { key: 'punctuation', label: 'Punctuation', group: 'Conventions', standard: 'L.{g}.2', levels: {
    k2: ['No end punctuation yet.', 'Uses periods at the end of some sentences.', 'Ends every sentence with a period, question mark, or exclamation mark.', 'Also uses commas in lists and dates, and apostrophes in contractions.'],
    g35: ['End punctuation is missing from most sentences.', 'Ends most sentences correctly; commas and quotation marks are unsure.', 'Uses end marks, commas in lists and addresses, and quotation marks for dialogue.', 'Punctuation is accurate throughout, including commas in compound sentences and apostrophes.'] } },
  { key: 'spelling', label: 'Spelling', group: 'Conventions', standard: 'L.{g}.2', levels: {
    k2: ['Letters do not yet match the sounds in words.', 'Spells some sight words correctly; sounds out others with a few letters.', 'Spells most sight words correctly and uses best-guess spelling that can be read.', 'Spells sight words and most pattern words correctly; guesses are close.'],
    g35: ['Many common words are misspelled, which makes the writing hard to read.', 'Spells common words correctly; longer words are often misspelled.', 'Spells grade-level words correctly and uses patterns to attempt new words.', 'Spelling is accurate throughout, including irregular and multisyllable words.'] } },
  { key: 'sentences', label: 'Complete sentences', group: 'Conventions', standard: 'L.{g}.1', levels: {
    k2: ['Writes words or labels rather than sentences.', 'Writes some complete sentences; others are missing a part.', 'Writes complete sentences that make sense.', 'Writes complete sentences of different lengths, some with and, but, or because.'],
    g35: ['Sentences are incomplete or run together.', 'Most sentences are complete; a few fragments or run-ons remain.', 'Sentences are complete, with subjects and verbs that agree.', 'Sentences are complete and varied, with compound and complex sentences used correctly.'] } },
  { key: 'sentence_fluency', label: 'Sentence fluency', group: 'Conventions', standard: 'L.{g}.3', levels: {
    k2: ['Every sentence starts the same way.', 'A few sentences start differently.', 'Sentences start in different ways and are easy to read aloud.', 'Sentences vary in length and rhythm; the writing sounds natural read aloud.'],
    g35: ['Sentences are all the same shape, so the writing sounds choppy.', 'Some variety in sentence starts; lengths are similar.', 'Sentences vary in starts and length and flow when read aloud.', 'Sentence variety is used on purpose for effect, with smooth transitions.'] } },
  { key: 'grammar', label: 'Grammar', group: 'Conventions', standard: 'L.{g}.1', levels: {
    k2: ['Word order and endings make the meaning unclear.', 'Uses some correct plurals and verb endings.', 'Uses correct plurals, past tense, and pronouns most of the time.', 'Grammar is correct throughout, including irregular verbs and plurals.'],
    g35: ['Frequent errors in tense, agreement, or word order get in the way of meaning.', 'Tense and agreement are mostly right; some errors with pronouns or irregular forms.', 'Verb tenses are consistent and subjects agree with verbs.', 'Grammar is accurate and controlled, including with complex sentences.'] } },
  { key: 'handwriting', label: 'Handwriting and spacing', group: 'Conventions', standard: 'L.{g}.1', levels: {
    k2: ['Letters are hard to recognize; no spaces between words.', 'Most letters can be read; spacing is inconsistent.', 'Letters are formed correctly with spaces between words.', 'Handwriting is neat and even, sitting on the line, with clear spacing.'],
    g35: ['Writing is hard to read.', 'Readable, with uneven size or spacing.', 'Neat and easy to read.', 'Consistently neat, with attention to layout and presentation.'] } },

  // ═══ Content ═══
  { key: 'ideas', label: 'Ideas and details', group: 'Content', standard: 'W.{g}.3', levels: {
    k2: ['Idea is unclear or off topic.', 'Has an idea but few details.', 'Stays on topic and adds some details.', 'Stays on topic with details that make the idea clear and interesting.'],
    g35: ['The main idea is unclear or the writing wanders off topic.', 'The main idea is there but details are thin or repeated.', 'Stays on topic with relevant, specific details.', 'Ideas are focused and developed with vivid, well-chosen details.'] } },
  { key: 'organization', label: 'Organization', group: 'Content', standard: 'W.{g}.3', levels: {
    k2: ['Events are in no order.', 'Has a beginning or an end, but not both.', 'Has a beginning, middle, and end in order.', 'Beginning, middle, and end are clear, and each part is developed.'],
    g35: ['No clear structure; ideas are in random order.', 'Has a beginning and end; the middle is jumbled or thin.', 'Has a clear beginning, middle, and end with related ideas grouped together.', 'Structure is clear and deliberate, with paragraphs and transitions that guide the reader.'] } },
  { key: 'opinion', label: 'States an opinion', group: 'Content', standard: 'W.{g}.1', levels: {
    k2: ['No opinion is given.', 'Gives an opinion but it is hard to find.', 'States an opinion clearly at the start.', 'States a clear opinion in an interesting opening sentence.'],
    g35: ['The opinion is missing or unclear.', 'States an opinion, but not until later or not clearly.', 'Introduces the topic and states a clear opinion at the start.', 'Opens with a clear, well-worded opinion that sets up the reasons to come.'] } },
  { key: 'reasons', label: 'Reasons and support', group: 'Content', standard: 'W.{g}.1', levels: {
    k2: ['No reason is given.', 'Gives one reason.', 'Gives a reason that supports the opinion.', 'Gives two or more reasons with a detail for each.'],
    g35: ['Reasons are missing or do not support the opinion.', 'Gives one or two reasons with little explanation.', 'Gives reasons that support the opinion, each with a fact or example.', 'Reasons are convincing, well explained, and ordered from strong to strongest.'] } },
  { key: 'facts_details', label: 'Facts and information', group: 'Content', standard: 'W.{g}.2', levels: {
    k2: ['No facts about the topic.', 'Gives one fact.', 'Gives some facts about the topic.', 'Gives several accurate facts and explains them.'],
    g35: ['Few facts, or facts that are not about the topic.', 'Some facts; some are vague or repeated.', 'Uses facts, definitions, and details that develop the topic.', 'Uses accurate, well-chosen facts and examples, grouped by subtopic.'] } },
  { key: 'sequence_words', label: 'Sequence and linking words', group: 'Content', standard: 'W.{g}.3', levels: {
    k2: ['No order words.', 'Uses one order word, such as first or then.', 'Uses first, next, then, and last to show order.', 'Uses a range of order and time words that make the sequence easy to follow.'],
    g35: ['No transitions; the reader cannot tell what happens when.', 'Uses a few transitions, mostly then.', 'Uses transitions such as first, after that, and finally to link events or ideas.', 'Uses varied, precise transitions that connect ideas smoothly.'] } },
  { key: 'closing', label: 'Closing', group: 'Content', standard: 'W.{g}.1', levels: {
    k2: ['The writing just stops.', 'Has an ending that is sudden.', 'Has a closing sentence.', 'Has a closing that wraps up the idea or feeling.'],
    g35: ['No conclusion.', 'Ends with a single sentence that restates the topic.', 'Has a concluding sentence or section that connects to the opinion or topic.', 'The conclusion brings the ideas together and leaves the reader with something to think about.'] } },
  { key: 'voice', label: 'Voice', group: 'Content', standard: 'W.{g}.3', levels: {
    k2: ['The writing could be by anyone.', 'A little of the writer’s feeling shows.', 'The writer’s feelings and personality come through.', 'The voice is strong and fits the story or purpose.'],
    g35: ['Flat; the writer’s personality does not come through.', 'Personality shows in places.', 'A clear voice suited to the audience and purpose.', 'A distinctive, engaging voice that holds the reader.'] } },
  { key: 'word_choice', label: 'Word choice', group: 'Content', standard: 'L.{g}.6', levels: {
    k2: ['Uses the same few words.', 'Uses some describing words.', 'Uses describing words and some interesting words.', 'Chooses exact, interesting words that paint a picture.'],
    g35: ['Vocabulary is basic and repetitive.', 'Some precise or vivid words; some overused ones.', 'Uses precise words, including sensory and content-specific vocabulary.', 'Word choice is precise and vivid throughout, and suits the purpose.'] } },
  { key: 'letter_format', label: 'Letter format', group: 'Content', standard: 'W.{g}.1', levels: {
    k2: ['Missing the parts of a letter.', 'Has a greeting or a closing, but not both.', 'Has a greeting, a body, a closing, and a name.', 'All parts are in place and correctly punctuated, with the date.'],
    g35: ['Letter parts are missing.', 'Has most parts; some are out of order or unpunctuated.', 'Includes date, greeting, body, closing, and signature in order.', 'All parts are correct, and the tone suits the reader.'] } },
  { key: 'writing_process', label: 'Writing process', group: 'Work habits', standard: 'W.{g}.5', levels: {
    k2: ['Does not plan or check work.', 'Plans with help; makes a change when asked.', 'Plans before writing and fixes some mistakes when checking.', 'Plans, rereads, and improves the writing on their own.'],
    g35: ['Skips planning and revising.', 'Plans briefly; revises only with prompting.', 'Plans, drafts, revises, and edits with some guidance.', 'Uses the full process independently and makes meaningful revisions.'] } },

  // ═══ Reading ═══
  { key: 'retell', label: 'Retells the story', group: 'Reading', standard: 'RL.{g}.2', levels: {
    k2: ['Cannot say what happened.', 'Retells one or two parts, out of order.', 'Retells the main events in order.', 'Retells the beginning, middle, and end in order with key details.'],
    g35: ['Retelling is missing or confused.', 'Retells some events; order or key details are missing.', 'Retells the main events in order, including the problem and how it is solved.', 'Retells accurately and concisely, and identifies the central message or lesson.'] } },
  { key: 'characters_setting', label: 'Characters and setting', group: 'Reading', standard: 'RL.{g}.3', levels: {
    k2: ['Cannot name the characters or where the story happens.', 'Names a character or the setting.', 'Names the main characters and the setting.', 'Describes the characters and setting with details from the story.'],
    g35: ['Does not identify characters or setting.', 'Names characters and setting with little description.', 'Describes characters (traits, feelings) and setting using the text.', 'Explains how characters’ actions and the setting affect the events.'] } },
  { key: 'text_evidence', label: 'Uses the text', group: 'Reading', standard: 'RL.{g}.1', levels: {
    k2: ['Answers are not about the text.', 'Answers with a guess; can point to the page with help.', 'Answers questions using details from the text.', 'Answers with details from the text and says where they are found.'],
    g35: ['Answers without referring to the text.', 'Refers to the text loosely; evidence is vague.', 'Supports answers with specific details or quotations from the text.', 'Chooses the strongest evidence and explains how it supports the answer.'] } },

  // ═══ Speaking & listening ═══
  { key: 'volume_clarity', label: 'Volume and clarity', group: 'Speaking & listening', standard: 'SL.{g}.4', levels: {
    k2: ['Too quiet to hear or hard to understand.', 'Can be heard some of the time.', 'Speaks clearly and loudly enough for the class to hear.', 'Speaks clearly with expression; every word can be understood.'],
    g35: ['Cannot be heard or understood by the audience.', 'Sometimes too quiet or too fast; parts are unclear.', 'Speaks clearly at a good pace and volume for the whole room.', 'Uses volume, pace, and expression to hold the audience’s attention.'] } },
  { key: 'presence', label: 'Eye contact and posture', group: 'Speaking & listening', standard: 'SL.{g}.4', levels: {
    k2: ['Looks down or away the whole time.', 'Looks up a few times.', 'Faces the audience and looks up most of the time.', 'Faces the audience, stands tall, and looks at different people.'],
    g35: ['No eye contact; turned away or reading the whole time.', 'Some eye contact; often reads from notes.', 'Makes eye contact with the audience and stands confidently.', 'Uses eye contact, posture, and gesture naturally to connect with the audience.'] } },
  { key: 'speaks_sentences', label: 'Speaks in complete sentences', group: 'Speaking & listening', standard: 'SL.{g}.6', levels: {
    k2: ['Answers with one word or a gesture.', 'Uses some short sentences.', 'Speaks in complete sentences.', 'Speaks in complete, detailed sentences, adding because or and.'],
    g35: ['Speaks in fragments or single words.', 'Uses complete sentences some of the time.', 'Speaks in complete sentences suited to the task.', 'Speaks in well-formed, varied sentences with precise vocabulary.'] } },
  { key: 'listening', label: 'Listens and responds', group: 'Speaking & listening', standard: 'SL.{g}.1', levels: {
    k2: ['Does not listen to the partner.', 'Listens some of the time; interrupts.', 'Listens to the partner and takes turns.', 'Listens carefully and responds to what the partner said.'],
    g35: ['Interrupts or does not listen to others.', 'Listens but responses do not connect to what was said.', 'Listens, takes turns, and builds on others’ ideas.', 'Listens actively, asks questions, and links comments to what others said.'] } },
  { key: 'on_topic_talk', label: 'Stays on topic', group: 'Speaking & listening', standard: 'SL.{g}.1', levels: {
    k2: ['Talks about something else.', 'Stays on topic with reminders.', 'Stays on topic during the discussion.', 'Stays on topic and helps the partner stay on topic too.'],
    g35: ['Comments are off topic.', 'Drifts off topic; returns with prompting.', 'Stays on topic and follows the rules for discussion.', 'Keeps the discussion focused and moves it forward with relevant ideas.'] } },

  // ═══ Work habits ═══
  { key: 'independence', label: 'Independence and effort', group: 'Work habits', levels: {
    k2: ['Needs help with every step.', 'Starts with help and needs reminders to keep going.', 'Works on the task on their own and finishes.', 'Works independently, keeps trying when it is hard, and checks the work.'],
    g35: ['Does not start or complete the task without constant support.', 'Needs reminders to stay on task; work is partly complete.', 'Works independently and completes the task on time.', 'Self-directed and thorough; goes beyond what was asked.'] } },
]

export const TEMPLATES: RubricTemplate[] = [
  { key: 'opinion', name: 'Opinion paragraph', description: 'States an opinion and backs it up.', bands: ['k2', 'g35'], criteria: ['opinion', 'reasons', 'closing', 'sentences', 'capitalization', 'punctuation'] },
  { key: 'persuasive_letter', name: 'Persuasive letter', description: 'An opinion written as a letter.', bands: ['k2', 'g35'], criteria: ['letter_format', 'opinion', 'reasons', 'closing', 'sentences', 'punctuation'] },
  { key: 'narrative', name: 'Personal narrative', description: 'A true story from the writer’s life.', bands: ['k2', 'g35'], criteria: ['ideas', 'organization', 'sequence_words', 'voice', 'sentences', 'capitalization', 'punctuation'] },
  { key: 'retelling', name: 'Story retelling', description: 'Retells a story that was read, written or spoken.', bands: ['k2', 'g35'], criteria: ['retell', 'characters_setting', 'sequence_words', 'sentences'] },
  { key: 'informative', name: 'Informative report', description: 'Facts about a topic.', bands: ['k2', 'g35'], criteria: ['facts_details', 'organization', 'closing', 'word_choice', 'sentences', 'spelling'] },
  { key: 'how_to', name: 'How-to', description: 'Steps that teach the reader to do something.', bands: ['k2', 'g35'], criteria: ['sequence_words', 'organization', 'facts_details', 'sentences', 'punctuation'] },
  { key: 'friendly_letter', name: 'Friendly letter', description: 'A letter to someone the writer knows.', bands: ['k2', 'g35'], criteria: ['letter_format', 'ideas', 'voice', 'capitalization', 'punctuation'] },
  { key: 'reading_response', name: 'Reading response', description: 'Answers about a text, using the text.', bands: ['k2', 'g35'], criteria: ['text_evidence', 'ideas', 'sentences', 'spelling'] },
  { key: 'presentation', name: 'Oral presentation', description: 'Speaking to the class.', bands: ['k2', 'g35'], criteria: ['volume_clarity', 'presence', 'speaks_sentences', 'organization'] },
  { key: 'discussion', name: 'Partner discussion', description: 'Talking with a partner or group.', bands: ['k2', 'g35'], criteria: ['listening', 'on_topic_talk', 'speaks_sentences'] },
  { key: 'beginning_writer', name: 'Beginning writer', description: 'First sentences and stories.', bands: ['k2'], criteria: ['handwriting', 'capitalization', 'punctuation', 'spelling', 'sentences', 'ideas'] },
  { key: 'general_writing', name: 'General writing', description: 'Any piece of writing.', bands: ['k2', 'g35'], criteria: ['ideas', 'organization', 'sentences', 'capitalization', 'punctuation', 'spelling'] },
]

export function bandForGrade(grade: number): Band { return grade <= 2 ? 'k2' : 'g35' }
export function resolveStandard(code: string | undefined, grade: number): string | undefined {
  return code ? code.replace('{g}', grade === 0 ? 'K' : String(grade)) : undefined
}
export function criterionFor(key: string, band: Band, grade: number): RubricCriterion | null {
  const c = CRITERIA.find(x => x.key === key)
  if (!c) return null
  return { key: c.key, label: c.label, levels: c.levels[band], standard: resolveStandard(c.standard, grade) }
}
/** A template's criteria resolved for a grade, ready to score or to customise. */
export function buildFromTemplate(templateKey: string, grade: number): { name: string; task: string; band: Band; criteria: RubricCriterion[] } | null {
  const t = TEMPLATES.find(x => x.key === templateKey)
  if (!t) return null
  const band = bandForGrade(grade)
  return { name: t.name, task: t.key, band, criteria: t.criteria.map(k => criterionFor(k, band, grade)).filter(Boolean) as RubricCriterion[] }
}
/** Scaled score for a set of levels: N/A criteria are left out, and the rest are scaled to the assessment total. */
export function rubricScore(levels: Record<string, number>, criteriaCount: number, maxScore: number): number | null {
  const vals = Object.values(levels).filter(v => v > 0)
  if (vals.length === 0) return null
  const raw = vals.reduce((a, b) => a + b, 0)
  const possible = vals.length * 4
  void criteriaCount
  return Math.round((raw / possible) * maxScore * 100) / 100
}
