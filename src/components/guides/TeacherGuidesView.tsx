'use client'

import { useState, useMemo, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  Search, ChevronDown, ChevronUp, BookOpen, PenTool, MessageSquare,
  Lightbulb, Loader2, BookMarked, FileText, Layers, Type, Languages
} from 'lucide-react'
import { PhonicsSequence, PhonicsStrategies } from '@/components/curriculum/TeacherReferences'

type ResourceSection = 'home' | 'skills' | 'grammar' | 'patterns' | 'phonics' | 'subplans'

export default function TeacherGuidesView() {
  const { lang } = useApp()
  const ko = lang === 'ko'
  const [section, setSection] = useState<ResourceSection>('home')
  const [phonicsTab, setPhonicsTab] = useState<'sequence' | 'strategies'>('sequence')

  const NAV: { id: ResourceSection; icon: any; label: string; desc: string }[] = [
    { id: 'skills', icon: BookOpen, label: 'Key ELA/ESL Skills', desc: 'Main idea, inference, context clues, and more' },
    { id: 'grammar', icon: Type, label: 'Grammar Index', desc: 'Parts of speech, tenses, common patterns' },
    { id: 'patterns', icon: Languages, label: 'Sentence Patterns', desc: 'Frames, structures, and models by level' },
    { id: 'phonics', icon: Lightbulb, label: 'Phonics & Fluency', desc: 'Scope & sequence, strategies' },
    { id: 'subplans', icon: FileText, label: 'Sub Plans', desc: 'Substitute teacher lesson plans' },
  ]

  if (section === 'home') {
    return (
      <div className="px-8 py-6 max-w-[1000px] mx-auto">
        <h2 className="font-display text-2xl font-bold text-navy mb-1">{ko ? '교사 자료실' : 'Teacher Resources'}</h2>
        <p className="text-[12px] text-text-tertiary mb-6">Quick-reference guides for daily instruction. Not training — just the things you need to look up fast.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)} className="text-left bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:border-navy/20 transition-all group">
              <n.icon size={24} className="text-navy mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-[14px] font-bold text-navy mb-1">{n.label}</h3>
              <p className="text-[11px] text-text-tertiary leading-relaxed">{n.desc}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Back button + section header
  const navItem = NAV.find(n => n.id === section)
  return (
    <div className="px-8 py-6 max-w-[1000px] mx-auto">
      <button onClick={() => setSection('home')} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-tertiary hover:text-navy mb-4">
        ← Back to Resources
      </button>
      <h2 className="font-display text-xl font-bold text-navy mb-1">{navItem?.label}</h2>
      <p className="text-[12px] text-text-tertiary mb-6">{navItem?.desc}</p>

      {section === 'skills' && <ELASkillsReference />}
      {section === 'grammar' && <GrammarIndex />}
      {section === 'patterns' && <SentencePatterns />}
      {section === 'phonics' && (
        <>
          <div className="flex gap-1 mb-5">
            {(['sequence', 'strategies'] as const).map(t => (
              <button key={t} onClick={() => setPhonicsTab(t)} className={`px-4 py-2 rounded-lg text-[12px] font-medium ${phonicsTab === t ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
                {t === 'sequence' ? 'Scope & Sequence' : 'Teaching Strategies'}
              </button>
            ))}
          </div>
          {phonicsTab === 'sequence' && <PhonicsSequence />}
          {phonicsTab === 'strategies' && <PhonicsStrategies />}
        </>
      )}
      {section === 'subplans' && <SubPlansContent />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// ELA/ESL SKILLS REFERENCE
// ═══════════════════════════════════════════════════════════════════

const ELA_SKILLS = [
  {
    name: 'Main Idea', domain: 'Reading', ccss: 'RI.x.2',
    what: 'Identifying the most important point the author is making in a text. Not a detail — the big takeaway.',
    example: 'After reading a passage about recycling, a student says: "This is about how recycling helps the Earth by reducing trash." That is the main idea. "Plastic takes 500 years to decompose" is a supporting detail.',
    howToTeach: [
      'Read aloud a short paragraph. Cover the text. Ask: "What was that mostly about?" Accept answers in L1 if needed.',
      'Teach the "umbrella" strategy: the main idea is the umbrella, details are the raindrops underneath it.',
      'Give students 3 sentences from a paragraph. Ask them to sort which is the main idea and which are details.',
      'Use the headline test: "If this were a news article, what would the headline be?"',
    ],
    koreanNote: 'Korean students often confuse 주제 (topic) with 중심 생각 (main idea). The topic is one word ("recycling"). The main idea is a full sentence about the topic.',
  },
  {
    name: 'Inference', domain: 'Reading', ccss: 'RL.x.1, RI.x.1',
    what: 'Using clues from the text plus what you already know to figure out something the author did not say directly.',
    example: '"Sarah grabbed her umbrella and raincoat before leaving." We can infer it is raining, even though the text never says "it is raining."',
    howToTeach: [
      'Model with pictures first: show an image and ask "What do you think is happening? What clues tell you?"',
      'Use the formula: Text Clue + What I Already Know = Inference. Write it on the board.',
      'Read a short passage and stop before the ending. Ask students to predict what happens next and explain WHY.',
      'Sentence frame: "I think ___ because the text says ___ and I know that ___."',
    ],
    koreanNote: 'Inferencing is a higher-order skill that requires strong vocabulary. For WIDA 1-2, use picture-based inference before text-based.',
  },
  {
    name: 'Context Clues', domain: 'Reading/Vocabulary', ccss: 'L.x.4',
    what: 'Figuring out the meaning of an unknown word by looking at the words and sentences around it.',
    example: '"The arid desert had no water for miles." A student can figure out "arid" means dry because deserts have no water.',
    howToTeach: [
      'Teach the PAVE strategy: Predict meaning → Actually look it up → Verify → Elaborate with your own sentence.',
      'Highlight unknown words in a passage. Read the sentence before and after. Ask: "What word could replace this?"',
      'Teach 4 types of clues: definition clue (means/is), example clue (such as/like), contrast clue (but/however), logic clue (makes sense because).',
      'Practice with cloze sentences: "The ___ dog barked loudly and scared the mailman." (Missing word: aggressive/big/angry)',
    ],
    koreanNote: 'Korean students may skip unknown words entirely. Train them to stop, look around the word, and make a guess before moving on.',
  },
  {
    name: 'Summarizing', domain: 'Reading', ccss: 'RL.x.2, RI.x.2',
    what: 'Retelling the most important parts of a text in your own words, in order, leaving out small details.',
    example: 'A 3-sentence summary of a chapter book: "First, the character found a map. Then, she followed it to a cave. Finally, she discovered the treasure was friendship."',
    howToTeach: [
      'Teach "Somebody-Wanted-But-So-Then" for narratives: Who wanted what? What was the problem? What happened?',
      'For informational text, teach "What? So What?": What is the topic? Why does it matter?',
      'Give students a paragraph and 10 words. They must summarize using only those 10 words.',
      'Use a 3-2-1 exit ticket: 3 things you learned, 2 things that were interesting, 1 question you still have.',
    ],
    koreanNote: 'Many ELLs retell instead of summarize — they include every detail. Explicitly teach the difference: retelling = everything; summary = only the important parts.',
  },
  {
    name: 'Compare & Contrast', domain: 'Reading', ccss: 'RL.x.9, RI.x.9',
    what: 'Identifying how two or more things are similar (compare) and how they are different (contrast).',
    example: 'Dogs and cats are both pets (compare), but dogs need walks while cats do not (contrast).',
    howToTeach: [
      'Start with objects students can see and touch: "How are a pencil and a pen the same? Different?"',
      'Venn diagrams work, but also try T-charts (one column per item) for lower-level students.',
      'Teach signal words: Same/both/also/too = compare. But/however/while/unlike = contrast.',
      'Sentence frames: "___ and ___ are similar because ___." / "___ is different from ___ because ___."',
    ],
    koreanNote: 'Korean uses different particles for comparison (보다, 처럼). Point out that English uses separate words (like, unlike, than) rather than word endings.',
  },
  {
    name: 'Author\'s Purpose', domain: 'Reading', ccss: 'RI.x.6, RL.x.6',
    what: 'Understanding WHY the author wrote the text. The three main purposes: to inform, to persuade, or to entertain.',
    example: 'A science article about volcanoes → inform. An ad for a toy → persuade. A funny story about a talking dog → entertain.',
    howToTeach: [
      'Use PIE: Persuade, Inform, Entertain. Give students short texts and have them sort into PIE categories.',
      'Ask: "After reading this, does the author want me to learn something, buy something, or laugh/feel something?"',
      'Show real-world examples: menus (inform), commercials (persuade), comics (entertain).',
      'For advanced students, introduce a fourth purpose: to explain (how-to texts, recipes, instructions).',
    ],
    koreanNote: 'The concept of "author\'s purpose" may be unfamiliar — Korean reading instruction often focuses more on comprehension than critical analysis of the author.',
  },
  {
    name: 'Text Structure', domain: 'Reading', ccss: 'RI.x.5',
    what: 'How the information in a text is organized. Five main structures: sequence, cause/effect, problem/solution, compare/contrast, description.',
    example: 'A recipe is sequence structure. An article about pollution causing health problems is cause/effect.',
    howToTeach: [
      'Teach one structure at a time over several weeks. Use graphic organizers matched to each structure.',
      'Teach signal words for each: First/then/next (sequence), because/so/therefore (cause-effect), the problem is/one solution (problem-solution).',
      'Give students a short paragraph and 5 structure cards. They hold up the card that matches.',
      'Cut up a text into pieces. Students reassemble it using signal words as clues.',
    ],
    koreanNote: 'Korean text structure is often topic → background → details → conclusion. English academic text tends to be thesis-first. Make this difference explicit.',
  },
  {
    name: 'Cause & Effect', domain: 'Reading', ccss: 'RI.x.3, RL.x.3',
    what: 'Understanding why something happened (cause) and what happened as a result (effect).',
    example: '"Because it rained all day (cause), the soccer game was cancelled (effect)."',
    howToTeach: [
      'Use a simple chain: domino visuals. One event pushes the next. What started it? What happened because of it?',
      'Teach signal words: because, so, therefore, as a result, since, due to, led to.',
      'Ask two questions about every event: "Why did this happen?" (cause) and "What happened next?" (effect).',
      'Sentence frame: "___ happened because ___." or "Because ___, then ___."',
    ],
    koreanNote: 'Korean word order puts the cause before the effect naturally (비가 와서 = because rain came). English can put either first. Practice both orders.',
  },
  {
    name: 'Text Evidence', domain: 'Reading', ccss: 'RL.x.1, RI.x.1',
    what: 'Pointing to specific words, sentences, or passages in the text that support your answer.',
    example: 'Q: "How does the character feel?" A: "She feels nervous because the text says her hands were shaking."',
    howToTeach: [
      'Train the habit: "Go back to the text." Every time a student answers, ask "Where does it say that? Show me."',
      'Teach ACE: Answer the question, Cite evidence from the text, Explain how the evidence supports your answer.',
      'Use highlighters: students physically highlight the sentence that proves their answer.',
      'Sentence starters: "According to the text..." / "The author states..." / "On page ___, it says..."',
    ],
    koreanNote: 'Korean students may answer from memory or opinion. Build the reflex of going back to the text by making it a classroom routine, not just a test skill.',
  },
  {
    name: 'Vocabulary in Context', domain: 'Vocabulary', ccss: 'L.x.4, L.x.5, L.x.6',
    what: 'Understanding that words can mean different things in different sentences. Going beyond dictionary definitions.',
    example: '"Run" means something different in "run a race," "run a business," and "a run in her stockings."',
    howToTeach: [
      'Teach Tier 2 words (academic vocabulary that appears across subjects): analyze, compare, establish, significant.',
      'Use word maps: the word in the center, surrounded by definition, synonym, antonym, picture, and a sentence.',
      'Play "word of the day" — introduce one high-utility word each day. Students use it in conversation and writing.',
      'Sort vocabulary into categories: words I know well / words I have seen / words I have never seen.',
    ],
    koreanNote: 'Many Tier 2 English words have Sino-Korean equivalents (analyze = 분석, establish = 설립). Making this connection accelerates vocabulary acquisition for higher-level learners.',
  },
]

function ELASkillsReference() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return ELA_SKILLS
    const q = search.toLowerCase()
    return ELA_SKILLS.filter(s => s.name.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q) || s.what.toLowerCase().includes(q))
  }, [search])

  return (
    <div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
      </div>
      <div className="space-y-2">
        {filtered.map(skill => {
          const isOpen = expanded === skill.name
          return (
            <div key={skill.name} className="border border-border rounded-xl overflow-hidden bg-surface">
              <button onClick={() => setExpanded(isOpen ? null : skill.name)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-surface-alt/30 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-navy">{skill.name}</h3>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-navy/10 text-navy">{skill.domain}</span>
                    <span className="text-[9px] font-mono text-text-tertiary">{skill.ccss}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 truncate">{skill.what}</p>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-text-tertiary shrink-0" /> : <ChevronDown size={16} className="text-text-tertiary shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-5 pb-4 space-y-3 border-t border-border/50">
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">What It Is</p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">{skill.what}</p>
                  </div>
                  <div className="bg-surface-alt/50 border border-border rounded-lg p-3.5">
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Example</p>
                    <p className="text-[12px] text-text-primary leading-relaxed italic">{skill.example}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-2">How to Teach It</p>
                    <div className="space-y-2">
                      {skill.howToTeach.map((tip, i) => (
                        <div key={i} className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-navy/10 text-navy text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-[11px] text-text-secondary leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {skill.koreanNote && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Korean L1 Note</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">{skill.koreanNote}</p>
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
// GRAMMAR INDEX
// ═══════════════════════════════════════════════════════════════════

const GRAMMAR_DATA = [
  { category: 'Parts of Speech', items: [
    { term: 'Noun', definition: 'A person, place, thing, or idea.', examples: 'dog, school, happiness, Korea', teachTip: 'Start with concrete nouns students can see/touch. Label classroom objects. Progress to abstract nouns (feelings, ideas) later.', koreanNote: 'Korean nouns don\'t have articles (a/the) or plural -s. These must be explicitly taught and practiced constantly.' },
    { term: 'Verb', definition: 'An action word or state of being.', examples: 'run, eat, is, have, think', teachTip: 'TPR (Total Physical Response): say the verb, students act it out. Build a verb wall organized by tense.', koreanNote: 'Korean verbs come at the end of the sentence (SOV). English puts them in the middle (SVO). This is the #1 word order challenge.' },
    { term: 'Adjective', definition: 'A word that describes a noun.', examples: 'big, red, happy, three, Korean', teachTip: 'Play "describe the mystery object" — one student describes, others guess. Teach adjective order (opinion-size-age-shape-color-origin-material-purpose).', koreanNote: 'Korean adjectives often function as verbs (예쁘다 = to be pretty). In English, adjectives need a linking verb: "She is pretty."' },
    { term: 'Adverb', definition: 'A word that describes a verb, adjective, or other adverb. Often ends in -ly.', examples: 'quickly, very, always, never, well', teachTip: 'Teach adverbs by modifying known verbs: "He runs" → "He runs quickly/slowly/always." Show position flexibility in English.', koreanNote: 'Korean adverbs often come before verbs naturally. In English, adverb placement is more flexible but also more confusing.' },
    { term: 'Pronoun', definition: 'A word that replaces a noun.', examples: 'he, she, it, they, we, them', teachTip: 'Practice with picture stories: replace character names with pronouns. Create a pronoun reference chart: I/me/my/mine.', koreanNote: 'Korean often drops pronouns entirely. Students may write "Is happy" instead of "She is happy." Reinforce that English requires the pronoun.' },
    { term: 'Preposition', definition: 'A word that shows relationship between a noun and other words (location, time, direction).', examples: 'in, on, at, under, between, during', teachTip: 'Use a box and a small object. Physically place the object in, on, under, beside, behind the box while saying the preposition.', koreanNote: 'Korean uses particles (에, 에서, 위에) instead of separate preposition words. Students may omit prepositions: "I go school" instead of "I go to school."' },
    { term: 'Conjunction', definition: 'A word that connects words, phrases, or sentences.', examples: 'and, but, or, so, because, although', teachTip: 'Start with FANBOYS (for, and, nor, but, or, yet, so). Use them to combine short sentences into longer ones during writing.', koreanNote: 'Korean conjunctions often come as word endings (-고, -지만). English uses separate words between clauses.' },
  ]},
  { category: 'Verb Tenses', items: [
    { term: 'Simple Present', definition: 'Habitual actions or facts. Used for routines and general truths.', examples: 'I eat breakfast. She likes dogs. Water boils at 100°C.', teachTip: 'Practice with daily routines: "I wake up, I brush my teeth, I eat breakfast." Focus on the third-person -s: he/she/it walks.', koreanNote: 'Korean doesn\'t change verb forms for person. "I eat" and "she eat" feel the same. The third-person -s is a persistent error.' },
    { term: 'Present Progressive', definition: 'Action happening right now. Formed with am/is/are + -ing.', examples: 'I am reading. They are playing. She is sleeping.', teachTip: 'Point to what\'s happening in the moment: "I am writing on the board. You are listening." Have students describe what classmates are doing.', koreanNote: 'Korean uses -고 있다 for progressive, but much less frequently than English. Students may use simple present when progressive is needed.' },
    { term: 'Simple Past', definition: 'Completed action in the past. Regular verbs add -ed; irregular verbs change form.', examples: 'I walked to school. She ate lunch. They went home.', teachTip: 'Sort verbs into regular (-ed) and irregular (went, saw, ate). Irregular verbs need memorization — use flashcards, songs, and daily practice.', koreanNote: 'Korean past tense is consistent (-았/었). English irregular past tense (go→went, eat→ate) must be memorized individually.' },
    { term: 'Future (will / going to)', definition: 'Actions that will happen later.', examples: 'I will study tonight. She is going to travel next week.', teachTip: 'Practice with weekend plans: "What will you do this weekend?" Teach both "will" (spontaneous decisions) and "going to" (planned events).', koreanNote: 'Korean uses -ㄹ 것이다 for future. English has two common forms. Start with "will" for simplicity, add "going to" later.' },
  ]},
  { category: 'Common Challenges for ELLs', items: [
    { term: 'Subject-Verb Agreement', definition: 'The verb form must match the subject in number.', examples: 'He walks (not walk). They walk (not walks). She has (not have).', teachTip: 'Daily oral drill: point to a student → "She runs." Point to two students → "They run." Make it physical and fast-paced.', koreanNote: 'Korean verbs never change for subject. This agreement rule simply does not exist in Korean and requires constant reinforcement.' },
    { term: 'Articles (a, an, the)', definition: 'Small words before nouns. "A/an" = any one. "The" = a specific one.', examples: 'I saw a dog. The dog was big. An apple fell from the tree.', teachTip: 'Teach the "pointing test": if you can point to a specific thing, use "the." If you mean any one, use "a/an." Practice with classroom objects.', koreanNote: 'Korean has NO articles. This is the single most common grammar error for Korean ELLs and may never fully resolve at lower levels. Be patient.' },
    { term: 'Word Order', definition: 'English uses Subject-Verb-Object order. Questions invert the subject and auxiliary verb.', examples: 'Statement: She likes cats. Question: Does she like cats?', teachTip: 'Use sentence strips that students physically rearrange. Color-code: red = subject, blue = verb, green = object. Practice daily.', koreanNote: 'Korean is SOV (subject-object-verb): "She cats likes." The verb-in-middle pattern needs constant practice.' },
    { term: 'Possessives', definition: 'Showing ownership with apostrophe-s or possessive pronouns.', examples: 'The dog\'s bone. Maria\'s book. This is her pen. That is theirs.', teachTip: 'Practice with classroom objects: "Whose pencil is this? It is Min-jun\'s pencil." Use a possessives chart: my/your/his/her/its/our/their.', koreanNote: 'Korean uses the particle 의 for possession. Apostrophes do not exist in Korean. Students will write "Maria book" without the \'s.' },
    { term: 'Plural -s and -es', definition: 'Adding -s or -es to make nouns plural. Some nouns are irregular.', examples: 'cats, dogs, boxes, children, teeth, fish', teachTip: 'Sort nouns: add -s, add -es, or irregular. Teach the -es rule (sh, ch, x, s, z → -es). Make an irregular plurals poster.', koreanNote: 'Korean doesn\'t add plural endings — plurality is shown by context or numbers. Students consistently drop the -s. Overcorrect early.' },
  ]},
]

function GrammarIndex() {
  const [search, setSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<string>('Parts of Speech')

  const filtered = useMemo(() => {
    if (!search.trim()) return GRAMMAR_DATA
    const q = search.toLowerCase()
    return GRAMMAR_DATA.map(cat => ({
      ...cat,
      items: cat.items.filter(i => i.term.toLowerCase().includes(q) || i.definition.toLowerCase().includes(q) || i.examples.toLowerCase().includes(q))
    })).filter(cat => cat.items.length > 0)
  }, [search])

  return (
    <div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search grammar..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
      </div>
      <div className="space-y-3">
        {filtered.map(cat => {
          const isOpen = expandedCat === cat.category || search.trim().length > 0
          return (
            <div key={cat.category} className="border border-border rounded-xl overflow-hidden bg-surface">
              <button onClick={() => setExpandedCat(isOpen && !search ? '' : cat.category)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-surface-alt/30">
                <h3 className="text-[14px] font-bold text-navy flex-1">{cat.category}</h3>
                <span className="text-[10px] text-text-tertiary">{cat.items.length} items</span>
                {isOpen ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
              </button>
              {isOpen && (
                <div className="border-t border-border/50 divide-y divide-border/50">
                  {cat.items.map(item => (
                    <div key={item.term} className="px-5 py-3.5">
                      <div className="flex items-start gap-3 mb-2">
                        <h4 className="text-[13px] font-bold text-navy w-36 shrink-0">{item.term}</h4>
                        <p className="text-[11px] text-text-secondary leading-relaxed">{item.definition}</p>
                      </div>
                      <div className="ml-0 pl-[9.75rem] space-y-2">
                        <p className="text-[11px] text-text-tertiary"><span className="font-semibold text-text-secondary">Examples:</span> {item.examples}</p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                          <p className="text-[10px] font-semibold text-blue-700 mb-0.5">How to Teach</p>
                          <p className="text-[10px] text-blue-800 leading-relaxed">{item.teachTip}</p>
                        </div>
                        {item.koreanNote && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <p className="text-[10px] font-semibold text-amber-700 mb-0.5">Korean L1 Note</p>
                            <p className="text-[10px] text-amber-800 leading-relaxed">{item.koreanNote}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
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
// SENTENCE PATTERNS
// ═══════════════════════════════════════════════════════════════════

const PATTERN_DATA = [
  {
    level: 'Beginning (WIDA 1-2)',
    color: 'bg-red-50 border-red-200',
    intro: 'Students at this level are learning to produce single words and short phrases. Sentence frames are essential — they provide the structure so students can focus on meaning.',
    patterns: [
      { pattern: 'This is a ___.', use: 'Labeling and identifying', example: 'This is a pencil. This is a book.', tip: 'Point to objects as you say it. Students repeat and point.' },
      { pattern: 'I see ___.', use: 'Describing what they observe', example: 'I see a cat. I see three birds.', tip: 'Use during picture walks and science observations.' },
      { pattern: 'I like ___.', use: 'Expressing preferences', example: 'I like pizza. I like red.', tip: 'Survey activity: students ask each other "Do you like ___?" and record answers.' },
      { pattern: 'The ___ is ___.', use: 'Simple descriptions', example: 'The dog is big. The sky is blue.', tip: 'Adjective + noun practice. Use real objects or pictures.' },
      { pattern: '___ can ___.', use: 'Describing abilities', example: 'Fish can swim. I can read.', tip: 'Animal unit: "A bird can fly. A fish can swim. A dog can run."' },
      { pattern: 'I have ___.', use: 'Possession and counting', example: 'I have a pencil. I have two brothers.', tip: 'Show-and-tell format. Each student brings something and says "I have ___."' },
    ],
  },
  {
    level: 'Developing (WIDA 2-3)',
    color: 'bg-amber-50 border-amber-200',
    intro: 'Students can produce simple sentences and are beginning to add details. Frames should now include space for elaboration — adjectives, prepositional phrases, and reasons.',
    patterns: [
      { pattern: 'I think ___ because ___.', use: 'Giving opinions with reasons', example: 'I think dogs are the best pets because they are loyal.', tip: 'Essential for reading responses and class discussions. Practice daily.' },
      { pattern: 'First, ___. Then, ___. Finally, ___.', use: 'Sequencing events', example: 'First, I wake up. Then, I eat breakfast. Finally, I go to school.', tip: 'Use for retelling stories, describing procedures, and writing narratives.' },
      { pattern: 'The ___ is ___ because ___.', use: 'Descriptions with reasoning', example: 'The story is interesting because the character is brave.', tip: 'Build from the L1-L2 version by adding "because."' },
      { pattern: '___ is similar to ___ because ___.', use: 'Comparing', example: 'A cat is similar to a dog because both are pets.', tip: 'Pair with Venn diagrams for reading comprehension.' },
      { pattern: 'In the story, ___.', use: 'Text evidence', example: 'In the story, the boy finds a magic coin.', tip: 'Teaches students to reference the text before giving an answer.' },
      { pattern: 'I agree/disagree because ___.', use: 'Academic discussion', example: 'I agree because the text says water is important for plants.', tip: 'Use in partner talk and Accountable Talk protocols.' },
    ],
  },
  {
    level: 'Expanding (WIDA 3-4)',
    color: 'bg-green-50 border-green-200',
    intro: 'Students can write and speak in paragraphs. Focus shifts to complex sentences, transition words, and academic register. Frames become optional scaffolds rather than required templates.',
    patterns: [
      { pattern: 'Although ___, ___.', use: 'Showing contrast', example: 'Although it was raining, we still played outside.', tip: 'Teach as an upgrade from "but" — makes writing sound more academic.' },
      { pattern: 'According to the text, ___.', use: 'Citing evidence formally', example: 'According to the text, the main character moved to a new city.', tip: 'Required for any text-based response. Pair with page numbers.' },
      { pattern: 'One reason ___ is ___.', use: 'Building arguments', example: 'One reason recycling is important is that it reduces waste.', tip: 'Use in opinion writing as a paragraph starter for body paragraphs.' },
      { pattern: 'For example, ___.', use: 'Supporting with evidence', example: 'Many animals migrate. For example, whales travel thousands of miles.', tip: 'Teach as the "proof" sentence after a claim.' },
      { pattern: 'This shows that ___.', use: 'Explaining evidence', example: 'The character cried when she saw the letter. This shows that she was emotional.', tip: 'Completes the ACE (Answer-Cite-Explain) response structure.' },
      { pattern: 'In contrast, ___.', use: 'Compare and contrast essays', example: 'Dogs need daily walks. In contrast, cats are more independent.', tip: 'Teach alongside "similarly" and "on the other hand."' },
    ],
  },
  {
    level: 'Bridging (WIDA 4-5+)',
    color: 'bg-blue-50 border-blue-200',
    intro: 'Students are approaching grade-level English. The focus is on precision, register, and style. No frames needed — instead, model sophisticated sentence structures and have students practice varying their writing.',
    patterns: [
      { pattern: 'Not only ___, but also ___.', use: 'Emphasis and elaboration', example: 'Not only did the experiment fail, but it also damaged the equipment.', tip: 'Teach as a way to make writing more persuasive and detailed.' },
      { pattern: 'Despite ___, ___.', use: 'Concession', example: 'Despite the challenges, the team completed the project on time.', tip: 'More sophisticated than "although." Good for essays and formal writing.' },
      { pattern: 'The evidence suggests that ___.', use: 'Academic analysis', example: 'The evidence suggests that the author supports conservation.', tip: 'For literary analysis and research writing. Models tentative, evidence-based claims.' },
      { pattern: 'While it is true that ___, it is also important to consider ___.', use: 'Balanced argumentation', example: 'While it is true that homework builds skills, it is also important to consider student wellbeing.', tip: 'Advanced persuasive writing. Shows ability to consider multiple perspectives.' },
      { pattern: 'As a result of ___, ___.', use: 'Cause and effect', example: 'As a result of the new policy, attendance improved significantly.', tip: 'Upgrade from "because" and "so." More formal register.' },
    ],
  },
]

function SentencePatterns() {
  return (
    <div className="space-y-5">
      {PATTERN_DATA.map(level => (
        <div key={level.level} className={'border rounded-xl overflow-hidden ' + level.color}>
          <div className="px-5 py-3.5">
            <h3 className="text-[14px] font-bold text-navy mb-1">{level.level}</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">{level.intro}</p>
          </div>
          <div className="border-t border-border/30">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-white/50">
                  <th className="text-left px-5 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold w-[220px]">Pattern</th>
                  <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold w-[140px]">Use</th>
                  <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">Example</th>
                  <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-tertiary font-semibold w-[200px]">Teaching Tip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {level.patterns.map(p => (
                  <tr key={p.pattern}>
                    <td className="px-5 py-2.5 font-mono font-bold text-navy align-top">{p.pattern}</td>
                    <td className="px-3 py-2.5 text-text-secondary align-top">{p.use}</td>
                    <td className="px-3 py-2.5 text-text-primary italic align-top">{p.example}</td>
                    <td className="px-3 py-2.5 text-text-tertiary align-top">{p.tip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SUB PLANS (preserved from original)
// ═══════════════════════════════════════════════════════════════════

function SubPlansContent() {
  const { currentTeacher, showToast } = useApp()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })

  const CLASSES = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('sub_plans').select('*, teachers(english_name)').order('english_class').order('created_at', { ascending: false })
      setPlans(data || [])
      setLoading(false)
    })()
  }, [])

  const handleAdd = async () => {
    if (!form.title.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('sub_plans').insert({
      title: form.title.trim(), english_class: form.english_class, grade: form.grade,
      description: form.description.trim() || null, how_to: form.how_to.trim() || null,
      drive_link: form.drive_link.trim() || null, created_by: currentTeacher.id,
    }).select('*, teachers(english_name)').single()
    if (error) { showToast('Error: ' + error.message); return }
    if (data) setPlans(prev => [data, ...prev])
    setForm({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })
    setShowForm(false)
    showToast('Sub plan added')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sub_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
    showToast('Deleted')
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const filtered = filterClass === 'all' ? plans : plans.filter(p => p.english_class === filterClass)
  const grouped: Record<string, any[]> = {}
  filtered.forEach(p => {
    const key = p.english_class + ' (Grade ' + p.grade + ')'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  return (
    <div>
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-[11px] text-red-800">
        Each teacher uploads sub plans for their class. Include lesson descriptions, how to administer, and optionally link to Google Drive materials.
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          <button onClick={() => setFilterClass('all')}
            className={'px-3 py-1.5 rounded-lg text-[11px] font-medium ' + (filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border')}>All</button>
          {CLASSES.map(c => (
            <button key={c} onClick={() => setFilterClass(c)}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-medium ' + (filterClass === c ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border')}>{c}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white">{showForm ? 'Cancel' : '+ Add Sub Plan'}</button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Lesson title"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
          <div className="flex gap-3">
            <select value={form.english_class} onChange={e => setForm(f => ({ ...f, english_class: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: +e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {[1,2,3,4,5].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description of the lesson (what students will do)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <textarea value={form.how_to} onChange={e => setForm(f => ({ ...f, how_to: e.target.value }))} placeholder="How to administer (step-by-step for the substitute)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="Google Drive link (optional)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
          <button onClick={handleAdd} disabled={!form.title.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white disabled:opacity-40">Save Sub Plan</button>
        </div>
      )}

      {Object.keys(grouped).length === 0 && <p className="text-center text-text-tertiary py-8 text-[12px]">No sub plans yet. Add one for your class.</p>}

      {Object.entries(grouped).map(([key, items]) => (
        <div key={key} className="mb-5">
          <h3 className="text-[13px] font-bold text-navy mb-2">{key}</h3>
          <div className="space-y-2">
            {items.map((p: any) => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-[13px] font-semibold text-navy">{p.title}</h4>
                  <div className="flex items-center gap-2">
                    {p.drive_link && <a href={p.drive_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-medium">Google Drive</a>}
                    {currentTeacher?.id === p.created_by && <button onClick={() => handleDelete(p.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete</button>}
                  </div>
                </div>
                {p.description && <p className="text-[11px] text-text-primary leading-relaxed mt-1">{p.description}</p>}
                {p.how_to && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">How to Administer:</p>
                    <p className="text-[10px] text-amber-800 leading-relaxed whitespace-pre-line">{p.how_to}</p>
                  </div>
                )}
                <p className="text-[9px] text-text-tertiary mt-2">Added by {p.teachers?.english_name || 'Unknown'} on {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
