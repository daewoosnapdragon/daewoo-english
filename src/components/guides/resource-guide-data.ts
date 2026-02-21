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
// 2. PHONICS
// Sources: Reading Rockets, NRP, Ehri, Moats, Scarborough
// ═══════════════════════════════════════════════════════════════════

export const PHONICS: GuideSection = {
  id: 'phonics',
  title: 'Phonics',
  icon: 'Puzzle',
  subtitle: 'Understanding how letters and letter patterns represent the sounds of spoken language',
  overview: {
    what: 'Phonics is the instructional practice of teaching the relationships between letters (graphemes) and sounds (phonemes) so that students can decode (read) and encode (spell) words. It bridges phonological awareness (hearing sounds) and print (seeing letters). Effective phonics instruction is systematic (taught in a logical sequence) and explicit (directly taught, not left to chance).',
    whyItMatters: 'Phonics is one of two strands in Scarborough\'s Reading Rope that form word recognition. Without phonics, students cannot independently read unfamiliar words. The National Reading Panel found that systematic, explicit phonics instruction significantly benefits students in K-6 and produces gains in decoding, spelling, and comprehension. For ELLs, phonics is especially critical because they cannot rely on oral vocabulary to self-correct decoding errors the way native speakers can.',
    researchBase: 'National Reading Panel (2000); Ehri (2004); Moats (2020) "Speech to Print"; Scarborough (2001) Reading Rope; Reading Rockets: "Systematic phonics instruction produces the greatest impact when it begins in kindergarten or first grade."',
    bigIdea: 'Phonics is the bridge between hearing sounds and reading print. If phonological awareness is ear training, phonics is the code that connects ears to eyes.',
  },
  developmentalProgression: [
    { name: 'Alphabetic Principle', description: 'Understanding that letters represent sounds and that written words map to spoken words. Letter-name and letter-sound knowledge.', difficulty: 'foundational', gradeRange: 'Pre-K to K', activities: ['Letter-sound correspondence with picture anchors: "A says /a/ like apple"', 'Multisensory letter formation: trace in sand, form with playdough, skywrite while saying the sound', 'Letter hunts: find target letters in environmental print, books, and names'] },
    { name: 'CVC Decoding', description: 'Reading and spelling simple consonant-vowel-consonant words (cat, sit, hop). The foundational decoding pattern.', difficulty: 'foundational', gradeRange: 'K to Grade 1', activities: ['Sound-by-sound blending with letter tiles: /k/-/a/-/t/ → cat', 'Word building: change one letter at a time (cat → bat → bit → sit)', 'Decodable text reading with CVC-controlled passages'] },
    { name: 'Consonant Blends & Digraphs', description: 'Blends: two+ consonants where each retains its sound (bl, st, cr). Digraphs: two letters making one sound (sh, ch, th, wh, ck).', difficulty: 'intermediate', gradeRange: 'K to Grade 1', activities: ['Sorting activities: blend words vs. digraph words', 'Building words with blend/digraph tiles as single units', 'Dictation practice: teacher says word, students write using learned patterns'] },
    { name: 'Long Vowel Patterns', description: 'Silent-e (VCe: make, bike, home), vowel teams (ai, ea, oa, ee), and open syllables where the vowel says its name.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 2', activities: ['Word sorts by vowel pattern: silent-e pile vs. vowel team pile', 'Flip books: change the initial consonant while keeping the pattern (cake, lake, make, bake)', 'Reading decodable texts with target long vowel patterns'] },
    { name: 'R-Controlled & Complex Vowels', description: 'Vowels modified by r (ar, er, ir, or, ur) and diphthongs/variant vowels (oi/oy, ou/ow, au/aw, oo).', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 2', activities: ['Sound wall work: place new patterns under their phoneme', 'Connected text reading with targeted r-controlled words', 'Spelling dictation focusing on r-controlled patterns'] },
    { name: 'Multisyllabic Decoding', description: 'Breaking longer words into syllables using six syllable types (closed, open, VCe, vowel team, r-controlled, C-le) and syllable division rules.', difficulty: 'advanced', gradeRange: 'Grade 2 to Grade 5', activities: ['Syllable type identification: label each syllable in a word', 'Scoop and read: draw arcs under each syllable, decode each part, blend together', 'Word detective: find the syllable break using VCCV, VCV, and VV patterns'] },
    { name: 'Morphology Integration', description: 'Using meaningful word parts — prefixes, suffixes, roots, and base words — to decode and understand multisyllabic words.', difficulty: 'advanced', gradeRange: 'Grade 2 to Grade 5', activities: ['Word sum equations: re + play + ing = replaying', 'Morpheme sorting: group words by shared prefix or suffix', 'Matrix building: combine bases with multiple affixes to generate word families'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Knows most letter sounds. Decodes CVC words. Beginning to spell phonetically. Reads simple decodable texts.', assessHow: 'Letter-sound fluency. Nonsense word reading (DIBELS NWF). CVC spelling dictation.' },
    { grade: '1', expectations: 'Decodes words with blends, digraphs, and long vowel patterns. Reads decodable chapter books. Spells common patterns correctly.', assessHow: 'Oral reading of decodable passages. Spelling inventories. Basic Phonics Skills Test.' },
    { grade: '2', expectations: 'Decodes two-syllable words using syllable types. Reads grade-level text with 90%+ accuracy. Applies phonics independently.', assessHow: 'Running records with miscue analysis. Multisyllable word reading lists. Spelling patterns assessment.' },
    { grade: '3-5', expectations: 'Applies advanced decoding (morphology, Greek/Latin roots) to content-area vocabulary. Decoding is largely automatic.', assessHow: 'If a student in Grade 3+ cannot decode two-syllable words, phonics intervention is needed. Otherwise, assess through content-area reading and spelling.' },
  ],
  skills: [
    { name: 'Explicit Phonics Lesson Structure', what: 'A systematic lesson framework for teaching letter-sound relationships and decoding skills.', why: 'Research consistently shows that explicit, systematic instruction outperforms implicit or incidental approaches. The "I Do, We Do, You Do" gradual release model ensures students master each skill before applying it.',
      howToTeach: [
        { step: 'Review (2-3 min)', detail: 'Quick review of previously taught sounds and patterns using flashcards or sound drills. This keeps previously taught material active.' },
        { step: 'Introduce new skill (5 min)', detail: 'Explicitly teach the new letter-sound relationship. "Today we are learning that s-h together make /sh/." Provide a keyword anchor: "/sh/ as in ship." Write it, say it, trace it.' },
        { step: 'Guided practice — blending (5-8 min)', detail: 'Students blend words with the new pattern using letter tiles or whiteboards. Teacher guides: "Touch and say each sound, then blend."' },
        { step: 'Guided practice — encoding (5-8 min)', detail: 'Dictation: teacher says a word, students segment sounds and write letters. Start with words, progress to phrases and sentences.' },
        { step: 'Connected text reading (5-10 min)', detail: 'Students read decodable text with the target pattern. Read for accuracy first, then reread for fluency. Guide error correction — do not supply the word.' },
      ],
      example: 'Introduce "sh": write it, say /sh/, give keyword "ship." Students build sh words with tiles (ship, shop, shed, fish). Dictation: "The ship is big." Students read a passage with sh words.',
      koreanNote: 'The /sh/ sound does not exist as a distinct phoneme in Korean. Students may confuse /sh/ with /s/. Extra practice with minimal pairs (ship/sip, shore/sore) is essential.',
      ccss: 'RF.K.3, RF.1.3, RF.2.3',
    },
    { name: 'Decodable Text Practice', what: 'Using texts specifically written to include only phonics patterns students have been taught, plus limited high-frequency sight words.', why: 'Decodable texts give students the opportunity to apply phonics in connected reading. Reading Rockets emphasizes students should read at 95-98% accuracy on first attempt.',
      howToTeach: [
        { step: 'Match text to instruction', detail: 'Select texts that align with taught patterns. Students should not encounter untaught patterns.' },
        { step: 'First read for accuracy', detail: 'Student reads aloud. On errors, prompt sounding out — do NOT supply the word.' },
        { step: 'Second read for fluency', detail: 'Reread the same passage. Repeated reading builds automaticity.' },
        { step: 'Progress through levels', detail: 'As students master CVC, move to blends, then digraphs, then long vowels. Each decodable level matches phonics instruction.' },
      ],
      example: 'After teaching short-i CVC words: "Tim has a big pig. The pig can dig in the mud. Tim hid in the pit." Every word is decodable with known patterns.',
      koreanNote: 'Korean students expect every letter-sound relationship to be consistent (as in hangul). English decodable texts will still have irregularities (sight words like "the," "was") that need separate teaching.',
      ccss: 'RF.1.4, RF.2.4',
    },
    { name: 'Error Correction in Decoding', what: 'How to respond when a student misreads a word during oral reading.', why: 'Error correction is the most important in-the-moment teaching. How you respond either reinforces the phonics system or undermines it.',
      howToTeach: [
        { step: 'Do not supply the word', detail: 'Resist telling the student the word. This teaches waiting for help rather than using phonics.' },
        { step: 'Point to the error', detail: '"Look at this word again. What sound does this letter make?" Direct attention to the specific error.' },
        { step: 'Prompt decoding', detail: '"Let us sound it out together. Touch each letter, say each sound, then blend."' },
        { step: 'Reread the sentence', detail: 'After correcting, have the student reread from the beginning of the sentence for fluent processing.' },
      ],
      example: 'Student reads "started" for "store." Teacher: "Look again. What letters? What pattern?" Student: "s-t-o-r-e... silent e! Store!" Teacher: "Read the whole sentence again."',
      koreanNote: 'Korean students may be reluctant to try sounding out because hangul decoding is nearly instant. Build a culture where sounding out is praised, not seen as weakness.',
    },
    { name: 'Scarborough\'s Reading Rope', what: 'A model showing how skilled reading develops from two intertwined strands: word recognition (PA, decoding, sight recognition) and language comprehension (vocabulary, syntax, background knowledge).', why: 'The Reading Rope helps teachers understand that phonics is necessary but not sufficient. For ELLs, both strands often need support simultaneously.',
      howToTeach: [
        { step: 'Understand the model', detail: 'Word recognition becomes increasingly automatic. Language comprehension becomes increasingly strategic. Skilled reading happens when both strands are strong and woven together.' },
        { step: 'Assess both strands', detail: 'A student who decodes fluently but does not comprehend has a language gap. A student who understands when read to but cannot read independently has a decoding gap.' },
        { step: 'Teach phonics within a complete program', detail: 'Always pair phonics with vocabulary, background knowledge, and comprehension instruction.' },
        { step: 'Use the rope for parent communication', detail: 'The Reading Rope visual is excellent for conferences: "Your child is strong here and needs support here."' },
      ],
      example: 'A Grade 2 ELL decodes "The precipitation accumulated rapidly" perfectly — but has no idea what it means. Word recognition is strong. Language comprehension needs intensive support.',
      koreanNote: 'Korean parents often equate reading with decoding accuracy. The Reading Rope reframes: accurate decoding without comprehension is not real reading.',
    },
    { name: 'Encoding (Spelling as Phonics)', what: 'Teaching students to spell by segmenting words into sounds and writing corresponding letters.', why: 'Encoding strengthens decoding. When students spell, they actively process every sound — deepening phonics understanding. Dictation should be part of every phonics lesson.',
      howToTeach: [
        { step: 'Daily dictation routine', detail: 'After teaching a new pattern, dictate words, phrases, then sentences. Students segment and write.' },
        { step: 'Sound-by-sound spelling', detail: 'Say the word, stretch it, identify each sound, write letters. Use finger tapping or Elkonin boxes for support.' },
        { step: 'Proofreading', detail: 'Students touch each letter and say its sound to verify: "Does what I wrote match what I hear?"' },
        { step: 'Balance with decoding', detail: 'If a student can decode "ship" but spells it "shp" — they need more segmentation practice. If they spell it but cannot read it — more blending practice.' },
      ],
      example: 'Lesson on -ck pattern. Dictation: "rock, sock, duck, truck." Phrase: "a black duck." Sentence: "The duck sat on a rock." Students write, then check each sound.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Learning letter-sound correspondences. May decode CVC words very slowly with support. Relies on picture cues and L1 strategies.', support: 'Focus on letter-sound fluency with multisensory techniques. Picture-supported decodable texts. Accept slow decoding — accuracy over speed.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Decodes CVC words with increasing accuracy. Beginning blends and digraphs. Can spell simple words phonetically.', support: 'Decodable texts at instructional level. Daily dictation. Introduce high-frequency sight words alongside decodable words.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Reads words with common long vowel patterns. Decodes two-syllable words with support. Applies phonics to unfamiliar words in context.', support: 'More complex decodable texts. Introduce syllable types. Teach "check for meaning" after decoding.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Decodes most grade-level words. Beginning morphology. Phonics becoming automatic.', support: 'Multisyllabic strategies and morphological awareness. Greek and Latin roots for content vocabulary.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Decoding largely automatic. Applies word-level skills to challenging content texts. Uses morphology for word meaning.', support: 'Advanced spelling patterns and etymology. Focus on comprehension — decoding should not be a barrier.' },
  ],
  interventionSignals: [
    { signal: 'Cannot decode CVC words by mid-first grade', whatToDo: 'Check PA foundations first — can they blend and segment orally? If not, address PA. If PA is solid, increase multisensory phonics practice with decodable text at CVC level.' },
    { signal: 'Guesses at words from first letter or pictures', whatToDo: 'Redirect consistently: "Look at ALL the letters and sound it out." Remove picture support during phonics practice. Increase decodable text reading.' },
    { signal: 'Decodes accurately but very slowly', whatToDo: 'Build automaticity through repeated reading of familiar decodable texts. Timed word list drills. Move from slow decoding to instant sight recognition.' },
    { signal: 'Can decode but cannot spell the same words', whatToDo: 'Increase encoding practice (dictation). The student may be recognizing whole word shapes rather than processing sounds. Dictation forces sound-by-sound analysis.' },
    { signal: 'Grade 3+ cannot decode two-syllable words', whatToDo: 'Significant gap. Targeted intervention in syllable types and division. Structured program. Daily small-group practice 15-20 min. Monitor biweekly.' },
  ],
  koreanL1Considerations: [
    'Korean hangul is one of the most transparent writing systems — every symbol maps predictably to a sound. English is opaque by comparison. Korean students need more explicit instruction in English spelling patterns.',
    'Korean does not distinguish /l/ from /r/. Students confuse "light/right," "lake/rake." Minimal pair practice is essential.',
    'Final consonant clusters do not exist in Korean. Words like "jump," "desk," "strength" need specific attention to final sounds.',
    'Korean students may add a vowel between consonant clusters: "blue" becomes "buh-loo." Practice blending clusters without inserting extra sounds.',
  ],
  connectionToApp: 'The SoR Progression section provides the full scope and sequence — use it to identify what to teach next. Quick Check assesses phonics patterns. Standards Checklist tracks RF standards. Grade Entry captures phonics domain scores.',
}


// ═══════════════════════════════════════════════════════════════════
// 3. READING FLUENCY
// Sources: Hasbrouck & Tindal, Reading Rockets, NAEP, NRP
// ═══════════════════════════════════════════════════════════════════

export const READING_FLUENCY: GuideSection = {
  id: 'reading-fluency',
  title: 'Reading Fluency',
  icon: 'Gauge',
  subtitle: 'Reading accurately, at an appropriate rate, and with expression',
  overview: {
    what: 'Reading fluency is the ability to read text accurately, at a conversational pace, and with appropriate expression (prosody). It is NOT just speed. Fluency bridges decoding and comprehension: when word recognition becomes automatic, cognitive resources are freed for understanding.',
    whyItMatters: 'The NRP identified fluency as one of five essential reading components. Students who read disfluently devote so much attention to decoding that they cannot focus on meaning. For ELLs, disfluent reading creates a double cognitive burden — processing both decoding and language comprehension in a second language simultaneously.',
    researchBase: 'National Reading Panel (2000); Hasbrouck & Tindal ORF Norms (2017); NAEP Oral Reading Fluency Scale; Rasinski (2003); Reading Rockets: "When word recognition becomes automatic, children can shift attention to comprehending what they read."',
    bigIdea: 'Fluency is not about reading fast. It is about reading accurately and smoothly enough that the brain can focus on meaning instead of decoding.',
  },
  developmentalProgression: [
    { name: 'Accuracy', description: 'Reading words correctly. The foundation — without accuracy, rate and prosody are meaningless.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Decodable text at instructional level (90-96% accuracy)', 'Error correction: stop, sound out, reread the sentence', 'High-frequency word automaticity drills'] },
    { name: 'Automaticity (Rate)', description: 'Reading at a pace allowing comprehension. Measured as correct words per minute (CWPM). Not racing — efficiency.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 5', activities: ['Repeated reading: same passage 3-4 times, charting CWPM improvement', 'Partner reading: students take turns reading and supporting each other', 'Self-monitoring: students track own CWPM growth over weeks'] },
    { name: 'Prosody (Expression)', description: 'Reading with appropriate phrasing, stress, intonation — sounding like natural speech.', difficulty: 'advanced', gradeRange: 'Grade 2 to Grade 5', activities: ['Teacher modeling: read aloud expressively, students echo the same passage', 'Reader\'s theater: students perform scripts focusing on character voices', 'Phrase-cued reading: mark phrase boundaries with slashes, practice reading in phrases'] },
  ],
  milestones: [
    { grade: '1 (spring)', expectations: '60-80 CWPM with 95%+ accuracy. Beginning some expression.', assessHow: 'Oral reading fluency assessment with grade-level passage. Record CWPM and accuracy rate.' },
    { grade: '2 (spring)', expectations: '90-110 CWPM with 95%+ accuracy. Some expression and phrasing.', assessHow: 'ORF benchmark. NAEP fluency rubric (Level 2-3 expected).' },
    { grade: '3 (spring)', expectations: '110-130 CWPM. Appropriate phrasing and expression. Self-corrects errors.', assessHow: 'ORF benchmark. NAEP Level 3. Comprehension check alongside fluency.' },
    { grade: '4 (spring)', expectations: '120-145 CWPM. Adjusts rate for text difficulty.', assessHow: 'ORF benchmark. NAEP Level 3-4. Monitor comprehension alongside rate.' },
    { grade: '5 (spring)', expectations: '140-170 CWPM. Fluent across genres. Expression supports comprehension.', assessHow: 'ORF benchmark. NAEP Level 4. Fluency should not be a barrier to comprehension.' },
  ],
  skills: [
    { name: 'Oral Reading Fluency Assessment', what: 'Measuring how accurately and quickly a student reads connected text aloud.', why: 'ORF is the most efficient indicator of overall reading competence in elementary grades. Takes 1-3 minutes. Must be interpreted alongside comprehension — speed without understanding is word-calling.',
      howToTeach: [
        { step: 'Administer correctly', detail: 'Unpracticed, grade-level passage. Student reads 1 minute. Mark errors (substitutions, omissions, insertions). Self-corrections are NOT errors. CWPM = total words minus errors.' },
        { step: 'Interpret with accuracy', detail: 'Calculate accuracy: (correct / attempted) x 100. Independent: 97%+. Instructional: 90-96%. Frustration: below 90%. Fast reading below 90% accuracy = needs to slow down.' },
        { step: 'Use benchmark norms', detail: 'Hasbrouck-Tindal 50th percentile spring: Grade 1: 60, Grade 2: 100, Grade 3: 112, Grade 4: 133, Grade 5: 146. ELLs may score below norms and still be progressing well.' },
        { step: 'Assess prosody separately', detail: 'NAEP Scale (1-4) evaluates expression, phrasing, punctuation adherence. Adequate CWPM with poor prosody = reading words but not constructing meaning.' },
      ],
      example: 'Student reads Grade 2 passage: 112 words attempted, 6 errors. CWPM = 106. Accuracy = 94.6% (instructional). NAEP prosody: Level 2. Action: good rate, needs phrasing work.',
      koreanNote: 'Korean reading fluency develops differently because hangul is highly regular. ELL students may decode accurately but slowly — this reflects English complexity, not a disability.',
      ccss: 'RF.1.4, RF.2.4, RF.3.4, RF.4.4, RF.5.4',
    },
    { name: 'Repeated Reading Protocol', what: 'Having students read the same passage multiple times to build automaticity and expression.', why: 'One of the most research-validated fluency interventions. Each rereading builds automaticity, freeing resources for prosody and comprehension.',
      howToTeach: [
        { step: 'Select appropriate text', detail: 'Instructional level (90-96% accuracy on first read). 100-200 words. Interesting enough for multiple readings.' },
        { step: 'First read: accuracy', detail: 'Read aloud. Teacher notes errors and provides correction. Calculate baseline CWPM.' },
        { step: 'Second read: smoother', detail: 'Reread same passage. CWPM typically improves 10-20%. Teacher models any choppy phrases.' },
        { step: 'Third/fourth read: fluent', detail: 'Noticeably improved rate and expression. Chart gains to show growth and motivate.' },
      ],
      example: 'Student reads 120-word passage: Read 1: 68 CWPM. Read 2: 82 CWPM. Read 3: 91 CWPM with better phrasing. Student sees growth on chart.',
    },
    { name: 'Prosody Instruction', what: 'Teaching reading with appropriate expression, phrasing, stress, and intonation.', why: 'Prosody is the most overlooked fluency component. A student reading in monotone at 120 CWPM is not truly fluent — their brain is not grouping words into meaningful phrases. Prosody directly supports comprehension.',
      howToTeach: [
        { step: 'Model expressive reading', detail: 'Read aloud daily with expression. Make connections explicit: "Did you hear how I paused at the comma? That helped me understand the sentence."' },
        { step: 'Phrase-cued reading', detail: 'Mark phrase boundaries: "The big dog / ran across the yard / and barked at the cat." Students practice reading phrase by phrase.' },
        { step: 'Echo reading', detail: 'Teacher reads a sentence with expression. Student echoes it, matching phrasing and intonation. Gradually increase length.' },
        { step: 'Reader\'s theater', detail: 'Students perform scripts using voice for character emotion. Authentic purpose for expressive reading. No memorization — read from scripts.' },
      ],
      example: 'Phrase-cued: "Once upon a time, / there was a little girl / who lived at the edge / of a dark forest." Read as marked, then without slashes maintaining phrasing.',
      koreanNote: 'Korean tends toward more level intonation. English uses dramatic pitch changes for emphasis and meaning. Students need explicit instruction on English intonation, especially questions vs. statements.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Reads very slowly, word by word. May finger-point. Accuracy depends on phonics knowledge.', support: 'Focus on accuracy — rate will follow. Decodable texts at their level. Echo reading. Do not push speed.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Reads in 2-word phrases. Below grade norms. Decodes most words accurately but slowly. Minimal expression.', support: 'Repeated reading with familiar texts. Partner reading. High-frequency word automaticity. Short, frequent practice.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Reads in 3-4 word phrases. Approaching norms. Attends to punctuation. Some expression on familiar text.', support: 'Phrase-cued reading. Reader\'s theater. Push toward internal prosody during silent reading.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Adequate rate with mostly appropriate phrasing. Expression on familiar text. Self-corrects most errors.', support: 'Focus on prosody and self-monitoring. Challenge with complex texts. Build fluency across genres.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Reads fluently with appropriate rate, accuracy, and expression. Adjusts for text difficulty.', support: 'No longer primary focus. Monitor with grade-level content-area text. Address genre-specific disfluency.' },
  ],
  interventionSignals: [
    { signal: 'Below 40 CWPM in spring of Grade 1', whatToDo: 'Check accuracy — if below 90%, the student needs phonics support before fluency. If accuracy is adequate, increase decodable text volume and daily repeated reading.' },
    { signal: 'Flat, word-by-word reading in Grade 2+', whatToDo: 'Prosody instruction needed, not speed practice. Echo reading, phrase-cued reading, reader\'s theater. Check comprehension — flat prosody often signals weak understanding.' },
    { signal: 'Fast but inaccurate (skipping words, not self-correcting)', whatToDo: 'Slow down and finger-track. "Fast and wrong is not fluent." Return to instructional-level text where accuracy is 90-96%.' },
    { signal: 'CWPM stagnates despite practice', whatToDo: 'Check for phonics ceiling — may need decoding instruction for next-level patterns. Also check vocabulary: students slow on words they decode but do not understand.' },
  ],
  koreanL1Considerations: [
    'Korean reading rate develops quickly due to regular hangul. Korean students may initially read English much more slowly — this is normal. The gap narrows with exposure.',
    'Korean prosody differs from English. Korean uses particles and endings; English relies on stress and intonation. Explicit prosody modeling is essential.',
    'Teach punctuation as traffic signals: period = full stop, comma = pause, question mark = voice goes up, exclamation = strong feeling.',
  ],
  connectionToApp: 'The Reading Fluency page tracks CWPM over time with trend charts. NAEP Scale reference panel explains the 4 levels. ORF data feeds into attendance-academic analysis. Use alongside domain grades for a complete picture.',
}


// ═══════════════════════════════════════════════════════════════════
// 4. READING SKILLS
// Sources: Reading Rockets, Tan Huynh, Duke & Pearson, NRP
// ═══════════════════════════════════════════════════════════════════

export const READING_SKILLS: GuideSection = {
  id: 'reading-skills',
  title: 'Reading Skills',
  icon: 'BookOpen',
  subtitle: 'Comprehension strategies, text analysis, and critical reading across genres',
  overview: {
    what: 'Reading skills encompass the comprehension strategies that allow students to construct meaning from text — from foundational skills like identifying main idea and making inferences, to higher-order skills like analyzing author\'s purpose, evaluating text structure, and synthesizing across sources. For ELLs, comprehension instruction must begin early — alongside phonics, not after it.',
    whyItMatters: 'Decoding without comprehension is not reading. The NRP found that explicit comprehension strategy instruction significantly improves outcomes. Both single-strategy approaches (self-questioning) and multi-strategy programs (reciprocal teaching) produce gains. Comprehension instruction can be embedded in content-area teaching with equal or better results.',
    researchBase: 'NRP (2000); Duke & Pearson (2002); Tan Huynh: Before-During-After Reading; Reading Rockets: "Comprehension instruction should start early and run simultaneously with phonics."',
    bigIdea: 'Good readers do not just absorb text — they actively think about it. Comprehension strategies must be explicitly taught, modeled, and practiced until automatic.',
  },
  developmentalProgression: [
    { name: 'Literal Comprehension', description: 'Understanding explicitly stated information — who, what, where, when. Answering "right there" questions.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Who/what/where/when questions after read-alouds', 'Sequencing events with picture cards', 'Retelling with beginning/middle/end'] },
    { name: 'Inferential Comprehension', description: 'Reading between the lines — combining text clues with prior knowledge to draw unstated conclusions.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 5', activities: ['Text Clue + What I Know = Inference formula', 'Picture-based inference before text-based', '"How do you know?" questioning — cite evidence for every inference'] },
    { name: 'Evaluative & Analytical', description: 'Analyzing author choices, evaluating arguments, comparing texts, synthesizing from multiple sources.', difficulty: 'advanced', gradeRange: 'Grade 3 to Grade 5', activities: ['Author\'s purpose analysis across multiple texts', 'Text structure comparison: how structure affects meaning', 'Argument analysis: what claim and what evidence?'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Retells with key details. Identifies main topic. Asks and answers questions about text.', assessHow: 'Oral retelling rubric. Comprehension questions after read-alouds.' },
    { grade: '2', expectations: 'Identifies main idea and supporting details. Makes simple inferences. Describes character responses.', assessHow: 'Written responses. IRI comprehension questions.' },
    { grade: '3', expectations: 'Determines theme and main idea. Describes character traits from evidence. Distinguishes perspectives.', assessHow: 'Text-dependent analysis. ACE written responses (Answer-Cite-Explain).' },
    { grade: '4-5', expectations: 'Summarizes. Compares themes across texts. Analyzes text structure and author craft. Integrates multiple sources.', assessHow: 'Extended written responses. Comparison essays. Multi-source research.' },
  ],
  skills: [
    { name: 'Main Idea & Supporting Details', what: 'Identifying the most important point and the details supporting it.', why: 'Main idea is the gateway to all deeper analysis. ELLs often confuse the topic (one word) with the main idea (a complete thought).',
      howToTeach: [
        { step: 'Topic vs. main idea', detail: 'Topic = one word (recycling). Main idea = a sentence about the topic (Recycling helps the Earth by reducing trash). Use the headline test.' },
        { step: 'Umbrella strategy', detail: 'Main idea is the umbrella; details are raindrops underneath. Students sort sentences into umbrella and raindrops.' },
        { step: 'Two-column notes', detail: 'Left: main idea per paragraph. Right: key details. Process text paragraph by paragraph.' },
        { step: 'Shrink it', detail: 'State the main idea in 10 words or fewer. Forces precision.' },
      ],
      example: 'Bears paragraph: "Topic: bears. Main idea: Bears eat many different foods." Student identifies supporting details about fish, berries, and honey.',
      koreanNote: 'Korean students may confuse 주제 (topic) with 중심 생각 (main idea). Explicitly teach the difference.', ccss: 'RI.x.2, RL.x.2',
    },
    { name: 'Making Inferences', what: 'Using text clues plus background knowledge to determine what the author did not state directly.', why: 'Most meaningful comprehension requires inference. For ELLs, inference is doubly challenging due to possible cultural background knowledge gaps.',
      howToTeach: [
        { step: 'Teach the formula', detail: 'Text Clue + What I Know = Inference. Write on the board. Use every time.' },
        { step: 'Start with pictures', detail: 'Show a photo: "What is happening? What clues?" Accessible even to WIDA 1-2.' },
        { step: 'Think-aloud modeling', detail: 'Read aloud, stop, model: "The text says her hands shook. I know shaking = nervousness. I infer she is nervous."' },
        { step: 'Push for evidence', detail: 'Frame: "I think ___ because the text says ___ and I know that ___."' },
      ],
      example: '"Sarah grabbed her umbrella and raincoat." Text clue: umbrella/raincoat. Background: people use these in rain. Inference: it is raining.',
      koreanNote: 'Korean reading instruction emphasizes explicit comprehension more than inference. Students need extensive modeling.', ccss: 'RL.x.1, RI.x.1',
    },
    { name: 'Before-During-After Reading', what: 'A three-phase framework for structuring comprehension around any text.', why: 'Tan Huynh emphasizes comprehension is built before, during, and after — not just checked afterward. ELLs especially need pre-reading support.',
      howToTeach: [
        { step: 'Before', detail: 'Activate background knowledge. Pre-teach key vocabulary. Set purpose. Make predictions. Use visuals, video, or L1 discussion.' },
        { step: 'During', detail: 'Monitor comprehension. Stop and think: "Does this make sense?" Annotate. Partner check-ins at stopping points.' },
        { step: 'After', detail: 'Summarize. Text-dependent questions. Discuss. Write. Make connections. This is where deep comprehension happens.' },
        { step: 'Vary strategies', detail: 'Before: KWL, picture walk, vocab preview. During: annotation, think-pair-share, graphic organizers. After: written response, discussion, presentation.' },
      ],
      example: 'Volcano text: Before — eruption video + pre-teach "erupt, magma, ash." During — students annotate, circling unknowns. After — cause-effect organizer about eruption impacts.',
    },
    { name: 'Text Evidence (ACE Method)', what: 'Pointing to specific text that supports an answer: Answer, Cite, Explain.', why: 'Without text evidence, students give unsupported opinions. ACE provides the structure ELLs need for academic responses.',
      howToTeach: [
        { step: 'Build the reflex', detail: 'Every question: "Where does it say that? Show me." Make it a classroom routine.' },
        { step: 'Teach ACE', detail: 'Answer the question. Cite evidence. Explain how evidence supports the answer. Model with every text response.' },
        { step: 'Highlighting', detail: 'Students highlight the proving sentence before writing. Makes abstract skill concrete.' },
        { step: 'Sentence starters', detail: '"According to the text..." / "The author states..." / "On page ___, it says..."' },
      ],
      example: 'Q: How does the character feel? ACE: "She feels nervous. (A) The text says her hands were shaking. (C) Shaking hands is a sign of anxiety. (E)"',
      koreanNote: 'Korean students may answer from memory or opinion. Train the "go back to the text" reflex as a classroom norm.', ccss: 'RL.x.1, RI.x.1',
    },
    { name: 'Summarizing', what: 'Retelling the most important parts in your own words, leaving out small details.', why: 'Summarizing requires students to determine importance, organize information, and express ideas concisely — three skills essential for academic success.',
      howToTeach: [
        { step: 'Somebody-Wanted-But-So-Then', detail: 'For narrative: Who wanted what? What was the problem? What happened? How did it end?' },
        { step: 'What? So What?', detail: 'For informational: What is the topic? Why does it matter? What are the key points?' },
        { step: '10-word summary', detail: 'Give students a paragraph and 10 words. Summarize using only those words. Forces conciseness.' },
        { step: 'Distinguish retelling from summary', detail: 'Retelling = everything. Summary = only the important parts. Make this difference explicit.' },
      ],
      example: 'Story summary: "Somebody: a girl. Wanted: to find her lost dog. But: it was raining. So: she searched all day. Then: she found the dog under the porch."',
      koreanNote: 'ELLs often retell rather than summarize — they include every detail. Explicitly teach the difference.', ccss: 'RL.x.2, RI.x.2',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Identifies key details with visual support. Points to answers. Retells using pictures. Responds to literal who/what/where.', support: 'Heavily illustrated texts. Accept one-word or L1 responses. Read aloud and discuss before expecting English responses.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Retells with beginning/middle/end. Identifies main topic with support. Simple inferences from pictures and text.', support: 'Graphic organizers for every text. Sentence frames. Partner discussion before writing. Pre-teach vocabulary.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Identifies main idea and key details. Makes inferences with evidence. Compares texts. Writes short ACE responses.', support: 'Push for text evidence. Teach summarizing. Before-during-after framework. Build academic discussion vocabulary.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Analyzes character development. Identifies text structure. Distinguishes fact from opinion. Multi-paragraph responses.', support: 'Author craft and purpose. Analytical vocabulary. Complex texts across genres. Peer discussion and debate.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Synthesizes across texts. Evaluates arguments. Analyzes author perspective. Comprehends grade-level text independently.', support: 'Deeper analysis: "Why did the author choose this structure?" Nuance, tone, style. Bridge to content-area reading.' },
  ],
  interventionSignals: [
    { signal: 'Cannot retell after reading', whatToDo: 'Check decoding first — if below 90% accuracy, text is too hard. If decoding is adequate, teach retelling with visual supports (story maps, sequencing cards).' },
    { signal: 'Decodes fluently but answers incorrectly', whatToDo: 'Comprehension gap, not decoding. Check vocabulary and background knowledge. Increase pre-reading support.' },
    { signal: 'Cannot make inferences even with prompting', whatToDo: 'Return to picture-based inference. Use the formula explicitly every time. This takes significant practice for ELLs.' },
    { signal: 'Answers verbally but cannot write responses', whatToDo: 'Language production issue, not comprehension. Provide frames, word banks, oral rehearsal before writing. Let student dictate while building writing stamina.' },
  ],
  koreanL1Considerations: [
    'Korean reading instruction emphasizes recall of details over inference and analysis. Higher-order skills need explicit, sustained instruction.',
    'Cultural background gaps impact comprehension significantly. Texts about American holidays, sports, or geography require knowledge Korean students may lack. Pre-build background knowledge.',
    'Korean text structure often builds to the main point at the end; English states the thesis first. Teach English text structures explicitly.',
  ],
  connectionToApp: 'Grade Entry tracks Reading domain scores. Quick Check assesses comprehension rapidly. Standards Checklist covers all RL and RI standards. Reading Fluency data combined with comprehension shows whether a struggling reader has a decoding gap, comprehension gap, or both.',
}


// ═══════════════════════════════════════════════════════════════════
// 5. VOCABULARY
// Sources: Beck, McKeown & Kucan, Reading Rockets, Tan Huynh
// ═══════════════════════════════════════════════════════════════════

export const VOCABULARY: GuideSection = {
  id: 'vocabulary',
  title: 'Vocabulary',
  icon: 'Sparkles',
  subtitle: 'Building deep word knowledge through systematic, strategic instruction',
  overview: {
    what: 'Vocabulary instruction explicitly teaches word meanings and strategies for independent word learning. Effective instruction goes beyond definitions — it builds rich, contextual word knowledge through multiple exposures across contexts. The three-tier framework (Beck, McKeown & Kucan) organizes words: Tier 1 (basic everyday), Tier 2 (high-utility academic), Tier 3 (domain-specific content).',
    whyItMatters: 'Vocabulary is the strongest predictor of comprehension after decoding. For ELLs, vocabulary is the single biggest barrier — they may decode perfectly but understand nothing. Tan Huynh emphasizes distinguishing content language from academic language for planning ELL instruction.',
    researchBase: 'Beck, McKeown & Kucan (2002) "Bringing Words to Life"; NRP (2000); Marzano (2004); Tan Huynh: Content-Language Objectives; Reading Rockets: "Teaching vocabulary for a specific text helps with that text; building broad knowledge helps generally."',
    bigIdea: 'Vocabulary is not learned through definitions alone. Deep word knowledge develops through multiple, meaningful encounters — hearing, reading, speaking, and writing words in context.',
  },
  developmentalProgression: [
    { name: 'Tier 1: Basic Words', description: 'Everyday words most native speakers know. For ELLs, even these may need instruction.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Label classroom objects', 'TPR for action words', 'Picture-word matching', 'Daily conversation with target words'] },
    { name: 'Tier 2: Academic Vocabulary', description: 'High-utility words across content areas (analyze, compare, establish). Primary instruction target.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 5', activities: ['Word of the day with multiple encounters', 'Word maps: definition, synonym, antonym, picture, sentence', 'Frayer Model: definition, characteristics, examples, non-examples', 'Using target words in speaking AND writing'] },
    { name: 'Tier 3: Domain-Specific', description: 'Technical terms (photosynthesis, denominator). Best taught within content context.', difficulty: 'advanced', gradeRange: 'Grade 2 to Grade 5', activities: ['Pre-teach before content lessons', 'Content-area word walls', 'Morphological analysis: photo + synthesis', 'Content journals with glossaries'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Uses common everyday words. Sorts words into categories. Learning from read-alouds.', assessHow: 'Oral vocabulary assessment. Picture naming. Observation during discussions.' },
    { grade: '1-2', expectations: 'Uses context clues. Understands common Tier 2 words. Identifies synonyms and antonyms.', assessHow: 'Context clue assessment. Vocabulary matching. Listening comprehension.' },
    { grade: '3-5', expectations: 'Uses morphology for word meaning. Consults references. Uses academic vocabulary accurately in speaking and writing.', assessHow: 'Vocabulary in context tests. Written use of target words. Morphological analysis.' },
  ],
  skills: [
    { name: 'Selecting Words to Teach', what: 'Choosing which words deserve direct instruction time using the three-tier framework.', why: 'You cannot teach every word. Tier 2 words give the most return — they appear across subjects and texts.',
      howToTeach: [
        { step: 'Identify Tier 2 in the text', detail: 'Scan for words that are important, likely to recur in other contexts, and not already known. These are your targets.' },
        { step: 'Limit to 3-5 per text', detail: 'Too many words dilutes instruction. Choose the most essential and most transferable.' },
        { step: 'Pre-teach Tier 3 briefly', detail: 'Quick introduction: definition, visual, connection to concept. Deep learning happens through content engagement.' },
        { step: 'Note Tier 1 gaps for ELLs', detail: 'If a student does not know "sink" or "ceiling," address through immersion and conversation, not formal lessons.' },
      ],
      example: 'Weather text: Tier 3 pre-teach: precipitation, evaporation. Tier 2 teach deeply: accumulate, severe, impact. Tier 1 check for ELLs: puddle, forecast.',
      koreanNote: 'Many Tier 2 English words have Sino-Korean equivalents (analyze = 분석, establish = 설립). Making these cognate connections dramatically accelerates acquisition for advanced learners.',
    },
    { name: 'Teaching Words Deeply', what: 'Moving beyond definitions to rich, contextual word knowledge through multiple exposures.', why: 'Students need 10-12 meaningful encounters with a word before it becomes productive vocabulary.',
      howToTeach: [
        { step: 'Student-friendly definition', detail: '"Reluctant means you do not want to do something — you hesitate." Not: "Reluctant: adjective, unwilling."' },
        { step: 'Multiple contexts', detail: 'Show the word in different sentences. Each context builds richer understanding.' },
        { step: 'Student interaction', detail: 'Students must USE the word: "Tell your partner about a time you felt reluctant." "Write a sentence using reluctant."' },
        { step: 'Revisit repeatedly', detail: 'Mention target words throughout the week across activities. Vocabulary builds through repetition, not one-time instruction.' },
      ],
      example: 'Monday: introduce "transform" + 3 examples. Tuesday: find transformation in science. Wednesday: use in writing. Thursday: word map. Friday: use in a sentence, give synonym.',
    },
    { name: 'Morphological Awareness', what: 'Using word parts (prefixes, suffixes, roots) to determine meanings of unfamiliar words.', why: 'The most powerful independent word-learning strategy. A student who knows "un-" means "not" and "-able" means "can be" can unlock dozens of words.',
      howToTeach: [
        { step: 'Teach common affixes first', detail: 'Most frequent: un-, re-, pre-, -tion, -able, -ful, -less, -ment. These cover a huge percentage of derived English words.' },
        { step: 'Word sums', detail: 're + play + ing = replaying. "Re- means again, play means activity, so replay = play again."' },
        { step: 'Greek and Latin roots (Grades 3-5)', detail: 'Common roots: dict (say), port (carry), struct (build), rupt (break). These unlock word families.' },
        { step: 'Apply during reading', detail: '"Do I see parts I know? Prefix? Suffix? Root?" This becomes an independent word-solving tool.' },
      ],
      example: '"Unbreakable": un- = not, break = damage, -able = can be. Cannot be broken.',
      koreanNote: 'Korean uses Chinese characters similarly to Greek/Latin roots. Making this parallel explicit helps Korean students transfer existing word analysis skills.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Basic survival vocabulary. Labels objects. Understands high-frequency words with visual support.', support: 'TPR. Picture-word walls. Label the classroom. Bilingual glossaries. Focus on essential Tier 1.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Growing everyday vocabulary. Understands simple Tier 2 in context. Basic descriptive words. Beginning context clues.', support: 'Pre-teach before every text. Visuals for all new words. Word banks. Daily word-learning routines.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Uses Tier 2 words in speaking/writing with support. Simple context clues. Basic word relationships.', support: 'Morphological analysis. Frayer Model. Multiple exposures across content areas. Word maps.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Academic vocabulary across content areas. Independent morphological strategies. Understands figurative language with support.', support: 'Greek/Latin roots. Explicit idiom instruction (no transfer from Korean). Content-area vocabulary journals.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Precise academic vocabulary. Interprets figurative language, nuance, connotation. Approaches grade-level.', support: 'Subtle distinctions: connotation, register, tone. Word choice in writing. Remaining idiom and culturally-embedded gaps.' },
  ],
  interventionSignals: [
    { signal: 'Decodes fluently but does not comprehend', whatToDo: 'Vocabulary gap is most likely. Pre-teach key vocabulary before reading. Use word preview routine.' },
    { signal: 'Cannot explain words after direct instruction', whatToDo: 'Increase exposures and interaction. One lesson is not enough — need 10-12 encounters. Create opportunities to hear, read, speak, and write target words.' },
    { signal: 'Relies on dictionary translation for every unknown word', whatToDo: 'Build context clue and morphological strategies. Teach to try these first before dictionary. Bilingual dictionaries are backup, not primary strategy.' },
  ],
  koreanL1Considerations: [
    'Many academic English words share Sino-Korean roots. Explicitly teaching connections (biography = 전기) accelerates Tier 2 and 3 acquisition.',
    'English idioms almost never transfer from Korean. "Raining cats and dogs" is completely opaque. Teach as fixed expressions.',
    'Korean formality registers (존댓말/반말) differ from English register. Teach that "difficult" is more academic than "hard."',
  ],
  connectionToApp: 'Grade Entry tracks Language Standards domain scores including vocabulary. WIDA profiles guide instruction intensity. Teacher Guides contain Tan Huynh resources on academic and content language.',
}


// ═══════════════════════════════════════════════════════════════════
// 6. GRAMMAR
// Sources: Weaver, Anderson, Tan Huynh, WIDA
// ═══════════════════════════════════════════════════════════════════

export const GRAMMAR: GuideSection = {
  id: 'grammar',
  title: 'Grammar',
  icon: 'Type',
  subtitle: 'Parts of speech, sentence structure, and English conventions for ELLs',
  overview: {
    what: 'Grammar instruction for ELLs focuses on essential English language conventions for communication and academic success — parts of speech, sentence structure, verb tenses, and patterns Korean speakers find most challenging. Effective grammar is embedded in meaningful reading and writing, not isolated drills.',
    whyItMatters: 'For ELLs, grammatical accuracy impacts both comprehension and communication. However, isolated grammar drills produce minimal transfer to actual writing. Grammar is best taught through noticing patterns in texts students read, then applying them in texts students write.',
    researchBase: 'Weaver (1996) "Teaching Grammar in Context"; Anderson (2005) "Mechanically Inclined"; Tan Huynh: Sentence-Level Instruction; WIDA: Language forms best taught within meaningful communication.',
    bigIdea: 'Grammar is not rules to memorize — it is patterns to notice, practice, and use. Teach through reading and writing, not before it.',
  },
  developmentalProgression: [
    { name: 'Basic Sentence Structure', description: 'Subject + Verb + Object order. Simple complete sentences. English SVO vs. Korean SOV.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Sentence strips: physically arrange word cards in SVO order', 'Sentence expansion: "The dog ran" → add words one at a time', 'Daily oral sentence practice from pictures'] },
    { name: 'Parts of Speech & Agreement', description: 'Nouns, verbs, adjectives, pronouns, prepositions. Subject-verb agreement. Plural -s and tense markers.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 3', activities: ['Color-coded sentences: red = subject, blue = verb, green = object', 'Verb tense timeline on the wall', 'Daily editing: find and fix errors in model sentences'] },
    { name: 'Complex Sentences & Conventions', description: 'Compound/complex sentences with conjunctions. Relative clauses. Consistent tense. Punctuation.', difficulty: 'advanced', gradeRange: 'Grade 3 to Grade 5', activities: ['Sentence combining: merge two simple sentences into one complex', 'Mentor sentence study: analyze one well-crafted sentence per day from real text', 'Grammar journals: collect interesting sentences and analyze structure'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Produces complete simple sentences. Uses common nouns and verbs. Beginning capitals and periods.', assessHow: 'Writing samples. Oral observation. Sentence dictation.' },
    { grade: '2-3', expectations: 'Subject-verb agreement. Basic punctuation. Compound sentences with and, but, so.', assessHow: 'Writing conventions rubric. Editing tasks.' },
    { grade: '4-5', expectations: 'Complex sentences with subordinate clauses. Varied sentence structure. Comma rules. Consistent verb tense.', assessHow: 'Writing analysis. Sentence variety checks. Self-editing checklists.' },
  ],
  skills: [
    { name: 'Subject-Verb Agreement', what: 'Making the verb match the subject in number (he walks, they walk).', why: 'Korean verbs never change for subject. This rule does not exist in Korean and requires constant, long-term reinforcement.',
      howToTeach: [
        { step: 'Physical practice', detail: 'Point to one student: "She runs." Two: "They run." Fast-paced daily drill.' },
        { step: 'Third-person -s focus', detail: 'He/she/it + verb-s. Practice daily with high-frequency verbs.' },
        { step: 'Noticing in text', detail: 'During shared reading, pause: "Why walks and not walk?" Build awareness through reading first.' },
        { step: 'Editing practice', detail: 'Fix errors: "The dogs runs fast" → "The dogs run fast." Start obvious, increase subtlety.' },
      ],
      example: 'Daily drill with pictures: "One cat — the cat sits. Two cats — the cats sit." Quick oral, then one written sentence.',
      koreanNote: 'THE most persistent error for Korean ELLs. No equivalent system in Korean. Be patient — expect this across all levels. Correct gently and consistently.', ccss: 'L.1.1, L.2.1, L.3.1',
    },
    { name: 'Articles (a, an, the)', what: 'Using determiners correctly before nouns.', why: 'Korean has NO articles. The single most common grammar error for Korean ELLs. May never fully resolve at lower levels.',
      howToTeach: [
        { step: 'The pointing test', detail: 'Can point to specific thing → "the." Any one → "a/an." Practice with classroom objects.' },
        { step: 'First mention vs. known', detail: 'First time: "I saw a dog." Second mention: "The dog was big." Covers most usage.' },
        { step: 'Exposure and noticing', detail: 'Highlight articles during shared reading. Do NOT expect mastery from drills — acquisition happens through massive exposure.' },
        { step: 'Patterns over rules', detail: 'Too many rules to memorize. Teach: "the + specific/known," "a + first mention/general," "no article + uncountable/plural general."' },
      ],
      example: '"Once there was a girl. The girl had a cat. The cat was orange. A bird flew into the room. The girl and the cat watched the bird."',
      koreanNote: 'No articles in Korean. "I saw dog" and "I went to school" (omitting articles) are correct in Korean. Not low intelligence or poor effort — fundamental L1 transfer. Be patient.', ccss: 'L.1.1, L.2.1',
    },
    { name: 'Verb Tenses', what: 'Using past, present, and future correctly and consistently.', why: 'English has a complex tense system. Korean marks tense differently, and English irregular past requires memorization.',
      howToTeach: [
        { step: 'Timeline visual', detail: 'Past-present-future timeline on wall. Point to position when discussing events.' },
        { step: 'Regular past first', detail: 'Walk→walked, play→played. Practice pronunciation: /t/ after voiceless, /d/ after voiced, /ɪd/ after t/d.' },
        { step: 'Irregular past through repetition', detail: 'Daily flashcard drill: go→went, see→saw, eat→ate. Songs and games. Focus on 30 most common first.' },
        { step: 'Consistent tense in writing', detail: '"Am I writing about the past? Every verb should be past." Color-code tense shifts.' },
      ],
      example: '"Yesterday I walked to school. I saw my friend. We talked and played. Then we went to class." Student identifies every past tense, noting regular vs. irregular.',
      koreanNote: 'Korean past tense is consistent (-았/었다), making English irregular forms (go→went) a major burden. Progressive tense (-ing) is often overused because Korean has a similar structure.',
    },
    { name: 'Sentence Combining', what: 'Merging simple sentences into compound or complex sentences using conjunctions and subordinators.', why: 'Research shows sentence combining is one of the most effective ways to improve writing quality. It builds grammatical sophistication through practice, not rules.',
      howToTeach: [
        { step: 'Start with coordinating conjunctions', detail: 'FANBOYS: for, and, nor, but, or, yet, so. "The dog is big. The dog is friendly." → "The dog is big and friendly."' },
        { step: 'Add subordinating conjunctions', detail: 'Because, although, when, while, if. "I stayed inside. It was raining." → "I stayed inside because it was raining."' },
        { step: 'Practice daily', detail: 'Give two simple sentences. Students combine them in multiple ways. Compare: which sounds best?' },
        { step: 'Notice in mentor texts', detail: '"Look at this sentence the author wrote. Can you find the two ideas she combined? What word connected them?"' },
      ],
      example: 'Simple: "The cat sat on the mat. The cat was orange." Combined: "The orange cat sat on the mat." Or: "The cat, which was orange, sat on the mat."',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Words and short phrases. May not use complete sentences. Korean SOV word order.', support: 'Basic SVO patterns. Accept errors, model correct forms. Focus on communication first, accuracy gradually.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Simple sentences with frequent errors. Beginning verb tenses. Omits articles, plural -s, agreement.', support: 'Recast: "She go school" → "Yes, she goes to school." Daily sentence writing. One grammar target at a time.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Complete sentences most of the time. Past and present with some accuracy. Compound sentences.', support: 'Sentence combining. Editing checklists. Grammar mini-lessons from student writing patterns.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Complex sentences with clauses. Agreement mostly accurate. Variety of tenses. Persistent article errors.', support: 'Mentor sentences. Advanced punctuation. Grammar for writing voice and style.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Near native-like accuracy. Occasional article/preposition errors. Can self-edit.', support: 'Style and register. Formal vs. informal. Address fossilized errors through explicit awareness.' },
  ],
  interventionSignals: [
    { signal: 'Only words/phrases after 6+ months', whatToDo: 'May be extended silent period (normal) or need more structured oral practice. Increase low-risk speaking: sentence frames, partner talk, choral response.' },
    { signal: 'No sentence boundaries in writing', whatToDo: 'Teach explicitly: "Sentence = capital letter + subject + verb + period." Daily sentence dictation practice.' },
    { signal: 'Persistent verb tense errors after instruction', whatToDo: 'May be fossilized. Write error and correction side by side. Self-editing checklists. Takes time — be patient.' },
  ],
  koreanL1Considerations: [
    'Korean is SOV: "I pizza eat." English is SVO: "I eat pizza." Physical sentence-building activities help rewire this pattern.',
    'Korean drops pronouns when subject is understood. Students write "Is happy" not "She is happy." Check for missing subjects.',
    'Korean uses particles (은/는, 을/를) instead of prepositions. Preposition errors are extremely common.',
    'Korean verbs always end the sentence and never change for subject. Every aspect of English verb usage must be explicitly taught.',
  ],
  connectionToApp: 'Grade Entry tracks Language Standards. Writing assessments capture grammar alongside content. Sentence Patterns reference provides WIDA-leveled frames.',
}


// ═══════════════════════════════════════════════════════════════════
// 7. WRITING
// Sources: Graham & Perin, NRP, Tan Huynh, Calkins
// ═══════════════════════════════════════════════════════════════════

export const WRITING: GuideSection = {
  id: 'writing',
  title: 'Writing',
  icon: 'PencilLine',
  subtitle: 'Process writing, genre development, and building written expression for ELLs',
  overview: {
    what: 'Writing instruction encompasses process writing (planning, drafting, revising, editing, publishing), genre-specific skills (narrative, informational, opinion), and sentence-level skills. For ELLs, writing is the last domain to develop and most challenging — requiring simultaneous control of content, organization, vocabulary, grammar, and conventions.',
    whyItMatters: 'Writing is both a skill and a learning tool. The NRP found writing about texts improves comprehension more than answering questions. Tan Huynh emphasizes ELLs need explicit instruction in planning for academic writing with scaffolds that gradually release.',
    researchBase: 'Graham & Perin (2007) "Writing Next"; NRP (2000); Tan Huynh: Planning for Academic Writing; Calkins (2003) Units of Study.',
    bigIdea: 'Writing is thinking made visible. For ELLs, scaffolded writing instruction builds both language and content understanding simultaneously.',
  },
  developmentalProgression: [
    { name: 'Drawing & Labeling', description: 'Expressing ideas through pictures with labels and captions. Entry point for pre-writers and beginning ELLs.', difficulty: 'foundational', gradeRange: 'K to Grade 1', activities: ['Draw and label', 'Dictated writing: student tells story, teacher writes, student copies', 'Interactive writing: teacher and students share the pen'] },
    { name: 'Sentence Writing', description: 'Composing complete sentences. Using sentence frames for supported output.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Sentence frames: "I see a ___." "I like ___ because ___."', 'Daily journal: even one sentence builds habit', 'Sentence expansion: 3 words → add details one at a time'] },
    { name: 'Paragraph Writing', description: 'Organizing sentences around a central idea with topic sentence, details, closing.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 3', activities: ['Hamburger model: top bun (topic), fillings (details), bottom bun (closing)', 'Transition words: first, next, also, finally', 'Shared writing: compose together before independent practice'] },
    { name: 'Multi-Paragraph & Genre', description: 'Organized essays in narrative, informational, opinion genres with intros, body, conclusions.', difficulty: 'advanced', gradeRange: 'Grade 3 to Grade 5', activities: ['Genre-specific graphic organizers', 'Mentor text analysis: study how real authors structure each genre', 'Peer revision with focused feedback', 'Full process: plan → draft → revise → edit → publish'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Draws and labels. Simple sentences with support. Writes name.', assessHow: 'Writing samples. Process observation.' },
    { grade: '1-2', expectations: 'Multiple sentences on a topic. Basic conventions. Writes in all three genres with support.', assessHow: 'Writing rubric. Portfolio review.' },
    { grade: '3-5', expectations: 'Multi-paragraph pieces. Revises and edits own writing. All three genres with increasing independence.', assessHow: 'Genre-specific rubrics. Process portfolio. On-demand assessments.' },
  ],
  skills: [
    { name: 'Process Writing', what: 'The cycle of planning, drafting, revising, editing, publishing.', why: 'Good writing is rewriting. Teaching the process produces better outcomes than assigning and grading final products. ELLs benefit especially from revision with teacher support.',
      howToTeach: [
        { step: 'Plan before writing', detail: 'Graphic organizers, brainstorming, talk-before-you-write. Tan Huynh recommends oral rehearsal: tell a partner what you will write first.' },
        { step: 'Draft without stopping', detail: '"Write fast, fix later." Separate creative process from editing process.' },
        { step: 'Revise for content', detail: 'Revision is NOT editing. Adding, deleting, moving IDEAS. "Enough details? Logical order? Does the reader understand?"' },
        { step: 'Edit for conventions', detail: 'After content is solid: spelling, grammar, punctuation. Use checklists.' },
      ],
      example: 'Plan: web about "my pet." Draft: 3-4 sentences fast. Revise: add detail to each. Edit: check capitals, periods, spelling. Publish: rewrite neatly.',
    },
    { name: 'Scaffolded Writing for ELLs', what: 'Structured supports (frames, word banks, organizers, models) that gradually release control.', why: 'ELLs cannot produce language they have not internalized. Scaffolds enable participation in grade-level tasks while building skills. Scaffolds should be bridges, not crutches.',
      howToTeach: [
        { step: 'WIDA 1-2: heavy scaffolds', detail: 'Sentence frames with word banks. Fill-in-the-blank paragraphs. Dictated writing. Drawing with labels.' },
        { step: 'WIDA 3: moderate scaffolds', detail: 'Paragraph frames with transition words. Graphic organizers. Mentor sentences to imitate. Academic word banks.' },
        { step: 'WIDA 4-5: light scaffolds', detail: 'Planning templates. Self-editing checklists. Peer revision. Scaffold becomes a tool they choose.' },
        { step: 'Gradual release', detail: 'Remove scaffolds one at a time. If quality drops, reintroduce. Timeline varies by student.' },
      ],
      example: 'WIDA L2 story response: "The main character is ___. In the beginning, ___. The problem is ___. At the end, ___. I think the story is ___ because ___." Student fills blanks from word bank.',
    },
    { name: 'Opinion/Argument Writing', what: 'Stating a claim and supporting it with reasons and evidence.', why: 'CCSS expects opinion writing from Grade 1 and argument from Grade 4. For ELLs, this genre teaches the academic language of persuasion — critical for academic success.',
      howToTeach: [
        { step: 'Teach the structure', detail: 'Claim → Reasons → Evidence → Conclusion. Start with: "I think ___ because ___." Progress to multi-paragraph arguments.' },
        { step: 'Reason vs. evidence', detail: 'Reason = why you think something. Evidence = proof from a source. "I think recess is important (claim) because it helps students focus (reason). A study showed test scores improved after recess (evidence)."' },
        { step: 'Counterargument (Grade 4+)', detail: '"Some people think ___. However, ___." Teaching this builds critical thinking and shows sophistication.' },
        { step: 'Transition words for arguments', detail: 'First, in addition, furthermore, for example, on the other hand, in conclusion.' },
      ],
      example: 'Grade 3 opinion: "I think our school should have a garden. First, gardens teach science. Also, fresh vegetables are healthy. For these reasons, a school garden would help students learn and eat better."',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Draws with labels. Copies words/sentences. May write L1. Single words or phrases independently.', support: 'Accept drawing as writing. Sentence starters for every task. Dictated writing. Do not grade grammar — grade ideas and effort.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Simple sentences with support. Basic vocabulary. Many errors but communicates meaning. Completes frames.', support: 'Frames for all tasks. Word banks with visuals. Daily journal. Focus feedback on content, not grammar.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Short paragraphs with main idea. Transition words. Beginning different genres. Errors present but meaning clear.', support: 'Graphic organizers. Mentor text analysis. Peer partners. Teach revision separate from editing.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Multi-paragraph pieces with organization. Academic vocabulary. All three genres. Self-edits with support.', support: 'Voice and style. Revision strategies. Genre rubrics. Peer revision. Sentence variety and word choice.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Organized, developed pieces approaching grade-level. Varied sentences and precise vocabulary. Revises independently.', support: 'Craft and sophistication. Writing for different audiences. Remaining convention errors. Stamina for longer pieces.' },
  ],
  interventionSignals: [
    { signal: 'Refuses to write or produces nothing', whatToDo: 'Remove barriers. Accept drawing. Provide frame and word bank. Offer dictation. Get ideas on paper in any form.' },
    { signal: 'Only 1-2 sentences after months', whatToDo: 'Build stamina gradually. Small goals: "Today write 3." Use timer (5 min nonstop). Structured who/what/where/when/why prompts.' },
    { signal: 'Has ideas but incomprehensible due to grammar/spelling', whatToDo: 'Do NOT punish ideas for poor conventions. Grade separately. Provide editing support. One grammar target per piece.' },
  ],
  koreanL1Considerations: [
    'Korean writing builds to the main point at the end (기승전결). English states the thesis first. Teach English essay structure explicitly.',
    'Korean uses extensive formal registers in writing. Students may produce overly formal or awkward English by transferring Korean conventions.',
    'Korean spelling is regular; English is not. Allow invented spelling during drafting. Teach high-frequency words explicitly.',
  ],
  connectionToApp: 'Grade Entry tracks Writing domain scores. Writing rubrics in Grading Tools provide structured assessment. Sentence Patterns reference provides WIDA-leveled frames. Report card comments reflect writing growth.',
}


// ═══════════════════════════════════════════════════════════════════
// 8. SPEAKING
// Sources: Cult of Pedagogy, Krashen, Swain, Gibbons, Tan Huynh
// ═══════════════════════════════════════════════════════════════════

export const SPEAKING: GuideSection = {
  id: 'speaking',
  title: 'Speaking',
  icon: 'Mic',
  subtitle: 'Oral language development, academic discussion, and presentation skills',
  overview: {
    what: 'Speaking instruction develops oral English communication — from basic conversation to academic discussion, presentations, and collaborative dialogue. For ELLs, speaking is where growth is most visible, making it highly motivating. Effective instruction creates structured talk opportunities rather than relying on immersion alone.',
    whyItMatters: 'Oral language is the foundation for all literacy. Students who cannot express ideas orally will struggle in writing. Cult of Pedagogy identifies structured academic talk as one of the highest-impact techniques. For ELLs, oral rehearsal before writing significantly improves output.',
    researchBase: 'Cult of Pedagogy: Speaking and Listening Techniques; Krashen (1982): Comprehensible Input; Swain (1985): Comprehensible Output; Gibbons (2002): Scaffolding Language; Tan Huynh: Input-Output Loop.',
    bigIdea: 'Students learn to speak by speaking — but they need structured opportunities, safe environments, and explicit academic language instruction to develop beyond social conversation.',
  },
  developmentalProgression: [
    { name: 'Social Language (BICS)', description: 'Basic interpersonal communication: greetings, questions, expressing needs, casual conversation.', difficulty: 'foundational', gradeRange: 'K to Grade 2 (or initial months for new ELLs)', activities: ['Morning greeting routines', 'Partner interviews with question frames', 'Show and tell: "This is my ___. I like it because ___."'] },
    { name: 'Academic Language (CALP)', description: 'Language for academic purposes: explaining, comparing, analyzing, justifying. Takes 5-7 years for full development.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 5', activities: ['Accountable Talk stems: "I agree/disagree because..."', 'Think-pair-share with academic frames', 'Structured controversy: take positions, support with evidence'] },
    { name: 'Presentation & Extended Discourse', description: 'Organized oral presentations. Speaking for extended periods with coherent structure.', difficulty: 'advanced', gradeRange: 'Grade 2 to Grade 5', activities: ['Book talks: 2-minute structured presentations', 'Science explanations with sequence language', 'Debate: defend a position with evidence for 1-2 minutes'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Participates in conversations. Asks/answers simple questions. Describes familiar topics.', assessHow: 'Observation. Oral retelling rubric. Partner conversation assessment.' },
    { grade: '2-3', expectations: 'Recounts experiences with details. Creates audio recordings. Speaks in complete sentences.', assessHow: 'Oral presentation rubric. Recorded samples. Participation tracking.' },
    { grade: '4-5', expectations: 'Reports with facts and details. Clear pace. Formal/informal register. Supports opinions with evidence.', assessHow: 'Presentation rubric (content, delivery). Discussion observation checklist.' },
  ],
  skills: [
    { name: 'Structured Academic Discussion', what: 'Using protocols and stems for productive classroom talk about content.', why: 'Unstructured discussion = a few students talk, others stay silent. Structured protocols ensure every student speaks and practices academic language.',
      howToTeach: [
        { step: 'Think-Pair-Share', detail: 'Teacher asks question. Think silently (10 sec). Share with partner using stem. Selected pairs share with class. 100% participation.' },
        { step: 'Accountable Talk stems', detail: 'Post and teach: "I think ___ because ___." "I agree with ___ and want to add ___." "I respectfully disagree because ___."' },
        { step: 'Discussion protocols', detail: 'Fishbowl: inner circle discusses, outer observes. Inside-Outside circles. Numbered heads: groups discuss, random number reports.' },
        { step: 'Gradual release', detail: 'Partner (low risk) → small group → whole class. Always provide academic language frames.' },
      ],
      example: 'After reading about habitats: "Turn to your partner. Use: \'The most important thing about this habitat is ___ because ___.\'  60 seconds. Partner A first."',
      koreanNote: 'Korean classrooms emphasize listening over student discussion. Students may be uncomfortable speaking up or disagreeing. Build safe culture where academic disagreement is praised.',
    },
    { name: 'Oral Rehearsal Before Writing', what: 'Verbalizing what you will write before writing it.', why: 'Tan Huynh emphasizes speaking and writing are connected — if you can say it, you can usually write it. Oral rehearsal reduces writing cognitive load.',
      howToTeach: [
        { step: 'Tell your partner', detail: 'Before writing: "Tell your partner what you are going to write." Partner listens and questions. Then write.' },
        { step: 'Record and write', detail: 'Record yourself saying ideas. Listen back and write what you said. Bridges oral fluency to written output.' },
        { step: 'Teacher conference', detail: '"Tell me what happened." As student speaks, jot key phrases. "Now write what you told me."' },
        { step: 'Structured oral practice', detail: 'Before an opinion paragraph: state opinion, give two reasons, explain each to partner — using academic language. Then write.' },
      ],
      example: 'Opinion writing about uniforms. Step 1: tell partner your opinion + two reasons. Step 2: partner asks one question. Step 3: write what you said.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Single words, gestures, short phrases. Points and nods. Silent period (normal). Repeats modeled phrases.', support: 'Accept non-verbal communication. TPR. Yes/no before open-ended. Bilingual buddy. Do NOT force speaking — silent period is productive.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Short phrases and simple sentences. Partner talk with frames. Basic questions. Heavy accent normal.', support: 'Frames for every discussion. Think-pair-share with rehearsal time. Small group before whole class. Accept errors — focus on communication.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Complete sentences. Academic discussions with support. Explains thinking with detail. Some academic vocabulary.', support: 'Push for academic language: "Use our vocabulary word." Accountable Talk stems. 5-7 second wait time before calling on ELLs.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Detail and elaboration. Academic vocabulary. Debates and presentations. Self-corrects some errors.', support: 'Precision and register. Formal vs. informal. Presentation skills. Extended discourse tasks.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Fluent in academic contexts. Varied vocabulary, complex sentences. Adjusts register. Organized oral reports.', support: 'Nuance: persuasion, humor, tone. Remaining pronunciation patterns affecting clarity. Confidence with larger audiences.' },
  ],
  interventionSignals: [
    { signal: 'No speech after 3+ months', whatToDo: 'Silent period of 1-3 months is normal. Beyond 3: increase low-risk opportunities (partner talk, choral). Check for anxiety. Ensure bilingual buddy. Consult parents about L1 patterns.' },
    { signal: 'Speaks socially but not academically', whatToDo: 'BICS/CALP gap — common and expected. Social: 1-3 years. Academic: 5-7 years. Explicitly teach academic stems, provide models, create structured academic talk daily.' },
    { signal: 'Avoids group speaking', whatToDo: 'Build safe → challenging: whisper to partner → small group → whole class. Rehearsal time. Write first, then read aloud. Praise all attempts.' },
  ],
  koreanL1Considerations: [
    'Korean culture values listening over speaking in class, and considers disagreeing impolite. Build explicit norms: "Sharing ideas is respect. Disagreeing with evidence is smart."',
    'Korean honorific levels make students hyperaware of formality. Teach both formal (presentations) and informal (partner talk) registers.',
    'Common pronunciation challenges: /l/ vs. /r/, /f/ vs. /p/, /v/ vs. /b/, initial clusters, vowel distinctions. Focus on sounds affecting comprehensibility, not accent reduction.',
  ],
  connectionToApp: 'Grade Entry tracks Speaking & Listening domain. Quick Check does formative checks on participation. WIDA profiles set appropriate speaking expectations.',
}


// ═══════════════════════════════════════════════════════════════════
// 9. LISTENING
// Sources: Krashen, Vandergrift, WIDA, Rost
// ═══════════════════════════════════════════════════════════════════

export const LISTENING: GuideSection = {
  id: 'listening',
  title: 'Listening',
  icon: 'Headphones',
  subtitle: 'Comprehension, academic listening, and active listening strategies',
  overview: {
    what: 'Listening is the receptive skill that forms the foundation for all language development. For ELLs, listening comprehension develops ahead of speaking, reading, and writing. Instruction goes beyond "pay attention" — it teaches how to process spoken English, extract meaning, follow directions, and engage as active listeners.',
    whyItMatters: 'Krashen argues language acquisition occurs primarily through comprehensible input — listening and understanding messages. For ELLs in English-medium classrooms, listening is the primary channel for language input. A student who cannot process spoken English cannot learn content, participate, or follow instructions.',
    researchBase: 'Krashen (1982): Comprehensible Input Hypothesis; Vandergrift (2007): Listening Strategies; WIDA Listening Standards; Rost (2011): Teaching and Researching Listening.',
    bigIdea: 'Listening is not passive — it is an active cognitive process requiring instruction, strategies, and support, especially for second language processing.',
  },
  developmentalProgression: [
    { name: 'Following Directions', description: 'Understanding and executing simple to multi-step oral instructions.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Simon Says with increasing complexity', 'Direction sequences with visual support', 'Listen-and-do: oral instructions for drawing or building'] },
    { name: 'Listening for Information', description: 'Extracting key details, main ideas, and sequences from spoken text.', difficulty: 'intermediate', gradeRange: 'Grade 1 to Grade 5', activities: ['Listening guides: fill in graphic organizer while listening', 'Note-taking: key words, not full sentences', 'Two-column: What I heard / What I think'] },
    { name: 'Critical Listening', description: 'Evaluating what is heard, identifying purpose, distinguishing fact from opinion, listening for evidence.', difficulty: 'advanced', gradeRange: 'Grade 3 to Grade 5', activities: ['Fact vs. opinion sort from presentations', 'Speaker purpose: inform, persuade, or entertain?', 'Evidence evaluation: "Did the speaker give evidence?"'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Follows 2-3 step directions. Asks/answers about read-aloud details. Participates in conversations.', assessHow: 'Direction-following observation. Read-aloud comprehension questions.' },
    { grade: '2-3', expectations: 'Determines main ideas from oral text. Asks clarifying questions. Takes simple notes from presentations.', assessHow: 'Listening comprehension quizzes. Note quality. Discussion contributions.' },
    { grade: '4-5', expectations: 'Summarizes spoken information. Identifies speaker purpose. Evaluates evidence. Paraphrases key points.', assessHow: 'Oral summary after listening. Note quality. Academic discussion showing comprehension.' },
  ],
  skills: [
    { name: 'Active Listening Strategies', what: 'Specific strategies for processing spoken English more effectively.', why: 'ELLs process spoken language more slowly — simultaneously decoding sounds, accessing vocabulary, and constructing meaning. Explicit strategies reduce cognitive overload.',
      howToTeach: [
        { step: 'Predict before listening', detail: 'Tell the topic, ask: "What do you think you will hear?" Activates relevant vocabulary and background.' },
        { step: 'Listen for keywords', detail: 'Give 2-3 target words: "Listen for habitat, predator, prey. Thumbs up when you hear them."' },
        { step: 'Stop and check', detail: 'Pause every 3-5 minutes: "Tell your partner one thing you just heard." Prevents comprehension breakdown.' },
        { step: 'Visual support', detail: 'Always pair spoken input with pictures, diagrams, vocabulary on board. Gives ELLs a second processing channel.' },
      ],
      example: 'Before ocean animal read-aloud: "Listen for predator, prey, camouflage. After, tell your partner which animal uses camouflage and why."',
      koreanNote: 'Korean students are skilled passive listeners. Active listening — responding, questioning, note-taking — may need explicit teaching as expected English classroom behavior.',
    },
    { name: 'Interactive Read-Aloud Comprehension', what: 'Building understanding through structured read-aloud experiences.', why: 'Read-alouds expose students to text above their reading level, building vocabulary and language structures. For ELLs, listening comprehension often exceeds reading comprehension.',
      howToTeach: [
        { step: 'Pre-teach vocabulary', detail: 'Introduce 3-5 key words with pictures and definitions. Removes barriers during listening.' },
        { step: 'Interactive stops', detail: 'Stop at planned points for questions, predictions, clarification. Do NOT read straight through — ELLs lose comprehension without check-ins.' },
        { step: 'Turn and talk', detail: '"Tell your partner: Why did the character do that?" Processes information immediately. All students participate.' },
        { step: 'Post-listening response', detail: 'Retelling, drawing, discussion, or writing. Cements comprehension and provides assessment data.' },
      ],
      example: 'Chapter book read-aloud: Pre-teach 3 words. Read 5 pages, stop: "What has happened?" Read 5 more: "Why does she feel that way?" Finish. Draw and label the most important event.',
    },
    { name: 'Note-Taking from Oral Input', what: 'Recording key information while listening to presentations, read-alouds, or discussions.', why: 'Note-taking transforms passive listening into active processing. It also creates a record students can review. For ELLs, structured note-taking scaffolds help manage the cognitive load.',
      howToTeach: [
        { step: 'Start with graphic organizers', detail: 'Provide a partially filled organizer. Students listen for specific information to complete it. Much easier than blank-page notes.' },
        { step: 'Teach key word strategy', detail: '"Write only the important words, not full sentences." Model: teacher listens to a short clip and shows her notes — just 3-4 words. Students practice.' },
        { step: 'Cornell notes (Grade 4+)', detail: 'Left column: questions/topics. Right column: key details. Bottom: summary. Structured but flexible.' },
        { step: 'Processing time', detail: 'After listening segments, give 30-60 seconds of silence for students to add to notes. Do not rush into the next section.' },
      ],
      example: 'Science video about water cycle: Organizer with boxes labeled "Evaporation," "Condensation," "Precipitation." Students write 2-3 key words in each box while watching.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Follows simple 1-step directions with visual support. Identifies objects from descriptions. Yes/no questions. Understands key words.', support: 'Speak slowly and clearly. Gestures and visuals. One direction at a time. Check with non-verbal responses (point, thumbs up/down). Repeat and rephrase.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Follows 2-step directions. Identifies main topic from short oral text. Sequences 2-3 events from listening. Responds to simple questions.', support: 'Visual support for all listening. Pre-teach vocabulary. Repeat important information. Allow partner processing after listening.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Follows multi-step directions. Identifies main idea and details from oral presentations. Takes simple notes. Asks clarifying questions.', support: 'Listening guides and graphic organizers. Note-taking instruction. Pause regularly for processing. Build academic listening vocabulary.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Understands academic presentations. Takes organized notes. Summarizes spoken information. Identifies speaker purpose.', support: 'Push toward critical listening. Teach note-taking strategies (Cornell). Challenge with content-area lectures and presentations.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Comprehends nuanced academic discourse. Evaluates oral arguments. Understands figurative language, idioms, sarcasm in context. Takes comprehensive notes.', support: 'Focus on nuance and inference in spoken language. Idiom and figurative language instruction. Build stamina for extended academic listening.' },
  ],
  interventionSignals: [
    { signal: 'Cannot follow simple 1-step directions after months of instruction', whatToDo: 'Check hearing. If hearing is normal, simplify language dramatically: single words with gestures and modeling. Use TPR. Pair with bilingual buddy. Ensure directions include visual support.' },
    { signal: 'Appears to understand during class but fails comprehension checks', whatToDo: 'The student may be relying on contextual cues (watching peers) rather than understanding spoken language. Assess listening comprehension separately from other tasks. Increase vocabulary pre-teaching and visual support.' },
    { signal: 'Zones out during read-alouds or presentations', whatToDo: 'Extended listening is exhausting for ELLs processing a second language. Break into shorter segments with processing pauses. Give a listening task (listen for specific words, fill in an organizer) to maintain active engagement. Check text difficulty — may be too far above their level.' },
  ],
  koreanL1Considerations: [
    'Korean students are often excellent at quiet, respectful listening. The challenge is moving from passive to active listening — processing, responding, questioning, and taking notes while listening.',
    'Korean phonological system differs significantly from English. Students may not perceive certain English sound distinctions (e.g., /l/ vs. /r/, /f/ vs. /p/, short vowel contrasts). This affects listening comprehension at the word level.',
    'English uses stress-timing (important words are emphasized, function words are reduced). Korean is syllable-timed (each syllable gets roughly equal time). Students may struggle to parse natural English speech because unstressed words are hard to hear.',
  ],
  connectionToApp: 'Grade Entry tracks Speaking & Listening domain (listening is combined). The Quick Check tool can assess listening comprehension informally. WIDA listening levels help set appropriate expectations for how much a student can process from oral instruction.',
}


// ═══════════════════════════════════════════════════════════════════
// ALL GUIDES EXPORT
// ═══════════════════════════════════════════════════════════════════

export const ALL_GUIDES: GuideSection[] = [
  PHONOLOGICAL_AWARENESS,
  PHONICS,
  READING_FLUENCY,
  READING_SKILLS,
  VOCABULARY,
  GRAMMAR,
  WRITING,
  SPEAKING,
  LISTENING,
]
