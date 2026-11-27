-- Review weeks: time straight after a unit, before the next one starts (Year plan, Nov 2026),
-- and Science of Reading's colour (see the end).
-- A unit's row in a class's plan gets review_weeks (0 = none, in half weeks like weeks). The Year plan
-- and a book's card add them one at a time ("+ Review") or after every section in one click.
-- Run once in the Supabase SQL Editor. Safe to re-run. Until it runs, plans show no review weeks and
-- adding one says this file needs running.

ALTER TABLE curriculum_pacing ADD COLUMN IF NOT EXISTS review_weeks NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE curriculum_pacing DROP CONSTRAINT IF EXISTS curriculum_pacing_review_weeks_check;
ALTER TABLE curriculum_pacing ADD CONSTRAINT curriculum_pacing_review_weeks_check CHECK (review_weeks >= 0 AND review_weeks <= 8);
-- Science of Reading was teal, the same as Rich Reading; with the new book colours it is apricot (orange).
-- Only changed while it is still teal, so a colour picked on the Bookshelf since is kept.
UPDATE curriculum_series SET color = 'orange' WHERE lower(name) = 'science of reading' AND color = 'teal';

NOTIFY pgrst, 'reload schema';
