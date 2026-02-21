-- ============================================================================
-- MIGRATION v20 - TRIAL CLASS with 5 Demo Students
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. First remove old Sample class students and data (if any)
DELETE FROM grades WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM behavior_logs WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM reading_assessments WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM semester_grades WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM summative_scores WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM comments WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM level_test_scores WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM level_test_placements WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM teacher_anecdotal_ratings WHERE student_id IN (SELECT id FROM students WHERE english_class = 'Sample');
DELETE FROM students WHERE english_class = 'Sample';

-- 2. Update english_class constraint to include Trial
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_english_class_check;
-- No constraint needed -- free text field

-- 3. Create Trial teacher (for demo purposes)
INSERT INTO teachers (name, english_class, role, is_active, password)
VALUES ('Demo Teacher', 'Trial', 'teacher', true, 'daewoordemo2026')
ON CONFLICT DO NOTHING;

-- 4. Insert 5 TRIAL demo students (korean class numbers starting at 50)
INSERT INTO students (korean_name, english_name, grade, korean_class, class_number, english_class, is_active, notes)
VALUES
  ('김서준', 'Kim Seojun', 3, '대', 50, 'Trial', true, 'Strong reader, enthusiastic learner. Shows natural leadership in group activities. Needs more practice with written composition. Parents very supportive of English program. Recently tested into higher reading group. Enjoys science topics in reading selections.'),
  ('이하윤', 'Lee Hayoon', 2, '솔', 51, 'Trial', true, 'Quiet but attentive student. Making steady progress in phonics. Struggles with speaking confidence in large group settings but excels in small group work. Has shown improvement in reading fluency over the past month. Benefits from visual learning supports.'),
  ('박지호', 'Park Jiho', 4, '매', 52, 'Trial', true, 'High-energy student who benefits from movement breaks. Strong oral language skills, developing writing stamina. Can decode at grade level but comprehension needs scaffolding with longer texts. Responds well to graphic organizers and structured note-taking templates.'),
  ('정수아', 'Jeong Sua', 5, '대', 53, 'Trial', true, 'Top performer in class. Reads independently at advanced level. Excellent writing skills with developing academic vocabulary. Natural peer tutor who helps classmates without being asked. Interested in debate and persuasive writing. May be ready for level advancement.'),
  ('최민서', 'Choi Minseo', 1, '솔', 54, 'Trial', true, 'New to the English program this semester. Beginning letter-sound correspondence. Very motivated and eager to participate. Picks up vocabulary quickly through repetition and songs. Parents report practicing at home regularly. Needs continued phonemic awareness support.');

-- 5. Get the active semester ID and Trial teacher ID for seeding
-- We'll use DO blocks to handle this dynamically

DO $$
DECLARE
  v_sem_id UUID;
  v_teacher_id UUID;
  v_s1 UUID; v_s2 UUID; v_s3 UUID; v_s4 UUID; v_s5 UUID;
  v_a1 UUID; v_a2 UUID; v_a3 UUID; v_a4 UUID; v_a5 UUID;
  v_a6 UUID; v_a7 UUID; v_a8 UUID; v_a9 UUID; v_a10 UUID;
  d DATE;
