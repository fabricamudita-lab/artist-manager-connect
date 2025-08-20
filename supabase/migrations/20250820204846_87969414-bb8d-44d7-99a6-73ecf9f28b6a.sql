-- Fix authorization by creating proper workspace and memberships for demo user

-- First, let's create a demo workspace
INSERT INTO public.workspaces (id, name, description, created_by) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'MOODITA Workspace', 'Workspace principal de gestión artística', 'b83d572f-5578-4016-9eea-47263099afd3')
ON CONFLICT DO NOTHING;

-- Add user to workspace as OWNER
INSERT INTO public.workspace_memberships (workspace_id, user_id, role) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'b83d572f-5578-4016-9eea-47263099afd3', 'OWNER')
ON CONFLICT DO NOTHING;

-- Update profile to have workspace_id
UPDATE public.profiles 
SET workspace_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE user_id = 'b83d572f-5578-4016-9eea-47263099afd3';

-- Create/update artist with proper workspace
INSERT INTO public.artists (id, name, stage_name, description, workspace_id, profile_id, created_by) VALUES
  ('41f70e08-843f-4044-97f6-62284bc3202b', 'David Solans Cortes', 'Pol Batlle', 'Artista principal', '550e8400-e29b-41d4-a716-446655440000', '41f70e08-843f-4044-97f6-62284bc3202b', 'b83d572f-5578-4016-9eea-47263099afd3')
ON CONFLICT (id) DO UPDATE SET
  workspace_id = '550e8400-e29b-41d4-a716-446655440000',
  profile_id = '41f70e08-843f-4044-97f6-62284bc3202b';

-- Add artist role binding
INSERT INTO public.artist_role_bindings (artist_id, user_id, role) VALUES
  ('41f70e08-843f-4044-97f6-62284bc3202b', 'b83d572f-5578-4016-9eea-47263099afd3', 'MANAGER')
ON CONFLICT DO NOTHING;

-- Update projects to have proper workspace through artist
UPDATE public.projects 
SET workspace_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE artist_id = '41f70e08-843f-4044-97f6-62284bc3202b';

-- Add project role bindings for the user
INSERT INTO public.project_role_bindings (project_id, user_id, role) VALUES
  ('2f89ea30-46fc-44d6-ad4f-4fecfc32e06f', 'b83d572f-5578-4016-9eea-47263099afd3', 'EDITOR'),
  ('d07d3c7a-deab-4d04-aa4f-b361c822a882', 'b83d572f-5578-4016-9eea-47263099afd3', 'EDITOR')
ON CONFLICT DO NOTHING;

-- Simplify RLS policies to be more permissive during development
-- Update projects policy to allow workspace members
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
CREATE POLICY "Users can view projects" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
  -- Project creator can see it
  created_by = auth.uid() OR
  -- Users in the same workspace can see projects
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = auth.uid()
  ) OR
  -- Users with project roles can see it
  id IN (
    SELECT prb.project_id 
    FROM project_role_bindings prb 
    WHERE prb.user_id = auth.uid()
  ) OR
  -- Users with artist roles can see related projects
  artist_id IN (
    SELECT arb.artist_id 
    FROM artist_role_bindings arb 
    WHERE arb.user_id = auth.uid()
  )
);