-- ================================================================
-- ENRICH DEMO DATA: Add robust profiles for all Sample class students
-- Run AFTER seed-demo-class.sql
-- Adds: attendance history, multiple reading assessments, 
--        behavior logs (ABC, positive, concern, parent contact),
--        student notes
-- ================================================================

DO $$
DECLARE
  r RECORD;
  t_id UUID;
  days TEXT[] := ARRAY['2025-04-07','2025-04-08','2025-04-09','2025-04-10','2025-04-11',
                       '2025-04-14','2025-04-15','2025-04-16','2025-04-17','2025-04-18',
                       '2025-04-21','2025-04-22','2025-04-23','2025-04-24','2025-04-25',
                       '2025-04-28','2025-04-29','2025-04-30','2025-05-01','2025-05-02'];
  d TEXT;
  roll NUMERIC;
  i INT;
BEGIN

SELECT id INTO t_id FROM teachers WHERE english_class = 'Snapdragon' LIMIT 1;

-- Delete existing enrichment data (attendance, behavior, reading for demo students beyond what seed created)
DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM behavior_logs WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM reading_assessments WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);

-- ============================================================
-- ATTENDANCE: 20 school days for every demo student
-- Most students present, some with patterns
-- ============================================================
FOR r IN SELECT id, english_name, class_number FROM students WHERE is_demo = true ORDER BY grade, class_number
LOOP
  FOREACH d IN ARRAY days
  LOOP
    roll := random();
    -- Students with class_number 51,52 (first two per class) have good attendance
    IF r.class_number IN (51, 52) THEN
      IF roll < 0.92 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'present', '');
      ELSIF roll < 0.97 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'tardy', '');
      ELSE
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'absent', '');
      END IF;
    -- class_number 53,54 have mixed attendance  
    ELSIF r.class_number IN (53, 54) THEN
      IF roll < 0.80 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'present', '');
      ELSIF roll < 0.90 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'tardy', '');
      ELSE
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'absent', '');
      END IF;
    -- Others normal
    ELSE
      IF roll < 0.88 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'present', '');
      ELSIF roll < 0.94 THEN
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'tardy', '');
      ELSE
        INSERT INTO attendance (student_id, date, status, note) VALUES (r.id, d::date, 'absent', '');
      END IF;
    END IF;
  END LOOP;
END LOOP;

-- Add specific notes to some attendance records
UPDATE attendance SET note = 'Mom called - sick' WHERE id = (SELECT a.id FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.is_demo = true AND s.english_name = 'Liam Oh' AND a.status = 'absent' LIMIT 1);
UPDATE attendance SET note = 'Bus was late' WHERE id = (SELECT a.id FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.is_demo = true AND s.english_name = 'Nick Won' AND a.status = 'tardy' LIMIT 1);
UPDATE attendance SET note = 'Field trip' WHERE id = (SELECT a.id FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.is_demo = true AND s.english_name = 'Kate Hwang' AND a.status = 'absent' LIMIT 1);
UPDATE attendance SET note = 'Family vacation' WHERE id = (SELECT a.id FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.is_demo = true AND s.english_name = 'Pete Yoo' AND a.status = 'absent' LIMIT 1);

-- ============================================================
-- READING ASSESSMENTS: 3-5 assessments per student over time
-- Shows growth trajectory
-- ============================================================

-- GRADE 2 students
-- Alex Kim (struggling reader - slow growth)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-03-10', 8, 0.58, 'AA', 'The Red Hen', 'Finger pointing, many substitutions', t_id FROM students WHERE is_demo=true AND english_name='Alex Kim';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-03-24', 10, 0.62, 'AA', 'My Dog', 'Slight improvement, still guessing at words', t_id FROM students WHERE is_demo=true AND english_name='Alex Kim';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-04-07', 11, 0.64, 'A', 'Going to School', 'Using picture cues more', t_id FROM students WHERE is_demo=true AND english_name='Alex Kim';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-04-21', 14, 0.68, 'A', 'The Park', 'Starting to self-correct', t_id FROM students WHERE is_demo=true AND english_name='Alex Kim';

