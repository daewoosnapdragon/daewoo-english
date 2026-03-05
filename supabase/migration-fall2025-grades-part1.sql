-- Fall 2025 Grade Averages Import - Part 1/2 (G2-G3)
-- Source: Fall_2025_Grade_Averages.xlsx (149 students)

DO $$
DECLARE v_sem_id UUID; v_sid UUID; v_cnt INT; v_matched INT := 0; v_skipped INT := 0; v_inserted INT := 0;
BEGIN
  SELECT id INTO v_sem_id FROM semesters WHERE academic_year = '2025-2026' AND type IN ('fall_final','fall') ORDER BY CASE type WHEN 'fall_final' THEN 1 WHEN 'fall' THEN 2 END LIMIT 1;
  IF v_sem_id IS NULL THEN INSERT INTO semesters (name,name_ko,academic_year,type,is_active) VALUES ('Fall 2025 Final','2025 가을 기말','2025-2026','fall_final',false) RETURNING id INTO v_sem_id; END IF;
  DELETE FROM semester_grades WHERE semester_id = v_sem_id;
  RAISE NOTICE 'Cleared existing grades for semester %', v_sem_id;

  -- [1] Ko Eun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ko Eun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ko Eun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ko Eun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [2] Yun Ju Eun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yun Ju Eun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yun Ju Eun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 68.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 61.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 75.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yun Ju Eun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [3] Baek So Yool (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Baek So Yool' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Baek So Yool' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Baek So Yool (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [4] Seong Soo Ho (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seong Soo Ho' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seong Soo Ho' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seong Soo Ho (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [5] Bang Yeon Woo (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Bang Yeon Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Bang Yeon Woo' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Bang Yeon Woo (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [6] Lee Tae In (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Tae In' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Tae In' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Tae In (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [7] Moon Ki Tae (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Moon Ki Tae' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Moon Ki Tae' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Moon Ki Tae (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [8] Park Geon Woo (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Geon Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Geon Woo' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 61.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Geon Woo (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [9] Seo Ah Yoon (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Ah Yoon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Ah Yoon' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 96.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Ah Yoon (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [10] Lee Tae Joon (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Tae Joon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Tae Joon' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 56.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 56.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 63.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Tae Joon (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [11] Kim Do Ah (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Do Ah' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Do Ah' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 65.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 65.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Do Ah (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [12] Yoo Bi (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoo Bi' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoo Bi' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 31.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 31.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoo Bi (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [13] Lee Yuan (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Yuan' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Yuan' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 64.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Yuan (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [14] Kim Tae In (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Tae In' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Tae In' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 94.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Tae In (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [15] Kim Na Eun (Selena) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Na Eun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Na Eun' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Selena' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Selena' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Na Eun (Selena) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [16] Kim Seo Yoon (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Seo Yoon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Seo Yoon' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 75.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 57.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Seo Yoon (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [17] Choi Jeong Yoon (Jenny) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Jeong Yoon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Jeong Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jenny' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jenny' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 92.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Jeong Yoon (Jenny) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [18] Kim Ha Jin (Leo) (G2) — NOT Snapdragon (from fix-kim-hajin-swap: Daisy)
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ha Jin' AND grade = 2 AND english_name ILIKE '%Leo%' AND english_class != 'Snapdragon' AND is_active = true LIMIT 1;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Leo' AND grade = 2 AND english_class != 'Snapdragon' AND is_active = true LIMIT 1; END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 99.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ha Jin (Leo) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [19] Jeon Yoon Woo (Kai) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeon Yoon Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeon Yoon Woo' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Kai' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Kai' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeon Yoon Woo (Kai) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [20] Hong Yi Joon (Lucas) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Hong Yi Joon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Hong Yi Joon' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Lucas' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Lucas' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 97.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Hong Yi Joon (Lucas) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [21] Kwon Min Seo (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kwon Min Seo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kwon Min Seo' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kwon Min Seo (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [22] Yoo Joo Hae (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoo Joo Hae' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoo Joo Hae' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 61.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 59.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 55.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 65.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoo Joo Hae (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [23] Lim Seryeoung (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lim Seryeoung' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lim Seryeoung' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 67.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 73.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lim Seryeoung (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [24] Lee Tae Eun (Tiana) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Tae Eun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Tae Eun' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Tiana' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Tiana' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Tae Eun (Tiana) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [25] Jeong Hae Yool (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Hae Yool' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Hae Yool' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 57.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 57.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Hae Yool (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [26] Kim Siha (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Siha' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Siha' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Siha (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [27] Park Minchan (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Minchan' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Minchan' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 53.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Minchan (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [28] Seo Bokyul (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Bokyul' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Bokyul' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 54.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 54.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 59.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 59.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 69.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 40.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 40.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Bokyul (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [29] Shin Yuchan (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shin Yuchan' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shin Yuchan' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 69.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 58.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shin Yuchan (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [30] Lee Jey (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Jey' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Jey' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 66.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 67.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Jey (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [31] Kang Raon (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Raon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Raon' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 94.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 68.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Raon (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [32] Song Yena (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Song Yena' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Song Yena' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 64.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 55.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Song Yena (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [33] Lee Jian (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Jian' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Jian' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 50.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 64.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 56.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 56.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 68.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 51.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Jian (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [34] Choi Dami (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Dami' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Dami' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 73.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 61.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Dami (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [35] Seo Junhoo (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Junhoo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Junhoo' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 78.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 63.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 67.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Junhoo (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [36] Choi Ye Eun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Ye Eun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Ye Eun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Ye Eun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [37] Koo Jae Yi (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Koo Jae Yi' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Koo Jae Yi' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Koo Jae Yi (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [38] Kim Ru Hee (Max) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ru Hee' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ru Hee' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Max' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Max' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ru Hee (Max) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [39] Kim Seo Woo (Olivia) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Seo Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Seo Woo' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Olivia' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Olivia' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Seo Woo (Olivia) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [40] Kim Tae Rin (Emily) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Tae Rin' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Tae Rin' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Emily' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Emily' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Tae Rin (Emily) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [41] Park Ju Yi (Julie) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ju Yi' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ju Yi' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Julie' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Julie' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 67.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ju Yi (Julie) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [42] Lee Na Geum (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Na Geum' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Na Geum' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 68.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Na Geum (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [43] Son Seo Rin (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son Seo Rin' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son Seo Rin' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 64.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 64.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son Seo Rin (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [44] Park Seo Joon (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seo Joon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seo Joon' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seo Joon (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [45] Jeong Ye Won (Daisy) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Ye Won' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Ye Won' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Daisy' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Daisy' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Ye Won (Daisy) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [46] Kang Soo Hyun (David) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Soo Hyun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Soo Hyun' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Soo Hyun (David) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [47] Song Seung Woo (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Song Seung Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Song Seung Woo' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Song Seung Woo (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [48] Jeong Ha Yool (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Ha Yool' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Ha Yool' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Ha Yool (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [49] Jang Ha Ri (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jang Ha Ri' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jang Ha Ri' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jang Ha Ri (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [50] Kim Ro Yi (Roy) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ro Yi' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ro Yi' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Roy' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Roy' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ro Yi (Roy) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [51] Kim Ha Jin (Leo) (G2) — Snapdragon
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ha Jin' AND grade = 2 AND english_name ILIKE '%Leo%' AND english_class = 'Snapdragon' AND is_active = true LIMIT 1;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Leo' AND grade = 2 AND english_class = 'Snapdragon' AND is_active = true LIMIT 1; END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 70.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 69.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 70.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ha Jin (Leo) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [52] Bae Si An (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Bae Si An' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Bae Si An' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Bae Si An (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [53] Kim Ha Rin (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ha Rin' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ha Rin' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ha Rin (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [54] Jo Seung Woo (David) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jo Seung Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jo Seung Woo' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'David' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 95.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jo Seung Woo (David) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [55] Jin Sun Woo (Jayden) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jin Sun Woo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jin Sun Woo' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Jayden' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Jayden' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jin Sun Woo (Jayden) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [56] Han So Yool (Charlotte) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Han So Yool' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Han So Yool' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Charlotte' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Charlotte' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Han So Yool (Charlotte) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [57] Yoon Seo Hoo (Kevin) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Seo Hoo' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Seo Hoo' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Kevin' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Kevin' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Seo Hoo (Kevin) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [58] Choi Yi Sol (Steve) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Yi Sol' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Yi Sol' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Steve' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Steve' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Yi Sol (Steve) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [59] Jeong Seo Yoon (Lucy) (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Seo Yoon' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Seo Yoon' AND grade = 2 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Lucy' AND grade = 2 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Lucy' AND grade = 2 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 76.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 75.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Seo Yoon (Lucy) (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [60] Son Jua (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son Jua' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son Jua' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 96.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son Jua (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [61] Ryu Jian (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ryu Jian' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ryu Jian' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 67.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ryu Jian (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [62] Park Han Bom (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Han Bom' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Han Bom' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 69.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 82.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Han Bom (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [63] Lee Hyun Jun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Hyun Jun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Hyun Jun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 67.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 58.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Hyun Jun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [64] Park Hyun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Hyun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Hyun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 29.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 51.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 46.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 69.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 73.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Hyun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [65] Lee Ji Ahn (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ji Ahn' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ji Ahn' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 29.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 29.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 52.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ji Ahn (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [66] Choo Seo Wan (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choo Seo Wan' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choo Seo Wan' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choo Seo Wan (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [67] Lee Jun Geom (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Jun Geom' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Jun Geom' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 67.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 77.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Jun Geom (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [68] Hwang Ah Rin (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Hwang Ah Rin' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Hwang Ah Rin' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 39.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 39.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Hwang Ah Rin (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [69] Kim Chae Hui (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Chae Hui' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Chae Hui' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 32.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 32.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 67.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 51.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 51.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 70.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 72.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Chae Hui (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [70] Yoo Su Min (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoo Su Min' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoo Su Min' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 58.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 61.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 79.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoo Su Min (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [71] Im Hyeon Jun (G2)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Im Hyeon Jun' AND grade = 2 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Im Hyeon Jun' AND grade = 2 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 55.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 55.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 58.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 58.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 62.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 69.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 71.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Im Hyeon Jun (G2)'; v_skipped := v_skipped + 1;
  END IF;

  -- [72] Lee Do Yoon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Do Yoon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Do Yoon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Do Yoon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [73] Choi Si Won (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Si Won' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Si Won' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 98.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Si Won (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [74] Lee Ji Ahn (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ji Ahn' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ji Ahn' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 68.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 72.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ji Ahn (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [75] Kang Hyeon Gyeom (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Hyeon Gyeom' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Hyeon Gyeom' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Hyeon Gyeom (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [76] Cho Haram (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cho Haram' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cho Haram' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 60.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 60.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 42.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 42.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cho Haram (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [77] Lee Ji Yool (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ji Yool' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ji Yool' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ji Yool (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [78] Ahn So Yun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ahn So Yun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ahn So Yun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ahn So Yun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [79] Son Min Jun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Son Min Jun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Son Min Jun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Son Min Jun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [80] Tae Hyeon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Tae Hyeon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Tae Hyeon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 62.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Tae Hyeon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [81] Si Hoo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Si Hoo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Si Hoo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Si Hoo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [82] Seo Ji Ahn (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Seo Ji Ahn' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Seo Ji Ahn' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 88.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Seo Ji Ahn (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [83] Si Hyeon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Si Hyeon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Si Hyeon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 44.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 44.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 66.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 50.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 50.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Si Hyeon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [84] Choi Da Min (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Da Min' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Da Min' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 76.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 88.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 74.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Da Min (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [85] Park Ye Ju (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Ye Ju' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Ye Ju' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Ye Ju (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [86] Kim Rua (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Rua' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Rua' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Rua (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [87] Yoon Ye Joon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yoon Ye Joon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yoon Ye Joon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yoon Ye Joon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [88] Jeong Yu Eun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Yu Eun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Yu Eun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Yu Eun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [89] Jeong Ji Hoon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Ji Hoon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Ji Hoon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Ji Hoon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [90] Kim Ji Woo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ji Woo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ji Woo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ji Woo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [91] Ok Woo Jin (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ok Woo Jin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ok Woo Jin' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ok Woo Jin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [92] Kim Min Seo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Min Seo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Min Seo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 99.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 93.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Min Seo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [93] Park Jun Woo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Jun Woo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Jun Woo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 76.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Jun Woo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [94] Yeo Ul (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yeo Ul' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yeo Ul' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 79.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.6;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yeo Ul (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [95] Lee Dyne (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Dyne' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Dyne' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 93.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 98.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Dyne (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [96] Jang Arim (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jang Arim' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jang Arim' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 73.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 57.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 57.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jang Arim (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [97] Choi Jungbin (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Jungbin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Jungbin' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 73.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 46.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 46.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Jungbin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [98] Kim Jiwoo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Jiwoo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Jiwoo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 63.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 63.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Jiwoo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [99] Ku Haesu (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ku Haesu' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ku Haesu' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 91.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ku Haesu (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [100] Park Suhyeon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Suhyeon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Suhyeon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 67.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Suhyeon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [101] Kim Suji (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Suji' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Suji' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 61.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 61.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 67.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 67.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 75.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Suji (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [102] Eom Siyoon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Eom Siyoon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Eom Siyoon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Eom Siyoon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [103] Wang Jubi (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Wang Jubi' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Wang Jubi' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 69.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Wang Jubi (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [104] Jeong Siyool (Justin) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Siyool' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Siyool' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Justin' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Justin' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 70.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 92.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Siyool (Justin) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [105] Jeong Hajun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Hajun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Hajun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 76.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Hajun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [106] Jin Yujun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jin Yujun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jin Yujun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 88.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jin Yujun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [107] Hwang Doyoon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Hwang Doyoon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Hwang Doyoon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 97.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 97.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Hwang Doyoon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [108] Park Chaeyeong (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Chaeyeong' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Chaeyeong' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 98.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 98.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Chaeyeong (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [109] Kim Seojun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Seojun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Seojun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 92.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 70.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Seojun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [110] Jin Do Yun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jin Do Yun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jin Do Yun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 87.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 78.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jin Do Yun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [111] Kim Woo Bin (G3)
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Woo Bin' AND grade = 3 AND (english_name IS NULL OR english_name = '') AND is_active = true LIMIT 1;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 69.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 73.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Woo Bin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [112] Lee Ji Ah (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ji Ah' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ji Ah' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ji Ah (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [113] Kim Ra Eun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ra Eun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ra Eun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 79.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 79.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 76.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ra Eun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [114] Kim Woo Bin (Bin) (G3)
  v_sid := NULL;
  SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Woo Bin' AND grade = 3 AND english_name ILIKE '%Bin%' AND is_active = true LIMIT 1;
  IF v_sid IS NULL THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Bin' AND grade = 3 AND is_active = true LIMIT 1; END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Woo Bin (Bin) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [115] Kim Ji Ah (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Ji Ah' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Ji Ah' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 88.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 88.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 87.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Ji Ah (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [116] Whang Hyeon Seo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Whang Hyeon Seo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Whang Hyeon Seo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Whang Hyeon Seo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [117] Choi Eun Yu (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Choi Eun Yu' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Choi Eun Yu' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 90.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Choi Eun Yu (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [118] Park Seo Jin (Eden) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seo Jin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seo Jin' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Eden' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Eden' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seo Jin (Eden) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [119] Lee Ye Rin (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ye Rin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ye Rin' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 90.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 91.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ye Rin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [120] Cha Hae Ju (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cha Hae Ju' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cha Hae Ju' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 71.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 70.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 71.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 65.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cha Hae Ju (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [121] Bae Soo Bin (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Bae Soo Bin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Bae Soo Bin' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 84.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 89.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 81.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 80.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.9;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Bae Soo Bin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [122] Lee Eun Hoo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Eun Hoo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Eun Hoo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 80.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Eun Hoo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [123] Jung Yoon Woo (Asher) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jung Yoon Woo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jung Yoon Woo' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Asher' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Asher' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 70.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 76.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 69.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jung Yoon Woo (Asher) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [124] Jo Seo Yeon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jo Seo Yeon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jo Seo Yeon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 78.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 84.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 85.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jo Seo Yeon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [125] Cheon Ji Yool (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cheon Ji Yool' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cheon Ji Yool' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 68.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 68.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 74.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 66.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 74.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cheon Ji Yool (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [126] Kang Da In (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kang Da In' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kang Da In' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 86.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 86.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kang Da In (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [127] Kim Si Myeong (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Si Myeong' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Si Myeong' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Si Myeong (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [128] Park Seo Eun (Lisa) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Seo Eun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Seo Eun' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Lisa' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Lisa' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 97.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 97.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 96.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 96.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 96.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Seo Eun (Lisa) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [129] Park Won (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Won' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Won' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 99.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 95.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 94.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Won (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [130] Lee Mi So (Anna) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Mi So' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Mi So' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Anna' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Anna' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 99.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 99.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Mi So (Anna) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [131] Cho Min (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Cho Min' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Cho Min' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 95.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 95.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Cho Min (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [132] Won Seo Jun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Won Seo Jun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Won Seo Jun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 78.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 75.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Won Seo Jun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [133] Lee Seung Ha (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Seung Ha' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Seung Ha' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 85.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 91.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 90.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Seung Ha (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [134] Im Su Ah (Hailey) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Im Su Ah' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Im Su Ah' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Hailey' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Hailey' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 86.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 90.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 90.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 89.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Im Su Ah (Hailey) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [135] Park Aurora (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Aurora' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Aurora' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 74.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 71.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 71.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 71.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Aurora (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [136] Jeong Woo Jae (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeong Woo Jae' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeong Woo Jae' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 93.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 92.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 95.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 95.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 100.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 100.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeong Woo Jae (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [137] Ji Su Ah (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Ji Su Ah' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Ji Su Ah' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 72.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 83.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 94.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 94.3;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Ji Su Ah (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [138] Hwang Min Yul (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Hwang Min Yul' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Hwang Min Yul' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 77.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 73.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 75.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 95.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 95.2;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Hwang Min Yul (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [139] Jeon Ji Yoo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Jeon Ji Yoo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Jeon Ji Yoo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 69.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 78.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 78.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 91.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Jeon Ji Yoo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [140] Go Geon Woo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Go Geon Woo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Go Geon Woo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 62.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 75.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 84.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 70.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 17.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 17.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Go Geon Woo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [141] Kim Na Eun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Na Eun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Na Eun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 86.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 86.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 92.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 92.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 77.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Na Eun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [142] Kim Yi Seo (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Kim Yi Seo' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Kim Yi Seo' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 65.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 83.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 89.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 89.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 47.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 47.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Kim Yi Seo (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [143] Park Rah On (Leon) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Park Rah On' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Park Rah On' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Leon' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Leon' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 52.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 52.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 66.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 74.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 74.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 73.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 53.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Park Rah On (Leon) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [144] Shim Ha Yun (Honey) (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Shim Ha Yun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Shim Ha Yun' AND grade = 3 AND is_active = true;
  ELSIF v_cnt = 0 THEN SELECT COUNT(*) INTO v_cnt FROM students WHERE english_name ILIKE 'Honey' AND grade = 3 AND is_active = true; IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE english_name ILIKE 'Honey' AND grade = 3 AND is_active = true; END IF;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 66.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 66.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 82.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 80.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 93.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 93.0;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Shim Ha Yun (Honey) (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [145] Lee Do Dam (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Do Dam' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Do Dam' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 91.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 91.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 80.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 80.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 80.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 83.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 70.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 70.8;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Do Dam (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [146] Im Seong Hyun (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Im Seong Hyun' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Im Seong Hyun' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 69.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 84.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 77.9) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 77.9;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 75.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 84.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 84.5;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Im Seong Hyun (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [147] Yun Ji Sang (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Yun Ji Sang' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Yun Ji Sang' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 83.5) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 83.5;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 82.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 82.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 72.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 72.7;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 62.7) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 62.7;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Yun Ji Sang (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [148] Lee Ha Yoon (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Lee Ha Yoon' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Lee Ha Yoon' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 65.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 65.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 87.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 87.4;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 75.6) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 75.6;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 81.2) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.2;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 69.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 69.1;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Lee Ha Yoon (G3)'; v_skipped := v_skipped + 1;
  END IF;

  -- [149] Won Seo Jin (G3)
  v_sid := NULL;
  SELECT COUNT(*) INTO v_cnt FROM students WHERE korean_name ILIKE 'Won Seo Jin' AND grade = 3 AND is_active = true;
  IF v_cnt = 1 THEN SELECT id INTO v_sid FROM students WHERE korean_name ILIKE 'Won Seo Jin' AND grade = 3 AND is_active = true;
  END IF;
  IF v_sid IS NOT NULL THEN v_matched := v_matched + 1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'reading', 81.0) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 81.0;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'phonics', 85.3) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 85.3;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'writing', 73.1) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 73.1;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'speaking', 76.8) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 76.8;
    INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade) VALUES (v_sid, v_sem_id, 'language', 53.4) ON CONFLICT (student_id, semester_id, domain) DO UPDATE SET calculated_grade = 53.4;
    v_inserted := v_inserted + 5;
  ELSE RAISE NOTICE 'SKIP: Won Seo Jin (G3)'; v_skipped := v_skipped + 1;
  END IF;

  RAISE NOTICE 'Part 1 done: matched=%, skipped=%, grades=%', v_matched, v_skipped, v_inserted;
END $$;