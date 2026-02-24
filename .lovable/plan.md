

## Agregar Renombrar, Duplicar y Eliminar checklist al menu de Acciones

El menu de "Acciones" actualmente tiene: Crear desde plantilla, Anadir elemento, Guardar como plantilla, y Vaciar todo. Se necesita agregar tres opciones mas para gestionar la checklist activa.

---

### Cambios en `src/components/ProjectChecklistManager.tsx`

**1. Agregar icono `Copy` a los imports de lucide-react** (linea 11)

**2. Agregar funcion `duplicateChecklist`** que:
- Crea una nueva checklist con nombre "{nombre} (copia)"
- Copia todos los items de la checklist activa a la nueva checklist
- Cambia la checklist activa a la nueva copia
- Muestra toast de confirmacion

**3. Agregar tres opciones al DropdownMenu de Acciones** (despues de "Guardar como plantilla", antes de "Vaciar todo"):
- Separador visual (`DropdownMenuSeparator`)
- **Renombrar checklist** (icono Pencil) -- reutiliza el dialog de renombrar existente (`setRenamingChecklistId(activeChecklistId)`)
- **Duplicar checklist** (icono Copy) -- llama a `duplicateChecklist()`
- **Eliminar checklist** (icono Trash2, estilo destructive) -- reutiliza el dialog de confirmacion existente (`setDeleteChecklistConfirm(activeChecklist)`)
- Solo se muestra "Eliminar" si hay mas de 1 checklist (para no borrar la unica)

### Resultado visual del menu

```text
 Crear desde plantilla
 + Anadir elemento
 Guardar como plantilla
 ─────────────────────
 Renombrar checklist
 Duplicar checklist
 ─────────────────────
 Vaciar todo
 Eliminar checklist
```

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ProjectChecklistManager.tsx` | Agregar `Copy` import, funcion `duplicateChecklist`, 3 opciones nuevas en dropdown |

No se necesitan cambios en base de datos ni otros archivos.
