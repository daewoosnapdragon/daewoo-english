-- ============================================================================
-- MIGRATION: Rubrics
-- Run this in the Supabase SQL Editor.
--
-- Teachers build rubrics in the app (from templates in rubric-library.ts or
-- from scratch) and save them here, for their own class or for the school.
-- When a rubric is used on an assessment, its criteria are snapshotted onto
-- the assessment so later edits to the rubric do not change old scores.
-- Each student's per-criterion levels (0 = N/A, 1–4) are kept on the grade
-- row next to the total, so they can feed comments and the standards view.
-- ============================================================================

CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  task TEXT,                                   -- template it started from, if any
  band TEXT NOT NULL DEFAULT 'g35' CHECK (band IN ('k2', 'g35')),
  criteria JSONB NOT NULL,                     -- [{key, label, levels[4], standard}]
  english_class TEXT DEFAULT NULL,             -- NULL = shared with the whole school
  created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rubric JSONB;          -- snapshot: {name, band, criteria}
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rubric_scores JSONB;        -- {criterionKey: 0-4}

ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rubrics_all" ON rubrics;
CREATE POLICY "rubrics_all" ON rubrics FOR ALL USING (true) WITH CHECK (true);
