-- Progress reports: a per-student switch for the "Areas at a glance" graph
-- (a bar per domain over the letter bands, with the class average marked).
-- It lives on the student's progress_report comment row. Run once in the
-- Supabase SQL editor; safe to re-run.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS include_graph BOOLEAN DEFAULT FALSE;
NOTIFY pgrst, 'reload schema';
