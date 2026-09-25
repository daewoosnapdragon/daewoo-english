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
}

/** The order links appear in the masthead. Settings lives in the user menu. */
export const NAV_ORDER = [
  'dashboard', 'grades', 'attendance', 'lessonPlans', 'students',
  'readingLevels', 'reports', 'leveling', 'curriculum', 'wida',
]

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
  reports: 'Reports', leveling: 'Level Tests', attendance: 'Attendance',
  readingLevels: 'Reading', lessonPlans: 'Lesson Plans',
  curriculum: 'Standards', wida: 'WIDA', settings: 'Settings',
}
