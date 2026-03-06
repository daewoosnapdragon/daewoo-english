-- ============================================================================
-- ATOMIC LEVELING SAVES: RPC functions, audit trigger, history & snapshot tables
-- ============================================================================
-- Fixes data loss caused by non-atomic read-modify-write saves in
-- OralTestEntry25, WrittenTestEntry, and Grade1ScoreEntry.
-- Each RPC uses Postgres || operator for atomic JSONB merging so oral saves
-- never touch written keys and vice versa.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. RPC: upsert_oral_scores (Grades 2-5)
-- ────────────────────────────────────────────────────────────────────────────
-- Atomically merges oral-only keys into raw_scores / calculated_metrics.
-- Written keys already in the row are never touched.

CREATE OR REPLACE FUNCTION upsert_oral_scores(
  p_level_test_id UUID,
  p_student_id UUID,
  p_oral_raw JSONB,
  p_oral_metrics JSONB,
  p_previous_class TEXT DEFAULT NULL,
  p_entered_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO level_test_scores (
    level_test_id, student_id, raw_scores, calculated_metrics,
    previous_class, entered_by, entered_at
  ) VALUES (
    p_level_test_id, p_student_id, p_oral_raw, p_oral_metrics,
    p_previous_class, p_entered_by, now()
  )
  ON CONFLICT (level_test_id, student_id) DO UPDATE SET
    raw_scores = level_test_scores.raw_scores || p_oral_raw,
    calculated_metrics = level_test_scores.calculated_metrics || p_oral_metrics,
    previous_class = COALESCE(p_previous_class, level_test_scores.previous_class),
    entered_by = COALESCE(p_entered_by, level_test_scores.entered_by),
    entered_at = now();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. RPC: upsert_written_scores (Grades 2-5)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION upsert_written_scores(
  p_level_test_id UUID,
  p_student_id UUID,
  p_written_raw JSONB,
  p_written_metrics JSONB,
  p_previous_class TEXT DEFAULT NULL,
  p_entered_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO level_test_scores (
    level_test_id, student_id, raw_scores, calculated_metrics,
    previous_class, entered_by, entered_at
  ) VALUES (
    p_level_test_id, p_student_id, p_written_raw, p_written_metrics,
    p_previous_class, p_entered_by, now()
  )
  ON CONFLICT (level_test_id, student_id) DO UPDATE SET
    raw_scores = level_test_scores.raw_scores || p_written_raw,
    calculated_metrics = level_test_scores.calculated_metrics || p_written_metrics,
    previous_class = COALESCE(p_previous_class, level_test_scores.previous_class),
    entered_by = COALESCE(p_entered_by, level_test_scores.entered_by),
    entered_at = now();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. RPC: upsert_g1_scores (Grade 1 — combined oral + written)
-- ────────────────────────────────────────────────────────────────────────────
-- Grade 1 uses o_/w_ prefixed keys. Also sets composite_index/composite_band.

CREATE OR REPLACE FUNCTION upsert_g1_scores(
  p_level_test_id UUID,
  p_student_id UUID,
  p_raw JSONB,
  p_metrics JSONB,
  p_composite_index NUMERIC DEFAULT NULL,
  p_composite_band TEXT DEFAULT NULL,
  p_previous_class TEXT DEFAULT NULL,
  p_entered_by UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO level_test_scores (
    level_test_id, student_id, raw_scores, calculated_metrics,
    composite_index, composite_band, previous_class, entered_by, entered_at
  ) VALUES (
    p_level_test_id, p_student_id, p_raw, p_metrics,
    p_composite_index, p_composite_band, p_previous_class, p_entered_by, now()
  )
  ON CONFLICT (level_test_id, student_id) DO UPDATE SET
    raw_scores = level_test_scores.raw_scores || p_raw,
    calculated_metrics = level_test_scores.calculated_metrics || p_metrics,
    composite_index = COALESCE(p_composite_index, level_test_scores.composite_index),
    composite_band = COALESCE(p_composite_band, level_test_scores.composite_band),
    previous_class = COALESCE(p_previous_class, level_test_scores.previous_class),
    entered_by = COALESCE(p_entered_by, level_test_scores.entered_by),
    entered_at = now();
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC: clear_oral_scores (Grades 2-5)
-- ────────────────────────────────────────────────────────────────────────────
-- Atomically removes oral keys using jsonb - ARRAY[]. Written keys untouched.
-- Deletes the row if nothing remains.

CREATE OR REPLACE FUNCTION clear_oral_scores(
  p_level_test_id UUID,
  p_student_id UUID
) RETURNS VOID AS $$
DECLARE
  v_oral_raw_keys TEXT[] := ARRAY[
    'phonics_row1','phonics_row2','phonics_row3','phonics_row4','phonics_row5',
    'sent_1','sent_2','sent_3','sent_4','sent_5',
    'passage_level','orf_words_read','orf_errors','orf_time_seconds',
    'orf_cwpm','orf_accuracy',
    'naep','comp_1','comp_2','comp_3','comp_4','comp_5',
    'passages_attempted','notes'
  ];
  v_oral_calc_keys TEXT[] := ARRAY[
    'passage_level','passage_multiplier','cwpm','weighted_cwpm',
    'naep','naep_multiplier','accuracy_pct',
    'comp_total','comp_max','phonics_total','sentence_total',
    'passages_attempted','standards_baseline'
  ];
  v_remaining JSONB;
BEGIN
  UPDATE level_test_scores SET
    raw_scores = raw_scores - v_oral_raw_keys,
    calculated_metrics = calculated_metrics - v_oral_calc_keys,
    entered_at = now()
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  -- Delete row if no data remains
  SELECT raw_scores INTO v_remaining
  FROM level_test_scores
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  IF v_remaining IS NOT NULL AND v_remaining = '{}'::jsonb THEN
    DELETE FROM level_test_scores
    WHERE level_test_id = p_level_test_id AND student_id = p_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPC: clear_written_scores (Grades 2-5)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clear_written_scores(
  p_level_test_id UUID,
  p_student_id UUID
) RETURNS VOID AS $$
DECLARE
  v_written_raw_keys TEXT[] := ARRAY[
    'written_answers','written_rubric','written_mc','writing'
  ];
  v_written_calc_keys TEXT[] := ARRAY[
    'written_mc_total','written_mc_max','written_mc_pct',
    'writing_total','writing_max',
    'written_domain_scores','written_standards_mastery'
  ];
  v_remaining JSONB;
BEGIN
  UPDATE level_test_scores SET
    raw_scores = raw_scores - v_written_raw_keys,
    calculated_metrics = calculated_metrics - v_written_calc_keys,
    entered_at = now()
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  SELECT raw_scores INTO v_remaining
  FROM level_test_scores
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  IF v_remaining IS NOT NULL AND v_remaining = '{}'::jsonb THEN
    DELETE FROM level_test_scores
    WHERE level_test_id = p_level_test_id AND student_id = p_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC: clear_g1_scores (Grade 1 — clear by o_/w_ prefix)
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION clear_g1_scores(
  p_level_test_id UUID,
  p_student_id UUID,
  p_prefix TEXT  -- 'o_' for oral, 'w_' for written
) RETURNS VOID AS $$
DECLARE
  v_raw JSONB;
  v_calc JSONB;
  k TEXT;
BEGIN
  SELECT raw_scores, calculated_metrics INTO v_raw, v_calc
  FROM level_test_scores
  WHERE level_test_id = p_level_test_id AND student_id = p_student_id;

  IF v_raw IS NULL THEN RETURN; END IF;

  -- Remove all keys starting with the given prefix
  FOR k IN SELECT jsonb_object_keys(v_raw) LOOP
    IF k LIKE p_prefix || '%' THEN
      v_raw = v_raw - k;
    END IF;
  END LOOP;

  -- For oral clear, also remove computed oral metrics
  IF p_prefix = 'o_' THEN
    v_calc = v_calc - ARRAY[
      'oral_score','passage_level','cwpm','weighted_cwpm',
      'comp_total','comp_max','standards_baseline'
    ];
  END IF;

  -- For written clear, remove computed written metrics
  IF p_prefix = 'w_' THEN
    v_calc = v_calc - ARRAY['written_pct'];
  END IF;

  IF v_raw = '{}'::jsonb THEN
    DELETE FROM level_test_scores
    WHERE level_test_id = p_level_test_id AND student_id = p_student_id;
  ELSE
    UPDATE level_test_scores SET
      raw_scores = v_raw,
      calculated_metrics = v_calc,
      entered_at = now()
    WHERE level_test_id = p_level_test_id AND student_id = p_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════════════════════
-- AUDIT: version history for level_test_scores
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS level_test_scores_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_test_id UUID NOT NULL,
  student_id UUID NOT NULL,
  raw_scores JSONB,
  calculated_metrics JSONB,
  composite_index NUMERIC,
  composite_band TEXT,
  previous_class TEXT,
  entered_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  change_type TEXT NOT NULL CHECK (change_type IN ('UPDATE', 'DELETE'))
);

CREATE INDEX IF NOT EXISTS idx_lts_history_lookup
  ON level_test_scores_history(level_test_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lts_history_time
  ON level_test_scores_history(changed_at);

-- Trigger function: capture OLD row before UPDATE or DELETE
CREATE OR REPLACE FUNCTION log_level_test_scores_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO level_test_scores_history (
    level_test_id, student_id, raw_scores, calculated_metrics,
    composite_index, composite_band, previous_class, entered_by, change_type
  ) VALUES (
    OLD.level_test_id, OLD.student_id, OLD.raw_scores, OLD.calculated_metrics,
    OLD.composite_index, OLD.composite_band, OLD.previous_class, OLD.entered_by,
    TG_OP
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_level_test_scores_history
  BEFORE UPDATE OR DELETE ON level_test_scores
  FOR EACH ROW EXECUTE FUNCTION log_level_test_scores_change();


-- ════════════════════════════════════════════════════════════════════════════
-- SNAPSHOTS: teacher-initiated checkpoints
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leveling_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_test_id UUID NOT NULL REFERENCES level_tests(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  label TEXT
);

CREATE INDEX IF NOT EXISTS idx_leveling_snapshots_test
  ON leveling_snapshots(level_test_id);

-- RLS policies
ALTER TABLE level_test_scores_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all reads on score history"
  ON level_test_scores_history FOR SELECT USING (true);

ALTER TABLE leveling_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on snapshots"
  ON leveling_snapshots FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════════════════════════════════
-- MERGE TRIGGER: atomic JSONB merge on upsert
-- ════════════════════════════════════════════════════════════════════════════
-- When an upsert hits the ON CONFLICT → UPDATE path, this trigger merges
-- NEW keys into OLD rather than replacing the whole column.
-- This is what prevents oral saves from clobbering written keys and vice versa.

CREATE OR REPLACE FUNCTION merge_level_test_scores()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.raw_scores = OLD.raw_scores || NEW.raw_scores;
    NEW.calculated_metrics = OLD.calculated_metrics || NEW.calculated_metrics;
    NEW.previous_class = COALESCE(NEW.previous_class, OLD.previous_class);
    NEW.entered_by = COALESCE(NEW.entered_by, OLD.entered_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_merge_level_test_scores
  BEFORE UPDATE ON level_test_scores
  FOR EACH ROW EXECUTE FUNCTION merge_level_test_scores();
