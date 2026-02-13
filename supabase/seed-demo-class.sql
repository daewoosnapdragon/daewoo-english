-- ================================================================
-- DEMO DATA: "Sample" class with ~12 students per grade (1-5)
-- All students in english_class = 'Sample', marked is_demo = true
-- ================================================================

ALTER TABLE students ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

DO $$ 
DECLARE
  demo_sem UUID;
  new_id UUID;
  t_id UUID;
BEGIN

-- Get or create demo semester
SELECT id INTO demo_sem FROM semesters WHERE name = 'Demo Semester' LIMIT 1;
IF demo_sem IS NULL THEN
  INSERT INTO semesters (name, name_ko, academic_year, type, start_date, end_date, is_active)
  VALUES ('Demo Semester', '데모 학기', '2025-2026', 'spring', '2025-03-01', '2025-07-15', false)
  RETURNING id INTO demo_sem;
END IF;

-- Clean previous demo data
DELETE FROM semester_grades WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM reading_assessments WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM behavior_logs WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
DELETE FROM students WHERE is_demo = true;

-- Use Kyla's teacher ID (Snapdragon) as the "teacher" for sample class
SELECT id INTO t_id FROM teachers WHERE english_class = 'Snapdragon' LIMIT 1;

-- ============================================================
-- GRADE 2 - 12 students
-- ============================================================

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Alex Kim', '김알렉스', 2, '대', 1, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.45), (new_id, demo_sem, 'phonics', 0.38), (new_id, demo_sem, 'writing', 0.42), (new_id, demo_sem, 'speaking', 0.55), (new_id, demo_sem, 'language', 0.48);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.456, 'B-');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 12, 0.65, 'AA');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'present'), (new_id, '2025-04-15', 'present'), (new_id, '2025-04-16', 'absent');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'positive', 'Participated well in group activity', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Bella Park', '박벨라', 2, '대', 2, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.62), (new_id, demo_sem, 'phonics', 0.58), (new_id, demo_sem, 'writing', 0.55), (new_id, demo_sem, 'speaking', 0.70), (new_id, demo_sem, 'language', 0.60);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.610, 'B');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 22, 0.78, 'B');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Chris Lee', '이크리스', 2, '대', 3, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.38), (new_id, demo_sem, 'phonics', 0.35), (new_id, demo_sem, 'writing', 0.32), (new_id, demo_sem, 'speaking', 0.48), (new_id, demo_sem, 'language', 0.40);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.386, 'C+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 8, 0.55, 'AA');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-14', 'concern', 'Difficulty focusing during reading time', true, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Dana Choi', '최다나', 2, '대', 4, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.72), (new_id, demo_sem, 'phonics', 0.68), (new_id, demo_sem, 'writing', 0.70), (new_id, demo_sem, 'speaking', 0.78), (new_id, demo_sem, 'language', 0.73);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.722, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 30, 0.82, 'C');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Eric Jung', '정에릭', 2, '솔', 5, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.55), (new_id, demo_sem, 'phonics', 0.50), (new_id, demo_sem, 'writing', 0.48), (new_id, demo_sem, 'speaking', 0.62), (new_id, demo_sem, 'language', 0.54);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.538, 'B');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Fiona Yoon', '윤피오나', 2, '솔', 6, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.82), (new_id, demo_sem, 'phonics', 0.78), (new_id, demo_sem, 'writing', 0.80), (new_id, demo_sem, 'speaking', 0.88), (new_id, demo_sem, 'language', 0.83);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.822, 'A');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 40, 0.90, 'D');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-16', 'positive', 'Helped classmate during pair work', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Grace Shin', '신그레이스', 2, '솔', 7, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.48), (new_id, demo_sem, 'phonics', 0.44), (new_id, demo_sem, 'writing', 0.40), (new_id, demo_sem, 'speaking', 0.56), (new_id, demo_sem, 'language', 0.47);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.470, 'B-');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'abc', 'Refused to participate in speaking activity', true, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Henry Kang', '강헨리', 2, '솔', 8, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.65), (new_id, demo_sem, 'phonics', 0.60), (new_id, demo_sem, 'writing', 0.62), (new_id, demo_sem, 'speaking', 0.72), (new_id, demo_sem, 'language', 0.66);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.650, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 28, 0.80, 'C');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Irene Song', '송아이린', 2, '매', 9, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.90), (new_id, demo_sem, 'phonics', 0.88), (new_id, demo_sem, 'writing', 0.87), (new_id, demo_sem, 'speaking', 0.94), (new_id, demo_sem, 'language', 0.91);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.900, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 52, 0.95, 'F');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Jake Moon', '문제이크', 2, '매', 10, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.58), (new_id, demo_sem, 'phonics', 0.52), (new_id, demo_sem, 'writing', 0.50), (new_id, demo_sem, 'speaking', 0.64), (new_id, demo_sem, 'language', 0.56);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.560, 'B');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Kate Hwang', '황케이트', 2, '매', 11, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.75), (new_id, demo_sem, 'phonics', 0.71), (new_id, demo_sem, 'writing', 0.73), (new_id, demo_sem, 'speaking', 0.80), (new_id, demo_sem, 'language', 0.76);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.750, 'A-');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 35, 0.85, 'D');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'tardy'), (new_id, '2025-04-15', 'present'), (new_id, '2025-04-16', 'present');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Liam Oh', '오리암', 2, '매', 12, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.42), (new_id, demo_sem, 'phonics', 0.36), (new_id, demo_sem, 'writing', 0.38), (new_id, demo_sem, 'speaking', 0.50), (new_id, demo_sem, 'language', 0.43);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.418, 'C+');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'absent'), (new_id, '2025-04-15', 'absent'), (new_id, '2025-04-16', 'present');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-14', 'parent_contact', 'Called home about frequent absences', false, t_id);

