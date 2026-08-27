// ============================================================================
// GRADE 3 LEVEL TEST CONTENT — VERSIONED
// ============================================================================
// Scores are stored as answers keyed by question number alone -- {7:'b'} -- and
// never record what Q7 actually was. So this content must NEVER be edited in
// place once a test has been scored: every historical result would silently
// re-point at different questions, standards and passages.
//
// Each level test resolves to a content version keyed by its academic_year and
// semester, mirroring grade1Content.ts and grade2Content.ts. Grade 3 tests
// predating this module keep the constants baked into OralTestEntry25 and
// WrittenTestEntry.
//
// ── Adding a new Grade 3 test ─────────────────────────────────────────
//   1. Add new content constants below (never edit existing ones).
//   2. Assemble them into a G3Content object.
//   3. Register it under the matching `academic_year:semester` key.
// ============================================================================

export type G3PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

// ─── Shared shapes ───────────────────────────────────────────────────

export interface G3CompQuestion {
  q: string
  /** 'DOK 1' | 'DOK 2' | 'Oral production' */
  dok: string
  /** Scoring anchors for 0, 1 and 2 points, in that order. */
  anchors: [string, string, string]
  /** Guidance the guide attaches to this specific question. */
  note?: string
}

export interface G3Passage {
  title: string
  text: string
  wordCount: number
  /** Null where the guide gives no Lexile (the two easiest passages). */
  lexile: string | null
  /**
   * Weighted CWPM = Raw CWPM x passageWeight x NAEP multiplier. Weights match
   * the Grade 2 scheme so scores are comparable across grades. C is slightly
   * longer than D; the Lexile ordering, not the word count, sets difficulty.
   */
  passageWeight: number
}

export interface G3NaepRow {
  rating: number
  label: string
  desc: string
  multiplier: number
}

export interface G3QuestionDef {
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
  dok?: number
  /**
   * Why each wrong answer is tempting.
   *
   * Read back by the item analysis: knowing a class got a question wrong is a
   * statistic, but knowing which distractor they chose -- and what choosing it
   * means -- is a lesson. Written from the passage and the choices, so a
   * distractor that is merely wrong gets no explanation and one that encodes a
   * specific misreading gets named.
   */
  note?: string
}

export interface G3WrittenSection {
  key: string
  label: string
  shortLabel: string
  /** First and last item number, inclusive. */
  range: [number, number]
  max: number
  standards: string[]
}

export interface G3ReadingPassage {
  key: string
  title: string
  text: string
  range: [number, number]
}

export interface G3WritingCategory {
  key: string
  label: string
  max: number
  standard: string
  standardDesc: string
  kind: 'ladder' | 'checklist'
  checklist?: { key: string; label: string; desc: string }[]
}

export interface G3StandardBaseline {
  code: string
  domain: string
  gradeLevel: string
  description: string
  testSection: string
  masteryThreshold: number
}

export interface G3Content {
  version: string
  label: string
  oral: {
    /** Comprehension only; fluency is recorded separately. */
    total: number
    minutesPerStudent: string
    say: string
    passages: Record<G3PassageLevel, G3Passage>
    compQuestions: Record<G3PassageLevel, G3CompQuestion[]>
    naep: G3NaepRow[]
    /** 5 questions x 0/1/2 on every passage. */
    compMax: number
    compQuestionCount: number
    /** What counts as an error while marking the running record. */
    errorRules: string[]
    /** Accuracy bands that tell the teacher to move a level. */
    readingLevels: { level: string; accuracy: string; action: string }[]
    adminNotes: string[]
    timing: {
      struggleStopSeconds: number
      /** Ceiling in seconds for the shorter passages A-D. */
      ceilingSecondsShort: number
      /** Ceiling for E and F, which are around 200 words. */
      ceilingSecondsLong: number
      note: string
    }
  }
  written: {
    total: number
    /** Multiple-choice points. Item 25 and item 31 are scored separately. */
    mcMax: number
    sections: G3WrittenSection[]
    questions: G3QuestionDef[]
    listening: { script: string; instructions: string }
    passages: G3ReadingPassage[]
    scoringNote: string
    adminNote: string
  }
  /**
   * Item 25. A short constructed response scored on its own small rubric:
   * one point per completed starter plus a single all-or-nothing point for
   * writing them as full punctuated sentences.
   */
  shortWriting: {
    item: number
    prompt: string
    starters: string[]
    max: number
    /** Read aloud before students begin. */
    sayBeforeStarting: string
    contentMax: number
    contentRule: string
    sentencePointRule: string
    notes: string[]
  }
  writing: {
    item: number
    prompt: string
    /** Target shown to the student. Explicitly not a scoring rule. */
    targetSentences: number
    categories: G3WritingCategory[]
    max: number
    rubric: Record<string, Record<number, string>>
    notes: string[]
    bands: { min: number; max: number; label: string }[]
  }
  standards: G3StandardBaseline[]
  /** Conflicts between the teacher's guide and the printed student copy. */
  documentNotes: string[]
}

// ============================================================================
// FALL 2026 CONTENT
// ============================================================================
// Source: "Grade 3 Level Test — Fall 2026, Teacher's Guide (Revised Edition)"
// plus the Oral and Written student copies. Oral 10 pts comprehension; written
// 54 pts (29 MC + 5 short writing + 20 extended writing).

