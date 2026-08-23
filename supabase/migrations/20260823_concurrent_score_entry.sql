-- ============================================================================
-- CONCURRENT SCORE ENTRY: per-group, per-key atomic merging
-- ============================================================================
-- Two teachers now split one student's written paper: one enters the multiple
-- choice, the other enters the writing rubric. Both screens are the same
-- component, and it wrote EVERY written key on every save -- including the
-- keys it had not touched, from a local snapshot loaded when the screen
-- opened. The MC teacher's save therefore wrote `written_rubric` back as
-- whatever it was at 9am, and `writing_total` back as 0, wiping the writing
-- teacher's work. The row-level merge in 20260306 could not prevent this: it
-- merges at the top level, and both saves were sending the same top-level
-- keys.
--
-- Two things fix it. The client now sends only the key group it actually
-- edited (below, in WrittenTestEntry), and this function merges the objects
-- INSIDE a key rather than replacing them, so two teachers entering different
-- questions or different rubric categories both keep their work.
--
-- Note for anyone reading 20260306: those upsert_* RPCs were never called by
-- the app. Every save goes through PostgREST's upsert and relies on the
-- BEFORE UPDATE merge trigger. This function IS called.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- merge_score_json: top-level merge, with named keys merged one level deeper
-- ────────────────────────────────────────────────────────────────────────────
-- `nested` names keys whose values are objects keyed by question number or
-- rubric category. For those, old and new are merged key by key, so a save
-- that carries questions 1-10 does not delete questions 11-20 entered by
-- someone else. Any key not named in `nested` is replaced outright, which is
-- what a scalar total should do.
--
-- A cleared answer must be written as an empty string rather than dropped
-- from the object, or the merge will read it as "not mentioned" and keep the
-- old value. The entry screens do write '' -- see setAnswer.

