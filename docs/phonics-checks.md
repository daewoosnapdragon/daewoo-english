# Phonics quick checks

Reading → Phonics. The program's *Phonics Quick Checks* packet, in the app:
a teacher sits with one student, the student reads the words on the sheets
the teacher picked, and the teacher taps each word as it is read. The result
stays with the student and is never graded.

## What it is for

The level tests measure fluency and comprehension well, and Grade 2's oral
test has a five-row phonics screener, but nothing tells us, for any grade,
*which* decoding patterns a student has and has not got. A reader who sounds
fluent on a passage can still be guessing at vowel teams; a quiet Grade 4
student placed low may decode everything and need a move. Phonics checks put
that information in front of the teacher on the Reading tab, on the student
page, and in the leveling meeting.

## The sheets

The twenty student sheets of the packet, in its order, with the words exactly
as printed (sixteen or twenty a sheet):

| Group | Sheets |
| --- | --- |
| Short vowels | CVC words · Digraphs · Consonant blends · ck, tch, floss · Closed syllable exceptions |
| Long vowels | Open syllables · Silent e · dge, ge, ce, ve · Vowel teams |
| Other vowels | R-controlled vowels · Vowel teams for /ū/, /oo/, /ou/ · oi, oy, au, aw |
| Two-syllable | Open and closed · Consonant -le · Y as a vowel · 1 and 2-syllable silent e · 2-syllable silent e · 2-syllable r-controlled · 2-syllable long vowel teams · 2-syllable more vowel teams |

The lists live in `src/lib/phonics.ts`. To change a word, edit the `words`
array and bump `PHONICS_CONTENT_VERSION`; saved checks carry the version they
were made with and are scored on the words they marked, so old results do
not move. The full 112-page packet in the shared Drive (*Decoding Words.pdf*)
also has nonsense-word pages and review pages; they are not in the app.

## Running a check

The packet's directions, as `PHONICS_CHECK_NOTES` in `src/lib/phonics.ts`
puts them (kept as reference text; the screen itself shows no panel):

- Decoding only. The student reads the words left to right; meaning is never
  asked.
- Correct: read accurately, including sounded out and blended, or
  self-corrected. Error: read wrongly, skipped, or nothing after about three
  seconds. No modelling or correcting during the check.
- On an error, the pencil on the tile records what the student said (the
  packet's "write what they read next to the word").
- Under each sheet, the packet's teacher-page checkboxes: how the student
  decoded (struggled to blend, sound by sound, onset and rime, stretched,
  syllable parts, some whole, automatic, guessing, omitted a sound,
  short/long confusion, flexible) and the patterns that gave trouble.
- Stop a sheet after five errors in a row. Untouched words are saved as *not
  read*, not as errors.

The teacher picks any set of sheets: one, several, or all twenty. The set is
remembered in the browser so a class can be run on the same sheets without
re-ticking. *Not yet proficient* selects what the student did not get last
time; *Not checked yet* selects what has never been checked. *Rest correct*
marks the untouched words correct, for the teacher who only taps the errors.
*Save and next student* keeps the sheets and moves down the roster.

## Reading the results

The packet's rubric. Accuracy is words correct over words on the sheet.

| Band | Accuracy | The packet says |
| --- | --- | --- |
| Beginning | under 70% | Needs intervention |
| Developing | 70–89% | Needs guided practice |
| Proficient | 90% and up | Practice for automaticity |
| Mastered | 90% and up, *automatic* ticked | Reached automaticity |

- **Heat map**: the class down the side, the sheets across the top, each
  cell the accuracy of the *latest* check of that sheet. Column headers carry
  the class average. *Working on* is the first sheet in packet order that is
  not yet proficient. Click a cell for the words, what was heard, the
  observations, and that sheet's history; from there, recheck the sheet or
  edit the check.
- **Student page**, Reading section: the same strip for one student, with
  the working-on sheet and a link that opens the check screen on them.
- **Leveling meeting**: the hover card on a student's name shows the strip
  and the working-on sheet beside the level test numbers.
- **CSV** exports the heat map; **Word sheets** prints the twenty sheets in
  large type, one a page.

## Data

`phonics_checks` (`supabase/migrations/20261110_phonics_checks.sql`): one row
per sitting. `skills` is the array of sheet ids; `results` is
`{ sheet: { word: 'correct' | 'error' } }`, a missing word meaning not read;
`heard` is `{ sheet: { word: what they said } }`; `observations` is
`{ sheet: [ids and pattern:<grapheme>] }`; `content_version` names the word
lists in use. Open RLS like the other teacher tables. Reads and writes go
through `src/lib/phonicsData.ts`; the arithmetic (scores, latest per sheet,
bands, the working-on sheet) is in `src/lib/phonics.ts` and tested in
`src/lib/__tests__/phonics.test.ts`.

Run the migration in the Supabase SQL editor before the first check; until
then the Phonics tab loads an empty heat map and a save fails with a
table-not-found error.
