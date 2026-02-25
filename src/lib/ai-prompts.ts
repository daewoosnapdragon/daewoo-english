// All the domain constants from the original TeacherVault app.py

export const TOPICS = [
  'Animals','Nature & Environment','Science & Discovery','Space & Sky','Weather & Seasons',
  'Poetry','Fiction','Nonfiction','Biography & Autobiography','History','Geography & Maps',
  'Culture & Heritage','Community','Family','Friendship','Feelings & Emotions','Health & Body',
  'Food & Cooking','Holidays & Celebrations','Technology','Art & Music','Sports & Games',
  'Transportation & Travel','Jobs & Careers','Fairy Tales','Myths & Legends',
  'Fables & Folktales','Humor','Mystery & Adventure','Identity & Self','Communication',
  'School Life','Money & Economics','Time & Sequence','Problem Solving','Korean Culture'
];

export const READING_SKILLS = [
  "Author's Purpose",'Cause & Effect','Compare & Contrast','Context Clues',
  'Drawing Conclusions','Fact vs. Opinion','Figurative Language','Inference',
  'Main Idea & Details','Making Predictions','Point of View','Problem & Solution',
  'Sequence of Events','Story Elements','Summarizing','Text Features','Text Structure',
  'Theme','Vocabulary in Context','Character Analysis','Setting','Plot','Tone & Mood',
  "Author's Craft",'Connections (Text-to-Self/World/Text)','Retelling','Text Evidence',
  'Fluency & Prosody'
];

export const RESOURCE_TYPES = [
  'Worksheet','Presentation','Anchor Chart','Task Card','Assessment','Activity','Game',
  'Lesson Plan','Handout','Reference','Graphic Organizer','Word Wall','Poster','Passage',
  'Read Aloud','Close Reading','Writing Prompt','Teaching Pal','Other'
];

export const SUBJECT_AREAS = [
  'Reading','Writing','Grammar','Vocabulary','Spelling','Phonics','Comprehension',
  'Speaking & Listening','ESL/ELL','Social Studies','Science','Math','SEL','Other'
];

export const VALID_CATEGORIES = [
  'grammar','reading','writing','phonics','projects','seasonal',
  'assessments','sel','novel_study','misc'
];

export const SUB_TOPICS: Record<string, string[]> = {
  'Animals': ['Informational/Nonfiction Animals','Animal Fantasy','Animal Folktales & Fables','Animal Poetry','Animal Science (habitats, life cycles, adaptations)','Pets & Caring for Animals'],
  'Community': ['Community Helpers','Places in Town','Rules & Responsibilities','Neighborhoods & Maps','Cultural Communities'],
  'Friendship': ['Making Friends','Conflict & Resolution','Teamwork & Cooperation','Kindness & Empathy','Unlikely Friendships'],
  'Poetry': ['Haiku','Rhyming Poetry & Couplets','Free Verse','Song Lyrics & Chants','Shape/Concrete Poetry','Limericks & Nonsense Verse'],
  'Nature & Environment': ['Plants & Growing','Water Cycle & Earth Science','Outdoor Exploration','Conservation','Rocks & Soil'],
  'Family': ['Family Roles & Relationships','Traditions & Heritage','Grandparents & Elders','Home & Daily Life','Growing & Changing Family'],
  'Feelings & Emotions': ['Identifying Feelings','Managing Big Emotions','Confidence & Courage','Gratitude','Dealing with Change'],
  'Korean Culture': ['Lunar New Year & Chuseok','Korean Folktales','Korean Food & Traditions','Korean-American Identity','Korea Past & Present'],
};

export const GRAMMAR_KEYWORDS = [
  'noun','nouns','verb','verbs','adjective','adjectives','adverb','adverbs',
  'pronoun','pronouns','preposition','prepositions','conjunction','conjunctions',
  'comma','commas','apostrophe','apostrophes','quotation mark','quotation marks',
  'capitalization','capitalize','punctuation','period','exclamation',
  'sentence type','types of sentence','declarative','interrogative','imperative','exclamatory',
  'command','statement','question mark','fragment','run-on','run on',
  'subject-verb','subject verb','contraction','contractions','possessive','possessives',
  'plural','plurals','singular','past tense','present tense','future tense',
  'irregular verb','helping verb','linking verb','action verb',
  'simple sentence','compound sentence','complex sentence','complete sentence',
  'parts of speech','grammar','grammatical',
  'proper noun','common noun','abstract noun','collective noun',
];

