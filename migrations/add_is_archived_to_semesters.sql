-- Migration: Add is_archived to semesters
-- Date: 2026-08-09
-- Purpose: Let old semesters be hidden from the semester/cutoff-date pickers
--          WITHOUT deleting any of their grades, comments, or report cards.
--
-- Archiving is purely a visibility flag. Archived semesters:
--   - disappear from every semester picker (Grades, Leveling, Dashboard)
--   - stay visible in Settings behind a "Show archived" toggle
--   - keep all linked data intact; reports still resolve their names by id
--
-- Safe to run more than once.

ALTER TABLE semesters ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN semesters.is_archived IS
  'Visibility flag only. true = hidden from semester pickers; no data is deleted. The active semester can never be archived.';

-- An archived semester must never also be the active one.
CREATE INDEX IF NOT EXISTS idx_semesters_is_archived ON semesters(is_archived) WHERE is_archived = false;
