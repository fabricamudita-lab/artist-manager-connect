-- Limpieza de políticas legacy en project_checklists que coexistían con las strict
DROP POLICY IF EXISTS "Authenticated users can delete project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Authenticated users can insert project checklists" ON public.project_checklists;
DROP POLICY IF EXISTS "Authenticated users can update project checklists" ON public.project_checklists;

-- Limpieza equivalente en project_files (legacy permisiva)
DROP POLICY IF EXISTS "Users can upload project files" ON public.project_files;

-- Limpieza en releases (legacy permisiva en DELETE)
DROP POLICY IF EXISTS "Users can delete releases" ON public.releases;

-- Política DELETE estricta para releases (no había)
CREATE POLICY "releases_delete_strict"
ON public.releases FOR DELETE
TO authenticated
USING (artist_id IS NULL OR public.user_can_edit_artist(auth.uid(), artist_id));