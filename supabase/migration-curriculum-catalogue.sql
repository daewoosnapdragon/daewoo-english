-- ============================================================================
-- MIGRATION: Curriculum catalogue — series, books, units, lessons, resources, skills
-- Run this in the Supabase SQL Editor. Safe to run again: it only adds.
--
-- The catalogue is the books the program uses, each divided into units (or
-- modules) and lessons, with the "students will" line for every lesson, the
-- CCSS codes and skill tags that make overlap and throughlines visible, and
-- links to the files in the shared Drive. It exists once: a book is one
-- record however many classes use it. Placements (which class and grade
-- uses a book, and when) and pacing come in the next migration.
--
-- Units and lessons start life as Claude's draft from a table of contents or
-- the teacher's guide, pasted into the Bookshelf page, and are marked
-- confirmed by admin after a look. The page shows which is which.
--
-- Skills are the program's own short vocabulary (long a VCe, main idea,
-- describing objects) because CCSS is too coarse for overlap: RF.1.3c covers
-- every long vowel pattern at once. Tags the pages do not know are added to
-- this table as they appear, so the vocabulary grows from use.
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- Super Phonics, Into Reading
  publisher TEXT NOT NULL DEFAULT '',
  strand TEXT NOT NULL DEFAULT 'reading',          -- phonics, reading, writing, speaking, grammar, other
  color TEXT NOT NULL DEFAULT 'slate',             -- a palette key; colour means book everywhere in the app
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_curriculum_series_name ON curriculum_series (lower(name));

CREATE TABLE IF NOT EXISTS curriculum_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES curriculum_series(id) ON DELETE CASCADE,
  level_number TEXT NOT NULL DEFAULT '',            -- "2", "3B", "K": shown as the big numeral
  title TEXT NOT NULL DEFAULT '',                   -- the book's own title when the series name is not enough
  status TEXT NOT NULL DEFAULT 'polled' CHECK (status IN ('polled', 'confirmed', 'retired')),
  drive_folder_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_books_series ON curriculum_books (series_id);

