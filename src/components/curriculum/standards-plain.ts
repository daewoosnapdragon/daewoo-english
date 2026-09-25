// ─── Standards in plain language ─────────────────────────────────
// A teacher-facing name for every CCSS code in ccss-standards.ts, and a skill
// family for each standard number (RL.3 is "characters, setting, events" in
// every grade) with the words teachers actually type when searching. The
// official text and code stay as the reference; this layer is how you find
// them. Draft for review: change any name here and the picker follows.

export interface SkillFamily { group: string; name: string; synonyms: string[] }

/** Browse groups, in the order the picker shows them. */
export const SKILL_GROUPS = [
  'Reading stories', 'Reading information', 'Phonics and word reading', 'Fluency',
  'Writing', 'Speaking and listening', 'Grammar', 'Capitals, punctuation, spelling', 'Vocabulary and word meaning',
]

/** Keyed by domain and standard number: "RL.3", "L.2", "RF.4". */
export const SKILLS: Record<string, SkillFamily> = {
  'RL.1': { group: 'Reading stories', name: 'Ask and answer questions about a story', synonyms: ['questions', 'key details', 'evidence', 'comprehension', 'who what where when why', 'infer', 'quote'] },
  'RL.2': { group: 'Reading stories', name: 'Retell, central message, theme', synonyms: ['retell', 'message', 'lesson', 'moral', 'theme', 'summarize', 'summary', 'fable', 'folktale'] },
  'RL.3': { group: 'Reading stories', name: 'Characters, setting, events', synonyms: ['character', 'characters', 'traits', 'feelings', 'motivation', 'setting', 'plot', 'events', 'problem', 'solution', 'respond'] },
  'RL.4': { group: 'Reading stories', name: 'Words and phrases in stories', synonyms: ['words', 'meaning', 'rhythm', 'rhyme', 'sensory', 'figurative', 'metaphor', 'simile', 'feeling words', 'vocabulary in context'] },
  'RL.5': { group: 'Reading stories', name: 'How stories, poems and plays are built', synonyms: ['structure', 'story parts', 'beginning middle end', 'chapter', 'scene', 'stanza', 'poem', 'drama', 'play', 'genre', 'types of texts'] },
  'RL.6': { group: 'Reading stories', name: 'Point of view and narrator', synonyms: ['point of view', 'narrator', 'first person', 'third person', 'who is telling', 'author', 'illustrator', 'voice', 'dialogue'] },
  'RL.7': { group: 'Reading stories', name: 'Pictures and the story', synonyms: ['illustrations', 'pictures', 'images', 'mood', 'visual', 'multimedia', 'film', 'graphic novel'] },
  'RL.9': { group: 'Reading stories', name: 'Comparing stories', synonyms: ['compare', 'contrast', 'same author', 'versions', 'series', 'themes', 'genres', 'similar', 'different'] },
  'RL.10': { group: 'Reading stories', name: 'Reading stories at grade level', synonyms: ['reading level', 'grade level text', 'independent reading', 'complexity', 'range'] },

  'RI.1': { group: 'Reading information', name: 'Ask and answer questions about information', synonyms: ['questions', 'key details', 'evidence', 'nonfiction', 'facts', 'infer', 'quote'] },
  'RI.2': { group: 'Reading information', name: 'Main idea and details', synonyms: ['main idea', 'main topic', 'key details', 'summarize', 'summary', 'supporting details', 'gist'] },
  'RI.3': { group: 'Reading information', name: 'Connections between ideas, events and people', synonyms: ['connections', 'relationship', 'cause and effect', 'sequence', 'steps', 'history', 'science', 'events', 'ideas'] },
  'RI.4': { group: 'Reading information', name: 'Words in informational text', synonyms: ['vocabulary', 'academic words', 'domain words', 'meaning', 'context clues', 'unknown words', 'glossary'] },
  'RI.5': { group: 'Reading information', name: 'Text features and structure', synonyms: ['text features', 'headings', 'captions', 'bold', 'table of contents', 'glossary', 'index', 'structure', 'compare contrast', 'cause effect', 'chronology', 'search tools'] },
  'RI.6': { group: 'Reading information', name: 'Author’s purpose and point of view', synonyms: ['author purpose', 'point of view', 'why the author wrote', 'firsthand', 'secondhand', 'accounts', 'perspective'] },
  'RI.7': { group: 'Reading information', name: 'Pictures, diagrams and charts', synonyms: ['diagram', 'chart', 'map', 'graph', 'photo', 'illustration', 'visual', 'timeline', 'multimedia', 'digital sources'] },
  'RI.8': { group: 'Reading information', name: 'Reasons and evidence', synonyms: ['reasons', 'evidence', 'support', 'argument', 'claim', 'points', 'how the author supports'] },
  'RI.9': { group: 'Reading information', name: 'Comparing two texts on a topic', synonyms: ['compare', 'contrast', 'two texts', 'integrate', 'same topic', 'sources'] },
  'RI.10': { group: 'Reading information', name: 'Reading informational text at grade level', synonyms: ['reading level', 'grade level text', 'independent reading', 'nonfiction', 'range'] },

  'RF.1': { group: 'Phonics and word reading', name: 'How print works', synonyms: ['print concepts', 'left to right', 'letters', 'alphabet', 'words and spaces', 'sentence', 'capital', 'book handling'] },
  'RF.2': { group: 'Phonics and word reading', name: 'Sounds in words', synonyms: ['phonological awareness', 'phonemic', 'rhyme', 'syllables', 'blend', 'segment', 'sounds', 'onset rime', 'vowel sounds', 'beginning sound', 'ending sound'] },
  'RF.3': { group: 'Phonics and word reading', name: 'Phonics and decoding', synonyms: ['phonics', 'decode', 'decoding', 'sound out', 'digraph', 'blend', 'vowel', 'vowel team', 'long vowel', 'short vowel', 'silent e', 'syllable', 'prefix', 'suffix', 'sight words', 'irregular words', 'multisyllable', 'word reading'] },
  'RF.4': { group: 'Fluency', name: 'Reading fluently', synonyms: ['fluency', 'cwpm', 'rate', 'accuracy', 'expression', 'prosody', 'read aloud', 'self-correct', 'reread', 'context'] },

  'W.1': { group: 'Writing', name: 'Opinion writing', synonyms: ['opinion', 'persuasive', 'argument', 'reasons', 'because', 'point of view', 'convince', 'letter'] },
  'W.2': { group: 'Writing', name: 'Informative writing', synonyms: ['informative', 'explanatory', 'report', 'facts', 'how-to', 'explain', 'topic', 'nonfiction writing', 'all about'] },
  'W.3': { group: 'Writing', name: 'Narrative writing', synonyms: ['narrative', 'story', 'personal narrative', 'sequence', 'events', 'beginning middle end', 'small moment', 'dialogue', 'description'] },
  'W.4': { group: 'Writing', name: 'Clear writing for the task', synonyms: ['organization', 'purpose', 'audience', 'task', 'clear', 'development'] },
  'W.5': { group: 'Writing', name: 'Planning, revising, editing', synonyms: ['writing process', 'plan', 'revise', 'edit', 'draft', 'feedback', 'peer', 'strengthen'] },
  'W.6': { group: 'Writing', name: 'Writing with technology', synonyms: ['technology', 'typing', 'keyboard', 'digital', 'publish', 'computer', 'collaborate'] },
  'W.7': { group: 'Writing', name: 'Research projects', synonyms: ['research', 'project', 'investigate', 'shared research', 'sources', 'topic'] },
  'W.8': { group: 'Writing', name: 'Gathering and recalling information', synonyms: ['gather', 'recall', 'notes', 'sources', 'experience', 'information', 'answer a question'] },
  'W.9': { group: 'Writing', name: 'Using evidence from texts in writing', synonyms: ['evidence', 'text-based', 'reading response', 'analysis', 'support', 'cite'] },
  'W.10': { group: 'Writing', name: 'Writing regularly, short and long', synonyms: ['writing routine', 'extended', 'short', 'time frames', 'range'] },

  'SL.1': { group: 'Speaking and listening', name: 'Discussions and conversations', synonyms: ['discussion', 'conversation', 'partner', 'group', 'turn taking', 'listening', 'rules', 'collaborate', 'build on', 'ask questions'] },
  'SL.2': { group: 'Speaking and listening', name: 'Understanding what is read aloud or shown', synonyms: ['listening comprehension', 'read aloud', 'media', 'video', 'recount', 'paraphrase', 'key ideas', 'details'] },
  'SL.3': { group: 'Speaking and listening', name: 'Asking a speaker questions', synonyms: ['questions', 'speaker', 'clarify', 'ask', 'answer', 'elaborate', 'reasons and evidence'] },
  'SL.4': { group: 'Speaking and listening', name: 'Presenting and telling', synonyms: ['presentation', 'present', 'tell a story', 'recount', 'describe', 'report', 'speak clearly', 'facts and details', 'volume', 'pace'] },
  'SL.5': { group: 'Speaking and listening', name: 'Visuals and recordings in presentations', synonyms: ['visual', 'drawings', 'pictures', 'audio', 'recording', 'display', 'multimedia', 'poster'] },
  'SL.6': { group: 'Speaking and listening', name: 'Speaking clearly in complete sentences', synonyms: ['complete sentences', 'speak clearly', 'formal', 'informal', 'audible', 'register'] },

  'L.1': { group: 'Grammar', name: 'Grammar', synonyms: ['grammar', 'nouns', 'verbs', 'adjectives', 'adverbs', 'pronouns', 'plural', 'tense', 'past tense', 'sentences', 'subject verb', 'agreement', 'conjunctions', 'prepositions', 'fragments', 'run-ons'] },
  'L.2': { group: 'Capitals, punctuation, spelling', name: 'Capitals, punctuation, spelling', synonyms: ['capitalization', 'capitals', 'punctuation', 'period', 'comma', 'question mark', 'apostrophe', 'quotation marks', 'dialogue', 'spelling', 'spell', 'contractions', 'possessive', 'titles'] },
  'L.3': { group: 'Vocabulary and word meaning', name: 'Choosing words and style', synonyms: ['word choice', 'formal', 'informal', 'style', 'effect', 'compare languages', 'dialect', 'register', 'precise words'] },
  'L.4': { group: 'Vocabulary and word meaning', name: 'Working out unknown words', synonyms: ['context clues', 'unknown words', 'prefix', 'suffix', 'root', 'affix', 'dictionary', 'glossary', 'multiple meaning', 'vocabulary'] },
  'L.5': { group: 'Vocabulary and word meaning', name: 'Word relationships and figurative language', synonyms: ['synonyms', 'antonyms', 'shades of meaning', 'categories', 'figurative', 'idiom', 'simile', 'metaphor', 'literal', 'nonliteral', 'word relationships', 'sorting words'] },
  'L.6': { group: 'Vocabulary and word meaning', name: 'Using new vocabulary', synonyms: ['vocabulary', 'academic words', 'new words', 'use words', 'conversation words', 'domain-specific', 'signal words'] },
}