CREATE OR REPLACE FUNCTION merge_score_json(
  old_json JSONB,
  new_json JSONB,
  nested TEXT[] DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_old JSONB := COALESCE(old_json, '{}'::jsonb);
  v_new JSONB := COALESCE(new_json, '{}'::jsonb);
  v_result JSONB;
  k TEXT;
BEGIN
  v_result := v_old || v_new;
  FOREACH k IN ARRAY COALESCE(nested, '{}'::TEXT[]) LOOP
    IF v_old ? k AND v_new ? k
       AND jsonb_typeof(v_old -> k) = 'object'
       AND jsonb_typeof(v_new -> k) = 'object' THEN
      v_result := jsonb_set(v_result, ARRAY[k], (v_old -> k) || (v_new -> k));
    END IF;
  END LOOP;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ────────────────────────────────────────────────────────────────────────────
-- upsert_score_group: write one group of keys, atomically
-- ────────────────────────────────────────────────────────────────────────────
-- p_raw / p_metrics carry ONLY the keys this save owns. Everything else in the
-- row is left exactly as it was, whoever wrote it.
--
-- INSERT ... ON CONFLICT DO UPDATE evaluates the merge against the current row
-- while holding its lock, so two teachers saving the same student at the same
-- moment serialise rather than race. The BEFORE UPDATE merge trigger from
-- 20260306 still runs afterwards; it is a no-op here, because the value this
-- function computes is already a superset of the old row for the keys it
-- touches.

CREATE OR REPLACE FUNCTION upsert_score_group(
  p_level_test_id UUID,
  p_student_id UUID,
  p_raw JSONB,
  p_metrics JSONB DEFAULT '{}'::jsonb,
  p_nested_keys TEXT[] DEFAULT '{}',
  p_previous_class TEXT DEFAULT NULL,
  p_entered_by UUID DEFAULT NULL,
  -- Grade 1 caches its composite on the row. Null leaves whatever is there,
  -- so a save that only carries half the record does not have to guess.
  p_composite_index NUMERIC DEFAULT NULL,
  p_composite_band TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO level_test_scores (
    level_test_id, student_id, raw_scores, calculated_metrics,
    composite_index, composite_band, previous_class, entered_by, entered_at
  ) VALUES (
    p_level_test_id, p_student_id,
    COALESCE(p_raw, '{}'::jsonb), COALESCE(p_metrics, '{}'::jsonb),
    p_composite_index, p_composite_band,
    p_previous_class, p_entered_by, now()
  )
  ON CONFLICT (level_test_id, student_id) DO UPDATE SET
    raw_scores = merge_score_json(level_test_scores.raw_scores, p_raw, p_nested_keys),
    calculated_metrics = COALESCE(level_test_scores.calculated_metrics, '{}'::jsonb)
                         || COALESCE(p_metrics, '{}'::jsonb),
    composite_index = COALESCE(p_composite_index, level_test_scores.composite_index),
    composite_band = COALESCE(p_composite_band, level_test_scores.composite_band),
    previous_class = COALESCE(p_previous_class, level_test_scores.previous_class),
    entered_by = COALESCE(p_entered_by, level_test_scores.entered_by),
    entered_at = now();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION merge_score_json(JSONB, JSONB, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION upsert_score_group(UUID, UUID, JSONB, JSONB, TEXT[], TEXT, UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;


-- ────────────────────────────────────────────────────────────────────────────
-- clear_score_keys: drop one half of a record without touching the other
-- ────────────────────────────────────────────────────────────────────────────
-- Clearing used to be a DELETE followed by an INSERT of the keys the client
-- wanted to keep, issued as two separate requests from the browser. Two
-- problems, both of which bite once a student's paper is marked by two people:
-- the row simply does not exist between the two requests, and the keys that
-- come back are whatever that teacher's screen happened to be holding, not
-- what is actually on the row.
--
-- Doing it here fixes both. The kept keys are read from the row itself under
-- FOR UPDATE, and the delete and re-insert are one transaction, so a
-- concurrent save either lands entirely before it or blocks on the unique
-- index and lands entirely after.
--
-- Delete-and-reinsert rather than a subtractive UPDATE because the BEFORE
-- UPDATE merge trigger from 20260306 would put the removed keys straight back
-- (it computes OLD.raw_scores || NEW.raw_scores). INSERT does not fire it.

CREATE OR REPLACE FUNCTION clear_score_keys(
  p_level_test_id UUID,
  p_student_id UUID,
  p_raw_keys TEXT[],
  p_calc_keys TEXT[] DEFAULT '{}',
  -- Grade 1 names its halves by prefix (`o_`, `w_`) rather than by a fixed
  -- list. Matching here rather than in the browser means the keys removed are
  -- the ones actually on the row, not the ones one teacher's screen knows about.
  p_raw_prefixes TEXT[] DEFAULT '{}'
) RETURNS VOID AS $$
DECLARE
  v_raw JSONB;
  v_calc JSONB;
  v_prev TEXT;
  v_entered UUID;
  v_composite NUMERIC;
  v_band TEXT;
  k TEXT;
  pfx TEXT;
BEGIN
  SELECT raw_scores, calculated_metrics, previous_class, entered_by,
         composite_index, composite_band
    INTO v_raw, v_calc, v_prev, v_entered, v_composite, v_band
  FROM level_test_scores
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN; END IF;

  v_raw  := COALESCE(v_raw, '{}'::jsonb)  - COALESCE(p_raw_keys, '{}'::TEXT[]);
  v_calc := COALESCE(v_calc, '{}'::jsonb) - COALESCE(p_calc_keys, '{}'::TEXT[]);

  FOREACH pfx IN ARRAY COALESCE(p_raw_prefixes, '{}'::TEXT[]) LOOP
    FOR k IN SELECT jsonb_object_keys(v_raw) LOOP
      IF k LIKE pfx || '%' THEN v_raw := v_raw - k; END IF;
    END LOOP;
  END LOOP;

  DELETE FROM level_test_scores
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  -- Nothing left worth a row. The history trigger has the old one.
  IF v_raw = '{}'::jsonb THEN RETURN; END IF;

  INSERT INTO level_test_scores (
    level_test_id, student_id, raw_scores, calculated_metrics,
    composite_index, composite_band, previous_class, entered_by, entered_at
  ) VALUES (
    p_level_test_id, p_student_id, v_raw, v_calc,
    v_composite, v_band, v_prev, v_entered, now()
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION clear_score_keys(UUID, UUID, TEXT[], TEXT[], TEXT[]) TO anon, authenticated, service_role;
