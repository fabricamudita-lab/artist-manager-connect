
# Reproductor de audio con visualizacion de onda

## Resumen

Reemplazar el elemento `<audio>` oculto por un reproductor visual con forma de onda (waveform) usando la **Web Audio API** y un `<canvas>`. El usuario podra:

- Reproducir/pausar cada version de audio
- Ver la onda completa del archivo
- Hacer clic en cualquier punto de la onda para saltar a esa posicion
- Ver el tiempo actual y la duracion total

## Diseno visual

```text
+------------------------------------------+
| [Pause]  Chromatism MIX3                 |
|  ████▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  |
|  0:03                              3:05  |
+------------------------------------------+
```

- La parte reproducida se muestra en color `primary`
- La parte restante en `muted-foreground` con opacidad
- Al hacer clic en la onda, el audio salta a esa posicion

## Implementacion tecnica

### 1. Nuevo componente `AudioWaveformPlayer`

Crear un componente en `src/components/releases/AudioWaveformPlayer.tsx`:

- Recibe `src` (URL del audio), `isPlaying`, `onTogglePlay`
- Usa `AudioContext.decodeAudioData()` para obtener el buffer de audio y extraer los peaks (muestras promediadas)
- Dibuja la onda en un `<canvas>` usando barras verticales
- Un `requestAnimationFrame` loop actualiza la posicion de reproduccion
- Al hacer clic en el canvas, calcula la posicion relativa y hace `audioElement.currentTime = ...`
- Muestra tiempo actual y duracion en formato `m:ss`

Flujo:
1. Al montar o cambiar `src`, fetch del audio como `ArrayBuffer`
2. Decodificar con `AudioContext.decodeAudioData()`
3. Extraer ~200 barras de peaks del canal izquierdo
4. Dibujar en canvas: barras en color primary hasta la posicion actual, barras en gris para el resto
5. En cada frame, redibujar la posicion del cursor

### 2. Modificar `TrackAudioCard` en `ReleaseAudio.tsx`

- Cuando hay una version reproduciendose, mostrar el `AudioWaveformPlayer` debajo de la version activa
- Pasar el `audioRef` al componente para controlar la reproduccion
- El boton play/pause existente seguira funcionando, pero ademas el waveform player tendra su propio boton integrado

### 3. Detalles del canvas

- Barras con esquinas redondeadas, separacion de 2px
- Color reproducido: `hsl(var(--primary))`
- Color restante: `hsl(var(--muted-foreground))` con opacidad 0.3
- Reflejo inferior (mirror) con opacidad reducida, similar a la imagen de referencia
- Responsive: el canvas se adapta al ancho del contenedor
- Clic para seek: `(clickX / canvasWidth) * duration`

### Archivos

| Archivo | Accion |
|---|---|
| `src/components/releases/AudioWaveformPlayer.tsx` | Crear - componente canvas con waveform |
| `src/pages/release-sections/ReleaseAudio.tsx` | Modificar - integrar waveform en cada version que se reproduce |
