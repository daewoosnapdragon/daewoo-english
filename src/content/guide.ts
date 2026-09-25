import type { Tour } from '@/lib/tour'

// ─── How to use this app ─────────────────────────────────────────
// One section per page, in nav order, each with the same five parts. The
// rule: a feature does not ship without its section updated in the same
// commit, and the What's new entry links here. "Updated" is the date the
// section text last changed. No screenshots: the tours point at the live
// screen instead.

export interface GuideTask { title: string; steps: string[]; tour?: Tour }
export interface GuideSection {
  id: string
  title: string
  updated: string        // YYYY-MM-DD
  purpose: string
  screen: string[]       // the controls, top to bottom
  tasks: GuideTask[]
  rules: string[]
  watchOut: string[]
}
export interface Workflow { id: string; title: string; when: string; steps: string[] }

export const QUICK_START: { title: string; steps: string[] } = {
  title: 'Your first week',
  steps: [
    'Log in by clicking your name. Your class is remembered, so every page opens on it.',
    'Take attendance: Attendance in the top bar, tap a status per student, Save. Or click today’s period on the dashboard schedule.',
    'Enter a grade: Grades → New assessment. Name it, pick how it is scored, and score it on the answer sheet.',
    'Open a student: type their name in the box at the top left (or press ⌘K). Their page has the behavior log first.',
    'Read the notice board under the header each morning; dismiss what you have read.',
    'Press ⌘K whenever you are not sure where something is. Typing a page name or an action gets you there.',
  ],
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'dashboard', title: 'Dashboard', updated: '2026-09-25',
    purpose: 'The page that opens to “now”: what is due, what is unmarked, and what needs a look, with the month and the week’s agenda beside it.',
    screen: [
      'The header greets you with today’s date and the active semester. Two buttons jump to marking attendance and entering grades.',
      'The stats strip: attendance still unmarked today, ungraded assessments, days to the midterm cutoff, days until report card grades are due. Each one is a link.',
      'The notice board sits under the header on every page. Teachers post notices; you dismiss your own copy. Urgent ones are shaded red until read.',
      'The month calendar with the agenda beside it. Events come from the school calendar; five colors mark the kinds. Admins add events here.',
      'The grading queue: every assessment with students still unmarked. Continue opens its sheet; ABS and EXM clear a student without leaving.',
      'Needs attention: students whose grades have dropped or whose attendance has slipped, with the reason.',
      'The weekly schedule strip. Click a period to mark that class’s attendance in a drawer.',
      'What’s new: a card that appears when something has changed since you were last here. Got it hides that batch.',
    ],
    tasks: [
      { title: 'Clear the grading queue', steps: ['Find the assessment under Ungraded.', 'Click Continue to open the sheet on the first unmarked student.', 'Or click ABS or EXM beside a name to mark a student absent or exempt right there.'], tour: { path: '/dashboard', steps: [{ anchor: '#grading', text: 'Every assessment with an unmarked student. Continue opens the sheet; ABS and EXM handle a student here.' }] } },
      { title: 'Mark a class from the schedule', steps: ['Scroll to the weekly schedule.', 'Click the period.', 'Tap a status per student in the drawer and save.'] },
      { title: 'Post a notice', steps: ['Press ⌘K and choose Post a notice, or use the notice board’s compose button.', 'Write it, pick who sees it, mark it urgent if it is, set when it expires.', 'Post. Each teacher dismisses their own copy.'] },
    ],
    rules: [
      'Report card grades due comes from the semester’s cutoff date in Settings.',
      'A day off on the calendar means attendance is not expected and the stat shows a dash.',
      'Needs attention flags a student whose domain average fell more than the threshold since the last assessment, or with three or more absences in two weeks.',
    ],
    watchOut: ['The header can be collapsed with the arrow at the top right; click it again to bring the links back.', 'Notices expire on the date the poster set, so an old one disappears on its own.'],
  },
  {
    id: 'grades', title: 'Grades', updated: '2026-09-25',
    purpose: 'Create assessments, score them question by question or with a rubric, and see how the class did.',
    screen: [
      'Chips under the title pick grade, class, and domain. The domain chip filters the assessment list.',
      'Tabs: Score Entry (the scoring sheet), Batch Grid (one total per student for several assessments), Domain Overview (charts), Student View, Calendar.',
      'New assessment opens a three-step flow: Set up, Answer key or Rubric, Score.',
      'On a scored assessment, three views: Answer sheet, Class grid, Analysis. Save all and an autosave every 30 seconds.',
      'Edit on an assessment changes its name, date, points, or standards.',
    ],
    tasks: [
      { title: 'Score a test with an answer key', steps: ['New assessment. Name it, choose the domain and category, and pick Answer key under “How will you score it?”.', 'Next. Describe the paper as sections: type the letters for multiple choice, count the written questions and set their points, pick a rubric for a writing task.', 'Tag a standard on each section if you want mastery tracked. Use “Tag every section with one standard” when it is all one skill.', 'Save key and start scoring. Type A–D or T/F for choice items, a number for written ones, Enter for the next student, X for absent, ⇧X for exempt.', 'Save all when the class is done, or let the autosave do it.'], tour: { path: '/grades', steps: [{ anchor: 'grades.new', text: 'New assessment starts the flow.' }, { anchor: 'grades.scoring', text: 'Answer key scores question by question. Rubric scores criteria 0–4. Points only is one total per student.' }] } },
      { title: 'Score with a rubric', steps: ['New assessment, pick Rubric under “How will you score it?”, Next.', 'Choose a template or a saved rubric. The assessment is created and scoring opens as a full page.', 'For each criterion click the level whose descriptor fits, 0 to 4. Keys 0–4 mark and move down; Enter goes to the next student.'] },
      { title: 'Mix multiple choice, short answers, and a rubric on one paper', steps: ['In the sections builder, add a section for each part in the order they appear.', 'Tag standards on sections. If a standard belongs to another domain (RL/RI reading, RF phonics, W writing, SL speaking, L language) a box appears offering to route those points to that domain.', 'Score as usual. The class grid and student page show each part.'] },
      { title: 'See what to reteach', steps: ['Open the assessment and click Analysis.', 'Read the score spread, then Standards mastery: click a standard for the names in each band.', 'Question by question shows the most missed and why; click a row for who missed it.'], tour: { path: '/grades', steps: [{ anchor: 'grades.views', text: 'Answer sheet for scoring, Class grid for the whole class, Analysis for what to reteach.' }] } },
      { title: 'Enter one total per student', steps: ['New assessment, pick Points only, set the total, Create and enter scores.', 'Type each total in the list. Batch Grid does the same for several assessments at once.'] },
    ],
    rules: [
      'Formative, summative, and performance task are weighted into the composite by the weights in Settings.',
      'Points on a mixed paper go to the domain of the question’s standard when routing is on; untagged questions go to the assessment’s domain.',
      'A rubric item is worth 4 points per criterion. The score is the sum of levels over the maximum, scaled to the item’s points.',
      'Absent leaves the student out of averages; exempt does the same but records that the work was waived.',
    ],
    watchOut: ['A 0 on a rubric is a real zero, not “not assessed”. Leave the criterion unmarked if you have not seen it.', 'Half points are allowed on written items when scoring, not on the key.', 'Deleting a rubric from the library does not change any assessment already scored with it.'],
  },
  {
    id: 'attendance', title: 'Attendance', updated: '2026-09-25',
    purpose: 'Today’s attendance in a few taps, the month at a glance, and printing for the office.',
    screen: [
      'Day and Month at the top. Day is where you mark; Month is the record.',
      'Grade and class chips, a date picker, and Today to jump back.',
      'One row per student with Present, Absent, and Tardy, and a note field.',
      'Save attendance at the top right. Print selected weeks opens a chooser.',
      'The Attendance link in the top bar shows a dot until today is saved, and a reminder appears at 3:30 if it is not.',
    ],
    tasks: [
      { title: 'Mark today', steps: ['Open Attendance (or click the period on the dashboard schedule).', 'Everyone starts present. Tap Absent or Tardy where needed and add a note if useful.', 'Save attendance.'], tour: { path: '/attendance', steps: [{ anchor: 'attendance.save', text: 'Save writes the day. The masthead dot clears once every class you teach is done.' }] } },
      { title: 'Fix a past day', steps: ['Pick the date, change the statuses, Save.', 'Or open Month and click the cell.'] },
      { title: 'Print for the office', steps: ['Click Print, tick the weeks, Print selected.'] },
    ],
    rules: [
      'A day off on the school calendar means no class: the page says so and nothing is expected.',
      'A field trip marks every student absent with the trip as the note, automatically, the first time the day is opened. Change any student afterwards if they stayed behind.',
      'Weekends have no class. Grade 5 has no Monday class if that rule is on in Settings.',
    ],
    watchOut: ['Leaving the page with unsaved changes asks first.', 'The dashboard stat counts students still unmarked across all your classes today.'],
  },
  {
    id: 'lessons', title: 'Lesson plans', updated: '2026-09-25',
    purpose: 'The month for one class, one card per day, printed for parents.',
    screen: [
      'Grade and class chips and the month arrows.',
      'Each week starts with a Weekly HW line and a Copy last week button.',
      'Each day card holds one or more subjects (Reading, Writing, and so on), what is covered, and a “Students will” objective. Click a day to edit it below the grid.',
      'Days off and field trips are hatched and cannot be planned. A midterm or testing day is tinted when it is on the parent calendar.',
      'Save month writes everything. Print opens the parent version.',
    ],
    tasks: [
      { title: 'Plan a week fast', steps: ['Click Copy last week on the new week.', 'Change the days that differ.', 'Save month.'], tour: { path: '/lesson-plans', steps: [{ anchor: 'lessons.copy', text: 'Copies the week above into this one. Then edit only what changes.' }] } },
      { title: 'Add a second subject to a day', steps: ['Click the day.', 'Click Another subject under the first, choose the label, write the plan.'] },
    ],
    rules: [
      'A day blocked by the calendar keeps whatever was typed before it was blocked but does not print.',
      'Only midterm and testing events that are checked for the parent calendar show on the plan. A teacher deadline filed as a midterm event stays off.',
      '“No Grade 5 on Mondays” is a rule in Settings, not fixed in the app.',
    ],
    watchOut: ['Save month is per class and month; switching class without saving asks first.'],
  },
  {
    id: 'students', title: 'Students', updated: '2026-09-25',
    purpose: 'The roster, and a full page per student that gathers everything the app knows about them.',
    screen: [
      'Search, grade and class filters, and a sort. Manage students opens roster upload, add, and bulk edit (admin).',
      'Click a name to open the student page at its own address (/students/…), which you can share.',
      'On the student page a rail on the left lists the sections: Behavior first, then Grades, Reading, Attendance, Standards, Level tests, Support, Notes and history.',
      'Print at the top right builds a one-page PDF.',
    ],
    tasks: [
      { title: 'Log a behavior note', steps: ['Open the student. Behavior is the first section.', 'Add a note with the type (positive, concern, parent contact, and so on).', 'Flag it for admin if it needs following up.'] },
      { title: 'Read a student’s grades', steps: ['Grades at a glance shows each domain’s current average with a bar; below it the assessments of this semester.', 'For older semesters use Notes and history.'] },
      { title: 'See WIDA levels and scaffolds', steps: ['Support shows the four levels, active scaffolds, and history, read-only.', 'Click Change on the WIDA page to update them.'] },
    ],
    rules: ['Grades at a glance covers the active semester only.', 'The reading trend merges running records with level test oral scores.'],
    watchOut: ['Removing a student deactivates them; their records stay.'],
  },
  {
    id: 'reading', title: 'Reading', updated: '2026-09-25',
    purpose: 'Fluency and Lexile over time, against the class’s targets.',
    screen: [
      'Tabs: Class overview, Student detail, By passage, Passage library.',
      'Grade and class chips. Add reading record at the top right.',
      'Class overview lists every student with CWPM, accuracy, Lexile, and band. Edit these targets under it changes the class’s mid-year and end-of-year targets and Lexile range.',
      'Student detail is the trend line for one student with the targets as a band.',
    ],
    tasks: [
      { title: 'Record a running record', steps: ['Add reading record.', 'Pick the student and passage, enter words correct and errors (or CWPM and accuracy), Lexile if you have it.', 'Save. The trend updates.'], tour: { path: '/reading', steps: [{ anchor: 'reading.add', text: 'One record per student per passage. The class overview and the student page update at once.' }] } },
      { title: 'Change the targets', steps: ['Class overview → Edit these targets.', 'Set mid-year and end-of-year CWPM and the Lexile range, Save.'] },
    ],
    rules: ['Bands: below, approaching, proficient, advanced, from the class targets.', 'Level test oral scores appear as points in the trend, marked as such.'],
    watchOut: ['Targets are per class and grade; check you are on the right one before editing.'],
  },
  {
    id: 'reports', title: 'Reports', updated: '2026-09-25',
    purpose: 'Report cards and progress reports from the grades already entered, reviewed and approved before printing.',
    screen: [
      'Tabs: Report card, Progress report, Class summary, Review & approve.',
      'A picker for the whole class or one student.',
      'Each report shows the composite per domain, the letter, attendance, and the comment box.',
      'Print produces the parent copy.',
    ],
    tasks: [
      { title: 'Write report cards', steps: ['Enter every grade first; the composite is computed, not typed.', 'Report card, pick a student, write the comment. The WIDA level and behavior notes are there to draw on.', 'Repeat. Class summary shows who is still missing a comment.', 'Admin reviews and approves under Review & approve, then prints.'] },
    ],
    rules: ['The composite weights formative, summative, and performance task by the weights in Settings.', 'Only the class’s own teacher, or an admin, can edit its comments and grades.'],
    watchOut: ['Grades due on the dashboard is the report card cutoff. After it, entries still count but the review may already be under way.'],
  },
  {
    id: 'leveltests', title: 'Level tests', updated: '2026-09-25',
    purpose: 'The twice-yearly test that places students into English classes: scores from several teachers, a suggested placement, and the teachers’ decision.',
    screen: [
      'A list of level tests by semester. Open one for its sections and scores.',
      'Sections: word reading, passage CWPM, comprehension, written multiple choice, writing, plus four teacher ratings on a 1–4 scale.',
      'Placement shows the composite, the suggested class, and the current class, with the cap per class.',
    ],
    tasks: [
      { title: 'Enter your part of the scores', steps: ['Open the test, pick the section you scored.', 'Enter scores for your students and save. Only your section is written, so colleagues can enter theirs at the same time.'] },
      { title: 'Decide placements (admin)', steps: ['Read the suggestion, then set the class. The composite suggests; teachers decide.', 'Keep each class at or under fifteen.'] },
    ],
    rules: ['Scoring follows the teacher’s guide; what was printed follows the student copy.', 'Oral scores feed the Reading page and the student page.'],
    watchOut: ['Two teachers can be on one student’s written paper; each saves only their own section.'],
  },
  {
    id: 'standards', title: 'Standards', updated: '2026-09-25',
    purpose: 'Common Core mastery from every scored question, and a checklist of what has been taught.',
    screen: [
      'Tabs: Mastery (the heat map), Standards checklist, About CCSS.',
      'Mastery is students down, standards across, colored by band. Hover a cell for the evidence. Standards with no evidence are not shown.',
      'The checklist groups standards by cluster for the grade, with a status and an intervention note per standard.',
      'Wherever a standard is picked in the app, search by plain words (“main idea”), filter by grade, and see which ones your class has used.',
    ],
    tasks: [
      { title: 'Find who needs reteaching on a standard', steps: ['Mastery, find the column.', 'Red and amber cells are below and approaching. Hover for the assessments behind it.', 'For one assessment, the Analysis view on Grades lists names by band.'] },
    ],
    rules: ['Bands come from the mastery thresholds in Settings (above, on, approaching, below).', 'Evidence is every scored question tagged with the standard, plus rubric criteria tagged with it, in the active semester.'],
    watchOut: ['Untagged questions never reach the heat map. Tag sections when you build the key.'],
  },
  {
    id: 'wida', title: 'WIDA', updated: '2026-09-25',
    purpose: 'English language proficiency for every student: levels by domain, how they change, and the scaffolds that go with them.',
    screen: [
      'Tabs: Levels, Progress, Scaffolds, Guide. Grade and class chips.',
      'Levels is the class grid: one row per student, listening, speaking, reading, writing, overall, last updated. Click a cell to open that domain’s questionnaire on the right.',
      'Assess the class opens the full-page questionnaire, student by student.',
      'Save snapshot freezes today’s levels for comparing later; Print makes a one-pager.',
      'Progress is the timeline of overall levels by month. Scaffolds assigns strategies. Guide explains the six levels and WIDA against CCSS.',
    ],
    tasks: [
      { title: 'Level the whole class', steps: ['Assess the class.', 'For the first student and domain, press the number of the level they clearly do everything through (1–6). That ticks all the statements up to it.', 'Tick anything they also do at the next level. Read the suggested level; override with a button or a decimal if you disagree.', 'Enter saves and moves to the next domain, then the next student. Esc exits; anything changed is saved on the way out.'], tour: { path: '/wida', steps: [{ anchor: 'wida.assess', text: 'The full-page questionnaire. Keys 1–6 skip ahead, Enter saves and moves on.' }] } },
      { title: 'Update one domain for one student', steps: ['Click the cell in the grid.', 'Adjust the ticks, Save.'] },
      { title: 'Compare with earlier in the year', steps: ['Save snapshot at the start of a term.', 'Later, click the snapshot chip above the grid: each cell shows the change.'] },
    ],
    rules: ['A level is met when three of its four statements are ticked and every level below is met.', 'The decimal is the share of the next level ticked: all of 3 and half of 4 is 3.5.', 'Scaffold suggestions follow the whole-number level.'],
    watchOut: ['Tick what you see in class, not what you hope. The statements are written for observation.', 'Snapshots are per class and grade.'],
  },
]

