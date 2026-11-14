import type { Tour } from '@/lib/tour'

// ─── What's new ──────────────────────────────────────────────────
// One entry per change teachers can see. Entries are released in batches:
// an entry with a date after today is held (admins see it marked
// "scheduled" on the What's new page), so set the date to the Monday you
// want the batch to appear. Written in "You can now…" voice. Each entry
// names the guide section that explains it and, where it helps, a tour.

export interface WhatsNewEntry {
  id: string
  date: string            // YYYY-MM-DD, the release day
  title: string
  body: string            // one short paragraph, plain words
  path?: string           // where it lives
  guide?: string          // guide section id
  tour?: Tour
  /** A card with a picture in the first-visit modal. Entries without one go on the last card as one-liners. */
  highlight?: { image: string; how: string }
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: 'comment-builder', date: '2026-11-16', title: 'Reports: build a comment by ticking what applies',
    body: 'You can now click Build a comment under the report card box and tick what applies on one screen: an opener, each area already on the tier the letter points to, behavior, next steps for the weakest area with the home activities, and a closer. The draft assembles at the bottom as you tick, in reading order, with the student’s name and pronouns filled in, and sentences are offered least-used-first in your class so comments do not come out alike. Each area shows the skills your class has been taught, read from your lesson plans, the Standards page and any tagged assessments, so a Grade 5 class never sees sentences about sounding out words; tick or untick a skill and it is remembered. The rest of the bank sits behind Show more. Put it in the box and edit it for your own voice; it is a first draft, not the comment. The bank behind it is the Fall 2026 comment bank, rewritten this month: 185 sentences across the five areas and behavior, openers, closers, and 30 next-step rungs from beginner to strong Grade 5.',
    path: '/reports', guide: 'reports',
  },
  {
    id: 'student-pronoun', date: '2026-11-16', title: 'Students: a pronoun and a called-name per student',
    body: 'You can now set each student’s pronoun (he, she or they) once, above the report card comment box or on the student page, and it is remembered; the comment builder fills its sentences with it. Called, next to it, is the name used in comments: the app suggests the English name in brackets or the given name after the family name, and you keep it with Enter or type another once. The report card no longer has Skip comment. What parents already read on the fact sheet shows this semester’s progress report in full and every earlier comment, newest first, and the fact sheet lists every rubric-scored piece this semester with each criterion’s level; tap one to read what the rubric says for the level the student got.',
    path: '/reports', guide: 'reports',
  },
  {
    id: 'report-card-editor', date: '2026-11-16', title: 'Reports: a fact sheet beside the comment box, autosave and Next',
    body: 'You can now write a report card comment with the student’s facts beside the box: each area’s letter with the change since the progress report and since last semester, attendance, reading level now and at the first check of the semester, WIDA level, the number of behavior notes, what the app noticed (the weakest and strongest areas, the last rubric piece criterion by criterion, the most-missed standard, the latest reading and behavior notes) and what parents already read, your October progress-report comment and last semester’s report card comment, so nothing in the new comment is a surprise. The box saves itself a second after you stop typing; there is no Save button. Under the box a grey line gives the word count against about 200 and points out another student’s name, a leftover he/she, any mention of moving levels, a comment that shares many phrases with one of your others, or a long list of things to work on. Next saves and opens the next student without a comment, and the header counts how many of the class are written.',
    path: '/reports', guide: 'reports',
  },
  {
    id: 'phonics-compare', date: '2026-11-16', title: 'Reading: compare phonics across classes and grades',
    body: 'You can now see phonics checks for a whole grade or the whole school, not just one class. In Reading → Phonics, pick Whole grade or All grades. Classes compared puts each class on one row against the twenty sheets: the share of its checked students who have each sheet, and an outline on the first sheet the class has not got yet. Under it, every student’s heat map, grouped by class or ranked by position, the furthest sheet they have mastered, with a warning when there is a hole below it. Switch Mastered to Proficient+ to count 90%+ without the automatic tick, and set Checks since to compare one testing window. Every teacher sees every class here, for leveling. A leveling strip puts every checked student on the twenty sheets, class by class, and flags the ones who read like the class above or below; tick up to six students from anywhere to compare them side by side, down to how they decoded. Error patterns shows, class against class, how students decoded, which patterns gave trouble and which words were missed most, with what they said instead. Groups gathers students across classes by the sheet to teach next, with what tripped each group, ready to print. CSV exports the lot with grade and class.',
    path: '/reading?tab=phonics', guide: 'reading',
    tour: { path: '/reading?tab=phonics', steps: [{ anchor: 'reading.phonics.scope', text: 'This class, Whole grade or All grades.' }, { anchor: 'reading.phonics.compare-tabs', text: 'Past one class, four tabs: Classes & students, Leveling, Error patterns, Groups.' }] },
  },
  {
    id: 'phonics-checks', date: '2026-11-16', title: 'Reading: the phonics quick checks, in the app, for every level',
    body: 'You can now open Reading → Phonics and run the Phonics Quick Checks packet from the app while the student reads the printed sheet. Tick the sheets to check, one (CVC) or several or all twenty, from CVC up to the two-syllable pages, and tap each word as the student reads it: once for correct, again for an error, with a pencil to write what they said. Under the words, the packet’s own checkboxes: how they decoded and which patterns gave trouble. The student decodes only; meaning is never asked, and nothing is graded. The class heat map shows the whole class against every sheet, coloured by the packet’s bands (Beginning, Developing, Proficient, Mastered) from the latest check, with the sheet each student is working on and an arrow for the change since last time. Every attempt is kept: Student progress shows one student’s sheets against every sitting so you can see the move from check to check, and a sheet’s detail shows which words were missed on each attempt. The result stays with the student: it shows on the student page under Reading, with the same progress grid, and in the leveling meeting’s hover card, so decoding gaps are in front of you when you level.',
    path: '/reading?tab=phonics', guide: 'reading',
    tour: { path: '/reading?tab=phonics', steps: [{ anchor: 'reading.phonics.mode', text: 'Heat map for the class; Check a student to sit with one.' }, { anchor: 'reading.phonics.skills', text: 'Tick the sheets for this sitting: one, several or all twenty.' }, { anchor: 'reading.phonics.words', text: 'Tap each word as the student reads it: correct, error, clear. The pencil records what they said.' }] },
  },
  {
    id: 'overtime', date: '2026-11-16', title: 'Overtime: log it as you go, print the sheet',
    body: 'You can now open Overtime from the user menu. Type the times you worked the way you say them, 4:30 to 6:45, and what the work was; the time and the won add themselves up as you type, at 10,320 won an hour. Print sheet shows the school’s overtime sheet, filled in and in large type, beside the dates: pick this month, last month or the last two weeks, or any two dates, and print it, ready to sign. Weekends and days off are not overtime, so they cannot be logged. Admin sees every teacher’s month and prints everyone’s sheets in one go.',
    path: '/overtime', guide: 'overtime',
  },
  {
    id: 'program-map', date: '2026-11-09', title: 'Curriculum: the program map, every class on one page',
    body: 'You can now open Curriculum → Class boards → Program map and see every class and grade across the term, the books as thin strips in their colours. A dot on a week means two or more classes share something. Click it: lines join the classes on the same unit (dark) or on the same skill in different books (red), the panel names them with their teachers, and Everyone this week lists each class’s units, with a note where another class finished a unit earlier so its files are ready. Arrows open any class’s board.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'reading-lists', date: '2026-11-09', title: 'Curriculum: Into Reading is a reading list, not a timetable',
    body: 'Placing Into Reading now opens the book’s contents as a checklist by module: tick the stories the class will read and place them, no weeks to type. The term shares itself across the stories, which show as open bars on the board. Tick each story Done when you finish it and the line above the board says where you stand, 4 of 9 done · 1 story behind. Every other book works the same way now: tick the units the class will do and the term shares itself; drag or stretch a unit on the board only when one needs more or less. The board also has a Year view, and holiday weeks from the school calendar no longer count as teaching weeks.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'week-import', date: '2026-11-09', title: 'Curriculum: open a week and drop its lessons into your daily plan',
    body: 'You can now click a week number on your class board and see the five days as they are on Lesson Plans, with this week’s units and their lessons beside them. Press a day letter on a lesson and its words go into that day: the book as the subject, the title, the “students will” line, the notes. Mark the day done when it is taught and the standards fill in under the board, where every code in your plan is listed; click one to see which units teach it.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'teacher-plans', date: '2026-11-09', title: 'Curriculum: your own plan, “we’re here”, and blocks of your own',
    body: 'You can now change your class board. Click the unit you are starting now and press We’re here: behind, a gap opens before it and everything after moves; ahead, the units before it get shorter. Drag a bar to move it, drag its right edge to make it longer, skip a unit or add one back. Your plan becomes your own copy of the master the first time you change it, and a thin rail under the row shows where the master was. Our class at the bottom holds blocks of your own, things from no book. Admin sees every difference on the Curriculum map’s Review tab and can leave you a note, make your pacing the master, or put it back.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'class-boards', date: '2026-11-09', title: 'Curriculum: class boards, the ladder and the master plan',
    body: 'You can now open Curriculum → Class boards and see any class and grade’s term week by week, yours first: a row per book, each unit as a bar in its book’s colour where the plan puts it, holiday weeks hatched, today marked. Click a bar for the unit’s lessons and files. Ladder shows one level across Grades 1 to 5 with the books per grade and checks on the progression. Admin sets all of it on the Curriculum map: which book each class and grade uses for which term, and how many weeks each unit gets. Read-only for teachers this round; your own changes, “we’re here” pins and blank blocks come next.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'bookshelf', date: '2026-11-09', title: 'Curriculum: the Bookshelf',
    body: 'Admin can now open Curriculum → Curriculum map → Bookshelf and see every book the program uses, grouped by strand and series, with its level, whether it is still in use, and how far it is indexed. Open a book for its units and lessons: each lesson has a “students will” line, CCSS codes and skill tags, and links to the files in the shared Drive. Admin indexes a book by giving Claude the prompt on the page with the table of contents and the teacher’s guide pages, pasting the lines it writes, and confirming them after a look; until then they show as suggested by Claude. Anyone can add a Drive link to a unit or lesson. This is the first part of the curriculum planner: placements, pacing and the class boards come next.',
    path: '/curriculum', guide: 'bookshelf',
  },
  {
    id: 'report-teacher-by-class', date: '2026-10-28', title: 'Reports always name the class’s own teacher',
    body: 'Progress reports and report cards now take the teacher from the student’s English class, so a student moved to another class no longer prints the previous class’s teacher. Changing a student’s class on the Students page, the student page or Leveling also updates who they belong to.',
    path: '/reports', guide: 'reports',
  },
  {
    id: 'supplies', date: '2026-10-27', title: 'Supplies: stock, requests, receipts and counts',
    body: 'You can now open Supplies from the user menu. Stock lists the office staples as packs and loose (1 box + 2 reams); press Low when something is running out and everyone sees it. Requests is where you put what you need, with how many and what for, and others press Me too. Receipts turn a scanned receipt into stock and spending: give Claude the prompt on that tab with the scan, paste the lines it writes with their prices, check them, save. Whoever has the Reading Garden job that week does a two-minute quick count on the cleaning day, with a sheet to print for the clipboard; admin does the full count once a month. The dashboard card shows what is low and whose count it is.',
    path: '/supplies', guide: 'supplies',
  },
  {
    id: 'budget', date: '2026-10-27', title: 'Budget: what each teacher and the office have spent',
    body: 'You can now open Budget from the user menu and see your allowance for the semester, what has been charged to you from receipts, and what is left. Admin sees every teacher and the office line and sets the allowances. Totals by month are under that, and every purchase is listed.',
    path: '/budget', guide: 'budget',
  },
  {
    id: 'behavior-page', date: '2026-10-27', title: 'A Behavior page: every case’s story, and every note',
    body: 'You can now open Behavior from the user menu and see each ladder case for your class as one line: opened and how many notes, your ask, read by admin and when, the action recorded, or what has not happened yet and for how many school days. Every behavior note for your class is listed under it, with filters. Admin and the Snapdragon teacher see every class.',
    path: '/behavior', guide: 'behavior',
  },
  {
    id: 'office-jobs', date: '2026-10-27', title: 'Office jobs on the dashboard',
    body: 'You can now see this week’s cleaning day beside the weekly schedule: your job in large type, everyone else’s underneath, and your job next week. If Friday is a day off on the calendar, the jobs move to the day before. On the day itself, the band under the header names your job on every page.',
    path: '/dashboard', guide: 'dashboard',
    highlight: { image: '/whats-new/office-jobs.png', how: 'Dashboard → under the weekly schedule. Click a job to read what it involves.' },
  },
  {
    id: 'progress-report-redesign', date: '2026-10-27', title: 'The progress report is one table, and prints on half pages',
    body: 'You can now read a progress report as one table: each area’s grade, score and a bar against the class average, with your comment underneath when there is one. What you see on screen is the printed page. A report prints as a half page, two to a sheet, whenever the comment is short or there is none; a longer comment gets a full page.',
    path: '/reports', guide: 'reports',
    highlight: { image: '/whats-new/progress-reports.png', how: 'Reports → Progress report. Tick “Hide the class comparison for this student” to drop the bars for one student. Print from the Print tab.' },
  },
  {
    id: 'domain-trends', date: '2026-10-27', title: 'Each area as a small chart in the student view',
    body: 'You can now see, on each domain tile in the Grades student view, the student’s running average as a solid line and the class’s as a dashed one, all five on the same scale. Hover a point for the assessment and the numbers.',
    path: '/grades', guide: 'grades',
    highlight: { image: '/whats-new/grades.png', how: 'Grades → Student view. Pick a student from the roster on the left.' },
  },
  {
    id: 'behavior-ladder', date: '2026-10-06', title: 'Three behavior notes open a case for admin',
    body: 'You can now rely on the behavior ladder: when a student reaches three concern or negative notes (or you flag one), a case opens with the notes in one place. Admin sees it at the top of the dashboard with no dismiss, marks it read, and records “Parents contacted”, which writes the contact on the student’s log and closes the case. You see on your dashboard and the student page whether admin has read it and how long it has waited, and can add a one-line ask. The behavior tracker shows how close a student is to the next step. Thresholds and steps are in Settings.',
    path: '/dashboard', guide: 'students',
  },
  {
    id: 'student-drilldown', date: '2026-10-06', title: 'The student view in Grades reads like a report',
    body: 'You can now move through the class with a roster on the left (↑ ↓ work too), see five domain tiles with a sparkline and the class average, a timeline of every score against the class, notes worth a look such as a recent drop or a quiz-versus-test gap, a list of what is still unscored with a link to the sheet, one aligned table with a “how is this computed?” line under each domain, the standards the student has met or missed from their answer sheets, and what the report card will show. Print report includes the tiles and the standards.',
    path: '/grades', guide: 'grades',
  },
  {
    id: 'routing-by-standard', date: '2026-10-06', title: 'A Language question on a Reading test counts in Language',
    body: 'You can now tag a question with any standard and its points go to that standard’s domain on their own: L.4.3 on a reading test counts toward Language, RI.4.1 toward Reading. There is no box to tick any more. On the answer sheet the questions that count in another tab are tinted and labelled, with each student’s points per domain next to their total; the class grid and score list get a column per domain; the rail and Analysis show the class percent per domain. The domain overview and a student’s drill-down show each part next to the whole-paper score. Papers you tagged before today are re-routed when the admin runs the backfill.',
    path: '/grades', guide: 'grades',
  },
  {
    id: 'clear-scores', date: '2026-10-06', title: 'Clear a student’s paper, or the whole class',
    body: 'You can now wipe one student’s marks and score with Clear next to ABS and EXM on the answer sheet or the rubric sheet, and every paper for an assessment with Clear all. In the score list, × empties a score and Save removes it; Clear all removes them all. Each asks first and cannot be undone.',
    path: '/grades', guide: 'grades',
  },
  {
    id: 'blank-answers', date: '2026-10-05', title: 'Blank answers are marked wrong, and you can see them',
    body: 'You can now mark a question the student left blank with the — bubble or the minus key, and it counts as wrong. A question you skip on the answer sheet is shaded amber so you notice it, and when you move to the next student anything still unmarked on that paper becomes a blank worth 0. A paper you have not started stays untouched. The class grid shows blanks as —.',
    path: '/grades', guide: 'grades',
    tour: { path: '/grades', steps: [{ anchor: 'grades.views', text: 'Score on the answer sheet. A skipped question turns amber; − marks it blank. Blanks are wrong.' }] },
  },
  {
    id: 'find-anything', date: '2026-09-25', title: 'Find anything with ⌘K',
    body: 'You can now press ⌘K (Ctrl K on Windows) anywhere and type a student, a page, or an action such as "mark attendance" or "post a notice". Enter opens it; ⌘Enter on a student opens their behavior log.',
    path: '/dashboard', guide: 'dashboard',
    tour: { path: '/dashboard', steps: [{ anchor: 'find', text: 'Click here or press ⌘K. Type a name, a page, or an action.' }] },
  },
  {
    id: 'dashboard-today', date: '2026-09-25', title: 'The dashboard opens to today',
    body: 'You can now see the month and this week’s agenda side by side, a grading queue that shows who is still unmarked with Absent and Exempt buttons right there, and a "needs attention" list of students whose grades or attendance have slipped.',
    path: '/dashboard', guide: 'dashboard',
    tour: { path: '/dashboard', steps: [{ anchor: '#grading', text: 'Assessments with students still unmarked. Continue opens the sheet; ABS and EXM clear a student without leaving.' }] },
  },
  {
    id: 'notice-board', date: '2026-09-25', title: 'Post a notice to other teachers',
    body: 'You can now post a shout-out, a reminder, or an urgent note and choose which teachers see it. Everyone dismisses their own copy. Urgent notices are shaded red until read.',
    path: '/dashboard', guide: 'dashboard',
  },
  {
    id: 'attendance-auto', date: '2026-09-25', title: 'Attendance from the schedule, and days off handled for you',
    body: 'Click a period on the dashboard schedule to mark that class in a drawer, without leaving the page. A day off on the calendar means no attendance is expected. A field trip marks everyone absent with the trip as the note, and both block the day on lesson plans.',
    path: '/dashboard', guide: 'attendance',
    highlight: { image: '/whats-new/attendance-drawer.jpg', how: 'Dashboard → weekly schedule → click the period. Days off and field trips come from the calendar events admin adds.' },
    tour: { path: '/dashboard', steps: [{ anchor: '#schedule', text: 'Click a period to mark that class here. The drawer saves the same attendance as the Attendance page.' }] },
  },

  {
    id: 'answer-sheet', date: '2026-09-25', title: 'Score a test on an answer sheet',
    body: 'Tests can be scored question by question instead of one total. Describe the paper as sections (ten multiple choice, two short answers worth 5, a writing task), type the key where letters belong, and mark each student with the keyboard. Half points are allowed. The old way, one total per student, is still there under Points only.',
    path: '/grades', guide: 'grades',
    highlight: { image: '/whats-new/answer-sheet.jpg', how: 'Grades → New assessment → Answer key. A–D and numbers mark, Enter moves to the next student, X marks absent. Choose Points only to keep entering one score per student.' },
    tour: { path: '/grades', steps: [{ anchor: 'grades.new', text: 'Start here. Name it, choose how it will be scored, then build the key as sections.' }] },
  },


  {
    id: 'rubrics', date: '2026-09-25', title: 'Rubrics with descriptors, scored 0 to 4',
    body: 'Pick a rubric from the library or build your own from ready-made criteria, then score on a full page where every level button carries its descriptor. A rubric can also sit inside an answer key as one section. Save rubrics to your class or share them with the school; deleting one never touches grades.',
    path: '/grades', guide: 'grades',
    highlight: { image: '/whats-new/rubric-scoring.jpg', how: 'Grades → New assessment → Rubric, or add a “Rubric-scored” section to an answer key. Keys 0–4 mark and move down; Enter goes to the next student.' },
    tour: { path: '/grades', steps: [{ anchor: 'grades.scoring', text: 'Rubric here scores the whole assessment with one rubric. A rubric can also be one section of an answer key.' }] },
  },  {
    id: 'class-grid-analysis', date: '2026-09-25', title: 'See how the class did and what to reteach',
    body: 'You can now switch a scored test to a class grid (hover a column for the question, its standard, and how many chose each answer) or to Analysis: the score spread, mastery by standard with the names in each band, the questions most missed and why, and the weak criterion on a rubric.',
    path: '/grades', guide: 'grades',
    highlight: { image: '/whats-new/analysis.jpg', how: 'Open a scored test and click Analysis. Click a standard for the names in each band, or a question row for who missed it.' },
    tour: { path: '/grades', steps: [{ anchor: 'grades.views', text: 'Answer sheet, Class grid, and Analysis are three views of the same scores.' }] },
  },

  {
    id: 'standards-plain', date: '2026-09-25', title: 'Standards in plain language',
    body: 'You can now search standards by what they mean ("main idea", "compare characters") instead of the legal text, filter by grade, and see which ones your class has used before. The Standards page has a mastery heat map built from every scored question.',
    path: '/standards', guide: 'standards',
  },
  {
    id: 'student-page', date: '2026-09-25', title: 'A full page for every student',
    body: 'Each student has their own page and address: behavior log first, then grades at a glance, the reading trend with level test scores, attendance, standards, level tests, support, and notes. Share the link and a colleague opens the same page.',
    path: '/students', guide: 'students',
    highlight: { image: '/whats-new/student-page.jpg', how: 'Type the name in the box at the top left (or press ⌘K), or click a name anywhere in the app.' },
    tour: { path: '/students', steps: [{ anchor: 'find', text: 'The fastest way to a student: type a name here, or press ⌘K from any page.' }] },
  },

  {
    id: 'reading-targets', date: '2026-09-25', title: 'Reading targets on the Reading page',
    body: 'You can now edit your class’s fluency and Lexile targets right on the Reading page, and the level test oral scores show up in each student’s trend beside your running records.',
    path: '/reading', guide: 'reading',
    tour: { path: '/reading', steps: [{ anchor: 'reading.add', text: 'Add a running record here. Targets are edited inline under the class overview.' }] },
  },
  {
    id: 'wida-page', date: '2026-09-25', title: 'WIDA has its own page',
    body: 'You can now level a whole class in one sitting: Assess the class walks student by student and domain by domain, keys 1–6 tick everything through that level, and Enter saves and moves on. Levels can carry a decimal (3.5 means all of Developing and half of Expanding). The student page shows the result and links back.',
    path: '/wida', guide: 'wida',
    tour: { path: '/wida', steps: [{ anchor: 'wida.assess', text: 'Assess the class opens the full-page questionnaire, one student and one domain at a time.' }] },
  },
  {
    id: 'lesson-days', date: '2026-09-25', title: 'Lesson plans know the calendar',
    body: 'You can now see days off and field trips blocked out on the lesson plan, and a midterm or testing day tinted when it is on the parent calendar. "No Grade 5 on Mondays" is a setting rather than a rule in the code.',
    path: '/lesson-plans', guide: 'lessons',
    tour: { path: '/lesson-plans', steps: [{ anchor: 'lessons.copy', text: 'Copy last week fills the week from the one before, then edit the days that differ.' }] },
  },
  {
    id: 'days-off-on-the-record', date: '2026-09-29', title: 'Days off show on the attendance record',
    body: 'A day off on the school calendar now marks every student absent with the holiday as the note, the same way a field trip does, so the day shows up in the month view and on printouts instead of only as a line at the top. Holidays from the last two months, Chuseok included, are filled in the next time you open attendance. Those days are not counted as absences on report cards, the student page, or the dashboard.',
    path: '/attendance', guide: 'attendance',
  },
  {
    id: 'look', date: '2026-09-25', title: 'A calmer look, with dark mode',
    body: 'You can now collapse the header and switch to dark mode from your name menu. Every screen has its own address, so the back button and bookmarks work.',
    path: '/dashboard', guide: 'dashboard',
  },
]

export const todayISO = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) // KST
export const releasedEntries = () => { const t = todayISO(); return WHATS_NEW.filter(e => e.date <= t).sort((a, b) => b.date.localeCompare(a.date)) }
export const latestReleaseDate = () => releasedEntries()[0]?.date || ''
