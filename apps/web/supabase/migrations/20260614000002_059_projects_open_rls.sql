-- DROP existing policies on projects
DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

-- SELECT: ทุกคนดูได้ (รวมถึง public / pending users)
CREATE POLICY projects_select ON projects
  FOR SELECT USING (true);

-- INSERT: ทุกคนที่ login แล้วเพิ่มได้ (ไม่ต้องรอ approved)
CREATE POLICY projects_insert ON projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: admin เท่านั้น
CREATE POLICY projects_update ON projects
  FOR UPDATE USING (is_admin());

-- DELETE: admin เท่านั้น
CREATE POLICY projects_delete ON projects
  FOR DELETE USING (is_admin());
