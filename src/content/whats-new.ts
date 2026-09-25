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
    id: 'look', date: '2026-09-25', title: 'A calmer look, with dark mode',
    body: 'You can now collapse the header and switch to dark mode from your name menu. Every screen has its own address, so the back button and bookmarks work.',
    path: '/dashboard', guide: 'dashboard',
  },
]

export const todayISO = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) // KST
export const releasedEntries = () => { const t = todayISO(); return WHATS_NEW.filter(e => e.date <= t).sort((a, b) => b.date.localeCompare(a.date)) }
export const latestReleaseDate = () => releasedEntries()[0]?.date || ''
