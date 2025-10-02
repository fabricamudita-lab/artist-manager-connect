-- Insert test budget for Festival Botánico Madrid (Rita Payés)
DO $$
DECLARE
  v_budget_id uuid;
  v_user_id uuid;
BEGIN
  -- Get first user as creator
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  -- Insert budget
  INSERT INTO public.budgets (
    created_by,
    name,
    type,
    city,
    venue,
    event_date,
    fee,
    festival_ciclo,
    capacidad,
    formato,
    budget_status,
    show_status,
    internal_notes
  ) VALUES (
    v_user_id,
    'Festival Botánico Madrid',
    'concierto',
    'Madrid',
    'Botánico (Main Stage)',
    '2025-07-26',
    17000.00,
    'Festival Botánico',
    NULL,
    'Banda + Cuarteto de Cuerdas',
    'nacional',
    'confirmado',
    'Caché: 17.000€ | Coste Real: 14.397,59€ | Margen: 1.900€'
  ) RETURNING id INTO v_budget_id;

  -- EQUIPO ARTÍSTICO
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, observations, invoice_link) VALUES
  (v_budget_id, 'Rita Payés', 'Equipo Artístico', 'Banda', 1, 1000.00, 21, 'pendiente', 'Artista principal', 'FRA-500'),
  (v_budget_id, 'Elisabeth Roma', 'Equipo Artístico', 'Banda', 1, 450.00, 21, 'pagado', NULL, 'FRA023'),
  (v_budget_id, 'Pol Batlle', 'Equipo Artístico', 'Banda', 1, 450.00, 21, 'pagado', NULL, 'FRA021'),
  (v_budget_id, 'Horacio Fumero', 'Equipo Artístico', 'Banda', 1, 450.00, 21, 'pagado', NULL, 'FRA05'),
  (v_budget_id, 'Juan R. Berbín', 'Equipo Artístico', 'Banda', 1, 450.00, 21, 'pagado', NULL, 'FRA032'),
  (v_budget_id, 'Eudald Payés', 'Equipo Artístico', 'Banda', 1, 250.00, 21, 'pagado', NULL, 'FRA20'),
  (v_budget_id, 'Paula (Violín)', 'Equipo Artístico', 'Cuarteto Cuerdas', 1, 350.00, 21, 'factura_solicitada', NULL, NULL),
  (v_budget_id, 'Biel Graells (Violín)', 'Equipo Artístico', 'Cuarteto Cuerdas', 1, 350.00, 21, 'pagado', NULL, 'FRA34'),
  (v_budget_id, 'Nina (Viola)', 'Equipo Artístico', 'Cuarteto Cuerdas', 1, 350.00, 21, 'pagado', NULL, 'FRA30'),
  (v_budget_id, 'Irma (Chello)', 'Equipo Artístico', 'Cuarteto Cuerdas', 1, 350.00, 21, 'pagado', NULL, 'FRA17');

  -- EQUIPO TÉCNICO / PRODUCCIÓN
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, observations, invoice_link) VALUES
  (v_budget_id, 'Biel (Tour Manager)', 'Equipo Técnico', 'Producción', 1, 450.00, 21, 'pagado', NULL, 'FRA31'),
  (v_budget_id, 'Cris (Producción)', 'Equipo Técnico', 'Producción', 1, 150.00, 21, 'pendiente', NULL, NULL),
  (v_budget_id, 'Dani (Técnico de sonido)', 'Equipo Técnico', 'Técnico', 1, 450.00, 21, 'pagado', NULL, 'FRA19'),
  (v_budget_id, 'Nin (Stage Manager)', 'Equipo Técnico', 'Producción', 1, 450.00, 21, 'pagado', NULL, 'FRA33'),
  (v_budget_id, 'Kris (Canguro)', 'Equipo Técnico', 'Servicios', 24, 15.00, 21, 'pagado', 'Cuidado de menores', 'B');

  -- TRANSPORTE
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, observations, invoice_link) VALUES
  (v_budget_id, 'Aviones Mallorca-Madrid', 'Transporte', 'Aéreo', 7, 137.73, 10, 'pagado', 'Banda principal', 'FRA06-FRA14'),
  (v_budget_id, 'Avión Mallorca-Madrid (Juna)', 'Transporte', 'Aéreo', 1, 22.27, 10, 'pagado', 'Menor de edad', 'FRA10'),
  (v_budget_id, 'Avión Mallorca-Madrid (Luara)', 'Transporte', 'Aéreo', 1, 95.91, 10, 'pagado', 'Menor de edad', 'FRA11'),
  (v_budget_id, 'Avión Mallorca-Madrid (Biel+cbbg)', 'Transporte', 'Aéreo', 1, 311.75, 0, 'pagado', 'Tarjeta Rita - 155€ no consolidados', 'BITLLET01'),
  (v_budget_id, 'Tren ida/vuelta (Eudald)', 'Transporte', 'Tren', 1, 62.35, 10, 'pagado', 'Tarjeta Rita', 'FRA15'),
  (v_budget_id, 'Tren ida (Biel Graells)', 'Transporte', 'Tren', 1, 42.64, 10, 'pagado', 'Tarjeta Rita', 'FRA39'),
  (v_budget_id, 'Tren ida (Kris, Nin, Irma)', 'Transporte', 'Tren', 1, 160.59, 10, 'pagado', 'Tarjeta Rita', 'FRA01'),
  (v_budget_id, 'Tren vuelta (Laia y David)', 'Transporte', 'Tren', 2, 21.04, 10, 'pagado', 'Tarjeta Rita - GXW98G', 'FRA34-FRA35'),
  (v_budget_id, 'Tren vuelta (Nin)', 'Transporte', 'Tren', 1, 42.46, 10, 'pagado', 'Tarjeta Rita', 'FRA02'),
  (v_budget_id, 'Tren vuelta (Irma)', 'Transporte', 'Tren', 1, 67.55, 10, 'pagado', 'Tarjeta Rita', 'FRA37'),
  (v_budget_id, 'Tren vuelta (Paula)', 'Transporte', 'Tren', 1, 47.59, 10, 'pagado', 'Tarjeta Rita', 'FRA36'),
  (v_budget_id, 'Tren nueva vuelta (Laia y David)', 'Transporte', 'Tren', 1, 54.22, 10, 'pagado', 'Tarjeta Rita', 'FRA16'),
  (v_budget_id, 'Maletas facturadas Mallorca-Madrid', 'Transporte', 'Equipaje', 2, 27.45, 2, 'pagado', 'Tarjeta Rita', 'FRA18'),
  (v_budget_id, 'Tren vuelta (Nina)', 'Transporte', 'Tren', 1, 40.91, 10, 'pagado', 'Tarjeta Rita', 'FRA38'),
  (v_budget_id, 'Tren ida (Nina)', 'Transporte', 'Tren', 1, 63.00, 10, 'pagado', 'Tarjeta Rita', 'FRA40');

  -- DIETAS
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, fecha_emision, observations, invoice_link) VALUES
  (v_budget_id, 'Honest Greens 1', 'Dietas', 'Comidas', 1, 58.09, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA024'),
  (v_budget_id, 'Honest Greens 2', 'Dietas', 'Comidas', 1, 8.14, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA025'),
  (v_budget_id, 'Honest Greens 3', 'Dietas', 'Comidas', 1, 64.09, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA026'),
  (v_budget_id, 'Honest Greens 4', 'Dietas', 'Comidas', 1, 12.09, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA027'),
  (v_budget_id, 'Honest Greens 5', 'Dietas', 'Comidas', 1, 18.60, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA028'),
  (v_budget_id, 'Atocha AREAS, SAU', 'Dietas', 'Comidas', 1, 57.16, 10, 'pagado', NULL, 'Pagado por David', 'FRA33'),
  (v_budget_id, 'Dinar Casa Carmen', 'Dietas', 'Comidas', 1, 167.09, 10, 'pagado', '2025-07-26', 'Tarjeta Rita', 'FRA029');

  -- OTROS GASTOS
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, observations) VALUES
  (v_budget_id, 'Alquiler furgoneta', 'Otros Gastos', 'Logística', 1, 200.00, 21, 'pendiente', NULL),
  (v_budget_id, 'Promoción', 'Otros Gastos', 'Marketing', 1, 200.00, 21, 'pendiente', NULL),
  (v_budget_id, 'Imprevistos', 'Otros Gastos', 'Contingencia', 1, 200.00, 21, 'pendiente', 'Fondo de contingencia');

  -- PORCENTAJES (COMISIONES)
  INSERT INTO public.budget_items (budget_id, name, category, subcategory, quantity, unit_price, iva_percentage, billing_status, observations, invoice_link) VALUES
  (v_budget_id, 'Booking (10%)', 'Comisiones', 'Booking', 1, 1700.00, 21, 'pagado', 'Sobre 17.000€', NULL),
  (v_budget_id, 'Management (12%)', 'Comisiones', 'Management', 1, 2040.00, 21, 'pagado', 'Sobre 17.000€', 'FRA022'),
  (v_budget_id, 'Rita Payés Enterprise (10%)', 'Comisiones', 'Enterprise', 1, 1700.00, 21, 'pendiente', 'Sobre 17.000€', NULL);

END $$;