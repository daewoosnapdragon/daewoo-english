-- ============================================================================
-- MIGRATION: Teachers' own plans, "we're here", blank blocks, the review queue
-- Run this in the Supabase SQL Editor after migration-curriculum-placements.sql.
-- Safe to run again: it only adds.
--
-- A teacher's plan is their own copy of a placement's pacing: the same rows
-- as the master (owner 'teacher', with their teacher_id), made the first
-- time they change anything, and theirs from then on. No copy means the
-- master applies. A row may carry a gap before it, in weeks, so a class
-- that is behind can push a unit later without stretching the one before.
--
-- "We're here" is a pin: the teacher says which unit starts this week; the
-- app moves that unit there (a gap, or shorter earlier units when ahead)
-- and remembers the pin so the board can show the drift since. Blank
-- blocks are a teacher's own things, not from any book, drawn on their
-- board in an "Our class" row. Reviews are admin's mark that a plan's
-- differences from the master have been seen, with a comment the teacher
-- sees on their board.
-- ============================================================================

ALTER TABLE curriculum_pacing ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE;
ALTER TABLE curriculum_pacing ADD COLUMN IF NOT EXISTS gap_before NUMERIC NOT NULL DEFAULT 0;   -- weeks of nothing before this unit
ALTER TABLE curriculum_pacing DROP CONSTRAINT IF EXISTS curriculum_pacing_placement_id_unit_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_pacing_master ON curriculum_pacing (placement_id, unit_id) WHERE owner = 'master';
CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_pacing_teacher ON curriculum_pacing (placement_id, unit_id, teacher_id) WHERE owner = 'teacher';
CREATE INDEX IF NOT EXISTS idx_curriculum_pacing_teacher_rows ON curriculum_pacing (teacher_id) WHERE owner = 'teacher';

CREATE TABLE IF NOT EXISTS curriculum_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  grade INT NOT NULL,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL CHECK (term IN ('fall', 'spring')),
  title TEXT NOT NULL,
  strand TEXT NOT NULL DEFAULT 'other',
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  start_week NUMERIC NOT NULL DEFAULT 1,            -- week of the term it starts in
  weeks NUMERIC NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_blocks_class ON curriculum_blocks (english_class, grade, academic_year, term);

CREATE TABLE IF NOT EXISTS curriculum_here (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES curriculum_placements(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES curriculum_units(id) ON DELETE SET NULL,
  week NUMERIC NOT NULL,                            -- placement week the pin sits on
  note TEXT NOT NULL DEFAULT '',
  set_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_here_placement ON curriculum_here (placement_id, teacher_id, set_at DESC);

CREATE TABLE IF NOT EXISTS curriculum_plan_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES curriculum_placements(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  signature TEXT NOT NULL DEFAULT '',               -- the plan as it was when seen; a later change reopens it
  comment TEXT NOT NULL DEFAULT '',
  seen_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (placement_id, teacher_id)
);

ALTER TABLE curriculum_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_here ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_plan_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_blocks_all" ON curriculum_blocks;
CREATE POLICY "curriculum_blocks_all" ON curriculum_blocks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_here_all" ON curriculum_here;
CREATE POLICY "curriculum_here_all" ON curriculum_here FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_plan_reviews_all" ON curriculum_plan_reviews;
CREATE POLICY "curriculum_plan_reviews_all" ON curriculum_plan_reviews FOR ALL USING (true) WITH CHECK (true);
