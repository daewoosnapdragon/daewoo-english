-- ============================================================================
-- BELOW-GRADE PASSAGES ON THE ORAL LEVEL TEST (GRADES 3-5)
-- ============================================================================
-- Teachers may now give a low student a passage from the grade below rather
-- than record a floor score on text the student cannot access. That reading is
-- diagnostic only: it is stored in full, but it produces no weighted CWPM, it
-- contributes nothing that placement reads, and it marks the student out of
-- contention to level up.
--
-- No schema change is needed -- calculated_metrics is JSONB and the new keys
-- ride along inside it. What DOES need changing is clear_oral_scores(), which
-- removes oral keys by an explicit allow-list. A key missing from that list
-- survives a clear, and any metric that survives is read back as if the test
-- had been scored.
--
-- Two groups of keys are added below:
--
--   1. The new below-grade keys (below_grade_passage, level_up_eligible and
--      the diagnostic_* family).
--
--   2. Keys the oral screen has been writing for some time that were never
--      added to this list: best_weighted_cwpm, best_passage_level,
--      comp_answered, comp_not_administered, phonics_max, sentence_max,
--      syllable_total, syllable_max and oral_content_version.
--
--      The first of those is the one that bites. Every consumer resolves a
--      student's oral result as
--          best_weighted_cwpm ?? weighted_cwpm ?? cwpm ?? ...
--      so a stale best_weighted_cwpm left behind by a clear kept feeding
--      placement, the class benchmark medians and the composite as though the
--      cleared test were still there. Clearing a student's oral scores now
--      actually clears them.
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_oral_scores(
  p_level_test_id UUID,
  p_student_id UUID
) RETURNS VOID AS $$
DECLARE
  v_oral_raw_keys TEXT[] := ARRAY[
    'phonics_row1','phonics_row2','phonics_row3','phonics_row4','phonics_row5',
    'syllable_1','syllable_2','syllable_3','syllable_4','syllable_5',
    'sent_1','sent_2','sent_3','sent_4','sent_5',
    'passage_level','orf_words_read','orf_errors','orf_time_seconds',
    'orf_cwpm','orf_accuracy',
    'naep','comp_1','comp_2','comp_3','comp_4','comp_5',
    'comp_not_administered',
    'passages_attempted','notes'
  ];
  v_oral_calc_keys TEXT[] := ARRAY[
    'passage_level','passage_multiplier','cwpm','weighted_cwpm',
    'best_weighted_cwpm','best_passage_level',
    'naep','naep_multiplier','accuracy_pct',
    'comp_total','comp_max','comp_answered','comp_not_administered',
    'phonics_total','phonics_max','sentence_total','sentence_max',
    'syllable_total','syllable_max',
    'oral_content_version',
    'passages_attempted','standards_baseline',
    -- Below-grade reading: the flags placement consults, and the diagnostic
    -- record kept apart from every metric that feeds it.
    'below_grade_passage','level_up_eligible',
    'diagnostic_passage_key','diagnostic_passage_grade','diagnostic_passage_level',
    'diagnostic_cwpm','diagnostic_accuracy_pct','diagnostic_naep',
    'diagnostic_comp_total','diagnostic_comp_max'
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
