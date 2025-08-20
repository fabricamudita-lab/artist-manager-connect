-- Fix infinite recursion in workspace_memberships RLS policies

-- Drop the problematic policy that references itself
DROP POLICY IF EXISTS "Users can view memberships in their workspaces" ON public.workspace_memberships;

-- Create a simple RLS policy that doesn't reference itself
CREATE POLICY "Users can view memberships in their workspaces" 
ON public.workspace_memberships 
FOR SELECT 
TO authenticated 
USING (
  -- Users can see their own membership
  user_id = auth.uid() OR 
  -- Users with OWNER role can see all memberships in their workspace
  workspace_id IN (
    SELECT wm2.workspace_id 
    FROM workspace_memberships wm2 
    WHERE wm2.user_id = auth.uid() 
    AND wm2.role = 'OWNER'
  )
);

-- Also fix project_team policies for adding members
DROP POLICY IF EXISTS "Users can insert project team" ON public.project_team;
CREATE POLICY "Users can insert project team" 
ON public.project_team 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Project creators/editors can add team members
  project_id IN (
    SELECT p.id FROM projects p 
    WHERE p.created_by = auth.uid()
  )
  OR
  -- Users with project roles can add members
  project_id IN (
    SELECT prb.project_id 
    FROM project_role_bindings prb 
    WHERE prb.user_id = auth.uid() 
    AND prb.role = 'EDITOR'
  )
);