import type { Tour } from '@/lib/tour'
import { canSeeAdminJobs } from '@/lib/adminAuth'
import { canViewActivity, canManageWhatsNew } from '@/lib/activity'

// ─── How to use this app ─────────────────────────────────────────
// One section per page, in nav order. Each leads with what a teacher does
// there ("To do X: 1, 2, 3"), then a short note of what the page shows, then
// the rules worth knowing (bands, who sees what, what counts). Nothing about
// how the app is built: if a teacher cannot act on it, it is not here. The
// rule: a feature does not ship without its section updated in the same
// commit, and the What's new entry links here by section id. "Updated" is
// the date the section text last changed. No screenshots: the tours point
// at the live screen instead. Never write a week count or a date that goes
// stale; say "the week count in the header".

export interface GuideTask { title: string; steps: string[]; tour?: Tour }
export interface GuideSection {
  id: string
  title: string
  updated: string        // YYYY-MM-DD
  purpose: string        // one sentence: what the page is for
  tasks: GuideTask[]     // shown first
  screen: string[]       // at most a short paragraph or two of what the page shows
  rules: string[]
  watchOut: string[]
  /** Pages only some accounts can open. Unset: everyone. */
  audience?: 'admin' | 'jobs' | 'activity' | 'release'
}
export interface Workflow { id: string; title: string; when: string; steps: string[] }

// A walkthrough is one job shown screen by screen, with a picture per step.
// Pictures live in public/guide/<walkthrough id>/ and are retaken when the
// screen changes; the text says what to do, not what is on the screen.
export interface WalkthroughStep { title: string; text: string[]; image?: string; alt?: string }
export interface Walkthrough { id: string; title: string; when: string; intro: string; rules: string[]; steps: WalkthroughStep[]; updated: string }

export const WALKTHROUGHS: Walkthrough[] = [
  {
    id: 'report-cards', title: 'Report cards, step by step', when: 'Report card season, every semester', updated: '2026-11-16',
    intro: 'Everything you need for a report card comment is on one screen, and the app writes nothing for you that you have not ticked. One student at a time: read the fact sheet, build a draft, make it yours, press Next. Dates and anything that changes from semester to semester are in that semester\u2019s meeting notes, not here.',
    rules: [
      'No surprises. Anything serious in a report card was already in the progress report, a ClassDojo message or a conversation through Victoria. If it was not, raise it with Victoria before it goes in a comment.',
      'Honest, in plain words, and never negative labels. Say what happens and what must change; do not say what the child is.',
      'Never mention moving levels, up or down. The app warns if the words appear.',
      'No comparisons with other students or classes, and no favourites: nothing like "the best in the class" or "my favourite student".',
      'One or two things to work on, not a list. Parents remember the first two.',
      'About 200 words, and not the same comment as the student next door. The grey line under the box counts words and tells you how much of a comment is shared with another.',
    ],
    steps: [
      { title: 'Open Reports and pick a student', image: '/guide/report-cards/01-class-overview.jpg', alt: 'The Reports page on the Report card tab with the class overview: graded and commented counts, class averages per area, and the students table.',
        text: ['You can start comments at any point in the season; grades do not have to be finished first. The letters on each card come from the assessments marked so far and update as more are marked, so a comment written early is worth a second look at the letters before Victoria reviews it.', 'Open Reports. Check the semester, your grade and your class along the top. The overview shows how many of the class are graded and commented, the class averages, and a row per student. Click a student, or pick one from the dropdown on the right.'] },
      { title: 'The report card is what parents get', image: '/guide/report-cards/02-report-card.jpg', alt: 'A student\u2019s report card: the school header, the student details, the overall letter, and the five area tiles with percent and letter.',
        text: ['The top of the page is the printed card: the student\u2019s details, the overall letter, and a tile per area. The header line says how many of the class are written and when comments are due.', 'If a letter is wrong, Edit grades on the tiles sets an override for this student; otherwise leave them. Hide for this student, next to the class comparison, drops the class bars from that one card.'] },
      { title: 'Read the fact sheet before you write', image: '/guide/report-cards/03-fact-sheet-and-box.jpg', alt: 'The fact sheet on the left (letters with change since the progress report, attendance, reading, WIDA, behavior) beside the empty comment box with Pronoun, Called, Build a comment and Next.',
        text: ['Left of the box is everything the app knows: each area\u2019s letter with the change since the progress report and since last semester, attendance for this semester, the reading level now and at the first check, the WIDA level, and how many behavior notes there are.', 'Nothing on the fact sheet is printed or inserted. It is there so the comment is specific, and so you never contradict what parents have already read.'] },
      { title: 'What the app noticed, the rubrics, and what parents already read', image: '/guide/report-cards/04-noticed-rubrics-past.jpg', alt: 'Lower part of the fact sheet: What the app noticed, Rubrics this semester with criterion levels, and the progress report quoted in full.',
        text: ['What the app noticed is the weakest and strongest area, the last rubric piece criterion by criterion, the most-missed standard, and the latest reading and behavior notes. Rubrics this semester lists every rubric-scored piece, including rubrics inside answer-key assessments; tap one to read what the rubric says for the level the student got.', 'What parents already read shows this semester\u2019s progress report in full and every earlier comment. This is the no-surprises check: if a concern is not there, it should not be new on the report card.'] },
      { title: 'Set the pronoun and the name, once', image: '/guide/report-cards/03-fact-sheet-and-box.jpg', alt: 'Above the comment box: Pronoun with he, she and they buttons, and Called with the suggested name.',
        text: ['Above the box, click he, she or they. The app remembers it on the roster, so it is once per student, ever.', 'Called is the name used in comments. The app suggests the English name in brackets, or the given name after the family name: Kim Bo Min (Sophia) becomes Sophia, Kim Bo Min becomes Bo Min. Press Enter to keep it, or type another.'] },
      { title: 'Build a comment: tick what applies', image: '/guide/report-cards/05-builder-open.jpg', alt: 'The Build a comment screen: an opener chosen, then the Writing area on the on-track tier with Taught chips and sentences as checkboxes.',
        text: ['Click Build a comment under the box. One screen: an opener, each area on the tier the letter points to (switch it with the buttons on the right), behavior, next steps, a closer.', 'Under each area, Taught shows the skills your class has covered, read from your lesson plans, the Standards page and any tagged assessments. The sentences for those skills come first; the rest sit behind Show more. Untick a chip or add one and it is remembered for the class.', 'Sentences are offered least-used-first in your class, with a count beside any that other comments already use. Tick the ones that are true of this student.'] },
      { title: 'The draft assembles as you tick', image: '/guide/report-cards/06-builder-ticked.jpg', alt: 'Three sentences ticked in Writing and Language, and the draft at the bottom reading as a paragraph with the student\u2019s name and pronoun.',
        text: ['The draft at the bottom writes itself in reading order: opener, strongest area, the other areas, behavior, next steps, closer. The name and pronoun are filled in, and the second and third sentences of a paragraph use the pronoun so it does not read Jayana, Jayana, Jayana.', 'The count beside the draft says how many words you have against the 200 to aim for, and warns when the draft lists more than three things to work on.'] },
      { title: 'Behavior, including behavior that is genuinely bad', image: '/guide/report-cards/08-builder-serious.jpg', alt: 'The Behavior section switched to the serious concern tier, with plain sentences such as talks while the teacher is explaining and misses the instructions as a result.',
        text: ['Behavior opens on the tier the behavior grade points to, by category. For a student whose behavior is a real problem, choose serious concern: those sentences say what happens, its effect, and what must change, with no softening. They still carry no labels and no comparisons, so they stay inside the rules.', 'The What happens next lines at the end of that tier are the ones to use when you want parents to act: support at home, a conversation in the break, a meeting if it continues.'] },
      { title: 'Next steps and home practice', image: '/guide/report-cards/09-builder-next-steps.jpg', alt: 'Next steps for Phonics on the Advanced band: two rungs, each with a classroom line and two At home activities.',
        text: ['Next steps shows the ladder for the weakest area on the band the student\u2019s grade and WIDA level suggest; tap another band, or change the area, if that is not right. Each rung has a classroom line and two things to do at home, which the draft turns into "At home, \u2026" sentences.', 'Pick one rung, maybe two lines. More than that is a list, and parents stop reading.'] },
      { title: 'A closer, then put it in the box', image: '/guide/report-cards/10-builder-closer.jpg', alt: 'The Closer section with student-addressed closers such as Keep it up, Jayana, and the Put in the box button.',
        text: ['Choose a closer or none. Put in the box drops the draft into the comment box; when there is already text, you choose Replace or Add to the end.', 'Spelling, top right, switches the sentences between American and British and remembers your choice.'] },
      { title: 'Make it yours', image: '/guide/report-cards/11-draft-in-box.jpg', alt: 'The comment box holding the draft, the grey line under it reading 67 words \u00b7 aim for about 200, Saved 14:21, and the Next button.',
        text: ['The draft is a first draft, not the comment. Read it as a parent would, cut what does not matter, and add at least one detail that is only true of this child, from the fact sheet or from memory. That is what keeps comments from sounding alike.', 'The grey line under the box is the only check there is: word count, another student\u2019s name, a leftover he/she or blank, any mention of moving levels or comparing with the class, how much of the text also appears in one of your other comments, and more than three things to work on. It never blocks you.', 'The comment saves itself a second after you stop typing. There is no Save button and no Skip: every student gets a comment.'] },
      { title: 'Next student', image: '/guide/report-cards/11-draft-in-box.jpg', alt: 'The Next: Kim Zio button at the bottom right of the comment box.',
        text: ['Next saves and opens the next student in the class without a comment, so a sitting is one student after another with nothing to find. The header count ticks up as you go.'] },
      { title: 'Check the class', image: '/guide/report-cards/13-comments-tab.jpg', alt: 'The Comments tab: every student\u2019s comment box on one page, with the Progress report / Report card switch at the top.',
        text: ['Class summary ranks the class by overall grade and is the quick way to see a letter that looks wrong. Comments puts every comment on one page: check that the switch at the top says Report card, then read down the page for comments that sound the same.', 'Two things cannot be told from here: whether a concern was already raised with the parents, and whether the comment is true. Those are yours.'] },
      { title: 'Review & approve, then Victoria prints', image: '/guide/report-cards/14-review-approve.jpg', alt: 'The Review & approve tab: a count of admin-approved comments, Approve all as admin, Download all comments, and a row per student with an Approve button and Pending status.',
        text: ['Victoria reads and approves every comment under Review & approve. If she leaves a note on a student, it appears above that student\u2019s box with Mark as reviewed; fix the comment, then mark it.', 'Victoria prints the report cards once they are approved. You do not print anything; the Print report card button on a single card is there for checking how one looks.'] },
    ],
  },
]

