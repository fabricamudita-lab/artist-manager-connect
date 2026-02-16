
# Dialogo de confirmacion al crear booking "Confirmado"

## Resumen

Cuando el usuario selecciona el estado "Confirmado" al crear un nuevo booking y pulsa "Crear Booking", se mostrara un dialogo intermedio preguntando si prefiere:

1. **Consultar disponibilidad y viabilidad primero** (opcion recomendada/resaltada) - Crea el booking en fase `interes` con estado `pendiente` para pasar por el flujo normal de verificacion
2. **Confirmar directamente** - Crea el booking directamente como `confirmado`

## Cambios tecnicos

### Archivo: `src/components/CreateBookingDialog.tsx`

- Agregar un estado `showConfirmDialog` (boolean) para controlar la visibilidad del dialogo intermedio
- Modificar `handleSubmit`: si `formData.estado === 'confirmado'`, en lugar de crear directamente, mostrar el dialogo de confirmacion
- Agregar funcion `handleCreateWithAvailability`: crea el booking con estado `pendiente` y phase `interes` para que el usuario pueda usar el flujo de disponibilidad/viabilidad desde el detalle
- Agregar funcion `handleCreateConfirmed`: crea el booking directamente como `confirmado` (comportamiento actual)
- Usar un `AlertDialog` con dos botones:
  - **"Consultar disponibilidad y viabilidad"** (boton primario, resaltado) - llama a `handleCreateWithAvailability`
  - **"Confirmar directamente"** (boton outline/secundario) - llama a `handleCreateConfirmed`
- El dialogo incluira un icono informativo y un texto explicando que es recomendable verificar la disponibilidad de todas las partes antes de confirmar
