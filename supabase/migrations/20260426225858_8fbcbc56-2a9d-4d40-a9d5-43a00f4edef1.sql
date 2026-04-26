-- ============================================================
-- FASE 1 (2/2): Cierre de RLS estricto
-- ============================================================

-- ---------------------- ARTISTS ----------------------
DROP POLICY IF EXISTS "Users can view artists" ON public.artists;
DROP POLICY IF EXISTS "Users can view artists in their workspaces" ON public.artists;
DROP POLICY IF EXISTS "Users can update artists" ON public.artists;
DROP POLICY IF EXISTS "Users can delete artists" ON public.artists;
DROP POLICY IF EXISTS "Users can create artists" ON public.artists;
DROP POLICY IF EXISTS "Team managers can create artists" ON public.artists;
DROP POLICY IF EXISTS "Team managers can update artists" ON public.artists;

CREATE POLICY "artists_select_strict"
ON public.artists FOR SELECT
USING (public.user_can_see_artist(auth.uid(), id));

CREATE POLICY "artists_insert_strict"
ON public.artists FOR INSERT
WITH CHECK (
  workspace_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = artists.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('OWNER', 'TEAM_MANAGER')
  )
);

CREATE POLICY "artists_update_strict"
ON public.artists FOR UPDATE
USING (public.user_can_edit_artist(auth.uid(), id))
WITH CHECK (public.user_can_edit_artist(auth.uid(), id));

CREATE POLICY "artists_delete_strict"
ON public.artists FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = artists.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role = 'OWNER'
  )
);

-- ---------------------- PROJECTS ----------------------
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;

CREATE POLICY "projects_select_strict"
ON public.projects FOR SELECT
USING (public.user_can_see_project(auth.uid(), id));

CREATE POLICY "projects_insert_strict"
ON public.projects FOR INSERT
WITH CHECK (
  artist_id IS NOT NULL
  AND public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "projects_update_strict"
ON public.projects FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), id))
WITH CHECK (public.user_can_edit_project(auth.uid(), id));

CREATE POLICY "projects_delete_strict"
ON public.projects FOR DELETE
USING (public.user_can_edit_artist(auth.uid(), artist_id));

-- ---------------------- ARTIST_ROLE_BINDINGS ----------------------
DROP POLICY IF EXISTS "Users can view artist roles in their workspaces" ON public.artist_role_bindings;

