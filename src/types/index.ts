export interface Resource {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  thumbnail_path: string;
  file_type: string;
  file_size: number;
  file_hash: string;
  page_count: number;
  summary: string;
  resource_type: string;
  subject_area: string;
  grade_levels: string[];
  topics: string[];
  sub_topics: string[];
  reading_skills: string[];
  standards: string[];
  difficulty_level: string;
  category: string;
  subcategory: string;
  korean_ell_notes: string;
  curriculum: string;
  book_num: number;
  module_num: number;
  sort_order: number;
  story_title: string;
  suggested_group: string;
  is_favorite: boolean;
  is_hidden: boolean;
  ai_processed: boolean;
  teacher_notes: string;
  source_url: string;
  parent_id: string | null;
  page_number: number | null;
  page_type: string;
  answer_key_for: string | null;
  usage_tags: string[];
  difficulty_tags: string[];
  collection_id: string | null;
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;
}

export interface PageAssignment {
  id: string;
  user_id: string;
  resource_id: string;
  page_start: number;
  page_end: number;
  book_num: number;
  module_num: number;
  story_title: string;
  label: string;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  resources?: Resource & { thumbnail_url?: string; file_url?: string };
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  created_at: string;
  resource_count?: number;
}

export interface CustomTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface StoryProfile {
  id: string;
  user_id: string;
  resource_id: string;
  title: string;
  author: string;
  curriculum: string;
  data: StoryProfileData;
  created_at: string;
  updated_at: string;
}

export interface StoryProfileData {
  title: string;
  author: string;
  authors_purpose: string;
  genre: string;
  summary: string;
  themes: string[];
  grade_levels: string[];
  reading_skills: string[];
  standards: string[];
  vocabulary: VocabWord[];
  questions: Question[];
  writing_prompts: WritingPrompt[];
  differentiation: {
    below_level: string[];
    above_level: string[];
    ell_supports: string[];
  };
  grammar_connections: string[];
  phonics_connections: string[];
  writing_connections: string[];
  korean_ell_connections: {
    phonics_alerts: string[];
    grammar_alerts: string[];
    cultural_connections: string[];
    sentence_focus: string[];
  };
}

export interface VocabWord {
  word: string;
  definition: string;
  tier: string;
  part_of_speech?: string;
}

export interface Question {
  question: string;
  type: 'multiple_choice' | 'short_answer';
  dok: number;
  choices?: string[];
  answer: string;
}

export interface WritingPrompt {
  genre: string;
  prompt: string;
  sentence_starters?: string[];
}

export interface ShareLink {
  id: string;
  token: string;
  resource_id: string | null;
  collection_id: string | null;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

// Filter state
export interface FilterState {
  search: string;
  category: string;
  resource_type: string;
  grade_level: string;
  curriculum: string;
  topic: string;
  reading_skill: string;
  favorites_only: boolean;
  collection_id: string;
  tag_id: string;
}

// Constants
export const RESOURCE_TYPES = [
  'Worksheet', 'Presentation', 'Anchor Chart', 'Task Card', 'Assessment',
  'Activity', 'Game', 'Lesson Plan', 'Handout', 'Reference',
  'Graphic Organizer', 'Word Wall', 'Poster', 'Passage', 'Read Aloud',
  'Close Reading', 'Writing Prompt', 'Teaching Pal', 'Other'
] as const;

export const CATEGORIES = [
  'grammar', 'reading', 'writing', 'phonics', 'projects',
  'seasonal', 'assessments', 'sel', 'novel_study', 'misc'
] as const;

export const SUBJECT_AREAS = [
  'Reading', 'Writing', 'Grammar', 'Vocabulary', 'Spelling', 'Phonics',
  'Comprehension', 'Speaking & Listening', 'ESL/ELL', 'Social Studies',
  'Science', 'Math', 'SEL', 'Other'
] as const;

export const GRADE_LEVELS = ['K', '1', '2', '3', '4', '5'] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  grammar: '📝',
  reading: '📖',
  writing: '✍️',
  phonics: '🔤',
  projects: '🔬',
  seasonal: '🎄',
  assessments: '📊',
  sel: '💛',
  novel_study: '📚',
  misc: '📁',
};

export const CATEGORY_LABELS: Record<string, string> = {
  grammar: 'Grammar',
  reading: 'Reading',
  writing: 'Writing',
  phonics: 'Phonics',
  projects: 'Projects',
  seasonal: 'Seasonal',
  assessments: 'Assessments',
  sel: 'SEL',
  novel_study: 'Novel Study',
  misc: 'Miscellaneous',
};

export const USAGE_TAGS = [
  'Morning Work', 'Homework', 'Centers', 'Small Group', 'Whole Class',
  'Independent Practice', 'Assessment', 'Review', 'Enrichment', 'Intervention',
  'Test Prep', 'Sub Plans', 'Parent Send-Home',
] as const;

export const DIFFICULTY_TAGS = [
  'Below Level', 'Approaching', 'On Level', 'Above Level', 'Enrichment',
] as const;