const F26_PASSAGES: Record<G3PassageLevel, G3Passage> = {
  A: {
    title: 'My Rabbit',
    text: 'I have a pet rabbit. My rabbit is soft and white. She has long ears. She likes to hop. I pet her, and she is happy. My rabbit likes carrots. She eats them fast. She has a small cage. She sleeps in her cage at night. I open the cage in the day. She hops in the yard. I love my rabbit. She is my best friend.',
    wordCount: 67, lexile: null, passageWeight: 1.0,
  },
  B: {
    title: 'Camping',
    text: 'Go camping in the woods or a park. You need a tent and a sleeping bag. There are many things to pack. There are two important jobs to do. First, you set up the tent. You put the poles together and push them into the ground. If the tent is set up right, it will not fall down. Then you roll out your sleeping bag inside. Next, you build a campfire. You put sticks and logs together. If the fire starts, you can make s\'mores. Camping can be a fun thing to do!',
    wordCount: 93, lexile: null, passageWeight: 1.1,
  },
  C: {
    title: 'Bees',
    text: 'Bees are small insects that live in groups. A group of bees is called a hive. Each hive has one queen bee. The queen lays all the eggs. Worker bees have many jobs. Some worker bees clean the hive. Other worker bees fly outside and collect pollen. They visit many flowers every day. Bees use pollen to make honey. Honey is food for the whole hive. Bees also help flowers grow. When a bee visits a flower, pollen sticks to its legs. The bee carries the pollen to the next flower. This helps new flowers and plants grow. Without bees, many plants would not grow at all. Would you like to see a beehive?',
    wordCount: 114, lexile: '330L', passageWeight: 1.2,
  },
  D: {
    title: 'The Deep Ocean',
    text: 'If you get a chance, explore the deep ocean in a submarine. The deep ocean is the largest habitat on Earth. It is much deeper than a mountain is tall, and very few people have ever seen it. The deep ocean is called the Midnight Zone because no sunlight reaches it. There are fish with glowing lights! You might also see a giant squid. People think that many parts of the ocean floor have never been explored. There are signs that new kinds of animals still live there. People still do not know how many kinds of life exist in the deep ocean. Would you like to explore the deep ocean?',
    // The guide's table says 112; the passage as printed in both the guide and
    // the student copy is 111 words. Recorded as the true count -- the running
    // record splits this text, so a stated 112 would not match what is on screen.
    wordCount: 111, lexile: '440L', passageWeight: 1.3,
  },
  E: {
    title: 'The Mantis Shrimp',
    text: 'The mantis shrimp is one of the most interesting animals in the ocean. It has a hard, colorful body and two powerful claws. Each claw can snap shut in a flash, hitting so hard it can crack open a crab shell.\n\nMantis shrimp are very smart. Scientists have watched them remember faces and recognize their own burrows. They can also see many more colors than humans, including some that people cannot even imagine. This helps them find prey and avoid predators like fish and eels.\n\nA mantis shrimp\'s claw moves faster than almost any animal in the world. Because of this, its strike creates a small shockwave in the water that can stun its prey without touching it. Some mantis shrimp can break through aquarium glass with just one hit! If a predator gets too close, the mantis shrimp can dart into its burrow and block the entrance with its claws.\n\nMost mantis shrimp live in burrows near coral reefs on the ocean floor. They eat crabs, clams, and small fish. After a mantis shrimp catches its food, it uses its strong claw to crack open the shell.\n\nThere is still so much to learn about these remarkable creatures.',
    wordCount: 199, lexile: '650L', passageWeight: 1.4,
  },
  F: {
    title: 'The Tardigrade',
    text: 'Tardigrades, sometimes called "water bears," are among the toughest animals ever found on Earth. They are smaller than a grain of sand, but these tiny animals can live through conditions that would kill almost anything else.\n\nScientists have studied tardigrades for hundreds of years, and what they found is amazing. When a tardigrade\'s home becomes too dry, too cold, or too dangerous, it curls into a tiny, dried-up ball. Its body loses almost all its water, and it stops needing food. In this state, it can live for many years without eating or drinking.\n\nScientists have tested tardigrades in extreme ways. They have survived being frozen in deep ice and boiled in hot water. Some have even survived in outer space. When conditions get better, a tardigrade soaks up water again and goes on living as if nothing happened.\n\nTardigrades live almost everywhere on Earth, from the deepest oceans to the highest mountains. Most of them are found in moss or in small puddles of rain. They eat plant cells, algae, and sometimes smaller animals, using a sharp, pointed mouth to poke into their food.\n\nScientists keep studying tardigrades. They hope the tardigrade\'s survival skills might one day help doctors and space explorers solve new problems.',
    wordCount: 206, lexile: '800L', passageWeight: 1.5,
  },
}

