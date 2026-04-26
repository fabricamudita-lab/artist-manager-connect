-- ============================================================
-- FASE 1.5: Cerrar RLS en sync_offers, solicitudes y contacts
-- ============================================================

-- Helper: ¿puede ver este contacto?
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
        -- Creador
        c.created_by = _user_id
        -- Vinculado a un artista accesible
        OR (c.artist_id IS NOT NULL AND public.user_can_see_artist(_user_id, c.artist_id))
        -- Mismo workspace que el usuario (contacto creado por compañero)
        OR EXISTS (
          SELECT 1
          FROM public.workspace_memberships wm_self
          JOIN public.workspace_memberships wm_owner ON wm_owner.workspace_id = wm_self.workspace_id
          WHERE wm_self.user_id = _user_id
            AND wm_owner.user_id = c.created_by
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_contact(_user_id uuid, _contact_id uuid)
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
        OR (c.artist_id IS NOT NULL AND public.user_can_edit_artist(_user_id, c.artist_id))
      )
  );
$$;

-- ============================================================
-- sync_offers
-- ============================================================
DROP POLICY IF EXISTS "Users can view sync offers" ON public.sync_offers;
DROP POLICY IF EXISTS "Users can update sync offers" ON public.sync_offers;
DROP POLICY IF EXISTS "Users can delete their sync offers" ON public.sync_offers;
DROP POLICY IF EXISTS "Authenticated users can create sync offers" ON public.sync_offers;

CREATE POLICY "sync_offers_select_strict"
ON public.sync_offers FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_see_artist(auth.uid(), artist_id))
);

CREATE POLICY "sync_offers_insert_strict"
ON public.sync_offers FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (artist_id IS NULL OR public.user_can_edit_artist(auth.uid(), artist_id))
);

CREATE POLICY "sync_offers_update_strict"
ON public.sync_offers FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
)
WITH CHECK (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
);

CREATE POLICY "sync_offers_delete_strict"
ON public.sync_offers FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
);

-- (La política pública "Anyone can create sync offers via public form" se conserva intacta)

-- ============================================================
-- solicitudes
-- ============================================================
DROP POLICY IF EXISTS "Users can view solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Users can update solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Users can delete solicitudes" ON public.solicitudes;
DROP POLICY IF EXISTS "Users can create solicitudes" ON public.solicitudes;

CREATE POLICY "solicitudes_select_strict"
ON public.solicitudes FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_see_artist(auth.uid(), artist_id))
);

CREATE POLICY "solicitudes_insert_strict"
ON public.solicitudes FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "solicitudes_update_strict"
ON public.solicitudes FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
)
WITH CHECK (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
);

CREATE POLICY "solicitudes_delete_strict"
ON public.solicitudes FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR (artist_id IS NOT NULL AND public.user_can_edit_artist(auth.uid(), artist_id))
);

-- ============================================================
-- contacts
-- ============================================================
DROP POLICY IF EXISTS "Users can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts" ON public.contacts;

CREATE POLICY "contacts_select_strict"
ON public.contacts FOR SELECT
TO authenticated
USING (public.user_can_see_contact(auth.uid(), id));

CREATE POLICY "contacts_insert_strict"
ON public.contacts FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "contacts_update_strict"
ON public.contacts FOR UPDATE
TO authenticated
USING (public.user_can_edit_contact(auth.uid(), id))
WITH CHECK (public.user_can_edit_contact(auth.uid(), id));

CREATE POLICY "contacts_delete_strict"
ON public.contacts FOR DELETE
TO authenticated
USING (public.user_can_edit_contact(auth.uid(), id));

-- (Las políticas "Anon can read/update contacts via form token" se conservan intactas)