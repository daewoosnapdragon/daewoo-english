-- Class N/A flags, one set per document
-- "Not assessed this term" on the class overview wrote one row per
-- semester, class, grade and area, shared by the progress report and the
-- report card. An area not assessed by October but graded by December had
-- no honest setting. Each row now names its document. Rows that exist
-- were set in progress-report season and keep that document; the report
-- card starts with no flags, and the overview offers to carry October's
-- across with one click. Run once.

ALTER TABLE class_report_settings ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'progress_report'
  CHECK (report_type IN ('progress_report', 'report_card'));

-- The old unique key (semester, class, grade, area) must widen to include the document.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT conname FROM pg_constraint WHERE conrelid = 'class_report_settings'::regclass AND contype = 'u' LOOP
    EXECUTE format('ALTER TABLE class_report_settings DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
DROP INDEX IF EXISTS class_report_settings_semester_id_english_class_grade_domain_key;
ALTER TABLE class_report_settings ADD CONSTRAINT class_report_settings_doc_key UNIQUE (semester_id, english_class, grade, domain, report_type);

NOTIFY pgrst, 'reload schema';
