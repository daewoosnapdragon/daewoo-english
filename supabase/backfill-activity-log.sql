-- ============================================================================
-- BACKFILL: past saves into the activity log
-- Run once in the Supabase SQL Editor, after migration-activity-log.sql.
-- Safe to re-run: it removes its own earlier rows (path = 'backfill') first.
--
-- The live log began when its table was created. Everything before that is
-- rebuilt here from the records themselves: who saved each grade, comment,
-- assessment, attendance day, lesson plan, behavior note and notice, and
-- when. Sign-ins cannot be rebuilt: nothing recorded them. Rows are folded
-- the way the live log folds them, one line per teacher, thing and day,
-- with a count. Attendance rows carry no time, so they are placed at 15:30
-- on the day they cover and say so.
--
-- Every step first checks that its table and columns exist on THIS database
-- (the live tables do not all match the migration files) and skips what is
-- not there. The notes at the end say which steps ran.
-- ============================================================================

BEGIN;

DELETE FROM activity_log WHERE path = 'backfill';

-- Only what happened before the live log started; everything after is already in it.
CREATE TEMP TABLE bf_cutoff ON COMMIT DROP AS
  SELECT COALESCE((SELECT min(created_at) FROM activity_log WHERE path <> 'backfill'), now()) AS cutoff;

-- The first of the candidate columns that exists on a table, or NULL when none (or no table).
CREATE OR REPLACE FUNCTION pg_temp.bf_col(tbl text, VARIADIC cands text[]) RETURNS text LANGUAGE sql AS $f$
  SELECT c FROM unnest(cands) WITH ORDINALITY AS u(c, i)
  WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = tbl AND column_name = c)
  ORDER BY i LIMIT 1
$f$;

