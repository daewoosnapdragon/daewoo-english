-- ============================================================================
-- MIGRATION v20 - EXPAND TRIAL CLASS to 25 Students (5 per grade)
-- Run AFTER migration-v20-trial-class.sql
-- ============================================================================

-- Add 20 more students to Trial class (original 5 already exist)
-- Grade 1: 4 more (Minseo already grade 1 at #54)
INSERT INTO students (korean_name, english_name, grade, korean_class, class_number, english_class, is_active, notes)
VALUES
  ('윤예린', 'Yoon Yerin', 1, '대', 55, 'Trial', true, 'Very social learner, loves songs and chants. Beginning CVC word reading. Strong phonemic awareness for initial sounds. Needs support with final consonant blends. Enjoys picture books and often chooses the reading corner during free time.'),
  ('장도윤', 'Jang Doyun', 1, '솔', 56, 'Trial', true, 'Careful and methodical student. Can write all 26 letters independently. Working on letter-sound connections for vowels. Very neat handwriting. Sometimes reluctant to speak aloud but does well with partner work. Making good progress.'),
  ('한소율', 'Han Soyul', 1, '매', 57, 'Trial', true, 'Active and curious. Learns through movement and hands-on activities. Can identify most uppercase letters. Needs practice with lowercase. Shows strong listening comprehension when stories include pictures. Parents engaged and communicative.'),
  ('임시우', 'Im Siwoo', 1, '대', 58, 'Trial', true, 'Transferred from another school mid-semester. Slightly behind peers in phonics but catching up quickly. Strong Korean literacy skills that transfer well. Enthusiastic about learning English. Enjoys competitive games and responds well to reward systems.'),

  -- Grade 2: 4 more (Hayoon already grade 2 at #51)
  ('오지안', 'Oh Jian', 2, '매', 59, 'Trial', true, 'Reading at level C/D. Good decoding skills but needs comprehension support. Strong math vocabulary. Enjoys informational texts about animals and space. Starting to write 3-sentence responses independently. Benefits from sentence starters.'),
  ('서하은', 'Seo Haeun', 2, '대', 60, 'Trial', true, 'Confident speaker with expanding vocabulary. Can retell stories with key details. Writing developing from phrases to complete sentences. Excellent listener who follows multi-step directions. Natural helper in the classroom.'),
  ('권태양', 'Kwon Taeyang', 2, '솔', 61, 'Trial', true, 'Energetic student who is developing reading stamina. Can read level B books independently. Needs support staying focused during independent reading time. Oral language skills ahead of reading level. Enjoys drama and role-playing activities.'),
  ('문채원', 'Moon Chaewon', 2, '매', 62, 'Trial', true, 'Quiet achiever making steady growth. Reading at level E, above grade-level expectation for class tier. Writing shows creativity and risk-taking with new vocabulary. Needs encouragement to participate in whole-class discussions.'),

  -- Grade 3: 4 more (Seojun already grade 3 at #50)
  ('강이준', 'Kang Ijun', 3, '솔', 63, 'Trial', true, 'Strong reader who enjoys chapter books. Writing needs development in organization and paragraph structure. Active participant in discussions. Sometimes rushes through work. Benefits from checklists and self-editing rubrics.'),
  ('배서연', 'Bae Seoyeon', 3, '매', 64, 'Trial', true, 'Hardworking student with consistent effort. Reading fluency has improved dramatically this semester. Comprehension strong with fiction, developing with nonfiction. Writing shows good use of descriptive language. Very responsive to feedback.'),
  ('남하람', 'Nam Haram', 3, '대', 65, 'Trial', true, 'Creative thinker who excels in oral presentations. Reading at grade level for class tier. Spelling and grammar need attention. Enjoys group projects and leadership roles. Sometimes struggles with independent work routines.'),
  ('양수빈', 'Yang Subin', 3, '솔', 66, 'Trial', true, 'Recently moved up from a lower class. Adjusting well to increased rigor. Reading accuracy improving, working on fluency and expression. Writing is brief but on-topic. Very motivated by praise and positive reinforcement.'),

  -- Grade 4: 4 more (Jiho already grade 4 at #52)
  ('황지유', 'Hwang Jiyu', 4, '대', 67, 'Trial', true, 'Advanced vocabulary for class level. Reads independently and can summarize texts effectively. Strong analytical skills in reading comprehension. Writing shows emerging voice and style. Could be considered for level advancement next semester.'),
  ('조윤호', 'Jo Yunho', 4, '솔', 68, 'Trial', true, 'Solid middle-of-the-road student. Consistent performance across all domains. Reading fluency adequate, comprehension developing with inference questions. Writing organized with basic transitions. Benefits from peer collaboration.'),
  ('신예은', 'Shin Yeeun', 4, '매', 69, 'Trial', true, 'Struggles with reading stamina for longer texts. Comprehension better with oral reading than silent. Strong speaking skills and volunteers frequently. Writing improving in length and detail. Uses graphic organizers effectively.'),
  ('안준서', 'An Junseo', 4, '대', 70, 'Trial', true, 'Bilingual student with strong Korean literacy. English reading developing well. Sometimes translates directly from Korean which affects writing style. Good test-taker who performs well on assessments. Quiet in discussions but writes thoughtfully.'),

  -- Grade 5: 4 more (Sua already grade 5 at #53)
  ('홍지민', 'Hong Jimin', 5, '솔', 71, 'Trial', true, 'Strong all-around student approaching native-like fluency. Reads chapter books independently and can discuss themes and character development. Writing sophisticated with varied sentence structure. Natural leader in group activities.'),
  ('전다은', 'Jeon Daeun', 5, '매', 72, 'Trial', true, 'Excellent reader with strong comprehension. Writing needs support with organization and evidence-based arguments. Speaking skills confident. Has been helping lower-level students as a reading buddy. Interested in journalism and current events.'),
  ('노현우', 'Noh Hyunwoo', 5, '대', 73, 'Trial', true, 'Reading at grade level for class tier. Comprehension strong with informational text, developing with literary analysis. Writing shows improvement with persuasive techniques. Active in class discussions. Benefits from exemplar models.'),
  ('유서아', 'Yoo Seoa', 5, '솔', 74, 'Trial', true, 'Diligent student who completes all work thoughtfully. Reading fluency excellent, working on inferential comprehension. Writing detailed and well-organized. Sometimes perfectionist tendencies slow down work completion. Very responsive to constructive feedback.');

-- Now seed data for all 25 students
DO $$
DECLARE
  v_sem_id UUID;
  v_teacher_id UUID;
  v_student RECORD;
  v_assess_id UUID;
  d DATE;
  v_score INT;
BEGIN
  SELECT id INTO v_sem_id FROM semesters WHERE is_active = true LIMIT 1;
  SELECT id INTO v_teacher_id FROM teachers WHERE english_class = 'Trial' AND is_active = true LIMIT 1;

  IF v_sem_id IS NULL OR v_teacher_id IS NULL THEN
    RAISE NOTICE 'Missing semester or teacher - skipping data seed';
    RETURN;
  END IF;

  -- Assign teacher to all Trial students
  UPDATE students SET teacher_id = v_teacher_id WHERE english_class = 'Trial' AND is_active = true;

  -- Seed ATTENDANCE for all new Trial students (20 days Jan 5-30)
  FOR v_student IN SELECT id, class_number, grade FROM students WHERE english_class = 'Trial' AND is_active = true AND class_number >= 55 LOOP
    FOR d IN SELECT generate_series('2026-01-05'::date, '2026-01-30'::date, '1 day'::interval)::date LOOP
      IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (
          v_student.id, d,
          CASE
            WHEN random() < 0.05 THEN 'absent'
            WHEN random() < 0.10 THEN 'tardy'
            ELSE 'present'
          END,
          ''
        );
      END IF;
    END LOOP;

    -- Seed BEHAVIOR LOGS (2-3 per student)
    INSERT INTO behavior_logs (student_id, teacher_id, date, type, note, is_flagged, time, duration, activity, antecedents, behaviors, consequences, frequency, intensity) VALUES
      (v_student.id, v_teacher_id, '2026-01-10', 'positive', 'Participated actively in class discussion. Showed good listening skills.', false, '10:00', '', 'Class discussion', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
      (v_student.id, v_teacher_id, '2026-01-20', 'note', 'Making steady progress across all domains. Continue current support strategies.', false, '14:00', '', 'General observation', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0);

    -- Seed READING ASSESSMENTS (2 per student)
    INSERT INTO reading_assessments (student_id, date, passage_title, passage_level, word_count, time_seconds, errors, self_corrections, cwpm, accuracy_rate, reading_level, notes, assessed_by) VALUES
      (v_student.id, '2025-11-15', 'Fall Story', CASE WHEN v_student.grade <= 2 THEN 'C' WHEN v_student.grade <= 3 THEN 'G' ELSE 'J' END,
       50 + v_student.grade * 20, 60 + v_student.grade * 5, 5 - (v_student.grade / 2), 1,
       (50 + v_student.grade * 20) * 60 / (60 + v_student.grade * 5) - 5 + (v_student.grade / 2),
       90 + v_student.grade, CASE WHEN v_student.grade <= 2 THEN 'C' WHEN v_student.grade <= 3 THEN 'G' ELSE 'J' END,
       'Initial assessment', v_teacher_id),
      (v_student.id, '2026-01-20', 'Winter Story', CASE WHEN v_student.grade <= 2 THEN 'D' WHEN v_student.grade <= 3 THEN 'H' ELSE 'K' END,
       60 + v_student.grade * 20, 58 + v_student.grade * 4, 4 - (v_student.grade / 2), 2,
       (60 + v_student.grade * 20) * 60 / (58 + v_student.grade * 4) - 4 + (v_student.grade / 2),
       91 + v_student.grade, CASE WHEN v_student.grade <= 2 THEN 'D' WHEN v_student.grade <= 3 THEN 'H' ELSE 'K' END,
       'Growth shown since fall', v_teacher_id);

  END LOOP;

  RAISE NOTICE 'Trial class expanded: 20 additional students seeded with attendance, behavior, and reading data';
END $$;