export const WORKFLOWS: Workflow[] = [
  { id: 'wf-start', title: 'Start of semester', when: 'The week before classes', steps: ['Admin: check the semester dates in Settings (midterm cutoff, report card grades due).', 'Admin: roster is uploaded and classes are right under Students.', 'Everyone: read the calendar on the dashboard; days off and field trips are already blocking lesson plans.', 'Everyone: Assess the class on WIDA if levels are stale, and Save snapshot.', 'Everyone: plan the first two weeks under Lesson plans.'] },
  { id: 'wf-test', title: 'From a test to the gradebook', when: 'The day of a quiz or unit test', steps: ['Grades → New assessment. Build the key as sections and tag standards.', 'Score on the answer sheet with the keyboard; mark absentees with X.', 'Open Analysis; note the standards below target and who is in that band.', 'Reteach; the heat map on Standards updates as later work is scored.'] },
  { id: 'wf-reports', title: 'Report card week', when: 'The two weeks before grades are due', steps: ['Dashboard: the Ungraded stat must reach zero. Clear the queue.', 'Reports → Report card: write comments student by student. Class summary shows who is missing one.', 'Admin: Review & approve, then print.'] },
  { id: 'wf-wida', title: 'Leveling the class in WIDA', when: 'Twice a year, or when a student changes fast', steps: ['WIDA → Levels → Assess the class.', 'Keys 1–6 to skip ahead, tick the next level, Enter.', 'Save snapshot when done; the Progress tab shows change over the year.'] },
  { id: 'wf-dayoff', title: 'A field trip or day off', when: 'When the office announces it', steps: ['Admin: add the event on the dashboard calendar with the grades it applies to.', 'Attendance for that day handles itself: no class for a day off, everyone absent with a note for a field trip.', 'Lesson plans block the day.'] },
  { id: 'wf-leveltest', title: 'Level test week', when: 'Twice a year', steps: ['Admin: create the level test for the semester under Level tests.', 'Each teacher enters the sections they scored; saves write only that section.', 'Admin: read the placement suggestions, decide, keep classes at or under fifteen.'] },
]

