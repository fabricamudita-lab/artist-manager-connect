

## Añadir edición y eliminación de cobros con avisos de seguridad

### Problema
No hay forma de editar ni eliminar cobros en la lista. Si hay un error de nombre, duplicado, o doble contabilización, no se puede corregir.

### Diseño

**Dos tipos de cobros con comportamiento diferente:**

1. **Cobros manuales** (tabla `cobros`): se pueden editar y eliminar libremente.
2. **Cobros de booking** (derivados de `booking_offers`): editar abre el PagoDialog existente; eliminar NO se permite desde aquí (se gestiona desde el booking). Se mostrará un mensaje indicándolo.

### Cambios en `CobrosTab.tsx`

**1. Botones de acción por fila**
- Añadir iconos `Pencil` y `Trash2` en cada fila (visibles en hover o siempre, junto al badge de estado).
- Para cobros de booking: el botón editar abre PagoDialog; el botón eliminar muestra un toast informativo ("Este cobro está vinculado a un booking. Gestiona desde el detalle del booking.").

**2. Editar cobro manual**
- Nuevo estado `editCobro` que abre el mismo diálogo de "Añadir Cobro" pero prellenado con los datos del cobro seleccionado.
- Reutilizar el formulario existente (formType, formConcept, etc.) cargando los valores del cobro.
- Nueva mutación `updateMutation` que hace `supabase.from('cobros').update(...)`.

**3. Eliminar cobro manual**
- Nuevo estado `deleteCobro` con el id y concepto del cobro a eliminar.
- `ConfirmationDialog` con aviso: "¿Eliminar el cobro '{concepto}'? Esta acción no se puede deshacer."
- Mutación `deleteMutation` que hace `supabase.from('cobros').delete().eq('id', id)`.

**4. Eliminar cobro de booking — aviso**
- Al pulsar eliminar en un cobro tipo booking, mostrar toast: "Este cobro proviene de un booking. Para eliminarlo, gestiona el booking directamente."

### Flujo visual

```text
[Fila cobro] ... [€3245] [Cobrado] [✏️] [🗑️]
                                      │      │
                        ┌─────────────┘      └──────────────┐
                        │                                    │
                 Si manual:                           Si manual:
                 Abre form edición                    ConfirmationDialog
                 (mismo dialog, prellenado)           "¿Eliminar cobro X?"
                                                      
                 Si booking:                          Si booking:
                 Abre PagoDialog                      Toast informativo
```

### Resultado
- Los cobros manuales se pueden editar (nombre, importe, IRPF, fechas, estado) y eliminar con confirmación.
- Los cobros de booking se editan vía PagoDialog y no se pueden eliminar desde Finanzas.
- El usuario siempre sabe si una acción afecta datos vinculados.

