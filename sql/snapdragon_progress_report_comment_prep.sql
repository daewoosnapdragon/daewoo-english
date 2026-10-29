-- Snapdragon progress-report prep: one row per current Snapdragon student with
-- this semester's grades and every comment written for them in past semesters.
-- Read-only. Run in the Supabase SQL editor.
--
-- "This semester" is the semester flagged is_active. Grades come from
-- semester_grades the same way the report does: final_grade (teacher override)
-- wins over calculated_grade, and a domain marked N/A for the student or for the
-- whole class is left blank and kept out of the overall. Overall is the plain
-- average of the graded domains, rounded to one decimal, which is how the
-- progress report computes it (the 'overall' row in semester_grades only
-- carries the behavior grade).
--
-- Past comments are every non-empty comment from any semester other than the
-- active one, both progress reports and report cards, newest first, one per
-- line. The draft already saved for THIS progress report (if any) is in its
-- own column so you can see what is there before overwriting it.

WITH active AS (
  SELECT id, name, academic_year, type
  FROM semesters
  WHERE is_active
  LIMIT 1
),
roster AS (
  SELECT s.id, s.korean_name, s.english_name, s.grade, s.korean_class, s.class_number,
         s.english_class, s.is_transfer, s.notes
  FROM students s
  WHERE s.english_class = 'Snapdragon'
    AND s.is_active
    AND NOT coalesce(s.is_demo, false)
),
class_na AS (
  -- Domains switched off for a whole class + grade this semester.
  SELECT english_class, grade, domain
  FROM class_report_settings
  WHERE semester_id = (SELECT id FROM active) AND is_na
),
domain_grades AS (
  SELECT sg.student_id,
         sg.domain,
         CASE
           WHEN coalesce(sg.is_na, false) THEN NULL
           WHEN EXISTS (SELECT 1 FROM class_na c
                        WHERE c.english_class = r.english_class
                          AND c.grade = r.grade
                          AND c.domain = sg.domain) THEN NULL
           ELSE coalesce(sg.final_grade, sg.calculated_grade)
         END AS pct,
         sg.behavior_grade
  FROM semester_grades sg
  JOIN roster r ON r.id = sg.student_id
  WHERE sg.semester_id = (SELECT id FROM active)
),
pivot AS (
  SELECT student_id,
         max(pct) FILTER (WHERE domain = 'reading')  AS reading,
         max(pct) FILTER (WHERE domain = 'phonics')  AS phonics,
         max(pct) FILTER (WHERE domain = 'writing')  AS writing,
         max(pct) FILTER (WHERE domain = 'speaking') AS speaking,
         max(pct) FILTER (WHERE domain = 'language') AS language,
         round(avg(pct) FILTER (WHERE domain <> 'overall'), 1) AS overall,
         max(behavior_grade) FILTER (WHERE domain = 'overall') AS behavior_grade
  FROM domain_grades
  GROUP BY student_id
),
monthly_behavior AS (
  SELECT student_id,
         string_agg(to_char(to_date(month::text, 'MM'), 'Mon') || ': ' || grade,
                    ', ' ORDER BY month) AS monthly_behavior
  FROM monthly_behavior_grades
  WHERE semester_id = (SELECT id FROM active)
  GROUP BY student_id
),
current_draft AS (
  SELECT c.student_id, c.text, c.is_skipped
  FROM comments c
  WHERE c.semester_id = (SELECT id FROM active)
    AND c.report_type = 'progress_report'
),
past AS (
  SELECT c.student_id,
         string_agg(
           '[' || sem.name || ' · '
               || CASE c.report_type WHEN 'progress_report' THEN 'Progress Report' ELSE 'Report Card' END
               || '] ' || c.text,
           E'\n\n'
           ORDER BY sem.start_date DESC NULLS LAST, sem.created_at DESC, c.report_type
         ) AS past_comments,
         count(*) AS past_comment_count
  FROM comments c
  JOIN semesters sem ON sem.id = c.semester_id
  WHERE c.semester_id <> (SELECT id FROM active)
    AND coalesce(c.text, '') <> ''
  GROUP BY c.student_id
)
SELECT
  r.grade,
  r.korean_class,
  r.class_number,
  r.english_name,
  r.korean_name,
  (SELECT name FROM active)        AS semester,
  p.reading,
  p.phonics,
  p.writing,
  p.speaking,
  p.language,
  p.overall,
  CASE
    WHEN p.overall IS NULL THEN NULL
    WHEN round(p.overall) >= 97 THEN 'A+'
    WHEN round(p.overall) >= 93 THEN 'A'
    WHEN round(p.overall) >= 90 THEN 'A-'
    WHEN round(p.overall) >= 87 THEN 'B+'
    WHEN round(p.overall) >= 83 THEN 'B'
    WHEN round(p.overall) >= 80 THEN 'B-'
    WHEN round(p.overall) >= 77 THEN 'C+'
    WHEN round(p.overall) >= 73 THEN 'C'
    WHEN round(p.overall) >= 70 THEN 'C-'
    WHEN round(p.overall) >= 67 THEN 'D+'
    WHEN round(p.overall) >= 63 THEN 'D'
    WHEN round(p.overall) >= 60 THEN 'D-'
    ELSE 'E'
  END                              AS overall_letter,
  p.behavior_grade,
  mb.monthly_behavior,
  r.is_transfer,
  nullif(r.notes, '')              AS student_notes,
  cd.is_skipped                    AS current_comment_skipped,
  nullif(cd.text, '')              AS current_progress_comment_draft,
  coalesce(pc.past_comment_count, 0) AS past_comment_count,
  pc.past_comments
FROM roster r
LEFT JOIN pivot            p  ON p.student_id  = r.id
LEFT JOIN monthly_behavior mb ON mb.student_id = r.id
LEFT JOIN current_draft    cd ON cd.student_id = r.id
LEFT JOIN past             pc ON pc.student_id = r.id
ORDER BY r.grade, r.korean_class, r.class_number;


-- ── Optional: past comments one per row (easier to read than the merged column) ──
-- SELECT r.grade, r.english_name, r.korean_name,
--        sem.name AS semester, sem.academic_year, c.report_type,
--        c.text, c.updated_at, t.name AS written_by
-- FROM students r
-- JOIN comments c ON c.student_id = r.id
-- JOIN semesters sem ON sem.id = c.semester_id
-- LEFT JOIN teachers t ON t.id = c.created_by
-- WHERE r.english_class = 'Snapdragon' AND r.is_active AND NOT coalesce(r.is_demo, false)
--   AND NOT sem.is_active
--   AND coalesce(c.text, '') <> ''
-- ORDER BY r.grade, r.korean_class, r.class_number, sem.start_date DESC NULLS LAST, c.report_type;
