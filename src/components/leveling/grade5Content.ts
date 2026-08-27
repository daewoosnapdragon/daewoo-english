// ============================================================================
// GRADE 5 LEVEL TEST CONTENT — VERSIONED
// ============================================================================
// Scores are stored as answers keyed by question number alone -- {7:'b'} -- and
// never record what Q7 actually was. So this content must NEVER be edited in
// place once a test has been scored.
// ============================================================================

export type G5PassageLevel = 'A' | 'B' | 'C' | 'D' | 'E'

export interface G5CompQuestion {
  q: string
  dok: string
  anchors: [string, string, string]
  /** Worked examples the guide gives for this question. */
  examples?: string[]
}

export interface G5Passage {
  title: string
  text: string
  wordCount: number
  passageWeight: number
  textType: string
  note?: string
}

export interface G5NaepRow {
  rating: number
  label: string
  desc: string
  multiplier: number
}

export interface G5QuestionDef {
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
  note?: string
}

export interface G5WrittenSection {
  key: string
  label: string
  shortLabel: string
  range: [number, number]
  max: number
  standards: string[]
}

export interface G5ReadingPassage {
  key: string
  title: string
  text: string
  range: [number, number]
}

/**
 * A gate the checklist boxes cannot express on their own. Grade 5's writing
 * item caps Content at 3 under twelve sentences and at 2 under eight, so the
 * cap is a set of tiers the teacher picks from rather than a single switch.
 */
export interface G5ChecklistCap {
  note: string
  tiers: { key: string; label: string; desc: string; cap: number }[]
}

export interface G5WritingCategory {
  key: string
  label: string
  max: number
  standard: string
  standardDesc: string
  kind: 'ladder' | 'checklist'
  checklist?: { key: string; label: string; desc: string }[]
  checklistCap?: G5ChecklistCap
}

export interface G5StandardBaseline {
  code: string
  domain: string
  gradeLevel: string
  description: string
  testSection: string
  masteryThreshold: number
}

export interface G5Content {
  version: string
  label: string
  oral: {
    total: number
    minutesPerStudent: string
    say: string
    passages: Record<G5PassageLevel, G5Passage>
    compQuestions: Record<G5PassageLevel, G5CompQuestion[]>
    naep: G5NaepRow[]
    compMax: number
    compQuestionCount: number
    errorRules: string[]
    readingLevels: { level: string; accuracy: string; comprehension: string; action: string }[]
    disagreementRule: string
    frustrationCompMax: number
    independentCompMin: number
    adminNotes: string[]
    timing: { struggleStopSeconds: number; note: string }
  }
  written: {
    total: number
    mcMax: number
    minutes: number
    sections: G5WrittenSection[]
    questions: G5QuestionDef[]
    listening: { script: string; instructions: string; say: string }
    passages: G5ReadingPassage[]
    scoringNote: string
    adminNote: string
    bands: { min: number; max: number; label: string; reading: string }[]
    bandCaution: string
  }
  /**
   * Item 13. Scored as a four-element checklist rather than a ladder, so it
   * shares the writing rubric's checklist shape rather than the 0..max scale
   * Grade 3's short item uses.
   */
  shortWriting: {
    item: number
    prompt: string
    max: number
    checklist: { key: string; label: string; desc: string }[]
    scoringNote: string
    workedExamples: string[]
    notes: string[]
  }
  writing: {
    item: number
    prompt: string
    say: string
    targetSentences: number
    categories: G5WritingCategory[]
    max: number
    rubric: Record<string, Record<number, string>>
    notes: string[]
    bands: { min: number; max: number; label: string }[]
  }
  standards: G5StandardBaseline[]
  documentNotes: string[]
}

// ============================================================================
// FALL 2026 CONTENT
// ============================================================================
// Source: "Grade 5 Level Test — Fall 2026, Teacher's Guide and Scoring Sheets
// (Revised Edition)" plus the Oral and Written student copies. Oral 10 pts
// comprehension; written 47 pts (23 MC + 4 short response + 20 writing).