export const QUICK_START: { title: string; steps: string[] } = {
  title: 'Your first week',
  steps: [
    'Log in: pick your name and press Log in. Your class is remembered, so every page opens on it.',
    'Take attendance: Attendance in the top bar (on a phone, the first tab at the bottom). Press All present, tap Absent or Tardy for anyone who is not, then Save attendance.',
    'Enter a grade: Grades → New assessment. Name it, pick how it is scored, and score it on the sheet that opens.',
    'Open a student: type their name in Find anything at the top left (on a phone, the magnifier), or press ⌘K (Ctrl K on Windows). Their page opens on the behavior log.',
    'Read the notice board under the header each morning and dismiss what you have read. To post one, click Post a notice at the right of the thin row under the links (on a phone, in More).',
    'Stuck on a page? Help, beside Post a notice (on a phone, in More), opens this guide at that page.',
  ],
}

export const GUIDE_SECTIONS: GuideSection[] = [
  // ─── Daily ───
  {
    id: 'dashboard', title: 'Dashboard', updated: '2026-11-20',
    purpose: 'What needs doing today: unmarked attendance, ungraded work, students who need a look, and the calendar.',
    tasks: [
      { title: 'Clear the grading queue', steps: ['Find the assessment in the grading queue at the foot of the page.', 'Continue opens its sheet on the first unmarked student.', 'Or press ABS or EXM beside a name to mark that student absent or exempt right there.'], tour: { path: '/dashboard', steps: [{ anchor: '#grading', text: 'Every assessment with an unmarked student. Continue opens the sheet; ABS and EXM handle a student here.' }] } },
      { title: 'Mark a class from the schedule', steps: ['Find the period in the weekly schedule beside the calendar (Show weekly schedule if it is folded away).', 'Click the period. A drawer opens with that class.', 'Tap a status per student and save.'] },
      { title: 'Post a notice', steps: ['Click Post a notice at the right of the thin row under the links (on a phone: More → Post a notice), or press ⌘K and type “notice”.', 'Write it, choose who sees it (everyone or selected teachers), tick Urgent if it is, and set Show until.', 'Post. Each teacher dismisses their own copy.'] },
      { title: 'Find a student, page or action', steps: ['Click Find anything at the top left, or press ⌘K (Ctrl K on Windows). On a phone, tap the magnifier at the top.', 'Type part of a name, a page, or an action such as “new assessment”, then Enter.'] },
      { title: 'Change how the app looks', steps: ['Click your name at the top right.', 'Switch the language (English or 한국어) and dark mode; Text size steps through Standard, Larger and Largest; Font steps through the typefaces.', 'Each choice is remembered on this computer.'] },
    ],
    screen: [
      'The stats strip: students still unmarked today, ungraded assessments, days to the midterm cutoff, report card grades due, and behavior logs today. Under it the month calendar with what is coming up, the weekly schedule, office jobs, Needs attention and the grading queue.',
      'The thin row under the links shows the semester, your class, the time, and the week count with the report card date; click the week count for the months of the term. A dot on your name means What’s new has something you have not read.',
    ],
    rules: [
      'Needs attention lists a student whose domain average has fallen since the last assessment, or who has three or more absences in two weeks, with the reason.',
      'A day off on the calendar shows a dash for attendance, and those days never count toward Needs attention.',
      'Report card grades due is the semester’s cutoff date in Settings.',
    ],
    watchOut: ['Notices disappear on their own on their Show until date.', 'The arrow at the top right folds the header to one row; click it again to bring the links back.'],
  },
  {
    id: 'attendance', title: 'Attendance', updated: '2026-11-20',
    purpose: 'Mark today in a few taps, fix a past day, and print the record for the office.',
    tasks: [
      { title: 'Mark today', steps: ['Open Attendance (on a phone, the first tab at the bottom), or click the period on the dashboard schedule.', 'Press All present, then tap Absent or Tardy for the exceptions. On a computer you can click a row and press P, A or T; ↑ ↓ move between students.', 'Add a note where it helps, then Save attendance. “All marked” appears beside the date.'], tour: { path: '/attendance', steps: [{ anchor: 'attendance.save', text: 'Save writes the day. The dot on the Attendance link clears once every class you teach today is marked.' }] } },
      { title: 'Fix a past day', steps: ['Pick the date with the arrows or the date box, change the statuses, and Save attendance.', 'Or switch to Month and click the day.'] },
      { title: 'Print for the office', steps: ['Print month prints the month on screen.', 'Or open Print selected weeks, tick the weeks (they can span months), and print.'] },
    ],
    screen: [
      'Day is where you mark, one row per student; Month is the record, a cell per class day. The Attendance link carries a dot while one of your grades is unmarked today and a check once all are. After 3:30 on a class day, a reminder band on every other page names the grade you have not marked.',
    ],
    rules: [
      'A day off or field trip on the school calendar marks every student absent with the day as the note. Change anyone who came in. These days are left out of every absence total: report cards, the student page and the dashboard.',
      'Weekends have no class, and neither do the weekdays Settings marks as no class for a grade.',
    ],
    watchOut: ['Leaving with marks not saved asks first: Stay, Discard, or Save first.'],
  },
  {
    id: 'grades', title: 'Grades', updated: '2026-11-20',
    purpose: 'Create an assessment, score it, and see what to reteach.',
    tasks: [
      { title: 'Score a test with an answer key', steps: ['New assessment. Name it, choose the domain and category, and pick Answer key under “How will you score it?”.', 'Next: answer key. Describe the paper as sections: type the letters for multiple choice, count the written questions and set their points, pick a rubric for a writing task.', 'Tag a standard on each section if you want mastery tracked (“Tag every section with one standard” when it is all one skill).', 'Save and start scoring. Type A–D or T/F for choice items, a number for written ones, − for a question left blank, Enter for the next student, X for absent, ⇧X for exempt.', 'Save all when the class is done, or let the autosave do it.'], tour: { path: '/grades', steps: [{ anchor: 'grades.new', text: 'New assessment starts the flow.' }, { anchor: 'grades.scoring', text: 'Answer key scores question by question. Rubric scores criteria 0–4. Points only is one total per student.' }] } },
      { title: 'Score with a rubric', steps: ['New assessment, pick Rubric under “How will you score it?”, then Next: choose a rubric.', 'Choose a template or a saved rubric. Scoring opens as a full page.', 'For each criterion click the level that fits, 0 to 4. Keys 0–4 mark and move down; Enter goes to the next student.'] },
      { title: 'Enter one total per student', steps: ['New assessment, pick Points only, set the total, then Create and enter scores.', 'Type each total down the list. Enter, Tab or ↓ saves and moves on; 7/10 enters a fraction of the total; ABS and EXM sit on each row.', 'For several assessments at once, use Batch grid.'] },
      { title: 'Mix multiple choice, short answers, and a rubric on one assessment', steps: ['In the sections builder, add a section for each part in the order they appear.', 'Tag standards on sections or questions. A standard from another domain (RL/RI reading, RF phonics, W writing, SL speaking, L language) sends those points to that domain; a note under the key shows the split.', 'Score as usual. Questions that count in another domain are tinted and labelled on the sheet.'] },
      { title: 'See what to reteach', steps: ['Open the assessment and click Analysis.', 'Read the score spread, then Standards mastery: click a standard for the names in each band.', 'Question by question shows the most missed; click a row for who missed it.'], tour: { path: '/grades', steps: [{ anchor: 'grades.views', text: 'Answer sheet for scoring, Class grid for the whole class, Analysis for what to reteach.' }] } },
      { title: 'Read one student’s grades', steps: ['Student view, then click a name (or press ↑ ↓).', 'Each domain shows the student’s running average against the class’s. “Worth a look” lists anything unusual; “Not yet scored” links to the sheet.', '“How is this computed?” under a domain lists the work and the weights behind the number.'] },
      { title: 'Change an assessment after it is made', steps: ['Edit, above the sheet. Change the name, date, category, notes or standards and Save changes.', 'To fix the key, go on to the answer key, change a letter or a point value, and save: papers already marked are scored again against the new key.', 'Once papers are scored the scoring method is fixed. Clear all first to change it.'] },
    ],
    screen: [
      'Grade, class and domain chips along the top. Tabs: Score entry, Batch grid, Domain overview, Student view, Calendar. A keyed assessment opens on its answer sheet, with Class grid and Analysis beside it; a rubric assessment opens on the class grid.',
    ],
    rules: [
      'Formative, summative and performance task are weighted into the composite by the weights in Settings.',
      'A question left blank is wrong. When you move to the next student, anything still unmarked on that paper counts as blank; a paper you have not started stays untouched.',
      'A rubric is worth 4 points per criterion: the sum of levels over the maximum, scaled to the item’s points.',
      'Absent leaves the student out of averages; exempt does the same and records that the work was waived.',
    ],
    watchOut: ['A 0 on a rubric is a real zero. Leave a criterion unmarked if you have not seen it.', 'Half points are allowed when scoring written items, not on the key.', 'Clear (one paper) and Clear all remove the saved scores for good.'],
  },
  {
    id: 'reading', title: 'Reading', updated: '2026-11-20',
    purpose: 'Running records against the class targets, and phonics checks: where each student’s decoding stands, sheet by sheet.',
    tasks: [
      { title: 'Record a running record', steps: ['Add reading record.', 'Pick the student and passage, enter words correct and errors (or CWPM and accuracy), and the Lexile if you have it.', 'Save. The class overview and the student’s trend update.'], tour: { path: '/reading', steps: [{ anchor: 'reading.add', text: 'One record per student per passage. The class overview and the student page update at once.' }] } },
      { title: 'Change the targets', steps: ['Class overview → Edit these targets.', 'Set the mid-year and end-of-year CWPM and the Lexile range, then Save.'] },
      { title: 'Run a phonics check', steps: ['Phonics → Check a student, or the check button beside a name on the heat map.', 'Tick the sheets to check: one, several, or All. For a student you know, Not yet mastered picks what was weak last time.', 'As the student reads the printed sheet, tap each word: once for correct, twice for an error, three times for partly right. The pencil on a tile records what they said. Leave a word untouched if you stopped early.', 'Tick how they decoded and what gave trouble, then Save check, or Save and next student to keep the same sheets for the next child.'], tour: { path: '/reading?tab=phonics', steps: [{ anchor: 'reading.phonics.mode', text: 'Heat map for the whole class; Check a student to sit with one.' }, { anchor: 'reading.phonics.skills', text: 'Tick the sheets for this sitting. The dot on a chip is the student’s last result.' }, { anchor: 'reading.phonics.words', text: 'A tile per word, in the sheet’s four columns. Tap as the student reads: correct, error, partly, clear.' }, { anchor: 'reading.phonics.save', text: 'Saved to the student, never graded. The heat map, the student page and the leveling hover card all read it.' }] } },
      { title: 'Recheck only the words a student missed', steps: ['Phonics → Check a student, pick the student, and choose Missed before.', 'Every word missed on their latest check of each sheet is on one card; ×2 marks words missed on two or more checks.', 'Mark the words as they read. Those words replace their old marks and each sheet is scored again. Print for the student prints the words in large type.'] },
      { title: 'Fix or remove a check', steps: ['Click the cell on the heat map → Edit this attempt; or Check a student → So far, then Edit or Delete beside the check.', 'Change the marks and Save changes.'] },
      { title: 'Group students for phonics teaching', steps: ['Phonics → set the scope to Whole grade or All grades → Groups.', 'Students are grouped by the sheet to teach next. Turn class chips off to keep only classes that share a time slot.', 'Print groups for a list per grade, or Print their missed words for one group.'] },
      { title: 'Find leveling candidates in phonics', steps: ['Phonics → Whole grade or All grades → Leveling.', 'Leveling candidates lists students ahead of or behind their class, with their gaps.', 'Tick up to six students anywhere and press Compare to see them side by side.'] },
    ],
    screen: [
      'Tabs: Class overview (every student’s CWPM, accuracy, Lexile and band), Student detail (one student’s trend against the targets), Phonics, By passage, Passage library. Phonics opens on the class heat map: students down, sheets across, each cell the latest check coloured by band. Click a cell for the words and earlier attempts, or a name for that student’s progress.',
    ],
    rules: [
      'Reading bands: below, approaching, proficient, advanced, from the class targets. Level test oral scores show in the trend, marked as such.',
      'Phonics checks are decoding only and never graded: no assessment, no grade, no report card line. They show on the student page and in the leveling hover card.',
      'Phonics bands: under 70% Beginning, 70–89% Developing, 90% and up Mastered. A word left untouched is not read, not an error; a sheet with nothing marked is not given and never shows as 0.',
      'The heat map shows the latest check per sheet; every earlier attempt is kept under Student progress.',
      'Past one class (Whole grade, All grades) every teacher sees every class, for leveling.',
    ],
    watchOut: ['Targets are per class and grade; check you are on the right one before editing.', 'The sheets you ticked stay ticked for the next student; glance at them before starting another child.'],
  },
  {
    id: 'students', title: 'Students', updated: '2026-11-20',
    purpose: 'The roster, and a page per student with everything the app knows about them.',
    tasks: [
      { title: 'Open a student', steps: ['Type their name in Find anything (⌘K) and press Enter, or click a name on Students.', 'The page opens on Behavior. The list of sections (a row of chips on a phone) jumps to Grades, Reading, Attendance, Standards, Level tests, Support, and Notes and history.'] },
      { title: 'Log a behavior note', steps: ['Open the student. Behavior is the first section.', 'Add a note and pick its type (positive, concern, parent contact, and so on).', 'Flag a note to open a case for admin at once.'] },
      { title: 'Behavior ladder', steps: ['When a student reaches a step’s number of concern or negative notes (three by default), a case opens on its own: admin and you get an urgent notice, and it shows on your dashboard.', 'Add one line about what you need from admin, then or later from Open the notes.', 'Your dashboard and the student page say whether admin has read it and how many school days it has waited. When admin records the step’s action (such as Parents contacted), the case closes and the count starts again.'] },
      { title: 'Edit details or export the page', steps: ['Edit details changes names, pronoun, the name used in comments, grade, class and number.', 'Export portfolio makes a PDF of the student’s page.'] },
      { title: 'Add students or upload the roster', steps: ['Students → Manage students.', 'Upload the roster file, or add one student.'] },
    ],
    screen: [
      'Students is the roster with search, grade and class filters, and sorting. A student’s page has their facts at the top (grade, teacher, overall grade, attendance, reading, level test, behavior in 30 days), then the sections. Its address can be shared.',
    ],
    rules: [
      'Grades on the student page cover the active semester; older semesters are under Notes and history.',
      'Only concern and negative notes count toward the ladder. Positive and plain notes do not, and nothing offsets a count.',
      'A case cannot be dismissed; it closes only when the step’s action is recorded.',
    ],
    watchOut: ['Delete student (admin) removes the student and every record linked to them for good. To move a student to another class, use Edit details instead.'],
  },

  // ─── Planning ───
  {
    id: 'lessons', title: 'Lesson plans', updated: '2026-11-20',
    purpose: 'The month for one class, a card per day, printed for parents.',
    tasks: [
      { title: 'Plan a week fast', steps: ['Click Copy last week on the new week.', 'Change the days that differ.'], tour: { path: '/lesson-plans', steps: [{ anchor: 'lessons.copy', text: 'Copies the week above into this one. Then edit only what changes.' }] } },
      { title: 'Plan a day', steps: ['Click the day. Pick a subject, or start typing a unit.', 'Say what students are doing, and fill the “Students will” line.', 'It saves as you type. Save month writes the whole month at once.'] },
      { title: 'Add a second subject to a day', steps: ['Click the day.', 'Click + Another subject under the first, choose the label, and write the plan.'] },
      { title: 'Push the plans back a day', steps: ['When a day is lost, click Move a day later on it.', 'That day’s plan and every later one move a class day on.'] },
      { title: 'Print for parents', steps: ['Print month prints the month for the grade on screen.', 'Or open Print selected Weeks, tick the weeks, and print; it can also print every grade of your class.'] },
    ],
    screen: ['Grade and class chips and the month. Each week starts with a Weekly HW line and Copy last week. Days off and field trips from the school calendar are hatched and cannot be planned.'],
    rules: [
      'A day blocked by the calendar keeps what was typed before it was blocked, but does not print.',
      'Midterm and testing days are tinted only when they are on the parent calendar.',
    ],
    watchOut: [],
  },
  {
    id: 'bookshelf', title: 'Curriculum', updated: '2026-11-20',
    purpose: 'What each class teaches and when: a class’s books as a timeline, every class this week side by side, and the bookshelf of units and lessons.',
    tasks: [
      { title: 'See what my class is teaching this term', steps: ['Curriculum → Class plans. Your class and grade are picked; choose another class, grade or year to see theirs.', 'Each book is a lane and each unit a bar at its suggested length, with today as a line and a flag at the book’s aim date.', 'Click a unit for its lessons, objectives and Drive files.'] },
      { title: 'Find who is teaching the same thing this week', steps: ['Curriculum → All classes this week. Each row is the unit a class is on; a letter marks a unit another class is on the same week.', 'Plan together lists classes on the same unit, and classes that already finished a unit another class is on, so their slides and notes are ready.', 'Previous week and Next week move through the term; Open plan opens a class’s plan.'] },
      { title: 'Set a class plan (admin)', steps: ['Curriculum → Books by class, and pick the year.', 'Place a book in a level and grade’s cell: pick the book and the term (Sp, F or Yr), tick the units this class will do (or All units), Place.', 'Click the book’s chip for its list: change a length, reorder, drop or add units, and set Aim to finish by. Fit to the term gives every unit an even share.', 'Copy another grade’s books here brings a grade over to adjust.'] },
      { title: 'Add a book (admin)', steps: ['Curriculum → Bookshelf → Add a book. Pick the series (or New series…), the level, and a title if the series name is not enough.', 'Retire takes a book out of use without deleting it.'] },
      { title: 'Index a book from its contents', steps: ['Open the book → Draft units and lessons from the contents → set the CCSS grade → Copy the prompt.', 'Give Claude the prompt with photos or text of the table of contents and the guide’s objective pages.', 'Paste the lines it writes → Read the lines → check the preview → Save as suggested.'] },
      { title: 'Confirm what Claude drafted', steps: ['Open the book and read it through. Fix anything with Edit on the unit or lesson.', 'Confirm each unit and lesson, Confirm these lessons on a unit, or Confirm all once the book is right.'] },
      { title: 'Link the files in Drive', steps: ['Paste the book’s or a unit’s Drive folder link in Edit.', 'For one file: open the unit or lesson → Add a Drive link.'] },
    ],
    screen: ['Tabs: Class plans, All classes this week, Books by class (admin and the head teacher), Bookshelf. Holiday weeks from the school calendar are hatched and not counted; a unit that spans one stretches across it.'],
    rules: [
      'Class plans are read-only for teachers; admin and the head teacher set them on Books by class.',
      'Pacing has no dates. Each unit has an order and a number of weeks, counted from the start of the term in Settings. The school year starts in March: spring is the first half, fall the second.',
      'Units and lessons start as Claude’s suggestion and stay marked that way until admin confirms them.',
      'Retire a book rather than deleting it once any class has used it, so past plans still make sense.',
    ],
    watchOut: ['A class plan shows no weeks until the term has start and end dates in Settings.'],
  },
  {
    id: 'standards', title: 'Standards', updated: '2026-11-20',
    purpose: 'Common Core mastery from every scored question, and a checklist of what has been taught.',
    tasks: [
      { title: 'Find who needs reteaching on a standard', steps: ['Mastery, then find the standard’s column.', 'Red and amber cells are below and approaching. Hover a cell for the assessments behind it.', 'For one assessment, Analysis on the Grades page lists names by band.'] },
      { title: 'Record what has been taught', steps: ['Standards checklist lists the grade’s standards by cluster.', 'Set a status and, where needed, an intervention note per standard.'] },
    ],
    screen: ['Tabs: Mastery (students down, standards across, coloured by band), Standards checklist, About CCSS. Standards with no evidence yet are not shown.'],
    rules: ['Bands come from each class’s mastery thresholds (Thresholds, on the Mastery tab): above, on, approaching, below.', 'Evidence is every scored question and rubric criterion tagged with the standard, in the active semester.'],
    watchOut: ['Untagged questions never reach the heat map. Tag sections when you build the key.'],
  },
  {
    id: 'wida', title: 'WIDA', updated: '2026-11-20',
    purpose: 'English language proficiency for every student: levels by domain, how they change, and the scaffolds that go with them.',
    tasks: [
      { title: 'Level the whole class', steps: ['Assess the class.', 'For each student and domain, press the number of the level they clearly do everything through (1–6). That ticks every statement up to it.', 'Tick anything they also do at the next level. Read the suggested level; override it with a button or a decimal if you disagree.', 'Enter saves and moves to the next domain, then the next student. Esc leaves; anything changed is saved on the way out.'], tour: { path: '/wida', steps: [{ anchor: 'wida.assess', text: 'The full-page questionnaire. Keys 1–6 skip ahead, Enter saves and moves on.' }] } },
      { title: 'Update one domain for one student', steps: ['Click the cell in the grid.', 'Adjust the ticks and Save.'] },
      { title: 'Compare with earlier in the year', steps: ['Save snapshot at the start of a term.', 'Later, click the snapshot chip above the grid: each cell shows the change.'] },
    ],
    screen: ['Tabs: Levels (a row per student: listening, speaking, reading, writing, overall), Progress (overall levels by month), Scaffolds, Guide (the six levels, and WIDA against CCSS).'],
    rules: ['A level is met when three of its four statements are ticked and every level below is met.', 'The decimal is the share of the next level ticked: all of 3 and half of 4 is 3.5.', 'Scaffold suggestions follow the whole-number level.'],
    watchOut: ['Tick what you see in class, not what you hope. The statements are written for observation.', 'Snapshots are per class and grade.'],
  },
  {
    id: 'leveltests', title: 'Level tests', updated: '2026-11-20',
    purpose: 'The twice-yearly test that places students into English classes: scores from several teachers, a suggested class, and the teachers’ decision.',
    tasks: [
      { title: 'Enter your part of the scores', steps: ['Level tests → open the test, then the part you scored: Oral test, Written test or Teacher ratings.', 'Enter your students’ scores. Only your part is saved, so colleagues can enter theirs at the same time.', 'When a written paper is fully marked, press Mark test graded.'] },
      { title: 'Decide placements', steps: ['Results ranks the grade by composite, with the suggested class beside the current one.', 'In the Leveling meeting, move students and keep each class at or under fifteen. The composite suggests; teachers decide.'] },
    ],
    screen: ['A list of tests by semester. A test opens on its parts: the oral and written tests, teacher ratings, results, history, and the leveling meeting.'],
    rules: [
      'Teacher ratings are notes for the placement conversation and are not in the composite.',
      'A written section nobody has marked carries no score until Mark test graded; from then on every empty section scores 0.',
      'Oral scores also show on the Reading page and the student page.',
    ],
    watchOut: ['Check by eye any student marked comp n/a or with a warning sign before placing them: a student stopped for a reason other than reading scores lower than they should.'],
  },
  {
    id: 'reports', title: 'Reports', updated: '2026-11-20',
    purpose: 'Progress reports and report cards from the grades already entered, reviewed and approved before printing.',
    tasks: [
      { title: 'Write report cards', steps: ['Reports → Report card. Check the semester, grade and class, then pick a student.', 'Read the fact sheet beside the box, then write; or press Build a comment, tick the sentences that are true, Put in the box, and make it yours.', 'The box saves itself a second after you stop typing. The grey line under it counts words and flags anything to fix.', 'Next saves and opens the next student without a comment.'] },
      { title: 'Write progress reports', steps: ['Reports → Progress report, pick a student, and write in the box.', 'Or open Comments for the whole class on one page; check that the switch at its top says Progress report.'] },
      { title: 'Set the pronoun and the name used in comments', steps: ['Above the comment box, click he, she or they. It is remembered for the student.', 'Called is the name in comments; press Enter to keep the suggestion or type another.'] },
      { title: 'Mark an area not assessed', steps: ['On the class overview, use the Not assessed chips to mark an area N/A for the whole class, separately for the progress report and the report card.', 'The app says which areas have no assessments yet.'] },
      { title: 'Get comments approved and printed', steps: ['Admin reads and approves every comment under Review & approve; an approved card carries an APPROVED stamp.', 'If admin leaves a note on a student, it shows above the box with Mark as reviewed. Fix the comment, then mark it.', 'Print: progress reports or report cards for the class or one student. Class prints of report cards wait until the grade is marked ready.'] },
    ],
    screen: [
      'Tabs: Report card, Progress report, Comments, Class summary, Review & approve, Print. The page opens on the document being written now. A progress report prints as a half page, two to a sheet, when the comment fits in about five lines; a longer comment gets a full page.',
    ],
    rules: [
      'The composite weights formative, summative and performance task by the weights in Settings; it is computed, never typed.',
      'Only the class’s own teacher, or an admin, can edit its comments and grades.',
      'A student has one comment per document. A comment typed under Report card does not appear on the progress report, or the other way round.',
      'The fact sheet is for your eyes; nothing on it is printed or inserted.',
    ],
    watchOut: ['Grades entered after the report card cutoff still count, but the review may already be under way.'],
  },

  // ─── More ───
  {
    id: 'behavior', title: 'Behavior', updated: '2026-11-20',
    purpose: 'Every behavior ladder case with its story so far, and every behavior note, in one place.',
    tasks: [
      { title: 'See whether admin has followed up', steps: ['More → Behavior.', 'Read the case’s line: read by admin and when, then the action, or not read yet with how long it has waited.'] },
      { title: 'Send a reminder', steps: ['On a case that is waiting, click Send a reminder.', 'Admin gets an urgent notice with no name on it. One reminder a day per case; the button says Reminded today after that.'] },
    ],
    screen: ['Ladder cases first (Needs action, Closed, All), then behavior notes newest first, with the window, the kind, flagged only, and a student search. Open the notes shows a case the way the dashboard does.'],
    rules: ['Teachers see their own class. Admin, the head teacher and the Snapdragon teacher see every class.', 'Who sent a reminder is not recorded anywhere.', 'School days count weekdays only.'],
    watchOut: [],
  },
  {
    id: 'jobs', title: 'Jobs', updated: '2026-11-20', audience: 'jobs',
    purpose: 'The office and admin work: what needs doing, by when, who has it, and how it is done. For the admin account and the Snapdragon teacher.',
    tasks: [
      { title: 'Add a job', steps: ['Type the title in the add line, pick when, press Enter.', 'It lands under Nobody yet and opens: add the steps and the category, and take it or leave it for the other account.'] },
      { title: 'Take a job', steps: ['Open the card and tap your name. Hand to passes it to the other account.'] },
      { title: 'Give a job its steps', steps: ['Open the card. Type a step and press Enter, or paste a whole list and press Add: each line becomes a step.', 'To share a job, choose Shared as the owner and tap an initial beside each step to say whose it is.', 'Give a step its own day with the calendar beside it; it then shows in that week and on the dashboard.'] },
      { title: 'Keep a long job moving', steps: ['Press ▶ on the step you are on and type where you are.', 'Press Worked on it today after a stint with no step to tick.'] },
      { title: 'Set a routine for the term', steps: ['The year → the routine → set the date for a term.', 'Every job in the routine appears on the board, dated from the event.'] },
      { title: 'Ask when stuck', steps: ['Open the card → Stuck? → type the question → Send.', 'The answer is saved as a step on the job and on its routine, so it is there next time.'] },
    ],
    screen: ['Big jobs first, then a column each for you, Nobody yet and the other account (working on, this week, later this month, next month), then Later, and One day for wishes. The dashboard shows your jobs due this week at the top.'],
    rules: ['Nothing is owned by default. A job under Nobody yet shows on both dashboards until someone takes it.', 'Marking a job done writes “Finished a job” to the activity log.'],
    watchOut: [],
  },
  {
    id: 'supplies', title: 'Supplies', updated: '2026-11-20',
    purpose: 'The office stock, what people need, and the receipts and counts that keep the numbers right. Every receipt also feeds the Budget page.',
    tasks: [
      { title: 'Say something is running low', steps: ['Stock → the item → Low.', 'It shows as low for everyone, with your name and the day, until the next count.'] },
      { title: 'Ask for something', steps: ['Requests → type what, how many, what for, and a link if there is one → Add request.', 'Someone who needs the same thing presses Me too instead of adding it again.'] },
      { title: 'Enter a receipt', steps: ['Receipts → Copy the prompt. Give Claude the scanned receipt with that prompt; it writes one line per item.', 'Paste the lines in, set the date and the shop, then Read the lines.', 'Check each line: the stock item it adds to, or the teacher or event a one-off is for, and the request it answers.', 'Save the receipt. Stock goes up, purchases reach the Budget page, and matched requests are marked arrived.'] },
      { title: 'Do the quick count', steps: ['Count → Quick count (the dashboard card has the button). Print the sheet first if you want paper.', 'Type the packs and loose where they differ, and Save. Saving records the count even if nothing changed, and clears the Low flags.'] },
      { title: 'Do the full count', steps: ['Admin, once a month: Count → Full count. Every item is listed. Count, type the numbers, Save.'] },
    ],
    screen: ['Tabs: Stock (what is on hand as packs and loose, the least to keep, and a status), Requests (Needed, Ordered, Arrived), Receipts, Count. A card on the dashboard shows what is low and whose quick count it is.'],
    rules: ['Nobody records what they take. Receipts put stock up; counts put it right. A request marked Arrived does not change stock by itself.', 'The quick count belongs to whoever has the chosen office job that week, from the rotation in Settings.', 'Every change to a number is kept with who and when; open an item’s history to see it.'],
    watchOut: ['Keep an item’s other names current, so Claude’s receipt lines match it without fixing.'],
  },
  {
    id: 'overtime', title: 'Overtime', updated: '2026-11-20',
    purpose: 'Log non-instructional overtime as you go, and print the school’s overtime sheet for the weeks you choose.',
    tasks: [
      { title: 'Log overtime', steps: ['More → Overtime, or Add on the dashboard’s overtime line.', 'Type the times the way you would say them: 4:30 and 6:45 (or 4:30-6:45 in From). The time and won show beside them.', 'Type what the work was, or tap a recent reason, then Add or Enter.'] },
      { title: 'Fix or delete an entry', steps: ['Find it under its week. The pencil turns the row into fields; Save, or Escape to leave it. The bin deletes it after asking.'] },
      { title: 'Print your sheet', steps: ['Print sheet at the top right.', 'Pick This month, Last month or Last 2 weeks, or type From and To. The sheet beside it changes as you do.', 'Print.'] },
      { title: 'Print everyone’s sheets (admin)', steps: ['Overtime → Print or export.', 'Pick Who and the dates, then Print, or Export to Excel.'] },
      { title: 'Change the rate or the wording (admin)', steps: ['Settings → Overtime. Type the rate in won an hour, edit the policy paragraph and the reasons everyone can tap, and Save.'] },
    ],
    screen: ['The month as one table laid out like the paper sheet: the first row is where you log, then the weeks with their totals, then the month’s total and the hourly rate.'],
    rules: [
      'Weekends and whole-school days off on the calendar are not overtime and cannot be logged.',
      'Times with no am or pm are read as after school: 1 to 6 is afternoon, 7 to 11 morning, 12 noon. Type am or pm, or 24-hour time, to say otherwise.',
      'Entries the same day cannot overlap.',
      'Won is always the minutes at the rate in Settings, so a new rate changes every figure, past months included.',
      'Admin sees everyone’s sheets; everyone else sees their own.',
    ],
    watchOut: ['Print opens a new window. If nothing happens, allow pop-ups for the site.'],
  },
  {
    id: 'budget', title: 'Budget', updated: '2026-11-20',
    purpose: 'What the office has spent this semester, from the receipts entered on Supplies: each teacher’s one-off purchases against their allowance, the office’s spending, and the totals by month.',
    tasks: [
      { title: 'See what I have left', steps: ['More → Budget. Your line shows the allowance, what has been charged to you, and what is left.'] },
      { title: 'Set the allowances', steps: ['Pick the semester at the top.', 'Click an allowance, type the amount in won, Enter. The office line is the budget for stock and events.'] },
      { title: 'Move a purchase to the right person', steps: ['Purchases → Edit on the line.', 'Change the kind, the teacher (or Office or event), what it was for, or the price.'] },
    ],
    screen: ['By teacher (allowance, spent, left), By month, and Purchases: every receipt line with its date, what, who it was for, and the price.'],
    rules: ['A purchase is charged to a teacher only when the receipt line was entered as a one-off for them; stock is the office’s.', 'Admin, the head teacher and the Snapdragon teacher see every teacher; a teacher sees their own.'],
    watchOut: ['A receipt line entered without a price counts as zero until it is edited.'],
  },
  {
    id: 'activity', title: 'Activity', updated: '2026-11-20', audience: 'activity',
    purpose: 'Who signed in and what they did, down to the class, student and sheet. Only the Snapdragon account can open it.',
    tasks: [
      { title: 'See when someone last signed in', steps: ['More → Activity.', 'Read their card in the strip at the top, or pick Sign-ins and sign-outs in the action filter.'] },
      { title: 'See what was done on a day', steps: ['Set the window and, if you like, the teacher.', 'Scroll to the day. Scoring shows the assessment and how many saves; prints show what was printed and for whom.'] },
    ],
    screen: ['A strip of every teacher with their last sign-in, filters (Today, 7 days, 30 days; teacher; kind of action), then the list by day, newest first. ×N means the same action repeated within ten minutes.'],
    rules: ['Only actions taken in the app appear.', 'A sign-in is recorded when a teacher picks their name and logs in, not when a page is reloaded.'],
    watchOut: [],
  },
  {
    id: 'admin-settings', title: 'Settings', updated: '2026-11-20',
    purpose: 'The dates, weights and thresholds the rest of the app works from. Everyone can read them; most are changed by admin.',
    tasks: [
      { title: 'Open a new semester (admin)', steps: ['Semesters: add the semester with its dates (midterm cutoff, report card grades due) and make it active.', 'Check the assessment weights still fit.', 'Remind teachers to Save snapshot on WIDA.'] },
      { title: 'Set a weekday with no class', steps: ['Days with no class: tick the grade and weekday. Lesson plans and attendance follow.', 'Admin, the head teacher or the Snapdragon teacher can change it.'] },
      { title: 'Change the behavior ladder (admin)', steps: ['Behavior ladder: set each step’s number of notes, its name and the action that closes it, and after how many school days an unread case turns red. Save.'] },
    ],
    screen: ['Sections: Display, Teachers, Semesters, Days with no class, Office jobs, Program benchmarks, Assessment weights, Behavior ladder, then Overtime and Classes for admin, and School information.'],
    rules: ['Only one semester is active; the dashboard dates, the student page and the Standards heat map read from it.', 'Changing a weight changes composites everywhere, past and present.', 'Reading targets can also be edited on the Reading page; both change the same targets.'],
    watchOut: [],
  },
]

