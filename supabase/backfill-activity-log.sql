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
-- ============================================================================

BEGIN;

DELETE FROM activity_log WHERE path = 'backfill';

-- Only what happened before the live log started; everything after is already in it.
CREATE TEMP TABLE bf_cutoff ON COMMIT DROP AS
  SELECT COALESCE((SELECT min(created_at) FROM activity_log WHERE path <> 'backfill'), now()) AS cutoff;

-- ── Scoring: one line per teacher, assessment and day, counting the papers saved ──
INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
SELECT g.entered_by, 'scored',
       a.name || CASE WHEN a.english_class IS NULL THEN '' ELSE ' · ' || a.english_class END,
       'backfill', count(*), min(g.updated_at), max(g.updated_at)
FROM grades g
JOIN assessments a ON a.id = g.assessment_id
WHERE g.entered_by IS NOT NULL
  AND g.updated_at < (SELECT cutoff FROM bf_cutoff)
GROUP BY g.entered_by, a.id, a.name, a.english_class, (g.updated_at AT TIME ZONE 'Asia/Seoul')::date;

-- ── Assessments created ──
INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
SELECT a.created_by, 'created',
       a.name || CASE WHEN a.english_class IS NULL THEN '' ELSE ' · ' || a.english_class END || ' · Grade ' || a.grade,
       'backfill', 1, a.created_at, a.created_at
FROM assessments a
WHERE a.created_by IS NOT NULL
  AND a.created_at < (SELECT cutoff FROM bf_cutoff);

-- ── Comments, by document ──
INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
SELECT c.created_by, 'saved',
       (CASE WHEN c.report_type = 'progress_report' THEN 'Progress report comment' ELSE 'Report card comment' END) || ' · ' || s.english_name,
       'backfill', 1, c.created_at, COALESCE(c.updated_at, c.created_at)
FROM comments c
JOIN students s ON s.id = c.student_id
WHERE c.created_by IS NOT NULL
  AND COALESCE(c.text, '') <> ''
  AND c.created_at < (SELECT cutoff FROM bf_cutoff);

-- ── Attendance: one line per teacher, class and day; the records carry no time ──
INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
SELECT at.recorded_by, 'saved',
       'Attendance · ' || s.english_class || ' · Grade ' || s.grade || ' · ' || at.date || ' · ' || count(*) || ' students · time not recorded',
       'backfill', 1,
       (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul',
       (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul'
FROM attendance at
JOIN students s ON s.id = at.student_id
WHERE at.recorded_by IS NOT NULL
  AND (at.date::text || ' 15:30')::timestamp AT TIME ZONE 'Asia/Seoul' < (SELECT cutoff FROM bf_cutoff)
GROUP BY at.recorded_by, s.english_class, s.grade, at.date;

-- ── Behavior notes ──
INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
SELECT b.teacher_id, 'saved', 'Behavior note · ' || s.english_name, 'backfill', 1, b.created_at, b.created_at
FROM behavior_logs b
JOIN students s ON s.id = b.student_id
WHERE b.teacher_id IS NOT NULL
  AND b.created_at < (SELECT cutoff FROM bf_cutoff);

-- ── Tables that exist only if their migration was run ──
DO $$
BEGIN
  IF to_regclass('public.notices') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT n.author_id, 'posted', 'Notice · ' || left(n.body, 80), 'backfill', 1, n.created_at, n.created_at
      FROM notices n
      WHERE n.author_id IS NOT NULL AND n.created_at < (SELECT cutoff FROM bf_cutoff)
    $q$;
  END IF;
  IF to_regclass('public.teacher_daily_plans') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT p.updated_by, 'saved', 'Lesson plans · ' || p.english_class, 'backfill', count(*), min(p.updated_at), max(p.updated_at)
      FROM teacher_daily_plans p
      WHERE p.updated_by IS NOT NULL AND p.updated_at < (SELECT cutoff FROM bf_cutoff)
      GROUP BY p.updated_by, p.english_class, (p.updated_at AT TIME ZONE 'Asia/Seoul')::date
    $q$;
  END IF;
  IF to_regclass('public.parent_calendar') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT p.updated_by, 'saved', 'Lesson plans · ' || replace(p.english_class, '_hw', '') || ' · Grade ' || p.grade, 'backfill', count(*), min(p.updated_at), max(p.updated_at)
      FROM parent_calendar p
      WHERE p.updated_by IS NOT NULL AND p.updated_at < (SELECT cutoff FROM bf_cutoff)
      GROUP BY p.updated_by, replace(p.english_class, '_hw', ''), p.grade, (p.updated_at AT TIME ZONE 'Asia/Seoul')::date
    $q$;
  END IF;
  IF to_regclass('public.student_notes') IS NOT NULL THEN
    EXECUTE $q$
      INSERT INTO activity_log (teacher_id, action, detail, path, count, created_at, updated_at)
      SELECT n.created_by, 'saved', 'Student note · ' || s.english_name, 'backfill', 1, n.created_at, n.created_at
      FROM student_notes n JOIN students s ON s.id = n.student_id
      WHERE n.created_by IS NOT NULL AND n.created_at < (SELECT cutoff FROM bf_cutoff)
    $q$;
  END IF;
END $$;

COMMIT;

-- What was rebuilt, by kind of action and by teacher.
SELECT action, count(*) AS lines, sum(count) AS saves, min(created_at) AS earliest, max(updated_at) AS latest
FROM activity_log WHERE path = 'backfill' GROUP BY action ORDER BY action;
SELECT t.name, count(*) AS lines, min(l.created_at) AS earliest, max(l.updated_at) AS latest
FROM activity_log l LEFT JOIN teachers t ON t.id = l.teacher_id
WHERE l.path = 'backfill' GROUP BY t.name ORDER BY t.name;
