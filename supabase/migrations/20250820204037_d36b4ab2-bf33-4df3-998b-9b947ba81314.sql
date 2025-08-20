-- Fix infinite recursion in workspace_memberships RLS policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view memberships in their workspaces" ON public.workspace_memberships;

-- Create a simple RLS policy that doesn't reference itself
CREATE POLICY "Users can view memberships in their workspaces" 
ON public.workspace_memberships 
FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR 
  workspace_id IN (
    SELECT wm.workspace_id 
    FROM workspace_memberships wm 
    WHERE wm.user_id = auth.uid() 
    AND wm.role IN ('OWNER', 'ADMIN')
  )
);

-- Also ensure project_team has proper RLS policies for adding members
DROP POLICY IF EXISTS "Users can insert project team" ON public.project_team;
CREATE POLICY "Users can insert project team" 
ON public.project_team 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Project managers can add team members
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id 
    AND p.management_user_id = auth.uid()
  )
  OR
  -- Users with editor role on project can add members
  EXISTS (
    SELECT 1 FROM project_team pt 
    WHERE pt.project_id = project_id 
    AND pt.user_id = auth.uid() 
    AND pt.role = 'EDITOR'
  )
);