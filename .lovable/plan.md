

# Imagen de artista + Selector inteligente de genero musical

Dos mejoras al `ArtistInfoDialog`: subir foto con el cropper existente y un combobox de genero musical con busqueda fuzzy.

---

## 1. Foto del artista con ImageCropperDialog

Mismo patron que `ContactProfileSheet`: click en el avatar abre un file input, se pasa al `ImageCropperDialog` para recortar, y se sube a `artist-assets` en Supabase Storage.

### Cambios en `ArtistInfoDialog.tsx`

- Importar `ImageCropperDialog`, `Camera`, y anadir `useRef` para el file input
- Anadir estados: `cropFile` (File | null), `uploadingAvatar` (boolean)
- Anadir `fileInputRef` para el input hidden
- `handleFileSelect`: valida que sea imagen, guarda en `cropFile`
- `handleAvatarUpload(blob)`: sube a `artist-assets/{artistId}/{timestamp}.jpg`, obtiene URL publica, actualiza `artists.avatar_url` en BD, actualiza estado local
- En el header, hacer el avatar clickable (solo en modo edicion o siempre con `canEdit`): overlay con icono Camera al hover, spinner durante subida
- Input file hidden + `ImageCropperDialog` con `circular` y `aspectRatio={1}`

Se usa el bucket `artist-assets` que ya existe.

---

## 2. Selector de genero musical con busqueda fuzzy

Se crea un nuevo componente `GenreCombobox` siguiendo el patron de `FormatoCombobox`, pero con una lista extensa de generos musicales y busqueda inteligente (fuzzy).

### Nuevo archivo: `src/components/GenreCombobox.tsx`

- Lista de 100+ generos de la industria musical organizados por familias:
  - **Pop**: Pop, Indie Pop, Synth Pop, Dream Pop, Art Pop, K-Pop, J-Pop, Bubblegum Pop, Chamber Pop, Electropop...
  - **Rock**: Rock, Rock Alternativo, Indie Rock, Post-Rock, Garage Rock, Punk Rock, Hard Rock, Soft Rock, Progressive Rock, Psychedelic Rock, Grunge, Shoegaze, Brit Pop, Emo, Post-Punk, Math Rock, Stoner Rock, Blues Rock...
  - **Electronica**: Electronica, House, Techno, Minimal, Deep House, Tech House, Trance, Drum & Bass, Dubstep, Ambient, IDM, Electro, Downtempo, Electrofunk, Future Bass, Synthwave, Lo-Fi, Chillwave, Breakbeat, Hardstyle...
  - **Hip-Hop/Rap**: Hip-Hop, Rap, Trap, Boom Bap, Lo-Fi Hip-Hop, Conscious Rap, Drill, Grime, Mumble Rap, Cloud Rap...
  - **R&B/Soul**: R&B, Neo-Soul, Soul, Funk, Motown, Quiet Storm, Contemporary R&B...
  - **Latin**: Reggaeton, Latin Pop, Salsa, Cumbia, Bachata, Merengue, Dembow, Latin Trap, Corridos Tumbados, Regional Mexicano, Norteño, Banda, Bossa Nova, MPB, Samba, Tango...
  - **Jazz**: Jazz, Jazz Fusion, Smooth Jazz, Bebop, Free Jazz, Latin Jazz, Acid Jazz, Nu Jazz, Swing...
  - **Clasica**: Clasica, Opera, Barroco, Romanticismo, Contemporanea, Neoclasica, Musica de Camara, Orquestal...
  - **Folk/Acustico**: Folk, Folk Rock, Americana, Bluegrass, Country, Singer-Songwriter, Acustico, Celtic, Flamenco, Fado, Cantautor...
  - **Metal**: Metal, Heavy Metal, Thrash Metal, Death Metal, Black Metal, Doom Metal, Power Metal, Metalcore, Nu Metal, Symphonic Metal, Progressive Metal...
  - **Reggae/Ska**: Reggae, Ska, Dub, Dancehall, Rocksteady...
  - **Urbano**: Afrobeats, Amapiano, Kuduro, Kizomba, UK Garage...
  - **Experimental**: Experimental, Noise, Avant-Garde, Industrial, Glitch, Musique Concrete...
  - **Otros**: World Music, New Age, Gospel, Blues, Musica Infantil, Banda Sonora, Musica Cinematica...

### Logica de busqueda fuzzy

No solo filtra por `includes(query)`. Implementa un scoring:

1. **Match exacto al inicio** (prioridad maxima): "Elect" -> "Electronica" (empieza con "Elect")
2. **Match por inclusion**: "funk" -> "Electrofunk", "Funk"
3. **Match por familia/cercania**: Cada genero tiene tags de familia. Si escribes "Elect", ademas de los que coinciden literalmente, se muestran otros de la familia Electronica (Minimal, House, Techno) con prioridad menor
4. Los resultados se ordenan: primero los que empiezan con el texto, luego los que lo contienen, luego los de la misma familia

Cada genero tiene una estructura:
```typescript
{ label: 'Electronica', family: 'electronica', aliases: ['electronic', 'electro'] }
```

La busqueda compara contra `label`, `family` y `aliases`.

### Cambios en `ArtistInfoDialog.tsx`

- Importar `GenreCombobox`
- En el campo "Genero musical" (linea 257-261), cuando `editing`, reemplazar el `Input` por `<GenreCombobox value={formData.genre} onValueChange={(v) => setFormData({...formData, genre: v})} />`
- El modo lectura (no editing) sigue mostrando un `Input disabled` como ahora

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/components/GenreCombobox.tsx` | **Nuevo** - Combobox con 100+ generos y busqueda fuzzy |
| `src/components/ArtistInfoDialog.tsx` | Avatar clickable con cropper + GenreCombobox en campo genero |

