// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE TEACHER RESOURCE GUIDES — Daewoo English Program
// Evidence-based reference material for ELA/ESL instruction
// Sources: Reading Rockets, Edutopia, Cult of Pedagogy, Tan Huynh,
//          National Reading Panel, WIDA, CCSS
// ═══════════════════════════════════════════════════════════════════

// ─── Shared Types ────────────────────────────────────────────────

export interface WIDAExpectation {
  level: string       // e.g. "Level 1 — Entering"
  color: string       // tailwind bg class
  canDo: string       // what students CAN do at this level
  support: string     // what support they need
}

export interface DevelopmentalMilestone {
  grade: string
  expectations: string
  assessHow: string
}

export interface InterventionSignal {
  signal: string
  whatToDo: string
}

export interface SkillEntry {
  name: string
  what: string
  why: string
  howToTeach: { step: string; detail: string }[]
  example: string
  koreanNote?: string
  ccss?: string
  gradeRange?: string
}

export interface SubSkillProgression {
  name: string
  description: string
  difficulty: 'foundational' | 'intermediate' | 'advanced'
  gradeRange: string
  activities: string[]
}

export interface GuideSection {
  id: string
  title: string
  icon: string // lucide icon name
  subtitle: string
  overview: {
    what: string
    whyItMatters: string
    researchBase: string   // brief citation
    bigIdea: string        // the one-liner teachers remember
  }
  developmentalProgression: SubSkillProgression[]
  milestones: DevelopmentalMilestone[]
  skills: SkillEntry[]
  wida: WIDAExpectation[]
  interventionSignals: InterventionSignal[]
  koreanL1Considerations: string[]
  connectionToApp: string   // how this connects to features in the Daewoo app
}

// ═══════════════════════════════════════════════════════════════════
// 1. PHONOLOGICAL AWARENESS
// ═══════════════════════════════════════════════════════════════════

