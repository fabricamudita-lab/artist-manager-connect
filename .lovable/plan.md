

## Plan: Asegurar que TODOS los campos activados aparezcan en el formulario público

### Diagnóstico

Mirando las capturas, el formulario público de Klaus Stroink solo muestra: nombre, nombre artístico, género, bio, Instagram, Spotify, TikTok, y la sección Fiscal/Bancaria. **Faltan**: email, teléfono, dirección, tallas, salud (alergias / necesidades especiales) y notas.

El código del formulario público (`PublicArtistForm.tsx`) **ya renderiza condicionalmente** todos esos campos usando `isArtistFieldVisible(fieldConfig, field)`. Por lo tanto, el problema es que el `field_config` guardado en la BD para este artista tiene esos campos explícitamente en `false`.

Esto ocurre porque:
1. El sistema de toggles del `ArtistInfoDialog` guarda el `field_config` tal cual está al pulsar Guardar.
2. Si el usuario nunca ha tocado los toggles pero el config se inicializó parcial (por ejemplo aplicando "Básico" sin querer, o porque un guardado previo escribió un objeto incompleto), el formulario público respeta esos `false`.
3. Además los toggles del panel izquierdo se ven todos en ON (porque `visible()` devuelve `true` cuando el campo no está en el config), pero al guardar se persiste solo lo que está en `fieldConfig`, sin convertir los implícitos en explícitos.

### Solución (3 cambios)

#### 1. `src/components/ArtistInfoDialog.tsx` — al guardar, normalizar el config
Antes de hacer `update`, materializar el estado real de los toggles: para cada campo de `ARTIST_FIELD_LABELS`, escribir `true` o `false` explícito en `field_config`. Así lo que ve el usuario en los toggles = lo que se guarda = lo que ve el formulario público. Sin ambigüedad.

```ts
// Antes de guardar
const normalizedConfig = Object.fromEntries(
  Object.keys(ARTIST_FIELD_LABELS).map(f => [f, isArtistFieldVisible(fieldConfig, f)])
);
updateData.field_config = normalizedConfig;
```

#### 2. `src/components/ArtistInfoDialog.tsx` — botón "Activar todos"
Añadir un botón pequeño encima de la lista de toggles: **"Activar todos los campos"** que aplica el preset `complete`. Es la salida rápida cuando el usuario quiere recibir toda la información.

#### 3. Migración SQL — resetear configuraciones existentes corruptas (opcional pero recomendado)
Para artistas con `field_config` parcial (que es lo que está pasando ahora), resetearlo a `{}` (= todo visible por defecto). El usuario podrá luego reconfigurar si quiere ocultar campos.

```sql
UPDATE public.artists SET field_config = '{}'::jsonb WHERE field_config IS NOT NULL;
```

> Esto es seguro porque `{}` significa "todos los campos visibles" según `isArtistFieldVisible`. Quien tuviera campos ocultos a propósito tendrá que volver a desactivarlos, pero arregla a todos los que (como tú ahora) ven menos campos de los esperados.

### Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/components/ArtistInfoDialog.tsx` | Normalizar `field_config` al guardar + botón "Activar todos" |
| Migración SQL | Reset de `field_config` a `{}` en artistas existentes |

### Resultado esperado
- Después de la migración: el formulario público de Klaus Stroink mostrará **todos** los campos.
- A partir de ahora, lo que el manager vea en los toggles ON será exactamente lo que aparezca en el formulario público.
- Si quiere reactivar todo de un clic, tiene el botón "Activar todos".