export const WORKFLOWS: Workflow[] = [
  { id: 'wf-start', title: 'Start of semester', when: 'The week before classes', steps: ['Admin: check the semester dates in Settings (midterm cutoff, report card grades due).', 'Admin: check the roster and classes under Students → Manage students.', 'Everyone: read the calendar on the dashboard; days off and field trips already block lesson plans.', 'Everyone: Assess the class on WIDA if levels are out of date, and Save snapshot.', 'Everyone: plan the first two weeks under Lesson plans.'] },
  { id: 'wf-test', title: 'From a test to the gradebook', when: 'The day of a quiz or unit test', steps: ['Grades → New assessment. Build the key as sections and tag standards.', 'Score on the answer sheet with the keyboard; mark absentees with X.', 'Open Analysis; note the standards below target and who is in that band.', 'Reteach; the Mastery heat map on Standards updates as later work is scored.'] },
  { id: 'wf-reports', title: 'Report card week', when: 'The two weeks before grades are due', steps: ['Dashboard: the Ungraded stat must reach zero. Clear the queue.', 'Reports → Report card: write comments student by student. Class summary shows who is missing one.', 'Admin: Review & approve, then print.'] },
  { id: 'wf-wida', title: 'Leveling the class in WIDA', when: 'Twice a year, or when a student changes fast', steps: ['WIDA → Levels → Assess the class.', 'Keys 1–6 to skip ahead, tick the next level, Enter.', 'Save snapshot when done; Progress shows change over the year.'] },
  { id: 'wf-dayoff', title: 'A field trip or day off', when: 'When the office announces it', steps: ['Admin: add the event on the dashboard calendar with the grades it applies to.', 'Attendance for that day fills itself in: everyone absent, with the day as the note.', 'Lesson plans block the day.'] },
  { id: 'wf-leveltest', title: 'Level test week', when: 'Twice a year', steps: ['Admin: create the level test for the semester under Level tests.', 'Each teacher enters the parts they scored; saving writes only that part.', 'Teachers meet over Results and the Leveling meeting, decide, and keep classes at or under fifteen.'] },
]

