-- Report Card Reviews: partner teacher + admin approval workflow
CREATE TABLE IF NOT EXISTS report_card_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  partner_approved BOOLEAN DEFAULT false,
  partner_teacher_id UUID REFERENCES teachers(id),
  partner_approved_at TIMESTAMPTZ,
  admin_approved BOOLEAN DEFAULT false,
  admin_approved_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester_id)
);

-- Ensure app_settings table exists for assessment weights
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE report_card_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage reviews" ON report_card_reviews FOR ALL USING (true) WITH CHECK (true);
