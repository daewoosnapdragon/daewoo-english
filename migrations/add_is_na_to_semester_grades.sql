-- Migration: Add is_na column to semester_grades
-- Date: 2026-05-04
-- Purpose: Per-student domain N/A flag for progress reports and report cards.
--          When is_na = true, the domain is treated as "not assessed" — it
--          renders as an N/A tile and is excluded from overall averages and
--          class averages. final_grade / calculated_grade may still be set so
--          toggling N/A off restores the prior score.

ALTER TABLE semester_grades ADD COLUMN IF NOT EXISTS is_na BOOLEAN DEFAULT false;
