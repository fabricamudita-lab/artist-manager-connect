
## Crear contacto nuevo desde el selector de presupuestos

### Problema
Cuando buscas un contacto en el presupuesto y no existe, solo ves "No se encontraron contactos" sin opcion de crearlo. Tienes que salir, ir a Contactos, crearlo y volver.

### Solucion
Agregar un boton "+ Crear contacto" dentro del propio desplegable del `BudgetContactSelector`. Al pulsarlo, se abre un mini-formulario inline (dentro del mismo popover) con los campos esenciales: nombre, email y rol. Al guardar, se crea el contacto en la base de datos, se selecciona automaticamente y se cierra el popover.

### Cambios

**Archivo**: `src/components/BudgetContactSelector.tsx`

1. **Agregar estado para modo creacion**: `creatingNew` (boolean), mas campos `newName`, `newEmail`, `newRole`.

2. **Boton "+ Crear contacto"**: Aparece al final del grupo "Contactos" en ambas variantes (compact y normal). Tambien aparece como accion en el `CommandEmpty` cuando no hay resultados, para que sea aun mas visible.

3. **Vista de formulario inline**: Cuando `creatingNew` es true, el contenido del Command se reemplaza por un mini-formulario con:
   - Input de nombre (obligatorio, pre-rellenado con el texto de busqueda actual)
   - Input de email (opcional)
   - Input de rol (opcional)
   - Botones Cancelar / Crear

4. **Logica de guardado**: Al pulsar "Crear":
   - Inserta el contacto en la tabla `contacts` con `created_by` del usuario actual
   - Actualiza el estado local de contactos
   - Llama a `onValueChange` con el nuevo ID para asignarlo automaticamente
   - Cierra el popover

5. **Pre-rellenar nombre**: El texto que el usuario escribio en la busqueda se usa como valor inicial del campo nombre, para no tener que escribirlo dos veces.

### Detalle tecnico

Se reutiliza el mismo patron de insercion que ya existe en `ensureMirrorContactForArtist` (obtener `auth.getUser()`, insertar con `created_by`). No se necesita ningun cambio de esquema en base de datos ni componentes adicionales.