-- ============================================================
-- GRADE 3 - 12 students
-- ============================================================

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Mia Han', '한미아', 3, '대', 1, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.68), (new_id, demo_sem, 'phonics', 0.64), (new_id, demo_sem, 'writing', 0.66), (new_id, demo_sem, 'speaking', 0.75), (new_id, demo_sem, 'language', 0.69);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.684, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 38, 0.84, 'D');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Noah Seo', '서노아', 3, '대', 2, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.52), (new_id, demo_sem, 'phonics', 0.48), (new_id, demo_sem, 'writing', 0.45), (new_id, demo_sem, 'speaking', 0.60), (new_id, demo_sem, 'language', 0.52);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.514, 'B-');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'concern', 'Talking during instruction repeatedly', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Olivia Baek', '백올리비아', 3, '대', 3, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.85), (new_id, demo_sem, 'phonics', 0.82), (new_id, demo_sem, 'writing', 0.83), (new_id, demo_sem, 'speaking', 0.90), (new_id, demo_sem, 'language', 0.86);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.852, 'A');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 55, 0.92, 'G');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-16', 'positive', 'Outstanding presentation to class', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Paul Ahn', '안폴', 3, '대', 4, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.78), (new_id, demo_sem, 'phonics', 0.74), (new_id, demo_sem, 'writing', 0.76), (new_id, demo_sem, 'speaking', 0.83), (new_id, demo_sem, 'language', 0.78);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.778, 'A-');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Quinn Noh', '노퀸', 3, '솔', 5, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.40), (new_id, demo_sem, 'phonics', 0.35), (new_id, demo_sem, 'writing', 0.33), (new_id, demo_sem, 'speaking', 0.50), (new_id, demo_sem, 'language', 0.41);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.398, 'C');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 15, 0.62, 'A');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-14', 'abc', 'Threw pencil during writing time, escalated when redirected', true, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Ruby Lim', '임루비', 3, '솔', 6, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.72), (new_id, demo_sem, 'phonics', 0.68), (new_id, demo_sem, 'writing', 0.70), (new_id, demo_sem, 'speaking', 0.78), (new_id, demo_sem, 'language', 0.73);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.722, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 42, 0.86, 'E');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Sam Jeon', '전샘', 3, '솔', 7, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.92), (new_id, demo_sem, 'phonics', 0.90), (new_id, demo_sem, 'writing', 0.88), (new_id, demo_sem, 'speaking', 0.95), (new_id, demo_sem, 'language', 0.92);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.914, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 68, 0.96, 'I');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Tina Woo', '우티나', 3, '솔', 8, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.60), (new_id, demo_sem, 'phonics', 0.56), (new_id, demo_sem, 'writing', 0.58), (new_id, demo_sem, 'speaking', 0.68), (new_id, demo_sem, 'language', 0.61);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.606, 'B');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'tardy'), (new_id, '2025-04-15', 'present'), (new_id, '2025-04-16', 'present');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Uma Ko', '고우마', 3, '매', 9, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.80), (new_id, demo_sem, 'phonics', 0.76), (new_id, demo_sem, 'writing', 0.78), (new_id, demo_sem, 'speaking', 0.85), (new_id, demo_sem, 'language', 0.80);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.798, 'A');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Victor Im', '임빅터', 3, '매', 10, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.35), (new_id, demo_sem, 'phonics', 0.30), (new_id, demo_sem, 'writing', 0.28), (new_id, demo_sem, 'speaking', 0.45), (new_id, demo_sem, 'language', 0.36);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.348, 'C');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 6, 0.48, 'AA');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'intervention', 'Referred for additional reading support', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Wendy Bae', '배웬디', 3, '매', 11, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.88), (new_id, demo_sem, 'phonics', 0.85), (new_id, demo_sem, 'writing', 0.86), (new_id, demo_sem, 'speaking', 0.92), (new_id, demo_sem, 'language', 0.88);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.878, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 60, 0.94, 'H');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Xavier Ryu', '류자비에', 3, '매', 12, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.64), (new_id, demo_sem, 'phonics', 0.60), (new_id, demo_sem, 'writing', 0.62), (new_id, demo_sem, 'speaking', 0.72), (new_id, demo_sem, 'language', 0.65);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.646, 'B+');