-- Bella Park (average reader - steady growth)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 18, 0.74, 'A', 'My Family', t_id FROM students WHERE is_demo=true AND english_name='Bella Park';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-24', 20, 0.76, 'B', 'At the Zoo', t_id FROM students WHERE is_demo=true AND english_name='Bella Park';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 23, 0.80, 'B', 'The Birthday Party', t_id FROM students WHERE is_demo=true AND english_name='Bella Park';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 26, 0.82, 'C', 'Spring Is Here', t_id FROM students WHERE is_demo=true AND english_name='Bella Park';

-- Dana Choi (strong reader)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 25, 0.80, 'C', 'The Three Bears', t_id FROM students WHERE is_demo=true AND english_name='Dana Choi';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 30, 0.84, 'C', 'Making Friends', t_id FROM students WHERE is_demo=true AND english_name='Dana Choi';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 35, 0.86, 'D', 'The Lost Kitten', t_id FROM students WHERE is_demo=true AND english_name='Dana Choi';

-- Fiona Yoon (top reader)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 32, 0.86, 'D', 'A Rainy Day', t_id FROM students WHERE is_demo=true AND english_name='Fiona Yoon';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-24', 36, 0.88, 'D', 'The Garden', t_id FROM students WHERE is_demo=true AND english_name='Fiona Yoon';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 40, 0.90, 'E', 'Adventure Time', t_id FROM students WHERE is_demo=true AND english_name='Fiona Yoon';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 45, 0.92, 'E', 'The Science Fair', t_id FROM students WHERE is_demo=true AND english_name='Fiona Yoon';

-- Irene Song (exceptional)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 42, 0.92, 'E', 'Space Exploration', t_id FROM students WHERE is_demo=true AND english_name='Irene Song';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 48, 0.94, 'F', 'Ocean Life', t_id FROM students WHERE is_demo=true AND english_name='Irene Song';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 55, 0.96, 'G', 'Ancient Egypt', t_id FROM students WHERE is_demo=true AND english_name='Irene Song';

-- Chris Lee, Henry Kang, Liam Oh (struggling - some data)
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-03-10', 5, 0.42, 'AA', 'I See', 'Cannot decode CVC words yet', t_id FROM students WHERE is_demo=true AND english_name='Chris Lee';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 7, 0.50, 'AA', 'Cat and Dog', t_id FROM students WHERE is_demo=true AND english_name='Chris Lee';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 22, 0.76, 'B', 'My House', t_id FROM students WHERE is_demo=true AND english_name='Henry Kang';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 26, 0.80, 'C', 'Colors Everywhere', t_id FROM students WHERE is_demo=true AND english_name='Henry Kang';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-04-07', 10, 0.55, 'AA', 'Fun at School', 'Frequently absent, hard to track progress', t_id FROM students WHERE is_demo=true AND english_name='Liam Oh';

-- GRADE 4 students
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 42, 0.84, 'E', 'The Volcano', t_id FROM students WHERE is_demo=true AND english_name='Yuna Cho';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 48, 0.88, 'F', 'Robot Dreams', t_id FROM students WHERE is_demo=true AND english_name='Yuna Cho';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 52, 0.90, 'F', 'The Time Machine', t_id FROM students WHERE is_demo=true AND english_name='Yuna Cho';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 72, 0.94, 'I', 'Climate Change', t_id FROM students WHERE is_demo=true AND english_name='Amy Yang';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 80, 0.96, 'J', 'Space Station', t_id FROM students WHERE is_demo=true AND english_name='Amy Yang';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 88, 0.97, 'K', 'Coral Reefs', t_id FROM students WHERE is_demo=true AND english_name='Amy Yang';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 55, 0.88, 'G', 'The Mystery Box', t_id FROM students WHERE is_demo=true AND english_name='Chloe Min';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 60, 0.92, 'H', 'Mountain Hiking', t_id FROM students WHERE is_demo=true AND english_name='Chloe Min';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 65, 0.93, 'H', 'Desert Animals', t_id FROM students WHERE is_demo=true AND english_name='Chloe Min';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 60, 0.90, 'H', 'Under the Sea', t_id FROM students WHERE is_demo=true AND english_name='Ella Pyo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 68, 0.94, 'I', 'The Rainforest', t_id FROM students WHERE is_demo=true AND english_name='Ella Pyo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 75, 0.95, 'J', 'Ancient Rome', t_id FROM students WHERE is_demo=true AND english_name='Ella Pyo';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-03-10', 15, 0.58, 'A', 'The Ball', 'Struggles with multisyllabic words', t_id FROM students WHERE is_demo=true AND english_name='David Eom';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 18, 0.62, 'B', 'Lunch Time', t_id FROM students WHERE is_demo=true AND english_name='David Eom';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 30, 0.78, 'C', 'Weather Report', t_id FROM students WHERE is_demo=true AND english_name='Jay Heo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 34, 0.82, 'D', 'The Pet Shop', t_id FROM students WHERE is_demo=true AND english_name='Jay Heo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 38, 0.84, 'D', 'Camping Trip', t_id FROM students WHERE is_demo=true AND english_name='Jay Heo';

