-- Fall 2025 Grade Averages Import - Part 2/2 (G4-G5)
-- Source: Fall_2025_Grade_Averages.xlsx (159 students)

DO $$
DECLARE v_sem_id UUID; v_sid UUID; v_cnt INT; v_matched INT := 0; v_skipped INT := 0; v_inserted INT := 0;
BEGIN
  SELECT id INTO v_sem_id FROM semesters WHERE academic_year = '2025-2026' AND type IN ('fall_final','fall') ORDER BY CASE type WHEN 'fall_final' THEN 1 WHEN 'fall' THEN 2 END LIMIT 1;
  IF v_sem_id IS NULL THEN RAISE EXCEPTION 'No Fall 2025 semester. Run Part 1 first.'; END IF;

  -- [1] Kim Ji Yoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ji Yoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ji Yoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ji Yoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [2] Kang Ju Ahn (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Ju Ahn' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Ju Ahn' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Ju Ahn (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [3] Moon Woo Jin (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Moon Woo Jin' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Moon Woo Jin' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Moon Woo Jin (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [4] Park Seon Woo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seon Woo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seon Woo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 98.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 95.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seon Woo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [5] Kim Gyul Yi (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Gyul Yi' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Gyul Yi' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 75.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Gyul Yi (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [6] Lee Seong Hoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Seong Hoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Seong Hoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 98.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 65.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Seong Hoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [7] Yang Si Wan (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yang Si Wan' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yang Si Wan' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 75.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yang Si Wan (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [8] Lee Si Yoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Si Yoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Si Yoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 58.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 62.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Si Yoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [9] Cho Hae Yool (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cho Hae Yool' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cho Hae Yool' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cho Hae Yool (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [10] Kwak Yi Roon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwak Yi Roon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwak Yi Roon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwak Yi Roon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [11] Kang Min Jae (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Min Jae' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Min Jae' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 89.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Min Jae (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [12] Song Ah Rin (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Song Ah Rin' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Song Ah Rin' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Song Ah Rin (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [13] Kim Gwan Woo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Gwan Woo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Gwan Woo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Gwan Woo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [14] Kim Min Jae (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Min Jae' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Min Jae' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Min Jae (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [15] Park Seo Eun (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seo Eun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seo Eun' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seo Eun (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [16] Lee Kang Hee (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Kang Hee' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Kang Hee' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Kang Hee (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [17] Lee Su Ahn (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Su Ahn' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Su Ahn' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Su Ahn (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [18] Kwak Do Jin (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwak Do Jin' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwak Do Jin' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwak Do Jin (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [19] Jo Se Min (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jo Se Min' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jo Se Min' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jo Se Min (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [20] Park Seung Ah (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seung Ah' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seung Ah' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seung Ah (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [21] Park Si Yeon (Lumi) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Si Yeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Si Yeon' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Lumi' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Lumi' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Si Yeon (Lumi) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [22] Choi Da Min (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Da Min' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Da Min' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Da Min (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [23] Cheon I Jun (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cheon I Jun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cheon I Jun' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cheon I Jun (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [24] Kim Juhyeon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Juhyeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Juhyeon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 68.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 66.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Juhyeon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [25] Park So Eun (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park So Eun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park So Eun' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 38.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 38.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 50.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 46.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 29.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park So Eun (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [26] Oh Seungwoo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Oh Seungwoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Oh Seungwoo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Oh Seungwoo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [27] Lee Raeun (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Raeun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Raeun' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Raeun (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [28] Kim Luhan (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Luhan' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Luhan' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 70.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 70.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Luhan (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [29] Park Soyoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Soyoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Soyoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Soyoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [30] Yoon Seongkyeong (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Seongkyeong' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Seongkyeong' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Seongkyeong (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [31] Kim Sua (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Sua' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Sua' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 64.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Sua (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [32] Kim Ah hyeon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ah hyeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ah hyeon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ah hyeon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [33] Myeong Jihoo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Myeong Jihoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Myeong Jihoo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 64.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 60.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 55.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 54.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 54.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Myeong Jihoo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [34] Lee Siwoo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Siwoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Siwoo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Siwoo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [35] Im Juwon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Im Juwon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Im Juwon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 96.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Im Juwon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [36] Kim Byeolha (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Byeolha' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Byeolha' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 55.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 55.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Byeolha (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [37] Park Jeong Hyeon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Jeong Hyeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Jeong Hyeon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 71.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 71.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Jeong Hyeon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [38] Ok Ha On (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ok Ha On' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ok Ha On' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ok Ha On (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [39] Lee Hyun Jun (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Hyun Jun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Hyun Jun' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 75.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Hyun Jun (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [40] Lee Se Yoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Se Yoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Se Yoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Se Yoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [41] Lee Wu Rim (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Wu Rim' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Wu Rim' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Wu Rim (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [42] Jeong Yoon Jae (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Yoon Jae' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Yoon Jae' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Yoon Jae (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [43] Jeong Ji Yoo (Jason) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Ji Yoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Ji Yoo' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jason' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jason' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Ji Yoo (Jason) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [44] Kim Ji Hong (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ji Hong' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ji Hong' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ji Hong (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [45] Park Ki Ryang (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ki Ryang' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ki Ryang' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ki Ryang (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [46] Shin Seo Yoo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shin Seo Yoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shin Seo Yoo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shin Seo Yoo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [47] Jung Yoon Song (Daisy) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jung Yoon Song' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jung Yoon Song' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Daisy' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Daisy' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jung Yoon Song (Daisy) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [48] Artrini Phun (Nipun) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Artrini Phun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Artrini Phun' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Nipun' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Nipun' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Artrini Phun (Nipun) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [49] Yoon Chan Min (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Chan Min' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Chan Min' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Chan Min (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [50] Shin Ha Joon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shin Ha Joon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shin Ha Joon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shin Ha Joon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [51] Yoon Sang Hoo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Sang Hoo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Sang Hoo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 76.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 68.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Sang Hoo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [52] Lee Na Geum (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Na Geum' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Na Geum' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Na Geum (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [53] Lee Yu Rim (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Yu Rim' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Yu Rim' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Yu Rim (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [54] Lee Yoona (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Yoona' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Yoona' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 96.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 97.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Yoona (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [55] Kim Zio (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Zio' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Zio' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Zio (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [56] Kim Seo Yeon (Jayana) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Seo Yeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Seo Yeon' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jayana' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jayana' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Seo Yeon (Jayana) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [57] Park Ye Jun (Chris) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ye Jun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ye Jun' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Chris' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Chris' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ye Jun (Chris) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [58] Park Jin Woo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Jin Woo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Jin Woo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Jin Woo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [59] Joo Min Seo (Henry) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Joo Min Seo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Joo Min Seo' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Henry' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Henry' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 70.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 59.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 73.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Joo Min Seo (Henry) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [60] Lee Do Gyeom (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Do Gyeom' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Do Gyeom' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 73.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 70.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Do Gyeom (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [61] Son Seok Hyeon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son Seok Hyeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son Seok Hyeon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 51.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 57.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 64.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 50.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son Seok Hyeon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [62] Jeong Chae Won (Jenny) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Chae Won' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Chae Won' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jenny' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jenny' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 55.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Chae Won (Jenny) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [63] Park Ha Eun (Sarah) (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ha Eun' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ha Eun' AND grade = 4 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Sarah' AND grade = 4 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Sarah' AND grade = 4 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 62.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ha Eun (Sarah) (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [64] Cha Si Woo (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cha Si Woo' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cha Si Woo' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cha Si Woo (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [65] Im Jee Won (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Im Jee Won' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Im Jee Won' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 59.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Im Jee Won (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [66] Jung Ha Jin (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jung Ha Jin' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jung Ha Jin' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 55.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jung Ha Jin (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [67] Han Yu Ju (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Han Yu Ju' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Han Yu Ju' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Han Yu Ju (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [68] Hwang Jun Beom (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Hwang Jun Beom' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Hwang Jun Beom' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 46.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Hwang Jun Beom (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [69] Kang Ki Yom (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Ki Yom' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Ki Yom' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 46.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Ki Yom (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [70] Park Bo Kwon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Bo Kwon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Bo Kwon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Bo Kwon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [71] Shim Ji Wan (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shim Ji Wan' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shim Ji Wan' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 63.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 60.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shim Ji Wan (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [72] Lee Seo Yoon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Seo Yoon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Seo Yoon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Seo Yoon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [73] Kang Ha Rin (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Ha Rin' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Ha Rin' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 37.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 37.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 71.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 50.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Ha Rin (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [74] Park Hye Won (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Hye Won' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Hye Won' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 60.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 73.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 33.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 33.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Hye Won (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [75] Song Chae Yeon (G4)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Song Chae Yeon' AND grade = 4 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Song Chae Yeon' AND grade = 4 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Song Chae Yeon (G4)'; v_skipped := v_skipped + 1;
  END IF;

  -- [76] Bae Hyeon Woo (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Bae Hyeon Woo' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Bae Hyeon Woo' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Bae Hyeon Woo (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [77] Eom Seon Yool (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Eom Seon Yool' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Eom Seon Yool' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Eom Seon Yool (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [78] Seo Ha Rin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Ha Rin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Ha Rin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Ha Rin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [79] Eom Yunseong (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Eom Yunseong' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Eom Yunseong' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Eom Yunseong (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [80] Ok Soo Yeon (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ok Soo Yeon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ok Soo Yeon' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ok Soo Yeon (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [81] Lee Hai (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Hai' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Hai' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Hai (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [82] Choi Hyeon Dham (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Hyeon Dham' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Hyeon Dham' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 58.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 45.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Hyeon Dham (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [83] Kang Ho (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Ho' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Ho (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [84] Kim Do Won (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Do Won' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Do Won' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 0.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 0.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Do Won (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [85] Kim Se Jong (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Se Jong' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Se Jong' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 98.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 62.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Se Jong (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [86] Shin Yu Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shin Yu Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shin Yu Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 52.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shin Yu Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [87] Lee Si Eun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Si Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Si Eun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Si Eun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [88] Son Yeo Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son Yeo Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son Yeo Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 92.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son Yeo Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [89] Lee Ju Won (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ju Won' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ju Won' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ju Won (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [90] Jeong Ha Rin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Ha Rin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Ha Rin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 69.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 70.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 71.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Ha Rin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [91] Kwon Min Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwon Min Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwon Min Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwon Min Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [92] Kim Chan Yool (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Chan Yool' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Chan Yool' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Chan Yool (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [93] Lee Seung Ha (Evan) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Seung Ha' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Seung Ha' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Evan' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Evan' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Seung Ha (Evan) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [94] Kang Seung Ha (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Seung Ha' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Seung Ha' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Seung Ha (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [95] Kim Gyu Bin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Gyu Bin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Gyu Bin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Gyu Bin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [96] Cho Ha Ni (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cho Ha Ni' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cho Ha Ni' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 69.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cho Ha Ni (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [97] Kang Woong (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Woong' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Woong' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Woong (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [98] Park Seo Hyeon (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seo Hyeon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seo Hyeon' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seo Hyeon (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [99] Cho Yoo Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cho Yoo Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cho Yoo Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cho Yoo Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [100] Jo Eun Ho (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jo Eun Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jo Eun Ho' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jo Eun Ho (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [101] Jun Marcel (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jun Marcel' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jun Marcel' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 69.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 46.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jun Marcel (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [102] Yang Seul Chan (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yang Seul Chan' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yang Seul Chan' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yang Seul Chan (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [103] Min Junseo (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Min Junseo' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Min Junseo' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Min Junseo (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [104] Park Ra On (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ra On' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ra On' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ra On (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [105] Seol Ni Yul (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seol Ni Yul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seol Ni Yul' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 69.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seol Ni Yul (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [106] Seo Ah Rim (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Ah Rim' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Ah Rim' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Ah Rim (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [107] An Jeongmin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'An Jeongmin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'An Jeongmin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 51.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 42.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 42.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: An Jeongmin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [108] Yang Seojun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yang Seojun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yang Seojun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yang Seojun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [109] Lee Dayul (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Dayul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Dayul' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Dayul (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [110] Ha Ye eun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ha Ye eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ha Ye eun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 94.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ha Ye eun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [111] Kang Seungyoon (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Seungyoon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Seungyoon' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 63.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 31.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 31.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Seungyoon (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [112] Kim Ah hyun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ah hyun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ah hyun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 64.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ah hyun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [113] Mun Jun Ho (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Mun Jun Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Mun Jun Ho' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 27.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 27.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 45.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 12.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 12.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 55.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 43.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 43.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Mun Jun Ho (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [114] Seol Nayul (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seol Nayul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seol Nayul' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 94.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seol Nayul (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [115] Jung Yeji (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jung Yeji' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jung Yeji' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jung Yeji (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [116] Kim Soyeon (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Soyeon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Soyeon' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Soyeon (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [117] Shim Ji (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shim Ji' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shim Ji' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shim Ji (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [118] Yu Seong Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yu Seong Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yu Seong Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yu Seong Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [119] Lee Yoon Hoo (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Yoon Hoo' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Yoon Hoo' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Yoon Hoo (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [120] Lee Ju Eun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ju Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ju Eun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ju Eun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [121] Choi Ha Jun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Ha Jun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Ha Jun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 79.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 65.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Ha Jun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [122] Kim Ga Eun (Emily) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ga Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ga Eun' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Emily' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Emily' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ga Eun (Emily) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [123] Kim Na Yoon (Chloe) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Na Yoon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Na Yoon' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Chloe' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Chloe' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Na Yoon (Chloe) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [124] Park Rua (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Rua' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Rua' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Rua (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [125] Park Yu Na (Elyn) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Yu Na' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Yu Na' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Elyn' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Elyn' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Yu Na (Elyn) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [126] Lee Jun Seo (Jun) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Jun Seo' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Jun Seo' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jun' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jun' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Jun Seo (Jun) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [127] Kwon Do Youl (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwon Do Youl' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwon Do Youl' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 92.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwon Do Youl (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [128] Kim Su In (Rosalia) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Su In' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Su In' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Rosalia' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Rosalia' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Su In (Rosalia) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [129] Yu Ji Ho (Leo) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yu Ji Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yu Ji Ho' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Leo' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Leo' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yu Ji Ho (Leo) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [130] Lee Ha Kyeong (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ha Kyeong' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ha Kyeong' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 79.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ha Kyeong (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [131] Jeong In Woo (Brian) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong In Woo' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong In Woo' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Brian' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Brian' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong In Woo (Brian) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [132] Kang Na Yun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Na Yun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Na Yun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Na Yun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [133] Baik Hyun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Baik Hyun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Baik Hyun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Baik Hyun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [134] Sa Yul (Noah) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Sa Yul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Sa Yul' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Noah' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Noah' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 94.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Sa Yul (Noah) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [135] Choi Goon Ho (Aiden) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Goon Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Goon Ho' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Aiden' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Aiden' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Goon Ho (Aiden) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [136] Lee Ruby (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ruby' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ruby' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ruby (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [137] Kim So Yul (Leah) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim So Yul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim So Yul' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Leah' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Leah' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim So Yul (Leah) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [138] Yu Jun Sang (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yu Jun Sang' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yu Jun Sang' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yu Jun Sang (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [139] Choi Geon Ho (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Geon Ho' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Geon Ho' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 79.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Geon Ho (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [140] Kim Yeong Eun (Luna) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Yeong Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Yeong Eun' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Luna' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Luna' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 74.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Yeong Eun (Luna) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [141] Kim Yu Ju (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Yu Ju' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Yu Ju' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Yu Ju (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [142] Yoon Seo Eun (G5)
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Seo Eun' AND grade = 5 AND (english_name IS NULL OR english_name = '') AND is_active = true LIMIT 1;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Seo Eun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [143] Lee Da Yun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Da Yun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Da Yun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 98.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Da Yun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [144] Lee Seung Bhin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Seung Bhin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Seung Bhin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 69.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Seung Bhin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [145] Ha Si Hyeon (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ha Si Hyeon' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ha Si Hyeon' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 96.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 97.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ha Si Hyeon (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [146] Yoon Seo Eun (Sunny) (G5)
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Seo Eun' AND grade = 5 AND english_name ILIKE '%Sunny%' AND is_active = true LIMIT 1;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Sunny' AND grade = 5 AND is_active = true LIMIT 1; END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 99.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Seo Eun (Sunny) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [147] Seo Yoon Ha (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Yoon Ha' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Yoon Ha' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 63.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Yoon Ha (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [148] Yoon Dah Jae (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Dah Jae' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Dah Jae' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Dah Jae (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [149] Lee So Yul (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee So Yul' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee So Yul' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee So Yul (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [150] Jeong Yi Jin (Lucia) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Yi Jin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Yi Jin' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Lucia' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Lucia' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 57.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Yi Jin (Lucia) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [151] Kwon Yool (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwon Yool' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwon Yool' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwon Yool (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [152] Kim Da Eun (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Da Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Da Eun' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 45.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Da Eun (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [153] Do Woo Rin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Do Woo Rin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Do Woo Rin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 59.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Do Woo Rin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [154] Kim Su Ye (Sue) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Su Ye' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Su Ye' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Sue' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Sue' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 94.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Su Ye (Sue) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [155] Son June Seong (June) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son June Seong' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son June Seong' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'June' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'June' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 96.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son June Seong (June) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [156] Kim Mi So (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Mi So' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Mi So' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Mi So (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [157] Park Soo Min (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Soo Min' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Soo Min' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 60.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Soo Min (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [158] Seo Yeo Jin (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Yeo Jin' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Yeo Jin' AND grade = 5 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 45.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 45.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 71.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 70.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Yeo Jin (G5)'; v_skipped := v_skipped + 1;
  END IF;

  -- [159] Ha Ji Eun (Bailey) (G5)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ha Ji Eun' AND grade = 5 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ha Ji Eun' AND grade = 5 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Bailey' AND grade = 5 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Bailey' AND grade = 5 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ha Ji Eun (Bailey) (G5)'; v_skipped := v_skipped + 1;
  END IF;

  RAISE NOTICE 'Part 2 done: matched=%, skipped=%, grades=%', v_matched, v_skipped, v_inserted;
END $$;