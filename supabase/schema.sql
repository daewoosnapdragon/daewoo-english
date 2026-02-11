-- ============================================================================
-- DAEWOO ENGLISH PROGRAM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor to create all tables
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SCHOOL SETTINGS (editable by admin)
-- ============================================================================
CREATE TABLE school_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name TEXT NOT NULL DEFAULT 'Daewoo Elementary School',
  school_name_ko TEXT NOT NULL DEFAULT '대우초등학교',
  program_name TEXT NOT NULL DEFAULT 'English Program',
  program_subtitle TEXT DEFAULT 'Growing together through English.',
  principal_name TEXT DEFAULT '',
  principal_name_ko TEXT DEFAULT '',
  team_manager TEXT DEFAULT 'Victoria Park',
  team_manager_ko TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  academic_year TEXT DEFAULT '2025-2026',
  grading_scale JSONB NOT NULL DEFAULT '[
    {"letter": "A+", "min": 97, "max": 100},
    {"letter": "A", "min": 93, "max": 96},
    {"letter": "A-", "min": 90, "max": 92},
    {"letter": "B+", "min": 87, "max": 89},
    {"letter": "B", "min": 83, "max": 86},
    {"letter": "B-", "min": 80, "max": 82},
    {"letter": "C+", "min": 77, "max": 79},
    {"letter": "C", "min": 73, "max": 76},
    {"letter": "C-", "min": 70, "max": 72},
    {"letter": "D+", "min": 67, "max": 69},
    {"letter": "D", "min": 63, "max": 66},
    {"letter": "D-", "min": 60, "max": 62},
    {"letter": "E", "min": 0, "max": 59}
  ]'::jsonb,
  warning_threshold NUMERIC DEFAULT 70,
  decline_threshold NUMERIC DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO school_settings (id) VALUES (uuid_generate_v4());

-- ============================================================================
-- TEACHERS
-- ============================================================================
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  english_class TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher', -- 'teacher' or 'admin'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the 7 staff members
INSERT INTO teachers (name, english_class, role) VALUES
  ('Teacher 1', 'Lily', 'teacher'),
  ('Teacher 2', 'Camellia', 'teacher'),
  ('Teacher 3', 'Daisy', 'teacher'),
  ('Teacher 4', 'Sunflower', 'teacher'),
  ('Teacher 5', 'Marigold', 'teacher'),
  ('Teacher 6', 'Snapdragon', 'teacher'),
  ('Victoria Park', 'Admin', 'admin');

-- ============================================================================
-- STUDENTS (master roster)
-- ============================================================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  korean_name TEXT NOT NULL,
  english_name TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
  korean_class TEXT NOT NULL, -- 대, 솔, 매
  class_number INTEGER NOT NULL,
  english_class TEXT NOT NULL, -- Lily, Camellia, Daisy, Sunflower, Marigold, Snapdragon
  teacher_id UUID REFERENCES teachers(id),
  is_active BOOLEAN DEFAULT true,
  notes TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  google_drive_folder_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate korean_class + class_number within same grade
  UNIQUE(grade, korean_class, class_number)
);

-- Index for common queries
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_english_class ON students(english_class);
CREATE INDEX idx_students_korean_class ON students(korean_class, class_number);
CREATE INDEX idx_students_teacher ON students(teacher_id);

-- ============================================================================
-- SEMESTERS / REPORTING PERIODS
-- ============================================================================
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "Fall 2025 Midterm Progress Reports"
  name_ko TEXT DEFAULT '',
  academic_year TEXT NOT NULL, -- e.g. "2025-2026"
  type TEXT NOT NULL CHECK (type IN ('fall_mid', 'fall_final', 'spring_mid', 'spring_final')),
  start_date DATE,
  end_date DATE,
  grades_due_date DATE,
  comments_due_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ASSESSMENTS (flexible - not locked to monthly)
-- ============================================================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "Picture Day Perfection", "Module Assessment"
  semester_id UUID REFERENCES semesters(id),
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
  english_class TEXT, -- NULL = all classes in that grade, or specific class
  domain TEXT NOT NULL CHECK (domain IN ('reading', 'phonics', 'writing', 'speaking', 'language')),
  type TEXT NOT NULL DEFAULT 'formative' CHECK (type IN ('formative', 'summative', 'performance_task')),
  max_score NUMERIC NOT NULL DEFAULT 100,
  date DATE,
  weight NUMERIC DEFAULT 1.0, -- for weighted averaging
  description TEXT DEFAULT '',
  -- Standards mapping
  standards JSONB DEFAULT '[]'::jsonb, -- e.g. [{"code": "RL.1.2", "dok": 2}]
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assessments_semester ON assessments(semester_id);
CREATE INDEX idx_assessments_grade_domain ON assessments(grade, domain);

