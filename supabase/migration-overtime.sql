-- ============================================================================
-- MIGRATION: Overtime sheets
-- Run this in the Supabase SQL Editor. Safe to run again: it only adds.
--
-- Teachers log non-instructional overtime one stint at a time: the date, the
-- clock times they worked, and what the work was. The app adds up the
-- minutes; money is never stored, it is minutes × the hourly rate in the
-- 'overtime' row of app_settings, worked out when shown. Weekends and
-- whole-school days off are not overtime, so the app does not take entries
-- on them. Admin reads every teacher's month and prints the sheets for the
-- weeks the office asks for. See docs/overtime-sheets.md.
-- ============================================================================

CREATE TABLE IF NOT EXISTS overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,                 -- as typed, kept 24-hour
  end_time TIME NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),   -- from the times; never typed
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT overtime_entries_order CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_teacher_date ON overtime_entries(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_date ON overtime_entries(date);

ALTER TABLE overtime_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "overtime_entries_all" ON overtime_entries;
CREATE POLICY "overtime_entries_all" ON overtime_entries FOR ALL USING (true) WITH CHECK (true);

-- The rate, the policy paragraph printed at the top of every sheet ({rate}
-- becomes the rate), and the reasons offered to everyone. Admin edits these
-- in Settings → Overtime.
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO app_settings (key, value) VALUES ('overtime', '{"rate":10320,"policyEn":"According to the government official policy, from January 1st, 2021 the employer will pay for non-instructional overtime. In this case, the employee shall be entitled to supplementary overtime pay of {rate} won per hour. Overtime on weekends and national holidays is not included.","policyKo":"공무원 지침에 따라, 2021년 1월 1일부터 수업외의 시간외 근무에 관하여 초과근무 수당을 지급한다. 이러한 경우에는 시간외 수당은 1시간에 {rate}원을 지급한다. 단, 공휴일 및 토·일요일의 근무는 포함하지 않는다.","reasons":[]}')
ON CONFLICT (key) DO NOTHING;
