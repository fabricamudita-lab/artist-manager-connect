

## Plan: Unificar ArtistInfoDialog con el mismo sistema de EditContactDialog

### Problema actual
- `EditContactDialog` tiene un layout de 3 columnas: panel izquierdo con toggles de visibilidad de campos (field_config), plantillas, y formulario a la derecha. Incluye campos personalizados y botón de formulario público.
- `ArtistInfoDialog` tiene un layout de 1 columna con todas las secciones en Cards apiladas. No tiene sistema de `field_config` (todos los campos se muestran siempre), no tiene plantillas, y el botón de edición solo alterna entre modo lectura/escritura.

### Solución
Rediseñar `ArtistInfoDialog` para que use el **mismo patrón visual y funcional** que `EditContactDialog`:
- Layout de 3 columnas (1 config + 2 formulario)
- Panel izquierdo con toggles de visibilidad por campo
- Soporte de plantillas (presets)
- Campos personalizados con "+ Añadir campo"
- Botón "Formulario" para enlace público
- **Sin** la sección de "Configuración de Equipo" (tipo de equipo, selector de artistas, categoría)

### Cambios necesarios

#### 1. Base de datos: añadir `field_config` a `artists`
La tabla `artists` no tiene columna `field_config`. Se necesita una migración:
```sql
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS field_config jsonb DEFAULT '{}'::jsonb;
```
Por defecto `{}` (vacío = todo activado, como pidió el usuario para roster).

#### 2. Rediseñar `src/components/ArtistInfoDialog.tsx`
Transformar de layout vertical a layout horizontal 3 columnas:

**Panel izquierdo (1 col):**
- Plantilla (Select con presets)
- Toggles para cada campo artista: nombre artístico, género, bio, email, teléfono, dirección, Instagram, Spotify, TikTok, talla ropa, talla calzado, alergias, necesidades especiales, empresa, nombre legal, CIF/NIF, IRPF, banco, IBAN, SWIFT, notas
- Toggle "Hacer público"

**Panel derecho (2 cols):**
- Header con avatar, nombre, badge género, botones Formulario/Editar
- Campos del formulario renderizados condicionalmente según `field_config`
- Sección de campos personalizados
- Footer con botones Guardar/Cancelar/Formulario

**Lógica de field_config para artistas:**
- Si `field_config` está vacío (`{}`), todos los campos se consideran **activados** (default ON para roster)
- Solo los campos explícitamente `false` se ocultan
- Se guarda en la columna `field_config` de `artists` al guardar

#### 3. Adaptar `fieldConfigPresets` para artistas
El sistema actual de presets (`src/lib/fieldConfigPresets.ts`) está diseñado para contactos. Se creará un mapeo de campos equivalente para artistas, reutilizando la misma mecánica.

#### 4. Definir FIELD_LABELS para artistas
Mapeo de campo → etiqueta humana para los toggles del panel izquierdo, análogo al `FIELD_LABELS` de contactos.

#### 5. Actualizar `PublicArtistForm.tsx`
Respetar `field_config` del artista: solo mostrar campos activados en el formulario público.

#### 6. Actualizar tipos Supabase
Añadir `field_config` al tipo de `artists`.

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | `ALTER TABLE artists ADD COLUMN field_config jsonb DEFAULT '{}'` |
| `src/components/ArtistInfoDialog.tsx` | Rediseño completo: layout 3 cols, panel config con toggles, renderizado condicional |
| `src/pages/PublicArtistForm.tsx` | Leer `field_config` del artista y mostrar solo campos activados |
| `src/integrations/supabase/types.ts` | Añadir `field_config` al tipo artists |

### Comportamiento del field_config en artistas
- Campo no presente en `field_config` o `field_config` vacío → **visible** (todo ON por defecto)
- Campo explícitamente `false` → oculto
- Esto garantiza retrocompatibilidad: artistas existentes sin `field_config` muestran todo

