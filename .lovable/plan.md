

## Análisis

La captura muestra `/releases/.../pitch` con dos pitches llamados "fruityloopin" sin forma de diferenciarlos. El usuario quiere poder renombrarlos.

El hook `usePitches.ts` ya expone `useUpdatePitch` que acepta cualquier campo incluido `name`, así que solo falta UI.

## Plan

### Edición inline del nombre en la lista de pitches

Archivo a editar: componente que renderiza las tarjetas de pitch en `/releases/:id/pitch` (muy probablemente `src/pages/release-sections/ReleasePitch.tsx` o similar — lo confirmo al implementar).

Cambios:
1. Hacer el título "fruityloopin" clickable → al hacer click se convierte en `<Input>` editable (patrón de edición inline ya usado en otras partes de la app).
2. Guardar al presionar Enter o al perder foco (blur) con `useUpdatePitch` (modo silencioso, sin toast por cada tecla).
3. Escape cancela y restaura el valor original.
4. Mostrar un icono de lápiz pequeño al hover para indicar que es editable.
5. Validación mínima: nombre no vacío (trim), máximo 100 caracteres. Si queda vacío, se restaura el valor anterior.
6. Sin migración de BD (columna `name` ya existe).

Sin cambios en el resto del flujo (duplicar/eliminar/crear siguen igual).

