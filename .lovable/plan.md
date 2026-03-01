

## Diagnóstico y corrección del sistema de auto-transición en Booking

### Diagnóstico encontrado

1. **`fecha` es de tipo DATE** en la base de datos -- no hay ambiguedad de tipo. La comparacion `.lt('fecha', today)` funciona correctamente con el cliente Supabase.

2. **PLAYGRXVND (19 Feb 2026)** esta atascado en `phase='confirmado'` con `estado='confirmado'`. La query lo detecta correctamente (fecha < hoy), por lo que el problema es que la transicion no se ejecuto (el hook `useAutoRealizado` solo corre una vez por carga de pagina, y la Edge Function cron pudo haber fallado o no estar programada).

3. **Desincronizacion `phase` vs `estado`**: `updateOfferPhase` solo escribe `phase`, nunca `estado`. `useAutoRealizado` y la Edge Function tambien solo actualizan `phase`. Varios componentes (CreateBookingWizard, EditBookingDialog, ProjectLinkedBookings) leen `estado` como fallback. Esto puede causar incoherencias.

4. **No hay boton manual** para forzar la sincronizacion de estados cuando el cron no ha corrido.

---

### Cambios planificados

#### 1. Diagnostico temporal con console.logs (`useAutoRealizado.ts`)

Agregar logs detallados para depuracion:
- Log de la fecha `today` usada
- Log de los eventos encontrados (id, festival_ciclo, fecha, phase)
- Log del resultado de la actualizacion
- Confirmar que el kanban usa `phase` como fuente de verdad (ya verificado en codigo)

#### 2. Sincronizar `phase` y `estado` en todas las escrituras

**`useAutoRealizado.ts`**: Cambiar `.update({ phase: 'realizado' })` a `.update({ phase: 'realizado', estado: 'realizado' })`

**`auto-booking-transitions/index.ts`** (Edge Function): Mismo cambio -- actualizar ambos campos simultaneamente.

**`BookingKanban.tsx`** (`updateOfferPhase`): Ya actualiza `phase`. Agregar `estado: newPhase` al `updateData` para mantener sincronizacion.

#### 3. Boton "Sincronizar estados" en la pagina Booking

Agregar un boton secundario en `src/pages/Booking.tsx` junto a "Exportar CSV":
- Icono `RefreshCw`
- Ejecuta la misma logica que `useAutoRealizado` (query confirmados con fecha pasada, update a realizado)
- Spinner mientras ejecuta
- Toast con resultado: "X eventos actualizados" o "Todo al dia"

#### 4. Migracion retroactiva

SQL migration para corregir los eventos existentes atascados:
```sql
UPDATE booking_offers 
SET phase = 'realizado', estado = 'realizado'
WHERE phase = 'confirmado' 
AND fecha < CURRENT_DATE;
```

#### 5. Documentacion del state machine

Agregar bloque de comentarios al inicio de `BookingKanban.tsx` documentando todas las transiciones manuales y automaticas.

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useAutoRealizado.ts` | Console.logs + sync `estado` |
| `supabase/functions/auto-booking-transitions/index.ts` | Sync `estado` en update |
| `src/components/BookingKanban.tsx` | Sync `estado` en `updateOfferPhase` + comentario state machine |
| `src/pages/Booking.tsx` | Boton "Sincronizar estados" |
| Nueva migracion SQL | Fix retroactivo confirmado -> realizado |

### Lo que NO se toca

- `needsConfirmGuard` y viabilidad
- Drag & drop
- `MarcarCobradoDialog`
- Real-time subscription
- `booking_checkpoints` trigger
- `BulkActionsBar`
- `BookingBuddy` / `BuddyPanel`

