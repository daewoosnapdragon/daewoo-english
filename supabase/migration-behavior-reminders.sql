-- ============================================================================
-- MIGRATION: Behavior case reminders
-- Run this in the Supabase SQL Editor.
--
-- A case that is waiting on admin can be given an automatic-looking reminder:
-- an urgent notice to every admin with no author, and a mark on the case
-- saying when it last went out and how many times. Who pressed the button is
-- deliberately not stored anywhere.
-- ============================================================================

ALTER TABLE behavior_cases ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMPTZ;
ALTER TABLE behavior_cases ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE behavior_cases ADD COLUMN IF NOT EXISTS reminder_notice_id UUID REFERENCES notices(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