const F26_COMP_QUESTIONS: Record<G3PassageLevel, G3CompQuestion[]> = {
  A: [
    { q: 'What color is the rabbit?', dok: 'DOK 1', anchors: ['Wrong', 'Partial or wrong color', 'White'] },
    { q: 'What does the rabbit like to do?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("play")', 'Hop'] },
    { q: 'How do you know the child takes good care of the rabbit?', dok: 'DOK 2', anchors: ['Wrong', 'Vague ("she likes her")', 'References the text (feeds her carrots, gives her a cage, lets her out in the day, pets her)'] },
    { q: 'Why do you think the child opens the cage in the day?', dok: 'DOK 2', anchors: ['Wrong', 'Vague ("because she wants to")', 'So the rabbit can get out and hop in the yard (connects the open cage to what the rabbit does next)'] },
    { q: 'What pet would you like to have? Why?', dok: 'Oral production', anchors: ['No response', 'Names a pet, no reason', 'Names a pet with a reason'] },
  ],
  B: [
    { q: 'What two things do you need when you go camping?', dok: 'DOK 1', anchors: ['Wrong', 'Names one (a tent OR a sleeping bag)', 'Names both — a tent and a sleeping bag'] },
    { q: 'What can you make if the fire starts?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("food," "something to eat")', 'S\'mores'] },
    { q: 'What happens if the tent is set up right?', dok: 'DOK 2', anchors: ['Wrong', 'Vague ("it\'s good")', 'It will not fall down (references the text)'] },
    { q: 'Why does the story say camping is fun?', dok: 'DOK 2', anchors: ['Wrong', 'Generic ("it\'s exciting")', 'Connects to the text (setting up a tent, building a campfire, making s\'mores)'] },
    { q: 'Have you ever been camping, or would you like to go? What would you want to do?', dok: 'Oral production', anchors: ['No response', 'Names an activity, no detail', 'Names an activity with detail'] },
  ],
  C: [
    { q: 'Who lays all the eggs in the hive?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("a bee")', 'The queen bee'] },
    { q: 'What do bees use pollen to make?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("food")', 'Honey'] },
    { q: 'What happens when a bee visits a flower?', dok: 'DOK 2', anchors: ['Wrong', 'Vague ("it gets pollen")', 'Pollen sticks to its legs and it carries the pollen to the next flower'] },
    { q: 'Why are bees important for plants?', dok: 'DOK 2', anchors: ['Wrong', 'Generic ("bees help plants")', 'Connects to the text (they carry pollen between flowers, which helps new flowers and plants grow)'] },
    { q: 'Would you like to see a beehive? Why or why not?', dok: 'Oral production', anchors: ['No response', 'Yes or no with no reason', 'Yes or no with a reason'] },
  ],
  D: [
    { q: 'What is the deep ocean called, and why?', dok: 'DOK 1', anchors: ['Wrong', 'Names it OR gives the reason, not both', 'The Midnight Zone, because no sunlight reaches it'] },
    { q: 'Name one animal you might see in the deep ocean.', dok: 'DOK 1', anchors: ['Wrong', 'Names something not in the text', 'Fish with glowing lights OR a giant squid'] },
    { q: 'What do people think has never been explored?', dok: 'DOK 2', anchors: ['Wrong', 'Too broad ("the deep ocean")', 'Many parts of the ocean floor'] },
    {
      q: 'What makes the deep ocean hard to explore?', dok: 'DOK 2',
      anchors: ['Wrong', 'Names one reason only (depth OR darkness)', 'Names both — it is very deep (deeper than a mountain is tall) and dark, with no sunlight'],
      note: 'A true inference — the passage never says the deep ocean is "hard to explore." Accept any answer that pulls depth or darkness from the text.',
    },
    { q: 'Would you like to explore the deep ocean? Why or why not?', dok: 'Oral production', anchors: ['No response', 'Yes or no with no reason', 'Yes or no with a reason'] },
  ],
  E: [
    { q: 'What can a mantis shrimp\'s claw do in a flash?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("hit something")', 'Snap shut — the crab-shell detail is a bonus, not required'] },
    { q: 'What can mantis shrimp see that humans cannot?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("more things," "in the dark")', 'Many more colors — including some people cannot even imagine'] },
    { q: 'What does a mantis shrimp do to escape from a predator?', dok: 'DOK 2', anchors: ['Wrong', 'Names one action only (darts into its burrow OR blocks the entrance)', 'Names both'] },
    { q: 'Why can a mantis shrimp stun its prey without touching it?', dok: 'DOK 2', anchors: ['Wrong', 'Vague, no reference to the text', 'Because its claw strikes so fast it creates a shockwave in the water'] },
    {
      q: 'Can you think of another animal that is like the mantis shrimp? How is it similar or different?', dok: 'Oral production',
      anchors: ['No response, or says "I don\'t know" with nothing further', 'Names an animal but gives no comparison, OR explains clearly why they cannot think of one', 'Names an animal and gives at least one similarity or difference'],
      note: 'A student who cannot name an animal but explains their thinking has still produced language. Do not score 0 for an honest, reasoned "no."',
    },
  ],
  F: [
    { q: 'What is another name for a tardigrade?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("a bug")', 'A water bear'] },
    { q: 'What does a tardigrade do when its home gets too dry, too cold, or too dangerous?', dok: 'DOK 1', anchors: ['Wrong', 'Vague ("it hides")', 'It curls into a tiny, dried-up ball — "stops needing food" is a bonus, not required'] },
    { q: 'Name two extreme conditions scientists have tested tardigrades in.', dok: 'DOK 2', anchors: ['Wrong', 'Names one condition', 'Names two (freezing, boiling, or outer space)'] },
    { q: 'Why are scientists interested in studying tardigrades?', dok: 'DOK 2', anchors: ['Wrong', 'Vague, no reference to the text', 'Its survival skills might help doctors and space explorers solve new problems'] },
    { q: 'If you could survive extreme conditions like a tardigrade, where would you want to go? Why?', dok: 'Oral production', anchors: ['No response', 'Names a place, no reason', 'Names a place with a reason'] },
  ],
}

