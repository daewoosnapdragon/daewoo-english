-- OPTIONAL, and it cannot be undone. Removes what the old class boards kept and the app no longer reads:
-- teachers' own copies of plans, "we're here" pins, teachers' blocks, admin reviews of teachers' plans,
-- the lesson log of the week view, the class setup (usual days and recipes), and the plan-row columns for
-- gaps, pins and Done ticks (Done ticks moved to curriculum_unit_done in migration-curriculum-class-plans.sql).
--
-- Run it only after migration-curriculum-class-plans.sql, once Class plans are working and you are sure
-- nothing in those tables is wanted. Export anything you want to keep first.

BEGIN;

DELETE FROM curriculum_pacing WHERE owner = 'teacher';

DROP FUNCTION IF EXISTS curriculum_adopt_as_master(UUID, UUID);
DROP FUNCTION IF EXISTS curriculum_revert_to_master(UUID, UUID);

DROP TABLE IF EXISTS curriculum_here;
DROP TABLE IF EXISTS curriculum_blocks;
DROP TABLE IF EXISTS curriculum_plan_reviews;
DROP TABLE IF EXISTS curriculum_lesson_log;
DROP TABLE IF EXISTS curriculum_class_setup;

DROP INDEX IF EXISTS idx_curriculum_pacing_teacher;
DROP INDEX IF EXISTS idx_curriculum_pacing_teacher_rows;
ALTER TABLE curriculum_pacing DROP COLUMN IF EXISTS teacher_id;
ALTER TABLE curriculum_pacing DROP COLUMN IF EXISTS gap_before;
ALTER TABLE curriculum_pacing DROP COLUMN IF EXISTS fixed;
ALTER TABLE curriculum_pacing DROP COLUMN IF EXISTS done_at;

-- curriculum_create_placement wrote the dropped columns: it now writes only what is left.
CREATE OR REPLACE FUNCTION curriculum_create_placement(
  p_book UUID, p_class TEXT, p_grade INT, p_year TEXT, p_term TEXT, p_by UUID, p_rows JSONB
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE pid UUID;
BEGIN
  INSERT INTO curriculum_placements (book_id, english_class, grade, academic_year, term, is_master, created_by)
  VALUES (p_book, p_class, p_grade, p_year, p_term, true, p_by)
  RETURNING id INTO pid;
  INSERT INTO curriculum_pacing (placement_id, unit_id, sort_order, weeks, owner)
  SELECT pid, (r->>'unit_id')::uuid, (r->>'sort_order')::int, COALESCE((r->>'weeks')::numeric, 2), 'master'
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;
  RETURN pid;
END $$;

-- curriculum_patch_pacing also wrote gaps and pins: it now patches lengths only.
CREATE OR REPLACE FUNCTION curriculum_patch_pacing(p_patches JSONB) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE curriculum_pacing p SET weeks = COALESCE((x->>'weeks')::numeric, p.weeks), updated_at = now()
  FROM jsonb_array_elements(COALESCE(p_patches, '[]'::jsonb)) AS x
  WHERE p.id = (x->>'id')::uuid;
END $$;
GRANT EXECUTE ON FUNCTION curriculum_create_placement(UUID, TEXT, INT, TEXT, TEXT, UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_patch_pacing(JSONB) TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
