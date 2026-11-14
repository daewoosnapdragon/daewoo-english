-- Progress report snapshots
-- The grades a student's progress report showed when it was printed, one
-- row per area. Written every time a progress report is printed, single
-- or batch, so the latest print is what went home. The report card's
-- fact sheet reads it for "since October"; without a row it falls back
-- to rebuilding the composite from the papers dated up to the midterm.
-- Run once.

CREATE TABLE IF NOT EXISTS progress_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  grade NUMERIC,
  is_na BOOLEAN NOT NULL DEFAULT false,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  taken_by UUID REFERENCES teachers(id),
  UNIQUE (student_id, semester_id, domain)
);

ALTER TABLE progress_report_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON progress_report_snapshots;
CREATE POLICY "Allow all for authenticated" ON progress_report_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_semester ON progress_report_snapshots(semester_id, student_id);

NOTIFY pgrst, 'reload schema';
