

## Plan: Fecha de lanzamiento dinámica según tipo y canción

### Problema
La fecha de lanzamiento siempre muestra `release.release_date` (fecha del álbum/EP completo). Pero cuando el pitch es de tipo Single, la canción seleccionada puede tener su propia fecha de lanzamiento diferente a la del release principal.

### Solución

**1. Migración DB: agregar `release_date` a `tracks`**
- Nuevo campo `release_date` (tipo `date`, nullable) en la tabla `tracks`
- Permite asignar fechas individuales a cada single/track dentro de un release

**2. Lógica dinámica en `ReleasePitch.tsx`**
- Si `pitchType === 'single'` y hay un track seleccionado con `release_date` propio → mostrar esa fecha
- Si `pitchType === 'single'` sin fecha propia en el track → mostrar `release.release_date`
- Si `pitchType === 'ep'` o `'album'` → mostrar `release.release_date` (como ahora)

**3. Actualizar tipo de `tracks` en `PitchEditorProps`**
- Añadir `release_date: string | null` al tipo de tracks que recibe el editor

### Archivos afectados
- Nueva migración SQL (`ALTER TABLE tracks ADD COLUMN release_date date`)
- `src/pages/release-sections/ReleasePitch.tsx` — lógica condicional en el campo fecha (~línea 689-693)

### Nota
Para que los singles muestren su fecha correcta, será necesario asignar la fecha individual a cada track desde la edición del release (el tracklist). Esto ya será posible con el nuevo campo.

