
# Fix subida de archivos grandes + reproductor de audio

## Problema

El bucket `audio-tracks` tiene el limite correcto de 250 MB, pero Supabase impone un limite global de ~50 MB para uploads estandar (`supabase.storage.upload()`). Tu WAV de 125 MB siempre sera rechazado con este metodo.

## Solucion

Cambiar el metodo de subida a **uploads resumables** usando la libreria `tus-js-client`, que implementa el protocolo TUS. Esto sube el archivo en chunks de 6 MB, evitando el limite global.

## Cambios

### 1. Instalar dependencia

- `tus-js-client` — libreria oficial para uploads resumables

### 2. `src/pages/release-sections/ReleaseAudio.tsx`

Reemplazar la llamada `supabase.storage.from('audio-tracks').upload(fileName, file)` por un upload TUS:

```text
import * as tus from 'tus-js-client';

// En el mutationFn:
const projectId = 'hptjzbaiclmgbvxlmllo';
const session = await supabase.auth.getSession();
const accessToken = session.data.session?.access_token;

await new Promise((resolve, reject) => {
  const upload = new tus.Upload(file, {
    endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    headers: {
      authorization: `Bearer ${accessToken}`,
      'x-upsert': 'false',
    },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: {
      bucketName: 'audio-tracks',
      objectName: fileName,
      contentType: file.type,
      cacheControl: '3600',
    },
    chunkSize: 6 * 1024 * 1024, // 6 MB
    onError: (error) => reject(error),
    onSuccess: () => resolve(undefined),
  });
  upload.start();
});
```

El resto del flujo (getPublicUrl, insertar en track_versions) se mantiene igual.

### 3. Barra de progreso (bonus)

Aprovechar el callback `onProgress` de TUS para mostrar una barra de progreso durante la subida, util para archivos de 100+ MB que pueden tardar.

```text
onProgress: (bytesUploaded, bytesTotal) => {
  const pct = Math.round((bytesUploaded / bytesTotal) * 100);
  setUploadProgress(pct);
}
```

Mostrar un componente `<Progress value={uploadProgress} />` en el dialogo de subida en vez del simple "Subiendo...".

## Archivos

| Archivo | Accion |
|---|---|
| `package.json` | Anadir `tus-js-client` |
| `src/pages/release-sections/ReleaseAudio.tsx` | Reemplazar upload estandar por TUS resumable + barra de progreso |
