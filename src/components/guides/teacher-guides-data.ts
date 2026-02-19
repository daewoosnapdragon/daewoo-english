// ═══════════════════════════════════════════════════════════════════
// Teacher Guides Data — Daewoo English Program
// ═══════════════════════════════════════════════════════════════════
// Each guide is distilled from a specific source into actionable
// content teachers can use immediately. No filler, no vague advice.

export interface GuideSubsection {
  title: string
  content: string
}

export interface GuideSection {
  title: string
  content: string
  subsections?: GuideSubsection[]
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
}

export interface Category {
  id: string
  label: string
  icon: string
  color: string
  description: string
}

export const CATEGORIES: Category[] = [
  { id: 'scaffolding', label: 'Scaffolding & Differentiation', icon: 'layers', color: '#8B5CF6', description: 'Scaffolding types, differentiation strategies, and supporting multilingual learners at every proficiency level' },
  { id: 'reading', label: 'Reading Instruction', icon: 'book-open', color: '#22C55E', description: 'Comprehension strategies, read-alouds, fluency, inferencing, summarizing, and visible reading techniques' },
  { id: 'writing', label: 'Writing Instruction', icon: 'pen-tool', color: '#EC4899', description: 'Paragraph and sentence-level instruction, academic essays, revision strategies, mentor texts, and quick writes' },
  { id: 'vocabulary', label: 'Vocabulary & Language', icon: 'message-square', color: '#F59E0B', description: 'Tiered vocabulary instruction, academic language, grammar in context, and language development stages' },
  { id: 'assessment', label: 'Assessment & Data', icon: 'clipboard', color: '#3B82F6', description: 'Informal assessments, equitable test design, using taxonomies, and formative assessment loops' },
  { id: 'classroom', label: 'Classroom Environment', icon: 'heart', color: '#EF4444', description: 'SEL strategies, dialogue journals, language-rich environments, and building trust with students' },
  { id: 'lesson-design', label: 'Lesson Planning & Delivery', icon: 'layout', color: '#06B6D4', description: 'SIOP planning, chunking instruction, combining standards, input-output loops, and workshop models' },
  { id: 'gifted', label: 'Gifted & Advanced Learners', icon: 'star', color: '#A855F7', description: 'Pre-assessment, creative thinking, depth and complexity, and student choice strategies' },
  { id: 'foundations', label: 'ELL Foundations & Program Models', icon: 'globe', color: '#14B8A6', description: 'Core ELL principles, program models, newcomer support, sociocultural context, and WIDA Key Uses' },
]

