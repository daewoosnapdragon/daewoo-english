// Comprehensive CCSS-Aligned Scoring Rubrics (K-5)
// Extracted from Writing & Reading Response Rubric Bundle
// 4-column: 1=Emerging/Needs Guidance, 2=Developing, 3=Meets Standards, 4=Exceeds Standards

export interface ScoringRubric {
  id: string
  name: string
  grade: number // 0=K, 1-5
  domain: 'writing' | 'reading' | 'speaking'
  type: 'opinion' | 'narrative' | 'informational' | 'conventions' | 'reading_response' | 'character_analysis' | 'nonfiction' | 'retelling' | 'oral_presentation'
  criteria: { label: string; standard?: string; levels: [string, string, string, string] }[]
}

export const SCORING_RUBRICS: ScoringRubric[] = [
  // ═══════════════════════════════════════════════════════════════════
  // GRADE 1 WRITING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'g1-opinion', name: 'Opinion Writing', grade: 1, domain: 'writing', type: 'opinion',
    criteria: [
      { label: 'States opinion clearly', standard: 'W.1.1', levels: ['No opinion stated', 'Opinion unclear or hard to find', 'Clearly states opinion', 'Strong opinion with engaging opening'] },
      { label: 'Gives reasons for opinion', standard: 'W.1.1', levels: ['No reasons given', 'One vague reason', 'Gives reasons that support opinion', 'Multiple strong reasons with details'] },
      { label: 'Provides a closing', standard: 'W.1.1', levels: ['No ending', 'Abrupt stop', 'Has a closing statement', 'Strong ending that restates opinion'] },
      { label: 'Adds details to strengthen', standard: 'W.1.5', levels: ['No details', 'Minimal details', 'Adds details to support reasons', 'Elaborates with specific examples'] },
      { label: 'Writes in complete sentences', standard: 'L.1.1', levels: ['Fragments/incomplete', 'Some complete sentences', 'Mostly complete sentences', 'All complete, varied sentences'] },
      { label: 'Uses conventions', standard: 'L.1.2', levels: ['Many errors, hard to read', 'Some capitals/punctuation', 'Correct capitals, punctuation, spelling', 'Strong conventions with commas in lists'] },
    ]
  },
  {
    id: 'g1-narrative', name: 'Narrative Writing', grade: 1, domain: 'writing', type: 'narrative',
    criteria: [
      { label: 'Writes two or more sequenced events', standard: 'W.1.3', levels: ['No events or single sentence', 'One event only', 'Two+ events in sequence', 'Multiple well-developed events'] },
      { label: 'Includes details', standard: 'W.1.3', levels: ['No details', 'Minimal details', 'Interesting details added', 'Vivid sensory details throughout'] },
      { label: 'Uses temporal words', standard: 'W.1.3', levels: ['No time words', 'One time word (then)', 'Uses temporal words (first, next, last)', 'Varied transitions (meanwhile, after that)'] },
      { label: 'Has a clear ending', standard: 'W.1.3', levels: ['No ending', 'Story just stops', 'Has a clear ending', 'Satisfying ending with closure'] },
      { label: 'Story is easy to follow', standard: 'W.1.3', levels: ['Confusing/random', 'Somewhat followable', 'Sequenced and easy to follow', 'Smooth, engaging flow'] },
      { label: 'Uses conventions', standard: 'L.1.2', levels: ['Many errors, hard to read', 'Some capitals/punctuation', 'Correct capitals, punctuation, spelling', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'g1-informational', name: 'Informational Writing', grade: 1, domain: 'writing', type: 'informational',
    criteria: [
      { label: 'Names the topic', standard: 'W.1.2', levels: ['No topic identified', 'Topic vague', 'Clearly names the topic', 'Engaging introduction of topic'] },
      { label: 'Includes facts about topic', standard: 'W.1.2', levels: ['No facts', 'One fact only', 'Includes several facts', 'Rich facts with examples'] },
      { label: 'Stays on topic', standard: 'W.1.2', levels: ['Off topic', 'Drifts from topic', 'Stays on topic throughout', 'Focused with all details relevant'] },
      { label: 'Provides a closing', standard: 'W.1.2', levels: ['No ending', 'Abrupt stop', 'Has a closing statement', 'Strong closing that wraps up topic'] },
      { label: 'Writing is organized', standard: 'W.1.2', levels: ['No organization', 'Some grouping', 'Organized and easy to follow', 'Clear structure with logical flow'] },
      { label: 'Uses conventions', standard: 'L.1.2', levels: ['Many errors, hard to read', 'Some capitals/punctuation', 'Correct capitals, punctuation, spelling', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'g1-conventions', name: 'Conventions Check', grade: 1, domain: 'writing', type: 'conventions',
    criteria: [
      { label: 'Complete sentences', standard: 'L.1.1', levels: ['Fragments only', 'Some complete sentences', 'Mostly complete sentences', 'All complete, varied sentences'] },
      { label: 'Capital letters', standard: 'L.1.2', levels: ['No capitals', 'Inconsistent capitals', 'Capitals for sentences and I', 'Capitals for sentences, I, and names'] },
      { label: 'Ending punctuation', standard: 'L.1.2', levels: ['No punctuation', 'Some periods', 'Correct end punctuation', 'Varied punctuation (. ? !)'] },
      { label: 'Phonetic spelling', standard: 'L.1.2', levels: ['Random letters', 'Some sounds represented', 'Phonetically accurate', 'Most words spelled correctly'] },
      { label: 'Neat handwriting with spaces', standard: 'L.1.1', levels: ['Hard to read, no spaces', 'Some spaces, messy', 'Neat with clear spaces', 'Excellent formation and spacing'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // GRADE 2 WRITING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'g2-opinion', name: 'Opinion Writing', grade: 2, domain: 'writing', type: 'opinion',
    criteria: [
      { label: 'States opinion and stays on topic', standard: 'W.2.1', levels: ['No opinion or off topic', 'Opinion unclear, drifts', 'Clear opinion, stays on topic', 'Strong opinion with engaging focus'] },
      { label: 'Gives reasons that support opinion', standard: 'W.2.1', levels: ['No reasons', 'One weak reason', 'Multiple supporting reasons', 'Strong reasons with evidence'] },
      { label: 'Uses linking words', standard: 'W.2.1', levels: ['No linking words', 'One linking word', 'Uses because, and, also', 'Varied linking words throughout'] },
      { label: 'Writes a concluding statement', standard: 'W.2.1', levels: ['No conclusion', 'Abrupt ending', 'Has concluding statement', 'Strong conclusion restating opinion'] },
      { label: 'Adds details to strengthen', standard: 'W.2.5', levels: ['No supporting details', 'Minimal details', 'Details support each reason', 'Elaborated details with examples'] },
      { label: 'Uses conventions', standard: 'L.2.2', levels: ['Many errors', 'Some correct', 'Correct caps, punctuation, spelling', 'Strong with apostrophes and commas'] },
    ]
  },
  {
    id: 'g2-narrative', name: 'Narrative Writing', grade: 2, domain: 'writing', type: 'narrative',
    criteria: [
      { label: 'Writes about one event/experience', standard: 'W.2.3', levels: ['No clear event', 'Vague situation', 'Clear event with context', 'Engaging situation that draws reader in'] },
      { label: 'Includes thoughts, actions, feelings', standard: 'W.2.3', levels: ['None included', 'One type only', 'Includes thoughts, actions, or feelings', 'Rich mix of all three'] },
      { label: 'Uses transition words', standard: 'W.2.3', levels: ['No transitions', 'Then, then, then', 'Uses varied transitions', 'Smooth transitions throughout'] },
      { label: 'Adds interesting details', standard: 'W.2.3', levels: ['No details', 'Basic details', 'Interesting details added', 'Vivid details help reader visualize'] },
      { label: 'Writes a good ending', standard: 'W.2.3', levels: ['No ending', 'Story just stops', 'Has a clear ending', 'Satisfying ending with reflection'] },
      { label: 'Story is sequenced and easy to follow', standard: 'W.2.3', levels: ['Random/confusing', 'Somewhat in order', 'Sequenced and clear', 'Smooth, engaging narrative flow'] },
      { label: 'Uses conventions', standard: 'L.2.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'g2-informational', name: 'Informational Writing', grade: 2, domain: 'writing', type: 'informational',
    criteria: [
      { label: 'Introduces topic clearly', standard: 'W.2.2', levels: ['No topic introduction', 'Topic vague', 'Clear opening introduces topic', 'Engaging introduction hooks reader'] },
      { label: 'Includes facts to develop point', standard: 'W.2.2', levels: ['No facts', 'One basic fact', 'Several relevant facts', 'Rich facts with definitions when needed'] },
      { label: 'Uses linking words', standard: 'W.2.2', levels: ['No linking words', 'One connector', 'Uses also, another, and, more', 'Varied connectors organize ideas'] },
      { label: 'Provides ending statement', standard: 'W.2.2', levels: ['No ending', 'Abrupt stop', 'Has ending statement or section', 'Strong conclusion summarizes topic'] },
      { label: 'Information is relevant to topic', standard: 'W.2.2', levels: ['Off topic', 'Some relevant', 'All facts relevant to topic', 'Focused with well-chosen details'] },
      { label: 'Uses conventions', standard: 'L.2.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // GRADE 3 WRITING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'g3-opinion', name: 'Opinion Writing', grade: 3, domain: 'writing', type: 'opinion',
    criteria: [
      { label: 'Introduces topic and states opinion', standard: 'W.3.1', levels: ['No topic or opinion', 'Vague opinion', 'Clear topic and opinion', 'Engaging intro with strong opinion'] },
      { label: 'Provides reasons with supporting details', standard: 'W.3.1', levels: ['No reasons', 'Reasons without support', 'Reasons with supporting details', 'Well-developed reasons with evidence'] },
      { label: 'Uses linking words and phrases', standard: 'W.3.1', levels: ['No linking words', 'Basic (because, and)', 'Uses because, therefore, for example', 'Sophisticated connectors throughout'] },
      { label: 'Provides concluding statement', standard: 'W.3.1', levels: ['No conclusion', 'Weak ending', 'Clear concluding statement', 'Strong conclusion that reinforces opinion'] },
      { label: 'Organizational structure', standard: 'W.3.1', levels: ['No structure', 'Some paragraphing', 'Clear intro/body/conclusion', 'Well-organized with logical flow'] },
      { label: 'Uses conventions', standard: 'L.3.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong with dialogue punctuation'] },
    ]
  },
  {
    id: 'g3-narrative', name: 'Narrative Writing', grade: 3, domain: 'writing', type: 'narrative',
    criteria: [
      { label: 'Establishes situation and introduces characters', standard: 'W.3.3', levels: ['No setup', 'Vague situation', 'Clear situation with characters', 'Engaging opening with developed characters'] },
      { label: 'Uses dialogue and descriptions', standard: 'W.3.3', levels: ['No dialogue or description', 'Minimal dialogue', 'Uses dialogue and descriptions', 'Natural dialogue advances the story'] },
      { label: 'Sequences events logically', standard: 'W.3.3', levels: ['Random events', 'Some sequence', 'Logical sequence with transitions', 'Smooth pacing with varied transitions'] },
      { label: 'Uses temporal words and phrases', standard: 'W.3.3', levels: ['No time words', 'Basic (then, next)', 'Varied temporal words', 'Sophisticated transitions (meanwhile, later that day)'] },
      { label: 'Provides sense of closure', standard: 'W.3.3', levels: ['No ending', 'Abrupt ending', 'Clear closure', 'Satisfying resolution'] },
      { label: 'Uses conventions', standard: 'L.3.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'g3-informational', name: 'Informational Writing', grade: 3, domain: 'writing', type: 'informational',
    criteria: [
      { label: 'Introduces topic clearly', standard: 'W.3.2', levels: ['No introduction', 'Vague topic', 'Clear topic introduction', 'Engaging introduction with focus'] },
      { label: 'Develops topic with facts and details', standard: 'W.3.2', levels: ['No facts', 'Few facts', 'Facts, definitions, details develop topic', 'Rich, well-researched content'] },
      { label: 'Uses linking words', standard: 'W.3.2', levels: ['No linking words', 'Basic connectors', 'Also, another, and, more, but', 'Varied connectors organize ideas clearly'] },
      { label: 'Groups related information', standard: 'W.3.2', levels: ['No grouping', 'Some grouping', 'Related info grouped in paragraphs', 'Clear sections with headings/illustrations'] },
      { label: 'Provides concluding statement', standard: 'W.3.2', levels: ['No conclusion', 'Weak ending', 'Concluding statement or section', 'Strong conclusion summarizes key points'] },
      { label: 'Uses conventions', standard: 'L.3.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // GRADE 4 WRITING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'g4-opinion', name: 'Opinion Writing', grade: 4, domain: 'writing', type: 'opinion',
    criteria: [
      { label: 'Introduces topic and states opinion', standard: 'W.4.1', levels: ['No topic or opinion', 'Vague opinion', 'Clear introduction with opinion', 'Engaging intro creates context for opinion'] },
      { label: 'Supports with reasons and evidence', standard: 'W.4.1', levels: ['No support', 'Reasons without evidence', 'Reasons supported by facts/details', 'Well-developed reasoning with strong evidence'] },
      { label: 'Groups related ideas in paragraphs', standard: 'W.4.1', levels: ['No paragraphs', 'Random paragraphing', 'Related ideas grouped logically', 'Strong paragraph structure with purpose'] },
      { label: 'Uses linking words and phrases', standard: 'W.4.1', levels: ['No connectors', 'Basic connectors', 'For instance, in addition, in order to', 'Sophisticated connectors throughout'] },
      { label: 'Provides concluding statement', standard: 'W.4.1', levels: ['No conclusion', 'Weak ending', 'Concluding statement related to opinion', 'Strong conclusion synthesizes argument'] },
      { label: 'Uses conventions', standard: 'L.4.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong with correct comma usage'] },
    ]
  },
  {
    id: 'g4-narrative', name: 'Narrative Writing', grade: 4, domain: 'writing', type: 'narrative',
    criteria: [
      { label: 'Orients reader with situation/characters', standard: 'W.4.3', levels: ['No context', 'Minimal setup', 'Establishes situation and narrator', 'Rich setup that engages reader immediately'] },
      { label: 'Uses dialogue and description', standard: 'W.4.3', levels: ['None', 'Minimal dialogue', 'Dialogue and description develop story', 'Natural dialogue reveals character'] },
      { label: 'Adds descriptive details', standard: 'W.4.3', levels: ['No description', 'Basic details', 'Descriptive details added', 'Precise, sensory details create imagery'] },
      { label: 'Uses transitional words for sequence', standard: 'W.4.3', levels: ['No transitions', 'Basic (then, next)', 'Varied transitions signal time/sequence', 'Sophisticated pacing with transitions'] },
      { label: 'Provides conclusion', standard: 'W.4.3', levels: ['No ending', 'Abrupt ending', 'Provides sense of closure', 'Satisfying conclusion with reflection'] },
      { label: 'Uses conventions', standard: 'L.4.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions with dialogue punctuation'] },
    ]
  },
  {
    id: 'g4-informational', name: 'Informational Writing', grade: 4, domain: 'writing', type: 'informational',
    criteria: [
      { label: 'Introduces topic clearly', standard: 'W.4.2', levels: ['No introduction', 'Vague topic', 'Clear topic with grouping preview', 'Engaging intro with thesis-like focus'] },
      { label: 'Develops with facts, details, examples', standard: 'W.4.2', levels: ['No development', 'Minimal facts', 'Facts, definitions, details, examples', 'Rich content from multiple sources'] },
      { label: 'Groups related information', standard: 'W.4.2', levels: ['No structure', 'Some grouping', 'Clear paragraphs with related info', 'Sections with headings and illustrations'] },
      { label: 'Uses precise language and vocabulary', standard: 'W.4.2', levels: ['Basic/vague words', 'Some topic words', 'Domain-specific vocabulary used', 'Precise language integrated naturally'] },
      { label: 'Provides concluding statement', standard: 'W.4.2', levels: ['No conclusion', 'Weak ending', 'Concluding section', 'Strong conclusion synthesizes information'] },
      { label: 'Uses conventions', standard: 'L.4.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // GRADE 5 WRITING
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'g5-opinion', name: 'Opinion Writing', grade: 5, domain: 'writing', type: 'opinion',
    criteria: [
      { label: 'Introduces topic and states opinion', standard: 'W.5.1', levels: ['No opinion', 'Vague opinion', 'Clear opinion with context', 'Compelling introduction with strong stance'] },
      { label: 'Logically ordered reasons with facts', standard: 'W.5.1', levels: ['No reasons', 'Unorganized reasons', 'Logically ordered reasons with facts', 'Persuasive argument with strong evidence'] },
      { label: 'Uses linking words, phrases, clauses', standard: 'W.5.1', levels: ['No connectors', 'Basic connectors', 'Consequently, specifically, in addition', 'Sophisticated connections between ideas'] },
      { label: 'Concluding statement related to opinion', standard: 'W.5.1', levels: ['No conclusion', 'Weak ending', 'Conclusion relates to opinion', 'Powerful conclusion synthesizes argument'] },
      { label: 'Uses conventions', standard: 'L.5.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong with advanced punctuation'] },
    ]
  },
  {
    id: 'g5-narrative', name: 'Narrative Writing', grade: 5, domain: 'writing', type: 'narrative',
    criteria: [
      { label: 'Orients reader and establishes situation', standard: 'W.5.3', levels: ['No setup', 'Minimal context', 'Clear situation with characters', 'Engaging opening with vivid setting/characters'] },
      { label: 'Uses narrative techniques', standard: 'W.5.3', levels: ['No techniques', 'Basic telling', 'Dialogue, description, pacing', 'Advanced techniques show character development'] },
      { label: 'Uses transitional words and phrases', standard: 'W.5.3', levels: ['No transitions', 'Basic (then, next)', 'Varied transitions manage sequence', 'Sophisticated pacing creates tension'] },
      { label: 'Uses concrete and sensory details', standard: 'W.5.3', levels: ['No description', 'Basic details', 'Concrete words and sensory details', 'Precise language creates vivid imagery'] },
      { label: 'Provides conclusion that follows events', standard: 'W.5.3', levels: ['No ending', 'Abrupt ending', 'Conclusion follows from narrated events', 'Meaningful ending with reflection/growth'] },
      { label: 'Uses conventions', standard: 'L.5.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'g5-informational', name: 'Informational Writing', grade: 5, domain: 'writing', type: 'informational',
    criteria: [
      { label: 'Introduces topic clearly', standard: 'W.5.2', levels: ['No introduction', 'Vague topic', 'Clear introduction with preview', 'Engaging intro with focused thesis'] },
      { label: 'Develops with facts, details, evidence', standard: 'W.5.2', levels: ['No development', 'Minimal facts', 'Well-developed with multiple sources', 'Rich content with quotations and examples'] },
      { label: 'Groups with headings and illustrations', standard: 'W.5.2', levels: ['No structure', 'Some grouping', 'Clear sections with headings', 'Formatting, illustrations aid comprehension'] },
      { label: 'Uses precise language and vocabulary', standard: 'W.5.2', levels: ['Basic words', 'Some topic words', 'Domain-specific vocabulary', 'Precise, academic language throughout'] },
      { label: 'Provides concluding statement', standard: 'W.5.2', levels: ['No conclusion', 'Weak ending', 'Conclusion related to information', 'Powerful conclusion synthesizes key ideas'] },
      { label: 'Uses conventions', standard: 'L.5.2', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // READING RESPONSE RUBRICS (Generic + Grade-Adapted)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'rr-beginning', name: 'Reading Response (Beginning)', grade: 1, domain: 'reading', type: 'reading_response',
    criteria: [
      { label: 'Writes about the book', levels: ['No response', 'One word or drawing only', 'Writes at least one sentence about book', 'Multiple sentences about book'] },
      { label: 'Sentence is relevant to story', levels: ['Not about book', 'Loosely related', 'Relevant to story', 'Directly addresses story events'] },
      { label: 'Sentence is complete and makes sense', levels: ['Fragment/nonsense', 'Incomplete thought', 'Complete sentence', 'Clear, well-formed sentences'] },
      { label: 'Uses best guess spelling', levels: ['Random letters', 'Some beginning sounds', 'Phonetically accurate', 'Most words spelled correctly'] },
      { label: 'Uses accurate punctuation', levels: ['No punctuation', 'Some attempts', 'Correct punctuation', 'Varied punctuation'] },
      { label: 'Illustration matches words', levels: ['No illustration', 'Unrelated drawing', 'Illustration matches writing', 'Detailed illustration extends meaning'] },
    ]
  },
  {
    id: 'rr-retelling', name: 'Reading Response (Retelling)', grade: 2, domain: 'reading', type: 'retelling',
    criteria: [
      { label: 'Accurately retells story', levels: ['No retelling', 'Inaccurate retelling', 'Accurately retells with characters and events', 'Detailed retelling with all key elements'] },
      { label: 'Retells in order', levels: ['No order', 'Random events', 'Events in order', 'Clear beginning, middle, end sequence'] },
      { label: 'Complete sentences that make sense', levels: ['Fragments', 'Some complete', 'Complete sentences', 'Well-constructed varied sentences'] },
      { label: 'Spelling and conventions', levels: ['Many errors', 'Some sight words correct', 'Sight words correct, good guess spelling', 'Mostly correct spelling'] },
      { label: 'Neatness and spacing', levels: ['Hard to read', 'Some spaces', 'Neat with spaces', 'Excellent handwriting and spacing'] },
      { label: 'Independence', levels: ['Needed full support', 'Needed significant help', 'Mostly independent', 'Fully independent'] },
    ]
  },
  {
    id: 'rr-character', name: 'Character Analysis', grade: 3, domain: 'reading', type: 'character_analysis',
    criteria: [
      { label: 'Identifies character traits', levels: ['No traits identified', 'Names character only', 'Identifies traits with label', 'Multiple traits with nuance'] },
      { label: 'Supports with text evidence', levels: ['No evidence', 'Vague reference', 'Cites relevant text evidence', 'Multiple specific examples from text'] },
      { label: 'Explains how character changes', levels: ['No change described', 'Vague mention of change', 'Describes how and why character changes', 'Insightful analysis of character development'] },
      { label: 'Uses complete sentences', levels: ['Fragments', 'Some complete', 'Complete sentences throughout', 'Well-constructed paragraphs'] },
      { label: 'Conventions', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'rr-nonfiction', name: 'Nonfiction Response', grade: 3, domain: 'reading', type: 'nonfiction',
    criteria: [
      { label: 'Identifies main idea', levels: ['No main idea', 'Vague topic', 'States main idea clearly', 'Main idea with supporting context'] },
      { label: 'Includes key details from text', levels: ['No details', 'One vague detail', 'Key details that support main idea', 'Multiple specific details with connections'] },
      { label: 'Uses text features and vocabulary', levels: ['No text vocabulary', 'One word attempted', 'Uses domain vocabulary from text', 'Integrates vocabulary and references text features'] },
      { label: 'Organized response', levels: ['No organization', 'Some structure', 'Organized with topic sentence', 'Strong structure with intro/body/conclusion'] },
      { label: 'Conventions', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions throughout'] },
    ]
  },
  {
    id: 'rr-general', name: 'Reading Response (General)', grade: 2, domain: 'reading', type: 'reading_response',
    criteria: [
      { label: 'Answers the prompt', levels: ['Does not address prompt', 'Partially addresses prompt', 'Directly answers the prompt', 'Thoroughly addresses all parts'] },
      { label: 'Uses text evidence', levels: ['No reference to text', 'Vague reference', 'Includes relevant details from text', 'Cites specific evidence with explanation'] },
      { label: 'Shows comprehension', levels: ['No understanding shown', 'Partial understanding', 'Demonstrates clear understanding', 'Deep understanding with inferences'] },
      { label: 'Complete sentences', levels: ['Fragments/incomplete', 'Some complete', 'Complete sentences', 'Well-constructed varied sentences'] },
      { label: 'Conventions', levels: ['Many errors', 'Some correct', 'Mostly correct', 'Strong conventions'] },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════
  // SPEAKING RUBRICS
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'sp-presentation', name: 'Oral Presentation', grade: 2, domain: 'speaking', type: 'oral_presentation',
    criteria: [
      { label: 'Content and knowledge', levels: ['Off-topic/no content', 'Minimal content', 'Clear content with details', 'Rich, well-developed ideas'] },
      { label: 'Volume and clarity', levels: ['Cannot be heard', 'Sometimes hard to hear', 'Clear most of the time', 'Clear, confident throughout'] },
      { label: 'Eye contact and posture', levels: ['Reads from paper/looks down', 'Occasional glances up', 'Looks at audience often', 'Natural eye contact throughout'] },
      { label: 'Organization', levels: ['No structure', 'Some organization', 'Clear beginning/middle/end', 'Smooth, logical flow'] },
      { label: 'Language use', levels: ['Single words/L1 only', 'Simple phrases, many errors', 'Complete sentences, some errors', 'Varied sentences, minimal errors'] },
    ]
  },
]
