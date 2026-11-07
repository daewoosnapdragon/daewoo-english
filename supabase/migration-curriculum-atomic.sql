-- ============================================================================
-- MIGRATION: Curriculum saves that happen all at once or not at all
-- Run this in the Supabase SQL Editor after migration-curriculum-anthology.sql.
-- Safe to run again: every function is CREATE OR REPLACE.
--
-- Until now, some saves were several requests from the browser in a row:
-- placing a book (the placement, then its units), making a teacher's plan
-- the school plan (delete the school plan's rows, then insert the teacher's),
-- going back to the school plan, reordering, and patching many rows after a
-- drag. A failure part way (a dropped connection, a closed laptop) left a
-- half-done state: a book placed with no units, a placement with no school
-- plan at all, two units with the same position. Each of these is now one
-- function call, which Postgres runs in a single transaction. The app calls
-- them when they exist and falls back to the old requests when they don't,
-- so nothing breaks before this is run.
-- ============================================================================

-- Places a book in a class and grade with its pacing rows.
-- p_rows: [{"unit_id": "...", "sort_order": 1, "weeks": 2, "gap_before": 0, "fixed": false}, ...]
CREATE OR REPLACE FUNCTION curriculum_create_placement(
  p_book UUID, p_class TEXT, p_grade INT, p_year TEXT, p_term TEXT, p_by UUID, p_rows JSONB
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE pid UUID;
BEGIN
  INSERT INTO curriculum_placements (book_id, english_class, grade, academic_year, term, is_master, created_by)
  VALUES (p_book, p_class, p_grade, p_year, p_term, true, p_by)
  RETURNING id INTO pid;
  INSERT INTO curriculum_pacing (placement_id, unit_id, sort_order, weeks, gap_before, fixed, owner)
  SELECT pid, (r->>'unit_id')::uuid, (r->>'sort_order')::int, COALESCE((r->>'weeks')::numeric, 2),
         COALESCE((r->>'gap_before')::numeric, 0), COALESCE((r->>'fixed')::boolean, false), 'master'
  FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb)) AS r;
  RETURN pid;
END $$;

-- Makes a teacher's plan the school plan: its rows replace the master rows, then the teacher's copy and review go.
CREATE OR REPLACE FUNCTION curriculum_adopt_as_master(p_placement UUID, p_teacher UUID) RETURNS INT LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM curriculum_pacing WHERE placement_id = p_placement AND owner = 'teacher' AND teacher_id = p_teacher;
  IF n = 0 THEN RAISE EXCEPTION 'This teacher has no plan of their own here.'; END IF;
  DELETE FROM curriculum_pacing WHERE placement_id = p_placement AND owner = 'master';
  INSERT INTO curriculum_pacing (placement_id, unit_id, sort_order, weeks, gap_before, fixed, done_at, owner)
  SELECT placement_id, unit_id, sort_order, weeks, gap_before, fixed, NULL, 'master'
  FROM curriculum_pacing WHERE placement_id = p_placement AND owner = 'teacher' AND teacher_id = p_teacher;
  DELETE FROM curriculum_pacing WHERE placement_id = p_placement AND owner = 'teacher' AND teacher_id = p_teacher;
  DELETE FROM curriculum_plan_reviews WHERE placement_id = p_placement AND teacher_id = p_teacher;
  RETURN n;
END $$;

-- Drops a teacher's own plan for a placement (rows, pins, review): the school plan applies again.
CREATE OR REPLACE FUNCTION curriculum_revert_to_master(p_placement UUID, p_teacher UUID) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM curriculum_pacing WHERE placement_id = p_placement AND owner = 'teacher' AND teacher_id = p_teacher;
  DELETE FROM curriculum_here WHERE placement_id = p_placement AND teacher_id = p_teacher;
  DELETE FROM curriculum_plan_reviews WHERE placement_id = p_placement AND teacher_id = p_teacher;
END $$;

-- Sets sort_order 1, 2, 3… in the order of the ids given, for units, lessons or pacing rows.
CREATE OR REPLACE FUNCTION curriculum_set_order(p_table TEXT, p_ids UUID[]) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF p_table NOT IN ('curriculum_units', 'curriculum_lessons', 'curriculum_pacing') THEN
    RAISE EXCEPTION 'curriculum_set_order: % is not a curriculum table', p_table;
  END IF;
  EXECUTE format('UPDATE %I t SET sort_order = x.ord FROM unnest($1) WITH ORDINALITY AS x(id, ord) WHERE t.id = x.id', p_table) USING p_ids;
END $$;

-- Patches weeks, gap and fixed on many pacing rows at once (a drag, a re-flow).
-- p_patches: [{"id": "...", "weeks": 2, "gap_before": 0, "fixed": true}, ...]; a missing key leaves that column alone.
CREATE OR REPLACE FUNCTION curriculum_patch_pacing(p_patches JSONB) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE curriculum_pacing p SET
    weeks = COALESCE((x->>'weeks')::numeric, p.weeks),
    gap_before = COALESCE((x->>'gap_before')::numeric, p.gap_before),
    fixed = COALESCE((x->>'fixed')::boolean, p.fixed),
    updated_at = now()
  FROM jsonb_array_elements(COALESCE(p_patches, '[]'::jsonb)) AS x
  WHERE p.id = (x->>'id')::uuid;
END $$;

GRANT EXECUTE ON FUNCTION curriculum_create_placement(UUID, TEXT, INT, TEXT, TEXT, UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_adopt_as_master(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_revert_to_master(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_set_order(TEXT, UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION curriculum_patch_pacing(JSONB) TO anon, authenticated;

-- Tell PostgREST about the new functions straight away.
NOTIFY pgrst, 'reload schema';
