-- ============================================================================
-- MIGRATION: Activity log
-- Run this in the Supabase SQL Editor.
--
-- Who did what, when. The app writes it (the app knows who is signed in;
-- the database does not): one row per sign-in, sign-out, page opened and
-- saved action. Repeated saves on the same thing within ten minutes fold
-- into one row with a count. Read on /activity by admin, the head teacher
-- and the Snapdragon teacher.
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  -- login, logout, visit, scored, saved, created, edited, deleted, printed, posted, settings
  action TEXT NOT NULL,
  -- what, in words: "Unit 3 Quiz · Snapdragon", "Attendance · Grade 4 · 2026-10-27"
  detail TEXT DEFAULT '',
  -- the page it happened on
  path TEXT DEFAULT '',
  -- how many saves were folded into this row
  count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_teacher ON activity_log(teacher_id, created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_all" ON activity_log;
CREATE POLICY "activity_log_all" ON activity_log FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
