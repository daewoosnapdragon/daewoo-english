-- ============================================================================
-- MIGRATION: Behavior ladder
-- Run this in the Supabase SQL Editor after migration-notices.sql.
-- Safe to run twice.
--
-- Three concern/negative notes on a student (the threshold is set in
-- Settings → Behavior ladder) open a CASE: the notes bundled together, a
-- step on the ladder, and an urgent notice addressed to every admin and the
-- student's class teacher. A case stays on the admin dashboard, with no
-- dismiss button, until it is acknowledged and the step's action (for step
-- 1, "Parents contacted") is recorded. Recording the action writes a
-- parent-contact entry on the student's behavior log and closes the case;
-- the count then restarts from that moment. A note the teacher flags by
-- hand opens a case at once, whatever the count.
--
-- The check runs as a database trigger on behavior_logs, so it fires no
-- matter how a note is entered. A note logged while a case is already open
-- joins that case instead. behavior_ladder_sweep() re-runs the check for
-- every student (the dashboard calls it on load, which also converts notes
-- entered before this migration). behavior_ladder_status(student) is what
-- the behavior tracker shows ("2 of 3 notes toward step 1").
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS behavior_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  step INTEGER NOT NULL DEFAULT 1,
  step_label TEXT NOT NULL DEFAULT '',
  action_label TEXT NOT NULL DEFAULT '',
  threshold INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'closed')),
  opened_reason TEXT NOT NULL DEFAULT 'threshold' CHECK (opened_reason IN ('threshold', 'flag')),
  log_ids UUID[] NOT NULL DEFAULT '{}',
  -- The class teacher's one line for admin: "please call Mum about the hitting".
  ask TEXT NOT NULL DEFAULT '',
  notice_id UUID REFERENCES notices(id) ON DELETE SET NULL,
  acknowledged_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  action_date DATE,
  action_note TEXT NOT NULL DEFAULT '',
  closed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_behavior_cases_student ON behavior_cases(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_cases_status ON behavior_cases(status);

ALTER TABLE behavior_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "behavior_cases_all" ON behavior_cases;
CREATE POLICY "behavior_cases_all" ON behavior_cases FOR ALL USING (true) WITH CHECK (true);

-- Default ladder, used until Settings saves one.
INSERT INTO app_settings (key, value) VALUES ('behavior_ladder', '{"overdue_days":2,"steps":[{"threshold":3,"label":"Admin review and parent contact","action":"Parents contacted"},{"threshold":3,"label":"Meeting with parents and admin","action":"Meeting held"}]}')
ON CONFLICT (key) DO NOTHING;

-- ── The check: open a case for one student if the ladder says so ──
CREATE OR REPLACE FUNCTION behavior_ladder_check(p_student UUID) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_settings JSONB;
  v_steps JSONB;
  v_sem RECORD;
  v_student RECORD;
  v_closed INTEGER;
  v_step_idx INTEGER;
  v_step JSONB;
  v_threshold INTEGER;
  v_since TIMESTAMPTZ;
  v_from DATE;
  v_ids UUID[];
  v_count INTEGER;
  v_flagged BOOLEAN;
  v_case UUID;
  v_notice UUID;
  v_audience UUID[];
  v_body TEXT;
BEGIN
  -- One case at a time per student.
  IF EXISTS (SELECT 1 FROM behavior_cases WHERE student_id = p_student AND status <> 'closed') THEN RETURN NULL; END IF;

  SELECT * INTO v_student FROM students WHERE id = p_student;
  IF NOT FOUND THEN RETURN NULL; END IF;

  BEGIN
    SELECT value::jsonb INTO v_settings FROM app_settings WHERE key = 'behavior_ladder';
  EXCEPTION WHEN others THEN v_settings := NULL;
  END;
  v_steps := COALESCE(v_settings->'steps', '[{"threshold":3,"label":"Admin review and parent contact","action":"Parents contacted"}]'::jsonb);
  IF jsonb_typeof(v_steps) <> 'array' OR jsonb_array_length(v_steps) = 0 THEN RETURN NULL; END IF;

  SELECT id, start_date INTO v_sem FROM semesters WHERE is_active = true ORDER BY start_date DESC NULLS LAST LIMIT 1;

  -- Which rung: one past the number of cases already closed this semester, capped at the last rung.
  SELECT count(*) INTO v_closed FROM behavior_cases WHERE student_id = p_student AND status = 'closed'
    AND (v_sem.id IS NULL OR semester_id = v_sem.id);
  v_step_idx := LEAST(v_closed + 1, jsonb_array_length(v_steps));
  v_step := v_steps->(v_step_idx - 1);
  v_threshold := GREATEST(1, COALESCE((v_step->>'threshold')::int, 3));

  -- Count from the last action (or the start of the semester), whichever is later.
  SELECT max(closed_at) INTO v_since FROM behavior_cases WHERE student_id = p_student AND status = 'closed';
  v_from := COALESCE(v_sem.start_date, DATE '1900-01-01');

  SELECT COALESCE(array_agg(id ORDER BY date, created_at), '{}'), count(*), bool_or(is_flagged)
    INTO v_ids, v_count, v_flagged
  FROM behavior_logs
  WHERE student_id = p_student
    AND type IN ('concern', 'negative', 'abc')
    AND date >= v_from
    AND (v_since IS NULL OR created_at > v_since);

  -- A hand-flagged note counts even if it is not a concern.
  IF NOT COALESCE(v_flagged, false) THEN
    SELECT bool_or(is_flagged) INTO v_flagged FROM behavior_logs
    WHERE student_id = p_student AND is_flagged AND date >= v_from AND (v_since IS NULL OR created_at > v_since);
    IF COALESCE(v_flagged, false) THEN
      SELECT COALESCE(array_agg(id ORDER BY date, created_at), '{}') INTO v_ids FROM behavior_logs
      WHERE student_id = p_student AND (type IN ('concern', 'negative', 'abc') OR is_flagged)
        AND date >= v_from AND (v_since IS NULL OR created_at > v_since);
    END IF;
  END IF;

  IF COALESCE(v_count, 0) < v_threshold AND NOT COALESCE(v_flagged, false) THEN RETURN NULL; END IF;

  -- Everyone who must see it: active admins and the student's class teachers.
  SELECT COALESCE(array_agg(DISTINCT id), '{}') INTO v_audience FROM teachers
  WHERE is_active = true AND (role = 'admin' OR english_class = v_student.english_class OR id = v_student.teacher_id);

  v_body := format('Behavior ladder, step %s: %s (%s) has %s notes. %s. Open the case on the dashboard.',
    v_step_idx, v_student.english_name, v_student.english_class, GREATEST(v_count, array_length(v_ids, 1)),
    COALESCE(v_step->>'label', 'Admin review'));

  INSERT INTO notices (body, style, author_id, audience, expires_on)
  VALUES (v_body, 'urgent', NULL, v_audience, NULL) RETURNING id INTO v_notice;

  INSERT INTO behavior_cases (student_id, semester_id, step, step_label, action_label, threshold, status, opened_reason, log_ids, notice_id)
  VALUES (p_student, v_sem.id, v_step_idx, COALESCE(v_step->>'label', ''), COALESCE(v_step->>'action', 'Done'), v_threshold, 'open',
    CASE WHEN COALESCE(v_count, 0) >= v_threshold THEN 'threshold' ELSE 'flag' END, v_ids, v_notice)
  RETURNING id INTO v_case;
  RETURN v_case;
END $$;

-- ── Trigger: every note goes through the check ──
-- While a case is open, a further concern/negative/flagged note joins that
-- case (its notes list and the notice's count), so admin sees it; nothing
-- opens a second case. With no open case, the threshold check runs.
CREATE OR REPLACE FUNCTION behavior_ladder_trigger() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_case RECORD; v_n INTEGER;
BEGIN
  IF NEW.type IN ('concern', 'negative', 'abc') OR COALESCE(NEW.is_flagged, false) THEN
    SELECT id, log_ids, notice_id INTO v_case FROM behavior_cases
    WHERE student_id = NEW.student_id AND status <> 'closed' ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      IF NOT (NEW.id = ANY(v_case.log_ids)) THEN
        v_n := COALESCE(array_length(v_case.log_ids, 1), 0) + 1;
        UPDATE behavior_cases SET log_ids = array_append(log_ids, NEW.id), updated_at = now() WHERE id = v_case.id;
        IF v_case.notice_id IS NOT NULL THEN
          UPDATE notices SET body = regexp_replace(body, 'has \d+ notes', 'has ' || v_n || ' notes'), updated_at = now() WHERE id = v_case.notice_id;
        END IF;
      END IF;
    ELSE
      PERFORM behavior_ladder_check(NEW.student_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_behavior_ladder ON behavior_logs;
CREATE TRIGGER trg_behavior_ladder AFTER INSERT OR UPDATE OF type, is_flagged ON behavior_logs
  FOR EACH ROW EXECUTE FUNCTION behavior_ladder_trigger();

-- ── Sweep: re-run the check for every student with a note this semester ──
CREATE OR REPLACE FUNCTION behavior_ladder_sweep() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_from DATE; r RECORD; n INTEGER := 0;
BEGIN
  SELECT COALESCE(start_date, DATE '1900-01-01') INTO v_from FROM semesters WHERE is_active = true ORDER BY start_date DESC NULLS LAST LIMIT 1;
  FOR r IN SELECT DISTINCT student_id FROM behavior_logs WHERE date >= COALESCE(v_from, DATE '1900-01-01') AND (type IN ('concern', 'negative', 'abc') OR is_flagged) LOOP
    IF behavior_ladder_check(r.student_id) IS NOT NULL THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END $$;

-- ── Status for one student: where they are on the ladder right now ──
CREATE OR REPLACE FUNCTION behavior_ladder_status(p_student UUID)
RETURNS TABLE (step INTEGER, threshold INTEGER, note_count INTEGER, open_case_id UUID, step_label TEXT, action_label TEXT)
LANGUAGE plpgsql AS $$
DECLARE v_settings JSONB; v_steps JSONB; v_sem RECORD; v_closed INTEGER; v_since TIMESTAMPTZ; v_from DATE; v_step JSONB;
BEGIN
  BEGIN
    SELECT value::jsonb INTO v_settings FROM app_settings WHERE key = 'behavior_ladder';
  EXCEPTION WHEN others THEN v_settings := NULL;
  END;
  v_steps := COALESCE(v_settings->'steps', '[{"threshold":3,"label":"Admin review and parent contact","action":"Parents contacted"}]'::jsonb);
  SELECT id, start_date INTO v_sem FROM semesters WHERE is_active = true ORDER BY start_date DESC NULLS LAST LIMIT 1;
  SELECT count(*) INTO v_closed FROM behavior_cases c WHERE c.student_id = p_student AND c.status = 'closed' AND (v_sem.id IS NULL OR c.semester_id = v_sem.id);
  step := LEAST(v_closed + 1, GREATEST(1, jsonb_array_length(v_steps)));
  v_step := v_steps->(step - 1);
  threshold := GREATEST(1, COALESCE((v_step->>'threshold')::int, 3));
  step_label := COALESCE(v_step->>'label', '');
  action_label := COALESCE(v_step->>'action', '');
  SELECT max(c.closed_at) INTO v_since FROM behavior_cases c WHERE c.student_id = p_student AND c.status = 'closed';
  v_from := COALESCE(v_sem.start_date, DATE '1900-01-01');
  SELECT count(*)::int INTO note_count FROM behavior_logs l WHERE l.student_id = p_student AND l.type IN ('concern', 'negative', 'abc') AND l.date >= v_from AND (v_since IS NULL OR l.created_at > v_since);
  SELECT c.id INTO open_case_id FROM behavior_cases c WHERE c.student_id = p_student AND c.status <> 'closed' ORDER BY c.created_at DESC LIMIT 1;
  RETURN NEXT;
END $$;

-- Reload PostgREST so the new table and functions are visible to the app.
NOTIFY pgrst, 'reload schema';
