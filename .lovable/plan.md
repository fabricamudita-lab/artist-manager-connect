

## Plan: Letras + Créditos en el enlace público del release

### Mejoras al enlace `/shared/release/:token`
Añadir dos capas de información sobre cada track sin romper el reproductor actual:

1. **Letras sincronizadas (visualmente) con la reproducción**
   - Botón/icono "Ver letra" en cada track que tenga `lyrics`.
   - Al hacer clic se abre un **panel lateral** (drawer) o se expande la fila mostrando la letra completa con scroll.
   - Mientras la canción suena, la letra hace **auto-scroll suave** proporcional al progreso del audio (no es karaoke por línea —no tenemos timestamps por verso— pero sí avanza al ritmo del tema).
   - Botón para fijar/seguir scroll automáticamente o desactivarlo si el oyente quiere leer libremente.

2. **Créditos por canción**
   - Sección colapsable "Créditos" debajo de la letra (en el mismo panel) o como pestaña aparte dentro del panel.
   - Lista los créditos del track agrupados por categoría: Composición/Letra, Producción, Intérpretes, Otros.
   - Por cada crédito muestra: rol + nombre. Sin porcentajes ni datos sensibles (IPI, splits, contactos privados).
   - Si el track no tiene letra ni créditos, no aparece el botón.

3. **Cambios en datos cargados**
   - Ampliar la consulta de `tracks` para incluir `lyrics`.
   - Añadir consulta a `track_credits` (campos públicos: `role`, `name`, `track_id`, `sort_order`) para todos los tracks del release en una sola query `in('track_id', trackIds)`.
   - Mapear créditos por `track_id` en el estado.

### UI propuesta
- En cada fila del tracklist, junto a la duración, añadir un pequeño icono `FileText` si hay letra y/o créditos.
- Al hacer clic en ese icono (sin disparar el play) → abre un **Sheet** (drawer lateral derecho) con:
  - Cabecera: portada pequeña + título del track + artista.
  - Tabs: **Letra** | **Créditos**.
  - Letra: texto con `whitespace-pre-line`, scroll automático sincronizado con `audio.currentTime / duration`.
  - Créditos: lista agrupada por rol, estética minimalista negra/zinc consistente con el reproductor.
- El Sheet se mantiene abierto mientras suena el track y se puede dejar abierto al cambiar de canción (se actualiza el contenido al track activo si el usuario eligió "seguir reproducción").

### Archivos
| Archivo | Cambio |
|---|---|
| `src/pages/SharedRelease.tsx` | Añadir carga de `lyrics` y `track_credits`; añadir botón letra/créditos por track; integrar el panel lateral con tabs y auto-scroll de letra |
| `src/components/releases/SharedReleaseTrackPanel.tsx` *(nuevo)* | Componente Sheet con tabs Letra/Créditos, auto-scroll proporcional al progreso, agrupación de créditos por categoría |

### Detalles técnicos
- Datos públicos seguros: solo `role` y `name` de `track_credits` (nunca `contact_id`, `artist_id`, IPI, porcentajes).
- El RLS de `track_credits` debe permitir leer créditos cuando el `release_id` del track tiene `share_enabled=true`. Si no lo permite hoy, hará falta añadir una policy o usar una edge function pública. Verificaré esto al implementar y, si bloquea, propondré la policy mínima necesaria.
- Auto-scroll: `scrollTop = (currentTime / duration) * (scrollHeight - clientHeight)` con un flag `userScrolling` para no pelearse con el lector.
- Agrupación de créditos por palabras clave en `role` (composición/letra, producción, intérprete, mezcla/master, otros).
- Sin cambios al reproductor existente ni al diseño del tracklist principal.

