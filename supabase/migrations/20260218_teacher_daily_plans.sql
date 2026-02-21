-- Migration: Create teacher_daily_plans table
-- For use with the Teacher Plans tab in Lesson Plans
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS teacher_daily_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  english_class TEXT NOT NULL,
  plan_text TEXT DEFAULT '',
  updated_by UUID REFERENCES teachers(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, english_class)
);

-- Enable RLS
ALTER TABLE teacher_daily_plans ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can view all plans"
  ON teacher_daily_plans FOR SELECT USING (true);

CREATE POLICY "Teachers can insert plans"
  ON teacher_daily_plans FOR INSERT WITH CHECK (true);

CREATE POLICY "Teachers can update plans"
  ON teacher_daily_plans FOR UPDATE USING (true);

-- Index for efficient lookups
CREATE INDEX idx_teacher_plans_date_class ON teacher_daily_plans(date, english_class);
