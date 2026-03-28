-- Passage usage tracking: logs which classes/grades have used each passage and their median scores
CREATE TABLE IF NOT EXISTS passage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id UUID NOT NULL REFERENCES reading_passages(id) ON DELETE CASCADE,
  english_class TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
  academic_year TEXT NOT NULL, -- e.g. '2025-2026'
  assessment_count INTEGER NOT NULL DEFAULT 0,
  median_cwpm NUMERIC(6,1),
  avg_accuracy NUMERIC(5,1),
  last_used_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (passage_id, english_class, grade, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_passage_usage_passage ON passage_usage(passage_id);
