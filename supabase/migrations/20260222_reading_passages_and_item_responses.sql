-- Migration: Add reading_passages table and item_responses column to grades
-- Date: 2026-02-22
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1. reading_passages table (for ORF running records)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reading_passages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  word_count INTEGER,
  level TEXT,              -- e.g. 'A', 'B', 'C', 'D', 'E', 'F' or Lexile like '400L'
  grade_range TEXT,        -- e.g. '1-2', '3-5'
  source TEXT,             -- e.g. 'teacher-created', 'DIBELS', 'AIMSweb'
  created_by UUID REFERENCES teachers(id),
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;

-- Open policy matching other tables in the app
CREATE POLICY "Allow all" ON reading_passages FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 2. Add item_responses JSONB column to grades table
--    Stores per-question responses for question-map scored assessments
--    Format: [{q: 1, type: 'mc', answer: 'B', correct: true, points: 1, max: 1}, ...]
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE grades ADD COLUMN IF NOT EXISTS item_responses JSONB DEFAULT NULL;
