
# Mostrar la foto de perfil del artista en todos los sitios

Actualmente la foto de perfil (`avatar_url`) del artista se guarda correctamente en la base de datos, pero varios componentes solo muestran las iniciales (AvatarFallback) sin intentar cargar la imagen.

---

## Lugares a corregir

### 1. Perfil del Artista (`src/pages/ArtistProfile.tsx`)

El header del perfil (linea 329) solo tiene `AvatarFallback`. Se anadira `AvatarImage` para mostrar `artist.avatar_url` cuando exista.

### 2. Dashboard de Management (`src/pages/MyManagement.tsx`)

Las tarjetas de artista (linea 151) solo tienen `AvatarFallback`. Ademas, la interfaz `Artist` no incluye el campo `avatar_url`. Se anadira el campo a la interfaz y `AvatarImage` al componente.

### 3. Equipos (`src/pages/Teams.tsx`)

Este ya funciona correctamente -- pasa `avatarUrl` a `TeamMemberCard` que si renderiza la imagen.

---

## Cambios concretos

| Archivo | Cambio |
|---|---|
| `src/pages/ArtistProfile.tsx` | Importar `AvatarImage`, anadir `<AvatarImage src={artist.avatar_url}>` dentro del Avatar del header |
| `src/pages/MyManagement.tsx` | Anadir `avatar_url` a la interfaz `Artist`, importar `AvatarImage`, anadir `<AvatarImage>` en las tarjetas de artista |

Son cambios minimos (2-3 lineas por archivo) que garantizan que la foto aparezca en todos los sitios donde se muestra el artista.
