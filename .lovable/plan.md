

## Plan: Auto-rellenar duración desde audio subido

### Problema
La duración solo se guarda en la tabla `tracks` cuando se sube la **primera** versión de audio (`isFirstVersion` en `ReleaseAudio.tsx` línea 308). Si se sube una nueva versión (o si la primera subida no extrajo la duración correctamente), el campo `duration` queda `null`. El generador de licencias IP ya tiene el código para auto-rellenar la duración (línea 765), pero no encuentra valor porque el campo está vacío en la BD.

### Solución

**Archivo: `src/pages/release-sections/ReleaseAudio.tsx` (~línea 308)**

Eliminar la condición `if (isFirstVersion)` para que **toda** subida de versión de audio actualice la duración del track. Esto asegura que el campo `duration` siempre refleje la versión más reciente.

Cambio concreto: quitar el `if (isFirstVersion) {` y su `}` de cierre correspondiente, dejando la lógica de extracción de duración ejecutarse siempre.

### Resultado
Al seleccionar un track en el generador de licencias IP, la duración se auto-rellenará correctamente desde la BD, siempre que se haya subido al menos un archivo de audio para ese track.

