-- Insert sample booking offers to test the validation system
INSERT INTO public.booking_offers (
  fecha, 
  festival_ciclo, 
  ciudad, 
  lugar, 
  capacidad, 
  estado, 
  oferta, 
  formato, 
  contacto, 
  tour_manager, 
  contratos,
  created_by,
  artist_id
) VALUES 
-- Confirmed offer with all required fields (should show OK)
(
  '2025-09-18', 
  'Noches del Botánico', 
  'Madrid', 
  'Parque Felipe XV', 
  1574, 
  'Confirmado', 
  '15K + IVA + rider', 
  'Quinteto', 
  'Juan Pérez - booking@festival.com', 
  'María García - tour@management.com',
  'Contrato firmado el 15/08/2025',
  '41f70e08-843f-4044-97f6-62284bc3202b',
  '41f70e08-843f-4044-97f6-62284bc3202b'
),
-- Confirmed offer missing tour manager (should show error)
(
  '2025-08-25', 
  'Retrat D''artista Nº4', 
  'Barcelona', 
  'La Paloma', 
  500, 
  'Confirmado', 
  '8K + IVA', 
  'Trío', 
  'Anna Soler - info@lapaloma.com', 
  NULL,
  NULL,
  '41f70e08-843f-4044-97f6-62284bc3202b',
  '41f70e08-843f-4044-97f6-62284bc3202b'
),
-- Interest offer missing contact (should show error)
(
  '2025-10-15', 
  'Festival de Jazz', 
  'Valencia', 
  'Palau de la Música', 
  800, 
  'Interés', 
  '12K + gastos', 
  'Cuarteto', 
  NULL, 
  NULL,
  NULL,
  '41f70e08-843f-4044-97f6-62284bc3202b',
  '41f70e08-843f-4044-97f6-62284bc3202b'
),
-- Short lead time offer (should show warning)
(
  '2025-08-23', 
  'Concierto urgente', 
  'Sevilla', 
  'Teatro Central', 
  300, 
  'Propuesta', 
  '5K', 
  'Dúo', 
  'Carlos Ruiz - carlos@teatro.es', 
  NULL,
  NULL,
  '41f70e08-843f-4044-97f6-62284bc3202b',
  '41f70e08-843f-4044-97f6-62284bc3202b'
);