CREATE TABLE IF NOT EXISTS curriculum_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES curriculum_books(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  ccss_codes TEXT[] NOT NULL DEFAULT '{}',
  default_weeks NUMERIC NOT NULL DEFAULT 2,         -- how long the book expects it to take
  source TEXT NOT NULL DEFAULT 'claude' CHECK (source IN ('claude', 'teacher')),
  confirmed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  drive_folder_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_units_book ON curriculum_units (book_id, sort_order);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',               -- "Students will …"
  notes TEXT NOT NULL DEFAULT '',
  ccss_codes TEXT[] NOT NULL DEFAULT '{}',
  skill_tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'claude' CHECK (source IN ('claude', 'teacher')),
  confirmed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_unit ON curriculum_lessons (unit_id, sort_order);

CREATE TABLE IF NOT EXISTS curriculum_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES curriculum_units(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other',               -- slides, pdf, doc, sheet, audio, video, folder, other
  url TEXT NOT NULL DEFAULT '',                     -- the Drive link
  copies_hint INT,                                  -- how many to print, when it is a handout
  added_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (unit_id IS NOT NULL OR lesson_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_resources_unit ON curriculum_resources (unit_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_resources_lesson ON curriculum_resources (lesson_id);

CREATE TABLE IF NOT EXISTS curriculum_skills (
  code TEXT PRIMARY KEY,                            -- lower case, the tag as typed: "long a vce"
  label TEXT NOT NULL,
  strand TEXT NOT NULL DEFAULT 'other',
  parent_code TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE curriculum_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_series_all" ON curriculum_series;
CREATE POLICY "curriculum_series_all" ON curriculum_series FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_books_all" ON curriculum_books;
CREATE POLICY "curriculum_books_all" ON curriculum_books FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_units_all" ON curriculum_units;
CREATE POLICY "curriculum_units_all" ON curriculum_units FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_lessons_all" ON curriculum_lessons;
CREATE POLICY "curriculum_lessons_all" ON curriculum_lessons FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_resources_all" ON curriculum_resources;
CREATE POLICY "curriculum_resources_all" ON curriculum_resources FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "curriculum_skills_all" ON curriculum_skills;
CREATE POLICY "curriculum_skills_all" ON curriculum_skills FOR ALL USING (true) WITH CHECK (true);

-- The series the lesson plans already name, so the shelf is not empty on day one.
INSERT INTO curriculum_series (name, strand, color, sort_order) VALUES
  ('Super Phonics', 'phonics', 'plum', 10),
  ('Into Reading', 'reading', 'blue', 20),
  ('Easy Reading', 'reading', 'ochre', 30),
  ('Rich Reading', 'reading', 'teal', 40),
  ('Wonderskills Reading', 'reading', 'berry', 50),
  ('Hand in Hand', 'speaking', 'green', 60),
  ('Thumbs Up', 'writing', 'orange', 70)
ON CONFLICT DO NOTHING;

-- A starting vocabulary for phonics, the strand every lower level shares.
INSERT INTO curriculum_skills (code, label, strand, sort_order) VALUES
  ('short a', 'Short a', 'phonics', 10), ('short e', 'Short e', 'phonics', 11), ('short i', 'Short i', 'phonics', 12),
  ('short o', 'Short o', 'phonics', 13), ('short u', 'Short u', 'phonics', 14), ('cvc', 'CVC words', 'phonics', 15),
  ('long a vce', 'Long a, a_e', 'phonics', 20), ('long a ai ay', 'Long a, ai and ay', 'phonics', 21),
  ('long e ee ea', 'Long e, ee and ea', 'phonics', 22), ('long e y', 'Long e, y', 'phonics', 23),
  ('long i vce', 'Long i, i_e', 'phonics', 24), ('long i igh y', 'Long i, igh and y', 'phonics', 25),
  ('long o vce', 'Long o, o_e', 'phonics', 26), ('long o oa ow', 'Long o, oa and ow', 'phonics', 27),
  ('long u vce', 'Long u, u_e', 'phonics', 28),
  ('consonant blends', 'Consonant blends', 'phonics', 30), ('consonant digraphs', 'Consonant digraphs', 'phonics', 31),
  ('r-controlled vowels', 'R-controlled vowels', 'phonics', 32), ('diphthongs', 'Diphthongs', 'phonics', 33),
  ('silent letters', 'Silent letters', 'phonics', 34), ('suffixes', 'Suffixes', 'phonics', 35), ('prefixes', 'Prefixes', 'phonics', 36),
  ('sight words', 'Sight words', 'phonics', 40), ('syllables', 'Syllables', 'phonics', 41),
  ('fluency', 'Fluency', 'reading', 50), ('retelling', 'Retelling', 'reading', 51), ('main idea', 'Main idea', 'reading', 52),
  ('key details', 'Key details', 'reading', 53), ('characters', 'Characters', 'reading', 54), ('setting', 'Setting', 'reading', 55),
  ('story structure', 'Story structure', 'reading', 56), ('sequence', 'Sequence', 'reading', 57), ('cause and effect', 'Cause and effect', 'reading', 58),
  ('compare and contrast', 'Compare and contrast', 'reading', 59), ('inference', 'Inference', 'reading', 60), ('text features', 'Text features', 'reading', 61),
  ('vocabulary in context', 'Vocabulary in context', 'reading', 62), ('summarising', 'Summarising', 'reading', 63), ('theme', 'Theme', 'reading', 64),
  ('sentences', 'Writing sentences', 'writing', 70), ('capital letters and full stops', 'Capital letters and full stops', 'writing', 71),
  ('describing', 'Describing', 'writing', 72), ('narrative writing', 'Narrative writing', 'writing', 73), ('opinion writing', 'Opinion writing', 'writing', 74),
  ('informational writing', 'Informational writing', 'writing', 75), ('paragraphs', 'Paragraphs', 'writing', 76), ('letters and messages', 'Letters and messages', 'writing', 77),
  ('greetings', 'Greetings', 'speaking', 80), ('describing objects', 'Describing objects', 'speaking', 81), ('describing people', 'Describing people', 'speaking', 82),
  ('asking questions', 'Asking questions', 'speaking', 83), ('routines', 'Daily routines', 'speaking', 84), ('likes and dislikes', 'Likes and dislikes', 'speaking', 85),
  ('past events', 'Talking about the past', 'speaking', 86), ('giving reasons', 'Giving reasons', 'speaking', 87), ('presenting', 'Presenting', 'speaking', 88),
  ('listening for detail', 'Listening for detail', 'speaking', 89)
ON CONFLICT (code) DO NOTHING;
