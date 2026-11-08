-- Class plans (step 3 of docs/lesson-planning-review.md). Each class and grade has one plan per book, kept by
-- admin: which units, in what order, a suggested length in weeks for each, and an optional aim date. The
-- Curriculum tab draws it as a timeline, units end to end from the start of the term, across holiday weeks.
-- Teachers do not edit it; what they plan in Lesson Plans is what was taught.
--
-- Run once in the Supabase SQL Editor after the earlier curriculum migrations. Safe to re-run.
-- Nothing is deleted here. Teachers' own copies of plans, "we're here" pins, blocks, reviews, the lesson log
-- and the class setup stay in the database, but the app no longer reads them. When you are happy with the new
-- Class plans, cleanup-curriculum-old-plans.sql removes them.

-- An aim date per book: "finish by 18 Dec".
ALTER TABLE curriculum_placements ADD COLUMN IF NOT EXISTS aim_date DATE;

-- Units a class has finished. Kept apart from the plan rows so editing a plan can never lose them.
CREATE TABLE IF NOT EXISTS curriculum_unit_done (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id UUID NOT NULL REFERENCES curriculum_placements(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  UNIQUE (placement_id, unit_id)
);
ALTER TABLE curriculum_unit_done ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_unit_done_all" ON curriculum_unit_done;
CREATE POLICY "curriculum_unit_done_all" ON curriculum_unit_done FOR ALL USING (true) WITH CHECK (true);

-- The Done ticks already made (on the school plan or a teacher's copy) move over.
INSERT INTO curriculum_unit_done (placement_id, unit_id, done_at)
SELECT DISTINCT ON (placement_id, unit_id) placement_id, unit_id, done_at
FROM curriculum_pacing WHERE done_at IS NOT NULL
ORDER BY placement_id, unit_id, done_at
ON CONFLICT (placement_id, unit_id) DO NOTHING;

-- Into Reading: a module week is one week, shared by the texts read in it (two texts, half a week each).
-- Only units still at the 2-week placeholder change, so a length set on the Bookshelf stays.
UPDATE curriculum_units u SET default_weeks = w.weeks, updated_at = now()
FROM (
  SELECT un.id, GREATEST(0.5, round(2.0 / count(*) OVER (PARTITION BY un.book_id, substring(un.title from '^(M\d+\s*W\d+)'))) / 2) AS weeks
  FROM curriculum_units un
  JOIN curriculum_books b ON b.id = un.book_id
  JOIN curriculum_series s ON s.id = b.series_id
  WHERE lower(s.name) = 'into reading' AND un.title ~ '^M\d+\s*W\d+'
) w
WHERE u.id = w.id AND u.default_weeks = 2;

-- The school plan's Into Reading stories that were sharing the term (not given a length by hand) take that length.
UPDATE curriculum_pacing pc SET weeks = u.default_weeks, updated_at = now()
FROM curriculum_units u
JOIN curriculum_books b ON b.id = u.book_id
JOIN curriculum_series s ON s.id = b.series_id
WHERE pc.unit_id = u.id AND pc.owner = 'master' AND NOT pc.fixed AND pc.weeks = 2
  AND lower(s.name) = 'into reading' AND u.default_weeks <> 2;
