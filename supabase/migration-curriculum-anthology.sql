-- ============================================================================
-- MIGRATION: anthologies, fixed story lengths, done ticks, and a text repair
-- Run this in the Supabase SQL Editor after migration-curriculum-lesson-log.sql.
-- Safe to run again: it only adds, and the repair only touches mangled text.
--
-- A series is a sequence (every unit in order, paced in weeks: phonics,
-- speaking, grammar) or an anthology (a book of stories the class picks
-- from: Into Reading). An anthology placement is a reading list: the chosen
-- stories in order, no weeks typed; the board shares the term across them
-- and draws the projection. A story can be given a fixed length by
-- exception. Teachers tick stories done; progress against even pace is one
-- sentence on the board.
--
-- The repair: the first seed was pasted through a clipboard without a UTF-8
-- locale, so middle dots, apostrophes and accents in the Into Reading titles
-- came through as Mac Roman mojibake. These replacements put them back.
-- ============================================================================

ALTER TABLE curriculum_series ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'sequence' CHECK (kind IN ('sequence', 'anthology'));
UPDATE curriculum_series SET kind = 'anthology' WHERE lower(name) = 'into reading';
ALTER TABLE curriculum_pacing ADD COLUMN IF NOT EXISTS fixed BOOLEAN NOT NULL DEFAULT false;   -- an anthology story with a length set by hand
ALTER TABLE curriculum_pacing ADD COLUMN IF NOT EXISTS done_at TIMESTAMPTZ;                     -- a teacher's tick on a story

-- Text repair, exact for the characters the seed contains.
UPDATE curriculum_units SET title = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(title, '¬°', '¡'), '¬∑', '·'), '√©', 'é'), '√≠', 'í'), '√±', 'ñ'), '√Ω', 'ý'), 'ƒå', 'Č'), '‚Äî', '—'), '‚Äô', '’'), '‚îÄ', '─') WHERE title LIKE '%' || '¬°' || '%' OR title LIKE '%' || '¬∑' || '%' OR title LIKE '%' || '√©' || '%' OR title LIKE '%' || '√≠' || '%' OR title LIKE '%' || '√±' || '%' OR title LIKE '%' || '√Ω' || '%' OR title LIKE '%' || 'ƒå' || '%' OR title LIKE '%' || '‚Äî' || '%' OR title LIKE '%' || '‚Äô' || '%' OR title LIKE '%' || '‚îÄ' || '%';
UPDATE curriculum_units SET summary = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(summary, '¬°', '¡'), '¬∑', '·'), '√©', 'é'), '√≠', 'í'), '√±', 'ñ'), '√Ω', 'ý'), 'ƒå', 'Č'), '‚Äî', '—'), '‚Äô', '’'), '‚îÄ', '─') WHERE summary LIKE '%' || '¬°' || '%' OR summary LIKE '%' || '¬∑' || '%' OR summary LIKE '%' || '√©' || '%' OR summary LIKE '%' || '√≠' || '%' OR summary LIKE '%' || '√±' || '%' OR summary LIKE '%' || '√Ω' || '%' OR summary LIKE '%' || 'ƒå' || '%' OR summary LIKE '%' || '‚Äî' || '%' OR summary LIKE '%' || '‚Äô' || '%' OR summary LIKE '%' || '‚îÄ' || '%';
UPDATE curriculum_lessons SET title = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(title, '¬°', '¡'), '¬∑', '·'), '√©', 'é'), '√≠', 'í'), '√±', 'ñ'), '√Ω', 'ý'), 'ƒå', 'Č'), '‚Äî', '—'), '‚Äô', '’'), '‚îÄ', '─') WHERE title LIKE '%' || '¬°' || '%' OR title LIKE '%' || '¬∑' || '%' OR title LIKE '%' || '√©' || '%' OR title LIKE '%' || '√≠' || '%' OR title LIKE '%' || '√±' || '%' OR title LIKE '%' || '√Ω' || '%' OR title LIKE '%' || 'ƒå' || '%' OR title LIKE '%' || '‚Äî' || '%' OR title LIKE '%' || '‚Äô' || '%' OR title LIKE '%' || '‚îÄ' || '%';
UPDATE curriculum_lessons SET objective = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(objective, '¬°', '¡'), '¬∑', '·'), '√©', 'é'), '√≠', 'í'), '√±', 'ñ'), '√Ω', 'ý'), 'ƒå', 'Č'), '‚Äî', '—'), '‚Äô', '’'), '‚îÄ', '─') WHERE objective LIKE '%' || '¬°' || '%' OR objective LIKE '%' || '¬∑' || '%' OR objective LIKE '%' || '√©' || '%' OR objective LIKE '%' || '√≠' || '%' OR objective LIKE '%' || '√±' || '%' OR objective LIKE '%' || '√Ω' || '%' OR objective LIKE '%' || 'ƒå' || '%' OR objective LIKE '%' || '‚Äî' || '%' OR objective LIKE '%' || '‚Äô' || '%' OR objective LIKE '%' || '‚îÄ' || '%';
UPDATE curriculum_lessons SET notes = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(notes, '¬°', '¡'), '¬∑', '·'), '√©', 'é'), '√≠', 'í'), '√±', 'ñ'), '√Ω', 'ý'), 'ƒå', 'Č'), '‚Äî', '—'), '‚Äô', '’'), '‚îÄ', '─') WHERE notes LIKE '%' || '¬°' || '%' OR notes LIKE '%' || '¬∑' || '%' OR notes LIKE '%' || '√©' || '%' OR notes LIKE '%' || '√≠' || '%' OR notes LIKE '%' || '√±' || '%' OR notes LIKE '%' || '√Ω' || '%' OR notes LIKE '%' || 'ƒå' || '%' OR notes LIKE '%' || '‚Äî' || '%' OR notes LIKE '%' || '‚Äô' || '%' OR notes LIKE '%' || '‚îÄ' || '%';
