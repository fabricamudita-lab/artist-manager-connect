
# Fix: Duplicar booking no copia las hojas de ruta vinculadas por tabla intermedia

## Problema

Al duplicar un booking, la hoja de ruta no aparece en el nuevo evento porque la funcion `duplicate_booking_deep` solo busca roadmaps con la referencia directa legacy (`tour_roadmaps.booking_id`), pero no busca en la tabla de vinculacion `tour_roadmap_bookings` que es donde realmente se crean los enlaces.

## Solucion

Modificar la funcion SQL `duplicate_booking_deep` para que ademas de duplicar roadmaps por referencia directa, tambien duplique los roadmaps vinculados por la tabla intermedia `tour_roadmap_bookings`.

## Detalle tecnico

Se creara una nueva migracion SQL que actualiza la funcion. El cambio en la seccion 3 (Duplicate roadmaps) sera:

1. Mantener la logica actual para roadmaps con `booking_id` directo (legacy).
2. Agregar un segundo bucle que busque roadmaps en `tour_roadmap_bookings` donde `booking_id = p_booking_id`, y para cada uno:
   - Duplique el roadmap y sus bloques (igual que el bucle actual).
   - Inserte una nueva fila en `tour_roadmap_bookings` vinculando el nuevo roadmap con el nuevo booking.
3. Tambien para los roadmaps legacy duplicados, insertar la vinculacion en `tour_roadmap_bookings` para mantener consistencia.

```text
-- Seccion 3 actualizada (pseudocodigo):

-- 3a. Roadmaps con booking_id directo (legacy) - logica existente + link en junction
FOR v_old_roadmap_id IN
  SELECT id FROM tour_roadmaps WHERE booking_id = p_booking_id
LOOP
  ... (duplicar roadmap y bloques como ahora) ...
  INSERT INTO tour_roadmap_bookings (roadmap_id, booking_id, sort_order)
  VALUES (v_new_roadmap_id, v_new_booking_id, 0);
END LOOP;

-- 3b. Roadmaps vinculados via junction table (excluyendo los ya procesados)
FOR v_old_roadmap_id IN
  SELECT trb.roadmap_id FROM tour_roadmap_bookings trb
  WHERE trb.booking_id = p_booking_id
    AND trb.roadmap_id NOT IN (
      SELECT id FROM tour_roadmaps WHERE booking_id = p_booking_id
    )
LOOP
  ... (duplicar roadmap y bloques) ...
  INSERT INTO tour_roadmap_bookings (roadmap_id, booking_id, sort_order)
  VALUES (v_new_roadmap_id, v_new_booking_id, 0);
END LOOP;
```

Esto requiere una nueva migracion SQL con `CREATE OR REPLACE FUNCTION`.
