-- Add the workspace creator as OWNER in workspace_memberships
INSERT INTO workspace_memberships (workspace_id, user_id, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'b83d572f-5578-4016-9eea-47263099afd3',
  'OWNER'
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;