'use client'

import { useState, useMemo } from 'react'
import React from 'react'
import {
  Search, ChevronDown, ChevronRight, BookOpen, Layers, Music, Puzzle,
  Target, BarChart3, TrendingUp, Volume2, Brain, Scissors, FileText,
  AlertTriangle, CheckCircle2, Lightbulb, ArrowRight, GraduationCap
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════
// 1. PHONICS SCOPE & SEQUENCE
// Based on Sarah's Teaching Snippets Systematic Phonics Sequence
// Aligned to Science of Reading / Structured Literacy research
// ═══════════════════════════════════════════════════════════════════

interface PatternDeepDive {
  whyItWorks: string           // The underlying logic / "secret rule"
  commonIrregulars?: string[]  // Exceptions and why they're exceptions
  wordFamilies?: string[]      // Word family lists
  contrastPairs?: string[]     // Minimal pairs
  samplePhrases?: string[]     // Practice phrases
  sortingTip?: string          // How to structure sorting activities
  guideRef?: string            // Optional: "Guide 2, Lesson 3, p28-48"
}

interface PhonicsPattern {
  pattern: string
  examples: string
  hfWords?: string
  notes?: string
  isMorphology?: boolean
  deepDive?: PatternDeepDive
}

interface PhonicsStage {
  id: string
  name: string
  description: string
  suggestedClasses: string
  patterns: PhonicsPattern[]
}

const PHONICS_STAGES: PhonicsStage[] = [
  {
    id: 'alphabet',
    name: 'Stage 1: Alphabet Knowledge',
    description: 'Letter names, sounds, and formation. Foundation for all decoding.',
    suggestedClasses: 'Lily (beginning), Camellia (review)',
    patterns: [
      { pattern: 'Consonant sounds', examples: 'b, c, d, f, g, h, j, k, l, m, n, p, q, r, s, t, v, w, x, y, z', notes: 'Teach in high-utility order: s, m, t, a, p, n, c, i, f, b, g, d, h, r, l, o, e, u, k, w, j, v, y, z, x, q', deepDive: {
        whyItWorks: 'The teaching order is based on frequency and distinctiveness. High-utility letters (s, m, t) appear in the most words, so students can start reading sooner. Visually similar letters (b/d, p/q) and aurally similar sounds (m/n, f/v) are separated in the sequence to reduce confusion. For Korean ELLs, some English consonants have no Korean equivalent: /f/, /v/, /z/, /θ/ (th), /ð/ (voiced th), and the /l/-/r/ distinction. These need extra explicit instruction because students literally cannot hear the difference without training.',
        commonIrregulars: [
          'c has two sounds: /k/ before a, o, u (cat, cold, cup) and /s/ before e, i, y (cent, city, cycle). This is the "soft c" rule inherited from Latin.',
          'g has two sounds: /g/ before a, o, u (gap, go, gum) and /j/ before e, i, y (gem, giant, gym). But g is less reliable than c -- "get," "give," "girl" break the rule. These exceptions are Germanic words that resisted the French/Latin pattern.',
          'x is never truly its own sound -- it represents /ks/ (box, fox) or /gz/ (exact, exam). At the start of words it makes /z/ (xylophone).',
          's has two sounds: /s/ (sun, sit) and /z/ (is, has, dogs). The /z/ pronunciation happens between vowels and after voiced consonants. Korean has no /z/ phoneme, so this needs explicit teaching.'
        ]
      } },
      { pattern: 'Short vowels', examples: 'a (cat), e (bed), i (sit), o (hot), u (cup)', notes: 'Introduce after 4-6 consonants. Use CVC words immediately.', deepDive: {
        whyItWorks: 'Short vowels are the default vowel sound in English. When a vowel is "closed in" by a consonant (CVC pattern like cat, bed, sit), it makes its short sound. This is the most common syllable type in English -- about 50% of all syllables are closed. The term "short" is misleading; it refers to the lax tongue position, not duration. Korean vowels are pure and consistent; English vowels shift depending on surrounding consonants, which is a major source of confusion for ELLs.',
        commonIrregulars: [
          'Short o (/ɒ/) varies by dialect. In many American accents, "hot" and "father" use the same vowel, but in British English they differ. Don\'t overcorrect students on this.',
          'Short u (/ʌ/) is identical to schwa in sound but different in function -- short u occurs in stressed syllables (cup, but, run), schwa in unstressed syllables (about, pencil).',
          '"Put," "push," "pull," "full," "bull" use /ʊ/ (as in "book"), not short u. These are common exceptions that must be taught as sight words at this stage.'
        ]
      } },
      { pattern: 'Letter formation', examples: 'Manuscript print, correct directionality', notes: 'Multisensory: skywriting, sand trays, bumpy boards. Connect formation to sound.', deepDive: {
        whyItWorks: 'Handwriting activates motor memory pathways that reinforce letter-sound connections. Research (James & Engelhardt, 2012) shows that children who practice writing letters by hand show greater neural activation in reading circuits than those who only type or trace. For Korean students, the left-to-right, top-to-bottom directionality of English differs from Hangul\'s block construction, so explicit practice is important. The key principle: always say the sound while forming the letter, creating a simultaneous auditory-visual-kinesthetic link.'
      } },
      { pattern: 'Alphabetic principle', examples: 'Letters represent sounds; sounds blend into words', notes: 'Continuous blending (mmm-aaa-nnn) vs. choppy segmenting. Use Elkonin boxes.', deepDive: {
        whyItWorks: 'English is an alphabetic language -- letters map to sounds, and sounds combine into words. This seems obvious to literate adults but is a genuine cognitive breakthrough for children. Korean Hangul is also alphabetic but much more transparent (each symbol reliably maps to one sound). English has about 44 phonemes represented by 26 letters in roughly 250 different spellings. This means English requires more explicit teaching of the code than Korean does. Continuous blending (/mmmaaat/) is more effective than choppy segmenting (/m/-/a/-/t/) because it preserves the co-articulation that makes words recognizable.',
        commonIrregulars: [
          'Some high-frequency words cannot be fully decoded at this stage: "the," "was," "said," "of," "do." Teach the decodable parts (th-e: th is decodable, e is irregular) and flag the tricky part. Never call them "sight words" that must be memorized whole -- research shows even irregular words are partially decodable.'
        ]
      } },
    ]
  },
  {
    id: 'closed',
    name: 'Stage 2: Closed Syllables (CVC/CCVC/CVCC)',
    description: 'Short vowel words with consonants closing the syllable. The most common English syllable type.',
    suggestedClasses: 'Lily, Camellia',
    patterns: [
      { pattern: 'CVC words', examples: 'cat, bed, sit, hop, cup', notes: 'Master before advancing. Students should read and spell fluently.', deepDive: {
        whyItWorks: 'The closed syllable is the backbone of English. The rule is simple: when a vowel is followed by a consonant (closed in), the vowel makes its short sound. This single rule covers roughly half of all English syllables. Mastery means students can decode hundreds of words. The reason we teach CVC before anything else is that it establishes the default expectation -- short vowel. Every other syllable type is then taught as a variation from this baseline.',
        contrastPairs: ['cat/cake (closed vs silent-e)', 'hop/hope', 'cut/cute', 'bit/bite', 'not/note'],
        commonIrregulars: [
          '"Was," "what," "want," "wash" -- the w changes the following a to sound like short o. This is called the "w effect" and also applies to "war," "warm," "water."',
          '"Put," "push," "pull" -- short u after p makes /ʊ/ instead of /ʌ/ in some common words.',
          '"Said," "says" -- irregular ea pronunciation. These must be taught explicitly.'
        ]
      } },
      { pattern: 'Initial consonant blends', examples: 'bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw', notes: 'Teach as two distinct sounds blended together, NOT as chunks.', deepDive: {
        whyItWorks: 'Blends are NOT new sounds -- they are two (or three) consonant sounds pronounced in rapid sequence. Teaching them as chunks ("bl says /bl/") is harmful because it prevents students from segmenting them for spelling. A student who understands that "blend" is /b/+/l/+/e/+/n/+/d/ can spell it; a student who memorized "bl" as a unit will struggle with "bulb" or "lab" where b and l appear in different positions. Korean does not allow initial consonant clusters (no word starts with /bl/ or /tr/ in Korean), so students may insert a vowel sound: "blue" becomes "buh-loo." Explicit instruction in maintaining airflow between consonants is essential.',
        commonIrregulars: [
          'Three-letter blends exist: str (string), spl (splash), spr (spring), scr (scrub), squ (square). These follow the same principle but need extra practice.',
          'The blend "wr" was historically pronounced (Old English "writan" with a w sound) but the w is now silent. Teach wr- as a spelling pattern, not a blend.'
        ]
      } },
      { pattern: 'Final consonant blends', examples: '-nd, -nk, -nt, -mp, -lt, -lk, -ft, -sk, -st', notes: 'Students often drop the second consonant in spelling. Dictation practice essential.', deepDive: {
        whyItWorks: 'Final blends are harder than initial blends because English naturally reduces word endings in speech. We say "han(d)" and "wen(t)" with the final consonant barely articulated. This is why students write "wet" for "went" or "han" for "hand" -- they are spelling what they hear. The fix is explicit sound segmentation: tap each sound on fingers before writing. Korean syllables always end in a single consonant (or none), so final clusters are especially challenging. The -nk ending is tricky: it sounds like /ngk/, and students need to understand that n before k changes to the /ng/ sound.',
        commonIrregulars: [
          '-lk words: "walk," "talk," "chalk" -- the l is silent. But "milk," "silk," "bulk" pronounce the l. The difference: when -lk follows a, the l drops.',
          '-mb words: "lamb," "comb," "climb," "thumb" -- the b is silent. This is historical; the b was once pronounced in Old English.'
        ]
      } },
      { pattern: 'Digraphs', examples: 'sh, ch, th, wh, ck, ph', notes: 'Two letters, one sound. Distinguish from blends. th = voiced (this) and unvoiced (think).', deepDive: {
        whyItWorks: 'English has more sounds than letters (44 phonemes, 26 letters), so some sounds require two letters. This is fundamentally different from blends: "sh" is ONE sound (you cannot separate it into /s/ and /h/), while "sl" is TWO sounds blended. Understanding this distinction is critical for accurate Elkonin box work -- "ship" has 3 sound boxes (/sh/-/i/-/p/), not 4. The "th" digraph has two distinct sounds: voiceless /θ/ (think, math, thumb) and voiced /ð/ (this, that, the, mother). Place your hand on your throat -- voiced th vibrates. Korean has neither sound, so students commonly substitute /s/ or /d/.',
        commonIrregulars: [
          'The "ch" digraph has three pronunciations: /ch/ (chip -- English/Germanic), /k/ (school, Christmas -- Greek origin), and /sh/ (chef, machine -- French origin). The pronunciation tells you the word\'s etymological origin.',
          '"Ph" making /f/ comes exclusively from Greek. Almost every ph word has a Greek root: phone (sound), photo (light), graph (write), philosophy (love of wisdom).',
          '"Wh" in many dialects is now just /w/ (where = wear). Historically it was a voiceless w (/hw/). Some dialects preserve this: "which" vs "witch" sound different.'
        ]
      } },
      { pattern: 'FLOSS rule (ff, ll, ss, zz)', examples: 'off, tell, miss, buzz, staff, dull', notes: 'Double the final consonant after a single short vowel in a one-syllable word.', deepDive: {
        whyItWorks: 'After a single short vowel in a one-syllable word, the consonants f, l, s, and z are doubled. This is a spelling convention, not a pronunciation change -- "off" and "of" have the same /f/ sound, the doubling just signals the short vowel. The rule exists because English uses consonant patterns to indicate vowel quality: a single consonant followed by e signals a long vowel (hope), so doubling signals "no, stay short." Knowing this rule means students never write "of" for "off" or "mis" for "miss." The name FLOSS is a mnemonic: F, L, O (not used), S, S.',
        commonIrregulars: [
          '"If," "of," "us," "bus," "yes," "this," "has," "is," "his," "was" -- common words that break the rule. Most are function words (grammatical rather than content words) that historically had different pronunciations.',
          '"All," "ill," "ell" follow the rule, but "al" in "also," "already," "always" uses a single l because it became a prefix.',
          '"Jazz," "fizz," "fuzz," "buzz" follow the rule, but zz is the rarest doubling.'
        ]
      } },
      { pattern: '-ng, -nk endings', examples: 'ring, sang, think, bank', notes: 'Nasal sounds. -nk includes the /k/ sound; -ng does not.', deepDive: {
        whyItWorks: 'The /ng/ sound (as in "ring") is a single phoneme -- a nasal made at the back of the throat (the velum). It only appears at the end of syllables in English, never the beginning. The spelling -nk represents TWO sounds: /ng/ + /k/ (think = /th/-/i/-/ng/-/k/). This distinction matters for Elkonin boxes and spelling. Korean has a similar nasal final consonant (the ㅇ batchim), which gives Korean ELLs an advantage with this pattern compared to speakers of other L1s.',
        commonIrregulars: [
          'The -ng digraph makes /ng/ in "sing" but /ng/+/g/ in "finger" and "longer" -- the g is pronounced when -ng comes before a vowel suffix in the base word. "Singer" = /ng/ (sing+er), "finger" = /ng+g/ (not fing+er, it\'s a single morpheme).',
          '"Anxiety," "angry," "angle" -- when n comes before g or k in the middle of a word, it nasalizes to /ng/ automatically.'
        ]
      } },
      { pattern: 'Inflectional suffix -s', examples: 'cats, runs, beds', isMorphology: true, notes: 'First morphology concept. Three pronunciations: /s/ (cats), /z/ (beds), /iz/ (buses).', deepDive: {
        whyItWorks: 'The plural/verb -s has three pronunciations determined by the preceding sound, following a voicing assimilation rule: after voiceless sounds (/p, t, k, f, θ/), -s says /s/ (cats, cups, books). After voiced sounds (/b, d, g, v, m, n, l, r/ and all vowels), -s says /z/ (dogs, beds, cans, trees). After sibilants (/s, z, sh, ch, j/), -es says /iz/ (buses, watches, judges). Students don\'t need to memorize this rule -- it happens naturally in speech. But for spelling, they need to know when to write -s vs -es: add -es after s, x, z, ch, sh.',
        commonIrregulars: [
          'Irregular plurals: child/children, mouse/mice, foot/feet, tooth/teeth, man/men, woman/women, goose/geese. The vowel-change plurals (foot/feet) are remnants of Old English "umlaut" plurals.',
          'Unchanged plurals: sheep, fish, deer, moose, series, species. Many are animals -- possibly because they were counted as groups rather than individuals.',
          'Latin/Greek plurals: cactus/cacti, fungus/fungi, nucleus/nuclei, analysis/analyses, criterion/criteria. These preserve the original language\'s plural form.'
        ]
      } },
      { pattern: 'Inflectional suffix -ed', examples: 'jumped /t/, rained /d/, wanted /id/', isMorphology: true, notes: 'Three pronunciations based on final sound of base word.', deepDive: {
        whyItWorks: 'Like -s, the past tense -ed has three pronunciations governed by the final sound of the base word: after voiceless sounds, -ed says /t/ (jumped, walked, kissed). After voiced sounds, -ed says /d/ (rained, played, called). After /t/ or /d/, -ed says /id/ (wanted, needed, loaded). The crucial teaching point: -ed is ALWAYS spelled -ed regardless of pronunciation. Students who write "jumpt" or "walkt" are spelling phonetically rather than morphologically. Teach that -ed is a meaning unit (past tense marker) that keeps its spelling.',
        commonIrregulars: [
          'Irregular past tenses don\'t use -ed at all: go/went, see/saw, run/ran, eat/ate, come/came, give/gave, take/took, make/made. These are among the most frequent verbs in English and are mostly Old English strong verbs that changed their vowel instead of adding a suffix.',
          '"Said," "paid," "laid" are irregular in spelling (not "sayed") but follow normal pronunciation rules.',
          'Adjective -ed: "a crooked man," "wicked witch," "naked eye" -- when -ed forms an adjective, it often says /id/ even after voiced sounds.'
        ]
      } },
      { pattern: 'Inflectional suffix -ing', examples: 'jumping, running, sitting', isMorphology: true, notes: 'Introduce doubling rule: CVC + -ing doubles final consonant.', deepDive: {
        whyItWorks: 'The doubling rule exists to protect the short vowel sound. Compare: "hoping" (hope + ing, long o) vs "hopping" (hop + ing, short o). Without the doubled p, "hopping" would look like "hoping" and be read with a long vowel. The rule: if a one-syllable word ends in CVC (consonant-vowel-consonant), double the final consonant before adding a vowel suffix (-ing, -ed, -er, -est). This rule also explains why we DON\'T double after blends ("jumping" not "jumppping") or long vowels ("sleeping" not "sleepping") -- the vowel is already protected by the consonant cluster or vowel spelling.',
        commonIrregulars: [
          'Silent-e words DROP the e: hope -> hoping, make -> making, write -> writing. The e is no longer needed because the suffix starts with a vowel.',
          'Words ending in -x don\'t double: box -> boxing (not boxxing). Because x already represents two sounds (/ks/), the vowel is protected.',
          'Words ending in -w don\'t double: show -> showing. W is not a true consonant here; it\'s part of the vowel team.',
          '"Bus" -> "busing" or "bussing" -- both are accepted. "Quiz" -> "quizzing" (doubles because qu functions as one consonant).'
        ]
      } },
    ]
  },
  {
    id: 'open',
    name: 'Stage 3: Open Syllables',
    description: 'Syllables ending in a vowel -- the vowel says its name (long sound).',
    suggestedClasses: 'Camellia, Daisy',
    patterns: [
      { pattern: 'Open syllable concept', examples: 'me, she, hi, go, no, we, be', notes: 'Syllable ends in a vowel = vowel is long. Contrast with closed (met vs. me).', deepDive: {
        whyItWorks: 'An open syllable ends in a vowel, and that vowel is long (says its name). This is the opposite of the closed syllable rule. The logic: when nothing "closes in" the vowel, it is free to make its full, long sound. This is why "me" has a long e but "met" has a short e -- the t closes the syllable. Understanding open vs. closed syllables is the single most powerful decoding strategy for multisyllabic words. When students encounter an unknown long word, they divide it into syllables, check if each syllable is open or closed, and assign the appropriate vowel sound.',
        contrastPairs: ['me/met', 'she/shed', 'go/got', 'hi/hit', 'no/not', 'we/wet', 'be/bed'],
        commonIrregulars: [
          '"Do" and "to" have short/reduced vowels, not long o. These are among the most frequent words in English and are simply irregular.',
          '"He," "she," "we," "me," "be" are regular (long vowel). But "the" has a schwa (unstressed) or short e before consonants ("the dog") and long e before vowels ("the apple").',
          'Single-syllable function words often resist vowel rules because they\'re spoken so quickly they reduce to schwa.'
        ]
      } },
      { pattern: 'Two-syllable open/closed', examples: 'ro-bot, mu-sic, pa-per, ti-ger', notes: 'Teach syllable division: V/CV (open first) vs. VC/V (closed first).', deepDive: {
        whyItWorks: 'When dividing a two-syllable word, the first attempt should be V/CV (divide before the consonant), creating an open first syllable with a long vowel: ro-bot, mu-sic, ti-ger. If that doesn\'t produce a recognizable word, try VC/V (divide after the consonant), creating a closed first syllable with a short vowel: cam-el, riv-er, lim-it. V/CV is tried first because it\'s statistically more common in English. This "flex strategy" -- try open, then closed -- is one of the most important decoding tools for upper-level readers.',
        contrastPairs: ['ro-bot (open) vs rab-bit (closed)', 'pa-per (open) vs nap-kin (closed)', 'mu-sic (open) vs mus-cle (closed)', 'ti-ger (open) vs tig-er... no, it\'s ti-ger -- try open first!'],
        commonIrregulars: [
          'Many words could go either way: "lemon" = lem-on (closed, short e, correct) but a student might try le-mon (open, long e, wrong). This is where the "flex" comes in -- try one, check if it sounds like a real word.',
          '"Seven," "river," "never," "ever" -- all VC/V (closed first syllable) despite looking like they could be V/CV.'
        ]
      } },
      { pattern: 'y as a vowel', examples: 'my, fly (long i); happy, candy (long e)', notes: 'y at end of one-syllable word = /ai/; y at end of multisyllable word = /ee/.', deepDive: {
        whyItWorks: 'The letter y functions as a vowel when it appears at the end of a word or syllable (not at the beginning). The sound it makes depends on whether it\'s stressed: in one-syllable words, final y is stressed and says long i (my, fly, try, dry, sky, cry). In multisyllable words, final y is unstressed and says long e (happy, funny, baby, candy, party). This is consistent and reliable. The underlying principle: English doesn\'t like to end words in i, so y acts as the substitute. The y/i swap also explains spelling changes: happy -> happiness (y -> i before suffix), but play -> playing (y stays after a vowel).',
        commonIrregulars: [
          '"Y" at the beginning of words is a consonant: yes, you, year, yellow. Test: if you can\'t put "an" before it, y is a consonant.',
          'The y -> i rule for suffixes: carry -> carried, happy -> happiness, beauty -> beautiful. BUT y stays when the suffix starts with i: carry -> carrying (not "carriing"), baby -> babyish.',
          '"Shy," "dry," "sly" are one-syllable y-as-long-i words that students sometimes confuse with the multisyllable pattern.'
        ]
      } },
      { pattern: 'Prefix un-', examples: 'unhappy, undo, unfair', isMorphology: true, notes: 'First prefix. Meaning: "not" or "reverse." Teach that prefixes change meaning.', deepDive: {
        whyItWorks: 'Un- is the ideal first prefix to teach because it is transparent (easy to see), productive (attaches to hundreds of words), and meaningful (always means "not" or "reverse of"). It demonstrates the core morphological principle: words are built from meaningful parts, and those parts keep their spelling. "Unhappy" is un + happy, and both parts retain their form. This is the foundation for all later prefix/suffix work. It also introduces the concept that adding un- does not change the base word\'s part of speech: happy (adj) -> unhappy (adj), do (verb) -> undo (verb).',
        commonIrregulars: [
          '"Uncle," "under," "until," "unit," "unique" -- these start with "un" but it is NOT the prefix un-. The un- here is part of the base word. Students need to check: if I remove "un," is the remaining part a real word? uncle -> *cle? No. So it\'s not a prefix.',
          'Un- can mean "not" (unhappy, unfair, unkind) or "reverse" (undo, untie, unlock, unwrap). Both meanings are productive.'
        ]
      } },
      { pattern: 'Prefix re-', examples: 'redo, rewrite, replay', isMorphology: true, notes: 'Meaning: "again." High-frequency and transparent for young learners.', deepDive: {
        whyItWorks: 'Re- means "again" or "back" and is the second most common prefix in English. Like un-, it is transparent and doesn\'t change the base word\'s part of speech. It\'s excellent for building morphological awareness: students can generate dozens of words once they understand the pattern (reread, rewrite, redo, replay, rebuild, rethink, retell, reuse). Teach students to peel off the prefix to find the base word, then recombine: re + build = rebuild = "build again."',
        commonIrregulars: [
          '"Really," "read," "red," "rest," "reach," "ready" -- these start with "re" but it is NOT the prefix re-. Apply the same test: remove "re" and check if the remainder is a base word. really -> *ally? No prefix.',
          'Some re- words have shifted in meaning: "receive" (re + ceive, Latin "take back"), "remember" (re + member, "put back together"), "repair" (re + pair, "make ready again"). The prefix is historically present but not transparent to modern learners.'
        ]
      } },
    ]
  },
  {
    id: 'silent-e',
    name: 'Stage 4: Silent e (VCe)',
    description: 'Magic e / silent e makes the vowel say its name. A critical decoding milestone.',
    suggestedClasses: 'Camellia, Daisy',
    patterns: [
      { pattern: 'a_e', examples: 'cake, name, make, game, lake', notes: 'Most common VCe pattern. Contrast pairs: can/cane, tap/tape, cap/cape.', deepDive: {
        whyItWorks: 'When you see the pattern a-consonant-e, the a makes its long sound (says its name) and the e is silent. The silent e is a signal to the reader: "look back at the vowel and make it long." This convention exists because Middle English scribes needed a way to distinguish homophones and show vowel length after English pronunciation shifted dramatically (the Great Vowel Shift, 1400-1700). Words like "mat" and "mate" were once pronounced differently in ways that didn\'t need a spelling distinction, but as pronunciation changed, the spelling system adapted.',
        wordFamilies: ['-ake (cake, lake, make, bake, wake, shake, snake, stake, flake)', '-ane (cane, lane, mane, plane, crane)', '-ale (sale, male, tale, pale, whale, scale)', '-ate (late, gate, mate, plate, skate, state)', '-ame (name, game, same, came, flame, shame)', '-ade (made, shade, grade, trade, blade)'],
        contrastPairs: ['can/cane', 'tap/tape', 'cap/cape', 'mad/made', 'pan/pane', 'rat/rate', 'bat/bate', 'van/vane', 'pal/pale', 'stat/state'],
        samplePhrases: ['make it for me', 'take it with you', 'Don\'t be late!', 'give it a shake', 'save the date', 'not the same', 'such a shame', 'sit in the shade', 'wave to him'],
        commonIrregulars: [
          '"Have," "gave" -- "have" should rhyme with "cave" and "gave" by the pattern, but it doesn\'t. "Have" retains an older pronunciation.',
          '"Are," "were," "come," "some," "done," "gone," "love," "dove," "move," "prove" -- VCe words where the vowel does NOT say its name. Most are extremely common words whose pronunciation shifted over centuries while spelling was fixed by printing.',
          '"Make" -> "making" drops the e. "Make" -> "maker" drops the e. But "make" -> "makes" keeps the e (suffix starts with consonant).'
        ],
        guideRef: 'Guide 2, Lesson 2, p6-27',
        sortingTip: 'Sort by word family ending (-ake, -ate, -ame, -ane, -ade) and by short a vs long a (chat, clap, slam vs skate, rake, tale)'
      } },
      { pattern: 'i_e', examples: 'bike, kite, time, line, five', notes: 'Contrast: bit/bite, kit/kite, fin/fine, dim/dime.', deepDive: {
        whyItWorks: 'Same principle as a_e: i-consonant-e signals long i. The silent e flips the vowel from short to long. This pattern is extremely productive and reliable.',
        wordFamilies: ['-ike (bike, like, hike, spike, strike)', '-ine (line, fine, mine, vine, shine, pine)', '-ile (mile, tile, smile, pile, while)', '-ide (ride, side, hide, wide, slide, pride)', '-ime (time, dime, lime, slime, crime)', '-ite (kite, bite, quite, white, write, site)'],
        contrastPairs: ['bit/bite', 'kit/kite', 'fin/fine', 'dim/dime', 'rid/ride', 'slid/slide', 'shin/shine', 'slim/slime', 'rip/ripe', 'pin/pine'],
        samplePhrases: ['ride with me', 'side by side', 'wipe the tile', 'Is it time?', 'fly the kite', 'drive a mile'],
        commonIrregulars: [
          '"Give," "live" (verb), "forgive" -- short i despite the VCe pattern. These are Old English words that kept their short vowel.',
          '"Determine," "engine," "routine," "magazine," "examine" -- in multisyllable words, final -ine often has short i or schwa, NOT long i. The VCe rule is most reliable in one-syllable words.',
          '"Write," "knife," "scene" -- the silent e here is doing double duty (keeping the consonant pattern and signaling the vowel).'
        ],
        guideRef: 'Guide 2, Lesson 3, p28-48'
      } },
      { pattern: 'o_e', examples: 'home, bone, nose, rope, hope', notes: 'Contrast: hop/hope, not/note, rob/robe, cod/code.', deepDive: {
        whyItWorks: 'Same silent e principle applied to o. When you see o-consonant-e, the o says its name (long o). This is the third VCe pattern students learn, and by now the principle should be solidifying: silent e = look back, vowel is long.',
        wordFamilies: ['-oke (joke, smoke, spoke, broke, woke, poke)', '-one (bone, cone, stone, phone, zone, alone)', '-ope (hope, rope, slope, cope)', '-ose (nose, rose, close, those, chose)', '-ole (hole, mole, pole, role, whole, stole)', '-ome (home, dome, gnome, chrome)'],
        contrastPairs: ['not/note', 'hop/hope', 'rob/robe', 'cod/code', 'lob/lobe', 'slop/slope', 'mop/mope'],
        commonIrregulars: [
          '"Come," "some," "done," "gone," "none," "love," "dove," "above," "glove," "shove" -- o_e words with short u sound (/ʌ/). These are among the most common VCe exceptions. All are Old English words where the pronunciation shifted but the spelling stayed.',
          '"One," "once" -- o_e but starts with /w/ sound. Completely irregular.',
          '"Lose," "whose," "move," "prove" -- o_e but with /oo/ sound instead of long o. French-influenced pronunciation.'
        ],
        guideRef: 'Guide 2, Lesson 4, p49-69'
      } },
      { pattern: 'u_e', examples: 'cube, cute, mule, use, fuse', notes: 'Two pronunciations: /oo/ (rude, June) and /yoo/ (cube, cute).', deepDive: {
        whyItWorks: 'The u_e pattern is unique because long u has TWO sounds: /yoo/ (cube, cute, mule, mute, fume, huge) and /oo/ (rude, June, flute, rule, tube, prune). The /yoo/ pronunciation occurs after most consonants; the /oo/ pronunciation occurs after r, l, j, ch, and s (where the y-glide is difficult to pronounce). Think about it: "rude" is easier to say than "ryude." This isn\'t an irregularity -- it\'s a phonetic simplification based on tongue position.',
        wordFamilies: ['-ube (cube, tube)', '-ute (cute, mute, flute, brute)', '-ule (mule, rule, yule)', '-une (June, dune, tune, prune)', '-ude (rude, dude, crude)', '-use (fuse, use, fume, refuse)'],
        contrastPairs: ['cub/cube', 'tub/tube', 'cut/cute', 'us/use'],
        commonIrregulars: [
          'The /yoo/ vs /oo/ split: "cute" (/yoo/) vs "rude" (/oo/). The /yoo/ sound drops the y-glide after certain consonants (r, l, j, s, ch) for ease of articulation.',
          '"Minute" as noun (MIN-it) vs adjective (my-NEWT) -- same spelling, different pronunciation and meaning.',
          '"Sure," "pure" -- the u here makes /oo/ in some dialects and /yor/ in others.'
        ],
        guideRef: 'Guide 2, Lesson 5, p70-100',
        sortingTip: 'Sort by pronunciation: /yoo/ words (cube, cute, mule, mute, fume) vs /oo/ words (rude, tube, flute, tune, rule, June, prune)'
      } },
      { pattern: 'e_e (rare)', examples: 'Pete, these, Steve', notes: 'Uncommon but exists. Most long e is spelled ee, ea, or y.', deepDive: {
        whyItWorks: 'The e_e pattern exists but is rare because English already has multiple common ways to spell long e (ee, ea, y, ie, -ey). The reason e_e is uncommon is partly historical -- many Old English long e words shifted their spelling to ee or ea during the standardization of English spelling. When you encounter e_e, it functions the same as other VCe patterns, but students should know that long e is far more commonly spelled other ways.',
        commonIrregulars: [
          '"There," "where," "were" -- e_e but with /air/ or /er/ sound, not long e. These are function words with irregular pronunciations.',
          '"Here," "mere," "severe," "sincere" -- these actually work (long e), but the r changes the vowel slightly (r-controlled territory).'
        ]
      } },
      { pattern: '-dge', examples: 'bridge, judge, badge, hedge', notes: 'After a short vowel, /j/ is spelled -dge. After everything else, -ge.', deepDive: {
        whyItWorks: 'The d in -dge serves the same protective function as consonant doubling: it keeps the vowel short. Compare "badge" (short a, -dge) with "page" (long a, -ge). Without the d, "bage" would look like it rhymes with "page." The rule is simple and reliable: if the vowel before the /j/ sound is SHORT, use -dge. If the vowel is LONG, or there\'s a consonant between the vowel and the /j/ sound, use -ge. The d is a vowel protector, not a separately pronounced sound.',
        wordFamilies: ['-idge (bridge, ridge, fridge)', '-edge (edge, hedge, ledge, wedge, pledge)', '-udge (judge, fudge, budge, nudge, grudge, smudge)', '-odge (dodge, lodge)', '-adge (badge, cadge)'],
        commonIrregulars: [
          '"Age," "cage," "page," "stage," "rage," "wage" all use -ge (not -dge) because the a is long.',
          '"Huge," "luge" use -ge because the u is long.',
          '"Hinge," "cringe," "singe," "binge," "plunge," "lunge" use -ge because a consonant (n) comes between the vowel and the /j/ sound -- the vowel is already protected by the n.'
        ],
        guideRef: 'Guide 2, Lesson 8b, p151-163'
      } },
      { pattern: '-tch', examples: 'match, catch, kitchen, witch', notes: 'After a short vowel, /ch/ is spelled -tch. Exceptions: much, such, rich, which.', deepDive: {
        whyItWorks: 'The -tch rule works identically to -dge: the t protects the short vowel. Compare "match" (short a, -tch) with "much" -- wait, "much" breaks the rule. The -tch/-ch pattern is the same logic as -dge/-ge: short vowel = -tch (match, catch, fetch, stitch, hutch), long vowel or consonant before = -ch (beach, coach, pouch, lunch, march). The t is a vowel protector, signaling "this vowel is short."',
        commonIrregulars: [
          'The Big Five exceptions: "much," "such," "rich," "which," "touch" use -ch after a short vowel instead of -tch. These must be memorized. They are all extremely common Old English words that predate the spelling convention.',
          '"Sandwich," "ostrich" -- end in -ch, not -tch, because the i is in an unstressed syllable (essentially schwa).',
          '"Attach," "dispatch," "detach" -- the -tch is in a stressed syllable with a short vowel, so the rule works here.'
        ]
      } },
      { pattern: '-ce, -ge for soft sounds', examples: 'ice, face, age, cage, huge', notes: 'Silent e keeps c and g soft. Remove e and they harden: icing vs. ick.', deepDive: {
        whyItWorks: 'This is one of the silent e\'s OTHER jobs beyond making vowels long. The letters c and g have two sounds each: "hard" sounds (/k/ and /g/) before a, o, u, and "soft" sounds (/s/ and /j/) before e, i, y. This soft c/g rule was imported from French after the Norman Conquest (1066). When a word needs to end in a soft c or g sound, English adds a silent e to keep the consonant soft: "ice" (not "ic"), "age" (not "ag"). Remove that e and the pronunciation changes: compare "icing" (soft c maintained by the i) with "ic" (which would be hard c). This means silent e has at least 5 jobs: (1) make vowel long, (2) keep c soft, (3) keep g soft, (4) prevent words ending in v, (5) prevent words ending in u.',
        commonIrregulars: [
          'G is less reliable than c for soft/hard: "get," "give," "girl," "gift," "begin," "gear" all have hard g before e or i. These are Germanic words. The soft g rule works best with French/Latin-origin words.',
          '"Gauge" has a hard g before au -- the u after g sometimes serves to harden it (guard, guide, guess, guilt, guitar).',
          '"Gem," "general," "gentle" vs "get," "gecko" -- both have g before e, but only the French/Latin words follow the soft rule.'
        ],
        guideRef: 'Guide 2, Lessons 7a-8a, p116-150'
      } },
      { pattern: 'Suffix -ful', examples: 'helpful, careful, hopeful', isMorphology: true, notes: 'Meaning: "full of." Note: suffix has one l, word "full" has two.', deepDive: {
        whyItWorks: 'The suffix -ful means "full of" and always has ONE l, unlike the adjective "full" which has two. This is a historical simplification -- when "full" became a suffix, it lost its second l. This is a reliable rule with no exceptions: hopeful, careful, beautiful, wonderful, cheerful, grateful, playful all have one l. The reason it matters: students who understand that -ful is a suffix (a meaning unit) will spell it consistently and recognize it in new words. It also changes nouns to adjectives: hope (noun) -> hopeful (adjective), care (noun) -> careful (adjective).',
        commonIrregulars: [
          'When adding -ly to a -ful word, you get -fully with two l\'s: "hopefully," "carefully." This is NOT double l in -ful; it\'s -ful + -ly combining.',
          '"Awful" is the only -ful word that doesn\'t transparently mean "full of awe" in modern usage (it shifted from positive to negative meaning).',
          '"Beautiful" uses the French-origin "beauty" -> "beauti" (y changes to i) + "ful." The y -> i change is a regular spelling rule.'
        ]
      } },
      { pattern: 'Suffix -less', examples: 'helpless, careless, hopeless', isMorphology: true, notes: 'Meaning: "without." Pair with -ful for contrast.', deepDive: {
        whyItWorks: 'The suffix -less means "without" and is the perfect pair for -ful: hopeful (full of hope) vs hopeless (without hope). Teaching them together builds morphological reasoning: students see that meaning is constructed by combining parts. The base word stays the same; only the suffix changes the meaning. -Less, like -ful, changes nouns to adjectives. Pairing opposites is one of the most effective morphology teaching strategies because it makes the meaning of each suffix crystal clear through contrast.',
        commonIrregulars: [
          'Some -less words have no -ful counterpart: "reckless" (no "reckful"), "ruthless" (no "ruthful" in modern English, though it existed historically).',
          '"Regardless" is standard; "irregardless" is disputed (it has a double negative: ir- + -less both mean "without").',
          '"Nevertheless" and "homeless" -- -less attaches to different parts of speech in different words.'
        ]
      } },
    ]
  },
  {
    id: 'vowel-teams',
    name: 'Stage 5: Vowel Teams',
    description: 'Two vowels working together to make one sound. "When two vowels go walking, the first one does the talking" -- sometimes.',
    suggestedClasses: 'Daisy, Sunflower',
    patterns: [
      { pattern: 'ai, ay', examples: 'rain, play, wait, say, train', notes: 'ai = middle of word/syllable; ay = end of word/syllable.', deepDive: {
        whyItWorks: 'The position rule is reliable and logical: ai appears in the middle of a word or syllable (rain, wait, paint, chain, explain), while ay appears at the end (play, day, say, stay, gray, spray). Why? English borrowed this convention from French, where "ai" was a medial spelling and "ay" was a final spelling. The rule exists so that words don\'t end in the letter i (English avoids ending words in i, v, u, and j -- it always adds a "guard letter"). So "day" not "dai," "play" not "plai." Knowing this one positional rule eliminates guessing between two spellings.',
        wordFamilies: ['-ain (rain, main, train, brain, chain, plain, stain, drain, grain, strain)', '-ail (tail, mail, nail, rail, sail, trail, snail, fail)', '-ait (wait, bait)', '-ay (day, play, say, way, may, stay, pray, clay, gray, spray)'],
        contrastPairs: ['rain/ray', 'train/tray', 'pain/pay', 'main/may', 'sail/say', 'tail/tray'],
        commonIrregulars: [
          '"Said" -- the most common ai exception. Historically rhymed with "made," but pronunciation shifted while spelling stayed. Students simply have to know this one.',
          '"Again," "against" -- ai makes short e in these words. Another historical pronunciation shift.',
          '"Aisle" -- ai makes long i. This word came from French "aile" and is truly irregular.'
        ],
        guideRef: 'Guide 3, Lessons 1A-1B, p4-43'
      } },
      { pattern: 'ee, ea', examples: 'tree, read, seed, beach, sleep', notes: 'Both make /ee/. ea also makes /eh/ (bread, head) -- teach as a "tricky pair."', deepDive: {
        whyItWorks: 'Both ee and ea represent long e, but ea is the "tricky" one because it can make THREE sounds: long e (eat, read-present, beach, mean, clean), short e (bread, head, dead, spread, thread, weather, feather, leather), and even long a (steak, break, great -- very rare). The reason for ea\'s inconsistency is that these words came from different Old English vowels that merged in spelling but not in pronunciation. The ee spelling is more reliable (always long e), so if students are unsure, ee is the safer guess. Teaching ea\'s three sounds as a "choose and check" strategy builds flexible decoding.',
        wordFamilies: ['-ee: -eed (feed, seed, speed), -eep (deep, keep, sleep, sweep), -eet (feet, meet, sheet, street), -eel (feel, heel, wheel, steel), -een (green, seen, queen)', '-ea (long e): -ead (read, bead, lead-verb), -eal (seal, meal, deal, heal, steal), -eat (eat, meat, seat, beat, heat, treat), -each (teach, beach, reach, peach), -ean (bean, mean, clean, lean)'],
        commonIrregulars: [
          'Short e "ea" words: bread, head, dead, spread, thread, read (past tense), lead (noun), weather, feather, leather, breakfast, heavy, health, wealth, sweat, threat, deaf, death, breath. These are common and must be taught as a group.',
          'Long a "ea" words: steak, break, great, bear, pear, wear, tear (rip). Only about 8-10 words. Teach as a small set.',
          '"Read" is both long e (present: "I read books") and short e (past: "I read it yesterday"). Context determines pronunciation -- a genuinely challenging homograph.'
        ],
        guideRef: 'Guide 3, Lessons 2A-2B + 5A-5B, p44-84 + p151-194',
        sortingTip: 'Three-way ea sort: long e (eat, read, beach, mean) vs short e (bread, head, spread, thread) vs long a (steak, break, great). Then ee vs ea sort for long e words.'
      } },
      { pattern: 'oa, ow', examples: 'boat, snow, road, grow, coat', notes: 'oa = middle; ow = end. But ow also makes /ow/ (cow, now) -- context dependent.', deepDive: {
        whyItWorks: 'Same positional rule as ai/ay: "oa" appears in the middle (boat, road, coat, coal, toast, foam, groan), "ow" appears at the end (snow, grow, show, blow, low, flow, know). The complication: "ow" is a double agent. It spells long o at the end of words (snow, show) AND the /ow/ diphthong (cow, now, how, brown, town, down). There is no visual rule to distinguish them -- students must try both sounds and check which makes a real word. However, "oa" is always long o (no exceptions in common words), so it\'s the reliable one.',
        wordFamilies: ['-oa: -oat (boat, coat, goat, float), -oad (road, toad, load), -oal (coal, goal, foal), -oast (coast, toast, roast, boast)', '-ow (long o): bow, crow, flow, glow, grow, know, low, mow, row, show, slow, snow, throw, blow'],
        contrastPairs: ['bow (ribbon) / bow (bending)', 'row (a line) / row (a fight)', 'sow (plant seeds) / sow (female pig)'],
        commonIrregulars: [
          '"Ow" ambiguity: snow (/o/) vs cow (/ow/) -- the same spelling, two different sounds. Students must flex: try long o first, then try /ow/.',
          '"Broad" -- oa makes /aw/ instead of long o. One of the very few oa exceptions.',
          '"Sew" -- ow makes long o but is spelled ew. Truly irregular.',
          '"Know," "knot," "knowledge" -- the k in kn is silent (Stage 6), but the ow in "know" follows the regular long o pattern.'
        ],
        guideRef: 'Guide 3, Lessons 3A-3C, p85-124'
      } },
      { pattern: 'ie, igh', examples: 'pie, tie, high, night, light', notes: 'ie at end = long i. igh = long i (the gh is silent).', deepDive: {
        whyItWorks: 'The "igh" spelling has a fascinating history: the gh was once pronounced (as a throat sound, like Scottish "loch") in Old English. When that sound disappeared from standard English, the spelling remained. So "night" was once "niht" with a guttural h, and "light" was "liht." The gh became silent but stayed in the spelling as a fossil. The ie spelling (pie, tie, lie, die) is used at the end of short words. Confusingly, "ie" can also make long e (field, shield, belief, thief, piece) -- this is the "i before e" territory. The long i "ie" words are mostly one-syllable; the long e "ie" words are mostly multisyllable.',
        wordFamilies: ['-ight (light, night, right, sight, tight, bright, flight, fright, knight, might, slight, delight)', '-igh (high, sigh, thigh)', '-ie (long i): pie, tie, die, lie, vie, cries, tries, flies'],
        commonIrregulars: [
          '"Friend" -- ie makes short e. The only common word where ie does this.',
          '"Science," "patient," "ancient" -- ie makes /ee-eh/ across a syllable boundary (sci-ence), not a vowel team.',
          '"Lie" (recline) vs "lay" (put down) vs "lie" (untruth) -- confusing meanings, all with ie spelling.',
          '"ie" vs "ei" sorting: "i before e except after c" works for the /ee/ sound (believe, receive, ceiling) but not for other sounds (their, weird, either, neither, seize).'
        ],
        guideRef: 'Guide 3, Lessons 4-4B, p125-147'
      } },
      { pattern: 'ue, ew', examples: 'blue, true, new, grew, few', notes: 'Both make /oo/ or /yoo/. ew at end of words.', deepDive: {
        whyItWorks: 'Like ai/ay and oa/ow, there\'s a positional pattern: "ue" appears at the end of words (blue, true, clue, glue, due, argue, rescue, continue), and "ew" also appears at the end (new, few, grew, blew, threw, drew, chew, stew). Both can make /oo/ or /yoo/, following the same rule as u_e: after r, l, j, ch, s the y-glide drops (/oo/: blue, grew, chew), after other consonants it keeps the y-glide (/yoo/: few, new, view). English avoids ending words in "u," so "ue" and "ew" serve as acceptable word endings.',
        commonIrregulars: [
          '"Sew" makes /o/ not /oo/. This is a genuine outlier -- just memorize it.',
          '"Dew," "few," "new," "pew" have /yoo/. "Blew," "grew," "threw," "drew," "chew," "brew" have /oo/. The r/l before ew triggers the simpler /oo/.',
          '"Queue" -- borrowed from French, keeps the French double-ue spelling.'
        ]
      } },
      { pattern: 'oi, oy', examples: 'oil, boy, coin, enjoy, point', notes: 'oi = middle; oy = end. Diphthong (mouth moves during sound).', deepDive: {
        whyItWorks: 'Same positional pattern: "oi" in the middle (oil, coin, point, join, soil, boil, voice, choice, noise, moist), "oy" at the end (boy, toy, joy, enjoy, annoy, destroy, employ, royal). This is one of the most reliable positional rules in English -- there are essentially no exceptions in common words. The /oi/ sound is a diphthong, meaning the mouth changes position during the sound (it starts as /o/ and slides to /i/). Korean does not have this diphthong, so students may need practice holding both sounds together.',
        commonIrregulars: [
          'This is one of the MOST regular patterns in English. There are virtually no common exceptions to the oi-middle/oy-end rule.',
          '"Oyster" has oy in the middle -- but oy is at the start of the syllable (oy-ster), which counts as a beginning/end position.',
          '"Coin" vs "join" -- both regular. "Moisture" -- oi in multisyllable, still regular.'
        ]
      } },
      { pattern: 'ou, ow (diphthong)', examples: 'house, cow, out, down, cloud', notes: 'Same /ow/ sound. ow can be long o OR /ow/ -- must check context.', deepDive: {
        whyItWorks: 'The /ow/ diphthong (as in "ouch") follows the positional pattern: "ou" in the middle (house, out, cloud, found, sound, mouth, round, ground, shout), "ow" at the end (cow, now, how, bow, plow, wow, allow). The problem: "ow" does double duty as both long o (snow, grow) and /ow/ diphthong (cow, now). There is NO visual rule to distinguish them. Students must try both sounds and check which produces a real word. Teach "ow" as a "flip" sound: try one, if it doesn\'t make sense, try the other.',
        commonIrregulars: [
          '"Ow" ambiguity is the main challenge: "bow" can be /bo/ (ribbon) or /bow/ (to bend). "Row" can be /ro/ (a line) or /row/ (an argument). "Sow" can be /so/ (plant) or /sow/ (pig). Context determines pronunciation.',
          '"Ou" also has multiple sounds: /ow/ (house), /oo/ (soup, group, youth), /uh/ (touch, young, cousin, country), /o/ (shoulder, soul, though). The /ow/ sound is most common, but ou is genuinely one of the least reliable spellings in English.',
          '"Ough" is the most irregular spelling in English: through (/oo/), though (/o/), thought (/aw/), tough (/uf/), cough (/off/), bough (/ow/), thorough (/uh/). Seven different pronunciations for the same four letters.'
        ]
      } },
      { pattern: 'au, aw', examples: 'cause, saw, haul, draw, paw', notes: 'Both make /aw/. au = middle; aw = end or before n.', deepDive: {
        whyItWorks: 'Positional rule again: "au" in the middle (cause, haul, fault, sauce, launch, August, daughter, caught), "aw" at the end or before n (saw, draw, paw, claw, law, yawn, dawn, lawn, crawl, shawl). This is reasonably reliable. The /aw/ sound is the "open o" -- the mouth is more open than for long o. Korean speakers may confuse /aw/ with long o since the distinction doesn\'t exist in Korean.',
        commonIrregulars: [
          '"Laugh" -- au makes /a/ (short a) not /aw/. Same family: "draught" (British spelling of "draft").',
          '"Gauge" -- au makes long a. Irregular.',
          '"Because" -- au makes schwa in casual speech (buh-KUZ) but /aw/ in careful speech (bee-KAWZ).',
          '"Awe," "awesome" -- aw plus silent e, but aw already makes the sound without help from e. The e is there historically.'
        ]
      } },
      { pattern: 'oo', examples: 'moon (/oo/), book (/uh/)', notes: 'Two sounds! Long oo (food, school) vs. short oo (good, cook). Teach both.', deepDive: {
        whyItWorks: 'The "oo" spelling represents two distinct vowel sounds: long /oo/ (moon, food, school, room, cool, pool, spoon, tooth, goose, choose, loose) and short /oo/ (book, cook, good, wood, stood, look, hook, foot, wool). There is NO spelling rule to distinguish them -- you cannot tell from looking at the word which sound to use. However, there\'s a frequency pattern: long /oo/ is more common, so try it first. Short /oo/ tends to appear before k (book, cook, look, hook, took, shook) and d (good, wood, stood, hood, food -- wait, food is long). So -ook is usually short /oo/, but -ood and -ool can go either way.',
        commonIrregulars: [
          '"Blood" and "flood" -- oo makes short u (/ʌ/). These are the ONLY common words where oo makes this sound. Just memorize them.',
          '"Door" and "floor" -- oo makes /or/ sound (r-controlled). Also irregular.',
          '"Oo" before k is reliably short /oo/: book, cook, look, hook, took, brook, nook, crook. This is the most reliable sub-pattern.'
        ]
      } },
      { pattern: 'Suffix -er (comparative)', examples: 'taller, faster, bigger', isMorphology: true, notes: 'Meaning: "more." Doubling rule applies (big -> bigger). Drop e (large -> larger).', deepDive: {
        whyItWorks: 'The comparative -er follows a syllable-count rule that students find satisfying once they learn it: one-syllable adjectives add -er (tall/taller, fast/faster, short/shorter). Two-syllable adjectives ending in -y change y to i and add -er (happy/happier, easy/easier, funny/funnier). Two-syllable adjectives NOT ending in -y and all three+ syllable adjectives use "more" instead (more careful, more beautiful, more intelligent). The reason: English rhythm. "Beautifuller" has too many unstressed syllables -- it sounds awkward. "More beautiful" maintains the stress pattern. This is a genuine phonological rule, not just convention.',
        commonIrregulars: [
          'Irregular comparatives: good/better, bad/worse, far/farther (or further), little/less, many-much/more. These are suppletive forms -- entirely different words inherited from Old English.',
          'Two-syllable adjectives are the gray zone: "clever/cleverer" or "more clever"? Both are acceptable. "Simple/simpler" or "more simple"? Both work. Generally, if the two-syllable word ends in -y, -ow, -le, or -er, add -er. Otherwise, use "more."',
          'Spelling changes: big -> bigger (doubling), large -> larger (drop e), happy -> happier (y to i). All follow the regular suffix spelling rules.'
        ]
      } },
      { pattern: 'Suffix -est (superlative)', examples: 'tallest, fastest, biggest', isMorphology: true, notes: 'Meaning: "most." Same spelling change rules as -er.', deepDive: {
        whyItWorks: 'Identical syllable-count rule as -er: one syllable = -est (tallest), two syllables ending in -y = -iest (happiest), everything else = "most" (most beautiful). Same irregular forms: good/best, bad/worst, far/farthest. Teaching -er and -est together as a pair reinforces the system. The key insight for students: the NUMBER OF SYLLABLES in the base word determines whether you add a suffix or use a separate word. This is one of the clearest examples of a "secret rule" that native speakers follow instinctively but never learn explicitly.',
        commonIrregulars: [
          'Same irregulars as -er: good/best, bad/worst, far/farthest, little/least, many-much/most.',
          '"Most" is both a superlative marker and a word meaning "the majority." Context: "most beautiful" (superlative) vs "most people" (majority).'
        ]
      } },
    ]
  },
  {
    id: 'silent-letters',
    name: 'Stage 6: Silent Letters',
    description: 'Letters present in spelling but not pronounced. Often historical remnants.',
    suggestedClasses: 'Sunflower, Rose',
    patterns: [
      { pattern: 'kn-', examples: 'know, knee, knife, knock, knight', notes: 'k was originally pronounced in Old English. Silent before n.', deepDive: {
        whyItWorks: 'In Old English (before about 1400), the k in "kn" words WAS pronounced: "knight" sounded like "k-nicht" (with the ch as in Scottish "loch"). As English pronunciation simplified, the /k/ dropped before /n/ because the tongue movement was awkward. But spelling was already being standardized by printing presses (Caxton set up the first English press in 1476), so the k remained in the spelling. The k is a fossil of an older pronunciation. German kept the k: "Knecht" (servant, cognate of "knight"), "Knie" (knee), "Knoten" (knot). This is a powerful teaching moment: spelling preserves history.',
        commonIrregulars: [
          'ALL kn- words follow the rule (k is always silent before n at the start of a word). This is perfectly consistent: know, knee, knife, knit, knock, knob, knot, knack, knead, kneel, knelt.',
          'The k IS pronounced when kn appears in the middle of a word after a prefix: "acknowledge" (ac-KNOW-ledge) -- but this is because "know" is a separate morpheme.'
        ]
      } },
      { pattern: 'wr-', examples: 'write, wrong, wrap, wrist, wreck', notes: 'w was originally pronounced. Silent before r.', deepDive: {
        whyItWorks: 'Same historical story as kn-: Old English pronounced the w in "writan" (write), "wrang" (wrong), "wrecan" (wreck). The /w/ before /r/ was lost during Middle English because the lip rounding of /w/ followed by the tongue curl of /r/ was cumbersome. The spelling, already fixed in manuscripts, remained. Again, related languages kept the sound: compare "write" with German "reißen" (to tear/rip) -- the w dropped even in the German cognate.',
        commonIrregulars: [
          'Like kn-, this is perfectly consistent: ALL wr- words have silent w. write, wrong, wrap, wrist, wreck, wring, wreath, wrestle, wren, wrinkle, wrath.',
          '"Playwright" -- wr appears in the middle but the w is pronounced because "wright" (maker/builder) is a separate morpheme.'
        ]
      } },
      { pattern: 'gn-', examples: 'gnat, gnaw, gnome, sign, design', notes: 'g silent before n at start; both silent in -ign (sign, design).', deepDive: {
        whyItWorks: 'Another Old English pronunciation fossil. "Gnat" was once "g-nat" with a hard g. In the -ign pattern (sign, design, align, resign, assign, benign, malign), the g is silent in the base word but COMES BACK in related forms: sign/signal/signature, design/designate, resign/resignation, malign/malignant, benign/benignant. This is a perfect example of the morphological spelling principle: English preserves the spelling connection between related words even when pronunciation differs. Teach students: "If you\'re unsure about a silent letter, think of a related word where you CAN hear it."',
        commonIrregulars: [
          '"Foreign" has gn in the middle with silent g. But "foreigner" -- still silent.',
          '"Gnarly," "gnocchi" (Italian), "gnu" -- borrowed words that keep the gn spelling.',
          'The "think of a related word" strategy works beautifully here: sign->signal, reign->regal, bomb->bombard, muscle->muscular, column->columnist, autumn->autumnal, condemn->condemnation.'
        ]
      } },
      { pattern: '-mb', examples: 'lamb, comb, climb, thumb, bomb', notes: 'b silent after m at end of word. Exception: number (b is voiced).', deepDive: {
        whyItWorks: 'The b in -mb was once pronounced in Old English. "Lamb" was "lamb-uh" (two syllables). When the final unstressed vowel dropped, the /b/ after /m/ became difficult to articulate (both are made with closed lips, and the /m/ nasality makes the /b/ release inaudible). The b remained in spelling. Like gn-, the silent b often REAPPEARS in related words: bomb/bombard, crumb/crumble, thumb/thimble (historically related), numb/number (the b is pronounced in "number" because a vowel follows).',
        commonIrregulars: [
          '"Number," "timber," "member," "remember," "chamber" -- the b IS pronounced because a vowel follows the mb combination.',
          '"Plumber" -- the b is silent even though a vowel follows! This is because "plumber" comes from "plumb" (lead, as in lead pipes) + er suffix, and the b was already silent in "plumb."',
          '"Subtle" -- the b is silent. This came from Latin "subtilis" where the b was pronounced.'
        ]
      } },
      { pattern: 'gh', examples: 'ghost, night, thought, through', notes: 'Complex: gh = /g/ at start (ghost), silent in -ight, -ough patterns.', deepDive: {
        whyItWorks: 'The gh represents a sound that once existed in English but has disappeared: a guttural fricative (like the ch in Scottish "loch" or German "Bach"). In words like "night," "thought," "through," the gh was once a throat sound that distinguished these words from other words. When the sound vanished (by about 1500), the gh remained in spelling. In some words, gh shifted to /f/ instead of going silent: "enough," "rough," "tough," "cough," "laugh," "trough." At the start of words, gh makes /g/: "ghost," "ghastly" -- these are Flemish-influenced spellings (Flemish printers added the h).',
        commonIrregulars: [
          'gh = silent: night, light, right, fight, eight, weight, caught, taught, daughter, through, though, thorough, dough, although, straightforward',
          'gh = /f/: enough, rough, tough, cough, laugh, trough, draught (British spelling of draft)',
          'gh = /g/: ghost, ghastly, gherkin, ghee, Ghana -- mostly at the beginning of words',
          'The -ough nightmare: through (/oo/), though (/o/), thought (/aw/), tough (/uf/), cough (/off/), bough (/ow/), thorough (/uh/), hiccough (/up/) -- teach these as individual sight words, not as a pattern.'
        ]
      } },
      { pattern: '-lk, -lm, -lf', examples: 'walk, talk, calm, palm, half, calf', notes: 'l is silent in these combinations. Regional variation exists.', deepDive: {
        whyItWorks: 'The silent l in these combinations reflects a sound change where l vocalized (turned into a vowel-like sound and merged with the preceding vowel) before certain consonants. The l was once pronounced in "walk" (compare: "walking" where some dialects still have a slight l). The pattern: l is silent before k after a (walk, talk, chalk, stalk, balk), before m after a (calm, palm, psalm, balm, qualm, almond), and before f after a (half, calf, behalf). Notice the common thread: it\'s always after the vowel a. The l is NOT silent in "milk," "silk," "bulk," "help," "self," "film" because those have different vowels.',
        commonIrregulars: [
          '"Almond" -- some pronounce the l, some don\'t. Both are considered correct. This is a word in transition.',
          '"Salmon" -- l is silent (SAM-un). "Salmonella" -- l is pronounced! Because it comes from Daniel Salmon (a person\'s name).',
          '"Could," "would," "should" -- the l is silent. These originally had a pronounced l (compare German "soll" for "should").',
          '"Folk," "yolk" -- l is silent. But "folklore" and "yoke" (different word) can cause confusion.'
        ]
      } },
    ]
  },
  {
    id: 'r-controlled',
    name: 'Stage 7: R-Controlled Vowels',
    description: 'Bossy r changes the vowel sound. Neither short nor long -- a new sound.',
    suggestedClasses: 'Daisy, Sunflower, Rose',
    patterns: [
      { pattern: 'ar', examples: 'car, star, farm, park, card', notes: 'Makes /ar/ sound. Most consistent r-controlled vowel.', deepDive: {
        whyItWorks: 'When r follows a vowel, it changes (or "controls") the vowel sound so it\'s neither short nor long -- it becomes something new. The r-controlled "ar" makes /ar/ as in "father." This is the most reliable r-controlled vowel: ar almost always makes this sound. R-controlled vowels are one of the biggest sources of spelling errors because the r obscures the vowel identity. For Korean ELLs, r-controlled vowels are especially challenging because Korean has no equivalent sounds and the English /r/ itself is already difficult.',
        commonIrregulars: [
          '"War," "warm," "ward," "wart," "swarm," "dwarf," "quarter," "quart" -- after w (and qu), ar sounds like /or/. The w rounds the vowel.',
          '"Dollar," "collar," "popular," "regular" -- in unstressed syllables, ar reduces to schwa (/er/ sound). "Dollar" sounds like "doller."',
          '"Liar," "sugar," "calendar," "grammar" -- -ar at the end of unstressed syllables makes /er/, which is why students misspell these (writing "er" instead of "ar").'
        ]
      } },
      { pattern: 'or', examples: 'for, corn, sport, north, horn', notes: 'Makes /or/ sound. Also found in -ore (more, store).', deepDive: {
        whyItWorks: 'The "or" vowel makes the sound heard in "for," "born," "sport." It\'s distinct from "ar" and from "er/ir/ur." The -ore ending (more, store, core, bore, shore, score) is the same sound with a silent e that\'s historical rather than functional. English speakers rarely confuse ar and or in hearing, but or/er/ir/ur confusion is rampant in spelling because those three all sound identical in many dialects.',
        commonIrregulars: [
          '"Work," "word," "world," "worm," "worth," "worse," "worship" -- after w, or makes /er/ sound (same as "her"). The w shifts the vowel, just as it does with ar.',
          '"Doctor," "color," "flavor," "humor," "motor," "actor" -- unstressed -or at the end reduces to schwa. This is why students write "er" (it sounds the same).',
          '"Or" vs "ore" vs "oar" vs "our" vs "oor": four/for/fore, or/ore/oar, door/pour -- multiple spellings for the same sound. These must be learned by word family.'
        ]
      } },
      { pattern: 'er', examples: 'her, fern, term, verse, nerve', notes: 'Makes /er/ sound. Most common spelling of this sound in medial position.', deepDive: {
        whyItWorks: 'Here\'s the secret: er, ir, and ur ALL make the SAME sound (/er/ as in "butter"). You cannot distinguish them by listening -- "her," "sir," and "fur" have identical vowel sounds. So how do students know which spelling to use? Frequency and position help: "er" is the most common spelling overall and especially in suffixes (-er, -ever, -under, -over, -after, -under). "Ir" and "ur" are more common in base words. But ultimately, many er/ir/ur spellings must be learned through word families and morphological connections. The good news: the SOUND is consistent. Only the spelling varies.',
        commonIrregulars: [
          '"Were" -- er makes /er/ as expected, but the w might confuse students into expecting /wor/ (it doesn\'t work like "war").',
          '"Very," "every," "series" -- er in unstressed positions sometimes reduces to just schwa without the r.',
          '"Er" as a suffix always works: teacher, reader, worker, bigger, faster, under, over, after, sister, brother, mother, father, water.'
        ]
      } },
      { pattern: 'ir', examples: 'bird, girl, first, stir, dirt', notes: 'Same /er/ sound as er. Cannot distinguish by sound alone.', deepDive: {
        whyItWorks: 'Same sound as er, different spelling. "Ir" tends to appear in base words rather than suffixes: bird, girl, first, stir, dirt, skirt, birth, third, circle, firm, shirt, thirteen, thirty, birthday. The best strategy for remembering ir vs er vs ur: learn the common ir words as a group (there are fewer ir words than er words, so it\'s a manageable list), and teach morphological connections: "circle" -> "circular," "firm" -> "confirm," "first" -> "thirst" (same word family).',
        commonIrregulars: [
          '"Iron" -- ir makes /eye-urn/, not the /er/ sound. This is one of the few words where ir breaks the pattern.',
          '"Spirit," "miracle," "piranha" -- ir in unstressed syllables can make different vowel sounds.'
        ]
      } },
      { pattern: 'ur', examples: 'fur, burn, turn, hurt, nurse', notes: 'Same /er/ sound as er and ir. Spelling must be memorized.', deepDive: {
        whyItWorks: 'Third spelling of the same /er/ sound. "Ur" is common in base words: fur, burn, turn, hurt, nurse, church, curl, purple, surface, turkey, burger, turtle, disturb, return, Saturday. Teaching tip: group all three spellings (er, ir, ur) and have students sort known words by spelling. Over time, word-specific knowledge builds. The morphological principle helps here too: "turn" -> "return," "burn" -> "sunburn," "nurse" -> "nursery" -- the ur spelling stays consistent within word families.',
        commonIrregulars: [
          '"Bury" -- ur makes short e (/beh-ree/). This is genuinely irregular and must be memorized.',
          '"Jury," "fury," "curious," "during" -- ur makes /yoor/ or /oor/ in these words (the r-controlled u retains some of its long u quality when stressed).',
          '"Surprise," "purpose" -- ur in unstressed syllables reduces to schwa, sounding like "er."'
        ]
      } },
      { pattern: 'ar after w', examples: 'warm, war, ward, wart, swarm', notes: 'w changes ar to sound like /or/. Common exception to ar pattern.', deepDive: {
        whyItWorks: 'The w-effect is a reliable phonological rule: when w (or qu) precedes ar, the vowel shifts from /ar/ to /or/. This happens because the lip rounding of /w/ carries forward and rounds the vowel. Compare "car" (/ar/) with "war" (/or/) -- same spelling pattern, different sound due to the w. This is not random: it\'s a consistent sound change. Words affected: war, warm, ward, warn, wart, swarm, dwarf, quarter, quart. Teaching students to watch for w before ar eliminates a whole category of "irregular" readings.',
        commonIrregulars: [
          '"Wary," "aware," "beware" -- war here makes /air/ in many dialects, not /or/. The stress pattern matters.',
          '"Warp," "warrant," "warrior" -- these follow the /or/ pattern as expected.'
        ]
      } },
      { pattern: 'or after w', examples: 'word, work, world, worm, worth', notes: 'w changes or to sound like /er/. Must be memorized.', deepDive: {
        whyItWorks: 'Another w-effect: when w precedes or, the vowel shifts from /or/ to /er/. Compare "for" (/or/) with "word" (/er/) -- same "or" spelling but the w changes everything. Words affected: word, work, world, worm, worse, worst, worth, worship, worry. This is a smaller and less reliable pattern than w+ar, so many teachers simply teach these as a word family to memorize. The common thread: all start with "wor-" and make /wer/.',
        commonIrregulars: [
          '"Worn," "wore" -- wor here makes /or/, NOT /er/. So w+or is inconsistent: "word" (/wer/) vs "worn" (/wor/).',
          '"Sword" -- the w is completely silent (sounds like "sord"). Historical pronunciation fossil.'
        ]
      } },
      { pattern: 'Suffix -er (agent)', examples: 'teacher, reader, worker', isMorphology: true, notes: 'Meaning: "one who does." Different from -er comparative. Context determines meaning.', deepDive: {
        whyItWorks: 'The agent suffix -er means "one who does X": teach -> teacher (one who teaches), read -> reader (one who reads), work -> worker (one who works). This is different from the comparative -er (taller, faster). Students can distinguish by checking: does the base word describe an action (verb)? Then -er means the doer. Is the base word a quality (adjective)? Then -er means "more." The agent -er competes with -or (actor, doctor, inventor, governor) and -ar (liar, burglar, beggar). Generally: -er is the Germanic/native English suffix (most common), -or is the Latin suffix (used with Latin roots like "act," "invent," "govern"), -ar is rare.',
        commonIrregulars: [
          'The -er/-or choice: "teacher" (Germanic) vs "actor" (Latin). There\'s no reliable rule for when to use -or -- it depends on etymology. However, -er is always the safe guess since it\'s far more common.',
          '"Liar" uses -ar, not -er. "Beggar" also uses -ar. These are exceptions to memorize.',
          '"Writer" drops the e from "write" (vowel suffix rule). "Singer" keeps the base. "Runner" doubles the n (doubling rule). All regular suffix patterns apply.'
        ]
      } },
    ]
  },
  {
    id: 'other-vowels',
    name: 'Stage 8: Other Vowel Patterns',
    description: 'Advanced and less common vowel spellings that expand decoding flexibility.',
    suggestedClasses: 'Rose, Snapdragon',
    patterns: [
      { pattern: '-tion', examples: 'nation, action, station, motion', notes: 'Makes /shun/. Extremely common suffix pattern. Latin origin.', deepDive: {
        whyItWorks: 'The -tion ending makes /shun/ and is one of the most frequent suffixes in academic English. It comes from Latin and turns verbs into nouns: act -> action, create -> creation, educate -> education, invent -> invention. The "ti" making /sh/ seems random, but there\'s a rule: t + i + vowel = /sh/ in Latin-origin words. This also appears in "partial," "patient," "initial," "essential," "potential." For Korean students, this pattern is valuable because Korean academic vocabulary has many Chinese-origin words with similar suffix patterns (translating the concept of "word-part that changes verbs to nouns" transfers).',
        commonIrregulars: [
          '"Question" and "suggestion" -- tion here makes /chun/ not /shun/. This happens after s and certain other consonants.',
          '-tion vs -sion: "action" (/shun/) vs "vision" (/zhun/). The rule: -sion after a vowel makes /zhun/ (vision, television, occasion, division), -sion after a consonant makes /shun/ (tension, mansion, pension).',
          '-cian also makes /shun/: musician, physician, politician, electrician. This spelling indicates a person (like agent -er), not an abstract noun.'
        ]
      } },
      { pattern: '-sion', examples: 'vision, tension, mission, version', notes: 'Makes /zhun/ or /shun/. After a consonant = /shun/; after a vowel = /zhun/.', deepDive: {
        whyItWorks: 'The -sion ending has two pronunciations determined by what comes before it: after a vowel, it makes /zhun/ (vi-sion, tele-vi-sion, oc-ca-sion, divi-sion, deci-sion). After a consonant, it makes /shun/ (ten-sion, man-sion, pen-sion, expan-sion, exten-sion). The /zh/ sound (as in "measure") does not exist in Korean, so ELLs need explicit practice. After ss, -sion makes /shun/: mission, permission, admission, commission. The double s is a clue that the preceding vowel is short.',
        commonIrregulars: [
          '"Version," "immersion," "conversion" -- after r, -sion makes /zhun/ in some dialects and /shun/ in others.',
          'The -ssion spelling (mission, passion, session) always makes /shun/ because the ss indicates a short vowel + /sh/ combination.'
        ]
      } },
      { pattern: '-ous', examples: 'famous, nervous, generous', notes: 'Makes /us/. Latin adjective ending meaning "full of" or "having."', deepDive: {
        whyItWorks: 'The -ous suffix comes from Latin and means "full of" or "characterized by": fame -> famous (full of fame), nerve -> nervous (full of nerves), danger -> dangerous. It\'s purely an adjective-making suffix. The "ou" here does NOT make the /ow/ diphthong -- it makes /us/ (rhymes with "bus"). This is a reliable pronunciation: -ous ALWAYS sounds like /us/ in English. Knowing this suffix unlocks a huge number of academic adjectives: curious, various, previous, obvious, serious, continuous, enormous, ridiculous.',
        commonIrregulars: [
          'Spelling changes before -ous: "fame" -> "famous" (drop e), "glory" -> "glorious" (y -> i + ous), "courage" -> "courageous" (keep the e to keep g soft!), "advantage" -> "advantageous" (same e-keeping).',
          '"Gorgeous," "religious," "conscious," "precious" -- the vowel before -ous varies and must be learned per word.'
        ]
      } },
      { pattern: '-ture', examples: 'nature, picture, future, adventure', notes: 'Makes /cher/. Very common in academic vocabulary.', deepDive: {
        whyItWorks: 'The -ture ending makes /cher/ -- the t + u combination produces the /ch/ sound (same principle as -tion: t before certain vowels shifts pronunciation). This is a Latin suffix meaning "the act or result of": nature (act of being born, Latin "natus"), picture (act of painting, Latin "pictus"), future (about to be, Latin "futurus"), adventure (about to happen). Recognizing -ture as a suffix helps students decode long academic words: manufacture, temperature, architecture, agriculture, literature, furniture, structure.',
        commonIrregulars: [
          '"Mature," "premature" -- -ture makes /choor/ or /tyoor/ in some dialects rather than /cher/.',
          '"Overture," "aperture" -- less common words where -ture is the same suffix but students may not recognize the base word.'
        ]
      } },
      { pattern: '-ible, -able', examples: 'possible, comfortable, readable', notes: 'Both mean "can be done." -able more common with native English roots.', deepDive: {
        whyItWorks: 'Both -able and -ible mean "able to be" or "capable of": readable (able to be read), comfortable (able to give comfort), possible (able to be done), visible (able to be seen). The secret rule for which to use: -able attaches to complete English words (read+able, break+able, comfort+able, enjoy+able, wash+able, afford+able). -Ible attaches to Latin roots that are NOT standalone English words (poss+ible, vis+ible, aud+ible, ed+ible, cred+ible). Test: remove the suffix. If what remains is a recognizable English word, use -able. If not, use -ible. This rule works about 80% of the time.',
        commonIrregulars: [
          'Exceptions to the test: "accessible" (access IS a word but uses -ible), "flexible" (flex IS a word but uses -ible), "responsible" (response IS a word but uses -ible). These are Latinate words where the -ible spelling was established.',
          'Spelling changes: "make" -> "makable"? No -- "create" -> "creatable"? No -- these don\'t take -able because they already have other forms (creation). Generally words that already have -ation nouns don\'t also take -able.',
          '-able is productive (you can create new -able words: "Googleable," "microwaveable") while -ible is a closed set (no new -ible words are being coined).'
        ]
      } },
      { pattern: 'ei, ey', examples: 'ceiling, they, vein, obey', notes: '"i before e except after c" -- has many exceptions. Teach common words.', deepDive: {
        whyItWorks: 'The "i before e except after c" rule ONLY works for the /ee/ sound: believe, achieve, field, shield, piece, thief, brief, chief (i before e = /ee/) vs ceiling, receive, deceive, conceive, perceive (after c, e before i = /ee/). For ANY other sound, the rule does not apply: "their" (/air/), "weird" (/eer/), "height" (/eye/), "vein" (/ay/), "eight" (/ay/), "foreign" (/in/), "science" (/eye-eh/). The -ei- and -eigh- spellings for long /a/ come from Old French and Old Norse: veil, rein, vein, reign, eight, weigh, sleigh, freight, neighbor, weight. Teach these as a word family rather than trying to apply the "i before e" rule.',
        commonIrregulars: [
          '"Weird," "seize," "either," "neither," "protein," "caffeine" -- ei makes /ee/ WITHOUT being after c. These are genuine exceptions to the rule.',
          '"Species," "science," "sufficient," "ancient" -- "cie" exists despite the "except after c" rule. But here ie is not a vowel team; it spans a syllable boundary (sci-ence).',
          'The rule only covers about 75% of ei/ie words. Many linguists argue it causes more confusion than it prevents. Teaching common word families is more reliable than teaching the rule.'
        ],
        guideRef: 'Guide 3, Lesson 8, p206-217'
      } },
      { pattern: '-ough patterns', examples: 'though, through, thought, tough, cough', notes: 'Most irregular spelling in English. 7+ pronunciations. Teach as sight words.', deepDive: {
        whyItWorks: 'The -ough spelling is genuinely the most irregular pattern in English, with at least 7 pronunciations from the same four letters. This happened because "ough" originally represented a single sound (a guttural /x/ like Scottish "loch"), but as that sound disappeared, different words resolved the lost sound in different ways depending on dialect and era. The same thing happened differently in different regions, and all the variations got preserved in standard spelling. Teach these as individual words grouped by pronunciation, not as a pattern: /oo/ (through), /o/ (though, dough, although), /aw/ (thought, bought, sought, ought, brought), /uf/ (tough, rough, enough), /off/ (cough, trough), /ow/ (bough, plough), /uh/ (thorough, borough).',
        commonIrregulars: [
          'ALL -ough words are irregular in the sense that you cannot predict the pronunciation. This is the one pattern where the advice is genuinely "just memorize these."',
          '"Hiccough" is an alternate spelling of "hiccup" that makes the /up/ sound. Most style guides now prefer "hiccup."',
          '"Slough" has TWO pronunciations: /sloo/ (a marsh) and /sluf/ (to shed skin). Different meanings, different sounds, same spelling.'
        ]
      } },
      { pattern: 'Prefix dis-', examples: 'disagree, disappear, discover', isMorphology: true, notes: 'Meaning: "not" or "opposite of." Latin prefix.', deepDive: {
        whyItWorks: 'Dis- means "not," "opposite of," or "remove": disagree (not agree), disappear (opposite of appear), disconnect (remove the connection), dislike (not like), disorder (not in order), discomfort (remove comfort). It comes from Latin and is highly productive in English. The key spelling insight: dis- does NOT change its spelling regardless of what follows. Unlike some Latin prefixes that assimilate (in- becomes im- before p), dis- always stays dis-: disappoint, dissolve, different, difficult. This consistency makes it easy to teach.',
        commonIrregulars: [
          '"Dis" in "distance," "discover," "discuss," "distribute" -- these have the letters d-i-s but dis- is NOT a separable prefix (cover and cuss are not the relevant base words for these). Apply the test: remove "dis" and check if the remainder is a base word with related meaning.',
          'Dis- vs un-: both mean "not," but dis- tends to attach to Latinate words (disagree, disapprove, disconnect) while un- attaches to Germanic words (unhappy, unkind, unlock). There\'s overlap (dislike/unlike both exist).'
        ]
      } },
      { pattern: 'Prefix mis-', examples: 'mistake, misread, misunderstand', isMorphology: true, notes: 'Meaning: "wrongly." Old English origin.', deepDive: {
        whyItWorks: 'Mis- means "wrongly" or "badly": misread (read wrongly), misunderstand (understand wrongly), misspell (spell wrongly), misplace (place wrongly), mislead (lead wrongly), mismatch (match wrongly). Unlike dis- (Latin), mis- comes from Old English and attaches freely to English verbs. Spelling rule: mis- never doubles the s, even before s-words: mis + spell = misspell (the double s comes from the s in "spell" plus the s in "mis-," not from doubling). This is a common source of spelling errors.',
        commonIrregulars: [
          '"Misspell" has double s (mis + spell). "Missend," "misshape," "misstate," "misstep" also double s. The double s is NOT the prefix doubling; it\'s the prefix s meeting the base word s.',
          '"Mischief," "miscellaneous," "missile" -- these contain mis- as part of the root, not as a separable prefix.',
          '"Miss" (the title, or to miss someone) is NOT the prefix mis-. Different word entirely.'
        ]
      } },
    ]
  },
  {
    id: 'multisyllable',
    name: 'Stage 9: Multi-Syllable & Morphology',
    description: 'Advanced word attack using syllable division, morphemic analysis, and Greek/Latin roots.',
    suggestedClasses: 'Rose, Snapdragon',
    patterns: [
      { pattern: 'Syllable division: VC/CV', examples: 'rab-bit, kit-ten, hap-pen, com-mon', notes: 'Divide between two consonants. Each syllable has one vowel sound.', deepDive: {
        whyItWorks: 'When two consonants appear between two vowels (VCCV), divide between the consonants. This creates a closed first syllable with a short vowel. This is the most common syllable division pattern. The logic: by splitting between consonants, the first consonant "closes" the first syllable (keeping its vowel short), and the second consonant starts the next syllable. "Rabbit" = rab-bit (short a, short i). "Napkin" = nap-kin. "Basket" = bas-ket. This works because English fundamentally uses consonants to signal vowel length.',
        commonIrregulars: [
          'Digraphs never split: "mother" = moth-er (not mot-her), "teacher" = teach-er, "father" = fa-ther. The digraph stays together because it represents one sound.',
          'Consonant blends CAN split but usually don\'t if they\'re a natural onset: "pil-grim" (not "pilg-rim") because "gr" is a natural word-beginning blend. But "nap-kin" splits the blend because "pk" is not a natural onset.'
        ]
      } },
      { pattern: 'Syllable division: V/CV', examples: 'ba-by, mu-sic, ro-bot, ti-ger', notes: 'Try open syllable first (long vowel). If word is unrecognizable, try closed.', deepDive: {
        whyItWorks: 'When only ONE consonant appears between two vowels (VCV), the first division attempt should be V/CV (before the consonant), creating an open first syllable with a long vowel: ba-by (long a), mu-sic (long u), ro-bot (long o), ti-ger (long i). This is tried first because open first syllables are statistically more common in VCV words. If the long vowel doesn\'t produce a recognizable word, flex to VC/V (after the consonant): lem-on (not le-mon), riv-er (not ri-ver). This "flex and check" strategy is the core of multisyllabic decoding.',
        commonIrregulars: [
          'The flex strategy means no word is truly irregular for this pattern -- you just need to try both. "Robot" = ro-bot (open, works). "Robin" = rob-in (closed, works) not "ro-bin."',
          '"Cabin," "magic," "medal," "model," "level" -- all VC/V (closed first syllable) despite being VCV. Students try V/CV first, recognize it doesn\'t sound right, then flex to VC/V.'
        ]
      } },
      { pattern: 'Syllable division: VC/V', examples: 'cam-el, lem-on, riv-er, mod-el', notes: 'Closed first syllable (short vowel). Try if V/CV does not produce a real word.', deepDive: {
        whyItWorks: 'This is the backup strategy when V/CV fails. When dividing after the consonant creates a closed first syllable with a short vowel, some words become recognizable: "lemon" read as "lee-mon" (V/CV) doesn\'t sound right, but "lem-on" (VC/V) does. The key teaching point: this is not a separate rule to memorize. It\'s the second step in a decision process: (1) try open, (2) if that doesn\'t work, try closed, (3) check if it sounds like a real word. Building this flexibility prevents students from getting stuck on unknown words.',
        commonIrregulars: [
          'Some words genuinely could go either way: "tomato" = to-ma-to (open) in standard pronunciation, but the student can\'t know this until they try it.',
          '"Present" can be PREZ-ent (noun, VC/V) or pre-ZENT (verb, V/CV) depending on stress. Stress determines syllable division in some words.'
        ]
      } },
      { pattern: 'Compound words', examples: 'sunflower, basketball, bedroom', notes: 'Divide at the word boundary. Each part is a known word.', deepDive: {
        whyItWorks: 'Compound words are the easiest multisyllabic words to decode because each part is an already-known word: sun + flower, basket + ball, bed + room, any + thing, under + stand, every + body, with + out. The teaching power: compounds demonstrate that long words are built from smaller meaningful units. This is the simplest form of morphological analysis and it builds confidence: "If I can read the parts, I can read the whole word." It also introduces the idea that meaning is constructed by combining parts -- foundational for Latin/Greek root work.',
        commonIrregulars: [
          '"Breakfast" = break + fast (to break the overnight fast). The ea in "break" is irregular (/ay/ not /ee/), but the compound origin explains the word\'s meaning.',
          '"Cupboard" = cup + board, but pronounced "CUB-berd." The pronunciation has drifted from the spelling.',
          '"Understand," "outstanding," "withstand" -- the first part can be a preposition rather than a noun, which is less transparent.'
        ]
      } },
      { pattern: 'Latin roots', examples: 'port (carry), dict (say), struct (build), rupt (break)', isMorphology: true, notes: 'Unlock academic vocabulary. One root can generate dozens of words.', deepDive: {
        whyItWorks: 'About 60% of English words have Latin or Greek roots, and in academic texts, this rises to over 80%. Learning a single Latin root unlocks entire word families: "port" (carry) -> transport, import, export, report, portable, support, deport, opportunity, important. "Dict" (say/speak) -> predict, dictionary, contradict, verdict, dictate, diction, indict, dedicate. "Struct" (build) -> structure, construct, instruct, destroy (de-struct), obstruct, infrastructure, reconstruction. Teaching roots is the highest-leverage vocabulary strategy for upper-level students because it provides a system for approaching unknown words rather than requiring word-by-word memorization.',
        commonIrregulars: [
          'Root meanings can be opaque in modern English: "receive" (re + ceive, from Latin "capere" = take) doesn\'t transparently mean "take back." But knowing the root helps connect receive, conceive, deceive, perceive -- same root, related meanings.',
          'Some roots have multiple forms: "scribe/script" (write), "rupt/rupt" (break), "duct/duce" (lead), "spect/spec" (look). The variation comes from different Latin verb forms (present vs past participle).'
        ]
      } },
      { pattern: 'Greek combining forms', examples: 'bio (life), graph (write), tele (far), phon (sound)', isMorphology: true, notes: 'Common in science and technology vocabulary.', deepDive: {
        whyItWorks: 'Greek roots dominate science and technology vocabulary: biology (bio + logy = life + study), telephone (tele + phone = far + sound), photograph (photo + graph = light + writing), microscope (micro + scope = small + look). Unlike Latin prefixes/roots/suffixes which combine in that order, Greek combining forms can appear in either position: "graph" can be at the beginning (graphic) or end (photograph, telegraph). Teaching 20-30 common Greek forms unlocks hundreds of science words. For Korean students, many Korean scientific terms are also built from classical language roots (Chinese characters function similarly), so the concept of "root + root = compound meaning" transfers.',
        commonIrregulars: [
          'Greek vs Latin overlap: "aqua" (Latin for water) vs "hydro" (Greek for water) -- both are used in English. Generally, Greek roots dominate science (hydrogen, hydrate) while Latin roots dominate law and government (aquatic, aqueduct).',
          '"Phone" in everyday English means telephone, but the Greek root "phon" means sound (phonics, symphony, microphone, cacophony).'
        ]
      } },
      { pattern: 'Prefix + root + suffix', examples: 'un-break-able, dis-agree-ment, re-construct-ion', isMorphology: true, notes: 'Teach word building as a system. Peel off affixes to find the base.', deepDive: {
        whyItWorks: 'Mature readers decode complex words by recognizing morphemes (meaningful parts), not by sounding out letter by letter. "Uncomfortable" is processed as un + comfort + able, not u-n-c-o-m-f-o-r-t-a-b-l-e. Teaching the "peel and stick" strategy transforms long-word anxiety into a puzzle-solving game: (1) find the prefix(es) and peel them off, (2) find the suffix(es) and peel them off, (3) identify the base/root, (4) build the meaning from parts. "Reconstruction" = re (again) + con (together) + struct (build) + ion (noun) = "the act of building together again." This strategy transfers to every academic discipline.',
        commonIrregulars: [
          'Some words look decomposable but aren\'t: "uncle" is not un- + cle, "carpet" is not car + pet, "together" is not to + get + her. Students need to check that the parts make sense when combined.',
          'Spelling changes at morpheme boundaries: "admit" + -ion = "admission" (t changes to ss). "Decide" + -ion = "decision" (de changes to ci). These assimilations happen at Latin morpheme boundaries and must be learned through exposure.'
        ]
      } },
      { pattern: 'Assimilated prefixes', examples: 'in- -> im (impossible), il (illegal), ir (irregular)', isMorphology: true, notes: 'Prefix changes spelling to match root consonant. Advanced but high-value.', deepDive: {
        whyItWorks: 'Assimilated (or "absorbed") prefixes change their final consonant to match the first consonant of the root. This happens for ease of pronunciation: try saying "in-possible" vs "impossible" -- the m-before-p is easier for your mouth. The prefix in- (not) becomes: im- before b, m, p (impossible, imbalance, immature), il- before l (illegal, illuminate, illustrate), ir- before r (irregular, irresponsible, irrelevant). It stays in- elsewhere (inactive, incomplete, invisible). Similarly, ad- (toward) becomes: ac- (accept), af- (affirm), al- (allow), ap- (approve), as- (assign), at- (attract). The doubled consonant is the clue that an assimilated prefix is present.',
        commonIrregulars: [
          'The double consonant is the fingerprint: "illegal" = il + legal (not "ill + egal"), "accept" = ac + cept (not "acc + ept"), "attract" = at + tract. Once students recognize this pattern, words like "aggressive," "announce," "accomplish," "associate" become decomposable.',
          '"Inn," "ill," "add" -- these words just happen to start with double letters. They are NOT assimilated prefixes. Apply the test: is there a recognizable root after removing the possible prefix?'
        ]
      } },
      { pattern: 'Suffix -ly', examples: 'quickly, happily, gently', isMorphology: true, notes: 'Changes adjective to adverb. y -> i before -ly (happy -> happily).', deepDive: {
        whyItWorks: 'The suffix -ly converts adjectives to adverbs (telling HOW an action is done): quick -> quickly, gentle -> gently, happy -> happily, beautiful -> beautifully, careful -> carefully. Spelling rules: (1) usually just add -ly: sad -> sadly, nice -> nicely, brave -> bravely. (2) If the word ends in consonant + y, change y to i: happy -> happily, easy -> easily, angry -> angrily. (3) If the word ends in -le, change le to ly: gentle -> gently, simple -> simply, humble -> humbly. (4) If the word ends in -ic, add -ally: basic -> basically, dramatic -> dramatically, automatic -> automatically (exception: "publicly").',
        commonIrregulars: [
          '"Truly" (not "truely") -- drops the e. "Duly" -- also drops e. These are exceptions to the usual "just add -ly" pattern.',
          '"Wholly" (from "whole") -- drops the e AND changes pronunciation.',
          '"Good" -> "well" (not "goodly"). This is a suppletive form, like "better/best."',
          '"Friendly," "lonely," "lovely," "lively" -- these end in -ly but are adjectives, NOT adverbs. "She\'s friendly" not "she acts friendlily." These -ly words are formed from noun/adjective + ly with an adjectival meaning.'
        ]
      } },
      { pattern: 'Suffix -ment, -ness', examples: 'movement, happiness, darkness', isMorphology: true, notes: 'Noun-forming suffixes. -ment from verbs; -ness from adjectives.', deepDive: {
        whyItWorks: 'These are the two main noun-forming suffixes, and they attach to different word classes: -ment attaches to VERBS to make nouns (move -> movement, agree -> agreement, manage -> management, develop -> development, enjoy -> enjoyment). -Ness attaches to ADJECTIVES to make nouns (happy -> happiness, dark -> darkness, kind -> kindness, weak -> weakness, aware -> awareness). This distinction helps students predict which suffix to use: "Is the base word something you DO (verb)? Use -ment. Is it something you ARE (adjective)? Use -ness." Both suffixes mean roughly "the state or condition of."',
        commonIrregulars: [
          'Spelling with -ness after y: happy -> happiness (y -> i), busy -> business (y -> i, plus vowel reduction makes it "BIZ-ness"), lonely -> loneliness.',
          '-ment usually doesn\'t change the base word: enjoy -> enjoyment, amaze -> amazement (keeps the e!). "Judge" -> "judgment" or "judgement" -- both spellings are accepted.',
          '"Government" (not "governament") and "argument" (not "arguement") -- the base words "govern" and "argue" lose their final e before -ment. This is inconsistent with "amazement" where the e stays.'
        ]
      } },
    ]
  },
]

function DeepDivePanel({ data }: { data: PatternDeepDive }) {
  return (
    <div className="bg-indigo-50/50 border border-indigo-200 rounded-lg p-4 my-3">
      {/* Why It Works */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Lightbulb size={13} className="text-indigo-700 flex-shrink-0" />
          <span className="text-[11px] font-bold text-indigo-900">Why It Works This Way</span>
        </div>
        <p className="text-[11px] text-indigo-800 leading-relaxed">{data.whyItWorks}</p>
      </div>

      {/* Common Irregulars */}
      {data.commonIrregulars && data.commonIrregulars.length > 0 && (
        <div className="mb-3 bg-rose-50/60 rounded-lg p-3 border border-rose-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={12} className="text-rose-700 flex-shrink-0" />
            <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wide">Common Irregulars & Why</span>
          </div>
          <div className="space-y-1.5">
            {data.commonIrregulars.map((irr, i) => (
              <p key={i} className="text-[10px] text-rose-800 leading-relaxed pl-4 border-l-2 border-rose-200">{irr}</p>
            ))}
          </div>
        </div>
      )}

      {/* Word Families + Contrast Pairs grid */}
      {(data.wordFamilies || data.contrastPairs || data.samplePhrases) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.wordFamilies && data.wordFamilies.length > 0 && (
            <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
              <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide mb-2">Word Families</h4>
              <div className="space-y-1">
                {data.wordFamilies.map((wf, i) => (
                  <p key={i} className="text-[10px] text-text-primary leading-relaxed font-mono">{wf}</p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {data.contrastPairs && data.contrastPairs.length > 0 && (
              <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide mb-1.5">Contrast Pairs</h4>
                <div className="flex flex-wrap gap-1">
                  {data.contrastPairs.map((cp, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">{cp}</span>
                  ))}
                </div>
              </div>
            )}

            {data.samplePhrases && data.samplePhrases.length > 0 && (
              <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
                <h4 className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide mb-1.5">Practice Phrases</h4>
                <div className="flex flex-wrap gap-1">
                  {data.samplePhrases.map((ph, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-alt text-text-primary border border-border font-medium">{ph}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sorting Tip */}
      {data.sortingTip && (
        <div className="mt-3 bg-amber-50/80 rounded-lg p-2.5 border border-amber-200">
          <span className="text-[10px] font-bold text-amber-800">Sorting Activity: </span>
          <span className="text-[10px] text-amber-700 leading-relaxed">{data.sortingTip}</span>
        </div>
      )}

      {/* Guide Reference */}
      {data.guideRef && (
        <p className="mt-2 text-[9px] text-indigo-500 italic">Source: {data.guideRef}</p>
      )}
    </div>
  )
}

export function PhonicsSequence() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showMorphology, setShowMorphology] = useState(true)
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null)

  const filteredStages = useMemo(() => {
    if (!search.trim()) return PHONICS_STAGES
    const q = search.toLowerCase()
    return PHONICS_STAGES.map(stage => ({
      ...stage,
      patterns: stage.patterns.filter(p =>
        p.pattern.toLowerCase().includes(q) ||
        p.examples.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.hfWords || '').toLowerCase().includes(q) ||
        (p.deepDive?.whyItWorks || '').toLowerCase().includes(q) ||
        (p.deepDive?.commonIrregulars || []).some(ir => ir.toLowerCase().includes(q)) ||
        (p.deepDive?.wordFamilies || []).some(wf => wf.toLowerCase().includes(q)) ||
        (p.deepDive?.samplePhrases || []).some(ph => ph.toLowerCase().includes(q))
      )
    })).filter(s => s.patterns.length > 0)
  }, [search])

  const morphCount = PHONICS_STAGES.reduce((sum, s) => sum + s.patterns.filter(p => p.isMorphology).length, 0)
  const totalPatterns = PHONICS_STAGES.reduce((sum, s) => sum + s.patterns.length, 0)

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
        <h3 className="text-[14px] font-bold text-amber-900 mb-1">Systematic Phonics Scope & Sequence</h3>
        <p className="text-[12px] text-amber-800 leading-relaxed">
          Based on Science of Reading research and structured literacy principles. {totalPatterns} patterns across 9 stages, progressing from alphabet knowledge through multisyllabic morphology.
          Morphology concepts are integrated throughout (marked with gold badges). Click any pattern row to reveal the underlying rule, common irregulars with explanations, and teaching materials.
        </p>
        <p className="text-[10px] text-amber-700 mt-2 italic">
          Sources: Ehri (2005) phases of word reading; Moats (2020) Speech to Print; Scarborough (2001) reading rope.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patterns, examples, notes..."
            className="w-full pl-9 pr-3 py-2 text-[12px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-gold/30"
          />
        </div>
        <button
          onClick={() => setShowMorphology(!showMorphology)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
            showMorphology ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-surface-alt text-text-secondary border border-border'
          }`}
        >
          <Puzzle size={13} />
          Highlight Morphology ({morphCount})
        </button>
      </div>

      <div className="space-y-3">
        {filteredStages.map(stage => {
          const isExp = expanded === stage.id
          const morphInStage = stage.patterns.filter(p => p.isMorphology).length
          return (
            <div key={stage.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isExp ? null : stage.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-alt/50 transition-colors"
              >
                {isExp ? <ChevronDown size={16} className="text-navy flex-shrink-0" /> : <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-bold text-navy">{stage.name}</span>
                    {morphInStage > 0 && showMorphology && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                        {morphInStage} morphology
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">{stage.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-[10px] text-text-tertiary">{stage.patterns.length} patterns</span>
                </div>
              </button>

              {isExp && (
                <div className="border-t border-border">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="bg-surface-alt/60 border-b border-border">
                        <th className="text-left px-5 py-2 font-semibold text-text-secondary w-[160px]">Pattern</th>
                        <th className="text-left px-3 py-2 font-semibold text-text-secondary w-[240px]">Examples</th>
                        <th className="text-left px-3 py-2 font-semibold text-text-secondary">Teaching Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.patterns.map((p, i) => {
                        const guideKey = `${stage.id}-${i}`
                        const isGuideExpanded = expandedGuide === guideKey
                        return (
                          <React.Fragment key={i}>
                            <tr className={`border-b border-border/50 last:border-0 ${
                              p.isMorphology && showMorphology ? 'bg-amber-50/60' : ''
                            } ${p.deepDive ? 'cursor-pointer hover:bg-surface-alt/40' : ''}`}
                              onClick={() => p.deepDive && setExpandedGuide(isGuideExpanded ? null : guideKey)}
                            >
                              <td className="px-5 py-2.5 font-semibold text-navy align-top">
                                <div className="flex items-center gap-1.5">
                                  {p.isMorphology && showMorphology && (
                                    <Puzzle size={11} className="text-amber-600 flex-shrink-0" />
                                  )}
                                  {p.pattern}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-text-primary align-top font-mono text-[10.5px]">{p.examples}</td>
                              <td className="px-3 py-2.5 text-text-secondary align-top leading-relaxed">
                                {p.notes || '--'}
                                {p.deepDive && (
                                  <span className="ml-2 text-[9px] text-indigo-600 font-medium">
                                    {isGuideExpanded ? '[-] hide deep dive' : '[+] why this works'}
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isGuideExpanded && p.deepDive && (
                              <tr>
                                <td colSpan={3} className="px-5 py-0 border-b border-border/50">
                                  <DeepDivePanel data={p.deepDive} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredStages.length === 0 && (
        <div className="text-center py-10 text-[13px] text-text-tertiary">
          No patterns match "{search}". Try a different search term.
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 2. PHONICS INSTRUCTIONAL STRATEGIES GUIDE
// Research-backed strategies for structured literacy instruction
// ═══════════════════════════════════════════════════════════════════

interface Strategy {
  id: string
  name: string
  category: string
  description: string
  steps: string[]
  whenToUse: string
  researchBase: string
  materials?: string
}

const STRATEGY_CATEGORIES = [
  'All',
  'Lesson Structure',
  'Encoding',
  'Phonemic Awareness',
  'Decoding / Fluency',
  'Connected Text Reading',
  'Vocabulary / Morphology',
]

const STRATEGIES: Strategy[] = [
  {
    id: 'og',
    name: 'Orton-Gillingham Lesson Flow',
    category: 'Lesson Structure',
    description: 'A systematic, multisensory lesson framework that moves from phoneme awareness through connected text. Each lesson reviews previously taught patterns, introduces new material through visual-auditory-kinesthetic channels, and practices in context.',
    steps: [
      'Visual Drill (2 min): Flash grapheme cards. Students say the sound for each letter/pattern shown.',
      'Auditory Drill (2 min): Teacher says a sound. Students write the grapheme(s) on whiteboards.',
      'Review & Warm-Up (3 min): Read and spell words with previously taught patterns.',
      'New Concept Introduction (5-8 min): Teach one new pattern using multisensory approach -- see it, say it, hear it, write it.',
      'Word Reading Practice (5 min): Students decode new words with the target pattern (word list or word cards).',
      'Word Spelling Practice (5 min): Students encode words with the target pattern using SOS or dictation.',
      'Sentence/Text Reading (5 min): Students read decodable sentences or passages containing the pattern.',
      'Sentence Dictation (3 min): Teacher dictates 1-2 sentences; students write, applying all learned patterns.',
    ],
    whenToUse: 'Daily structured phonics lessons. Works for whole-class or small-group instruction. Especially effective for students in WIDA L1-L3 who benefit from explicit, structured input.',
    researchBase: 'Orton (1937); Gillingham & Stillman (1960). Meta-analysis by Ritchey & Goeke (2006) confirms effectiveness for struggling readers. Aligned with IDA structured literacy principles.',
    materials: 'Grapheme cards, phoneme cards, whiteboards and markers, decodable texts, dictation paper'
  },
  {
    id: 'sos',
    name: 'Simultaneous Oral Spelling (SOS)',
    category: 'Encoding',
    description: 'A multisensory spelling procedure where students say the word, name each letter while writing it, and then read the word back. Engages auditory, visual, and kinesthetic pathways simultaneously to strengthen orthographic memory.',
    steps: [
      'Teacher says the word clearly. Student repeats the word.',
      'Student segments the word into individual sounds (phonemes).',
      'Student names each letter while writing it, saying the letter name (not the sound) as pen touches paper.',
      'Student reads the completed word aloud.',
      'Student checks spelling against a model. If incorrect, student covers the word and tries again from step 1.',
      'Repeat 3 successful trials to build automaticity.',
    ],
    whenToUse: 'During the encoding portion of any phonics lesson. Ideal for practicing newly taught patterns. Use when students can decode a pattern but struggle to spell it. Particularly powerful for ELLs who need the auditory reinforcement of letter names.',
    researchBase: 'Cox (1992) OG methodology; supported by dual-coding theory (Paivio, 1986). The simultaneous engagement of multiple modalities strengthens connections between phonemes and graphemes.',
  },
  {
    id: 'elkonin',
    name: 'Elkonin Boxes (Sound Boxes)',
    category: 'Phonemic Awareness',
    description: 'A visual-kinesthetic tool for phoneme segmentation. Students push tokens into boxes (one per sound) to make abstract phonemes concrete and countable. Transitions from tokens to letters to bridge phonemic awareness and phonics.',
    steps: [
      'Draw boxes on a whiteboard or use a printed template -- one box per sound (NOT per letter).',
      'Teacher says a word slowly. Students repeat it.',
      'Students push a token (counter, chip) into each box as they say each sound.',
      'Example: "ship" = 3 boxes: /sh/ - /i/ - /p/ (sh is one sound, one box).',
      'Once proficient with tokens, transition to writing letters in boxes instead.',
      'Progress to spelling without boxes as students internalize the segmentation process.',
    ],
    whenToUse: 'Phonemic awareness warm-ups (2-3 minutes). When introducing new phoneme patterns. When students struggle to segment or count sounds. Essential before expecting students to spell unfamiliar words.',
    researchBase: 'Elkonin (1963, 1973). Validated by the National Reading Panel (2000) as an effective phonemic awareness strategy. Clay (1993) adapted for Reading Recovery.',
    materials: 'Sound box templates (laminated), counters or tokens, whiteboards'
  },
  {
    id: 'heggerty',
    name: 'Heggerty Phonemic Awareness Routine',
    category: 'Phonemic Awareness',
    description: 'A fast-paced, whole-class oral routine that systematically builds phonemic awareness through daily practice with rhyming, blending, segmenting, and manipulating sounds. No print involved -- purely auditory.',
    steps: [
      'Rhyme Recognition/Production (1 min): "Does cat rhyme with hat?" then "Tell me a word that rhymes with sun."',
      'Onset-Rime Blending (1 min): Teacher says /s/ ... /un/. Students blend: "sun!"',
      'Phoneme Blending (1 min): Teacher says /b/ /e/ /d/. Students blend: "bed!"',
      'Phoneme Segmenting (1 min): Teacher says "map." Students segment: /m/ /a/ /p/ (3 sounds!).',
      'Phoneme Adding/Deleting (1-2 min): "Say meat. Now say it without /m/." Students: "eat!"',
      'Phoneme Substituting (1-2 min): "Say cat. Change /k/ to /b/." Students: "bat!"',
      'Total daily time: 8-10 minutes. Pace should be brisk with choral responses.',
    ],
    whenToUse: 'Daily warm-up before phonics instruction. Every lesson, every day, for Lily through Daisy levels. Higher classes can do abbreviated versions focusing on manipulation and substitution. Critical for ELLs who may have phonemes in English that do not exist in Korean (l/r, v/b, f/p, th).',
    researchBase: 'Heggerty (2003) curriculum; supported by NRP (2000) finding that phonemic awareness instruction improves reading and spelling. Ball & Blachman (1991) demonstrated that segmentation training with letters accelerates reading.',
  },
  {
    id: 'word-chains',
    name: 'Word Chains / Word Ladders',
    category: 'Decoding / Fluency',
    description: 'Students change one sound (or letter) at a time to transform one word into another. Builds flexible decoding by forcing students to attend to each position in a word. Develops both reading and spelling automaticity.',
    steps: [
      'Write a starting word on the board. Students read it and write it.',
      'Give a clue: "Change one sound to make a new word." Example: cat -> hat (change /k/ to /h/).',
      'Students write the new word. Check and discuss which sound changed and where.',
      'Continue the chain: hat -> hot -> hop -> mop -> map -> nap -> nip -> tip ...',
      'For advanced students: change position of change (initial, medial, final) unpredictably.',
      'Challenge extension: include digraphs, blends, or vowel teams in the chain.',
    ],
    whenToUse: 'During the word reading/spelling portion of phonics lessons. Excellent for transitions and warm-ups. Works at every level -- adjust complexity by choosing patterns from the current stage. Great for mixed-level groups since the teacher controls difficulty in real time.',
    researchBase: 'McCandliss, Beck, Sandak & Perfetti (2003) demonstrated word building activities activate orthographic learning. Rasinski (2003) includes word ladders as a fluency-building activity.',
    materials: 'Whiteboards, letter tiles or magnetic letters (optional)'
  },
  {
    id: 'decodable-text',
    name: 'Decodable Text Routine',
    category: 'Connected Text Reading',
    description: 'A structured approach to reading texts controlled for specific phonics patterns. Students apply newly learned decoding skills in connected text rather than isolated words, building the bridge from phonics to fluent reading.',
    steps: [
      'Pre-read: Introduce 2-3 high-frequency words that are not yet decodable ("the," "said"). Use flashcards.',
      'Preview: Briefly discuss the topic or look at illustrations. Do NOT pre-read the text to students.',
      'First read (whisper read): Students read the text quietly to themselves. Teacher monitors and notes errors.',
      'Check comprehension: Ask 2-3 simple questions about the text content.',
      'Second read (partner read): Students take turns reading aloud to a partner. Partner follows along and gives feedback.',
      'Word work: Pull 3-5 words from the text containing the target pattern. Students sort, spell, or discuss them.',
      'Optional third read: For fluency building, students reread aiming for smoother, more expressive reading.',
    ],
    whenToUse: 'After teaching a new phonics pattern and practicing it in isolation. The decodable text should match the patterns taught -- students should be able to decode 90%+ of words. For WIDA L1-L2, pair with picture support. For L3+, transition toward leveled readers as decoding solidifies.',
    researchBase: 'Juel & Roper-Schneider (1985) showed decodable texts promote application of phonics. Cheatham & Allor (2012) confirmed benefits for struggling readers. Price-Mohr & Price (2020) supports phonically controlled texts for early readers.',
  },
  {
    id: 'structured-dictation',
    name: 'Structured Dictation',
    category: 'Encoding',
    description: 'Teacher dictates sounds, words, and sentences that students write. Progresses from single sounds to words to connected sentences. Tests and reinforces all previously taught patterns while developing transcription fluency.',
    steps: [
      'Sound dictation (2 min): Teacher says a phoneme. Students write the grapheme(s). "Write the sound /sh/."',
      'Word dictation (3-4 min): Teacher says a word. Students repeat, segment, and write. Include 3-5 words mixing review and new patterns.',
      'Students finger-tap or use Elkonin boxes if needed for segmentation support.',
      'Sentence dictation (3-4 min): Teacher reads a sentence at normal pace. Students repeat. Teacher re-reads phrase by phrase. Students write.',
      'Students self-check against a model. Circle errors and write corrections above.',
      'Teacher collects or reviews to identify patterns of errors for reteaching.',
    ],
    whenToUse: 'End of every phonics lesson. Assessment tool -- errors reveal which patterns need reteaching. Build complexity: Lily/Camellia = CVC words + simple sentences; Daisy/Sunflower = multisyllabic words + compound sentences; Rose/Snapdragon = academic vocabulary + complex sentences.',
    researchBase: 'Moats (2020) emphasizes dictation as essential encoding practice. Graham & Hebert (2010) meta-analysis shows writing about text improves reading comprehension. Spelling is reading in reverse -- both draw on the same orthographic knowledge.',
    materials: 'Dictation paper (or composition books), pencils'
  },
  {
    id: 'morphology',
    name: 'Morphology Instruction Routine',
    category: 'Vocabulary / Morphology',
    description: 'Explicit instruction in prefixes, suffixes, roots, and word-building. Students learn to break words into meaningful parts, dramatically expanding vocabulary and reading comprehension. Particularly powerful for ELLs because morphemic analysis transfers across languages.',
    steps: [
      'Introduce the target morpheme (prefix, suffix, or root). Write it. Define its meaning.',
      'Show 4-6 example words containing the morpheme. Students identify the morpheme in each word.',
      'Word Building: Start with a base word. Add the target morpheme. Discuss how meaning changes.',
      'Word Sort: Students sort a mix of words -- those containing the target morpheme and distractors.',
      'Word Matrix/Web: Place the root in the center. Students brainstorm words using that root with various affixes.',
      'Apply in context: Students find words with the morpheme in their current reading or write sentences using 3 new words.',
      'Word Sums: teach + er = teacher; un + help + ful = unhelpful. Formalize the word-building process.',
    ],
    whenToUse: 'Start integrating from Stage 2 (closed syllables) with inflectional suffixes -s, -ed, -ing. Increase complexity through the stages. By Rose/Snapdragon, students should be analyzing Latin and Greek roots. Dedicate 5-10 minutes 2-3 times per week. Especially valuable for WIDA L3-L5 students who need academic vocabulary.',
    researchBase: 'Bowers, Kirby & Deacon (2010) meta-analysis: morphological instruction benefits reading, spelling, and vocabulary. Carlisle (2010) demonstrated morphological awareness predicts reading comprehension. Kieffer & Lesaux (2012) confirmed benefits for ELLs specifically.',
  },
]

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  'Lesson Structure': Layers,
  'Encoding': FileText,
  'Phonemic Awareness': Volume2,
  'Decoding / Fluency': TrendingUp,
  'Connected Text Reading': BookOpen,
  'Vocabulary / Morphology': Puzzle,
}

export function PhonicsStrategies() {
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = filter === 'All' ? STRATEGIES : STRATEGIES.filter(s => s.category === filter)

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
        <h3 className="text-[14px] font-bold text-blue-900 mb-1">Phonics Instructional Strategies</h3>
        <p className="text-[12px] text-blue-800 leading-relaxed">
          8 research-backed strategies for structured literacy instruction. Each includes step-by-step procedures,
          guidance on when to use, and connections to the Science of Reading evidence base.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {STRATEGY_CATEGORIES.map(cat => {
          const Icon = cat === 'All' ? Target : (CATEGORY_ICONS[cat] || Target)
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                filter === cat ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
              }`}
            >
              <Icon size={12} /> {cat}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(strategy => {
          const isExp = expanded === strategy.id
          const Icon = CATEGORY_ICONS[strategy.category] || Target
          return (
            <div key={strategy.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(isExp ? null : strategy.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-alt/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy/10 flex-shrink-0">
                  <Icon size={16} className="text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-navy">{strategy.name}</span>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary border border-border">{strategy.category}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{strategy.description}</p>
                </div>
                {isExp ? <ChevronDown size={16} className="text-navy flex-shrink-0" /> : <ChevronRight size={16} className="text-text-tertiary flex-shrink-0" />}
              </button>

              {isExp && (
                <div className="border-t border-border px-5 py-4 space-y-4">
                  <div>
                    <p className="text-[12px] text-text-primary leading-relaxed">{strategy.description}</p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-navy uppercase tracking-wider mb-2">Step-by-Step Procedure</h4>
                    <div className="space-y-1.5">
                      {strategy.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy text-white text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-[11.5px] text-text-primary leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1.5">When to Use</h4>
                      <p className="text-[11px] text-green-900 leading-relaxed">{strategy.whenToUse}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-purple-800 uppercase tracking-wider mb-1.5">Research Base</h4>
                      <p className="text-[11px] text-purple-900 leading-relaxed">{strategy.researchBase}</p>
                    </div>
                  </div>

                  {strategy.materials && (
                    <div className="bg-surface-alt rounded-lg p-3">
                      <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Materials Needed</h4>
                      <p className="text-[11px] text-text-primary">{strategy.materials}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
// 3. ASSESSMENT LITERACY GUIDE
// Understanding formative, summative, and diagnostic assessment
// ═══════════════════════════════════════════════════════════════════

interface AssessmentSection {
  id: string
  title: string
  icon: typeof BarChart3
  content: React.ReactNode
}

function AssessmentSectionCard({ title, children, color = 'navy' }: { title: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-4">
      <h4 className="text-[13px] font-bold text-navy mb-3">{title}</h4>
      <div className="text-[12px] text-text-primary leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  )
}

export function AssessmentLiteracy() {
  const [section, setSection] = useState<string>('types')

  const sections = [
    { id: 'types', label: 'Assessment Types', icon: Layers },
    { id: 'orf', label: 'Interpreting ORF Data', icon: BarChart3 },
    { id: 'grouping', label: 'Data-Driven Grouping', icon: Target },
  ]

  return (
    <div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
        <h3 className="text-[14px] font-bold text-green-900 mb-1">Assessment Literacy Guide</h3>
        <p className="text-[12px] text-green-800 leading-relaxed">
          Understanding when and how to use different assessment types, interpreting data, and using results to drive instruction.
          Grounded in curriculum-based measurement (CBM) and evidence-based practice.
        </p>
        <p className="text-[10px] text-green-700 mt-2 italic">
          Sources: National Reading Panel (2000); Hasbrouck & Tindal (2017) ORF norms; Deno (1985) CBM framework.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
              section === s.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}
          >
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      {section === 'types' && (
        <div>
          <AssessmentSectionCard title="Three Types of Assessment">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-blue-900 mb-1">Diagnostic</h5>
                <p className="text-[11px] text-blue-800 mb-2">Identifies specific strengths and gaps BEFORE instruction begins. Answers: "What does this student know and what do they need?"</p>
                <div className="text-[10px] text-blue-700 space-y-0.5">
                  <p><span className="font-semibold">When:</span> Start of year, new student intake, after a student plateaus</p>
                  <p><span className="font-semibold">Examples:</span> Phonics screener, WIDA placement test, spelling inventory, running record</p>
                  <p><span className="font-semibold">In our app:</span> Level test results, WIDA profiles, reading assessment baseline</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-amber-900 mb-1">Formative</h5>
                <p className="text-[11px] text-amber-800 mb-2">Monitors learning DURING instruction. Quick, frequent, low-stakes checks. Answers: "Is the student learning what I am teaching right now?"</p>
                <div className="text-[10px] text-amber-700 space-y-0.5">
                  <p><span className="font-semibold">When:</span> Every lesson, weekly, during practice activities</p>
                  <p><span className="font-semibold">Examples:</span> Exit tickets, whiteboard checks, thumbs up/down, observation notes, weekly spelling tests, ORF progress monitoring</p>
                  <p><span className="font-semibold">In our app:</span> Quick grades, behavior observations, ORF weekly checks, standards checklist</p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-purple-900 mb-1">Summative</h5>
                <p className="text-[11px] text-purple-800 mb-2">Evaluates cumulative learning AFTER a unit or period. High-stakes, formal. Answers: "Has the student mastered the learning targets?"</p>
                <div className="text-[10px] text-purple-700 space-y-0.5">
                  <p><span className="font-semibold">When:</span> End of unit, end of term, end of year</p>
                  <p><span className="font-semibold">Examples:</span> Unit tests, final exams, portfolio reviews, report card grades, standardized tests</p>
                  <p><span className="font-semibold">In our app:</span> Report card domain grades, leveling meeting data, final ORF benchmarks</p>
                </div>
              </div>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Key Principle: Balance All Three">
            <p>
              Many programs over-rely on summative assessment, which tells you what happened but not why or what to do next.
              Effective teachers use diagnostic assessment to plan, formative assessment to adjust daily, and summative assessment to confirm
              and communicate learning. Think of it as a GPS: diagnostic sets the destination, formative recalculates the route, summative confirms arrival.
            </p>
            <div className="bg-surface-alt rounded-lg p-3 mt-2">
              <p className="text-[11px] font-semibold text-navy mb-1">Rule of Thumb for Our Program</p>
              <p className="text-[11px] text-text-secondary">
                For every summative assessment (report card grade, unit test), you should have 3-5 formative data points that predicted the result.
                If a summative score surprises you, your formative assessment is not frequent enough or not aligned to the right skills.
              </p>
            </div>
          </AssessmentSectionCard>
        </div>
      )}

      {section === 'orf' && (
        <div>
          <AssessmentSectionCard title="Understanding Oral Reading Fluency (ORF) Data">
            <p>
              ORF measures how many correct words a student reads per minute (CWPM) from a grade-level passage.
              It is the single best quick indicator of overall reading ability in grades 1-5 because it reflects
              both decoding accuracy and processing speed.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Accuracy Rates -- Reading Levels">
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Independent Level: 97-100% accuracy</p>
                  <p className="text-[11px] text-green-800">Student can read this text independently with strong comprehension. This is the level for homework and independent reading time. No teacher support needed.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Lightbulb size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">Instructional Level: 90-96% accuracy</p>
                  <p className="text-[11px] text-amber-800">The sweet spot for teaching. Challenging enough to learn, supported enough to succeed. Use these texts during guided reading and classroom instruction. Teacher scaffolding is essential.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Frustration Level: below 90% accuracy</p>
                  <p className="text-[11px] text-red-800">Too difficult -- student cannot access the content. Decoding demands consume all cognitive resources, leaving nothing for comprehension. Drop to a lower text level or provide intensive support.</p>
                </div>
              </div>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="How to Calculate Accuracy">
            <div className="bg-surface-alt rounded-lg p-3">
              <p className="font-mono text-[12px] text-navy mb-2">Accuracy % = (Total Words Read - Errors) / Total Words Read x 100</p>
              <p className="text-[11px] text-text-secondary">
                Example: Student reads 120 words, makes 8 errors. Accuracy = (120 - 8) / 120 = 93.3% = Instructional level.
              </p>
              <p className="text-[11px] text-text-secondary mt-1.5">
                Count as errors: substitutions, omissions, insertions, words told by teacher (after 3 seconds).
                Do NOT count: self-corrections, repetitions, dialect differences.
              </p>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="What CWPM Tells You (and Does Not)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <h5 className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1.5">CWPM Does Tell You</h5>
                <div className="text-[11px] text-green-900 space-y-1">
                  <p>- Overall reading efficiency (decoding speed + accuracy combined)</p>
                  <p>- Whether the student is making adequate progress over time</p>
                  <p>- How the student compares to grade-level benchmarks</p>
                  <p>- Whether decoding has reached automaticity (frees up comprehension resources)</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-[10px] font-bold text-red-800 uppercase tracking-wider mb-1.5">CWPM Does NOT Tell You</h5>
                <div className="text-[11px] text-red-900 space-y-1">
                  <p>- Whether the student understands what they read (comprehension)</p>
                  <p>- Quality of prosody or expression (reading "like talking")</p>
                  <p>- Which specific phonics patterns are causing errors</p>
                  <p>- Whether the student can apply reading skills to new contexts</p>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Always pair CWPM with accuracy rate, error analysis, and comprehension questions. A student reading 150 CWPM with 80% accuracy is
              speed-reading, not fluent reading. A student at 60 CWPM with 99% accuracy may just need more practice, not intervention.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Hasbrouck & Tindal ORF Norms (2017)">
            <p className="text-[11px] text-text-secondary mb-3">
              These are benchmarks for native English speakers. ELLs should be evaluated against growth trajectory rather than absolute numbers.
              A WIDA L2 student reading 40 CWPM in September who reaches 70 CWPM by January is making excellent progress, even if below grade-level norms.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-surface-alt border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold text-text-secondary">Grade</th>
                    <th className="px-3 py-2 text-center font-semibold text-text-secondary">Fall (CWPM)</th>
                    <th className="px-3 py-2 text-center font-semibold text-text-secondary">Winter (CWPM)</th>
                    <th className="px-3 py-2 text-center font-semibold text-text-secondary">Spring (CWPM)</th>
                    <th className="px-3 py-2 text-left font-semibold text-text-secondary">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { grade: '1', fall: '--', winter: '29', spring: '60', notes: 'ORF assessment begins mid-year in Grade 1' },
                    { grade: '2', fall: '50', winter: '72', spring: '89', notes: 'Rapid growth expected; biggest gain year' },
                    { grade: '3', fall: '71', winter: '92', spring: '107', notes: 'Transition from "learning to read" to "reading to learn"' },
                    { grade: '4', fall: '94', winter: '112', spring: '123', notes: 'Growth rate slows; focus shifts to comprehension' },
                    { grade: '5', fall: '110', winter: '127', spring: '139', notes: 'Approaching adult reading rate' },
                  ].map(row => (
                    <tr key={row.grade} className="border-b border-border/50">
                      <td className="px-3 py-2 font-semibold text-navy">Grade {row.grade}</td>
                      <td className="px-3 py-2 text-center">{row.fall}</td>
                      <td className="px-3 py-2 text-center">{row.winter}</td>
                      <td className="px-3 py-2 text-center">{row.spring}</td>
                      <td className="px-3 py-2 text-text-secondary">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-text-tertiary mt-2 italic">
              50th percentile values. Source: Hasbrouck & Tindal (2017). For our ELL context, focus on individual growth rates over absolute scores.
            </p>
          </AssessmentSectionCard>
        </div>
      )}

      {section === 'grouping' && (
        <div>
          <AssessmentSectionCard title="Using Data to Group Students">
            <p>
              Flexible grouping means students move between groups based on current data, not fixed ability labels.
              Regroup every 4-6 weeks based on formative assessment. No student should be stuck in the "low group" all year.
            </p>
            <div className="space-y-3 mt-3">
              <div className="bg-surface-alt rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-navy mb-1.5">Step 1: Identify the Skill Gap</h5>
                <p className="text-[11px] text-text-secondary">
                  Look at error patterns, not just scores. Two students scoring 70% might have completely different needs:
                  one struggles with vowel teams, the other with multisyllabic words. They need different groups.
                </p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-navy mb-1.5">Step 2: Form Skill-Based Groups (3-5 students)</h5>
                <p className="text-[11px] text-text-secondary">
                  Group by shared instructional need, not overall level. A group might work on r-controlled vowels together
                  regardless of their overall reading level. Keep groups small for maximum practice opportunities.
                </p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-navy mb-1.5">Step 3: Select Appropriate Texts</h5>
                <p className="text-[11px] text-text-secondary">
                  Match texts to the group's instructional level (90-96% accuracy). The text should feature the target skill
                  prominently. For phonics groups, use decodable texts. For comprehension groups, use leveled readers.
                </p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <h5 className="text-[11px] font-bold text-navy mb-1.5">Step 4: Monitor and Regroup</h5>
                <p className="text-[11px] text-text-secondary">
                  Track progress weekly. When a student masters the target skill (3 consecutive sessions at 90%+), move them
                  to a new group targeting their next need. This prevents stagnation and keeps instruction responsive.
                </p>
              </div>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Using the App's Data for Grouping Decisions">
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-alt">
                <ArrowRight size={13} className="text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-navy">Reading Fluency page</p>
                  <p className="text-[10.5px] text-text-secondary">Sort by CWPM or accuracy to identify students reading below instructional level. Students below 90% accuracy need decoding intervention, not fluency practice.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-alt">
                <ArrowRight size={13} className="text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-navy">Grades / Assessment scores</p>
                  <p className="text-[10.5px] text-text-secondary">Look at domain-specific grades, not just averages. A student strong in speaking but weak in writing needs different support than one weak in both.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-alt">
                <ArrowRight size={13} className="text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-navy">Standards Checklist</p>
                  <p className="text-[10.5px] text-text-secondary">Identify clusters still "Not Started" or "In Progress" to target instruction. Group students who share the same unmastered standards.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-alt">
                <ArrowRight size={13} className="text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-navy">WIDA Profiles</p>
                  <p className="text-[10.5px] text-text-secondary">Students at the same WIDA level across all 4 domains need general English support. Students with uneven profiles (e.g., L4 listening but L2 writing) need domain-specific groups.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-alt">
                <ArrowRight size={13} className="text-navy flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-navy">Leveling Data</p>
                  <p className="text-[10.5px] text-text-secondary">Use cross-class comparison during leveling meetings to identify students who might benefit from moving to a class with more appropriate pacing.</p>
                </div>
              </div>
            </div>
          </AssessmentSectionCard>
        </div>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
// 4. READING FLUENCY & COMPREHENSION GUIDE
// ═══════════════════════════════════════════════════════════════════

export function ReadingFluencyGuide() {
  const [section, setSection] = useState<string>('cwpm')

  const sections = [
    { id: 'cwpm', label: 'Understanding CWPM', icon: BarChart3 },
    { id: 'prosody', label: 'Prosody Assessment', icon: Volume2 },
    { id: 'repeated', label: 'Repeated Reading', icon: BookOpen },
    { id: 'comprehension', label: 'Comprehension Frameworks', icon: Brain },
    { id: 'vocabulary', label: 'Vocabulary for ELLs', icon: GraduationCap },
  ]

  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
        <h3 className="text-[14px] font-bold text-purple-900 mb-1">Reading Fluency & Comprehension Guide</h3>
        <p className="text-[12px] text-purple-800 leading-relaxed">
          Building fluent, comprehending readers through evidence-based practices.
          Connects to the ORF assessment system in the Reading Fluency page of this app.
        </p>
        <p className="text-[10px] text-purple-700 mt-2 italic">
          Sources: NRP (2000); Rasinski (2003) fluency framework; Scarborough (2001) reading rope; RAND Reading Study Group (2002).
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
              section === s.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}
          >
            <s.icon size={13} /> {s.label}
          </button>
        ))}
      </div>

      {section === 'cwpm' && (
        <div>
          <AssessmentSectionCard title="What CWPM Measures">
            <p>
              Correct Words Per Minute (CWPM) is a rate measure: how many words a student reads accurately in one minute of oral reading
              from a grade-level passage. It captures the intersection of two critical skills: decoding accuracy (getting the words right)
              and automaticity (getting them right quickly, without effortful sounding out).
            </p>
            <p>
              When decoding becomes automatic, cognitive resources are freed for comprehension. This is why CWPM correlates highly
              with reading comprehension in elementary grades -- not because speed causes understanding, but because automaticity enables it.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="The Fluency Formula">
            <div className="bg-navy/5 rounded-lg p-4 text-center mb-3">
              <p className="text-[16px] font-bold text-navy">Reading Fluency = Accuracy + Rate + Prosody</p>
              <p className="text-[11px] text-text-secondary mt-1">CWPM captures accuracy and rate. Prosody must be assessed separately.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-surface-alt rounded-lg">
                <p className="text-[12px] font-bold text-navy">Accuracy</p>
                <p className="text-[10px] text-text-secondary mt-1">Reading words correctly. Target: 95%+ for fluent reading.</p>
              </div>
              <div className="text-center p-3 bg-surface-alt rounded-lg">
                <p className="text-[12px] font-bold text-navy">Rate</p>
                <p className="text-[10px] text-text-secondary mt-1">Reading at an appropriate pace. Not too slow, not rushing.</p>
              </div>
              <div className="text-center p-3 bg-surface-alt rounded-lg">
                <p className="text-[12px] font-bold text-navy">Prosody</p>
                <p className="text-[10px] text-text-secondary mt-1">Reading with expression, phrasing, and intonation. "Reading like talking."</p>
              </div>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Important Caveats for ELLs">
            <div className="space-y-2">
              <p>
                CWPM norms (Hasbrouck & Tindal) are based on native English speakers. ELLs may read more slowly due to processing
                in a second language, not due to reading disability. Always evaluate ELLs against their own growth trajectory.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[11px] font-semibold text-amber-900 mb-1">Growth Rate Is More Important Than Absolute Score</p>
                <p className="text-[11px] text-amber-800">
                  A WIDA L2 student who gains 2 CWPM per week is making excellent progress, even if their absolute score is well below
                  grade-level norms. Expected growth: 1-2 CWPM per week during focused instruction. If growth stalls for 4+ weeks,
                  investigate and adjust.
                </p>
              </div>
              <p>
                Also consider that Korean and English have very different prosodic patterns. Korean is a syllable-timed language;
                English is stress-timed. ELLs may read accurately but sound "flat" -- this is a prosody development issue, not
                a reading problem. It improves with modeling and practice.
              </p>
            </div>
          </AssessmentSectionCard>
        </div>
      )}

      {section === 'prosody' && (
        <div>
          <AssessmentSectionCard title="Assessing Prosody">
            <p>
              Prosody is the "music" of reading: stress, intonation, phrasing, and expression. It is the dimension of fluency
              that CWPM cannot capture. A student may read at 100 CWPM but sound robotic -- that is not fluent reading.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="NAEP Oral Reading Fluency Scale (Adapted)">
            <div className="space-y-2">
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-200 text-green-800 text-[12px] font-bold flex-shrink-0">4</span>
                <div>
                  <p className="font-semibold text-green-900 text-[12px]">Fluent</p>
                  <p className="text-[11px] text-green-800 mt-0.5">Reads primarily in larger, meaningful phrase groups. Syntax and meaning are preserved. Expression matches text mood. Pace is consistent and appropriate. Sounds like natural speech.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-800 text-[12px] font-bold flex-shrink-0">3</span>
                <div>
                  <p className="font-semibold text-blue-900 text-[12px]">Approaching Fluent</p>
                  <p className="text-[11px] text-blue-800 mt-0.5">Reads primarily in 3-4 word phrase groups. Some expression present. Mostly smooth with occasional breaks. Reasonable pace.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-200 text-amber-800 text-[12px] font-bold flex-shrink-0">2</span>
                <div>
                  <p className="font-semibold text-amber-900 text-[12px]">Non-Fluent</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">Reads primarily in 2-word phrases. Choppy reading. Little expression. Frequent pauses and hesitations. Meaning may be lost due to poor phrasing.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-200 text-red-800 text-[12px] font-bold flex-shrink-0">1</span>
                <div>
                  <p className="font-semibold text-red-900 text-[12px]">Word-by-Word</p>
                  <p className="text-[11px] text-red-800 mt-0.5">Reads word by word with no phrasing. Monotone. Long pauses between words. May need to sound out many words. Reading does not sound like language.</p>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-text-tertiary mt-2 italic">
              Adapted from NAEP (2002) oral reading fluency scale. Score after listening to 1 minute of oral reading. Use alongside CWPM for a complete fluency picture.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Building Prosody in ELLs">
            <div className="space-y-2">
              <p><span className="font-semibold text-navy">Teacher modeling:</span> Read aloud expressively every day. Exaggerate intonation patterns. Think aloud about how punctuation tells you HOW to read.</p>
              <p><span className="font-semibold text-navy">Echo reading:</span> Teacher reads a phrase, students repeat with the same expression. Works for WIDA L1-L3.</p>
              <p><span className="font-semibold text-navy">Choral reading:</span> Whole class reads together. Lower-proficiency students get supported by hearing peers. Builds confidence.</p>
              <p><span className="font-semibold text-navy">Reader's Theater:</span> Students practice and perform scripts. Naturally motivates prosodic reading. Excellent for WIDA L3-L5.</p>
              <p><span className="font-semibold text-navy">Punctuation practice:</span> Use "punctuation walks" where students physically act out pauses (periods), rises (questions), and emphasis (exclamations).</p>
            </div>
          </AssessmentSectionCard>
        </div>
      )}

      {section === 'repeated' && (
        <div>
          <AssessmentSectionCard title="Repeated Reading Protocol">
            <p>
              Repeated reading is one of the most research-supported fluency interventions. The student reads the same passage
              multiple times until reaching a target rate or until reading sounds smooth and natural. It works because each rereading
              strengthens orthographic representations of the words encountered.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Step-by-Step Procedure">
            <div className="space-y-2">
              {[
                'Select a passage at the student\'s instructional level (90-96% accuracy on first read). 100-200 words for grades 1-3; 200-300 for grades 4-5.',
                'Cold read (timed): Student reads for 1 minute. Record CWPM and errors. Graph the score.',
                'Practice read 1: Student rereads the same passage. Focus on smoothness and accuracy, not speed.',
                'Practice read 2: Student rereads again. Encourage expression and phrasing. Teacher models difficult sentences.',
                'Hot read (timed): Student reads for 1 minute again. Record CWPM and errors. Graph the score.',
                'Compare cold and hot read scores. Celebrate growth. If hot read reaches the benchmark target, move to a new passage. If not, continue with the same passage next session.',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy text-white text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[11.5px] text-text-primary leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </AssessmentSectionCard>

        </div>
      )}

      {section === 'comprehension' && (
        <div>
          <AssessmentSectionCard title="Before / During / After Reading Framework">
            <p>
              Comprehension is not a single skill -- it is the orchestration of many cognitive processes before, during, and after reading.
              Effective comprehension instruction explicitly teaches students what to do at each phase. For ELLs, each phase needs
              additional scaffolding to bridge language gaps.
            </p>
          </AssessmentSectionCard>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="text-[12px] font-bold text-blue-900 mb-2">Before Reading</h4>
              <p className="text-[11px] text-blue-800 mb-2">Activate background knowledge and set a purpose for reading.</p>
              <div className="text-[10.5px] text-blue-700 space-y-1.5">
                <p><span className="font-semibold">Preview & Predict:</span> Look at title, headings, images. Ask: "What do you think this will be about?"</p>
                <p><span className="font-semibold">Vocabulary Pre-teach:</span> Introduce 5-7 key words using pictures, gestures, and context sentences.</p>
                <p><span className="font-semibold">KWL Chart:</span> What do you Know? What do you Want to know? (Fill in L after reading.)</p>
                <p><span className="font-semibold">Purpose Setting:</span> "Read to find out why..." gives readers a specific focus.</p>
                <p className="italic mt-2 text-[10px]">ELL tip: Build background knowledge in Korean first if the topic is culturally unfamiliar. Use videos, images, and realia.</p>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="text-[12px] font-bold text-green-900 mb-2">During Reading</h4>
              <p className="text-[11px] text-green-800 mb-2">Monitor understanding and actively process the text.</p>
              <div className="text-[10.5px] text-green-700 space-y-1.5">
                <p><span className="font-semibold">Stop & Think:</span> Pause at predetermined points. "What just happened? What do you think will happen next?"</p>
                <p><span className="font-semibold">Annotation/Coding:</span> Mark text with symbols: ? (confusing), ! (surprising), * (important), ~ (connection).</p>
                <p><span className="font-semibold">Think-Pair-Share:</span> Process ideas orally before writing. Essential for ELLs.</p>
                <p><span className="font-semibold">Graphic Organizers:</span> Story maps, T-charts, cause/effect diagrams. Visual structure supports comprehension.</p>
                <p className="italic mt-2 text-[10px]">ELL tip: Allow use of bilingual dictionaries or translation apps for unknown vocabulary. Comprehension matters more than decoding every word.</p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="text-[12px] font-bold text-amber-900 mb-2">After Reading</h4>
              <p className="text-[11px] text-amber-800 mb-2">Consolidate understanding and extend thinking.</p>
              <div className="text-[10.5px] text-amber-700 space-y-1.5">
                <p><span className="font-semibold">Summarize:</span> Somebody-Wanted-But-So-Then for narrative. Main Idea + 3 Details for informational.</p>
                <p><span className="font-semibold">Discussion:</span> Open-ended questions that require text evidence. "How do you know? Show me where it says that."</p>
                <p><span className="font-semibold">Written Response:</span> Short constructed responses using sentence frames for L1-L3. Extended responses for L4-L5.</p>
                <p><span className="font-semibold">Connect:</span> Text-to-self, text-to-text, text-to-world connections. Deepens engagement and memory.</p>
                <p className="italic mt-2 text-[10px]">ELL tip: Allow responses in a mix of English and Korean. The goal is demonstrating comprehension, not perfect English.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {section === 'vocabulary' && (
        <div>
          <AssessmentSectionCard title="Vocabulary Instruction for ELLs">
            <p>
              Vocabulary knowledge is the strongest predictor of reading comprehension for ELLs (August & Shanahan, 2006).
              ELLs need explicit, systematic vocabulary instruction -- they cannot learn enough words from incidental exposure alone.
              Focus on Tier 2 words (high-utility academic words) and morphological awareness (word parts).
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="The Three Tiers of Vocabulary">
            <div className="space-y-2">
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[12px] font-bold text-navy">Tier 1: Basic / Everyday Words</p>
                <p className="text-[11px] text-text-secondary">Words most native speakers know: dog, run, happy, book, eat. ELLs at WIDA L1-L2 still need many of these explicitly taught. Do not assume they know "basic" English words.</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[12px] font-bold text-amber-900">Tier 2: High-Utility Academic Words (PRIMARY FOCUS)</p>
                <p className="text-[11px] text-amber-800">Words that appear across many subjects and contexts: analyze, compare, evidence, sufficient, consequence, interpret. These are the words that unlock academic reading comprehension. Teach 5-10 per week explicitly.</p>
                <p className="text-[10px] text-amber-700 mt-1 italic">Selection strategy: Choose words that students will encounter repeatedly across texts and subjects, that are NOT easily demonstrated with a picture, and that have morphological relatives (e.g. analyze, analysis, analytical).</p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[12px] font-bold text-navy">Tier 3: Domain-Specific / Technical Words</p>
                <p className="text-[11px] text-text-secondary">Words specific to a content area: photosynthesis, denominator, peninsula, monarchy. Teach within the relevant content lesson. Often easier for ELLs because they have clear definitions and may have cognates in Korean.</p>
              </div>
            </div>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Morphological Awareness for Vocabulary Growth">
            <p>
              Teaching students to recognize and use prefixes, suffixes, and roots is the highest-leverage vocabulary strategy for ELLs.
              Knowing 20 common prefixes and 14 roots unlocks the meaning of over 100,000 words (Bowers, Kirby & Deacon, 2010).
            </p>
            <div className="bg-surface-alt rounded-lg p-3 mt-2">
              <p className="text-[11px] font-semibold text-navy mb-1.5">High-Value Morphemes to Teach</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
                <p><span className="font-semibold">un-</span> (not): unhappy, unable, unfair</p>
                <p><span className="font-semibold">re-</span> (again): redo, rewrite, return</p>
                <p><span className="font-semibold">pre-</span> (before): preview, prefix, predict</p>
                <p><span className="font-semibold">dis-</span> (not/opposite): disagree, disappear</p>
                <p><span className="font-semibold">-ful</span> (full of): helpful, careful, beautiful</p>
                <p><span className="font-semibold">-less</span> (without): helpless, careless, useless</p>
                <p><span className="font-semibold">-able/-ible</span> (can be): readable, possible</p>
                <p><span className="font-semibold">-tion/-sion</span> (noun): action, decision</p>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Connect to the Phonics Scope & Sequence: morphology concepts are integrated at every stage (marked with gold badges).
              This is deliberate -- morphological awareness and phonics knowledge reinforce each other.
            </p>
          </AssessmentSectionCard>

          <AssessmentSectionCard title="Robust Vocabulary Instruction Routine">
            <div className="space-y-2">
              {[
                'Introduce the word in context: Read a sentence containing the word. Students hear it used meaningfully.',
                'Provide a student-friendly definition: Use simple language. "Analyze means to look at something very carefully to understand its parts."',
                'Give examples and non-examples: "Analyzing a story means looking at the characters, setting, and events carefully. Analyzing is NOT just reading it once quickly."',
                'Engage students with the word: "Tell your partner about a time you had to analyze something." Use sentence frames for L1-L3.',
                'Review repeatedly: Use the word in instruction over the next 5-7 days. Students need 10-12 meaningful encounters with a word to own it.',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-navy text-white text-[9px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[11.5px] text-text-primary leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-tertiary mt-2 italic">
              Based on Beck, McKeown & Kucan (2013) "Bringing Words to Life" and adapted for ELL context.
            </p>
          </AssessmentSectionCard>
        </div>
      )}
    </div>
  )
}
