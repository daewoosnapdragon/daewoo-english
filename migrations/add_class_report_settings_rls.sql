-- Migration: RLS policy for class_report_settings
-- Date: 2026-05-04
-- Purpose: Match existing tables (students, grades, comments) which all have
--          "Allow all" policies. The original Phase 3 migration created
--          class_report_settings but didn't enable RLS or add a policy. When
--          RLS was later enabled in Supabase, writes started failing with
--          "new row violates row-level security policy."

ALTER TABLE class_report_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'class_report_settings' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON class_report_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
