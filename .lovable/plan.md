
## Corregir la duplicación real de presupuestos de booking

### Qué he comprobado
- `BookingDetail`, `BookingKanban` y la duplicación masiva ya usan `duplicate_booking_deep`, así que el problema no está solo en el botón de duplicar.
- El fallo real sigue en varios puntos:
  1. `duplicate_booking_deep` no cubre bien los presupuestos que viven solo por `project_id`; si no entran en el fuzzy actual, no se copian.
  2. `BookingPresupuestoTab` mezcla presupuestos del booking con presupuestos del proyecto y el botón `Vincular` reutiliza el presupuesto existente en vez de crear una copia.
  3. `FileExplorer` busca el presupuesto por `festival_ciclo`/nombre, no por `booking_offer_id`, así que en duplicados puede abrir el presupuesto equivocado o ninguno.
  4. `BookingDriveTab` y la creación desde Drive insertan presupuestos sin `booking_offer_id`, así que algunos presupuestos “de booking” nacen sin quedar vinculados al evento.

### Cambios
1. **Nueva migración SQL**
- Ajustar `duplicate_booking_deep` para que:
  - priorice presupuestos con `booking_offer_id = booking_original`;
  - si no existe vínculo directo, detecte el presupuesto correcto del mismo `project_id` con contexto exacto del evento;
  - cree siempre una **copia nueva**;
  - asigne `booking_offer_id = booking_nuevo`;
  - copie los `budget_items`;
  - sobrescriba los datos de evento con los del booking nuevo: `fee`, `event_date`, `city`, `venue`, `country`, `formato`, `condiciones`, `festival_ciclo`.
- Mantener el nombre igual, sin prefijo “Copia”.

2. **`BookingPresupuestoTab.tsx`**
- Mostrar primero y de forma prioritaria los presupuestos directos del booking.
- Solo si no existe ninguno, mostrar presupuestos del proyecto como **fuentes para copiar**, no para reapuntar.
- Cambiar `Vincular` por `Duplicar aquí` / `Crear copia`, para no mover el presupuesto original de otro booking.

3. **`FileExplorer.tsx`**
- En la carpeta `Presupuesto`, resolver el presupuesto por `booking_offer_id` antes que por nombre/festival.
- Dejar el match por nombre solo como último fallback.

4. **`BookingDriveTab.tsx` y creación desde Drive**
- Añadir `booking_offer_id` en los inserts de presupuestos creados desde contexto booking.
- Alinear esta creación con la lógica de presupuesto de booking para que no vuelva a generarse un presupuesto “huérfano”.

### Archivos afectados
- Nueva migración SQL para `duplicate_booking_deep`
- `src/components/booking-detail/BookingPresupuestoTab.tsx`
- `src/components/drive/FileExplorer.tsx`
- `src/components/booking-detail/BookingDriveTab.tsx`

### Resultado esperado
- Al duplicar un booking, se crea un presupuesto nuevo e independiente con los mismos ítems.
- Ese presupuesto queda guardado dentro del booking nuevo.
- El presupuesto original no se reapunta ni se comparte.
- Al entrar en “Presupuesto”, se abre la copia correcta del booking nuevo y ya no aparecen esas dos opciones como si hubiera que elegir entre presupuestos existentes.
