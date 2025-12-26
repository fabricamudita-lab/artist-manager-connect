-- =============================================================
-- ARCHITECTURAL REFACTOR: PHASE 1 - STORAGE NODES (DRIVE LOGIC)
-- =============================================================

-- 1. Create node_type enum for storage nodes
CREATE TYPE public.node_type AS ENUM ('folder', 'file');

-- 2. Create the storage_nodes table (The Source of Truth for Artist Drive)
CREATE TABLE public.storage_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.storage_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  node_type node_type NOT NULL DEFAULT 'folder',
  storage_path TEXT, -- For files: path in Supabase storage
  storage_bucket TEXT DEFAULT 'documents', -- Storage bucket name
  file_url TEXT, -- Direct URL for files
  file_size INTEGER,
  file_type TEXT, -- mime type
  is_system_folder BOOLEAN DEFAULT false, -- For default folders like Audiovisuales, Legal, etc.
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique names within same parent folder for same artist
  CONSTRAINT unique_node_name_per_parent UNIQUE (artist_id, parent_id, name)
);

-- 3. Create the project_resources junction table (Soft Links)
CREATE TABLE public.project_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES public.storage_nodes(id) ON DELETE CASCADE,
  linked_by UUID NOT NULL,
  linked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  permissions_snapshot JSONB DEFAULT '{}'::jsonb, -- Captured permissions at link time
  display_order INTEGER DEFAULT 0,
  
  -- A node can only be linked once to a project
  CONSTRAINT unique_project_node UNIQUE (project_id, node_id)
);

-- 4. Create indexes for performance
CREATE INDEX idx_storage_nodes_artist ON public.storage_nodes(artist_id);
CREATE INDEX idx_storage_nodes_parent ON public.storage_nodes(parent_id);
CREATE INDEX idx_storage_nodes_type ON public.storage_nodes(node_type);
CREATE INDEX idx_storage_nodes_system ON public.storage_nodes(is_system_folder) WHERE is_system_folder = true;
CREATE INDEX idx_project_resources_project ON public.project_resources(project_id);
CREATE INDEX idx_project_resources_node ON public.project_resources(node_id);

-- 5. Enable RLS
ALTER TABLE public.storage_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resources ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for storage_nodes
CREATE POLICY "Users can view storage nodes for artists they have access to"
ON public.storage_nodes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artists a
    LEFT JOIN public.artist_role_bindings arb ON arb.artist_id = a.id
    LEFT JOIN public.workspace_memberships wm ON wm.workspace_id = a.workspace_id
    WHERE a.id = storage_nodes.artist_id
    AND (arb.user_id = auth.uid() OR wm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create storage nodes"
ON public.storage_nodes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update storage nodes"
ON public.storage_nodes FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete storage nodes"
ON public.storage_nodes FOR DELETE
USING (auth.role() = 'authenticated' AND is_system_folder = false);

-- 7. RLS Policies for project_resources
CREATE POLICY "Users can view project resources"
ON public.project_resources FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create project resources"
ON public.project_resources FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete project resources"
ON public.project_resources FOR DELETE
USING (auth.role() = 'authenticated');

-- 8. Trigger for updated_at
CREATE TRIGGER update_storage_nodes_updated_at
BEFORE UPDATE ON public.storage_nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Function to create default artist folders
CREATE OR REPLACE FUNCTION public.create_default_artist_folders(p_artist_id UUID, p_created_by UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conciertos_id UUID;
  v_current_year TEXT;
BEGIN
  v_current_year := EXTRACT(YEAR FROM now())::TEXT;

  -- Create top-level system folders
  INSERT INTO public.storage_nodes (artist_id, name, node_type, is_system_folder, created_by)
  VALUES 
    (p_artist_id, 'Audiovisuales', 'folder', true, p_created_by),
    (p_artist_id, 'Legal', 'folder', true, p_created_by),
    (p_artist_id, 'Prensa', 'folder', true, p_created_by),
    (p_artist_id, 'Marketing', 'folder', true, p_created_by),
    (p_artist_id, 'Finanzas', 'folder', true, p_created_by),
    (p_artist_id, 'Riders', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- Create Conciertos folder and get its ID
  INSERT INTO public.storage_nodes (artist_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, 'Conciertos', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING
  RETURNING id INTO v_conciertos_id;

  -- If folder already existed, get its ID
  IF v_conciertos_id IS NULL THEN
    SELECT id INTO v_conciertos_id 
    FROM public.storage_nodes 
    WHERE artist_id = p_artist_id AND name = 'Conciertos' AND parent_id IS NULL;
  END IF;

  -- Create current year subfolder under Conciertos
  IF v_conciertos_id IS NOT NULL THEN
    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES (p_artist_id, v_conciertos_id, v_current_year, 'folder', true, p_created_by)
    ON CONFLICT (artist_id, parent_id, name) DO NOTHING;
  END IF;
END;
$$;

-- 10. Function to create event folder when booking is confirmed
CREATE OR REPLACE FUNCTION public.create_booking_event_folder(
  p_booking_id UUID,
  p_artist_id UUID,
  p_event_name TEXT,
  p_event_date DATE,
  p_created_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_folder_id UUID;
  v_event_folder_id UUID;
  v_year TEXT;
  v_conciertos_id UUID;
  v_folder_name TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM p_event_date)::TEXT;
  v_folder_name := TO_CHAR(p_event_date, 'YYYY.MM.DD') || ' ' || p_event_name;

  -- Get Conciertos folder
  SELECT id INTO v_conciertos_id 
  FROM public.storage_nodes 
  WHERE artist_id = p_artist_id AND name = 'Conciertos' AND parent_id IS NULL;

  -- Create Conciertos if doesn't exist
  IF v_conciertos_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, name, node_type, is_system_folder, created_by)
    VALUES (p_artist_id, 'Conciertos', 'folder', true, p_created_by)
    RETURNING id INTO v_conciertos_id;
  END IF;

  -- Get or create year folder
  SELECT id INTO v_year_folder_id 
  FROM public.storage_nodes 
  WHERE artist_id = p_artist_id AND parent_id = v_conciertos_id AND name = v_year;

  IF v_year_folder_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES (p_artist_id, v_conciertos_id, v_year, 'folder', true, p_created_by)
    RETURNING id INTO v_year_folder_id;
  END IF;

  -- Create event folder
  INSERT INTO public.storage_nodes (
    artist_id, parent_id, name, node_type, is_system_folder, 
    metadata, created_by
  )
  VALUES (
    p_artist_id, v_year_folder_id, v_folder_name, 'folder', false,
    jsonb_build_object('booking_id', p_booking_id, 'event_date', p_event_date),
    p_created_by
  )
  ON CONFLICT (artist_id, parent_id, name) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_event_folder_id;

  -- Create default subfolders for event
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, created_by)
  VALUES 
    (p_artist_id, v_event_folder_id, 'Presupuesto', 'folder', p_created_by),
    (p_artist_id, v_event_folder_id, 'Contratos', 'folder', p_created_by),
    (p_artist_id, v_event_folder_id, 'Hoja de Ruta', 'folder', p_created_by),
    (p_artist_id, v_event_folder_id, 'Riders', 'folder', p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  RETURN v_event_folder_id;
END;
$$;