// ============================================================================
// GRADE 1 LEVEL TEST CONTENT — VERSIONED
// ============================================================================
// Scores are stored as answers keyed by question number alone -- {7:'b'} -- and
// per-word checkbox keys like `o_ph_seg_sun`. Nothing in a saved score records
// what Q7 actually was, or which word list was on screen. So this content must
// NEVER be edited in place once a test has been scored: every historical result
// would silently re-point at different questions, standards and passages.
//
// Instead each level test resolves to a content version keyed by its
// academic_year and semester, mirroring the registry in WrittenTestEntry.tsx.
// Tests created before versioning, and any test whose version has not been
// authored, fall back to LEGACY_VERSION -- the content in use to date.
//
// ── Adding a new Grade 1 test ─────────────────────────────────────────
//   1. Add new content constants below (never edit existing ones).
//   2. Assemble them into a G1Content object.
//   3. Register it under the matching `academic_year:semester` key.
//   The scoring screen shows which version it resolved to, so a fallback is
//   never invisible.
// ============================================================================

export type PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// ─── Shared shapes ───────────────────────────────────────────────────

export interface G1QuestionDef {
  qNum: number
  section: string
  sectionLabel: string
  text: string
  choices: string[]
  /** Positional: 'a' = choices[0], 'b' = choices[1], ... */
  correct: string
  standard: string
  standardDesc: string
  domain: string
  /**
   * 'text'     — the choices are the words/letters printed on the student page.
   * 'position' — the student page shows pictures; `choices` describe them and
   *              the teacher records which position was circled.
   */
  choiceStyle?: 'text' | 'position'
}

export interface G1WritingCategory {
  key: string
  label: string
  max: number
  standard: string
  standardDesc: string
  /**
   * 'ladder'    — pick the single highest row that describes the writing (0..max).
   * 'checklist' — independent features; the score is the number checked. Order
   *               does not matter and earlier boxes are not prerequisites.
   */
  kind: 'ladder' | 'checklist'
  /** Present when kind === 'checklist'. One entry per box, in display order. */
  checklist?: { key: string; label: string; desc: string }[]
}

export interface G1PhonemeProbe {
  /** Score key stored on the student's raw_scores. Must be unique per version. */
  key: string
  label: string
  answer: string
}

export interface G1PhonemeWord {
  word: string
  sounds: string[]
  soundCount: number
  probes: G1PhonemeProbe[]
}

export interface G1PassageConfig {
  label: string
  description: string
  /** Max raw score for levels scored by count rather than rate. Null for D-F. */
  orfMax: number | null
  hasCwpm: boolean
  hasNaep: boolean
  compQuestions: number
  compMax: number
  wordCount: number | null
  passageWeight: number
  /** Hint only — the teacher chooses the level and may re-test at another. */
  bumpUpThreshold?: number
  bumpDownThreshold?: number
}

export interface G1StandardBaseline {
  code: string
  domain: string
  gradeLevel: string // 'K' or '1'
  description: string
  testSection: string
  masteryThreshold: number
  alsoChecks?: string
}

export interface G1WrittenSection {
  key: string
  label: string
  shortLabel: string
  max: number
  standards: string[]
}

export interface G1RubricRow {
  score: number
  label: string
  desc: string
}

export interface G1Content {
  version: string
  label: string
  /**
   * 'two_wave'       — oral and written are administered about a month apart,
   *                    so a student legitimately sits at oral-only for weeks.
   * 'single_sitting' — both parts run in the same testing window, like grades
   *                    2-5. Oral-only is then just a partially-entered record.
   */
  administration: 'two_wave' | 'single_sitting'
  written: {
    questions: G1QuestionDef[]
    /** Number of multiple-choice points available. */
    mcMax: number
    sections: G1WrittenSection[]
    sectionKeys: string[]
  }
  /**
   * Short constructed-response item, scored on its own small rubric. Counted
   * with the multiple choice as "core written", not with extended writing,
   * because it is a sentence-completion task rather than a composition.
   */
  shortWriting: {
    prompt: string
    starters: string[]
    max: number
    rubric: G1RubricRow[]
    notes: string[]
    scoreKey: string
  } | null
  extendedWriting: {
    prompt: string
    categories: G1WritingCategory[]
    max: number
    /** Ladder descriptions keyed by category key, then score. */
    rubric: Record<string, Record<number, string>>
    notes: string[]
    bands: { min: number; max: number; label: string }[]
  }
  alphabet: {
    letters: string[]
    nameMax: number
    soundMax: number
    wordProbeMax: number
    total: number
  }
  phoneme: {
    /** Demonstrated by the teacher and explicitly not scored. */
    modelWord: { word: string; sounds: string[] } | null
    words: G1PhonemeWord[]
    max: number
    stoppingRule: string
    l1Note: string | null
  }
  levelA: {
    questions: { q: string; prompt: string }[]
    rubric: G1RubricRow[]
    max: number
    /** 'holistic' — one rating for the whole interview. */
    mode: 'per_question' | 'holistic'
  }
  levelB: { words: string[]; max: number }
  levelC: { sentences: { text: string; words: string[] }[]; max: number }
  passages: Record<string, { title: string; text: string; wordCount: number }>
  passageConfigs: Record<PassageLevel, G1PassageConfig>
  compQuestions: Record<string, { q: string; dok: string }[]>
  compScoringExamples: Record<string, string[][]>
  openResponse: { max: number; rubric: G1RubricRow[]; instructions: string }
  standards: G1StandardBaseline[]
  /** Surfaced on the entry screens as administration cautions. */
  adminNotes: string[]
  timing: {
    /** Seconds after which a clearly struggling reader is stopped. */
    struggleStopSeconds: number
    /** Hard ceiling; never sit longer than this on one passage. */
    ceilingSeconds: number
    note: string
  }
}

// ============================================================================
// LEGACY CONTENT — original Spring 2026 Grade 1 test
// ============================================================================
// Do not edit. Existing scores are interpreted against exactly these values.

const LEGACY_WRITTEN_SECTIONS: G1WrittenSection[] = [
  { key: 'w_letter_names', label: 'Letter Names', shortLabel: 'LN', max: 5, standards: ['RF.K.1d'] },
  { key: 'w_letter_sounds', label: 'Letter Sounds', shortLabel: 'LS', max: 5, standards: ['RF.K.3a'] },
  { key: 'w_word_picture', label: 'Word-Picture', shortLabel: 'WP', max: 10, standards: ['RF.K.3c', 'RF.1.3g'] },
  { key: 'w_passage_comp', label: 'Passage Comp', shortLabel: 'PC', max: 5, standards: ['RL.K.1', 'SL.K.2'] },
  { key: 'w_writing', label: 'Writing', shortLabel: 'Wr', max: 5, standards: ['W.K.2', 'W.1.2'] },
]

