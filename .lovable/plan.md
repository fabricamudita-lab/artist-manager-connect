

## Redisenar el flujo de Checklists: estado vacio y creacion explicita

Actualmente, cuando no hay checklists se crea automaticamente una "General" y se carga una plantilla predeterminada. El nuevo flujo requiere que el usuario decida cuando y como crear cada checklist.

---

### Cambio de comportamiento

**Antes:**
- Se auto-crea una checklist "General" si no hay ninguna
- Se auto-carga la plantilla "Concierto" si la checklist esta vacia

**Despues:**
- Si no hay checklists, se muestra un estado vacio con dos botones: "Crear desde plantilla" y "Crear checklist vacia"
- "Crear desde plantilla" abre el TemplateSelectionDialog que crea una checklist nueva con las tareas de la plantilla
- "Crear checklist vacia" pide un nombre y crea una checklist sin tareas
- Nunca se sobreescribe ni se carga automaticamente nada

---

### Cambios en la UI

**Estado vacio (sin checklists):**

```text
+------------------------------------------+
|  No hay checklists en este proyecto.     |
|  Crea una para organizar tus tareas.     |
|                                          |
|  [Crear desde plantilla]  [Crear nueva]  |
+------------------------------------------+
```

**Cuando hay checklists:**
- El dropdown del header muestra las checklists existentes
- Opcion "+ Crear nueva checklist" (pide nombre) y "+ Crear desde plantilla" en el dropdown
- El menu "Acciones" de cada checklist activa contiene:

```text
  + Anadir elemento
  Guardar como plantilla
  ─────────────────────
  Renombrar checklist
  Duplicar checklist
  ─────────────────────
  Vaciar todo
  Eliminar checklist
```

(Se quita "Crear desde plantilla" del menu Acciones, ya que ahora vive en el dropdown de seleccion de checklists)

---

### Cambios tecnicos en `src/components/ProjectChecklistManager.tsx`

**1. Eliminar auto-creacion de checklist "General"**
- En `fetchChecklists()`: quitar el bloque que crea automaticamente una checklist si no hay ninguna (lineas 159-174). Simplemente dejar la lista vacia.

**2. Eliminar auto-carga de plantilla**
- En `fetchChecklistItems()`: quitar la llamada a `loadDefaultTemplate()` (lineas 402-404)
- Eliminar la funcion `loadDefaultTemplate()` completa (lineas 417-436)
- Eliminar la funcion `applyTemplate()` interna (lineas 438-473), ya que la aplicacion de plantillas la maneja el `TemplateSelectionDialog`

**3. Agregar estado vacio cuando `checklists.length === 0`**
- Antes del card actual, mostrar un estado vacio con:
  - Icono de ListChecks
  - Texto: "No hay checklists en este proyecto"
  - Subtexto: "Crea una checklist para organizar las tareas del proyecto"
  - Boton "Crear desde plantilla" que abre un flujo donde:
    1. Primero pide nombre de la checklist
    2. Luego abre TemplateSelectionDialog con el nuevo checklistId
  - Boton "Crear checklist vacia" que pide nombre y crea la checklist

**4. Agregar estado para crear checklist desde plantilla con nombre**
- Nuevo estado `pendingTemplateChecklistName` para el flujo de nombre + plantilla
- Al crear desde plantilla: crear la checklist primero, luego abrir TemplateSelectionDialog pasando el `checklistId`

**5. Modificar el dropdown de checklists**
- Agregar opcion "Crear desde plantilla" junto a "Crear nueva checklist" en el dropdown
- Esto permite crear mas checklists desde plantilla cuando ya existen otras

**6. Ajustar menu Acciones**
- Quitar "Crear desde plantilla" del menu Acciones (ya esta en el dropdown del selector)
- Dejar: Anadir elemento, Guardar como plantilla, separador, Renombrar, Duplicar, separador, Vaciar todo, Eliminar

---

### Cambios en `src/components/TemplateSelectionDialog.tsx`

**7. Asegurar que siempre crea items nuevos (nunca sobreescribe)**
- Quitar la logica de "reemplazar items existentes" (el `confirm()` de las lineas 172-190)
- Siempre insertar los items nuevos en la checklist indicada por `checklistId`, sin borrar los anteriores

---

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ProjectChecklistManager.tsx` | Estado vacio, eliminar auto-creacion/auto-plantilla, flujo de crear desde plantilla con nombre, ajustar dropdown y menu acciones |
| `src/components/TemplateSelectionDialog.tsx` | Quitar logica de reemplazo, siempre insertar (nunca sobreescribir) |
