-- Add DELETE policy for projects
CREATE POLICY "Users can delete projects" 
ON public.projects 
FOR DELETE 
TO authenticated 
USING (
  created_by = auth.uid() OR
  auth.role() = 'authenticated'
);