// ============================================================================
// DAEWOO ENGLISH - TYPE DEFINITIONS
// ============================================================================

export type EnglishClass = 'Lily' | 'Camellia' | 'Daisy' | 'Sunflower' | 'Marigold' | 'Snapdragon' | 'Trial';
export type KoreanClass = '대' | '솔' | '매';
export type Grade = 1 | 2 | 3 | 4 | 5;
export type Domain = 'reading' | 'phonics' | 'writing' | 'speaking' | 'language';
export type SemesterType = 'fall_mid' | 'fall_final' | 'spring_mid' | 'spring_final';
export type BehaviorGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'E';
export type Role = 'teacher' | 'admin';
export type Language = 'en' | 'ko';

export const ENGLISH_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon'];
export const ALL_ENGLISH_CLASSES: EnglishClass[] = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon', 'Trial'];
export const KOREAN_CLASSES: KoreanClass[] = ['대', '솔', '매'];
export const GRADES: Grade[] = [1, 2, 3, 4, 5];
export const DOMAINS: Domain[] = ['reading', 'phonics', 'writing', 'speaking', 'language'];
export const DOMAIN_LABELS: Record<Domain, { en: string; ko: string }> = {
  reading: { en: 'Reading', ko: '읽기' },
  phonics: { en: 'Phonics & Foundational Skills', ko: '파닉스' },
  writing: { en: 'Writing', ko: '쓰기' },
  speaking: { en: 'Speaking & Listening', ko: '말하기/듣기' },
  language: { en: 'Language Standards', ko: '언어' },
};
export const BEHAVIOR_GRADES: BehaviorGrade[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];

export const CLASS_COLORS: Record<EnglishClass, string> = {
  Lily: '#E8B4B8',
  Camellia: '#F5D0A9',
  Daisy: '#F9E79F',
  Sunflower: '#ABEBC6',
  Marigold: '#AED6F1',
  Snapdragon: '#D2B4DE',
  Trial: '#90CAF9',
};

export const CLASS_ORDER: Record<EnglishClass, number> = {
  Lily: 1, Camellia: 2, Daisy: 3, Sunflower: 4, Marigold: 5, Snapdragon: 6, Trial: 99,
};

// ─── Database Row Types ──────────────────────────────────────────────

export interface Student {
  id: string;
  korean_name: string;
  english_name: string;
  grade: Grade;
  korean_class: KoreanClass;
  class_number: number;
  english_class: EnglishClass;
  teacher_id: string | null;
  is_active: boolean;
  notes: string;
  photo_url: string;
  google_drive_folder_url: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  teacher_name?: string;
}

export interface Teacher {
  id: string;
  name: string;
  english_class: string;
  role: Role;
  is_active: boolean;
  password?: string;
  is_head_teacher?: boolean;
  photo_url?: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_name_ko: string;
  program_name: string;
  program_subtitle: string;
  principal_name: string;
  principal_name_ko: string;
  team_manager: string;
  team_manager_ko: string;
  logo_url: string;
  academic_year: string;
  grading_scale: GradingScaleEntry[];
  warning_threshold: number;
  decline_threshold: number;
}

export interface GradingScaleEntry {
  letter: string;
  min: number;
  max: number;
}

export interface Semester {
  id: string;
  name: string;
  name_ko: string;
  academic_year: string;
  type: SemesterType;
  start_date: string | null;
  end_date: string | null;
  grades_due_date: string | null;
  comments_due_date: string | null;
  is_active: boolean;
}

export interface Assessment {
  id: string;
  name: string;
  semester_id: string;
  grade: Grade;
  english_class: EnglishClass | null;
  domain: Domain;
  type: 'formative' | 'summative' | 'performance_task';
  max_score: number;
  date: string | null;
  weight: number;
  description: string;
  standards: StandardTag[];
  sections?: AssessmentSection[] | null;
  created_by: string | null;
}

export interface AssessmentSection {
  label: string;
  standard: string;
  max_points: number;
}

export interface StandardTag {
  code: string;
  dok: number;
  description?: string;
}

export interface GradeEntry {
  id: string;
  student_id: string;
  assessment_id: string;
  score: number | null;
  is_absent: boolean;
  is_exempt: boolean;
  notes: string;
  entered_by: string | null;
  entered_at: string;
}

export interface SemesterGrade {
  id: string;
  student_id: string;
  semester_id: string;
  domain: Domain | 'overall';
  calculated_grade: number | null;
  final_grade: number | null;
  is_overridden: boolean;
  behavior_grade: BehaviorGrade | null;
}

export interface SummativeScore {
  id: string;
  student_id: string;
  semester_id: string;
  assessment_label: string;
  score: number | null;
  max_score: number;
}

