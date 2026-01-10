-- Actualizar los budget_items que son porcentajes para que usen is_commission_percentage
-- en lugar de tener el valor calculado en unit_price

-- Presupuesto Rita Payés - David Solans (Management 12%)
UPDATE budget_items 
SET is_commission_percentage = true,
    commission_percentage = 12.00,
    unit_price = 0,
    observations = 'Formato: Quinteto (Nacional) - 12% del fee'
WHERE id = '3a3a9a53-e19d-429d-8ccf-667d5e44f1d4';

-- Presupuesto Rita Payés - Marco Perales (Booking 10%)
UPDATE budget_items 
SET is_commission_percentage = true,
    commission_percentage = 10.00,
    unit_price = 0,
    observations = 'Formato: Quinteto (Nacional) - 10% del fee'
WHERE id = 'c21fa995-5259-427b-a129-3d173b6d4d80';

-- Ahora recalcular unit_price basado en el fee actual (5000€)
UPDATE budget_items bi
SET unit_price = (SELECT b.fee FROM budgets b WHERE b.id = bi.budget_id) * bi.commission_percentage / 100
WHERE bi.is_commission_percentage = true 
AND bi.commission_percentage IS NOT NULL
AND bi.budget_id = 'd876e266-3a9d-4a12-8a43-e22f3c7829ec';