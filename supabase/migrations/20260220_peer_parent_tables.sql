-- #39: Peer/Partner Teacher Observation Notes
CREATE TABLE IF NOT EXISTS peer_observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_peer_obs_student ON peer_observations(student_id);

-- #47: Parent Communication Log
CREATE TABLE IF NOT EXISTS parent_communications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id),
  comm_type TEXT NOT NULL DEFAULT 'note_home',
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parent_comm_student ON parent_communications(student_id);

-- #41: Professional Development Log
CREATE TABLE IF NOT EXISTS pd_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  pd_type TEXT NOT NULL DEFAULT 'workshop',
  title TEXT NOT NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pd_log_teacher ON pd_log(teacher_id);

-- #35: Student Class Transfer History
CREATE TABLE IF NOT EXISTS class_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_class TEXT NOT NULL,
  to_class TEXT NOT NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  transferred_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_class_transfers_student ON class_transfers(student_id);

-- #40: Meeting Notes / Collaboration Log
CREATE TABLE IF NOT EXISTS meeting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_type TEXT NOT NULL DEFAULT 'team',
  title TEXT NOT NULL,
  notes TEXT,
  action_items JSONB,
  attendees TEXT[],
  meeting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_date ON meeting_notes(meeting_date DESC);

-- #37: Student Vocabulary Tracker
CREATE TABLE IF NOT EXISTS student_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'reading',
  status TEXT NOT NULL DEFAULT 'introduced',
  added_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vocab_student ON student_vocabulary(student_id);

-- #36: Rubric Library
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'writing',
  criteria JSONB,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- #42: Assessment Blueprint
CREATE TABLE IF NOT EXISTS assessment_blueprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'summative',
  standards TEXT[] DEFAULT '{}',
  dok_levels TEXT[] DEFAULT '{}',
  item_count INTEGER DEFAULT 10,
  time_minutes INTEGER DEFAULT 30,
  format_notes TEXT,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- #34: Sub Plans (teacher uploads)
CREATE TABLE IF NOT EXISTS sub_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  english_class TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 3,
  description TEXT,
  how_to TEXT,
  drive_link TEXT,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_plans_class ON sub_plans(english_class);

-- Quick Checks (formative spot-checks per standard)
CREATE TABLE IF NOT EXISTS quick_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  standard_code TEXT NOT NULL,
  english_class TEXT NOT NULL,
  student_grade INTEGER NOT NULL,
  mark TEXT NOT NULL CHECK (mark IN ('got_it', 'almost', 'not_yet')),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quick_checks_std ON quick_checks(standard_code, english_class, student_grade);
CREATE INDEX IF NOT EXISTS idx_quick_checks_student ON quick_checks(student_id);
