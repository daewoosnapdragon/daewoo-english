// ─── Phonics quick checks ────────────────────────────────────────
// The program's "Phonics Quick Checks" packet as data: the twenty student
// sheets in the packet's order, each with its words exactly as printed; the
// packet's rubric; the teacher-page checkboxes; and the arithmetic over
// saved checks. Decoding only: the student reads each word aloud from the
// printed sheet (or the screen) and the teacher marks it. Meaning is never
// asked.
//
// Ahead of the packet sit four alphabet sheets of our own, letter names and
// letter sounds, each in capitals and in lower case: all 26 letters, most
// used in English first, in four rows.
// They are scored like any sheet but sit outside the twenty: a mastery
// position counts the decoding sheets only, so a class may skip the
// alphabet (phonicsClassSettings.ts) and its numbers mean the same.
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
  /** Alphabet sheets: the items in rows, a row a section; `words` is the rows run together. */
  sections?: string[][]
  /** What the teacher says, when it is not the packet's "Read these words for me." */
  say?: string
  say_ko?: string
}

export interface PhonicsGroup { id: string; label: string; label_ko: string }

export const PHONICS_CONTENT_VERSION = 'quick-checks-2026-11'

export const ALPHABET_GROUP = 'alphabet'

export const PHONICS_GROUPS: PhonicsGroup[] = [
  { id: ALPHABET_GROUP, label: 'Alphabet', label_ko: '알파벳' },
  { id: 'short', label: 'Short vowels', label_ko: '단모음' },
  { id: 'long', label: 'Long vowels', label_ko: '장모음' },
  { id: 'other', label: 'Other vowels', label_ko: '기타 모음' },
  { id: 'two', label: 'Two-syllable', label_ko: '2음절' },
]

/**
 * The 26 letters, most used in English first (E T A O I N S H R D L C U M
 * W F G Y P B V K J X Q Z), in four sections: the first row is the letters
 * a student meets most, the last the rarest.
 */
export const LETTERS_BY_FREQUENCY: string[][] = [
  ['e', 't', 'a', 'o', 'i', 'n', 's'],
  ['h', 'r', 'd', 'l', 'c', 'u', 'm'],
  ['w', 'f', 'g', 'y', 'p', 'b'],
  ['v', 'k', 'j', 'x', 'q', 'z'],
]
const CAPITALS = LETTERS_BY_FREQUENCY.map(row => row.map(l => l.toUpperCase()))

