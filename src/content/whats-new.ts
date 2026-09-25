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
}

export const WHATS_NEW: WhatsNewEntry[] = [
  {
    id: 'find-anything', date: '2026-09-28', title: 'Find anything with ⌘K',
    body: 'You can now press ⌘K (Ctrl K on Windows) anywhere and type a student, a page, or an action such as "mark attendance" or "post a notice". Enter opens it; ⌘Enter on a student opens their behavior log.',
    path: '/dashboard', guide: 'dashboard',
    tour: { path: '/dashboard', steps: [{ anchor: 'find', text: 'Click here or press ⌘K. Type a name, a page, or an action.' }] },
  },
  {
    id: 'dashboard-today', date: '2026-09-28', title: 'The dashboard opens to today',
    body: 'You can now see the month and this week’s agenda side by side, a grading queue that shows who is still unmarked with Absent and Exempt buttons right there, and a "needs attention" list of students whose grades or attendance have slipped.',
    path: '/dashboard', guide: 'dashboard',
    tour: { path: '/dashboard', steps: [{ anchor: '#grading', text: 'Assessments with students still unmarked. Continue opens the sheet; ABS and EXM clear a student without leaving.' }] },
  },
  {
    id: 'notice-board', date: '2026-09-28', title: 'Post a notice to other teachers',
    body: 'You can now post a shout-out, a reminder, or an urgent note and choose which teachers see it. Everyone dismisses their own copy. Urgent notices are shaded red until read.',
    path: '/dashboard', guide: 'dashboard',
  },
  {
    id: 'attendance-auto', date: '2026-09-28', title: 'Attendance from the schedule, and days off handled for you',
    body: 'You can now click a period on the dashboard schedule to mark that class without leaving the page. A day off on the calendar means no attendance is expected; a field trip marks everyone absent with a note automatically.',
    path: '/attendance', guide: 'attendance',
    tour: { path: '/attendance', steps: [{ anchor: 'attendance.save', text: 'Tap a status per student, then save. The masthead dot goes away once today is done.' }] },
  },
  {
    id: 'answer-sheet', date: '2026-09-28', title: 'Score a test on an answer sheet',
    body: 'You can now describe a paper as sections (ten multiple choice, two short answers worth 5, a writing task with a rubric), type the key where letters belong, and score student by student with the keyboard: A–D, T/F, numbers, Enter for the next student, X for absent. Half points are allowed on written items.',
    path: '/grades', guide: 'grades',
    tour: { path: '/grades', steps: [{ anchor: 'grades.new', text: 'Start here. Name it, choose how it will be scored, then build the key as sections.' }] },
  },
  {
    id: 'class-grid-analysis', date: '2026-09-28', title: 'See the whole class and what to reteach',
    body: 'You can now switch a scored test to a class grid (hover a column for the question, its standard, and how many chose each answer) or to Analysis: the score spread, mastery by standard with the names in each band, the questions most missed and why, and the weak criterion on a rubric.',
    path: '/grades', guide: 'grades',
    tour: { path: '/grades', steps: [{ anchor: 'grades.views', text: 'Answer sheet, Class grid, and Analysis are three views of the same scores.' }] },
  },
  {
    id: 'rubrics', date: '2026-09-28', title: 'Rubrics with descriptors, scored 0 to 4',
    body: 'You can now pick a rubric from the library, build your own from ready-made criteria, and score it on a full page where each level button carries its descriptor. 0 is a real zero. Rubrics you save can be kept to your class or shared with the school, and deleting one never touches grades.',
    path: '/grades', guide: 'grades',
  },
  {
    id: 'standards-plain', date: '2026-09-28', title: 'Standards in plain language',
    body: 'You can now search standards by what they mean ("main idea", "compare characters") instead of the legal text, filter by grade, and see which ones your class has used before. The Standards page has a mastery heat map built from every scored question.',
    path: '/standards', guide: 'standards',
  },
  {
    id: 'student-page', date: '2026-09-28', title: 'A full page for every student',
    body: 'You can now open a student at their own address, behavior log first, then grades at a glance, the reading trend, attendance, standards, level tests, support, and notes. Share the link with a colleague and it opens the same page.',
    path: '/students', guide: 'students',
  },
  {
    id: 'reading-targets', date: '2026-09-28', title: 'Reading targets on the Reading page',
    body: 'You can now edit your class’s fluency and Lexile targets right on the Reading page, and the level test oral scores show up in each student’s trend beside your running records.',
    path: '/reading', guide: 'reading',
    tour: { path: '/reading', steps: [{ anchor: 'reading.add', text: 'Add a running record here. Targets are edited inline under the class overview.' }] },
  },
  {
    id: 'wida-page', date: '2026-09-28', title: 'WIDA has its own page',
    body: 'You can now level a whole class in one sitting: Assess the class walks student by student and domain by domain, keys 1–6 tick everything through that level, and Enter saves and moves on. Levels can carry a decimal (3.5 means all of Developing and half of Expanding). The student page shows the result and links back.',
    path: '/wida', guide: 'wida',
    tour: { path: '/wida', steps: [{ anchor: 'wida.assess', text: 'Assess the class opens the full-page questionnaire, one student and one domain at a time.' }] },
  },
  {
    id: 'lesson-days', date: '2026-09-28', title: 'Lesson plans know the calendar',
    body: 'You can now see days off and field trips blocked out on the lesson plan, and a midterm or testing day tinted when it is on the parent calendar. "No Grade 5 on Mondays" is a setting rather than a rule in the code.',
    path: '/lesson-plans', guide: 'lessons',
    tour: { path: '/lesson-plans', steps: [{ anchor: 'lessons.copy', text: 'Copy last week fills the week from the one before, then edit the days that differ.' }] },
  },
  {
    id: 'look', date: '2026-09-28', title: 'A calmer look, with dark mode',
    body: 'You can now collapse the header, switch to dark mode from your name menu, and read the whole app in American English. Every screen has its own address, so the back button and bookmarks work.',
    path: '/dashboard', guide: 'dashboard',
  },
]

export const todayISO = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) // KST
export const releasedEntries = () => { const t = todayISO(); return WHATS_NEW.filter(e => e.date <= t).sort((a, b) => b.date.localeCompare(a.date)) }
export const latestReleaseDate = () => releasedEntries()[0]?.date || ''