-- GRADE 5 students
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 58, 0.90, 'H', 'Inventions', t_id FROM students WHERE is_demo=true AND english_name='Karen Sung';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 65, 0.92, 'I', 'The Solar System', t_id FROM students WHERE is_demo=true AND english_name='Karen Sung';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 72, 0.94, 'I', 'World Leaders', t_id FROM students WHERE is_demo=true AND english_name='Karen Sung';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 95, 0.97, 'L', 'The Great Wall', t_id FROM students WHERE is_demo=true AND english_name='Maya Dong';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 105, 0.98, 'M', 'Quantum Physics Intro', t_id FROM students WHERE is_demo=true AND english_name='Maya Dong';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 112, 0.99, 'N', 'Democracy', t_id FROM students WHERE is_demo=true AND english_name='Maya Dong';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 70, 0.93, 'J', 'Music History', t_id FROM students WHERE is_demo=true AND english_name='Opal Goo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 78, 0.95, 'K', 'The Olympics', t_id FROM students WHERE is_demo=true AND english_name='Opal Goo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 84, 0.96, 'K', 'Civil Rights', t_id FROM students WHERE is_demo=true AND english_name='Opal Goo';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 48, 0.86, 'F', 'Fairy Tales', t_id FROM students WHERE is_demo=true AND english_name='Rina Sa';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 52, 0.88, 'G', 'The Forest', t_id FROM students WHERE is_demo=true AND english_name='Rina Sa';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-21', 58, 0.91, 'G', 'Dinosaurs', t_id FROM students WHERE is_demo=true AND english_name='Rina Sa';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-03-10', 8, 0.50, 'AA', 'I Like', 'Almost no decoding ability', t_id FROM students WHERE is_demo=true AND english_name='Pete Yoo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 10, 0.54, 'AA', 'My Toys', t_id FROM students WHERE is_demo=true AND english_name='Pete Yoo';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, notes, assessed_by) SELECT id, '2025-04-21', 13, 0.60, 'A', 'At the Beach', 'Some progress with short vowels', t_id FROM students WHERE is_demo=true AND english_name='Pete Yoo';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 80, 0.95, 'K', 'Migration', t_id FROM students WHERE is_demo=true AND english_name='Tara Sim';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 88, 0.97, 'L', 'Ecosystems', t_id FROM students WHERE is_demo=true AND english_name='Tara Sim';

INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-03-10', 65, 0.92, 'I', 'Cooking Basics', t_id FROM students WHERE is_demo=true AND english_name='Vic Gu';
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy_rate, reading_level, passage_title, assessed_by) SELECT id, '2025-04-07', 72, 0.94, 'J', 'Architecture', t_id FROM students WHERE is_demo=true AND english_name='Vic Gu';

-- ============================================================
-- BEHAVIOR LOGS: Rich variety of types
-- ABC entries with antecedents/behaviors/consequences
-- Positive notes, concerns, parent contacts
-- ============================================================

-- === ABC TRACKING (full dropdown data) ===

-- Chris Lee - Grade 2, frequent behavioral challenges
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-08', 'abc', '', true, t_id, '10:15 AM', 'Reading Circle',
  to_jsonb(ARRAY['Difficult task','Transition','Peer conflict']), to_jsonb(ARRAY['Off-task','Refusing to work','Crying/upset']),
  to_jsonb(ARRAY['Verbal redirect','Moved seat','Break offered']), 3, 2, '10 min'
FROM students WHERE is_demo=true AND english_name='Chris Lee';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-15', 'abc', 'Escalated when asked to put away phone', true, t_id, '1:30 PM', 'Writing',
  to_jsonb(ARRAY['Teacher request','Denied preferred activity']), to_jsonb(ARRAY['Talking back','Refusing to work']),
  to_jsonb(ARRAY['Verbal redirect','Parent contacted']), 4, 1, '15 min'