export const PHONICS_SKILLS: PhonicsSkill[] = [
  // Names and sounds, each in capitals and in lower case. The first sheet of
  // each pair keeps the id it was released with (names in capitals, sounds
  // in lower case), so checks saved before the split stay on their sheet.
  {
    id: 'letter_names', group: ALPHABET_GROUP, label: 'Letter names: capitals', label_ko: '알파벳 이름: 대문자', short: 'Names A',
    covers: 'All 26 capital letters, most common first, in four rows.', patterns: ['look-alikes (M W, M N, E F, O Q)', 'gave the sound, not the name', 'vowels', 'consonants'],
    sections: CAPITALS, words: CAPITALS.flat(),
    say: 'What is the name of this letter?', say_ko: '이 글자의 이름이 뭐예요?',
    ccss: ['RF.K.1d'],
  },
  {
    id: 'letter_names_lower', group: ALPHABET_GROUP, label: 'Letter names: lower case', label_ko: '알파벳 이름: 소문자', short: 'Names a',
    covers: 'All 26 lower-case letters, most common first, in four rows.', patterns: ['b d p q', 'look-alikes (h n, i l, u n)', 'gave the sound, not the name', 'lower case weaker than capitals'],
    sections: LETTERS_BY_FREQUENCY, words: LETTERS_BY_FREQUENCY.flat(),
    say: 'What is the name of this letter?', say_ko: '이 글자의 이름이 뭐예요?',
    ccss: ['RF.K.1d'],
  },
  {
    id: 'letter_sounds_upper', group: ALPHABET_GROUP, label: 'Letter sounds: capitals', label_ko: '알파벳 소리: 대문자', short: 'Sounds A',
    covers: 'All 26 capital letters, most common first. Vowels: the short sound. C and G: hard or soft. X is /ks/, Q is /kw/.', patterns: ['gave the name, not the sound (A → “ay”)', 'short vowels mixed (e i, o u)', 'added “uh” to stops (B → “buh”)', 'Korean sounds (F V Z R L, th)', 'capitals weaker than lower case'],
    sections: CAPITALS, words: CAPITALS.flat(),
    say: 'What sound does this letter make?', say_ko: '이 글자는 무슨 소리가 나요?',
    ccss: ['RF.K.3a', 'RF.K.3b'],
  },
  {
    id: 'letter_sounds', group: ALPHABET_GROUP, label: 'Letter sounds: lower case', label_ko: '알파벳 소리: 소문자', short: 'Sounds a',
    covers: 'All 26 lower-case letters, most common first. Vowels: the short sound. c and g: hard or soft. x is /ks/, q is /kw/.', patterns: ['gave the name, not the sound (a → “ay”)', 'short vowels mixed (e i, o u)', 'added “uh” to stops (b → “buh”)', 'b d p q', 'Korean sounds (f v z r l, th)'],
    sections: LETTERS_BY_FREQUENCY, words: LETTERS_BY_FREQUENCY.flat(),
    say: 'What sound does this letter make?', say_ko: '이 글자는 무슨 소리가 나요?',
    ccss: ['RF.K.3a', 'RF.K.3b'],
  },
  {
    id: 'cvc', group: 'short', label: 'CVC words', label_ko: 'CVC 단어', short: 'CVC',
    covers: 'Consonant-vowel-consonant, every short vowel.', patterns: ['short e / i (pet → pit)', 'short a / e (hat → het)', 'short o / u (top → tup)', 'vowel read long (hat → hate)', 'qu as /k/ (quit → kit)', 'final consonant dropped (big → bi)'],
    words: ['hat', 'big', 'hug', 'pet', 'ten', 'log', 'cap', 'rot', 'sun', 'pan', 'jet', 'top', 'fox', 'let', 'zip', 'mud', 'van', 'quit', 'nut', 'win'],
    ccss: ['RF.K.3b', 'RF.1.2c', 'RF.1.3b'],
  },
  {
    id: 'digraphs', group: 'short', label: 'Digraphs', label_ko: '자음 이중글자', short: 'Digraphs',
    covers: 'sh, ch, th, wh with short vowels.', patterns: ['both letters sounded (shop → s-h-op)', 'sh ch s mixed (chop → shop, shed → sed)', 'th as s, d or t (thin → sin)', 'voiced / unvoiced th (this, thin)', 'wh as /h/ or two sounds', 'final digraph missed (wish → wis)'],
    words: ['shop', 'chop', 'them', 'which', 'chub', 'shed', 'such', 'that', 'thin', 'wish', 'shut', 'chin', 'this', 'then', 'rash', 'hush', 'much', 'with', 'chap', 'when'],
    ccss: ['RF.1.3a'],
  },
  {
    id: 'blends', group: 'short', label: 'Consonant blends', label_ko: '자음군', short: 'Blends',
    covers: 'Beginning and ending blends with short vowels.', patterns: ['one consonant dropped (flat → fat, step → set)', 'nasal dropped (ramp → rap, hint → hit)', 'vowel added inside a blend (flat → fuhlat)', 'r / l swapped (fresh → flesh)', 'final blends weaker than initial', 'order switched (felt → left)'],
    words: ['flat', 'spin', 'skip', 'blush', 'glad', 'step', 'plug', 'crib', 'trash', 'drop', 'fresh', 'felt', 'rest', 'lump', 'ramp', 'just', 'task', 'sent', 'melt', 'hint'],
    ccss: ['RF.1.2b', 'RF.1.3b'],
  },
  {
    id: 'ck_tch_floss', group: 'short', label: 'ck, tch, floss', label_ko: 'ck, tch, 겹자음', short: 'ck tch ff',
    covers: 'ck, tch, and doubled ff, ll, ss, zz after a short vowel.', patterns: ['t sounded in tch (fetch → fet-ch)', 'double letter read twice', 'vowel read long before a double (still → stile)', 'ending wrong with a blend or digraph (switch, crutch)'],
    words: ['stack', 'fetch', 'catch', 'still', 'fluff', 'check', 'shock', 'thick', 'switch', 'match', 'black', 'bell', 'track', 'shell', 'notch', 'buzz', 'miss', 'crutch', 'quick', 'pitch'],
    ccss: ['RF.1.3a', 'L.1.2d'],
  },
  {
    id: 'units', group: 'short', label: 'Closed syllable exceptions', label_ko: '폐음절 예외', short: 'Exceptions',
    covers: '-nk, -ng, -olt, -ost, -old, -ild, -ind, -all.', patterns: ['short vowel in -ind -ild (kind → kinned)', 'short vowel in -old -ost -olt (most, cold)', '-ng -nk as two sounds or half dropped (wing → win)', 'ink / ing mixed', '-all with short a (stall → stal)'],
    words: ['bank', 'host', 'colt', 'bold', 'pink', 'wing', 'hang', 'rink', 'bolt', 'cold', 'most', 'fold', 'wild', 'mind', 'kind', 'child', 'mold', 'stall', 'mild', 'find'],
    ccss: ['RF.1.3a', 'RF.1.3c', 'RF.2.3f'],
  },
  {
    id: 'open', group: 'long', label: 'Open syllables', label_ko: '개음절', short: 'Open',
    covers: 'A vowel at the end says its name; y as long i.', patterns: ['vowel read short (me → meh, go → gaw)', 'y as /ē/ or /y/ (cry → cree)'],
    words: ['sly', 'cry', 'me', 'go', 'so', 'dry', 'fry', 'we', 'he', 'sty', 'fly', 'she', 'try', 'spy', 'shy', 'be'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'silent_e', group: 'long', label: 'Long vowels: silent e', label_ko: '장모음: 매직 e', short: 'Silent e',
    covers: 'a_e, i_e, o_e, u_e.', patterns: ['e ignored, vowel short (made → mad, cute → cut)', 'e pronounced (made → ma-dee)', 'u_e: /yoo/ vs /oo/ (cute, flute)', 'wrong long vowel'],
    words: ['sake', 'made', 'pave', 'flame', 'side', 'ripe', 'dive', 'life', 'code', 'robe', 'mole', 'vote', 'cute', 'cube', 'mule', 'flute', 'state', 'slime', 'joke', 'tube'],
    ccss: ['RF.1.3c'],
  },
  {
    id: 'dge_ge_ce_ve', group: 'long', label: 'dge, ge, ce, ve', label_ko: 'dge, ge, ce, ve', short: 'dge ce ve',
    covers: 'Soft g and c before e, and the ve ending.', patterns: ['hard c / g before e (race → rake, huge → hug)', 'd sounded in dge (bridge → brid-jee)', 'silent e rule on ve (have → hayv, give → gyve)', 'vowel long before ce / ge (since, fence)'],
    words: ['bridge', 'race', 'have', 'stage', 'since', 'fence', 'nice', 'twice', 'huge', 'twelve', 'edge', 'give', 'place', 'fudge', 'cringe', 'chance'],
    ccss: ['RF.2.3e', 'L.2.2d'],
  },
  {
    id: 'vowel_teams', group: 'long', label: 'Long vowels: vowel teams', label_ko: '장모음: 모음 이중글자', short: 'Teams',
    covers: 'ea, ee, ai, ay, oa, ow, igh, ie.', patterns: ['first vowel only, short (feed → fed, boat → bot)', 'both vowels sounded (boat → bo-at)', 'ow as in cow (slow → slou)', 'gh sounded (light → ligt)', 'ie as /ē/ (pie → pee)', 'ea / ee, ai / ay mixed'],
    words: ['deal', 'feed', 'stain', 'fail', 'goal', 'meat', 'slow', 'gray', 'bright', 'sheet', 'read', 'toast', 'stay', 'cream', 'sweep', 'wait', 'boat', 'grow', 'light', 'pie'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'r_controlled', group: 'other', label: 'R-controlled vowels', label_ko: 'r 통제 모음', short: 'Bossy r',
    covers: 'ar, or, er, ir, ur.', patterns: ['r ignored, vowel short (farm → fam, bird → bid)', 'vowel and r sounded apart', 'ar / or mixed (farm → form)', 'er ir ur not the same sound', 'r → l (girl, curl)'],
    words: ['dart', 'firm', 'turn', 'farm', 'corn', 'shark', 'perk', 'torch', 'chart', 'skirt', 'first', 'curl', 'fort', 'storm', 'bird', 'girl', 'verb', 'dark', 'surf', 'part'],
    ccss: ['RF.1.3c', 'RF.2.3b'],
  },
  {
    id: 'oo_ou', group: 'other', label: 'Vowel teams for /ū/, /oo/ and /ou/', label_ko: 'oo, ew, ue, ou, ow', short: 'oo ou',
    covers: 'oo (both sounds), ew, ue, ou, ow.', patterns: ['wrong oo (took → tuke, good → gude)', 'ow as in snow (down → doan, clown → clone)', 'ou as oo or oh (cloud → clood)', 'ew / ue split (blue → bloo-ee)'],
    words: ['stool', 'blew', 'mood', 'took', 'down', 'blue', 'cloud', 'hood', 'mound', 'few', 'now', 'tooth', 'good', 'couch', 'new', 'clue', 'booth', 'clown', 'fruit', 'grew'],
    ccss: ['RF.2.3b'],
  },
  {
    id: 'diphthongs', group: 'other', label: 'Vowel teams: oi, oy, au, aw', label_ko: '이중모음 oi, oy, au, aw', short: 'oi au',
    covers: 'oi, oy, au, aw.', patterns: ['oi / oy as /ō/ (coin → cone, boy → bo)', 'au / aw as ow (law → lou)', 'team split (soil → so-il)'],
    words: ['soil', 'coin', 'toy', 'ploy', 'law', 'launch', 'void', 'fawn', 'crawl', 'point', 'noise', 'boy', 'spoil', 'haul', 'pause', 'saw'],
    ccss: ['RF.2.3b'],
  },
  {
    id: 'two_open_closed', group: 'two', label: 'Two-syllable: open and closed', label_ko: '2음절: 개음절과 폐음절', short: '2-syll',
    covers: 'VCCV, VC/V and V/CV words.', patterns: ['did not flex the split (visit → vy-sit)', 'closed where open (robot → rob-ot, tiny → tin-ee)', 'first syllable read, rest guessed', 'syllable dropped (contest → cotest)', 'stress on the wrong syllable (detect)'],
    words: ['basket', 'contest', 'selfish', 'napkin', 'happen', 'kitten', 'rocket', 'expect', 'solid', 'visit', 'finish', 'closet', 'basic', 'began', 'bonus', 'even', 'crazy', 'robot', 'tiny', 'detect'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'consonant_le', group: 'two', label: 'Consonant -le', label_ko: '자음 + le', short: '-le',
    covers: 'ble, ckle, dle, fle, ple, tle, zle.', patterns: ['e pronounced (puddle → pud-lee)', 'le as “lay”', 'split wrong, vowel short (staple → stapple)', 'vowel added before l'],
    words: ['freckle', 'bubble', 'tackle', 'puddle', 'staple', 'grabble', 'giggle', 'uncle', 'truffle', 'buckle', 'turtle', 'purple', 'dimple', 'jumble', 'tumble', 'rattle', 'sample', 'cradle', 'shuffle', 'puzzle'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'y_vowel', group: 'two', label: 'Y as a vowel', label_ko: '모음 y', short: 'y vowel',
    covers: 'y spelling long e and long i.', patterns: ['y as /ē/ in one syllable (cry → cree)', 'y as /ī/ at the end of two (baby → bay-bye)', 'open first syllable short (lady → laddy)', 'y as /y/'],
    words: ['sly', 'cry', 'baby', 'crazy', 'lady', 'dry', 'fry', 'tacky', 'lazy', 'sty', 'fly', 'try', 'tiny', 'daddy', 'shy', 'tummy', 'puppy', 'windy', 'spy', 'buddy'],
    ccss: ['RF.2.3b', 'RF.2.3c'],
  },
  {
    id: 'one_two_silent_e', group: 'two', label: '1 and 2-syllable: silent e', label_ko: '1~2음절 매직 e', short: '1-2 syll e',
    covers: 'Silent e words, one syllable then two.', patterns: ['silent e syllable short (invite → in-vit)', 'e_e read short (delete, compete)', 'e pronounced', 'first syllable wrong vowel (relate → rel-ate)', 'prefix dropped or misread (re- de- com-)'],
    words: ['slope', 'grade', 'pile', 'joke', 'wake', 'spike', 'hole', 'cute', 'invite', 'delete', 'explore', 'confuse', 'beside', 'relate', 'remote', 'compete', 'advice', 'describe', 'provide', 'locate'],
    ccss: ['RF.1.3c', 'RF.2.3c'],
  },
  {
    id: 'two_silent_e', group: 'two', label: 'Two-syllable: silent e', label_ko: '2음절 매직 e', short: '2-syll e',
    covers: 'Closed or open syllable joined to a silent e syllable.', patterns: ['silent e syllable short (combine → com-bin)', 'closed first syllable read long (frustrate)', 'e_e read short (delete, compete)', 'prefix dropped or misread (re- de- com-)', 'syllable dropped'],
    words: ['frustrate', 'aside', 'translate', 'combine', 'escape', 'costume', 'include', 'alone', 'invite', 'delete', 'explode', 'confuse', 'beside', 'relate', 'remote', 'compete', 'advice', 'describe', 'provide', 'locate'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_r', group: 'two', label: 'Two-syllable: r-controlled vowels', label_ko: '2음절 r 통제', short: '2-syll r',
    covers: 'ar, or, er, ir, ur in longer words.', patterns: ['r ignored, vowel short', 'ar / or mixed', 'er ir ur not the same sound', 'split wrong (river → rye-ver)', 'r → l'],
    words: ['army', 'export', 'perfect', 'burger', 'forget', 'during', 'depart', 'person', 'surprise', 'perform', 'circle', 'normal', 'marble', 'thirsty', 'thunder', 'harvest', 'dirty', 'record', 'concert', 'river'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_vowel_teams', group: 'two', label: 'Two-syllable: long vowel teams', label_ko: '2음절 장모음 이중글자', short: '2-syll VT',
    covers: 'ai, ay, ee, ea, oa, ow, ie in longer words.', patterns: ['team read short in the second syllable (explain → ex-plan)', 'ie as /ī/ (believe → be-lyve)', 'ow as in cow (follow)', 'ea / ee mixed', 'prefix dropped or misread (de- re- com-)'],
    words: ['contain', 'explain', 'complain', 'afraid', 'detail', 'decay', 'display', 'crayon', 'agree', 'between', 'needle', 'proceed', 'decrease', 'defeat', 'creature', 'upload', 'reason', 'release', 'believe', 'follow'],
    ccss: ['RF.2.3c', 'RF.3.3c'],
  },
  {
    id: 'two_more_teams', group: 'two', label: 'Two-syllable: more vowel teams', label_ko: '2음절 기타 모음', short: '2-syll oo',
    covers: 'oo, ew, ue, ou, ow, oi, oy, au, aw in longer words.', patterns: ['ou / ow: cow vs snow (powder, rowdy)', 'ue / ew split (value, rescue)', 'oi / oy as /ō/ (avoid, loyal)', 'au / aw as ow (August, laundry)', 'wrong oo (shampoo, scooter)', 'team split across the syllables'],
    words: ['value', 'about', 'scooter', 'loyal', 'avoid', 'rescue', 'compound', 'laundry', 'destroy', 'awful', 'rebound', 'August', 'shampoo', 'powder', 'toilet', 'mildew', 'mountain', 'lawyer', 'cashew', 'rowdy'],
    ccss: ['RF.3.3c'],
  },
]

export const PHONICS_SKILL_IDS: string[] = PHONICS_SKILLS.map(s => s.id)
const BY_ID: Record<string, PhonicsSkill> = Object.fromEntries(PHONICS_SKILLS.map(s => [s.id, s]))

export function phonicsSkill(id: string): PhonicsSkill | undefined { return BY_ID[id] }
export function skillsInGroup(groupId: string): PhonicsSkill[] { return PHONICS_SKILLS.filter(s => s.group === groupId) }

export const ALPHABET_SKILL_IDS: string[] = skillsInGroup(ALPHABET_GROUP).map(s => s.id)
export function isAlphabetSkill(id: string): boolean { return ALPHABET_SKILL_IDS.includes(id) }
/** The packet's twenty decoding sheets, in order: the sequence a mastery position counts along. */
export const DECODING_SKILL_IDS: string[] = PHONICS_SKILL_IDS.filter(id => !isAlphabetSkill(id))

/** The sheets a class works with: all of them, or the twenty when it skips the alphabet. */
export function classSkills(skipAlphabet: boolean): PhonicsSkill[] {
  return skipAlphabet ? PHONICS_SKILLS.filter(s => !isAlphabetSkill(s.id)) : PHONICS_SKILLS
}
/** The families with a sheet among `skills`, in order. */
export function groupsFor(skills: PhonicsSkill[]): { group: PhonicsGroup; skills: PhonicsSkill[] }[] {
  return PHONICS_GROUPS.map(g => ({ group: g, skills: skills.filter(s => s.group === g.id) })).filter(x => x.skills.length > 0)
}
/** A sheet's number in the packet, 1–20; the alphabet sheets have none. */
export function sheetNo(id: string): string {
  const i = DECODING_SKILL_IDS.indexOf(id)
  return i < 0 ? '' : String(i + 1)
}
/** A student's latest results without the alphabet sheets, for a class that skips them. */
export function withoutAlphabet<T>(latest: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  Object.keys(latest).forEach(k => { if (!isAlphabetSkill(k)) out[k] = latest[k] })
  return out
}

/** Puts skill ids into the packet's order and drops unknown ones. */
export function orderSkills(ids: string[]): string[] {
  const want = new Set(ids)
  return PHONICS_SKILL_IDS.filter(id => want.has(id))
}

// ─── The teacher boxes under each sheet ──────────────────────────
// Ticked per sheet after the student reads, to drive instruction. Three
// short lists under every word sheet: how the student decoded (the packet's
// checkboxes), errors that show on any sheet, and sounds Korean does not
// have, where decoding is fine and the sound is not (speech practice, not
// more phonics). The sheet's own error patterns (PhonicsSkill.patterns) are
// stored as `pattern:<pattern>` in the same array. The packet's two
// positive boxes are gone: a strength shows in the score. Ticks of a box no
// longer listed stay in old checks and are not shown.

export type ObservationGroup = 'how' | 'error' | 'transfer'
export interface DecodingObservation { id: string; group: ObservationGroup; label: string; label_ko: string }

export const OBSERVATION_GROUPS: { id: ObservationGroup; label: string; label_ko: string }[] = [
  { id: 'how', label: 'How they decoded', label_ko: '해독 방식' },
  { id: 'error', label: 'On any sheet', label_ko: '모든 시트 공통 오류' },
  { id: 'transfer', label: 'Korean transfer', label_ko: '한국어 영향' },
]

export const DECODING_OBSERVATIONS: DecodingObservation[] = [
  { id: 'sound_by_sound', group: 'how', label: 'Sounded out slowly, sound by sound', label_ko: '소리 하나씩 천천히 읽음' },
  { id: 'onset_rime', group: 'how', label: 'Blended onset and rime (fl-at)', label_ko: '첫소리와 라임으로 나눠 읽음' },
  { id: 'stretch', group: 'how', label: 'Decoded by stretching sounds', label_ko: '소리를 늘여서 읽음' },
  { id: 'syllables', group: 'how', label: 'Broke the word into syllable parts (bas-ket)', label_ko: '음절로 나눠 읽음' },
  { id: 'some_whole', group: 'how', label: 'Read some words whole, decoded others', label_ko: '일부는 통째로, 일부는 해독' },
  { id: 'slow_accurate', group: 'how', label: 'Accurate but slow: fluency, not decoding', label_ko: '정확하지만 느림 (유창성)' },

  { id: 'guessing', group: 'error', label: 'Guessed from the first letter (chop → chair)', label_ko: '첫 글자로 추측' },
  { id: 'real_word', group: 'error', label: 'Swapped in a real word that looks alike (chop → chip)', label_ko: '비슷한 실제 단어로 바꿔 읽음' },
  { id: 'blend_struggle', group: 'error', label: 'Said the sounds, could not blend them', label_ko: '소리는 알지만 합치지 못함' },
  { id: 'order', group: 'error', label: 'Changed the letter order (felt → left)', label_ko: '글자 순서를 바꿈' },
  { id: 'final_dropped', group: 'error', label: 'Dropped the final sound (rest → res)', label_ko: '끝소리를 빠뜨림' },
  { id: 'omitted', group: 'error', label: 'Left out or swapped a sound in the middle', label_ko: '중간 소리를 빠뜨리거나 바꿈' },
  { id: 'vowel_confusion', group: 'error', label: 'Short / long vowel confusion', label_ko: '단모음/장모음 혼동' },
  { id: 'overgeneral', group: 'error', label: 'Used the newest rule everywhere (cut → cute)', label_ko: '새 규칙을 모든 단어에 적용' },
  { id: 'first_syllable', group: 'error', label: 'Read the first syllable, guessed the rest', label_ko: '첫 음절만 읽고 나머지 추측' },

  { id: 'l1_f_p', group: 'transfer', label: 'f → p (fox → pox)', label_ko: 'f → p' },
  { id: 'l1_v_b', group: 'transfer', label: 'v → b (van → ban)', label_ko: 'v → b' },
  { id: 'l1_z_j', group: 'transfer', label: 'z → j (zip → jip)', label_ko: 'z → j' },
  { id: 'l1_th', group: 'transfer', label: 'th → s, d or t (thin → sin)', label_ko: 'th → s, d, t' },
  { id: 'l1_r_l', group: 'transfer', label: 'r and l mixed (crib → clib)', label_ko: 'r / l 혼동' },
  { id: 'l1_epenthesis', group: 'transfer', label: 'Extra vowel after a consonant (big → bigu)', label_ko: '자음 뒤 모음 추가' },
  { id: 'l1_vowel_pairs', group: 'transfer', label: 'Short vowel pairs merged (a/e, i/ee, o/u)', label_ko: '비슷한 모음 합쳐짐 (a/e, i/ee, o/u)' },
]

export const PATTERN_PREFIX = 'pattern:'

// ─── Instructions ────────────────────────────────────────────────
// From the packet's directions, with the app's own marking rules. Shown
// above the check screen with the universal level-test notes.

export const PHONICS_CHECK_NOTES: string[] = [
  'Decoding only. The student reads each word aloud, left to right; you never ask what it means. A word they have never heard of is still correct if they read it right.',
  'Use a check after teaching a phonics pattern to see whether the student has it, or to find where a new student’s decoding stands. Pick one sheet, several, or all of them.',
  'The student reads from the printed sheet (or Word sheets prints one). Say: “Read these words for me. If you are not sure, sound it out.” Point to the first word and let them set the pace.',
  'Correct: read accurately, including sounded out and then blended (/sh/ /i/ /p/, ship), and self-corrections. Partly: nearly there, one sound off or right only after a long struggle; it counts as half a word. Error: read wrongly, skipped, or nothing after about three seconds. Do not model, teach or correct during the check; the same warm tone for every word.',
  'On an error or a partly, tap the pencil on the tile and write what the student said. The packet asks for this: it is what makes error analysis possible later.',
  'Under each sheet, tick how the student decoded (sounded out, onset and rime, read whole and automatic, guessing) and the patterns that gave trouble. These are notes for teaching; they do not change the score.',
  'The four alphabet sheets come before the packet: letter names and letter sounds, each in capitals and in lower case, all 26 letters most common first, in four rows. For sounds a vowel wants its short sound, c and g either sound, x /ks/ and q /kw/. A class can skip them (Alphabet sheets, above the heat map).',
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

/**
 * Whether a sheet was given in a check: ticked for the sitting and at least
 * one word marked. A sheet ticked but never started (the student went home
 * sick, the bell rang) is not a 0: it counts as not checked, everywhere.
 */
export function sheetGiven(check: Pick<PhonicsCheckRow, 'skills' | 'results'>, skillId: string): boolean {
  return !!check.skills?.includes(skillId) && Object.keys(check.results?.[skillId] || {}).length > 0
}
/** The sheets given in a check, in packet order. */
export function givenSheets(check: Pick<PhonicsCheckRow, 'skills' | 'results'>): string[] {
  return orderSkills(check.skills || []).filter(id => sheetGiven(check, id))
}

/** The score for one sheet of one check, or null if that sheet was not given in the sitting. */
export function scoreSkill(check: Pick<PhonicsCheckRow, 'skills' | 'results'>, skillId: string): SkillScore | null {
  if (!sheetGiven(check, skillId)) return null
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
  const attempts = sortChecksAsc(checks).filter(c => sheetGiven(c, skillId))
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
