// ─── Phonics quick checks ────────────────────────────────────────
// The program's "Phonics Quick Checks" packet as data: the twenty student
// sheets in the packet's order, each with its words exactly as printed; the
// packet's rubric; the teacher-page checkboxes; and the arithmetic over
// saved checks. Decoding only: the student reads each word aloud from the
// printed sheet (or the screen) and the teacher marks it. Meaning is never
// asked.
//
// Changing a word: bump PHONICS_CONTENT_VERSION. Saved checks carry the
// version they were made with and are scored on the words they marked, so
// old checks do not move.

/** Correct, partly right (nearly there: one sound off, self-corrected late), or wrong. Partly counts half. */
export type PhonicsMark = 'correct' | 'partial' | 'error'
/** The rubric: Mastered 90%+, Developing 70–89%, Beginning under 70%. */
export type PhonicsBand = 'beginning' | 'developing' | 'mastered'

export interface PhonicsSkill {
  id: string
  group: string
  /** The sheet's title. */
  label: string
  label_ko: string
  /** Heat map column header. */
  short: string
  /** What the sheet covers, one line. */
  covers: string
  /** The graphemes the packet's teacher page lists as checkboxes; marked when they gave trouble. */
  patterns: string[]
  words: string[]
  ccss: string[]
}

export interface PhonicsGroup { id: string; label: string; label_ko: string }

export const PHONICS_CONTENT_VERSION = 'quick-checks-2026-11'

export const PHONICS_GROUPS: PhonicsGroup[] = [
  { id: 'short', label: 'Short vowels', label_ko: '단모음' },
  { id: 'long', label: 'Long vowels', label_ko: '장모음' },
  { id: 'other', label: 'Other vowels', label_ko: '기타 모음' },
  { id: 'two', label: 'Two-syllable', label_ko: '2음절' },
]

