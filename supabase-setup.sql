-- =============================================
-- TeacherVault - Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STORAGE BUCKET
-- =============================================
-- Create storage bucket for resource files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resources',
  'resources',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources');

CREATE POLICY "Authenticated users can read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'resources');

CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'resources');

CREATE POLICY "Public can read resources" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'resources');

-- =============================================
-- TABLES
-- =============================================

-- Resources (main table)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- File info
  title TEXT NOT NULL DEFAULT '',
  original_filename TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL DEFAULT '',
  thumbnail_path TEXT DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '', -- pdf, presentation, image, document
  file_size BIGINT DEFAULT 0,
  file_hash TEXT DEFAULT '',
  page_count INTEGER DEFAULT 0,
  
  -- AI-generated metadata
  summary TEXT DEFAULT '',
  resource_type TEXT DEFAULT '', -- Worksheet, Presentation, Passage, etc.
  subject_area TEXT DEFAULT '',
  grade_levels JSONB DEFAULT '[]'::jsonb,
  topics JSONB DEFAULT '[]'::jsonb,
  sub_topics JSONB DEFAULT '[]'::jsonb,
  reading_skills JSONB DEFAULT '[]'::jsonb,
  standards JSONB DEFAULT '[]'::jsonb,
  difficulty_level TEXT DEFAULT '',
  category TEXT DEFAULT '', -- grammar, reading, writing, phonics, etc.
  subcategory TEXT DEFAULT '',
  korean_ell_notes TEXT DEFAULT '',
  
  -- Curriculum
  curriculum TEXT DEFAULT '', -- "Into Reading 2 Module 3"
  book_num INTEGER DEFAULT 0,
  module_num INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  story_title TEXT DEFAULT '',
  suggested_group TEXT DEFAULT '',
  
  -- User data
  is_favorite BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  ai_processed BOOLEAN DEFAULT false,
  teacher_notes TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  
  -- Parent/child for split PDFs
  parent_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  page_number INTEGER DEFAULT NULL,
  page_type TEXT DEFAULT '', -- worksheet, answer_key, credits, etc.
  answer_key_for UUID REFERENCES resources(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_resources_user ON resources(user_id);
CREATE INDEX idx_resources_type ON resources(resource_type);
CREATE INDEX idx_resources_category ON resources(category);
CREATE INDEX idx_resources_curriculum ON resources(curriculum);
CREATE INDEX idx_resources_book_mod ON resources(book_num, module_num);
CREATE INDEX idx_resources_story ON resources(story_title);
CREATE INDEX idx_resources_favorite ON resources(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_resources_hash ON resources(file_hash);
CREATE INDEX idx_resources_parent ON resources(parent_id);
CREATE INDEX idx_resources_updated ON resources(user_id, updated_at DESC);
CREATE INDEX idx_resources_viewed ON resources(user_id, last_viewed_at DESC NULLS LAST);

-- Full text search
ALTER TABLE resources ADD COLUMN fts tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(title, '') || ' ' || 
      COALESCE(summary, '') || ' ' || 
      COALESCE(story_title, '') || ' ' ||
      COALESCE(teacher_notes, '') || ' ' ||
      COALESCE(category, '') || ' ' ||
      COALESCE(subcategory, '')
    )
  ) STORED;
CREATE INDEX idx_resources_fts ON resources USING gin(fts);

-- RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own resources" ON resources
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own resources" ON resources
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own resources" ON resources
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users delete own resources" ON resources
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- =============================================
-- Collections
-- =============================================
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#e8734a',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections" ON collections
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- Collection-Resource junction
CREATE TABLE collection_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(collection_id, resource_id)
);

CREATE INDEX idx_colres_col ON collection_resources(collection_id);
CREATE INDEX idx_colres_res ON collection_resources(resource_id);

ALTER TABLE collection_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collection resources" ON collection_resources
  FOR ALL TO authenticated 
  USING (
    collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid())
  );

-- =============================================
-- Custom Tags
-- =============================================
CREATE TABLE custom_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tags" ON custom_tags
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- Tag-Resource junction
CREATE TABLE resource_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag_id UUID NOT NULL REFERENCES custom_tags(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  UNIQUE(tag_id, resource_id)
);

CREATE INDEX idx_restag_tag ON resource_tags(tag_id);
CREATE INDEX idx_restag_res ON resource_tags(resource_id);

ALTER TABLE resource_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own resource tags" ON resource_tags
  FOR ALL TO authenticated 
  USING (
    tag_id IN (SELECT id FROM custom_tags WHERE user_id = auth.uid())
  );

-- =============================================
-- Story Profiles (AI-generated)
-- =============================================
CREATE TABLE story_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  title TEXT DEFAULT '',
  author TEXT DEFAULT '',
  curriculum TEXT DEFAULT '',
  data JSONB DEFAULT '{}'::jsonb, -- Full AI profile (vocab, questions, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sp_user ON story_profiles(user_id);
CREATE INDEX idx_sp_resource ON story_profiles(resource_id);
CREATE INDEX idx_sp_curriculum ON story_profiles(curriculum);

ALTER TABLE story_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own story profiles" ON story_profiles
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

-- =============================================
-- Share Links
-- =============================================
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT NULL, -- null = never expires
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (resource_id IS NOT NULL OR collection_id IS NOT NULL)
);

CREATE INDEX idx_share_token ON share_links(token);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own share links" ON share_links
  FOR ALL TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can read share links by token" ON share_links
  FOR SELECT TO anon 
  USING (true);

-- =============================================
-- Updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER story_profiles_updated_at
  BEFORE UPDATE ON story_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
