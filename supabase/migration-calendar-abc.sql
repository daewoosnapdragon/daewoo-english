-- ============================================================================
-- MIGRATION: Calendar Events + Behavior Logs Updates
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Calendar Events table for shared team calendar
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('lesson_plan', 'day_off', 'deadline', 'meeting', 'event', 'testing', 'other')),
  description TEXT DEFAULT '',
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(date);

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write calendar events (shared calendar)
CREATE POLICY "calendar_events_all" ON calendar_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- Update behavior_logs table to support ABC data fields
-- (These may already exist if the previous migration was run)
-- ============================================================================

-- Add ABC-specific columns if they don't exist
DO $$ BEGIN
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS time TEXT;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS duration TEXT;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS activity TEXT;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS antecedents JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS behaviors JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS consequences JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;
  ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS intensity INTEGER DEFAULT 1;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update the type constraint to include 'abc'
ALTER TABLE behavior_logs DROP CONSTRAINT IF EXISTS behavior_logs_type_check;
ALTER TABLE behavior_logs ADD CONSTRAINT behavior_logs_type_check 
  CHECK (type IN ('positive', 'concern', 'parent_contact', 'intervention', 'note', 'abc'));
