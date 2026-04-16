

## Plan: Campos personalizados en configuración de visibilidad

### Objetivo
Cuando el manager crea un campo personalizado para un artista, debe aparecer automáticamente en la sección "Configuración de campos" del `ArtistInfoDialog` con un toggle on/off, igual que los campos predefinidos (Stage name, IBAN, etc.). Ese toggle controla si el campo se muestra al artista en el formulario público.

### Cómo funciona hoy
- Los campos predefinidos están listados estáticamente en la sección de configuración con switches que escriben en `field_config` (JSONB en `artists`).
- Los campos personalizados viven en `custom_fields` (catálogo workspace-level por entity_type='artist') y sus valores en `artists.custom_data`.
- `PublicArtistForm` ya renderiza los campos personalizados al final, pero **sin respetar field_config** — siempre se muestran.

### Cambios

| Archivo | Cambio |
|---|---|
| `ArtistInfoDialog.tsx` (sección configuración de campos) | Cargar `useCustomFields(workspace_id, 'artist')` y, debajo de los grupos predefinidos, añadir un grupo "Campos personalizados" con un switch por cada campo. La clave en `field_config` será `custom_${field.id}` (ej: `custom_abc123: true`) |
| `src/lib/artistFieldVisibility.ts` (o donde esté `isArtistFieldVisible`) | Aceptar claves dinámicas `custom_<id>` y resolver visibilidad igual que el resto (default: visible si no está en config) |
| `PublicArtistForm.tsx` | Al renderizar la sección "Campos personalizados", filtrar por `isArtistFieldVisible(field_config, 'custom_${field.id}')` para ocultar los desactivados |

### UX
- Al crear un campo personalizado nuevo, aparece automáticamente en el bloque "Campos personalizados" de la configuración con el switch en ON por defecto.
- Al borrarlo del catálogo, desaparece también del bloque (no quedan toggles huérfanos).
- Si se desactiva, no aparece en el formulario público.

### Sin migración
No hace falta tocar la BD. Reutiliza `field_config` JSONB existente con claves prefijadas `custom_`.

