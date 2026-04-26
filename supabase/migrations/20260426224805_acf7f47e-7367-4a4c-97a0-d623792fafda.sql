-- ============================================================
-- FASE 1 (1/2): Enum + índices + funciones + bootstrap
-- ============================================================

-- 1) Ampliar enum artist_role con roles propios de la industria musical
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'LABEL';
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'BOOKING_AGENT';
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'PRODUCER';
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'PUBLISHER';
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'AR';
ALTER TYPE public.artist_role ADD VALUE IF NOT EXISTS 'ROADIE_TECH';

-- 2) Índices sobre columnas consultadas con frecuencia
CREATE INDEX IF NOT EXISTS idx_prb_user_id ON public.project_role_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_prb_project_id ON public.project_role_bindings(project_id);
CREATE INDEX IF NOT EXISTS idx_prb_user_project ON public.project_role_bindings(user_id, project_id);

CREATE INDEX IF NOT EXISTS idx_arb_user_id ON public.artist_role_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_arb_artist_id ON public.artist_role_bindings(artist_id);
CREATE INDEX IF NOT EXISTS idx_arb_user_artist ON public.artist_role_bindings(user_id, artist_id);

CREATE INDEX IF NOT EXISTS idx_wsm_user_id ON public.workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_wsm_user_ws ON public.workspace_memberships(user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_projects_artist_id ON public.projects(artist_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_artists_workspace_id ON public.artists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_artists_created_by ON public.artists(created_by);

-- 3) Funciones SECURITY DEFINER (evitan recursión RLS)
CREATE OR REPLACE FUNCTION public.user_can_see_artist(_user_id uuid, _artist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _artist_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.artist_role_bindings arb
        WHERE arb.user_id = _user_id AND arb.artist_id = _artist_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.workspace_memberships wm
          ON wm.workspace_id = a.workspace_id
        WHERE a.id = _artist_id
          AND wm.user_id = _user_id
          AND wm.role IN ('OWNER', 'TEAM_MANAGER')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_artist(_user_id uuid, _artist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _artist_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.artist_role_bindings arb
        WHERE arb.user_id = _user_id
          AND arb.artist_id = _artist_id
          AND arb.role::text IN ('ARTIST_MANAGER', 'LABEL')
      )
      OR EXISTS (
        SELECT 1
        FROM public.artists a
        JOIN public.workspace_memberships wm
          ON wm.workspace_id = a.workspace_id
        WHERE a.id = _artist_id
          AND wm.user_id = _user_id
          AND wm.role IN ('OWNER', 'TEAM_MANAGER')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.project_role_bindings prb
        WHERE prb.user_id = _user_id AND prb.project_id = _project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = _project_id
          AND public.user_can_see_artist(_user_id, p.artist_id)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.project_role_bindings prb
        WHERE prb.user_id = _user_id
          AND prb.project_id = _project_id
          AND prb.role = 'EDITOR'
      )
      OR EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = _project_id
          AND public.user_can_edit_artist(_user_id, p.artist_id)
      )
    );
$$;

-- 4) Bootstrap: sembrar bindings desde created_by para no romper accesos
INSERT INTO public.artist_role_bindings (user_id, artist_id, role)
SELECT DISTINCT a.created_by, a.id, 'ARTIST_MANAGER'::artist_role
FROM public.artists a
WHERE a.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.artist_role_bindings arb
    WHERE arb.user_id = a.created_by AND arb.artist_id = a.id
  );

INSERT INTO public.project_role_bindings (user_id, project_id, role)
SELECT DISTINCT p.created_by, p.id, 'EDITOR'::project_role
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.project_role_bindings prb
    WHERE prb.user_id = p.created_by AND prb.project_id = p.id
  );

-- 5) Corregir bug literal de workspaces SELECT (auto-join wm.workspace_id = wm.id)
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON public.workspaces;
CREATE POLICY "Users can view workspaces they belong to"
ON public.workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = workspaces.id
      AND wm.user_id = auth.uid()
  )
);