const F26_PASSAGES: Record<G5PassageLevel, G5Passage> = {
  A: {
    title: 'The New Kid',
    text: 'Today was Ben\'s first day at a new school. He walked into the cafeteria. All the tables were full. He did not know where to sit. Ben felt nervous.\n\nA girl waved at him from her table. "You can sit here!" she said.\n\nBen walked over and sat down. "Thanks," he said. "I\'m Ben."\n\n"I\'m Amy," the girl said. "Are you new here?"\n\n"Yes, today is my first day," Ben said.\n\n"I remember my first day," Amy said. "It was scary too. But you\'ll like it here!"\n\nBen smiled. He was happy he had someone to sit with.',
    wordCount: 98, passageWeight: 1.00, textType: 'Narrative with dialogue',
  },
  B: {
    title: 'My First Cake',
    text: 'I decided to bake a cake for my mom\'s birthday. I was so excited! I thought it would be easy since I had watched so many baking videos.\n\nMy first try did not go well. I forgot to add sugar, and the cake came out flat and dry. I tried again. This time, I mixed the batter too much, and the cake turned out tough and chewy.\n\nMy older sister saw me getting frustrated and came over. "You have to follow the recipe exactly," she said. I gave it one more try, reading each step carefully. This time, the cake came out soft and fluffy.\n\nIt\'s still not perfect, but I\'m getting better with practice. Maybe by my own birthday, I\'ll be able to bake a cake all by myself.',
    wordCount: 130, passageWeight: 1.15, textType: 'First-person narrative, character change',
  },
  C: {
    title: 'The Community Garden',
    text: 'As seasons change, so do jobs in a community garden. Meet your neighbors at the spring planting day. You can dig holes and plant seeds. You can water new plants too. Take along your gloves and help. Could there be a job for you?\n\nWalk through the garden in the warm summer sun. Maybe you\'ll see a red tomato or two. You can pick fresh vegetables. You can share them with your neighbors. Be sure to bring a basket to carry them home!\n\nDo colorful leaves cover the ground in your garden each fall? If so, raking leaves is lots of fun. You can also pick pumpkins. Maybe it is too cold or rainy to go outside. A trip to the garden\'s greenhouse is a great way to spend the day. You can start new seeds inside. You can also water the winter plants.\n\nAfterward, you can take home fresh vegetables to cook. Delicious!',
    wordCount: 154, passageWeight: 1.25, textType: 'Informational, second-person address',
  },
  D: {
    title: 'Should Kids Choose Their Own Bedtime?',
    text: 'Some kids think they should get to pick their own bedtime. Other kids—and most parents—disagree. Who is right?\n\nKids who want to choose their own bedtime have a few good points. They say every person is different, so one bedtime does not work for everyone. Some kids feel wide awake at 8:00 p.m. and can\'t fall asleep no matter how hard they try. They argue that being forced to lie in bed awake doesn\'t actually help anyone get more rest.\n\nOn the other hand, many doctors say kids need a set bedtime for good reasons. Growing bodies and brains need eight to twelve hours of sleep each night, depending on age. Without enough sleep, it\'s harder to pay attention in school, control emotions, and even fight off colds. Doctors also point out that kids are not always the best judges of how tired they really are.\n\nA few families have found a middle ground. They let their kids pick a bedtime within a certain range, like anytime between 8:00 and 8:30. That way, kids get some choice, but parents make sure there\'s still enough sleep.\n\nWhat do you think? Should kids get to choose their own bedtime, or should parents decide?',
    // The guide's table says 204. The passage is 203 words once the two
    // em-dashed pairs are counted as two words each, which is how the running
    // record now tokenizes them. Recorded as 203 so the label matches the boxes.
    wordCount: 203, passageWeight: 1.40, textType: 'Argument, two sides plus compromise',
    note: 'Reading the times aloud. "8:00 p.m." and "between 8:00 and 8:30" are counted as read correctly whatever form the student uses — eight o\'clock, eight p.m., eight PM. Do not mark an error for time-format convention.',
  },
  E: {
    title: 'Should Athletes Be Paid More Than Teachers or Doctors?',
    text: 'Every year, professional athletes sign contracts worth millions of dollars, while teachers and doctors often earn far less. Is this fair?\n\nSupporters argue that pay reflects how much people are willing to pay to watch someone perform. Millions of fans buy tickets and jerseys to watch stars like Son Heung-min, whose success has brought pride to an entire country and inspired countless young athletes to play soccer. Because professional sports make so much money through tickets, ads, and media deals, advocates believe top athletes deserve a share of that income.\n\nOpponents disagree. Teachers help shape the next generation, and doctors save lives every day, yet their pay rarely comes close to a star athlete\'s salary. They argue that pay should reflect how much a job truly matters to society, not simply how popular it is.\n\nExperts explain that this happens because there are only a few athletes as skilled as Son Heung-min, while many people are capable of becoming teachers or doctors. When something is rare, people are often willing to pay more for it.\n\nShould pay be based on popularity, or should society find a better way to reward professions like teaching and medicine?',
    wordCount: 195, passageWeight: 1.50, textType: 'Argument with an economic concept (scarcity)',
  },
}

