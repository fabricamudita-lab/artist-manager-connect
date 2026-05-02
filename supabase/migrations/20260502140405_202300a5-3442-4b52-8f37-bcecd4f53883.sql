-- Realinear roles existentes en artist_role_bindings con el rol funcional
-- vigente del usuario (single source of truth = contacts.role).
-- El rol del binding queda derivado del rol funcional. Si el usuario no
-- tiene rol funcional, el binding queda como ARTIST_OBSERVER.

DO $$
DECLARE
  r RECORD;
  mapped public.artist_role;
  fn_role TEXT;
BEGIN
  FOR r IN
    SELECT arb.user_id, arb.artist_id, arb.role AS current_role
    FROM public.artist_role_bindings arb
  LOOP
    -- Buscar rol funcional del usuario en su contacto-espejo
    SELECT c.role INTO fn_role
    FROM public.contacts c
    WHERE c.field_config->>'workspace_user_id' = r.user_id::text
      AND c.field_config->>'mirror_type' = 'workspace_member'
      AND c.role IS NOT NULL
    LIMIT 1;

    -- Mapear (lowercase + sin acentos básico)
    mapped := CASE lower(coalesce(translate(fn_role,
                'áéíóúÁÉÍÓÚñÑ',
                'aeiouAEIOUnN'), ''))
      WHEN 'manager personal' THEN 'ARTIST_MANAGER'
      WHEN 'manager' THEN 'ARTIST_MANAGER'
      WHEN 'artist manager' THEN 'ARTIST_MANAGER'
      WHEN 'management' THEN 'ARTIST_MANAGER'
      WHEN 'agente de booking' THEN 'BOOKING_AGENT'
      WHEN 'booking agent' THEN 'BOOKING_AGENT'
      WHEN 'booker' THEN 'BOOKING_AGENT'
      WHEN 'productor' THEN 'PRODUCER'
      WHEN 'producer' THEN 'PRODUCER'
      WHEN 'productor musical' THEN 'PRODUCER'
      WHEN 'sello' THEN 'LABEL'
      WHEN 'label' THEN 'LABEL'
      WHEN 'discografica' THEN 'LABEL'
      WHEN 'editorial' THEN 'PUBLISHER'
      WHEN 'publisher' THEN 'PUBLISHER'
      WHEN 'a&r' THEN 'AR'
      WHEN 'ar' THEN 'AR'
      WHEN 'tecnico' THEN 'ROADIE_TECH'
      WHEN 'tecnico/roadie' THEN 'ROADIE_TECH'
      WHEN 'roadie' THEN 'ROADIE_TECH'
      WHEN 'observador' THEN 'ARTIST_OBSERVER'
      WHEN 'observer' THEN 'ARTIST_OBSERVER'
      ELSE 'ARTIST_OBSERVER'
    END;

    IF mapped IS DISTINCT FROM r.current_role THEN
      UPDATE public.artist_role_bindings
        SET role = mapped
        WHERE user_id = r.user_id AND artist_id = r.artist_id;
    END IF;

    fn_role := NULL;
  END LOOP;
END $$;