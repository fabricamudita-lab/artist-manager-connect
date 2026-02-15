
# Formulario publico para ficha de artista

## Concepto

Reemplazar el boton "Chatear" en la ficha del artista por un boton "Formulario" que genera un enlace publico compartible. Cualquier persona con el enlace puede ver y completar la informacion del artista desde cualquier dispositivo (movil, tablet, ordenador), sin necesidad de tener cuenta en la plataforma.

Esto es util para que el management envie el link al artista o su equipo y ellos mismos rellenen sus datos (redes sociales, datos fiscales, IBAN, etc.).

## Flujo de usuario

1. El manager abre la ficha del artista y hace clic en "Formulario"
2. Se genera un token unico y se copia el enlace al portapapeles
3. El manager comparte el enlace con el artista por WhatsApp, email, etc.
4. El artista abre el enlace en su dispositivo
5. Ve un formulario bonito con la info actual pre-rellenada
6. Completa/actualiza los campos y hace clic en "Guardar"
7. Los datos se actualizan directamente en la base de datos

## Cambios necesarios

### 1. Nueva tabla: `artist_form_tokens`

Crear una tabla para almacenar los tokens de acceso publico a formularios de artistas.

Campos:
- `id` (uuid, PK)
- `artist_id` (uuid, FK a artists)
- `token` (text, unico, generado aleatoriamente)
- `created_by` (uuid, FK a auth.users)
- `expires_at` (timestamptz, opcional, para expiracion)
- `is_active` (boolean, default true)
- `created_at` (timestamptz)

RLS: lectura publica por token, escritura solo para usuarios autenticados.

### 2. Nuevo componente: `src/pages/PublicArtistForm.tsx`

Pagina publica (sin autenticacion) que:
- Recibe el token de la URL (`/artist-form/:token`)
- Busca el token en `artist_form_tokens` y obtiene el `artist_id`
- Carga los datos actuales del artista
- Muestra un formulario con secciones:
  - Informacion General (nombre, nombre artistico, genero, bio)
  - Redes Sociales (Instagram, Spotify, TikTok)
  - Datos Fiscales (empresa, nombre legal, CIF/NIF, IBAN, banco, SWIFT)
- Los campos vienen pre-rellenados con la info existente
- Al enviar, actualiza la tabla `artists`
- Muestra confirmacion de exito

El diseno seguira el estilo de la pagina `PublicSyncRequestForm` (limpia, con logo, cards organizadas).

### 3. Modificar `src/components/ArtistInfoDialog.tsx`

- Eliminar la prop `onChatOpen` y el boton "Chatear"
- Agregar boton "Formulario" con icono `ExternalLink` o `Share2`
- Al hacer clic:
  - Busca si ya existe un token activo para ese artista
  - Si no existe, crea uno nuevo en `artist_form_tokens`
  - Copia el enlace publico al portapapeles
  - Muestra toast de confirmacion "Enlace copiado al portapapeles"

### 4. Modificar `src/pages/ArtistProfile.tsx`

- Eliminar la prop `onChatOpen` del `ArtistInfoDialog`

### 5. Ruta publica en `src/App.tsx`

Agregar la ruta `/artist-form/:token` que apunta a `PublicArtistForm`, fuera de las rutas protegidas (igual que `/sync-request/:token`).

## Detalles tecnicos

### Generacion de token
Se usara `crypto.randomUUID()` para generar tokens unicos. El enlace tendra formato: `https://[dominio]/artist-form/[token]`

### Seguridad
- La tabla `artist_form_tokens` tendra RLS:
  - SELECT publico filtrado por `is_active = true` (para validar tokens)
  - INSERT/UPDATE solo para usuarios autenticados
- La tabla `artists` necesitara una politica UPDATE publica condicionada a la existencia de un token activo valido, o se usara una edge function para la actualizacion

### Migracion SQL
```sql
CREATE TABLE artist_form_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid REFERENCES artists(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE artist_form_tokens ENABLE ROW LEVEL SECURITY;

-- Lectura publica por token activo
CREATE POLICY "Public can read active tokens"
  ON artist_form_tokens FOR SELECT
  USING (is_active = true);

-- Usuarios autenticados pueden crear tokens
CREATE POLICY "Authenticated users can create tokens"
  ON artist_form_tokens FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politica para que el formulario pueda actualizar artistas via token valido
CREATE POLICY "Public can update artists with valid token"
  ON artists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artist_form_tokens
      WHERE artist_form_tokens.artist_id = artists.id
      AND artist_form_tokens.is_active = true
    )
  );
```

### Archivos nuevos
- `src/pages/PublicArtistForm.tsx` - Pagina publica del formulario

### Archivos modificados
- `src/components/ArtistInfoDialog.tsx` - Reemplazar "Chatear" por "Formulario"
- `src/pages/ArtistProfile.tsx` - Eliminar prop onChatOpen
- `src/App.tsx` - Agregar ruta publica
- Migracion SQL para la nueva tabla
