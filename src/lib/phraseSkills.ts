// ─── Which skill each bank phrase is about ───────────────────────
// Keyed by the phrase's seed_key (scripts/comment-bank), valued with CCSS
// skill families as the standards picker names them ("RL.2", "RF.3",
// "W.1"). The builder puts the sentences for skills a class has actually
// taught or assessed first and folds the rest away. A phrase with no
// entry here is general and always shows. Openers, closers and behavior
// have no skill. Kept in code rather than the table so the seed stays
// re-runnable and a teacher's own added phrases simply count as general.

export const PHRASE_SKILLS: Record<string, string[]> = {
  // Reading
  'reading-001': ['RL.10'], 'reading-002': ['RI.2'], 'reading-003': ['RL.3', 'RL.1'], 'reading-004': ['RL.2'], 'reading-005': ['RI.9'],
  'reading-006': ['RI.5'], 'reading-007': ['RF.3', 'L.4'], 'reading-008': ['RL.1', 'RI.1'], 'reading-009': ['RF.4'], 'reading-010': ['RL.1'],
  'reading-011': ['RL.2', 'RL.5'], 'reading-012': ['RL.3'], 'reading-013': ['RL.2'], 'reading-014': ['RI.2'], 'reading-015': ['RL.1', 'RL.3'],
  'reading-016': ['L.4'], 'reading-017': ['RF.4'], 'reading-018': ['RF.4', 'RL.7'], 'reading-019': ['RL.1'], 'reading-020': ['RL.2'],
  'reading-021': ['RL.2', 'RI.2'], 'reading-022': ['RI.2'], 'reading-023': ['RF.3', 'L.4'], 'reading-024': ['RF.4'], 'reading-025': ['RL.1'],
  'reading-026': ['RF.4'], 'reading-027': ['RF.3'], 'reading-028': ['RL.1'], 'reading-029': ['RF.4'], 'reading-030': ['RF.4', 'RL.10'],
  'reading-031': ['RF.4'], 'reading-032': ['RF.4'], 'reading-033': ['RF.4'], 'reading-034': ['RF.4'],
  // Phonics
  'phonics-001': ['RF.2', 'RF.3'], 'phonics-002': ['RF.3'], 'phonics-003': ['RF.3'], 'phonics-004': ['RF.3'], 'phonics-005': ['RF.3'],
  'phonics-006': ['RF.3'], 'phonics-007': ['RF.3'], 'phonics-008': ['L.2', 'RF.3'], 'phonics-009': ['RF.2', 'RF.3'], 'phonics-010': ['RF.3'],
  'phonics-011': ['RF.3'], 'phonics-012': ['RF.3'], 'phonics-013': ['RF.3'], 'phonics-014': ['RF.3'], 'phonics-015': ['RF.3'],
  'phonics-016': ['RF.2'], 'phonics-017': ['RF.2', 'RF.3'], 'phonics-018': ['RF.1', 'RF.3'], 'phonics-019': ['RF.3'], 'phonics-020': ['RF.3'],
  'phonics-021': ['RF.3'], 'phonics-022': ['L.2', 'RF.3'], 'phonics-023': ['RF.3'], 'phonics-024': ['RF.3'],
  // Writing
  'writing-001': ['W.2', 'W.4'], 'writing-002': ['W.4'], 'writing-003': ['W.4', 'W.5'], 'writing-004': ['L.2'], 'writing-005': ['W.1'],
  'writing-006': ['W.3'], 'writing-007': ['L.3', 'W.4'], 'writing-008': ['W.5'], 'writing-009': ['L.2', 'W.10'], 'writing-010': ['W.4', 'W.10'],
  'writing-011': ['L.2'], 'writing-012': ['L.1'], 'writing-013': ['W.5', 'W.4'], 'writing-014': ['W.2', 'W.4'], 'writing-015': ['L.2'],
  'writing-016': ['W.1'], 'writing-017': ['W.3', 'W.2'], 'writing-018': ['W.4', 'W.10'], 'writing-019': ['W.10'], 'writing-020': ['L.2', 'W.10'],
  'writing-021': ['L.2', 'RF.3'], 'writing-022': ['W.5'], 'writing-023': ['W.5', 'W.4'], 'writing-024': ['L.2'], 'writing-025': ['W.4', 'W.2'],
  'writing-026': ['W.1'], 'writing-027': ['W.10', 'W.5'], 'writing-028': ['W.10'], 'writing-029': ['L.1'], 'writing-030': ['L.2'],
  'writing-031': ['W.10'], 'writing-032': ['W.4', 'W.5'], 'writing-033': ['W.4'],
  // Speaking and listening
  'speaking-001': ['SL.6', 'SL.1'], 'speaking-002': ['SL.2'], 'speaking-003': ['SL.2'], 'speaking-004': ['SL.6', 'SL.4'], 'speaking-005': ['SL.1'],
  'speaking-006': ['SL.4'], 'speaking-007': ['SL.1', 'SL.6'], 'speaking-008': ['SL.3'], 'speaking-009': ['L.6', 'SL.6'], 'speaking-010': ['SL.6'],
  'speaking-011': ['SL.2'], 'speaking-012': ['SL.1', 'SL.4'], 'speaking-013': ['SL.2', 'SL.3'], 'speaking-014': ['SL.1'], 'speaking-015': ['SL.4', 'SL.6'],
  'speaking-016': ['SL.1'], 'speaking-017': ['SL.6'], 'speaking-018': ['SL.2'], 'speaking-019': ['SL.4', 'SL.6'], 'speaking-020': ['SL.1', 'SL.6'],
  'speaking-021': ['SL.2'], 'speaking-022': ['SL.1'], 'speaking-023': ['SL.1', 'SL.6'], 'speaking-024': ['SL.6'], 'speaking-025': ['SL.6'],
  // Language
  'language-001': ['L.1'], 'language-002': ['L.1'], 'language-003': ['L.2'], 'language-004': ['L.1'], 'language-005': ['L.4'],
  'language-006': ['L.6'], 'language-007': ['L.1'], 'language-008': ['L.1'], 'language-009': ['L.1'], 'language-010': ['L.1'],
  'language-011': ['L.6'], 'language-012': ['L.1'], 'language-013': ['L.2'], 'language-014': ['L.2', 'L.6'], 'language-015': ['L.1'],
  'language-016': ['L.1'], 'language-017': ['L.6'], 'language-018': ['L.1', 'L.2'], 'language-019': ['L.1'], 'language-020': ['L.1'],
  'language-021': ['L.1'],
  // Next-step ladders
  'ladder-001': ['SL.2', 'RL.7'], 'ladder-002': ['RF.4', 'RL.10'], 'ladder-003': ['RF.4', 'RL.10'], 'ladder-004': ['RL.2'], 'ladder-005': ['RL.3', 'RL.10'],
  'ladder-006': ['RI.2', 'RI.8'], 'ladder-007': ['RF.2', 'RF.3'], 'ladder-008': ['RF.2', 'RF.3'], 'ladder-009': ['RF.3'], 'ladder-010': ['RF.3'],
  'ladder-011': ['RF.3'], 'ladder-012': ['RF.3'], 'ladder-013': ['L.1', 'RF.1'], 'ladder-014': ['L.2', 'RF.3'], 'ladder-015': ['L.2', 'W.10'],
  'ladder-016': ['W.10', 'W.4'], 'ladder-017': ['W.2', 'W.4'], 'ladder-018': ['W.5'], 'ladder-019': ['SL.6', 'SL.2'], 'ladder-020': ['SL.6'],
  'ladder-021': ['SL.3', 'SL.1'], 'ladder-022': ['SL.4'], 'ladder-023': ['SL.4', 'RL.2'], 'ladder-024': ['SL.4'], 'ladder-025': ['L.6'],
  'ladder-026': ['L.1'], 'ladder-027': ['L.2'], 'ladder-028': ['L.1'], 'ladder-029': ['L.1'], 'ladder-030': ['L.3'],
}

/** The skill families that belong to each builder area, for the chips. */
export const AREA_FAMILIES: Record<string, string[]> = {
  reading: ['RL.1', 'RL.2', 'RL.3', 'RL.4', 'RL.5', 'RL.6', 'RL.7', 'RL.9', 'RL.10', 'RI.1', 'RI.2', 'RI.3', 'RI.4', 'RI.5', 'RI.6', 'RI.7', 'RI.8', 'RI.9', 'RI.10', 'RF.4'],
  phonics: ['RF.1', 'RF.2', 'RF.3'],
  writing: ['W.1', 'W.2', 'W.3', 'W.4', 'W.5', 'W.6', 'W.7', 'W.8', 'W.9', 'W.10'],
  speaking: ['SL.1', 'SL.2', 'SL.3', 'SL.4', 'SL.5', 'SL.6'],
  language: ['L.1', 'L.2', 'L.3', 'L.4', 'L.5', 'L.6'],
}

export function skillsOf(seedKey: string | null | undefined): string[] {
  return (seedKey && PHRASE_SKILLS[seedKey]) || []
}
