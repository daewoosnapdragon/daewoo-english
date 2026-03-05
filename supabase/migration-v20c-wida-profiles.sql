-- WIDA Student Level Profiles
-- Stores per-student WIDA levels by domain
CREATE TABLE IF NOT EXISTS student_wida_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('listening', 'speaking', 'reading', 'writing')),
  wida_level INTEGER NOT NULL CHECK (wida_level >= 1 AND wida_level <= 6),
  updated_by UUID REFERENCES teachers(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, domain)
);

ALTER TABLE student_wida_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON student_wida_levels FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_wida_student ON student_wida_levels(student_id);
CREATE INDEX IF NOT EXISTS idx_wida_domain ON student_wida_levels(student_id, domain);
