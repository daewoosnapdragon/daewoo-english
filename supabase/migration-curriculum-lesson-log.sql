-- ============================================================================
-- MIGRATION: Lessons imported into the daily plan, and marked done
-- Run this in the Supabase SQL Editor after migration-curriculum-teacher-plans.sql.
-- Safe to run again: it only adds.
--
-- When a teacher drops a catalogue lesson into a day on the Lesson Plans
-- page (from the week view of their class board), the words are copied into
-- that day's plan and a row lands here, so the app still knows which lesson
-- it was. Marking the day done sets done on its rows. The standards the
-- lesson carries are then counted as taught for that class and grade, which
-- the board's footer and, later, the Standards page read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_lesson_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  grade INT NOT NULL,
  date DATE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, english_class, grade, date)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_lesson_log_class ON curriculum_lesson_log (english_class, grade, date);

ALTER TABLE curriculum_lesson_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_lesson_log_all" ON curriculum_lesson_log;
CREATE POLICY "curriculum_lesson_log_all" ON curriculum_lesson_log FOR ALL USING (true) WITH CHECK (true);
