// Writing Rubrics for the Primary Grades - Kid-Friendly
// Extracted from actual PDF rubric pack
// 4-point scale: 1=Needs Guidance, 2=Developing Skills, 3=Meets Standards, 4=Exceeds Standards
// Organized by category (not grade) - teachers pick the rubric that fits their assignment

export interface ScoringRubric {
  name: string
  category: string
  domain: 'writing' | 'reading' | 'speaking'
  grades: number[]
  criteria: { label: string; description: string }[]
}

export const SCORING_RUBRICS: ScoringRubric[] = [

  // ═══ GENERAL WRITING (pages 3-11) ═══

  { name: 'General Writing (6 criteria)', category: 'General', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Punctuation', description: 'Uses appropriate punctuation.' },
      { label: 'Spelling', description: 'Writes some sight words correctly and uses best guess spelling.' },
      { label: 'Capitalization', description: 'Uses capital letter to begin sentences and for names.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Uses subject/verb agreement.' },
      { label: 'Content/Ideas', description: 'Brainstorms ideas. Stays on topic and adds some detail.' },
      { label: 'Neatness', description: 'Uses nice handwriting and has spaces between words.' },
    ] },

  { name: 'General Writing (5 criteria)', category: 'General', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Punctuation', description: 'Uses appropriate punctuation.' },
      { label: 'Spelling', description: 'Writes some sight words correctly and uses best guess spelling.' },
      { label: 'Capitalization', description: 'Uses capital letter to begin sentences and for names.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Uses subject/verb agreement.' },
      { label: 'Content/Ideas', description: 'Brainstorms ideas. Stays on topic and adds some detail.' },
    ] },

  { name: 'General Writing + Organization', category: 'General', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Punctuation', description: 'Uses appropriate punctuation.' },
      { label: 'Spelling', description: 'Writes some sight words correctly and uses best guess spelling.' },
      { label: 'Capitalization', description: 'Uses capital letter to begin sentences and for names.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Uses subject/verb agreement.' },
      { label: 'Content/Ideas', description: 'Brainstorms ideas. Stays on topic and adds some detail.' },
      { label: 'Organization', description: 'Story has a beginning, middle and end.' },
    ] },

  { name: 'General Writing – Full Traits (A)', category: 'General', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation. Uses a capital letter when appropriate.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns to sound out words.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has details. Able to brainstorm ideas.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Sentences are complete and make sense. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Has two or more sequenced events.' },
      { label: 'Style and Voice', description: 'Shows own personality.' },
    ] },

  { name: 'General Writing – Full Traits (B)', category: 'General', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation. Uses a capital letter when appropriate.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns to sound out words.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has interesting details. "Shows" reader using descriptive detail.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Events are sequenced and make sense. Has opening and closing.' },
      { label: 'Style and Voice', description: 'Shows own personality and uses interesting words.' },
    ] },

  { name: 'General Writing – Advanced Traits', category: 'General', domain: 'writing', grades: [3, 4],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capitals. Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Organization', description: 'Uses transitional words. Events are sequenced and make sense. Has opening and closing.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has interesting details. "Shows" reader using descriptive detail.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Word Choice', description: 'Uses interesting words (action verbs / descriptive adjectives). Few repetitive words.' },
      { label: 'Voice', description: 'Shows own personality and uses interesting words.' },
    ] },

  { name: 'General Writing – Narrowed Topic', category: 'General', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capitals. Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Word Choice', description: 'Uses interesting words: strong action verbs and descriptive adjectives. Few repetitive words.' },
      { label: 'Content/Ideas', description: 'Narrows topic. Has interesting details. "Shows" reader using descriptive detail.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Events are sequenced and make sense. Has opening and closing.' },
      { label: 'Style and Voice', description: 'Shows own personality.' },
    ] },

  { name: 'General Writing + Writing Process', category: 'General', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capitals. Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has interesting details. "Shows" reader using descriptive detail.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Events are sequenced and make sense. Has opening and closing.' },
      { label: 'Style and Voice', description: 'Tries interesting words. Shows own personality in appropriate ways.' },
      { label: 'Writing Process', description: 'Applied writing process to create a finished product. Attempted some editing and/or use of resources such as a dictionary.' },
    ] },

  // ═══ CONTENT (pages 12-17) ═══

  { name: 'Content – With Voice & Organization', category: 'Content', domain: 'writing', grades: [1, 2, 3],
    criteria: [
      { label: 'Topic Clarity', description: 'Topic of writing is clear. Stays on topic.' },
      { label: 'Interesting Details', description: 'Has interesting details.' },
      { label: 'Descriptive Detail', description: '"Shows" reader using descriptive detail. The reader can picture what is happening.' },
      { label: 'Voice & Word Choice', description: 'Uses interesting words and shows personality.' },
      { label: 'Sequencing', description: 'Story is easy to follow. Events are sequenced.' },
    ] },

  { name: 'Content – Small Moments', category: 'Content', domain: 'writing', grades: [1, 2, 3],
    criteria: [
      { label: 'Topic Clarity', description: 'Topic of writing is clear. Stays on topic.' },
      { label: 'Many Details', description: 'Includes many details.' },
      { label: 'Descriptive Detail', description: '"Shows" reader using descriptive detail. Reader can picture what is happening.' },
      { label: 'Engaging Story', description: 'Story is interesting/unique and holds reader attention.' },
      { label: 'Small Moment Focus', description: 'Zooms in on a small moment.' },
    ] },

  { name: 'Content/Ideas – With Brainstorming', category: 'Content', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Topic Clarity', description: 'Topic of writing is clear. Stays on topic.' },
      { label: 'Many Details', description: 'Has many details.' },
      { label: 'Descriptive Detail', description: '"Shows" reader using descriptive detail. Reader can picture what is happening.' },
      { label: 'Engaging Story', description: 'Story is interesting/unique and holds reader attention.' },
      { label: 'Brainstorming', description: 'Brainstorms ideas.' },
    ] },

  { name: 'Content/Ideas – Basic', category: 'Content', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Topic Clarity', description: 'Topic of writing is clear.' },
      { label: 'Stays on Topic', description: 'Stays on topic.' },
      { label: 'Many Details', description: 'Has many details.' },
      { label: 'Engaging Story', description: 'Story is interesting/unique and holds reader attention.' },
      { label: 'Brainstorming', description: 'Brainstorms ideas.' },
    ] },

  { name: 'Content/Ideas + Conventions', category: 'Content', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Topic Clarity', description: 'Topic of writing is clear. Stays on topic.' },
      { label: 'Many Details', description: 'Has many details.' },
      { label: 'Descriptive Detail', description: '"Shows" reader using descriptive detail. Reader can picture what is happening.' },
      { label: 'Engaging Story', description: 'Story is interesting/unique and holds reader attention.' },
      { label: 'Conventions', description: 'Uses accurate punctuation and capitals when appropriate.' },
    ] },

  // ═══ SENTENCE FLUENCY (pages 18-21) ═══

  { name: 'Sentence Fluency – Basic', category: 'Sentence Fluency', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Variety of Lengths', description: 'Has a variety of sentence lengths.' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
      { label: 'Different Beginnings', description: 'Sentences begin in different ways.' },
      { label: 'Connective Words', description: 'Uses connective words smoothly. Few run-on sentences.' },
    ] },

  { name: 'Sentence Fluency – Advanced', category: 'Sentence Fluency', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Variety of Lengths', description: 'Has a variety of sentence lengths.' },
      { label: 'Super Sentences', description: 'Attempts to make "super sentences" (adding detail to sentences).' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
      { label: 'Subject/Verb Agreement', description: 'Uses subject/verb agreement.' },
      { label: 'Different Beginnings', description: 'Sentences begin in different ways.' },
      { label: 'Connective Words', description: 'Uses connective words smoothly. Few run-on sentences.' },
    ] },

  { name: 'Sentence Fluency + Conventions', category: 'Sentence Fluency', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Variety of Lengths', description: 'Has a variety of sentence lengths.' },
      { label: 'Super Sentences', description: 'Attempts to make "super sentences" (adding detail to sentences).' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
      { label: 'Different Beginnings', description: 'Sentences begin in different ways.' },
      { label: 'Connective Words', description: 'Uses connective words smoothly. Few run-on sentences.' },
      { label: 'Punctuation & Capitals', description: 'Uses accurate punctuation and capitals when appropriate.' },
    ] },

  // ═══ CONVENTIONS (pages 22-26) ═══

  { name: 'Conventions – Beginning (no grammar)', category: 'Conventions', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'End Punctuation', description: 'Ends sentences with period, question mark, or exclamation point.' },
      { label: 'Sight Word Spelling', description: 'Spells some sight words correctly.' },
      { label: 'Capital Letters', description: 'Uses a capital letter for the first letter of each sentence.' },
      { label: 'Best Guess Spelling', description: 'Applies best guess spelling.' },
      { label: 'Spacing', description: 'Has spaces between words.' },
      { label: 'Neatness', description: 'Writing is neat and easy to read.' },
    ] },

  { name: 'Conventions – Beginning (with grammar)', category: 'Conventions', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'End Punctuation', description: 'Ends sentences with period, question mark, or exclamation point.' },
      { label: 'Sight Word Spelling', description: 'Spells some sight words correctly.' },
      { label: 'Capital Letters', description: 'Uses a capital letter for the first letter of each sentence.' },
      { label: 'Best Guess Spelling', description: 'Applies best guess spelling.' },
      { label: 'Neatness & Spacing', description: 'Writing is neat and easy to read. Has spaces between words.' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
    ] },

  { name: 'Conventions – Intermediate', category: 'Conventions', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Accurate Punctuation', description: 'Uses accurate punctuation.' },
      { label: 'Sight Words', description: 'Writes most sight words correctly.' },
      { label: 'Capitals for Sentences & Names', description: 'Uses a capital letter for first letter of each sentence and for names.' },
      { label: 'Spelling Patterns', description: 'Uses knowledge of spelling patterns to sound out words.' },
      { label: 'Neatness & Spacing', description: 'Writing is neat and easy to read. Has spaces between words.' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
    ] },

  { name: 'Conventions – Advanced', category: 'Conventions', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Ending Punctuation', description: 'Uses appropriate ending punctuation.' },
      { label: 'Quotation Marks & Apostrophes', description: 'Uses quotation marks and apostrophes accurately.' },
      { label: 'Proper Noun Capitals', description: 'Uses a capital letter for proper nouns.' },
      { label: 'Spelling', description: 'Spells most sight words correctly. Uses spelling patterns to sound out words.' },
      { label: 'Grammar', description: 'Sentences are complete and make sense. Uses subject/verb agreement.' },
    ] },

  // ═══ ORGANIZATION (pages 27-30) ═══

  { name: 'Organization – Narrative Beginning', category: 'Organization', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Catchy Opening', description: 'Has a catchy opening.' },
      { label: 'Sequenced Events', description: 'Events are sequenced. Includes two or more events.' },
      { label: 'Easy to Follow', description: 'Sequencing makes sense and is easy to follow.' },
      { label: 'Transitional Words', description: 'Uses transitional words.' },
      { label: 'Conclusion', description: 'There is a conclusion that brings an ending to what is written.' },
    ] },

  { name: 'Organization – Narrative Focus', category: 'Organization', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Clear Beginning', description: 'Story has a clear beginning. Opening is catchy and relevant.' },
      { label: 'Thorough Middle', description: 'Story has a clear and thorough middle. Two or more events are sequenced.' },
      { label: 'Clear Ending', description: 'Story has a clear ending. Closing fits with the story.' },
      { label: 'Transitional Words', description: 'Uses transitional words effectively.' },
      { label: 'Easy to Follow', description: 'Sequencing makes sense and is easy to follow.' },
    ] },

  { name: 'Organization – Informational', category: 'Organization', domain: 'writing', grades: [2, 3, 4],
    criteria: [
      { label: 'Opening Sentence', description: 'Has an opening sentence.' },
      { label: 'Supporting Details', description: 'Main idea is supported with details that make sense.' },
      { label: 'Easy to Follow', description: 'Paper sequence is easy to follow.' },
      { label: 'Smooth Transitions', description: 'Includes smooth transitions.' },
      { label: 'Closing Sentence', description: 'Has a closing sentence.' },
    ] },

  // ═══ VOICE / WORD CHOICE (pages 31-34) ═══

  { name: 'Voice – Narrative', category: 'Voice / Word Choice', domain: 'writing', grades: [1, 2, 3],
    criteria: [
      { label: 'Personality', description: 'Personality shines through in writing.' },
      { label: 'Thoughts & Feelings', description: 'Writing shows characters\' thoughts and feelings.' },
      { label: 'Engaging Writing', description: 'Writing is engaging and interesting.' },
      { label: 'Word Choice & Personality', description: 'Word choice reflects personality.' },
    ] },

  { name: 'Voice – Informational', category: 'Voice / Word Choice', domain: 'writing', grades: [2, 3, 4],
    criteria: [
      { label: 'Personality', description: 'Personality shines through in writing. You can "hear" his/her voice.' },
      { label: 'Audience Awareness', description: 'Connects to reader, showing strong sense of audience.' },
      { label: 'Topic Interest', description: 'Shows interest in the topic, catching the reader attention.' },
      { label: 'Word Choice', description: 'Word choice reflects personality and understanding of the topic.' },
    ] },

  { name: 'Word Choice', category: 'Voice / Word Choice', domain: 'writing', grades: [1, 2, 3, 4],
    criteria: [
      { label: 'Action Verbs', description: 'Attempts to use a variety of action verbs.' },
      { label: 'Descriptive Adjectives', description: 'Uses descriptive adjectives.' },
      { label: 'Engaging & Appropriate', description: 'Word choice is engaging and appropriate.' },
      { label: 'Few Repetitive Words', description: 'Few repetitive words.' },
    ] },

  // ═══ PERSUASIVE WRITING (pages 35-41) ═══

  { name: 'Persuasive – Full (7 criteria)', category: 'Persuasive', domain: 'writing', grades: [2, 3, 4],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capital letters for sentences and names.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Gives several good reasons to support argument.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Clear beginning, middle and end.' },
      { label: 'Voice', description: 'Shows own personality.' },
      { label: 'Word Choice', description: 'Tries interesting words (action verbs and descriptive adjectives). Few repetitive words.' },
    ] },

  { name: 'Persuasive – Letter Format', category: 'Persuasive', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Focus/Thesis', description: 'Clearly states a thesis, capturing reader attention, includes an opinion.' },
      { label: 'Content', description: 'Clearly states at least three reasons in a logical order to support thesis.' },
      { label: 'Organization', description: 'Uses transitional words.' },
      { label: 'Conclusion', description: 'Clearly repeats his/her opinion.' },
      { label: 'Mechanics', description: 'Uses accurate punctuation, grammar, and appropriate use of capitalization.' },
      { label: 'Letter Format', description: 'Uses parts of a letter.' },
    ] },

  { name: 'Persuasive – 5 Criteria', category: 'Persuasive', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capital letters.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Gives several good reasons to support argument.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Sentences are complete. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Clear beginning, middle and end.' },
    ] },

  { name: 'Persuasive – Field Trip (6 criteria)', category: 'Persuasive', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'States Opinion', description: 'Clearly states opinion about which field trip would be best.' },
      { label: 'Supporting Reasons', description: 'Clearly states reasons to support opinion.' },
      { label: 'Transitional Words', description: 'Uses transitional words.' },
      { label: 'Voice', description: 'Voice is evident in writing.' },
      { label: 'Conventions', description: 'Uses accurate punctuation and appropriate capitalization.' },
      { label: 'Letter Format', description: 'Uses parts of a letter.' },
    ] },

  { name: 'Persuasive – Field Trip (with sequence)', category: 'Persuasive', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'States Opinion', description: 'Clearly states opinion about which field trip would be best.' },
      { label: 'Supporting Reasons', description: 'Clearly states reasons to support opinion.' },
      { label: 'Voice', description: 'Voice is evident in writing.' },
      { label: 'Conventions', description: 'Uses accurate punctuation and appropriate capitalization.' },
      { label: 'Topic & Sequence', description: 'Stays on topic and has a clear sequence.' },
      { label: 'Transition Words', description: 'Uses transition words.' },
    ] },

  { name: 'Persuasive – Beginning Writer', category: 'Persuasive', domain: 'writing', grades: [1],
    criteria: [
      { label: 'States Opinion', description: 'Clearly states opinion about which field trip would be best.' },
      { label: 'Supporting Reason', description: 'Clearly states a reason to support opinion.' },
      { label: 'Conventions', description: 'Uses accurate punctuation and appropriate capitalization.' },
      { label: 'Handwriting', description: 'Uses best guess handwriting.' },
      { label: 'Independence', description: 'Needs little assistance to complete writing task.' },
    ] },

  // ═══ PERSONAL NARRATIVES (pages 42-45) ═══

  { name: 'Personal Narrative – Basic', category: 'Personal Narrative', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Neatness', description: 'Pictures and handwriting are neat.' },
      { label: 'Organization', description: 'Writing is easy to follow. Clear beginning, middle, and end.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Sentence lengths vary.' },
      { label: 'Focus & Details', description: 'Narrative is focused. Interesting details are added.' },
      { label: 'Word Choice', description: 'Uses interesting words that fit. Word choice helps create a visual picture. Few words repeated.' },
    ] },

  { name: 'Personal Narrative – Characters/Setting', category: 'Personal Narrative', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Neatness', description: 'Pictures and handwriting are neat.' },
      { label: 'Organization', description: 'Writing is easy to follow. Clear beginning, middle, and end.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Sentence lengths vary.' },
      { label: 'Focus with Characters/Setting', description: 'Narrative is focused, introducing characters and setting. Interesting details are added.' },
      { label: 'Word Choice & Sensory Details', description: 'Uses interesting words. Word choice helps create a visual picture. Sensory descriptors are used.' },
    ] },

  { name: 'Personal Narrative – With Voice', category: 'Personal Narrative', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Conventions', description: 'Begins sentences with a capital letter and uses appropriate punctuation.' },
      { label: 'Voice & Description', description: 'Shows personality in writing and/or is descriptive (interesting words, strong verbs, adjectives).' },
      { label: 'Brainstorming', description: 'Able to brainstorm ideas independently.' },
      { label: 'Sentences', description: 'Sentences are complete and make sense. Sentence lengths vary.' },
      { label: 'Elaboration', description: 'Elaborates with some detail.' },
      { label: 'Sequencing', description: 'Sequences the events.' },
    ] },

  { name: 'Narrative Writer\'s Rubric', category: 'Personal Narrative', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Capital Letters', description: 'Sentences and names begin with a capital letter.' },
      { label: 'End Punctuation', description: 'Sentences end with periods, question marks, and exclamation marks.' },
      { label: 'Spacing & Letter Formation', description: 'Has appropriate spacing. Letters are formed accurately.' },
      { label: 'Spelling', description: 'Uses knowledge of spelling patterns and "rules" to spell words.' },
      { label: 'Complete Sentences', description: 'Sentences are complete and make sense.' },
      { label: 'Sequencing', description: 'Writing is easy to follow. Events are sequenced.' },
    ] },

  // ═══ FRIENDLY LETTER (page 46) ═══

  { name: 'Friendly Letter', category: 'Friendly Letter', domain: 'writing', grades: [1, 2, 3],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capital letters for sentences and names.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has details. Able to brainstorm ideas.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Sentences are complete. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Has two or more sequenced events.' },
      { label: 'Letter Format', description: 'Uses greeting, body, and closing.' },
    ] },

  // ═══ OPINION WRITING (pages 47-50) ═══

  { name: 'Opinion Writing – With Voice', category: 'Opinion', domain: 'writing', grades: [1, 2, 3],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capital letters when appropriate.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'States opinion clearly. Stays on topic. Gives reasons to support opinion.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Sentences are complete. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Events are sequenced. Has opening and closing.' },
      { label: 'Voice', description: 'Shows own personality and uses interesting words.' },
    ] },

  { name: 'Opinion Writing – Basic', category: 'Opinion', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Clear Opinion', description: 'Clearly states opinion on a topic.' },
      { label: 'Supporting Reasons', description: 'Gives reasons that support opinion.' },
      { label: 'Closure', description: 'Provides sense of closure.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitalization, and spelling.' },
    ] },

  { name: 'Opinion Writing – Detailed', category: 'Opinion', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Clear Opinion', description: 'Clearly introduces a topic and states opinion.' },
      { label: 'Supporting Reasons', description: 'Provides reasons that support opinion.' },
      { label: 'Linking Words', description: 'Uses linking words (because, and, also) to connect opinion and reasons.' },
      { label: 'Conclusion', description: 'Provides a concluding statement or section.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitalization, and spelling.' },
    ] },

  { name: 'Opinion Writing – Advanced', category: 'Opinion', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Topic Introduction', description: 'Introduces a topic, states opinion, and creates an organizational structure.' },
      { label: 'Reasons & Evidence', description: 'Provides reasons supported by facts and details.' },
      { label: 'Linking Words & Phrases', description: 'Links opinion and reasons using words, phrases, and clauses.' },
      { label: 'Conclusion', description: 'Provides a concluding statement or section related to the opinion.' },
      { label: 'Organization', description: 'Groups related ideas together to support purpose.' },
      { label: 'Conventions', description: 'Uses grade-appropriate grammar, punctuation, capitalization, and spelling.' },
    ] },

  // ═══ NARRATIVE RETELLING (pages 51-54) ═══

  { name: 'Narrative Retelling – Basic', category: 'Narrative Retelling', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Beginning/Middle/End', description: 'Story has a beginning, middle, and end.' },
      { label: 'Sequenced Events', description: 'Events are told in order. Story is easy to follow.' },
      { label: 'Character Names', description: 'Uses character names from the story.' },
      { label: 'Details', description: 'Includes details from the story.' },
      { label: 'Conventions', description: 'Uses punctuation, capitals, and spelling.' },
    ] },

  { name: 'Narrative Retelling – With Voice', category: 'Narrative Retelling', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Beginning/Middle/End', description: 'Story has a clear beginning, middle, and end.' },
      { label: 'Sequenced Events', description: 'Events are told in order. Story is easy to follow.' },
      { label: 'Character Names', description: 'Uses character names from the story.' },
      { label: 'Details from Story', description: 'Includes interesting details from the story.' },
      { label: 'Voice', description: 'Shows personality in the retelling.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitals, and spelling.' },
    ] },

  { name: 'Narrative Retelling – Detailed', category: 'Narrative Retelling', domain: 'writing', grades: [2, 3, 4],
    criteria: [
      { label: 'Beginning/Middle/End', description: 'Story has a clear beginning, middle, and end.' },
      { label: 'Sequenced Events', description: 'Events are told in order and make sense.' },
      { label: 'Characters & Setting', description: 'Includes characters and setting from the story.' },
      { label: 'Key Events & Details', description: 'Includes key events and important details.' },
      { label: 'Transitions', description: 'Uses transitional words to connect events.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitals, and spelling.' },
    ] },

  // ═══ HOW-TO / PROCEDURES (pages 55-57) ═══

  { name: 'How-To – Basic', category: 'How-To / Procedures', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Steps in Order', description: 'Steps are in correct order.' },
      { label: 'Transition Words', description: 'Uses transition words (first, next, then, last).' },
      { label: 'Opening', description: 'Has a clear opening/topic sentence.' },
      { label: 'Closing', description: 'Has a closing.' },
      { label: 'Conventions', description: 'Uses punctuation, capitals, and spelling.' },
    ] },

  { name: 'How-To – With Details', category: 'How-To / Procedures', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Steps in Order', description: 'Steps are in correct order and are clear.' },
      { label: 'Transition Words', description: 'Uses transition words effectively.' },
      { label: 'Opening', description: 'Has a clear and engaging opening.' },
      { label: 'Details', description: 'Includes details that help the reader understand each step.' },
      { label: 'Closing', description: 'Has a closing that wraps up the piece.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitals, and spelling.' },
    ] },

  { name: 'How-To – Advanced', category: 'How-To / Procedures', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Steps in Order', description: 'Steps are in correct order and clearly explained.' },
      { label: 'Transition Words', description: 'Uses transition words and phrases to guide reader through steps.' },
      { label: 'Opening & Topic', description: 'Has an engaging opening that introduces the topic clearly.' },
      { label: 'Specific Details', description: 'Includes specific details and explanations for each step.' },
      { label: 'Closing', description: 'Has a closing that concludes the piece effectively.' },
      { label: 'Conventions', description: 'Uses grade-appropriate punctuation, capitalization, grammar, and spelling.' },
    ] },

  // ═══ INFORMATIVE WRITING (pages 58-62) ═══

  { name: 'Informative – Basic', category: 'Informative', domain: 'writing', grades: [1, 2],
    criteria: [
      { label: 'Clear Topic', description: 'Names the topic clearly.' },
      { label: 'Facts & Details', description: 'Supplies some facts about the topic.' },
      { label: 'Closure', description: 'Provides sense of closure.' },
      { label: 'Conventions', description: 'Uses punctuation, capitals, and spelling.' },
    ] },

  { name: 'Informative – With Organization', category: 'Informative', domain: 'writing', grades: [2, 3],
    criteria: [
      { label: 'Topic Introduction', description: 'Introduces a topic.' },
      { label: 'Facts & Definitions', description: 'Uses facts and definitions to develop points.' },
      { label: 'Organization', description: 'Groups related information together.' },
      { label: 'Linking Words', description: 'Uses linking words (also, another, and, more, but).' },
      { label: 'Conclusion', description: 'Provides a concluding statement or section.' },
      { label: 'Conventions', description: 'Uses accurate punctuation, capitalization, and spelling.' },
    ] },

  { name: 'Informative – Detailed', category: 'Informative', domain: 'writing', grades: [3, 4],
    criteria: [
      { label: 'Topic Introduction', description: 'Introduces a topic clearly.' },
      { label: 'Facts, Details & Definitions', description: 'Develops topic with facts, definitions, and details.' },
      { label: 'Organization & Grouping', description: 'Groups related information in paragraphs and sections.' },
      { label: 'Linking Words & Phrases', description: 'Links ideas within categories using words, phrases, and clauses.' },
      { label: 'Domain Vocabulary', description: 'Uses precise language and domain-specific vocabulary.' },
      { label: 'Conclusion', description: 'Provides a concluding statement or section.' },
      { label: 'Conventions', description: 'Uses grade-appropriate grammar, punctuation, capitalization, and spelling.' },
    ] },

  { name: 'Informative – Full Traits', category: 'Informative', domain: 'writing', grades: [3, 4, 5],
    criteria: [
      { label: 'Conventions', description: 'Uses accurate punctuation and capital letters when appropriate.' },
      { label: 'Spelling', description: 'Writes most sight words correctly and uses spelling patterns.' },
      { label: 'Content/Ideas', description: 'Stays on topic. Has interesting details. "Shows" reader using descriptive detail.' },
      { label: 'Sentence Fluency', description: 'Variety of sentence lengths. Few choppy or run-on sentences. Sentences begin in different ways.' },
      { label: 'Organization', description: 'Uses transitional words. Information is sequenced and makes sense. Has opening and closing.' },
      { label: 'Voice', description: 'Shows own personality and uses interesting words.' },
    ] },

  // ═══ BEGINNING WRITERS (pages 63-69) ═══

  { name: 'Beginning Writer – Pre-Writing', category: 'Beginning Writers', domain: 'writing', grades: [0, 1],
    criteria: [
      { label: 'Left-to-Right / Top-to-Bottom', description: 'Writes from left to right and top to bottom.' },
      { label: 'Letter Formation', description: 'Forms most letters correctly.' },
      { label: 'Spaces Between Words', description: 'Has spaces between words.' },
      { label: 'Picture Matches Words', description: 'Picture matches the writing.' },
      { label: 'Attempts Phonetic Spelling', description: 'Attempts to apply phonics knowledge to spell words.' },
    ] },

  { name: 'Beginning Writer – Sentences', category: 'Beginning Writers', domain: 'writing', grades: [0, 1],
    criteria: [
      { label: 'Complete Sentence', description: 'Writes a complete sentence.' },
      { label: 'Capital to Start', description: 'Begins sentence with a capital letter.' },
      { label: 'End Punctuation', description: 'Ends sentence with a period, question mark, or exclamation point.' },
      { label: 'Spacing', description: 'Has spaces between words.' },
      { label: 'Phonetic Spelling', description: 'Uses phonics knowledge to spell words.' },
      { label: 'Picture Matches', description: 'Picture matches the sentence.' },
    ] },

  { name: 'Beginning Writer – Multiple Sentences', category: 'Beginning Writers', domain: 'writing', grades: [1],
    criteria: [
      { label: 'Two or More Sentences', description: 'Writes two or more sentences on one topic.' },
      { label: 'Capital Letters', description: 'Begins sentences with a capital letter.' },
      { label: 'End Punctuation', description: 'Ends sentences with appropriate punctuation.' },
      { label: 'Spacing & Neatness', description: 'Writing is neat with spaces between words.' },
      { label: 'Sight Word Spelling', description: 'Spells some sight words correctly.' },
      { label: 'Phonetic Spelling', description: 'Uses phonics knowledge to spell unknown words.' },
    ] },

  { name: 'Beginning Writer – Story', category: 'Beginning Writers', domain: 'writing', grades: [1],
    criteria: [
      { label: 'Tells a Story', description: 'Tells a story with events in order.' },
      { label: 'Details', description: 'Includes some details about what happened.' },
      { label: 'Complete Sentences', description: 'Uses complete sentences.' },
      { label: 'Capitals & Punctuation', description: 'Uses capital letters and end punctuation.' },
      { label: 'Spelling', description: 'Spells sight words correctly and applies phonics to other words.' },
      { label: 'Neatness', description: 'Writing is neat and readable.' },
    ] },

  // ═══ SPEAKING RUBRICS ═══

  { name: 'Oral Presentation', category: 'Speaking', domain: 'speaking', grades: [1, 2, 3, 4, 5],
    criteria: [
      { label: 'Content', description: 'Content is clear with supporting details.' },
      { label: 'Volume & Clarity', description: 'Speaks with appropriate volume and clarity.' },
      { label: 'Eye Contact', description: 'Makes eye contact with audience.' },
      { label: 'Organization', description: 'Organized with beginning, middle, end.' },
      { label: 'Language', description: 'Uses complete sentences with varied language.' },
    ] },

  { name: 'Partner Discussion', category: 'Speaking', domain: 'speaking', grades: [1, 2, 3, 4, 5],
    criteria: [
      { label: 'Participation', description: 'Participates actively in discussion.' },
      { label: 'Listening', description: 'Listens to partner and responds appropriately.' },
      { label: 'Complete Sentences', description: 'Uses complete sentences.' },
      { label: 'On Topic', description: 'Stays on topic.' },
      { label: 'Respect', description: 'Uses polite and respectful language.' },
    ] },
]

export const LEVEL_LABELS = ['Needs Guidance', 'Developing', 'Meets Standards', 'Exceeds Standards']
export const LEVEL_COLORS = [
  'bg-red-100 text-red-700 border-red-300 ring-red-300',
  'bg-amber-100 text-amber-700 border-amber-300 ring-amber-300',
  'bg-green-100 text-green-700 border-green-300 ring-green-300',
  'bg-blue-100 text-blue-700 border-blue-300 ring-blue-300',
]

// Get all unique categories for the picker
export const RUBRIC_CATEGORIES = [...new Set(SCORING_RUBRICS.map(r => r.category))]
