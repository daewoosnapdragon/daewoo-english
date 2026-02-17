'use client'

import { useState, useMemo } from 'react'
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

interface PhonicsPattern {
  pattern: string
  examples: string
  hfWords?: string
  notes?: string
  isMorphology?: boolean
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
      { pattern: 'Consonant sounds', examples: 'b, c, d, f, g, h, j, k, l, m, n, p, q, r, s, t, v, w, x, y, z', notes: 'Teach in high-utility order: s, m, t, a, p, n, c, i, f, b, g, d, h, r, l, o, e, u, k, w, j, v, y, z, x, q' },
      { pattern: 'Short vowels', examples: 'a (cat), e (bed), i (sit), o (hot), u (cup)', notes: 'Introduce after 4-6 consonants. Use CVC words immediately.' },
      { pattern: 'Letter formation', examples: 'Manuscript print, correct directionality', notes: 'Multisensory: skywriting, sand trays, bumpy boards. Connect formation to sound.' },
      { pattern: 'Alphabetic principle', examples: 'Letters represent sounds; sounds blend into words', notes: 'Continuous blending (mmm-aaa-nnn) vs. choppy segmenting. Use Elkonin boxes.' },
    ]
  },
  {
    id: 'closed',
    name: 'Stage 2: Closed Syllables (CVC/CCVC/CVCC)',
    description: 'Short vowel words with consonants closing the syllable. The most common English syllable type.',
    suggestedClasses: 'Lily, Camellia',
    patterns: [
      { pattern: 'CVC words', examples: 'cat, bed, sit, hop, cup', notes: 'Master before advancing. Students should read and spell fluently.' },
      { pattern: 'Initial consonant blends', examples: 'bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr, sc, sk, sm, sn, sp, st, sw', notes: 'Teach as two distinct sounds blended together, NOT as chunks.' },
      { pattern: 'Final consonant blends', examples: '-nd, -nk, -nt, -mp, -lt, -lk, -ft, -sk, -st', notes: 'Students often drop the second consonant in spelling. Dictation practice essential.' },
      { pattern: 'Digraphs', examples: 'sh, ch, th, wh, ck, ph', notes: 'Two letters, one sound. Distinguish from blends. th = voiced (this) and unvoiced (think).' },
      { pattern: 'FLOSS rule (ff, ll, ss, zz)', examples: 'off, tell, miss, buzz, staff, dull', notes: 'Double the final consonant after a single short vowel in a one-syllable word.' },
      { pattern: '-ng, -nk endings', examples: 'ring, sang, think, bank', notes: 'Nasal sounds. -nk includes the /k/ sound; -ng does not.' },
      { pattern: 'Inflectional suffix -s', examples: 'cats, runs, beds', isMorphology: true, notes: 'First morphology concept. Three pronunciations: /s/ (cats), /z/ (beds), /iz/ (buses).' },
      { pattern: 'Inflectional suffix -ed', examples: 'jumped /t/, rained /d/, wanted /id/', isMorphology: true, notes: 'Three pronunciations based on final sound of base word.' },
      { pattern: 'Inflectional suffix -ing', examples: 'jumping, running, sitting', isMorphology: true, notes: 'Introduce doubling rule: CVC + -ing doubles final consonant.' },
    ]
  },
  {
    id: 'open',
    name: 'Stage 3: Open Syllables',
    description: 'Syllables ending in a vowel -- the vowel says its name (long sound).',
    suggestedClasses: 'Camellia, Daisy',
    patterns: [
      { pattern: 'Open syllable concept', examples: 'me, she, hi, go, no, we, be', notes: 'Syllable ends in a vowel = vowel is long. Contrast with closed (met vs. me).' },
      { pattern: 'Two-syllable open/closed', examples: 'ro-bot, mu-sic, pa-per, ti-ger', notes: 'Teach syllable division: V/CV (open first) vs. VC/V (closed first).' },
      { pattern: 'y as a vowel', examples: 'my, fly (long i); happy, candy (long e)', notes: 'y at end of one-syllable word = /ai/; y at end of multisyllable word = /ee/.' },
      { pattern: 'Prefix un-', examples: 'unhappy, undo, unfair', isMorphology: true, notes: 'First prefix. Meaning: "not" or "reverse." Teach that prefixes change meaning.' },
      { pattern: 'Prefix re-', examples: 'redo, rewrite, replay', isMorphology: true, notes: 'Meaning: "again." High-frequency and transparent for young learners.' },
    ]
  },
  {
    id: 'silent-e',
    name: 'Stage 4: Silent e (VCe)',
    description: 'Magic e / silent e makes the vowel say its name. A critical decoding milestone.',
    suggestedClasses: 'Camellia, Daisy',
    patterns: [
      { pattern: 'a_e', examples: 'cake, name, make, game, lake', notes: 'Most common VCe pattern. Contrast pairs: can/cane, tap/tape, cap/cape.' },
      { pattern: 'i_e', examples: 'bike, kite, time, line, five', notes: 'Contrast: bit/bite, kit/kite, fin/fine, dim/dime.' },
      { pattern: 'o_e', examples: 'home, bone, nose, rope, hope', notes: 'Contrast: hop/hope, not/note, rob/robe, cod/code.' },
      { pattern: 'u_e', examples: 'cube, cute, mule, use, fuse', notes: 'Two pronunciations: /oo/ (rude, June) and /yoo/ (cube, cute).' },
      { pattern: 'e_e (rare)', examples: 'Pete, these, Steve', notes: 'Uncommon but exists. Most long e is spelled ee, ea, or y.' },
      { pattern: '-dge', examples: 'bridge, judge, badge, hedge', notes: 'After a short vowel, /j/ is spelled -dge. After everything else, -ge.' },
      { pattern: '-tch', examples: 'match, catch, kitchen, witch', notes: 'After a short vowel, /ch/ is spelled -tch. Exceptions: much, such, rich, which.' },
      { pattern: '-ce, -ge for soft sounds', examples: 'ice, face, age, cage, huge', notes: 'Silent e keeps c and g soft. Remove e and they harden: icing vs. ick.' },
      { pattern: 'Suffix -ful', examples: 'helpful, careful, hopeful', isMorphology: true, notes: 'Meaning: "full of." Note: suffix has one l, word "full" has two.' },
      { pattern: 'Suffix -less', examples: 'helpless, careless, hopeless', isMorphology: true, notes: 'Meaning: "without." Pair with -ful for contrast.' },
    ]
  },
  {
    id: 'vowel-teams',
    name: 'Stage 5: Vowel Teams',
    description: 'Two vowels working together to make one sound. "When two vowels go walking, the first one does the talking" -- sometimes.',
    suggestedClasses: 'Daisy, Sunflower',
    patterns: [
      { pattern: 'ai, ay', examples: 'rain, play, wait, say, train', notes: 'ai = middle of word/syllable; ay = end of word/syllable.' },
      { pattern: 'ee, ea', examples: 'tree, read, seed, beach, sleep', notes: 'Both make /ee/. ea also makes /eh/ (bread, head) -- teach as a "tricky pair."' },
      { pattern: 'oa, ow', examples: 'boat, snow, road, grow, coat', notes: 'oa = middle; ow = end. But ow also makes /ow/ (cow, now) -- context dependent.' },
      { pattern: 'ie, igh', examples: 'pie, tie, high, night, light', notes: 'ie at end = long i. igh = long i (the gh is silent).' },
      { pattern: 'ue, ew', examples: 'blue, true, new, grew, few', notes: 'Both make /oo/ or /yoo/. ew at end of words.' },
      { pattern: 'oi, oy', examples: 'oil, boy, coin, enjoy, point', notes: 'oi = middle; oy = end. Diphthong (mouth moves during sound).' },
      { pattern: 'ou, ow (diphthong)', examples: 'house, cow, out, down, cloud', notes: 'Same /ow/ sound. ow can be long o OR /ow/ -- must check context.' },
      { pattern: 'au, aw', examples: 'cause, saw, haul, draw, paw', notes: 'Both make /aw/. au = middle; aw = end or before n.' },
      { pattern: 'oo', examples: 'moon (/oo/), book (/uh/)', notes: 'Two sounds! Long oo (food, school) vs. short oo (good, cook). Teach both.' },
      { pattern: 'Suffix -er (comparative)', examples: 'taller, faster, bigger', isMorphology: true, notes: 'Meaning: "more." Doubling rule applies (big -> bigger). Drop e (large -> larger).' },
      { pattern: 'Suffix -est (superlative)', examples: 'tallest, fastest, biggest', isMorphology: true, notes: 'Meaning: "most." Same spelling change rules as -er.' },
    ]
  },
  {
    id: 'silent-letters',
    name: 'Stage 6: Silent Letters',
    description: 'Letters present in spelling but not pronounced. Often historical remnants.',
    suggestedClasses: 'Sunflower, Rose',
    patterns: [
      { pattern: 'kn-', examples: 'know, knee, knife, knock, knight', notes: 'k was originally pronounced in Old English. Silent before n.' },
      { pattern: 'wr-', examples: 'write, wrong, wrap, wrist, wreck', notes: 'w was originally pronounced. Silent before r.' },
      { pattern: 'gn-', examples: 'gnat, gnaw, gnome, sign, design', notes: 'g silent before n at start; both silent in -ign (sign, design).' },
      { pattern: '-mb', examples: 'lamb, comb, climb, thumb, bomb', notes: 'b silent after m at end of word. Exception: number (b is voiced).' },
      { pattern: 'gh', examples: 'ghost, night, thought, through', notes: 'Complex: gh = /g/ at start (ghost), silent in -ight, -ough patterns.' },
      { pattern: '-lk, -lm, -lf', examples: 'walk, talk, calm, palm, half, calf', notes: 'l is silent in these combinations. Regional variation exists.' },
    ]
  },
  {
    id: 'r-controlled',
    name: 'Stage 7: R-Controlled Vowels',
    description: 'Bossy r changes the vowel sound. Neither short nor long -- a new sound.',
    suggestedClasses: 'Daisy, Sunflower, Rose',
    patterns: [
      { pattern: 'ar', examples: 'car, star, farm, park, card', notes: 'Makes /ar/ sound. Most consistent r-controlled vowel.' },
      { pattern: 'or', examples: 'for, corn, sport, north, horn', notes: 'Makes /or/ sound. Also found in -ore (more, store).' },
      { pattern: 'er', examples: 'her, fern, term, verse, nerve', notes: 'Makes /er/ sound. Most common spelling of this sound in medial position.' },
      { pattern: 'ir', examples: 'bird, girl, first, stir, dirt', notes: 'Same /er/ sound as er. Cannot distinguish by sound alone.' },
      { pattern: 'ur', examples: 'fur, burn, turn, hurt, nurse', notes: 'Same /er/ sound as er and ir. Spelling must be memorized.' },
      { pattern: 'ar after w', examples: 'warm, war, ward, wart, swarm', notes: 'w changes ar to sound like /or/. Common exception to ar pattern.' },
      { pattern: 'or after w', examples: 'word, work, world, worm, worth', notes: 'w changes or to sound like /er/. Must be memorized.' },
      { pattern: 'Suffix -er (agent)', examples: 'teacher, reader, worker', isMorphology: true, notes: 'Meaning: "one who does." Different from -er comparative. Context determines meaning.' },
    ]
  },
  {
    id: 'other-vowels',
    name: 'Stage 8: Other Vowel Patterns',
    description: 'Advanced and less common vowel spellings that expand decoding flexibility.',
    suggestedClasses: 'Rose, Snapdragon',
    patterns: [
      { pattern: '-tion', examples: 'nation, action, station, motion', notes: 'Makes /shun/. Extremely common suffix pattern. Latin origin.' },
      { pattern: '-sion', examples: 'vision, tension, mission, version', notes: 'Makes /zhun/ or /shun/. After a consonant = /shun/; after a vowel = /zhun/.' },
      { pattern: '-ous', examples: 'famous, nervous, generous', notes: 'Makes /us/. Latin adjective ending meaning "full of" or "having."' },
      { pattern: '-ture', examples: 'nature, picture, future, adventure', notes: 'Makes /cher/. Very common in academic vocabulary.' },
      { pattern: '-ible, -able', examples: 'possible, comfortable, readable', notes: 'Both mean "can be done." -able more common with native English roots.' },
      { pattern: 'ei, ey', examples: 'ceiling, they, vein, obey', notes: '"i before e except after c" -- has many exceptions. Teach common words.' },
      { pattern: '-ough patterns', examples: 'though, through, thought, tough, cough', notes: 'Most irregular spelling in English. 7+ pronunciations. Teach as sight words.' },
      { pattern: 'Prefix dis-', examples: 'disagree, disappear, discover', isMorphology: true, notes: 'Meaning: "not" or "opposite of." Latin prefix.' },
      { pattern: 'Prefix mis-', examples: 'mistake, misread, misunderstand', isMorphology: true, notes: 'Meaning: "wrongly." Old English origin.' },
    ]
  },
  {
    id: 'multisyllable',
    name: 'Stage 9: Multi-Syllable & Morphology',
    description: 'Advanced word attack using syllable division, morphemic analysis, and Greek/Latin roots.',
    suggestedClasses: 'Rose, Snapdragon',
    patterns: [
      { pattern: 'Syllable division: VC/CV', examples: 'rab-bit, kit-ten, hap-pen, com-mon', notes: 'Divide between two consonants. Each syllable has one vowel sound.' },
      { pattern: 'Syllable division: V/CV', examples: 'ba-by, mu-sic, ro-bot, ti-ger', notes: 'Try open syllable first (long vowel). If word is unrecognizable, try closed.' },
      { pattern: 'Syllable division: VC/V', examples: 'cam-el, lem-on, riv-er, mod-el', notes: 'Closed first syllable (short vowel). Try if V/CV does not produce a real word.' },
      { pattern: 'Compound words', examples: 'sunflower, basketball, bedroom', notes: 'Divide at the word boundary. Each part is a known word.' },
      { pattern: 'Latin roots', examples: 'port (carry), dict (say), struct (build), rupt (break)', isMorphology: true, notes: 'Unlock academic vocabulary. One root can generate dozens of words.' },
      { pattern: 'Greek combining forms', examples: 'bio (life), graph (write), tele (far), phon (sound)', isMorphology: true, notes: 'Common in science and technology vocabulary.' },
      { pattern: 'Prefix + root + suffix', examples: 'un-break-able, dis-agree-ment, re-construct-ion', isMorphology: true, notes: 'Teach word building as a system. Peel off affixes to find the base.' },
      { pattern: 'Assimilated prefixes', examples: 'in- -> im (impossible), il (illegal), ir (irregular)', isMorphology: true, notes: 'Prefix changes spelling to match root consonant. Advanced but high-value.' },
      { pattern: 'Suffix -ly', examples: 'quickly, happily, gently', isMorphology: true, notes: 'Changes adjective to adverb. y -> i before -ly (happy -> happily).' },
      { pattern: 'Suffix -ment, -ness', examples: 'movement, happiness, darkness', isMorphology: true, notes: 'Noun-forming suffixes. -ment from verbs; -ness from adjectives.' },
    ]
  },
]

