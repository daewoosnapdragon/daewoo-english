-- Reviewer feedback note for the Review & Approve workflow.
-- Lets a partner teacher / admin leave a single note per student that is flagged
-- back to the classroom teacher. `reviewer_note_ack` clears the flag once the
-- teacher has read it in the Report Card comment editor.
ALTER TABLE report_card_reviews
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_note_by UUID REFERENCES teachers(id),
  ADD COLUMN IF NOT EXISTS reviewer_note_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewer_note_ack BOOLEAN DEFAULT FALSE;
