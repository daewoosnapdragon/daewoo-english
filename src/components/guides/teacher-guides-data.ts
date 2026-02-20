// ═══════════════════════════════════════════════════════════════════
// Teacher Guides Data — Daewoo English Program
// RESTRUCTURED: typed content blocks for visual rendering
// ═══════════════════════════════════════════════════════════════════

// ─── Content Block Types ─────────────────────────────────────────

export type ContentBlock =
  | { type: 'text'; value: string }
  | { type: 'callout'; label: string; value: string }
  | { type: 'list'; label?: string; items: { bold?: string; text: string }[] }
  | { type: 'steps'; label?: string; items: { title: string; text: string }[] }
  | { type: 'levels'; label?: string; items: { level: string; color: string; text: string }[] }
  | { type: 'example'; label?: string; value: string }
  | { type: 'grid'; label?: string; items: { title: string; text: string; color?: string }[] }
  | { type: 'tip'; value: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'do-dont'; doItems: string[]; dontItems: string[] }

// ─── Guide Types ─────────────────────────────────────────────────

export interface GuideSection {
  title: string
  blocks: ContentBlock[]
}

export interface ResearchRef {
  author: string
  concept: string
  connection: string
}

export interface Guide {
  id: string
  category: string
  title: string
  source: string
  sourceUrl: string
  summary: string
  whenToUse: string
  tags: string[]
  sections: GuideSection[]
  relatedResearch: ResearchRef[]
  relatedGuides: string[]  // ids of other guides
}

export interface Category {
  id: string
  label: string
  icon: string
  color: string
  description: string
}

// ─── Categories ──────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  { id: 'scaffolding', label: 'Scaffolding & Differentiation', icon: 'layers', color: '#8B5CF6', description: 'Scaffolding types, differentiation strategies, and supporting multilingual learners at every proficiency level' },
  { id: 'reading', label: 'Reading Instruction', icon: 'book-open', color: '#22C55E', description: 'Comprehension strategies, read-alouds, fluency, inferencing, summarizing, and visible reading techniques' },
  { id: 'writing', label: 'Writing Instruction', icon: 'pen-tool', color: '#EC4899', description: 'Paragraph and sentence-level instruction, revision strategies, mentor texts, and quick writes' },
  { id: 'vocabulary', label: 'Vocabulary & Language', icon: 'message-square', color: '#F59E0B', description: 'Tiered vocabulary, academic language, grammar in context, and language development stages' },
  { id: 'assessment', label: 'Assessment & Data', icon: 'clipboard', color: '#3B82F6', description: 'Informal assessments, equitable test design, taxonomies, and formative assessment loops' },
  { id: 'classroom', label: 'Classroom Environment', icon: 'heart', color: '#EF4444', description: 'SEL strategies, dialogue journals, language-rich environments, and building trust' },
  { id: 'lesson-design', label: 'Lesson Planning & Delivery', icon: 'layout', color: '#06B6D4', description: 'SIOP planning, chunking instruction, combining standards, and workshop models' },
  { id: 'gifted', label: 'Gifted & Advanced Learners', icon: 'star', color: '#A855F7', description: 'Pre-assessment, creative thinking, depth and complexity, and student choice' },
  { id: 'foundations', label: 'ELL Foundations & Program Models', icon: 'globe', color: '#14B8A6', description: 'Core ELL principles, program models, newcomer support, WIDA Key Uses, and translanguaging' },
]

// ─── Guides ──────────────────────────────────────────────────────

