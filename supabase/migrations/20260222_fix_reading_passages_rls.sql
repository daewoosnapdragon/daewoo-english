-- FIX: reading_passages RLS policy error
-- Run this in Supabase SQL Editor
-- Drops the restrictive policies and replaces with open ones matching other tables

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Teachers can view shared passages" ON reading_passages;
DROP POLICY IF EXISTS "Teachers can insert passages" ON reading_passages;
DROP POLICY IF EXISTS "Teachers can update own passages" ON reading_passages;
DROP POLICY IF EXISTS "reading_passages_select" ON reading_passages;
DROP POLICY IF EXISTS "reading_passages_insert" ON reading_passages;
DROP POLICY IF EXISTS "reading_passages_update" ON reading_passages;
DROP POLICY IF EXISTS "reading_passages_delete" ON reading_passages;

-- Create open policy matching other tables in the app
CREATE POLICY "Allow all" ON reading_passages FOR ALL USING (true) WITH CHECK (true);
