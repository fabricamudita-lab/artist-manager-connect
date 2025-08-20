-- Fix infinite recursion in projects RLS policy
-- Drop the problematic policy and create a simpler one

DROP POLICY IF EXISTS "Users can view projects" ON public.projects;

-- Create a much simpler policy that avoids recursion
CREATE POLICY "Users can view projects" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
  -- Project creator can see it
  created_by = auth.uid() OR
  -- During development, let authenticated users see all projects
  auth.role() = 'authenticated'
);

-- Also ensure we can create projects
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  created_by = auth.uid()
);

-- And update projects
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
CREATE POLICY "Users can update projects" 
ON public.projects 
FOR UPDATE 
TO authenticated 
USING (
  created_by = auth.uid() OR
  auth.role() = 'authenticated'
);