-- ============================================================
-- GRADE 4 - 12 students
-- ============================================================

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Yuna Cho', '조유나', 4, '대', 1, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.76), (new_id, demo_sem, 'phonics', 0.72), (new_id, demo_sem, 'writing', 0.74), (new_id, demo_sem, 'speaking', 0.82), (new_id, demo_sem, 'language', 0.77);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.762, 'A-');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 50, 0.88, 'F');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Zack Nam', '남잭', 4, '대', 2, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.58), (new_id, demo_sem, 'phonics', 0.54), (new_id, demo_sem, 'writing', 0.52), (new_id, demo_sem, 'speaking', 0.66), (new_id, demo_sem, 'language', 0.58);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.576, 'B');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'concern', 'Incomplete homework 4 times this month', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Amy Yang', '양에이미', 4, '대', 3, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.94), (new_id, demo_sem, 'phonics', 0.92), (new_id, demo_sem, 'writing', 0.91), (new_id, demo_sem, 'speaking', 0.96), (new_id, demo_sem, 'language', 0.94);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.934, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 85, 0.97, 'K');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-16', 'positive', 'Excellent creative writing piece', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Ben Kwon', '권벤', 4, '대', 4, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.70), (new_id, demo_sem, 'phonics', 0.66), (new_id, demo_sem, 'writing', 0.68), (new_id, demo_sem, 'speaking', 0.76), (new_id, demo_sem, 'language', 0.71);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.702, 'B+');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Chloe Min', '민클로이', 4, '솔', 5, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.84), (new_id, demo_sem, 'phonics', 0.80), (new_id, demo_sem, 'writing', 0.82), (new_id, demo_sem, 'speaking', 0.88), (new_id, demo_sem, 'language', 0.84);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.836, 'A');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 62, 0.93, 'H');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('David Eom', '엄데이빗', 4, '솔', 6, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.45), (new_id, demo_sem, 'phonics', 0.40), (new_id, demo_sem, 'writing', 0.38), (new_id, demo_sem, 'speaking', 0.55), (new_id, demo_sem, 'language', 0.46);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.448, 'C+');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-14', 'negative', 'Disruptive during group work', true, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Ella Pyo', '표엘라', 4, '솔', 7, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.88), (new_id, demo_sem, 'phonics', 0.85), (new_id, demo_sem, 'writing', 0.86), (new_id, demo_sem, 'speaking', 0.92), (new_id, demo_sem, 'language', 0.88);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.878, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 72, 0.95, 'J');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Frank Gil', '길프랭크', 4, '솔', 8, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.62), (new_id, demo_sem, 'phonics', 0.58), (new_id, demo_sem, 'writing', 0.56), (new_id, demo_sem, 'speaking', 0.70), (new_id, demo_sem, 'language', 0.63);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.618, 'B');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'present'), (new_id, '2025-04-15', 'absent'), (new_id, '2025-04-16', 'present');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Gina Tak', '탁지나', 4, '매', 9, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.80), (new_id, demo_sem, 'phonics', 0.76), (new_id, demo_sem, 'writing', 0.78), (new_id, demo_sem, 'speaking', 0.86), (new_id, demo_sem, 'language', 0.81);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.802, 'A');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Hugo Yeo', '여휴고', 4, '매', 10, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.50), (new_id, demo_sem, 'phonics', 0.46), (new_id, demo_sem, 'writing', 0.44), (new_id, demo_sem, 'speaking', 0.58), (new_id, demo_sem, 'language', 0.50);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.496, 'B-');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 20, 0.70, 'B');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Ivy Byun', '변아이비', 4, '매', 11, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.74), (new_id, demo_sem, 'phonics', 0.70), (new_id, demo_sem, 'writing', 0.72), (new_id, demo_sem, 'speaking', 0.80), (new_id, demo_sem, 'language', 0.75);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.742, 'A-');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Jay Heo', '허제이', 4, '매', 12, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.66), (new_id, demo_sem, 'phonics', 0.62), (new_id, demo_sem, 'writing', 0.64), (new_id, demo_sem, 'speaking', 0.74), (new_id, demo_sem, 'language', 0.67);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.666, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 35, 0.82, 'D');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-16', 'positive', 'Great improvement on spelling test', false, t_id);

