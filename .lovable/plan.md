

## Alinear créditos y datos de track con formato de distribuidora

### Contexto

Los créditos en MOODITA ya cubren los roles que pide la distribuidora, pero faltan 3 cosas:

1. **Campos de track faltantes**: La distribuidora pide `© Copyright Holder`, `Copyright Year`, `℗ Copyright Holder`, `Production Year` y `Explicit Lyrics` por cada canción. La tabla `tracks` ya tiene `explicit` pero NO tiene los campos de copyright/production year. El formulario "Editar Canción" solo muestra título, ISRC y letra.

2. **Mapeo de categorías**: Las categorías internas (compositor, autoría, producción, intérprete, contribuidor) necesitan un mapeo claro al formato distribuidor (Composer, Songwriter, Production/Engineer, Performer). Los roles disponibles ya coinciden — solo falta documentar/exportar el mapeo.

3. **Roles que faltan en autoría**: La distribuidora ofrece "Author" y "Lyricist" como roles de Songwriter. Actualmente tenemos `autor` y `letrista` que ya mapean. No falta ningún rol.

---

### Cambios necesarios

**1. Migración DB: añadir campos de copyright y production year a `tracks`**

```sql
ALTER TABLE tracks
  ADD COLUMN c_copyright_holder text,
  ADD COLUMN c_copyright_year smallint,
  ADD COLUMN p_copyright_holder text,
  ADD COLUMN p_production_year smallint;
```

Los campos `explicit` ya existe en la tabla.

**2. Ampliar `EditTrackForm` en `ReleaseCreditos.tsx`**

Añadir al formulario de edición de canción:
- Toggle "¿Contiene letras explícitas?" (usa campo `explicit` existente)
- Sección "Copyright" con 4 campos:
  - `© Copyright Holder` (text input)
  - `Copyright Year` (select, rango 2000-2030)
  - `℗ Copyright Holder` (text input)  
  - `Production Year` (select, rango 2000-2030)

Actualizar la firma de `onSubmit` para incluir estos nuevos campos y el mutation `updateTrack`.

**3. Añadir mapeo de exportación distribuidor a `creditRoles.ts`**

Añadir un diccionario `DISTRIBUTOR_CATEGORY_MAP` que traduzca las categorías internas al formato de distribuidora:
- `compositor` → `Composer`
- `autoria` → `Songwriter`
- `produccion` → `Production/Engineer`
- `interprete` → `Performer`
- `contribuidor` → `Contributor`

Y un mapeo de roles internos a labels de distribuidor (ej. `autor` → `Author`, `letrista` → `Lyricist`, `ingeniero_mezcla` → `Mixing Engineer`, etc.).

**4. Actualizar Label Copy PDF (`exportLabelCopyPDF.ts`)**

Incluir en la exportación por track los nuevos campos de copyright y el flag de explicit lyrics.

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migración SQL | Añadir 4 columnas a `tracks` |
| `src/pages/release-sections/ReleaseCreditos.tsx` | Ampliar `EditTrackForm` con explicit + copyright fields |
| `src/lib/creditRoles.ts` | Añadir `DISTRIBUTOR_CATEGORY_MAP` y `getDistributorRoleLabel()` |
| `src/utils/exportLabelCopyPDF.ts` | Incluir copyright y explicit en exportación |