export const DEFINITIONS: { term: string; text: string }[] = [
  { term: 'Domain', text: 'One of the areas a grade is kept in: Reading, Phonics, Writing, Speaking & Listening, Language. Assessments belong to one; mixed papers can split across several by standard.' },
  { term: 'Composite', text: 'A domain’s average with formative, summative, and performance task weighted by the settings. It is computed, never typed.' },
  { term: 'Formative, summative, performance task', text: 'Quizzes and classwork; unit tests and exams; projects and presentations. The category sets the weight.' },
  { term: 'Mastery band', text: 'Above, on target, approaching, below: a percent on a standard compared to the class thresholds in Settings.' },
  { term: 'Standard', text: 'A Common Core code such as RL.3.2, with a plain name in the app (“Main idea and key details”). Prefix: RL/RI reading, RF phonics, W writing, SL speaking and listening, L language.' },
  { term: 'Rubric', text: 'Criteria scored 0 to 4 with a descriptor per level. 0 is “none”; leave a criterion blank if it was not assessed.' },
  { term: 'WIDA level', text: '1 Entering, 2 Emerging, 3 Developing, 4 Expanding, 5 Bridging, 6 Reaching, per domain. May carry one decimal.' },
  { term: 'Scaffold', text: 'A support strategy assigned to a student for a domain, tracked as working or not working.' },
  { term: 'CWPM', text: 'Correct words per minute on a timed passage. Accuracy is correct over attempted.' },
  { term: 'Lexile', text: 'A text-difficulty measure. The class target is a range.' },
  { term: 'Absent vs exempt', text: 'Both leave the student out of an assessment’s averages. Absent means they missed it; exempt means the work was waived.' },
  { term: 'Level test', text: 'The placement test that sorts students into English classes, scored by several teachers and decided by teachers.' },
]

