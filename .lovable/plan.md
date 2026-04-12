

## Plan: Vincular EPK a artista del roster

### Problema
El campo "Artista/Proyecto" es texto libre. El usuario quiere seleccionar un artista de su roster (o colaborador) y que el EPK quede vinculado a su perfil.

### Cambios

**1. Migración SQL — añadir `artist_id` a `epks`**
- Nueva columna `artist_id UUID REFERENCES artists(id) ON DELETE SET NULL`
- Índice en `artist_id`

**2. `src/components/epk/EPKForm.tsx` — reemplazar input por selector**
- En `renderBasicForm()` (líneas 105-113), reemplazar el `<Input>` de "Artista/Proyecto" por el componente `SingleArtistSelector` existente
- Al seleccionar un artista, auto-rellenar `artista_proyecto` con su nombre/stage_name y guardar `artist_id`
- Mantener un input de texto debajo para permitir edición manual del nombre mostrado (por si quieren personalizarlo)

**3. `src/hooks/useEPK.ts` — añadir `artist_id` al tipo y al save**
- Añadir `artist_id?: string | null` a `EPKData`
- Incluir `artist_id` en las operaciones de insert/update

**4. Perfil del artista — mostrar EPKs vinculados**
- En la vista 360 del artista, añadir una sección o tab que liste los EPKs donde `artist_id` coincida, con enlaces directos al builder y al EPK público

### Archivos afectados
- Nueva migración SQL
- `src/hooks/useEPK.ts` — tipo + save
- `src/components/epk/EPKForm.tsx` — selector de artista
- `src/integrations/supabase/types.ts` — se regenera
- Componente del perfil del artista (a identificar) — listado de EPKs

