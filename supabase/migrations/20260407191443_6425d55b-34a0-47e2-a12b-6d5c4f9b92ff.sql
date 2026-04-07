CREATE OR REPLACE FUNCTION public.duplicate_booking_deep(p_booking_id uuid, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_booking_id uuid;
  v_old_budget_id uuid;
  v_new_budget_id uuid;
  v_old_roadmap_id uuid;
  v_new_roadmap_id uuid;
  v_booking_row booking_offers%ROWTYPE;
BEGIN
  SELECT * INTO v_booking_row FROM booking_offers WHERE id = p_booking_id;
  IF v_booking_row IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  INSERT INTO booking_offers (
    artist_id, capacidad, ciudad, comision_euros, comision_porcentaje,
    condiciones, contacto, contratos, created_by, duracion,
    es_cityzen, es_internacional, es_privado, estado, estado_facturacion,
    fecha, fee, festival_ciclo, formato, gastos_estimados,
    hora, info_comentarios, inicio_venta, invitaciones, is_sold_out,
    link_venta, logistica, lugar, notas, oferta,
    pais, phase, project_id, promotor, publico,
    pvp, sort_order, tickets_sold, tour_manager, tour_manager_new,
    venue, adjuntos, anunciado, event_id
  )
  VALUES (
    v_booking_row.artist_id, v_booking_row.capacidad, v_booking_row.ciudad,
    v_booking_row.comision_euros, v_booking_row.comision_porcentaje,
    v_booking_row.condiciones, v_booking_row.contacto, v_booking_row.contratos,
    p_user_id, v_booking_row.duracion,
    v_booking_row.es_cityzen, v_booking_row.es_internacional, v_booking_row.es_privado,
    NULL, NULL,
    v_booking_row.fecha, v_booking_row.fee, v_booking_row.festival_ciclo,
    v_booking_row.formato, v_booking_row.gastos_estimados,
    v_booking_row.hora, v_booking_row.info_comentarios, v_booking_row.inicio_venta,
    v_booking_row.invitaciones, false,
    v_booking_row.link_venta, v_booking_row.logistica, v_booking_row.lugar,
    v_booking_row.notas, v_booking_row.oferta,
    v_booking_row.pais, 'interes', v_booking_row.project_id,
    v_booking_row.promotor, v_booking_row.publico,
    v_booking_row.pvp, v_booking_row.sort_order, NULL,
    v_booking_row.tour_manager, v_booking_row.tour_manager_new,
    v_booking_row.venue, v_booking_row.adjuntos, false, v_booking_row.event_id
  )
  RETURNING id INTO v_new_booking_id;

  -- 2. Duplicate budgets: search by direct link OR fuzzy match, assign new booking_offer_id
  FOR v_old_budget_id IN
    SELECT DISTINCT b.id FROM budgets b
    WHERE b.booking_offer_id = p_booking_id
    UNION
    SELECT DISTINCT b.id FROM budgets b
    WHERE b.booking_offer_id IS NULL
      AND b.artist_id = v_booking_row.artist_id
      AND b.event_date = v_booking_row.fecha
      AND (
        b.name ILIKE '%' || COALESCE(v_booking_row.festival_ciclo, '___NOMATCH___') || '%'
        OR b.venue = v_booking_row.venue
        OR b.city = v_booking_row.ciudad
      )
  LOOP
    INSERT INTO budgets (
      name, type, artist_id, booking_offer_id, event_date, event_time, city, venue, fee,
      formato, template_id, created_by, budget_status, country,
      capacidad, condiciones, expense_budget, festival_ciclo,
      internal_notes, invitaciones, oferta, project_id,
      settlement_status, show_status, status_negociacion
    )
    SELECT
      name, type, artist_id, v_new_booking_id, event_date, event_time, city, venue, fee,
      formato, template_id, p_user_id, budget_status, country,
      capacidad, condiciones, expense_budget, festival_ciclo,
      internal_notes, invitaciones, oferta, project_id,
      NULL, NULL, NULL
    FROM budgets WHERE id = v_old_budget_id
    RETURNING id INTO v_new_budget_id;

    INSERT INTO budget_items (
      budget_id, category, category_id, name, quantity, unit_price,
      iva_percentage, irpf_percentage, subcategory, observations,
      is_attendee, contact_id, commission_percentage, is_commission_percentage,
      provider_email
    )
    SELECT
      v_new_budget_id, category, category_id, name, quantity, unit_price,
      iva_percentage, irpf_percentage, subcategory, observations,
      is_attendee, contact_id, commission_percentage, is_commission_percentage,
      provider_email
    FROM budget_items WHERE budget_id = v_old_budget_id;
  END LOOP;

  -- 3a. Duplicate roadmaps with direct booking_id (legacy)
  FOR v_old_roadmap_id IN
    SELECT id FROM tour_roadmaps WHERE booking_id = p_booking_id
  LOOP
    INSERT INTO tour_roadmaps (
      name, artist_id, booking_id, created_by, start_date, end_date, promoter, status
    )
    SELECT name, artist_id, v_new_booking_id, p_user_id, start_date, end_date, promoter, status
    FROM tour_roadmaps WHERE id = v_old_roadmap_id
    RETURNING id INTO v_new_roadmap_id;

    INSERT INTO tour_roadmap_blocks (roadmap_id, block_type, data, sort_order)
    SELECT v_new_roadmap_id, block_type, data, sort_order
    FROM tour_roadmap_blocks WHERE roadmap_id = v_old_roadmap_id;

    INSERT INTO tour_roadmap_bookings (roadmap_id, booking_id, sort_order)
    VALUES (v_new_roadmap_id, v_new_booking_id, 0);
  END LOOP;

  -- 3b. Duplicate roadmaps linked via junction table
  FOR v_old_roadmap_id IN
    SELECT trb.roadmap_id FROM tour_roadmap_bookings trb
    WHERE trb.booking_id = p_booking_id
      AND trb.roadmap_id NOT IN (SELECT id FROM tour_roadmaps WHERE booking_id = p_booking_id)
  LOOP
    INSERT INTO tour_roadmaps (name, artist_id, created_by, start_date, end_date, promoter, status)
    SELECT name, artist_id, p_user_id, start_date, end_date, promoter, status
    FROM tour_roadmaps WHERE id = v_old_roadmap_id
    RETURNING id INTO v_new_roadmap_id;

    INSERT INTO tour_roadmap_blocks (roadmap_id, block_type, data, sort_order)
    SELECT v_new_roadmap_id, block_type, data, sort_order
    FROM tour_roadmap_blocks WHERE roadmap_id = v_old_roadmap_id;

    INSERT INTO tour_roadmap_bookings (roadmap_id, booking_id, sort_order)
    VALUES (v_new_roadmap_id, v_new_booking_id, 0);
  END LOOP;

  -- 4. Duplicate booking documents
  INSERT INTO booking_documents (booking_id, document_type, file_name, file_type, file_url, content, status, created_by)
  SELECT v_new_booking_id, document_type, file_name, file_type, file_url, content, 'draft', p_user_id
  FROM booking_documents WHERE booking_id = p_booking_id;

  -- 5. Duplicate booking expenses
  INSERT INTO booking_expenses (booking_id, description, amount, category, handler, payer, iva_percentage, created_by)
  SELECT v_new_booking_id, description, amount, category, handler, payer, iva_percentage, p_user_id
  FROM booking_expenses WHERE booking_id = p_booking_id;

  -- 6. Duplicate booking itinerary
  INSERT INTO booking_itinerary (booking_id, item_type, title, description, start_time, end_time, location, cost, handler, payer, sort_order, created_by)
  SELECT v_new_booking_id, item_type, title, description, start_time, end_time, location, cost, handler, payer, sort_order, p_user_id
  FROM booking_itinerary WHERE booking_id = p_booking_id;

  RETURN v_new_booking_id;
END;
$function$;