-- =============================================
-- TeacherVault - Migration v3: Category Subfolders
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add category field to collections so they can be subfolders
ALTER TABLE collections ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '';

-- Index for fast lookup by category
CREATE INDEX IF NOT EXISTS idx_collections_category ON collections(user_id, category);

-- Add collection_id to resources if not already there
-- (This may already exist from v2 migration)
DO $$ BEGIN
  ALTER TABLE resources ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_collection ON resources(collection_id);