DO $do$
DECLARE who text; ts text; rt text;
BEGIN
  -- ── Scoring: one line per teacher, assessment and day, counting the papers saved ──
  who := pg_temp.bf_col('grades', 'entered_by'); ts := pg_temp.bf_col('grades', 'updated_at', 'entered_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT g.%1$I, 'scored', a.name || CASE WHEN a.english_class IS NULL THEN '' ELSE ' · ' || a.english_class END,
             'backfill', count(*), min(g.%2$I), max(g.%2$I)
      FROM grades g JOIN assessments a ON a.id = g.assessment_id
      WHERE g.%1$I IS NOT NULL AND g.%2$I < (SELECT cutoff FROM bf_cutoff)
      GROUP BY g.%1$I, a.id, a.name, a.english_class, (g.%2$I AT TIME ZONE 'Asia/Seoul')::date
    $q$, who, ts);
    RAISE NOTICE 'scoring: done';
  ELSE RAISE NOTICE 'scoring: skipped (no who/when columns on grades)'; END IF;

  -- ── Assessments created ──
  who := pg_temp.bf_col('assessments', 'created_by'); ts := pg_temp.bf_col('assessments', 'created_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT a.%1$I, 'created', a.name || CASE WHEN a.english_class IS NULL THEN '' ELSE ' · ' || a.english_class END || ' · Grade ' || a.grade,
             'backfill', 1, a.%2$I, a.%2$I
      FROM assessments a WHERE a.%1$I IS NOT NULL AND a.%2$I < (SELECT cutoff FROM bf_cutoff)
    $q$, who, ts);
    RAISE NOTICE 'assessments: done';
  ELSE RAISE NOTICE 'assessments: skipped'; END IF;

  -- ── Comments, by document ──
  who := pg_temp.bf_col('comments', 'created_by'); ts := pg_temp.bf_col('comments', 'created_at'); rt := pg_temp.bf_col('comments', 'report_type');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT c.%1$I, 'saved', %3$s || ' · ' || s.english_name, 'backfill', 1, c.%2$I, COALESCE(%4$s, c.%2$I)
      FROM comments c JOIN students s ON s.id = c.student_id
      WHERE c.%1$I IS NOT NULL AND COALESCE(c.text, '') <> '' AND c.%2$I < (SELECT cutoff FROM bf_cutoff)
    $q$, who, ts,
      CASE WHEN rt IS NOT NULL THEN format('(CASE WHEN c.%I = ''progress_report'' THEN ''Progress report comment'' ELSE ''Report card comment'' END)', rt) ELSE '''Comment''' END,
      CASE WHEN pg_temp.bf_col('comments', 'updated_at') IS NOT NULL THEN 'c.updated_at' ELSE 'NULL' END);
    RAISE NOTICE 'comments: done';
  ELSE RAISE NOTICE 'comments: skipped'; END IF;

  -- ── Attendance: one line per teacher, class and day; the records carry no time ──
  who := pg_temp.bf_col('attendance', 'recorded_by', 'entered_by', 'created_by');
  IF who IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT at.%1$I, 'saved',
             'Attendance · ' || s.english_class || ' · Grade ' || s.grade || ' · ' || at.date || ' · ' || count(*) || ' students · time not recorded',
             'backfill', 1,
             (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul',
             (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul'
      FROM attendance at JOIN students s ON s.id = at.student_id
      WHERE at.%1$I IS NOT NULL AND (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul' < (SELECT cutoff FROM bf_cutoff)
      GROUP BY at.%1$I, s.english_class, s.grade, at.date
    $q$, who);
    RAISE NOTICE 'attendance: done';
  ELSE RAISE NOTICE 'attendance: skipped'; END IF;

  -- ── Behavior notes ──
  who := pg_temp.bf_col('behavior_logs', 'teacher_id', 'created_by'); ts := pg_temp.bf_col('behavior_logs', 'created_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT b.%1$I, 'saved', 'Behavior note · ' || s.english_name, 'backfill', 1, b.%2$I, b.%2$I
      FROM behavior_logs b JOIN students s ON s.id = b.student_id
      WHERE b.%1$I IS NOT NULL AND b.%2$I < (SELECT cutoff FROM bf_cutoff)
    $q$, who, ts);
    RAISE NOTICE 'behavior notes: done';
  ELSE RAISE NOTICE 'behavior notes: skipped'; END IF;

  -- ── Notices ──
  who := pg_temp.bf_col('notices', 'author_id', 'created_by'); ts := pg_temp.bf_col('notices', 'created_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT n.%1$I, 'posted', 'Notice · ' || left(n.body, 80), 'backfill', 1, n.%2$I, n.%2$I
      FROM notices n WHERE n.%1$I IS NOT NULL AND n.%2$I < (SELECT cutoff FROM bf_cutoff)
    $q$, who, ts);
    RAISE NOTICE 'notices: done';
  ELSE RAISE NOTICE 'notices: skipped'; END IF;

  -- ── Lesson plans: daily plans ──
  who := pg_temp.bf_col('teacher_daily_plans', 'updated_by', 'created_by'); ts := pg_temp.bf_col('teacher_daily_plans', 'updated_at', 'created_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT p.%1$I, 'saved', 'Lesson plans · ' || p.english_class, 'backfill', count(*), min(p.%2$I), max(p.%2$I)
      FROM teacher_daily_plans p WHERE p.%1$I IS NOT NULL AND p.%2$I < (SELECT cutoff FROM bf_cutoff)
      GROUP BY p.%1$I, p.english_class, (p.%2$I AT TIME ZONE 'Asia/Seoul')::date
    $q$, who, ts);
    RAISE NOTICE 'daily plans: done';
  ELSE RAISE NOTICE 'daily plans: skipped'; END IF;

  -- ── Lesson plans: the month view ──
  who := pg_temp.bf_col('parent_calendar', 'updated_by', 'created_by'); ts := pg_temp.bf_col('parent_calendar', 'updated_at', 'created_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT p.%1$I, 'saved', 'Lesson plans · ' || replace(p.english_class, '_hw', '') || ' · Grade ' || p.grade, 'backfill', count(*), min(p.%2$I), max(p.%2$I)
      FROM parent_calendar p WHERE p.%1$I IS NOT NULL AND p.%2$I < (SELECT cutoff FROM bf_cutoff)
      GROUP BY p.%1$I, replace(p.english_class, '_hw', ''), p.grade, (p.%2$I AT TIME ZONE 'Asia/Seoul')::date
    $q$, who, ts);
    RAISE NOTICE 'month plans: done';
  ELSE RAISE NOTICE 'month plans: skipped'; END IF;

  -- ── Student notes ──
  who := pg_temp.bf_col('student_notes', 'created_by', 'teacher_id', 'author_id'); ts := pg_temp.bf_col('student_notes', 'created_at', 'updated_at');
  IF who IS NOT NULL AND ts IS NOT NULL THEN
    EXECUTE format($q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT n.%1$I, 'saved', 'Student note · ' || s.english_name, 'backfill', 1, n.%2$I, n.%2$I
      FROM student_notes n JOIN students s ON s.id = n.student_id
      WHERE n.%1$I IS NOT NULL AND n.%2$I < (SELECT cutoff FROM bf_cutoff)
    $q$, who, ts);
    RAISE NOTICE 'student notes: done';
  ELSE RAISE NOTICE 'student notes: skipped (no who column on student_notes)'; END IF;
END $do$;

COMMIT;

-- What was rebuilt, by kind of action and by teacher.
SELECT action, count(*) AS lines, sum(count) AS saves, min(created_at) AS earliest, max(updated_at) AS latest
FROM activity_log WHERE path = 'backfill' GROUP BY action ORDER BY action;
SELECT t.name, count(*) AS lines, min(l.created_at) AS earliest, max(l.updated_at) AS latest
FROM activity_log l LEFT JOIN teachers t ON t.id = l.teacher_id
WHERE l.path = 'backfill' GROUP BY t.name ORDER BY t.name;
