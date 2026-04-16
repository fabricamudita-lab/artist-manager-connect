

## Plan: Redes sociales dinámicas con botón "+"

### Objetivo
En la sección "Redes Sociales" del `ArtistInfoDialog` (panel del manager), permitir añadir perfiles adicionales más allá de los 3 fijos (Instagram, Spotify, TikTok) mediante un botón "+".

### Diseño

**Redes predefinidas disponibles** (catálogo): Instagram, Spotify, TikTok, YouTube, Apple Music, SoundCloud, Bandcamp, X/Twitter, Facebook, Threads, LinkedIn, Web/Otro.

Las 3 actuales (Instagram, Spotify, TikTok) siguen siendo fijas y editables como hasta ahora. El resto se almacenan en un nuevo campo JSONB `social_links` en la tabla `artists`:
```json
[
  { "platform": "youtube", "url": "https://youtube.com/@..." },
  { "platform": "soundcloud", "url": "https://..." }
]
```

### Cambios

| Archivo | Cambio |
|---|---|
| Migración SQL | Añadir columna `social_links jsonb default '[]'::jsonb` a `artists` |
| `ArtistInfoDialog.tsx` | Bajo TikTok añadir lista dinámica de redes extras + botón "+ Añadir red social" con popover de catálogo. Cada fila: selector de plataforma (icono) + input URL + botón eliminar |
| `PublicArtistForm.tsx` | Mostrar las redes extras igual que las 3 fijas (respetando `field_config` con clave `social_links`) y permitir editarlas desde el formulario público |
| `src/lib/social-platforms.ts` (nuevo) | Catálogo de plataformas con icono, label y placeholder |

### UX
- Botón "+" abre un popover con las plataformas disponibles (filtradas para no duplicar las ya añadidas).
- Al elegir una, se añade una fila nueva con el input vacío.
- Botón papelera por fila para eliminar.
- En el formulario público, las redes extras aparecen junto a Instagram/Spotify/TikTok con su icono correspondiente.

### Resultado
El manager y el artista (vía formulario público) pueden añadir tantos perfiles sociales como quieran sin tocar código.

