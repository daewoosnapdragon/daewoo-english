-- ============================================================================
-- MIGRATION: Behavior ladder, part 2 — a note logged while a case is open
-- joins that case.
-- Run this in the Supabase SQL Editor after migration-behavior-ladder.sql.
-- Safe to run twice. (It is the same trigger function as in that file;
-- this copy exists so the change can be applied on its own.)
--
-- Before: while a student had an open case, further concern/negative/flagged
-- notes were saved on the log but never attached to the case, and the
-- notice kept saying "has 3 notes". Now such a note joins the open case
-- (its notes list and the notice's count). Nothing opens a second case, and
-- an acknowledged case stays acknowledged. With no open case, the threshold
-- check runs as before.
-- ============================================================================

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

-- Catch up: notes logged while a case was open before this change join it now.
UPDATE behavior_cases c SET log_ids = c.log_ids || m.ids, updated_at = now()
FROM (
  SELECT c2.id AS case_id, array_agg(l.id ORDER BY l.date, l.created_at) AS ids
  FROM behavior_cases c2
  JOIN behavior_logs l ON l.student_id = c2.student_id
  WHERE c2.status <> 'closed' AND l.created_at > c2.created_at
    AND (l.type IN ('concern', 'negative', 'abc') OR COALESCE(l.is_flagged, false))
    AND NOT (l.id = ANY(c2.log_ids))
  GROUP BY c2.id
) m WHERE c.id = m.case_id;

UPDATE notices n SET body = regexp_replace(n.body, 'has \d+ notes', 'has ' || array_length(c.log_ids, 1) || ' notes'), updated_at = now()
FROM behavior_cases c WHERE c.notice_id = n.id AND c.status <> 'closed';

NOTIFY pgrst, 'reload schema';
