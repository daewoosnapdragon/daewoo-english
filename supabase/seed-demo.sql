-- ============================================================================
-- DEMO SEED DATA — Run AFTER schema.sql and migration-calendar-abc.sql
-- Creates 1 demo student in Snapdragon with complete data across all areas
-- ============================================================================

-- Get Snapdragon teacher ID
DO $$
DECLARE
  snap_teacher_id UUID;
  admin_id UUID;
  demo_student_id UUID := 'aabbccdd-0001-0001-0001-eeeeeeee0001';
  sem_spring_id UUID := 'aabbccdd-0002-0002-0002-aaaaaaaaa001';
  sem_fall_id UUID := 'aabbccdd-0002-0002-0002-bbbbbbbbbb01';
  -- Assessment IDs
  a_read1 UUID := 'aabbccdd-1111-1111-1111-111111111001';
  a_read2 UUID := 'aabbccdd-1111-1111-1111-111111111002';
  a_read3 UUID := 'aabbccdd-1111-1111-1111-111111111003';
  a_phon1 UUID := 'aabbccdd-1111-1111-1111-111111111004';
  a_phon2 UUID := 'aabbccdd-1111-1111-1111-111111111005';
  a_writ1 UUID := 'aabbccdd-1111-1111-1111-111111111006';
  a_writ2 UUID := 'aabbccdd-1111-1111-1111-111111111007';
  a_speak1 UUID := 'aabbccdd-1111-1111-1111-111111111008';
  a_speak2 UUID := 'aabbccdd-1111-1111-1111-111111111009';
  a_lang1 UUID := 'aabbccdd-1111-1111-1111-111111111010';
  a_lang2 UUID := 'aabbccdd-1111-1111-1111-111111111011';
  -- Fall semester assessments
  a_fread1 UUID := 'aabbccdd-2222-2222-2222-222222222001';
  a_fread2 UUID := 'aabbccdd-2222-2222-2222-222222222002';
  a_fphon1 UUID := 'aabbccdd-2222-2222-2222-222222222003';
  a_fwrit1 UUID := 'aabbccdd-2222-2222-2222-222222222004';
  a_fspeak1 UUID := 'aabbccdd-2222-2222-2222-222222222005';
  a_flang1 UUID := 'aabbccdd-2222-2222-2222-222222222006';
