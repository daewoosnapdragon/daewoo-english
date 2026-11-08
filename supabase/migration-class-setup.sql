-- ============================================================================
-- MIGRATION: Class setup for lesson planning
-- Run this in the Supabase SQL Editor after migration-curriculum-catalogue.sql.
-- Safe to run again.
--
-- One row per class for all its grades (grade 0), plus a row for a grade that
-- is set up differently. It holds what the Lesson Plans tray and the board read:
--   days      the usual weekdays for each book series, {"<series id>": [1, 2, 3]}
--             (0 = Monday ... 4 = Friday)
--   recipes   how the class teaches a unit of each series: the days each part
--             takes, 0 to skip it, {"<series id>": {"parts": {"Grammar": 2, "English Sounds": 0}}}
--             A part not named takes one day, as the book has it.
--   standing  things that go on the same weekday every week,
--             [{"id": "...", "title": "Spelling test", "weekday": 4}]
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_class_setup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  english_class TEXT NOT NULL,
  grade INT NOT NULL DEFAULT 0 CHECK (grade BETWEEN 0 AND 5),
  days JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipes JSONB NOT NULL DEFAULT '{}'::jsonb,
  standing JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (english_class, grade)
);

ALTER TABLE curriculum_class_setup ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_class_setup_all" ON curriculum_class_setup;
CREATE POLICY "curriculum_class_setup_all" ON curriculum_class_setup FOR ALL USING (true) WITH CHECK (true);

-- Tell PostgREST about the new table straight away.
NOTIFY pgrst, 'reload schema';
