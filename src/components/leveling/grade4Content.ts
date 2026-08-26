// ============================================================================
// GRADE 4 LEVEL TEST CONTENT — VERSIONED
// ============================================================================
// Scores are stored as answers keyed by question number alone -- {7:'b'} -- and
// never record what Q7 actually was. So this content must NEVER be edited in
// place once a test has been scored.
//
// Each level test resolves to a content version keyed by its academic_year and
// semester, mirroring grade1-3Content.ts.
// ============================================================================

export type G4PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E'

// ─── Shared shapes ───────────────────────────────────────────────────

export interface G4CompQuestion {
  q: string
  dok: string
  anchors: [string, string, string]
}

export interface G4Passage {
  title: string
  text: string
  wordCount: number
  passageWeight: number
  textType: string
  /** Guidance the guide attaches to this passage only. */
  note?: string
}

export interface G4NaepRow {
  rating: number
  label: string
  desc: string
  multiplier: number
}

export interface G4QuestionDef {
  qNum: number
  section: string
  sectionLabel: string
  text: string
  choices: string[]
  correct: string
  standard: string
  standardDesc: string
  domain: string
  dok?: number
  /** The guide's per-item commentary, shown to whoever is marking. */
  note?: string
}

export interface G4WrittenSection {
  key: string
  label: string
  shortLabel: string
  range: [number, number]
  max: number
  standards: string[]
}

export interface G4ReadingPassage {
  key: string
  title: string
  text: string
  range: [number, number]
}

export interface G4WritingCategory {
  key: string
  label: string
  max: number
  standard: string
  standardDesc: string
  kind: 'ladder' | 'checklist'
  checklist?: { key: string; label: string; desc: string }[]
  /**
   * A checklist category capped by something the boxes cannot express. The
   * teacher picks the applicable tier and the score becomes min(checked, cap).
   * Grade 4 has one tier; Grade 5 has two, so this is a list either way.
   */
  checklistCap?: {
    note: string
    tiers: { key: string; label: string; desc: string; cap: number }[]
  }
}

export interface G4StandardBaseline {
  code: string
  domain: string
  gradeLevel: string
  description: string
  testSection: string
  masteryThreshold: number
}

export interface G4Content {
  version: string
  label: string
  oral: {
    total: number
    minutesPerStudent: string
    say: string
    passages: Record<G4PassageLevel, G4Passage>
    compQuestions: Record<G4PassageLevel, G4CompQuestion[]>
    naep: G4NaepRow[]
    compMax: number
    compQuestionCount: number
    errorRules: string[]
    /**
     * Accuracy and comprehension bands. Unlike the earlier grades, this guide
     * states outright what to do when the two disagree.
     */
    readingLevels: { level: string; accuracy: string; comprehension: string; action: string }[]
    /** Verbatim: comprehension decides when the two signals disagree. */
    disagreementRule: string
    /** Comprehension at or below this many points means Frustration. */
    frustrationCompMax: number
    /** Comprehension at or above this many points means Independent. */
    independentCompMin: number
    adminNotes: string[]
    timing: { struggleStopSeconds: number; note: string }
  }
  written: {
    total: number
    mcMax: number
    minutes: number
    sections: G4WrittenSection[]
    questions: G4QuestionDef[]
    listening: { script: string; instructions: string; say: string }
    passages: G4ReadingPassage[]
    scoringNote: string
    adminNote: string
    /** Placement bands for the written total, with the guide's reading of each. */
    bands: { min: number; max: number; label: string; reading: string }[]
    bandCaution: string
  }
  writing: {
    item: number
    prompt: string
    say: string
    targetSentences: number
    categories: G4WritingCategory[]
    max: number
    rubric: Record<string, Record<number, string>>
    notes: string[]
    bands: { min: number; max: number; label: string }[]
  }
  standards: G4StandardBaseline[]
  documentNotes: string[]
}

// ============================================================================
// FALL 2026 CONTENT
// ============================================================================
// Source: "Grade 4 Level Test — Fall 2026, Teacher's Guide and Scoring Sheets
// (Revised Edition)" plus the Oral and Written student copies. Oral 10 pts
// comprehension; written 55 pts (35 MC + 20 writing).

