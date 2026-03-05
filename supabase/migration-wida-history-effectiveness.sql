-- ============================================================================
-- WIDA HISTORY + SCAFFOLD EFFECTIVENESS
-- Run this in Supabase SQL Editor after migration-student-scaffolds.sql
-- ============================================================================

-- 1. WIDA Level History -- stores snapshots when levels change
CREATE TABLE IF NOT EXISTS student_wida_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('listening', 'speaking', 'reading', 'writing')),
  wida_level INTEGER NOT NULL CHECK (wida_level >= 1 AND wida_level <= 6),
  recorded_by UUID REFERENCES teachers(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  semester_id UUID REFERENCES semesters(id),
  notes TEXT DEFAULT ''
);

ALTER TABLE student_wida_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON student_wida_history FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_wida_history_student ON student_wida_history(student_id);
CREATE INDEX IF NOT EXISTS idx_wida_history_date ON student_wida_history(student_id, recorded_at);

-- 2. Add effectiveness tracking to student_scaffolds
-- (only if columns don't already exist)
DO $$ BEGIN
  ALTER TABLE student_scaffolds ADD COLUMN IF NOT EXISTS effectiveness TEXT DEFAULT NULL CHECK (effectiveness IN ('working', 'not_working', 'unclear'));
  ALTER TABLE student_scaffolds ADD COLUMN IF NOT EXISTS effectiveness_note TEXT DEFAULT '';
  ALTER TABLE student_scaffolds ADD COLUMN IF NOT EXISTS effectiveness_updated_at TIMESTAMPTZ DEFAULT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
