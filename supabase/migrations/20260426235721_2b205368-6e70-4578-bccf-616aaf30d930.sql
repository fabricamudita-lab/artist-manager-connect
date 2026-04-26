
-- 1) Downgrade del usuario demo
UPDATE public.workspace_memberships wm
SET role = 'MEMBER'::public.workspace_role
FROM public.profiles p
WHERE wm.user_id = p.user_id
  AND lower(p.email) = lower('davidsolanscontact@gmail.com')
  AND wm.role = 'TEAM_MANAGER';

-- 2) Endurecer user_can_see_contact
CREATE OR REPLACE FUNCTION public.user_can_see_contact(_user_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contacts c
    WHERE c.id = _contact_id
      AND (
        c.created_by = _user_id
        OR (c.artist_id IS NOT NULL AND public.user_can_see_artist(_user_id, c.artist_id))
        OR EXISTS (
          SELECT 1
          FROM public.workspace_memberships wm_creator
          JOIN public.workspace_memberships wm_self
            ON wm_self.workspace_id = wm_creator.workspace_id
          WHERE wm_creator.user_id = c.created_by
            AND wm_self.user_id = _user_id
            AND wm_self.role IN ('OWNER', 'TEAM_MANAGER')
        )
      )
  );
$$;

-- 3) Cerrar profiles
DROP POLICY IF EXISTS "All authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Workspace managers can view member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.workspace_memberships wm_target
    JOIN public.workspace_memberships wm_self
      ON wm_self.workspace_id = wm_target.workspace_id
    WHERE wm_target.user_id = profiles.user_id
      AND wm_self.user_id = auth.uid()
      AND wm_self.role IN ('OWNER', 'TEAM_MANAGER')
  )
);

-- 4) Reforzar tablas con artist_id NULL
-- booking_offers
DROP POLICY IF EXISTS "booking_offers_select_strict" ON public.booking_offers;
CREATE POLICY "booking_offers_select_strict"
ON public.booking_offers FOR SELECT
USING (
  (artist_id IS NOT NULL AND public.user_can_see_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "booking_offers_insert_strict" ON public.booking_offers;
CREATE POLICY "booking_offers_insert_strict"
ON public.booking_offers FOR INSERT
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "booking_offers_update_strict" ON public.booking_offers;
CREATE POLICY "booking_offers_update_strict"
ON public.booking_offers FOR UPDATE
USING (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
)
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "booking_offers_delete_strict" ON public.booking_offers;
CREATE POLICY "booking_offers_delete_strict"
ON public.booking_offers FOR DELETE
USING (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

-- budgets
DROP POLICY IF EXISTS "budgets_select_strict" ON public.budgets;
CREATE POLICY "budgets_select_strict"
ON public.budgets FOR SELECT
USING (
  (artist_id IS NOT NULL AND public.user_can_see_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "budgets_insert_strict" ON public.budgets;
CREATE POLICY "budgets_insert_strict"
ON public.budgets FOR INSERT
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "budgets_update_strict" ON public.budgets;
CREATE POLICY "budgets_update_strict"
ON public.budgets FOR UPDATE
USING (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
)
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "budgets_delete_strict" ON public.budgets;
CREATE POLICY "budgets_delete_strict"
ON public.budgets FOR DELETE
USING (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

-- releases
DROP POLICY IF EXISTS "releases_select_strict" ON public.releases;
CREATE POLICY "releases_select_strict"
ON public.releases FOR SELECT
USING (
  (artist_id IS NOT NULL AND public.user_can_see_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "releases_insert_strict" ON public.releases;
CREATE POLICY "releases_insert_strict"
ON public.releases FOR INSERT
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);

DROP POLICY IF EXISTS "releases_update_strict" ON public.releases;
CREATE POLICY "releases_update_strict"
ON public.releases FOR UPDATE
USING (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
)
WITH CHECK (
  (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
  OR (artist_id IS NULL AND created_by = auth.uid())
);
