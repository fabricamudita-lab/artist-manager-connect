
-- Trigger function: when a booking_document status changes to 'signed',
-- create a file node in the booking's "Contratos" subfolder in storage_nodes.
CREATE OR REPLACE FUNCTION public.sync_signed_contract_to_drive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_folder_id UUID;
  v_contratos_folder_id UUID;
  v_artist_id UUID;
  v_existing_node UUID;
BEGIN
  -- Only act when status changes to 'signed'
  IF NEW.status <> 'signed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'signed' THEN
    RETURN NEW; -- already signed, skip
  END IF;

  -- Get artist_id from the booking
  SELECT artist_id INTO v_artist_id
  FROM public.booking_offers
  WHERE id = NEW.booking_id;

  IF v_artist_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the event folder via metadata->booking_id
  SELECT id INTO v_event_folder_id
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND metadata->>'booking_id' = NEW.booking_id::text
    AND node_type = 'folder'
  LIMIT 1;

  IF v_event_folder_id IS NULL THEN
    RETURN NEW; -- no event folder yet, skip
  END IF;

  -- Find or create the "Contratos" subfolder
  SELECT id INTO v_contratos_folder_id
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND parent_id = v_event_folder_id
    AND name = 'Contratos'
    AND node_type = 'folder'
  LIMIT 1;

  IF v_contratos_folder_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES (v_artist_id, v_event_folder_id, 'Contratos', 'folder', true, COALESCE(NEW.created_by, auth.uid()))
    ON CONFLICT (artist_id, parent_id, name) DO NOTHING
    RETURNING id INTO v_contratos_folder_id;

    -- If conflict, fetch it
    IF v_contratos_folder_id IS NULL THEN
      SELECT id INTO v_contratos_folder_id
      FROM public.storage_nodes
      WHERE artist_id = v_artist_id
        AND parent_id = v_event_folder_id
        AND name = 'Contratos';
    END IF;
  END IF;

  -- Check if this contract file already exists in Drive (avoid duplicates)
  SELECT id INTO v_existing_node
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND parent_id = v_contratos_folder_id
    AND metadata->>'booking_document_id' = NEW.id::text
  LIMIT 1;

  IF v_existing_node IS NOT NULL THEN
    RETURN NEW; -- already synced
  END IF;

  -- Create file node in Drive
  INSERT INTO public.storage_nodes (
    artist_id, parent_id, name, node_type, 
    file_url, file_type, is_system_folder,
    metadata, created_by
  )
  VALUES (
    v_artist_id,
    v_contratos_folder_id,
    COALESCE(NEW.file_name, 'Contrato.pdf'),
    'file',
    NEW.file_url,
    COALESCE(NEW.file_type, 'application/pdf'),
    false,
    jsonb_build_object(
      'booking_document_id', NEW.id,
      'booking_id', NEW.booking_id,
      'synced_at', now()
    ),
    COALESCE(NEW.created_by, auth.uid())
  );

  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_signed_contract_to_drive ON public.booking_documents;
CREATE TRIGGER trg_sync_signed_contract_to_drive
  AFTER INSERT OR UPDATE ON public.booking_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_signed_contract_to_drive();

-- Retroactive sync: copy existing signed contracts that are not yet in Drive
DO $$
DECLARE
  r RECORD;
  v_event_folder_id UUID;
  v_contratos_folder_id UUID;
  v_artist_id UUID;
  v_existing UUID;
BEGIN
  FOR r IN 
    SELECT bd.* FROM public.booking_documents bd 
    WHERE bd.status = 'signed'
  LOOP
    SELECT artist_id INTO v_artist_id FROM public.booking_offers WHERE id = r.booking_id;
    IF v_artist_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_event_folder_id FROM public.storage_nodes
    WHERE artist_id = v_artist_id AND metadata->>'booking_id' = r.booking_id::text AND node_type = 'folder' LIMIT 1;
    IF v_event_folder_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_contratos_folder_id FROM public.storage_nodes
    WHERE artist_id = v_artist_id AND parent_id = v_event_folder_id AND name = 'Contratos' LIMIT 1;
    IF v_contratos_folder_id IS NULL THEN
      INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
      VALUES (v_artist_id, v_event_folder_id, 'Contratos', 'folder', true, r.created_by)
      ON CONFLICT (artist_id, parent_id, name) DO NOTHING
      RETURNING id INTO v_contratos_folder_id;
      IF v_contratos_folder_id IS NULL THEN
        SELECT id INTO v_contratos_folder_id FROM public.storage_nodes
        WHERE artist_id = v_artist_id AND parent_id = v_event_folder_id AND name = 'Contratos';
      END IF;
    END IF;

    SELECT id INTO v_existing FROM public.storage_nodes
    WHERE artist_id = v_artist_id AND parent_id = v_contratos_folder_id AND metadata->>'booking_document_id' = r.id::text LIMIT 1;
    IF v_existing IS NOT NULL THEN CONTINUE; END IF;

    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, file_url, file_type, is_system_folder, metadata, created_by)
    VALUES (v_artist_id, v_contratos_folder_id, COALESCE(r.file_name, 'Contrato.pdf'), 'file', r.file_url, COALESCE(r.file_type, 'application/pdf'), false,
      jsonb_build_object('booking_document_id', r.id, 'booking_id', r.booking_id, 'synced_at', now()), r.created_by);
  END LOOP;
END;
$$;
