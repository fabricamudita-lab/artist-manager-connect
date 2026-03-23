

## Enlace de reproducción externo para releases

### Resumen
Añadir un botón en la sección Audio que genere un enlace público para que usuarios externos puedan escuchar todas las canciones del release secuencialmente, con portada y tracklist visual (similar a la primera imagen de referencia).

### Cambios

**1. Migración de base de datos**
- Añadir columnas a `releases`: `share_token` (text, unique), `share_enabled` (boolean, default false), `share_expires_at` (timestamptz)
- Crear policy RLS que permita SELECT público cuando `share_enabled = true` y el token coincida
- Crear policy RLS similar para `tracks` y `track_versions` vinculados al release compartido

**2. Nueva página pública: `src/pages/SharedRelease.tsx`**
- Ruta: `/shared/release/:token` (sin ProtectedRoute)
- Diseño inspirado en la imagen de referencia:
  - Portada grande a la izquierda (si existe `cover_image_url`)
  - Título del release, artista, número de tracks, duración total
  - Lista de tracks con botón play individual
  - Reproducción secuencial automática de principio a fin
  - Usa `AudioWaveformPlayer` o un reproductor simplificado
- Consulta la release por `share_token`, valida expiración
- Obtiene tracks y sus versiones `is_current_version = true` para reproducir

**3. Botón "Generar enlace" en Audio: `src/pages/release-sections/ReleaseAudio.tsx`**
- Añadir botón junto al título "Audio" (icono de compartir/enlace externo)
- Al hacer clic: genera un token UUID, lo guarda en `releases.share_token` con `share_enabled = true`
- Muestra el enlace copiable con botón de copiar al portapapeles
- Opción para desactivar/revocar el enlace

**4. Registro de ruta en `App.tsx`**
- Añadir `<Route path="/shared/release/:token" element={<SharedRelease />} />` fuera de ProtectedRoute

### Flujo
```text
Audio page → [Compartir enlace] → genera token → copia URL
                                                      ↓
Usuario externo abre URL → SharedRelease page
  ┌─────────────┬──────────────────────┐
  │  [Portada]  │  Título Release      │
  │             │  Artista · N tracks  │
  │             │                      │
  │             │  1. Track name  ▶    │
  │             │  2. Track name  ▶    │
  │             │  3. Track name  ▶    │
  └─────────────┴──────────────────────┘
```

