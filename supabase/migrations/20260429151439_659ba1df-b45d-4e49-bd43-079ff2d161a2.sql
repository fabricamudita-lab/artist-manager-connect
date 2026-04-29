-- =====================================================================
-- ENFORCEMENT RLS ADITIVO POR ROL FUNCIONAL (v2 — nombres reales)
-- =====================================================================
-- Todas las políticas son aditivas (OR) sobre las existentes.
-- has_functional_permission() ya hace bypass para OWNER/TEAM_MANAGER.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- ÍNDICES DE RENDIMIENTO
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contacts_mirror_type
  ON public.contacts ((field_config->>'mirror_type'));

CREATE INDEX IF NOT EXISTS idx_frdp_module
  ON public.functional_role_default_permissions (module);

-- =====================================================================
-- BOOKINGS  (booking_offers)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_bookings" ON public.booking_offers;
CREATE POLICY "func_perm_select_bookings" ON public.booking_offers
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = booking_offers.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'bookings', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_bookings" ON public.booking_offers;
CREATE POLICY "func_perm_insert_bookings" ON public.booking_offers
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = booking_offers.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'bookings', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_bookings" ON public.booking_offers;
CREATE POLICY "func_perm_update_bookings" ON public.booking_offers
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = booking_offers.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'bookings', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_bookings" ON public.booking_offers;
CREATE POLICY "func_perm_delete_bookings" ON public.booking_offers
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = booking_offers.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'bookings', 'manage')));

-- =====================================================================
-- BUDGETS
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_budgets" ON public.budgets;
CREATE POLICY "func_perm_select_budgets" ON public.budgets
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = budgets.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_budgets" ON public.budgets;
CREATE POLICY "func_perm_insert_budgets" ON public.budgets
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = budgets.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_budgets" ON public.budgets;
CREATE POLICY "func_perm_update_budgets" ON public.budgets
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = budgets.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_budgets" ON public.budgets;
CREATE POLICY "func_perm_delete_budgets" ON public.budgets
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = budgets.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'manage')));

-- BUDGET_ITEMS
DROP POLICY IF EXISTS "func_perm_select_budget_items" ON public.budget_items;
CREATE POLICY "func_perm_select_budget_items" ON public.budget_items
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.budgets b JOIN public.artists a ON a.id = b.artist_id
  WHERE b.id = budget_items.budget_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'view')));

DROP POLICY IF EXISTS "func_perm_write_budget_items" ON public.budget_items;
CREATE POLICY "func_perm_write_budget_items" ON public.budget_items
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.budgets b JOIN public.artists a ON a.id = b.artist_id
  WHERE b.id = budget_items.budget_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'edit')))
WITH CHECK (EXISTS (SELECT 1 FROM public.budgets b JOIN public.artists a ON a.id = b.artist_id
  WHERE b.id = budget_items.budget_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'budgets', 'edit')));

-- =====================================================================
-- CASHFLOW (cobros + transactions)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_cobros" ON public.cobros;
CREATE POLICY "func_perm_select_cobros" ON public.cobros
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cobros.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_cobros" ON public.cobros;
CREATE POLICY "func_perm_insert_cobros" ON public.cobros
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cobros.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_cobros" ON public.cobros;
CREATE POLICY "func_perm_update_cobros" ON public.cobros
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cobros.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_cobros" ON public.cobros;
CREATE POLICY "func_perm_delete_cobros" ON public.cobros
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = cobros.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'manage')));

DROP POLICY IF EXISTS "func_perm_select_transactions" ON public.transactions;
CREATE POLICY "func_perm_select_transactions" ON public.transactions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = transactions.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_transactions" ON public.transactions;
CREATE POLICY "func_perm_insert_transactions" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = transactions.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_transactions" ON public.transactions;
CREATE POLICY "func_perm_update_transactions" ON public.transactions
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = transactions.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_transactions" ON public.transactions;
CREATE POLICY "func_perm_delete_transactions" ON public.transactions
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = transactions.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'cashflow', 'manage')));

