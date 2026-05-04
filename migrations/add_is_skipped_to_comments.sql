-- Migration: Add is_skipped column to comments
-- Date: 2026-05-04
-- Purpose: Allow a teacher to mark "no comment" for a student intentionally.
--          When is_skipped = true, the print templates omit the comment
--          section entirely, and the Class Overview counts the student as
--          having a comment "done." The text column may still hold a draft
--          so toggling skip off restores it.

ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT false;
