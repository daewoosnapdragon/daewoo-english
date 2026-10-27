import { describe, it, expect } from 'vitest'
import { currentReportDocument } from '@/lib/reportDocument'

const fall = { type: 'fall', midterm_cutoff_date: '2026-10-23', report_card_cutoff_date: '2026-12-18' }

describe('currentReportDocument', () => {
  it('is the progress report before and shortly after the midterm cutoff', () => {
    expect(currentReportDocument(fall, '2026-09-01')).toBe('progress_report')
    expect(currentReportDocument(fall, '2026-10-23')).toBe('progress_report')
    expect(currentReportDocument(fall, '2026-10-27')).toBe('progress_report')
    expect(currentReportDocument(fall, '2026-11-13')).toBe('progress_report')
  })
  it('is the report card three weeks after the midterm cutoff', () => {
    expect(currentReportDocument(fall, '2026-11-14')).toBe('report_card')
    expect(currentReportDocument(fall, '2026-12-18')).toBe('report_card')
  })
  it('never runs past the report card cutoff', () => {
    const tight = { type: 'fall', midterm_cutoff_date: '2026-12-10', report_card_cutoff_date: '2026-12-18' }
    expect(currentReportDocument(tight, '2026-12-18')).toBe('progress_report')
    expect(currentReportDocument(tight, '2026-12-19')).toBe('report_card')
  })
  it('falls back to grades_due_date, then to the report card when nothing is set', () => {
    expect(currentReportDocument({ type: 'fall', midterm_cutoff_date: '2026-10-23', grades_due_date: '2026-10-30' }, '2026-11-05')).toBe('report_card')
    expect(currentReportDocument({ type: 'fall' }, '2026-10-27')).toBe('report_card')
    expect(currentReportDocument(null, '2026-10-27')).toBe('report_card')
  })
  it('follows the semester type when it names the document', () => {
    expect(currentReportDocument({ type: 'fall_mid' }, '2026-12-30')).toBe('progress_report')
    expect(currentReportDocument({ type: 'spring_final', midterm_cutoff_date: '2027-04-20' }, '2027-04-21')).toBe('report_card')
  })
})