const F26_PASSAGES: Record<G4PassageLevel, G4Passage> = {
  A: {
    title: 'Our Class Fish',
    text: 'Our class has a pet fish. Its name is Bubbles. Bubbles lives in a tank.\n\nEvery day, we feed Bubbles. We give him fish food. He swims around fast.\n\nBubbles is orange and white. He has a small tail. He likes to hide in the plants.\n\nWe clean the tank every week. We change the water. This keeps Bubbles healthy.\n\nWe love having Bubbles in our class. He makes us happy.',
    wordCount: 71, passageWeight: 1.00, textType: 'Simple narrative / description',
  },
  B: {
    title: 'How Do Animals Stay Safe?',
    text: 'Animals need to stay safe from danger. Many animals use their bodies to help them.\n\nTurtles protect themselves easily. They hide inside their hard shells. Some animals need clever tricks to stay safe. Skunks spray a bad smell to scare enemies away. Porcupines have sharp quills. Enemies do not want to get too close.\n\nYou have to look extra hard to see a stick bug or an octopus. An octopus is a sea animal. It can change colors to hide. Look around. What ways do animals stay safe?',
    wordCount: 88, passageWeight: 1.10, textType: 'Informational',
  },
  C: {
    title: 'How Bread Is Made',
    text: 'Have you ever wondered how bread is made? It starts with just a few simple ingredients. Bakers mix flour, water, yeast, and salt together to make dough.\n\nAfter mixing, the dough needs to rest. This is called "rising." The yeast makes tiny bubbles of gas inside the dough. These bubbles make the dough grow bigger and fluffy.\n\nNext, the baker shapes the dough into loaves. The loaves go into a hot oven to bake. The heat turns the soft dough into bread with a golden, crispy crust. The whole process can take several hours from start to finish.\n\nFreshly baked bread smells wonderful and tastes even better warm.',
    wordCount: 108, passageWeight: 1.25, textType: 'Procedural / sequence',
  },
  D: {
    title: 'Coral Reefs',
    text: 'Most people think of the top of the ocean when they think about sea life. But just below the waves, coral reefs are full of life. One reef can be home to thousands of different animals.\n\nCoral is not a plant or a rock. It is made of tiny animals called polyps. Each polyp builds a hard shell around itself to stay safe. Over hundreds of years, these shells stack up and form the reef.\n\nTiny plants called algae live inside each polyp. The algae use sunlight to make food. They share the food with the coral. The coral gives the algae a safe place to live. Scientists call this teamwork "symbiosis," because both of them need each other to live.\n\nNot all reefs are the same. Some reefs grow close to the shore. Others grow far out in the ocean. A reef can even grow in a ring around an island. Each kind of reef is home to different plants and animals.\n\nThe next time you see a picture of the ocean, remember what is hidden under the waves. A coral reef is one of the busiest places on Earth.',
    // Rewritten from the guide's Passage D: same content, plainer wording.
    // 191 words as printed here -- the running record splits this text.
    wordCount: 191, passageWeight: 1.40, textType: 'Informational, technical vocabulary',
    note: 'Do not pre-teach. Polyps, algae and symbiosis are content words the passage defines in context. Supplying them before the read invalidates the accuracy score. If the student stalls on one for more than 3 seconds during the read, supply it and mark it as an error, as with any other word.',
  },
  E: {
    title: 'The Science Fair',
    text: '"Marcus, would you please hand me the poster board?" Mr. Reyes asked. Marcus was helping Mr. Reyes, the science teacher, set up the gym for the Science Fair. He was putting up student projects on the tables. Marcus was helping by carrying supplies Mr. Reyes needed.\n\nMarcus walked to the supply closet and began looking for the poster board. As he passed the rows of finished projects, he felt nervous. He had spent weeks building a volcano that erupted with fizzy foam. He didn\'t think his project was very good, but he had worked hard on it anyway.\n\nMarcus handed the poster board to Mr. Reyes, who was setting up tables for the judges. He was getting ready to choose which projects would enter the district competition. Marcus was sure his volcano wasn\'t as impressive as some of the other students\' projects.\n\nThen Mr. Reyes stopped at Marcus\'s volcano. "This project is outstanding!" he said. "The way you explained the chemical reaction shows real understanding. I think you should enter this in the district competition!"\n\n"Thank you for saying that," Marcus answered, surprised. He had expected Mr. Reyes to move on to the next table.\n\nMr. Reyes put his hand on Marcus\'s shoulder. "Marcus, I\'m not just saying it. I\'m simply telling you the truth," he said warmly. "Your hard work really shows."',
    wordCount: 223, passageWeight: 1.50, textType: 'Narrative with dialogue',
    note: 'Dialogue and NAEP. This is the only passage with sustained dialogue, so it is the only one where NAEP 4 ("adjusts voice for dialogue") is fully observable. A student reading Level A-C can still earn a 4 on phrasing and expression alone — do not withhold it for lack of dialogue in the text.',
  },
}

const F26_COMP_QUESTIONS: Record<G4PassageLevel, G4CompQuestion[]> = {
  A: [
    { q: 'What is the fish\'s name?', dok: 'DOK 1', anchors: ['wrong', 'vague ("a fish")', 'Bubbles'] },
    { q: 'What color is Bubbles?', dok: 'DOK 1', anchors: ['wrong', 'partial or one color only', 'orange and white'] },
    { q: 'Where does Bubbles like to hide?', dok: 'DOK 1', anchors: ['wrong', 'vague ("somewhere," "in the tank")', 'in the plants (references text)'] },
    { q: 'Why do they clean the tank every week?', dok: 'DOK 2', anchors: ['wrong', 'generic ("to make it nice")', 'to keep Bubbles healthy (connects to text)'] },
    { q: 'What pet would you like to have? Why?', dok: 'Oral production', anchors: ['no response', 'names a pet, no reason', 'names a pet with a reason'] },
  ],
  B: [
    { q: 'How does a turtle stay safe?', dok: 'DOK 1', anchors: ['wrong', 'vague ("it hides")', 'it hides inside its hard shell'] },
    { q: 'What does a skunk do to scare enemies away?', dok: 'DOK 1', anchors: ['wrong', 'vague ("it scares them")', 'it sprays a bad smell'] },
    { q: 'Why don\'t enemies want to get close to a porcupine?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it\'s scary")', 'it has sharp quills (references text)'] },
    { q: 'How does an octopus stay hidden?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it hides")', 'it can change colors to blend in'] },
    { q: 'How would you stay safe if you were a small animal?', dok: 'Oral production', anchors: ['no response', 'names an idea, no detail', 'names an idea with detail'] },
  ],
  C: [
    { q: 'What ingredients do bakers mix to make dough?', dok: 'DOK 1', anchors: ['wrong', 'names one or two', 'names three or more (flour, water, yeast, salt)'] },
    { q: 'What happens to the dough after it is mixed?', dok: 'DOK 1', anchors: ['wrong', 'vague ("it changes")', 'it rests and rises (grows bigger)'] },
    { q: 'Why does the dough grow bigger during rising?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it gets bigger")', 'the yeast makes tiny bubbles of gas inside it'] },
    { q: 'What gives the bread its golden, crispy crust?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it bakes")', 'the heat from the hot oven'] },
    { q: 'Have you ever helped bake or cook something? What did you make?', dok: 'Oral production', anchors: ['no response', 'names a food, no detail', 'names a food with detail'] },
  ],
  D: [
    { q: 'What is coral actually made of?', dok: 'DOK 1', anchors: ['wrong', 'vague ("animals")', 'tiny animals called polyps'] },
    { q: 'What does the algae use sunlight to make?', dok: 'DOK 1', anchors: ['wrong', 'vague ("something")', 'food'] },
    { q: 'What is the partnership between coral and algae called, and why?', dok: 'DOK 2', anchors: ['wrong', 'names the term OR the reason, not both', 'symbiosis, because both of them need each other to live'] },
    { q: 'How is a coral reef formed?', dok: 'DOK 2', anchors: ['wrong', 'names one step only (polyps build shells / shells stack up)', 'connects the steps (each polyp builds a hard shell, and over hundreds of years the shells stack up to form the reef)'] },
    { q: 'Would you like to explore a coral reef? Why or why not?', dok: 'Oral production', anchors: ['no response', 'yes/no with no reason', 'yes/no with a reason'] },
  ],
  E: [
    { q: 'What was Marcus\'s project for the Science Fair?', dok: 'DOK 1', anchors: ['wrong', 'vague ("a project")', 'a volcano that erupted with fizzy foam'] },
    { q: 'What did Mr. Reyes ask Marcus to hand him?', dok: 'DOK 1', anchors: ['wrong', 'vague ("supplies")', 'the poster board'] },
    { q: 'How did Marcus feel about his project before Mr. Reyes spoke to him?', dok: 'DOK 2', anchors: ['wrong', 'names a feeling with no reference to text', 'nervous/unsure, because he didn\'t think it was as good as other students\' (references text)'] },
    { q: 'How do you think Marcus feels after Mr. Reyes\'s compliment? Use evidence from the story.', dok: 'DOK 2', anchors: ['wrong / no response', 'names a feeling with no evidence', 'names a feeling with evidence (proud / happy / relieved — because Mr. Reyes said his hard work really shows and meant it sincerely)'] },
    { q: 'Have you ever worked hard on something you weren\'t sure was good? What happened?', dok: 'Oral production', anchors: ['no response', 'names something, no detail', 'names something with detail/explanation'] },
  ],
}

