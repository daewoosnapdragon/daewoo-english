-- Migration: Add is_archived to level_tests
-- Date: 2026-08-09
-- Purpose: Hide finished level tests (e.g. Spring 2026) from the Leveling list
--          without deleting them.
--
-- Level tests are not linked to the semesters table -- they carry their own
-- academic_year and semester columns -- so archiving a semester in Settings
-- has no effect here. This gives them their own flag.
--
-- Visibility only. Scores, placements and teacher ratings are all untouched,
-- and an archived test can be restored at any time.
--
-- Additive and safe to run more than once.

ALTER TABLE level_tests ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN level_tests.is_archived IS
  'Visibility flag only. true = hidden from the Leveling test list; no scores are deleted.';

CREATE INDEX IF NOT EXISTS idx_level_tests_is_archived
  ON level_tests(is_archived) WHERE is_archived = false;
