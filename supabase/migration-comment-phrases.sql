-- Comment phrases and student pronouns
-- The phrase bank behind the Phrases drawer on the report card editor,
-- and the pronoun each sentence is filled with. Run once, then
-- seed-comment-phrases.sql.
--
-- students.pronoun   he | she | they. Set once (student page, add form, or
--                    the picker beside the comment box) and remembered.
--                    NULL means not set yet; the drawer asks.
--
-- comment_phrases    one row per phrase. kind is sentence (the descriptive
--                    bank), opener, closer, or ladder (a next-step rung:
--                    text is the classroom line, home1/home2 the home
--                    activities, band and rung name the rung).
--                    area: reading | phonics | writing | speaking |
--                    language | behavior; NULL for openers and closers.
--                    tier: strong | on track | needs support |
--                    change over time. category: the behavior category.
--                    grades: 1-2 | 3-5 | all. doc: both | mid | end.
--                    audience (closers): student | parents.
--                    seed_key keeps the seed re-runnable without touching
--                    rows edited in the app. Text uses {name}, {he}, {his},
--                    {him} and ____ for a blank the teacher finishes.

ALTER TABLE students ADD COLUMN IF NOT EXISTS pronoun TEXT CHECK (pronoun IN ('he', 'she', 'they'));

CREATE TABLE IF NOT EXISTS comment_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_key TEXT UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('sentence', 'opener', 'closer', 'ladder')),
  area TEXT CHECK (area IN ('reading', 'phonics', 'writing', 'speaking', 'language', 'behavior')),
  tier TEXT CHECK (tier IN ('strong', 'on track', 'needs support', 'change over time', 'serious concern')),
  category TEXT,
  grades TEXT NOT NULL DEFAULT 'all' CHECK (grades IN ('1-2', '3-5', 'all')),
  doc TEXT NOT NULL DEFAULT 'both' CHECK (doc IN ('both', 'mid', 'end')),
  audience TEXT CHECK (audience IN ('student', 'parents')),
  band TEXT CHECK (band IN ('Beginning', 'Intermediate', 'Advanced')),
  rung TEXT,
  text TEXT NOT NULL,
  home1 TEXT,
  home2 TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE comment_phrases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON comment_phrases;
CREATE POLICY "Allow all for authenticated" ON comment_phrases FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_comment_phrases_kind_area ON comment_phrases(kind, area, tier);

NOTIFY pgrst, 'reload schema';
