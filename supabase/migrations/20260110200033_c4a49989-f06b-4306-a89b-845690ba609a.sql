-- Corregir categorías de budget_items existentes basándose en la categoría del contacto
UPDATE budget_items bi
SET category = CASE 
  WHEN c.category = 'banda' THEN 'Músicos'
  WHEN c.category = 'artistico' THEN 'Músicos'
  WHEN c.category = 'tecnico' THEN 'Equipo técnico'
  WHEN c.category = 'management' THEN 'Management'
  WHEN c.category = 'booking' THEN 'Booking'
  WHEN c.category = 'tourmanager' THEN 'Transporte'
  WHEN c.category = 'produccion' THEN 'Equipo técnico'
  WHEN c.category = 'compositor' THEN 'Músicos'
  WHEN c.category = 'letrista' THEN 'Músicos'
  WHEN c.category = 'productor' THEN 'Equipo técnico'
  WHEN c.category = 'interprete' THEN 'Músicos'
  WHEN c.category = 'sello' THEN 'Management'
  WHEN c.category = 'editorial' THEN 'Management'
  ELSE COALESCE(bi.category, 'Músicos')
END
FROM contacts c
WHERE bi.contact_id = c.id
AND bi.contact_id IS NOT NULL;