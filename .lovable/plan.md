

## Perfiles Colaboradores en MyManagement

### Problema
Cuando un artista del roster (ej: Rita Payes) colabora con otro artista externo (ej: Lucia Fumero), necesitas tener el perfil de Lucia en el sistema para poder trabajar con normalidad en releases, creditos, splits, etc.

### Solucion

Añadir un campo `artist_type` a la tabla `artists` con dos valores: `roster` (por defecto) y `collaborator`. En la UI de MyManagement, mostrar dos secciones separadas: "Mi Roster" arriba y "Colaboradores" abajo.

### Cambios

#### 1. Migracion SQL
- Añadir columna `artist_type text NOT NULL DEFAULT 'roster'` a la tabla `artists`
- Todos los artistas existentes quedaran como `roster` automaticamente

#### 2. MyManagement (`src/pages/MyManagement.tsx`)
- Separar la query de artistas en dos grupos: `roster` y `collaborator`
- Seccion "Mi Roster" con los artistas actuales (sin cambios visuales)
- Seccion "Colaboradores" debajo, con un diseño mas compacto y un badge "Colaborador" en lugar de "Artista"
- Boton "Nuevo Artista" se convierte en un dropdown con dos opciones: "Artista del roster" y "Colaborador"
- El stat de "Artistas" mostrara solo el conteo del roster

#### 3. CreateArtistDialog (`src/components/management/CreateArtistDialog.tsx`)
- Añadir prop `artistType: 'roster' | 'collaborator'` para saber que tipo crear
- Ajustar textos del dialogo segun el tipo (ej: "Nuevo Colaborador" vs "Nuevo Artista")
- Pasar `artist_type` en el insert

#### 4. Selectores de artistas
- `SingleArtistSelector`, `ArtistFilter`, y otros selectores seguiran mostrando TODOS los artistas (roster + colaboradores) ya que los colaboradores deben poder asignarse a releases, creditos, etc.
- No se requieren cambios en estos componentes

### Lo que NO se toca
- La tabla `artists` mantiene su estructura actual, solo se añade una columna
- Los perfiles de artista (`/artistas/:id`) funcionan igual para ambos tipos
- Releases, creditos, splits, bookings - todo sigue funcionando sin cambios
- Los selectores de artistas muestran todos los perfiles sin distincion

### Detalle tecnico

```sql
ALTER TABLE public.artists 
ADD COLUMN artist_type text NOT NULL DEFAULT 'roster';
```

En la UI, el filtrado es simplemente:
```typescript
const rosterArtists = artists.filter(a => a.artist_type !== 'collaborator');
const collaboratorArtists = artists.filter(a => a.artist_type === 'collaborator');
```

