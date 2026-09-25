-- ============================================================================
-- MIGRATION: Notice board
-- Run this in the Supabase SQL Editor.
--
-- Teachers post notices for other teachers ("Release Grade 1 at 3:00 today").
-- A notice is shown to everyone, or to the teachers listed in `audience`,
-- until it expires or each reader dismisses it. `notice_receipts` records who
-- has seen and who has dismissed each notice, so the author can see
-- "seen by 2 of 3" and a dismissal only hides the notice for that teacher.
-- ============================================================================

CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  body TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'notice' CHECK (style IN ('notice', 'urgent')),
  author_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  -- NULL = everyone; otherwise the teacher ids it was shared with.
  audience UUID[] DEFAULT NULL,
  -- NULL = until the author removes it; otherwise the last day it shows.
  expires_on DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_expires ON notices(expires_on);

CREATE TABLE IF NOT EXISTS notice_receipts (
  notice_id UUID REFERENCES notices(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT now(),
  dismissed_at TIMESTAMPTZ DEFAULT NULL,
  PRIMARY KEY (notice_id, teacher_id)
);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notices_all" ON notices;
CREATE POLICY "notices_all" ON notices FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notice_receipts_all" ON notice_receipts;
CREATE POLICY "notice_receipts_all" ON notice_receipts FOR ALL USING (true) WITH CHECK (true);
