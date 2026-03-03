-- ============================================================================
-- Add grade column to teacher_daily_plans
-- Fixes bug where switching grades shows/overwrites other grades' plans
-- ============================================================================

-- Add grade column (default 0 for existing rows — will be updated by app)
ALTER TABLE teacher_daily_plans ADD COLUMN IF NOT EXISTS grade INT NOT NULL DEFAULT 0;

-- Drop old unique constraint and index
ALTER TABLE teacher_daily_plans DROP CONSTRAINT IF EXISTS teacher_daily_plans_date_english_class_key;
DROP INDEX IF EXISTS idx_teacher_plans_date_class;

-- Create new unique constraint including grade
ALTER TABLE teacher_daily_plans ADD CONSTRAINT teacher_daily_plans_date_class_grade_key UNIQUE (date, english_class, grade);

-- New index
CREATE INDEX IF NOT EXISTS idx_teacher_plans_date_class_grade ON teacher_daily_plans(date, english_class, grade);

-- For existing data: duplicate each row for grades 2-5 so nothing is lost
-- (existing rows have grade=0, we'll create copies for each grade)
INSERT INTO teacher_daily_plans (date, english_class, plan_text, updated_by, updated_at, grade)
SELECT date, english_class, plan_text, updated_by, updated_at, g.grade
FROM teacher_daily_plans, (VALUES (2),(3),(4),(5)) AS g(grade)
WHERE teacher_daily_plans.grade = 0
ON CONFLICT (date, english_class, grade) DO NOTHING;

-- Remove the old grade=0 rows
DELETE FROM teacher_daily_plans WHERE grade = 0;
