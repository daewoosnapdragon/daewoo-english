-- Phonics checks
-- A teacher sits with one student and hears them decode the words on the
-- sheets chosen from the Phonics Quick Checks packet (CVC, digraphs, blends,
-- silent e, ...). One row per sitting. Never graded: the Reading tab's
-- Phonics heat map, the student page and the leveling screens read it as
-- information about where decoding stands.
--
-- skills        the sheets (skill ids in src/lib/phonics.ts) read in this
--               sitting, in packet order
-- results       { skillId: { word: 'correct' | 'error' } }. A word with no
--               entry was not read (the teacher stopped the sheet early); it
--               counts as unread, not as an error.
-- heard         { skillId: { word: what the student said } }, for errors.
--               The packet's "write what they read next to the word".
-- observations  { skillId: [...] }: the packet's teacher-page checkboxes
--               (how the student decoded, e.g. 'automatic', 'sound_by_sound')
--               and 'pattern:<grapheme>' for patterns that gave trouble.
-- content_version  which word lists were on screen, so a later change to
--               the sheets does not re-score old checks.

CREATE TABLE IF NOT EXISTS phonics_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  assessed_by UUID REFERENCES teachers(id),
  skills TEXT[] NOT NULL DEFAULT '{}',
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  heard JSONB NOT NULL DEFAULT '{}'::jsonb,
  observations JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  content_version TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phonics_checks_student_date ON phonics_checks(student_id, date DESC);

ALTER TABLE phonics_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage phonics checks" ON phonics_checks;
CREATE POLICY "Teachers can manage phonics checks" ON phonics_checks FOR ALL USING (true) WITH CHECK (true);