FROM students WHERE is_demo=true AND english_name='Chris Lee';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-22', 'abc', '', false, t_id, '9:30 AM', 'Morning routine',
  to_jsonb(ARRAY['Transition']), to_jsonb(ARRAY['Off-task','Wandering']),
  to_jsonb(ARRAY['Verbal redirect','Visual schedule']), 2, 3, '5 min'
FROM students WHERE is_demo=true AND english_name='Chris Lee';

-- Grace Shin - Grade 2, speaking refusal pattern
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-09', 'abc', 'Would not participate in oral presentation', true, t_id, '11:00 AM', 'Speaking Practice',
  to_jsonb(ARRAY['Called on in class','Performance anxiety']), to_jsonb(ARRAY['Refusing to work','Shutting down']),
  to_jsonb(ARRAY['Break offered','Modified task','Private conversation']), 3, 1, '20 min'
FROM students WHERE is_demo=true AND english_name='Grace Shin';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-17', 'abc', '', false, t_id, '2:00 PM', 'Group Work',
  to_jsonb(ARRAY['New group members','Unstructured time']), to_jsonb(ARRAY['Shutting down','Crying/upset']),
  to_jsonb(ARRAY['Break offered','Peer buddy assigned']), 2, 1, '8 min'
FROM students WHERE is_demo=true AND english_name='Grace Shin';

-- Quinn Noh - Grade 3, physical behaviors
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-10', 'abc', 'Threw materials across room', true, t_id, '10:00 AM', 'Writing',
  to_jsonb(ARRAY['Difficult task','Frustration with work']), to_jsonb(ARRAY['Throwing objects','Yelling']),
  to_jsonb(ARRAY['Removed from area','Cool-down space','Parent contacted']), 5, 1, '25 min'
FROM students WHERE is_demo=true AND english_name='Quinn Noh';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-18', 'abc', '', true, t_id, '1:15 PM', 'Reading',
  to_jsonb(ARRAY['Difficult task','Tired/hungry']), to_jsonb(ARRAY['Off-task','Throwing objects']),
  to_jsonb(ARRAY['Verbal redirect','Cool-down space']), 4, 2, '15 min'
FROM students WHERE is_demo=true AND english_name='Quinn Noh';

-- David Eom - Grade 4, disruptive
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-11', 'abc', 'Making noises during silent reading', true, t_id, '9:45 AM', 'Silent Reading',
  to_jsonb(ARRAY['Boredom','Attention-seeking']), to_jsonb(ARRAY['Making noises','Off-task','Bothering peers']),
  to_jsonb(ARRAY['Verbal redirect','Moved seat']), 3, 4, '30 min'
FROM students WHERE is_demo=true AND english_name='David Eom';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-21', 'abc', 'Arguing with partner during pair work', false, t_id, '2:30 PM', 'Group Work',
  to_jsonb(ARRAY['Peer conflict']), to_jsonb(ARRAY['Talking back','Arguing']),
  to_jsonb(ARRAY['Verbal redirect','Groups restructured']), 3, 1, '10 min'
FROM students WHERE is_demo=true AND english_name='David Eom';

-- Uma Shin - Grade 5, peer conflict
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id, time, activity, antecedents, behaviors, consequences, intensity, frequency, duration)
SELECT id, '2025-04-14', 'abc', 'Yelled at group member, refused to apologize', true, t_id, '10:30 AM', 'Group Work',
  to_jsonb(ARRAY['Peer conflict','Denied preferred activity']), to_jsonb(ARRAY['Yelling','Refusing to work','Talking back']),
  to_jsonb(ARRAY['Removed from area','Private conversation','Loss of privilege']), 4, 1, '20 min'
FROM students WHERE is_demo=true AND english_name='Uma Shin';

