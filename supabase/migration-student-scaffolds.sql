-- ============================================================================
-- STUDENT SCAFFOLDS - Assignable scaffolding strategies per student
-- ============================================================================
-- Allows teachers to assign specific scaffolds to students based on WIDA level.
-- These appear on the student's profile page for quick teacher reference.

CREATE TABLE IF NOT EXISTS student_scaffolds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('listening', 'speaking', 'reading', 'writing', 'general')),
  scaffold_text TEXT NOT NULL,
  wida_level INTEGER CHECK (wida_level >= 1 AND wida_level <= 6),
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES teachers(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT DEFAULT ''
);

ALTER TABLE student_scaffolds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON student_scaffolds FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scaffolds_student ON student_scaffolds(student_id);
CREATE INDEX IF NOT EXISTS idx_scaffolds_active ON student_scaffolds(student_id, is_active);
