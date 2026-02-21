-- Add intervention status to class_standard_status for reteach/intervention tracking
ALTER TABLE class_standard_status ADD COLUMN IF NOT EXISTS intervention_status TEXT;
-- Values: 'not_yet_taught', 'taught_needs_reteach', 'reteaching', 'reassessing', or NULL

-- Student goals table for #17
CREATE TABLE IF NOT EXISTS student_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  goal_text TEXT NOT NULL,
  target_metric TEXT, -- e.g. 'cwpm', 'grade_pct', 'writing', 'custom'
  target_value NUMERIC, -- e.g. 65 (for CWPM target)
  baseline_value NUMERIC, -- starting point
  current_value NUMERIC, -- auto-updated or manually set
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'revised', 'dropped'
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE student_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage goals" ON student_goals FOR ALL USING (true) WITH CHECK (true);

-- Quick checks: formative pulse-check data (does NOT affect grades)
CREATE TABLE IF NOT EXISTS quick_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  standard_code TEXT NOT NULL,
  english_class TEXT NOT NULL,
  student_grade INTEGER NOT NULL,
  mark TEXT NOT NULL CHECK (mark IN ('got_it', 'almost', 'not_yet')),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quick_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage quick checks" ON quick_checks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_quick_checks_student ON quick_checks(student_id);
CREATE INDEX IF NOT EXISTS idx_quick_checks_standard ON quick_checks(standard_code, english_class, student_grade);

-- WIDA profile snapshots for archiving (#21)
CREATE TABLE IF NOT EXISTS wida_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  english_class TEXT NOT NULL,
  student_grade INTEGER NOT NULL,
  label TEXT NOT NULL,
  snapshot_data TEXT NOT NULL, -- JSON string of {student_id: {domain: level}}
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wida_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage WIDA snapshots" ON wida_snapshots FOR ALL USING (true) WITH CHECK (true);
