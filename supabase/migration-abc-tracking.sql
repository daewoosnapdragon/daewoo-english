-- ============================================================================
-- MIGRATION: Enhance behavior_logs for ABC Data Tracking
-- Run this in Supabase SQL Editor BEFORE deploying the new code
-- ============================================================================

-- Add new columns for full ABC tracking
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT '';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS antecedents TEXT[] DEFAULT '{}';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS behaviors TEXT[] DEFAULT '{}';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS consequences TEXT[] DEFAULT '{}';
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS intensity INTEGER DEFAULT 1;

-- Expand the type check to include 'abc' entries
ALTER TABLE behavior_logs DROP CONSTRAINT IF EXISTS behavior_logs_type_check;
ALTER TABLE behavior_logs ADD CONSTRAINT behavior_logs_type_check
  CHECK (type IN ('positive', 'concern', 'parent_contact', 'intervention', 'note', 'abc'));
