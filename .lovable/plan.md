

## Plan: Botón "Guardar cambios" + visualización de Descripción vacía

### Diagnóstico

1. **Falta botón Guardar**: El diálogo `ProjectSettingsDialog` autoguarda en `onBlur` (nombre), `onValueChange` (artista) y `onCheckedChange` (toggles). El usuario espera un botón explícito de confirmación.
2. **Descripción no visible**: En `Proyectos.tsx` línea 311, la tarjeta solo renderiza la descripción si `cfg.show_description && project.description`. Si el proyecto **no tiene descripción guardada**, el toggle no produce ningún cambio visible. Además, no hay forma de editar la descripción desde el diálogo de configuración.

### Cambios

**1. `src/components/ProjectSettingsDialog.tsx`**
- Añadir campo `Textarea` "Descripción" en la sección "Datos generales" (debajo de Perfil vinculado), con estado local `localDescription`.
- Cargar la descripción actual del proyecto al abrir el diálogo (extender props con `description?: string | null` o fetch interno).
- Cambiar el modelo a **buffer + guardado explícito**:
  - Quitar autosave de `onBlur` (nombre), `onValueChange` (artista) y `onCheckedChange` (toggles). Solo actualizar estado local.
  - Añadir botón **"Guardar cambios"** al final (encima de "Zona peligrosa") que hace un único `update` con `name`, `artist_id`, `description`, `card_display_config`.
  - Botón secundario "Cancelar" que cierra sin guardar.
  - Mostrar estado `saving` y toast de confirmación.
- Validación con Zod (nombre 1–100, descripción opcional max ~2000).

**2. `src/pages/Proyectos.tsx`**
- Pasar `description={project.description}` al `ProjectSettingsDialog`.
- Línea 311: cambiar la condición a mostrar también un placeholder cuando `show_description` está activo pero no hay descripción → `<p className="italic text-muted-foreground/60">Sin descripción</p>`. Alternativa más limpia: solo cambiar la condición a `cfg.show_description &&` mostrando la descripción real o el placeholder.

### Archivos
| Archivo | Cambio |
|---|---|
| `src/components/ProjectSettingsDialog.tsx` | Añadir Textarea descripción, botones Guardar/Cancelar, eliminar autosave |
| `src/pages/Proyectos.tsx` | Pasar `description` al diálogo + render placeholder cuando vacía |