const F26_COMP_QUESTIONS: Record<G5PassageLevel, G5CompQuestion[]> = {
  A: [
    { q: 'Why did Ben feel nervous?', dok: 'DOK 1', anchors: ['wrong', 'vague ("he was scared")', 'he did not know where to sit — accept "the tables were full" or "it was his first day"'] },
    { q: 'What did Amy do to help Ben?', dok: 'DOK 1', anchors: ['wrong', 'vague ("she helped him")', 'she invited him to sit at her table — "she waved at him" also counts'] },
    { q: 'What did Amy say about her own first day?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it was hard")', 'it was scary too, but she said he would like it there'] },
    { q: 'How do you think Ben felt at the end of the story? Why?', dok: 'DOK 2', anchors: ['wrong', 'names a feeling with no reference to text', 'names a feeling with a reason (happy — he had someone to sit with)'] },
    { q: 'Have you ever been new somewhere? What happened?', dok: 'Oral production', anchors: ['no response', 'names a situation, no detail', 'names a situation with detail'] },
  ],
  B: [
    { q: 'What went wrong with the first cake?', dok: 'DOK 1', anchors: ['wrong', 'vague ("it was bad")', 'they forgot to add sugar, so it was flat and dry'] },
    { q: 'What advice did the sister give?', dok: 'DOK 1', anchors: ['wrong', 'vague ("she gave advice")', 'follow the recipe exactly'] },
    { q: 'How did the third cake turn out?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it got better")', 'soft and fluffy, unlike the flat/dry or tough/chewy earlier cakes (references text)'] },
    { q: 'How did the narrator\'s feelings about baking change from the beginning of the story to the end?', dok: 'DOK 2', anchors: ['wrong', 'names one feeling only (excited OR frustrated)', 'names both — started excited, got frustrated after two failed tries, ended hopeful/more confident after improving'] },
    { q: 'Have you ever tried something that was harder than you expected? What happened?', dok: 'Oral production', anchors: ['no response', 'names something, no detail', 'names something with detail'] },
  ],
  C: [
    { q: 'What can you do at the spring planting day?', dok: 'DOK 1', anchors: ['wrong', 'names one activity', 'names two or more (dig holes, plant seeds, water new plants)'] },
    { q: 'What should you bring to carry your vegetables home?', dok: 'DOK 1', anchors: ['wrong', 'vague ("something")', 'a basket'] },
    { q: 'What can you do in the garden during fall?', dok: 'DOK 2', anchors: ['wrong', 'names one activity', 'names two or more (rake leaves, pick pumpkins)'] },
    { q: 'What can you do in the greenhouse on a cold or rainy day?', dok: 'DOK 2', anchors: ['wrong', 'names one activity', 'names two or more (start new seeds inside, water the winter plants)'] },
    { q: 'Have you ever grown something in a garden? What was it?', dok: 'Oral production', anchors: ['no response', 'yes/no with no detail', 'names a plant or vegetable with detail (what it was, where, or what happened)'] },
  ],
  D: [
    { q: 'What is one reason kids give for wanting to choose their own bedtime?', dok: 'DOK 1', anchors: ['wrong', 'vague ("they want to")', 'every person is different, so one bedtime doesn\'t work for everyone (or: some kids aren\'t tired at a set time)'] },
    { q: 'How much sleep do doctors say growing kids need each night?', dok: 'DOK 1', anchors: ['wrong', 'vague ("a lot")', 'eight to twelve hours (depending on age)'] },
    { q: 'What can happen if kids don\'t get enough sleep, according to the passage?', dok: 'DOK 2', anchors: ['wrong', 'names one effect', 'names two or more (harder to pay attention, control emotions, fight off colds)'] },
    { q: 'How does the "middle ground" solution try to satisfy both sides of the debate?', dok: 'DOK 2', anchors: ['wrong', 'vague ("it\'s a compromise")', 'kids get some choice (a range of times), but parents still make sure there\'s enough sleep'] },
    { q: 'What do you think — should kids choose their own bedtime, or should parents decide? Why?', dok: 'Oral production', anchors: ['no response', 'states an opinion, no reason', 'states an opinion with a reason'] },
  ],
  E: [
    { q: 'What is one reason supporters give for high athlete salaries?', dok: 'DOK 1', anchors: ['wrong', 'vague ("they\'re famous")', 'pay reflects what fans are willing to pay, or sports generate huge revenue'] },
    { q: 'What is one reason opponents disagree with high athlete pay?', dok: 'DOK 1', anchors: ['wrong', 'vague ("it\'s unfair")', 'teachers and doctors do essential work but earn much less'] },
    { q: 'Why do experts say athletes like Son Heung-min are paid so much?', dok: 'DOK 2', anchors: ['wrong', 'vague ("they\'re special")', 'there are only a few athletes as skilled as him, and rare things often cost more'] },
    {
      q: 'Can you think of another reason someone might agree or disagree with high athlete pay?', dok: 'DOK 3',
      anchors: ['no response, or a reason unrelated to the topic', 'restates a reason already in the passage, with something added', 'gives a new, relevant reason not stated in the text'],
      examples: [
        'Score 2: "Athletes only have a short career, so they need to earn a lot quickly." / "If teachers were paid more, more smart people would want to be teachers."',
        'Score 1: "Because a lot of people watch sports on TV and buy things" (the revenue argument, already in paragraph 2, with an addition).',
        'Score 0: "I like soccer."',
      ],
    },
    { q: 'Do you think athletes should be paid more than teachers or doctors? Why or why not?', dok: 'Oral production', anchors: ['no response', 'states an opinion, no reason', 'states an opinion with a reason'] },
  ],
}

const F26_NAEP: G5NaepRow[] = [
  { rating: 1, label: 'Word-by-word', desc: 'Reads one word at a time. Long pauses between words. No expression. May sound out most words. Sounds like reading is very hard work.', multiplier: 0.85 },
  { rating: 2, label: 'Choppy phrases', desc: 'Reads in short, two-word phrases. Some pauses in awkward places. Little expression. Starting to group words but not smoothly.', multiplier: 0.95 },
  { rating: 3, label: 'Appropriate phrasing', desc: 'Reads in longer phrases. Mostly smooth with a few breaks. Some expression. Sounds like the student understands what they are reading.', multiplier: 1.00 },
  { rating: 4, label: 'Smooth and expressive', desc: 'Reads in natural phrases, like talking. Adjusts voice for dialogue and punctuation. Smooth pace. Reading sounds easy and natural.', multiplier: 1.10 },
]

// ─── Part 2: Written ─────────────────────────────────────────────────

const F26_LISTENING_SCRIPT = 'Baking bread is a very old job. In the past, bakers mixed dough by hand. This took a long time. It was hard work.\n\nOvens were different too. Old ovens burned wood or coal. Bakers had to watch the fire closely. If the fire got too hot, the bread would burn.\n\nToday, many bakers use machines to mix dough. The machines save time. They also make the dough the same every time.\n\nOvens today use electricity or gas. Bakers can set the exact temperature they need. This helps the bread bake just right, every single time.\n\nThese changes help bakers make more bread, faster. The bread also tastes the same, no matter who bakes it.'

const F26_WRITTEN_SECTIONS: G5WrittenSection[] = [
  { key: 'w_g5_listening', label: 'Listening — Baking Bread', shortLabel: 'Li', range: [1, 5], max: 5, standards: ['SL.5.2', 'SL.5.3'] },
  { key: 'w_g5_reading', label: 'Reading — Night Animals', shortLabel: 'Rd', range: [6, 12], max: 7, standards: ['RI.5.1', 'RI.5.2', 'RI.5.3', 'RI.5.4'] },
  { key: 'w_g5_short_response', label: 'Short written response', shortLabel: 'SR', range: [13, 13], max: 4, standards: ['W.5.2'] },
  { key: 'w_g5_language', label: 'Language Standards', shortLabel: 'La', range: [14, 24], max: 11, standards: ['L.5.1b', 'L.5.1c', 'L.5.1d', 'L.4.1f', 'L.4.1c', 'L.3.1a'] },
  { key: 'w_g5_writing', label: 'Writing — someone you look up to', shortLabel: 'Wr', range: [25, 25], max: 20, standards: ['W.5.2', 'W.5.3'] },
]

