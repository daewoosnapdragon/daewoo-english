-- ================================================================
-- V20 MIGRATION: Curriculum Standards Tracking Table
-- ================================================================

-- Class-level standard status tracking
CREATE TABLE IF NOT EXISTS class_standard_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  english_class text NOT NULL,
  student_grade int NOT NULL,
  standard_code text NOT NULL,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'mastered')),
  updated_by uuid REFERENCES teachers(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (english_class, student_grade, standard_code)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_css_class_grade ON class_standard_status(english_class, student_grade);

-- RLS
ALTER TABLE class_standard_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_standard_status_all" ON class_standard_status;
CREATE POLICY "class_standard_status_all" ON class_standard_status FOR ALL USING (true) WITH CHECK (true);
