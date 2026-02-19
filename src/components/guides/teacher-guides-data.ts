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

]