export const DEFINITIONS: { term: string; text: string }[] = [
  { term: 'Domain', text: 'One of the areas a grade is kept in: Reading, Phonics, Writing, Speaking & Listening, Language. Assessments belong to one; mixed papers can split across several by standard.' },
  { term: 'Composite', text: 'A domain’s average with formative, summative and performance task weighted by the settings. It is computed, never typed.' },
  { term: 'Formative, summative, performance task', text: 'Quizzes and classwork; unit tests and exams; projects and presentations. The category sets the weight.' },
  { term: 'Mastery band', text: 'Above, on target, approaching, below: a percent on a standard compared to the class’s thresholds on the Standards page.' },
  { term: 'Standard', text: 'A Common Core code such as RL.3.2, with a plain name in the app (“Main idea and key details”). Prefix: RL/RI reading, RF phonics, W writing, SL speaking and listening, L language.' },
  { term: 'Rubric', text: 'Criteria scored 0 to 4 with a descriptor per level. 0 is “none”; leave a criterion blank if it was not assessed.' },
  { term: 'WIDA level', text: '1 Entering, 2 Emerging, 3 Developing, 4 Expanding, 5 Bridging, 6 Reaching, per domain. May carry one decimal.' },
  { term: 'Scaffold', text: 'A support strategy assigned to a student for a domain, tracked as working or not working.' },
  { term: 'CWPM', text: 'Correct words per minute on a timed passage. Accuracy is correct over attempted.' },
  { term: 'Lexile', text: 'A text-difficulty measure. The class target is a range.' },
  { term: 'Absent vs exempt', text: 'Both leave the student out of an assessment’s averages. Absent means they missed it; exempt means the work was waived.' },
  { term: 'Level test', text: 'The placement test that sorts students into English classes, scored by several teachers and decided by teachers.' },
]