-- =====================================================================
-- CONTRACTS (contracts + contract_drafts)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_contracts" ON public.contracts;
CREATE POLICY "func_perm_select_contracts" ON public.contracts
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contracts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_contracts" ON public.contracts;
CREATE POLICY "func_perm_insert_contracts" ON public.contracts
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contracts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_contracts" ON public.contracts;
CREATE POLICY "func_perm_update_contracts" ON public.contracts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contracts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_contracts" ON public.contracts;
CREATE POLICY "func_perm_delete_contracts" ON public.contracts
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contracts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'manage')));

DROP POLICY IF EXISTS "func_perm_select_contract_drafts" ON public.contract_drafts;
CREATE POLICY "func_perm_select_contract_drafts" ON public.contract_drafts
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contract_drafts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_contract_drafts" ON public.contract_drafts;
CREATE POLICY "func_perm_insert_contract_drafts" ON public.contract_drafts
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contract_drafts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_contract_drafts" ON public.contract_drafts;
CREATE POLICY "func_perm_update_contract_drafts" ON public.contract_drafts
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contract_drafts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_contract_drafts" ON public.contract_drafts;
CREATE POLICY "func_perm_delete_contract_drafts" ON public.contract_drafts
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = contract_drafts.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'contracts', 'manage')));

-- =====================================================================
-- RELEASES + TRACKS
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_releases" ON public.releases;
CREATE POLICY "func_perm_select_releases" ON public.releases
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = releases.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_releases" ON public.releases;
CREATE POLICY "func_perm_insert_releases" ON public.releases
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = releases.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_releases" ON public.releases;
CREATE POLICY "func_perm_update_releases" ON public.releases
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = releases.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_releases" ON public.releases;
CREATE POLICY "func_perm_delete_releases" ON public.releases
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = releases.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'manage')));

DROP POLICY IF EXISTS "func_perm_select_tracks" ON public.tracks;
CREATE POLICY "func_perm_select_tracks" ON public.tracks
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.releases r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tracks.release_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'view')));

DROP POLICY IF EXISTS "func_perm_write_tracks" ON public.tracks;
CREATE POLICY "func_perm_write_tracks" ON public.tracks
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.releases r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tracks.release_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'edit')))
WITH CHECK (EXISTS (SELECT 1 FROM public.releases r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tracks.release_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'releases', 'edit')));

-- =====================================================================
-- PROJECTS
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_projects" ON public.projects;
CREATE POLICY "func_perm_select_projects" ON public.projects
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = projects.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'projects', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_projects" ON public.projects;
CREATE POLICY "func_perm_insert_projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = projects.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'projects', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_projects" ON public.projects;
CREATE POLICY "func_perm_update_projects" ON public.projects
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = projects.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'projects', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_projects" ON public.projects;
CREATE POLICY "func_perm_delete_projects" ON public.projects
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = projects.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'projects', 'manage')));

-- =====================================================================
-- DRIVE (storage_nodes)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_storage_nodes" ON public.storage_nodes;
CREATE POLICY "func_perm_select_storage_nodes" ON public.storage_nodes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = storage_nodes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'drive', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_storage_nodes" ON public.storage_nodes;
CREATE POLICY "func_perm_insert_storage_nodes" ON public.storage_nodes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = storage_nodes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'drive', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_storage_nodes" ON public.storage_nodes;
CREATE POLICY "func_perm_update_storage_nodes" ON public.storage_nodes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = storage_nodes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'drive', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_storage_nodes" ON public.storage_nodes;
CREATE POLICY "func_perm_delete_storage_nodes" ON public.storage_nodes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = storage_nodes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'drive', 'manage')));

