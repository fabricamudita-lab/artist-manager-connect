

# Auto-nombre de version + Fix error de subida de audio

## Problema 1: Error al subir
El archivo WAV pesa 124.94 MB pero el bucket `audio-tracks` tiene el limite por defecto de 50 MB. Hay que aumentar el limite a 250 MB para soportar archivos WAV grandes.

## Problema 2: Nombre de version automatico
Cuando el usuario selecciona un archivo, el campo "Nombre de la version" deberia rellenarse automaticamente a partir del nombre del archivo. Por ejemplo: `CHROMATISM_MIX3.wav` genera `Chromatism MIX3`.

---

## Cambios

### 1. Migracion SQL — Aumentar limite del bucket

```sql
UPDATE storage.buckets
SET file_size_limit = 262144000  -- 250 MB
WHERE id = 'audio-tracks';
```

### 2. `src/pages/release-sections/ReleaseAudio.tsx` — Auto-nombre

En el handler `onChange` del input de archivo, cuando se selecciona un fichero:

1. Extraer el nombre sin extension: `CHROMATISM_MIX3.wav` -> `CHROMATISM_MIX3`
2. Reemplazar guiones bajos y guiones por espacios: `CHROMATISM MIX3`
3. Convertir a Title Case: `Chromatism Mix3` (manteniendo numeros y mayusculas en abreviaturas comunes como "MIX")
4. Asignar al estado `versionName` solo si esta vacio o si el usuario no lo ha editado manualmente.

Logica de formateo:

```text
function formatVersionName(fileName: string): string {
  // Quitar extension
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  // Reemplazar _ y - por espacios
  const spaced = nameWithoutExt.replace(/[_-]/g, ' ');
  // Title case simple: primera letra de cada palabra en mayuscula, resto en minuscula
  // Excepcion: palabras que son todo mayusculas y tienen numeros (MIX3) se mantienen
  return spaced.split(' ')
    .map(word => {
      if (/^[A-Z0-9]+$/.test(word) && word.length <= 5) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}
```

Resultado esperado: `CHROMATISM_MIX3.wav` -> `CHROMATISM MIX3` (ambas palabras son cortas y todo mayusculas, se mantienen).

### 3. Mejor mensaje de error

Detectar el error 413 y mostrar un toast mas descriptivo: "El archivo excede el tamano maximo permitido (250 MB)".

