-- ============================================================================
-- MIGRATION: Curriculum placements and the pacing master
-- Run this in the Supabase SQL Editor after migration-curriculum-catalogue.sql.
-- Safe to run again: it only adds.
--
-- A placement is a book in a class and grade for a term: Super Phonics 2 in
-- Daisy Grade 2 for fall 2027. The same book placed in two classes is two
-- placements of one catalogue entry. Grades inside a level use different
-- books, so placements are always per class AND grade. A book that runs the
-- whole year is one placement with term "year"; its units run on across the
-- winter break.
--
-- Pacing is the master's answer to "how long does each unit get, in what
-- order": one row per unit in the placement, in order, with its weeks.
-- Dates are never stored: a unit's weeks are added up from the start of the
-- term (the earliest start date of that term's grading periods in the
-- semesters table), so a slip later moves everything after it on its own.
-- A unit the class will not do is simply not in the pacing.
--
-- The teacher's own copy of the pacing, "we're here" pins, blank blocks and
-- actuals come in the next migration; owner and is_master are here so they
-- can be added without changing these rows.
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES curriculum_books(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  grade INT NOT NULL,
  academic_year TEXT NOT NULL,                      -- as the semesters table writes it, "2027-2028"
  term TEXT NOT NULL DEFAULT 'fall' CHECK (term IN ('fall', 'spring', 'year')),
  is_master BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_placements_master ON curriculum_placements (book_id, english_class, grade, academic_year, term) WHERE is_master;
CREATE INDEX IF NOT EXISTS idx_curriculum_placements_class ON curriculum_placements (english_class, grade, academic_year);

CREATE TABLE IF NOT EXISTS curriculum_pacing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES curriculum_placements(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  weeks NUMERIC NOT NULL DEFAULT 2,
  owner TEXT NOT NULL DEFAULT 'master' CHECK (owner IN ('master', 'teacher')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (placement_id, unit_id)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_pacing_placement ON curriculum_pacing (placement_id, sort_order);

ALTER TABLE curriculum_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_pacing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_placements_all" ON curriculum_placements;
CREATE POLICY "curriculum_placements_all" ON curriculum_placements FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_pacing_all" ON curriculum_pacing;
CREATE POLICY "curriculum_pacing_all" ON curriculum_pacing FOR ALL USING (true) WITH CHECK (true);
