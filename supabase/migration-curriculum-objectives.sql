-- Objective banks: three to five "Students will…" lines for each unit, in words a parent can read,
-- each tagged with the CCSS codes and WIDA 2020 language expectations it serves. Teachers tap one
-- onto a day's Students will line in Lesson Plans; the line is then their own text and editing it
-- never changes the bank. No draft or confirmed state: a bank is in use as soon as it is loaded.
-- Run once in the Supabase SQL Editor after migration-curriculum-catalogue.sql. Safe to re-run.
-- Then run seed-unit-objectives.sql to fill the banks for Into Reading, Hand in Hand and Science of Reading.

CREATE TABLE IF NOT EXISTS curriculum_unit_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  ccss_codes TEXT[] NOT NULL DEFAULT '{}',
  wida TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_unit_objectives_unit ON curriculum_unit_objectives (unit_id, sort_order);

ALTER TABLE curriculum_unit_objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_unit_objectives_all" ON curriculum_unit_objectives;
CREATE POLICY "curriculum_unit_objectives_all" ON curriculum_unit_objectives FOR ALL USING (true) WITH CHECK (true);