-- === POSITIVE BEHAVIOR NOTES ===

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-08', 'positive', 'Volunteered to read aloud to the class for the first time!', false, t_id FROM students WHERE is_demo=true AND english_name='Bella Park';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-11', 'positive', 'Helped a struggling classmate with their writing assignment without being asked', false, t_id FROM students WHERE is_demo=true AND english_name='Dana Choi';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-15', 'positive', 'Perfect score on spelling test - 3rd week in a row', false, t_id FROM students WHERE is_demo=true AND english_name='Fiona Yoon';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-22', 'positive', 'Led morning meeting independently and did an excellent job', false, t_id FROM students WHERE is_demo=true AND english_name='Irene Song';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-09', 'positive', 'Completed all homework on time for the first time this month', false, t_id FROM students WHERE is_demo=true AND english_name='Zack Nam';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-16', 'positive', 'Outstanding creative writing - used descriptive language and complex sentences', false, t_id FROM students WHERE is_demo=true AND english_name='Amy Yang';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-18', 'positive', 'Showed great teamwork during science project presentation', false, t_id FROM students WHERE is_demo=true AND english_name='Chloe Min';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-21', 'positive', 'Significant improvement in reading fluency this month', false, t_id FROM students WHERE is_demo=true AND english_name='Jay Heo';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-10', 'positive', 'Excellent book report presentation - engaged the whole class', false, t_id FROM students WHERE is_demo=true AND english_name='Maya Dong';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-17', 'positive', 'Volunteered to tutor a younger student during buddy reading time', false, t_id FROM students WHERE is_demo=true AND english_name='Tara Sim';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-23', 'positive', 'Resolved a conflict with a peer independently and maturely', false, t_id FROM students WHERE is_demo=true AND english_name='Vic Gu';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-14', 'positive', 'Great participation in class discussion about the novel', false, t_id FROM students WHERE is_demo=true AND english_name='Karen Sung';

-- === CONCERNS ===

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-10', 'concern', 'Has not completed homework 3 times this week', false, t_id FROM students WHERE is_demo=true AND english_name='Eric Jung';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-17', 'concern', 'Seems withdrawn and not engaging with peers during group activities', false, t_id FROM students WHERE is_demo=true AND english_name='Grace Shin';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-22', 'concern', 'Reading level has plateaued - may need additional phonics support', false, t_id FROM students WHERE is_demo=true AND english_name='Jake Moon';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-11', 'concern', 'Falling asleep in class frequently - possible sleep issues at home', true, t_id FROM students WHERE is_demo=true AND english_name='Noah Seo';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-18', 'concern', 'Writing output significantly below grade level expectations', false, t_id FROM students WHERE is_demo=true AND english_name='Hugo Yeo';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-14', 'concern', 'Consistently late to class - 6 tardies this month', false, t_id FROM students WHERE is_demo=true AND english_name='Leo Bang';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-21', 'concern', 'Difficulty following multi-step directions', false, t_id FROM students WHERE is_demo=true AND english_name='Sean Ha';

-- === PARENT CONTACTS ===

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-11', 'parent_contact', 'Called mom to discuss frequent absences. Mom says child has been sick but doctor appointment scheduled.', false, t_id FROM students WHERE is_demo=true AND english_name='Liam Oh';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-18', 'parent_contact', 'Met with parents about behavioral concerns. Agreed on home-school communication notebook and daily behavior checklist.', false, t_id FROM students WHERE is_demo=true AND english_name='Chris Lee';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-22', 'parent_contact', 'Phone call with father about reading struggles. Recommended 15 min nightly reading and provided book list.', false, t_id FROM students WHERE is_demo=true AND english_name='Pete Yoo';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-15', 'parent_contact', 'Email sent home about incomplete homework pattern. Parents agreed to check homework folder nightly.', false, t_id FROM students WHERE is_demo=true AND english_name='Zack Nam';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-24', 'parent_contact', 'Positive phone call! Shared that student is making great progress in reading and behavior.', false, t_id FROM students WHERE is_demo=true AND english_name='Bella Park';

-- === INTERVENTIONS / NOTES ===

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-09', 'note', 'Started using visual behavior chart. Will review in 2 weeks.', false, t_id FROM students WHERE is_demo=true AND english_name='Chris Lee';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-14', 'note', 'Referred for additional phonics intervention - small group 3x/week', false, t_id FROM students WHERE is_demo=true AND english_name='Victor Im';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-16', 'note', 'Assigned peer buddy for reading time. Will monitor if this helps engagement.', false, t_id FROM students WHERE is_demo=true AND english_name='Grace Shin';

INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id)
SELECT id, '2025-04-21', 'note', 'Started modified writing assignments (shorter length, graphic organizer provided)', false, t_id FROM students WHERE is_demo=true AND english_name='David Eom';

