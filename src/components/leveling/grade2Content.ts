// ============================================================================
// GRADE 2 LEVEL TEST CONTENT — VERSIONED
// ============================================================================
// Scores are stored as answers keyed by question number alone -- {7:'b'} -- and
// per-component keys like `o_phon_row3`. Nothing in a saved score records what
// Q7 actually was, or which word list was on screen. So this content must NEVER
// be edited in place once a test has been scored: every historical result would
// silently re-point at different questions, standards and passages.
//
// Instead each level test resolves to a content version keyed by its
// academic_year and semester, mirroring grade1Content.ts and the registry in
// WrittenTestEntry.tsx. Tests created before versioning, and any test whose
// version has not been authored, fall back to the legacy content that the
// grades 2-5 entry screens have used to date.
//
// ── Adding a new Grade 2 test ─────────────────────────────────────────
//   1. Add new content constants below (never edit existing ones).
//   2. Assemble them into a G2Content object.
//   3. Register it under the matching `academic_year:semester` key.
//   The scoring screen shows which version it resolved to, so a fallback is
//   never invisible.
// ============================================================================

export type G2PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// ─── Shared shapes ───────────────────────────────────────────────────

export interface G2PhonicsRow {
  /** Score key stored on the student's raw_scores. Must be unique per version. */
  key: string
  label: string
  /** Phonics pattern the row is probing, for the teacher's reference. */
  focus: string
  words: string[]
  max: number
}

export interface G2SyllableWord {
  key: string
  word: string
  /** Correct syllable count. Scored 0/1 -- the count, not the reading. */
  answer: number
}

export interface G2Sentence {
  key: string
  text: string
  /** Split for the running-record view. */
  words: string[]
  max: number
  focus: string
}

export interface G2CompQuestion {
  q: string
  /** 'DOK 1' | 'DOK 2' | 'Oral production' */
  dok: string
  /**
   * Scoring anchors for 0, 1 and 2 points, in that order. Every question on
   * every passage is worth 0/1/2.
   */
  anchors: [string, string, string]
}

export interface G2Passage {
  title: string
  text: string
  wordCount: number
  /**
   * Weighted CWPM = Raw CWPM x passageWeight x NAEP multiplier. B and C are the
   * same length; C is weighted higher for its vocabulary and sentence
   * structure, not its length.
   */
  passageWeight: number
  compQuestions: number
  compMax: number
}

export interface G2NaepRow {
  rating: number
  label: string
  desc: string
  multiplier: number
}

export interface G2QuestionDef {
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
  /** Depth of knowledge, where the source test states one. */
  dok?: number
}

export interface G2WrittenSection {
  key: string
  label: string
  shortLabel: string
  /** First and last item number this section covers, inclusive. */
  range: [number, number]
  max: number
  standards: string[]
}

export interface G2ReadingPassage {
  key: string
  title: string | null
  text: string
  /** Items on the student page that refer to this passage. */
  range: [number, number]
}

export interface G2RubricRow {
  score: number
  label: string
  desc: string
}