export const PHONOLOGICAL_AWARENESS: GuideSection = {
  id: 'phonological-awareness',
  title: 'Phonological Awareness',
  icon: 'Ear',
  subtitle: 'The ability to hear, identify, and manipulate the sound structures of spoken language',
  overview: {
    what: 'Phonological awareness is the understanding that spoken language can be broken into smaller units — sentences into words, words into syllables, syllables into onset-rime, and words into individual sounds (phonemes). It is entirely oral and auditory — no print involved.',
    whyItMatters: 'Phonological awareness is the single strongest predictor of early reading success. Children who cannot hear and manipulate the sounds in spoken words will struggle to connect those sounds to letters when they encounter print. The National Reading Panel identified it as one of five essential components of reading instruction, and decades of research confirm that explicit phonological awareness instruction significantly improves reading and spelling outcomes for all learners.',
    researchBase: 'National Reading Panel (2000); Ehri et al. (2001); Adams (1990); Stanovich (1986). Reading Rockets: "Poor phonological awareness is the most common area of weakness for struggling readers."',
    bigIdea: 'If a child cannot hear it, they cannot read it. Phonological awareness is the ear training that makes phonics instruction possible.',
  },

  developmentalProgression: [
    {
      name: 'Word Awareness',
      description: 'Understanding that sentences are made up of individual words. Can segment a spoken sentence into separate words.',
      difficulty: 'foundational',
      gradeRange: 'Pre-K to K',
      activities: [
        'Clap once for each word in a sentence: "I — like — dogs" (3 claps)',
        'Use blocks or counters to represent each word — move one for each word spoken',
        'Play "How many words?" with increasingly longer sentences',
      ],
    },
    {
      name: 'Rhyme Recognition & Production',
      description: 'Identifying words that share ending sounds (cat/hat) and generating new rhyming words.',
      difficulty: 'foundational',
      gradeRange: 'Pre-K to K',
      activities: [
        'Read rhyming books aloud — pause and let students supply the rhyme',
        'Thumbs up/thumbs down: "Do these rhyme? Cat — hat? Cat — dog?"',
        'Rhyme sorting: group picture cards by rhyme family',
        'Nonsense rhyme generation: "What rhymes with bip? Tip, lip, zip, nip, gip!"',
      ],
    },
    {
      name: 'Syllable Awareness',
      description: 'Hearing and counting the syllable beats in words. Blending syllables into words and segmenting words into syllables.',
      difficulty: 'foundational',
      gradeRange: 'Pre-K to Grade 1',
      activities: [
        'Clap or tap syllables: "wa-ter-mel-on" = 4 claps',
        'Sort picture cards by number of syllables (1-beat pile, 2-beat pile, 3-beat pile)',
        'Syllable blending: "What word am I saying? pen...cil" → pencil',
        'Use chin drop method: hand under chin, count each time the chin drops (= vowel sounds)',
      ],
    },
    {
      name: 'Onset-Rime Awareness',
      description: 'Separating the beginning sound(s) of a word (onset) from the rest (rime). In "cat," /k/ is the onset and /at/ is the rime.',
      difficulty: 'intermediate',
      gradeRange: 'K to Grade 1',
      activities: [
        'Body blending: teacher says onset, students say rime, everyone says the word. "/k/...at...cat!"',
        'Word family sorts: group words by rime (-at, -ig, -op families)',
        'Onset substitution: "If I change the /k/ in cat to /b/, what word do I get?"',
      ],
    },
    {
      name: 'Phoneme Isolation',
      description: 'Identifying individual sounds in specific positions — beginning, middle, or end of a word.',
      difficulty: 'intermediate',
      gradeRange: 'K to Grade 1',
      activities: [
        'Initial sound sorts: "Does dog start with /d/ or /b/?"',
        'Sound scavenger hunt: find objects in the room that start with /s/',
        'Final sound focus: "What is the last sound in map? /p/"',
        'Medial vowel identification (hardest): "What is the middle sound in hot? /o/"',
      ],
    },
    {
      name: 'Phoneme Blending',
      description: 'Combining individual sounds to form a word. Teacher says /k/ /a/ /t/, student says "cat."',
      difficulty: 'intermediate',
      gradeRange: 'K to Grade 1',
      activities: [
        'Robot talk: teacher speaks in "robot voice" (segmented sounds), students blend to say the word',
        'Sound boxes with chips: push a chip for each sound, then sweep them together to blend',
        'Start with 2-phoneme words (/a/ /t/ = at), progress to 3 (/s/ /i/ /t/ = sit), then 4+',
        'Use continuous sounds first (/m/, /s/, /f/) — they are easier to blend than stop sounds (/b/, /t/, /k/)',
      ],
    },
    {
      name: 'Phoneme Segmentation',
      description: 'Breaking a word into its individual sounds. Student hears "ship" and says /sh/ /i/ /p/.',
      difficulty: 'advanced',
      gradeRange: 'K to Grade 2',
      activities: [
        'Elkonin boxes: draw boxes for each sound, student places a chip in each box as they say each phoneme',
        'Finger tapping: tap a finger for each sound (thumb-to-finger sequence)',
        'Sound counting: "How many sounds in fish? /f/ /i/ /sh/ — 3 sounds" (not 4 letters)',
        'Stretch it out: say the word in slow motion, pulling hands apart like stretching taffy',
      ],
    },
    {
      name: 'Phoneme Manipulation',
      description: 'Adding, deleting, or substituting individual sounds in words. The most complex phonological skill.',
      difficulty: 'advanced',
      gradeRange: 'Grade 1 to Grade 2+',
      activities: [
        'Deletion: "Say cat without the /k/" → at',
        'Addition: "What word do you get if you add /s/ to the beginning of top?" → stop',
        'Substitution: "Change the /m/ in mat to /s/" → sat',
        'Sound chains: cat → hat → hot → hop → top (change one sound at a time)',
      ],
    },
  ],

  milestones: [
    { grade: 'Pre-K', expectations: 'Recognizes rhyming words. Can clap syllables in familiar words. Enjoys nursery rhymes and word play.', assessHow: 'Informal observation during read-alouds and songs. "Do cat and hat rhyme?"' },
    { grade: 'K (start)', expectations: 'Produces rhymes. Segments sentences into words. Blends and segments syllables. Beginning to isolate initial sounds.', assessHow: 'PAST screening (Phonological Awareness Screening Test). Rhyme recognition and production tasks.' },
    { grade: 'K (end)', expectations: 'Isolates initial, final, and medial sounds. Blends 2-3 phoneme words. Beginning to segment CVC words.', assessHow: 'Phoneme segmentation fluency (PSF). Can segment at least 35 phonemes per minute by spring of K.' },
    { grade: '1', expectations: 'Segments 3-4 phoneme words fluently. Blends words with consonant blends. Beginning phoneme manipulation (deletion, substitution).', assessHow: 'PSF benchmark: 35+ correct phoneme segments per minute. Nonsense word fluency for blending.' },
    { grade: '2+', expectations: 'Automatic phoneme awareness. Manipulates sounds fluently. Transfers skills to spelling and decoding multisyllabic words.', assessHow: 'If a student in Grade 2+ still struggles with segmentation or blending, this signals a need for targeted intervention.' },
  ],

  skills: [
    {
      name: 'Rhyme Recognition',
      what: 'The ability to hear when two words share the same ending sounds.',
      why: 'Rhyming is the gateway to phonological awareness. It draws attention to the sound structure of words rather than their meaning. If a child can rhyme, they are starting to think about language as sound — the prerequisite for all phonics learning.',
      howToTeach: [
        { step: 'Immerse in rhyme', detail: 'Read nursery rhymes, rhyming picture books, and poetry daily. Pause before the rhyme and let students fill it in.' },
        { step: 'Explicit matching', detail: 'Give two words. Ask: "Do cat and hat rhyme?" Then: "Do cat and dog rhyme?" Practice until this is automatic.' },
        { step: 'Odd one out', detail: 'Say three words: "cat, hat, pig." Which one does not rhyme? Start with very different non-matches, then make them trickier.' },
        { step: 'Production', detail: 'Say a word. Ask the student to generate a rhyme. Accept nonsense words — the goal is sound manipulation, not vocabulary.' },
      ],
      example: 'Teacher: "Listen — cat, hat. Do they rhyme?" Student: "Yes!" Teacher: "Tell me a word that rhymes with dog." Student: "Fog! Log! Mog!"',
      koreanNote: 'Korean has rhyming patterns but they work differently — rhyming in Korean focuses on final syllable particles, not onset-rime. Rhyme awareness in English must be explicitly taught; do not assume transfer from Korean.',
      ccss: 'RF.K.2a',
      gradeRange: 'Pre-K to K',
    },
    {
      name: 'Syllable Segmentation & Blending',
      what: 'Breaking words into syllable beats and combining syllables into words.',
      why: 'Syllable awareness bridges word-level and sound-level processing. It helps students chunk longer words into manageable pieces, which directly supports decoding multisyllabic words later.',
      howToTeach: [
        { step: 'Clapping names', detail: 'Start with student names — everyone claps the syllables in their own name. "Min-jun" = 2. "Ha-yoon" = 2. "Seo-hyeon" = 3.' },
        { step: 'Object sorts', detail: 'Gather classroom objects. Sort by syllable count: 1-syllable (pen, book), 2-syllable (pencil, eraser), 3+ (umbrella, calculator).' },
        { step: 'Blending game', detail: 'Teacher says word in syllable chunks: "bas...ket...ball." Students blend and say the word. Start with compound words, then move to non-compound.' },
        { step: 'Deletion', detail: '"Say butterfly without fly." → butter. "Say pancake without pan." → cake. Compound words first, then true syllable deletion.' },
      ],
      example: 'Teacher holds up a picture of a watermelon. "Let us clap this word: wa-ter-mel-on. How many claps? Four!" Students hold up 4 fingers.',
      koreanNote: 'Korean syllable structure is very regular (CV or CVC blocks corresponding to hangul characters). English syllables are more complex and less predictable. Students may try to apply Korean syllable patterns to English words.',
      ccss: 'RF.K.2b',
      gradeRange: 'Pre-K to Grade 1',
    },
    {
      name: 'Phoneme Blending',
      what: 'Hearing a sequence of individual sounds and combining them into a word.',
      why: 'Blending is the core decoding skill. When a student sees the letters c-a-t and says each sound, they must blend /k/-/a/-/t/ into "cat." Without phoneme blending, phonics instruction cannot work.',
      howToTeach: [
        { step: 'Start with continuous sounds', detail: 'Begin with sounds you can hold: /m/, /s/, /f/, /l/, /n/. These are easier to blend than stop sounds (/b/, /t/, /k/) because students can stretch and connect them.' },
        { step: 'Use 2-phoneme words first', detail: '/a/-/t/ = at. /i/-/n/ = in. /u/-/p/ = up. Build confidence before adding complexity.' },
        { step: 'Robot talk', detail: 'Teacher speaks in segmented "robot voice." Students must decode the robot: "/d/..../o/..../g/. What did the robot say? Dog!"' },
        { step: 'Progressive blending', detail: 'Instead of saying all sounds at once (/s/ /a/ /t/), blend cumulatively: /s/→/sa/→/sat/. This is called successive blending and is more effective for struggling students.' },
      ],
      example: 'Teacher: "I am going to say some sounds. You blend them into a word: /m/ /aaaa/ /p/." Student: "Map!"',
      koreanNote: 'Korean uses a visual syllable block system where blending is built into the writing. English blending is purely sequential (left to right through the word). Students may need extra practice with the concept of linear blending.',
      ccss: 'RF.K.2c, RF.1.2b',
      gradeRange: 'K to Grade 1',
    },
    {
      name: 'Phoneme Segmentation',
      what: 'Breaking a spoken word into its individual sounds.',
      why: 'Segmentation is the core spelling skill. To spell "ship," a student must hear /sh/-/i/-/p/ as three separate sounds and assign a letter to each. The National Reading Panel found that segmentation combined with letter-sound knowledge produces the strongest effects on reading and spelling.',
      howToTeach: [
        { step: 'Elkonin boxes (sound boxes)', detail: 'Draw a box for each sound in a word. Student says the word slowly and pushes a chip into each box as they say each sound. Critical: boxes represent SOUNDS, not letters ("ship" = 3 boxes, not 4).' },
        { step: 'Finger tapping', detail: 'Students tap each finger to their thumb as they say each sound. Left to right, one sound per tap. This makes the abstract concept of "sounds in a word" physical and concrete.' },
        { step: 'Stretch and count', detail: '"Say the word fish very slowly, like you are stretching it: /ffff/ /iiii/ /shshshsh/. How many sounds? Three."' },
        { step: 'Move from simple to complex', detail: 'Start with VC words (at, up), then CVC (cat, sit), then CCVC (stop, flag), then CVCC (mask, tent). Do NOT introduce blends until students master 3-phoneme words.' },
      ],
      example: 'Teacher: "How many sounds in the word map?" Student pushes 3 chips into Elkonin boxes: /m/ (push) /a/ (push) /p/ (push). "Three sounds!"',
      koreanNote: 'Korean phoneme segmentation maps more directly to the written form (each hangul block shows its component sounds). English has many cases where the number of sounds differs from the number of letters (e.g., "box" = 4 sounds /b/-/o/-/k/-/s/ but 3 letters). This mismatch confuses Korean-speaking students.',
      ccss: 'RF.K.2d, RF.1.2d',
      gradeRange: 'K to Grade 2',
    },
    {
      name: 'Phoneme Manipulation',
      what: 'The ability to add, delete, or substitute individual sounds in words to create new words.',
      why: 'This is the pinnacle of phonological awareness — the most complex and last to develop. Students who can manipulate phonemes have full mastery of the sound system and are on solid footing for reading and spelling success. It also supports flexible word-solving: if a student misreads a word, they can mentally swap sounds to self-correct.',
      howToTeach: [
        { step: 'Teach in sequence: add → substitute → delete', detail: 'Addition is easiest ("Add /s/ to top → stop"). Substitution is next ("Change /m/ in mat to /s/ → sat"). Deletion is hardest ("Say cart without /t/ → car").' },
        { step: 'Use concrete supports', detail: 'Letter tiles or chips that students can physically move. To delete a sound, they physically remove the chip. To substitute, they swap one chip for another.' },
        { step: 'Sound chains', detail: 'Start with a word and change one sound at a time: cat → hat → hot → hop → top → tap → map. Each change is a single phoneme substitution.' },
        { step: 'Start with initial sounds', detail: 'Manipulating initial sounds is easier than final or medial sounds. Once initial is solid, move to final, then medial vowel changes (the hardest).' },
      ],
      example: 'Teacher: "Say meat." Student: "Meat." Teacher: "Now say meat, but change /m/ to /s/." Student: "...seat!"',
      koreanNote: 'Phoneme manipulation does not have a direct equivalent in Korean literacy instruction. This will be a novel skill for most Korean ELLs and will require more practice time than native English speakers typically need.',
      ccss: 'RF.1.2c, RF.1.2d',
      gradeRange: 'Grade 1 to Grade 2+',
    },
  ],

  wida: [
    {
      level: 'Level 1 — Entering',
      color: 'bg-red-50 border-red-200 text-red-900',
      canDo: 'May recognize rhyming in their home language but not in English. Can participate in clapping syllables of familiar words with heavy modeling. Unlikely to isolate or blend individual English phonemes yet.',
      support: 'Use TPR (clap, tap, stomp) for syllable activities. Pair with a bilingual buddy. Prioritize rhyme exposure through songs and read-alouds rather than demanding production. Accept non-verbal participation.',
    },
    {
      level: 'Level 2 — Emerging',
      color: 'bg-orange-50 border-orange-200 text-orange-900',
      canDo: 'Recognizes rhyming words with support. Segments and blends syllables in 2-3 syllable words. Beginning to isolate initial sounds in familiar words. Participates in group sound activities.',
      support: 'Provide picture support for all sound activities. Use familiar vocabulary. Model extensively before asking for production. Rhyme matching before rhyme generation.',
    },
    {
      level: 'Level 3 — Developing',
      color: 'bg-amber-50 border-amber-200 text-amber-900',
      canDo: 'Produces rhymes (may include nonsense words). Blends and segments 2-3 phoneme words. Isolates initial and final sounds. Beginning to manipulate sounds with support.',
      support: 'Push toward segmentation of 3-4 phoneme words. Use Elkonin boxes consistently. Introduce blending with consonant blends. Begin phoneme substitution with initial sounds.',
    },
    {
      level: 'Level 4 — Expanding',
      color: 'bg-green-50 border-green-200 text-green-900',
      canDo: 'Segments words with blends and digraphs. Manipulates sounds (add, delete, substitute) with increasing automaticity. Transfers phonological skills to spelling.',
      support: 'Focus on medial vowel discrimination (the hardest sounds for ELLs to distinguish). Use phoneme manipulation to support spelling and decoding of unfamiliar words.',
    },
    {
      level: 'Level 5 — Bridging',
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      canDo: 'Phonological awareness skills are largely automatic. Can manipulate sounds in multisyllabic words. Applies skills to self-correct while reading and to encode while writing.',
      support: 'Focus shifts from phonological awareness to phonics application. If gaps remain, target specific weak areas (often medial vowel sounds or consonant clusters that do not exist in Korean).',
    },
  ],

  interventionSignals: [
    { signal: 'Cannot identify rhyming words by mid-kindergarten', whatToDo: 'Increase exposure to rhyming books, songs, and games. Do daily rhyme practice for 5 minutes. If still struggling after 4-6 weeks of targeted practice, increase to small-group intervention.' },
    { signal: 'Cannot blend 2-3 phoneme words by end of kindergarten', whatToDo: 'Use progressive/successive blending (not all-at-once). Start with continuous sounds (/m/, /s/, /f/). Use physical manipulatives. Provide daily 1-on-1 or small group practice for 10-15 minutes.' },
    { signal: 'Cannot segment CVC words by mid-first grade', whatToDo: 'Return to Elkonin boxes daily. Use finger tapping. Ensure the student can first blend — blending typically develops before segmentation. Check for possible hearing issues.' },
    { signal: 'Cannot manipulate phonemes by end of first grade', whatToDo: 'This skill takes time for ELLs. Provide structured practice with concrete manipulatives. Focus on initial sound substitution first. If the student can blend and segment but not manipulate, they are still developing normally — continue practice.' },
    { signal: 'A Grade 2+ student struggles with basic blending or segmentation', whatToDo: 'This is a significant red flag. Begin targeted, daily small-group intervention (10-15 min). Use a structured program. Monitor progress every 2 weeks. If minimal progress after 6-8 weeks of intervention, consult with your team about additional support options.' },
  ],

  koreanL1Considerations: [
    'Korean has a very regular sound-to-symbol correspondence within hangul blocks, so Korean students may expect English to work the same way. The many-to-one and one-to-many sound-letter relationships in English (e.g., "c" can say /k/ or /s/) will be confusing.',
    'Several English phonemes do not exist in Korean: /f/ (often produced as /p/), /v/ (produced as /b/), /z/ (produced as /j/ or /dʒ/), /θ/ and /ð/ (th sounds, produced as /s/ or /d/). Students may not be able to hear distinctions they cannot produce.',
    'English has many more vowel sounds than Korean. The short vowel distinctions (/ɪ/ vs /i:/, /ɛ/ vs /æ/) are especially difficult. Medial vowel phoneme tasks will be significantly harder for Korean speakers.',
    'Korean syllable structure is simpler (mostly CV or CVC). English allows complex consonant clusters (str-, -mpt, -ngths) that simply do not exist in Korean. Blending and segmenting these clusters requires explicit instruction.',
    'The silent period is normal and productive. A Korean-speaking student may understand sound activities before they can produce English sounds accurately. Accept non-verbal responses (pointing, sorting, thumbs up/down) while oral production develops.',
  ],

  connectionToApp: 'The Quick Check tool in the app can be used to do rapid formative checks on phonological awareness skills ("Got It / Almost / Not Yet" for blending, segmentation, or rhyme production). The Standards Checklist tracks RF (Foundational Skills) standards including phonological awareness. The Intervention Loop lets you flag students who need additional PA support and track their progress over time.',
}


// ═══════════════════════════════════════════════════════════════════
// 2. PHONICS  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 3. READING FLUENCY  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 4. READING SKILLS  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 5. VOCABULARY  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 6. GRAMMAR  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 7. WRITING  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 8. SPEAKING  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// 9. LISTENING  (placeholder — to be built)
// ═══════════════════════════════════════════════════════════════════

// ─── Export all guides ───────────────────────────────────────────

export const ALL_GUIDES: GuideSection[] = [
  PHONOLOGICAL_AWARENESS,
  // More will be added as they're built
]
