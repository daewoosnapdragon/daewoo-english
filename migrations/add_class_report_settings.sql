-- Migration: Class-level N/A settings for progress reports
-- Date: 2026-05-04
-- Purpose: Class-level domain N/A flags. When is_na = true for a row,
--          every student in that semester+class+grade renders the domain
--          as N/A and the domain is excluded from the class average.
--          A teacher manages these from the Progress Reports → Class Overview page.
--          Class-level N/A is OR'd with per-student semester_grades.is_na — so
--          either flag turning on makes the domain N/A for that student.

CREATE TABLE IF NOT EXISTS class_report_settings (
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  grade INTEGER NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('reading', 'phonics', 'writing', 'speaking', 'language')),
  is_na BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES teachers(id),
  PRIMARY KEY (semester_id, english_class, grade, domain)
);

CREATE INDEX IF NOT EXISTS idx_class_report_settings_lookup
  ON class_report_settings(semester_id, english_class, grade);