BEGIN
  SELECT id INTO snap_teacher_id FROM teachers WHERE english_class = 'Snapdragon' LIMIT 1;
  SELECT id INTO admin_id FROM teachers WHERE role = 'admin' LIMIT 1;

  -- ── Semesters ──────────────────────────────────────────────────
  INSERT INTO semesters (id, name, name_ko, academic_year, type, start_date, end_date, grades_due_date, is_active) VALUES
    (sem_spring_id, 'Spring 2026', '2026 봄학기', '2025-2026', 'spring_mid', '2026-03-01', '2026-07-15', '2026-07-10', true),
    (sem_fall_id, 'Fall 2025', '2025 가을학기', '2025-2026', 'fall_final', '2025-09-01', '2025-12-20', '2025-12-15', false)
  ON CONFLICT DO NOTHING;

  -- ── Demo Student ───────────────────────────────────────────────
  -- Delete existing demo student if re-running
  DELETE FROM students WHERE id = demo_student_id;
  -- Also clear any student at this slot
  DELETE FROM students WHERE grade = 4 AND korean_class = '대' AND class_number = 7;

  INSERT INTO students (id, korean_name, english_name, grade, korean_class, class_number, english_class, teacher_id, is_active, notes)
  VALUES (
    demo_student_id,
    '김민준',
    'Daniel Kim',
    4,
    '대',
    7,
    'Snapdragon',
    snap_teacher_id,
    true,
    'Daniel is enthusiastic and loves reading time. He sometimes rushes through writing assignments. Strong phonics skills — moved up from Marigold last semester. Parents are very supportive and attend all conferences. Allergies: peanuts (epi-pen in nurse office). Responds well to positive reinforcement.'
  );

  -- ── Spring 2026 Assessments (Snapdragon, Grade 4) ─────────────

  -- Reading
  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_read1, 'Reading Quiz 1 — Main Idea', sem_spring_id, 4, 'Snapdragon', 'reading', 'formative', 10, '2026-03-10', 'Ch 1-3 comprehension', snap_teacher_id),
    (a_read2, 'Reading Quiz 2 — Inference', sem_spring_id, 4, 'Snapdragon', 'reading', 'formative', 10, '2026-04-07', 'Making inferences from text', snap_teacher_id),
    (a_read3, 'Reading Midterm', sem_spring_id, 4, 'Snapdragon', 'reading', 'summative', 25, '2026-05-12', 'Cumulative reading assessment', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- Phonics
  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_phon1, 'Phonics Check — Blends', sem_spring_id, 4, 'Snapdragon', 'phonics', 'formative', 20, '2026-03-17', 'Consonant blends assessment', snap_teacher_id),
    (a_phon2, 'Phonics Quiz — Vowel Teams', sem_spring_id, 4, 'Snapdragon', 'phonics', 'formative', 15, '2026-04-14', 'Long vowel teams', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- Writing
  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_writ1, 'Narrative Writing', sem_spring_id, 4, 'Snapdragon', 'writing', 'performance_task', 20, '2026-03-24', 'Personal narrative rubric', snap_teacher_id),
    (a_writ2, 'Opinion Paragraph', sem_spring_id, 4, 'Snapdragon', 'writing', 'formative', 15, '2026-04-21', 'Opinion writing with evidence', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- Speaking
  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_speak1, 'Show & Tell Presentation', sem_spring_id, 4, 'Snapdragon', 'speaking', 'performance_task', 10, '2026-03-31', 'Rubric: clarity, volume, eye contact', snap_teacher_id),
    (a_speak2, 'Conversation Role-Play', sem_spring_id, 4, 'Snapdragon', 'speaking', 'formative', 10, '2026-04-28', 'Partner dialogue assessment', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- Language
  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_lang1, 'Grammar Quiz — Past Tense', sem_spring_id, 4, 'Snapdragon', 'language', 'formative', 10, '2026-04-02', 'Regular and irregular past tense', snap_teacher_id),
    (a_lang2, 'Vocabulary Test Unit 3', sem_spring_id, 4, 'Snapdragon', 'language', 'formative', 20, '2026-05-05', 'Unit 3 vocab definitions and usage', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- ── Fall 2025 Assessments ─────────────────────────────────────

  INSERT INTO assessments (id, name, semester_id, grade, english_class, domain, type, max_score, date, description, created_by) VALUES
    (a_fread1, 'Fall Reading Quiz 1', sem_fall_id, 4, 'Snapdragon', 'reading', 'formative', 10, '2025-09-22', 'Beginning of year baseline', snap_teacher_id),
    (a_fread2, 'Fall Reading Final', sem_fall_id, 4, 'Snapdragon', 'reading', 'summative', 25, '2025-12-08', 'Fall reading cumulative', snap_teacher_id),
    (a_fphon1, 'Fall Phonics Assessment', sem_fall_id, 4, 'Snapdragon', 'phonics', 'formative', 20, '2025-10-13', 'Short vowels and CVC words', snap_teacher_id),
    (a_fwrit1, 'Fall Writing Portfolio', sem_fall_id, 4, 'Snapdragon', 'writing', 'performance_task', 20, '2025-11-17', 'Collection of 3 writing samples', snap_teacher_id),
    (a_fspeak1, 'Fall Speaking Check', sem_fall_id, 4, 'Snapdragon', 'speaking', 'formative', 10, '2025-10-27', 'Self-introduction and Q&A', snap_teacher_id),
    (a_flang1, 'Fall Grammar Review', sem_fall_id, 4, 'Snapdragon', 'language', 'formative', 10, '2025-11-10', 'Present tense, articles, pronouns', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  -- ── Grades for Daniel — Spring 2026 ───────────────────────────

  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    -- Reading: Strong reader
    (demo_student_id, a_read1, 9, snap_teacher_id),
    (demo_student_id, a_read2, 8, snap_teacher_id),
    (demo_student_id, a_read3, 22, snap_teacher_id),
    -- Phonics: Very strong
    (demo_student_id, a_phon1, 19, snap_teacher_id),
    (demo_student_id, a_phon2, 14, snap_teacher_id),
    -- Writing: Area for growth
    (demo_student_id, a_writ1, 13, snap_teacher_id),
    (demo_student_id, a_writ2, 10, snap_teacher_id),
    -- Speaking: Good
    (demo_student_id, a_speak1, 8, snap_teacher_id),
    (demo_student_id, a_speak2, 9, snap_teacher_id),
    -- Language: Solid
    (demo_student_id, a_lang1, 8, snap_teacher_id),
    (demo_student_id, a_lang2, 17, snap_teacher_id)
  ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = EXCLUDED.score;

  -- ── Grades for Daniel — Fall 2025 ─────────────────────────────

  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (demo_student_id, a_fread1, 7, snap_teacher_id),
    (demo_student_id, a_fread2, 19, snap_teacher_id),
    (demo_student_id, a_fphon1, 17, snap_teacher_id),
    (demo_student_id, a_fwrit1, 12, snap_teacher_id),
    (demo_student_id, a_fspeak1, 7, snap_teacher_id),
    (demo_student_id, a_flang1, 7, snap_teacher_id)
  ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = EXCLUDED.score;

  -- ── Behavior Logs ─────────────────────────────────────────────

  INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES
    (demo_student_id, '2026-03-05', 'positive', 'Helped a classmate understand the reading passage without being asked. Great teamwork!', false, snap_teacher_id),
    (demo_student_id, '2026-03-12', 'note', 'Daniel seemed tired today — fell asleep briefly during silent reading. Might be staying up late.', false, snap_teacher_id),
    (demo_student_id, '2026-03-19', 'positive', 'Excellent presentation during Show & Tell — spoke clearly and made eye contact. Big improvement!', false, snap_teacher_id),
    (demo_student_id, '2026-03-26', 'concern', 'Rushed through writing assignment again. Only wrote 3 sentences when rubric required 8. Need to work on pacing.', true, snap_teacher_id),
    (demo_student_id, '2026-04-02', 'parent_contact', 'Called mom about writing concerns. She said he reads a lot at home but doesn''t like writing. Agreed to practice journaling at home.', false, snap_teacher_id),
    (demo_student_id, '2026-04-09', 'positive', 'Used the journaling strategy from home! Wrote a full paragraph about his weekend. Progress!', false, snap_teacher_id),
    (demo_student_id, '2026-04-16', 'intervention', 'Started 1-on-1 writing conferences during free reading time. Focusing on planning before writing.', false, snap_teacher_id),
    (demo_student_id, '2026-04-23', 'positive', 'Best opinion paragraph yet — used 3 pieces of evidence. The writing conferences are working.', false, snap_teacher_id);

  -- ── ABC Behavior Entry (flagged) ──────────────────────────────

  INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, frequency, intensity) VALUES
    (demo_student_id, '2026-04-08', 'abc', 'Daniel crumpled his writing paper and put his head down when asked to revise. Recovered after 5 min break.', true, snap_teacher_id,
     '10:35', 'Writing workshop — peer editing',
     '["Task demand","Peer interaction","Correction/feedback"]'::jsonb,
     '["Refusal","Emotional outburst"]'::jsonb,
     '["Break/cool-down","Teacher redirect","Verbal praise after recovery"]'::jsonb,
     1, 3)
  ON CONFLICT DO NOTHING;

  -- ── Calendar Events ───────────────────────────────────────────
  -- Update type constraint to include new types
  ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
    CHECK (type IN ('day_off', 'deadline', 'meeting', 'midterm', 'report_cards', 'event', 'field_trip', 'testing', 'other'));

  INSERT INTO calendar_events (title, date, type, description, created_by) VALUES
    ('Spring Midterms', '2026-05-11', 'midterm', 'Midterm exams week — all grades', admin_id),
    ('Spring Midterms', '2026-05-12', 'midterm', 'Midterm exams week — all grades', admin_id),
    ('Spring Midterms', '2026-05-13', 'midterm', 'Midterm exams week — all grades', admin_id),
    ('Report Cards Due', '2026-07-10', 'report_cards', 'Final report cards due to office', admin_id),
    ('Grade 4 Field Trip — Science Museum', '2026-04-18', 'field_trip', 'Bus departs 8:30 AM. Pack lunch.', snap_teacher_id),
    ('Staff Meeting', '2026-03-07', 'meeting', 'Monthly all-teachers meeting, Room 201', admin_id),
    ('Staff Meeting', '2026-04-04', 'meeting', 'Monthly all-teachers meeting, Room 201', admin_id),
    ('Children''s Day — No School', '2026-05-05', 'day_off', '어린이날', admin_id),
    ('Memorial Day — No School', '2026-06-06', 'day_off', '현충일', admin_id),
    ('CSAT Prep Assembly (Gr 4-5)', '2026-04-25', 'event', 'Morning assembly about study habits', admin_id),
    ('Level Testing Week', '2026-06-16', 'testing', 'Spring level tests begin', admin_id),
    ('Level Testing Week', '2026-06-17', 'testing', 'Spring level tests', admin_id),
    ('Level Testing Week', '2026-06-18', 'testing', 'Spring level tests end', admin_id),
    ('Spring Concert', '2026-06-27', 'event', 'End-of-semester performance. Families invited.', admin_id),
    ('Deadline: Phonics Scores', '2026-04-30', 'deadline', 'All phonics assessment scores due', snap_teacher_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo seed data inserted successfully!';
END $$;
