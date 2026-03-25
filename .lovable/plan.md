

## Mover Main Artist / Featuring al diálogo "Editar Canción"

### Problema
El componente de roles de artista (`ReleaseArtistRoles`) existe en la página de Créditos pero aparece como una card separada entre los botones superiores y la lista de canciones. Es fácil pasarlo por alto. El usuario espera encontrarlo dentro del diálogo de edición de canción o en un lugar más visible.

### Solución

**Integrar la sección de artistas directamente en el diálogo "Editar Canción"**, debajo del campo de Letra. Esto permite al usuario gestionar los roles (Main Artist / Featuring) en el mismo flujo de edición de cada canción.

Además, **mover la card `ReleaseArtistRoles` a una posición más prominente** en la página general — justo debajo del título de la sección, antes de las canciones, con un diseño más llamativo (fondo destacado o border accent).

### Cambios concretos

**1. `src/pages/release-sections/ReleaseCreditos.tsx`**
- Dentro del diálogo "Editar Canción" (línea ~443), añadir una sección "Artistas del Lanzamiento" debajo del formulario de la canción, usando el componente `ReleaseArtistRoles` en formato compacto
- Mantener también la card en la página principal pero con estilo más visible (border-primary/20, fondo accent)

**2. `src/components/releases/ReleaseArtistRoles.tsx`**
- Añadir prop `compact?: boolean` para renderizar una versión reducida sin Card wrapper, apta para embeberse en diálogos
- En modo compacto: sin CardHeader, solo la lista de artistas con selectores y el botón de añadir

### Resultado
El usuario verá los roles de artista tanto al abrir "Editar Canción" como en la vista general de créditos, sin posibilidad de perdérselo.

