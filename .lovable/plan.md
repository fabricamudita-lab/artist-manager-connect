
# Fix: No mostrar dialogo de confirmacion si disponibilidad y viabilidad ya estan aprobadas

## Problema

Al mover un booking a "Confirmado" en el Kanban, siempre aparece el dialogo preguntando si quieres confirmar directamente o consultar disponibilidad/viabilidad. Pero si el booking ya tiene las 3 aprobaciones de viabilidad (Manager, Tour Manager, Produccion) y la disponibilidad confirmada, no deberia aparecer ese dialogo -- deberia moverse directamente.

## Solucion

Modificar la logica de intercepcion en 3 puntos de `src/components/BookingKanban.tsx`:

1. **Agregar campos de viabilidad al tipo `BookingOffer`**: anadir `viability_manager_approved`, `viability_tour_manager_approved`, y `viability_production_approved` a la interfaz.

2. **Crear funcion helper** `needsConfirmGuard(offer)` que devuelve `true` solo si alguna de las 3 aprobaciones es `false`/`null`.

3. **Usar la funcion en los 3 puntos de intercepcion**:
   - Drag & drop (linea ~367)
   - CompactBookingCard onChangePhase en fases principales (linea ~772)
   - CompactBookingCard onChangePhase en archivo (linea ~831)

Si las 3 aprobaciones ya estan dadas, se llama directamente a `updateOfferPhase` sin mostrar el dialogo.

## Detalle tecnico

```text
// Logica actual (siempre intercepta):
if (newPhase === 'confirmado' && offer.phase !== 'confirmado') {
  setPendingConfirmOffer(id);  // Siempre muestra dialogo
}

// Logica nueva (solo intercepta si falta algo):
function needsConfirmGuard(offer: BookingOffer): boolean {
  return !(offer.viability_manager_approved &&
           offer.viability_tour_manager_approved &&
           offer.viability_production_approved);
}

if (newPhase === 'confirmado' && offer.phase !== 'confirmado' && needsConfirmGuard(offer)) {
  setPendingConfirmOffer(id);  // Solo si falta viabilidad
} else {
  updateOfferPhase(id, newPhase);  // Pasa directo
}
```

No requiere cambios en base de datos. Los datos de viabilidad ya se obtienen con `select(*)`.
