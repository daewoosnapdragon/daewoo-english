// One address per screen. View ids are the names the rest of the app already
// uses (navigateTo, translations.nav); paths are what the browser shows.

export const VIEW_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  grades: '/grades',
  attendance: '/attendance',
  lessonPlans: '/lesson-plans',
  students: '/students',
  readingLevels: '/reading',
  reports: '/reports',
  leveling: '/level-tests',
  curriculum: '/standards',
  wida: '/wida',
  settings: '/settings',
  guide: '/guide',
  whatsNew: '/whats-new',
  activity: '/activity',
  behavior: '/behavior',
  supplies: '/supplies',
  budget: '/budget',
  overtime: '/overtime',
  planner: '/curriculum',
  jobs: '/jobs',
}

/**
 * The masthead's links, in two groups: what a teacher opens every day, and
 * what they open when planning. A thin rule separates them. On a phone the
 * bottom bar carries PHONE_TABS and a More sheet lists everything else.
 */
export const NAV_DAILY = ['dashboard', 'attendance', 'grades', 'readingLevels', 'students']
export const NAV_PLANNING = ['lessonPlans', 'planner', 'curriculum', 'wida', 'leveling', 'reports']
export const NAV_ORDER = [...NAV_DAILY, ...NAV_PLANNING]

/**
 * Pages that are real work but not every day's: they sit in the masthead's
 * More menu, after any links that did not fit. Some are only for some
 * accounts (Jobs, Activity); the masthead leaves those out for everyone else.
 */
export const NAV_MORE = ['behavior', 'jobs', 'supplies', 'overtime', 'budget', 'activity', 'settings']

/** The phone's bottom bar, in thumb order. Everything else is in its More sheet. */
export const PHONE_TABS = ['attendance', 'students', 'readingLevels', 'dashboard']

/** Nav words, English and Korean. Page titles (PAGE_TITLES) use the same English word. */
export const NAV_LABELS: Record<string, { en: string; ko: string }> = {
  dashboard: { en: 'Dashboard', ko: '대시보드' },
  attendance: { en: 'Attendance', ko: '출석부' },
  grades: { en: 'Grades', ko: '성적 입력' },
  readingLevels: { en: 'Reading', ko: '읽기 수준' },
  students: { en: 'Students', ko: '학생 명단' },
  lessonPlans: { en: 'Lesson plans', ko: '수업 계획' },
  planner: { en: 'Curriculum', ko: '교육과정' },
  curriculum: { en: 'Standards', ko: '표준' },
  wida: { en: 'WIDA', ko: 'WIDA' },
  leveling: { en: 'Level tests', ko: '레벨 테스트' },
  reports: { en: 'Reports', ko: '보고서' },
  behavior: { en: 'Behavior', ko: '행동' },
  jobs: { en: 'Jobs', ko: '업무' },
  supplies: { en: 'Supplies', ko: '비품' },
  overtime: { en: 'Overtime', ko: '초과근무' },
  budget: { en: 'Budget', ko: '예산' },
  activity: { en: 'Activity', ko: '활동 기록' },
  settings: { en: 'Settings', ko: '설정' },
}

export function navLabel(id: string, lang: string): string {
  const l = NAV_LABELS[id]
  return l ? (lang === 'ko' ? l.ko : l.en) : (PAGE_TITLES[id] || id)
}

export function pathForView(view: string, opts: { studentId?: string } = {}): string {
  if (view === 'students' && opts.studentId) return `/students/${opts.studentId}`
  return VIEW_PATHS[view] || '/dashboard'
}

export function viewForPath(pathname: string | null): string {
  if (!pathname) return 'dashboard'
  const seg = '/' + (pathname.split('/')[1] || '')
  const hit = Object.entries(VIEW_PATHS).find(([, p]) => p === seg)
  return hit ? hit[0] : 'dashboard'
}

export const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', students: 'Students', grades: 'Grades',
  reports: 'Reports', leveling: 'Level tests', attendance: 'Attendance',
  readingLevels: 'Reading', lessonPlans: 'Lesson plans',
  curriculum: 'Standards', wida: 'WIDA', settings: 'Settings', guide: 'How to use this app', whatsNew: 'What’s new', activity: 'Activity', behavior: 'Behavior', supplies: 'Supplies', budget: 'Budget', overtime: 'Overtime', planner: 'Curriculum', jobs: 'Jobs',
}

/**
 * The guide section for each page, for the Help link in the context row and
 * the phone's More sheet. Section ids live in src/content/guide.ts; a page
 * missing here opens the guide at the top.
 */
export const GUIDE_SECTION_FOR_VIEW: Record<string, string> = {
  dashboard: 'dashboard', attendance: 'attendance', grades: 'grades', readingLevels: 'reading', students: 'students',
  lessonPlans: 'lessons', planner: 'bookshelf', curriculum: 'standards', wida: 'wida', leveling: 'leveltests', reports: 'reports',
  behavior: 'behavior', jobs: 'jobs', supplies: 'supplies', overtime: 'overtime', budget: 'budget', activity: 'activity', settings: 'admin-settings',
}

/** Where Help goes from a page: the guide, opened at that page's section. */
export function guideHrefFor(view: string): string {
  const id = GUIDE_SECTION_FOR_VIEW[view]
  return id ? `/guide#${id}` : '/guide'
}
