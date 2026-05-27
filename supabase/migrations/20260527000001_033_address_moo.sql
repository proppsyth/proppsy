-- Migration 033: Add moo (หมู่) field to address structures
-- Also adds pg_trgm extension and trigram indexes for fast project name search

-- Enable pg_trgm for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add moo column to owners, customers, profiles, projects
ALTER TABLE owners    ADD COLUMN IF NOT EXISTS moo TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS moo TEXT;
ALTER TABLE profiles  ADD COLUMN IF NOT EXISTS moo TEXT;
ALTER TABLE projects  ADD COLUMN IF NOT EXISTS moo TEXT;

-- Trigram indexes on project names for fast bilingual partial search
CREATE INDEX IF NOT EXISTS idx_projects_name_th_trgm ON projects USING gin (name_th gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_name_en_trgm ON projects USING gin (name_en gin_trgm_ops);

-- B-tree index for sorting by name_en (NULLS LAST)
CREATE INDEX IF NOT EXISTS idx_projects_name_en_sort ON projects (name_en NULLS LAST, name_th);