export interface G2WritingCategory {
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

export interface G2StandardBaseline {
  code: string
  domain: string
  gradeLevel: string // 'K', '1' or '2'
  description: string
  testSection: string
  masteryThreshold: number
}

export interface G2Content {
  version: string
  label: string
  oral: {
    /** Components 1-3 and 5. Fluency is recorded separately and is not in it. */
    total: number
    minutesPerStudent: number
    phonics: {
      rows: G2PhonicsRow[]
      max: number
      say: string
      scoringNote: string
      stoppingRule: string
      l1Note: string
      standards: string[]
    }
    syllables: {
      words: G2SyllableWord[]
      max: number
      say: string
      /** Demonstrated by the teacher and explicitly not scored. */
      modelWord: { word: string; answer: number } | null
      notes: string[]
      standards: string[]
    }
    sentences: {
      items: G2Sentence[]
      max: number
      say: string
      scoringNote: string
      standards: string[]
    }
    reading: {
      say: string
      passages: Record<G2PassageLevel, G2Passage>
      compQuestions: Record<G2PassageLevel, G2CompQuestion[]>
      naep: G2NaepRow[]
      /** Applies to every passage: comprehension is 4 questions x 0/1/2. */
      compMax: number
      standards: string[]
      adminNotes: string[]
      timing: {
        /** Seconds after which a clearly struggling reader is stopped. */
        struggleStopSeconds: number
        note: string
      }
    }
  }
  written: {
    total: number
    /** Items 1-31, one point each, no partial credit. */
    mcMax: number
    sections: G2WrittenSection[]
    questions: G2QuestionDef[]
    listening: {
      script: string
      /**
       * The script's final line is a closing line, not a test item. Read it,
       * but do not pause for answers.
       */
      closingLine: string
      instructions: string
    }
    passages: G2ReadingPassage[]
    scoringNote: string
    adminNote: string
  }
  writing: {
    item: number
    prompt: string
    categories: G2WritingCategory[]
    max: number
    /** Ladder descriptions keyed by category key, then score. */
    rubric: Record<string, Record<number, string>>
    notes: string[]
    bands: { min: number; max: number; label: string }[]
  }
  standards: G2StandardBaseline[]
  /** Surfaced on the entry screens as administration cautions. */
  adminNotes: string[]
}

// ============================================================================
// FALL 2026 CONTENT — revised Grade 2 test
// ============================================================================
// Source: "Grade 2 Level Test — Fall 2026, Teacher's Guide" plus the Oral and
// Written student copies. Oral total 74 pts (25 phonics + 5 syllables +
// 36 sentences + 8 comprehension). Written total 51 pts (31 MC + 20 writing).

// ─── Part 1: Oral ────────────────────────────────────────────────────

// Row and sentence keys match the storage the grades 2-5 oral screen has always
// used (`phonics_row1`, `sent_1`), so `phonics_total` and `sentence_total` stay
// comparable and the analytics that read them keep working. Which words those
// rows held is recorded by the content version, not by the key. Syllable
// counting is new to this test, so it gets keys of its own.
const F26_PHONICS_ROWS: G2PhonicsRow[] = [
  { key: 'phonics_row1', label: 'Row 1', focus: 'CVC', words: ['map', 'hen', 'lid', 'jog', 'mud'], max: 5 },
  { key: 'phonics_row2', label: 'Row 2', focus: 'Blends', words: ['flag', 'spend', 'drip', 'blast', 'stump'], max: 5 },
  { key: 'phonics_row3', label: 'Row 3', focus: 'Digraphs', words: ['shell', 'chomp', 'thick', 'whisk', 'fetch'], max: 5 },
  { key: 'phonics_row4', label: 'Row 4', focus: 'VCe', words: ['shape', 'smile', 'stone', 'flute', 'prize'], max: 5 },
  { key: 'phonics_row5', label: 'Row 5', focus: 'Vowel Teams', words: ['play', 'dream', 'snow', 'joy', 'chew'], max: 5 },
]

const F26_SYLLABLE_WORDS: G2SyllableWord[] = [
  { key: 'syllable_1', word: 'rabbit', answer: 2 },
  { key: 'syllable_2', word: 'dinosaur', answer: 3 },
  { key: 'syllable_3', word: 'butterfly', answer: 3 },
  { key: 'syllable_4', word: 'alligator', answer: 4 },
  { key: 'syllable_5', word: 'refrigerator', answer: 5 },
]

const F26_SENTENCES: G2Sentence[] = [
  { key: 'sent_1', text: 'The kid can nap on the mat.', words: ['The', 'kid', 'can', 'nap', 'on', 'the', 'mat.'], max: 7, focus: 'CVC / short vowels' },
  { key: 'sent_2', text: 'Frank will trot past the pond.', words: ['Frank', 'will', 'trot', 'past', 'the', 'pond.'], max: 6, focus: 'Blends + final clusters' },
  { key: 'sent_3', text: 'Did Chad wash the thin sheep?', words: ['Did', 'Chad', 'wash', 'the', 'thin', 'sheep?'], max: 6, focus: 'Digraphs' },
  { key: 'sent_4', text: 'Jane baked a huge cake with grape jam.', words: ['Jane', 'baked', 'a', 'huge', 'cake', 'with', 'grape', 'jam.'], max: 8, focus: 'VCe + long vowels' },
  { key: 'sent_5', text: 'We found a gray toad near the loud creek.', words: ['We', 'found', 'a', 'gray', 'toad', 'near', 'the', 'loud', 'creek.'], max: 9, focus: 'Diphthongs + vowel teams' },
]

const F26_PASSAGES: Record<G2PassageLevel, G2Passage> = {
  A: {
    title: 'My Toys',
    text: 'I have a ball. My ball is big and red. It can bounce fast. I like to kick it in the yard. I have a kite, too. My kite is small and blue. It flies high in the wind. I love my toys!',
    wordCount: 43, passageWeight: 1.0, compQuestions: 4, compMax: 8,
  },
  B: {
    title: 'At the Park',
    text: 'I go to the park with my dad. There is a big slide and a swing. I like to climb up the ladder. Then I go down the slide fast. My dad pushes me on the swing. I see a duck by the pond. My dad says, "Time to go!" I do not want to leave. I had a fun day at the park.',
    wordCount: 64, passageWeight: 1.1, compQuestions: 4, compMax: 8,
  },
  C: {
    title: 'Where Are We?',
    text: 'Where are we? There are red, blue, green, and yellow umbrellas. Kids are playing in the waves. They are building sandcastles. Red, blue, green, and yellow shells are in the sand. There are big and small boats out on the water. We are eating cold ice cream. Do you know where we are? It is a very sunny place. We are at the beach!',
    wordCount: 64, passageWeight: 1.2, compQuestions: 4, compMax: 8,
  },
  D: {
    title: 'How to Make a Snowman',
    text: 'This is how to make a snowman. First, roll a big snowball for the bottom. Next, roll a smaller ball and put it on top. Then, roll one more ball for the head. Add two black buttons for the eyes. Push in an orange carrot for the nose. Wrap a warm scarf around the neck. Do not forget to add a hat! Give your snowman two stick arms. Now step back and look at your snowman. You made a great snowman!',
    wordCount: 81, passageWeight: 1.3, compQuestions: 4, compMax: 8,
  },
  E: {
    title: 'Owls',
    text: 'Owls are amazing birds. They are awake mostly at night. During the day, owls like to sleep in trees. An owl has very big eyes. Big eyes help owls see in the dark. Owls can turn their heads almost all the way around. This helps them look for food without moving their body. Owls hunt mice, bugs, and other small animals. Their wings are very soft and quiet. This means their prey cannot hear them coming. Owls do not build their own nests. They use nests that other birds left behind. Baby owls are called owlets. Owlets stay with their parents until they learn to fly and hunt.',
    wordCount: 108, passageWeight: 1.4, compQuestions: 4, compMax: 8,
  },
  F: {
    title: 'The Missing Backpack',
    text: 'Emma looked everywhere for her backpack. It was not under her bed. It was not in the closet. "Where could it be?" she wondered. Emma asked her little brother, Max, if he had seen it. Max said he had not touched it. Emma felt worried because she needed her backpack for school. She checked the kitchen table. She checked by the front door. Suddenly, she remembered something important. She had left her backpack at her grandmother\'s house! Emma called her grandmother right away. "Don\'t worry," said Grandma. "I will bring it to school for you." Emma felt relieved. She was thankful that her grandmother could help. The next morning, Grandma arrived with the backpack just in time.',
    wordCount: 117, passageWeight: 1.5, compQuestions: 4, compMax: 8,
  },
}

const F26_COMP_QUESTIONS: Record<G2PassageLevel, G2CompQuestion[]> = {
  A: [
    { q: 'What two toys does the child have?', dok: 'DOK 1', anchors: ['No response / wrong', 'Names one (ball OR kite)', 'Names both'] },
    { q: 'What color is the kite?', dok: 'DOK 1', anchors: ['No response / wrong', 'Partial or wrong color', 'Blue'] },
    { q: 'How do you know the child plays outside?', dok: 'DOK 2', anchors: ['No response / wrong', 'Vague ("he just does")', 'References the text (kicks it in the yard, the kite flies in the wind)'] },
    { q: 'What is your favorite toy? Why?', dok: 'Oral production', anchors: ['No response', 'Names a toy, no reason', 'Names a toy with a reason'] },
  ],
  B: [
    { q: 'What two things does the child play on at the park?', dok: 'DOK 1', anchors: ['No response / wrong', 'Names one (slide OR swing)', 'Names both'] },
    { q: 'What does the child see by the pond?', dok: 'DOK 1', anchors: ['No response / wrong', 'Vague ("an animal")', 'A duck'] },
    { q: 'How does the child feel when it\'s time to leave?', dok: 'DOK 2', anchors: ['No response / wrong', 'Names a feeling with no reference to the text', 'Connects to the text (sad / doesn\'t want to go, because "I do not want to leave")'] },
    { q: 'What is your favorite thing to do at a park? Why?', dok: 'Oral production', anchors: ['No response', 'Names a thing, no reason', 'Names a thing with a reason'] },
  ],
  C: [
    { q: 'What colors are the umbrellas?', dok: 'DOK 1', anchors: ['No response / wrong', 'Names some colors', 'Red, blue, green, and yellow (or "many colors")'] },
    { q: 'What are the kids building?', dok: 'DOK 1', anchors: ['No response / wrong', 'Vague ("something")', 'Sandcastles'] },
    { q: 'How do you know this passage is about the beach before the end?', dok: 'DOK 2', anchors: ['No response / wrong', 'Vague guess', 'References the text (umbrellas, waves, sand, shells, boats)'] },
    { q: 'What is your favorite thing to do at the beach? Why?', dok: 'Oral production', anchors: ['No response', 'Names an activity, no reason', 'Names an activity with a reason'] },
  ],
  D: [
    { q: 'What things do you need to build the snowman?', dok: 'DOK 1', anchors: ['No response / wrong', 'Names one or two items', 'Names three or more (snowballs, buttons, a carrot, a scarf, a hat, sticks)'] },
    { q: 'What do you do right after you make the head?', dok: 'DOK 1', anchors: ['No response / wrong', 'Vague', 'Add two black buttons for the eyes'] },
    { q: 'Why do you give the snowman a scarf and a hat?', dok: 'DOK 2', anchors: ['No response / wrong', 'Generic ("to look nice")', 'Connects to the text or to logic (to dress it up like a person / because it is cold outside)'] },
    { q: 'What would you like to build outside? Why?', dok: 'Oral production', anchors: ['No response', 'Names something, no reason', 'Names something with a reason'] },
  ],
  E: [
    { q: 'What do big eyes help owls do?', dok: 'DOK 1', anchors: ['No response / wrong', 'Partial ("see")', 'See in the dark'] },
    { q: 'What are baby owls called?', dok: 'DOK 1', anchors: ['No response / wrong', 'Partial or wrong', 'Owlets'] },
    { q: 'Why can owls sneak up on their prey without being heard?', dok: 'DOK 2', anchors: ['No response / wrong', 'Generic ("they\'re quiet")', 'Connects to the text (their wings are soft and quiet, so prey cannot hear them coming)'] },
    { q: 'What is your favorite bird or animal? Why?', dok: 'Oral production', anchors: ['No response', 'Names one, no reason', 'Names one with a reason'] },
  ],
  F: [
    { q: 'What was Emma looking for?', dok: 'DOK 1', anchors: ['No response / wrong', 'Vague ("something")', 'Her backpack'] },
    { q: 'Where did Emma finally remember she left her backpack?', dok: 'DOK 1', anchors: ['No response / wrong', 'Vague ("somewhere else")', 'At her grandmother\'s house'] },
    { q: 'Why did Emma feel relieved at the end of the story?', dok: 'DOK 2', anchors: ['No response / wrong', 'Generic ("she was happy")', 'Connects to the text (Grandma was bringing the backpack, so she would not miss school)'] },
    { q: 'Have you ever lost something important? What happened?', dok: 'Oral production', anchors: ['No response', 'Names something, no detail', 'Names something with detail or explanation'] },
  ],
}

const F26_NAEP: G2NaepRow[] = [
  { rating: 1, label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words. Sounds like reading is very hard work.', multiplier: 0.85 },
  { rating: 2, label: 'Choppy phrases', desc: 'Reads in short, 2-word phrases. Some pauses in awkward places. Little expression. Starting to group words but not smoothly.', multiplier: 0.95 },
  { rating: 3, label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression. Sounds like the student understands what they are reading.', multiplier: 1.0 },
  { rating: 4, label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation. Smooth pace. Reading sounds easy and natural.', multiplier: 1.1 },
]

// ─── Part 2: Written ─────────────────────────────────────────────────

const F26_LISTENING_SCRIPT = 'Kids can do many things at a library. They can read books on the rug. Friends can listen to story time. Everyone sits and listens together. They can find books about animals or space. Picking a new book to borrow is always fun.'

const F26_WRITTEN_SECTIONS: G2WrittenSection[] = [
  { key: 'w_g2_listening', label: 'Listening — library passage', shortLabel: 'Li', range: [1, 5], max: 5, standards: ['SL.2.2', 'RI.2.1', 'RI.2.2', 'L.2.4a'] },
  { key: 'w_g2_reading_sandwich', label: 'Reading — sandwich procedure', shortLabel: 'R1', range: [6, 9], max: 4, standards: ['RI.2.2', 'RI.2.3', 'RF.2.3'] },
  { key: 'w_g2_reading_leo', label: 'Reading — Leo\'s Snow Day', shortLabel: 'R2', range: [10, 15], max: 6, standards: ['RL.2.1', 'RL.2.2', 'RL.2.5', 'L.2.5a'] },
  { key: 'w_g2_language', label: 'Language Standards', shortLabel: 'La', range: [16, 31], max: 16, standards: ['L.1.1', 'L.1.2', 'L.2.1', 'L.2.2', 'L.2.4'] },
  { key: 'w_g2_writing', label: 'Writing — favorite season', shortLabel: 'Wr', range: [32, 32], max: 20, standards: ['W.2.1', 'L.2.1', 'L.2.2'] },
]

const F26_READING_PASSAGES: G2ReadingPassage[] = [
  {
    key: 'sandwich', title: null, range: [6, 9],
    text: 'Ben will make a sandwich. He starts with bread. Then he adds cheese and ham. He walks over to get a plate. He puts the sandwich down. Then he eats the sandwich.',
  },
  {
    key: 'leo', title: 'Leo\'s Snow Day', range: [10, 15],
    text: 'First, Leo wakes up and looks out the window. Then, he sees snow covering the ground. Next, he puts on his warm coat, hat, and mittens. Last, he goes outside to build a snowman. He rolls three big snowballs. He adds a carrot nose and coal eyes. Then he goes inside for hot cocoa. Now, Leo has had a perfect snow day!',
  },
]

const F26_QUESTIONS: G2QuestionDef[] = [
  // Items 1-5 — Listening. Passage read aloud twice, then each question and all
  // four choices read aloud.
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: library', text: 'What is the story about?', choices: ['Kids can read books', 'Kids can do many fun things at a library', 'Kids like story time', 'Kids borrow new books'], correct: 'b', standard: 'RI.2.2', standardDesc: 'Identify the main purpose of a text', domain: 'Listening Comprehension', dok: 2 },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: library', text: 'Where does the story happen?', choices: ['At school', 'At a park', 'In a library', 'At a bookstore'], correct: 'c', standard: 'SL.2.2', standardDesc: 'Recount key ideas from a text read aloud', domain: 'Listening Comprehension', dok: 1 },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: library', text: 'What can you NOT do at a library?', choices: ['Read', 'Listen to a story', 'Borrow a book', 'Play soccer'], correct: 'd', standard: 'RI.2.1', standardDesc: 'Ask and answer who, what, where, when, why and how questions', domain: 'Listening Comprehension', dok: 2 },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: library', text: 'What can you find at the library?', choices: ['A swimming pool', 'A slide', 'Books about animals or space', 'A shopping cart'], correct: 'c', standard: 'SL.2.2', standardDesc: 'Recount key ideas from a text read aloud', domain: 'Listening Comprehension', dok: 1 },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: library', text: 'What does "borrow" mean?', choices: ['Take something and return it later', 'Buy something', 'Give something away', 'Read very fast'], correct: 'a', standard: 'L.2.4a', standardDesc: 'Use sentence-level context as a clue to word meaning', domain: 'Vocabulary', dok: 2 },
  // Items 6-9 — Reading: sandwich procedure.
  { qNum: 6, section: 'reading_sandwich', sectionLabel: 'Reading: sandwich', text: 'What is this story about?', choices: ['Making a sandwich', 'The bread is soft', 'He puts the sandwich down', 'Eating a sandwich'], correct: 'a', standard: 'RI.2.2', standardDesc: 'Identify the main topic of a text', domain: 'Reading Comprehension', dok: 2 },
  { qNum: 7, section: 'reading_sandwich', sectionLabel: 'Reading: sandwich', text: 'What happens last?', choices: ['Ben starts with bread.', 'Ben gets a plate.', 'He adds cheese and ham.', 'He eats the sandwich.'], correct: 'd', standard: 'RI.2.3', standardDesc: 'Describe the connection between steps in a procedure', domain: 'Reading Comprehension', dok: 2 },
  { qNum: 8, section: 'reading_sandwich', sectionLabel: 'Reading: sandwich', text: 'Which word rhymes with "plate"?', choices: ['cat', 'late', 'plant', 'down'], correct: 'b', standard: 'RF.2.3', standardDesc: 'Know and apply grade-level phonics and word analysis skills', domain: 'Phonics', dok: 1 },
  { qNum: 9, section: 'reading_sandwich', sectionLabel: 'Reading: sandwich', text: 'How many toppings does Ben add to the sandwich?', choices: ['one', 'two', 'three', 'zero'], correct: 'b', standard: 'RI.2.1', standardDesc: 'Ask and answer questions about key details', domain: 'Reading Comprehension', dok: 1 },
  // Items 10-15 — Reading: "Leo's Snow Day".
  { qNum: 10, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'What is this story about?', choices: ['Leo likes cocoa', 'Leo has fun on a snowy day', 'Snow is cold', 'Coats keep you warm'], correct: 'b', standard: 'RL.2.2', standardDesc: 'Determine the central message of a story', domain: 'Reading Comprehension', dok: 2 },
  { qNum: 11, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'What does Leo do first?', choices: ['He builds a snowman', 'He drinks hot cocoa', 'He wakes up and looks out the window', 'He puts on his coat'], correct: 'c', standard: 'RL.2.1', standardDesc: 'Ask and answer questions about key details', domain: 'Reading Comprehension', dok: 1 },
  { qNum: 12, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'What happens after Leo puts on his coat, hat, and mittens?', choices: ['He drinks cocoa right away', 'He looks out the window', 'He goes outside to build a snowman', 'He sees the snow'], correct: 'c', standard: 'RL.2.1', standardDesc: 'Ask and answer questions about key details', domain: 'Reading Comprehension', dok: 1 },
  { qNum: 13, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'Put these events in order: (1) Leo builds a snowman. (2) Leo puts on his coat. (3) Leo drinks hot cocoa.', choices: ['3, 2, 1', '2, 3, 1', '1, 2, 3', '2, 1, 3'], correct: 'd', standard: 'RL.2.5', standardDesc: 'Describe the overall structure of a story', domain: 'Reading Comprehension', dok: 2 },
  { qNum: 14, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'What is needed to build a snowman?', choices: ['Dark shade and rain', 'Cold weather and wind', 'Snow and cold weather', 'Hot rocks and soil'], correct: 'c', standard: 'RL.2.1', standardDesc: 'Ask and answer questions about key details', domain: 'Reading Comprehension', dok: 2 },
  { qNum: 15, section: 'reading_leo', sectionLabel: 'Reading: Leo\'s Snow Day', text: 'Which word means the same as "perfect"? ("Now, Leo has had a perfect snow day!")', choices: ['terrible', 'boring', 'wonderful', 'weak'], correct: 'c', standard: 'L.2.5a', standardDesc: 'Word relationships and nuances in word meanings', domain: 'Vocabulary', dok: 1 },
  // Items 16-31 — Language Standards. Read independently; read aloud only for
  // the whole class if a student cannot begin.
  { qNum: 16, section: 'language', sectionLabel: 'Language Standards', text: 'I brushed my _____ before bed.', choices: ['tooths', 'teeths', 'teeth', 'toothes'], correct: 'c', standard: 'L.2.1b', standardDesc: 'Form and use frequently occurring irregular plural nouns', domain: 'Language/Grammar', dok: 1 },
  { qNum: 17, section: 'language', sectionLabel: 'Language Standards', text: 'I have two _____.', choices: ['dog', 'dogs', 'doges', 'dog\'s'], correct: 'b', standard: 'L.1.1c', standardDesc: 'Use singular and plural nouns with matching verbs', domain: 'Language/Grammar', dok: 1 },
  { qNum: 18, section: 'language', sectionLabel: 'Language Standards', text: 'The cat _____ fast.', choices: ['run', 'running', 'runs', 'runned'], correct: 'c', standard: 'L.1.1c', standardDesc: 'Subject-verb agreement (singular)', domain: 'Language/Grammar', dok: 1 },
  { qNum: 19, section: 'language', sectionLabel: 'Language Standards', text: 'The rabbit hopped _____ across the yard.', choices: ['quick', 'quickly', 'quickest', 'quicker'], correct: 'b', standard: 'L.2.1e', standardDesc: 'Use adjectives and adverbs, choosing depending on what is modified', domain: 'Language/Grammar', dok: 1 },
  { qNum: 20, section: 'language', sectionLabel: 'Language Standards', text: 'I wanted to go outside, _____ it started to rain.', choices: ['so', 'but', 'or', 'and'], correct: 'b', standard: 'L.1.1g', standardDesc: 'Use frequently occurring conjunctions', domain: 'Language/Grammar', dok: 1 },
  { qNum: 21, section: 'language', sectionLabel: 'Language Standards', text: 'We celebrate _____ every January.', choices: ['new year\'s day', 'New Year\'s Day', 'new Year\'s day', 'New year\'s day'], correct: 'b', standard: 'L.2.2a', standardDesc: 'Capitalize holidays, product names and geographic names', domain: 'Language/Mechanics', dok: 1 },
  { qNum: 22, section: 'language', sectionLabel: 'Language Standards', text: 'That is _____ backpack by the door.', choices: ['my', 'mine', 'me', 'I'], correct: 'a', standard: 'L.1.1d', standardDesc: 'Use personal, possessive and indefinite pronouns', domain: 'Language/Grammar', dok: 1 },
  { qNum: 23, section: 'language', sectionLabel: 'Language Standards', text: 'I want _____ apple.', choices: ['a', 'an', 'the', 'some'], correct: 'b', standard: 'L.1.1h', standardDesc: 'Use determiners (articles, demonstratives)', domain: 'Language/Grammar', dok: 1 },
  { qNum: 24, section: 'language', sectionLabel: 'Language Standards', text: 'Do you like ice cream _____', choices: ['.', '!', '?', ','], correct: 'c', standard: 'L.1.2b', standardDesc: 'Use end punctuation for sentences', domain: 'Language/Mechanics', dok: 1 },
  { qNum: 25, section: 'language', sectionLabel: 'Language Standards', text: 'Look at _____ birds in the tree!', choices: ['this', 'that', 'those', 'it'], correct: 'c', standard: 'L.1.1h', standardDesc: 'Use determiners (demonstratives, plural and distant)', domain: 'Language/Grammar', dok: 1 },
  { qNum: 26, section: 'language', sectionLabel: 'Language Standards', text: 'The dog was famished, so he ate his food quickly. What does "famished" mean?', choices: ['sleepy', 'very hungry', 'happy', 'sick'], correct: 'b', standard: 'L.2.4a', standardDesc: 'Use sentence-level context as a clue to word meaning', domain: 'Vocabulary', dok: 2 },
  { qNum: 27, section: 'language', sectionLabel: 'Language Standards', text: 'Which word is a compound word?', choices: ['happy', 'running', 'sunflower', 'tiny'], correct: 'c', standard: 'L.2.4d', standardDesc: 'Use knowledge of the meaning of individual words to predict compound words', domain: 'Vocabulary', dok: 1 },
  { qNum: 28, section: 'language', sectionLabel: 'Language Standards', text: 'Which word means "not happy"?', choices: ['happyful', 'happier', 'unhappy', 'happyless'], correct: 'c', standard: 'L.2.4b', standardDesc: 'Determine the meaning of a new word when a known prefix is added', domain: 'Vocabulary', dok: 1 },
  { qNum: 29, section: 'language', sectionLabel: 'Language Standards', text: 'The dogs _____ fast.', choices: ['run', 'runs', 'running', 'to ran'], correct: 'a', standard: 'L.1.1c', standardDesc: 'Subject-verb agreement (plural)', domain: 'Language/Grammar', dok: 1 },
  { qNum: 30, section: 'language', sectionLabel: 'Language Standards', text: 'Tomorrow, I _____ to the park.', choices: ['go', 'went', 'will go', 'going'], correct: 'c', standard: 'L.1.1e', standardDesc: 'Use verbs to convey a sense of past, present and future', domain: 'Language/Grammar', dok: 1 },
  { qNum: 31, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence tells someone to do something?', choices: ['I like dogs.', 'Do you like dogs?', 'Close the door.', 'What a good dog!'], correct: 'c', standard: 'L.1.1j', standardDesc: 'Produce and expand declarative, interrogative, imperative and exclamatory sentences', domain: 'Language/Grammar', dok: 2 },
]

// ─── Item 32: Writing ────────────────────────────────────────────────

const F26_WRITING_CATEGORIES: G2WritingCategory[] = [
  { key: 'completeness', label: 'Completeness', max: 5, standard: 'W.2.1', standardDesc: 'How many of the four questions are answered', kind: 'ladder' },
  {
    key: 'content', label: 'Content and Detail', max: 5, standard: 'W.2.1', standardDesc: 'Richness of the ideas',
    kind: 'checklist',
    checklist: [
      { key: 'specific_detail', label: 'Specific detail', desc: 'Gives at least one concrete detail rather than a general statement ("I make a snowman with my sister" rather than "It is fun").' },
      { key: 'weather', label: 'Weather description', desc: 'Describes the weather with a real describing word (cold, snowy, windy, warm, rainy), not just naming the season.' },
      { key: 'named_activity', label: 'Named activity', desc: 'Names a specific activity (swimming, sledding, eating watermelon) rather than a general word like play.' },
      { key: 'personal_connection', label: 'Personal connection', desc: 'Includes a feeling, a memory, a place, or a person (my grandma, my school, last year).' },
      { key: 'explanation', label: 'Explanation or comparison', desc: 'Gives a real because reason, or compares this season to another ("I like summer more than winter because…").' },
    ],
  },
  { key: 'language_grammar', label: 'Language and Grammar', max: 5, standard: 'L.2.1', standardDesc: 'Sentence variety and agreement', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 5, standard: 'L.2.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
]

const F26_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  completeness: {
    0: 'No writing attempted, or no English.',
    1: 'Attempts to address 1 question only.',
    2: 'Addresses 2 of the 4 questions.',
    3: 'Addresses 3 of the 4 questions.',
    4: 'Addresses all 4 questions, but some lack detail.',
    5: 'Fully addresses all 4 questions (season, weather, activity, reason) with detail.',
  },
  language_grammar: {
    0: 'No intelligible English sentences.',
    1: 'Significant errors make meaning difficult. Some English structure present.',
    2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I like…", "It is…").',
    3: 'Some errors, but meaning is always clear. Attempts some sentence variety.',
    4: 'Mostly correct grammar. Some varied structures. Consistent subject-verb agreement.',
    5: 'Strong grammar for grade level. Varied sentence structures. Confident use of English.',
  },
  mechanics: {
    0: 'No evidence of capitalization, punctuation, or recognizable spelling.',
    1: 'Minimal punctuation and capitalization. Many misspellings, but words are recognizable.',
    2: 'Some capitalization and punctuation, but inconsistent. Several high-frequency words misspelled.',
    3: 'Capitalization and end punctuation present on most sentences. A few common words misspelled.',
    4: 'Consistent capitalization and end punctuation. High-frequency words correct. Phonetic attempts at harder words are acceptable.',
    5: 'Strong control of mechanics. Correct spelling of grade-level words. Punctuation used accurately throughout.',
  },
}

// ─── Standards baseline ──────────────────────────────────────────────

const F26_STANDARDS: G2StandardBaseline[] = [
  { code: 'RF.2.3', domain: 'Phonics', gradeLevel: '2',
    description: 'Know and apply grade-level phonics and word analysis skills',
    testSection: 'o_g2_phonics', masteryThreshold: 20 },
  { code: 'RF.1.3e', domain: 'Phonics', gradeLevel: '1',
    description: 'Decode two-syllable words by breaking the words into syllables',
    testSection: 'o_g2_syllables', masteryThreshold: 4 },
  { code: 'RF.1.3c', domain: 'Phonics', gradeLevel: '1',
    description: 'Know final -e and common vowel team conventions for long vowels',
    testSection: 'o_g2_sentences', masteryThreshold: 29 },
  { code: 'RF.2.4a', domain: 'Fluency', gradeLevel: '2',
    description: 'Read grade-level text with purpose and understanding',
    testSection: 'o_g2_comp', masteryThreshold: 6 },
  { code: 'RF.2.4b', domain: 'Fluency', gradeLevel: '2',
    description: 'Read grade-level text orally with accuracy, appropriate rate, and expression',
    testSection: 'o_g2_naep', masteryThreshold: 3 },
  { code: 'SL.2.2', domain: 'Listening', gradeLevel: '2',
    description: 'Recount or describe key ideas from a text read aloud',
    testSection: 'w_g2_listening', masteryThreshold: 4 },
  { code: 'RI.2.1', domain: 'Reading Info', gradeLevel: '2',
    description: 'Ask and answer who, what, where, when, why and how questions',
    testSection: 'w_g2_reading_sandwich', masteryThreshold: 3 },
  { code: 'RL.2.1', domain: 'Reading Lit', gradeLevel: '2',
    description: 'Ask and answer questions about key details in a text',
    testSection: 'w_g2_reading_leo', masteryThreshold: 4 },
  { code: 'L.2.1', domain: 'Language', gradeLevel: '2',
    description: 'Demonstrate command of the conventions of standard English grammar',
    testSection: 'w_g2_language', masteryThreshold: 11 },
  { code: 'L.2.2', domain: 'Language', gradeLevel: '2',
    description: 'Demonstrate command of capitalization, punctuation and spelling',
    testSection: 'w_g2_language', masteryThreshold: 11 },
  { code: 'W.2.1', domain: 'Writing', gradeLevel: '2',
    description: 'Write opinion pieces - state an opinion, supply reasons, provide a conclusion',
    testSection: 'w_g2_writing', masteryThreshold: 11 },
]

const FALL_2026_CONTENT: G2Content = {
  version: '2026-2027:fall',
  label: 'Fall 2026 test',
  oral: {
    total: 74,
    minutesPerStudent: 15,
    phonics: {
      rows: F26_PHONICS_ROWS,
      max: 25,
      say: 'Read these words out loud. Go across the row. If you don\'t know a word, try to sound it out, then move on.',
      scoringNote: 'Score 1 point per word read correctly. Self-corrections count as correct.',
      stoppingRule: 'If a student misses all 5 words in two consecutive rows, stop and record. Move to Component 2.',
      l1Note: 'Accept reasonable pronunciation. Korean speakers may substitute /p/ for /f/, /l/ for /r/, and may add a vowel to final consonants. Score decoding, not accent. If the student has clearly decoded the word, give credit.',
      standards: ['RF.K.3a', 'RF.K.3b', 'RF.1.3a', 'RF.1.3c', 'RF.2.3'],
    },
    syllables: {
      words: F26_SYLLABLE_WORDS,
      max: 5,
      say: 'How many claps (syllables) are in _____?',
      modelWord: { word: 'pencil', answer: 2 },
      notes: [
        'Read the word for the student if they cannot read it themselves. Reading the word is not scored here — only the syllable count is.',
        'Model one word (for example, pencil = 2) before starting; the model is not scored.',
        'Clapping or tapping along is allowed and encouraged. Accept the number said aloud or the number of claps — whichever the student produces.',
      ],
      standards: ['RF.1.3e', 'RF.2.3c'],
    },
    sentences: {
      items: F26_SENTENCES,
      max: 36,
      say: 'Now read these sentences out loud. Do your best.',
      scoringNote: 'Score 1 point per word read correctly. Self-corrections count as correct.',
      standards: ['RF.K.3a', 'RF.K.3b', 'RF.1.3a', 'RF.1.3c', 'RF.2.3'],
    },
    reading: {
      say: 'Read this story out loud. Try your best. If you don\'t know a word, try to sound it out.',
      passages: F26_PASSAGES,
      compQuestions: F26_COMP_QUESTIONS,
      naep: F26_NAEP,
      compMax: 8,
      standards: ['RF.2.4a', 'RF.2.4b'],
      adminNotes: [
        'The teacher selects ONE passage based on estimated ability. Every passage has 4 comprehension questions worth 0/1/2 each, for 8 points.',
        'Start the timer when the student reads the first word, then mark errors as they read. Let the timer run — the app handles the timing and the CWPM calculation.',
        'If the student is reading capably, let them read to the end however long it takes, then ask the comprehension questions. Finishing over a minute is fine.',
        'If the student is clearly struggling — labouring word by word, guessing at most words, or plainly not following the story — stop at about 60 seconds and do NOT ask the comprehension questions. Mark comprehension not administered rather than scoring the questions 0.',
        'A student who is cut off is usually placed too high. Try the next passage down. If Passage A is too high, record that and move on.',
        'Give a NAEP rating for every student who reads, including one who is cut off.',
      ],
      timing: {
        struggleStopSeconds: 60,
        note: 'Let the timer run for a capable reader; CWPM uses the actual time. Stop a clearly struggling reader at about 60 seconds.',
      },
    },
  },
  written: {
    total: 51,
    mcMax: 31,
    sections: F26_WRITTEN_SECTIONS,
    questions: F26_QUESTIONS,
    listening: {
      script: F26_LISTENING_SCRIPT,
      closingLine: 'What do you like to do at a library?',
      instructions: 'Read the passage aloud twice at a natural pace before students answer. Then read each question and all four choices aloud. The final line is part of the script — read it, but do not pause for answers; it is a closing line, not a test item.',
    },
    passages: F26_READING_PASSAGES,
    scoringNote: 'Items 1-31 are worth 1 point each. No partial credit. If a student circles two answers, score 0 for that item.',
    adminNote: 'Administered to the whole class. Items 1-5 are read aloud by the teacher; items 6-32 are read independently. Do not read items 16-31 aloud unless a student is unable to begin; if you do, read for the whole class.',
  },
  writing: {
    item: 32,
    prompt: 'What is your favorite season? What is the weather like? What do you like to do during this season? Why do you like it?',
    categories: F26_WRITING_CATEGORIES,
    max: 20,
    rubric: F26_WRITING_RUBRIC,
    notes: [
      'Score the four categories independently. A student with strong ideas and weak spelling should receive a high Content score and a low Mechanics score. Do not let one category pull the others down.',
      'Whole points only.',
      'Only Content and Detail is a checklist. Completeness, Language and Grammar, and Mechanics are ladders — find the highest row that describes the writing and score there.',
      'Completeness measures coverage; Content measures depth. A student who answers all four questions in four thin sentences can score 5 for Completeness and 1 or 2 for Content. A student who answers only two questions but does so vividly can score 2 for Completeness and 4 for Content.',
      'Content and Detail is scored on ideas, not on English accuracy. Broken English that still shows a feature earns the box: "summer very hot I go beach" earns Weather description and Named activity.',
      'Under Mechanics, phonetic spelling of a word a Grade 2 student would not be expected to know (watermellon, sledeing) is not penalized. Only high-frequency words count.',
      'If in doubt, do not check the box. Check a feature only when you can point to the exact words on the page that show it. A blank or fully off-task response scores 0.',
    ],
    bands: [
      { min: 0, max: 5, label: 'Emerging' },
      { min: 6, max: 10, label: 'Developing' },
      { min: 11, max: 15, label: 'Proficient' },
      { min: 16, max: 20, label: 'Advanced' },
    ],
  },
  standards: F26_STANDARDS,
  adminNotes: [
    'The oral test is administered one-on-one. Allow approximately 15 minutes per student.',
    'Fluency (CWPM and NAEP) is recorded separately and is not part of the 74-point oral total.',
    'Components 4 and 5 are administered together at the student\'s selected passage.',
  ],
}

// ============================================================================
// REGISTRY
// ============================================================================

/**
 * Grade 2 tests predating this module are scored against the content baked into
 * OralTestEntry25 and WrittenTestEntry (passages A-E, 25-item written paper).
 * There is no G2Content for them, so callers get null and keep the old path.
 */
export const G2_LEGACY_VERSION = 'legacy'

/** Content versions. Key format: `${academic_year}:${semester}`. */
const G2_VERSIONS: Record<string, G2Content> = {
  '2026-2027:fall': FALL_2026_CONTENT,
}

/** Resolve a level test to its Grade 2 content version key. */
export function g2VersionKeyForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): string {
  if (!test?.academic_year || !test?.semester) return G2_LEGACY_VERSION
  const key = `${test.academic_year}:${test.semester}`
  return G2_VERSIONS[key] ? key : G2_LEGACY_VERSION
}

/** Null for legacy tests, which have no authored G2Content. */
export function getG2Content(versionKey: string = G2_LEGACY_VERSION): G2Content | null {
  return G2_VERSIONS[versionKey] || null
}

export function g2ContentForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): G2Content | null {
  return getG2Content(g2VersionKeyForTest(test))
}

/** Every point on the oral test, excluding fluency, which is recorded apart. */
export function g2OralScoredMax(content: G2Content): number {
  return content.oral.phonics.max
    + content.oral.syllables.max
    + content.oral.sentences.max
    + content.oral.reading.compMax
}

/** Every point on the written paper, including the writing rubric. */
export function g2WrittenTotalMax(content: G2Content): number {
  return content.written.mcMax + content.writing.max
}
