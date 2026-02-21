-- ============================================================================
-- MIGRATION: Leveling System - Teacher Anecdotal Ratings + Writing Benchmarks
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Add writing benchmark columns to class_benchmarks
ALTER TABLE class_benchmarks ADD COLUMN IF NOT EXISTS writing_mid INTEGER DEFAULT 0;
ALTER TABLE class_benchmarks ADD COLUMN IF NOT EXISTS writing_end INTEGER DEFAULT 0;

-- Update existing benchmarks with writing targets
-- Grade 1
UPDATE class_benchmarks SET writing_mid = 1,  writing_end = 3  WHERE grade = 1 AND english_class = 'Lily';
UPDATE class_benchmarks SET writing_mid = 2,  writing_end = 5  WHERE grade = 1 AND english_class = 'Camellia';
UPDATE class_benchmarks SET writing_mid = 4,  writing_end = 7  WHERE grade = 1 AND english_class = 'Daisy';
UPDATE class_benchmarks SET writing_mid = 5,  writing_end = 9  WHERE grade = 1 AND english_class = 'Sunflower';
UPDATE class_benchmarks SET writing_mid = 7,  writing_end = 11 WHERE grade = 1 AND english_class = 'Marigold';
UPDATE class_benchmarks SET writing_mid = 9,  writing_end = 14 WHERE grade = 1 AND english_class = 'Snapdragon';
-- Grade 2
UPDATE class_benchmarks SET writing_mid = 2,  writing_end = 4  WHERE grade = 2 AND english_class = 'Lily';
UPDATE class_benchmarks SET writing_mid = 3,  writing_end = 6  WHERE grade = 2 AND english_class = 'Camellia';
UPDATE class_benchmarks SET writing_mid = 5,  writing_end = 8  WHERE grade = 2 AND english_class = 'Daisy';
UPDATE class_benchmarks SET writing_mid = 6,  writing_end = 10 WHERE grade = 2 AND english_class = 'Sunflower';
UPDATE class_benchmarks SET writing_mid = 8,  writing_end = 12 WHERE grade = 2 AND english_class = 'Marigold';
UPDATE class_benchmarks SET writing_mid = 10, writing_end = 15 WHERE grade = 2 AND english_class = 'Snapdragon';
-- Grade 3
UPDATE class_benchmarks SET writing_mid = 2,  writing_end = 5  WHERE grade = 3 AND english_class = 'Lily';
UPDATE class_benchmarks SET writing_mid = 4,  writing_end = 7  WHERE grade = 3 AND english_class = 'Camellia';
UPDATE class_benchmarks SET writing_mid = 6,  writing_end = 9  WHERE grade = 3 AND english_class = 'Daisy';
UPDATE class_benchmarks SET writing_mid = 7,  writing_end = 11 WHERE grade = 3 AND english_class = 'Sunflower';
UPDATE class_benchmarks SET writing_mid = 9,  writing_end = 13 WHERE grade = 3 AND english_class = 'Marigold';
UPDATE class_benchmarks SET writing_mid = 11, writing_end = 16 WHERE grade = 3 AND english_class = 'Snapdragon';
-- Grade 4
UPDATE class_benchmarks SET writing_mid = 3,  writing_end = 5  WHERE grade = 4 AND english_class = 'Lily';
UPDATE class_benchmarks SET writing_mid = 4,  writing_end = 8  WHERE grade = 4 AND english_class = 'Camellia';
UPDATE class_benchmarks SET writing_mid = 6,  writing_end = 10 WHERE grade = 4 AND english_class = 'Daisy';
UPDATE class_benchmarks SET writing_mid = 8,  writing_end = 12 WHERE grade = 4 AND english_class = 'Sunflower';
UPDATE class_benchmarks SET writing_mid = 10, writing_end = 14 WHERE grade = 4 AND english_class = 'Marigold';
UPDATE class_benchmarks SET writing_mid = 12, writing_end = 17 WHERE grade = 4 AND english_class = 'Snapdragon';
-- Grade 5
UPDATE class_benchmarks SET writing_mid = 3,  writing_end = 5  WHERE grade = 5 AND english_class = 'Lily';
UPDATE class_benchmarks SET writing_mid = 5,  writing_end = 8  WHERE grade = 5 AND english_class = 'Camellia';
UPDATE class_benchmarks SET writing_mid = 7,  writing_end = 11 WHERE grade = 5 AND english_class = 'Daisy';
UPDATE class_benchmarks SET writing_mid = 9,  writing_end = 13 WHERE grade = 5 AND english_class = 'Sunflower';
UPDATE class_benchmarks SET writing_mid = 11, writing_end = 15 WHERE grade = 5 AND english_class = 'Marigold';
UPDATE class_benchmarks SET writing_mid = 13, writing_end = 18 WHERE grade = 5 AND english_class = 'Snapdragon';

-- 2. Create teacher anecdotal ratings table
CREATE TABLE IF NOT EXISTS teacher_anecdotal_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_test_id UUID NOT NULL REFERENCES level_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  -- 4 dimensions, each 1-4
  receptive_language INTEGER CHECK (receptive_language BETWEEN 1 AND 4),
  productive_language INTEGER CHECK (productive_language BETWEEN 1 AND 4),
  engagement_pace INTEGER CHECK (engagement_pace BETWEEN 1 AND 4),
  placement_recommendation INTEGER CHECK (placement_recommendation BETWEEN 1 AND 4),
  -- Optional notes
  notes TEXT DEFAULT '',
  -- Watchlist flag
  is_watchlist BOOLEAN DEFAULT false,
  -- Teacher placement preference
  teacher_recommends TEXT CHECK (teacher_recommends IN ('keep', 'move_up', 'move_down', NULL)),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_test_id, student_id)
);

CREATE INDEX idx_anecdotal_test ON teacher_anecdotal_ratings(level_test_id);
CREATE INDEX idx_anecdotal_student ON teacher_anecdotal_ratings(student_id);

-- RLS
ALTER TABLE teacher_anecdotal_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read anecdotal ratings" ON teacher_anecdotal_ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can manage anecdotal ratings" ON teacher_anecdotal_ratings FOR ALL USING (true);

-- 3. Add updated_at trigger
CREATE TRIGGER anecdotal_ratings_updated_at BEFORE UPDATE ON teacher_anecdotal_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Update level_tests config default to include new weights
-- (existing level_tests keep their config; new ones get updated defaults)
ALTER TABLE level_tests ALTER COLUMN config SET DEFAULT '{
  "sections": [
    {"key": "word_reading_correct", "label": "Word Reading Correct", "max": 80},
    {"key": "word_reading_attempted", "label": "Word Reading Attempted", "max": null},
    {"key": "passage_cwpm", "label": "Passage Reading CWPM", "max": null},
    {"key": "comprehension", "label": "Comprehension", "max": 5},
    {"key": "written_mc", "label": "Written MC", "max": 21},
    {"key": "writing", "label": "Writing", "max": 20}
  ],
  "weights": {
    "level_test": 0.3,
    "classroom_grades": 0.4,
    "teacher_anecdotal": 0.3
  },
  "adaptive_passage": true,
  "adaptive_min_n": 10
}'::jsonb;
