-- Enhanced Student Groups: archive, exclusions, tasks, grade-level support
-- Run AFTER the original 20260220_student_groups.sql

-- Add grade column and archive support to student_groups
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS grade INT;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS active_from DATE;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS active_until DATE;
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS suggested_by TEXT; -- 'auto' or 'manual'
ALTER TABLE student_groups ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'; -- [{text, done, created_at}]

-- Drop the old CHECK constraint and recreate with new types
ALTER TABLE student_groups DROP CONSTRAINT IF EXISTS student_groups_type_check;
ALTER TABLE student_groups ADD CONSTRAINT student_groups_type_check CHECK (type IN ('skill', 'fluency', 'litCircle', 'partner', 'custom'));

-- Index on grade for filtering
CREATE INDEX IF NOT EXISTS idx_student_groups_grade ON student_groups(grade);
CREATE INDEX IF NOT EXISTS idx_student_groups_archived ON student_groups(is_archived);

-- Student exclusion pairs (students who should not be in the same group)
CREATE TABLE IF NOT EXISTS student_exclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_a, student_b, english_class)
);

ALTER TABLE student_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage exclusions" ON student_exclusions FOR ALL USING (true) WITH CHECK (true);

-- Backfill grade from class data where possible
UPDATE student_groups sg SET grade = (
  SELECT DISTINCT s.grade FROM students s WHERE s.id = ANY(sg.student_ids) AND s.is_active = true LIMIT 1
) WHERE sg.grade IS NULL;