const F26_NAEP: G3NaepRow[] = [
  { rating: 1, label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words. Sounds like reading is very hard work.', multiplier: 0.85 },
  { rating: 2, label: 'Choppy phrases', desc: 'Reads in short, 2-word phrases. Some pauses in awkward places. Little expression. Starting to group words but not smoothly.', multiplier: 0.95 },
  { rating: 3, label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression. Sounds like the student understands what they are reading.', multiplier: 1.0 },
  { rating: 4, label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation. Smooth pace. Reading sounds easy and natural.', multiplier: 1.1 },
]

// ─── Part 2: Written ─────────────────────────────────────────────────

const F26_LISTENING_SCRIPT = 'We will go to the zoo. We will bring a camera. We can carry a small bag for snacks. First we will walk through the gate. We will take pictures of the animals.\n\nAfter we take pictures, we will walk to the next area. We will see lions and tigers. We can watch them eat and rest. We can hear them roar loudly. The main rule is to stay away from the fence.\n\nMaybe we will see a monkey swing from a tree. The tree will be the monkey\'s home. We will have fun. We\'ll have a good time at the zoo.'

const F26_WRITTEN_SECTIONS: G3WrittenSection[] = [
  { key: 'w_g3_listening', label: 'Listening — The Zoo', shortLabel: 'Li', range: [1, 5], max: 5, standards: ['SL.3.2', 'RI.3.1', 'RI.3.2', 'L.3.4a'] },
  { key: 'w_g3_language', label: 'Language Standards', shortLabel: 'La', range: [6, 19], max: 14, standards: ['L.2.1', 'L.3.1', 'L.2.2', 'L.3.2'] },
  { key: 'w_g3_reading_busyday', label: 'Reading — My Busy Day', shortLabel: 'R1', range: [20, 24], max: 5, standards: ['RI.3.1', 'RI.3.2', 'RI.3.3', 'L.3.4a'] },
  { key: 'w_g3_short_writing', label: 'Short writing — daily schedule', shortLabel: 'SW', range: [25, 25], max: 5, standards: ['W.3.2', 'L.3.2'] },
  { key: 'w_g3_reading_volcanoes', label: 'Reading — Volcanoes', shortLabel: 'R2', range: [26, 30], max: 5, standards: ['RI.3.1', 'RI.3.2', 'RI.3.3', 'L.3.4a'] },
  { key: 'w_g3_writing', label: 'Writing — favorite memory', shortLabel: 'Wr', range: [31, 31], max: 20, standards: ['W.3.3', 'L.3.1', 'L.3.2'] },
]

const F26_READING_PASSAGES: G3ReadingPassage[] = [
  {
    key: 'busy_day', title: 'My Busy Day', range: [20, 25],
    text: 'I have four parts to my day. In the morning, I eat breakfast and get dressed for school. In the afternoon, I study at school and play outside at recess. In the evening, my family eats dinner together, and I do my homework. At night, I put on my pajamas and read a book before bed. Good night!',
  },
  {
    key: 'volcanoes', title: 'Volcanoes', range: [26, 30],
    text: 'A volcano is a mountain that can erupt with hot melted rock called lava. Most volcanoes form where large pieces of the earth\'s crust, called plates, meet. When pressure builds up deep underground, melted rock pushes upward until it bursts out onto the surface.\n\nSome volcanoes erupt quietly, letting lava ooze out slowly. Others erupt suddenly, blasting ash, gas, and rocks high into the sky.\n\nScientists watch volcanoes carefully using special tools. These tools help warn people before a big eruption happens.\n\nEven though volcanoes can be dangerous, they are also helpful. Ash from volcanoes makes soil rich for growing crops. Over thousands of years, volcanoes have even helped build new islands.\n\nVolcanoes remind us that the earth is always changing beneath our feet.',
  },
]

const F26_QUESTIONS: G3QuestionDef[] = [
  // Items 1-5 — Listening: "The Zoo", read aloud twice, slowly.
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: The Zoo', text: 'What is the story about?', choices: ['Going to the beach', 'Going to the zoo', 'Going to school', 'Going to the park'], correct: 'b', standard: 'RI.3.2', standardDesc: 'Determine the main idea of a text', domain: 'Listening Comprehension', dok: 2, note: 'Main idea. a, c and d are all places a class trip could go, so this tests whether the setting was held from the listening or guessed from the question.' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: The Zoo', text: 'Where does the story happen?', choices: ['At school', 'At the beach', 'At the park', 'At the zoo'], correct: 'd', standard: 'SL.3.2', standardDesc: 'Determine main ideas and details of a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Setting, stated in the opening line. Each wrong answer is a different outing, so choosing one means the start of the script was lost.' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: The Zoo', text: 'What will they NOT do at the zoo?', choices: ['Swim in the waves', 'Take pictures', 'Watch lions and tigers', 'Hear animals roar'], correct: 'a', standard: 'RI.3.1', standardDesc: 'Ask and answer questions, referring explicitly to the text', domain: 'Listening Comprehension', dok: 2, note: 'Negation. b, c and d are all in the script and only swimming is not, so a student who misses NOT picks whichever they remember best.' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: The Zoo', text: 'What is the main rule?', choices: ['Hold hands', 'Stay out of the deep water', 'Stay away from the fence', 'Don\'t feed the animals'], correct: 'c', standard: 'SL.3.2', standardDesc: 'Determine main ideas and details of a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail, given as The main rule is. d is the zoo rule most children already know, so this separates listening from prior knowledge; expect d to be the commonest wrong answer.' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: The Zoo', text: 'What does "swing" mean in this story?', choices: ['sit still', 'run fast', 'sleep', 'move back and forth while hanging'], correct: 'd', standard: 'L.3.4a', standardDesc: 'Use sentence-level context as a clue to word meaning', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context, where the script has a monkey swinging from a tree. a and c are the absence of movement; b is movement of the wrong kind.' },
  // Items 6-19 — Language Standards, read and answered independently.
  { qNum: 6, section: 'language', sectionLabel: 'Language Standards', text: 'A _____ of wolves howled at the moon.', choices: ['pack', 'team', 'flock', 'school'], correct: 'a', standard: 'L.2.1a', standardDesc: 'Collective nouns', domain: 'Language/Grammar', dok: 1, note: 'Collective noun. b, c and d are all real collective nouns for other animals, so the wrong answer shows the set is known but the pairing is not.' },
  { qNum: 7, section: 'language', sectionLabel: 'Language Standards', text: 'She looked at _____ in the mirror.', choices: ['her', 'she', 'herself', 'hers'], correct: 'c', standard: 'L.2.1c', standardDesc: 'Reflexive pronouns', domain: 'Language/Grammar', dok: 1, note: 'Reflexive pronoun. a is the plain object form, which is what a student picks when they have not noticed that subject and object are the same person.' },
  { qNum: 8, section: 'language', sectionLabel: 'Language Standards', text: 'The teacher gave us two _____ to read.', choices: ['story', 'storys', 'story\'s', 'stories'], correct: 'd', standard: 'L.2.1b', standardDesc: 'Irregular plural nouns (y to ies)', domain: 'Language/Grammar', dok: 1, note: 'Plural of a word ending in -y. b applies the regular -s rule without the y-to-i change; c is the possessive. Each names a different missing rule.' },
  // The guide labels item 9 "subordinating conjunction / because" -- that is a
  // description of printed item 14. The item actually printed at 9 is a
  // vocabulary-in-context item, and its answer is 'b' either way, so the key is
  // unaffected. See `documentNotes`.
  { qNum: 9, section: 'language', sectionLabel: 'Language Standards', text: 'My grandmother always talks about her _____.', choices: ['bicycle', 'childhood', 'shoes', 'lunch'], correct: 'b', standard: 'L.3.4', standardDesc: 'Determine the meaning of words and phrases in context', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context, where the clue is grandmother always talks about. The other three are concrete nouns that fit the sentence grammatically but not its meaning.' },
  { qNum: 10, section: 'language', sectionLabel: 'Language Standards', text: 'Yesterday, she _____ the ball to her friend.', choices: ['threw', 'throw', 'throwed', 'throwing'], correct: 'a', standard: 'L.3.1d', standardDesc: 'Form and use regular and irregular verbs', domain: 'Language/Grammar', dok: 1, note: 'Irregular past tense, signalled by Yesterday. c is the regularised form and the most informative wrong answer: the tense is right and only the irregular is missing.' },
  { qNum: 11, section: 'language', sectionLabel: 'Language Standards', text: 'Tomorrow, we _____ to the museum.', choices: ['go', 'went', 'going', 'will go'], correct: 'd', standard: 'L.1.1e', standardDesc: 'Use verbs to convey a sense of past, present and future', domain: 'Language/Grammar', dok: 1, note: 'Future tense, signalled by Tomorrow. b is past, which is what a student picks when they read the verb before the time word.' },
  { qNum: 12, section: 'language', sectionLabel: 'Language Standards', text: 'The two dogs _____ barking at the mailman.', choices: ['is', 'was', 'are', 'am'], correct: 'c', standard: 'L.3.1f', standardDesc: 'Ensure subject-verb agreement', domain: 'Language/Grammar', dok: 1, note: 'Subject-verb agreement with a plural subject. b agrees with the nearest noun rather than with the subject, which is the error the sentence is built to catch.' },
  { qNum: 13, section: 'language', sectionLabel: 'Language Standards', text: 'This apple is _____ than that one.', choices: ['sweeter', 'sweet', 'sweetest', 'more sweet'], correct: 'a', standard: 'L.3.1g', standardDesc: 'Form and use comparative adjectives', domain: 'Language/Grammar', dok: 1, note: 'Comparative, signalled by than. c is the superlative and d is the double-marked form. They are two different mistakes, not two versions of one.' },
  // The guide labels item 14 "coordinating conjunction -- d -- but". Choice d on
  // the printed page is "so", and the printed stem takes a SUBORDINATING
  // conjunction: the answer is 'b' (because). Keyed to the paper the students
  // actually sit. See `documentNotes`.
  { qNum: 14, section: 'language', sectionLabel: 'Language Standards', text: 'We stayed inside _____ it was raining.', choices: ['but', 'because', 'or', 'so'], correct: 'b', standard: 'L.3.1h', standardDesc: 'Use subordinating conjunctions', domain: 'Language/Grammar', dok: 1, note: 'Conjunction showing cause. d reverses cause and effect, so it catches a student who understood the sentence but not its direction.' },
  { qNum: 15, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence is a compound sentence?', choices: ['I like pizza.', 'I like pizza, but my sister likes tacos.', 'Pizza is my favorite food.', 'I ate pizza for dinner.'], correct: 'b', standard: 'L.3.1i', standardDesc: 'Produce simple, compound and complex sentences', domain: 'Language/Grammar', dok: 2, note: 'Compound sentence. a, c and d are simple sentences of increasing length, so a student choosing by length rather than structure lands on d.' },
  { qNum: 16, section: 'language', sectionLabel: 'Language Standards', text: 'We are reading the book _____', choices: ['"charlotte\'s web"', '"CHARLOTTE\'S WEB"', '"Charlotte\'s Web"', '"Charlotte\'s web"'], correct: 'c', standard: 'L.3.2a', standardDesc: 'Capitalize appropriate words in titles', domain: 'Language/Mechanics', dok: 1, note: 'Capitalising a title. Each wrong answer capitalises a different amount, and d capitalises only the first word, which is the commonest partial rule.' },
  { qNum: 17, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence uses quotation marks correctly?', choices: ['Mia said, I can\'t wait!', '"Mia said, I can\'t wait!"', 'Mia said "I can\'t wait"!', 'Mia said, "I can\'t wait!"'], correct: 'd', standard: 'L.3.2c', standardDesc: 'Use quotation marks in dialogue', domain: 'Language/Mechanics', dok: 2, note: 'Quotation punctuation. a omits the marks, b encloses the speaker tag as well, and c puts the end punctuation outside. Three distinct errors, not three degrees of one.' },
  { qNum: 18, section: 'language', sectionLabel: 'Language Standards', text: 'Anna left her backpack on the bus. That is _____ backpack.', choices: ['the girl\'s', 'the girls', 'the girls\'', 'the girls\'s'], correct: 'a', standard: 'L.2.2c', standardDesc: 'Use an apostrophe to form possessives', domain: 'Language/Mechanics', dok: 1, note: 'Singular possessive. Anna is one girl, so b, c and d are all plural or plural-possessive and catch a student adding the apostrophe by pattern rather than by number.' },
  { qNum: 19, section: 'language', sectionLabel: 'Language Standards', text: 'Which word is correct?', choices: ['runing', 'running', 'runeing', 'runnning'], correct: 'b', standard: 'L.3.2e', standardDesc: 'Use conventional spelling for adding suffixes', domain: 'Language/Mechanics', dok: 1, note: 'Doubling before -ing. a fails to double and d doubles twice, the two directions of the same uncertainty.' },
  // Items 20-24 — Reading: "My Busy Day". Item 25 is the short writing task.
  { qNum: 20, section: 'reading_busyday', sectionLabel: 'Reading: My Busy Day', text: 'What is this story mostly about?', choices: ['A child\'s favorite foods', 'A child\'s busy day', 'A child\'s pajamas', 'A child\'s homework'], correct: 'b', standard: 'RI.3.2', standardDesc: 'Determine the main idea of a text', domain: 'Reading Comprehension', dok: 2, note: 'Main idea. a, c and d are each one detail from a single part of the day; only b covers the four parts the passage is built around.' },
  { qNum: 21, section: 'reading_busyday', sectionLabel: 'Reading: My Busy Day', text: 'What does the child do in the morning?', choices: ['Eats dinner and does homework', 'Reads a book in bed', 'Eats breakfast and gets dressed for school', 'Plays outside at recess'], correct: 'c', standard: 'RI.3.1', standardDesc: 'Ask and answer questions, referring explicitly to the text', domain: 'Reading Comprehension', dok: 1, note: 'Key detail tied to a time word. a is the evening, b is night and d is the afternoon, so the wrong answer names which part of the day was read instead.' },
  { qNum: 22, section: 'reading_busyday', sectionLabel: 'Reading: My Busy Day', text: 'Put these events in order: (1) The child does homework. (2) The child eats breakfast. (3) The child plays at recess.', choices: ['2, 3, 1', '1, 2, 3', '3, 1, 2', '2, 1, 3'], correct: 'a', standard: 'RI.3.3', standardDesc: 'Describe a sequence of events using language of time and order', domain: 'Reading Comprehension', dok: 2, note: 'Sequence across the whole passage. b is the order the events are listed in the question rather than in the passage, which is the commonest error here.' },
  { qNum: 23, section: 'reading_busyday', sectionLabel: 'Reading: My Busy Day', text: 'What does the family do in the evening?', choices: ['Get dressed for school', 'Eat dinner together', 'Play outside', 'Read before bed'], correct: 'b', standard: 'RI.3.1', standardDesc: 'Ask and answer questions, referring explicitly to the text', domain: 'Reading Comprehension', dok: 1, note: 'Key detail tied to a time word. d happens at night, in the very next sentence, so it catches a student reading the right area of the passage but the wrong time word.' },
  { qNum: 24, section: 'reading_busyday', sectionLabel: 'Reading: My Busy Day', text: 'What does "recess" mean in this story?', choices: ['A test at school', 'A time to eat lunch', 'A break to play outside', 'A subject to study'], correct: 'c', standard: 'L.3.4a', standardDesc: 'Use sentence-level context as a clue to word meaning', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context, where the clue is play outside at recess. a, b and d are all school activities, so a student answering from the setting rather than the sentence picks one.' },
  // Items 26-30 — Reading: "Volcanoes".
  { qNum: 26, section: 'reading_volcanoes', sectionLabel: 'Reading: Volcanoes', text: 'What is this passage mostly about?', choices: ['How scientists build tools', 'How to grow crops', 'What volcanoes are and how they erupt', 'How islands are formed'], correct: 'c', standard: 'RI.3.2', standardDesc: 'Determine the main idea of a text', domain: 'Reading Comprehension', dok: 2, note: 'Main idea. a and d are each single sentences from late in the passage, so a student summarising from what they read last lands on d.' },
  { qNum: 27, section: 'reading_volcanoes', sectionLabel: 'Reading: Volcanoes', text: 'Where do most volcanoes form?', choices: ['Where large pieces of the earth\'s crust meet', 'Near rivers and lakes', 'On top of mountains only', 'Under the ocean floor only'], correct: 'a', standard: 'RI.3.1', standardDesc: 'Ask and answer questions, referring explicitly to the text', domain: 'Reading Comprehension', dok: 1, note: 'Key detail. d is true of many volcanoes but the passage says where plates meet, so this separates the passage\'s answer from general knowledge.' },
  { qNum: 28, section: 'reading_volcanoes', sectionLabel: 'Reading: Volcanoes', text: 'What is one difference between how volcanoes erupt?', choices: ['Some erupt with lava, and some erupt with water', 'Some erupt at night, and some erupt in the day', 'Some erupt on land, and some erupt in the sky', 'Some erupt quietly, and some erupt suddenly'], correct: 'd', standard: 'RI.3.3', standardDesc: 'Describe the relationship between scientific ideas or concepts', domain: 'Reading Comprehension', dok: 2, note: 'Contrast inside one paragraph. a swaps water for the ash and gas actually named, which is plausible to a student who did not read the second half of the pair.' },
  { qNum: 29, section: 'reading_volcanoes', sectionLabel: 'Reading: Volcanoes', text: 'How can volcanoes be helpful, even though they can be dangerous?', choices: ['They make the air cooler', 'They make soil rich for crops and can help build new islands', 'They give scientists new tools', 'They stop earthquakes from happening'], correct: 'b', standard: 'RI.3.1', standardDesc: 'Ask and answer questions, referring explicitly to the text', domain: 'Reading Comprehension', dok: 2, note: 'Key detail needing both halves of the answer. c takes scientists and tools from the paragraph before, which is where a student reading nearby rather than exactly will land.' },
  { qNum: 30, section: 'reading_volcanoes', sectionLabel: 'Reading: Volcanoes', text: 'What does "ooze" mean?', choices: ['Explode quickly', 'Freeze solid', 'Flow out slowly', 'Stay completely still'], correct: 'c', standard: 'L.3.4a', standardDesc: 'Use sentence-level context as a clue to word meaning', domain: 'Vocabulary', dok: 1, note: 'Vocabulary in context, where the sentence pairs ooze with slowly. a is the opposite and is what a student picks from a general idea of volcanoes rather than from the sentence.' },
]

// ─── Item 31: Writing ────────────────────────────────────────────────

const F26_WRITING_CATEGORIES: G3WritingCategory[] = [
  { key: 'story_structure', label: 'Story Structure', max: 4, standard: 'W.3.3', standardDesc: 'Write narratives with a clear sequence of events', kind: 'ladder' },
  {
    key: 'content', label: 'Content and Detail', max: 4, standard: 'W.3.3', standardDesc: 'What the memory actually contains',
    kind: 'checklist',
    checklist: [
      { key: 'people', label: 'People', desc: 'Says who was there — a name or a relationship (my grandma, my friend Jisu), not just "someone."' },
      { key: 'setting', label: 'Setting', desc: 'Says where or when it happened (at the beach, last summer, at my house).' },
      { key: 'actions', label: 'Actions', desc: 'Says what they did — at least one specific action, not just that they were together.' },
      { key: 'feelings', label: 'Feelings or significance', desc: 'Says how it felt or why it is special — a feeling word or a real reason.' },
    ],
  },
  { key: 'vocabulary', label: 'Vocabulary and Word Choice', max: 4, standard: 'L.3.3', standardDesc: 'Word choice for effect', kind: 'ladder' },
  { key: 'language_grammar', label: 'Language and Grammar', max: 4, standard: 'L.3.1', standardDesc: 'Sentence variety and agreement', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.3.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
]

const F26_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  story_structure: {
    0: 'No sentences written, or blank.',
    1: 'Writing present but no identifiable structure — random sentences or a list of observations.',
    2: 'Attempts a beginning and middle but no clear ending, or events are out of order.',
    3: 'Has a beginning, middle, and end, but one part is weak or has a minor gap.',
    4: 'Clear beginning, middle, and end. Events are sequenced logically. Easy to follow.',
  },
  vocabulary: {
    0: 'No sentences written, or blank.',
    1: 'Very limited, repetitive words ("good," "fun," "nice" used repeatedly).',
    2: 'Simple, everyday vocabulary. Little variety.',
    3: 'Some varied or descriptive words attempted ("excited" instead of "happy").',
    4: 'Varied, precise, or descriptive vocabulary that strengthens the writing.',
  },
  language_grammar: {
    0: 'No sentences written, or blank.',
    1: 'Significant errors make meaning difficult. Some English structure present.',
    2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("I went…").',
    3: 'Some errors, but meaning is always clear. Attempts sentence variety.',
    4: 'Mostly correct grammar. Varied sentence structures. Consistent subject-verb agreement and verb tenses.',
  },
  mechanics: {
    0: 'No sentences written, or blank.',
    1: 'Minimal punctuation and capitalization. Many misspellings, but words are recognizable.',
    2: 'Some capitalization and punctuation, but inconsistent. Several high-frequency words misspelled.',
    3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled.',
    4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Phonetic attempts at harder words are acceptable.',
  },
}

const F26_STANDARDS: G3StandardBaseline[] = [
  { code: 'RF.3.4a', domain: 'Fluency', gradeLevel: '3',
    description: 'Read grade-level text with purpose and understanding',
    testSection: 'o_g3_comp', masteryThreshold: 7 },
  { code: 'RF.3.4b', domain: 'Fluency', gradeLevel: '3',
    description: 'Read grade-level prose orally with accuracy, appropriate rate, and expression',
    testSection: 'o_g3_naep', masteryThreshold: 3 },
  { code: 'SL.3.2', domain: 'Listening', gradeLevel: '3',
    description: 'Determine the main ideas and supporting details of a text read aloud',
    testSection: 'w_g3_listening', masteryThreshold: 4 },
  { code: 'L.3.1', domain: 'Language', gradeLevel: '3',
    description: 'Demonstrate command of the conventions of standard English grammar',
    testSection: 'w_g3_language', masteryThreshold: 10 },
  { code: 'L.3.2', domain: 'Language', gradeLevel: '3',
    description: 'Demonstrate command of capitalization, punctuation and spelling',
    testSection: 'w_g3_language', masteryThreshold: 10 },
  { code: 'RI.3.1', domain: 'Reading Info', gradeLevel: '3',
    description: 'Ask and answer questions, referring explicitly to the text',
    testSection: 'w_g3_reading_busyday', masteryThreshold: 4 },
  { code: 'RI.3.2', domain: 'Reading Info', gradeLevel: '3',
    description: 'Determine the main idea and recount key details',
    testSection: 'w_g3_reading_volcanoes', masteryThreshold: 4 },
  { code: 'W.3.2', domain: 'Writing', gradeLevel: '3',
    description: 'Write informative texts to examine a topic and convey ideas',
    testSection: 'w_g3_short_writing', masteryThreshold: 3 },
  { code: 'W.3.3', domain: 'Writing', gradeLevel: '3',
    description: 'Write narratives to develop real experiences using descriptive detail',
    testSection: 'w_g3_writing', masteryThreshold: 11 },
]

const FALL_2026_CONTENT: G3Content = {
  version: '2026-2027:fall',
  label: 'Fall 2026 test',
  oral: {
    total: 10,
    minutesPerStudent: '10-15',
    say: 'I am going to ask you to read this passage aloud. Try your best to read each word correctly. Don\'t go too fast or too slow. If you don\'t know a word, I\'ll tell you what it is. Keep reading until the end.',
    passages: F26_PASSAGES,
    compQuestions: F26_COMP_QUESTIONS,
    naep: F26_NAEP,
    compMax: 10,
    compQuestionCount: 5,
    errorRules: [
      'Mispronunciations, skipped words, and substitutions are errors.',
      'Hesitations longer than 3 seconds: wait 3 seconds, supply the word, and mark it as an error.',
      'Self-corrections are NOT errors. If the student fixes the word themselves, do not mark it.',
    ],
    readingLevels: [
      { level: 'Independent', accuracy: '97% or higher', action: 'The passage is too easy. Pull the next passage up and retest.' },
      { level: 'Instructional', accuracy: '90-96%', action: 'Correct placement. Record this passage as the student\'s level.' },
      { level: 'Frustration', accuracy: 'Below 90%', action: 'The passage is too hard. Pull the next passage down and retest.' },
    ],
    adminNotes: [
      'The teacher selects ONE passage. Every passage has 5 comprehension questions worth 0/1/2 each, for 10 points.',
      'Start the timer when the student reads the first word, then follow along and mark errors as they read. Let the timer run — the app handles timing, CWPM and accuracy.',
      'If the student is reading capably, let them read to the end however long it takes, then ask the comprehension questions.',
      'If the student is clearly struggling — laboring word by word, guessing at most words, or plainly not following the passage — stop at about 60 seconds and do NOT ask the comprehension questions. Mark comprehension not administered.',
      'Retest at one adjacent level only. Do not move a student more than one level in a single sitting, and record both attempts.',
      'Ask the comprehension questions with the passage turned over, and only if the student finished it.',
      'Give a NAEP rating for every student who reads, including one who is cut off.',
      'Accept reasonable pronunciation. Korean speakers may substitute /p/ for /f/, /l/ for /r/, and may add a vowel to final consonants. Score decoding and word recognition, not accent.',
    ],
    timing: {
      struggleStopSeconds: 60,
      ceilingSecondsShort: 120,
      ceilingSecondsLong: 180,
      note: 'Ceiling: about two minutes on passages A-D, and about three minutes on E and F, which are roughly 200 words. Never sit with a student for five minutes trying to get through a passage. If a student cannot finish within the ceiling, that is the data point — end the passage.',
    },
  },
  written: {
    total: 54,
    mcMax: 29,
    sections: F26_WRITTEN_SECTIONS,
    questions: F26_QUESTIONS,
    listening: {
      script: F26_LISTENING_SCRIPT,
      instructions: 'Read the passage aloud twice, slowly, before students answer. Then read each question and all four choices aloud.',
    },
    passages: F26_READING_PASSAGES,
    scoringNote: 'Multiple-choice items are worth 1 point each. No partial credit. If a student circles two answers, score 0 for that item.',
    adminNote: 'Administered to the whole class. Items 1-5 are read aloud by the teacher; items 6-31 are completed independently. Do not read items 6-19 aloud unless a student cannot begin; if you do, read for the whole class.',
  },
  shortWriting: {
    item: 25,
    prompt: 'What is your daily schedule?',
    starters: ['In the morning,', 'In the afternoon,', 'In the evening,', 'At night,'],
    max: 5,
    sayBeforeStarting: 'For number 25, finish all four sentences about your own day. Write a whole sentence after each starter. Start with a big letter and end with a period.',
    contentMax: 4,
    contentRule: 'One point for each starter that is completed with a real activity in English, where the activity plausibly matches its time of day. Four starters, so four points.',
    sentencePointRule: 'One further point if the completed responses are written as full sentences, each with a capital letter and end punctuation. All-or-nothing: award it only if every completed response is a full punctuated sentence.',
    notes: [
      'Spelling is not scored. Any real activity counts — "In the morning, I eat rice" is as good as "I eat breakfast."',
      'A starter left blank, copied with nothing added, or answered in Korean earns no point.',
      'A starter filled with an activity that cannot happen at that time ("At night, I go to school") does not earn its point, but does not affect the other three.',
      'A fully blank item scores 0.',
    ],
  },
  writing: {
    item: 31,
    prompt: 'Write about your favorite memory with someone you care about. Who was there? What did you do? Why is this memory special to you?',
    targetSentences: 8,
    categories: F26_WRITING_CATEGORIES,
    max: 20,
    rubric: F26_WRITING_RUBRIC,
    notes: [
      'The planning box is not scored — score only the writing on the lines.',
      'Score the five categories independently. A student with a vivid memory and weak spelling should receive a high Content score and a low Mechanics score.',
      'Whole points only.',
      'Only Content and Detail is a checklist. The other four are ladders — find the highest row that describes the writing and score there.',
      'Content and Detail is scored on ideas, not on English accuracy. Broken English that still shows an element earns the box: "me and my grandma go market" earns People and Actions.',
      'Under Mechanics, phonetic spelling of a word a Grade 3 student would not be expected to know (amuzement, celabration) is not penalized. Only high-frequency words count.',
      'The prompt asks for 8 sentences. That target guides the student; it is NOT a scoring rule. A shorter piece that is well structured and detailed can score well.',
      'If in doubt, do not check the box. Check an element only when you can point to the exact words on the page that show it. A blank or fully off-task response scores 0.',
    ],
    bands: [
      { min: 0, max: 5, label: 'Emerging' },
      { min: 6, max: 10, label: 'Developing' },
      { min: 11, max: 15, label: 'Proficient' },
      { min: 16, max: 20, label: 'Advanced' },
    ],
  },
  standards: F26_STANDARDS,
  documentNotes: [
    'Item 14: the teacher\'s guide keys this as "coordinating conjunction — d — but". Choice d on the printed page is "so", and the printed stem ("We stayed inside _____ it was raining") takes a subordinating conjunction. Keyed here to b (because), matching the paper the students actually sit.',
    'Item 9: the guide labels this "subordinating conjunction — because", which describes printed item 14. The item printed at 9 is vocabulary in context, and its answer is b either way, so the key is unaffected.',
    'Item 25: the printed student copy shows "In the afternoon," twice and omits "In the evening,". The rubric expects four distinct parts of the day. The student copy needs correcting before the test is administered.',
    'Item 31: the guide scores Content and Detail as a four-element checklist; the rubric page reprinted on the student copy shows a sentence-count ladder instead. The guide is the scoring document and is used here — it also states outright that the 8-sentence target is not a scoring rule.',
    'Passage D: the guide\'s word-count table says 112 words. The passage as printed in both documents is 111. Recorded as 111.',
    'The guide\'s cover promises a corrections section "at the back" listing required student-copy edits. No such section is present in the twelve-page file supplied.',
  ],
}

// ============================================================================
// REGISTRY
// ============================================================================

export const G3_LEGACY_VERSION = 'legacy'

const G3_VERSIONS: Record<string, G3Content> = {
  '2026-2027:fall': FALL_2026_CONTENT,
}

export function g3VersionKeyForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): string {
  if (!test?.academic_year || !test?.semester) return G3_LEGACY_VERSION
  const key = `${test.academic_year}:${test.semester}`
  return G3_VERSIONS[key] ? key : G3_LEGACY_VERSION
}

/** Null for legacy tests, which have no authored G3Content. */
export function getG3Content(versionKey: string = G3_LEGACY_VERSION): G3Content | null {
  return G3_VERSIONS[versionKey] || null
}

export function g3ContentForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): G3Content | null {
  return getG3Content(g3VersionKeyForTest(test))
}

/** Every point on the written paper. */
export function g3WrittenTotalMax(content: G3Content): number {
  return content.written.mcMax + content.shortWriting.max + content.writing.max
}

/**
 * Every CCSS code this grade tests, mapped to the guide's own wording.
 *
 * Walks all authored versions, so a history view can name a standard from a
 * test written years ago. Scores persist only the code and the met/total, and
 * a bare "RI.3.1" tells a teacher nothing about what was actually asked.
 */
export function g3StandardDescriptions(): Record<string, string> {
  const out: Record<string, string> = {}
  Object.values(G3_VERSIONS).forEach(c => {
    c.written.questions.forEach(q => { if (q.standard && q.standardDesc) out[q.standard] = q.standardDesc })
    c.writing.categories.forEach(cat => { if (cat.standard && cat.standardDesc) out[cat.standard] = cat.standardDesc })
  })
  return out
}
