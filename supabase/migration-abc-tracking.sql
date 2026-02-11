-- ============================================================================
-- MIGRATION: Upgrade behavior_logs for ABC Data Tracking
-- Run this in Supabase SQL Editor BEFORE deploying the new code
-- ============================================================================

-- Drop the old type constraint
ALTER TABLE behavior_logs DROP CONSTRAINT IF EXISTS behavior_logs_type_check;

-- Add new columns for ABC tracking
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS antecedents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS behaviors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS consequences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS intensity INTEGER DEFAULT 1;

-- Update type constraint to include 'abc' type
ALTER TABLE behavior_logs ADD CONSTRAINT behavior_logs_type_check 
  CHECK (type IN ('positive', 'concern', 'parent_contact', 'intervention', 'note', 'abc'));

-- Rename 'note' column to 'notes' for consistency (note column already exists, just add notes as alias)
-- Actually let's just keep 'note' as is to avoid breaking anything