export const ADMIN_SECTIONS: GuideSection[] = [
  {
    id: 'admin-settings', title: 'Settings', updated: '2026-09-25',
    purpose: 'The dates, weights, and thresholds the rest of the app computes with. Admin only.',
    screen: [
      'A rail of sections on the left: semesters, assessment weights, mastery thresholds, reading targets, schedule rules, teachers, and the rest.',
      'Semesters: the active semester, its midterm cutoff, and the report card grades due date drive the dashboard stats.',
      'Assessment weights: formative, summative, performance task per grade. They should add to 1.',
      'Mastery thresholds: above, on, approaching, per class. These color the heat map and the Analysis bands.',
      'Schedule rules: which grades have no class on which weekday (“No Grade 5 on Mondays”).',
    ],
    tasks: [
      { title: 'Open a new semester', steps: ['Add the semester with its dates and make it active.', 'Check weights and thresholds still fit.', 'Tell teachers to Save snapshot on WIDA.'] },
    ],
    rules: ['Changing a weight recomputes composites everywhere, past and present.', 'Reading targets can also be edited on the Reading page; both write the same record.'],
    watchOut: ['Only one semester is active. Grades at a glance, the heat map, and the academic history read from it.'],
  },
  {
    id: 'admin-calendar', title: 'Calendar events', updated: '2026-09-25',
    purpose: 'Days off, field trips, exams, deadlines, and events on the shared calendar. Admin only.',
    screen: ['Add an event from the dashboard calendar: title, type, date and end date, which grades, and whether it shows on the parent calendar.'],
    tasks: [{ title: 'Add a day off', steps: ['Type: day off. Set the grades it applies to (or none for everyone).', 'Attendance and lesson plans pick it up the same day.'] }],
    rules: ['Day off and field trip always block lesson plans and drive attendance, whether or not they are on the parent calendar.', 'Midterm and testing only tint the lesson plan when they are marked for the parent calendar.'],
    watchOut: ['A multi-day event needs its end date, or only the first day is blocked.'],
  },
  {
    id: 'admin-people', title: 'Teachers, roster, notices', updated: '2026-09-25',
    purpose: 'Who can log in, who is in which class, and school-wide notices.',
    screen: ['Teachers in Settings: name, class, role. A teacher sees their own class; admin sees all.', 'Students → Manage students: upload the roster, add one, bulk edit, transfer between classes.', 'Notices: any teacher can post; admin can post to everyone and sees delivery errors.'],
    tasks: [{ title: 'Move a student to another class', steps: ['Students → Manage students → edit the student, change the class.', 'The transfer is logged on their page.'] }],
    rules: ['Flagged behavior notes count on the dashboard link for admin.'],
    watchOut: ['Deactivating a teacher keeps everything they entered.'],
  },
  {
    id: 'admin-release', title: 'What’s new and this guide', updated: '2026-09-25',
    purpose: 'How changes reach teachers.',
    screen: ['Entries live in the code with a release date. An entry dated in the future is held; admins see it marked scheduled on the What’s new page.', 'Each teacher’s “Got it” is remembered, so the card only shows what they have not seen.', 'Every guide section shows when its text last changed; the Guide page lists the stalest first in the rail.'],
    tasks: [{ title: 'Release a batch', steps: ['Ask for the entries to be dated the Monday you want.', 'Read them on the What’s new page before that day.'] }],
    rules: ['No feature ships without its guide section updated in the same change.'],
    watchOut: [],
  },
]

export const ALL_SECTIONS = () => [...GUIDE_SECTIONS, ...ADMIN_SECTIONS]
/** The guide section for a view id, for “How this page works”. */
export const SECTION_FOR_VIEW: Record<string, string> = {
  dashboard: 'dashboard', grades: 'grades', attendance: 'attendance', lessonPlans: 'lessons', students: 'students',
  readingLevels: 'reading', reports: 'reports', leveling: 'leveltests', curriculum: 'standards', wida: 'wida', settings: 'admin-settings',
}