export interface Comment {
  id: string;
  student_id: string;
  semester_id: string;
  text: string;
  draft_source: 'manual' | 'ai' | 'bank' | 'template';
  is_approved: boolean;
  approved_by: string | null;
  created_by: string | null;
}

export interface BehaviorLog {
  id: string;
  student_id: string;
  date: string;
  type: 'positive' | 'concern' | 'parent_contact' | 'intervention' | 'note' | 'abc' | 'negative';
  note: string;
  is_flagged: boolean;
  teacher_id: string | null;
  teacher_name?: string;
  // ABC tracking fields
  time: string;
  duration: string;
  activity: string;
  antecedents: string[];
  behaviors: string[];
  consequences: string[];
  frequency: number;
  intensity: number;
  created_at?: string;
}

export interface LevelTest {
  id: string;
  name: string;
  grade: Grade;
  academic_year: string;
  semester: 'fall' | 'spring';
  config: LevelTestConfig;
  status: 'draft' | 'active' | 'scoring' | 'placement' | 'finalized';
  created_by: string | null;
}

export interface LevelTestConfig {
  sections: LevelTestSection[];
  weights: Record<string, number>;
  adaptive_passage: boolean;
  adaptive_min_n: number;
}

export interface LevelTestSection {
  key: string;
  label: string;
  max: number | null;
}

export interface LevelTestScore {
  id: string;
  level_test_id: string;
  student_id: string;
  previous_class: string | null;
  raw_scores: Record<string, number | null>;
  calculated_metrics: Record<string, any>;
  percentile_ranks: Record<string, number>;
  composite_index: number | null;
  composite_band: string | null;
  // Joined
  student?: Student;
}

export interface LevelTestPlacement {
  id: string;
  level_test_id: string;
  student_id: string;
  auto_placement: EnglishClass;
  final_placement: EnglishClass;
  is_overridden: boolean;
  override_reason: string;
  override_by: string | null;
  // Joined
  student?: Student;
  score?: LevelTestScore;
  anecdotal?: TeacherAnecdotalRating;
}

export interface TeacherAnecdotalRating {
  id: string;
  level_test_id: string;
  student_id: string;
  teacher_id: string | null;
  receptive_language: number | null;
  productive_language: number | null;
  engagement_pace: number | null;
  placement_recommendation: number | null;
  notes: string;
  is_watchlist: boolean;
  teacher_recommends: 'keep' | 'move_up' | 'move_down' | null;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'tardy';
  note: string;
}

export interface ReadingAssessment {
  id: string;
  student_id: string;
  date: string;
  passage_title: string | null;
  passage_level: string | null;
  word_count: number | null;
  time_seconds: number | null;
  errors: number;
  self_corrections: number;
  cwpm: number | null;
  accuracy_rate: number | null;
  reading_level: string | null;
  notes: string;
}

export interface Checklist {
  id: string;
  name: string;
  description: string;
  start_date: string | null;
  is_template: boolean;
  items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  day_date: string | null;
  task: string;
  assigned_to: string | null;
  is_completed: boolean;
  sort_order: number;
  // Joined
  assigned_to_name?: string;
}

export interface Warning {
  id: string;
  student_id: string;
  semester_id: string | null;
  type: 'academic_warning' | 'behavior_warning' | 'improvement_plan';
  domains_flagged: Domain[];
  generated_text_en: string;
  generated_text_ko: string;
  status: 'draft' | 'sent' | 'acknowledged';
  sent_date: string | null;
  parent_meeting_date: string | null;
  parent_meeting_notes: string;
  // Joined
  student?: Student;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

// ─── Roster Upload Types ─────────────────────────────────────────────

export interface RosterUploadRow {
  korean_class: string;
  class_number: number;
  korean_name: string;
  english_name: string;
  grade: number;
  english_class: string;
  teacher: string;
}

export interface RosterUploadPreview {
  matched: { existing: Student; incoming: RosterUploadRow; changes: string[] }[];
  new_students: RosterUploadRow[];
  not_found: Student[];
  duplicates: { row: RosterUploadRow; conflict: string }[];
  total_incoming: number;
}

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface ClassPerformance {
  english_class: EnglishClass;
  grade: Grade;
  student_count: number;
  domain_averages: Record<Domain, number | null>;
  overall_average: number | null;
}

export interface StudentAlert {
  student: Student;
  type: 'below_threshold' | 'declining' | 'chronic_absence';
  details: string;
  domain?: Domain;
  current_grade?: number;
  previous_grade?: number;
}

// ─── Utility Types ───────────────────────────────────────────────────

export interface AppState {
  currentTeacher: Teacher | null;
  language: Language;
  activeSemester: Semester | null;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: string;
  direction: SortDirection;
}

export interface FilterConfig {
  grade?: Grade;
  english_class?: EnglishClass;
  korean_class?: KoreanClass;
  teacher_id?: string;
  search?: string;
}
