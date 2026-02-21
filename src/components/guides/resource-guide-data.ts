// ═══════════════════════════════════════════════════════════════════
// COMPREHENSIVE TEACHER RESOURCE GUIDES — Daewoo English Program
// Evidence-based reference material for ELA/ESL instruction
// Sources: Reading Rockets, Edutopia, Cult of Pedagogy, Tan Huynh,
//          National Reading Panel, WIDA, CCSS, Teach Like a Champion,
//          Fred Jones, Kelly Gallagher, Jeff Anderson
// ═══════════════════════════════════════════════════════════════════

// ─── Shared Types ────────────────────────────────────────────────

export interface WIDAExpectation {
  level: string
  color: string
  canDo: string
  support: string
}

export interface WIDAMatrixRow {
  grade: string
  level1: string
  level2: string
  level3: string
  level4: string
  level5: string
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

export interface GrammarPoint {
  category: string
  term: string
  definition: string
  examples: string[]
  teachingTip: string
  koreanNote?: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

export interface GuideSection {
  id: string
  title: string
  icon: string
  subtitle: string
  overview: {
    what: string
    whyItMatters: string
    researchBase: string
    bigIdea: string
  }
  developmentalProgression: SubSkillProgression[]
  milestones: DevelopmentalMilestone[]
  skills: SkillEntry[]
  wida: WIDAExpectation[]
  widaMatrix?: WIDAMatrixRow[]
  interventionSignals: InterventionSignal[]
  koreanL1Considerations: string[]
  connectionToApp: string
  grammarPoints?: GrammarPoint[]
}

export const PHONOLOGICAL_AWARENESS: GuideSection = {
  id: 'phonological-awareness',
  title: 'Phonological Awareness',
  icon: 'Ear',
  subtitle: 'The ability to hear, identify, and manipulate the sound structures of spoken language',
  overview: {
    what: 'Phonological awareness is the understanding that spoken language can be broken into smaller units — sentences into words, words into syllables, syllables into onset-rime, and words into individual sounds (phonemes). It is entirely oral and auditory — no print involved.',
    whyItMatters: 'PA is the single strongest predictor of early reading success. Children who cannot hear and manipulate sounds in words will struggle to learn phonics. The NRP found that systematic PA instruction directly improves reading and spelling. For ELLs, PA is complicated by the fact that they are learning to hear new sounds that may not exist in Korean.',
    researchBase: 'National Reading Panel (2000); Ehri et al. (2001); Adams (1990) "Beginning to Read"; Stanovich (1986) "Matthew Effects"; Reading Rockets: Phonemic awareness instruction is most effective when it focuses on one or two skills at a time rather than multiple skills.',
    bigIdea: 'If a child cannot hear it, they cannot read it. Phonological awareness is the ear training that makes phonics instruction possible.',
  },
  developmentalProgression: [
    { name: 'Word Awareness', description: 'Understanding that sentences are made of individual words.', difficulty: 'foundational', gradeRange: 'Pre-K to K', activities: ['Count words in a spoken sentence using blocks or claps', 'Sentence segmenting: "I like cats" — how many words? (3)', 'Move a block for each word in a sentence'] },
    { name: 'Rhyme Recognition & Production', description: 'Hearing that words share ending sounds, then generating rhyming words.', difficulty: 'foundational', gradeRange: 'Pre-K to K', activities: ['Rhyme sorting: do these words rhyme? cat/hat (yes), cat/dog (no)', 'Rhyme generation: "Tell me a word that rhymes with ball"', 'Read rhyming books and pause for students to fill in the rhyme'] },
    { name: 'Syllable Awareness', description: 'Hearing and counting syllable beats in words.', difficulty: 'foundational', gradeRange: 'Pre-K to Grade 1', activities: ['Clap syllables in student names: Ka-te (2), El-i-za-beth (4)', 'Sort picture cards by number of syllables', 'Robot talk: say words in syllable chunks like a robot'] },
    { name: 'Onset-Rime Awareness', description: 'Separating the beginning sound (onset) from the rest of the syllable (rime): c-at, sh-ip.', difficulty: 'intermediate', gradeRange: 'K to Grade 1', activities: ['Break words apart: "What is the first sound in cat? /k/. What is the rest? -at."', 'Onset substitution: change the first sound in "bat" to /s/ — what word? "sat"', 'Word family sorts: group words with the same rime (-at, -an, -ig)'] },
    { name: 'Phoneme Isolation', description: 'Identifying individual sounds in words: "What is the first/middle/last sound in ship?"', difficulty: 'intermediate', gradeRange: 'K to Grade 1', activities: ['Sound boxes: push a chip into a box for each sound', 'First sound sorts: group pictures by initial phoneme', '"I Spy" by sound: "I spy something that starts with /m/"'] },
    { name: 'Phoneme Blending', description: 'Hearing individual sounds and combining them into a word: /k/-/a/-/t/ → cat.', difficulty: 'intermediate', gradeRange: 'K to Grade 1', activities: ['Teacher stretches a word, students blend: "/s/ /i/ /t/ — what word?"', 'Robot-to-human: teacher says word in robot talk, students say it normally', 'Blending with hand motions: touch arm positions for each sound, then slide for blend'] },
    { name: 'Phoneme Segmentation', description: 'Breaking a word into its individual sounds: "cat" → /k/-/a/-/t/.', difficulty: 'advanced', gradeRange: 'K to Grade 2', activities: ['Elkonin boxes: one chip per sound, push into boxes', 'Finger tapping: tap one finger per sound', 'Stretch it: "Say cat slooowly — /k/... /a/... /t/"'] },
    { name: 'Phoneme Manipulation', description: 'Adding, deleting, or substituting sounds: "Say cat without the /k/" → at. "Change /k/ to /b/" → bat.', difficulty: 'advanced', gradeRange: 'Grade 1 to Grade 2+', activities: ['Deletion: "Say smile without the /s/" → mile', 'Substitution: "Change the /h/ in hot to /p/" → pot', 'Addition: "Add /s/ to the beginning of park" → spark'] },
  ],
  milestones: [
    { grade: 'Pre-K', expectations: 'Recognizes rhymes. Counts words in short sentences. Claps syllables in familiar words.', assessHow: 'Informal observation during rhyming songs and read-alouds. Can the child identify whether two words rhyme?' },
    { grade: 'K', expectations: 'Produces rhymes. Segments syllables. Isolates initial sounds. Blends 2-3 phoneme words. Beginning to segment CVC words.', assessHow: 'DIBELS First Sound Fluency. Phoneme Segmentation Fluency (PSF). Quick Check: "What is the first sound in dog?"' },
    { grade: '1', expectations: 'Segments and blends 3-4 phoneme words fluently. Manipulates phonemes (add, delete, substitute). PA is becoming automatic.', assessHow: 'PSF benchmark. Phoneme manipulation tasks. If a student cannot blend or segment by mid-1st grade, intervention is needed immediately.' },
    { grade: '2+', expectations: 'PA should be fully automatic. If not, this is a significant red flag requiring targeted intervention.', assessHow: 'Only assess PA in Grade 2+ if reading difficulties are present. Use as a diagnostic tool, not a routine assessment.' },
  ],
  skills: [
    { name: 'Rhyme Recognition', what: 'Identifying whether two words share the same ending sound pattern.', why: 'Rhyming is typically the first phonological awareness skill to develop. It builds the foundation for hearing sound patterns in words.',
      howToTeach: [
        { step: 'Read rhyming books daily', detail: 'Books like "Brown Bear, Brown Bear" or "The Cat in the Hat" immerse students in rhyme. Pause before the rhyme and let students fill it in.' },
        { step: 'Rhyme judgment', detail: '"Do these words rhyme? Cat-hat. Cat-dog." Start with obvious pairs and progress to near-rhymes.' },
        { step: 'Odd one out', detail: '"Which word does not rhyme: cat, bat, sun?" This requires comparing multiple words.' },
        { step: 'Rhyme production', detail: '"Tell me a word that rhymes with cake." Accept nonsense words (bake, dake, flake) — the skill is the sound pattern, not meaning.' },
      ],
      example: 'Teacher: "Does cat rhyme with hat?" Students: "Yes!" Teacher: "Does cat rhyme with dog?" Students: "No!" Teacher: "Tell me a word that rhymes with cat." Student: "Bat!"',
      koreanNote: 'Korean has rhyming patterns but they are not emphasized in early literacy the way English rhyming is. Students may need many exposures before the concept clicks.',
      ccss: 'RF.K.2a',
    },
    { name: 'Syllable Segmentation & Blending', what: 'Breaking words into syllable beats and putting syllable parts back together.', why: 'Syllable awareness is a stepping stone between whole-word awareness and phoneme-level skills.',
      howToTeach: [
        { step: 'Clap and count', detail: 'Say a word. Clap once per syllable. Count the claps. Start with student names — they are highly motivating.' },
        { step: 'Jaw drop test', detail: 'Your jaw drops once per syllable. Students put a hand under their chin and count drops.' },
        { step: 'Syllable blending', detail: 'Teacher says "base-ball." Students blend: "baseball." Progress from compound words to multisyllable words.' },
        { step: 'Syllable deletion', detail: '"Say rainbow without rain." → "bow." This is harder and bridges toward phoneme manipulation.' },
      ],
      example: 'Teacher: "Let\'s clap the syllables in hamburger. Ham (clap) bur (clap) ger (clap). How many syllables?" Students: "Three!"',
      ccss: 'RF.K.2b',
    },
    { name: 'Phoneme Blending', what: 'Combining individual sounds to form words: /s/-/a/-/t/ → sat.', why: 'Blending is the skill students use every time they decode a word in reading. Without automatic blending, phonics instruction cannot succeed.',
      howToTeach: [
        { step: 'Continuous blending', detail: 'Start with continuous sounds (/s/, /m/, /f/) because they can be stretched. "ssssaaat" is easier to blend than "c-a-t" with stop sounds.' },
        { step: 'Body blending', detail: 'Touch head for first sound, shoulders for middle, waist for last. Then slide hand down body while blending the sounds together.' },
        { step: 'Incremental blending', detail: 'Add one sound at a time: /s/... /sa/... /sat/. This prevents students from forgetting the first sound by the time they get to the last.' },
        { step: 'Speed it up', detail: 'Start slow, then increase speed. The goal is for blending to become so fast it is automatic.' },
      ],
      example: 'Teacher: "I am going to say a word in slow motion: /m/ - /a/ - /p/. What word?" Students: "Map!"',
      ccss: 'RF.K.2c, RF.1.2b',
    },
    { name: 'Phoneme Segmentation', what: 'Breaking a spoken word into each individual sound: "ship" → /sh/-/i/-/p/.', why: 'Segmentation is the skill students use every time they spell a word. It is the reverse of blending and equally critical.',
      howToTeach: [
        { step: 'Elkonin (sound) boxes', detail: 'Draw boxes on a whiteboard (one per sound). Student says the word slowly, pushing a chip into each box for each sound. "Ship": push chip into box 1 (/sh/), box 2 (/i/), box 3 (/p/).' },
        { step: 'Finger tapping', detail: 'Tap thumb to each finger for each sound. "Cat": tap index (/k/), middle (/a/), ring (/t/). Portable — no materials needed.' },
        { step: 'Stretch and count', detail: '"Stretch the word like a rubber band: /sssshhhiiip/. How many sounds? Three."' },
        { step: 'Connect to spelling', detail: 'Once students can segment orally, connect to letters: "You heard three sounds. Now write a letter for each sound." This bridges PA to phonics.' },
      ],
      example: 'Teacher: "How many sounds in the word \'frog\'?" Student taps: /f/-/r/-/o/-/g/. "Four sounds!"',
      ccss: 'RF.K.2d, RF.1.2d',
    },
    { name: 'Phoneme Manipulation', what: 'Adding, deleting, or substituting individual sounds to create new words.', why: 'This is the most advanced PA skill and the strongest predictor of long-term reading success. Students who can manipulate phonemes have deep sound awareness.',
      howToTeach: [
        { step: 'Start with deletion', detail: '"Say meat. Now say it without the /m/." → eat. Begin with initial sound deletion, then final, then medial.' },
        { step: 'Move to substitution', detail: '"Say bat. Change the /b/ to /s/." → sat. This requires holding the word in memory while making a change.' },
        { step: 'Addition', detail: '"Say park. Now add /s/ to the beginning." → spark. Consonant cluster addition is the most advanced form.' },
        { step: 'Chain activities', detail: 'Start with "cat." Change /k/ to /b/ → bat. Change /t/ to /d/ → bad. Change /a/ to /e/ → bed. Each change creates a new word.' },
      ],
      example: 'Teacher: "Say play. Now say play without the /p/." Student: "Lay." Teacher: "Now change the /l/ to /r/." Student: "Ray!"',
      koreanNote: 'Phoneme manipulation is very challenging for Korean ELLs because they must hold English sounds (some unfamiliar) in working memory while performing operations. Start with familiar sounds and simple CVC words.',
      ccss: 'RF.1.2c, RF.1.2d',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'May clap syllables with support. Identifies some initial sounds in familiar words. Rhyme recognition is emerging.', support: 'Use familiar words (names, classroom objects). Heavy modeling. Accept non-verbal responses. Focus on syllable and rhyme before phoneme-level work.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Recognizes rhymes. Segments syllables. Isolates initial sounds. Beginning to blend with support.', support: 'Multisensory approaches. Songs and chants. Elkonin boxes with chips. Daily brief practice (5 min).' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Blends and segments CVC words. Produces rhymes. Beginning phoneme manipulation with simple words.', support: 'Push toward automaticity in blending and segmentation. Introduce manipulation with continuous sounds first.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Blends and segments words with 4-5 phonemes. Manipulates phonemes with increasing accuracy.', support: 'PA should be nearing automatic. Focus instructional time on connecting PA to phonics and spelling.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'PA skills are automatic. Manipulates complex phoneme patterns.', support: 'PA instruction is complete. Only revisit if decoding or spelling difficulties emerge.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Claps syllables with support. May identify initial sounds in own name. Rhyme awareness emerging.', level2: 'Recognizes rhymes in familiar songs. Isolates initial sounds. Beginning to blend 2-phoneme words.', level3: 'Blends and segments CVC words. Produces rhymes. Isolates all positions (initial, final, medial).', level4: 'Blends and segments 4-phoneme words. Beginning deletion and substitution with simple CVC.', level5: 'PA skills approaching automatic. Manipulates phonemes fluently. Ready for full phonics application.' },
    { grade: '2', level1: 'Working on syllable clapping and initial sound isolation — significantly behind peers. Needs intensive PA + phonics support.', level2: 'Blending and segmenting CVC with support. May struggle with consonant clusters. Rhyme production developing.', level3: 'Segments most CVC and CCVC words. Beginning phoneme manipulation. Connecting PA to spelling.', level4: 'PA is mostly automatic. Can manipulate phonemes in 4-5 sound words. Focus shifts to phonics application.', level5: 'PA is automatic. No longer needs PA instruction — focus entirely on phonics and fluency.' },
    { grade: '3', level1: 'Significant PA gaps — likely needs intensive phonics intervention starting from CVC level.', level2: 'Still building blending and segmentation. Needs targeted small-group PA practice alongside phonics.', level3: 'PA skills adequate for grade-level phonics. May struggle with multisyllabic segmentation.', level4: 'PA is automatic. Focus on multisyllabic word segmentation for advanced decoding.', level5: 'No PA instruction needed.' },
    { grade: '4', level1: 'PA gaps require diagnostic assessment and structured intervention. Check if phonics foundations are in place.', level2: 'May need brief PA warm-ups before phonics instruction. Blending and segmentation should be targeted.', level3: 'PA adequate. Focus on syllable segmentation for multisyllabic decoding.', level4: 'No PA instruction needed at this level.', level5: 'No PA instruction needed.' },
    { grade: '5', level1: 'Conduct PA screening. If gaps exist, provide intensive intervention — this is urgent at Grade 5.', level2: 'Target any remaining PA gaps quickly. Focus on blending and segmentation for decoding support.', level3: 'PA should be automatic. Address only if decoding difficulties persist.', level4: 'No PA instruction needed.', level5: 'No PA instruction needed.' },
  ],

  widaMatrix: [
    { grade: '1', level1: 'Identifies rhyming pairs with picture support. Claps syllables with modeling.', level2: 'Produces some rhymes. Segments 2-3 syllable words. Blends onset-rime with support.', level3: 'Blends and segments CVC phonemes. Produces rhymes independently.', level4: 'Manipulates phonemes (add, delete). Segments blends and digraphs.', level5: 'Full phonemic awareness. Ready for advanced phonics application.' },
    { grade: '2', level1: 'Still developing basic PA skills. Rhyme recognition with support. Syllable clapping.', level2: 'Blends and segments CVC phonemes with support. Identifies initial/final sounds.', level3: 'Segments most phonemes accurately. Beginning manipulation (substitution).', level4: 'Phoneme manipulation is solid. PA supports fluent decoding.', level5: 'PA is automatic. No longer a primary instructional need.' },
    { grade: '3', level1: 'If PA gaps exist at Grade 3, intensive intervention is needed — this is significantly behind.', level2: 'May still need blending/segmentation practice. Short daily PA warm-ups recommended.', level3: 'PA should be solid. Address any remaining gaps with targeted practice.', level4: 'PA is automatic. Focus shifts to phonics and morphology.', level5: 'PA is automatic. No instructional need.' },
    { grade: '4', level1: 'PA gaps at this level indicate possible learning disability — refer for evaluation alongside intervention.', level2: 'Brief daily PA warm-ups if needed. Focus on phoneme manipulation for spelling.', level3: 'PA should be mastered. Any gaps need immediate targeted intervention.', level4: 'No PA instruction needed. Focus on advanced word study.', level5: 'No PA instruction needed.' },
    { grade: '5', level1: 'PA gaps at Grade 5 are critical. Intensive, structured intervention required alongside evaluation.', level2: 'Any remaining PA needs are addressed through spelling and morphology work.', level3: 'PA is mastered. Word study and morphology are the focus.', level4: 'Advanced word study only.', level5: 'No PA instruction needed.' },
  ],
  interventionSignals: [
    { signal: 'Cannot produce rhymes by mid-Kindergarten', whatToDo: 'Increase rhyme exposure through songs, books, and games. If still struggling after 4-6 weeks of targeted practice, assess whether the student can perceive rhyme at all — this may indicate a deeper phonological processing issue.' },
    { signal: 'Cannot blend 2-3 phoneme words by end of Kindergarten', whatToDo: 'Check if the student can identify individual sounds first (isolation). If not, work on isolation before blending. Use continuous sounds (/s/, /m/, /f/) which are easier to blend than stop sounds (/b/, /t/, /k/).' },
    { signal: 'Cannot segment CVC words by mid-first grade', whatToDo: 'Return to Elkonin boxes with physical chips. Practice with 2-phoneme words first, then build to 3. This student needs daily 5-minute targeted practice. Do not skip ahead to phonics patterns they cannot hear.' },
    { signal: 'Cannot manipulate phonemes by end of first grade', whatToDo: 'Check blending and segmentation first — manipulation depends on these skills. If blending and segmentation are solid, practice deletion with initial sounds before substitution. Use concrete manipulatives.' },
    { signal: 'Grade 2+ student struggles with basic blending or segmentation', whatToDo: 'This is a significant red flag. Immediate small-group or individual intervention needed. Screen for possible learning disability if PA does not respond to targeted instruction after 6-8 weeks.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Quick Check can do rapid formative checks on PA skills. Standards Checklist tracks RF standards. Intervention Loop flags students needing PA support.',
}


// ═══════════════════════════════════════════════════════════════════
// 2. PHONICS
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// 2. PHONICS
// ═══════════════════════════════════════════════════════════════════

export const PHONICS: GuideSection = {
  id: 'phonics', title: 'Phonics', icon: 'Puzzle',
  subtitle: 'Understanding how letters and letter patterns represent the sounds of spoken language',
  overview: {
    what: 'Phonics is the instructional practice of teaching relationships between letters (graphemes) and sounds (phonemes) so students can decode (read) and encode (spell) words. Effective phonics instruction is systematic (taught in a logical sequence) and explicit (directly taught, not left to chance).',
    whyItMatters: 'Phonics is one of two strands in Scarborough\'s Reading Rope forming word recognition. The NRP found systematic, explicit phonics instruction significantly benefits K-6 students. For ELLs, phonics is critical because they cannot rely on oral vocabulary to self-correct decoding errors like native speakers can.',
    researchBase: 'NRP (2000); Ehri (2004); Moats (2020) "Speech to Print"; Scarborough (2001); Reading Rockets: "Systematic phonics produces the greatest impact beginning in kindergarten or first grade."',
    bigIdea: 'Phonics is the bridge between hearing sounds and reading print. If phonological awareness is ear training, phonics is the code connecting ears to eyes.',
  },
  developmentalProgression: [
    { name: 'Alphabetic Principle', description: 'Letters represent sounds. Letter-name and letter-sound knowledge.', difficulty: 'foundational', gradeRange: 'Pre-K to K', activities: ['Letter-sound correspondence with picture anchors', 'Multisensory letter formation: sand, playdough, skywriting', 'Letter hunts in environmental print'] },
    { name: 'CVC Decoding', description: 'Consonant-vowel-consonant words (cat, sit, hop). Foundational decoding pattern.', difficulty: 'foundational', gradeRange: 'K to Grade 1', activities: ['Sound-by-sound blending with letter tiles', 'Word building chains: cat → bat → bit → sit', 'CVC decodable text reading'] },
    { name: 'Blends & Digraphs', description: 'Blends: bl, st, cr (each sound heard). Digraphs: sh, ch, th, wh, ck (one sound from two letters).', difficulty: 'intermediate', gradeRange: 'K to Grade 1', activities: ['Blend vs. digraph sorting', 'Building words with digraph tiles as single units', 'Dictation with blend/digraph patterns'] },
    { name: 'Long Vowel Patterns', description: 'Silent-e (VCe), vowel teams (ai, ea, oa, ee), open syllables.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 2', activities: ['Word sorts by vowel pattern', 'Flip books for pattern practice', 'Decodable texts with target patterns'] },
    { name: 'R-Controlled & Complex Vowels', description: 'ar, er, ir, or, ur and diphthongs: oi/oy, ou/ow, au/aw.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 2', activities: ['Sound wall placement under phonemes', 'Connected text with targeted patterns', 'Spelling dictation'] },
    { name: 'Multisyllabic Decoding', description: 'Six syllable types (closed, open, VCe, vowel team, r-controlled, C-le) and division rules.', difficulty: 'advanced', gradeRange: 'Grade 2 to 5', activities: ['Syllable type ID and labeling', 'Scoop and read: arcs under syllables', 'VCCV, VCV, VV division patterns'] },
    { name: 'Morphology Integration', description: 'Prefixes, suffixes, roots, base words for decoding and meaning.', difficulty: 'advanced', gradeRange: 'Grade 2 to 5', activities: ['Word sum equations: re + play + ing', 'Morpheme sorting by shared affix', 'Matrix building with bases and affixes'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Most letter sounds known. Decodes CVC words. Spells phonetically. Reads simple decodable texts.', assessHow: 'Letter-sound fluency. Nonsense word reading (DIBELS NWF). CVC spelling dictation.' },
    { grade: '1', expectations: 'Decodes blends, digraphs, long vowels. Reads decodable chapter books. Spells common patterns.', assessHow: 'Oral decodable passage reading. Spelling inventories. Phonics skills test.' },
    { grade: '2', expectations: 'Decodes two-syllable words. 90%+ accuracy on grade-level text. Independent phonics application.', assessHow: 'Running records. Multisyllable word lists. Spelling patterns assessment.' },
    { grade: '3-5', expectations: 'Advanced decoding (morphology, Greek/Latin roots). Decoding is largely automatic.', assessHow: 'Grade 3+ students who cannot decode two-syllable words need intervention. Assess through content-area reading and spelling.' },
  ],
  skills: [
    { name: 'Explicit Phonics Lesson Structure (I Do, We Do, You Do)', what: 'A systematic lesson framework for teaching letter-sound relationships and decoding.', why: 'Research consistently shows explicit, systematic instruction outperforms implicit approaches. The gradual release model ensures mastery before application.',
      howToTeach: [
        { step: 'Review (2-3 min)', detail: 'Quick review of previously taught sounds using flashcards or sound drills. Keeps prior learning active and builds automaticity.' },
        { step: 'Introduce (5 min)', detail: 'Explicitly teach the new relationship. "Today s-h together make /sh/." Keyword anchor: "/sh/ as in ship." Write, say, trace. This is the I DO — teacher models clearly.' },
        { step: 'Guided blending (5-8 min)', detail: 'WE DO: Students blend words with the new pattern using tiles or whiteboards. Teacher guides: "Touch each letter, say each sound, blend." Correct errors immediately.' },
        { step: 'Guided encoding (5-8 min)', detail: 'WE DO → YOU DO: Dictation — teacher says a word, students segment and write. Progress from words to phrases to sentences. Encoding reinforces decoding.' },
        { step: 'Connected text (5-10 min)', detail: 'YOU DO: Students read decodable text with the target pattern. Read for accuracy first, reread for fluency. Guide error correction — never supply the word.' },
      ],
      example: 'Introduce "sh": write it, say /sh/, keyword "ship." Build words with tiles (ship, shop, shed, fish). Dictation: "The ship is big." Read a decodable passage with sh words.',
      koreanNote: '/sh/ does not exist as a distinct Korean phoneme. Students confuse /sh/ with /s/. Minimal pairs essential: ship/sip, shore/sore.',
      ccss: 'RF.K.3, RF.1.3, RF.2.3',
    },
    { name: 'Decodable Text Practice', what: 'Texts written to include only taught phonics patterns plus limited high-frequency sight words.', why: 'Without decodable practice, phonics stays abstract. Reading Rockets: students should read at 95-98% accuracy on first attempt.',
      howToTeach: [
        { step: 'Match text to instruction', detail: 'Select texts aligned with taught patterns. Students should not encounter untaught patterns — this is the whole point of decodable text.' },
        { step: 'First read: accuracy', detail: 'Student reads aloud. On errors, guide sounding out. Do NOT supply the word — prompt: "What sounds do you see? Blend them."' },
        { step: 'Second read: fluency', detail: 'Reread same passage. Automaticity builds through repetition. Rate improves with each reading.' },
        { step: 'Progress through levels', detail: 'CVC → blends → digraphs → long vowels. Each decodable level matches instruction. When accuracy is 95%+, move to next level.' },
      ],
      example: 'Short-i CVC passage: "Tim has a big pig. The pig can dig in the mud. Tim hid in the pit." Every word decodable with known patterns.',
      ccss: 'RF.1.4, RF.2.4',
    },
    { name: 'Error Correction Procedure', what: 'How to respond when a student misreads a word during oral reading.', why: 'How you respond to errors either reinforces phonics ("sounds work") or undermines it ("just guess"). Consistent correction builds self-reliant decoders.',
      howToTeach: [
        { step: '1. Do not supply the word', detail: 'Resist telling them. This teaches waiting for help instead of using phonics skills.' },
        { step: '2. Point to the error', detail: '"Look at this word again. What sound does this letter make?" Direct attention to the specific error point.' },
        { step: '3. Prompt full decode', detail: '"Sound it out. Touch each letter, say each sound, blend." Guide them through the complete process.' },
        { step: '4. Reread the sentence', detail: 'After correcting, go back to the beginning of the sentence and reread. This connects accurate decoding to fluent reading.' },
      ],
      example: 'Student reads "started" for "store." "Look again — what letters? What pattern?" "s-t-o-r-e... silent e! Store!" "Read the whole sentence again."',
    },
    { name: 'Scarborough\'s Reading Rope', what: 'Model showing skilled reading develops from word recognition (PA, decoding, sight recognition) woven with language comprehension (vocabulary, syntax, background knowledge).', why: 'Helps teachers see phonics is necessary but not sufficient. For ELLs, both strands often need simultaneous support.',
      howToTeach: [
        { step: 'Understand the model', detail: 'Word recognition becomes automatic over time (bottom strand). Language comprehension becomes strategic (top strand). Skilled reading = both strands strong and woven.' },
        { step: 'Diagnose which strand', detail: 'Decodes fluently but no comprehension? Language gap. Understands when read to but cannot read? Decoding gap. Different problems need different solutions.' },
        { step: 'Teach phonics in context', detail: 'Always pair phonics with vocabulary, background knowledge, comprehension. Never teach phonics in isolation from meaning.' },
        { step: 'Use for parent communication', detail: 'The rope visual is powerful for conferences: "Your child is strong in this strand and needs support in this one."' },
      ],
      example: 'Grade 2 ELL decodes "The precipitation accumulated rapidly" perfectly but has no idea what it means. Word recognition is strong. Language comprehension needs intensive support.',
      koreanNote: 'Korean parents often equate reading with decoding accuracy. The Reading Rope reframes: decoding without comprehension is not reading.',
    },
    { name: 'Encoding / Dictation Routine', what: 'Teaching spelling by segmenting words into sounds and writing corresponding letters. The reciprocal of decoding.', why: 'Encoding strengthens decoding by forcing active processing of every sound. Dictation should be part of every phonics lesson.',
      howToTeach: [
        { step: 'Daily dictation', detail: 'After teaching a pattern, dictate words → phrases → sentences. Students segment and write. Build complexity gradually.' },
        { step: 'Sound-by-sound spelling', detail: 'Say the word, stretch it, identify each sound, write letters. Finger tapping or Elkonin boxes support segmentation.' },
        { step: 'Proofreading check', detail: 'Students touch each letter, say its sound: "Does what I wrote match what I hear?" Build self-checking habit.' },
        { step: 'Diagnose gaps', detail: 'Can decode "ship" but spells it "shp"? Needs segmentation work. Can spell it but not read it? Needs blending work.' },
      ],
      example: 'Pattern: -ck. Dictation: "rock, sock, duck, truck." Phrase: "a black duck." Sentence: "The duck sat on a rock."',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Learning letter-sound correspondences. May decode CVC words very slowly.', support: 'Multisensory techniques. Picture-supported decodable texts. Accuracy over speed.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Decodes CVC with increasing accuracy. Beginning blends/digraphs.', support: 'Decodable texts at instructional level. Daily dictation. High-frequency sight words.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Reads long vowel patterns. Two-syllable words with support.', support: 'Complex decodable texts. Syllable types. "Check for meaning" after decoding.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Decodes most grade-level words. Beginning morphology.', support: 'Multisyllabic strategies. Greek/Latin roots for content vocabulary.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Decoding largely automatic. Uses morphology for meaning.', support: 'Advanced spelling and etymology. Focus on comprehension — decoding is not a barrier.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Learning letter sounds. CVC decoding with heavy support. Relies on picture cues.', level2: 'Decodes CVC words. Beginning blends. Spells phonetically with support.', level3: 'Decodes blends and digraphs. Reads simple decodable chapter books.', level4: 'Reads long vowel patterns. Beginning two-syllable words. Applies phonics independently.', level5: 'Decodes at or above grade level. Phonics instruction focuses on spelling patterns.' },
    { grade: '2', level1: 'CVC decoding. Beginning blends with support. Very slow but building.', level2: 'Blends and digraphs. Beginning long vowels. Reads decodable text at late-1st grade level.', level3: 'Long vowels and r-controlled. Beginning two-syllable words with support.', level4: 'Two-syllable words using syllable types. 90%+ accuracy on grade-level text.', level5: 'Decoding is automatic. Focus shifts to spelling accuracy and morphology.' },
    { grade: '3', level1: 'Working on blends/digraphs and long vowels — significantly behind. Daily intensive practice needed.', level2: 'Long vowels and r-controlled. Two-syllable words with support. Decodable text at 2nd grade level.', level3: 'Multisyllabic decoding with support. Applying syllable division rules. Reads most grade-level words.', level4: 'Decodes multisyllabic words. Beginning morphological analysis. Automatic with common patterns.', level5: 'Decoding is automatic. Advanced spelling and morphology. No phonics gaps.' },
    { grade: '4', level1: 'Working on long vowel patterns and two-syllable words. Intensive intervention + grade-level content access through read-alouds.', level2: 'Two-syllable words. Beginning multisyllabic strategies. Reads at 2nd-3rd grade level independently.', level3: 'Multisyllabic decoding developing. Uses syllable types and some morphology. Approaching grade-level.', level4: 'Decodes grade-level text. Uses morphology (prefixes, suffixes) for word meaning. Occasional complex pattern errors.', level5: 'Fully automatic. Morphological analysis for content-area vocabulary. No gaps.' },
    { grade: '5', level1: 'Two-syllable words with support. Needs intensive structured intervention. Access grade content through audio/read-aloud.', level2: 'Multisyllabic with support. Basic morphology. Reads at 3rd-4th grade level independently.', level3: 'Most multisyllabic words decoded. Morphology developing. Near grade-level accuracy.', level4: 'Grade-level decoding. Advanced morphology (Greek/Latin roots). Rare errors on unusual patterns.', level5: 'Fully automatic. Advanced word study for content-area vocabulary.' },
  ],
  interventionSignals: [
    { signal: 'Cannot decode CVC words by mid-first grade', whatToDo: 'Check PA foundations — can they blend/segment orally? If not, address PA first. If PA is solid, increase multisensory phonics with CVC decodable text.' },
    { signal: 'Guesses words from first letter or pictures instead of decoding', whatToDo: 'Redirect consistently: "Look at ALL the letters and sound it out." Remove picture support during phonics. Increase decodable text volume.' },
    { signal: 'Decodes accurately but extremely slowly', whatToDo: 'Build automaticity: repeated reading of familiar decodable texts, timed word list drills. Move from slow decoding to instant recognition.' },
    { signal: 'Can decode but cannot spell the same words', whatToDo: 'Increase encoding/dictation practice. Student may be recognizing shapes rather than processing sounds. Dictation forces sound-by-sound analysis.' },
    { signal: 'Grade 3+ student cannot decode two-syllable words', whatToDo: 'Significant gap requiring targeted intervention in syllable types and division. Structured program, daily 15-20 min small group, biweekly progress monitoring.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'SoR Progression provides the full scope and sequence. Quick Check assesses specific patterns. Standards Checklist tracks RF standards. Grade Entry captures phonics domain scores.',
}


// ═══════════════════════════════════════════════════════════════════
// 3. READING FLUENCY
// ═══════════════════════════════════════════════════════════════════

export const READING_FLUENCY: GuideSection = {
  id: 'reading-fluency', title: 'Reading Fluency', icon: 'Gauge',
  subtitle: 'Reading accurately, at an appropriate rate, and with expression',
  overview: {
    what: 'Reading fluency is the ability to read text accurately, at a conversational pace, and with appropriate expression (prosody). It is NOT just speed. Fluency bridges decoding and comprehension: when word recognition is automatic, cognitive resources are freed for understanding.',
    whyItMatters: 'The NRP identified fluency as essential. Disfluent reading creates a double cognitive burden for ELLs — processing both decoding and language comprehension simultaneously. Prosody (expression) is the most overlooked component but directly signals comprehension.',
    researchBase: 'NRP (2000); Hasbrouck & Tindal ORF Norms (2017); NAEP Oral Reading Fluency Scale; Rasinski (2003); Reading Rockets.',
    bigIdea: 'Fluency is not about reading fast. It is about reading accurately and smoothly enough that the brain can focus on meaning instead of decoding.',
  },
  developmentalProgression: [
    { name: 'Accuracy', description: 'Reading words correctly — the foundation. Without accuracy, rate and prosody are meaningless.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Decodable text at instructional level (90-96% accuracy)', 'Error correction: stop, sound out, reread the sentence', 'High-frequency word automaticity drills'] },
    { name: 'Automaticity (Rate)', description: 'Reading at a pace allowing comprehension. Measured as CWPM. Not racing — efficiency.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 5', activities: ['Repeated reading: same passage 3-4 times, chart CWPM', 'Partner reading: students take turns and support each other', 'Self-monitoring: track own CWPM growth weekly'] },
    { name: 'Prosody (Expression)', description: 'Appropriate phrasing, stress, intonation — sounding like natural speech. Signals comprehension.', difficulty: 'advanced', gradeRange: 'Grade 2 to 5', activities: ['Teacher modeling with echo reading', 'Reader\'s theater for authentic expressive purpose', 'Phrase-cued reading: slashes mark natural phrase breaks'] },
  ],
  milestones: [
    { grade: '1 (spring)', expectations: '60-80 CWPM, 95%+ accuracy. Beginning expression.', assessHow: 'ORF with grade-level passage. Record CWPM and accuracy rate.' },
    { grade: '2 (spring)', expectations: '90-110 CWPM, 95%+ accuracy. Some phrasing.', assessHow: 'ORF benchmark. NAEP rubric Level 2-3.' },
    { grade: '3 (spring)', expectations: '110-130 CWPM. Phrasing and expression. Self-corrects.', assessHow: 'ORF benchmark. NAEP Level 3. Comprehension check alongside.' },
    { grade: '4 (spring)', expectations: '120-145 CWPM. Adjusts rate for difficulty.', assessHow: 'ORF benchmark. NAEP Level 3-4.' },
    { grade: '5 (spring)', expectations: '140-170 CWPM. Fluent across genres.', assessHow: 'ORF benchmark. NAEP Level 4.' },
  ],
  skills: [
    { name: 'Oral Reading Fluency (ORF) Assessment', what: 'Standardized 1-minute timed reading to measure accuracy and rate on connected text.', why: 'Most efficient indicator of overall reading competence in elementary. Takes 1-3 minutes. Must be interpreted WITH comprehension — speed without understanding is word-calling.',
      howToTeach: [
        { step: 'Administer correctly', detail: 'Unpracticed grade-level passage. Read 1 minute. Mark errors (substitutions, omissions, insertions). Self-corrections are NOT errors. CWPM = total words - errors.' },
        { step: 'Calculate accuracy rate', detail: '(Words correct / total attempted) x 100. Independent: 97%+. Instructional: 90-96%. Frustration: below 90%. A fast reader below 90% needs to SLOW DOWN.' },
        { step: 'Use Hasbrouck-Tindal norms', detail: '50th percentile spring: Gr 1: 60, Gr 2: 100, Gr 3: 112, Gr 4: 133, Gr 5: 146. ELLs may score below norms and still be progressing well.' },
        { step: 'Assess prosody with NAEP scale', detail: 'Level 1: word-by-word. Level 2: two-word phrases. Level 3: phrases with some expression. Level 4: expressive, natural. Adequate CWPM with Level 1-2 prosody = word-calling.' },
      ],
      example: 'Student reads Grade 2 passage: 112 attempted, 6 errors. CWPM = 106, accuracy = 94.6% (instructional). NAEP: Level 2. Action: good rate, needs phrasing work.',
      ccss: 'RF.1.4, RF.2.4, RF.3.4, RF.4.4, RF.5.4',
    },
    { name: 'Repeated Reading Protocol', what: 'Reading the same passage multiple times to build automaticity and expression.', why: 'One of the most research-validated fluency interventions. Each rereading builds automatic word recognition, freeing resources for prosody and comprehension.',
      howToTeach: [
        { step: 'Select text', detail: 'Instructional level (90-96% first-read accuracy). 100-200 words. Interesting enough for 3-4 readings.' },
        { step: 'Read 1: accuracy', detail: 'Read aloud. Teacher notes errors, provides correction. Calculate baseline CWPM.' },
        { step: 'Read 2: smoother', detail: 'Reread. CWPM improves 10-20%. Teacher models any choppy phrases.' },
        { step: 'Read 3-4: fluent', detail: 'Noticeably better rate and expression. Chart CWPM to show growth. Students love seeing their own improvement.' },
      ],
      example: 'Read 1: 68 CWPM. Read 2: 82 CWPM. Read 3: 91 CWPM with better phrasing. Student charts growth.',
    },
    { name: 'Prosody: Phrase-Cued Reading', what: 'Marking natural phrase boundaries in text with slashes to train students to read in meaningful chunks instead of word-by-word.', why: 'Prosody directly supports comprehension because it reflects understanding of syntax and meaning. Word-by-word readers are not grouping language into meaningful units.',
      howToTeach: [
        { step: 'Teacher marks phrases', detail: 'Use slashes: "The big dog / ran across the yard / and barked loudly / at the neighbor\'s cat." Each phrase is a meaningful unit.' },
        { step: 'Model reading in phrases', detail: 'Read the passage demonstrating how your voice groups the words naturally. Then have students echo phrase by phrase.' },
        { step: 'Students practice with marks', detail: 'Read the marked passage 2-3 times until phrasing feels natural.' },
        { step: 'Remove marks and transfer', detail: 'Read the same passage without marks, maintaining phrasing. Then try a NEW passage without marks.' },
      ],
      example: '"Once upon a time, / there was a little girl / who lived at the edge / of a dark forest." Student reads as marked, then again without marks.',
    },
    { name: 'Reader\'s Theater', what: 'Students perform scripts by reading from the text with expression — no memorization, no costumes, no staging. Just voices.', why: 'Gives authentic purpose for expressive reading. Students practice the same text multiple times (building fluency) with genuine motivation (performing for peers).',
      howToTeach: [
        { step: 'Select or adapt a script', detail: 'Fairy tales, fables, and picture books adapt well. Scripts need parts with varied line lengths. Many free scripts available from Reading A-Z and other sources.' },
        { step: 'Assign parts and practice', detail: 'Students read through their parts independently, then in small groups. Practice for 3-4 days, 15-20 minutes per day.' },
        { step: 'Focus on expression', detail: 'During practice, coach: "How would this character say this? Is she angry? Scared? Make your voice show that."' },
        { step: 'Perform for an audience', detail: 'Simple performance for classmates, another class, or recorded. The audience creates accountability and motivation.' },
      ],
      example: '"The Three Billy Goats Gruff" as reader\'s theater: Narrator, Little Goat (quiet voice), Medium Goat (normal voice), Big Goat (loud, bold voice), Troll (grumpy, growling voice).',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Very slow, word by word. May finger-point.', support: 'Accuracy first. Decodable texts at their level. Echo reading. Do not push speed.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Two-word phrases. Below norms. Minimal expression.', support: 'Repeated reading. Partner reading. High-frequency word automaticity.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: '3-4 word phrases. Approaching norms. Attends to punctuation.', support: 'Phrase-cued reading. Reader\'s theater. Push for internal prosody.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Adequate rate, mostly appropriate phrasing. Self-corrects.', support: 'Prosody focus. Complex text challenge. Build fluency across genres.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Fluent with appropriate rate, accuracy, expression.', support: 'No longer primary focus. Monitor with content-area text.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Word-by-word, under 20 CWPM. Focus on accuracy and CVC decodable text.', level2: '20-40 CWPM in 2-word phrases. Daily repeated reading with decodable text.', level3: '40-60 CWPM with some phrasing. Approaching grade-level norms.', level4: '60-80 CWPM with expression. Meets end-of-year benchmark.', level5: 'Above 80 CWPM. Fluent and expressive. Challenge with above-level text.' },
    { grade: '2', level1: 'Under 40 CWPM. Still decoding word-by-word. Needs intensive decodable practice.', level2: '40-70 CWPM. Two-word phrases. Daily repeated reading. Partner reading.', level3: '70-90 CWPM. Developing phrasing. Phrase-cued reading and reader\'s theater.', level4: '90-110 CWPM. Good expression. Meets benchmark. Varied genre reading.', level5: 'Above 110 CWPM. Strong prosody. Focus on comprehension-driven reading.' },
    { grade: '3', level1: 'Under 60 CWPM. Check if phonics/accuracy is the barrier or just rate.', level2: '60-85 CWPM. Building automaticity. Repeated reading and timed practice.', level3: '85-110 CWPM. Phrasing developing well. Reader\'s theater and paired reading.', level4: '110-130 CWPM. Meets benchmark. Push prosody and genre variety.', level5: 'Above 130 CWPM. Focus entirely on comprehension and critical reading.' },
    { grade: '4', level1: 'Under 70 CWPM. May need phonics intervention alongside fluency.', level2: '70-100 CWPM. Daily fluency practice. Repeated reading with progress charting.', level3: '100-120 CWPM. Good progress. Focus on prosody and self-monitoring.', level4: '120-145 CWPM. At benchmark. Adjusts rate for text difficulty.', level5: 'Above 145 CWPM. Fluency is automatic across all text types.' },
    { grade: '5', level1: 'Under 80 CWPM. Intensive intervention needed. Check phonics foundation.', level2: '80-110 CWPM. Consistent fluency practice. Build confidence with familiar texts.', level3: '110-140 CWPM. Approaching benchmark. Varied text and genre exposure.', level4: '140-170 CWPM. At benchmark. Self-selects appropriate reading rate.', level5: 'Above 170 CWPM. Fluency is a strength. Focus on deep comprehension.' },
  ],
  interventionSignals: [
    { signal: 'Below 40 CWPM in spring of Grade 1', whatToDo: 'Check accuracy — if below 90%, phonics support needed first. If accuracy is fine, increase decodable reading volume and daily repeated reading.' },
    { signal: 'Flat, word-by-word reading in Grade 2+', whatToDo: 'Needs prosody instruction, not speed. Echo reading, phrase-cued reading, reader\'s theater. Check comprehension — flat prosody often means weak understanding.' },
    { signal: 'Fast but inaccurate (skipping, not self-correcting)', whatToDo: 'Slow down. Finger-track. "Fast and wrong is not fluent. Accurate and smooth is fluent." Return to instructional-level text.' },
    { signal: 'CWPM stagnates despite practice', whatToDo: 'Check for phonics ceiling or vocabulary barrier. Students slow down on words they can decode but do not understand.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Reading Fluency page tracks CWPM trends. NAEP Scale reference explains levels. ORF data feeds into attendance-academic correlation. Use alongside domain grades for full reading picture.',
}


// ═══════════════════════════════════════════════════════════════════
// 4. READING SKILLS
// ═══════════════════════════════════════════════════════════════════

export const READING_SKILLS: GuideSection = {
  id: 'reading-skills', title: 'Reading Skills', icon: 'BookOpen',
  subtitle: 'Comprehension strategies, text analysis, and critical reading across genres',
  overview: {
    what: 'Reading skills encompass strategies for constructing meaning from text — from identifying main idea and making inferences to analyzing author purpose and synthesizing across sources. Comprehension instruction must begin alongside phonics, not after it.',
    whyItMatters: 'Decoding without comprehension is not reading. The NRP found explicit strategy instruction significantly improves outcomes. Tan Huynh\'s before-during-after framework ensures ELLs build comprehension actively, not just answer questions afterward.',
    researchBase: 'NRP (2000); Duke & Pearson (2002); Tan Huynh; Kelly Gallagher: "Article of the Week," "Readicide"; Reading Rockets.',
    bigIdea: 'Good readers do not absorb text passively — they actively think about it. Comprehension strategies must be explicitly taught, modeled, and practiced until automatic.',
  },
  developmentalProgression: [
    { name: 'Literal Comprehension', description: 'Explicitly stated information — who, what, where, when. "Right there" questions.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Who/what/where/when questions', 'Sequencing with picture cards', 'Beginning/middle/end retelling'] },
    { name: 'Inferential Comprehension', description: 'Reading between the lines — text clues + prior knowledge = unstated conclusions.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 5', activities: ['Text Clue + What I Know = Inference formula', 'Picture-based inference before text-based', '"How do you know?" — always cite evidence'] },
    { name: 'Evaluative & Analytical', description: 'Analyzing author choices, evaluating arguments, comparing texts, synthesizing sources.', difficulty: 'advanced', gradeRange: 'Grade 3 to 5', activities: ['Author purpose analysis across texts', 'Text structure comparison', 'Argument evaluation: claim + evidence'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Retells with key details. Identifies main topic. Asks/answers questions.', assessHow: 'Oral retelling rubric. Read-aloud comprehension questions.' },
    { grade: '2', expectations: 'Main idea + details. Simple inferences. Describes character responses.', assessHow: 'Written responses. IRI comprehension.' },
    { grade: '3', expectations: 'Theme and main idea. Character traits from evidence. Distinguishes perspectives.', assessHow: 'Text-dependent analysis. ACE responses.' },
    { grade: '4-5', expectations: 'Summarizes. Compares themes. Analyzes structure and craft. Multiple sources.', assessHow: 'Extended responses. Comparison writing. Research tasks.' },
  ],
  skills: [
    { name: 'Main Idea & Supporting Details', what: 'Identifying the most important point and details supporting it.', why: 'Gateway to all deeper analysis. ELLs often confuse topic (one word) with main idea (a complete thought about the topic).',
      howToTeach: [
        { step: 'Topic vs. main idea', detail: 'Topic = one word (recycling). Main idea = sentence about the topic (Recycling reduces trash). Headline test: what would the headline be?' },
        { step: 'Umbrella strategy', detail: 'Main idea is the umbrella covering everything. Details are raindrops underneath. Draw it. Sort sentences.' },
        { step: 'Two-column notes', detail: 'Left: main idea per paragraph. Right: key details. Process paragraph by paragraph.' },
        { step: 'Shrink it', detail: 'State main idea in 10 words or fewer. Forces precision and eliminates extras.' },
      ],
      example: 'Bears paragraph → "Topic: bears. Main idea: Bears eat many different foods."',
      koreanNote: 'Explicitly teach difference between 주제 (topic) and 중심 생각 (main idea).', ccss: 'RI.x.2, RL.x.2',
    },
    { name: 'Making Inferences', what: 'Text clues + background knowledge = figuring out what the author did not state.', why: 'Most meaningful comprehension requires inference. For ELLs, doubly hard due to possible cultural knowledge gaps.',
      howToTeach: [
        { step: 'Teach the formula', detail: 'Text Clue + What I Know = Inference. Post it. Use it every time. Make invisible thinking visible.' },
        { step: 'Start with pictures', detail: 'Photos are accessible even at WIDA 1-2. "What is happening? What clues? What do you already know?"' },
        { step: 'Think-aloud modeling', detail: '"The text says her hands shook. I know shaking = nervous. I infer she is nervous." Model repeatedly.' },
        { step: 'Evidence requirement', detail: 'Frame: "I think ___ because the text says ___ and I know that ___." No unsupported inferences allowed.' },
      ],
      example: '"Sarah grabbed her umbrella and raincoat." → Clue: umbrella/raincoat + I know people use these when it rains → raining outside.', ccss: 'RL.x.1, RI.x.1',
    },
    { name: 'Before-During-After Reading (Tan Huynh Framework)', what: 'Three-phase comprehension structure for any text. Comprehension is BUILT, not just checked.', why: 'ELLs need pre-reading support to activate background knowledge and pre-teach vocabulary. During-reading monitoring prevents comprehension breakdown. After-reading is where deep thinking happens.',
      howToTeach: [
        { step: 'BEFORE: activate and build', detail: 'Options: KWL chart, picture walk, vocabulary preview, short video clip, L1 discussion, prediction from title/images. Goal: give students the conceptual framework to understand what they are about to read.' },
        { step: 'DURING: monitor actively', detail: 'Options: annotation (underline key ideas, circle unknowns, margin notes), think-pair-share at stopping points, graphic organizer filled during reading, sticky note questions. Goal: catch comprehension breakdowns early.' },
        { step: 'AFTER: deepen understanding', detail: 'Options: summarize, ACE written response, discussion, Socratic seminar, creative response, presentation. Goal: process and consolidate understanding.' },
        { step: 'Kelly Gallagher\'s Article of the Week', detail: 'Weekly current event article with before-during-after structure. Students annotate, respond in writing, discuss. Builds background knowledge, close reading, and writing simultaneously.' },
      ],
      example: 'Volcano text: Before — 1-min eruption video + teach "erupt, magma, ash." During — annotate, circling unknowns. After — cause-effect organizer about eruption impacts.',
    },
    { name: 'Text Evidence & ACE Method', what: 'Answer the question. Cite evidence from text. Explain how evidence supports the answer.', why: 'Without text evidence, students give unsupported opinions. ACE provides the academic response structure ELLs need.',
      howToTeach: [
        { step: 'Build the reflex', detail: 'Every comprehension question: "Where does it say that? Show me." Make "go back to the text" automatic.' },
        { step: 'Model ACE repeatedly', detail: 'A = Answer the question directly. C = Quote or paraphrase from text. E = Explain how the evidence proves your answer. Write A, C, E on the board and label each part.' },
        { step: 'Highlight before writing', detail: 'Give physical text copies. Highlight the proving sentence BEFORE writing. Makes the abstract concrete.' },
        { step: 'Provide starters', detail: '"According to the text..." / "The author states..." / "On page ___, it says..." / "This shows that..."' },
      ],
      example: 'Q: How does she feel? A: "She feels nervous." C: "The text says her hands were shaking and she could not make eye contact." E: "Shaking and avoiding eyes are signs of anxiety."', ccss: 'RL.x.1, RI.x.1',
    },
    { name: 'Summarizing (Somebody-Wanted-But-So-Then)', what: 'Retelling ONLY the most important parts in your own words.', why: 'Summarizing requires determining importance, organizing, and expressing concisely — three critical academic skills.',
      howToTeach: [
        { step: 'SWBST for narrative', detail: 'Somebody (character) Wanted (motivation) But (conflict) So (action) Then (resolution). One sentence covers the whole story.' },
        { step: 'What? So What? for informational', detail: 'What is it about? Why does it matter? What are the 2-3 key points? Forces conciseness.' },
        { step: 'Distinguish retelling from summary', detail: 'Retelling = everything. Summary = only important parts. Explicitly teach this difference — ELLs default to retelling everything.' },
        { step: '10-word challenge', detail: 'Summarize a paragraph in exactly 10 words. Forces ruthless prioritization of information.' },
      ],
      example: 'SWBST: "A girl (S) wanted to find her lost dog (W) but it was raining (B) so she searched all day (S) then found it under the porch (T)."', ccss: 'RL.x.2, RI.x.2',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Key details with visuals. Points to answers. Retells with pictures.', support: 'Illustrated texts. One-word or L1 responses. Read aloud and discuss first.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Beginning/middle/end retelling. Main topic with support. Simple inferences.', support: 'Graphic organizers. Sentence frames. Partner talk before writing. Pre-teach vocab.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Main idea + details. Inferences with evidence. Compares texts. Short ACE.', support: 'Push for evidence. Summarizing strategies. Before-during-after framework.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Character analysis. Text structure. Fact vs. opinion. Multi-paragraph responses.', support: 'Author craft. Analytical vocabulary. Complex texts. Debate.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Synthesizes across texts. Evaluates arguments. Analyzes perspective.', support: 'Deeper analysis. Nuance, tone, style. Content-area reading.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Points to characters/objects in pictures. Yes/no about story details.', level2: 'Retells with pictures. Identifies main character and 1-2 events. Simple "who did what."', level3: 'Retells beginning/middle/end. Simple inference from pictures. "I think... because..."', level4: 'Identifies problem/solution. Makes text-to-self connections. Answers "why" with detail.', level5: 'Retells with key details independently. Makes inferences. Compares two stories.' },
    { grade: '2', level1: 'Answers who/what with 1-word responses. Identifies characters from pictures.', level2: 'Identifies main topic. Sequences 3 events. Answers basic questions in phrases.', level3: 'States main idea with support. Simple inference with text evidence. ACE with frames.', level4: 'Compares characters. Identifies author purpose (inform/entertain). Independent ACE.', level5: 'Summarizes independently. Infers character feelings. Text structure awareness.' },
    { grade: '3', level1: 'Identifies key details with heavy visual support. Retells 2-3 events with pictures.', level2: 'Main topic identification. Simple inference. Retells with beginning/middle/end.', level3: 'Main idea + 2-3 details. Makes inferences citing evidence. Compares two texts.', level4: 'Theme identification. Character traits with evidence. Text structure analysis.', level5: 'Synthesizes across texts. Analyzes author craft. Independent analytical responses.' },
    { grade: '4', level1: 'Key details with visuals. Labels characters and settings. Simple sequence.', level2: 'Main idea with support. Basic inference. Retells with graphic organizer.', level3: 'Summarizes paragraphs. Inferences with ACE. Identifies text features and structure.', level4: 'Theme across texts. Evaluates evidence. Multi-paragraph analytical writing.', level5: 'Synthesizes multiple sources. Evaluates author bias and purpose. Independent analysis.' },
    { grade: '5', level1: 'Identifies topic and basic details with visual support. Retells with frames.', level2: 'Main idea + details. Simple inference with evidence. Short written responses.', level3: 'Summarizes texts. Compares themes. Cites evidence in writing. Basic text analysis.', level4: 'Evaluates arguments. Analyzes perspective and bias. Research from multiple sources.', level5: 'Grade-level analytical reading. Synthesizes, evaluates, critiques independently.' },
  ],
  interventionSignals: [
    { signal: 'Cannot retell after reading', whatToDo: 'Check decoding first — if below 90% accuracy, text is too hard. If decoding is fine, teach retelling with story maps and sequencing cards.' },
    { signal: 'Decodes fluently but answers incorrectly', whatToDo: 'Comprehension gap, not decoding. Check vocabulary and background knowledge. Increase pre-reading support.' },
    { signal: 'Cannot infer even with prompting', whatToDo: 'Return to picture-based inference. Use formula explicitly every time. Takes significant practice for ELLs.' },
    { signal: 'Answers verbally but cannot write responses', whatToDo: 'Language production issue. Provide frames, word banks, oral rehearsal before writing.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Reading domain. Quick Check assesses comprehension. Standards Checklist covers RL and RI standards.',
}


// ═══════════════════════════════════════════════════════════════════
// 5. VOCABULARY
// ═══════════════════════════════════════════════════════════════════

export const VOCABULARY: GuideSection = {
  id: 'vocabulary', title: 'Vocabulary', icon: 'Sparkles',
  subtitle: 'Building deep word knowledge through systematic, strategic instruction',
  overview: {
    what: 'Vocabulary instruction teaches word meanings and independent word-learning strategies. The three-tier framework (Beck, McKeown & Kucan): Tier 1 (everyday), Tier 2 (high-utility academic: analyze, establish), Tier 3 (domain-specific: photosynthesis). Effective instruction goes far beyond definitions.',
    whyItMatters: 'Vocabulary is the strongest predictor of comprehension after decoding. For ELLs, vocabulary is the single biggest barrier. Students may decode perfectly but understand nothing. Research shows 10-12 meaningful encounters are needed before a word becomes productive vocabulary.',
    researchBase: 'Beck, McKeown & Kucan (2002); NRP (2000); Marzano (2004); Tan Huynh; Reading Rockets.',
    bigIdea: 'Vocabulary is not learned through definitions alone. Deep word knowledge develops through multiple, meaningful encounters — hearing, reading, speaking, and writing words in context.',
  },
  developmentalProgression: [
    { name: 'Tier 1: Basic Words', description: 'Everyday words native speakers know. ELLs may need explicit instruction.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Label classroom objects', 'TPR for action words', 'Picture-word matching', 'Daily conversation with targets'] },
    { name: 'Tier 2: Academic Vocabulary', description: 'High-utility words across content areas. Primary instruction target.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 5', activities: ['Word of the day with multiple daily encounters', 'Frayer Model: definition, characteristics, examples, non-examples', 'Using targets in speaking AND writing'] },
    { name: 'Tier 3: Domain-Specific', description: 'Technical terms best taught within content context.', difficulty: 'advanced', gradeRange: 'Grade 2 to 5', activities: ['Pre-teach before content lessons', 'Morphological analysis: photo + synthesis', 'Content journals with glossaries'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Common everyday words. Sorts into categories. Learns from read-alouds.', assessHow: 'Oral vocabulary. Picture naming. Read-aloud observation.' },
    { grade: '1-2', expectations: 'Context clues. Common Tier 2 words. Synonyms/antonyms.', assessHow: 'Context clue tasks. Vocabulary matching.' },
    { grade: '3-5', expectations: 'Morphology for word meaning. Uses references. Academic vocabulary in speaking and writing.', assessHow: 'Vocabulary in context. Written use of targets. Morphological analysis.' },
  ],
  skills: [
    { name: 'Selecting Words to Teach (3-Tier Framework)', what: 'Choosing which words deserve instruction time using Beck\'s tier framework.', why: 'You cannot teach every word. Tier 2 gives highest return — appears across subjects.',
      howToTeach: [
        { step: 'Identify Tier 2 in the text', detail: 'Words that are important, likely to recur, and not already known. Example: "reluctant" is Tier 2 — used everywhere, worth teaching deeply.' },
        { step: 'Limit to 3-5 per text', detail: 'More dilutes instruction. Choose most essential and transferable.' },
        { step: 'Pre-teach Tier 3 briefly', detail: 'Quick intro: definition + visual + connection to concept. Deep learning happens through content.' },
        { step: 'Check Tier 1 for ELLs', detail: 'If a student does not know "sink" or "ceiling," address through immersion — not formal vocabulary lessons.' },
      ],
      example: 'Weather text: Tier 3 pre-teach: precipitation, evaporation. Tier 2 teach deeply: accumulate, severe, impact. Tier 1 check: puddle, forecast.',
      koreanNote: 'Many Tier 2 English words have Sino-Korean equivalents (analyze = 분석, biography = 전기). Making cognate connections accelerates academic vocabulary acquisition.',
    },
    { name: 'Teaching Words Deeply (10-12 Encounters)', what: 'Building rich word knowledge through multiple exposures across contexts.', why: 'One definition lesson is not enough. Deep word knowledge includes synonyms, antonyms, word forms, collocations, and contextual usage.',
      howToTeach: [
        { step: 'Student-friendly definition', detail: '"Reluctant means you don\'t want to do something — you hold back." NOT: "Reluctant: adjective, unwilling."' },
        { step: 'Multiple contexts', detail: 'Show in 3+ sentences: "She was reluctant to try new food." "The reluctant hero agreed." "I felt reluctant about the speech."' },
        { step: 'Active use required', detail: 'Students MUST use the word: "Tell your partner about a time you felt reluctant." "Write a sentence." "Is shy the same as reluctant?"' },
        { step: 'Revisit all week', detail: 'Mention target words throughout the week across activities. Build through repetition, not single lessons.' },
      ],
      example: 'Mon: introduce "transform" + 3 contexts. Tue: find in science reading. Wed: use in writing. Thu: Frayer Model. Fri: quiz — sentence, synonym, meaning.',
    },
    { name: 'Morphological Awareness', what: 'Using word parts (prefixes, suffixes, roots) to figure out unfamiliar words.', why: 'Most powerful independent word-learning strategy. Knowing "un-" = not and "-able" = can be unlocks dozens of words.',
      howToTeach: [
        { step: 'Teach high-frequency affixes', detail: 'un-, re-, pre-, dis-, -tion/-sion, -able/-ible, -ful, -less, -ment, -ness, -ly. These cover most derived English words.' },
        { step: 'Word sums', detail: 're + play + ing = replaying. Reverse: "re- means again, play means activity, so replay = play again."' },
        { step: 'Greek/Latin roots (Gr 3-5)', detail: 'dict (say), port (carry), struct (build), rupt (break), spect (look), aud (hear). Each unlocks a word family.' },
        { step: 'Apply during reading', detail: '"Do I see parts I know? Prefix? Suffix? Root?" Strategy becomes independent word-solving tool.' },
      ],
      example: '"Unbreakable": un- = not, break = damage, -able = can be. Cannot be broken.',
      koreanNote: 'Korean uses Chinese characters similarly to Greek/Latin roots. Teaching this parallel helps students transfer existing word analysis skills.',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Survival vocabulary. Labels objects. Key words with visual support.', support: 'TPR. Picture walls. Label classroom. Bilingual glossaries.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Growing everyday vocabulary. Simple Tier 2 in context. Beginning context clues.', support: 'Pre-teach before every text. Visuals. Word banks. Daily routines.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Uses Tier 2 with support. Simple context clues. Basic word relationships.', support: 'Morphological analysis. Frayer Model. Multiple exposures across content.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Academic vocabulary across content. Independent morphology. Figurative language with support.', support: 'Greek/Latin roots. Explicit idiom instruction. Content-area journals.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Precise academic vocabulary. Figurative language, nuance, connotation.', support: 'Connotation, register, tone distinctions. Word choice in writing.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Learning basic school/classroom words. "This is a ___." Labels with pictures.', level2: 'Common nouns, verbs, adjectives. "The ___ is ___." Growing daily vocabulary.', level3: 'Uses descriptive words. Beginning Tier 2 (important, different, special).', level4: 'Uses Tier 2 in sentences. Understands word relationships.', level5: 'Rich vocabulary for age. Beginning to use words precisely.' },
    { grade: '2', level1: 'Expanding basic vocabulary. Simple descriptions with support.', level2: 'Growing Tier 2 (compare, describe, explain). Uses context clues with heavy support.', level3: 'Applies context clues. Knows common prefixes (un-, re-). Uses Tier 2 in writing.', level4: 'Uses Tier 2 across subjects. Beginning figurative language awareness.', level5: 'Strong word knowledge. Uses words precisely in writing and speech.' },
    { grade: '3', level1: 'Still building Tier 1 gaps. Basic descriptive vocabulary.', level2: 'Common Tier 2 words. Simple context clues. Basic synonyms/antonyms.', level3: 'Uses morphology (prefixes, suffixes). Tier 2 in academic writing. Frayer Model use.', level4: 'Academic vocabulary across content. Greek/Latin roots beginning. Idioms with support.', level5: 'Near grade-level vocabulary. Understands nuance and connotation.' },
    { grade: '4', level1: 'Working on foundational vocabulary alongside content-area terms.', level2: 'Growing academic vocabulary. Context clues developing. Basic morphology.', level3: 'Morphological analysis independent. Content vocabulary with support. Figurative language developing.', level4: 'Strong academic vocabulary. Greek/Latin roots. Understands most figurative language.', level5: 'Grade-level vocabulary. Precise word choice. Subtle connotation awareness.' },
    { grade: '5', level1: 'Tier 1 and basic Tier 2. Content vocabulary with heavy visual support.', level2: 'Academic vocabulary growing. Morphology with support. Content terms with scaffolding.', level3: 'Independent morphological strategies. Academic vocabulary in writing. Most figurative language.', level4: 'Strong content vocabulary. Etymology awareness. Figurative language and idioms.', level5: 'Full grade-level vocabulary including subtle distinctions and register awareness.' },
  ],
  interventionSignals: [
    { signal: 'Decodes fluently but does not comprehend', whatToDo: 'Vocabulary gap most likely. Pre-teach key vocabulary before reading. Word preview routine with definitions, visuals, examples.' },
    { signal: 'Cannot explain words after instruction', whatToDo: 'Need more encounters. Create opportunities to hear, read, speak, and write target words throughout the week.' },
    { signal: 'Relies solely on dictionary translation', whatToDo: 'Build context clue and morphological strategies. Teach to try these first. Dictionary is backup, not primary strategy.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Language Standards domain. WIDA profiles guide instruction intensity.',
}


// ═══════════════════════════════════════════════════════════════════
// 6. GRAMMAR — with deep grammar reference points
// ═══════════════════════════════════════════════════════════════════

export const GRAMMAR: GuideSection = {
  id: 'grammar', title: 'Grammar', icon: 'Type',
  subtitle: 'Parts of speech, sentence structure, and English conventions for ELLs',
  overview: {
    what: 'Grammar instruction for ELLs focuses on English conventions essential for communication and academic success. Effective grammar is embedded in meaningful reading and writing — not isolated drills. Jeff Anderson\'s "Patterns of Power" approach teaches grammar through noticing patterns in mentor sentences from real texts.',
    whyItMatters: 'Isolated grammar drills produce minimal transfer to actual writing. Grammar is best taught through noticing patterns in texts students read, then applying them in texts students write. Anderson: "Invite students to notice, not to fix."',
    researchBase: 'Jeff Anderson (2005) "Mechanically Inclined," "Patterns of Power"; Weaver (1996); Tan Huynh: Sentence-Level Instruction; WIDA.',
    bigIdea: 'Grammar is not rules to memorize — it is patterns to notice, practice, and use. Teach through reading and writing, not before it.',
  },
  developmentalProgression: [
    { name: 'Basic Sentence Structure', description: 'SVO word order. Simple complete sentences. English SVO vs. Korean SOV.', difficulty: 'foundational', gradeRange: 'K to Grade 2', activities: ['Sentence strips: arrange word cards in SVO order', 'Sentence expansion: "The dog ran" → add words one at a time', 'Daily oral sentence practice from pictures'] },
    { name: 'Parts of Speech & Agreement', description: 'Nouns, verbs, adjectives, pronouns, prepositions. Subject-verb agreement. Inflectional endings.', difficulty: 'intermediate', gradeRange: 'Grade 1 to 3', activities: ['Color-coded sentences: red=subject, blue=verb, green=object', 'Verb tense timeline on wall', 'Daily editing: find and fix errors'] },
    { name: 'Complex Sentences & Conventions', description: 'Compound/complex sentences. Relative clauses. Consistent tense. Advanced punctuation.', difficulty: 'advanced', gradeRange: 'Grade 3 to 5', activities: ['Sentence combining', 'Mentor sentence study (Patterns of Power)', 'Grammar journals: collect and analyze interesting sentences'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Complete simple sentences. Common nouns and verbs. Capitals and periods.', assessHow: 'Writing samples. Oral observation. Sentence dictation.' },
    { grade: '2-3', expectations: 'Subject-verb agreement. Basic punctuation. Compound sentences.', assessHow: 'Conventions rubric. Editing tasks.' },
    { grade: '4-5', expectations: 'Complex sentences. Varied structure. Comma rules. Consistent tense.', assessHow: 'Writing analysis. Sentence variety. Self-editing checklists.' },
  ],
  skills: [
    { name: 'Patterns of Power (Jeff Anderson Approach)', what: 'Teaching grammar by studying how real authors use conventions in published texts — invitation to notice, not correction of errors.', why: 'Traditional grammar instruction (worksheets, error correction) does not transfer to student writing. Anderson\'s approach works because students see grammar as a tool authors use deliberately.',
      howToTeach: [
        { step: 'Day 1: Invitation to Notice', detail: 'Display a mentor sentence from a real text. "What do you notice about this sentence?" Students observe punctuation, word choice, structure. Teacher guides noticing without lecturing.' },
        { step: 'Day 2: Invitation to Compare', detail: 'Show a second sentence with the same pattern. "How are these similar?" Students identify the pattern themselves.' },
        { step: 'Day 3: Invitation to Imitate', detail: 'Students write their own sentence following the same pattern. "Can you write a sentence that works like this one?"' },
        { step: 'Day 4: Invitation to Celebrate', detail: 'Students share their sentences. Display strong examples. "Look how you used a comma before the conjunction, just like the author!"' },
        { step: 'Day 5: Invitation to Apply', detail: 'Students find or use the pattern in their own writing. Transfer from practice to authentic application.' },
      ],
      example: 'Mentor sentence: "Although the rain poured down, the children played outside." Day 1: Notice the comma, the word "although." Day 2: Compare with "Because the dog barked loudly, the baby woke up." Day 3: Write your own "Although/Because ___, ___." Day 4: Share.',
    },
    { name: 'Subject-Verb Agreement', what: 'Making verb form match subject in number.', why: 'Does not exist in Korean. Requires constant, long-term reinforcement. Often the last grammar pattern Korean ELLs master.',
      howToTeach: [
        { step: 'Physical drill', detail: 'Point to one student: "She runs." Two: "They run." Fast-paced, 2 minutes daily.' },
        { step: 'Third-person -s focus', detail: 'He/she/it + verb-s. "She walks. He talks. It rains." Daily practice with high-frequency verbs.' },
        { step: 'Noticing in text', detail: '"The author wrote she walks. Why walks and not walk?" Build awareness through reading first.' },
        { step: 'Editing practice', detail: '"The dogs runs fast" → "The dogs run fast." Start obvious, increase subtlety.' },
      ],
      koreanNote: 'THE most persistent error for Korean ELLs. No equivalent in Korean. Correct gently and consistently over years.', ccss: 'L.1.1, L.2.1, L.3.1',
    },
    { name: 'Articles (a, an, the)', what: 'Using determiners correctly before nouns.', why: 'Korean has no articles. Single most common grammar error across all proficiency levels.',
      howToTeach: [
        { step: 'Pointing test', detail: 'Can point to specific thing → "the." Any one → "a/an." Practice with classroom objects.' },
        { step: 'First mention vs. known', detail: 'First time: "I saw a dog." Known/second mention: "The dog was big."' },
        { step: 'Exposure over rules', detail: 'Too many rules to memorize. Highlight in reading. Acquisition happens through massive exposure.' },
        { step: 'Accept imperfection', detail: 'Article mastery may never be 100% for Korean speakers. Focus on high-impact patterns, not perfection.' },
      ],
      koreanNote: 'No articles in Korean. "I saw dog" is correct Korean grammar. Not carelessness — fundamental L1 difference.',
    },
    { name: 'Sentence Combining', what: 'Merging simple sentences into compound/complex sentences.', why: 'Research shows sentence combining is one of the most effective writing improvement strategies. Builds sophistication through practice.',
      howToTeach: [
        { step: 'Coordinating conjunctions (FANBOYS)', detail: 'For, and, nor, but, or, yet, so. "The dog is big. The dog is friendly." → "The dog is big and friendly." OR "The dog is big, but it is friendly."' },
        { step: 'Subordinating conjunctions', detail: 'Because, although, when, while, if, since, unless. "I stayed inside. It was raining." → "I stayed inside because it was raining." OR "Because it was raining, I stayed inside."' },
        { step: 'Daily practice', detail: 'Give two simple sentences. Students combine in 2-3 different ways. Compare: which sounds best for the meaning?' },
        { step: 'Mentor text connection', detail: '"Look at this sentence the author wrote. Can you find the two ideas she combined? What word connected them?"' },
      ],
      example: '"The cat sat on the mat. The cat was orange." → "The orange cat sat on the mat." → "The cat, which was orange, sat on the mat."',
    },
    { name: 'Verb Tenses', what: 'Past, present, future forms — correctly and consistently.', why: 'English tense system is complex. Korean marks tense differently. Irregular past requires memorization.',
      howToTeach: [
        { step: 'Timeline visual', detail: 'Past/present/future on the wall. Point to position when discussing events.' },
        { step: 'Regular -ed first', detail: 'walk→walked, play→played. Three pronunciations: /t/ (walked), /d/ (played), /ɪd/ (wanted).' },
        { step: 'Irregular through repetition', detail: 'Daily drill: go→went, see→saw, eat→ate. Songs and games. Focus on 30 most common.' },
        { step: 'Tense consistency in writing', detail: 'Color-code: highlight all verbs, check they match (all past or all present). Tense shifting is very common.' },
      ],
      koreanNote: 'Korean past tense is regular (-았/었다). English irregular forms (go→went) are a major memorization burden. Progressive (-ing) is overused because Korean has a similar structure.',
    },
  ],
  grammarPoints: [
    // ── NOUNS ──
    { category: 'Nouns', term: 'Common Nouns', definition: 'General names for people, places, things, or ideas. Not capitalized.', examples: ['dog', 'school', 'teacher', 'city'], teachingTip: 'Start with concrete nouns students can see and touch. Label everything in the classroom.', difficulty: 'basic' },
    { category: 'Nouns', term: 'Proper Nouns', definition: 'Specific names for particular people, places, organizations, or things. Always capitalized.', examples: ['Korea', 'Mrs. Park', 'Daewoo Elementary', 'January'], teachingTip: 'Teach capitalization as the "name test": if it is someone\'s or something\'s specific name, capitalize. Daily editing practice: find the proper nouns and fix capitals.', difficulty: 'basic' },
    { category: 'Nouns', term: 'Plural Nouns (Regular)', definition: 'More than one. Add -s or -es. Spelling rules for -ies, -ves, -es.', examples: ['cats', 'boxes', 'babies', 'wolves'], teachingTip: 'Korean does not mark plurals on nouns (the number word handles it). Students will omit -s consistently. Daily practice: "one cat, two ___."', koreanNote: 'Korean plurals are optional and rarely used. "Cat three" is grammatical. Plural -s must be explicitly drilled.', difficulty: 'basic' },
    { category: 'Nouns', term: 'Irregular Plural Nouns', definition: 'Plurals that do not follow the -s/-es pattern.', examples: ['children', 'mice', 'teeth', 'people', 'feet', 'sheep'], teachingTip: 'Must be memorized. Focus on the most common ones. Create flashcard pairs: child/children, mouse/mice. Test weekly.', difficulty: 'intermediate' },
    { category: 'Nouns', term: 'Possessive Nouns', definition: 'Show ownership. Singular: add \'s. Plural ending in s: add \' only.', examples: ['the dog\'s bone', 'the girls\' room', 'the children\'s toys'], teachingTip: 'Korean uses a particle (의) for possession. The apostrophe concept is unfamiliar. Teach: "Whose bone? The dog\'s. The apostrophe-s shows it belongs to the dog."', koreanNote: 'Korean possession particle 의 comes AFTER the owner (개의 뼈 = dog-of bone). English \'s comes after the owner too, so the concept transfers — just the symbol is new.', difficulty: 'intermediate' },
    { category: 'Nouns', term: 'Collective Nouns', definition: 'Words for groups of people, animals, or things treated as a single unit.', examples: ['team', 'family', 'flock', 'class', 'group', 'herd'], teachingTip: 'These take singular verbs in American English: "The team IS winning" not "The team ARE winning." Fun to teach: a pride of lions, a school of fish, a murder of crows.', difficulty: 'intermediate' },
    { category: 'Nouns', term: 'Abstract Nouns', definition: 'Names for things you cannot see, touch, or physically experience — ideas, feelings, qualities, concepts.', examples: ['freedom', 'happiness', 'courage', 'education', 'friendship', 'honesty'], teachingTip: 'Very challenging for ELLs because they cannot be pointed to or drawn easily. Teach through context and contrast: "You can\'t hold happiness, but you feel it." Connect to morphology: happy → happiness, friend → friendship.', koreanNote: 'Korean abstract nouns are often Sino-Korean compounds. Connect: education = 교육, freedom = 자유. These cognate bridges help enormously.', difficulty: 'advanced' },
    { category: 'Nouns', term: 'Count vs. Non-Count Nouns', definition: 'Count: can be numbered (a book, three books). Non-count (mass): cannot be numbered (water, information, homework).', examples: ['Count: apple, chair, idea', 'Non-count: water, rice, homework, information, advice, furniture'], teachingTip: 'Non-count nouns do NOT use "a/an" or add "-s." Students say "I need informations" or "a homework." Teach: "much water" not "many waters." Provide a reference list of common non-count nouns.', koreanNote: 'Korean does not have a count/non-count distinction. All nouns behave the same way grammatically. This is invisible to Korean students and must be explicitly taught.', difficulty: 'advanced' },

    // ── PRONOUNS ──
    { category: 'Pronouns', term: 'Subject Pronouns', definition: 'Replace the subject of a sentence: I, you, he, she, it, we, they.', examples: ['She is my teacher.', 'They play soccer.', 'We are happy.'], teachingTip: 'Korean drops pronouns when the subject is understood from context. Students write "Is happy" or "Went to school." Always check: does every sentence have a subject?', koreanNote: 'Korean is a pro-drop language — subjects are routinely omitted. Students must learn that English requires an explicit subject in almost every sentence.', difficulty: 'basic' },
    { category: 'Pronouns', term: 'Object Pronouns', definition: 'Replace the object: me, you, him, her, it, us, them.', examples: ['Give it to me.', 'I saw her.', 'Tell them.'], teachingTip: 'Students confuse subject/object: "Me went to school" or "I gave it to she." Pair practice: "Who? She. Gave to? Her."', difficulty: 'intermediate' },
    { category: 'Pronouns', term: 'Possessive Pronouns & Adjectives', definition: 'Show ownership. Adjectives: my, your, his, her, its, our, their. Pronouns: mine, yours, his, hers, ours, theirs.', examples: ['This is my book. / This book is mine.', 'That is their car. / That car is theirs.'], teachingTip: 'Common confusion: "it\'s" (it is) vs. "its" (possessive). Also his/her confusion since Korean does not mark gender in pronouns.', koreanNote: 'Korean third-person pronoun 그 does not distinguish gender. He/she confusion is extremely common.', difficulty: 'intermediate' },
    { category: 'Pronouns', term: 'Reflexive Pronouns', definition: 'Refer back to the subject: myself, yourself, himself, herself, itself, ourselves, themselves.', examples: ['I made it myself.', 'She taught herself to read.', 'They introduced themselves.'], teachingTip: 'Teach pattern: my+self, your+self, him+self, her+self, our+selves, them+selves. Common error: "theirselves" (not a word).', difficulty: 'advanced' },

    // ── VERBS ──
    { category: 'Verbs', term: 'Action Verbs', definition: 'Show physical or mental action: run, think, eat, believe, write.', examples: ['She runs every morning.', 'He thinks about the problem.', 'They ate lunch.'], teachingTip: 'Start with physical actions (TPR: jump, clap, write). Then teach mental actions: think, believe, know, understand, remember.', difficulty: 'basic' },
    { category: 'Verbs', term: 'Linking Verbs (Be Verbs)', definition: 'Connect the subject to a description or identity: am, is, are, was, were, become, seem, appear.', examples: ['She is tall.', 'They are students.', 'He became a teacher.'], teachingTip: 'Korean does not use "be" the same way. Students omit it: "She tall" or "They students." Drill: every description needs a "be" verb. "She IS tall. They ARE students."', koreanNote: 'Korean copula 이다 is used differently and often omitted in casual speech. Students will consistently omit be-verbs.', difficulty: 'basic' },
    { category: 'Verbs', term: 'Helping/Auxiliary Verbs', definition: 'Used with main verbs to form tenses, questions, negatives: do, does, did, have, has, had, will, would, can, could, may, might, shall, should, must.', examples: ['She does not like it.', 'I have eaten.', 'They will go.', 'Can you help?'], teachingTip: 'Korean forms questions and negatives without auxiliaries. "Do you like?" structure is not intuitive. Teach question formation with do/does/did explicitly.', koreanNote: 'Korean negation uses 안/못 before the verb or -지 않다 after. English do-support for negation and questions is completely unfamiliar.', difficulty: 'intermediate' },
    { category: 'Verbs', term: 'Modal Verbs', definition: 'Express possibility, ability, permission, obligation: can, could, may, might, will, would, shall, should, must, ought to.', examples: ['She can swim.', 'You should study.', 'They must leave.', 'It might rain.'], teachingTip: 'Modals never change form (no -s, -ed, -ing). Teach meaning distinctions: can (ability) vs. may (permission) vs. must (obligation) vs. might (possibility).', difficulty: 'advanced' },
    { category: 'Verbs', term: 'Irregular Past Tense', definition: 'Verbs that do not add -ed for past tense and must be memorized.', examples: ['go→went', 'see→saw', 'eat→ate', 'come→came', 'make→made', 'take→took'], teachingTip: 'Group by pattern: ring/sang/drink (i→a), blow/grow/know (ow→ew), teach/catch/buy (no pattern — just memorize). Daily flashcard drill with the 30 most common.', difficulty: 'intermediate' },

    // ── ADJECTIVES & ADVERBS ──
    { category: 'Adjectives', term: 'Descriptive Adjectives', definition: 'Words that describe nouns: size, shape, color, number, opinion, material.', examples: ['the big red ball', 'a beautiful old house', 'three small kittens'], teachingTip: 'Teach adjective ORDER for advanced students: opinion-size-age-shape-color-origin-material-purpose (OSASCOMP). "A beautiful small old round red Korean wooden mixing bowl." Native speakers feel this intuitively; ELLs need the rule.', difficulty: 'basic' },
    { category: 'Adjectives', term: 'Comparative & Superlative', definition: 'Comparing two things (-er/more) or identifying the extreme (-est/most).', examples: ['bigger, biggest', 'more beautiful, most beautiful', 'better, best', 'worse, worst'], teachingTip: 'Rules: 1-syllable → -er/-est. 2+ syllables → more/most. Irregulars: good-better-best, bad-worse-worst. Practice with real comparisons: "Who is taller?"', koreanNote: 'Korean uses 더 (more) and 가장 (most) similarly. The concept transfers; the forms do not.', difficulty: 'intermediate' },
    { category: 'Adverbs', term: 'Adverbs', definition: 'Modify verbs, adjectives, or other adverbs. Often (not always) end in -ly. Tell how, when, where, how often.', examples: ['She runs quickly.', 'He is very tall.', 'They always arrive early.', 'She carefully opened the box.'], teachingTip: 'Start with -ly adverbs: slow→slowly, quiet→quietly. Then teach exceptions: fast, hard, well, always, never, sometimes. Position varies: "She quickly ran" = "She ran quickly."', difficulty: 'intermediate' },

    // ── PREPOSITIONS ──
    { category: 'Prepositions', term: 'Prepositions of Place', definition: 'Show location: in, on, at, under, behind, between, next to, above, below, near, beside.', examples: ['The book is on the table.', 'She sat between two friends.', 'The cat is under the bed.'], teachingTip: 'Use physical objects: "Put the pencil ON the book. Now put it UNDER the book." TPR-based. Daily practice because Korean uses particles (에, 위에, 아래에) differently.', koreanNote: 'Korean postpositions come AFTER the noun (책 위에 = book on-top-of). English prepositions come BEFORE. This reversal causes persistent errors.', difficulty: 'basic' },
    { category: 'Prepositions', term: 'Prepositions of Time', definition: 'Show when: in (months/years), on (days/dates), at (specific times).', examples: ['in January', 'on Monday', 'at 3 o\'clock', 'in the morning', 'on my birthday'], teachingTip: 'The in/on/at rules feel arbitrary to ELLs. Teach the container metaphor: IN = big containers (months, years), ON = surfaces/specific days, AT = precise points (times).', difficulty: 'intermediate' },
    { category: 'Prepositions', term: 'Prepositional Phrases', definition: 'A preposition + its object (and any modifiers). Functions as an adjective or adverb in the sentence.', examples: ['The girl with the red hat smiled. (describes girl)', 'He ran across the field. (tells where)', 'During the storm, we stayed inside. (tells when)'], teachingTip: 'Teach students to find prepositional phrases by asking: does it tell WHERE, WHEN, or WHICH ONE? Advanced: identify whether the phrase is acting as an adjective (describes a noun) or adverb (describes a verb).', difficulty: 'advanced' },

    // ── CONJUNCTIONS ──
    { category: 'Conjunctions', term: 'Coordinating Conjunctions (FANBOYS)', definition: 'Connect equal parts: For, And, Nor, But, Or, Yet, So. Used between words, phrases, or independent clauses.', examples: ['I like cats and dogs.', 'She is tired, but she keeps working.', 'It rained, so we stayed inside.'], teachingTip: 'Comma rule: use a comma before FANBOYS only when connecting two complete sentences. "I like cats and dogs" (no comma). "I like cats, and she likes dogs" (comma — two complete sentences).', difficulty: 'intermediate' },
    { category: 'Conjunctions', term: 'Subordinating Conjunctions', definition: 'Connect a dependent clause to an independent clause, showing relationship: because, although, when, while, if, since, unless, before, after, until.', examples: ['Because it rained, we stayed inside.', 'She smiled although she was sad.', 'If you study, you will pass.'], teachingTip: 'Comma rule: if the dependent clause comes FIRST, use a comma. If it comes second, usually no comma. "Because it rained, we stayed." vs. "We stayed because it rained."', difficulty: 'advanced' },
    { category: 'Conjunctions', term: 'Correlative Conjunctions', definition: 'Pairs that work together: both...and, either...or, neither...nor, not only...but also, whether...or.', examples: ['Both the teacher and the students laughed.', 'Either you study or you fail.', 'She is not only smart but also kind.'], teachingTip: 'For advanced writers (Snapdragon level). These add sophistication. Practice with sentence patterns: "Not only did she ___, but she also ___."', difficulty: 'advanced' },

    // ── CLAUSES & SENTENCE STRUCTURE ──
    { category: 'Clauses & Sentences', term: 'Independent Clause', definition: 'A group of words with a subject and verb that expresses a complete thought. Can stand alone as a sentence.', examples: ['The dog barked.', 'She finished her homework.', 'Rain fell all morning.'], teachingTip: 'The foundational building block. Every sentence must have at least one independent clause. If it does not express a complete thought, it is a fragment.', difficulty: 'basic' },
    { category: 'Clauses & Sentences', term: 'Dependent (Subordinate) Clause', definition: 'Has a subject and verb but CANNOT stand alone — it depends on an independent clause. Begins with a subordinating conjunction or relative pronoun.', examples: ['because it was raining (WHY — cannot stand alone)', 'when the bell rang (WHEN)', 'who lives next door (WHICH)'], teachingTip: 'The fragment test: read it aloud by itself. Does it sound complete? "Because it was raining." — you are left waiting for more. That means it is dependent.', difficulty: 'intermediate' },
    { category: 'Clauses & Sentences', term: 'Relative Clauses', definition: 'A type of dependent clause that describes a noun, introduced by who, which, that, whom, whose.', examples: ['The girl who sits next to me is funny.', 'The book that I read was great.', 'Dogs, which are loyal, make good pets.'], teachingTip: 'Who = people. Which = things (with commas for extra info). That = things (no commas, essential info). Advanced Snapdragon skill. Model in mentor sentences before expecting production.', difficulty: 'advanced' },
    { category: 'Clauses & Sentences', term: 'Simple Sentence', definition: 'One independent clause. May have compound subjects or verbs but only one clause.', examples: ['The cat sat on the mat.', 'Tom and Jerry ran and played.'], teachingTip: 'Where all students start. Ensure every student can write complete simple sentences before pushing for compound/complex. Sentence = subject + verb + complete thought.', difficulty: 'basic' },
    { category: 'Clauses & Sentences', term: 'Compound Sentence', definition: 'Two independent clauses joined by a coordinating conjunction (FANBOYS) with a comma.', examples: ['The sun was shining, and the birds were singing.', 'She studied hard, but she did not pass.'], teachingTip: 'The comma-FANBOYS pattern. Practice with sentence combining: give two simple sentences, students join with comma + conjunction.', difficulty: 'intermediate' },
    { category: 'Clauses & Sentences', term: 'Complex Sentence', definition: 'One independent clause + one or more dependent clauses joined by a subordinating conjunction.', examples: ['Although it was cold, they played outside.', 'She left when the movie ended.'], teachingTip: 'The subordinator signals the dependent clause. Practice: given two ideas, students choose a subordinator that shows the right relationship (because, although, when, if).', difficulty: 'advanced' },
    { category: 'Clauses & Sentences', term: 'Compound-Complex Sentence', definition: 'Two or more independent clauses AND at least one dependent clause. The most sophisticated sentence type.', examples: ['Although it rained, we went outside, and we had fun.', 'When the bell rang, she grabbed her bag, but she forgot her lunch.'], teachingTip: 'Snapdragon-level skill. Model in mentor texts. Students identify the clauses first, then try constructing their own. This is an aspirational goal — celebrate when students achieve it.', difficulty: 'advanced' },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Words and phrases. May follow Korean SOV order.', support: 'Basic SVO patterns. Accept errors, model correct forms.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Simple sentences with frequent errors. Beginning tenses. Omits articles, -s, agreement.', support: 'Recast errors. Daily sentence writing. One grammar target at a time.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Complete sentences mostly. Past/present with some accuracy. Compound sentences.', support: 'Sentence combining. Editing checklists. Grammar from student writing patterns.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Complex sentences. Agreement mostly accurate. Variety of tenses. Persistent article errors.', support: 'Mentor sentences. Advanced punctuation. Grammar for voice and style.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Near native-like. Occasional article/preposition errors. Self-edits.', support: 'Style and register. Address fossilized errors through awareness.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Single words, short phrases. May use Korean word order. No sentence structure yet.', level2: 'Simple SVO sentences with support. "I like ___." Common nouns and verbs.', level3: 'Complete simple sentences. Beginning plurals and past tense. Capital/period.', level4: 'Compound sentences with "and." Subject-verb agreement developing.', level5: 'Varied simple and compound sentences. Basic conventions consistent.' },
    { grade: '2', level1: 'Phrases and simple SVO with support. Omits articles, be-verbs, plurals.', level2: 'Simple sentences independently. Beginning past tense. Some compound with "and, but."', level3: 'Consistent simple sentences. Regular past tense. Compound sentences. Basic editing.', level4: 'Beginning complex sentences (because, when). Agreement mostly accurate.', level5: 'Varied sentence types. Consistent conventions. Self-edits for common errors.' },
    { grade: '3', level1: 'Simple SVO sentences with heavy support. Missing many grammar markers.', level2: 'Simple and compound sentences. Past tense developing. Articles inconsistent.', level3: 'Compound sentences consistent. Beginning complex (because, when, if). Editing with checklist.', level4: 'Complex sentences developing. Relative clauses beginning. Consistent tense in writing.', level5: 'Varied sentence types. Complex sentences with commas. Near-accurate conventions.' },
    { grade: '4', level1: 'Simple sentences with support. Errors in agreement, tense, articles throughout.', level2: 'Simple/compound sentences. Tenses inconsistent. Basic punctuation developing.', level3: 'Complex sentences with common subordinators. Sentence combining practice. Self-editing.', level4: 'Varied complex sentences. Correct comma usage. Consistent tense. Some relative clauses.', level5: 'Sophisticated sentence variety. Compound-complex attempts. Near-native conventions.' },
    { grade: '5', level1: 'Simple/compound sentences with support. Many agreement and tense errors.', level2: 'Compound sentences. Developing complex with because/when. Tense consistency improving.', level3: 'Complex sentences across subordinator types. Sentence variety growing. Punctuation mostly accurate.', level4: 'Compound-complex sentences. Relative clauses. Advanced punctuation. Strong self-editing.', level5: 'Full range of sentence types. Sophisticated grammar for voice. Conventions are a strength.' },
  ],
  interventionSignals: [
    { signal: 'Only words/phrases after 6+ months', whatToDo: 'Increase low-risk speaking: sentence frames, partner talk, choral response. Check if it is an extended silent period (normal up to 3 months).' },
    { signal: 'No sentence boundaries in writing', whatToDo: 'Teach explicitly: sentence = capital + subject + verb + period. Daily sentence dictation.' },
    { signal: 'Persistent errors after targeted instruction', whatToDo: 'May be fossilized. Write error and correction side by side. Self-editing checklists. Expect this to take significant time.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Language Standards. Writing assessments capture grammar alongside content.',
}


// ═══════════════════════════════════════════════════════════════════
// 7. WRITING — massively expanded with RACES, joint writing, daily routines, Gallagher
// ═══════════════════════════════════════════════════════════════════

export const WRITING: GuideSection = {
  id: 'writing', title: 'Writing', icon: 'PencilLine',
  subtitle: 'Process writing, genre development, and building written expression for ELLs',
  overview: {
    what: 'Writing instruction covers process (planning, drafting, revising, editing, publishing), genre development (narrative, informational, opinion/argument), and sentence-level skills. For ELLs, writing is the hardest domain — requiring simultaneous control of content, organization, vocabulary, grammar, and conventions.',
    whyItMatters: 'Kelly Gallagher: students need to write for real purposes. Jeff Anderson\'s Patterns of Power teaches grammar through mentor sentences in writing context. Tan Huynh: oral rehearsal before writing reduces cognitive load. Writing about texts improves comprehension more than answering questions about them.',
    researchBase: 'Graham & Perin (2007) "Writing Next"; Kelly Gallagher "Write Like This"; Jeff Anderson "Patterns of Power"; Tan Huynh; Calkins.',
    bigIdea: 'Writing is thinking made visible. For ELLs, scaffolded instruction builds both language and content understanding simultaneously.',
  },
  developmentalProgression: [
    { name: 'Drawing & Labeling', description: 'Ideas through pictures with labels. Entry point for beginning ELLs.', difficulty: 'foundational', gradeRange: 'K to Gr 1', activities: ['Draw and label', 'Dictated writing: student tells, teacher scribes', 'Interactive writing: share the pen'] },
    { name: 'Sentence Writing', description: 'Complete sentences using frames for support.', difficulty: 'foundational', gradeRange: 'K to Gr 2', activities: ['Frames: "I see a ___." "I like ___ because ___."', 'Daily journal', 'Sentence expansion: 3 words then add details'] },
    { name: 'Paragraph Writing', description: 'Topic sentence, details, closing.', difficulty: 'intermediate', gradeRange: 'Gr 1 to 3', activities: ['Hamburger model', 'Transition words', 'Shared writing before independent'] },
    { name: 'Multi-Paragraph & Genre', description: 'Organized essays in 3 genres.', difficulty: 'advanced', gradeRange: 'Gr 3 to 5', activities: ['Genre-specific organizers', 'Mentor text analysis', 'Full writing process cycle'] },
  ],
  milestones: [
    { grade: 'K', expectations: 'Draws and labels. Simple sentences with support.', assessHow: 'Writing samples.' },
    { grade: '1-2', expectations: 'Multiple sentences. Basic conventions. All 3 genres with support.', assessHow: 'Writing rubric. Portfolio.' },
    { grade: '3-5', expectations: 'Multi-paragraph. Revises own work. 3 genres with independence.', assessHow: 'Genre rubrics. Process portfolio.' },
  ],
  skills: [
    { name: 'RACES Writing Strategy', what: 'Restate the question, Answer it, Cite evidence, Explain the evidence, Summarize.', why: 'Gives ELLs a repeatable structure for constructed responses. More detailed than ACE — Restate ensures they address the question, Summarize provides closure.',
      howToTeach: [
        { step: 'R - Restate', detail: 'Turn the question into your opening statement. Use words from the question. Q: "Why did she leave?" R: "The character left because..."' },
        { step: 'A - Answer', detail: 'Answer directly. No vague statements. "She left because she was afraid of the storm."' },
        { step: 'C - Cite', detail: 'Specific text evidence with quotation marks. "The text says, \'Her hands trembled as thunder shook the windows.\'"' },
        { step: 'E - Explain', detail: 'Tell HOW the evidence proves your answer. "This shows fear because trembling is a physical sign of being scared."' },
        { step: 'S - Summarize', detail: 'Restate your answer differently. "Therefore, she left because the storm frightened her."' },
      ],
      example: 'Q: Why is exercise important? R: "Exercise is important for several reasons." A: "It keeps bodies healthy." C: "The article states children who exercise daily have stronger hearts." E: "This shows exercise directly improves health." S: "Therefore, exercise is essential."',
    },
    { name: 'Joint / Shared / Interactive Writing Continuum', what: 'Three collaborative writing levels moving from most to least teacher control: shared (teacher writes) → interactive (share pen) → guided (students write, teacher supports).', why: 'Scaffolds the gap between "I cannot write" and independent writing.',
      howToTeach: [
        { step: 'Shared Writing', detail: 'TEACHER holds the pen and writes on chart paper while thinking aloud. Students contribute ideas verbally. Teacher models every decision: "What should we write next? Watch how I spell that. I need a period here because..." Use for modeling new genres or skills.' },
        { step: 'Interactive Writing', detail: 'Teacher and students take turns writing. Teacher writes hard parts; students write what they can (known words, sounds). Best for K-1. Builds the phonics-to-writing connection. "You write the, you know that word. I will write because — that is tricky."' },
        { step: 'Guided Writing', detail: 'Students write independently while teacher circulates and conferences. Teacher gives on-the-spot mini-lessons: "I see you need a period here." "Can you add more detail to this sentence?" This is the daily practice mode.' },
        { step: 'Strategic use', detail: 'Monday: shared writing to model the skill. Tuesday: interactive writing to practice together. Wed-Fri: guided independent writing with conferences. Move students along the continuum.' },
      ],
    },
    { name: 'Daily Writing Routines (Building Writing Into Every Day)', what: 'Short, frequent writing embedded throughout the day.', why: 'Writing stamina is built through daily practice, not occasional long assignments. Kelly Gallagher: write frequently to become a better writer.',
      howToTeach: [
        { step: 'Morning Message / Daily Edit (5 min)', detail: 'Write a message with 2-3 intentional errors. Students find and fix them. "today is monday. we will go too the libary." Builds conventions and editing habits. Rotate error types: spelling, capitalization, punctuation, grammar.' },
        { step: 'Quick Write / Free Write (5-10 min)', detail: 'Timer set. Write without stopping — do not worry about spelling or grammar. Just get ideas flowing. Open topic or prompted. Build from 3 min to 10 min. "Keep your pencil moving the whole time."' },
        { step: 'Journal / Learning Log (5-10 min)', detail: '"What did I learn today?" "What am I thinking about?" Low-stakes, high-frequency. Allow drawing for WIDA 1-2. Do not grade grammar in journals.' },
        { step: 'Exit Ticket Writing (3-5 min)', detail: 'End of lesson: "Write one thing you learned" or "Answer this question." Quick assessment + writing practice. Collect and review for formative data.' },
        { step: 'Content-Area Writing', detail: 'Math: "Explain how you solved this." Science: "What do you predict and why?" Social Studies: "Compare these two events." Writing across subjects multiplies practice time without taking from ELA.' },
        { step: 'Article of the Week (Gallagher)', detail: 'Weekly current event article. Students annotate, write a brief response. Builds reading, writing, critical thinking, and background knowledge simultaneously. 15-20 minutes per week.' },
      ],
      example: 'Daily total: Morning edit (5) + Quick write (8) + Science log (5) + Math explanation (5) + Exit ticket (3) = ~26 minutes of writing across the day.',
    },
    { name: 'Process Writing (Full Cycle)', what: 'Plan → Draft → Revise → Edit → Publish.', why: 'Good writing IS rewriting. Process instruction works better than just grading final products.',
      howToTeach: [
        { step: 'Plan', detail: 'Graphic organizers, brainstorming, oral rehearsal. Tan Huynh: "Tell your partner what you will write before you write it." Planning is talking first.' },
        { step: 'Draft', detail: '"Write fast, fix later." Separate creating from correcting. Crossed-out words = good, they show thinking.' },
        { step: 'Revise (CONTENT — not grammar)', detail: 'Revision is NOT editing. Add detail. Delete confusion. Move paragraphs. Change weak words. "Did I include enough? Is the order logical? Will readers understand?"' },
        { step: 'Edit (CONVENTIONS)', detail: 'After content is solid: capitals, periods, spelling, grammar. Use checklists. Edit for ONE thing at a time — not everything at once.' },
        { step: 'Publish and celebrate', detail: 'Final copy: typed, illustrated, displayed. Share with audience. Publishing gives purpose to the hard work.' },
      ],
    },
    { name: 'Scaffolded Writing by WIDA Level', what: 'Matching supports to proficiency with gradual release.', why: 'ELLs cannot produce language they have not internalized. Scaffolds are temporary bridges.',
      howToTeach: [
        { step: 'WIDA 1: Maximum support', detail: 'Sentence frames + word banks. Fill-in-the-blank paragraphs. Dictated writing. Drawing with labels. Accept L1. Goal: ideas on paper in ANY form.' },
        { step: 'WIDA 2: Heavy support', detail: 'Paragraph frames with transitions provided. Pre-filled graphic organizers. Visual word banks. Sentence starters for each paragraph.' },
        { step: 'WIDA 3: Moderate support', detail: 'Blank genre templates. Mentor sentences to imitate. Academic word banks. Peer writing partners.' },
        { step: 'WIDA 4-5: Light to minimal', detail: 'Planning tools available but optional. Self-editing checklists. Peer revision. Focus shifts to craft: voice, word choice, style.' },
      ],
    },
    { name: 'Opinion/Argument Writing (OREO Structure)', what: 'Opinion, Reasons, Examples/Evidence, Opinion restated.', why: 'CCSS requires opinion from Gr 1. OREO gives a memorable structure.',
      howToTeach: [
        { step: 'O - State opinion clearly', detail: '"I believe ___." "Schools should/should not ___." State it first.' },
        { step: 'R - Reasons (2-3)', detail: 'Each gets its own paragraph. "First... Second... Finally..." Answer WHY.' },
        { step: 'E - Examples/Evidence', detail: 'Each reason needs proof. Personal experience, facts, statistics, text quotes.' },
        { step: 'O - Restate in conclusion', detail: 'Reword opening. Add call to action. "For these reasons, I believe..."' },
      ],
      example: 'O: "Our school should have a garden." R1+E1: "Gardens teach science — students observe plant growth." R2+E2: "Fresh vegetables are healthy — studies show students eat more veggies they grew." O: "A garden would help students learn and eat better."',
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Draws with labels. Copies. Single words/phrases.', support: 'Accept drawing. Frames. Dictation. Grade ideas, not grammar.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Simple sentences with support. Many errors but communicates.', support: 'Frames. Word banks. Daily journal. Content focus.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Paragraphs. Transitions. Beginning genres.', support: 'Organizers. Mentor texts. Peer partners.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Multi-paragraph. Academic vocab. All genres.', support: 'Voice and style. Revision. Genre rubrics.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Organized, varied sentences. Revises independently.', support: 'Craft. Audience. Convention polish.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Draws and labels. Copies words. Dictates sentences to teacher.', level2: '1-2 sentences with frames. Labels drawings.', level3: '3-5 sentences. Beginning/middle/end with support.', level4: 'Short paragraphs. Writes in genres with support.', level5: 'Multiple paragraphs. Basic structure in all genres.' },
    { grade: '2', level1: 'Simple sentences with frames. Drawing + writing combined.', level2: '3-5 sentences. Uses "and/because." Daily journal developing.', level3: 'Paragraphs with topic + details. Transitions. Opinion/narrative.', level4: 'Multi-paragraph. RACES with support. Self-edits basics.', level5: 'Organized multi-paragraph in genres. Voice developing.' },
    { grade: '3', level1: 'Sentences with heavy support. Drawing + dictation still needed.', level2: 'Paragraphs with organizers. Basic transitions. Opinion frames.', level3: 'Multi-paragraph with support. RACES responses. Informational developing.', level4: 'Organized essays. Evidence. Revises content. Growing voice.', level5: 'Well-developed essays. Evidence. Self-revises. Approaching grade level.' },
    { grade: '4', level1: 'Paragraphs with scaffolds. Frames and word banks essential.', level2: 'Structured paragraphs. Basic RACES/OREO. Informational with support.', level3: 'Multi-paragraph all genres. Evidence from text. Paragraph transitions.', level4: 'Well-organized essays. Counterargument. Research developing. Strong revision.', level5: 'Sophisticated essays. Voice and style. Precise vocabulary.' },
    { grade: '5', level1: 'Paragraphs with scaffolds. Idea development before conventions.', level2: 'Multi-paragraph attempts. Basic argument. Growing stamina.', level3: 'Solid multi-paragraph. Evidence-based arguments. Source use.', level4: 'Strong essays with voice. Synthesizes sources. Complex arguments.', level5: 'Grade-level writing. Sophisticated arguments. Multiple sources.' },
  ],
  interventionSignals: [
    { signal: 'Refuses to write or produces nothing', whatToDo: 'Remove barriers. Accept drawing. Frame + word bank. Dictation. Ideas on paper in any form.' },
    { signal: 'Only 1-2 sentences after months', whatToDo: 'Build stamina: "Today write 3." Timer (5 min nonstop). Who/what/where/when/why prompts generate more content.' },
    { signal: 'Ideas present but incomprehensible grammar/spelling', whatToDo: 'Do NOT punish ideas for poor conventions. Grade separately. One grammar target per piece, not everything.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Writing domain. Writing rubrics in Grading Tools. Sentence Patterns provides WIDA-leveled frames.',
}


// ═══════════════════════════════════════════════════════════════════
// 8. SPEAKING — protocols fully defined
// ═══════════════════════════════════════════════════════════════════

export const SPEAKING: GuideSection = {
  id: 'speaking', title: 'Speaking', icon: 'Mic',
  subtitle: 'Oral language development, academic discussion, and presentation skills',
  overview: {
    what: 'Speaking instruction develops oral English from conversation to academic discussion and presentations. Creates STRUCTURED talk opportunities rather than relying on immersion alone.',
    whyItMatters: 'Oral language is the foundation for literacy. Cult of Pedagogy: structured academic talk is one of the highest-impact techniques. Tan Huynh: oral rehearsal before writing improves output. Swain: students need output practice, not just input.',
    researchBase: 'Cult of Pedagogy; Krashen (1982); Swain (1985); Gibbons (2002); Tan Huynh.',
    bigIdea: 'Students learn to speak by speaking — but they need structured opportunities, safe environments, and explicit academic language to grow beyond social conversation.',
  },
  developmentalProgression: [
    { name: 'Social Language (BICS)', description: 'Greetings, questions, needs, casual conversation. Develops in 1-3 years.', difficulty: 'foundational', gradeRange: 'K to Gr 2 or initial months', activities: ['Morning greetings', 'Partner interviews', 'Show and tell with stems'] },
    { name: 'Academic Language (CALP)', description: 'Explaining, comparing, analyzing, justifying. Takes 5-7 years.', difficulty: 'intermediate', gradeRange: 'Gr 1 to 5', activities: ['Accountable Talk stems', 'Think-pair-share with academic frames', 'Structured controversy'] },
    { name: 'Presentation', description: 'Organized oral presentations and extended discourse.', difficulty: 'advanced', gradeRange: 'Gr 2 to 5', activities: ['Book talks', 'Science explanations', 'Debate'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Participates. Asks/answers questions. Describes familiar topics.', assessHow: 'Observation. Partner conversation rubric.' },
    { grade: '2-3', expectations: 'Recounts with details. Complete sentences. Audio recordings.', assessHow: 'Presentation rubric. Recorded samples.' },
    { grade: '4-5', expectations: 'Reports with facts. Formal/informal register. Supports opinions.', assessHow: 'Presentation rubric. Discussion checklist.' },
  ],
  skills: [
    { name: 'Think-Pair-Share (Defined)', what: 'A three-step discussion protocol ensuring 100% participation. The most fundamental structured talk routine.', why: 'Unstructured "any questions?" = 3 students talk. Think-Pair-Share = every student thinks, every student talks.',
      howToTeach: [
        { step: 'THINK (10-30 seconds)', detail: 'Teacher asks a question. "Think about this silently. Do not talk yet." Give genuine think time. WIDA 1-2 students need 15-30 seconds; all students benefit from at least 10.' },
        { step: 'PAIR (60-90 seconds)', detail: 'Students turn to a designated partner. "Share your thinking with your partner. Partner A speaks first." Assign A/B to prevent the dominant partner from always going first. Provide a sentence stem.' },
        { step: 'SHARE (1-2 minutes)', detail: 'Selected pairs share with the class. "What did you and your partner discuss?" This is accountability — students know they might be called on to share.' },
        { step: 'Sentence stem required', detail: 'Always provide: "I think ___ because ___." Or "The most important thing about ___ is ___." Stems ensure academic language practice, not just chat.' },
      ],
    },
    { name: 'Fishbowl Discussion (Defined)', what: 'A discussion protocol where a small group (4-6) discusses in an inner circle while the rest of the class observes from an outer circle, then roles switch.', why: 'Allows deep discussion in a small group while the whole class learns from observing. Teaches both speaking AND listening skills.',
      howToTeach: [
        { step: 'Setup', detail: 'Arrange chairs in two circles: inner (4-6 chairs) and outer (rest of class). Inner circle faces each other. Outer circle can see and hear the inner circle.' },
        { step: 'Inner circle discusses', detail: 'Give inner circle a question or text to discuss for 5-8 minutes. They use Accountable Talk stems. Outer circle listens silently and takes notes on what they hear.' },
        { step: 'Outer circle observes with purpose', detail: 'Give outer circle a task: "Write down one thing you agree with and one thing you disagree with." Or "Track who uses evidence to support their point." This keeps observers actively engaged.' },
        { step: 'Switch and repeat', detail: 'After 5-8 minutes, rotate: some outer circle students move in, some inner move out. New group discusses a follow-up question. Multiple rotations ensure many students get inner-circle time.' },
        { step: 'Debrief', detail: '"What did you notice about the discussion? What made it effective? What could be improved?" Teaches metacognition about academic discussion.' },
      ],
    },
    { name: 'Inside-Outside Circles (Defined)', what: 'Students form two concentric circles facing each other. They discuss a prompt, then one circle rotates to create new partnerships.', why: 'High-energy, fast-paced protocol. Every student talks to multiple partners in a short time. Great for review, practice, and building speaking fluency.',
      howToTeach: [
        { step: 'Form circles', detail: 'Half the class forms an inner circle facing out. Other half forms an outer circle facing in. Each student faces a partner.' },
        { step: 'Discuss (60-90 seconds)', detail: 'Teacher poses a question. Partners discuss using a stem. "Tell your partner: What was the main idea of the article?"' },
        { step: 'Rotate', detail: '"Outside circle, move two people to the right." New partners. New question or same question with a new partner. Each rotation = new conversation.' },
        { step: 'Multiple rounds', detail: '3-5 rotations in 10 minutes. Students practice the same language structures with different partners, building fluency and confidence.' },
      ],
    },
    { name: 'Numbered Heads Together (Defined)', what: 'Students work in groups of 4, each assigned a number (1-4). After discussion, teacher calls a random number — that student reports for the group.', why: 'Creates accountability — everyone must be ready to speak because they do not know who will be called. Eliminates the "I will let someone else answer" problem.',
      howToTeach: [
        { step: 'Assign numbers', detail: 'Groups of 4. Each student is 1, 2, 3, or 4. Keep numbers consistent so students know their role.' },
        { step: 'Pose a question', detail: '"Put your heads together and discuss: What are three causes of the American Revolution?" Give 2-3 minutes.' },
        { step: 'Groups discuss', detail: 'ALL members must understand the answer because any number could be called. Strong students help weaker ones prepare.' },
        { step: 'Call a number', detail: '"Number 3s, stand up. Share your group\'s answer." Random selection ensures every student was actively engaged during discussion.' },
      ],
    },
    { name: 'Accountable Talk Stems', what: 'Sentence starters that structure academic discussion language.', why: 'Without stems, ELLs default to informal language or silence. Stems provide the exact language needed for academic discourse.',
      howToTeach: [
        { step: 'Post and teach', detail: 'Display permanently: "I think ___ because ___." "I agree with ___ and want to add ___." "I respectfully disagree because ___." "Can you explain what you mean by ___?" "The evidence shows ___."' },
        { step: 'Model use', detail: 'Teacher uses stems in conversation: "I think this character changed because — look, I am using our stem."' },
        { step: 'Require use', detail: '"For today\'s discussion, I want to hear at least 3 students use the agree/disagree stems."' },
        { step: 'Add stems gradually', detail: 'Start with "I think ___ because ___." Add more as students master each one.' },
      ],
    },
    { name: 'Oral Rehearsal Before Writing (Tan Huynh)', what: 'Verbalizing what you will write before writing it.', why: 'If you can say it, you can usually write it. Oral rehearsal separates idea generation from transcription, reducing cognitive load.',
      howToTeach: [
        { step: 'Tell your partner', detail: '"Turn to your partner and tell them what you are going to write." Partner listens and asks one question. Then write.' },
        { step: 'Record and write', detail: 'Record yourself saying ideas. Listen back. Write what you said. Bridges oral fluency to written output.' },
        { step: 'Teacher conference', detail: '"Tell me what happened." Jot key phrases as student speaks. "Now write what you just told me."' },
        { step: 'Structured oral practice', detail: 'Before opinion paragraph: state opinion, give 2 reasons, explain each to partner — using academic language. Then write.' },
      ],
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Single words, gestures, phrases. Silent period normal.', support: 'Accept non-verbal. TPR. Yes/no first. Bilingual buddy. Do NOT force speaking.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Short phrases, simple sentences. Partner talk with frames.', support: 'Frames for every discussion. Rehearsal time. Small group before whole class.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Complete sentences. Academic discussions with support.', support: 'Push academic language. Accountable Talk stems. 5-7 second wait time.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Detail and elaboration. Debates and presentations.', support: 'Precision and register. Presentation skills. Extended discourse.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Fluent academic contexts. Adjusts register.', support: 'Nuance: persuasion, humor, tone. Confidence for larger audiences.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Single words, gestures. May be in silent period. Repeats modeled phrases.', level2: 'Short phrases. Answers yes/no and either/or. Uses frames: "I see a ___."', level3: 'Simple sentences. Participates in Think-Pair-Share. Describes familiar things.', level4: 'Complete sentences with detail. Partners in discussions. Beginning academic language.', level5: 'Speaks in sentences with expression. Shares ideas in whole group. Age-appropriate fluency.' },
    { grade: '2', level1: 'Words and short phrases. Points, gestures, nods. May repeat peer responses.', level2: 'Simple sentences. Answers questions in phrases. Think-Pair-Share with stems.', level3: 'Participates in structured discussions. Explains thinking with detail. Uses some academic vocab.', level4: 'Accountable Talk independently. Presents to small groups. Self-corrects.', level5: 'Fluent discussion partner. Presents to class. Asks clarifying questions.' },
    { grade: '3', level1: 'Short phrases. Participates in partner talk with heavy support.', level2: 'Simple sentences in discussions. Uses stems with support. Presents 2-3 sentences.', level3: 'Academic discussions with stems. Explains and compares. Book talks with support.', level4: 'Extended discussions. Presents organized information. Debates with evidence.', level5: 'Fluent academic language. Adjusts register. Independent presentations.' },
    { grade: '4', level1: 'Phrases and simple sentences. Partner talk with frames.', level2: 'Structured discussion with stems. Short presentations with support.', level3: 'Academic discussions independently. Presentations with organizer. Cites evidence in talk.', level4: 'Debates and Socratic seminar. Extended oral reports. Formal register developing.', level5: 'Sophisticated academic discourse. Persuades. Adjusts for audience.' },
    { grade: '5', level1: 'Simple sentences. Partner discussions with heavy support.', level2: 'Structured discussions. Beginning academic presentations. Uses evidence with prompting.', level3: 'Independent academic discussions. Organized presentations. Cites evidence.', level4: 'Extended academic discourse. Debates. Research presentations. Formal register.', level5: 'Grade-level academic discourse. Persuasion, nuance, register control.' },
  ],
  interventionSignals: [
    { signal: 'No speech after 3+ months', whatToDo: 'Silent period of 1-3 months is normal. Beyond 3: increase low-risk opportunities. Check anxiety. Bilingual buddy. Consult parents about L1 patterns.' },
    { signal: 'Speaks socially but not academically', whatToDo: 'BICS/CALP gap — normal. Social: 1-3 years. Academic: 5-7. Explicitly teach academic stems and create structured academic talk daily.' },
    { signal: 'Avoids group speaking', whatToDo: 'Build safe to challenging: whisper to partner → small group → whole class. Rehearsal time. Write first, then read aloud.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Speaking & Listening domain. Quick Check for formative participation checks. WIDA profiles set expectations.',
}


// ═══════════════════════════════════════════════════════════════════
// 9. LISTENING — expanded with note-taking strategies
// ═══════════════════════════════════════════════════════════════════

export const LISTENING: GuideSection = {
  id: 'listening', title: 'Listening', icon: 'Headphones',
  subtitle: 'Comprehension, academic listening, and active listening strategies',
  overview: {
    what: 'Listening instruction teaches HOW to process spoken English — extracting meaning, following directions, taking notes, and engaging actively. Goes far beyond "pay attention." For ELLs, listening comprehension develops ahead of other domains and is the primary channel for language input.',
    whyItMatters: 'Krashen: language acquisition occurs through comprehensible input. A student who cannot process spoken English cannot learn content, participate, or follow instructions. Listening is the gateway.',
    researchBase: 'Krashen (1982); Vandergrift (2007); WIDA; Rost (2011).',
    bigIdea: 'Listening is not passive — it is an active cognitive process requiring explicit instruction, strategies, and support.',
  },
  developmentalProgression: [
    { name: 'Following Directions', description: 'Simple to multi-step oral instructions.', difficulty: 'foundational', gradeRange: 'K to Gr 2', activities: ['Simon Says', 'Direction sequences with visuals', 'Listen-and-do drawing tasks'] },
    { name: 'Listening for Information', description: 'Extracting details, main ideas, sequences from spoken text.', difficulty: 'intermediate', gradeRange: 'Gr 1 to 5', activities: ['Listening guides with organizers', 'Cloze notes', 'Two-column: What I heard / What I think'] },
    { name: 'Critical Listening', description: 'Evaluating, identifying purpose, distinguishing fact from opinion.', difficulty: 'advanced', gradeRange: 'Gr 3 to 5', activities: ['Fact vs. opinion sort', 'Speaker purpose: inform/persuade/entertain?', '"Did the speaker give evidence?"'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Follows 2-3 step directions. Answers about read-alouds. Participates in conversations.', assessHow: 'Direction-following observation. Read-aloud comprehension.' },
    { grade: '2-3', expectations: 'Determines main ideas from oral text. Clarifying questions. Simple notes.', assessHow: 'Listening quizzes. Note quality. Discussion contributions.' },
    { grade: '4-5', expectations: 'Summarizes spoken information. Identifies purpose. Evaluates evidence. Paraphrases.', assessHow: 'Oral summaries. Note quality. Academic discussion.' },
  ],
  skills: [
    { name: 'Active Listening Strategies', what: 'Specific strategies for processing spoken English more effectively.', why: 'ELLs process spoken language more slowly — simultaneously decoding sounds, accessing vocabulary, constructing meaning. Strategies reduce cognitive overload.',
      howToTeach: [
        { step: 'Predict before listening', detail: 'Tell the topic. "What do you think you will hear?" Activates relevant vocabulary and background knowledge.' },
        { step: 'Listen for keywords', detail: 'Give 2-3 target words before listening. "Listen for habitat, predator, prey. Thumbs up when you hear them." Focuses attention.' },
        { step: 'Stop and check every 3-5 minutes', detail: '"Tell your partner one thing you just heard." Prevents the comprehension breakdown that happens when ELLs lose the thread and cannot recover.' },
        { step: 'Visual support always', detail: 'Pair spoken input with pictures, diagrams, key vocabulary on the board. Gives a second processing channel.' },
      ],
      example: 'Before ocean read-aloud: "Listen for predator, prey, camouflage. After, tell your partner which animal uses camouflage and why."',
    },
    { name: 'Note-Taking: Cloze Notes (Fill-in-the-Blank)', what: 'Teacher provides notes with key words blanked out. Students listen and fill in the missing words.', why: 'The most scaffolded note-taking format. Perfect for WIDA 1-3 students because they do not have to generate notes from scratch — they listen for specific information.',
      howToTeach: [
        { step: 'Prepare the template', detail: 'Write your presentation notes with key vocabulary words blanked out. Leave enough context that students can identify the missing word. "Plants need ___, water, and ___ to grow."' },
        { step: 'Distribute before the lesson', detail: 'Students see the structure of the content before hearing it. This previews vocabulary and sets expectations.' },
        { step: 'Teach the routine', detail: '"As I teach, listen for the missing words. Write them in. If you miss one, leave it blank — we will review together."' },
        { step: 'Review together', detail: 'After the lesson, go through the cloze notes as a class. Fill in any blanks students missed. Students now have a complete study guide.' },
      ],
      example: 'Science lesson: "The water cycle has three stages: ___, condensation, and ___. When water heats up, it ___ into the air." Students fill in: evaporation, precipitation, evaporates.',
    },
    { name: 'Note-Taking: Two-Column Notes', what: 'Left column for main ideas or questions, right column for details. Simple but effective structure.', why: 'More independent than cloze notes but still structured. Good for WIDA 3-4 students transitioning to independent note-taking.',
      howToTeach: [
        { step: 'Set up the columns', detail: 'Draw a line down the middle of the page. Left side: "Main Ideas / Questions." Right side: "Details / Answers."' },
        { step: 'Teacher models first', detail: 'During a short lesson, show students how you listen and decide what goes in each column. Think aloud: "That seems like a main idea... and this is a detail about it."' },
        { step: 'Student practice with support', detail: 'Provide the main ideas in the left column. Students only need to add details in the right. Gradually release until students generate both columns.' },
        { step: 'Use for review', detail: 'Cover the right column and quiz yourself using the left column. Powerful study tool.' },
      ],
    },
    { name: 'Note-Taking: Sketch Notes', what: 'Combining simple drawings, symbols, and key words to capture information visually.', why: 'Excellent for WIDA 1-3 students who struggle with written English. Drawing is a universal language. Also engages different learning pathways.',
      howToTeach: [
        { step: 'Model the process', detail: 'Show how you convert spoken information into simple drawings. "The teacher said plants need sunlight — I draw a sun. Water — I draw raindrops. Soil — I draw a pot of dirt."' },
        { step: 'Keep it simple', detail: 'Stick figures, arrows, boxes, circles. Not art class. Speed and meaning matter more than beauty.' },
        { step: 'Add key words', detail: 'Label drawings with 1-2 key vocabulary words. Combine visual and verbal processing.' },
        { step: 'Use as study tool', detail: 'Students explain their sketch notes to a partner, translating visuals back into spoken language. This is powerful review.' },
      ],
    },
    { name: 'Note-Taking: Cornell Notes (Grade 4-5)', what: 'A structured format with three sections: cue column (left), notes column (right), and summary (bottom).', why: 'The most structured independent note-taking system. Builds metacognition — students must process and summarize, not just transcribe.',
      howToTeach: [
        { step: 'Set up the page', detail: 'Left column (narrow): Cues/Questions. Right column (wide): Notes/Details. Bottom section: Summary (2-3 sentences).' },
        { step: 'During listening: right column', detail: 'Write key ideas, facts, and details in the right column. Use abbreviations. Do not write everything — capture the important parts.' },
        { step: 'After listening: left column', detail: 'Write questions or keywords that correspond to each section of notes. "What are the three branches of government?" next to those notes.' },
        { step: 'Summary', detail: 'Write 2-3 sentences summarizing the entire page of notes. This forces students to process and consolidate information.' },
      ],
    },
    { name: 'Interactive Read-Aloud Comprehension', what: 'Building understanding through structured read-aloud with planned stops.', why: 'Read-alouds give access to text above independent level. For ELLs, listening comprehension exceeds reading comprehension.',
      howToTeach: [
        { step: 'Pre-teach 3-5 words', detail: 'Pictures + definitions. Removes vocabulary barriers during listening.' },
        { step: 'Stop every 3-5 pages', detail: 'Questions, predictions, clarification. Do NOT read straight through — ELLs lose comprehension without check-ins.' },
        { step: 'Turn and talk at stops', detail: '"Tell your partner: Why did the character do that?" Processes immediately. All students participate.' },
        { step: 'Post-listening response', detail: 'Retelling, drawing, discussion, writing. Cements comprehension.' },
      ],
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Follows 1-step directions with visuals. Identifies objects from descriptions.', support: 'Speak slowly. Gestures and visuals. One direction at a time. Non-verbal responses.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Follows 2-step directions. Main topic from short oral text. Sequences 2-3 events.', support: 'Visual support. Pre-teach vocab. Repeat important info. Partner processing.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Multi-step directions. Main idea + details from presentations. Cloze notes. Clarifying questions.', support: 'Listening guides. Cloze notes. Regular pauses. Academic listening vocabulary.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Academic presentations. Organized notes. Summarizes. Identifies purpose.', support: 'Cornell notes. Critical listening. Content-area lectures. Two-column notes.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Nuanced discourse. Evaluates arguments. Figurative language in context. Comprehensive notes.', support: 'Nuance and inference. Idiom instruction. Extended academic listening stamina.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Follows 1-step directions with gestures. Points to named objects.', level2: 'Follows 2-step directions. Identifies main character from read-aloud. Thumbs up/down comprehension.', level3: 'Follows multi-step directions. Retells 2-3 events. Answers questions about read-alouds.', level4: 'Summarizes read-alouds orally. Follows complex directions. Asks questions about what was heard.', level5: 'Comprehends grade-level read-alouds. Follows all directions. Identifies key details independently.' },
    { grade: '2', level1: 'Follows 1-2 step directions with visuals. Identifies topic with support.', level2: 'Follows multi-step directions. Identifies main topic. Beginning to answer comprehension questions.', level3: 'Identifies main idea from oral presentations. Sketch notes during listening. Asks clarifying questions.', level4: 'Takes two-column notes. Summarizes presentations. Follows extended oral text.', level5: 'Comprehends grade-level oral text. Independent notes. Evaluates what is heard.' },
    { grade: '3', level1: 'Follows 2-step directions. Gets main topic with visual support.', level2: 'Follows multi-step directions. Cloze notes during presentations. Main idea with support.', level3: 'Two-column notes developing. Summarizes oral text. Identifies speaker purpose with support.', level4: 'Cornell notes developing. Evaluates evidence. Summarizes independently.', level5: 'Full comprehension. Independent notes. Critical listening developing.' },
    { grade: '4', level1: 'Multi-step directions with support. Cloze notes with heavy scaffolding.', level2: 'Cloze notes independently. Main idea from presentations. Follows directions consistently.', level3: 'Two-column and Cornell notes. Summarizes oral text. Beginning critical listening.', level4: 'Independent comprehensive notes. Evaluates arguments. Identifies bias.', level5: 'Grade-level academic listening. Sophisticated notes. Critical evaluation.' },
    { grade: '5', level1: 'Follows directions with support. Cloze notes. Main topic identification.', level2: 'Cloze notes independently. Summarizes with support. Multi-step directions.', level3: 'Cornell notes. Summarizes independently. Evaluates speaker purpose.', level4: 'Comprehensive independent notes. Critical listening. Evaluates evidence and arguments.', level5: 'Full academic listening comprehension. Nuanced evaluation. Independent in all formats.' },
  ],
  interventionSignals: [
    { signal: 'Cannot follow 1-step directions after months', whatToDo: 'Check hearing. If normal: simplify to single words with gestures and modeling. TPR. Bilingual buddy. Ensure visual support always.' },
    { signal: 'Appears to understand but fails checks', whatToDo: 'May rely on watching peers rather than understanding speech. Assess listening separately. Increase vocabulary pre-teaching and visuals.' },
    { signal: 'Zones out during read-alouds', whatToDo: 'Extended listening is exhausting for ELLs. Break into shorter segments with processing pauses. Give a listening task (organizer, keyword hunt) to maintain engagement.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'Grade Entry tracks Speaking & Listening. Quick Check for listening assessment. WIDA levels guide expectations.',
}


// ═══════════════════════════════════════════════════════════════════
// 10. CLASSROOM MANAGEMENT — TLAC, Fred Jones, SEL, Skillful Teacher
// ═══════════════════════════════════════════════════════════════════

export const CLASSROOM_MANAGEMENT: GuideSection = {
  id: 'classroom-management', title: 'Classroom Management', icon: 'Shield',
  subtitle: 'SEL, behavior systems, and evidence-based management strategies',
  overview: {
    what: 'Classroom management for ELLs combines social-emotional learning (SEL), evidence-based behavior management, and culturally responsive practices. This section draws from Teach Like a Champion (Doug Lemov), Tools for Teaching (Fred Jones), The Skillful Teacher (Jon Saphier), and SEL research. Effective management creates the safe, structured environment that ELLs need to take the risks required for language learning.',
    whyItMatters: 'A well-managed classroom is a prerequisite for learning, not a separate skill. ELLs are especially vulnerable to chaotic environments because they are already processing cognitive overload. Clear routines, predictable structures, and warm relationships free cognitive resources for language acquisition.',
    researchBase: 'Lemov (2010, 2015) "Teach Like a Champion" (49 techniques); Fred Jones (2007) "Tools for Teaching"; Saphier (2008) "The Skillful Teacher"; CASEL SEL Framework; Responsive Classroom.',
    bigIdea: 'The best classroom management is invisible — students know what to do, how to do it, and feel safe doing it. Management is about building systems, not punishing behavior.',
  },
  developmentalProgression: [
    { name: 'Routines & Procedures', description: 'The foundation: transitions, materials, entering/exiting, getting help. Taught, modeled, and practiced until automatic.', difficulty: 'foundational', gradeRange: 'All grades', activities: ['Model and practice every routine in the first 2 weeks', 'Rehearse transitions until they take under 30 seconds', 'Teach the "ask three before me" help-seeking routine'] },
    { name: 'Engagement & Participation', description: 'Techniques ensuring every student is actively involved in learning every minute.', difficulty: 'intermediate', gradeRange: 'All grades', activities: ['Cold Call for equitable participation', 'No Opt Out for accountability', 'Pepper (rapid-fire review) for energy'] },
    { name: 'Culture & Relationships', description: 'Building a classroom community where students feel safe, respected, and motivated.', difficulty: 'advanced', gradeRange: 'All grades', activities: ['Morning meeting / circle time', 'Positive framing and narration', 'Restorative conversations'] },
  ],
  milestones: [
    { grade: 'K-1', expectations: 'Follows 2-3 step routines. Transitions in under 1 minute. Takes turns. Uses kind words.', assessHow: 'Transition timing. Behavior observation. SEL check-ins.' },
    { grade: '2-3', expectations: 'Self-manages routines. Works productively in groups. Resolves minor conflicts. Asks for help appropriately.', assessHow: 'Group work observation. Conflict resolution tracking. Student self-assessment.' },
    { grade: '4-5', expectations: 'Self-directed learner. Manages time and materials. Supports peers. Takes academic risks. Uses metacognitive strategies.', assessHow: 'Self-reflection journals. Peer feedback quality. Independence indicators.' },
  ],
  skills: [
    { name: 'Teach Like a Champion: Top Techniques', what: 'Doug Lemov\'s research-based techniques for classroom management and instruction. These are specific, actionable moves — not vague advice.', why: 'TLAC techniques work because they are precise and practicable. Each one addresses a specific classroom challenge with a specific solution.',
      howToTeach: [
        { step: 'Cold Call', detail: 'Call on students regardless of whether they have raised their hand. "Maria, what do you think?" This keeps ALL students engaged because anyone might be called. For ELLs: give wait time (3-5 seconds), allow partner prep, accept partial answers. Cold Call is NOT gotcha — it is "I believe you have something valuable to say."' },
        { step: 'No Opt Out', detail: 'When a student says "I don\'t know," do not let them off the hook. Provide support: "Let me give you a hint..." or "Turn to your partner for help, then come back to me." The student must ultimately produce an answer. Message: "In this class, everyone participates."' },
        { step: 'Threshold', detail: 'Stand at the door and greet every student by name as they enter. Make eye contact. Handshake or fist bump. Check emotional state. "Good morning, Yuna!" This sets the tone, builds relationship, and establishes your presence. Takes 2 minutes, pays off all day.' },
        { step: 'Strong Voice', detail: 'Five principles: (1) Economy of language — fewer words = more power. (2) Do not talk over students — wait for silence, then speak. (3) Do not engage in argument. (4) Square up and stand still when giving directions. (5) Quiet power — the softer your voice, the harder they listen.' },
        { step: 'What to Do', detail: 'Give specific, concrete, sequential, observable directions. NOT: "Settle down." YES: "Pencils down. Eyes on me. Hands in your lap." Students cannot follow vague directions — especially ELLs who may not understand abstract commands.' },
        { step: '100%', detail: 'The expectation that 100% of students comply with directions, 100% of the time. Not 95%. Scan the room to verify. If 2 students are not following the direction, address it calmly before moving on. Consistency builds trust and structure.' },
        { step: 'Positive Framing', detail: 'Narrate the positive behavior you see: "I see table 3 is ready. Thank you, table 1, you are sitting quietly." This is more effective than correcting the negative. People move toward what they hear named. "I need everyone looking at me" is better than "Stop talking."' },
        { step: 'Precise Praise', detail: 'Generic praise ("Good job!") is weak. Precise praise names the specific behavior: "Jisu, I love how you used evidence from the text to support your answer." This tells students exactly what to do more of.' },
        { step: 'Format Matters', detail: 'Hold students to high standards of format: complete sentences, proper voice volume, standing when presenting, looking at the audience. "Can you say that in a complete sentence?" Format expectations build academic habits and confidence.' },
        { step: 'Pepper', detail: 'Rapid-fire questioning to review material with energy and pace. Ask a question, point to a student, get answer, immediately ask next question to next student. Keeps everyone alert and engaged. 2-3 minutes of Pepper reviews more content than 10 minutes of worksheet.' },
        { step: 'Everybody Writes', detail: 'Before discussion, have every student write their answer. "Take 30 seconds to write your response." This ensures EVERY student thinks before the fast speakers dominate. Then Cold Call from their written responses. Essential for ELLs who need processing time.' },
        { step: 'Turn and Talk', detail: 'Same as Think-Pair-Share — partners discuss before whole-class share. "Turn to your partner. You have 60 seconds." Provides low-risk speaking practice and processing time.' },
        { step: 'Do It Again', detail: 'If a routine is done sloppily, have students do it again — correctly. Not as punishment, but as practice. "That transition took 2 minutes. Let\'s practice until it takes 30 seconds." Students learn: we do things well here.' },
        { step: 'Warm/Strict', detail: 'You can be warm AND strict simultaneously. "I care about you too much to let you not do your best work." Warmth without standards is permissiveness. Standards without warmth is authoritarianism. The combination builds trust AND achievement.' },
      ],
    },
    { name: 'Fred Jones: Tools for Teaching', what: 'Fred Jones\'s research on body language, incentive systems, and classroom structure.', why: 'Jones found that 80% of discipline problems can be prevented through body language, room arrangement, and incentive systems. His approach is low-confrontation and high-structure.',
      howToTeach: [
        { step: 'Body Language & Proximity', detail: 'The most powerful management tool is physical presence. When a student is off-task, move toward them. Stand near them. Make eye contact. Do not say a word. 90% of the time, proximity alone solves the problem. Keep moving around the room — do not teach from the front only.' },
        { step: 'Room Arrangement', detail: 'Arrange the room so you can reach every student within 3 steps. Create walkways between all desks/tables. If you cannot physically get to a student, you cannot manage that student. The room layout IS a management tool.' },
        { step: 'Preferred Activity Time (PAT)', detail: 'A group incentive system: the class earns time toward a preferred activity through on-task behavior. Timer runs during work time — when the class is on task, the timer counts up. When they are off, it stops. Accumulated time becomes free choice, game time, or art time at the end of the week.' },
        { step: 'Responsibility Training', detail: 'Students learn to self-manage because their behavior affects the group. "The class earned 12 minutes of PAT this week — great job!" Peer accountability without tattling.' },
        { step: 'Visual Instructional Plans (VIPs)', detail: 'Post step-by-step directions for every task on the board. When a student asks "What do I do?" point to the board. Reduces help-seeking interruptions by 80%. Essential for ELLs who may have missed verbal directions.' },
        { step: 'Calm is Strength', detail: 'Jones emphasizes: never raise your voice. The calmer you are, the more powerful you become. A teacher who yells has lost control. A teacher who speaks softly and waits has total control.' },
      ],
    },
    { name: 'Social-Emotional Learning (SEL)', what: 'CASEL\'s five SEL competencies: self-awareness, self-management, social awareness, relationship skills, responsible decision-making.', why: 'ELLs face unique social-emotional challenges: culture shock, identity shifts, communication frustration, social isolation. SEL provides the emotional foundation that makes academic risk-taking possible.',
      howToTeach: [
        { step: 'Self-Awareness', detail: 'Teach students to identify and name their emotions. Feelings check-in: "How are you feeling today? Point to the feeling on the chart." Normalize all feelings. For ELLs: teach emotion vocabulary explicitly — happy, sad, angry, frustrated, confused, proud, nervous.' },
        { step: 'Self-Management', detail: 'Teach coping strategies for frustration: deep breathing, asking for help, taking a break, trying again. "When you feel frustrated in English, what can you do?" Create a calm corner or reset space. Teach "I need a break" as an acceptable English phrase.' },
        { step: 'Social Awareness', detail: 'Understanding others\' perspectives and empathy. "How do you think she felt when that happened?" Use read-alouds to discuss characters\' emotions. Discuss cultural differences respectfully: "In Korea, you might do it this way. In America, people often do it this way. Both are okay."' },
        { step: 'Relationship Skills', detail: 'Teach explicit social language: "Can I play?" "Can you help me?" "I\'m sorry." "Thank you." Role-play common social situations. Partner and group work builds relationships through structured interaction.' },
        { step: 'Responsible Decision-Making', detail: 'Teach the STOP strategy: Stop, Think, Options, Pick the best one. Use real classroom scenarios: "You want to play soccer but your friend wants to play basketball. What are your options?" Practice making choices with consequences.' },
      ],
    },
    { name: 'The Skillful Teacher: Key Concepts', what: 'Jon Saphier\'s framework for expert teaching practice.', why: 'Saphier identifies management as inseparable from instruction — the best management is excellent teaching that keeps students engaged.',
      howToTeach: [
        { step: 'Momentum', detail: 'Keep lessons moving with minimal dead time. Transitions should be seamless. When students are idle, behavior problems emerge. Plan every minute. Have backup activities ready. "What will students DO while I distribute materials?"' },
        { step: 'Overlapping', detail: 'Handle multiple things simultaneously. While students write, circulate and conference. While one student answers, scan the room. While collecting papers, give the next direction. Expert teachers manage 3-4 things at once.' },
        { step: 'Withitness', detail: 'The ability to know what is happening everywhere in the room at all times. Eyes in the back of your head. Students believe you see everything — so they stay on task. Position yourself to see all students. Scan constantly.' },
        { step: 'Personal Relationship Building', detail: 'Learn 2 things about every student that have nothing to do with school: hobbies, family, favorite food, pets. Use this knowledge in conversation: "Yuna, I heard you had a soccer game. How did it go?" Students work harder for teachers who know them.' },
        { step: 'Clarity of Expectations', detail: 'Students should be able to tell a visitor exactly what they are supposed to be doing and why. If they cannot, the expectations were not clear enough. Model. Practice. Post. Remind. The investment in teaching procedures saves exponentially more time later.' },
      ],
    },
    { name: 'ELL-Specific Management Strategies', what: 'Adaptations for managing a classroom where students have varying English proficiency levels.', why: 'Standard management advice assumes students understand the teacher. ELLs may not understand verbal directions, behavior expectations, or social norms. Adapt management to account for the language barrier.',
      howToTeach: [
        { step: 'Visual schedules and routines', detail: 'Post the daily schedule with pictures. Use visual timers. Post step-by-step directions for every routine. When giving verbal directions, ALWAYS pair with visual support.' },
        { step: 'Teach behavior vocabulary explicitly', detail: 'Do not assume students know: "sit criss-cross," "push in your chair," "line up," "take turns." Teach and model these explicitly. Use TPR (Total Physical Response) — say the direction and do the action.' },
        { step: 'Consistent signals', detail: 'Use the same attention signal every time: hand raise, chime, countdown. ELLs learn routines through consistency, not verbal explanation. The signal means the same thing every single time.' },
        { step: 'Behavior is not language', detail: 'A student who does not follow a direction may not understand the direction — not be defiant. Before assuming misbehavior, check comprehension: "Show me what you are supposed to do." If they cannot show you, they did not understand.' },
      ],
    },
    { name: 'Saphier: Attention Moves', what: 'Jon Saphier\'s "The Skillful Teacher" organizes attention moves on a continuum from Authority (desisting) to Attraction (winning). Teachers who can flexibly move across the continuum maintain engagement without escalation.', why: 'Most teachers default to desisting — the top of the continuum. Shifting even 20% of moves from desisting to enlisting or winning transforms a classroom. The continuum provides a concrete framework for expanding your repertoire.',
      howToTeach: [
        { step: 'Desisting Moves (Authority → Low Authority)', detail: 'Moves that stop unwanted behavior, ranked from high authority to low: Consequence → Exclude → Threaten → Order → Specific/General Verbal Desist → Private Desist → Group Pressure → Peer Competition → Move Seat → "I" Message → Remove Distraction → Offer Choice → Urge → Remind → Flattery → Signals → Pause and Look → Name Dropping → Offer Help → Touch → Proximity. Start at the bottom — proximity and a look solve 90% of problems. Escalate only as needed.' },
        { step: 'Alerting Moves', detail: 'Moves that maintain attention and keep all students mentally engaged: Startle (clap, change voice) → Use Student\'s Name in Example → Redirect Partial Answer → Pre-alert ("In 30 seconds I\'ll ask someone to...") → Unison Response → Look at One, Talk to Another → Incomplete Sentences → Equal Opportunity → Random Order → Circulation → Wait Time → Eye Contact → Freedom from Distraction. These are proactive — they prevent disengagement before it starts.' },
        { step: 'Enlisting Moves', detail: 'Moves that make the content itself engaging: Voice Variety → Gesture → Piquing Student\'s Curiosity → Suspense → Challenge → Making Student a Helper → Props → Personification → Connecting with Student\'s Fantasies. These moves generate intrinsic motivation — students pay attention because they want to, not because they are being managed.' },
        { step: 'Acknowledging', detail: 'The simplest attention move: brief, non-verbal recognition that you see the student. A nod, a smile, a thumbs-up, a brief "I see you." Students who feel seen are less likely to seek attention through misbehavior.' },
        { step: 'Five Winning Moves (Attraction)', detail: '(1) Encouragement: voice quality and expression that keep students going. (2) Enthusiasm: genuine excitement about what students are doing. (3) Praise: specific comments naming the effort and its impact — not "good job" but "you really worked hard on that paragraph structure." (4) Humor: positive, supportive, mutual — never sarcasm. (5) Dramatizing: acting out material, stepping into character, making content physical and memorable.' },
        { step: 'ESL Application', detail: 'Use proximity and non-verbal desists before verbal ones — they work across language barriers. Pair alerting with visual cues: hold up fingers for countdown, point to the board. For enlisting, use props and dramatization heavily — physical and visual engagement transcends language. Keep voice variety high — tone communicates meaning even when words are hard. Never use sarcasm, which depends on language nuance students may miss.' },
      ],
    },
  ],
  wida: [
    { level: 'Level 1 — Entering', color: 'bg-red-50 border-red-200 text-red-900', canDo: 'Follows visual routines. Responds to gestures and consistent signals.', support: 'All-visual management. Pictures for rules. TPR for routines. Bilingual buddy for behavior expectations.' },
    { level: 'Level 2 — Emerging', color: 'bg-orange-50 border-orange-200 text-orange-900', canDo: 'Follows simple verbal + visual directions. Beginning to understand classroom norms.', support: 'Simple, consistent language for directions. Model everything. Check comprehension before assuming defiance.' },
    { level: 'Level 3 — Developing', color: 'bg-amber-50 border-amber-200 text-amber-900', canDo: 'Follows most classroom routines independently. Participates in group norms.', support: 'Standard management techniques work. Include in group accountability systems. Teach self-management vocabulary.' },
    { level: 'Level 4 — Expanding', color: 'bg-green-50 border-green-200 text-green-900', canDo: 'Self-manages routines. Understands behavior expectations. Can mediate minor conflicts.', support: 'Standard management. Leadership roles. Peer mentoring for newer ELLs.' },
    { level: 'Level 5 — Bridging', color: 'bg-blue-50 border-blue-200 text-blue-900', canDo: 'Fully participates in classroom community. Self-directed. Supports others.', support: 'Standard grade-level management. May serve as cultural bridge for newer students.' },
  ],
  widaMatrix: [
    { grade: '1', level1: 'Follows picture schedule. Responds to gestures. Needs bilingual buddy for expectations.', level2: 'Follows simple routines with visual cues. Beginning to understand turn-taking and sharing.', level3: 'Follows classroom routines independently. Participates in group activities. Uses "I need help."', level4: 'Self-manages materials and transitions. Works in groups productively. Resolves simple conflicts.', level5: 'Fully independent. Follows all norms. Helps peers. Age-appropriate self-regulation.' },
    { grade: '2', level1: 'Visual schedule and gesture-based management. Consistent signals essential.', level2: 'Follows verbal + visual directions. Learning classroom language: "line up, sit down, clean up."', level3: 'Independent routine management. Group work developing. Asks for help in English.', level4: 'Self-directed in routines. Peer collaboration. Beginning conflict resolution in English.', level5: 'Full participation. Leadership roles. Supports newer students.' },
    { grade: '3', level1: 'Visual routines. May appear withdrawn or confused — check comprehension, not behavior.', level2: 'Follows most routines with support. Peer buddy helpful. Learning behavior vocabulary.', level3: 'Independent management. Participates in group norms. Self-advocacy developing.', level4: 'Self-directed. Peer mentoring. Understands and follows behavior systems.', level5: 'Fully integrated. Leadership. Cultural bridge for newcomers.' },
    { grade: '4', level1: 'Visual support critical. Consistent routines. May struggle with implicit social norms.', level2: 'Follows explicit routines. Developing understanding of implicit expectations. Peer support helpful.', level3: 'Independent. Group work productive. Understands consequence systems.', level4: 'Self-manages. Peer leadership. Metacognitive about own behavior.', level5: 'Fully self-directed. Mentors others. Strong classroom citizen.' },
    { grade: '5', level1: 'Visual and routine-based management. Social isolation risk — actively build peer connections.', level2: 'Follows routines. Building social connections. May need explicit social skill instruction.', level3: 'Independent management. Social skills developing. Participates in restorative conversations.', level4: 'Self-directed learner. Peer leadership and collaboration. Strong self-regulation.', level5: 'Model classroom citizen. Mentors newcomers. Full community participation.' },
  ],
  interventionSignals: [
    { signal: 'Student consistently does not follow directions', whatToDo: 'FIRST check: does the student understand the direction? Ask them to repeat or show you. If comprehension is the issue, add visual support and simplify language. If comprehension is fine, then address as a behavior issue with standard management.' },
    { signal: 'Student is withdrawn and does not participate', whatToDo: 'May be in a silent period (normal for ELLs, up to 3 months). May be experiencing culture shock or anxiety. Do not force participation. Build relationship through low-pressure interactions. Provide entry points: partner work, written responses, non-verbal participation.' },
    { signal: 'Student has frequent emotional outbursts', whatToDo: 'ELLs experience significant frustration from communication barriers. Teach calming strategies. Provide a reset space. Validate the feeling while redirecting the behavior: "I can see you are frustrated. That is okay. Let us take a deep breath and try again."' },
    { signal: 'Student is socially isolated from peers', whatToDo: 'Structured partner and group activities create connection. Assign a buddy (ideally Korean-speaking if available). Teach social entry phrases: "Can I play?" "Can I sit here?" Create classroom jobs that require cooperation.' },
  ],
  koreanL1Considerations: [],
  connectionToApp: 'The Behavior Log tracks patterns over time. Attendance data may correlate with behavior concerns. The Intervention Loop can document behavior-related interventions alongside academic ones. Student profiles help teachers understand each student holistically.',
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
  CLASSROOM_MANAGEMENT,
]
