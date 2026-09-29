-- ═══════════════════════════════════════════════════════════════════
-- Put days off and field trips on the attendance record
-- Run in the Supabase SQL Editor. Safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════
--
-- The attendance page now marks every student absent, with the day as the
-- note, on each day off or field trip the first time it is opened. This
-- script does the same in one go for every class, for days that have
-- already passed, so nobody has to open each date. A day that already has
-- any attendance for a student is left exactly as it is.
--
-- Step 1 makes sure Chuseok 2026 (Thu 24 – Fri 25 September) is on the
-- calendar as a day off, in case it was never added. Step 2 fills the
-- record for every past day off and field trip on the calendar, following
-- the same rules as the page: weekends are skipped, a grade's no-class
-- weekday from Settings is skipped, and an event with target grades only
-- touches those grades.

-- Step 1: Chuseok on the calendar (no-op if a day off already covers both days)
INSERT INTO calendar_events (title, date, end_date, type, description)
SELECT 'Chuseok', DATE '2026-09-24', DATE '2026-09-25', 'day_off', ''
WHERE NOT EXISTS (
  SELECT 1 FROM calendar_events e
  WHERE e.type = 'day_off'
    AND e.date <= DATE '2026-09-24'
    AND COALESCE(e.end_date, e.date) >= DATE '2026-09-25'
    AND (e.target_grades IS NULL OR cardinality(e.target_grades) = 0)
);

-- Step 2: everyone absent on every past away day that has no attendance yet
WITH rules AS (
  -- Grade / weekday pairs with no English class (Settings → schedule rules).
  -- Falls back to the app default, no Grade 5 on Mondays, when unset.
  SELECT (r->>'grade')::int AS grade, (r->>'weekday')::int AS weekday
  FROM app_settings s, jsonb_array_elements(s.value::jsonb->'noClass') r
  WHERE s.key = 'schedule_rules'
  UNION ALL
  SELECT 5, 1 WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'schedule_rules')
),
away AS (
  -- One row per (day, event)
  SELECT d::date AS date, e.title, e.type, e.target_grades, e.created_at
  FROM calendar_events e
  CROSS JOIN LATERAL generate_series(e.date, GREATEST(COALESCE(e.end_date, e.date), e.date), INTERVAL '1 day') AS d
  WHERE e.type IN ('day_off', 'field_trip')
    AND d::date <= CURRENT_DATE
    AND EXTRACT(ISODOW FROM d) < 6
),
rows_to_add AS (
  SELECT DISTINCT ON (s.id, a.date) s.id AS student_id, a.date, a.title AS note
  FROM away a
  JOIN students s ON s.is_active = true
    AND (a.target_grades IS NULL OR cardinality(a.target_grades) = 0 OR s.grade = ANY (a.target_grades))
  WHERE NOT EXISTS (SELECT 1 FROM rules r WHERE r.grade = s.grade AND r.weekday = EXTRACT(DOW FROM a.date))
    -- leave a day alone when any student in that grade and class already has a mark on it
    AND NOT EXISTS (
      SELECT 1 FROM attendance t JOIN students s2 ON s2.id = t.student_id
      WHERE t.date = a.date AND s2.grade = s.grade AND s2.english_class = s.english_class
    )
  -- a day off wins over a trip on the same day
  ORDER BY s.id, a.date, CASE WHEN a.type = 'day_off' THEN 0 ELSE 1 END, a.created_at
)
INSERT INTO attendance (student_id, date, status, note)
SELECT student_id, date, 'absent', note FROM rows_to_add
ON CONFLICT (student_id, date) DO NOTHING;

-- Step 3: what Chuseok looks like now, per class and grade
SELECT s.english_class, s.grade, t.date, t.status, t.note, COUNT(*) AS students
FROM attendance t JOIN students s ON s.id = t.student_id
WHERE t.date BETWEEN DATE '2026-09-24' AND DATE '2026-09-25'
GROUP BY 1, 2, 3, 4, 5
ORDER BY 1, 2, 3, 4;
