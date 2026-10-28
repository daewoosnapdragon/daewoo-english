-- ═══════════════════════════════════════════════════════════════════
-- Resync students.teacher_id with the teacher of each student's class
-- ═══════════════════════════════════════════════════════════════════
-- students.teacher_id is a cached copy of "the teacher whose
-- english_class matches the student's". It went stale for students whose
-- class was edited on the Students page (which only changed english_class)
-- and for classes whose teacher changed, so reports printed the old
-- teacher (e.g. a Daisy student showing a different class's teacher).
-- The app now resolves the teacher from the class, so this is a one-off
-- tidy of the cached column. Safe to re-run.

-- Step 1: see who is out of sync
SELECT s.english_name, s.korean_name, s.english_class,
       old_t.name AS cached_teacher, new_t.name AS class_teacher
FROM students s
LEFT JOIN teachers old_t ON old_t.id = s.teacher_id
LEFT JOIN teachers new_t ON new_t.english_class = s.english_class AND new_t.role = 'teacher' AND new_t.is_active = true
WHERE s.is_active = true
  AND s.teacher_id IS DISTINCT FROM new_t.id
ORDER BY s.english_class, s.english_name;

-- Step 2: point every active student at the active teacher of their class
-- (NULL where the class has no teacher, e.g. Unplaced).
UPDATE students s
SET teacher_id = t.id,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (english_class) id, english_class
  FROM teachers
  WHERE role = 'teacher' AND is_active = true
  ORDER BY english_class, created_at
) t
WHERE t.english_class = s.english_class
  AND s.is_active = true
  AND s.teacher_id IS DISTINCT FROM t.id;

-- Step 3: verify — should return no rows
SELECT s.english_name, s.english_class, t.name AS cached_teacher
FROM students s
LEFT JOIN teachers t ON t.id = s.teacher_id
WHERE s.is_active = true
  AND s.english_class NOT IN ('Unplaced')
  AND (t.english_class IS NULL OR t.english_class <> s.english_class);
