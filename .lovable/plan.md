# Iconos sociales correctos en el header del artista

## Problema

En el header del perfil del artista (`src/pages/ArtistProfile.tsx`), los enlaces sociales muestran iconos genéricos que no coinciden con la red:

- **Spotify** → se muestra el icono `Globe` (mundo verde).
- **TikTok** → se muestra el icono `Music` (nota musical).
- Instagram sí usa el icono correcto (`Instagram` de lucide).

## Solución

Sustituir los iconos genéricos por logos de marca reales. Como `lucide-react` no incluye logos de Spotify ni TikTok y no hay `react-icons` instalado en el proyecto, usaré **SVGs inline** (paths oficiales simplificados) directamente en el JSX. Es la opción más liviana y evita añadir dependencias.

Cambios en `src/pages/ArtistProfile.tsx` (líneas ~370–389):

1. Spotify: reemplazar `<Globe />` por un `<svg>` inline con el path del logo de Spotify. Hover con su verde de marca `#1DB954`.
2. TikTok: reemplazar `<Music />` por un `<svg>` inline con el path del logo de TikTok. Hover en `text-foreground`.
3. Instagram: mantener `Instagram` de lucide (ya correcto). Añadir `aria-label` por accesibilidad en los tres.
4. Eliminar el import de `Globe` si deja de usarse en el archivo.

Tamaño de los iconos: `h-4 w-4` (igual que ahora) para mantener la alineación visual existente.

## Archivos a modificar

- `src/pages/ArtistProfile.tsx` — bloque de social links y limpieza de imports.

## Verificación

- Abrir un perfil de artista con `spotify_url`, `instagram_url` y `tiktok_url` rellenados.
- El icono junto al enlace de Spotify debe ser el logo de Spotify (verde al pasar el ratón).
- El icono junto al enlace de TikTok debe ser el logo de TikTok.
- Instagram sigue mostrando el icono de Instagram.
- Hacer click en cada uno debe abrir la URL correspondiente en una pestaña nueva.
