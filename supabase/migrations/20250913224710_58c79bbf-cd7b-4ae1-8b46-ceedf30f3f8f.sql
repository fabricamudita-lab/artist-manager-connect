-- Hacer el bucket facturas público para acceso directo
UPDATE storage.buckets 
SET public = true 
WHERE name = 'facturas';