

# Aviso al cambiar de plantilla si hay datos que se ocultarian

## Resumen

Cuando el usuario selecciona una nueva plantilla y esta desactiva campos que ya contienen informacion, se muestra un dialogo de confirmacion listando los campos afectados. El usuario puede:
1. **Aplicar igualmente** - se aplica la plantilla tal cual (los datos no se borran, solo se ocultan)
2. **Aplicar y mantener campos con datos** - se aplica la plantilla pero se fuerzan a ON los campos que ya tienen contenido

## Ejemplo de flujo

El usuario tiene "Completo" seleccionado y ha escrito en IBAN y Talla de ropa. Cambia a "Management / Booking" que desactiva esos campos:

```text
+------------------------------------------+
| Campos con informacion se ocultaran      |
|------------------------------------------|
| Al aplicar "Management / Booking" se     |
| ocultaran estos campos que ya contienen  |
| informacion:                             |
|                                          |
|  - IBAN                                  |
|  - Talla de ropa                         |
|                                          |
| Los datos no se eliminan, solo dejan de  |
| ser visibles.                            |
|------------------------------------------|
| [Cancelar] [Aplicar y mantener] [Aplicar]|
+------------------------------------------+
```

## Detalles tecnicos

### Logica en `applyPreset` (CreateContactDialog y EditContactDialog)

Antes de aplicar la plantilla, se compara el nuevo `preset.config` con `formData`: para cada campo que pasaria de ON a OFF, se comprueba si `formData[field].trim()` tiene contenido. Si hay al menos un campo afectado, se muestra el dialogo en vez de aplicar directamente.

### Nuevo estado en ambos dialogs

- `pendingPreset`: guarda el key de la plantilla pendiente de confirmar (null si no hay dialogo abierto)
- `fieldsAtRisk`: array de nombres de campos que se ocultarian y tienen datos

### Dialogo de confirmacion

Se reutiliza el patron de `AlertDialog` ya existente en el proyecto. Tres botones:
- **Cancelar**: cierra sin hacer nada
- **Aplicar y mantener campos**: aplica la plantilla pero fuerza `true` en los campos que tienen datos
- **Aplicar**: aplica la plantilla tal cual

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/CreateContactDialog.tsx` | Anadir logica de deteccion de campos en riesgo, estado `pendingPreset`/`fieldsAtRisk`, y `AlertDialog` de confirmacion |
| `src/components/EditContactDialog.tsx` | Mismo cambio |

No se necesitan archivos nuevos. Se usa `AlertDialog` de `@radix-ui/react-alert-dialog` ya instalado.

