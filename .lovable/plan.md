

## Comparativa: Formulario Ditto vs MOODITA

### Campos del formulario Ditto (en orden)

| # | Campo Ditto | Tipo | Obligatorio | Max chars (respuesta) | Estado en MOODITA |
|---|-------------|------|-------------|----------------------|-------------------|
| 1 | País en que reside | texto | si | ~20 | **Existe** (campo `country`) |
| 2 | Nombre del artista(s) + featuring | texto | si | ~40 | Auto desde release (OK) |
| 3 | Título de lanzamiento | texto | si | ~30 | Auto desde release (OK) |
| 4 | Audio MP3 (link Drive) | URL | si | ~80 | **FALTA** |
| 5 | UPC | texto | no | ~15 | **Existe** (desde release) |
| 6 | Focus track (si EP/álbum) | texto | no | ~30 | Parcial (pitch_type recién añadido) |
| 7 | Tipo de lanzamiento (Single/EP/Álbum) | select | si | - | Auto desde release (OK) |
| 8 | Fecha de lanzamiento | fecha | si | - | Auto desde release (OK) |
| 9 | Género musical | texto libre | si | ~40 | **Existe** pero como select (OK, mejor) |
| 10 | Mood | checkboxes (multi) | si | - | **Existe** pero como select simple (deberia ser multi) |
| 11 | Estrategia general de lanzamiento | texto largo | si | ~1000 | **Existe** |
| 12 | Listado de instrumentos | texto | si | ~60 | **FALTA** |
| 13 | Fotos del artista (link Drive) | URL | si | ~80 | **FALTA** |
| 14 | Video (link YouTube/Drive) | URL | no | ~80 | **FALTA** |
| 15 | Sinopsis (max 500 chars) | texto largo | si | 500 | **Existe** (con límite) |
| 16 | Estrategia dirigida a Spotify | texto largo | si | ~600 | **Existe** |
| 17 | Hitos en Spotify | texto largo | si | ~350 | **Existe** |
| 18 | Fotos exclusivas para Spotify (link Drive) | URL | si | ~80 | **FALTA** |
| 19 | Oyentes mensuales Spotify | número | si | ~6 | **Existe** |
| 20 | Seguidores en Spotify | número | si | ~5 | **Existe** |
| 21 | Links de redes sociales | texto | si | ~100 | **Existe** |
| 22 | Otros datos relevantes | texto largo | no | ~200 | **FALTA** |
| 23 | Biografía del artista | texto largo | si | ~300 | **FALTA** |
| 24-29 | Sección Vevo (opcional) | mixto | no | - | **FALTA** (opcional, baja prioridad) |

---

### Diferencias clave encontradas

**1. Campos que FALTAN en MOODITA (7 importantes + Vevo opcional):**
- `audio_link` — Link de descarga del audio MP3 (Drive)
- `instruments` — Listado de instrumentos involucrados
- `artist_photos_link` — Fotos del artista (link Drive, con instrucciones de formato)
- `video_link` — Link de video (YouTube/Drive)
- `spotify_photos_link` — Fotos exclusivas para Spotify (link Drive)
- `additional_info` — Otros datos relevantes del lanzamiento
- `artist_bio` — Biografía del artista (breve pero poderosa)
- Sección Vevo completa (baja prioridad, es opcional en Ditto)

**2. Mood deberia ser MULTI-SELECT:**
- Ditto usa checkboxes (se pueden marcar varios)
- MOODITA usa select simple (solo uno)

**3. Orden incorrecto — Ditto agrupa asi:**
- Primero: info básica (país, artista, título, audio, UPC, tipo, fecha, género)
- Segundo: mood + estrategia general + instrumentos + fotos + video
- Tercero: sinopsis
- Cuarto: bloque Spotify completo (estrategia, hitos, fotos Spotify, oyentes, seguidores)
- Quinto: RRSS + otros datos + biografía
- Sexto: Vevo (opcional)

MOODITA pone sinopsis y mood primero, lo cual no coincide.

**4. Textos de ayuda / ejemplos:**
- Ditto incluye textos de ejemplo extensos en sinopsis y estrategia general (marcados en amarillo)
- MOODITA no tiene placeholders descriptivos ni ejemplos guía

**5. Instrucciones de fotos:**
- Ditto da instrucciones muy detalladas para las fotos (resolución, sin logos, sin close-ups, etc.)
- MOODITA no tiene este campo

**6. Campos extra de MOODITA (no en Ditto pero útiles):**
- Descripción (separada de sinopsis) — viene del release
- Género secundario — viene del release
- Idioma — viene del release
- Sello — viene del release
- Copyright — viene del release

Estos están bien porque son read-only desde el release y complementan la info.

---

### Plan de implementación

**Migración SQL** — Añadir 7 columnas a `pitches`:
- `audio_link TEXT`
- `instruments TEXT`
- `artist_photos_link TEXT`
- `video_link TEXT`
- `spotify_photos_link TEXT`
- `additional_info TEXT`
- `artist_bio TEXT`

**Cambiar Mood a multi-select** — En el formulario público y el editor, permitir selección múltiple. Guardar como texto separado por comas.

**Reordenar secciones** para coincidir con Ditto:
1. Info básica (país, género, idioma, sello, UPC, copyright)
2. Contenido (sinopsis, mood, instrumentos, audio link, fotos link, video link)
3. Spotify (estrategia, hitos, fotos Spotify, oyentes, seguidores)
4. Estrategia y RRSS (estrategia general, redes sociales, datos adicionales, biografía)

**Añadir placeholders descriptivos** con los ejemplos de Ditto como texto de ayuda.

**Archivos afectados:**
- Nueva migración SQL
- `src/hooks/usePitches.ts` — tipos + campos
- `src/pages/release-sections/ReleasePitch.tsx` — nuevos campos en el editor
- `src/pages/PublicReleaseForm.tsx` — nuevos campos, reorden, mood multi-select, placeholders