-- =====================================================================
-- ROADMAPS (tour_roadmaps + tour_roadmap_blocks)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_tour_roadmaps" ON public.tour_roadmaps;
CREATE POLICY "func_perm_select_tour_roadmaps" ON public.tour_roadmaps
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = tour_roadmaps.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_tour_roadmaps" ON public.tour_roadmaps;
CREATE POLICY "func_perm_insert_tour_roadmaps" ON public.tour_roadmaps
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = tour_roadmaps.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_tour_roadmaps" ON public.tour_roadmaps;
CREATE POLICY "func_perm_update_tour_roadmaps" ON public.tour_roadmaps
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = tour_roadmaps.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_tour_roadmaps" ON public.tour_roadmaps;
CREATE POLICY "func_perm_delete_tour_roadmaps" ON public.tour_roadmaps
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = tour_roadmaps.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'manage')));

DROP POLICY IF EXISTS "func_perm_select_roadmap_blocks" ON public.tour_roadmap_blocks;
CREATE POLICY "func_perm_select_roadmap_blocks" ON public.tour_roadmap_blocks
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tour_roadmaps r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tour_roadmap_blocks.roadmap_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'view')));

DROP POLICY IF EXISTS "func_perm_write_roadmap_blocks" ON public.tour_roadmap_blocks;
CREATE POLICY "func_perm_write_roadmap_blocks" ON public.tour_roadmap_blocks
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tour_roadmaps r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tour_roadmap_blocks.roadmap_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'edit')))
WITH CHECK (EXISTS (SELECT 1 FROM public.tour_roadmaps r JOIN public.artists a ON a.id = r.artist_id
  WHERE r.id = tour_roadmap_blocks.roadmap_id
    AND public.has_functional_permission(auth.uid(), a.workspace_id, 'roadmaps', 'edit')));

-- =====================================================================
-- SOLICITUDES
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_solicitudes" ON public.solicitudes;
CREATE POLICY "func_perm_select_solicitudes" ON public.solicitudes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = solicitudes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'solicitudes', 'view')));

DROP POLICY IF EXISTS "func_perm_insert_solicitudes" ON public.solicitudes;
CREATE POLICY "func_perm_insert_solicitudes" ON public.solicitudes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = solicitudes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'solicitudes', 'edit')));

DROP POLICY IF EXISTS "func_perm_update_solicitudes" ON public.solicitudes;
CREATE POLICY "func_perm_update_solicitudes" ON public.solicitudes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = solicitudes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'solicitudes', 'edit')));

DROP POLICY IF EXISTS "func_perm_delete_solicitudes" ON public.solicitudes;
CREATE POLICY "func_perm_delete_solicitudes" ON public.solicitudes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.artists a WHERE a.id = solicitudes.artist_id
  AND public.has_functional_permission(auth.uid(), a.workspace_id, 'solicitudes', 'manage')));

-- =====================================================================
-- AUTOMATIONS (automation_configs — workspace_id directo)
-- =====================================================================
DROP POLICY IF EXISTS "func_perm_select_automations" ON public.automation_configs;
CREATE POLICY "func_perm_select_automations" ON public.automation_configs
FOR SELECT TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, 'automations', 'view'));

DROP POLICY IF EXISTS "func_perm_insert_automations" ON public.automation_configs;
CREATE POLICY "func_perm_insert_automations" ON public.automation_configs
FOR INSERT TO authenticated
WITH CHECK (public.has_functional_permission(auth.uid(), workspace_id, 'automations', 'edit'));

DROP POLICY IF EXISTS "func_perm_update_automations" ON public.automation_configs;
CREATE POLICY "func_perm_update_automations" ON public.automation_configs
FOR UPDATE TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, 'automations', 'edit'));

DROP POLICY IF EXISTS "func_perm_delete_automations" ON public.automation_configs;
CREATE POLICY "func_perm_delete_automations" ON public.automation_configs
FOR DELETE TO authenticated
USING (public.has_functional_permission(auth.uid(), workspace_id, 'automations', 'manage'));