-- Backfill: presupuestos existentes -> marcar comisiones como % (si existen en booking_product_crew)
DO $$
DECLARE
  r RECORD;
  v_is_international BOOLEAN;
  v_percentage NUMERIC;
BEGIN
  FOR r IN
    SELECT
      bi.id AS item_id,
      b.id AS budget_id,
      b.fee,
      b.country,
      bpc.percentage_national,
      bpc.percentage_international
    FROM public.budget_items bi
    JOIN public.budgets b ON b.id = bi.budget_id
    JOIN public.booking_products bp ON bp.artist_id = b.artist_id AND bp.name = b.formato
    JOIN public.booking_product_crew bpc
      ON bpc.booking_product_id = bp.id
     AND bpc.member_type = 'contact'
     AND bpc.is_percentage = true
     AND bpc.member_id::uuid = bi.contact_id
    WHERE bi.contact_id IS NOT NULL
      AND bi.is_commission_percentage IS NOT TRUE
  LOOP
    v_is_international := (r.country IS NOT NULL AND r.country != '' AND lower(trim(r.country)) NOT IN ('españa','espana','spain'));

    IF v_is_international THEN
      v_percentage := COALESCE(r.percentage_international, r.percentage_national, 0);
    ELSE
      v_percentage := COALESCE(r.percentage_national, r.percentage_international, 0);
    END IF;

    UPDATE public.budget_items
    SET
      is_commission_percentage = true,
      commission_percentage = v_percentage,
      unit_price = COALESCE(r.fee, 0) * v_percentage / 100
    WHERE id = r.item_id;
  END LOOP;
END $$;

-- Backfill: nombre del artista principal siempre = nombre del artista
UPDATE public.budget_items bi
SET name = a.name
FROM public.budgets b
JOIN public.artists a ON a.id = b.artist_id
WHERE bi.budget_id = b.id
  AND lower(bi.category) IN ('artista principal','artista')
  AND (bi.name IS NULL OR bi.name ILIKE 'artista principal' OR bi.name ILIKE 'miembro%');