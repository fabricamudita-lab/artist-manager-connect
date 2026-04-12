

## Plan: Sugerencias automáticas y cambio de opciones de tipo

### 3 cambios solicitados

**1. País — sugerir desde el artista**
El campo `artists` tiene `address` (texto libre). Al abrir el editor de pitch, si `country` está vacío, consultar el artista principal del release (vía `release_artists`) y extraer su `address` para pre-rellenar el campo país. Como `address` es texto libre y no hay campo `country` explícito en artistas, se usará el valor completo de `address` como sugerencia inicial (el usuario puede editarlo).

**2. Tipo — cambiar opciones a Single / EP / Album**
Reemplazar las opciones actuales `single`, `focus_track`, `full_album` por `single`, `ep`, `album`:
- Actualizar `PITCH_TYPE_LABELS` con las nuevas claves
- Cambiar los `SelectItem` en el editor
- Ajustar la lógica existente: donde dice `full_album` pasa a `album`, donde dice `focus_track` pasa a `ep`
- Mantener la lógica de auto-nombre: `album` y `ep` usan título del release, `single` usa título del track
- Si hay 1 sola canción, sigue siendo `single` por defecto
- Si hay varias, mostrar las 3 opciones

**3. Instrumentos — sugerir desde créditos**
Consultar `track_credits` de los tracks del release. Filtrar los roles de categoría `interprete` (guitarra, bajo, voz, etc.) y mapearlos a sus labels usando `INTERPRETE_ROLES` de `creditRoles.ts`. Incluir también `custom_instruments` si existen (campo `notes` en créditos con rol `otro_instrumento`). Pre-rellenar el campo `instruments` con la lista deduplicada separada por comas, solo si el campo está vacío.

### Archivos afectados

- `src/pages/release-sections/ReleasePitch.tsx` — los 3 cambios
- `src/lib/creditRoles.ts` — solo importar, sin modificar

### Detalle técnico

En `PitchEditor`, añadir un `useEffect` que al montar (cuando `pitch.id` cambia):
1. Consulta `release_artists` → `artists.address` del artista principal → si `localData.country` vacío, lo rellena
2. Consulta `track_credits` con los `track_id` del release → filtra roles de `INTERPRETE_ROLES` → mapea a labels → si `localData.instruments` vacío, lo rellena

Para el tipo, cambio directo de constantes y valores.

