-- 049: Project Aliases + duplicate detection functions
-- Adds canonical alias layer on top of projects table.
-- No existing data is changed.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── project_aliases ──────────────────────────────────────────────────────

CREATE TABLE public.project_aliases (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  alias_name  TEXT        NOT NULL,
  language    TEXT        NOT NULL DEFAULT 'th',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_alias_language    CHECK (language IN ('th','en','other')),
  CONSTRAINT chk_alias_name_length CHECK (length(trim(alias_name)) > 0)
);

-- Case-insensitive uniqueness — same alias cannot point to two projects
CREATE UNIQUE INDEX idx_project_aliases_lower ON public.project_aliases (lower(alias_name));

-- Fast trigram search for fuzzy lookups
CREATE INDEX idx_project_aliases_trgm    ON public.project_aliases USING gin (alias_name gin_trgm_ops);
CREATE INDEX idx_project_aliases_proj_id ON public.project_aliases (project_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.project_aliases ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (needed for duplicate check in createProject)
CREATE POLICY "alias_select_auth" ON public.project_aliases
  FOR SELECT TO authenticated USING (true);

-- Only admins may insert or delete
CREATE POLICY "alias_insert_admin" ON public.project_aliases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "alias_delete_admin" ON public.project_aliases
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass
CREATE POLICY "alias_service_role" ON public.project_aliases
  TO service_role USING (true) WITH CHECK (true);

-- ─── find_project_fuzzy ───────────────────────────────────────────────────
-- Called from createProject step 3 to suggest existing projects before creating.
-- Returns up to 5 candidates ordered by similarity score.

CREATE OR REPLACE FUNCTION public.find_project_fuzzy(
  query_name   TEXT,
  sim_threshold FLOAT DEFAULT 0.35
)
RETURNS TABLE (
  project_id      TEXT,
  project_name_th TEXT,
  project_name_en TEXT,
  match_type      TEXT,
  score           FLOAT
)
LANGUAGE sql STABLE AS $$
  -- Direct project name match
  SELECT
    p.id,
    p.name_th,
    p.name_en,
    'project'::TEXT,
    GREATEST(
      similarity(p.name_th, query_name),
      COALESCE(similarity(p.name_en, query_name), 0::real)
    )::FLOAT
  FROM public.projects p
  WHERE
    similarity(p.name_th, query_name) >= sim_threshold::real
    OR (p.name_en IS NOT NULL AND similarity(p.name_en, query_name) >= sim_threshold::real)

  UNION ALL

  -- Alias match
  SELECT
    p.id,
    p.name_th,
    p.name_en,
    'alias'::TEXT,
    similarity(a.alias_name, query_name)::FLOAT
  FROM public.project_aliases a
  JOIN public.projects p ON p.id = a.project_id
  WHERE similarity(a.alias_name, query_name) >= sim_threshold::real

  ORDER BY 5 DESC
  LIMIT 5;
$$;

-- ─── find_project_duplicates ──────────────────────────────────────────────
-- Admin tool: returns suspected duplicate project pairs.
-- Excludes pairs already linked via project_aliases.

CREATE OR REPLACE FUNCTION public.find_project_duplicates(
  sim_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  project_a_id      TEXT,
  project_a_name_th TEXT,
  project_a_name_en TEXT,
  project_b_id      TEXT,
  project_b_name_th TEXT,
  project_b_name_en TEXT,
  similarity_score  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    a.id, a.name_th, a.name_en,
    b.id, b.name_th, b.name_en,
    GREATEST(
      similarity(a.name_th, b.name_th),
      CASE
        WHEN a.name_en IS NOT NULL AND b.name_en IS NOT NULL
        THEN similarity(a.name_en, b.name_en)
        ELSE 0::real
      END
    )::FLOAT AS similarity_score
  FROM public.projects a
  JOIN public.projects b ON a.id < b.id
  WHERE (
    similarity(a.name_th, b.name_th) >= sim_threshold::real
    OR (a.name_en IS NOT NULL AND b.name_en IS NOT NULL
        AND similarity(a.name_en, b.name_en) >= sim_threshold::real)
  )
  -- Exclude already-aliased pairs
  AND NOT EXISTS (
    SELECT 1 FROM public.project_aliases pa
    WHERE pa.project_id = a.id AND lower(pa.alias_name) = lower(b.name_th)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.project_aliases pa
    WHERE pa.project_id = b.id AND lower(pa.alias_name) = lower(a.name_th)
  )
  ORDER BY similarity_score DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.find_project_fuzzy(TEXT, FLOAT)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_project_duplicates(FLOAT)    TO authenticated, service_role;