-- ============================================================================
-- GRADES (individual assessment scores)
-- ============================================================================
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  score NUMERIC, -- NULL = not yet graded
  is_absent BOOLEAN DEFAULT false,
  is_exempt BOOLEAN DEFAULT false,
  notes TEXT DEFAULT '',
  entered_by UUID REFERENCES teachers(id),
  entered_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, assessment_id)
);

CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_assessment ON grades(assessment_id);

-- ============================================================================
-- SEMESTER GRADES (rolled-up final grades per domain per reporting period)
-- ============================================================================
CREATE TABLE semester_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id),
  domain TEXT NOT NULL CHECK (domain IN ('reading', 'phonics', 'writing', 'speaking', 'language', 'overall')),
  calculated_grade NUMERIC, -- auto-calculated average
  final_grade NUMERIC, -- teacher can override
  is_overridden BOOLEAN DEFAULT false,
  behavior_grade TEXT, -- A+, A, etc. (only on 'overall' row)
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester_id, domain)
);

CREATE INDEX idx_semester_grades_student ON semester_grades(student_id);
CREATE INDEX idx_semester_grades_semester ON semester_grades(semester_id);

-- ============================================================================
-- SUMMATIVE ASSESSMENTS (Assessment A, Assessment B, etc.)
-- ============================================================================
CREATE TABLE summative_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id),
  assessment_label TEXT NOT NULL, -- 'Assessment A', 'Assessment B', etc.
  score NUMERIC,
  max_score NUMERIC DEFAULT 100,
  notes TEXT DEFAULT '',
  UNIQUE(student_id, semester_id, assessment_label)
);

-- ============================================================================
-- TEACHER COMMENTS
-- ============================================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(id),
  text TEXT DEFAULT '',
  draft_source TEXT DEFAULT 'manual', -- 'manual', 'ai', 'bank', 'template'
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES teachers(id),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, semester_id)
);

-- ============================================================================
-- COMMENT BANK (shared phrases)
-- ============================================================================
CREATE TABLE comment_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT, -- NULL = general, or specific domain
  performance_tier TEXT CHECK (performance_tier IN ('high', 'mid', 'low', 'general')),
  text_en TEXT NOT NULL,
  text_ko TEXT DEFAULT '',
  category TEXT DEFAULT 'general', -- 'strength', 'growth_area', 'recommendation', 'general'
  created_by UUID REFERENCES teachers(id),
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- BEHAVIOR LOG
-- ============================================================================
CREATE TABLE behavior_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('positive', 'concern', 'parent_contact', 'intervention', 'note')),
  note TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT false, -- important for sub teacher sheets
  teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_behavior_student ON behavior_logs(student_id);
CREATE INDEX idx_behavior_date ON behavior_logs(date);

-- ============================================================================
-- LEVEL TESTS
-- ============================================================================
CREATE TABLE level_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- e.g. "Fall 2025 Level Test"
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 5),
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL CHECK (semester IN ('fall', 'spring')),
  config JSONB NOT NULL DEFAULT '{
    "sections": [
      {"key": "word_reading_correct", "label": "Word Reading Correct", "max": 80},
      {"key": "word_reading_attempted", "label": "Word Reading Attempted", "max": null},
      {"key": "passage_cwpm", "label": "Passage Reading CWPM", "max": null},
      {"key": "comprehension", "label": "Comprehension", "max": 5},
      {"key": "written_mc", "label": "Written MC", "max": 21},
      {"key": "prewriting", "label": "Prewriting", "max": 10},
      {"key": "writing", "label": "Writing", "max": 20}
    ],
    "weights": {
      "cwpm": 0.3,
      "writing": 0.4,
      "mc": 0.1,
      "wr": 0.2
    },
    "adaptive_passage": true,
    "adaptive_min_n": 10
  }'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'scoring', 'placement', 'finalized')),
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

-- ============================================================================
-- LEVEL TEST SCORES
-- ============================================================================
CREATE TABLE level_test_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_test_id UUID NOT NULL REFERENCES level_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  previous_class TEXT, -- class before this level test
  raw_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Calculated fields (populated by app logic)
  calculated_metrics JSONB DEFAULT '{}'::jsonb, -- accuracy %, rates, bands per skill
  percentile_ranks JSONB DEFAULT '{}'::jsonb, -- pCWPM, pWrite, pMC, pWR
  composite_index NUMERIC,
  composite_band TEXT, -- auto-calculated class placement
  entered_by UUID REFERENCES teachers(id),
  entered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_test_id, student_id)
);

