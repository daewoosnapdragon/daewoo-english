-- Monthly behavior grades (teacher enters letter grade per student per month)
CREATE TABLE IF NOT EXISTS monthly_behavior_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12), -- 1=Jan, 3=Mar, etc.
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E')),
  entered_by UUID REFERENCES teachers(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester_id, month)
);

CREATE INDEX IF NOT EXISTS idx_mbg_student ON monthly_behavior_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_mbg_semester ON monthly_behavior_grades(semester_id);
