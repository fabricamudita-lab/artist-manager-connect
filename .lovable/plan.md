

## Plan: Añadir input manual de porcentaje en splits de derechos

### Problema
Actualmente, el porcentaje en los splits de derechos de autor y royalties solo se puede ajustar mediante un slider. El usuario quiere poder escribir el valor numérico directamente para mayor precisión y rapidez.

### Solución
Convertir el display del porcentaje (que ahora es solo texto) en un `<Input type="number">` editable. El input y el slider estarán sincronizados bidireccionalmente: cambiar uno actualiza el otro.

### Cambios en `TrackRightsSplitsManager.tsx`

Hay **3 ubicaciones** donde aparece el slider + porcentaje:

1. **Líneas 247-256**: Modo edición de un split existente (`SplitRow` editing)
2. **Líneas 508-518**: Formulario de selección desde la agenda (`AddSplitForm` modo 'select')
3. **Líneas 566-576**: Formulario de crear nuevo perfil (`AddSplitForm` modo 'create')

En cada una, reemplazar el `<div>` que muestra el porcentaje por un `<Input>` con:
- `type="number"`
- `min={0}`, `max={100}`, `step={0.5}`
- `value={percentage}`
- `onChange` que actualice el estado local
- `className="w-20 text-right"` para mantener el ancho similar

### Archivos a modificar
- `src/components/releases/TrackRightsSplitsManager.tsx` — 3 bloques de código (slider + input sincronizados)

