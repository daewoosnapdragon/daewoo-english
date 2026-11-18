-- ============================================================================
-- MIGRATION: Admin jobs
-- Run this in the Supabase SQL Editor. Safe to run again: it only adds.
--
-- The office and admin work, made explicit: what needs doing, by when, who
-- owns it, how to do it, and who did it. Seen by two accounts only: the
-- Snapdragon teacher and the admin account. The app hides the pages and the
-- dashboard card from everyone else (src/lib/adminAuth.ts); the tables have
-- the same open policy as every other table here.
--
-- A job is one line of work. It can have steps (a checklist), a parent job
-- (a big job split into pieces), and a due date that is a day, "by the end
-- of a month", "by the end of the semester", or none at all ("when there is
-- time"). A routine is a yearly template: an event (report cards) with jobs
-- at offsets from its date; setting the date once creates every job.
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  -- Where the event date usually comes from; 'date' means it is typed.
  anchor TEXT NOT NULL DEFAULT 'date' CHECK (anchor IN ('date', 'semester_start', 'midterm_cutoff', 'report_card_cutoff', 'semester_end')),
  notes TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_routine_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES admin_routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  -- Days from the event date; negative is before it.
  offset_days INTEGER NOT NULL DEFAULT 0,
  default_owner_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  size TEXT NOT NULL DEFAULT 'S' CHECK (size IN ('XS', 'S', 'M', 'L')),
  -- [{"text": "..."}] in order; copied onto every job made from this.
  steps JSONB NOT NULL DEFAULT '[]',
  link_path TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_routine_jobs_routine ON admin_routine_jobs(routine_id, sort_order);

-- One dated instance of a routine: "Report cards, Fall 2026, 24 Dec".
CREATE TABLE IF NOT EXISTS admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES admin_routines(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT '',
  event_date DATE NOT NULL,
  created_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_events_routine ON admin_events(routine_id, event_date);

CREATE TABLE IF NOT EXISTS admin_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT 'S' CHECK (size IN ('XS', 'S', 'M', 'L')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'waiting', 'done')),
  -- 'date': due on due_date. 'month': by the end of the month, due_date is
  -- its last day. 'semester': by the end of the semester, due_date is its
  -- end date. 'someday': no date; due_date is null.
  due_kind TEXT NOT NULL DEFAULT 'someday' CHECK (due_kind IN ('date', 'month', 'semester', 'someday')),
  due_date DATE,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  requested_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  completed_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  -- Who or what a 'waiting' job waits on, in words.
  waiting_on TEXT NOT NULL DEFAULT '',
  -- [{"id": "...", "text": "...", "done": false, "done_by_id": null, "done_at": null}]
  steps JSONB NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  -- A page in the app where the job happens, e.g. /reports.
  link_path TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES admin_jobs(id) ON DELETE CASCADE,
  event_id UUID REFERENCES admin_events(id) ON DELETE SET NULL,
  routine_job_id UUID REFERENCES admin_routine_jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_jobs_status_due ON admin_jobs(status, due_date);
CREATE INDEX IF NOT EXISTS idx_admin_jobs_owner ON admin_jobs(owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_jobs_parent ON admin_jobs(parent_id);
CREATE INDEX IF NOT EXISTS idx_admin_jobs_completed ON admin_jobs(completed_at DESC);

-- Who did what to a job: created, assigned, reassigned, status, done,
-- reopened, step, asked, answered, edited.
CREATE TABLE IF NOT EXISTS admin_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES admin_jobs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  from_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  to_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_job_history_job ON admin_job_history(job_id, at);

-- "Stuck": a question on a job. The answer is appended to the job's steps,
-- and to the routine job it came from, so it is not asked again next term.
CREATE TABLE IF NOT EXISTS admin_job_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES admin_jobs(id) ON DELETE CASCADE,
  asked_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  answered_by_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_job_questions_job ON admin_job_questions(job_id, created_at);

-- ── Access: the same open policy as every other table; the app gates by account.
ALTER TABLE admin_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_routine_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_job_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_routines_all" ON admin_routines;
CREATE POLICY "admin_routines_all" ON admin_routines FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_routine_jobs_all" ON admin_routine_jobs;
CREATE POLICY "admin_routine_jobs_all" ON admin_routine_jobs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_events_all" ON admin_events;
CREATE POLICY "admin_events_all" ON admin_events FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_jobs_all" ON admin_jobs;
CREATE POLICY "admin_jobs_all" ON admin_jobs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_job_history_all" ON admin_job_history;
CREATE POLICY "admin_job_history_all" ON admin_job_history FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin_job_questions_all" ON admin_job_questions;
CREATE POLICY "admin_job_questions_all" ON admin_job_questions FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
