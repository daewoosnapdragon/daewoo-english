-- ============================================================================
-- MIGRATION v18 - Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Fix behavior_logs type constraint: add 'negative' and 'abc'
ALTER TABLE behavior_logs DROP CONSTRAINT IF EXISTS behavior_logs_type_check;
ALTER TABLE behavior_logs ADD CONSTRAINT behavior_logs_type_check 
  CHECK (type IN ('positive', 'concern', 'parent_contact', 'intervention', 'note', 'negative', 'abc'));

-- 2. Fix attendance status constraint: just P/A/T
UPDATE attendance SET status = 'absent' WHERE status = 'excused';
UPDATE attendance SET status = 'absent' WHERE status = 'field_trip';
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
  CHECK (status IN ('present', 'absent', 'tardy'));

-- 3. Add password column to teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password TEXT DEFAULT NULL;

-- 4. Add photo_url column to teachers (if not already done)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- 5. Set teacher passwords
UPDATE teachers SET password = 'daewoolily2026' WHERE english_class = 'Lily' AND role = 'teacher';
UPDATE teachers SET password = 'daewoocamellia2026' WHERE english_class = 'Camellia' AND role = 'teacher';
UPDATE teachers SET password = 'daewoodaisy2026' WHERE english_class = 'Daisy' AND role = 'teacher';
UPDATE teachers SET password = 'daewoosunflower2026' WHERE english_class = 'Sunflower' AND role = 'teacher';
UPDATE teachers SET password = 'daewoomarigold2026' WHERE english_class = 'Marigold' AND role = 'teacher';
UPDATE teachers SET password = 'daewoosnapdragon2026' WHERE english_class = 'Snapdragon' AND role = 'teacher';
UPDATE teachers SET password = 'daewooadmin2026' WHERE role = 'admin';

-- 6. Kyla = head teacher (keeps Snapdragon class but gets admin privileges)
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_head_teacher BOOLEAN DEFAULT false;
UPDATE teachers SET is_head_teacher = true WHERE english_class = 'Snapdragon' AND role = 'teacher';

-- 7. Fix semesters type constraint
ALTER TABLE semesters DROP CONSTRAINT IF EXISTS semesters_type_check;
ALTER TABLE semesters ADD CONSTRAINT semesters_type_check 
  CHECK (type IN ('fall_mid', 'fall_final', 'spring_mid', 'spring_final', 'fall', 'spring'));

-- 8. Add cutoff date columns to semesters
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS midterm_cutoff_date DATE;
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS report_card_cutoff_date DATE;

-- 9. Add transfer student fields
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT false;
ALTER TABLE students ADD COLUMN IF NOT EXISTS transfer_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS transfer_notes TEXT DEFAULT '';

-- 10. Add shared assessment columns
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS shared_with_classes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS source_assessment_id UUID;

-- 11. Add photo_url to teachers if not present
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- 12. Fix attendance status constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'tardy', 'field_trip'));

-- Verify:
SELECT name, english_class, role, password FROM teachers ORDER BY english_class;
