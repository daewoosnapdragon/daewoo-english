// ─── Phonics quick checks ────────────────────────────────────────
// The program's "Phonics Quick Checks" packet as data: the student sheets
// in the packet's order, each with its words exactly as printed, after an
// alphabet sheet of our own that comes before CVC; the
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
  /** Tiles across, on screen and printed; 4 when absent. */
  columns?: number
}

export interface PhonicsGroup { id: string; label: string; label_ko: string }

export const PHONICS_CONTENT_VERSION = 'quick-checks-2026-11'

export const PHONICS_GROUPS: PhonicsGroup[] = [
  { id: 'letters', label: 'ABC', label_ko: '알파벳' },
  { id: 'short', label: 'Short vowels', label_ko: '단모음' },
  { id: 'long', label: 'Long vowels', label_ko: '장모음' },
  { id: 'other', label: 'Other vowels', label_ko: '기타 모음' },
  { id: 'two', label: 'Two-syllable', label_ko: '2음절' },
]

export const PHONICS_SKILLS: PhonicsSkill[] = [
  {
    // Not in the packet: letter names before any decoding. Capitals, then
    // lowercase, each in mixed order, a row of 13 at a time.
    id: 'alphabet', group: 'letters', label: 'Alphabet: capitals and lowercase', label_ko: '알파벳: 대문자와 소문자', short: 'ABC',
    covers: 'Name each letter. Capitals, then lowercase, each in mixed order.', patterns: ['capitals', 'lowercase', 'b d p q', 'm n u', 'vowels'],
    words: [
      'S', 'O', 'M', 'B', 'X', 'F', 'K', 'A', 'R', 'H', 'Z', 'D', 'U',
      'J', 'E', 'Q', 'L', 'C', 'W', 'I', 'T', 'G', 'Y', 'N', 'P', 'V',
      'd', 't', 'a', 'n', 'q', 'i', 'g', 'w', 'e', 'k', 'b', 'r', 'y',
      'm', 'u', 'h', 'p', 'f', 'z', 'l', 'c', 'x', 'o', 'j', 's', 'v',
    ],
    ccss: ['RF.K.1d'],
    columns: 13,
  },
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
/** Sheets in all, the top of the position scale. */
export const PHONICS_SHEET_COUNT = PHONICS_SKILLS.length
const BY_ID: Record<string, PhonicsSkill> = Object.fromEntries(PHONICS_SKILLS.map(s => [s.id, s]))

export function phonicsSkill(id: string): PhonicsSkill | undefined { return BY_ID[id] }
export function skillsInGroup(groupId: string): PhonicsSkill[] { return PHONICS_SKILLS.filter(s => s.group === groupId) }

/** Puts skill ids into the packet's order and drops unknown ones. */
export function orderSkills(ids: string[]): string[] {
  const want = new Set(ids)
  return PHONICS_SKILL_IDS.filter(id => want.has(id))
}

// ─── The teacher's error checkboxes ──────────────────────────────
// Ticked per sheet after the student reads, to name what went wrong and
// group students by it. Errors only: strengths go in the check's notes.
// Each sheet has its own few, with an example from its words, then the
// handful every word sheet (or every two-syllable sheet) shares. An id can
// recur on several sheets with the same meaning; counts are kept per sheet.
// Pattern trouble is stored as `pattern:<grapheme>` in the same array.

export interface SheetError { id: string; label: string; label_ko: string }

const E = (id: string, label: string, label_ko: string): SheetError => ({ id, label, label_ko })

/** Every word sheet (not the alphabet). */
const WORD_SHEET_ERRORS: SheetError[] = [
  E('blend_struggle', 'Knew the sounds, couldn’t blend', '소리는 알지만 합치지 못함'),
  E('sound_by_sound', 'Slow, sound by sound', '한 소리씩 천천히'),
  E('guessing', 'Guessed from the first letter', '첫 글자만 보고 추측'),
]
/** Every two-syllable sheet, before the word-sheet ones. */
const TWO_SYLLABLE_ERRORS: SheetError[] = [
  E('wrong_split', 'Split in the wrong place (rob-ot)', '음절을 잘못 나눔 (rob-ot)'),
  E('first_syllable', 'Read the first syllable, lost the second', '첫 음절만 맞게 읽음'),
]

const SHEET_ERRORS: Record<string, SheetError[]> = {
  alphabet: [
    E('sound_not_name', 'Said the sound, not the name', '이름 대신 소리로 답함'),
    E('bd_pq', 'b/d or p/q mix-up', 'b/d, p/q 혼동'),
    E('lookalike', 'Other look-alikes (m/n, i/l, u/n)', '다른 비슷한 글자 혼동 (m/n, i/l, u/n)'),
    E('alphabet_song', 'Sang the alphabet to find it', '알파벳 노래로 찾음'),
  ],
  cvc: [
    E('short_vowel_mix', 'Wrong short vowel (pet → pit)', '단모음 틀림 (pet → pit)'),
    E('korean_swap', 'v→b, f→p, z→j (van → ban)', 'v→b, f→p, z→j (van → ban)'),
    E('last_sound', 'Changed the last sound (log → lot)', '끝소리 바꿈 (log → lot)'),
    E('added_vowel', 'Added a vowel at the end (hat → hat-eu)', '끝에 모음 추가 (hat → 해트)'),
  ],
  digraphs: [
    E('digraph_split', 'Read the pair as two sounds (shop → s-hop)', '두 글자를 따로 읽음 (shop → s-hop)'),
    E('sh_ch', 'sh/ch mix-up (chop → shop)', 'sh/ch 혼동 (chop → shop)'),
    E('th_sound', 'th as /t/, /d/ or /s/ (thin → tin)', 'th를 /t/, /d/, /s/로 (thin → tin)'),
    E('short_vowel_mix', 'Wrong short vowel (shed → shad)', '단모음 틀림 (shed → shad)'),
  ],
  blends: [
    E('added_vowel', 'Added a vowel in the blend (flat → fulat)', '자음군 사이에 모음 추가 (flat → 플랫)'),
    E('dropped_blend', 'Dropped a blend sound (step → sep)', '자음군 소리 빠뜨림 (step → sep)'),
    E('dropped_end', 'Dropped an ending sound (rest → res)', '끝 자음 빠뜨림 (rest → res)'),
    E('short_vowel_mix', 'Wrong short vowel (spin → span)', '단모음 틀림 (spin → span)'),
  ],
  ck_tch_floss: [
    E('tch_t', 'Sounded the t in tch (catch → cat-ch)', 'tch의 t를 소리 냄 (catch → cat-ch)'),
    E('double_twice', 'Read the double letter twice (bell → bel-l)', '겹자음을 두 번 읽음 (bell → bel-l)'),
    E('dropped_blend', 'Dropped a blend sound (stack → sack)', '자음군 소리 빠뜨림 (stack → sack)'),
    E('short_vowel_mix', 'Wrong short vowel (check → chuck)', '단모음 틀림 (check → chuck)'),
  ],
  units: [
    E('units_short', 'Read the vowel short (kind → kinned)', '모음을 짧게 읽음 (kind → kinned)'),
    E('nk_ng', '-nk/-ng mix-up (bank → bang)', '-nk/-ng 혼동 (bank → bang)'),
    E('all_sound', '-all read as /al/ (stall → stal)', '-all을 /al/로 읽음 (stall → stal)'),
    E('dropped_end', 'Dropped the end (child → chil)', '끝소리 빠뜨림 (child → chil)'),
  ],
  open: [
    E('open_short', 'Read the vowel short (go → got)', '모음을 짧게 읽음 (go → got)'),
    E('y_ee', 'y read as /ē/ (fly → flee)', 'y를 /ē/로 읽음 (fly → flee)'),
    E('added_end', 'Added a last sound (so → sock)', '끝에 소리 추가 (so → sock)'),
  ],
  silent_e: [
    E('e_ignored', 'Ignored the e, read it short (made → mad)', 'e를 무시하고 짧게 (made → mad)'),
    E('e_sounded', 'Sounded the e (made → made-ee)', 'e를 소리 냄 (made → made-ee)'),
    E('wrong_long', 'Wrong long vowel (side → sade)', '다른 장모음으로 (side → sade)'),
    E('u_e', 'u_e read short (cute → cut)', 'u_e를 짧게 (cute → cut)'),
  ],
  dge_ge_ce_ve: [
    E('hard_gc', 'Hard g or c (huge → hug, nice → nike)', 'g, c를 강하게 (huge → hug, nice → nike)'),
    E('dge_d', 'Sounded the d in dge (edge → ed-ge)', 'dge의 d를 소리 냄 (edge → ed-ge)'),
    E('ve_long', 'Vowel made long before ve (have → hayve)', 've 앞 모음을 길게 (have → hayve)'),
    E('short_long', 'Long/short vowel wrong (since → sine)', '장/단모음 틀림 (since → sine)'),
  ],
  vowel_teams: [
    E('team_split', 'Sounded both vowels (boat → bo-at)', '두 모음을 따로 읽음 (boat → bo-at)'),
    E('team_short', 'Read the team short (wait → wat)', '짧게 읽음 (wait → wat)'),
    E('team_wrong', 'Wrong sound for ea, ow, ie (slow → slau)', 'ea, ow, ie 소리 틀림 (slow → slau)'),
    E('igh_gh', 'Sounded the gh (light → lig-ht)', 'igh의 gh를 소리 냄 (light → lig-ht)'),
  ],
  r_controlled: [
    E('r_swap', 'ar/or mix-up (farm → form)', 'ar/or 혼동 (farm → form)'),
    E('er_ir_ur', 'ir/ur/er read differently (bird → beerd)', 'er/ir/ur을 다르게 읽음 (bird → beerd)'),
    E('r_dropped', 'Dropped the r (dart → dat)', 'r을 빠뜨림 (dart → dat)'),
  ],
  oo_ou: [
    E('oo_wrong', 'Wrong oo (good ↔ mood)', 'oo 소리 틀림 (good ↔ mood)'),
    E('ou_ow', 'ou/ow read /ō/ (cloud → clode, now → no)', 'ou/ow를 /ō/로 (now → no)'),
    E('ew_ue', 'ew/ue read /e/ (new → neh)', 'ew/ue를 /e/로 (new → neh)'),
  ],
  diphthongs: [
    E('oi_oy', 'oi/oy read /ō/ (coin → cone)', 'oi/oy를 /ō/로 (coin → cone)'),
    E('au_aw', 'au/aw read /ow/ (law → low)', 'au/aw를 /ow/로 (law → low)'),
    E('team_split', 'Sounded both letters (soil → so-il)', '두 글자를 따로 읽음 (soil → so-il)'),
  ],
  two_open_closed: [
    E('open_short', 'Open syllable read short (tiny → tinny)', '열린 음절을 짧게 (tiny → tinny)'),
    E('closed_long', 'Closed syllable read long (napkin → naypkin)', '닫힌 음절을 길게 (napkin → naypkin)'),
  ],
  consonant_le: [
    E('le_e', 'Sounded the e in -le (bubble → bub-lee)', '-le의 e를 소리 냄 (bubble → bub-lee)'),
    E('first_vowel', 'Wrong first vowel (cradle → craddle)', '첫 모음 틀림 (cradle → craddle)'),
  ],
  y_vowel: [
    E('y_ee_eye', 'y: /ē/ and /ī/ mixed (baby → bab-eye)', 'y의 /ē/, /ī/ 혼동 (baby → bab-eye)'),
    E('y_consonant', 'y read as /y/ (fly → fl-yuh)', 'y를 자음 /y/로 (fly → fl-yuh)'),
    E('first_vowel', 'Wrong first vowel (lady → laddy)', '첫 모음 틀림 (lady → laddy)'),
  ],
  one_two_silent_e: [
    E('e_ignored', 'Ignored the e (slope → slop)', 'e를 무시함 (slope → slop)'),
    E('e_sounded', 'Sounded the e (invite → in-vit-ee)', 'e를 소리 냄 (invite → in-vit-ee)'),
  ],
  two_silent_e: [
    E('e_ignored', 'Ignored the e (combine → combin)', 'e를 무시함 (combine → combin)'),
    E('open_short', 'Open first syllable read short (relate → rel-ate)', '열린 첫 음절을 짧게 (relate → rel-ate)'),
  ],
  two_r: [
    E('r_swap', 'ar/or/er mix-up (perform → parform)', 'ar/or/er 혼동 (perform → parform)'),
    E('r_dropped', 'Dropped the r (army → amy)', 'r을 빠뜨림 (army → amy)'),
  ],
  two_vowel_teams: [
    E('team_split', 'Sounded both vowels (needle → ne-edle)', '두 모음을 따로 읽음 (needle → ne-edle)'),
    E('team_short', 'Read the team short (detail → detal)', '짧게 읽음 (detail → detal)'),
  ],
  two_more_teams: [
    E('team_wrong', 'Wrong team sound (loyal → lowal)', '모음 조합 소리 틀림 (loyal → lowal)'),
    E('team_split', 'Sounded both letters (avoid → avo-id)', '두 글자를 따로 읽음 (avoid → avo-id)'),
  ],
}

/** Boxes from the first version (strategies, strengths, general errors), kept so old checks still read. */
const RETIRED_ERRORS: SheetError[] = [
  E('onset_rime', 'Blended onset and rime (fl-at)', '첫소리와 라임으로 나눠 읽음'),
  E('stretch', 'Decoded by stretching sounds', '소리를 늘여서 읽음'),
  E('syllables', 'Broke the word into syllable parts (bas-ket)', '음절로 나눠 읽음'),
  E('some_whole', 'Read some words whole, decoded others', '일부는 통째로, 일부는 해독'),
  E('automatic', 'Read most words whole; automatic', '대부분 통째로, 자동 인식'),
  E('flexible', 'Flexible with adjusting vowel sounds when needed', '모음 소리를 유연하게 조정'),
  E('omitted', 'Omitted or substituted a sound', '소리를 빠뜨리거나 바꿈'),
  E('vowel_confusion', 'Short/long vowel confusion', '단모음/장모음 혼동'),
]
const RETIRED_BY_ID: Record<string, SheetError> = Object.fromEntries(RETIRED_ERRORS.map(e => [e.id, e]))

/** The boxes a sheet offers: its own, then the shared ones for its kind of sheet. */
export function sheetErrors(sheet: string): SheetError[] {
  const group = phonicsSkill(sheet)?.group
  const shared = group === 'letters' ? [] : group === 'two' ? [...TWO_SYLLABLE_ERRORS, ...WORD_SHEET_ERRORS] : WORD_SHEET_ERRORS
  return [...(SHEET_ERRORS[sheet] || []), ...shared]
}

/** A box's wording on a sheet, falling back to the retired boxes for old checks. */
export function sheetError(sheet: string, id: string): SheetError | undefined {
  return sheetErrors(sheet).find(e => e.id === id) || RETIRED_BY_ID[id]
}

/** The boxes for one sheet, plus any already ticked there that the sheet no longer offers. */
export function errorsForSheet(sheet: string, ticked: string[] = []): SheetError[] {
  const offered = sheetErrors(sheet)
  const extra = ticked.filter(id => !id.startsWith(PATTERN_PREFIX) && !offered.some(e => e.id === id)).map(id => RETIRED_BY_ID[id] || E(id, id, id))
  return [...offered, ...extra]
}

export const PATTERN_PREFIX = 'pattern:'

// ─── Instructions ────────────────────────────────────────────────
// From the packet's directions, with the app's own marking rules. Shown
// above the check screen with the universal level-test notes.

export const PHONICS_CHECK_NOTES: string[] = [
  'Decoding only. The student reads each word aloud, left to right; you never ask what it means. A word they have never heard of is still correct if they read it right.',
  'Use a check after teaching a phonics pattern to see whether the student has it, or to find where a new student’s decoding stands. Pick one sheet, several, or all of them. For a beginner, start with the alphabet sheet: capitals, then lowercase, the student names each letter.',
  'The student reads from the printed sheet (or Word sheets prints one). Say: “Read these words for me. If you are not sure, sound it out.” Point to the first word and let them set the pace.',
  'Correct: read accurately, including sounded out and then blended (/sh/ /i/ /p/, ship), and self-corrections. Partly: nearly there, one sound off or right only after a long struggle; it counts as half a word. Error: read wrongly, skipped, or nothing after about three seconds. Do not model, teach or correct during the check; the same warm tone for every word.',
  'On an error or a partly, tap the pencil on the tile and write what the student said. The packet asks for this: it is what makes error analysis possible later.',
  'Under each sheet, tick what went wrong (could not blend, guessed, mixed up vowels, dropped a sound…) and the patterns that gave trouble. Errors only: strengths go in Notes. The ticks group students for teaching; they do not change the score.',
  'Stop a sheet after five errors in a row. Leave the remaining words untouched: they are saved as not read, not as errors.',
  'Accuracy is words correct over words on the sheet, a partly counting half. Beginning, under 70%, needs intervention; Developing, 70–89%, needs guided practice; Mastered, 90% and up, has the pattern.',
  'A phonics check is never graded. It sits on the student page and the leveling screens as information, so a reader who sounds fluent but has gaps in decoding is not missed.',
]

// ─── Saved checks ────────────────────────────────────────────────

/**
 * A recheck of the words missed before. The sheet's result is the earlier
 * check's marks with the words read again replaced, so the sheet is scored
 * whole; `rechecked` is what was actually read this time.
 */
export interface CarriedSheet { from: string; date: string; rechecked: string[] }

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
  /** Sheets this check rechecked from Missed before: what it built on and the words read again. */
  carried?: Record<string, CarriedSheet>
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

// ─── Missed before ───────────────────────────────────────────────

export interface MissedSheet {
  sheet: string
  /** The check the latest result came from, and its date. */
  fromCheckId: string
  fromDate: string
  /** Words marked error or partly there, in the sheet's order. */
  words: string[]
}

/** For one student: the words missed on their latest result for each sheet, sheet by sheet. */
export function missedBefore(latest: LatestBySkill, checks: PhonicsCheckRow[]): MissedSheet[] {
  const byId: Record<string, PhonicsCheckRow> = Object.fromEntries(checks.map(c => [c.id, c]))
  return PHONICS_SKILLS.flatMap(sk => {
    const l = latest[sk.id]
    if (!l) return []
    const marks = byId[l.checkId]?.results?.[sk.id] || {}
    const words = sk.words.filter(w => isMiss(marks[w]))
    return words.length ? [{ sheet: sk.id, fromCheckId: l.checkId, fromDate: l.date, words }] : []
  })
}

/**
 * How many of a student's checks missed each word on a sheet. A recheck
 * counts only the words it read again, not the misses it carried over.
 */
export function missCounts(checks: PhonicsCheckRow[], sheet: string): Record<string, number> {
  const out: Record<string, number> = {}
  checks.forEach(c => {
    if (!c.skills?.includes(sheet)) return
    const read = c.carried?.[sheet]?.rechecked
    Object.entries(c.results?.[sheet] || {}).forEach(([w, m]) => { if (isMiss(m) && (!read || read.includes(w))) out[w] = (out[w] || 0) + 1 })
  })
  return out
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
