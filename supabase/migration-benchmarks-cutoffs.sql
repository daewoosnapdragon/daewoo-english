-- ============================================================================
-- MIGRATION: Semester cutoff dates + Program benchmarks
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Add midterm/report card cutoff dates to semesters
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS midterm_cutoff_date DATE;
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS report_card_cutoff_date DATE;

-- Copy old grades_due_date to report_card_cutoff_date if it exists
UPDATE semesters SET report_card_cutoff_date = grades_due_date WHERE grades_due_date IS NOT NULL AND report_card_cutoff_date IS NULL;

-- 2. Create class_benchmarks table
CREATE TABLE IF NOT EXISTS class_benchmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  english_class TEXT NOT NULL,
  cwpm_mid INTEGER DEFAULT 0,       -- midterm CWPM target
  cwpm_end INTEGER DEFAULT 0,       -- end-of-semester CWPM target
  lexile_min INTEGER DEFAULT 0,     -- target Lexile range minimum
  lexile_max INTEGER DEFAULT 0,     -- target Lexile range maximum
  reading_level TEXT DEFAULT '',     -- e.g. 'C to F'
  notes TEXT DEFAULT '',             -- focus areas / description
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE class_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read benchmarks
CREATE POLICY "Anyone can read benchmarks" ON class_benchmarks FOR SELECT USING (true);

-- Allow all to manage (admin check is done in app)
CREATE POLICY "Anyone can manage benchmarks" ON class_benchmarks FOR ALL USING (true);

-- 3. Insert default ELL-appropriate benchmarks
INSERT INTO class_benchmarks (english_class, cwpm_mid, cwpm_end, lexile_min, lexile_max, reading_level, notes, display_order) VALUES
  ('Lily', 15, 30, 0, 100, 'Pre-A to B', 'Letter-sound relationships, basic decoding', 0),
  ('Camellia', 30, 50, 100, 250, 'C to F', 'CVC words, simple sentences, HFW sets 1-3', 1),
  ('Daisy', 45, 70, 200, 400, 'F to I', 'Decodable readers, basic fluency', 2),
  ('Sunflower', 60, 85, 350, 550, 'I to L', 'Short passages, developing comprehension', 3),
  ('Marigold', 80, 110, 500, 700, 'L to O', 'Chapter books starting, inference skills', 4),
  ('Snapdragon', 100, 140, 650, 900, 'O to R', 'Independent readers, complex comprehension', 5);
