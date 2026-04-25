## Problema

En la captura los tracks aparecen como **2, continuuM** / **3, prisM** / **4, spectruM**. Falta el 1 porque en algún momento se borró un track antes de que existiera la renumeración automática, y nunca se ha vuelto a tocar la lista (ni borrado, ni reordenado), así que `renumberTracks` no se ha disparado.

Hoy el usuario sólo tiene dos vías para arreglarlo:
- Entrar en "Cambiar orden" y arrastrar (lo cual al guardar dispara `reorderTracks` → renumera a 1..N).
- Borrar y recrear (peligroso).

Falta una acción **directa y explícita** para:
1. Renumerar la lista completa a 1..N de un solo clic (arregla este caso exacto).
2. Editar manualmente el número de un track concreto (por si el usuario quiere asignar un número específico, p. ej. mover el 4 a la posición 1).

## Solución

### 1. Botón "Renumerar (1..N)" junto a "Cambiar orden"

En la cabecera de "Canciones y Autoría" añadir un botón secundario **"Renumerar"** (icono `ListOrdered`). Al pulsarlo:

- Pide confirmación con `AlertDialog`: *"Se reasignarán los números de pista como 1, 2, 3… respetando el orden actual. ¿Continuar?"*.
- Llama a `renumberTracks(releaseId)` (ya existe en `src/lib/releases/trackOrdering.ts`, hace exactamente esto de forma idempotente y con dos fases para evitar colisiones).
- Invalida `['tracks', id]` y muestra toast de éxito.

Esto resuelve el caso de la captura con un único clic.

### 2. Edición manual del número de pista

Dentro del modo **"Cambiar orden"** (que ya existe), junto a cada fila con el `GripVertical`, mostrar un input numérico pequeño (`w-16`, `type="number"`, min 1, max = total de tracks) con el `track_number` actual.

Comportamiento:
- El usuario edita el número y pulsa Enter o sale del input (`onBlur`).
- Validación con Zod: entero entre 1 y `tracks.length`. Si está fuera de rango → toast de error y revertir.
- Internamente se traduce a un **reordenamiento**: se reconstruye el array de IDs colocando el track editado en la nueva posición y desplazando los demás, y se llama a `reorderTracks(releaseId, newOrder)` (ya existente). Esto garantiza siempre 1..N consecutivos sin huecos ni duplicados.
- Si el usuario escribe un número ya ocupado, el otro track se desplaza (no se sobrescribe ni colisiona).

### 3. Capa de datos: nada nuevo

`renumberTracks` y `reorderTracks` ya cubren todo lo necesario:
- Validación Zod estricta (UUIDs, rango 1–999).
- Escrituras parametrizadas (sin SQL concat → sin inyección).
- Doble fase con offset +10000 para evitar colisiones de índice único.
- Paginación de 1000 en 1000.
- Idempotente: reintentar nunca corrompe el estado.

Sólo añadimos una función helper local en el componente:

```ts
function moveTrackToPosition(tracks: Track[], trackId: string, newPos: number): string[] {
  const ids = tracks.map(t => t.id);
  const from = ids.indexOf(trackId);
  if (from === -1) return ids;
  const target = Math.max(1, Math.min(newPos, ids.length)) - 1;
  ids.splice(target, 0, ids.splice(from, 1)[0]);
  return ids;
}
```

### 4. UX y avisos

- Si el release está `released`, el aviso ámbar ya existente sobre "puede afectar a metadatos enviados a distribución" se muestra también al activar la edición manual (es la misma condición).
- El botón **"Renumerar"** se muestra siempre que haya al menos 1 track. No requiere entrar en modo edición.
- Tras renumerar, la cabecera de la lista refresca automáticamente vía React Query invalidation, así que los números se actualizan en pantalla sin recargar.

## Archivos a tocar

- `src/pages/release-sections/ReleaseCreditos.tsx`:
  - Añadir botón "Renumerar" + `AlertDialog` de confirmación en la cabecera.
  - Añadir input de número editable en cada fila del modo "Cambiar orden", con validación Zod y llamada a `reorderTracks`.
  - Helper `moveTrackToPosition` local.

No se requieren cambios en base de datos, RLS, hooks ni en `trackOrdering.ts`.

## Resultado para el caso de la captura

- Opción rápida: clic en **Renumerar** → confirmar → los tracks pasan a ser **1. continuuM / 2. prisM / 3. spectruM**.
- Opción manual: entrar en "Cambiar orden", escribir `1` en el input de continuuM (o el orden que se quiera) → guarda y renumera consecutivamente.