const F26_READING_PASSAGES: G5ReadingPassage[] = [
  {
    key: 'night_animals', title: 'Night Animals', range: [6, 13],
    text: 'Some animals sleep during the day. They wake up and move around at night. These animals are called nocturnal animals.\n\nNocturnal animals have special ways to see in the dark. Owls have very large eyes. Their big eyes let in more light. This helps them see even when it is very dark outside.\n\nSome nocturnal animals do not use their eyes at all. Bats use sound instead. They make clicking noises. The sound bounces off objects and comes back to the bat. This helps bats know what is around them, even in total darkness.\n\nNocturnal animals hunt for food at night too. Owls listen for small animals moving on the ground. Bats catch bugs while flying through the air.\n\nBeing awake at night helps these animals stay safe. Fewer predators are hunting in the dark. It can also be cooler at night, which helps some animals survive in hot places.',
  },
]

const F26_QUESTIONS: G5QuestionDef[] = [
  // Items 1-5 — Listening: "Baking Bread", read aloud twice.
  { qNum: 1, section: 'listening', sectionLabel: 'Listening: Baking Bread', text: 'What is this passage mostly about?', choices: ['Why bread tastes good', 'Where bakers work', 'How baking bread has changed over time', 'Why ovens are dangerous'], correct: 'c', standard: 'SL.5.2', standardDesc: 'Summarize a text read aloud', domain: 'Listening Comprehension', dok: 2, note: 'Main idea. The passage is built on a then/now contrast; a, b and d each pick up a single word without the structure.' },
  { qNum: 2, section: 'listening', sectionLabel: 'Listening: Baking Bread', text: 'How did bakers mix dough in the past?', choices: ['By hand', 'With machines', 'With electricity', 'With gas ovens'], correct: 'a', standard: 'SL.5.2', standardDesc: 'Summarize a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail, the "past" half of the contrast.' },
  { qNum: 3, section: 'listening', sectionLabel: 'Listening: Baking Bread', text: 'What did old ovens burn for heat?', choices: ['Electricity', 'Gas', 'Nothing, they used the sun', 'Wood or coal'], correct: 'd', standard: 'SL.5.2', standardDesc: 'Summarize a text read aloud', domain: 'Listening Comprehension', dok: 1, note: 'Key detail. a and b are the modern answers — a student who reverses the timeline picks one of these.' },
  { qNum: 4, section: 'listening', sectionLabel: 'Listening: Baking Bread', text: 'What can bakers do with ovens today that they could not do in the past?', choices: ['Bake without any heat', 'Set the exact temperature', 'Bake bread without dough', 'Watch the fire more closely'], correct: 'b', standard: 'SL.5.3', standardDesc: 'Summarize the points a speaker makes', domain: 'Listening Comprehension', dok: 2, note: 'Comparison across the two halves. d is the past practice, not the new capability.' },
  { qNum: 5, section: 'listening', sectionLabel: 'Listening: Baking Bread', text: 'What does "exact" mean in this passage? ("Bakers can set the exact temperature they need.")', choices: ['A rough guess', 'Very hot', 'Precise and correct', 'Very cold'], correct: 'c', standard: 'RI.5.4', standardDesc: 'Determine the meaning of words and phrases in a text', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context (exact). The sentence is reprinted on the student page.' },
  // Items 6-12 — Reading: "Night Animals".
  { qNum: 6, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'What is this passage mostly about?', choices: ['Why owls have big eyes', 'Animals that are active at night and how they survive', 'How bats fly', 'Why nighttime is dangerous'], correct: 'b', standard: 'RI.5.2', standardDesc: 'Determine two or more main ideas and explain how they are supported', domain: 'Reading Comprehension', dok: 2, note: 'Main idea. a and c are single supporting details.' },
  { qNum: 7, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'Why do owls have large eyes?', choices: ['To scare away predators', 'To make clicking sounds', 'To look bigger than they are', 'To let in more light so they can see in the dark'], correct: 'd', standard: 'RI.5.1', standardDesc: 'Quote accurately when explaining what the text says', domain: 'Reading Comprehension', dok: 1, note: 'Cause and effect, stated.' },
  { qNum: 8, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'How do bats find their way in the dark?', choices: ['They use sound that bounces off objects', 'They use their large eyes', 'They wait until morning', 'They follow other animals'], correct: 'a', standard: 'RI.5.1', standardDesc: 'Quote accurately when explaining what the text says', domain: 'Reading Comprehension', dok: 1, note: 'Key detail.' },
  { qNum: 9, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'How are owls and bats similar in the way they find food at night, even though they use different senses?', choices: ['Both wait for their food to come to them', 'Both rely on one main sense (sight or sound) instead of the other to locate prey', 'Both hunt only in the early morning', 'Both use smell instead of sight or sound'], correct: 'b', standard: 'RI.5.3', standardDesc: 'Explain relationships or interactions between two or more concepts', domain: 'Reading Comprehension', dok: 2, note: 'Comparison across paragraphs. REVIEW THIS ITEM: the stem says owls and bats use different senses to find food, but the passage says owls listen for small animals moving on the ground and bats use sound too. A careful reader can reject the premise, so a high wrong-answer rate here may be the question, not the class. Check the item analysis before counting it.' },
  { qNum: 10, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'What does "bounces off" mean in this passage? ("The sound bounces off objects and comes back to the bat.")', choices: ['Sinks into and disappears', 'Stops completely', 'Hits something and reflects back', 'Grows louder over time'], correct: 'c', standard: 'RI.5.4', standardDesc: 'Determine the meaning of words and phrases in a text', domain: 'Vocabulary', dok: 2, note: 'Vocabulary in context (bounces off). The sentence is reprinted on the student page.' },
  { qNum: 11, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'Based on the passage, what might happen to a nocturnal animal that lost its ability to sense in the dark?', choices: ['It would have no trouble finding food', 'It would go to the doctor.', 'It would have a harder time finding food and staying safe', 'It would not be affected at all'], correct: 'c', standard: 'RI.5.1', standardDesc: 'Draw inferences from the text', domain: 'Reading Comprehension', dok: 3, note: 'Inference beyond the text (RI.5.1).' },
  { qNum: 12, section: 'reading', sectionLabel: 'Reading: Night Animals', text: 'Why might being nocturnal be especially helpful for animals that live in hot, dry places?', choices: ['It is easier to see prey during the day', 'Avoiding the daytime heat helps them save energy and stay cool', 'They can sleep safely during the night without worrying about predators.', 'Nocturnal animals do not need water'], correct: 'b', standard: 'RI.5.1', standardDesc: 'Draw inferences from the text', domain: 'Reading Comprehension', dok: 3, note: 'Inference. The passage gives the cooler-at-night fact; the student must connect it to hot, dry habitats.' },
  // Item 13 is the short written response -- scored on its own checklist.
  // Items 14-24 — Language Standards.
  { qNum: 14, section: 'language', sectionLabel: 'Language Standards', text: 'The band _____ performing at the festival tonight.', choices: ['is', 'are', 'were', 'am'], correct: 'a', standard: 'L.4.1f', standardDesc: 'Ensure subject-verb agreement', domain: 'Language/Grammar', dok: 1, note: 'Collective noun taking a singular verb in American usage (the band is performing).' },
  { qNum: 15, section: 'language', sectionLabel: 'Language Standards', text: 'The puppies _____ chasing each other around the yard.', choices: ['is', 'was', 'were', 'am'], correct: 'c', standard: 'L.4.1f', standardDesc: 'Ensure subject-verb agreement', domain: 'Language/Grammar', dok: 1, note: 'Agreement with a plural subject. The only plural form offered.' },
  { qNum: 16, section: 'language', sectionLabel: 'Language Standards', text: 'Neither the coach nor the players _____ happy with the loss.', choices: ['was', 'were', 'is', 'am'], correct: 'b', standard: 'L.4.1f', standardDesc: 'Ensure subject-verb agreement', domain: 'Language/Grammar', dok: 2, note: 'Neither/nor agreement — the verb agrees with the nearer subject (the players), so a plural form is required. were is the only one offered.' },
  { qNum: 17, section: 'language', sectionLabel: 'Language Standards', text: 'By the time the bus left, Mia _____ already found her seat.', choices: ['has', 'have', 'having', 'had'], correct: 'd', standard: 'L.5.1c', standardDesc: 'Use verb tense to convey various times, sequences, states and conditions', domain: 'Language/Grammar', dok: 2, note: 'Past perfect, cued by by the time the bus left.' },
  { qNum: 18, section: 'language', sectionLabel: 'Language Standards', text: 'By next month, I _____ ten books.', choices: ['will have read', 'have read', 'will read', 'reading'], correct: 'a', standard: 'L.5.1c', standardDesc: 'Use verb tense to convey various times, sequences, states and conditions', domain: 'Language/Grammar', dok: 2, note: 'Future perfect, cued by by next month.' },
  { qNum: 19, section: 'language', sectionLabel: 'Language Standards', text: 'He _____ his bike to school every morning.', choices: ['ride', 'riding', 'rides', 'rode'], correct: 'c', standard: 'L.4.1f', standardDesc: 'Ensure subject-verb agreement', domain: 'Language/Grammar', dok: 1, note: 'Habitual present, third person singular.' },
  { qNum: 20, section: 'language', sectionLabel: 'Language Standards', text: 'Right now, the chef _____ dinner for the guests.', choices: ['prepares', 'is preparing', 'prepared', 'prepare'], correct: 'b', standard: 'L.5.1b', standardDesc: 'Form and use the perfect and progressive verb tenses', domain: 'Language/Grammar', dok: 1, note: 'Present progressive, cued by right now.' },
  { qNum: 21, section: 'language', sectionLabel: 'Language Standards', text: 'Which sentence has a verb tense error?', choices: ['She cooked dinner, and then she cleans the kitchen.', 'She cooked dinner, and then she cleaned the kitchen.', 'She cooks dinner, and then she cleans the kitchen.', 'She will cook dinner, and then she will clean the kitchen.'], correct: 'a', standard: 'L.5.1d', standardDesc: 'Recognize and correct inappropriate shifts in verb tense', domain: 'Language/Grammar', dok: 2, note: 'Inappropriate shift in tense. b, c and d are each internally consistent.' },
  { qNum: 22, section: 'language', sectionLabel: 'Language Standards', text: 'Yesterday, the wind _____ down several tree branches.', choices: ['blows', 'blew', 'blowed', 'blowing'], correct: 'b', standard: 'L.5.1d', standardDesc: 'Recognize and correct inappropriate shifts in verb tense', domain: 'Language/Grammar', dok: 1, note: 'Irregular simple past. blowed is the overregularized error form.' },
  { qNum: 23, section: 'language', sectionLabel: 'Language Standards', text: 'You _____ wear a helmet when riding a bike. It\'s dangerous.', choices: ['are', 'might', 'would', 'should'], correct: 'd', standard: 'L.4.1c', standardDesc: 'Use modal auxiliaries to convey various conditions', domain: 'Language/Grammar', dok: 2, note: 'Modal of advice and obligation. are is ungrammatical; might and would do not express advice.' },
  { qNum: 24, section: 'language', sectionLabel: 'Language Standards', text: 'Which word in this sentence is a verb? ("The clever fox jumped over the fence quickly.")', choices: ['clever', 'fox', 'jumped', 'fence'], correct: 'c', standard: 'L.3.1a', standardDesc: 'Explain the function of nouns, pronouns, verbs, adjectives and adverbs', domain: 'Language/Grammar', dok: 1, note: 'Parts of speech — identifying the verb. The distractors are an adjective, a noun, and a noun.' },
]

// ─── Item 25: Writing ────────────────────────────────────────────────

const F26_WRITING_CATEGORIES: G5WritingCategory[] = [
  { key: 'story_structure', label: 'Story Structure', max: 4, standard: 'W.5.3', standardDesc: 'Organization of the response', kind: 'ladder' },
  {
    key: 'content', label: 'Content and Detail', max: 4, standard: 'W.5.2', standardDesc: 'What the response shows', kind: 'checklist',
    checklist: [
      { key: 'identifies_hero', label: 'Identifies the hero', desc: 'Says who the person is and how the writer knows them — a relationship, a role, or how they came across them. "My grandmother," "my swimming coach," "a doctor I saw on the news" all count; "someone I like" does not.' },
      { key: 'names_taught', label: 'Names what they taught', desc: 'States a lesson, value, or way of behaving the writer took from them. It can be simple ("she taught me to keep trying").' },
      { key: 'specific_example', label: 'Gives a specific example', desc: 'One concrete occasion, not a general habit. "When I failed my math test she sat with me" counts; "she always helps me" does not.' },
      { key: 'beyond_summary', label: 'Beyond the summary', desc: 'Any one of: dialogue, an inner thought, a sensory detail, a description of the person, or a reflection on how the writer changed or what it means to them now.' },
    ],
    checklistCap: {
      note: 'Length gate. The prompt requires at least twelve sentences. This is the only place length affects the score.',
      tiers: [
        { key: 'under12', label: 'Fewer than 12 sentences', desc: 'Cannot score 4 in this category however many features it shows.', cap: 3 },
        { key: 'under8', label: 'Fewer than 8 sentences', desc: 'Caps this category at 2.', cap: 2 },
      ],
    },
  },
  { key: 'language_grammar', label: 'Language and Grammar', max: 4, standard: 'L.5.1', standardDesc: 'Sentence variety and agreement', kind: 'ladder' },
  { key: 'mechanics', label: 'Mechanics', max: 4, standard: 'L.5.2', standardDesc: 'Capitalization, punctuation, spelling', kind: 'ladder' },
  { key: 'word_choice', label: 'Word Choice and Voice', max: 4, standard: 'L.5.3', standardDesc: 'Precision and voice', kind: 'ladder' },
]

const F26_WRITING_RUBRIC: Record<string, Record<number, string>> = {
  story_structure: {
    0: 'No sentences written on the lined page (blank, or planning notes only).',
    1: 'Writing present but no identifiable structure — random sentences or unconnected ideas about the hero.',
    2: 'Attempts to introduce the hero and give an example, but no clear reflection or ending, OR ideas are out of order and unclear.',
    3: 'Has a clear introduction, example, and reflection, but one part is weak or has a gap.',
    4: 'Clear introduction, example, and reflection. Ideas are well-sequenced and easy to follow.',
  },
  language_grammar: {
    0: 'No intelligible English sentences.',
    1: 'Significant errors make meaning difficult. Some English structure present.',
    2: 'Frequent errors that sometimes interfere with meaning. Repetitive patterns ("He is… They taught me… He is…").',
    3: 'Some errors but meaning is always clear. Attempts sentence variety (compound sentences, transitions, different sentence starters).',
    4: 'Mostly correct grammar. Varied structures including compound and complex sentences. Consistent verb tenses. Transitions between ideas (for example, because, as a result).',
  },
  mechanics: {
    0: 'No evidence of capitalization, punctuation, or recognizable spelling.',
    1: 'Minimal punctuation and capitalization. Many misspellings, but words are recognizable.',
    2: 'Some capitalization and punctuation but inconsistent. Several high-frequency words misspelled. Proper nouns (names) may not be capitalized.',
    3: 'Minor inconsistencies — occasional missing capitals or periods. A few common words misspelled. Proper nouns mostly capitalized.',
    4: 'Consistent capitalization and end punctuation. High-frequency words spelled correctly. Proper nouns capitalized. Commas used in lists and compound sentences. Phonetic attempts at harder words are acceptable.',
  },
  word_choice: {
    0: 'No intelligible English sentences.',
    1: 'Isolated English words only. There is not enough writing to judge word choice.',
    2: 'Relies on the most general words available (good, nice, kind, help, said, very) and repeats them throughout. The hero is described only in the broadest terms (she is a nice person). Little sense of a writer behind the words.',
    3: 'Some specific or stronger choices appear (patient, encouraged, never gave up, reminded me) alongside the general ones. The writing sounds like the student in places — an aside, a reaction, a sentence that is theirs.',
    4: 'Precise, varied word choice throughout: specific verbs and adjectives instead of general ones, and qualities named exactly (patient, stubborn, generous rather than nice). A clear voice — the reader can hear the student explaining why this person matters rather than reporting it.',
  },
}

const F26_STANDARDS: G5StandardBaseline[] = [
  { code: 'RF.5.4a', domain: 'Fluency', gradeLevel: '5',
    description: 'Read grade-level text with purpose and understanding',
    testSection: 'o_g5_comp', masteryThreshold: 5 },
  { code: 'RF.5.4b', domain: 'Fluency', gradeLevel: '5',
    description: 'Read grade-level prose orally with accuracy, appropriate rate, and expression',
    testSection: 'o_g5_naep', masteryThreshold: 3 },
  { code: 'SL.5.2', domain: 'Listening', gradeLevel: '5',
    description: 'Summarize a text read aloud',
    testSection: 'w_g5_listening', masteryThreshold: 4 },
  { code: 'RI.5.1', domain: 'Reading Info', gradeLevel: '5',
    description: 'Quote accurately when explaining the text and drawing inferences',
    testSection: 'w_g5_reading', masteryThreshold: 5 },
  { code: 'L.5.1', domain: 'Language', gradeLevel: '5',
    description: 'Demonstrate command of the conventions of standard English grammar',
    testSection: 'w_g5_language', masteryThreshold: 8 },
  { code: 'W.5.2', domain: 'Writing', gradeLevel: '5',
    description: 'Write informative texts to examine a topic and convey ideas clearly',
    testSection: 'w_g5_short_response', masteryThreshold: 3 },
  { code: 'W.5.3', domain: 'Writing', gradeLevel: '5',
    description: 'Write an organized response with a clear focus, concrete details and a concluding reflection',
    testSection: 'w_g5_writing', masteryThreshold: 11 },
]

const FALL_2026_CONTENT: G5Content = {
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
      'Level selection is the teacher\'s judgment. When in doubt, start one level BELOW where you expect them — it is easier to move a confident reader up than to recover a discouraged one.',
      'Components 1 and 2 are administered together at the student\'s selected level.',
      'Let the timer run to the end of the passage. The app takes the 60-second mark automatically for CWPM.',
      'A student who is clearly struggling should be stopped at roughly 60 seconds. Do NOT ask the comprehension questions — check the comprehension-not-administered box rather than leaving it blank or entering zero.',
      'Questions may be repeated once, verbatim. Do not rephrase, prompt, or supply vocabulary.',
      'Levels D and E ask for the student\'s opinion. Both passages end with an open question, and question 5 asks the student to answer it. Score the REASONING, not the position: a student who argues that athletes deserve their salaries and a student who argues the opposite both earn 2 if they give a reason. Do not signal your own view before, during, or after the read.',
      'Levels C-E contain no dialogue. Judge NAEP 4 on phrasing, pace, and whether the voice responds to punctuation and to the rhetorical questions. Do not withhold a 4 because the text gave the student no dialogue to perform.',
      'One-passage-down rule: never move a student down more than one level in a single sitting, and never move up more than one level after a re-read. If a student is at Frustration on Level A, stop — the placement is Level A.',
    ],
    timing: {
      struggleStopSeconds: 60,
      note: 'Let the timer run to the end for a capable reader; the app takes the 60-second mark for CWPM. Stop a clearly struggling reader at roughly 60 seconds.',
    },
  },
  written: {
    total: 47,
    mcMax: 23,
    minutes: 50,
    sections: F26_WRITTEN_SECTIONS,
    questions: F26_QUESTIONS,
    listening: {
      script: F26_LISTENING_SCRIPT,
      instructions: 'Read the script aloud twice, at a natural pace, before students answer. Pause briefly between paragraphs. Do not define words, do not emphasize the answers with your voice, and do not repeat individual sentences on request. After the second reading, tell students to answer items 1-5.',
      say: 'I am going to read you a short passage two times. Listen carefully. After I finish, answer questions 1 to 5.',
    },
    passages: F26_READING_PASSAGES,
    scoringNote: 'Multiple-choice items are worth 1 point each. Items 13 and 25 carry more than one point each.',
    adminNote: 'Administered whole-class. Allow approximately 50 minutes. The Listening section must be read aloud by the teacher before students begin the rest of the test.',
    bands: [
      { min: 0, max: 14, label: 'Emerging', reading: 'Below the level the test is written for. Read the section percentages, not the total — the placement information is in which section collapsed.' },
      { min: 15, max: 26, label: 'Developing', reading: 'Handles literal comprehension and basic agreement; loses points on the perfect tenses, inference items, and extended writing.' },
      { min: 27, max: 37, label: 'Proficient', reading: 'On level for Grade 5.' },
      { min: 38, max: 47, label: 'Advanced', reading: 'Consider the next level up. Confirm against the oral result before moving the student.' },
    ],
    bandCaution: 'Do not place a student on the written total alone. 24 of the 47 points come from just two items (13 and 25), so one weak writer\'s total can understate their reading badly. The oral result and the section breakdown carry more information than the single number.',
  },
  shortWriting: {
    item: 13,
    prompt: 'Can you think of another animal with a special sense? Write 2-4 sentences describing the animal, its special sense, and how it helps the animal survive.',
    max: 4,
    checklist: [
      { key: 'names_animal', label: 'Names an animal', desc: 'A specific animal, not a category. Dog, shark, snake, eagle, dolphin count; "a night animal" does not.' },
      { key: 'names_sense', label: 'Names the special sense', desc: 'Identifies what the animal senses with, or what it can sense. "A dog can smell very well," "sharks feel movement in the water," "snakes feel heat."' },
      { key: 'explains_help', label: 'Explains how it helps', desc: 'Connects the sense to survival — finding food, avoiding danger, navigating, finding others. Must be a connection, not a restatement.' },
      { key: 'clarity', label: 'Clarity and length', desc: 'At least two sentences, and the meaning is clear throughout. Grammar and spelling errors do not cost this point unless they obscure the meaning.' },
    ],
    scoringNote: 'Award one point for each element present, plus one point for clarity. The animal does NOT have to be nocturnal, and the sense does not have to be scientifically precise — a reasonable, commonly held belief about the animal earns the point.',
    workedExamples: [
      '4/4: "A dog has a very strong nose. It can smell things people cannot smell. This helps a dog find food and know if danger is near." — animal, sense, survival link, clear.',
      '2/4: "Sharks smell blood in the water. They are very good at it." — animal and sense, but no survival link and only borderline on length.',
      '0/4: Blank, Korean only, or a copied sentence about owls or bats from the passage.',
    ],
    notes: [
      'Do not award credit for owls or bats. The prompt asks for ANOTHER animal. A response about either one scores 0 for "names an animal," though it can still earn the clarity point if it is otherwise well written.',
    ],
  },
  writing: {
    item: 25,
    prompt: 'Do you have a hero? Write about someone who you look up to. Who is your hero? What have they taught you, through their words or their actions? Give an example. Write at least 12 sentences.',
    say: 'Write on the lined page. Write at least twelve sentences. Your hero can be a real person or a character — whoever you look up to. There is a space to plan first if you want it, but you don\'t have to use it. If you don\'t know how to spell a word, write it the best way you can and keep going.',
    targetSentences: 12,
    categories: F26_WRITING_CATEGORIES,
    max: 20,
    rubric: F26_WRITING_RUBRIC,
    notes: [
      'The brainstorm space is optional and is NOT scored. Do not tell students it is required, do not deduct for leaving it blank, and do not read it when scoring — only the lined response counts.',
      'A student who plans in their head and writes a strong response is not penalized, and a student with a full brainstorm and four sentences of writing earns no credit for the planning.',
      'Score each category independently. A student with a vivid, well-shaped response and no capital letters can still score 4 + 4 + 3 + 1 + 4 = 16.',
      'Whole points only. If you are torn between two scores, award the higher one only if every part of that descriptor is met.',
      'Only Content and Detail is a checklist. The other four are ladders — find the highest row that describes the writing and score there.',
      'Content is scored on ideas, not on English accuracy. Broken English that still shows a feature earns the box: "one time I very sad and she say don\'t give up" earns both Gives a specific example and Beyond the summary. Language and Mechanics carry the accuracy.',
      'Under Mechanics, phonetic spelling of a word a Grade 5 student would not be expected to know (encouraje, responsable) is not penalized. Only high-frequency words count.',
      'A fictional hero is fine. A movie character, a game character, or a figure from a book is a legitimate choice. Score it exactly as you would a real person — what matters is whether the student can say what the hero taught them and give an example, not who they picked.',
      'A response written entirely in Korean scores 0 across all five categories. Occasional Korean words inside English sentences are treated as unknown vocabulary and scored normally.',
      'Handwriting neatness and line placement are not scored.',
      'Do not supply candidate heroes, do not translate the prompt, and do not spell words on request.',
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
    'Item 25 rubric: the teacher\'s guide and the rubric page reprinted on the student copy score DIFFERENT categories, exactly as in Grade 4. The guide scores Story Structure, Content and Detail, Language and Grammar, Mechanics, and Word Choice and Voice. The student copy scores Brainstorm/Planning in place of Word Choice and Voice — awarding four points for the planning box the guide states is not scored. The guide is used here; the student copy\'s rubric page should be replaced.',
    'Item 25 Content and Detail: the guide scores a four-feature checklist with a two-tier length gate (under 12 sentences cannot reach 4; under 8 caps at 2). The student copy scores a sentence-count ladder. The guide is used here.',
    'The student copy\'s prompt tells the student to "use the brainstorm below to plan your writing before you start", while the guide\'s administration script says the space is optional. Wording only — the guide is clear the planning is never scored either way.',
    'All 23 multiple-choice keys agree between the guide\'s per-item tables, the guide\'s consolidated key, and the printed student copy. No answer-key conflicts on this paper.',
    'Passage D: the guide\'s table says 204 words. Counting the two em-dashed pairs ("kids\u2014and", "parents\u2014disagree") as two words each gives 203, which is what the running record now shows. Recorded as 203.',
    'The guide\'s answer-distribution footnote says a x5, b x7, c x6, d x5. The actual distribution of the 23 keys is a x5, b x7, c x7, d x4. Cosmetic — it does not affect any score.',
  ],
}

