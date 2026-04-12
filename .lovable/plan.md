

## Formularios de Discografía: Plan Integrado

### Filosofia
En lugar de crear un sistema de formularios paralelo, extender lo que ya existe: **la ficha del Release** ya tiene los metadatos de distribución (label, UPC, copyright, géneros, idioma, año), los **créditos**, el **audio**, y la **imagen**. El sistema de **enlaces públicos tokenizados** ya funciona para artistas (`/artist-form/:token`) y proyectos (`/shared/project/:token`). La propuesta se reduce a tres piezas:

### 1. Añadir campos de pitch al Release (migración)
Añadir a la tabla `releases` los campos que faltan respecto al formulario de pitch propuesto y que aún no existen:
- `pitch_status` (enum: draft, sent, in_progress, completed, reviewed)
- `pitch_deadline` (date)
- `pitch_token` (text unique, para enlace público)
- `pitch_config` (jsonb, configuración de qué campos son editables/ocultos)
- `country` (text)
- `mood` (text)
- `synopsis` (text, max 500 chars)
- `spotify_strategy` (text)
- `spotify_monthly_listeners` (integer)
- `spotify_followers` (integer)
- `spotify_milestones` (text)
- `general_strategy` (text)
- `social_links` (text)

Los campos que ya existen (title, type, release_date, genre, label, upc, copyright, language, production_year, description, cover_image_url) se reutilizan directamente, sin duplicar.

### 2. Nueva sección "Pitch Distribución" en ReleaseDetail
Añadir una nueva tarjeta en `ReleaseDetail.tsx` (junto a Cronograma, Presupuestos, etc.) llamada **"Pitch"**:
- Vista interna (`/releases/:id/pitch`) con un formulario completo organizado por secciones (Info Básica, Archivos, Spotify, Contenido, RRSS)
- Los campos se pre-rellenan desde los datos ya existentes del release (título, tipo, fecha, género, artista, etc.)
- Toggle por campo: "editable por artista" / "solo manager" — guardado en `pitch_config` (jsonb)
- Botón "Generar enlace" que crea un `pitch_token` y permite copiarlo
- Estado del pitch visible con badge

### 3. Ruta pública `/release-form/:token`
- Página pública sin autenticación (como `/artist-form/:token`)
- Busca el release por `pitch_token`, lee `pitch_config` para saber qué campos mostrar editables
- Auto-guardado con debounce (mismo patrón que los bloques de roadmap)
- Barra de progreso de completitud
- Al enviar, cambia `pitch_status` a `completed`
- El manager recibe notificación (tabla `notifications` existente)

### Qué se reutiliza sin tocar
- **Metadatos de distribución**: label, UPC, copyright, género, idioma, año — ya están en `releases` y en `EditReleaseDialog`
- **Créditos**: la sección `/releases/:id/creditos` ya gestiona compositores, productores, performers
- **Audio**: la sección `/releases/:id/audio` ya tiene el tracklist con archivos
- **Imagen**: la sección `/releases/:id/imagen-video` ya gestiona portada y fotos
- **Sistema de tokens**: el patrón de `/artist-form/:token` se replica
- **Notificaciones**: tabla `notifications` existente

### Lo que NO se crea
- No se crea tabla `forms` ni `form_fields` ni `form_responses` — los datos viven directamente en `releases`
- No se duplica ningún campo que ya exista
- No se usa `window.storage` — todo Supabase
- No se crea sistema de plantillas genérico (overkill para ahora; si en el futuro se necesitan formularios de booking/EPK, se añade entonces)

### Archivos afectados
1. **Migración SQL**: añadir columnas a `releases` + tipo enum `pitch_status`
2. **`src/pages/ReleaseDetail.tsx`**: añadir sección "Pitch" al array `SECTIONS`
3. **`src/pages/release-sections/ReleasePitch.tsx`** (nuevo): formulario interno del manager con toggles de visibilidad
4. **`src/pages/PublicReleaseForm.tsx`** (nuevo): formulario público tokenizado
5. **`src/App.tsx`**: añadir ruta `/release-form/:token`
6. **`src/hooks/useReleases.ts`**: incluir nuevos campos en el tipo `Release`

### Resultado
El manager edita los datos del release como siempre, activa el "Pitch", configura qué ve el artista, genera un enlace, y el artista completa lo que falta. Todo queda en una sola fuente de verdad (la tabla `releases`), listo para exportar a Label Copy, enviar a la distribuidora, o convertir en EPK.

