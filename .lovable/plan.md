
# Completar la ficha del artista con todos los campos relevantes

El perfil de artista actualmente solo muestra 10 campos, mientras que un contacto puede tener hasta 17. Hay que equipararlos anadiendo los campos que faltan tanto en la base de datos como en el formulario.

---

## Estado actual

**Tabla `artists` - columnas que YA existen pero NO se muestran en el formulario:**
- `iban`, `swift_code`, `bank_name` (datos bancarios)

**Columnas que FALTAN en la tabla `artists` (pero si existen en `contacts`):**
- `email`, `phone`, `address`
- `clothing_size`, `shoe_size`
- `allergies`, `special_needs`
- `notes`

---

## Cambios

### 1. Migracion de base de datos

Anadir columnas a la tabla `artists`:

```sql
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS clothing_size text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS special_needs text,
  ADD COLUMN IF NOT EXISTS notes text;
```

### 2. Actualizar tipos de Supabase

Regenerar o actualizar manualmente `src/integrations/supabase/types.ts` para incluir las nuevas columnas.

### 3. Actualizar `ArtistInfoDialog.tsx`

Reorganizar el formulario en secciones coherentes con los campos de contacto:

| Seccion | Campos |
|---|---|
| Informacion General | nombre, nombre artistico, genero musical, descripcion/bio |
| Contacto | email, telefono, direccion |
| Redes Sociales | Instagram, Spotify, TikTok |
| Tallas | talla de ropa, talla de calzado |
| Salud y Necesidades | alergias, necesidades especiales |
| Datos Fiscales | empresa, nombre legal, CIF/NIF |
| Datos Bancarios | banco, IBAN, codigo SWIFT |
| Observaciones | notas |

Cada seccion sera una Card con sus campos, igual que ya se hace con "Informacion General" y "Redes Sociales". Los datos bancarios (iban, swift_code, bank_name) ya estan en la BD pero no se mostraban -- ahora si.

### 4. Actualizar `ArtistData` interface y `formData`

Anadir los nuevos campos al interface, al estado del formulario, al `fetchArtist` y al `handleSave`.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migracion SQL | Anadir 8 columnas a `artists` |
| `src/integrations/supabase/types.ts` | Actualizar tipos de la tabla `artists` |
| `src/components/ArtistInfoDialog.tsx` | Anadir secciones: Contacto, Tallas, Salud, Bancarios, Notas. Exponer iban/swift/bank existentes |

No se modifica la logica de contactos ni ninguna otra pagina. Solo se amplia la ficha del artista para que tenga paridad con los contactos.
