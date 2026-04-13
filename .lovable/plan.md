

## Plan: Fecha por defecto + Selector de track en grabación

### Cambios en `src/components/IPLicenseGenerator.tsx`

**1. Fecha actual por defecto**

Cambiar los valores por defecto de `fecha_dia` y `fecha_mes` en `defaultData` para que se inicialicen con el día y mes actuales:
- `fecha_dia`: `new Date().getDate().toString()`
- `fecha_mes`: nombre del mes en español (usando un array de meses)

**2. Selector de track en "Título de la Grabación"**

- Añadir nueva prop opcional `releaseId?: string` al componente
- Importar y usar `useTracks(releaseId)` para obtener los tracks del release
- Reemplazar el `<Input>` de "Título de la Grabación" (paso 2, línea 376) por un `<Select>` que liste los tracks disponibles
- Al seleccionar un track, auto-rellenar:
  - `grabacion_titulo` con el título del track
  - `grabacion_duracion` con la duración formateada (ej: "3:45") — el campo `duration` es en segundos
- Mantener opción "Otro" para escribir manualmente si no hay tracks o se quiere un título diferente

### Cambios en `src/pages/release-sections/ReleaseContratos.tsx`

- Pasar `releaseId={id}` como prop al componente `<IPLicenseGenerator>`

### Archivos afectados
- `src/components/IPLicenseGenerator.tsx`
- `src/pages/release-sections/ReleaseContratos.tsx`

