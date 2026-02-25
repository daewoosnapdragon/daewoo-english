-- Migration: Add question_map to assessments and item_responses to grades
-- Date: 2026-02-22
-- Purpose: Enable question-level (item) analysis with question maps on assessments
--          and per-student item responses on grades

-- Add question_map column to assessments table
-- Stores the question blueprint: [{num, type, max_points, standard, answer_key}]
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS question_map jsonb DEFAULT NULL;

-- Add item_responses column to grades table  
-- Stores per-question results: [{q, type, answer, correct, points, max, standard}]
ALTER TABLE grades ADD COLUMN IF NOT EXISTS item_responses jsonb DEFAULT NULL;

-- Add unique constraint on grades for upsert support (if not already exists)
-- This allows upsert on student_id + assessment_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grades_student_assessment_unique'
  ) THEN
    ALTER TABLE grades ADD CONSTRAINT grades_student_assessment_unique 
      UNIQUE (student_id, assessment_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, skip
  NULL;
END $$;

-- Comment for documentation
COMMENT ON COLUMN assessments.question_map IS 'Question blueprint for item analysis: [{num, type, max_points, standard?, answer_key?}]';
COMMENT ON COLUMN grades.item_responses IS 'Per-question student responses: [{q, type, answer?, correct?, points, max, standard?}]';
