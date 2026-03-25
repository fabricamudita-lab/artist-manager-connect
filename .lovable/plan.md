

## Alerta de fecha pasada en lanzamientos no publicados

### Problema
Cuando abres un lanzamiento cuya fecha ya pasó pero no tiene estado "Publicado", no hay ningún aviso. Debería preguntarte qué hacer.

### Solución
Añadir un banner de alerta dentro del `EditReleaseDialog` (y opcionalmente en la vista del release) que aparece cuando `release_date < hoy` y `status !== 'released'`. El banner ofrece 3 acciones rápidas:

### Cambios

**`src/components/releases/EditReleaseDialog.tsx`**
- Detectar al abrir el dialog si `releaseDate` es pasada y `status` no es `released`
- Mostrar un `Alert` con fondo ámbar/warning entre el header y los campos:
  - Texto: "La fecha de lanzamiento ya ha pasado y el estado no es 'Publicado'."
  - 3 botones:
    - **"Marcar como Publicado"** → cambia `status` a `released`
    - **"Cambiar fecha"** → hace scroll/focus al campo de fecha
    - **"Archivar"** → cambia `status` a `archived`
- Cada botón actualiza el estado local del formulario (no guarda automáticamente), para que el usuario confirme con "Guardar"
- El alert desaparece si el usuario cambia el estado manualmente a `released` o `archived`, o si cambia la fecha a una futura

### Archivo
- `src/components/releases/EditReleaseDialog.tsx` (editar)

