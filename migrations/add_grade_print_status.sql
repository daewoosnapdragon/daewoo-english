-- Migration: Per-grade "ready to print" flag for report cards
-- Date: 2026-07-11
-- Purpose: Lets staff mark a whole grade as ready to print so report cards
--          aren't accidentally printed before grades/comments are finalized.
--          Used by Reports → Print. Soft gate: printing is still allowed via
--          an explicit "Print anyway" action when a grade isn't marked ready.

CREATE TABLE IF NOT EXISTS grade_print_status (
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES teachers(id),
  PRIMARY KEY (semester_id, grade)
);