export const PHONICS_SKILLS: PhonicsSkill[] = [
  {
    id: 'cvc', group: 'short', label: 'CVC words', label_ko: 'CVC 단어', short: 'CVC',
    covers: 'Consonant-vowel-consonant, every short vowel.', patterns: ['short a', 'short e', 'short i', 'short o', 'short u', 'consonants'],
    words: ['hat', 'big', 'hug', 'pet', 'ten', 'log', 'cap', 'rot', 'sun', 'pan', 'jet', 'top', 'fox', 'let', 'zip', 'mud', 'van', 'quit', 'nut', 'win'],
    ccss: ['RF.K.3b', 'RF.1.2c', 'RF.1.3b'],
  },
  {
    id: 'digraphs', group: 'short', label: 'Digraphs', label_ko: '자음 이중글자', short: 'Digraphs',
    covers: 'sh, ch, th, wh with short vowels.', patterns: ['sh', 'ch', 'th', 'wh', 'short vowels', 'consonants'],
    words: ['shop', 'chop', 'them', 'which', 'chub', 'shed', 'such', 'that', 'thin', 'wish', 'shut', 'chin', 'this', 'then', 'rash', 'hush', 'much', 'with', 'chap', 'when'],
    ccss: ['RF.1.3a'],
  },
  {
    id: 'blends', group: 'short', label: 'Consonant blends', label_ko: '자음군', short: 'Blends',
    covers: 'Beginning and ending blends with short vowels.', patterns: ['beginning blends', 'ending blends', 'short vowels'],
    words: ['flat', 'spin', 'skip', 'blush', 'glad', 'step', 'plug', 'crib', 'trash', 'drop', 'fresh', 'felt', 'rest', 'lump', 'ramp', 'just', 'task', 'sent', 'melt', 'hint'],
    ccss: ['RF.1.2b', 'RF.1.3b'],
  },
  {
    id: 'ck_tch_floss', group: 'short', label: 'ck, tch, floss', label_ko: 'ck, tch, 겹자음', short: 'ck tch ff',
    covers: 'ck, tch, and doubled ff, ll, ss, zz after a short vowel.', patterns: ['ck', 'tch', 'floss (ff ll ss zz)', 'blends', 'digraphs', 'short vowels'],
    words: ['stack', 'fetch', 'catch', 'still', 'fluff', 'check', 'shock', 'thick', 'switch', 'match', 'black', 'bell', 'track', 'shell', 'notch', 'buzz', 'miss', 'crutch', 'quick', 'pitch'],
    ccss: ['RF.1.3a', 'L.1.2d'],
  },
  {
    id: 'units', group: 'short', label: 'Closed syllable exceptions', label_ko: '폐음절 예외', short: 'Exceptions',
    covers: '-nk, -ng, -olt, -ost, -old, -ild, -ind, -all.', patterns: ['-ost', '-old', '-olt', '-ind', '-ild', '-ang/-ank', '-ink/-ing', '-all'],
    words: ['bank', 'host', 'colt', 'bold', 'pink', 'wing', 'hang', 'rink', 'bolt', 'cold', 'most', 'fold', 'wild', 'mind', 'kind', 'child', 'mold', 'stall', 'mild', 'find'],
    ccss: ['RF.1.3a', 'RF.1.3c', 'RF.2.3f'],
  },
  {
    id: 'open', group: 'long', label: 'Open syllables', label_ko: '개음절', short: 'Open',
    covers: 'A vowel at the end says its name; y as long i.', patterns: ['long e', 'long o', 'long i (spelled y)'],
    words: ['sly', 'cry', 'me', 'go', 'so', 'dry', 'fry', 'we', 'he', 'sty', 'fly', 'she', 'try', 'spy', 'shy', 'be'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'silent_e', group: 'long', label: 'Long vowels: silent e', label_ko: '장모음: 매직 e', short: 'Silent e',
    covers: 'a_e, i_e, o_e, u_e.', patterns: ['a_e', 'i_e', 'o_e', 'u_e', 'short for long vowel'],
    words: ['sake', 'made', 'pave', 'flame', 'side', 'ripe', 'dive', 'life', 'code', 'robe', 'mole', 'vote', 'cute', 'cube', 'mule', 'flute', 'state', 'slime', 'joke', 'tube'],
    ccss: ['RF.1.3c'],
  },
  {
    id: 'dge_ge_ce_ve', group: 'long', label: 'dge, ge, ce, ve', label_ko: 'dge, ge, ce, ve', short: 'dge ce ve',
    covers: 'Soft g and c before e, and the ve ending.', patterns: ['dge', 'ge long vowel', 'ge short vowel', 'ce long vowel', 'ce short vowel', 've'],
    words: ['bridge', 'race', 'have', 'stage', 'since', 'fence', 'nice', 'twice', 'huge', 'twelve', 'edge', 'give', 'place', 'fudge', 'cringe', 'chance'],
    ccss: ['RF.2.3e', 'L.2.2d'],
  },
  {
    id: 'vowel_teams', group: 'long', label: 'Long vowels: vowel teams', label_ko: '장모음: 모음 이중글자', short: 'Teams',
    covers: 'ea, ee, ai, ay, oa, ow, igh, ie.', patterns: ['ea/ee', 'ai/ay', 'oa/ow', 'igh/ie', 'vowel confusion'],
    words: ['deal', 'feed', 'stain', 'fail', 'goal', 'meat', 'slow', 'gray', 'bright', 'sheet', 'read', 'toast', 'stay', 'cream', 'sweep', 'wait', 'boat', 'grow', 'light', 'pie'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'r_controlled', group: 'other', label: 'R-controlled vowels', label_ko: 'r 통제 모음', short: 'Bossy r',
    covers: 'ar, or, er, ir, ur.', patterns: ['ar', 'or', 'er', 'ir', 'ur'],
    words: ['dart', 'firm', 'turn', 'farm', 'corn', 'shark', 'perk', 'torch', 'chart', 'skirt', 'first', 'curl', 'fort', 'storm', 'bird', 'girl', 'verb', 'dark', 'surf', 'part'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'oo_ou', group: 'other', label: 'Vowel teams for /ū/, /oo/ and /ou/', label_ko: 'oo, ew, ue, ou, ow', short: 'oo ou',
    covers: 'oo (both sounds), ew, ue, ou, ow.', patterns: ['oo (/ū/)', 'oo (/oo/)', 'ew', 'ue', 'ou', 'ow'],
    words: ['stool', 'blew', 'mood', 'took', 'down', 'blue', 'cloud', 'hood', 'mound', 'few', 'now', 'tooth', 'good', 'couch', 'new', 'clue', 'booth', 'clown', 'fruit', 'grew'],
    ccss: ['RF.2.3b'],
  },
  {
    id: 'diphthongs', group: 'other', label: 'Vowel teams: oi, oy, au, aw', label_ko: '이중모음 oi, oy, au, aw', short: 'oi au',
    covers: 'oi, oy, au, aw.', patterns: ['oi', 'oy', 'au', 'aw'],
    words: ['soil', 'coin', 'toy', 'ploy', 'law', 'launch', 'void', 'fawn', 'crawl', 'point', 'noise', 'boy', 'spoil', 'haul', 'pause', 'saw'],
    ccss: ['RF.2.3b'],
  },
  {
    id: 'two_open_closed', group: 'two', label: 'Two-syllable: open and closed', label_ko: '2음절: 개음절과 폐음절', short: '2-syll',
    covers: 'VCCV, VC/V and V/CV words.', patterns: ['VCCV', 'V-CV', 'VC-V'],
    words: ['basket', 'contest', 'selfish', 'napkin', 'happen', 'kitten', 'rocket', 'expect', 'solid', 'visit', 'finish', 'closet', 'basic', 'began', 'bonus', 'even', 'crazy', 'robot', 'tiny', 'detect'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'consonant_le', group: 'two', label: 'Consonant -le', label_ko: '자음 + le', short: '-le',
    covers: 'ble, ckle, dle, fle, ple, tle, zle.', patterns: ['ble', 'ckle', 'dle', 'fle', 'ple', 'tle', 'zle'],
    words: ['freckle', 'bubble', 'tackle', 'puddle', 'staple', 'grabble', 'giggle', 'uncle', 'truffle', 'buckle', 'turtle', 'purple', 'dimple', 'jumble', 'tumble', 'rattle', 'sample', 'cradle', 'shuffle', 'puzzle'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'y_vowel', group: 'two', label: 'Y as a vowel', label_ko: '모음 y', short: 'y vowel',
    covers: 'y spelling long e and long i.', patterns: ['y spells /ē/', 'y spells /ī/'],
    words: ['sly', 'cry', 'baby', 'crazy', 'lady', 'dry', 'fry', 'tacky', 'lazy', 'sty', 'fly', 'try', 'tiny', 'daddy', 'shy', 'tummy', 'puppy', 'windy', 'spy', 'buddy'],
    ccss: ['RF.2.3b', 'RF.2.3c'],
  },
  {
    id: 'one_two_silent_e', group: 'two', label: '1 and 2-syllable: silent e', label_ko: '1~2음절 매직 e', short: '1-2 syll e',
    covers: 'Silent e words, one syllable then two.', patterns: ['a_e', 'e_e', 'i_e', 'o_e', 'u_e', 'closed + silent e', 'open + silent e'],
    words: ['slope', 'grade', 'pile', 'joke', 'wake', 'spike', 'hole', 'cute', 'invite', 'delete', 'explore', 'confuse', 'beside', 'relate', 'remote', 'compete', 'advice', 'describe', 'provide', 'locate'],
    ccss: ['RF.1.3c', 'RF.2.3c'],
  },
  {
    id: 'two_silent_e', group: 'two', label: 'Two-syllable: silent e', label_ko: '2음절 매직 e', short: '2-syll e',
    covers: 'Closed or open syllable joined to a silent e syllable.', patterns: ['closed + silent e', 'open + silent e', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e'],
    words: ['frustrate', 'aside', 'translate', 'combine', 'escape', 'costume', 'include', 'alone', 'invite', 'delete', 'explode', 'confuse', 'beside', 'relate', 'remote', 'compete', 'advice', 'describe', 'provide', 'locate'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_r', group: 'two', label: 'Two-syllable: r-controlled vowels', label_ko: '2음절 r 통제', short: '2-syll r',
    covers: 'ar, or, er, ir, ur in longer words.', patterns: ['ar', 'or', 'er', 'ur', 'ir'],
    words: ['army', 'export', 'perfect', 'burger', 'forget', 'during', 'depart', 'person', 'surprise', 'perform', 'circle', 'normal', 'marble', 'thirsty', 'thunder', 'harvest', 'dirty', 'record', 'concert', 'river'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_vowel_teams', group: 'two', label: 'Two-syllable: long vowel teams', label_ko: '2음절 장모음 이중글자', short: '2-syll VT',
    covers: 'ai, ay, ee, ea, oa, ow, ie in longer words.', patterns: ['ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'ie'],
    words: ['contain', 'explain', 'complain', 'afraid', 'detail', 'decay', 'display', 'crayon', 'agree', 'between', 'needle', 'proceed', 'decrease', 'defeat', 'creature', 'upload', 'reason', 'release', 'believe', 'follow'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_more_teams', group: 'two', label: 'Two-syllable: more vowel teams', label_ko: '2음절 기타 모음', short: '2-syll oo',
    covers: 'oo, ew, ue, ou, ow, oi, oy, au, aw in longer words.', patterns: ['oo', 'ew', 'ue', 'ou', 'ow', 'oi', 'oy', 'au', 'aw'],
    words: ['value', 'about', 'scooter', 'loyal', 'avoid', 'rescue', 'compound', 'laundry', 'destroy', 'awful', 'rebound', 'August', 'shampoo', 'powder', 'toilet', 'mildew', 'mountain', 'lawyer', 'cashew', 'rowdy'],
    ccss: ['RF.3.3c'],
  },
]

export const PHONICS_SKILL_IDS: string[] = PHONICS_SKILLS.map(s => s.id)
const BY_ID: Record<string, PhonicsSkill> = Object.fromEntries(PHONICS_SKILLS.map(s => [s.id, s]))

export function phonicsSkill(id: string): PhonicsSkill | undefined { return BY_ID[id] }
export function skillsInGroup(groupId: string): PhonicsSkill[] { return PHONICS_SKILLS.filter(s => s.group === groupId) }

/** Puts skill ids into the packet's order and drops unknown ones. */
export function orderSkills(ids: string[]): string[] {
  const want = new Set(ids)
  return PHONICS_SKILL_IDS.filter(id => want.has(id))
}

// ─── The packet's teacher-page checkboxes ────────────────────────
// Ticked per sheet after the student reads, to drive instruction. Pattern
// trouble is stored as `pattern:<grapheme>` in the same array.

export interface DecodingObservation { id: string; label: string; label_ko: string }

export const DECODING_OBSERVATIONS: DecodingObservation[] = [
  { id: 'blend_struggle', label: 'Knew the letter-sounds, but struggled to blend', label_ko: '글자 소리는 알지만 합치지 못함' },
  { id: 'sound_by_sound', label: 'Sounded out slowly, sound by sound', label_ko: '소리 하나씩 천천히 읽음' },
  { id: 'onset_rime', label: 'Blended onset and rime (fl-at)', label_ko: '첫소리와 라임으로 나눠 읽음' },
  { id: 'stretch', label: 'Decoded by stretching sounds', label_ko: '소리를 늘여서 읽음' },
  { id: 'syllables', label: 'Broke the word into syllable parts (bas-ket)', label_ko: '음절로 나눠 읽음' },
  { id: 'first_syllable', label: 'Read the first syllable, not the second', label_ko: '첫 음절만 맞게 읽음' },
  { id: 'some_whole', label: 'Read some words whole, decoded others', label_ko: '일부는 통째로, 일부는 해독' },
  { id: 'automatic', label: 'Read most words whole; automatic', label_ko: '대부분 통째로, 자동 인식' },
  { id: 'guessing', label: 'Guessing, not decoding or automatic recognition', label_ko: '해독 없이 추측' },
  { id: 'omitted', label: 'Omitted or substituted a sound', label_ko: '소리를 빠뜨리거나 바꿈' },
  { id: 'vowel_confusion', label: 'Short/long vowel confusion', label_ko: '단모음/장모음 혼동' },
  { id: 'flexible', label: 'Flexible with adjusting vowel sounds when needed', label_ko: '모음 소리를 유연하게 조정' },
]

export const PATTERN_PREFIX = 'pattern:'

// ─── Instructions ────────────────────────────────────────────────
// From the packet's directions, with the app's own marking rules. Shown
// above the check screen with the universal level-test notes.

export const PHONICS_CHECK_NOTES: string[] = [
  'Decoding only. The student reads each word aloud, left to right; you never ask what it means. A word they have never heard of is still correct if they read it right.',
  'Use a check after teaching a phonics pattern to see whether the student has it, or to find where a new student’s decoding stands. Pick one sheet, several, or all twenty.',
  'The student reads from the printed sheet (or Word sheets prints one). Say: “Read these words for me. If you are not sure, sound it out.” Point to the first word and let them set the pace.',
  'Correct: read accurately, including sounded out and then blended (/sh/ /i/ /p/, ship), and self-corrections. Partly: nearly there, one sound off or right only after a long struggle; it counts as half a word. Error: read wrongly, skipped, or nothing after about three seconds. Do not model, teach or correct during the check; the same warm tone for every word.',
  'On an error or a partly, tap the pencil on the tile and write what the student said. The packet asks for this: it is what makes error analysis possible later.',
  'Under each sheet, tick how the student decoded (sounded out, onset and rime, read whole and automatic, guessing) and the patterns that gave trouble. These are notes for teaching; they do not change the score.',
  'Stop a sheet after five errors in a row. Leave the remaining words untouched: they are saved as not read, not as errors.',
  'Accuracy is words correct over words on the sheet, a partly counting half. Beginning, under 70%, needs intervention; Developing, 70–89%, needs guided practice; Mastered, 90% and up, has the pattern.',
  'A phonics check is never graded. It sits on the student page and the leveling screens as information, so a reader who sounds fluent but has gaps in decoding is not missed.',
]

// ─── Saved checks ────────────────────────────────────────────────

export interface PhonicsCheckRow {
  id: string
  student_id: string
  date: string
  assessed_by: string | null
  /** Skill ids (sheets) read in this sitting. */
  skills: string[]
  /** { skillId: { word: mark } }. A word with no entry was not read. */
  results: Record<string, Record<string, PhonicsMark>>
  /** { skillId: { word: what the student said } } for errors and partlys. */
  heard: Record<string, Record<string, string>>
  /** { skillId: observation ids and pattern:<grapheme> entries }. */
  observations: Record<string, string[]>
  notes: string
  content_version: string
  created_at?: string
  updated_at?: string
}

export interface SkillScore {
  skill: string
  correct: number
  /** Partly right: nearly there. Each counts half a correct word. */
  partial: number
  errors: number
  /** Words on the sheet with no mark: the teacher stopped early. */
  unread: number
  total: number
  /** (correct + partial / 2) / total, 0–100. */
  pct: number
}

/** 17, or 17½ with a partly in it. */
export function halfText(correct: number, partial: number): string {
  const whole = correct + Math.floor(partial / 2)
  return partial % 2 ? `${whole}½` : `${whole}`
}
/** "17½/20": words right over words on the sheet. */
export function scoreText(s: Pick<SkillScore, 'correct' | 'partial' | 'total'>): string {
  return `${halfText(s.correct, s.partial)}/${s.total}`
}
export function accuracyPct(correct: number, partial: number, total: number): number {
  return total ? Math.round(((correct + partial / 2) / total) * 100) : 0
}

/**
 * The words a saved check was scored on: the current sheet, plus any marked
 * word no longer on it (an older version of the sheet), so a check made with
 * other words still adds up.
 */
export function wordsScored(check: Pick<PhonicsCheckRow, 'results'>, skillId: string): string[] {
  const base = phonicsSkill(skillId)?.words || []
  const marked = Object.keys(check.results?.[skillId] || {})
  return [...base, ...marked.filter(w => !base.includes(w))]
}

/** The score for one sheet of one check, or null if that sheet was not part of the sitting. */
export function scoreSkill(check: Pick<PhonicsCheckRow, 'skills' | 'results'>, skillId: string): SkillScore | null {
  if (!check.skills?.includes(skillId)) return null
  const words = wordsScored(check, skillId)
  const marks = check.results?.[skillId] || {}
  let correct = 0, partial = 0, errors = 0
  words.forEach(w => { if (marks[w] === 'correct') correct++; else if (marks[w] === 'partial') partial++; else if (marks[w] === 'error') errors++ })
  const total = words.length
  return {
    skill: skillId, correct, partial, errors, unread: total - correct - partial - errors, total,
    pct: accuracyPct(correct, partial, total),
  }
}

/** Every sheet of a check, in packet order. */
export function scoreCheck(check: Pick<PhonicsCheckRow, 'skills' | 'results'>): SkillScore[] {
  return orderSkills(check.skills || []).map(id => scoreSkill(check, id)).filter((s): s is SkillScore => s != null)
}

export interface LatestSkill { score: SkillScore; date: string; checkId: string }
export type LatestBySkill = Record<string, LatestSkill>

/**
 * For one student's checks: the most recent result per sheet. A sheet read
 * twice keeps the later date; the same date keeps the later save.
 */
export function latestBySkill(checks: PhonicsCheckRow[]): LatestBySkill {
  const sorted = [...checks].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created_at || '').localeCompare(a.created_at || ''))
  const out: LatestBySkill = {}
  sorted.forEach(c => {
    scoreCheck(c).forEach(s => { if (!out[s.skill]) out[s.skill] = { score: s, date: c.date, checkId: c.id } })
  })
  return out
}

/** The rubric from a score: 90%+ mastered, 70–89% developing, under 70% beginning. */
export function phonicsBand(score: Pick<SkillScore, 'pct'>): PhonicsBand {
  if (score.pct >= 90) return 'mastered'
  return score.pct >= 70 ? 'developing' : 'beginning'
}

export const PHONICS_BAND_LABELS: Record<PhonicsBand, { en: string; ko: string; means: string }> = {
  beginning: { en: 'Beginning', ko: '시작 단계', means: 'Under 70%: needs intervention' },
  developing: { en: 'Developing', ko: '발달 중', means: '70–89%: needs guided practice' },
  mastered: { en: 'Mastered', ko: '완성', means: '90% or more: has the pattern' },
}

/** Mastered: the sheet is got. Kept as a name because "secure" reads better in the summaries. */
export function isSecure(band: PhonicsBand): boolean { return band === 'mastered' }

export interface StudentPhonicsSummary {
  tested: number
  secure: number
  developing: number
  beginning: number
  /** The first sheet in packet order that is not yet mastered, among those tested. */
  frontier: string | null
  /** The highest sheet in packet order that is mastered. */
  highestSecure: string | null
  lastDate: string | null
}

export function summarizeStudent(latest: LatestBySkill): StudentPhonicsSummary {
  const ids = orderSkills(Object.keys(latest))
  let secure = 0, developing = 0, beginning = 0, frontier: string | null = null, highestSecure: string | null = null, lastDate: string | null = null
  ids.forEach(id => {
    const b = phonicsBand(latest[id].score)
    if (isSecure(b)) { secure++; highestSecure = id } else if (b === 'developing') developing++; else beginning++
    if (!isSecure(b) && !frontier) frontier = id
    if (!lastDate || latest[id].date > lastDate) lastDate = latest[id].date
  })
  return { tested: ids.length, secure, developing, beginning, frontier, highestSecure, lastDate }
}

/** "CVC 18/20 · Digraphs 14½/20 · Silent e 9/20", in packet order. */
export function phonicsOneLiner(latest: LatestBySkill): string {
  return orderSkills(Object.keys(latest)).map(id => `${phonicsSkill(id)?.short || id} ${scoreText(latest[id].score)}`).join(' · ')
}

/** The sheets a teacher would recheck: tested and not yet mastered. */
export function notYetSecure(latest: LatestBySkill): string[] {
  return orderSkills(Object.keys(latest)).filter(id => !isSecure(phonicsBand(latest[id].score)))
}

/**
 * Cycling a word tile: nothing → correct → error → partial → nothing, so
 * one tap is correct and two is an error, the two common cases. Marks are
 * kept sparse, so the mark comes back as undefined when the tile is cleared.
 */
export function nextMark(current: PhonicsMark | undefined): PhonicsMark | undefined {
  return current === undefined ? 'correct' : current === 'correct' ? 'error' : current === 'error' ? 'partial' : undefined
}

/** A word the student did not get right: an error or a partly. */
export function isMiss(m: PhonicsMark | undefined): boolean { return m === 'error' || m === 'partial' }

/** The longest run of consecutive errors in sheet order: five means stop. A partly breaks the run. */
export function longestErrorRun(words: string[], marks: Record<string, PhonicsMark>): number {
  let run = 0, max = 0
  words.forEach(w => { if (marks[w] === 'error') { run++; max = Math.max(max, run) } else run = 0 })
  return max
}

// ─── Attempts over time ──────────────────────────────────────────
// Every sitting is kept, so progress is the same rows read in date order.

export interface Attempt { checkId: string; date: string; score: SkillScore }

/** Checks oldest first: by date, then by save time. */
export function sortChecksAsc(checks: PhonicsCheckRow[]): PhonicsCheckRow[] {
  return [...checks].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.created_at || '').localeCompare(b.created_at || ''))
}

/** For one student's checks: every attempt at each sheet, oldest first. */
export function attemptsBySkill(checks: PhonicsCheckRow[]): Record<string, Attempt[]> {
  const out: Record<string, Attempt[]> = {}
  sortChecksAsc(checks).forEach(c => {
    scoreCheck(c).forEach(s => { (out[s.skill] ||= []).push({ checkId: c.id, date: c.date, score: s }) })
  })
  return out
}

/** Latest accuracy minus the attempt before it, or null with fewer than two attempts. */
export function latestDelta(attempts: Attempt[] | undefined): number | null {
  if (!attempts || attempts.length < 2) return null
  return attempts[attempts.length - 1].score.pct - attempts[attempts.length - 2].score.pct
}

export interface WordHistory {
  word: string
  /** One entry per attempt at the sheet, oldest first; undefined when the word was not read. */
  marks: (PhonicsMark | undefined)[]
  misses: number
}

/**
 * How each word on a sheet went across the student's attempts at it, words
 * missed most often first and then in sheet order. A partly counts as a
 * miss. Words always read right are left out: the point is to see what
 * keeps tripping the student.
 */
export function wordHistory(checks: PhonicsCheckRow[], skillId: string): WordHistory[] {
  const attempts = sortChecksAsc(checks).filter(c => c.skills?.includes(skillId))
  if (attempts.length === 0) return []
  const words = phonicsSkill(skillId)?.words || []
  const extra = new Set<string>()
  attempts.forEach(c => Object.keys(c.results?.[skillId] || {}).forEach(w => { if (!words.includes(w)) extra.add(w) }))
  const all = words.concat(Array.from(extra))
  return all
    .map((word, i) => {
      const marks = attempts.map(c => c.results?.[skillId]?.[word])
      return { word, marks, misses: marks.filter(isMiss).length, i }
    })
    .filter(h => h.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.i - b.i)
    .map(({ i: _i, ...h }) => h)
}
