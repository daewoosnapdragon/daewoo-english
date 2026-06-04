-- Separate Report Card comments from Progress Report comments.
-- Previously both documents shared one row keyed by (student_id, semester_id),
-- so editing a Progress Report comment overwrote the Report Card comment (and
-- vice versa). Adding report_type gives each document its own comment row.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'report_card';

-- Replace the old (student_id, semester_id) unique key with one that includes report_type.
-- (Existing rows keep report_type = 'report_card', the formal end-of-semester document.)
-- Drop the new key too so this whole block is safe to re-run.
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_student_id_semester_id_key;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_student_semester_type_key;
ALTER TABLE comments ADD CONSTRAINT comments_student_semester_type_key
  UNIQUE (student_id, semester_id, report_type);
