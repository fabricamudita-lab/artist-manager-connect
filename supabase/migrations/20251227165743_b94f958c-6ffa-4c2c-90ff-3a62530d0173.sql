-- First, remove duplicates keeping only the oldest entry for each combination
DELETE FROM project_team pt1
USING project_team pt2
WHERE pt1.id > pt2.id 
  AND pt1.project_id = pt2.project_id 
  AND ((pt1.profile_id = pt2.profile_id AND pt1.profile_id IS NOT NULL)
    OR (pt1.contact_id = pt2.contact_id AND pt1.contact_id IS NOT NULL));

-- Add unique constraints to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS project_team_project_profile_unique 
ON project_team (project_id, profile_id) 
WHERE profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS project_team_project_contact_unique 
ON project_team (project_id, contact_id) 
WHERE contact_id IS NOT NULL;