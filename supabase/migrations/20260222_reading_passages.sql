-- Reading Passages Library
-- Stores passage text for digital running records in ORF and level tests
CREATE TABLE IF NOT EXISTS reading_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  level TEXT, -- e.g. 'A', 'B', 'C' or Fountas & Pinnell
  grade_range TEXT, -- e.g. '1-2', '3-5'
  source TEXT, -- where it came from
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_shared BOOLEAN DEFAULT true -- visible to all teachers
);

ALTER TABLE reading_passages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers can manage passages" ON reading_passages FOR ALL USING (true) WITH CHECK (true);

-- Add passage reference and word marks to reading_assessments
ALTER TABLE reading_assessments ADD COLUMN IF NOT EXISTS passage_id UUID REFERENCES reading_passages(id);
ALTER TABLE reading_assessments ADD COLUMN IF NOT EXISTS word_marks JSONB DEFAULT NULL;
-- word_marks format: [{ word: "the", index: 0, mark: "error" | "self_correct" | null }, ...]

-- Add passage reference to level test configs
-- Level test scores already store raw_scores as jsonb, which can include passage data
