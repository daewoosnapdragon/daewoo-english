-- Fix student_groups type constraint to allow new group types: reading, writing
-- The original constraint only allowed: skill, fluency, litCircle, partner, custom
-- The code now also uses: reading, writing

ALTER TABLE student_groups DROP CONSTRAINT IF EXISTS student_groups_type_check;
ALTER TABLE student_groups ADD CONSTRAINT student_groups_type_check 
  CHECK (type IN ('skill', 'fluency', 'litCircle', 'partner', 'custom', 'reading', 'writing'));

-- Migrate any old 'fluency' type groups to 'reading'
UPDATE student_groups SET type = 'reading' WHERE type = 'fluency';
