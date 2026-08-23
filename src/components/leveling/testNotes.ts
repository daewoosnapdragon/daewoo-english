// ============================================================================
// SHARED TEST NOTES
// ============================================================================
// Administration guidance that is true of every level test, regardless of
// grade or version. Grade content files carry the notes that are specific to
// one paper (word counts, which components exist, scoring quirks); these are
// the ones about how to sit with a child and run the thing.
//
// Rendered by TestNotesPanel above the entry screens.
// ============================================================================

/** True of every level test — oral and written, every grade. */
export const UNIVERSAL_TEST_NOTES: string[] = [
  'Do not jump straight into the test. Ask how they are, how they are feeling, what they did on the weekend. Students are nervous about this, especially with a teacher they do not know well. A minute of small talk costs nothing and changes what you get out of them.',
  'Never let a student think they are doing badly. Use the same warm tone for a wrong answer as for a right one — no corrections, no sighing, no "are you sure?" that you only ask when they are wrong. They should leave the room not knowing how they did.',
  'If a student needs a break, give them one. Stop the timer, let them have water, come back to it.',
  'If a student cannot do a section, it is fine to stop that section. Say thank you, move on to the next part, or send them back to class if there is nothing left they can do. Record what you got and leave the rest blank — a section you did not administer is more useful to us than a section you pushed them through in tears.',
  'This test is subjective by definition. Try to be consistent in how you administer it from student to student, but do not stress yourself out about it. A reasonable, kind, consistent judgement is what we are asking for.',
]

/** True of the oral test in every grade. */
export const ORAL_TEST_NOTES: string[] = [
  'You do NOT need to work through the passages from A. Start where the student will be comfortable — if that is C, start at C. The levels exist because the program covers a wide range of English levels, not because every student reads all of them.',
  'Reading level is the reference, not the rule: at Frustration the student is usually on the wrong passage and you should try one level down, but it is your call. A student who is tired, shy, or nearly at Instructional does not always need a re-read.',
]

/**
 * What to do when a student stalls out. Rendered directly under the teacher
 * script on each component, because that is the moment the teacher needs it —
 * not buried in a notes panel at the top of the screen.
 */
export const STOPPING_NOTES: string[] = [
  'If the student cannot answer, do not push. Say thank you and move on to the next section.',
  'A section the student could not do is left blank, not scored zero — for comprehension, use the "not administered" checkbox.',
]

/** Grade 1 oral test only. Kept here so the Grade 1 screen and the content
 *  file do not drift apart on the same guidance. */
export const G1_ORAL_NOTES: string[] = [
  'You MAY change how you ask a question if the student is not following. "Tell me the letter name," "letter name?" and "what letter is it?" are all fine. If you use Korean to get them going, note it in the teacher notes at the bottom.',
  'It is fine to ask a student to go back and try again, or to clarify. If a student doing letter names says "I, d, y, /a/", mark the sound in the sound section, then at the end ask them to go back and give you the letter name for A.',
  'Unsure about a pronunciation? Ask for another word with that sound. If "dash" sounds like "dach", have them repeat the /sh/, then ask for another word that makes that sound. If they can give you one, mark it correct — it was an articulation slip, not a phonics gap.',
  'When asking for a word that starts with a letter, note anything interesting in the teacher notes. A student who says "circle" for C knows soft C, and that is worth recording even though the item is just right or wrong.',
  'Phoneme manipulation: do the model word WITH them. You show it first, then have them do one back to you, so you know they understood the task before the scored items start.',
  'Open response: prompt more than "what else?". Ask real questions and see what comes back — "can you see something yummy?", "can you find something that starts with /h/?", "how many children are there?". Higher-level students need less of this; the point is to get them talking so you can hear how much vocabulary is there. If a student clearly has nothing, say thank you and let them go.',
]