export const CATEGORY_FIX_MAP: Record<string, string> = {
  'communication':'grammar','language':'grammar','language_arts':'grammar',
  'speaking_listening':'grammar','speaking':'grammar','listening':'grammar',
  'vocabulary':'reading','comprehension':'reading','literature':'reading',
  'ela':'reading','english':'reading',
  'science':'projects','social_studies':'projects','math':'projects',
  'art':'projects','stem':'projects','technology':'projects',
  'holiday':'seasonal','holidays':'seasonal','special_events':'seasonal',
  'social_emotional':'sel','social_emotional_learning':'sel',
  'test':'assessments','quiz':'assessments','evaluation':'assessments',
  'novel':'novel_study','book_study':'novel_study','literature_circle':'novel_study',
};

export function buildAnalyzePrompt(text: string, filename: string, bookNum: number, moduleNum: number): string {
  const isTeachingPal = filename.toLowerCase().includes('teaching pal') || filename.toLowerCase().includes('teaching_pal');
  const isModuleOpener = filename.toLowerCase().includes('module opener') || filename.toLowerCase().includes('module introduction');

  return `Analyze this teaching resource. Return ONLY a JSON object:
- "title": descriptive title following these NAMING CONVENTIONS:
  * Teaching Pal: "Module [#] [Module Title]" (e.g. "Module 9 Animal Survival")
  * Stories/Passages: "IR [Book].[Module] [Story Title]" (e.g. "IR 1.9 The Nest", "IR 2.3 Animal Q & A")
  * Other resources: "[Story Title] - [Activity Type]" (e.g. "The Nest - Vocabulary", "Animal Q & A - Close Reading")
- "story_title": if this is a story/passage, the clean story title. Empty string if not a story. Each unique story MUST have its own unique title.
- "summary": 1-2 sentence teacher description
- "resource_type": MUST be one of ${JSON.stringify(RESOURCE_TYPES)}
  RULES: "Teaching Pal" = teacher guides. "Worksheet" = student practice. "Passage" = reading stories. "Close Reading" = passage WITH questions. "Assessment" = tests/quizzes.${isTeachingPal ? ' This filename contains "teaching pal" so resource_type MUST be "Teaching Pal".' : ''}
- "subject_area": one of ${JSON.stringify(SUBJECT_AREAS)}
- "grade_levels": array from ["1","2","3","4","5"]
- "topics": 1-4 from ${JSON.stringify(TOPICS)}. ALL Title Case.
- "sub_topics": 1-3 specific sub-topics in Title Case.
- "reading_skills": 1-4 from ${JSON.stringify(READING_SKILLS.slice(0, 15))} (or empty). Title Case.
- "korean_ell_notes": Brief Korean ELL relevance note. Flag: L/R, F/P, V/B, TH challenges, SOV to SVO patterns, missing articles, Korean cognates. Empty if not relevant.
- "standards": 2-6 CCSS codes in SHORT form like "RL.1.1", "L.2.4". No "CCSS.ELA-LITERACY." prefix.
- "difficulty_level": one of ["Below Grade Level","On Grade Level","Above Grade Level","Mixed"]
- "suggested_group": EXACT story title this resource belongs to. Empty if unsure.
- "curriculum": if from Into Reading, use "Into Reading X Module Y". If from Thumbs Up, use "Thumbs Up". Empty if unknown.
- "sort_order": 0=Teaching Pal, 1=Module Opener, 10-19=Story 1, 20-29=Story 2, 30-39=Story 3, 40-49=Story 4, 90+=wrap-up. 0 for non-IR.
- "category": EXACTLY one of: "grammar","reading","writing","phonics","projects","seasonal","assessments","sel","novel_study","misc", or "" for curriculum-specific.
  CRITICAL: grammar = ANY parts of speech, sentence types, punctuation, capitalization. NEVER use "communication","speaking_listening","language","vocabulary".
- "subcategory": be VERY specific (e.g. "Proper Nouns", "Making Inferences", "Personal Narrative", "Short Vowel 'a'"). Empty if not applicable.

Filename: "${filename}" ${bookNum ? `(Book ${bookNum}, Module ${moduleNum})` : ''}
TEXT: ${text.slice(0, 6000)}
Return ONLY valid JSON.`;
}

