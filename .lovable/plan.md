

## Plan: UPC/ISRC dinámico según tipo y canción seleccionada

### Qué cambia

El campo UPC actualmente muestra siempre el UPC del release (nivel álbum). Según el tipo de lanzamiento seleccionado, debe mostrar información diferente:

- **Single**: mostrar el **ISRC** del track seleccionado (no el UPC del release)
- **EP / Album**: mostrar el **UPC** del release

Esto refleja cómo funciona la industria: los singles se identifican por ISRC, los álbumes/EPs por UPC.

### Cambios técnicos

**Archivo: `src/pages/release-sections/ReleasePitch.tsx`**

1. **Ampliar el tipo de `tracks` en `PitchEditorProps`** para incluir `isrc`:
   ```
   tracks: Array<{ id: string; title: string; track_number: number | null; isrc: string | null }>
   ```

2. **Hacer el bloque UPC dinámico** (líneas ~580-585): en vez de mostrar siempre `release.upc`, aplicar esta lógica:
   - Si `pitchType === 'single'` y hay un `trackId` seleccionado → buscar el track y mostrar su ISRC con label "ISRC"
   - Si `pitchType === 'single'` sin track seleccionado → mostrar "Selecciona una canción para ver el ISRC"
   - Si `pitchType === 'ep'` o `'album'` → mostrar `release.upc` con label "UPC" (comportamiento actual)

3. **Actualizar también la lista principal** (línea ~135-155) para pasar `isrc` en el prop `tracks` — ya se pasa `tracks` directamente del hook `useTracks` que devuelve `Track[]` con `isrc`, solo hay que actualizar el tipo.

### Un archivo afectado
- `src/pages/release-sections/ReleasePitch.tsx`

