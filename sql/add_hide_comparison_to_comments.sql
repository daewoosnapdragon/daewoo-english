-- Per-student toggle to hide the Class Comparison chart on the report card.
-- Used for students who aren't assessed against the class average (e.g. learning
-- accommodations). Stored on the student's report_card comment row.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hide_comparison BOOLEAN DEFAULT FALSE;
