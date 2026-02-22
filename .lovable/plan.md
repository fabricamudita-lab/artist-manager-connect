
# Completar ficha del artista y arreglar boton "Editar"

Hay dos problemas independientes que resolver:

---

## Problema 1: "Editar" en Rita Payes no hace nada

En la pagina de Equipos, cuando haces clic en el menu de 3 puntos de un miembro de tipo "artist" (Artista principal) y seleccionas "Editar", no pasa nada. Esto ocurre porque el handler `onMemberEdit` solo gestiona miembros de tipo `profile` (contactos), pero ignora los de tipo `artist`.

### Solucion

En `src/pages/Teams.tsx`, en **todos** los callbacks `onMemberEdit`, anadir una condicion para el tipo `artist` que abra el `ArtistInfoDialog`:

- Importar `ArtistInfoDialog` en Teams.tsx
- Anadir estado para controlar el dialogo: `artistInfoDialog = { open, artistId }`
- En cada `onMemberEdit`, anadir:
  ```
  if (member.type === 'artist') {
    setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
  }
  ```
- Renderizar `<ArtistInfoDialog>` en el JSX

---

## Problema 2: La ficha del artista no muestra los nuevos campos

La migracion de base de datos para anadir las 8 columnas nuevas (`email`, `phone`, `address`, `clothing_size`, `shoe_size`, `allergies`, `special_needs`, `notes`) no se llego a aplicar. Tambien faltan las columnas ya existentes `iban`, `swift_code`, `bank_name` en el formulario.

### Solucion

1. **Crear migracion SQL** para anadir las 8 columnas a la tabla `artists`
2. **Actualizar `src/integrations/supabase/types.ts`** con los nuevos campos
3. **Actualizar `src/components/ArtistInfoDialog.tsx`** para incluir las nuevas secciones:
   - Contacto (email, telefono, direccion)
   - Tallas (ropa, calzado)
   - Salud y Necesidades (alergias, necesidades especiales)
   - Datos Bancarios (banco, IBAN, SWIFT) -- columnas que ya existen en BD
   - Observaciones (notas)

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migracion SQL | Anadir 8 columnas a la tabla `artists` |
| `src/integrations/supabase/types.ts` | Anadir tipos para las nuevas columnas |
| `src/components/ArtistInfoDialog.tsx` | Anadir secciones: Contacto, Tallas, Salud, Bancarios, Notas + exponer iban/swift/bank |
| `src/pages/Teams.tsx` | Importar ArtistInfoDialog, anadir estado y logica para abrir al hacer clic en "Editar" en artistas |