-- ============================================================
-- STUDENT NOTES (on the student record itself)
-- ============================================================

UPDATE students SET notes = 'Quiet but engaged. Responds well to positive reinforcement. Prefers working independently.' WHERE is_demo = true AND english_name = 'Alex Kim';
UPDATE students SET notes = 'Very social, sometimes needs redirection. Great oral language skills. Parents are supportive.' WHERE is_demo = true AND english_name = 'Bella Park';
UPDATE students SET notes = 'Significant behavioral and academic concerns. On behavior plan since April. Has IEP for attention difficulties.' WHERE is_demo = true AND english_name = 'Chris Lee';
UPDATE students SET notes = 'Strong reader. Natural leader in group work. Could be challenged with higher-level texts.' WHERE is_demo = true AND english_name = 'Dana Choi';
UPDATE students SET notes = 'Homework completion is inconsistent. Does well in class but does not follow through at home.' WHERE is_demo = true AND english_name = 'Eric Jung';
UPDATE students SET notes = 'Top performer across all domains. Active in class, always prepared. Potential for advanced placement.' WHERE is_demo = true AND english_name = 'Fiona Yoon';
UPDATE students SET notes = 'Anxiety around speaking activities. Performs well in writing but shuts down during oral presentations. Accommodations in place.' WHERE is_demo = true AND english_name = 'Grace Shin';
UPDATE students SET notes = 'Steady progress. Benefits from structured activities. Good relationship with peers.' WHERE is_demo = true AND english_name = 'Henry Kang';
UPDATE students SET notes = 'Exceptional across the board. Self-motivated. Could benefit from enrichment activities and peer tutoring role.' WHERE is_demo = true AND english_name = 'Irene Song';
UPDATE students SET notes = 'Needs additional support in phonics. Making slow but steady progress with intervention.' WHERE is_demo = true AND english_name = 'Jake Moon';
UPDATE students SET notes = 'Good reader, strong vocabulary. Gets distracted during independent work time.' WHERE is_demo = true AND english_name = 'Kate Hwang';
UPDATE students SET notes = 'Frequent absences affecting progress. Family situation may be contributing. Monitor closely.' WHERE is_demo = true AND english_name = 'Liam Oh';

UPDATE students SET notes = 'Solid student. Consistent effort. Could push harder on writing skills.' WHERE is_demo = true AND english_name = 'Mia Han';
UPDATE students SET notes = 'Falling asleep in class - flagged for wellness check. Academic work suffers when tired.' WHERE is_demo = true AND english_name = 'Noah Seo';
UPDATE students SET notes = 'Outstanding student and class leader. Presents confidently. Reading well above grade level.' WHERE is_demo = true AND english_name = 'Olivia Baek';
UPDATE students SET notes = 'Consistent performer. Reliable and focused. Good test-taker.' WHERE is_demo = true AND english_name = 'Paul Ahn';
UPDATE students SET notes = 'Serious behavioral concerns. Escalates quickly when frustrated. Working on coping strategies.' WHERE is_demo = true AND english_name = 'Quinn Noh';
UPDATE students SET notes = 'Making steady reading gains. Enjoys the reading corner. Building confidence.' WHERE is_demo = true AND english_name = 'Ruby Lim';
UPDATE students SET notes = 'Highest performer in class. Voracious reader. May need gifted programming referral.' WHERE is_demo = true AND english_name = 'Sam Jeon';
UPDATE students SET notes = 'Average performance. Quiet in class. Participates when called on but rarely volunteers.' WHERE is_demo = true AND english_name = 'Tina Woo';
UPDATE students SET notes = 'Strong analytical skills. Enjoys science topics in reading. Good comprehension.' WHERE is_demo = true AND english_name = 'Uma Ko';
UPDATE students SET notes = 'Severe reading difficulties. Currently in Tier 3 intervention. May need additional evaluation.' WHERE is_demo = true AND english_name = 'Victor Im';
UPDATE students SET notes = 'High achiever, perfectionist tendencies. Gets upset with mistakes. Working on growth mindset.' WHERE is_demo = true AND english_name = 'Wendy Bae';
UPDATE students SET notes = 'Steady performer. Engaged in class. Enjoys creative writing activities.' WHERE is_demo = true AND english_name = 'Xavier Ryu';

