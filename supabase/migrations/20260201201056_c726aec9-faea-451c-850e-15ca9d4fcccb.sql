-- Añadir columnas separadas para Publishing y Master
ALTER TABLE track_credits 
  ADD COLUMN IF NOT EXISTS publishing_percentage NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS master_percentage NUMERIC DEFAULT NULL;

-- Migrar datos existentes según el rol
-- Publishing roles: compositor, letrista, co-autor, arreglista, editorial
UPDATE track_credits 
SET publishing_percentage = percentage 
WHERE role IN ('compositor', 'letrista', 'co-autor', 'arreglista', 'editorial')
  AND percentage IS NOT NULL
  AND publishing_percentage IS NULL;

-- Master roles: productor, interprete, intérprete, vocalista, featured, sello, mezclador, masterizador, musico_sesion
UPDATE track_credits 
SET master_percentage = percentage 
WHERE role IN ('productor', 'interprete', 'intérprete', 'vocalista', 'featured', 'sello', 'mezclador', 'masterizador', 'musico_sesion')
  AND percentage IS NOT NULL
  AND master_percentage IS NULL;