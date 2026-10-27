// ─── Which report is being written right now ─────────────────────
// Every semester produces two documents with their own comment rows:
// the mid-semester progress report and the end-of-semester report card.
// The Reports page opens on, and the Comments tab writes to, whichever one
// teachers are working on: the progress report until three weeks after the
// midterm cutoff, the report card after that. A semester typed as a
// midterm or a final is that document regardless of dates.

export type ReportDocument = 'progress_report' | 'report_card'

/** Days after the midterm cutoff during which the progress report is still the current document. */
export const PROGRESS_WINDOW_DAYS = 21

export interface SemesterDates {
  type?: string | null
  midterm_cutoff_date?: string | null
  report_card_cutoff_date?: string | null
  grades_due_date?: string | null
}

export const REPORT_DOCUMENT_LABEL: Record<ReportDocument, { en: string; ko: string }> = {
  progress_report: { en: 'Progress report', ko: '중간 보고서' },
  report_card: { en: 'Report card', ko: '성적표' },
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/** `today` is a YYYY-MM-DD string (pass getKSTDateString()). */
export function currentReportDocument(sem: SemesterDates | null | undefined, today: string): ReportDocument {
  if (!sem) return 'report_card'
  if (sem.type === 'fall_mid' || sem.type === 'spring_mid') return 'progress_report'
  if (sem.type === 'fall_final' || sem.type === 'spring_final') return 'report_card'
  const mid = sem.midterm_cutoff_date
  if (!mid) return 'report_card'
  const window = addDays(mid, PROGRESS_WINDOW_DAYS)
  // Never past the report card cutoff, however close the two dates are.
  const cutoff = sem.report_card_cutoff_date || sem.grades_due_date || null
  const limit = cutoff && cutoff < window ? cutoff : window
  return today <= limit ? 'progress_report' : 'report_card'
}
