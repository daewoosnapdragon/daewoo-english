// ============================================================================
// WIDA ENGLISH LANGUAGE PROFICIENCY LEVELS
// Shared across student badges, hover cards, leveling, and lesson scaffolds.
// ============================================================================

export const WIDA_LEVELS = [
  { level: 1, name: 'Entering', color: '#EF9A9A', bg: '#FFEBEE',
    desc: 'Relies on gestures, pictures, and single words. Cannot follow verbal instructions without visual support. Often silent or uses Korean.',
    scaffolds: 'Use bilingual word walls, picture dictionaries, TPR. Accept drawings as responses. Pair with bilingual buddy.' },
  { level: 2, name: 'Emerging', color: '#FFCC80', bg: '#FFF3E0',
    desc: 'Uses short phrases and memorized chunks. Answers yes/no and simple questions. Writes using word banks and copied patterns.',
    scaffolds: 'Provide word banks and sentence starters. Pre-teach 5-7 key words. Allow extra processing time. Use graphic organizers.' },
  { level: 3, name: 'Developing', color: '#FFF59D', bg: '#FFFDE7',
    desc: 'Speaks in simple sentences with errors. Follows most discussions on familiar topics. Reads with support. Writes paragraphs with frequent errors.',
    scaffolds: 'Use graphic organizers for writing. Pair for think-pair-share. Highlight key text features. Give writing checklists.' },
  { level: 4, name: 'Expanding', color: '#A5D6A7', bg: '#E8F5E9',
    desc: 'Communicates well for most tasks. Reads independently with occasional confusion on academic language. You sometimes forget this student is an ELL.',
    scaffolds: 'Focus on academic vocabulary. Teach editing strategies. Use mentor texts. Challenge with open-ended questions.' },
  { level: 5, name: 'Bridging', color: '#90CAF9', bg: '#E3F2FD',
    desc: 'Near-native fluency. Reads and writes at or near grade level. Errors are minor. Can explain complex ideas to peers.',
    scaffolds: 'Focus on idioms, figurative language, nuance. Assign peer tutoring roles. Teach advanced writing craft.' },
  { level: 6, name: 'Reaching', color: '#CE93D8', bg: '#F3E5F5',
    desc: 'Fully proficient. Indistinguishable from native speakers in most classroom situations. No longer needs ELL-specific scaffolding.',
    scaffolds: 'Enrichment and leadership roles. Focus on content depth. Continue monitoring for regression under stress.' },
]

export const WIDA_DOMAINS = ['listening', 'speaking', 'reading', 'writing'] as const
export type WIDADomainKey = typeof WIDA_DOMAINS[number]
