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

-- An older, unused `rubrics` table (name, domain, criteria, created_by,
-- created_at) may already exist from 20260220_peer_parent_tables.sql. This
-- creates the table if it is missing and then adds every column the app
-- needs, so it is safe to run on either state, and safe to run twice.
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

ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS task TEXT;
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS band TEXT NOT NULL DEFAULT 'g35';
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS criteria JSONB;
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS english_class TEXT DEFAULT NULL;
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES teachers(id) ON DELETE SET NULL;
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- The old table's `domain` column is NOT NULL; give it a default so new rows need not set it.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rubrics' AND column_name = 'domain') THEN
    ALTER TABLE rubrics ALTER COLUMN domain SET DEFAULT 'writing';
  END IF;
END $$;

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS rubric JSONB;          -- snapshot: {name, band, criteria}
ALTER TABLE grades ADD COLUMN IF NOT EXISTS rubric_scores JSONB;        -- {criterionKey: 0-4}

ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rubrics_all" ON rubrics;
CREATE POLICY "rubrics_all" ON rubrics FOR ALL USING (true) WITH CHECK (true);