export const GUIDES: Guide[] = [

  // ═══════════════════════════════════════════════════════════════
  // SCAFFOLDING & DIFFERENTIATION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'three-types-scaffolding',
    category: 'scaffolding',
    title: 'Three Types of Scaffolding for ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/scaffolding-for-ells/',
    summary: 'WIDA identifies three scaffold categories that make grade-level content accessible: sensory, graphic, and interactive. Each serves a different purpose and works best at different proficiency levels.',
    whenToUse: 'Every time you plan a lesson. Mental checklist: have I included at least one scaffold from each category?',
    tags: ['WIDA', 'scaffolding', 'differentiation'],
    sections: [
      {
        title: 'The Three Categories',
        blocks: [
          { type: 'grid', items: [
            { title: 'Sensory Scaffolds', color: '#8B5CF6', text: 'Use the five senses to make abstract content concrete. Most powerful for WIDA 1-2 because they bypass language entirely.' },
            { title: 'Graphic Scaffolds', color: '#3B82F6', text: 'Organize information visually so students see relationships between ideas without relying on dense text.' },
            { title: 'Interactive Scaffolds', color: '#22C55E', text: 'Use other people as resources. Students learn language by using language with peers, not by studying it silently.' },
          ]},
        ],
      },
      {
        title: 'Sensory Scaffolds in Detail',
        blocks: [
          { type: 'list', label: 'What counts as sensory', items: [
            { bold: 'Real objects (realia)', text: 'Physical items students can see and touch' },
            { bold: 'Visuals', text: 'Photographs, illustrations, videos, maps, physical models' },
            { bold: 'Body language', text: 'Gestures, facial expressions, demonstrations, acting out' },
            { bold: 'Manipulatives', text: 'Science lab equipment, math blocks, sorting materials' },
          ]},
          { type: 'example', label: 'In your classroom', value: 'Teaching "erosion"? Bring in a tray of sand and pour water over it instead of explaining verbally. Teaching "compare and contrast"? Place two actual objects on the table. Teaching story elements? Act out a short scene. Replace words-about-things with the things themselves.' },
          { type: 'callout', label: 'When to use', value: 'Essential for WIDA 1-2 (Entering/Emerging). Still valuable at all levels for introducing unfamiliar content. If you find yourself using lots of words and students look lost, that is your signal to switch to a sensory scaffold.' },
        ],
      },
      {
        title: 'Graphic Scaffolds in Detail',
        blocks: [
          { type: 'list', label: 'What counts as graphic', items: [
            { bold: 'Comparison tools', text: 'T-charts, Venn diagrams, comparison tables' },
            { bold: 'Sequence tools', text: 'Flow charts, timelines, cycle diagrams' },
            { bold: 'Organization tools', text: 'Concept maps, KWL charts, categorized word walls' },
            { bold: 'Reference tools', text: 'Anchor charts, labeled diagrams, word walls' },
          ]},
          { type: 'example', label: 'In your classroom', value: 'Before reading about animal habitats, give a partially-filled table with columns for "Animal," "Habitat," "Food," and "Adaptation." Students fill it in as they read. This turns comprehension from "read and remember everything" into "read and find four specific things."' },
          { type: 'tip', value: 'The best graphic organizers constrain the task without constraining the thinking. A Venn diagram comparing two characters still requires analysis -- it just gives the student a place to put their thinking instead of a blank page.' },
        ],
      },
      {
        title: 'Interactive Scaffolds in Detail',
        blocks: [
          { type: 'list', label: 'What counts as interactive', items: [
            { bold: 'Pair work', text: 'Think-Pair-Share, partner reading, peer editing' },
            { bold: 'Group structures', text: 'Small group discussions, jigsaw activities, collaborative projects' },
            { bold: 'Interviews', text: 'Student-to-student interviews, gallery walks with discussion' },
          ]},
          { type: 'do-dont', doItems: [
            'Give sentence starters ("I agree because..." / "I noticed that...")',
            'Assign a specific question to answer',
            'Set a time limit and assign roles (speaker/listener)',
            'Pair beginning ELLs with intermediate (not advanced) peers',
          ], dontItems: [
            'Tell students to "discuss with your partner" without structure',
            'Pair beginners with advanced students (too big a gap)',
            'Ban home language use during partner work',
          ]},
        ],
      },
      {
        title: 'Removing Scaffolds',
        blocks: [
          { type: 'callout', label: 'Key principle', value: 'Scaffolds are temporary by definition. If a student still needs the same graphic organizer in May that they needed in September, the scaffold has become a crutch.' },
          { type: 'steps', label: 'Gradual removal sequence', items: [
            { title: 'Reduce pre-filled content', text: 'Give the same organizer but with fewer cells already filled in' },
            { title: 'Simplify the scaffold', text: 'Switch from a detailed organizer to a simpler one (e.g., full table to a basic T-chart)' },
            { title: 'Make it optional', text: 'Offer the scaffold but do not distribute it automatically. Let students request it if needed.' },
            { title: 'Remove entirely', text: 'Students work without the scaffold. Previous anchor charts remain posted as reference.' },
          ]},
          { type: 'tip', value: 'Watch for students who can do the task without the scaffold but choose to use it anyway -- that is your signal they are ready to let go.' },
        ],
      },
    ],
    relatedResearch: [
      { author: 'Vygotsky', concept: 'Zone of Proximal Development', connection: 'Scaffolds work in the ZPD -- the gap between what a student can do alone and what they can do with support' },
      { author: 'Krashen', concept: 'Input Hypothesis (i+1)', connection: 'Sensory and graphic scaffolds make grade-level content comprehensible at i+1' },
      { author: 'WIDA', concept: 'Can-Do Descriptors', connection: 'Use Can-Do Descriptors to determine which scaffold types match each proficiency level' },
      { author: 'Gibbons', concept: 'Scaffolding Language, Scaffolding Learning', connection: 'Detailed framework for how scaffolds move students from everyday to academic language' },
    ],
    relatedGuides: ['comprehensible-input', 'keeping-rigor-high', 'language-scaffolds', 'fostering-independence'],
  },

  {
    id: 'emotional-scaffolds',
    category: 'scaffolding',
    title: 'Emotional Scaffolds: Lowering the Affective Filter',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/emotional-scaffolds/',
    summary: 'Krashen\'s Affective Filter Hypothesis: anxiety, low motivation, and low self-confidence block language acquisition even when input is comprehensible.',
    whenToUse: 'When students shut down, refuse to participate, or give one-word answers despite being capable of more. At the start of the year or when welcoming a new student.',
    tags: ['affective filter', 'newcomers', 'classroom culture'],
    sections: [
      {
        title: 'What Raises the Affective Filter',
        blocks: [
          { type: 'list', items: [
            { text: 'Being called on without warning' },
            { text: 'Being corrected publicly in front of peers' },
            { text: 'Not understanding what is happening and having no way to find out' },
            { text: 'Feeling like the only one who does not get it' },
            { text: 'Having your home language treated as a problem' },
            { text: 'Being asked to perform in English before you are ready' },
            { text: 'Time pressure on speaking tasks' },
          ]},
        ],
      },
      {
        title: 'Daily Welcoming Routines',
        blocks: [
          { type: 'list', items: [
            { bold: 'Greet by name at the door', text: 'Single highest-impact relationship move you can make daily' },
            { bold: 'Learn greetings in home languages', text: 'Say "hello" and "good job" in each student\'s language. Your willingness to try matters more than pronunciation.' },
            { bold: 'Post a visual schedule', text: 'Daily schedule with both words AND icons. Students always know what is coming next.' },
            { bold: 'Use predictable routines', text: 'Reduces anxiety because students do not have to decode both the language AND the expectations simultaneously' },
          ]},
        ],
      },
      {
        title: 'Validating Home Languages',
        blocks: [
          { type: 'do-dont', doItems: [
            'Allow brainstorming, notes, and discussion in home language before English production',
            'Label classroom objects in multiple languages',
            'Display bilingual word walls',
            'Let students write first drafts in their strongest language, then translate',
            'When a student uses their home language, say "Great thinking -- can you also tell me in English?"',
          ], dontItems: [
            'Enforce "English only" policies',
            'Treat home language use as cheating or laziness',
            'Assume bilingual support slows down English acquisition (research shows the opposite)',
          ]},
        ],
      },
      {
        title: 'The Silent Period',
        blocks: [
          { type: 'callout', label: 'This is normal', value: 'Newcomers often go through a silent period lasting weeks to months where they absorb language but produce very little. This is normal and productive, not a problem to fix.' },
          { type: 'list', label: 'During the silent period', items: [
            { text: 'Do NOT force oral production' },
            { text: 'Accept responses via gestures, drawings, pointing, or single words' },
            { text: 'Give group roles that do not require speaking (illustrator, materials manager)' },
            { text: 'Know that they ARE learning even when silent' },
          ]},
        ],
      },
      {
        title: 'Building Academic Risk-Taking',
        blocks: [
          { type: 'steps', items: [
            { title: 'Normalize mistakes explicitly', text: '"In this classroom, mistakes help our brains grow." Say this often.' },
            { title: 'Give processing time', text: '10-15 seconds before expecting answers, not 3 seconds' },
            { title: 'Use "turn and talk" first', text: 'Students rehearse their answer with a partner before whole-class sharing' },
            { title: 'Celebrate attempts', text: 'Respond to the CONTENT of what they said before addressing language: "You think the character is angry because she lost her dog? Interesting! Let me write that: The character IS angry because she LOST her dog."' },
          ]},
        ],
      },
    ],
    relatedResearch: [
      { author: 'Krashen', concept: 'Affective Filter Hypothesis', connection: 'Anxiety, low motivation, and low self-confidence create a mental block that prevents language acquisition' },
      { author: 'Cummins', concept: 'Common Underlying Proficiency', connection: 'Skills and knowledge in the home language transfer to the new language -- validating L1 accelerates L2' },
      { author: 'Thomas & Collier', concept: 'Prism Model', connection: 'Sociocultural processes are one of four interdependent factors in second language acquisition' },
    ],
    relatedGuides: ['language-scaffolds', 'sel-strategies', 'dialogue-journals', 'translanguaging'],
  },

  {
    id: 'language-scaffolds',
    category: 'scaffolding',
    title: 'Language Scaffolds: Starters, Frames, and Word Banks',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-scaffolds/',
    summary: 'Language scaffolds give students the English structures they need to express thinking they can already do in their head.',
    whenToUse: 'Any time students produce academic language -- writing, discussions, presentations, answering questions. Essential for WIDA 1-3.',
    tags: ['sentence starters', 'sentence frames', 'word banks'],
    sections: [
      {
        title: 'Starters vs. Frames',
        blocks: [
          { type: 'grid', items: [
            { title: 'Sentence Starters', color: '#3B82F6', text: 'Give the beginning, student completes it. "I think ___ because ___." Best for WIDA 3+ who need a push into academic register.' },
            { title: 'Sentence Frames', color: '#8B5CF6', text: 'Provide more structure. "The character felt ___ when ___ happened, which shows that ___." Best for WIDA 1-2 who need full grammatical structure.' },
          ]},
          { type: 'tip', value: 'Always offer BOTH on the same handout so students self-select their level of support.' },
        ],
      },
      {
        title: 'Word Banks That Actually Help',
        blocks: [
          { type: 'do-dont', doItems: [
            '6-10 words organized by function',
            'Visual support (small illustrations) next to each word',
            'Words grouped by role: "SIMILARITIES: both, also, similarly" / "DIFFERENCES: however, unlike, on the other hand"',
          ], dontItems: [
            'A random list of 20 vocabulary words on the board',
            'Words without visual support or organizational structure',
            'Too many words (students cannot process more than 6-10)',
          ]},
          { type: 'example', label: 'Compare/contrast word bank', value: 'SIMILARITIES: both, also, similarly, in the same way  |  DIFFERENCES: however, unlike, on the other hand, whereas  |  CONTENT: habitat, adaptation, predator, prey [with small illustrations next to each]' },
        ],
      },
      {
        title: 'Differentiated by Proficiency',
        blocks: [
          { type: 'levels', items: [
            { level: 'WIDA 1', color: '#EF4444', text: 'Full sentence with ONE blank for a content word plus a picture bank. "The ___ lives in the ocean."' },
            { level: 'WIDA 2', color: '#F59E0B', text: 'Sentence frames with 2-3 blanks. "The ___ lives in the ___ and eats ___."' },
            { level: 'WIDA 3', color: '#22C55E', text: 'Sentence starters only. "One adaptation of this animal is..."' },
            { level: 'WIDA 4-5', color: '#3B82F6', text: 'Transition word bank only. Students construct their own sentences but have access to academic connectors.' },
          ]},
        ],
      },
      {
        title: 'Gradual Removal Timeline',
        blocks: [
          { type: 'steps', items: [
            { title: 'Week 1-2', text: 'Full sentence frames with word banks' },
            { title: 'Week 3-4', text: 'Sentence starters only (frames available on request)' },
            { title: 'Week 5-6', text: 'Transition word bank only' },
            { title: 'Week 7+', text: 'No scaffolds distributed, but anchor charts remain posted' },
          ]},
          { type: 'callout', label: 'Important', value: 'This timeline varies by student. The test is simple: can the student produce this type of language without the scaffold? If yes, remove it. If no, keep it.' },
        ],
      },
    ],
    relatedResearch: [
      { author: 'Gibbons', concept: 'Mode Continuum', connection: 'Scaffolds help students move along the continuum from everyday spoken language to academic written language' },
      { author: 'Swain', concept: 'Output Hypothesis', connection: 'Students need to produce language (not just receive it) to develop proficiency -- frames enable production' },
      { author: 'WIDA', concept: 'Can-Do Descriptors', connection: 'Match scaffold complexity to what students CAN do at each level, not what they cannot do' },
    ],
    relatedGuides: ['three-types-scaffolding', 'fostering-independence', 'academic-language', 'quick-writes'],
  },

  {
    id: 'keeping-rigor-high',
    category: 'scaffolding',
    title: 'Keeping the Rigor High for Multilingual Learners',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/keeping-the-rigor-high/',
    summary: 'The most common mistake: lowering cognitive demand instead of providing scaffolds. WIDA 1 students can analyze, evaluate, and create -- they need a different pathway, not easier content.',
    whenToUse: 'When planning differentiated activities. Check: am I changing the thinking required, or just the delivery method?',
    tags: ['rigor', 'cognitive demand', 'differentiation'],
    sections: [
      {
        title: 'The Three-Step Process',
        blocks: [
          { type: 'steps', items: [
            { title: 'Identify the thinking required', text: 'Use WIDA Key Uses (Recount, Explain, Argue, Discuss) or Bloom\'s to name the cognitive task. "Compare two characters\' motivations" = analysis.' },
            { title: 'Identify what the student CAN do', text: 'WIDA 1: point, draw, sort, match, single words. WIDA 2: short phrases, sentence frames. WIDA 3: short paragraphs with support. WIDA 4-5: extended writing with transition support.' },
            { title: 'Create a can-do opportunity', text: 'Preserve the analysis but change the output mode. The WIDA 1 student sorts character trait cards into two columns. The WIDA 3 student writes a paragraph using a frame. Both are analyzing.' },
          ]},
        ],
      },
      {
        title: 'What Lowered Rigor Looks Like',
        blocks: [
          { type: 'do-dont', doItems: [
            'ELLs analyze using picture sorting while others write essays (same thinking, different output)',
            'ELLs complete graphic organizers while others write paragraphs (same content, different format)',
            'ELLs discuss with sentence starters while others discuss freely (same depth, different support)',
          ], dontItems: [
            'ELLs color while other students write',
            'ELLs copy words from the board while others compose sentences',
            'ELLs "look up vocabulary" while others discuss a text',
            'ELLs "just listen" during group work',
          ]},
          { type: 'callout', label: 'The core distinction', value: 'The problem is never the thinking -- it is the language demand. Fix the language demand, keep the thinking.' },
        ],
      },
      {
        title: 'Concrete Example: Comparing Art Movements',
        blocks: [
          { type: 'text', value: 'Task: Compare Impressionism and Realism. All students are comparing. None are doing busywork.' },
          { type: 'levels', items: [
            { level: 'WIDA 4-5', color: '#3B82F6', text: 'Writes a comparative essay using evidence from artworks' },
            { level: 'WIDA 3', color: '#22C55E', text: 'Fills in a comparison chart using sentence frames: "Impressionism focuses on ___, while Realism focuses on ___"' },
            { level: 'WIDA 1-2', color: '#EF4444', text: 'Sorts painting reproductions into two categories, uses bilingual sticky notes to label observations ("bright/dark," "blurry/clear")' },
          ]},
        ],
      },
      {
        title: 'What to Differentiate',
        blocks: [
          { type: 'grid', items: [
            { title: 'Content (differentiate)', color: '#22C55E', text: 'Leveled texts, bilingual resources, pre-taught vocabulary, visual/video alternatives to reading' },
            { title: 'Process (differentiate)', color: '#3B82F6', text: 'Vary scaffolds (sensory, graphic, interactive) and grouping structures. Some need partners; others work independently.' },
            { title: 'Product (differentiate)', color: '#8B5CF6', text: 'Multiple output modes: drawing, speaking, writing, sorting, acting, building, labeling' },
          ]},
          { type: 'callout', label: 'Never differentiate', value: 'The THINKING LEVEL. If the standard says "analyze," every student analyzes.' },
        ],
      },
    ],
    relatedResearch: [
      { author: 'Bloom / Anderson & Krathwohl', concept: 'Revised Taxonomy', connection: 'Framework for identifying the cognitive level of tasks -- ensure ELLs work at the same levels as peers' },
      { author: 'Tomlinson', concept: 'Differentiated Instruction', connection: 'Differentiate content, process, and product based on readiness, but maintain grade-level standards for all' },
      { author: 'Hammond', concept: 'Culturally Responsive Teaching and the Brain', connection: 'High expectations with scaffolding activate dependent learners\' productive struggle zone' },
    ],
    relatedGuides: ['three-types-scaffolding', 'teaching-with-taxonomies', 'comprehensible-input', 'wida-key-uses'],
  },

  {
    id: 'comprehensible-input',
    category: 'scaffolding',
    title: 'Making Input Comprehensible Without Dumbing It Down',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/comprehensible-input/',
    summary: 'Krashen\'s Input Hypothesis: language is acquired when students understand messages slightly above their current level (i+1). Make grade-level content understandable without simplifying the content itself.',
    whenToUse: 'Every lesson, every day. This is the foundational principle. If students cannot understand your input, no amount of practice will help.',
    tags: ['Krashen', 'i+1', 'comprehensible input'],
    sections: [
      {
        title: 'Speech Modifications',
        blocks: [
          { type: 'list', items: [
            { bold: 'Pace', text: 'Slow down slightly (natural pace minus 20%, not robotic). Pause between sentences, not mid-sentence.' },
            { bold: 'Vocabulary', text: 'Do not avoid academic words. Instead, say the word, define it, and show it: "precipitation -- that means rain, snow, sleet" + image.' },
            { bold: 'Repetition', text: 'Repeat key phrases naturally: "The water cycle has three stages. Three stages. Let me show you the three stages."' },
            { bold: 'Emphasis', text: 'Stress key words vocally. Use gestures constantly -- point, mime, act out.' },
          ]},
        ],
      },
      {
        title: 'Visual Support',
        blocks: [
          { type: 'list', items: [
            { text: 'Every key concept needs a visual: photo, diagram, real object, or quick board sketch' },
            { text: 'Label visuals in English and let students add home-language labels' },
            { text: 'Project texts so students follow along -- hearing AND seeing words together is more powerful than either alone' },
            { text: 'Color-code: key vocabulary in one color, transitions in another, important details in a third' },
          ]},
        ],
      },
      {
        title: 'Pre-Teaching Key Vocabulary',
        blocks: [
          { type: 'steps', label: '5-8 minutes that transform comprehension', items: [
            { title: 'Select 5-7 MUST-KNOW words', text: 'Not 15-20. Just the words students need to access the content.' },
            { title: 'Introduce each word four ways', text: 'Say it aloud. Write it. Show a visual or gesture. Give a student-friendly definition.' },
            { title: 'Students interact with each word', text: 'Say it, write it, use it in a quick turn-and-talk with a partner.' },
          ]},
          { type: 'example', value: '"Erosion. Erosion. [shows photo of worn-away hillside] Erosion means the ground is slowly washed away by water or wind. Turn to your partner and tell them one place you might see erosion."' },
        ],
      },
      {
        title: 'The Input-Output Loop',
        blocks: [
          { type: 'callout', label: 'The rule', value: 'Never lecture or read for more than 5-7 minutes without stopping for student output.' },
          { type: 'steps', label: 'The cycle', items: [
            { title: 'Input (5-7 min)', text: 'Present one concept with visuals, gestures, pre-taught vocabulary, moderate pace' },
            { title: 'Output (2-3 min)', text: 'Students process: turn-tell partner, write one sentence, sketch, answer one question, add to organizer' },
            { title: 'Repeat', text: 'Next chunk. A 30-minute lesson = 3-4 chunks.' },
          ]},
          { type: 'tip', value: 'The output phase is also your formative assessment. While students process, circulate and listen. Most accurate? Move on. Half confused? Re-teach differently. Specific students lost? Note for follow-up.' },
        ],
      },
    ],
    relatedResearch: [
      { author: 'Krashen', concept: 'Input Hypothesis', connection: 'Language is acquired through comprehensible input at i+1 -- one step beyond current level' },
      { author: 'Swain', concept: 'Output Hypothesis', connection: 'The output phase of the loop is critical -- producing language forces deeper processing than just receiving it' },
      { author: 'Long', concept: 'Interaction Hypothesis', connection: 'Negotiation of meaning during interaction (the output phase) drives acquisition' },
      { author: 'Echevarria, Vogt & Short', concept: 'SIOP Model', connection: 'Comprehensible input is one of eight core components of sheltered instruction' },
    ],
    relatedGuides: ['chunking-instruction', 'three-types-scaffolding', 'tiered-vocabulary', 'language-stages'],
  },

  {
    id: 'fostering-independence',
    category: 'scaffolding',
    title: 'From Scaffold-Dependent to Strategy-Dependent',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/fostering-independence/',
    summary: 'The goal is not a student who uses scaffolds well -- it is a student who has internalized strategies and no longer needs the scaffold.',
    whenToUse: 'When students have used the same scaffolds for months without progress, or cannot perform without their graphic organizer.',
    tags: ['metacognition', 'independence', 'gradual release'],
    sections: [
      {
        title: 'Scaffolds vs. Strategies',
        blocks: [
          { type: 'grid', items: [
            { title: 'Scaffold (external)', color: '#EF4444', text: 'A support the teacher provides: sentence frame, graphic organizer, word bank. Temporary.' },
            { title: 'Strategy (internal)', color: '#22C55E', text: 'A process the student owns: "When I don\'t know a word, I look at surrounding words for clues." Permanent.' },
          ]},
          { type: 'callout', label: 'The teacher\'s job', value: 'Use scaffolds to teach strategies, then remove the scaffolds once the strategies are internalized.' },
        ],
      },
      {
        title: 'Teaching Metacognitive Awareness',
        blocks: [
          { type: 'list', label: 'Ask these questions regularly', items: [
            { bold: 'After reading', text: '"What did you do when you hit a word you didn\'t know?"' },
            { bold: 'After writing', text: '"What did you do first before you started writing?"' },
            { bold: 'After discussion', text: '"What helped you understand what your partner said?"' },
          ]},
          { type: 'text', value: 'When students can NAME their strategies ("I used the picture" or "I re-read the sentence"), they are developing metacognition.' },
          { type: 'tip', value: 'Post student-generated strategy lists on the wall: "When I read, I can: look at pictures, re-read, ask a friend, use my glossary, skip and come back."' },
        ],
      },
      {
        title: 'The Gradual Release with Exit Ramp',
        blocks: [
          { type: 'steps', items: [
            { title: 'Teacher models', text: '"Watch me use this strategy. I\'m going to think aloud while I read this paragraph."' },
            { title: 'Guided practice WITH scaffold', text: '"Try it with your partner. Use the graphic organizer to help."' },
            { title: 'Guided practice, scaffold on request', text: '"Try it with your partner. You can ask for the organizer if you need it." (This is the key phase.)' },
            { title: 'Independent practice', text: '"Try it on your own. What strategy will you use?"' },
          ]},
        ],
      },
      {
        title: 'Signs of Growing Independence',
        blocks: [
          { type: 'list', items: [
            { text: 'Student chooses not to use the scaffold and succeeds' },
            { text: 'Student modifies the scaffold for their own needs (creates their own organizer)' },
            { text: 'Student explains their strategy to a peer' },
            { text: 'Student transfers a strategy to a new context without being told to' },
            { text: 'Student says "I don\'t need that anymore"' },
          ]},
        ],
      },
    ],
    relatedResearch: [
      { author: 'Pearson & Gallagher', concept: 'Gradual Release of Responsibility', connection: 'The I Do / We Do / You Do framework applied specifically to scaffold removal' },
      { author: 'Flavell', concept: 'Metacognition', connection: 'Thinking about thinking -- the foundation of strategic learning and self-regulation' },
      { author: 'Vygotsky', concept: 'Zone of Proximal Development', connection: 'As the ZPD shifts with growing competence, scaffolds must shift too' },
    ],
    relatedGuides: ['three-types-scaffolding', 'language-scaffolds', 'empower-principles'],
  },

  // ═══════════════════════════════════════════════════════════════
  // READING INSTRUCTION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'read-alouds-older-ells',
    category: 'reading',
    title: 'Reading Aloud to Older ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/reading-aloud-to-older-ells/',
    summary: 'Read-alouds model fluent phrasing, build listening comprehension, expose vocabulary in context, and create shared literary experiences. Not just for kindergarten.',
    whenToUse: '2-3 times per week with any class containing ELLs at WIDA 1-3. Also as warm-ups or when introducing a new genre.',
    tags: ['read-aloud', 'fluency', 'listening'],
    sections: [
      { title: 'Why It Works for Older ELLs', blocks: [
        { type: 'list', items: [
          { bold: 'Listening before reading', text: 'A student who cannot decode grade-level text can still understand it when read aloud with expression, pauses, and visuals' },
          { bold: 'Phrasing models', text: 'Students hear where sentences pause, how questions sound, how dialogue differs from narration' },
          { bold: 'Shared experience', text: 'Creates common ground for discussion that does not depend on individual reading ability' },
        ]},
      ]},
      { title: 'Choosing Texts', blocks: [
        { type: 'text', value: 'Picture books are not just for little kids -- choose ones with sophisticated themes and vocabulary. The pictures provide sensory scaffolds; the themes provide real discussion content.' },
        { type: 'list', label: 'Good choices', items: [
          { bold: 'The Name Jar', text: 'Immigration, identity' },
          { bold: 'Each Kindness', text: 'Regret, bullying' },
          { bold: 'Separate Is Never Equal', text: 'Civil rights' },
          { bold: 'Islandborn', text: 'Memory, community' },
          { bold: 'Poetry', text: 'Short, rhythmic, packed with language' },
        ]},
        { type: 'tip', value: 'Avoid illustration styles that feel babyish. The art should feel mature even if the reading level is accessible.' },
      ]},
      { title: 'How to Read Effectively', blocks: [
        { type: 'steps', items: [
          { title: 'Preview first', text: 'Know where to pause, which words to emphasize, what to point to' },
          { title: 'Pre-teach 3-5 words', text: 'Key vocabulary that students need to follow the story' },
          { title: 'Read with expression', text: 'Slowly enough for processing but with genuine expression, not monotone' },
          { title: 'Use illustrations actively', text: '"Look at her face. How do you think she feels right now?"' },
          { title: 'Point to text', text: 'So students connect spoken and written words as you read' },
        ]},
      ]},
      { title: 'Making It Interactive', blocks: [
        { type: 'grid', items: [
          { title: 'Before Reading', color: '#22C55E', text: 'Show cover. "What do you think this is about? Tell your partner." (1-2 min)' },
          { title: 'During Reading', color: '#3B82F6', text: 'Pause at key moments. "What happens next?" "Why did she do that?" Brief partner talk, 30 seconds. (every 2-3 pages)' },
          { title: 'After Reading', color: '#8B5CF6', text: 'ONE focused response: draw and label favorite scene, write one sentence, discuss "Would you do the same?" (5-10 min, not 30)' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Krashen', concept: 'Input Hypothesis', connection: 'Read-alouds provide rich comprehensible input at i+1 through visual and vocal support' },
      { author: 'Trelease', concept: 'The Read-Aloud Handbook', connection: 'Foundational research on read-alouds developing vocabulary, comprehension, and motivation across all ages' },
      { author: 'Fisher, Flood, Lapp & Frey', concept: 'Interactive Read-Alouds', connection: 'Research showing read-alouds are most effective with structured interaction points, not passive listening' },
    ],
    relatedGuides: ['comprehensible-input', 'teaching-inferencing', 'think-read-talk-write'],
  },

  {
    id: 'think-read-talk-write',
    category: 'reading',
    title: 'Think-Read-Talk-Write Protocol',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/think-read-talk-write/',
    summary: 'A four-step protocol moving through all language domains on a single text. By the time students write, they have processed the content three times.',
    whenToUse: 'Any time students read a text and produce a written response. Works for fiction, nonfiction, science, math word problems.',
    tags: ['literacy protocol', 'all domains', 'structured routine'],
    sections: [
      { title: 'The Four Steps', blocks: [
        { type: 'steps', items: [
          { title: 'THINK (3-5 min)', text: 'Activate prior knowledge BEFORE seeing the text. Show a related photo, give a key term for brainstorming, play 30 seconds of video, or ask a provocative question.' },
          { title: 'READ (varies)', text: 'Students read with a specific annotation task: circle unfamiliar words, underline the main claim, star evidence, ? anything confusing. Beginning ELLs partner-read or follow along.' },
          { title: 'TALK (2-3 min/partner)', text: 'Structured discussion with starters: "The main idea is..." / "I agree because..." Assign roles, give a specific question, set a timer. Circulate and listen -- this is formative assessment.' },
          { title: 'WRITE (10-15 min)', text: 'Students have now thought, read, annotated, and discussed -- they are not starting from zero. Provide differentiated writing support by proficiency.' },
        ]},
      ]},
      { title: 'Writing Support by Level', blocks: [
        { type: 'levels', items: [
          { level: 'WIDA 1-2', color: '#EF4444', text: 'Sentence frames with word bank' },
          { level: 'WIDA 3', color: '#F59E0B', text: 'Sentence starters only' },
          { level: 'WIDA 4-5', color: '#3B82F6', text: 'Transition word bank only. Students construct own sentences.' },
        ]},
        { type: 'callout', label: 'Important', value: 'The writing prompt should match the standard\'s thinking level. If it says "analyze," the prompt requires analysis, not summary.' },
      ]},
      { title: 'Timing', blocks: [
        { type: 'text', value: 'A full cycle takes 25-40 minutes. Can be split: Think-Read on day one, Talk-Write on day two.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Krashen', concept: 'Input Hypothesis', connection: 'Think and Read phases provide comprehensible input' },
      { author: 'Swain', concept: 'Output Hypothesis', connection: 'Talk and Write phases push students to produce language, which drives acquisition' },
      { author: 'Long', concept: 'Interaction Hypothesis', connection: 'The Talk phase creates negotiation of meaning with peers' },
    ],
    relatedGuides: ['comprehensible-input', 'language-scaffolds', 'quick-writes', 'visible-reading'],
  },

  {
    id: 'teaching-inferencing',
    category: 'reading',
    title: 'Teaching Inferencing to ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/teaching-inferencing/',
    summary: 'Inferencing is especially hard for ELLs because it combines text evidence with background knowledge -- and ELLs may lack the cultural background knowledge English-proficient students take for granted.',
    whenToUse: 'When students can decode and understand literal text but struggle with "why" questions, character motivation, theme, or author\'s purpose.',
    tags: ['inferencing', 'comprehension', 'think-aloud'],
    sections: [
      { title: 'The Inference Formula', blocks: [
        { type: 'callout', label: 'Teach this explicitly', value: 'Text Evidence + Background Knowledge = Inference. Write it on an anchor chart and refer to it constantly.' },
        { type: 'example', label: 'Worked example', value: 'Text says: "Maria pushed her plate away and stared out the window." (Evidence) + We know people who push food away and stare are usually upset. (Background knowledge) = Maria is feeling sad or worried. (Inference)' },
        { type: 'tip', value: 'Make the formula physical: text evidence on one sticky note, background knowledge on another, combine them for the inference on a third.' },
      ]},
      { title: 'The Background Knowledge Problem', blocks: [
        { type: 'text', value: 'Many inference failures are actually background knowledge failures, not thinking failures.' },
        { type: 'list', label: 'Examples of cultural knowledge gaps', items: [
          { text: '"Bowing deeply" -- East Asian student infers respect; American student might be confused' },
          { text: '"Making a wish before blowing out candles" -- students without birthday party experience miss it' },
          { text: '"Being sent to the principal\'s office" -- may not carry the same connotation across cultures' },
        ]},
        { type: 'callout', label: 'Before asking students to infer', value: 'Check: do they have the cultural/experiential knowledge needed? If not, build it first through discussion, photos, or video.' },
      ]},
      { title: 'Think-Aloud Modeling', blocks: [
        { type: 'example', label: 'Model your thinking process', value: '"The author says the sky was dark and the wind was howling. I know dark skies and strong wind usually come before a storm. So I think a storm is coming. The author didn\'t SAY storm -- I figured it out by combining text evidence with what I know."' },
        { type: 'text', value: 'Do this repeatedly across multiple lessons before expecting independent inferencing. Then transition: "Your turn. What does the text say? What do you know? Put them together."' },
      ]},
      { title: 'Practice Activities (Graduated)', blocks: [
        { type: 'steps', items: [
          { title: 'Picture inferences (no text)', text: 'Show a photo (messy kitchen, crying child). "What happened before this photo?" Pure inference practice without decoding.' },
          { title: 'One-sentence inferences', text: '"Jake shoved his textbook into his locker and slammed the door." How does Jake feel? How do you know?' },
          { title: 'Paragraph inferences', text: 'Short passages with 2-3 inference opportunities. Students identify evidence and background knowledge used.' },
          { title: 'Full text inferences', text: 'Apply inference skills to grade-level texts with annotation support.' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Keene & Zimmermann', concept: 'Mosaic of Thought', connection: 'Inferencing as one of seven comprehension strategies proficient readers use automatically' },
      { author: 'Harvey & Goudvis', concept: 'Strategies That Work', connection: 'Practical framework for teaching comprehension strategies including inferencing through think-alouds' },
      { author: 'Cummins', concept: 'BICS vs. CALP', connection: 'Inferencing requires academic language proficiency (CALP), not just conversational fluency (BICS)' },
    ],
    relatedGuides: ['read-alouds-older-ells', 'visible-reading', 'deeper-reading-ells', 'context-clues'],
  },

  {
    id: 'visible-reading',
    category: 'reading',
    title: 'Visible Reading: Making Comprehension Observable',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/visible-reading/',
    summary: 'Comprehension is invisible. A student can stare at a page for 10 minutes and you have no idea if they understood. Visible reading makes thinking observable so you can intervene at the point of breakdown.',
    whenToUse: 'During any independent or guided reading. Essential for identifying who needs re-teaching and what they are struggling with.',
    tags: ['annotation', 'formative assessment', 'comprehension'],
    sections: [
      { title: 'Annotation System', blocks: [
        { type: 'text', value: 'Give a simple, consistent code. Keep it to 4-5 marks maximum. Practice on a shared text before independent use.' },
        { type: 'table', headers: ['Mark', 'Meaning', 'Purpose'], rows: [
          ['check', 'I understand this', 'Confirms comprehension'],
          ['?', 'I am confused here', 'Flags breakdown points'],
          ['star', 'This seems important', 'Identifies key ideas'],
          ['circle', 'Unknown word', 'Tracks vocabulary gaps'],
          ['!', 'This surprised me', 'Shows engagement with text'],
        ]},
        { type: 'tip', value: 'Collect annotated texts as formative data: if five students all have ? at the same paragraph, that is your re-teach target.' },
      ]},
      { title: 'Margin Notes', blocks: [
        { type: 'list', label: 'Types to model', items: [
          { bold: '"The character wants..."', text: 'Identifying motivation' },
          { bold: '"This reminds me of..."', text: 'Making connections' },
          { bold: '"I think the author means..."', text: 'Interpreting' },
          { bold: '"I was wrong -- actually..."', text: 'Revising thinking' },
        ]},
        { type: 'text', value: 'For beginning ELLs, a margin note can be a single word or quick sketch. More informative than annotations because they show WHAT the student is thinking, not just WHERE they are confused.' },
      ]},
      { title: 'Stop-and-Sketch', blocks: [
        { type: 'text', value: 'After reading a section, students draw a quick sketch (30-60 seconds, not art class) of what they read.' },
        { type: 'do-dont', doItems: [
          'Set a strict 30-60 second time limit (prevents perfectionism)',
          'Use as a discussion starter: "Show your sketch. Explain what is happening."',
          'Accept stick figures and labels -- comprehension, not art',
        ], dontItems: [
          'Turn it into an art project',
          'Grade the quality of the drawing',
          'Skip this for older students -- it works at every age',
        ]},
        { type: 'callout', label: 'Why it works for ELLs', value: 'Bypasses the language production barrier while still requiring comprehension. A student who draws a person in rain after reading about a character in a storm understands. A blank or unrelated drawing signals confusion.' },
      ]},
      { title: 'Quick Response Checks', blocks: [
        { type: 'list', label: 'After every chunk (1-2 paragraphs)', items: [
          { text: 'Thumbs up / sideways / down for understanding level' },
          { text: 'Write one sentence about what you just read' },
          { text: 'Turn and tell your partner the most important thing' },
          { text: 'Answer one question on a whiteboard and hold it up' },
        ]},
        { type: 'callout', label: 'Key principle', value: 'Frequent and low-stakes. These are check-ins, not quizzes.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Beers', concept: 'When Kids Can\'t Read', connection: 'Comprehensive approach to making reading processes visible through annotation and think-alouds' },
      { author: 'Hattie', concept: 'Visible Learning', connection: 'Making learning visible is one of the highest-impact teaching strategies (effect size 0.75)' },
      { author: 'Black & Wiliam', concept: 'Formative Assessment', connection: 'Visible reading techniques serve as real-time formative assessment embedded in instruction' },
    ],
    relatedGuides: ['think-read-talk-write', 'teaching-inferencing', 'chunking-instruction'],
  },

  {
    id: 'deeper-reading-ells',
    category: 'reading',
    title: 'Deeper Reading: Beyond Surface Comprehension',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/deeper-reading/',
    summary: 'Lower-proficiency students can and should engage in analysis, evaluation, and critical reading. Scaffolds make deeper reading accessible without watering down cognitive demand.',
    whenToUse: 'When students answer "what happened" but struggle with "why," "so what," and "how does the author..."',
    tags: ['close reading', 'critical thinking', 'DOK'],
    sections: [
      { title: 'Three Reads Protocol', blocks: [
        { type: 'steps', items: [
          { title: 'Read 1: What does the text SAY?', text: 'Literal comprehension -- gist, main events, key facts. Students identify who, what, where, when.' },
          { title: 'Read 2: How does the text WORK?', text: 'Author\'s craft -- word choice, structure, figurative language, text features. Students analyze how the author built the text.' },
          { title: 'Read 3: What does the text MEAN?', text: 'Interpretation -- theme, implications, connections, evaluation. Students read between and beyond the lines.' },
        ]},
        { type: 'tip', value: 'Each read has a different purpose and produces different annotations. Space across class periods if needed.' },
      ]},
      { title: 'Text-Dependent Questions by DOK', blocks: [
        { type: 'levels', items: [
          { level: 'DOK 1', color: '#94A3B8', text: '"What happened after the flood?" (recall -- all students can do this)' },
          { level: 'DOK 2', color: '#F59E0B', text: '"How did the character\'s feelings change from beginning to end?" (skill/concept)' },
          { level: 'DOK 3', color: '#EF4444', text: '"Why did the author tell this from the child\'s perspective instead of the parent\'s? Use evidence." (strategic thinking)' },
        ]},
        { type: 'callout', label: 'All students should reach DOK 3', value: 'The scaffolding varies, but every student should engage with interpretive questions. See the "Keeping Rigor High" guide.' },
      ]},
      { title: 'Scaffolding Deep Questions for ELLs', blocks: [
        { type: 'text', value: 'Provide the evidence first, then ask the interpretive question.' },
        { type: 'do-dont', doItems: [
          '"The author used \'shattered\' instead of \'broken.\' [Show visual of each.] Why is \'shattered\' a stronger choice?"',
          'Provide a frame: "The author chose \'shattered\' because it makes the reader feel ___"',
          'Give text evidence on a card so students can focus on interpreting, not hunting',
        ], dontItems: [
          '"Why did the author use the word \'shattered\'?" (too open without support)',
          'Assuming students can find the evidence AND interpret it simultaneously',
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Adler & Van Doren', concept: 'How to Read a Book', connection: 'Three levels of reading (elementary, inspectional, analytical) parallel the three-reads approach' },
      { author: 'Webb', concept: 'Depth of Knowledge', connection: 'Framework for designing questions at appropriate cognitive complexity levels' },
      { author: 'Fisher & Frey', concept: 'Text-Dependent Questions', connection: 'Research on crafting questions that push students back into the text for evidence-based reasoning' },
    ],
    relatedGuides: ['teaching-inferencing', 'keeping-rigor-high', 'teaching-with-taxonomies', 'visible-reading'],
  },

  // ═══════════════════════════════════════════════════════════════
  // WRITING INSTRUCTION
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'paragraph-tabbs',
    category: 'writing',
    title: 'TABBS: Paragraph-Level Summarization Structure',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/paragraph-level-instruction/',
    summary: 'TABBS gives each sentence a specific job and grammatical structure. Removes "what do I write next?" paralysis while teaching summarization and academic sentence construction simultaneously.',
    whenToUse: 'When students can write sentences but struggle organizing them into paragraphs. Effective for summarizing, compare/contrast, and cause-effect.',
    tags: ['paragraph structure', 'TABBS', 'academic writing'],
    sections: [
      { title: 'The Framework', blocks: [
        { type: 'table', headers: ['Letter', 'Sentence Job', 'Grammar Structure', 'Signal Words'], rows: [
          ['T', 'Topic sentence', 'Subordinating conjunction', 'Although, While, Because'],
          ['A', 'Add similar details', 'Compound sentence', 'and, also, in addition'],
          ['B', 'But -- contrast', 'Compound with contrast', 'but, however, yet'],
          ['B', 'Because -- explain', 'Causal sentence', 'because, since, this is because'],
          ['S', 'So -- conclusion', 'Cause-effect conclusion', 'so, therefore, as a result'],
        ]},
        { type: 'callout', label: 'Why this works', value: 'Each letter = one sentence with a specific grammatical structure. Students learn paragraph organization AND academic sentence patterns at the same time.' },
      ]},
      { title: 'Example: Dolphins Article', blocks: [
        { type: 'example', label: 'Complete TABBS paragraph', value: 'T: "Although dolphins live in the ocean, they are actually mammals." A: "Dolphins breathe air through a blowhole, and they are warm-blooded like other mammals." B: "They swim like fish, but they must come to the surface to breathe." B: "This is because dolphins have lungs instead of gills." S: "So dolphins have adapted to ocean life while keeping mammal characteristics."' },
      ]},
      { title: 'Teaching Sequence', blocks: [
        { type: 'steps', items: [
          { title: 'Week 1: T only', text: 'Practice subordinating conjunctions with two facts. "Although ___, ___." "Because ___, ___."' },
          { title: 'Week 2: Add A', text: 'Compound similar ideas with "and," "also," "in addition."' },
          { title: 'Week 3: Add B+B', text: 'Contrast with "but"/"however" and explain with "because"/"since."' },
          { title: 'Week 4: Add S', text: 'Cause-effect conclusions with "so"/"therefore."' },
          { title: 'Week 5: Full TABBS', text: 'Complete paragraphs. Students write one per day on content topics.' },
        ]},
      ]},
      { title: 'Scaffolded Practice', blocks: [
        { type: 'levels', items: [
          { level: 'Level 1', color: '#EF4444', text: 'Paragraph with blanks for content words only -- full sentence structure is provided' },
          { level: 'Level 2', color: '#F59E0B', text: 'First word of each sentence given (Although..., And..., But..., Because..., So...)' },
          { level: 'Level 3', color: '#22C55E', text: 'Only the letters T-A-B-B-S as a reminder on the page' },
          { level: 'Level 4', color: '#3B82F6', text: 'Free writing incorporating the structures without any scaffold' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Hochman & Wexler', concept: 'The Writing Revolution', connection: 'Sentence-level instruction as the foundation for paragraph and essay writing -- TABBS operates at this intersection' },
      { author: 'Gibbons', concept: 'Mode Continuum', connection: 'TABBS helps students move from spoken to written academic register through explicit structural support' },
      { author: 'Graham & Perin', concept: 'Writing Next', connection: 'Sentence combining and explicit instruction in paragraph structure are among the most effective writing strategies' },
    ],
    relatedGuides: ['sentence-transitions', 'language-scaffolds', 'mentor-texts'],
  },

  {
    id: 'sentence-transitions',
    category: 'writing',
    title: 'Sentence Transitions: Three Frameworks',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/sentence-to-sentence-transitions/',
    summary: 'Three transition frameworks from simple to advanced, giving students concrete tools for connecting ideas instead of writing disconnected sentences.',
    whenToUse: 'When student writing reads as a list of unrelated sentences. Also for structured discussions where students need to build on each other.',
    tags: ['transitions', 'cohesion', 'academic writing'],
    sections: [
      { title: 'Three Levels', blocks: [
        { type: 'grid', items: [
          { title: 'Time-Based (Simplest)', color: '#22C55E', text: 'First, Then, Next, After that, Finally. For beginning ELLs retelling processes, stories, or sequences.' },
          { title: 'HAT (Intermediate)', color: '#3B82F6', text: 'However (contrast), Additionally (adding), Therefore (cause-effect). Covers most expository and argumentative relationships.' },
          { title: 'WEST BUNDAI (Advanced)', color: '#8B5CF6', text: 'When, Even though, Since, Though, Because, Unless, Now that, Despite, Although, If. Creates complex sentences.' },
        ]},
      ]},
      { title: 'HAT in Detail', blocks: [
        { type: 'table', headers: ['Letter', 'Relationship', 'Example'], rows: [
          ['H - However', 'Contrast', '"I wanted the park. However, it rained."'],
          ['A - Additionally', 'Adding information', '"Dolphins are intelligent. Additionally, they communicate with each other."'],
          ['T - Therefore', 'Cause-effect', '"The experiment failed. Therefore, we changed our hypothesis."'],
        ]},
        { type: 'tip', value: 'Once students master HAT, they can handle most academic writing. It is the single highest-value transition set to teach.' },
      ]},
      { title: 'Daily Quick Write Practice', blocks: [
        { type: 'steps', label: '5 minutes, every day', items: [
          { title: 'Display two related facts', text: '"Butterflies drink nectar. They pollinate flowers."' },
          { title: 'Assign a transition word', text: '"Combine these using THEREFORE."' },
          { title: 'Students write (60 seconds)', text: '"Butterflies drink nectar; therefore, they help pollinate flowers as they move between plants."' },
          { title: 'Share and discuss 2-3', text: 'Teacher selects strong examples. Discuss what the transition word does to the meaning.' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Hochman & Wexler', concept: 'The Writing Revolution', connection: 'Sentence-level work with conjunctions and transitions as the foundation of all strong writing' },
      { author: 'Schleppegrell', concept: 'The Language of Schooling', connection: 'Academic language features specific cohesive devices that must be explicitly taught to ELLs' },
    ],
    relatedGuides: ['paragraph-tabbs', 'language-scaffolds', 'academic-language', 'quick-writes'],
  },

  {
    id: 'star-revision',
    category: 'writing',
    title: 'STAR Revision Strategy',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/star-revision/',
    summary: 'Most students think "revising" means fixing spelling. STAR teaches four specific moves: Substitute, Take out, Add, Rearrange.',
    whenToUse: 'After first drafts, before editing. Use as the structured revision step in the writing process.',
    tags: ['revision', 'writing process', 'self-editing'],
    sections: [
      { title: 'The Four Moves', blocks: [
        { type: 'table', headers: ['Move', 'What It Means', 'Example'], rows: [
          ['S - Substitute', 'Replace vague words with specific ones', '"Good" becomes "effective." "Went" becomes "rushed."'],
          ['T - Take out', 'Remove off-topic sentences, repetition, filler', 'Delete "In my opinion, I think that..." (redundant)'],
          ['A - Add', 'Insert details, examples, evidence', 'If a sentence claims something, add WHY'],
          ['R - Rearrange', 'Move sentences into logical order', 'Does the conclusion appear in the intro? Move it.'],
        ]},
      ]},
      { title: 'Teaching Sequence', blocks: [
        { type: 'steps', items: [
          { title: 'Week 1: S only', text: 'Give a paragraph with 5 underlined weak words. Students find stronger replacements.' },
          { title: 'Week 2: T only', text: 'Paragraph with 2 off-topic sentences. Identify and remove them.' },
          { title: 'Week 3: A only', text: 'Paragraph with 3 thin sentences. Add details and evidence.' },
          { title: 'Week 4: R only', text: 'Scrambled paragraph. Reorder logically.' },
          { title: 'Week 5: Full STAR', text: 'Apply all four moves to own writing using the checklist.' },
        ]},
      ]},
      { title: 'The Revision Checklist', blocks: [
        { type: 'list', label: 'Students check off each and write what they changed', items: [
          { bold: 'S', text: 'I replaced at least 2 weak words with stronger ones. Words changed: ___' },
          { bold: 'T', text: 'I removed sentences that don\'t support my main idea. Removed: ___' },
          { bold: 'A', text: 'I added at least 1 specific detail or example. Added to paragraph: ___' },
          { bold: 'R', text: 'I checked that my sentences are in logical order. Moved: ___' },
        ]},
        { type: 'tip', value: 'Making revision concrete and verifiable transforms it from vague "make it better" to specific actions.' },
      ]},
      { title: 'Peer Revision with STAR', blocks: [
        { type: 'text', value: 'Partners swap papers. Each applies ONE letter only. Partner A does S (circles words, suggests alternatives). Partner B does A (marks where detail is needed with ^, writes "What did it look like?"). Writer decides which suggestions to accept.' },
        { type: 'callout', label: 'Why one letter each', value: 'Teaches specific, actionable feedback instead of "it\'s good" or "I like it."' },
      ]},
    ],
    relatedResearch: [
      { author: 'Graham & Harris', concept: 'SRSD (Self-Regulated Strategy Development)', connection: 'STAR follows the SRSD framework of explicit strategy instruction with gradual release' },
      { author: 'Fitzgerald & Markham', concept: 'Revision Research', connection: 'Research showing ELLs revise more effectively with structured revision protocols than open-ended prompts' },
    ],
    relatedGuides: ['paragraph-tabbs', 'mentor-texts', 'quick-writes'],
  },

  {
    id: 'quick-writes',
    category: 'writing',
    title: 'Quick Writes: Low-Stakes Writing Fluency',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/quick-writes/',
    summary: 'Timed 3-5 minute writing builds fluency and confidence. Emphasis on generating ideas, not correctness. Also instant formative assessment.',
    whenToUse: 'Daily as warm-up, mid-lesson processing, or exit ticket.',
    tags: ['writing fluency', 'formative assessment', 'warm-up'],
    sections: [
      { title: 'How to Run It', blocks: [
        { type: 'steps', items: [
          { title: 'Display prompt', text: 'Content-connected, specific, with a visual. Not "Write about today\'s lesson."' },
          { title: 'Set timer (3-5 min)', text: 'Visible countdown. Say: "Write as much as you can. Don\'t worry about spelling or grammar."' },
          { title: 'Circulate', text: 'Glance at what students produce in real time' },
          { title: 'Count words', text: 'Students count and record. Track over weeks to show growth.' },
          { title: 'Share (optional)', text: '2-3 students share their best sentence. Takes 1-2 extra minutes.' },
        ]},
      ]},
      { title: 'Good vs. Bad Prompts', blocks: [
        { type: 'do-dont', doItems: [
          '"Explain one way erosion changes the land."',
          '"Describe what would happen to a mountain over 1000 years of erosion."',
          'Add a visual and/or sentence starter for ELLs',
          'Always connect to content just learned or about to learn',
        ], dontItems: [
          '"Write about today\'s lesson." (too vague)',
          '"What did you learn?" (too open, produces generic responses)',
          'Prompts disconnected from current content',
        ]},
      ]},
      { title: 'Scaffolding by Level', blocks: [
        { type: 'levels', items: [
          { level: 'WIDA 1', color: '#EF4444', text: 'Draw and label, or fill-in-the-blank cloze paragraph' },
          { level: 'WIDA 2', color: '#F59E0B', text: 'Sentence starters + word bank: "Erosion is when ___. One example is ___."' },
          { level: 'WIDA 3', color: '#22C55E', text: 'Prompt only, write freely' },
          { level: 'WIDA 4-5', color: '#3B82F6', text: 'Add constraint: "Use 2 vocabulary words from today" or "Include a subordinating conjunction."' },
        ]},
      ]},
      { title: 'Using as Formative Data', blocks: [
        { type: 'text', value: 'After collecting (or glancing during circulation), mentally sort into three groups:' },
        { type: 'grid', items: [
          { title: 'Gets it', color: '#22C55E', text: 'Move on tomorrow' },
          { title: 'Partially gets it', color: '#F59E0B', text: 'Clarify tomorrow' },
          { title: 'Doesn\'t get it', color: '#EF4444', text: 'Re-teach or pull small group' },
        ]},
        { type: 'tip', value: 'Also check: are students using sentence structures you\'ve been teaching? Attempting new vocabulary? Quick writes are a daily window into both content understanding AND language development.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Elbow', concept: 'Freewriting', connection: 'Low-stakes, fluency-first writing builds voice and reduces writing anxiety' },
      { author: 'Graham & Perin', concept: 'Writing Next', connection: 'Frequent, brief writing practice across content areas is a top-tier strategy for writing development' },
    ],
    relatedGuides: ['language-scaffolds', 'think-read-talk-write', 'sentence-transitions'],
  },

  {
    id: 'mentor-texts',
    category: 'writing',
    title: 'Mentor Texts: Making Writing Rules Visible',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/mentor-texts/',
    summary: 'Published examples of good writing that students study before writing. Makes invisible rules visible: how authors use transitions, organize paragraphs, vary sentences, support claims.',
    whenToUse: 'Before any writing assignment. Show what the finished product should look and sound like.',
    tags: ['mentor texts', 'writing craft', 'modeling'],
    sections: [
      { title: 'Four-Step Process', blocks: [
        { type: 'steps', items: [
          { title: 'Read for enjoyment', text: 'Read the mentor text aloud. Don\'t analyze yet. Let students experience it as readers.' },
          { title: 'Name ONE craft move', text: 'Choose one thing to study. Not five -- one. "Today: how this author uses transitions between paragraphs."' },
          { title: 'Students find examples', text: 'Highlight, underline, or list every instance of that craft move in the text.' },
          { title: 'Apply to own writing', text: '"Open your draft. Find one place where you could add a transition like these."' },
        ]},
        { type: 'callout', label: 'One craft move per lesson', value: 'Studying five things means mastering zero. Deep study of one move transfers better than surface exposure to many.' },
      ]},
      { title: 'Choosing Mentor Texts for ELLs', blocks: [
        { type: 'list', items: [
          { bold: 'Readable', text: 'Must be one level above students\' writing, not five. Advanced literary essays won\'t work for WIDA 2.' },
          { bold: 'Short beats long', text: 'One well-written paragraph can teach more than a full essay' },
          { bold: 'Clear patterns', text: 'Best for ELLs: visible sentence structures, obvious organizational patterns, familiar content' },
        ]},
      ]},
      { title: 'Craft Moves to Study (One Per Lesson)', blocks: [
        { type: 'list', items: [
          { bold: 'Hook', text: 'How the author grabs attention in the first sentence' },
          { bold: 'Transitions', text: 'How ideas connect within and between paragraphs' },
          { bold: 'Sentence variety', text: 'Short sentences for emphasis, long for explanation' },
          { bold: 'Evidence integration', text: 'How evidence is introduced and explained (quote, then explain)' },
          { bold: 'Ending', text: 'How the piece concludes -- echoes the intro? Restates? Questions?' },
        ]},
        { type: 'text', value: 'For each: find it in the mentor text, name what makes it effective, try it in your own writing.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Gallagher', concept: 'Write Like This', connection: 'Comprehensive approach to using mentor texts across genres to teach writing craft' },
      { author: 'Ray', concept: 'Wondrous Words', connection: 'Teaching craft through reading -- students learn to read like writers and write like readers' },
    ],
    relatedGuides: ['paragraph-tabbs', 'star-revision', 'academic-language'],
  },

  // ═══════════════════════════════════════════════════════════════
  // VOCABULARY & LANGUAGE
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'tiered-vocabulary',
    category: 'vocabulary',
    title: 'Beck\'s Three Tiers of Vocabulary',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/tiered-vocabulary/',
    summary: 'Words divided by frequency and utility. Tier 2 (analyze, contrast, significant) gives the highest return on instruction for ELLs because they transfer across every subject.',
    whenToUse: 'When selecting which vocabulary to pre-teach. Tiers help you pick the 5-7 words that matter most instead of trying to teach 20.',
    tags: ['vocabulary', 'tier 2', 'word selection'],
    sections: [
      { title: 'The Three Tiers', blocks: [
        { type: 'grid', items: [
          { title: 'Tier 1: Basic', color: '#94A3B8', text: 'High-frequency everyday words: table, run, happy. Native speakers know these by school age. For ELLs: point-and-name is usually enough.' },
          { title: 'Tier 2: Academic', color: '#F59E0B', text: 'Used across ALL subjects: analyze, evidence, significant, contrast, sequence, perspective. Highest teaching priority for ELLs.' },
          { title: 'Tier 3: Technical', color: '#8B5CF6', text: 'Domain-specific: photosynthesis, denominator. Taught with content. Often easier than Tier 2 because of concrete definitions and cognates.' },
        ]},
      ]},
      { title: 'Why Tier 2 Matters Most', blocks: [
        { type: 'callout', label: 'The multiplier effect', value: 'A student who knows "compare" follows instructions in science, social studies, math, AND ELA. Tier 2 words are rarely learned from conversation -- they require explicit, repeated instruction across contexts.' },
      ]},
      { title: 'Selection Process', blocks: [
        { type: 'steps', label: 'Before each lesson', items: [
          { title: 'Scan materials', text: 'List unfamiliar words students will encounter' },
          { title: 'Categorize', text: 'Tier 1 (point and name)? Tier 2 (teach explicitly, use repeatedly)? Tier 3 (teach with content, visual support)?' },
          { title: 'Select 5-7 total', text: '2-3 Tier 2 + 2-3 Tier 3 to pre-teach. Ignore the rest -- context clues or glossary.' },
        ]},
        { type: 'callout', label: '5-7 words max', value: 'More than that, students remember none. Fewer well-taught words beat many barely-introduced words.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Beck, McKeown & Kucan', concept: 'Bringing Words to Life', connection: 'The foundational text on tiered vocabulary instruction and why Tier 2 deserves instructional priority' },
      { author: 'Marzano', concept: 'Building Background Knowledge', connection: 'Six-step vocabulary process: provide description, restate, visual, activities, discuss, play games' },
      { author: 'Coxhead', concept: 'Academic Word List', connection: '570 word families that appear across academic disciplines -- a concrete Tier 2 starting list' },
    ],
    relatedGuides: ['comprehensible-input', 'academic-language', 'context-clues'],
  },

  {
    id: 'grammar-in-context',
    category: 'vocabulary',
    title: 'Grammar in Context: Not Worksheets',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/grammar-in-context/',
    summary: 'Isolated grammar worksheets don\'t transfer to real writing. Teaching grammar in context means noticing patterns in authentic texts, naming them, and practicing within meaningful content.',
    whenToUse: 'When you notice a grammar pattern most students get wrong, or when a text provides a clear example of a useful structure.',
    tags: ['grammar', 'authentic texts', 'language patterns'],
    sections: [
      { title: 'Notice-Name-Practice', blocks: [
        { type: 'steps', items: [
          { title: 'Notice', text: 'During shared reading, stop at a target sentence. "Look: \'Although the colonists wanted freedom, they feared war.\' What do you notice about how this sentence is built?"' },
          { title: 'Name', text: '"This is a complex sentence using \'although\' to connect two contrasting ideas."' },
          { title: 'Practice', text: 'Students write their own using the same structure about current content: "Write an \'although\' sentence about ecosystems."' },
        ]},
      ]},
      { title: 'High-Value Targets', blocks: [
        { type: 'text', value: 'Don\'t try to teach all grammar. Focus on structures that appear in your content AND that students need for their writing. One structure per week across content areas.' },
        { type: 'list', items: [
          { bold: 'Past tense', text: 'For narratives and history writing' },
          { bold: 'Comparative/superlative', text: 'For analysis tasks' },
          { bold: 'Passive voice', text: 'For science writing: "The solution was heated"' },
          { bold: 'Conditional', text: 'For predictions: "If temperature rises, then..."' },
          { bold: 'Subordinating conjunctions', text: 'For academic argument: although, because, while' },
        ]},
      ]},
      { title: 'Responding to Grammar Errors', blocks: [
        { type: 'grid', items: [
          { title: 'Oral Errors', color: '#3B82F6', text: 'Don\'t say "Wrong." Recast naturally: Student says "Yesterday I go to the store." You say "Oh, you WENT to the store? Which store?" Models the correct form without shutting down communication.' },
          { title: 'Written Errors', color: '#8B5CF6', text: 'Don\'t mark every error. Choose the ONE pattern you are currently teaching and mark only those instances. Marking 30 errors teaches nothing except "my writing is bad."' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Weaver', concept: 'Grammar in Context', connection: 'Foundational argument against isolated grammar instruction with research showing contextual grammar is more effective' },
      { author: 'Schleppegrell', concept: 'Functional Grammar for ELLs', connection: 'Teaching grammar through language functions (describing, explaining, arguing) rather than parts of speech in isolation' },
    ],
    relatedGuides: ['academic-language', 'language-scaffolds', 'mentor-texts'],
  },

  {
    id: 'academic-language',
    category: 'vocabulary',
    title: 'Three Dimensions of Academic Language',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/academic-language/',
    summary: 'Academic language operates at three levels: word, sentence, and discourse. Most teachers only teach word-level. All three need explicit instruction.',
    whenToUse: 'When planning language objectives. Check: am I addressing word-level, sentence-level, AND discourse-level language?',
    tags: ['academic language', 'three dimensions'],
    sections: [
      { title: 'The Three Dimensions', blocks: [
        { type: 'grid', items: [
          { title: 'Word Level', color: '#22C55E', text: 'Tier 2/3 vocabulary. Important but not enough alone. A student may know "analyze," "evidence," and "therefore" individually but not combine them academically.' },
          { title: 'Sentence Level', color: '#3B82F6', text: 'Passive voice, nominalization, embedded clauses, complex conjunctions. Academic sentences differ structurally from conversational ones.' },
          { title: 'Discourse Level', color: '#8B5CF6', text: 'How ideas are organized across paragraphs. A lab report differs from a persuasive essay. Genre-specific conventions must be explicitly taught.' },
        ]},
      ]},
      { title: 'Planning with All Three', blocks: [
        { type: 'example', label: 'Lesson: Causes of the American Revolution', value: 'Word objective: Use "taxation," "representation," "rebellion" correctly.  |  Sentence objective: Write complex sentences using "because" and "although" to explain causes.  |  Discourse objective: Write a cause-effect paragraph with topic sentence, 3 supporting details, and concluding sentence.' },
        { type: 'callout', label: 'Same content, three dimensions', value: 'Word + Sentence + Discourse = a complete language objective. Skipping any one dimension leaves a gap.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Zwiers', concept: 'Building Academic Language', connection: 'Comprehensive framework for the three dimensions with practical classroom strategies' },
      { author: 'Schleppegrell', concept: 'The Language of Schooling', connection: 'Linguistic analysis of how school language differs from everyday language across all three dimensions' },
      { author: 'Snow & Uccelli', concept: 'Academic Language Proficiency', connection: 'Research defining academic language as a multidimensional construct beyond vocabulary' },
    ],
    relatedGuides: ['tiered-vocabulary', 'grammar-in-context', 'paragraph-tabbs', 'wida-key-uses'],
  },

  {
    id: 'context-clues',
    category: 'vocabulary',
    title: 'Teaching Context Clues for Independence',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/context-clues/',
    summary: 'Students encounter thousands of unfamiliar words yearly. You can\'t pre-teach them all. Context clues are the independence skill for figuring out meanings from surrounding text.',
    whenToUse: 'Ongoing during reading instruction. Especially when students are ready to move beyond word banks toward independent reading.',
    tags: ['context clues', 'vocabulary', 'independence'],
    sections: [
      { title: 'Four Types', blocks: [
        { type: 'table', headers: ['Type', 'How It Works', 'Example'], rows: [
          ['Definition', 'Text defines the word directly', '"Photosynthesis, the process by which plants convert sunlight to energy, occurs in leaves."'],
          ['Synonym/Antonym', 'Nearby word has same or opposite meaning', '"The jovial, cheerful man greeted everyone."'],
          ['Example', 'Text gives clarifying examples', '"Nocturnal animals, such as owls, bats, and raccoons, are active at night."'],
          ['Inference', 'Meaning from overall context', '"After three days without food, the hikers were famished."'],
        ]},
        { type: 'callout', label: 'Students must know these four types by name', value: 'Being able to name the clue type builds metacognitive awareness of the strategy being used.' },
      ]},
      { title: 'Think-Aloud Model', blocks: [
        { type: 'example', value: '"I see \'famished.\' I don\'t know this word. But the sentence says \'three days without food.\' Someone who hasn\'t eaten for three days would be extremely hungry. So \'famished\' probably means very hungry. I used an inference clue -- the overall context told me."' },
      ]},
      { title: 'When Context Isn\'t Enough', blocks: [
        { type: 'steps', label: 'The backup chain (teach this sequence)', items: [
          { title: 'Try context clues', text: 'Look at surrounding words and sentences' },
          { title: 'Look for word parts', text: 'Prefixes, roots, suffixes (un- = not, -tion = noun, re- = again)' },
          { title: 'Check glossary/dictionary', text: 'Paper or digital' },
          { title: 'Ask someone', text: 'Classmate, teacher, bilingual buddy' },
        ]},
        { type: 'tip', value: 'Be honest: context clues don\'t always work. Teach the full backup chain so students have a systematic approach instead of skipping or shutting down.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Stahl & Nagy', concept: 'Teaching Word Meanings', connection: 'Research showing context clue instruction is most effective when combined with morphological analysis (word parts)' },
      { author: 'Graves', concept: 'The Vocabulary Book', connection: 'Four-part vocabulary program: wide reading, word consciousness, teaching individual words, and teaching word-learning strategies' },
    ],
    relatedGuides: ['tiered-vocabulary', 'fostering-independence', 'visible-reading'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ASSESSMENT & DATA
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'equitable-assessments',
    category: 'assessment',
    title: 'Engineering Equitable Assessments for ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/engineering-equitable-assessments/',
    summary: 'Most assessments accidentally test English proficiency instead of content knowledge. Seven modifications remove linguistic barriers so you measure what students actually know.',
    whenToUse: 'Every time you create or modify a quiz, test, or rubric.',
    tags: ['assessment', 'equity', 'accommodations'],
    sections: [
      { title: 'Core Principle', blocks: [
        { type: 'callout', label: 'The test', value: '"If this student took this test in their home language and understood every word, would they get it right?" If yes, the barrier is language -- adjust the assessment. If no, the student doesn\'t know the content.' },
      ]},
      { title: 'Seven Modifications', blocks: [
        { type: 'list', label: '15-20 minutes to apply to any existing test', items: [
          { bold: '1. Add synonyms', text: 'Next to complex vocabulary: "perspective (point of view)"' },
          { bold: '2. Sentence starters', text: 'For written responses: "The character changed because ___. Evidence shows ___."' },
          { bold: '3. Separate multi-part questions', text: 'Break into 3a, 3b, 3c instead of one compound question' },
          { bold: '4. Add labeled visuals', text: 'Next to relevant questions -- diagrams, photos, icons' },
          { bold: '5. Include a word bank', text: '8-10 terms with 2-3 distractors so it requires knowledge to use' },
          { bold: '6. Allow bilingual glossaries', text: 'Standard WIDA accommodation. Not optional.' },
          { bold: '7. Alternative response modes', text: 'Drawing, labeling, matching, sorting for beginning ELLs' },
        ]},
      ]},
      { title: 'What NOT to Modify', blocks: [
        { type: 'do-dont', doItems: [
          'Reduce linguistic complexity of questions',
          'Provide scaffolds for demonstrating knowledge',
          'Offer multiple ways to show understanding',
        ], dontItems: [
          'Lower content expectations',
          'Reduce question count (reduce complexity instead)',
          'Grade ELLs differently -- design tests that measure accurately',
          'Skip assessment entirely for ELLs -- they need data too',
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Gottlieb', concept: 'Assessing English Language Learners', connection: 'Comprehensive framework for designing assessments that separate language from content knowledge' },
      { author: 'Abedi', concept: 'Linguistic Modification Research', connection: 'Research proving that linguistic simplification improves ELL performance without changing construct validity' },
    ],
    relatedGuides: ['keeping-rigor-high', 'teaching-with-taxonomies', 'language-scaffolds'],
  },

  {
    id: 'informal-assessments',
    category: 'assessment',
    title: 'Informal Classroom-Based Assessments',
    source: 'Reading Rockets',
    sourceUrl: 'https://www.readingrockets.org/topics/assessment-and-evaluation/articles/types-informal-classroom-based-assessment',
    summary: 'Seven practical assessment tools from letter recognition to portfolios. Each tells you something different -- choose the right tool for the right question.',
    whenToUse: 'When you need to check where students are and plan next steps without a formal test.',
    tags: ['informal assessment', 'formative', 'reading assessment'],
    sections: [
      { title: 'Assessment Tools', blocks: [
        { type: 'table', headers: ['Tool', 'What It Measures', 'Best For', 'Frequency'], rows: [
          ['Letter/Sound Recognition', 'Letter names and sounds', 'K-1, newcomers', '3x/year'],
          ['Phonological Awareness', 'Rhyme, syllable, onset-rime', 'K-2, beginning readers', 'Monthly'],
          ['Phonemic Awareness', 'Individual sounds (segment, blend, manipulate)', 'K-2, beginning readers', 'Monthly'],
          ['Informal Reading Inventory', 'Accuracy + comprehension on leveled passages', 'All levels', 'Quarterly'],
          ['Running Records', 'Error patterns and self-corrections', 'Developing readers', 'Bi-weekly'],
          ['Fluency (CWPM)', 'Reading rate + prosody', 'Grades 1-5', 'Monthly'],
          ['Portfolios', 'Growth over time, student reflection', 'All levels', 'Ongoing'],
        ]},
      ]},
      { title: 'IRI: The Most Informative Tool', blocks: [
        { type: 'text', value: 'Student reads a passage aloud while you record errors, then answers comprehension questions (explicit + inferential).' },
        { type: 'levels', label: 'Accuracy benchmarks', items: [
          { level: '95-100%', color: '#22C55E', text: 'Independent level -- too easy for instruction. Use for independent reading practice.' },
          { level: '90-94%', color: '#F59E0B', text: 'Instructional level -- just right. This is where teaching happens.' },
          { level: 'Below 89%', color: '#EF4444', text: 'Frustration level -- too hard. Student is guessing, not reading.' },
        ]},
        { type: 'callout', label: 'Critical reminder', value: 'Accuracy without comprehension is not real reading. A student who reads 95% accurately but cannot answer any questions is word-calling, not reading.' },
      ]},
      { title: 'Portfolios', blocks: [
        { type: 'list', items: [
          { bold: 'Collection folder', text: 'All work samples, organized chronologically' },
          { bold: 'Display portfolio', text: 'Best pieces selected for conferences with students/parents' },
          { bold: 'Reflective portfolio', text: 'Students select pieces AND explain why: "I picked this because it shows I learned to use transitions."' },
        ]},
        { type: 'tip', value: 'The reflective portfolio is most powerful for ELLs because it builds metacognition and ownership of their own growth.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Black & Wiliam', concept: 'Inside the Black Box', connection: 'Foundational formative assessment research showing frequent informal assessment improves learning more than summative tests' },
      { author: 'Hasbrouck & Tindal', concept: 'ORF Norms', connection: 'Research-based oral reading fluency benchmarks by grade level used for CWPM assessment' },
    ],
    relatedGuides: ['equitable-assessments', 'visible-reading', 'teaching-with-taxonomies'],
  },

  {
    id: 'teaching-with-taxonomies',
    category: 'assessment',
    title: 'Using Bloom\'s and Webb\'s DOK for Task Design',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/teaching-with-taxonomies/',
    summary: 'Bloom\'s and Webb\'s DOK help design tasks at appropriate cognitive levels. Critical insight: language proficiency does not equal thinking level.',
    whenToUse: 'When planning activities and assessments. Verify all students work at high cognitive levels.',
    tags: ['Bloom\'s', 'DOK', 'cognitive demand'],
    sections: [
      { title: 'Bloom\'s Quick Reference', blocks: [
        { type: 'table', headers: ['Level', 'Thinking', 'Verbs', 'ELL-Friendly Output'], rows: [
          ['Remember', 'Recall facts', 'List, define, identify', 'Point, match, label'],
          ['Understand', 'Explain ideas', 'Describe, summarize, explain', 'Draw, retell, sort'],
          ['Apply', 'Use in new situation', 'Solve, demonstrate, use', 'Build, show, model'],
          ['Analyze', 'Find relationships', 'Compare, contrast, categorize', 'Venn diagram, T-chart, sort'],
          ['Evaluate', 'Judge, critique', 'Argue, defend, rank', 'Rank cards, thumbs up/down + why'],
          ['Create', 'Produce new', 'Design, compose, invent', 'Draw, build, present'],
        ]},
      ]},
      { title: 'Webb\'s Depth of Knowledge', blocks: [
        { type: 'levels', items: [
          { level: 'DOK 1', color: '#94A3B8', text: 'Recall: "What is the capital of France?" One right answer, retrieved from memory.' },
          { level: 'DOK 2', color: '#F59E0B', text: 'Skill/Concept: "Describe how a food web works." Requires explaining relationships.' },
          { level: 'DOK 3', color: '#EF4444', text: 'Strategic Thinking: "Compare two food webs and explain which is more stable." Requires reasoning with evidence.' },
          { level: 'DOK 4', color: '#8B5CF6', text: 'Extended Thinking: "Design an ecosystem and justify your choices." Requires synthesis over time.' },
        ]},
      ]},
      { title: 'The ELL Pitfall', blocks: [
        { type: 'callout', label: 'Most common mistake', value: 'ELLs get only DOK 1 tasks (labeling, matching, fill-in-blank) while their peers analyze and create. This is a rigor problem disguised as "differentiation."' },
        { type: 'example', label: 'Standard: "Compare and contrast two traditional tales" = DOK 3', value: 'WIDA 4-5: Comparative essay.  |  WIDA 3: Venn diagram + paragraph with frames.  |  WIDA 1-2: Sort story elements into comparison chart using pictures and single words, tell partner one difference.  |  All are comparing. None are doing busywork.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Anderson & Krathwohl', concept: 'Revised Bloom\'s Taxonomy', connection: 'Updated Bloom\'s with the knowledge dimension added -- useful for precise task design' },
      { author: 'Webb', concept: 'Depth of Knowledge', connection: 'Distinguishes complexity of thinking from difficulty of content -- critical for ELL task design' },
    ],
    relatedGuides: ['keeping-rigor-high', 'equitable-assessments', 'deeper-reading-ells'],
  },

  // ═══════════════════════════════════════════════════════════════
  // CLASSROOM ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dialogue-journals',
    category: 'classroom',
    title: 'Dialogue Journals: Written Conversations',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/dialogue-journals/',
    summary: 'Biweekly written teacher-student conversations. Students write about anything; teacher responds with interest and a question. Builds trust, reveals interests, develops writing fluency.',
    whenToUse: 'Every other week. Takes 2-3 min per student to respond. Start within the first two weeks of school.',
    tags: ['SEL', 'writing', 'relationship building'],
    sections: [
      { title: 'How It Works', blocks: [
        { type: 'steps', items: [
          { title: 'Dedicated notebook', text: 'One per student, used only for dialogue journals' },
          { title: 'Student writes (10-15 min)', text: 'About anything: weekend, something learned, a book, a problem, family' },
          { title: 'Teacher responds (3-5 sentences)', text: 'Acknowledge what they wrote, share something brief about yourself, end with an open question' },
          { title: 'Return and repeat', text: 'Every other week. Students look forward to reading your response.' },
        ]},
      ]},
      { title: 'What You Learn', blocks: [
        { type: 'text', value: 'Things students never say in front of the class:' },
        { type: 'list', items: [
          { text: 'They love drawing manga, parents are divorcing, they feel lonely at lunch' },
          { text: 'Obsessed with dinosaurs, struggling in math, want to be a chef' },
          { text: 'Cultural background that could inform your differentiation' },
          { text: 'Hidden strengths and interests for engagement' },
        ]},
      ]},
      { title: 'Ground Rules', blocks: [
        { type: 'do-dont', doItems: [
          'Respond with genuine interest: "You went fishing? That sounds fun! What did you catch?"',
          'Write back to EVERY student EVERY time',
          'Maintain confidentiality (unless mandatory reporting applies)',
          'Share brief personal details to model vulnerability',
        ], dontItems: [
          'Correct grammar or spelling -- this is a trust space, not assessment',
          'Grade the journals',
          'Write generic responses: "Good journal entry. Write more."',
          'Skip students -- if you miss someone, they notice',
        ]},
      ]},
      { title: 'For Beginning ELLs', blocks: [
        { type: 'levels', items: [
          { level: 'WIDA 1', color: '#EF4444', text: 'Draw and label, write in home language, or respond to visual prompt ("Draw your family. Write names.")' },
          { level: 'WIDA 2', color: '#F59E0B', text: 'Mix home language and English. Use sentence starters if needed.' },
          { level: 'WIDA 3+', color: '#22C55E', text: 'Write freely. Journals naturally become more English-dominant as proficiency grows.' },
        ]},
        { type: 'tip', value: 'For home-language entries, use Google Translate to understand and respond. The point is communication, not English practice.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Peyton & Reed', concept: 'Dialogue Journal Research', connection: 'Decades of research showing dialogue journals develop writing fluency, build relationships, and lower affective filter' },
      { author: 'Hamre & Pianta', concept: 'Student-Teacher Relationships', connection: 'Quality of student-teacher relationship is the strongest predictor of student engagement and achievement' },
    ],
    relatedGuides: ['emotional-scaffolds', 'sel-strategies', 'quick-writes'],
  },

  {
    id: 'sel-strategies',
    category: 'classroom',
    title: 'Five SEL Strategies for Classroom Community',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/5-sel-strategies/',
    summary: 'Five daily practices (2-5 min each) woven into existing instruction. Build the emotional safety needed for language risk-taking.',
    whenToUse: 'Daily. Each takes 2-5 minutes within existing routines.',
    tags: ['SEL', 'community', 'classroom culture'],
    sections: [
      { title: 'Five Daily Practices', blocks: [
        { type: 'steps', items: [
          { title: '1. Unteach (First 2 min)', text: 'Connect as humans before academics. NOT a warm-up problem. "One good thing this week?" "Energy level 1-5?" Share YOUR answer too.' },
          { title: '2. Build Trust (3 behaviors)', text: 'Competence: students believe you can teach. Honesty: say what you mean, follow through. Benevolence: students believe you care about THEM. Cannot be shortcutted.' },
          { title: '3. Play (vulnerability)', text: 'Structured play where you participate and look silly. 30-second dance break, vocabulary charades, Two Truths and a Lie. When the teacher is imperfect and laughs, students learn this room is safe.' },
          { title: '4. Speak Human (emotion words)', text: 'Teach beyond happy/sad/angry: frustrated, overwhelmed, relieved, anxious, proud. Model: "I\'m frustrated because the printer broke." Check in: "Confused to confident, where are you?"' },
          { title: '5. Debrief (2-3 min)', text: 'After hard tasks: "What was hardest? What helped?" After group work: "Any disagreements? How resolved?" Builds metacognition about learning AND emotions.' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Durlak et al.', concept: 'CASEL Meta-Analysis', connection: 'SEL programs improve academic achievement by 11 percentile points and reduce behavioral problems' },
      { author: 'Hammond', concept: 'Culturally Responsive Teaching and the Brain', connection: 'Emotional safety activates the brain\'s learning circuits; threat shuts them down' },
    ],
    relatedGuides: ['emotional-scaffolds', 'dialogue-journals', 'language-rich-classroom'],
  },

  {
    id: 'language-rich-classroom',
    category: 'classroom',
    title: 'Creating a Language-Rich Environment',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-rich-classroom/',
    summary: 'The physical classroom is a scaffold. Word walls, anchor charts, labeled objects, and student work displays are passive teaching tools students reference all day.',
    whenToUse: 'Classroom setup at year start, updated throughout the year.',
    tags: ['environment', 'word walls', 'anchor charts'],
    sections: [
      { title: 'Word Walls That Work', blocks: [
        { type: 'do-dont', doItems: [
          'Organized by CONTENT TOPIC or FUNCTION, not alphabetically',
          'Visual next to each word',
          'Updated regularly -- remove mastered, add new',
          'At student eye level near where related work happens',
          'Max 15-20 words visible at a time',
        ], dontItems: [
          'Alphabetical list of every word from the year (no one looks at it)',
          'Words without visuals',
          'Wall that never changes',
          'Placed above student sight lines',
        ]},
      ]},
      { title: 'Anchor Charts', blocks: [
        { type: 'list', label: 'Create for:', items: [
          { bold: 'Sentence starters by purpose', text: '"Compare: Similarly, Both" / "Contrast: However, Unlike"' },
          { bold: 'Steps for common tasks', text: 'How to summarize, solve a word problem, write a paragraph' },
          { bold: 'Graphic organizers', text: 'Templates students can copy or reference' },
          { bold: 'Stuck strategies', text: '"I can: re-read, look at picture, ask friend, try different strategy"' },
        ]},
        { type: 'tip', value: 'Build charts WITH students during lessons. When they see construction, they remember meaning and ownership.' },
      ]},
      { title: 'Student Work Displays', blocks: [
        { type: 'text', value: 'Display work with the academic language highlighted. Strong transitions? Post it, underline transitions in color. Used new vocabulary? Display with labels.' },
        { type: 'list', label: 'Two purposes', items: [
          { text: 'Shows what good work looks like (permanent mentor text on the wall)' },
          { text: 'Publicly validates student effort' },
        ]},
        { type: 'callout', label: 'Equity note', value: 'Rotate displays so every student sees their work up at some point during the year.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Marzano', concept: 'Classroom Instruction That Works', connection: 'Environmental factors including visual displays significantly impact student achievement' },
      { author: 'Krashen', concept: 'Print-Rich Environment', connection: 'Environmental print exposure is a factor in incidental vocabulary acquisition' },
    ],
    relatedGuides: ['three-types-scaffolding', 'tiered-vocabulary', 'sel-strategies'],
  },

  // ═══════════════════════════════════════════════════════════════
  // LESSON PLANNING & DELIVERY
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'chunking-instruction',
    category: 'lesson-design',
    title: 'Chunking: The Input-Output Loop',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/chunking-instruction/',
    summary: 'Never present more than 5-7 minutes without student output. The input-output loop prevents cognitive overload and gives you formative data after every chunk.',
    whenToUse: 'Every lesson, every day. The single most important structural change for ELLs.',
    tags: ['chunking', 'input-output', 'lesson structure'],
    sections: [
      { title: 'Why It Matters', blocks: [
        { type: 'text', value: 'Processing content in a second language takes more cognitive effort than in a first language. A 20-minute lecture is overwhelming for ELLs -- they lose the thread by minute 5 and cannot recover. Chunking respects cognitive load: process one piece, lock it in, next piece.' },
      ]},
      { title: 'The Loop', blocks: [
        { type: 'steps', label: 'Repeat 3-4 times per 30-minute lesson', items: [
          { title: 'INPUT (5-7 min)', text: 'One concept with visuals, gestures, pre-taught vocabulary, moderate pace' },
          { title: 'OUTPUT (2-3 min)', text: 'Students process what they heard: turn-tell partner, write one sentence, sketch, add to organizer' },
        ]},
      ]},
      { title: 'Output Options by Level', blocks: [
        { type: 'levels', items: [
          { level: 'WIDA 1', color: '#EF4444', text: 'Point to correct image, gesture, sort cards, draw' },
          { level: 'WIDA 2', color: '#F59E0B', text: 'Complete sentence frame, label diagram, tell partner with starter' },
          { level: 'WIDA 3', color: '#22C55E', text: 'Write 1-2 sentences, explain in own words, add to graphic organizer' },
          { level: 'WIDA 4-5', color: '#3B82F6', text: 'Quick write summary, compare with partner, generate a question about the content' },
        ]},
        { type: 'tip', value: 'Output after each chunk IS your formative data. Circulate during the output phase: most students accurate? Move on. Half confused? Re-teach that chunk differently. Specific students lost? Note for small-group follow-up.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Sweller', concept: 'Cognitive Load Theory', connection: 'Working memory is limited; chunking prevents overload by distributing processing across shorter intervals' },
      { author: 'Echevarria, Vogt & Short', concept: 'SIOP Model', connection: 'Interaction and practice/application are core SIOP components -- the output phase addresses both' },
    ],
    relatedGuides: ['comprehensible-input', 'visible-reading', 'combining-standards'],
  },

  {
    id: 'combining-standards',
    category: 'lesson-design',
    title: 'Content + Language Objectives',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/combining-standards/',
    summary: 'Every ELL lesson needs two objectives: content (what they learn) and language (how they use academic language to show it).',
    whenToUse: 'When writing lesson plans. Post both objectives and review with students at start and end of every lesson.',
    tags: ['objectives', 'language objectives', 'planning'],
    sections: [
      { title: 'Two Types of Objectives', blocks: [
        { type: 'grid', items: [
          { title: 'Content Objective', color: '#3B82F6', text: 'From your content standards. What students learn about the subject. Same for ALL students regardless of proficiency. "Identify three stages of the water cycle."' },
          { title: 'Language Objective', color: '#22C55E', text: 'What academic language students will USE. Includes a function (describe, compare), structure (using "although"), and vocabulary. Varies by proficiency.' },
        ]},
      ]},
      { title: 'Cross-Content Examples', blocks: [
        { type: 'table', headers: ['Subject', 'Content Objective', 'Language Objective'], rows: [
          ['Science', 'Explain floating/sinking', 'Write predictions using "I think ___ will float/sink because ___"'],
          ['Math', 'Identify patterns in sequences', 'Describe using "The pattern is ___. Next is ___ because ___"'],
          ['Social Studies', 'Compare colonial and modern life', 'Comparison chart + paragraph using "In colonial times... However, today..."'],
          ['ELA', 'Analyze character motivation', 'Write using "The character felt ___ because ___, which shows ___"'],
        ]},
      ]},
      { title: 'Post and Review', blocks: [
        { type: 'steps', items: [
          { title: 'Start of lesson', text: 'Read both aloud in student-friendly language. "Today we learn about the water cycle. By the end, you\'ll explain three stages using evaporation, condensation, precipitation."' },
          { title: 'End of lesson', text: '"Turn to your partner. Can you explain the three stages using those words?" Clear arc, instant student self-assessment.' },
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Echevarria, Vogt & Short', concept: 'SIOP Model', connection: 'Content and language objectives are the first of eight SIOP components -- non-negotiable in sheltered instruction' },
      { author: 'WIDA', concept: 'Key Uses of Academic Language', connection: 'Language objectives should align with WIDA Key Uses: Recount, Explain, Argue, Discuss' },
    ],
    relatedGuides: ['siop-lesson-plan', 'chunking-instruction', 'wida-key-uses', 'academic-language'],
  },

  {
    id: 'siop-lesson-plan',
    category: 'lesson-design',
    title: 'SIOP: Sheltered Instruction Planning Checklist',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/siop-lesson-plan/',
    summary: 'The most researched ELL teaching framework. Eight components ensure language support is woven into every phase. Use as a planning checklist even without following SIOP formally.',
    whenToUse: 'Lesson planning and self-assessment. The eight components make an excellent ELL-friendly design checklist.',
    tags: ['SIOP', 'lesson planning', 'framework'],
    sections: [
      { title: 'The Eight Components', blocks: [
        { type: 'table', headers: ['#', 'Component', 'Key Question', 'Quick Check'], rows: [
          ['1', 'Preparation', 'Are content + language objectives defined?', 'Both posted in student-friendly language'],
          ['2', 'Building Background', 'Am I connecting to prior knowledge?', 'Pre-taught key vocabulary, linked to experience'],
          ['3', 'Comprehensible Input', 'Can students understand my delivery?', 'Visuals, pace, gestures, no idioms unexplained'],
          ['4', 'Strategies', 'Am I scaffolding higher-order thinking?', 'Organizers, frames, varied Bloom\'s, 10+ sec wait time'],
          ['5', 'Interaction', 'Are students talking every 5-7 min?', 'Structured pairs, intentional grouping, sentence starters'],
          ['6', 'Practice/Application', 'Are all four domains engaged?', 'Reading + writing + speaking + listening in one lesson'],
          ['7', 'Delivery', 'Is pacing appropriate?', 'Not too fast, not too slow; 90%+ engagement'],
          ['8', 'Review/Assessment', 'Am I checking throughout?', 'Formative checks each chunk, not just end-of-lesson quiz'],
        ]},
        { type: 'tip', value: 'You don\'t need to use SIOP formally. Just run through these 8 questions while planning. If you can say yes to all 8, the lesson is ELL-ready.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Echevarria, Vogt & Short', concept: 'Making Content Comprehensible for ELLs', connection: 'The foundational SIOP text with 30+ years of research supporting the eight-component model' },
      { author: 'Short, Fidelman & Louguit', concept: 'SIOP Effectiveness Study', connection: 'Research showing SIOP-trained teachers significantly outperform comparison teachers on ELL outcomes' },
    ],
    relatedGuides: ['combining-standards', 'chunking-instruction', 'comprehensible-input'],
  },

  // ═══════════════════════════════════════════════════════════════
  // GIFTED & ADVANCED LEARNERS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'pre-assessment-circuit',
    category: 'gifted',
    title: 'Pre-Assessment Learning Circuit',
    source: 'Gifted Education Resource',
    sourceUrl: '',
    summary: 'Station-based pre-assessment where students rotate through 4-6 activities testing different skills. Turns assessment into engagement rather than a test.',
    whenToUse: 'Start of new units to determine prior knowledge and identify students needing compacted curriculum.',
    tags: ['pre-assessment', 'stations', 'differentiation'],
    sections: [
      { title: 'Station Setup', blocks: [
        { type: 'steps', items: [
          { title: 'Station 1: Vocabulary', text: 'Match terms to definitions or visuals' },
          { title: 'Station 2: Procedural skill', text: 'Solve sample problems or complete a task' },
          { title: 'Station 3: Conceptual', text: 'Explain or draw a concept in own words' },
          { title: 'Station 4: Application', text: 'Apply knowledge to a new scenario' },
          { title: 'Station 5: Extension', text: 'Create, design, or hypothesize (intentionally challenging to reveal ready-for-more students)' },
        ]},
        { type: 'text', value: '5-7 min per station with timer. Rotate on signal. Crystal clear directions with visuals at each station.' },
        { type: 'tip', value: 'For ELLs: include visuals and bilingual options at each station so language doesn\'t mask content knowledge.' },
      ]},
      { title: 'Using the Data', blocks: [
        { type: 'grid', items: [
          { title: '80%+ correct', color: '#22C55E', text: 'Already knows this. Compact -- don\'t re-teach what they\'ve mastered. Extend instead.' },
          { title: '40-79% correct', color: '#F59E0B', text: 'Knows some. Start at their entry point within the unit.' },
          { title: 'Below 40%', color: '#EF4444', text: 'New to this. Start from the foundation and build up.' },
        ]},
        { type: 'callout', label: 'Why this matters', value: 'Prevents spending two weeks teaching what half the class already knows. Takes 15-20 min to score and sort into groups.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Tomlinson', concept: 'Differentiated Instruction', connection: 'Pre-assessment is the essential first step of differentiation -- you cannot differentiate without knowing where students are' },
      { author: 'Reis & Renzulli', concept: 'Curriculum Compacting', connection: 'Research-based strategy for eliminating content students have already mastered, freeing time for extension' },
    ],
    relatedGuides: ['keeping-rigor-high', 'depth-complexity', 'teaching-with-taxonomies'],
  },

  {
    id: 'depth-complexity',
    category: 'gifted',
    title: 'Depth and Complexity Framework',
    source: 'Sandra Kaplan (Gifted Education)',
    sourceUrl: '',
    summary: 'Eleven thinking prompts (with icons) to push beyond surface understanding. Work for any content area and age. Differentiate through complexity of thinking, not different content.',
    whenToUse: 'When students need to go deeper with content they already understand at a basic level.',
    tags: ['gifted', 'depth', 'complexity', 'higher-order'],
    sections: [
      { title: 'The 11 Prompts', blocks: [
        { type: 'table', headers: ['Category', 'Prompt', 'Question It Asks'], rows: [
          ['Depth', 'Language of the Discipline', 'What expert vocabulary is used?'],
          ['Depth', 'Details', 'What are the important details?'],
          ['Depth', 'Patterns', 'What repeats or is predictable?'],
          ['Depth', 'Rules', 'What are the laws, structure, or order?'],
          ['Depth', 'Trends', 'How is this changing over time?'],
          ['Depth', 'Unanswered Questions', 'What is still unknown?'],
          ['Depth', 'Ethics', 'What are the moral dilemmas?'],
          ['Depth', 'Big Ideas', 'What is the universal theme?'],
          ['Complexity', 'Multiple Perspectives', 'Who sees this differently?'],
          ['Complexity', 'Change Over Time', 'How has this evolved?'],
          ['Complexity', 'Across Disciplines', 'How does this connect to other subjects?'],
        ]},
      ]},
      { title: 'Example: Water Cycle', blocks: [
        { type: 'text', value: 'Basic: Learn the three stages. With Depth & Complexity:' },
        { type: 'list', items: [
          { bold: 'Language of the Discipline', text: '"What vocabulary do scientists use that regular people don\'t?"' },
          { bold: 'Patterns', text: '"Where do you see the water cycle in your daily life?"' },
          { bold: 'Ethics', text: '"Some cities take more water than others. Is that fair?"' },
          { bold: 'Multiple Perspectives', text: '"How would a farmer, a fish, and a city planner each think about water?"' },
          { bold: 'Unanswered Questions', text: '"What don\'t scientists fully understand about weather prediction?"' },
        ]},
        { type: 'callout', label: 'Same content, different thinking', value: 'Every student learns the water cycle. Advanced students apply 4-5 prompts to the same content, tackling the most abstract ones (Ethics, Big Ideas, Unanswered Questions).' },
      ]},
    ],
    relatedResearch: [
      { author: 'Kaplan', concept: 'Depth and Complexity Icons', connection: 'Original framework designed for gifted learners but widely applicable to all students as thinking tools' },
      { author: 'Costa & Kallick', concept: 'Habits of Mind', connection: 'Complementary framework for developing thinking dispositions like persistence, precision, and questioning' },
    ],
    relatedGuides: ['keeping-rigor-high', 'teaching-with-taxonomies', 'pre-assessment-circuit'],
  },

  // ═══════════════════════════════════════════════════════════════
  // ELL FOUNDATIONS & PROGRAM MODELS
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'wida-key-uses',
    category: 'foundations',
    title: 'WIDA Key Uses of Academic Language',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/wida-key-uses/',
    summary: 'Four Key Uses represent the most important academic language functions: Recount, Explain, Argue, Discuss. Identifying which a task requires helps scaffold the right language.',
    whenToUse: 'When planning language objectives. What Key Use does this task require? Scaffold that specific function.',
    tags: ['WIDA', 'Key Uses', 'language functions'],
    sections: [
      { title: 'The Four Key Uses', blocks: [
        { type: 'table', headers: ['Key Use', 'Function', 'Language Features', 'Scaffold Tools'], rows: [
          ['Recount', 'Retell events or processes', 'Past tense, sequence words (first, then, finally)', 'Timeline organizer, sequence word bank'],
          ['Explain', 'Clarify how/why things work', 'Cause-effect (because, therefore), present tense', 'Cause-effect organizer, labeled diagrams'],
          ['Argue', 'Persuade with evidence', 'Opinion phrases, evidence integration, concession', 'Claim-Evidence-Reasoning organizer'],
          ['Discuss', 'Exchange ideas collaboratively', 'Agreement/disagreement, extending, questioning', 'Discussion starters on table tents'],
        ]},
      ]},
      { title: 'Combined in Practice', blocks: [
        { type: 'example', label: 'One lesson, multiple Key Uses', value: 'Read a historical text (Recount -- what happened?). Discuss with partner (Discuss -- what do you think?). Write an argument about whether the event was justified (Argue -- your position with evidence?).' },
        { type: 'tip', value: 'Identify the Key Use for each phase of your lesson. Scaffold that specific language function, not "academic language" in general.' },
      ]},
    ],
    relatedResearch: [
      { author: 'WIDA', concept: 'English Language Development Standards Framework', connection: 'The official WIDA framework organizes language expectations around these four Key Uses' },
      { author: 'Halliday', concept: 'Systemic Functional Linguistics', connection: 'Language serves social functions -- Key Uses are classroom-specific functions that drive language development' },
    ],
    relatedGuides: ['combining-standards', 'academic-language', 'language-scaffolds'],
  },

  {
    id: 'language-stages',
    category: 'foundations',
    title: 'Language Development Stages & Expectations',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-development-stages/',
    summary: 'Understanding stages helps set realistic expectations. Social language: 1-3 years. Academic language: 5-7 years with instruction.',
    whenToUse: 'When planning scaffolds, when frustrated with progress, when communicating with parents, when a new student arrives.',
    tags: ['WIDA levels', 'expectations', 'proficiency stages'],
    sections: [
      { title: 'The Five Stages', blocks: [
        { type: 'table', headers: ['Stage', 'WIDA', 'Timeline', 'What You See', 'What to Do'], rows: [
          ['Entering', '1', '0-6 months', 'Silent period, nods, points, draws, single words', 'TPR, bilingual buddy, accept non-verbal, heavy sensory scaffolds'],
          ['Emerging', '2', '6mo-1yr', 'Short phrases with errors, follows simple directions', 'Sentence frames, graphic organizers, bilingual glossaries'],
          ['Developing', '3', '1-3 years', 'Paragraphs with support, social English is conversational', 'Transition from frames to starters, teach academic structures explicitly'],
          ['Expanding', '4', '3-5 years', 'Near grade-level with occasional support needed', 'Transition word banks, push for precision, target remaining grammar'],
          ['Bridging', '5', '5+ years', 'Near-native, multi-paragraph essays, academic discussions', 'Focus on nuanced vocabulary, figurative language, advanced writing craft'],
        ]},
      ]},
      { title: 'The Social vs. Academic Gap', blocks: [
        { type: 'callout', label: 'The most misunderstood fact in ELL education', value: 'Social language (BICS) develops in 1-3 years. Academic language (CALP) takes 5-7 years. A student who is fluent on the playground may struggle with academic texts and formal writing. This is normal, not a deficit.' },
        { type: 'text', value: 'Teachers often assume conversational fluency means academic readiness. It does not. A WIDA 3 student who chats comfortably still needs significant language support for academic tasks.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Cummins', concept: 'BICS vs. CALP', connection: 'The foundational distinction between social and academic language proficiency timelines' },
      { author: 'Thomas & Collier', concept: 'School Effectiveness for Language Minority Students', connection: 'Longitudinal research on how long academic language development actually takes (5-7 years)' },
      { author: 'WIDA', concept: 'Can-Do Descriptors', connection: 'Specific descriptions of what students CAN do at each level, organized by grade cluster and domain' },
    ],
    relatedGuides: ['emotional-scaffolds', 'three-types-scaffolding', 'comprehensible-input'],
  },

  {
    id: 'translanguaging',
    category: 'foundations',
    title: 'Translanguaging: Using Full Linguistic Repertoire',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/translanguaging/',
    summary: 'Multilingual students have ONE integrated language system. Allowing strategic home language use accelerates both content learning and English development.',
    whenToUse: 'Whenever students share a home language. Especially for brainstorming, processing new concepts, clarifying confusion, or drafting before English writing.',
    tags: ['translanguaging', 'home language', 'assets-based'],
    sections: [
      { title: 'Specific Strategies', blocks: [
        { type: 'list', items: [
          { bold: 'Pre-reading', text: 'Read home-language summary first, then English version. Background knowledge makes English comprehensible.' },
          { bold: 'Brainstorming', text: 'Generate ideas in home language, then organize and write in English. Thinking quality is higher without language barriers.' },
          { bold: 'Notes', text: 'Whichever language captures information fastest. Translate key points later.' },
          { bold: 'Peer discussion', text: 'Shared home language? Discuss content in it. Deeper and more nuanced than forced English.' },
          { bold: 'First drafts', text: 'Write in strongest language first, then revise into English.' },
        ]},
      ]},
      { title: 'When to Use English vs. Home Language', blocks: [
        { type: 'grid', items: [
          { title: 'Home Language Works Best For', color: '#22C55E', text: 'Initial comprehension, planning ideas, clarifying confusion, deep discussion, emotional expression, brainstorming' },
          { title: 'English Practice Needed For', color: '#3B82F6', text: 'Structured speaking practice, final written products, formal presentations, targeted language skill building' },
        ]},
      ]},
      { title: 'When You Don\'t Speak Korean', blocks: [
        { type: 'list', label: 'You don\'t need to speak the home language', items: [
          { text: 'Let students use bilingual dictionaries and Google Translate' },
          { text: 'Pair shared-language students for complex tasks' },
          { text: 'Allow home-language notes and first drafts' },
          { text: 'Ask bilingual students to explain concepts to newcomers' },
          { text: 'Create bilingual word walls with student help' },
        ]},
        { type: 'tip', value: 'Your role is to create the space for home language use, not to do it yourself.' },
      ]},
    ],
    relatedResearch: [
      { author: 'Garcia & Wei', concept: 'Translanguaging', connection: 'Foundational theory that multilingual students have a single, integrated linguistic repertoire, not separate language systems' },
      { author: 'Cummins', concept: 'Common Underlying Proficiency', connection: 'Knowledge and skills transfer between languages -- L1 literacy supports L2 development' },
      { author: 'Thomas & Collier', concept: 'Dual Language Education', connection: 'Research showing programs that leverage home language produce the best long-term academic outcomes' },
    ],
    relatedGuides: ['emotional-scaffolds', 'language-stages', 'empower-principles'],
  },

  {
    id: 'empower-principles',
    category: 'foundations',
    title: 'EMPOWER: Seven Foundational Principles',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/key-principles/',
    summary: 'Seven research-based principles for all ELL instruction. The non-negotiable foundations everything else builds on.',
    whenToUse: 'As a guiding framework. Return to these when a strategy isn\'t working or when unsure how to approach a challenge.',
    tags: ['principles', 'framework', 'EMPOWER'],
    sections: [
      { title: 'The Seven Principles', blocks: [
        { type: 'table', headers: ['Letter', 'Principle', 'In Practice'], rows: [
          ['E', 'Every EL Can Learn', 'Assets-based mindset. A newcomer speaks another language fluently -- remarkable. High expectations with scaffolds, not lowered expectations.'],
          ['M', 'Metacognitive Learning', 'Teach students to think about thinking. "What helped you? What strategy when stuck?" Self-aware learners transfer skills.'],
          ['P', 'Power of Interaction', 'Language acquired through meaningful interaction, not silent study. Structure talk time into every lesson.'],
          ['O', 'Oral Language First', 'Sequence: listening > speaking > reading > writing. Discuss before reading. Talk through ideas before writing.'],
          ['W', 'Word Consciousness', 'Awareness of and curiosity about words. How words work, cognates, multiple meanings. Word-curious students self-teach vocabulary all day.'],
          ['E', 'Engaging Instruction', 'If boring, no scaffolding helps. Engagement from: connection to lives, genuine thinking required, peer interaction, choice, respect.'],
          ['R', 'Reading-Writing Connection', 'Reciprocal: improving one improves the other. Read mentor texts, analyze craft, write using same structures.'],
        ]},
      ]},
    ],
    relatedResearch: [
      { author: 'Krashen', concept: 'Five Hypotheses', connection: 'Input, Monitor, Natural Order, Affective Filter, Acquisition-Learning -- foundational SLA theory underlying EMPOWER' },
      { author: 'Cummins', concept: 'Linguistic Interdependence', connection: 'First language proficiency supports second language development -- the E (Every EL Can Learn) principle' },
      { author: 'Vygotsky', concept: 'Social Constructivism', connection: 'The P (Power of Interaction) principle -- learning is fundamentally social' },
    ],
    relatedGuides: ['three-types-scaffolding', 'fostering-independence', 'translanguaging', 'language-stages'],
  },

]
