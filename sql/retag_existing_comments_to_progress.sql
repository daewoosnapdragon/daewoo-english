-- ONE-TIME data fix (run once, after the report_type migration).
-- When report_type was added, every existing comment defaulted to 'report_card'.
-- Those were actually written as progress-report comments (pre-split they showed on
-- both documents), so move them onto the Progress Report. The NOT EXISTS guard avoids
-- a unique-key conflict for any student that already has a progress_report comment.
UPDATE comments c
SET report_type = 'progress_report'
WHERE c.report_type = 'report_card'
  AND NOT EXISTS (
    SELECT 1 FROM comments p
    WHERE p.student_id = c.student_id
      AND p.semester_id = c.semester_id
      AND p.report_type = 'progress_report'
  );
