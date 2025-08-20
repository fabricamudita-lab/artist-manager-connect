-- Fix infinite recursion in workspace_memberships by using security definer function

-- Create security definer function to check workspace ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.user_is_workspace_owner(_user_id uuid, _workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.user_id = _user_id 
    AND wm.workspace_id = _workspace_id
    AND wm.role = 'OWNER'
  );
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Users can view memberships in their workspaces" ON public.workspace_memberships;

CREATE POLICY "Users can view memberships in their workspaces" 
ON public.workspace_memberships 
FOR SELECT 
TO authenticated 
USING (
  -- Users can see their own membership
  user_id = auth.uid() OR 
  -- Users with OWNER role can see all memberships in their workspace  
  public.user_is_workspace_owner(auth.uid(), workspace_id)
);

-- Also fix other policies that might have similar issues
-- Update artist_role_bindings to use a simpler approach
DROP POLICY IF EXISTS "Users can view artist roles in their workspaces" ON public.artist_role_bindings;

CREATE POLICY "Users can view artist roles in their workspaces" 
ON public.artist_role_bindings 
FOR SELECT 
TO authenticated 
USING (
  -- Users can see their own roles
  user_id = auth.uid() OR
  -- Or if they have workspace access (using security definer function)
  EXISTS (
    SELECT 1 FROM public.artists a, public.workspace_memberships wm
    WHERE a.id = artist_role_bindings.artist_id
    AND wm.workspace_id = a.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- Update project_role_bindings to avoid recursion
DROP POLICY IF EXISTS "Users can view project roles they have access to" ON public.project_role_bindings;

CREATE POLICY "Users can view project roles they have access to" 
ON public.project_role_bindings 
FOR SELECT 
TO authenticated 
USING (
  -- Users can see their own roles
  user_id = auth.uid() OR
  -- Or if they have workspace access through the project's artist
  EXISTS (
    SELECT 1 FROM public.projects p, public.artists a, public.workspace_memberships wm
    WHERE p.id = project_role_bindings.project_id
    AND a.id = p.artist_id
    AND wm.workspace_id = a.workspace_id
    AND wm.user_id = auth.uid()
  )
);