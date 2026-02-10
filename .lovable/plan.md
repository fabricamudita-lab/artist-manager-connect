

# Conversion automatica de audio antes de subir

## Problema

Supabase Free Tier tiene un limite duro de 50 MB por archivo. Los WAV sin comprimir superan facilmente ese limite.

## Solucion

Cuando el archivo seleccionado supere 50 MB, convertirlo automaticamente a **MP3 320kbps** en el navegador usando la libreria `lamejs` antes de subirlo. Un WAV de 125 MB se convierte tipicamente a un MP3 de 5-10 MB sin perdida perceptible de calidad.

## Flujo del usuario

```text
1. Usuario selecciona archivo WAV de 125 MB
2. Se muestra aviso: "El archivo supera 50 MB. Se convertira a MP3 (320kbps) antes de subir."
3. Barra de progreso: "Convirtiendo... 45%"
4. Conversion completa: archivo resultante ~8 MB
5. Barra de progreso: "Subiendo... 72%"
6. Listo
```

Si el archivo ya es menor a 50 MB, se sube directamente sin conversion.

## Implementacion tecnica

### 1. Instalar dependencia

- `lamejs` — codificador MP3 en JavaScript puro, funciona en el navegador
- `@types/lamejs` — tipos TypeScript (si existen, sino declaracion manual)

### 2. Crear utilidad `src/utils/audioConverter.ts`

Funcion `compressAudioToMp3(file: File, onProgress: (pct: number) => void): Promise<File>`:

1. Leer el archivo como `ArrayBuffer`
2. Decodificar con `AudioContext.decodeAudioData()` para obtener PCM raw
3. Usar `lamejs.Mp3Encoder` para codificar a MP3 a 320kbps
4. Procesar en bloques de 1152 samples (tamano estandar MP3) llamando `onProgress` en cada bloque
5. Retornar un nuevo `File` con extension `.mp3` y tipo `audio/mpeg`

Logica clave:

```text
const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 320);
const blockSize = 1152;
for (let i = 0; i < totalSamples; i += blockSize) {
  const leftChunk = leftChannel.subarray(i, i + blockSize);
  const rightChunk = rightChannel?.subarray(i, i + blockSize);
  const mp3buf = channels === 1
    ? encoder.encodeBuffer(leftChunk)
    : encoder.encodeBuffer(leftChunk, rightChunk);
  if (mp3buf.length > 0) mp3Chunks.push(mp3buf);
  onProgress(Math.round((i / totalSamples) * 100));
}
const finalBuf = encoder.flush();
```

### 3. Modificar `ReleaseAudio.tsx`

En la mutacion de upload, antes de iniciar el upload TUS:

```text
const MAX_DIRECT_SIZE = 50 * 1024 * 1024; // 50 MB
let fileToUpload = file;

if (file.size > MAX_DIRECT_SIZE) {
  setConversionStatus('converting');
  fileToUpload = await compressAudioToMp3(file, (pct) => {
    setUploadProgress(pct);
    setProgressLabel(`Convirtiendo a MP3... ${pct}%`);
  });
  setConversionStatus('uploading');
}

// Continuar con upload TUS usando fileToUpload
```

Nuevos estados:
- `conversionStatus: 'idle' | 'converting' | 'uploading'`
- `progressLabel: string` — texto dinamico para la barra de progreso

La UI mostrara:
- Durante conversion: "Convirtiendo a MP3 (320kbps)... 45%" con barra de progreso
- Durante subida: "Subiendo... 72%" con barra de progreso
- Tamano original vs comprimido debajo de la barra

### 4. Declaracion de tipos para lamejs

Crear `src/types/lamejs.d.ts` con la declaracion del modulo si no hay tipos disponibles en npm.

## Archivos

| Archivo | Accion |
|---|---|
| `package.json` | Anadir `lamejs` |
| `src/types/lamejs.d.ts` | Crear - declaracion de tipos |
| `src/utils/audioConverter.ts` | Crear - utilidad de conversion WAV a MP3 |
| `src/pages/release-sections/ReleaseAudio.tsx` | Modificar - integrar conversion automatica antes del upload |

