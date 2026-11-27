// ─── American or British spelling ────────────────────────────────
// The bank is written in American spelling, which is what the program's
// curriculum uses. A teacher who writes in British English can switch,
// and the builder converts each sentence as it fills it. Word list only:
// nothing clever, and a word not on the list is left alone. The verb
// "practise" is the one rule-based case: American uses "practice" for
// both noun and verb, so to British only the -ing and -ed forms are
// converted, while to American the verb "practise(s)" becomes "practice(s)".
// The setting is the teacher's, kept on this device (see context.tsx); it
// applies to words the app supplies (comment phrases, lesson-plan objective
// chips, unit text), never to what a teacher types.

export type Spelling = 'us' | 'uk'
export const SPELLING_KEY = 'daewoo_spelling'

export function readSpelling(): Spelling {
  try { return localStorage.getItem(SPELLING_KEY) === 'uk' ? 'uk' : 'us' } catch { return 'us' }
}
export function saveSpelling(s: Spelling) { try { localStorage.setItem(SPELLING_KEY, s) } catch {} }

// American → British. Plurals and verb forms are listed where the bank uses them.
const PAIRS: Array<[string, string]> = [
  ['color', 'colour'], ['colors', 'colours'], ['colored', 'coloured'], ['coloring', 'colouring'],
  ['favorite', 'favourite'], ['favorites', 'favourites'],
  ['behavior', 'behaviour'], ['behaviors', 'behaviours'],
  ['neighbor', 'neighbour'], ['neighbors', 'neighbours'],
  ['honor', 'honour'], ['humor', 'humour'], ['favor', 'favour'], ['labor', 'labour'],
  ['center', 'centre'], ['centers', 'centres'], ['meter', 'metre'], ['meters', 'metres'],
  ['gray', 'grey'],
  ['organize', 'organise'], ['organizes', 'organises'], ['organized', 'organised'], ['organizing', 'organising'], ['organization', 'organisation'],
  ['recognize', 'recognise'], ['recognizes', 'recognises'], ['recognized', 'recognised'], ['recognizing', 'recognising'],
  ['memorize', 'memorise'], ['memorizes', 'memorises'], ['memorized', 'memorised'], ['memorizing', 'memorising'],
  ['summarize', 'summarise'], ['summarizes', 'summarises'], ['summarized', 'summarised'], ['summarizing', 'summarising'],
  ['realize', 'realise'], ['realizes', 'realises'], ['realized', 'realised'], ['realizing', 'realising'],
  ['apologize', 'apologise'], ['apologizes', 'apologises'], ['apologized', 'apologised'], ['apologizing', 'apologising'],
  ['emphasize', 'emphasise'], ['emphasizes', 'emphasises'], ['emphasized', 'emphasised'],
  ['categorize', 'categorise'], ['categorized', 'categorised'], ['prioritize', 'prioritise'], ['prioritized', 'prioritised'],
  ['analyze', 'analyse'], ['analyzes', 'analyses'], ['analyzed', 'analysed'], ['analyzing', 'analysing'],
  ['practicing', 'practising'], ['practiced', 'practised'],
  ['traveled', 'travelled'], ['traveling', 'travelling'], ['modeled', 'modelled'], ['modeling', 'modelling'], ['labeled', 'labelled'], ['labeling', 'labelling'],
  ['canceled', 'cancelled'], ['canceling', 'cancelling'],
  ['enroll', 'enrol'], ['enrolls', 'enrols'], ['fulfill', 'fulfil'], ['fulfills', 'fulfils'], ['skillful', 'skilful'],
  ['program', 'programme'], ['programs', 'programmes'], ['catalog', 'catalogue'], ['dialog', 'dialogue'],
  ['math', 'maths'], ['mom', 'mum'], ['learned', 'learnt'], ['spelled', 'spelt'],
  ['jewelry', 'jewellery'], ['pajamas', 'pyjamas'], ['tire', 'tyre'], ['tires', 'tyres'], ['toward', 'towards'],
]
const US_TO_UK = new Map(PAIRS)
// British → American, plus the verb practise, which only goes one way.
const UK_TO_US = new Map([...PAIRS.map(([us, uk]) => [uk, us] as [string, string]), ['practise', 'practice'], ['practises', 'practices']])

function convert(text: string, map: Map<string, string>, keep: Set<string> = new Set()): string {
  return (text || '').replace(/[A-Za-z]+/g, w => {
    const lower = w.toLowerCase()
    const to = map.get(lower)
    if (!to || keep.has(w)) return w
    if (w === w.toUpperCase() && w.length > 1) return to.toUpperCase()
    if (w[0] === w[0].toUpperCase()) return to[0].toUpperCase() + to.slice(1)
    return to
  })
}

export function toBritish(text: string): string { return convert(text, US_TO_UK) }
export function toAmerican(text: string): string { return convert(text, UK_TO_US) }
/** Text in the chosen spelling, whichever spelling it was written in. */
export function spell(text: string, s: Spelling, keep: string[] = []): string {
  // Words in `keep` (a student's name, say) stay as written, each word of a multi-word name too.
  const k = new Set(keep.flatMap(x => (x || '').match(/[A-Za-z]+/g) || []))
  return convert(text, s === 'uk' ? US_TO_UK : UK_TO_US, k)
}
