-- Allow workspace creator to create their own initial membership row (bootstrapping)
CREATE POLICY "Workspace creator can bootstrap membership"
ON public.workspace_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = workspace_memberships.workspace_id
      AND w.created_by = auth.uid()
  )
);