BEGIN
  -- Get active semester
  SELECT id INTO v_sem_id FROM semesters WHERE is_active = true LIMIT 1;
  IF v_sem_id IS NULL THEN
    SELECT id INTO v_sem_id FROM semesters ORDER BY start_date DESC LIMIT 1;
  END IF;

  -- Get Trial teacher
  SELECT id INTO v_teacher_id FROM teachers WHERE english_class = 'Trial' LIMIT 1;

  -- Get student IDs
  SELECT id INTO v_s1 FROM students WHERE english_name = 'Kim Seojun' AND english_class = 'Trial';
  SELECT id INTO v_s2 FROM students WHERE english_name = 'Lee Hayoon' AND english_class = 'Trial';
  SELECT id INTO v_s3 FROM students WHERE english_name = 'Park Jiho' AND english_class = 'Trial';
  SELECT id INTO v_s4 FROM students WHERE english_name = 'Jeong Sua' AND english_class = 'Trial';
  SELECT id INTO v_s5 FROM students WHERE english_name = 'Choi Minseo' AND english_class = 'Trial';

  -- Update teacher_id on students
  UPDATE students SET teacher_id = v_teacher_id WHERE english_class = 'Trial';

  -- ================================================================
  -- ASSESSMENTS (2 per domain = 10 total)
  -- ================================================================
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Reading Quiz 1', v_sem_id, 3, 'Trial', 'reading', 'formative', 20, 1, 'Comprehension check')
  RETURNING id INTO v_a1;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Reading Assessment A', v_sem_id, 3, 'Trial', 'reading', 'summative', 50, 2, 'Mid-semester reading assessment')
  RETURNING id INTO v_a2;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Phonics Unit 2 Test', v_sem_id, 3, 'Trial', 'phonics', 'formative', 15, 1, 'Blends and digraphs')
  RETURNING id INTO v_a3;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Phonics Midterm', v_sem_id, 3, 'Trial', 'phonics', 'summative', 30, 2, 'Phonics midterm assessment')
  RETURNING id INTO v_a4;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Writing Journal Week 4', v_sem_id, 3, 'Trial', 'writing', 'formative', 10, 1, 'Weekly journal entry')
  RETURNING id INTO v_a5;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Writing Portfolio', v_sem_id, 3, 'Trial', 'writing', 'performance_task', 40, 2, 'Writing portfolio review')
  RETURNING id INTO v_a6;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Speaking Presentation', v_sem_id, 3, 'Trial', 'speaking', 'performance_task', 25, 1, 'Oral presentation rubric')
  RETURNING id INTO v_a7;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Listening Comprehension', v_sem_id, 3, 'Trial', 'speaking', 'formative', 20, 1, 'Listening activity score')
  RETURNING id INTO v_a8;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Grammar Quiz 3', v_sem_id, 3, 'Trial', 'language', 'formative', 15, 1, 'Subject-verb agreement')
  RETURNING id INTO v_a9;
  INSERT INTO assessments (name, semester_id, grade, english_class, domain, type, max_score, weight, description)
  VALUES ('Language Midterm', v_sem_id, 3, 'Trial', 'language', 'summative', 40, 2, 'Language standards midterm')
  RETURNING id INTO v_a10;

  -- ================================================================
  -- GRADES for each student x assessment
  -- ================================================================
  -- Kim Seojun (strong reader, grade 3) ~ 88% overall
  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (v_s1, v_a1, 18, v_teacher_id), (v_s1, v_a2, 44, v_teacher_id),
    (v_s1, v_a3, 13, v_teacher_id), (v_s1, v_a4, 26, v_teacher_id),
    (v_s1, v_a5, 8, v_teacher_id), (v_s1, v_a6, 33, v_teacher_id),
    (v_s1, v_a7, 21, v_teacher_id), (v_s1, v_a8, 17, v_teacher_id),
    (v_s1, v_a9, 13, v_teacher_id), (v_s1, v_a10, 35, v_teacher_id);

  -- Lee Hayoon (steady progress, grade 2) ~ 76% overall
  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (v_s2, v_a1, 14, v_teacher_id), (v_s2, v_a2, 36, v_teacher_id),
    (v_s2, v_a3, 11, v_teacher_id), (v_s2, v_a4, 22, v_teacher_id),
    (v_s2, v_a5, 7, v_teacher_id), (v_s2, v_a6, 30, v_teacher_id),
    (v_s2, v_a7, 17, v_teacher_id), (v_s2, v_a8, 15, v_teacher_id),
    (v_s2, v_a9, 11, v_teacher_id), (v_s2, v_a10, 30, v_teacher_id);

  -- Park Jiho (developing, grade 4) ~ 72% overall
  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (v_s3, v_a1, 13, v_teacher_id), (v_s3, v_a2, 34, v_teacher_id),
    (v_s3, v_a3, 10, v_teacher_id), (v_s3, v_a4, 20, v_teacher_id),
    (v_s3, v_a5, 7, v_teacher_id), (v_s3, v_a6, 28, v_teacher_id),
    (v_s3, v_a7, 19, v_teacher_id), (v_s3, v_a8, 14, v_teacher_id),
    (v_s3, v_a9, 10, v_teacher_id), (v_s3, v_a10, 29, v_teacher_id);

  -- Jeong Sua (top performer, grade 5) ~ 94% overall
  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (v_s4, v_a1, 19, v_teacher_id), (v_s4, v_a2, 48, v_teacher_id),
    (v_s4, v_a3, 14, v_teacher_id), (v_s4, v_a4, 28, v_teacher_id),
    (v_s4, v_a5, 10, v_teacher_id), (v_s4, v_a6, 38, v_teacher_id),
    (v_s4, v_a7, 24, v_teacher_id), (v_s4, v_a8, 19, v_teacher_id),
    (v_s4, v_a9, 14, v_teacher_id), (v_s4, v_a10, 37, v_teacher_id);

  -- Choi Minseo (beginning, grade 1) ~ 62% overall
  INSERT INTO grades (student_id, assessment_id, score, entered_by) VALUES
    (v_s5, v_a1, 10, v_teacher_id), (v_s5, v_a2, 28, v_teacher_id),
    (v_s5, v_a3, 8, v_teacher_id), (v_s5, v_a4, 17, v_teacher_id),
    (v_s5, v_a5, 6, v_teacher_id), (v_s5, v_a6, 24, v_teacher_id),
    (v_s5, v_a7, 14, v_teacher_id), (v_s5, v_a8, 12, v_teacher_id),
    (v_s5, v_a9, 9, v_teacher_id), (v_s5, v_a10, 25, v_teacher_id);

  -- ================================================================
  -- ATTENDANCE (20 days of data for each student)
  -- ================================================================
  FOR d IN SELECT generate_series('2026-01-05'::date, '2026-01-30'::date, '1 day'::interval)::date LOOP
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      -- Seojun: mostly present
      INSERT INTO attendance (student_id, date, status, note) VALUES (v_s1, d, CASE WHEN d = '2026-01-12' THEN 'absent' WHEN d = '2026-01-22' THEN 'tardy' ELSE 'present' END, '');
      -- Hayoon: very consistent
      INSERT INTO attendance (student_id, date, status, note) VALUES (v_s2, d, CASE WHEN d = '2026-01-19' THEN 'tardy' ELSE 'present' END, '');
      -- Jiho: some absences
      INSERT INTO attendance (student_id, date, status, note) VALUES (v_s3, d, CASE WHEN d IN ('2026-01-08', '2026-01-09', '2026-01-23') THEN 'absent' WHEN d = '2026-01-15' THEN 'tardy' ELSE 'present' END, CASE WHEN d = '2026-01-08' THEN 'Family trip' ELSE '' END);
      -- Sua: perfect attendance
      INSERT INTO attendance (student_id, date, status, note) VALUES (v_s4, d, 'present', '');
      -- Minseo: a couple absences (new student adjusting)
      INSERT INTO attendance (student_id, date, status, note) VALUES (v_s5, d, CASE WHEN d IN ('2026-01-07', '2026-01-14') THEN 'absent' WHEN d = '2026-01-21' THEN 'tardy' ELSE 'present' END, CASE WHEN d = '2026-01-07' THEN 'Sick' ELSE '' END);
    END IF;
  END LOOP;

  -- ================================================================
  -- BEHAVIOR LOGS (ABC tracking data) - columns are JSONB
  -- ================================================================
  INSERT INTO behavior_logs (student_id, teacher_id, date, type, note, is_flagged, time, duration, activity, antecedents, behaviors, consequences, frequency, intensity) VALUES
    -- Seojun: mostly positive
    (v_s1, v_teacher_id, '2026-01-08', 'positive', 'Helped a classmate sound out a difficult word during partner reading. Showed patience and encouragement.', false, '10:15', '5 min', 'Partner reading', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s1, v_teacher_id, '2026-01-15', 'positive', 'Volunteered to read aloud and did an excellent job with expression and fluency.', false, '09:30', '', 'Whole class reading', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s1, v_teacher_id, '2026-01-22', 'abc', 'Became frustrated during writing and crumpled his paper. Redirected successfully with a brief break.', false, '11:00', '3 min', 'Independent writing', '["Task difficulty", "Writing fatigue"]'::jsonb, '["Crumpled paper", "Head on desk"]'::jsonb, '["Break offered", "Task modified"]'::jsonb, 1, 2),

    -- Hayoon: quiet, steady
    (v_s2, v_teacher_id, '2026-01-10', 'positive', 'Spoke up during class discussion for the first time this week. Growing confidence in oral participation.', false, '09:45', '', 'Class discussion', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s2, v_teacher_id, '2026-01-20', 'note', 'Parents requested extra homework materials for home practice. Provided supplemental phonics worksheets.', false, '14:00', '', 'Parent communication', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),

    -- Jiho: high energy, some behavior tracking needed
    (v_s3, v_teacher_id, '2026-01-06', 'abc', 'Called out answers without raising hand repeatedly during whole-class instruction. Given visual reminder card.', true, '09:20', '15 min', 'Whole class instruction', '["Excitement about topic", "Peer attention"]'::jsonb, '["Calling out", "Out of seat"]'::jsonb, '["Visual reminder", "Proximity"]'::jsonb, 4, 2),
    (v_s3, v_teacher_id, '2026-01-13', 'abc', 'Difficulty transitioning from recess to class. Took 8 minutes to settle and begin work.', false, '13:05', '8 min', 'Transition from recess', '["Transition difficulty", "High energy after recess"]'::jsonb, '["Slow to start", "Talking to peers"]'::jsonb, '["Timer used", "First-then board"]'::jsonb, 1, 2),
    (v_s3, v_teacher_id, '2026-01-17', 'positive', 'Completed entire writing assignment independently with strong effort. Best work this semester!', false, '11:30', '', 'Independent writing', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s3, v_teacher_id, '2026-01-24', 'abc', 'Pushed another student lightly during group work disagreement. Mediated conversation, both students apologized.', true, '10:45', '2 min', 'Group work', '["Peer conflict", "Sharing materials"]'::jsonb, '["Physical contact", "Raised voice"]'::jsonb, '["Mediation", "Separate seating", "Cool-down time"]'::jsonb, 1, 3),

    -- Sua: exemplary
    (v_s4, v_teacher_id, '2026-01-09', 'positive', 'Led book club discussion with excellent questioning strategies. Other students were engaged and responsive.', false, '10:00', '20 min', 'Book club', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s4, v_teacher_id, '2026-01-16', 'positive', 'Wrote a persuasive essay that exceeded grade-level expectations. Recommended for advanced writing group.', false, '11:15', '', 'Writing workshop', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s4, v_teacher_id, '2026-01-23', 'positive', 'Spontaneously helped Minseo with letter sounds during free choice time. Natural peer mentor.', false, '13:30', '10 min', 'Free choice', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),

    -- Minseo: new student, adjusting
    (v_s5, v_teacher_id, '2026-01-08', 'note', 'First week in the program. Appears eager but overwhelmed by English immersion. Using lots of Korean with peers.', false, '09:00', '', 'General observation', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s5, v_teacher_id, '2026-01-15', 'positive', 'Successfully identified all 26 letter names during assessment. Celebrated with a sticker chart milestone.', false, '10:30', '', 'Letter assessment', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 0, 0),
    (v_s5, v_teacher_id, '2026-01-22', 'abc', 'Cried during independent work time when unable to read instructions. Provided picture supports and buddy reader.', false, '11:20', '5 min', 'Independent work', '["Task too difficult", "Lack of support"]'::jsonb, '["Crying", "Withdrawal"]'::jsonb, '["Picture supports added", "Buddy assigned"]'::jsonb, 1, 2);

  -- ================================================================
  -- READING ASSESSMENTS (multiple per student showing growth)
  -- ================================================================
  INSERT INTO reading_assessments (student_id, date, passage_title, passage_level, word_count, time_seconds, errors, self_corrections, cwpm, accuracy_rate, reading_level, notes, assessed_by) VALUES
    -- Seojun: strong reader showing growth
    (v_s1, '2025-09-15', 'The Lost Puppy', 'G', 120, 75, 4, 2, 93, 97, 'G', 'Fluent reading with good expression', v_teacher_id),
    (v_s1, '2025-11-20', 'Winter Festival', 'I', 145, 80, 3, 1, 107, 98, 'I', 'Moved up a level, strong comprehension', v_teacher_id),
    (v_s1, '2026-01-15', 'Space Adventure', 'J', 160, 82, 2, 2, 116, 99, 'J', 'Reading at expected level, excellent progress', v_teacher_id),

    -- Hayoon: steady growth
    (v_s2, '2025-09-18', 'My Pet Cat', 'C', 50, 65, 6, 1, 41, 88, 'C', 'Developing decoding, needs HFW practice', v_teacher_id),
    (v_s2, '2025-11-22', 'The Park', 'D', 65, 70, 4, 2, 52, 94, 'D', 'Improved fluency, still choppy in places', v_teacher_id),
    (v_s2, '2026-01-18', 'Birthday Party', 'E', 80, 68, 3, 2, 68, 96, 'E', 'Good progress, nearing grade benchmark', v_teacher_id),

    -- Jiho: adequate reader, needs comprehension support
    (v_s3, '2025-09-20', 'Soccer Game', 'H', 130, 85, 5, 1, 88, 96, 'H', 'Reads quickly but misses details', v_teacher_id),
    (v_s3, '2025-11-25', 'Robot Builder', 'I', 150, 90, 4, 2, 97, 97, 'I', 'Speed improving, comprehension still needs work', v_teacher_id),
    (v_s3, '2026-01-20', 'Ocean Deep', 'J', 165, 88, 3, 1, 110, 98, 'J', 'Better expression, retelling improving', v_teacher_id),

    -- Sua: advanced reader
    (v_s4, '2025-09-22', 'Mystery Cave', 'M', 200, 78, 1, 1, 153, 100, 'M', 'Reading well above grade level', v_teacher_id),
    (v_s4, '2025-11-28', 'Time Travelers', 'O', 230, 82, 2, 1, 167, 99, 'O', 'Excellent vocabulary and comprehension', v_teacher_id),
    (v_s4, '2026-01-22', 'Dragon Quest', 'P', 250, 85, 1, 0, 176, 100, 'P', 'Near native fluency, ready for challenge texts', v_teacher_id),

    -- Minseo: beginning reader
    (v_s5, '2025-11-30', 'I See', 'Pre-A', 15, 45, 5, 0, 13, 67, 'Pre-A', 'Learning letter sounds, pointing to words', v_teacher_id),
    (v_s5, '2026-01-25', 'The Dog', 'A', 25, 50, 4, 1, 25, 84, 'A', 'Recognizing CVC words, improving quickly', v_teacher_id);

  -- ================================================================
  -- TEACHER COMMENTS (175-200 words each)
  -- ================================================================
  INSERT INTO comments (student_id, semester_id, text, draft_source, is_approved, created_by) VALUES
    (v_s1, v_sem_id, 'Seojun has demonstrated remarkable growth in the English program this semester. His reading fluency has improved significantly, moving from Level G to Level J with strong comprehension and expressive reading. He consistently engages with texts above his instructional level and shows genuine enthusiasm for reading independently during free choice time. In writing, Seojun produces clear and organized paragraphs, though he sometimes becomes frustrated when working on longer compositions. We have been working on building his writing stamina through structured breaks and goal-setting strategies. His phonics skills are solid, and he readily applies decoding strategies to unfamiliar words. Seojun is a natural leader in group activities and often helps peers with reading tasks, showing patience and kindness. He participates actively in class discussions and his speaking confidence continues to grow. Moving forward, our goals include expanding his academic vocabulary, developing more complex sentence structures in writing, and continuing to build endurance for longer writing tasks. I am very proud of his progress and look forward to seeing his continued growth.', 'manual', true, v_teacher_id),

    (v_s2, v_sem_id, 'Hayoon has made steady and meaningful progress in the English program this semester. While she began the year as a quiet participant, her confidence in speaking has grown noticeably, and she now volunteers to share her ideas during class discussions. Her phonics development has been particularly strong, with improved accuracy in decoding words with blends and digraphs. Hayoon is a diligent student who always completes her work carefully and thoughtfully. In reading, she has progressed from Level C to Level E, showing improved fluency and better self-correction strategies. Her comprehension of texts continues to develop, and she benefits from picture supports and graphic organizers when working with unfamiliar content. Writing remains an area of growth, where Hayoon is learning to expand her sentences beyond basic patterns. She works best in small group settings where she feels comfortable taking risks with language. Her parents have been wonderfully supportive, requesting extra materials for home practice. Our next steps include building her oral presentation skills and encouraging her to write longer, more detailed responses across all subject areas.', 'manual', true, v_teacher_id),

    (v_s3, v_sem_id, 'Jiho brings incredible energy and enthusiasm to the English classroom every day. His oral language skills are a particular strength, and he readily shares ideas and engages in classroom discussions with confidence and creativity. Jiho reads at grade level with improving fluency and expression, though comprehension of longer texts remains an area we are actively supporting through graphic organizers and structured retelling activities. His writing has shown growth, especially when given engaging topics that connect to his interests. We have been working together on self-regulation strategies, particularly during transitions and whole-class instruction, and Jiho has made meaningful progress in raising his hand and waiting his turn. He responds well to visual reminders and structured routines. During group work, Jiho is learning to collaborate effectively with peers, and we continue to practice conflict resolution strategies. His physical energy is an asset when channeled into movement-based learning activities. Our goals for the next semester include strengthening reading comprehension through targeted questioning strategies and continuing to build positive peer interaction skills during collaborative tasks.', 'manual', true, v_teacher_id),

    (v_s4, v_sem_id, 'Sua continues to be an outstanding student in the English program, consistently demonstrating exceptional academic achievement across all language domains. Her reading fluency is well above grade level expectations, currently at Level P with near-perfect accuracy and sophisticated comprehension skills. She analyzes texts with depth and readily makes connections across different readings. Sua is an exceptionally talented writer who produces well-organized, detailed compositions with increasingly complex vocabulary and sentence structures. Her persuasive essay this semester was particularly impressive, demonstrating logical reasoning and effective use of evidence. In speaking and listening, Sua leads class discussions thoughtfully and asks insightful questions that push her peers to think more deeply. She is a natural peer mentor who willingly supports classmates in their learning without being prompted. Her grammar and language skills are advanced, and she readily applies new concepts to her writing. I recommend considering Sua for advancement to a higher level class, as she consistently exceeds the expectations of her current placement. She would benefit from more challenging texts and writing tasks.', 'manual', true, v_teacher_id),

    (v_s5, v_sem_id, 'Minseo joined our English program this semester and has shown wonderful enthusiasm and determination in learning English. As a beginning learner, she started with letter recognition and basic phonemic awareness, and has already made impressive progress in identifying all twenty-six letter names and beginning letter-sound associations. Minseo is a motivated student who eagerly participates in songs, chants, and interactive activities that support her language development. She has begun reading simple Level A texts with picture support and is developing her sight word vocabulary through daily practice. While Minseo sometimes feels overwhelmed during independent work time, we have implemented picture supports, buddy readers, and modified assignments to ensure she can participate meaningfully in all classroom activities. Her vocabulary acquisition is notable, and she quickly picks up new words through repetition and contextual learning. Socially, Minseo is well-liked by her classmates and has formed a particularly positive learning partnership with Sua. Our goals for next semester include building CVC word reading fluency, expanding her speaking vocabulary, and increasing her confidence during independent work through gradual release of supports.', 'manual', true, v_teacher_id);

  -- ================================================================
  -- SEMESTER GRADES (domain averages)
  -- ================================================================
  INSERT INTO semester_grades (student_id, semester_id, domain, calculated_grade, final_grade, is_overridden) VALUES
    -- Seojun
    (v_s1, v_sem_id, 'reading', 90.0, 90.0, false),
    (v_s1, v_sem_id, 'phonics', 86.7, 87.0, false),
    (v_s1, v_sem_id, 'writing', 82.5, 83.0, false),
    (v_s1, v_sem_id, 'speaking', 85.0, 85.0, false),
    (v_s1, v_sem_id, 'language', 87.5, 88.0, false),
    -- Hayoon
    (v_s2, v_sem_id, 'reading', 72.0, 72.0, false),
    (v_s2, v_sem_id, 'phonics', 73.3, 73.0, false),
    (v_s2, v_sem_id, 'writing', 75.0, 75.0, false),
    (v_s2, v_sem_id, 'speaking', 72.0, 72.0, false),
    (v_s2, v_sem_id, 'language', 73.3, 73.0, false),
    -- Jiho
    (v_s3, v_sem_id, 'reading', 68.0, 68.0, false),
    (v_s3, v_sem_id, 'phonics', 66.7, 67.0, false),
    (v_s3, v_sem_id, 'writing', 70.0, 70.0, false),
    (v_s3, v_sem_id, 'speaking', 73.0, 73.0, false),
    (v_s3, v_sem_id, 'language', 70.9, 71.0, false),
    -- Sua
    (v_s4, v_sem_id, 'reading', 96.0, 96.0, false),
    (v_s4, v_sem_id, 'phonics', 93.3, 93.0, false),
    (v_s4, v_sem_id, 'writing', 96.0, 96.0, false),
    (v_s4, v_sem_id, 'speaking', 95.6, 96.0, false),
    (v_s4, v_sem_id, 'language', 92.7, 93.0, false),
    -- Minseo
    (v_s5, v_sem_id, 'reading', 56.0, 56.0, false),
    (v_s5, v_sem_id, 'phonics', 55.6, 56.0, false),
    (v_s5, v_sem_id, 'writing', 60.0, 60.0, false),
    (v_s5, v_sem_id, 'speaking', 57.8, 58.0, false),
    (v_s5, v_sem_id, 'language', 61.8, 62.0, false);

END $$;

-- Done! Trial class is ready with 5 fully populated demo students.