/** A plain name for each code. Sub-standards (L.3.1a) are named too. */
export const PLAIN: Record<string, string> = {
  // ── Kindergarten ──
  'RL.K.1': 'Ask and answer questions about a story, with help', 'RL.K.2': 'Retell a familiar story, with help', 'RL.K.3': 'Name the characters, setting and main events, with help',
  'RL.K.4': 'Ask about words you don’t know in a story', 'RL.K.5': 'Tell a storybook from a poem', 'RL.K.6': 'Name the author and illustrator and what each does',
  'RL.K.7': 'Say how the pictures go with the story', 'RL.K.9': 'Compare characters’ adventures in familiar stories', 'RL.K.10': 'Join in group reading of stories',
  'RI.K.1': 'Ask and answer questions about an information book, with help', 'RI.K.2': 'Name the topic and retell key details, with help', 'RI.K.3': 'Connect two people, events or ideas in a text',
  'RI.K.4': 'Ask about words you don’t know in an information book', 'RI.K.5': 'Point to the front cover, back cover and title page', 'RI.K.6': 'Name the author and illustrator of an information book',
  'RI.K.7': 'Say how the pictures go with the words', 'RI.K.8': 'Find the reasons an author gives', 'RI.K.9': 'Compare two books on the same topic', 'RI.K.10': 'Join in group reading of information books',
  'RF.K.1': 'Know how print works: left to right, letters make words', 'RF.K.2': 'Hear rhymes, syllables and sounds in spoken words', 'RF.K.3': 'Know letter sounds and read simple words', 'RF.K.4': 'Read simple books with purpose',
  'W.K.1': 'Draw, tell or write an opinion about a book or topic', 'W.K.2': 'Draw, tell or write to explain a topic', 'W.K.3': 'Draw, tell or write about something that happened',
  'W.K.5': 'Add details to writing with help from others', 'W.K.6': 'Use a computer or tablet to make writing, with help', 'W.K.7': 'Join in a shared research project', 'W.K.8': 'Recall or find information to answer a question, with help',
  'SL.K.1': 'Take turns and follow rules in a conversation', 'SL.K.2': 'Ask and answer about a read-aloud or video', 'SL.K.3': 'Ask and answer questions to get help or information',
  'SL.K.4': 'Describe people, places, things and events', 'SL.K.5': 'Add drawings to what you say', 'SL.K.6': 'Speak clearly so others understand',
  'L.K.1': 'Use basic grammar when speaking and writing', 'L.K.2': 'Use capitals, end marks and letter sounds to spell', 'L.K.4': 'Work out new words and word endings', 'L.K.5': 'Sort words and explore what they mean', 'L.K.6': 'Use new words from books and talk',

  // ── Grade 1 ──
  'RL.1.1': 'Ask and answer questions about key details in a story', 'RL.1.2': 'Retell a story and say its lesson', 'RL.1.3': 'Describe characters, setting and main events',
  'RL.1.4': 'Find words that show feelings or appeal to the senses', 'RL.1.5': 'Tell a story book from an information book', 'RL.1.6': 'Say who is telling the story',
  'RL.1.7': 'Use pictures and words to describe characters, setting and events', 'RL.1.9': 'Compare characters’ adventures across stories', 'RL.1.10': 'Read grade 1 stories and poems with support',
  'RI.1.1': 'Ask and answer questions about key details in a text', 'RI.1.2': 'Name the main topic and retell key details', 'RI.1.3': 'Connect two people, events or ideas in a text',
  'RI.1.4': 'Ask and answer about unknown words in a text', 'RI.1.5': 'Use headings, tables of contents, glossaries and menus', 'RI.1.6': 'Tell pictures from words as sources of information',
  'RI.1.7': 'Use the pictures and details to describe key ideas', 'RI.1.8': 'Find the reasons an author gives for points', 'RI.1.9': 'Compare two texts on the same topic', 'RI.1.10': 'Read grade 1 information books with support',
  'RF.1.1': 'Know a sentence starts with a capital and ends with a mark', 'RF.1.2': 'Hear and work with the sounds in spoken words', 'RF.1.3': 'Use phonics to read words', 'RF.1.4': 'Read grade 1 books fluently',
  'RF.1.2a': 'Hear long and short vowel sounds', 'RF.1.2b': 'Blend sounds into a word', 'RF.1.2c': 'Say the first, middle and last sound in a word', 'RF.1.2d': 'Break a word into its sounds',
  'RF.1.3a': 'Read consonant digraphs (sh, ch, th)', 'RF.1.3b': 'Sound out one-syllable words', 'RF.1.3c': 'Silent e and vowel teams make long vowels', 'RF.1.3d': 'Every syllable has a vowel sound',
  'RF.1.3e': 'Read two-syllable words by breaking them up', 'RF.1.3f': 'Read words with -s, -ed, -ing endings', 'RF.1.3g': 'Read irregular sight words',
  'RF.1.4a': 'Read with purpose and understanding', 'RF.1.4b': 'Read aloud accurately, at a good pace, with expression', 'RF.1.4c': 'Use context to check and fix reading',
  'W.1.1': 'Write an opinion with a reason and a closing', 'W.1.2': 'Write facts about a topic with a closing', 'W.1.3': 'Write about two or more events in order, with a closing',
  'W.1.5': 'Add details and improve writing with help', 'W.1.6': 'Use digital tools to publish writing, with help', 'W.1.7': 'Join a shared research project', 'W.1.8': 'Recall or gather information to answer a question',
  'SL.1.1': 'Have a conversation: take turns, listen, ask questions', 'SL.1.2': 'Ask and answer about a read-aloud or video', 'SL.1.3': 'Ask questions to understand a speaker',
  'SL.1.4': 'Describe people, places, things and events with details', 'SL.1.5': 'Add drawings or visuals to a description', 'SL.1.6': 'Speak in complete sentences',
  'L.1.1': 'Use grade 1 grammar when speaking and writing', 'L.1.2': 'Use capitals, punctuation and spelling in writing', 'L.1.4': 'Work out word meanings from context and endings',
  'L.1.5': 'Sort words and understand shades of meaning', 'L.1.6': 'Use new words, including joining words like because',
  'L.1.1a': 'Print all letters, upper and lower case', 'L.1.1b': 'Common, proper and possessive nouns', 'L.1.1c': 'Singular and plural nouns with matching verbs', 'L.1.1d': 'Pronouns (I, me, my, they, them, anyone)',
  'L.1.1e': 'Verbs for past, present and future', 'L.1.1f': 'Common adjectives', 'L.1.1g': 'Joining words (and, but, or, so, because)', 'L.1.1h': 'Words like a, the, this, that',
  'L.1.1i': 'Prepositions (during, beyond, toward)', 'L.1.1j': 'Write complete simple and compound sentences',
  'L.1.2a': 'Capitalize dates and people’s names', 'L.1.2b': 'End punctuation', 'L.1.2c': 'Commas in dates and lists', 'L.1.2d': 'Spell words with common patterns and sight words', 'L.1.2e': 'Spell new words by their sounds',

  // ── Grade 2 ──
  'RL.2.1': 'Ask and answer who, what, where, when, why, how about a story', 'RL.2.2': 'Retell stories and fables and give the lesson', 'RL.2.3': 'Describe how characters respond to events',
  'RL.2.4': 'Notice how words give rhythm and meaning (rhyme, repetition)', 'RL.2.5': 'Describe how a story begins and ends', 'RL.2.6': 'Read dialogue with different characters’ voices',
  'RL.2.7': 'Use pictures and words to understand characters and plot', 'RL.2.9': 'Compare two versions of the same story', 'RL.2.10': 'Read grade 2 stories and poems',
  'RI.2.1': 'Ask and answer who, what, where, when, why, how about a text', 'RI.2.2': 'Find the main topic of a text and of each paragraph', 'RI.2.3': 'Connect events, ideas or steps in a text',
  'RI.2.4': 'Work out the meaning of words in a grade 2 text', 'RI.2.5': 'Use captions, bold print, glossaries, indexes and menus', 'RI.2.6': 'Say what the author wants to answer, explain or describe',
  'RI.2.7': 'Explain how a diagram or picture adds to the text', 'RI.2.8': 'Describe how reasons support the author’s points', 'RI.2.9': 'Compare the key points of two texts on a topic', 'RI.2.10': 'Read grade 2 information books',
  'RF.2.3': 'Use phonics to read words', 'RF.2.4': 'Read grade 2 books fluently',
  'RF.2.3a': 'Long and short vowels in one-syllable words', 'RF.2.3b': 'Common vowel teams', 'RF.2.3c': 'Two-syllable words with long vowels', 'RF.2.3d': 'Words with prefixes and suffixes',
  'RF.2.3e': 'Tricky but common spellings', 'RF.2.3f': 'Read irregular sight words',
  'RF.2.4a': 'Read with purpose and understanding', 'RF.2.4b': 'Read aloud accurately, at a good pace, with expression', 'RF.2.4c': 'Use context to check and fix reading',
  'W.2.1': 'Write an opinion with reasons, linking words and a closing', 'W.2.2': 'Write to explain a topic with facts and a closing', 'W.2.3': 'Write a story with details, order words and a closing',
  'W.2.5': 'Revise and edit writing with help', 'W.2.6': 'Use digital tools to publish writing', 'W.2.7': 'Join a shared research project', 'W.2.8': 'Recall or gather information to answer a question',
  'SL.2.1': 'Have a conversation: take turns, build on others, ask for help', 'SL.2.2': 'Recount key ideas from a read-aloud or video', 'SL.2.3': 'Ask and answer questions to understand a speaker',
  'SL.2.4': 'Tell a story or recount with details, speaking clearly', 'SL.2.5': 'Add recordings or drawings to a presentation', 'SL.2.6': 'Speak in complete sentences when needed',
  'L.2.1': 'Use grade 2 grammar when speaking and writing', 'L.2.2': 'Use capitals, punctuation and spelling in writing', 'L.2.3': 'Compare formal and informal English',
  'L.2.4': 'Work out word meanings from context, prefixes, roots and compounds', 'L.2.5': 'Understand word relationships and shades of meaning', 'L.2.6': 'Use new words, including adjectives and adverbs',
  'L.2.1a': 'Collective nouns (group, team)', 'L.2.1b': 'Irregular plurals (feet, children, mice)', 'L.2.1c': 'Reflexive pronouns (myself, ourselves)', 'L.2.1d': 'Irregular past tense verbs (sat, hid, told)',
  'L.2.1e': 'Adjectives and adverbs', 'L.2.1f': 'Write and expand simple and compound sentences',
  'L.2.2a': 'Capitalize holidays, product names and place names', 'L.2.2b': 'Commas in letter greetings and closings', 'L.2.2c': 'Apostrophes in contractions and possessives', 'L.2.2d': 'Use spelling patterns to spell words',

  // ── Grade 3 ──
  'RL.3.1': 'Ask and answer questions using the text as evidence', 'RL.3.2': 'Retell a story and explain its central message', 'RL.3.3': 'Describe characters and how their actions move the story',
  'RL.3.4': 'Tell literal from nonliteral word meanings', 'RL.3.5': 'Use chapter, scene and stanza to talk about a text', 'RL.3.6': 'Tell your own point of view from the narrator’s or a character’s',
  'RL.3.7': 'Explain how pictures add to the story (mood, character, setting)', 'RL.3.9': 'Compare stories by the same author about the same characters', 'RL.3.10': 'Read grade 3 stories, plays and poems',
  'RI.3.1': 'Ask and answer questions using the text as evidence', 'RI.3.2': 'Find the main idea and the details that support it', 'RI.3.3': 'Explain how events, ideas or steps connect (time, sequence, cause)',
  'RI.3.4': 'Work out academic and topic words in a grade 3 text', 'RI.3.5': 'Use text features and search tools to find information', 'RI.3.6': 'Tell your own point of view from the author’s',
  'RI.3.7': 'Use maps, photos and diagrams to understand the text', 'RI.3.8': 'Explain how sentences and paragraphs connect', 'RI.3.9': 'Compare the key points of two texts on a topic', 'RI.3.10': 'Read grade 3 informational text',
  'RF.3.3': 'Use phonics and word parts to read words', 'RF.3.4': 'Read grade 3 text fluently',
  'RF.3.3a': 'Common prefixes and suffixes', 'RF.3.3b': 'Latin suffixes (-tion, -able)', 'RF.3.3c': 'Multisyllable words', 'RF.3.3d': 'Read irregular words',
  'RF.3.4a': 'Read with purpose and understanding', 'RF.3.4b': 'Read aloud accurately, at a good pace, with expression', 'RF.3.4c': 'Use context to check and fix reading',
  'W.3.1': 'Write an opinion with reasons, linking words and a conclusion', 'W.3.2': 'Write to explain a topic with facts, definitions and a conclusion', 'W.3.3': 'Write a story with dialogue, description and order words',
  'W.3.4': 'Organize writing to fit the task and purpose', 'W.3.5': 'Plan, revise and edit with guidance', 'W.3.6': 'Use technology to write and work with others', 'W.3.7': 'Do a short research project',
  'W.3.8': 'Take notes from experiences and sources', 'W.3.10': 'Write for short and long stretches',
  'SL.3.1': 'Take part in discussions: prepare, follow rules, build on ideas', 'SL.3.2': 'Find the main ideas and details of a read-aloud or video', 'SL.3.3': 'Ask and answer questions about a speaker',
  'SL.3.4': 'Report or tell a story with facts and details, at a good pace', 'SL.3.5': 'Add recordings or visuals to a presentation', 'SL.3.6': 'Speak in complete sentences to give detail',
  'L.3.1': 'Use grade 3 grammar when speaking and writing', 'L.3.2': 'Use capitals, punctuation and spelling in writing', 'L.3.3': 'Choose words for effect; spoken vs written English',
  'L.3.4': 'Work out word meanings from context, affixes, roots and glossaries', 'L.3.5': 'Literal and nonliteral meanings, word relationships, shades of meaning', 'L.3.6': 'Use new academic and topic words',
  'L.3.1a': 'What nouns, pronouns, verbs, adjectives and adverbs do', 'L.3.1b': 'Regular and irregular plural nouns', 'L.3.1c': 'Abstract nouns (childhood)', 'L.3.1d': 'Regular and irregular verbs',
  'L.3.1e': 'Past, present and future verb tenses', 'L.3.1f': 'Subject-verb and pronoun agreement', 'L.3.1g': 'Comparatives and superlatives (-er, -est)', 'L.3.1h': 'Joining words (and, but, because, although)',
  'L.3.1i': 'Simple, compound and complex sentences',
  'L.3.2a': 'Capitalize words in titles', 'L.3.2b': 'Commas in addresses', 'L.3.2c': 'Commas and quotation marks in dialogue', 'L.3.2d': 'Possessives (’s, s’)',
  'L.3.2e': 'Spell high-frequency words and suffixes', 'L.3.2f': 'Use spelling patterns and word families',

  // ── Grade 4 ──
  'RL.4.1': 'Explain what the text says and infer, using details and examples', 'RL.4.2': 'Find the theme and summarize the story', 'RL.4.3': 'Describe a character, setting or event in depth using details',
  'RL.4.4': 'Work out words and phrases, including from myths', 'RL.4.5': 'Explain differences between poems, drama and prose', 'RL.4.6': 'Compare first-person and third-person narration',
  'RL.4.7': 'Connect a text to its picture, film or stage version', 'RL.4.9': 'Compare themes and patterns across stories and cultures', 'RL.4.10': 'Read grade 4 stories, plays and poems',
  'RI.4.1': 'Explain what the text says and infer, using details and examples', 'RI.4.2': 'Find the main idea, explain the support, summarize', 'RI.4.3': 'Explain events, ideas or steps using the text',
  'RI.4.4': 'Work out academic and topic words in a grade 4 text', 'RI.4.5': 'Describe text structure (chronology, comparison, cause and effect, problem and solution)', 'RI.4.6': 'Compare firsthand and secondhand accounts',
  'RI.4.7': 'Use charts, graphs, diagrams and timelines to understand a text', 'RI.4.8': 'Explain how an author uses reasons and evidence', 'RI.4.9': 'Combine information from two texts on a topic', 'RI.4.10': 'Read grade 4 informational text',
  'RF.4.3': 'Use phonics and word parts to read words', 'RF.4.4': 'Read grade 4 text fluently',
  'RF.4.3a': 'Read unfamiliar multisyllable words using sounds, syllables and word parts',
  'RF.4.4a': 'Read with purpose and understanding', 'RF.4.4b': 'Read aloud accurately, at a good pace, with expression', 'RF.4.4c': 'Use context to check and fix reading',
  'W.4.1': 'Write an opinion with organized reasons, facts and a conclusion', 'W.4.2': 'Write to explain with headings, facts, quotations and a conclusion', 'W.4.3': 'Write a story with dialogue, description, sensory details and a conclusion',
  'W.4.4': 'Write clearly for the task, purpose and audience', 'W.4.5': 'Plan, revise and edit with guidance', 'W.4.6': 'Use technology to write and type a page in one sitting', 'W.4.7': 'Do a short research project on a topic',
  'W.4.8': 'Take notes, sort information and list sources', 'W.4.9': 'Use evidence from stories and informational text in writing', 'W.4.10': 'Write for short and long stretches',
  'SL.4.1': 'Take part in discussions: prepare, follow rules, pose and respond to questions', 'SL.4.2': 'Paraphrase a read-aloud or video', 'SL.4.3': 'Identify a speaker’s reasons and evidence',
  'SL.4.4': 'Report or tell a story in an organized way with facts and details', 'SL.4.5': 'Add audio or visuals to support a presentation', 'SL.4.6': 'Choose formal or informal English for the situation',
  'L.4.1': 'Use grade 4 grammar when speaking and writing', 'L.4.2': 'Use capitals, punctuation and spelling in writing', 'L.4.3': 'Choose precise words and punctuation for effect',
  'L.4.4': 'Work out word meanings from context, Greek and Latin roots, and references', 'L.4.5': 'Similes, metaphors, idioms, synonyms and antonyms', 'L.4.6': 'Use precise academic and topic words',
  'L.4.1a': 'Relative pronouns and adverbs (who, which, where)', 'L.4.1b': 'Progressive tenses (was walking)', 'L.4.1c': 'Modal verbs (can, may, must)', 'L.4.1d': 'Order adjectives correctly',
  'L.4.1e': 'Prepositional phrases', 'L.4.1f': 'Complete sentences; fix fragments and run-ons', 'L.4.1g': 'Commonly confused words (to, too, two)',
  'L.4.2a': 'Use capitals correctly', 'L.4.2b': 'Commas and quotation marks for speech and quotations', 'L.4.2c': 'Comma before and, but, or in compound sentences', 'L.4.2d': 'Spell grade 4 words, using references',

  // ── Grade 5 ──
  'RL.5.1': 'Quote the text accurately to explain and infer', 'RL.5.2': 'Find the theme from characters’ responses and summarize', 'RL.5.3': 'Compare characters, settings or events using details',
  'RL.5.4': 'Work out words and phrases, including metaphors and similes', 'RL.5.5': 'Explain how chapters, scenes or stanzas build the structure', 'RL.5.6': 'Describe how the narrator’s point of view shapes the events',
  'RL.5.7': 'Analyze how visuals add meaning, tone or beauty', 'RL.5.9': 'Compare stories in the same genre by theme and topic', 'RL.5.10': 'Read grade 5 stories, plays and poems',
  'RI.5.1': 'Quote the text accurately to explain and infer', 'RI.5.2': 'Find two or more main ideas and their support; summarize', 'RI.5.3': 'Explain relationships between people, events or ideas',
  'RI.5.4': 'Work out academic and topic words in a grade 5 text', 'RI.5.5': 'Compare the structure of two texts', 'RI.5.6': 'Analyze multiple accounts of the same event',
  'RI.5.7': 'Use several print and digital sources to answer a question', 'RI.5.8': 'Explain how reasons and evidence support each point', 'RI.5.9': 'Combine information from several texts', 'RI.5.10': 'Read grade 5 informational text',
  'RF.5.3': 'Use phonics and word parts to read words', 'RF.5.4': 'Read grade 5 text fluently',
  'RF.5.3a': 'Read unfamiliar multisyllable words using sounds, syllables and word parts',
  'RF.5.4a': 'Read with purpose and understanding', 'RF.5.4b': 'Read aloud accurately, at a good pace, with expression', 'RF.5.4c': 'Use context to check and fix reading',
  'W.5.1': 'Write an opinion with logically ordered reasons, evidence and a conclusion', 'W.5.2': 'Write to explain with facts, quotations and a conclusion', 'W.5.3': 'Write a story with dialogue, pacing, sensory details and a conclusion',
  'W.5.4': 'Write clearly for the task, purpose and audience', 'W.5.5': 'Plan, revise, edit, rewrite or try a new approach', 'W.5.6': 'Use technology to write and type two pages in one sitting', 'W.5.7': 'Do a short research project using several sources',
  'W.5.8': 'Summarize notes and list sources', 'W.5.9': 'Use evidence from stories and informational text in writing', 'W.5.10': 'Write for short and long stretches',
  'SL.5.1': 'Take part in discussions: prepare, follow rules, elaborate on others', 'SL.5.2': 'Summarize a read-aloud or video', 'SL.5.3': 'Summarize a speaker’s points and their support',
  'SL.5.4': 'Present a report or opinion with facts and details, at a good pace', 'SL.5.5': 'Include multimedia in a presentation', 'SL.5.6': 'Choose formal or informal English for the situation',
  'L.5.1': 'Use grade 5 grammar when speaking and writing', 'L.5.2': 'Use capitals, punctuation and spelling in writing', 'L.5.3': 'Vary sentences for style; compare dialects and registers',
  'L.5.4': 'Work out word meanings from context, Greek and Latin roots, and references', 'L.5.5': 'Figurative language, idioms, proverbs, synonyms and antonyms', 'L.5.6': 'Use precise academic and topic words, including contrast and addition words',
  'L.5.1a': 'Conjunctions, prepositions and interjections', 'L.5.1b': 'Perfect tenses (had walked, has walked)', 'L.5.1c': 'Use verb tense to show time and sequence', 'L.5.1d': 'Avoid shifting verb tense',
  'L.5.1e': 'Paired conjunctions (either/or, neither/nor)',
  'L.5.2a': 'Punctuate items in a series', 'L.5.2b': 'Comma after an introductory phrase', 'L.5.2c': 'Commas for yes, no, tag questions and names', 'L.5.2d': 'Underline, italicize or quote titles', 'L.5.2e': 'Spell grade 5 words, using references',
}

/** "RL.3.3" → "RL.3"; "L.3.1a" → "L.1"; "RF.1.2a" → "RF.2". */
export function familyOf(code: string): string {
  const m = /^([A-Z]+)\.(K|\d)\.(\d+)/.exec(code)
  return m ? `${m[1]}.${m[3]}` : code
}
export function plainName(code: string): string { return PLAIN[code] || SKILLS[familyOf(code)]?.name || code }
export function skillOf(code: string): SkillFamily | undefined { return SKILLS[familyOf(code)] }