export function buildStoryProfilePrompt(text: string, title: string, curriculum: string): string {
  return `Analyze this reading passage for elementary teachers with ELL advanced students who can handle challenge. Return ONLY valid JSON.

{
  "title": "story title",
  "author": "author or empty string",
  "authors_purpose": "inform, entertain, persuade, or describe",
  "genre": "e.g. Realistic Fiction, Informational Text, Fantasy, Poetry, Fable",
  "summary": "2-3 sentence summary",
  "themes": ["theme1", "theme2", "theme3"],
  "grade_levels": ["1","2"],
  "reading_skills": ["skill1", "skill2", "skill3", "skill4"],
  "standards": ["RL.1.1", "RL.1.2", "RL.1.3", "L.1.4"],
  "vocabulary": [
    {"word": "w1", "definition": "student-friendly definition a child can understand", "tier": "Tier 2"},
    {"word": "w2", "definition": "student-friendly definition a child can understand", "tier": "Tier 3"}
  ],
  "questions": [
    {"question": "q text", "type": "multiple_choice", "dok": 1, "choices": ["a","b","c","d"], "answer": "A"},
    {"question": "q text", "type": "short_answer", "dok": 2, "answer": "model answer"}
  ],
  "writing_prompts": [
    {"genre": "Narrative", "prompt": "prompt text"},
    {"genre": "Informative", "prompt": "prompt text"},
    {"genre": "Opinion", "prompt": "prompt text"}
  ],
  "differentiation": {
    "below_level": ["strategy1", "strategy2"],
    "above_level": ["strategy1", "strategy2"],
    "ell_supports": ["strategy1", "strategy2"]
  },
  "grammar_connections": ["Grammar patterns in Title Case"],
  "phonics_connections": ["Use format: 'Long Vowel ee', 'R-Controlled Vowel ar', 'Digraph th'. FLAG Korean L1 challenges: L/R, F/P, V/B, TH"],
  "writing_connections": ["Writing skills in Title Case"],
  "korean_ell_connections": {
    "phonics_alerts": ["Words with sounds Korean speakers struggle with - L/R, F/P, V/B, TH, final clusters"],
    "grammar_alerts": ["Language patterns relevant to Korean transfer: articles, prepositions, SVO order"],
    "cultural_connections": ["Cultural bridges to Korean students"],
    "sentence_focus": ["Key sentence patterns for explicit instruction"]
  }
}

Rules:
- vocabulary: 8-10 words, Tier 2 and Tier 3. Definitions MUST be student-friendly.
- questions: 8-10 questions, mix of multiple_choice and short_answer, DOK 1-3.
- writing_prompts: 3 prompts (Narrative, Informative, Opinion)
- reading_skills from: ${JSON.stringify(READING_SKILLS.slice(0, 15))}
- themes should be searchable keywords
- All content grade-appropriate but challenging for advanced ELL students
- curriculum: "${curriculum}"

Title: "${title}"
TEXT: ${text.slice(0, 5000)}
Return ONLY valid JSON, no markdown.`;
}

export function postProcessAnalysis(result: any, filename: string, bookNum: number, moduleNum: number): any {
  const fnLower = filename.toLowerCase();
  const isTeachingPal = fnLower.includes('teaching pal') || fnLower.includes('teaching_pal');
  const isModuleOpener = fnLower.includes('module opener') || fnLower.includes('module introduction');

  // Force Teaching Pal type
  if (isTeachingPal) {
    result.resource_type = 'Teaching Pal';
    result.sort_order = 0;
    result.story_title = '';
    result.suggested_group = '';
  }

  // Force module opener sorting
  if (isModuleOpener) {
    result.sort_order = 1;
  }

  // Fix curriculum
  if (bookNum > 0) {
    result.curriculum = result.curriculum || `Into Reading ${bookNum} Module ${moduleNum}`;
    result.book_num = bookNum;
    result.module_num = moduleNum;
  }

  // Sync suggested_group with story_title
  if (result.story_title) {
    result.suggested_group = result.story_title;
  }

  // Validate and fix category
  const cat = (result.category || '').toLowerCase().trim();
  const allText = `${result.title || ''} ${result.summary || ''} ${result.subcategory || ''}`.toLowerCase();
  
  const isGrammar = GRAMMAR_KEYWORDS.some(kw => allText.includes(kw));
  if (isGrammar && cat !== 'grammar') {
    result.category = 'grammar';
  } else if (cat && !VALID_CATEGORIES.includes(cat)) {
    result.category = CATEGORY_FIX_MAP[cat] || 'misc';
  }

  return result;
}

export function cleanJsonResponse(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  
  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}
  
  // Try to recover truncated JSON by closing open structures
  let attempt = cleaned;
  // Remove trailing incomplete string (unterminated quote)
  attempt = attempt.replace(/,\s*"[^"]*$/, '');
  attempt = attempt.replace(/:\s*"[^"]*$/, ': ""');
  
  // Count open braces/brackets and close them
  let openBraces = 0, openBrackets = 0;
  let inString = false, escaped = false;
  for (const ch of attempt) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    if (ch === '}') openBraces--;
    if (ch === '[') openBrackets++;
    if (ch === ']') openBrackets--;
  }
  
  // Remove trailing comma before closing
  attempt = attempt.replace(/,\s*$/, '');
  
  for (let i = 0; i < openBrackets; i++) attempt += ']';
  for (let i = 0; i < openBraces; i++) attempt += '}';
  
  try { return JSON.parse(attempt); } catch {}
  
  // Last resort - try to extract any valid JSON object
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  
  return { title: 'Parse Error', error: 'AI response was truncated. Try again.' };
}
