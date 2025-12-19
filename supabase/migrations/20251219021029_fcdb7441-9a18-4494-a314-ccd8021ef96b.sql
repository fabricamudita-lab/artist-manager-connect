-- RLS policies for inviting/managing workspace members

-- workspace_memberships: allow members to view their own row; managers/owners can view all in workspace
DROP POLICY IF EXISTS "Workspace members can view memberships" ON public.workspace_memberships;
CREATE POLICY "Workspace members can view memberships"
ON public.workspace_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
);

-- workspace_memberships: allow owners/managers to add members
DROP POLICY IF EXISTS "Workspace managers can add members" ON public.workspace_memberships;
CREATE POLICY "Workspace managers can add members"
ON public.workspace_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_workspace_owner(auth.uid(), workspace_id)
  OR (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
    AND role <> 'OWNER'
  )
);

-- workspace_memberships: allow owners/managers to update memberships
DROP POLICY IF EXISTS "Workspace managers can update members" ON public.workspace_memberships;
CREATE POLICY "Workspace managers can update members"
ON public.workspace_memberships
FOR UPDATE
TO authenticated
USING (
  public.user_is_workspace_owner(auth.uid(), workspace_id)
  OR public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
)
WITH CHECK (
  public.user_is_workspace_owner(auth.uid(), workspace_id)
  OR (
    public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
    AND role <> 'OWNER'
  )
);

-- workspace_memberships: allow owners/managers to remove members
DROP POLICY IF EXISTS "Workspace managers can remove members" ON public.workspace_memberships;
CREATE POLICY "Workspace managers can remove members"
ON public.workspace_memberships
FOR DELETE
TO authenticated
USING (
  public.user_is_workspace_owner(auth.uid(), workspace_id)
  OR public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
);


-- invitations: allow owners/managers to create invitations
DROP POLICY IF EXISTS "Workspace managers can create invitations" ON public.invitations;
CREATE POLICY "Workspace managers can create invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND (
    public.user_is_workspace_owner(auth.uid(), workspace_id)
    OR (
      public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
      AND role <> 'OWNER'
    )
  )
);

-- invitations: allow inviters / owners / managers to view invitations
DROP POLICY IF EXISTS "Workspace members can view invitations" ON public.invitations;
CREATE POLICY "Workspace members can view invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  invited_by = auth.uid()
  OR public.user_is_workspace_owner(auth.uid(), workspace_id)
  OR public.user_has_workspace_permission(auth.uid(), workspace_id, 'TEAM_MANAGER')
);
