-- Phonics: rechecking the words missed before
-- A recheck reads only the words a student missed on their latest result
-- for each sheet. The saved result is the earlier marks with those words
-- replaced, so the sheet is scored whole. `carried` records, per sheet,
-- the check it built on and the words read again:
--   { skillId: { "from": "<check id>", "date": "YYYY-MM-DD", "rechecked": ["ship", "chin"] } }
-- Empty for an ordinary check.

ALTER TABLE phonics_checks ADD COLUMN IF NOT EXISTS carried JSONB NOT NULL DEFAULT '{}'::jsonb;
