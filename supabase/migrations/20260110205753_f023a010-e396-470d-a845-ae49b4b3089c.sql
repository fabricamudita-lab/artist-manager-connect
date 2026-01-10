-- Create function to delete booking folder and related data when booking is deleted
CREATE OR REPLACE FUNCTION public.on_booking_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_folder_id uuid;
BEGIN
  -- Find and delete the storage_node folder associated with this booking
  SELECT id INTO v_folder_id
  FROM public.storage_nodes
  WHERE metadata->>'booking_id' = OLD.id::text;
  
  IF v_folder_id IS NOT NULL THEN
    -- Delete all child nodes first (files and subfolders)
    DELETE FROM public.storage_nodes WHERE parent_id = v_folder_id;
    -- Delete the folder itself
    DELETE FROM public.storage_nodes WHERE id = v_folder_id;
  END IF;
  
  -- Delete associated budgets
  DELETE FROM public.budgets 
  WHERE id IN (
    SELECT b.id FROM public.budgets b
    JOIN public.storage_nodes sn ON sn.metadata->>'booking_id' = OLD.id::text
    WHERE b.artist_id = OLD.artist_id
  );
  
  -- Also try to find budget by event name pattern
  DELETE FROM public.budgets
  WHERE artist_id = OLD.artist_id
    AND (
      name ILIKE '%' || COALESCE(OLD.festival_ciclo, '') || '%'
      OR name ILIKE '%' || COALESCE(OLD.ciudad, '') || '%' || COALESCE(OLD.venue, '') || '%'
    )
    AND created_at >= OLD.created_at - interval '1 day';
  
  RETURN OLD;
END;
$$;

-- Create trigger to run before booking delete
DROP TRIGGER IF EXISTS trg_on_booking_delete ON public.booking_offers;
CREATE TRIGGER trg_on_booking_delete
BEFORE DELETE ON public.booking_offers
FOR EACH ROW
EXECUTE FUNCTION public.on_booking_delete();

-- Clean up orphaned folders (folders with booking_id that no longer exists)
DELETE FROM public.storage_nodes
WHERE metadata->>'booking_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.booking_offers bo 
    WHERE bo.id::text = metadata->>'booking_id'
  );