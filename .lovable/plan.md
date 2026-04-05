

## Completar metadatos de lanzamiento a nivel de release (formato distribuidora)

### Problema

La distribuidora pide metadatos a nivel de release que actualmente faltan o no se pueden editar:

**Campos que existen en DB pero NO en el formulario de edición:**
- `copyright` (existe en `releases`)
- `genre` (existe en `releases`)
- `label` (existe en `releases`)
- `upc` (existe en `releases`)

**Campos que NO existen en DB ni en el formulario:**
- `secondary_genre`
- `language`
- `production_year`

**El Label Copy PDF** ya muestra Label, UPC, Tipo y Fecha, pero falta: Copyright, Genre, Secondary Genre, Language, Production Year.

---

### Cambios

**1. Migración DB: añadir 3 columnas a `releases`**

```sql
ALTER TABLE releases
  ADD COLUMN IF NOT EXISTS secondary_genre text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS production_year smallint;
```

**2. Actualizar `Release` interface en `useReleases.ts`**

Añadir `secondary_genre`, `language`, `production_year` al tipo `Release`, y incluirlos en el `useUpdateRelease` mutation.

**3. Ampliar `EditReleaseDialog.tsx`**

Añadir los campos que faltan al formulario de edición (actualmente solo tiene título, tipo, estado, artistas, fecha, descripción):

- **Label** (text input)
- **UPC** (text input)
- **Copyright** (text input, ej. "© 2026 Leyre Estruch")
- **Primary Genre** (text input)
- **Secondary Genre** (text input)
- **Language** (select: Spanish, English, Catalan, etc.)
- **Production Year** (select: 2000-2030)

Organizado en secciones lógicas: Info básica (título, tipo, estado, artistas, fecha) + Distribución (label, UPC, copyright, géneros, idioma, año producción) + Descripción.

**4. Actualizar Label Copy PDF (`exportLabelCopyPDF.ts`)**

Añadir al header del PDF: Copyright, Primary Genre, Secondary Genre, Language, Production Year — tomados del release.

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migración SQL | 3 columnas nuevas en `releases` |
| `src/hooks/useReleases.ts` | Ampliar `Release` interface + update mutation |
| `src/components/releases/EditReleaseDialog.tsx` | Añadir 7 campos de distribución |
| `src/utils/exportLabelCopyPDF.ts` | Incluir nuevos campos en header del PDF |

