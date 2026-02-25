-- =============================================
-- TeacherVault - Migration: Page Assignments + Enhanced Tags
-- Run this in your Supabase SQL Editor AFTER the initial setup
-- =============================================

-- =============================================
-- PAGE ASSIGNMENTS
-- Assigns individual pages from multi-page packets to IR modules
-- =============================================
CREATE TABLE IF NOT EXISTS page_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Page range (1-indexed)
  page_start INTEGER NOT NULL DEFAULT 1,
  page_end INTEGER NOT NULL DEFAULT 1,

  -- Where this page belongs in Into Reading
  book_num INTEGER NOT NULL DEFAULT 0,
  module_num INTEGER NOT NULL DEFAULT 0,
  story_title TEXT DEFAULT '',

  -- Display
  label TEXT DEFAULT '',            -- e.g. "Grammar Review" or custom name
  tags JSONB DEFAULT '[]'::jsonb,   -- usage/skill tags on this specific assignment
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pa_user ON page_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_resource ON page_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_pa_module ON page_assignments(user_id, book_num, module_num);

ALTER TABLE page_assignments ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists (safe to re-run)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own page assignments" ON page_assignments;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users manage own page assignments" ON page_assignments
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER page_assignments_updated_at
  BEFORE UPDATE ON page_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- ENHANCED TAGS ON RESOURCES
-- Add usage and difficulty tag arrays
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'usage_tags') THEN
    ALTER TABLE resources ADD COLUMN usage_tags JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'difficulty_tags') THEN
    ALTER TABLE resources ADD COLUMN difficulty_tags JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'collection_id') THEN
    ALTER TABLE resources ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_collection ON resources(collection_id);
