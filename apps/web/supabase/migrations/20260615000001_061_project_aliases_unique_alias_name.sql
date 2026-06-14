-- Remove exact duplicates before adding constraint
DELETE FROM project_aliases a
USING project_aliases b
WHERE a.id > b.id
  AND lower(a.alias_name) = lower(b.alias_name);

-- Unique constraint on alias_name so ON CONFLICT ('alias_name') works
ALTER TABLE project_aliases
  ADD CONSTRAINT project_aliases_alias_name_key UNIQUE (alias_name);