-- ============================================================
-- GRADE 5 - 12 students
-- ============================================================

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Karen Sung', '성카렌', 5, '대', 1, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.82), (new_id, demo_sem, 'phonics', 0.78), (new_id, demo_sem, 'writing', 0.80), (new_id, demo_sem, 'speaking', 0.88), (new_id, demo_sem, 'language', 0.83);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.822, 'A');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 70, 0.93, 'I');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Leo Bang', '방레오', 5, '대', 2, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.56), (new_id, demo_sem, 'phonics', 0.52), (new_id, demo_sem, 'writing', 0.50), (new_id, demo_sem, 'speaking', 0.64), (new_id, demo_sem, 'language', 0.56);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.556, 'B');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-14', 'concern', 'Needs constant redirection to stay on task', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Maya Dong', '동마야', 5, '대', 3, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.96), (new_id, demo_sem, 'phonics', 0.94), (new_id, demo_sem, 'writing', 0.95), (new_id, demo_sem, 'speaking', 0.98), (new_id, demo_sem, 'language', 0.96);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.958, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 110, 0.99, 'N');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Nick Won', '원닉', 5, '대', 4, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.72), (new_id, demo_sem, 'phonics', 0.68), (new_id, demo_sem, 'writing', 0.70), (new_id, demo_sem, 'speaking', 0.78), (new_id, demo_sem, 'language', 0.73);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.722, 'B+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 45, 0.86, 'E');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'present'), (new_id, '2025-04-15', 'tardy'), (new_id, '2025-04-16', 'present');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Opal Goo', '구오팔', 5, '솔', 5, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.88), (new_id, demo_sem, 'phonics', 0.85), (new_id, demo_sem, 'writing', 0.86), (new_id, demo_sem, 'speaking', 0.92), (new_id, demo_sem, 'language', 0.88);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.878, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 80, 0.96, 'K');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Pete Yoo', '유피트', 5, '솔', 6, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.42), (new_id, demo_sem, 'phonics', 0.38), (new_id, demo_sem, 'writing', 0.35), (new_id, demo_sem, 'speaking', 0.52), (new_id, demo_sem, 'language', 0.43);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.420, 'C+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 12, 0.58, 'A');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'parent_contact', 'Meeting with parents about academic concerns', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Rina Sa', '사리나', 5, '솔', 7, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.78), (new_id, demo_sem, 'phonics', 0.74), (new_id, demo_sem, 'writing', 0.76), (new_id, demo_sem, 'speaking', 0.84), (new_id, demo_sem, 'language', 0.79);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.782, 'A-');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 55, 0.90, 'G');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Sean Ha', '하숀', 5, '솔', 8, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.65), (new_id, demo_sem, 'phonics', 0.60), (new_id, demo_sem, 'writing', 0.62), (new_id, demo_sem, 'speaking', 0.72), (new_id, demo_sem, 'language', 0.66);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.650, 'B+');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Tara Sim', '심타라', 5, '매', 9, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.90), (new_id, demo_sem, 'phonics', 0.88), (new_id, demo_sem, 'writing', 0.87), (new_id, demo_sem, 'speaking', 0.94), (new_id, demo_sem, 'language', 0.91);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.900, 'A+');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 90, 0.97, 'L');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-16', 'positive', 'Mentored younger student during buddy reading', false, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Uma Shin', '신우마', 5, '매', 10, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.48), (new_id, demo_sem, 'phonics', 0.44), (new_id, demo_sem, 'writing', 0.42), (new_id, demo_sem, 'speaking', 0.58), (new_id, demo_sem, 'language', 0.49);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.482, 'B-');
INSERT INTO behavior_logs (student_id, date, type, note, is_flagged, teacher_id) VALUES (new_id, '2025-04-15', 'abc', 'Yelled at classmate during group work, escalated when asked to apologize', true, t_id);

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Vic Gu', '구빅', 5, '매', 11, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.84), (new_id, demo_sem, 'phonics', 0.80), (new_id, demo_sem, 'writing', 0.82), (new_id, demo_sem, 'speaking', 0.90), (new_id, demo_sem, 'language', 0.85);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.842, 'A');
INSERT INTO reading_assessments (student_id, date, cwpm, accuracy, level) VALUES (new_id, '2025-04-15', 75, 0.94, 'J');

