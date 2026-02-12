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
  grade INTEGER NOT NULL DEFAULT 1,     -- grade level 1-5
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

-- 3. Insert default ELL-appropriate benchmarks (5 grades x 6 classes = 30 rows)
INSERT INTO class_benchmarks (grade, english_class, cwpm_mid, cwpm_end, lexile_min, lexile_max, reading_level, notes, display_order) VALUES
  -- Grade 1
  (1, 'Lily', 5, 15, 0, 50, 'Pre-A', 'Letter recognition, initial sounds', 0),
  (1, 'Camellia', 12, 25, 0, 100, 'A to B', 'CVC blending, HFW sets 1-2', 1),
  (1, 'Daisy', 20, 40, 50, 200, 'B to D', 'Simple decodable readers', 2),
  (1, 'Sunflower', 30, 55, 100, 300, 'D to G', 'Short sentences, basic fluency', 3),
  (1, 'Marigold', 45, 70, 200, 400, 'G to J', 'Paragraph reading, comprehension', 4),
  (1, 'Snapdragon', 60, 90, 300, 550, 'J to M', 'Independent reading, inference', 5),
  -- Grade 2
  (2, 'Lily', 8, 20, 0, 75, 'Pre-A to A', 'Letter-sound relationships', 6),
  (2, 'Camellia', 20, 35, 50, 150, 'B to D', 'CVC mastery, digraphs starting', 7),
  (2, 'Daisy', 30, 50, 100, 300, 'D to G', 'Decodable chapter books', 8),
  (2, 'Sunflower', 45, 70, 200, 400, 'G to J', 'Developing comprehension', 9),
  (2, 'Marigold', 60, 90, 350, 550, 'J to M', 'Chapter books, varied genres', 10),
  (2, 'Snapdragon', 80, 110, 500, 700, 'M to P', 'Complex texts, analysis', 11),
  -- Grade 3
  (3, 'Lily', 10, 25, 0, 100, 'A to B', 'Basic decoding, HFW', 12),
  (3, 'Camellia', 25, 45, 50, 200, 'C to F', 'Blends, digraphs, short vowels', 13),
  (3, 'Daisy', 40, 65, 150, 350, 'F to I', 'Fluency building, expression', 14),
  (3, 'Sunflower', 55, 80, 300, 500, 'I to L', 'Nonfiction, text features', 15),
  (3, 'Marigold', 75, 105, 450, 650, 'L to O', 'Independent chapter books', 16),
  (3, 'Snapdragon', 95, 130, 600, 800, 'O to R', 'Complex comprehension, writing', 17),
  -- Grade 4
  (4, 'Lily', 12, 28, 0, 100, 'A to C', 'Phonics foundations, decoding', 18),
  (4, 'Camellia', 28, 50, 75, 250, 'C to G', 'Multi-syllable words starting', 19),
  (4, 'Daisy', 45, 70, 200, 400, 'G to J', 'Fluency and expression', 20),
  (4, 'Sunflower', 65, 90, 350, 550, 'J to M', 'Content-area reading', 21),
  (4, 'Marigold', 85, 115, 500, 700, 'M to P', 'Novel studies, critical thinking', 22),
  (4, 'Snapdragon', 105, 140, 650, 900, 'P to S', 'Advanced comprehension, debate', 23),
  -- Grade 5
  (5, 'Lily', 15, 30, 0, 100, 'A to C', 'Still building letter-sound, basic decoding', 24),
  (5, 'Camellia', 30, 55, 100, 300, 'D to G', 'Blends, vowel teams, HFW mastery', 25),
  (5, 'Daisy', 50, 75, 250, 450, 'G to K', 'Paragraph-level fluency', 26),
  (5, 'Sunflower', 70, 100, 400, 600, 'K to N', 'Nonfiction, academic vocab', 27),
  (5, 'Marigold', 90, 120, 550, 750, 'N to Q', 'Complex texts, essay writing', 28),
  (5, 'Snapdragon', 115, 150, 700, 950, 'Q to T', 'Near grade-level, advanced analysis', 29);
