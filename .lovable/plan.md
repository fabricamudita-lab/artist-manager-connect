

# Eliminar opcion "Personalizado" del selector de plantillas

## Cambio

Quitar el `SelectItem` con valor `custom` y texto "Personalizado" del dropdown de plantillas en `CreateContactDialog.tsx` y `EditContactDialog.tsx`. Ya no tiene sentido mostrarlo como opcion seleccionable, puesto que el usuario puede crear sus propias plantillas con nombre desde "Editar plantillas...".

## Comportamiento tras el cambio

- Si el usuario modifica manualmente los toggles y la configuracion no coincide con ninguna plantilla existente, el `Select` simplemente mostrara el valor vacio (sin texto) o el placeholder por defecto, pero no habra una opcion "Personalizado" en la lista.
- La funcion `detectPreset` sigue devolviendo `'custom'` internamente cuando no hay coincidencia, pero ese valor ya no aparecera como item seleccionable en el dropdown.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/CreateContactDialog.tsx` | Eliminar la linea `<SelectItem value="custom">Personalizado</SelectItem>` |
| `src/components/EditContactDialog.tsx` | Eliminar la misma linea |

Cambio minimo: solo se elimina una linea en cada archivo.

