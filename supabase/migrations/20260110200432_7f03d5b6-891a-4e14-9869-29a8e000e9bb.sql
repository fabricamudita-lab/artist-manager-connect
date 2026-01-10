-- Corregir el presupuesto "260531 Sant Islce De Vallatla Rita Payés" (d876e266-3a9d-4a12-8a43-e22f3c7829ec)
-- Fee: 5000€, Nacional (España), Formato: Quinteto

-- 1. Corregir categoría tourmanager -> Transporte
UPDATE budget_items 
SET category = 'Transporte'
WHERE id = '6d8543cf-d0a0-4fbd-a4e7-2209dd130a2f';

-- 2. Corregir David Solans (Management) - 12% nacional del fee = 5000 * 0.12 = 600€
UPDATE budget_items 
SET unit_price = 600.00,
    observations = 'Formato: Quinteto (Nacional) - 12% del fee (5000€)'
WHERE id = '3a3a9a53-e19d-429d-8ccf-667d5e44f1d4';

-- 3. Corregir Marco Perales (Booking) - 10% nacional del fee = 5000 * 0.10 = 500€
UPDATE budget_items 
SET unit_price = 500.00,
    observations = 'Formato: Quinteto (Nacional) - 10% del fee (5000€)'
WHERE id = 'c21fa995-5259-427b-a129-3d173b6d4d80';

-- 4. Añadir item de Artista Principal "Rita Payés Roma" con fee nacional 1000€
-- Primero verificar si ya existe un item para el artista
INSERT INTO budget_items (budget_id, category, name, quantity, unit_price, iva_percentage, irpf_percentage, is_attendee, observations)
SELECT 
    'd876e266-3a9d-4a12-8a43-e22f3c7829ec',
    'Artista Principal',
    'Rita Payés Roma',
    1,
    1000.00,
    0,
    15,
    true,
    'Formato: Quinteto (Nacional) - Tarifa fija'
WHERE NOT EXISTS (
    SELECT 1 FROM budget_items 
    WHERE budget_id = 'd876e266-3a9d-4a12-8a43-e22f3c7829ec' 
    AND name = 'Rita Payés Roma'
);

-- 5. Eliminar el item genérico "Miembro" que no tiene contacto asociado
DELETE FROM budget_items 
WHERE id = '02a76a5d-8695-4e87-b68a-434bb26cd69a';