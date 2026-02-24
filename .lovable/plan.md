

## Multiples Checklists por Proyecto — ✅ IMPLEMENTADO

Se implementó la funcionalidad de múltiples checklists por proyecto con:
- Tabla `project_checklists` con migración y datos existentes migrados a checklist "General"
- Columna `checklist_id` en `project_checklist_items`
- Dropdown selector en el header para cambiar entre checklists
- CRUD completo: crear, renombrar, eliminar checklists
- Filtrado de items por checklist activo
- Templates y nuevas tareas se crean con el `checklist_id` activo
