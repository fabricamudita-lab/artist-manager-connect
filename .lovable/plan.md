

# Mostrar nombre de plantilla base aunque haya campos extra

## Problema

Cuando se elige una plantilla pero se mantienen campos extra (via "Mantener"), `detectPreset` no encuentra coincidencia exacta y devuelve `'custom'`, dejando el selector vacio.

## Solucion

Cuando el usuario aplica una plantilla con "Mantener", guardar el key de la plantilla seleccionada directamente en `selectedPreset`, sin pasar por `detectPreset`. El nombre de la plantilla seguira visible en el dropdown aunque la configuracion real tenga campos adicionales.

`detectPreset` solo se usara cuando el usuario cambia toggles manualmente. Cuando se aplica una plantilla (con o sin campos extra), se fuerza el valor del preset directamente.

## Cambios

| Archivo | Cambio |
|---------|--------|
| `src/components/CreateContactDialog.tsx` | En `confirmApplyPreset`, usar `setSelectedPreset(pendingPreset)` en ambas ramas (keepFieldsWithData true/false), en vez de `detectPreset(adjusted)` |
| `src/components/EditContactDialog.tsx` | Mismo cambio |

Cambio minimo: reemplazar `setSelectedPreset(detectPreset(adjusted))` por `setSelectedPreset(pendingPreset)` en la rama de "Mantener". En la rama de "Ocultar" ya se llama `setSelectedPreset(pendingPreset)` correctamente. Solo hay que ajustar la rama `keepFieldsWithData === true`.

