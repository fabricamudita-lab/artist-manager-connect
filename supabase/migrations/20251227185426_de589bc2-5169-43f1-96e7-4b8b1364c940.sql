
-- Update the create_booking_event_folder function to add Rider and Grafismos folders
CREATE OR REPLACE FUNCTION public.create_booking_event_folder(p_booking_id uuid, p_artist_id uuid, p_event_name text, p_event_date date, p_created_by uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- 4. Rider folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, v_event_folder_id, 'Rider', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- 5. Grafismos folder
  INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
  VALUES (p_artist_id, v_event_folder_id, 'Grafismos', 'folder', true, p_created_by)
  ON CONFLICT (artist_id, parent_id, name) DO NOTHING;

  -- Link folder to any associated project
  INSERT INTO public.project_resources (project_id, node_id, linked_by)
  SELECT p.id, v_event_folder_id, p_created_by
  FROM public.booking_offers bo
  JOIN public.projects p ON p.id = bo.project_id
  WHERE bo.id = p_booking_id AND bo.project_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN v_event_folder_id;
END;
$function$;

-- Also add Rider and Grafismos folders to the existing booking folder (2026.04.29 M00DITA)
INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
SELECT 
  'bf35084f-4c6b-4b9b-9a06-9cdef338fb1a',
  '31e51eb6-4004-455c-a1a9-6ef0c329e71e',
  'Rider',
  'folder',
  true,
  'b83d572f-5578-4016-9eea-47263099afd3'
WHERE NOT EXISTS (
  SELECT 1 FROM public.storage_nodes 
  WHERE parent_id = '31e51eb6-4004-455c-a1a9-6ef0c329e71e' AND name = 'Rider'
);

INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
SELECT 
  'bf35084f-4c6b-4b9b-9a06-9cdef338fb1a',
  '31e51eb6-4004-455c-a1a9-6ef0c329e71e',
  'Grafismos',
  'folder',
  true,
  'b83d572f-5578-4016-9eea-47263099afd3'
WHERE NOT EXISTS (
  SELECT 1 FROM public.storage_nodes 
  WHERE parent_id = '31e51eb6-4004-455c-a1a9-6ef0c329e71e' AND name = 'Grafismos'
);
