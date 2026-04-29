-- =============================================================
-- Helpers: combinan acceso al artista + permiso funcional Releases
-- =============================================================
CREATE OR REPLACE FUNCTION public.can_view_release(_user_id uuid, _release_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.releases r
    LEFT JOIN public.artists a ON a.id = r.artist_id
    WHERE r.id = _release_id
      AND _user_id IS NOT NULL
      AND (
        -- Releases con artista: requiere ver al artista + permiso funcional
        (a.id IS NOT NULL
          AND public.user_can_see_artist(_user_id, a.id)
          AND public.has_functional_permission(_user_id, a.workspace_id, 'releases', 'view'::public.permission_level))
        OR
        -- Releases sin artista: solo el creador
        (a.id IS NULL AND r.created_by = _user_id)
        OR
        -- Multi-artista vía release_artists
        EXISTS (
          SELECT 1
          FROM public.release_artists ra
          JOIN public.artists a2 ON a2.id = ra.artist_id
          WHERE ra.release_id = r.id
            AND public.user_can_see_artist(_user_id, a2.id)
            AND public.has_functional_permission(_user_id, a2.workspace_id, 'releases', 'view'::public.permission_level)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_release(_user_id uuid, _release_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.releases r
    LEFT JOIN public.artists a ON a.id = r.artist_id
    WHERE r.id = _release_id
      AND _user_id IS NOT NULL
      AND (
        (a.id IS NOT NULL
          AND public.user_can_edit_artist(_user_id, a.id)
          AND public.has_functional_permission(_user_id, a.workspace_id, 'releases', 'edit'::public.permission_level))
        OR
        (a.id IS NULL AND r.created_by = _user_id)
        OR
        EXISTS (
          SELECT 1
          FROM public.release_artists ra
          JOIN public.artists a2 ON a2.id = ra.artist_id
          WHERE ra.release_id = r.id
            AND public.user_can_edit_artist(_user_id, a2.id)
            AND public.has_functional_permission(_user_id, a2.workspace_id, 'releases', 'edit'::public.permission_level)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_release(_user_id uuid, _release_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.releases r
    LEFT JOIN public.artists a ON a.id = r.artist_id
    WHERE r.id = _release_id
      AND _user_id IS NOT NULL
      AND (
        (a.id IS NOT NULL
          AND public.user_can_edit_artist(_user_id, a.id)
          AND public.has_functional_permission(_user_id, a.workspace_id, 'releases', 'manage'::public.permission_level))
        OR
        (a.id IS NULL AND r.created_by = _user_id)
      )
  );
$$;

-- =============================================================
-- RELEASES — eliminar políticas permisivas y dejar solo las funcionales
-- =============================================================
DROP POLICY IF EXISTS "releases_select_strict" ON public.releases;
DROP POLICY IF EXISTS "releases_insert_strict" ON public.releases;
DROP POLICY IF EXISTS "releases_update_strict" ON public.releases;
DROP POLICY IF EXISTS "releases_delete_strict" ON public.releases;
DROP POLICY IF EXISTS "func_perm_select_releases" ON public.releases;
DROP POLICY IF EXISTS "func_perm_insert_releases" ON public.releases;
DROP POLICY IF EXISTS "func_perm_update_releases" ON public.releases;
DROP POLICY IF EXISTS "func_perm_delete_releases" ON public.releases;

CREATE POLICY "releases_select_funcperm"
ON public.releases FOR SELECT TO authenticated
USING (
  -- Releases con artista: acceso al artista + permiso 'view'
  (artist_id IS NOT NULL
    AND public.user_can_see_artist(auth.uid(), artist_id)
    AND public.has_functional_permission(
      auth.uid(),
      (SELECT a.workspace_id FROM public.artists a WHERE a.id = releases.artist_id),
      'releases',
      'view'::public.permission_level))
  OR
  -- Releases sin artista: solo el creador
  (artist_id IS NULL AND created_by = auth.uid())
  OR
  -- Multi-artista
  EXISTS (
    SELECT 1
    FROM public.release_artists ra
    JOIN public.artists a2 ON a2.id = ra.artist_id
    WHERE ra.release_id = releases.id
      AND public.user_can_see_artist(auth.uid(), a2.id)
      AND public.has_functional_permission(auth.uid(), a2.workspace_id, 'releases', 'view'::public.permission_level)
  )
);

CREATE POLICY "releases_insert_funcperm"
ON public.releases FOR INSERT TO authenticated
WITH CHECK (
  (artist_id IS NOT NULL
    AND public.user_can_edit_artist(auth.uid(), artist_id)
    AND public.has_functional_permission(
      auth.uid(),
      (SELECT a.workspace_id FROM public.artists a WHERE a.id = releases.artist_id),
      'releases',
      'edit'::public.permission_level))
  OR
  (artist_id IS NULL AND created_by = auth.uid())
);

CREATE POLICY "releases_update_funcperm"
ON public.releases FOR UPDATE TO authenticated
USING (
  (artist_id IS NOT NULL
    AND public.user_can_edit_artist(auth.uid(), artist_id)
    AND public.has_functional_permission(
      auth.uid(),
      (SELECT a.workspace_id FROM public.artists a WHERE a.id = releases.artist_id),
      'releases',
      'edit'::public.permission_level))
  OR
  (artist_id IS NULL AND created_by = auth.uid())
)
WITH CHECK (
  (artist_id IS NOT NULL
    AND public.user_can_edit_artist(auth.uid(), artist_id)
    AND public.has_functional_permission(
      auth.uid(),
      (SELECT a.workspace_id FROM public.artists a WHERE a.id = releases.artist_id),
      'releases',
      'edit'::public.permission_level))
  OR
  (artist_id IS NULL AND created_by = auth.uid())
);

CREATE POLICY "releases_delete_funcperm"
ON public.releases FOR DELETE TO authenticated
USING (
  (artist_id IS NOT NULL
    AND public.user_can_edit_artist(auth.uid(), artist_id)
    AND public.has_functional_permission(
      auth.uid(),
      (SELECT a.workspace_id FROM public.artists a WHERE a.id = releases.artist_id),
      'releases',
      'manage'::public.permission_level))
  OR
  (artist_id IS NULL AND created_by = auth.uid())
);

-- =============================================================
-- TRACKS
-- =============================================================
DROP POLICY IF EXISTS "Users can manage tracks" ON public.tracks;
DROP POLICY IF EXISTS "func_perm_select_tracks" ON public.tracks;
DROP POLICY IF EXISTS "func_perm_write_tracks" ON public.tracks;

CREATE POLICY "tracks_select_funcperm"
ON public.tracks FOR SELECT TO authenticated
USING (public.can_view_release(auth.uid(), release_id));

CREATE POLICY "tracks_write_funcperm"
ON public.tracks FOR ALL TO authenticated
USING (public.can_edit_release(auth.uid(), release_id))
WITH CHECK (public.can_edit_release(auth.uid(), release_id));

-- =============================================================
-- TRACK_CREDITS
-- =============================================================
DROP POLICY IF EXISTS "Users can manage track credits" ON public.track_credits;

CREATE POLICY "track_credits_select_funcperm"
ON public.track_credits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = track_credits.track_id
      AND public.can_view_release(auth.uid(), t.release_id)
  )
);

CREATE POLICY "track_credits_write_funcperm"
ON public.track_credits FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = track_credits.track_id
      AND public.can_edit_release(auth.uid(), t.release_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tracks t
    WHERE t.id = track_credits.track_id
      AND public.can_edit_release(auth.uid(), t.release_id)
  )
);

-- =============================================================
-- RELEASE_ARTISTS
-- =============================================================
DROP POLICY IF EXISTS "release_artists_all" ON public.release_artists;

CREATE POLICY "release_artists_select_funcperm"
ON public.release_artists FOR SELECT TO authenticated
USING (public.can_view_release(auth.uid(), release_id));

CREATE POLICY "release_artists_write_funcperm"
ON public.release_artists FOR ALL TO authenticated
USING (public.can_edit_release(auth.uid(), release_id))
WITH CHECK (public.can_edit_release(auth.uid(), release_id));

-- =============================================================
-- RELEASE_ASSETS
-- =============================================================
DROP POLICY IF EXISTS "Users can manage release assets" ON public.release_assets;

CREATE POLICY "release_assets_select_funcperm"
ON public.release_assets FOR SELECT TO authenticated
USING (public.can_view_release(auth.uid(), release_id));

CREATE POLICY "release_assets_write_funcperm"
ON public.release_assets FOR ALL TO authenticated
USING (public.can_edit_release(auth.uid(), release_id))
WITH CHECK (public.can_edit_release(auth.uid(), release_id));

-- =============================================================
-- RELEASE_BUDGETS
-- =============================================================
DROP POLICY IF EXISTS "Users can manage release budgets" ON public.release_budgets;

CREATE POLICY "release_budgets_select_funcperm"
ON public.release_budgets FOR SELECT TO authenticated
USING (public.can_view_release(auth.uid(), release_id));

CREATE POLICY "release_budgets_write_funcperm"
ON public.release_budgets FOR ALL TO authenticated
USING (public.can_edit_release(auth.uid(), release_id))
WITH CHECK (public.can_edit_release(auth.uid(), release_id));

-- =============================================================
-- RELEASE_MILESTONES
-- =============================================================
DROP POLICY IF EXISTS "Users can manage release milestones" ON public.release_milestones;

CREATE POLICY "release_milestones_select_funcperm"
ON public.release_milestones FOR SELECT TO authenticated
USING (public.can_view_release(auth.uid(), release_id));

CREATE POLICY "release_milestones_write_funcperm"
ON public.release_milestones FOR ALL TO authenticated
USING (public.can_edit_release(auth.uid(), release_id))
WITH CHECK (public.can_edit_release(auth.uid(), release_id));

-- Índices para acelerar las comprobaciones de RLS
CREATE INDEX IF NOT EXISTS idx_release_artists_release ON public.release_artists(release_id);
CREATE INDEX IF NOT EXISTS idx_release_artists_artist ON public.release_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_release ON public.tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_track_credits_track ON public.track_credits(track_id);
CREATE INDEX IF NOT EXISTS idx_release_assets_release ON public.release_assets(release_id);
CREATE INDEX IF NOT EXISTS idx_release_budgets_release ON public.release_budgets(release_id);
CREATE INDEX IF NOT EXISTS idx_release_milestones_release ON public.release_milestones(release_id);