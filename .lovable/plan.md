## Problema

En `Créditos y Autoría` (`/releases/:id/creditos`) y en `Audio` (`/releases/:id/audio`) los tracks comparten el campo `tracks.track_number`. Hoy presenta dos defectos:

1. **Numeración con huecos**: al eliminar el track 1, los restantes mantienen 2, 3, 4 en lugar de renumerarse a 1, 2, 3.
2. **No se puede reordenar**: el botón "Cambiar orden" solo aparece si `tracks.length > 1` **y** `release.status !== 'released'`. Si el lanzamiento está marcado como publicado, el botón desaparece y el usuario pierde la capacidad de reordenar (algo legítimo en muchos casos: corregir el orden tras la publicación).

Ambas operaciones tocan la misma columna (`tracks.track_number`), conviven con `track_credits`, `track_artists`, `track_versions` y la sección Audio. No tocan auth ni el panel de usuario: las RLS existentes sobre `tracks` siguen siendo la autorización; sólo escribimos `track_number` y respetamos el `release_id` que ya filtra el query.

## Solución

### 1. Renumeración automática tras borrar (y tras crear)

Centralizar la lógica en una utilidad `renumberTracks(releaseId)` separada del componente:

- Carga todos los tracks del release **paginados** (`range(0, 999)` por bloque) ordenados por `track_number` ascendente.
- Calcula el nuevo número secuencial 1..N.
- Para los que cambian, ejecuta `UPDATE` en lote (`upsert` con `onConflict: 'id'`), todos dentro del mismo `release_id` validado por RLS.
- Se invoca desde:
  - el `onSuccess` real del `deleteTrack` (después del undo expirado),
  - el final del `handleDragEnd` (refuerzo idempotente),
  - opcionalmente tras crear si el formulario permitió un número manual con hueco.

Ventaja: la UI nunca calcula nada, solo invalida `['tracks', id]`.

### 2. Reordenar siempre disponible

- Mantener el modo "Cambiar orden" con DnD (ya existe e integra `@dnd-kit`).
- Quitar la restricción `release?.status !== 'released'` del botón. Mostrarlo siempre que haya `>= 2` tracks.
- Si el release está `released`, mostrar al activar el modo un `Alert` ámbar: "Este lanzamiento ya está publicado. Reordenar puede afectar a metadatos enviados a distribución." El usuario puede continuar.
- Reutilizar `handleDragEnd` actual, pero después del `Promise.all` llamar a `renumberTracks(releaseId)` para garantizar 1..N consecutivos.

### 3. Validación estricta y seguridad

Añadir Zod en la capa de datos (no en la UI):

```ts
const TrackNumberSchema = z.number().int().min(1).max(999);
const ReorderInputSchema = z.object({
  releaseId: z.string().uuid(),
  orderedTrackIds: z.array(z.string().uuid()).min(1).max(500),
});
```

- Toda escritura pasa por `supabase.from('tracks').update(...)` parametrizado → sin SQL string concat → sin inyección.
- Los IDs se validan como UUID antes de ir al cliente.
- Los textos (títulos, ISRC) ya se renderizan con React (escape automático) → sin XSS. ISRC se valida con regex `/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/i`.

### 4. Edge cases cubiertos

- Borrado del último track → no hay nada que renumerar.
- Dos tracks con el mismo `track_number` por estado heredado → la renumeración los desempata por `created_at`.
- Fallo de red a mitad del `Promise.all` → toast de error y refetch (no se queda en estado inconsistente porque la renumeración es idempotente al reintentar).
- Release con cientos de tracks → la utilidad usa paginación de 1000 en 1000 (límite Supabase por defecto).
- Undo del borrado → al restaurar el track vuelve con su número antiguo, así que `renumberTracks` se ejecuta también en el callback de "deshacer" para reabsorberlo correctamente.

### 5. Separación de capas

Crear `src/lib/releases/trackOrdering.ts` con:
- `renumberTracks(releaseId: string): Promise<void>`
- `reorderTracks(releaseId: string, orderedIds: string[]): Promise<void>`

`ReleaseCreditos.tsx` y futuros consumidores (Audio, etc.) llaman a estas funciones puras. Cambiar de Supabase a otro backend mañana sólo afecta a este archivo.

## Archivos a tocar

- `src/lib/releases/trackOrdering.ts` (nuevo) — lógica + Zod.
- `src/pages/release-sections/ReleaseCreditos.tsx` — quitar el guard de `status !== 'released'`, llamar a `renumberTracks` en `deleteTrack.onSuccess` y al final de `handleDragEnd`, mostrar el aviso si está released.
- (Opcional) `src/pages/release-sections/ReleaseAudio.tsx` — solo consume `track_number`; al renumerarse en Créditos se refleja aquí automáticamente vía React Query invalidation.

No se requiere migración de base de datos ni cambios en RLS.
