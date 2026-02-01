-- Normalize all roles to lowercase for consistency
UPDATE track_credits 
SET role = LOWER(role) 
WHERE role != LOWER(role);