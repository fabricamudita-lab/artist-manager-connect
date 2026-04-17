

## Plan: Configuración de Proyectos

### Contexto

Actualmente los proyectos ya se pueden eliminar desde el menú contextual (⋮) en la lista. El usuario pide un panel de configuración más completo dentro de cada proyecto, y la posibilidad de elegir qué secciones/datos se previsualizan en las tarjetas de la lista.

### 1. Migración: columna `card_display_config` en `projects`

```sql
ALTER TABLE public.projects
ADD COLUMN card_display_config jsonb NOT NULL DEFAULT '{
  "show_releases": true,
  "show_budgets": true,
  "show_events": true,
  "show_dates": true,
  "show_epk": true,
  "show_description": false
}'::jsonb;
```

Esto permite que cada proyecto almacene qué métricas mostrar en la tarjeta. No se necesitan índices adicionales porque no se filtra por este campo.

### 2. Nuevo componente: `ProjectSettingsDialog.tsx`

Diálogo accesible desde el detalle del proyecto (`ProjectDetail.tsx`) con:

- **Sección "Vista previa en tarjeta"**: toggles (Switch) para cada métrica visible en la card:
  - Lanzamientos vinculados
  - Presupuestos vinculados
  - Eventos vinculados
  - Fechas (inicio / fin)
  - EPK status
  - Descripción
- **Sección "Zona peligrosa"**: botón rojo "Eliminar proyecto" con AlertDialog de confirmación (reutilizando la lógica ya existente en `Projects.tsx`).
- Validación: el nombre del proyecto no puede quedar vacío. Se usa el patrón existente de `handleChange` + `supabase.update`.

### 3. Cambios en `Projects.tsx` (tarjetas)

- Fetch `card_display_config` junto con los demás campos del proyecto.
- Condicionar la renderización de cada sección de la tarjeta según el config:
  - `show_releases` → contador de lanzamientos
  - `show_budgets` → contador de presupuestos
  - `show_events` → contador de eventos
  - `show_dates` → fechas inicio/fin
  - `show_epk` → EPKStatusChip
  - `show_description` → texto de descripción
- Añadir opción "Configuración" en el DropdownMenu (⋮) de cada tarjeta que abre `ProjectSettingsDialog` inline.

### 4. Cambios en `ProjectDetail.tsx`

- Añadir un botón/icono de "Configuración" (⚙️) en la cabecera del proyecto que abre `ProjectSettingsDialog`.
- Mover la lógica de eliminación actual a este diálogo para tener un punto centralizado.

### 5. Validación y seguridad

- `card_display_config` se valida con un schema Zod antes de enviar a Supabase (todas las keys deben ser booleanas).
- La eliminación sigue usando el mismo `supabase.delete()` con RLS existente (el usuario solo puede eliminar proyectos de su workspace).
- No se expone ningún dato sensible; es configuración visual pura.

### 6. Archivos afectados

| Archivo | Cambio |
|---|---|
| Migración SQL | `ALTER TABLE projects ADD COLUMN card_display_config` |
| `src/components/ProjectSettingsDialog.tsx` | **nuevo** — diálogo de configuración |
| `src/pages/Projects.tsx` | fetch config, renderizado condicional, menú ⚙️ |
| `src/pages/ProjectDetail.tsx` | botón configuración en cabecera |
| `src/integrations/supabase/types.ts` | se actualiza automáticamente |