// Only admins see these, after everything else.
export const ADMIN_SECTIONS: GuideSection[] = [
  {
    id: 'admin-calendar', title: 'Calendar events', updated: '2026-11-20', audience: 'admin',
    purpose: 'Days off, field trips, exams, deadlines and events on the shared calendar.',
    tasks: [
      { title: 'Add a day off', steps: ['On the dashboard calendar, add an event with the type Day off, its dates, and the grades it applies to (none means everyone).', 'Attendance and lesson plans pick it up the same day.'] },
    ],
    screen: ['An event has a title, a type, a date and end date, the grades, and whether it shows on the parent calendar.'],
    rules: ['Day off and field trip always block lesson plans and fill in attendance, whether or not they are on the parent calendar.', 'Midterm and testing only tint the lesson plan when they are on the parent calendar.'],
    watchOut: ['A multi-day event needs its end date, or only the first day is blocked.'],
  },
  {
    id: 'admin-people', title: 'Teachers, roster, notices', updated: '2026-11-20', audience: 'admin',
    purpose: 'Who can log in, who is in which class, and school-wide notices.',
    tasks: [
      { title: 'Move a student to another class', steps: ['Open the student → Edit details → change the English class → Save.'] },
      { title: 'Add or change a teacher', steps: ['Settings → Teachers: name, class and role.'] },
    ],
    screen: ['A teacher sees their own class; admin sees every class. Any teacher can post a notice; admin can post to everyone.'],
    rules: ['Flagged behavior notes count on the Dashboard link for admin.'],
    watchOut: ['Removing a teacher from the list keeps everything they entered.'],
  },
  {
    id: 'admin-release', title: 'What’s new and this guide', updated: '2026-11-20', audience: 'release',
    purpose: 'How changes reach teachers, and how to hold, move or drop an announcement.',
    tasks: [
      { title: 'Release a batch', steps: ['Entries are dated the Monday they go out. Read them on What’s new before that day; Coming up lists them.', 'To go early, click Release today on the batch; to wait, change its Move to date.'] },
      { title: 'Hold back one entry', steps: ['Click Manage on What’s new.', 'Turn the entry off, or give it a later date. Reset puts it back on its original date.'] },
    ],
    screen: ['Teachers see a dot on their name and a count beside What’s new in the name menu until they have read a batch. Each teacher’s read state is remembered. Coming up and Manage are on the Snapdragon account only; other admins see scheduled entries read-only.'],
    rules: ['Changes on What’s new apply to everyone at once: the page, the dot and ⌘K.', 'Turning an entry off hides the announcement; the feature itself is unchanged.', 'No feature ships without its guide section updated at the same time.'],
    watchOut: ['Moving a batch earlier than a teacher last read What’s new means it never shows as new for them; it is still on the page.'],
  },
]

export const ALL_SECTIONS = () => [...GUIDE_SECTIONS, ...ADMIN_SECTIONS]

type Viewer = { role?: string; english_class?: string; is_head_teacher?: boolean } | null | undefined

/** Whether this account can open the page a section describes. */
export function canSeeSection(s: GuideSection, t: Viewer): boolean {
  switch (s.audience) {
    case 'admin': return t?.role === 'admin'
    case 'jobs': return canSeeAdminJobs(t)
    case 'activity': return canViewActivity(t)
    case 'release': return t?.role === 'admin' || canManageWhatsNew(t)
    default: return true
  }
}

/** Every section this account can use, in guide order: the pages, then the admin chapter. */
export function guideSectionsFor(t: Viewer): GuideSection[] {
  return ALL_SECTIONS().filter(s => canSeeSection(s, t))
}

/** The address of one how-to inside its section: /guide#grades--see-what-to-reteach. */
export function taskAnchor(sectionId: string, title: string): string {
  return `${sectionId}--${title.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}
