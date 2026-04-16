

## Plan: Aplicar campos personalizados con toggle on/off a "Editar Contacto"

### Cambios paralelos a los del artista

**1. `src/components/EditContactDialog.tsx`** (panel "Configuración de Campos")
- Después del bloque de toggles fijos (línea ~493) y antes del separador `Hacer público`, añadir un sub-bloque "Campos personalizados" idéntico al de `ArtistInfoDialog`:
  - Separator + Label "Campos personalizados" en uppercase
  - Un `Switch` por cada `customFields` con clave `custom_${field.id}` que escribe en `fieldConfig`
- Usar helper `visible(key)` (con default `true` cuando no está en config) — añadir helper local igual que en ArtistInfoDialog.
- En `handleSubmit` (línea 261), normalizar las claves `custom_*` para que el JSONB guardado contenga explícitamente `true/false` por cada campo personalizado existente.
- En el render del formulario (línea 790-798), filtrar `customFields` por `visible(custom_${f.id})` antes de pasar a `<CustomFieldsSection>` para que los desactivados desaparezcan también del editor.

**2. `src/pages/PublicContactForm.tsx`** (formulario público)
- En la sección "Campos personalizados" (renderizado actual líneas ~221-249), filtrar `customFields` por `isContactFieldVisible(fieldConfig, 'custom_${field.id}')` o helper equivalente con default `true`.
- Si tras filtrar no hay campos visibles, no renderizar la Card de "Información adicional".

### Detalle clave de comportamiento (mismo que artista)
- Toggle ON (o ausente) → campo personalizado visible en editor del manager **y** en formulario público.
- Toggle OFF → desaparece de ambos.
- Crear un campo personalizado nuevo → aparece automáticamente con toggle ON.
- Borrar campo del catálogo → desaparece su toggle (no quedan huérfanos).

### Sin migración
Reutiliza la columna `field_config` JSONB existente en `contacts` con claves prefijadas `custom_<id>`.

### Archivos tocados
| Archivo | Cambio |
|---|---|
| `src/components/EditContactDialog.tsx` | Sub-bloque de toggles para custom fields + helper `visible` + filtro al renderizar inputs + normalización al guardar |
| `src/pages/PublicContactForm.tsx` | Filtrado de campos personalizados según `field_config` |

