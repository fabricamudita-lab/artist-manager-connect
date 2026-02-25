

## Ordenar la seccion de Checklist para que sea completamente funcional e intuitiva

Tras revisar el codigo actual, hay varios problemas que impiden un flujo limpio:

1. **Cuando se crea desde plantilla en el estado vacio**, el `checklistId` es `null`, asi que el `TemplateSelectionDialog` crea la checklist internamente, pero luego el componente padre no se entera y no recarga correctamente las checklists.
2. **El callback `onTemplateApplied` en el estado vacio** llama a `fetchChecklists()` pero no refresca los items ni selecciona la checklist nueva.
3. **El dropdown de checklists tiene inline-editing** con input que puede generar conflictos de UX al crear y renombrar.
4. **Falta la opcion "Crear desde plantilla" en el menu Acciones** para poder importar plantillas dentro de una checklist existente (agregar tareas de plantilla a la checklist activa).

---

### Cambios en `src/components/ProjectChecklistManager.tsx`

**1. Corregir el flujo de "Crear desde plantilla" en estado vacio**
- En el estado vacio, al llamar `onTemplateApplied`, debe hacer `fetchChecklists()` completo y luego seleccionar la primera checklist disponible.
- Cambiar el callback a una funcion que haga fetch de checklists, seleccione la primera, y luego haga fetch de items.

**2. Corregir el `onTemplateApplied` del dialog principal (linea 2090)**
- Actualmente solo llama `fetchChecklistItems`, pero si se creo una checklist nueva (cuando no habia `activeChecklistId`), hay que recargar tambien las checklists.
- Cambiar a una funcion que haga `fetchChecklists()` + `fetchChecklistItems()`.

**3. Agregar "Crear desde plantilla" al menu Acciones**
- Dentro del menu Acciones (junto a "Anadir elemento"), agregar opcion para importar plantilla a la checklist activa.
- Esto permite incorporar plantillas en cualquier momento sobre una checklist existente (las tareas se agregan, no se sobreescriben).

**4. Mejorar el estado vacio de checklist sin items**
- Cuando una checklist existe pero no tiene tareas (linea 1463-1474), agregar tambien el boton "Crear desde plantilla" para poder importar tareas desde plantilla a esa checklist activa.

**5. Limpiar el comentario "Template dialogs temporarily disabled" (linea 1884)**
- Es un comentario residual que confunde; eliminarlo.

**6. Asegurar que el dropdown cierra correctamente al crear checklist**
- El input inline del dropdown puede quedar abierto; al crear la checklist, cerrar el dropdown limpiamente.

---

### Cambios en `src/components/TemplateSelectionDialog.tsx`

**7. Mejorar la experiencia post-aplicacion**
- Actualmente no hay forma de que el componente padre sepa que checklist se creo. Agregar el ID de la checklist creada al callback.
- Cambiar `onTemplateApplied` a `onTemplateApplied: (newChecklistId?: string) => void`.
- Cuando se crea una checklist nueva (porque `checklistId` era null), pasar el ID al callback para que el padre pueda seleccionarla.

---

### Resumen de archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ProjectChecklistManager.tsx` | Corregir callbacks de template, agregar "Crear desde plantilla" en Acciones y estado vacio de checklist, limpiar comentario |
| `src/components/TemplateSelectionDialog.tsx` | Pasar `newChecklistId` en callback para que el padre seleccione la checklist correcta |

### Resultado esperado

- **Estado vacio (sin checklists)**: Dos botones claros: "Crear desde plantilla" y "Crear checklist vacia". Al usar plantilla, se crea la checklist y se muestra directamente con las tareas.
- **Dropdown de checklists**: Lista de checklists con iconos de editar/eliminar, y al final opciones de crear nueva o desde plantilla.
- **Menu Acciones (por checklist activa)**: Anadir elemento, Crear desde plantilla, Guardar como plantilla, separador, Renombrar, Duplicar, separador, Vaciar todo, Eliminar.
- **Checklist vacia (existe pero sin tareas)**: Botones de "Anadir elemento" y "Crear desde plantilla".
- Todo funcional: crear, renombrar, duplicar, eliminar, importar plantillas en cualquier momento.

