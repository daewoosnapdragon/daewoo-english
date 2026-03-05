// ═══════════════════════════════════════════════════════════════
// SEMESTER PLAN TYPES
// Defines the structured JSON shape stored in semester_plans.plan_data
//
// A semester plan covers one module's full teaching sequence:
//   - Weekly structure (2-2-1 rhythm)
//   - Integration map (how tracks connect)
//   - Per-story class-by-class lesson plans (the real meat)
//   - Phonics, PA, and Grammar scope & sequences
//   - Weekly skeleton (15-week grid for Option C view)
//   - Custom user notes per day
// ═══════════════════════════════════════════════════════════════

// ── Procedure Step (timed activity within a lesson) ──
export interface ProcedureStep {
  id: string;                     // Unique ID for reordering
  label: string;                  // e.g., "Warm-Up", "Vocabulary Introduction", "First Read"
  duration_min?: number;          // e.g., 5, 8, 10
  description: string;            // Full activity description
  sort_order: number;
}

// ── A single class/lesson within a story ──
export interface StoryLesson {
  id: string;
  class_num: number;              // 1, 2, 3... (per-story)
  title: string;                  // e.g., "Build Background & First Read"
  subtitle?: string;              // Optional subtitle in parens
  swbat: string;                  // Full SWBAT text
  standards: string[];            // e.g., ["RL.1.1", "RL.1.4", "RF.1.2"]
  materials: string;              // Full materials list
  procedure: ProcedureStep[];     // Timed steps
  assessment?: string;            // Assessment description
  assessment_type?: 'formative' | 'summative';
  ell_supports: string;           // ELL support text
  extension?: string;             // Extension/homework
  sort_order: number;
}

// ── A story/text within the module ──
export interface StoryPlan {
  id: string;
  title: string;                  // e.g., "Plant Pairs"
  story_num: number;              // 1, 2, 3...
  label?: string;                 // e.g., "STORY 1", "MODULE WRAP-UP"
  type: string;                   // e.g., "Short Read", "Guided Practice", "Performance Task"
  genre: string;                  // e.g., "Rhyming poetry paired with plant facts"
  total_classes: number;
  pages?: string;                 // e.g., "Pages 6-7 of myBook"
  power_words: string[];
  domain_vocabulary?: string[];   // Additional domain vocab (separate from power words)
  lessons: StoryLesson[];
  sort_order: number;
}

// ── Integration map row ──
export interface IntegrationRow {
  id: string;
  unit_section: string;           // e.g., "Plant Pairs (Wks 1-2)"
  phonics_tie: string;            // e.g., "CVC short vowels: pot, bud, stem..."
  grammar_tie: string;            // e.g., "Types of Sentences, Sentences & Fragments"
  connection: string;             // e.g., "PA/SoR words come from plant vocabulary..."
  sort_order: number;
}

// ── Phonics scope item ──
export interface PhonicsWeek {
  id: string;
  week: number;
  focus: string;                  // e.g., "Short a, i CVC (cat, sit, map, pig)"
  standard: string;               // e.g., "RF.1.3.b"
  integration: string;            // e.g., "Plant Pairs vocabulary: cap > map, sit > pit"
}

export interface PhonicsPhase {
  id: string;
  title: string;                  // e.g., "PHASE 1: CVC REVIEW"
  weeks_label: string;            // e.g., "Weeks 1-2"
  items: PhonicsWeek[];
  sort_order: number;
}

// ── PA scope item ──
export interface PAWeek {
  id: string;
  week: number;
  focus: string;                  // e.g., "Segmenting CVC (short a, i)"
  activities: string;             // e.g., "Elkonin boxes (3 boxes) with letter tiles..."
  standard: string;               // e.g., "RF.1.2.c, RF.1.2.d"
}

// ── Grammar scope item ──
export interface GrammarWeek {
  id: string;
  week: number;
  topic_num: string;              // e.g., "01", "03" (original packet number)
  topic: string;                  // e.g., "Types of Sentences"
  standard: string;               // e.g., "L.1.1.j, L.1.2.b"
  swbat: string;                  // Full SWBAT
  activities: string;             // Activity descriptions
  integration: string;            // How it connects to unit content
}

// ── Weekly skeleton day ──
export interface SkeletonDay {
  id: string;
  day: number;                    // 1-5
  subject: string;                // "Phonemic Awareness", "Into Reading", "Phonics (SoR)", "Grammar"
  subject_short: string;          // "PA", "IR", "SoR", "Grammar"
  standard: string;
  swbat: string;
  activities: string;             // Activity summary or full detail
  story_reference?: string;       // e.g., "Plant Pairs -- Class 1"
  custom_notes?: string;          // User-added notes
  flags?: string[];               // User-added flags like "needs materials", "assessment day"
}

// ── Weekly skeleton week ──
export interface SkeletonWeek {
  id: string;
  week: number;
  title: string;                  // e.g., "Plant Pairs (Part 1) + CVC Review + Types of Sentences"
  days: SkeletonDay[];
  custom_notes?: string;          // User-added week-level notes
  sort_order: number;
}

// ── Unit overview ──
export interface UnitOverview {
  description: string;            // Module overview paragraph
  essential_questions: string[];
  enduring_understandings: string[];
  standards: { code: string; description: string }[];
  stage1: {
    knowledge: string[];
    skills: string[];
    dispositions: string[];
  };
  stage2: {
    title: string;
    description: string;
  };
  pacing: {
    story: string;
    classes: number;
    genre: string;
    focus: string;
  }[];
}

// ═══════════════════════════════════════════════════════════════
// TOP-LEVEL PLAN DATA — stored as plan_data JSONB
// ═══════════════════════════════════════════════════════════════
export interface SemesterPlanData {
  // Module-level metadata
  version: number;                // Schema version for future migrations

  // Section 1: Weekly structure overview
  weekly_structure: {
    rhythm: string;               // e.g., "2-2-1" description
    design_logic: string;         // Why this structure works
    flex_note: string;            // Flexibility note
  };

  // Section 2: Integration map
  integration_map: IntegrationRow[];

  // Section 3: Planning notes & principles
  planning_notes: string[];       // Key principles as array of paragraphs

  // Section 4: Unit overview (backwards design)
  unit_overview: UnitOverview;

  // Section 5: Story plans (the detailed class-by-class lessons)
  stories: StoryPlan[];

  // Section 6: Phonics scope & sequence
  phonics_scope: PhonicsPhase[];

  // Section 7: Phonemic Awareness scope & sequence
  pa_scope: PAWeek[];

  // Section 8: Grammar scope & sequence
  grammar_scope: GrammarWeek[];

  // Section 9: Weekly skeleton (the 15-week grid)
  weekly_skeleton: SkeletonWeek[];

  // Section 10: User customizations
  custom_notes: Record<string, string>;  // Keyed by "week-{n}-day-{d}" or "week-{n}"
  custom_flags: Record<string, string[]>; // Keyed same way, values are flag labels
}

// ── Database row shape ──
export interface SemesterPlan {
  id: string;
  user_id: string;
  book_num: number;
  module_num: number;
  title: string;
  semester: string;
  grade: string;
  total_weeks: number;
  plan_data: SemesterPlanData;
  source_filename: string;
  source_file_url: string;
  created_at: string;
  updated_at: string;
}

// ── Helper: Generate unique ID ──
export function planId(): string {
  return Math.random().toString(36).slice(2, 10);
}
