-- Student Groups table for skill groups, fluency groups, lit circles, and partner pairs
CREATE TABLE IF NOT EXISTS student_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('skill', 'fluency', 'litCircle', 'partner', 'custom')),
  english_class TEXT NOT NULL,
  focus TEXT,
  notes TEXT,
  book TEXT,
  student_ids UUID[] DEFAULT '{}',
  roles JSONB,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_groups_class ON student_groups(english_class);
CREATE INDEX idx_student_groups_type ON student_groups(type);

ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage groups" ON student_groups FOR ALL USING (true) WITH CHECK (true);
