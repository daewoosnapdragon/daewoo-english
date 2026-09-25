-- ============================================================================
-- MIGRATION: WIDA can-do questionnaire answers
-- Run this in the Supabase SQL Editor. Safe to run twice.
-- The ticked statement ids per student and domain, so the questionnaire
-- opens with last time's answers and only what moved needs changing.
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_wida_cando (
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('listening', 'speaking', 'reading', 'writing')),
  ticked TEXT[] NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES teachers(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (student_id, domain)
);
ALTER TABLE student_wida_cando ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_wida_cando_all" ON student_wida_cando;
CREATE POLICY "student_wida_cando_all" ON student_wida_cando FOR ALL USING (true) WITH CHECK (true);
