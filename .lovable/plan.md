

## Undo en eliminaciones: "Deshacer" en toast

### Concepto

Cada vez que se elimine algo en la app, en lugar de solo mostrar "Eliminado", el toast incluira un boton **"Deshacer"** que permite revertir la accion durante unos segundos (5s por defecto). Se usa el patron "delete + undo = re-insert".

### Como funciona

1. Se guarda una copia del registro antes de eliminarlo
2. Se elimina de la base de datos
3. Se muestra un toast con boton "Deshacer"
4. Si el usuario pulsa "Deshacer", se re-inserta el registro guardado

### Implementacion

**1. Crear utilidad central `src/utils/undoableDelete.ts`**

Una funcion reutilizable que encapsula el patron:

```text
undoableDelete({
  table: 'releases',
  id: '...',
  successMessage: 'Lanzamiento eliminado',
  onUndo: () => { /* invalidar queries */ },
  onConfirm: () => { /* invalidar queries */ },
})
```

Internamente:
- Hace SELECT del registro completo antes de borrar
- Ejecuta DELETE
- Muestra `toast.success(message, { action: { label: 'Deshacer', onClick: restore } })`
- La funcion `restore` hace INSERT del registro guardado
- Tras restaurar, llama `onUndo` para refrescar las queries

**2. Aplicar en todos los puntos de eliminacion (16 archivos)**

Archivos a modificar, reemplazando el patron actual `delete + toast.success` por `undoableDelete`:

- `src/hooks/useReleases.ts` - releases y assets
- `src/hooks/useTrackRightsSplits.ts` - publishing y master splits
- `src/hooks/useRoyalties.ts` - song splits
- `src/hooks/usePaymentSchedules.ts` - pagos
- `src/pages/Booking.tsx` - ofertas
- `src/pages/Solicitudes.tsx` - solicitudes
- `src/pages/Budgets.tsx` - presupuestos
- `src/pages/release-sections/ReleaseAudio.tsx` - versiones
- `src/pages/release-sections/ReleaseCronograma.tsx` - tareas
- `src/pages/release-sections/ReleaseCreditos.tsx` - canciones y creditos
- `src/pages/release-sections/ReleasePresupuestos.tsx` - presupuestos
- `src/pages/release-sections/ReleaseImagenVideo.tsx` - assets y sesiones
- `src/components/booking-detail/BookingExpensesTab.tsx` - gastos
- `src/components/booking-detail/AvailabilityStatusCard.tsx` - contactos
- `src/components/royalties/EditSongDialog.tsx` - canciones
- `src/components/royalties/EditEarningDialog.tsx` - ganancias
- `src/components/releases/TrackRightsSplitsManager.tsx` - creditos
- `src/components/credits/LinkCreditContactDialog.tsx` - vinculos
- `src/components/TeamMemberProfileDialog.tsx` - miembros

**3. Duracion del toast**

Sonner permite configurar `duration` por toast. Se usaran **5 segundos** - suficiente para reaccionar sin ser molesto.

### Detalle tecnico de la utilidad

```text
async function undoableDelete(options: {
  table: string;
  id: string;
  successMessage: string;
  onComplete?: () => void;   // siempre al final (refrescar queries)
  duration?: number;          // ms, default 5000
}): Promise<void>
```

- Hace `SELECT * FROM table WHERE id = ?` para guardar snapshot
- Hace `DELETE FROM table WHERE id = ?`
- Muestra toast con action "Deshacer"
- Si se pulsa: `INSERT INTO table VALUES (snapshot)` y llama `onComplete`
- Si no se pulsa: llama `onComplete` igualmente (ya esta borrado)

Para los casos con logica extra (borrar archivo de storage, borrar cascada), se proporcionara una version mas flexible con callbacks `deleteAction` y `undoAction` personalizados.

### Resultado

El usuario vera en cada eliminacion un toast tipo:

```text
[icon] Lanzamiento eliminado         [Deshacer]
```

Si pulsa "Deshacer" en los 5 segundos, el registro vuelve a aparecer como si nada hubiera pasado.