export const GUIDES: Guide[] = [

  // ═══════════════════════════════════════════════════════════════
  // SCAFFOLDING & DIFFERENTIATION (6 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'three-types-scaffolding',
    category: 'scaffolding',
    title: 'Three Types of Scaffolding for ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/scaffolding-for-ells/',
    summary: 'WIDA identifies three scaffold categories that make grade-level content accessible: sensory, graphic, and interactive. Each serves a different purpose and is most effective at different proficiency levels.',
    whenToUse: 'Every time you plan a lesson or assessment. Mental checklist: have I included at least one scaffold from each category?',
    tags: ['WIDA', 'scaffolding', 'differentiation'],
    sections: [
      { title: 'Sensory Scaffolds', content: 'Use the five senses to make abstract content concrete. Most powerful for WIDA 1-2 because they bypass language entirely.', subsections: [
        { title: 'What counts', content: 'Real objects (realia), photographs, illustrations, videos, gestures, facial expressions, demonstrations, manipulatives, science lab equipment, maps, physical models. Anything a student can see, touch, hear, or manipulate.' },
        { title: 'Classroom examples', content: 'Teaching "erosion"? Bring in a tray of sand and pour water over it. Teaching "compare and contrast"? Place two actual objects on the table. Teaching story elements? Act out a short scene. Replace words-about-things with the things themselves.' },
        { title: 'When to use', content: 'Essential for WIDA 1-2. Still valuable at all levels for unfamiliar content. If you are explaining with lots of words and students look lost, switch to a sensory scaffold.' },
      ]},
      { title: 'Graphic Scaffolds', content: 'Organize information visually so students can see relationships without relying solely on dense text.', subsections: [
        { title: 'What counts', content: 'T-charts, Venn diagrams, flow charts, concept maps, timelines, tables, labeled diagrams, anchor charts, categorized word walls, KWL charts, and any visual organizer showing how ideas connect.' },
        { title: 'Design principle', content: 'The best graphic organizers constrain the task without constraining the thinking. A Venn diagram comparing two characters still requires analysis -- it just gives the student a place to put their thinking instead of a blank page.' },
        { title: 'Example', content: 'Before reading about animal habitats, give a partially-filled table: "Animal | Habitat | Food | Adaptation." Students fill it in as they read. This turns comprehension from "read and remember everything" into "read and find four specific things."' },
      ]},
      { title: 'Interactive Scaffolds', content: 'Use other people as resources. Students learn language by using language with peers, not by silently studying it.', subsections: [
        { title: 'What counts', content: 'Think-Pair-Share, partner reading, peer editing, small group discussions, collaborative projects, jigsaw activities, interviews, and any structured student-to-student talk time.' },
        { title: 'The "structured" part matters', content: 'Telling students to "discuss with your partner" is NOT a scaffold. Giving sentence starters ("I agree because..." / "I noticed that..."), a specific question, a time limit, and assigned roles -- THAT is a scaffold.' },
        { title: 'Pairing strategy', content: 'Pair beginning ELLs with intermediate (not advanced) peers. Advanced students get bored; intermediate students are close enough to be relatable models. If two students share a home language, let them use it.' },
      ]},
      { title: 'Removing Scaffolds', content: 'Scaffolds are temporary. If a student still needs the same graphic organizer in May that they needed in September, the scaffold has become a crutch. Gradually reduce pre-filled content, switch to simpler organizers, then remove entirely. Watch for students who can do the task without the scaffold but choose to use it -- that is your signal they are ready to let go.' },
    ],
  },

  {
    id: 'emotional-scaffolds',
    category: 'scaffolding',
    title: 'Emotional Scaffolds: Lowering the Affective Filter',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/emotional-scaffolds/',
    summary: 'Krashen\'s Affective Filter Hypothesis: anxiety, low motivation, and low self-confidence block language acquisition even when input is comprehensible. Emotional scaffolds lower that filter so learning can happen.',
    whenToUse: 'When students shut down, refuse to participate, or give one-word answers despite being capable of more. At the start of the year or when welcoming a new student.',
    tags: ['affective filter', 'newcomers', 'classroom culture'],
    sections: [
      { title: 'What Raises the Affective Filter', content: 'Being called on without warning. Public correction. Not understanding what is happening with no way to find out. Feeling like the only one who does not get it. Home language treated as a problem. Being asked to perform in English before ready. Time pressure on speaking tasks. Fear of looking stupid.' },
      { title: 'Welcoming Routines', content: 'Greet every student by name at the door -- single highest-impact relationship move. Learn to say "hello" and "good job" in each student\'s home language. Post a daily schedule with words AND icons so students always know what is coming. Predictable routines reduce anxiety because students do not have to decode both the language AND the expectations simultaneously.' },
      { title: 'Validating Home Languages', content: 'Allow brainstorming, notes, and discussion in home language before English production. Label classroom objects in multiple languages. When a student uses their home language, say "Great thinking -- can you also tell me in English?" not "English only!" Display bilingual word walls. Let students write first drafts in their strongest language. The research is unambiguous: home language use accelerates English acquisition.' },
      { title: 'The Silent Period', content: 'Newcomers often go through a silent period (weeks to months) absorbing language but producing little. This is normal and productive. Do not force speech. Let students respond with gestures, drawings, pointing, single words. Give them group roles that do not require speaking (illustrator, materials manager). They are learning even when silent.' },
      { title: 'Building Academic Risk-Taking', content: 'Normalize mistakes: "In this classroom, mistakes help our brains grow." Give processing time (10-15 seconds, not 3). Use "turn and talk" before whole-class sharing so students rehearse with a partner. Celebrate attempts, not just correct answers. When a student makes an error, respond to the CONTENT first: "You think the character is angry because she lost her dog? Interesting! Let me write that: The character IS angry because she LOST her dog."' },
    ],
  },

  {
    id: 'language-scaffolds',
    category: 'scaffolding',
    title: 'Language Scaffolds: Starters, Frames, and Word Banks',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-scaffolds/',
    summary: 'Language scaffolds give students the English structures they need to express thinking they can already do. They close the gap between what a student knows and what they can say or write in English.',
    whenToUse: 'Any time students produce academic language -- writing, discussions, presentations, answering questions. Essential for WIDA 1-3.',
    tags: ['sentence starters', 'sentence frames', 'word banks'],
    sections: [
      { title: 'Starters vs. Frames', content: 'Sentence starters give the beginning: "I think ___ because ___." Frames provide more structure: "The character felt ___ when ___ happened, which shows that ___." Starters work for WIDA 3+ who need a push into academic register. Frames work for WIDA 1-2 who need the full grammatical structure. Always offer both on the same handout so students self-select.' },
      { title: 'Word Banks That Help', content: 'Bad: a random list of 20 words on the board. Good: 6-10 words organized by function with visual support. Example for compare/contrast: "SIMILARITIES: both, also, similarly. DIFFERENCES: however, unlike, on the other hand. CONTENT WORDS: habitat, adaptation, predator, prey [with small illustrations]." The organization teaches students which words go where.' },
      { title: 'By Proficiency Level', content: 'WIDA 1: Full sentence with one blank for a content word plus picture bank. "The ___ lives in the ocean." WIDA 2: Frames with 2-3 blanks. "The ___ lives in the ___ and eats ___." WIDA 3: Starters only. "One adaptation of this animal is..." WIDA 4-5: Transition word bank only. Students construct own sentences with academic connectors.' },
      { title: 'Gradual Removal', content: 'Week 1: Full frames with word banks. Week 3: Starters only (frames on request). Week 5: Transition word bank only. Week 7: No scaffolds, but anchor charts remain posted. Timeline varies by student. Test: can the student produce this language without the scaffold? If yes, remove it.' },
    ],
  },

  {
    id: 'keeping-rigor-high',
    category: 'scaffolding',
    title: 'Keeping the Rigor High for Multilingual Learners',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/keeping-the-rigor-high/',
    summary: 'The most common mistake: lowering cognitive demand instead of providing scaffolds. WIDA 1 students can analyze, evaluate, and create -- they just need a different pathway to show their thinking.',
    whenToUse: 'When planning differentiated activities. Check: am I changing the thinking required, or just the delivery? If advanced students analyze while ELLs label, you have a rigor problem.',
    tags: ['rigor', 'cognitive demand', 'differentiation'],
    sections: [
      { title: 'The Three-Step Process', content: 'Step 1: Identify the thinking required using WIDA Key Uses or Bloom\'s. "Students will compare two characters\' motivations" = analysis. Step 2: Identify what the student CAN do at their proficiency level. WIDA 1 can point, draw, sort, match, use single words. WIDA 3 can write short paragraphs with support. Step 3: Create a can-do opportunity preserving the analysis but changing the output mode. WIDA 1 sorts character trait cards into two columns. WIDA 3 writes a paragraph with sentence frames. Both are analyzing.' },
      { title: 'What Lowered Rigor Looks Like', content: 'ELLs coloring while others write. ELLs copying words while others compose. ELLs "looking up vocabulary" while others discuss. ELLs "just listening" during group work. These feel kind but rob students of thinking practice. The problem is never the thinking -- it is the language demand. Fix the language demand, keep the thinking.' },
      { title: 'Example: Comparing Art Movements', content: 'Task: Compare Impressionism and Realism. WIDA 4-5: Comparative essay with evidence. WIDA 3: Comparison chart using sentence frames ("Impressionism focuses on ___, while Realism focuses on ___"). WIDA 1-2: Sorts reproductions into categories, uses bilingual sticky notes to label observations ("bright/dark," "blurry/clear"). All three students are comparing. Output mode changed, thinking level did not.' },
      { title: 'Differentiate Three Things (Not Thinking)', content: 'Content: Leveled texts, bilingual resources, pre-taught vocabulary, visual/video alternatives. Process: Vary scaffolds and grouping. Some need partners; others work independently. Product: Multiple output modes -- drawing, speaking, writing, sorting, acting, building. NEVER differentiate the thinking level. If the standard says "analyze," every student analyzes.' },
    ],
  },

  {
    id: 'comprehensible-input',
    category: 'scaffolding',
    title: 'Making Input Comprehensible Without Dumbing It Down',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/comprehensible-input/',
    summary: 'Krashen\'s Input Hypothesis: language is acquired when students understand messages slightly above their current level (i+1). Make grade-level content understandable without simplifying the content itself.',
    whenToUse: 'Every lesson, every day. If students cannot understand your input, no amount of practice activities will help.',
    tags: ['Krashen', 'i+1', 'comprehensible input'],
    sections: [
      { title: 'Speech Modifications', content: 'Slow down slightly (natural pace minus 20%, not robotic). Pause between sentences, not mid-sentence. Use shorter sentences but do not avoid vocabulary -- instead say "precipitation -- that means rain, snow, sleet" and show an image. Repeat key phrases naturally: "The water cycle has three stages. Three stages. Let me show you the three stages." Emphasize key words with vocal stress. Use gestures constantly.' },
      { title: 'Visual Support', content: 'Every key concept needs a visual: photo, diagram, real object, or quick board sketch. Label visuals in English and let students add home-language labels. Project texts so students follow along -- hearing AND seeing words together is more powerful than either alone. Color-code: key vocabulary in one color, transitions in another, important details in a third.' },
      { title: 'Pre-Teaching Vocabulary', content: 'Before a lesson, identify 5-7 MUST-KNOW words (not 15-20). Introduce each with: word spoken aloud, word written, a visual or gesture, student-friendly definition. "Erosion. Erosion. [photo of worn hillside] Erosion means the ground is slowly washed away by water or wind." Students say it, write it, use it in a quick turn-and-talk. Takes 5-8 minutes, transforms comprehension for the entire lesson.' },
      { title: 'Chunking (Input-Output Loop)', content: 'Never lecture or read for more than 5-7 minutes without stopping for student output. Present a chunk. Stop. Students process: turn and tell partner one thing learned, draw what they heard, write one sentence, answer one question. Then next chunk. This prevents "I understood the first two minutes and got lost." Also gives you instant formative data.' },
    ],
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
      { title: 'Scaffolds vs. Strategies', content: 'Scaffold = external support the teacher provides (sentence frame, graphic organizer, word bank). Strategy = internal process the student owns ("When I don\'t know a word, I look at surrounding words for clues"). Scaffolds are temporary. Strategies are permanent. Use scaffolds to teach strategies, then remove the scaffolds.' },
      { title: 'Teaching Metacognitive Awareness', content: 'After reading: "What did you do when you hit a word you didn\'t know?" After writing: "What did you do first before starting?" After discussion: "What helped you understand your partner?" When students can NAME their strategies ("I used the picture" or "I re-read the sentence"), they are developing metacognition. Post student-generated strategy lists: "When I read, I can: look at pictures, re-read, ask a friend, use my glossary, skip and come back."' },
      { title: 'Gradual Release with Exit Ramp', content: 'Phase 1: Teacher models with think-aloud. Phase 2: Guided practice WITH scaffold. Phase 3: Guided practice, scaffold available on request but not automatically given. Phase 4: Independent practice. Phase 3 is the key -- students discover whether they actually need the scaffold.' },
      { title: 'Signs of Growing Independence', content: 'Student chooses not to use scaffold and succeeds. Student modifies scaffold for own needs (creates own organizer). Student explains strategy to a peer. Student transfers strategy to new context unprompted. Student says "I don\'t need that anymore."' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // READING INSTRUCTION (5 guides)
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
      { title: 'Why It Works for Older ELLs', content: 'Listening comprehension develops before reading comprehension. A student who cannot decode grade-level text can still understand it when read aloud with expression, pauses, gestures, and visual support. Read-alouds build the mental model of "what fluent English sounds like" -- where sentences pause, how questions differ from statements, how dialogue differs from narration. Students need that model before they can produce it.' },
      { title: 'Choosing Texts', content: 'Picture books are not just for little kids -- choose ones with sophisticated themes. "The Name Jar" (immigration, identity), "Each Kindness" (regret, bullying), "Separate Is Never Equal" (civil rights). Pictures provide sensory scaffolds; themes provide real discussion content. Poetry also works: short, rhythmic, packed with language. Avoid illustration styles that feel babyish -- the art should feel mature even if the reading level is accessible.' },
      { title: 'How to Read Effectively', content: 'Preview the book first -- know where to pause, what to emphasize, what to point to. Read slowly with genuine expression (not monotone). Stop every 2-3 pages for a quick check: "What just happened? Tell your partner." Use illustrations: "Look at her face. How does she feel?" Pre-teach 3-5 key words. Point to text as you read so students connect spoken and written words.' },
      { title: 'Making It Interactive', content: 'Before: Show cover. "What do you think this is about? Tell your partner." During: Pause at key moments. "What happens next?" "Why did she do that?" Keep brief -- 30 seconds of partner talk. After: One focused response (5-10 min, not 30). Draw favorite scene and label it, write one sentence about what the character learned, discuss "Would you have done the same?"' },
    ],
  },

  {
    id: 'think-read-talk-write',
    category: 'reading',
    title: 'Think-Read-Talk-Write Protocol',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/think-read-talk-write/',
    summary: 'A four-step protocol moving through all language domains on a single text. Each step builds on the previous one, so by the time students write, they have processed the content three times.',
    whenToUse: 'Any time students read a text and produce a written response. Works for fiction, nonfiction, science articles, math word problems.',
    tags: ['literacy protocol', 'all domains', 'structured'],
    sections: [
      { title: 'THINK (3-5 min)', content: 'Activate prior knowledge BEFORE students see the text. Show a related photograph -- students say 3 things they notice. Give a key term -- brainstorm associations. Play 30 seconds of related video. Ask a provocative question ("Should animals be in zoos?"). Goal: prime the brain, not exhaust the topic.' },
      { title: 'READ (varies)', content: 'Students read with a specific annotation task -- not "underline important things" (too vague) but: circle unfamiliar words, underline the main claim, star supporting evidence, question mark anything confusing. Beginning ELLs: partner-read or listen to teacher while following along and annotating. Chunk reading: one paragraph, annotate, next paragraph.' },
      { title: 'TALK (2-3 min/partner)', content: 'Structured discussion with sentence starters: "The main idea is..." / "I agree because..." / "I found ___ confusing." Assign roles (speaker A first, then B). Give a specific question, not open-ended "talk about the text." Set a timer. Circulate and listen -- this is your formative assessment moment.' },
      { title: 'WRITE (10-15 min)', content: 'By now students have thought, read, annotated, and discussed -- not starting from zero. Differentiated support: WIDA 1-2 get sentence frames with word bank. WIDA 3 gets sentence starters. WIDA 4-5 gets transition word bank only. Prompt should match the standard\'s thinking level -- if it says "analyze," the prompt requires analysis, not summary.' },
    ],
  },

  {
    id: 'teaching-inferencing',
    category: 'reading',
    title: 'Teaching Inferencing to ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/teaching-inferencing/',
    summary: 'Inferencing is especially hard for ELLs because it combines text evidence with background knowledge -- and ELLs may lack the cultural background knowledge that English-proficient students take for granted.',
    whenToUse: 'When students can decode and understand literal text but struggle with "why" questions, character motivation, theme, or author\'s purpose.',
    tags: ['inferencing', 'comprehension', 'think-aloud'],
    sections: [
      { title: 'The Inference Formula', content: 'Teach explicitly: Text Evidence + Background Knowledge = Inference. Write it on an anchor chart. Example: Text says "Maria pushed her plate away and stared out the window." (Evidence) + People who push food away and stare into space are usually upset. (Background knowledge) = Maria is feeling sad or worried. (Inference). Make it physical: text evidence on one sticky note, background knowledge on another, inference on a third.' },
      { title: 'The Background Knowledge Problem', content: 'Many inference failures are actually knowledge failures. "Bowing deeply" -- East Asian student infers respect; American student might be confused. "Making a wish before blowing out candles" -- students without birthday party experience miss the inference. Before asking students to infer, check: do they have the necessary cultural/experiential knowledge? If not, build it first.' },
      { title: 'Think-Aloud Modeling', content: '"The author says the sky was dark and the wind was howling. I know dark skies and strong wind usually come before a storm. So I think a storm is coming. The author didn\'t SAY storm -- I figured it out by combining text evidence with what I know." Do this repeatedly across lessons before expecting independent inferencing. Then: "Your turn. What does the text say? What do you know? Put them together."' },
      { title: 'Practice Activities', content: 'Picture inferences: Show a photo (messy kitchen, crying child). "What happened before this photo?" No text to decode -- pure inference skill practice. One-sentence inferences: "Jake shoved his textbook into his locker and slammed the door." "How does Jake feel? How do you know?" Isolates the skill from reading-stamina challenges. Graduate from sentences to paragraphs to full texts.' },
    ],
  },

  {
    id: 'visible-reading',
    category: 'reading',
    title: 'Visible Reading: Making Comprehension Observable',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/visible-reading/',
    summary: 'Comprehension is invisible. A student can stare at a page for 10 minutes and you have no idea if they understood anything. Visible reading makes thinking observable so you can intervene at the point of breakdown.',
    whenToUse: 'During any independent or guided reading. Essential for identifying who needs re-teaching and what they are struggling with.',
    tags: ['annotation', 'formative assessment', 'comprehension'],
    sections: [
      { title: 'Annotation System', content: 'Give a simple, consistent code (4-5 marks max): check = I understand, ? = confused, star = important, circle = unknown word, ! = surprised. Practice on a shared text first. Collect annotated texts as data: if five students all have ? at the same paragraph, that is your re-teach target.' },
      { title: 'Margin Notes', content: 'Beyond marks, teach brief notes. For beginning ELLs: a single word or quick sketch. Model types: "The character wants..." (motivation), "This reminds me of..." (connection), "I think the author means..." (interpreting), "I was wrong -- actually..." (revising). More informative than annotations because they show WHAT the student is thinking, not just WHERE they are confused.' },
      { title: 'Stop-and-Sketch', content: 'After reading a section, students draw a quick sketch (30-60 seconds, not art class) of what they read. Powerful for ELLs because it bypasses language production while requiring comprehension. A student who draws a person in rain after reading about a character in a storm understands. A blank or unrelated drawing signals confusion. Use as discussion starters: "Show your sketch. Explain what is happening."' },
      { title: 'Structured Response Checks', content: 'After every chunk (1-2 paragraphs for struggling readers, a page for stronger ones): thumbs up/sideways/down, write one sentence, tell your partner the most important thing, answer one question on a whiteboard. Key: frequent and low-stakes. Check-ins, not quizzes.' },
    ],
  },

  {
    id: 'deeper-reading-ells',
    category: 'reading',
    title: 'Deeper Reading: Moving Beyond Surface Comprehension',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/deeper-reading/',
    summary: 'Lower-proficiency students can and should engage in analysis, evaluation, and critical reading -- not just literal comprehension. Scaffolds make deeper reading accessible without watering down the cognitive demand.',
    whenToUse: 'When students can answer "what happened" questions but struggle with "why," "so what," and "how does the author..." questions.',
    tags: ['close reading', 'critical thinking', 'DOK'],
    sections: [
      { title: 'Three Reads Protocol', content: 'Read 1: What does the text say? (Literal comprehension -- gist, main events, key facts.) Read 2: How does the text work? (Author\'s craft -- word choice, structure, figurative language, text features.) Read 3: What does the text mean? (Interpretation -- theme, implications, connections, evaluation.) Each read has a different purpose and produces different annotations. Space them across class periods if needed.' },
      { title: 'Text-Dependent Questions at Increasing DOK', content: 'DOK 1: "What happened after the flood?" (recall) DOK 2: "How did the character\'s feelings change from the beginning to the end?" (skill) DOK 3: "Why do you think the author chose to tell this story from the child\'s perspective instead of the parent\'s? Use evidence." (strategic thinking). All students should reach DOK 3 -- scaffolding varies.' },
      { title: 'Scaffolding Deep Questions for ELLs', content: 'Provide the evidence first, then ask the interpretive question. Instead of "Why did the author use the word \'shattered\'?" try: "The author used the word \'shattered\' instead of \'broken.\' Look at both words. [Show visual of each.] Why is \'shattered\' a stronger choice? Use this frame: The author chose \'shattered\' because it makes the reader feel ___."' },
      { title: 'Academic Discussion Structures', content: 'Use structured protocols for deeper discussion: Socratic Seminar Lite (inner circle discusses, outer circle takes notes, then switch), Save the Last Word (students pick a quote, explain why it matters, others respond), or Philosophical Chairs (take a position, defend with evidence, switch sides). Provide sentence stems for each protocol.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // WRITING INSTRUCTION (5 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'paragraph-tabbs',
    category: 'writing',
    title: 'TABBS: Paragraph-Level Summarization Structure',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/paragraph-level-instruction/',
    summary: 'TABBS gives each sentence position a specific job and grammatical structure. Removes "what do I write next?" paralysis while teaching both summarization and academic sentence construction simultaneously.',
    whenToUse: 'When students can write sentences but struggle organizing them into paragraphs. Effective for summarizing, compare/contrast, and cause-effect.',
    tags: ['paragraph structure', 'TABBS', 'academic writing'],
    sections: [
      { title: 'The Framework', content: 'T = Topic sentence using a subordinating conjunction (Although, While, Because). A = And -- compound similar details. B = But -- compound contrasting details. B = Because -- explain the contrast. S = So -- cause-effect conclusion. Each letter = one sentence with a specific grammatical structure. Students learn paragraph organization AND academic sentence patterns at once.' },
      { title: 'Example: Dolphins Article', content: 'T: "Although dolphins live in the ocean, they are actually mammals." A: "Dolphins breathe air through a blowhole, and they are warm-blooded like other mammals." B: "They swim like fish, but they must come to the surface to breathe." B: "This is because dolphins have lungs instead of gills." S: "So dolphins have adapted to ocean life while keeping mammal characteristics."' },
      { title: 'Teaching Sequence', content: 'Week 1: T sentence only -- practice subordinating conjunctions with two facts. Week 2: Add A -- compound similar ideas with "and," "also," "in addition." Week 3: Add B sentences -- contrast with "but"/"however" and explain with "because"/"since." Week 4: Add S -- cause-effect with "so"/"therefore." Week 5: Complete TABBS paragraphs.' },
      { title: 'Scaffolded Practice', content: 'Level 1: Paragraph with blanks for content words only (structure provided). Level 2: First word of each sentence given (Although..., And..., But..., Because..., So...). Level 3: Only letters T-A-B-B-S as a reminder. Level 4: Free writing incorporating the structures.' },
    ],
  },

  {
    id: 'sentence-transitions',
    category: 'writing',
    title: 'Sentence Transitions: Time-Based, HAT, and WEST BUNDAI',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/sentence-to-sentence-transitions/',
    summary: 'Three transition frameworks from simple to advanced, giving students concrete tools for connecting ideas instead of writing disconnected sentences.',
    whenToUse: 'When student writing reads as a list of unrelated sentences. Also for structured discussions where students build on each other.',
    tags: ['transitions', 'cohesion', 'academic writing'],
    sections: [
      { title: 'Time-Based (Simplest)', content: 'First, Then, Next, After that, Finally. Starting point for beginning ELLs. Practice retelling a process (make a sandwich, the water cycle, a story plot) using these. Formulaic at first, but solves "and then... and then... and then..."' },
      { title: 'HAT (Intermediate)', content: 'H = However (contrast: "I wanted the park. However, it rained.") A = Additionally (adding: "Dolphins are intelligent. Additionally, they communicate.") T = Therefore (cause-effect: "The experiment failed. Therefore, we changed our hypothesis.") HAT covers the three most common academic relationships. Once mastered, students can handle most expository and argumentative writing.' },
      { title: 'WEST BUNDAI (Advanced)', content: 'When, Even though, Since, Though, Because, Unless, Now that, Despite, Although, If. These create complex sentences: "Although the character seemed brave, she was terrified inside." "Because the ice caps are melting, sea levels rise." The hallmark of academic writing.' },
      { title: 'Structured Quick Write Practice', content: 'Display two related facts. Assign a transition word. Students combine in 60 seconds. Share with partner. Teacher selects 2-3 to discuss. Takes 5 min, can be done daily as warm-up. Example: "Butterflies drink nectar. They pollinate flowers. THEREFORE." Student writes: "Butterflies drink nectar; therefore, they help pollinate flowers as they move between plants."' },
    ],
  },

  {
    id: 'star-revision',
    category: 'writing',
    title: 'STAR Revision Strategy',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/star-revision/',
    summary: 'Most students think "revising" means fixing spelling. STAR teaches four specific moves: Substitute weak words, Take out irrelevant content, Add details, Rearrange for logic.',
    whenToUse: 'After first drafts, before final editing. Use as the structured revision step.',
    tags: ['revision', 'writing process', 'self-editing'],
    sections: [
      { title: 'The Four Moves', content: 'S = Substitute: Replace vague words with specific ones. "Good" becomes "effective." "Went" becomes "rushed" or "strolled." T = Take out: Remove sentences that do not support the main idea, repeated info, filler ("In my opinion, I think that..."). A = Add: Details, examples, evidence where writing is thin. If a sentence claims something, the next should explain WHY. R = Rearrange: Move sentences into logical order. Does the conclusion appear in the introduction? Does a detail come before its point?' },
      { title: 'Teaching Step by Step', content: 'Do not introduce all four at once. Week 1: S only -- give paragraph with 5 underlined weak words, find stronger replacements. Week 2: T -- paragraph with 2 off-topic sentences, identify and remove. Week 3: A -- paragraph with 3 thin sentences, add details. Week 4: R -- scrambled paragraph, reorder. Week 5: Apply all four to own writing.' },
      { title: 'The Checklist', content: 'Physical checklist: [ ] S: Replaced at least 2 weak words with stronger ones. [ ] T: Removed sentences that don\'t support my main idea. [ ] A: Added at least 1 specific detail or example. [ ] R: Checked logical order. Students check off each and write what they changed. Makes revision concrete and verifiable.' },
      { title: 'Peer Revision with STAR', content: 'Partners swap papers. Each applies ONE letter. Partner A does S (circles words, suggests alternatives). Partner B does A (puts ^ where detail is needed, writes a question: "What did it look like?"). Writer decides which to accept. Teaches specific, actionable feedback instead of "it\'s good" or "I like it."' },
    ],
  },

  {
    id: 'quick-writes',
    category: 'writing',
    title: 'Quick Writes: Low-Stakes Writing Fluency',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/quick-writes/',
    summary: 'Timed 3-5 minute writing that builds fluency and confidence. Emphasis on generating ideas, not correctness. Also serves as instant formative assessment.',
    whenToUse: 'Daily as warm-up, mid-lesson processing, or exit ticket.',
    tags: ['writing fluency', 'formative assessment', 'warm-up'],
    sections: [
      { title: 'How to Run It', content: 'Display a content-connected prompt. Set visible timer for 3-5 min. Say: "Write as much as you can. Don\'t worry about spelling or grammar -- just get ideas down." Circulate while students write. When timer sounds, students count words and write the number. Track counts over weeks to show growth. Optional: 2-3 students share their best sentence.' },
      { title: 'Effective Prompts', content: 'Too vague: "Write about today\'s lesson." Better: "Explain one way erosion changes the land." Even better: "Describe what would happen to a mountain over 1000 years of erosion." Add a visual and/or sentence starter for ELLs. Always connect to content just learned or about to learn.' },
      { title: 'Scaffolding by Level', content: 'WIDA 1: Draw and label, or fill-in-the-blank cloze paragraph. WIDA 2: Sentence starters + word bank. "Erosion is when ___. One example is ___." WIDA 3: Prompt only, write freely. WIDA 4-5: Add constraint -- "Use 2 vocabulary words from today" or "Include a subordinating conjunction."' },
      { title: 'Using as Formative Data', content: 'After collecting (or glancing during circulation), sort into three piles: Gets it (move on), Partially gets it (clarify tomorrow), Doesn\'t get it (re-teach). Takes 3-5 min after class. Also check: are students using sentence structures you\'ve been teaching? Attempting new vocabulary? Quick writes = daily window into content understanding AND language development.' },
    ],
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
      { title: 'Four-Step Process', content: 'Step 1: Read aloud for enjoyment. Don\'t analyze yet. Step 2: Re-read and name ONE craft move to study. Not five -- one. "Today: how this author uses transitions between paragraphs." Step 3: Students find examples of that move (highlight, underline, list). Step 4: Students apply the same move to their own writing. "Open your draft and find a place to add a transition like these."' },
      { title: 'Choosing for ELLs', content: 'Must be readable by the students -- advanced literary essays won\'t work for WIDA 2. Choose one level above students\' writing, not five. Short beats long: one well-written paragraph can teach more than a full essay. Best mentor texts for ELLs: clear sentence structures, visible organizational patterns, familiar content.' },
      { title: 'Craft Moves to Study (One Per Lesson)', content: 'How the author hooks the reader in the first sentence. How transitions connect ideas. How sentence length varies (short for emphasis, long for explanation). How evidence is embedded (quote, then explain). How the ending works (echoes intro? restates main idea? asks a question?). For each: find it, name what makes it effective, try it in own writing.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // VOCABULARY & LANGUAGE (4 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'tiered-vocabulary',
    category: 'vocabulary',
    title: 'Beck\'s Three Tiers of Vocabulary',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/tiered-vocabulary/',
    summary: 'Words divided by frequency and utility. Tier 2 (analyze, contrast, significant) gives highest return for ELLs because they transfer across every subject.',
    whenToUse: 'When selecting which vocabulary to pre-teach. Use tiers to pick the 5-7 that matter most instead of trying to teach 20.',
    tags: ['vocabulary', 'tier 2', 'word selection'],
    sections: [
      { title: 'Tier 1: Basic Words', content: 'High-frequency everyday words: table, run, happy. Native speakers know these by school age. For ELLs: most don\'t need formal instruction -- picked up through immersion. Exception: ELLs may KNOW the concept but not the English label. A Korean student knows what a table is. Point-and-name is enough. Don\'t spend class time drilling Tier 1 unless students truly lack the concept.' },
      { title: 'Tier 2: High-Utility Academic Words', content: 'Used across subjects by mature language users: analyze, evidence, significant, contrast, sequence, influence, perspective, conclude. MOST IMPORTANT to teach because they unlock every content area. A student who knows "compare" follows instructions in science, social studies, math, AND ELA. Rarely learned from conversation -- need explicit instruction. Teach in context, multiple exposures across days and subjects, used in speaking and writing.' },
      { title: 'Tier 3: Domain-Specific Technical', content: 'Low-frequency, tied to content: photosynthesis, denominator, peninsula. Taught when you teach the content. Often EASIER than Tier 2 for ELLs: concrete definitions, cognates across languages (photosynthesis/fotosintesis), built-in visuals. Pre-teach with labeled visuals and bilingual glossaries.' },
      { title: 'Selection Process', content: 'Before a lesson, scan materials. List unfamiliar words. Categorize: Tier 1 (point and name)? Tier 2 (teach explicitly, use repeatedly)? Tier 3 (teach with content, visual support)? Select 2-3 Tier 2 and 2-3 Tier 3 to pre-teach. Ignore the rest -- context clues or glossary. 5-7 words max. More than that, students remember none.' },
    ],
  },

  {
    id: 'grammar-in-context',
    category: 'vocabulary',
    title: 'Grammar in Context: Teaching Through Content',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/grammar-in-context/',
    summary: 'Isolated grammar worksheets don\'t transfer to real writing. Teaching grammar in context means noticing patterns in authentic texts, naming them, and practicing within meaningful content.',
    whenToUse: 'When you notice a grammar pattern most students get wrong, or when a text provides a clear example of a useful structure.',
    tags: ['grammar', 'authentic texts', 'language patterns'],
    sections: [
      { title: 'Notice-Name-Practice', content: 'Step 1 (Notice): During shared reading, stop at a target sentence. "Look: \'Although the colonists wanted freedom, they feared war.\' What do you notice about how this is built?" Step 2 (Name): "This is a complex sentence using \'although\' to connect contrasting ideas." Step 3 (Practice): Students write their own using the same structure about current content. "Write an \'although\' sentence about ecosystems."' },
      { title: 'High-Value Targets', content: 'Don\'t try to teach all grammar. Focus on structures that appear in content AND that students need for writing. Common targets: past tense (narratives, history), comparative/superlative (analysis), passive voice (science: "The solution was heated"), conditional (predictions: "If temperature rises, then..."), subordinating conjunctions (academic argument). One structure per week across content areas.' },
      { title: 'Why Worksheets Fail', content: 'A student can circle the correct verb on a worksheet and still write "Yesterday I go to the store." Worksheets test knowledge ABOUT grammar. Contextual practice builds ability to USE grammar. Like studying music theory vs. playing an instrument.' },
      { title: 'Responding to Errors', content: 'Oral: Don\'t say "Wrong -- it\'s went." Recast: "Oh, you WENT to the store? Which store?" Models correct form without shutting down communication. Written: Don\'t mark every error. Choose the ONE pattern you\'re currently teaching. Marking 30 errors teaches nothing except "my writing is bad." Marking 3 instances of the target pattern teaches one specific improvement.' },
    ],
  },

  {
    id: 'academic-language',
    category: 'vocabulary',
    title: 'Three Dimensions of Academic Language',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/academic-language/',
    summary: 'Academic language operates at three levels: word (Tier 2/3), sentence (complex structures, passive voice), and discourse (organization, transitions, genre). All three need explicit instruction.',
    whenToUse: 'When planning language objectives. Check: am I addressing word-level, sentence-level, AND discourse-level language?',
    tags: ['academic language', 'three dimensions'],
    sections: [
      { title: 'Word Level', content: 'Where most teachers focus: Tier 2 and 3 vocabulary. Important but not enough. A student who knows "analyze," "evidence," and "therefore" individually may not write: "Analyze the evidence; therefore, the hypothesis is supported." They know the words but not how to combine them academically.' },
      { title: 'Sentence Level', content: 'Academic sentences differ structurally from conversational ones. Passive voice ("The experiment was conducted" not "We did the experiment"), nominalization ("The destruction of the habitat" not "They destroyed it"), embedded clauses ("The water, which had been heated to 100 degrees, began to boil"), complex conjunctions. Teach through mentor text analysis, not grammar drills.' },
      { title: 'Discourse Level', content: 'How ideas are organized across paragraphs and texts. A lab report differs from a persuasive essay differs from a literary analysis. Students need explicit instruction in: introducing topics, transitioning between paragraphs, incorporating evidence, concluding. Genre-specific conventions even advanced ELLs may not know.' },
      { title: 'Planning Example', content: 'Lesson: Causes of the American Revolution. Word objective: Use "taxation," "representation," "rebellion" correctly. Sentence objective: Write complex sentences using "because" and "although" to explain causes. Discourse objective: Write a cause-effect paragraph with topic sentence, 3 supporting details, concluding sentence. Same content, three dimensions of language.' },
    ],
  },

  {
    id: 'context-clues',
    category: 'vocabulary',
    title: 'Teaching Context Clues for Independence',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/context-clues/',
    summary: 'Students encounter thousands of unfamiliar words yearly -- you can\'t pre-teach them all. Context clues are the independence skill for figuring out meanings from surrounding text.',
    whenToUse: 'Ongoing during reading instruction. Especially when students are ready to move beyond word banks toward independent reading.',
    tags: ['context clues', 'vocabulary', 'independence'],
    sections: [
      { title: 'Four Types', content: 'Definition: Text defines the word. "Photosynthesis, the process by which plants convert sunlight to energy, occurs in leaves." Synonym/Antonym: Nearby word has same/opposite meaning. "The jovial, cheerful man greeted everyone." Example: Text gives clarifying examples. "Nocturnal animals, such as owls, bats, and raccoons, are active at night." Inference: Meaning from overall context. "After three days without food, the hikers were famished." Students must know these four types by name.' },
      { title: 'Think-Aloud Modeling', content: '"I see \'famished.\' I don\'t know it. But the sentence says \'three days without food.\' Someone who hasn\'t eaten for three days would be very hungry. So \'famished\' probably means very hungry. I used an inference clue." Do this repeatedly with different clue types before expecting independent use.' },
      { title: 'Practice Activities', content: 'Clue detective: Paragraph with underlined words. Identify meaning AND clue type used. Multiple choice + explain: Unfamiliar word with four options. Choose AND explain which context words helped. Prevents guessing. Create your own: Students write sentences containing context clues for learned vocabulary. Partners figure out the meaning.' },
      { title: 'When Context Isn\'t Enough', content: 'Be honest: context clues don\'t always work. Teach the backup chain: (1) Try context clues. (2) Look for word parts (prefixes, roots, suffixes). (3) Check glossary/dictionary. (4) Ask a classmate or teacher. Goal: systematic approach to unknown words instead of skipping or shutting down.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ASSESSMENT & DATA (3 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'equitable-assessments',
    category: 'assessment',
    title: 'Engineering Equitable Assessments for ELLs',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/engineering-equitable-assessments/',
    summary: 'Most assessments accidentally test English proficiency instead of content knowledge. Seven specific modifications remove linguistic barriers so you measure what students actually know.',
    whenToUse: 'Every time you create or modify a quiz, test, or rubric. Use the checklist before giving any assessment to ELLs.',
    tags: ['assessment', 'equity', 'accommodations'],
    sections: [
      { title: 'Core Principle', content: 'Ask: "If this student took this test in their home language and understood every word, would they get it right?" If yes, the barrier is language, not knowledge -- adjust the assessment. If no, the student doesn\'t know the content. Every modification below serves one principle: remove language barrier, keep content expectation.' },
      { title: 'Seven Modifications (15-20 min to apply)', content: '1. Add synonyms to complex vocabulary: "perspective (point of view)." 2. Provide sentence starters for written responses: "The character changed because ___. Evidence shows ___." 3. Separate multi-part questions into 3a, 3b, 3c. 4. Add labeled visuals next to relevant questions. 5. Include a word bank (8-10 terms with 2-3 distractors). 6. Allow bilingual glossaries (standard WIDA accommodation). 7. Offer alternative response modes: drawing, labeling, matching, sorting for beginning ELLs.' },
      { title: 'What NOT to Modify', content: 'Don\'t lower content expectations. Don\'t reduce question count (reduce linguistic complexity instead). Don\'t grade ELLs differently -- design assessments to accurately measure knowledge. Don\'t skip assessments for ELLs -- they need data as much as anyone.' },
    ],
  },

  {
    id: 'informal-assessments',
    category: 'assessment',
    title: 'Informal Classroom-Based Assessments',
    source: 'Reading Rockets',
    sourceUrl: 'https://www.readingrockets.org/topics/assessment-and-evaluation/articles/types-informal-classroom-based-assessment',
    summary: 'Seven practical assessment tools covering the spectrum from letter recognition to portfolios. Each tells you something different -- choose the right tool for the right question.',
    whenToUse: 'When you need to check where students are and plan next steps without a formal test.',
    tags: ['informal assessment', 'formative', 'reading'],
    sections: [
      { title: 'Letter/Sound Recognition', content: 'Show one letter, ask name and sound. Record on tracking sheet. 3x/year in K. Focus instruction on UNKNOWN letters, not re-drilling mastered ones.' },
      { title: 'Phonological & Phonemic Awareness', content: 'Phonological: oral tasks at word/syllable/rhyme level. "Do big and fig rhyme?" Developmental sequence: words > syllables > onset-rime > rhyme. Phonemic: individual sounds. "First sound in sat? (/s/)" Sequence: matching > isolation > blending > segmenting > manipulation. Assess and teach in order -- skipping creates gaps.' },
      { title: 'Informal Reading Inventory (IRI)', content: 'Single most informative assessment. Student reads passage aloud while you record errors, then answer comprehension questions (explicit + inferential). Accuracy benchmarks: 95-100% = too easy, 90-94% = instructional (just right), below 89% = frustration. Critical: accuracy without comprehension is not real reading.' },
      { title: 'Running Records & Fluency', content: 'Running record: Mark each word (check/circle/note substitutions). Calculate: correct / total = accuracy rate. Self-corrections = good sign (student monitors). Fluency: correct words per minute. Remember: fluency includes expression and phrasing, not just speed. A student racing through ignoring periods needs prosody work.' },
      { title: 'Portfolios', content: 'Three types: (1) Collection folder with work samples, (2) Display for conferences, (3) Teacher assessment with anecdotal notes. Most powerful: teaching students to select pieces and explain why. "I picked this because it shows I learned to use transition words." Builds metacognition and ownership.' },
    ],
  },

  {
    id: 'teaching-with-taxonomies',
    category: 'assessment',
    title: 'Using Bloom\'s and Webb\'s DOK for Task Design',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/teaching-with-taxonomies/',
    summary: 'Bloom\'s and Webb\'s DOK help design tasks at appropriate cognitive levels. Critical insight: language proficiency does not equal thinking level. A WIDA 1 student can analyze -- they need scaffolds to express it.',
    whenToUse: 'When planning activities and assessments. Verify all students think at high levels, not just the ones who speak English well.',
    tags: ['Bloom\'s', 'DOK', 'cognitive demand'],
    sections: [
      { title: 'Bloom\'s Quick Reference', content: 'Remember (recall, define) > Understand (explain, summarize) > Apply (use in new situation) > Analyze (compare, identify relationships) > Evaluate (judge, critique) > Create (produce new, design). Higher levels are not "harder" -- they require different thinking. A student can analyze without being a strong reader if scaffolded.' },
      { title: 'Webb\'s DOK', content: 'Level 1 (Recall): "Capital of France?" Level 2 (Skill/Concept): "Describe how a food web works." Level 3 (Strategic Thinking): "Compare two food webs and explain which is more stable." Level 4 (Extended Thinking): "Design an ecosystem and justify choices." DOK = complexity of thinking, not difficulty.' },
      { title: 'The ELL Pitfall', content: 'Most common mistake: ELLs get only DOK 1 tasks (labeling, matching, fill-in-blank) while peers analyze and create. Fix: keep thinking high, change output. Instead of written analysis, ELLs sort, categorize, rank, diagram, or discuss with starters. Same thinking, adjusted language demand.' },
      { title: 'Planning Example', content: 'Standard: "Compare and contrast two traditional tales" = Bloom\'s Analyze / DOK 3. WIDA 4-5: Comparative essay. WIDA 3: Venn diagram + paragraph with frames. WIDA 1-2: Sort story elements into comparison chart using pictures and single words, tell partner one difference. All comparing. None doing busywork.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CLASSROOM ENVIRONMENT (3 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'dialogue-journals',
    category: 'classroom',
    title: 'Dialogue Journals: Written Conversations',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/dialogue-journals/',
    summary: 'Biweekly written teacher-student conversations. Students write about anything; teacher responds with interest and a question. Builds trust, reveals interests, develops writing fluency.',
    whenToUse: 'Every other week. Takes 2-3 min per student to respond. Start within first two weeks of school.',
    tags: ['SEL', 'writing', 'relationship building'],
    sections: [
      { title: 'How It Works', content: 'Dedicated notebook per student. Twice monthly, students write a journal entry to you (10-15 min class time) about anything: weekend, something they learned, a book, a problem, their family. You collect, read, and respond (3-5 sentences): acknowledge what they wrote, share something brief about yourself, end with open-ended question to continue the conversation.' },
      { title: 'What You Learn', content: 'Things students never say in front of the class: they love drawing manga, parents are divorcing, they feel lonely at lunch, obsessed with dinosaurs, struggling in math. This transforms teaching: choose texts matching interests, identify who needs emotional support, discover hidden strengths, learn cultural backgrounds for differentiation.' },
      { title: 'Ground Rules', content: 'NEVER correct grammar or spelling -- trust space, not assessment. If students worry about errors, they write less and share less. Don\'t grade them. Respond to content with genuine interest: "You went fishing with your uncle? That sounds fun! What did you catch?" not "Good journal entry. Write more." Maintain confidentiality (unless mandatory reporting applies). Write back to EVERY student EVERY time -- if you skip someone, they notice.' },
      { title: 'For Beginning ELLs', content: 'WIDA 1-2: Draw and label, write in home language (use Google Translate to respond), mix home language and English, or respond to a visual prompt ("Draw your family. Write names."). Journals will naturally become more English-dominant as proficiency grows. The point is communication, not English practice.' },
    ],
  },

  {
    id: 'sel-strategies',
    category: 'classroom',
    title: 'Five SEL Strategies for Classroom Community',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/5-sel-strategies/',
    summary: 'Five daily practices (2-5 min each) woven into instruction. Build emotional safety needed for language risk-taking.',
    whenToUse: 'Daily. Each takes 2-5 minutes within existing routines.',
    tags: ['SEL', 'community', 'classroom culture'],
    sections: [
      { title: '1. Unteach (First 2 Minutes)', content: 'Connect as humans before academics. NOT an academic warm-up. "One good thing this week?" or "Energy level 1-5?" Share your answer too. Students who feel seen as people first take more academic risks. 2 minutes, transforms the room.' },
      { title: '2. Build Trust (Three Behaviors)', content: 'Competence: students believe you can help them learn (prepare well, know content). Honesty: say what you mean, follow through, admit what you don\'t know. Benevolence: students believe you care about THEM, not just scores (journals, door greetings, noticing when someone\'s off). Cannot be shortcutted. Built through small, consistent actions over weeks.' },
      { title: '3. Play (Vulnerability)', content: 'Structured play where the teacher participates and looks silly. 30-second dance break where YOU dance. Vocabulary charades where YOU act out words. Two truths and a lie. When the teacher is imperfect and laughs at themselves, students learn this room is safe for mistakes.' },
      { title: '4. Speak Human (Emotional Vocabulary)', content: 'Teach words beyond happy/sad/angry: frustrated, overwhelmed, relieved, anxious, proud, embarrassed, grateful, confused, hopeful, disappointed. Use them yourself: "I\'m frustrated because the printer broke." Check in: "Scale of confused to confident, where are you with fractions?" When students name emotions precisely, they process them and communicate needs.' },
      { title: '5. Debrief (Reflective Connection)', content: 'End activities with reflective questions. After a hard task: "What was hardest? What strategy helped?" After group work: "Any disagreements? How resolved?" After a game: "How did it feel when behind? What did you do with that feeling?" Builds metacognition about learning AND emotions. Under 3 minutes.' },
    ],
  },

  {
    id: 'language-rich-classroom',
    category: 'classroom',
    title: 'Creating a Language-Rich Environment',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-rich-classroom/',
    summary: 'The physical classroom is a scaffold. Word walls, anchor charts, labeled objects, sentence starter posters, and student work displays serve as passive teaching tools students reference all day.',
    whenToUse: 'Classroom setup at year start, updated throughout the year.',
    tags: ['environment', 'word walls', 'anchor charts'],
    sections: [
      { title: 'Word Walls That Work', content: 'Bad: alphabetical list of every word from the year. No one looks at it. Good: organized by CONTENT TOPIC or FUNCTION, visual next to each word, updated regularly (remove mastered, add new). Student eye level near where related work happens. Example: "Science Words" near science area, grouped by unit (Water Cycle: evaporation, condensation, precipitation -- each with diagram). Max 15-20 words visible at a time.' },
      { title: 'Anchor Charts', content: 'Create for: sentence starters by purpose ("Compare: Similarly, Both" / "Contrast: However, Unlike"), steps of common tasks (how to summarize, solve a word problem), graphic organizers students can copy, stuck strategies ("I can: re-read, look at picture, ask friend, try different strategy"). Build WITH students during lessons -- when they see construction, they remember meaning.' },
      { title: 'Labeled Environment', content: 'Label objects in English (add home language for ELL classes). Go beyond nouns: clock says "What time is it?" Door says "May I go to the restroom?" Whiteboard says "We are learning about ___." Makes language functional and ever-present.' },
      { title: 'Student Work Displays', content: 'Display work with academic language highlighted. Strong transitions? Post it, underline transitions in color. Correct terminology? Display with labels. Two purposes: shows what good work looks like (permanent mentor text), validates student effort publicly. Rotate so every student sees their work up during the year.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // LESSON PLANNING & DELIVERY (3 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'chunking-instruction',
    category: 'lesson-design',
    title: 'Chunking: The Input-Output Loop',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/chunking-instruction/',
    summary: 'Never present more than 5-7 minutes without student output. Input-Output Loop prevents cognitive overload and gives formative data after every chunk.',
    whenToUse: 'Every lesson, every day. The single most important structural change for ELLs.',
    tags: ['chunking', 'input-output', 'lesson structure'],
    sections: [
      { title: 'Why It Matters', content: 'Processing content in a second language takes more cognitive effort. A 20-minute lecture overwhelming for ELLs -- they lose the thread by minute 5 and can\'t recover. Chunking respects cognitive load: process one piece, lock it in, next piece. Output after each chunk converts passive understanding into active language use.' },
      { title: 'The Loop', content: 'INPUT (5-7 min): One concept with comprehensible input (visuals, gestures, pre-taught vocab, moderate pace). OUTPUT (2-3 min): Process what they heard. Turn-tell partner, write one sentence, sketch the concept, answer one question on whiteboard, add to graphic organizer. REPEAT. A 30-minute lesson = 3-4 chunks.' },
      { title: 'Output by Level', content: 'WIDA 1: Point to correct image, gesture, sort cards, draw. WIDA 2: Complete sentence frame, label diagram, tell partner with starter. WIDA 3: Write 1-2 sentences, explain in own words, add to organizer. WIDA 4-5: Quick write summary, compare with partner, generate a question. Always 2-3 min max.' },
      { title: 'Formative Assessment Built In', content: 'Output after each chunk IS your data. While students process, circulate and listen/glance. Most students accurate? Move on. Half confused? Re-teach that chunk differently. Specific students lost? Note for small-group follow-up. Takes no extra time -- you\'re already walking during output phase.' },
    ],
  },

  {
    id: 'combining-standards',
    category: 'lesson-design',
    title: 'Content + Language Objectives',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/combining-standards/',
    summary: 'Every ELL lesson needs two objectives: content (what they learn) and language (how they use academic language to show it). Language development through content, not separate from it.',
    whenToUse: 'When writing lesson plans. Post both and review with students at start and end of every lesson.',
    tags: ['objectives', 'language objectives', 'planning'],
    sections: [
      { title: 'Content Objectives', content: 'From your content standards. What students learn about the subject. "Identify three stages of the water cycle." "Compare two characters\' perspectives." "Calculate area of irregular shapes." Same for ALL students regardless of proficiency. Content expectations don\'t change -- scaffolding does.' },
      { title: 'Language Objectives', content: 'Describe the academic language students will USE. Include: a language function (describe, compare, explain, argue, summarize), the structure needed (using "although... however," in a paragraph with evidence, using comparative adjectives), and sometimes vocabulary. Example: "Explain the water cycle using sequence transitions (first, then, finally) and the terms evaporation, condensation, precipitation."' },
      { title: 'Cross-Content Examples', content: 'Science -- Content: Explain floating/sinking. Language: Write predictions using "I think ___ will float/sink because ___." Math -- Content: Identify patterns. Language: Describe using "The pattern is ___. Next is ___ because ___." Social Studies -- Content: Compare colonial/modern life. Language: Comparison chart + paragraph using "In colonial times... However, today..."' },
      { title: 'Post and Review', content: 'Write both on the board in student-friendly language. Start of lesson: read aloud. "Today we learn about the water cycle. By the end, you\'ll explain three stages using evaporation, condensation, precipitation." End of lesson: "Can you tell your partner the three stages using those words?" Clear arc, student self-assessment.' },
    ],
  },

  {
    id: 'siop-lesson-plan',
    category: 'lesson-design',
    title: 'SIOP: Sheltered Instruction Planning Framework',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/siop-lesson-plan/',
    summary: 'The most researched ELL teaching framework. Eight components ensure language support is woven into every phase, not bolted on. Use as planning checklist even without following SIOP formally.',
    whenToUse: 'Lesson planning and self-assessment. The eight components make an excellent ELL-friendly design checklist.',
    tags: ['SIOP', 'lesson planning', 'framework'],
    sections: [
      { title: '1. Preparation', content: 'Define content and language objectives. Identify supplementary materials (visuals, leveled texts, manipulatives). Adapt for all proficiency levels. The "before class" work.' },
      { title: '2. Building Background', content: 'Connect to prior knowledge/experiences. Pre-teach key vocabulary. Link to previously learned concepts. Before an immigration unit: students share their experience of moving somewhere new.' },
      { title: '3. Comprehensible Input', content: 'Appropriate pace. Clear language. Step-by-step task explanations. Multiple modalities. Avoid idioms unless explained. If you say "hit the books," someone will wonder why you want to punch a textbook.' },
      { title: '4. Strategies', content: 'Teach learning strategies explicitly (context clues, note-taking, summarizing). Use scaffolds (organizers, frames, word banks) for higher-order thinking. Questions at varied Bloom\'s levels with 10+ second wait time.' },
      { title: '5. Interaction', content: 'Frequent student-to-student opportunities. Intentional grouping (mixed proficiency, shared home language when strategic). Sufficient wait time. Students should talk every 5-7 minutes minimum.' },
      { title: '6. Practice & Application', content: 'Hands-on materials AND integration of all four domains. After learning the water cycle: label diagram (reading/writing), explain to partner (speaking/listening), write summary (writing).' },
      { title: '7. Delivery', content: 'Both objectives clearly supported. 90-100% student engagement. Appropriate pacing -- not too fast (lost), not too slow (bored).' },
      { title: '8. Review & Assessment', content: 'Review vocabulary/concepts throughout (not just at end). Regular feedback on output. Assess comprehension through formal and informal measures. Don\'t wait until a test to discover they didn\'t understand.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // GIFTED & ADVANCED LEARNERS (2 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'pre-assessment-circuit',
    category: 'gifted',
    title: 'Pre-Assessment Learning Circuit',
    source: 'Gifted Education Resource',
    sourceUrl: '',
    summary: 'Station-based pre-assessment where students rotate through 4-6 activities testing different skills. Turns assessment into engagement rather than a test, provides differentiated data.',
    whenToUse: 'Start of new units to determine prior knowledge and identify students needing compacted curriculum.',
    tags: ['pre-assessment', 'stations', 'differentiation'],
    sections: [
      { title: 'Setup', content: 'Create 4-6 stations testing different aspects of the upcoming unit. Station 1: vocabulary (match terms to definitions). Station 2: procedural skill (solve sample problems). Station 3: conceptual understanding (explain or draw a concept). Station 4: application (apply to new scenario). Station 5: extension (create, design, hypothesize). 5-7 min each with timer, rotate on signal.' },
      { title: 'Task Design', content: 'Each station completable in 5-7 min with no teacher instruction needed. Crystal clear directions with visuals. Range from recall to higher-order thinking. Include at least one intentionally challenging station to reveal students ready for extension. For ELLs: visuals and bilingual options at each station so language doesn\'t mask knowledge.' },
      { title: 'Using the Data', content: 'Sort into three groups: Already knows (80%+) -- compact, don\'t re-teach. Knows some (40-79%) -- start at their entry point. New to this (<40%) -- start from foundation. Takes 15-20 min to score/sort. Prevents spending two weeks teaching what half the class already knows.' },
    ],
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
      { title: '11 Prompts', content: 'DEPTH (going deeper): Language of the Discipline (expert words?), Details (important details?), Patterns (what repeats?), Rules (laws/structure?), Trends (changing over time?), Unanswered Questions (still unknown?), Ethics (moral dilemmas?), Big Ideas (universal theme?). COMPLEXITY (connecting across): Multiple Perspectives (who sees differently?), Change Over Time (how evolved?), Across Disciplines (connects to other subjects?).' },
      { title: 'Example: Water Cycle', content: 'Basic: Learn three stages. With D&C: Language of the Discipline -- "What vocabulary do scientists use that regular people don\'t?" Patterns -- "Where do you see the water cycle in daily life?" Ethics -- "Some cities take more water. Is that fair?" Multiple Perspectives -- "How would a farmer, a fish, and a city planner each think about it?" Unanswered Questions -- "What don\'t scientists fully understand about weather?" Same content, different thinking levels.' },
      { title: 'Using Icons', content: 'Each prompt has an icon (magnifying glass = Details, arrow = Trends, question mark = Unanswered Questions). Post them. Once learned, quickly prompt deeper thinking by pointing to an icon or putting one on a worksheet. Students can self-select which lens to apply.' },
      { title: 'Differentiation', content: 'All students, same content. Grade-level: address 2-3 prompts with scaffolding. Advanced/gifted: 4-5 prompts independently, tackle the most abstract (Ethics, Big Ideas, Unanswered Questions). Differentiation through thinking complexity, not different content.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ELL FOUNDATIONS & PROGRAM MODELS (4 guides)
  // ═══════════════════════════════════════════════════════════════

  {
    id: 'wida-key-uses',
    category: 'foundations',
    title: 'WIDA Key Uses of Academic Language',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/wida-key-uses/',
    summary: 'Four Key Uses represent the most important academic language functions: Recount, Explain, Argue, Discuss. Identifying which a task requires helps you scaffold the right language structures.',
    whenToUse: 'When planning language objectives. What Key Use does this task require? Scaffold that specific language function.',
    tags: ['WIDA', 'Key Uses', 'language functions'],
    sections: [
      { title: 'Recount', content: 'Retelling events, experiences, or process steps. Language: past tense, sequence words (first, then, finally), time markers. Used when: retelling stories, describing history, explaining experiment steps. Scaffold: timeline organizers, sequence transition bank, past-tense frames ("First, the colonists ___. Then, they ___."). ' },
      { title: 'Explain', content: 'Clarifying how or why something works. Language: cause-effect connectors (because, therefore, as a result), present tense for truths, technical vocab. Used when: describing processes, explaining choices, clarifying solutions. Scaffold: cause-effect organizers, frames ("___ happens because ___"), labeled diagrams.' },
      { title: 'Argue', content: 'Persuading with evidence, defending claims. Language: opinion (I believe, evidence suggests), evidence integration (according to, text states), concession (although, however), conclusion (therefore, for these reasons). Scaffold: claim-evidence-reasoning organizers, starters for each part ("I claim ___. Evidence: ___. This shows ___ because ___.").' },
      { title: 'Discuss', content: 'Exchanging ideas collaboratively. Language: agreement/disagreement (I agree because, I see it differently), extending (additionally, building on that), questioning (what do you mean by). Scaffold: discussion starters on table tents, speaking roles, protocols (30 seconds each before passing).' },
      { title: 'Combined in Practice', content: 'One lesson might use multiple: Read historical text (Recount -- what happened?), discuss with partner (Discuss -- what do you think?), write argument about whether event was justified (Argue -- your position?). Identify Key Use for each phase, scaffold that specific language.' },
    ],
  },

  {
    id: 'language-stages',
    category: 'foundations',
    title: 'Language Development Stages',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/language-development-stages/',
    summary: 'Understanding stages helps set realistic expectations and choose appropriate scaffolds. Social language: 1-3 years. Academic language: 5-7 years with explicit instruction.',
    whenToUse: 'When planning scaffolds, when frustrated with progress, when communicating with parents, when a new student arrives.',
    tags: ['WIDA levels', 'expectations', 'proficiency'],
    sections: [
      { title: 'Stage 1: Entering (WIDA 1)', content: '0-6 months. Silent period (normal, productive). Understand more than produce. Nod, point, draw, gesture, single words. Do NOT force speech. Accept non-verbal responses. Use TPR (commands students act out). Pair with bilingual buddy. Heavy sensory scaffolds. Label everything.' },
      { title: 'Stage 2: Emerging (WIDA 2)', content: '6 months-1 year. Short phrases with errors: "She go store yesterday." Follows simple directions. Identifies key vocabulary. Begins participating with heavy scaffolding. Sentence frames for everything. Accept errors, recast. Graphic organizers. Bilingual glossaries. Partner work with proficient peers.' },
      { title: 'Stage 3: Developing (WIDA 3)', content: '1-3 years. Paragraphs with support. Understands most instruction. Social English conversational. Occasional grammar errors with complex structures. Participates with starters. Transition from frames to starters. Teach academic sentence structures explicitly. Increase writing expectations. Often mistaken for "speaks English fine" -- academic language still developing.' },
      { title: 'Stage 4-5: Expanding/Bridging', content: '3-5+ years. Near grade-level with occasional support. Multi-paragraph essays. Academic discussions. Still struggles with: nuanced vocabulary, complex grammar (passive voice, subjunctive), cultural references. Transition word banks. Push for precision. Target specific remaining grammar challenges. Continue Tier 2 instruction.' },
      { title: 'Social vs. Academic Gap', content: 'Cummins\' research: social language (BICS) = 1-3 years. Academic language (CALP) = 5-7 years. A student fluent on the playground may struggle with academic texts and formal writing. This is the most misunderstood aspect of ELL education. Teachers assume conversational fluency = academic readiness. It does not -- and that is normal, not a deficit.' },
    ],
  },

  {
    id: 'translanguaging',
    category: 'foundations',
    title: 'Translanguaging: Using Full Linguistic Repertoire',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/translanguaging/',
    summary: 'Multilingual students have ONE integrated language system. Allowing strategic home language use accelerates both content learning and English development.',
    whenToUse: 'Whenever students share a home language. Especially for brainstorming, processing new concepts, clarifying confusion, drafting before English writing.',
    tags: ['translanguaging', 'home language', 'assets-based'],
    sections: [
      { title: 'What It Is', content: 'Strategically using home language to support learning. Student researches in Korean, discusses findings in Korean, writes report in English. It is intentional and teacher-designed, not "anything goes."' },
      { title: 'Specific Strategies', content: 'Pre-reading: Read home-language summary first, then English version. Background knowledge makes English more comprehensible. Brainstorming: Generate ideas in home language, then organize and write in English. Thinking quality is higher without language barriers during ideation. Notes: Whichever language captures info fastest. Translate key points later. Peer discussion: Shared home language? Discuss content in it. Deeper, more nuanced than forced English.' },
      { title: 'When English-Only Works', content: 'Students still need English output for proficiency. English-only for: structured speaking practice, final written products, formal presentations. Translanguaging for: initial comprehension, planning ideas, clarifying confusion, deep discussion, emotional expression.' },
      { title: 'When You Don\'t Speak the Language', content: 'You don\'t need to speak Korean. Let students use bilingual dictionaries and Google Translate. Pair shared-language students for complex tasks. Allow home-language notes and drafts. Ask bilingual students to explain to newcomers. Create bilingual word walls with student help. Your role: create the space, not do it yourself.' },
    ],
  },

  {
    id: 'empower-principles',
    category: 'foundations',
    title: 'EMPOWER: Seven Foundational Principles',
    source: 'Tan Huynh',
    sourceUrl: 'https://www.empoweringells.com/key-principles/',
    summary: 'Seven research-based principles for all ELL instruction, across content areas, ages, and proficiency levels. The non-negotiable foundations everything else builds on.',
    whenToUse: 'As a guiding framework. Return when a strategy isn\'t working or when unsure how to approach a challenge.',
    tags: ['principles', 'framework', 'EMPOWER'],
    sections: [
      { title: 'E: Every EL Can Learn', content: 'Assets-based. A newcomer speaks another language fluently (remarkable), has life experience from another culture, has the same intellectual capacity. Not "behind" -- developing a new language while learning content. Deficit mindset leads to lowered expectations. Assets mindset leads to high expectations with scaffolds.' },
      { title: 'M: Metacognitive Learning', content: 'Teach students to think about their learning. "What helped you understand? What strategy when stuck? What do you do well? What to improve?" When students name strategies and monitor comprehension, they become independent learners who transfer skills across contexts.' },
      { title: 'P: Power of Interaction', content: 'Language acquired through meaningful interaction, not silent study. Students must USE English with peers, teachers, audiences. Structure talk time into every lesson. More talk = faster development. Less talk = slower.' },
      { title: 'O: Oral Language First', content: 'Sequence: listening > speaking > reading > writing. Discuss before reading, talk through ideas before writing, build oral vocabulary before expecting written use. Jumping straight to reading/writing without oral foundation = teaching running before walking.' },
      { title: 'W: Word Consciousness', content: 'Awareness of and curiosity about words. Teach how words work: prefixes/suffixes, cognates across languages, multiple meanings, connotation vs. denotation. Word-conscious students notice language everywhere and self-teach vocabulary all day.' },
      { title: 'E: Engaging Instruction', content: 'If boring, no scaffolding helps. Engagement from: content connecting to students\' lives, tasks requiring genuine thinking, peer interaction, choice in demonstration, respect for intelligence. An engaged student making errors > a disengaged student producing nothing.' },
      { title: 'R: Reading-Writing Connection', content: 'Reciprocal -- improving one improves the other. Read mentor texts, analyze author craft, write using same structure. More effective than teaching reading and writing as separate subjects.' },
    ],
  },

]