CREATE INDEX idx_lt_scores_test ON level_test_scores(level_test_id);
CREATE INDEX idx_lt_scores_student ON level_test_scores(student_id);

-- ============================================================================
-- LEVEL TEST PLACEMENTS (final decisions)
-- ============================================================================
CREATE TABLE level_test_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_test_id UUID NOT NULL REFERENCES level_tests(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  auto_placement TEXT NOT NULL, -- algorithm result
  final_placement TEXT NOT NULL, -- after any overrides
  is_overridden BOOLEAN DEFAULT false,
  override_reason TEXT DEFAULT '',
  override_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_test_id, student_id)
);

-- ============================================================================
-- ATTENDANCE
-- ============================================================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  note TEXT DEFAULT '',
  recorded_by UUID REFERENCES teachers(id),
  UNIQUE(student_id, date)
);

CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_student ON attendance(student_id);

-- ============================================================================
-- READING LEVELS / ORF TRACKING
-- ============================================================================
CREATE TABLE reading_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  passage_title TEXT,
  passage_level TEXT, -- Fountas & Pinnell, custom, etc.
  word_count INTEGER,
  time_seconds INTEGER,
  errors INTEGER DEFAULT 0,
  self_corrections INTEGER DEFAULT 0,
  cwpm NUMERIC, -- calculated: (word_count - errors) / (time_seconds / 60)
  accuracy_rate NUMERIC, -- calculated: (word_count - errors) / word_count
  reading_level TEXT, -- assigned level
  notes TEXT DEFAULT '',
  assessed_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reading_student ON reading_assessments(student_id);

-- ============================================================================
-- CHECKLIST SYSTEM (semester kickoff, etc.)
-- ============================================================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE,
  is_template BOOLEAN DEFAULT false,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  day_date DATE, -- which day this task falls on
  task TEXT NOT NULL,
  assigned_to UUID REFERENCES teachers(id), -- NULL = everyone
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES teachers(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- WARNING LETTERS / INTERVENTIONS
-- ============================================================================
CREATE TABLE warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  semester_id UUID REFERENCES semesters(id),
  type TEXT NOT NULL CHECK (type IN ('academic_warning', 'behavior_warning', 'improvement_plan')),
  domains_flagged JSONB DEFAULT '[]'::jsonb, -- which domains triggered this
  generated_text_en TEXT DEFAULT '',
  generated_text_ko TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  sent_date DATE,
  parent_meeting_date DATE,
  parent_meeting_notes TEXT DEFAULT '',
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_warnings_student ON warnings(student_id);

-- ============================================================================
-- AUDIT LOG (version history / undo)
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES teachers(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_time ON audit_log(changed_at);

-- ============================================================================
-- ROSTER UPLOAD HISTORY
-- ============================================================================
CREATE TABLE roster_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  uploaded_by UUID REFERENCES teachers(id),
  students_matched INTEGER DEFAULT 0,
  students_updated INTEGER DEFAULT 0,
  students_added INTEGER DEFAULT 0,
  students_not_found INTEGER DEFAULT 0,
  changes_summary JSONB DEFAULT '[]'::jsonb,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (basic - since no auth, these are permissive)
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth)
CREATE POLICY "Allow all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON grades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON comments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER grades_updated_at BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER semester_grades_updated_at BEFORE UPDATE ON semester_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- Student roster with teacher name
CREATE VIEW student_roster AS
SELECT 
  s.*,
  t.name as teacher_name
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
WHERE s.is_active = true
ORDER BY s.grade, s.english_class, s.korean_class, s.class_number;

-- Class summary view
CREATE VIEW class_summary AS
SELECT 
  s.grade,
  s.english_class,
  COUNT(*) as student_count,
  t.name as teacher_name
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
WHERE s.is_active = true
GROUP BY s.grade, s.english_class, t.name
ORDER BY s.grade, 
  CASE s.english_class 
    WHEN 'Lily' THEN 1 
    WHEN 'Camellia' THEN 2 
    WHEN 'Daisy' THEN 3 
    WHEN 'Sunflower' THEN 4 
    WHEN 'Marigold' THEN 5 
    WHEN 'Snapdragon' THEN 6 
  END;
