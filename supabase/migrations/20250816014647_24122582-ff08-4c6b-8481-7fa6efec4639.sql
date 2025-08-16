-- Actualizar eventos existentes para limpiar descripciones con IDs de solicitud
UPDATE public.events 
SET description = CASE 
  -- Si la descripción empieza con "Relacionado con solicitud", extraer solo las notas
  WHEN description LIKE 'Relacionado con solicitud %' THEN 
    CASE 
      WHEN description LIKE '%' || E'\n' || '%' THEN 
        -- Si hay un salto de línea, tomar todo después del primer salto de línea
        TRIM(SUBSTRING(description FROM POSITION(E'\n' IN description) + 1))
      ELSE 
        -- Si no hay notas adicionales, poner null
        NULL 
    END
  ELSE 
    -- Mantener la descripción original si no sigue el patrón
    description 
END
WHERE description LIKE 'Relacionado con solicitud %';