-- ═══════════════════════════════════════════════════════════════════
-- Fix Kim Ha Jin (Leo) data swap between Daisy and Snapdragon
-- ═══════════════════════════════════════════════════════════════════

-- Step 1: Find both students
-- Run this first to get their IDs
SELECT id, korean_name, english_name, english_class, grade, korean_class, class_number
FROM students
WHERE korean_name LIKE '%하진%' AND english_name LIKE '%Leo%' AND is_active = true
ORDER BY english_class;

-- The output will show two rows like:
-- id: aaaa-..., english_class: Daisy
-- id: bbbb-..., english_class: Snapdragon

-- Step 2: Check what data each has (run after step 1 to verify which has wrong data)
-- Replace DAISY_ID and SNAP_ID with actual IDs from step 1

-- Check grades
-- SELECT student_id, a.name as assessment, a.english_class as assessment_class, g.score
-- FROM grades g JOIN assessments a ON g.assessment_id = a.id
-- WHERE student_id IN ('DAISY_ID', 'SNAP_ID')
-- ORDER BY student_id, a.created_at;

-- Check reading assessments  
-- SELECT student_id, cwpm, date, accuracy_rate FROM reading_assessments
-- WHERE student_id IN ('DAISY_ID', 'SNAP_ID')
-- ORDER BY student_id, date;

-- Step 3: Swap the data
-- This swaps ALL linked data between the two students.
-- Replace DAISY_ID and SNAP_ID with actual UUIDs from step 1.
-- 
-- The approach: we can't use a temp UUID because of FK constraints.
-- Instead we swap directly using a DO block.

-- UNCOMMENT AND RUN AFTER VERIFYING IDs:

-- DO $$
-- DECLARE
--   daisy_id UUID := 'DAISY_ID';  -- Replace with actual UUID
--   snap_id UUID := 'SNAP_ID';    -- Replace with actual UUID
--   temp_id UUID := gen_random_uuid();
-- BEGIN
--   -- Temporarily disable FK checks for grades
--   UPDATE grades SET student_id = temp_id WHERE student_id = daisy_id;
--   UPDATE grades SET student_id = daisy_id WHERE student_id = snap_id;
--   UPDATE grades SET student_id = snap_id WHERE student_id = temp_id;
--
--   UPDATE reading_assessments SET student_id = temp_id WHERE student_id = daisy_id;
--   UPDATE reading_assessments SET student_id = daisy_id WHERE student_id = snap_id;
--   UPDATE reading_assessments SET student_id = snap_id WHERE student_id = temp_id;
--
--   UPDATE attendance SET student_id = temp_id WHERE student_id = daisy_id;
--   UPDATE attendance SET student_id = daisy_id WHERE student_id = snap_id;
--   UPDATE attendance SET student_id = snap_id WHERE student_id = temp_id;
--
--   UPDATE behavior_logs SET student_id = temp_id WHERE student_id = daisy_id;
--   UPDATE behavior_logs SET student_id = daisy_id WHERE student_id = snap_id;
--   UPDATE behavior_logs SET student_id = snap_id WHERE student_id = temp_id;
--
--   UPDATE semester_grades SET student_id = temp_id WHERE student_id = daisy_id;
--   UPDATE semester_grades SET student_id = daisy_id WHERE student_id = snap_id;
--   UPDATE semester_grades SET student_id = snap_id WHERE student_id = temp_id;
-- END $$;

-- Step 4: Verify the fix
-- SELECT s.english_name, s.english_class, COUNT(g.id) as grade_count
-- FROM students s LEFT JOIN grades g ON s.id = g.student_id
-- WHERE s.korean_name LIKE '%하진%' AND s.english_name LIKE '%Leo%'
-- GROUP BY s.id, s.english_name, s.english_class;
