-- Migration: Student Quick Notes
-- Lightweight one-liner notes per student, shown as timeline
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view all notes" ON student_notes FOR SELECT USING (true);
CREATE POLICY "Teachers can insert notes" ON student_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Teachers can delete own notes" ON student_notes FOR DELETE USING (true);

CREATE INDEX idx_student_notes_student ON student_notes(student_id, created_at DESC);
