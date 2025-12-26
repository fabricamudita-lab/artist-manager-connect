-- Update the create_booking_event_folder function to create sub-structures
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

  -- Create event folder with booking reference in metadata
  INSERT INTO public.storage_nodes (
    artist_id, parent_id, name, node_type, is_system_folder, 
    metadata, created_by
  )
  VALUES (
    p_artist_id, v_year_folder_id, v_folder_name, 'folder', false,
    jsonb_build_object('booking_id', p_booking_id, 'event_date', p_event_date),
    p_created_by
  )
  ON CONFLICT (artist_id, parent_id, name) DO UPDATE SET
    metadata = jsonb_build_object('booking_id', p_booking_id, 'event_date', p_event_date)
  RETURNING id INTO v_event_folder_id;

  -- Create sub-structures inside the event folder
  -- 1. Facturas folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, v_event_folder_id, 'Facturas', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- 2. Hojas de Ruta folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, v_event_folder_id, 'Hojas de Ruta', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- 3. Contratos folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, v_event_folder_id, 'Contratos', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- Link folder to booking via project_resources
  INSERT INTO public.project_resources (project_id, node_id, linked_by)
  SELECT p.id, v_event_folder_id, p_created_by
  FROM public.booking_offers bo
  JOIN public.projects p ON p.id = bo.project_id
  WHERE bo.id = p_booking_id AND bo.project_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN v_event_folder_id;
END;
$$;

-- Add index for faster folder lookups by booking_id in metadata
CREATE INDEX IF NOT EXISTS idx_storage_nodes_booking_metadata 
ON public.storage_nodes USING GIN ((metadata->'booking_id'));