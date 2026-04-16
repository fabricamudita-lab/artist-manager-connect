

## Análisis

El usuario pide añadir notas/comentarios a la metadata de **Publishing (Derechos de Autor)** y **Master (Derechos Conexos)** en el módulo de créditos del lanzamiento. Las notas deben:
- Visualizarse en la app y en el PDF.
- Poder enlazarse a **todo el release** (álbum/EP) o a **una canción concreta**.

Antes hay un **build error** que bloquea cualquier cambio:

```
src/components/credits/AddCreditWithProfileForm.tsx(150,19)
'name' does not exist in type '{ ...; name: string; workspace_id: string; }[]'
```

Esto viene del cambio de tipo de `custom_instruments` a tabla con `workspace_id`. El insert en esa línea está pasando `{ name }` sin `workspace_id`. Hay que arreglarlo antes de tocar nada más.

## Exploración necesaria
- `src/components/credits/AddCreditWithProfileForm.tsx` (línea 150) — corregir insert.
- Estructura actual de `/releases/:id/creditos`: cómo se renderiza Publishing y Master, dónde están las cards (la captura muestra cards por canción con % de participación).
- Modelo de datos: tablas `track_credits` / `release_credits` o similar para entender dónde colgar las notas.
- Generador del PDF de créditos para inyectar las notas.

## Plan

### 1. Arreglar build error (bloqueante)
En `AddCreditWithProfileForm.tsx` L150, el insert a `custom_instruments` debe incluir `workspace_id` (resolver desde el artista del release o desde el contexto del usuario). Validar con Zod antes del insert.

### 2. Modelo de datos para notas
Nueva tabla `credit_notes`:

```text
credit_notes
  id              uuid PK
  release_id      uuid FK releases (NOT NULL, indexado)
  track_id        uuid FK tracks (NULL = nota global del release, indexado)
  scope           text CHECK ('publishing' | 'master')
  note            text (max 2000 chars)
  created_by      uuid
  created_at      timestamptz
  updated_at      timestamptz
```

- Índice compuesto `(release_id, scope, track_id)`.
- RLS reutilizando el patrón de `releases` (acceso vía workspace del artista).
- Validación Zod en el cliente antes de insert/update (`note: z.string().trim().max(2000)`).

### 3. UI en la app (`/releases/:id/creditos`)
En la sección **Derechos de Autor (Publishing)** y **Derechos Conexos (Master)**:

- **Nota global del release**: botón "Añadir nota general" en la cabecera de cada sección. Al añadirla se muestra como banner amarillo claro bajo el título.
- **Nota por canción**: dentro de cada card expandida (cuando el usuario hace click en la chevron), un campo "Notas" (textarea) editable inline con autosave (debounced 800ms).
- Indicador visual: icono 📝 junto al título de la card si tiene nota.

Componente nuevo: `CreditNotesEditor.tsx` reutilizable para ambos scopes.

### 4. Render en el PDF
En el generador PDF de créditos (buscaré el archivo en `src/lib/pdf/` o similar):

- **Nota global**: cuadro destacado al inicio de cada sección (Publishing / Master).
- **Nota por canción**: bajo la lista de participantes de cada canción, en cursiva con prefijo "Nota:".

Estilo coherente con la identidad MOODITA ya establecida en otros PDFs.

### 5. Capa de datos limpia
- Hook `useCreditNotes(releaseId, scope)` con React Query.
- Mutaciones con invalidación de la query y `onConflict` en upsert por `(release_id, track_id, scope)` para tratarlo como un único registro editable.
- Sin tocar auth ni el panel lateral.

### Cambios técnicos resumidos
| Área | Archivo / objeto |
|---|---|
| Fix build | `src/components/credits/AddCreditWithProfileForm.tsx` L150 |
| Migración | nueva tabla `credit_notes` + índices + RLS |
| Hook | `src/hooks/useCreditNotes.ts` |
| UI | `src/components/credits/CreditNotesEditor.tsx` + integración en sección Publishing/Master |
| PDF | extender el generador de créditos para incluir notas |

Sin paginación (volumen mínimo: 1 nota por canción + 1 global × scope), sin cambios en RLS de tablas existentes, validación Zod en cliente.