CREATE POLICY "arb_select_strict"
ON public.artist_role_bindings FOR SELECT
USING (
  user_id = auth.uid()
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "arb_insert_strict"
ON public.artist_role_bindings FOR INSERT
WITH CHECK (public.user_can_edit_artist(auth.uid(), artist_id));

CREATE POLICY "arb_update_strict"
ON public.artist_role_bindings FOR UPDATE
USING (public.user_can_edit_artist(auth.uid(), artist_id))
WITH CHECK (public.user_can_edit_artist(auth.uid(), artist_id));

CREATE POLICY "arb_delete_strict"
ON public.artist_role_bindings FOR DELETE
USING (public.user_can_edit_artist(auth.uid(), artist_id));

-- ---------------------- PROJECT_ROLE_BINDINGS ----------------------
DROP POLICY IF EXISTS "Users can view project roles they have access to" ON public.project_role_bindings;

CREATE POLICY "prb_select_strict"
ON public.project_role_bindings FOR SELECT
USING (
  user_id = auth.uid()
  OR public.user_can_edit_project(auth.uid(), project_id)
);

CREATE POLICY "prb_insert_strict"
ON public.project_role_bindings FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "prb_update_strict"
ON public.project_role_bindings FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "prb_delete_strict"
ON public.project_role_bindings FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- BUDGETS ----------------------
DROP POLICY IF EXISTS "Users can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can delete budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can create budgets" ON public.budgets;

CREATE POLICY "budgets_select_strict"
ON public.budgets FOR SELECT
USING (
  artist_id IS NULL
  OR public.user_can_see_artist(auth.uid(), artist_id)
);

CREATE POLICY "budgets_insert_strict"
ON public.budgets FOR INSERT
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "budgets_update_strict"
ON public.budgets FOR UPDATE
USING (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
)
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "budgets_delete_strict"
ON public.budgets FOR DELETE
USING (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

-- ---------------------- BOOKING_OFFERS ----------------------
DROP POLICY IF EXISTS "Users can view booking offers" ON public.booking_offers;
DROP POLICY IF EXISTS "Users can update booking offers" ON public.booking_offers;
DROP POLICY IF EXISTS "Users can delete booking offers" ON public.booking_offers;
DROP POLICY IF EXISTS "Users can create booking offers" ON public.booking_offers;

CREATE POLICY "booking_offers_select_strict"
ON public.booking_offers FOR SELECT
USING (
  artist_id IS NULL
  OR public.user_can_see_artist(auth.uid(), artist_id)
);

CREATE POLICY "booking_offers_insert_strict"
ON public.booking_offers FOR INSERT
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "booking_offers_update_strict"
ON public.booking_offers FOR UPDATE
USING (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
)
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "booking_offers_delete_strict"
ON public.booking_offers FOR DELETE
USING (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

-- ---------------------- RELEASES ----------------------
DROP POLICY IF EXISTS "Users can view releases" ON public.releases;
DROP POLICY IF EXISTS "Users can update releases" ON public.releases;
DROP POLICY IF EXISTS "Users can create releases" ON public.releases;
-- Keep: "Users can delete releases" (created_by = auth.uid()) — that's already strict
-- Keep: public share/pitch token policies

CREATE POLICY "releases_select_strict"
ON public.releases FOR SELECT
USING (
  artist_id IS NULL
  OR public.user_can_see_artist(auth.uid(), artist_id)
);

CREATE POLICY "releases_insert_strict"
ON public.releases FOR INSERT
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

CREATE POLICY "releases_update_strict"
ON public.releases FOR UPDATE
USING (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
)
WITH CHECK (
  artist_id IS NULL
  OR public.user_can_edit_artist(auth.uid(), artist_id)
);

-- ---------------------- PROJECT_TEAM ----------------------
DROP POLICY IF EXISTS "Users can view project team" ON public.project_team;
DROP POLICY IF EXISTS "Users can manage project team" ON public.project_team;
DROP POLICY IF EXISTS "Users can insert project team" ON public.project_team;
DROP POLICY IF EXISTS "Users can update project team" ON public.project_team;
DROP POLICY IF EXISTS "Users can delete project team" ON public.project_team;

CREATE POLICY "project_team_select_strict"
ON public.project_team FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_team_insert_strict"
ON public.project_team FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_team_update_strict"
ON public.project_team FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_team_delete_strict"
ON public.project_team FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_FILES ----------------------
DROP POLICY IF EXISTS "Users can view project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can manage project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can insert project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can update project files" ON public.project_files;
DROP POLICY IF EXISTS "Users can delete project files" ON public.project_files;

CREATE POLICY "project_files_select_strict"
ON public.project_files FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_files_insert_strict"
ON public.project_files FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_files_update_strict"
ON public.project_files FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_files_delete_strict"
ON public.project_files FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_FILE_LINKS ----------------------
DROP POLICY IF EXISTS "Users can view project file links" ON public.project_file_links;
DROP POLICY IF EXISTS "Users can manage project file links" ON public.project_file_links;
DROP POLICY IF EXISTS "Users can insert project file links" ON public.project_file_links;
DROP POLICY IF EXISTS "Users can delete project file links" ON public.project_file_links;

CREATE POLICY "project_file_links_select_strict"
ON public.project_file_links FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_file_links_insert_strict"
ON public.project_file_links FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_file_links_delete_strict"
ON public.project_file_links FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_CHECKLISTS ----------------------
DROP POLICY IF EXISTS "Users can view project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Users can manage project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Users can insert project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Users can update project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Users can delete project checklists" ON public.project_checklists;

CREATE POLICY "project_checklists_select_strict"
ON public.project_checklists FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_checklists_insert_strict"
ON public.project_checklists FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_checklists_update_strict"
ON public.project_checklists FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_checklists_delete_strict"
ON public.project_checklists FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_INCIDENTS ----------------------
DROP POLICY IF EXISTS "Users can view project incidents" ON public.project_incidents;
DROP POLICY IF EXISTS "Users can manage project incidents" ON public.project_incidents;
DROP POLICY IF EXISTS "Users can insert project incidents" ON public.project_incidents;
DROP POLICY IF EXISTS "Users can update project incidents" ON public.project_incidents;
DROP POLICY IF EXISTS "Users can delete project incidents" ON public.project_incidents;

CREATE POLICY "project_incidents_select_strict"
ON public.project_incidents FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_incidents_insert_strict"
ON public.project_incidents FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_incidents_update_strict"
ON public.project_incidents FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_incidents_delete_strict"
ON public.project_incidents FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_QUESTIONS ----------------------
DROP POLICY IF EXISTS "Users can view project questions" ON public.project_questions;
DROP POLICY IF EXISTS "Users can manage project questions" ON public.project_questions;
DROP POLICY IF EXISTS "Users can insert project questions" ON public.project_questions;
DROP POLICY IF EXISTS "Users can update project questions" ON public.project_questions;
DROP POLICY IF EXISTS "Users can delete project questions" ON public.project_questions;

CREATE POLICY "project_questions_select_strict"
ON public.project_questions FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_questions_insert_strict"
ON public.project_questions FOR INSERT
WITH CHECK (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_questions_update_strict"
ON public.project_questions FOR UPDATE
USING (public.user_can_edit_project(auth.uid(), project_id))
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_questions_delete_strict"
ON public.project_questions FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_RESOURCES ----------------------
DROP POLICY IF EXISTS "Users can view project resources" ON public.project_resources;
DROP POLICY IF EXISTS "Users can manage project resources" ON public.project_resources;
DROP POLICY IF EXISTS "Users can insert project resources" ON public.project_resources;
DROP POLICY IF EXISTS "Users can delete project resources" ON public.project_resources;

CREATE POLICY "project_resources_select_strict"
ON public.project_resources FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_resources_insert_strict"
ON public.project_resources FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_resources_delete_strict"
ON public.project_resources FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));

-- ---------------------- PROJECT_LINKED_ENTITIES ----------------------
DROP POLICY IF EXISTS "Users can view project linked entities" ON public.project_linked_entities;
DROP POLICY IF EXISTS "Users can manage project linked entities" ON public.project_linked_entities;
DROP POLICY IF EXISTS "Users can insert project linked entities" ON public.project_linked_entities;
DROP POLICY IF EXISTS "Users can delete project linked entities" ON public.project_linked_entities;

CREATE POLICY "project_linked_entities_select_strict"
ON public.project_linked_entities FOR SELECT
USING (public.user_can_see_project(auth.uid(), project_id));

CREATE POLICY "project_linked_entities_insert_strict"
ON public.project_linked_entities FOR INSERT
WITH CHECK (public.user_can_edit_project(auth.uid(), project_id));

CREATE POLICY "project_linked_entities_delete_strict"
ON public.project_linked_entities FOR DELETE
USING (public.user_can_edit_project(auth.uid(), project_id));