UPDATE students SET notes = 'Strong comprehension but reading speed could improve. Working on fluency.' WHERE is_demo = true AND english_name = 'Yuna Cho';
UPDATE students SET notes = 'Homework completion is a persistent issue. In-class work is satisfactory when focused.' WHERE is_demo = true AND english_name = 'Zack Nam';
UPDATE students SET notes = 'Gifted writer. Creative and imaginative. Reads voraciously across genres.' WHERE is_demo = true AND english_name = 'Amy Yang';
UPDATE students SET notes = 'Reliable student. Good peer relationships. Steady academic progress.' WHERE is_demo = true AND english_name = 'Ben Kwon';
UPDATE students SET notes = 'Strong across all areas. Active class participant. Parents very involved.' WHERE is_demo = true AND english_name = 'Chloe Min';
UPDATE students SET notes = 'Major academic gaps. Disruptive behavior may be masking learning difficulties. Referred for testing.' WHERE is_demo = true AND english_name = 'David Eom';
UPDATE students SET notes = 'Talented reader and writer. Quiet leader. Peer tutor for struggling readers.' WHERE is_demo = true AND english_name = 'Ella Pyo';
UPDATE students SET notes = 'Inconsistent attendance impacting grades. When present, participates well.' WHERE is_demo = true AND english_name = 'Frank Gil';
UPDATE students SET notes = 'Solid performer. Detail-oriented. Excels at grammar and language tasks.' WHERE is_demo = true AND english_name = 'Gina Tak';
UPDATE students SET notes = 'Below grade level in reading and writing. Needs significant support. Sweet and tries hard.' WHERE is_demo = true AND english_name = 'Hugo Yeo';
UPDATE students SET notes = 'Good student overall. Shows initiative. Reading level is appropriate for grade.' WHERE is_demo = true AND english_name = 'Ivy Byun';
UPDATE students SET notes = 'Improving steadily. Responded well to new phonics instruction approach this semester.' WHERE is_demo = true AND english_name = 'Jay Heo';

UPDATE students SET notes = 'Strong reader and speaker. Takes on leadership roles naturally. Model student.' WHERE is_demo = true AND english_name = 'Karen Sung';
UPDATE students SET notes = 'Needs constant redirection. Difficulty sustaining attention. Behavioral plan in progress.' WHERE is_demo = true AND english_name = 'Leo Bang';
UPDATE students SET notes = 'Exceptionally advanced. Reads at high school level. Needs enrichment and challenge.' WHERE is_demo = true AND english_name = 'Maya Dong';
UPDATE students SET notes = 'Average performance with room to grow. Benefits from small group instruction.' WHERE is_demo = true AND english_name = 'Nick Won';
UPDATE students SET notes = 'Top performer. Self-motivated and curious. Excellent critical thinking skills.' WHERE is_demo = true AND english_name = 'Opal Goo';
UPDATE students SET notes = 'Significant reading gap. Minimal English exposure outside school. Needs intensive support.' WHERE is_demo = true AND english_name = 'Pete Yoo';
UPDATE students SET notes = 'Steady improvement all year. Gains confidence each month. Reading fluency growing well.' WHERE is_demo = true AND english_name = 'Rina Sa';
UPDATE students SET notes = 'Quiet student. Does solid work. Could benefit from more speaking practice opportunities.' WHERE is_demo = true AND english_name = 'Sean Ha';
UPDATE students SET notes = 'Advanced reader and writer. Mentors younger students. Natural teacher personality.' WHERE is_demo = true AND english_name = 'Tara Sim';
UPDATE students SET notes = 'Peer conflict issues. Academic work suffers during social difficulties. Working with counselor.' WHERE is_demo = true AND english_name = 'Uma Shin';
UPDATE students SET notes = 'Good student, improving steadily. Strong in reading, working on writing skills.' WHERE is_demo = true AND english_name = 'Vic Gu';
UPDATE students SET notes = 'Consistent but not pushing herself. Could achieve more with increased effort. Average attendance.' WHERE is_demo = true AND english_name = 'Willa Jo';

RAISE NOTICE 'Demo profiles enriched: attendance (20 days each), reading assessments (3-5 each), behavior logs (ABC + positive + concerns + parent contacts), student notes';
END $$;
