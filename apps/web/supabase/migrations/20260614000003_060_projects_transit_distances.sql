ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS transit_distances jsonb,
  ADD COLUMN IF NOT EXISTS nearby_amenities  jsonb;

COMMENT ON COLUMN projects.transit_distances IS
  'Array of {station, line, distance_m} — nearest station per transit line';
COMMENT ON COLUMN projects.nearby_amenities IS
  'Array of {name, category, distance_m} — notable places within 5km';
