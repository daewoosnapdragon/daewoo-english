-- Create parent_calendar table for the simplified parent calendar
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS parent_calendar (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  english_class text NOT NULL,
  grade integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  updated_by uuid REFERENCES teachers(id),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, english_class, grade)
);

-- Enable RLS
ALTER TABLE parent_calendar ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated access (matches existing pattern)
CREATE POLICY "Allow all access to parent_calendar"
  ON parent_calendar FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups by class/grade/date range
CREATE INDEX IF NOT EXISTS idx_parent_calendar_lookup
  ON parent_calendar(english_class, grade, date);
