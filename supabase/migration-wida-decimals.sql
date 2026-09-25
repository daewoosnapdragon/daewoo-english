-- WIDA levels with one decimal (3.5 = Developing, halfway into Expanding).
-- The 1–6 check constraints stay as they are. Run in the Supabase SQL editor.
ALTER TABLE student_wida_levels  ALTER COLUMN wida_level TYPE numeric(2,1);
ALTER TABLE student_wida_history ALTER COLUMN wida_level TYPE numeric(2,1);
NOTIFY pgrst, 'reload schema';
