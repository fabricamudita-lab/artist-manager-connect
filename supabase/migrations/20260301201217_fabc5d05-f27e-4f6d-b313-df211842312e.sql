-- Robust contract-to-Drive sync helper
CREATE OR REPLACE FUNCTION public.sync_booking_document_to_drive(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc RECORD;
  v_event_folder_id UUID;
  v_contratos_folder_id UUID;
  v_artist_id UUID;
  v_existing_node_id UUID;
  v_existing_file_url TEXT;
  v_has_signed_signer BOOLEAN := false;
  v_valid_url BOOLEAN := false;
BEGIN
  SELECT id, booking_id, file_name, file_url, file_type, status, created_by
  INTO v_doc
  FROM public.booking_documents
  WHERE id = p_document_id;

  IF v_doc.id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.contract_signers cs
    WHERE cs.document_id = v_doc.id
      AND lower(coalesce(cs.status, '')) IN ('signed', 'firmado')
  ) INTO v_has_signed_signer;

  IF lower(coalesce(v_doc.status, '')) NOT IN ('signed', 'firmado') AND NOT v_has_signed_signer THEN
    RETURN;
  END IF;

  v_valid_url := v_doc.file_url IS NOT NULL
    AND btrim(v_doc.file_url) <> ''
    AND lower(v_doc.file_url) <> 'generated'
    AND v_doc.file_url ~* '^https?://';

  SELECT artist_id INTO v_artist_id
  FROM public.booking_offers
  WHERE id = v_doc.booking_id;

  IF v_artist_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_event_folder_id
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND node_type = 'folder'
    AND metadata->>'booking_id' = v_doc.booking_id::text
  LIMIT 1;

  IF v_event_folder_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_contratos_folder_id
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND parent_id = v_event_folder_id
    AND node_type = 'folder'
    AND name = 'Contratos'
  LIMIT 1;

  IF v_contratos_folder_id IS NULL THEN
    INSERT INTO public.storage_nodes (artist_id, parent_id, name, node_type, is_system_folder, created_by)
    VALUES (v_artist_id, v_event_folder_id, 'Contratos', 'folder', true, coalesce(v_doc.created_by, auth.uid()))
    ON CONFLICT (artist_id, parent_id, name) DO NOTHING
    RETURNING id INTO v_contratos_folder_id;

    IF v_contratos_folder_id IS NULL THEN
      SELECT id INTO v_contratos_folder_id
      FROM public.storage_nodes
      WHERE artist_id = v_artist_id
        AND parent_id = v_event_folder_id
        AND node_type = 'folder'
        AND name = 'Contratos'
      LIMIT 1;
    END IF;
  END IF;

  IF v_contratos_folder_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id, file_url
  INTO v_existing_node_id, v_existing_file_url
  FROM public.storage_nodes
  WHERE artist_id = v_artist_id
    AND parent_id = v_contratos_folder_id
    AND metadata->>'booking_document_id' = v_doc.id::text
  LIMIT 1;

  IF v_existing_node_id IS NOT NULL THEN
    IF v_valid_url AND (v_existing_file_url IS NULL OR btrim(v_existing_file_url) = '' OR lower(v_existing_file_url) = 'generated') THEN
      UPDATE public.storage_nodes
      SET file_url = v_doc.file_url,
          file_type = coalesce(v_doc.file_type, 'application/pdf')
      WHERE id = v_existing_node_id;
    END IF;
    RETURN;
  END IF;

  INSERT INTO public.storage_nodes (
    artist_id,
    parent_id,
    name,
    node_type,
    file_url,
    file_type,
    is_system_folder,
    metadata,
    created_by
  )
  VALUES (
    v_artist_id,
    v_contratos_folder_id,
    coalesce(v_doc.file_name, 'Contrato.pdf'),
    'file',
    CASE WHEN v_valid_url THEN v_doc.file_url ELSE NULL END,
    coalesce(v_doc.file_type, 'application/pdf'),
    false,
    jsonb_build_object(
      'booking_document_id', v_doc.id,
      'booking_id', v_doc.booking_id,
      'source_table', 'booking_documents',
      'synced_at', now()
    ),
    coalesce(v_doc.created_by, auth.uid())
  );
END;
$$;

-- Trigger wrapper for booking_documents
CREATE OR REPLACE FUNCTION public.trg_sync_booking_document_to_drive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_booking_document_to_drive(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_signed_contract_to_drive ON public.booking_documents;
DROP TRIGGER IF EXISTS trg_sync_booking_document_to_drive ON public.booking_documents;
CREATE TRIGGER trg_sync_booking_document_to_drive
  AFTER INSERT OR UPDATE OF status, file_url
  ON public.booking_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_booking_document_to_drive();

-- Trigger wrapper for contract_signers (covers signed_count >= 1 scenarios)
CREATE OR REPLACE FUNCTION public.trg_sync_contract_signer_to_drive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(coalesce(NEW.status, '')) IN ('signed', 'firmado') THEN
    PERFORM public.sync_booking_document_to_drive(NEW.document_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_contract_signer_to_drive ON public.contract_signers;
CREATE TRIGGER trg_sync_contract_signer_to_drive
  AFTER INSERT OR UPDATE OF status
  ON public.contract_signers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_contract_signer_to_drive();

-- Retroactive sync for already signed contracts or contracts with at least one signed signer
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT bd.id
    FROM public.booking_documents bd
    WHERE lower(coalesce(bd.status, '')) IN ('signed', 'firmado')
       OR EXISTS (
         SELECT 1
         FROM public.contract_signers cs
         WHERE cs.document_id = bd.id
           AND lower(coalesce(cs.status, '')) IN ('signed', 'firmado')
       )
  LOOP
    PERFORM public.sync_booking_document_to_drive(r.id);
  END LOOP;
END;
$$;