-- The name a student goes by in comments
-- The roster's english_name holds the romanised Korean name with the
-- English name in brackets when there is one ("Kim Bo Min (Sophia)").
-- Comments use the name the child is called: the bracketed English name,
-- or the given name after the family name ("Bo Min"). The app suggests
-- it from the roster entry; a teacher confirms or types another once,
-- above the comment box or on the student page, and it is remembered.
-- NULL means not confirmed yet; the suggestion is used until then.

ALTER TABLE students ADD COLUMN IF NOT EXISTS goes_by TEXT;

NOTIFY pgrst, 'reload schema';
