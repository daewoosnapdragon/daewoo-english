-- ============================================================================
-- MIGRATION: Expand assessment type categories
-- Run this in Supabase SQL Editor BEFORE deploying the new code
-- ============================================================================

-- Drop the old CHECK constraint on assessments.type
ALTER TABLE assessments DROP CONSTRAINT IF EXISTS assessments_type_check;

-- Add new CHECK constraint with expanded categories
ALTER TABLE assessments ADD CONSTRAINT assessments_type_check 
  CHECK (type IN ('quiz', 'project', 'assignment', 'homework', 'participation', 'performance_task', 'formative', 'summative', 'other'));
