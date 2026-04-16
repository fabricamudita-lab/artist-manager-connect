

## Análisis

**Problema 1: Klaus Stroink duplicado**
En la captura veo dos nodos: uno verde "Artista principal" (KS con estrella) y uno morado "Klaus Stroink ... Compositor, Au...". Esto pasa porque en `/teams` el sistema inyecta automáticamente al artista principal como tarjeta verde (ver memoria `mem://contacts/teams-artist-interaction`), pero además existe un `contact` independiente con el mismo nombre que aparece como miembro morado.

Necesito verificar la lógica exacta antes de proponer fusión. Tengo que mirar:
- Cómo se renderizan ambas tarjetas en la vista libre (canvas).
- Si ya existe deduplicación entre artista principal inyectado y contacto homónimo.
- La función `deduplicateContacts` ya existe pero solo fusiona `contacts` entre sí, NO fusiona artista principal + contacto.

**Problema 2: Categoría "Banda" → instrumentos Ditto**
Cuando un miembro tiene la categoría "Banda", debería abrirse un sub-selector con la lista estándar de instrumentos de Ditto (la misma que ya se usa en `distribution_roles` / créditos de tracks). Ya existe esta lista en el proyecto (memoria `mem://releases/distribution-roles` y `mem://releases/credits-rights-system`). Hay que:
- Reutilizar esa lista (no duplicarla).
- Añadir opción "Otro" al final que permita escribir uno nuevo.
- Persistir el instrumento personalizado **a nivel de workspace/proyecto** para que reaparezca en el futuro.

Las indicaciones genéricas del final del mensaje (Prisma, paginación, separar capas, prevenir SQL injection) no aplican literalmente: este proyecto usa Supabase (no Prisma), las consultas van vía cliente Supabase con RLS (no hay SQL crudo expuesto), y la vista de equipos no necesita paginación a este volumen. Lo traduzco a lo que sí aplica: migración SQL para la tabla de instrumentos custom, índices, RLS, validación con Zod en el cliente antes de insertar.

Necesito explorar antes de proponer pasos concretos.

## Exploración necesaria
- `src/pages/Teams.tsx` o equivalente para ver cómo se inyecta el artista y cómo se renderizan los contactos.
- Lista actual de instrumentos Ditto (buscar `instruments` en `src/lib`).
- Componente `MemberContextMenu` o similar (el menú "Editar / Categorías / Quitar del equipo").
- Tabla `contacts.field_config` para ver cómo se almacenan las categorías y si ya hay un campo `instruments`.

## Plan

### 1. Fusionar artista principal con contacto homónimo en `/teams`
- En el render de la Vista Libre, detectar cuando un `contact` tiene el mismo nombre normalizado que el artista principal del equipo activo y **no renderizar la tarjeta morada duplicada**: sus categorías/instrumentos se mergean sobre la tarjeta verde del artista.
- Extender `deduplicateContacts` (botón ya existente o automático) para que también marque el contacto como "alias del artista" (`field_config.alias_of_artist_id`) en lugar de borrarlo, preservando referencias en `track_credits`, `budget_items`, etc.
- Mostrar un único nodo verde con las categorías combinadas (Artista principal + Compositor + Autor…).

### 2. Selector de instrumentos para categoría "Banda"
- Crear `src/lib/dittoInstruments.ts` reutilizando la lista canónica que ya usa el módulo de créditos/distribución (Lead Vocals, Backing Vocals, Guitar, Bass, Drums, Keys, Synth, Piano, Violin, Cello, Saxophone, Trumpet, Percussion, DJ, Programming, etc.). Si ya existe en `src/lib`, reutilizar.
- En `TeamCategorySelector.tsx`, cuando el usuario marca **Banda**, abrir un sub-popover con checkboxes de instrumentos + opción **"Otro…"** al final.
- Los instrumentos seleccionados se guardan en `contacts.field_config.instruments: string[]` (junto a `team_categories`).
- Mostrar los instrumentos como chips secundarios bajo el nombre del miembro (ej. "Banda · Guitar, Backing Vocals").

### 3. Instrumentos personalizados persistentes (workspace-level)
Nueva tabla `custom_instruments`:

```text
custom_instruments
  id            uuid PK
  workspace_id  uuid (FK profiles/workspace, indexado)
  name          text (único por workspace, indexado)
  created_by    uuid
  created_at    timestamptz
```

- Índice único `(workspace_id, lower(name))` para evitar duplicados case-insensitive.
- Índice btree en `workspace_id` para listado rápido.
- RLS: `SELECT/INSERT` permitido a miembros del workspace (`auth.uid()` con membership).
- Hook `useCustomInstruments(workspaceId)` que lista + permite añadir.
- Al elegir "Otro…" y escribir un nombre, se valida con Zod (`z.string().trim().min(1).max(40).regex(/^[\p{L}\p{N}\s\-']+$/u)`) y se inserta. A partir de ahí aparece en la lista para todos en el workspace.

### 4. Capa de datos limpia
- Toda la lógica de instrumentos (lista Ditto + custom) vive en `src/lib/instruments/` (servicio puro).
- El componente `TeamCategorySelector` solo consume el hook, sin SQL ni Supabase directo.
- Validación Zod en el servicio antes de cualquier `insert`.

### 5. Sin romper auth ni panel de usuario
- No se tocan `profiles`, `auth`, ni `useAuth`. Solo lectura de `workspace_id` desde el perfil activo.
- RLS replica el patrón ya usado en otras tablas workspace-scoped.
- El cambio en el render de `/teams` solo afecta a la Vista Libre; las vistas Lista y Cuadrícula reciben el mismo `mergedMembers` pre-procesado.

### 6. Resultado visual esperado
```text
ANTES                          DESPUÉS
[KS verde] Artista principal   [KS verde] Artista principal
[KS morado] Compositor, Au…    Banda · Guitar, Backing Vocals
                               Compositor, Autor
```

### Cambios técnicos resumidos
| Área | Archivo / objeto |
|---|---|
| Migración | nueva tabla `custom_instruments` + índices + RLS |
| Lista Ditto | `src/lib/instruments/dittoInstruments.ts` |
| Hook | `src/hooks/useCustomInstruments.ts` |
| UI categorías | `src/components/TeamCategorySelector.tsx` (sub-popover Banda) |
| Render canvas | componente Vista Libre de `/teams` (merge artista + contacto homónimo) |
| Dedupe | extender `src/lib/deduplicateContacts.ts` con merge artista↔contacto |

Sin cambios en autenticación, sin paginación nueva (el volumen no lo requiere), validación Zod en el punto de entrada de instrumentos custom.

