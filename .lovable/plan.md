

## Multiples Checklists por Proyecto

Actualmente solo hay un checklist por proyecto. El objetivo es poder crear varias checklists dentro del mismo proyecto (ej: "Show Barcelona", "Lanzamiento single", "Reunion mensual"), seleccionables desde un dropdown.

---

### Diseno visual (segun la captura)

- El titulo "Checklist" se convierte en un **dropdown** que muestra el nombre de la checklist activa
- Al desplegar, se ven las checklists existentes + opcion de "Crear nueva checklist"
- Cada checklist tiene su propio progreso ("0 completadas . 0%")
- El badge en la pestana "Checklist 6" cuenta las tareas pendientes de TODAS las checklists

---

### Cambios tecnicos

**1. Nueva tabla `project_checklists` (migracion SQL)**

```text
project_checklists
  - id (UUID, PK)
  - project_id (UUID, FK -> projects)
  - name (TEXT, NOT NULL)
  - sort_order (INT, default 0)
  - created_by (UUID)
  - created_at (TIMESTAMPTZ)
  - updated_at (TIMESTAMPTZ)
```

- RLS: mismas politicas que `project_checklist_items` (basadas en acceso al proyecto)
- Agregar columna `checklist_id UUID` a `project_checklist_items` (nullable para retrocompatibilidad)
- Migracion de datos: crear un checklist "General" por cada proyecto que tenga items existentes, y asignar el `checklist_id` correspondiente

**2. Modificar `ProjectChecklistManager.tsx`**

- Agregar estado `checklists` (lista) y `activeChecklistId` (seleccionado)
- Fetch de checklists al montar: `SELECT * FROM project_checklists WHERE project_id = ?`
- Si no hay checklists, crear automaticamente una "General"
- Filtrar items por `checklist_id` activo
- Reemplazar el titulo "Checklist" por un `<Select>` / dropdown con:
  - Opciones: lista de checklists existentes
  - Opcion final: "+ Crear nueva checklist" que abre un input inline
- Al crear checklist nueva: insertar en `project_checklists`, seleccionarla como activa
- Al aplicar template: las tareas se crean con el `checklist_id` activo
- Al agregar tarea manual: incluir `checklist_id` activo
- Opcion de renombrar/eliminar checklist en el menu de acciones (tres puntos)

**3. Modificar `ProjectDetail.tsx`**

- El badge de la pestana "Checklist N" debe contar items pendientes de TODAS las checklists del proyecto (sin cambios en la query, ya filtra por `project_id`)

---

### Archivos a modificar/crear

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Crear tabla `project_checklists`, agregar `checklist_id` a items, migrar datos |
| `src/components/ProjectChecklistManager.tsx` | Dropdown de checklists, CRUD de checklists, filtrar items por checklist activo |
| `src/integrations/supabase/types.ts` | Se actualiza automaticamente con la migracion |

No se necesitan cambios en `ProjectDetail.tsx` ya que el badge cuenta todos los items del proyecto independientemente del checklist.

