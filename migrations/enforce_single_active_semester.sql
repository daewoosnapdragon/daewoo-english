-- Only one semester may be active at a time.
--
-- Settings > Set Active used to clear the previous active semester with
-- `id <> 'none'`, which Postgres rejected ('none' is not a uuid). The failure
-- was never surfaced, so each click added another active semester instead of
-- moving the flag -- and screens that resolve the active semester with
-- `.single()` then errored out while others silently picked a different one.
--
-- The app no longer does that, but this index makes the invariant impossible to
-- break from anywhere (SQL editor, a future code path, two admins at once).
-- Safe to run more than once.

-- 1. Collapse any existing duplicates onto the most recently started semester.
UPDATE semesters
SET is_active = false
WHERE is_active
  AND id <> (
    SELECT id FROM semesters
    WHERE is_active
    ORDER BY start_date DESC NULLS LAST, created_at DESC
    LIMIT 1
  );

-- 2. An archived semester is hidden from every picker, so it must not be active.
UPDATE semesters SET is_active = false WHERE is_active AND is_archived;

-- 3. Enforce it from here on. Every row covered by this partial index has
--    is_active = true, so uniqueness on that column allows exactly one.
--    Inactive rows are not indexed at all.
CREATE UNIQUE INDEX IF NOT EXISTS semesters_one_active_idx
  ON semesters (is_active) WHERE is_active;