INSERT INTO students (english_name, korean_name, grade, korean_class, class_number, english_class, teacher_id, is_active, is_demo) VALUES ('Willa Jo', '조윌라', 5, '매', 12, 'Sample', t_id, true, true) RETURNING id INTO new_id;
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade) VALUES (new_id, demo_sem, 'reading', 0.68), (new_id, demo_sem, 'phonics', 0.64), (new_id, demo_sem, 'writing', 0.66), (new_id, demo_sem, 'speaking', 0.76), (new_id, demo_sem, 'language', 0.69);
INSERT INTO semester_grades (student_id, semester_id, domain, final_grade, behavior_grade) VALUES (new_id, demo_sem, 'overall', 0.686, 'B+');
INSERT INTO attendance (student_id, date, status) VALUES (new_id, '2025-04-14', 'absent'), (new_id, '2025-04-15', 'present'), (new_id, '2025-04-16', 'present');

RAISE NOTICE 'Demo data created: 36 students in Sample class (12 per grade 2-4-5)';
END $$;

-- ================================================================
-- CLEANUP COMMANDS:
-- Archive:  UPDATE students SET is_active = false WHERE is_demo = true;
-- Delete:   DELETE FROM semester_grades WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
--           DELETE FROM reading_assessments WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
--           DELETE FROM behavior_logs WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
--           DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE is_demo = true);
--           DELETE FROM students WHERE is_demo = true;
--           DELETE FROM semesters WHERE name = 'Demo Semester';
-- ================================================================