export function PhonicsSequence() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showMorphology, setShowMorphology] = useState(true)

  const filteredStages = useMemo(() => {
    if (!search.trim()) return PHONICS_STAGES
    const q = search.toLowerCase()
    return PHONICS_STAGES.map(stage => ({
      ...stage,
      patterns: stage.patterns.filter(p =>
        p.pattern.toLowerCase().includes(q) ||
        p.examples.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.hfWords || '').toLowerCase().includes(q)
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
          Morphology concepts are integrated throughout (marked with gold badges) rather than isolated at the end.
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
                  <p className="text-[9px] text-text-tertiary mt-0.5">{stage.suggestedClasses}</p>
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
                      {stage.patterns.map((p, i) => (
                        <tr key={i} className={`border-b border-border/50 last:border-0 ${
                          p.isMorphology && showMorphology ? 'bg-amber-50/60' : ''
                        }`}>
                          <td className="px-5 py-2.5 font-semibold text-navy align-top">
                            <div className="flex items-center gap-1.5">
                              {p.isMorphology && showMorphology && (
                                <Puzzle size={11} className="text-amber-600 flex-shrink-0" />
                              )}
                              {p.pattern}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-text-primary align-top font-mono text-[10.5px]">{p.examples}</td>
                          <td className="px-3 py-2.5 text-text-secondary align-top leading-relaxed">{p.notes || '--'}</td>
                        </tr>
                      ))}
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
    { id: 'cycle', label: 'Instruction Cycle', icon: TrendingUp },
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

      {section === 'cycle' && (
        <div>
          <AssessmentSectionCard title="The Data-Driven Instruction Cycle">
            <p>
              Effective instruction is cyclical, not linear. Each round of data informs the next round of teaching.
              This is not extra work on top of teaching -- it IS teaching.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 my-4">
              {['Assess', 'Analyze', 'Plan', 'Teach', 'Reassess'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-navy text-white text-center">
                    <div>
                      <p className="text-[9px] font-medium opacity-70">Step {i + 1}</p>
                      <p className="text-[12px] font-bold">{step}</p>
                    </div>
                  </div>
                  {i < 4 && <ArrowRight size={16} className="text-text-tertiary" />}
                </div>
              ))}
            </div>
          </AssessmentSectionCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AssessmentSectionCard title="Step 1: Assess">
              <p>Collect data using the right tool for the right purpose. Use diagnostic assessments at the start. Use formative assessments throughout. Use summative assessments to confirm.</p>
              <p className="text-[11px] text-text-tertiary mt-1 italic">Key question: What do my students know right now?</p>
            </AssessmentSectionCard>
            <AssessmentSectionCard title="Step 2: Analyze">
              <p>Look for patterns, not just individual scores. What percentage of the class mastered the target? What errors are most common? Which students are outliers (positive or negative)?</p>
              <p className="text-[11px] text-text-tertiary mt-1 italic">Key question: What patterns do I see in the data?</p>
            </AssessmentSectionCard>
            <AssessmentSectionCard title="Step 3: Plan">
              <p>Based on analysis, decide what to teach, to whom, and how. Form flexible groups. Choose appropriate materials and strategies. Set measurable targets for the next cycle.</p>
              <p className="text-[11px] text-text-tertiary mt-1 italic">Key question: What will I do differently based on this data?</p>
            </AssessmentSectionCard>
            <AssessmentSectionCard title="Step 4: Teach">
              <p>Deliver instruction with fidelity to the plan. Use the strategies from the Phonics Strategies guide. Monitor engagement and adjust pacing in real time. Collect informal data as you teach.</p>
              <p className="text-[11px] text-text-tertiary mt-1 italic">Key question: Am I teaching what my students need?</p>
            </AssessmentSectionCard>
          </div>

          <AssessmentSectionCard title="Step 5: Reassess & Repeat">
            <p>
              After the instructional cycle (typically 2-4 weeks), reassess the same skills. Compare to the initial data.
              Celebrate growth. Identify students who need continued support. Adjust groups. Begin the cycle again.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
              <p className="text-[11px] font-semibold text-amber-900">Recommended Cycle Timing for Our Program</p>
              <p className="text-[11px] text-amber-800 mt-1">
                ORF: Weekly progress monitoring (formative) + monthly benchmark (summative).
                Phonics: Weekly spelling assessment + end-of-unit test every 3-4 weeks.
                Grammar/Writing: Bi-weekly writing samples + end-of-unit rubric scoring.
                Standards: Update the Standards Checklist as clusters are taught and assessed.
              </p>
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

          <AssessmentSectionCard title="Variations and Tips">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[11px] font-semibold text-navy mb-1">Partner Repeated Reading</p>
                <p className="text-[10.5px] text-text-secondary">Pair a stronger reader with a developing reader. Stronger reader models first, then both read together, then developing reader reads solo. Efficient use of time for whole-class fluency practice.</p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[11px] font-semibold text-navy mb-1">Performance Reading</p>
                <p className="text-[10.5px] text-text-secondary">Give the repeated reading a purpose: "You will read this to the kindergarten class on Friday." Natural motivation for prosody and practice. Works beautifully for ELLs who may be shy about oral reading.</p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[11px] font-semibold text-navy mb-1">Graphing Progress</p>
                <p className="text-[10.5px] text-text-secondary">Students graph their own cold/hot read scores. Visual evidence of growth is powerfully motivating. Use the ORF tracking feature in this app to maintain digital records alongside student-facing paper graphs.</p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[11px] font-semibold text-navy mb-1">Frequency</p>
                <p className="text-[10.5px] text-text-secondary">3-4 sessions per week, 10-15 minutes each. Consistency matters more than duration. Even 8 minutes of focused repeated reading is beneficial. New passage every 1-2 weeks depending on progress.</p>
              </div>
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
                <p className="italic mt-2 text-[10px]">ELL tip: Allow use of bilingual dictionaries or translation apps for unknown vocabulary. Comprehension > decoding every word.</p>
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
                <p className="text-[10px] text-amber-700 mt-1 italic">Selection strategy: Choose words that students will encounter repeatedly across texts and subjects, that are NOT easily demonstrated with a picture, and that have morphological relatives (analyze -> analysis, analytical).</p>
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
