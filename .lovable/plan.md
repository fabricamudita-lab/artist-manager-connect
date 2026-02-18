
# Fix: "Confirmar directamente" falla porque no establece las aprobaciones de viabilidad

## Problema

Al hacer clic en "Confirmar directamente" en el dialogo de edicion, se envia `phase: "confirmado"` pero las tres aprobaciones de viabilidad (`viability_manager_approved`, `viability_tour_manager_approved`, `viability_production_approved`) siguen en `false`. El trigger de base de datos rechaza la transicion con el error "No se puede confirmar: Falta aprobacion del Manager".

## Solucion

Modificar la funcion `saveBooking` en `EditBookingDialog.tsx` para que, cuando el `overridePhase` sea `'confirmado'`, incluya automaticamente las tres aprobaciones de viabilidad como `true` en el objeto de actualizacion (junto con el usuario actual y timestamp).

## Detalle tecnico

En `src/components/booking-detail/EditBookingDialog.tsx`, dentro de `saveBooking`, despues de construir `updateData` y antes de hacer el `.update()`:

```text
// Si estamos confirmando directamente, establecer las aprobaciones
if (overridePhase === 'confirmado') {
  updateData.viability_manager_approved = true;
  updateData.viability_manager_by = user.id;
  updateData.viability_manager_at = new Date().toISOString();
  updateData.viability_tour_manager_approved = true;
  updateData.viability_tour_manager_by = user.id;
  updateData.viability_tour_manager_at = new Date().toISOString();
  updateData.viability_production_approved = true;
  updateData.viability_production_by = user.id;
  updateData.viability_production_at = new Date().toISOString();
}
```

Tambien hay que asegurarse de que el `user` (del hook `useAuth`) esta disponible en el componente. Si no lo esta, se usara el `created_by` del booking o se obtendra del contexto de autenticacion.
