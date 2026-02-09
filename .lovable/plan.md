

# Gestion de plantillas de campos

## Resumen

Reemplazar el boton inline "Guardar como plantilla" por una opcion "Editar plantillas..." al final del listado del `Select`. Al hacer clic, se abre un Dialog de gestion donde se pueden:
- Ver todas las plantillas (sistema + custom)
- Guardar la configuracion actual como nueva plantilla
- Eliminar plantillas custom (las del sistema aparecen con un candado, no eliminables)
- Reordenar plantillas custom mediante drag-and-drop (las del sistema quedan fijas arriba)

## Interfaz del dialog "Editar plantillas"

```text
+--------------------------------------+
| Gestionar Plantillas                 |
|--------------------------------------|
| [Guardar config actual como nueva]   |
|   (input nombre + boton guardar)     |
|--------------------------------------|
| Plantillas del sistema:              |
|  🔒 Miembro de banda                 |
|  🔒 Equipo tecnico                   |
|  🔒 Management / Booking             |
|  🔒 Legal / Editorial                |
|  🔒 Produccion / Comunicacion        |
|  🔒 Completo                         |
|                                      |
| Plantillas personalizadas:           |
|  ≡ Test                    [🗑]      |
|  ≡ Mi plantilla            [🗑]      |
|--------------------------------------|
|                          [Cerrar]    |
+--------------------------------------+
```

## Cambios en el Select de plantillas

El dropdown actual ya muestra las plantillas. Se anade al final un `SelectItem` especial con valor `__manage__` que dice "Editar plantillas...". Al seleccionarlo, en vez de aplicar un preset, se abre el dialog de gestion.

## Detalles tecnicos

### Nuevo componente: `src/components/ManageFieldPresetsDialog.tsx`
- Dialog con la lista de presets del sistema (solo lectura, icono candado) y custom (con boton eliminar y handle de drag)
- Seccion superior con input para guardar la config actual como nueva plantilla
- Usa `deleteCustomPreset` y `saveCustomPreset` de `fieldConfigPresets.ts`
- Callback `onPresetsChanged` para refrescar el estado en los dialogs padre

### Nuevo en `src/lib/fieldConfigPresets.ts`
- `reorderCustomPresets(orderedKeys: string[])`: persiste el nuevo orden en localStorage
- `isSystemPreset(key: string)`: helper para saber si es del sistema o custom

### Modificar: `src/components/CreateContactDialog.tsx`
- Quitar el boton inline "Guardar como plantilla" y el estado `savingPreset`/`newPresetName`
- Anadir opcion "Editar plantillas..." al final del Select con valor `__manage__`
- Interceptar en `applyPreset`: si value es `__manage__`, abrir el dialog en vez de aplicar
- Importar y renderizar `ManageFieldPresetsDialog`

### Modificar: `src/components/EditContactDialog.tsx`
- Mismos cambios que CreateContactDialog

| Archivo | Cambio |
|---------|--------|
| `src/components/ManageFieldPresetsDialog.tsx` | Nuevo - dialog de gestion de plantillas |
| `src/lib/fieldConfigPresets.ts` | Anadir `reorderCustomPresets`, `isSystemPreset` |
| `src/components/CreateContactDialog.tsx` | Reemplazar boton inline por opcion "Editar plantillas..." en Select |
| `src/components/EditContactDialog.tsx` | Mismo cambio |

