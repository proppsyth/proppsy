-- 035: Project data permissions
-- Projects are shared organisational knowledge.
-- Any authenticated user can read and create projects.
-- Only admins can update or delete existing project records.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "projects_select_auth"
  ON projects FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can add new projects
CREATE POLICY "projects_insert_auth"
  ON projects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only admins can edit existing project data
CREATE POLICY "projects_update_admin"
  ON projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Only admins can delete projects
CREATE POLICY "projects_delete_admin"
  ON projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