const F26_NAEP: G4NaepRow[] = [
  { rating: 1, label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words. Sounds like reading is very hard work.', multiplier: 0.85 },
  { rating: 2, label: 'Choppy phrases', desc: 'Reads in short, two-word phrases. Some pauses in awkward places. Little expression. Starting to group words but not smoothly.', multiplier: 0.95 },
  { rating: 3, label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression. Sounds like the student understands what they are reading.', multiplier: 1.00 },
  { rating: 4, label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation. Smooth pace. Reading sounds easy and natural.', multiplier: 1.10 },
]

// ─── Part 2: Written ─────────────────────────────────────────────────

const F26_LISTENING_SCRIPT = 'Frogs and toads are alike in many ways. They look almost the same. They both have four legs, bulging eyes, and no tail as adults. Their bodies are built for jumping. They both start life as tadpoles in water. Frogs and toads both eat insects.\n\nWhen you look closely, you can see differences between them. Frogs have smooth, moist skin. A toad\'s skin is dry and bumpy. When a frog jumps, it can leap very far. A toad usually takes short hops instead. Another difference is where they live. Frogs stay near water most of the time. Toads can live farther away from water, even in gardens. Both can be found after it rains. But don\'t pick one up too quickly!'

const F26_WRITTEN_SECTIONS: G4WrittenSection[] = [
  { key: 'w_g4_listening', label: 'Listening — Frogs and Toads', shortLabel: 'Li', range: [1, 5], max: 5, standards: ['SL.4.2', 'L.4.3a'] },
  { key: 'w_g4_reading_literary', label: 'Reading — The Crow and the Pitcher', shortLabel: 'RL', range: [6, 10], max: 5, standards: ['RL.4.1', 'RL.4.2', 'RL.4.3'] },
  { key: 'w_g4_language', label: 'Language Standards', shortLabel: 'La', range: [11, 19], max: 9, standards: ['L.4.1a', 'L.4.1b', 'L.4.1e', 'L.4.1f', 'L.4.1g', 'L.4.2a', 'L.4.2c', 'L.4.3a', 'L.3.1g'] },
  { key: 'w_g4_verb_tense', label: 'Language — verb tense and agreement', shortLabel: 'VT', range: [20, 27], max: 8, standards: ['L.4.1b'] },
  { key: 'w_g4_reading_info', label: 'Reading — The Ocean\'s Giant Creatures', shortLabel: 'RI', range: [28, 35], max: 8, standards: ['RI.4.1', 'RI.4.3', 'RI.4.5'] },
  { key: 'w_g4_writing', label: 'Writing — a time you felt proud', shortLabel: 'Wr', range: [36, 36], max: 20, standards: ['W.4.3'] },
]

const F26_READING_PASSAGES: G4ReadingPassage[] = [
  {
    key: 'crow', title: 'The Crow and the Pitcher', range: [6, 10],
    text: 'One hot summer day, Crow was very thirsty. He flew all around, but he could not find any water. Finally, he spotted a tall pitcher sitting near a house. "At last, water!" Crow said. He flew down and looked inside.\n\nThere was water at the bottom of the pitcher, but it was too low for Crow to reach. He pushed his beak down as far as he could, but it was no use. "This water might as well be a kilometer away," Crow said sadly.\n\nCrow thought about knocking the pitcher over, but it was too heavy and tall to tip. He thought about breaking it, but the pitcher was too strong. Just then, Crow noticed a pile of small pebbles nearby.\n\n"I have an idea," Crow said. He picked up a pebble in his beak and dropped it into the pitcher. Then he picked up another, and another. One by one, the pebbles sank to the bottom. Slowly, the water began to rise.\n\nCrow kept dropping pebbles in, one after another, until finally the water rose high enough to reach. Crow dipped his beak in and drank until he was no longer thirsty. "Where there is a will, there is a way," Crow said happily as he flew off.',
  },
  {
    key: 'giants', title: 'The Ocean\'s Giant Creatures', range: [28, 35],
    text: 'Not all sea creatures are small. Some are really big and heavy!\n\nThe blue whale is the heaviest animal, weighing up to 150,000 kilograms. Its huge body helps it store energy for long migrations. Whale sharks, found in warm oceans, are among the heaviest fish. They weigh around 19,000 kilograms.\n\nSea creatures can also be very long. The giant squid has one of the longest bodies of any invertebrate. At over 13 meters long, it is also one of the ocean\'s most mysterious animals. The oarfish has a long, ribbon-like body. It can reach up to 11 meters long.\n\nAll of these giant sea creatures can still face danger from predators. Because of this, they have interesting ways of protecting themselves. For instance, giant squids release clouds of ink to escape predators. Whale sharks have thick skin that helps protect them from bites.',
  },
]

const F26_QUESTIONS: G4QuestionDef[] = [
  // Items 1-5 — Listening: "Frogs and Toads", read aloud twice.
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: Frogs and Toads', text: 'What is this passage mostly about?', choices: ['How frogs and toads are very different', 'How frogs and toads are both alike and different', 'How to catch a frog', 'Why toads live in gardens'], correct: 'b', standard: 'SL.4.2', standardDesc: 'Paraphrase portions of a text read aloud', domain: 'Listening Comprehension', dok: 2, note: 'Main idea. Distractor a captures only the second paragraph — a common error for students who tune in late.' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: Frogs and Toads', text: 'How can you tell a toad\'s skin from a frog\'s?', choices: ['Frogs have dry, bumpy skin', 'Toads have dry, bumpy skin', 'Both have smooth skin', 'Toads have no skin'], correct: 'b', standard: 'SL.4.2', standardDesc: 'Paraphrase portions of a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail. a is the same fact reversed.' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: Frogs and Toads', text: 'What is different about how frogs and toads move?', choices: ['Frogs leap far. Toads take short hops', 'Toads leap far. Frogs take short hops', 'Neither one can jump', 'Both move the exact same way'], correct: 'a', standard: 'SL.4.2', standardDesc: 'Paraphrase portions of a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail. b is the same fact reversed.' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: Frogs and Toads', text: 'Where can toads live that frogs usually cannot?', choices: ['Only in the ocean', 'Farther away from water, even in gardens', 'Only underground', 'Only near ice'], correct: 'b', standard: 'SL.4.2', standardDesc: 'Paraphrase portions of a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail.' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: Frogs and Toads', text: 'What does "bulging" mean in this passage? ("They both have four legs, bulging eyes, and no tail as adults.")', choices: ['Tiny and hidden', 'Sticking out or swollen', 'Closed shut', 'Flat and smooth'], correct: 'b', standard: 'L.4.3a', standardDesc: 'Choose words and phrases to convey ideas precisely', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context (bulging). The sentence is reprinted on the student page.' },
  // Items 6-10 — Reading, literary: "The Crow and the Pitcher".
  { qNum: 6, section: 'reading_literary', sectionLabel: 'Reading: The Crow and the Pitcher', text: 'Why couldn\'t Crow drink the water at first?', choices: ['The pitcher had no water in it', 'The water was too low for his beak to reach', 'The water was too hot', 'The pitcher was locked'], correct: 'b', standard: 'RL.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 1, note: 'Literal recall.' },
  { qNum: 7, section: 'reading_literary', sectionLabel: 'Reading: The Crow and the Pitcher', text: 'What did Crow think about doing before he had his idea?', choices: ['Flying somewhere else to find water', 'Digging a hole under the pitcher', 'Knocking over or breaking the pitcher', 'Asking another bird for help'], correct: 'c', standard: 'RL.4.3', standardDesc: 'Describe in depth a character, setting or event', domain: 'Reading Comprehension', dok: 2, note: 'Sequence — what came before the idea.' },
  { qNum: 8, section: 'reading_literary', sectionLabel: 'Reading: The Crow and the Pitcher', text: 'How did Crow finally get the water to rise?', choices: ['He tipped the pitcher over', 'He poured in more water', 'He broke the pitcher open', 'He dropped pebbles into the pitcher one by one'], correct: 'd', standard: 'RL.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 2, note: 'Cause and effect.' },
  { qNum: 9, section: 'reading_literary', sectionLabel: 'Reading: The Crow and the Pitcher', text: 'What does "sank" mean in this story? ("One by one, the pebbles sank to the bottom.")', choices: ['Floated on top', 'Went down and settled', 'Disappeared completely', 'Bounced back up'], correct: 'b', standard: 'L.4.3a', standardDesc: 'Choose words and phrases to convey ideas precisely', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context (sank). a is the opposite; c is the overreach.' },
  { qNum: 10, section: 'reading_literary', sectionLabel: 'Reading: The Crow and the Pitcher', text: 'What is the lesson of this story?', choices: ['Never trust a pitcher', 'Birds cannot drink water', 'Where there is a will, there is a way', 'Pebbles are dangerous'], correct: 'c', standard: 'RL.4.2', standardDesc: 'Determine a theme of a story from details in the text', domain: 'Reading Comprehension', dok: 2, note: 'Theme / moral. Crow states it aloud in the last line of the story.' },
  // Items 11-19 — Language Standards.
  { qNum: 11, section: 'language', sectionLabel: 'Language Standards', text: 'A _____ of fish swam past the boat.', choices: ['team', 'school', 'group', 'bunch'], correct: 'b', standard: 'L.4.3a', standardDesc: 'Choose words and phrases to convey ideas precisely', domain: 'Language/Grammar', dok: 1, note: 'Collective noun. School is the conventional term for a group of fish.' },
  { qNum: 12, section: 'language', sectionLabel: 'Language Standards', text: 'This is the _____ book I have ever read.', choices: ['good', 'gooder', 'more good', 'best'], correct: 'd', standard: 'L.3.1g', standardDesc: 'Form and use comparative and superlative adjectives', domain: 'Language/Grammar', dok: 1, note: 'Irregular superlative. gooder / more good are the two standard error forms.' },
  { qNum: 13, section: 'language', sectionLabel: 'Language Standards', text: 'The girl _____ won the race is my sister.', choices: ['who', 'what', 'how', 'where'], correct: 'a', standard: 'L.4.1a', standardDesc: 'Use relative pronouns and relative adverbs', domain: 'Language/Grammar', dok: 1, note: 'Relative pronoun with a human antecedent.' },
  { qNum: 14, section: 'language', sectionLabel: 'Language Standards', text: 'I _____ my homework right now.', choices: ['do', 'did', 'am doing', 'done'], correct: 'c', standard: 'L.4.1b', standardDesc: 'Form and use the progressive verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Present progressive, cued by right now.' },
  { qNum: 15, section: 'language', sectionLabel: 'Language Standards', text: 'The cat hid _____ the couch.', choices: ['is', 'quickly', 'jump', 'under'], correct: 'd', standard: 'L.4.1e', standardDesc: 'Form and use prepositional phrases', domain: 'Language/Grammar', dok: 1, note: 'Prepositional phrase. The three distractors are other parts of speech.' },
  { qNum: 16, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence is complete?', choices: ['Running fast down the street.', 'The dog ran fast down the street.', 'Down the street fast.', 'Fast running street the.'], correct: 'b', standard: 'L.4.1f', standardDesc: 'Produce complete sentences; recognize fragments and run-ons', domain: 'Language/Grammar', dok: 2, note: 'a is a participial fragment; c is a prepositional fragment; d is scrambled.' },
  { qNum: 17, section: 'language', sectionLabel: 'Language Standards', text: 'I have _____ pencils in my bag.', choices: ['to', 'too', 'tooe', 'two'], correct: 'd', standard: 'L.4.1g', standardDesc: 'Correctly use frequently confused words', domain: 'Language/Grammar', dok: 1, note: 'Homophones.' },
  { qNum: 18, section: 'language', sectionLabel: 'Language Standards', text: 'We visited _____ last summer.', choices: ['New York City', 'new york City', 'new york city', 'New york city'], correct: 'a', standard: 'L.4.2a', standardDesc: 'Use correct capitalization', domain: 'Language/Mechanics', dok: 1, note: 'Capitalization of proper nouns.' },
  { qNum: 19, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence uses commas correctly?', choices: ['I wanted to go but I was tired.', 'I wanted to go, but I was tired.', 'I wanted to go but, I was tired.', 'I wanted, to go but I was tired.'], correct: 'b', standard: 'L.4.2c', standardDesc: 'Use a comma before a coordinating conjunction in a compound sentence', domain: 'Language/Mechanics', dok: 2, note: 'Comma before a coordinating conjunction in a compound sentence.' },
  // Items 20-27 — Verb tense and agreement.
  { qNum: 20, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'The boy _____ to school every day.', choices: ['walk', 'walked', 'walks', 'walking'], correct: 'c', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Subject-verb agreement, third person singular, habitual present (every day).' },
  { qNum: 21, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'My friends _____ soccer after school.', choices: ['plays', 'played', 'playing', 'play'], correct: 'd', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Agreement with a plural subject (my friends).' },
  { qNum: 22, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Either the cat or the dogs _____ outside right now.', choices: ['is', 'are', 'am', 'be'], correct: 'b', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 2, note: 'Either/or agreement — the verb agrees with the nearer subject (the dogs). The hardest item in the section.' },
  { qNum: 23, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Right now, she _____ her homework.', choices: ['is doing', 'do', 'does', 'did'], correct: 'a', standard: 'L.4.1b', standardDesc: 'Form and use the progressive verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Present progressive, cued by right now.' },
  { qNum: 24, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Yesterday at this time, they _____ in the pool.', choices: ['swim', 'swimmed', 'were swimming', 'swims'], correct: 'c', standard: 'L.4.1b', standardDesc: 'Form and use the progressive verb tenses', domain: 'Language/Grammar', dok: 2, note: 'Past progressive, cued by yesterday at this time. swimmed is the overregularized error form.' },
  { qNum: 25, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Next week, we _____ camping.', choices: ['go', 'went', 'going', 'will be going'], correct: 'd', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Future, cued by next week.' },
  { qNum: 26, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Every morning, the sun _____ in the east.', choices: ['rise', 'rises', 'rose', 'rising'], correct: 'b', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Habitual / general truth, third person singular.' },
  { qNum: 27, section: 'verb_tense', sectionLabel: 'Language: verb tense and agreement', text: 'Last night, the wind _____ very hard.', choices: ['blew', 'blow', 'blows', 'blowing'], correct: 'a', standard: 'L.4.1b', standardDesc: 'Form and use verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Irregular simple past, cued by last night.' },
  // Items 28-35 — Reading, informational: "The Ocean's Giant Creatures".
  { qNum: 28, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'What is the heaviest animal in the ocean?', choices: ['Whale shark', 'Giant squid', 'Blue whale', 'Oarfish'], correct: 'c', standard: 'RI.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 1, note: 'Literal recall.' },
  { qNum: 29, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'How does a giant squid protect itself from predators?', choices: ['It hides in sand', 'It releases clouds of ink', 'It swims very fast', 'It has thick skin'], correct: 'b', standard: 'RI.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 1, note: 'Literal recall. d (thick skin) is the whale shark\'s defense — a plausible cross-detail distractor.' },
  { qNum: 30, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'Which creature has a long, ribbon-like body?', choices: ['Blue whale', 'Whale shark', 'Giant squid', 'Oarfish'], correct: 'd', standard: 'RI.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 1, note: 'Literal recall.' },
  { qNum: 31, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'What helps the blue whale store energy for long migrations?', choices: ['Its huge body', 'Its fins', 'Its skin', 'Its teeth'], correct: 'a', standard: 'RI.4.3', standardDesc: 'Explain events, procedures, ideas or concepts in a text', domain: 'Reading Comprehension', dok: 2, note: 'Cause and effect (RI.4.3).' },
  { qNum: 32, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'Why do these giant sea creatures need special ways to protect themselves?', choices: ['Because they live in warm oceans', 'Because they can still face danger from predators', 'Because they cannot swim fast', 'Because they are heavier than other animals'], correct: 'b', standard: 'RI.4.3', standardDesc: 'Explain events, procedures, ideas or concepts in a text', domain: 'Reading Comprehension', dok: 2, note: 'Cause and effect. The passage states this directly in the final paragraph.' },
  { qNum: 33, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'Based on the passage, what do the giant squid and whale shark have in common?', choices: ['Both use ink to escape predators', 'Both are among the largest creatures in the ocean', 'Both are delicious', 'Both have ribbon-like bodies'], correct: 'b', standard: 'RI.4.1', standardDesc: 'Refer to details and examples when explaining the text', domain: 'Reading Comprehension', dok: 2, note: 'Synthesis across paragraphs — the student must combine the size facts from two separate sections.' },
  { qNum: 34, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'What does "migrations" most likely mean in this passage? ("Its huge body helps it store energy for long migrations.")', choices: ['Sudden bursts of speed', 'Fights with predators', 'Long journeys from one place to another', 'Periods of sleep'], correct: 'c', standard: 'L.4.3a', standardDesc: 'Choose words and phrases to convey ideas precisely', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context (migrations). The sentence is reprinted on the student page.' },
  { qNum: 35, section: 'reading_info', sectionLabel: 'Reading: The Ocean\'s Giant Creatures', text: 'Why might the author have organized this passage by "heaviest" and "longest" instead of listing facts randomly?', choices: ['To make the passage longer', 'To help readers compare and understand different types of size', 'To confuse the reader', 'Because heaviest animals are always the longest too'], correct: 'b', standard: 'RI.4.5', standardDesc: 'Describe the overall structure of events, ideas or information in a text', domain: 'Reading Comprehension', dok: 3, note: 'Text structure / author\'s purpose (RI.4.5). The hardest item on the written test.' },
]

// ─── Item 36: Writing ────────────────────────────────────────────────

const F26_WRITING_CATEGORIES: G4WritingCategory[] = [
  { key: 'story_structure', label: 'Story Structure', max: 4, standard: 'W.4.3', standardDesc: 'Clear event sequence', kind: 'ladder' },
  {
    key: 'content', label: 'Content and Detail', max: 4, standard: 'W.4.3', standardDesc: 'What the writing shows', kind: 'checklist',
    checklist: [
      { key: 'accomplishment', label: 'Names the accomplishment', desc: 'Says specifically what they did, not just that they were proud. "I won the swimming race" counts; "I did a good thing" does not.' },
      { key: 'people_place', label: 'People and place', desc: 'Says where it happened, or who else was there. Answers the prompt\'s "Who else knew about it?"' },
      { key: 'feelings', label: 'Feelings', desc: 'States how they felt at some point in the story — nervous before, proud after, surprised, relieved. Any named feeling counts.' },
      { key: 'beyond_summary', label: 'Beyond the summary', desc: 'Any one of: dialogue, an inner thought, a sensory detail, a specific moment described closely, or a reflection on why it mattered.' },
    ],
    checklistCap: {
      note: 'Length gate. This is the only place length affects the score.',
      tiers: [
        { key: 'under5', label: 'Fewer than 5 sentences', desc: 'Caps this category at 2, however many features it shows.', cap: 2 },
      ],
    },
  },
  { key: 'language_grammar', label: 'Language and Grammar', max: 4, standard: 'L.4.1', standardDesc: 'Sentence variety and agreement', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.4.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
  { key: 'word_choice', label: 'Word Choice and Voice', max: 4, standard: 'L.4.3', standardDesc: 'Precision and voice', kind: 'ladder' },
]

const F26_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  story_structure: {
    0: 'No sentences written on the lined page (blank, or planning notes only).',
    1: 'Writing present but no identifiable structure — random sentences or a list of observations.',
    2: 'Attempts a beginning and middle but no clear ending, OR events are out of order.',
    3: 'Has a beginning, middle, and end, but one part is weak or has a gap.',
    4: 'Clear beginning, middle, and end. Events are well-sequenced, with a clear sense of how the accomplishment came about. Easy to follow.',
  },
  language_grammar: {
    0: 'No intelligible English sentences.',
    1: 'Significant errors make meaning difficult. Some English structure present.',
    2: 'Frequent errors that sometimes interfere with meaning. Repetitive sentence patterns ("I did… I did… I was…").',
    3: 'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, dialogue, different sentence starters).',
    4: 'Mostly correct grammar. Varied structures including compound and complex sentences. Consistent verb tenses and subject-verb agreement. Dialogue punctuated correctly or nearly so.',
  },
  mechanics: {
    0: 'No evidence of capitalization, punctuation, or recognizable spelling.',
    1: 'Minimal punctuation and capitalization. Many misspellings, but words are recognizable.',
    2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled.',
    3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled.',
    4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Quotation marks attempted for dialogue. More advanced word choice.',
  },
  word_choice: {
    0: 'No intelligible English sentences.',
    1: 'Isolated English words only. There is not enough writing to judge word choice.',
    2: 'Relies on the most general words available (good, big, nice, happy, said, went, fun) and repeats them throughout. Feelings are named only in the broadest terms (I was happy). Little sense of a writer behind the words.',
    3: 'Some specific or stronger choices appear (excited, finally, shouted, tried again) alongside the general ones. The writing sounds like the student in places — an aside, a reaction, a sentence that is theirs.',
    4: 'Precise, varied word choice throughout: specific verbs and adjectives instead of general ones, and feelings named exactly (nervous, relieved, proud rather than good). A clear voice — the reader can hear the student telling the story rather than reporting it.',
  },
}

const F26_STANDARDS: G4StandardBaseline[] = [
  { code: 'RF.4.4a', domain: 'Fluency', gradeLevel: '4',
    description: 'Read grade-level text with purpose and understanding',
    testSection: 'o_g4_comp', masteryThreshold: 5 },
  { code: 'RF.4.4b', domain: 'Fluency', gradeLevel: '4',
    description: 'Read grade-level prose orally with accuracy, appropriate rate, and expression',
    testSection: 'o_g4_naep', masteryThreshold: 3 },
  { code: 'SL.4.2', domain: 'Listening', gradeLevel: '4',
    description: 'Paraphrase portions of a text read aloud',
    testSection: 'w_g4_listening', masteryThreshold: 4 },
  { code: 'RL.4.1', domain: 'Reading Lit', gradeLevel: '4',
    description: 'Refer to details and examples when explaining the text and drawing inferences',
    testSection: 'w_g4_reading_literary', masteryThreshold: 4 },
  { code: 'L.4.1', domain: 'Language', gradeLevel: '4',
    description: 'Demonstrate command of the conventions of standard English grammar',
    testSection: 'w_g4_language', masteryThreshold: 6 },
  { code: 'L.4.1b', domain: 'Language', gradeLevel: '4',
    description: 'Form and use the progressive verb tenses',
    testSection: 'w_g4_verb_tense', masteryThreshold: 6 },
  { code: 'RI.4.1', domain: 'Reading Info', gradeLevel: '4',
    description: 'Refer to details and examples when explaining the text',
    testSection: 'w_g4_reading_info', masteryThreshold: 6 },
  { code: 'W.4.3', domain: 'Writing', gradeLevel: '4',
    description: 'Write narratives to develop real experiences using effective technique and descriptive details',
    testSection: 'w_g4_writing', masteryThreshold: 11 },
]

const FALL_2026_CONTENT: G4Content = {
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
      'Count as errors: mispronunciations, omitted words, substitutions, words supplied by the teacher, and hesitations longer than 3 seconds.',
      'Do NOT count self-corrections, repetitions, or dialect/L1 accent features that do not change the word.',
    ],
    readingLevels: [
      { level: 'Independent', accuracy: '97-100%', comprehension: '8-10 / 10', action: 'The passage is too easy. Move up one level and re-test.' },
      { level: 'Instructional', accuracy: '90-96%', comprehension: '5-7 / 10', action: 'This is the placement level. Stop here.' },
      { level: 'Frustration', accuracy: 'below 90%', comprehension: '0-4 / 10', action: 'Move down one level and re-test.' },
    ],
    disagreementRule: 'When accuracy and comprehension disagree, comprehension decides. A student who reads at 98% accuracy but answers 4/10 has decoded without understanding: that is Frustration, not Independent, and the placement is one level down. A student at 89% accuracy who answers 8/10 is Instructional — keep them at that level.',
    frustrationCompMax: 4,
    independentCompMin: 8,
    adminNotes: [
      'Level selection is the teacher\'s judgment. Use the student\'s classroom reading level, last term\'s placement, or a quick look at how they handle the first two lines. When in doubt, start one level BELOW where you expect them — it is easier to move a confident reader up than to recover a discouraged one.',
      'Components 1 and 2 are administered together at the student\'s selected level.',
      'Let the timer run to the end of the passage. The app takes the 60-second mark automatically for CWPM.',
      'A student who is clearly struggling should be stopped at roughly 60 seconds. Do NOT ask the comprehension questions — check the comprehension-not-administered box rather than leaving it blank or entering zero, which would read as a wrong-answer score.',
      'Questions may be repeated once, verbatim. Do not rephrase, prompt, or supply vocabulary.',
      'One-passage-down rule: never move a student down more than one level in a single sitting, and never move up more than one level after a re-read. If a student is at Frustration on Level A, stop — the placement is Level A and the oral test is complete.',
      'Record the final level as the last passage read at Instructional or better.',
    ],
    timing: {
      struggleStopSeconds: 60,
      note: 'Let the timer run to the end for a capable reader; the app takes the 60-second mark for CWPM. Stop a clearly struggling reader at roughly 60 seconds.',
    },
  },
  written: {
    total: 55,
    mcMax: 35,
    minutes: 45,
    sections: F26_WRITTEN_SECTIONS,
    questions: F26_QUESTIONS,
    listening: {
      script: F26_LISTENING_SCRIPT,
      instructions: 'Read the script aloud twice, at a natural pace, before students answer. Pause briefly between the two paragraphs. Do not define words, do not emphasize the answers with your voice, and do not repeat individual sentences on request. After the second reading, tell students to answer items 1-5.',
      say: 'I am going to read you a short passage two times. Listen carefully. You may not ask me to repeat it. After I finish, answer questions 1 to 5.',
    },
    passages: F26_READING_PASSAGES,
    scoringNote: 'Multiple-choice items are worth 1 point each.',
    adminNote: 'Administered whole-class. Allow approximately 45 minutes. The Listening section must be read aloud by the teacher before students begin the rest of the test.',
    bands: [
      { min: 0, max: 16, label: 'Emerging', reading: 'Below the level the test is written for. Read the section percentages, not the total — the placement information is in which section collapsed.' },
      { min: 17, max: 30, label: 'Developing', reading: 'Handles literal comprehension and simple grammar; loses points on inference, aspect, and extended writing.' },
      { min: 31, max: 43, label: 'Proficient', reading: 'On level for Grade 4.' },
      { min: 44, max: 55, label: 'Advanced', reading: 'Consider the next level up. Confirm against the oral result before moving the student.' },
    ],
    bandCaution: 'Do not place a student on the written total alone. The oral result and the section breakdown carry more information than the single number — a student who loses most of their points in one section is telling you something the total hides.',
  },
  writing: {
    item: 36,
    prompt: 'Write about a time you felt proud of something you did. What did you do? Why were you proud? Who else knew about it? Include beginning, middle, and end. You can add any details you want to make the story fun and interesting. Write at least 10 sentences.',
    say: 'Write your story on the lined page. Write at least ten sentences. There is a space to plan first if you want it, but you don\'t have to use it. If you don\'t know how to spell a word, write it the best way you can and keep going.',
    targetSentences: 10,
    categories: F26_WRITING_CATEGORIES,
    max: 20,
    rubric: F26_WRITING_RUBRIC,
    notes: [
      'The brainstorm space is optional and is NOT scored. Do not tell students it is required, do not deduct for leaving it blank, and do not read it when scoring — only the lined response counts.',
      'A student who plans entirely in their head and writes a strong story is not penalized, and a student with a full brainstorm and three sentences of writing earns no credit for the planning.',
      'Score each category independently. Do not let one category pull the others down. A student with a vivid, well-shaped story and no capital letters can still score 4 + 4 + 3 + 1 + 4 = 16.',
      'Whole points only. If you are torn between two scores, award the higher one only if every part of that descriptor is met.',
      'Only Content and Detail is a checklist. The other four are ladders — find the highest row that describes the writing and score there.',
      'Content is scored on ideas, not on English accuracy. Broken English that still shows a feature earns the box: "my mom she very happy she say wow" earns both People and place and Beyond the summary. Language and Mechanics carry the accuracy.',
      'Under Mechanics, phonetic spelling of a word a Grade 4 student would not be expected to know (championchip, embarased) is not penalized. Only high-frequency words count.',
      'Handwriting neatness and line placement are not scored.',
      'A response written entirely in Korean scores 0 across all five categories. A response with occasional Korean words inside English sentences is scored normally, with the Korean words treated as unknown vocabulary.',
      'Do not supply topic ideas, do not translate the prompt, and do not spell words on request. If a student cannot think of anything, prompt only with the questions already on the page ("Who else knew about it?").',
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
    'Item 36 rubric: the teacher\'s guide and the rubric page reprinted on the student copy score DIFFERENT categories. The guide scores Story Structure, Content and Detail, Language and Grammar, Mechanics, and Word Choice and Voice. The student copy scores Brainstorm/Planning, Story Structure, Content and Detail, Language and Grammar, and Mechanics — awarding up to 4 points for the planning box that the guide states three separate times is not scored at all, and omitting Word Choice and Voice entirely. The guide is used here. The student copy\'s rubric page should be replaced before teachers mark from it.',
    'Item 36 Content and Detail: the guide scores this as a four-feature checklist with a length gate (under five sentences caps it at 2). The student copy scores it as a sentence-count ladder (1-4 sentences = 1, 10+ = 4). The guide is used here.',
    'Passage D (Coral Reefs): rewritten from the guide\'s version into plainer wording for Grade 4 — the reef types are now described rather than named (fringing/barrier/atoll), and the closing line drops "ecosystem." Word count is 191 as printed here, not the guide\'s 193. Score the running record against this text, not the guide\'s.',
    'All 35 multiple-choice keys agree between the guide\'s per-item tables, the guide\'s consolidated key, and the printed student copy. No answer-key conflicts on this paper.',
  ],
}

// ============================================================================
// REGISTRY
// ============================================================================

export const G4_LEGACY_VERSION = 'legacy'

const G4_VERSIONS: Record<string, G4Content> = {
  '2026-2027:fall': FALL_2026_CONTENT,
}

export function g4VersionKeyForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): string {
  if (!test?.academic_year || !test?.semester) return G4_LEGACY_VERSION
  const key = `${test.academic_year}:${test.semester}`
  return G4_VERSIONS[key] ? key : G4_LEGACY_VERSION
}

export function getG4Content(versionKey: string = G4_LEGACY_VERSION): G4Content | null {
  return G4_VERSIONS[versionKey] || null
}

export function g4ContentForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): G4Content | null {
  return getG4Content(g4VersionKeyForTest(test))
}

export function g4WrittenTotalMax(content: G4Content): number {
  return content.written.mcMax + content.writing.max
}

/**
 * Every CCSS code this grade tests, mapped to the guide's own wording.
 *
 * Walks all authored versions, so a history view can name a standard from a
 * test written years ago. Scores persist only the code and the met/total, and
 * a bare "RI.4.1" tells a teacher nothing about what was actually asked.
 */
export function g4StandardDescriptions(): Record<string, string> {
  const out: Record<string, string> = {}
  Object.values(G4_VERSIONS).forEach(c => {
    c.written.questions.forEach(q => { if (q.standard && q.standardDesc) out[q.standard] = q.standardDesc })
    c.writing.categories.forEach(cat => { if (cat.standard && cat.standardDesc) out[cat.standard] = cat.standardDesc })
  })
  return out
}