const LEGACY_QUESTIONS: G1QuestionDef[] = [
  // Letter Names (Q1-5)
  { qNum: 1, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Circle the correct letter', choices: ['A', 'E', 'I', 'U'], correct: 'c', standard: 'RF.K.1d', standardDesc: 'Recognize upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 2, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Circle the correct letter', choices: ['B', 'd', 'b', 'P'], correct: 'b', standard: 'RF.K.1d', standardDesc: 'Recognize upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 3, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Circle the correct letter', choices: ['I', 'e', 'O', 'a'], correct: 'c', standard: 'RF.K.1d', standardDesc: 'Recognize upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 4, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Circle the correct letter', choices: ['W', 's', 'X', 'V'], correct: 'a', standard: 'RF.K.1d', standardDesc: 'Recognize upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 5, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Circle the correct letter', choices: ['t', 'A', 'O', 'E'], correct: 'd', standard: 'RF.K.1d', standardDesc: 'Recognize upper/lowercase letters', domain: 'Letter Names' },
  // Letter Sounds (Q6-10)
  { qNum: 6, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Circle the correct sound', choices: ['s', 'T', 'd', 'z'], correct: 'b', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences', domain: 'Letter Sounds' },
  { qNum: 7, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Circle the correct sound', choices: ['f', 'p', 'n', 'R'], correct: 'a', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences', domain: 'Letter Sounds' },
  { qNum: 8, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Circle the correct sound', choices: ['D', 'B', 'c', 'S'], correct: 'b', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences', domain: 'Letter Sounds' },
  { qNum: 9, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Circle the correct sound', choices: ['F', 'P', 'd', 'q'], correct: 'd', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences', domain: 'Letter Sounds' },
  { qNum: 10, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Circle the correct sound', choices: ['m', 'N', 'L', 'r'], correct: 'c', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences', domain: 'Letter Sounds' },
  // Word-Picture Match (Q11-20) — 3 choices each
  { qNum: 11, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['red', 'had', 'led'], correct: 'a', standard: 'RF.K.3c', standardDesc: 'Read common high-frequency words', domain: 'Word-Picture' },
  { qNum: 12, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['ran', 'did', 'man'], correct: 'c', standard: 'RF.K.3c', standardDesc: 'Read common high-frequency words', domain: 'Word-Picture' },
  { qNum: 13, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['see', 'tree', 'three'], correct: 'b', standard: 'RF.1.3g', standardDesc: 'Recognize common irregularly spelled words', domain: 'Word-Picture' },
  { qNum: 14, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['eat', 'lite', 'light'], correct: 'c', standard: 'RF.1.3g', standardDesc: 'Recognize common irregularly spelled words', domain: 'Word-Picture' },
  { qNum: 15, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['play', 'pay', 'day'], correct: 'a', standard: 'RF.K.3c', standardDesc: 'Read common high-frequency words', domain: 'Word-Picture' },
  { qNum: 16, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['hold', 'call', 'old'], correct: 'c', standard: 'RF.K.3c', standardDesc: 'Read common high-frequency words', domain: 'Word-Picture' },
  { qNum: 17, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['draw', 'ring', 'drink'], correct: 'b', standard: 'RF.1.3g', standardDesc: 'Recognize common irregularly spelled words', domain: 'Word-Picture' },
  { qNum: 18, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['first', 'grow', 'girl'], correct: 'c', standard: 'RF.1.3g', standardDesc: 'Recognize common irregularly spelled words', domain: 'Word-Picture' },
  { qNum: 19, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['walk', 'work', 'warm'], correct: 'a', standard: 'RF.K.3c', standardDesc: 'Read common high-frequency words', domain: 'Word-Picture' },
  { qNum: 20, section: 'word_picture', sectionLabel: 'Word-Picture Match', text: 'Match the picture', choices: ['sleep', 'feet', 'five'], correct: 'b', standard: 'RF.1.3g', standardDesc: 'Recognize common irregularly spelled words', domain: 'Word-Picture' },
  // Passage Comprehension "My Bag" (Q21-25)
  { qNum: 21, section: 'passage_comp', sectionLabel: 'Passage: "My Bag"', text: 'How many books are in the bag?', choices: ['1', '2', '3', '4'], correct: 'c', standard: 'RL.K.1', standardDesc: 'Key details in text', domain: 'Passage Comp' },
  { qNum: 22, section: 'passage_comp', sectionLabel: 'Passage: "My Bag"', text: 'What color is the pencil case?', choices: ['blue', 'red', 'yellow'], correct: 'c', standard: 'RL.K.1', standardDesc: 'Key details in text', domain: 'Passage Comp' },
  { qNum: 23, section: 'passage_comp', sectionLabel: 'Passage: "My Bag"', text: 'What shape is on the bag?', choices: ['square', 'circle', 'triangle'], correct: 'b', standard: 'SL.K.2', standardDesc: 'Key ideas from text read aloud', domain: 'Passage Comp' },
  { qNum: 24, section: 'passage_comp', sectionLabel: 'Passage: "My Bag"', text: 'Is there a red book?', choices: ['Yes, there is.', 'No, there isn\'t.'], correct: 'a', standard: 'RL.K.1', standardDesc: 'Key details in text', domain: 'Passage Comp' },
  { qNum: 25, section: 'passage_comp', sectionLabel: 'Passage: "My Bag"', text: 'Is the circle pink?', choices: ['Yes, it is.', 'No, it isn\'t.'], correct: 'a', standard: 'SL.K.2', standardDesc: 'Key ideas from text read aloud', domain: 'Passage Comp' },
]

const LEGACY_WRITING_CATEGORIES: G1WritingCategory[] = [
  { key: 'completeness', label: 'Completeness', max: 5, standard: 'W.K.2', standardDesc: 'Informative writing: name topic, supply detail', kind: 'ladder' },
  { key: 'content', label: 'Content & Vocabulary', max: 5, standard: 'W.K.2', standardDesc: 'Use words to supply information about topic', kind: 'ladder' },
  { key: 'sentence_structure', label: 'Sentence Structure', max: 5, standard: 'L.K.1f', standardDesc: 'Produce complete sentences', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 5, standard: 'L.K.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
]

const LEGACY_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  completeness: {
    0: 'Blank, draws pictures, or writes in Korean only',
    1: 'Draws pictures or writes 1-2 English letters',
    2: 'Writes 1-3 English words (any spelling)',
    3: 'Writes a phrase or short sentence',
    4: '2-3 sentences about bag contents',
    5: '4+ sentences with detail about the bag',
  },
  content: {
    0: 'No English content about the bag',
    1: 'Copies words from the passage only',
    2: '1-2 own words related to bag items',
    3: 'Uses colors, numbers, or items from bag',
    4: 'Describes multiple items with detail',
    5: 'Rich description with adjectives, numbers, colors combined',
  },
  sentence_structure: {
    0: 'No attempt at English writing',
    1: 'Letter strings or single isolated words',
    2: '2+ words together but no verb',
    3: 'Simple "I see ___" pattern',
    4: 'Varied sentence starts or compound ideas',
    5: 'Multiple sentence types with connecting words',
  },
  mechanics: {
    0: 'No recognizable English letters',
    1: 'Letter-like forms or random letters',
    2: 'Some correctly formed letters, L-R directionality',
    3: 'Spaces between words visible',
    4: 'Capitals and periods attempted',
    5: 'Consistent caps, periods, mostly correct spelling',
  },
}

const LEGACY_ALPHABET_LETTERS = ['s', 'a', 't', 'm', 'p', 'i', 'n', 'd', 'o', 'g', 'c', 'e', 'k', 'j', 'x', 'y']

const LEGACY_PHONEME_WORDS: G1PhonemeWord[] = [
  {
    word: 'sun', sounds: ['/s/', '/u/', '/n/'], soundCount: 3,
    probes: [
      { key: 'o_ph_seg_sun', label: 'Can segment', answer: '/s/ - /u/ - /n/' },
      { key: 'o_ph_count_sun', label: 'Correct # of sounds', answer: '3 sounds' },
      { key: 'o_ph_bme_sun_b', label: 'Beginning sound', answer: '/s/' },
      { key: 'o_ph_bme_sun_m', label: 'Middle sound', answer: '/u/' },
      { key: 'o_ph_bme_sun_e', label: 'Ending sound', answer: '/n/' },
    ],
  },
  {
    word: 'map', sounds: ['/m/', '/a/', '/p/'], soundCount: 3,
    probes: [
      { key: 'o_ph_seg_map', label: 'Can segment', answer: '/m/ - /a/ - /p/' },
      { key: 'o_ph_count_map', label: 'Correct # of sounds', answer: '3 sounds' },
      { key: 'o_ph_bme_map_b', label: 'Beginning sound', answer: '/m/' },
      { key: 'o_ph_bme_map_m', label: 'Middle sound', answer: '/a/' },
      { key: 'o_ph_bme_map_e', label: 'Ending sound', answer: '/p/' },
    ],
  },
  {
    word: 'leg', sounds: ['/l/', '/e/', '/g/'], soundCount: 3,
    probes: [
      { key: 'o_ph_seg_leg', label: 'Can segment', answer: '/l/ - /e/ - /g/' },
      { key: 'o_ph_count_leg', label: 'Correct # of sounds', answer: '3 sounds' },
      { key: 'o_ph_bme_leg_b', label: 'Beginning sound', answer: '/l/' },
      { key: 'o_ph_bme_leg_m', label: 'Middle sound', answer: '/e/' },
      { key: 'o_ph_bme_leg_e', label: 'Ending sound', answer: '/g/' },
    ],
  },
  {
    word: 'fish', sounds: ['/f/', '/i/', '/sh/'], soundCount: 3,
    probes: [
      { key: 'o_ph_seg_fish', label: 'Can segment', answer: '/f/ - /i/ - /sh/' },
      { key: 'o_ph_count_fish', label: 'Correct # of sounds', answer: '3 sounds' },
      { key: 'o_ph_bme_fish_b', label: 'Beginning sound', answer: '/f/' },
      { key: 'o_ph_bme_fish_m', label: 'Middle sound', answer: '/i/' },
      { key: 'o_ph_bme_fish_e', label: 'Ending sound', answer: '/sh/' },
    ],
  },
]

const LEGACY_LEVEL_A_QUESTIONS = [
  { q: 'What is your name?', prompt: 'Say: "What is your name?"' },
  { q: 'How old are you?', prompt: 'Say: "How old are you?"' },
  { q: 'Who is in your family?', prompt: 'Say: "Who is in your family?"' },
  { q: 'What color do you like?', prompt: 'Say: "What color do you like?"' },
  { q: 'What animal do you like?', prompt: 'Say: "What animal do you like?"' },
]

const LEGACY_LEVEL_A_RUBRIC: G1RubricRow[] = [
  { score: 0, label: 'No response', desc: 'No response. Does not attempt English.' },
  { score: 1, label: 'Korean only', desc: 'Responds in Korean only, or single English word with heavy prompting.' },
  { score: 2, label: 'Single words', desc: 'Produces single English words independently (e.g., "seven," "blue," "dog").' },
  { score: 3, label: 'Phrases', desc: 'Produces English phrases or simple sentences (e.g., "I like blue," "my mom, my dad").' },
  { score: 4, label: 'Full sentences', desc: 'Produces full English sentences with some detail (e.g., "My name is Mina. I am seven years old. I like cats.").' },
]

const LEGACY_LEVEL_B_WORDS = ['I', 'a', 'the', 'is', 'my', 'see', 'can', 'go', 'it', 'big', 'like', 'and', 'we', 'to', 'you', 'she', 'he', 'was', 'are', 'have']

const LEGACY_LEVEL_C_SENTENCES = [
  { text: 'I see a cat.', words: ['I', 'see', 'a', 'cat.'] },
  { text: 'The dog is big.', words: ['The', 'dog', 'is', 'big.'] },
  { text: 'I can run.', words: ['I', 'can', 'run.'] },
]

const LEGACY_PASSAGES: Record<string, { title: string; text: string; wordCount: number }> = {
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

const LEGACY_PASSAGE_CONFIGS: Record<PassageLevel, G1PassageConfig> = {
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

const LEGACY_COMP_QUESTIONS: Record<string, { q: string; dok: string }[]> = {
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

const LEGACY_COMP_SCORING_EXAMPLES: Record<string, string[][]> = {
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

const LEGACY_OPEN_RESPONSE_RUBRIC: G1RubricRow[] = [
  { score: 0, label: 'No response', desc: 'Silent or says "I don\'t know."' },
  { score: 1, label: 'Korean only', desc: 'Needs questions in Korean OR responds only in Korean.' },
  { score: 2, label: 'Single words', desc: 'Produces isolated English words.' },
  { score: 3, label: 'Phrases', desc: 'Produces English phrases.' },
  { score: 4, label: 'Simple sentences', desc: 'Produces simple sentences.' },
  { score: 5, label: 'Extended response', desc: 'Multiple sentences with details. Uses connecting words.' },
]

const LEGACY_STANDARDS: G1StandardBaseline[] = [
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

const LEGACY_CONTENT: G1Content = {
  version: 'legacy',
  label: 'Original test',
  administration: 'two_wave',
  written: {
    questions: LEGACY_QUESTIONS,
    mcMax: 25,
    sections: LEGACY_WRITTEN_SECTIONS,
    sectionKeys: ['letter_names', 'letter_sounds', 'word_picture', 'passage_comp'],
  },
  shortWriting: null,
  extendedWriting: {
    prompt: 'Write about your bag.',
    categories: LEGACY_WRITING_CATEGORIES,
    max: 20,
    rubric: LEGACY_WRITING_RUBRIC,
    notes: [],
    bands: [
      { min: 0, max: 5, label: 'Emerging' },
      { min: 6, max: 10, label: 'Developing' },
      { min: 11, max: 15, label: 'Proficient' },
      { min: 16, max: 20, label: 'Advanced' },
    ],
  },
  alphabet: { letters: LEGACY_ALPHABET_LETTERS, nameMax: 16, soundMax: 16, wordProbeMax: 5, total: 37 },
  phoneme: {
    modelWord: null,
    words: LEGACY_PHONEME_WORDS,
    max: 20,
    stoppingRule: 'If student cannot segment "sun" after one model, record 0.',
    l1Note: null,
  },
  levelA: {
    questions: LEGACY_LEVEL_A_QUESTIONS,
    rubric: LEGACY_LEVEL_A_RUBRIC,
    max: 20,
    mode: 'per_question',
  },
  levelB: { words: LEGACY_LEVEL_B_WORDS, max: 20 },
  levelC: { sentences: LEGACY_LEVEL_C_SENTENCES, max: 11 },
  passages: LEGACY_PASSAGES,
  passageConfigs: LEGACY_PASSAGE_CONFIGS,
  compQuestions: LEGACY_COMP_QUESTIONS,
  compScoringExamples: LEGACY_COMP_SCORING_EXAMPLES,
  openResponse: {
    max: 5,
    rubric: LEGACY_OPEN_RESPONSE_RUBRIC,
    instructions: 'Show the student the two pictures. Ask what is the same and what is different.',
  },
  standards: LEGACY_STANDARDS,
  adminNotes: [],
  timing: {
    struggleStopSeconds: 60,
    ceilingSeconds: 60,
    note: 'Hard stop at 60 seconds for every student.',
  },
}

// ============================================================================
// FALL 2026 CONTENT — revised Grade 1 test
// ============================================================================
// Source: "Grade 1 Level Test — Fall 2026, Teacher's Guide (Revised Edition)"
// plus the Oral and Written student copies. Written total 42 pts
// (19 MC + 3 short writing + 20 extended writing).

const F26_WRITTEN_SECTIONS: G1WrittenSection[] = [
  { key: 'w_letter_names', label: 'Letter Names', shortLabel: 'LN', max: 5, standards: ['RF.K.1d'] },
  { key: 'w_letter_sounds', label: 'Letter Sounds', shortLabel: 'LS', max: 5, standards: ['RF.K.3a'] },
  { key: 'w_picture_match', label: 'Picture Match', shortLabel: 'PM', max: 5, standards: ['SL.1.2', 'L.K.5c'] },
  { key: 'w_story_comp', label: 'Story Comp', shortLabel: 'SC', max: 4, standards: ['RL.K.1', 'SL.K.2'] },
  { key: 'w_short_writing', label: 'Short Writing', shortLabel: 'SW', max: 3, standards: ['W.K.2', 'L.K.2d'] },
  // w_writing is the 0-5 compatibility field derived from the 20-point extended
  // writing rubric, not the rubric total itself. Standards read it on this scale.
  { key: 'w_writing', label: 'Writing', shortLabel: 'Wr', max: 5, standards: ['W.1.2', 'L.1.1', 'L.1.2'] },
]

const F26_QUESTIONS: G1QuestionDef[] = [
  // Items 1-5 — Listening: letter NAMES. Teacher says the name twice.
  { qNum: 1, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Teacher says: "E"', choices: ['A', 'E', 'I', 'U'], correct: 'b', standard: 'RF.K.1d', standardDesc: 'Recognize and name upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 2, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Teacher says: "P"', choices: ['B', 'd', 'b', 'P'], correct: 'd', standard: 'RF.K.1d', standardDesc: 'Recognize and name upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 3, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Teacher says: "a"', choices: ['I', 'e', 'O', 'a'], correct: 'd', standard: 'RF.K.1d', standardDesc: 'Recognize and name upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 4, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Teacher says: "V"', choices: ['W', 's', 'X', 'V'], correct: 'd', standard: 'RF.K.1d', standardDesc: 'Recognize and name upper/lowercase letters', domain: 'Letter Names' },
  { qNum: 5, section: 'letter_names', sectionLabel: 'Letter Names', text: 'Teacher says: "t"', choices: ['t', 'A', 'O', 'E'], correct: 'a', standard: 'RF.K.1d', standardDesc: 'Recognize and name upper/lowercase letters', domain: 'Letter Names' },
  // Items 6-10 — Listening: letter SOUNDS. Teacher says the sound, not the name.
  { qNum: 6, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Teacher says: /s/', choices: ['s', 'T', 'd', 'z'], correct: 'a', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences for consonants', domain: 'Letter Sounds' },
  { qNum: 7, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Teacher says: /r/', choices: ['f', 'p', 'n', 'R'], correct: 'd', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences for consonants', domain: 'Letter Sounds' },
  { qNum: 8, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Teacher says: /b/', choices: ['D', 'B', 'c', 'S'], correct: 'b', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences for consonants', domain: 'Letter Sounds' },
  { qNum: 9, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Teacher says: /f/', choices: ['F', 'P', 'd', 'q'], correct: 'a', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences for consonants', domain: 'Letter Sounds' },
  { qNum: 10, section: 'letter_sounds', sectionLabel: 'Letter Sounds', text: 'Teacher says: /l/', choices: ['m', 'N', 'L', 'r'], correct: 'c', standard: 'RF.K.3a', standardDesc: 'Letter-sound correspondences for consonants', domain: 'Letter Sounds' },
  // Items 11-15 — Listening: circle the PICTURE that matches. Student page has
  // no letters, so record the position the student circled.
  { qNum: 11, section: 'picture_match', sectionLabel: 'Picture Match', text: '"He is reading a book."', choices: ['Man on bench (left)', 'Man reading under tree (middle)', 'Man drinking (right)'], correct: 'b', standard: 'SL.1.2', standardDesc: 'Answer questions about key details in a text read aloud', domain: 'Picture Match', choiceStyle: 'position' },
  { qNum: 12, section: 'picture_match', sectionLabel: 'Picture Match', text: '"It is under the chair."', choices: ['Turtle under orange chair (left)', 'Turtle on table (middle)', 'Turtle in boat (right)'], correct: 'a', standard: 'SL.1.2', standardDesc: 'Answer questions about key details in a text read aloud', domain: 'Picture Match', choiceStyle: 'position' },
  { qNum: 13, section: 'picture_match', sectionLabel: 'Picture Match', text: '"It\'s a square."', choices: ['Blue circle (left)', 'Green triangle (middle)', 'Orange square (right)'], correct: 'c', standard: 'L.K.5c', standardDesc: 'Real-life connections between words and their use', domain: 'Picture Match', choiceStyle: 'position' },
  { qNum: 14, section: 'picture_match', sectionLabel: 'Picture Match', text: '"Grandma is sleeping."', choices: ['Grandma in bed (left)', 'Grandma gardening (middle)', 'Grandma washing (right)'], correct: 'a', standard: 'SL.1.2', standardDesc: 'Answer questions about key details in a text read aloud', domain: 'Picture Match', choiceStyle: 'position' },
  { qNum: 15, section: 'picture_match', sectionLabel: 'Picture Match', text: '"He is swimming."', choices: ['Boy swimming (left)', 'Boy building snowman (middle)', 'Boy reading (right)'], correct: 'a', standard: 'SL.1.2', standardDesc: 'Answer questions about key details in a text read aloud', domain: 'Picture Match', choiceStyle: 'position' },
  // Items 16-19 — Listening: story "My Book", read twice. Choices printed a/b/c.
  { qNum: 16, section: 'story_comp', sectionLabel: 'Story: "My Book"', text: 'How many animals are in the book?', choices: ['2', '3', '4'], correct: 'c', standard: 'RL.K.1', standardDesc: 'Ask and answer questions about key details', domain: 'Story Comp' },
  { qNum: 17, section: 'story_comp', sectionLabel: 'Story: "My Book"', text: 'What color is the bunny?', choices: ['It is white.', 'It is soft.', 'It is green.'], correct: 'a', standard: 'RL.K.1', standardDesc: 'Ask and answer questions about key details', domain: 'Story Comp' },
  { qNum: 18, section: 'story_comp', sectionLabel: 'Story: "My Book"', text: 'Which animal is gray?', choices: ['The elephant', 'The mice', 'The bunny'], correct: 'a', standard: 'SL.K.2', standardDesc: 'Confirm understanding of a text read aloud', domain: 'Story Comp' },
  { qNum: 19, section: 'story_comp', sectionLabel: 'Story: "My Book"', text: 'Is there one mouse?', choices: ['Yes, there is one mouse.', 'No, there are two mouse.', 'No, there are two mice.'], correct: 'c', standard: 'SL.K.2', standardDesc: 'Confirm understanding of a text read aloud', domain: 'Story Comp' },
]

const F26_SHORT_WRITING_RUBRIC: G1RubricRow[] = [
  { score: 0, label: 'No English added', desc: 'Blank, Korean only, a drawing only, or the gray starters traced/copied with nothing added.' },
  { score: 1, label: 'One starter finished', desc: 'One starter is completed with a real English word. ("I like dog.")' },
  { score: 2, label: 'Both starters finished', desc: 'Both starters are completed with real English words — an animal is named and something is said about it. ("I like a cat. It is white.")' },
  { score: 3, label: 'Full sentences written out', desc: 'Everything in 2, and both sentences are written out in full on the lines (starter copied), each beginning with a capital letter and ending with a period.' },
]

const F26_WRITING_CATEGORIES: G1WritingCategory[] = [
  { key: 'completeness', label: 'Completeness', max: 5, standard: 'W.1.2', standardDesc: 'How much on-task writing', kind: 'ladder' },
  {
    key: 'content', label: 'Content and Detail', max: 5, standard: 'W.1.2', standardDesc: 'Ideas in the writing',
    kind: 'checklist',
    checklist: [
      { key: 'names_things', label: 'Names things', desc: 'Names at least two different things that are in the picture (snowman, kids, snow, hat, carrot, house, tree, scarf).' },
      { key: 'action', label: 'Action', desc: 'Says what a person or thing is doing (building, playing, wearing, standing, snowing).' },
      { key: 'description', label: 'Description', desc: 'Attaches at least one describing word to something — color, size, number, weather, or clothing (big snowman, red coat, two kids, cold day).' },
      { key: 'beyond_picture', label: 'Beyond the picture', desc: 'Adds something that cannot be seen in the picture — feelings, dialogue, character names, what happened before or after.' },
      { key: 'story_shape', label: 'Story shape', desc: 'The sentences form one event with a beginning and some kind of ending, rather than a list of separate observations.' },
    ],
  },
  { key: 'language_grammar', label: 'Language and Grammar', max: 5, standard: 'L.1.1', standardDesc: 'Sentence variety and agreement', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 5, standard: 'L.1.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
]

const F26_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  completeness: {
    0: 'Blank, or unrelated to the picture.',
    1: 'Single words or a list of nouns.',
    2: 'One sentence.',
    3: 'Two to three sentences.',
    4: 'Four to five sentences.',
    5: 'Six or more sentences that read as one connected story.',
  },
  language_grammar: {
    0: 'Nothing readable.',
    1: 'Isolated words; no sentence formed.',
    2: 'One repeated sentence pattern, with errors.',
    3: 'Simple sentences; subject and verb mostly agree (The boy make a snowman).',
    4: 'Varied sentences; uses connecting words (and, then, because); verbs, plurals, and articles mostly correct.',
    5: 'Clear, varied sentences. Any remaining errors never block meaning.',
  },
  mechanics: {
    0: 'Nothing legible.',
    1: 'Letters or words run together; cannot be read.',
    2: 'A few capitals or periods; spacing between words is inconsistent.',
    3: 'Most sentences start with a capital and end with a period; common words spelled correctly.',
    4: 'Nearly all capitals, periods, and word spacing are correct.',
    5: 'All correct, including capital I and any names.',
  },
}

const F26_ALPHABET_LETTERS = ['n', 'o', 'T', 'c', 'I', 'd', 'y', 'A', 'P', 'x', 'e', 'S', 'k', 'g', 'J', 'M']

const F26_PHONEME_WORDS: G1PhonemeWord[] = [
  {
    word: 'cup', sounds: ['/c/', '/u/', '/p/'], soundCount: 3,
    probes: [
      { key: 'o_ph26_seg_cup', label: 'Say each sound. Push a counter for each sound.', answer: 'c / u / p' },
      { key: 'o_ph26_count_cup', label: 'How many sounds?', answer: '3' },
      { key: 'o_ph26_first_cup', label: 'What is the first sound?', answer: '/c/' },
    ],
  },
  {
    word: 'frog', sounds: ['/f/', '/r/', '/o/', '/g/'], soundCount: 4,
    probes: [
      { key: 'o_ph26_seg_frog', label: 'Say each sound. Push a counter for each sound.', answer: 'f / r / o / g' },
      { key: 'o_ph26_count_frog', label: 'How many sounds?', answer: '4' },
      { key: 'o_ph26_last_frog', label: 'What is the last sound?', answer: '/g/' },
    ],
  },
  {
    word: 'nest', sounds: ['/n/', '/e/', '/s/', '/t/'], soundCount: 4,
    probes: [
      { key: 'o_ph26_seg_nest', label: 'Say each sound. Push a counter for each sound.', answer: 'n / e / s / t' },
      { key: 'o_ph26_count_nest', label: 'How many sounds?', answer: '4' },
      { key: 'o_ph26_first_nest', label: 'What is the beginning sound?', answer: '/n/' },
    ],
  },
  {
    word: 'dash', sounds: ['/d/', '/a/', '/sh/'], soundCount: 3,
    probes: [
      { key: 'o_ph26_seg_dash', label: 'Say each sound. Push a counter for each sound.', answer: 'd / a / sh' },
      { key: 'o_ph26_count_dash', label: 'How many sounds?', answer: '3' },
      { key: 'o_ph26_last_dash', label: 'What is the last sound?', answer: '/sh/' },
    ],
  },
]

const F26_LEVEL_A_RUBRIC: G1RubricRow[] = [
  { score: 0, label: 'No response', desc: 'No response. Does not attempt English.' },
  { score: 1, label: 'Korean only', desc: 'Responds in Korean only, or single English word with heavy prompting.' },
  { score: 2, label: 'Single words', desc: 'Produces single English words independently (e.g., "seven," "blue," "dog").' },
  { score: 3, label: 'Phrases', desc: 'Produces English phrases or simple sentences (e.g., "I like blue," "my mom, my dad").' },
  { score: 4, label: 'Full sentences', desc: 'Produces full English sentences with some detail (e.g., "My name is Mina. I am seven years old. I like cats.").' },
]

const F26_LEVEL_B_WORDS = [
  'the', 'to', 'and', 'a', 'I', 'you', 'he', 'was', 'that', 'she',
  'but', 'of', 'his', 'some', 'were', 'an', 'very', 'their', 'before', 'goes',
  'both', 'if', 'today', 'small', 'together', 'try', 'show', 'done', 'far',
]

const F26_LEVEL_C_SENTENCES = [
  { text: 'Pat jogs in the hot sun.', words: ['Pat', 'jogs', 'in', 'the', 'hot', 'sun.'] },
  { text: 'A man got on a big jet.', words: ['A', 'man', 'got', 'on', 'a', 'big', 'jet.'] },
  { text: 'The rich man had a big dish.', words: ['The', 'rich', 'man', 'had', 'a', 'big', 'dish.'] },
  { text: 'Why did she cry?', words: ['Why', 'did', 'she', 'cry?'] },
  { text: 'James baked a fine white cake.', words: ['James', 'baked', 'a', 'fine', 'white', 'cake.'] },
]

const F26_PASSAGES: Record<string, { title: string; text: string; wordCount: number }> = {
  D: {
    title: 'My Dog',
    text: 'I have a pet. The dog is brown. The dog can run. The dog can jump. The dog is fun. I like my dog.',
    wordCount: 24,
  },
  E: {
    title: 'My Birthday',
    text: 'Today is my birthday. My friends come to my house to play. We have a big cake. The cake is chocolate. I open my presents. I get a new toy car. I get a soft blue ball. I blow out five candles. Everyone sings and claps loudly. My birthday is the best day.',
    wordCount: 53,
  },
  F: {
    title: 'The Sandcastle',
    text: 'Ben went to the beach with his dad. The sand was warm and soft. "Let\'s build a sandcastle," said Dad. They dug and dug with their hands. Ben found a small shell. "Look what I found!" said Ben. They built three tall towers. A big wave came close. "Quick, add more sand!" said Dad. They finished in time. Ben smiled at their castle. "This is the best day," said Ben.',
    wordCount: 70,
  },
}

const F26_PASSAGE_CONFIGS: Record<PassageLevel, G1PassageConfig> = {
  A: {
    label: 'Level A: Oral Interview',
    description: 'For students with little or no English. Ask the five questions, then give ONE holistic rating for the whole interview.',
    orfMax: 4, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: null, passageWeight: 0, bumpUpThreshold: 3,
  },
  B: {
    label: 'Level B: HF Word List (29 words)',
    description: '29 high-frequency words. Student reads each word aloud. 1 pt per correct word; self-corrections count as correct.',
    orfMax: 29, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: 29, passageWeight: 0, bumpUpThreshold: 22, bumpDownThreshold: 0,
  },
  C: {
    label: 'Level C: Simple Sentences (30 words)',
    description: '5 simple sentences, 30 words total. 1 pt per word read correctly. No CWPM, no comprehension, no NAEP rating.',
    orfMax: 30, hasCwpm: false, hasNaep: false, compQuestions: 0, compMax: 0,
    wordCount: 30, passageWeight: 0, bumpUpThreshold: 27, bumpDownThreshold: 0,
  },
  D: {
    label: 'Level D: "My Dog" (24 words)',
    description: 'Short decodable passage. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 4, compMax: 8,
    wordCount: 24, passageWeight: 1.1, bumpDownThreshold: 10,
  },
  E: {
    label: 'Level E: "My Birthday" (53 words)',
    description: 'Narrative passage. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 5, compMax: 10,
    wordCount: 53, passageWeight: 1.2, bumpDownThreshold: 10,
  },
  F: {
    label: 'Level F: "The Sandcastle" (70 words)',
    description: 'Longer narrative with dialogue. Timed reading with CWPM + comprehension.',
    orfMax: null, hasCwpm: true, hasNaep: true, compQuestions: 5, compMax: 10,
    wordCount: 70, passageWeight: 1.3, bumpDownThreshold: 10,
  },
}

const F26_COMP_QUESTIONS: Record<string, { q: string; dok: string }[]> = {
  D: [
    { q: 'What pet do they have?', dok: 'DOK 1' },
    { q: 'What can the dog do?', dok: 'DOK 1' },
    { q: 'Can the dog swim?', dok: 'DOK 2' },
    { q: 'If you had a pet, what would it be? Why?', dok: 'Oral Production' },
  ],
  E: [
    { q: 'What kind of cake do they have?', dok: 'DOK 1' },
    { q: 'What two presents do they get?', dok: 'DOK 1' },
    { q: 'Why does everyone sing?', dok: 'DOK 2' },
    { q: 'How do you think the birthday child feels? Why?', dok: 'DOK 2' },
    { q: 'What would you want for YOUR birthday? Why?', dok: 'Oral Production' },
  ],
  F: [
    { q: 'What did they build?', dok: 'DOK 1' },
    { q: 'What did Ben find?', dok: 'DOK 1' },
    { q: 'How did they feel when the big wave came close? How did they feel after?', dok: 'DOK 2' },
    { q: 'Why did Ben say it was the best day?', dok: 'DOK 2' },
    { q: 'What do you like to do at the beach? Why?', dok: 'Oral Production' },
  ],
}

const F26_COMP_SCORING_EXAMPLES: Record<string, string[][]> = {
  D: [
    ['No response / wrong', 'Partial (e.g., "animal" but not "dog")', 'A dog'],
    ['No response / wrong', 'Names one (run OR jump)', 'Names both (run and jump)'],
    ['No response / wrong', '"No" without explanation', 'No, with any reference to the text (e.g., "it says run and jump, not swim")'],
    ['No response', 'Names a pet but no reason', 'Names a pet with a reason'],
  ],
  E: [
    ['No response / wrong', 'Partial ("cake," no flavor)', 'Chocolate'],
    ['No response / wrong', 'Names one (toy car OR ball)', 'Names both'],
    ['No response / wrong', 'Generic ("it\'s fun")', 'Connects to text (it\'s a birthday tradition / because of the cake and candles)'],
    ['No response / wrong', 'Names a feeling, no reason', 'Names a feeling with a reason (happy/excited — got presents, friends came)'],
    ['No response', 'Names an item, no reason', 'Names an item with a reason'],
  ],
  F: [
    ['Wrong', 'Partial ("something")', 'A sandcastle'],
    ['Wrong', 'Partial ("something")', 'A shell'],
    ['Wrong', 'Names one feeling only', 'Names both (worried/nervous at first, happy/proud after)'],
    ['Wrong', 'Generic ("it was fun")', 'Connects to text (built a sandcastle with dad, found a shell, saved it from the wave)'],
    ['No response', 'Names something, no reason', 'Names something with a reason'],
  ],
}

const F26_OPEN_RESPONSE_RUBRIC: G1RubricRow[] = [
  { score: 0, label: 'No response', desc: 'Silent or says "I don\'t know."' },
  { score: 1, label: 'Korean only', desc: 'Needs questions in Korean OR responds only in Korean.' },
  { score: 2, label: 'Single words', desc: 'Produces isolated English words: "boy," "pizza," "hat."' },
  { score: 3, label: 'Phrases', desc: 'Produces English phrases: "this hat this no hat," "here picture is two here is three."' },
  { score: 4, label: 'Simple sentences', desc: 'Produces simple sentences: "The kids are at a restaurant. They are eating pizza. There is no cake here. They aren\'t wearing hats."' },
  { score: 5, label: 'Extended response', desc: 'Produces multiple sentences with interesting details. Uses connecting words. Able to compare and contrast.' },
]

const F26_STANDARDS: G1StandardBaseline[] = [
  { code: 'RF.K.1d', domain: 'Print Concepts', gradeLevel: 'K',
    description: 'Recognize and name all upper- and lowercase letters',
    testSection: 'w_letter_names', masteryThreshold: 4, alsoChecks: 'o_alpha_names' },
  { code: 'RF.K.3a', domain: 'Phonics', gradeLevel: 'K',
    description: 'Letter-sound correspondences for consonants',
    testSection: 'w_letter_sounds', masteryThreshold: 4, alsoChecks: 'o_alpha_sounds' },
  { code: 'RF.K.2', domain: 'Phonological Awareness', gradeLevel: 'K',
    description: 'Demonstrate understanding of spoken words, syllables, and sounds',
    testSection: 'o_phoneme', masteryThreshold: 8 },
  { code: 'RF.1.2', domain: 'Phonological Awareness', gradeLevel: '1',
    description: 'Demonstrate understanding of spoken words, syllables, and sounds',
    testSection: 'o_phoneme', masteryThreshold: 10 },
  { code: 'SL.1.2', domain: 'Listening', gradeLevel: '1',
    description: 'Ask and answer questions about key details in a text read aloud',
    testSection: 'w_picture_match', masteryThreshold: 4 },
  { code: 'SL.K.2', domain: 'Listening', gradeLevel: 'K',
    description: 'Confirm understanding of a text read aloud',
    testSection: 'w_story_comp', masteryThreshold: 3 },
  { code: 'RL.K.1', domain: 'Reading Lit', gradeLevel: 'K',
    description: 'Ask and answer questions about key details',
    testSection: 'w_story_comp', masteryThreshold: 3 },
  { code: 'L.K.2d', domain: 'Language', gradeLevel: 'K',
    description: 'Spell simple words phonetically',
    testSection: 'w_short_writing', masteryThreshold: 2 },
  // Thresholds are on the 0-5 w_writing compatibility scale (rubric total / 4).
  { code: 'W.K.2', domain: 'Writing', gradeLevel: 'K',
    description: 'Use drawing, dictating, and writing to compose texts',
    testSection: 'w_writing', masteryThreshold: 2 },
  { code: 'W.1.2', domain: 'Writing', gradeLevel: '1',
    description: 'Write informative texts - name a topic, supply facts',
    testSection: 'w_writing', masteryThreshold: 4 },
  { code: 'RF.1.4', domain: 'Fluency', gradeLevel: '1',
    description: 'Read with sufficient accuracy and fluency',
    testSection: 'o_naep', masteryThreshold: 3 },
]

const FALL_2026_CONTENT: G1Content = {
  version: '2026-2027:fall',
  label: 'Fall 2026 test',
  administration: 'single_sitting',
  written: {
    questions: F26_QUESTIONS,
    mcMax: 19,
    sections: F26_WRITTEN_SECTIONS,
    sectionKeys: ['letter_names', 'letter_sounds', 'picture_match', 'story_comp'],
  },
  shortWriting: {
    prompt: 'What animal do you like? What does it look like?',
    starters: ['I like…', 'It is…'],
    max: 3,
    rubric: F26_SHORT_WRITING_RUBRIC,
    notes: [
      'Spelling is not scored. Invented or phonetic spelling never loses a point at any level. "I like a rabit. It is wite." = 3 points.',
      'Any true statement about the animal counts for the second sentence, including opinions ("It is cute," "It is big," "It is white"). A color or body part is not required.',
      'Only the third point depends on the full sentence. A student who writes just the ending words on the line (dog / white) can earn a maximum of 2.',
      'Handwriting neatness, letter reversals, and line placement are not scored.',
      'No half points. If you are torn between two scores, award the higher one only if every part of that descriptor is met.',
    ],
    scoreKey: 'writing_short',
  },
  extendedWriting: {
    prompt: 'Write a story about the picture. (Snowman picture)',
    categories: F26_WRITING_CATEGORIES,
    max: 20,
    rubric: F26_WRITING_RUBRIC,
    notes: [
      'Score the four categories independently. Strong ideas with weak spelling should earn a high Content score and a low Mechanics score.',
      'Content and Detail is scored on ideas, not on English accuracy. Broken English that still shows a feature earns the box: "boy happy he like snow" earns Beyond the picture.',
      'Only Content and Detail is a checklist. Completeness, Language and Grammar, and Mechanics are ladders — find the highest row that describes the writing.',
      'Content and Detail does not reward length; Completeness already does. A three-sentence story can earn 5 for Content.',
      'Under Mechanics, phonetic spelling of a word a Grade 1 student would not be expected to know (mittins, carit, scarf) is not penalized. Only high-frequency words count.',
      'If in doubt, do not check the box. Do not check a feature twice for the same words — "the big snowman" earns Description, and needs a second noun elsewhere to also earn Names things.',
    ],
    bands: [
      { min: 0, max: 5, label: 'Emerging' },
      { min: 6, max: 10, label: 'Developing' },
      { min: 11, max: 15, label: 'Proficient' },
      { min: 16, max: 20, label: 'Advanced' },
    ],
  },
  alphabet: { letters: F26_ALPHABET_LETTERS, nameMax: 16, soundMax: 16, wordProbeMax: 5, total: 37 },
  phoneme: {
    modelWord: { word: 'bed', sounds: ['/b/', '/e/', '/d/'] },
    words: F26_PHONEME_WORDS,
    max: 12,
    stoppingRule: 'If the student cannot segment the first word after you model once, stop and record 0. Move to the passage section.',
    l1Note: 'Accept reasonable pronunciation. Korean speakers may substitute /p/ for /f/, /l/ for /r/, and so on. Score phonemic awareness, not accent. If the student clearly identifies the correct position and attempts the correct sound, give credit.',
  },
  levelA: {
    questions: LEGACY_LEVEL_A_QUESTIONS,
    rubric: F26_LEVEL_A_RUBRIC,
    max: 4,
    mode: 'holistic',
  },
  levelB: { words: F26_LEVEL_B_WORDS, max: 29 },
  levelC: { sentences: F26_LEVEL_C_SENTENCES, max: 30 },
  passages: F26_PASSAGES,
  passageConfigs: F26_PASSAGE_CONFIGS,
  compQuestions: F26_COMP_QUESTIONS,
  compScoringExamples: F26_COMP_SCORING_EXAMPLES,
  openResponse: {
    max: 5,
    rubric: F26_OPEN_RESPONSE_RUBRIC,
    instructions: 'Show the student the two pictures. Say: "Look at these two pictures. What is the same? What is different?" It is okay if they do not compare and contrast and only describe the picture. Give 30-60 seconds. Do not prompt or help beyond "What else?"',
  },
  standards: F26_STANDARDS,
  adminNotes: [
    'Levels A, B and C have no comprehension questions and no NAEP rating.',
    'Comprehension is asked only when the student finishes the passage. If the student was cut off, mark "comprehension not administered" rather than scoring the questions 0.',
    'Item 15 uses the same snowman image that is the writing stimulus for item 21. A student who anchors on it may miss item 15 for reasons unrelated to listening.',
    'Item 20 sits under a "Listening" page header on the student copy, but it is a written response.',
  ],
  timing: {
    struggleStopSeconds: 60,
    ceilingSeconds: 120,
    note: 'Let the timer run. A capable reader may read past 60 seconds — finishing over a minute is fine, and CWPM uses the actual time. Stop a clearly struggling reader at about 60 seconds and do not ask the comprehension questions. Never spend more than about two minutes on the passage.',
  },
}

// ============================================================================
// REGISTRY
// ============================================================================

export const G1_LEGACY_VERSION = 'legacy'

/** Content versions. Key format: `${academic_year}:${semester}`. */
const G1_VERSIONS: Record<string, G1Content> = {
  [G1_LEGACY_VERSION]: LEGACY_CONTENT,
  '2026-2027:fall': FALL_2026_CONTENT,
}

/** Resolve a level test to its Grade 1 content, falling back to legacy. */
export function g1VersionKeyForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): string {
  if (!test?.academic_year || !test?.semester) return G1_LEGACY_VERSION
  const key = `${test.academic_year}:${test.semester}`
  return G1_VERSIONS[key] ? key : G1_LEGACY_VERSION
}

export function getG1Content(versionKey: string = G1_LEGACY_VERSION): G1Content {
  return G1_VERSIONS[versionKey] || LEGACY_CONTENT
}

export function g1ContentForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): G1Content {
  return getG1Content(g1VersionKeyForTest(test))
}

/**
 * Core written points: multiple choice plus the short writing item. Extended
 * writing is weighted separately as a bonus, so it is excluded here.
 */
export function g1WrittenCoreMax(content: G1Content): number {
  return content.written.mcMax + (content.shortWriting?.max ?? 0)
}

/** Every point on the written paper, for reporting. */
export function g1WrittenTotalMax(content: G1Content): number {
  return g1WrittenCoreMax(content) + content.extendedWriting.max
}