// ============================================================================
// REGISTRY
// ============================================================================

export const G5_LEGACY_VERSION = 'legacy'

const G5_VERSIONS: Record<string, G5Content> = {
  '2026-2027:fall': FALL_2026_CONTENT,
}

export function g5VersionKeyForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): string {
  if (!test?.academic_year || !test?.semester) return G5_LEGACY_VERSION
  const key = `${test.academic_year}:${test.semester}`
  return G5_VERSIONS[key] ? key : G5_LEGACY_VERSION
}

export function getG5Content(versionKey: string = G5_LEGACY_VERSION): G5Content | null {
  return G5_VERSIONS[versionKey] || null
}

export function g5ContentForTest(
  test: { academic_year?: string | null; semester?: string | null } | null | undefined
): G5Content | null {
  return getG5Content(g5VersionKeyForTest(test))
}

export function g5WrittenTotalMax(content: G5Content): number {
  return content.written.mcMax + content.shortWriting.max + content.writing.max
}

/**
 * Every CCSS code this grade tests, mapped to the guide's own wording.
 *
 * Walks all authored versions, so a history view can name a standard from a
 * test written years ago. Scores persist only the code and the met/total, and
 * a bare "RI.5.1" tells a teacher nothing about what was actually asked.
 */
export function g5StandardDescriptions(): Record<string, string> {
  const out: Record<string, string> = {}
  Object.values(G5_VERSIONS).forEach(c => {
    c.written.questions.forEach(q => { if (q.standard && q.standardDesc) out[q.standard] = q.standardDesc })
    c.writing.categories.forEach(cat => { if (cat.standard && cat.standardDesc) out[cat.standard] = cat.standardDesc })
  })
  return out
}
