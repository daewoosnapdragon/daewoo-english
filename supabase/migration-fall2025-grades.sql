-- ============================================================================
-- Migration: Import Fall 2025 semester grade averages
-- Generated from Fall_2025_Grade_Averages.xlsx
-- 
-- SAFETY FEATURES:
--   1. Requires EXACTLY ONE student match (skips if 0 or 2+)
--   2. Uses full korean_name match first (most precise)
--   3. Falls back to english_name match (for students with English names)
--   4. Logs ALL skips with reason for manual review
--   5. DRY RUN mode: set v_dry_run = true to preview without writing
--   6. Summary counts at end
--
-- HOW TO USE:
--   Step 1: Run with v_dry_run = true (line 11), review NOTICE output
--   Step 2: Fix any SKIP issues manually if needed
--   Step 3: Set v_dry_run = false and run again to actually write data
-- ============================================================================

DO $$
DECLARE
  v_sem_id UUID;
  v_student_id UUID;
  v_match_count INT;
  v_matched INT := 0;
  v_skipped INT := 0;
  v_inserted INT := 0;
  v_dry_run BOOLEAN := false;  -- SET TO true TO PREVIEW WITHOUT WRITING
BEGIN

  -- ── Find Fall 2025 semester ──
  SELECT id INTO v_sem_id FROM semesters
  WHERE academic_year = '2025-2026' AND type IN ('fall_final', 'fall')
  ORDER BY CASE type WHEN 'fall_final' THEN 1 WHEN 'fall' THEN 2 END
  LIMIT 1;

  IF v_sem_id IS NULL THEN
    RAISE EXCEPTION 'No Fall 2025 semester found. Check semesters table for academic_year=2025-2026 and type in (fall_final, fall).';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'FALL 2025 GRADE IMPORT';
  RAISE NOTICE 'dry_run = %', v_dry_run;
  RAISE NOTICE 'semester_id = %', v_sem_id;
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE '';

  -- [1] Ahn So Yun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ahn So Yun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ahn So Yun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ahn So Yun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ahn So Yun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [2] An Jeongmin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'An Jeongmin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'An Jeongmin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: An Jeongmin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: An Jeongmin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 51.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 42.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 42.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [3] Artrini Phun (Nipun) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Artrini Phun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Artrini Phun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Nipun' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Nipun' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Artrini Phun (Nipun) (G4) - % students match english_name "Nipun"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Artrini Phun (Nipun) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Artrini Phun (Nipun) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [4] Bae Hyeon Woo (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Bae Hyeon Woo' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Bae Hyeon Woo' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Bae Hyeon Woo (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Bae Hyeon Woo (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [5] Bae Si An (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Bae Si An' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Bae Si An' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Bae Si An (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Bae Si An (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [6] Bae Soo Bin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Bae Soo Bin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Bae Soo Bin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Bae Soo Bin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Bae Soo Bin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [7] Baek So Yool (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Baek So Yool' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Baek So Yool' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Baek So Yool (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Baek So Yool (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [8] Baik Hyun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Baik Hyun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Baik Hyun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Baik Hyun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Baik Hyun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [9] Bang Yeon Woo (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Bang Yeon Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Bang Yeon Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Bang Yeon Woo (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Bang Yeon Woo (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [10] Cha Hae Ju (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cha Hae Ju' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cha Hae Ju' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cha Hae Ju (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cha Hae Ju (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 70.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 71.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 65.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [11] Cha Si Woo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cha Si Woo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cha Si Woo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cha Si Woo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cha Si Woo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [12] Cheon I Jun (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cheon I Jun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cheon I Jun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cheon I Jun (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cheon I Jun (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [13] Cheon Ji Yool (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cheon Ji Yool' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cheon Ji Yool' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cheon Ji Yool (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cheon Ji Yool (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 68.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 66.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 74.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [14] Cho Ha Ni (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cho Ha Ni' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cho Ha Ni' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cho Ha Ni (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cho Ha Ni (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 69.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [15] Cho Hae Yool (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cho Hae Yool' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cho Hae Yool' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cho Hae Yool (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cho Hae Yool (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [16] Cho Haram (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cho Haram' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cho Haram' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cho Haram (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cho Haram (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 60.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 42.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 42.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [17] Cho Min (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cho Min' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cho Min' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cho Min (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cho Min (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 95.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [18] Cho Yoo Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Cho Yoo Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Cho Yoo Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Cho Yoo Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Cho Yoo Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [19] Choi Da Min (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Da Min' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Da Min' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Da Min (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Da Min (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 74.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [20] Choi Da Min (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Da Min' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Da Min' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Da Min (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Da Min (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [21] Choi Dami (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Dami' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Dami' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Dami (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Dami (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 73.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 61.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [22] Choi Eun Yu (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Eun Yu' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Eun Yu' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Eun Yu (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Eun Yu (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [23] Choi Geon Ho (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Geon Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Geon Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Geon Ho (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Geon Ho (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 79.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [24] Choi Goon Ho (Aiden) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Goon Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Goon Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Aiden' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Aiden' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Choi Goon Ho (Aiden) (G5) - % students match english_name "Aiden"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Choi Goon Ho (Aiden) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Goon Ho (Aiden) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [25] Choi Ha Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Ha Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Ha Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Ha Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Ha Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 79.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 65.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [26] Choi Hyeon Dham (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Hyeon Dham' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Hyeon Dham' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Hyeon Dham (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Hyeon Dham (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 58.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 45.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [27] Choi Jeong Yoon (Jenny) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Jeong Yoon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Jeong Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jenny' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jenny' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Choi Jeong Yoon (Jenny) (G2) - % students match english_name "Jenny"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Choi Jeong Yoon (Jenny) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Jeong Yoon (Jenny) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 92.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [28] Choi Jungbin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Jungbin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Jungbin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Jungbin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Jungbin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 73.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 46.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [29] Choi Si Won (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Si Won' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Si Won' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Si Won (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Si Won (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 98.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [30] Choi Ye Eun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Ye Eun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Ye Eun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choi Ye Eun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Ye Eun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [31] Choi Yi Sol (Steve) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choi Yi Sol' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choi Yi Sol' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Steve' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Steve' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Choi Yi Sol (Steve) (G2) - % students match english_name "Steve"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Choi Yi Sol (Steve) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choi Yi Sol (Steve) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [32] Choo Seo Wan (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Choo Seo Wan' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Choo Seo Wan' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Choo Seo Wan (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Choo Seo Wan (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [33] Do Woo Rin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Do Woo Rin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Do Woo Rin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Do Woo Rin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Do Woo Rin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 59.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [34] Eom Seon Yool (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Eom Seon Yool' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Eom Seon Yool' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Eom Seon Yool (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Eom Seon Yool (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [35] Eom Siyoon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Eom Siyoon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Eom Siyoon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Eom Siyoon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Eom Siyoon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [36] Eom Yunseong (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Eom Yunseong' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Eom Yunseong' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Eom Yunseong (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Eom Yunseong (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [37] Go Geon Woo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Go Geon Woo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Go Geon Woo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Go Geon Woo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Go Geon Woo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 62.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 70.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 17.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 17.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [38] Ha Ji Eun (Bailey) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ha Ji Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ha Ji Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Bailey' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Bailey' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Ha Ji Eun (Bailey) (G5) - % students match english_name "Bailey"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Ha Ji Eun (Bailey) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ha Ji Eun (Bailey) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [39] Ha Si Hyeon (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ha Si Hyeon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ha Si Hyeon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ha Si Hyeon (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ha Si Hyeon (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 96.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 97.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [40] Ha Ye eun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ha Ye eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ha Ye eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ha Ye eun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ha Ye eun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 94.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [41] Han So Yool (Charlotte) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Han So Yool' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Han So Yool' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Charlotte' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Charlotte' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Han So Yool (Charlotte) (G2) - % students match english_name "Charlotte"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Han So Yool (Charlotte) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Han So Yool (Charlotte) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [42] Han Yu Ju (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Han Yu Ju' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Han Yu Ju' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Han Yu Ju (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Han Yu Ju (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [43] Hong Yi Joon (Lucas) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Hong Yi Joon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Hong Yi Joon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Lucas' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Lucas' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Hong Yi Joon (Lucas) (G2) - % students match english_name "Lucas"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Hong Yi Joon (Lucas) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Hong Yi Joon (Lucas) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [44] Hwang Ah Rin (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Hwang Ah Rin' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Hwang Ah Rin' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Hwang Ah Rin (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Hwang Ah Rin (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 39.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 39.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [45] Hwang Doyoon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Hwang Doyoon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Hwang Doyoon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Hwang Doyoon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Hwang Doyoon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [46] Hwang Jun Beom (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Hwang Jun Beom' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Hwang Jun Beom' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Hwang Jun Beom (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Hwang Jun Beom (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 46.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [47] Hwang Min Yul (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Hwang Min Yul' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Hwang Min Yul' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Hwang Min Yul (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Hwang Min Yul (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [48] Im Hyeon Jun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Im Hyeon Jun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Im Hyeon Jun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Im Hyeon Jun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Im Hyeon Jun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 55.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 58.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 62.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 69.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 71.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [49] Im Jee Won (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Im Jee Won' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Im Jee Won' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Im Jee Won (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Im Jee Won (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 59.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [50] Im Juwon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Im Juwon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Im Juwon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Im Juwon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Im Juwon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 96.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [51] Im Seong Hyun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Im Seong Hyun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Im Seong Hyun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Im Seong Hyun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Im Seong Hyun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 69.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 75.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [52] Im Su Ah (Hailey) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Im Su Ah' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Im Su Ah' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Hailey' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Hailey' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Im Su Ah (Hailey) (G3) - % students match english_name "Hailey"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Im Su Ah (Hailey) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Im Su Ah (Hailey) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [53] Jang Arim (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jang Arim' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jang Arim' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jang Arim (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jang Arim (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 73.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 57.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [54] Jang Ha Ri (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jang Ha Ri' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jang Ha Ri' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jang Ha Ri (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jang Ha Ri (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [55] Jeon Ji Yoo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeon Ji Yoo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeon Ji Yoo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeon Ji Yoo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeon Ji Yoo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 69.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [56] Jeon Yoon Woo (Kai) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeon Yoon Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeon Yoon Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Kai' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Kai' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeon Yoon Woo (Kai) (G2) - % students match english_name "Kai"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeon Yoon Woo (Kai) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeon Yoon Woo (Kai) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [57] Jeong Chae Won (Jenny) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Chae Won' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Chae Won' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jenny' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jenny' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Chae Won (Jenny) (G4) - % students match english_name "Jenny"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Chae Won (Jenny) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Chae Won (Jenny) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 55.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [58] Jeong Ha Rin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Ha Rin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Ha Rin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Ha Rin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Ha Rin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 69.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 70.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 71.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [59] Jeong Ha Yool (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Ha Yool' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Ha Yool' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Ha Yool (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Ha Yool (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [60] Jeong Hae Yool (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Hae Yool' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Hae Yool' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Hae Yool (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Hae Yool (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 57.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 57.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [61] Jeong Hajun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Hajun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Hajun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Hajun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Hajun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 76.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [62] Jeong In Woo (Brian) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong In Woo' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong In Woo' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Brian' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Brian' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong In Woo (Brian) (G5) - % students match english_name "Brian"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong In Woo (Brian) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong In Woo (Brian) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [63] Jeong Ji Hoon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Ji Hoon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Ji Hoon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Ji Hoon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Ji Hoon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [64] Jeong Ji Yoo (Jason) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Ji Yoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Ji Yoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jason' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jason' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Ji Yoo (Jason) (G4) - % students match english_name "Jason"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Ji Yoo (Jason) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Ji Yoo (Jason) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [65] Jeong Seo Yoon (Lucy) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Seo Yoon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Seo Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Lucy' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Lucy' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Seo Yoon (Lucy) (G2) - % students match english_name "Lucy"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Seo Yoon (Lucy) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Seo Yoon (Lucy) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 75.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [66] Jeong Siyool (Justin) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Siyool' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Siyool' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Justin' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Justin' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Siyool (Justin) (G3) - % students match english_name "Justin"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Siyool (Justin) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Siyool (Justin) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 70.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [67] Jeong Woo Jae (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Woo Jae' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Woo Jae' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Woo Jae (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Woo Jae (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 92.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [68] Jeong Ye Won (Daisy) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Ye Won' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Ye Won' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Daisy' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Daisy' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Ye Won (Daisy) (G2) - % students match english_name "Daisy"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Ye Won (Daisy) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Ye Won (Daisy) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [69] Jeong Yi Jin (Lucia) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Yi Jin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Yi Jin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Lucia' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Lucia' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jeong Yi Jin (Lucia) (G5) - % students match english_name "Lucia"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jeong Yi Jin (Lucia) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Yi Jin (Lucia) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 57.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [70] Jeong Yoon Jae (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Yoon Jae' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Yoon Jae' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Yoon Jae (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Yoon Jae (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [71] Jeong Yu Eun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jeong Yu Eun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jeong Yu Eun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jeong Yu Eun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jeong Yu Eun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [72] Ji Su Ah (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ji Su Ah' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ji Su Ah' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ji Su Ah (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ji Su Ah (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [73] Jin Do Yun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jin Do Yun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jin Do Yun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jin Do Yun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jin Do Yun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [74] Jin Sun Woo (Jayden) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jin Sun Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jin Sun Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jayden' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jayden' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jin Sun Woo (Jayden) (G2) - % students match english_name "Jayden"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jin Sun Woo (Jayden) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jin Sun Woo (Jayden) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [75] Jin Yujun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jin Yujun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jin Yujun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jin Yujun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jin Yujun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [76] Jo Eun Ho (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jo Eun Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jo Eun Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jo Eun Ho (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jo Eun Ho (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [77] Jo Se Min (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jo Se Min' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jo Se Min' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jo Se Min (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jo Se Min (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [78] Jo Seo Yeon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jo Seo Yeon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jo Seo Yeon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jo Seo Yeon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jo Seo Yeon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [79] Jo Seung Woo (David) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jo Seung Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jo Seung Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jo Seung Woo (David) (G2) - % students match english_name "David"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jo Seung Woo (David) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jo Seung Woo (David) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 95.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [80] Joo Min Seo (Henry) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Joo Min Seo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Joo Min Seo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Henry' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Henry' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Joo Min Seo (Henry) (G4) - % students match english_name "Henry"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Joo Min Seo (Henry) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Joo Min Seo (Henry) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 70.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 59.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 73.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [81] Jun Marcel (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jun Marcel' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jun Marcel' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jun Marcel (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jun Marcel (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 69.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 46.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [82] Jung Ha Jin (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jung Ha Jin' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jung Ha Jin' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jung Ha Jin (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jung Ha Jin (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 55.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [83] Jung Yeji (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jung Yeji' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jung Yeji' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Jung Yeji (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jung Yeji (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [84] Jung Yoon Song (Daisy) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jung Yoon Song' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jung Yoon Song' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Daisy' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Daisy' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jung Yoon Song (Daisy) (G4) - % students match english_name "Daisy"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jung Yoon Song (Daisy) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jung Yoon Song (Daisy) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [85] Jung Yoon Woo (Asher) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Jung Yoon Woo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Jung Yoon Woo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Asher' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Asher' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Jung Yoon Woo (Asher) (G3) - % students match english_name "Asher"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Jung Yoon Woo (Asher) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Jung Yoon Woo (Asher) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 70.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 76.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 69.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [86] Kang Da In (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Da In' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Da In' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Da In (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Da In (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [87] Kang Ha Rin (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Ha Rin' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Ha Rin' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Ha Rin (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Ha Rin (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 37.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 37.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 71.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 50.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [88] Kang Ho (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Ho (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Ho (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [89] Kang Hyeon Gyeom (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Hyeon Gyeom' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Hyeon Gyeom' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Hyeon Gyeom (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Hyeon Gyeom (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [90] Kang Ju Ahn (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Ju Ahn' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Ju Ahn' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Ju Ahn (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Ju Ahn (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [91] Kang Ki Yom (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Ki Yom' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Ki Yom' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Ki Yom (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Ki Yom (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 46.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [92] Kang Min Jae (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Min Jae' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Min Jae' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Min Jae (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Min Jae (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 89.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [93] Kang Na Yun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Na Yun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Na Yun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Na Yun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Na Yun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [94] Kang Raon (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Raon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Raon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Raon (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Raon (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 94.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 68.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [95] Kang Seung Ha (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Seung Ha' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Seung Ha' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Seung Ha (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Seung Ha (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [96] Kang Seungyoon (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Seungyoon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Seungyoon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Seungyoon (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Seungyoon (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 63.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 31.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 31.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [97] Kang Soo Hyun (David) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Soo Hyun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Soo Hyun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kang Soo Hyun (David) (G2) - % students match english_name "David"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kang Soo Hyun (David) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Soo Hyun (David) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [98] Kang Woong (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kang Woong' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kang Woong' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kang Woong (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kang Woong (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [99] Kim Ah hyeon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ah hyeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ah hyeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ah hyeon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ah hyeon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [100] Kim Ah hyun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ah hyun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ah hyun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ah hyun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ah hyun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 64.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [101] Kim Byeolha (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Byeolha' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Byeolha' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Byeolha (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Byeolha (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 55.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 55.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [102] Kim Chae Hui (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Chae Hui' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Chae Hui' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Chae Hui (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Chae Hui (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 32.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 32.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 67.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 51.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 70.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [103] Kim Chan Yool (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Chan Yool' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Chan Yool' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Chan Yool (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Chan Yool (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [104] Kim Da Eun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Da Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Da Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Da Eun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Da Eun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 45.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [105] Kim Do Ah (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Do Ah' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Do Ah' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Do Ah (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Do Ah (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 65.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 65.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [106] Kim Do Won (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Do Won' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Do Won' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Do Won (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Do Won (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 0.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 0.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [107] Kim Ga Eun (Emily) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ga Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ga Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Emily' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Emily' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Ga Eun (Emily) (G5) - % students match english_name "Emily"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Ga Eun (Emily) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ga Eun (Emily) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [108] Kim Gwan Woo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Gwan Woo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Gwan Woo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Gwan Woo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Gwan Woo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [109] Kim Gyu Bin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Gyu Bin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Gyu Bin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Gyu Bin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Gyu Bin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [110] Kim Gyul Yi (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Gyul Yi' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Gyul Yi' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Gyul Yi (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Gyul Yi (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 75.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [111] Kim Ha Jin (Leo) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ha Jin' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ha Jin' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Leo' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Leo' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Ha Jin (Leo) (G2) - % students match english_name "Leo"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Ha Jin (Leo) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ha Jin (Leo) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 99.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 70.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 69.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 70.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
      v_inserted := v_inserted + 10;
    END IF;
  END IF;

  -- [112] Kim Ha Rin (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ha Rin' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ha Rin' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ha Rin (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ha Rin (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [113] Kim Ji Ah (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ji Ah' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ji Ah' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ji Ah (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ji Ah (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [114] Kim Ji Hong (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ji Hong' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ji Hong' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ji Hong (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ji Hong (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [115] Kim Ji Woo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ji Woo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ji Woo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ji Woo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ji Woo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [116] Kim Ji Yoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ji Yoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ji Yoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ji Yoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ji Yoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [117] Kim Jiwoo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Jiwoo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Jiwoo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Jiwoo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Jiwoo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 63.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [118] Kim Juhyeon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Juhyeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Juhyeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Juhyeon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Juhyeon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 68.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 66.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [119] Kim Luhan (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Luhan' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Luhan' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Luhan (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Luhan (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 70.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 70.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [120] Kim Mi So (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Mi So' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Mi So' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Mi So (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Mi So (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [121] Kim Min Jae (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Min Jae' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Min Jae' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Min Jae (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Min Jae (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [122] Kim Min Seo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Min Seo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Min Seo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Min Seo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Min Seo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 99.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [123] Kim Na Eun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Na Eun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Na Eun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Na Eun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Na Eun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [124] Kim Na Eun (Selena) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Na Eun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Na Eun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Selena' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Selena' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Na Eun (Selena) (G2) - % students match english_name "Selena"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Na Eun (Selena) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Na Eun (Selena) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [125] Kim Na Yoon (Chloe) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Na Yoon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Na Yoon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Chloe' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Chloe' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Na Yoon (Chloe) (G5) - % students match english_name "Chloe"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Na Yoon (Chloe) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Na Yoon (Chloe) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [126] Kim Ra Eun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ra Eun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ra Eun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Ra Eun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ra Eun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [127] Kim Ro Yi (Roy) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ro Yi' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ro Yi' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Roy' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Roy' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Ro Yi (Roy) (G2) - % students match english_name "Roy"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Ro Yi (Roy) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ro Yi (Roy) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [128] Kim Ru Hee (Max) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Ru Hee' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Ru Hee' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Max' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Max' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Ru Hee (Max) (G2) - % students match english_name "Max"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Ru Hee (Max) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Ru Hee (Max) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [129] Kim Rua (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Rua' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Rua' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Rua (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Rua (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [130] Kim Se Jong (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Se Jong' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Se Jong' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Se Jong (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Se Jong (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 98.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 62.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [131] Kim Seo Woo (Olivia) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Seo Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Seo Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Olivia' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Olivia' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Seo Woo (Olivia) (G2) - % students match english_name "Olivia"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Seo Woo (Olivia) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Seo Woo (Olivia) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [132] Kim Seo Yeon (Jayana) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Seo Yeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Seo Yeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jayana' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jayana' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Seo Yeon (Jayana) (G4) - % students match english_name "Jayana"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Seo Yeon (Jayana) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Seo Yeon (Jayana) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [133] Kim Seo Yoon (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Seo Yoon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Seo Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Seo Yoon (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Seo Yoon (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 75.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 57.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [134] Kim Seojun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Seojun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Seojun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Seojun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Seojun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 70.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [135] Kim Si Myeong (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Si Myeong' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Si Myeong' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Si Myeong (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Si Myeong (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [136] Kim Siha (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Siha' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Siha' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Siha (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Siha (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [137] Kim So Yul (Leah) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim So Yul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim So Yul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Leah' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Leah' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim So Yul (Leah) (G5) - % students match english_name "Leah"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim So Yul (Leah) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim So Yul (Leah) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [138] Kim Soyeon (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Soyeon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Soyeon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Soyeon (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Soyeon (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [139] Kim Su In (Rosalia) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Su In' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Su In' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Rosalia' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Rosalia' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Su In (Rosalia) (G5) - % students match english_name "Rosalia"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Su In (Rosalia) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Su In (Rosalia) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [140] Kim Su Ye (Sue) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Su Ye' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Su Ye' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Sue' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Sue' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Su Ye (Sue) (G5) - % students match english_name "Sue"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Su Ye (Sue) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Su Ye (Sue) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 94.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [141] Kim Sua (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Sua' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Sua' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Sua (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Sua (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 64.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [142] Kim Suji (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Suji' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Suji' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Suji (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Suji (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 61.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 75.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [143] Kim Tae In (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Tae In' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Tae In' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Tae In (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Tae In (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 94.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [144] Kim Tae Rin (Emily) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Tae Rin' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Tae Rin' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Emily' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Emily' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Tae Rin (Emily) (G2) - % students match english_name "Emily"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Tae Rin (Emily) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Tae Rin (Emily) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [145] Kim Woo Bin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Woo Bin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Woo Bin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Woo Bin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Woo Bin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 69.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 73.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [146] Kim Woo Bin (Bin) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Woo Bin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Woo Bin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Bin' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Bin' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Woo Bin (Bin) (G3) - % students match english_name "Bin"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Woo Bin (Bin) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Woo Bin (Bin) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [147] Kim Yeong Eun (Luna) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Yeong Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Yeong Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Luna' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Luna' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Kim Yeong Eun (Luna) (G5) - % students match english_name "Luna"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Kim Yeong Eun (Luna) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Yeong Eun (Luna) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 74.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [148] Kim Yi Seo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Yi Seo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Yi Seo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Yi Seo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Yi Seo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 65.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 47.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 47.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [149] Kim Yu Ju (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Yu Ju' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Yu Ju' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Yu Ju (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Yu Ju (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [150] Kim Zio (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kim Zio' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kim Zio' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kim Zio (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kim Zio (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [151] Ko Eun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ko Eun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ko Eun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ko Eun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ko Eun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [152] Koo Jae Yi (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Koo Jae Yi' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Koo Jae Yi' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Koo Jae Yi (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Koo Jae Yi (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [153] Ku Haesu (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ku Haesu' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ku Haesu' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ku Haesu (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ku Haesu (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [154] Kwak Do Jin (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwak Do Jin' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwak Do Jin' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwak Do Jin (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwak Do Jin (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [155] Kwak Yi Roon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwak Yi Roon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwak Yi Roon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwak Yi Roon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwak Yi Roon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [156] Kwon Do Youl (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwon Do Youl' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwon Do Youl' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwon Do Youl (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwon Do Youl (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 92.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [157] Kwon Min Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwon Min Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwon Min Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwon Min Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwon Min Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [158] Kwon Min Seo (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwon Min Seo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwon Min Seo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwon Min Seo (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwon Min Seo (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [159] Kwon Yool (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Kwon Yool' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Kwon Yool' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Kwon Yool (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Kwon Yool (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [160] Lee Da Yun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Da Yun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Da Yun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Da Yun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Da Yun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 98.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [161] Lee Dayul (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Dayul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Dayul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Dayul (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Dayul (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [162] Lee Do Dam (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Do Dam' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Do Dam' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Do Dam (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Do Dam (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 70.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [163] Lee Do Gyeom (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Do Gyeom' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Do Gyeom' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Do Gyeom (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Do Gyeom (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 73.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 70.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [164] Lee Do Yoon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Do Yoon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Do Yoon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Do Yoon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Do Yoon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [165] Lee Dyne (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Dyne' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Dyne' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Dyne (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Dyne (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 95.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 98.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [166] Lee Eun Hoo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Eun Hoo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Eun Hoo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Eun Hoo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Eun Hoo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [167] Lee Ha Kyeong (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ha Kyeong' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ha Kyeong' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ha Kyeong (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ha Kyeong (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 79.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [168] Lee Ha Yoon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ha Yoon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ha Yoon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ha Yoon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ha Yoon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 65.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 75.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [169] Lee Hai (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Hai' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Hai' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Hai (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Hai (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [170] Lee Hyun Jun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Hyun Jun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Hyun Jun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Hyun Jun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Hyun Jun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 67.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 58.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [171] Lee Hyun Jun (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Hyun Jun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Hyun Jun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Hyun Jun (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Hyun Jun (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 75.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [172] Lee Jey (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Jey' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Jey' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Jey (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Jey (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 66.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 67.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [173] Lee Ji Ah (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ji Ah' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ji Ah' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ji Ah (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ji Ah (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [174] Lee Ji Ahn (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ji Ahn' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ji Ahn' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ji Ahn (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ji Ahn (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 29.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 52.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [175] Lee Ji Ahn (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ji Ahn' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ji Ahn' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ji Ahn (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ji Ahn (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 68.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [176] Lee Ji Yool (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ji Yool' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ji Yool' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ji Yool (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ji Yool (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [177] Lee Jian (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Jian' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Jian' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Jian (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Jian (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 50.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 64.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 56.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 56.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 68.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 51.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [178] Lee Ju Eun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ju Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ju Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ju Eun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ju Eun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [179] Lee Ju Won (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ju Won' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ju Won' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ju Won (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ju Won (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [180] Lee Jun Geom (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Jun Geom' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Jun Geom' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Jun Geom (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Jun Geom (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 67.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [181] Lee Jun Seo (Jun) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Jun Seo' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Jun Seo' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Jun' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Jun' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Lee Jun Seo (Jun) (G5) - % students match english_name "Jun"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Lee Jun Seo (Jun) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Jun Seo (Jun) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [182] Lee Kang Hee (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Kang Hee' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Kang Hee' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Kang Hee (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Kang Hee (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [183] Lee Mi So (Anna) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Mi So' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Mi So' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Anna' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Anna' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Lee Mi So (Anna) (G3) - % students match english_name "Anna"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Lee Mi So (Anna) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Mi So (Anna) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 99.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [184] Lee Na Geum (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Na Geum' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Na Geum' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Na Geum (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Na Geum (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 68.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [185] Lee Na Geum (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Na Geum' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Na Geum' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Na Geum (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Na Geum (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [186] Lee Raeun (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Raeun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Raeun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Raeun (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Raeun (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [187] Lee Ruby (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ruby' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ruby' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ruby (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ruby (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [188] Lee Se Yoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Se Yoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Se Yoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Se Yoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Se Yoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [189] Lee Seo Yoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Seo Yoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Seo Yoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Seo Yoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Seo Yoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [190] Lee Seong Hoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Seong Hoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Seong Hoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Seong Hoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Seong Hoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 98.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 65.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [191] Lee Seung Bhin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Seung Bhin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Seung Bhin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Seung Bhin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Seung Bhin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 69.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [192] Lee Seung Ha (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Seung Ha' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Seung Ha' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Seung Ha (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Seung Ha (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [193] Lee Seung Ha (Evan) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Seung Ha' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Seung Ha' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Evan' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Evan' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Lee Seung Ha (Evan) (G5) - % students match english_name "Evan"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Lee Seung Ha (Evan) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Seung Ha (Evan) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [194] Lee Si Eun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Si Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Si Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Si Eun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Si Eun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [195] Lee Si Yoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Si Yoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Si Yoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Si Yoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Si Yoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 58.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 62.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [196] Lee Siwoo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Siwoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Siwoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Siwoo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Siwoo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [197] Lee So Yul (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee So Yul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee So Yul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee So Yul (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee So Yul (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [198] Lee Su Ahn (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Su Ahn' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Su Ahn' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Su Ahn (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Su Ahn (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [199] Lee Tae Eun (Tiana) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Tae Eun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Tae Eun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Tiana' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Tiana' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Lee Tae Eun (Tiana) (G2) - % students match english_name "Tiana"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Lee Tae Eun (Tiana) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Tae Eun (Tiana) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [200] Lee Tae In (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Tae In' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Tae In' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Tae In (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Tae In (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [201] Lee Tae Joon (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Tae Joon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Tae Joon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Tae Joon (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Tae Joon (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 56.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 56.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 63.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [202] Lee Wu Rim (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Wu Rim' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Wu Rim' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Wu Rim (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Wu Rim (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [203] Lee Ye Rin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Ye Rin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Ye Rin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Ye Rin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Ye Rin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [204] Lee Yoon Hoo (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Yoon Hoo' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Yoon Hoo' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Yoon Hoo (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Yoon Hoo (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [205] Lee Yoona (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Yoona' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Yoona' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Yoona (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Yoona (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 96.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 97.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [206] Lee Yu Rim (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Yu Rim' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Yu Rim' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Yu Rim (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Yu Rim (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 93.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [207] Lee Yuan (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lee Yuan' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lee Yuan' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lee Yuan (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lee Yuan (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 64.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [208] Lim Seryeoung (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Lim Seryeoung' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Lim Seryeoung' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Lim Seryeoung (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Lim Seryeoung (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 67.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 73.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [209] Min Junseo (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Min Junseo' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Min Junseo' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Min Junseo (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Min Junseo (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 74.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [210] Moon Ki Tae (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Moon Ki Tae' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Moon Ki Tae' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Moon Ki Tae (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Moon Ki Tae (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [211] Moon Woo Jin (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Moon Woo Jin' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Moon Woo Jin' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Moon Woo Jin (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Moon Woo Jin (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [212] Mun Jun Ho (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Mun Jun Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Mun Jun Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Mun Jun Ho (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Mun Jun Ho (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 27.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 27.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 45.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 12.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 12.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 55.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 43.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 43.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [213] Myeong Jihoo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Myeong Jihoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Myeong Jihoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Myeong Jihoo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Myeong Jihoo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 64.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 60.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 55.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 54.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 54.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [214] Oh Seungwoo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Oh Seungwoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Oh Seungwoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Oh Seungwoo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Oh Seungwoo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [215] Ok Ha On (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ok Ha On' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ok Ha On' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ok Ha On (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ok Ha On (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [216] Ok Soo Yeon (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ok Soo Yeon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ok Soo Yeon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ok Soo Yeon (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ok Soo Yeon (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [217] Ok Woo Jin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ok Woo Jin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ok Woo Jin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ok Woo Jin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ok Woo Jin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [218] Park Aurora (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Aurora' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Aurora' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Aurora (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Aurora (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 74.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 71.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [219] Park Bo Kwon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Bo Kwon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Bo Kwon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Bo Kwon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Bo Kwon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [220] Park Chaeyeong (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Chaeyeong' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Chaeyeong' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Chaeyeong (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Chaeyeong (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [221] Park Geon Woo (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Geon Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Geon Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Geon Woo (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Geon Woo (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 61.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [222] Park Ha Eun (Sarah) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ha Eun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ha Eun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Sarah' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Sarah' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Ha Eun (Sarah) (G4) - % students match english_name "Sarah"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Ha Eun (Sarah) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ha Eun (Sarah) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 62.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [223] Park Han Bom (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Han Bom' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Han Bom' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Han Bom (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Han Bom (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 71.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 69.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [224] Park Hye Won (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Hye Won' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Hye Won' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Hye Won (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Hye Won (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 60.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 73.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 33.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 33.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [225] Park Hyun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Hyun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Hyun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Hyun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Hyun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 29.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 51.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 46.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 69.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 73.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [226] Park Jeong Hyeon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Jeong Hyeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Jeong Hyeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Jeong Hyeon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Jeong Hyeon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 71.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 71.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [227] Park Jin Woo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Jin Woo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Jin Woo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Jin Woo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Jin Woo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [228] Park Ju Yi (Julie) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ju Yi' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ju Yi' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Julie' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Julie' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Ju Yi (Julie) (G2) - % students match english_name "Julie"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Ju Yi (Julie) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ju Yi (Julie) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 67.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [229] Park Jun Woo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Jun Woo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Jun Woo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Jun Woo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Jun Woo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [230] Park Ki Ryang (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ki Ryang' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ki Ryang' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Ki Ryang (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ki Ryang (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 91.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [231] Park Minchan (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Minchan' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Minchan' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Minchan (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Minchan (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 53.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [232] Park Ra On (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ra On' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ra On' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Ra On (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ra On (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 76.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [233] Park Rah On (Leon) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Rah On' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Rah On' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Leon' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Leon' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Rah On (Leon) (G3) - % students match english_name "Leon"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Rah On (Leon) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Rah On (Leon) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 52.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 66.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 73.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 53.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [234] Park Rua (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Rua' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Rua' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Rua (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Rua (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [235] Park Seo Eun (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seo Eun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seo Eun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Seo Eun (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seo Eun (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [236] Park Seo Eun (Lisa) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seo Eun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seo Eun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Lisa' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Lisa' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Seo Eun (Lisa) (G3) - % students match english_name "Lisa"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Seo Eun (Lisa) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seo Eun (Lisa) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 97.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 96.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [237] Park Seo Hyeon (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seo Hyeon' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seo Hyeon' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Seo Hyeon (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seo Hyeon (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [238] Park Seo Jin (Eden) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seo Jin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seo Jin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Eden' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Eden' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Seo Jin (Eden) (G3) - % students match english_name "Eden"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Seo Jin (Eden) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seo Jin (Eden) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [239] Park Seo Joon (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seo Joon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seo Joon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Seo Joon (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seo Joon (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [240] Park Seon Woo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seon Woo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seon Woo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Seon Woo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seon Woo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 98.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 95.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [241] Park Seung Ah (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Seung Ah' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Seung Ah' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Seung Ah (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Seung Ah (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 85.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [242] Park Si Yeon (Lumi) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Si Yeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Si Yeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Lumi' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Lumi' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Si Yeon (Lumi) (G4) - % students match english_name "Lumi"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Si Yeon (Lumi) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Si Yeon (Lumi) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [243] Park So Eun (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park So Eun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park So Eun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park So Eun (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park So Eun (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 38.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 38.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 50.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 46.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 29.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [244] Park Soo Min (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Soo Min' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Soo Min' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Soo Min (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Soo Min (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 60.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [245] Park Soyoon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Soyoon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Soyoon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Soyoon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Soyoon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 67.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [246] Park Suhyeon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Suhyeon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Suhyeon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Suhyeon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Suhyeon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 67.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [247] Park Won (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Won' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Won' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Won (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Won (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 99.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 95.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 94.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [248] Park Ye Ju (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ye Ju' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ye Ju' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Park Ye Ju (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ye Ju (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [249] Park Ye Jun (Chris) (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Ye Jun' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Ye Jun' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Chris' AND grade = 4 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Chris' AND grade = 4 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Ye Jun (Chris) (G4) - % students match english_name "Chris"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Ye Jun (Chris) (G4)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Ye Jun (Chris) (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [250] Park Yu Na (Elyn) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Park Yu Na' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Park Yu Na' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Elyn' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Elyn' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Park Yu Na (Elyn) (G5) - % students match english_name "Elyn"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Park Yu Na (Elyn) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Park Yu Na (Elyn) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [251] Ryu Jian (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Ryu Jian' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Ryu Jian' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Ryu Jian (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Ryu Jian (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 67.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [252] Sa Yul (Noah) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Sa Yul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Sa Yul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Noah' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Noah' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Sa Yul (Noah) (G5) - % students match english_name "Noah"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Sa Yul (Noah) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Sa Yul (Noah) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 94.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 94.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [253] Seo Ah Rim (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Ah Rim' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Ah Rim' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Ah Rim (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Ah Rim (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 79.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [254] Seo Ah Yoon (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Ah Yoon' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Ah Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Ah Yoon (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Ah Yoon (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 72.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 96.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [255] Seo Bokyul (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Bokyul' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Bokyul' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Bokyul (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Bokyul (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 54.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 54.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 59.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 69.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 40.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 40.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [256] Seo Ha Rin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Ha Rin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Ha Rin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Ha Rin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Ha Rin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [257] Seo Ji Ahn (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Ji Ahn' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Ji Ahn' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Ji Ahn (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Ji Ahn (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [258] Seo Junhoo (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Junhoo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Junhoo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Junhoo (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Junhoo (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 63.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 67.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [259] Seo Yeo Jin (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Yeo Jin' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Yeo Jin' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Yeo Jin (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Yeo Jin (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 45.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 71.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 70.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [260] Seo Yoon Ha (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seo Yoon Ha' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seo Yoon Ha' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seo Yoon Ha (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seo Yoon Ha (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 63.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [261] Seol Nayul (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seol Nayul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seol Nayul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seol Nayul (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seol Nayul (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 94.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [262] Seol Ni Yul (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seol Ni Yul' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seol Ni Yul' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seol Ni Yul (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seol Ni Yul (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 69.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 86.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [263] Seong Soo Ho (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Seong Soo Ho' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Seong Soo Ho' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Seong Soo Ho (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Seong Soo Ho (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [264] Shim Ha Yun (Honey) (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shim Ha Yun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shim Ha Yun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Honey' AND grade = 3 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Honey' AND grade = 3 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Shim Ha Yun (Honey) (G3) - % students match english_name "Honey"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Shim Ha Yun (Honey) (G3)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shim Ha Yun (Honey) (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 66.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [265] Shim Ji (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shim Ji' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shim Ji' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shim Ji (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shim Ji (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [266] Shim Ji Wan (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shim Ji Wan' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shim Ji Wan' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shim Ji Wan (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shim Ji Wan (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 63.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 60.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [267] Shin Ha Joon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shin Ha Joon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shin Ha Joon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shin Ha Joon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shin Ha Joon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [268] Shin Seo Yoo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shin Seo Yoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shin Seo Yoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shin Seo Yoo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shin Seo Yoo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 92.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [269] Shin Yu Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shin Yu Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shin Yu Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shin Yu Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shin Yu Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 94.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 88.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 52.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [270] Shin Yuchan (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Shin Yuchan' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Shin Yuchan' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Shin Yuchan (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Shin Yuchan (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 69.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 58.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 76.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [271] Si Hoo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Si Hoo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Si Hoo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Si Hoo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Si Hoo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [272] Si Hyeon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Si Hyeon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Si Hyeon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Si Hyeon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Si Hyeon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 44.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 44.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 66.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 50.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 69.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.3;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [273] Son Jua (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son Jua' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son Jua' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Son Jua (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son Jua (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 96.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [274] Son June Seong (June) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son June Seong' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son June Seong' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'June' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'June' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Son June Seong (June) (G5) - % students match english_name "June"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Son June Seong (June) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son June Seong (June) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 94.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 82.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [275] Son Min Jun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son Min Jun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son Min Jun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Son Min Jun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son Min Jun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 91.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [276] Son Seo Rin (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son Seo Rin' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son Seo Rin' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Son Seo Rin (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son Seo Rin (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 64.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 73.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 77.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [277] Son Seok Hyeon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son Seok Hyeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son Seok Hyeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Son Seok Hyeon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son Seok Hyeon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 51.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 57.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 64.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 50.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [278] Son Yeo Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Son Yeo Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Son Yeo Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Son Yeo Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Son Yeo Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 92.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 93.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [279] Song Ah Rin (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Song Ah Rin' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Song Ah Rin' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Song Ah Rin (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Song Ah Rin (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 92.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [280] Song Chae Yeon (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Song Chae Yeon' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Song Chae Yeon' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Song Chae Yeon (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Song Chae Yeon (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [281] Song Seung Woo (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Song Seung Woo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Song Seung Woo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Song Seung Woo (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Song Seung Woo (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 89.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [282] Song Yena (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Song Yena' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Song Yena' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Song Yena (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Song Yena (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 64.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 80.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 55.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [283] Tae Hyeon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Tae Hyeon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Tae Hyeon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Tae Hyeon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Tae Hyeon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 62.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 81.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 93.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [284] Wang Jubi (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Wang Jubi' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Wang Jubi' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Wang Jubi (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Wang Jubi (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 77.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 69.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [285] Whang Hyeon Seo (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Whang Hyeon Seo' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Whang Hyeon Seo' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Whang Hyeon Seo (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Whang Hyeon Seo (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 80.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [286] Won Seo Jin (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Won Seo Jin' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Won Seo Jin' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Won Seo Jin (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Won Seo Jin (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 73.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 53.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.4;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [287] Won Seo Jun (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Won Seo Jun' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Won Seo Jun' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Won Seo Jun (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Won Seo Jun (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 78.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 75.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 90.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [288] Yang Seojun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yang Seojun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yang Seojun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yang Seojun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yang Seojun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 98.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [289] Yang Seul Chan (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yang Seul Chan' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yang Seul Chan' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yang Seul Chan (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yang Seul Chan (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 81.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 86.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [290] Yang Si Wan (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yang Si Wan' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yang Si Wan' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yang Si Wan (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yang Si Wan (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 75.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 90.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [291] Yeo Ul (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yeo Ul' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yeo Ul' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yeo Ul (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yeo Ul (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 88.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 80.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [292] Yoo Bi (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoo Bi' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoo Bi' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoo Bi (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoo Bi (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 91.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 31.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 31.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 87.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [293] Yoo Joo Hae (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoo Joo Hae' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoo Joo Hae' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoo Joo Hae (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoo Joo Hae (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 61.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 59.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 55.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 65.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [294] Yoo Su Min (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoo Su Min' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoo Su Min' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoo Su Min (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoo Su Min (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 58.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 61.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 78.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [295] Yoon Chan Min (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Chan Min' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Chan Min' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Chan Min (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Chan Min (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 82.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 75.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 76.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 76.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 84.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [296] Yoon Dah Jae (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Dah Jae' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Dah Jae' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Dah Jae (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Dah Jae (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 84.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 89.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [297] Yoon Sang Hoo (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Sang Hoo' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Sang Hoo' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Sang Hoo (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Sang Hoo (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 78.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 76.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 68.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [298] Yoon Seo Eun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Seo Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Seo Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Seo Eun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Seo Eun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 97.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 96.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 94.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 96.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [299] Yoon Seo Eun (Sunny) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Seo Eun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Seo Eun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Sunny' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Sunny' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Yoon Seo Eun (Sunny) (G5) - % students match english_name "Sunny"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Yoon Seo Eun (Sunny) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Seo Eun (Sunny) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 97.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 95.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 99.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [300] Yoon Seo Hoo (Kevin) (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Seo Hoo' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Seo Hoo' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Kevin' AND grade = 2 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Kevin' AND grade = 2 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Yoon Seo Hoo (Kevin) (G2) - % students match english_name "Kevin"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Yoon Seo Hoo (Kevin) (G2)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Seo Hoo (Kevin) (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 79.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 87.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 78.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 93.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 82.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [301] Yoon Seongkyeong (Grade 4)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Seongkyeong' AND grade = 4 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Seongkyeong' AND grade = 4 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Seongkyeong (G4)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Seongkyeong (G4) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 87.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 90.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 100.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 91.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [302] Yoon Ye Joon (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yoon Ye Joon' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yoon Ye Joon' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yoon Ye Joon (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yoon Ye Joon (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 86.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 77.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 85.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [303] Yu Ji Ho (Leo) (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yu Ji Ho' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yu Ji Ho' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    SELECT COUNT(*) INTO v_match_count FROM students WHERE english_name ILIKE 'Leo' AND grade = 5 AND is_active = true;
    IF v_match_count = 1 THEN
      SELECT id INTO v_student_id FROM students WHERE english_name ILIKE 'Leo' AND grade = 5 AND is_active = true;
    ELSIF v_match_count > 1 THEN
      RAISE NOTICE 'SKIP [MULTIPLE ENG MATCH]: Yu Ji Ho (Leo) (G5) - % students match english_name "Leo"', v_match_count;
      v_skipped := v_skipped + 1;
    ELSE
      RAISE NOTICE 'SKIP [NO MATCH]: Yu Ji Ho (Leo) (G5)', '';
      v_skipped := v_skipped + 1;
    END IF;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yu Ji Ho (Leo) (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 85.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 85.9)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 79.6)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 85.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [304] Yu Jun Sang (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yu Jun Sang' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yu Jun Sang' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yu Jun Sang (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yu Jun Sang (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 84.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 84.4)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 83.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 87.3)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 88.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [305] Yu Seong Jun (Grade 5)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yu Seong Jun' AND grade = 5 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yu Seong Jun' AND grade = 5 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yu Seong Jun (G5)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yu Seong Jun (G5) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 75.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 77.1)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.1;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 74.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 83.0)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 72.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [306] Yun Ji Sang (Grade 3)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yun Ji Sang' AND grade = 3 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yun Ji Sang' AND grade = 3 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yun Ji Sang (G3)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yun Ji Sang (G3) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 83.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 82.8)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 72.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 81.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 62.7)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.7;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  -- [307] Yun Ju Eun (Grade 2)
  v_student_id := NULL;
  v_match_count := 0;
  SELECT COUNT(*) INTO v_match_count FROM students WHERE korean_name = 'Yun Ju Eun' AND grade = 2 AND is_active = true;
  IF v_match_count = 1 THEN
    SELECT id INTO v_student_id FROM students WHERE korean_name = 'Yun Ju Eun' AND grade = 2 AND is_active = true;
  ELSIF v_match_count = 0 THEN
    RAISE NOTICE 'SKIP [NO MATCH]: Yun Ju Eun (G2)', '';
    v_skipped := v_skipped + 1;
  ELSE
    RAISE NOTICE 'SKIP [MULTIPLE EXACT]: Yun Ju Eun (G2) - % students with exact same korean_name in this grade', v_match_count;
    v_skipped := v_skipped + 1;
  END IF;
  IF v_student_id IS NOT NULL THEN
    v_matched := v_matched + 1;
    IF NOT v_dry_run THEN
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'reading', 68.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.2;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'phonics', 71.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'writing', 61.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'speaking', 88.5)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
      INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade)
      VALUES (v_student_id, v_sem_id, 'language', 75.2)
      ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.2;
      v_inserted := v_inserted + 5;
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'RESULTS';
  RAISE NOTICE '══════════════════════════════════════════════════════';
  RAISE NOTICE 'Total students in Excel:  307';
  RAISE NOTICE 'Matched to DB:            %', v_matched;
  RAISE NOTICE 'Skipped (review above):   %', v_skipped;
  RAISE NOTICE 'Grade rows written:       %', v_inserted;
  IF v_dry_run THEN
    RAISE NOTICE '';
    RAISE NOTICE '*** DRY RUN -- NO DATA WAS WRITTEN ***';
    RAISE NOTICE 'Set v_dry_run := false and run again to write.';
  END IF;
  RAISE NOTICE '══════════════════════════════════════════════════════';

END $$;