-- Create report_card_reviews table for partner/admin approval workflow
CREATE TABLE IF NOT EXISTS report_card_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  partner_approved BOOLEAN DEFAULT FALSE,
  partner_teacher_id UUID REFERENCES teachers(id),
  partner_approved_at TIMESTAMPTZ,
  admin_approved BOOLEAN DEFAULT FALSE,
  admin_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, semester_id)
);

-- Enable RLS
ALTER TABLE report_card_reviews ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write
CREATE POLICY "Allow all access to report_card_reviews"
  ON report_card_reviews FOR ALL
  USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_report_card_reviews_semester
  ON report_card_reviews(semester_id);
CREATE INDEX IF NOT EXISTS idx_report_card_reviews_student_semester
  ON report_card_reviews(student_id, semester_id);
