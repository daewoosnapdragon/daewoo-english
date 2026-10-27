-- ONE-TIME data fix (27 Oct 2026). Run in the Supabase SQL editor, in order.
--
-- The Comments tab on the Reports page wrote every comment to the report card,
-- and the Report card tab was the one the page opened on, so progress-report
-- comments this semester were saved as report-card comments. This moves them
-- onto the progress report for the ACTIVE semester, student by student, and
-- only where the progress report has no comment of its own yet.
--
-- Step 1 shows what will move. Read it before running steps 2 and 3.

-- ── 1. What will move ───────────────────────────────────────────────
SELECT s.english_class, s.grade, s.english_name, s.korean_name,
       left(c.text, 90) AS comment_starts, c.updated_at, t.name AS written_by
FROM comments c
JOIN students s ON s.id = c.student_id
LEFT JOIN teachers t ON t.id = c.created_by
WHERE c.report_type = 'report_card'
  AND c.semester_id IN (SELECT id FROM semesters WHERE is_active)
  AND coalesce(c.text, '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM comments p
    WHERE p.student_id = c.student_id AND p.semester_id = c.semester_id
      AND p.report_type = 'progress_report'
      AND (coalesce(p.text, '') <> '' OR coalesce(p.is_skipped, false))
  )
ORDER BY s.english_class, s.grade, s.english_name;

-- ── 1b. Students with a comment on BOTH documents: left alone, check by hand ──
SELECT s.english_class, s.grade, s.english_name,
       left(p.text, 60) AS progress_comment, left(c.text, 60) AS report_card_comment
FROM comments c
JOIN comments p ON p.student_id = c.student_id AND p.semester_id = c.semester_id AND p.report_type = 'progress_report'
JOIN students s ON s.id = c.student_id
WHERE c.report_type = 'report_card'
  AND c.semester_id IN (SELECT id FROM semesters WHERE is_active)
  AND coalesce(c.text, '') <> '' AND coalesce(p.text, '') <> ''
ORDER BY s.english_class, s.grade, s.english_name;

-- ── 2. Clear empty, unskipped progress rows that would block the move ──
DELETE FROM comments p
WHERE p.report_type = 'progress_report'
  AND p.semester_id IN (SELECT id FROM semesters WHERE is_active)
  AND coalesce(p.text, '') = '' AND NOT coalesce(p.is_skipped, false)
  AND EXISTS (
    SELECT 1 FROM comments c
    WHERE c.student_id = p.student_id AND c.semester_id = p.semester_id
      AND c.report_type = 'report_card' AND coalesce(c.text, '') <> ''
  );

-- ── 3. Move the comments (same rows step 1 listed) ──────────────────
UPDATE comments c
SET report_type = 'progress_report', updated_at = now()
WHERE c.report_type = 'report_card'
  AND c.semester_id IN (SELECT id FROM semesters WHERE is_active)
  AND coalesce(c.text, '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM comments p
    WHERE p.student_id = c.student_id AND p.semester_id = c.semester_id
      AND p.report_type = 'progress_report'
  );
