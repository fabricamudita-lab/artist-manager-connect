

## Plan: Auto-rellenar duración extrayéndola del audio cuando la BD no la tiene

### Problema
Todos los tracks existentes tienen `duration = null` en la BD porque el código anterior no la extraía. El fix de `ReleaseAudio.tsx` solo aplica a **futuras** subidas. Cuando seleccionas un track en el generador de licencias IP, `track.duration` es null y no se rellena nada.

### Solución
Dos cambios en `src/components/IPLicenseGenerator.tsx`:

1. **Fallback client-side**: Cuando se selecciona un track y `track.duration` es null, buscar su `track_version` más reciente, cargar el audio con `new Audio(fileUrl)`, extraer la duración con `loadedmetadata`, y:
   - Rellenar `grabacion_duracion` en el formulario
   - Actualizar la BD (`tracks.update({ duration })`) para que la próxima vez ya esté disponible

2. **Cargar track_versions junto con tracks**: Usar la query existente o hacer una query adicional para obtener el `file_url` de la versión más reciente de cada track, de modo que el componente tenga acceso a la URL del audio.

### Cambios concretos

| Archivo | Cambio |
|---------|--------|
| `IPLicenseGenerator.tsx` | En el `onValueChange` del Select de tracks (~línea 753), añadir lógica: si `track.duration` es null, buscar el file_url de la versión más reciente del track, crear un `Audio` element, extraer duración, actualizar formulario y BD |
| `IPLicenseGenerator.tsx` | Añadir query para obtener `track_versions` (file_url) de los tracks del release seleccionado, o hacer fetch inline al seleccionar |

### Detalle técnico
```typescript
// En onValueChange del select de track:
if (track && track.duration) {
  update('grabacion_duracion', formatDuration(track.duration));
} else if (track) {
  // Fetch latest version URL and extract duration
  const { data: versions } = await supabase
    .from('track_versions')
    .select('file_url')
    .eq('track_id', track.id)
    .order('version_number', { ascending: false })
    .limit(1);
  if (versions?.[0]?.file_url) {
    const audio = new Audio(versions[0].file_url);
    audio.addEventListener('loadedmetadata', async () => {
      const dur = Math.round(audio.duration);
      if (dur && isFinite(dur)) {
        update('grabacion_duracion', formatDuration(dur));
        await supabase.from('tracks').update({ duration: dur }).eq('id', track.id);
      }
    });
    audio.load();
  }
}
```

Esto resuelve tanto los tracks existentes (sin duración) como asegura que futuros tracks ya tengan el dato en BD.

